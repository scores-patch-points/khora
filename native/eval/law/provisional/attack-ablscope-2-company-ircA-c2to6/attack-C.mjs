// attack-C.mjs -- ATTACK C (COUNT RIVAL) on rule ablscope-2-company-ircA-c2to6.   node attack-C.mjs --stage compute|analyse   (does not import name-company.mjs)
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of this file) ═══
// DISCLOSURE. Seen: the confirmer's primary result (-dSelf 0.834; R_INIT 0.880; ALLINIT 0.821; per-dimension initShare 0.878, entLeft 0.856; sham-all 0.477; incremental probe +0.011) and my attack-A / attack-A2 outputs
//   (strict re-matched sets: -dSelf 0.850 on S_FBL1 136 pairs, 0.860 on S_FBLEN 78 pairs; R_INIT 0.911 / 0.905 there). I have NOT computed, for any pair: nInit-based scores other than R_INIT, the count-only reconstruction g, the first-token-fixed shuffle
//   score, gap-to-previous-mention, or any difference/bootstrap below. I derived from the code (windowCompanyModel) that the initShare component of the descriptor changes by exactly (c-k)/(c(c-1)) when ONE of k initial mentions out of c is deleted
//   (zero iff every mention is initial), i.e. dSelf is a function of the non-initial mention count plus smaller terms: that is the hypothesis under attack ("the ablation re-encodes a plain count").
// SAME ROWS. (R1) confirmer primary pairs (rows.en.jsonl, group A, c2+c3+c4_6, 350 pairs, 23 days); (R2) attack-A2 S_FBL1 conf rows (exact c, fbin, |dlen|<=1; 136 pairs); (R3) attack-A S_FBLEN conf rows (78 pairs).  Statistic = stratified AUC (pair-weighted
//   mean over c2,c3,c4_6), cluster bootstrap B=1000 over day x quartile blocks; differences are bootstrapped on the same resamples.
// RIVALS (all computed from the window's own word forms; HIGHER = name): R_INIT (initial share), nInit (count of initial window mentions), LOO_INIT (initial share of the OTHER mentions), minusNI (minus the count of NON-initial window mentions),
//   ALLINIT (indicator: every mention initial), GAPPREV (minus the message distance to the previous mention of the form in the window; direction fixed now: nearer previous mention = name), R_BURST (scoper's local-rate rival),
//   and the matched-out controls R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL; plus the confirmer's shuffle shams shufAll / shufOthers (R1 only).
// MECHANISM TESTS. M1 COUNT-ONLY RECONSTRUCTION g(c, nInit) = leave-one-block-out mean of dSelf over all members in the cell (c, nInit); AUC(-g) and the in-sample R^2 of dSelf on the cells; M2 residual signal: AUC(-(dSelf - cell mean)) (in-sample cell means);
//   M3 first-token-fixed shuffle: every message of the window keeps its FIRST token and has its other tokens permuted (3 seeds, mean AUC): if the AUC survives, the signal lives in the initial slot, not in the company of the rest;
//   M4 AUC(-dd[initShare]) alone and AUC(-dd[entLeft]) alone (descriptor change in one dimension); M5 descriptive lists: negative forms with ALLINIT=1 and positive forms with ALLINIT=0 (top 25 each, by count) on R1.
// CRITERION (fixed now). A rival REPRODUCES the rule iff AUC(rival) >= AUC(-dSelf) - 0.03 on the same rows. The ablation observable is NECESSARY only if the lower bound of AUC(-dSelf) - AUC(best plain rival) > 0.
// BLIND PREDICTIONS. P1 R_INIT, nInit, LOO_INIT, minusNI each reproduce on R1, R2 and R3 (0.93). P2 R_BURST, GAPPREV and the six controls and both shuffle shams do not (all in [0.40, 0.62]) (0.80). P3 g reproduces: AUC(-g) >= AUC(-dSelf) - 0.03 (0.80);
//   R^2 of dSelf on (c,nInit) cells >= 0.6 (0.65). P4 residual AUC(-(dSelf - cell)) in [0.48, 0.65] (0.70). P5 first-token-fixed shuffle AUC >= 0.78 (0.70). P6 AUC(-dd[initShare]) >= AUC(-dSelf) (0.85).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, CONF, headerSha, readJsonl, NEG, nInit, looInit, groupBy, strat, boot, perStratum, round, mean, quantile, rngFor, companyAt, occOf } from "./lib-atk.mjs";
import { loadIrcDay, IRC_ROOT } from "./lib-strict.mjs";
import { seedFor } from "../../impact.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), STAGE = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : "analyse", B = 1000, M = 256, STR = ["c2", "c3", "c4_6"];
const OUT = path.join(RES, "attack-C.json"), EXTRA = path.join(RES, "rows.C-extra.jsonl");

