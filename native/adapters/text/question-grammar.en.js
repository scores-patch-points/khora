// adapters/text/question-grammar.en.js — reading an English QUESTION into what it declares. Handle: Chomsky, forward: NL → grammar → EOT.
//
// The question's own grammar says what kind of thing it asks for, under what modality, about what. This adapter reads that off a
// Universal Dependencies analysis (adapters/text/english-parser.js, trained on UD English-EWT; no model) and hands a medium-blind
// reading to organs/question-void.js, which declares the void (the-fold/void-shape.js declareVoid) — never a second schema.
//
// The English surfaces below are a CLOSED class (interrogatives, deontic modals), read as data with a giver, the same standing as
// relations.js's negation words: a received fact about English function words, not an open-class list standing in for content.
// GIVER: English grammar (CGEL ch. 10, interrogatives; ch. 3, modals); the author, 2026-10-14.
import { parseText } from "./english-parser.js";

export const LANG = "en";
export const INTERROGATIVES = Object.freeze({ who: "person", whom: "person", whose: "person", when: "time", where: "place", why: "reason", how: "manner", what: "thing", which: "thing" });
export const QUANTITY_AFTER_HOW = Object.freeze(new Set(["many", "much"]));
export const DEONTIC = Object.freeze(new Set(["should", "ought", "must", "shall"]));
export const EPISTEMIC = Object.freeze(new Set(["will", "would", "could", "might", "may", "can"]));

const rowsOf = (conllu) => conllu.split("\n").filter((l) => /^\d+\t/.test(l)).map((l) => { const c = l.split("\t"); return { id: Number(c[0]), form: c[1], lemma: c[2], upos: c[3], feats: c[5], head: Number(c[6]), deprel: c[7] }; });

/**
 * readQuestion(text, { model }) → { lang, question, form, admits, modality, relation, words, gaps }
 *   form      wh | polar | deliberative | statement
 *   admits    person | time | place | reason | manner | quantity | thing | position (deliberative) | proposition (polar) | null
 */
export function readQuestion(text, { model }) {
  const t = String(text ?? "").trim();
  const parsed = parseText(model, t);
  const rows = rowsOf(Array.isArray(parsed) ? parsed.map((s) => (typeof s === "string" ? s : s.conllu ?? "")).join("\n") : String(parsed));
  const gaps = [];
  const isQuestion = /\?\s*$/.test(t);
  const content = rows.filter((r) => r.upos !== "PUNCT");
  const root = rows.find((r) => r.deprel === "root") ?? null;
  // An interrogative: UD marks it PronType=Int. A wh-word that OPENS a question is interrogative whatever the tagger said (the EWT
  // tagger reads clause-initial "Who" as PronType=Rel); position decides, not the tag's guess.
  const wh = content.find((r, i) => INTERROGATIVES[r.lemma.toLowerCase()] && (/PronType=Int/.test(r.feats) || (i === 0 && isQuestion)));
  let admits = null;
  if (wh) {
    admits = INTERROGATIVES[wh.lemma.toLowerCase()];
    const next = content[content.indexOf(wh) + 1];
    if (wh.lemma.toLowerCase() === "how" && next && QUANTITY_AFTER_HOW.has(next.lemma.toLowerCase())) admits = "quantity";
  }
  const modal = rows.find((r) => r.upos === "AUX" && (DEONTIC.has(r.lemma.toLowerCase()) || EPISTEMIC.has(r.lemma.toLowerCase())));
  const modality = modal ? (DEONTIC.has(modal.lemma.toLowerCase()) ? "deontic" : "epistemic") : "assertive";
  const auxFirst = content[0]?.upos === "AUX";
  let form = "statement";
  if (wh) form = "wh";
  else if (isQuestion && modality === "deontic") form = "deliberative";
  else if (isQuestion && auxFirst) form = "polar";
  else if (isQuestion) { form = "polar"; gaps.push({ field: "form", detail: "a question with no interrogative and no auxiliary opener; read as polar" }); }
  if (form === "deliberative") admits = "position";
  if (form === "polar") admits = "proposition";
  return {
    lang: LANG,
    question: t,
    form, admits, modality,
    relation: root ? { lemma: root.lemma, upos: root.upos } : null,
    words: content.filter((r) => ["NOUN", "PROPN", "VERB", "ADJ"].includes(r.upos)).map((r) => r.lemma.toLowerCase()),
    gaps,
    giver: "UD English-EWT parser (adapters/text/english-parser.js) + English closed classes (CGEL)",
  };
}

export default Object.freeze({ lang: LANG, readQuestion });
