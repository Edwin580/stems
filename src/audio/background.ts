/**
 * Keeps playback going with the screen off or the tab in the background.
 *
 * Browsers treat a page that only plays through Web Audio as "not playing
 * media": mobile browsers may suspend it when the screen locks, and no
 * lock-screen controls appear. So the engine's output is sent into a plain
 * <audio> element (through a MediaStream). The page then counts as playing
 * media, gets lock-screen and headphone controls, and keeps running.
 * On Safari, the Audio Session API also marks it as music playback, so it
 * isn't silenced by the ring/silent switch or interrupted on lock.
 *
 * If the element can't play (old browser, autoplay refusal), the output
 * falls back to the AudioContext's own destination.
 */
export class BackgroundOutput {
  private el: HTMLAudioElement | null = null;
  private direct = false;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  /** True while the person wants sound (play pressed, not paused). */
  wanted = false;

  constructor(private ctx: AudioContext, private input: AudioNode) {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try { session.type = 'playback'; } catch { /* unsupported value */ }
    }
    if (typeof ctx.createMediaStreamDestination === 'function' && typeof Audio !== 'undefined') {
      const dest = ctx.createMediaStreamDestination();
      input.connect(dest);
      const el = new Audio();
      el.setAttribute('playsinline', '');
      el.srcObject = dest.stream;
      this.el = el;
    } else {
      this.useDirect();
    }
    // Coming back to the page (or unlocking) after the system paused audio: pick up again.
    const revive = () => { if (this.wanted && document.visibilityState === 'visible') void this.resume(); };
    document.addEventListener('visibilitychange', revive);
    window.addEventListener('focus', revive);
    ctx.addEventListener('statechange', () => { if (this.wanted && ctx.state !== 'running' && document.visibilityState === 'visible') void this.resume(); });
  }

  /** Whether sound goes through the media element (background-capable). */
  get viaMediaElement(): boolean { return !!this.el && !this.direct; }

  private useDirect() {
    if (this.direct) return;
    this.input.connect(this.ctx.destination);
    this.direct = true;
    if (this.el) { this.el.pause(); this.el.srcObject = null; }
  }

  /**
   * Start sound. Call from the click/tap handler before any await, because
   * browsers only let media start inside a user gesture.
   */
  start(): Promise<void> {
    this.wanted = true;
    if (this.pauseTimer) { clearTimeout(this.pauseTimer); this.pauseTimer = null; }
    return this.resume();
  }

  private resume(): Promise<void> {
    const el = this.viaMediaElement ? this.el!.play() : null; // synchronous call keeps the gesture
    const ctx = this.ctx.state === 'running' ? null : this.ctx.resume();
    return Promise.all([
      el?.catch(() => this.useDirect()),
      ctx?.catch(() => {}),
    ]).then(() => {});
  }

  /** Stop sound (after the engine's short fade-out). */
  stop() {
    this.wanted = false;
    if (!this.el || this.direct) return;
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => { if (!this.wanted) this.el!.pause(); }, 120);
  }
}
