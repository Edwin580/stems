import type { LoopCandidate } from '../engine/loops';

/**
 * Other ways to see the loop list: Lanes (each loop a bar on the song's
 * timeline, stacked) and Rings (each loop an arc on its own ring, like the
 * Circle song map). Both are built once per list change; only the playhead
 * moves per frame, by a compositor-only transform.
 */

export type LoopView = 'list' | 'lanes' | 'rings';

export interface LoopVizOptions {
  /** Song length in samples. */
  length: number;
  sampleRate: number;
  selected: LoopCandidate | null;
  grade: (l: LoopCandidate) => string;
  label: (l: LoopCandidate) => string;
  fmt: (sec: number) => string;
  onPick: (l: LoopCandidate) => void;
}

const SVG = 'http://www.w3.org/2000/svg';
const same = (a: LoopCandidate | null, b: LoopCandidate) => !!a && a.startSample === b.startSample && a.endSample === b.endSample;

export class LoopViz {
  private head: HTMLElement | SVGElement | null = null;
  private shownHead = -1;
  private view: LoopView = 'list';

  constructor(private root: HTMLElement) {}

  render(view: LoopView, loops: LoopCandidate[], o: LoopVizOptions) {
    this.view = view;
    this.shownHead = -1;
    this.head = null;
    this.root.replaceChildren();
    this.root.classList.toggle('hidden', view === 'list' || !loops.length);
    if (view === 'lanes') this.lanes(loops, o);
    else if (view === 'rings') this.rings(loops, o);
  }

  /** Move the playhead to `frac` (0..1) of the song. Cheap when unchanged. */
  playhead(frac: number) {
    if (!this.head) return;
    const q = Math.round(Math.min(1, Math.max(0, frac)) * 2000);
    if (q === this.shownHead) return;
    this.shownHead = q;
    this.head.style.transform = this.view === 'rings' ? `rotate(${(q / 2000) * 360}deg)` : `translateX(${q / 20}%)`;
  }

  private describe(i: number, l: LoopCandidate, o: LoopVizOptions) {
    const sr = o.sampleRate;
    return `Loop ${i + 1}, ${o.fmt(l.startSample / sr)} to ${o.fmt(l.endSample / sr)}, ${o.label(l)} seam`;
  }

  private lanes(loops: LoopCandidate[], o: LoopVizOptions) {
    const wrap = document.createElement('div');
    wrap.className = 'lanes';
    const ruler = document.createElement('div');
    ruler.className = 'lanes-ruler';
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const t = document.createElement('span');
      t.style.left = `${f * 100}%`;
      t.textContent = o.fmt((f * o.length) / o.sampleRate);
      ruler.appendChild(t);
    }
    wrap.appendChild(ruler);
    const track = document.createElement('div');
    track.className = 'lanes-track';
    loops.forEach((l, i) => {
      const row = document.createElement('div');
      row.className = 'lane-row';
      const b = document.createElement('button');
      b.className = `lane ${o.grade(l)}${same(o.selected, l) ? ' sel' : ''}`;
      b.style.left = `${(l.startSample / o.length) * 100}%`;
      b.style.width = `${Math.max(0.8, ((l.endSample - l.startSample) / o.length) * 100)}%`;
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', this.describe(i, l, o));
      b.setAttribute('aria-pressed', String(same(o.selected, l)));
      b.onclick = () => o.onPick(l);
      row.appendChild(b);
      track.appendChild(row);
    });
    const head = document.createElement('div');
    head.className = 'lanes-head';
    head.setAttribute('aria-hidden', 'true');
    track.appendChild(head);
    wrap.appendChild(track);
    this.root.appendChild(wrap);
    this.head = head;
  }

  private rings(loops: LoopCandidate[], o: LoopVizOptions) {
    const n = loops.length;
    const outer = 92, inner = 34;
    const step = Math.min(11, (outer - inner) / Math.max(1, n));
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-100 -100 200 200');
    svg.setAttribute('class', 'rings');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Loops as rings: each ring is one loop, starting at the top and running clockwise through the song');
    const el = (tag: string, attrs: Record<string, string | number>) => {
      const e = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      return e;
    };
    // Circles start at three o'clock; turn them so every ring starts at the top, like the playhead.
    const arcs = el('g', { transform: 'rotate(-90)' });
    svg.appendChild(arcs);
    loops.forEach((l, i) => {
      const r = outer - i * step;
      const a = (l.startSample / o.length) * 100, w = Math.max(0.6, ((l.endSample - l.startSample) / o.length) * 100);
      const width = step * 0.62;
      arcs.appendChild(el('circle', { r, class: 'ring-track', 'stroke-width': width }));
      const arc = el('circle', {
        r, pathLength: 100, class: `ring ${o.grade(l)}${same(o.selected, l) ? ' sel' : ''}`,
        'stroke-width': width, 'stroke-dasharray': `${w} ${100 - w}`, 'stroke-dashoffset': -a,
        tabindex: 0, role: 'button', 'aria-label': this.describe(i, l, o), 'aria-pressed': String(same(o.selected, l)),
      });
      arc.addEventListener('click', () => o.onPick(l));
      arc.addEventListener('keydown', (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter' || k === ' ') { e.preventDefault(); o.onPick(l); }
      });
      arcs.appendChild(arc);
    });
    const sel = o.selected ? loops.findIndex((l) => same(o.selected, l)) : -1;
    const centre = el('text', { class: 'ring-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    centre.textContent = sel >= 0 ? `Loop ${sel + 1}` : `${n} loop${n === 1 ? '' : 's'}`;
    svg.appendChild(centre);
    const head = el('g', { class: 'ring-head', 'aria-hidden': 'true' });
    head.appendChild(el('line', { x1: 0, y1: -(inner - 6), x2: 0, y2: -(outer + 6) }));
    svg.appendChild(head);
    this.root.appendChild(svg);
    this.head = head;
  }
}
