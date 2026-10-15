// Radix-2 complex FFT, f32, with WebAssembly SIMD (f32x4) butterflies.
// Memory layout (bytes, all f32 unless noted), set up by init(n):
//   re[n] | im[n] | twr[n] | twi[n] | rev[n] (i32)
// Twiddles for the stage with half-size h are stored contiguously at [h, 2h).

let N: i32 = 0;
let RE: usize = 0;
let IM: usize = 0;
let TWR: usize = 0;
let TWI: usize = 0;
let REV: usize = 0;

export function init(n: i32): usize {
  N = n;
  const bytes = <usize>n * 4;
  RE = heap.alloc(bytes * 5);
  IM = RE + bytes;
  TWR = IM + bytes;
  TWI = TWR + bytes;
  REV = TWI + bytes;
  for (let h = 4; h < n; h <<= 1) {
    for (let k = 0; k < h; k++) {
      const a = (-Math.PI * <f64>k) / <f64>h;
      store<f32>(TWR + (<usize>(h + k) << 2), <f32>Math.cos(a));
      store<f32>(TWI + (<usize>(h + k) << 2), <f32>Math.sin(a));
    }
  }
  let bits = 0;
  while ((1 << bits) < n) bits++;
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    store<i32>(REV + (<usize>i << 2), r);
  }
  return RE;
}

export function imOffset(): usize { return IM; }

export function transform(): void {
  const n = N;
  for (let i = 0; i < n; i++) {
    const j = load<i32>(REV + (<usize>i << 2));
    if (j > i) {
      const pi = <usize>i << 2, pj = <usize>j << 2;
      let t = load<f32>(RE + pi); store<f32>(RE + pi, load<f32>(RE + pj)); store<f32>(RE + pj, t);
      t = load<f32>(IM + pi); store<f32>(IM + pi, load<f32>(IM + pj)); store<f32>(IM + pj, t);
    }
  }
  // Stages 1+2 fused (radix-4, trivial twiddles).
  for (let i = 0; i < n; i += 4) {
    const p = RE + (<usize>i << 2), q = IM + (<usize>i << 2);
    const ar = load<f32>(p), br = load<f32>(p, 4), cr = load<f32>(p, 8), dr = load<f32>(p, 12);
    const ai = load<f32>(q), bi = load<f32>(q, 4), ci = load<f32>(q, 8), di = load<f32>(q, 12);
    const s0r = ar + br, s0i = ai + bi, s1r = ar - br, s1i = ai - bi;
    const s2r = cr + dr, s2i = ci + di, s3r = cr - dr, s3i = ci - di;
    store<f32>(p, s0r + s2r); store<f32>(q, s0i + s2i);
    store<f32>(p, s0r - s2r, 8); store<f32>(q, s0i - s2i, 8);
    store<f32>(p, s1r + s3i, 4); store<f32>(q, s1i - s3r, 4);
    store<f32>(p, s1r - s3i, 12); store<f32>(q, s1i + s3r, 12);
  }
  // Remaining stages: half >= 4, so k runs in multiples of 4 → f32x4 lanes.
  for (let half = 4; half < n; half <<= 1) {
    const len = half << 1;
    const tw = <usize>half << 2;
    for (let i = 0; i < n; i += len) {
      const a0 = <usize>i << 2;
      const b0 = <usize>(i + half) << 2;
      for (let k = 0; k < half; k += 4) {
        const o = <usize>k << 2;
        const wr = v128.load(TWR + tw + o);
        const wi = v128.load(TWI + tw + o);
        const br = v128.load(RE + b0 + o);
        const bi = v128.load(IM + b0 + o);
        const xr = f32x4.sub(f32x4.mul(br, wr), f32x4.mul(bi, wi));
        const xi = f32x4.add(f32x4.mul(br, wi), f32x4.mul(bi, wr));
        const ar = v128.load(RE + a0 + o);
        const ai = v128.load(IM + a0 + o);
        v128.store(RE + b0 + o, f32x4.sub(ar, xr));
        v128.store(IM + b0 + o, f32x4.sub(ai, xi));
        v128.store(RE + a0 + o, f32x4.add(ar, xr));
        v128.store(IM + a0 + o, f32x4.add(ai, xi));
      }
    }
  }
}
