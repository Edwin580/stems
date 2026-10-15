import type { Edge } from './similarity';

/**
 * Find the largest strongly connected component of the beat graph, where
 * every beat i links to i+1 (natural playback) plus its jump edges.
 *
 * Playback that stays inside this component can go on forever: every beat in
 * it can reach every other, so there are no dead ends that would force the
 * song to run out. Returns a boolean mask of beats in the core.
 */
export function infiniteCore(n: number, edges: Edge[][]): Uint8Array {
  const succ = (v: number): number[] => {
    const s = edges[v].map((e) => e.to);
    if (v + 1 < n) s.push(v + 1);
    return s;
  };
  // Iterative Tarjan.
  const index = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack: number[] = [];
  const comp = new Int32Array(n).fill(-1);
  let idx = 0, compCount = 0;
  for (let root = 0; root < n; root++) {
    if (index[root] !== -1) continue;
    const work: { v: number; it: number; succ: number[] }[] = [{ v: root, it: 0, succ: succ(root) }];
    index[root] = low[root] = idx++;
    stack.push(root); onStack[root] = 1;
    while (work.length) {
      const top = work[work.length - 1];
      if (top.it < top.succ.length) {
        const w = top.succ[top.it++];
        if (index[w] === -1) {
          index[w] = low[w] = idx++;
          stack.push(w); onStack[w] = 1;
          work.push({ v: w, it: 0, succ: succ(w) });
        } else if (onStack[w]) low[top.v] = Math.min(low[top.v], index[w]);
      } else {
        work.pop();
        if (work.length) low[work[work.length - 1].v] = Math.min(low[work[work.length - 1].v], low[top.v]);
        if (low[top.v] === index[top.v]) {
          let w: number;
          do { w = stack.pop()!; onStack[w] = 0; comp[w] = compCount; } while (w !== top.v);
          compCount++;
        }
      }
    }
  }
  const sizes = new Int32Array(compCount);
  for (let v = 0; v < n; v++) sizes[comp[v]]++;
  let best = 0;
  for (let c = 1; c < compCount; c++) if (sizes[c] > sizes[best]) best = c;
  const mask = new Uint8Array(n);
  if (sizes[best] > 1) for (let v = 0; v < n; v++) if (comp[v] === best) mask[v] = 1;
  return mask;
}

/** Restrict edges to those that keep playback inside the core. */
export function pruneToCore(edges: Edge[][], core: Uint8Array): Edge[][] {
  return edges.map((list) => list.filter((e) => core[e.to] && core[e.from]));
}
