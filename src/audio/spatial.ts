/**
 * 8D audio: the music circles slowly around the listener's head.
 *
 * The mix goes through an HRTF panner whose position moves on a circle around
 * the listener, plus a little room reverb so it sounds like it is out in a
 * space rather than inside the head. The circle is driven by two oscillators
 * (sine and cosine) wired straight into the panner's position, so the motion
 * runs on the audio clock and keeps going with the screen off or the page in
 * the background, where timers are throttled.
 *
 * Best on headphones. Turning it on or off crossfades over a moment, so there
 * is no click.
 */

export type Spatial8DSpeed = 'off' | 'slow' | 'medium' | 'fast';

/** Seconds per full turn around the head. */
const PERIOD: Record<Exclude<Spatial8DSpeed, 'off'>, number> = { slow: 16, medium: 9, fast: 4.5 };
const RADIUS = 2;
/** Extra left/right swing on top of the HRTF, so the movement is unmistakable. */
const PAN_DEPTH = 0.6;
const REVERB_WET = 0.22;
const FADE_SEC = 0.35;

export class Spatial8D {
  /** Connect the mix here. */
  readonly input: GainNode;
  /** Connect this to the output. */
  readonly output: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private panner: PannerNode;
  private pan: StereoPannerNode;
  private sin: OscillatorNode | null = null;
  private cos: OscillatorNode | null = null;
  private speed: Spatial8DSpeed = 'off';
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private wetConnected = false;

  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;

    this.panner = ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    // Constant distance on the circle, so the level stays even all the way round.
    this.panner.distanceModel = 'linear';
    this.panner.rolloffFactor = 0;

    this.pan = ctx.createStereoPanner();

    const verb = ctx.createConvolver();
    verb.buffer = roomImpulse(ctx, 1.8);
    const verbGain = ctx.createGain();
    verbGain.gain.value = REVERB_WET;

    this.input.connect(this.dry).connect(this.output);
    this.panner.connect(this.pan).connect(this.wet);
    this.panner.connect(verb).connect(verbGain).connect(this.wet);
    this.wet.connect(this.output);
  }

  /** Whether this browser can move the panner on the audio clock. */
  static supported(ctx: BaseAudioContext): boolean {
    const p = ctx.createPanner();
    return !!p.positionX && !!p.positionZ && typeof ctx.createPeriodicWave === 'function' && typeof ctx.createStereoPanner === 'function';
  }

  get current(): Spatial8DSpeed { return this.speed; }

  set(speed: Spatial8DSpeed) {
    if (speed === this.speed) return;
    if (speed !== 'off' && !Spatial8D.supported(this.ctx)) speed = 'off';
    const was = this.speed;
    this.speed = speed;
    const t = this.ctx.currentTime;
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }

    if (speed === 'off') {
      ramp(this.dry.gain, 1, t);
      ramp(this.wet.gain, 0, t);
      // Stop the HRTF work once it is silent, to save battery.
      this.idleTimer = setTimeout(() => this.idle(), (FADE_SEC + 0.1) * 1000);
      return;
    }
    if (!this.wetConnected) { this.input.connect(this.panner); this.wetConnected = true; }
    this.orbit(PERIOD[speed], t);
    if (was === 'off') {
      ramp(this.dry.gain, 0, t);
      ramp(this.wet.gain, 1, t);
    }
  }

  /** Start (or retime) the circular motion, picking up from where it is now. */
  private orbit(period: number, t: number) {
    const freq = 1 / period;
    if (this.sin && this.cos) {
      this.sin.frequency.setTargetAtTime(freq, t, 0.3);
      this.cos.frequency.setTargetAtTime(freq, t, 0.3);
      return;
    }
    const ctx = this.ctx;
    const wave = (real: number[], imag: number[]) => ctx.createPeriodicWave(new Float32Array(real), new Float32Array(imag), { disableNormalization: true });
    const sin = ctx.createOscillator();
    const cos = ctx.createOscillator();
    sin.setPeriodicWave(wave([0, 0], [0, 1]));
    cos.setPeriodicWave(wave([0, 1], [0, 0]));
    for (const o of [sin, cos]) o.frequency.value = freq;
    const rx = ctx.createGain();
    const rz = ctx.createGain();
    rx.gain.value = RADIUS;
    // Starts in front (z = -radius) and moves right, behind, left.
    rz.gain.value = -RADIUS;
    this.panner.positionX.value = 0;
    this.panner.positionY.value = 0;
    this.panner.positionZ.value = 0;
    const depth = ctx.createGain();
    depth.gain.value = PAN_DEPTH;
    this.pan.pan.value = 0;
    sin.connect(rx).connect(this.panner.positionX);
    sin.connect(depth).connect(this.pan.pan);
    cos.connect(rz).connect(this.panner.positionZ);
    const start = t + 0.01;
    sin.start(start);
    cos.start(start);
    this.sin = sin;
    this.cos = cos;
  }

  private idle() {
    this.idleTimer = null;
    if (this.speed !== 'off') return;
    for (const o of [this.sin, this.cos]) { try { o?.stop(); } catch { /* not started */ } o?.disconnect(); }
    this.sin = this.cos = null;
    if (this.wetConnected) { this.input.disconnect(this.panner); this.wetConnected = false; }
  }
}

function ramp(p: AudioParam, to: number, t: number) {
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.linearRampToValueAtTime(to, t + FADE_SEC);
}

/** A soft, decorrelated stereo room tail made from decaying noise. */
function roomImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.round(seconds * sr);
  const buf = ctx.createBuffer(2, n, sr);
  let seed = 0x2545f491;
  const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 0xffffffff) * 2 - 1; };
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      // Gentle low-pass that darkens the tail as it decays.
      const k = 0.5 - 0.4 * x;
      lp += k * (rand() - lp);
      d[i] = lp * Math.pow(1 - x, 3) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
  }
  return buf;
}
