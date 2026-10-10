// avail-ud.mjs — design availability only for UD DEV (no reading): matched pairs per cell, M=128.
import { loadUd } from "./lib-ud.mjs";
import { indexAndCandidates, pairsForCell, STRATA } from "./lib-pairs.mjs";
const stem = process.argv[2], split = process.argv[3] ?? "dev";
if (split !== "dev") throw new Error("avail-ud reads DEV only");
const doc = loadUd(stem, split), cand = indexAndCandidates(doc, 128);
const out = { doc: doc.name, sents: doc.stream.length, goldOcc: doc.goldPos.size, P: cand.P.length, cells: {} };
for (const grp of ["A", "B"]) for (const st of STRATA) { const r = pairsForCell(cand, doc, 128, { grp, stratum: st, n: 1000, seedTag: "avail" }); out.cells[`${grp}:${st}`] = `${r.pairs.length}/${r.nPos}`; }
console.log(JSON.stringify(out));
