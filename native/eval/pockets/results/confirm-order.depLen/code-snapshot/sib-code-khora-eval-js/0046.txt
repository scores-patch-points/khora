// eval/law/provisional/ablation-scope/analyse-strata.mjs — DISCOVERY analysis: does the ablation signature separate names from matched unlabelled tokens INSIDE local-count strata?
//
//   node analyse-strata.mjs --data DIR --out FILE [--B 1000]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE any read-strata record was opened; the reads were started first but only their stderr progress was looked at) ═══
// QUESTION. NAME-RULE-RESULTS.md: S_ENTRY (referent-entry slots changed by deleting a token) separated IRC nicknames at 0.843 but a plain local mention count scored 0.853 and
// 92.1% of nickname mentions are message-initial; on War and Peace it was 0.513. UNTESTED hypothesis there: S_ENTRY measures FRAGILITY NEAR THE RECURRENCE FLOOR (reader floor:
// minMentions 2), not name-ness. This script asks WHERE, if anywhere, S_ENTRY (and the rest of the ablation record) separates names from unlabelled tokens that are matched on
// the local count c and on within-message position, and what the scope is. Provisional, scoped rules are the wanted output; the strong verdict is not.
// DISCLOSURE. Same as read-strata.mjs (aggregates only; timings; the Middlemarch gold list). Nothing in DIR was opened before this header was written.
// DATA. DIR = read-strata JSONL from the discovery IRC days of days.json (ubuntu/2008-03-15, 2010-03-15, 2010-07-15, 2013-03-15; M=256 messages) and War and Peace (M=128 sentences),
// strata c1 c2 c3 c4_6 c7_15 c16p, groups A (message/sentence-initial) and B (not). Complete pairs only. Blocks for the bootstrap = document x stream quartile.
// SCORES (fixed functions of the impact record, higher = more name-like, direction fixed here): S_ENTRY (primary), S_OWN, S_ALL, S_SPAN, EXTENT (extent.tokens), NONNULL.
// RIVALS and CONTROLS (observables with no ablation): R_BURST (causal burstiness, a rival), and the matched-out controls R_LOGC (local count), R_POS (message index), R_IPOS
// (in-message index), R_FB (form frequency bin), R_LEN (characters), R_SL (message length).
// TESTS.
//   T1 cell AUC. For every (kind irc|wp, group, stratum) cell with >= 25 complete pairs: AUC of each score and rival (names vs matched), cluster-bootstrap 95% interval (B=1000),
//      within-pair label-swap permutation null (B=1000: q95 and p). Also pooled over strata c2..c16p as the pair-weighted mean of stratum AUCs (a stratified AUC).
//   T2 controls built to fail. (a) per cell: each control's 99% bootstrap interval must contain 0.5, else the cell is VOID. (b) pooled over c2..c16p per (kind, group): each control must
//      lie in [0.45, 0.55], else that (kind, group) is VOID. (c) K1 sham ablation 100% null and K6 determinism 100% in every read summary, else the whole run is void. (d) a PROBE on the
//      control vector alone (T6) must score <= 0.55; if not the matching leaks and nothing is claimed.
//   T3 trace. Share of non-null signatures for names and for unlabelled tokens, and the median extent, per cell (the fragility hypothesis predicts a floor/decay in c).
//   T4 ACTIVE cell. Not VOID, >= 25 pairs, AUC(S_ENTRY) >= 0.60, 95% lower bound > 0.50, AUC > permutation q95. Also reported: AUC(S_ENTRY) - AUC(R_BURST) with its cluster interval.
//   T5 candidate rules (at most 2). A candidate = a maximal run of consecutive ACTIVE strata (order c1 c2 c3 c4_6 c7_15 c16p) in one (kind, group). Its frozen score = S_ENTRY unless
//      another fixed score beats it by >= 0.015 stratified AUC over the run (then that score). Its frozen threshold = the value in {1,2,3,4,6,8,12,16,24,32,48,64,100,150,250} that
//      maximises balanced accuracy over the run (ties: the lower value); it is the ONLY fitted quantity and is labelled so. Gates: run pair count >= 60; the run's AUC > 0.5 in >= 3 of 4
//      blocks-of-the-stream (IRC: of the 4 days; wp: of the 4 quartiles). Rank by the lower 95% bound of the run AUC; emit the best two; write rules.json.
//   T6 PROBE (a fitted classifier, an existence test, not a rule): ridge-logistic with PCA-24 (cvScores of name-war-and-peace.mjs) on the record vector (sig, atm, span, c: 144 numbers),
//      leave-one-block-out over strata c2..c16p of one (kind, group), both pair members in the positive's block; stratified AUC with interval, and its difference to S_ENTRY.
//      Control probe on [log c, log s, in-message index, length, form bin, log message length].
// BLIND PREDICTIONS (my beliefs before seeing data; orders are the claims).
//   P1 FRAGILITY GRADIENT. IRC group A: AUC(S_ENTRY) >= 0.60 in at least one of c2, c3, c4_6 and <= 0.55 at c16p.  (belief 0.40)
//   P2 FLOOR. At c1, AUC(S_ENTRY) in [0.45, 0.55] for IRC A, IRC B and WP B, and names' non-null share <= 0.20.  (0.85)
//   P3 MATCHING COLLAPSES IRC. IRC group A stratified AUC(S_ENTRY) over c2..c16p <= 0.70 (the unmatched 0.843 was mostly count + position).  (0.70)
//   P4 WP. wp group B: AUC(S_ENTRY) in [0.45, 0.55] at c4_6, c7_15 and c16p, while at c2 or c3 it is >= 0.58.  (0.30)
//   P5 THE RECORD HAS MORE THAN THE SCALAR. PROBE stratified AUC exceeds S_ENTRY's by >= 0.05 in IRC A and in WP B.  (0.60)
//   P6 SPAN EXTENT. In IRC A, AUC(EXTENT) >= AUC(S_ENTRY) - 0.02.  (0.45)
//   P7 DECAY WITH c. Unlabelled tokens' non-null share falls with c: IRC A share at c16p <= share at c2 - 0.15.  (0.55)
// VERDICT LABELS. FRAGILITY-SUPPORTED: P1 and P7 true. COUNT-INDEPENDENT: S_ENTRY ACTIVE in >= 3 of the 5 strata c2..c16p of one (kind, group). NO-SCOPE: no ACTIVE cell at all.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { cvScores } from "../../name-war-and-peace.mjs";
import { aucPairs, stratAuc, bootStrat, permStrat, round, median, mean } from "./stats.mjs";
import { SCORES, CONTROLS, loadRows, buildPairs, cellPairs } from "./features.mjs";
import { STRATA } from "./lib-pairs.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt("--data", "data/discovery"), OUTF = opt("--out", "results/discovery.json"), B = Number(opt("--B", 1000));
const MINP = 25, ACTIVE_AUC = 0.60, GRID = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 100, 150, 250];
const POOLED = STRATA.filter((s) => s !== "c1");
const SEED = 20261007;
const get = (name) => (sc) => sc[name];

