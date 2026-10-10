// eval/law/provisional/family-vs-relatedness/sister.mjs — RULE 2 (post-hoc proposal from dev, confirmed on test) and the RELATEDNESS GRADIENT.
//
//   NAME_COMPANY_PAIRBLOCK=1 node sister.mjs dev      (reads results/discovery-*.json; computes no new AUC; selects the scope)
//   NAME_COMPANY_PAIRBLOCK=1 node sister.mjs test     (needs results/sister-discovery.json and results/confirm-<cell>.json; form A computes dev-donor -> test-target dyads)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen: every discovery output (regressions, set means, group tables, selection) of discover.mjs; a hand-picked list of 29 sister pairs with their dev single-donor AUCs
//   (Western Romance pairs 0.55-0.68, dan-nob 0.62-0.64, nld-deu 0.55-0.62, hin-urd 0.58-0.64, hrv-srp 0.56-0.61, bul-slv 0.52-0.62, West Slavic 0.47-0.55, East Slavic 0.51-0.56, est-fin
//   0.53-0.56, lav-lit 0.50-0.57, cmn-lzh 0.49-0.55 ...). The registered confirmation runs of confirm.mjs (`rules` and the three cells on UD test) were LAUNCHED before this header was
//   written, but NONE of their outputs (results/confirm-*.json) has been opened. CORRECTION written before sister.mjs was ever run: while polling logs after this header was first drafted, ONE
//   stderr line of the `rules` run was printed ("FIRST-BOTH genus:Romance form A: HOLDS (5/7)"); no other confirm number (no form B, no cell or dyad output, no pair count) has been seen.
//   It concerns rule 1 only; rule 2's design and thresholds were fixed without it. UD test has otherwise never been read by any script. Rule 2 is therefore a POST-HOC proposal (it was suggested by dev data); its test is the untouched check.
// THE RULE (rule 2, "sister rule"). In a cluster of SISTER languages (subbranch.mjs: Italo-Western Romance, North Germanic, Continental West Germanic, Hindustani, South / West /
//   East Slavic, Finnic, Baltic, Celtic, Turkic, Sinitic, Semitic - textbook sub-branches), a company profile learned on ONE sister language (100 seeded pairs, 6 draws) transfers to the
//   other at AUC >= 0.60, and at least 0.05 above the AUC the same target gets from donors outside its genus. A DYAD d -> t PASSES if AUC(d -> t) >= 0.60, AUC > q95 of the analytic
//   Mann-Whitney null for n_t pairs (0.5 + 1.645 sqrt((2n+1)/(12 n^2))) and AUC - ctrl_t >= 0.05, where ctrl_t = mean AUC from all eligible donors of a different genus than t.
//   Cells: PRIMARY FIRST-LEFT (the causal first-mention arm); FIRST-BOTH and LATER-BOTH are reported, not used for scope.
// SCOPE (selected on dev, FIRST-LEFT by `sister.mjs dev`): a cluster is IN SCOPE if it has >= 2 eligible ordered dyads and >= 70% of them pass. No cluster in scope = no rule 2.
// CONFIRMATION (test). Form A (deployment, primary): donors' DEV rows -> targets' TEST rows, ctrl_t from the same form. Form B (replication): test donors -> test targets, read from
//   confirm-FIRST-LEFT.json `dyad.A`. HOLDS (form A): >= 6 eligible in-scope dyads, >= 70% pass, every in-scope cluster with >= 2 eligible dyads >= 50% pass, lower bound of the
//   target-language bootstrap (B = 2000) of mean(AUC - ctrl) > 0, mean POSITION-arm AUC of the in-scope dyads in [0.45, 0.55], mean sham AUC in [0.45, 0.55]. PARTIALLY HOLDS: not HOLDS, >= 6
//   eligible dyads, >= 50% pass, mean(AUC - ctrl) >= 0.03. FAILS otherwise. Variant "no twins" drops spa-cat and hrv-srp dyads (shared annotation team) and is reported beside it.
//   OUT-OF-SCOPE clusters are reported (pass fraction): they are the rule's stated limit, and are not part of the verdict.
// GRADIENT (relatedness is graded, word order is not). Dyadic fixed-effects regression (as discover.mjs; target and donor FE; wo3 clear languages) with covariates sameSub (same cluster),
//   sameGenusNotSub (same genus, different cluster or no cluster), sameFamilyOnly, sameOrder, sameScript, sameMorph, sameTeam; pigeonhole bootstrap B = 1000 incl. the differences.
//   GRADED if sameSub > sameGenusNotSub > sameFamilyOnly > 0 with (sameSub - sameFamilyOnly) >= 0.03 and the lower bound of that difference > 0. Computed on dev (all three cells) and on test
//   form B (all three cells).
// BLIND PREDICTIONS. S1 dev scope (FIRST-LEFT) contains Italo-Western Romance and at least two of {North Germanic, Continental West Germanic, Hindustani, South Slavic}, and excludes West
//   Slavic, East Slavic, Baltic, Finnic, Sinitic. S2 GRADED holds on dev in FIRST-LEFT and FIRST-BOTH. S3 rule 2 is HOLDS or PARTIALLY HOLDS on test form A, with a pooled pass fraction
//   at least 0.05 below its dev value (post-hoc scope shrinks). S4 out-of-scope clusters pass in < 50% of dyads on test. S5 the no-twins variant is within 0.10 of the all-dyads pass fraction.
//   S6 sameOrder stays < 0.03 with its interval spanning 0 in the gradient regression, in every cell, on dev and test.
// Thresholds may be tightened, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, round, mean, quantile, rngFor, seedFor, shuffleIn, headerHash, sha256, loadLang, fitProbe, pairSample, aucOn, aucOf } from "./lib.mjs";
import { genus, fam, script, morph, team, WO3 } from "./groups.mjs";
import { sub, CLUSTERS } from "./subbranch.mjs";
import { loadAll, donorsOf, targetsOf, boot, CAP_TRAIN, DYAD_DRAWS } from "./analysis.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results");
const CELLS = [["FIRST-LEFT", "FIRST", "LEFT"], ["FIRST-BOTH", "FIRST", "BOTH"], ["LATER-BOTH", "LATER", "BOTH"]];
const fileHash = (f) => sha256(fs.readFileSync(path.join(HERE, f), "utf8"));
const prov = () => ({ headerSha256: headerHash(SELF), groupsSha256: fileHash("groups.mjs"), libSha256: fileHash("lib.mjs"), analysisSha256: fileHash("analysis.mjs"), subbranchSha256: fileHash("subbranch.mjs") });
const rs = (...p) => rngFor(seedFor("fam-vs-rel", "sister", ...p));
const q95n = (n) => 0.5 + 1.645 * Math.sqrt((2 * n + 1) / (12 * n * n));
const TWIN = (d, t) => team(d) && team(d) === team(t);

