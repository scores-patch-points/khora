// thinking.mjs — THE ACTIONS OF THINKING, wired from the cube. Every move
// (operator × grain → terrain·stance) IS an act; the reading organs are the
// CAPACITIES that hold cells; and thinking is the chain walked in order. This
// drives the void-loop's own three cells over Chapter I and tracks what each
// move changes in the holograph. No model; the cube says the moves, coverage
// says which we hold, and each step reports its terrain·stance.
import fs from "node:fs";
import { GRAINS, TERRAIN_BY_DOMAIN, OPERATOR_CHAIN, cellOf } from "/Users/mlacy/Documents/3.0/khora/native/kernel/cube.js";
import { makeMoves } from "/Users/mlacy/Documents/3.0/khora/native/the-fold/moves.js";
import { CAPACITIES } from "/Users/mlacy/Documents/3.0/khora/native/organs/capacities.js";
import { createHolograph, admit } from "/Users/mlacy/Documents/3.0/khora/native/kernel/bayes-surprise.js";

const moves = makeMoves({ operators: { GRAINS, TERRAIN_BY_DOMAIN, OPERATOR_CHAIN, cellOf } });
const cov = moves.coverage(CAPACITIES);

console.log("THE CUBE'S ACTS OF THINKING — 27 moves, coverage against the fold's organs:\n");
console.log(`   covered: ${cov.covered.length}/27 · empty: ${cov.empty.length} · illegal rows: ${cov.illegal.length}\n`);
for (const m of cov.moves) {
  const by = m.organs.length ? m.organs.join(",") : "—";
  console.log(`   ${(m.cell + " ").padEnd(11)} ${(m.terrain + "·" + stanceOf(m)).padEnd(24)} [${by}]`);
}
function stanceOf(m) { const c = cellOf(m.op, m.grain); return c.stance; }

// ── THE THINKING LOOP: the void loop's three cells, read off (not chosen) —
//    DEF·Figure (cut the candidates out) → EVA·Figure (bind each to ground)
//    → REC·Pattern (compose a new ground when binding fails). Driven over the
//    chapter's own propositions, tracking the holograph's delta per move. ──
console.log("\nTHE THINKING LOOP — DEF·Figure → EVA·Figure → REC·Pattern over Chapter I:\n");
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2);
const facts = ch.split(/[.!?]+/).map(s => s.trim()).filter(s => s.split(/\s+/).length >= 4).slice(0, 40);
const holo = createHolograph({ gamma: 0.9 });

// DEF·Figure — cut the candidates: the figures (content words) per sentence
// EVA·Figure — bind each to the ground (admit); its delta is the change
// REC·Pattern — when a bind fails (deep novelty), compose/admit a new ground
let totalDelta = 0, refusals = 0, rebinds = 0, peak = 0;
for (const sentence of facts) {
  const figs = [...new Set(sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [])].slice(0, 4);
  if (!figs.length) continue;
  const p = {}; figs.forEach((f, i) => p[`f${i}`] = f);
  const rr = admit(holo, p);
  const changed = Object.values(rr.perSlot).reduce((s, x) => s + x.bayes, 0);
  totalDelta += changed;
  if (changed > peak) peak = changed;
  // REC·Pattern fires where the bind moved the ground hardest (a new ground)
  if (changed > 1.2) rebinds++;
  if (changed < 0.05) refusals++;
}
console.log(`   DEF·Figure cut ${facts.length} sentence-figures (Void→Entity · Dissecting)`);
console.log(`   EVA·Figure bound them — total holograph delta ${totalDelta.toFixed(2)} bits, peak ${peak.toFixed(2)} (Entity · Binding)`);
console.log(`   REC·Pattern composed ${rebinds} new grounds, refused ${refusals} (no-change) binds (Network · Composing)`);
const mode = [...holo.slots.entries()].map(([slot, m]) => {
  const top = [...m].sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]}` : null;
}).filter(Boolean).slice(0, 6);
console.log(`   → what the loop's reading leaves standing in the holograph: ${[...new Set(mode)].join(", ")}`);
console.log("\n(the loop's three cells are read OFF the table: DEF is the only Dissecting cell,");
console.log(" DEF/EVA share a terrain and differ only in stance — you cut with the lens, then bind.)");