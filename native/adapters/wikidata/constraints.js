// native/adapters/wikidata/constraints.js — A KIND'S DEPENDENCY SEQUENCE FROM STATED RULES (2026-11-17). Adapter-level.
// Standing: EXPERIMENTAL. Its preregistered test (native/docs/IDENTITY-FROM-STATED-RULES.md) held soundness (1.4–4.9% of true
// pairs contradicted on two real Wikidata samples) but missed two power bars: 8.9% of distinct pairs excluded on one sample
// (bar 20%), and the range step added under 1%. Not wired into any caller.
//
// WHY. kernel/kind-functional-induction.js learns one-valuedness from a member stating a relation TWICE; real records
// almost never do (on two real Wikidata samples, the fixed inducer induced one relation and none), so the register is
// starved. But the rules are often STATED, by a named giver, in machine-readable form: Wikidata's property constraints
// (P2302). A stated rule is GIVEN (kernel/identity-exclusion.js may convict on it), never assumed, and never typed here:
// every entry below is read from a property's own constraint statements and cites the statement it came from.
//
// THE SEQUENCE (identity-exclusion's order, each step licensing the next):
//   1 KIND        subject-type constraint (Q21503250): the classes (P2308) a property's rules are about. A property with
//                 no subject-type constraint is filed under "*" (any kind) and says so.
//   2 ONE-VALUED  single-value (Q19474404) and single-best-value (Q52060874). Separators (P4155): statements carrying a
//                 separator qualifier are distinguished alternatives, not rival values. Exceptions (P2303): items the
//                 rule does not apply to.
//   4 RANGE       difference-within-range (Q21510854): rel minus base (P2306) within [P2313, P2312], in the unit stated
//                 (only years, Q577, are read; another unit is reported unread). "You can't be born after you are dead."
//   read, not yet judged: distinct-values (Q21502410, keys), symmetric (Q21510862), contemporary (Q25796498),
//                 conflicts-with (Q21502838). Reported in `other`.
// Constraint status (P2316: mandatory / suggestion) is kept on each entry, never dropped.
//
// PURE: no I/O. The caller fetches property entities (wbgetentities) and hands them in.

export const CONSTRAINT = Object.freeze({
  SINGLE_VALUE: "Q19474404", SINGLE_BEST: "Q52060874", DIFF_RANGE: "Q21510854", DISTINCT: "Q21502410",
  SUBJECT_TYPE: "Q21503250", SYMMETRIC: "Q21510862", CONTEMPORARY: "Q25796498", CONFLICTS_WITH: "Q21502838",
});
const Q = { CLASS: "P2308", PROPERTY: "P2306", MIN: "P2313", MAX: "P2312", SEPARATOR: "P4155", EXCEPTION: "P2303", STATUS: "P2316" };
const YEAR = "Q577";

const ids = (quals, p) => (quals?.[p] ?? []).map((s) => s.datavalue?.value?.id).filter(Boolean);
const amount = (quals, p) => { const v = quals?.[p]?.[0]?.datavalue?.value; return v && v.amount != null ? { amount: +v.amount, unit: String(v.unit ?? "").split("/").pop() } : null; };
const statusOf = (quals) => ids(quals, Q.STATUS)[0] ?? null;

/** registerFromWikidataConstraints(propertyEntities) -> { functional, differences, kinds, other, unread }
 *   functional   Map<kind, Map<property, { giver, constraint, status, separators, exceptions }>>
 *   differences  Map<kind, [{ rel, base, min, max, unit, giver, status, exceptions }]>
 *   kinds        Map<property, [kind]>   (the subject-type classes, or ["*"])
 *   other        [{ property, constraint, giver }]   (read, not judged here)
 *   unread       [{ property, constraint, reason }]  */
export function registerFromWikidataConstraints(propertyEntities = {}) {
  const functional = new Map(), differences = new Map(), kinds = new Map(), other = [], unread = [];
  const put = (m, k) => m.get(k) ?? m.set(k, m === functional ? new Map() : []).get(k);
  for (const [P, e] of Object.entries(propertyEntities)) {
    const cs = e?.claims?.P2302 ?? [];
    const subject = cs.filter((c) => c.mainsnak?.datavalue?.value?.id === CONSTRAINT.SUBJECT_TYPE).flatMap((c) => ids(c.qualifiers, Q.CLASS));
    const ks = subject.length ? [...new Set(subject)] : ["*"];
    kinds.set(P, ks);
    for (const c of cs) {
      const t = c.mainsnak?.datavalue?.value?.id; if (!t) continue;
      const giver = `wikidata:${P}#${c.id}`, status = statusOf(c.qualifiers), exceptions = new Set(ids(c.qualifiers, Q.EXCEPTION));
      if (t === CONSTRAINT.SINGLE_VALUE || t === CONSTRAINT.SINGLE_BEST) {
        const entry = { giver, constraint: t, status, separators: [...new Set(ids(c.qualifiers, Q.SEPARATOR))], exceptions };
        for (const k of ks) if (!put(functional, k).has(P)) put(functional, k).set(P, entry);
      } else if (t === CONSTRAINT.DIFF_RANGE) {
        const base = ids(c.qualifiers, Q.PROPERTY)[0], lo = amount(c.qualifiers, Q.MIN), hi = amount(c.qualifiers, Q.MAX);
        if (!base || (!lo && !hi)) { unread.push({ property: P, constraint: t, reason: "no base property or no bound" }); continue; }
        const unit = (lo ?? hi).unit;
        if (unit !== YEAR) { unread.push({ property: P, constraint: t, reason: `unit ${unit || "none"} is not years` }); continue; }
        for (const k of ks) put(differences, k).push({ rel: P, base, min: lo ? lo.amount : -Infinity, max: hi ? hi.amount : Infinity, unit: "year", giver, status, exceptions });
      } else if ([CONSTRAINT.DISTINCT, CONSTRAINT.SYMMETRIC, CONSTRAINT.CONTEMPORARY, CONSTRAINT.CONFLICTS_WITH].includes(t)) {
        other.push({ property: P, constraint: t, giver });
      }
    }
  }
  return Object.freeze({ functional, differences, kinds, other, unread });
}

/** Which of a referent's assertions a stated rule may read: an assertion carrying one of the rule's separator qualifiers
 *  is a distinguished alternative, and an item the rule names as an exception is outside it. Conservative: an excepted
 *  item's assertions of that property are withheld from judging altogether, so an exception can only remove a conviction. `itemOf(referent)` maps a
 *  referent to the item the exceptions name; `qualifiersOf(assertion)` -> Set of qualifier properties. */
export function ruleFilter(register, { itemOf = (x) => x, qualifiersOf = (a) => a.qualifiers ?? new Set() } = {}) {
  const rules = new Map();
  for (const m of register.functional.values()) for (const [P, e] of m) if (!rules.has(P)) rules.set(P, e);
  const rangeExceptions = new Map();
  for (const ds of register.differences.values()) for (const d of ds) for (const x of d.exceptions) (rangeExceptions.get(d.rel) ?? rangeExceptions.set(d.rel, new Set()).get(d.rel)).add(x);
  return (referent, assertions) => assertions.filter((a) => {
    const e = rules.get(a.rel);
    if (e && e.exceptions.has(itemOf(referent))) return false;
    if (e && e.separators.length && e.separators.some((s) => qualifiersOf(a).has(s))) return false;
    if (rangeExceptions.get(a.rel)?.has(itemOf(referent))) return false;
    return true;
  });
}
