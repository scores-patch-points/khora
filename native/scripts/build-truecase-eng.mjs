#!/usr/bin/env node
// native/scripts/build-truecase-eng.mjs — the casing the English treebank gives each word, induced, never typed.
//
// WHY: the English parser's tagger learned from capitalised text, so a name typed in lowercase ("pierre loves natasha") is not read as a name
// (EXPLORATORY, eval/chat-register/invariance.mjs: lowercasing keeps about 30% of the proper nouns). Truecasing is the standard repair: a word has a
// casing if most of its occurrences, away from the start of a sentence (where casing is positional), wear it. The table is counted from the treebank
// the parser was trained on, so no list of names is written by hand.
//
//   node native/scripts/build-truecase-eng.mjs [--ud=<en_ewt-ud-train.conllu>] [--giver=<wikidata-given-names-en.json>] [--out=native/priors-shipped/truecase-eng.json]
//
// OUT (Truecase@1): forms[lower] = [dominantCasing, occurrences, share, properNounShare]  for words whose dominant casing is not all-lowercase (>= MIN_EVIDENCE, >= MAJORITY) and that are names (properNounShare >= MAJORITY) or function-word spellings ("I", share >= SPELLING)
//                   attested[lower] = [notProperNoun, properNoun]  occurrences at any position, for every given-name label the giver holds that the treebank also uses (the ambiguity guard: "will", "mark", "hi")
//                   common = the words the treebank has met at least COMMON_EVIDENCE times, nearly always lowercase and never as a name: a capital on one is a title or an emphasis, never a name the notebook may copy
//                   closed = the words the treebank uses as function words (determiner, adposition, pronoun, auxiliary, conjunction, particle) at least as often as not: never a name
// Dials, each with its reason: MIN_EVIDENCE 2 (one occurrence is an anecdote; the same floor as name-prior.js); MAJORITY 0.5 (a casing is the word's when most of its occurrences wear it).
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url"; import os from "node:os";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..", "..");
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const UD = arg("ud", path.join(os.homedir(), "Documents", "janus-experiments", "ud", "UD_English-EWT", "en_ewt-ud-train.conllu"));
const GIVER = arg("giver", path.join(ROOT, "identity", "givers", "wikidata-given-names-en.json"));
const OUT = arg("out", path.join(ROOT, "native", "priors-shipped", "truecase-eng.json"));
const COMMON_EVIDENCE = 5, MIN_EVIDENCE = +arg("min", 2), MAJORITY = 0.5, NAME_SHARE = +arg("pshare", 0.5), SPELLING = 0.8, CLOSED = new Set(["DET", "ADP", "PRON", "AUX", "CCONJ", "SCONJ", "PART"]);
const raw = fs.readFileSync(UD, "utf8"), sha = crypto.createHash("sha256").update(raw).digest("hex");
const cased = new Map(), closed = new Map(), allSeen = new Map(); let sentences = 0, tokens = 0, positional = 0;
for (const block of raw.split("\n\n")) {
  const toks = [];
  for (const line of block.split("\n")) { if (!line || line.startsWith("#")) continue; const c = line.split("\t"); if (c[0].includes("-") || c[0].includes(".")) continue; toks.push({ form: c[1], upos: c[3] }); }
  if (!toks.length) continue; sentences++;
  let lead = true;                                                     // still before the first word of the sentence (an opening quote or bracket does not count as the word)
  for (const t of toks) {
    tokens++; const lc = t.form.toLowerCase();
    if (t.upos !== "PUNCT") { const a = allSeen.get(lc) ?? [0, 0]; a[0]++; if (t.upos === "PROPN") a[1]++; allSeen.set(lc, a); }   // every occurrence, sentence-initial or not: how often is this word a proper noun at all
    if (lead && t.upos !== "PUNCT") { lead = false; positional++; if (CLOSED.has(t.upos)) closed.set(lc, [...(closed.get(lc) ?? [0, 0])].map((x, i) => (i === 0 ? x + 1 : x))); continue; }
    if (t.upos === "PUNCT") continue;
    if (!cased.has(lc)) cased.set(lc, new Map()); const m = cased.get(lc); m.set(t.form, (m.get(t.form) ?? 0) + 1);
    const c = closed.get(lc) ?? [0, 0]; c[CLOSED.has(t.upos) ? 0 : 1]++; closed.set(lc, c);
  }
}
const forms = {}, attested = {}, closedWords = [], commonWords = [];
const given = fs.existsSync(GIVER) ? JSON.parse(fs.readFileSync(GIVER, "utf8")) : null;
const givenLower = new Set(given ? [...given.male, ...given.female, ...given.unisex].map((s) => s.toLowerCase()) : []);
for (const [lc, m] of [...cased].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
  let n = 0, best = null, bn = 0, low = 0, up = 0; for (const [f, c] of m) { n += c; if (c > bn) { bn = c; best = f; } if (f === lc) low += c; else up += c; }
  // a casing is a NAME's only if the treebank tags the word as a proper noun (at any position) ("Amount", "Village" are common nouns capitalised in a title or a heading); a function word's casing ("I") is a spelling convention and needs a clear majority
  const al = allSeen.get(lc) ?? [0, 0], pShare = al[0] ? al[1] / al[0] : 0, cl0 = closed.get(lc), clShare = cl0 ? cl0[0] / (cl0[0] + cl0[1]) : 0;
  if (n >= MIN_EVIDENCE && best !== lc && bn / n >= MAJORITY && (pShare >= NAME_SHARE || (clShare >= MAJORITY && bn / n >= SPELLING))) forms[lc] = [best, n, +(bn / n).toFixed(3), +pShare.toFixed(3)];
  if (givenLower.has(lc)) attested[lc] = [al[0] - al[1], al[1]];   // [times the treebank calls it anything but a proper noun, times it calls it one], at any position: "hi" is a greeting, "will" a verb
  // an ordinary word: the treebank has met it enough times, nearly always lowercase, and never as a name (so a capital on it is a title or an emphasis, not a name)
  if (n >= COMMON_EVIDENCE && up <= 0.1 * n && pShare <= 0.1) commonWords.push(lc);
  const cl = closed.get(lc); if (cl && cl[0] + cl[1] >= MIN_EVIDENCE && cl[0] / (cl[0] + cl[1]) >= MAJORITY) closedWords.push(lc);
}
const prior = {
  schema: "Truecase@1", language: "eng",
  giver: { treebank: "UD English-EWT", file: path.basename(UD), split: "train", sentences, tokens, sha256: sha, licence: "CC BY-SA 4.0 (the treebank's own README governs)", note: "a release of EWT with the same sentence count as the parser's training file; its bytes differ from the file the parser's meta records (sha256 d68e0612...), so this is a sibling release, not the identical file" },
  givenNames: given ? { giver: given.giver, licence: given.license, fetched: given.fetched, completeness: given.completeness, labels: givenLower.size, note: "the label list is truncated by the query service; a given name absent from it is simply not recased" } : null,
  dials: { MIN_EVIDENCE, MAJORITY, NAME_SHARE, SPELLING, COMMON_EVIDENCE, reason: "one occurrence is an anecdote (the floor name-prior.js uses); a casing is the word's when most of its non-initial occurrences wear it AND the treebank tags most of them as proper nouns; a function word's casing (I) is a spelling convention and needs a clear majority (0.8)" },
  stamp: { built: new Date().toISOString(), script: "native/scripts/build-truecase-eng.mjs", counted: { positionalTokensSkipped: positional } },
  forms, attested, closed: closedWords.sort(), common: commonWords.sort(),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(prior, null, 0) + "\n");
console.log(`${sentences} sentences, ${tokens} tokens (${positional} sentence-initial skipped); ${Object.keys(forms).length} words with a dominant capitalised casing; ${Object.keys(attested).length} given names attested in the treebank; ${closedWords.length} function words; wrote ${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`);
