// eval/law/provisional/attack-relatedness-sister-dyads/attackB.mjs — ATTACK B (FORKING PATHS, SCOPE SELECTION, MULTIPLICITY, CONTROL DEFINITION) on rule "relatedness-sister-dyads".
//   NAME_COMPANY_PAIRBLOCK=1 node attackB.mjs      (writes results/attackB.json; needs data/base and data/B built by build.mjs; never pass "run" as argv[2])
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═════════════════════════════════════════════════════════════
// DISCLOSURE. attackA.mjs had ALREADY RUN (header sha256 recorded in results/attackA.json): the effect survives every leakage/matching variant (IWR+NGm contrast +0.067..+0.097; gate: the confirmer's matrix reproduced exactly);
//   Celtic (cym-gle, 2 dyads) passed 2/2 under strict and ultra matching (contrast +0.073, +0.087) and 1/2 under surface tokens, 0/2 under the coarse matching. Seen from the confirmer's files: transfer-FIRST-LEFT.json is the
//   full AUC matrix of the fresh train window A (I know in-scope pass counts from the task text); the scoper's dev matrix (family-vs-relatedness/results/discovery-FIRST-LEFT.json dyad.A, 45 donors) and test form-B matrix
//   (confirm-FIRST-LEFT.json, test donors -> test targets) are opened HERE for the first time as matrices (I know the scoper's headline pass counts from the rule text: dev 30/36, test form A 31/40). NOT SEEN: any
//   permutation reference, any leave-one-language-out number, any alternative-control contrast, any relation-class AUC mean, any trainB / half-window matrix.
// QUESTION. (B1) The scope (IWR, NGm, CWGm, Hind) was chosen after hand-picked pairs were looked at, then narrowed again (IWR+NGm) on the confirmation data. Is the scope a stable property across independent splits or a lucky
//   subset? (B2) Multiplicity: do the number of clusters, strata and languages tested explain the pass counts? (B3) Pseudo-replication: 36 dyads are 9 targets; is the pass fraction carried by one language? (B4) Does the
//   headline +0.07 depend on the control definition (mean of ALL donors outside the genus, i.e. a mixture of other Indo-European and non-Indo-European donors)?
// SPLITS (FIRST stratum, LEFT arm, single donor 100 pairs, 6 draws, ridge probe): S_dev (scoper dev matrix), S_testB (scoper test -> test matrix), S_trainA (confirmer's window A matrix, filtered to roster targets), S_trainB
//   (window B recomputed by me from data/B, 25 languages), S_A1 and S_A2 (window A rows split by position block: blocks {0,1} vs {2,3}, i.e. disjoint halves of the text; donors need >= 100 pairs). Same pass definition as the confirmer
//   (AUC >= 0.60, > analytic q95, >= 0.05 above the mean of donors outside the genus), computed with the confirmer's dyadsOf.
// ANALYSES AND THRESHOLDS (fixed now; may be tightened, never loosened).
//   B1 SCOPE STABILITY. On every split apply the scoper's fixed criterion to all 13 textbook clusters (>= 2 eligible dyads and >= 70% pass). STABLE iff IWR is in scope on >= 5 of 6 splits and NGm on >= 4 of the splits where it has
//      >= 2 eligible dyads. Report how often every other cluster is in scope (a cluster in scope on >= 3 splits would WIDEN the scope).
//   B2 OUT-OF-SPLIT. Scope derived on one split by the criterion, then its pooled pass fraction on every other split: the rule needs >= 0.60 for the IWR+NGm scope on every other split.
//   B3 JACKKNIFE BY LANGUAGE. IWR+NGm with each of its 9 languages removed (as donor and target, ctrl recomputed) on S_trainA, S_trainB, S_dev, S_testB: minimum pass fraction >= 0.70 and minimum mean contrast >= 0.05.
//      TARGET-LEVEL: a target "carries" the rule iff its mean in-cluster contrast >= 0.05; report k/9; sign test p of mean contrast > 0.03 over targets.
//   B4 MULTIPLICITY REFERENCE. (a) base rate of the dyad pass among dyads of other relation classes (cross-genus, same genus other sub-branch, other-family). (b) PERMUTATION of language labels over the 13 clusters (sizes kept,
//      5000 draws, languages drawn from the roster languages that are donor and target in the split): statistics = pooled pass fraction over all cluster dyads, number of clusters in scope, pass fraction of the size-6 cluster.
//      The observed value must exceed the 99th percentile of the null on S_trainA and S_dev for the pass count not to be explained by multiplicity. (c) threshold-free: AUC of the contrast (AUC - ctrl) separating same-sub-branch dyads
//      (IWR+NGm) from different-genus dyads.
//   B5 CONTROL DEFINITION. Contrast of IWR+NGm dyads against alternative controls from the same matrix: registered (mean over all donors outside the genus), median, mean of the 3 best non-genus donors, best non-genus donor,
//      mean over non-genus INDO-EUROPEAN donors only, mean over non-Indo-European donors only. Also relation-class mean AUC per target (sameSub, sameGenusNotSub, sameFamilyOnly, otherFamily). The effect-size claim "+0.07 above
//      donors outside the genus" is NARROWED if the contrast against non-genus Indo-European donors is < 0.05 (the registered pass margin) on S_trainA.
//   B6 AUDIT of the confirmer's freezing: header sha256 recomputed vs recorded, verdict.mjs sha256 vs recorded, file mtimes (header/code before results), rule thresholds vs confirm.mjs thresholds.
// BLIND PREDICTIONS. PB1 IWR in scope on 6/6 splits, NGm on >= 3 of its eligible splits, CWGm on <= 3, Hind on <= 4, Celtic on <= 2, every other cluster on <= 1. PB2 each split's own-scope pass fraction on other splits >= 0.60 for IWR+NGm.
//   PB3 jackknife minimum pass fraction >= 0.85 on S_trainA, >= 0.70 on S_dev; minimum contrast >= 0.06. PB4 permutation p < 0.001 on S_trainA and S_dev, base rate of cross-genus pass < 0.08. PB5 contrast against non-genus
//   Indo-European donors is 0.035-0.055 (the confirmer's own gradient regression has sameFamilyOnly at +0.04), against non-Indo-European donors >= 0.10; sister AUC beats the best single non-genus donor in >= 60% of IWR+NGm dyads.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, HERE, IN_SCOPE, sub, genus, headerHash, sha256, mean, round, boot, rs, quantile, dyadsOf, EXT, rngFor, seedFor, shuffleIn, q95n } from "./lib.mjs";
import { loadCfg, transferMatrix, summarize } from "./transfer.mjs";
import { langOf } from "./feat.mjs";
import { fam } from "../family-vs-relatedness/groups.mjs";
import { CLUSTERS } from "../family-vs-relatedness/subbranch.mjs";

