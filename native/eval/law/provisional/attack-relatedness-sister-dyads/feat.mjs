// eval/law/provisional/attack-relatedness-sister-dyads/feat.mjs — feature extraction (own copy of name-company rankBins/featuresOf logic, which is not exported, plus mid-tie and CAUSAL rank bins and
// extra count columns), the STRICT matcher, row packing and the language objects used by the transfer. NEW FILE; computes no AUC.
import { rs, shuffleIn, pairsOf } from "./lib.mjs";
const NB = 13;
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
export const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
export const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
export const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
/** global stream statistics: counts; bins with the original alphabetical tie order (binsA) and with mid-rank ties (binsM). */
export function statsOf(stream) {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const order = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), binsA = new Map(); order.forEach(([w], r) => binsA.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  const cc = new Map(); for (const [, n] of c) cc.set(n, (cc.get(n) ?? 0) + 1);
  const cs = [...cc.keys()].sort((a, b) => b - a), gt = new Map(); let acc = 0; for (const n of cs) { gt.set(n, acc); acc += cc.get(n); }
  const binsM = new Map(); for (const [w, n] of c) binsM.set(w, Math.min(11, Math.floor(Math.log2(gt.get(n) + (cc.get(n) - 1) / 2 + 1))));
  return { count: c, binsA, binsM };
}
const slot = (sent, j, bins) => (j < 0 || j >= sent.length ? 12 : bins.get(sent[j]) ?? 11);
/** causal neighbour info for wanted occurrences [{s,i}]: one pass in stream order, counts-so-far (the occurrence's own sentence neighbours included, the occurrence itself NOT counted).
 *  Returns Map "s:i" -> [binL1, binL2, countL1, countL2, local50L1]. Rank of a form = # forms with larger count so far + (# forms with the same count - 1) / 2; bin = min(11, floor(log2(rank + 1))). */
