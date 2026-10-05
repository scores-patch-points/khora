// ear.js — a language's EAR: the received, giver-named grammar that turns
// text of any script into the words the being tiers listen to.
//
//   NL → [ear: this language's word boundaries and bound morphemes] → words
//
// Two parts, both read from the language's own priors and neither from a
// language name:
//   segment — word boundaries for scripts that write none (script-segment.js)
//   peel    — bound proclitics split off the front of a word (Arabic و/ب/ل/ال,
//             Hebrew ה/ו/ב/…), committed only when the remainder is a form the
//             language's POS prior attests (heard-surfaces.js::peelProclitics)
//
// `makeEar({posPrior, proclitics})` returns `{ segment, peel, proclitics }`,
// each null when the language does not need it.
//
//   enclitics — the mirror at the END of a word (Korean 은/는/이/가/을/를/에서…),
//             from EncliticPrior@1 (derived from the treebank's own morpheme
//             annotation). Peeled one particle at a time, longest first, and
//             committed only when the remainder is attested by the POS prior
//             and the whole word is not itself a well-attested form.

import { makeSegmenter } from "./script-segment.js";
import { peelProclitics } from "../../organs/heard-surfaces.js";

const WORD = /[\p{L}\p{M}\p{N}']+/gu;

const ENCLITIC_DEPTH = 2;
const WHOLE_WORD_FLOOR = 3; // a word attested this often is itself a word, not stem+particle

export function makeEar({ posPrior = null, proclitics = null, enclitics = null } = {}) {
  const set = proclitics ? new Set(proclitics) : null;
  const enc = enclitics && enclitics.length ? [...new Set(enclitics)].sort((a, b) => b.length - a.length) : null;
  const total = (c) => Object.values(c).reduce((x, y) => x + y, 0);
  const peelEnclitics = (word) => {
    if (!enc || !posPrior?.forms) return null;
    const whole = posPrior.forms[word];
    if (whole && total(whole) >= WHOLE_WORD_FLOOR) return null;
    let rest = word; const tail = [];
    for (let d = 0; d < ENCLITIC_DEPTH; d++) {
      const e = enc.find((x) => rest.length > x.length && rest.endsWith(x));
      if (!e) break;
      tail.unshift(e); rest = rest.slice(0, -e.length);
      if (posPrior.forms[rest]) return { stem: rest, enclitics: tail };
    }
    return null;
  };
  const segment = posPrior ? makeSegmenter(posPrior) : null;
  const hasPro = Boolean(set && set.size && posPrior);
  const peel = hasPro || enc
    ? (text) => text.replace(WORD, (word) => {
        if (hasPro) { const hit = peelProclitics(word, set, posPrior); if (hit) return [...hit.proclitics, hit.stem].join(" "); }
        const e = peelEnclitics(word);
        return e ? [e.stem, ...e.enclitics].join(" ") : word;
      })
    : null;
  return Object.freeze({ segment, peel, proclitics: set, enclitics: enc ? new Set(enc) : null });
}
