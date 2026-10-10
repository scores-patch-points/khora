// attack-A.mjs: ATTACK A (leakage, confounds, matching strictness) on rule R1-first-left-fwc32.   modes: collect w1|w2 OUT.json | summary W1.json W2.json OUT.json
//   run:  NAME_COMPANY_PAIRBLOCK=1 node attack-A.mjs collect w1 results/A.w1.json   (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE (what I have seen). The rule JSON; the confirmer's scripts (lib.mjs, confirm.mjs, replicate.mjs) and their per-language tables for window 1 and window 2 (FWC32, pairs, probe AUC, POSITION, S2, shuffled AUC);
//   the scoper's results-file FORMAT (one row). Pipeline equality with the confirmer's rows was checked on 5 language-windows by sanity.mjs (exact). A TIMING PROBE of this file on two w1 languages was printed before the full run: afr (74 pairs)
//   V0b 0.584, V2 0.649, V5 0.584, V6 0.646, V6b 0.666 (V1 47 pairs, V3 38, V4 40 pairs: below 60); dan V0b 0.676, V1 0.677 (256 pairs), V1b 0.665, V2 0.653, V3 0.658, V4 0.583 (239 pairs), V5 0.678, V6 0.684, V6b 0.657. It showed that one pair draw of 74 pairs
//   moves afr from the confirmer's 0.699 to 0.584, so EVERY variant-language value below is the mean over R = 5 independent pair draws (positive order and negative pools redrawn), eligibility (>= 60 pairs: at least 3 of 5 draws; POSITION in band) on the draw means.
//   No other number of this attack has been seen.
// DATA. The confirmer's TRAIN windows (windows/ = w1 and windows2/ = w2; 53 and 50 stems). I use them because the claim under attack is about them and because "same rows" comparisons need the same text. They are NOT fresh for the rule;
//   attack A asks whether the confirmed effect survives a changed measurement, not whether it generalises. cmn-hans is excluded from every language-level statistic (script duplicate of cmn).
// OBJECT AND CONTROLS. LEFT probe = confirmer's arm (ridge-logistic on one-hot rank bins of left1+left2, 4 sentence-quartile CV blocks, both pair members in one block). Baseline V0b = default matching key but a split rng
//   (positives and negatives draw from separate streams so that variants share the same positive order); V0 reproduces the confirmer exactly (sanity.mjs). Variants change ONE thing:
//   V1 strict key: exact form count (<=6, then log2 bins), exact sentence index (<=7, then log bins), exact character length (<=14), sentence length in 1/4-octave bins, NO relaxation (stricter than the confirmer's key).
//   V1b strict + same sentence quartile (stream-drift control). V2 negatives = NOUN only (nominal vs nominal; the confirmer used NOUN/VERB/ADJ). V3 = V2 + V1. V4 both classes restricted to occurrences whose left-1 and left-2
//   neighbours are not PROPN (name-chain removal; GOLD UPOS USED TO SELECT ROWS ONLY). V5 both classes restricted to i >= 4 (a full two-token left context; no edge slots). V6 hashed tie-break of equal-count forms in the rank
//   (the confirmer's rank sorts equal counts alphabetically = string information in the bin). V6b rank-free bins (the neighbour's own count bin). RIVAL arms scored on the SAME rows of V0b, V1, V2: FINE (one-hots of exact sentence index,
//   sentence length, character length, form count), FINEPOS; BEYOND = AUC(LEFT+FINE) - AUC(FINE). Informative-row dilution: share of pairs with i < 2 (both left slots edge) and the share of positives with a PROPN left neighbour.
// ELIGIBLE (per variant): >= 60 pairs and POSITION arm in [0.45, 0.55]. A variant is VOID if more than 30% of its >= 60-pair language-windows leave the band.
// SURVIVAL (declared now, applied to pooled language-windows, and separately to window means): (s1) Spearman(FWC32, AUC) >= +0.40 with one-sided permutation p <= 0.05 (B = 2000); (s2) mean AUC over FWC32 >= 0.28 is >= 0.60;
//   (s3) share of languages with FWC32 >= 0.28 and AUC >= 0.60 is >= 0.60 (the rule's own falsifier level); (s4) mean(AUC | FWC32 >= 0.28) - mean(AUC | FWC32 < 0.24) >= 0.04. NARROWED if s1..s4 hold but the clean-zone mean falls by > 0.03
//   (the SESOI) relative to V0b on the common language set; FALLS-FOR-THAT-VARIANT if s1 or s3 fails. Thresholds may be tightened after seeing data, never loosened.
// BLIND PREDICTIONS (probabilities that the stated outcome holds): V1 survives s1-s4 with clean-zone drop <= 0.02: 0.80. V1b: 0.75. V2 (NOUN-only) clean-zone mean drops by >= 0.03: 0.55; falls below 0.60: 0.35. V3: 0.30 below 0.60.
//   V4 (name chain removed) clean-zone mean drops by >= 0.03: 0.60; fails s3: 0.35. V5 (i >= 4) keeps rho >= 0.40: 0.65 (dilution explains part of the gradient: rho drops by >= 0.10: 0.45). V6 hash tie: |change| <= 0.01: 0.90.
//   V6b: |change| <= 0.02: 0.75. FINE rival reaches >= 0.53 on any V0b language group mean: 0.15. BEYOND >= 0.05 in the clean zone: 0.85.
// NOT TESTED HERE: chat/IRC (no untouched day exists), RIGHT/BOTH arms, LATER, MWT/surface tokenisation (attack-A2.mjs), moderator selection (attack-B), shuffled company on the same rows (attack-C).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { win1, win2, listWin, rngFor, seedFor, pairsX, cvArm, A, S2r, S1r, pairedScore, leftNotName, headerSha, round, mean, share, spearman, permRho, mulberry, shuffleIn, inBand, OPEN3, describe } from "./lib-attack.mjs";
const NOUNONLY = new Set(["NOUN"]);
const VARIANTS = {
  V0b: {}, V1: { key: "strict" }, V1b: { key: "strict+block" }, V2: { neg: NOUNONLY }, V3: { neg: NOUNONLY, key: "strict" },
  V4: { keep: leftNotName }, V5: { keep: (s, i) => i >= 4 }, V6: { tie: "hash" }, V6b: { tie: "count" },
};
const WITH_RIVALS = new Set(["V0b", "V1", "V2"]);
const [mode, a1, a2, a3] = process.argv.slice(2);
const R_DRAWS = 5;
function oneDraw(stem, w, tagw, vname, k) {
  const o = VARIANTS[vname], sents = w.sents, upos = w.upos;
  const pr = pairsX(sents, upos, o, { P: rngFor(seedFor("attack-R1", stem, "P" + tagw + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "N" + vname + tagw + "#" + k)) });
  const r = { pairs: pr.pairs, dropped: pr.dropped }; if (pr.pairs < 60) return r;
  r.auc = cvArm(pr.rows, A.LEFT); r.pos = cvArm(pr.rows, A.POSITION); r.S2 = pairedScore(pr.rows, S2r); r.S1 = pairedScore(pr.rows, S1r);
  const pos = pr.rows.filter((x) => x.y === 1); r.lowI = share(pos, (x) => x.i < 2); r.chain = share(pos, (x) => x.i >= 1 && upos[x.s][x.i - 1] === "PROPN");
  r.chainN = share(pr.rows.filter((x) => x.y === 0), (x) => x.i >= 1 && upos[x.s][x.i - 1] === "PROPN");
  if (WITH_RIVALS.has(vname)) { r.fine = cvArm(pr.rows, A.FINE); r.finepos = cvArm(pr.rows, A.FINEPOS); r.beyond = cvArm(pr.rows, (x) => [...A.LEFT(x), ...A.FINE(x)]); }
  return r;
}
/** mean over R_DRAWS independent pair draws (positive order and negative pools redrawn); sdAuc = sd of the probe AUC across draws (pair-sampling noise) */
function rowFor(stem, w, tagw, vname) {
  const ds = []; for (let k = 0; k < R_DRAWS; k++) ds.push(oneDraw(stem, w, tagw, vname, k));
  const live = ds.filter((d) => d.auc != null), r = { v: vname, pairs: round(mean(ds.map((d) => d.pairs)), 1), draws: ds.length, liveDraws: live.length, thin: live.length < Math.ceil(R_DRAWS / 2) };
  if (r.thin) return r;
  for (const key of Object.keys(live[0])) if (key !== "pairs") r[key] = round(mean(live.map((d) => d[key])));
  r.pairs = round(mean(live.map((d) => d.pairs)), 1); const m = mean(live.map((d) => d.auc)); r.sdAuc = round(Math.sqrt(live.reduce((t, d) => t + (d.auc - m) ** 2, 0) / Math.max(1, live.length - 1)));
  return r;
}
if (mode === "collect") {
  const wk = a1, stems = listWin(wk === "w1" ? "windows" : "windows2").filter((s) => !process.env.ONLY || process.env.ONLY.split(",").includes(s)), R = { headerSha256: headerSha(import.meta.url), window: wk, rows: [] };
  for (const stem of stems) {
    const w = wk === "w1" ? win1(stem) : win2(stem), d = describe(w.sents), row = { name: stem, fwc32: round(d.fwc32), tokens: d.tokens, meanSentLen: round(d.meanSentLen), V: {} };
    for (const v of Object.keys(VARIANTS)) { try { row.V[v] = rowFor(stem, w, wk === "w1" ? "" : "-w2", v); } catch (e) { row.V[v] = { error: String(e).slice(0, 150) }; } }
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R));
    console.error(stem, "fwc", row.fwc32, Object.entries(row.V).map(([k, x]) => `${k}:${x.pairs}/${x.auc ?? "-"}`).join(" "));
  }
  console.log("collected", wk, R.rows.length);
}
if (mode === "summary") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), W1 = rd(a1), W2 = rd(a2), out = { headerSha256: headerSha(import.meta.url), variants: {}, notes: {} };
  const units = [...W1.rows.map((r) => ({ ...r, win: "w1" })), ...W2.rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.name !== "cmn-hans");
  const elig = (v, set) => set.filter((u) => { const x = u.V[v]; return x && !x.error && !x.thin && inBand(x.pos); });
  const livev = (v, set) => set.filter((u) => { const x = u.V[v]; return x && !x.error && !x.thin; });
  const statOf = (list, v) => {
    const f = list.map((u) => u.fwc32), a = list.map((u) => u.V[v].auc), z28 = list.filter((u) => u.fwc32 >= 0.28), z24 = list.filter((u) => u.fwc32 < 0.24), pm = list.length >= 6 ? permRho(f, a, 2000) : { rho: null, p: null };
    const m28 = mean(z28.map((u) => u.V[v].auc)), m24 = mean(z24.map((u) => u.V[v].auc));
    return { n: list.length, rho: round(pm.rho, 3), p: round(pm.p, 4), meanAll: round(mean(a)), n28: z28.length, mean28: round(m28), share28: round(share(z28, (u) => u.V[v].auc >= 0.6)), n24: z24.length, mean24: round(m24), diff: round(m28 - m24), meanS2: round(mean(list.map((u) => u.V[v].S2))), meanS2_28: round(mean(z28.map((u) => u.V[v].S2))),
      s1: pm.rho >= 0.4 && pm.p <= 0.05, s2: m28 >= 0.6, s3: share(z28, (u) => u.V[v].auc >= 0.6) >= 0.6, s4: m28 - m24 >= 0.04, pairsMean: round(mean(list.map((u) => u.V[v].pairs)), 1), lowI: round(mean(list.map((u) => u.V[v].lowI))), chain: round(mean(list.map((u) => u.V[v].chain))) };
  };
  // common set = language-windows eligible in ALL variants (paired comparison)
  const all = Object.keys(VARIANTS), common = units.filter((u) => all.every((v) => elig(v, [u]).length === 1)), commonNames = new Set(common.map((u) => u.name + u.win));
  for (const v of all) {
    const el = elig(v, units), lv = livev(v, units), voidShare = lv.length ? 1 - el.length / lv.length : null;
    const byWin = { w1: statOf(elig(v, units.filter((u) => u.win === "w1")), v), w2: statOf(elig(v, units.filter((u) => u.win === "w2")), v) };
    // window-mean per language
    const names = [...new Set(el.map((u) => u.name))], avg = names.map((n) => { const us = el.filter((u) => u.name === n); return { name: n, fwc32: mean(us.map((u) => u.fwc32)), V: { [v]: { auc: mean(us.map((u) => u.V[v].auc)), S2: mean(us.map((u) => u.V[v].S2)), pairs: mean(us.map((u) => u.V[v].pairs)), lowI: mean(us.map((u) => u.V[v].lowI)), chain: mean(us.map((u) => u.V[v].chain)) } } }; });
    out.variants[v] = { eligibleUnits: el.length, liveUnits: lv.length, voidShare: round(voidShare), VOID: voidShare > 0.3, pooled: statOf(el, v), perWindow: byWin, windowMean: statOf(avg, v), common: statOf(common.filter((u) => commonNames.has(u.name + u.win)), v) };
    if (WITH_RIVALS.has(v)) { const z28 = el.filter((u) => u.fwc32 >= 0.28), z24 = el.filter((u) => u.fwc32 < 0.24); out.variants[v].rivals = { fine28: round(mean(z28.map((u) => u.V[v].fine))), fine24: round(mean(z24.map((u) => u.V[v].fine))), finepos28: round(mean(z28.map((u) => u.V[v].finepos))), beyond28: round(mean(z28.map((u) => u.V[v].beyond))), beyond24: round(mean(z24.map((u) => u.V[v].beyond))), maxFine: round(Math.max(...el.map((u) => u.V[v].fine))), maxFinepos: round(Math.max(...el.map((u) => u.V[v].finepos))), beyondMinusFine28: round(mean(z28.map((u) => u.V[v].beyond - u.V[v].fine))) }; }
  }
  // paired deltas vs V0b on the common set
  out.commonN = common.length; out.paired = {};
  const base = (u) => u.V.V0b.auc;
  for (const v of all.filter((x) => x !== "V0b")) { const z28 = common.filter((u) => u.fwc32 >= 0.28), z24 = common.filter((u) => u.fwc32 < 0.24), d28 = z28.map((u) => u.V[v].auc - base(u)), d24 = z24.map((u) => u.V[v].auc - base(u)); out.paired[v] = { n28: z28.length, delta28: round(mean(d28)), n24: z24.length, delta24: round(mean(d24)), deltaAll: round(mean(common.map((u) => u.V[v].auc - base(u)))) }; }
  // narrow/falls classification
  out.verdictByVariant = {};
  for (const v of all.filter((x) => x !== "V0b")) { const s = out.variants[v].pooled, b = out.variants.V0b.pooled, k = out.paired[v]; out.verdictByVariant[v] = out.variants[v].VOID ? "VOID" : !s.s1 || !s.s3 ? "FALLS_FOR_VARIANT" : (s.s2 && s.s4 && k.delta28 >= -0.03) ? "SURVIVES" : "NARROWED"; }
  fs.writeFileSync(a3, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ commonN: out.commonN, verdictByVariant: out.verdictByVariant, paired: out.paired, pooled: Object.fromEntries(Object.entries(out.variants).map(([k, x]) => [k, { n: x.pooled.n, void: x.VOID, rho: x.pooled.rho, p: x.pooled.p, mean28: x.pooled.mean28, share28: x.pooled.share28, mean24: x.pooled.mean24, diff: x.pooled.diff, S2_28: x.pooled.meanS2_28, lowI: x.pooled.lowI, chain: x.pooled.chain, pairs: x.pooled.pairsMean }])) }, null, 1));
}
