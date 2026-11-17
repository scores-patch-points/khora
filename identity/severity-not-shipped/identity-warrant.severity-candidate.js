// organs/identity-warrant.js — IDENTITY DERIVED FROM GROUND, NOT DECLARED.
//
// lintGfp treats identity as a claim ("same-as") and merges two names only where that claim's ground reaches. But a
// declared same-as claim has no ground of its own: nothing says WHY the two names are one. This organ derives it.
//
// Leibniz, used asymmetrically: identicals are indiscernible, so ONE witnessed discernment between x and y proves them
// distinct (on true facts). Agreement never proves identity; it only supports it. Nothing in common is neither: it is a
// typed gap, returned as a HUNGER LIST, the facts whose fetching could decide the pair, live first.
//
//   warrantIdentity(claims, x, y, { at, functional, identity, prior, target, background }) →
//     { verdict: "same" | "different" | "unjudged" | "held", x, y, at, conflicts, agree, shared,
//       strength, prior, posterior, target, hunger: { live, cold } }
//   derivedIdentityClaim(w) → a same-as gfpClaim at w.at whose basis carries the verdict and the warrant, or null.
//   estimatePrior(claims, names, { functional }) → { rate, pairs } — the coreference rate among name pairs, by EM.
//
// THE STOP RULE (STOPRULE3-PREREG.md): a sequential probability ratio test (Wald, 1945) over Fellegi–Sunter weights
// (1969). Agreement is cheap when values are common and coreference is rare. With a DECLARED prior (`prior: { rate }`):
//   strength   log10 likelihood ratio over DISTINCT compared one-valued keys: an agreement on value v adds
//              log10(1 / p(v)). Any discernment is decisive: facts are taken as TRUE.
//   p(v)       how common v is for that relation in the CORPUS (`background`, else the claims in scope).
//   same       posterior >= target and at least one agreement (the upper boundary)
//   different  a discernment (stable on true facts)
//   unjudged   between the boundaries, and something is left to fetch: the hunger goes on (live first, then cold)
//   held       between the boundaries, and every declared one-valued relation is known for both: indiscernible on
//              every observable. A typed gap, never a merge.
// THE MOST SEVERE TEST FIRST (SEVERITY-PREREG.md; Popper, Mayo). Every hunger item carries `severity`: the probability
// it refutes "x and y are one" if they are in fact distinct. A fact known for one name with value v, missing for the
// other: 1 - p(v), one fetch. A relation known for neither: 1 - sum p^2 (a chance collision), two fetches. `hunger.next`
// is the item with the highest severity per fetch: attempt the hardest refutation first.
// NOISE IS NOT SUPPORTED. With wrong facts, one disagreement must be evidence, not proof (m < 1). Round three tested that
// mode as a Wald boundary on the evidence: error rates held (false merges <= 0.027, false splits <= 0.037 at 10% noise)
// but recall was 0.75, under the preregistered 0.80 (STOPRULE3-RESULTS.md), so it is not shipped. Passing `noise` throws.
// The prior can be estimated without truth by EM (Winkler), leaving each pair's own claims out. Without a declared
// prior, bare agreement yields a provisional "same" as before, so existing callers do not change meaning silently.
//
// The semantics are the kernel's own (kernel/gfp-claim.js, organs/reasoning-lint.js): a fact's KEY is its relation and
// its roles with the name replaced by a placeholder; one-valued roles come from the giver's `functional` declaration;
// "P and not-P" needs no declaration. Only claims whose ground overlaps `at` are read (siblings never meet).
// PURE: no I/O, no model, no clock.
import { gfpClaim, overlap, exactIdentity } from "../kernel/gfp-claim.js";

export const IDENTITY_WARRANT = "identity-warrant@3";
const SEP = "\u0001";

const valueRoles = (functional, idf) => new Map((functional || []).map((f) => (typeof f === "string" ? [idf(f), "ARG1"] : [idf(f.rel), f.role ?? "ARG1"])));
const usable = (c) => c && c.rel && c.rel !== "same-as";
const naming = (idf, ...who) => { const W = new Set(who.map((w) => idf(w))); return (c) => Object.values(c.roles).some((v) => W.has(idf(v))); };

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

