// bitemporal.mjs — THE SUMMARY IS A VIEW AT (text-cursor, understanding-cursor).
// No summary is stored. Two independent axes:
//   C — the TEXT cursor: the clause-address a proposition IS AT (where in the content).
//   U — the UNDERSTANDING cursor: how much the observer has ADMITTED (its holograph
//       state — which moves as it reads on and corrects earlier material).
// summary(C, U) = the abstraction over the content up to C, as understood with only
// the first U clauses admitted. The CHANGE of understanding at C is
// summary(C, U_final) − summary(C, U=C) — content fixed, understanding moved.
// Computed on the fly from the holograph; the EOT is the raw datum, never a summary.
import fs from "node:fs";
import { createHolograph, admit } from "/Users/mlacy/Documents/3.0/khora/native/kernel/bayes-surprise.js";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one","absent"]);
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300);
const facts = edges.map(e => ({ t: e.span[0], s: name.get(e.subject), v: String(e.action ?? ""), o: name.get(e.object) }))
  .filter(f => (f.s && !ROLE.has(f.s.toLowerCase())) || (f.o && !ROLE.has(f.o.toLowerCase())));
facts.sort((a, b) => a.t - b.t);

// build a holograph admitting the first U facts — the observer as-of understanding U
const holoU = (U) => { const h = createHolograph({ gamma: 1 }); for (let i = 0; i < U; i++) { const f = facts[i]; const p = { V: f.v || "·" }; if (f.s) p.S = f.s; if (f.o) p.O = f.o; admit(h, p); } return h; };
// the abstraction at a holograph: the top standing S-nodes (what we're talking about)
const standing = (h, contentMax) => {
  const s = h.slots.get("S"); if (!s) return [];
  return [...s].filter(([v]) => v !== "(absent)").sort((a, b) => b[1] - a[1]).slice(0, 4).map(([v]) => v);
};
// content up to C: which S-nodes have a text-address ≤ C (what the content AT/AFTER C gives)
const nodesByC = (C) => new Set(facts.slice(0, C).map(f => f.s).filter(n => n && !ROLE.has(n.toLowerCase())));

console.log("BITEMPORAL SUMMARY — the same content, understood at different cursors (no model):\n");
console.log(`  ${facts.length} facts on the text axis · the observer admits them in order (U), the content sits at C.\n`);
const N = facts.length;
const checkpoints = [Math.floor(N * 0.25), Math.floor(N * 0.5), Math.floor(N * 0.75), N];
for (const C of checkpoints) {
  const atC = nodesByC(C);
  // understanding OF the content-at-C, as of U = C (when first read) vs U = N (having read on)
  const hFirst = holoU(C), hNow = holoU(N);
  const standFirst = standing(hFirst).filter(v => atC.has(v));
  const standNow = standing(hNow).filter(v => atC.has(v));
  const grew = standNow.filter(v => !standFirst.includes(v));
  console.log(`  ── text cursor C = ${String(C).padStart(3)} (byte ${facts[C - 1]?.t ?? "—"}) ──`);
  console.log(`     understanding WHEN READ (U=C): what we're talking about = ${standFirst.join(", ") || "—"}`);
  console.log(`     understanding NOW     (U=${N}): what we're talking about = ${standNow.join(", ") || "—"}`);
  console.log(`     ⟹ changed by reading on: ${grew.length ? grew.join(", ") + " entered the standing" : "nothing — the understanding of this content held"}\n`);
}
console.log("The summary is summary(C, U) — computed per query. No summary is stored; the change of");
console.log("understanding at a cursor is summary(C, U_now) − summary(C, U_then).");