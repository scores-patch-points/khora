// arrangement-features.js — the FEATURES of a being, read from its arrangements, in one canonical vocabulary and carrying the perspective.
//
// identity-cancel.js cancels features, so what counts as a feature decides what can be the same. Measured (WEFT-IDENTITY.md, experiment 4): with features written in each text's own
// words a claim's end and the page's being share almost nothing ("is one of the Great Lakes" against `is_a lake`), and the position of an end in its atom (who sold, who was sold to)
// was not a feature at all, so "we sold to Sagard" and "Sagard sold to us" cancelled. This organ writes the features so that they can cancel only where the things are one:
//   v:<canon>@<pos>   the predicate, CANONICAL (one key per synonym class, the class read from a declared giver: Wiktionary's listed synonyms and shared translations, through
//                     wikt-gloss.js makeSynonymy; a class's key is its alphabetically first member, so the key never depends on which text was read first), with the position of the
//                     being in the atom: @0 the first end, @1 the second. The position IS the direction: a seller and a buyer of one sale carry v:sell@0 and v:sell@1.
//   w:<key>           the other ends of the same atom, by their key (the last name token of a referent; a figure by its measure)
//   k:<canon>         what the being is said to be (is_a), canonical the same way
//   m:<measure>       the measure of a figure the being has (has_<attr>(being, figure)): a being with a radius in metres and one with a radius in dollars do not cancel
//   unit=<measure>    (one-valued, declared) the measure of the figure, when the mention IS a figure: a value in metres is not a value in shares
//   asof=<year>       (one-valued, declared) the years the atom states as the time of the fact (atoms.js `time`), so a value held for 1900 and one for 2024 are not one value
// PERSPECTIVE lists the one-valued dimensions (identity-cancel.js excludes a candidate holding another value of one). Pure; the synonymy judge is injected.
import { argText, low } from "../kernel/atom-support.js";

export const PERSPECTIVE = Object.freeze(["unit", "asof"]);
const tok = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t.at(-1) : ""; };
const stemOf = (pred) => { const m = /^(more|most):/.exec(pred); const p = m ? pred.slice(m[0].length) : pred; const i = p.indexOf("_"); return { degree: m ? m[1] : null, stem: i > 0 ? p.slice(0, i) : p, suffix: i > 0 ? p.slice(i + 1) : null }; };

/** makeCanon(same) → canon(word, upos): the alphabetically first member of the word's synonym class among the words seen so far (union-find; `same(lang, a, b, upos)` is the giver's judge) */
export function makeCanon(same, { lang = "en" } = {}) {
  const parent = new Map(), seen = [], memo = new Map();
  const find = (x) => { let r = x; while (parent.get(r) !== r) r = parent.get(r); let y = x; while (parent.get(y) !== r) { const n = parent.get(y); parent.set(y, r); y = n; } return r; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra === rb) return; const [lo, hi] = ra < rb ? [ra, rb] : [rb, ra]; parent.set(hi, lo); };
  const add = (word, upos) => {
    const w = low(word); if (!w || parent.has(w)) return w;
    parent.set(w, w);
    for (const other of seen) { const k = `${w}\u0000${other}\u0000${upos}`; let r = memo.get(k); if (r === undefined) { try { r = !!same?.(lang, w, other, upos)?.same; } catch { r = false; } memo.set(k, r); } if (r) union(w, other); }
    seen.push(w); return w;
  };
  // THE VOCABULARY IS THE MATERIAL'S: register every word of both sides BEFORE writing any feature (registerAtoms), or a class's key can change when its earlier member arrives later
  const canon = (word, upos = "VERB") => { const w = add(word, upos); return w ? find(w) : w; };
  canon.register = (words, upos = "VERB") => { for (const w of words) add(w, upos); return canon; };
  canon.registerAtoms = (atoms) => { for (const a of atoms ?? []) { if (a.pred === "named") continue; if (a.pred === "is_a") { const k = a.args?.[1]; if (k) add(tok(k) || argText(k), "NOUN"); continue; } add(stemOf(a.pred).stem, "VERB"); } return canon; };
  return canon;
}

/** featuresOf(atoms, entityId, { canon }) → string[]  (the being's features; duplicates kept out) */
export function featuresOf(atoms, entityId, { canon = (w) => low(w), lang = "en" } = {}) {
  const out = new Set();
  for (const a of atoms) {
    const args = a.args ?? [], at = args.findIndex((x) => x.entity === entityId); if (at < 0) continue;
    const pos = a.slots?.[at] ?? at;          // the ROLE position (atoms.js slots): a passive's patient stays the patient
    const { degree, stem, suffix } = stemOf(a.pred);
    if (a.pred === "is_a") { if (pos === 0) { const k = args[1]; out.add(`k:${canon(tok(k) || argText(k), "NOUN")}`); } continue; }
    if (a.pred === "named") continue;
    const base = `${degree ? degree + ":" : ""}${canon(stem)}${suffix ? "_" + suffix : ""}`;
    out.add(`v:${base}@${pos}`);
    if (/^has_/.test(a.pred) && pos === 0 && args[1]?.measure) out.add(`m:${args[1].measure}`);
    for (const [j, y] of args.entries()) { if (j === at) continue; if (y.measure) out.add(`w:${y.measure}`); else if (tok(y)) out.add(`w:${tok(y)}`); }
    if (a.time?.length) for (const y of a.time) out.add(`asof=${y}`);
    // DIRECTION is the position (@0 / @1) of the SAME canonical predicate; it is not a separate dimension. A first version wrote dir=out/in from the dative suffix and measured
    // (identity-cancel-canon.mjs) that "drawn TO Hood" (a goal) then read as a transfer out: the dative adposition alone does not mark a transfer. Withdrawn.
  }
  return [...out].sort();
}

/** the features of a figure mention (a claim end that is a value, not a being): its measure is a one-valued dimension */
export const figureFeatures = (end) => (end?.measure ? [`unit=${end.measure}`] : []);
