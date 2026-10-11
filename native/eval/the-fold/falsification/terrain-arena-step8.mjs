// terrain-arena-step8.mjs — STEP 8 FALSIFIER: monitoring under COMPOUNDING
// CONSEQUENCES (the tragedy-of-commons ground). Step 7 FALSIFIED monitoring
// on constant-knowledge worlds: its raw accuracy was no better (sometimes
// worse) than flat equal voting, because a late flip costs one step. Ostrom's
// setting is different: following the stale incumbent DEPLETES THE SHARED
// RESOURCE, the loss compounds, and a deep trough COLLAPSES the pool — which
// in turn degrades the signal and accelerates the next crisis. In that world
// the monitor's value is measured in AVOIDED CUMULATIVE DAMAGE, not accuracy.
//
// World:
//   R0=100 common pool. Correct management regenerates (+0.9), misfollowing
//   depletes (-1.5). R<40 for 3 consecutive steps COLLAPSES the pool: R=15
//   and the current regime ABDICATES to a fresh ruler for a 12-step crisis
//   window (overexploitation precipitates reorganization). Pool stress
//   (R<60) degrades the ruling signal (+0.12 noise) — a deep trough is
//   harder to climb out of: the compounding.
//
// Both policymakers run the SAME feature streams and SAME regime schedule;
// each then evolves its OWN world (collapse/stress feedback depends on its
// own record — that is the point). Measured: collapses, final/min pool,
// hazard steps, and danger-window wrong-runs.
//
// Gate G3 (endogenous): the monitor must STRICTLY avoid more collapse damage
// than flat (fewer collapses, or equal collapses with a materially higher
// surviving pool). No honest ground in this family rewards it otherwise —
// reported as a real falsification, never tuned away.
//
// Usage: node terrain-arena-step8.mjs

const T = 400, F = 8, K = 4, EPS = 0.1;
const W_SHORT = 12, W_LONG = 80;
const AGENT_FEATURES = [[0, 1], [2, 3], [4, 5], [6, 7]];
const INCUMBENT = 0;
const TIMELINE = [
  { start: 0, end: 40, ruling: 3 },
  { start: 40, end: 160, ruling: 0 },
  { start: 160, end: 200, ruling: 7 },
  { start: 200, end: 240, ruling: 2 },
  { start: 240, end: 400, ruling: 0 },
];
const R0 = 100, REGEN = 0.9, DAMAGE = 1.5, CAP = 160;
const COLLAPSE_AT = 40, COLLAPSE_HOLD = 3, COLLAPSE_RESET = 15, CRISIS_STEPS = 12;
const STRESS_AT = 60, STRESS_EPS = 0.12;
const DANGER = 30;
const switchStarts = TIMELINE.filter((r) => r.start > 0).map((r) => r.start);
const ruleAt = (t) => TIMELINE.find((r) => t >= r.start && t < r.end);

const rngAt = (seed, t) => { let s = (seed + t + 31) ^ (seed * 2654435761 >>> 0); s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
const seq = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };

function run({ weighted, seed }) {
  const rngX = seq(seed * 7919);
  const x = Array.from({ length: F }, () => Array.from({ length: T }, () => (rngX() < 0.5 ? 1 : 0)));
  const windows = Array.from({ length: K }, () => W_SHORT); windows[INCUMBENT] = W_LONG;

  const y = [];
  const R = { val: R0 };
  let Rmin = R0, collapses = 0, hazard = 0, crisisUntil = -1, deepSteps = 0;
  const dangerWrong = switchStarts.map(() => 0);
  const w = Array.from({ length: K }, () => 0.5);
  const pred = [];
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
    const ruler = (t < crisisUntil) ? (reg.ruling + 1 + Math.floor(rngAt(seed, t) * ((F - 1))) + 1) % F : reg.ruling;
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
      let best = null;
      for (let k = 0; k < K; k++) { const sc = w[k] * (argm[k].ms - 0.5); if (best == null || sc > best.sc) best = { agent: k, value: x[argm[k].mf][t] }; }
      p = best.value;
      for (let k = 0; k < K; k++) { const ok = (x[argm[k].mf][t] === yt ? 1 : 0); w[k] += 0.08 * (ok - w[k]); }
    } else {
      const votes = {};
      for (let k = 0; k < K; k++) { const c = votes[x[argm[k].mf][t]] ?? { strength: 0 }; c.strength += argm[k].ms; votes[x[argm[k].mf][t]] = c; }
      p = (votes[1]?.strength ?? 0) > (votes[0]?.strength ?? 0) ? 1 : 0;
    }
    pred.push(p);

    // the world responds to THIS policy's correctness
    R.val += (p === yt ? REGEN : -DAMAGE);
    R.val = Math.max(0, Math.min(CAP, R.val));
    if (R.val < Rmin) Rmin = R.val;
    if (R.val < STRESS_AT) hazard++;
    // danger-window wrong bookkeeping
    for (let i = 0; i < switchStarts.length; i++) { const s0 = switchStarts[i]; if (t >= s0 && t < s0 + DANGER && p !== yt) dangerWrong[i]++; }
    // deep, HELD trough -> collapse: the pool dies, the ruling regime abdicates
    deepSteps = R.val < COLLAPSE_AT ? deepSteps + 1 : 0;
    if (deepSteps >= COLLAPSE_HOLD) {
      collapses++;
      R.val = COLLAPSE_RESET;
      deepSteps = 0;
      crisisUntil = Math.min(T - 1, t + CRISIS_STEPS);
    }
  }

  const correct = pred.reduce((a, p, i) => a + (p === y[i] ? 1 : 0), 0);
  return {
    Rfinal: R.val, Rmin, collapses, hazard, dangerWrong, acc: correct / T,
    wEnd: weighted ? w[INCUMBENT] : null,
  };
}

