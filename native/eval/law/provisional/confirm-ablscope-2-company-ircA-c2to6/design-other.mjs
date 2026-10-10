// design-other.mjs -- DESIGN-TIME inventory (COUNTS ONLY, no score of any kind) of the three transfer arms: novels, UD test splits. Writes results/other-design.json.
//   node design-other.mjs
import fs from "node:fs";
import { loadBookCaps } from "../ablation-scope/lib-book2.mjs";
import { loadUd, UD } from "../ablation-scope/lib-ud.mjs";
import { indexAndCandidates, pairsForCellV3 } from "../ablation-scope/lib-pairs.mjs";
import { controlScores, CONTROLS } from "../ablation-scope/features.mjs";
import { stratAuc, round } from "../ablation-scope/stats.mjs";
const BK = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gitenberg", M = 128;
const BOOKS = [`${BK}/pg158_Emma.txt`, `${BK}/pg161_Sense-and-Sensibility.txt`, `${BK}/pg345_Dracula.txt`];
const out = { books: [], ud: [] };
const cnt = (doc) => { const cand = indexAndCandidates(doc, M); const A = (xs) => xs.filter((r) => r.grp === "A" && r.c >= 2 && r.c <= 6);
  const by = { c2: [], c3: [], c4_6: [] }, pairs = []; for (const st of Object.keys(by)) { const r = pairsForCellV3(cand, doc, M, { grp: "A", stratum: st, n: 60, seedTag: "confirm2" }); for (const p of r.pairs) by[st].push({ p: controlScores(p.pos), n: controlScores(p.neg) }); }
  return { units: doc.stream.length, goldForms: doc.goldForms.length, P: A(cand.P).length, N: A(cand.N).length, pairs: Object.values(by).flat().length, by }; };
for (const b of BOOKS) { const doc = loadBookCaps(b, b.split("/").pop()), r = cnt(doc); out.books.push({ name: doc.name, ...r, by: undefined, controls: Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(r.by, (m) => m[c]))])) }); }
for (const stem of fs.readdirSync(UD).sort()) { if (!fs.existsSync(`${UD}/${stem}/test.conllu`)) continue; const doc = loadUd(stem, "test"), r = cnt(doc); out.ud.push({ stem, ...r, by: undefined }); }
fs.writeFileSync("results/other-design.json", JSON.stringify(out, null, 1));
for (const b of out.books) console.log(b.name.padEnd(36), "units", b.units, "P", b.P, "N", b.N, "pairs", b.pairs, JSON.stringify(b.controls));
console.log(out.ud.map((u) => `${u.stem}:${u.units}:P${u.P}:pairs${u.pairs}`).join("  "));
console.log("UD total pairs", out.ud.reduce((a, u) => a + u.pairs, 0), "languages with >=10 pairs", out.ud.filter((u) => u.pairs >= 10).length);
