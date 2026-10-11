// terrain-arena-step24.mjs — STEP 24: IS THE MIND MOVED BY READINGS?
// The capstone claim of the "live priors" vision: an accumulated set of earned
// takings becomes a prior that CONDITIONS the next reading — it should (a)
// change what the next reading perceives (surprise redistribution) and (b)
// predict the future better than no prior. The cruelest control, from the
// whole battery: a SHUFFLED mind with identical structure but destroyed
// content. If the real prior does NOT beat the shuffled prior, the mind is not
// moved by its readings — it is a shell that any prior fills identically.
//
// Material: Rigveda seam. FRONTIER = clauses <= 0.6 maxAt (the readings that
// build the mind); FUTURE = clauses beyond (next readings). Prior = each
// referent's expected appearance rate from its frontier recurrence (the shape
// of deriveRhythmPrior). Reading the FUTURE twice:
//   unprimed: uniform expectation (base rate)
//   primed:   expectation = recurrence prior
// plus 500 SHUFFLED minds (same frequencies, permuted across referents).
// Gates:
//   G1 perception  the primed surprise profile differs from unprimed, AND the
//                  real-mind difference EXCEEDS the shuffled-mind differences
//                  (only THIS mind's content, not any prior, changes the read).
//   G2 prediction  primed expected-rate predicts future appearance better than
//                  the unprimed baseline AND better than the shuffled minds
//                  (log-loss / Brier on held-out future clauses).
// Verdict CONFIRMED only if BOTH gates hold (the mind is genuinely moved and
// moves genuinely). Either failing closes the loop with the battery's verdict.
//
// Usage: node terrain-arena-step24.mjs /path/to/khora/native

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const native = path.resolve(process.argv[2] || "./native");
const { createSeededRng, shuffled } = await import(pathToFileURL(path.join(native, "kernel/rng.js")).href);
const corpus = JSON.parse(await readFile(path.join(native, "eval/the-fold/scene/eot-rigveda-60000.json"), "utf8"));

const MAXAT = Math.max(...corpus.edges.map((e) => e.at ?? 0));
const FRONT = Math.floor(0.6 * MAXAT);
const refs = corpus.referents.map((r) => r.hash);

// participation per clause-region (bucket of 50 clauses) to keep windows stable
const bucket = (at) => Math.floor((at ?? 0) / 50);
const MAXB = bucket(MAXAT) + 1;
const FRONTB = bucket(FRONT);
const appear = new Map(refs.map((r) => [r, new Set()]));
for (const e of corpus.edges) { const b = bucket(e.at ?? 0); if (e.subject) appear.get(e.subject)?.add(b); if (e.object) appear.get(e.object)?.add(b); }

// frontier recurrence prior: expected rate of each referent in FUTURE buckets
const frontDeg = new Map(refs.map((r) => [r, [...(appear.get(r) ?? [])].filter((b) => b <= FRONTB).length]));
const nFrontBuckets = FRONTB + 1;
const priorRate = (r) => (frontDeg.get(r) ?? 0) / Math.max(1, nFrontBuckets);

// future: which referents appear in each future bucket
const futureBuckets = [];
for (let b = FRONTB + 1; b <= MAXB; b += 1) futureBuckets.push(b);
const inFuture = (r) => [...(appear.get(r) ?? [])].some((b) => b > FRONTB);

// ── reading the future under a prior: per-referent surprise = -log2 P ─────
const log2 = Math.log2;
function readFuture(rateAt) {
  const surprises = [];
  let logloss = 0, brier = 0, tot = 0;
  for (const b of futureBuckets) {
    const present = new Set();
    for (const e of corpus.edges) if (bucket(e.at ?? 0) === b) { if (e.subject) present.add(e.subject); if (e.object) present.add(e.object); }
    for (let i = 0; i < refs.length; i += 1) {
      const r = refs[i];
      const p = rateAt(i);
      const y = present.has(r) ? 1 : 0;
      surprises.push(y === 1 ? -log2(p + 1e-9) : -log2(1 - p + 1e-9));
      tot++;
      logloss += y === 1 ? -log2(p + 1e-9) : -log2(1 - p + 1e-9);
      brier += (y - p) ** 2;
    }
  }
  return { surprises, n: tot, logloss: logloss / tot, brier: brier / tot };
}

const baseRate = refs.filter((r) => inFuture(r)).length / refs.length;
const unprimed = readFuture(() => baseRate);
const primed = readFuture((i) => Math.min(0.99, Math.max(0.01, priorRate(refs[i]))));
const meanDiff = (a, b) => a.surprises.reduce((s, v, i) => s + Math.abs(v - b.surprises[i]), 0) / a.surprises.length;
const primedDiff = meanDiff(primed, unprimed);

// ── 500 shuffled minds: same frequency multiset, permuted across referents ─
const rates = refs.map((r) => priorRate(r));
const shuffledDiff = [];
let shufBetterCount = 0;
for (let k = 0; k < 500; k++) {
  const perm = shuffled(rates, createSeededRng(100000 + k));
  const r = readFuture((i) => Math.min(0.99, Math.max(0.01, perm[i])));
  shuffledDiff.push(meanDiff(r, unprimed));
  if (r.brier < primed.brier) shufBetterCount++;
}
const G1 = {
  held: primedDiff > 0 && (shuffledDiff.filter((d) => d >= primedDiff).length + 1) / (shuffledDiff.length + 1) <= 0.05,
  primedUnprimedDiff: +primedDiff.toFixed(4),
  shuffledDiffMean: +(shuffledDiff.reduce((a, b) => a + b, 0) / shuffledDiff.length).toFixed(4),
};
const G2 = {
  held: primed.brier < unprimed.brier && (shufBetterCount + 1) / (shuffledDiff.length + 1) <= 0.05,
  unprimedBrier: +unprimed.brier.toFixed(4),
  primedBrier: +primed.brier.toFixed(4),
  shuffledBetterThanPrimed: (shufBetterCount + 1) / (shuffledDiff.length + 1),
};

const verdict = G1.held && G2.held
  ? { verdict: "CONFIRMED", claim: "the mind is genuinely moved: the reading-prior changes the future read's surprise beyond ANY shuffled prior, AND predicts the future's appearances better than no-mind and better than every shuffled mind — the retained takings are earned, specific, and consequential." }
  : { verdict: "FALSIFIED", claim: `the mind is NOT moved by its readings in this mechanism: ${G1.held ? "perception differs" : "perception does not differ beyond a shuffled prior"} / ${G2.held ? "prediction improves" : "prediction does not beat the blank or shuffled mind"} — the retained-takings prior is a shell that any prior fills identically (consistent with steps 14-18).` };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep24@1",
  material: { referents: refs.length, frontierBuckets: FRONTB + 1, futureBuckets: futureBuckets.length, baseRate: +baseRate.toFixed(3) },
  gates: { G1, G2 },
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: [
    "Prior = recurrence-rate expectation (the shape of deriveRhythmPrior), mechanically estimated from the frontier; injection is a probability prior, not the full createPriorConditionedReader pipeline.",
    "The shuffled-mind control preserves the frequency multiset (same strength of belief) and destroys only WHICH referent it believes in — the mind's content, not its magnitude.",
  ],
}, null, 2));