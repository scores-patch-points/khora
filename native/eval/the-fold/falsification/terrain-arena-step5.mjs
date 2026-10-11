// terrain-arena-step5.mjs — STEP 5 FALSIFIER: do we have a genuine Commons
// higher-order ascent, or only a recursion loop? The essay's rule, now
// enforced by the repo's own MHC machinery (native/the-fold/mhc.js): a
// higher-order action organizes lower-order actions NON-arbitrarily,
// producing outcomes the lower-order actions ALONE cannot accomplish — and a
// Kind of Kinds or an organ-router is NOT automatically such an action.
//
// The declared order-6 item (above the symbolic floor, whose constituents are
// the three lower-order organs): "decide which lower-order reasoning
// operation is appropriate for which held-out case, and release ONLY the
// operations that have earned standing." Lower-order constituents are the
// three terrain organs (Kind basins / Network relation-law / Paradigm
// lens-agreement); the higher-order act routes each query and gates every
// release through the shipped releaseDecision (earned standing only). Arms
// (each a NEGATIVE control that must NOT accomplish the task):
//   lowerOrder      best constituent alone on the mixed task must stay under
//                   the accomplish bar (axiom 3, first claim).
//   arbitrary       the SAME constituents with the router SHUFFLED (seeded)
//                   must stay under it (axiom 3, second claim).
//   discrimination  the coordinated system on material that does not support
//                   it (outcomes randomized within family) must stay under it
//                   (this battery's own arm).
// Then task: the coordinated system on the causal mixed world reaches it.
// Accomplish bar: held-out accuracy >= 0.75, quantal, pre-registered.
//
// Usage: node terrain-arena-step5.mjs /path/to/khora/native/kernel

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kernel = path.resolve(process.argv[2] || "./native/kernel");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(kernel, "rng.js")).href);
const entity = await import(pathToFileURL(path.join(kernel, "entity-kind-induction.js")).href);
const hlAb = await import(pathToFileURL(path.join(kernel, "hyperlexicon-abstraction.js")).href);
const mhc = await import(pathToFileURL(path.join(kernel, "../the-fold/mhc.js")).href);

const { createAbstractionRegistry, admitAbstraction, earnAbstraction, releaseDecision } = hlAb;
const { declareItem, runBattery, stageFrom } = mhc;

const N = 120, TRAIN = 60, SEED = 777;
const BAR = 0.75;
const Q = { K: 0, N: 1, P: 2 };
const chanceOfValue = (family) => (family === Q.N ? 0.5 : 1 / 3);