/** Value counts per one-valued relation over the + claims given. */
function valueTable(claims, idf, fn) {
  const by = new Map();
  for (const c of claims) {
    const rel = idf(c.rel), vr = fn.get(rel);
    if (!vr || c.polarity !== "+" || c.roles[vr] == null) continue;
    const m = by.get(rel) || by.set(rel, new Map()).get(rel), v = idf(c.roles[vr]);
    m.set(v, (m.get(v) || 0) + 1);
  }
  return by;
}
const total = (m) => { let n = 0; for (const k of m.values()) n += k; return n; };
/** Laplace-smoothed probability of value v for a relation (mass reserved for unseen values). */
const probOf = (table, rel, v) => { const m = table.get(rel) || new Map(); return ((m.get(v) || 0) + 1) / (total(m) + m.size + 1); };
/** The chance two random entities collide on a relation: the sum of squared (smoothed) value probabilities. */
const collisionOf = (table, rel) => { const m = table.get(rel) || new Map(); let c = 0; for (const v of m.keys()) c += probOf(table, rel, v) ** 2; return c; };

const NO_NOISE = "identity-warrant: noise is not supported (STOPRULE3-RESULTS.md: recall 0.75 at 10% noise, under the preregistered 0.80); facts are taken as true";

export function warrantIdentity(claims = [], x, y, { at = "/", functional = [], identity = exactIdentity, prior = null, target = 0.95, background = null, noise = 0 } = {}) {
  if (noise) throw new TypeError(NO_NOISE);
  const idf = identity, fn = valueRoles(functional, idf);
  const scoped = claims.filter((c) => usable(c) && overlap(c.ground, at));
  const fx = factsOf(scoped, x, idf, fn), fy = factsOf(scoped, y, idf, fn);
  const conflicts = [], agree = [], shared = [];
  for (const a of fx) for (const b of fy) {
    if (a.pkey === b.pkey && a.polarity !== b.polarity) { conflicts.push({ why: "polarity", key: a.pkey, x: a.id, y: b.id }); continue; }
    if (a.valueRole && a.fkey === b.fkey && a.polarity === "+" && b.polarity === "+" && a.value != null && b.value != null) {
      if (a.value !== b.value) conflicts.push({ why: "one-valued", key: a.fkey, x: a.id, y: b.id, values: [a.value, b.value] });
      else agree.push({ key: a.fkey, value: a.value, x: a.id, y: b.id });
    } else if (!a.valueRole && a.pkey === b.pkey && a.polarity === b.polarity) shared.push({ key: a.pkey, x: a.id, y: b.id });
  }

  // THE CORPUS: how common each value is
  const corpus = (background ?? scoped).filter(usable);
  const table = valueTable(corpus, idf, fn);

  // THE EVIDENCE: each distinct agreeing one-valued key once, weighed by how rare its value is; a discernment is decisive
  const seen = new Map();
  for (const a of agree) if (!seen.has(a.key)) seen.set(a.key, a.value);
  let strength = conflicts.length ? -Infinity : 0;
  if (!conflicts.length) for (const [key, value] of seen) strength += Math.log10(1 / probOf(table, key.split(SEP)[0], value));

  const rate = prior && Number.isFinite(prior.rate) ? Math.min(Math.max(prior.rate, 1e-9), 1 - 1e-9) : null;
  const odds = rate == null ? null : (rate / (1 - rate)) * 10 ** strength;
  const posterior = odds == null ? null : Number.isFinite(odds) ? odds / (1 + odds) : 1;

  // THE HUNGER: one-valued facts known for one name and not the other could decide the pair with ONE fetch (live);
  // declared one-valued relations known for neither need two (cold).
  const live = [], cold = [];
  const known = (fs) => { const mk = new Map(); for (const f of fs) if (f.valueRole && f.polarity === "+" && f.value != null) (mk.get(f.fkey) || mk.set(f.fkey, { rel: f.rel, slot: f.slot, value: f.value, ids: [] }).get(f.fkey)).ids.push(f.id); return mk; };
  const kx = known(fx), ky = known(fy);
  for (const [key, k] of kx) if (!ky.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: x, missingFor: y, claims: k.ids, cost: 1, severity: 1 - probOf(table, k.rel, k.value) });
  for (const [key, k] of ky) if (!kx.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: y, missingFor: x, claims: k.ids, cost: 1, severity: 1 - probOf(table, k.rel, k.value) });
  const any = new Set([...kx.values(), ...ky.values()].map((k) => `${k.rel}${SEP}${k.slot}`));
  for (const [rel] of fn) if (!any.has(`${rel}${SEP}ARG0`)) cold.push({ rel, slot: "ARG0", cost: 2, severity: 1 - collisionOf(table, rel) });
  const bySeverity = (a, b) => b.severity / b.cost - a.severity / a.cost;
  live.sort(bySeverity); cold.sort(bySeverity);
  const next = [...live, ...cold].sort(bySeverity)[0] ?? null;

  let verdict;
  if (idf(x) === idf(y)) verdict = "same";
  else if (rate == null) verdict = conflicts.length ? "different" : agree.length ? "same" : "unjudged"; // no declared prior: the shipped meaning
  else if (conflicts.length) verdict = "different";
  else if (agree.length && posterior >= target) verdict = "same";
  else verdict = live.length || cold.length ? "unjudged" : "held";
  const decided = verdict === "same" || verdict === "different";
  return Object.freeze({ verdict, x, y, at, conflicts, agree, shared, strength, prior: rate, posterior, target: rate == null ? null : target,
    hunger: decided ? { live: [], cold: [], next: null } : { live, cold, next } });
}

