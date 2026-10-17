/// <reference lib="es2022" />
import type { Jump } from '../engine/splicer';
import { StemEngine, type LockLoop } from '../engine/stemengine';

// Minimal AudioWorklet global declarations (not in TS's DOM lib).
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

export type ToWorklet =
  | { type: 'load'; groups: Float32Array[][]; names: string[]; downbeats?: Int32Array }
  | { type: 'sources'; groups: Float32Array[][]; names: string[] }
  | { type: 'downbeats'; downbeats: Int32Array }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'enqueue'; jumps: Jump[] }
  | { type: 'clear'; req: number }
  | { type: 'seek'; to: number; fade: number; id: number }
  | { type: 'gain'; index: number; gain: number }
  | { type: 'lock'; index: number; loop: LockLoop }
  | { type: 'unlock'; index: number };

export type FromWorklet =
  | { type: 'pos'; pos: number; time: number; playing: boolean; stemPos: number[] }
  | { type: 'jumped'; id: number; time: number }
  | { type: 'ended' }
  | { type: 'cleared'; req: number; pos: number };

const REPORT_EVERY = 4; // blocks (~11 ms at 44.1 kHz)

class StemsProcessor extends AudioWorkletProcessor {
  private eng: StemEngine | null = null;
  private blocks = 0;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<ToWorklet>) => this.onMessage(e.data);
  }

  private post(m: FromWorklet) { this.port.postMessage(m); }

  private onMessage(m: ToWorklet) {
    if (m.type === 'load') { this.eng = new StemEngine(m.groups, m.names, sampleRate, m.downbeats); return; }
    const eng = this.eng;
    if (!eng) return;
    switch (m.type) {
      case 'sources': eng.replaceSources(m.groups, m.names); break;
      case 'downbeats': eng.setDownbeats(m.downbeats); break;
      case 'play':
        if (eng.pos >= eng.length - 1) eng.pos = 0;
        eng.play();
        break;
      case 'pause': eng.pause(); break;
      case 'enqueue': for (const j of m.jumps) eng.enqueue(j); break;
      case 'clear': this.post({ type: 'cleared', req: m.req, pos: eng.clearPending() }); break;
      case 'seek': eng.seek(m.to, m.fade, m.id); break;
      case 'gain': eng.setGain(m.index, m.gain); break;
      case 'lock': eng.lock(m.index, m.loop); break;
      case 'unlock': eng.unlock(m.index); break;
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const out = outputs[0];
    const eng = this.eng;
    if (!eng) {
      for (const ch of out) ch.fill(0);
      return true;
    }
    const frames = out[0].length;
    for (const ev of eng.render(out, frames)) {
      if (ev.type === 'jumped') this.post({ type: 'jumped', id: ev.id, time: currentTime + ev.frame / sampleRate });
      else this.post({ type: 'ended' });
    }
    if (++this.blocks % REPORT_EVERY === 0) {
      this.post({ type: 'pos', pos: eng.pos, time: currentTime, playing: eng.playing, stemPos: eng.splicers.map((s) => s.pos) });
    }
    return true;
  }
}

registerProcessor('stems-splicer', StemsProcessor);
