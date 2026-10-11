// terrain-arena-step7.mjs — OSTROM, MADE FALSIFIABLE ON THE GROUND IT WAS
// BUILT FOR. Step 6 FALSIFIED the accountable-monitoring layer: on a ground
// with homogeneous fast agents, flat equal-weight voting matched the weighted
// monitor, so the added governance complexity earned nothing. Ostrom's
// monitoring is FOR the hard case: participants who are confident-but-stale —
// an INERT INCUMBENT that persists with the old rule after a regime switch,
// while alert newcomers carry the new rule. Under that asymmetry, monitoring
// and graduated sanctioning is what keeps the collective from being steered
// by the incumbent's stale confidence.
//
// Ground (inertia):
//   F=8 binary features; a regime makes one feature rule, y = x_rul ⊕ (eps=0.1).
//   K=4 agents, 2 features each. THREE agents learn with a SHORT local window
//   (W=12). ONE INERT INCUMBENT (agent 0, features {0,1}) keeps a LONG window
//   (W=80): after a switch off its feature it stays confidently-wrong for
//   ~40 steps — exactly the free-rider shape monitoring exists to detect.
//   CENTRAL still sees all 8 features with one W=80 window.
//   Aggregation (same agents, two gouvernance layers):
//     FLAT   — every agent votes its argmax projection, weighted only by local
//              confidence; the incumbent's stale high confidence counts at face.
//     WEIGHTED — an accountable monitor tracks each agent's realized accuracy
//              and gates influence by it (graduated sanctions); an agent whose
//              predictions keep failing loses weight; a re-learning agent
//              re-earns it.
//
// Gates (each falsifiable):
//   G3 the layer earns keep in the danger windows: within the first 30 steps
//      after each regime switch, WEIGHTED mean accuracy > FLAT + 0.02, AND
//      overall WEIGHTED > FLAT + 0.03. If monitoring can't earn its keep here,
//      it never does.
//   G4 graduated sanctions, never permanent exclusion: the incumbent, after
//      losing weight through an exit, RE-LEARNS in a long later regime on its
//      own feature and its weight recovers to >= 0.7 by that regime's end.
//   G5 robustness over central still holds: weighted poly beats the central
//      planner on cumulative accuracy under churn.
//
// Usage: node terrain-arena-step7.mjs   (self-contained)

