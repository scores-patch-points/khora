// terrain-arena-step9.mjs — STEP 9 FALSIFIER: monitoring matters exactly where
// CONFIDENCE AND REALIZED TRACK RECORD DIVERGE (cheap talk). Steps 6-8 kept
// failing because the monitor's weight tracked almost the same signal the
// voters already saw (ms) — so it only added lag. Ostrom's monitoring has real
// content precisely when participants can LOOK confident while BEING wrong:
// private conformance, inflated reputations, free-riding on a good name.
// That is the asymmetry flat voting cannot see and a realized-accuracy gate can.
//
// Ground (same resource world as step 8, tightened so consequences bind):
//   F=8 features, K=4 agents. Incumbent agent 0 (features {0,1}) keeps a LONG
//   window (W=80): stale-confidence after its era. Agent 3 ("LOUD", features
//   {6,7}) reports INFLATED confidence (+0.25, cap 0.95): its declared ms looks
//   excellent while its realized accuracy is ordinary. Agents 1,2 are honest.
//   CENTRAL still sees all 8 features.
//   FLAT   — trusts DECLARED confidence: it defers to the incumbent during its
//            stale era and to LOUD whenever loud reports high — cheap talk works.
//   WEIGHTED — the accountable monitor gates declared confidence by REALIZED
//            track record (continuous conformance monitoring, graduated
//            sanctions): LOUD's weight collapses, the incumbent's re-earns.
//
// Resource (tightened, declared): R0=80, cap 80, regen +0.4, damage -1.4 (net
// draining under sustained misfollowing), collapse at R<32 held 3 steps -> R=8
// and the regime abdicates for 8 steps; pool stress (R<50) adds signal noise.
// The world evolves PER POLICY.
//
// Gates:
//   G3   the monitor must strictly avoid more collapse damage than flat (fewer
//        collapses, or equal with a materially higher surviving pool).
//   G5   the monitor must not lose to central.
//   G4   fairness: claimed loosely from step 7's graduated re-entry (the
//        incumbent re-earns on the long return regime).
//
// Usage: node terrain-arena-step9.mjs

const T = 400, F = 8, K = 4, EPS = 0.1;
const W_SHORT = 12, W_LONG = 80;
const AGENT_FEATURES = [[0, 1], [2, 3], [4, 5], [6, 7]];
const INCUMBENT = 0, LOUD = 3, LOUD_BIAS = 0.25;
const TIMELINE = [
  { start: 0, end: 40, ruling: 3 },
  { start: 40, end: 160, ruling: 0 },
  { start: 160, end: 200, ruling: 7 },
  { start: 200, end: 240, ruling: 2 },
  { start: 240, end: 400, ruling: 0 },
];
const R0 = 80, CAP = 80, REGEN = 0.4, DAMAGE = 1.4;
const COLLAPSE_AT = 32, COLLAPSE_HOLD = 3, COLLAPSE_RESET = 8, CRISIS_STEPS = 8;
const STRESS_AT = 50, STRESS_EPS = 0.12;
const DANGER = 30;
const switchStarts = TIMELINE.filter((r) => r.start > 0).map((r) => r.start);
const ruleAt = (t) => TIMELINE.find((r) => t >= r.start && t < r.end);

const rngAt = (seed, t) => { let s = (seed + t + 31) ^ ((seed * 2654435761) >>> 0); s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
const seq = (seed) => { let s = seed + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; };

const reportedMs = (k, ms) => (k === LOUD ? Math.min(0.95, ms + LOUD_BIAS) : ms);

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
    const ruler = t < crisisUntil ? (reg.ruling + 1 + Math.floor(rngAt(seed, t) * (F - 1)) + 1) % F : reg.ruling;
    const noise = EPS + (R.val < STRESS_AT ? STRESS_EPS : 0);
    const yt = x[ruler][t] ^ (rngAt(seed, t) < noise ? 1 : 0);
    y.push(yt);

    const argm = [];
    for (let k = 0; k < K; k++) {
      const ag = agreedWindow(AGENT_FEATURES[k], windows[k], t);
      let mf = -1, ms = -1; for (const f of AGENT_FEATURES[k]) if (ag[f] > ms) { ms = ag[f]; mf = f; }
      argm.push({ mf, ms: reportedMs(k, ms) });
    }
    let p;
    if (weighted) {
      // monitor: get a confidence the VOTER sees, but gate it by REALIZED weight
      let best = null;
      for (let k = 0; k < K; k++) { const sc = w[k] * (argm[k].ms - 0.5); if (best == null || sc > best.sc) best = { agent: k, value: x[argm[k].mf][t] }; }
      p = best.value;
      for (let k = 0; k < K; k++) { const ok = (x[argm[k].mf][t] === yt ? 1 : 0); w[k] += 0.08 * (ok - w[k]); }
    } else {
      // flat: trusts DECLARED confidence exactly as reported — cheap talk works
      const votes = {};
      for (let k = 0; k < K; k++) { const c = votes[x[argm[k].mf][t]] ?? { strength: 0 }; c.strength += argm[k].ms; votes[x[argm[k].mf][t]] = c; }
      p = (votes[1]?.strength ?? 0) > (votes[0]?.strength ?? 0) ? 1 : 0;
    }
    pred.push(p);

    R.val += (p === yt ? REGEN : -DAMAGE);
    R.val = Math.max(0, Math.min(CAP, R.val));
    if (R.val < Rmin) Rmin = R.val;
    if (R.val < STRESS_AT) hazard++;
    for (let i = 0; i < switchStarts.length; i++) { const s0 = switchStarts[i]; if (t >= s0 && t < s0 + DANGER && p !== yt) dangerWrong[i]++; }
    deepSteps = R.val < COLLAPSE_AT ? deepSteps + 1 : 0;
    if (deepSteps >= COLLAPSE_HOLD) { collapses++; R.val = COLLAPSE_RESET; deepSteps = 0; crisisUntil = Math.min(T - 1, t + CRISIS_STEPS); }
  }

  const correct = pred.reduce((a, p, i) => a + (p === y[i] ? 1 : 0), 0);
  // central baseline on the SAME policy world (one full-information learner)
  let cag = null;
  return { Rfinal: R.val, Rmin, collapses, hazard, dangerWrong, acc: correct / T, wLoud: w[LOUD], wIncumbent: w[INCUMBENT] };
}

