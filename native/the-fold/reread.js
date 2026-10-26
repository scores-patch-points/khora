// reread.js — RE-ENTRY: the upper layer's typed gaps sent back down as a more careful reading, and the delta of that reading recorded.
//
// The layers run one way (reader -> atoms -> stage -> verdict), so the verdict is at the mercy of the first reading. But the verdict's gaps already say WHERE the reading was not
// enough: an end bound to nothing or to several (ambiguous_binding), a bind that stands on a thin reading (needs_deeper_reading, with how much is missing), a word no atom carried
// (unread), a swap (direction_swap). This organ reads THAT sentence again with more care and records what changed. "A spiral with no re-entry is a line" (CODING-LESSONS 41); "when
// the defs don't eva, you rec them". The record is the product: the delta of the more careful reading is what the lower layer learns from the upper one.
//
//   rereadAtoms({ text, lang, grammar, corefModel, k, previous, title, ... }) → { atoms, readings, rec }
//       tier "k-best": the sentence read under its k best parses (grammar.rowsOfK), the atoms the UNION (each atom says which readings state it: `readings`); the first parse's atoms
//       are the reading as it was, the rest are what more care added. A grammar with no rowsOfK reads once and says so (a typed gap, not a silent re-read).
//   recurse({ A, B, judge, reread, tiers, maxPasses }) → { A, B, j, passes: [{ pass, trigger, sides, tier, delta, gapsBefore, gapsAfter, verdictBefore, verdictAfter }], stopped }
//       the loop: judge; take the gaps; each gap asks for a REMEDY (a side and a tier, remedyOf); spend the first the caller can read, once; judge again; stop when a pass changes
//       no conclusion (the recursion's own DMD: the shallowest pass beyond which more reading moves nothing), or every remedy asked for is spent or unavailable. Every pass is appended.
// Pure given its readers. No model.
import { readAtoms } from "../organs/read-atoms.js";

export function rereadAtoms({ text, lang = "en", grammar, k = 3, trigger = null, ...rest } = {}) {
  // THE FIRST READING IS THE READING AS IT WAS (grammar.rowsOf, the production parse); the k best of the beam are read BESIDE it, never in its place. Measured: the beam's own first
  // parse is not the production parse and can be worse ("is" hung as a clause on "Mercury is the hottest planet"), so a re-read that replaced the reading lost every atom.
  const first = grammar.rowsOf(text), beam = typeof grammar?.rowsOfK === "function" ? grammar.rowsOfK(text, k) : null;
  const key = (rows) => JSON.stringify(rows.map((r) => [r.head, r.deprel, r.upos]));
  const rowsList = beam ? [first, ...beam.filter((rows) => key(rows) !== key(first))] : null;
  if (!rowsList || rowsList.length < 2) {
    const one = readAtoms({ text, lang, grammar, ...rest });
    return { ...one, readings: 1, rec: { tier: "k-best", k, trigger, readings: rowsList ? rowsList.length : 1, gap: rowsList ? "one_parse_only" : "no_k_best_reader", added: [], removed: [] } };
  }
  const per = rowsList.map((rows) => readAtoms({ text, lang, grammar: { rowsOf: () => rows, claimsOf: grammar.claimsOf }, ...rest }));
  const byText = new Map();
  per.forEach((r, i) => { for (const a of r.atoms) { const cur = byText.get(a.text); if (cur) cur.readings.push(i); else byText.set(a.text, { ...a, readings: [i] }); } });
  const atoms = [...byText.values()], had = new Set(per[0].atoms.map((a) => a.text));
  const added = atoms.filter((a) => !had.has(a.text)).map((a) => a.text);
  const unread = per[0].unread.filter((w) => per.every((r) => r.unread.includes(w)));   // a word stays unread only if NO reading carried it
  return { ...per[0], atoms, unread, readings: rowsList.length, rec: { tier: "k-best", k, trigger, readings: rowsList.length, added, removed: [], unreadBefore: per[0].unread.length, unreadAfter: unread.length } };
}

