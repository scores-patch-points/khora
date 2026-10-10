// extend.mjs: POST-HOC EXTENSION of the R2 confirmation.   modes:  win STEM...  (compute extra windows) | summary
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; STATUS: POST-HOC extension, written AFTER the primary verdict of confirm.mjs was seen) ═══
// DISCLOSURE. Seen before this header: the complete primary result of confirm.mjs (results/verdict.json, all 55 eligible per-language rows: FWC32, pairs, AUC, position, shuffle, eq250). In particular: PRIMARY (sets A and B, 34 eligible) gave
//   rho(FWC32, AUC) = -0.04, frozen skill -0.16, in-scope audible 9/12, out-of-scope audible 3/8, separation +0.007, controls valid (tier = PARTIAL: sufficient condition only); SECONDARY (set C, dev-fitted languages on new text) gave rho 0.59, skill 0.49,
//   in-scope 11/11, out-of-scope 2/4; reliability of language-level AUC between my train window and the scoper's test file: Spearman 0.44 (n 42), versus dev: 0.67 (n 20). Some single-window AUCs moved a lot between samples (lit 0.79 here vs 0.54 on test).
//   This extension therefore asks a question the data made salient: is the missing FWC32 gradient in genuinely new languages a measurement-noise artefact of ONE 20,000-token window per language, or real? It cannot change the primary verdict or tier.
// DATA. For every language of windows.json (same eligibility rules: >= 60 pairs and POSITION in [0.45, 0.55]) up to 5 EXTRA windows, each a contiguous block of >= 20,000 tokens, never overlapping each other, the primary window or the sibling R1 window:
//   B and C stems: blocks of the tb train file cut sequentially from sentence 0, same dedupe against ud-eval dev/test as confirm.mjs. A languages: blocks of the train, dev and test files of the EO Testing treebank (all three are unopened for any name test; kk, yo: none).
//   Candidate blocks are shuffled with rngFor(seedFor("confirm-R2-ext", stem, "pick")) and the first 5 kept. Per window: pairsOf(doc, "LATER", rngFor(seedFor("confirm-R2-ext", stem, "pairs", k)), 600), BOTH and POSITION CV AUC, FWC32. No null, shuffle or EQ250 here (they were run on the primary window and were valid).
// TESTS (thresholds fixed now, in the direction of the rule; EXPLORATORY labels apply to every number because this is post-hoc).
//   LANGUAGE LEVEL: a language enters with >= 3 eligible windows (primary window included); its AUC = mean over eligible windows, its FWC32 = mean over those windows, its pairs = mean pairs.
//     X1 GRADIENT IN NEW LANGUAGES: Spearman(FWC32, mean AUC) over PRIMARY (A and B) >= +0.40 with one-sided permutation p <= 0.05 (4000 permutations).   X1c: the same on POOLED (A, B, C).
//     X2 RELIABILITY (no threshold): one-way ICC of window AUC by language (ICC1 and ICC of the language mean), over PRIMARY, C and POOLED; the attenuation-corrected rho = rho / sqrt(ICC_k) is reported as a diagnostic only.
//     X3 SCOPE HIT RATE on language means: in-scope (mean FWC32 >= 0.2795 and mean pairs >= 250) audible share (mean AUC >= 0.60) >= 0.70 (>= 4 languages) and out-of-scope share <= 0.50 (>= 3 languages), on PRIMARY and on POOLED; Fisher exact test of in vs out.
//     X5 LOW SIDE: language means with FWC32 < 0.20: audible share <= 0.25 (POOLED, needs >= 3 languages).
//   WINDOW LEVEL (text level moderator):
//     X4 WITHIN-LANGUAGE: over languages with >= 3 eligible windows, demean FWC32 and AUC inside each language; Spearman across all windows >= +0.20 with one-sided p <= 0.05 by 4000 permutations of the AUC residuals within language (POOLED, and PRIMARY).
//         Also the same after removing the within-language linear effect of log2 pairs from the AUC residual (pairs-adjusted).
//   DESCRIPTIVE: between-window SD of AUC per language, the number of in-scope windows audible (window level share), windows with AUC >= 0.60 by FWC32 zone.
// BLIND PREDICTIONS. X1 rho 0.30 (plausible 0.0-0.55), P(pass) 0.35; X1c rho 0.40; ICC of language mean 0.65; X3 in-scope 0.80 and out-of-scope 0.40 (P(both pass) 0.45); X5 low side audible share 0.35 (P(pass) 0.25); X4 within-language rho 0.10 (P(pass) 0.25).
// CAVEATS. The same window text feeds ICC and rho; windows within a language share genre; the extra windows of one language are not independent texts of the language (they are neighbouring or distant blocks of the same treebank). Related languages are not independent.
//   A languages' dev and test files come from older UD releases than the tb trains; PROIEL treebanks are Bible-style text.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, UD, EO, round, mean, sd, share, quantile, headerSha, readConllu, fwcK, tokensOf, docFrom, pairsOf, cvAuc, rngFor, seedFor, spearman, ranks, pearson, mulberry, shuffleIn, wilson } from "./lib.mjs";
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1");
const EXT = path.join(HERE, "results", "ext"); fs.mkdirSync(EXT, { recursive: true });
const W = JSON.parse(fs.readFileSync(path.join(HERE, "windows.json"), "utf8")), TARGET = 20000, KEXTRA = 5, TSCOPE = 0.2795, AUDIBLE = 0.6;
const blocksOf = (sents) => { const bl = []; let s = 0; while (s < sents.length) { let e = s, t = 0; while (e < sents.length && t < TARGET) { t += sents[e].length; e += 1; } if (t < TARGET) break; bl.push([s, e]); s = e; } return bl; };
const dupKeys = (stem) => { const s = new Set(); for (const sp of ["dev", "test"]) for (const x of readConllu(path.join(UD, stem, sp + ".conllu")).sents) s.add(x.join(" ")); return s; };
const elig = (r) => r.pairs >= 60 && r.position >= 0.45 && r.position <= 0.55;
function extraWindows(stem) { // [{source, s, e, sents, upos}]
  const w = W[stem]; if (!w || w.error) return [];
  const files = w.set === "A" ? (["kaz", "yor"].includes(stem) ? [] : ["train", "dev", "test"].map((sp) => path.join(EO, path.basename(path.dirname(w.source)), `${path.basename(path.dirname(w.source))}-ud-${sp}.conllu`)).filter((f) => fs.existsSync(f))) : [w.source];
  const cand = [], D = w.set === "A" ? null : dupKeys(stem);
  for (const f of files) { const t = readConllu(f); for (const [s, e] of blocksOf(t.sents)) {
    if (f === w.source && !(e <= w.offset || s >= w.offset + w.taken)) continue; // overlaps the primary window
    if (w.set !== "A" && w.r1Taken != null && !(e <= w.r1Offset || s >= w.r1Offset + w.r1Taken)) continue; // overlaps the sibling R1 window
    let sents = t.sents.slice(s, e), upos = t.upos.slice(s, e); if (D) { const keep = sents.map((x) => !D.has(x.join(" "))); sents = sents.filter((_, i) => keep[i]); upos = upos.filter((_, i) => keep[i]); }
    cand.push({ source: f, s, e, sents, upos }); } }
  return shuffleIn(cand, rngFor(seedFor("confirm-R2-ext", stem, "pick"))).slice(0, KEXTRA);
}
const [mode, ...rest] = process.argv.slice(2);
if (mode === "win") for (const stem of rest) { const f = path.join(EXT, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists"); continue; }
  const t0 = Date.now(), out = { stem, set: W[stem]?.set, headerSha256: headerSha(import.meta.url), windows: [] };
  try { extraWindows(stem).forEach((x, k) => { const pr = pairsOf(docFrom(stem, x.sents, x.upos), "LATER", rngFor(seedFor("confirm-R2-ext", stem, "pairs", k))), o = { source: path.basename(x.source), s: x.s, e: x.e, tokens: tokensOf(x.sents), fwc32: round(fwcK(x.sents, 32)), pairs: pr.pairs };
      if (pr.pairs >= 60) { o.auc = round(cvAuc(pr.rows, "BOTH")); o.position = round(cvAuc(pr.rows, "POSITION")); } out.windows.push(o); }); out.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(out)); console.error(stem, out.set, out.windows.map((o) => `${o.fwc32}/${o.pairs}/${o.auc ?? "-"}`).join(" "), out.seconds + "s"); }
  catch (e) { console.error(stem, "ERROR", String(e).slice(0, 200)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); } }
