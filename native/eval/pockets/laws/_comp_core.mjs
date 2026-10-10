// laws/_comp_core.mjs — computeComp(view): the twelve statistics of laws/comp.mjs. Deterministic; null (never NaN) when a statistic is undefined for the view.
import { prep } from "./_comp_prep.mjs";
import { pairTables, condStats, miDecay, edgeStats, miProfile as miProf } from "./_comp_pairs.mjs";
import { neighbourTypeStats, sameStats, asymStat } from "./_comp_neigh.mjs";

export function computeComp(view) {
  const P = prep(view);
  if (P.N < 200) return { divSlope: null, condR: null, condL: null, rigidL: null, rigidR: null, sameL: null, sameR: null, asym: null, miDecay: null, initEnt: null, finEnt: null, edgeGap: null };
  const T = pairTables(P), nb = neighbourTypeStats(P);
  return { divSlope: nb.divSlope, rigidL: nb.rigidL, rigidR: nb.rigidR, ...condStats(T.T1), ...sameStats(P), asym: asymStat(P).eq, miDecay: miDecay(T), ...edgeStats(P) };
}
/** diagnostic: MI levels (bits) and pair counts at d = 1..8 */
export const miProfile = (view) => miProf(view, prep(view));