function buildWorld({ randomized = false } = {}) {
  const rng = createSeededRng(SEED + (randomized ? 500 : 0));
  const cOf = (i) => i % 3;                    // disposition class
  const skOf = (i) => Math.floor(i / 13) % 3;  // stance key
  const qOf = (i) => i % 3;                    // the query family
  const groupOf = (i) => i % 3;                // observation group (lens clique)

  const typeOfChain = new Map();
  for (let ch = 0; ch * 8 < N; ch++) typeOfChain.set(ch, ch % 2 === 0 ? "A" : "B");
  const NtrueOf = (i) => typeOfChain.get(Math.floor(i / 8)) === "A" ? 1 : 0;

  const LG = 24, PERM = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
  const stanceOf = [];
  for (let l = 0; l < LG; l++) {
    const perm = PERM[Math.floor(l / 8)];
    const rl = createSeededRng(SEED + 700 + l);
    const row = [];
    for (let i = 0; i < N; i++) row.push(rl() < 0.2 ? Math.floor(rl() * 3) : perm[skOf(i)]);
    stanceOf.push(row);
  }
  // the paradigm target and observable: value = the group's own perm on sk;
  // observable = the group's designated primary lens reading (jittered).
  const PtrueOf = (i) => PERM[groupOf(i)][skOf(i)];
  const primaryStanceOf = (i) => stanceOf[groupOf(i) * 8][i];

  const CLASS_CORES = ["a", "b", "c"], NOISE = Array.from({ length: 12 }, (_, i) => `n${i}`);
  const entityFeatures = new Map();
  for (let i = 0; i < N; i++) {
    const rows = new Map();
    const coreId = `feature=${CLASS_CORES[cOf(i)]}`;
    rows.set(coreId, { signature: coreId, featureKey: "feature", featureValue: true, evidenceIds: new Set([0, 1, 2, 3].map((q) => `ev:${i}:c:${q}`)), firstAt: i, lastAt: i, witnessRefs: [] });
    const n1 = Math.floor(rng() * NOISE.length); let n2 = Math.floor(rng() * NOISE.length);
    if (n2 === n1) n2 = (n2 + 1) % NOISE.length;
    const put = (sig, q) => rows.set(sig, { signature: sig, featureKey: "feature", featureValue: true, evidenceIds: new Set([`ev:${i}:n:${q}`]), firstAt: i, lastAt: i, witnessRefs: [] });
    put(`feature=${NOISE[n1]}`, n1); put(`feature=${NOISE[n2]}`, n2);
    entityFeatures.set(`e${i}`, rows);
  }

  const relOf = new Map();
  for (let ch = 0; ch * 8 < N; ch++) {
    const type = typeOfChain.get(ch), r = 4, base = ch * 8;
    for (let j = 0; j + 1 < r; j++) {
      const a = base + j, b = base + j + 1;
      relOf.set(a, (relOf.get(a) ?? []).concat(`trace:${type}`));
      relOf.set(b, (relOf.get(b) ?? []).concat(`trace:${type}`));
    }
  }

  const cases = [];
  for (let i = 0; i < N; i++) {
    cases.push({
      id: `e${i}`,
      q: randomized ? Math.floor(rng() * 3) : qOf(i),
      idK: randomized ? Math.floor(rng() * 3) : cOf(i),
      Ntrue: randomized ? Math.floor(rng() * 2) : NtrueOf(i),
      Ptrue: randomized ? Math.floor(rng() * 3) : PtrueOf(i),
      rels: relOf.get(i) ?? ["trace:none"],
      primaryStance: randomized ? Math.floor(rng() * 3) : primaryStanceOf(i),
    });
  }
  return { cases, entityFeatures };
}

// ── the three lower-order organs (constituents) ──────────────────────────
function kindModel(world) {
  const induced = entity.induceEntityKindCandidates(world.entityFeatures, { population: "step5:kind", permutations: 32, minKindSize: 3, minPrevalence: 0.02 });
  const basinOf = (id) => { for (const c of induced.candidates) if (c.memberRefs.includes(id)) return c.kindKey; return null; };
  const basinClass = new Map();
  for (const c of induced.candidates) {
    const counts = new Map();
    for (const ref of c.memberRefs) { const i = Number(ref.slice(1)); if (i < TRAIN) counts.set(world.cases[i].idK, (counts.get(world.cases[i].idK) ?? 0) + 1); }
    let best = null, bn = -1; for (const [k, v] of counts) if (v > bn) { bn = v; best = k; }
    basinClass.set(c.kindKey, best);
  }
  return { predict: (i) => basinClass.get(basinOf(`e${i}`)) ?? null };
}
function networkModel(world) {
  const counts = new Map();
  for (let i = 0; i < TRAIN; i++) for (const rel of world.cases[i].rels) {
    const rec = counts.get(rel) ?? [0, 0]; rec[0] += world.cases[i].Ntrue; rec[1] += 1; counts.set(rel, rec);
  }
  const p = (rel) => { const [s, n] = counts.get(rel) ?? [0, 0]; return n ? s / n : 0.5; };
  return { predict: (i) => { const rels = world.cases[i].rels; let best = null, bs = -1; for (const rel of rels) { const v = p(rel); if (v > bs) { bs = v; best = rel; } } return p(best ?? "trace:none") >= 0.5 ? 1 : 0; } };
}
function paradigmModel(world) {
  const map = new Map();
  for (let i = 0; i < TRAIN; i++) {
    const key = `s=${world.cases[i].primaryStance}`;
    const rec = map.get(key) ?? [0, 0, 0];
    rec[world.cases[i].Ptrue] += 1; map.set(key, rec);
  }
  const maj = (arr) => { let b = null, bn = -1; arr.forEach((v, k) => { if (v > bn) { bn = v; b = k; } }); return b; };
  return { predict: (i) => { const rec = map.get(`s=${world.cases[i].primaryStance}`); const seat = maj(rec); return seat != null ? seat : 2; } };
}