// ── summary ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lf = (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
function fisher(a, b, c, d) { // two-sided Fisher exact, table [[a,b],[c,d]]
  const n = a + b + c + d, r1 = a + b, c1 = a + c;
  const hyp = (x) => Math.exp(lf(r1) + lf(n - r1) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(n - r1 - c1 + x)), lo = Math.max(0, c1 - (n - r1)), hi = Math.min(r1, c1), p0 = hyp(a); let p = 0; for (let x = lo; x <= hi; x++) { const px = hyp(x); if (px <= p0 + 1e-12) p += px; } return Math.min(1, p); }
function icc(groups) { // groups: arrays of AUC per language (>= 2 each)
  const g = groups.filter((x) => x.length >= 2), N = g.reduce((t, x) => t + x.length, 0), k = g.length; if (k < 3) return null; const gm = g.flat().reduce((a, b) => a + b, 0) / N;
  const ssb = g.reduce((t, x) => t + x.length * (mean(x) - gm) ** 2, 0), ssw = g.reduce((t, x) => t + x.reduce((u, v) => u + (v - mean(x)) ** 2, 0), 0), msb = ssb / (k - 1), msw = ssw / (N - k), k0 = (N - g.reduce((t, x) => t + x.length ** 2, 0) / N) / (k - 1);
  return { languages: k, windows: N, msb: round(msb, 6), msw: round(msw, 6), icc1: round((msb - msw) / (msb + (k0 - 1) * msw), 3), iccK: round((msb - msw) / msb, 3), withinSD: round(Math.sqrt(msw), 4) }; }
