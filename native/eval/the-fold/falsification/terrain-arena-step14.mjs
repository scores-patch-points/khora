// terrain-arena-step14.mjs — STEP 14: REPAIRED CONSEQUENCE INSTRUMENT.
// Step 13 exposed a measurement confound, not a result: the temporal split
// used a hard text-POSITION cut, so referents introduced only late trivially
// had zero early-degree AND "appeared late" — inverting every effect. This
// repairs the instrument: a seeded, in-distribution RANDOM hold-out of clauses
// (~40% across the whole stream), so "test participation" is no longer a
// text-position artifact. Re-applies the three readings on the SAME real
// Rigveda edges:
//   networkDegree — top-half relational degree (distinct train clauses)
//   networkActive — any train participation (degree > 0)
//   kindMembership — membership in company-model basins induced on TRAIN
//                    clauses only (the shipped machinery)
// Each predictor is tested by hypergeometric effect + a 500-draw shuffle
// control (permuting the predictor assignment among referents, marginals
// preserved). Referents with no TRAIN features are unscorable and excluded
// (disclosed).
//
// Verdict CONFIRMED only if a reading beats base with effect >= 0.15 AND
// shuffle-p <= 0.05 AND strictly beats the other readings; otherwise
// FALSIFIED — on real text the machinery earns nothing even through the
// repaired instrument.
//
// Usage: node terrain-arena-step14.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const refs = new Set(corpus.referents.map((r) => r.hash));

// ── repaired hold-out: random ~40% of CLAUSES, seeded, in-distribution ───
const clauseIds = [...new Set(corpus.edges.map((e) => e.at ?? 0))].sort((a, b) => a - b);
const rng = createSeededRng(777);
const testClauses = new Set(shuffled(clauseIds, rng).slice(0, Math.floor(0.4 * clauseIds.length)));
const testEdges = corpus.edges.filter((e) => testClauses.has(e.at ?? 0));
const trainEdges = corpus.edges.filter((e) => !testClauses.has(e.at ?? 0));

const testRefs = new Set();
for (const e of testEdges) { if (e.subject) testRefs.add(e.subject); if (e.object) testRefs.add(e.object); }

// ── readings on TRAIN clauses only ───────────────────────────────────────
const trainClauses = new Map();
for (const e of trainEdges) { const cid = e.at ?? 0; for (const r of [e.subject, e.object]) if (r) { if (!trainClauses.has(r)) trainClauses.set(r, new Set()); trainClauses.get(r).add(cid); } }
const degree = new Map();
for (const r of refs) degree.set(r, trainClauses.get(r)?.size ?? 0);

