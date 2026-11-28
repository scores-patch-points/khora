// the-fold/pharos-roles.mjs — WHAT THE READ ALREADY KNOWS ABOUT A SENTENCE'S SHAPE, WRITTEN INTO THE PHAROS (2026-11-27).
// Found by a failure: janus re-built a cruder negation and question guard, and read the theme of a request off the UD `obj` arc, because khora's own readers of these were not reachable by kind
// (the log is the only seam; a repo may not import another). Nothing here is a new reader: each entry is the output of an organ khora already had, run over the SAME rows pharos-reading.mjs weaves.
//
//   kind           cell         addr                body                                                                          the organ (unchanged)
//   text-roles     CON·Figure   roles:<sha16>       { rows: [{ s, id, panini, karaka, via, contested? }], sentences: [{ s, consistent, unknown, gaps }], coverage, markers }     adapters/text/karaka-total.mjs karakaRows: every row one Pāṇinian label, the nine kārakas for participants
//   text-polarity  SIG·Figure   polarity:<sha16>    { negated: [{ s, id, via: [{ id, deprel, how }] }], gaps, source }            adapters/text/negation-read.js readPolarity: UD Polarity=Neg / PronType=Neg, placed on its predication
//   text-question  SIG·Figure   question:<sha16>    { sentences: [{ s, form, admits, modality }], giver }                         adapters/text/question-grammar.en.js readQuestion: wh | polar | deliberative | statement (ENGLISH ONLY)
//   text-gap       NUL·Figure   gap:<sha16>:<gap>   a typed gap: no_question_grammar (a language with no question adapter), no-polarity-source, no_marker_table
// All are `of` the text entry and are NOMINATIONS (the role map is declared, not measured: karaka-total.mjs says so; the question classes are a closed class with a named giver). Khora writes Existence and Structure only.
// The UD-relation -> label map is language-independent; the MARKER tables are per language (eng, zh today): another language's adposition-marked roles stay generic and the entry says which table was missing.
// Idempotent: an entry already at the address with the same body is not written again.
import fs from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
import { grammarFor, readingRows, cutsOf, sha16, canon, pharosLib } from "./pharos-reading.mjs";
import { karakaRows, karakaCoverage, markerTableFor, PANINI_GIVER } from "../adapters/text/karaka-total.mjs";
import { readPolarity, POLARITY_GAP } from "../adapters/text/negation-read.js";
import { consistencyOf } from "../adapters/text/parse-consistency.mjs";
import { priorsHome } from "./prior-source.mjs";

export const ROLES_KIND = "text-roles", POLARITY_KIND = "text-polarity", QUESTION_KIND = "text-question";
export const ROLE_KINDS = Object.freeze([
  { kind: ROLES_KIND, cell: "CON·Figure", why: "every parse row's Pāṇinian relation to its head (the nine kārakas for participants): a declared map over the reader's rows, a nomination, not a definition of who did what" },
  { kind: POLARITY_KIND, cell: "SIG·Figure", why: "which predications a negator was read onto (UD Polarity=Neg / PronType=Neg), with the negators the read refused to place: a mark on the reading, not a judgement" },
  { kind: QUESTION_KIND, cell: "SIG·Figure", why: "each sentence's form (wh, polar, deliberative, statement), what a wh-word admits and the modality: read by the language's question adapter; a nomination" },
]);
// the question adapters khora holds (adapters/text/question-grammar.<lang>.js). A language with none is a typed gap, never English. `model`: the adapter parses with the English parser prior; the Spanish one is a DECLARED closed-class fallback and says so in its own giver.
const QUESTION_ADAPTERS = { eng: { module: "../adapters/text/question-grammar.en.js", model: true }, spa: { module: "../adapters/text/question-grammar.es.js", model: false } };
let ENG = null;
async function englishModel() {   // the model question-grammar.en.js was built on (english-parser.js, parser-eng-ewt.json), through the prior door's home
  if (ENG) return ENG; const f = path.join(priorsHome().dir ?? "", "parser-eng-ewt.json"); if (!fs.existsSync(f)) return (ENG = { gap: "no_question_parser_prior", why: `parser-eng-ewt.json is not in ${priorsHome().dir}` });
  const EP = await import("../adapters/text/english-parser.js"); return (ENG = { model: EP.loadModel(JSON.parse(fs.readFileSync(f, "utf8"))) });
}