if (mode === "summary") {
  const rowsDir = path.join(HERE, "results", "rows"), prim = Object.fromEntries(fs.readdirSync(rowsDir).filter((f) => f.endsWith(".json")).map((f) => { const r = JSON.parse(fs.readFileSync(path.join(rowsDir, f), "utf8")); return [r.stem, r]; }));
  const langs = [];
  for (const [stem, p] of Object.entries(prim)) { const ex = fs.existsSync(path.join(EXT, stem + ".json")) ? JSON.parse(fs.readFileSync(path.join(EXT, stem + ".json"), "utf8")).windows : [];
    const ws = [{ src: "primary", fwc32: p.fwc32, pairs: p.pairs, auc: p.auc, position: p.position }, ...ex.map((x) => ({ src: x.source, fwc32: x.fwc32, pairs: x.pairs, auc: x.auc, position: x.position }))].filter((x) => x.auc != null && elig(x));
    langs.push({ stem, set: p.set, nExtra: ex.length, nWin: ws.length, ws, meanAuc: mean(ws.map((x) => x.auc)), sdAuc: sd(ws.map((x) => x.auc)), meanFwc: mean(ws.map((x) => x.fwc32)), meanPairs: mean(ws.map((x) => x.pairs)) }); }
  const sets = { PRIMARY: langs.filter((l) => l.set === "A" || l.set === "B"), C: langs.filter((l) => l.set === "C"), POOLED: langs, A: langs.filter((l) => l.set === "A"), B: langs.filter((l) => l.set === "B") }, R = { headerSha256: headerSha(import.meta.url), status: "POST-HOC EXTENSION", sets: {} };
  for (const [name, ls0] of Object.entries(sets)) { const ls = ls0.filter((l) => l.nWin >= 3), o = { languagesInSet: ls0.length, withGe3Windows: ls.length, windowsTotal: ls.reduce((t, l) => t + l.nWin, 0) }; R.sets[name] = o; if (ls.length < 5) { o.note = "too few"; continue; }
    const fw = ls.map((l) => l.meanFwc), au = ls.map((l) => l.meanAuc), rho = spearman(fw, au), rnd = mulberry(1234); let ge = 0; for (let b = 0; b < 4000; b++) if (spearman(fw, shuffleIn(au.slice(), rnd)) >= rho - 1e-12) ge += 1;
    o.X1 = { n: ls.length, rho: round(rho, 3), p: round((ge + 1) / 4001, 4) }; const ic = icc(ls.map((l) => l.ws.map((x) => x.auc))); o.X2 = ic && { ...ic, rhoAttenuationCorrected: round(rho / Math.sqrt(Math.max(0.05, ic.iccK)), 3) };
    const big = ls.filter((l) => l.meanPairs >= 250), ins = big.filter((l) => l.meanFwc >= TSCOPE), outs = big.filter((l) => l.meanFwc < TSCOPE), ia = ins.filter((l) => l.meanAuc >= AUDIBLE).length, oa = outs.filter((l) => l.meanAuc >= AUDIBLE).length;
    o.X3 = { inN: ins.length, inAudible: ia, inShare: round(ia / ins.length, 3), inWilson: wilson(ia, ins.length).map((x) => round(x, 3)), outN: outs.length, outAudible: oa, outShare: round(oa / Math.max(1, outs.length), 3), fisherP: ins.length && outs.length ? round(fisher(ia, ins.length - ia, oa, outs.length - oa), 4) : null,
      meanIn: round(mean(ins.map((l) => l.meanAuc))), meanOut: round(mean(outs.map((l) => l.meanAuc))), diffAllLangs: round(mean(ls.filter((l) => l.meanFwc >= TSCOPE).map((l) => l.meanAuc)) - mean(ls.filter((l) => l.meanFwc < TSCOPE).map((l) => l.meanAuc))), pass: ins.length >= 4 && outs.length >= 3 ? ia / ins.length >= 0.7 && oa / outs.length <= 0.5 : "NOT EVALUABLE" };
    const lo = ls.filter((l) => l.meanFwc < 0.2); o.X5 = { n: lo.length, audibleShare: round(share(lo, (l) => l.meanAuc >= AUDIBLE), 3), langs: lo.map((l) => `${l.stem}:${l.meanFwc.toFixed(3)}/${l.meanAuc.toFixed(3)}`) };
    // window level, within language
    const fr = [], ar = [], pr = [], grp = []; ls.forEach((l, gi) => { const mf = mean(l.ws.map((x) => x.fwc32)), ma = mean(l.ws.map((x) => x.auc)), mp = mean(l.ws.map((x) => Math.log2(x.pairs))); for (const x of l.ws) { fr.push(x.fwc32 - mf); ar.push(x.auc - ma); pr.push(Math.log2(x.pairs) - mp); grp.push(gi); } });
    const kP = pr.reduce((t, v, i) => t + v * ar[i], 0) / Math.max(1e-9, pr.reduce((t, v) => t + v * v, 0)), arAdj = ar.map((v, i) => v - kP * pr[i]), idx = ls.map((_, gi) => grp.map((g, i) => (g === gi ? i : -1)).filter((i) => i >= 0));
    const perm = (a) => { const rho0 = spearman(fr, a), r2 = mulberry(555); let g2 = 0; for (let b = 0; b < 4000; b++) { const a2 = a.slice(); for (const ix of idx) { const v = shuffleIn(ix.map((i) => a[i]), r2); ix.forEach((i, k) => { a2[i] = v[k]; }); } if (spearman(fr, a2) >= rho0 - 1e-12) g2 += 1; } return { rho: round(rho0, 3), p: round((g2 + 1) / 4001, 4) }; };
    o.X4 = { windows: fr.length, raw: perm(ar), pairsAdjusted: perm(arAdj), withinPairsSlopePerLog2: round(kP, 4) }; o.rows = ls.map((l) => ({ stem: l.stem, set: l.set, nWin: l.nWin, meanFwc: round(l.meanFwc), meanPairs: Math.round(l.meanPairs), meanAuc: round(l.meanAuc), sdAuc: round(l.sdAuc), aucs: l.ws.map((x) => x.auc) })); }
  const z = {}; for (const [lo, hi, nm] of [[0, 0.2, "<0.20"], [0.2, TSCOPE, "0.20-0.2795"], [TSCOPE, 9, ">=0.2795"]]) { const ws = langs.flatMap((l) => l.ws.map((x) => ({ ...x, set: l.set }))).filter((x) => x.fwc32 >= lo && x.fwc32 < hi); z[nm] = { windows: ws.length, audibleShare: round(share(ws, (x) => x.auc >= AUDIBLE), 3), meanAuc: round(mean(ws.map((x) => x.auc))) }; } R.windowLevelZones = z;
  fs.writeFileSync(path.join(HERE, "results", "extension.json"), JSON.stringify(R, null, 1)); const brief = JSON.parse(JSON.stringify(R)); for (const s of Object.values(brief.sets)) delete s.rows; console.log(JSON.stringify(brief, null, 1));
}
