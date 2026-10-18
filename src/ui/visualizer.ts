import type { Analysis } from '../engine/analyze';
import type { LoopCandidate } from '../engine/loops';
import type { Edge } from '../engine/similarity';
import type { Jump } from '../engine/splicer';

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/**
 * Song map in two layouts. Wave: waveform, beat grid, jump arcs above,
 * playhead. Circle (Infinite Jukebox style): beats around a ring, each a
 * tick sized by loudness, branches as curves through the middle. Static
 * content is cached in an offscreen canvas; only the playhead and live arcs
 * are redrawn each frame.
 */
export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer = document.createElement('canvas');
  private peaks: Float32Array = new Float32Array(0);
  private analysis: Analysis | null = null;
  private length = 1;
  private edges: Edge[][] = [];
  private core = new Uint8Array(0);
  private loop: LoopCandidate | null = null;
  private flash: { jump: Jump; at: number } | null = null;
  private section: [number, number] | null = null;
  private dpr = 1;
  private layout: 'wave' | 'circle' = 'wave';
  onSeek: (sample: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.drawStatic());
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      let frac = (e.clientX - r.left) / r.width;
      if (this.layout === 'circle') {
        const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        frac = (((Math.atan2(dy, dx) + Math.PI / 2) / (2 * Math.PI)) % 1 + 1) % 1;
      }
      const s = frac * this.length;
      if (!this.analysis) { this.onSeek(s); return; }
      // Snap to the nearest beat so seeks land on the grid.
      const beats = this.analysis.beats;
      let best = beats[0];
      for (const b of beats) if (Math.abs(b - s) < Math.abs(best - s)) best = b;
      this.onSeek(best);
    });
  }

  setSong(channels: Float32Array[], analysis: Analysis | null) {
    this.analysis = analysis;
    this.edges = [];
    this.core = new Uint8Array(0);
    this.loop = null;
    this.length = channels[0].length;
    const buckets = 3000;
    this.peaks = new Float32Array(buckets);
    const per = this.length / buckets;
    for (let b = 0; b < buckets; b++) {
      let m = 0;
      const s = Math.floor(b * per), e = Math.min(this.length, Math.floor((b + 1) * per));
      for (const ch of channels) for (let i = s; i < e; i += 4) m = Math.max(m, Math.abs(ch[i]));
      this.peaks[b] = m;
    }
    this.drawStatic();
  }

  setAnalysis(analysis: Analysis) {
    this.analysis = analysis;
    this.drawStatic();
  }

  setGraph(edges: Edge[][], core: Uint8Array, loop: LoopCandidate | null) {
    this.edges = edges;
    this.core = core;
    this.loop = loop;
    this.drawStatic();
  }

  flashJump(jump: Jump) { this.flash = { jump, at: performance.now() }; }

  get mode(): 'wave' | 'circle' { return this.layout; }
  setLayout(layout: 'wave' | 'circle') {
    this.layout = layout;
    this.canvas.classList.toggle('circle', layout === 'circle');
    this.resize();
  }

  // ---- Circle geometry ----
  private get cx() { return this.canvas.width / 2; }
  private get cy() { return this.canvas.height / 2; }
  private get radius() { return Math.max(1, Math.min(this.canvas.width, this.canvas.height) / 2 - 22 * this.dpr); }
  private angle(sample: number) { return -Math.PI / 2 + (2 * Math.PI * sample) / this.length; }
  private ring(sample: number, r = this.radius): [number, number] {
    const t = this.angle(sample);
    return [this.cx + r * Math.cos(t), this.cy + r * Math.sin(t)];
  }

  /** A jump drawn in the current layout: arc above the waveform, or a curve through the ring. */
  private jumpPath(g: CanvasRenderingContext2D, from: number, to: number, maxH: number) {
    if (this.layout === 'wave') { this.arc(g, from, to, maxH); return; }
    const [x1, y1] = this.ring(from, this.radius - 10 * this.dpr), [x2, y2] = this.ring(to, this.radius - 10 * this.dpr);
    // Short hops bow slightly inward; long ones pass near the centre.
    const span = Math.abs(from - to) / this.length;
    const pull = 0.15 + 0.85 * Math.min(1, span * 2);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(mx + (this.cx - mx) * pull, my + (this.cy - my) * pull, x2, y2);
    g.stroke();
  }

  /** Shade everything outside [start, end) samples (null = whole song). */
  setSection(section: [number, number] | null) { this.section = section; }

  private resize() {
    this.dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = this.layer.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = this.layer.height = Math.max(1, Math.round(r.height * this.dpr));
    this.drawStatic();
  }

  private x(sample: number) { return (sample / this.length) * this.canvas.width; }
  private get baseline() { return this.canvas.height * 0.72; }

  private arc(g: CanvasRenderingContext2D, from: number, to: number, maxH: number) {
    const x1 = this.x(from), x2 = this.x(to);
    const y = this.baseline - this.canvas.height * 0.2;
    const h = Math.min(maxH, Math.abs(x2 - x1) * 0.45 + 8 * this.dpr);
    g.beginPath();
    g.moveTo(x1, y);
    g.bezierCurveTo(x1, y - h * 1.33, x2, y - h * 1.33, x2, y);
    g.stroke();
  }

  private drawStatic() {
    if (this.layout === 'circle') { this.drawCircleStatic(); return; }
    const g = this.layer.getContext('2d')!;
    const W = this.layer.width, H = this.layer.height;
    g.clearRect(0, 0, W, H);
    const base = this.baseline;
    const amp = H * 0.18;
    const dim = css('--muted-wave');
    const bright = css('--wave');
    if (!this.analysis) {
      g.fillStyle = dim;
      for (let px = 0; px < W; px++) {
        const p = this.peaks[Math.min(this.peaks.length - 1, Math.floor((px / W) * this.peaks.length))] ?? 0;
        const h = Math.max(1, p * amp);
        g.fillRect(px, base - h, 1, h * 2);
      }
      return;
    }
    const a = this.analysis;
    // Loop region.
    if (this.loop) {
      g.fillStyle = css('--loop-bg');
      g.fillRect(this.x(this.loop.startSample), 0, this.x(this.loop.endSample) - this.x(this.loop.startSample), H);
    }
    // Waveform; beats outside the infinite core are dimmed.
    const coreStart = a.beats[this.core.indexOf(1)] ?? 0;
    const lastCore = this.core.lastIndexOf(1);
    const coreEnd = lastCore >= 0 ? a.beats[lastCore + 1] ?? this.length : 0;
    for (let px = 0; px < W; px++) {
      const s = (px / W) * this.length;
      const p = this.peaks[Math.min(this.peaks.length - 1, Math.floor((px / W) * this.peaks.length))];
      g.fillStyle = s >= coreStart && s < coreEnd ? bright : dim;
      const h = Math.max(1, p * amp);
      g.fillRect(px, base - h, 1, h * 2);
    }
    // Beat grid.
    const m = a.meter.beatsPerBar;
    g.fillStyle = css('--grid');
    a.beats.forEach((b, i) => {
      const down = (((i - a.meter.phase) % m) + m) % m === 0;
      const h = down ? 10 : 4;
      g.fillRect(Math.round(this.x(b)), H - h * this.dpr, this.dpr, h * this.dpr);
    });
    // Jump arcs, best on top.
    const all = this.edges.flat().sort((p, q) => q.cost - p.cost);
    const maxH = H * 0.45;
    g.lineWidth = this.dpr;
    const hue = css('--arc');
    for (const e of all.slice(-600)) {
      const q = Math.max(0, Math.min(1, 1 - e.cost / 0.6));
      g.strokeStyle = hue;
      g.globalAlpha = 0.08 + 0.35 * q * q;
      this.arc(g, a.beats[e.from + 1], a.beats[e.to], maxH);
    }
    g.globalAlpha = 1;
    if (this.loop) {
      g.strokeStyle = css('--accent');
      g.lineWidth = 2.5 * this.dpr;
      this.arc(g, this.loop.endSample, this.loop.startSample, maxH);
    }
  }

  private drawCircleStatic() {
    const g = this.layer.getContext('2d')!;
    const W = this.layer.width, H = this.layer.height;
    g.clearRect(0, 0, W, H);
    const R = this.radius, d = this.dpr;
    const dim = css('--muted-wave'), bright = css('--wave');
    const peakAt = (s: number) => this.peaks[Math.min(this.peaks.length - 1, Math.floor((s / this.length) * this.peaks.length))] ?? 0;
    const a = this.analysis;
    if (this.loop) {
      g.strokeStyle = css('--loop-bg');
      g.lineWidth = 28 * d;
      g.beginPath();
      g.arc(this.cx, this.cy, R, this.angle(this.loop.startSample), this.angle(this.loop.endSample));
      g.stroke();
    }
    // Ticks: one per beat (or per waveform bucket before analysis), length by loudness.
    const marks = a ? a.beats : Array.from({ length: 360 }, (_, k) => (k / 360) * this.length);
    const coreFirst = this.core.indexOf(1), coreLast = this.core.lastIndexOf(1);
    const m = a?.meter.beatsPerBar ?? 4;
    marks.forEach((s, i) => {
      const inCore = !a || coreFirst < 0 || (i >= coreFirst && i <= coreLast);
      const down = a ? (((i - a.meter.phase) % m) + m) % m === 0 : false;
      const len = (3 + 13 * peakAt(s)) * d;
      const [x1, y1] = this.ring(s, R - len / 2), [x2, y2] = this.ring(s, R + len / 2);
      g.strokeStyle = inCore ? bright : dim;
      g.globalAlpha = a ? (down ? 1 : 0.7) : 0.6;
      g.lineWidth = (down ? 2 : 1.2) * d;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    });
    g.globalAlpha = 1;
    if (!a) return;
    // Branches, best on top.
    const all = this.edges.flat().sort((p, q) => q.cost - p.cost);
    g.lineWidth = d;
    g.strokeStyle = css('--arc');
    for (const e of all.slice(-900)) {
      const q = Math.max(0, Math.min(1, 1 - e.cost / 0.6));
      g.globalAlpha = 0.06 + 0.3 * q * q;
      this.jumpPath(g, a.beats[e.from + 1], a.beats[e.to], 0);
    }
    g.globalAlpha = 1;
    if (this.loop) {
      g.strokeStyle = css('--accent');
      g.lineWidth = 2.5 * d;
      this.jumpPath(g, this.loop.endSample, this.loop.startSample, 0);
    }
  }

  /** Per-frame draw: static layer + upcoming jumps + playhead. */
  draw(position: number, queue: readonly Jump[], lockedHeads: { pos: number; label: string }[] = []) {
    const g = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    g.clearRect(0, 0, W, H);
    g.drawImage(this.layer, 0, 0);
    if (!this.analysis) {
      g.fillStyle = css('--playhead');
      g.fillRect(Math.round(this.x(position)) - this.dpr, 0, 2 * this.dpr, H);
      return;
    }
    const maxH = H * 0.45;
    if (this.layout === 'circle') { this.drawCircleLive(position, queue); return; }
    if (this.section) {
      g.fillStyle = css('--bg');
      g.globalAlpha = 0.7;
      const x1 = this.x(this.section[0]), x2 = this.x(this.section[1]);
      g.fillRect(0, 0, x1, H);
      g.fillRect(x2, 0, W - x2, H);
      g.globalAlpha = 1;
      g.fillStyle = css('--accent');
      g.fillRect(Math.round(x1) - this.dpr, 0, 2 * this.dpr, H);
      g.fillRect(Math.round(x2) - this.dpr, 0, 2 * this.dpr, H);
    }
    // Next planned jump.
    const next = queue[0];
    if (next) {
      g.strokeStyle = css('--accent');
      g.lineWidth = 2 * this.dpr;
      g.setLineDash([6 * this.dpr, 4 * this.dpr]);
      this.arc(g, next.at, next.to, maxH);
      g.setLineDash([]);
    }
    // Recently executed jump fades out.
    if (this.flash) {
      const t = (performance.now() - this.flash.at) / 900;
      if (t >= 1) this.flash = null;
      else {
        g.strokeStyle = css('--accent');
        g.globalAlpha = 1 - t;
        g.lineWidth = (2 + 4 * (1 - t)) * this.dpr;
        this.arc(g, this.flash.jump.at, this.flash.jump.to, maxH);
        g.globalAlpha = 1;
      }
    }
    // Locked stems run their own loop: show their playheads too.
    g.font = `${11 * this.dpr}px 'IBM Plex Mono', ui-monospace, monospace`;
    lockedHeads.forEach((h, k) => {
      const lx = Math.round(this.x(h.pos));
      g.fillStyle = css('--accent');
      g.fillRect(lx - this.dpr / 2, H * 0.55, this.dpr, H * 0.45);
      g.fillText(h.label, lx + 4 * this.dpr, H * 0.6 + k * 13 * this.dpr);
    });
    const x = this.x(position);
    g.fillStyle = css('--playhead');
    g.fillRect(Math.round(x) - this.dpr, 0, 2 * this.dpr, H);
  }

  private drawCircleLive(position: number, queue: readonly Jump[]) {
    const g = this.ctx, d = this.dpr, R = this.radius;
    if (this.section) {
      // Dim the ring outside the section, mark its ends.
      g.strokeStyle = css('--bg');
      g.globalAlpha = 0.75;
      g.lineWidth = 34 * d;
      g.beginPath();
      g.arc(this.cx, this.cy, R, this.angle(this.section[1]), this.angle(this.section[0]) + 2 * Math.PI);
      g.stroke();
      g.globalAlpha = 1;
      g.strokeStyle = css('--accent');
      g.lineWidth = 2 * d;
      for (const s of this.section) {
        const [x1, y1] = this.ring(s, R - 16 * d), [x2, y2] = this.ring(s, R + 16 * d);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
    }
    const next = queue[0];
    if (next) {
      g.strokeStyle = css('--accent');
      g.lineWidth = 2 * d;
      g.setLineDash([6 * d, 4 * d]);
      this.jumpPath(g, next.at, next.to, 0);
      g.setLineDash([]);
    }
    if (this.flash) {
      const t = (performance.now() - this.flash.at) / 900;
      if (t >= 1) this.flash = null;
      else {
        g.strokeStyle = css('--accent');
        g.globalAlpha = 1 - t;
        g.lineWidth = (2 + 4 * (1 - t)) * d;
        this.jumpPath(g, this.flash.jump.at, this.flash.jump.to, 0);
        g.globalAlpha = 1;
      }
    }
    // Playhead: a ring on the current beat.
    const [px, py] = this.ring(position);
    g.strokeStyle = css('--playhead');
    g.lineWidth = 2.5 * d;
    g.beginPath(); g.arc(px, py, 9 * d, 0, 2 * Math.PI); g.stroke();
    g.fillStyle = css('--accent');
    g.beginPath(); g.arc(px, py, 3.5 * d, 0, 2 * Math.PI); g.fill();
  }
}
