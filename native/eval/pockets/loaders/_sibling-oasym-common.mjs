// loaders/_sibling-oasym-common.mjs — shared builders of the SIBLING-REPLICATION pockets of the atlas law order.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Every builder REUSES the atlas helpers unchanged (_bkcore/_bkseg/_bkcuts/_bksources for books, _conllu/_ud_ml_common for treebanks, _cd_util + _cd_codecorpus rules for code), so a sibling is
// tokenised, split into units and cut into documents exactly like its atlas kin. Pocket group is "sib" (never part of an atlas count). Pure Node ESM; no Math.random, no Date.
// It deliberately does NOT import the loaders of other agents' confirmations (_sibling-ent-*, _sibling-asym-*, ...): only atlas modules and lib/pocket.mjs.
import fs from "node:fs";
import path from "node:path";
import { validate, rngOf, seedOf, sha256, MAX_TOKENS, tokenCount } from "../lib/pocket.mjs";
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack, startProse } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble, makeDocs, capDocs } from "./_bkseg.mjs";
import { SPECS, SPECS2, CRYPTIC, wpaSpecs } from "./_bksources.mjs";
import { CUTS } from "./_bkcuts.mjs";
import { readConllu } from "./_conllu.mjs";
import { interner, scriptOf, capByHash } from "./_ud_ml_common.mjs";
import { codeText, newStats, sumStats, takeDocs, makePocket } from "./_cd_util.mjs";

export const GROUP = "sib";
export const GBNE = "11-multi-language/gutenberg-non-en/";   // misfiled English books (the atlas ml loader skipped all 19: _ml_skips.mjs ENGLISH_MISFILED)
export const TB = "/private/tmp/claude-501/tb", UDE = "/private/tmp/claude-501/ud-eval", CC = "/private/tmp/claude-501/code-corpus";
export const fingerprint = (p) => sha256(JSON.stringify([p.units, p.docOf])).slice(0, 16);

/** A NEW English book file -> Pocket through the atlas "bk" pipeline (front matter, PG boilerplate, markup scrub, optional cuts, startProse, sentence units, ~100-unit blocks, 300k cap by whole blocks). */
export function bookNew(spec) {
  const { text: t0 } = stripFront(readText(spec.rel));
  let text = scrub(trimBack(stripPG(t0)));
  text = cut(text, spec.cut || {});
  if (spec.startProse !== false) text = startProse(text);
  text = scrub(text, spec.extra || []);
  const units = toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
  const { pocket } = assemble({ ...spec, files: [spec.rel], notes: spec.notes || "" }, [units], { sibling: true, sourceRel: spec.rel });
  return { ...pocket, group: GROUP };
}

/** units of one atlas bk source exactly as loaders/books.mjs fileUnits (CUTS applied, spec.paraBreak). */
function atlasFileUnits(rel, spec) {
  const c = CUTS[spec.id] || {};
  let { text } = stripFront(readText(rel));
  text = scrub(trimBack(stripPG(text)));
  text = cut(text, c);
  if (spec.startProse) text = startProse(text);
  text = scrub(text, c.extra || []);
  return toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
}

/** HELD-OUT BLOCKS of a capped atlas book: rebuild the atlas pipeline for atlasId, find the whole blocks the 300k cap kept (capDocs under the atlas id), drop them, and cap the REST under the new id.
 *  `kept` is the atlas pocket's own unit list (checked equal by the caller through fingerprint). */
export function heldOutOf({ id, atlasId, register, title, author, notes }) {
  let units, language = "en";
  if (atlasId === CRYPTIC.id) units = crypticUnits();
  else { const spec = [...SPECS, ...SPECS2, ...wpaSpecs(fs, path, ETHOS)].find((s) => s.id === atlasId); language = spec.language; units = spec.files.map((f) => atlasFileUnits(f, spec)).flat(); }
  const { docOf } = makeDocs(units), capped = capDocs(atlasId, units, docOf), kept = new Set(capped.units);
  const rest = [], restDoc = []; const renum = new Map();
  units.forEach((u, i) => { if (kept.has(u)) return; if (!renum.has(docOf[i])) renum.set(docOf[i], renum.size); rest.push(u); restDoc.push(renum.get(docOf[i])); });
  const c2 = capDocs(id, rest, restDoc);
  const pocket = { id, group: GROUP, register, language, script: "latn", units: c2.units, docOf: c2.docOf, meta: {
    tokenisation: "unicode words (as the atlas bk pocket): letters, marks, numbers, apostrophes inside words; lowercase NFC; punctuation and pure-number tokens dropped; hyphenated words split",
    docDef: `HELD-OUT whole blocks of ${atlasId}: the atlas pipeline is rebuilt unchanged, the ${capped.keptDocs} blocks the atlas 300k cap kept are removed, and the ${restDoc.length ? new Set(restDoc).size : 0} remaining blocks are capped at 300k under this id`,
    source: `${atlasId} source (${atlasId === CRYPTIC.id ? CRYPTIC.files[0] : "see atlas bk manifest"}), blocks NOT in the atlas pocket`, title, author, notes, sibling: true, heldOutOf: atlasId,
    atlasKeptBlocks: capped.keptDocs, atlasTotalBlocks: capped.totalDocs, atlasKeptTokens: tokenCount(capped.units), tokensRestBeforeCap: tokenCount(rest), keptFingerprint: fingerprint({ units: capped.units, docOf: capped.docOf }) } };
  validate(pocket);
  return pocket;
}
/** the clue units of bk-cryptic exactly as loaders/books.mjs buildCryptic. */
export function crypticUnits() {
  const clues = [];
  for (const line of readText(CRYPTIC.files[0]).split("\n")) { const m = line.match(/^"(.*)" — (.*) \(setter: (.*)\)\.$/); if (m) clues.push(m[1]); }
  const order = clues.map((c, i) => ({ i, h: sha256(`bk-cryptic-order:${i}`) })).sort((a, b) => (a.h < b.h ? -1 : 1));
  const units = [];
  for (const { i } of order) { const t = toUnits([clues[i]])[0]; if (t) units.push(t); }
  return units;
}
