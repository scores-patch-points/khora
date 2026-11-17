// POST-HOC DIAGNOSTIC (not preregistered, not shipped)
// organs/identity-warrant.js — IDENTITY DERIVED FROM GROUND, NOT DECLARED.
//
// lintGfp treats identity as a claim ("same-as") and merges two names only where that claim's ground reaches. But a
// declared same-as claim has no ground of its own: nothing says WHY the two names are one. This organ derives it.
//
// Leibniz, used asymmetrically: identicals are indiscernible, so ONE witnessed discernment between x and y proves them
// distinct (stable: more facts cannot undo it, only a retraction of the discerning claim can). Agreement never proves
// identity; it only supports it (provisional: the next fact can discern them). Nothing in common is neither: it is a
// typed gap, and the gap is returned as a HUNGER LIST, the facts whose fetching could decide the pair, live first.
//
//   warrantIdentity(claims, x, y, { at, functional, identity }) →
//     { verdict: "same" | "different" | "unjudged", x, y, at,
//       conflicts: [{ why: "one-valued" | "polarity", key, x: id, y: id, values? }],   — the warrant for "different"
//       agree:     [{ key, value, x: id, y: id }],                                      — the warrant for "same"
//       shared:    [{ key, x: id, y: id }],          — same fact, same polarity, NOT one-valued: weak, never decisive
//       hunger:    { live: [{ rel, slot, key, knownFor, missingFor, claims }], cold: [{ rel, slot }] } }
//   derivedIdentityClaim(w) → a same-as gfpClaim at w.at whose basis carries the verdict and the warrant ids, or null.
//   estimatePrior(claims, names, { functional }) → { rate, pairs } — the coreference rate among name pairs, by EM.
//
// THE STOP RULE (STOPRULE-PREREG.md). Agreement is cheap when values are common and coreference is rare, so "same" on
// bare agreement is mostly wrong. With a DECLARED prior (`prior: { rate }`), agreement is weighed: `strength` is the sum,
// over distinct agreeing one-valued keys, of log10(1/p) (p = how common the agreeing value is among the claims in scope);
// posterior odds = rate/(1-rate) x 10^strength. Then:
//   same       posterior >= target (default 0.95)        — and the derived claim carries strength, prior and posterior
//   unjudged   below target and something is left to fetch: the hunger list goes on (live first, then cold)
//   held       below target and every declared one-valued relation is known for both: indiscernible on every
//              observable. A typed gap, never a merge.
// This is Fellegi–Sunter record linkage (1969) with m = 1 (true facts always agree); the prior is its match proportion,
// estimated without truth by EM (Winkler). Without a declared prior, bare agreement still yields a provisional "same",
// so existing callers do not change meaning silently. `strength` is reported either way.
//
// The semantics are the kernel's own (kernel/gfp-claim.js, organs/reasoning-lint.js): a fact's KEY is its relation and
// its roles with the name replaced by a placeholder; one-valued roles come from the giver's `functional` declaration;
// "P and not-P" needs no declaration. Only claims whose ground overlaps `at` are read (siblings never meet).
// PURE: no I/O, no model, no clock.
import { gfpClaim, overlap, exactIdentity } from "../khora-lint/native/kernel/gfp-claim.js";

export const IDENTITY_WARRANT = "identity-warrant@1";
const SEP = "\u0001";

const valueRoles = (functional, idf) => new Map((functional || []).map((f) => (typeof f === "string" ? [idf(f), "ARG1"] : [idf(f.rel), f.role ?? "ARG1"])));

/** Every fact about `who`: one per non-value role the name fills. */
function factsOf(claims, who, idf, fn) {
  const W = idf(who), out = [];
  for (const c of claims) {
    const rel = idf(c.rel), valueRole = fn.get(rel) ?? null;
    const roles = Object.entries(c.roles);
    for (const [slot, v] of roles) {
      if (slot === valueRole || idf(v) !== W) continue;
      const other = (omitValue) => roles.filter(([k]) => k !== slot && !(omitValue && k === valueRole)).map(([k, x]) => `${k}=${idf(x)}`).sort();
      out.push({
        rel, slot, valueRole, polarity: c.polarity, id: c.id ?? null,
        fkey: [rel, `${slot}=§`, ...other(true)].join(SEP),   // the figure without the value: where a one-valued role is compared
        pkey: [rel, `${slot}=§`, ...other(false)].join(SEP),  // the whole claim: where P and not-P are compared
        value: valueRole && c.roles[valueRole] != null ? idf(c.roles[valueRole]) : null,
      });
    }
  }
  return out;
}

/** How common each value is, per one-valued relation, among the + claims given: log10(1/p) with Laplace smoothing. */
function rarity(claims, idf, fn) {
  const by = new Map();
  for (const c of claims) {
    const rel = idf(c.rel), vr = fn.get(rel);
    if (!vr || c.polarity !== "+" || c.roles[vr] == null) continue;
    const m = by.get(rel) || by.set(rel, new Map()).get(rel), v = idf(c.roles[vr]);
    m.set(v, (m.get(v) || 0) + 1);
  }
  return (rel, v) => { const m = by.get(rel) || new Map(); let n = 0; for (const k of m.values()) n += k; return Math.log10((n + m.size + 1) / ((m.get(v) || 0) + 1)); };
}

