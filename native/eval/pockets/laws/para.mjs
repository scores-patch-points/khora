// eval/pockets/laws/para.mjs — FAMILY "para": REPETITION ACROSS UNITS AND FORMULAIC STRUCTURE (parallelism, refrains, formulas, templates, duplicates).
// Observables only: token identity, positions inside a unit, unit boundaries, document boundaries, counts and frequency rank bins (log2 of the within-view mid-rank). No capitals, POS, word lists,
// stop-word lists, speaker names. Everything is computed on the view it is given (one document half); no pocket id is used.
//
// THE LAWS IN WORDS (what each statistic is a law about)
//  adjNg2/3/4  ADJACENT-UNIT n-GRAM ECHO: how often unit u re-uses the word n-grams (n = 2, 3, 4) of the unit just before it. v = POOLED COLLISION RATE over adjacent same-document pairs with both units
//              >= n tokens: (shared distinct n-grams) / sum of |S_u| * |S_{u-1}| = P(a random distinct n-gram of u equals a random distinct n-gram of u-1). Its null expectation is the lexicon's n-gram
//              collision probability, NOT a function of unit length (the mean-share version of this statistic had a null mean that grew with unit length, Spearman 0.98, and was replaced).
//              n = 2 mostly sees topic and names, n = 4 sees parallelism and quotation.
//  prefixCopy  ANAPHORA: P(a unit begins with the same 2 tokens as the previous unit), over same-document adjacent pairs of units with len >= 2.
//  suffixCopy  EPIPHORA: the same for the last 2 tokens.
//  posPar      POSITIONAL PARALLELISM: mean over unit offsets k = 0..7 of P(token at offset k of u == token at offset k of u-1) over adjacent same-document pairs where both units are longer than k.
//  lcsLift     ORDERED PARTIAL PARALLELISM: ln( mean Dice ratio 2*LCS/(la+lb) of adjacent units / the same for a far partner unit of identical (capped) length ), on a fixed stride sample of <= 4000
//              pairs, units cut to their first 24 tokens. > 0 = adjacent units share ordered subsequences beyond what their lengths and the vocabulary give.
//  lagDecay    DECAY OF THE ECHO WITH UNIT LAG: relative slope (per doubling of the lag, divided by the mean rate) of the bigram-echo rate on log2(lag), lags 1,2,4,8,16,32 (lags with >= 100 units only,
//              >= 4 lags, >= 30 hits). < 0 = repetition is local and fades with distance; ~0 = no memory of position.
//  refrain     REFRAIN: share of units of len >= 3 whose exact token sequence occurs at least twice in the view.
//  dupShare    DUPLICATION: share of units (any length) whose exact token sequence already occurred in an earlier unit.
//  formulaCov  FORMULA COVERAGE: share of the tokens of units of len >= 4 covered by within-unit 4-grams that occur >= 3 times in the view.
//  tmplReuse   TEMPLATE REUSE: share of units of len >= 4 whose sequence of frequency-rank bins (octaves of the view's mid-rank) over their first min(len, 5) tokens is shared with at least one other
//              unit that has a DIFFERENT multiset of tokens (same skeleton, other words; verbatim repeats and mere re-orderings of the same words do not count: otherwise the within-unit null, which
//              re-orders the copies of a repeated unit, would manufacture skeleton recurrences). For units of 4-5 tokens this is the
//              whole unit; for longer units it is the opening skeleton, because whole-unit skeleton recurrence of 15-token sentences is ~0 in any text and its null z is unreliable.
//
// WHY THESE NULLS (two kinds: unit-order, within-unit)
//  adjNg2/3/4, prefixCopy, suffixCopy, posPar, lcsLift, lagDecay: UNIT-ORDER. They are laws about which unit stands NEXT to which. The unit-order shuffle keeps every unit whole (same lengths, same
//   n-grams, same first/last tokens, same token-by-offset distributions, same unit multiset) and re-deals the units to random places, so a text in which neighbours are exchangeable gives the null mean
//   exactly. Within-unit shuffling would be wrong: it would also destroy position-bound syntax (unit-initial function words), turning "parallelism" into "units have a frame". Token-global would
//   destroy the units themselves. Length-correlated neighbours must not leak into the statistics, so they are pair rates (prefixCopy, suffixCopy, posPar offset by offset), ratio-of-sums collision
//   rates whose expectation is proportional to the weights (adjNg2/3/4, lagDecay) or compared with a length-matched far partner (lcsLift); tests/para checks the null on worlds whose unit lengths
//   are autocorrelated (AR(1), rho 0.7 and 0.9) while the tokens are iid.
//  refrain, dupShare, formulaCov, tmplReuse: WITHIN-UNIT. They are bag-of-units statistics, so the unit-order shuffle (which leaves the set of units unchanged) would give null sd = 0 for all four.
//   They state that the ORDER of tokens inside units is re-used: the same word string, the same whole unit, the same skeleton recurs more than the unit's own bag in random order would give.
//   The within-unit shuffle keeps every unit's bag (so unit lengths, the length-vocabulary coupling of Menzerath type, topical bags and bag-level duplicates all stay in the null) and destroys the
//   order. The token-global null (tried first, see KNOWN LIMITS) also moves tokens between units, so any coupling between unit length and vocabulary (long units made of frequent words) looked like
//   formula coverage (planted pl-length, a world with no order structure: z +5.8 / +5.4 in both halves), and its null refrain / duplicate counts were exactly 0 in most real pockets (z undefined).
//   The null mean is NOT zero (short units re-shuffle into themselves), which is why z, not v, is the law-level object. Sparse-null caveat: where the null has ~0 events in every draw (refrain in
//   long-unit prose) the null sd can be 0 and the atlas z is null; read v against nullMean then.
//
// BLIND PREDICT (written and hashed BEFORE any para statistic was computed on any data; sha256 stored in tests/para/predict-frozen.json). Vocabulary: universal+ / universal- / specific / absent.
//  adjNg2      universal+  neighbours share bigrams (names, topic words, repeated stock phrases) more than random units in nearly every ordered pocket; sentence-shuffled treebanks would be the exceptions.
//  adjNg3      specific    trigram echo needs real parallelism or quotation: chat replies, code, liturgy, legal formulas, verse; ordinary expository prose gives ~0 excess.
//  adjNg4      specific    same, stricter; 4-gram echo between neighbours is rare outside formulaic pockets.
//  prefixCopy  specific    anaphora (same opening two words) is a register effect: lists, verse, liturgy, code, chat; absent in treebank and narrative sentences.
//  suffixCopy  specific    epiphora and shared endings are rarer than anaphora and tied to lists / refrains / code lines.
//  posPar      universal+  structural priming and run-length persistence of the opening words make same-offset identity above random pairs in ordered text (tiny null sd at 100k tokens).
//  lcsLift     specific    shared ordered subsequences beyond length-matched far pairs exist where echo is strong; the lift is a few percent in prose and would not clear |z| >= 4 in both halves.
//  lagDecay    specific    the fade of the echo with lag needs documents with >= 17 units and a clear echo; many pockets will return null or ~0.
//  refrain     specific    verbatim repeated multiword units cluster in liturgy, lyrics, code, chat boilerplate and legal text; unique-sentence treebanks and prose are absent.
//  dupShare    universal+  short fixed utterances (yes, thank you, headings, one-line statements) recur more than exchangeable tokens give; nearly every pocket has some.
//  formulaCov  universal+  every natural pocket reuses multiword strings (>= 3 times a 4-gram) while the token-global null has almost none; morphologically rich small pockets are the likely misses.
//  tmplReuse   universal+  function-word skeletons recur far above exchangeable tokens in every grammatical text (the skeleton is syntax made visible in frequency ranks alone).
//
// CHANGES AFTER THE FREEZE (honest record; the PREDICT table was never touched; its rationale for formulaCov still says token-global because that was the first null tried; sha256 in tests/para/predict-frozen.json)
//  1. refrain, dupShare, formulaCov, tmplReuse: null token-global -> within-unit. Reason (tests/para/diag-bag-null.json): planted pl-length (a world with no order structure, Menzerath coupling of unit length and
//     vocabulary) gave formulaCov z +5.8 / +5.4 in both halves under token-global and -0.2 / -0.9 under within-unit; and the token-global null counts of refrain / duplicate units were exactly 0 in the
//     real texts tried (Dracula refrain, Quran refrain / dupShare / tmplReuse: z undefined) while the within-unit null was positive and gave z.
//  2. adjNg2/3/4: first version = mean over units of the share of the unit's n-grams found in the previous unit; its law-free null mean grew with mean unit length (Spearman 0.98 for n = 2, 0.73 for n = 3
//     over six length worlds). Replaced by the pooled collision rate (length-free null mean: Spearman 0.27 / 0.67).
//  3. tmplReuse: first version = whole-unit rank-bin sequence for units of len >= 5 with a "different tokens" criterion. Its null was ~0-5 events (z 3.5 and 6.0 on a law-free iid world), and the
//     within-unit null manufactured "different-token" recurrences from re-shuffled copies of repeated units (world with verbatim refrains: z -54). Now: first min(len, 5) tokens, units len >= 4,
//     "different multiset of tokens of the WHOLE unit" (refrain world: z +1.2). A prefix copy (anaphora) with a different rest also counts as template reuse (planted pl-parallel: z +51 / +32).
//  4. compute() rounds every value to a multiple of 2^-40: ten identical raw doubles have a non-zero sd after sum / 10 in 60% of cases (12028 of 20000 tried), which turns a constant null into garbage z
//     (a z of 1e13 appeared once in the 20-rep iid calibration for refrain). Now identical draws give sd = 0 exactly and z = null.
// KNOWN LIMITS (all measured in tests/para; see summary.json)
//  - SPARSE NULLS. refrain, dupShare, formulaCov, adjNg3, adjNg4 (and tmplReuse in small pockets) have a null of ~0 events. Where all 10 null draws are equal the atlas z is null (law-free iid worlds: 280 of
//    2880 cells; long-unit prose: formulaCov / refrain in a half-size pocket can go either way) and where a few draws are nonzero the z is huge (hundreds to > 1000) and rests on 10 noisy draws. Read v
//    against nullMean when z is null. For a pocket where the cell is z-null the law is neither PRESENT nor ABSENT by the protocol.
//  - Calibration on 240 law-free iid halves (4 world types, 20-60 reps): |z| >= 4 in 0.50% of 2600 defined cells (t9 reference 0.3%), |z| >= 2 in 8.8% (7.7%); sd(z) 1.0-1.25 (t9: 1.13). A single
//    |z| in 2-4 is weak evidence; the protocol's both-halves rule makes false PRESENT cells rare (about 0.5%^2 = 3e-5 per statistic and pocket).
//  - The raw v of refrain (rho -0.76), dupShare (-0.84), tmplReuse (-0.76) against mean unit length and of formulaCov against token count (0.78) are functions of length or size in law-free worlds: for
//    these four read v - nullMean or z, never v. adjNg2, prefixCopy, suffixCopy, posPar, lcsLift, lagDecay have |rho| < 0.7 (z and v) against length and size in law-free worlds.
//  - lcsLift and posPar are the noisiest adjacency statistics (sd(z) 1.25, 1 and 3 of 240 law-free cells at |z| >= 4); lcsLift uses only the first 24 tokens of units and a stride sample of 4000 pairs.
//  - adjNg2/3/4 need >= 50 same-document adjacent pairs; lagDecay needs >= 4 of the lags 1,2,4,8,16,32 with >= 100 pairs each and >= 30 shared bigrams (documents of 25 units give lags 1-16) and is null otherwise.
//  - A pocket whose units are shuffled sentences (no adjacency) is the unit-order null itself: all eight adjacency statistics then sit at z ~ 0 (planted pl-null, pl-length, lenworld checks), as intended.
//  - Unit-order shuffles move units across documents, so doc-level topic is part of what the adjacency statistics call "echo" (n = 2 mostly topic and names; n = 4 and prefixCopy mostly parallelism).
//  - Cost: 0.06-0.19 s CPU per compute() on 150,000 tokens (3 token-length regimes, one-token units to 40-token units); the atlas run of two planted pockets took 1.1-1.2 s per pocket.
import { prep } from "./_para_prep.mjs";
import { adjStats } from "./_para_adj.mjs";
import { lcsLift } from "./_para_lcs.mjs";
import { bagStats } from "./_para_bag.mjs";

