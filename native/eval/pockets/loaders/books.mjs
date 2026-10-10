// loaders/books.mjs — pocket group "bk": books (01-literature-books, 15-western-canon, 18-childrens-books[none usable], 20-first-person-voices, 16-wordplay).
// export async function load(onlyIds = null) -> Pocket[]. Pockets are built lazily: only ids in onlyIds are read and tokenised.
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack, startProse } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble, blockSize } from "./_bkseg.mjs";
import { SPECS, SPECS2, CRYPTIC, wpaSpecs } from "./_bksources.mjs";
import { CUTS } from "./_bkcuts.mjs";

/** one text file -> units (list of token arrays) */
function fileUnits(rel, spec) {
  const c = CUTS[spec.id] || {};
  let { text, front } = stripFront(readText(rel));
  text = stripPG(text);
  text = scrub(trimBack(text));                       // markup first, so that boxes and editorial brackets cannot pass for prose in startProse
  text = cut(text, c);
  if (spec.startProse) text = startProse(text);
  if (spec.drama) text = stripDrama(text, spec.drama, spec.stageParen);
  text = scrub(text, c.extra || []);
  return { units: toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false })), front };
}

function buildBook(spec) {
  const per = spec.files.map((f) => fileUnits(f, spec));
  const lang = per[0].front?.language;
  const extra = { files: spec.files.length, frontMatterLanguage: lang || null };
  return assemble({ ...spec, notes: spec.notes || "" }, per.map((p) => p.units), extra).pocket;
}

/** Guardian cryptic clues: one clue = one unit; setter names and answers are dropped; the file is grouped by answer, so clues are put in sha256(index) order (breaks that grouping). */
function buildCryptic(spec) {
  const text = readText(spec.files[0]), clues = [];
  for (const line of text.split("\n")) { const m = line.match(/^"(.*)" \u2014 (.*) \(setter: (.*)\)\.$/); if (m) clues.push(m[1]); }
  const order = clues.map((c, i) => ({ i, h: sha256(`bk-cryptic-order:${i}`) })).sort((a, b) => (a.h < b.h ? -1 : 1));
  const units = [];
  for (const { i } of order) { const t = toUnits([clues[i]])[0]; if (t) units.push(t); }
  const spec2 = { ...spec, tokenisation: "unicode words (as other bk pockets); one clue = one unit; clue text only (answer and setter names dropped)", unitDef: "one unit = one clue (the text between the quotation marks of one source line; no sentence splitting)",
    notes: `${clues.length} clues; the source file is grouped by answer, so unit order here is sha256(clue index) order and adjacency of units is NOT discourse; enumerations like (5) are absent from the source` };
  return assemble(spec2, [units], { clues: clues.length }).pocket;
}

let _all = null;
const allSpecs = () => _all ??= [...SPECS, ...SPECS2, ...wpaSpecs(fs, path, ETHOS), { ...CRYPTIC, cryptic: true }].map((s) => ({ ...s, build: () => (s.cryptic ? buildCryptic(s) : buildBook(s)) }));
export const buildSpec = (s) => (s.cryptic ? buildCryptic(s) : buildBook(s));
export const specIds = () => allSpecs().map((s) => s.id);

export async function load(onlyIds = null) {
  const out = [];
  for (const s of allSpecs()) if (!onlyIds || onlyIds.includes(s.id)) out.push(s.build());
  return out;
}
