// confirm.mjs: CONFIRMATION of candidate rule R2-later-both-fwc32 on UNTOUCHED text.   modes:  sanity | lang STEM | verdict
//   (always run with NAME_COMPANY_PAIRBLOCK=1; never pass "run" as the first argument of name-company.mjs; this script is not name-company.mjs)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// RULE UNDER TEST (frozen; written by the scoper "company-moderators" from dev data, then run once by the scoper on UD test.conllu).
//   R2: "In written treebank text (probe = BOTH arm: the frequency-rank bins of the two left and two right neighbours, 4 x 13 one-hot, ridge-logistic, leave-sentence-quartile-out CV, matched pairs PROPN vs NOUN/VERB/ADJ occurrence,
//   LATER stratum = every non-first occurrence of a form), FWC32 >= 0.2795 and >= 250 matched pairs implies AUC >= 0.60; FWC32 < 0.20 implies not audible; 0.20-0.28 is mixed (isolating cmn/cmn-hans/ind/vie audible at 0.22-0.26)."
//   FWC32 = share of stream tokens whose form is among the 32 commonest forms of the stream (lowercase, punctuation dropped; label-free). FROZEN graded form (dev, 22 stems; results of the scoper's frozen.dev.json):
//   AUC_hat = 0.615373 + 0.037707 (FWC32 - 0.313932) / 0.09705 + 0.033284 (log2 pairs - 8.195517) / 1.071844 ; dev mean 0.61537 ; FWC32-only dev model w = [0.615373, 0.043367] on z(FWC32) with mu 0.313932, s 0.09705.
// DISCLOSURE (everything seen before this header; stated so that nothing below can be mistaken for blind where it is not).
//   SEEN: the rule JSON; the scoper's code (company-moderators/confirm.mjs, util.mjs, stats.mjs, zones.mjs) and RESULTS: dev own-language AUC of 22 stems (name-company own.json), and the scoper's single run on UD test.conllu of 28 NEW and 25 OLD stems
//     (results/confirm.verdict.json, confirm.new.test.json, confirm.old.test.json, zones.out): per-language FWC32, pairs, AUC, position control, frozen-model prediction. So the TEST splits of all 53 stems are NOT untouched for this rule
//     (the task text says they are; they are not) and are NOT used here. The rule's own "next" step (dev.conllu of the 28 new languages) is not used either: a sibling lens (family-vs-relatedness) pre-registered own-language company probes on DEV of
//     the 52-language roster (I have not read its results), so dev of the new languages is not clean for a company probe.
//   SEEN, label-free design probe (design-probe.mjs, no AUC, no company feature): sentences, tokens, PROPN/NOUN/VERB/ADJ counts and FWC32 of the train/dev/test files of be_hse is_icepahc la_proiel grc_proiel got_proiel cu_proiel sa_vedic
//     cop_scriptorium fo_farpahc kk_ktb yo_ytb. sa_vedic has no PROPN at all and is dropped (no gold). The FWC32 of the fresh languages was therefore seen (be 0.205, is 0.362, la 0.274, grc 0.313, got 0.329, cu 0.252, cop 0.545,
//     fo 0.461, kk test 0.126, yo test 0.422); their AUCs were not. prep-windows.mjs (data preparation, run before this header) computed only offsets, token counts and a text sha256 for the windows of windows.json.
//   NOT SEEN: any company feature, pair or AUC of any train window or of the fresh treebanks; the sibling lens's results; the sibling R1 confirmation's results (only the offsets of its data windows are read, to keep my windows disjoint from its).
// DATA (never opened by any company/name test; no khora script references these paths for a name question):
//   SET A (fresh LANGUAGES, never in any of the 53 stems): be is la grc got chu cop fao kaz yor from /Users/mlacy/Documents/EO Testing/EO Embedding testing/data/ud (train split; kk_ktb and yo_ytb: their test file, the only usable one).
//   SET B (the scoper's 28 NEW stems; their TEST was used by the scoper) and SET C (the 24 OLD stems, cmn-hans dropped as the same corpus as cmn; their DEV fitted the frozen model): TRAIN splits from /private/tmp/claude-501/tb/<stem>/train.conllu,
//     which is the training part of the same treebank as ud-eval/<stem>/{dev,test}.conllu (kor: tb/kor-gsd); tb train was read by impact.mjs, window-prims.mjs and corpus.mjs for other law questions (exposure counts), never for a company or name AUC. Sentences that also occur (same punctuation-dropped form sequence) in that stem's ud-eval dev or test are removed.
//   WINDOW: ONE contiguous window of >= 20,000 tokens per language (sentences added until reached), seeded start, disjoint from the sibling R1 confirmation's window of the same stem (windows.json holds offsets, sizes, text sha256, reduced/overlap flags;
//     a window with < 20,000 tokens is "reduced"). Pipeline = name-company's own: pairsOf(doc, "LATER", rng, 600) with NAME_COMPANY_PAIRBLOCK=1, seeded rngFor(seedFor("confirm-R2", stem, "pairs")), BOTH arm, ridge-logistic, 4 sentence-quartile blocks,
//     leave-block-out CV. Gold UPOS selects and evaluates only; no learner feature uses a capital, POS, list, label or speaker. A language-stratum with < 60 pairs is THIN and excluded from every count.
//   SANITY GATE: mode sanity recomputes dev eng and fra LATER with name-company's own seeds and must reproduce own.json BOTH and POSITION to within 0.0015, else the whole run is invalid.
// SETS. PRIMARY = A union B (languages the frozen model was never fitted on; text never evaluated by anything). SECONDARY = C (dev-fitted languages, new text). POOLED = A, B and C (descriptive and the pooled sufficient-condition test).
// ELIGIBLE language = pairs >= 60 AND POSITION arm (matched out, same CV) in [0.45, 0.55] (else VOID for that language, counted and listed). Fewer than 8 eligible in PRIMARY => the rule is VOID. "Audible" = AUC >= 0.60.
// IN-SCOPE = FWC32 >= 0.2795 AND pairs >= 250 (eligible); OUT-OF-SCOPE = FWC32 < 0.2795 AND pairs >= 250 (eligible). (Where clause (a), (b) and (d) say "eligible" they use all eligible languages, any pair count.)
// PASSIF (from the rule; thresholds are NOT loosened), evaluated on PRIMARY:
//   (a) DIRECTION: Spearman(FWC32, AUC) >= +0.40 and one-sided permutation p <= 0.05 (4000 permutations of the AUC vector).
//   (b) FROZEN SKILL: 1 - RMSE(frozen graded form with the language's own pair count, AUC) / RMSE(constant 0.61537, AUC) >= 0.10.
//   (c) SCOPE HIT RATE: in-scope audible share >= 0.70 (needs >= 4 in-scope languages) AND out-of-scope audible share <= 0.50 (needs >= 3 out-of-scope languages); if either count is short clause (c) is NOT EVALUABLE and the rule cannot PASS.
//   (d) SEPARATION: mean AUC of in-scope-by-FWC32 (FWC32 >= 0.2795, any pair count) minus mean AUC of the rest >= 0.04 (needs >= 3 each side).
//   (e) CONTROLS valid (added by me; PASS needs them): (e1) per-language position control in band (a language outside the band is void); (e2) PAIR-FLIP PERMUTATION NULL: 5 draws per eligible language (labels swapped within matched pairs, same CV): pooled null mean in
//       [0.47, 0.53] and <= 2% of null draws >= 0.60; (e3) COMPANY SHUFFLE: the same pipeline on a within-sentence-shuffled stream (company destroyed, sentence composition kept): among eligible languages with real AUC >= 0.60, >= 80% have shuffled BOTH AUC <= 0.55.
//   VERDICT TIERS (fixed now). FULL = (a)(b)(c)(d)(e) all hold  -> CONFIRMED. SUFFICIENT-CONDITION TIER (SC) = not FULL, but: PRIMARY in-scope audible share >= 0.70 with >= 4 in-scope languages, AND POOLED in-scope audible share >= 0.70 with the
//   95% Wilson lower bound > 0.50, AND (e) holds  -> PARTIAL (scope = the sufficient condition only; the threshold, the gradient and the out-of-scope side are then reported with their numbers as not confirmed). Anything else -> NOT_CONFIRMED
//   (VOID if < 8 eligible). The SC claim is FALSIFIED if the PRIMARY in-scope audible share is < 0.60 (>= 4 in-scope languages), the rule's own failIf.
// SUB-CLAIMS (reported with their own pass/fail; they cannot change the tier):
//   ISO: cmn, ind, vie (isolating, FWC32 0.22-0.26 in discovery) are each audible on new text (all eligible ones >= 0.60; needs >= 2 eligible).   LOW: eligible languages with FWC32 < 0.20 and >= 60 pairs: audible share <= 0.25 (POOLED).
//   GRADED: refit AUC ~ z(FWC32) + z(log2 pairs) (dev scalers) on PRIMARY and on POOLED; PASS iff the language-bootstrap 95% CI (B = 2000) of the FWC32 slope per dev-SD excludes 0 and its point estimate >= 0.020 (dev: 0.0377); the pair-count slope is reported.
//   EQ250 (pair-count confound control): every language with >= 250 pairs re-scored on 3 seeded subsamples of exactly 250 pairs (mean AUC): Spearman(FWC32, AUC250) >= +0.30 with one-sided p <= 0.05 on PRIMARY, and on POOLED; also the in/out audible shares at 250 pairs.
//   ADDS-BEYOND-PAIRS: skill of the frozen graded form minus skill of a pairs-only model (OLS on the 22 dev languages, frozen) >= 0.03; and partial Spearman (FWC32, AUC | log2 pairs) reported.
//   ZONES (descriptive): FWC32 < 0.20 | 0.20-0.2795 | >= 0.2795 : n, audible share, mean AUC, for PRIMARY, SECONDARY, POOLED and by set A, B, C; with and without the >= 250 pair filter. RELIABILITY (descriptive): Spearman(train-window AUC, scoper test AUC) over B and C.
// BLIND NUMERIC PREDICTIONS (my priors; caveat: for sets B and C the language-level test AUCs were seen, so only aggregates and set A are blind).
//   PRIMARY: eligible n 28-34; in-scope audible share 0.75 (plausible 0.60-0.90); out-of-scope audible share 0.40 (0.25-0.60); rho 0.45 (0.30-0.60); frozen skill 0.12 (0.00-0.25); separation +0.05; in-scope mean AUC 0.635, out-of-scope 0.575.
//   P(FULL) 0.30; P(SC tier i.e. PARTIAL) 0.40; P(NOT_CONFIRMED) 0.30. SECONDARY (C): in-scope share 0.85, out-of-scope 0.60; ISO: cmn and ind audible (0.60 each), vie 0.50. Set A (fresh): of is grc got cop fao (in-scope by FWC32) at least 60% of those with >= 250
//   pairs are audible; of be la cu kaz (out-of-scope) at least 60% are not audible or thin. Controls: >= 90% of audible languages have shuffled BOTH <= 0.55; null mean 0.50 +/- 0.01. EQ250 rho >= 0.30 with probability 0.55. ADDS-BEYOND-PAIRS passes with probability 0.60.
// REGISTERED CAVEATS. The B languages include relatives of each other and of C languages (Romance, Slavic, Germanic, Celtic), so effective n is below the language count. FWC32 stands for a bundle (analytic morphology, tokenisation, treebank genre), not a mechanism.
//   Set A is mostly PROIEL-style ancient or historical text (Latin, Greek, Gothic, Old Church Slavonic, Old Icelandic/Faroese) plus Coptic and modern Belarusian: written text but a different register from news/web treebanks; treat A as a stress test, and report A alone.
//   Train windows may differ in genre from dev/test; the pipeline is a fitted existence-test probe, not a production rule. Not tested: chat (IRC), the FIRST stratum, other arms, fixed scores, pair counts < 250 as scope, other probes.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, LAW, UD, round, mean, sd, share, quantile, headerSha, readConllu, fwcK, tokensOf, docFrom, shuffleDoc, pairsOf, cvAuc, pairFlipY, subsamplePairs, rngFor, seedFor, spearman, permRho, rmse, wilson, ols, mulberry, shuffleIn, ranks, pearson } from "./lib.mjs";
import { udDoc } from "../../name-company.mjs";
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1");
const ROWS = path.join(HERE, "results", "rows"); fs.mkdirSync(ROWS, { recursive: true });
const TSCOPE = 0.2795, DEVMEAN = 0.61537, NULLDRAWS = 5, EQN = 250, EQDRAWS = 3, AUDIBLE = 0.6;
const MODEL = (fwc, pairs) => 0.615373 + (0.037707 * (fwc - 0.313932)) / 0.09705 + (0.033284 * (Math.log2(pairs) - 8.195517)) / 1.071844;
const W = JSON.parse(fs.readFileSync(path.join(HERE, "windows.json"), "utf8"));
const dupKeys = (stem) => { const s = new Set(); for (const sp of ["dev", "test"]) for (const x of readConllu(path.join(UD, stem, sp + ".conllu")).sents) s.add(x.join(" ")); return s; };
function loadWindow(stem) {
  const w = W[stem]; if (!w || w.error) throw new Error("no window for " + stem);
  const t = readConllu(w.source), sents = t.sents.slice(w.offset, w.offset + w.taken), upos = t.upos.slice(w.offset, w.offset + w.taken);
  if (w.set === "A") return { sents, upos, w };
  const D = dupKeys(stem), keep = sents.map((x) => !D.has(x.join(" ")));
  return { sents: sents.filter((_, i) => keep[i]), upos: upos.filter((_, i) => keep[i]), w };
}
const hmSE = (A, n1, n2) => { const Q1 = A / (2 - A), Q2 = (2 * A * A) / (1 + A); return Math.sqrt((A * (1 - A) + (n1 - 1) * (Q1 - A * A) + (n2 - 1) * (Q2 - A * A)) / (n1 * n2)); };
function rowFor(stem) {
  const { sents, upos, w } = loadWindow(stem), fwc = fwcK(sents, 32), doc = docFrom(stem, sents, upos), pr = pairsOf(doc, "LATER", rngFor(seedFor("confirm-R2", stem, "pairs")));
  const row = { stem, set: w.set, headerSha256: headerSha(import.meta.url), window: { source: w.source, offset: w.offset, taken: w.taken, reduced: !!w.reduced, overlapsR1: !!w.overlapsR1, textSha256: w.textSha256 }, fwc32: round(fwc), tokens: tokensOf(sents), sentences: sents.length, pairs: pr.pairs, dropped: pr.dropped, thin: pr.pairs < 60 };
  if (row.thin) return row;
  row.auc = round(cvAuc(pr.rows, "BOTH")); row.position = round(cvAuc(pr.rows, "POSITION")); row.pred = round(MODEL(fwc, pr.pairs)); row.se = round(hmSE(row.auc, pr.pairs, pr.pairs));
  row.nullAuc = []; for (let k = 0; k < NULLDRAWS; k++) row.nullAuc.push(round(cvAuc(pr.rows, "BOTH", pairFlipY(pr.rows, rngFor(seedFor("confirm-R2", stem, "perm", k))))));
  const sh = pairsOf(shuffleDoc(stem, sents, upos, rngFor(seedFor("confirm-R2", stem, "shuffle"))), "LATER", rngFor(seedFor("confirm-R2", stem, "shufpairs")));
  row.shuffle = { pairs: sh.pairs, auc: sh.pairs >= 60 ? round(cvAuc(sh.rows, "BOTH")) : null, position: sh.pairs >= 60 ? round(cvAuc(sh.rows, "POSITION")) : null };
  if (pr.pairs >= EQN) { const a = []; for (let d = 0; d < EQDRAWS; d++) a.push(cvAuc(subsamplePairs(pr.rows, EQN, rngFor(seedFor("confirm-R2", stem, "eq", d))), "BOTH")); row.eq250 = { auc: round(mean(a)), draws: a.map((x) => round(x)) }; }
  return row;
}
const [mode, ...rest] = process.argv.slice(2);
if (mode === "sanity") { // dev only: reproduce name-company's own.json for two languages with its own seeds and my cvAuc
  const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), res = [];
  for (const s of ["eng", "fra"]) { const pr = pairsOf(udDoc(s), "LATER", rngFor(seedFor("name-company", s))), a = cvAuc(pr.rows, "BOTH"), p = cvAuc(pr.rows, "POSITION");
    res.push({ stem: s, mine: round(a), own: own[s].LATER.BOTH, positionMine: round(p), positionOwn: own[s].LATER.POSITION, ok: Math.abs(a - own[s].LATER.BOTH) < 0.0015 && Math.abs(p - own[s].LATER.POSITION) < 0.0015 }); }
  const out = { headerSha256: headerSha(import.meta.url), res, valid: res.every((x) => x.ok) }; fs.writeFileSync(path.join(HERE, "results", "sanity.json"), JSON.stringify(out)); console.log(JSON.stringify(out)); process.exit(out.valid ? 0 : 3);
}
if (mode === "lang") {
  for (const stem of rest) { const f = path.join(ROWS, stem + ".json"); if (fs.existsSync(f)) { console.error(stem, "exists, skipped"); continue; }
    const t0 = Date.now(); try { const row = rowFor(stem); row.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(f, JSON.stringify(row)); console.error(stem, row.set, "fwc", row.fwc32, "tokens", row.tokens, "pairs", row.pairs, row.thin ? "THIN" : `auc ${row.auc} pos ${row.position} shuf ${row.shuffle.auc} eq ${row.eq250?.auc ?? "-"} null ${row.nullAuc.join("/")}`, row.seconds + "s"); }
    catch (e) { console.error(stem, "ERROR", String(e).slice(0, 200)); fs.writeFileSync(f + ".error", String(e.stack ?? e)); } }
}
// ── verdict ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const elig = (r) => !r.thin && r.position >= 0.45 && r.position <= 0.55;
const Z = (fwc, lp) => [(fwc - 0.313932) / 0.09705, (lp - 8.195517) / 1.071844];
const zoneOf = (rs, lo, hi) => { const z = rs.filter((r) => r.fwc32 >= lo && r.fwc32 < hi); return { n: z.length, audibleShare: round(share(z, (r) => r.auc >= AUDIBLE), 3), meanAuc: round(mean(z.map((r) => r.auc))) }; };
function zones(rs) { const out = {}; for (const [name, f] of [["all", () => true], ["pairs>=250", (r) => r.pairs >= 250]]) { const q = rs.filter(f); out[name] = { "<0.20": zoneOf(q, 0, 0.2), "0.20-0.2795": zoneOf(q, 0.2, TSCOPE), ">=0.2795": zoneOf(q, TSCOPE, 9) }; } return out; }
function bootSlope(rs, B = 2000, seed = 777) { // language bootstrap of the OLS coefficient on z(FWC32) (dev scalers) in AUC ~ 1 + zF + zP
  const X = rs.map((r) => Z(r.fwc32, Math.log2(r.pairs))), y = rs.map((r) => r.auc), est = ols(X, y), rnd = mulberry(seed), s1 = [], s2 = [];
  for (let b = 0; b < B; b++) { const ix = Array.from({ length: rs.length }, () => Math.floor(rnd() * rs.length)); const Xb = ix.map((i) => X[i]), yb = ix.map((i) => y[i]); if (new Set(Xb.map((x) => x[0])).size < 3) continue; const c = ols(Xb, yb); s1.push(c[1]); s2.push(c[2]); }
  return { intercept: round(est[0]), slopeFwcPerDevSD: round(est[1]), slopePairsPerDevSD: round(est[2]), ciFwc: [round(quantile(s1, 0.025)), round(quantile(s1, 0.975))], ciPairs: [round(quantile(s2, 0.025)), round(quantile(s2, 0.975))], devSlopeFwc: 0.0377, devSlopePairs: 0.0333 };
}
function partialSpearman(fw, au, lp) { const rf = ranks(fw), ra = ranks(au), rp = ranks(lp), res = (a, b) => { const mb = mean(b), ma = mean(a); let sxy = 0, sxx = 0; for (let i = 0; i < a.length; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (b[i] - mb) ** 2; } const k = sxx ? sxy / sxx : 0; return a.map((v, i) => v - ma - k * (b[i] - mb)); }; return pearson(res(rf, rp), res(ra, rp)); }
function evalSet(name, rs, devTab) {
  const live = rs.filter((r) => !r.thin), el = live.filter(elig), voided = live.filter((r) => !elig(r)).map((r) => `${r.stem}:${r.position}`);
  const out = { set: name, languages: rs.length, thin: rs.filter((r) => r.thin).map((r) => `${r.stem}:${r.pairs}`), voidedPosition: voided, eligible: el.length };
  if (el.length < 3) return { ...out, verdict: "VOID", why: "fewer than 3 eligible" };
  const auc = el.map((r) => r.auc), fw = el.map((r) => r.fwc32), lp = el.map((r) => Math.log2(r.pairs)), pm = permRho(fw, auc, 4000), pred = el.map((r) => MODEL(r.fwc32, r.pairs));
  const rb = rmse(auc.map(() => DEVMEAN), auc), rm = rmse(pred, auc), skill = 1 - rm / rb, shift = mean(auc) - mean(pred);
  const fOnly = el.map((r) => 0.615373 + (0.043367 * (r.fwc32 - 0.313932)) / 0.09705), pOnly = el.map((r) => devTab.pairsOnly(r.pairs)), skillF = 1 - rmse(fOnly, auc) / rb, skillP = 1 - rmse(pOnly, auc) / rb;
  const big = el.filter((r) => r.pairs >= 250), ins = big.filter((r) => r.fwc32 >= TSCOPE), outs = big.filter((r) => r.fwc32 < TSCOPE), cIn = ins.length >= 4 ? share(ins, (r) => r.auc >= AUDIBLE) : null, cOut = outs.length >= 3 ? share(outs, (r) => r.auc >= AUDIBLE) : null;
  const insA = el.filter((r) => r.fwc32 >= TSCOPE), outA = el.filter((r) => r.fwc32 < TSCOPE), diff = insA.length >= 3 && outA.length >= 3 ? mean(insA.map((r) => r.auc)) - mean(outA.map((r) => r.auc)) : null;
  const a = pm.rho >= 0.4 && pm.p <= 0.05, b = skill >= 0.1, c = cIn != null && cOut != null && cIn >= 0.7 && cOut <= 0.5, d = diff != null && diff >= 0.04;
  const nulls = el.flatMap((r) => r.nullAuc), e2 = Math.abs(mean(nulls) - 0.5) <= 0.03 && share(nulls, (x) => x >= AUDIBLE) <= 0.02;
  const aud = el.filter((r) => r.auc >= AUDIBLE), shufOk = aud.filter((r) => r.shuffle.auc != null && r.shuffle.auc <= 0.55), e3 = aud.length ? shufOk.length / aud.length >= 0.8 : null;
  const eq = el.filter((r) => r.eq250), eqRho = eq.length >= 5 ? permRho(eq.map((r) => r.fwc32), eq.map((r) => r.eq250.auc), 4000) : null, eqIn = eq.filter((r) => r.fwc32 >= TSCOPE), eqOut = eq.filter((r) => r.fwc32 < TSCOPE);
  const wl = ins.length ? wilson(ins.filter((r) => r.auc >= AUDIBLE).length, ins.length) : [null, null];
  return { ...out, clauses: { a_direction: { rho: round(pm.rho, 3), p: round(pm.p, 4), pass: a }, b_frozenSkill: { skill: round(skill), rmseModel: round(rm), rmseBaseline: round(rb), meanShift: round(shift), pass: b },
      c_scopeHit: { inScopeN: ins.length, inScopeAudibleShare: round(cIn), inScopeWilson95: wl.map((x) => round(x, 3)), outScopeN: outs.length, outScopeAudibleShare: round(cOut), pass: c },
      d_separation: { nIn: insA.length, nOut: outA.length, meanIn: round(mean(insA.map((r) => r.auc))), meanOut: round(mean(outA.map((r) => r.auc))), diff: round(diff), pass: d },
      e_controls: { e2_nullMean: round(mean(nulls)), e2_nullShareGe60: round(share(nulls, (x) => x >= AUDIBLE), 4), e2_nullDraws: nulls.length, e2_pass: e2, e3_audibleLanguages: aud.length, e3_shuffledLe55: shufOk.length, e3_pass: e3, e3_shuffleMeanAllEligible: round(mean(el.filter((r) => r.shuffle.auc != null).map((r) => r.shuffle.auc))), e3_shufflePositionMean: round(mean(el.filter((r) => r.shuffle.position != null).map((r) => r.shuffle.position))) } },
    meanAuc: round(mean(auc)), shareAudible: round(share(el, (r) => r.auc >= AUDIBLE), 3), skillFwcOnlyFrozen: round(skillF), skillPairsOnlyFrozen: round(skillP), addsBeyondPairs: round(skill - skillP), partialSpearmanFwcGivenPairs: round(partialSpearman(fw, auc, lp), 3),
    eq250: { n: eq.length, rho: round(eqRho?.rho, 3), p: round(eqRho?.p, 4), meanIn: round(mean(eqIn.map((r) => r.eq250.auc))), meanOut: round(mean(eqOut.map((r) => r.eq250.auc))), audibleShareIn: round(share(eqIn, (r) => r.eq250.auc >= AUDIBLE), 3), audibleShareOut: round(share(eqOut, (r) => r.eq250.auc >= AUDIBLE), 3), nIn: eqIn.length, nOut: eqOut.length },
    graded: el.length >= 6 ? bootSlope(el) : null, zones: zones(el),
    rows: el.map((r) => ({ stem: r.stem, set: r.set, fwc32: r.fwc32, pairs: r.pairs, auc: r.auc, se: r.se, pos: r.position, pred: r.pred, inScope: r.fwc32 >= TSCOPE && r.pairs >= 250, audible: r.auc >= AUDIBLE, shuf: r.shuffle.auc, eq250: r.eq250?.auc ?? null })) };
}
if (mode === "verdict") {
  const files = fs.readdirSync(ROWS).filter((f) => f.endsWith(".json")), rows = files.map((f) => JSON.parse(fs.readFileSync(path.join(ROWS, f), "utf8"))), errs = fs.readdirSync(ROWS).filter((f) => f.endsWith(".error"));
  const frozen = JSON.parse(fs.readFileSync(path.join(HERE, "..", "company-moderators", "results", "frozen.dev.json"), "utf8")).models.LATER_M1.devClassAtT, pc = ols(frozen.map((d) => [Math.log2(d.pairs)]), frozen.map((d) => d.auc));
  const devTab = { pairsOnly: (n) => pc[0] + pc[1] * Math.log2(n), pairsOnlyCoef: pc.map((x) => round(x)) };
  const by = (f) => rows.filter(f), SETS = { PRIMARY: by((r) => r.set === "A" || r.set === "B"), SECONDARY: by((r) => r.set === "C"), POOLED: rows, A: by((r) => r.set === "A"), B: by((r) => r.set === "B"), C: by((r) => r.set === "C") };
  const V = { headerSha256: headerSha(import.meta.url), generated: new Date().toISOString(), rowsRead: rows.length, errors: errs, pairsOnlyDevCoef: devTab.pairsOnlyCoef, sets: {} };
  for (const [k, v] of Object.entries(SETS)) V.sets[k] = evalSet(k, v, devTab);
  const P = V.sets.PRIMARY, PO = V.sets.POOLED, cl = P.clauses;
  const ctl = (S) => S.clauses ? S.clauses.e_controls.e2_pass && S.clauses.e_controls.e3_pass !== false : false;
  const FULL = P.eligible >= 8 && cl.a_direction.pass && cl.b_frozenSkill.pass && cl.c_scopeHit.pass && cl.d_separation.pass && ctl(P) && ctl(PO);
  const poolIn = PO.clauses.c_scopeHit, scPrimary = cl.c_scopeHit.inScopeN >= 4 && cl.c_scopeHit.inScopeAudibleShare >= 0.7, scPooled = poolIn.inScopeN >= 4 && poolIn.inScopeAudibleShare >= 0.7 && poolIn.inScopeWilson95[0] > 0.5;
  const SC = P.eligible >= 8 && scPrimary && scPooled && ctl(P) && ctl(PO), falsified = cl.c_scopeHit.inScopeN >= 4 && cl.c_scopeHit.inScopeAudibleShare < 0.6;
  V.tier = { eligiblePrimary: P.eligible, FULL, SC, scPrimary, scPooled, controlsPrimary: ctl(P), controlsPooled: ctl(PO), scFalsified: falsified, verdict: P.eligible < 8 ? "VOID" : FULL ? "CONFIRMED" : SC ? "PARTIAL" : "NOT_CONFIRMED" };
  const byStem = Object.fromEntries(rows.map((r) => [r.stem, r])), iso = ["cmn", "ind", "vie"].map((s) => byStem[s]).filter((r) => r && elig(r));
  V.sub = { ISO: { rows: iso.map((r) => `${r.stem}:${r.fwc32}/${r.pairs}/${r.auc}`), pass: iso.length >= 2 ? iso.every((r) => r.auc >= AUDIBLE) : "NOT EVALUABLE" } };
  for (const [k, S] of [["PRIMARY", P], ["POOLED", PO]]) { const lo = S.rows.filter((r) => r.fwc32 < 0.2); V.sub["LOW_" + k] = { n: lo.length, audibleShare: round(share(lo, (r) => r.auc >= AUDIBLE), 3), pass: lo.length >= 3 ? share(lo, (r) => r.auc >= AUDIBLE) <= 0.25 : "NOT EVALUABLE", rows: lo.map((r) => `${r.stem}:${r.fwc32}/${r.pairs}/${r.auc}`) };
    V.sub["GRADED_" + k] = S.graded ? { ...S.graded, pass: S.graded.ciFwc[0] > 0 && S.graded.slopeFwcPerDevSD >= 0.02 } : null; V.sub["EQ250_" + k] = { ...S.eq250, pass: S.eq250.rho != null ? S.eq250.rho >= 0.3 && S.eq250.p <= 0.05 : "NOT EVALUABLE" }; V.sub["ADDS_" + k] = { addsBeyondPairs: S.addsBeyondPairs, pass: S.addsBeyondPairs >= 0.03, partialSpearman: S.partialSpearmanFwcGivenPairs }; }
  // reliability and combined view (descriptive): scoper's single test run (JSON only) and own.json dev
  const T = {}; for (const f of ["confirm.new.test.json", "confirm.old.test.json"]) for (const r of JSON.parse(fs.readFileSync(path.join(HERE, "..", "company-moderators", "results", f), "utf8")).rows) if (r.LATER && !r.LATER.thin && r.LATER.position >= 0.45 && r.LATER.position <= 0.55) T[r.stem] = { fwc: r.fwc32, pairs: r.LATER.pairs, auc: r.LATER.auc };
  const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), D = {}; for (const d of frozen) D[d.l] = { fwc: d.fwc, pairs: d.pairs, auc: d.auc };
  const both = rows.filter((r) => elig(r) && T[r.stem]), rel = both.length >= 5 ? permRho(both.map((r) => r.auc), both.map((r) => T[r.stem].auc), 2000) : null;
  const bothD = rows.filter((r) => elig(r) && D[r.stem]), relD = bothD.length >= 5 ? permRho(bothD.map((r) => r.auc), bothD.map((r) => D[r.stem].auc), 2000) : null;
  const comb = rows.filter((r) => elig(r)).map((r) => { const s = [r.auc, T[r.stem]?.auc, D[r.stem]?.auc].filter((x) => x != null); return { stem: r.stem, set: r.set, fwc: r.fwc32, n: s.length, auc: mean(s), trainAuc: r.auc, testAuc: T[r.stem]?.auc ?? null, devAuc: D[r.stem]?.auc ?? null }; });
  V.descriptive = { reliabilityTrainVsTest: { n: both.length, spearman: round(rel?.rho, 3), p: round(rel?.p, 4), meanTrain: round(mean(both.map((r) => r.auc))), meanTest: round(mean(both.map((r) => T[r.stem].auc))) },
    reliabilityTrainVsDev: { n: bothD.length, spearman: round(relD?.rho, 3), p: round(relD?.p, 4) }, combinedPerLanguage: { n: comb.length, rhoFwcVsMeanAuc: round(spearman(comb.map((c) => c.fwc), comb.map((c) => c.auc)), 3), rows: comb.map((c) => ({ ...c, auc: round(c.auc), fwc: c.fwc })) } };
  fs.writeFileSync(path.join(HERE, "results", "verdict.json"), JSON.stringify(V, null, 1));
  const brief = (S) => ({ eligible: S.eligible, thin: S.thin?.length, voided: S.voidedPosition, clauses: S.clauses && { a: S.clauses.a_direction, b: S.clauses.b_frozenSkill, c: S.clauses.c_scopeHit, d: S.clauses.d_separation, e: S.clauses.e_controls }, meanAuc: S.meanAuc, shareAudible: S.shareAudible, skillFwcOnly: S.skillFwcOnlyFrozen, skillPairsOnly: S.skillPairsOnlyFrozen, adds: S.addsBeyondPairs, partial: S.partialSpearmanFwcGivenPairs, eq250: S.eq250, zones: S.zones });
  console.log(JSON.stringify({ headerSha256: V.headerSha256, tier: V.tier, PRIMARY: brief(P), SECONDARY: brief(V.sets.SECONDARY), POOLED: brief(PO), A: brief(V.sets.A), B: brief(V.sets.B), C: brief(V.sets.C), sub: V.sub, descriptive: { rel: V.descriptive.reliabilityTrainVsTest, relDev: V.descriptive.reliabilityTrainVsDev, combinedRho: V.descriptive.combinedPerLanguage.rhoFwcVsMeanAuc } }, null, 1));
}
