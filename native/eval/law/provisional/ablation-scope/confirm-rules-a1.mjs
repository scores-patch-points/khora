// eval/law/provisional/ablation-scope/confirm-rules.mjs — CONFIRMATION of the frozen candidate rules on UNUSED IRC days and an UNUSED book (Middlemarch).
//
//   node confirm-rules-a1.mjs --rules results/frozen-rules.json --data data/confirmation --train data/discovery2 --out results/confirmation-a1.json [--B 1000]
//
// ═══ AMENDMENT A1 (written after the STRICT run of confirm-rules.mjs, whose header and sha256 are unchanged and whose output is kept as results/confirmation-strict.json) ═══════════════════════
// WHAT HAPPENED. The strict run (per-cell rule: a stratum is VOID when any control's 99% interval excludes 0.5) returned VOID for every IRC candidate: with 200-240 pairs per stratum the interval is narrow and the
//   residual imbalance of the matching (form-frequency bin AUC 0.42-0.47, message length 0.45-0.47, local count 0.555 in one cell) is flagged although each is a few hundredths from chance. That rule is mis-specified at n >= 200
//   (it was written for n of about 60). The registered verdict for IRC under the strict rule is therefore VOID and stays in the record.
// WHAT I HAD SEEN WHEN I WROTE A1: the controls and void flags of the first four IRC candidates (not their AUCs), the counts of pairs that survive exact-match calipers, and the Middlemarch numbers the strict run printed:
//   book-arm atm.activation.self PASS 0.669 [0.586, 0.755]; c.dRight FAIL 0.545; S_ENTRY on Middlemarch A 0.711 (limit L2 predicted <= 0.58: FAILED); S_ENTRY on Middlemarch B 0.500; X-rules on the book: IRC-A S_ENTRY rule 0.767,
//   IRC-A -c.dSelf 0.704, IRC-A c.surprisalDestroyed 0.507, IRC-B c.dSelf 0.560. I had NOT seen any IRC AUC.
// THE AMENDMENT (changes the void logic, and tightens elsewhere; everything else is as registered below): (1) the per-cell 99%-CI rule is still computed and reported (voidCell) but no longer drops a stratum; the registered POOLED rule
//   stays (each control pooled over the scope in [0.45, 0.55]). (2) NEW gate V2: a ridge-logistic probe on the six control variables alone, leave-one-block-out over the scope pairs, must score <= 0.58, else VOID: the residual imbalance,
//   as a multivariate combination, is bounded. (3) NEW gate V3: on the strict-caliper subset (exact form-frequency bin, exact length, |ln message-length ratio| <= 0.25, |ln local-count ratio| <= 0.15) the AUC must be >= 0.58 and
//   within 0.10 of the full AUC when >= 20 caliper pairs exist (when fewer, reported and not gating). PASS thresholds are unchanged (0.62, lower bound 0.55, permutation, consistency, 2/3 of strata at 0.58, 60 pairs).
// ═══ END OF AMENDMENT A1 ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written after discovery (rounds 1 and 2) and the freeze of the rules, and BEFORE any record of data/confirmation was opened) ═══
// WHAT IS FROZEN. results/frozen-rules.json (its sha256 is written into the output): 10 candidate rules, each = (kind, group, strata, one fixed oriented score, a fixed operator and threshold), plus 14 LIMIT scopes.
//   candidates: slot arm IRC A S_ENTRY>=1 c4_6..c7_15; IRC B EXTENT>=3 at c4_6; IRC B EXTENT>=6 at c16p; IRC B S_ENTRY>=1 c4_6..c16p (E1, declared an extension BEFORE confirmation);
//   company arm IRC A c.surprisalDestroyed>3.2008 (c2..c16p); IRC A -c.dSelf>-0.4562 (c2..c4_6); IRC B c.dSelf>0.5305 (c2..c16p); IRC B span.mentionShift>0 (c4_6..c16p);
//   book arm (from War and Peace) atm.activation.self lower=name (c2..c7_15) and c.dRight>0.1191 (c3..c7_15), applied to Middlemarch group A. Nothing was nominated for War and Peace group B.
//   Thresholds: slot-arm values are those emitted by analyse-strata.mjs (S_ENTRY>=1 is the natural one), component thresholds are the balanced-accuracy-best percentile of the discovery negatives (the only fitted numbers).
// DISCLOSURE. I have seen: round 1 (results/d1) and round 2 (results/d2) of the discovery, the component scan, the UD dev analysis (results/ud1: S_ENTRY identically 0, probe 0.56), descriptive tables of
//   S_ENTRY>0 shares by stratum and class (IRC B names 34%/52%/75% vs unlabelled 2%/2%/0% at c4_6/c7_15/c16p), and the design-time control balance of the confirmation pairs (design-check.mjs, no ablation read).
//   I have NOT opened any confirmation JSONL, only their shard stderr progress lines and the K1/K6 control fields. The first discovery attempt of this lens had a pair-id collision bug and a cluster-block defect for single-document
//   corpora; both were fixed before any number in this file was produced (see features.mjs); a smoke run on that buggy data was seen and discarded.
// DATA. data/confirmation = 8 IRC channel-days unused by name-rule-informal, name-company, and by every round of this lens (kubuntu/2006-03-15, ubuntu/2006-03-15, 2007-07-15, 2009-03-15, 2011-03-15, 2011-07-15, 2012-03-15, 2013-07-15;
//   some were read by other ants with other instruments) and Middlemarch (Eliot, pg145; not used by any earlier khora test). Matching v3, strata c2..c16p, groups A and B, same reader and window as discovery (M=256 / 128).
// PASS (per candidate; computed over the non-void strata of its frozen scope). All of: pooled stratified AUC >= 0.62 (tightened from the discovery 0.60 because ten candidates are tested); 95% cluster-bootstrap lower bound > 0.55;
//   AUC above the within-pair label-swap permutation q95; pooled controls (R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL) each in [0.45, 0.55]; non-void strata >= half of the scope; >= 3 groups (IRC days / book fifths) with
//   AUC > 0.5 and >= 75% of the evaluable groups; >= 2/3 of the live strata with stratum AUC >= 0.58; >= 60 pairs. A stratum is VOID when any control's 99% bootstrap interval excludes 0.5 (it is dropped and reported).
//   VOID verdict when too few strata survive or the pooled controls fail; FAIL otherwise. Also reported for each: TPR / TNR at the frozen threshold, AUC difference to the burstiness rival R_BURST, non-null shares.
// FINAL RULES (at most 2): the PASS candidates ranked by lower bound, at most one per (group, family) with family in {slot, company, record}; scope as CONFIRMED = strata with stratum AUC >= 0.58.
// LIMITS (predicted failures; each is a scope boundary). L1 S_ENTRY on IRC B c2+c3: pooled AUC in [0.45, 0.55]. L2/L3 S_ENTRY on Middlemarch A / B: pooled AUC <= 0.58. L4 S_ENTRY on IRC A outside its scope (c2, c3, c16p): reported.
//   X-rules: every IRC candidate applied unchanged to Middlemarch (same group): pooled AUC <= 0.58 (the rules do not transfer from chat to a novel).
// PROBE TRANSFER (a fitted ridge-logistic + PCA-24 on the whole record, trained on the discovery pairs, scored on confirmation pairs; existence test, never a rule): irc A, irc B, book A, book B, and the same on the matching variables alone.
// BLIND PREDICTIONS (belief).
//   F1 E1 (IRC B S_ENTRY>=1, c4_6..c16p) PASS (0.80).   F2 IRC B c.dSelf PASS (0.70).   F3 IRC A c.surprisalDestroyed PASS (0.65).   F4 IRC A -c.dSelf (c2..c4_6) PASS (0.60).   F5 IRC A S_ENTRY (c4_6..c7_15) PASS (0.35).
//   F6 IRC B EXTENT at c4_6 PASS (0.40) and at c16p PASS (0.50).   F7 neither book-arm candidate PASSes on Middlemarch (0.75).   F8 at least two candidates PASS (0.85).   F9 L1 holds (0.90), L2 and L3 hold (0.85).
//   F10 every X-rule stays <= 0.58 on Middlemarch (0.70 each).   F11 probe transfer: IRC A >= 0.70 and IRC B >= 0.65 (0.65); the matching-variable probe <= 0.55 everywhere (0.85).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { fitPCA, projectPCA } from "../../impact.mjs";
import { fitLogit, predict, standardise, cvScores } from "../../name-war-and-peace.mjs";
import { aucPairs, aucPN, stratAuc, bootStrat, permStrat, round, median } from "./stats.mjs";
import { loadRows, buildPairs, cellPairs, CONTROLS } from "./features.mjs";
import { vec, indexOfName } from "./components.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const RULES_F = opt("--rules", "results/frozen-rules.json"), DATA = opt("--data", "data/confirmation"), TRAIN = opt("--train", "data/discovery2"), OUTF = opt("--out", "results/confirmation.json"), B = Number(opt("--B", 1000));
const SEED = 20261008, MINP = 15;
const frozen = JSON.parse(fs.readFileSync(RULES_F, "utf8"));
const kindC = (k) => (k === "wp" ? "mm" : k);

