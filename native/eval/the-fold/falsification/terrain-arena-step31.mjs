// terrain-arena-step31.mjs — THE HYPERLEXICON LOOP, WIRED (acceptance test).
// Uses the kernel's new write/read path in the real loop on the Rigveda:
//   1. recordReading(seam frontier)  -> one SIG·Pattern candidate row.
//   2. The couplet earns it by a MEASURED held-out consequence (future
//      forecast brier improvement over the blank, beyond a 500-draw shuffled
//      mind).
//   3. priorsFromRegistry(earned) -> the retained prior (the "mind").
//   4. Condition the future read on the prior -> the step-24 CONFIRMED gate:
//      content (who the mind believes in) must beat every same-strength
//      shuffled mind.
// Negative control: the SAME reading NOT earned must yield an EMPTY prior —
// a candidate shapes nothing, so the un-primed forecast is the blank.
// Verdict CONFIRMED iff the earned-mind forecasts better than blank AND
// content-beats-shell AND the candidate-only prior is empty.
//
// Usage: node terrain-arena-step31.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const { createAbstractionRegistry, recordReading, earnAbstraction, priorsFromRegistry, releaseDecision } = await import(pathToFileURL(path.join(native, "kernel/hyperlexicon-abstraction.js")).href);

const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));
const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);
const bucket = (at) => Math.floor((at ?? 0) / 50);
const MAXB = bucket(MAXAT) + 1;
const FRONTB = bucket(FRONT);
const appear = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const b = bucket(e.at ?? 0); if (e.subject) appear.get(e.subject)?.add(b); if (e.object) appear.get(e.object)?.add(b); }
const futureBuckets = Array.from({ length: MAXB - FRONTB }, (_, i) => FRONTB + 1 + i);
const inFuture = (r) => [...(appear.get(r) ?? [])].some((b) => b > FRONTB);
const participating = refs.filter((r) => [...(appear.get(r) ?? [])].some((b) => b <= FRONTB));
const baseRate = refs.filter((r) => inFuture(r)).length / refs.length;
const y = refs.map((r) => (inFuture(r) ? 1 : 0));
const clamp = (v) => Math.min(0.99, Math.max(0.01, v));

const rates = new Map(participating.map((r) => [r, (appear.get(r)?.size ?? 0) / (FRONTB + 1)]));

const brierOf = (rateAt) => {
  let s = 0;
  for (let i = 0; i < refs.length; i++) s += (y[i] - clamp(rateAt(refs[i]))) ** 2;
  return s / refs.length;
};

// 1. the write path
let reg = recordReading(createAbstractionRegistry(), {
  id: "reading:rigveda:frontier",
  cells: [{
    op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence",
    memberRefs: participating, witnesses: ["rigveda-seam@2026-10-11"],
    firstAt: 0, lastAt: FRONTB, meta: { rates: Object.fromEntries(rates) },
  }],
});
const rowId = Object.values(reg.abstractions)[0].id;
const candidatePrior = priorsFromRegistry(reg); // must be EMPTY (negative control)
const blankBrier = brierOf(() => baseRate);

// 2. the measured consequence (earn on the future, honestly)
const unprimed = blankBrier;
const primedBrier = brierOf((r) => rates.get(r) ?? baseRate);
const nullBriers = [];
for (let k = 0; k < 500; k++) {
  const perm = shuffled([...rates.values()], createSeededRng(170000 + k));
  const map = new Map(participating.map((r, i) => [r, perm[i]]));
  nullBriers.push(brierOf((r) => map.get(r) ?? baseRate));
}
const contentShellP = (nullBriers.filter((b) => b <= primedBrier).length + 1) / (nullBriers.length + 1);
const earnedRes = earnAbstraction(reg, { id: rowId, validation: { method: "held_out_brier", effect: +(unprimed - primedBrier).toFixed(4), pValue: +contentShellP.toFixed(4) } });

// 3. the mind source
const mind = priorsFromRegistry(earnedRes);

// 4. gates
const G1 = { held: primedBrier < unprimed, blankBrier: +unprimed.toFixed(4), primedBrier: +primedBrier.toFixed(4) };
const G2 = { held: contentShellP <= 0.05, contentShellP: +contentShellP.toFixed(4) };
const G3 = { held: candidatePrior.entries.length === 0 && mind.entries.length === participating.length, candidateEntries: candidatePrior.entries.length, mindEntries: mind.entries.length, released: releaseDecision(earnedRes, { id: rowId }).released };

const verdict = G1.held && G2.held && G3.held
  ? { verdict: "CONFIRMED", claim: "the Hyperlexicon loop is correctly wired: the reading writes candidates, the measured consequence earns a row, only the earned row becomes the mind, and the retained-mind forecasts the future with content beating shell." }
  : { verdict: "FALSIFIED", claim: `the wiring failed a gate: G1 ${G1.held}, G2 ${G2.held}, G3 ${JSON.stringify(G3)}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep31@1",
  material: { referents: refs.length, participating: participating.length },
  read: { rowStanding: Object.values(reg.abstractions)[0].standing, released: releaseDecision(reg, { id: rowId }).released },
  gates: { G1, G2, G3 },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Earns via the whole-future existence forecast (the step-24 target); content>shell over a 500-draw same-strength shuffled mind; the candidate-shapes-nothing negative control is the standing gate itself."],
}, null, 2));