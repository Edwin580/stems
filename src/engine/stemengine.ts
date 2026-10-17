import { Splicer, type Jump, type SplicerEvent } from './splicer';

/** A loop a stem can be locked to (same shape as a perfect-loop seam). */
export interface LockLoop {
  at: number;
  to: number;
  fade: number;
  rho: number;
  drift?: number;
}

/**
 * Per-stem crossfade law. Every stem's fade ends on the same landing sample,
 * but drums cut quickly (their hits mask the seam and long fades double
 * them), while sustained "other" material (pads, keys) fades over longer.
 */
export function stemJump(name: string, j: Jump, sampleRate: number): Jump {
  if (name === 'drums') return { ...j, fade: Math.max(1, Math.min(j.fade, Math.round(0.012 * sampleRate))) };
  if (name === 'other') return { ...j, fade: Math.min(Math.max(j.fade, Math.round(j.fade * 2)), Math.round(0.2 * sampleRate)) };
  return j;
}

interface LockState {
  loop: LockLoop;
  entered: boolean;
}

/**
 * The full playback engine: one Splicer per stem (or a single "mix"
 * Splicer before separation). Unlocked stems follow the planner's path in
 * lock-step; locked stems run their own loop, entering it on a downbeat so
 * the bar grids stay aligned. Pure TS: runs in the AudioWorklet and offline.
 */
export class StemEngine {
  splicers: Splicer[] = [];
  names: string[] = [];
  private locks: (LockState | null)[] = [];
  private pendingUnlock = new Set<number>();
  private gains: number[] = [];
  private downbeats: Int32Array;
  readonly sampleRate: number;
  private lockIds = -1_000_000;

  constructor(groups: Float32Array[][], names: string[], sampleRate: number, downbeats: Int32Array = new Int32Array(0)) {
    this.sampleRate = sampleRate;
    this.downbeats = downbeats;
    this.setSources(groups, names);
  }

  private setSources(groups: Float32Array[][], names: string[]) {
    this.splicers = groups.map((g) => new Splicer(g, this.sampleRate));
    this.names = names;
    this.locks = names.map(() => null);
    this.gains = names.map(() => 1);
  }

  setDownbeats(d: Int32Array) { this.downbeats = d; }

  /** Index of the stem whose transport the rest of the app follows. */
  get leaderIndex(): number {
    const i = this.locks.findIndex((l) => !l);
    return i < 0 ? 0 : i;
  }
  get leader(): Splicer { return this.splicers[this.leaderIndex]; }
  get pos(): number { return this.leader.pos; }
  set pos(p: number) { for (const s of this.splicers) s.pos = p; }
  get playing(): boolean { return this.leader.playing; }
  get length(): number { return this.leader.length; }

  private followers(): number[] {
    return this.splicers.map((_, i) => i).filter((i) => !this.locks[i]);
  }

  /**
   * Swap the audio sources mid-playback (e.g. mix → stems once separation
   * finishes). The stems sum to the mix, so the handover is inaudible.
   */
  replaceSources(groups: Float32Array[][], names: string[]) {
    const lead = this.leader;
    const pending = lead.pending().slice();
    this.setSources(groups, names);
    this.splicers.forEach((s, i) => {
      s.syncFrom(lead);
      s.clearPending();
      for (const j of pending) s.enqueue(stemJump(names[i], j, this.sampleRate));
    });
  }

  play() { for (const s of this.splicers) s.play(); }
  pause() { for (const s of this.splicers) s.pause(); }
  setRunning(on: boolean) { for (const s of this.splicers) s.setRunning(on); }

  setGain(i: number, g: number, immediate = false) {
    this.gains[i] = g;
    this.splicers[i]?.setMix(g, immediate);
  }

  enqueue(j: Jump) {
    for (const i of this.followers()) this.splicers[i].enqueue(stemJump(this.names[i], j, this.sampleRate));
  }

  pending(): readonly Jump[] { return this.leader.pending(); }

  clearPending(): number {
    let r = this.leader.pos;
    const li = this.leaderIndex;
    for (const i of this.followers()) {
      const v = this.splicers[i].clearPending();
      if (i === li) r = v;
    }
    return r;
  }

  seek(target: number, fade: number, id: number) {
    for (const i of this.followers()) this.splicers[i].seek(target, fade, id);
  }

  /** Lock stem i to its own loop; it enters on the next downbeat. Never locks every stem. */
  lock(i: number, loop: LockLoop) {
    if (this.locks.filter((l) => !l).length <= 1 && !this.locks[i]) return false;
    this.pendingUnlock.delete(i);
    this.locks[i] = { loop, entered: false };
    this.splicers[i].clearPending();
    return true;
  }

  unlock(i: number) {
    if (this.locks[i]) this.pendingUnlock.add(i);
  }

  isLocked(i: number) { return !!this.locks[i]; }

  private nextDownbeat(after: number): number {
    const d = this.downbeats;
    let lo = 0, hi = d.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (d[m] <= after) lo = m + 1; else hi = m; }
    return lo < d.length ? d[lo] : -1;
  }

  /** Housekeeping at block boundaries: loop entry/refill and re-joining. */
  private service() {
    const sr = this.sampleRate;
    this.locks.forEach((l, i) => {
      if (!l) return;
      const sp = this.splicers[i];
      if (sp.activeJump()) return;
      if (!l.entered) {
        const entry = this.nextDownbeat(sp.pos + Math.round(0.15 * sr));
        if (entry < 0 || entry >= l.loop.at) {
          // Already inside or past the loop: enter at the loop's own end instead.
          sp.enqueue({ id: this.lockIds--, at: Math.max(l.loop.at, sp.pos + Math.round(0.05 * sr)), to: l.loop.to, fade: l.loop.fade, rho: 0 });
        } else {
          sp.enqueue({ id: this.lockIds--, at: entry, to: l.loop.to, fade: Math.round(0.03 * sr), rho: 0 });
        }
        l.entered = true;
      } else if (sp.pending().length === 0) {
        sp.enqueue({ id: this.lockIds--, ...l.loop, rho: l.loop.rho });
      }
    });
    for (const i of [...this.pendingUnlock]) {
      const lead = this.leader;
      const sp = this.splicers[i];
      const F = Math.round(0.04 * sr);
      const next = lead.pending()[0];
      const clear = !lead.activeJump() && !sp.activeJump() && (!next || next.at - next.fade > lead.pos + F + 256);
      if (!clear) continue;
      sp.clearPending();
      sp.enqueue({ id: this.lockIds--, at: sp.pos + F, to: lead.pos + F, fade: F, rho: 0 });
      for (const j of lead.pending()) sp.enqueue(stemJump(this.names[i], j, sr));
      this.locks[i] = null;
      this.pendingUnlock.delete(i);
    }
  }

  render(outs: Float32Array[], frames: number, offset = 0): SplicerEvent[] {
    this.service();
    for (const o of outs) o.fill(0, offset, offset + frames);
    const li = this.leaderIndex;
    let events: SplicerEvent[] = [];
    this.splicers.forEach((s, i) => {
      const ev = s.render(outs, frames, offset, true);
      if (i === li) events = ev;
    });
    return events;
  }
}
