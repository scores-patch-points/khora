// khora · build-refusal-floor — UD CoNLL-U in, RefusalFloor@1 out: how low the frame's
// NAMING mass for a word the prior has never met must fall before the reader may REFUSE it,
// derived so that the refusal wrongly drops at most ALPHA of the true naming occurrences.
//
// WHY. A prior may only refuse or nominate, never admit (READING-POLICY rule 3), and a
// refusal that is wrong silently loses a being. The plurality rule ("refuse when the class the
// frame implies is a non-naming class holding >= 0.5") lost 2-22% of true unseen naming
// occurrences (eval/competence CARD RC3, B3 ceiling 5%). Bounding the refusal at the declared
// resolution KEY_ALPHA itself ("refuse only when naming mass < 0.05") meets the bound by refusing
// almost nothing (it catches ~3% of non-names: measured, eval/beings-ladder s0). The honest
// operating point sits between: the largest floor whose OWN loss, measured on words the prior
// really had not met, is still <= ALPHA.
//
// HOW. K contiguous folds of the treebank. For each fold, a POS prior and a frame prior are
// built from the OTHER folds (the same functions that build the shipped priors), and every word
// of the held-out fold that those priors have never seen is read by classAt — the reader's own
// function — in its own frame. Its naming mass (NOUN + PROPN) and its gold class give, over all
// folds, the distribution of the mass the reader will see on a true naming occurrence it has
// not met. floor = the smallest mass m such that the share of naming occurrences with mass < m is
// <= ALPHA, capped at 0.5 (a word the frame calls at least half naming is never refused).
// A word is refused only when its mass is STRICTLY below the floor.
//
// NOT A TAGGER, NOT A MODEL: counts of human-annotated gold; one number per language.
// Usage: node native/scripts/build-refusal-floor.mjs <train.conllu> <out.json> <lang> [alpha=0.05] [folds=5]
import { readFileSync, writeFileSync } from "node:fs";
import { parseTreebank, tallyForms, buildFrameData } from "./lib/frame-build.mjs";
import { classAt } from "../adapters/text/heard-nominals.js";
import { wordFloor } from "../adapters/text/script-floor.js";

const [IN, OUT, LANGUAGE, ALPHA_ARG = "0.05", FOLDS_ARG = "5"] = process.argv.slice(2);
if (!IN || !OUT || !LANGUAGE) { console.error("usage: build-refusal-floor.mjs <train.conllu> <out.json> <lang> [alpha] [folds]"); process.exit(1); }
const ALPHA = Number(ALPHA_ARG), K = Number(FOLDS_ARG);
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u, NUMERIC = /^[\p{N}'’]+$/u;
const isRedup = (w) => { const cs = [...w]; return cs.length >= 4 && new Set(cs).size <= 2; };
const inScope = (w) => WORDISH.test(w) && !NUMERIC.test(w) && !isRedup(w) && w.length >= wordFloor(w, 3);
const NAMING = new Set(["NOUN", "PROPN"]);

const sentences = parseTreebank(readFileSync(IN, "utf8"));
const size = Math.ceil(sentences.length / K);
const naming = [], non = [];
for (let k = 0; k < K; k++) {
  const held = sentences.slice(k * size, (k + 1) * size);
  const rest = [...sentences.slice(0, k * size), ...sentences.slice((k + 1) * size)];
  const tally = tallyForms(rest);
  const forms = Object.fromEntries(tally);
  const posPrior = { forms };
  const fd = buildFrameData(rest, { tally });
  const framePrior = { marginal: fd.marginal, frames: fd.frames };
  for (const s of held) for (let i = 0; i < s.length; i++) {
    const t = s[i];
    if (!inScope(t.form) || Object.hasOwn(forms, t.form)) continue;
    const { dist } = classAt(t.form, i > 0 ? s[i - 1].form : null, i + 1 < s.length ? s[i + 1].form : null, { posPrior, framePrior, minShare: 0.5 });
    if (!dist) continue; // the reader abstains here: nothing to refuse on
    const mass = (dist.NOUN ?? 0) + (dist.PROPN ?? 0);
    (NAMING.has(t.upos) ? naming : non).push(mass);
  }
}
naming.sort((a, b) => a - b);
const allowed = Math.floor(ALPHA * naming.length);
const raw = naming.length ? naming[Math.min(allowed, naming.length - 1)] : 0;
const floor = Math.min(0.5, raw);
const share = (xs, f) => (xs.length ? xs.filter((m) => m < f).length / xs.length : null);
writeFileSync(OUT, JSON.stringify({
  schema: "RefusalFloor@1", language: LANGUAGE, alpha: ALPHA, floor,
  provenance: {
    giver: "Universal Dependencies treebank (train split), human-annotated gold",
    builder: "khora native/scripts/build-refusal-floor.mjs",
    basis: `K=${K} contiguous folds; per fold a POS prior and a frame prior built from the other folds; every in-scope held-out word the prior had not met is read by classAt; floor = the naming mass below which only ALPHA of the true naming occurrences fall (cap 0.5)`,
    folds: K, pseudo_unseen_naming: naming.length, pseudo_unseen_non_naming: non.length,
    lost_share: share(naming, floor), caught_share: share(non, floor), uncapped_floor: raw,
    note: "the floor is a refusal bound, not a classifier: a word below it is refused, a word at or above it is kept and flagged class_unsettled when its frame does not settle it",
  },
}, null, 1) + "\n");
console.log(`${LANGUAGE}: floor ${floor.toFixed(3)} (naming ${naming.length}, non ${non.length}; lost ${share(naming, floor)?.toFixed(3)}, caught ${share(non, floor)?.toFixed(3)}) -> ${OUT}`);
