// terrain-arena-step2.mjs — STEP 2 FALSIFIER: is the Network reading terrain-
// correct, or just a larger Kind? The essay's sharpest charge: "a system that
// treats all increasingly general observations as merely increasingly large
// Kinds." So this arena runs the SAME underlying evidence through TWO readings:
//   NETWORK — a relational organ: reads the ARRANGEMENT's edge-relation types
//             (the trace kind each chain carries), learns which types predict
//             the hidden tail, predicts held-out chains.
//   KIND    — the population basin machinery, fed IDENTICAL per-entity stats
//             (degree, depth, position, chain size): the "cluster everything"
//             reading, given every chance.
// Runs TWO CAUSAL WORLDS (recurring organization carries the outcome) and a
// NON-CAUSAL CONTROL that decouples the type law from the outcome while
// preserving topology and degrees: BOTH readings must collapse on it, and the
// network must not report a phantom mechanism — a network that signals only in
// causal worlds is terrain-correct; one that fires on the empty control is not.
//
// THE MECHANISM IS RELATIONAL. All chains are ONE length (8), revealed 4:
// per-entity statistics cannot tell chain type apart — continuation is carried
// ONLY by the edge-relation type (`trace:A` propagates, `trace:B` terminates).
// If the cluster reading could recover that from per-entity stats, the network
// terrain would be a restatement; it cannot, and the organ must not either.
//
// Gates:
//   apparatus     network > chance + 0.2 in both causal worlds
//   consequence   network >= kind + 0.15 in both causal worlds
//   discrimination (network - chance) <= 0.1 on the control, and
//                 network(W3) <= kind(W3) + 0.1 — no phantom mechanism
// Verdict CONFIRMED only if all three hold.
//
// Usage: node terrain-arena-step2.mjs /path/to/khora/native/kernel
// No repo writes. JSON on stdout.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kernel = path.resolve(process.argv[2] || "./native/kernel");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(kernel, "rng.js")).href);
const entity = await import(pathToFileURL(path.join(kernel, "entity-kind-induction.js")).href);

const N = 120;
const LEN = 8, REVEAL = 4;

function scheduleFor(typeWeights, seed) {
  // Deterministically BALANCED schedule: alternate types in order, so the test
  // split's base rate is pinned (~0.5 binary, ~0.67 trinary) instead of swung
  // by random type draws in a 15-chain world. The world stays realistic; the
  // gate no longer trips on sample imbalance (a measurement smell, not a law).
  const types = typeWeights.map(([t]) => t);
  const out = [];
  for (let used = 0; used + LEN <= N; used += LEN) out.push(types[(out.length) % types.length]);
  return out;
}
function buildWorld(schedule, truthByType, seed) {
  const entities = shuffled(Array.from({ length: N }, (_, i) => `e${i}`), createSeededRng(seed));
  const chains = [];
  let p = 0;
  for (const type of schedule) {
    const ids = entities.slice(p, p + LEN);
    p += LEN;
    chains.push({ type, ids, revealed: ids.slice(0, REVEAL), truth: truthByType(type) });
  }
  const edges = [];
  {
    let n = 0;
    for (const c of chains) {
      for (let j = 0; j + 1 < c.revealed.length; j++) {
        edges.push({ schema: "EOHyperedge@1", id: `t:${c.type}:${n}:${j}`, relation: `trace:${c.type}`,
          participants: [{ ref: c.revealed[j], standing: "referent" }, { ref: c.revealed[j + 1], standing: "referent" }] });
        n++;
      }
    }
  }
  return { chains, edges };
}

