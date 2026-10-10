// eval/law/provisional/attack-relatedness-sister-dyads/attackD.mjs — ATTACK D (SCOPE LIMITS: training size, donor text source, ceiling-normalised sub-branch effect) on rule "relatedness-sister-dyads".
//   NAME_COMPANY_PAIRBLOCK=1 node attackD.mjs      (writes results/attackD.json; needs data/base; never pass "run" as argv[2])
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═════════════════════════════════════════════════════════════
// DISCLOSURE. attackA/B/C.mjs HAVE RUN (headers recorded in their result files). Seen: the sister effect survives every leakage/matching variant and the donor-free rivals (best fixed score 0.586 direction-free vs sister 0.641; cheap-statistic
//   donors 0.589; supervised out-of-split non-genus donors 0.60-0.61 vs sister 0.64); IWR+NGm own-language ceiling 0.658 (sister recovers 0.89 of it above chance); per split contrast IWR+NGm +0.078 (window A), +0.073 (B), +0.076 (dev),
//   +0.052 (scoper test->test), +0.082/+0.071 (halves of A); on the scoper's test->test split IWR passes only 14/30 (contrast +0.048) while CWGm 4/6 (+0.077), Hind 2/2 (+0.081), Celtic 2/2 (+0.066) pass there; Hindustani is in scope on
//   5/6 splits, NGm 3/5, CWGm 1/6, Celtic 2/5. Seen: test pair counts (spa 600, por 600, glg 268, cat 600, fra 384, ita 413, dan 378, nob 600, swe 120, deu 600, nld 305, afr 107, hin 600, urd 600) and the scoper's form-A table
//   headline (IWR 24/30, NGm 3/4, CWGm 2/4, Hind 2/2). NOT SEEN: any learning-curve number, any per-target own-language ceiling outside the 9 IWR+NGm targets, any ceiling-normalised cluster effect.
// QUESTION. (D1) Is the +0.078 an artefact of the donor's training size? (D2) Why is the scoper's test->test effect smaller: donors or targets? (D3) The rule says it does NOT hold in Slavic, Baltic, Finnic, Sinitic, and the pass bar is an
//   absolute AUC >= 0.60: in clusters whose own-language ceiling is low, no donor can pass. Is the negative scope claim informative, or is it a ceiling artefact?
// DESIGN. D1: window A FIRST-LEFT, donors train on cap in {25, 50, 100, 200, 400} pairs (donor eligibility 100 pairs for cap <= 100, else cap pairs; same targets), 6 draws, registered probe; contrast of IWR+NGm (target bootstrap B = 2000).
//   D2: from family-vs-relatedness/results/sister-confirm.json (form A: DEV donors -> TEST targets, dyad table) and confirm-FIRST-LEFT.json (form B: TEST donors -> TEST targets): for IWR+NGm per target mean AUC and mean contrast of each form.
//   D3: own-language 4-block leave-block-out AUC (LEFT, 100 training pairs from the other blocks, 3 draws) for every language with >= 60 training pairs and >= 20 test pairs in a block; per target t: ceiling_t, ctrl_t (window A, mean of
//   non-genus donors), sister_t (mean over in-cluster donors); recoverable gain g_t = ceiling_t - ctrl_t; informative target iff g_t >= 0.04; recovered fraction r_t = (sister_t - ctrl_t) / g_t. Cluster verdicts: POSITIVE iff >= 2 informative
//   targets and mean r >= 0.6; NEGATIVE-INFORMATIVE iff >= 2 informative targets and mean r < 0.35; UNINFORMATIVE iff < 2 informative targets; MIXED otherwise.
// THRESHOLDS (fixed now; may be tightened, never loosened). D1: the effect is ROBUST TO SMALL TRAINING iff contrast(cap 50) >= 0.05; the +0.078 is a LOWER BOUND (effect still growing) iff contrast(cap 400) >= contrast(cap 100) + 0.02.
//   D2: donors explain the gap iff the mean contrast of form A minus form B is >= 0.015 (target effect otherwise). D3 as above; the negative claim for a cluster is INFORMATIVE only if its verdict is NEGATIVE-INFORMATIVE.
// BLIND PREDICTIONS. PD1 contrast(25) in [0.03, 0.06], (50) in [0.05, 0.072], (200) >= 0.08, (400) >= 0.085: the sister advantage grows with training size (lower bound). PD2 donors explain the gap (form A contrast ~ 0.07, form B ~ 0.05).
//   PD3 IWR and NGm POSITIVE; CWGm UNINFORMATIVE or MIXED (German ceiling low); WSl and Finnic and Sinitic UNINFORMATIVE or NEGATIVE-INFORMATIVE with at least one UNINFORMATIVE; SSl NEGATIVE-INFORMATIVE or MIXED; Hind MIXED or POSITIVE.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, HERE, STEMS, IN_SCOPE, sub, genus, headerHash, sha256, mean, round, boot, rs, dyadsOf, aucOf, fitProbe } from "./lib.mjs";
import { loadCfg, transferMatrix } from "./transfer.mjs";
import { CLUSTERS } from "../family-vs-relatedness/subbranch.mjs";

