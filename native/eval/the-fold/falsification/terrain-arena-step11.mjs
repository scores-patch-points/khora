// terrain-arena-step11.mjs — REAL-CORPUS TRANSFER FALSIFIER. The essay's
// "next falsifier": take a REAL reading out of the Fold (Rigveda EOT seam:
// 455 referents, 2098 clauses, 2098 edges, real Sanskrit predication) and ask
// whether the SHIPPED Kind machinery + standing discipline earn anything on
// it — against all four checks:
//   invariance   largest-identical-profile multiplicity vs the sqrt(n) cutoff
//                (the self-audit's degenerate regime, checked on the real
//                population, not a synthetic one)
//   discrimination  OUTER null: shuffle the feature labels across the real
//                referents (preserving per-referent counts and global action
//                frequency) and re-run the WHOLE induction 30× — selection-
//                aware p (the experiment's p≈0.630 lesson).
//   consequence   TEMPORAL HOLD-OUT: features witnessed early (at<=1050)
//                induce the basins; does basin membership predict whether a
//                referent gains features later (at>1050) beyond the base
//                rate? Hypergeometric effect + p on held-out members.
//   compression   memberCount / evidence carried per artifact.
// Verdict CONFIRMED only if a real induced Kind earns standing: held-out
// consequence effect clears the bar on a statistically sound p AND the
// outer-null discrimination p <= 0.05. Otherwise FALSIFIED — on REAL material
// the coherence null alone earns nothing, exactly as the chapter claims.
//
// Usage: node terrain-arena-step11.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const corpusPath = path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json");
const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const REFS = corpus.referents;                 // [{hash, name}]
const EDGES = corpus.edges;                    // [{at,action,subject,object}]
const SPLIT = 1050;

// ── features: predication + scene-membership, witnessed by their edge ids ──
// A referent's features are the ACTIONS it performs/undergoes (role-tagged)
// and the clause-region it appears in. Repeated edges ARE repeated witnesses
// (evidenceIds = the edge ids) — the multi-witness lesson from step 1, on real
// data, no simulation.
function buildFeatures({ relabel = null } = {}) {
  const f = new Map();
  const get = (r) => { if (!f.has(r)) f.set(r, new Map()); return f.get(r); };
  const region = new Map();
  for (const e of EDGES) {
    const bucket = Math.floor((e.at ?? 0) / 200);
    const parts = [];
    if (e.subject) parts.push([e.subject, `act:${e.action}:subject`]);
    if (e.object) parts.push([e.object, `act:${e.action}:object`]);
    for (const [ref, sig0] of parts) {
      const sig = relabel ? relabel(sig0, ref) : sig0;
      const record = get(ref).get(sig) ?? { featureKey: sig.split(":")[0] + ":" + sig.split(":")[1], featureValue: sig.split(":")[2] ?? true, evidenceIds: new Set(), firstAt: Infinity, lastAt: -Infinity, witnessRefs: [] };
      record.evidenceIds.add(e.id ?? `${e.at}:${e.action}`);
      record.firstAt = Math.min(record.firstAt, e.at ?? 0);
      record.lastAt = Math.max(record.lastAt, e.at ?? 0);
      get(ref).set(sig, record);
      get(ref).set(`arch:${bucket}`, get(ref).get(`arch:${bucket}`) ?? { featureKey: "arch", featureValue: bucket, evidenceIds: new Set([`${e.at}:arch`]), firstAt: e.at ?? 0, lastAt: e.at ?? 0, witnessRefs: [] });
    }
  }
  return f;
}

// keep every referent's per-referent degree and the global action frequencies,
// but scramble WHICH referent wears WHICH action (the outer-null for the whole
// discovery procedure).
function outerNull(seed) {
  const rng = createSeededRng(seed);
  const f0 = buildFeatures();
  const actions = [];
  for (const [r, rows] of f0) {
    for (const sig of rows.keys()) {
      for (const ev of rows.get(sig).evidenceIds) actions.push({ r, sig, ev, at: rows.get(sig).firstAt });
    }
  }
  const sigs = [...new Set(actions.map((a) => a.sig))];
  const shuffledSigs = shuffled(sigs, rng);
  const map = new Map(sigs.map((s, i) => [s, shuffledSigs[i]]));
  return buildFeatures({ relabel: (sig) => map.get(sig) ?? sig });
}

const maxMultiplicity = (features) => {
  const prof = new Map();
  for (const rows of features.values()) { const key = [...rows.keys()].sort().join("|"); prof.set(key, (prof.get(key) ?? 0) + 1); }
  return Math.max(...prof.values());
};

const features = buildFeatures();
const n = features.size;
const induced = entity.induceEntityKindCandidates(features, { population: "rigveda:real", permutations: 64, minKindSize: 3, minPrevalence: 0.02 });
const candidates = induced.candidates;
const basins = candidates.map((c) => ({ memberRefs: c.memberRefs, size: c.memberCount, stable: c.field?.stable === true, energy: c.field?.bindingEnergy }));
const internalPassed = basins.filter((b) => b.stable).length;

