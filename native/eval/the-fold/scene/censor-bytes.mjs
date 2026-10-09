// censor-bytes.mjs — THE CORRESPONDENCE CENSOR. The mouth's sentence is kept
// only if its claim is TRACEABLE TO THE RAW BYTES: for each referent it names,
// the claim's predicate must actually appear in the raw near that referent's
// mention. This is the wall that kills the read's OWN artifacts — 'furniture
// examined' has a mention address, and the raw there does NOT say it.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("\nCHAPTER X."), c2 = full.indexOf("\nCHAPTER XI.");
const ch = full.slice(c1, c2);
const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2);
// referent -> its mention byte-addresses (the trace)
const mentions = new Map();
for (const e of edges) for (const h of [e.subject, e.object]) if (h) { const n = name.get(h); if (n) (mentions.get(n) ?? mentions.set(n, []).get(n)).push(e.span[0]); }

const norm = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
// THE BYTE-TRACE: does `word` appear in the raw within ±WINDOW of a mention of `ref`?
const WINDOW = 120;
function traced(ref, word) {
  const at = mentions.get(ref) ?? [];
  const w = norm(word);
  for (const a of at) {
    const near = norm(full.slice(Math.max(0, a - WINDOW), a + WINDOW));
    if (near.includes(w)) return a;
  }
  return null;
}
// A sentence is correspondent iff its main referent + predicate trace to the raw
function correspond(sentence) {
  const low = norm(sentence);
  const refs = [...mentions.keys()].filter(r => low.includes(norm(r).split(" ").pop()));
  if (!refs.length) return { ok: false, why: "no referent in the sentence" };
  const preds = low.split(" ").filter(w => w.length >= 4 && !["the","and","her","his","with","that","then","them","from"].includes(w));
  for (const ref of refs) for (const p of preds) { const a = traced(ref, p); if (a !== null) return { ok: true, via: `'${p}' traced near '${ref}' @ ${a}` }; }
  return { ok: false, why: `no predicate traced to the raw near ${refs.join(", ")}` };
}

console.log("CORRESPONDENCE CENSOR — kept only if the claim traces to the raw bytes:\n");
const probes = [
  "Darcy writes a letter; Miss Bingley watches him and praises his hand.",
  "Bingley protests that he believed every word he said of himself.",
  "Darcy reflects on humility and the appearance of it.",
  "Ms. Bingley writes in the most careless way imaginable.",
  "The men talk of writing and the indirect boast.",
  "Furniture examined.",                         // the read's OWN artifact
  "Elizabeth examined the furniture.",           // fabricated agent
  "Darcy secretly admires her fine eyes.",       // the invented turn
];
let kept = 0, cut = 0;
for (const s of probes) {
  const r = correspond(s);
  if (r.ok) { kept++; console.log(`  ✓ KEPT  ${s}\n        ${r.via}`); }
  else { cut++; console.log(`  ✗ CUT   ${s}\n        ${r.why}`); }
}
console.log(`\n${kept} kept · ${cut} cut. The correspondence censor goes to the BYTE: a claim whose`);
console.log(`predicate does not appear in the raw near its referent is refused — artifacts included.`);