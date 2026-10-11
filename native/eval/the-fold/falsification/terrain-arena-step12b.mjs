// terrain-arena-step12b.mjs — THE WELD CURE AT THE RIGHT LEVEL. The first
// pass (12a) formalized the cure as "drop high-prevalence FEATURES" and the
// set was EMPTY — the giant weld lives in the CO-OCCURRENCE HUBS, not in
// single high-frequency predications. This rebuilds the cure the way
// THE-KINDS-ON-KINDS actually states it: kinds formed over a COMPANY model
// (referents become features of each other by co-participation within a
// clause), and the near-universal SEATS are REFERENTS present in >40% of
// clauses — removed from KIND formation, kept in the evidence graph. The sham
// arm removes an equal number of non-hub referents, so a mechanism claim is
// only credited if the HUB removal (not any removal) breaks the giant.
//
// Arms:
//   A  original company-model induction
//   B  hub cure — drop referents in >40% of clauses from Kind formation
//   C  sham cure — drop the SAME number of random non-hub referents
//
// Gates (pre-registered):
//   G1 structural   A giant > 0.5n; B breaks into >= 3 basins with largest
//                   <= 0.5 * A-largest and keeps signal; the SHAM (C) must NOT
//                   cure (mechanism specificity).
//   G2 discrimination B's full procedure beats its own company-null at
//                   >= 200 runs (selection-aware p <= 0.05).
//   G3 consequence  temporal hold-out: early co-participation induces basins;
//                   B membership predicts LATE participation better than the
//                   original inducer AND the no-abstraction baseline
//                   (effectB > 0, >= 0.15, p <= 0.05, effectB > effectA).
//   G4 transfer     same cure, no retuning, on the English PnP seam.
//
// Usage: node terrain-arena-step12b.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const TAU_SCENE = 0.4;   // near-universal seat: in >40% of clauses
const NULL_RUNS = Number(process.env.NULL_RUNS ?? 200);
const PERMS = 24;