// ── gradient regression (K covariates, target and donor fixed effects) ──────────────────────────────────────────────────────────────
const GCOV = ["sameSub", "sameGenusNotSub", "sameFamilyOnly", "sameOrder", "sameScript", "sameMorph", "sameTeam"];
function gradRows(A) {
  const rows = [];
  for (const d of Object.keys(A)) for (const t of Object.keys(A[d])) {
    const v = A[d][t]; if (v == null || d === t || WO3[d] === "MIXED" || WO3[t] === "MIXED") continue;
    const ss = sub(d) && sub(d) === sub(t), sg = genus(d) === genus(t), sf = fam(d) === fam(t);
    rows.push({ d, t, y: v, x: [ss ? 1 : 0, sg && !ss ? 1 : 0, sf && !sg ? 1 : 0, WO3[d] === WO3[t] ? 1 : 0, script(d) === script(t) ? 1 : 0, morph(d) === morph(t) ? 1 : 0, TWIN(d, t) ? 1 : 0] });
  }
  return rows;
}
function solve(M, b) {
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12; for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
  const x = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let v = A[r][n]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / (A[r][r] || 1e-12); } return x;
}
function regressG(rows, wT = null, wD = null) {
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))].sort(), tI = new Map(T.map((x, i) => [x, i])), dI = new Map(D.map((x, i) => [x, i - 1])), k = GCOV.length, p = k + T.length + D.length - 1;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
  for (const r of rows) {
    const w = (wT ? wT[r.t] ?? 0 : 1) * (wD ? wD[r.d] ?? 0 : 1); if (!w) continue;
    const idx = [], val = []; r.x.forEach((v, j) => { if (v) { idx.push(j); val.push(v); } }); idx.push(k + tI.get(r.t)); val.push(1); const di = dI.get(r.d); if (di >= 0) { idx.push(k + T.length + di); val.push(1); }
    for (let a = 0; a < idx.length; a++) { Xty[idx[a]] += w * val[a] * r.y; for (let b = 0; b < idx.length; b++) XtX[idx[a]][idx[b]] += w * val[a] * val[b]; }
  }
  for (let j = k; j < p; j++) XtX[j][j] += 1e-6;
  const beta = solve(XtX, Xty); return Object.fromEntries(GCOV.map((c, j) => [c, beta[j]]));
}
export function gradient(A, B, rnd) {
  const rows = gradRows(A), est = regressG(rows), T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))], reps = [];
  for (let b = 0; b < B; b++) {
    const wT = Object.fromEntries(T.map((x) => [x, 0])), wD = Object.fromEntries(D.map((x) => [x, 0]));
    for (let i = 0; i < T.length; i++) wT[T[Math.floor(rnd() * T.length)]] += 1; for (let i = 0; i < D.length; i++) wD[D[Math.floor(rnd() * D.length)]] += 1;
    reps.push(regressG(rows, wT, wD));
  }
  const ci = (f) => { const v = reps.map(f); return [round(quantile(v, 0.025)), round(quantile(v, 0.975))]; };
  const diffSF = est.sameSub - est.sameFamilyOnly, diffCI = ci((r) => r.sameSub - r.sameFamilyOnly);
  const graded = est.sameSub > est.sameGenusNotSub && est.sameGenusNotSub > est.sameFamilyOnly && est.sameFamilyOnly > 0 && diffSF >= 0.03 && diffCI[0] > 0;
  return { n: rows.length, est: Object.fromEntries(Object.entries(est).map(([k, v]) => [k, round(v)])), ci: Object.fromEntries(GCOV.map((c) => [c, ci((r) => r[c])])), sameSubMinusFamilyOnly: { est: round(diffSF), ci: diffCI }, sameSubMinusGenusNotSub: { est: round(est.sameSub - est.sameGenusNotSub), ci: ci((r) => r.sameSub - r.sameGenusNotSub) }, graded };
}