// ── per-cell and pooled reports ───────────────────────────────────────────────────────────────────────────────────────────────────────
const nonNull = (xs) => (xs.length ? xs.filter((x) => !x.isNull).length / xs.length : null);
function report(pairsBy, tag) {
  const all = Object.values(pairsBy).flat();
  const out = { n: all.length, byStratum: Object.fromEntries(Object.entries(pairsBy).map(([k, v]) => [k, v.length])), auc: {}, ci: {}, perm: {}, controls: {}, controlCI99: {}, trace: {} };
  let sd = SEED + tag.length;
  for (const s of [...SCORES, "R_BURST"]) { const b = bootStrat(pairsBy, get(s), { B, seed: sd++ }); out.auc[s] = b.point; out.ci[s] = [b.lo, b.hi]; }
  for (const s of SCORES) out.perm[s] = permStrat(pairsBy, get(s), { B, seed: sd++ });
  for (const s of CONTROLS) { const b = bootStrat(pairsBy, get(s), { B, seed: sd++, qLo: 0.005, qHi: 0.995 }); out.controls[s] = b.point; out.controlCI99[s] = [b.lo, b.hi]; }
  out.diffEntryMinusBurst = bootStrat(pairsBy, get("S_ENTRY"), { B, seed: sd++, g: get("R_BURST") });
  const P = all.map((x) => x.p), N = all.map((x) => x.n);
  out.trace = { nonNullNames: round(nonNull(P)), nonNullUnlabelled: round(nonNull(N)), medianExtentNames: median(P.map((x) => x.extent)), medianExtentUnlabelled: median(N.map((x) => x.extent)) };
  out.voidCell = CONTROLS.some((c) => out.controlCI99[c][0] > 0.5 || out.controlCI99[c][1] < 0.5);
  out.controlsInBand = CONTROLS.every((c) => out.controls[c] >= 0.45 && out.controls[c] <= 0.55);
  return out;
}
const isActive = (cell, pooledVoid) => cell.n >= MINP && !cell.voidCell && !pooledVoid && cell.auc.S_ENTRY >= ACTIVE_AUC && cell.ci.S_ENTRY[0] > 0.5 && cell.auc.S_ENTRY > cell.perm.S_ENTRY.q95;