export const FAMILY = "para";
export const STATS = [
  { id: "adjNg2", statement: "pooled bigram collision rate of adjacent same-document units (both len >= 2): shared distinct bigrams / sum of |S_u||S_prev|, i.e. P(random distinct bigram of u = random distinct bigram of the previous unit)", null: "unit-order" },
  { id: "adjNg3", statement: "the same pooled collision rate for trigrams (both units len >= 3)", null: "unit-order" },
  { id: "adjNg4", statement: "the same pooled collision rate for 4-grams (both units len >= 4)", null: "unit-order" },
  { id: "prefixCopy", statement: "P(unit begins with the same 2 tokens as the previous unit of its document), pairs with both len >= 2", null: "unit-order" },
  { id: "suffixCopy", statement: "P(unit ends with the same 2 tokens as the previous unit of its document), pairs with both len >= 2", null: "unit-order" },
  { id: "posPar", statement: "mean over offsets 0..7 of P(same token at the same offset in adjacent same-document units), pairs where both units are longer than the offset", null: "unit-order" },
  { id: "lcsLift", statement: "ln of mean Dice-LCS ratio of adjacent units over that of length-matched far partners (stride sample <= 4000 pairs, first 24 tokens per unit)", null: "unit-order" },
  { id: "lagDecay", statement: "relative slope per doubling of the unit lag of the bigram-echo rate at lags 1,2,4,8,16,32 (slope of rate on log2 lag over the mean rate); negative = echo fades with lag", null: "unit-order" },
  { id: "refrain", statement: "share of units with len >= 3 whose exact token sequence occurs at least twice in the view", null: "within-unit" },
  { id: "dupShare", statement: "share of units (any length) that are exact duplicates of an earlier unit of the view", null: "within-unit" },
  { id: "formulaCov", statement: "share of the tokens of units with len >= 4 covered by within-unit 4-grams occurring >= 3 times in the view", null: "within-unit" },
  { id: "tmplReuse", statement: "share of units with len >= 4 whose rank-bin sequence (octave of within-view mid-rank) over their first min(len,5) tokens is shared with a unit that has a different multiset of tokens", null: "within-unit" },
];
export const PREDICT = {
  adjNg2: "universal+", adjNg3: "specific", adjNg4: "specific", prefixCopy: "specific", suffixCopy: "specific", posPar: "universal+",
  lcsLift: "specific", lagDecay: "specific", refrain: "specific", dupShare: "universal+", formulaCov: "universal+", tmplReuse: "universal+",
};
export function compute(view) {
  const P = prep(view), out = {};
  if (P.nU < 2) return Object.fromEntries(STATS.map((s) => [s.id, null]));
  Object.assign(out, adjStats(P), bagStats(P)); out.lcsLift = lcsLift(P);
  // Values are rounded to a multiple of 2^-40 (about 1e-12): ten identical null draws then sum and average EXACTLY in the atlas (sd = 0, z = null) instead of leaving float dust whose sd of ~1e-19 gives garbage z.
  for (const s of STATS) { const x = out[s.id]; out[s.id] = Number.isFinite(x) ? Math.round(x * 1099511627776) / 1099511627776 : null; }
  return out;
}