export function causalInfo(stream, wanted) {
  const want = new Set(wanted.map((w) => `${w.s}:${w.i}`));
  let M = 1; for (const s of stream) M += s.length; const fen = new Float64Array(M + 2), cnt = new Map(); let forms = 0;
  const add = (c, v) => { for (let x = c; x <= M + 1; x += x & -x) fen[x] += v; }, pre = (c) => { let t = 0; for (let x = c; x > 0; x -= x & -x) t += fen[x]; return t; };
  const eq = (c) => pre(c) - pre(c - 1), flat = []; const out = new Map(); let off = 0;
  stream.forEach((sent, s) => {
    sent.forEach((w, i) => {
      if (want.has(`${s}:${i}`)) {
        const row = [12, 12, -1, -1, -1];
        for (const [k, d] of [[0, 1], [1, 2]]) { const j = i - d; if (j < 0) continue; const f = sent[j], c = cnt.get(f) ?? 0; row[k] = Math.min(11, Math.floor(Math.log2(forms - pre(c) + (eq(c) - 1) / 2 + 1))); row[2 + k] = c; }
        if (i - 1 >= 0) { const f = sent[i - 1], p = off + i - 1; let l = 0; for (let q = Math.max(0, p - 50); q < p; q++) if (flat[q] === f) l++; row[4] = l; }
        out.set(`${s}:${i}`, row);
      }
      const c = cnt.get(w) ?? 0; if (c) add(c, -1); else forms++; cnt.set(w, c + 1); add(c + 1, 1); flat.push(w);
    });
    off += sent.length;
  });
  return out;
}
/** compact row (see unpackRow): [y, block, s, i, cnt, len, slen, L1, L2, R1, R2 (global alphabetical bins), ibk, lbk, cbk, log2freq, mL1, mL2 (mid-tie bins), cL1, cL2 (causal bins), n1, n2 (global counts of L1, L2; -1 edge), c1, c2 (causal counts), loc1]. */
export function packRows(doc, picks) {
  const { stream } = doc, st = statsOf(stream), ci = causalInfo(stream, picks.map((p) => ({ s: p.s, i: p.i })));
  return picks.map((p) => {
    const sent = stream[p.s], w = sent[p.i], c = ci.get(`${p.s}:${p.i}`), cnt = st.count.get(w), g = (j) => (j < 0 ? -1 : st.count.get(sent[j]));
    return [p.y, p.block, p.s, p.i, cnt, [...w].length, sent.length, slot(sent, p.i - 1, st.binsA), slot(sent, p.i - 2, st.binsA), slot(sent, p.i + 1, st.binsA), slot(sent, p.i + 2, st.binsA), ib(p.i), lb(sent.length), cb(w), Math.log2(Math.max(1, cnt)),
      slot(sent, p.i - 1, st.binsM), slot(sent, p.i - 2, st.binsM), c[0], c[1], g(p.i - 1), g(p.i - 2), c[2], c[3], c[4]];
  });
}
/** coarse matching = name-company pairsOf (imported, unchanged) on `doc` with rng `rnd`. Returns picks [{y,block,s,i}] in pairsOf order (pos, neg, pos, neg ...). */
export function coarsePicks(doc, stratum, rnd, max = 600) { const pr = pairsOf(doc, stratum, rnd, max); return { picks: pr.rows.map((r) => ({ y: r.y, block: r.block, s: r.s, i: r.i })), dropped: pr.dropped, pairs: pr.pairs }; }
/** STRICT matcher: greedy nearest neighbour without replacement, positives in random order. o = {dc, dl, di, dsl, ds?}: (ds = |sentence index difference| <=, absent = off) |count diff| <= dc, |chars diff| <= dl, index exact when <= 3 else within di, |sentence length diff| <= dsl. */
export function strictPicks(doc, stratum, rnd, o, max = 600) {
  const { stream } = doc, st = statsOf(stream), seen = new Map(), P = [], N = [];
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1); if ((stratum === "FIRST") !== (k === 0)) return;
    const c = doc.cls(s, i); if (!c) return;
    (c === "P" ? P : N).push({ s, i, cnt: st.count.get(w), len: [...w].length, slen: sent.length });
  }));
  const byCnt = new Map(); N.forEach((q, n) => { (byCnt.get(q.cnt) ?? byCnt.set(q.cnt, []).get(q.cnt)).push(n); });
  const used = new Uint8Array(N.length), picks = []; let dropped = 0;
  for (const p of shuffleIn(P.slice(), rnd)) {
    if (picks.length >= max * 2) break;
    let best = -1, bd = Infinity;
    for (let c = p.cnt - o.dc; c <= p.cnt + o.dc; c++) for (const n of byCnt.get(c) ?? []) {
      if (used[n]) continue; const q = N[n];
      if (Math.abs(q.len - p.len) > o.dl || Math.abs(q.slen - p.slen) > o.dsl) continue;
      if (p.i <= 3 || q.i <= 3 ? p.i !== q.i : Math.abs(p.i - q.i) > o.di) continue;
      if (o.ds != null && Math.abs(q.s - p.s) > o.ds) continue;
      const d = 3 * Math.abs(q.cnt - p.cnt) + 2 * Math.abs(q.len - p.len) + Math.abs(q.i - p.i) + 0.5 * Math.abs(q.slen - p.slen) + rnd() * 0.01;
      if (d < bd) { bd = d; best = n; }
    }
    if (best < 0) { dropped++; continue; }
    used[best] = 1; const b = doc.block(p.s);
    picks.push({ y: 1, block: b, s: p.s, i: p.i }, { y: 0, block: b, s: N[best].s, i: N[best].i });
  }
  return { picks, dropped, pairs: picks.length / 2 };
}
/** pair balance of packed rows (pos at 2k, neg at 2k+1): mean signed and absolute differences of log2 count, chars, index, sentence length, relative sentence position. */
export function balance(rows) {
  const n = rows.length / 2; if (!n) return null; const sg = [0, 0, 0, 0, 0], ab = [0, 0, 0, 0, 0];
  for (let k = 0; k < n; k++) { const p = rows[2 * k], q = rows[2 * k + 1], d = [Math.log2(p[4]) - Math.log2(q[4]), p[5] - q[5], p[3] - q[3], p[6] - q[6], p[2] - q[2]]; d.forEach((x, j) => { sg[j] += x / n; ab[j] += Math.abs(x) / n; }); }
  const nm = ["log2count", "chars", "index", "sentLen", "sentIdx"]; return { signed: Object.fromEntries(nm.map((k, j) => [k, +sg[j].toFixed(3)])), absolute: Object.fromEntries(nm.map((k, j) => [k, +ab[j].toFixed(3)])) };
}
const cg = (b) => (b <= 1 ? 0 : b <= 4 ? 1 : b <= 8 ? 2 : b <= 11 ? 3 : 4);
/** language object from packed rows: {pairs, y, block, rows, X:{arm: matrix}}. Arms: LEFT (global alphabetical bins = the registered probe), LEFTM (mid ties), LEFTC (causal bins), BOTH, POSITION, CHARLEN, FREQ, RIVALS, L1ONLY, L2ONLY, LEFTCOARSE. */
export function langOf(stem, rows) {
  const X = { LEFT: [], LEFTM: [], LEFTC: [], BOTH: [], POSITION: [], CHARLEN: [], FREQ: [], RIVALS: [], L1ONLY: [], L2ONLY: [], LEFTCOARSE: [], BOTHC: [] };
  for (const r of rows) {
    const pos = [...oh(r[11], 4), ...oh(r[12], 5)], ch = oh(r[13], 4), fq = [r[14]];
    X.LEFT.push([...oh(r[7], NB), ...oh(r[8], NB)]); X.LEFTM.push([...oh(r[15], NB), ...oh(r[16], NB)]); X.LEFTC.push([...oh(r[17], NB), ...oh(r[18], NB)]); X.BOTH.push([...oh(r[7], NB), ...oh(r[8], NB), ...oh(r[9], NB), ...oh(r[10], NB)]);
    X.POSITION.push(pos); X.CHARLEN.push(ch); X.FREQ.push(fq); X.RIVALS.push([...pos, ...ch, ...fq]); X.L1ONLY.push(oh(r[7], NB)); X.L2ONLY.push(oh(r[8], NB)); X.LEFTCOARSE.push([...oh(cg(r[7]), 5), ...oh(cg(r[8]), 5)]);
  }
  return { stem, pairs: rows.length / 2, y: rows.map((r) => r[0]), block: rows.map((r) => r[1]), rows, X };
}
