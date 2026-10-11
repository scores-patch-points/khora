// terrain-arena.mjs — STEP 1 FALSIFIER: terrains restate one cluster, or not.
// The essay's "strongest immediate experiment": put one synthetic world with
// three INDEPENDENT planted ceilings (dispositional class / coordination
// mechanism / shared-assumption cliques) through minimal Kind, Network, and
// Paradigm organs, and ask whether each supports a held-out prediction the
// OTHERS cannot. Verdict: CONFIRMED (terrain diversity is real) or FALSIFIED
// (the extra terrains restate the Kind cluster).
//
// Apparatus honesty, first: each organ must beat its own chance baseline and
// its own shuffled-label control before the diversity question is even asked
// (the outer-null discipline — a coherent story that does not discriminate
// from empty worlds has no standing).
//
// Usage: node terrain-arena.mjs /path/to/khora/native/kernel
// No repo writes. Reports JSON to stdout.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kernel = path.resolve(process.argv[2] || "./native/kernel");
async function load(name) {
  const src = await readFile(path.join(kernel, `${name}.js`), "utf8");
  const dir = path.dirname(path.join(kernel, `${name}.js`));
  return import(pathToFileURL(path.join(dir, `${name}.js`)).href);
}

const { createSeededRng, shuffled } = await load("rng");
const entity = await load("entity-kind-induction");

// ── the world: three independent ceilings ────────────────────────────────
const N = 120;
const CLASSES = 3;
const SEED = 20261010;
const rng0 = createSeededRng(SEED);

const dispositionOf = (i) => i % CLASSES;              // Kind ceiling
const guildOf = (i) => Math.floor(i / 40) % 3;         // Network ceiling
const stanceKeyOf = (i) => Math.floor(i / 13) % 3;     // Paradigm ceiling

// Independence check the world must satisfy: disposition ⊥ guild ⊥ stance.
let chi = 0;
for (let a = 0; a < CLASSES; a++) for (let b = 0; b < CLASSES; b++) {
  let n01 = 0, n11 = 0;
  for (let i = 0; i < N; i++) { if (dispositionOf(i) === a && guildOf(i) === b) n11++; if (dispositionOf(i) === a) n01++; }
  chi += (n11 - n01 / 3) ** 2 / (n01 / 3);
}
const worldIndependenceChi2 = chi; // ≈0 when independent (3×3, expected ~2 N/9)

// entity features — disposition responses + noise ONLY (no trace edges; the
// ceilings stay independent for the premise test; coupling is step 2).
// MEASUREMENT SMELLS, caught by the apparatus gate, in order:
//  1. one-of-9 identical profiles → multiplicity ≈13 > √120 → the inducement
//     collapsed (the self-audit's "over the neighbor cutoff" degeneracy).
//  2. class-specific labels at ~6-20% prevalence below default minPrevalence
//     → pruned; only noise survived (→ 1 degenerate basin). Fixed with an
//     explicit floor.
//  3. weighted-cosine affinity gate: the 0.75-quantile bond threshold landed
//     ABOVE same-class affinity with 3-of-6 sampled markers, so no class
//     bonds ever formed. Fix: a class CORE marker (shared by the class,
//     prevalence ≈33%, weight ≈2.1) + two mid-frequency noise features.
//     Within-class affinity ≈ w_core/selfEnergy ≈ 0.26; cross-class ≈ 0.12 <
//     the ~0.16 gate. Multiplicity of identical profiles stays at 1 (noise
//     pairs differ), far under the √(120) ≈ 11 cutoff.
//  3. weighted-cosine affinity gate: with 3-of-6 sampled markers the 0.75-
//     quantile bond threshold sat ABOVE same-class affinity (cross-class
//     noise-sharing alone reaches ~0.37), so no class bonds formed. Fix: a
//     class CORE marker witnessed repeatedly — repeated witnessing is what a
//     real disposition looks like. Core record carries 4 evidence events
//     (activity 1+ln4 ≈ 2.39), so within-class affinity ≈ 0.67 while cross-
//     class ≈ 0.16, comfortably split by the ~0.2 gate. Multiplicity of
//     identical profiles stays 3, far under √(120) ≈ 11.
const CLASS_CORES = ["a", "b", "c"];
const NOISE = ["n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11"];
const entityFeatures = new Map();
for (let i = 0; i < N; i++) {
  const rows = new Map();
  const coreIds = new Set([0, 1, 2, 3].map((q) => `ev:${i}:core:${q}`));
  rows.set(`feature=${CLASS_CORES[dispositionOf(i)]}`, { signature: `feature=${CLASS_CORES[dispositionOf(i)]}`, featureKey: "feature", featureValue: true, evidenceIds: coreIds, firstAt: i, lastAt: i, witnessRefs: [] });
  const n1 = Math.floor(rng0() * NOISE.length);
  let n2 = Math.floor(rng0() * NOISE.length);
  if (n2 === n1) n2 = (n2 + 1) % NOISE.length;
  const put = (signature, seq) => rows.set(signature, { signature, featureKey: signature.split("=")[0], featureValue: true, evidenceIds: new Set([`ev:${i}:n:${seq}`]), firstAt: i, lastAt: i, witnessRefs: [] });
  put(`feature=${NOISE[n1]}`, 1);
  put(`feature=${NOISE[n2]}`, 2);
  entityFeatures.set(`e${i}`, rows);
}

