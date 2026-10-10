// eval/law/provisional/attack-relatedness-sister-dyads/attackC.mjs — ATTACK C (COUNT RIVAL, SHUFFLED COMPANY, CHEAP DONOR CHOICE, GRANULARITY) on rule "relatedness-sister-dyads".
//   NAME_COMPANY_PAIRBLOCK=1 node attackC.mjs      (writes results/attackC.json and data/stats.json; needs data/base, data/B built by build.mjs; never pass "run" as argv[2])
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═════════════════════════════════════════════════════════════
// DISCLOSURE. attackA.mjs and attackB.mjs HAVE RUN (headers recorded in results/attackA.json, results/attackB.json). Seen from them: the effect survives strict/ultra/local matching, surface tokens and prefix-only bins (IWR+NGm
//   contrast +0.067..+0.097; RIVALS arm contrast -0.0002); against alternative controls (window A): non-genus mean +0.078, non-genus Indo-European donors +0.055, non-Indo-European +0.111, mean of the 3 BEST non-genus donors
//   +0.006, best single non-genus donor -0.007 (an oracle that uses the target's labels, upward biased by a max over ~40 noisy AUCs); the best non-genus donors named for Romance targets were swe, bul, afr, nld, and for
//   NGm targets glg, fra, cat, slv (so cross-genus donors of similar function-word structure are as good as sisters); the scoper's test->test split has IWR 14/30 (contrast +0.048), other splits 0.07-0.08;
//   Hindustani is in scope on 5/6 splits, NGm on 3/5, CWGm 1/6, Celtic 2/5. NOT SEEN: any fixed-rule rival AUC, any restricted-arm probe, any shuffled-donor probe, any cheap-statistic or fingerprint donor choice, any
//   cross-split donor selection, any own-language ceiling on these rows.
// QUESTION. Is a trivially cheaper observable or donor choice enough to reproduce the sister advantage within 0.03 AUC, on the SAME rows (window A, FIRST stratum, matched pairs of the confirmer)? Evaluated on the IWR+NGm
//   targets (9) against the mean AUC their in-cluster sister donors give (target-level means; the registered probe: LEFT arm, 100 pairs, 6 draws).
// RIVALS AND CONTROLS.
//   C1 FIXED DONOR-FREE SCORES (direction fixed in advance: rarer left neighbours -> name; pooled AUC on all rows of the target): f1 = -log2(1+count of L1 in the window), f2 = -(rank bin of L1 + rank bin of L2),
//      f3 = -log2(1+number of occurrences of L1's form in the previous 50 tokens), f4 = -log2(1+count of L1 so far, prefix only), f5 = -(causal rank bin of L1 + L2), f6 = -(log2(1+count L1) + log2(1+count L2)).
//      Sentence edges count as the most frequent neighbour (a very large count, bin 0). The best direction-free value max(AUC, 1-AUC) is reported as an upper bound (post-hoc direction, not a rule).
//   C2 GRANULARITY. Transfer matrices of restricted arms on the same rows: L1ONLY (13 bins), L2ONLY, LEFTCOARSE (5 groups per slot: bins 0-1, 2-4, 5-8, 9-11, edge); contrast against the arm's own non-genus mean.
//   C3 SHUFFLED COMPANY. (a) donor probes trained on within-sentence-SHUFFLED donor windows (confirmer's cache .shuf; company destroyed, labels kept) scored on the REAL targets; (b) real donor probes scored on shuffled
//      targets (the confirmer's SH matrix); sister - non-genus contrast of both.
//   C4 LABEL-FREE DONOR CHOICE. For each IWR+NGm target the 5 nearest non-genus donors by (a) standardised cheap stream statistics (log2 mean chars, log2 mean sentence length, hapax share of types, type/token ratio, share of
//      tokens with rank bin <= 3, share with bin >= 9; z-scored over the 49 languages, Euclidean), (b) the company fingerprint (histograms of the rank bins of the left neighbours over ALL tokens of the window, total variation
//      distance averaged over the two slots; no labels); and (c) the same fingerprint over ALL donors (does the label-free choice recover the sisters, and with what AUC). Mean AUC of the chosen donors vs sister mean.
//   C5 SUPERVISED OUT-OF-SPLIT CHOICE (uses the target's labels, so NOT a label-free rule; it asks whether non-sister donors exist that are as good): choose the top-1 and top-3 non-genus donors of each IWR+NGm target
//      on one half of window A (blocks {0,1}) and score them on the other half (blocks {2,3}), and the reverse; and window A -> window B (targets that have a window B). Compare with the sister mean on the evaluation split.
//   C6 CEILING. Own-language 4-block leave-block-out probe AUC (LEFT, 100 training pairs from the other blocks) of the same rows: sister AUC as a fraction of it.
// THRESHOLDS (fixed now; may be tightened, never loosened). A rival REPRODUCES the sister effect iff its target-level mean AUC on the 9 IWR+NGm targets is >= (mean sister AUC - 0.03) (and in >= 5 of the 9 targets
//   individually). A restricted arm REPRODUCES the contrast iff its contrast (sister - arm's non-genus mean, target bootstrap) >= 0.05. C3 is VALID (company is the signal) iff shuffled-donor mean AUC <= 0.53 and contrast <= 0.02
//   and shuffled-target mean AUC <= 0.55 and contrast <= 0.03. C4/C5 rivals are judged by the same -0.03 rule; C4 is label-free, C5 is not.
// BLIND PREDICTIONS. PC1 no fixed score reproduces (best fixed-direction mean AUC <= 0.58; direction-free <= 0.60). PC2 L1ONLY contrast >= 0.05 and LEFTCOARSE contrast in [0.02, 0.05) (fine bins carry part of it).
//   PC3 C3 valid (shuffled-donor contrast <= 0.01, shuffled-target contrast <= 0.02). PC4 cheap-statistic donors: mean AUC <= ctrl + 0.01 (not reproduce); fingerprint donors among non-genus: >= ctrl + 0.015 but < sister - 0.03.
//   PC5 supervised out-of-split top-3 non-genus donors reproduce in >= 5 of 9 targets (the sister advantage is not unique to sisters); top-1 in >= 4 of 9. PC6 sister AUC / own-language ceiling in [0.85, 1.0].
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, DATA, HERE, STEMS, TB, META, IN_SCOPE, sub, genus, headerHash, sha256, mean, round, boot, rs, quantile, dyadsOf, EXT, freshDoc, aucOf, fitProbe, pairSample, aucOn } from "./lib.mjs";
import { loadCfg, transferMatrix } from "./transfer.mjs";
import { langOf, statsOf } from "./feat.mjs";
import { loadFresh } from "../confirm-relatedness-sister-dyads/fresh.mjs";

