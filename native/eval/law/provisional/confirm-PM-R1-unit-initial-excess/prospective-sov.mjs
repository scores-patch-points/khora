// confirm-PM-R1-unit-initial-excess/prospective-sov.mjs -- PROSPECTIVE test of the post-hoc scope hypothesis "pInitX identifies PROPN much more strongly in SOV / head-final languages" on a SECOND, DISJOINT window of each fresh UD train file. New file.
//
//   node prospective-sov.mjs   ->  results/prospective-sov.jsonl (cells) + results/prospective-sov.json (verdict)
//
// ═══ PRE-REGISTRATION (written 2026-10-07 after explore.json was read and BEFORE the first run of this file; no pInitX has been computed on any of these second windows) ═══════════════════════════
// DISCLOSURE. The hypothesis was formed from the first-window fresh tier (SOV median 0.6725 over 8 cells vs rest 0.5473, permutation p 0.0008) and held in the scoper's consumed test.conllu tier (0.6655 vs 0.5532,
//   p 0.002) with a hand-assigned group list fixed BEFORE any result was read (explore.mjs/verdict.mjs). The groups: SOV = ja ko tr hi ur fa ta ka hy kk ug eu; everything else = REST (VSO and free-synthetic languages
//   stay in REST: no post-hoc reassignment). Lists, class (PN), mode (FULL), pair rules, valid-cell rule, bootstrap and permutation settings are exactly those of confirm.mjs / lib.mjs (same code path, runCell).
// DATA. For every treebank of data/manifest.json ud.files, a SECOND contiguous window of >= 40000 non-PUNCT word units that does not overlap the first window (the first window is rebuilt from the same seed as
//   confirm.mjs; the second start is drawn from seedFor('pm-r1-confirm', treebank, 'window2') among starts on the longer free side; if neither free side holds >= 40000 units the treebank is skipped and listed).
//   Treebanks whose file has < 80000 units therefore drop out; the SOV/REST composition is reported.
// CRITERIA (fixed now). P-A (headline): among valid cells (pairs >= 60, position control in [0.45,0.55]) the SOV median FULL AUC >= 0.60 AND the REST median <= SOV median - 0.05 AND the one-sided label-permutation
//   p (B = 5000) of the median difference < 0.05 AND >= 80% of valid SOV cells have AUC > 0.5. P-B (the generic UD statement on disjoint windows): median over ALL valid cells >= 0.55 and NEG cells <= 10%.
//   P-C (sham): median |AUC - 0.5| of sham cells <= 0.03. A verdict "SOV-SPECIFIC STRENGTH HOLDS" needs P-A and P-C; if P-A fails the SOV difference is reported as NOT reproduced prospectively.
// BLIND PREDICTIONS. P-A holds: 0.75 (SOV median ~0.65, REST ~0.56); P-B holds: 0.85; P-C holds: 0.85; SOV cells with AUC > 0.5: 0.9.
// NOT TESTED. Anything about causal mode, shuffled twin, other typological axes; the group lists are not tuned.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, rngFor, seedFor, headerSha, round, quantile, shamOf, runCell, readConllu, prep, UD_DEFS } from "./lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), man = JSON.parse(fs.readFileSync(path.join(HERE, "data", "manifest.json"), "utf8"));
const OUT = path.join(HERE, "results", "prospective-sov.jsonl"); fs.writeFileSync(OUT, "");
const SOV = new Set("ja ko tr hi ur fa ta ka hy kk ug eu".split(" ")), BUDGET = man.ud.windowTokens, HDR = headerSha(fileURLToPath(import.meta.url));
const med = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const valid = (c) => c && c.pairs >= 60 && c.posControlOk, sign = (f) => (f.lo > 0.5 && f.auc >= 0.53 ? "POS" : f.hi < 0.5 && f.auc <= 0.47 ? "NEG" : "FLAT");
const cells = [], skipped = [];
for (const [tb, file] of Object.entries(man.ud.files)) {
  const all = readConllu(file, null), first = readConllu(file, { budget: BUDGET, rnd: rngFor(seedFor(PRE, tb, "window")) }), [a, b] = first.window ?? [0, all.sents.length, 0];
  const tokens = (lo, hi) => all.sents.slice(lo, hi).reduce((x, s) => x + s.length, 0), sides = [[0, a], [b, all.sents.length]].filter(([lo, hi]) => tokens(lo, hi) >= BUDGET);
  if (!sides.length) { skipped.push(tb); continue; }
  const rnd = rngFor(seedFor(PRE, tb, "window2")), [lo, hi] = sides[Math.floor(rnd() * sides.length)], suffix = []; let acc = 0; for (let s = hi - 1; s >= lo; s--) { acc += all.sents[s].length; suffix[s - lo] = acc; }
  const starts = []; for (let s = lo; s < hi; s++) if (suffix[s - lo] >= BUDGET) starts.push(s); const st = starts[Math.floor(rnd() * starts.length)]; let e = st, c = 0; while (e < hi && c < BUDGET) { c += all.sents[e].length; e++; }
  const base = { name: `ud-${tb}-w2`, P: prep(all.sents.slice(st, e)), gold: all.upos.slice(st, e) }, real = runCell([base], UD_DEFS.PN, "FULL", "w2:real", { Bperm: 1000 }), sham = runCell([base], shamOf(UD_DEFS.PN, "sham1"), "FULL", "w2:sham", { Bperm: 0 });
  const g = SOV.has(tb.split("_")[0]) ? "SOV" : "REST"; cells.push({ tb, g, window: [st, e, c], real, sham }); fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, tb, g, window: [st, e, c], real, sham }) + "\n");
}
const v = cells.filter((x) => valid(x.real)), sv = v.filter((x) => x.g === "SOV").map((x) => x.real.feats.pInitX.auc), rv = v.filter((x) => x.g === "REST").map((x) => x.real.feats.pInitX.auc);
const obs = med(sv) - med(rv), rnd = rngFor(seedFor(PRE, "prospective-perm")); let ge = 0; const lab0 = v.map((x) => x.g === "SOV");
for (let k = 0; k < 5000; k++) { const lab = lab0.slice(); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } const a2 = v.filter((_, i) => lab[i]).map((x) => x.real.feats.pInitX.auc), b2 = v.filter((_, i) => !lab[i]).map((x) => x.real.feats.pInitX.auc); if (med(a2) - med(b2) >= obs - 1e-12) ge++; }
const shamDev = cells.map((x) => x.sham).filter((s) => s.pairs >= 60).map((s) => Math.abs(s.feats.pInitX.auc - 0.5)), allAuc = v.map((x) => x.real.feats.pInitX.auc);
const res = { headerSha: HDR, nCells: cells.length, skipped, nValid: v.length, nSOVvalid: sv.length, nRESTvalid: rv.length, medSOV: round(med(sv)), medREST: round(med(rv)), diff: round(obs), p: round((ge + 1) / 5001), sovGt50: sv.filter((x) => x > 0.5).length, medAll: round(med(allAuc)), NEG: v.filter((x) => sign(x.real.feats.pInitX) === "NEG").length, POS: v.filter((x) => sign(x.real.feats.pInitX) === "POS").length, shamMedDev: round(quantile(shamDev, 0.5)), nSham: shamDev.length, sovCells: v.filter((x) => x.g === "SOV").map((x) => `${x.tb}:${x.real.feats.pInitX.auc}`), restBelow50: v.filter((x) => x.g === "REST" && x.real.feats.pInitX.auc < 0.5).map((x) => `${x.tb}:${x.real.feats.pInitX.auc}`) };
res.PA = res.medSOV >= 0.6 && res.medREST <= res.medSOV - 0.05 && res.p < 0.05 && res.sovGt50 >= 0.8 * res.nSOVvalid; res.PB = res.medAll >= 0.55 && res.NEG <= 0.1 * res.nValid; res.PC = res.shamMedDev <= 0.03;
res.verdict = res.PA && res.PC ? "SOV-SPECIFIC STRENGTH HOLDS (prospective)" : "NOT reproduced prospectively";
fs.writeFileSync(path.join(HERE, "results", "prospective-sov.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