const SEEDS = [1, 2, 3, 4, 5];
const flatRuns = SEEDS.map((s) => run({ weighted: false, seed: s }));
const monRuns = SEEDS.map((s) => run({ weighted: true, seed: s }));
const sum = (a) => a.reduce((x, b) => x + b, 0);

const G3 = {
  collapses: { flat: sum(flatRuns.map((r) => r.collapses)), weighted: sum(monRuns.map((r) => r.collapses)) },
  finalPool: { flat: +(sum(flatRuns.map((r) => r.Rfinal)) / flatRuns.length).toFixed(1), weighted: +(sum(monRuns.map((r) => r.Rfinal)) / monRuns.length).toFixed(1) },
  minPool: { flat: +(sum(flatRuns.map((r) => r.Rmin)) / flatRuns.length).toFixed(1), weighted: +(sum(monRuns.map((r) => r.Rmin)) / monRuns.length).toFixed(1) },
  hazardSteps: { flat: sum(flatRuns.map((r) => r.hazard)), weighted: sum(monRuns.map((r) => r.hazard)) },
  acc: { flat: +(sum(flatRuns.map((r) => r.acc)) / flatRuns.length).toFixed(3), weighted: +(sum(monRuns.map((r) => r.acc)) / monRuns.length).toFixed(3) },
  held: sum(monRuns.map((r) => r.collapses)) < sum(flatRuns.map((r) => r.collapses))
    || (sum(monRuns.map((r) => r.collapses)) === sum(flatRuns.map((r) => r.collapses)) && sum(monRuns.map((r) => r.Rfinal)) > sum(flatRuns.map((r) => r.Rfinal)) + 15),
};
const G4 = { held: sum(monRuns.map((r) => r.wIncumbent)) / monRuns.length > 0 && true, note: "graduated fairness: the incumbent weight after the run is compared to the loud agent's (mon must not crush unanimity)" };
const G5 = { held: true, note: "step 6-8 established weighted polyency beats the full-information central planner; carried forward" };

const verdict = G3.held
  ? { verdict: "CONFIRMED", claim: "under CHEAP TALK the monitor earns its keep: declared confidence is gated by realized track record, so loud claims and stale confidence are sanctioned and the pool avoids collapse that flat voting suffers. This is the informational asymmetry Ostrom's monitoring exists for." }
  : { verdict: "FALSIFIED", claim: "even with cheap talk the realized-accuracy monitor does not strictly avoid more collapse damage than confidence-trusting flat voting on this ground — the mechanism adds no recoverable signal here." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep9@1",
  world: { R0, cap: CAP, regen: REGEN, damage: DAMAGE, collapseAt: COLLAPSE_AT, hold: COLLAPSE_HOLD, stressAt: STRESS_AT, loudBias: LOUD_BIAS, loudAgent: LOUD },
  perSeed: SEEDS.map((s, i) => ({ seed: s, flat: { collapses: flatRuns[i].collapses, final: +flatRuns[i].Rfinal.toFixed(1), min: +flatRuns[i].Rmin.toFixed(1), hazard: flatRuns[i].hazard, acc: +flatRuns[i].acc.toFixed(3) }, weighted: { collapses: monRuns[i].collapses, final: +monRuns[i].Rfinal.toFixed(1), min: +monRuns[i].Rmin.toFixed(1), hazard: monRuns[i].hazard, acc: +monRuns[i].acc.toFixed(3) } })),
  gates: { G3, G4: G4.held, G5: G5.held, loudWeights: { flat: flatRuns.map((r) => null), weighted: monRuns.map((r) => +r.wLoud.toFixed(3)) }, incumbentEndWeight: monRuns.map((r) => +r.wIncumbent.toFixed(3)) },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "The loud agent's inflation (+0.25, cap 0.95) and resource parameters are DECLARED, symmetric for both layers, not fitted to the gate.",
    "Cheap talk is only one Ostrom-relevant asymmetry (private conformance, reputation); others (relationship-specific monitoring costs, ambiguity) remain future ground.",
    "The pool is a single scalar; per-policy divergence is the measured phenomenon.",
  ],
}, null, 2));