// ── compute: extra per-member features on R1 (gap to previous mention; dSelf under a FIRST-TOKEN-FIXED shuffle, 3 seeds) ────────────────────────────────────────────────────
function shuffleFixFirst(stream, seed) {
  const rnd = rngFor(seed);
  return stream.map((s) => { const a = s.slice(1); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return s.length ? [s[0], ...a] : s; });
}
function compute() {
  const t0 = Date.now(), r1 = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && STR.includes(r.stratum)), by = groupBy(r1, (r) => r.doc); fs.writeFileSync(EXTRA, "");
  for (const [name, rows] of by) {
    const doc = loadIrcDay(path.join(IRC_ROOT, `${name}.txt`), name), occ = occOf(doc), shufs = [0, 1, 2].map((k) => shuffleFixFirst(doc.stream, seedFor("atk-C", "fixfirst", name, k))), lines = [];
    const feat = (m) => { const list = occ.get(m.w).filter(([s, i]) => s >= m.s - M && (s < m.s || (s === m.s && i < m.i))); const prev = list.length ? list[list.length - 1][0] : null;
      return { gap: prev == null ? M + 1 : m.s - prev, sf: shufs.map((st) => companyAt(st, m.s, m.i, M).dSelf) }; };
    for (const r of rows) lines.push(JSON.stringify({ id: r.id, p: feat(r.p), n: feat(r.n) }));
    fs.appendFileSync(EXTRA, lines.map((l) => l + "\n").join("")); console.error(`${name}: ${rows.length} pairs, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
// ── analysis helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RIVALS = { negDSelf: NEG, R_INIT: (m) => m.R_INIT, nInit: nInit, LOO_INIT: looInit, minusNI: (m) => -(m.nWin - nInit(m)), ALLINIT: (m) => m.ALLINIT, GAPPREV: (m) => -(m.gap ?? 0), R_BURST: (m) => m.R_BURST,
  R_LOGC: (m) => m.R_LOGC, R_POS: (m) => m.R_POS, R_IPOS: (m) => m.R_IPOS, R_FB: (m) => m.R_FB, R_LEN: (m) => m.R_LEN, R_SL: (m) => m.R_SL, shufAll: (m) => -m.shufAll, shufOthers: (m) => -m.shufOthers,
  negDdInit: (m) => -m.dd[5], negDdEntLeft: (m) => -m.dd[3], fixFirstShuf: (m) => -mean(m.sf) };
function table(pairs, names, seed) {
  const base = (ps) => strat(ps, NEG), out = {};
  for (const k of names) { const f = RIVALS[k]; if (pairs.some((x) => [x.p, x.n].some((m) => f(m) === undefined || Number.isNaN(f(m))))) continue;
    const b = boot(pairs, (ps) => strat(ps, f), { B, seed: seed++ }), dlt = k === "negDSelf" ? null : boot(pairs, (ps) => strat(ps, f) - base(ps), { B, seed: seed++ });
    out[k] = { auc: b.point, ci: [b.lo, b.hi], vsRule: dlt ? { delta: dlt.point, ci: [dlt.lo, dlt.hi], reproduces: dlt.point >= -0.03 } : null }; }
  return out;
}
/** M1/M2: count-only reconstruction of dSelf from the cell (c, nInit). LOBO = leave-one-block-out cell mean. */
function mechanism(pairs) {
  const mem = pairs.flatMap((x) => [{ m: x.p, b: x.block }, { m: x.n, b: x.block }]), key = (m) => `${m.c}|${nInit(m)}`, cell = new Map();
  for (const { m, b } of mem) { const k = key(m); (cell.get(k) ?? cell.set(k, []).get(k)).push({ v: m.dSelf, b }); }
  const mu = (k, exB) => { const a = cell.get(k).filter((x) => exB == null || x.b !== exB); return a.length ? mean(a.map((x) => x.v)) : null; };
  const all = mean(mem.map((x) => x.m.dSelf));
  for (const { m, b } of mem) { m.gLobo = mu(key(m), b) ?? all; m.gIn = mu(key(m), null); }
  const ss = (f) => mem.reduce((t, { m }) => t + (f(m)) ** 2, 0), tot = ss((m) => m.dSelf - all), res = ss((m) => m.dSelf - m.gIn);
  const nCells = cell.size, ci = (f) => boot(pairs, (ps) => strat(ps, f), { B, seed: 77 });
  const gl = ci((m) => -m.gLobo), rs = ci((m) => -(m.dSelf - m.gIn)), rl = ci((m) => -(m.dSelf - m.gLobo));
  return { cells: nCells, r2InSample: round(1 - res / tot), aucNegG_lobo: gl.point, ciNegG: [gl.lo, gl.hi], residualInSample: { auc: rs.point, ci: [rs.lo, rs.hi] }, residualLobo: { auc: rl.point, ci: [rl.lo, rl.hi] } };
}
function lists(r1) {
  const cnt = (xs) => Object.entries(xs.reduce((a, w) => { a[w] = (a[w] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w, n]) => `${w}:${n}`);
  return { negativesAllInit: cnt(r1.filter((x) => x.n.ALLINIT === 1).map((x) => x.n.w)), nNegAllInit: r1.filter((x) => x.n.ALLINIT === 1).length, positivesNotAllInit: cnt(r1.filter((x) => x.p.ALLINIT === 0).map((x) => x.p.w)), nPosNotAllInit: r1.filter((x) => x.p.ALLINIT === 0).length, nPairs: r1.length };
}
function analyse() {
  const t0 = Date.now(), r1 = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && STR.includes(r.stratum)), ex = new Map(readJsonl(EXTRA).map((r) => [r.id, r]));
  for (const r of r1) { const e = ex.get(r.id); r.p.gap = e.p.gap; r.n.gap = e.n.gap; r.p.sf = e.p.sf; r.n.sf = e.n.sf; }
  const r2 = readJsonl(path.join(RES, "rows.A2.jsonl")).filter((r) => r.set === "conf"), r3 = readJsonl(path.join(RES, "rows.A-strict.jsonl")).filter((r) => r.set === "conf" && r.variant === "S_FBLEN");
  const res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "C count rival", headerSha256: SHA, B, sets: { R1: r1.length, R2: r2.length, R3: r3.length } };
  const all = Object.keys(RIVALS), noShuf = all.filter((k) => !["shufAll", "shufOthers", "negDdInit", "negDdEntLeft", "fixFirstShuf", "GAPPREV"].includes(k));
  res.R1 = table(r1, all, 100); res.R2 = table(r2, noShuf.concat(["negDdInit", "negDdEntLeft"]), 300); res.R3 = table(r3, noShuf.concat(["negDdInit", "negDdEntLeft"]), 500);
  res.mechanismR1 = mechanism(r1); res.mechanismR2 = mechanism(r2); res.lists = lists(r1);
  res.fixFirstSeeds = [0, 1, 2].map((k) => round(strat(r1, (m) => -m.sf[k])));
  const ties = r1.filter((x) => x.p.R_INIT === x.n.R_INIT && x.p.c === x.n.c); res.tiesOnRInitSameC = { pairs: ties.length, aucNegDSelf: round(strat(ties, NEG)), aucFixFirst: round(strat(ties, (m) => -mean(m.sf))) };
  const best = Object.entries(res.R1).filter(([k]) => ["R_INIT", "nInit", "LOO_INIT", "minusNI", "ALLINIT"].includes(k)).sort((a, b) => b[1].auc - a[1].auc)[0];
  res.verdictC = { bestPlainRival: best[0], bestPlainAucR1: best[1].auc, ruleAucR1: res.R1.negDSelf.auc, deltaCI: best[1].vsRule.ci, rivalReproducesWithin003: best[1].vsRule.delta >= -0.03, ablationNecessary: best[1].vsRule.ci[1] < 0, rivalSignificantlyBetter: best[1].vsRule.ci[0] > 0 };   // vsRule = rival minus rule: the rule's ablation is necessary only if the whole interval is below 0 (sign fixed after the first run, which printed the wrong key; header untouched)
  res.analyseSeconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.verdictC));
}
if (STAGE === "compute" || STAGE === "both") compute();
if (STAGE === "analyse" || STAGE === "both") analyse();
