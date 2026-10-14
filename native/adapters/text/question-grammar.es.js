// adapters/text/question-grammar.es.js — reading a SPANISH question into what it declares. Same output shape as the English reader.
//
// DECLARED FALLBACK: no Spanish treebank is on disk, so there is no trained parser yet. This reader uses Spanish's CLOSED classes only —
// the accented interrogatives (RAE: the tilde marks the interrogative use, ¿qué? vs que), the opening ¿, and the deontic forms of
// deber — and says so in every reading (`giver`, `gaps`). When a UD Spanish treebank is admitted, a trained reader replaces this file
// and the organ above it (organs/question-void.js) does not change.
// GIVER: RAE, Nueva gramática (2009) §22 (interrogativas); the author, 2026-10-14; unreviewed by a native speaker.
export const LANG = "es";
export const INTERROGATIVES = Object.freeze({ "quién": "person", "quiénes": "person", "cuándo": "time", "dónde": "place", "adónde": "place", "cómo": "manner", "qué": "thing", "cuál": "thing", "cuáles": "thing", "cuánto": "quantity", "cuánta": "quantity", "cuántos": "quantity", "cuántas": "quantity" });
export const DEONTIC = Object.freeze(new Set(["debe", "deben", "debería", "deberían", "debemos", "deberíamos", "hay que", "conviene"]));

export function readQuestion(text) {
  const t = String(text ?? "").trim();
  const words = (t.toLowerCase().match(/[\p{L}]+/gu) ?? []);
  const isQuestion = /^¿|\?\s*$/.test(t);
  const gaps = [{ field: "parse", detail: "no Spanish treebank on disk: closed-class reading only, no dependency analysis" }];
  let admits = null;
  // "por qué" (two words, accented) is the reason interrogative.
  const reason = /(^|[^\p{L}])por qué(?![\p{L}])/iu.test(t); // JS \b is ASCII-only and never fires after "é"
  const wh = reason ? "por qué" : words.find((w) => INTERROGATIVES[w]);
  if (reason) admits = "reason"; else if (wh) admits = INTERROGATIVES[wh];
  const deontic = words.some((w) => DEONTIC.has(w)) || /\bhay que\b/i.test(t);
  let form = "statement";
  if (wh) form = "wh";
  else if (isQuestion && deontic) form = "deliberative";
  else if (isQuestion) form = "polar";
  if (form === "deliberative") admits = "position";
  if (form === "polar") admits = "proposition";
  return { lang: LANG, question: t, form, admits, modality: deontic ? "deontic" : "assertive", relation: null, words, gaps, giver: "Spanish closed classes (RAE 2009 §22), no parser" };
}

export default Object.freeze({ lang: LANG, readQuestion });
