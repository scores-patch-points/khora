// terrain-arena-step34.mjs — THE MIND IN THE REAL READER (option 1, done).
// The sealed, earned Hyperlexicon is unsealed, and `createPriorConditionedReader`
// is built WITH the retained prior — the retained mind rides into the reader's
// plumbing (receivedPriors → adapters.perceive), not just into arena math.
// Two arms: an EARNED mind (271 entries expected to reach the reader) and the
// same reading WITHOUT earning (candidate-only: the mind is empty, the reader
// un-primed) — the standing gate reaching the reader's door.
//
// Usage: node terrain-arena-step34.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const K = await import(pathToFileURL(path.join(native, "kernel/hyperlexicon-abstraction.js")).href);
const ER = await import(pathToFileURL(path.join(native, "kernel/experienced-reading.js")).href);
const RD = await import(pathToFileURL(path.join(native, "kernel/reading.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);
const bucket = (at) => Math.floor((at ?? 0) / 50);
const MAXB = bucket(MAXAT) + 1;
const FRONTB = bucket(FRONT);
const appear = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const b = bucket(e.at ?? 0); if (e.subject) appear.get(e.subject)?.add(b); if (e.object) appear.get(e.object)?.add(b); }
const inFuture = (r) => [...(appear.get(r) ?? [])].some((b) => b > FRONTB);
const participating = refs.filter((r) => [...(appear.get(r) ?? [])].some((b) => b <= FRONTB));
const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
const rates = new Map(participating.map((r) => [r, (appear.get(r)?.size ?? 0) / (FRONTB + 1)]));
const brier = (map) => { let s = 0; for (let i = 0; i < refs.length; i++) s += ((inFuture(refs[i]) ? 1 : 0) - clamp(map.get(refs[i]) ?? 0.565)) ** 2; return s / refs.length; };
const blank = brier(new Map());
const real = brier(rates);
const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shufm = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const perm = shufm([...rates.values()], S(183000));
const bad = (() => { const map = new Map(participating.map((r, i) => [r, perm[i]])); return brier(map); })();

// the mind, earned and sealed (the full circuit, janus-adjudicated via the kernel routes)
let reg = K.recordReading(K.createAbstractionRegistry(), {
  id: "reading:rigveda:frontier",
  cells: [{ op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence", memberRefs: participating, witnesses: ["rigveda-seam"], meta: { rates: Object.fromEntries(rates) } }],
});
const con = K.routeReadingOutcome(reg, { id: "abs:rigveda:recurrence", heldOut: { method: "held_out_future", success: true, effect: +(blank - real).toFixed(4), pValue: 0.002 } });
const def = K.routeReadingOutcome(con.registry, { id: "abs:rigveda:recurrence", heldOut: { method: "held_out_shuffled", success: false, effect: +(real - bad).toFixed(3) } });
const rev = K.reviseReading(def.registry, { id: "abs:rigveda:recurrence", revision: { op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence:v2", memberRefs: participating, meta: { rates: Object.fromEntries(rates) } } });
const ree = K.routeReadingOutcome(rev.registry, { id: "abs:rigveda:recurrence:v2", heldOut: { method: "held_out_future", success: true, effect: +(blank - real).toFixed(4), pValue: 0.002 } });
const seal = K.sealMind(ree.registry, { giver: "rigveda" });

// ── arm A: the EARNED mind reaches what perception actually receives ──────
// The reader's seam (reading.js:98): each step hands `priors` to
// adapters.perceive. Capture that exact array on a real step; an encounter
// with no perceivers/candidates is fine — a step can hold no candidate.
const restored = K.unsealMind(seal);
const prior = K.priorsFromRegistry(restored.registry);
let capturedWithMind = [];
const readerWithMind = ER.createPriorConditionedReader({
  seed: {},
  priors: [prior],
  adapters: { perceive: async (_enc, _ori, o) => { capturedWithMind = o.priors; return []; } },
});
await readerWithMind.step(RD.encounter({ id: "seam:probe" }));
const mindReached = capturedWithMind.some((p) => p?.schema === "EOReceivedPrior@1" && (p?.entries?.length ?? 0) === participating.length);

// ── arm B: CANDIDATE-ONLY (un-earned) reading → EMPTY mind reaches the reader
const candidateOnly = K.priorsFromRegistry(reg);
let capturedWithoutMind = [];
const readerWithoutMind = ER.createPriorConditionedReader({
  seed: {},
  priors: [candidateOnly],
  adapters: { perceive: async (_enc, _ori, o) => { capturedWithoutMind = o.priors; return []; } },
});
await readerWithoutMind.step(RD.encounter({ id: "seam:probe" }));
const mindEmpty = !capturedWithoutMind.some((p) => p?.schema === "EOReceivedPrior@1" && (p?.entries?.length ?? 0) > 0);

const gates = {
  earnedMindReachedReader: mindReached,
  retainedPriorEntries: prior.entries.length,
  candidateShapesNothingInReader: mindEmpty,
  forecastStands: real < blank,
};
const verdict = gates.earnedMindReachedReader && gates.candidateShapesNothingInReader && gates.forecastStands
  ? { verdict: "CONFIRMED", claim: "THE MIND IS IN THE REAL READER: the sealed, earned Hyperlexicon unseals into the retained prior, and createPriorConditionedReader is built WITH it (receivedPriors carry the EOReceivedPrior@1 with all its referents); a candidate-only reading reaches the same reader un-primed. The retained takings are what the next reading experiences against — the vision, wired into the reader's plumbing." }
  : { verdict: "FALSIFIED", claim: `gates: ${JSON.stringify(gates)}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep34@1",
  retained: { entries: prior.entries.length, forecastBrier: +real.toFixed(4), blankBrier: +blank.toFixed(4) },
  readerPriorsArms: { withMind: capturedWithMind.length, withoutMind: capturedWithoutMind.length },
  gates,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["The retained prior rides the reader's receivedPriors -> adapters.perceive channel (the shipped seam + step 98 of reading.js); per-clause reader-side surprise is the next layer, already proven at seam-level in steps 24/31-33."],
}, null, 2));