// ── sister-cluster dyad table, scope, verdict ───────────────────────────────────────────────────────────────────────────────────────
export function clusterTable(A, pairsN, P = null, S = null) {
  const out = {};
  for (const [c, members] of CLUSTERS) {
    const dy = [];
    for (const d of members) for (const t of members) {
      if (d === t) continue; const v = A[d]?.[t]; if (v == null || !pairsN[t]) continue;
      const ctrl = mean(Object.keys(A).filter((x) => x !== t && genus(x) !== genus(t) && A[x]?.[t] != null).map((x) => A[x][t])), n = pairsN[t];
      dy.push({ d, t, auc: round(v), ctrl: round(ctrl), diff: round(v - ctrl), q95: round(q95n(n)), n, pass: v >= 0.6 && v > q95n(n) && v - ctrl >= 0.05, twin: !!TWIN(d, t), pos: P?.[d]?.[t] ?? null, sham: S?.[d]?.[t] ?? null });
    }
    out[c] = { members, dyads: dy, n: dy.length, nPass: dy.filter((x) => x.pass).length };
  }
  return out;
}
export const scopeOf = (table) => Object.entries(table).filter(([, v]) => v.n >= 2 && v.nPass / v.n >= 0.7).map(([c]) => c);
export function ruleVerdict(table, scope, noTwin = false, tag = "") {
  const dy = scope.flatMap((c) => table[c].dyads).filter((x) => !(noTwin && x.twin)), nT = dy.length, nPass = dy.filter((x) => x.pass).length, frac = nT ? nPass / nT : 0;
  const perCluster = Object.fromEntries(scope.map((c) => { const d = table[c].dyads.filter((x) => !(noTwin && x.twin)); return [c, { n: d.length, nPass: d.filter((x) => x.pass).length }]; }));
  const byT = {}; for (const x of dy) (byT[x.t] ??= []).push(x.diff); const b = boot(Object.values(byT).map(mean), 2000, rs("boot", tag, String(noTwin)));
  const posV = dy.map((x) => x.pos).filter((x) => x != null), shamV = dy.map((x) => x.sham).filter((x) => x != null), pos = posV.length ? mean(posV) : null, sham = shamV.length ? mean(shamV) : null;
  const band = (v) => v == null || (v >= 0.45 && v <= 0.55), clustersOk = Object.values(perCluster).every((c) => c.n < 2 || c.nPass / c.n >= 0.5);
  const verdict = nT < 6 ? "UNDERPOWERED" : frac >= 0.7 && clustersOk && b.lo > 0 && band(pos) && band(sham) ? "HOLDS" : frac >= 0.5 && b.mean >= 0.03 ? "PARTIALLY HOLDS" : "FAILS";
  return { verdict, dyads: nT, nPass, frac: round(frac), perCluster, diffBoot: b, positionControl: round(pos), shamControl: round(sham), meanAuc: round(mean(dy.map((x) => x.auc))), meanCtrl: round(mean(dy.map((x) => x.ctrl))), failing: dy.filter((x) => !x.pass).map((x) => `${x.d}>${x.t}:${x.auc}`) };
}
const outOfScope = (table, scope) => Object.fromEntries(Object.entries(table).filter(([c, v]) => !scope.includes(c) && v.n).map(([c, v]) => [c, { n: v.n, nPass: v.nPass, meanAuc: round(mean(v.dyads.map((x) => x.auc))) }]));
const pairsMap = (j) => Object.fromEntries(Object.entries(j.own).map(([t, o]) => [t, o.pairs]));

