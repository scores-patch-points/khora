// eval/law/provisional/attack-relatedness-sister-dyads/transfer.mjs — donor -> target transfer matrices of the confirmer's design (single donor, CAP 100 pairs, 6 draws, ridge-logistic probe), for any
// set of language objects (feat.mjs langOf), any arm, with position and sham controls. NEW FILE; a library (the tests and their frozen headers are in attackA/B/C.mjs).
import fs from "node:fs";
import path from "node:path";
import { rngFor, seedFor, round, mean, fitProbe, pairSample, aucOn, aucOf, dyadsOf, boot, rs, DATA, STEMS } from "./lib.mjs";
import { langOf } from "./feat.mjs";

export const CAP = 100, MIN_DONOR = 100, MIN_TARGET = 60, DRAWS = 6;
/** load a cached configuration (data/<cfg>/<stem>.json = {pairs, rows}) as language objects. */
export function loadCfg(cfg, stems = STEMS) {
  const L = {}; for (const s of stems) { const f = path.join(DATA, cfg, `${s}.json`); if (!fs.existsSync(f)) continue; const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.rows.length) L[s] = langOf(s, j.rows); }
  return L;
}
/** transfer matrix. opts: arm, trainArm (default arm), seed ("conf" reproduces the confirmer's seeds of FIRST-LEFT; any other string = own), draws, donors, targets, withControls, evalLangs (alternative language objects to score on, e.g. shuffled targets),
 *  trainLangs (alternative language objects to train on). Returns {A, P, S, pairs, donors, targets}. */
export function transferMatrix(langs, o = {}) {
  const arm = o.arm ?? "LEFT", draws = o.draws ?? DRAWS, tr = o.trainLangs ?? langs, ev = o.evalLangs ?? langs, seed = o.seed ?? "atk";
  const cap = o.cap ?? CAP, D = o.donors ?? Object.keys(tr).filter((s) => tr[s].pairs >= (o.minDonor ?? MIN_DONOR)), T = o.targets ?? Object.keys(ev).filter((s) => ev[s].pairs >= MIN_TARGET), A = {}, P = {}, S = {};
  const rsd = (d, r) => (seed === "conf" ? rngFor(seedFor("conf-rel-sister", "tr", "FIRST-LEFT", d, r)) : rs("tr", seed, d, r));
  for (const d of D) {
    if (!tr[d]) continue; A[d] = {}; P[d] = {}; S[d] = {}; const acc = {}, accP = {}, accS = {};
    for (let r = 0; r < draws; r++) {
      const rnd = rsd(d, r), idx = pairSample(tr[d], Math.min(cap, tr[d].pairs), rnd), pt = { L: tr[d], idx }, f = fitProbe([pt], arm);
      let fp = null, fsh = null;
      if (o.withControls) { const y2 = tr[d].y.slice(); for (let k = 0; k < idx.length; k += 2) if (rnd() < 0.5) { y2[idx[k]] = 1 - y2[idx[k]]; y2[idx[k + 1]] = 1 - y2[idx[k + 1]]; } fp = fitProbe([pt], "POSITION"); fsh = fitProbe([{ L: { ...tr[d], y: y2 }, idx }], arm); }
      for (const t of T) {
        if (t === d || !ev[t]) continue; (acc[t] ??= []).push(aucOn(f, ev[t], arm));
        if (o.withControls) { (accP[t] ??= []).push(aucOn(fp, ev[t], "POSITION")); (accS[t] ??= []).push(aucOn(fsh, ev[t], arm)); }
      }
    }
    const mn = (a) => { const v = (a ?? []).filter((x) => x != null); return v.length ? round(mean(v)) : null; };
    for (const t of Object.keys(acc)) { A[d][t] = mn(acc[t]); if (o.withControls) { P[d][t] = mn(accP[t]); S[d][t] = mn(accS[t]); } }
  }
  return { A, P, S, SH: {}, FL: {}, pairs: Object.fromEntries(T.filter((t) => ev[t]).map((t) => [t, ev[t].pairs])), donors: D, targets: T };
}
/** a single in-scope selector: same textbook sub-branch cluster in IN_SCOPE, both roster. */
export const sameCluster = (cl, scope) => (d, t) => scope.includes(cl(d)) && cl(d) === cl(t);
/** summary of a dyad list: pass counts per cluster, pooled, target-bootstrap of the contrast, mean position/sham. */
export function summarize(dy, tag) {
  const byC = {}; for (const x of dy) (byC[x.cluster] ??= []).push(x);
  const per = Object.fromEntries(Object.entries(byC).map(([c, v]) => [c, { n: v.length, nPass: v.filter((x) => x.pass).length, auc: round(mean(v.map((x) => x.auc))), ctrl: round(mean(v.map((x) => x.ctrl))), diff: round(mean(v.map((x) => x.diff))) }]));
  const byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff);
  const m = (k) => { const v = dy.map((x) => x[k]).filter((x) => x != null); return v.length ? round(mean(v)) : null; };
  return { n: dy.length, nPass: dy.filter((x) => x.pass).length, frac: round(dy.length ? dy.filter((x) => x.pass).length / dy.length : 0), meanAuc: round(mean(dy.map((x) => x.auc))), meanCtrl: round(mean(dy.map((x) => x.ctrl))), diff: boot(Object.values(byT).map(mean), 2000, rs("boot", tag)), pos: m("pos"), sham: m("sham"), perCluster: per, perTarget: Object.fromEntries(Object.entries(byT).map(([t, v]) => [t, round(mean(v))])) };
}
export { dyadsOf, boot, aucOf };
