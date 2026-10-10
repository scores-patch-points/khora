// attack-R1_first_slot_share/attackC.mjs: ATTACK C (count rival) on rule R1_first_slot_share. Usage: node attackC.mjs c0|c1|c2|c3   (never pass "run" as first argument). Results: results/C.<part>.json (carries the header sha256).
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this script) ═══
// DISCLOSURE. As attackA.mjs, plus its RESULTS, which I had read before writing this header (scoper's S0 pairs on R, C, D, RC): ISHARE AUC 0.882/0.856/0.864/0.871; the unmatched RECENCY control (-log2(1+gap to the last earlier mention)) has AUC 0.70
//   on the same S0 pairs (R 0.701, C 0.694, RC 0.698) while b and the other scoper controls are 0.50-0.51; stricter keys S1..S7 give 1-1 AUC RC 0.81, 0.74, 0.69(VOID: rec control 0.552), 0.68, 0.77, 0.81, 0.72 and pooled-stratified RC 0.86, 0.83, 0.80,
//   0.79, 0.84, 0.83, 0.78 (all matched controls in band); min-chars 1/2/4 do not change S0 (0.873/0.880/0.879); leak audit clean; top false positives are interjections (yeah hey lol hello hmm sorry yes). I have NOT seen the AUC of c8, c32, c128, a, a1, slot shares,
//   shuffled-history ISHARE, or any probe on any pair set. Sets and gold exactly as attackA.mjs: EN days; R = 14 reserve (never R1-scored; used by name-company tests), C = 36 confirm (EN 23 days with pairs), D = 42 discovery (EN 29), RC = R+C primary.
// ROWS. ONE row set for every comparison: the scoper's S0 pairs (own matcher, within day, exact cell, <= 400 per day, seeded, EN LATER ALL). Facets INIT (i = 0) and NONINIT are subsets of the same rows.
// CANDIDATE RIVALS = cheaper or alternative observables, each a fixed column with a fixed direction (+1): b (earlier messages containing w); c8, c32, c128 (messages containing w in the last 8/32/128 messages); rec (-log2(1+gap since the last earlier mention));
//   recI (same for the last first-slot occurrence); lc (whole-day log2 count; matched, a built-to-fail control); mday (position in the day); cl, len, i (matched controls); a (earlier first-word messages); a1 (a > 0); a32, a128 (first-word messages in the last 32/128);
//   earSh ((first-or-second-word messages +1)/(b+2)); secSh (second-word share); lstSh (last-word share); and ishare itself. ishareWS = ISHARE recomputed on the SAME rows from a stream whose tokens are permuted inside every earlier message (seeded);
//   ishareMS = ISHARE recomputed on the same rows after permuting the ORDER of the messages (the occurrence moves with its message; destroys recency and turn order, keeps type-level counts).
// TESTS AND BARS (fixed now). c0: paired AUC of every column on RC (and R, C, D, INIT, NONINIT) with day-cluster bootstrap CI of the DIFFERENCE ishare minus rival (B = 300). RIVAL-WINS iff a CHEAP rival (b c8 c32 c128 rec recI lc mday cl len i) has AUC >= ishare - 0.03 on RC.
//   PARTLY-COUNT-EXPLAINED iff a cheap rival has AUC >= 0.75 on RC. a/a1/a32/a128/earSh/secSh/lstSh are reported as the first-slot family and alternative slots (not cheap rivals; a1 within 0.03 means the smoothing and the 0.67 threshold add nothing).
//   c1: same-row shuffles: wordshuf lowers ishare AUC by >= 0.10 (else not slot-specific); msgshuf reported (if msgshuf AUC is within 0.03 of real, recency/turn order is NOT what carries the score).
//   c2: PROBE (fitted, existence test, label PROBE): Bradley-Terry logistic on pair differences of log1p(b c8 c32 c128) and rec, fitted on D pairs, scored on R and on C pairs; also count probe + ishare. RIVAL-WINS iff the count probe AUC on R or C >= ishare - 0.03.
//   c3: BEYOND-RIVAL: AUC of ishare on the S0 pairs whose pos and neg fall in the SAME bin of the rival (b exact capped 8; c8 exact capped 6; c32 exact capped 12; c128 log2 bin; rec half-octave bin of gap): bar >= 0.65 each with >= 200 kept pairs on RC, else NARROWER.
//   Also c3: AUC of ishare by history length (pos.b bins 1, 2, 3-4, 5-8, 9+) and by gap tercile of the positive.
// BLIND PREDICTIONS (P): no cheap rival within 0.03 (0.8); c32 AUC in [0.65,0.80] (0.65); c8 in [0.58,0.78] (0.6); c128 in [0.60,0.78] (0.6); a1 within 0.03 of ishare (0.45); secSh <= 0.70 (0.6); lstSh <= 0.60 (0.8); wordshuf same-row <= 0.70 (0.85);
//   msgshuf same-row within 0.03 of real (0.75); count probe test AUC <= 0.78 (0.7); beyond-c32 AUC in [0.70,0.85] (0.6); AUC increases with pos.b (0.85).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, buildIx, feat, SETS, headerSha, LANG, rngOf, shuffleIn } from "./lib.mjs";
import { matchDay, pAuc, bootPairs, byDay, round, wins } from "./match.mjs";
process.env.NAME_COMPANY_PAIRBLOCK = "1";
const SHA = headerSha(import.meta.url), part = process.argv[2], EN = (k) => LANG[k.split("/")[0]] === "en";
const SET = { R: SETS.R.filter(EN), C: SETS.C.filter(EN), D: SETS.D.filter(EN) };
const COLS = ["ishare", "b", "c8", "c32", "c128", "rec", "recI", "lc", "mday", "cl", "len", "i", "a", "a1", "a32", "a128", "earSh", "secSh", "lstSh", "ishareWS", "ishareMS"];
const CHEAP = ["b", "c8", "c32", "c128", "rec", "recI", "lc", "mday", "cl", "len", "i"];
const t0 = Date.now(), log = (m) => console.error(((Date.now() - t0) / 1000).toFixed(0) + "s " + m), out = { part, headerSha256: SHA };
/** All S0 pairs of one set, with same-row shuffled-history columns. */
function pairsOf(keys) {
  const P = [];
  for (const key of keys) {
    const d = loadDay(key), m = matchDay(d, "S0", { max: 400 }); if (!m.pairs.length) continue;
    const r = rngOf("C-shuf", key), n = d.T.length;
    const Tw = d.T.map((t) => shuffleIn(t.slice(), r)), ixW = buildIx(Tw), perm = shuffleIn([...Array(n).keys()], r), Tm = Array(n); perm.forEach((to, from) => { Tm[to] = d.T[from]; }); const ixM = buildIx(Tm);
    for (const p of m.pairs) for (const s of [p.pos, p.neg]) { s.ishareWS = feat(ixW, s.k, s.w).ishare; s.ishareMS = feat(ixM, perm[s.k], s.w).ishare; delete s._f; }
    P.push(...m.pairs); log(key + " pairs " + m.pairs.length);
  }
  return P;
}
const diffCi = (ps, colB, B = 300, seed = "dc") => { const by = new Map(); for (const p of ps) (by.get(p.day) ?? by.set(p.day, []).get(p.day)).push(wins(p, "ishare") - wins(p, colB)); const C = [...by.values()]; if (C.length < 4) return [null, null]; const r = rngOf(seed, colB), v = []; for (let b = 0; b < B; b++) { let s = 0, n = 0; for (let j = 0; j < C.length; j++) { const c = C[Math.floor(r() * C.length)]; for (const x of c) s += x; n += c.length; } v.push(s / n); } v.sort((a, b) => a - b); return [round(v[Math.floor(0.025 * B)]), round(v[Math.ceil(0.975 * B) - 1])]; };
const PAIRS = {}; for (const sn of ["R", "C", "D"]) PAIRS[sn] = pairsOf(SET[sn]); PAIRS.RC = [...PAIRS.R, ...PAIRS.C];
const FAC = { ALL: () => true, INIT: (p) => p.pos.init, NONINIT: (p) => !p.pos.init };
{
  out.table = {};
  for (const sn of ["RC", "R", "C", "D"]) for (const [fn, ff] of Object.entries(FAC)) { const ps = PAIRS[sn].filter(FAC[fn]); const row = { n: ps.length, auc: Object.fromEntries(COLS.map((c) => [c, round(pAuc(ps, c))])) }; if (sn === "RC" && fn === "ALL") row.diffCi = Object.fromEntries(COLS.filter((c) => c !== "ishare").map((c) => [c, diffCi(ps, c)])); out.table[`${sn}|${fn}`] = row; }
}

