// pairs.mjs — matched pairs for one day. Positive = a token equal to a gold nickname form (spoke >= 3 messages, >= 3 chars, not a topic word, not the speaker of that message).
// Negative = ordinary token of >= 3 chars that is not any nickname form. Match, without replacement, on: stratum (FIRST = first occurrence of the form in the day, LATER = otherwise),
// within-message index (0,1,2,3,4-5,6-9,10+), HALF-OCTAVE day-frequency bin floor(2*log2 count), EXACT character length (3..10, 11+), message length (exact to 7, then 8-9, 10-11, 12-14, 15-19, 20-27, 28-40, 41+). Exact-cell matching (no relaxation);
// a positive with no same-cell negative is dropped and counted (coverage is reported).
import { buildIndex, scoresAt } from "./index.mjs";
import { shuffleIn } from "./load.mjs";
const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6);
// POST-HOC AMENDMENT (2026-10-07, after discovery run v1, before any rule was shortlisted): v1 NONINIT cells had the raw day-count control at 0.40-0.44 (must be 0.45-0.55). CHAT_FREQBIN=4 tightens the
// frequency key from half-octave to quarter-octave bins (tightening, not loosening). Unset = v1 (half-octave), which reproduces the v1 run exactly.
const FQ = Number(process.env.CHAT_FREQBIN ?? 2);
const fb2 = (n) => Math.floor(FQ * Math.log2(Math.max(1, n)));
const clb = (w) => Math.min(11, [...w].length);
const mlb = (n) => (n <= 7 ? n : n <= 9 ? 8 : n <= 11 ? 9 : n <= 14 ? 10 : n <= 19 ? 11 : n <= 27 ? 12 : n <= 40 ? 13 : 14);
const COSTS = [[0, 0, 0, 0]]; // ALL key parts EXACT (index bucket, half-octave day frequency, character length, message-length bucket); no relaxation: a positive with no same-cell negative is dropped and counted
COSTS.sort((a, b) => a[0] - b[0]);
/** day = {T: token arrays, S: speaker forms (GOLD ONLY), nicks, topic}. Returns {pairs: [{pos:{...}, neg:{...}}], ...} for stratum FIRST|LATER. cols = score columns kept. */
export function dayPairs(day, stratum, rnd, max, ix = buildIndex(day.T)) {
  const seen = new Map(), P = [], N = [];
  day.T.forEach((m, k) => m.forEach((w, i) => {
    const kk = seen.get(w) ?? 0; seen.set(w, kk + 1);
    if ((stratum === "FIRST") !== (kk === 0)) return;
    const isNick = day.nicks.has(w), c = isNick ? (!day.topic.has(w) && w !== day.S[k] ? "P" : null) : [...w].length >= 3 ? "N" : null;
    if (!c) return;
    const o = { m: k, i, w, len: m.length, key: [ibk(i), fb2(ix.count.get(w)), clb(w), mlb(m.length)] };
    (c === "P" ? P : N).push(o);
  }));
  const pool = new Map(); for (const o of N) { const kk = o.key.join("|"); (pool.get(kk) ?? pool.set(kk, []).get(kk)).push(o); }
  for (const a of pool.values()) shuffleIn(a, rnd);
  const out = []; let dropped = 0, exact = 0;
  for (const p of shuffleIn(P, rnd)) {
    if (out.length >= max) break;
    let q = null, cost = null;
    for (const [c, df, dc, dl] of COSTS) { const a = pool.get([p.key[0], p.key[1] + df, p.key[2] + dc, p.key[3] + dl].join("|")); if (a?.length) { q = a.pop(); cost = c; break; } }
    if (!q) { dropped += 1; continue; }
    if (cost === 0) exact += 1;
    const rec = (o) => ({ w: o.w, m: o.m, i: o.i, len: o.len, cl: [...o.w].length, lc: Math.log2(ix.count.get(o.w)), init: o.i === 0, ...scoresAt(ix, o.m, o.i, o.w) });
    out.push({ pos: rec(p), neg: rec(q), cost });
  }
  return { pairs: out, dropped, exact, nPos: P.length, nNeg: N.length };
}
