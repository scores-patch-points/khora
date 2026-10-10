// eval/pockets/laws/comp.mjs — FAMILY "comp": the LAWS OF COMPANY (Firth: you know a word by the company it keeps). Statistics about a token's neighbours, in observables only:
// frequency ranks (rank bin = min(11, floor(log2(rank))) of the type in the pocket-half's OWN frequency order, ties by string order, exactly as eval/law/name-company.mjs rankBins),
// positions inside the unit, recurrence, neighbour identity (as an opaque id, never as a string), unit edges. No capitals, POS, treebank labels, word lists, stop lists, speaker names.
//
// THE LAWS IN WORDS
//  divSlope   neighbour diversity versus frequency, at FIXED SAMPLE SIZE: for every type with >= 32 left-neighbour and >= 32 right-neighbour occurrences, D = (distinct left neighbour types among its
//             first 32 left-neighbour occurrences + distinct right neighbour types among its first 32 right-neighbour occurrences) / 2; divSlope = OLS slope of ln D on ln count over those types
//             (needs >= 15 types). Fixing the sample at 32 removes the sampling saturation that makes a raw distinct-count slope a function of pocket size (the first definition of this statistic,
//             slope of ln distinct on ln count over count octaves 8..511, was tried on one iid world and one book, fell with pocket size in both (Spearman -1; 0.90 -> 0.81 on Great Expectations from
//             10k to 150k tokens), and was replaced BEFORE the blind prediction below was rewritten, see AMENDMENT). In a law-free text D does not depend on the type's own frequency (slope 0).
//             Positive = frequent types keep broader company than rarer ones at equal sample size.
//  condR      the next token's rank bin is predictable from the current one: H(bin of next | bin of current) / H(bin of next), over adjacent pairs inside one unit (1 = no company, lower = company).
//  condL      the same for the left neighbour: H(bin of previous | bin of current) / H(bin of previous). NOTE (honest, algebraic): both ratios use the same pair table, so they differ only
//             through the two marginal entropies (non-initial versus non-final tokens); condR - condL is a unit-edge effect, not independent information (measured: they agree within 0.0007 in every one of 18
//             cells tested, planted halves and novels). Both are reported because the brief asks; treat them as ONE law when counting laws.
//  rigidL     the share of 'rigid' types: of the types with >= 10 occurrences that HAVE a left neighbour in their unit, the share whose single commonest left neighbour type accounts for
//  rigidR     >= 0.8 of those occurrences (collocation-bound types: titles, particles, fixed bigrams). rigidR is the same for the right neighbour. Needs >= 20 eligible types. SOFT version: a type
//             below the threshold still counts exp(-(0.8 - m) / 0.15) (m = its commonest neighbour's share), because the hard share is ~0 in every shuffle (z undefined or a lumpy count of chance events);
//             the soft share is >= the hard share, its shuffle null is smooth (mean ~0.01, 100 iid replicates: no cell at |z| >= 4). The hard shares are returned by neighbourTypeStats() for tests.
//  sameL      same-left / same-right repeat rate: over consecutive occurrences of a type (stream order), the share whose left (right) neighbour type is the same as at the previous occurrence
//  sameR      (pairs where both occurrences have that neighbour). Static collocation strength is kept by the null, so z isolates DISCOURSE PERSISTENCE of company (parallelism, refrains,
//             topic-bound contexts); raw v still carries the static part. Needs >= 200 pairs.
//  asym       asymmetry of company, a prior-free proxy for head direction: over the 20 commonest types with >= 40 interior occurrences (a neighbour on both sides; needs >= 10 of them), the mean over
//             types of (H_R - H_L) / (H_R + H_L), H = Miller-Madow entropy (bits) of the rank-bin distribution of the type's right / left neighbours. > 0: right company more diverse than left
//             (the type is more tightly bound to what is on its left); < 0: the reverse. Equal weights because the count-weighted pooled version is by the symmetry of mutual information only a
//             unit-edge effect; top 20 because the qualifying set must not grow with pocket size. NOT validated as a head-direction measure: on nine UD dev treebanks its sign did not track word order.
//  miDecay    decay exponent of the long-range company: -slope of ln MI_d on ln d, d = 1..8, MI_d = plug-in mutual information (bits) between the rank bins of tokens d apart inside one unit (12 x 12 table),
//             computed on a systematic subsample of exactly M = min(8000, pairs at d = 8) pairs at EVERY distance (integer stride, no randomness) so that the plug-in floor is one constant at all d and,
//             above ~25k tokens, in all pockets (the full-sample exponent on one novel went 0.86 -> 2.10 from 10k to 180k tokens, the fixed-M one 0.89 -> 1.16). Positive = MI falls with distance.
//             Null (not defined) when M < 1500 or any MI_d <= 0, e.g. pockets whose units are shorter than ~9 tokens. The subsample means raw v is a deliberately floor-flattened exponent.
//  initEnt    unit-edge laws: Shannon entropy (bits) of the rank-bin distribution of unit-initial tokens (units of >= 2 tokens), and
//  finEnt     the same for unit-final tokens. The null value is about the entropy of the bag's own bin law (near the maximum, because each octave of rank carries about equal mass), so
//             any positional preference of the edge lowers it.
//  edgeGap    mean over units of >= 2 tokens of [ln rank(final token) - ln rank(initial token)] / ln V, V = number of types in the half. Log-rank, never raw rank (the mean raw rank is carried by
//             the hapax tail). Scaled by ln V because the raw log-rank gap grows with vocabulary size (on one novel, 10k -> 150k tokens: the bin gap 2.36 -> 2.92, this scaled gap 0.224 -> 0.228; second novel 0.29 -> 0.25).
//             > 0: units start with the frequent classes and end on rarer ones (function-word-initial); < 0: the reverse.
//
// WHY THESE NULLS (two kinds only: within-unit, unit-order)
//  WITHIN-UNIT for divSlope, condR, condL, rigidL, rigidR, asym, miDecay, initEnt, finEnt, edgeGap. Every one of them is a law about WHERE a token stands relative to its neighbours INSIDE a unit.
//   The within-unit shuffle keeps each unit's bag (so topical co-occurrence, unit length, and the unigram law are untouched) and destroys exactly the order, so null mean = 'the same words
//   in a random order' and z reads 'order inside the unit makes neighbours more (or less) predictable / rigid / diverse than bag co-occurrence alone'. The token-global null would also destroy
//   unit-level co-occurrence and would credit topic to order; the unit-order null does not touch within-unit order at all. For edgeGap, asym, initEnt vs finEnt the within-unit null is also exactly
//   symmetric (first and last, left and right, are exchangeable), so the null mean is 0 for the two signed contrasts by construction.
//  UNIT-ORDER for sameL and sameR. Consecutive occurrences of one type are compared; unit-order shuffles whole units, so every (type, neighbour) pair inside a unit is kept
//   exactly (static collocation, the collision rate of the type's neighbour law) while which occurrence follows which is randomised: null mean = 'contexts recur at exchangeable positions',
//   z reads 'contexts recur closer together than exchangeable occurrences' (persistence). Under within-unit the same statistic would mostly restate rigidL/rigidR.
//
// SIZES AND LIMITS: every statistic returns null (never NaN) when undefined for the half (views under 200 tokens: all null). Cost: one pass of integer ids, 12 x 12 count tables and Maps keyed by id pairs;
//  measured 34-131 ms CPU per call at 150,000 tokens (budget 700 ms), 300 fuzz views and 9 edge cases: no exception, no NaN.
// TESTED (tests/comp/, summary.json): 8 planted pockets x 2 halves (iid worlds: 0 of 48 cells at |z| >= 4; markov, frames, parallel phenomena recovered in both halves with the expected sign), 100 iid
//  replicates (6 of 1200 cells at |z| >= 4 = 0.5%, t(9) nominal 0.31%), two novels with regrouped controls (edge laws vanish when sentence edges are cut away; adjacency laws stay), size and unit-length sweeps.
//  Known size sensitivity of raw v (z is unaffected): condR and initEnt/finEnt below ~20k tokens (plug-in bias), divSlope and rigidR drift on one novel (0.081 -> 0.062; 0.041 -> 0.056 from 10k to 150k tokens).
//
// BLIND PREDICT (written before any statistic was computed on any data; sha256 of the frozen table in tests/comp/predict-frozen.json). Meaning: status of the statistic across REAL pockets by the protocol rule.
//  divSlope   universal+  (AMENDED, see below; the original entry was universal- for the octave-slope definition) at equal sample size the commonest types (function words) have broader, less repetitive
//             company than mid-frequency content words, whose neighbours recur (determiners, prepositions), while the shuffle gives every type the same unigram-driven breadth: slope above the null.
//  condR      universal-  adjacent rank classes are dependent in every written language (function words next to content words): conditional entropy below the shuffled value; large effect.
//  condL      universal-  same as condR; the two differ only through the edge marginals, so they should agree in status.
//  rigidL     universal+  every language has fixed bigrams (titles, 'per cent', particles, idioms); the shuffle null has almost none, so even a small share is far above its tiny noise.
//  rigidR     universal+  as rigidL; fails only where there are too few types with >= 10 occurrences (agglutinative or small pockets), which is why I do not rate it above universal.
//  sameL      specific    persistence of contexts needs discourse-ordered units (books, chat, code files); pockets whose units are shuffled sentences have exchangeable order: absent there.
//  sameR      specific    as sameL.
//  asym       specific    sign should follow word order (head-initial versus head-final): present with opposite signs in different pockets, absent in pockets without a dominant direction.
//  miDecay    universal+  MI between rank classes is large at d=1 and falls with d in every ordered text, steeper than the flat shuffled floor; undefined only in pockets with very short units.
//  initEnt    universal-  units open with a restricted set of classes; any positional preference lowers the entropy of a near-uniform bin law.
//  finEnt     universal-  units close on a restricted set of classes (content words or sentence-final particles); same logic.
//  edgeGap    specific    function-word-initial languages give > 0 and head-final languages with final particles/verbs give < 0: the sign reverses with word order.
// AMENDMENTS (disclosed). (1) the table above was frozen (tests/comp/predict-frozen.json, sha256 eca34245...) before any statistic existed. After the first smoke and sweep runs I replaced the definition of
// divSlope (reason: size confound, see its entry) and rewrote ITS prediction only, before the new divSlope had been computed on any data; the other eleven entries are unchanged. The amended table is frozen in
// tests/comp/predict-amended.json. The old definition gave z -9.2 and +7.1 on two English books, so its original prediction was already contradicted.
// (2) after the first smoke/sweep runs, NOT touching any prediction: rigid soft share (zero-variance null), miDecay fixed-M subsample (size), edgeGap scaled by ln V (size), asym equal-weighted over the
// 20 commonest types (edge-effect argument and size). Each change was made on the evidence listed in its entry above; the planted worlds, UD treebanks and two novels were all seen while making them.
import { computeComp } from "./_comp_core.mjs";

