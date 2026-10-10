// posthoc2.mjs: POST-HOC second application of the clauses registered in confirm.mjs (a)-(f) to WINDOW 2 (results/collect.w2.json) and to the average of the two windows, plus the non-IE gradient.   node posthoc2.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: POST-HOC, written after replicate.verdict.json was seen (H1 holds rho 0.529; H2 narrowly fails 0.696 < 0.70; H3 holds; H4 holds rho 0.642; H5 fails 2 of 4; H6 fails on the deaf-zone parts; H7 holds). Nothing here changes any registered verdict.
// WHAT: the SAME clause code and thresholds as confirm.mjs (copied verbatim: a rho >= 0.40 & p <= 0.05; b frozen skill >= 0.10; c in-scope audible share >= 0.70 / out-of-scope <= 0.50 among >= 250 pairs; d in-out >= 0.04; e clean zone >= 0.70;
//   f S2 sub-rule) applied to window 2 of the 28 new languages (P2), of the old 25 (S2set) and pooled, and to the per-language mean of the two windows; plus Spearman(FWC32, AUC) within non-IE and IE languages for window 2 and the average.
//   The scope variable of the averaged table is the mean of the two windows' FWC32. Eligibility as in confirm.mjs (>= 60 pairs, POSITION in band; cmn-hans excluded).
// BLIND PREDICTION: window 2 passes a (rho 0.53), probably fails or marginally passes c/d; non-IE pooled rho > 0.3 (n about 13).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, round, mean, share, headerSha, spearman, permRho, bootRho, rmse } from "./lib.mjs";
const rd = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")), inBand = (x) => x >= 0.45 && x <= 0.55;
const T = 0.2378, DEVMEAN = 0.62359, MODEL = (f) => 0.623591 + (0.038715 * (f - 0.303335)) / 0.10758, DUP = new Set(["cmn-hans"]);
const NONIE = new Set("arb heb mlt cmn lzh jpn kor vie ind tur uig fin est hun eus kat tam tel wol".split(" "));
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

const NEWN = new Set(rd("results/collect.new.json").rows.map((r) => r.name)), W1 = [...rd("results/collect.new.json").rows, ...rd("results/collect.old.json").rows], W2 = rd("results/collect.w2.json").rows;
const ok = (r) => !r.error && !r.thin && !DUP.has(r.name) && inBand(r.position), e2 = W2.filter(ok), by1 = new Map(W1.map((r) => [r.name, r]));
const avg = e2.filter((r) => by1.has(r.name) && ok(by1.get(r.name))).map((r) => { const o = by1.get(r.name); return { name: r.name, fwc32: (r.fwc32 + o.fwc32) / 2, auc: (r.auc + o.auc) / 2, pairs: r.pairs + o.pairs, S1: (r.S1 + o.S1) / 2, S2: (r.S2 + o.S2) / 2, S3: (r.S3 + o.S3) / 2 }; });
const sub = (rows, f) => rows.filter(f), brief = (c) => ({ n: c.n, a: c.a_rho, b: c.b_skill, c: c.c_scope, d: c.d_sep, e: c.e_zone28, f: { inMean: c.f_S2?.inMean, share50: c.f_S2?.inShareAbove50, diff: c.f_S2?.diff, pass: c.f_S2?.pass }, gates: c.gates, zones: c.zones.map((z) => z.zone + " n" + z.n + " aud" + z.audibleShare + " m" + z.meanAuc) });
const sr = (rows) => { if (rows.length < 5) return { n: rows.length }; const pm = permRho(rows.map((r) => r.fwc32), rows.map((r) => r.auc), 5000); return { n: rows.length, rho: round(pm.rho, 3), p: round(pm.p, 4), ci95: bootRho(rows.map((r) => r.fwc32), rows.map((r) => r.auc)).map((x) => round(x, 3)), meanAuc: round(mean(rows.map((r) => r.auc))), audible: rows.filter((r) => r.auc >= 0.6).length }; };
const R = { headerSha256: headerSha(import.meta.url), status: "POST-HOC", window2: { P2: brief(clauses(sub(e2, (r) => NEWN.has(r.name)))), S2set: brief(clauses(sub(e2, (r) => !NEWN.has(r.name)))), pooled: brief(clauses(e2)) }, averaged: { pooled: brief(clauses(avg)), P: brief(clauses(sub(avg, (r) => NEWN.has(r.name)))) },
  nonIE: { window2: sr(sub(e2, (r) => NONIE.has(r.name))), averaged: sr(sub(avg, (r) => NONIE.has(r.name))), window2IE: sr(sub(e2, (r) => !NONIE.has(r.name))), averagedIE: sr(sub(avg, (r) => !NONIE.has(r.name))) }, nonIEavgList: sub(avg, (r) => NONIE.has(r.name)).map((r) => r.name + ":" + round(r.fwc32, 3) + "/" + round(r.auc, 3)).join(" ") };
const SL = new Set("rus pol ukr ces slk hrv srp slv bul".split(" ")); R.slavicAveraged = sr(sub(avg, (r) => SL.has(r.name)));
fs.writeFileSync(process.argv[2], JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