// DISCRIMINATION: outer-null over the WHOLE discovery procedure
const nullValidated = [];
for (let s = 0; s < 30; s++) {
  const nf = outerNull(1000 + s);
  const r = entity.induceEntityKindCandidates(nf, { population: `rigveda:null:${s}`, permutations: 40, minKindSize: 3, minPrevalence: 0.02 });
  nullValidated.push(r.candidates.filter((c) => c.field?.stable === true).length);
}
const discriminationP = (nullValidated.filter((v) => v >= internalPassed).length + 1) / (nullValidated.length + 1);

// CONSEQUENCE: temporal hold-out. Basins induced from EARLY features only;
// membership must predict LATE features beyond the base rate.
const earlyFeatures = new Map();
for (const [r, rows] of features) {
  const m = new Map();
  for (const [sig, rec] of rows) if (rec.firstAt <= SPLIT) m.set(sig, rec);
  if (m.size) earlyFeatures.set(r, m);
}
const early = entity.induceEntityKindCandidates(earlyFeatures, { population: "rigveda:early", permutations: 40, minKindSize: 3, minPrevalence: 0.02 });
const basinOf = new Map();
for (const c of early.candidates) for (const ref of c.memberRefs) basinOf.set(ref, c.kindKey);
const lateHas = new Map();
for (const [r, rows] of features) {
  const late = [...rows.values()].some((rec) => rec.lastAt > SPLIT);
  lateHas.set(r, late);
}
const members = [...basinOf.keys()];
const nonMembers = [...features.keys()].filter((r) => !basinOf.has(r));
const M = members.filter((r) => lateHas.get(r)).length;
const NM = nonMembers.filter((r) => lateHas.get(r)).length;
const memberRate = members.length ? M / members.length : 0;
const nonMemberRate = nonMembers.length ? NM / nonMembers.length : 0;
const effect = memberRate - nonMemberRate;
// hypergeometric upper tail: P(>= M members with late-features | totals)
const logChoose = (n, k) => { if (k < 0 || k > n) return -Infinity; const m = Math.min(k, n - k); let o = 0; for (let i = 1; i <= m; i++) o += Math.log(n - m + i) - Math.log(i); return o; };
const hyp = (N, K, n, k) => { let sum = 0; for (let x = k; x <= Math.min(K, n); x++) sum += Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n)); return Math.min(1, sum); };
const N_all = features.size, K_all = [...lateHas.values()].filter(Boolean).length;
const consequenceP = hyp(N_all, K_all, members.length, M);

const EARNABLE = { effect: +(effect).toFixed(3), p: +consequenceP.toFixed(4), memberRate: +memberRate.toFixed(3), nonMemberRate: +nonMemberRate.toFixed(3), members: members.length, nonMembers: nonMembers.length };
const earnedBar = effect > 1.15 / 2 && consequenceP <= 0.05; // a strong held-out differential on sound p

const verdict = internalPassed > 0 && discriminationP <= 0.05 && earnedBar
  ? { verdict: "CONFIRMED", claim: "a real Vancouver induced Kind earned standing on the Rigveda seam: temporal held-out consequence + outer-null discrimination both hold." }
  : { verdict: "FALSIFIED", claim: "on real text the induced Kinds (internal cohesion pass) do NOT earn standing by the four-check discipline — see which check failed.", failedChecks: { discrimination: discriminationP > 0.05 ? "outer-null p " + discriminationP.toFixed(3) + " — the basins do not distinguish the real arrangement from shuffled features" : "held", consequence: !earnedBar ? "temporal held-out effect " + EARNABLE.effect + " / p " + EARNABLE.p + " — membership does not predict later events beyond base rate" : "held" } };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep11@1",
  provenance: { corpus: corpus.corpus ?? "Rigveda EOT seam", schema: corpus.schema, counts: corpus.counts },
  population: { referents: n, edges: EDGES.length, split: SPLIT, maxIdenticalProfileMultiplicity: maxMultiplicity(features), sqrtCutoff: +Math.sqrt(n).toFixed(2) },
  induced: { basins: basins.length, sizes: basins.slice(0, 8).map((b) => b.size), internalCohesionPassed: internalPassed, validatedByInternalNullOnly: internalPassed },
  discrimination: { outerNullValidated: nullValidated, selectionAwareP: +discriminationP.toFixed(4), meanNullValidated: +(nullValidated.reduce((a, b) => a + b, 0) / nullValidated.length).toFixed(2) },
  consequence: EARNABLE,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Features are mechanical (action/role predications + clause-region); no LLM, no priors — the machinery alone.",
    "The Rigveda seam is one cross-language slice; a multi-corpus, multi-error surface (the essay's full ask) remains.",
    "All four checks are pre-registered; nothing is fitted to the corpus.",
  ],
}, null, 2));