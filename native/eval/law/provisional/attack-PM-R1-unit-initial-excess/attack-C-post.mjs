// attack-PM-R1-unit-initial-excess/attack-C-post.mjs -- POST-HOC DESCRIPTIVE ANALYSIS of attack C's UD rows (results/C-ud-K0.jsonl): is the locality rival typology-neutral while pInitX is SOV-concentrated? New file.
//
// ═══ PRE-REGISTRATION (written 2026-10-07 AFTER attack C and C2 results were read; this block is a DECLARED POST-HOC DESCRIPTION, not a new test: no thresholds are used to change any verdict) ═══════════════
// DISCLOSURE. C-summary-K0.txt (median AUC over 52 valid cells FULL: pInitX 0.567, span 0.632, loc 0.591, burst 0.587, rec 0.576, relPos 0.568, meanIdx 0.558) and B-summary.txt (SOV vs rest in halves) have been seen.
// WHAT IS COMPUTED. On the 52 valid K0 FULL cells: for each observable the share of cells with AUC > 0.5 and > 0.55; Spearman rho between pInitX and span AUC across cells; SOV-vs-rest lower-median difference
//   (SOV list of attack-B.mjs) for pInitX, span, loc, burst, relPos, with label-permutation p (B=5000). Reported with the SAME decision-free format; it informs residualLicence only.
// BLIND PREDICTION. The SOV difference is smaller for span/loc/burst than for pInitX/relPos/pInit (0.7).
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { headerSha, round, mean, lowMed, shuffleIn, rngFor, seedFor, PRE } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), HDR = headerSha(fileURLToPath(import.meta.url));
const SOV = "ja ko tr hi ur fa ta ka hy kk ug eu".split(" "), rows = fs.readFileSync(path.join(HERE, "results", "C-ud-K0.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.mode === "FULL" && !r.ctl && r.pairs >= 60 && r.posCtl >= 0.45 && r.posCtl <= 0.55);
const ranks = (xs) => { const o = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let t = i; t <= j; t++) r[o[t][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
const pear = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0, x = 0, y = 0; for (let k = 0; k < a.length; k++) { s += (a[k] - ma) * (b[k] - mb); x += (a[k] - ma) ** 2; y += (b[k] - mb) ** 2; } return s / Math.sqrt(x * y); };
const out = { hdr: HDR, n: rows.length, feats: {} }, g = rows.map((r) => (SOV.includes(r.reg.split("_")[0]) ? 1 : 0)), rnd = rngFor(seedFor(PRE, "Cpost"));
for (const f of ["pInitX", "span", "loc", "burst", "rec", "relPos", "meanIdx", "pInit", "invLen"]) {
  const v = rows.map((r) => r.aucs[f]), st = (vv) => lowMed(vv.filter((_, k) => g[k] === 1)) - lowMed(vv.filter((_, k) => g[k] === 0)), obs = st(v); let ge = 0; for (let b = 0; b < 5000; b++) if (st(shuffleIn(v.slice(), rnd)) >= obs - 1e-12) ge++;
  out.feats[f] = { med: lowMed(v), shareGT50: round(mean(v.map((x) => (x > 0.5 ? 1 : 0)))), shareGT55: round(mean(v.map((x) => (x > 0.55 ? 1 : 0)))), sovMed: lowMed(v.filter((_, k) => g[k] === 1)), restMed: lowMed(v.filter((_, k) => g[k] === 0)), sovDiff: round(obs), p: round((ge + 1) / 5001) };
}
out.rhoPInitX_span = round(pear(ranks(rows.map((r) => r.aucs.pInitX)), ranks(rows.map((r) => r.aucs.span)))); out.cellsSpanBeatsPInitX = rows.filter((r) => r.aucs.span > r.aucs.pInitX).length;
fs.writeFileSync(path.join(HERE, "results", "C-post.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
