// kernel/trail-rules.js — when a trail becomes a RULE, and the rules about rules.
// Handle: Wilson (kernel/stigmergy.js) — the colony's trail is a pointer that fades; a rule is what a trail earns by beating chance on later evidence.
//
// WHAT THIS ADDS. stigmergy.js deposits, evaporates, vetoes and scouts. It never says when a route has EARNED a standing order. formicary.mjs lists promotion as
// "not built here" and points at the held-out check of pharos/docs/PROPOSAL-SIG-FOLD.md. This is that check for trails, pure: no clock, no file, no network.
//
// THE RULE (M4). A route is promoted for a head only if, on BOTH the earlier two thirds (the nomination) and the later third (held out), its number of resolved
// deposits is STRICTLY MORE than the most any of PROMOTE_NULL_N seeded shuffles of the resolved/unresolved labels gives it. Nothing is typed as a threshold:
// the null sets the bar. A small sample cannot clear it, so no minimum count is typed either. A route that is the head's only route has nothing to be better than.
// An alarm (a wrong answer) first forgets everything that route had deposited before it (the kernel's own rule), so a vetoed route is demoted unless it earns the standing again.
//
// WHAT IT DOES NOT DO. It does not change an answer: promotion is about READ ORDER and about what may be written down as a rule; the formicary law still holds (a
// permutation, never a filter). It does not write anywhere: `ruleEntry` only SHAPES the entry, and the caller weaves it, by cell and kind, into the shared log.
// Falsified if: chance labels promote at a rate that is not small (the test measures it), or the same log and seed give two verdicts.
import { createHash } from "node:crypto";

export const TRAIL_RULES_SCHEMA = "TrailRules@1";
export const PROMOTE_NULL_N = 2000;      // shuffles; the bar is the maximum over these, so more shuffles only make the bar harder to clear
const INSTRUMENT = "trail-rules@1";

/** A small seeded generator (mulberry32): the same seed, the same shuffles, so a verdict can be re-derived from the log. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = (head, route, n) => createHash("sha256").update(`${head}\0${route}\0${n}`).digest().readUInt32BE(0);

/** hits of `route` in `rows`, and the most it gets under `N` shuffles of the ok labels (route labels held fixed). */
function against(rows, route, rng, N) {
  const idx = []; rows.forEach((r, i) => { if (r.route === route) idx.push(i); });
  const ok = rows.map((r) => (r.ok ? 1 : 0)), obs = idx.reduce((s, i) => s + ok[i], 0);
  let max = -1; const a = ok.slice();
  for (let k = 0; k < N; k++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    let h = 0; for (const i of idx) h += a[i]; if (h > max) max = h;
  }
  return { obs, nullMax: max, n: idx.length, routes: new Set(rows.map((r) => r.route)).size };
}

/**
 * promoteRoute(deposits, head, route, { vetoes, seed, nullN }) -> { schema, head, route, state, why, obs, nullMax, nullN, train, test, seed }
 *   deposits  [{ head, route, ok, at }] (extra fields ignored); only this head's are read
 *   vetoes    { route: at } an alarm: that route's deposits at or before `at` are forgotten
 *   state     "promoted" | "undecided" | "demoted" (a vetoed route that does not earn the standing again)
 * obs / nullMax are for the HELD-OUT third (the one that decides); `train` and `test` are the deposit counts of the two parts.
 */
export function promoteRoute(deposits, head, route, { vetoes = {}, seed = null, nullN = PROMOTE_NULL_N } = {}) {
  const vetoAt = vetoes?.[route];
  const rows = (deposits ?? []).filter((d) => d && d.head === head && !(vetoAt != null && d.route === route && Number(d.at) <= vetoAt)).map((d) => ({ route: d.route, ok: !!d.ok, at: Number(d.at) || 0 })).sort((a, b) => a.at - b.at);
  const s = seed ?? seedOf(head, route, rows.length), rng = mulberry32(s), cut = Math.ceil((rows.length * 2) / 3), early = rows.slice(0, cut), late = rows.slice(cut);
  const out = (state, why, extra = {}) => ({ schema: TRAIL_RULES_SCHEMA, head, route, state: state === "undecided" && vetoAt != null ? "demoted" : state, why: state === "undecided" && vetoAt != null ? `alarm at ${vetoAt}: ${why}` : why, obs: 0, nullMax: 0, nullN, train: early.length, test: late.length, seed: s, ...extra });
  if (!rows.some((r) => r.route === route)) return out("undecided", "this route has no deposits left");
  if (new Set(rows.map((r) => r.route)).size < 2) return out("undecided", "no other route has been tried, so there is nothing to be better than");
  const a = against(early, route, rng, nullN);
  if (!(a.obs > a.nullMax && a.n > 0)) return out("undecided", `the nomination did not beat chance (${a.obs} resolved against a shuffled best of ${a.nullMax})`, { obs: a.obs, nullMax: a.nullMax });
  const b = against(late, route, rng, nullN);
  if (!(b.n > 0)) return out("undecided", "nominated, but the held-out third never tried this route");
  if (!(b.obs > b.nullMax)) return out("undecided", `nominated, but the held-out third did not beat chance (${b.obs} resolved against a shuffled best of ${b.nullMax})`, { obs: b.obs, nullMax: b.nullMax });
  return out("promoted", `beat the shuffled best on the nomination (${a.obs} > ${a.nullMax}) and on the held-out third (${b.obs} > ${b.nullMax})`, { obs: b.obs, nullMax: b.nullMax });
}