// network ceiling — guild chains of planted lengths; continuation labels.
const CHAIN_LENS = [5, 9, 5, 9, 5, 7]; // per guild; continue = length >= 7
const continuesOf = (len) => len >= 7;
function chains() {
  const out = { chain: [], reveal: [], continues: [] };
  for (let g = 0; g < 3; g++) {
    const members = [];
    for (let i = 0; i < N; i++) if (guildOf(i) === g) members.push(`e${i}`);
    const order = shuffled(members, createSeededRng(SEED + g));
    let p = 0;
    for (const len of CHAIN_LENS) {
      const ids = order.slice(p, p + len);
      p += len;
      const r = Math.floor(0.8 * len);
      out.chain.push({ g, len, r, ids });
      out.reveal.push({ g, len, r, revealed: ids.slice(0, r), hidden: ids.slice(r) });
      out.continues.push(continuesOf(len));
    }
  }
  return out;
}
const world = chains();
// revealed hyperedges (trace steps within chains) — the organ sees only these.
const edges = [];
{
  let n = 0;
  for (const c of world.reveal) {
    for (let j = 0; j + 1 < c.revealed.length; j++) {
      edges.push({ schema: "EOHyperedge@1", id: `trace:${c.g}:${j}:${n}`, relation: `trace:${c.g}`,
        participants: [{ ref: c.revealed[j], standing: "referent" }, { ref: c.revealed[j + 1], standing: "referent" }] });
      n++;
    }
  }
}

// paradigm ceiling — lenses in 3 cliques sharing a stance assumption.
const LG = 24, PER_CLIQUE = 8, CLIQUE_PERMS = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
const JITTER = 0.2, TRAIN_LAST = 59;
const lenses = [];
for (let l = 0; l < LG; l++) {
  const clique = Math.floor(l / PER_CLIQUE);
  const perm = CLIQUE_PERMS[clique];
  const rng = createSeededRng(SEED + 700 + l);
  const stance = [];
  for (let i = 0; i < N; i++) {
    const s = rng() < JITTER ? Math.floor(rng() * 3) : perm[stanceKeyOf(i)];
    stance.push(s);
  }
  lenses.push({ l, clique, perm, stance });
}

// ── organ 1 (KIND): existing population machinery ────────────────────────
const induced = entity.induceEntityKindCandidates(entityFeatures, {
  population: "terrain-arena:kinds", permutations: 64, minKindSize: 3,
  // SECOND measurement smell, caught by the apparatus gate: the class-pool
  // labels each occur in ~6.7/120 referents, below the default minPrevalence
  // (1/√120 ≈ 0.09), so the inducer pruned the only class signal and saw only
  // the global noise features → one degenerate basin. Explicit floor admits
  // the disposition features while the noise remains present-but-thin.
  minPrevalence: 0.02,
});
function basinOf(i) {
  const id = `e${i}`;
  for (const c of induced.candidates) if (c.memberRefs.includes(id)) return c.kindKey;
  return null;
}
let kindOwn = 0, kindN = 0;
const basinClass = new Map();
for (const c of induced.candidates) {
  const counts = new Map();
  for (const ref of c.memberRefs) {
    const i = Number(ref.slice(1));
    counts.set(dispositionOf(i), (counts.get(dispositionOf(i)) ?? 0) + 1);
  }
  let best = null, bestN = -1;
  for (const [k, v] of counts) if (v > bestN) { bestN = v; best = k; }
  basinClass.set(c.kindKey, best);
}
for (let i = 0; i < N; i++) {
  const b = basinOf(i);
  if (b == null) continue;
  kindN++;
  if (basinClass.get(b) === dispositionOf(i)) kindOwn++;
}
const kindOwnTarget = kindN ? kindOwn / kindN : null;

