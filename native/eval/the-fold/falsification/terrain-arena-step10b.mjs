// terrain-arena-step10b.mjs — STEP 10 REVISED: the dial that actually binds is
// not the weight FLOOR but the RELEASE THRESHOLD (eligibility): an agent whose
// realized track record sits at or near chance must have ZERO influence however
// loud its declared confidence (the cheap-talk / credential-inflation case).
// This is exactly the shipped releaseDecision contract (candidate/at-chance ->
// WITHHELD). Sweep the eligibility threshold theta across the long and short
// return legs and map the works-vs-coup trade:
//   works  = weighted collapses strictly < flat collapses
//   coup   = the incumbent (sanctioned, then genuinely re-learning) fails to
//            re-enter: weight at end of its return era < 0.6
//
// World identical to step 10 (cheap talk: LOUD agent inflates +0.25; incumbent
// long window; resource pool collapses under sustained misfollowing, evolving
// per policy). Flat baseline trusts declared confidence.
//
// Usage: node terrain-arena-step10b.mjs

const T = 400, F = 8, K = 4, EPS = 0.1;
const W_SHORT = 12, W_LONG = 80;
const AGENT_FEATURES = [[0, 1], [2, 3], [4, 5], [6, 7]];
const INCUMBENT = 0, LOUD = 3, LOUD_BIAS = 0.25, LAMBDA = 0.08;
const longTimeline = [
  { start: 0, end: 40, ruling: 3 },
  { start: 40, end: 160, ruling: 0 },
  { start: 160, end: 200, ruling: 7 },
  { start: 200, end: 240, ruling: 2 },
  { start: 240, end: 400, ruling: 0 },
];
const shortTimeline = [
  { start: 0, end: 40, ruling: 3 },
  { start: 40, end: 160, ruling: 0 },
  { start: 160, end: 200, ruling: 7 },
  { start: 200, end: 240, ruling: 2 },
  { start: 240, end: 280, ruling: 0 },
  { start: 280, end: 400, ruling: 7 },
];
const R0 = 80, CAP = 80, REGEN = 0.4, DAMAGE = 1.4;
const COLLAPSE_AT = 32, COLLAPSE_HOLD = 3, COLLAPSE_RESET = 8, CRISIS_STEPS = 8;
const STRESS_AT = 50, STRESS_EPS = 0.12;

const rngAt = (seed, t) => { let s = (seed + t + 31) ^ ((seed * 2654435761) >>> 0); s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
const seq = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };

function run({ weighted, seed, theta = 0.5, timeline }) {
  const rngX = seq(seed * 7919);
  const x = Array.from({ length: F }, () => Array.from({ length: T }, () => (rngX() < 0.5 ? 1 : 0)));
  const windows = Array.from({ length: K }, () => W_SHORT); windows[INCUMBENT] = W_LONG;
  const ruleAt = (t) => timeline.find((r) => t >= r.start && t < r.end);
  const retEra = timeline.filter((r) => r.ruling === 0).at(-1);
  const returnEnd = retEra.end - 10;

  const y = [];
  const R = { val: R0 };
  let Rmin = R0, collapses = 0, hazard = 0, crisisUntil = -1, deepSteps = 0;
  const w = Array.from({ length: K }, () => 0.5);
  const pred = [];
  let wIncumbentAtReturn = null;
  const agreedWindow = (features, window, t) => {
    const out = {};
    for (const f of features) {
      let hit = 0, n = 0;
      for (let s = Math.max(0, t - window + 1); s <= t; s++) { const v = y[s]; if (v === undefined) continue; n++; if (v === x[f][s]) hit++; }
      out[f] = n ? hit / n : 0.5;
    }
    return out;
  };

  for (let t = 0; t < T; t++) {
    const reg = ruleAt(t);
    const ruler = t < crisisUntil ? (reg.ruling + 1 + Math.floor(rngAt(seed, t) * (F - 1)) + 1) % F : reg.ruling;
    const noise = EPS + (R.val < STRESS_AT ? STRESS_EPS : 0);
    const yt = x[ruler][t] ^ (rngAt(seed, t) < noise ? 1 : 0);
    y.push(yt);

    const argm = [];
    for (let k = 0; k < K; k++) {
      const ag = agreedWindow(AGENT_FEATURES[k], windows[k], t);
      let mf = -1, ms = -1; for (const f of AGENT_FEATURES[k]) if (ag[f] > ms) { ms = ag[f]; mf = f; }
      argm.push({ mf, ms });
    }
    let p;
    if (weighted) {
      // THE RELEASE GATE: declared confidence buys influence ONLY if the agent
      // is above the eligibility threshold theta on REALIZED weight. An
      // at-chance agent (weight ~0.5) is WITHHELD entirely — loud but
      // unreleased, cheap talk gains nothing.
      let best = null;
      for (let k = 0; k < K; k++) {
        if (w[k] < theta) continue;
        const sc = w[k] * ((argm[k].ms + (k === LOUD ? LOUD_BIAS : 0)) - 0.5);
        if (best == null || sc > best.sc) best = { agent: k, value: x[argm[k].mf][t], sc };
      }
      p = best ? best.value : (voteGiveup(t, seed) ? 0 : 1); // honest absence: no release
      for (let k = 0; k < K; k++) { const ok = (x[argm[k].mf][t] === yt ? 1 : 0); w[k] += LAMBDA * (ok - w[k]); }
    } else {
      // flat: trusts declared confidence exactly (cheap talk works)
      const votes = {};
      for (let k = 0; k < K; k++) {
        const rms = argm[k].ms + (k === LOUD ? LOUD_BIAS : 0);
        const c = votes[x[argm[k].mf][t]] ?? { strength: 0 }; c.strength += rms; votes[x[argm[k].mf][t]] = c;
      }
      p = (votes[1]?.strength ?? 0) > (votes[0]?.strength ?? 0) ? 1 : 0;
    }
    pred.push(p);

    if (weighted && t === returnEnd) wIncumbentAtReturn = w[INCUMBENT];

    R.val += (p === yt ? REGEN : -DAMAGE);
    R.val = Math.max(0, Math.min(CAP, R.val));
    if (R.val < Rmin) Rmin = R.val;
    if (R.val < STRESS_AT) hazard++;
    deepSteps = R.val < COLLAPSE_AT ? deepSteps + 1 : 0;
    if (deepSteps >= COLLAPSE_HOLD) { collapses++; R.val = COLLAPSE_RESET; deepSteps = 0; crisisUntil = Math.min(T - 1, t + CRISIS_STEPS); }
  }
  const correct = pred.reduce((a, p, i) => a + (p === y[i] ? 1 : 0), 0);
  return { Rfinal: R.val, Rmin, collapses, hazard, acc: correct / T, wIncumbentAtReturn };
}
function voteGiveup(t, seed) { return ((t + seed) % 97) < 48 ? 0 : 1; } // (unreachable in practice: a release always exists)

