// kernel/stigmergy.js — the pheromone layer of the hyperlexicon's routes.
// Handle: Wilson — after E.O. Wilson's The Ants: the ENVIRONMENT is the
// medium of communication. No ant plans the colony's route. Each ant that
// returns from a food source deposits a chemical trail in the shared
// environment; later ants read the deposits and follow the strongest; their
// own returns deposit again — positive feedback, evaporation, and the short
// path wins without anyone having computed it.
//
// This module is that layer, made pure: deposits (trail events), evaporation
// (age-weighted decay), aggregation (per-route strength over a head), and the
// LEARNED ORDER of the hyperlexicon's routes — the order hops are tried for a
// question. Nothing here knows what a route is about, what a "president" is,
// or who asked. It is stigmergy, not a fact table.
//
// DEPOSITS. A trail event is one resolution attempt, left IN the environment:
//   { head, route, ok, ms, at }
//   head   the role noun the question was about ("president", "mayor")
//   route  the hop type that was tried (hyperlexicon-routes.js owns the names)
//   ok     whether the hop resolved a row (a found food source)
//   ms     the resolution latency — the "compared for speed" number
//   at     epoch ms of the deposit
// Success deposits trail strength; failure deposits nothing (evaporation
// alone demotes it) — except the VETO channel below, which is a Wilsonian
// alarm trail: a claim found to CONFLICT with the environment demotes the
// row itself, because a wrong answer is an active danger, not an absence.
//
// EVAPORATION. A deposit's weight decays as a POWER of its age (the default,
// `law: "power"`): weight = max(1, ageSeconds) ** -0.5, the base-level rule of
// Anderson & Schooler (1991) / ACT-R. A route's strength is the sum over its
// successful deposits. This law was measured, not chosen: on 6,556 real
// agent file touches (ledgers/sig-real-use, prereg stamped 2026-11-14; a
// replication with independent code on the SAME transcripts in
// ledgers/sig-pointer-log, so it checks the extraction, not the law's
// generality), the chance a thing is
// used again falls as a power of the gap (slope about -1.2 in seconds; power
// R2 0.99 vs exponential 0.40-0.43), and the power sum pointed at the next
// read better than recency, an exponential sum or frequency (hit@8 39.7 vs
// 34.7, 33.6, 29.5). The exponent 0.5 is the pre-registered ACT-R value, not
// fitted. A power law needs no half-life: it is scale-free, so the only
// unit-dependence is the 1-second floor on age (a typed choice, disclosed).
// NOT MEASURED HERE: the law comes from agents re-reading FILES, not from
// hyperlexicon route resolutions. That it transfers to routes is an
// assumption; `law: "exp"` stays available to test it against.
// `law: "exp"` keeps exponential evaporation with a TRUE half-life:
//   weight = 2 ** (-ageDays / halfLifeDays). Before 2026-11-14 this was
//   exp(-ageDays / halfLifeDays), which left 0.37, not 0.5, after one
//   "half-life".
//
// LEARNED ORDER. For a head, each route's strength is the sum of its
// deposits' weights; ties are broken by mean latency (faster wins); routes
// with no deposits keep the structural default order, tried after every
// route that has ever earned a trail. A small exploration epsilon still
// lets a never-tried route be tried first (Wilson's scouts — without
// scouts the colony only ever exploits what it already knows).

const DAY_MS = 86400000;
export const EVAPORATION_LAW = "power";
export const POWER_DECAY = 0.5; // ACT-R base-level decay d; pre-registered, not fitted
export const TRAIL_HALF_LIFE_DAYS = 7;
export const STIGMERGY_SCHEMA = "EOStigmergy@1";
export const TRAIL_WINDOW = 128; // deposits kept per head — old ones evaporate out of the ledger
export const EXPLORE_EPSILON = 0.1; // chance a never-tried route is probed first

export const ageDays = (at, now) => Math.max(0, (now - at) / DAY_MS);

/** Evaporation: how much of a deposit from `at` is still in the air at `now`. */
export function trailWeight(at, now, { law = EVAPORATION_LAW, d = POWER_DECAY, halfLifeDays = TRAIL_HALF_LIFE_DAYS } = {}) {
  if (law === "power") return Math.max(1, (now - at) / 1000) ** -d;
  if (law === "exp") return halfLifeDays === Infinity ? 1 : 2 ** (-ageDays(at, now) / halfLifeDays);
  throw new Error(`unknown evaporation law: ${law}`);
}

