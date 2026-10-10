// laws/_phys_mass.mjs — MASS statistics of the "phys" family: footprint additivity (massAdd) and footprint extensivity (massExp). See laws/phys.mjs for the laws in words and the nulls.
// Footprint of a type in a region of the stream = number of DISTINCT neighbour slots its mentions occupy, a slot being (side, neighbour type) with the unit start and unit end as two extra
// pseudo-neighbours (so a unit-initial mention occupies the slot "left: unit start"). A mention count is additive by identity; a footprint is additive exactly when no context slot recurs.
import { windows } from "./_phys_prep.mjs";

const WIN = 3000, FLOOR = 3, MIN_ROWS = 20, MIN_TOKENS = 6000;

/** footprint table of units ua..ub-1: Map type -> [F, n] (F distinct side-tagged neighbour slots, n mentions) */
function table(P, ua, ub, M, V2) {
  const nt = P.us[ub] - P.us[ua], keys = new Float64Array(2 * nt); let k = 0;
  for (let u = ua; u < ub; u++) {
    const s = P.us[u], e = P.us[u + 1];
    for (let i = s; i < e; i++) {
      const t = P.tid[i], L = i > s ? P.tid[i - 1] : P.V, R = i < e - 1 ? P.tid[i + 1] : P.V + 1;
      keys[k++] = t * M + L; keys[k++] = t * M + V2 + R;
    }
  }
  keys.sort();
  const out = new Map(); let prev = -1, cur = -1, F = 0, n = 0;
  for (let q = 0; q < k; q++) {
    const key = keys[q], t = Math.floor(key / M);
    if (t !== cur) { if (cur >= 0) out.set(cur, [F, n]); cur = t; F = 0; n = 0; prev = -1; }
    if (key !== prev) F++;
    if (key - t * M < V2) n++;
    prev = key;
  }
  if (cur >= 0) out.set(cur, [F, n]);
  return out;
}

export function massStats(P) {
  const res = { massAdd: null, massExp: null };
  if (P.N < MIN_TOKENS) return res;
  const V2 = P.V + 2, M = 2 * V2;
  let sxy = 0, sxx = 0, rowsAdd = 0, n = 0, sx = 0, sy = 0, sxx2 = 0, sxy2 = 0;
  for (const w of windows(P, WIN)) {
    let um = w.u0 + 1; while (um < w.u1 - 1 && P.us[um] - w.t0 < (w.t1 - w.t0) / 2) um++;
    if (um >= w.u1) continue;
    const whole = table(P, w.u0, w.u1, M, V2), h1 = table(P, w.u0, um, M, V2), h2 = table(P, um, w.u1, M, V2);
    for (const [t, [F, nn]] of whole) {
      if (nn >= FLOOR) { const x = Math.log(nn), y = Math.log(F); n++; sx += x; sy += y; sxx2 += x * x; sxy2 += x * y; }
      const a = h1.get(t), b = h2.get(t);
      if (a && b && a[1] >= FLOOR && b[1] >= FLOOR) { const s = a[0] + b[0]; sxy += F * s; sxx += s * s; rowsAdd++; }
    }
  }
  if (rowsAdd >= MIN_ROWS && sxx > 0) res.massAdd = sxy / sxx;
  if (n >= MIN_ROWS) { const vx = sxx2 - (sx * sx) / n; if (vx > 1e-9) res.massExp = (sxy2 - (sx * sy) / n) / vx; }
  return res;
}
