// provisional/polarity-map/map2.mjs — E-SERIES (DISCOVERY, second pass): is the polarity COMPANY or merely POSITION/LENGTH? Same registers, same matched pairs as map.mjs. New file.
//
// ═══ PRE-REGISTRATION (written 2026-10-07 before the first run of this file; map.mjs and analyse.mjs had already been run) ═══════════════════════════════
// DISCLOSURE. I have seen the whole discovery map of map.mjs (results/disc.*.jsonl, analysis.disc.json, map-table.txt): matched-pair AUC of DLf/DRf (higher = more diverse):
//   UD PO FULL (35 valid languages): DLf median 0.426 [0.377,0.468] (20 NEG, 0 POS), DRf median 0.489 (31 FLAT); IRC en/de/es/it: DLf 0.12-0.13, DRf 0.56-0.85 (a nickname's left
//   neighbours are the least diverse and its right neighbours the most); books (War and Peace, Pride and Prejudice, A Tale of Two Cities): DLf 0.25-0.32, DRf 0.60 / 0.66 / 0.37; code (js, py, rb):
//   DLf 0.61-0.69, DRf 0.52-0.57. SIGN: natural-language registers NEG on DLf, source code POS. D2 FAILED for irc, book, code: the within-unit SHUFFLE control did not return to 0.5 (irc
//   DLf/DRf 0.41/0.38, book 0.46/0.44, code 0.48/0.54; UD passed 0.50/0.50), i.e. part of the raw signal is the POSITION and UNIT LENGTH of the form's OTHER mentions (a nickname
//   recurs at message start; a form whose mentions sit in short units meets edges), which the matching of the CURRENT occurrence does not remove. By the registered rule the signs of those
//   families do not count until this is controlled; that is the purpose of this script. D4 (property -> sign) FAILED on the 45 registers: max |rho| 0.389 vs permutation q95 0.449 (p 0.15);
//   at the family level (UD averaged to one point, n=11) asymRigid -0.87 and initRareEnrich -0.78 on DLf, which is the code-vs-language contrast and not a test. Not yet seen: any E-series feature.
// OBJECT. Same pairs (same seeds) as map.mjs. New label-free features per form, MODE FULL (all mentions) and CAUSAL4 (the 4 mentions before):
//   DLx, DRx = DIVERSITY EXCESS: observed unbiased pair-collision diversity of the left / right neighbour forms MINUS its mean under a POSITION-PRESERVING NULL (B0=8 draws; every mention keeps its
//   index in its unit, so an edge stays an edge, and its neighbour is a uniformly random OTHER token of the same unit); DLbx, DRbx the same on rank bins; Af = DRf - DLf, Ax = DRx - DLx
//   (RIGHT-open minus LEFT-open: the asymmetry); slot composition pEdgeL/pTopL/pRareL and pEdgeR/pTopR/pRareR = share of mentions whose neighbour is a unit edge / a top-3 frequency form
//   (rank bin <= 1: determiner-, preposition- or particle-like by company alone) / a rare form (rank bin >= 7 of the register's own ranks). No gold, case, POS or list enters any feature.
// CONTROLS BUILT TO FAIL. E1 SHUF (within-unit shuffled streams, same seeds as map.mjs): per family the median |AUC - 0.5| of DLx and DRx over valid registers must be < 0.03 (the excess is
//   zero by construction on a shuffled stream; if it is not the null or the code is wrong, and nothing from E-series counts). E1b SHAM (form-hash parity inside the negatives): same band for >= 80%
//   of cells. Position control (pairs) in [0.45,0.55] for a valid cell; thin < 60 pairs.
// TESTS (SESOI 0.03; sign definitions as in map.mjs D1). E2 SIGN ROBUSTNESS per family: the raw DLf sign is attributed to COMPANY if DLx has the same sign in >= 2/3 of the family's valid
//   cells with a family-median |AUC-0.5| >= 0.05; otherwise to position/length. E3 ASYMMETRY: AUC of Af and Ax per register and family medians. E4 SLOT COMPOSITION: names vs matched
//   controls on each pXY (AUC and mean difference), a label-using DIAGNOSTIC of where the diversity difference comes from. E5 CANDIDATE RULE GATE (what may be carried to the confirmation):
//   a score + family scope with family-median AUC >= 0.60 (or <= 0.40), cluster CI excluding 0.5 in >= 2/3 of valid cells, E1 passing, position control valid, causal (CAUSAL4) version >= 0.55 (or <= 0.45).
// BLIND PREDICTIONS. Q1 DLx stays NEG in IRC (family median <= 0.35) and books (<= 0.40): left-anchoring is more than message position. Q2 UD DLx median in [0.40,0.50] (part of the UD raw
//   signal is position). Q3 code DLx POS (>= 0.55). Q4 Ax >= 0.75 in each IRC set, >= 0.60 in books, <= 0.55 in code. Q5 E1 holds in every family. Q6 names have higher pRareL than controls
//   in UD (multiword names) and higher pEdgeL in IRC (vocative).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { shuffledOf, headerSha, seedFor, rngFor, shuffleIn } from "./lib.mjs";
import { runCells2 } from "./lib2.mjs";
import { shamOf } from "./registers.mjs";
import * as R from "./registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)).slice(0, 16), family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `e.${family}${tag ? "." + tag : ""}.jsonl`);
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");
function doRegister(reg, fam, bases, defs) {
  const t0 = Date.now(), cache = new Map(), names = Object.keys(defs), dn = names[0];
  const shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor("polarity-map", "shuf", b.name)))); return x; };
  for (const d of names) for (const mode of ["FULL", "CAUSAL4"]) emit({ reg, fam, def: d, mode, ctl: "real", ...runCells2(bases, defs[d], mode, `real:${d}`) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "shuf", ...runCells2(bases, defs[dn], "FULL", `shuf:${dn}`, { get: shufGet }) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "sham", ...runCells2(bases, shamOf(defs[dn], "sham1"), "FULL", `sham:${dn}`) });
  console.error(`${reg} done ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
async function main() {
  if (family === "ud") { const stems = opt("--stems") ? opt("--stems").split(",") : R.allStems(); for (const stem of stems) { const b = R.udBase(stem, "dev"); if (b) doRegister(`ud-${stem}`, "ud", [b], R.UD_DEFS); } }
  else if (family === "irc") { const sp = JSON.parse(fs.readFileSync(path.join(HERE, "results", "irc-split.json"), "utf8")); const cand = (id) => ({ id, path: path.join(R.IRC_ROOT, id) }); for (const lg of Object.keys(sp)) doRegister(`irc-${lg}`, "irc", [R.ircBase(`irc-${lg}-disc`, sp[lg].disc.map(cand))], R.IRC_DEFS); }
  else if (family === "book") { const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/"; doRegister("book-war-and-peace", "book", [R.wpBase()], R.BOOK_DEFS); for (const [nm, f] of [["book-pride-and-prejudice", "pg1342_Pride_and_Prejudice.txt"], ["book-tale-of-two-cities", "pg98_A_Tale_of_Two_Cities.txt"]]) doRegister(nm, "book", [R.bookBase(nm, R.loadText(G + f))], { NAMES: R.BOOK_DEFS.NAMES }); }
  else if (family === "code") { for (const [lg, n] of [["js", 12], ["py", 12], ["rb", 8]]) doRegister(`code-${lg}`, "code", Array.from({ length: n }, (_, i) => R.codeBase(lg, i)), R.CODE_DEFS); }
  else throw new Error("--family ud|irc|book|code");
}
await main();
