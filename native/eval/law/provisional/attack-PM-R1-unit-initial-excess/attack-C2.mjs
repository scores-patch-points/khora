// attack-PM-R1-unit-initial-excess/attack-C2.mjs -- ATTACK C2 (DISPERSION-MATCHED REMATCH) on rule PM-R1. Follow-up to attack C declared AFTER its results. New file; edits nothing.
//
//   node attack-C2.mjs ud|irc|code -> results/C2-<name>.jsonl      node attack-C2.mjs summary -> results/C2-summary.json + .txt
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; thresholds below may be tightened, never loosened, after any result) ════════════════════════
// DISCLOSURE. Everything in attack-A.mjs and attack-C.mjs headers, plus attack C's RESULTS at rung K0 and K3 (results/C-summary-K0.txt, C-probe-K0.json): on the SAME matched rows, locality/dispersion observables
//   reproduce or exceed pInitX in UD (median AUC over 52 valid cells FULL: span 0.632, loc 0.591, burst 0.587, rec 0.576 vs pInitX 0.567; mean-position rivals relPos 0.568, meanIdx 0.558), in Python (span 0.733, burst
//   0.695, loc 0.695 vs 0.668), in JavaScript (burst 0.703, invLen 0.723 vs 0.588) and, for span only, within 0.03 in IRC (span 0.872 vs 0.902; loc 0.839 and burst 0.833 do NOT reproduce it; relPos/meanIdx 0.904/0.907
//   are position siblings); the probe (rivals vs rivals + pInitX, leave-one-treebank-out in UD) adds +0.0125 [0.008,0.017] in UD, +0.003 [-0.008,0.013] in IRC, +0.033 [0.010,0.059] in py; the re-cut control is
//   valid (UD median 0.502, IRC 0.477). QUESTION OF THIS FILE: is pInitX's residual signal still there when the pairs are matched on the DISPERSION rivals themselves?
// DATA. The same FRESH cells (59 UD train windows, IRC en fresh pooled, 16 py + 16 js files), same seeds as attack A, rebuilt streams.
// TESTS. New matching rungs (attack-lib SPECS): K5 = K1 key (count within tol, no relaxation, bucket index/char/unit length) + span octave EXACT (floor(log2(1 + units between first and last mention)); CAUSAL4:
//   distance from the 4th previous mention to the current one) + local mention count (+-25 units) within 1 + recency octave exact. K6 = K5 + exact unit index + exact unit length (<=15). pInitX AUC FULL, CAUSAL4,
//   cluster bootstrap B=300, <= 3 pairs per form and side, <= 600 pairs per cell (code 1000 over 16 files).
// VERDICT RULES (mechanical). UD at a rung: over valid cells (pairs >= 60, position control in [0.45,0.55]): HOLD if lower-median >= 0.55 and POS share >= 0.40; RESIDUAL if lower-median in [0.53,0.55) or POS
//   share in [0.25,0.40) (an effect above chance remains but is below the rule's own gate); ABSORBED if lower-median < 0.53 and POS share < 0.25; UNDERPOWERED if < 12 valid cells (then only the paired comparison on
//   common cells is reported, and the verdict is read off the paired difference to K0 of the same cells: ABSORBED if it is <= -0.03). IRC: HOLD if AUC >= 0.80 with CI lower > 0.5; RESIDUAL if 0.65 <= AUC < 0.80;
//   ABSORBED if < 0.65. CODE: HOLD if AUC >= 0.55 and CI lower > 0.5; RESIDUAL if AUC > 0.5 with CI lower > 0.5 but AUC < 0.55; ABSORBED otherwise. The claim "pInitX identifies names beyond locality" SURVIVES
//   in a register if that register is HOLD or RESIDUAL at K5 and K6 (FULL); it FALLS there if ABSORBED.
// BLIND PREDICTIONS (probability my prior gives). UD K5 RESIDUAL or HOLD: 0.60 (point 0.54); UD K6 UNDERPOWERED: 0.55; IRC K5 RESIDUAL: 0.65 (point 0.76), HOLD: 0.2; py K5 HOLD or RESIDUAL: 0.65; js ABSORBED: 0.60.
// NOT TESTED. Other dispersion measures (burst share, document dispersion D); matching on mention count within a window other than 25; first mentions.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, ircFiles, udWindow, ircLoad, codeBase, occsOf, buildPairs, evalPairs, SPECS, UD_DEFS, IRC_DEFS, CODE_DEFS, rngFor, seedFor, headerSha, round, mean, lowMed, sign, validCell, log } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), name = process.argv[2], HDR = headerSha(fileURLToPath(import.meta.url)), CONF = path.join(HERE, "..", "confirm-PM-R1-unit-initial-excess"), B = 300;
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
const RES = (f) => path.join(HERE, "results", f), OUT = RES(`C2-${name}.jsonl`), emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, ...o }) + "\n");
function run1(b, def, mode, rung, tag) { const oc = occsOf(b.P, b.gold, def, mode, null, b.name), { pairs, dropped } = buildPairs(b.P, oc, SPECS[rung], rngFor(seedFor(PRE, "C2", tag, rung, mode)), { maxPairs: 600, mode }); return { dropped, ...evalPairs(b.P, pairs, mode, tag + rung, { B, Bperm: 0, name: b.name }) }; }
function ud() { for (const tb of Object.keys(MAN.ud.files)) { const b = udWindow(tb); for (const mode of ["FULL", "CAUSAL4"]) for (const r of ["K0", "K5", "K6"]) emit({ reg: tb, rung: r, mode, ...run1(b, UD_DEFS.PN, mode, r, tb) }); log(`ud ${tb}`); } }
function irc() { const b = ircLoad("irc-en-fresh", ircFiles(MAN.irc.freshEnAll.map((x) => x.id))); for (const mode of ["FULL", "CAUSAL4"]) for (const r of ["K0", "K5", "K6"]) emit({ reg: "irc-en-fresh", rung: r, mode, ...run1(b, IRC_DEFS.NK, mode, r, "irc") }); }
function code() {
  for (const lg of ["py", "js"]) { const bases = Array.from({ length: 16 }, (_, i) => codeBase(`code-${lg}-${i}`, path.join(CONF, "data", "lex", `${lg}-${i}.json`))), per = Math.ceil(1000 / 16);
    for (const mode of ["FULL", "CAUSAL4"]) for (const r of ["K0", "K5", "K6"]) { const pairs = []; for (const b of bases) pairs.push(...buildPairs(b.P, occsOf(b.P, b.gold, CODE_DEFS.PE, mode, null, b.name), SPECS[r], rngFor(seedFor(PRE, "C2", "code", lg, b.name, r, mode)), { maxPairs: per, mode }).pairs); emit({ reg: `code-${lg}`, rung: r, mode, ...evalPairs(null, pairs, mode, `c2code${lg}${r}`, { B, Bperm: 0, name: `code-${lg}` }) }); } }
}
if (name === "ud") ud(); else if (name === "irc") irc(); else if (name === "code") code();
// ── SUMMARY (mechanical implementation of the verdict rules of the header) ────────────────────────────────────────────────────────────────
function summary() {
  const rd = (n) => (fs.existsSync(RES(`C2-${n}.jsonl`)) ? fs.readFileSync(RES(`C2-${n}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []), U = rd("ud"), I = rd("irc"), Cc = rd("code"), T = [], out = { hdr: HDR, ud: {}, irc: {}, code: {} }, say = (s) => T.push(s), f3 = (x) => (x === null || x === undefined ? "  -  " : Number(x).toFixed(3));
  for (const mode of ["FULL", "CAUSAL4"]) for (const r of ["K0", "K5", "K6"]) {
    const cells = U.filter((x) => x.rung === r && x.mode === mode), val = cells.filter(validCell), med = lowMed(val.map((x) => x.auc)), pos = val.filter((x) => sign(x) === "POS").length, share = val.length ? pos / val.length : 0;
    const k0 = new Map(U.filter((x) => x.rung === "K0" && x.mode === mode && validCell(x)).map((x) => [x.reg, x.auc])), common = val.filter((x) => k0.has(x.reg)), dpair = common.length ? round(mean(common.map((x) => x.auc - k0.get(x.reg)))) : null;
    const v = val.length < 12 ? (dpair !== null && dpair <= -0.03 ? "ABSORBED(paired)" : "UNDERPOWERED") : med >= 0.55 && share >= 0.4 ? "HOLD" : med >= 0.53 || share >= 0.25 ? "RESIDUAL" : "ABSORBED";
    out.ud[`${mode}|${r}`] = { nValid: val.length, medLower: med, POS: pos, share: round(share), verdict: v, nCommon: common.length, meanPairedDeltaVsK0: dpair, medCommon: lowMed(common.map((x) => x.auc)), medK0Common: lowMed(common.map((x) => k0.get(x.reg))) };
    say(`UD ${mode} ${r}: valid ${val.length}/${cells.length} medLower ${f3(med)} POS ${pos} (${f3(share)}) ${v}; common-with-K0 n=${common.length}: ${f3(lowMed(common.map((x) => x.auc)))} vs K0 ${f3(lowMed(common.map((x) => k0.get(x.reg))))} (mean paired delta ${f3(dpair)})`);
  }
  for (const x of I) { const v = !(x.pairs >= 60) ? "UNDERPOWERED" : x.auc >= 0.8 && x.lo > 0.5 ? "HOLD" : x.auc >= 0.65 ? "RESIDUAL" : "ABSORBED"; out.irc[`${x.mode}|${x.rung}`] = { pairs: x.pairs, auc: x.auc, lo: x.lo, hi: x.hi, verdict: v }; say(`IRC ${x.reg} ${x.mode} ${x.rung}: pairs ${x.pairs} AUC ${f3(x.auc)} [${f3(x.lo)},${f3(x.hi)}] ${v}`); }
  for (const x of Cc) { const v = !(x.pairs >= 60) ? "UNDERPOWERED" : x.auc >= 0.55 && x.lo > 0.5 ? "HOLD" : x.auc > 0.5 && x.lo > 0.5 ? "RESIDUAL" : "ABSORBED"; out.code[`${x.reg}|${x.mode}|${x.rung}`] = { pairs: x.pairs, auc: x.auc, lo: x.lo, hi: x.hi, verdict: v }; say(`CODE ${x.reg} ${x.mode} ${x.rung}: pairs ${x.pairs} AUC ${f3(x.auc)} [${f3(x.lo)},${f3(x.hi)}] ${v}`); }
  fs.writeFileSync(RES("C2-summary.json"), JSON.stringify(out, null, 1)); fs.writeFileSync(RES("C2-summary.txt"), T.join("\n") + "\n"); console.log(T.join("\n"));
}
if (name === "summary") summary();