// c2: PROBE (existence test, fitted on D pairs). Bradley-Terry logistic on pair differences of the transformed columns, standardised by the RMS of the differences; plain gradient descent, L2 = 1e-3.
const TR = { b: (x) => Math.log1p(x), c8: (x) => Math.log1p(x), c32: (x) => Math.log1p(x), c128: (x) => Math.log1p(x), rec: (x) => x, a: (x) => Math.log1p(x), ishare: (x) => x, a1: (x) => x };
const xs = (ps, cols) => ps.map((p) => cols.map((c) => TR[c](p.pos[c]) - TR[c](p.neg[c])));
function fitBT(ps, cols) { const X = xs(ps, cols), sd = cols.map((_, j) => Math.sqrt(X.reduce((s, x) => s + x[j] * x[j], 0) / X.length) || 1), Z = X.map((x) => x.map((v, j) => v / sd[j])); let w = cols.map(() => 0);
  for (let it = 0; it < 400; it++) { const g = cols.map((_, j) => 1e-3 * w[j]); for (const z of Z) { const s = 1 / (1 + Math.exp(w.reduce((t, wj, j) => t + wj * z[j], 0))); for (let j = 0; j < w.length; j++) g[j] -= (s * z[j]) / Z.length; } w = w.map((wj, j) => wj - 1.0 * g[j]); } return { w, sd }; }
