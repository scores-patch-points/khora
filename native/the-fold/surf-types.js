// surf-types.js — SURF IS THE GENERAL TERM, AND ITS SUBTYPES ARE THE CUBE'S CELLS (2026-10-17).
//
// Every act that brings material to a reader from any medium is a surf: the passage cut out of a
// corpus (read / snip), a word swept across a repository and landed on its places (grep — the
// lineage's own `look`, whose equivalence to real `git grep -l -i -w -F` is pinned in
// tests/repo-look.test.js), a page fetched from the open web (surf.js, stage 3), what exists where
// (list / glob), a related memory recalled (activation). surf is the general term for all of them —
// not one act among others, and not only the web arm that first earned the word.
//
// The subtypes are kernel/cube.js's closed algebra, never a hand-list: nine operator families (nine
// verbs — receive, scout, admit, snip, bind, compile, refuse, evaluate, rezero; re-earned from
// legacy engine/operators.js OP_VERBS, where the same nine drive organ routing) at three grains =
// 27 cells. Each concrete act DECLARES the cell it occupies from its own header — the operators.js
// discipline (declared, never derived from content) — so a surf act's domicile is checked against
// the algebra, and an act with no declared cell answers a typed gap, never a guessed home.
//
// The canon's own precedents, used as the seed declarations below:
//   the surfer's act          SEG·Ground  — the addressed reach-unit cut out of the arena (surfer.js:67-71)
//   repo-look (grep)          SEG·Figure  — a word that lands a Link from a word to a place (capacities.js)
//   corpus admission          INS·Ground  — material comes into being, chunked (corpus.js admitChunked)
//   paragraph admission       INS·Figure  — the witness gate is the birth condition (hunt.js)
//   activation recall         CON·Figure  — one recurrent hop, not a flood (activation.js readForward)
//   the relevance gate        EVA·Pattern — preserve only what moves beyond reseeding variation (search/index.js)
//
// Counts, both exact: 9 families (the coarse view, one verb each) over 27 cells (the subtypes), the
// same 27-cell frame the door's tool registry uses (cube-tools.json). grep is among them.
//
// This module is a data table, not a runtime: it judges nothing and reaches nothing. It answers
// where an act belongs and what the alternatives were when it does not belong.

import { algebraAddresses, cellOf } from "../kernel/cube.js";

/** The nine verbs, re-earned from legacy engine/operators.js OP_VERBS — the operator face of surf. */
export const SURF_VERBS = Object.freeze({
  NUL: "receive",
  SIG: "scout",
  INS: "admit",
  SEG: "snip",
  CON: "bind",
  SYN: "compile",
  DEF: "refuse",
  EVA: "evaluate",
  REC: "rezero",
});

/** The 27 subtypes, derived from the algebra: one row per (operator × grain), named terrain · stance. */
export const SURF_TYPES = Object.freeze(
  algebraAddresses().map((c) =>
    Object.freeze({
      cell: `${c.op}·${c.grain}`,
      op: c.op,
      grain: c.grain,
      mode: c.mode,
      domain: c.domain,
      terrain: c.terrain,
      stance: c.stance,
      name: `${c.terrain} · ${c.stance}`,
      verb: SURF_VERBS[c.op],
    }),
  ),
);

/** The nine families — the coarse view: one verb, its three cells. */
export const SURF_FAMILIES = Object.freeze(
  [...new Set(SURF_TYPES.map((t) => t.op))].map((op) =>
    Object.freeze({ op, verb: SURF_VERBS[op], cells: Object.freeze(SURF_TYPES.filter((t) => t.op === op).map((t) => t.cell)) }),
  ),
);

/** Concrete acts declare the cell they occupy — declared, never derived from content. */
export const SURF_ACTS = Object.freeze([
  Object.freeze({ act: "receive", cell: "NUL·Ground", what: "the material handed over; the first ground is received, never derived" }),
  Object.freeze({ act: "trail", alias: "notes", cell: "NUL·Ground", what: "the environment's own deposits, consulted first: a question already resolved by any previous turn is grounded by the route, never re-fetched (the stigmergic route first); the colony's ground is received — kernel/stigmergy.js is the layer that learns the order of tries" }),
  Object.freeze({ act: "list", cell: "SIG·Ground", what: "what exists here; noticing needs no name" }),
  Object.freeze({ act: "glob", cell: "SIG·Figure", what: "is a being of this named form here — sensing the named entity, not yet its content" }),
  Object.freeze({ act: "read", cell: "SEG·Ground", what: "the addressed reach-unit cut out byte-accurate; a missing boundary is a labelled window, never an invented chapter" }),
  Object.freeze({ act: "grep", alias: "look", cell: "SEG·Figure", what: "each word lands a Link from a word to a place (path, line, byte span); equivalence to real `git grep -l -i -w -F` pinned in tests/repo-look.test.js" }),
  Object.freeze({ act: "fetch", cell: "INS·Ground", what: "a page comes into being as material, chunked by byte budget — nothing fetched outranks what was handed over" }),
  Object.freeze({ act: "admit", cell: "INS·Figure", what: "a paragraph earns ground only by carrying the void; the witness gate is the birth condition (hunt.js)" }),
  Object.freeze({ act: "recall", cell: "CON·Figure", what: "associative memory, one recurrent hop; a passage bound to its segment" }),
  Object.freeze({ act: "judge", alias: "witness", cell: "EVA·Pattern", what: "the relevance gate: preserve a candidate only if it moves beyond the ground's own reseeding variation" }),
  Object.freeze({ act: "refuse", cell: "DEF·Ground", what: "where the ground fails: a typed gap, never a guess" }),
  Object.freeze({ act: "rezero", cell: "REC·Ground", what: "a new ambient ground begins; the censored above is the trigger" }),
]);

export const surfTypes = () => SURF_TYPES;

/** surfTypeOf(act) → the act's cell, resolved through the algebra — or a typed gap naming what was known. */
export function surfTypeOf(act) {
  const declared = SURF_ACTS.find((a) => a.act === act || a.alias === act);
  if (!declared)
    return Object.freeze({
      gap: "unknown_surf_act",
      reason: `no act named "${act}" declares a cell`,
      known: Object.freeze(SURF_ACTS.map((a) => a.act)),
    });
  const [op, grain] = declared.cell.split("·");
  return Object.freeze({ act: declared.act, what: declared.what, cell: declared.cell, verb: SURF_VERBS[op], ...cellOf(op, grain) });
}
