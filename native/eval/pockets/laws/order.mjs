// eval/pockets/laws/order.mjs — FAMILY "order": ORDER AND INFORMATION FLOW INSIDE A UNIT (where rare words sit, which way function words lean, how far apart same-class tokens stand,
// what a unit starts and ends with, how predictable the next token is as the unit unrolls, how directional the rank-class flow is).
// Observables only: frequency ranks, positions, unit boundaries, unit lengths, neighbours, counts. No capitals, POS, word lists, stop lists, treebank labels or speaker names.
// Vocabulary of the family (all defined by within-view frequency RANK, never by a list): x(t) = ln of the MID-RANK of type t (ties in count share the average rank; mid-rank 1 = commonest);
//  rank BIN of t = floor(log2 mid-rank) (octaves of rank: 1 | 2-3 | 4-7 | ...); HEAD = mid-rank <= K with K = min(400, max(10, round(0.05 V))) (the top 5% of types by rank, V = types in the view);
//  CONTENT = mid-rank > 4K; i = position in a unit of L tokens, relative position i/(L-1) in [0,1]. Statistics are pooled over units; units too short for a statistic are skipped (stated below).
//
// THE LAWS IN WORDS
//  rareSlope  do rare words come later? pooled within-unit Pearson correlation of x with relative position (units >= 3 tokens). > 0 rarer words later, < 0 earlier.
//  rareCurve  shape of that curve: pooled within-unit correlation of x with the centred quadratic (i/(L-1) - 1/2)^2. > 0 U-shape (rare words at both edges), < 0 inverted U (frequent edges, rare middle).
//  fnBefore   functional-before-content: among CONTENT tokens with both neighbours in the unit, P(left neighbour is HEAD) - P(right neighbour is HEAD). > 0 head words stand before content (prepositional
//             order), < 0 after it (postpositional order); range [-1,1].
//  depLen     dependency-length proxy: ln(observed / chance) of the mean distance between SUCCESSIVE tokens of the same rank bin inside a unit (units >= 3). Chance = (L+1)/(m+1) per gap (m tokens of the bin).
//             > 0 same-class tokens stand further apart than chance (spacing / alternation), < 0 closer (clustering, lists, repetition).
//  initDev    unit-initial deviation: mean over units (>= 3 tokens) of (x of first token - unit mean x) / sd(x). < 0 units open with frequent tokens.
//  finalDev   unit-final deviation: the same for the last token. > 0 units close on rarer tokens, < 0 on frequent ones (particles, auxiliaries).
//  surprGrow  surprisal growth: pooled within-unit correlation, over tokens 1..L-1 (units >= 4), of g = [-ln((c(a,b)+1)/(c(a)+V))] - [-ln((c(b)+1)/(N+V))] with relative position, where (a,b) = (previous, current)
//             token, c = IN-SAMPLE counts of the view only, add-one smoothing. The unigram surprisal is subtracted so that the law concerns context, not rarity (rareSlope owns rarity). > 0: later
//             tokens are less predictable from their predecessor than early ones.
//  entSlope   monotone positional entropy: (H(last third) - H(first third)) / H(pooled), H = Shannon entropy (nats, Miller-Madow) of the rank-bin distribution at that third of the unit (units >= 3,
//             fractional assignment of tokens to thirds so each third holds exactly sum(L)/3 token mass). > 0 the end is richer than the start.
//  entCurv    U-shaped positional entropy: (H(middle) - mean(H(first), H(last))) / H(pooled). > 0 the middle is the richest (edges specialised), < 0 U-shape (edges richer than the middle).
//  branch     binary-branching proxy: ln(R2/R1), R_k = sum (x[i+k]-x[i])^2 / (2 sum (L-k) S^2) with S^2 the unit's sample variance of x (R_k = 1 exactly in expectation for a shuffled unit).
//             < 0: lag-2 neighbours are more alike than lag-1 neighbours (alternation, period-2 class structure, binary branching); > 0: lag-1 more alike (smooth local rank).
//  asym       word-order flexibility (reported as rigidity): over unordered rank-bin pairs {a,b}, a != b, with S = c(a,b)+c(b,a) >= 20 adjacent occurrences, D = c(a,b)-c(b,a):
//             asym = sum (D^2/S - 1) / sum S, the mass-weighted mean squared directional asymmetry with its sampling noise removed (E = 0 for a symmetric flow). 0 = free order, 1 = fully one-way.
//
// WHY THIS NULL: ONE KIND, WITHIN-UNIT, FOR ALL ELEVEN (the family states laws about the ARRANGEMENT of tokens inside units). The within-unit shuffle keeps every unit's bag of tokens, hence the unit
//  length, the unigram counts, every rank, rank bin, the head and content sets, and every bag-level effect (longer units hold rarer words; a unit's own repeated words), and it destroys exactly the claimed
//  thing, the order. Each statistic is also built so that its EXPECTATION under that shuffle is 0 (or exactly 1 for the ratios) for ANY unit-length distribution and vocabulary, so a law-free text has
//  v ~ 0 and not only z ~ 0: the correlations and deviations are centred inside each unit (rareSlope, rareCurve, initDev, finalDev, surprGrow); depLen uses the exact order-statistic expectation
//  (L+1)/(m+1); branch divides by the exact finite-population expectation 2(L-k)S^2; asym subtracts the exact binomial noise (E[D^2 | S] = S under reversal symmetry, which the shuffle has); the entropies
//  use fractional thirds with equal mass. A token-global shuffle would also break the bags (random bags have no length-rank link, no unit-level repetition), turning every statistic into a test of "units are
//  not random bags"; a unit-order shuffle leaves all within-unit order intact, so it is not a null for any of these. surprGrow re-counts bigrams inside the shuffled view, so nothing from the real
//  arrangement leaks into the null draws, and in-sample counts (the token's own bigram is counted) are identical in the real and the null view.
//
// BLIND PREDICT (frozen BEFORE any statistic was computed on any data: tests/order/predict-frozen.json holds the sha256 of this table). Vocabulary: the protocol's four states; a pattern that would be
// MAJORITY (60-85% present) is written as the state it is closest to, with the rationale saying so.
//  rareSlope  specific    given-before-new puts rare words late in head-initial pockets (English, Romance); head-final pockets (Japanese, Korean, Turkish, Hindi) close on frequent particles and auxiliaries.
//  rareCurve  universal-  function words cluster at BOTH edges (openers, closers/particles), content in the middle: inverted U; I expect >= 85%.
//  fnBefore   specific    prepositions/articles stand before content in head-initial pockets (+) and postpositions/particles after it in head-final pockets (-): the sign follows typology (reversal possible).
//  depLen     universal+  repetition of a rank class is avoided at short range (no "the the", phrase structure puts the next determiner/preposition after a content stretch); code and lists may flip.
//  initDev    universal-  units open with closed-class tokens (determiners, pronouns, conjunctions, keywords, discourse markers), commoner than the unit average.
//  finalDev   specific    head-initial pockets end on content (+), head-final pockets end on auxiliaries and particles (-); chat and code mixed.
//  surprGrow  specific    sentence openers are formulaic (low surprisal early) so growth > 0 where openers dominate, but head-final closers (verb + auxiliary) are formulaic too and can flip it.
//  entSlope   specific    follows the same head-initial / head-final split as rareSlope and finalDev.
//  entCurv    universal+  any positional specialisation of the edges (in opposite directions) leaves the middle closest to the pooled mixture, hence the richest: concavity of entropy (MAJORITY at worst).
//  branch     universal-  closed-class / open-class alternation (period-2 structure) makes lag-2 neighbours more alike than lag-1 neighbours in almost every ordered pocket; flat in bag-like pockets.
//  asym       universal+  rank-class flow is directional (function -> content, content -> function) in every pocket with real order; only shuffled-bag pockets would be absent.
import { prep } from "./_order_prep.mjs";
import { posStats } from "./_order_pos.mjs";
import { pairStats } from "./_order_pair.mjs";