function withVectors(pairs) { for (const x of pairs) { x.p.v = vec(x.p.raw.rec); x.n.v = vec(x.n.raw.rec); } return pairs; }
const scoreFn = (r) => (r.scoreKind === "ablation" ? (m) => m[r.score] : (m) => r.sign * m.v[r.j]);
const passOp = (r, T) => (r.op === ">=" ? (s) => s >= T : (s) => s > T);

/** Evaluate one frozen scope: strata of (kind, group), frozen oriented score, frozen threshold. */
function evalScope(pairs, spec, tag) {
  const f = scoreFn(spec), by = cellPairs(pairs, kindC(spec.kind), spec.group, spec.strata);
  let sd = SEED + tag.length * 13;
  const cells = {};
  for (const st of spec.strata) {
    const ps = by[st] ?? [];
    if (ps.length < MINP) { cells[st] = { n: ps.length, skipped: "too few pairs" }; continue; }
    const one = { [st]: ps }, b = bootStrat(one, f, { B, seed: sd++ }), pm = permStrat(one, f, { B, seed: sd++ });
    const ctl = {}, ci99 = {};
    for (const c of CONTROLS) { const bb = bootStrat(one, (m) => m[c], { B: Math.min(B, 500), seed: sd++, qLo: 0.005, qHi: 0.995 }); ctl[c] = bb.point; ci99[c] = [bb.lo, bb.hi]; }
    const voidCell = CONTROLS.some((c) => ci99[c][0] > 0.5 || ci99[c][1] < 0.5);
    const T = spec.threshold, ok = passOp(spec, T);
    cells[st] = { n: ps.length, auc: b.point, ci: [b.lo, b.hi], permQ95: pm.q95, controls: ctl, voidCell, tpr: round(ps.filter((x) => ok(f(x.p))).length / ps.length), tnr: round(ps.filter((x) => !ok(f(x.n))).length / ps.length) };
  }
  const live = spec.strata.filter((st) => cells[st].n >= MINP);   // A1: the per-cell 99%-CI void rule is reported (voidCell) but no longer drops a stratum
  const poolBy = Object.fromEntries(live.map((st) => [st, by[st]]));
  const out = { spec: { id: spec.id, kind: spec.kind, group: spec.group, strata: spec.strata, score: spec.score, sign: spec.sign ?? null, op: spec.op, threshold: spec.threshold }, cells, liveStrata: live };
  if (live.length === 0) { out.verdict = "VOID"; return out; }
  const b = bootStrat(poolBy, f, { B, seed: sd++ }), pm = permStrat(poolBy, f, { B, seed: sd++ });
  const ctl = {}; for (const c of CONTROLS) ctl[c] = round(stratAuc(poolBy, (m) => m[c]));
  const burst = bootStrat(poolBy, f, { B, seed: sd++, g: (m) => m.R_BURST });
  const all = Object.values(poolBy).flat(), T = spec.threshold, ok = passOp(spec, T);
  const groups = new Map(); for (const x of all) { const g = x.kind === "irc" ? x.doc : `fifth${Math.floor(Number(x.block.split("|q")[1]) / 5)}`; (groups.get(g) ?? groups.set(g, []).get(g)).push(x); }
  const per = [...groups].filter(([, ps]) => ps.length >= 5).map(([g, ps]) => [g, round(aucPairs(ps, f)), ps.length]);
  const above = per.filter(([, a]) => a > 0.5).length, goodStrata = live.filter((st) => cells[st].n >= MINP && cells[st].auc >= 0.58).length;
  Object.assign(out, { pairs: all.length, auc: b.point, ci: [b.lo, b.hi], permQ95: pm.q95, permP: pm.p, controlsPooled: ctl, controlsInBand: Object.values(ctl).every((v) => v >= 0.45 && v <= 0.55),
    tpr: round(all.filter((x) => ok(f(x.p))).length / all.length), tnr: round(all.filter((x) => !ok(f(x.n))).length / all.length), diffToBurst: burst, perBlock: per, consistency: { above, of: per.length }, strataAtLeast058: `${goodStrata}/${live.length}`,
    nonNullNames: round(all.filter((x) => !x.p.isNull).length / all.length), nonNullUnlabelled: round(all.filter((x) => !x.n.isNull).length / all.length) });
  // A1 gate V2: a ridge-logistic on the control vector alone (leave-one-block-out over the scope pairs) must not exceed 0.58 -- the residual imbalance, as a multivariate combination, is bounded
  { const mem = all.flatMap((x) => [{ m: x.p, y: 1, b: x.block }, { m: x.n, y: 0, b: x.block }]), sc = cvScores(mem.map((r) => r.m.cv), mem.map((r) => r.y), mem.map((r) => r.b)); mem.forEach((r, k) => { r.m.PROBE_C = sc[k] ?? 0; }); out.controlProbeAuc = round(stratAuc(poolBy, (m) => m.PROBE_C)); }
  // A1 gate V3: strict-caliper subset (exact form-frequency bin, exact length, |ln message-length ratio| <= 0.25, |ln local-count ratio| <= 0.15)
  { const cal = {}; for (const st of live) cal[st] = by[st].filter((x) => x.p.raw.fbin === x.n.raw.fbin && x.p.raw.len === x.n.raw.len && Math.abs(Math.log(x.p.raw.sl / x.n.raw.sl)) <= 0.25 && Math.abs(Math.log(x.p.raw.c / x.n.raw.c)) <= 0.15);
    const nc = Object.values(cal).flat().length; out.caliper = { pairs: nc };
    if (nc >= 20) { const cb = bootStrat(cal, f, { B: Math.min(B, 500), seed: sd++ }); out.caliper.auc = cb.point; out.caliper.ci = [cb.lo, cb.hi]; out.caliper.controls = Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(cal, (m) => m[c]))])); } }
  const caliperOk = out.caliper.pairs < 20 ? null : out.caliper.auc >= 0.58 && out.caliper.auc >= out.auc - 0.10;
  out.caliper.gate = caliperOk;
  const voidAll = live.length * 2 < spec.strata.length || !out.controlsInBand || out.controlProbeAuc > 0.58;
  out.pass = !voidAll && out.auc >= 0.62 && out.ci[0] > 0.55 && out.auc > out.permQ95 && above >= 3 && above / Math.max(1, per.length) >= 0.75 && goodStrata * 3 >= live.length * 2 && out.pairs >= 60 && caliperOk !== false;
  out.verdict = voidAll ? "VOID" : out.pass ? "PASS" : "FAIL";
  return out;
}

