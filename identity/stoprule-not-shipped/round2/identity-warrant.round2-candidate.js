// organs/identity-warrant.js — IDENTITY DERIVED FROM GROUND, NOT DECLARED.
//
// lintGfp treats identity as a claim ("same-as") and merges two names only where that claim's ground reaches. But a
// declared same-as claim has no ground of its own: nothing says WHY the two names are one. This organ derives it.
//
// Leibniz, used asymmetrically: identicals are indiscernible, so ONE witnessed discernment between x and y proves them
// distinct (on true facts). Agreement never proves identity; it only supports it. Nothing in common is neither: it is a
// typed gap, returned as a HUNGER LIST, the facts whose fetching could decide the pair, live first.
//
//   warrantIdentity(claims, x, y, { at, functional, identity, prior, target, background, noise }) →
//     { verdict: "same" | "different" | "unjudged" | "held", x, y, at, conflicts, agree, shared,
//       strength, capacity, knee, prior, posterior, target, noise, hunger: { live, cold } }
//   derivedIdentityClaim(w) → a same-as gfpClaim at w.at whose basis carries the verdict and the warrant, or null.
//   estimatePrior(claims, names, { functional, noise }) → { rate, pairs } — the coreference rate among name pairs, by EM.
//
// THE STOP RULE (STOPRULE2-PREREG.md). Agreement is cheap when values are common and coreference is rare. With a
// DECLARED prior (`prior: { rate }`), the evidence is weighed (Fellegi–Sunter record linkage, 1969):
//   strength   log10 likelihood ratio over DISTINCT compared one-valued keys: an agreement on value v adds
//              log10(m / p(v)); with `noise` e > 0 a disagreement adds log10((1-m) / (1-p(v))) and a polarity conflict
//              log10((1-m) / 0.5), where m = (1-e)^2. With e = 0 any discernment is decisive (stable on true facts).
//   p(v)       how common v is for that relation in the CORPUS (`background`, else the claims in scope), counted
//              WITHOUT any claim that names x or y: a pair's own agreement must not make its value look common.
//   capacity   the entropy (decades) of every declared one-valued relation in the corpus: the most a full agreement can
//              be expected to say. Below the knee, log10(target/(1-target)) - log10(rate/(1-rate)), nothing may merge.
//   same       posterior >= target, capacity >= knee, at least one agreement, no decisive discernment
//   different  e = 0: a discernment; e > 0: posterior <= 1 - target
//   unjudged   neither, and something is left to fetch: the hunger list goes on (live first, then cold)
//   held       neither, and every declared one-valued relation is known for both: indiscernible on every observable.
// The prior can be estimated without truth by EM (Winkler), leaving each pair's own claims out. Without a declared
// prior, bare agreement yields a provisional "same" as before, so existing callers do not change meaning silently.
//
// The semantics are the kernel's own (kernel/gfp-claim.js, organs/reasoning-lint.js): a fact's KEY is its relation and
// its roles with the name replaced by a placeholder; one-valued roles come from the giver's `functional` declaration;
// "P and not-P" needs no declaration. Only claims whose ground overlaps `at` are read (siblings never meet).
// PURE: no I/O, no model, no clock.
import { gfpClaim, overlap, exactIdentity } from "../kernel/gfp-claim.js";

export const IDENTITY_WARRANT = "identity-warrant@2";
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
/** Entropy in decades of a relation's observed value distribution: the expected rarity of an agreement. */
const entropyOf = (table, rel) => { const m = table.get(rel) || new Map(), n = total(m); let h = 0; for (const k of m.values()) h -= (k / n) * Math.log10(k / n); return n ? h : 0; };

