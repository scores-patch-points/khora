// rigveda-frontier-step16b.mjs — STEP 16B: does the Rigveda earning survive
// the STRICTER temporal-frontier instrument? Step 14 earned multi-occasion
// participation (+0.35, shuffle-p 0.002) on the RANDOM in-distribution holdout;
// step 16 FALSIFIED the same reading on the Odyssey's temporal frontier. This
// is the controlled comparison: same Rigveda material, same readings, but a
// TEMPORAL front (clauses at <= 0.6*maxAt = train) predicting participation in
// the future clauses (at > 0.6*maxAt). If multi-occasion earns here, the
// persistence account holds (ritual corpus earns, narrative finale does not);
// if null, then the step-14 finding was an instrument artifact and it
// collapses under the stricter design.
//
// Usage: node rigveda-frontier-step16b.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);

const particip = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) {
  const cid = e.at ?? 0;
  if (e.subject) particip.get(e.subject)?.add(cid);
  if (e.object) particip.get(e.object)?.add(cid);
}
const inFront = (s) => [...(particip.get(s) ?? [])].some((c) => c <= FRONT);
const inFuture = (s) => [...(particip.get(s) ?? [])].some((c) => c > FRONT);

const frontDeg = new Map(refs.map((s) => [s, [...(particip.get(s) ?? [])].filter((c) => c <= FRONT).length]));
const multi = (s) => (frontDeg.get(s) ?? 0) >= 2;
const active = (s) => (frontDeg.get(s) ?? 0) >= 1;

// company-model Kind basins over FRONTIER clauses only
const atFront = (e) => (e.at ?? 0) <= FRONT;
const clauseRefs = new Map();
for (const e of corpus.edges) if (atFront(e)) {
  const cid = e.at ?? 0;
  if (!clauseRefs.has(cid)) clauseRefs.set(cid, new Set());
  if (e.subject) clauseRefs.get(cid).add(e.subject);
  if (e.object) clauseRefs.get(cid).add(e.object);
}
const coFeat = new Map();
for (const set of clauseRefs.values()) { const a = [...set]; for (const x of a) { if (!coFeat.has(x)) coFeat.set(x, new Map()); const m = coFeat.get(x); for (const y of a) if (y !== x) m.set(`co:${y}`, (m.get(`co:${y}`) ?? 0) + 1); } }
const ent = new Map();
for (const [r, m] of coFeat) { const mm = new Map(); for (const [s, c] of m) mm.set(s, { signature: s, featureKey: "co", featureValue: s.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(c, 12) }, (_, i) => `${r}:${s}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] }); ent.set(r, mm); }
const kindInd = entity.induceEntityKindCandidates(ent, { population: "rigveda:frontier-kind", permutations: 40, minKindSize: 3, minPrevalence: 0 });
const basinSet = new Set(); for (const c of kindInd.candidates) for (const r of c.memberRefs) basinSet.add(r);

const test = (pred) => {
  const pairs = refs.map((s) => [(pred(s) ? 1 : 0), inFuture(s) ? 1 : 0]);
  const pos = pairs.filter(([p]) => p === 1), neg = pairs.filter(([p]) => p === 0);
  const posRate = pos.length ? pos.filter(([, l]) => l === 1).length / pos.length : null;
  const negRate = neg.length ? neg.filter(([, l]) => l === 1).length / neg.length : null;
  return { posN: pos.length, negN: neg.length, posRate, negRate, effect: posRate == null || negRate == null ? null : posRate - negRate, base: refs.filter((s) => inFuture(s)).length / refs.length };
};
const shuffleP = (rolesOf) => {
  const roles = refs.map((s) => (rolesOf(s) ? 1 : 0));
  const ys = refs.map((s) => (inFuture(s) ? 1 : 0));
  const observed = test(rolesOf).effect ?? 0;
  const effs = [];
  for (let k = 0; k < 500; k++) {
    const perm = shuffled(roles, createSeededRng(61000 + k));
    const pos = [], neg = [];
    for (let i = 0; i < perm.length; i++) (perm[i] === 1 ? pos : neg).push(ys[i]);
    const posR = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;
    const negR = neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : null;
    effs.push((posR == null || negR == null) ? 0 : posR - negR);
  }
  return { p: (effs.filter((e) => e >= observed).length + 1) / (effs.length + 1) };
};

const reads = {
  networkMulti: { ...test(multi), shuffleP: shuffleP(multi).p },
  networkActive: { ...test(active), shuffleP: shuffleP(active).p },
  kindMembership: { ...test((s) => basinSet.has(s)), shuffleP: shuffleP((s) => basinSet.has(s)).p },
};
const earns = (r) => (r.effect ?? -Infinity) >= 0.15 && r.shuffleP <= 0.05;
const winners = Object.entries(reads).filter(([, v]) => earns(v));
const best = winners.length ? winners.sort((a, b) => b[1].effect - a[1].effect)[0][0] : null;

const verdict = best
  ? { verdict: "CONFIRMED", claim: `the Rigveda multi-occasion reading SURVIVES the temporal frontier: ${best} earns (effect ${reads[best].effect.toFixed(3)}, shuffle-p ${reads[best].shuffleP.toFixed(3)}) — the persistence account holds (ritual corpus earns, narrative finale does not).` }
  : { verdict: "FALSIFIED", claim: `the Rigveda earning does NOT survive the temporal frontier: ${JSON.stringify(Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { eff: +(v.effect ?? 0).toFixed(3), sp: +(v.shuffleP ?? 0).toFixed(3) }])))} — step-14's result was instrument-dependent and collapses under the stricter design.` };

console.log(JSON.stringify({
  schema: "EORigvedaFrontierStep16b@1",
  material: { referents: refs.length, edges: corpus.edges.length, maxAt: MAXAT, frontier: FRONT },
  reads: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { effect: v.effect == null ? null : +v.effect.toFixed(3), posRate: +(v.posRate ?? 0).toFixed(3), negRate: +(v.negRate ?? 0).toFixed(3), posN: v.posN, negN: v.negN, base: +v.base.toFixed(3), shuffleP: +v.shuffleP.toFixed(4) }])),
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Temporal frontier: train clauses at <= 0.6*maxAt; future = participation in clauses beyond; reading assignment shuffled (500), test outcome fixed.",
    "Identical readings and bars to step 14 (random holdout) and step 16 (Odyssey frontier), so the instrument is the only thing changed.",
  ],
}, null, 2));