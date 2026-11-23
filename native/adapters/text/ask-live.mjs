// ask-live.mjs — the LIVE glue: read a text and a question through the English parser, attach the
// kārakas, and answer. This feeds the reasoning chain (ask.mjs) with real parser rows instead of
// hand-built ones. The parser is english-parser.js (an averaged perceptron, no network, no model
// download at use) over the shipped parser-eng-ewt model; karaka-map.mjs attaches each row's kāraka.
//
// The answer is as good as the parser's own deprels — "to Mina" reads as nmod (adhikaraṇa) rather
// than iobj (sampradāna), but the text and the question misread it the SAME way, so the DMD match
// still narrows to the right agent. That consistency is the point: reasoning runs on the structure
// the reader actually produced, not an idealized one.
import { analyse, tokenize, sentences } from "./english-parser.js";
import { karakaOf } from "./karaka-map.mjs";
import { readQuestion } from "./question-grammar.en.js";
import { answerQuestion } from "./ask.mjs";

export const ASK_LIVE_SCHEMA = "AskLive@1";

/** rowsOf(model, text) -> parser rows with `karaka` attached (the reader's own shape). Multi-sentence
 *  text is split on the parser's sentence boundary and each sentence re-idd so the head chain stays
 *  within its own relation. */
export function rowsOf(model, text) {
  const out = [];
  let offset = 0;
  for (const s of sentences(String(text ?? ""))) {
    const forms = tokenize(s.text).map((t) => t.form);
    const rows = analyse(model, forms);
    for (const r of rows) out.push({ ...r, id: r.id + offset, head: r.head === 0 ? 0 : r.head + offset, karaka: karakaOf(r) });
    offset += rows.length;
  }
  return out;
}

/** askText({ text, question, model }) -> the answer, synchronously, from a loaded parser model. */
export function askText({ text, question, model } = {}) {
  if (!model) return { answer: null, reason: "no-model" };
  if (!text || !question) return { answer: null, reason: "missing-input" };
  const textRows = rowsOf(model, text);
  const questionRows = rowsOf(model, question);
  const admits = readQuestion(question, { model }).admits;
  return answerQuestion({ textRows, questionRows, admits });
}
