// attack-relatedness-romance-set/atk-eval.mjs — EVALUATION HELPERS (loaders, arms, rival arms, donor-triple transfer on the SAME draws, pass table). No pre-registration of its own:
// every test script that imports it (atk-a.mjs, atk-b*.mjs, atk-c.mjs) carries its own header, and its sha256 is written into the output JSON.
import fs from "node:fs";
import path from "node:path";
import { HERE, rs, ROM, GER } from "./atk-lib.mjs";
import { unpackX } from "./atk-pairs.mjs";
import { ARMS, fitProbe, aucOn, pairSample, pairFlipQ95, shuffleIn, aucOf, round, mean, quantile, rngFor } from "../family-vs-relatedness/lib.mjs";
export const CAP = 100, K = 3, MIN_T = 60, MIN_D = 100;
const am = (v) => v.indexOf(Math.max(...v));
const slots = (f) => [am(f.L1), am(f.L2), am(f.R1), am(f.R2)];
const nonEdge = (f) => slots(f).filter((b) => b < 12);
const mn = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
/** arms: registered ARMS (f -> vector) plus RIVAL arms (f, x -> vector). x = [count, chars, index, sentLen, sentIdx, bagMean, bagRare, nOther]. */
export const ARM2 = {
  BOTH: (f) => ARMS.BOTH(f), LEFT: (f) => ARMS.LEFT(f), POSITION: (f) => ARMS.POSITION(f), CHARLEN: (f) => ARMS.CHARLEN(f), FREQ: (f) => ARMS.FREQ(f), RIVALS: (f) => ARMS.RIVALS(f), "BOTH+RIVALS": (f) => ARMS["BOTH+RIVALS"](f),
  NBRMEAN: (f) => [mn(nonEdge(f)), 4 - nonEdge(f).length],                                               // mean rank bin of the existing neighbours + number of edges (a 2-parameter scalar)
  NBRRARE: (f) => [nonEdge(f).filter((b) => b >= 10).length, 4 - nonEdge(f).length],                    // how many neighbours are rare (bin >= 10) + edges
  FUNC: (f) => [nonEdge(f).filter((b) => b <= 1).length, nonEdge(f).filter((b) => b <= 3).length, 4 - nonEdge(f).length], // how many neighbours are among the 3 / 15 commonest forms + edges
  ADJ: (f) => [...f.L1, ...f.R1], DIST2: (f) => [...f.L2, ...f.R2], LEFT1: (f) => [...f.L1],
  BAG: (f, x) => [x[5], x[6]],                                                                           // order-free: rank-bin composition of the OTHER tokens of the sentence
  "BOTH+BAG": (f, x) => [...ARMS.BOTH(f), x[5], x[6]],
};
export function loadAtk(set, variant, stem, shuf = false, arms = ["BOTH", "POSITION"]) {
  const p = path.join(HERE, "cache-atk", set, variant, `${stem}.FIRST${shuf ? ".shuf" : ""}.json`); if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8")), rows = j.rows.map(unpackX), X = {};
  for (const a of arms) X[a] = rows.map((r) => ARM2[a](r.f, r.x));
  return { stem, set, variant, pairs: j.pairs, balance: j.balance, rows, y: rows.map((r) => r.y), block: rows.map((r) => r.block), X };
}
export const loadRoster = (set, variant, stems, shuf = false, arms) => Object.fromEntries(stems.map((s) => [s, loadAtk(set, variant, s, shuf, arms)]).filter(([, L]) => L));
/** mean AUC per arm of probes fitted on `draws` seeded K-donor triples (CAP pairs each) of `pool`, scored on target L (the SAME triples for every arm). shufL = shuffled target (BOTH only). */
export function tripleAuc(T, L, pool, langs, arms, tag, draws = 20, shufL = null, withQ = false) {
  const P = pool.filter((x) => x !== T && langs[x] && langs[x].pairs >= MIN_D); if (P.length < K || L.pairs < MIN_T) return null;
  const acc = Object.fromEntries(arms.map((a) => [a, []])), sh = [], used = {}; let q95 = null;
  for (let d = 0; d < draws; d++) {
    const rnd = rs("tri", tag, T, d), pick = shuffleIn(P.slice(), rnd).slice(0, K), parts = pick.map((x) => ({ L: langs[x], idx: pairSample(langs[x], Math.min(CAP, langs[x].pairs), rnd) }));
    pick.forEach((x) => { used[x] = (used[x] ?? 0) + 1; });
    for (const a of arms) { const f = fitProbe(parts, a), u = aucOn(f, L, a); if (u != null) acc[a].push(u); if (a === "BOTH" && f) { if (shufL) { const s = aucOn(f, shufL, "BOTH"); if (s != null) sh.push(s); } if (withQ && d === 0) q95 = pairFlipQ95(f(L.X.BOTH), L.y, rs("q95", tag, T)); } }
  }
  return { n: P.length, means: Object.fromEntries(arms.map((a) => [a, acc[a].length ? mean(acc[a]) : null])), shuf: sh.length ? mean(sh) : null, q95, used };
}
export const boot = (xs, B = 2000, rnd = rngFor(11)) => { if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 }; const m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(rnd() * xs.length)]; m.push(t / xs.length); } return { mean: round(mean(xs)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)), n: xs.length }; };
export { ROM, GER, round, mean, aucOf };
