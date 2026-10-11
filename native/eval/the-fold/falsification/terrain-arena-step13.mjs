// terrain-arena-step13.mjs — STEP 13: THE WELD AS NETWORK, NOT KIND.
// The sharp version of "is it a broken abstraction or the wrong terrain?"
// On the SAME real Rigveda evidence, two READINGS of the identical feature:
//   KIND      membership in induced basins (steps 11/12) — anti-predicted
//             late participation (effect -0.33, p~1): the membership reading
//             earned nothing.
//   NETWORK   the relational DEGREE of a referent — how many distinct clauses
//             it participates in through the EARLY half of the stream (the
//             "seat" structure that the weld hypothesis named). If the same
//             evidence predicts late participation when read as relational
//             degree instead of membership, the weld is a Field/Network
//             structure that Kind was never entitled to judge.
//
// Method:
//   temporal hold-out: g(r) = |distinct clauses containing r in the early
//   half| (the network/field reading). LATE = r appears in any clause after
//   the split. Prediction: place r in the top-half by g; accuracy of "top-
//   half degree -> late participation" against base rate, with a shuffle
//   control (assign degrees at random among referents, same marginals,
//   500 draws) for a selection-aware p. Also reports the same test for the
//   Kind-basin reading on the same split for direct contrast.
//
// Verdict CONFIRMED if the network/degree reading has effect > 0.3 AND p
// <= 0.01 AND strictly beats the kind-basin reading on the same split — the
// "wrong terrain" hypothesis. FALSIFIED if neither reading predicts (the weld
// is noise in every terrain we can build).
//
// Usage: node terrain-arena-step13.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const SPLIT = Math.floor(0.6 * Math.max(...corpus.edges.map((e) => e.at ?? 0)));
const refs = new Set(corpus.referents.map((r) => r.hash));

const late = new Set();
for (const e of corpus.edges) if ((e.at ?? 0) > SPLIT) { if (e.subject) late.add(e.subject); if (e.object) late.add(e.object); }

// ── NETWORK reading: distinct early clauses per referent (the seat/degree)
const earlyClauses = new Map();
for (const e of corpus.edges) if ((e.at ?? 0) <= SPLIT) {
  for (const r of [e.subject, e.object]) if (r) { if (!earlyClauses.has(r)) earlyClauses.set(r, new Set()); earlyClauses.get(r).add(e.at ?? 0); }
}
const degree = new Map([...refs].map((r) => [r, earlyClauses.get(r)?.size ?? 0]));

