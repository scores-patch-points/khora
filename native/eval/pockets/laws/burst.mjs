// eval/pockets/laws/burst.mjs — FAMILY "burst": TEMPORAL STRUCTURE of a pocket (burstiness and memory of word recurrence, the repeat kernel, discourse persistence, topic drift, long memory).
// Observables only: frequency counts and ranks (ties broken by the string itself), token positions, gaps between recurrences, unit boundaries, document boundaries. No capitals, POS, word
// lists, stop-word lists or speaker names. "Head" and "content" are defined by within-view frequency RANK only (a fixed rank cutoff), never by a list.
//
// THE LAWS IN WORDS (what each statistic is a law about)
//  burstB     words arrive in bursts: the Goh-Barabasi burstiness B of the inter-arrival times of the K = 100 commonest types, in Kim-Jo finite-size form, B = 0 for a Poisson stream, > 0 bursty.
//  burstBmid  the same law for the next band of types (rank 101-1000, >= 12 occurrences): rarer words are expected burstier than the head.
//  burstM     memory: a long gap tends to follow a long gap (Goh-Barabasi M = Pearson r of consecutive inter-arrival times of the head types, plus the +1/k small-sample correction); M > 0 = bursts of bursts (topic regimes).
//  repAdj     adjacent-token repeat rate against chance: ln(observed / chance) of P(token = previous token of its document), chance = the exact hypergeometric expectation for random placement.
//  kerSlope   REPEAT KERNEL: P(the token's type already occurred within the previous d tokens of the document) at d = 1,2,4,...,128, divided by its exact chance value; the lift L(d).
//             kerSlope is the log-log slope of L(d) (orthogonal quadratic fit of ln L on ln d, linear coefficient): < 0 = a local repetition kernel that decays toward chance (bursty text),
//             > 0 = local repetition is AVOIDED and recurs only later (syntax-bound text); near 0 = no kernel structure.
//  kerCurv    the curvature (quadratic coefficient) of ln L on ln d: ~0 = power law (log-log straight), < 0 = exponential / saturating (a characteristic time scale), > 0 = convex.
//  kerFar     ln L(128): the long-range (topic / document level) excess recurrence that survives the local kernel.
//  persist    unit-to-unit persistence: ln of the mean Jaccard overlap of the content-type sets of consecutive units over the same quantity for length-matched, far-apart partner units.
//             Content = types with frequency rank > 100 (by mid-rank, within the view) that occur at least twice. Positive = adjacent units share content more than unrelated units.
//  driftSlope topic drift: slope of ln(lift of the Jaccard overlap) on ln(lag) over unit lags 1,2,4,8,16,32 (same length-matched far baseline at every lag); negative = overlap decays with lag.
//  driftTail  ln of the lag-32 Jaccard lift: topic persistence that survives 32 units.
//  hurst      long memory of the word-rank series: DFA-1 exponent of x_i = ln(mid-rank of token i's type) over window scales 16..1024 tokens (0.5 = no memory, > 0.5 persistent).
//
// WHY THESE NULLS (two kinds: token-global, unit-order)
//  burstB, burstBmid, burstM, repAdj, kerSlope, kerCurv, kerFar: TOKEN-GLOBAL. They are laws about WHERE a word's occurrences fall in the stream, and a law-free text is a text whose tokens are
//   exchangeable given the unigram counts. The token-global shuffle keeps exactly the counts (so the head set, the collision probability and the chance values are unchanged) and destroys
//   every positional regularity: B and M of a shuffled stream are the finite-size Poisson values (null mean ~0 after the Kim-Jo correction), the lift L(d) is 1 at every d, so the
//   slope, curvature and far lift are ~0. A within-unit shuffle would be wrong here: it leaves every between-unit regularity (topic regimes, chapters) intact, so B and M would stay
//   high and the z would measure only within-unit order, not burstiness. A unit-order shuffle would leave all within-unit repetition (and units are often one line or one sentence).
//   The chance level inside compute() (exact hypergeometric, document-truncated windows) is the same expectation as this null, so v itself is ~0 under the null as well as z.
//  persist, driftSlope, driftTail, hurst: UNIT-ORDER. They are laws about discourse order of whole units. The unit-order shuffle keeps every unit intact (so unit length, within-unit
//   content and within-unit rank structure stay) and destroys exactly what is claimed: which unit is next to which and where in the stream. The baseline is length-matched (see
//   _burst_units.mjs), so unit-length persistence does not masquerade as lexical persistence, and the null mean of ln-lift is ~0. A token-global shuffle would also destroy the
//   within-unit structure (sets would be random bags), turning every statistic into a test of "units are not random bags", a different law. For hurst, within-unit rank structure
//   (frame order, syntax) belongs to the null world, because the law concerns memory across units at scales of 16 tokens and longer.
//
// BLIND PREDICT (fixed before any statistic was computed on any data; sha256 of the frozen JSON is stored in tests/burst/predict-frozen.json). The vocabulary is the protocol's four
// states; a pattern that would be MAJORITY (60-85% present) is written as the state it is closest to, and the rationale says so.
//  burstB     universal+  the Poisson null fails for even the commonest words (document / topic regimes); null sd of a 100-type mean is tiny, so any positive B is >= 4 sd.
//  burstBmid  universal+  rarer (content) words are bursty everywhere there are enough of them (Altmann et al.); only pockets with < 20 qualifying types return null.
//  burstM     specific    the sign and size of gap memory depend on regime structure: positive where topics persist in long runs, ~0 or negative in turn-taking / list-like pockets.
//  repAdj     universal-  syntax forbids immediate repetition of the frequent function words that dominate chance collisions, so natural-language pockets sit far BELOW chance
//                         (code, chat echoes, liturgy may flip; I expect ~80% negative, so MAJORITY is possible).
//  kerSlope   specific    natural-language pockets: lift RISES with d (avoidance at d=1 recovers): positive; repetition-rich pockets (code, parallelism, chat echo): lift falls: negative.
//  kerCurv    universal-  both the avoidance-recovery shape and the decaying-burst shape saturate in ln d: concave (a characteristic time), not a straight log-log power law.
//  kerFar     universal+  at d = 128 contiguous text recurs more than a random sample of its own tokens (topic), by a margin small but several null sd wide.
//  persist    universal+  neighbouring units share content types more than length-matched far-apart units in nearly every ordered pocket; fails where units are shuffled independent items.
//  driftSlope universal-  wherever persist is positive the lift decays with lag.
//  driftTail  specific    persistence over 32 units (a section) needs documents with a stable topic: books, long documents; not chat, not shuffled-sentence treebanks.
//  hurst      universal+  documents differ in vocabulary richness and register, so the rank series has long memory (H > 0.5) beyond what a unit shuffle gives.
// KNOWN LIMITS AND CHANGES AFTER THE FREEZE (honest record; the frozen PREDICT table was not touched)
//  - burstM got the +1/k small-sample correction after the first size test on the LAW-FREE planted world pl-null (uncorrected null mean -0.07 at 10k tokens); nothing else was changed after the first run.
//  - persist / driftSlope / driftTail are noisy where Jaccard hits are rare (null sd 0.1-0.5 on 50k-token iid slices with ~10-token units; real books 0.05-0.25): they have power only for strong effects.
//  - kerSlope / kerCurv fit ALL eight lags, so in natural language the slope is dominated by the d <= 4 avoidance zone (lift < 1 rising to a peak near d = 16) rather than by the decay beyond it;
//    the slope of ln L over d = 16..128 (the tail decay exponent) is NOT a registered statistic (it would have had no blind prediction); tests/burst/profile.out shows the full profile.
//  - burstB / hurst keep a small finite-size drift in raw v (null mean -0.03 -> -0.005 for burstB and 0.498 -> 0.488 for hurst between 10k and 80k tokens): read z, not v, across sizes; G1 judges it.
//  - the atlas z uses 10 null draws (t-like, 9 df). On 16 exchangeable-unit slices (25k tokens; pl-null, pl-null2, pl-length, pl-markov) the 7 non-kernel statistics gave 1 cell at |z| >= 4
//    (driftSlope, z -4.93, pl-markov) in 112, against ~0.35 expected from t9; on the 50k-token pl-markov slice B, hurst gave z -5.6 with the 10-draw sd, but z -2.9 with the 150-draw sd (twice as large).
//    So one PRESENT cell of a noisy statistic (driftSlope, driftTail, persist, hurst) is weak evidence; the iid worlds pl-null and pl-null2 gave 0 of 44 cells at |z| >= 3.
import { prep } from "./_burst_prep.mjs";
import { burstStats } from "./_burst_burst.mjs";
import { kernelStats } from "./_burst_kernel.mjs";
import { unitStats } from "./_burst_units.mjs";

