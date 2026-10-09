// chapter-summary.mjs — a LAWFUL, multi-modal summary of any chapter, computed
// on the fly from the bitemporal record. Usage: node chapter-summary.mjs 6
// Modes: TELLING (ordered, from content-addresses) · KIND · STANDING · REGISTER
// · TOPIC · CAST. Every line is licensed (given | witnessed); nothing revealed.
import fs from "node:fs";
import { feltSense } from "/Users/mlacy/Documents/3.0/khora/native/adapters/text/felt-sense.js";
const CH = Number(process.argv[2] || 6);
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX"];
const marks = [];
for (let i = 0; i < roman.length; i++) { const p = full.indexOf(`\nCHAPTER ${roman[i]}.`); if (p > 0) marks.push([i + 1, p]); }
marks.sort((a, b) => a[0] - b[0]);
const idx = marks.findIndex(([n]) => n === CH);
const c1 = marks[idx][1], c2 = marks[idx + 1] ? marks[idx + 1][1] : full.length;
const ch = full.slice(c1, c2);
const low = ch.toLowerCase();
const sentences = ch.split(/(?<=[.!?])\s+/);

const eot = JSON.parse(fs.readFileSync("eot-english-pnp.json", "utf8"));
const name = new Map(eot.referents.map(r => [r.hash, r.name]));
const ROLE = new Set(["i","you","he","she","it","we","they","me","him","her","us","them","this","that","there","one"]);
const edges = eot.edges.filter(e => e.span && e.span[0] >= c1 && e.span[1] <= c2);
const nouns = (s) => [...new Set((s.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? []))];

console.log(`SUMMARY — Pride and Prejudice, Chapter ${CH}  (bytes ${c1}→${c2}; lawful, no model)\n`);

// ── THE TELLING (ordered, content-address) — the bound conveyances/edges ──
const STOP = new Set(["was","is","am","are","be","been","had","does","do","would","should","will","can","may","shall","has","have","being","were","did","could","might","must"]);
const beats = edges.map(e => ({ at: e.span[0], s: name.get(e.subject), v: e.action, o: name.get(e.object) }))
  .filter(b => b.s && !ROLE.has(b.s.toLowerCase()) && !STOP.has(String(b.v).toLowerCase()) && String(b.v).length > 2)
  .sort((a, b) => a.at - b.at);
console.log("▸ THE TELLING (ordered, from the content-addresses):");
for (const b of beats.slice(0, 12)) console.log(`    [${b.at}] ${b.s} ${b.v}${b.o ? " " + (name.get(b.o) ?? "") : ""}`);
if (!beats.length) console.log("    (no bound acts in this chapter's record — refused)");

// ── BY KIND (INS·Pattern) — induced from the cast's sentence co-presence ──
{
  const CAST = ["man","woman","wife","husband","lady","gentleman","sir","miss","bennet","elizabeth","jane","darcy","bingley","sister","sisters","friend","family","daughter","girl","beauty","manners","character","love","marriage","wealth"];
  const present = CAST.filter(b => low.includes(b));
  const comp = new Map(present.map(b => [b, new Map()]));
  for (const s of sentences) { const p = present.filter(b => s.toLowerCase().includes(b)); for (const a of p) for (const b of p) if (a !== b) comp.get(a).set(b, 1); }
  const jac = (a, b) => { const A = new Set(comp.get(a).keys()), B = new Set(comp.get(b).keys()); const i = [...A].filter(x => B.has(x)).length, u = new Set([...A, ...B]).size; return u ? i / u : 0; };
  const seen = new Set(), kinds = [];
  for (const a of present) { if (seen.has(a)) continue; const c = [a]; seen.add(a); for (const b of present) if (!seen.has(b) && jac(a, b) >= 0.4) { c.push(b); seen.add(b); } kinds.push(c); }
  const wits = (k) => sentences.filter(s => k.some(m => s.toLowerCase().includes(m))).length;
  kinds.sort((x, y) => wits(y) - wits(x));
  console.log("\n▸ BY KIND (INS·Pattern, induced from co-presence):");
  for (const k of kinds.slice(0, 5)) console.log(`    { ${k.join(", ")} }  ·  ${wits(k)} sentence(s)`);
}
// ── BY STANDING (EVA·Pattern) — what holds across the halves ──
{
  const half = ch.length / 2, cnt = (s, w) => (s.toLowerCase().match(new RegExp(`\\b${w}\\b`, "g")) || []).length;
  const topics = ["love","marriage","beauty","character","pride","wealth","agreeable","manners"];
  const ag = topics.filter(t => cnt(ch.slice(0, half), t) && cnt(ch.slice(half), t));
  console.log(`\n▸ BY STANDING (EVA·Pattern): ${ag.join(", ") || "—"} hold across both halves`);
}
// ── BY TOPIC (REC·Pattern) — the DMD-converged loop ──
{
  const words = ch.split(/\s+/);
  const topOf = (s) => { const n = new Map(); for (const w of nouns(s)) n.set(w, (n.get(w) ?? 0) + 1); return [...n].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w); };
  let prev = null, prevSig = null, settled = null;
  for (const f of [0.2, 0.4, 0.6, 0.8, 1.0]) { const t = topOf(words.slice(0, Math.floor(words.length * f)).join(" ")); const sig = [...t].sort().join(" "); if (prevSig !== null && sig === prevSig) { settled = t; break; } prev = t; prevSig = sig; }
  console.log(`\n▸ BY TOPIC (REC·Pattern, DMD-converged): ${(settled ?? prev ?? []).join(", ")}`);
}
// ── BY REGISTER (EVA·Ground) — the felt field ──
{
  const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
  const felt = feltSense(ch, { posPrior: pos, M: 8 });
  const ax = Object.entries(felt.byPos ?? {}).filter(([, v]) => v != null).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([p, v]) => `${p} ${v.toFixed(2)}`);
  console.log(`\n▸ BY REGISTER (EVA·Ground): reads ${ax.join(" · ")}`);
}
// ── BY CAST (SIG·Figure) — who acts ──
{
  const c = new Map();
  for (const e of edges) { const s = name.get(e.subject); if (s && !ROLE.has(s.toLowerCase()) && s.length > 2) c.set(s, (c.get(s) ?? 0) + 1); }
  console.log(`\n▸ BY CAST (SIG·Figure): ${[...c].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => `${f}×${n}`).join(", ") || "—"}`);
}
console.log(`\n(Every line computed from the record; content witnessed, nothing revealed. Chapter ${CH}, ${edges.length} edges.)`);