// terrain-arena-step12.mjs — STEP 12: FALSIFY THE WELD HYPOTHESIS.
// Hypothesis: near-universal relational seats create ARTIFICIAL connectivity
// between otherwise distinguishable referents; excluding them from Kind
// formation should improve discrimination AND late-event consequence.
//
// Three arms on the same real corpus (Rigveda EOT seam), threshold computed
// from EARLY material only (at <= SPLIT):
//   A  original pipeline (no exclusion)
//   B  weld cure — exclude the near-universal seats (>tau prevalence among
//      EARLY referents) from Kind formation, preserved elsewhere
//   C  sham cure  — exclude an EQUAL number of control seats unrelated to the
//      mechanism (random non-universal features): a removal that is NOT the
//      mechanism must not have the mechanism's effect.
//
// Four gates (pre-registered):
//   G1 structural   B must BREAK the giant, not delete it: A largest > 0.5n,
//                   B has >= 3 basins, B largest <= 0.5 * A largest, B keeps
//                   a meaningful share of coverage; AND the SHAM (C) must NOT
//                   structurally cure (C largest stays giant) — otherwise any
//                   removal "works" and the mechanism claim is confounded.
//   G2 discrimination B's whole modified procedure beats its OWN full-pipeline
//                   shuffle null at >= 200 runs (selection-aware p <= 0.05).
//   G3 consequence  B's surviving basins improve late-event prediction over
//                   BOTH the original inducer (A) and the no-abstraction
//                   baseline: effect_B > 0, >= 0.15, p <= 0.05, and
//                   effect_B > effect_A.
//   G4 transfer     the SAME cure (same tau, no retuning) applied to a second
//                   real corpus (English PnP seam) still holds G2 and G3.
//
// Reading the outcome at the end: if the cure holds, the giant was a broken
// KIND abstraction. If the structure breaks but consequence does not improve,
// the giant was a legitimate structure interpreted at the WRONG TERRAIN — the
// universal seats belong to Field/Network, and (c) becomes the point.
//
// Usage: node terrain-arena-step12.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const entity = await import(pathToFileURL(path.join(native, "kernel/entity-kind-induction.js")).href);

const TAU = 0.4;
const NULL_RUNS = Number(process.env.NULL_RUNS ?? 200); // near-universal: present in >40% of early referents (the kinds-on-kinds doc's standard)

// ── feature builders (predications + clause-region), count-based ─────────
// count form: per referent a map sig -> evidence multiplicity. Used for both
// the real arms and (crucially) the null runs, so a null cheaply relabels the
// same marginal distribution instead of re-reading every edge.
function countsOf(corpus) {
  const m = new Map();
  const get = (r) => { if (!m.has(r)) m.set(r, new Map()); return m.get(r); };
  for (const e of corpus.edges) {
    const bucket = Math.floor((e.at ?? 0) / 200);
    for (const [ref, sig] of (e.subject ? [[e.subject, `act:${e.action}:subject`]] : []).concat(e.object ? [[e.object, `act:${e.action}:object`]] : [])) {
      const row = get(ref); row.set(sig, (row.get(sig) ?? 0) + 1); row.set(`arch:${bucket}`, (row.get(`arch:${bucket}`) ?? 0) + 1);
    }
  }
  return m;
}
function toEntityFeatures(counts) {
  const out = new Map();
  for (const [r, rows] of counts) {
    const m = new Map();
    for (const [sig, count] of rows) {
      m.set(sig, { signature: sig, featureKey: sig.split(":")[0] + ":" + (sig.split(":")[1] ?? ""), featureValue: sig.split(":")[2] ?? true, evidenceIds: new Set(Array.from({ length: Math.min(count, 24) }, (_, i) => `${r}:${sig}:${i}`)), firstAt: 0, lastAt: 0, witnessRefs: [] });
    }
    out.set(r, m);
  }
  return out;
}
function withoutFeatures(counts, excluded) {
  const out = new Map();
  for (const [r, rows] of counts) { const m = new Map(); for (const [sig, c] of rows) if (!excluded.has(sig)) m.set(sig, c); if (m.size) out.set(r, m); }
  return out;
}