const SELF = fileURLToPath(import.meta.url), FVR = path.join(HERE, "..", "family-vs-relatedness", "results"), CONFD = path.join(HERE, "..", "confirm-relatedness-sister-dyads");
const cl = (s) => sub(s) ?? null, G = (s) => genus(s), isIE = (s) => fam(s) === "Indo-European";
const out = { headerSha256: headerHash(SELF), codeSha256: sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]) };
const save = () => fs.writeFileSync(path.join(RES, "attackB.json"), JSON.stringify(out, null, 1));
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
// ── splits ──
const splits = {};
{ const d = rd(path.join(FVR, "discovery-FIRST-LEFT.json")); splits.S_dev = { A: d.dyad.A, P: d.dyad.P, S: d.dyad.S, pairs: Object.fromEntries(Object.entries(d.own).map(([t, o]) => [t, o.pairs])) }; }
{ const d = rd(path.join(FVR, "confirm-FIRST-LEFT.json")); splits.S_testB = { A: d.dyad.A, P: d.dyad.P, S: d.dyad.S, pairs: Object.fromEntries(Object.entries(d.own).map(([t, o]) => [t, o.pairs])) }; }
{ const d = rd(path.join(CONFD, "results", "transfer-FIRST-LEFT.json")); const keep = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !EXT[k])); splits.S_trainA = { A: Object.fromEntries(Object.entries(d.A).map(([k, v]) => [k, keep(v)])), P: d.P, S: d.S, pairs: keep(d.pairs) }; }
{ const LB = loadCfg("B"); splits.S_trainB = transferMatrix(LB, { arm: "LEFT", seed: "atk", withControls: true }); }
{ const L = loadCfg("base"), half = (blocks) => Object.fromEntries(Object.entries(L).map(([s, l]) => [s, langOf(s, l.rows.filter((r) => blocks.includes(r[1])))]));
  splits.S_A1 = transferMatrix(half([0, 1]), { arm: "LEFT", seed: "atkH1", withControls: true }); splits.S_A2 = transferMatrix(half([2, 3]), { arm: "LEFT", seed: "atkH2", withControls: true }); }