const scoreBT = (m, ps, cols) => { const X = xs(ps, cols); return X.reduce((s, x) => { const v = x.reduce((t, xj, j) => t + (m.w[j] * xj) / m.sd[j], 0); return s + (v > 0 ? 1 : v === 0 ? 0.5 : 0); }, 0) / X.length; };
const CNT = ["b", "c8", "c32", "c128", "rec"];
out.probe = { label: "PROBE: fitted on D pairs, existence test only", fit: {} };
for (const [nm, cols] of [["count", CNT], ["count+ishare", [...CNT, "ishare"]], ["a1+count", [...CNT, "a1"]]]) { const m = fitBT(PAIRS.D, cols); out.probe.fit[nm] = { weights: Object.fromEntries(cols.map((c, j) => [c, round(m.w[j] / m.sd[j], 3)])), trainD: round(scoreBT(m, PAIRS.D, cols)), testR: round(scoreBT(m, PAIRS.R, cols)), testC: round(scoreBT(m, PAIRS.C, cols)), testRC: round(scoreBT(m, PAIRS.RC, cols)) }; }
// c3: BEYOND-RIVAL (same-bin subsets of the S0 rows) and AUC by history length and by gap tercile of the positive.
const BIN = { b: (x) => Math.min(8, x), c8: (x) => Math.min(6, x), c32: (x) => Math.min(12, x), c128: (x) => Math.floor(Math.log2(1 + x)), rec: (x) => Math.floor(2 * -x) };
out.beyond = {};
for (const sn of ["RC", "R", "C", "D"]) for (const [rv, f] of Object.entries(BIN)) { const keep = PAIRS[sn].filter((p) => f(p.pos[rv]) === f(p.neg[rv])); out.beyond[`${sn}|${rv}`] = { kept: keep.length, share: round(keep.length / PAIRS[sn].length), auc: keep.length >= 20 ? round(pAuc(keep, "ishare")) : null, dayCi: keep.length >= 100 ? bootPairs(keep, "ishare", byDay, 300, "bey" + rv) : null }; }
const binsB = [[1, 1], [2, 2], [3, 4], [5, 8], [9, 1e9]]; out.byHistory = {};
for (const [lo, hi] of binsB) { const ps = PAIRS.RC.filter((p) => p.pos.b >= lo && p.pos.b <= hi); out.byHistory[`b${lo}-${hi}`] = { n: ps.length, auc: round(pAuc(ps, "ishare")), c32: round(pAuc(ps, "c32")), rec: round(pAuc(ps, "rec")) }; }
const gs = PAIRS.RC.map((p) => p.pos.rec).sort((a, b) => a - b), g1 = gs[Math.floor(gs.length / 3)], g2 = gs[Math.floor((2 * gs.length) / 3)]; out.byGap = {};
for (const [nm, f] of [["gapFar", (p) => p.pos.rec <= g1], ["gapMid", (p) => p.pos.rec > g1 && p.pos.rec <= g2], ["gapNear", (p) => p.pos.rec > g2]]) { const ps = PAIRS.RC.filter(f); out.byGap[nm] = { n: ps.length, auc: round(pAuc(ps, "ishare")), rec: round(pAuc(ps, "rec")), c32: round(pAuc(ps, "c32")) }; }
out.gapCuts = [round(g1), round(g2)];
out.seconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(new URL(`./results/C.${part}.json`, import.meta.url), JSON.stringify(out)); console.log(JSON.stringify({ part, sha: SHA, seconds: out.seconds }));
