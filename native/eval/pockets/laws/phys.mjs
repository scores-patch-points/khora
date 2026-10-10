// eval/pockets/laws/phys.mjs — FAMILY "phys": cheap, reader-free versions of the physical handles that SURVIVED falsification in eval/physics-handles/REPORT.md
// (mass additive, local attraction, affect, void) plus the gravity-law test that the same report refuted as a universal law. No impact reader, no model.
// Observables only: token types, positions in the token stream, counts, frequency ranks, unit and document boundaries. No capitals, POS, word lists, stop-word lists, speaker names.
// Rank thresholds and count floors are observables of the stream itself; only type IDENTITY is used (verified: the values are identical when every character is mapped injectively to Cyrillic or CJK).
//
// HONEST FRAMING. The reader's "shadow mass" counted slot-changes of INSTANCES, so its additivity is close to the arithmetic of counting mentions. A type's mention count over a window
//  equals the sum over its two halves BY IDENTITY, so that literal statistic has a null sd of exactly 0 and could never be PRESENT or ABSENT. massAdd therefore measures a non-trivial
//  cousin: the FOOTPRINT of a type (number of distinct neighbour slots, i.e. distinct (side, neighbour type) pairs, sentence start and end included, that its mentions occupy), whose
//  additivity fails exactly where contexts RECUR (the analogue of the reader's recurrence floor, where two mentions were one event). It is a counting-level proxy; it does not claim
//  to reproduce the reader's slot-change shadow, and the report's finding "far pairs add exactly" has no counterpart here.
//
// THE LAWS IN WORDS, each with the handle it measures and the REPORT.md result it is meant to re-test (REPORT section numbers):
//  massAdd      MASS (sec 3a MASS-ADD, P2). Pooled slope through the origin of the footprint of a type over a 3,000-token window on the sum of its footprints over the two halves of the
//               window (types with >= 3 mentions in each half: the additive regime of the report; 1.0 = footprints add, below 1 = the two halves re-use the same context slots).
//  massExp      MASS (sec 3a P3: log-shadow slope on log n = 0.84, heterogeneous across corpora). Pooled OLS slope of ln footprint on ln mentions, whole 3,000-token windows, types with >= 3 mentions.
//  attrPMI      LOCAL ATTRACTION (sec 3b PG1, PG5a: scrambling inside sentences kills the near part). Mean over lags 1..5 (the window of 5 tokens) of the mean positive PMI per co-occurrence slot
//               of directed pairs a->b in the document stream; types with count >= 10 in the size-equalised sample, pairs seen at least twice; PMI from the sample's own directional marginals.
//  attrDecay    LOCAL ATTRACTION exponent (sec 3b PG2, PG3: informal English 0.66-0.86, not stable across folds). Minus the OLS slope of ln(mean positive PMI per slot) on ln(lag) over the
//               SINGLE lags 1, 2, 3, 4, 6, 8, 12, 16 (not bins: see DESIGN CHANGES). The raw v includes the noise floor of the estimator (about 0.25 per slot, flat in lag); the null removes it.
//  voidShare    VOID (sec 5 and PHYSICS-HANDLES sec 13: the vacuum has structure; PG9 band slope). Share of tokens, in 2,000-token windows, that belong to no recurring figure (type with
//               >= 3 mentions in the window: the additive regime) and to no recurring bigram (adjacent pair, same unit, seen >= 2 times in the window). Mean over windows. NEAR-DUPLICATE WARNING:
//               over 32 test views its Spearman with freq.ttr is 0.93 (it is mostly a window type-recurrence share); it is kept because its null is token-global at the token level.
//  voidRescue   VOID, the frame part: of the tokens whose type is NOT a recurring figure (<= 2 mentions in the window), the share that sits in a recurring bigram. Mean over windows.
//  gravAlpha    GRAVITY (sec 3b PG2: power law with a stable exponent not supported). Mean over 8 disjoint chunks of the distance exponent alpha of the lift (observed / expected directed
//               co-occurrence) of ATTRACTED pairs of the 100 commonest types, the pairs being selected out of chunk (top 10% by Poisson z at lags 1-2 in the other 7 chunks); fitted per chunk as
//               ln L = k - alpha ln(lag) + beta ln(M_g) over lags 1,2,3,4,6,8,12,16 x 3 groups of pairs by mass product M = n_a n_b; expected count = valid positions x p_a p_b (chunk frequencies).
//  gravBeta     GRAVITY, mass exponent: mean over chunks of beta (sec 3b PG6: per-neighbour pull is weaker for frequent bodies: beta below 0; Newton's m_a m_b would give a lift independent of mass: beta 0).
//  gravAlphaSd  GRAVITY, the dispersion statistic asked for: sample standard deviation over the 8 chunks of the fitted alpha. The report found no stable exponent (fold-to-fold rho -0.11); a
//               constant exponent would give only the sampling spread of the null.
//  affect       AFFECT (sec 3a P15: collateral share of change; 70% of mentions change a slot). Jensen-Shannon DISTANCE (square root of the divergence, bits) between the equal-mass rank-bin
//               distribution (7 bins of the frequency-rank order, each holding about 1/7 of the tokens) of the tokens at lags 1-2 either side of RARE tokens (the rarest types holding 10% of the
//               tokens; same unit) and that of all tokens.
//  affectAsym   AFFECT, direction (sec 3b PG4: left/right asymmetry of attraction by word-order family, suggestive only). (J_right - J_left)/(J_right + J_left) for the same JSD on the
//               right (after) and left (before) neighbours of rare tokens. In a law-free text this is a ratio of two noise-level numbers (|v| up to 0.7 in the iid fixed-unit-length worlds): read it only through z.
//
// WHY THESE NULLS (two kinds only: within-unit, token-global)
//  within-unit (massAdd, massExp, attrPMI, attrDecay, voidRescue, affect, affectAsym). Each of these is a law about ORDER inside a unit: which neighbour a token has, which bigram recurs, which
//   directed pair a->b is seen. Shuffling the tokens inside each unit keeps the bag of every unit and every token's unit, destroys adjacency, so a text whose only structure is topical
//   (a bag per unit) sits at the null mean, which is exactly the report's own control (PG5a, within-sentence shuffle: near part ratio 0.02). Token-global would add the unit/topic bag to the
//   "law" and make every z large for a reason that is not about order. Scope condition, said plainly: where units are 3 tokens or shorter the within-unit shuffle leaves the lag-1-2
//   neighbour multiset of every token unchanged, so affect has null sd 0 (z undefined) there; that is a limit of the null, not a finding.
//  token-global (voidShare, gravAlpha, gravBeta, gravAlphaSd). voidShare is a count-level share whose law-free value is the share of an exchangeable draw from the pocket's own unigram law,
//   so every kind of clustering (topic, burst, frames) counts as structure. The gravity statistics are about the existence and constancy of ANY attraction law at distance up to 16 tokens:
//   under a token-global shuffle the selected pairs are random, the lift is 1 and alpha = beta = 0 up to noise (verified on iid worlds), and the sd of alpha across chunks is pure
//   sampling noise, so z > 0 for gravAlphaSd reads "the exponent varies across chunks beyond sampling noise", the failure of a constant gravity law. NOTE the comparison is against a null whose
//   alpha is 0, not against a constant exponent of the real size: z about 0 (as found in books, chat and treebanks) means "no more chunk-to-chunk spread than pure sampling noise",
//   i.e. consistent with a constant exponent.
//
// SIZES AND LIMITS (null = undefined for this half, never NaN): massAdd/massExp need >= 6,000 tokens and >= 20 qualifying (window, type) rows; voidShare/voidRescue >= 2,000 tokens;
//  attrPMI/attrDecay >= 4,000 tokens of sample, >= 10 floor types and >= 3,000 eligible slots at every lag; gravity >= 8,000 tokens, >= 50 types, >= 6 chunks with a valid fit (>= 12 cells, three
//  mass groups that really differ); affect >= 4,000 tokens and >= 200 rare tokens. SIZE EQUALISATION: attraction and gravity use 8 evenly spaced blocks of whole units of at most ~6,000 tokens
//  (at most 48,000 tokens, sampleBlocks in _phys_prep.mjs), so their raw v does not drift with the half's size once a half has >= 48,000 tokens (smaller halves use blocks of N/8: the size scan
//  shows attrDecay 0.46 at 20,000 tokens against 0.50-0.51 from 40,000 up). Mass and void use fixed-size windows over the whole half; affect has a fixed rare-token share.
//
// DESIGN CHANGES AFTER THE FIRST RUNS (all made on planted or law-free worlds BEFORE any real-text result was looked at, except the last two, which were checked against real text; none changed PREDICT):
//  1. attraction lag BINS gave the planted burst world (exponential kernel) a NEGATIVE decay: a bin of w lags counts one cluster up to w times, so pairs reach "seen twice" more easily in wide bins.
//     Replaced by single lags. 2. the first bin-sample sizes were unequal across bins (stride rounding); equalised to min(100,000, N) anchors per lag.
//  3. the first gravity estimator (aggregate lift of all pairs of the 100 commonest types, ln L on ln lag and mass-product groups) is CONSERVED (partner shares sum to 1), gave alpha < 0 in the
//     planted markov and frames worlds; replaced by the out-of-chunk selection of attracted pairs described above. 4. attraction and gravity moved to the size-equalised blocks after the size
//     scan showed attrPMI falling 0.74 -> 0.66 and attrDecay rising 0.46 -> 0.54 from 20,000 to 150,000 tokens of one book. 5. affect: sqrt of the JSD (the divergence's null is chi-square-like
//     and right-skewed); 12 rank octaves replaced by 7 equal-mass bins (tail octaves were almost empty). 6. rank ties: a hash tie-break was tried and dropped (it made the values depend on the
//     characters of the strings, failing the script test); ranks now use the mid-rank of a tie group and the first-occurrence order only for the cut at the 100th body and the rare-class stride.
//
// MEASURED (tests/phys/: results-*.json, summary.json; every number below is in summary.json)
//  * null calibration: 120 law-free iid worlds of 50 documents (20 + 100 fresh): 5 of 1,320 cells at |z| >= 4 (0.38%), 118 at |z| >= 2 (8.9%; Student-t with 9 df gives 7.7%); per-statistic mean z
//    between -0.4 and +0.4, sd of z 0.9-1.5 (heaviest tails: voidRescue 1.46 and, in the first 20 worlds, affect 1.48; the t-like z of 10 null draws is expected to give about 1.13). Both planted iid worlds (pl-null, pl-null2): 0 of 44 cells at |z| >= 4.
//  * the statistics MOVE when the phenomenon is planted (|z| >= 4 in both halves, expected sign): pl-burst attrPMI+, voidShare-, gravAlpha+ (attrDecay 4.1/3.2 and gravBeta -3.0/-2.6 below the bar);
//    pl-markov attrPMI+, attrDecay+, gravAlpha+, affect+, massAdd-, massExp-; pl-frames attrPMI+, attrDecay+, voidShare-, voidRescue+, gravAlpha+, affect+, massExp-; pl-parallel attrPMI+,
//    attrDecay+, voidShare-, voidRescue+, massExp+ (opposite sign to markov and frames: massExp can reverse); pl-mix attrPMI+, attrDecay+, voidShare-, gravAlpha+, gravBeta-, affect+, massExp-.
//    pl-length (string lengths only): nothing, as it must be. gravAlphaSd and affectAsym reach the bar nowhere in planted worlds (affectAsym fires in one pl-frames half).
//  * timing (CPU, 150,000 tokens): 96-130 ms steady, 100-280 ms first call (JIT), against a 700 ms budget; units of 5 or 100 tokens and a 73,000-type vocabulary change nothing material.
//  * through the real harness (run-atlas.mjs, 3 planted pockets, 10 draws): 0 errors, byte-identical on rerun (excluding the seconds field).
//  * script invariance: identical values for Latin, Cyrillic-mapped and CJK-mapped copies of one text. Edge views (empty, one unit, 100 tokens, one repeated token, two types, ten types, one document): no
//    exception, every value finite or null.
//  * NOT trivial functions of token count: over 20,000 -> 150,000 tokens of one book massAdd varies 0.2%, massExp 1%, voidShare 3%, voidRescue 5%, affect 5%, attrPMI 6% (not monotone beyond 40,000), attrDecay 10% (0.46 at 20,000, 0.50-0.51 from 40,000: the
//    size-equalised sample is not yet full below 48,000 tokens), gravAlpha 14%; gravBeta (-0.05 to -0.11) and gravAlphaSd (0.02 to 0.056) move by more than 60% between sizes: sampling noise of small
//    numbers (Spearman with log N -0.8 and -0.4 over four sizes), not a trend one can read.
//    UNIT LENGTH: in iid worlds with fixed unit length 3, 6, 12, 24 and no structure, massExp rises 0.837 -> 0.914 and voidRescue 0.0042 -> 0.0088 (unit edges, bigrams cannot cross a unit),
//    massAdd 0.893 -> 0.899; the others show no monotone trend (affectAsym, gravAlpha, attrDecay are noise around 0). The same two statistics rise with unit length when one real text is cut
//    into units of 4, 8, 16, 32 tokens (massExp 0.852 -> 0.923, voidRescue 0.049 -> 0.074). Their z removes it (same unit lengths in the null); the raw v of massExp and voidRescue is partly a
//    function of unit length and the atlas G1 gate should be expected to flag them as sizeConfounded against mean unit length.
//  * near-duplicates (Spearman over 32 views): voidShare ~ freq.ttr 0.93; within the family attrPMI ~ gravAlpha 0.89 and massAdd ~ massExp 0.88.
//  * FIRST LOOK at the blind PREDICT on 7 real halves/pockets (2 books, 2 IRC channels, 1 code file, 2 UD treebanks), NOT the atlas, only to be superseded by it: attrPMI, attrDecay, voidRescue,
//    gravAlpha, voidShare behave as predicted, affect too except in the code file (absent there); massExp (predicted specific) is negative in 7 of 7; massAdd (specific) negative in 5 of 7; gravBeta (universal-) negative but |z| >= 4 in only 3;
//    gravAlphaSd (universal+) is at null level in 5 of 7 (it exceeds the null only in the code file); affectAsym is at or near the null in all seven.
//
// BLIND PREDICT (written and frozen, sha256 in tests/phys/predict-frozen.json, BEFORE any phys statistic was computed on any data)
//  massAdd     specific    sign unsure: frequent function words have MORE diverse neighbours in text than in a shuffle (a content word follows every "the") while content words have fewer
//                          (always "the X"); the two effects on the pooled slope pull opposite ways and the report found "not one law" for the sub-extensivity (Q p < 1e-4).
//  massExp     specific    the same two-sided mechanism; the report's 0.84 was heterogeneous across corpora (0.65 to 1.02).
//  attrPMI     universal+  directional collocation and syntax are order structure in every natural-language pocket and in code; within-unit shuffling removes it (PG5a). Weaker where units are very short.
//  attrDecay   universal+  the near lags carry the order-specific mass that the shuffle removes, the far lags do not: the exponent exceeds the null's; its VALUE is expected not to repeat across halves (PG3).
//  voidShare   universal-  clustering (topic, burst, frames) makes types recur and bigrams repeat more than an exchangeable draw does, so less of the window is ground.
//  voidRescue  universal+  repeated names and collocations are bigrams between low-frequency types; a shuffle has almost none.
//  gravAlpha   universal+  lift above 1 falls with lag (near-field plus burst) in every pocket with any local structure; planted iid worlds are the only zero.
//  gravBeta    universal-  burst recurrence and collocation are stronger for the rarer of the 100 commonest types: lift falls with the product of masses (PG6 direction).
//  gravAlphaSd universal+  structure makes the fitted exponent vary from chunk to chunk by more than the null's sampling noise: no constant gravity law (the report's PG3 failure).
//  affect      universal+  a rare token is flanked by a different class of tokens than the unit's random token (rare content words sit among frequent function words); shuffle removes it.
//  affectAsym  specific    which side carries the effect depends on word order (heads, adpositions, articles): a typological, pocket-class-specific sign; may be a REVERSAL.
import { massStats } from "./_phys_mass.mjs";
import { voidStats } from "./_phys_void.mjs";
import { attrStats } from "./_phys_attr.mjs";
import { gravStats } from "./_phys_grav.mjs";
import { affectStats } from "./_phys_affect.mjs";
import { prep } from "./_phys_prep.mjs";

