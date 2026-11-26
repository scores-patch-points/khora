// adapters/text/name-smell.js — DOES A SURFACE SMELL LIKE A NAME? Measured, never listed.
//
// WHY. The canonical reader and the chat each decide who is in the cast by capitalisation, and each fails differently on the same text (measured 2026-11-26, 71 names agreed, 8 only canonical, 18 only chat):
// sentence-openers ("Yea", "Hast", "Shalt", "Wherefore", "See", "Shed") are taken for names, and so are capitalised common words ("Day", "Seas", "Heaven", "Man"). The pinned emergent smell was tried and is the
// wrong instrument here: its vocabulary is 671 word types and it knew none of 22 real names.
//
// THE RULE, three measured things and no word list:
//   1. A word the reader's PART-OF-SPEECH PRIOR knows only as a closed class (pronoun, auxiliary, determiner, adposition, conjunction, particle, interjection, number, symbol) is never a name ("I", "I’m", "And").
//      The closed classes are the UD universal taxonomy, not a language's words; an open class (noun, verb, adjective) is NOT vetoed, because "Kitty" and "Rose" are nouns too.
//   2. A word that also occurs LOWERCASE in the same text is a common word ("Day": "the day went"; "Man": "the man"; "Heaven", "Earth", "Seas").
//   3. A name is capitalised somewhere that is NOT a sentence start. Capitalised only because it opens a sentence is UNKNOWN, never a name; so is a word the text never uses.
// A title with its name is judged on the name ("Mrs. Long" by "Long"); a bare dotted abbreviation ("Mr.") is not a being. The prior is optional: without it the verdict still stands and carries a typed gap.
// KNOWN LIMITS: a person whose name is also a common word the same text uses ("Rose" and "rose") is lost; a name only ever seen at sentence starts is unknown; judged per text, so it needs a text long enough to show a word both ways.
// nameSmell({ surface, text, sentenceStarts, pos }) -> { verdict: "name"|"not_name"|"unknown", why, capMid, capInitial, lower, prior?, priorGap? }
//   sentenceStarts  Set of character offsets where a sentence starts: the READER's own (entry.parse[].offset); sentenceStartsOf() is a naive fallback that knows no abbreviation
//   pos             the part-of-speech prior's forms: lowercase form -> { UPOS: count } (janus/priors/pos-eng.json)
//   posAt           optional Map(character offset -> UPOS): the READER's own tag for the token in context (entry.parse rows). It can only REMOVE a name: a capital after a comma that opens an unmarked speech
//                   ("said unto them, Shed no blood") looks mid-sentence by position, and the parser tags it VERB. All-caps tokens ("LORD") are their own word, so the lowercase test does not apply to them.
export const NAME_SMELL_SCHEMA = "NameSmell@1";
const CLOSED = new Set(["PRON", "AUX", "DET", "ADP", "CCONJ", "SCONJ", "PART", "INTJ", "PUNCT", "NUM", "SYM"]);
const OPENING = "“«„‘\"'(";
const isLetter = (c) => c !== undefined && c.toLowerCase() !== c.toUpperCase();

/** a naive fallback: the start, each paragraph start, and the first non-space after . ! ? (no abbreviation knowledge: pass the reader's own offsets when there are any) */
export function sentenceStartsOf(text) {
  const t = String(text ?? ""), out = new Set([0]);
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "\n" && t[i + 1] === "\n") { let j = i + 2; while (t[j] === "\n" || t[j] === " ") j++; out.add(j); }
    if (".!?".includes(t[i]) && (t[i + 1] === " " || t[i + 1] === "\n" || OPENING.includes(t[i + 1] ?? ""))) { let j = i + 1; while (t[j] === " " || t[j] === "\n") j++; out.add(j); }
  }
  return out;
}
const occurrences = (t, w) => { const at = []; let i = t.indexOf(w); while (i >= 0) { if (!isLetter(t[i - 1]) && !isLetter(t[i + w.length])) at.push(i); i = t.indexOf(w, i + 1); } return at; };

export function nameSmell({ surface, text, sentenceStarts, pos, posAt }) {
  const T = String(text ?? ""), words = String(surface ?? "").trim().split(" ").filter(Boolean), head = words[words.length - 1] ?? "", out = (verdict, why, x = {}) => ({ schema: NAME_SMELL_SCHEMA, surface, head, verdict, why, capMid: 0, capInitial: 0, lower: 0, ...x });
  if (!head) return out("unknown", "no surface");
  if (head.endsWith(".")) return out("not_name", "a dotted abbreviation is not a being");
  if (head === head.toLowerCase()) return out("not_name", "not capitalised");
  const lw = head.toLowerCase(), e = pos ? pos[lw] : undefined, priorGap = pos ? null : "no_pos_prior";
  let prior; if (e) { const top = Object.entries(e).sort((a, b) => b[1] - a[1])[0]; prior = { top: top[0], n: Object.values(e).reduce((a, b) => a + b, 0) }; }
  const starts = sentenceStarts ?? sentenceStartsOf(T), at = occurrences(T, head), isInitial = (i) => starts.has(i) || (OPENING.includes(T[i - 1] ?? "") && starts.has(i - 1));
  const capInitial = at.filter(isInitial).length, capMid = at.length - capInitial, lower = occurrences(T, lw).length, ev = { capMid, capInitial, lower, ...(prior ? { prior } : {}), ...(priorGap ? { priorGap } : {}) };
  if (prior && CLOSED.has(prior.top)) return out("not_name", `the prior knows it as ${prior.top}, a closed class`, ev);
  const allCaps = head.length > 1 && head === head.toUpperCase();
  if (lower > 0 && !allCaps) return out("not_name", `it also occurs lowercase in the text (${lower}×): a common word`, ev);
  if (capMid >= 1 && posAt) { const tags = at.filter((i) => !isInitial(i)).map((i) => posAt.get(i)).filter(Boolean); if (tags.length && !tags.some((u) => u === "PROPN" || u === "X")) { const top = [...new Set(tags)].join("/"); return out("not_name", `the parser tags it ${top} in context (${tags.length}×), never a proper noun`, { ...ev, tags }); } }
  if (capMid >= 1) return out("name", `capitalised away from a sentence start (${capMid}×) and never lowercase`, ev);
  if (capInitial >= 1) return out("unknown", "capitalised only where a sentence begins", ev);
  return out("unknown", "not in the text", ev);
}
