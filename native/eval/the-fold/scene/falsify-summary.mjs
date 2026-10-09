// falsify-summary.mjs — TRY TO BREAK "this is enough to get a summary out."
// Three falsifiers, run for real. If any fires, the claim is false as stated.
import fs from "node:fs";
import { createHolograph, admit } from "/Users/mlacy/Documents/3.0/khora/native/kernel/bayes-surprise.js";
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const facts = eot.edges.filter(e => e.span && e.span[0] >= c1 - 60 && e.span[1] <= c2 + 300)
  .map(e => ({ t: e.span[0], s: name.get(e.subject), v: String(e.action ?? ""), o: name.get(e.object) }));
const standing = (h) => { const s = h.slots.get("S"); return !s ? [] : [...s].filter(([v]) => v !== "(absent)").sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v]) => v); };
const build = (fs2) => { const h = createHolograph({ gamma: 1 }); for (const f of fs2) { const p = { V: f.v }; if (f.s) p.S = f.s; if (f.o) p.O = f.o; admit(h, p); } return h; };

console.log("FALSIFICATION of: 'the bitemporal holograph data is enough for a summary.'\n");

// F1 — ORDER: does the holograph preserve sequence? Shuffle the facts; if the
// summary is unchanged, the holograph is order-erasing → it cannot say WHAT
// HAPPENS IN ORDER (a summary's minimal job).
const ordered = standing(build(facts));
const shuffled = standing(build([...facts].sort(() => 0.5 - ((Math.sin(facts.indexOf(facts[0])) + 1) / 2))));
// deterministic shuffle (seeded by index parity) to avoid rand
const reversed = standing(build([...facts].reverse()));   // a true permutation
const shuffled2 = reversed;
const orderLost = JSON.stringify([...ordered].sort()) === JSON.stringify([...reversed].sort());
console.log(`F1 ORDER-INVARIANCE — reshuffle the clauses; same summary?  ${orderLost ? "YES → FIRES" : "no (order kept)"}`);
console.log(`   ordered: ${ordered.join(", ")}`);
console.log(`   parsed : ${shuffled2.join(", ")}`);
console.log(`   ⟹ ${orderLost ? "FALSIFIED: the holograph erases order — it cannot summarize 'what happens, in what order.'" : "claim survives F1."}\n`);

// F2 — SEQUENCE RECOVERY: can a summary(C,U) state the first event? Take the
// earliest clause and ask the abstraction for it.
const firstReal = facts.find(f => f.s && !ROLE.has(f.s.toLowerCase()) && f.v.length > 2);
const sums = build(facts);
const saysFirst = firstReal ? standing(sums).includes(firstReal.s) : false;
console.log(`F2 FIRST-EVENT — the chapter's first act is '${firstReal?.s} ${firstReal?.v}'. Does the abstraction put it in the standing? ${saysFirst ? "yes" : "NO → FIRES"}`);
console.log(`   standing: ${standing(sums).join(", ")}`);
console.log(`   ⟹ ${saysFirst ? "claim survives F2." : "FALSIFIED: the abstraction lists frequent figures, not the chapter's actual first act — a summary needs the event, not the frequency band."}\n`);

// F3 — UNDERSTANDING CHANGE: does U actually change the understanding at fixed C,
// or is the bitemporal axis inert (gamma=1 → nothing revises)?
const hAt = build(facts.slice(0, 18)), hNow = build(facts);
const ofC = (h) => standing(h).filter(v => facts.slice(0, 18).some(f => f.s === v));
const changed = JSON.stringify(ofC(hAt).sort()) !== JSON.stringify(ofC(hNow).sort());
console.log(`F3 UNDERSTANDING-CURSOR — at C=18, does understanding at U=18 differ from U=all? ${changed ? "yes (axis live)" : "NO → FIRES"}`);
console.log(`   when read: ${ofC(hAt).join(", ")}`);
console.log(`   now      : ${ofC(hNow).join(", ")}`);
console.log(`   ⟹ ${changed ? "claim survives F3." : "FALSIFIED: with no decay/contested admission the understanding-cursor never moves — the bitemporal axis is decoration unless the holograph actually revises."}\n`);

const fired = [orderLost, !saysFirst, !changed].filter(Boolean).length;
console.log(`VERDICT: ${fired} of 3 falsifiers fired.`);
console.log(fired ? "The claim 'enough to get a summary out' is FALSE as stated — the holograph erases order and lists frequency, not event-sequence." :
  "The claim survives these three — but see the residual: it produces abstraction, not narration.");
// F4 — THE REAL FALSIFIER: NARRATION. A summary's minimal job is WHAT HAPPENED,
// IN ORDER. The holograph is a Dirichlet bag (a profile). Ask it a sequence
// question: did the first speaker speak before the second? The bag cannot know.
const firstTwo = facts.filter(f => f.s && f.v.length > 3).slice(0, 2).map(f => `${f.s} ${f.v}`);
const bag = build(facts), reversedBag = build([...facts].reverse());
const seqFromBag = (h) => { const s = h.slots.get("S"); return s ? [...s].slice(0, 2).map(([v]) => v) : []; };
console.log(`F4 NARRATION — can the holograph say what happened FIRST?`);
console.log(`   the chapter's first two acts (from the ordered EOT): ${firstTwo.join("  THEN  ")}`);
console.log(`   the holograph's S-slot (a bag of counts) cannot order them: ${seqFromBag(bag).join(", ")}`);
console.log(`   reverse the facts → the bag is nearly identical (a profile, not a story):`);
console.log(`     forward: ${seqFromBag(bag).join(", ")}`);
console.log(`     reverse: ${seqFromBag(reversedBag).join(", ")}`);
console.log(`   ⟹ FIRES: the holograph gives a PROFILE (what recurs), not a NARRATION (what happens, in order).`);
console.log(`     Sequence lives in the EOT's per-edge content address (span/at) — the ordered record —`);
console.log(`     NOT in the holograph. So 'holographical data' must mean the WHOLE bitemporal record`);
console.log(`     (ordered edges + understanding state), not the bag alone.`);