export function warrantIdentity(claims = [], x, y, { at = "/", functional = [], identity = exactIdentity, prior = null, target = 0.95, background = null, noise = 0 } = {}) {
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

  // THE CORPUS, the pair left out: how common each value is, and how much any full agreement could say (capacity)
  const corpus = (background ?? scoped).filter(usable).filter((c) => !naming(idf, x, y)(c));
  const table = valueTable(corpus, idf, fn);
  let capacity = 0;
  for (const [rel] of fn) capacity += entropyOf(table, rel);

  // THE EVIDENCE: one entry per distinct compared one-valued key (contested keys, with both an agreement and a
  // disagreement, say nothing); polarity conflicts once per key
  const e = Math.min(Math.max(+noise || 0, 0), 0.5), m = (1 - e) ** 2;
  const byKey = new Map();
  for (const a of agree) { const k = byKey.get(a.key) || byKey.set(a.key, { rel: a.key.split(SEP)[0], value: a.value, agree: false, disagree: false }).get(a.key); k.agree = true; }
  for (const c of conflicts) if (c.why === "one-valued") { const k = byKey.get(c.key) || byKey.set(c.key, { rel: c.key.split(SEP)[0], value: c.values[0], agree: false, disagree: false }).get(c.key); k.disagree = true; }
  const polarityKeys = new Set(conflicts.filter((c) => c.why === "polarity").map((c) => c.key));
  let strength = 0;
  for (const k of byKey.values()) {
    if (k.agree && k.disagree) continue;
    const p = probOf(table, k.rel, k.value);
    strength += k.agree ? Math.log10(m / p) : e > 0 ? Math.log10((1 - m) / (1 - p)) : -Infinity;
  }
  for (let i = 0; i < polarityKeys.size; i++) strength += e > 0 ? Math.log10((1 - m) / 0.5) : -Infinity;

  const rate = prior && Number.isFinite(prior.rate) ? Math.min(Math.max(prior.rate, 1e-9), 1 - 1e-9) : null;
  const knee = rate == null ? null : Math.log10(target / (1 - target)) - Math.log10(rate / (1 - rate));
  const odds = rate == null ? null : (rate / (1 - rate)) * 10 ** strength;
  const posterior = odds == null ? null : Number.isFinite(odds) ? odds / (1 + odds) : 1;

  // THE HUNGER: one-valued facts known for one name and not the other could decide the pair with ONE fetch (live);
  // declared one-valued relations known for neither need two (cold).
  const live = [], cold = [];
  const known = (fs) => { const mk = new Map(); for (const f of fs) if (f.valueRole && f.polarity === "+" && f.value != null) (mk.get(f.fkey) || mk.set(f.fkey, { rel: f.rel, slot: f.slot, ids: [] }).get(f.fkey)).ids.push(f.id); return mk; };
  const kx = known(fx), ky = known(fy);
  for (const [key, k] of kx) if (!ky.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: x, missingFor: y, claims: k.ids });
  for (const [key, k] of ky) if (!kx.has(key)) live.push({ rel: k.rel, slot: k.slot, key, knownFor: y, missingFor: x, claims: k.ids });
  const any = new Set([...kx.values(), ...ky.values()].map((k) => `${k.rel}${SEP}${k.slot}`));
  for (const [rel] of fn) if (!any.has(`${rel}${SEP}ARG0`)) cold.push({ rel, slot: "ARG0" });

  let verdict;
  if (idf(x) === idf(y)) verdict = "same";
  else if (rate == null) verdict = conflicts.length ? "different" : agree.length ? "same" : "unjudged"; // no declared prior: the shipped meaning
  else if (e === 0 && conflicts.length) verdict = "different";
  else if (e > 0 && posterior <= 1 - target) verdict = "different";
  else if (agree.length && posterior >= target && capacity >= knee) verdict = "same";
  else verdict = live.length || cold.length ? "unjudged" : "held";
  const decided = verdict === "same" || verdict === "different";
  return Object.freeze({ verdict, x, y, at, conflicts, agree, shared, strength, capacity, knee, prior: rate, posterior, target: rate == null ? null : target, noise: e,
    hunger: decided ? { live: [], cold: [] } : { live, cold } });
}

/** The derived identity, as an ordinary claim the lint and the partition can read. Only "same" yields one. */
export function derivedIdentityClaim(w, { rel = "same-as", id = null } = {}) {
  if (!w || w.verdict !== "same" || !w.agree.length) return null;
  const warrant = [...new Set(w.agree.flatMap((a) => [a.x, a.y]).filter(Boolean))].sort();
  return gfpClaim({ ground: w.at, rel, roles: { ARG0: w.x, ARG1: w.y }, id, basis: { derived: IDENTITY_WARRANT, verdict: "same", provisional: w.prior == null, agree: w.agree.length,
    strength: w.strength, capacity: w.capacity, knee: w.knee, prior: w.prior, posterior: w.posterior, noise: w.noise, warrant } });
}

/** The coreference rate among name pairs, estimated without truth: EM over pairs with at least one compared key, each
 *  pair's likelihoods computed WITHOUT that pair's own claims. P(obs | same) = prod (agree ? m : 1-m), m = (1-e)^2;
 *  P(obs | distinct) = prod (agree ? p : 1-p). e = `noise`, or `epsilon` when no noise is declared. */
export function estimatePrior(claims = [], names = [], { functional = [], identity = exactIdentity, epsilon = 0.01, noise = 0, iters = 100 } = {}) {
  const idf = identity, fn = valueRoles(functional, idf), all = claims.filter(usable);
  const e = noise > 0 ? noise : epsilon, m = (1 - e) ** 2;
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
