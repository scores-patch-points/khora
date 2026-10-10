// eval/law/gfp-composed-arm.mjs — THE PIVOT: GFP -> the language's own grammar, then the predicate.
// New file; nothing edited. Uses the EXISTING composed reader (gfp-relations-composed.js).
//
//   node eval/law/gfp-composed-arm.mjs --stems eng,spa,deu,cat --limit 400
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run) ═══════════════════════════════════
// CONTEXT. The base GFP reader (relations-gfp.js) is figure-connector-figure and stays subject/verb/object-free;
// its labels are the text between two adjacent figures (function words/punctuation) — measured, FALSIFIED to fix by
// typing (eval/law/gfp-predicate-arm-RESULTS.md). The PIVOT is grammatical: composedRelations (gfp-relations-
// composed.js) keeps the recurrence arrangements but prefers the POSITIONAL clause's connector — the verb, read by
// the language's OWN measured RoleConfig@1 over clause spans (relations-positional.js). So the predicate comes from
// the language's grammar, never from GFP.
//
// CLAIM (falsifiable). With the language's RoleConfig declared and clauses split (the composed reader), the
// POSITIONAL leg settles a predicate on a non-trivial share of clauses and its labels are CONTENT verbs:
// (a) positional coverage = positional clauses / clauses >= 0.20; (b) positional content-label share (label's
// dominant class not in ADP/CCONJ/SCONJ/DET/PRON/AUX/PART/INTJ/NUM/PUNCT/SYM/X, and it has a letter) >= 0.60;
// (c) it exceeds the recurrence leg's content share by >= 0.20 absolute. Holds for >= 3 languages.
// FALSIFIED IF positional coverage < 0.10 on more than half the stems, OR positional content share < 0.40 on more
// than half. Controls: C1 recurrence leg on the same sentences; C2 determinism on re-run; C3 the positional label
// is verb-like (VERB|AUX) on >= 0.5 of settled clauses.
// LIMITS: DEV sample; both legs receive the language's own posPrior/RoleConfig (received knowledge); DEV only.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

import { composedRelations } from "../../adapters/text/gfp-relations-composed.js";
import { splitSentences } from "../../adapters/text/spans.js";
import { clauseSpans } from "../../adapters/text/clause-spans.js";
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
  const labels = new Map(); let content = 0, verbLike = 0;
  for (const e of edges) {
    labels.set(e.label, (labels.get(e.label) ?? 0) + 1);
    const cls = classOf(e.label, posPrior);
    if (cls && !FUNCTION_CLASSES.has(cls)) content += 1;
    if (cls === "VERB" || cls === "AUX") verbLike += 1;
  }
  return { edges: edges.length, distinct: labels.size, contentShare: +(edges.length ? content / edges.length : 0).toFixed(3), verbLikeShare: +(edges.length ? verbLike / edges.length : 0).toFixed(3), top: topN(labels, 12) };
}

function measureStem(stem, limit) {
  const g = grammarFor(stem);
  if (!g.language || !g.posPrior?.forms) return { stem, gap: g.gap ?? "no prior" };
  if (!g.roleConfig) return { stem, gap: "no RoleConfig@1" };
  const sentences = readConllu(conlluPath(stem, "dev"), { limit });
  const texts = sentences.map((s) => (s.text ?? s.tokens.map((t) => t.form).join(" "))).filter((t) => t && t.length > 1);
  const figures = windowFigures(texts);

  let clauses = 0;
  const pos = [], rec = [];
  for (const t of texts) {
    for (const s of splitSentences(t)) { const cs = clauseSpans(s.text ?? s); clauses += (cs.length ? cs.length : 1); }
    const out = composedRelations(t, { posPrior: g.posPrior, figures, roleConfig: g.roleConfig, classifyWord, dominantClass, clauseAware: true });
    for (const rel of out.relations) {
      if (!rel.end1 || !rel.label || !rel.end2) continue;
      (rel.basis === "positional clause" ? pos : rec).push(rel);
    }
  }
  const P = armStats(pos, g.posPrior), R = armStats(rec, g.posPrior);
  const posCov = +(clauses ? pos.length / clauses : 0).toFixed(3);
  const delta = +(P.contentShare - R.contentShare).toFixed(3);
  const pass = posCov >= 0.20 && P.contentShare >= 0.60 && delta >= 0.20 && P.verbLikeShare >= 0.5;
  const example = pos.slice(0, 4).map((e) => `${e.end1} [${e.label}] ${e.end2}`.slice(0, 100)).join(" | ");
  return { stem, sentences: texts.length, clauses, posCov, positional: P, recurrence: R, delta, pass, example };
}

function main() {
  const a = parseArgs();
  const stems = a.stems ? String(a.stems).split(",") : ["eng", "spa", "deu", "cat"];
  const limit = a.limit ?? 400;
  const rows = stems.map((s) => measureStem(s, limit));
  for (const r of rows) {
    console.log(`\n=== ${r.stem} ===`);
    if (r.gap) { console.log("  GAP:", r.gap); continue; }
    console.log(`sentences ${r.sentences}  clauses ${r.clauses}`);
    console.log(`POSITIONAL: edges ${r.positional.edges}  coverage ${r.posCov}  distinct ${r.positional.distinct}  content ${r.positional.contentShare}  verbLike ${r.positional.verbLikeShare}`);
    console.log(`  top ${r.positional.top}`);
    console.log(`RECURRENCE: edges ${r.recurrence.edges}  distinct ${r.recurrence.distinct}  content ${r.recurrence.contentShare}  top ${r.recurrence.top}`);
    console.log(`content delta (pos-rec) ${r.delta}`);
    console.log(`example: ${r.example}`);
    console.log(`PASS ${r.pass}`);
  }
  const ok = rows.filter((r) => !r.gap);
  const verdict = ok.filter((r) => r.pass).length >= 3 ? "SURVIVES" : "FALSIFIED";
  console.log("\nVERDICT:", verdict);
}
main();