export const FAMILY = "phys";
export const STATS = [
  { id: "massAdd", statement: "MASS (re-tests MASS-ADD / P2): pooled slope through the origin of the footprint (distinct side-tagged neighbour types incl. unit edges) of a type over a 3,000-token window on the sum of its footprints over the two halves of the window; types with >= 3 mentions in each half; below 1 = the halves re-use context slots", null: "within-unit" },
  { id: "massExp", statement: "MASS (re-tests P3, extensive exponent 0.84): pooled OLS slope of ln footprint on ln mentions over types with >= 3 mentions in 3,000-token windows", null: "within-unit" },
  { id: "attrPMI", statement: "LOCAL ATTRACTION (re-tests PG1/PG5a): mean over lags 1-5 of the mean positive PMI per slot of directed pairs a->b (types with count >= 10 in a size-equalised sample of <= 48,000 tokens, pairs seen >= 2 times at that lag)", null: "within-unit" },
  { id: "attrDecay", statement: "LOCAL ATTRACTION decay (re-tests PG2/PG3): minus the slope of ln(mean positive PMI per slot) on ln(lag) over the single lags 1, 2, 3, 4, 6, 8, 12, 16", null: "within-unit" },
  { id: "voidShare", statement: "VOID (re-tests sec 13, PG9): share of tokens in 2,000-token windows whose type has <= 2 mentions in the window and that sit in no bigram recurring >= 2 times in the window", null: "token-global" },
  { id: "voidRescue", statement: "VOID frame part: among tokens whose type has <= 2 mentions in the 2,000-token window, the share in a bigram recurring >= 2 times in the window", null: "within-unit" },
  { id: "gravAlpha", statement: "GRAVITY (re-tests PG2): mean over 8 size-equalised chunks of the distance exponent alpha of the lift of attracted pairs of the 100 commonest types (pairs selected out of chunk; ln L = k - alpha ln lag + beta ln(m_a m_b) over lags 1-16)", null: "token-global" },
  { id: "gravBeta", statement: "GRAVITY (re-tests PG6): mean over 8 chunks of the mass exponent beta of the lift of attracted pairs (below 0 = pull per neighbour weaker for heavier pairs)", null: "token-global" },
  { id: "gravAlphaSd", statement: "GRAVITY (re-tests PG3, no stable exponent): sample standard deviation over the 8 disjoint chunks of the half of the fitted distance exponent alpha", null: "token-global" },
  { id: "affect", statement: "AFFECT (re-tests P15): Jensen-Shannon distance (square root of the divergence in bits) between the 7-bin equal-mass frequency-rank distribution of the tokens at lags 1-2 either side of rare tokens (rarest types holding 10% of tokens) and that of all tokens", null: "within-unit" },
  { id: "affectAsym", statement: "AFFECT direction (re-tests PG4): (J_right - J_left)/(J_right + J_left), the JSD of the right and left neighbours of rare tokens against the base rank-bin distribution", null: "within-unit" },
];
export const PREDICT = {
  massAdd: "specific", massExp: "specific", attrPMI: "universal+", attrDecay: "universal+", voidShare: "universal-", voidRescue: "universal+",
  gravAlpha: "universal+", gravBeta: "universal-", gravAlphaSd: "universal+", affect: "universal+", affectAsym: "specific",
};

/** compute(view) -> {[statId]: number|null}; deterministic; one shared prep pass, no randomness. */
export function compute(view) {
  const P = prep(view);
  return { ...massStats(P), ...voidStats(P), ...attrStats(P), ...gravStats(P), ...affectStats(P) };
}