const SELF = fileURLToPath(import.meta.url), FVR = path.join(HERE, "..", "family-vs-relatedness", "results"), cl = (s) => sub(s) ?? null, G = (s) => genus(s), inS = (d, t) => ["IWR", "NGm"].includes(cl(d)) && cl(d) === cl(t);
const out = { headerSha256: headerHash(SELF), codeSha256: sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]) };
const save = () => fs.writeFileSync(path.join(RES, "attackD.json"), JSON.stringify(out, null, 1));
const L0 = loadCfg("base"), conf = JSON.parse(fs.readFileSync(path.join(HERE, "..", "confirm-relatedness-sister-dyads", "results", "transfer-FIRST-LEFT.json"), "utf8")), M0 = { A: conf.A, P: conf.P, S: conf.S, pairs: conf.pairs };
// D1
out.D1 = {};
for (const cap of [25, 50, 100, 200, 400]) {
  const M = cap === 100 ? M0 : transferMatrix(L0, { arm: "LEFT", seed: "atkD1", cap, minDonor: Math.max(100, cap) }), dy = dyadsOf(M, inS), byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff);
  out.D1[cap] = { donors: Object.keys(M.A).length, n: dy.length, meanAuc: round(mean(dy.map((x) => x.auc))), meanCtrl: round(mean(dy.map((x) => x.ctrl))), contrast: boot(Object.values(byT).map(mean), 2000, rs("d1", cap)), nPass: dy.filter((x) => x.pass).length };
  console.error("D1 cap", cap, JSON.stringify(out.D1[cap])); save();
}
out.D1.robustSmall = out.D1[50].contrast.mean >= 0.05; out.D1.lowerBound = out.D1[400].contrast.mean >= out.D1[100].contrast.mean + 0.02; save();
// D2
{ const sc = JSON.parse(fs.readFileSync(path.join(FVR, "sister-confirm.json"), "utf8")), fA = sc.cells["FIRST-LEFT"].formA.table, byT = {};
  for (const c of ["IWR", "NGm"]) for (const x of fA[c].dyads) (byT[x.t] ??= { A: [], B: [] }).A.push(x);
  const tb = JSON.parse(fs.readFileSync(path.join(FVR, "confirm-FIRST-LEFT.json"), "utf8")), XB = { A: tb.dyad.A, P: tb.dyad.P, S: tb.dyad.S, pairs: Object.fromEntries(Object.entries(tb.own).map(([t, o]) => [t, o.pairs])) };
  for (const x of dyadsOf(XB, inS)) (byT[x.t] ??= { A: [], B: [] }).B.push(x);
  const per = Object.fromEntries(Object.entries(byT).map(([t, v]) => [t, { formA: { n: v.A.length, auc: round(mean(v.A.map((x) => x.auc))), diff: round(mean(v.A.map((x) => x.diff))) }, formB: { n: v.B.length, auc: round(mean(v.B.map((x) => x.auc))), diff: round(mean(v.B.map((x) => x.diff))) } }]));
  const both = Object.values(per).filter((v) => v.formA.n && v.formB.n); out.D2 = { perTarget: per, meanDiffFormA: round(mean(both.map((v) => v.formA.diff))), meanDiffFormB: round(mean(both.map((v) => v.formB.diff))), gap: round(mean(both.map((v) => v.formA.diff - v.formB.diff))), donorsExplainGap: mean(both.map((v) => v.formA.diff - v.formB.diff)) >= 0.015 };
  console.error("D2", out.D2.meanDiffFormA, out.D2.meanDiffFormB, out.D2.gap); save(); }
