// adapters/text/parse-consistency.mjs — WHEN THE PARSE CANNOT BE WHAT IT SAYS, SAY SO. Built after a preregistered test (eval/falsify-shape/RESULT.md, 2026-11-27) showed the read ERRS
// instead of abstaining: typed gaps fired for a missing prior, never for a wrong parse, so a parser error became a confident role. Almost every such error left a STRUCTURAL fingerprint
// in the rows themselves. This module reads the kāraka-labelled rows of ONE sentence (karaka-total.mjs karakaRows) and reports each fingerprint as a typed gap. It repairs nothing and
// guesses nothing: a flagged sentence is one whose roles (and, for the first and last check, whose root and polarity) a caller should treat as UNKNOWN.
// No threshold and no score: each check is an invariant of the annotation scheme (UD) or of the role scheme (Pāṇini), true or false of the rows.
//   root_not_predicate       the root is not a verb, auxiliary or copular predicate although the sentence HAS a verb: the parser hung the clause on a noun (a relative clause, a fronted phrase)
//   duplicate_kartr          one action has two agents that are not coordinated (UD: one nsubj per clause)
//   karman_contested         one action has two bare objects that are not coordinated: which is the patient is not determined (UD marks the first iobj; Pāṇini's dvikarmaka verbs do take two, so this is CONTESTED, not impossible)
//   clausal_participant      a kartṛ or karman of the action is itself a verb: a clause was labelled as a participant (xcomp, ccomp), so the action's real participants are inside it
//   unattested_closed_class  a function word (a closed class by definition) that the codec's lexicon never attested in any closed class: a tokenization or spelling problem ("didn't" unsplit), so features such as negation were not read
// `scope` says what each gap makes unknown: "all" (root, polarity and roles) or "roles".
const base = (d) => { const s = String(d ?? ""), i = s.indexOf(":"); return i < 0 ? s : s.slice(0, i); };
const VERBAL = new Set(["VERB", "AUX"]), CLOSED = Object.freeze(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]);
export const CONSISTENCY_SCHEMA = "ParseConsistency@1";
export const CONSISTENCY_GAPS = Object.freeze({ root_not_predicate: "all", unattested_closed_class: "all", duplicate_kartr: "roles", karman_contested: "roles", clausal_participant: "roles" });
/** consistencyOf(rows, { lexicon }) -> { schema, consistent, gaps: [{ gap, scope, ids, why }], unknown: { root, polarity, roles } }. `rows` = karakaRows of one sentence; `lexicon` = the parser model's lexicon ({ form: { "form|UPOS": ... } }) or null (the closed-class check is then skipped and says so). */
export function consistencyOf(rows, { lexicon = null } = {}) {
  const gaps = [], add = (gap, ids, why) => gaps.push({ gap, scope: CONSISTENCY_GAPS[gap], ids, why });
  const kids = (id) => rows.filter((r) => r.head === id), root = rows.find((r) => base(r.deprel) === "root") ?? null;
  if (root && !VERBAL.has(root.upos) && !kids(root.id).some((k) => base(k.deprel) === "cop") && rows.some((r) => VERBAL.has(r.upos))) add("root_not_predicate", [root.id], `the root is ${root.upos} with no copula although the sentence has a verb`);
  for (const h of rows) {
    const ks = kids(h.id).filter((k) => base(k.deprel) !== "conj");
    for (const [role, gap] of [["kartṛ", "duplicate_kartr"], ["karman", "karman_contested"]]) { const same = ks.filter((k) => k.karaka === role); if (same.length > 1) add(gap, same.map((k) => k.id), `${same.length} uncoordinated ${role} on one action`); }
    const clausal = ks.filter((k) => (k.karaka === "kartṛ" || k.karaka === "karman") && VERBAL.has(k.upos)); if (clausal.length) add("clausal_participant", clausal.map((k) => k.id), "a participant of the action is itself a verb (a clause labelled as a participant)");
  }
  if (lexicon?.form) { const bad = rows.filter((r) => CLOSED.includes(r.upos) && !CLOSED.some((u) => lexicon.form[`${String(r.form).toLowerCase()}|${u}`] !== undefined)); if (bad.length) add("unattested_closed_class", bad.map((r) => r.id), "a function word the codec's lexicon never attested in a closed class"); }
  const all = gaps.some((g) => g.scope === "all");
  return { schema: CONSISTENCY_SCHEMA, consistent: gaps.length === 0, gaps, unknown: { root: all, polarity: all, roles: gaps.length > 0 }, ...(lexicon?.form ? {} : { skipped: ["unattested_closed_class: no lexicon given"] }) };
}