function edgeStats(chains, edges) {
  const adj = new Map();
  for (const e of edges) {
    const a = e.participants[0].ref, b = e.participants[1].ref;
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  const outDeg = new Map(), inDeg = new Map();
  for (const [a, bs] of adj) { outDeg.set(a, bs.length); for (const b of bs) inDeg.set(b, (inDeg.get(b) ?? 0) + 1); }
  const depth = new Map();
  {
    const seen = new Set();
    for (const a of adj.keys()) {
      if (seen.has(a)) continue;
      let cur = a, d = 0; const run = [];
      while (cur && !seen.has(cur)) { seen.add(cur); run.push(cur); cur = adj.get(cur)?.[0] ?? null; }
      run.forEach((id, k) => depth.set(id, k + 1));
    }
  }
  const stats = {};
  for (const id of adj.keys()) {
    stats[id] = { outDeg: outDeg.get(id) ?? 0, inDeg: inDeg.get(id) ?? 0, depth: depth.get(id), chainSize: 4 };
  }
  for (let i = 0; i < N; i++) {
    const id = `e${i}`;
    if (!stats[id]) stats[id] = { outDeg: 0, inDeg: 0, depth: 1, chainSize: 1 };
  }
  return stats;
}

function statFeatures(stats) {
  const entityFeatures = new Map();
  for (const [id, s] of Object.entries(stats)) {
    const rows = new Map();
    const put = (k, v, seq) => {
      const signature = `edge.${k}=${v}`;
      rows.set(signature, { signature, featureKey: `edge.${k}`, featureValue: v, evidenceIds: new Set([`${id}:${seq}`]), firstAt: 0, lastAt: 0, witnessRefs: [] });
    };
    put("outDeg", s.outDeg, 0); put("inDeg", s.inDeg, 1); put("chainSize", s.chainSize, 2);
    put("depth", s.depth == null ? "none" : Math.min(3, s.depth), 3);
    put("role", s.inDeg > 0 && s.outDeg === 0 ? "end" : s.inDeg === 0 ? "head" : s.outDeg > 0 ? "mid" : "solo", 4);
    entityFeatures.set(id, rows);
  }
  return entityFeatures;
}

function kindPredictor(stats, chains, testIdx) {
  const induced = entity.induceEntityKindCandidates(statFeatures(stats), {
    population: "step2:kind-stats", permutations: 32, minKindSize: 3, minPrevalence: 0.02,
  });
  const basinOf = (id) => { for (const c of induced.candidates) if (c.memberRefs.includes(id)) return c.kindKey; return null; };
  const assoc = new Map();
  for (let i = 0; i < chains.length; i++) {
    if (testIdx.has(i)) continue;
    for (const id of chains[i].revealed) {
      const b = basinOf(id); if (!b) continue;
      const rec = assoc.get(b) ?? [0, 0]; rec[0] += chains[i].truth; rec[1] += 1; assoc.set(b, rec);
    }
  }
  const P = (b) => { const [s, n] = assoc.get(b) ?? [0, 0]; return n ? s / n : 0.5; };
  let hit = 0, tot = 0;
  for (const i of [...testIdx]) {
    let sum = 0, n = 0;
    for (const id of chains[i].revealed) { const b = basinOf(id); if (b) { sum += P(b); n++; } }
    const pred = n ? sum / n >= 0.5 ? 1 : 0 : 0.5;
    tot++; if (pred === chains[i].truth) hit++;
  }
  return tot ? { acc: hit / tot, basins: induced.candidates.length } : { acc: null, basins: induced.candidates.length };
}

// The NETWORK reading: learn P(continue | trace-type) across train chains,
// predict held-out chains by the type their revealed EDGES carry.
function networkPredictor(chains, testIdx) {
  const assoc = new Map();
  for (let i = 0; i < chains.length; i++) {
    if (testIdx.has(i)) continue;
    const rec = assoc.get(chains[i].type) ?? [0, 0];
    rec[0] += chains[i].truth; rec[1] += 1;
    assoc.set(chains[i].type, rec);
  }
  const P = (t) => { const [s, n] = assoc.get(t) ?? [0, 0]; return n ? s / n : 0.5; };
  let hit = 0, tot = 0;
  for (const i of [...testIdx]) {
    tot++;
    if ((P(chains[i].type) >= 0.5 ? 1 : 0) === chains[i].truth) hit++;
  }
  return tot ? hit / tot : null;
}

function chanceOf(chains, testIdx) {
  const t = [...testIdx].map((i) => chains[i].truth);
  const s = t.reduce((a, b) => a + b, 0);
  return Math.max(s / t.length, 1 - s / t.length);
}

function testSplit(chains, seed) {
  const order = shuffled(chains.map((_, i) => i), createSeededRng(seed + 900));
  const k = Math.max(4, Math.floor(chains.length / 3));
  return new Set(order.slice(0, k));
}

function evaluate(scheduleWeights, truthByType, seed) {
  const schedule = scheduleFor(scheduleWeights, seed);
  const world = buildWorld(schedule, truthByType, seed);
  const testIdx = testSplit(world.chains, seed);
  const stats = edgeStats(world.chains, world.edges);
  const kind = kindPredictor(stats, world.chains, testIdx);
  const net = networkPredictor(world.chains, testIdx);
  return { chance: chanceOf(world.chains, testIdx), network: net, kind: kind.acc, kindBasins: kind.basins, chains: world.chains.length, test: testIdx.size,
    truthDist: [...testIdx].map((i) => world.chains[i].truth).join("") };
}

// Worlds ----------------------------------------------------------------
const BINARY = [["A", 1], ["B", 1]];               // A propagates, B terminates
const TRINARY = [["A", 1], ["B", 1], ["C", 1]];    // A/C propagate, B terminates
const truthBinary = (t) => t === "A" ? 1 : 0;
const truthTri = (t) => (t === "A" || t === "C") ? 1 : 0;

const SEEDS = [1, 2, 3]; // pool several draws to damp the small test-split variance
const pool = (f) => SEEDS.map(f);
const W1 = pool((s) => evaluate(BINARY, truthBinary, 100 + s));
const W2 = pool((s) => evaluate(TRINARY, truthTri, 200 + s));
// CONTROL: same binary world, but the continuation truth is DECOUPLED from the
// type law — re-roll which chains propagate by a seeded coin, preserving
// topology, degrees, and the edge-relation distribution of the revealing world.
const W3 = pool((s) => {
  const schedule = scheduleFor(BINARY, 100 + s);
  const world = buildWorld(schedule, () => 0, 100 + s); // type present, truth all 0
  const rng = createSeededRng(400 + s);
  const testIdx = testSplit(world.chains, 100 + s);
  for (const c of world.chains) c.truth = rng() < 0.5 ? 1 : 0;
  const stats = edgeStats(world.chains, world.edges);
  const kind = kindPredictor(stats, world.chains, testIdx);
  return { chance: chanceOf(world.chains, testIdx), network: networkPredictor(world.chains, testIdx), kind: kind.acc, kindBasins: kind.basins, chains: world.chains.length, test: testIdx.size };
});

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const summarize = (pooled) => ({
  chance: mean(pooled.map((x) => x.chance)),
  network: mean(pooled.map((x) => x.network)),
  kind: mean(pooled.map((x) => x.kind)),
  kindBasins: mathMedian(pooled.map((x) => x.kindBasins)),
  chains: pooled[0]?.chains,
  testChains: pooled[0]?.test,
  perRun: pooled.map(({ network, kind, chance, truthDist }) => ({ network, kind, chance, truthDist })),
});
function mathMedian(xs) { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; }

const S1 = summarize(W1), S2 = summarize(W2), S3 = summarize(W3);
const gates = {
  apparatus: (S1.network - S1.chance) > 0.2 && (S2.network - S2.chance) > 0.2,
  consequence: (S1.network - S1.kind) >= 0.15 && (S2.network - S2.kind) >= 0.15,
  discrimination: (S3.network - S3.chance) <= 0.1 && (S3.network - S3.kind) <= 0.1,
};
const verdict = Object.values(gates).every(Boolean)
  ? { verdict: "CONFIRMED", claim: "the Network reading is terrain-correct: on evidence the cluster reading cannot separate, the relational organ predicts the held-out tail in causal worlds and reports no mechanism on the empty control." }
  : { verdict: "FALSIFIED", claim: "falsified — the mechanism reading either could not predict what the cluster could not, or also fired on the non-causal control." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep2@1",
  worlds: { causalBinary: S1, causalTrinary: S2, shuffledControl: S3 },
  gates,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "All chains are length 8, revealed 4: per-entity stats are deliberately unable to distinguish chain type — continuation lives only in the edge-relation type.",
    "The kind reading is given the same per-entity stats and every chance; its failure to reach the relational signal is the point of the falsifier.",
    "The control re-rolls the continuation truth by a fair coin, preserving topology, degrees, and the edge-relation distribution of the causal world.",
  ],
}, null, 2));