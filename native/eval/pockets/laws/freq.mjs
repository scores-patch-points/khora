// eval/pockets/laws/freq.mjs — FAMILY "freq": the FREQUENCY STRUCTURE of a pocket (rank-frequency, vocabulary growth, diversity, length-frequency, unit-length shape).
// Observables only: counts, ranks, positions, recurrence, string lengths in code points, unit lengths. No capitals, POS, word lists, stop-word lists or speaker names.
//
// THE LAWS IN WORDS (what each statistic is a law about)
//  zipfAlpha   a contiguous stretch of N tokens obeys a rank-frequency power law; the exponent alpha (fitted by least squares in log-log on 30 log-spaced ranks in 10..300 of every
//              10,000-token block, mean over blocks) is a constant of the pocket, and contiguity (topic, burst) bends it relative to a random sample of the same tokens.
//  heapsBeta   vocabulary grows as N^beta; beta is fitted inside every 5,000-token doc-order block on the fixed grid n = 250, 500, 1000, 2000, 4000 (mean over blocks).
//  ttr         type-token ratio at fixed N = 5,000 (mean over doc-order blocks).
//  hapaxShare  share of the block's types that occur exactly once, at fixed N = 5,000.
//  rankBinEnt  Shannon entropy (bits) of the token mass over octaves of within-block rank (rank 1, 2-3, 4-7, ...), fixed N = 5,000.
//  abbrev      Zipf's law of abbreviation: Spearman rho(count, character length) over the 500 commonest types (negative = frequent words are shorter).
//  menzerath   Menzerath's law: Pearson r(ln unit length, mean character length of the unit's words); negative = longer units are made of shorter words.
//  recurLen    standardised mean-length difference (code points, Cohen-d style) between tokens whose word occurred in the previous 20 tokens of the same document and the rest. Its null value is
//              negative wherever frequent words are short (chance recurrence is carried by frequent words); z > 0 means recurrence in excess of exchangeable chance is carried by LONGER words, OR is
//              spread over more types than chance recurrence (planted pl-burst, whose string lengths are independent of frequency, gives z = +39 for that second reason): z reads "excess recurrence
//              is not carried by the same short types as chance recurrence", not "long words recur" alone.
//  lenAcf1     discourse rhythm: lag-1 autocorrelation of ln(unit length) between adjacent units of one document.
//  lenDocEps   documents differ in unit length: epsilon-squared (bias-corrected eta-squared) of ln(unit length) on document.
//  lenCV       shape of the unit-length distribution: coefficient of variation of unit length (a constant; see INERT).
//  lenLogSkew  shape of the unit-length distribution: skewness of ln(unit length) (0 = lognormal; a constant; see INERT).
//
// WHY THESE NULLS (at most two kinds used: token-global, unit-order)
//  Block statistics (zipfAlpha, heapsBeta, ttr, hapaxShare, rankBinEnt) and recurLen: TOKEN-GLOBAL. The stream is cut into FIXED-N blocks in document order. A token-global shuffle keeps the
//   pocket's lexicon and unigram law exactly and makes every block an exchangeable random sample of it, so the null mean is "the value for a text with this vocabulary and no
//   contiguity". The z therefore tests a real law: contiguous text is NOT an exchangeable sample of its own vocabulary (topic and burst clustering). The within-unit null would leave
//   every block nearly identical (blocks are made of the same units), z ~ 0 for the wrong reason; unit-order keeps each unit whole and would only see clustering above the unit.
//   The raw v is itself a size-free constant (fixed N), so the atlas's constant-varies analysis reads real between-pocket differences of alpha, ttr, hapax share.
//  menzerath: TOKEN-GLOBAL (tokens move between units, unit lengths stay): under it tokens are exchangeable across units, so r ~ 0 and sd ~ 1/sqrt(units): the right law-free world.
//  lenAcf1, lenDocEps: UNIT-ORDER (units stay whole, their order across documents is destroyed): the law-free expectation of both is 0 by construction (eps-squared is bias-corrected).
//  INERT (honest, by construction): abbrev, lenCV, lenLogSkew depend only on unigram counts, string lengths and the multiset of unit lengths. All three shuffle nulls keep those, so
//   nullSd = 0 and the atlas z is undefined (null). They are reported as CONSTANTS (v) and can never be PRESENT/ABSENT in the atlas. The law-free null for abbreviation is "string
//   lengths permuted over types", which no harness null provides; tests/freq/ computes that permutation null separately. Assigned token-global (no extra null draws).
//
// SIZES AND LIMITS (null = "undefined for this half", never NaN): block statistics need >= 5,000 tokens in the half (zipfAlpha >= 10,000 and >= 300 types in a block); abbrev needs >= 500 types;
//  menzerath/lenCV/lenLogSkew/lenAcf1 need >= 30 units (lenAcf1 >= 30 same-document adjacent pairs); lenDocEps needs >= 2 documents; recurLen needs >= 30 tokens in each group. A constant series gives null
//  (exact test, no float residue). Lengths are code points (surrogate pairs counted once): verified identical on Latin, Cyrillic, CJK and astral-plane renderings of the same text.
//  Measured cost: ~35 ms CPU per call at 150,000 tokens (budget 700 ms). Tests: tests/freq/ (results-*.json, summary.json).
//
// BLIND PREDICT (fixed before any statistic was computed on any data; sha256 of the frozen JSON is stored in tests/freq/predict-frozen.json)
//  zipfAlpha  universal-  burstiness makes mid-rank counts higher in a contiguous block than in a random sample: flatter slope, alpha below null. Effect small, noise ~ blocks: moderate confidence.
//  heapsBeta  specific    sign and size uncertain (gap between contiguous and random vocabulary may widen or not with n); small effect: only the larger pockets will reach |z| >= 4 in both halves.
//  ttr        universal-  a contiguous 5,000-token block repeats topical words, so it has fewer types than a random 5,000 sample of the same tokens: large, robust effect.
//  hapaxShare universal-  clustering moves would-be singletons to 0 or >= 2 occurrences, shrinking the hapax share of types.
//  rankBinEnt specific    the octave masses are near uniform, entropy is second-order sensitive: effect small, sign unsure.
//  abbrev     absent      z undefined by construction (INERT); the underlying law is expected nearly everywhere in natural-language pockets but is untestable by this harness.
//  menzerath  specific    expected negative in sentence pockets (function words scale with length) but chat, code lines and fragments can flip it: sign reverses by pocket type.
//  recurLen   universal+  chance recurrence is carried by frequent short words; real local recurrence adds bursty content words, which are longer: excess positive.
//  lenAcf1    specific    adjacent-unit length persistence in discourse-ordered pockets (books, chat); absent where units are shuffled sentences or independent items.
//  lenDocEps  universal+  documents (chapters, files, days) differ in unit length more than chance; fails only where documents are arbitrary blocks.
//  lenCV      absent      z undefined by construction (INERT).
//  lenLogSkew absent      z undefined by construction (INERT).
import { blockStats } from "./_freq_blocks.mjs";
import { prep, typeAndUnitStats } from "./_freq_misc.mjs";