// ── form A: DEV donors -> TEST targets (single donor, CAP_TRAIN pairs, DYAD_DRAWS draws) ────────────────────────────────────────────────
function crossDyads(stratum, arm, tag) {
  const dev = loadAll("dev", stratum), tst = loadAll("test", stratum), D = donorsOf(dev), T = targetsOf(tst), A = {}, P = {}, S = {};
  for (const d of D) {
    A[d] = {}; P[d] = {}; S[d] = {}; const acc = {}, accP = {}, accS = {};
    for (let r = 0; r < DYAD_DRAWS; r++) {
      const rnd = rs("cross", tag, d, r), idx = pairSample(dev[d], Math.min(CAP_TRAIN, dev[d].pairs), rnd), pt = { L: dev[d], idx };
      const y2 = dev[d].y.slice(); for (let k = 0; k < idx.length; k += 2) if (rnd() < 0.5) { y2[idx[k]] = 1 - y2[idx[k]]; y2[idx[k + 1]] = 1 - y2[idx[k + 1]]; }
      const f = fitProbe([pt], arm), fp = fitProbe([pt], "POSITION"), fs_ = fitProbe([{ L: { ...dev[d], y: y2 }, idx }], arm);
      for (const t of T) { if (t === d) continue; (acc[t] ??= []).push(aucOn(f, tst[t], arm)); (accP[t] ??= []).push(aucOn(fp, tst[t], "POSITION")); (accS[t] ??= []).push(aucOn(fs_, tst[t], arm)); }
    }
    for (const t of Object.keys(acc)) { A[d][t] = round(mean(acc[t].filter((x) => x != null))); P[d][t] = round(mean(accP[t].filter((x) => x != null))); S[d][t] = round(mean(accS[t].filter((x) => x != null))); }
  }
  return { A, P, S, pairs: Object.fromEntries(T.map((t) => [t, tst[t].pairs])) };
}
function modeDev() {
  const out = { ...prov(), cells: {} };
  for (const [cell] of CELLS) {
    const j = JSON.parse(fs.readFileSync(path.join(RES, `discovery-${cell}.json`), "utf8")), table = clusterTable(j.dyad.A, pairsMap(j), j.dyad.P, j.dyad.S), scope = scopeOf(table);
    out.cells[cell] = { table, scope, gradient: gradient(j.dyad.A, 1000, rs("grad-dev", cell)), outOfScope: outOfScope(table, scope), verdictDevInSample: ruleVerdict(table, scope, false, `dev-${cell}`), verdictDevNoTwin: ruleVerdict(table, scope, true, `dev-${cell}`) };
    console.error(`${cell}: scope [${scope}] graded ${out.cells[cell].gradient.graded}`);
  }
  out.scope = out.cells["FIRST-LEFT"].scope; fs.writeFileSync(path.join(RES, "sister-discovery.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ scope: out.scope, perCell: Object.fromEntries(CELLS.map(([c]) => [c, { scope: out.cells[c].scope, graded: out.cells[c].gradient.graded, est: out.cells[c].gradient.est, devPass: `${out.cells[c].verdictDevInSample.nPass}/${out.cells[c].verdictDevInSample.dyads}` }])) }, null, 1));
}
function modeTest() {
  const dis = JSON.parse(fs.readFileSync(path.join(RES, "sister-discovery.json"), "utf8")), scope = dis.scope;
  for (const k of ["groupsSha256", "libSha256", "analysisSha256", "subbranchSha256"]) if (dis[k] !== prov()[k]) throw new Error(`code freeze violated: ${k}`);
  const out = { ...prov(), scope, cells: {} };
  for (const [cell, st, arm] of CELLS) {
    const X = crossDyads(st, arm, cell), tabA = clusterTable(X.A, X.pairs, X.P, X.S), jB = JSON.parse(fs.readFileSync(path.join(RES, `confirm-${cell}.json`), "utf8")), tabB = clusterTable(jB.dyad.A, pairsMap(jB), jB.dyad.P, jB.dyad.S);
    out.cells[cell] = { formA: { table: tabA, verdict: ruleVerdict(tabA, scope, false, `A-${cell}`), verdictNoTwin: ruleVerdict(tabA, scope, true, `A-${cell}`), outOfScope: outOfScope(tabA, scope) }, formB: { table: tabB, verdict: ruleVerdict(tabB, scope, false, `B-${cell}`), verdictNoTwin: ruleVerdict(tabB, scope, true, `B-${cell}`), outOfScope: outOfScope(tabB, scope), gradient: gradient(jB.dyad.A, 1000, rs("grad-test", cell)) }, gradientFormA: gradient(X.A, 1000, rs("grad-testA", cell)) };
    console.error(`${cell}: form A ${out.cells[cell].formA.verdict.verdict} ${out.cells[cell].formA.verdict.nPass}/${out.cells[cell].formA.verdict.dyads}; form B ${out.cells[cell].formB.verdict.verdict}`);
    fs.writeFileSync(path.join(RES, "sister-confirm.json"), JSON.stringify(out, null, 1));
  }
  console.log(JSON.stringify(Object.fromEntries(CELLS.map(([c]) => [c, { A: out.cells[c].formA.verdict.verdict, nPassA: `${out.cells[c].formA.verdict.nPass}/${out.cells[c].formA.verdict.dyads}`, B: out.cells[c].formB.verdict.verdict, graded: out.cells[c].formB.gradient.graded }])), null, 1));
}
const mode = process.argv[2];
if (mode === "dev") modeDev(); else if (mode === "test") modeTest(); else throw new Error("usage: sister.mjs <dev|test>");
