// native/chat/janus-lint.mjs — janus's organs, put to work on a candidate. Nothing here judges by itself: each verdict is the
// result of a janus organ (kinship.js makeFact, the rules read from a giver's gloss) and is written to the log through janus's
// own door, with its name and its giver on it. The chat only asks the question of the organ and passes the answer on.
//
//   lintKinClaim   would this relation between two referents be a FACT? (kinship.makeFact refuses a relation of a person to themself,
//                  a fact with no giver, a witness that is not a span of text.) A refusal refutes the candidate.
//   kinAtom        who is X's <term>, for a term the lexicon gives as an atom (wife, husband, mother …)? The answer is a fact in the
//                  base or a typed gap named by janus (no_spouse_fact, no_parent_fact …); an opinion may be filed into the gap's slot, a
//                  model is never asked.
const GAP_OF = { spouse_of: "no_spouse_fact", parent_of: "no_parent_fact", sibling_of: "no_sibling_fact" };

/** the rule a kin term has in the giver's lexicon, or null (not a kin term, or a composite: those are derived, not looked up) */
export const kinRuleOf = (janus, term) => janus?.rules?.atoms?.[String(term ?? "").toLowerCase()] ?? null;

/** lintKinClaim({ janus, ideation, id, fact }) -> { refused? } : the candidate `id` claims `fact` ({ rel, a, b, giver, witness }) */
export function lintKinClaim({ janus, ideation, id, fact }) {
  const r = janus.kinship.makeFact(fact);
  if (r.refused) {
    ideation.assess(id, { verdict: "refuted", method: "deduction", by: "janus kinship.makeFact", basis: `janus refuses it as a fact: ${r.refused.split("_").join(" ")}`, detail: { refused: r.refused, ...(r.detail ? { note: r.detail } : {}) } }, { owner: "janus" });
    return { refused: r.refused };
  }
  return { fact: r.fact };
}

/** kinAtom({ janus, term, of, facts }) -> { rule, answers: [key], gap: null | { kind, opinionFillable } } */
export function kinAtom({ janus, term, of, facts = [] }) {
  const rule = kinRuleOf(janus, term); if (!rule) return { rule: null, answers: [], gap: { kind: "not_an_atom", opinionFillable: false } };
  const base = janus.kinship.factBase(facts), sym = rule.rel === "spouse_of" || rule.rel === "sibling_of";
  const sexOf = (k) => base.facts.find((f) => f.rel === "sex" && f.a === k)?.value ?? null;
  const ends = base.facts.filter((f) => f.rel === rule.rel).flatMap((f) => {
    if (sym) return f.a === of ? [f.b] : f.b === of ? [f.a] : [];
    return rule.end === "a" ? (f.b === of ? [f.a] : []) : (f.a === of ? [f.b] : []);
  });
  const answers = [...new Set(ends)].filter((k) => !rule.sex || !sexOf(k) || sexOf(k) === rule.sex);
  return answers.length ? { rule, answers, gap: null } : { rule, answers: [], gap: { kind: GAP_OF[rule.rel] ?? "no_fact", opinionFillable: !!janus.kinship.GAP_KINDS[GAP_OF[rule.rel]]?.opinionFillable } };
}