/**
 * One deposit, appended to the shared trail ledger. The window is capped per
 * head (TRAIL_WINDOW): the oldest deposits evaporate out of the LEDGER, not
 * just out of the weights — a ledger that never forgets is not an
 * environment, it is an archive.
 */
export function deposit(trails, entry) {
  const t = { head: String(entry?.head ?? ""), route: entry?.route, ok: Boolean(entry?.ok), ms: Number(entry?.ms ?? 0), at: entry?.at ?? Date.now() };
  const list = [...(trails[t.head] ?? []), t];
  return { ...trails, [t.head]: list.slice(-TRAIL_WINDOW) };
}

/** The per-route reading of one head's trails, compared for speed and efficiency. */
export function trailStats(trails, head, { now = Date.now(), routes = null, halfLifeDays = TRAIL_HALF_LIFE_DAYS, law = EVAPORATION_LAW } = {}) {
  const list = trails?.[head] ?? [];
  const out = new Map();
  const blank = (r) => ({ route: r, strength: 0, deposits: 0, hits: 0, totalMs: 0, lastAt: -Infinity });
  for (const r of routes ?? []) out.set(r, blank(r));
  for (const t of list) {
    const s = out.get(t.route) ?? blank(t.route);
    s.deposits += 1;
    s.lastAt = Math.max(s.lastAt, Number(t.at) || 0);
    if (t.ok) { s.hits += 1; s.strength += halfLifeDays === Infinity ? 1 : trailWeight(t.at, now, { halfLifeDays, law }); s.totalMs += t.ms; }
    out.set(t.route, s);
  }
  return [...out.values()].map((s) => ({ ...s, meanMs: s.hits ? s.totalMs / s.hits : null }));
}

/**
 * The learned order of routes for a head, in three bands:
 *   1. EARNED   routes with a live successful trail (strength > 0): strongest
 *               first, equal strengths by mean latency (faster wins).
 *   2. UNTRIED  routes that have never deposited, in the structural default order.
 *   3. DEAD     routes that were tried and hold no live success (every try
 *               failed, or its successes have evaporated), least recently
 *               tried first.
 * Before 2026-11-14 band 3 sorted AHEAD of band 2, because any deposit counted
 * as "tried": a route that only ever failed was walked before any route never
 * tried. `deadLast: false` restores that order.
 *
 * SCOUTS. With probability `explore` one route is probed first: a never-tried
 * route if any, else (`scoutTried`, default on) the least recently tried route
 * not already first. Before 2026-11-14 scouts only probed never-tried routes,
 * so once every route had a deposit exploration stopped for good: the army-ant
 * mill, a trail that reinforces itself with no exit. `scoutTried: false`
 * restores that. `explore: 0` turns scouts off. The rng is injectable.
 * `law` sets evaporation: "power" (default, measured) or "exp" (with
 * `halfLifeDays`); `halfLifeDays: Infinity` = none under either law.
 */
export function routeOrderFor(trails, head, { now = Date.now(), routes = null, explore = EXPLORE_EPSILON, rng = Math.random, halfLifeDays = TRAIL_HALF_LIFE_DAYS, law = EVAPORATION_LAW, deadLast = true, scoutTried = true } = {}) {
  const defaults = routes ?? [];
  const idx = (r) => { const i = defaults.indexOf(r); return i < 0 ? Infinity : i; };
  const stats = trailStats(trails, head, { now, routes: defaults, halfLifeDays, law });
  const byStrength = (a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    if (a.meanMs !== null && b.meanMs !== null && a.meanMs !== b.meanMs) return a.meanMs - b.meanMs;
    return idx(a.route) - idx(b.route);
  };
  const untried = stats.filter((s) => s.deposits === 0).sort((a, b) => idx(a.route) - idx(b.route));
  let order;
  if (deadLast) {
    const earned = stats.filter((s) => s.deposits > 0 && s.strength > 0).sort(byStrength);
    const dead = stats.filter((s) => s.deposits > 0 && !(s.strength > 0)).sort((a, b) => a.lastAt - b.lastAt || idx(a.route) - idx(b.route));
    order = [...earned, ...untried, ...dead].map((s) => s.route);
  } else {
    order = [...stats.filter((s) => s.deposits > 0).sort(byStrength), ...untried].map((s) => s.route);
  }
  if (!(explore > 0) || order.length < 2 || !(rng() < explore)) return order;
  const scout = untried[0]?.route
    ?? (scoutTried ? stats.filter((s) => s.route !== order[0]).sort((a, b) => a.lastAt - b.lastAt || idx(a.route) - idx(b.route))[0]?.route : null);
  return scout ? [scout, ...order.filter((r) => r !== scout)] : order;
}