/** shapeOf(text, { language }) -> { roles, polarity, question, gaps } | { gap, why } — pure but for the priors it loads: the three readings of one text, in the bodies the log will hold. */
export async function shapeOf(text, { language = "eng" } = {}) {
  const g = await grammarFor(language); if (g.gap) return g;
  const rows = readingRows(g, text), bySent = new Map(); for (const r of rows) { if (!bySent.has(r.s)) bySent.set(r.s, []); bySent.get(r.s).push(r); }
  const gaps = [], table = markerTableFor(language), labelled = [], roleRows = [];
  const sentences = [];
  for (const [s, rs] of bySent) { const k = karakaRows(rs, { stem: language }); labelled.push(k); const c = consistencyOf(k, { lexicon: g.parser.lexicon }); sentences.push({ s, consistent: c.consistent, unknown: c.unknown, gaps: c.gaps }); for (const r of k) roleRows.push({ s, id: r.id, panini: r.panini, karaka: r.karaka ?? null, via: r.karakaVia ?? null, ...(r.karakaContested ? { contested: r.karakaContested } : {}) }); }
  if (!table) gaps.push({ gap: "no_marker_table", language, why: `karaka-total.mjs holds no marker table for ${language}: roles carried by an adposition or subordinator stay generic` });
  // `sentences`: parse-consistency.mjs per sentence. A sentence that is not consistent has roles (and, where unknown.polarity, a root and a polarity) a reader must treat as UNKNOWN: the rows are still written, as what the parser said
  const roles = { rows: roleRows, sentences, coverage: karakaCoverage(labelled), markers: table ? language : null, giver: PANINI_GIVER };
  const negated = [], pgaps = []; let source = null;
  for (const [s, rs] of bySent) { const p = readPolarity(g.parser, rs); source = p.source; if (p.gap) { if (!gaps.some((x) => x.gap === POLARITY_GAP)) gaps.push({ gap: POLARITY_GAP, why: p.reason }); continue; }
    for (const [id, v] of p.heads) negated.push({ s, id, via: v.via.map((x) => ({ id: x.id, deprel: x.deprel, how: x.how })) }); for (const x of p.gaps) pgaps.push({ s, id: x.id, gap: x.gap }); }
  const polarity = { negated, gaps: pgaps, source };
  let question = null;
  if (!QUESTION_ADAPTERS[language]) gaps.push({ gap: "no_question_grammar", language, why: `no question adapter for ${language} (adapters/text/question-grammar.<lang>.js); the form of its sentences is not read, never read as English` });
  else { const A = QUESTION_ADAPTERS[language], m = A.model ? await englishModel() : { model: null }; if (m.gap) gaps.push(m); else { const Q = await import(A.module), cuts = cutsOf(g, text);
    question = { sentences: cuts.map(([a, b], s) => { const q = Q.readQuestion(text.slice(a, b), { model: m.model }); return { s, form: q.form, admits: q.admits, modality: q.modality }; }), giver: Q.default?.giver ?? Q.readQuestion("", { model: m.model }).giver ?? A.module }; } }
  return { roles, polarity, question, gaps };
}

/** weaveShape(text, { language, log, dir, writer }) -> { written, skipped, gaps } | { gap, why }. The text entry must exist (pharos-reading.mjs writeReading writes it); with none, the typed gap `no_text_entry`. */
export async function weaveShape(text, { language = "eng", log = process.env.PHAROS_LOG ?? "fold", dir = process.env.PHAROS ?? null, writer = "khora" } = {}) {
  const lib = pharosLib(); if (!lib) return { gap: "no_pharos", why: "pharos was not found (set PHAROS_HOME)" };
  const T = String(text ?? ""), sh = await shapeOf(T, { language }); if (sh.gap) return sh;
  const P = await import(pathToFileURL(lib).href), h = P.open(log, { writer, ...(dir ? { dir } : {}) }), sha = sha16(T), t = (P.fold(h, { kind: "text", addr: `text:${sha}` }).entries ?? [])[0];
  if (!t) return { gap: "no_text_entry", why: `text:${sha} is not in the log: write the reading first (pharos-reading.mjs writeReading)` };
  const have = new Set((P.fold(h, { kind: "kind" }).entries ?? []).map((e) => e.body?.name)), out = { written: [], skipped: [], gaps: [] };
  const declare = (k) => { if (!have.has(k.kind)) { P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: `kind:${k.kind}`, body: { name: k.kind, cell: k.cell, why: k.why } }); have.add(k.kind); } };
  const put = (kind, cell, addr, body, basis) => { const same = (P.fold(h, { kind, addr }).entries ?? []).find((e) => canon(e.body) === canon(body)); if (same) { out.skipped.push(kind); return; } P.weave(h, { cell, kind, addr, body, of: [t.id], basis }); out.written.push(kind); };
  for (const k of ROLE_KINDS) declare(k);
  const by = { by: "khora", note: "the output of an organ khora already had, over the rows of text-reading: a nomination, not a definition" };
  put(ROLES_KIND, "CON·Figure", `roles:${sha}`, sh.roles, { ...by, organ: "adapters/text/karaka-total.mjs" });
  put(POLARITY_KIND, "SIG·Figure", `polarity:${sha}`, sh.polarity, { ...by, organ: "adapters/text/negation-read.js" });
  if (sh.question) put(QUESTION_KIND, "SIG·Figure", `question:${sha}`, sh.question, { ...by, organ: "adapters/text/question-grammar.en.js" });
  if (sh.gaps.length) { if (!have.has("text-gap")) declare({ kind: "text-gap", cell: "NUL·Figure", why: "a typed gap about one text: a refusal or a missing prior, with how to fill it" });
    for (const g of sh.gaps) { out.gaps.push(g.gap); put("text-gap", "NUL·Figure", `gap:${sha}:${g.gap}`, g, { by: "khora" }); } }
  return out;
}