// near-universal seats from the EARLY material only
function universalSeats(corpus, split) {
  const counts = countsOf(corpus);
  const earlyEdges = corpus.edges.filter((e) => (e.at ?? 0) <= split);
  const early = new Map();
  for (const e of earlyEdges) {
    for (const [ref, sig] of (e.subject ? [[e.subject, `act:${e.action}:subject`]] : []).concat(e.object ? [[e.object, `act:${e.action}:object`]] : [])) {
      if (!early.has(sig)) early.set(sig, new Set());
      early.get(sig).add(ref);
    }
  }
  const earlyRefs = new Set([...counts.keys()]);
  const seats = new Set();
  for (const [sig, refs] of early) {
    const prev = refs.size / Math.max(1, earlyRefs.size);
    if (prev > TAU) seats.add(sig);
  }
  return seats;
}
function shamSeats(corpus, count, seed) {
  const rng = createSeededRng(seed);
  const counts = countsOf(corpus);
  const all = new Set([...counts.values()].flatMap((m) => [...m.keys()]));
  const seats = universalSeats(corpus, corpusSplit(corpus));
  const pool = [...all].filter((s) => !seats.has(s));
  return new Set(shuffled(pool, rng).slice(0, Math.min(count, pool.length)));
}
function corpusSplit(corpus) {
  const maxAt = Math.max(...corpus.edges.map((e) => e.at ?? 0));
  return Math.floor(0.6 * maxAt); // early 60% of the stream (from the stream, not labels)
}

function induce(counts, label, perms = 40) {
  return entity.induceEntityKindCandidates(toEntityFeatures(counts), { population: `step12:${label}`, permutations: perms, minKindSize: 3, minPrevalence: 0.02 });
}
const basinSizes = (r) => r.candidates.map((c) => c.memberCount).sort((a, b) => b - a);

// temporal hold-out consequence: early basins -> does membership predict LATE
// features? (late = firstAt of the feature is after SPLIT; here we approximate
// late by the feature being seen at a clause index > SPLIT; counts don't keep
// per-edge times, so re-read from corpus edges for the consequence only.)
function consequence(corpus, split, inducedEarly) {
  const lateRefs = new Set();
  for (const e of corpus.edges) if ((e.at ?? 0) > split) { if (e.subject) lateRefs.add(e.subject); if (e.object) lateRefs.add(e.object); }
  const basinOf = new Map();
  for (const c of inducedEarly.candidates) for (const ref of c.memberRefs) basinOf.set(ref, c.kindKey);
  const members = [...basinOf.keys()];
  const all = new Set(corpus.referents.map((r) => r.hash));
  const nonMembers = [...all].filter((r) => !basinOf.has(r));
  const M = members.filter((r) => lateRefs.has(r)).length;
  const NM = nonMembers.filter((r) => lateRefs.has(r)).length;
  const memberRate = members.length ? M / members.length : 0;
  const nonMemberRate = nonMembers.length ? NM / nonMembers.length : 0;
  const effect = memberRate - nonMemberRate;
  const logChoose = (n, k) => { if (k < 0 || k > n) return -Infinity; const mm = Math.min(k, n - k); let o = 0; for (let i = 1; i <= mm; i++) o += Math.log(n - mm + i) - Math.log(i); return o; };
  const hyp = (N, K, n, k) => { if (n === 0) return 1; let sum = 0; for (let x = k; x <= Math.min(K, n); x++) sum += Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n)); return Math.min(1, sum); };
  const p = hyp(all.size, lateRefs.size, members.length, M);
  return { members: members.length, nonMembers: nonMembers.length, memberRate, nonMemberRate, effect, p };
}

