// scene/consult-referents.mjs — THE CONSULTATION AT THE REFERENT LEVEL.
//
//   node native/eval/the-fold/scene/consult-referents.mjs
//
// The rule (content-rules: referents-not-tokens): the mind thinks in the PHYSICS
// OF REFERENTS. So the retained arm is Mímir's actual rows — the beings it holds
// (the universal bearer: everyone / no one) and the acts they perform (has the
// right / is entitled / shall) — admitted to the holograph as priors, then a
// GENUINELY NEW text in the same ecosystem (the UK Human Rights Act 1998, which
// domesticates the ECHR: same beings, same claims) is read THROUGH the retained
// holograph. Surprise is measured on the referents ({S,V} slots), never tokens.
//
// Arms: retained (Mímir's rows, verbatim) · blank (no mind) · shell (Mímir's
// size and shape, keys remapped — same strength, no content; K redraws).
// Verdicts: retained < blank, and retained below the shell distribution.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHolograph, admit } from "../../../kernel/bayes-surprise.js";
import { splitSentences } from "../../../adapters/text/spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIND = "/Users/mlacy/Documents/3.0/khora/native/memory/mind.jsonl";
const HRA = "/Users/mlacy/Documents/3.0/Zenodotus/06-government-legal/world-legislation/uk/ukpga-1998-42.md";
const K_SHELLS = 30;

// ── the referent extraction: the being (universal) and the act (modal) ────────
const UNIVERSAL = /\b(everyone|every person|no one|nobody|men and women|all persons|every person)\b/i;
const MODALS = [
  { re: /\b(?:has|have) the right\b/i, v: "has_the_right" },
  { re: /\b(?:is|are) entitled\b/i, v: "is_entitled" },
  { re: /\b(?:no one|nobody) shall\b/i, v: "no_one_shall" },
  { re: /\bshall not\b/i, v: "shall_not" },
  { re: /\bshall\b/i, v: "shall" },
];
const factOf = (text) => {
  const m = UNIVERSAL.exec(text);
  const mod = MODALS.find((x) => x.re.test(text));
  return { S: m ? m[1].toLowerCase() : null, V: mod ? mod.v : null };
};
const isInteresting = (f) => f.S && f.V; // a being performing an act

// ── Mímir's rows → retained priors (the actual mind, verbatim) ────────────────
const mindRows = fs.readFileSync(MIND, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)).filter((r) => r.schema === "MimirRow@1");
const mindFacts = [];
for (const r of mindRows) {
  if (r.kind !== "obligation" || !r.claim?.clause) continue;
  const f = factOf(String(r.claim.clause));
  if (f.S && f.V) mindFacts.push(f);
}
console.log(`Mímir: ${mindRows.length} rows → ${mindFacts.length} referent priors (being + act)`);

// ── the new text: UK Human Rights Act 1998 (the ECHR domesticates its beings) ──
let hra = fs.readFileSync(HRA, "utf8");
hra = hra.replace(/^---[\s\S]*?---/, "").replace(/[#*_`]/g, " ").replace(/^\s*[-•]\s+/gm, "");
const hrFacts = splitSentences(hra).map((s) => factOf(s.text)).filter(isInteresting);
console.log(`UK HRA 1998: ${splitSentences(hra).length} sentences → ${hrFacts.length} being-act facts`);

// pairs the mind knew that the new text actually used (the shared beings)
const mindPairs = new Set(mindFacts.map((f) => `${f.S}\u0000${f.V}`));
const shared = hrFacts.filter((f) => mindPairs.has(`${f.S}\u0000${f.V}`));
const sharedSs = [...new Set(hrFacts.filter((f) => [...mindPairs].some((p) => p.split("\u0000")[0] === f.S)).map((f) => f.S))];

// ── the three arms over the SAME holograph machinery ────────────────────────
const readInto = (facts, seed) => {
  const holo = createHolograph({ gamma: 1 }); // PERSISTENCE: the retained ground does not fade (Mímir's law)
  for (const f of seed) admit(holo, f);
  let total = 0, sharedTotal = 0;
  for (const f of facts) { const a = admit(holo, f); total += a.surprisal; if (mindPairs.has(`${f.S}\u0000${f.V}`)) sharedTotal += a.surprisal; }
  return { total, sharedTotal, n: facts.length };
};
// THE SHELL: SAME STRENGTH, NO CONTENT. The mind's vocabularies (its beings and
// its acts) and its counts are preserved exactly; only the ASSOCIATION is
// destroyed — each being is paired with another act's value. A mind that learned
// the same list but nothing about who does what.
const scramble = (facts, k) => {
  const vs = facts.map((f) => f.V);
  let s = (Math.imul(k, 2654435761) + 1013904223) >>> 0;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
  for (let i = vs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [vs[i], vs[j]] = [vs[j], vs[i]]; }
  return facts.map((f, i) => ({ S: f.S, V: vs[i] }));
};

const retained = readInto(hrFacts, mindFacts);
const blank = readInto(hrFacts, []);
const shells = [];
for (let k = 1; k <= K_SHELLS; k++) shells.push(readInto(hrFacts, scramble(mindFacts, k)));
const shellTotals = shells.map((s) => s.total).sort((a, b) => a - b);
const worse = shells.filter((s) => s.total <= retained.total).length;
const p = (worse + 1) / (K_SHELLS + 1);
const effect = blank.total - retained.total;

console.log(`\nshared being-act pairs the mind knew and the HRA used: ${shared.length}/${hrFacts.length} · beings: ${sharedSs.join(", ")}`);
console.log(`retained total surprisal : ${retained.total.toFixed(1)} bits  (mean/fact ${(retained.total / retained.n).toFixed(2)})`);
console.log(`blank   total surprisal : ${blank.total.toFixed(1)} bits  (mean/fact ${(blank.total / blank.n).toFixed(2)})`);
console.log(`shells  (${K_SHELLS}, associations destroyed)  median ${shellTotals[Math.floor(shellTotals.length / 2)].toFixed(1)} · min ${shellTotals[0].toFixed(1)} · max ${shellTotals[shellTotals.length - 1].toFixed(1)}`);
console.log(`\nper shared-pair fact, retained ${(retained.sharedTotal / shared.length).toFixed(2)} vs blank ${(blank.sharedTotal / shared.length).toFixed(2)} bits/fact`);
console.log(`\nTHE VERDICT (the record's bar: effect >= 0.15 of blank AND p <= 0.05):`);
console.log(`  effect (blank − retained) = ${effect.toFixed(1)} bits (${(100 * effect / blank.total).toFixed(1)}% of blank)`);
console.log(`  retained vs shell distribution: p = ${p.toFixed(3)} (${worse}/${K_SHELLS} shells beat it)`);
console.log(`  bar met: ${effect >= 0.15 * blank.total && p <= 0.05 ? "YES" : "NO"}`);