const SELF = fileURLToPath(import.meta.url), CONFD = path.join(HERE, "..", "confirm-relatedness-sister-dyads"), cl = (s) => sub(s) ?? null, G = (s) => genus(s);
const out = { headerSha256: headerHash(SELF), codeSha256: sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]) };
const save = () => fs.writeFileSync(path.join(RES, "attackC.json"), JSON.stringify(out, null, 1));
const SIS = ["IWR", "NGm"], inS = (d, t) => SIS.includes(cl(d)) && cl(d) === cl(t), TG = STEMS.filter((s) => SIS.includes(cl(s)));
const L0 = loadCfg("base"), conf = JSON.parse(fs.readFileSync(path.join(CONFD, "results", "transfer-FIRST-LEFT.json"), "utf8"));
const M0 = { A: conf.A, P: conf.P, S: conf.S, pairs: conf.pairs };
const sisterAuc = (M) => { const o = {}; for (const t of TG) { const v = Object.keys(M.A).filter((d) => d !== t && inS(d, t) && M.A[d]?.[t] != null).map((d) => M.A[d][t]); if (v.length) o[t] = mean(v); } return o; };
const nonGen = (M, t) => Object.keys(M.A).filter((x) => x !== t && G(x) !== G(t) && M.A[x]?.[t] != null);
const sis0 = sisterAuc(M0), sisMean = mean(Object.values(sis0)); out.sister = { perTarget: Object.fromEntries(Object.entries(sis0).map(([t, v]) => [t, round(v)])), mean: round(sisMean) };
const ctrl0 = Object.fromEntries(TG.map((t) => [t, mean(nonGen(M0, t).map((x) => M0.A[x][t]))])); out.ctrl = { perTarget: Object.fromEntries(Object.entries(ctrl0).map(([t, v]) => [t, round(v)])), mean: round(mean(Object.values(ctrl0))) };
const verdictRival = (perTarget) => { const ts = Object.keys(perTarget).filter((t) => sis0[t] != null), m = mean(ts.map((t) => perTarget[t])), k = ts.filter((t) => perTarget[t] >= sis0[t] - 0.03).length; return { meanAuc: round(m), gapToSister: round(m - sisMean), targetsWithin003: `${k}/${ts.length}`, reproduces: m >= sisMean - 0.03 && k >= 5 }; };
console.error("sister mean", out.sister.mean, "ctrl mean", out.ctrl.mean); save();
// ── C1 fixed donor-free scores ──
const BIG = 1e6, lg = (x) => Math.log2(1 + x), cnt = (x) => (x < 0 ? BIG : x), bin = (x) => (x === 12 ? 0 : x);
const FIX = { f1: (r) => -lg(cnt(r[19])), f2: (r) => -(bin(r[7]) + bin(r[8])), f3: (r) => -lg(r[23] < 0 ? BIG : r[23]), f4: (r) => -lg(cnt(r[21])), f5: (r) => -(bin(r[17]) + bin(r[18])), f6: (r) => -(lg(cnt(r[19])) + lg(cnt(r[20]))) };
out.C1 = { perRival: {} };
for (const [k, f] of Object.entries(FIX)) { const per = {}, perFree = {}; for (const t of TG) { const L = L0[t]; if (!L) continue; const a = aucOf(L.rows.map(f), L.y); per[t] = a; perFree[t] = Math.max(a, 1 - a); } out.C1.perRival[k] = { fixedDirection: verdictRival(per), directionFree: verdictRival(perFree), perTarget: Object.fromEntries(Object.entries(per).map(([t, v]) => [t, round(v)])) }; }
// all-language fixed-score AUCs (context): where does the rarer-neighbour direction hold?
out.C1.allLanguages = Object.fromEntries(Object.entries(FIX).map(([k, f]) => [k, Object.fromEntries(STEMS.filter((s) => L0[s]?.pairs >= 60).map((s) => [s, round(aucOf(L0[s].rows.map(f), L0[s].y))]))]));
save(); console.error("C1", Object.entries(out.C1.perRival).map(([k, v]) => `${k} ${v.fixedDirection.meanAuc} (free ${v.directionFree.meanAuc})`).join(" | "));
// ── C2 granularity ──
out.C2 = {};
for (const arm of ["LEFT", "L1ONLY", "L2ONLY", "LEFTCOARSE"]) {
  const M = arm === "LEFT" ? M0 : transferMatrix(L0, { arm, seed: "atkC2" }), dy = dyadsOf(M, inS), byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff);
  out.C2[arm] = { contrast: boot(Object.values(byT).map(mean), 2000, rs("c2", arm)), meanAuc: round(mean(dy.map((x) => x.auc))), meanCtrl: round(mean(dy.map((x) => x.ctrl))), nPass: dy.filter((x) => x.pass).length, n: dy.length, reproducesContrast: (mean(Object.values(byT).map(mean)) >= 0.05) };
  console.error("C2", arm, JSON.stringify(out.C2[arm].contrast), out.C2[arm].meanAuc, `${out.C2[arm].nPass}/${out.C2[arm].n}`); save();
}
// ── C3 shuffled company ──
{ const SH = {}; for (const s of STEMS) { const L = loadFresh(s, "FIRST", ".shuf"); if (L) SH[s] = L; }
  const Md = transferMatrix(L0, { trainLangs: SH, evalLangs: L0, arm: "LEFT", seed: "atkC3d" }), Mt = { A: conf.SH, pairs: conf.pairs, P: {}, S: {} };
  const sm = (M, tag) => { const dy = dyadsOf(M, inS), byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff); return { n: dy.length, meanAuc: round(mean(dy.map((x) => x.auc))), meanCtrl: round(mean(dy.map((x) => x.ctrl))), contrast: boot(Object.values(byT).map(mean), 2000, rs("c3", tag)) }; };
  out.C3 = { shuffledDonorOnRealTarget: sm(Md, "d"), realDonorOnShuffledTarget: sm(Mt, "t") };
  out.C3.valid = out.C3.shuffledDonorOnRealTarget.meanAuc <= 0.53 && out.C3.shuffledDonorOnRealTarget.contrast.mean <= 0.02 && out.C3.realDonorOnShuffledTarget.meanAuc <= 0.55 && out.C3.realDonorOnShuffledTarget.contrast.mean <= 0.03;
  console.error("C3", JSON.stringify(out.C3)); save(); }
