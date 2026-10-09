// prosify-gfp.mjs — THE MOUTH, ON GFP. Rebuilds the prosifier's content layer
// on the production GFP reader: propositions are {end1, label, end2} figure-
// connector-figure arrangements, cell-typed by grain (P72/P76: no subject,
// verb, or object anywhere). The mouth's grammar frames the arrangements —
// never an S-V-O clause.
import fs from "node:fs";
const { extractGfpRelations } = await import("/Users/mlacy/Documents/3.0/khora/native/adapters/text/relations-gfp.js");
const pos = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-eng.json", "utf8"));
const full = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt", "utf8");
const c1 = full.indexOf("truth universally acknowledged");
let end = full.indexOf("Chapter II", c1); if (end < 0) end = c1 + 9000;
const chapter = full.slice(c1 - 200, end);
const rels = extractGfpRelations(chapter, { posPrior: pos, minRec: 2 });

const NOISE = /[^\x20-\x7E—–‘’“”…]|^(End|Chapter|Illustration|·)$/;
const cap = (s) => String(s ?? "").charAt(0).toUpperCase() + String(s ?? "").slice(1);
const clean = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();
const OUT = { Figure: [], Ground: [], Pattern: [] };
let grain_gap = 0;
for (const r of rels) {
  const e1 = clean(r.end1), e2 = clean(r.end2), lab = clean(r.label);
  if (!e1 || !e2 || !lab || NOISE.test(e1) || NOISE.test(e2)) continue;
  const g = r.grain?.grain ?? "gap";
  if (g === "gap") { grain_gap++; continue; }
  OUT[g].push({ e1, lab, e2, cell: r.cell ?? "", settledAs: r.grain?.settledAs ?? "" });
}

// THE PROSE: grouped by grain — the three registers spoken as the wheel turns.
const byFigure = OUT.Figure.slice(0, 12);
const byGround = OUT.Ground.filter((r) => /of|in|at|with|on/.test(r.lab)).slice(0, 8);
const byPattern = OUT.Pattern.slice(0, 6);
console.log("P R I D E   &   P R E J U D I C E — Chapter I, prosified on GFP (no model, no SVO):\n");
console.log("FIGURES — the bindings of the chapter (Link / Binding):");
for (const r of byFigure) console.log(`   ${cap(r.e1)} ${r.lab} ${r.e2}.`);
console.log("\nGROUND — the field the chapter stands on (Field / settings):");
for (const r of byGround) console.log(`   ${cap(r.e1)} ${r.lab} ${r.e2}.`);
console.log("\nPATTERN (if any — recurrences):");
if (byPattern.length) for (const r of byPattern) console.log(`   ${cap(r.e1)} ${r.lab} ${r.e2}.`);
else console.log("   (none settled — the record shows no pattern arrangements here)");
console.log(`\n· ${rels.length} GFP arrangements; ${OUT.Figure.length} Figure · ${OUT.Ground.length} Ground · ${OUT.Pattern.length} Pattern · ${grain_gap} refused as grain-gaps.`);