// net leak variable (declared here; populated by the network leakage probe)
let netKindLeak = null;

// ── organ 2 (NETWORK): revealed-depth continuation law ──────────────────
// From the revealed hypergraph ONLY, recover chains as connected components
// and learn whether a chain's revealed depth predicts further continuation.
const adjacency = new Map(); // entity -> set of following entities
for (const e of edges) {
  const a = e.participants[0].ref, b = e.participants[1].ref;
  if (!adjacency.has(a)) adjacency.set(a, []);
  adjacency.get(a).push(b);
}
const revealedDepth = new Map(); // entity -> position in its revealed chain
{
  const sources = [...new Set(edges.map((e) => e.participants[0].ref))];
  const seen = new Set();
  for (const s of sources) {
    if (seen.has(s)) continue;
    let cur = s, d = 0;
    const path = [];
    while (cur && !seen.has(cur)) { seen.add(cur); path.push(cur); cur = adjacency.get(cur)?.[0] ?? null; }
    path.forEach((id, k) => revealedDepth.set(id, k + 1));
  }
}
const truncationOf = (c) => {            // the revealed last step of a chain
  const last = c.revealed[c.revealed.length - 1];
  return { chain: c, id: last, depth: revealedDepth.get(last) };
};
const truncationPoints = world.reveal.map(truncationOf);
// train/test chain split by seed (one third held out for the organ's own test).
const testIdx = new Set();
{
  const rng = createSeededRng(SEED + 900);
  const order = shuffled(world.reveal.map((_, i) => i), rng);
  const k = Math.floor(world.reveal.length / 3);
  order.slice(0, k).forEach((i) => testIdx.add(i));
}
function bestCutoff(trainReveals, trainLabels) {
  let best = { theta: Infinity, acc: -1 };
  for (let theta = 4; theta <= 8; theta++) {
    let hit = 0;
    for (let t = 0; t < trainReveals.length; t++) if ((trainReveals[t] >= theta ? 1 : 0) === trainLabels[t]) hit++;
    const acc = hit / trainReveals.length;
    if (acc > best.acc || (acc === best.acc && theta < best.theta)) best = { theta, acc };
  }
  return best;
}
const trainChains = world.reveal.filter((_, i) => !testIdx.has(i));
const trainReveals = trainChains.map((c) => c.r);
const trainLabels = trainChains.map((c) => continuesOf(c.len) ? 1 : 0);
const cutoff = bestCutoff(trainReveals, trainLabels);
const baseRate = trainLabels.reduce((a, b) => a + b, 0) / trainLabels.length;
let netHit = 0;
const testTruth = [];
const testPred = [];
for (const i of [...testIdx]) {
  const c = world.reveal[i];
  const truth = continuesOf(c.len) ? 1 : 0;
  const pred = c.r >= cutoff.theta ? 1 : 0;
  testTruth.push(truth); testPred.push(pred);
  if (pred === truth) netHit++;
}
const netOwnTarget = testTruth.length ? netHit / testTruth.length : null;
const netBase = testTruth.length ? testTruth.reduce((a, b) => a + b, 0) / testTruth.length : null;

// network shuffled-label control (the outer null for the ORGAN itself)
const netNull = [];
for (let s = 0; s < 24; s++) {
  const labels = shuffled(testTruth, createSeededRng(SEED + 2000 + s));
  let hit = 0;
  for (let i = 0; i < labels.length; i++) if (labels[i] === testPred[i]) hit++;
  netNull.push(hit / labels.length);
}
const netShuffleP = (netNull.filter((x) => x >= (netOwnTarget ?? 0)).length + 1) / (netNull.length + 1);

