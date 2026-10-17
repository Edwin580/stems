/// <reference lib="es2022" />
import { Splicer, type Jump } from '../engine/splicer';

// Minimal AudioWorklet global declarations (not in TS's DOM lib).
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

export type ToWorklet =
  | { type: 'load'; channels: Float32Array[] }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'enqueue'; jumps: Jump[] }
  | { type: 'clear'; req: number }
  | { type: 'seek'; to: number; fade: number; id: number };

export type FromWorklet =
  | { type: 'pos'; pos: number; time: number; playing: boolean }
  | { type: 'jumped'; id: number; time: number }
  | { type: 'ended' }
  | { type: 'cleared'; req: number; pos: number };

const REPORT_EVERY = 4; // blocks (~11 ms at 44.1 kHz)

class StemsProcessor extends AudioWorkletProcessor {
  private sp: Splicer | null = null;
  private blocks = 0;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<ToWorklet>) => this.onMessage(e.data);
  }

  private post(m: FromWorklet) { this.port.postMessage(m); }

  private onMessage(m: ToWorklet) {
    if (m.type === 'load') { this.sp = new Splicer(m.channels, sampleRate); return; }
    const sp = this.sp;
    if (!sp) return;
    switch (m.type) {
      case 'play':
        if (sp.pos >= sp.length - 1) sp.pos = 0;
        sp.play();
        break;
      case 'pause': sp.pause(); break;
      case 'enqueue': for (const j of m.jumps) sp.enqueue(j); break;
      case 'clear': this.post({ type: 'cleared', req: m.req, pos: sp.clearPending() }); break;
      case 'seek': sp.seek(m.to, m.fade, m.id); break;
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    const sp = this.sp;
    if (!sp) {
      for (const ch of out) ch.fill(0);
      return true;
    }
    const frames = out[0].length;
    for (const ev of sp.render(out, frames)) {
      if (ev.type === 'jumped') this.post({ type: 'jumped', id: ev.id, time: currentTime + ev.frame / sampleRate });
      else this.post({ type: 'ended' });
    }
    if (++this.blocks % REPORT_EVERY === 0) this.post({ type: 'pos', pos: sp.pos, time: currentTime, playing: sp.playing });
    return true;
  }
}

registerProcessor('stems-splicer', StemsProcessor);
