// try-hyperlex.mjs — THE HYPERLEXICON, RUN. A live drive of the shipped kernel
// facade (native/kernel/index.js) through the reading loop on the real Rigveda:
// read -> earn (CON) -> mind -> surface -> seal -> adversarial defeat (DEF) ->
// revise (REC) -> re-earn, then conditioned-surprise on the restored mind.
// Usage: node try-hyperlex.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const K = await import(pathToFileURL(path.join(native, "kernel/index.js")).href);
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);

const { recordReading, routeReadingOutcome, reviseReading, priorsFromRegistry, surfaceKinds, sealMind, unsealMind, releaseDecision } = K;

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
const baseRate = refs.filter((r) => inFuture(r)).length / refs.length;
const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
const rates = new Map(participating.map((r) => [r, (appear.get(r)?.size ?? 0) / (FRONTB + 1)]));
const brier = (map) => { let s = 0; for (let i = 0; i < refs.length; i++) s += ((inFuture(refs[i]) ? 1 : 0) - clamp(map.get(refs[i]) ?? baseRate)) ** 2; return s / refs.length; };
const blank = brier(new Map());
const real = brier(rates);
const S = (seed) => { let ss = seed + 0x6D2B79F5; return () => { ss = (ss + 0x6D2B79F5) >>> 0; let q = ss; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shufm = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const bad = (() => { const perm = shufm([...rates.values()], S(179000)); const map = new Map(participating.map((r, i) => [r, perm[i]])); return brier(map); })();

const trace = [];
trace.push("HYPERLEXICON — RUN (Rigveda seam)");

// 1. WRITE
let reg = recordReading(K.createAbstractionRegistry(), {
  id: "reading:rigveda:frontier",
  cells: [{ op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence", memberRefs: participating, witnesses: ["rigveda-seam"], meta: { rates: Object.fromEntries(rates) } }],
});
trace.push(`WRITE   candidate "${"abs"}" released=${releaseDecision(reg, { id: "abs:rigveda:recurrence" }).released}`);

// 2. EARN (CON)
const con = routeReadingOutcome(reg, { id: "abs:rigveda:recurrence", heldOut: { method: "held_out_future", success: true, effect: +(blank - real).toFixed(4), pValue: 0.01 } });
const mind1 = priorsFromRegistry(con.registry);
trace.push(`EARN    ${con.acted} standing=${con.registry.abstractions["abs:rigveda:recurrence"].standing} forecast brier ${real.toFixed(4)} vs blank ${blank.toFixed(4)} — MIND=${mind1.entries.length} referents`);

// 3. SURFACE (only released)
const gate = surfaceKinds(con.registry, [{ id: "abs:rigveda:recurrence" }, { id: "kind:cheap" }]);
trace.push(`SURFACE surfaced=${gate.surfaced.length} (recurrence) withheld=${gate.withheld.map((w) => w.standing + ":" + w.kind.id).join(", ")}`);

// 4. SEAL + RESTORE
const seal = sealMind(con.registry, { giver: "rigveda" });
const back = unsealMind(seal);
trace.push(`SEAL    ${seal.schema} hash=${seal.hash.slice(0, 10)}… restore ok=${back.ok} prior lanes=${back.prior.entries.length}`);

// 5. ADVERSARIAL DEFEAT (DEF) — mind withdraws
const def = routeReadingOutcome(back.registry, { id: "abs:rigveda:recurrence", heldOut: { method: "held_out_shuffled", success: false, effect: +(real - bad).toFixed(3) } });
const mindAfterDefeat = priorsFromRegistry(def.registry);
trace.push(`DEFEAT  ${def.acted} standing=${def.registry.abstractions["abs:rigveda:recurrence"].standing} retained=${def.registry.abstractions["abs:rigveda:recurrence"].retractions.length} — MIND=${mindAfterDefeat.entries.length} (withdrawn)`);
const refused = routeReadingOutcome(def.registry, { id: "abs:rigveda:recurrence", heldOut: { method: "re-promotion", success: true, effect: 0.9, pValue: 1e-6 } });
trace.push(`RE-PROMOTE → ${refused.acted} (a defeat never silently re-earns)`);

// 6. REVISION (REC) + REEARN
const rev = reviseReading(def.registry, { id: "abs:rigveda:recurrence", revision: { op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:rigveda:recurrence:v2", memberRefs: participating, meta: { rates: Object.fromEntries(rates) } } });
trace.push(`REVISE  ${rev.acted} old retained refuted; v2 candidate prior=${priorsFromRegistry(rev.registry).entries.length} (shapes nothing)`);
const ree = routeReadingOutcome(rev.registry, { id: "abs:rigveda:recurrence:v2", heldOut: { method: "held_out_future", success: true, effect: +(blank - real).toFixed(4), pValue: 0.01 } });
trace.push(`RE-EARN ${ree.acted} standing=${ree.registry.abstractions["abs:rigveda:recurrence:v2"].standing} MIND=${priorsFromRegistry(ree.registry).entries.length}`);

// 7. CONDITIONED SURPRISE (the mind changes the read)
const restored = unsealMind(sealMind(ree.registry));
const prior = priorsFromRegistry(restored.registry);
let primedSurprise = 0, unprimedSurprise = 0, n = 0;
for (const r of refs) { const p = prior.entries.find((e) => e.referent === r)?.rate ?? baseRate; const y = inFuture(r) ? 1 : 0; primedSurprise += y === 1 ? -Math.log2(clamp(p)) : -Math.log2(1 - clamp(p)); unprimedSurprise += y === 1 ? -Math.log2(clamp(baseRate)) : -Math.log2(1 - clamp(baseRate)); n++; }
trace.push(`CONDITION unprimed surprise ${(unprimedSurprise / n).toFixed(3)} / primed ${(primedSurprise / n).toFixed(3)} — the retained mind changes how the future reads`);

console.log(trace.join("\n"));