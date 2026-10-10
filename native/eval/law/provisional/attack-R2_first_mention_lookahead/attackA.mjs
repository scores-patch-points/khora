// attackA.mjs — ATTACK A (leakage and confounds) on rule R2_first_mention_lookahead (lens chat-scope). Run:  node attackA.mjs   (never pass "run")  -> results/attackA.json
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; sha256 of this block is recorded in the output JSON) ═══
// RULE UNDER ATTACK: INIT_Tinf = number of OTHER messages of the day whose first word is the form, scored at the FIRST occurrence of a lowercase word form; direction +1; fixed threshold >= 2.
// DISCLOSURE (what I have seen): the rule JSON; the confirmer's irc.json / robust.json numbers (primary n=485, AUC 0.6845, ties 0.61, controls in band, TPR .293 / FPR .109, beyond-CNT_Tinf 0.675, beyond +-128 count 0.592,
//   stream-position control rel 0.604); the confirmer's lib/ix/stats/cells/run source (I audited it: scores are functions of the token stream only; speaker field and UPOS appear only in the label functions).
//   My own sanity.mjs run of common.mjs+stats.mjs on the confirmer's 26 EN days (a calibration, not an attack): n=485 pairs, 16 days, AUC 0.6753 (seed 1; the confirmer got 0.6845 with its own matching draw),
//   win/tie/lose = 0.363/0.625/0.012, controls in band, thr2 TPR .293 / FPR .116, CNT_T128 0.615, INIT_T128 0.661, day/pos-form/neg-form CIs about [0.654, 0.69]. NOT seen: any stricter key, any gold variant, any floor sweep, any diagnostic below.
// DATA (all touched; no fresh IRC day exists): CF = the confirmer's 26 EN days (the registered primary population; 16 days yield pairs); ALL_EN = all 80 EN channel-days (CF + scoper discovery 29 + scoper confirm 25), a larger-power population.
// MATCHING VARIANTS (gold = the rule's: positive = first occurrence of a form equal to the nick of a >=3-message speaker, >=3 chars, not self, not topic word; negative = first occurrence of a >=3-char form that is no >=3-message nick). 5 matcher seeds each (seeds 1..5; negatives drawn at random from the cell pool, no replacement, positives without a same-cell negative dropped).
//   K0 baseline cell [ibk(i), floor(4 log2 count), clb(chars), mlb(msg len)];  K1 COUNTX: exact whole-day token count for count <= 24 else eighth-octave, + ibk(i), chars, mlb;  K2 STATIC-STRICT: K1 + exact i (cap 12) + exact message length (cap 40) + exact chars (cap 14);
//   K3 CNTX: K0 + exact CNT_Tinf (other messages containing the form, cap 12);  K4 LOCX: K0 + exact CNT_T128 (cap 8);  K5 LOC32X: K0 + exact CNT_T32 (cap 5);  K6 POSX: K0 + decile of m/N + floor(log2(1+N-m));
//   K7 GAPX: K0 + floor(log2(1+distance to the next message containing the form)) (recency of the next mention; 20 = never);  K8 CNT+LOC: K0 + CNT_Tinf (cap 8) + CNT_T128 (cap 6);  K9 ALL: K0 + CNT_Tinf (cap 8) + CNT_T128 (cap 6) + rel decile + gap bin.
// DECISIONS (per variant, per population; mean paired AUC over the 5 seeds; day-cluster 95% bootstrap CI (600 resamples) from seed 1): controls i, L, cl, lc must each be in [0.45, 0.55] (seed-1 pairs) or the variant is VOID for that population; n >= 60 (CF) / >= 100 (ALL_EN) else VOID.
//   SURVIVES: mean AUC >= 0.62 and day-CI lower >= 0.55.  ERODES: mean AUC in [0.55, 0.62) or lower in [0.50, 0.55).  FALLS: mean AUC < 0.55 or day-CI lower < 0.50.  EQUIVALENT to K0: |mean AUC - K0 mean AUC| <= 0.03 on the same population.
//   An attack SUCCEEDS only if a variant is not SURVIVES; a variant that is not EQUIVALENT but SURVIVES is reported as a shift.
// FLOOR SWEEP (reader's 3-character figure floor): K0 pairs restricted to forms with >= 2, 3, 4, 5 characters (candidates built with a 2-char minimum; gold unchanged). Reported without verdict.
// DIAGNOSTICS (reported without verdict; they read the speaker field or raw text and are NOT rule observables): (D1) distinct-speaker firing: share of firing (INIT_Tinf >= 2) positives and negatives whose other first-word messages all come from ONE speaker; AUC of the distinct-speaker count;
//   (D2) share of firing negatives whose first-slot messages are "!"-prefixed in the raw text (bot commands) and the AUC when "!" messages are removed from the count; (D3) self-address: share of the INIT count of positives coming from messages spoken by the nick itself.
// BLIND PREDICTIONS (means over seeds, CF population): K0 in [0.66, 0.70]; K1 >= 0.65; K2 >= 0.62; K3 in [0.58, 0.69]; K4 in [0.54, 0.64]; K5 in [0.54, 0.64]; K6 >= 0.65; K7 in [0.50, 0.63]; K8 in [0.52, 0.62]; K9 in [0.50, 0.62];
//   floor sweep: AUC for >= 5 chars within 0.05 of >= 3 chars; D1 distinct-speaker AUC below the message-count AUC by >= 0.02 (idiolect inflates negatives); D2 "!" explains >= 15% of firing negatives.
// NOT TESTED: any fitted classifier; causal readers; non-English; the lexicon rival (attack C). If a code bug is found after the first run it is fixed, the whole run repeated, and an AMENDMENT is appended below the block (thresholds may only tighten).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, candidates, matchPairs, ibk, clb, mlb, GOLD0, rnd4 } from "./common.mjs";
import { auc, wtl, thr, ctl, ctlOk, summ, mean, sd } from "./stats.mjs";
import { headerSha, CODE, enDays } from "./hdr.mjs";
const D = enDays(), CF = D.CF, ALL = [...new Set([...D.CF, ...D.SD, ...D.SC])], SEEDS = [1, 2, 3, 4, 5], c = (x, m) => Math.min(x, m);
const KEYS = { K0: (x) => [ibk(x.i), Math.floor(4 * x.lc), clb(x.w), mlb(x.L)].join("|"),
  K1: (x) => [x.c <= 24 ? x.c : 100 + Math.floor(8 * x.lc), ibk(x.i), clb(x.w), mlb(x.L)].join("|"),
  K2: (x) => [x.c <= 24 ? x.c : 100 + Math.floor(8 * x.lc), c(x.i, 12), c(x.L, 40), c(x.cl, 14)].join("|"),
  K3: (x) => [KEYS.K0(x), c(x.CNT_Tinf, 12)].join("|"), K4: (x) => [KEYS.K0(x), c(x.CNT_T128, 8)].join("|"), K5: (x) => [KEYS.K0(x), c(x.CNT_T32, 5)].join("|"),
  K6: (x) => [KEYS.K0(x), Math.floor(10 * x.rel), Math.floor(x.rem)].join("|"), K7: (x) => [KEYS.K0(x), Math.floor(x.gap)].join("|"),
  K8: (x) => [KEYS.K0(x), c(x.CNT_Tinf, 8), c(x.CNT_T128, 6)].join("|"), K9: (x) => [KEYS.K0(x), c(x.CNT_Tinf, 8), c(x.CNT_T128, 6), Math.floor(10 * x.rel), Math.floor(x.gap)].join("|") };