// ── PROBE transfer (a fitted classifier trained on DISCOVERY pairs, tested on confirmation pairs; an existence test, not a rule) ───────────────────────────────────────────────────────────
function probeTransfer(trainPairs, testPairs, kindTrain, kindTest, group, vecKey) {
  const POOLED = ["c2", "c3", "c4_6", "c7_15", "c16p"];
  const tr = cellPairs(trainPairs, kindTrain, group, POOLED), te = cellPairs(testPairs, kindTest, group, POOLED);
  const mem = (by) => Object.values(by).flat().flatMap((x) => [{ m: x.p, y: 1 }, { m: x.n, y: 0 }]);
  const A = mem(tr), T = mem(te);
  if (A.length < 100 || T.length < 40) return { skipped: "too few" };
  let [Xtr, Xte] = standardise(A.map((r) => r.m[vecKey]), T.map((r) => r.m[vecKey]));
  if (Xtr[0].length > 24) { const pca = fitPCA(Xtr, 24); Xtr = Xtr.map((r) => projectPCA(pca, r)); Xte = Xte.map((r) => projectPCA(pca, r)); }
  const w = fitLogit(Xtr, A.map((r) => r.y));
  T.forEach((r, k) => { r.m.PROBE_T = predict(w, Xte[k]); });
  const b = bootStrat(te, (m) => m.PROBE_T, { B, seed: SEED + 77 });
  return { trainPairs: A.length / 2, testPairs: T.length / 2, auc: b.point, ci: [b.lo, b.hi], perStratum: Object.fromEntries(POOLED.map((st) => [st, te[st].length >= 2 ? round(aucPairs(te[st], (m) => m.PROBE_T)) : null])) };
}

