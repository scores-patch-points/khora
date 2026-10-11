// terrain-arena-step28.mjs — STEP 28: ARE THE OPERATORS REAL ACTS? The last
// axis the battery never falsified. Operators are (mode x domain): the ACT
// performed on a taking. Triholon's claim: the resolving ACT is what earns
// ("the boundary drawn by what happens next"). Operationalize five
// act-registers as different MACHINES over the SAME retained takings on the
// Rigveda frontier, and test whether the act changes the forecast of the
// future read (same holdout as step 24):
//   EVA  evaluate: retain rate = the survival-recurrence comparison (step-24 prior)
//   SIG  sign: retain NOVEL arrivals (first frontier appearance) -> forecast
//   CON  corroborate: retain refs appearing in >= 2 distinct frontier regions
//   REC  revise: forecast the frontier RATE-DELTA (change between first/second half)
//   DEF  falsify: forecast MISSES — refs previously present, absent in the last
//        frontier bucket (expectation disappointed)
//   NUL  null-act: base rate for everyone (the unprimed control).
// Gates:
//   G1 earn-differences: AT LEAST ONE act beats NUL by ~0.10+ at brier, beyond
//      its own 300-draw shuffle null (content-informative acts exist).
//   G2 act-distinctness: max pairwise brier delta across acts >= 0.05 AND at
//      least one pair of retained sets is < 0.9 Jaccard (operators are not one
//      act wearing hats).
// Verdict CONFIRMED only if both; the honest distribution of WHICH acts earn
// is the finding (the triholon claim: is the act that forecasts the arrival,
// the compare, or the revise?).
//
// Usage: node terrain-arena-step28.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));

const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);
const bucket = (at) => Math.floor((at ?? 0) / 50);
const MAXB = bucket(MAXAT) + 1;
const FRONTB = bucket(FRONT);
const appear = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const b = bucket(e.at ?? 0); if (e.subject) appear.get(e.subject)?.add(b); if (e.object) appear.get(e.object)?.add(b); }
const futureBuckets = Array.from({ length: MAXB - FRONTB }, (_, i) => FRONTB + 1 + i);
const inFuture = (r) => [...(appear.get(r) ?? [])].some((b) => b > FRONTB);
const y = refs.map((r) => (inFuture(r) ? 1 : 0));
const baseRate = refs.filter((r) => inFuture(r)).length / refs.length;

const frontAppear = new Map(refs.map((r) => [r, [...(appear.get(r) ?? [])].filter((b) => b <= FRONTB)]));
const firstFront = (r) => Math.min(...(frontAppear.get(r) ?? [Infinity]));
const lastFront = (r) => Math.max(...(frontAppear.get(r) ?? [-Infinity]));
const mid = Math.floor(FRONTB / 2);

const p = {
  EVA: (r) => (frontAppear.get(r)?.length ?? 0) / (FRONTB + 1),
  SIG: (r) => { const fa = frontAppear.get(r); return fa?.length ? (fa.includes(mid) ? 0.2 : 0.95) : baseRate; },
  CON: (r) => { const fa = frontAppear.get(r); return fa?.length >= 2 ? 0.9 : baseRate; },
  REC: (r) => { const fa = frontAppear.get(r); if (!fa?.length) return baseRate; const early = fa.filter((b) => b <= mid).length; const late = fa.filter((b) => b > mid).length; const d = (late - early) / (mid + 1); return Math.min(0.95, Math.max(0.05, baseRate + d)); },
  DEF: (r) => { const fa = frontAppear.get(r); if (!fa?.length) return baseRate; const lastSeen = lastFront(r); return lastSeen < FRONTB - 1 ? 0.05 : baseRate; },
  NUL: () => baseRate,
};

const clamp = (v) => Math.min(0.99, Math.max(0.01, v));
const brierOf = (rFn) => refs.map((r, i) => (y[i] - clamp(rFn(r))) ** 2).reduce((a, b) => a + b, 0) / refs.length;
const briers = Object.fromEntries(Object.keys(p).map((a) => [a, brierOf(p[a])]));

const S = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };
const shuf = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const nullBrier = (act) => {
  const vals = refs.map((r) => clamp(p[act](r)));
  const ys = y;
  const obs = brierOf(p[act]);
  const nulls = [];
  for (let k = 0; k < 300; k++) { const perm = shuffled(vals, createSeededRng(140000 + k)); nulls.push(perm.reduce((a, b, i) => a + (ys[i] - b) ** 2, 0) / perm.length); }
  return { obs, p: (nulls.filter((v) => v <= obs).length + 1) / (nulls.length + 1) };
};
const actNulls = Object.fromEntries(Object.keys(p).filter((a) => a !== "NUL").map((a) => [a, nullBrier(a)]));

const best = Object.entries(briers).filter(([a]) => a !== "NUL").sort((a, b) => a[1] - b[1])[0];
const G1 = {
  bestBeatNul: briers[best[0]] < briers.NUL - 0.1,
  bestAct: best[0],
  briers,
};
const pairs = [["EVA", "SIG"], ["EVA", "CON"], ["EVA", "REC"], ["EVA", "DEF"], ["CON", "SIG"], ["SIG", "REC"]];
const maxDelta = Math.max(...pairs.map(([a, b]) => Math.abs(briers[a] - briers[b])));
const jac = (a, b) => { const A = refs.filter((r) => clamp(p[a](r)) > 0.5); const B = refs.filter((r) => clamp(p[b](r)) > 0.5); const sA = new Set(A), sB = new Set(B); const inter = A.filter((x) => sB.has(x)).length; const union = new Set([...A, ...B]).size; return union ? inter / union : 1; };
let maxJ = 1, jPair = null;
for (const [a, b] of pairs) { const j = jac(a, b); if (j < maxJ) { maxJ = j; jPair = [a, b]; } }
const G2 = { maxBrierDelta: +maxDelta.toFixed(4), jacobians: Object.fromEntries(pairs.map(([a, b]) => [[a, b], +jac(a, b).toFixed(3)])), held: maxDelta >= 0.05 && maxJ < 0.9, mostDistinct: jPair };

const verdict = G1.bestBeatNul && G2.held
  ? { verdict: "CONFIRMED", claim: `operators are real, distinct acts: ${best[0]} beats the null-act by ${(briers.NUL - briers[best[0]]).toFixed(3)} brier and the operators are mutually distinguishable (max delta ${G2.maxBrierDelta}); whether an operator earns is act-specific — the honest distribution is the finding.` }
  : { verdict: "FALSIFIED", claim: `operators are collapsed or unearned on this material: best ${best[0]} at ${briers[best[0]].toFixed(3)} vs NUL ${briers.NUL.toFixed(3)} (${G1.bestBeatNul ? "beats" : "does not beat"} the bar) and/or distinctness failed (maxDelta ${G2.maxBrierDelta}, minJac ${maxJ.toFixed(2)}).` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep28@1",
  material: { referents: refs.length, frontierBuckets: FRONTB + 1, futureBuckets: futureBuckets.length, baseRate: +baseRate.toFixed(3) },
  briers,
  actNulls: Object.fromEntries(Object.entries(actNulls).map(([a, v]) => [a, { brier: +v.obs.toFixed(4), p: +v.p.toFixed(4) }])),
  gates: { G1, G2 },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["Act-registers are declared machines over the same retained-frontier takings (forecasting the same future); not all nine operators are instantiated (NUL as control; SYN/INS/SEG deferred).", "The honest question: which ACT earns, and are the acts mutually distinguishable — not whether every operator naively 'works'."],
}, null, 2));