export const FAMILY = "comp";
export const STATS = [
  { id: "divSlope", statement: "neighbour diversity vs frequency at fixed sample size: OLS slope of ln D on ln count over types with >= 32 left and >= 32 right neighbour occurrences, D = (distinct left neighbour types in the first 32 + distinct right neighbour types in the first 32)/2", null: "within-unit" },
  { id: "condR", statement: "H(rank bin of the next token | rank bin of the current) / H(rank bin of the next), adjacent pairs inside units; lower = more predictable company", null: "within-unit" },
  { id: "condL", statement: "H(rank bin of the previous token | rank bin of the current) / H(rank bin of the previous), adjacent pairs inside units (differs from condR only through the edge marginals)", null: "within-unit" },
  { id: "rigidL", statement: "soft share of rigid-left types: of types with >= 10 left-neighbour occurrences, mean of 1 if the commonest left neighbour type has >= 0.8 of them, else exp(-(0.8 - m)/0.15)", null: "within-unit" },
  { id: "rigidR", statement: "soft share of rigid-right types: of types with >= 10 right-neighbour occurrences, mean of 1 if the commonest right neighbour type has >= 0.8 of them, else exp(-(0.8 - m)/0.15)", null: "within-unit" },
  { id: "sameL", statement: "same-left repeat rate: share of consecutive occurrences of a type that have the same left neighbour type as the previous occurrence (static part kept by the null; z = discourse persistence)", null: "unit-order" },
  { id: "sameR", statement: "same-right repeat rate: share of consecutive occurrences of a type that have the same right neighbour type as the previous occurrence (static part kept by the null; z = discourse persistence)", null: "unit-order" },
  { id: "asym", statement: "head-direction proxy: mean over the 20 commonest types (>= 40 interior occurrences) of (H_R - H_L)/(H_R + H_L), H = Miller-Madow entropy of the rank bin of the right / left neighbour; > 0 = right company more diverse than left", null: "within-unit" },
  { id: "miDecay", statement: "decay exponent of company: -slope of ln MI_d on ln d, d = 1..8, MI_d = plug-in mutual information (bits) between rank bins d apart inside one unit, on a fixed-size subsample of M = min(8000, pairs at d=8) pairs per distance", null: "within-unit" },
  { id: "initEnt", statement: "entropy (bits) of the rank-bin distribution of unit-initial tokens (units of >= 2 tokens)", null: "within-unit" },
  { id: "finEnt", statement: "entropy (bits) of the rank-bin distribution of unit-final tokens (units of >= 2 tokens)", null: "within-unit" },
  { id: "edgeGap", statement: "mean over units of >= 2 tokens of [ln rank(final) - ln rank(initial)] / ln V (V = types in the half); > 0 = units start frequent, end rarer", null: "within-unit" },
];
export const PREDICT = {
  divSlope: "universal+",
  condR: "universal-",
  condL: "universal-",
  rigidL: "universal+",
  rigidR: "universal+",
  sameL: "specific",
  sameR: "specific",
  asym: "specific",
  miDecay: "universal+",
  initEnt: "universal-",
  finEnt: "universal-",
  edgeGap: "specific",
};
export const compute = (view) => computeComp(view);
export { miProfile } from "./_comp_core.mjs";