// ── training, standing, and the coordinated ensemble ─────────────────────
function evaluateWorld({ world, seed, arbitrary = false }) {
  const kw = kindModel(world), nw = networkModel(world), pw = paradigmModel(world);
  const acc = (model, key) => {
    let hit = 0, tot = 0;
    for (let i = TRAIN; i < N; i++) { const pv = model.predict(i); if (pv == null) continue; tot++; if (pv === world.cases[i][key]) hit++; }
    return tot ? hit / tot : null;
  };
  const own = { kind: acc(kw, "idK"), network: acc(nw, "Ntrue"), paradigm: acc(pw, "Ptrue") };

  const names = ["kind", "network", "paradigm"];
  const standings = { kind: "candidate", network: "candidate", paradigm: "candidate" };
  for (const [ix, family] of [[0, Q.K], [1, Q.N], [2, Q.P]]) {
    const accV = own[names[ix]];
    if (accV != null && accV - chanceOfValue(family) > 0.2) {
      const r0 = admitAbstraction(createAbstractionRegistry(), { op: "SIG", grain: "Pattern", terrain: ["Kind", "Network", "Paradigm"][ix], label: names[ix], depth: 0, memberRefs: ["a", "b", "c"] });
      const rid = Object.values(r0.abstractions)[0].id;
      const r1 = earnAbstraction(r0, { id: rid, validation: { method: "train_holdout", effect: +(accV - chanceOfValue(family)).toFixed(3) } });
      standings[names[ix]] = releaseDecision(r1, { id: rid }).released ? "earned" : "candidate";
    }
  }

  // MIXED-task accuracy under a given routing map (q -> organ). Every case
  // asks for ONE value — the value of ITS OWN family (the query's target) —
  // and the routed organ's answer is compared to THAT, whatever organ was
  // routed. The coordinator succeeds by routing; an organ answering another
  // family's query is compared to that family's truth and fails.
  const mixed = (route) => {
    const models = { kind: kw, network: nw, paradigm: pw };
    const queryKey = ["idK", "Ntrue", "Ptrue"]; // by case query Q.K/Q.N/Q.P
    let hit = 0, tot = 0, withheld = 0;
    for (let i = TRAIN; i < N; i++) {
      const org = route[world.cases[i].q];
      if (standings[org] !== "earned") { withheld++; continue; }
      const pv = models[org].predict(i);
      if (pv == null) { withheld++; continue; }
      tot++;
      if (pv === world.cases[i][queryKey[world.cases[i].q]]) hit++;
    }
    return { coord: tot ? hit / tot : null, withheld };
  };

  const rng = createSeededRng(seed);
  let route, permuted;
  if (arbitrary) {
    let order;
    do { order = shuffled([...names], rng); } while (order.join("|") === names.join("|"));
    permuted = true;
    route = { [Q.K]: order[0], [Q.N]: order[1], [Q.P]: order[2] };
  } else { permuted = false; route = { [Q.K]: "kind", [Q.N]: "network", [Q.P]: "paradigm" }; }

  const asCoord = mixed(route);
  // the lowerOrder arm's quantity: each constituent ALONE on the mixed task
  // (a fixed routing that answers every case with one organ).
  const lone = Math.max(...names.map((org) => mixed({ [Q.K]: org, [Q.N]: org, [Q.P]: org }).coord).filter((x) => x != null));

  return { own, standings, coord: asCoord.coord, withheld: asCoord.withheld, permuted, lone };
}

const causal = buildWorld({ randomized: false });
const causalRes = evaluateWorld({ world: causal, seed: SEED + 1, arbitrary: false });
const arbitraryRes = evaluateWorld({ world: causal, seed: SEED + 2, arbitrary: true });
const noise = buildWorld({ randomized: true });
const noiseRes = evaluateWorld({ world: noise, seed: SEED + 3, arbitrary: false });

const lowerOrderBest = causalRes.lone;

