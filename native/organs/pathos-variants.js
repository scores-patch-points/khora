// organs/pathos-variants.js — write it NON-BORINGLY, mechanically: choose among the lawful constructions of each sentence so the passage has
// a cadence. No model; the choice is a search over sentences the composer has already made lawful, never a rewrite of one.
//
// The user, 2026-10-14: "we can't cite a publication, we should cite the author or the speaker …, and then use the pathos archons to write
// this non-boringly."
//
//   chooseVariants(alternatives) → { index: [i…], cost, considered, reports }
//        alternatives[k] = the lawful realizations of sentence k (each a sentence { text, segs, … }); index[k] picks one of them.
//
// THE ARCHONS THIS SERVES (the-fold/archon-rules.js, the revision grid's pathos column; micro grain):
//   KLINKENBORG / LISH — cadence. A passage whose sentence lengths barely vary has no cadence (Murch's flatline, organs/pacing.js
//     `pacingGrade`, the same measure `klinkenborgCadence` reports). The search prefers passages that do not flatline, then those whose
//     lengths vary more (the grade's own `varianceRatio`).
//   ZINSSER's tic, applied to the frame: a construction used twice in one passage is a tic of the writer, not of the material. The search
//     prefers passages that spend each construction once.
//   CLARK — a sentence opening on the word its neighbour opened on has no job in its place: the search avoids repeated openers.
// ORLEAN (stakes) and GORNICK (what the piece is about underneath) are named in the grid and UNTAUGHT: no mechanical probe exists for
// them, so this organ does not pretend to serve them.
//
// ORDER OF PREFERENCE (lexicographic — there are no weights to set): fewest repeated openers; fewest repeated constructions; not a
// flatline; greatest variance ratio; then the lowest variant indices, so the result is deterministic. The search is exhaustive over the
// product of alternatives, which the composer keeps small (at most the variants of at most one stage's sentences).
import { pacingGrade } from "./pacing.js";

const opener = (t) => (String(t).trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/u)?.[0] ?? "").toLowerCase();

/** The cost tuple of one assignment (lower is better, compared element by element). */
export function costOf(chosen) {
  const openers = chosen.map((s) => opener(s.text));
  const repeatedOpeners = openers.filter((o, i) => o && openers.indexOf(o) !== i).length;
  const variants = chosen.map((s) => s.variant ?? null).filter((v) => v != null);
  const repeatedConstructions = variants.filter((v, i) => variants.indexOf(v) !== i).length;
  const g = pacingGrade(chosen.map((s) => s.text).join(" "));
  return [repeatedOpeners, repeatedConstructions, g.flatline ? 1 : 0, -(g.varianceRatio ?? 0)];
}
const less = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return true; if (a[i] > b[i]) return false; } return false; };

export function chooseVariants(alternatives, { maxCombos = 4096 } = {}) {
  const alts = alternatives.map((a) => (a && a.length ? a : null));
  if (alts.some((a) => !a)) return { index: alts.map((a) => (a ? 0 : -1)), cost: null, considered: 0, reports: [] };
  const sizes = alts.map((a) => a.length);
  // A product too large to search exhaustively falls back to each sentence's first lawful variant: said, never silently sampled.
  const total = sizes.reduce((p, n) => p * n, 1);
  if (total > maxCombos) return { index: sizes.map(() => 0), cost: costOf(alts.map((a) => a[0])), considered: 0, reports: [{ note: `product ${total} exceeds ${maxCombos}: first variants used` }] };
  let best = null, bestCost = null, considered = 0;
  const idx = sizes.map(() => 0);
  const rec = (k) => {
    if (k === sizes.length) {
      considered++;
      const c = costOf(idx.map((j, i) => alts[i][j]));
      if (!bestCost || less(c, bestCost)) { best = idx.slice(); bestCost = c; }
      return;
    }
    for (let j = 0; j < sizes[k]; j++) { idx[k] = j; rec(k + 1); }
  };
  rec(0);
  const first = costOf(alts.map((a) => a[0]));
  return { index: best, cost: bestCost, considered, reports: [{ first_variants_cost: first, chosen_cost: bestCost, improved: less(bestCost, first) }] };
}