const SN = Object.keys(splits); console.error("splits ready", SN.map((s) => `${s}:${Object.keys(splits[s].A).length}d`).join(" "));
const dyAll = (X) => dyadsOf(X, (d, t) => cl(d) && cl(d) === cl(t)), CLN = CLUSTERS.map(([c]) => c);
const clusterRows = (X) => { const dy = dyAll(X), o = {}; for (const c of CLN) { const v = dy.filter((x) => x.cluster === c); o[c] = { n: v.length, nPass: v.filter((x) => x.pass).length, diff: v.length ? round(mean(v.map((x) => x.diff))) : null, auc: v.length ? round(mean(v.map((x) => x.auc))) : null }; } return o; };
const scopeOf = (tab) => Object.entries(tab).filter(([, v]) => v.n >= 2 && v.nPass / v.n >= 0.7).map(([c]) => c);
// ── B1 ──
out.B1 = { perSplit: {}, scope: {}, inScopeCount: {} };
for (const s of SN) { out.B1.perSplit[s] = clusterRows(splits[s]); out.B1.scope[s] = scopeOf(out.B1.perSplit[s]); }
for (const c of CLN) out.B1.inScopeCount[c] = { inScope: SN.filter((s) => out.B1.scope[s].includes(c)).length, eligible: SN.filter((s) => out.B1.perSplit[s][c].n >= 2).length, splits: SN.filter((s) => out.B1.scope[s].includes(c)) };
const iwr = out.B1.inScopeCount.IWR, ngm = out.B1.inScopeCount.NGm;
out.B1.verdict = { IWR: `${iwr.inScope}/${iwr.eligible}`, NGm: `${ngm.inScope}/${ngm.eligible}`, stable: iwr.inScope >= 5 && ngm.inScope >= 4, widen: CLN.filter((c) => !IN_SCOPE.includes(c) && out.B1.inScopeCount[c].inScope >= 3) };
console.error("B1", JSON.stringify(out.B1.verdict), JSON.stringify(out.B1.scope)); save();
// ── B2 ──
const inS = (set) => (d, t) => set.includes(cl(d)) && cl(d) === cl(t), pooled = (X, set) => { const dy = dyadsOf(X, inS(set)); return { n: dy.length, nPass: dy.filter((x) => x.pass).length, frac: dy.length ? round(dy.filter((x) => x.pass).length / dy.length) : null }; };
out.B2 = { derivedOn: {}, iwrNgmOn: {} };
for (const s of SN) { out.B2.derivedOn[s] = { scope: out.B1.scope[s], onOthers: Object.fromEntries(SN.filter((y) => y !== s).map((y) => [y, out.B1.scope[s].length ? pooled(splits[y], out.B1.scope[s]) : null])) }; out.B2.iwrNgmOn[s] = pooled(splits[s], ["IWR", "NGm"]); }
out.B2.minIwrNgm = Math.min(...SN.map((s) => out.B2.iwrNgmOn[s].frac ?? 1)); save(); console.error("B2", JSON.stringify(out.B2.iwrNgmOn));
// ── B3 jackknife ──
const drop = (X, L) => { const f = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => k !== L).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([t]) => t !== L))])); return { ...X, A: f(X.A), P: f(X.P), S: f(X.S) }; };
const LANG9 = ["spa", "por", "glg", "cat", "fra", "ita", "dan", "nob", "swe"]; out.B3 = {};
for (const s of ["S_trainA", "S_trainB", "S_dev", "S_testB", "S_A1", "S_A2"]) {
  const X = splits[s], base = pooled(X, ["IWR", "NGm"]), r = { full: base, drop: {} };
  for (const L of LANG9) { const dy = dyadsOf(drop(X, L), inS(["IWR", "NGm"])), byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff); r.drop[L] = { n: dy.length, nPass: dy.filter((x) => x.pass).length, frac: dy.length ? round(dy.filter((x) => x.pass).length / dy.length) : null, contrast: dy.length ? round(mean(Object.values(byT).map(mean))) : null }; }
  const fr = Object.values(r.drop).map((x) => x.frac).filter((x) => x != null), co = Object.values(r.drop).map((x) => x.contrast).filter((x) => x != null); r.minFrac = Math.min(...fr); r.minContrast = Math.min(...co);
  const dyF = dyadsOf(X, inS(["IWR", "NGm"])), byT = {}; for (const x of dyF) (byT[x.t] ??= []).push(x.diff); const tm = Object.entries(byT).map(([t, v]) => [t, mean(v)]); r.targetContrast = Object.fromEntries(tm.map(([t, v]) => [t, round(v)]));
  r.targetsCarrying = `${tm.filter(([, v]) => v >= 0.05).length}/${tm.length}`; r.targetsAbove003 = `${tm.filter(([, v]) => v > 0.03).length}/${tm.length}`; out.B3[s] = r;
}
save(); console.error("B3", Object.entries(out.B3).map(([s, r]) => `${s} minFrac ${r.minFrac} minContrast ${r.minContrast} carrying ${r.targetsCarrying}`).join(" | "));
// ── B4 multiplicity reference ──
import { aucOf } from "./lib.mjs";
const relClass = (d, t) => (cl(d) && cl(d) === cl(t) ? "sameSub" : G(d) === G(t) ? "sameGenusNotSub" : fam(d) === fam(t) ? "sameFamilyOnly" : "otherFamily");
out.B4 = { baseRates: {}, permutation: {}, thresholdFree: {} };
for (const s of ["S_trainA", "S_trainB", "S_dev", "S_testB", "S_A1", "S_A2"]) {
  const X = splits[s], all = dyadsOf(X, () => true), byRel = {};
  for (const x of all) (byRel[relClass(x.d, x.t)] ??= []).push(x);
  out.B4.baseRates[s] = Object.fromEntries(Object.entries(byRel).map(([k, v]) => [k, { n: v.length, nPass: v.filter((x) => x.pass).length, frac: round(v.filter((x) => x.pass).length / v.length), meanDiff: round(mean(v.map((x) => x.diff))), nAuc60: v.filter((x) => x.auc >= 0.6).length }]));
  const sis = all.filter((x) => ["IWR", "NGm"].includes(cl(x.d)) && cl(x.d) === cl(x.t)), oth = all.filter((x) => G(x.d) !== G(x.t));
  const sc = [...sis.map((x) => x.diff), ...oth.map((x) => x.diff)], lab = [...sis.map(() => 1), ...oth.map(() => 0)];
  out.B4.thresholdFree[s] = { nSister: sis.length, nDifferentGenus: oth.length, aucOfContrast: round(aucOf(sc, lab)) };
  // permutation of language labels over the textbook clusters (sizes kept)
  const pass = new Map(all.map((x) => [`${x.d}|${x.t}`, x.pass])), donors = Object.keys(X.A), targets = new Set(all.map((x) => x.t)), pool = donors.filter((d) => targets.has(d));
  const real = CLUSTERS.map(([c, mem]) => [c, mem.filter((m) => pool.includes(m))]).filter(([, m]) => m.length >= 2), sizes = real.map(([, m]) => m.length);
  const stats = (groups) => { let n = 0, p = 0, scope = 0, first = null; groups.forEach((m, gi) => { let gn = 0, gp = 0; for (const d of m) for (const t of m) { if (d === t || !pass.has(`${d}|${t}`)) continue; gn++; if (pass.get(`${d}|${t}`)) gp++; } n += gn; p += gp; if (gn >= 2 && gp / gn >= 0.7) scope++; if (gi === 0) first = gn ? gp / gn : 0; }); return { pooled: p / n, scope, largest: first }; };
  const obs = stats(real.map(([, m]) => m)), rnd = rngFor(seedFor("atk-sister", "perm", s)), B = 5000, nullS = { pooled: [], scope: [], largest: [] };
  const order = real.map(([c]) => c), big = order.indexOf("IWR"); // IWR is the first cluster of CLUSTERS, kept first
  for (let b = 0; b < B; b++) { const sh = shuffleIn(pool.slice(), rnd); let k = 0; const groups = sizes.map((z) => { const g = sh.slice(k, k + z); k += z; return g; }); const r = stats(groups); nullS.pooled.push(r.pooled); nullS.scope.push(r.scope); nullS.largest.push(r.largest); }
  const pv = (arr, o) => round((1 + arr.filter((x) => x >= o - 1e-12).length) / (B + 1), 4), q = (a, p) => round(quantile(a, p));
  out.B4.permutation[s] = { clusters: real.map(([c, m]) => `${c}:${m.length}`), observed: { pooled: round(obs.pooled), scope: obs.scope, largest: round(obs.largest) }, nullQ99: { pooled: q(nullS.pooled, 0.99), scope: q(nullS.scope, 0.99), largest: q(nullS.largest, 0.99) }, nullMean: { pooled: round(mean(nullS.pooled)), scope: round(mean(nullS.scope)), largest: round(mean(nullS.largest)) }, p: { pooled: pv(nullS.pooled, obs.pooled), scope: pv(nullS.scope, obs.scope), largest: pv(nullS.largest, obs.largest) }, big };
  console.error("B4", s, JSON.stringify(out.B4.permutation[s].observed), JSON.stringify(out.B4.permutation[s].p), "base", JSON.stringify(Object.fromEntries(Object.entries(out.B4.baseRates[s]).map(([k, v]) => [k, `${v.nPass}/${v.n}`]))), "tfAUC", out.B4.thresholdFree[s].aucOfContrast); save();
}
// ── B5 control definition ──
out.B5 = { perSplit: {} };
const nonG = (X, t) => Object.keys(X.A).filter((x) => x !== t && G(x) !== G(t) && X.A[x]?.[t] != null);
const CT = { registered: (v) => mean(v), median: (v) => quantile(v, 0.5), top3: (v) => mean(v.slice().sort((a, b) => b - a).slice(0, 3)), best: (v) => Math.max(...v) };
for (const s of ["S_trainA", "S_trainB", "S_dev", "S_testB", "S_A1", "S_A2"]) {
  const X = splits[s], dy = dyadsOf(X, inS(["IWR", "NGm"])), res = {};
  const ctrls = { ...Object.fromEntries(Object.entries(CT).map(([k, f]) => [k, (t) => f(nonG(X, t).map((x) => X.A[x][t]))])), nonGenusIE: (t) => { const v = nonG(X, t).filter(isIE).map((x) => X.A[x][t]); return v.length ? mean(v) : null; }, nonIE: (t) => { const v = nonG(X, t).filter((x) => !isIE(x)).map((x) => X.A[x][t]); return v.length ? mean(v) : null; } };
  for (const [k, f] of Object.entries(ctrls)) { const byT = {}; let beat = 0, beat3 = 0, nn = 0; for (const x of dy) { const c = f(x.t); if (c == null) continue; (byT[x.t] ??= []).push(x.auc - c); nn++; if (x.auc - c > 0) beat++; if (x.auc - c >= 0.03) beat3++; }
    res[k] = { contrast: boot(Object.values(byT).map(mean), 2000, rs("b5", s, k)), nDyads: nn, fracAbove0: round(beat / nn), fracAtLeast003: round(beat3 / nn) }; }
  const bestOf = {}; for (const t of [...new Set(dy.map((x) => x.t))]) { const v = nonG(X, t).map((x) => [x, X.A[x][t]]).sort((a, b) => b[1] - a[1]).slice(0, 3); bestOf[t] = v.map(([x, a]) => `${x}:${a}`); }
  const cls = {}; for (const t of [...new Set(dy.map((x) => x.t))]) for (const x of Object.keys(X.A)) { if (x === t || X.A[x]?.[t] == null) continue; ((cls[relClass(x, t)] ??= {})[t] ??= []).push(X.A[x][t]); }
  res.classMeanAuc = Object.fromEntries(Object.entries(cls).map(([k, o]) => [k, { targets: Object.keys(o).length, meanAuc: round(mean(Object.values(o).map(mean))) }])); res.bestNonGenusDonors = bestOf; out.B5.perSplit[s] = res;
  console.error("B5", s, Object.entries(res).filter(([k]) => ctrls[k]).map(([k, v]) => `${k} ${v.contrast.mean}[${v.contrast.lo},${v.contrast.hi}]`).join(" | "), JSON.stringify(res.classMeanAuc)); save();
}
// ── B6 audit of the confirmer's freezing ──
{ const cf = path.join(CONFD, "confirm.mjs"), vf = path.join(CONFD, "verdict.mjs"), tr = path.join(CONFD, "results", "transfer-FIRST-LEFT.json"), vj = path.join(CONFD, "results", "verdict.json"), j = rd(tr), jv = rd(vj), st = (f) => new Date(fs.statSync(f).mtimeMs).toISOString();
  out.B6 = { headerRecomputed: headerHash(cf), headerRecordedTransfer: j.headerSha256, headerRecordedVerdict: jv.headerSha256, headerMatches: headerHash(cf) === j.headerSha256 && headerHash(cf) === jv.headerSha256, verdictSha256Recomputed: sha256(fs.readFileSync(vf, "utf8")), verdictSha256Recorded: j.verdictSha256, verdictMatches: sha256(fs.readFileSync(vf, "utf8")) === j.verdictSha256,
    mtimes: { "confirm.mjs": st(cf), "verdict.mjs": st(vf), "fresh.mjs": st(path.join(CONFD, "fresh.mjs")), "prep.mjs": st(path.join(CONFD, "prep.mjs")), "data/meta.json": st(path.join(CONFD, "data", "meta.json")), "transfer-FIRST-LEFT.json": st(tr), "verdict.json": st(vj), "replicate.mjs": st(path.join(CONFD, "replicate.mjs")), "replicate-B.json": st(path.join(CONFD, "results", "replicate-B.json")), "posthoc.mjs": st(path.join(CONFD, "posthoc.mjs")) } };
  save(); console.error("B6", JSON.stringify({ hm: out.B6.headerMatches, vm: out.B6.verdictMatches, mtimes: out.B6.mtimes })); }
save(); console.log("B done");
