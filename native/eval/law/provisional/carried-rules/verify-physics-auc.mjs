// verify-physics-auc.mjs — a probability-of-superiority (AUC) form of the floor cliff, recomputed from the SAVED single-deletion rows (new file).
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. Re-aggregation of saved rows only (results/reader/*.w1.jsonl and *.w2.jsonl: one row per snapshot, each with `singles` = single-mention deletions carrying n (mentions
//   of the form in the window) and S (slots changed)). No reader is run. Purpose: the carried rule book needs an AUC-form effect for the "floor cliff" rule; the physics report states
//   only a ratio of means (2.09 wave 1, 2.11 wave 2).
// DISCLOSURE. Seen: physics-handles REPORT.md (cliff 2.09 / 2.11, n=2 mean 4.17 vs n=3-4 mean 1.99; n=1 0.91), the _report.w1/w2.json pooled blocks. Not seen: any AUC of S between n classes.
// DEFINITIONS. Rows: every element of `singles` with n >= 1 and a numeric S, over all corpora files present (w1 and w2 separately). Classes: N1 (n=1), N2 (n=2), N34 (n in 3..4), N5UP (n >= 5).
//   AUC(a, b) = P(S_a > S_b) + 0.5 P(S_a = S_b) (Mann-Whitney), a pair of snapshots is not resampled here; the interval is a bootstrap over SNAPSHOTS (B=200, seeded) because rows
//   inside a snapshot share one reading.
// TESTS. T1 AUC(N2, N34) >= 0.65 in both waves with the interval lower bound above 0.55 (the cliff is an ordinal effect, not only a mean). T2 AUC(N5UP, N34) within 0.45-0.55 in both
//   waves (no inertia above the floor: more mentions do not change one mention's effect). T3 AUC(N1, N34) < 0.5 (a single-mention form changes fewer slots than a recurring one).
// BLIND PREDICTIONS. T1 holds (about 0.75); T2 holds (about 0.50 +- 0.03); T3 holds (about 0.40).
// END-HEADER
import fs from "node:fs";
import path from "node:path";
import { EVAL, round, headerSha, save } from "./lib.mjs";

const DIR = path.join(EVAL, "physics-handles/results/reader");
function auc(a, b) { // Mann-Whitney with ties
  const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]); let rankSumA = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; const r = (i + j + 1) / 2; for (let k = i; k < j; k++) if (all[k][1] === 0) rankSumA += r; i = j; }
  return (rankSumA - (a.length * (a.length + 1)) / 2) / (a.length * b.length);
}
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const cls = (n) => (n === 1 ? "N1" : n === 2 ? "N2" : n >= 3 && n <= 4 ? "N34" : n >= 5 ? "N5UP" : null);
const out = { script: "verify-physics-auc.mjs", headerSha256: headerSha(import.meta.url), note: "re-aggregation of saved rows; no reader run", waves: {} };
for (const w of [1, 2]) {
  const snaps = []; for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(`.w${w}.jsonl`))) for (const line of fs.readFileSync(path.join(DIR, f), "utf8").split("\n")) { if (!line) continue; const r = JSON.parse(line); const g = { N1: [], N2: [], N34: [], N5UP: [] }; for (const s of r.singles ?? []) { const c = cls(s.n); if (c && typeof s.S === "number") g[c].push(s.S); } snaps.push(g); }
  const pool = (idx) => { const g = { N1: [], N2: [], N34: [], N5UP: [] }; for (const i of idx) for (const k of Object.keys(g)) g[k].push(...snaps[i][k]); return g; };
  const stat = (g) => ({ N2_N34: auc(g.N2, g.N34), N5UP_N34: auc(g.N5UP, g.N34), N1_N34: auc(g.N1, g.N34) });
  const base = stat(pool(snaps.map((_, i) => i))), boot = { N2_N34: [], N5UP_N34: [], N1_N34: [] };
  for (let b = 0; b < 200; b++) { const idx = snaps.map(() => Math.floor(rnd() * snaps.length)), s = stat(pool(idx)); for (const k of Object.keys(boot)) boot[k].push(s[k]); }
  const ci = (xs) => { const s = [...xs].sort((a, b) => a - b); return [round(s[Math.floor(0.025 * s.length)]), round(s[Math.floor(0.975 * s.length)])]; };
  const g = pool(snaps.map((_, i) => i));
  out.waves[`w${w}`] = { snapshots: snaps.length, rows: { N1: g.N1.length, N2: g.N2.length, N34: g.N34.length, N5UP: g.N5UP.length }, meanS: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, round(v.reduce((a, b) => a + b, 0) / v.length)])),
    auc: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, round(v)])), ci95: Object.fromEntries(Object.entries(boot).map(([k, v]) => [k, ci(v)])) };
}
const T = (w) => out.waves[w];
out.verdicts = { T1_cliffOrdinal: ["w1", "w2"].every((w) => T(w).auc.N2_N34 >= 0.65 && T(w).ci95.N2_N34[0] > 0.55), T2_noInertiaAboveFloor: ["w1", "w2"].every((w) => T(w).auc.N5UP_N34 >= 0.45 && T(w).auc.N5UP_N34 <= 0.55), T3_singleLess: ["w1", "w2"].every((w) => T(w).auc.N1_N34 < 0.5) };
save("verify-physics-auc.json", out); console.log(JSON.stringify({ verdicts: out.verdicts, w1: out.waves.w1.auc, w2: out.waves.w2.auc, ci: [out.waves.w1.ci95, out.waves.w2.ci95] }));