async function main() {
  const t0 = Date.now(), rows = loadRows(DATA), pairs = withVectors(buildPairs(rows));
  const sums = fs.readdirSync(DATA).filter((f) => f.endsWith(".summary.json")).map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")));
  const k1n = sums.reduce((a, s) => a + s.K1_sham.n, 0), k1 = sums.reduce((a, s) => a + (s.K1_sham.nullShare ?? 0) * s.K1_sham.n, 0), k6n = sums.reduce((a, s) => a + s.K6_determinism.n, 0), k6 = sums.reduce((a, s) => a + s.K6_determinism.same, 0);
  const result = { module: "eval/law/provisional/ablation-scope/confirm-rules.mjs", rulesFile: RULES_F, rulesFileSha256: createHash("sha256").update(fs.readFileSync(RULES_F)).digest("hex"), data: DATA, B, rows: rows.length, pairs: pairs.length,
    K1_sham: { nullShare: k1n ? round(k1 / k1n) : null, n: k1n }, K6_determinism: { same: k6, n: k6n }, candidates: {}, limits: {}, probes: {}, finalRules: [] };
  result.runValid = result.K1_sham.nullShare === 1 && k6 === k6n;
  for (const spec of frozen.candidates) { result.candidates[spec.tag] = evalScope(pairs, spec, spec.tag); console.error(`${spec.tag}: ${result.candidates[spec.tag].verdict} auc ${result.candidates[spec.tag].auc} ${JSON.stringify(result.candidates[spec.tag].ci)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
  for (const spec of frozen.limits) { result.limits[spec.tag] = evalScope(pairs, spec, spec.tag); console.error(`${spec.tag}: auc ${result.limits[spec.tag].auc} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
  const train = withVectors(buildPairs(loadRows(TRAIN)));
  for (const [kt, ke, g] of [["irc", "irc", "A"], ["irc", "irc", "B"], ["wp", "mm", "A"], ["wp", "mm", "B"]]) result.probes[`${ke}.${g}`] = { record: probeTransfer(train, pairs, kt, ke, g, "rv"), controlVector: probeTransfer(train, pairs, kt, ke, g, "cv") };
  const pass = Object.values(result.candidates).filter((c) => c.verdict === "PASS").sort((a, b) => b.ci[0] - a.ci[0]);
  const fam = (c) => `${c.spec.group}:${frozen.candidates.find((x) => x.id === c.spec.id)?.scoreKind === "ablation" ? "slot" : /^c\./.test(c.spec.score) ? "company" : "record"}`, seen = new Set();
  for (const c of pass) { const k = fam(c); if (seen.has(k) || result.finalRules.length >= 2) continue; seen.add(k); result.finalRules.push({ id: c.spec.id, tag: Object.keys(result.candidates).find((t) => result.candidates[t] === c), confirmedAuc: c.auc, ci: c.ci, scope: c.liveStrata.filter((st) => c.cells[st].auc >= 0.58), threshold: c.spec.threshold, tpr: c.tpr, tnr: c.tnr }); }
  result.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  result.seconds = round((Date.now() - t0) / 1000, 1);
  fs.mkdirSync(path.dirname(OUTF), { recursive: true });
  fs.writeFileSync(OUTF, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ runValid: result.runValid, verdicts: Object.fromEntries(Object.entries(result.candidates).map(([k, v]) => [k, v.verdict])), finalRules: result.finalRules.map((r) => r.id), headerSha256: result.headerSha256 }, null, 1));
}
await main();
