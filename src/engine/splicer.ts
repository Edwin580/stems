/**
 * The playback core. A read head moves through the source buffer; a queue of
 * jumps tells it where to splice. Each splice is a correlation-aware
 * crossfade that ends exactly on the landing point, so the incoming beat's
 * attack is never smeared.
 *
 * This class is pure (no Web Audio) so the same code runs in the
 * AudioWorklet, in offline export, and in unit tests.
 */

export interface Jump {
  id: number;
  /** Outgoing sample: playback would naturally reach this sample next. */
  at: number;
  /** Landing sample: playback continues from here after the seam. */
  to: number;
  /** Crossfade length in samples; occupies [at - fade, at). */
  fade: number;
  /** Correlation between the two sides (drives the crossfade law). */
  rho: number;
  /** Varispeed over the fade: incoming is read at rate (fade + drift) / fade. */
  drift?: number;
  /** Level offset (dB) for the incoming side, ramped back to 0 over gainRamp samples. */
  gainDb?: number;
  gainRamp?: number;
  fromBeat?: number;
  toBeat?: number;
}

/**
 * Crossfade gains at fraction t in [0, 1]. Raised-cosine shapes, normalised
 * so the expected output power is constant for two signals with correlation
 * rho: rho=1 gives a constant-gain (linear-sum) fade, rho=0 equal-power.
 */
export function crossfadeGains(t: number, rho: number): [number, number] {
  const r = Math.max(0, Math.min(1, rho));
  const x = 0.5 + 0.5 * Math.cos(Math.PI * t);
  const y = 1 - x;
  const g = 1 / Math.sqrt(x * x + y * y + 2 * r * x * y);
  return [x * g, y * g];
}

export type SplicerEvent =
  | { type: 'jumped'; id: number; frame: number }
  | { type: 'ended'; frame: number };

export class Splicer {
  readonly channels: Float32Array[];
  readonly length: number;
  pos = 0;
  playing = false;
  private queue: Jump[] = [];
  private active: Jump | null = null;
  /** Master gain slews toward target to make play/pause click-free. */
  private gain = 0;
  private gainTarget = 0;
  private readonly gainStep: number;
  /** Mixer gain (stem volume / mute), slewed over ~20 ms. */
  private mixGain = 1;
  private mixTarget = 1;
  private readonly mixStep: number;
  /** Post-seam level correction (dB) and its per-sample decay toward 0. */
  private levelDb = 0;
  private levelStep = 0;

  constructor(channels: Float32Array[], sampleRate: number) {
    this.channels = channels;
    this.length = channels[0]?.length ?? 0;
    this.gainStep = 1 / Math.max(1, Math.round(0.01 * sampleRate));
    this.mixStep = 1 / Math.max(1, Math.round(0.02 * sampleRate));
  }

  play() { this.playing = true; this.gainTarget = 1; }
  pause() { this.gainTarget = 0; }
  /** Immediately start/stop without ramps (offline rendering). */
  setRunning(on: boolean) { this.playing = on; this.gain = this.gainTarget = on ? 1 : 0; }
  setMix(g: number, immediate = false) { this.mixTarget = g; if (immediate) this.mixGain = g; }

  enqueue(j: Jump) { this.queue.push(j); }
  pending(): readonly Jump[] { return this.queue; }
  activeJump(): Jump | null { return this.active; }

  /** Drop jumps that haven't started; returns where playback will be once any active fade ends. */
  clearPending(): number {
    this.queue.length = 0;
    return this.active ? this.active.to : this.pos;
  }

  /** Copy another splicer's transport state (used to re-join a locked stem to the main path). */
  syncFrom(o: Splicer) {
    this.pos = o.pos;
    this.queue = o.queue.slice();
    this.active = o.active;
    this.levelDb = o.levelDb;
    this.levelStep = o.levelStep;
    this.playing = o.playing;
    this.gain = o.gain;
    this.gainTarget = o.gainTarget;
  }

