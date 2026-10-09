// topic-loop.mjs — LOOPS ON LOOPS: the read tries to figure out WHAT WE ARE
// TALKING ABOUT, recursively. Each loop widens the window, re-reads it as GFP
// arrangements, and forms a HYPOTHESIS: the standing figures (top by settled-
// relation participation) + their recurrent chain. If the hypothesis SURVIVES
// the wider reading unchanged, the loop stops at the DMD round — one more
// loop makes no difference, so we are talking about this. If it changes, the
// read REVISES (the rezero doctrine) and loops again. Deterministic, no model.
import fs from "node:fs";
const { extractGfpRelations } = await import("/Users/mlacy/Documents/3.0/khora/native/adapters/text/relations-gfp.js");
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged");
let end = full.indexOf("Chapter II", c1); if (end < 0) end = c1 + 9000;
const words = full.slice(c1, end).split(/\s+/);

const figOf = (f) => String(f ?? "").trim().toLowerCase().replace(/[“”()]|[:,]$/g, "");
const topicHypothesis = (slice) => {
  const rels = extractGfpRelations(slice, { posPrior: pos, minRec: 1 });
  const part = new Map();   // figure -> settled-relation participation
  const chain = new Map();  // label-ish verbs that recur with a figure
  for (const r of rels) {
    if (!r.grain) continue;
    for (const f of [r.end1, r.end2]) {
      const g = figOf(f);
      if (g.length < 3 || /^(end|illustration|chapter)$/.test(g)) continue;
      part.set(g, (part.get(g) ?? 0) + 1);
    }
    if (r.grain.settledAs === "verb") {
      const v = String(r.label ?? "").toLowerCase();
      const key = `${figOf(r.end1)}\u0000${v}\u0000${figOf(r.end2)}`;
      chain.set(key, (chain.get(key) ?? 0) + 1);
    }
  }
  const top = [...part].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => f);
  const cat = [...chain].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => k.split("\u0000").map((x) => x || "×").join("·"));
  return { top, chain: cat };
};
const sigOf = (h) => [...new Set(h.top)].sort().join(" ") + " | " + [...new Set(h.chain)].sort().join(" ");

// ── THE LOOP: widen the window each round; the hypothesis either holds (DMD:
// one more loop changes nothing → we are talking about this) or REVISES. ──
const STEPS = [0.08, 0.15, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
let prevSig = null, prev = null;
console.log("WHAT ARE WE TALKING ABOUT — the loop (no model):\n");
let settled = false;
for (let i = 0; i < STEPS.length && !settled; i++) {
  const W = Math.max(60, Math.floor(words.length * STEPS[i]));
  const slice = words.slice(0, W).join(" ");
  const h = topicHypothesis(slice);
  const sig = sigOf(h);
  const held = prevSig !== null && sig === prevSig;
  const round = i + 1;
  if (held && prev) {
    console.log(`  round ${round}: reading wider (${W} words) … the hypothesis HOLDS.`);
    console.log(`  ⟶ CONVERGED at round ${round} (DMD: one more round changes nothing). We are talking about:`);
    console.log(`      standing figures: ${prev.top.join(", ")}`);
    console.log(`      the recurrent chain: ${prev.chain.join(" · ")}`);
    settled = true;
    break;
  }
  console.log(`  round ${round}: read ${W} words → hypothesis: ${h.top.join(", ")}${prev ? (sig !== prevSig ? "  [REVISED]" : "  [same]") : "  [seed]"}`);
  if (sig !== prevSig) { prev = h; prevSig = sig; }
}
if (!settled) {
  console.log(`\n  reached the widest window without settling. Now talking about: ${prev.top.join(", ")}. The read never stopped revising — reported honestly.`);
}