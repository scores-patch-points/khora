// provisional/polarity-map/map3.mjs — U-SERIES (DISCOVERY, third pass): is "names recur at the unit start" real beyond unit LENGTH? Same registers and pairs as map.mjs / map2.mjs. New file.
//
// ═══ PRE-REGISTRATION (written 2026-10-07 before the first run of this file; map.mjs, map2.mjs, analyse.mjs and analyse2.mjs had already been run) ══════════════════════════
// DISCLOSURE. I have seen the E-series (results/e.*.jsonl, analysis.e.json): position-preserving diversity excess DLx (left) / DRx (right) and Ax = DRx-DLx; slot composition pEdgeL (share of the form's mentions
//   that are unit-initial), pEdgeR, pTopL, pRareL ... With the primary class: pEdgeL matched-pair AUC median UD-PO 0.556 (19 POS, 1 NEG of 35), UD-PN 0.570 (23 POS / 1 NEG of 34), IRC 0.899 (4/4), books 0.655
//   (3/3, cast 0.862), code-PE 0.684 (3/3); CAUSAL4 UD-PO 0.560, UD-PN 0.573, IRC 0.875, books 0.584, code 0.619. DLx: UD 0.460 (12 NEG), IRC 0.625 POS, books 0.310 NEG, code 0.636 POS (E2 'company' true for books and code
//   only: IRC raw left-anchoring is position). E1 (shuffle control on DLx/DRx) failed marginally for UD (0.0304) and for IRC (DRx 0.0504; en alone 0.51/0.49), passed for books and code. D5 second search (property -> DLx/Ax)
//   passed on all 45 registers (rareL_edge vs DLx, rho 0.575 vs q95 0.446, p 0.0005) but in NL-only the best was initRareEnrich vs Ax (0.493 vs 0.464) and in UD alone finalRareEnrich vs Ax (0.515 vs 0.504); rareL_edge vs DLx is
//   ~0.25 inside UD. IMPORTANT: the SHUF rows of results/e.*.jsonl show raw pEdgeL does NOT return to 0.5 on shuffled streams (irc-en 0.72, irc-it 0.62, tale-of-two-cities 0.70, code 0.55-0.59): a form whose mentions sit in
//   SHORT units starts them more often by chance, so raw pEdgeL mixes unit-initial-ness with unit length. Not yet seen: pInitX.
// OBJECT. For the form at (s,i), over its mentions (MODE FULL = all, CAUSAL4 = the 4 before): pInit = share of mentions at unit index 0; invLen = mean 1/len(unit); pInitX = pInit - invLen = UNIT-INITIAL EXCESS over the
//   rate expected if the index were uniform in the unit; pFinal / pFinalX likewise for the last index. No gold, case, POS, list or label enters.
// CONTROLS BUILT TO FAIL. SHUF (within-unit shuffled streams, same seeds as map.mjs): family median |AUC(pInitX)-0.5| < 0.03 (zero by construction on a shuffled stream). SHAM (hash parity inside the negatives): same band.
//   Position control (pairs) in [0.45,0.55]; valid cell >= 60 pairs. CONTROL-CORRECTED effect Delta = AUC(real) - AUC(shuf) reported per register.
// TESTS. U1 pInitX matched-pair AUC [cluster CI], per register and family (median; POS = CI lo > 0.5 and AUC >= 0.53). U2 the CAUSAL4 version. U3 UD with class PN (PROPN vs NOUN only: a control without verbs, which
//   rarely start a unit) and with class PO. U4 pFinalX the same. RULE GATE (what may be carried to the confirmation as Rule 1): family-median pInitX AUC >= 0.55 in EACH of UD(PN), IRC, books, code, with POS in >= 60% of UD
//   valid cells and in every valid cell of the others, CAUSAL4 median >= 0.53 in each, SHUF passing in each, Delta >= 0.05 in each family median.
// BLIND PREDICTIONS. R1 pInitX median UD-PN in [0.52,0.58]; IRC >= 0.80; books >= 0.58; code >= 0.55. R2 SHUF/SHAM within +-0.03 for every family (the raw pEdgeL failure was a length artefact). R3 pFinalX is NOT
//   a name signal in UD (median in [0.47,0.53]).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { shuffledOf, headerSha, seedFor } from "./lib.mjs";
import { featuresU, runCellsG, FEATSU } from "./lib3.mjs";
import * as R from "./registers.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HDR = headerSha(fileURLToPath(import.meta.url)).slice(0, 16), family = opt("--family"), tag = opt("--tag", "");
const OUT = path.join(HERE, "results", `u.${family}${tag ? "." + tag : ""}.jsonl`);
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");
const featFn = (P, s, i, mode) => featuresU(P, s, i, mode);
function doRegister(reg, fam, bases, defs) {
  const cache = new Map(), names = Object.keys(defs), dn = names[0];
  const shufGet = (b) => { let x = cache.get(b.name); if (!x) cache.set(b.name, (x = shuffledOf(b, seedFor("polarity-map", "shuf", b.name)))); return x; };
  for (const d of names) for (const mode of ["FULL", "CAUSAL4"]) emit({ reg, fam, def: d, mode, ctl: "real", ...runCellsG(bases, defs[d], mode, `real:${d}`, featFn, FEATSU) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "shuf", ...runCellsG(bases, defs[dn], "FULL", `shuf:${dn}`, featFn, FEATSU, { get: shufGet }) });
  emit({ reg, fam, def: dn, mode: "FULL", ctl: "sham", ...runCellsG(bases, R.shamOf(defs[dn], "sham1"), "FULL", `sham:${dn}`, featFn, FEATSU) });
  console.error(`${reg} done`);
}
async function main() {
  if (family === "ud") { const stems = opt("--stems") ? opt("--stems").split(",") : R.allStems(); for (const stem of stems) { const b = R.udBase(stem, "dev"); if (b) doRegister(`ud-${stem}`, "ud", [b], R.UD_DEFS); } }
  else if (family === "irc") { const sp = JSON.parse(fs.readFileSync(path.join(HERE, "results", "irc-split.json"), "utf8")); const cand = (id) => ({ id, path: path.join(R.IRC_ROOT, id) }); for (const lg of Object.keys(sp)) doRegister(`irc-${lg}`, "irc", [R.ircBase(`irc-${lg}-disc`, sp[lg].disc.map(cand))], R.IRC_DEFS); }
  else if (family === "book") { const G = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/"; doRegister("book-war-and-peace", "book", [R.wpBase()], R.BOOK_DEFS); for (const [nm, f] of [["book-pride-and-prejudice", "pg1342_Pride_and_Prejudice.txt"], ["book-tale-of-two-cities", "pg98_A_Tale_of_Two_Cities.txt"]]) doRegister(nm, "book", [R.bookBase(nm, R.loadText(G + f))], { NAMES: R.BOOK_DEFS.NAMES }); }
  else if (family === "code") { for (const [lg, n] of [["js", 12], ["py", 12], ["rb", 8]]) doRegister(`code-${lg}`, "code", Array.from({ length: n }, (_, i) => R.codeBase(lg, i)), R.CODE_DEFS); }
  else throw new Error("--family ud|irc|book|code");
}
await main();