// ── T6 probes ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function probeFor(pairsBy, key, vecOf) {
  const all = Object.values(pairsBy).flat();
  const members = all.flatMap((x) => [{ m: x.p, y: 1, block: x.block }, { m: x.n, y: 0, block: x.block }]);
  if (members.length < 60 || new Set(members.map((r) => r.y)).size < 2) return null;
  const sc = cvScores(members.map((r) => vecOf(r.m)), members.map((r) => r.y), members.map((r) => r.block));
  members.forEach((r, k) => { r.m[key] = sc[k] ?? 0; });
  const b = bootStrat(pairsBy, get(key), { B, seed: SEED + 99, qLo: 0.025, qHi: 0.975 });
  const per = Object.fromEntries(Object.entries(pairsBy).map(([st, ps]) => [st, ps.length >= 2 ? round(aucPairs(ps, get(key))) : null]));
  return { auc: b.point, ci: [b.lo, b.hi], perStratum: per };
}

// ── rules from runs of ACTIVE strata ─────────────────────────────────────────────────────────────────────────────────────────────────────
function ruleOfRun(kind, grp, run, by) {
  const runBy = Object.fromEntries(run.map((st) => [st, by[st]]));
  const strat = Object.fromEntries(SCORES.map((s) => [s, stratAuc(runBy, get(s))]));
  const best = SCORES.reduce((a, s) => (strat[s] > strat[a] ? s : a), "S_ENTRY");
  const score = strat[best] >= strat.S_ENTRY + 0.015 ? best : "S_ENTRY";
  const b = bootStrat(runBy, get(score), { B, seed: SEED + 1234 });
  const all = Object.values(runBy).flat();
  let bestT = null;
  for (const T of GRID) {
    const tpr = all.filter((x) => x.p[score] >= T).length / all.length, tnr = all.filter((x) => x.n[score] < T).length / all.length, ba = (tpr + tnr) / 2;
    if (!bestT || ba > bestT.ba + 1e-12) bestT = { T, tpr: round(tpr), tnr: round(tnr), ba: round(ba) };
  }
  const groups = new Map(); for (const x of all) (groups.get(kind === "irc" ? x.doc : x.block.split("|")[1]) ?? groups.set(kind === "irc" ? x.doc : x.block.split("|")[1], []).get(kind === "irc" ? x.doc : x.block.split("|")[1])).push(x);
  const per = [...groups].filter(([, ps]) => ps.length >= 5).map(([k, ps]) => [k, round(aucPairs(ps, get(score))), ps.length]);
  const above = per.filter(([, a]) => a > 0.5).length;
  const gates = { pairs: all.length >= 60, consistency: above >= 3 && above / Math.max(1, per.length) >= 0.75 };
  return { kind, group: grp, strata: run, score, direction: "higher = name", threshold: bestT.T, thresholdFittedOnDiscovery: true, discoveryAuc: b.point, ci95: [b.lo, b.hi], pairs: all.length, balancedAccuracyAtThreshold: bestT, allScoresStratAuc: Object.fromEntries(Object.entries(strat).map(([k, v]) => [k, round(v)])), consistencyPerBlock: per, gates, pass: gates.pairs && gates.consistency };
}
const runsOf = (active) => { const runs = []; let cur = []; for (const st of STRATA) { if (active[st]) cur.push(st); else { if (cur.length) runs.push(cur); cur = []; } } if (cur.length) runs.push(cur); return runs; };

