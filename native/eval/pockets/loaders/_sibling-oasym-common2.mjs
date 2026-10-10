// loaders/_sibling-oasym-common2.mjs — treebank, code and control/planted builders of the order.asym sibling replication (underscore: ignored by run-atlas.mjs). NEW FILE.
import fs from "node:fs";
import path from "node:path";
import { validate, rngOf, seedOf, sha256, MAX_TOKENS, tokenCount } from "../lib/pocket.mjs";
import { readConllu } from "./_conllu.mjs";
import { interner, scriptOf, capByHash } from "./_ud_ml_common.mjs";
import { codeText, newStats, sumStats, takeDocs, makePocket } from "./_cd_util.mjs";
import { TB, UDE, CC, GROUP, fingerprint } from "./_sibling-oasym-common.mjs";
import { V, buildDocs, lexicon } from "./_planted-core.mjs";
import { NULL, NULL2, MARKOV } from "./_planted-worlds1.mjs";

const readText = (f) => fs.readFileSync(f, "utf8");
const sentKey = (s) => s.join(" ");

/** UD TRAIN split of one treebank stem (/private/tmp/claude-501/tb/<stem>/train.conllu) -> Pocket as loaders/ud.mjs builds the atlas treebank pockets (CoNLL-U word lines, multiword ranges split, UPOS PUNCT dropped,
 *  tokens without a letter dropped, lowercase NFC, documents = consecutive blocks of 25 sentences). The atlas reads ONLY the dev+test files of /private/tmp/claude-501/ud-eval; train files are new documents.
 *  meta.leak counts train sentences that also occur verbatim in the dev/test files of the same stem in ud-eval (descriptive only). */
export function udTrain({ id, stem, language, notes = "" }) {
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const file = `${TB}/${stem}/train.conllu`, all = readConllu(file, intern, st, "words");
  const leakSet = new Set(), evalFiles = [];
  for (const f of ["dev.conllu", "test.conllu"]) { const q = `${UDE}/${stem}/${f}`; if (fs.existsSync(q)) { evalFiles.push(f); for (const s of readConllu(q, interner(), { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, "words")) leakSet.add(sentKey(s)); } }
  const sents = all.filter((s) => !leakSet.has(sentKey(s))), leak = all.length - sents.length;   // LEAKAGE GUARD: a train sentence that also occurs verbatim in dev/test of the same stem is dropped
  let units = sents, docOf = sents.map((_, k) => Math.floor(k / 25)), capNote = "no cap needed";
  if (tokenCount(units) > MAX_TOKENS) { const c = capByHash(id, units, docOf); units = c.units; docOf = c.docOf; capNote = "300k cap by whole blocks (capByHash)"; }
  const p = { id, group: GROUP, register: "treebank", language, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped (tokenisation only), tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: `consecutive blocks of 25 sentences of ${stem}/train.conllu after the leakage guard (${capNote})`, source: file, notes, sibling: true, droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped,
    leak: { trainSentencesDroppedBecauseAlsoInEvalSameStem: leak, of: all.length, evalFilesChecked: evalFiles } } };
  validate(p);
  return p;
}

/** Token-global-shuffled LAW-FREE control, built exactly as loaders/ctrl.mjs builds the atlas ct-* controls (all tokens shuffled globally, unit lengths re-assigned by a global shuffle, same units per document). */
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

/** FRESH planted world: the atlas world definitions (iid Zipf null worlds, rank-bin Markov world) re-drawn with NEW document seeds (id = this pocket's id) and a NEW lexicon tag ("C"). */
const WORLDS = { iid: { world: NULL, note: "iid Zipf(1.0) over 5000 types, unit lengths iid lognormal D1, NO structure" }, iid2: { world: NULL2, note: "iid Zipf(1.3) over 5000 types, unit lengths iid shifted-exponential D2, NO structure" },
  markov: { world: MARKOV, note: "first-order Markov on 8 rank bins with a strong one-way flow (the atlas pl-markov design), unit lengths D1" } };
export function plantedFresh(id, kind) {
  const { world, note } = WORLDS[kind], lex = lexicon("C"), { units, docOf } = buildDocs(id, 100, world.docMaker, lex);
  const p = { id, group: GROUP, register: "planted", language: "x-planted", script: "latn", units, docOf, meta: {
    tokenisation: "planted world: pronounceable a-z strings, one per type; no tokenisation step", docDef: "100 documents of ~1000 tokens each, closed at a unit boundary (as the atlas pl-* worlds)",
    source: `loaders/_planted-core.mjs buildDocs with world '${kind}' of _planted-worlds1.mjs, new seeds (document seed = seedOf('planted-v1', '${id}', 'doc', d)), lexicon tag C`, notes: note, sibling: true, plantedKind: kind } };
  validate(p);
  return p;
}
