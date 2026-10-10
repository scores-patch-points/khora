// loaders/_sibling-ent-common.mjs — shared builders of the SIBLING-REPLICATION pockets of the confirmation of order.entSlope (underscore: ignored by run-atlas.mjs).
// Every builder REUSES the atlas helpers unchanged (_bkcore/_bkseg for books and plays, _conllu/_ud_ml_common for treebanks, _cd_util for code), so a sibling is tokenised, split into
// units and cut into documents exactly like its atlas kin. Pocket group is "sib" (never part of an atlas count). Pure Node ESM; no Math.random, no Date.
// (Written as a NEW file with the prefix _sibling-ent-: _sibling-common.mjs belongs to another agent's confirmation and is not touched here.)
import path from "node:path";
import fs from "node:fs";
import { validate, rngOf, seedOf, sha256 } from "../lib/pocket.mjs";
import { readText, stripFront, stripPG, scrub, cut, trimBack, startProse } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { readConllu } from "./_conllu.mjs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { codeText, newStats, sumStats, takeDocs, makePocket } from "./_cd_util.mjs";

export const GROUP = "sib";
export const GBNE = "11-multi-language/gutenberg-non-en/";   // misfiled English books (the atlas ml loader skipped all 19: _ml_skips.mjs ENGLISH_MISFILED)

/** One English book / play file under ETHOS -> Pocket, with the atlas "bk" pipeline: front matter, PG boilerplate, markup scrub, optional start/end cuts, optional speaker-label
 *  removal (drama: "allcaps"), sentence units (blank lines also end a unit), documents = blocks of ~100 units, 300k cap by whole documents. */
export function bookSibling(spec) {
  const { text: t0 } = stripFront(readText(spec.rel));
  let text = scrub(trimBack(stripPG(t0)));
  text = cut(text, spec.cut || {});
  if (spec.startProse) text = startProse(text);
  if (spec.drama) text = stripDrama(text, spec.drama, !!spec.stageParen);
  text = scrub(text, spec.extra || []);
  const units = toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
  const { pocket } = assemble({ ...spec, files: [spec.rel], notes: spec.notes || "" }, [units], { sibling: true, sourceRel: spec.rel });
  return { ...pocket, group: GROUP };
}

/** UD treebank files (absolute paths) -> Pocket like loaders/ud.mjs: CoNLL-U word lines, UPOS PUNCT dropped (tokenisation only), lowercase NFC, documents = blocks of 25 sentences,
 *  blocked separately inside each file. */
export function udSibling({ id, language, files, notes = "" }) {
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, units = [], docOf = [], used = [];
  let d = 0;
  for (const f of files) {
    const sents = readConllu(f, intern, st, "words"); used.push(`${path.basename(f)}:${sents.length}`);
    sents.forEach((s, k) => { units.push(s); docOf.push(d + Math.floor(k / 25)); });
    d += Math.ceil(sents.length / 25);
  }
  const p = { id, group: GROUP, register: "treebank", language, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped (tokenisation only), tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: "consecutive blocks of 25 sentences, blocked separately inside each file", source: files.join(" + "), files: used, notes, sibling: true, droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped } };
  validate(p);
  return p;
}

/** Token-global-shuffled LAW-FREE control of a pocket, built exactly as loaders/ctrl.mjs builds the atlas ct-* controls (all tokens shuffled globally, unit lengths re-assigned by a global shuffle,
 *  same units per document). Seed = seedOf("ctrl-v1", sourceId) as in ctrl.mjs. */
export function controlOf(src, id) {
  const rnd = rngOf(seedOf("ctrl-v1", src.id)), sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const flat = sh(src.units.flat()), lens = sh(src.units.map((u) => u.length));
  let o = 0; const units = lens.map((n) => { const u = flat.slice(o, o + n); o += n; return u; });
  const p = { id, group: GROUP, register: "control", language: src.language, script: src.script ?? null, units, docOf: src.docOf.slice(),
    meta: { tokenisation: `control of ${src.id}: ${src.meta?.tokenisation ?? ""}`, docDef: "same units-per-document counts as the source", source: `shuffled-real control of ${src.id}`, controlOf: src.id, sibling: true,
      notes: "tokens shuffled globally, unit lengths re-assigned by a global shuffle; law-free by construction (instrument check, as the atlas ct-* group)" } };
  validate(p);
  return p;
}
