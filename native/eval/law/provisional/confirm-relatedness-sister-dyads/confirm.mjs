// eval/law/provisional/confirm-relatedness-sister-dyads/confirm.mjs — CONFIRMATION OF THE CANDIDATE RULE "relatedness-sister-dyads" ON FRESH TEXT (a scoped, provisional rule: where it holds is the result).
//
//   NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs transfer <FIRST-LEFT|FIRST-BOTH|LATER-BOTH>   (donor -> target AUC matrices of one cell; writes results/transfer-<CELL>.json)
//   NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs verdict                                       (applies the registered analysis of verdict.mjs to the three matrices; writes results/verdict.json)
//   Never pass "run" as argv[2] (name-company.mjs would start its own main).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════
// RULE UNDER TEST (relatedness-sister-dyads; found on the scoper's DEV FIRST-LEFT, confirmed once by the scoper on UD TEST form A: 31/40 dyads pass, mean AUC 0.6265 vs 0.5504 from non-genus donors).
//   "A company profile learned from ONE close sister language (100 matched pairs, left neighbours = the causal first-mention arm) identifies proper nouns at first mention in another language of the
//   same sub-branch at AUC ~0.63, +0.07 above the same target's mean from donors outside its genus, in Italo-Western Romance (IWR: spa por glg cat fra ita), North Germanic (NGm: dan nob swe),
//   Continental West Germanic (CWGm: deu nld afr) and Hindustani (Hind: hin urd); it does not in South/West/East Slavic, Baltic, Finnic, Sinitic." The UD dev AND test of the 52-stem roster are
//   therefore SPENT for this rule (dev selected the scope, test confirmed it once). THIS FILE ASKS WHETHER IT HOLDS ON TEXT THE SCOPER NEVER READ.
// OBJECT AND LABEL. The observable is the scoper's company profile: rank-bin slots (floor(log2 rank) of the neighbour's form in the language's OWN stream, 13 bins incl. sentence edge) of the two LEFT
//   neighbours (arm LEFT, FIRST stratum = first mention of the form in the stream; usable at reading time with prefix only). No capital, no POS, no word list, no speaker field, no treebank label enters a
//   feature. A single-language ridge-logistic classifier (fitLogit, lambda 1) fitted on 100 matched pairs of the DONOR is a PROBE (an existence test, not a rule form); gold PROPN is used only as the donor's
//   training label and the target's evaluation label. The cluster label is the sub-branch of the stream's language (language identification, not a stream observable). Matched pairs (name-company pairsOf,
//   NAME_COMPANY_PAIRBLOCK=1): each PROPN first mention is paired with a NOUN/VERB/ADJ first mention of the same (form-frequency bin, within-sentence position bucket, character-length bucket, sentence-length bucket).
// FRESH DATA (the point of this file). UD TRAIN splits in /Users/mlacy/Documents/data/ud/<treebank>/ (the scoper read only /private/tmp/claude-501/ud-eval dev and test; no script of this lens has opened a
//   train split). Per language one window of consecutive sentences (seeded start, >= 40000 non-PUNCT word units, whole file if smaller) of the FIRST train file in name order, after dropping every sentence whose
//   text equals a sentence of the scoper's dev/test of that stem (exact match) and exact duplicates inside the file. For spa (es_gsd vs the scoper's AnCora), por (pt_bosque), glg (gl_treegal; 600 train
//   sentences), rus, ces, fas the treebank itself is a DIFFERENT treebank from the scoper's (0 sentence overlap with the scoper's dev/test, and different sent_id families); for the other languages it is the same
//   treebank, a disjoint split. Window rule (count-based, fixed before any AUC): if the seeded window gives < 150 FIRST pairs and the treebank is larger than one window, the next seeded window (<= 5 attempts) is
//   used; only ita needed it (attempt 0 gave 69 FIRST pairs; attempt 1 gives 600). Donors: the 49 roster languages with a train split (the scoper's 52 minus ell, mar, tel); a donor needs >= 100 FIRST pairs, a target >= 60.
//   Both donor and target text are fresh (form F, "fresh -> fresh"). EXTENSION targets outside the scoper's roster (never donors, never in a control mean): bel (be_hse; East Slavic), isl (is_icepahc), fao
//   (fo_farpahc) (North Germanic; both historical-parsed corpora). Within-sentence-shuffled twins of every window (company destroyed, sentence length and class kept) are built by prep.mjs --shuffled.
// DISCLOSURE (what the author had seen). Read: the rule JSON given with the task; the scoper's code and headers (sister.mjs, lib.mjs, analysis.mjs, groups.mjs, subbranch.mjs, confirm.mjs head) and its
//   pair-count tables for dev and test; the summary line of results/sister-confirm.json for the three cells (FIRST-LEFT HOLDS 31/40 mean 0.6265 vs 0.5504; FIRST-BOTH HOLDS 28/40, 0.6259 vs 0.5519;
//   LATER-BOTH FAILS 12/31, 0.5894 vs 0.5167); the scoper's discovery set means (position control 0.500, shuffled-target control 0.511-0.525). NOT opened: any per-dyad table of the scoper, any cluster-level
//   confirm number beyond the rule JSON. Seen on the FRESH data before this header (no AUC): window sizes and FIRST/LATER pair counts of all 52 languages (49 roster + 3 extension) (in-scope: spa 600 por 600 glg 364 cat 600 fra 600
//   ita 600 [after re-window] dan 600 nob 600 swe 366 deu 600 nld 600 afr 193 hin 600 urd 600), the sentence-overlap table with the scoper's dev/test, the sent_id prefix of the scoper's files, UPOS counts of
//   ISDT. No AUC, no probe output of any kind has been computed on fresh data by any script.
// DYADS. Ordered (donor d, target t), d != t, both in the same cluster of subbranch.mjs, roster languages only. IN SCOPE (fixed by the rule, not re-selected): IWR, NGm, CWGm, Hind (44 ordered dyads when all
//   14 languages are eligible). OUT OF SCOPE: SSl WSl ESl Finnic Baltic Celtic Turkic Sinitic Semitic. Probe: CAP_TRAIN = 100 pairs of the donor, 6 seeded draws, AUC averaged over draws, scored on EVERY pair of the target.
//   ctrl_t = mean AUC of target t from all eligible roster donors of a different genus than t (groups.mjs genus; ext targets use their stated genus).
//   A DYAD PASSES iff AUC >= 0.60, AUC > the analytic Mann-Whitney q95 for the target's pair count (0.5 + 1.645 sqrt((2n+1)/(12 n^2))) and AUC - ctrl_t >= 0.05 (the rule's own definition; a pair-flip permutation
//   q95 (200 flips of the pair labels, draw-0 scores) is reported beside it for in-cluster dyads, not used for the verdict).
// TESTS on the PRIMARY cell FIRST-LEFT form F (thresholds: T1-T5 are the rule's passIf; T4 is TIGHTENED from "> 0" to "> 0.03" (the SESOI of this lens); T6 and T7 are ADDED controls):
//   T1 >= 6 eligible in-scope dyads.   T2 >= 70% of them pass.   T3 every in-scope cluster with >= 2 eligible dyads has >= 50% pass.
//   T4 lower 2.5% bound of the target-language bootstrap (B = 2000, per-target mean diffs) of mean(AUC - ctrl_t) over in-scope dyads > 0.03.
//   T5 mean POSITION-arm AUC of the in-scope dyads in [0.45, 0.55] AND mean label-swap SHAM AUC in [0.45, 0.55] (position control void outside the band => no confirmation).
//   T6 (added) mean AUC of the SAME donor probes on the within-sentence-SHUFFLED target windows <= 0.55 and >= 0.05 below the unshuffled mean (the signal must be company, not position/frequency).
//   T7 (added) pass fraction >= 0.60 after dropping annotation/source twins: all spa<->fra (both *_gsd) dyads and the hin<->urd dyads (one Hindustani spoken language in two scripts, one treebank lineage).
// VERDICT. CONFIRMED iff T1-T7 all hold on the full in-scope rung. PARTIAL iff not, but a rung of the registered ladder [IWR+NGm+CWGm+Hind] > [IWR+NGm+CWGm] > [IWR+NGm] > [IWR] satisfies T1-T7 on its own
//   dyads (the broadest holding rung is the NARROWED scope; it is chosen on these data and is itself provisional). NOT_CONFIRMED otherwise. failIf of the rule (pass < 50%, mean diff < 0.03, position or sham
//   outside [0.45, 0.55]) is reported as a flag. Out-of-scope clusters passing in >= 50% of their dyads would WIDEN the scope (reported, not a verdict input).
// REPORTED, NOT VERDICT INPUTS: R1 FIRST-BOTH form F and LATER-BOTH form F (the rule says LATER fails); R2 per cluster, per target (IWR target means; glg weak), per dyad tables; R3 out-of-scope clusters
//   pass fractions; R4 independent-treebank subset (dyads with both spa,por,glg: different treebanks from the scoper's) and target-on-different-treebank subset; R5 strongest-target subset (targets spa por cat ita fra);
//   R6 extension dyads (bel from rus/ukr; isl and fao from dan/nob/swe); R7 gradient regression (sameSub, sameGenusNotSub, sameFamilyOnly, sameOrder, sameScript, sameMorph, sameTeam; target and donor effects;
//   pigeonhole bootstrap B = 1000) on FIRST-LEFT and FIRST-BOTH; GRADED = sameSub > sameGenusNotSub > sameFamilyOnly > 0 with (sameSub - sameFamilyOnly) >= 0.03 and its lower bound > 0.
// BLIND PREDICTIONS (numbers; written before the run). P1 FIRST-LEFT in-scope pass fraction in [0.55, 0.80], point 0.68 (shrinkage from the scoper's 0.78 because treebanks and windows are fresh).
//   P2 mean(AUC - ctrl) +0.055 (range 0.035-0.075); mean AUC 0.61. P3 IWR pass fraction >= 0.60; NGm and CWGm >= 0.50; Hind 2/2. P4 out-of-scope pooled pass fraction <= 0.20 and no out-of-scope cluster (n >= 2)
//   at >= 50% (South Slavic is the likeliest exception). P5 position mean and sham mean within 0.47-0.53; shuffled mean <= 0.54. P6 glg has the lowest mean AUC of the IWR targets. P7 GRADED holds on
//   FIRST-LEFT and sameOrder's interval spans 0 with |est| < 0.02. P8 independent-treebank subset (spa por glg) pass fraction >= 0.50. P9 bel passes 0/2 from rus/ukr; isl and fao pass < 50% of their dyads.
//   P10 LATER-BOTH in-scope pass fraction < 0.60; FIRST-BOTH >= 0.60. P11 verdict: PARTIAL (IWR carries it; the small clusters do not reliably reach 70%).
// NOT TESTED HERE: any register but UD treebank text (IRC has no unused day for any lens: 112/112 days are in some partition, and nick-mention gold is a different object); label-free cluster assignment
//   (the neighbour-bin fingerprint proxy); a fixed (non-fitted) score; more than one donor; word-order contrasts beyond the gradient regression; languages absent from data/ud (ell mar tel).
// Thresholds may be tightened, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, TB, EXT, loadFresh, rngFor, seedFor, round, mean, fitProbe, pairSample, aucOn, sha256 } from "./fresh.mjs";
import { pairFlipQ95, headerHash } from "../family-vs-relatedness/lib.mjs";
import { sub } from "../family-vs-relatedness/subbranch.mjs";
import { IN_SCOPE, dyadsOf, evaluate, verdictOf, gradient } from "./verdict.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results"), CELLS = { "FIRST-LEFT": ["FIRST", "LEFT"], "FIRST-BOTH": ["FIRST", "BOTH"], "LATER-BOTH": ["LATER", "BOTH"] };
const CAP_TRAIN = 100, MIN_DONOR = 100, MIN_TARGET = 60, DRAWS = 6, FLIPB = 200, rs = (...p) => rngFor(seedFor("conf-rel-sister", ...p));
const clusterOf = (s) => sub(s) ?? EXT[s]?.[2] ?? null, fileSha = (f) => sha256(fs.readFileSync(path.join(HERE, f), "utf8"));
const codeSha = () => sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]);
const prov = () => ({ headerSha256: headerHash(SELF), confirmCodeSha256: codeSha(), verdictSha256: fileSha("verdict.mjs"), freshSha256: fileSha("fresh.mjs"), prepSha256: fileSha("prep.mjs"), metaSha256: fileSha("data/meta.json") });

