// confirm.mjs: CONFIRMATION of candidate rule R1-first-left-fwc32 (lens company-moderators) on data no earlier test of this rule has used.
//   modes:  sanity | collect new|old|extra OUT.json | verdict NEW.json OLD.json EXTRA.json OUT.json
//   run with NAME_COMPANY_PAIRBLOCK=1 in the environment; never pass "run" as the first argument (name-company.mjs would start its own main).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; the sha256 of this header is recorded in every output JSON) ═══
// RULE UNDER TEST (as handed to me, unchanged). R1: "In written UD treebank text, if FWC32 >= 0.2378 (the 32 commonest forms of the stream cover >= 23.78% of tokens) then the name-company LEFT probe
//   (ridge-logistic on the frequency-rank bins of the two left neighbours, trained on matched pairs, leave-sentence-quartile-block-out CV, FIRST stratum = first occurrence of the form in the stream)
//   separates PROPN from matched NOUN/VERB/ADJ at AUC >= 0.60; below 0.2378 mostly not. Post-hoc refinement (scoper): clean zone FWC32 >= 0.28 (36/41 audible), below 0.24 mostly not.
//   Zero-shot form S2 = b(left1)+b(left2), b = log2 frequency-rank bin in the stream's own ranks, edge = 12, higher = name: paired AUC >= 0.55 in scope." Not claimed for chat/IRC.
// DISCLOSURE (what I have seen). (1) The rule JSON, the scoper's code and headers (confirm.mjs, util.mjs, stats.mjs, fixed-score.mjs, zones.mjs, moderators-prereg.txt) and the PRIMARY FIRST table of the
//   scoper's results/confirm.verdict.json = per-language FWC32, pairs, AUC, POSITION, S2 on the TEST text of the 28 never-fit languages. So I KNOW language-level outcomes on that other text: my predictions below are
//   NOT blind at language level. I have NOT read the old-25 test rows, zones.posthoc.json, robust/moderators/descriptors dev files, nor any output of the family-vs-relatedness or polarity-map lenses.
//   (2) UNTOUCHEDNESS AUDIT. test.conllu of all 53 stems: used by the scoper's single confirmation run (and I saw its rows) -> NOT used here. dev.conllu of the 28 new stems: the scoper's lens never read it, BUT the
//   family-vs-relatedness lens built probe counts on dev of ALL 53 stems (its cache/dev) and polarity-map read some -> NOT clean -> NOT used here. DATA USED = TRAIN text (tb/<stem>/train.conllu; kor = tb/kor-gsd,
//   the treebank of ud-eval/kor) which was read by impact.mjs / window-prims.mjs for other law questions (form-exposure counts), never by name-company, moderators, family or polarity code for any name/company
//   question, plus six treebanks outside ud-eval (eoreader7-segment-level fixtures; no khora law script reads them). Train-vs-dev/test sentence overlap was checked (<= 1% of sentences except lzh 5%, kor-test 12%, eng 2%).
//   (3) Of my own data I have seen only descriptors: window sizes, tokens, FWC32, PROPN counts and the number of FIRST matched pairs (results/avail.windows.json, avail.extra.json): NO AUC, probe, score or control of any
//   window or extra treebank. A timing probe printed eng dev FIRST LEFT 0.6468 / POSITION 0.5121 (equals name-company's own.json). Sanity mode below re-runs eng/fra dev and dan/cat test only to validate the pipeline.
// DATA. PRIMARY P = one contiguous TRAIN window of each of the 28 languages afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol, with the SAME number of
//   sentences as that language's dev (so stream size, ranks and FWC32 are comparable with the discovery sample), seeded offset (prep-windows.mjs). SECONDARY S = the same for the 25 old stems (fit languages, fresh
//   text); cmn-hans is a script-conversion duplicate of cmn: reported but EXCLUDED from every language-level statistic. TERTIARY X = en_pud, grc_proiel, la_perseus (test and train, one language), sa_ufal, sa_vedic.
//   CAVEAT registered: P is NEW TEXT of the languages the scoper already confirmed on; it re-tests text/pair luck and the fixed zones, not generalisation to unseen languages. X is the only unseen-language test (n tiny).
// OBSERVABLES AT READING TIME. Scope: FWC32 of the window (lowercased NFC forms, punctuation dropped; no label, case, POS or list). Signal: rank-bin slots of left1/left2 only (LEFT arm) and S2. Gold UPOS selects and
//   evaluates pairs only (PROPN vs NOUN/VERB/ADJ; matched on form-frequency bin, within-sentence position, character length, sentence length; both pair members in one CV block = PAIRBLOCK). The probe is a fitted
//   EXISTENCE TEST; S2 is the zero-shot fixed score (direction fixed). Seeds: rngFor(seedFor("confirm-R1", stem, tag)); <= 600 pairs.
// ELIGIBLE language = FIRST pairs >= 60 AND POSITION arm AUC in [0.45, 0.55]. Else thin / VOID for that language (listed). If > 30% of the >= 60-pair languages of a set leave the band, the set is VOID.
// CLAUSES on PRIMARY, eligible languages (thresholds are the rule's passIf/failIf; the additions e, f, K are mine and only tighten):
//   (a) Spearman(FWC32, AUC) >= +0.40 and one-sided permutation p <= 0.05 (language-label permutation, B = 5000).
//   (b) frozen-model skill = 1 - RMSE(FIRST model: AUC = 0.623591 + 0.038715*(FWC32-0.303335)/0.10758) / RMSE(constant dev mean 0.62359) >= 0.10.
//   (c) among eligible languages with >= 250 pairs: in-scope (FWC32 >= 0.2378) share with AUC >= 0.60 is >= 0.70 (needs >= 4 in-scope) and out-of-scope share <= 0.50 (needs >= 3, else not blocking).
//   (d) in-scope mean AUC minus out-of-scope mean AUC >= 0.04 over all eligible (needs >= 3 each side).
//   (e) clean-zone clause: among eligible languages with FWC32 >= 0.28, share with AUC >= 0.60 is >= 0.70 (the rule's falsifier is < 0.60; I require 0.70). Also reported: share audible below 0.24 (claimed mostly not).
//   (f) fixed-score sub-rule S2: in-scope mean paired AUC >= 0.55, in-scope share of paired AUC > 0.50 >= 0.75, in-scope minus out-of-scope >= 0.02 (needs >= 4 in, >= 3 out). S1, S3 reported only.
// CONTROLS (built to fail). K1 POSITION band above. K2 pair-swap permutation null, B = 50 per language (each pair's two labels swapped with p 1/2, same CV): mean over languages of the null mean within [0.48,0.52]
//   and, among languages with real AUC >= 0.60, share with real AUC > the null's 95th percentile >= 0.90, else the AUC scale is not trusted. K3 COMPANY SHUFFLE: tokens (and UPOS) shuffled within each sentence,
//   same pipeline: shuffled POSITION must sit in [0.45,0.55] (else that language's shuffle row is void); in-scope mean(real - shuffled) >= 0.04 and in-scope mean shuffled LEFT AUC <= 0.56, else the signal is
//   sentence composition, not adjacency, and the verdict is capped at PARTIAL (mechanism "company" unsupported). K4 DECOYS: Spearman of AUC with log2 pairs, log2 tokens, mean sentence length, TTR, hapax share,
//   FWC at K = 8/16/64/128 and a random permutation of FWC32; rho(FWC32, AUC | log2 pairs) (partial Spearman) must be >= +0.30 and every one of log2 pairs, log2 tokens, mean sentence length must have
//   |rho| <= rho(FWC32) - 0.10, else FWC32 is confounded with sample size (cap PARTIAL). K5 reliability (diagnostic, not a gate): Spearman of my window AUC with the scoper's test AUC (P) and with name-company's dev AUC (S).
// FALSIFIERS (from the rule). NON-IE: over the unique non-Indo-European languages of P+S (arb heb mlt cmn lzh jpn kor vie ind tur uig fin est hun eus kat tam tel wol; cmn-hans excluded), eligible n >= 15 and
//   Spearman(FWC32, AUC) <= 0 -> FALSIFIED (reported with n, rho, permutation p, bootstrap CI; if it is positive, rho >= 0.40 and p <= 0.05 is reported as "non-IE gradient confirmed", not required).
//   CLEAN ZONE: (e) share < 0.60 -> FALSIFIED. Pooled P+S (52 unique languages) and IE-only, Slavic-only (rus pol ukr ces slk hrv srp slv bul) subsets are reported as scope maps, no gate. X: per treebank, in scope
//   (FWC32 >= 0.2378) predicted audible (AUC >= 0.60), out of scope predicted not audible; hits counted, no gate (n tiny); a treebank with < 60 pairs is thin.
// VERDICT (mechanical). VOID: K1 breach or < 12 eligible in P. NOT_CONFIRMED: (a) fails, or a falsifier fires, or (c-in-scope share < 0.70 and (d) fails). CONFIRMED: not NOT_CONFIRMED, and (a)-(f) all hold, K2 valid, K3 and
//   K4 pass. PARTIAL: everything else, and then the narrower scope that DID hold is stated from the pre-fixed cuts: FWC32 >= 0.28 only; IE only; probe-only (S2 failing); by zone <0.20, 0.20-0.24, 0.24-0.28, >= 0.28.
// BLIND-ISH PREDICTIONS (not blind at language level, see disclosure). P: rho +0.70 (0.55-0.85), skill 0.20 (0.05-0.30), in-scope audible share 0.80, out-of-scope 0.25, diff +0.09, clean-zone share 0.80, S2 in-scope mean
//   0.585 and share > 0.5 about 0.9. K3: shuffled in-scope mean 0.54, real - shuffled 0.08. Non-IE: rho +0.45, n about 16, P(rho > 0) 0.9, P(rho >= 0.40 and p <= 0.05) 0.45. X: en_pud audible (0.8), grc_proiel audible
//   (0.55, the Greek article is the ell worry), la out of scope not audible (0.7), sa_ufal not audible (0.7). P(CONFIRMED) 0.40, P(PARTIAL) 0.45, P(NOT_CONFIRMED) 0.15.
// NOT TESTED: new treebanks/languages beyond X; chat (see irc-boundary.mjs, its own header); a mechanism for FWC32; any written-register contrast within UD; LATER stratum (R2 is another rule); RIGHT/BOTH arms.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, LAW, UD, round, mean, share, headerSha, readConllu, describe, docFrom, shuffleDoc, pairsOf, rngFor, seedFor, cvAuc, pairSwapNull, SCORES, pairedAuc, spearman, partialSpearman, permRho, bootRho, rmse, mulberry, shuffleIn } from "./lib.mjs";
import { EXTRA } from "./avail.mjs";
const NEW = "afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol".split(" ");
const OLD = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const NONIE = new Set("arb heb mlt cmn lzh jpn kor vie ind tur uig fin est hun eus kat tam tel wol".split(" ")), SLAV = new Set("rus pol ukr ces slk hrv srp slv bul".split(" ")), DUP = new Set(["cmn-hans"]);
const T = 0.2378, DEVMEAN = 0.62359, MODEL = (f) => 0.623591 + (0.038715 * (f - 0.303335)) / 0.10758, B_SWAP = 50, inBand = (x) => x >= 0.45 && x <= 0.55;
const hmSE = (A, n) => { const Q1 = A / (2 - A), Q2 = (2 * A * A) / (1 + A); return Math.sqrt((A * (1 - A) + (n - 1) * (Q1 - A * A) + (n - 1) * (Q2 - A * A)) / (n * n)); };
const q = (xs, p) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] : null; };
function rowOf(name, sents, upos, meta = {}) {
  const d = describe(sents), doc = docFrom(name, sents, upos), pr = pairsOf(doc, "FIRST", rngFor(seedFor("confirm-R1", name, "pairs")));
  const row = { name, ...meta, fwc32: round(d.fwc32), fwc8: round(d.fwc8), fwc16: round(d.fwc16), fwc64: round(d.fwc64), fwc128: round(d.fwc128), tokens: d.tokens, sentences: d.sentences, ttr: round(d.ttr), hapaxTokenShare: round(d.hapaxTokenShare), meanSentLen: round(d.meanSentLen), pairs: pr.pairs, dropped: pr.dropped, thin: pr.pairs < 60 };
  if (row.thin) return row;
  row.auc = round(cvAuc(pr.rows, "LEFT")); row.position = round(cvAuc(pr.rows, "POSITION")); row.se = round(hmSE(row.auc, pr.pairs));
  for (const [k, fn] of Object.entries(SCORES)) row[k] = round(pairedAuc(pr.rows, fn));
  const nl = pairSwapNull(pr.rows, "LEFT", B_SWAP, rngFor(seedFor("confirm-R1", name, "swap")));
  row.swap = { B: nl.length, mean: round(mean(nl)), q95: round(q(nl, 0.95)), max: round(Math.max(...nl)), pge: round((1 + nl.filter((x) => x >= row.auc).length) / (nl.length + 1)) };
  const sd = shuffleDoc(name, sents, upos, rngFor(seedFor("confirm-R1", name, "shuffle"))), ps = pairsOf(sd, "FIRST", rngFor(seedFor("confirm-R1", name, "shuffle-pairs")));
  row.shuf = { pairs: ps.pairs, thin: ps.pairs < 60 }; if (!row.shuf.thin) { row.shuf.auc = round(cvAuc(ps.rows, "LEFT")); row.shuf.position = round(cvAuc(ps.rows, "POSITION")); row.shuf.S2 = round(pairedAuc(ps.rows, SCORES.S2)); }
  return row;
}
const windowOf = (stem) => JSON.parse(fs.readFileSync(path.join(HERE, "windows", stem + ".json"), "utf8"));
const [mode, a1, a2, a3, a4] = process.argv.slice(2);
if (mode === "sanity") {
  const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), res = [];
  for (const s of ["eng", "fra"]) { const { sents, upos } = readConllu(`${UD}/${s}/dev.conllu`), doc = docFrom(s, sents, upos), r = rngFor(seedFor("name-company", s)); pairsOf(doc, "LATER", r); const F = pairsOf(doc, "FIRST", r), a = cvAuc(F.rows, "LEFT"), p = cvAuc(F.rows, "POSITION");
    res.push({ check: "own.json dev " + s, mine: round(a), ref: own[s].FIRST.LEFT, pos: round(p), refPos: own[s].FIRST.POSITION, ok: Math.abs(a - own[s].FIRST.LEFT) < 0.0015 && Math.abs(p - own[s].FIRST.POSITION) < 0.0015 }); }
  const sc = JSON.parse(fs.readFileSync(path.join(HERE, "..", "company-moderators/results/confirm.new.test.json"), "utf8")).rows;
  for (const s of ["dan", "cat"]) { const { sents, upos } = readConllu(`${UD}/${s}/test.conllu`), doc = docFrom(s, sents, upos), r = rngFor(seedFor("company-moderators", s, "test")); pairsOf(doc, "LATER", r); const F = pairsOf(doc, "FIRST", r), a = cvAuc(F.rows, "LEFT"), ref = sc.find((x) => x.stem === s).FIRST;
    res.push({ check: "scoper test " + s, mine: round(a), ref: ref.auc, pairs: F.pairs, refPairs: ref.pairs, ok: Math.abs(a - ref.auc) < 0.0015 && F.pairs === ref.pairs }); }
  console.log(JSON.stringify(res)); process.exit(res.every((x) => x.ok) ? 0 : 3);
}
if (mode === "collect") {
  const R = { headerSha256: headerSha(import.meta.url), set: a1, rows: [] }, items = [];
  if (a1 === "new" || a1 === "old") for (const s of a1 === "new" ? NEW : OLD) { const w = windowOf(s); items.push([s, w.sents, w.upos, { set: a1, taken: w.taken, trainSentences: w.trainSentences }]); }
  else if (a1 === "extra") for (const [name, file, lang] of EXTRA) { const { sents, upos } = readConllu(file); items.push([name, sents, upos, { set: "extra", lang }]); } else throw new Error("collect new|old|extra");
  for (const [name, sents, upos, meta] of items) { try { const r = rowOf(name, sents, upos, meta); R.rows.push(r); console.error(name, "fwc", r.fwc32, "pairs", r.pairs, r.auc ?? "-", "pos", r.position ?? "-", "shufAuc", r.shuf?.auc ?? "-", "swapMean", r.swap?.mean ?? "-"); } catch (e) { R.rows.push({ name, error: String(e).slice(0, 200) }); console.error(name, "ERROR", String(e).slice(0, 160)); } fs.writeFileSync(a2, JSON.stringify(R)); }
  console.log("collected", a1, R.rows.length);
}
// ── verdict machinery ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const zoneOf = (rows) => [[0, 0.2], [0.2, 0.24], [0.24, 0.28], [0.28, 9]].map(([lo, hi]) => { const z = rows.filter((r) => r.fwc32 >= lo && r.fwc32 < hi); return { zone: `${lo}-${hi === 9 ? "+" : hi}`, n: z.length, audibleShare: round(share(z, (r) => r.auc >= 0.6), 3), meanAuc: round(mean(z.map((r) => r.auc)), 3), meanS2: round(mean(z.map((r) => r.S2)), 3), langs: z.map((r) => `${r.name}:${r.auc}`).join(" ") }; });
function clauses(el) {
  const auc = el.map((r) => r.auc), fw = el.map((r) => r.fwc32); if (el.length < 5) return { n: el.length, note: "too few" };
  const pm = permRho(fw, auc, 5000), ci = bootRho(fw, auc), pred = fw.map(MODEL), rb = rmse(auc.map(() => DEVMEAN), auc), rm = rmse(pred, auc), shift = mean(auc) - mean(pred);
  const big = el.filter((r) => r.pairs >= 250), ins = big.filter((r) => r.fwc32 >= T), outs = big.filter((r) => r.fwc32 < T), cIn = ins.length >= 4 ? share(ins, (r) => r.auc >= 0.6) : null, cOut = outs.length >= 3 ? share(outs, (r) => r.auc >= 0.6) : null;
  const inA = el.filter((r) => r.fwc32 >= T), outA = el.filter((r) => r.fwc32 < T), diff = inA.length >= 3 && outA.length >= 3 ? mean(inA.map((r) => r.auc)) - mean(outA.map((r) => r.auc)) : null;
  const z28 = el.filter((r) => r.fwc32 >= 0.28), z24 = el.filter((r) => r.fwc32 < 0.24), eShare = z28.length >= 4 ? share(z28, (r) => r.auc >= 0.6) : null, S = {};
  for (const k of ["S1", "S2", "S3"]) { const mi = inA.length ? mean(inA.map((r) => r[k])) : null, mo = outA.length ? mean(outA.map((r) => r[k])) : null; S[k] = { nIn: inA.length, nOut: outA.length, inMean: round(mi), outMean: round(mo), diff: round(mi != null && mo != null ? mi - mo : null), inShareAbove50: round(share(inA, (r) => r[k] > 0.5)), allMean: round(mean(el.map((r) => r[k]))) }; }
  const s2 = S.S2, F = s2.nIn >= 4 && s2.nOut >= 3 ? s2.inMean >= 0.55 && s2.inShareAbove50 >= 0.75 && s2.diff >= 0.02 : null;
  const A = pm.rho >= 0.4 && pm.p <= 0.05, Bc = 1 - rm / rb >= 0.1, C = cIn != null && cIn >= 0.7 && (cOut == null || cOut <= 0.5), D = diff != null && diff >= 0.04, E = eShare != null && eShare >= 0.7;
  return { n: el.length, a_rho: { rho: round(pm.rho, 3), p: round(pm.p, 4), ci95: ci.map((x) => round(x, 3)), pass: A }, b_skill: { skill: round(1 - rm / rb), rmseModel: round(rm), rmseBaseline: round(rb), meanShift: round(shift), pass: Bc },
    c_scope: { inN: ins.length, inShareAudible: round(cIn), outN: outs.length, outShareAudible: round(cOut), pass: C }, d_sep: { nIn: inA.length, nOut: outA.length, inMean: round(mean(inA.map((r) => r.auc))), outMean: round(mean(outA.map((r) => r.auc))), diff: round(diff), pass: D },
    e_zone28: { n: z28.length, shareAudible: round(eShare), pass: E, falsified: eShare != null && eShare < 0.6 }, below24: { n: z24.length, shareAudible: round(share(z24, (r) => r.auc >= 0.6)) }, f_S2: { ...s2, pass: F }, fixedScores: S,
    meanAuc: round(mean(auc)), shareAudible: round(share(el, (r) => r.auc >= 0.6)), zones: zoneOf(el), gates: { A, B: Bc, C, D, E, F } };
}
function controls(el) {
  const sw = el.filter((r) => r.swap), aud = sw.filter((r) => r.auc >= 0.6), k2b = aud.length ? share(aud, (r) => r.auc > r.swap.q95) : null, swm = mean(sw.map((r) => r.swap.mean));
  const K2 = { nullMeanOfMeans: round(swm), nAudible: aud.length, audibleAboveQ95: round(k2b), realAbovePermMax: round(share(sw, (r) => r.auc > r.swap.max)), valid: swm >= 0.48 && swm <= 0.52 && k2b != null && k2b >= 0.9 };
  const sh = el.filter((r) => r.shuf && !r.shuf.thin && inBand(r.shuf.position)), shIn = sh.filter((r) => r.fwc32 >= T), shOut = sh.filter((r) => r.fwc32 < T), dI = mean(shIn.map((r) => r.auc - r.shuf.auc)), sI = mean(shIn.map((r) => r.shuf.auc));
  const K3 = { nValid: sh.length, nVoid: el.length - sh.length, inN: shIn.length, inRealMean: round(mean(shIn.map((r) => r.auc))), inShufMean: round(sI), inDiff: round(dI), outN: shOut.length, outRealMean: round(mean(shOut.map((r) => r.auc))), outShufMean: round(mean(shOut.map((r) => r.shuf.auc))), allShufMean: round(mean(sh.map((r) => r.shuf.auc))), shufAbove056: sh.filter((r) => r.shuf.auc > 0.56).map((r) => `${r.name}:${r.shuf.auc}`), pass: shIn.length >= 4 && dI >= 0.04 && sI <= 0.56 };
  const auc = el.map((r) => r.auc), fw = el.map((r) => r.fwc32), rho = spearman(fw, auc), lp = el.map((r) => Math.log2(r.pairs)), D = { log2pairs: spearman(lp, auc), log2tokens: spearman(el.map((r) => Math.log2(r.tokens)), auc), meanSentLen: spearman(el.map((r) => r.meanSentLen), auc), ttr: spearman(el.map((r) => r.ttr), auc), hapaxTokenShare: spearman(el.map((r) => r.hapaxTokenShare), auc), fwc8: spearman(el.map((r) => r.fwc8), auc), fwc16: spearman(el.map((r) => r.fwc16), auc), fwc64: spearman(el.map((r) => r.fwc64), auc), fwc128: spearman(el.map((r) => r.fwc128), auc), randomPermOfFwc32: spearman(shuffleIn(fw.slice(), mulberry(99)), auc) };
  const part = partialSpearman(fw, auc, lp), K4 = { rhoFwc32: round(rho, 3), partialGivenLog2Pairs: round(part, 3), decoys: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, round(v, 3)])), pass: part >= 0.3 && ["log2pairs", "log2tokens", "meanSentLen"].every((k) => Math.abs(D[k]) <= rho - 0.1) };
  return { K2, K3, K4 };
}
const eligOf = (rows) => { const live = rows.filter((r) => !r.error && !r.thin && !DUP.has(r.name)); return { live, el: live.filter((r) => inBand(r.position)), voided: live.filter((r) => !inBand(r.position)).map((r) => `${r.name}:${r.position}`), thin: rows.filter((r) => r.thin).map((r) => r.name) }; };
const subsetRho = (el, f) => { const z = el.filter(f); if (z.length < 5) return { n: z.length, note: "n<5" }; const pm = permRho(z.map((r) => r.fwc32), z.map((r) => r.auc), 5000); return { n: z.length, rho: round(pm.rho, 3), p: round(pm.p, 4), ci95: bootRho(z.map((r) => r.fwc32), z.map((r) => r.auc)).map((x) => round(x, 3)), meanAuc: round(mean(z.map((r) => r.auc))), audibleShare: round(share(z, (r) => r.auc >= 0.6)) }; };
if (mode === "verdict") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), NR = rd(a1), OR = rd(a2), XR = rd(a3), V = { headerSha256: headerSha(import.meta.url) };
  const P = eligOf(NR.rows), S = eligOf(OR.rows), pool = [...P.el, ...S.el], rowsOut = (el) => el.slice().sort((x, y) => x.fwc32 - y.fwc32).map((r) => ({ name: r.name, fwc32: r.fwc32, pairs: r.pairs, auc: r.auc, se: r.se, pos: r.position, inScope: r.fwc32 >= T, audible: r.auc >= 0.6, pred: round(MODEL(r.fwc32)), S2: r.S2, shufAuc: r.shuf?.auc, swapQ95: r.swap?.q95 }));
  V.primary = { ...P, nRows: NR.rows.length, voidedShare: round(P.voided.length / Math.max(1, P.live.length)), clauses: clauses(P.el), controls: controls(P.el), rows: rowsOut(P.el) };
  V.secondary = { ...S, voidedShare: round(S.voided.length / Math.max(1, S.live.length)), clauses: clauses(S.el), controls: controls(S.el), rows: rowsOut(S.el) };
  V.pooled = { n: pool.length, clauses: clauses(pool), zonesPrimary: zoneOf(P.el), zonesSecondary: zoneOf(S.el), zonesPooled: zoneOf(pool), IE: subsetRho(pool, (r) => !NONIE.has(r.name)), nonIE: subsetRho(pool, (r) => NONIE.has(r.name)), slavic: subsetRho(pool, (r) => SLAV.has(r.name)),
    nonIE_P_only: subsetRho(P.el, (r) => NONIE.has(r.name)), IE_P_only: subsetRho(P.el, (r) => !NONIE.has(r.name)), nonIE_langs: pool.filter((r) => NONIE.has(r.name)).map((r) => `${r.name}:${r.fwc32}/${r.auc}`).join(" ") };
  const own = rd(path.join(LAW, "results/name-company-pairblocks/own.json")), sc = rd(path.join(HERE, "..", "company-moderators/results/confirm.verdict.json")).primary.FIRST.rows;
  const rel = (els, ref) => { const xs = els.filter((r) => ref(r.name) != null); return xs.length >= 5 ? { n: xs.length, spearman: round(spearman(xs.map((r) => r.auc), xs.map((r) => ref(r.name))), 3), meanMine: round(mean(xs.map((r) => r.auc))), meanRef: round(mean(xs.map((r) => ref(r.name)))) } : { n: xs.length }; };
  V.K5_reliability = { P_vs_scoperTest: rel(P.el, (n) => sc.find((x) => x.stem === n)?.auc ?? null), S_vs_nameCompanyDev: rel(S.el, (n) => (own[n] && !own[n].FIRST.thin ? own[n].FIRST.LEFT : null)) };
  V.extra = XR.rows.map((r) => r.error ? r : ({ name: r.name, lang: r.lang, fwc32: r.fwc32, pairs: r.pairs, thin: r.thin, auc: r.auc, se: r.se, pos: r.position, posInBand: r.position != null ? inBand(r.position) : null, S2: r.S2, shufAuc: r.shuf?.auc, inScope: r.fwc32 >= T, predictedAudible: r.fwc32 >= T, audible: r.auc != null ? r.auc >= 0.6 : null, hit: r.auc != null && inBand(r.position) ? (r.auc >= 0.6) === (r.fwc32 >= T) : null }));
  // mechanical verdict
  const c = V.primary.clauses, k = V.primary.controls, ni = V.pooled.nonIE, g = c.gates ?? {}, falsifiers = [];
  if (c.e_zone28?.falsified) falsifiers.push(`clean zone: ${c.e_zone28.shareAudible} audible < 0.60 (n ${c.e_zone28.n})`);
  if (ni.n >= 15 && ni.rho <= 0) falsifiers.push(`non-IE rho ${ni.rho} <= 0 at n ${ni.n}`);
  const void_ = V.primary.voidedShare > 0.3 || P.el.length < 12, cInLow = c.c_scope?.inShareAudible != null && c.c_scope.inShareAudible < 0.7;
  const notConf = !void_ && (!g.A || falsifiers.length > 0 || (cInLow && !g.D)), allGates = g.A && g.B && g.C && g.D && g.E && g.F === true, ctl = k.K2.valid && k.K3.pass && k.K4.pass;
  V.verdict = void_ ? "VOID" : notConf ? "NOT_CONFIRMED" : allGates && ctl ? "CONFIRMED" : "PARTIAL";
  V.why = { void_, falsifiers, gates: g, controls: { K2: k.K2.valid, K3: k.K3.pass, K4: k.K4.pass }, nonIE: ni };
  fs.writeFileSync(a4, JSON.stringify(V, null, 1));
  console.log(JSON.stringify({ verdict: V.verdict, why: V.why, primary: { eligible: P.el.length, thin: P.thin, voided: P.voided, clauses: { a: c.a_rho, b: c.b_skill, c: c.c_scope, d: c.d_sep, e: c.e_zone28, f: c.f_S2 }, controls: k }, secondary: { eligible: S.el.length, a: V.secondary.clauses.a_rho, d: V.secondary.clauses.d_sep, e: V.secondary.clauses.e_zone28 }, pooled: { all: V.pooled.clauses.a_rho, IE: V.pooled.IE, nonIE: ni, slavic: V.pooled.slavic, zones: V.pooled.zonesPooled.map((z) => `${z.zone} n${z.n} aud${z.audibleShare} m${z.meanAuc}`) }, K5: V.K5_reliability, extra: V.extra.map((x) => `${x.name} fwc${x.fwc32} n${x.pairs} auc${x.auc} hit${x.hit}`) }, null, 1));
}