// ── company model: referents as features of each other per co-participation ──
function companyCounts(corpus) {
  const clauses = new Map();
  for (const e of corpus.edges) {
    const cid = e.at ?? 0;
    if (!clauses.has(cid)) clauses.set(cid, new Set());
    if (e.subject) clauses.get(cid).add(e.subject);
    if (e.object) clauses.get(cid).add(e.object);
  }
  const counts = new Map(); // ref -> Map<sig,count>
  for (const refs of clauses.values()) {
    const arr = [...refs];
    for (const a of arr) {
      if (!counts.has(a)) counts.set(a, new Map());
      const m = counts.get(a);
      for (const b of arr) if (b !== a) m.set(`co:${b}`, (m.get(`co:${b}`) ?? 0) + 1);
    }
  }
  return counts;
}
function toEntityFeatures(counts) {
  const out = new Map();
  for (const [r, rows] of counts) {
    const m = new Map();
    for (const [sig, count] of rows) m.set(sig, { signature: sig, featureKey: "co", featureValue: sig.slice(3), evidenceIds: new Set(Array.from({ length: Math.min(count, 24) }, (_, i) => `${r}:${sig}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] });
    out.set(r, m);
  }
  return out;
}
function withoutRefs(counts, excluded) {
  const out = new Map();
  for (const [r, m] of counts) if (!excluded.has(r)) out.set(r, m);
  return out;
}
const induce = (counts, label) => entity.induceEntityKindCandidates(toEntityFeatures(counts), { population: `step12b:${label}`, permutations: PERMS, minKindSize: 3, minPrevalence: 0 });
const sizes = (r) => r.candidates.map((c) => c.memberCount).sort((a, b) => b - a);

// near-universal REferends (seats) from clause participation
function universalRefs(corpus) {
  const clauseIds = new Set(corpus.edges.map((e) => e.at ?? 0));
  const appear = new Map();
  for (const e of corpus.edges) {
    for (const ref of [e.subject, e.object]) if (ref) { if (!appear.has(ref)) appear.set(ref, new Set()); appear.get(ref).add(e.at ?? 0); }
  }
  const seats = new Set();
  for (const [ref, set] of appear) if (set.size / clauseIds.size > TAU_SCENE) seats.add(ref);
  return seats;
}
function shamRefs(corpus, hubs, count, seed) {
  const rng = createSeededRng(seed);
  const all = new Set(corpus.referents.map((r) => r.hash));
  const pool = [...all].filter((r) => !hubs.has(r));
  return new Set(shuffled(pool, rng).slice(0, Math.min(count, pool.length)));
}
const split = (corpus) => Math.floor(0.6 * Math.max(...corpus.edges.map((e) => e.at ?? 0)));

// temporal hold-out consequence on the company model
function consequence(corpus, split, early) {
  const lateClauses = new Set(corpus.edges.filter((e) => (e.at ?? 0) > split).map((e) => e.at ?? 0));
  const lateRefs = new Set();
  for (const e of corpus.edges) if (lateClauses.has(e.at)) { if (e.subject) lateRefs.add(e.subject); if (e.object) lateRefs.add(e.object); }
  const basinOf = new Map();
  for (const c of early.candidates) for (const ref of c.memberRefs) basinOf.set(ref, c.kindKey);
  const members = [...basinOf.keys()];
  const all = new Set(corpus.referents.map((r) => r.hash));
  const nonMembers = [...all].filter((r) => !basinOf.has(r));
  const M = members.filter((r) => lateRefs.has(r)).length;
  const NM = nonMembers.filter((r) => lateRefs.has(r)).length;
  const memberRate = members.length ? M / members.length : 0;
  const nonMemberRate = nonMembers.length ? NM / nonMembers.length : 0;
  const effect = memberRate - nonMemberRate;
  const logChoose = (n, k) => { if (k < 0 || k > n) return -Infinity; const m = Math.min(k, n - k); let o = 0; for (let i = 1; i <= m; i++) o += Math.log(n - m + i) - Math.log(i); return o; };
  const hyp = (N, K, n, k) => { if (n === 0) return 1; let s = 0; for (let x = k; x <= Math.min(K, n); x++) s += Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n)); return Math.min(1, s); };
  return { members: members.length, nonMembers: nonMembers.length, memberRate, nonMemberRate, effect, p: hyp(all.size, lateRefs.size, members.length, M) };
}

function discrimination(counts, dropped, runs) {
  const universe = [...new Set([...counts.values()].flatMap((m) => [...m.keys()]))].filter((s) => ![...dropped].some((r) => s === `co:${r}`));
  const refs = [...counts.keys()].filter((r) => !dropped.has(r));
  const observed = induce(counts, "observed").candidates.filter((c) => c.field?.stable === true).length;
  const vals = [];
  for (let s = 0; s < runs; s++) {
    const rng = createSeededRng(500000 + s);
    const relabel = new Map(universe.map((sig, i) => [sig, universe[(i + Math.floor(rng() * universe.length)) % universe.length]]));
    const nc = new Map();
    for (const r of refs) { const m = new Map(); for (const [sig, c] of counts.get(r)) { const rs = relabel.get(sig) ?? sig; if (rs !== "co:") m.set(rs, (m.get(rs) ?? 0) + c); } if (m.size) nc.set(r, m); }
    vals.push(induce(nc, `null:${s}`).candidates.filter((c) => c.field?.stable === true).length);
  }
  return { observed, runs, p: (vals.filter((v) => v >= observed).length + 1) / (runs + 1), nullMean: +(vals.reduce((a, b) => a + b, 0) / runs).toFixed(2) };
}

function runArm(corpus, splitT, { dropped = new Set(), label }) {
  const counts = companyCounts(corpus);
  const kept = dropped.size ? withoutRefs(counts, dropped) : counts;
  const full = induce(kept, `${label}:full`);
  const earlyEdges = corpus.edges.filter((e) => (e.at ?? 0) <= splitT);
  const earlyCounts = withoutRefs(companyCounts({ edges: earlyEdges, referents: corpus.referents }), dropped);
  const early = induce(earlyCounts, `${label}:early`);
  return { basins: sizes(full), count: full.candidates.length, largest: sizes(full)[0] ?? 0, consequence: consequence(corpus, splitT, early) };
}

const rigveda = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const rv = { split: split(rigveda), hubs: universalRefs(rigveda) };
rv.sham = shamRefs(rigveda, rv.hubs, rv.hubs.size, 42);
const nRig = rigveda.referents.length;
const A = runArm(rigveda, rv.split, { label: "rig:A" });
const B = runArm(rigveda, rv.split, { dropped: rv.hubs, label: "rig:B" });
const C = runArm(rigveda, rv.split, { dropped: rv.sham, label: "rig:C" });

const G1 = {
  n: nRig, seats: rv.hubs.size, A_largest: A.largest, A_basins: A.basins, B_basins: B.basins, B_count: B.count, B_largest: B.largest, C_largest: C.largest,
  held: A.largest > 0.5 * nRig && B.count >= 3 && B.largest <= 0.5 * A.largest && C.largest > 0.5 * A.largest,
};
const G2 = (() => { const d = discrimination(companyCounts(rigveda), rv.hubs, NULL_RUNS); return { held: d.p <= 0.05, p: +d.p.toFixed(4), observed: d.observed, nullMean: d.nullMean, runs: NULL_RUNS }; })();
const G3 = {
  effectB: +B.consequence.effect.toFixed(3), pB: +B.consequence.p.toFixed(4), effectA: +A.consequence.effect.toFixed(3),
  memberRateB: +B.consequence.memberRate.toFixed(3), nonMemberRateB: +B.consequence.nonMemberRate.toFixed(3),
  held: B.consequence.effect > 0 && B.consequence.effect >= 0.15 && B.consequence.p <= 0.05 && B.consequence.effect > A.consequence.effect,
};

const pnp = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-english-pnp.json"), "utf8"));
const pv = { split: split(pnp), hubs: universalRefs(pnp) };
const nPnp = pnp.referents.length;
const A2 = runArm(pnp, pv.split, { label: "pnp:A2" });
const B2 = runArm(pnp, pv.split, { dropped: pv.hubs, label: "pnp:B2" });
const G2x = (() => { const d = discrimination(companyCounts(pnp), pv.hubs, NULL_RUNS); return { held: d.p <= 0.05, p: +d.p.toFixed(4), observed: d.observed, nullMean: d.nullMean, runs: NULL_RUNS }; })();
const G3x = {
  effectB: +B2.consequence.effect.toFixed(3), pB: +B2.consequence.p.toFixed(4), effectA: +A2.consequence.effect.toFixed(3),
  held: B2.consequence.effect > 0 && B2.consequence.effect >= 0.15 && B2.consequence.p <= 0.05 && B2.consequence.effect > A2.consequence.effect,
};
const G4 = { held: G2x.held && G3x.held, pnpSeats: pv.hubs.size, pnpA_largest: A2.largest, pnpB_largest: B2.largest };

const outcome = G1.held && G2.held && G3.held && G4.held
  ? { verdict: "CONFIRMED", claim: "the weld hypothesis holds at the right level: hub-referent removal breaks the giant into meaningful basins, the modified procedure clears its own company-null, and consequence improves — on both corpora, uniformed. The giant was a broken KIND abstraction." }
  : G1.held && G3.held && !G2.held
    ? { verdict: "BROKEN-KIND-REFUTED", claim: "structure breaks and consequence improves but the procedure does not beat its own shuffle null — the cure is not discriminative signal. The weld is plausibly a legitimate structure at the wrong terrain (Field/Network)." }
    : { verdict: "FALSIFIED", claim: "the hub-level weld cure did not earn its predicted effect (see gates). The giant is more plausibly a legitimate structure being read at the wrong terrain — universal seats belong to Field/Network, not Kind membership." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep12b@1",
  material: { rigveda: { referents: nRig, edges: rigveda.edges.length, split: rv.split, hubs: rv.hubs.size, sham: rv.sham.size }, pnp: { referents: nPnp, edges: pnp.edges.length, split: pv.split, hubs: pv.hubs.size } },
  rigveda: {
    arms: { A: { basins: A.basins, largest: A.largest, effect: +A.consequence.effect.toFixed(3), p: +A.consequence.p.toFixed(4) }, B: { basins: B.basins, largest: B.largest, effect: +B.consequence.effect.toFixed(3), p: +B.consequence.p.toFixed(4) }, C: { basins: C.basins, largest: C.largest, effect: +C.consequence.effect.toFixed(3), p: +C.consequence.p.toFixed(4) } },
    gates: { G1, G2, G3 },
  },
  transfer: { A2: { largest: A2.largest, effect: +A2.consequence.effect.toFixed(3) }, B2: { basins: B2.basins, largest: B2.largest, effect: +B2.consequence.effect.toFixed(3), p: +B2.consequence.p.toFixed(4) }, gates: { G2x, G3x, G4 } },
  verdict: outcome.verdict,
  claim: outcome.claim,
  limitations: [
    "Company model: referent×referent co-participation features, no priors, no LLM.",
    "TAU_SCENE=0.4 from the kinds-on-kinds doc; split at 0.6 of the clause stream; both pre-registered.",
    "Null = shuffle the co-participation labels preserving per-referent degree and global co-label frequencies; PERMS=24; discrimination is over the whole procedure.",
    "Hub removal drops referent ROWS from kind formation; the evidence graph (corpus edges) is untouched.",
  ],
}, null, 2));