function transfer(cell) {
  const [stratum, arm] = CELLS[cell], langs = {}, shuf = {}, t0 = Date.now();
  for (const s of [...Object.keys(TB), ...Object.keys(EXT)]) { const L = loadFresh(s, stratum); if (L) { langs[s] = L; const S = loadFresh(s, stratum, ".shuf"); if (S) shuf[s] = S; } }
  const D = Object.keys(TB).filter((s) => langs[s]?.pairs >= MIN_DONOR), T = Object.keys(langs).filter((s) => langs[s].pairs >= MIN_TARGET), A = {}, P = {}, S = {}, SH = {}, FL = {};
  for (const d of D) {
    A[d] = {}; P[d] = {}; S[d] = {}; SH[d] = {}; FL[d] = {}; const acc = {}, accP = {}, accS = {}, accH = {};
    for (let r = 0; r < DRAWS; r++) {
      const rnd = rs("tr", cell, d, r), idx = pairSample(langs[d], Math.min(CAP_TRAIN, langs[d].pairs), rnd), pt = { L: langs[d], idx }, y2 = langs[d].y.slice();
      for (let k = 0; k < idx.length; k += 2) if (rnd() < 0.5) { y2[idx[k]] = 1 - y2[idx[k]]; y2[idx[k + 1]] = 1 - y2[idx[k + 1]]; }
      const f = fitProbe([pt], arm), fp = fitProbe([pt], "POSITION"), fsh = fitProbe([{ L: { ...langs[d], y: y2 }, idx }], arm);
      for (const t of T) {
        if (t === d) continue;
        (acc[t] ??= []).push(aucOn(f, langs[t], arm)); (accP[t] ??= []).push(aucOn(fp, langs[t], "POSITION")); (accS[t] ??= []).push(aucOn(fsh, langs[t], arm));
        if (shuf[t]) (accH[t] ??= []).push(aucOn(f, shuf[t], arm));
        if (r === 0 && f && clusterOf(d) && clusterOf(d) === clusterOf(t)) FL[d][t] = round(pairFlipQ95(f(langs[t].X[arm]), langs[t].y, rs("flip", cell, d, t), FLIPB));
      }
    }
    const mn = (a) => (a && a.filter((x) => x != null).length ? round(mean(a.filter((x) => x != null))) : null);
    for (const t of Object.keys(acc)) { A[d][t] = mn(acc[t]); P[d][t] = mn(accP[t]); S[d][t] = mn(accS[t]); SH[d][t] = mn(accH[t]); }
    console.error(`${cell}: donor ${d} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  const out = { cell, ...prov(), donors: D, targets: T, pairs: Object.fromEntries(T.map((t) => [t, langs[t].pairs])), A, P, S, SH, FL };
  fs.writeFileSync(path.join(RES, `transfer-${cell}.json`), JSON.stringify(out)); console.log(`wrote transfer-${cell}.json: ${D.length} donors, ${T.length} targets, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const cl = (x) => clusterOf(x);
const inScope = (d, t) => IN_SCOPE.includes(cl(d)) && cl(d) === cl(t) && !EXT[d] && !EXT[t];
const brief = (v) => { const e = evaluate(v, "brief"); return { n: e.n, nPass: e.nPass, frac: e.frac, meanAuc: e.meanAuc, meanCtrl: e.meanCtrl, diff: e.diffBoot, failing: e.failing }; };
function verdictMode() {
  const X = {}; for (const c of Object.keys(CELLS)) { const f = path.join(RES, `transfer-${c}.json`); if (fs.existsSync(f)) X[c] = JSON.parse(fs.readFileSync(f, "utf8")); }
  const out = { ...prov(), transferShas: Object.fromEntries(Object.entries(X).map(([c, x]) => [c, { headerSha256: x.headerSha256, verdictSha256: x.verdictSha256 }])), cells: {} };
  for (const [c, x] of Object.entries(X)) out.cells[c] = { donors: x.donors.length, targets: x.targets.length, verdict: verdictOf(x, c) };
  const x = X["FIRST-LEFT"]; if (!x) throw new Error("need transfer-FIRST-LEFT.json");
  const dy = dyadsOf(x, inScope), IWRt = {}; for (const r of dy.filter((q) => q.cluster === "IWR")) (IWRt[r.t] ??= []).push(r);
  const clusters = [...new Set(Object.keys(TB).map(clusterOf).filter(Boolean))].filter((c) => !IN_SCOPE.includes(c)), oos = {};
  for (const c of clusters) oos[c] = brief(dyadsOf(x, (d, t) => cl(d) === c && cl(t) === c && !EXT[d] && !EXT[t]));
  out.inScopeDyads = dy;
  out.iwrByTarget = Object.fromEntries(Object.entries(IWRt).map(([t, v]) => [t, { meanAuc: round(mean(v.map((q) => q.auc))), meanDiff: round(mean(v.map((q) => q.diff))), nPass: v.filter((q) => q.pass).length, n: v.length }]));
  out.outOfScope = { perCluster: oos, pooled: brief(dyadsOf(x, (d, t) => clusters.includes(cl(d)) && cl(d) === cl(t) && !EXT[d] && !EXT[t])) };
  const fresh3 = ["spa", "por", "glg"];
  out.independentTreebank = { bothSides: brief(dyadsOf(x, (d, t) => inScope(d, t) && fresh3.includes(d) && fresh3.includes(t))), targetSide: brief(dyadsOf(x, (d, t) => inScope(d, t) && fresh3.includes(t))), donorOnlyOtherTarget: brief(dyadsOf(x, (d, t) => inScope(d, t) && !fresh3.includes(t))) };
  out.strongTargets = brief(dyadsOf(x, (d, t) => inScope(d, t) && cl(t) === "IWR" && ["spa", "por", "cat", "ita", "fra"].includes(t)));
  out.noTwinNoHU = brief(dy.filter((q) => !(q.twin && (q.d === "spa" || q.d === "fra" || q.d === "deu"))).filter((q) => !(["hin", "urd"].includes(q.d) && ["hin", "urd"].includes(q.t))));
  out.extension = dyadsOf(x, (d, t) => EXT[t] && !EXT[d] && cl(d) === cl(t));
  out.extensionControls = Object.fromEntries(Object.keys(EXT).map((t) => [t, x.targets.includes(t) ? { pairs: x.pairs[t] } : null]));
  for (const c of ["FIRST-LEFT", "FIRST-BOTH"]) if (X[c]) out.cells[c].gradient = gradient(X[c].A, 1000, rs("grad", c));
  fs.writeFileSync(path.join(RES, "verdict.json"), JSON.stringify(out, null, 1));
  const v = out.cells["FIRST-LEFT"].verdict, f = v.rungs[0];
  console.log(JSON.stringify({ verdict: v.verdict, narrowedScope: v.narrowedScope, failIf: v.failIf, full: { n: f.n, nPass: f.nPass, frac: f.frac, meanAuc: f.meanAuc, meanCtrl: f.meanCtrl, diff: f.diffBoot, pos: f.position, sham: f.sham, shuf: f.shuffled, tests: f.tests, perCluster: f.perCluster, noTwin: f.noTwin },
    rungs: v.rungs.map((r) => ({ c: r.clusters.join("+"), n: r.n, nPass: r.nPass, holds: r.holds, tests: r.tests })), cells: Object.fromEntries(Object.entries(out.cells).map(([c, o]) => [c, { verdict: o.verdict.verdict, n: o.verdict.rungs[0].n, nPass: o.verdict.rungs[0].nPass, grad: o.gradient?.graded }])), oos: out.outOfScope.pooled }, null, 1));
}
const mode = process.argv[2];
fs.mkdirSync(RES, { recursive: true });
if (mode === "transfer") { if (!CELLS[process.argv[3]]) throw new Error("usage: confirm.mjs transfer <FIRST-LEFT|FIRST-BOTH|LATER-BOTH>"); transfer(process.argv[3]); } else if (mode === "verdict") verdictMode(); else throw new Error("usage: confirm.mjs <transfer CELL|verdict>");
