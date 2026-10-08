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
import { parseTreebank, buildFrameData, MIN_FRAME } from "./lib/frame-build.mjs";

const [IN, OUT, LANGUAGE, GIVER_URL = null] = process.argv.slice(2);
if (!IN || !OUT || !LANGUAGE) { console.error("usage: build-frame-prior.mjs <train.conllu> <out.json> <lang> [giver-url]"); process.exit(1); }

const sentences = parseTreebank(readFileSync(IN, "utf8"));
const { marginal, frames: kept, dropped, hapax } = buildFrameData(sentences);

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
    hapax,
  },
  marginal,
  frames: kept,
}) + "\n");
console.log(`${LANGUAGE}: ${sentences.length} sentences, ${hapax} hapax, ${Object.keys(kept).length} frames -> ${OUT}`);
