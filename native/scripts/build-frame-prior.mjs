// khora · build-frame-prior — UD CoNLL-U in, FramePrior@1 out: what class an
// UNSEEN word is, given the classes of the words on either side of it.
//
// WHY. A being-finder that admits "whatever the POS prior has never seen"
// (heard-surfaces.js's own polarity: a treebank has almost no character's
// name) also admits every unseen verb, slang word and typo. Case cannot
// separate them (Chinese, Arabic, Hebrew have none; SMS English throws it
// away). What separates them is the FRAME the word sits in: an unseen word
// between a determiner and a verb is a noun; one after an auxiliary or a
// negator is a verb. That is a fact a treebank already holds as counts.
//
// WHAT. For every token whose form occurs exactly once in the treebank (the
// hapax — the standard stand-in for "a word the reader has not met"), tally
// its gold UPOS against (class of the previous token, class of the next
// token), where a neighbour's class is its form's majority UPOS in the same
// treebank, and a neighbour that is itself a hapax is "UNK". Edges are "^"
// and "$". Backoffs keep the table honest where a frame is rare:
//   frames["P|N"]  both neighbours   frames["P|*"] left only
//   frames["*|N"]  right only        frames["*|*"] the hapax prior
// `marginal` is P(class) over all hapax, for the reader's Bayes correction.
//
// NOT A TAGGER, NOT A MODEL: counts of human-annotated gold, no inference at
// build time, no sentence text embedded. Same standing as build-pos-prior.mjs.
//
// Usage: node native/scripts/build-frame-prior.mjs <train.conllu> <out.json> <lang> [giver-url]
import { readFileSync, writeFileSync } from "node:fs";

const [IN, OUT, LANGUAGE, GIVER_URL = null] = process.argv.slice(2);
if (!IN || !OUT || !LANGUAGE) { console.error("usage: build-frame-prior.mjs <train.conllu> <out.json> <lang> [giver-url]"); process.exit(1); }

const MIN_FRAME = 5; // a frame cell is kept at >= this many hapax observations; below it the backoff speaks

const sentences = [];
let toks = [];
for (const line of readFileSync(IN, "utf8").split("\n")) {
  if (line.startsWith("#")) continue;
  if (!line.trim()) { if (toks.length) sentences.push(toks); toks = []; continue; }
  const c = line.split("\t");
  if (!/^[0-9]+$/.test(c[0])) continue;
  toks.push({ form: c[1].toLowerCase(), upos: c[3] });
}
if (toks.length) sentences.push(toks);

const tally = new Map(); // form -> {upos: n}
for (const s of sentences) for (const t of s) { const m = tally.get(t.form) ?? {}; m[t.upos] = (m[t.upos] ?? 0) + 1; tally.set(t.form, m); }
const total = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const majority = (m) => Object.entries(m).sort((a, b) => b[1] - a[1])[0][0];
const classOf = (form) => { const m = tally.get(form); return !m || total(m) < 2 ? "UNK" : majority(m); };

const frames = {};
const bump = (key, upos) => { (frames[key] ??= {})[upos] = (frames[key][upos] ?? 0) + 1; };
const marginal = {};
for (const s of sentences) {
  for (let i = 0; i < s.length; i++) {
    const t = s[i];
    if (total(tally.get(t.form)) !== 1) continue; // hapax only
    const P = i === 0 ? "^" : classOf(s[i - 1].form);
    const N = i === s.length - 1 ? "$" : classOf(s[i + 1].form);
    bump(`${P}|${N}`, t.upos); bump(`${P}|*`, t.upos); bump(`*|${N}`, t.upos); bump("*|*", t.upos);
    marginal[t.upos] = (marginal[t.upos] ?? 0) + 1;
  }
}
const kept = {};
let dropped = 0;
for (const [k, v] of Object.entries(frames)) { if (total(v) >= MIN_FRAME || k === "*|*") kept[k] = v; else dropped += 1; }

writeFileSync(OUT, JSON.stringify({
  schema: "FramePrior@1",
  language: LANGUAGE,
  provenance: {
    giver: `Universal Dependencies treebank (train split), human-annotated gold${GIVER_URL ? ` — ${GIVER_URL}` : ""}`,
    builder: "khora native/scripts/build-frame-prior.mjs",
    basis: "UPOS distribution of treebank hapax forms conditioned on the majority class of the previous and next token (hapax neighbours = UNK, sentence edges ^/$) — the observable frame an unseen word sits in; backoffs P|*, *|N, *|*",
    min_frame: MIN_FRAME,
    frames_dropped_below_floor: dropped,
    sentences: sentences.length,
    hapax: Object.values(marginal).reduce((a, b) => a + b, 0),
  },
  marginal,
  frames: kept,
}) + "\n");
console.log(`${LANGUAGE}: ${sentences.length} sentences, ${Object.values(marginal).reduce((a, b) => a + b, 0)} hapax, ${Object.keys(kept).length} frames -> ${OUT}`);
