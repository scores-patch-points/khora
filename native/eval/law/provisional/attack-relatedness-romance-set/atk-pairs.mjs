// attack-relatedness-romance-set/atk-pairs.mjs — feature extraction (a verbatim copy of name-company.mjs rankBins/featuresOf, which are not exported) and the STRICT matcher.
// NEW FILE; no AUC here. The coarse matcher is name-company's own pairsOf (imported, unchanged), so V0M0 rows are the confirmer's rows by construction (checked by atk-build.mjs --verify).
import { packRow, shuffleIn } from "./atk-lib.mjs";
import { unpackRow } from "../family-vs-relatedness/lib.mjs";
const NB = 13;
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
/** stream statistics: rank bins (log2 frequency rank within the stream, 12 bins) and counts. */
export function stats(stream) {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const order = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map();
  order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  return { bins, count: c };
}
const slot = (sent, j, bins) => (j < 0 || j >= sent.length ? 12 : bins.get(sent[j]) ?? 11);
/** the company profile of occurrence (s,i): exactly name-company featuresOf. */
export function feat(stream, st, s, i) {
  const sent = stream[s], w = sent[i], { bins, count } = st;
  return { L1: oh(slot(sent, i - 1, bins), NB), L2: oh(slot(sent, i - 2, bins), NB), R1: oh(slot(sent, i + 1, bins), NB), R2: oh(slot(sent, i + 2, bins), NB),
    POS: [...oh(ib(i), 4), ...oh(lb(sent.length), 5)], CHAR: oh(cb(w), 4), FREQ: [Math.log2(Math.max(1, count.get(w) ?? 1))] };
}
/** extras kept per row (not features of the registered probe): [count, chars, index, sentence length, sentence index, bagMean, bagRare, nOther]. bag = rank bins of the OTHER tokens of the sentence (order-free). */
export function extras(stream, st, s, i) {
  const sent = stream[s], w = sent[i]; let sum = 0, rare = 0, n = 0;
  for (let j = 0; j < sent.length; j++) if (j !== i) { const b = st.bins.get(sent[j]) ?? 11; sum += b; rare += b >= 10 ? 1 : 0; n++; }
  return [st.count.get(w), [...w].length, i, sent.length, s, n ? sum / n : 0, n ? rare / n : 0, n];
}
/** attach extras to rows made by pairsOf (rows carry s,i,w). */
export function withExtras(doc, rows) { const st = stats(doc.stream); return rows.map((r) => ({ ...r, x: extras(doc.stream, st, r.s, r.i) })); }
/** STRICT matcher. o = {dc, dl, di, dsl, ds, minLen, minCount}: count within +-dc, characters within +-dl, index exact for <= 3 else within +-di, sentence length within +-dsl, sentence index within +-ds (null = off).
 *  Greedy nearest neighbour (without replacement) in random positive order; both members get the POSITIVE's block (PAIRBLOCK). */
export function strictPairs(doc, stratum, rnd, max, o) {
  const { stream } = doc, st = stats(doc.stream), seen = new Map(), P = [], N = [];
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1);
    if ((stratum === "FIRST") !== (k === 0)) return;
    const c = doc.cls(s, i); if (!c) return;
    const cnt = st.count.get(w), len = [...w].length; if ((o.minLen && len < o.minLen) || (o.minCount && cnt < o.minCount)) return;
    (c === "P" ? P : N).push({ s, i, w, cnt, len, slen: sent.length });
  }));
  const byCnt = new Map(); N.forEach((q, n) => { (byCnt.get(q.cnt) ?? byCnt.set(q.cnt, []).get(q.cnt)).push(n); });
  const used = new Uint8Array(N.length), rows = []; let dropped = 0;
  for (const p of shuffleIn(P.slice(), rnd)) {
    if (rows.length >= max * 2) break;
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
    used[best] = 1;
    for (const [m, y] of [[p, 1], [N[best], 0]]) rows.push({ f: feat(stream, st, m.s, m.i), y, s: m.s, i: m.i, w: m.w, block: doc.block(p.s), doc: doc.name, x: extras(stream, st, m.s, m.i) });
  }
  return { rows, dropped, pairs: rows.length / 2 };
}
/** balance diagnostics of matched pairs: mean (positive - negative) of log2 count, chars, index, sentence length, relative sentence index; and mean absolute differences. */
export function balance(rows) {
  const d = [0, 0, 0, 0, 0], a = [0, 0, 0, 0, 0], n = rows.length / 2; if (!n) return null;
  const v = (r) => [Math.log2(Math.max(1, r.x[0])), r.x[1], r.x[2], r.x[3], r.x[4]];
  for (let k = 0; k < n; k++) { const p = v(rows[2 * k]), q = v(rows[2 * k + 1]); for (let j = 0; j < 5; j++) { d[j] += (p[j] - q[j]) / n; a[j] += Math.abs(p[j] - q[j]) / n; } }
  return { dLog2Count: d[0], dChars: d[1], dIndex: d[2], dSentLen: d[3], dSentIdx: d[4], absLog2Count: a[0], absChars: a[1], absIndex: a[2], absSentLen: a[3], absSentIdx: a[4] };
}
export const packX = (r) => [...packRow(r), ...r.x];
export const unpackX = (a) => ({ ...unpackRow(a.slice(0, 10)), x: a.slice(10) });