// ── C4 label-free donor choice ──
const UNIT = {}; const stF = path.join(DATA, "stats.json");
if (fs.existsSync(stF)) Object.assign(UNIT, JSON.parse(fs.readFileSync(stF, "utf8")));
else { for (const s of STEMS) { const fd = freshDoc(s, TB[s], false, META[s].attempt ?? 0), stream = fd.doc.stream, st = statsOf(stream); let n = 0, ch = 0; const h1 = new Array(13).fill(0), h2 = new Array(13).fill(0); let lo = 0, hi = 0;
    for (const sent of stream) sent.forEach((w, i) => { n++; ch += [...w].length; const b = st.binsA.get(w); if (b <= 3) lo++; if (b >= 9) hi++; h1[i - 1 < 0 ? 12 : st.binsA.get(sent[i - 1])]++; h2[i - 2 < 0 ? 12 : st.binsA.get(sent[i - 2])]++; });
    const types = st.count.size, hap = [...st.count.values()].filter((v) => v === 1).length;
    UNIT[s] = { cheap: [Math.log2(ch / n), Math.log2(n / stream.length), hap / types, types / n, lo / n, hi / n], fp: [h1.map((x) => x / n), h2.map((x) => x / n)] }; }
  fs.writeFileSync(stF, JSON.stringify(UNIT)); }
{ const cs = STEMS.filter((s) => UNIT[s]), mu = [0, 1, 2, 3, 4, 5].map((j) => mean(cs.map((s) => UNIT[s].cheap[j]))), sd = [0, 1, 2, 3, 4, 5].map((j) => Math.sqrt(mean(cs.map((s) => (UNIT[s].cheap[j] - mu[j]) ** 2))) || 1);
  const dCheap = (a, b) => Math.sqrt(UNIT[a].cheap.reduce((t, v, j) => t + (((v - UNIT[b].cheap[j]) / sd[j]) ** 2), 0)), tv = (p, q) => 0.5 * p.reduce((t, v, j) => t + Math.abs(v - q[j]), 0), dFp = (a, b) => 0.5 * (tv(UNIT[a].fp[0], UNIT[b].fp[0]) + tv(UNIT[a].fp[1], UNIT[b].fp[1]));
  const pick = (t, pool, dist, k) => pool.slice().sort((x, y) => dist(t, x) - dist(t, y)).slice(0, k), AUCof = (t, ds) => mean(ds.map((d) => M0.A[d][t]));
  const R = { cheapNonGenus: {}, fpNonGenus: {}, fpAllDonors: {}, fpAllDonorsSisterShare: {}, fpTop1NonGenus: {}, randomNonGenus: {} };
  for (const t of TG) { if (!L0[t]) continue; const el = Object.keys(M0.A).filter((d) => d !== t && M0.A[d]?.[t] != null), ng = el.filter((d) => G(d) !== G(t));
    R.cheapNonGenus[t] = AUCof(t, pick(t, ng, dCheap, 5)); R.fpNonGenus[t] = AUCof(t, pick(t, ng, dFp, 5)); R.fpTop1NonGenus[t] = AUCof(t, pick(t, ng, dFp, 1)); const all5 = pick(t, el, dFp, 5); R.fpAllDonors[t] = AUCof(t, all5); R.fpAllDonorsSisterShare[t] = all5.filter((d) => inS(d, t)).length / 5; R.randomNonGenus[t] = AUCof(t, ng); }
  out.C4 = { donorsChosenFpAll: Object.fromEntries(TG.filter((t) => L0[t]).map((t) => [t, pick(t, Object.keys(M0.A).filter((d) => d !== t && M0.A[d]?.[t] != null), dFp, 5)])), perRival: {} };
  for (const [k, v] of Object.entries(R)) out.C4.perRival[k] = k === "fpAllDonorsSisterShare" ? { meanShare: round(mean(Object.values(v))) } : verdictRival(v);
  console.error("C4", Object.entries(out.C4.perRival).map(([k, v]) => `${k} ${v.meanAuc ?? v.meanShare}`).join(" | ")); save(); }