// company-model Kind basins induced on TRAIN only (clause -> referents map)
const clauseRefs = new Map();
for (const e of trainEdges) {
  const cid = e.at ?? 0;
  if (!clauseRefs.has(cid)) clauseRefs.set(cid, new Set());
  if (e.subject) clauseRefs.get(cid).add(e.subject);
  if (e.object) clauseRefs.get(cid).add(e.object);
}
const compTrain = new Map();
for (const set of clauseRefs.values()) { const a = [...set]; for (const x of a) { if (!compTrain.has(x)) compTrain.set(x, new Map()); const m = compTrain.get(x); for (const y of a) if (y !== x) m.set(`co:${y}`, (m.get(`co:${y}`) ?? 0) + 1); } }
const entTrain = new Map();
for (const [r, m] of compTrain) { const mm = new Map(); for (const [s, c] of m) mm.set(s, { signature: s, featureKey: "co", featureValue: s.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(c, 12) }, (_, i) => `${r}:${s}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] }); entTrain.set(r, mm); }
const kindTrain = entity.induceEntityKindCandidates(entTrain, { population: "step14:kind-train", permutations: 40, minKindSize: 3, minPrevalence: 0 });
const basinOf = new Map(); for (const c of kindTrain.candidates) for (const r of c.memberRefs) basinOf.set(r, c.kindKey);

// evaluation population: PARTICIPANTS — refs with at least one TRAIN clause.
// Test-only refs (zero train participation) are definitionally guaranteed test
// participants, so scoring them would re-introduce the step-13 confound; they
// are EXCLUDED and disclosed. The question is: among refs that already
// participate, does a reading predict FURTHER participation in held-out
// clauses? This is the introduction-conditioned, in-distribution instrument.
const scorable = [...refs].filter((r) => degree.get(r) > 0);
const unscorable = refs.size - scorable.length;

// ── evaluation ───────────────────────────────────────────────────────────
const hyp = (N, K, n, k) => { const lc = (a, b) => { if (b < 0 || b > a) return -Infinity; const m = Math.min(b, a - b); let o = 0; for (let i = 1; i <= m; i++) o += Math.log(a - m + i) - Math.log(i); return o; }; if (n === 0) return 1; let s = 0; for (let x = k; x <= Math.min(K, n); x++) s += Math.exp(lc(K, x) + lc(N - K, n - x) - lc(N, n)); return Math.min(1, s); };
function test(pred) {
  const pairs = scorable.map((r) => [pred(r) ? 1 : 0, testRefs.has(r) ? 1 : 0]);
  const pos = pairs.filter(([p]) => p === 1), neg = pairs.filter(([p]) => p === 0);
  const posRate = pos.length ? pos.filter(([, l]) => l === 1).length / pos.length : null;
  const negRate = neg.length ? neg.filter(([, l]) => l === 1).length / neg.length : null;
  const effect = posRate == null || negRate == null ? null : posRate - negRate;
  const p = effect == null ? 1 : hyp(scorable.length, testRefs.size, pos.length, pos.filter(([, l]) => l === 1).length);
  return { posN: pos.length, negN: neg.length, posRate, negRate, effect, p, base: scorable.filter((r) => testRefs.has(r)).length / scorable.length };
}
function shuffleP(predBase) {
  const roles = scorable.map((r) => (predBase(r) ? 1 : 0));
  const ys = scorable.map((r) => (testRefs.has(r) ? 1 : 0));
  const effects = [];
  for (let s = 0; s < 500; s++) {
    const rngs = createSeededRng(40000 + s);
    const perm = shuffled(roles, rngs);
    const pos = [], neg = [];
    for (let i = 0; i < perm.length; i++) (perm[i] === 1 ? pos : neg).push(ys[i]);
    const posR = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;
    const negR = neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : null;
    effects.push((posR == null || negR == null) ? 0 : posR - negR);
  }
  const eff = test(predBase).effect ?? 0;
  return { p: (effects.filter((e) => e >= eff).length + 1) / (effects.length + 1), nullMean: +(effects.reduce((a, b) => a + b, 0) / effects.length).toFixed(3) };
}

// network readings: the meaningful spread is single- vs multi-occasion
// PARTICIPATION (the seat/hub structure) — median-of-degree collapses to
// "everyone" because most participants appear in one train clause.
const netMulti = test((r) => degree.get(r) >= 2);
const netSingle = test((r) => degree.get(r) === 1);
const netMultiShuf = shuffleP((r) => degree.get(r) >= 2);
const kindRes = test((r) => basinOf.has(r));
const kindShuf = shuffleP((r) => basinOf.has(r));

const readings = {
  networkMultiOccasion: { ...netMulti, p: +netMulti.p.toFixed(4), shuffleP: +netMultiShuf.p.toFixed(4), effect: netMulti.effect == null ? null : +netMulti.effect.toFixed(3) },
  networkSingleOnly: { ...netSingle, p: +netSingle.p.toFixed(4), effect: netSingle.effect == null ? null : +netSingle.effect.toFixed(3) },
  kindMembership: { ...kindRes, p: +kindRes.p.toFixed(4), shuffleP: +kindShuf.p.toFixed(4), effect: kindRes.effect == null ? null : +kindRes.effect.toFixed(3) },
};
const best = (r) => (r.effect ?? -Infinity) >= 0.15 && r.shuffleP <= 0.05; // selection-aware shuffle-null is the adjudicator (the hypergeometric upper tail is direction-mismatched for this design and disclosed as such)
const winners = Object.entries(readings).filter(([, v]) => best(v));
const strictlyBest = winners.length === 1
  ? { name: winners[0][0], ...winners[0][1] }
  : winners.length ? { name: "tie/" + winners.map(([n]) => n).join("+") } : null;

const verdict = strictlyBest
  ? { verdict: "CONFIRMED", claim: `through the repaired in-distribution instrument, ONE reading earns standing on real text: ${strictlyBest.name} (effect ${strictlyBest.effect}, hypergeom p ${strictlyBest.p}, shuffle-p ${strictlyBest.shuffleP}) — ${strictlyBest.name === "kindMembership" ? "Kind" : "the relational reading"} carries real predictive consequence the others lack.` }
  : { verdict: "FALSIFIED", claim: "through the repaired instrument, NO reading of the real Rigveda edges earns standing: every effect is <= 0.15 or inside its own shuffle-null, and no reading strictly beats the others. On this real seam the machinery extracts no predictive consequence from these mechanical features." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep14@1",
  instrument: { repair: "in-distribution, seeded random ~40% hold-out of CLAUSES (not a text-position split) — the step-13 confound is removed", clauses: { total: clauseIds.length, heldOut: testClauses.size }, scorable: scorable.length, unscorable: refs.size - scorable.length, baseRate: +(scorable.filter((r) => testRefs.has(r)).length / scorable.length).toFixed(3) },
  readings,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Unscorable referents (no train feature) are excluded and disclosed; they cannot be predicted in-distribution either.",
    "Readings are mechanical: company-model basins (shipped) and train-clause degree; no priors, no LLM.",
    "The shuffle control permutes the predictor assignment among scorable referents, preserving marginals, 500 draws.",
  ],
}, null, 2));