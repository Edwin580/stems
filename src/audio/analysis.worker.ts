import { analyze, type Analysis } from '../engine/analyze';

export type ToAnalysis = { mono: Float32Array; sampleRate: number };
export type FromAnalysis =
  | { type: 'progress'; stage: string; fraction: number }
  | { type: 'done'; analysis: Analysis }
  | { type: 'error'; message: string };

const post = (m: FromAnalysis, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

self.onmessage = (e: MessageEvent<ToAnalysis>) => {
  try {
    const analysis = analyze(e.data.mono, e.data.sampleRate, (stage, fraction) => post({ type: 'progress', stage, fraction }));
    post({ type: 'done', analysis }, [analysis.transitions.buffer]);
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
