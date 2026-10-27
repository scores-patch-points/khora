// eval/referents/convention-witness.mjs — HOW CLOSELY WRITTEN ENGLISH KEEPS THE CAPITAL'S CONVENTIONS, measured on the received ground.
//
// adapters/text/conventions.js is the ledger of the conventions the cast's capital tier reads by. A convention is kept more or less; this
// measures how much, on UD_English-GUM's training file (the gold PROPN tags are the giver), and prints the figures the ledger's witnesses
// quote. Nothing here is read by the cast: the rule reads the lexicon's rate and the text's own counts, never these figures.
//
//   GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/convention-witness.mjs
import fs from "node:fs";
import { parseGum } from "./pronoun-golden.mjs";

const file = process.env.GUM_TRAIN;
if (!file || !fs.existsSync(file)) { console.log("convention-witness: skipped — set GUM_TRAIN to UD_English-GUM's en_gum-ud-train.conllu."); process.exit(0); }
const CAP = /^\p{Lu}/u, LETTER = /\p{L}/u, TERMINAL = /[.?!…"”')\]]$/;
const n = { mid: 0, midCap: 0, midProper: 0, midProperCap: 0, midOther: 0, midOtherCap: 0, init: 0, initCap: 0, initCapProper: 0, sents: 0, unmarked: 0 };
for (const d of parseGum(file)) for (const s of d.sents) {
  n.sents++;
  const last = s.tokens.at(-1);
  if (last && !TERMINAL.test(last.form)) n.unmarked++;
  s.tokens.forEach((t, i) => {
    if (!LETTER.test(t.form)) return;
    const cap = CAP.test(t.form);
    if (i === 0) { n.init++; if (cap) { n.initCap++; if (t.upos === "PROPN") n.initCapProper++; } return; }
    n.mid++; if (cap) n.midCap++;
    if (t.upos === "PROPN") { n.midProper++; if (cap) n.midProperCap++; } else { n.midOther++; if (cap) n.midOtherCap++; }
  });
}
const r = (a, b) => +(a / Math.max(1, b)).toFixed(4);
console.log(JSON.stringify({
  ground: "UD_English-GUM train", counts: n,
  nameIsCapitalMidSentence: r(n.midProperCap, n.midProper),
  nonNameIsCapitalMidSentence: r(n.midOtherCap, n.midOther),
  capitalMidSentenceIsName: r(n.midProperCap, n.midCap),
  sentenceInitialCapitalIsName: r(n.initCapProper, n.initCap),
  sentenceEndsUnmarked: r(n.unmarked, n.sents),
}, null, 2));