// ── declare and run through the repo's own MHC machinery ─────────────────
// The organs are the battery FLOOR (order 5 = symbolic floor, no declared
// constituents); the coordinator is one order above them (order 6), so axiom
// 1 ("constituents at the next lower order") is enforced, not assumed.
// RAW declarations: runBattery re-declares each item itself.
const bars = { k: causalRes.own.kind - chanceOfValue(Q.K), n: causalRes.own.network - chanceOfValue(Q.N), p: causalRes.own.paradigm - chanceOfValue(Q.P) };
const floorOrgan = (id, name, organ, delta) => ({
  id, order: 5, organ, assembly: "step5-coordinator", stages: ["Fold"], name,
  organizes: `performs its own family beyond chance (delta ${delta.toFixed(3)})`, definedInTermsOf: [],
  task: () => ({ completed: delta > 0.2, detail: `own-family delta ${delta.toFixed(3)}` }),
  arms: { lowerOrder: () => ({ completed: false, perturbed: true }), arbitrary: () => ({ completed: false, perturbed: true }), discrimination: () => ({ completed: false, perturbed: true }) },
});
const coordinatorRaw = {
  id: "release-coordinator", order: 6, organ: "releaseDecision-ensemble", assembly: "step5-coordinator",
  stages: ["Fold"], name: "release-selected coordination of the terrain organs",
  organizes: "routes each query to the operation that earned standing on its family, releasing only earned organs",
  definedInTermsOf: ["k-organ", "n-organ", "p-organ"],
  task: () => ({ completed: (causalRes.coord ?? 0) >= BAR, detail: `coordinated ${(causalRes.coord ?? 0).toFixed(3)}` }),
  arms: {
    lowerOrder: () => ({ completed: (lowerOrderBest ?? 0) >= BAR, detail: `best constituent alone on the mixed task ${(lowerOrderBest ?? 0).toFixed(3)}`, perturbed: true }),
    arbitrary: () => ({ completed: (arbitraryRes.coord ?? 0) >= BAR, detail: `arbitrary router ${(arbitraryRes.coord ?? 0).toFixed(3)} (permuted ${arbitraryRes.permuted})`, perturbed: arbitraryRes.permuted }),
    discrimination: () => ({ completed: (noiseRes.coord ?? 0) >= BAR, detail: `noise world ${(noiseRes.coord ?? 0).toFixed(3)} (releases withheld: ${noiseRes.withheld})`, perturbed: true }),
  },
};

const report = await runBattery(
  [floorOrgan("k-organ", "Kind organ", "kind-basin", bars.k), floorOrgan("n-organ", "Network organ", "network-relation", bars.n), floorOrgan("p-organ", "Paradigm organ", "paradigm-lens", bars.p), coordinatorRaw],
  {},
  { assembly: "step5-coordinator", priors: [] },
);

const item = report.items.find((i) => i.id === "release-coordinator");
const stage = stageFrom(report);
console.log(JSON.stringify({
  schema: "EOTerrainArenaStep5@1",
  world: { referents: N, train: TRAIN, accomplishBar: BAR },
  constituents: causalRes.own,
  standingByFamily: causalRes.standings,
  coordinated: { causal: causalRes.coord, arbitrary: arbitraryRes.coord, noise: noiseRes.coord },
  arms: item ? { lowerOrderHeld: item.arms.lowerOrder.completed === false, arbitraryHeld: item.arms.arbitrary.completed === false, discriminationHeld: item.arms.discrimination.completed === false } : null,
  itemStatus: item?.status,
  itemReason: item?.reason ?? null,
  stage: { stage: stage.stage, stageName: stage.stageName, cappedBy: stage.cappedBy },
  verdict: item?.status === "passed" ? "CONFIRMED" : (item?.status === "refused" ? "FALSIFIED" : "UNMEASURED"),
  claim: item?.status === "passed"
    ? "a genuine Commons ascent measured with the repo's own machinery: coordinating the terrain organs through the earned-standing release gate accomplishes what the constituents alone and their arbitrary re-coordination cannot."
    : `not earned — the item is ${item?.status} (${item?.reason ?? "?"}). A Kind of Kinds is not automatically a higher-order action.`,
  limitations: [
    "One coordinated item, one order above the symbolic floor — not a full stage claim; stageFrom reports the contiguous run it can read.",
    "The three organ items ARE the floor for this battery; no order-6+ elaboration is declared.",
    "The accomplish bar (0.75) is quantal and pre-registered, as the MHC requires.",
  ],
}, null, 2));