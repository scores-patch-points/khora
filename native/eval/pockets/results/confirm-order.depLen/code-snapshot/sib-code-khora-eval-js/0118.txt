// eval/law/provisional/confirm-relatedness-sister-dyads/posthoc.mjs — POST-HOC DIAGNOSTICS on the transfer matrices already produced by confirm.mjs (results/transfer-*.json). NO verdict input, NO threshold:
// descriptive numbers that locate WHERE the sister effect sits. Pre-registration (disclosure): written AFTER confirm.mjs verdict was read (FIRST-LEFT PARTIAL: IWR 29/30, NGm 6/6, CWGm 2/6, Hind 1/2; pooled
// out-of-scope 1/28; position 0.5004, sham 0.5009, shuffled 0.531; header sha256 of confirm.mjs cfdb91c6...). Everything below is exploratory and must not be quoted as a confirmed result.
//   D1 SHUFFLED CONTRAST: the same relatedness contrast (AUC(d->t) - mean AUC from non-genus donors) computed on the within-sentence-SHUFFLED target windows with the same donor probes. If the sister effect is company,
//      it must collapse here. Expected (blind): mean shuffled contrast within +/-0.02 of 0 (real contrast 0.068).
//   D2 BOUNDARY TABLE: for targets outside the registered clusters (ron = Eastern Romance, eng = Anglo-Frisian, ext isl/fao/bel) the mean AUC from the in-scope sister donors vs their control, to see where the effect
//      ends (genus but not sub-branch). Expected (blind): positive but smaller than in-cluster (the gradient's sameGenusNotSub +0.04).
//   D3 SUB-CLUSTER VIEW of CWGm and Hind: per-dyad diff and which dyads clear AUC >= 0.60 / diff >= 0.05 separately (the rule's two conditions), for FIRST-LEFT and LATER-BOTH.
//   D4 EFFECT vs PASS: for every cell, the mean contrast (AUC - ctrl) in each in-scope cluster, irrespective of the 0.60 bar (LATER-BOTH contrast was +0.076 in the verdict).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, EXT, round, mean, quantile, rngFor, seedFor, sha256 } from "./fresh.mjs";
import { headerHash } from "../family-vs-relatedness/lib.mjs";
import { genus } from "../family-vs-relatedness/groups.mjs";
import { sub } from "../family-vs-relatedness/subbranch.mjs";
import { IN_SCOPE, boot } from "./verdict.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results"), GEN = (s) => EXT[s]?.[1] ?? genus(s), CL = (s) => sub(s) ?? EXT[s]?.[2] ?? null;
const load = (c) => JSON.parse(fs.readFileSync(path.join(RES, `transfer-${c}.json`), "utf8")), rnd = () => rngFor(seedFor("conf-rel-sister", "posthoc"));
const ctrlOf = (M, t) => mean(Object.keys(M).filter((x) => x !== t && GEN(x) !== GEN(t) && M[x]?.[t] != null).map((x) => M[x][t]));
const out = { headerSha256: headerHash(SELF), cells: {} };
for (const cell of ["FIRST-LEFT", "FIRST-BOTH", "LATER-BOTH"]) {
  const X = load(cell), c = { perCluster: {}, shuffled: {}, boundary: {} };
  const dy = []; for (const d of Object.keys(X.A)) for (const t of Object.keys(X.A[d])) if (d !== t && !EXT[d] && !EXT[t] && IN_SCOPE.includes(CL(d)) && CL(d) === CL(t)) dy.push({ d, t, cl: CL(t), auc: X.A[d][t], real: X.A[d][t] - ctrlOf(X.A, t), shuf: X.SH[d][t] == null ? null : X.SH[d][t] - ctrlOf(X.SH, t), shufAuc: X.SH[d][t] });
  for (const cl of IN_SCOPE) {
    const v = dy.filter((x) => x.cl === cl), byT = {}; for (const x of v) (byT[x.t] ??= []).push(x);
    c.perCluster[cl] = { n: v.length, meanAuc: round(mean(v.map((x) => x.auc))), meanContrast: round(mean(v.map((x) => x.real))), meanShufContrast: round(mean(v.filter((x) => x.shuf != null).map((x) => x.shuf))), meanShufAuc: round(mean(v.filter((x) => x.shufAuc != null).map((x) => x.shufAuc))),
      aucAtLeast60: v.filter((x) => x.auc >= 0.6).length, contrastAtLeast05: v.filter((x) => x.real >= 0.05).length, dyads: v.map((x) => `${x.d}>${x.t} auc ${round(x.auc)} contrast ${round(x.real)} shufContrast ${round(x.shuf)}`) };
  }
  const tm = (k) => { const by = {}; for (const x of dy) (by[x.t] ??= []).push(x[k]); return Object.values(by).map((a) => mean(a.filter((z) => z != null))); };
  c.shuffled = { real: boot(tm("real"), 2000, rnd()), shuffledContrast: boot(tm("shuf"), 2000, rnd()), shuffledAucMean: round(mean(dy.filter((x) => x.shufAuc != null).map((x) => x.shufAuc))) };
  // D2 boundary: targets outside the registered clusters, donors = in-scope sister languages of the cluster the target is related to
  const BT = { ron: ["spa", "por", "glg", "cat", "fra", "ita"], eng: ["dan", "nob", "swe", "deu", "nld", "afr"], isl: ["dan", "nob", "swe"], fao: ["dan", "nob", "swe"], bel: ["rus", "ukr"] };
  for (const [t, donors] of Object.entries(BT)) {
    if (!X.targets.includes(t)) continue; const v = donors.filter((d) => X.A[d]?.[t] != null).map((d) => X.A[d][t]);
    c.boundary[t] = { donors: donors.length, meanAuc: round(mean(v)), ctrl: round(ctrlOf(X.A, t)), contrast: round(mean(v) - ctrlOf(X.A, t)), shufContrast: X.SH[donors[0]]?.[t] == null ? null : round(mean(donors.filter((d) => X.SH[d]?.[t] != null).map((d) => X.SH[d][t])) - ctrlOf(X.SH, t)), pairs: X.pairs[t] };
  }
  out.cells[cell] = c;
}
fs.writeFileSync(path.join(RES, "posthoc.json"), JSON.stringify(out, null, 1));
for (const [cell, c] of Object.entries(out.cells)) { console.log(cell, "shuffled", JSON.stringify(c.shuffled)); for (const [cl, v] of Object.entries(c.perCluster)) console.log("  ", cl, v.n, "auc", v.meanAuc, "contrast", v.meanContrast, "shufContrast", v.meanShufContrast, "auc>=.60", v.aucAtLeast60, "contrast>=.05", v.contrastAtLeast05); console.log("  boundary", JSON.stringify(c.boundary)); }
