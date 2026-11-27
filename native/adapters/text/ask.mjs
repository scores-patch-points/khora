// ask.mjs — the full question -> answer wiring: read the text and the question through the ONE
// reader, build the text's kāraka triples, read the question's gap (the WH-word's kāraka) and its
// filled roles, then fill the gap. This is the reasoning chain composed end-to-end at the row level:
//
//   rows(text)  -> triples (each relation's predicate + role -> lemma set)
//   rows(question) + admits -> { gap (the WH-word's kāraka), filled (the other roles) }
//   fillGap(gap, filled, triples) -> the referent in the gap's slot of the matching triple.
//
// Referent identity here is the LEMMA, not a resolved referent: the wiring is mechanical and honest
// about that — "Mina" in the question matches "Mina" in the text by lemma, and a lemma-based match is
// a disclosed simplification, not a claim of coreference. Full referent identity is the reader's
// referent graph, one wiring layer deeper.
import { INTERROGATIVE_ADMITS } from "./wh-narrow.js";
import { whGapRole } from "./wh-role.mjs";
import { fillGap } from "./gap-fill.js";

const LEMMA = (row) => String(row.lemma ?? row.form ?? "").toLowerCase();

/** triplesOfRows(rows) -> the kāraka triples: one per relation (root predicate), role -> [lemmas].
 *  Rows are grouped to their relation by the head chain (a row belongs to the root it descends from),
 *  so a multi-sentence span yields one triple per sentence. A role with more than one mention keeps
 *  all of them (an array), so the fill step can see the set. */
export function triplesOfRows(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const roots = rows.filter((r) => r.head === 0 && r.upos !== "PUNCT");
  return roots.map((root) => {
    const t = { predicate: LEMMA(root) };
    for (const r of rows) {
      if (r === root || !r.karaka) continue;
      let n = r;
      while (n && n.id !== root.id) n = byId.get(n.head);
      if (!n) continue;
      const v = LEMMA(r);
      if (t[r.karaka] === undefined) t[r.karaka] = [];
      t[r.karaka].push(v);
    }
    return t;
  });
}

/** questionDag(rows, admits) -> { gap, filled, via, contested? }: the question's own DAG, with the WH-word's role as the
 *  gap and every other kāraka as a filled role. The WH-word is found by its lemma (a closed class),
 *  not by the deprel the parser gave it — WH-movement means a fronted "what" is often tagged nsubj
 *  when it is really the patient, so its role is never taken from that relation. It comes from a MARKER
 *  on the phrase ("to whom", or a stranded "to") when there is one, else from the declared class
 *  default in `admits` (wh-role.mjs: `via` names which). */
export function questionDag(rows, admits) {
  const { role, via, contested, ambiguous } = whGapRole(rows, admits);
  const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
  const filled = { predicate: root ? LEMMA(root) : null };
  for (const r of rows) {
    if (r === root || !r.karaka) continue;
    if (INTERROGATIVE_ADMITS[LEMMA(r)]) continue; // the WH-word itself is the gap, not a filled role
    const v = LEMMA(r);
    if (filled[r.karaka] === undefined) filled[r.karaka] = v;
  }
  return { gap: role, filled, via, ...(contested ? { contested } : {}), ...(ambiguous ? { ambiguous } : {}) };
}

/** answerQuestion({ textRows, questionRows, admits }) -> the fillGap verdict over the text's triples.
 *  A single-mention answer is unwrapped to its lemma; a multi-mention role stays an array (ambiguous). */
export function answerQuestion({ textRows, questionRows, admits } = {}) {
  if (!Array.isArray(textRows) || !Array.isArray(questionRows) || !admits) return { answer: null, reason: "missing-input" };
  const triples = triplesOfRows(textRows);
  if (!triples.length) return { answer: null, reason: "no-triples" };
  const { gap, filled, via, contested } = questionDag(questionRows, admits);
  const r = fillGap({ gap, filled, triples });
  const answer = Array.isArray(r.answer) ? (r.answer.length === 1 ? r.answer[0] : r.answer) : r.answer;
  return { ...r, answer, gap, filled, gapVia: via, ...(contested ? { gapContested: contested } : {}) };
}