export function warrantIdentity(claims = [], x, y, { at = "/", functional = [], identity = exactIdentity, prior = null, target = 0.95, background = null } = {}) {
  const idf = identity, fn = valueRoles(functional, idf);
  const scoped = claims.filter((c) => c && c.rel && c.rel !== "same-as" && overlap(c.ground, at));
  const fx = factsOf(scoped, x, idf, fn), fy = factsOf(scoped, y, idf, fn);
  const conflicts = [], agree = [], shared = [];
  for (const a of fx) for (const b of fy) {
    if (a.pkey === b.pkey && a.polarity !== b.polarity) { conflicts.push({ why: "polarity", key: a.pkey, x: a.id, y: b.id }); continue; }
    if (a.valueRole && a.fkey === b.fkey && a.polarity === "+" && b.polarity === "+" && a.value != null && b.value != null) {
      if (a.value !== b.value) conflicts.push({ why: "one-valued", key: a.fkey, x: a.id, y: b.id, values: [a.value, b.value] });
      else agree.push({ key: a.fkey, value: a.value, x: a.id, y: b.id });
    } else if (!a.valueRole && a.pkey === b.pkey && a.polarity === b.polarity) shared.push({ key: a.pkey, x: a.id, y: b.id });
  }
  // strength of the coincidence: each DISTINCT agreeing key once, weighed by how rare its value is
  const notPair = (c) => !Object.values(c.roles).some((v) => idf(v) === idf(x) || idf(v) === idf(y));
  const rare = rarity((background ?? scoped).filter(notPair), idf, fn), seen = new Map(); // POST-HOC DIAGNOSTIC: rarity from a background corpus, leaving the pair out
  for (const a of agree) if (!seen.has(a.key)) seen.set(a.key, a.value);
  let strength = 0;
  for (const [key, value] of seen) strength += rare(key.split(SEP)[0], value);
  const rate = prior && Number.isFinite(prior.rate) ? Math.min(Math.max(prior.rate, 1e-9), 1 - 1e-9) : null;
  const odds = rate == null ? null : (rate / (1 - rate)) * 10 ** strength;
  const posterior = odds == null ? null : odds / (1 + odds);

  // THE HUNGER: one-valued facts known for one name and not the other could decide the pair with ONE fetch (live);
  // declared one-valued relations known for neither need two (cold).
  const live = [], cold = [];
  const known = (fs) => { const m = new Map(); for (const f of fs) if (f.valueRole && f.polarity === "+" && f.value != null) (m.get(f.fkey) || m.set(f.fkey, { rel: f.rel, slot: f.slot, ids: [] }).get(f.fkey)).ids.push(f.id); return m; };
  const kx = known(fx), ky = known(fy);
  for (const [key, k] of kx) if (!ky.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: x, missingFor: y, claims: k.ids });
  for (const [key, k] of ky) if (!kx.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: y, missingFor: x, claims: k.ids });
  const any = new Set([...kx.values(), ...ky.values()].map((k) => `${k.rel}${SEP}${k.slot}`));
  for (const [rel] of fn) if (!any.has(`${rel}${SEP}ARG0`)) cold.push({ rel, slot: "ARG0" });

  let verdict;
  if (idf(x) === idf(y)) verdict = "same";
  else if (conflicts.length) verdict = "different";
  else if (rate == null) verdict = agree.length ? "same" : "unjudged";             // no declared prior: the old meaning
  else if (agree.length && posterior >= target) verdict = "same";
  else verdict = live.length || cold.length ? "unjudged" : "held";
  const decided = verdict === "same" || verdict === "different";
  return Object.freeze({ verdict, x, y, at, conflicts, agree, shared, strength, prior: rate, posterior, target: rate == null ? null : target,
    hunger: decided ? { live: [], cold: [] } : { live, cold } });
}

/** The coreference rate among name pairs, estimated without truth (EM over pairs with at least one compared key).
 *  P(observations | same) = prod (agree ? 1-e : e); P(observations | distinct) = prod (agree ? p : 1-p). */
export function estimatePrior(claims = [], names = [], { functional = [], identity = exactIdentity, epsilon = 0.01, iters = 100 } = {}) {
  const idf = identity, fn = valueRoles(functional, idf), scoped = claims.filter((c) => c && c.rel && c.rel !== "same-as");
  const rare = rarity(scoped, idf, fn), p = (rel, v) => 10 ** -rare(rel, v);
  const keysOf = new Map(names.map((n) => { const m = new Map(); for (const f of factsOf(scoped, n, idf, fn)) if (f.valueRole && f.polarity === "+" && f.value != null && !m.has(f.fkey)) m.set(f.fkey, { rel: f.rel, value: f.value }); return [n, m]; }));
  const obs = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = keysOf.get(names[i]), b = keysOf.get(names[j]); let l1 = 1, l0 = 1, n = 0;
    for (const [key, va] of a) { const vb = b.get(key); if (!vb) continue; n++; const agreeV = va.value === vb.value; l1 *= agreeV ? 1 - epsilon : epsilon; l0 *= agreeV ? p(va.rel, va.value) : 1 - p(va.rel, va.value); }
    if (n) obs.push([l1, l0]);
  }
  let pi = 0.1;
  for (let t = 0; t < iters && obs.length; t++) { let s = 0; for (const [l1, l0] of obs) s += (pi * l1) / (pi * l1 + (1 - pi) * l0); pi = Math.min(Math.max(s / obs.length, 1e-6), 1 - 1e-6); }
  return { rate: pi, pairs: obs.length };
}

/** The derived identity, as an ordinary claim the lint and the partition can read. Only "same" yields one. */
export function derivedIdentityClaim(w, { rel = "same-as", id = null } = {}) {
  if (!w || w.verdict !== "same" || !w.agree.length) return null;
  const warrant = [...new Set(w.agree.flatMap((a) => [a.x, a.y]).filter(Boolean))].sort();
  return gfpClaim({ ground: w.at, rel, roles: { ARG0: w.x, ARG1: w.y }, id, basis: { derived: IDENTITY_WARRANT, verdict: "same", provisional: w.prior == null, agree: w.agree.length, strength: w.strength, prior: w.prior, posterior: w.posterior, warrant } });
}
