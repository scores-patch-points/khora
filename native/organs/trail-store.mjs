// organs/trail-store.mjs — THE SHARED ENVIRONMENT: trails that outlive one call and are read by every session on this machine.
// Handle: Wilson/Grassé (kernel/stigmergy.js): nobody plans the route; whoever came back with food left a trail, later ones follow the strongest,
// trails evaporate, and a few scouts still try the other ways. This file is the part the kernel leaves to its caller: where the trails live.
//
// A TRAIL STORE holds three things, and nothing else is shared between the parts of the system that use it:
//   deposits   { head, route, ok, ms, at }   one attempt: which route was tried for which head, whether it resolved, what it cost
//   vetoes     head -> route -> at           an alarm: this route gave a WRONG answer; everything it had deposited before is forgotten
//   marks      name -> { until, at }         a thing about the world other users of it should know ("Wikipedia is throttling us until ...")
// The file is read before a mark is consulted and merged before it is written, so two sessions that never call each other still see each other's
// marks: the environment is the message. The store knows nothing about what a head or a route is about.
//
// EVERY MARK IS ALSO OFFERED to `onMark` (the caller's own writer to the shared log, pharos), so the trail is a record and not only a cache.
import fs from "node:fs"; import path from "node:path"; import os from "node:os";
import { deposit as kDeposit, trailStats, routeOrderFor, TRAIL_HALF_LIFE_DAYS } from "../kernel/stigmergy.js";

export const TRAIL_STORE_SCHEMA = "TrailStore@1";
const merge = (a, b) => {
  const out = { trails: {}, vetoes: {}, marks: {} };
  for (const src of [a, b]) {
    for (const [h, list] of Object.entries(src.trails ?? {})) { const seen = new Set((out.trails[h] ?? []).map((t) => `${t.route}|${t.at}|${t.ok}`)); out.trails[h] = [...(out.trails[h] ?? []), ...list.filter((t) => !seen.has(`${t.route}|${t.at}|${t.ok}`))].sort((x, y) => x.at - y.at).slice(-128); }
    for (const [h, m] of Object.entries(src.vetoes ?? {})) for (const [r, at] of Object.entries(m)) { out.vetoes[h] ??= {}; out.vetoes[h][r] = Math.max(out.vetoes[h][r] ?? 0, at); }
    for (const [k, m] of Object.entries(src.marks ?? {})) out.marks[k] = !out.marks[k] || (m.at ?? 0) >= (out.marks[k].at ?? 0) ? m : out.marks[k];
  }
  return out;
};

export function makeTrailStore({ name = "default", file = null, now = () => Date.now(), halfLifeDays = TRAIL_HALF_LIFE_DAYS, persist = true, onMark = null } = {}) {
  const f = file ?? path.join(os.homedir(), ".khora", "trails", `${name}.json`);
  let mem = { trails: {}, vetoes: {}, marks: {} }, seen = 0;
  const disk = () => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return { trails: {}, vetoes: {}, marks: {} }; } };
  const refresh = () => { if (!persist) return; try { const m = fs.statSync(f).mtimeMs; if (m !== seen) { mem = merge(mem, disk()); seen = m; } } catch { /* no file yet */ } };
  const save = () => { if (!persist) return; try { fs.mkdirSync(path.dirname(f), { recursive: true }); mem = merge(mem, disk()); const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify({ schema: TRAIL_STORE_SCHEMA, ...mem })); fs.renameSync(tmp, f); seen = fs.statSync(f).mtimeMs; } catch { /* the environment is additive: a miss never blocks an answer */ } };
  const tell = (m) => { try { onMark?.({ schema: TRAIL_STORE_SCHEMA, store: name, ...m }); } catch { /* the log is additive too */ } };
  refresh();

  /** the head's deposits that came after any alarm on their route */
  const live = (head) => { refresh(); const v = mem.vetoes[head] ?? {}; return { [head]: (mem.trails[head] ?? []).filter((t) => t.at > (v[t.route] ?? -Infinity)) }; };

  return {
    name, file: f,
    /** one attempt, left in the environment; a success strengthens the route, a failure is a deposit that earns nothing (it only marks the route as tried) */
    deposit(head, route, ok = true, ms = 0) { refresh(); const at = now(); mem.trails = kDeposit(mem.trails, { head, route, ok, ms, at }); save(); tell({ kind: "trail-deposit", head, route, ok, ms, at }); },
    /** an alarm: this route gave a wrong answer for this head; what it deposited before no longer counts */
    veto(head, route, why = null) { refresh(); const at = now(); (mem.vetoes[head] ??= {})[route] = at; save(); tell({ kind: "trail-veto", head, route, why, at }); },
    /** per-route strength with evaporation: [{ route, strength, deposits, hits, meanMs }] */
    stats(head, routes = null) { return trailStats(live(head), head, { now: now(), routes, halfLifeDays }); },
    /** the learned order of `routes` for `head`: earned routes strongest first, then untried, then dead; a scout sometimes goes first */
    orderFor(head, routes, { explore, rng = Math.random } = {}) { return routeOrderFor(live(head), head, { now: now(), routes, rng, halfLifeDays, ...(explore != null ? { explore } : {}) }); },
    /** routes with a live success, strongest first */
    known(head) { return this.stats(head).filter((s) => s.strength > 0).sort((a, b) => b.strength - a.strength).map((s) => s.route); },
    /** a thing about the world, for everyone who reads this store: `until` is an epoch ms */
    mark(key, until, why = null) { refresh(); const at = now(); mem.marks[key] = { until, at, why }; save(); tell({ kind: "trail-mark", key, until, why, at }); },
    /** the live mark under `key`, with what it said, or null */
    markOf(key) { refresh(); const m = mem.marks[key]; return m && m.until > now() ? m : null; },
    /** was this route given an alarm for this head within the last `withinMs`? (an alarm that is only a thread's own, and fades with the thread) */
    vetoed(head, route, withinMs = Infinity) { refresh(); const at = mem.vetoes[head]?.[route]; return !!at && now() - at <= withinMs; },
    markedUntil(key) { refresh(); const m = mem.marks[key]; return m && m.until > now() ? m.until : 0; },
    snapshot() { refresh(); return JSON.parse(JSON.stringify(mem)); },
  };
}
