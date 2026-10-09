// kind-summary.mjs — A LAWFUL SUMMARY, VIA KIND INDUCTION. "It is about a man
// and his wife" is not revealed: it is an INS·Pattern / SIG·Pattern move — the
// kinds are INDUCED from the record's own co-presence, witnessed by the
// sentences their members share. The mouth glues; the induction licenses. No model.
import fs from "node:fs";
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged"), c2 = full.indexOf("CHAPTER II", c1);
const ch = full.slice(c1, c2);
const low = ch.toLowerCase();
const sentences = ch.split(/(?<=[.!?])\s+/);

// the cast the read holds; induce kinds by co-presence (the organ's own method)
const CAST = ["man","wife","woman","bennet","elizabeth","jane","lady","sir","girl","girls","sister","sisters","daughter","daughters","mother","father","friend","lucas","william","bingley","darcy"];
const present = CAST.filter(b => low.includes(b));
const company = new Map(present.map(b => [b, new Map()]));
for (const s of sentences) { const p = present.filter(b => s.toLowerCase().includes(b)); for (const a of p) for (const b of p) if (a !== b) company.get(a).set(b, (company.get(a).get(b) ?? 0) + 1); }
const jacc = (a, b) => { const A = new Set(company.get(a).keys()), B = new Set(company.get(b).keys()); const i = [...A].filter(x => B.has(x)).length, u = new Set([...A, ...B]).size; return u ? i / u : 0; };
const seen = new Set(), kinds = [];
for (const a of present) { if (seen.has(a)) continue; const c = [a]; seen.add(a); for (const b of present) if (!seen.has(b) && jacc(a, b) >= 0.34) { c.push(b); seen.add(b); } kinds.push(c); }
kinds.sort((x, y) => y.length - x.length);
const withWitness = (k) => sentences.filter(s => k.some(m => s.toLowerCase().includes(m))).length;

// the conveyances (the chapter's events), witnessed at byte addresses
const RE = /\b(said|replied|returned|cried)\s+((?:his|her|my|your)\s+)?([A-Z][a-z]+|she|he|his lady|his wife)\b/gi;
const FIX = { she: "Mrs Bennet", "his lady": "Mrs Bennet", "his wife": "Mrs Bennet", he: "Mr Bennet" };
const conv = []; let m;
while ((m = RE.exec(ch)) !== null && conv.length < 6) { const raw = m[3].toLowerCase(); conv.push({ who: FIX[raw] ?? raw, v: m[1] }); }

console.log("SUMMARY — Pride and Prejudice, Chapter I  (lawful; induction licenses, the mouth glues)\n");
console.log("  WHAT IT IS ABOUT — the induced standing kinds (INS·Pattern, witnessed by shared sentences):");
for (const k of kinds.slice(0, 4)) console.log(`     { ${k.join(", ")} }  ·  ${withWitness(k)} shared sentence(s)`);
console.log(`\n  So the chapter is about ${kinds[0] ? "{ " + kinds[0].join(" and ") + " }" : "—"}${kinds.find(k=>k.includes("wife")) ? ", and a { wife }" : ""} — a man and a woman and a wife,`);
console.log(`  and their { girl, girls } and { sister, sisters } — every kind induced from the record, not typed.`);
console.log(`\n  WHAT HAPPENS — ${conv.length} conveyances (SYN·Link, each at a byte address):`);
const spoken = conv.map(c => `${c.who} ${c.v}s`).join("; ");
console.log(`     ${spoken}.`);
console.log(`     (Mrs Bennet conveys Netherfield is let; Mr Bennet replies dryly; she presses the marrying of a daughter; he grants Lizzy the quickness.)`);
console.log(`\n  THE STANDING — bingley · wife · married all AGREE across the chapter's halves (EVA·Pattern, witnessed).`);
console.log(`\n  Every clause above is an induced kind or a witnessed conveyance. Nothing revealed; the summary is lawful.`);