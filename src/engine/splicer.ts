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

  constructor(channels: Float32Array[], sampleRate: number) {
    this.channels = channels;
    this.length = channels[0]?.length ?? 0;
    this.gainStep = 1 / Math.max(1, Math.round(0.01 * sampleRate));
  }

  play() { this.playing = true; this.gainTarget = 1; }
  pause() { this.gainTarget = 0; }
  /** Immediately start/stop without ramps (offline rendering). */
  setRunning(on: boolean) { this.playing = on; this.gain = this.gainTarget = on ? 1 : 0; }

  enqueue(j: Jump) { this.queue.push(j); }
  pending(): readonly Jump[] { return this.queue; }
  activeJump(): Jump | null { return this.active; }

  /** Drop jumps that haven't started; returns where playback will be once any active fade ends. */
  clearPending(): number {
    this.queue.length = 0;
    return this.active ? this.active.to : this.pos;
  }

  /** Click-free seek: crossfade from the current position into `target`. */
  seek(target: number, fade: number, id: number) {
    this.queue.length = 0;
    if (!this.playing || this.gain === 0) {
      this.active = null;
      this.pos = Math.max(0, Math.min(this.length - 1, target));
      return;
    }
    const at = (this.active ? this.active.to : this.pos) + fade;
    this.queue.push({ id, at, to: Math.max(fade, target), fade, rho: 0 });
  }

  /** Render `frames` samples into outs (one array per output channel). */
  render(outs: Float32Array[], frames: number, offset = 0): SplicerEvent[] {
    const events: SplicerEvent[] = [];
    const nIn = this.channels.length;
    const nOut = outs.length;
    for (let f = 0; f < frames; f++) {
      if (this.gain !== this.gainTarget) {
        this.gain += this.gain < this.gainTarget ? this.gainStep : -this.gainStep;
        if (Math.abs(this.gain - this.gainTarget) < this.gainStep) this.gain = this.gainTarget;
        if (this.gain === 0 && this.gainTarget === 0) this.playing = false;
      }
      if (!this.playing || this.pos >= this.length) {
        for (let c = 0; c < nOut; c++) outs[c][offset + f] = 0;
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
      const j = this.active;
      if (j) {
        const t = this.pos - (j.at - j.fade);
        const [ga, gb] = crossfadeGains((t + 0.5) / j.fade, j.rho);
        const inIdx = j.to - j.fade + t;
        for (let c = 0; c < nOut; c++) {
          const ch = this.channels[c % nIn];
          const b = inIdx >= 0 && inIdx < this.length ? ch[inIdx] : 0;
          outs[c][offset + f] = (ga * ch[this.pos] + gb * b) * this.gain;
        }
        this.pos++;
        if (this.pos >= j.at) {
          this.pos = j.to;
          this.active = null;
          events.push({ type: 'jumped', id: j.id, frame: f });
        }
      } else {
        for (let c = 0; c < nOut; c++) outs[c][offset + f] = this.channels[c % nIn][this.pos] * this.gain;
        this.pos++;
      }
    }
    return events;
  }
}