// WHICH SIDE, AND WHICH TIER, a gap names. Measured (eval/meaning/reread-run.mjs, the first form of this organ): re-reading the CLAIM under more parses loses supported claims (every claim atom
// must be met, so a second reading of the claim only raises the bar: E 23 -> 18 blanket), and re-reading a BINDING gap with more parses closes almost nothing (a gap at the referent floor
// is not a parse gap). So: a parse tier re-reads the SOURCE only ("a source states what any close reading of it states", the k3 arm's own rule); a binding gap asks for the referent
// tier (the page's coreference, `page`); an unread word asks for the lexicon tier (`lexicon`: the hyperlexicon's door). Each floor spends its own remedy.
// A gap may ask for MORE THAN ONE remedy, in order: a bind that stands on a thin reading (needs_deeper_reading) is a referent gap first (the page) and a parse gap second (the beam):
// measured, the page tier alone closed 5 binding gaps and moved no verdict, while the beam on the source moved two, both right (reread-run.mjs).
export const remediesOf = (gap) => (/^(ambiguous_binding|needs_deeper_reading|reach_exceeds_candidates)$/.test(gap.kind) ? [{ side: "source", tier: "page" }, { side: "source", tier: "k-best" }]
  : /^(direction_swap|different_sense|denial_not_licensed)$/.test(gap.kind) ? [{ side: "source", tier: "k-best" }] : gap.kind === "unread" ? [{ side: "claim", tier: "lexicon" }] : []);
export const remedyOf = (gap) => remediesOf(gap)[0] ?? null;
export const sideOf = (gap) => [...new Set(remediesOf(gap).map((r) => r.side))];

export function recurse({ A, B, judge, reread, tiers = ["k-best", "page", "lexicon"], maxPasses = 3 } = {}) {
  const passes = []; let cur = { A, B }, j = judge(cur.A, cur.B), stopped = "no_gap"; const spent = new Set();
  for (let pass = 1; pass <= maxPasses; pass++) {
    const gaps = [...(j.gaps ?? []), ...(cur.A.unread?.length ? [{ kind: "unread", words: cur.A.unread }] : [])];
    if (!gaps.length) { stopped = "no_gap"; break; }
    // the remedies the gaps ask for, among the tiers this caller can read, each spent once
    const asks = gaps.flatMap(remediesOf).filter((r) => tiers.includes(r.tier) && !spent.has(`${r.side}:${r.tier}`));
    if (!asks.length) { stopped = gaps.some((g) => remediesOf(g).length) ? "remedies_spent_or_unavailable" : "gaps_name_no_side"; break; }
    const ask = asks[0], sides = new Set([ask.side]); spent.add(`${ask.side}:${ask.tier}`); const tier = ask.tier;
    const next = { A: ask.side === "claim" ? reread("claim", cur.A, tier, gaps) : cur.A, B: ask.side === "source" ? reread("source", cur.B, tier, gaps) : cur.B };
    const j2 = judge(next.A, next.B);
    const before = (j.gaps ?? []).map((g) => g.kind).sort(), after = (j2.gaps ?? []).map((g) => g.kind).sort();
    const delta = { atomsAdded: [...(next.A.rec?.added ?? []).map((x) => `claim:${x}`), ...(next.B.rec?.added ?? []).map((x) => `source:${x}`)], unreadBefore: cur.A.unread?.length ?? 0, unreadAfter: next.A.unread?.length ?? 0 };
    passes.push({ pass, tier, trigger: gaps.map((g) => g.kind), sides: [...sides], delta, gapsBefore: before, gapsAfter: after, verdictBefore: j.verdict, verdictAfter: j2.verdict });
    // a pass that changed nothing is RECORDED as such (passes[-1].changed) and the loop goes on to the next remedy: the recursion stops when no gap is left or every remedy asked
    // for is spent, not at the first tier that did not help (measured: stopping there reached the beam 10 times in 61 passes and moved nothing)
    passes[passes.length - 1].changed = j2.verdict !== j.verdict || JSON.stringify(before) !== JSON.stringify(after) || delta.atomsAdded.length > 0;
    cur = next; j = j2; stopped = "passes_spent";
  }
  return { ...cur, j, passes, stopped };
}
