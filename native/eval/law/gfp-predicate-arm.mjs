// eval/law/gfp-predicate-arm.mjs — WHY THE READER'S RELATIONS ARE FUNCTION WORDS, and whether typing the
// connector recovers SEMANTIC relations. New file; nothing edited.
//
//   node eval/law/gfp-predicate-arm.mjs --stems eng,spa,deu --limit 400
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run) ═══════════════════════════════════
// CONTEXT. eval/identity/corpus-kinds-RESULTS.md (FALSIFIED) and eval/kinds-swarm (K2) found the reader's relations
// are function words and punctuation (`,`, `of`, `is`, `and`), so any induction over them is closed-class. Cause,
// in the GFP reader's own shape (adapters/text/relations-gfp.js): an arrangement is {end1, label, end2} = two
// recurring FIGURES with the text BETWEEN them as the label — so a comma or an `of` becomes the relation. The
// connector IS typed (verb -> CON·Figure (Link); preposition -> CON·Ground (Field); conjunction -> SEG·Figure)
// when a posPrior is supplied; eval/law/impact.mjs::readWindow (R-C) supplies posPrior: null, so every label is
// untyped (grain_gap).
//
// CLAIM (falsifiable). Under the language's OWN posPrior (the production configuration), the reader's relations
// STOP being function-word buckets: (a) the connector cells are typed (grain_gap share < 0.5); (b) a PREDICATE ARM
// — edges whose connector settled as a verb/participle, cell `CON·Figure (Link)` — is a non-trivial share of edges
// (>= 0.10) whose label set is semantic (the top predicate labels are verbs, not `of`/the/and/`,`), and whose ends
// are the window's figures.
// FALSIFIED IF predicate share < 0.10, OR grain_gap share >= 0.5, OR the predicate arm's top label is a function
// word. Reported per language: cell shares, the top labels overall and within CON·Figure, and one worked example.
// CONTROLS. C1 the SAME reader with posPrior:null reproduces the function-word distribution (the contrast).
//   C2 determinism: byte-identical label multisets on a re-run. C3 the ends of CON·Figure edges are figures
//   (recurrence >= 2), not function words — checked, since a typed connector on a non-figure would be a defect.
// LIMITS: sample of a stem's DEV sentences, one document family; DEV only; a result here is descriptive.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { extractGfpRelations } from "../../adapters/text/relations-gfp.js";
import { windowFigures, readWindow } from "./impact.mjs";
import { grammarFor } from "../../the-fold/language-grammar.js";
import { readConllu, conlluPath, parseArgs } from "../competence/lib.mjs";

const CN = (cell) => (cell ?? "grain_gap");
const topN = (m, n = 15) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${JSON.stringify(k)}:${c}`).join("  ");
const countLabels = (edges, keep) => { const m = new Map(); for (const e of edges) if (keep(e)) m.set(e.label, (m.get(e.label) ?? 0) + 1); return m; };

function measureStem(stem, limit) {
  const g = grammarFor(stem);
  if (!g.language || !g.posPrior?.forms) return { stem, gap: g.gap ?? "no prior" };
  const sentences = readConllu(conlluPath(stem, "dev"), { limit });
  const texts = sentences.map((s) => (s.text ?? s.tokens.map((t) => t.form).join(" "))).filter((t) => t && t.length > 1);
  const figures = windowFigures(texts);

  const typed = [];
  const untyped = [];
  for (const t of texts) {
    for (const e of extractGfpRelations(t, { posPrior: g.posPrior, figures })) typed.push(e);
    for (const e of extractGfpRelations(t, { posPrior: null, figures })) untyped.push(e);
  }
  const cells = new Map();
  for (const e of typed) cells.set(CN(e.cell), (cells.get(CN(e.cell)) ?? 0) + 1);
  const total = typed.length || 1;
  const predicate = typed.filter((e) => CN(e.cell) === "CON·Figure (Link)");
  const predShare = predicate.length / total;
  const gapShare = (cells.get("grain_gap") ?? 0) / total;
  const allLabels = countLabels(typed, () => true);
  const predLabels = countLabels(typed, (e) => CN(e.cell) === "CON·Figure (Link)");
  const predTop = [...predLabels].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const FUNCTION = new Set(["of", "the", "and", "is", "in", "to", "a", "was", "for", "on", "by", ",", "as", "that", "with", "his", "her", "it", "at", "from", "be", "are", "were", "an", "or", "not", "but", "its", "he", "she", "they", "this", "which", "who", "has", "had", "have", "-", "_", "my", "I", "we", "me", "you", "no", "or"]);
  const predTopIsFunction = predTop != null && (FUNCTION.has(predTop.trim().toLowerCase()) || !/^[\p{L}]/u.test(predTop));
  const nonFigureEnds = predicate.filter((e) => !figures.has(String(e.end1).toLowerCase()) || !figures.has(String(e.end2).toLowerCase())).length;
  const pass = predShare >= 0.10 && gapShare < 0.5 && !predTopIsFunction;
  return {
    stem, sentences: texts.length, figures: figures.size, typedEdges: typed.length, untypedEdges: untyped.length,
    cells: Object.fromEntries([...cells].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / total).toFixed(3)])),
    predicateShare: +predShare.toFixed(3), grainGapShare: +gapShare.toFixed(3),
    topLabelsAll: topN(allLabels, 12), topLabelsPredicate: topN(predLabels, 12),
    predTop, predTopIsFunction, predicateEndsNotFigures: nonFigureEnds,
    example: predicate.slice(0, 3).map((e) => `${e.end1} [${e.label}] ${e.end2}`.slice(0, 120)),
    untypedTopLabels: topN(countLabels(untyped, () => true), 12),
    pass,
  };
}

function main() {
  const a = parseArgs();
  const stems = (a.stems ? String(a.stems).split(",") : ["eng", "spa", "deu"]);
  const limit = a.limit ?? 500;
  const out = stems.map((s) => measureStem(s, limit));
  for (const r of out) {
    console.log(`\n=== ${r.stem} ===`);
    if (r.gap) { console.log("  GAP:", r.gap); continue; }
    console.log(`sentences ${r.sentences}  figures ${r.figures}  edges typed ${r.typedEdges} / untyped(prior-free) ${r.untypedEdges}`);
    console.log(`cells: ${JSON.stringify(r.cells)}`);
    console.log(`predicate (CON·Figure) share ${r.predicateShare}   grain_gap share ${r.grainGapShare}   ends-not-figures ${r.predicateEndsNotFigures}`);
    console.log(`top labels ALL:       ${r.topLabelsAll}`);
    console.log(`top labels PREDICATE: ${r.topLabelsPredicate}`);
    console.log(`prior-free top:       ${r.untypedTopLabels}`);
    console.log(`example: ${r.example.join(" | ")}`);
    console.log(`PASS: ${r.pass}`);
  }
  console.log("\nVERDICT:", out.every((r) => r.gap || r.pass) ? "SURVIVES" : (out.some((r) => r.pass) ? "MIXED" : "FALSIFIED"));
}
main();