async function main() {
  const t0 = Date.now(), rows = loadRows(DATA), pairs = buildPairs(rows);
  const sums = fs.readdirSync(DATA).filter((f) => f.endsWith(".summary.json")).map((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")));
  const k1n = sums.reduce((a, s) => a + s.K1_sham.n, 0), k1null = sums.reduce((a, s) => a + (s.K1_sham.nullShare ?? 0) * s.K1_sham.n, 0);
  const k6n = sums.reduce((a, s) => a + s.K6_determinism.n, 0), k6same = sums.reduce((a, s) => a + s.K6_determinism.same, 0);
  const result = { module: "eval/law/provisional/ablation-scope/analyse-strata.mjs", data: DATA, B, rows: rows.length, pairs: pairs.length, readSummaries: sums.length, gapsTotal: sums.reduce((a, s) => a + s.gaps, 0),
    K1_sham: { nullShare: k1n ? round(k1null / k1n) : null, n: k1n }, K6_determinism: { same: k6same, n: k6n }, cells: {}, pooled: {}, probes: {}, rules: [], candidates: [], predictions: {} };
  result.runValid = result.K1_sham.nullShare === 1 && k6same === k6n;
  for (const kind of [...new Set(pairs.map((p) => p.kind))]) for (const grp of ["A", "B"]) {
    const key = `${kind}.${grp}`, by = cellPairs(pairs, kind, grp, STRATA), pooledBy = Object.fromEntries(POOLED.map((st) => [st, by[st]]));
    if (Object.values(pooledBy).flat().length < MINP) { result.pooled[key] = { n: Object.values(pooledBy).flat().length, skipped: "too few pairs" }; continue; }
    const pooled = report(pooledBy, `${key}pool`); pooled.voidPooled = !pooled.controlsInBand; result.pooled[key] = pooled;
    result.probes[key] = { record: probeFor(pooledBy, "PROBE", (m) => m.rv), controlVector: probeFor(pooledBy, "PROBE_C", (m) => m.cv) };
    if (result.probes[key].record) result.probes[key].diffToEntry = bootStrat(pooledBy, get("PROBE"), { B, seed: SEED + 5, g: get("S_ENTRY") });
    result.cells[key] = {}; const active = {};
    for (const st of STRATA) {
      if (by[st].length < MINP) { result.cells[key][st] = { n: by[st].length, skipped: "too few pairs" }; continue; }
      const cell = report({ [st]: by[st] }, `${key}${st}`); cell.active = isActive(cell, pooled.voidPooled); active[st] = cell.active; result.cells[key][st] = cell;
    }
    for (const run of runsOf(active)) { const r = ruleOfRun(kind, grp, run, by); r.id = `${key}:${run[0]}..${run[run.length - 1]}`; result.candidates.push(r); }
    console.error(`${key}: ${Object.values(by).flat().length} pairs, pooled S_ENTRY ${pooled.auc.S_ENTRY} ${JSON.stringify(pooled.ci.S_ENTRY)}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  result.rules = result.candidates.filter((r) => r.pass).sort((a, b) => b.ci95[0] - a.ci95[0]).slice(0, 2);
  const C = result.cells, Pl = result.pooled, au = (k, st, s = "S_ENTRY") => C[k]?.[st]?.auc?.[s], nn = (k, st, w) => C[k]?.[st]?.trace?.[w];
  const inB = (x) => x != null && x >= 0.45 && x <= 0.55;
  result.predictions = {
    P1_fragility_gradient: { hold: [au("irc.A", "c2"), au("irc.A", "c3"), au("irc.A", "c4_6")].some((x) => x >= 0.60) && au("irc.A", "c16p") <= 0.55, aucs: Object.fromEntries(STRATA.map((st) => [st, au("irc.A", st)])) },
    P2_floor: { hold: ["irc.A", "irc.B", "wp.B"].every((k) => inB(au(k, "c1")) && nn(k, "c1", "nonNullNames") <= 0.20), detail: ["irc.A", "irc.B", "wp.A", "wp.B"].map((k) => [k, au(k, "c1"), nn(k, "c1", "nonNullNames")]) },
    P3_matching_collapses_irc: { hold: Pl["irc.A"]?.auc?.S_ENTRY <= 0.70, value: Pl["irc.A"]?.auc?.S_ENTRY },
    P4_wp: { hold: ["c4_6", "c7_15", "c16p"].every((st) => inB(au("wp.B", st))) && [au("wp.B", "c2"), au("wp.B", "c3")].some((x) => x >= 0.58), aucs: Object.fromEntries(STRATA.map((st) => [st, au("wp.B", st)])) },
    P5_record_beats_scalar: { hold: ["irc.A", "wp.B"].every((k) => (result.probes[k]?.diffToEntry?.point ?? -1) >= 0.05), diffs: ["irc.A", "irc.B", "wp.A", "wp.B"].map((k) => [k, result.probes[k]?.diffToEntry?.point]) },
    P6_extent: { hold: Pl["irc.A"]?.auc?.EXTENT >= Pl["irc.A"]?.auc?.S_ENTRY - 0.02, extent: Pl["irc.A"]?.auc?.EXTENT, entry: Pl["irc.A"]?.auc?.S_ENTRY },
    P7_decay: { hold: nn("irc.A", "c16p", "nonNullUnlabelled") <= nn("irc.A", "c2", "nonNullUnlabelled") - 0.15, byStratum: Object.fromEntries(STRATA.map((st) => [st, [nn("irc.A", st, "nonNullNames"), nn("irc.A", st, "nonNullUnlabelled")]])) },
  };
  const nActive = (k) => STRATA.filter((st) => st !== "c1" && C[k]?.[st]?.active).length;
  result.verdict = { FRAGILITY_SUPPORTED: !!(result.predictions.P1_fragility_gradient.hold && result.predictions.P7_decay.hold), COUNT_INDEPENDENT_kinds: Object.keys(C).filter((k) => nActive(k) >= 3), NO_SCOPE: !Object.values(C).some((g) => Object.values(g).some((c) => c.active)), activeCells: Object.entries(C).flatMap(([k, g]) => Object.entries(g).filter(([, c]) => c.active).map(([st]) => `${k}:${st}`)), runValid: result.runValid };
  result.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  result.seconds = round((Date.now() - t0) / 1000, 1);
  fs.mkdirSync(path.dirname(OUTF), { recursive: true });
  fs.writeFileSync(OUTF, JSON.stringify(result, null, 1));
  fs.writeFileSync(path.join(path.dirname(OUTF), "rules.json"), JSON.stringify({ headerSha256: result.headerSha256, from: OUTF, rules: result.rules }, null, 1));
  console.log(JSON.stringify({ verdict: result.verdict, rules: result.rules.map((r) => r.id), predictions: Object.fromEntries(Object.entries(result.predictions).map(([k, v]) => [k, v.hold])), headerSha256: result.headerSha256 }, null, 1));
}
await main();
