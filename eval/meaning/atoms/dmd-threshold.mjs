// dmd-threshold.mjs — a score threshold with no hand-set cap (PREREG run 21b). The observations are the training pairs ordered from the highest
// score to the lowest; restrict(obs, depth) keeps the top `depth`; derive(obs) is the threshold with the best accuracy on them (ties to the
// strictest), so dmdWindow returns the shallowest number of top-scored pairs that already give the whole set's threshold. None agreeing is its
// typed gap (reach_exceeds_candidates): the threshold is then the whole set's, flagged.
//   dmdThreshold(rows, { score, positive }) → { t, depth, gap, tried }   (rows: objects; score(r) a number; positive(r) boolean)
import { dmdWindow } from "../../../native/kernel/activation.js";

const best = (obs, score, positive) => {
  // candidate thresholds are the observed scores; accuracy of "score ≥ t is positive"; the strictest of the best
  const s = [...obs].sort((a, b) => score(b) - score(a)); let bt = 1.01, bv = obs.filter((r) => !positive(r)).length; // t above all: everything negative
  let tp = 0, fp = 0; const P = obs.filter(positive).length, N = obs.length - P;
  for (let i = 0; i < s.length; i++) { if (positive(s[i])) tp++; else fp++; if (i + 1 < s.length && score(s[i + 1]) === score(s[i])) continue; const acc = tp + (N - fp); if (acc > bv) { bv = acc; bt = score(s[i]); } }
  return bt;
};
// mode "pure" (post hoc, 21b′): the conclusion is the lowest score above which every pair is positive (the run of top-scored pairs with no
// false accept); a false accept is what the cap was for, so its first appearance in the ranking is where the conclusion stops
const pure = (obs, score, positive) => { const s = [...obs].sort((a, b) => score(b) - score(a)); let t = 1.01; for (let i = 0; i < s.length; i++) { if (!positive(s[i])) break; if (i + 1 >= s.length || score(s[i + 1]) !== score(s[i])) t = score(s[i]); } return t; };
export function dmdThreshold(rows, { score, positive, mode = "accuracy" }) {
  const derive = mode === "pure" ? pure : best;
  const obs = [...rows].sort((a, b) => score(b) - score(a));
  const candidates = []; for (let d = 8; d < obs.length; d *= 2) candidates.push(d);
  const w = dmdWindow(obs, (o) => derive(o, score, positive), { candidates, restrict: (o, depth) => o.slice(0, depth) });
  const whole = derive(obs, score, positive);
  return { t: whole, depth: w.window, gap: w.gap ?? null, tried: w.tried, n: obs.length };
}