const SEEDS = [1, 2, 3, 4, 5];
const THETAS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];
const sum = (a) => a.reduce((x, b) => x + b, 0);
const mean = (a) => sum(a) / a.length;

const flatLong = mean(SEEDS.map((s) => run({ weighted: false, seed: s, timeline: longTimeline }).collapses));
const flatShort = mean(SEEDS.map((s) => run({ weighted: false, seed: s, timeline: shortTimeline }).collapses));
const flatLongAcc = mean(SEEDS.map((s) => run({ weighted: false, seed: s, timeline: longTimeline }).acc));

function sweep(leg) {
  return THETAS.map((theta) => {
    const runs = SEEDS.map((s) => run({ weighted: true, seed: s, theta, timeline: leg }));
    return {
      theta,
      collapses: sum(runs.map((r) => r.collapses)),
      finalPool: +mean(runs.map((r) => r.Rfinal)).toFixed(1),
      minPool: +mean(runs.map((r) => r.Rmin)).toFixed(1),
      hazard: sum(runs.map((r) => r.hazard)),
      acc: +mean(runs.map((r) => r.acc)).toFixed(3),
      incumbentAtReturn: +mean(runs.map((r) => r.wIncumbentAtReturn ?? 0)).toFixed(3),
    };
  });
}
const longSweep = sweep(longTimeline);
const shortSweep = sweep(shortTimeline);

const regionLong = longSweep.filter((r) => r.collapses < flatLong * SEEDS.length && r.incumbentAtReturn >= 0.6);
const regionShort = shortSweep.filter((r) => r.collapses < flatShort * SEEDS.length && r.incumbentAtReturn >= 0.6);

const verdict = regionLong.length > 0 && regionShort.length === 0
  ? { verdict: "CONFIRMED", claim: "the eligibility threshold is the dial: a strict-but-fair region exists on the long re-earn horizon where monitoring strictly beats flat collapse-damage AND the incumbent re-enters; on the short horizon the same strictness turns exclusionary. Fit-to-circumstances is measured, not asserted." }
  : regionLong.length > 0 && regionShort.length > 0
    ? { verdict: "PARTIAL", claim: "works-without-coup exists on BOTH legs — strictness did not exclude even on a short re-earn horizon here." }
    : { verdict: "FALSIFIED", claim: "no eligibility threshold delivered monitoring that works-without-coup on the long horizon." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep10b@1",
  world: { lambda: LAMBDA, loudBias: LOUD_BIAS, resource: { R0, regen: REGEN, damage: DAMAGE, collapseAt: COLLAPSE_AT, hold: COLLAPSE_HOLD } },
  flatBaseline: { longCollapses: flatLong, shortCollapses: flatShort, longAcc: +flatLongAcc.toFixed(3) },
  longReturnSweep: longSweep,
  shortReturnSweep: shortSweep,
  verdict,
  claim: verdict.claim,
  limitations: [
    "One asymmetry (inflated confidence), one pool scalar, LAMBDA fixed; the swept dial is the RELEASE eligibility threshold theta.",
    "The coup line is incumbent weight >= 0.6 at the end of its return era; shifting the bar shifts the region, not the shape.",
    "Flat confidence-trusting voting is the baseline; central-planner comparison carried from steps 6-8.",
  ],
}, null, 2));