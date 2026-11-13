/**
 * Swipe a list row left to reveal its Delete button; swipe far enough (or
 * fast enough) to delete straight away. Vertical scrolling is left to the
 * browser (touch-action: pan-y), and a drag never counts as a tap. Mouse
 * users get the button on hover instead (see .swipe in style.css), so only
 * touch and pen drag.
 */

const REVEAL = 88;

/** The row that is open, so opening another (or tapping elsewhere) closes it. */
let openRow: { close: () => void; el: HTMLElement } | null = null;
document.addEventListener('pointerdown', (e) => {
  if (openRow && !openRow.el.contains(e.target as Node)) openRow.close();
}, { capture: true });

export function swipeToDelete(li: HTMLElement, row: HTMLElement, onDelete: () => void) {
  let startX = 0, startY = 0, startT = 0, base = 0, x = 0;
  let dragging = false, decided = false, id = -1;

  const set = (v: number, animate: boolean) => {
    x = v;
    row.style.transition = animate ? 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
    row.style.transform = v ? `translateX(${v}px)` : '';
    li.classList.toggle('open', v < 0);
  };
  const close = () => { set(0, true); if (openRow?.el === li) openRow = null; };
  const open = () => {
    if (openRow && openRow.el !== li) openRow.close();
    set(-REVEAL, true);
    openRow = { close, el: li };
  };

  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    startX = e.clientX; startY = e.clientY; startT = performance.now();
    base = x; dragging = false; decided = false; id = e.pointerId;
  });
  row.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decided = true;
      dragging = Math.abs(dx) > Math.abs(dy);
      if (!dragging) { id = -1; return; }
      row.setPointerCapture(id);
    }
    if (!dragging) return;
    // Rubber band past the open position and to the right.
    let v = base + dx;
    if (v > 0) v = v / 4;
    set(v, false);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    if (!dragging) return;
    const w = li.clientWidth;
    const fast = (x - base) / Math.max(1, performance.now() - startT) < -0.8;
    if (x < -w * 0.6) { set(-w, true); onDelete(); }
    else if (x < -REVEAL / 2 || fast) open();
    else close();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  // A drag must not also open the song.
  row.addEventListener('click', (e) => {
    if (dragging || x < 0) { e.stopPropagation(); e.preventDefault(); dragging = false; if (x < 0) close(); }
  }, { capture: true });
}
