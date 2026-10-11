// terrain-arena-step33.mjs — JANUS ADJUDICATES THE LOOP (step 33).
// The step-31/32 wiring is re-run, but the evidence that EARNS/DEFEATS rows is
// now produced by the JANUS consequence organ (EOConsequenceVerdict@1), not
// hand-built in the arena. khora records and stores the takings; janus TESTS
// what follows from the record; khora routes (CON/DEF/REC) and surfaces.
//   argv: [khoraNative, janusNative]
// Gates — the loop is identical to step 32; only the provenance of the
// consequence changed: every heldOut fed to routeReadingOutcome is a janus
// verdict, schema-checked, and the lifecycle must still complete.
//
// Usage: node terrain-arena-step33.mjs /path/to/khora/native /path/to/janus

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const janus = path.resolve(process.argv[3] || "../../../janus");
const K = await import(pathToFileURL(path.join(native, "kernel/hyperlexicon-abstraction.js")).href);
const J = await import(pathToFileURL(path.join(janus, "native/organs/consequence.js")).href);

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
const rates = new Map(participating.map((r) => [r, (appear.get(r)?.size ?? 0) / (FRONTB + 1)]));
const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shufm = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// janus produces the real verdict (retained forecast vs the true future)
const conv = J.consequenceVerdict({ predictOf: (r) => rates.get(r) ?? 0, actualOf: (r) => (inFuture(r) ? 1 : 0), refs: participating, method: "held_out_future", witness: "rigveda-arena" });
// janus produces the adversarial verdict (same forecast, shuffled future = noise)
const noiseActual = (() => { const order = shufm([...participating], S(181000)); const set = new Set(order.slice(Math.floor(order.length * 0.6))); return (r) => (set.has(r) ? 1 : 0); })();
const adv = J.consequenceVerdict({ predictOf: (r) => rates.get(r) ?? 0, actualOf: noiseActual, refs: participating, method: "held_out_shuffled_future", seed: 2 });

// the loop, with JANUS verdicts as the only evidence
let reg = K.recordReading(K.createAbstractionRegistry(), {
  id: "reading:rigveda:frontier",
  cells: [{ op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence", memberRefs: participating, witnesses: ["rigveda-seam"], meta: { rates: Object.fromEntries(rates) } }],
});
const con = K.routeReadingOutcome(reg, { id: "abs:rigveda:recurrence", heldOut: conv });
const mind1 = K.priorsFromRegistry(con.registry).entries.length;
const def = K.routeReadingOutcome(con.registry, { id: "abs:rigveda:recurrence", heldOut: adv });
const mind0 = K.priorsFromRegistry(def.registry).entries.length;
const refused = K.routeReadingOutcome(def.registry, { id: "abs:rigveda:recurrence", heldOut: conv });
const rev = K.reviseReading(def.registry, { id: "abs:rigveda:recurrence", revision: { op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence:v2", memberRefs: participating, meta: { rates: Object.fromEntries(rates) } } });
const ree = K.routeReadingOutcome(rev.registry, { id: "abs:rigveda:recurrence:v2", heldOut: conv });
const mind2 = K.priorsFromRegistry(ree.registry).entries.length;

const gates = {
  verdictShape: conv.schema === J.CONSEQUENCE_SCHEMA && typeof conv.success === "boolean" && Number.isFinite(conv.effect) && Number.isFinite(conv.pValue) && conv.bar.effect === 0.15,
  janusDecidesEarning: conv.success && adv.success === false,
  con: con.acted === "promoted_con" && mind1 === participating.length && con.registry.abstractions["abs:rigveda:recurrence"].standing === "earned",
  def: def.acted === "defeated_def" && def.registry.abstractions["abs:rigveda:recurrence"].standing === "refuted" && mind0 === 0,
  rerouteRefused: refused.acted === "refused_refuted",
  recReEarn: rev.acted === "revised_rec" && ree.acted === "promoted_con" && mind2 === participating.length,
};
const verdict = Object.values(gates).every(Boolean)
  ? { verdict: "CONFIRMED", claim: "JANUS ADJUDICATES THE LOOP: khora records and stores; janus's consequence verdict (EOConsequenceVerdict@1, bar 0.15/0.05, 500-wall) decides earn and defeat; khora routes CON/DEF/REC and surfaces. The seam khora-settles -> janus-derives -> khora-surfaces is now a real call." }
  : { verdict: "FALSIFIED", claim: `gates: ${JSON.stringify(gates)}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep33@1",
  janusVerdicts: { real: { success: conv.success, effect: +conv.effect.toFixed(3), p: +conv.pValue.toFixed(3) }, adversarial: { success: adv.success, effect: +adv.effect.toFixed(3), p: +adv.pValue.toFixed(3) }, witness: conv.witness },
  loop: { con: con.acted, def: def.acted, reroute: refused.acted, rec: rev.acted, reEarn: ree.acted, mind: [mind1, mind0, mind2] },
  gates,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["The evidence is janus-produced (schema EOConsequenceVerdict@1, battery bar, 500-draw content-vs-shell wall); the routing consumes it verbatim — no arena hand-built consequence."],
}, null, 2));