export const FAMILY = "burst";
export const STATS = [
  { id: "burstB", statement: "Goh-Barabasi burstiness B (Kim-Jo finite-size form) of inter-arrival times (tokens, view stream) of the K=100 commonest types with >= 8 occurrences, mean over types; 0 = Poisson", null: "token-global" },
  { id: "burstBmid", statement: "the same B for types of frequency rank 101-1000 with >= 12 occurrences (needs >= 20 such types), mean over types", null: "token-global" },
  { id: "burstM", statement: "Goh-Barabasi memory M: Pearson r between consecutive inter-arrival times of the 100 commonest types (>= 8 pairs, +1/k small-sample correction), mean over types", null: "token-global" },
  { id: "repAdj", statement: "ln(observed / chance) of the adjacent-token repeat rate within a document (repeat kernel at d=1; chance = exact expectation under random placement)", null: "token-global" },
  { id: "kerSlope", statement: "log-log slope of the repeat-kernel lift L(d) = P(type seen within previous d tokens of the document)/chance, d = 1,2,4,...,128 (linear coefficient of an orthogonal quadratic fit of ln L on ln d)", null: "token-global" },
  { id: "kerCurv", statement: "curvature (quadratic coefficient) of ln L(d) on ln d: ~0 power law, < 0 exponential / saturating", null: "token-global" },
  { id: "kerFar", statement: "ln L(128): long-range excess recurrence of a type within the previous 128 tokens of its document", null: "token-global" },
  { id: "persist", statement: "ln of mean Jaccard of the content-type sets of consecutive units over the same for length-matched far partner units (content = frequency rank > 100 and count >= 2)", null: "unit-order" },
  { id: "driftSlope", statement: "slope of ln(Jaccard lift over length-matched far baseline) on ln(unit lag), lags 1,2,4,8,16,32; negative = topic drift", null: "unit-order" },
  { id: "driftTail", statement: "ln of the lag-32 Jaccard lift over the length-matched far baseline", null: "unit-order" },
  { id: "hurst", statement: "DFA-1 (Hurst-type) exponent of the word-rank series x = ln mid-rank of the token's type, window scales 16..1024 tokens, non-overlapping windows; 0.5 = no memory", null: "unit-order" },
];
export const PREDICT = {
  burstB: "universal+", burstBmid: "universal+", burstM: "specific", repAdj: "universal-", kerSlope: "specific", kerCurv: "universal-",
  kerFar: "universal+", persist: "universal+", driftSlope: "universal-", driftTail: "specific", hurst: "universal+",
};

const NONE = Object.fromEntries(STATS.map((s) => [s.id, null]));
/** compute(view) -> {[statId]: number|null}; deterministic (no rng, no clock); typed arrays, single passes; view.id is never read. */
export function compute(view) {
  const P = prep(view);
  if (P.N < 2000 || P.V < 30) return { ...NONE };
  const r = { ...NONE, ...burstStats(P), ...kernelStats(P), ...unitStats(P) };
  for (const k of Object.keys(r)) if (!Number.isFinite(r[k])) r[k] = null; // never NaN / Infinity: undefined is null
  return r;
}