// D3
const ownAuc = (L, t) => { const folds = [];
  for (let b = 0; b < 4; b++) { const pairsTr = [], te = []; for (let k = 0; k < L.pairs; k++) { if (L.block[2 * k] === b) te.push(2 * k, 2 * k + 1); else pairsTr.push(k); } if (pairsTr.length < 60 || te.length < 40) continue;
    const a = []; for (let r = 0; r < 3; r++) { const rnd = rs("d3", t, b, r), sh = pairsTr.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } const idx = sh.slice(0, 100).flatMap((k) => [2 * k, 2 * k + 1]), f = fitProbe([{ L, idx }], "LEFT"); if (!f) continue; const v = aucOf(f(te.map((i) => L.X.LEFT[i])), te.map((i) => L.y[i])); if (v != null) a.push(v); }
    if (a.length) folds.push(mean(a)); }
  return folds.length >= 2 ? mean(folds) : null; };
{ const rows = {};
  for (const t of Object.keys(L0)) { if (!conf.pairs[t] || conf.pairs[t] < 60 || !cl(t)) continue; const own = ownAuc(L0[t], t); if (own == null) continue;
    const ng = Object.keys(M0.A).filter((x) => x !== t && G(x) !== G(t) && M0.A[x]?.[t] != null).map((x) => M0.A[x][t]), sis = Object.keys(M0.A).filter((d) => d !== t && cl(d) === cl(t) && M0.A[d]?.[t] != null).map((d) => M0.A[d][t]);
    if (!sis.length || !ng.length) continue; const ctrl = mean(ng), sister = mean(sis), g = own - ctrl; rows[t] = { cluster: cl(t), ceiling: round(own), ctrl: round(ctrl), sister: round(sister), gain: round(g), informative: g >= 0.04, recovered: g >= 0.04 ? round((sister - ctrl) / g) : null, sisterPass: sister >= 0.6 }; }
  const per = {}; for (const [c] of CLUSTERS) { const v = Object.entries(rows).filter(([, r]) => r.cluster === c), inf = v.filter(([, r]) => r.informative), mr = inf.length ? mean(inf.map(([, r]) => r.recovered)) : null;
    per[c] = { targets: v.length, informative: inf.length, meanRecovered: mr == null ? null : round(mr), meanCeiling: v.length ? round(mean(v.map(([, r]) => r.ceiling))) : null, meanSister: v.length ? round(mean(v.map(([, r]) => r.sister))) : null, meanCtrl: v.length ? round(mean(v.map(([, r]) => r.ctrl))) : null, verdict: inf.length < 2 ? "UNINFORMATIVE" : mr >= 0.6 ? "POSITIVE" : mr < 0.35 ? "NEGATIVE-INFORMATIVE" : "MIXED" }; }
  out.D3 = { perTarget: rows, perCluster: per }; save();
  console.error("D3", Object.entries(per).filter(([, v]) => v.targets).map(([c, v]) => `${c} ${v.verdict} inf ${v.informative}/${v.targets} r ${v.meanRecovered} ceil ${v.meanCeiling} sis ${v.meanSister} ctrl ${v.meanCtrl}`).join(" | ")); }
save(); console.log("D done");