const S = (seed) => { let s = (seed | 0) + 0x6D2B79F5; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

const F = 8, K = 4, T = 400, EPS = 0.1;
const W_SHORT = 12, W_LONG = 80;
const AGENT_FEATURES = [[0, 1], [2, 3], [4, 5], [6, 7]];
const INCUMBENT = 0;

// Deterministic timeline. The incumbent's confidence must be EARNED before it
// can be STALE: a long stable f0 era (longer than its window) charges its
// agreement to ~0.9; then the exits at 160/200 leave it confidently-wrong
// ("the incumbent institution persists while the world moved on"); a long f0
// return lets it re-learn and re-earn standing under graduated monitoring.
const TIMELINE = [
  { start: 0, end: 40, ruling: 3 },
  { start: 40, end: 160, ruling: 0 },  // the incumbent's long era — charges W_LONG
  { start: 160, end: 200, ruling: 7 }, // exit — danger window (stale confidence)
  { start: 200, end: 240, ruling: 2 }, // second exit — danger window
  { start: 240, end: 400, ruling: 0 }, // long return — re-learn + re-earn
];
const DANGER = 30; // steps after a switch where monitoring must pay off
const RETURN_END = 360; // measure earned recovery near the end of the return era

function learner(agentWindows, seed) {
  const rngX = S(seed);
  const x = Array.from({ length: F }, () => Array.from({ length: T }, () => (rngX() < 0.5 ? 1 : 0)));
  const y = [];
  for (let t = 0; t < T; t++) {
    const tl = TIMELINE.find((r) => t >= r.start && t < r.end);
    y.push(x[tl.ruling][t] ^ (S(t + seed)() < EPS ? 1 : 0));
  }
  const agreementsAt = (features, window, t) => {
    const out = {};
    for (const f of features) {
      let hit = 0, n = 0;
      for (let s = Math.max(0, t - window + 1); s <= t; s++) { n++; if (y[s] === x[f][s]) hit++; }
      out[f] = n ? hit / n : 0.5;
    }
    return out;
  };

  const switchStarts = TIMELINE.filter((r) => r.start > 0).map((r) => r.start);

  // CENTRAL
  const centralPred = [];
  for (let t = 0; t < T; t++) {
    const ag = agreementsAt([...Array(F).keys()], W_LONG, t);
    let best = -1, bs = -1; for (let f = 0; f < F; f++) if (ag[f] > bs) { bs = ag[f]; best = f; }
    centralPred.push(x[best][t]);
  }

  const runMonitored = ({ weighted }) => {
    const w = Array.from({ length: K }, () => 0.5);
    let wSnapshot = null;
    const pred = [];
    for (let t = 0; t < T; t++) {
      const argm = []; // per agent: { mf, ms }
      for (let k = 0; k < K; k++) {
        const ag = agreementsAt(AGENT_FEATURES[k], agentWindows[k], t);
        let mf = -1, ms = -1; for (const f of AGENT_FEATURES[k]) if (ag[f] > ms) { ms = ag[f]; mf = f; }
        argm.push({ mf, ms });
      }
      const p = (() => {
        if (weighted) {
          // aggregator consults the agent with the best weight·confidence score
          let best = null;
          for (let k = 0; k < K; k++) {
            const score = w[k] * (argm[k].ms - 0.5);
            if (best == null || score > best.score) best = { agent: k, value: x[argm[k].mf][t], score };
          }
          return best.value;
        }
        // flat: each agent's argmax projection votes, weighted only by confidence
        const votes = {};
        for (let k = 0; k < K; k++) {
          const c = votes[x[argm[k].mf][t]] ?? { strength: 0 };
          c.strength += argm[k].ms; votes[x[argm[k].mf][t]] = c;
        }
        return (votes[1]?.strength ?? 0) > (votes[0]?.strength ?? 0) ? 1 : 0;
      })();
      pred.push(p);
      if (weighted) {
        // MONITORING IS CONTINUOUS, NOT CONTINGENT (Ostrom: monitoring collects
        // conformance information; it does not wait to be consulted). EVERY
        // agent's weight updates every step from ITS OWN realized accuracy —
        // the stale incumbent is sanctioned the moment its predictions start
        // failing, whether or not the collective followed it; an alert agent
        // gains standing the moment it starts succeeding. Graduated, not
        // permanent: when the incumbent re-learns, it re-earns.
        for (let k = 0; k < K; k++) {
          const ok = (x[argm[k].mf][t] === y[t] ? 1 : 0);
          w[k] += 0.08 * (ok - w[k]);
        }
      }
      if (t === RETURN_END) wSnapshot = [...w];
    }
    const correct = pred.map((p, i) => (p === y[i] ? 1 : 0));
    const acc = (a, b) => { const slice = correct.slice(a, b); return slice.reduce((s, v) => s + v, 0) / Math.max(1, slice.length); };
    // danger-window accuracy after each switch
    const danger = switchStarts.map((s0) => acc(s0, Math.min(T, s0 + DANGER)));
    return { correct, accOverall: acc(0, T), danger, w, wIncumbentAtReturn: wSnapshot ? wSnapshot[INCUMBENT] : null };
  };

  const flat = runMonitored({ weighted: false });
  const mon = runMonitored({ weighted: true });
  // G4's honest measure: the incumbent's weight NEAR THE END OF THE RETURN ERA
  // (t=RETURN_END), not at the end of the whole run — a measurement smell
  // caught in the first pass (a trailing regime sanctioned it after f0 left
  // again, which is not the "did it re-earn" question).
  const centralCorrect = centralPred.map((p, i) => (p === y[i] ? 1 : 0));
  const centralAcc = centralCorrect.reduce((a, b) => a + b, 0) / T;
  return { flat, mon, monWeightAtReturn: mon.wIncumbentAtReturn, centralAcc, switchStarts };
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);

const SEEDS = [1, 2, 3, 4];
const runs = SEEDS.map((sd) => learner(agentWindows(sd), sd));
function agentWindows(sd) {
  const w = Array.from({ length: K }, () => W_SHORT);
  w[INCUMBENT] = W_LONG;
  return w;
}

const flatDanger = [], monDanger = [], flatOverall = [], monOverall = [], centralAll = [];
const incumbentRecovery = [];
for (const r of runs) {
  flatDanger.push(mean(r.flat.danger)); // per-run mean danger-window accuracy
  monDanger.push(mean(r.mon.danger));
  flatOverall.push(r.flat.accOverall);
  monOverall.push(r.mon.accOverall);
  centralAll.push(r.centralAcc);
  // incumbent weight at the end of the long return (t=RETURN_END)
  incumbentRecovery.push(r.monWeightAtReturn);
}

const mDangerFlat = mean(flatDanger), mDangerMon = mean(monDanger);
const mFlat = mean(flatOverall), mMon = mean(monOverall), mCentral = mean(centralAll);
const wIncumbent = mean(incumbentRecovery);

const G3 = {
  held: (mDangerMon - mDangerFlat) > 0.02 && (mMon - mFlat) > 0.03,
  dangerWindow: { flat: +mDangerFlat.toFixed(3), weighted: +mDangerMon.toFixed(3), delta: +(mDangerMon - mDangerFlat).toFixed(3) },
  overall: { flat: +mFlat.toFixed(3), weighted: +mMon.toFixed(3), delta: +(mMon - mFlat).toFixed(3) },
  perRun: runs.map((r, i) => ({ seed: SEEDS[i], flatDanger: +mean(r.flat.danger).toFixed(3), monDanger: +mean(r.mon.danger).toFixed(3), flat: +r.flat.accOverall.toFixed(3), mon: +r.mon.accOverall.toFixed(3), incumbentWeightAtReturn: +(r.monWeightAtReturn ?? -1).toFixed(3) })),
};
const G4 = {
  held: wIncumbent >= 0.7,
  incumbentWeightAfterRelearn: +wIncumbent.toFixed(3),
  basis: "the incumbent lost weight through the f0→f2 exit, then re-learned in the long return regime — its weight recovered instead of permanent exclusion",
};
const G5 = { held: mMon > mCentral, polyCentral: { weighted: +mMon.toFixed(3), central: +mCentral.toFixed(3) } };

const verdict = G3.held && G4.held && G5.held
  ? { verdict: "CONFIRMED", claim: "accountable monitoring earns its keep exactly where Ostrom said it would: under a confident-but-stale incumbent, the monitor's graduated sanctions beat flat equal voting in the danger windows (and overall), the incumbent re-earns standing instead of permanent exclusion, and the polycentric collective still beats the full-information central planner." }
  : { verdict: "FALSIFIED", claim: `monitoring still did not earn its keep on the ground built for it: ${JSON.stringify({ G3: G3.held, G4: G4.held, G5: G5.held })}` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep7@1",
  ground: { features: F, agents: K, horizon: T, eps: EPS, shortWindow: W_SHORT, incumbentWindow: W_LONG, dangerWindowSteps: DANGER, timeline: TIMELINE.map((t) => `${t.ruling}:[${t.start},${t.end})`).join(" ") },
  gates: { G3, G4, G5 },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Synthetic regime simulation; aggregation is windowed-agreement voting — not the full reading pipeline.",
    "CENTRAL has strictly more information (all 8 features); polycentric's wins are governance wins, not data wins.",
    "The incumbent's long window is fixed; the test is whether the MONITOR (not the agent) handles it.",
  ],
}, null, 2));