export const FAMILY = "order";
const N = "within-unit";
export const STATS = [
  { id: "rareSlope", statement: "pooled within-unit Pearson correlation of x = ln mid-rank of the token's type with relative position i/(L-1), units >= 3 tokens; > 0 rarer words come later", null: N },
  { id: "rareCurve", statement: "pooled within-unit correlation of x with the centred quadratic (i/(L-1)-1/2)^2, units >= 3; > 0 rare words at both edges (U), < 0 rare words in the middle", null: N },
  { id: "fnBefore", statement: "among content tokens (mid-rank > 4K, K = top 5% of types) with both neighbours in the unit, P(left neighbour is head, mid-rank <= K) - P(right neighbour is head)", null: N },
  { id: "depLen", statement: "ln(observed / chance) of the mean distance between successive tokens of the same log2 rank bin within a unit (chance (L+1)/(m+1) per gap), units >= 3", null: N },
  { id: "initDev", statement: "mean over units >= 3 tokens of (x of the first token - unit mean x) / sd(x)", null: N },
  { id: "finalDev", statement: "mean over units >= 3 tokens of (x of the last token - unit mean x) / sd(x)", null: N },
  { id: "surprGrow", statement: "pooled within-unit correlation with relative position of g = add-one in-sample bigram surprisal minus add-one unigram surprisal, tokens 1..L-1 of units >= 4", null: N },
  { id: "entSlope", statement: "(H(last third) - H(first third)) / H(pooled) of the rank-bin distribution by relative position (fractional thirds, Miller-Madow), units >= 3", null: N },
  { id: "entCurv", statement: "(H(middle third) - mean(H(first), H(last))) / H(pooled), same estimator; > 0 middle richest (edges specialised), < 0 U-shaped", null: N },
  { id: "branch", statement: "ln(R2/R1), R_k = sum_u sum_i (x[i+k]-x[i])^2 / (2 sum_u (L-k) S_u^2); < 0 lag-2 neighbours more alike than lag-1 (alternation / binary branching)", null: N },
  { id: "asym", statement: "sum (D^2/S - 1) / sum S over unordered rank-bin pairs with S = c(a,b)+c(b,a) >= 20, D = c(a,b)-c(b,a): de-biased directional asymmetry of adjacent rank-bin pairs (0 = free order)", null: N },
];
export const PREDICT = {
  rareSlope: "specific", rareCurve: "universal-", fnBefore: "specific", depLen: "universal+", initDev: "universal-", finalDev: "specific",
  surprGrow: "specific", entSlope: "specific", entCurv: "universal+", branch: "universal-", asym: "universal+",
};

const NONE = Object.fromEntries(STATS.map((s) => [s.id, null]));
/** compute(view) -> {[statId]: number|null}; deterministic (no rng, no clock); typed arrays, single passes; view.id is never read. */
export function compute(view) {
  const P = prep(view);
  if (P.N < 2000 || P.V < 30) return { ...NONE };
  const r = { ...NONE, ...posStats(P), ...pairStats(P) };
  for (const k of Object.keys(r)) if (!Number.isFinite(r[k])) r[k] = null; // never NaN / Infinity: undefined is null
  return r;
}