/** The derived identity, as an ordinary claim the lint and the partition can read. Only "same" yields one. */
export function derivedIdentityClaim(w, { rel = "same-as", id = null } = {}) {
  if (!w || w.verdict !== "same" || !w.agree.length) return null;
  const warrant = [...new Set(w.agree.flatMap((a) => [a.x, a.y]).filter(Boolean))].sort();
  return gfpClaim({ ground: w.at, rel, roles: { ARG0: w.x, ARG1: w.y }, id, basis: { derived: IDENTITY_WARRANT, verdict: "same", provisional: w.prior == null, agree: w.agree.length,
    strength: w.strength, prior: w.prior, posterior: w.posterior, warrant } });
}

/** The coreference rate among name pairs, estimated without truth: EM over pairs with at least one compared key, each
 *  pair's likelihoods computed WITHOUT that pair's own claims (counting them biased the estimate 10-27x low: STOPRULE2).
 *  P(obs | same) = prod (agree ? m : 1-m), m = (1-epsilon)^2 (a small slack, not a noise model);
 *  P(obs | distinct) = prod (agree ? p : 1-p). */
export function estimatePrior(claims = [], names = [], { functional = [], identity = exactIdentity, epsilon = 0.01, noise = 0, iters = 100 } = {}) {
  if (noise) throw new TypeError(NO_NOISE);
  const idf = identity, fn = valueRoles(functional, idf), all = claims.filter(usable);
  const m = (1 - epsilon) ** 2;
  const keysOf = new Map(names.map((n) => { const k = new Map(); for (const f of factsOf(all, n, idf, fn)) if (f.valueRole && f.polarity === "+" && f.value != null && !k.has(f.fkey)) k.set(f.fkey, { rel: f.rel, value: f.value }); return [n, k]; }));
  const obs = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = keysOf.get(names[i]), b = keysOf.get(names[j]);
    const compared = [...a].filter(([key]) => b.has(key));
    if (!compared.length) continue;
    const table = valueTable(all.filter((c) => !naming(idf, names[i], names[j])(c)), idf, fn);
    let l1 = 1, l0 = 1;
    for (const [key, va] of compared) { const same = va.value === b.get(key).value, p = probOf(table, va.rel, va.value); l1 *= same ? m : 1 - m; l0 *= same ? p : 1 - p; }
    obs.push([l1, l0]);
  }
  let pi = 0.1;
  for (let t = 0; t < iters && obs.length; t++) { let s = 0; for (const [l1, l0] of obs) s += (pi * l1) / (pi * l1 + (1 - pi) * l0); pi = Math.min(Math.max(s / obs.length, 1e-6), 1 - 1e-6); }
  return { rate: pi, pairs: obs.length };
}