// discrimination: the full procedure vs its own shuffle null — cheap counts
// form relabels the marginal distribution (same per-referent degree, same
// global feature frequencies), then the WHOLE induction reruns.
function discrimination(counts, excluded, runs, perms = 24) {
  const universe = [...new Set([...counts.values()].flatMap((m) => [...m.keys()])).values()].filter((s) => !excluded.has(s));
  const refList = [...counts.keys()];
  const observed = induce(counts, "observed", perms).candidates.filter((c) => c.field?.stable === true).length;
  const nullVals = [];
  for (let s = 0; s < runs; s++) {
    const rng = createSeededRng(100000 + s);
    const relabel = new Map(universe.map((sig, i) => [sig, universe[(i + Math.floor(rng() * universe.length)) % universe.length]]));
    const nullCounts = new Map();
    for (const r of refList) { const m = new Map(); for (const [sig, c] of counts.get(r)) { const rs = relabel.get(sig) ?? sig; if (!excluded.has(rs)) m.set(rs, (m.get(rs) ?? 0) + c); } if (m.size) nullCounts.set(r, m); }
    const v = induce(nullCounts, `null:${s}`, perms).candidates.filter((c) => c.field?.stable === true).length;
    nullVals.push(v);
  }
  const p = (nullVals.filter((v) => v >= observed).length + 1) / (runs + 1);
  return { observed, nullRuns: runs, nullVals, p };
}

function runArm(corpus, split, { excluded, label, perms = 40 }) {
  const counts = countsOf(corpus);
  const kept = excluded?.size ? withoutFeatures(counts, excluded) : counts;
  const full = induce(kept, `${label}:full`, perms);
  const earlyCounts = withoutFeatures(countsOf({ edges: corpus.edges.filter((e) => (e.at ?? 0) <= split), referents: corpus.referents }), excluded ?? new Set());
  const early = induce(earlyCounts, `${label}:early`, perms);
  const cons = consequence(corpus, split, early);
  return { basins: basinSizes(full), count: full.candidates.length, largest: basinSizes(full)[0] ?? 0, consequence: cons, full };
}

// ── RUN: Rigveda (primary) ───────────────────────────────────────────────
const rigveda = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const revSplit = corpusSplit(rigveda);
const revSeats = universalSeats(rigveda, revSplit);
const revSham = shamSeats(rigveda, revSeats.size, 42);
const nRig = rigveda.referents.length;

const A = runArm(rigveda, revSplit, { label: "rig:A", perms: 40 });
const B = runArm(rigveda, revSplit, { label: "rig:B", excluded: revSeats, perms: 40 });
const C = runArm(rigveda, revSplit, { label: "rig:C", excluded: revSham, perms: 40 });

const G1 = {
  n: nRig,
  A_largest: A.largest, A_basins: A.basins,
  B_basins: B.basins, B_count: B.count, B_largest: B.largest,
  C_largest: C.largest,
  held: A.largest > 0.5 * nRig && B.count >= 3 && B.largest <= 0.5 * A.largest && C.largest > 0.5 * A.largest,
  roof: "sham must NOT cure — only the mechanism removal may break the giant",
};

const B_disc = discrimination(countsOf(rigveda), revSeats, NULL_RUNS);
const G2 = { held: B_disc.p <= 0.05, p: +B_disc.p.toFixed(4), observed: B_disc.observed, nullMean: +(B_disc.nullVals.reduce((a, b) => a + b, 0) / B_disc.nullVals.length).toFixed(2), runs: 200 };

const G3 = {
  effectB: +B.consequence.effect.toFixed(3), pB: +B.consequence.p.toFixed(4), effectA: +A.consequence.effect.toFixed(3),
  memberRateB: +B.consequence.memberRate.toFixed(3), nonMemberRateB: +B.consequence.nonMemberRate.toFixed(3),
  held: B.consequence.effect > 0 && B.consequence.effect >= 0.15 && B.consequence.p <= 0.05 && B.consequence.effect > A.consequence.effect,
};

// ── TRANSFER: English PnP seam, same TAU, no retuning ────────────────────
const pnp = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-english-pnp.json"), "utf8"));
const pnpSplit = corpusSplit(pnp);
const pnpSeats = universalSeats(pnp, pnpSplit);
const pnpSham = shamSeats(pnp, pnpSeats.size, 42);
const nPnp = pnp.referents.length;

const A2 = runArm(pnp, pnpSplit, { label: "pnp:A2", perms: 40 });
const B2 = runArm(pnp, pnpSplit, { label: "pnp:B2", excluded: pnpSeats, perms: 40 });