/** Every route of a head, judged. Reads only; the input is not changed. */
export function promoteHead(deposits, head, opts = {}) {
  const routes = [...new Set((deposits ?? []).filter((d) => d && d.head === head).map((d) => d.route))];
  return routes.map((r) => promoteRoute(deposits, head, r, opts));
}

/**
 * The entry a promotion becomes, by cell and kind, for whoever weaves it. It holds marks and numbers, never the question's words.
 * The cell is a PROPOSAL (EVA·Pattern: a pattern evaluated against a standard, here the null); the owner has not chosen it. `of` is left for the caller (the deposits it read).
 */
export const TRAIL_RULE_KIND = { name: "trail-rule", cell: "EVA·Pattern", why: "a route earned a standing order for a head: it beat a seeded shuffle on the nomination and on the held-out third (state may also be undecided or demoted)" };
export function ruleEntry(r, of = []) {
  const bad = (x) => typeof x !== "string" || !x.length || x.length > 160 || [...x].some((c) => c.trim() === "");
  if (bad(r?.head)) throw new Error("a head is marks, not text: one token of at most 160 characters");
  if (bad(r?.route)) throw new Error("a route is one token");
  return { cell: TRAIL_RULE_KIND.cell, kind: TRAIL_RULE_KIND.name, addr: `trail-rule:${r.head}|${r.route}`, of, basis: { instrument: INSTRUMENT, seed: r.seed, nullN: r.nullN },
    body: { head: r.head, route: r.route, state: r.state, why: r.why, obs: r.obs, nullMax: r.nullMax, nullN: r.nullN, train: r.train, test: r.test } };
}

// THE RULES ABOUT RULES (M6): declared once, as data, so they can be shown, tested and woven; each carries what would falsify it and where it is enforced.
// `built` is true only where the code is in this checkout; `enforcedBy` names the file and the test that checks it.
const rule = (id, name, text, falsifier, enforcedBy, built) => Object.freeze({ id, name, rule: text, falsifier, enforcedBy, built });
export const META_RULES = Object.freeze([
  rule("M1", "deposit on verified use", "A trail is laid only when a use was verified (the span was cut and its hash checked, or the answer was accepted); a lookup alone lays nothing.", "a deposit is accepted with no verified flag", "organs/formicary.mjs (lay) + organs/formicary.test.mjs", true),
  rule("M2", "alarm", "A wrong answer vetoes its route and forgets what the route had deposited before it; absence of a trail is never evidence against a route.", "a vetoed route still ranks by its old deposits, or an untried route is dropped", "organs/trail-store.mjs (veto) + organs/formicary.test.mjs", true),
  rule("M3", "evaporation", "Strength fades by the measured power law (weight = (1 + seconds)^-1.2), not a typed half-life; a ledger that never forgets is an archive.", "a recency or frequency order beats the power law on held-out reads", "kernel/stigmergy.js (law: power) + kernel/stigmergy.test.js", true),
  rule("M4", "promotion past a null", "A trail becomes a rule only if it beats the best of seeded shuffles on the nomination and on a held-out later third; no typed threshold, no typed minimum.", "chance labels promote at a rate that is not small, or one log and seed give two verdicts", "kernel/trail-rules.js (promoteRoute) + kernel/trail-rules.test.mjs", true),
  rule("M5", "scouts", "With some probability a route that is not first is tried first, so the colony cannot only exploit; the order is always a permutation of the candidates.", "scouts stop once every route has a deposit, or order() adds or drops a candidate", "kernel/stigmergy.js (scoutTried) + organs/formicary.test.mjs", true),
  rule("M6", "rules about rules are written down", "Every rule above is declared as data with its falsifier and shown beside the trails it governs; a promotion, a demotion and an alarm are entries in the shared log, never a silent flag.", "a rule changes state with no entry in the log", "kernel/trail-rules.js (META_RULES, ruleEntry); trail-store.mjs mirrors deposits and vetoes; WEAVING PROMOTIONS IS NOT WIRED", false),
]);
/** The table the panel shows: one row per rule. */
export const metaRuleTable = () => META_RULES.map((m) => ({ id: m.id, name: m.name, rule: m.rule, falsifier: m.falsifier, enforcedBy: m.enforcedBy, built: m.built }));
