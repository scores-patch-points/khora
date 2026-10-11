// rigveda-network-step17.mjs — STEP 17: the SHIPPED Network organ on the real
// temporal frontier. Step 16b showed degree/co-participation (and membership)
// do NOT predict future participation. One reading was never tried: the
// engine's own NETWORK topology — relationNetworkComponents (cycle rank,
// connected motifs) over the real predication edges. If cyclic/structured
// components predict the future when degree could not, the Network terrain
// earns where co-occurrence failed; if not, the null is closed even against
// the shipped Network organ.
//
// Temporal frontier: train edges at <= 0.6*maxAt; outcome = participation in
// clauses beyond. Readings:
//   networkCycle   referent inside a frontier component with cycleRank >= 1
//                  (a feedback/motif structure)
//   networkLarge   referent in a frontier component of >= 3 referents
//   kindMembership company-model basins over frontier clauses
// Bars: effect >= 0.15, shuffle-p <= 0.05, strictly best.
//
// Usage: node rigveda-network-step17.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);
const terrain = await import(pathToFileURL(path.join(native, "kernel/terrain-math.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);

const particip = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const c = e.at ?? 0; if (e.subject) particip.get(e.subject)?.add(c); if (e.object) particip.get(e.object)?.add(c); }
const inFuture = (s) => [...(particip.get(s) ?? [])].some((c) => c > FRONT);

// frontier component structure over the REAL predication edges
const frontEdges = corpus.edges.filter((e) => (e.at ?? 0) <= FRONT);
const referentsByEdge = new Map();
for (const e of frontEdges) {
  const rs = new Set([e.subject, e.object].filter(Boolean));
  referentsByEdge.set(e.id ?? `e:${e.at}:${e.action}`, rs);
}
const components = terrain.relationNetworkComponents(frontEdges.map((e) => ({
  schema: "EOHyperedge@1", id: e.id ?? `e:${e.at}:${e.action}`, relation: e.action,
  participants: [{ ref: e.subject ?? e.object, standing: "referent" }, ...(e.subject && e.object ? [{ ref: e.object, standing: "referent" }] : [])],
})), referentsByEdge);

const inCyclic = new Set();
const inLarge = new Set();
for (const c of components) {
  if ((c.cycleRank ?? 0) >= 1) for (const r of c.referentRefs ?? []) inCyclic.add(r);
  if ((c.referentCount ?? 0) >= 3) for (const r of c.referentRefs ?? []) inLarge.add(r);
}

// Kind contrast: company-model basins over frontier clauses
const clauseRefs = new Map();
for (const e of frontEdges) { const c = e.at ?? 0; if (!clauseRefs.has(c)) clauseRefs.set(c, new Set()); if (e.subject) clauseRefs.get(c).add(e.subject); if (e.object) clauseRefs.get(c).add(e.object); }
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
    const perm = shuffled(roles, createSeededRng(62000 + k));
    const pos = [], neg = [];
    for (let i = 0; i < perm.length; i++) (perm[i] === 1 ? pos : neg).push(ys[i]);
    const posR = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null;
    const negR = neg.length ? neg.reduce((a, b) => a + b, 0) / neg.length : null;
    effs.push((posR == null || negR == null) ? 0 : posR - negR);
  }
  return { p: (effs.filter((e) => e >= observed).length + 1) / (effs.length + 1) };
};

const reads = {
  networkCycle: { ...test((s) => inCyclic.has(s)), shuffleP: shuffleP((s) => inCyclic.has(s)).p },
  networkLargeComponent: { ...test((s) => inLarge.has(s)), shuffleP: shuffleP((s) => inLarge.has(s)).p },
  kindMembership: { ...test((s) => basinSet.has(s)), shuffleP: shuffleP((s) => basinSet.has(s)).p },
};
const earns = (r) => (r.effect ?? -Infinity) >= 0.15 && r.shuffleP <= 0.05;
const winners = Object.entries(reads).filter(([, v]) => earns(v));
const best = winners.length ? winners.sort((a, b) => b[1].effect - a[1].effect)[0][0] : null;

const verdict = best
  ? { verdict: "CONFIRMED", claim: `the SHIPPED Network organ earns on the real frontier: ${best} (effect ${reads[best].effect.toFixed(3)}, shuffle-p ${reads[best].shuffleP.toFixed(3)}) — topology/motifs predict where degree could not.` }
  : { verdict: "FALSIFIED", claim: `even the shipped Network organ reads null on the temporal frontier: ${JSON.stringify(Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { eff: +(v.effect ?? 0).toFixed(3), sp: +(v.shuffleP ?? 0).toFixed(3) }])))} — the null is closed against co-occurrence, degree, membership, AND topology.` };

console.log(JSON.stringify({
  schema: "EORigvedaNetworkStep17@1",
  material: { referents: refs.length, frontEdges: frontEdges.length, components: components.length, cyclicComponents: components.filter((c) => c.cycleRank >= 1).length },
  reads: Object.fromEntries(Object.entries(reads).map(([k, v]) => [k, { effect: v.effect == null ? null : +v.effect.toFixed(3), posRate: +(v.posRate ?? 0).toFixed(3), negRate: +(v.negRate ?? 0).toFixed(3), posN: v.posN, negN: v.negN, base: +v.base.toFixed(3), shuffleP: +v.shuffleP.toFixed(4) }])),
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Uses the shipped terrain-math.relationNetworkComponents on the real predication edges (bipartite hypergraph over referents), frontier-claused.",
    "Identical temporal-frontier instrument and bars to steps 16/16b; the reading kernel is the only thing changed.",
  ],
}, null, 2));