  /** Click-free seek: crossfade from the current position into `target`. */
  seek(target: number, fade: number, id: number) {
    this.queue.length = 0;
    if (!this.playing || this.gain === 0) {
      this.active = null;
      this.pos = Math.max(0, Math.min(this.length - 1, target));
      this.levelDb = 0;
      return;
    }
    const at = (this.active ? this.active.to : this.pos) + fade;
    this.queue.push({ id, at, to: Math.max(fade, target), fade, rho: 0 });
  }

  private sample(ch: Float32Array, x: number): number {
    const i = Math.floor(x);
    if (i < 0 || i >= this.length) return 0;
    const fr = x - i;
    const a = ch[i];
    return fr === 0 || i + 1 >= this.length ? a : a + (ch[i + 1] - a) * fr;
  }

  /**
   * Render `frames` samples into outs (one array per output channel).
   * With `add`, output is summed into outs (several stems into one bus).
   */
  render(outs: Float32Array[], frames: number, offset = 0, add = false): SplicerEvent[] {
    const events: SplicerEvent[] = [];
    const nIn = this.channels.length;
    const nOut = outs.length;
    for (let f = 0; f < frames; f++) {
      const o = offset + f;
      if (this.gain !== this.gainTarget) {
        this.gain += this.gain < this.gainTarget ? this.gainStep : -this.gainStep;
        if (Math.abs(this.gain - this.gainTarget) < this.gainStep) this.gain = this.gainTarget;
        if (this.gain === 0 && this.gainTarget === 0) this.playing = false;
      }
      if (this.mixGain !== this.mixTarget) {
        this.mixGain += this.mixGain < this.mixTarget ? this.mixStep : -this.mixStep;
        if (Math.abs(this.mixGain - this.mixTarget) < this.mixStep) this.mixGain = this.mixTarget;
      }
      if (!this.playing || this.pos >= this.length) {
        if (!add) for (let c = 0; c < nOut; c++) outs[c][o] = 0;
        if (this.playing && this.pos >= this.length) {
          this.playing = false;
          events.push({ type: 'ended', frame: f });
        }
        continue;
      }
      if (!this.active && this.queue.length && this.pos >= this.queue[0].at - this.queue[0].fade) {
        const next = this.queue.shift()!;
        // A jump that arrived too late to fade on schedule: start its fade now.
        this.active = this.pos >= next.at ? { ...next, at: this.pos + next.fade } : next;
      }
      let lvl = 1;
      if (this.levelDb !== 0) {
        lvl = 10 ** (this.levelDb / 20);
        this.levelDb -= this.levelStep;
        if (Math.sign(this.levelDb) !== Math.sign(this.levelDb + this.levelStep)) this.levelDb = 0;
      }
      const g = this.gain * this.mixGain;
      const j = this.active;
      if (j) {
        const t = this.pos - (j.at - j.fade);
        const [ga, gb] = crossfadeGains((t + 0.5) / j.fade, j.rho);
        const drift = j.drift ?? 0;
        const inPos = j.to - j.fade - drift + (t * (j.fade + drift)) / j.fade;
        const inLvl = j.gainDb ? 10 ** (j.gainDb / 20) : 1;
        for (let c = 0; c < nOut; c++) {
          const ch = this.channels[c % nIn];
          const v = (ga * lvl * ch[this.pos] + gb * inLvl * this.sample(ch, inPos)) * g;
          if (add) outs[c][o] += v; else outs[c][o] = v;
        }
        this.pos++;
        if (this.pos >= j.at) {
          this.pos = j.to;
          this.active = null;
          this.levelDb = j.gainDb ?? 0;
          this.levelStep = this.levelDb / Math.max(1, j.gainRamp ?? 1);
          events.push({ type: 'jumped', id: j.id, frame: f });
        }
      } else {
        const gl = g * lvl;
        for (let c = 0; c < nOut; c++) {
          const v = this.channels[c % nIn][this.pos] * gl;
          if (add) outs[c][o] += v; else outs[c][o] = v;
        }
        this.pos++;
      }
    }
    return events;
  }
}