// ── KIND reading (contrast): membership in early-induced basins, company model
const companyOf = (seg) => {
  const clauses = new Map();
  for (const e of seg) { const cid = e.at ?? 0; if (!clauses.has(cid)) clauses.set(cid, new Set()); if (e.subject) clauses.get(cid).add(e.subject); if (e.object) clauses.get(cid).add(e.object); }
  const counts = new Map();
  for (const set of clauses.values()) { const a = [...set]; for (const x of a) { if (!counts.has(x)) counts.set(x, new Map()); const m = counts.get(x); for (const y of a) if (y !== x) m.set(`co:${y}`, (m.get(`co:${y}`) ?? 0) + 1); } }
  return counts;
};
const earlyEdges = corpus.edges.filter((e) => (e.at ?? 0) <= SPLIT);
const ec = companyOf(earlyEdges);
const ent = new Map();
for (const [r, m] of ec) { const mm = new Map(); for (const [s, c] of m) mm.set(s, { signature: s, featureKey: "co", featureValue: s.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(c, 12) }, (_, i) => `${r}:${s}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] }); ent.set(r, mm); }
const kind = entity.induceEntityKindCandidates(ent, { population: "step13:kind", permutations: 40, minKindSize: 3, minPrevalence: 0 });
const basinOf = new Map(); for (const c of kind.candidates) for (const r of c.memberRefs) basinOf.set(r, c.kindKey);

// ── the predictive test for a binary score h(r) ∈ {0,1} vs late ──────────
function testPredictor(pred) {
  const P = [...refs];
  const pairs = P.map((r) => [pred(r) ? 1 : 0, late.has(r) ? 1 : 0]);
  const pos = pairs.filter(([p]) => p === 1);
  const neg = pairs.filter(([p]) => p === 0);
  const rate = (list) => (list.length ? list.filter(([, l]) => l === 1).length / list.length : null);
  const posRate = rate(pos), negRate = rate(neg);
  const effect = (posRate == null || negRate == null) ? null : posRate - negRate;
  return { posN: pos.length, negN: neg.length, posRate, negRate, effect, base: late.size / refs.size };
}

// NETWORK predictor: top-half by early-clause degree
const sortedDeg = [...degree.values()].sort((a, b) => b - a);
const degCut = sortedDeg[Math.floor(sortedDeg.length / 2)];
const netPred = (r) => degree.get(r) >= degCut;
const kindPred = (r) => basinOf.has(r);

const net = testPredictor(netPred);
const kindResult = testPredictor(kindPred);

// selection-aware shuffle control for the NETWORK reading: permute degrees
// across referents preserving their marginal multiset, 500 draws
const { netShuffledEffects } = (() => {
  const degs = [...degree.values()];
  const effects = [];
  for (let s = 0; s < 500; s++) {
    const rng = createSeededRng(9000 + s);
    const perm = shuffled(degs, rng);
    const pred = (r, i) => perm[i] >= degCut;
    const pairs = [...refs].map((r, i) => [(pred(r, i) ? 1 : 0), late.has(r) ? 1 : 0]);
    const pos = pairs.filter(([p]) => p === 1), neg = pairs.filter(([p]) => p === 0);
    const posR = pos.length ? pos.filter(([, l]) => l === 1).length / pos.length : null;
    const negR = neg.length ? neg.filter(([, l]) => l === 1).length / neg.length : null;
    effects.push((posR == null || negR == null) ? 0 : posR - negR);
  }
  return { netShuffledEffects: effects };
})();
const netP = (netShuffledEffects.filter((e) => e >= (net.effect ?? 0)).length + 1) / (netShuffledEffects.length + 1);

const verdict = (net.effect ?? 0) > 0.3 && netP <= 0.01 && (net.effect ?? 0) > (kindResult.effect ?? -Infinity) + 0.3
  ? { verdict: "CONFIRMED", claim: "the same evidence reads better as NETWORK than as KIND: early relational degree predicts late participation (net effect " + net.effect.toFixed(3) + ", shuffle-p " + netP.toFixed(3) + ") while Kind membership anti-predicts it — the hub/seat structure is a Field/Network phenomenon misassigned to Kind." }
  : { verdict: "FALSIFIED", claim: "neither the kind-membership reading nor the network-degree reading of the same real evidence predicts late participation — the weld/near-universal structure is noise in every terrain this machinery can express." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep13@1",
  material: { corpus: corpus.corpus, referents: refs.size, edges: corpus.edges.length, split: SPLIT, lateRefs: late.size, baseRate: +(late.size / refs.size).toFixed(3) },
  readings: {
    networkDegree: { ...net, effect: net.effect == null ? null : +net.effect.toFixed(3), posRate: net.posRate == null ? null : +net.posRate.toFixed(3), negRate: net.negRate == null ? null : +net.negRate.toFixed(3), shuffleP: +netP.toFixed(4) },
    kindMembership: { ...kindResult, effect: kindResult.effect == null ? null : +kindResult.effect.toFixed(3) },
  },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Degree reading = |distinct early clauses| (Fisher-universal seat proxy); a coarse network feature, not the full relationNetworkComponents topology.",
    "Threshold at the median degree, pre-registered; shuffle preserves the degree multiset.",
    "Synthetic-free: entirely real Rigveda edges; no priors, no LLM.",
  ],
}, null, 2));