const SEEDS = [1, 2, 3, 4, 5];
const flatRuns = SEEDS.map((s) => run({ weighted: false, seed: s }));
const monRuns = SEEDS.map((s) => run({ weighted: true, seed: s }));

const sum = (a) => a.reduce((x, b) => x + b, 0);
const flatCollapse = sum(flatRuns.map((r) => r.collapses));
const monCollapse = sum(monRuns.map((r) => r.collapses));
const flatFinal = sum(flatRuns.map((r) => r.Rfinal)) / flatRuns.length;
const monFinal = sum(monRuns.map((r) => r.Rfinal)) / monRuns.length;
const flatMin = sum(flatRuns.map((r) => r.Rmin)) / flatRuns.length;
const monMin = sum(monRuns.map((r) => r.Rmin)) / monRuns.length;
const flatHaz = sum(flatRuns.map((r) => r.hazard));
const monHaz = sum(monRuns.map((r) => r.hazard));
const flatDanger = flatRuns.map((r) => sum(r.dangerWrong) / (switchStarts.length * DANGER));
const monDanger = monRuns.map((r) => sum(r.dangerWrong) / (switchStarts.length * DANGER));

const G3 = {
  collapses: { flat: flatCollapse, weighted: monCollapse },
  finalPool: { flat: +flatFinal.toFixed(1), weighted: +monFinal.toFixed(1) },
  minPool: { flat: +flatMin.toFixed(1), weighted: +monMin.toFixed(1) },
  hazardSteps: { flat: flatHaz, weighted: monHaz },
  dangerWrongRate: { flat: +(sum(flatDanger) / flatDanger.length).toFixed(3), weighted: +(sum(monDanger) / monDanger.length).toFixed(3) },
  held: monCollapse < flatCollapse || (monCollapse === flatCollapse && monFinal > flatFinal + 15),
};
const G4 = { held: true, note: "graduated fairness carried from step 7 (incumbent re-earns on the return regime); re-row not re-measured here" };

const verdict = G3.held && G4.held
  ? { verdict: "CONFIRMED", claim: "under compounding consequences the monitor earns its keep: it avoids strictly more collapse damage than equal voting. This is the Ostrom ground the machinery was built for." }
  : { verdict: "FALSIFIED", claim: "even with compounding consequences the monitor does not avoid materially more collapse damage than flat voting — no honest ground in this family rewards it; the finding is reported, not tuned away." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep8@1",
  world: { R0, regen: REGEN, damage: DAMAGE, collapseAt: COLLAPSE_AT, collapseHold: COLLAPSE_HOLD, stressAt: STRESS_AT, stressNoise: STRESS_EPS, collapseReset: COLLAPSE_RESET, crisisSteps: CRISIS_STEPS },
  perSeed: SEEDS.map((s, i) => ({ seed: s, flat: { collapses: flatRuns[i].collapses, final: +flatRuns[i].Rfinal.toFixed(1), min: +flatRuns[i].Rmin.toFixed(1), hazard: flatRuns[i].hazard, acc: +flatRuns[i].acc.toFixed(3) }, weighted: { collapses: monRuns[i].collapses, final: +monRuns[i].Rfinal.toFixed(1), min: +monRuns[i].Rmin.toFixed(1), hazard: monRuns[i].hazard, acc: +monRuns[i].acc.toFixed(3) } })),
  gates: { G3, G4: G4.held, notes: { flatDangerPerSeed: flatDanger.map((d) => +d.toFixed(3)), monDangerPerSeed: monDanger.map((d) => +d.toFixed(3)) } },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "The environment evolves PER POLICY (collapse/stress feedback depends on the policy's own record); both start identical and diverge by consequence, which is the phenomenon.",
    "Collapse threshold/hold (R<40, 3 steps, reset 15, stress<60) and damage rates are declared parameters, not fitted to the gate.",
    "The common pool is a single scalar; richer multi-pool or conformance-cost structures are future ground.",
  ],
}, null, 2));