const SHA = headerSha(import.meta.url), t0 = Date.now(), log = (m) => process.stderr.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}\n`);
const docs = new Map(), cands = new Map(); for (const k of ALL) { const d = loadDay(k); docs.set(k, d); cands.set(k, candidates(d, 2)); } log(`loaded ${ALL.length} EN days`);
const OUT = { headerSha256: SHA, code: CODE(), populations: { CF: CF.length, ALL_EN: ALL.length }, variants: {}, floors: {}, diag: {} };
const verdict = (m, lo) => (m >= 0.62 && lo >= 0.55 ? "SURVIVES" : m < 0.55 || lo < 0.5 ? "FALLS" : "ERODES");
for (const [pop, days] of [["CF", CF], ["ALL_EN", ALL]]) {
  OUT.variants[pop] = {}; const minN = pop === "CF" ? 60 : 100;
  for (const [kn, kf] of Object.entries(KEYS)) {
    const per = SEEDS.map((s) => days.flatMap((k) => matchPairs(cands.get(k).filter((x) => x.cl >= 3), GOLD0, kf, s, kn).pairs)), p1 = per[0], aucs = per.map((p) => auc(p, "INIT_Tinf"));
    const o = { n: Math.round(mean(per.map((p) => p.length))), n1: p1.length, aucMean: rnd4(mean(aucs)), aucSd: rnd4(sd(aucs)), aucs: aucs.map(rnd4) };
    if (p1.length >= minN) { const s = summ(p1, "INIT_Tinf", 600, kn + pop); o.ci = s.ci; o.days = s.days; o.posForms = s.posForms; o.wtl = s.wtl; o.ctl = ctl(p1); o.ctlOk = ctlOk(o.ctl); o.thr2 = thr(p1, "INIT_Tinf", 2); o.tieShare = o.wtl.tie;
      o.verdict = !o.ctlOk ? "VOID(controls)" : verdict(o.aucMean, s.ci.day[0]); o.initAuc = rnd4(auc(p1.filter((p) => p.pos.i === 0), "INIT_Tinf")); o.noninitAuc = rnd4(auc(p1.filter((p) => p.pos.i > 0), "INIT_Tinf")); } else o.verdict = "VOID(n)";
    OUT.variants[pop][kn] = o; log(`${pop} ${kn}: n=${o.n1} auc=${o.aucMean}±${o.aucSd} ${o.verdict} ci_day=${o.ci?.day}`);
  }
  const b = OUT.variants[pop].K0.aucMean; for (const o of Object.values(OUT.variants[pop])) o.equivToK0 = Math.abs(o.aucMean - b) <= 0.03;
}
// floor sweep on CF and ALL_EN (K0 key)
for (const [pop, days] of [["CF", CF], ["ALL_EN", ALL]]) { OUT.floors[pop] = {}; for (const f of [2, 3, 4, 5]) { const per = SEEDS.map((s) => days.flatMap((k) => matchPairs(cands.get(k).filter((x) => x.cl >= f), GOLD0, KEYS.K0, s, "fl" + f).pairs)); OUT.floors[pop]["cl>=" + f] = { n: Math.round(mean(per.map((p) => p.length))), aucMean: rnd4(mean(per.map((p) => auc(p, "INIT_Tinf")))) }; } }
fs.writeFileSync(new URL("./results/attackA.part1.json", import.meta.url), JSON.stringify(OUT, null, 1)); log("part1 written");
// diagnostics D1-D3 on CF, K0, seed 1
const pairs = CF.flatMap((k) => matchPairs(cands.get(k).filter((x) => x.cl >= 3), GOLD0, KEYS.K0, 1, "K0").pairs), spk = (r) => { const d = docs.get(r.day), S = new Set(); let n = 0, bang = 0, own = 0; d.T.forEach((m, k) => { if (k !== r.m && m[0] === r.w) { S.add(d.S[k]); n++; if (d.BANG[k]) bang++; if (d.S[k] === r.w) own++; } }); return { n, ds: S.size, bang, own }; };
for (const p of pairs) { p.pos.spk = spk(p.pos); p.neg.spk = spk(p.neg); for (const o of [p.pos, p.neg]) { o.DS = o.spk.ds; o.NOBANG = o.spk.n - o.spk.bang; } }
const fire = (ps, side) => ps.filter((p) => p[side].INIT_Tinf >= 2), one = (a, side) => a.filter((p) => p[side].spk.ds === 1).length / Math.max(1, a.length);
OUT.diag.D1 = { firePos: fire(pairs, "pos").length, fireNeg: fire(pairs, "neg").length, singleSpeakerSharePos: rnd4(one(fire(pairs, "pos"), "pos")), singleSpeakerShareNeg: rnd4(one(fire(pairs, "neg"), "neg")), aucMessages: rnd4(auc(pairs, "INIT_Tinf")), aucDistinctSpeakers: rnd4(auc(pairs, "DS")), thr2DS: thr(pairs, "DS", 2) };
OUT.diag.D2 = { fireNegBangShare: rnd4(fire(pairs, "neg").filter((p) => p.neg.spk.bang >= 1).length / Math.max(1, fire(pairs, "neg").length)), fireNegMostlyBang: rnd4(fire(pairs, "neg").filter((p) => p.neg.spk.bang >= p.neg.spk.n / 2).length / Math.max(1, fire(pairs, "neg").length)), firePosBangShare: rnd4(fire(pairs, "pos").filter((p) => p.pos.spk.bang >= 1).length / Math.max(1, fire(pairs, "pos").length)), aucNoBang: rnd4(auc(pairs, "NOBANG")), thr2NoBang: thr(pairs, "NOBANG", 2) };
OUT.diag.D3 = { posOwnShare: rnd4(pairs.reduce((s, p) => s + p.pos.spk.own, 0) / Math.max(1, pairs.reduce((s, p) => s + p.pos.spk.n, 0))), negOwnShare: rnd4(pairs.reduce((s, p) => s + p.neg.spk.own, 0) / Math.max(1, pairs.reduce((s, p) => s + p.neg.spk.n, 0))) };
const top = (ps, side) => { const m = new Map(); for (const p of ps) m.set(p[side].w, (m.get(p[side].w) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 25); }; OUT.diag.topFiringNegForms = top(fire(pairs, "neg"), "neg"); OUT.diag.topFiringPosForms = top(fire(pairs, "pos"), "pos");
OUT.diag.sample = { nPairs: pairs.length }; OUT.seconds = (Date.now() - t0) / 1000;
fs.writeFileSync(new URL("./results/attackA.json", import.meta.url), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify({ sha: SHA, CF: Object.fromEntries(Object.entries(OUT.variants.CF).map(([k, v]) => [k, [v.n1, v.aucMean, v.ci?.day?.join("-"), v.verdict, v.equivToK0]])), ALL: Object.fromEntries(Object.entries(OUT.variants.ALL_EN).map(([k, v]) => [k, [v.n1, v.aucMean, v.ci?.day?.join("-"), v.verdict, v.equivToK0]])), floors: OUT.floors, diag: { D1: OUT.diag.D1, D2: OUT.diag.D2, D3: OUT.diag.D3 } }, null, 1));