export const FAMILY = "freq";
export const STATS = [
  { id: "zipfAlpha", statement: "Zipf exponent alpha = -slope of ln count on ln rank, 30 log-spaced ranks in 10..300, every 10,000-token doc-order block, mean over blocks; null: random sample of the pocket's own tokens", null: "token-global" },
  { id: "heapsBeta", statement: "Heaps exponent: slope of ln V(n) on ln n at n = 250,500,1000,2000,4000 inside every 5,000-token doc-order block, mean over blocks", null: "token-global" },
  { id: "ttr", statement: "type-token ratio of a 5,000-token doc-order block, mean over blocks (contiguous text repeats vocabulary more than a random sample: negative z)", null: "token-global" },
  { id: "hapaxShare", statement: "share of a 5,000-token block's types that occur once in the block, mean over blocks", null: "token-global" },
  { id: "rankBinEnt", statement: "entropy (bits) of the token mass over octaves of within-block rank (rank 1, 2-3, 4-7, ...), 5,000-token blocks, mean over blocks", null: "token-global" },
  { id: "abbrev", statement: "Zipf law of abbreviation: Spearman rho of type count against code-point length over the 500 commonest types [INERT: shuffle-invariant, z undefined, read v]", null: "token-global" },
  { id: "menzerath", statement: "Menzerath: Pearson r of ln(unit length in tokens) with the unit's mean word length in code points, over units", null: "token-global" },
  { id: "recurLen", statement: "standardised mean length difference (code points) between tokens recurring within the previous 20 tokens of the same document and the others", null: "token-global" },
  { id: "lenAcf1", statement: "lag-1 Pearson autocorrelation of ln(unit length) between adjacent units of the same document", null: "unit-order" },
  { id: "lenDocEps", statement: "epsilon-squared (bias-corrected eta-squared) of ln(unit length) on document", null: "unit-order" },
  { id: "lenCV", statement: "coefficient of variation (sd/mean) of unit length in tokens [INERT: shuffle-invariant, z undefined, read v]", null: "token-global" },
  { id: "lenLogSkew", statement: "skewness of ln(unit length) (0 for a lognormal) [INERT: shuffle-invariant, z undefined, read v]", null: "token-global" },
];
export const INERT = ["abbrev", "lenCV", "lenLogSkew"];
export const PREDICT = {
  zipfAlpha: "universal-", heapsBeta: "specific", ttr: "universal-", hapaxShare: "universal-", rankBinEnt: "specific", abbrev: "absent",
  menzerath: "specific", recurLen: "universal+", lenAcf1: "specific", lenDocEps: "universal+", lenCV: "absent", lenLogSkew: "absent",
};

/** compute(view) -> {[statId]: number|null}; deterministic; single pass per part, typed arrays, no randomness. */
export function compute(view) {
  const P = prep(view);
  return { ...blockStats(P), ...typeAndUnitStats(P) };
}
