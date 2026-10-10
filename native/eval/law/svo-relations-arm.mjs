// eval/law/svo-relations-arm.mjs — DOES THE POSITIONAL (SVO) READER'S RELATION CARRY CONTENT, where GFP's does not?
// New file; nothing edited. The reader is the EXISTING one (relations-positional.js via relations-language.js).
//
//   node eval/law/svo-relations-arm.mjs --stems eng,spa,deu,cat --limit 400
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run) ═══════════════════════════════════
// CONTEXT. eval/law/gfp-predicate-arm-RESULTS.md (FALSIFIED): the base GFP reader emits figure-connector-figure,
// so its labels are the text between two adjacent recurring figures — function words/punctuation — and typing the
// connector does not fix it. The repo already has a SECOND reader: the positional/SVO mode
// (adapters/text/relations-positional.js), online only when a language's measured RoleConfig@1 is declared. Its
// arrangement is {end1, label, end2} with label = the PREDICATE (a verb-like word, picked by the language's own
// measured subject/object position stats). This asks whether THAT reader's relation carries content.
//
// CLAIM (falsifiable). On a language with a RoleConfig@1, the positional reader's labels are CONTENT predicates:
// (a) content-label share (label's dominant class NOT in ADP/CCONJ/SCONJ/DET/PRON/AUX/PART/INTJ/NUM/PUNCT/SYM/X,
// per the same prior, and the label has a letter) >= 0.60; and (b) it exceeds GFP's content share on the SAME
// sentences by >= 0.30 absolute; and (c) it holds for >= 3 tested languages.
// FALSIFIED IF positional content share < 0.30 on more than half the stems, OR it does not exceed GFP's by >= 0.30
// on at least half. C3: the positional label is verb-like (VERB|AUX) on >= 0.5 of edges. C2 determinism on re-run.
// LIMITS: DEV sample (~400 sentences/stem), one family; both readers get the language's own posPrior; DEV only.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

import { extractGfpRelations } from "../../adapters/text/relations-gfp.js";
import { relationExtractorsFor } from "../../adapters/text/relations-language.js";
import { classifyWord, dominantClass } from "../../adapters/text/wordclass.js";
import { windowFigures } from "./impact.mjs";
import { grammarFor } from "../../the-fold/language-grammar.js";
import { readConllu, conlluPath, parseArgs } from "../competence/lib.mjs";

const FUNCTION_CLASSES = new Set(["ADP", "CCONJ", "SCONJ", "DET", "PRON", "AUX", "PART", "INTJ", "NUM", "PUNCT", "SYM", "X"]);
const hasLetter = (s) => /\p{L}/u.test(String(s ?? ""));
const topN = (m, n = 12) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${JSON.stringify(k)}:${c}`).join("  ");

const classOf = (label, posPrior) => {
  const w = String(label).split(/\s+/).find(hasLetter);
  if (!w) return null;
  return dominantClass(classifyWord(w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ""), { posPrior }), { minShare: 0.0 }) ?? null;
};

function armStats(edges, posPrior) {
  const labels = new Map();
  let content = 0, verbLike = 0, punct = 0;
  for (const e of edges) {
    labels.set(e.label, (labels.get(e.label) ?? 0) + 1);
    const cls = classOf(e.label, posPrior);
    if (!hasLetter(e.label)) punct += 1;
    if (cls && !FUNCTION_CLASSES.has(cls)) content += 1;
    if (cls === "VERB" || cls === "AUX") verbLike += 1;
  }
  return {
    edges: edges.length, distinct: labels.size,
    contentShare: +(edges.length ? content / edges.length : 0).toFixed(3),
    verbLikeShare: +(edges.length ? verbLike / edges.length : 0).toFixed(3),
    top: topN(labels, 12),
  };
}

function measureStem(stem, limit) {
  const g = grammarFor(stem);
  if (!g.language || !g.posPrior?.forms) return { stem, gap: g.gap ?? "no prior" };
  if (!g.roleConfig) return { stem, gap: "no RoleConfig@1 — positional mode not declared for this language" };
  const sentences = readConllu(conlluPath(stem, "dev"), { limit });
  const texts = sentences.map((s) => (s.text ?? s.tokens.map((t) => t.form).join(" "))).filter((t) => t && t.length > 1);
  const figures = windowFigures(texts);
  const ex = relationExtractorsFor({ language: stem, roleConfig: g.roleConfig, posPrior: g.posPrior, classifyWord, dominantClass });

  const gfpEdges = [], svoEdges = [];
  for (const t of texts) {
    for (const e of extractGfpRelations(t, { posPrior: g.posPrior, figures })) gfpEdges.push(e);
    for (const e of ex.extractRelations(t)) if (e.end1 && e.label && e.end2) svoEdges.push(e);
  }
  const gfp = armStats(gfpEdges, g.posPrior);
  const svo = armStats(svoEdges, g.posPrior);
  const delta = +(svo.contentShare - gfp.contentShare).toFixed(3);
  const pass = svo.contentShare >= 0.60 && delta >= 0.30 && svo.verbLikeShare >= 0.5;
  const example = svoEdges.slice(0, 3).map((e) => `${e.end1} [${e.label}] ${e.end2}`.slice(0, 110)).join(" | ");
  return { stem, sentences: texts.length, figures: figures.size, gfp, svo: { ...svo, example }, delta, pass };
}

function main() {
  const a = parseArgs();
  const stems = a.stems ? String(a.stems).split(",") : ["eng", "spa", "deu", "cat"];
  const limit = a.limit ?? 400;
  const rows = stems.map((s) => measureStem(s, limit));
  for (const r of rows) {
    console.log(`\n=== ${r.stem} ===`);
    if (r.gap) { console.log("  GAP:", r.gap); continue; }
    console.log(`sentences ${r.sentences}`);
    console.log(`GFP: edges ${r.gfp.edges} distinct ${r.gfp.distinct} content ${r.gfp.contentShare} top ${r.gfp.top}`);
    console.log(`SVO: edges ${r.svo.edges} distinct ${r.svo.distinct} content ${r.svo.contentShare} verbLike ${r.svo.verbLikeShare} top ${r.svo.top}`);
    console.log(`content delta (svo-gfp) ${r.delta}`);
    console.log(`svo example: ${r.svo.example}`);
    console.log(`PASS ${r.pass}`);
  }
  const ok = rows.filter((r) => !r.gap);
  const deltas = ok.map((r) => r.delta);
  const verdict = ok.filter((r) => r.pass).length >= 3 && deltas.filter((d) => d >= 0.30).length >= Math.ceil(deltas.length / 2) ? "SURVIVES" : "FALSIFIED";
  console.log("\nVERDICT:", verdict);
}
main();
