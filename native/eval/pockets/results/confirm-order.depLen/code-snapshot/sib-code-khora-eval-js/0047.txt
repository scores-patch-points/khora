// avail.mjs — design availability only (no reading, no ablation): how many matched pairs exist per cell.
import fs from "node:fs";
import { loadIrcDay, loadWp, IRC_ROOT } from "./lib-data.mjs";
import { loadMiddlemarch } from "./lib-book.mjs";
import { indexAndCandidates, pairsForCell, STRATA } from "./lib-pairs.mjs";
const which = process.argv[2], name = process.argv[3];
const M = which === "irc" ? 256 : 128;
const doc = which === "irc" ? loadIrcDay(`${IRC_ROOT}/${name}.txt`, name) : which === "wp" ? loadWp() : loadMiddlemarch();
const cand = indexAndCandidates(doc, M);
const out = { doc: doc.name, units: doc.stream.length, goldOcc: doc.goldPos.size, P: cand.P.length, N: cand.N.length, cells: {} };
for (const grp of ["A", "B"]) for (const st of STRATA) {
  const r = pairsForCell(cand, doc, M, { grp, stratum: st, n: 1000, seedTag: "avail" });
  out.cells[`${grp}:${st}`] = `${r.pairs.length}/${r.nPos}pos (drop ${r.dropped}) pool ${r.nNegPool}`;
}
console.log(JSON.stringify(out, null, 1));