// ── C5 supervised out-of-split choice ──
{ const L = L0, half = (bl) => Object.fromEntries(Object.entries(L).map(([s, l]) => [s, langOf(s, l.rows.filter((r) => bl.includes(r[1])))])), MA1 = transferMatrix(half([0, 1]), { arm: "LEFT", seed: "atkH1" }), MA2 = transferMatrix(half([2, 3]), { arm: "LEFT", seed: "atkH2" }), MB = transferMatrix(loadCfg("B"), { arm: "LEFT", seed: "atk" });
  const run = (sel, ev, tag) => { const r = { top1: {}, top3: {}, sister: {}, randomNonGenus: {} };
    for (const t of TG) { const donorsBoth = Object.keys(sel.A).filter((d) => d !== t && sel.A[d]?.[t] != null && ev.A[d]?.[t] != null), ng = donorsBoth.filter((d) => G(d) !== G(t)), sis = Object.keys(ev.A).filter((d) => d !== t && inS(d, t) && ev.A[d]?.[t] != null);
      if (!sis.length || ng.length < 5) continue; const rk = ng.slice().sort((a, b) => sel.A[b][t] - sel.A[a][t]); r.top1[t] = ev.A[rk[0]][t]; r.top3[t] = mean(rk.slice(0, 3).map((d) => ev.A[d][t])); r.sister[t] = mean(sis.map((d) => ev.A[d][t])); r.randomNonGenus[t] = mean(ng.map((d) => ev.A[d][t])); r[`chosen_${t}`] = rk.slice(0, 3); }
    const ts = Object.keys(r.sister), cmp = (k) => { const gap = ts.map((t) => r[k][t] - r.sister[t]), w = ts.filter((t) => r[k][t] >= r.sister[t] - 0.03).length; return { meanAuc: round(mean(ts.map((t) => r[k][t]))), sisterMean: round(mean(ts.map((t) => r.sister[t]))), meanGapToSister: round(mean(gap)), targetsWithin003: `${w}/${ts.length}` }; };
    return { n: ts.length, top1: cmp("top1"), top3: cmp("top3"), randomNonGenus: cmp("randomNonGenus"), chosen: Object.fromEntries(ts.map((t) => [t, r[`chosen_${t}`]])) }; };
  out.C5 = { A1toA2: run(MA1, MA2), A2toA1: run(MA2, MA1), WindowAtoB: run(M0, MB), WindowBtoA: run(MB, M0) }; console.error("C5", Object.entries(out.C5).map(([k, v]) => `${k} n=${v.n} top1 ${v.top1.meanGapToSister} (${v.top1.targetsWithin003}) top3 ${v.top3.meanGapToSister} (${v.top3.targetsWithin003}) rand ${v.randomNonGenus.meanGapToSister}`).join(" | ")); save(); }
