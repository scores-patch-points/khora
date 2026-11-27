// wh-role.mjs — the kāraka a WH-question's gap asks for, read from the question's OWN rows.
//
// wh-narrow.js declares one role per WH class (person -> kartṛ, thing -> karman, ...). That is a DEFAULT: "who" opens a subject
// question, but "to whom" asks for the recipient and "from whom" for the source, and a class has no room for that. The
// role of the gap is carried the way every other role is carried (karaka-total.mjs): by the MARKER on the phrase. So the same
// evidence the text's rows were labelled with decides the question's gap, and the two sides agree by construction.
//
// Evidence order for the gap role, first that decides wins (`via` names it):
//   1. marker     the WH-word's own row was labelled by a marker ("to whom": karakaVia "marker:to" -> sampradāna).
//   2. stranded   a preposition with no object of its own, in the declared marker table, in a question whose WH-word is a nominal
//                 ("Whom did Jonathan give the book to?": the parser hangs "to" on the verb, so the marker is not on "whom" at all).
//   3. class      the declared WH-class default of wh-narrow.js (ADMITS_KARAKA), exactly as before.
// The WH-word's OWN relation (nsubj/obj/...) is deliberately not evidence: WH-movement makes it unreliable (a fronted "what" is
// often tagged nsubj when it is the patient; see ask.mjs). Only a marker, which does not depend on that relation, overrides the class.
//
// Not covered, and it stays at the class default (typed, not guessed): a plain "whom"/"who" as the OBJECT ("Whom did Jonathan see?"
// asks kartṛ); a passive subject ("Who was seen by Mina?"); a stranded marker the parser does not hang as an object-less preposition;
// a fronted preposition the parser hangs on the verb instead of the WH-word ("With what ..." read as SCONJ/mark); two stranded
// prepositions (reported as `ambiguous`, class default kept); a stranded phrase marker ("out of", "because of"). The English marker table is karaka-total.mjs's own (markerTableFor), not a second one.
import { markerTableFor, KARAKAS } from "./karaka-total.mjs";
import { ADMITS_KARAKA, INTERROGATIVE_ADMITS } from "./wh-narrow.js";

export const WH_ROLE_SCHEMA = "WhRole@1";
const NOMINAL = new Set(["person", "thing"]);
const low = (r) => String(r.lemma ?? r.form ?? "").toLowerCase();
const base = (d) => String(d ?? "").split(":")[0];

/** whGapRole(rows, admits, { stem }) -> { role, via, contested? }  (role is null when admits has no kāraka: polar, deliberative) */
export function whGapRole(rows, admits, { stem = "eng" } = {}) {
  const dflt = { role: ADMITS_KARAKA[admits] ?? null, via: `class:${admits}` };
  if (!Array.isArray(rows)) return dflt;
  const wh = rows.find((r) => INTERROGATIVE_ADMITS[low(r)]);
  if (!wh) return dflt;
  // 1. the WH-word's own marker
  if (String(wh.karakaVia ?? "").startsWith("marker:") && KARAKAS.includes(wh.karaka)) {
    return { role: wh.karaka, via: wh.karakaVia, ...(wh.karakaContested ? { contested: wh.karakaContested } : {}) };
  }
  // 2. a stranded preposition: an ADP the parser did not hang on an object (not case/mark/fixed), with no children, whose marker the table holds
  const table = markerTableFor(stem)?.case;
  if (table && NOMINAL.has(INTERROGATIVE_ADMITS[low(wh)]) && NOMINAL.has(admits)) {
    const hasKid = new Set(rows.map((r) => r.head));
    const stranded = rows.filter((r) => r.upos === "ADP" && r.deprel && !["case", "mark", "fixed"].includes(base(r.deprel)) && !hasKid.has(r.id) && table[low(r)] && KARAKAS.includes(table[low(r)][0]));
    // exactly one orphan preposition belongs to the WH-word; with two, which one is not decided here (a typed gap, never a pick)
    if (stranded.length === 1) { const s = stranded[0], c = table[low(s)]; return { role: c[0], via: `stranded:${low(s)}`, ...(c.length > 1 ? { contested: c.slice(1) } : {}) }; }
    if (stranded.length > 1) return { ...dflt, ambiguous: stranded.map(low) };
  }
  return dflt;
}
