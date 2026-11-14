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
// EVAPORATION. Two laws; the caller chooses with `law`.
//   "exp" (default): weight = 2 ** (-ageDays / halfLifeDays), a TRUE half-life
//     (default 7 days, a typed constant). Before 2026-11-14 this was
//     exp(-ageDays / halfLifeDays), which left 0.37, not 0.5, after one
//     "half-life".
//   "power": weight = max(1, ageSeconds) ** -d, d = 0.5, summed over a route's
//     successful deposits: the base-level rule of Anderson & Schooler (1991) /
//     ACT-R. Measured on real agent FILE re-use (ledgers/sig-real-use, prereg
//     stamped 2026-11-14, replicated with independent code on the same
//     transcripts): re-use falls as a power of the gap, and the power sum at the
//     pre-registered d = 0.5 IN POSITIONS pointed at the next read best (hit@8
//     39.7 vs recency 34.7, exp sum 33.6, frequency 29.5). In SECONDS, as here,
//     d = 0.5 gave 37.9 (exploratory, not pre-registered); d near 1.2 gave about
//     35, no better than recency.
// Why "exp" stays the default: the same study found recency beat the power
// sum on the Premiere replay stream (hit@8 97.3 vs 64.8), so no single law is
// earned across kinds of things, and none has been measured on route
// resolutions. A caller should declare its law once it is measured on its own
// traffic. Size of the difference: a day-old deposit weighs 0.91 under "exp"
// and 0.0034 under "power"; under "power" one fresh deposit outweighs about
// 290 day-old ones, so "power" behaves close to recency over days.
// Deposits stamped in the future (clock skew) are treated as age 0 under both
// laws (weight 1), as before. Callers that stamp every deposit with the `now`
// they read at (age 0 for all) get a plain count under either law.

// LEARNED ORDER. For a head, each route's strength is the sum of its
// deposits' weights; ties are broken by mean latency (faster wins); routes
// with no deposits keep the structural default order, tried after every
// route that has ever earned a trail. A small exploration epsilon still
// lets a never-tried route be tried first (Wilson's scouts — without
// scouts the colony only ever exploits what it already knows).

const DAY_MS = 86400000;
export const EVAPORATION_LAW = "exp"; // default; "power" is opt-in (see EVAPORATION above)
export const POWER_DECAY = 0.5; // ACT-R base-level decay d; the pre-registered value, not fitted
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
 * `law` sets evaporation: "exp" (default, with `halfLifeDays`) or "power"
 * (measured on file re-use, not on routes); `halfLifeDays: Infinity` = none.
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