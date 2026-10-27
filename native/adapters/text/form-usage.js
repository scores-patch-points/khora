// adapters/text/form-usage.js — HOW A FORM IS USED, from the received treebank, for a capital the text cannot test (2026-10-27).
//
// surfaces.js::surfacesFromEvidence asks, of a word written both capitalised and lower-case, whether its capitals exceed a fair coin.
// A word the text NEVER writes lower-case gave that test nothing to stand on, and was admitted on a single capital: "Grab" or "Well"
// after a heading that carries no full stop, where the capital is the sentence's and the cut cannot see it. The capital is a convention
// (conventions.js, "capital-marks-a-name"), kept more or less, so the text's own capitals are weighed against the treebank's own USE
// of the form: of every time UD_English-EWT (the pos prior the reader already holds, pos-eng.json, human-annotated, counts kept) tags
// the form, how often is it one that can head a mention and how often is it not.
//
//   nominal   the tags NOUN, PROPN and ADJ: a name, a noun, or an adjective that names a people or a language ("French", "Chinese")
//   other     every other tag: a verb, an adverb, an interjection, a conjunction, a pronoun, a determiner …
//
// surfaces.js hands both to the one test it already has (capitalisationIsSignificant, exact one-sided tail at a fair coin, alpha 0.05):
// the word is refused when its non-nominal uses exceed what the nominal ones plus the text's own capitals can balance. "Grab" (8 uses,
// all verb) needs no more than its one capital to be refused; a word the treebank uses mostly as a noun ("Government") is never refused
// by it. The cost is a name whose lower-case twin the treebank saw mostly as a function word ("May", "Will"): the prior is keyed on the
// case-folded form, so it is refused unless the text's capitals nearly balance those uses (eval/referents/README.md counts it). A form the
// treebank has not seen has no use to weigh: the answer is null and the word is undecided, so it stays a being.
//
// The counts are the prior's, measured, not typed here. `classifyWord` is the repo's lens over that prior (wordclass.js); nothing is
// re-read. English only (the prior is English's, and what a capital means is a convention of the language): the caller does not build
// this for another language.
//
//   formUsageOf(posPrior) → (surface) => { nominal, other } | null, synchronous; null for a form with no measured count

import { classifyWord } from "./wordclass.js";

const NOMINAL = new Set(["NOUN", "PROPN", "ADJ"]);

export function formUsageOf(posPrior) {
  if (!posPrior || typeof posPrior.forms !== "object" || !posPrior.forms) return null;
  return (surface) => {
    const c = classifyWord(String(surface ?? ""), { posPrior });
    if (!c.found || !(c.total > 0)) return null;   // a shape or a class lexicon attests a form; it counts nothing
    const nominal = c.candidates.filter((x) => NOMINAL.has(x.upos)).reduce((n, x) => n + x.count, 0);
    return { nominal, other: c.total - nominal };
  };
}
