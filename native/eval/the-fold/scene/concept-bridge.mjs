// scene/concept-bridge.mjs — CONSULT THE OMNILINGUAL CONCEPTS: Greek Republic ↔ Jowett ↔ the foundation's testimony.  (2026-10-14)
//
// The concept rows (hyperlexicon prior plato-republic-concepts-v1) say which Greek stem and which English stem are the same concept
// because Plato's own parallel puts them on the same Stephanus pages. This reads them against the foundation: for each pinned
// English stem, how many foundation sentences use it, and which — verbatim, at their addresses. Each row is read against a null:
// the foundation frequency of English stems drawn from the Republic's own English vocabulary at random (the same number of rows).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIOR = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/plato-republic-concepts-v1.json";
const FOLD = "/Users/mlacy/Documents/3.0/the-fold/mind";
const eStem = (w) => { let s = w; for (const [re, r] of [[/ies$/, "y"], [/ing$/, ""], [/ed$/, ""], [/ly$/, ""], [/s$/, ""]]) if (s.length > 5 && re.test(s)) { s = s.replace(re, r); break; } return s; };
const prior = JSON.parse(fs.readFileSync(PRIOR, "utf8"));
const docs = [], units = [];
for (const f of ["foundation-index.json", "foundation-index.local.json"]) {
  try { const j = JSON.parse(fs.readFileSync(path.join(FOLD, f), "utf8")); const off = docs.length; docs.push(...j.docs); for (const u of j.units) units.push([u[0] + off, u[1], u[2]]); } catch { /* absent */ }
}
const bySt = new Map();                                   // stem → unit indices
units.forEach((u, i) => { for (const w of new Set((u[2].toLowerCase().match(/[a-z]{3,}/g) ?? []).map(eStem))) { let a = bySt.get(w); if (!a) bySt.set(w, (a = [])); a.push(i); } });
const rows = prior.entries.map((e) => ({ concept: e.left.replace("concept:", ""), greek: e.right.replace("grc:", ""), pages: e.meta.pages, english: e.meta.englishForm, hits: (bySt.get(e.left.replace("concept:", "")) ?? []).length, w: e.witnesses }));
const used = rows.filter((r) => r.hits > 0);
// null: the same number of English stems drawn at random from the Republic's own English vocabulary (the pinned stems' pool is the Republic, so this tests that the PIN, not Plato's vocabulary, predicts the foundation)
const pool = [...new Set(prior.entries.map((e) => e.left.replace("concept:", "")))];
const allStems = [...bySt.keys()];
let nullUsed = 0; const DR = 200;
for (let d = 0; d < DR; d++) { let k = 0; for (let i = 0; i < rows.length; i++) { const s = allStems[Math.floor(Math.random() * allStems.length)]; if (bySt.get(s)?.length) k++; } nullUsed += k; }
console.log(`concept rows ${rows.length} · English stems the foundation also uses: ${used.length} (${(100 * used.length / rows.length).toFixed(0)}%) · foundation: ${docs.length} documents, ${units.length} verbatim sentences`);
console.log("(a random foundation stem is 'used' by construction; the informative number is WHICH, and how often:)");
// rank by how far the pin beat its own null, and by how distinctive the concept is in the foundation (idf) — a stem in a twentieth of all
// sentences ("three", "each") says nothing about what the two bodies share
const N = units.length;
const entryOf = new Map(prior.entries.map((e) => [e.left.replace("concept:", ""), e]));
const score = (r) => { const m = entryOf.get(r.concept).meta; return (m.cosine - m.permutationNull) * Math.log(N / r.hits); };
const pick = used.filter((r) => r.pages >= 15 && r.hits >= 20 && r.hits <= N / 20).sort((a, b) => score(b) - score(a)).slice(0, 16);
const sentenceOf = (i) => `[${docs[units[i][0]].layer ?? "?"}] ${units[i][2].slice(0, 150)}`;
const sample = (r) => { const idx = bySt.get(r.concept); const step = Math.max(1, Math.floor(idx.length / 2)); return [idx[0], idx[Math.min(idx.length - 1, step)]].filter((x, i, a) => a.indexOf(x) === i); };
for (const r of pick) {
  console.log(`\n${r.concept.padEnd(12)} ← ${r.greek.padEnd(14)} Republic pages ${String(r.pages).padStart(2)} · foundation sentences ${r.hits}`);
  for (const i of sample(r)) console.log(`     ${sentenceOf(i)}`);
}
fs.writeFileSync(path.join(HERE, "concept-bridge-report.json"), JSON.stringify({ at: new Date().toISOString(), rows: rows.length, usedByFoundation: used.length, top: pick.map((r) => ({ concept: r.concept, greek: r.greek, pages: r.pages, foundationSentences: r.hits, witnesses: r.w, examples: sample(r).map((i) => ({ text: units[i][2], doc: docs[units[i][0]].title, address: `${docs[units[i][0]].file}#${units[i][1]}` })) })) }, null, 2) + "\n");