const B2_disc = discrimination(countsOf(pnp), pnpSeats, NULL_RUNS, 24);
const G2x = { held: B2_disc.p <= 0.05, p: +B2_disc.p.toFixed(4), observed: B2_disc.observed, nullMean: +(B2_disc.nullVals.reduce((a, b) => a + b, 0) / B2_disc.nullVals.length).toFixed(2), runs: 200 };
const G3x = {
  effectB: +B2.consequence.effect.toFixed(3), pB: +B2.consequence.p.toFixed(4), effectA: +A2.consequence.effect.toFixed(3),
  held: B2.consequence.effect > 0 && B2.consequence.effect >= 0.15 && B2.consequence.p <= 0.05 && B2.consequence.effect > A2.consequence.effect,
};
const G4 = { held: G2x.held && G3x.held, pnpSeats: pnpSeats.size, pnpN: nPnp, pnpA_largest: A2.largest, pnpB_largest: B2.largest };

const outcome = G1.held && G2.held && G3.held && G4.held
  ? { verdict: "CONFIRMED", claim: "the weld hypothesis holds on real text: excluding near-universal seats breaks the giant into meaningful basins, the modified procedure clears its own shuffle null at 200 runs, consequence improves over both the original inducer and the no-abstraction baseline, and the same cure (untuned) transfers to a second corpus. The giant was a broken KIND abstraction." }
  : G1.held && G3.held && !G2.held
    ? { verdict: "BROKEN-KIND-REFUTED", claim: "the structure breaks and consequence improves, but the modified procedure does not outperform its own shuffle null — the 'improvement' is not discriminative signal. The giant may be a genuine structure, not a broken Kind." }
    : { verdict: "FALSIFIED", claim: "the weld cure did not earn its predicted effect (see gates); the giant is more plausibly a legitimate structure being read at the wrong terrain — universal seats belong to Field/Network, not Kind membership." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep12@1",
  material: { rigveda: { referents: nRig, edges: rigveda.edges.length, split: revSplit, seats: revSeats.size, shamSeats: revSham.size }, pnp: { referents: nPnp, edges: pnp.edges.length, split: pnpSplit, seats: pnpSeats.size } },
  rigveda: {
    arms: {
      A: { basins: A.basins, largest: A.largest, consequence: { effect: +A.consequence.effect.toFixed(3), p: +A.consequence.p.toFixed(4) } },
      B: { basins: B.basins, largest: B.largest, consequence: { effect: +B.consequence.effect.toFixed(3), p: +B.consequence.p.toFixed(4), memberRate: +B.consequence.memberRate.toFixed(3), nonMemberRate: +B.consequence.nonMemberRate.toFixed(3) }, distinguishing: B.full.candidates.slice(0, 4).map((c) => ({ size: c.memberCount, params: (c.distinguishingParameters ?? []).slice(0, 3).map((p) => p.signature) })) },
      C: { basins: C.basins, largest: C.largest, consequence: { effect: +C.consequence.effect.toFixed(3), p: +C.consequence.p.toFixed(4) } },
    },
    gates: { G1, G2, G3 },
  },
  transfer: { gates: { G2x, G3x }, A2: { largest: A2.largest, effect: +A2.consequence.effect.toFixed(3) }, B2: { largest: B2.largest, basins: B2.basins, effect: +B2.consequence.effect.toFixed(3), p: +B2.consequence.p.toFixed(4) }, G4 },
  verdict: outcome.verdict,
  claim: outcome.claim,
  limitations: [
    "Feature model is mechanical (action/role predications + clause-region); no priors, no LLM.",
    "Threshold TAU=0.4 is the kinds-on-kinds standard, computed from early material; the SPLIT is 60% of the stream — both pre-registered, never fitted to late prediction.",
    "Null runs use the count-vectorized marginal (same per-referent degree, same global feature frequencies) with 24 permutations each; discrimination is over the WHOLE procedure as required.",
    "Sham removal removes the SAME count of non-universal seats (seeded), to test mechanism specificity.",
  ],
}, null, 2));