// ── C6 own-language ceiling ──
{ const res = {}; for (const t of TG) { const L = L0[t]; if (!L) continue; const folds = [];
    for (let b = 0; b < 4; b++) { const pairsTr = [], teIdx = []; for (let k = 0; k < L.pairs; k++) { if (L.block[2 * k] === b) teIdx.push(2 * k, 2 * k + 1); else pairsTr.push(k); } if (pairsTr.length < 60 || teIdx.length < 40) continue;
      const a = []; for (let r = 0; r < 3; r++) { const rnd = rs("c6", t, b, r), sh = pairsTr.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } const idx = sh.slice(0, 100).flatMap((k) => [2 * k, 2 * k + 1]), f = fitProbe([{ L, idx }], "LEFT"); if (!f) continue; const sc = f(teIdx.map((i) => L.X.LEFT[i])), y = teIdx.map((i) => L.y[i]), v = aucOf(sc, y); if (v != null) a.push(v); }
      if (a.length) folds.push(mean(a)); }
    if (folds.length) res[t] = { ownAuc: round(mean(folds)), folds: folds.length, sisterAuc: round(sis0[t]), ratioAboveChance: round((sis0[t] - 0.5) / (mean(folds) - 0.5)) }; }
  out.C6 = { perTarget: res, meanOwn: round(mean(Object.values(res).map((v) => v.ownAuc))), meanSister: round(mean(Object.values(res).map((v) => v.sisterAuc))), meanRatioAboveChance: round(mean(Object.values(res).map((v) => v.ratioAboveChance))) }; console.error("C6", out.C6.meanOwn, out.C6.meanSister, out.C6.meanRatioAboveChance); }
save(); console.log("C done");