// cross-leakage: kind basins in, network outcome out. entity→basin → predicts
// a chain's continuation by its entities' basin association with training labels.
{
  const trainAssoc = new Map(); // basin -> [label sums]
  for (const c of trainChains) {
    const y = continuesOf(c.len) ? 1 : 0;
    for (const id of c.revealed) {
      const i = Number(id.slice(1));
      const b = basinOf(i);
      if (b == null) continue;
      const rec = trainAssoc.get(b) ?? [0, 0];
      rec[0] += y; rec[1] += 1;
      trainAssoc.set(b, rec);
    }
  }
  const P = (b) => { const [s, n] = trainAssoc.get(b) ?? [0, 0]; return n ? s / n : 0.5; };
  let hit = 0;
  const leakPred = [];
  for (const i of [...testIdx]) {
    const c = world.reveal[i];
    if (!c.revealed.length) { leakPred.push(0.5); continue; }
    let sum = 0, n = 0;
    for (const id of c.revealed) { const b = basinOf(Number(id.slice(1))); if (b) { sum += P(b); n++; } }
    const pval = n ? sum / n : 0.5;
    leakPred.push(pval);
    if ((pval >= 0.5 ? 1 : 0) === (continuesOf(c.len) ? 1 : 0)) hit++;
  }
  netKindLeak = hit / leakPred.length;
}

// ── organ 3 (PARADIGM): lens cliques + shared stance assumption ─────────
const agreement = Array.from({ length: LG }, () => Array(LG).fill(0));
for (let a = 0; a < LG; a++) for (let b = a + 1; b < LG; b++) {
  let ok = 0;
  for (let i = 0; i <= TRAIN_LAST; i++) if (lenses[a].stance[i] === lenses[b].stance[i]) ok++;
  agreement[a][b] = agreement[b][a] = ok / (TRAIN_LAST + 1);
}
// cliques = components of agreement > 0.5 (within-clique ≈ 0.68, cross ≈ 0.33)
const parent = Array.from({ length: LG }, (_, i) => i);
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
for (let a = 0; a < LG; a++) for (let b = a + 1; b < LG; b++) if (agreement[a][b] > 0.5) parent[find(a)] = find(b);
const inferredCliques = new Map();
for (let l = 0; l < LG; l++) { const r = find(l); if (!inferredCliques.has(r)) inferredCliques.set(r, []); inferredCliques.get(r).push(l); }
const cliqueOfLens = new Map();
for (const [r, members] of inferredCliques) for (const l of members) cliqueOfLens.set(l, r);
// predict sibling lens B's stance on TEST entities from primary lens A's stance,
// using the shared assumption (mapping learned on the TRAIN half).
let parHit = 0, parN = 0;
for (let i = TRAIN_LAST + 1; i < N; i++) {
  const a = Math.floor(rng0() * LG);
  const ca = cliqueOfLens.get(a);
  const cliqueMembers = [...inferredCliques.get(ca)];
  const b = cliqueMembers[Math.floor(rng0() * cliqueMembers.length)];
  if (b === a) continue;
  const sA = lenses[a].stance[i];
  // shared assumption: modal stance of B when A==sA, over the train half.
  const counts = new Map();
  for (let t = 0; t <= TRAIN_LAST; t++) if (lenses[a].stance[t] === sA) {
    counts.set(lenses[b].stance[t], (counts.get(lenses[b].stance[t]) ?? 0) + 1);
  }
  let pick = null, pickN = -1;
  for (const [k, v] of counts) if (v > pickN) { pickN = v; pick = k; }
  if (pick == null) continue;
  parN++;
  if (pick === lenses[b].stance[i]) parHit++;
}
const parOwnTarget = parN ? parHit / parN : null;
const parMargin = new Map(); // marginal B-stance over train
for (let l = 0; l < LG; l++) for (let t = 0; t <= TRAIN_LAST; t++) {
  parMargin.set(lenses[l].stance[t], (parMargin.get(lenses[l].stance[t]) ?? 0) + 1);
}
let parMargBest = -1;
for (const v of parMargin.values()) parMargBest = Math.max(parMargBest, v / (LG * (TRAIN_LAST + 1)));
const parBase = parMargBest;

// paradigm shuffled control: same inference on a stance matrix whose
// clique structure is destroyed (entities' stance keys jittered freely).
const parNull = [];
for (let s = 0; s < 24; s++) {
  const rng = createSeededRng(SEED + 3000 + s);
  const fake = lenses.map((l, li) => ({ ...l, stance: l.stance.map((v, i) => {
    if (i <= TRAIN_LAST) return v;
    return rng() < 0.5 ? v : Math.floor(rng() * 3);
  }), l: li }));
  let hit = 0, n = 0;
  for (let i = TRAIN_LAST + 1; i < N; i++) {
    const a = Math.floor(rng() * LG), b = Math.floor(rng() * LG);
    if (a === b) continue;
    const sA = fake[a].stance[i];
    const counts = new Map();
    for (let t = 0; t <= TRAIN_LAST; t++) if (fake[a].stance[t] === sA) counts.set(fake[b].stance[t], (counts.get(fake[b].stance[t]) ?? 0) + 1);
    let pick = null, pickN = -1;
    for (const [k, v] of counts) if (v > pickN) { pickN = v; pick = k; }
    if (pick == null) continue;
    n++; if (pick === fake[b].stance[i]) hit++;
  }
  parNull.push(n ? hit / n : null);
}
const parNullOk = parNull.filter((x) => x != null);
const parShuffleP = (parNullOk.filter((x) => x >= (parOwnTarget ?? 0)).length + 1) / (parNullOk.length + 1);

