// pairs.mjs: occurrence collection and matched pairing with switches (NEW FILE; computes no outcome by itself).
// mode "orig" replicates name-company.mjs pairsOf (same RNG consumption); the other modes are the stricter matchings of the attack.
import { binsOf, featuresOf, ib, cb, lb, fb, shuffleIn } from "./common.mjs";
const NBR_OFFS = [-2, -1, 1, 2];
export function collect(doc, stratum, tie = "alpha", rndTie = null) {
  const { stream } = doc, { bins, count } = binsOf(stream, tie, rndTie), seen = new Map(), lastAt = new Map(), P = [], N = []; let g = 0;
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1); const prev = lastAt.get(w); lastAt.set(w, g); const rec = prev == null ? 0 : g - prev; g += 1;
    if ((stratum === "FIRST") !== (k === 0)) return;
    const c = doc.cls(s, i); if (!c) return;
    const o = { s, i, w, k, rec, key: [fb(count.get(w)), ib(i), cb(w), lb(sent.length)], count: count.get(w), len: sent.length, dend: sent.length - 1 - i, clen: [...w].length, cls: c };
    (c === "P" ? P : N).push(o);
  }));
  return { P, N, bins, count, stream };
}
const rowOf = (doc, C, o, y, blockSent) => {
  const sent = C.stream[o.s], f = featuresOf(sent, o.i, C.bins, C.count, o.w, o);
  const nbP = NBR_OFFS.some((d) => { const j = o.i + d; return j >= 0 && j < sent.length && doc.cls(o.s, j) === "P"; });
  return { f, y, s: o.s, i: o.i, w: o.w, block: doc.block(blockSent), doc: doc.name, k: o.k, rec: o.rec, count: o.count, len: o.len, dend: o.dend, clen: o.clen, nbP, edge: f._nb.some((x) => x === 12) };
};
/** spec: { levels: [ {exact(o)->string, cost(p,q)->number|Infinity} ... ], unique: bool }. Each positive tries the levels in order; no match at any level = dropped. */
export const SPECS = {
  S1: { levels: [{ exact: (o) => [ib(o.i), cb(o.w), lb(o.len)].join("|"), cost: (p, q) => (Math.abs(p.count - q.count) <= 1 ? Math.abs(p.count - q.count) : Infinity) }] },
  S2: { levels: [{ exact: (o) => [Math.min(o.i, 10), Math.min(o.dend, 3), Math.min(o.clen, 12), fb(o.count)].join("|"), cost: (p, q) => (Math.abs(p.len - q.len) <= 3 ? Math.abs(p.len - q.len) : Infinity) }] },
  S3: { levels: [{ exact: (o) => [Math.min(o.i, 10), Math.min(o.dend, 3), Math.min(o.clen, 12), Math.floor(Math.log2(1 + o.k)), Math.min(9, Math.floor(Math.log2(1 + o.rec)))].join("|"),
    cost: (p, q) => (Math.abs(p.count - q.count) <= 1 && Math.abs(p.len - q.len) <= 3 ? Math.abs(p.count - q.count) + Math.abs(p.len - q.len) / 4 : Infinity) }] },
  U: { unique: true, levels: [{ exact: (o) => o.key.join("|"), cost: () => 0 }, { exact: (o) => o.key.slice(0, 3).join("|"), cost: () => 0 }] },
  // control for U: the original matching but with the positives' forms thinned to one occurrence only on the positive side is NOT used; see attackA
};
export function buildPairs(doc, stratum, rnd, o = {}) {
  const { mode = "orig", tie = "alpha", rndTie = null, max = 600 } = o, C = collect(doc, stratum, tie, rndTie), { P, N } = C, rows = []; let dropped = 0;
  if (mode === "orig") {
    const pool = new Map(); for (const x of N) { const kk = x.key.join("|"); (pool.get(kk) ?? pool.set(kk, []).get(kk)).push(x); }
    for (const a of pool.values()) shuffleIn(a, rnd);
    for (const p of shuffleIn(P, rnd)) {
      if (rows.length >= max * 2) break;
      let q = null;
      for (const relax of [false, true]) {
        const kk = relax ? null : p.key.join("|");
        const cand = relax ? [...pool.entries()].find(([k2, a]) => a.length && k2.split("|").slice(0, 3).join("|") === p.key.slice(0, 3).join("|")) : [kk, pool.get(kk)];
        if (cand && cand[1]?.length) { q = cand[1].pop(); break; }
      }
      if (!q) { dropped += 1; continue; }
      for (const [x, y] of [[p, 1], [q, 0]]) rows.push(rowOf(doc, C, x, y, p.s));
    }
    return { rows, dropped, pairs: rows.length / 2, nPos: P.length, nNeg: N.length };
  }
  const spec = SPECS[mode]; if (!spec) throw new Error("mode " + mode);
  const pools = spec.levels.map((lv) => { const pool = new Map(); for (const x of N) { const kk = lv.exact(x); (pool.get(kk) ?? pool.set(kk, []).get(kk)).push(x); } for (const a of pool.values()) shuffleIn(a, rnd); return pool; });
  const usedNeg = new Set(), usedPos = new Set(), taken = new Set();
  for (const p of shuffleIn(P.slice(), rnd)) {
    if (rows.length >= max * 2) break;
    if (spec.unique && usedPos.has(p.w)) continue;
    let q = null;
    for (let L = 0; L < spec.levels.length && !q; L++) {
      const arr = pools[L].get(spec.levels[L].exact(p)); if (!arr) continue; let best = -1, bc = Infinity;
      for (let t = 0; t < arr.length; t++) { const x = arr[t]; if (taken.has(x) || (spec.unique && usedNeg.has(x.w))) continue; const c = spec.levels[L].cost(p, x); if (c < bc) { bc = c; best = t; } }
      if (best >= 0) { q = arr[best]; arr.splice(best, 1); }
    }
    if (!q) { dropped += 1; continue; }
    taken.add(q); usedPos.add(p.w); usedNeg.add(q.w);
    for (const [x, y] of [[p, 1], [q, 0]]) rows.push(rowOf(doc, C, x, y, p.s));
  }
  return { rows, dropped, pairs: rows.length / 2, nPos: P.length, nNeg: N.length };
}
/** keep the pairs (rows 2k, 2k+1) where cond holds for both members */
export function filterPairs(rows, cond) { const out = []; for (let k = 0; k + 1 < rows.length; k += 2) if (cond(rows[k]) && cond(rows[k + 1])) out.push(rows[k], rows[k + 1]); return out; }
export function subsample(rows, m, rnd) { const n = rows.length / 2; if (m >= n) return rows; const ids = shuffleIn(Array.from({ length: n }, (_, k) => k), rnd).slice(0, m).sort((a, b) => a - b); return ids.flatMap((k) => [rows[2 * k], rows[2 * k + 1]]); }
