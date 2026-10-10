// attack-R1_first_slot_share/match.mjs: own 1-1 matcher (within day, exact cell, no replacement), own pooled STRATIFIED AUC (every positive vs all negatives of its cell), cluster bootstraps. NEW FILE.
import { rngOf, shuffleIn, buildIx, feat, laterOccs, KEYS } from "./lib.mjs";
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] : null; };
/** Row for one occurrence: raw geometry, form count (whole day, MATCHING/CONTROL only), and every prefix feature. rec = recency control (higher = more recent). */
export function rowOf(d, ix, o) {
  const f = feat(ix, o.k, o.w), c = ix.count.get(o.w);
  return { w: o.w, k: o.k, i: o.i, len: o.len, cl: [...o.w].length, lc: Math.log2(c), mday: o.k, rec: -Math.log2(1 + (f.gap ?? 0)), recI: f.gapI == null ? -12 : -Math.log2(1 + f.gapI), day: d.key, lang: d.lang, channel: d.channel, year: d.year, init: o.i === 0, ...f, _f: f };
}
/** Within-day 1-1 matched pairs under key KEYS[keyName]; positives shuffled, <= max pairs; pred(o) restricts BOTH classes (e.g. initial only). Returns pairs [{pos,neg,day}] and the dropped count. */
export function matchDay(d, keyName, { max = 400, seed = "m", pred = () => true, fpred = null } = {}) {
  const ix = buildIx(d.T), P = [], pool = new Map(), K = KEYS[keyName];
  for (const o of laterOccs(d)) { if (!pred(o)) continue; const f = feat(ix, o.k, o.w); if (fpred && !fpred(f)) continue; o.key = K(o, f, ix).join("|"); if (o.cls === "P") P.push(o); else (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o); }
  const r = rngOf(seed, keyName, d.key); for (const a of pool.values()) shuffleIn(a, r);
  const pairs = []; let dropped = 0;
  for (const p of shuffleIn(P, r)) { if (pairs.length >= max) break; const a = pool.get(p.key); if (!a?.length) { dropped++; continue; } const n = a.pop(); pairs.push({ pos: rowOf(d, ix, p), neg: rowOf(d, ix, n), day: d.key }); }
  return { pairs, dropped, nPos: P.length, ix };
}
export const wins = (p, col, sign = 1) => { const x = sign * (p.pos[col] - p.neg[col]); return x > 0 ? 1 : x === 0 ? 0.5 : 0; };
export const pAuc = (ps, col, sign = 1) => (ps.length ? ps.reduce((s, p) => s + wins(p, col, sign), 0) / ps.length : null);
/** Cluster bootstrap CI of a paired AUC; cl(p) gives the cluster label (day, or day+form). */
export function bootPairs(ps, col, cl, B = 300, seed = "bp", sign = 1) {
  const by = new Map(); for (const p of ps) (by.get(cl(p)) ?? by.set(cl(p), []).get(cl(p))).push(wins(p, col, sign)); const C = [...by.values()]; if (C.length < 4) return [null, null];
  const r = rngOf(seed, col), v = [];
  for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let j = 0; j < C.length; j++) { const c = C[Math.floor(r() * C.length)]; for (const x of c) s += x; n += c.length; } v.push(s / n); }
  return [round(q(v, 0.025)), round(q(v, 0.975))];
}
export const byDay = (p) => p.day, byForm = (p) => p.day + "|" + p.pos.w;
/** Summary of a set of pairs: n, days, AUC, day-cluster CI, (day,form)-cluster CI, controls. */
export function sumPairs(ps, cols = ["ishare"], ctl = ["i", "len", "cl", "lc", "b", "rec"], seed = "sp") {
  const o = { n: ps.length, days: new Set(ps.map(byDay)).size, forms: new Set(ps.map(byForm)).size, auc: {}, ctl: {} };
  for (const c of cols) o.auc[c] = round(pAuc(ps, c)); for (const c of ctl) o.ctl[c] = round(pAuc(ps, c));
  if (ps.length >= 40) { o.dayCi = bootPairs(ps, "ishare", byDay, 300, seed + "d"); o.formCi = bootPairs(ps, "ishare", byForm, 300, seed + "f"); }
  o.ctlOk = ctl.every((c) => o.ctl[c] >= 0.45 && o.ctl[c] <= 0.55); return o;
}
/** Pooled STRATIFIED AUC. docs = day objects; negatives of all docs are pooled by key; each occurrence keeps its own day's prefix features. Positives per day capped (seeded). */
export function strat(docs, keyName, { cols = ["ishare", "i", "len", "cl", "lc", "b", "rec"], pred = () => true, maxPos = 1500, seed = "st", B = 300 } = {}) {
  const K = KEYS[keyName], cells = new Map(), P = [];
  for (const d of docs) {
    const ix = buildIx(d.T), pos = [];
    for (const o of laterOccs(d)) { if (!pred(o)) continue; const f = feat(ix, o.k, o.w); const key = K(o, f, ix).join("|"); if (o.cls === "P") { o.key = key; pos.push(o); } else { let c = cells.get(key); if (!c) cells.set(key, (c = { n: 0, v: Object.fromEntries(cols.map((x) => [x, []])) })); const r = rowOf(d, ix, o); c.n++; for (const x of cols) c.v[x].push(r[x]); } }
    const r = rngOf(seed, d.key, keyName); shuffleIn(pos, r); for (const o of pos.slice(0, maxPos)) P.push({ o, r: rowOf(d, ix, o), d: d.key });
  }
  for (const c of cells.values()) for (const x of cols) c.v[x] = Float64Array.from(c.v[x]).sort();
  const lo = (a, x) => { let l = 0, h = a.length; while (l < h) { const m = (l + h) >> 1; if (a[m] < x) l = m + 1; else h = m; } return l; }, hi = (a, x) => { let l = 0, h = a.length; while (l < h) { const m = (l + h) >> 1; if (a[m] <= x) l = m + 1; else h = m; } return l; };
  const rows = []; for (const { o, r, d } of P) { const c = cells.get(o.key); if (!c || !c.n) continue; const win = {}; for (const x of cols) { const a = c.v[x], L = lo(a, r[x]), H = hi(a, r[x]); win[x] = (L + 0.5 * (H - L)) / a.length; } rows.push({ day: d, form: o.w, cl: d + "|" + o.w, init: o.i === 0, win, cellN: c.n }); }
  return { rows, nPos: P.length, nNegCells: cells.size };
}
export function sumStrat(res, { B = 300, seed = "ss", ctl = ["i", "len", "cl", "lc", "b", "rec"] } = {}) {
  const rows = res.rows, mean = (rs, c) => rs.reduce((s, r) => s + r.win[c], 0) / Math.max(1, rs.length), o = { nPos: res.nPos, covered: rows.length, clusters: new Set(rows.map((r) => r.cl)).size, days: new Set(rows.map((r) => r.day)).size, auc: {}, ctl: {} };
  for (const c of Object.keys(rows[0]?.win ?? {})) o.auc[c] = round(mean(rows, c)); for (const c of ctl) o.ctl[c] = o.auc[c];
  o.ctlOk = ctl.every((c) => o.auc[c] >= 0.45 && o.auc[c] <= 0.55);
  for (const [nm, f] of [["clCi", (r) => r.cl], ["dayCi", (r) => r.day]]) {
    const by = new Map(); for (const r of rows) (by.get(f(r)) ?? by.set(f(r), []).get(f(r))).push(r); const C = [...by.values()]; if (C.length < 4) { o[nm] = [null, null]; continue; }
    const rnd = rngOf(seed, nm), v = []; for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let j = 0; j < C.length; j++) { const c = C[Math.floor(rnd() * C.length)]; for (const r of c) s += r.win.ishare; n += c.length; } v.push(s / n); }
    o[nm] = [round(q(v, 0.025)), round(q(v, 0.975))];
  }
  return o;
}
