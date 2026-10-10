// design-check.mjs — DESIGN-TIME control: before any ablation read, are the matched pairs balanced on the matched-out observables?
// For a document and cell sizes, draw pairs with matching v1 or v2 and report the AUC of each control (names vs matched negatives). No impact record is read.
//   node design-check.mjs --corpus irc|wp|mm|ud --doc NAME [--split dev] --match v1|v2 --nA 12 --nB 10 --n1 0 [--tag t]
import { loadIrcDay, loadWp, IRC_ROOT } from "./lib-data.mjs";
import { loadMiddlemarch } from "./lib-book.mjs";
import { loadUd } from "./lib-ud.mjs";
import { indexAndCandidates, pairsForCell, pairsForCellV2, pairsForCellV3, STRATA } from "./lib-pairs.mjs";
import { aucPN } from "./stats.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const corpus = opt("--corpus", "irc"), name = opt("--doc", ""), match = opt("--match", "v2"), tag = opt("--tag", "dc");
const nA = Number(opt("--nA", 12)), nB = Number(opt("--nB", 10)), n1 = Number(opt("--n1", 0));
const M = corpus === "irc" ? 256 : 128;
const doc = corpus === "irc" ? loadIrcDay(`${IRC_ROOT}/${name}.txt`, name) : corpus === "wp" ? loadWp() : corpus === "mm" ? loadMiddlemarch() : loadUd(name, opt("--split", "dev"));
const cand = indexAndCandidates(doc, M), fn = { v1: pairsForCell, v2: pairsForCellV2, v3: pairsForCellV3 }[match];
const feat = { LOGC: (r) => Math.log(r.c), POS: (r) => r.s, IPOS: (r) => r.i, FB: (r) => r.fbin, LEN: (r) => r.len, SL: (r) => r.sl };
const out = { doc: doc.name, match, cells: {}, pooled: {} };
const pool = { A: [], B: [] };
for (const grp of ["A", "B"]) for (const st of STRATA) {
  const n = st === "c1" ? n1 : grp === "A" ? nA : nB; if (n <= 0) continue;
  const r = fn(cand, doc, M, { grp, stratum: st, n, seedTag: tag });
  if (st !== "c1") pool[grp].push(...r.pairs);
  out.cells[`${grp}:${st}`] = { got: r.pairs.length, ...Object.fromEntries(Object.entries(feat).map(([k, f]) => [k, r.pairs.length >= 8 ? Number(aucPN(r.pairs.map((x) => f(x.pos)), r.pairs.map((x) => f(x.neg))).toFixed(2)) : null])) };
}
for (const g of ["A", "B"]) out.pooled[g] = { n: pool[g].length, ...Object.fromEntries(Object.entries(feat).map(([k, f]) => [k, pool[g].length >= 8 ? Number(aucPN(pool[g].map((x) => f(x.pos)), pool[g].map((x) => f(x.neg))).toFixed(3)) : null])) };
console.log(JSON.stringify(out));
