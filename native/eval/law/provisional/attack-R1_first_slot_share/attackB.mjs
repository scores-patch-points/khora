// attack-R1_first_slot_share/attackB.mjs: ATTACK B (forking paths, scope re-derivation, multiplicity) on rule R1_first_slot_share. Usage: node attackB.mjs b0|b1|b2|b3   (never pass "run" as first argument). Results: results/B.<part>.json (header sha256 inside).
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this script) ═══
// DISCLOSURE. As attackA.mjs and attackC.mjs, including their results (read before this header): S0 1-1 AUC EN R 0.882, C 0.856, D 0.864, RC 0.871; strict keys S1..S7 RC 0.81 0.74 (VOID 0.69) 0.68 0.77 0.81 0.72; recency alone 0.70, c128 0.76, c32 0.74, probe count-only 0.77,
//   wordshuf same rows 0.575, msgshuf same rows 0.872; ishare AUC by history b=1 0.77, b=2 0.84, b 3-4 0.88, b 5-8 0.91, b>=9 0.88; gold min-chars 1/2/4 leave S0 unchanged. NOT yet seen by me: per-day AUC on R, ladder by day size on R/D, any NONEN pair set from my matcher,
//   gold-parameter variants other than min chars, threshold FPR on R, era statistics. From the confirmer's JSON I saw: B per-day list for C (ubuntu 2010-07-15 0.681; other big days 0.86-0.94), the post-hoc ladder numbers, NONEN pooled 0.849 n=142, DE 0.870 n=27, ES 0.833 n=57, IT 0.853 n=58.
// DATA. D = scoper discovery 42 days (selection data), C = confirm 36 (touched once), R = 14 reserve (never R1-scored), I = 20 tiny ineligible (touched by the confirmer). Languages: EN (ubuntu kubuntu xubuntu ubuntu-server), NONEN (ubuntu-de -es -it). Gold, score and S0 matcher as attackA.mjs (own implementation, <= 400 pairs per day).
// TESTS AND BARS (fixed now; tightening only).
//   b0 (scope re-derivation, EN): per-day AUC (pairs >= 20) and natural precision/recall at 0.67 for all days of D, C, R, I; ladder by messages per day (<150, 150-499, 500-1499, >=1500) per split; CROSS-SPLIT DERIVATION: on a derivation split choose the smallest cut in {150,300,500,1000,1500,3000} such that
//     pooled AUC of days >= cut is >= 0.80 and >= 80% of those days with >= 20 pairs have AUC >= 0.70; evaluate that cut on the other split (pooled AUC and day pass share for days >= cut; pooled AUC for days below). Done both ways: D -> C+R and C+R -> D. BAR: the test-split pooled AUC >= 0.80 and day pass share >= 75%.
//     BIG-DAY BAR: >= 80% of EN days with >= 1500 messages and >= 40 pairs have AUC >= 0.70 (D, C, R pooled). ERA: per-day AUC of those big days by era (2004-07, 2008-11, 2012-15); statistic = max minus min era mean; label-permutation null over days (5000); slope of day AUC on year with day bootstrap CI.
//     "No decay" is supported iff the permutation p > 0.05 AND the slope CI includes 0 AND the 2012-15 mean is within 0.06 of the 2004-07 mean (the scoper's own blind bar). Heterogeneity: SD of day AUC, number of big days with AUC < 0.80.
//   b1 (NONEN, D + C + I days; I tiny, reported apart): per language (de es it) and pooled: S0 1-1 pairs, AUC, day-cluster CI (>= 4 days), leave-one-day-out range, controls; and the pooled STRATIFIED estimator within the language group (negatives pooled over days). A per-language cell HOLDS iff n >= 60 and >= 3 days and AUC >= 0.70
//     and day-cluster CI lower >= 0.65 (the rule's bars); pooled NONEN (D+C) must reach AUC >= 0.75 with day-cluster CI lower >= 0.65 to keep the claim "non-English confirmed on the pooled cell". Exact one-sided day-level sign-flip p for each cell (flip all pairs of a day jointly, <= 20 days exact else 20000 draws).
//   b2 (gold and design forks on EN RC, S0): minSpoke 1, 2, 5, 10 (default 3); topic share none, 1/100, 1/1000 (default 1/300); LATER defined at message level (b >= 1, both classes); pair cap 1000; three other pairing seeds. BAR: AUC >= 0.75 in every variant, else the scope is narrowed to the scoper's gold definition (state which fork breaks it).
//   b3 (multiplicity and threshold): (i) from the scoper's confirm.json and the confirmer's b.json: number of cells, number with n >= 60, number with AUC >= 0.70, expected false passes under H0 (normal approx. P(AUC >= 0.70) per cell) and the max-of-K null for the scoper's discovery column set; (ii) on EN pairs of R, C, D: TPR and FPR at theta 0.50 0.60 0.67 0.75 0.80;
//     BAR: on R, theta = 0.67 has FPR <= 0.20 and TPR >= 0.50 (drift check of a threshold chosen on discovery); (iii) natural precision/recall at 0.67 on R vs flag-every-initial by day-size bucket. BAR: R days >= 1500 messages precision >= 0.75.
// BLIND PREDICTIONS (P): big-day bar met (0.75); cross-split bar met both ways (0.6); derived cut in {300,500,1000} (0.6); era permutation p > 0.05 (0.7); NONEN pooled D+C AUC in [0.75,0.88] (0.7); DE holds (0.4), ES holds (0.65), IT holds (0.55); gold-fork bar met (0.8);
//   R theta bar met (0.7); R big-day precision in [0.75,0.92] (0.65); R per-day AUC min over big days >= 0.75 (0.5).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, buildIx, feat, laterOccs, SETS, headerSha, LANG, rngOf, shuffleIn } from "./lib.mjs";
import { matchDay, pAuc, bootPairs, byDay, sumPairs, strat, sumStrat, round, wins } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), part = process.argv[2], EN = (k) => LANG[k.split("/")[0]] === "en", t0 = Date.now(), log = (m) => console.error(((Date.now() - t0) / 1000).toFixed(0) + "s " + m), out = { part, headerSha256: SHA };
const sizeBin = (n) => (n < 150 ? "<150" : n < 500 ? "150-499" : n < 1500 ? "500-1499" : ">=1500");
const era = (y) => (y <= 2007 ? "2004-07" : y <= 2011 ? "2008-11" : "2012-15");
const SPL = { D: SETS.D, C: SETS.C, R: SETS.R, I: SETS.I };
const pass = (a) => a.filter(Boolean).length;
/** per-day record: S0 pairs, natural tally at 0.67 (unmatched; every LATER token of >= 3 chars) and the flag-every-initial baseline. */
function dayRec(key, split, theta = 0.67) {
  const d = loadDay(key), m = matchDay(d, "S0", { max: 400 }), ix = buildIx(d.T), t = { tp: 0, fp: 0, fn: 0, tn: 0, btp: 0, bfp: 0 };
  for (const o of laterOccs(d)) { const f = feat(ix, o.k, o.w).ishare >= theta, y = o.cls === "P"; t[y ? (f ? "tp" : "fn") : f ? "fp" : "tn"]++; if (o.i === 0) t[y ? "btp" : "bfp"]++; }
  return { key, split, lang: d.lang, channel: d.channel, year: d.year, msgs: d.T.length, pairs: m.pairs, nPairs: m.pairs.length, nat: t };
}
const dayAuc = (r) => (r.nPairs >= 20 ? pAuc(r.pairs, "ishare") : null);
const pooled = (rs) => { const P = rs.flatMap((r) => r.pairs); return { days: rs.length, n: P.length, auc: P.length ? round(pAuc(P, "ishare")) : null }; };
const nat = (rs) => { const t = { tp: 0, fp: 0, fn: 0, tn: 0, btp: 0, bfp: 0 }; for (const r of rs) for (const k of Object.keys(t)) t[k] += r.nat[k]; return { ...t, precision: round(t.tp / Math.max(1, t.tp + t.fp)), recall: round(t.tp / Math.max(1, t.tp + t.fn)), basePrecision: round(t.btp / Math.max(1, t.btp + t.bfp)), baseRecall: round(t.btp / Math.max(1, t.tp + t.fn)) }; };
function signFlipP(dayAucs, B = 20000) { const x = dayAucs.map((a) => a - 0.5), n = x.length, obs = x.reduce((s, v) => s + v, 0) / n; let ge = 0, tot = 0; if (n <= 16) { for (let m = 0; m < 1 << n; m++) { let s = 0; for (let j = 0; j < n; j++) s += m & (1 << j) ? x[j] : -x[j]; tot++; if (s / n >= obs - 1e-12) ge++; } } else { const r = rngOf("sf", n); for (let b = 0; b < B; b++) { let s = 0; for (let j = 0; j < n; j++) s += r() < 0.5 ? x[j] : -x[j]; tot++; if (s / n >= obs - 1e-12) ge++; } } return round(ge / tot, 5); }
const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
if (part === "b0") {
  const recs = []; for (const [sp, ks] of Object.entries(SPL)) for (const k of ks.filter(EN)) { recs.push(dayRec(k, sp)); log(k); }
  out.days = recs.map((r) => ({ key: r.key, split: r.split, channel: r.channel, year: r.year, msgs: r.msgs, nPairs: r.nPairs, auc: dayAuc(r) == null ? null : round(dayAuc(r)), prec: round(r.nat.tp / Math.max(1, r.nat.tp + r.nat.fp)), rec: round(r.nat.tp / Math.max(1, r.nat.tp + r.nat.fn)) }));
  const inSp = (sp) => (r) => (sp === "RC" ? r.split === "R" || r.split === "C" : r.split === sp); out.ladder = {};
  for (const sp of ["D", "C", "R", "I", "RC"]) { out.ladder[sp] = {}; for (const b of ["<150", "150-499", "500-1499", ">=1500"]) { const g = recs.filter((r) => inSp(sp)(r) && sizeBin(r.msgs) === b); if (g.length) out.ladder[sp][b] = { ...pooled(g), nat: nat(g) }; } }
  const CUTS = [150, 300, 500, 1000, 1500, 3000], pS = (g) => { const a = g.map(dayAuc).filter((x) => x != null); return { share: a.length ? round(pass(a.map((x) => x >= 0.7)) / a.length) : null, scored: a.length }; };
  const derive = (rs) => { for (const cut of CUTS) { const g = rs.filter((r) => r.msgs >= cut); if (!g.length) continue; const p = pooled(g), s = pS(g); if (p.auc >= 0.8 && s.share != null && s.share >= 0.8) return cut; } return null; };
  const test = (rs, cut) => { if (cut == null) return { cut: null }; const g = rs.filter((r) => r.msgs >= cut), lo = rs.filter((r) => r.msgs < cut); return { cut, above: { ...pooled(g), ...pS(g), nat: nat(g) }, below: { ...pooled(lo), nat: nat(lo) } }; };
  const Drs = recs.filter((r) => r.split === "D"), CRI = recs.filter((r) => r.split !== "D");
  out.cross = { D_to_CRI: { derivedCut: derive(Drs), ...test(CRI, derive(Drs)) }, CRI_to_D: { derivedCut: derive(CRI), ...test(Drs, derive(CRI)) }, R_only_to_D: { derivedCut: derive(recs.filter((r) => r.split === "R")), ...test(Drs, derive(recs.filter((r) => r.split === "R"))) } };
  const big = recs.filter((r) => r.msgs >= 1500 && r.nPairs >= 40).map((r) => ({ key: r.key, split: r.split, year: r.year, era: era(r.year), channel: r.channel, auc: pAuc(r.pairs, "ishare") })), A = big.map((x) => x.auc);
  out.big = { n: big.length, share70: round(pass(A.map((x) => x >= 0.7)) / big.length), share80: round(pass(A.map((x) => x >= 0.8)) / big.length), min: round(Math.min(...A)), sd: round(sd(A)), below80: big.filter((x) => x.auc < 0.8).map((x) => [x.key, round(x.auc)]) };
  const eras = ["2004-07", "2008-11", "2012-15"], eMean = (lab) => eras.map((e) => mean(big.filter((_, j) => lab[j] === e).map((x) => x.auc))), stat = (lab) => { const m = eMean(lab).filter((x) => !Number.isNaN(x)); return Math.max(...m) - Math.min(...m); };
  const lab0 = big.map((x) => x.era), obs = stat(lab0), r = rngOf("era"); let ge = 0; for (let b = 0; b < 5000; b++) if (stat(shuffleIn(lab0.slice(), r)) >= obs) ge++;
  const slope = (xs) => { const mx = mean(xs.map((x) => x.year)), my = mean(xs.map((x) => x.auc)); return xs.reduce((s, x) => s + (x.year - mx) * (x.auc - my), 0) / xs.reduce((s, x) => s + (x.year - mx) ** 2, 0); }, sl = []; for (let b = 0; b < 2000; b++) sl.push(slope(big.map(() => big[Math.floor(r() * big.length)]))); sl.sort((a, b) => a - b);
  out.era = { n: eras.map((e) => big.filter((x) => x.era === e).length), means: eMean(lab0).map((x) => round(x)), maxMinusMin: round(obs), permP: round((ge + 1) / 5001, 4), slopePerYear: round(slope(big), 5), slopeCi: [round(sl[50], 5), round(sl[1949], 5)] };
  out.big.list = big.map((x) => [x.key, round(x.auc)]);
}
if (part === "b1") {
  const NE = (sp) => SPL[sp].filter((k) => !EN(k)), recs = ["D", "C", "I"].flatMap((sp) => NE(sp).map((k) => { log(k); return dayRec(k, sp); }));
  const GR = { pooled: () => true, de: (r) => r.channel === "ubuntu-de", es: (r) => r.channel === "ubuntu-es", it: (r) => r.channel === "ubuntu-it" }, SP = { DC: (r) => r.split !== "I", D: (r) => r.split === "D", C: (r) => r.split === "C", I: (r) => r.split === "I", all: () => true };
  out.cells = {};
  for (const [gn, gf] of Object.entries(GR)) for (const [sn, sf] of Object.entries(SP)) {
    const rs = recs.filter((r) => gf(r) && sf(r)), P = rs.flatMap((r) => r.pairs); if (P.length < 10) continue; const s = sumPairs(P, ["ishare"], ["i", "len", "cl", "lc", "b", "rec"], `B1${gn}${sn}`), da = rs.filter((r) => r.nPairs >= 5).map((r) => pAuc(r.pairs, "ishare"));
    const lodo = rs.length >= 3 ? rs.map((x) => pAuc(rs.filter((r) => r !== x).flatMap((r) => r.pairs), "ishare")).filter((v) => v != null) : [];
    s.daysWithPairs = da.length; s.signFlipP = da.length >= 3 ? signFlipP(da) : null; s.lodoRange = lodo.length ? [round(Math.min(...lodo)), round(Math.max(...lodo))] : null; s.holds = s.n >= 60 && s.days >= 3 && s.auc.ishare >= 0.7 && (s.dayCi?.[0] ?? 0) >= 0.65; out.cells[`${gn}|${sn}`] = s; log(`${gn} ${sn} n=${s.n} days=${s.days} auc=${s.auc.ishare}`);
  }
  out.strat = {};
  for (const [gn, gf] of Object.entries(GR)) { const ds = ["D", "C"].flatMap((sp) => NE(sp)).map((k) => loadDay(k)).filter((d) => gf({ channel: d.channel })); if (ds.length < 2) continue; const s = sumStrat(strat(ds, "S0", { seed: "B1" + gn })); out.strat[gn] = s; log(`strat ${gn} cov=${s.covered} auc=${s.auc.ishare}`); }
}
if (part === "b2") {
  const keys = [...SETS.R, ...SETS.C].filter(EN), V = { base: {}, spoke1: { g: { minSpoke: 1 } }, spoke2: { g: { minSpoke: 2 } }, spoke5: { g: { minSpoke: 5 } }, spoke10: { g: { minSpoke: 10 } }, topicNone: { g: { topicShare: null } }, topic100: { g: { topicShare: 1 / 100 } }, topic1000: { g: { topicShare: 1 / 1000 } }, laterMsg: { m: { fpred: (f) => f.b >= 1 } }, cap1000: { m: { max: 1000 } }, seed2: { m: { seed: "m2" } }, seed3: { m: { seed: "m3" } }, seed4: { m: { seed: "m4" } } };
  out.cells = {};
  for (const [vn, v] of Object.entries(V)) { const P = []; let np = 0; for (const k of keys) { const d = loadDay(k, v.g ?? {}), m = matchDay(d, "S0", { max: 400, ...(v.m ?? {}) }); P.push(...m.pairs); np += m.nPos; } const s = sumPairs(P, ["ishare"], ["i", "len", "cl", "lc", "b", "rec"], "B2" + vn); s.nPosAll = np; out.cells[vn] = s; log(`${vn} n=${s.n} auc=${s.auc.ishare} nPos=${np}`); }
}
if (part === "b3") {
  const J = (f) => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8")), sc = J("../chat-scope/results/confirm.json"), cb = J("../confirm-R1_first_slot_share/results/b.json");
  const Phi = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp((-z * z) / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
  const p0 = (n) => 1 - Phi((0.7 - 0.5) / (0.5 / Math.sqrt(n))), tally = (cells) => { const cs = Object.values(cells).map((c) => c.used ?? c.full).filter((u) => u && u.n >= 60); return { cellsEvaluated: Object.keys(cells).length, nGe60: cs.length, nAuc70: cs.filter((u) => u.auc >= 0.7).length, expectedFalsePassesUnderH0: round(cs.reduce((s, u) => s + p0(u.n), 0), 5) }; };
  const scR1 = Object.fromEntries(Object.entries(sc.cells).filter(([k]) => k.startsWith("R1|LATER|")));
  out.mult = { scoperConfirm: tally(scR1), confirmerB: tally(cb.cells) };
  const K = Object.keys(sc.secondary["LATER|EN"]?.auc ?? {}).length, nEn = sc.cells["R1|LATER|EN|ALL"]?.full?.n ?? 2378; out.mult.discoveryColumns = { K, maxOfKnullAucAlpha05: round(0.5 + 2.58 * (0.5 / Math.sqrt(nEn))), note: "Bonferroni-ish z=2.58 for K~36; observed R1 discovery AUC 0.877 (n=2768)" };
  const TH = [0.5, 0.6, 0.67, 0.75, 0.8], bins = ["<150", "150-499", "500-1499", ">=1500"], NA = { R: {}, C: {}, D: {} }, PR = { R: [], C: [], D: [] };
  for (const sp of ["R", "C", "D"]) for (const k of SPL[sp].filter(EN)) {
    const d = loadDay(k), m = matchDay(d, "S0", { max: 400 }), ix = buildIx(d.T), b = sizeBin(d.T.length); PR[sp].push(...m.pairs);
    for (const th of TH) { const t = (NA[sp][`${th}|${b}`] ??= { tp: 0, fp: 0, fn: 0, tn: 0 }); for (const o of laterOccs(d)) { const f = feat(ix, o.k, o.w).ishare >= th, y = o.cls === "P"; t[y ? (f ? "tp" : "fn") : f ? "fp" : "tn"]++; } } log(sp + " " + k);
  }
  out.threshold = {}; out.natural = {};
  for (const sp of ["R", "C", "D"]) { out.threshold[sp] = {}; for (const th of TH) { const P = PR[sp]; out.threshold[sp][th] = { n: P.length, tpr: round(P.filter((p) => p.pos.ishare >= th).length / P.length), fpr: round(P.filter((p) => p.neg.ishare >= th).length / P.length) }; }
    out.natural[sp] = {}; for (const th of TH) for (const b of bins) { const t = NA[sp][`${th}|${b}`]; if (t) out.natural[sp][`${th}|${b}`] = { ...t, precision: round(t.tp / Math.max(1, t.tp + t.fp)), recall: round(t.tp / Math.max(1, t.tp + t.fn)) }; } }
  out.thetaBar = { R_fpr067: out.threshold.R[0.67].fpr, R_tpr067: out.threshold.R[0.67].tpr, ok: out.threshold.R[0.67].fpr <= 0.2 && out.threshold.R[0.67].tpr >= 0.5, R_bigPrecision: out.natural.R["0.67|>=1500"]?.precision };
}
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/B.${part}.json`, import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ part, sha: SHA, seconds: out.seconds }));