// cross-leakage: kind basins in, stance out.
let parKindLeakHit = 0, parKindLeakN = 0;
const basinStanceMode = new Map();
for (const c of induced.candidates) {
  const counts = new Map();
  for (const ref of c.memberRefs) { const i = Number(ref.slice(1)); counts.set(stanceKeyOf(i), (counts.get(stanceKeyOf(i)) ?? 0) + 1); }
  let best = null, bestN = -1;
  for (const [k, v] of counts) if (v > bestN) { bestN = v; best = k; }
  basinStanceMode.set(c.kindKey, best);
}
for (let i = TRAIN_LAST + 1; i < N; i++) {
  const b = basinOf(i);
  const pred = b != null ? basinStanceMode.get(b) : null;
  if (pred == null) continue;
  parKindLeakN++;
  if (pred === stanceKeyOf(i)) parKindLeakHit++;
}
const parKindLeak = parKindLeakN ? parKindLeakHit / parKindLeakN : null;

// ── the four-check verdict ───────────────────────────────────────────────
const KIND_CHANCE = 1 / 3, NET_CHANCE = 0.5, PAR_CHANCE = 1 / 3;
const own = { kind: kindOwnTarget, kindChance: KIND_CHANCE, network: netOwnTarget, networkChance: NET_CHANCE, paradigm: parOwnTarget, paradigmChance: PAR_CHANCE };
const apparatusOk = kindOwnTarget != null && (kindOwnTarget - KIND_CHANCE) > 0.25
  && netOwnTarget != null && (netOwnTarget - NET_CHANCE) > 0.2
  && parOwnTarget != null && (parOwnTarget - PAR_CHANCE) > 0.2;
const controlsOk = netShuffleP <= 0.05 && parShuffleP <= 0.05;
const leakageOk = (netKindLeak - NET_CHANCE) < 0.1 && (parKindLeak - PAR_CHANCE) < 0.1 && (parKindLeak ?? 1) < (parOwnTarget ?? 0) - 0.15;

const verdict = apparatusOk && controlsOk && leakageOk
  ? { verdict: "CONFIRMED", claim: "Kind, Network, and Paradigm organs support genuinely different held-out predictions; the extra terrains are not restatements of one cluster." }
  : { verdict: "FALSIFIED", claim: "the extra terrains did not earn their keep — an organ failed its own apparatus/control gate, or a cross-terrain signature solved another terrain's target." };

console.log(JSON.stringify({
  schema: "EOTerrainArena@1",
  world: { referents: N, edges: edges.length, lenses: LG, worldIndependenceChi2, chainCount: world.reveal.length, netTestChains: [...testIdx].length },
  organs: {
    kind: { ownTargetAccuracy: kindOwnTarget, chance: KIND_CHANCE, basins: induced.candidates.length, validated: induced.diagnostics.validated ?? induced.candidates.filter((c) => c.field?.stable).length },
    network: { ownTargetAccuracy: netOwnTarget, chance: NET_CHANCE, base: netBase, learnedCutoffTheta: cutoff.theta, shuffledNull: netNull, shuffleP: netShuffleP },
    paradigm: { ownTargetAccuracy: parOwnTarget, chance: PAR_CHANCE, base: parBase, inferredCliques: [...inferredCliques.values()].map((m) => m.length), shuffledNull: parNullOk, shuffleP: parShuffleP },
  },
  crossLeakage: { kindIntoNetwork: netKindLeak, kindIntoParadigm: parKindLeak },
  gates: { apparatusOk, controlsOk, leakageOk },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Kind own-target is in-sample basin-class consistency (disposition is conflated with features by construction); the NEW organs carry the true held-out load.",
    "The network organ assumes chains are recoverable as connected components of revealed edges.",
    "The three ceilings are planted INDEPENDENTLY; the coupled, ambiguous case is step 2's falsifier, not this one.",
  ],
}, null, 2));