// eval/pockets/laws/fig.mjs — FAMILY "fig": laws about FIGURES, the recurring forms that behave like referents or names.
// Observables only: unit distances between tokens of one type, positions in units, frequency-rank bins, unit lengths. No capitals, POS, treebank labels, word lists, stop-word lists or speaker names.
// DEFINITION (fixed, deterministic): a FIGURE TOKEN is a token whose type has another token within 127 units (the same unit counts as distance 0), i.e. its type has >= 2 tokens in some sliding window of
//  128 consecutive units that contains it (document boundaries are ignored: a window is 128 consecutive units of the view). A BIRTH is a figure token with no same-type token in the 127 units before it
//  (the opening of an episode of recurrence). Frequent function words are figures too: they are the chance background, and every law below is read as an excess over a null world, never as a raw level.
//
// THE LAWS IN WORDS (what each statistic is a law about)
//  figShare     figures are a big share of the stream, and referents persist: a type that appears recurs within 128 units more often than a text with no discourse order would give.
//  arrival      new figures arrive at a rate: births per 1000 tokens (episodes of recurrence opening), counted where a full 127-unit window exists on both sides (units 127..U-128); topical clustering opens more, shorter episodes.
//  persist      figures have a persistence half-life: the interpolated median, over births, of the span (units) from the first mention to the last mention still inside the 128-unit window.
//  crpTheta     the concentration of a Chinese restaurant process that reproduces the number of distinct figures: in every aligned block of 128 units take the first 100 figure tokens (tokens whose type has
//               >= 2 tokens inside the block), count the F distinct types among them, and solve E[tables] = theta*(psi(theta+100) - psi(theta)) = F; the statistic is the mean over blocks of log2(theta).
//               Fixed n = 100 makes theta free of the number of tokens per window (raw theta at n = N_f scaled with unit length). Large = many distinct figures each mentioned few times; small = a few
//               figures hold most mentions (rich get richer). It is a monotone function of distinct-figures per 100 figure mentions.
//  fano         figure clustering: the dispersion (Pearson chi-square per degree of freedom) of the figure share across aligned 128-unit blocks; 1 = binomial; > 1 = episodic, some stretches dense in figures.
//  introLeft    INTRODUCTION FRAME: the company of the FIRST occurrence of a type that goes on to recur versus the first occurrence of a hapax (type that never recurs), in the same stratum (8 unit-index buckets x
//  introRight   position class on that side x unit-length class). Company = mean rank bin of the 1-2 neighbours on the Left (prefix only: audible at the single mention) or Right side. Value = stratified
//               standardised difference (recurring minus hapax, pooled-sd units, weights n1*n0/(n1+n0)); > 0: recurring types are introduced among RARER neighbours. Rank bins are mid-rank log2 bins of counts.
//  introLeftFq  the same, but frequency-free by STRATIFICATION rather than by claim: events are window openings (no same-type token in the 127 units before); positive = it recurs inside the window,
//               negative = it does not; strata also include the type's own count bin (floor log2 count), so recurrence is compared at equal total frequency (hapax have no positive partner and drop out).
//  initEnrich   vocative-like slot: log2 of (figure tokens that open their unit) / (the number a random position would give, sum over figure tokens of 1/len(unit)); units of one token are skipped.
//  initSplit    unit-initial rigidity: over recurring types (>= 8 figure tokens), the mean of the EXCESS squared deviation of a type's initial share from its chance share, ((obs - exp)^2 - chance variance) / n^2,
//               which is unbiased for the squared deviation of the type's true initial propensity (0 = no position-boundness, no dependence on unit length through the chance floor); large when some types
//               are bound to the slot (vocatives, or function words that never open) and others are barred from it.
//  initFollow   diversity of what follows a unit-initial figure: expected distinct follower TYPES in a random 100 of the follower events / 100 (rarefied, so it is free of the number of events).
//  converge     company convergence: mean over recurring types (>= 12 figure mentions) of [distinct neighbour types (left and right, a unit edge counts as one) among mentions 1-4 (8 slots) minus the same among
//               mentions 9-12 (8 slots)] / 8. > 0 = neighbour diversity falls between first and later mentions; < 0 = the company opens up with use.
//
// WHY THESE NULLS (two kinds only: unit-order, within-unit)
//  unit-order for figShare, arrival, persist, crpTheta, fano. These are laws of DISCOURSE: that a type recurs across units, in episodes. A unit-order shuffle keeps every unit (its bag, its length, repeats
//   inside it) and destroys only the order of units, so the null mean is "what this lexicon and these units give with no discourse"; z is then recurrence BEYOND the unit. A token-global shuffle would also
//   erase within-unit repetition and unit composition and would credit them to the figure law; a within-unit shuffle leaves figure status exactly unchanged (it is a function of unit distances), nullSd = 0, z undefined.
//  within-unit for introLeft, introRight, introLeftFq, initEnrich, initSplit, initFollow, converge. These are laws of ORDER INSIDE THE UNIT (company, slot, frame): a within-unit shuffle keeps every unit's bag,
//   every figure token's figure status and birth status, the strata of the events (unit-index bucket, unit length) and destroys exactly adjacency and position. For initEnrich the null is exact (a figure token
//   opens its unit with probability 1/len), so z is the excess over a text whose units are bags of words. Company bins of unit-mates still enter the null, so what survives is order, not composition.
//
// BLIND PREDICT (written before any statistic was computed on any data; sha256 of the frozen JSON in tests/fig/predict-frozen.json)
//  figShare     universal+  topical and referential persistence at 128 units is in every discourse-ordered text; z grows with size, so only tiny or order-free pockets fail.
//  arrival      universal+  clustering turns isolated mentions of rare types into pairs inside a window (more births) and breaks unbroken chains of mid types into episodes; confidence moderate.
//  persist      universal-  mentions inside a window bunch after the introduction (self-excitation) rather than spreading uniformly, so spans are shorter than the unit-order null.
//  crpTheta     specific    a monotone function of distinct-figures per figure mention; sign depends on whether episodes are sustained (few big figures) or bursty (many small ones): differs by register.
//  fano         specific    needs >= 6 blocks per half and an episodic discourse; the z has to beat the null sd of a ~30-100 block statistic, so only large discourse-ordered pockets reach |z| >= 4 in both halves.
//  introLeft    specific    register-bound company shape (NAME-COMPANY: UD does not transfer to chat, sign and size vary); a frequency confound may inflate it in some pockets.
//  introRight   specific    same, with lookahead.
//  introLeftFq  specific    with own frequency stratified the effect is smaller; present in some pockets, absent in many.
//  initEnrich   universal+  unit-initial slots are filled from a small inventory of recurring forms (pronouns, determiners, vocatives, keywords): excess over 1/len in nearly every pocket with units of >= 2 tokens.
//  initSplit    universal+  recurring types are position-bound (some almost always open a unit, some never): a grammatical rather than a lexical fact, expected in nearly all word-order pockets.
//  initFollow   specific    what follows an opener is constrained by grammar (diversity below unit-mates) in some pockets and open (vocative + free message) in others.
//  converge     specific    sign can reverse: rigid frames converge (+), free use opens the company (-); the shape of the effect depends on the register.
//
// REVISIONS DISCLOSED (made after the first test run on development data: bk-great-expect and bk-origin-species, 17 other books, iid worlds; PREDICT was frozen before and is unchanged, sha256 in tests/fig/predict-frozen.json):
//  (1) initSplit was the rms deviation (its raw value fell with unit length, rho -0.90 over 17 books, because the chance floor of an initial share is 1/len); it is now the excess squared deviation.
//  (2) crpTheta was log2(theta / N_f) with the fit at n = N_f (rho -0.84 with mean unit length over 17 books, because N_f is tokens per window); it is now fitted at fixed n = 100.
//  (3) arrival and persist counted births at the edges of the view, where every first mention looks like a birth (arrival fell from 86 to 72 per 1000 tokens in iid worlds as N grew from 5k to 50k); births are now counted only in units 127..U-128.
//  intro* definitions were NOT changed although they have low power at 50k tokens (see MEASURED); the spec asked for them in this form and introLeftFq is the powered companion.
//  Deviations from the brief, all deliberate: windows ignore document boundaries; the CRP is fitted on the first 100 figure tokens of each aligned block (matching distinct figures, but at fixed n); the clustering statistic is the
//  Pearson dispersion of the figure SHARE across blocks (a count variance-to-mean would be a function of tokens per block); introduction frames are a stratified standardised difference (no learner, no AUC).
//
// MEASURED (tests/fig/summary.json; dev data only, never atlas pockets): cost 15-150 ms per call at 150,000 tokens (budget 700); deterministic and non-mutating; no exception or NaN on 9 edge views (one unit, one-token units,
//  identical tokens, two types, all-distinct, 500 tokens, CJK, Cyrillic/Arabic, astral). Replicate iid worlds (1080 cells + 480 cells): |z| >= 4 in 1 + 4 cells, |z| >= 2 in 8.6% / 10.0% (t9 expects 0.3% / 7.7%), sd of z 0.5-1.55:
//  slightly heavy tails from only 10 null draws, nothing near the 2% gate. Planted phenomena recovered: burst -> figShare, arrival, persist; frames -> initEnrich, initSplit; parallel -> figShare, arrival, persist; episodic density ->
//  fano; convergence up/down -> converge +11 / -13.7; frame on the left/right of every recurring type -> introLeft -9.9 / introRight -11; frame on 43% of recurring types -> only introLeftFq (-12.8), introLeft/Right miss it (z -0.4).
//  Raw v is NOT free of unit length (windows are 128 UNITS): figShare, fano and crpTheta rise with unit length in iid worlds; over 17 real books rho(v, mean unit length) is arrival -0.89, initSplit -0.77, figShare 0.58, others |rho| < 0.4:
//  expect arrival and initSplit to be flagged sizeConfounded by G1. The z (against the statistic's own null) is length-free in iid worlds.
//
// SIZES AND LIMITS (null = "undefined for this half", never NaN): every statistic needs >= 2,000 tokens; arrival and persist need >= 400 units and persist >= 30 births; crpTheta and fano >= 6 aligned blocks of 128 units (crpTheta >= 4 blocks with >= 100 figure tokens and 3..98 distinct);
//  intro* >= 30 matched pairs (summed min(n1, n0) over strata with both classes); initEnrich >= 20 initial figure tokens; initSplit >= 20 types with >= 8 figure tokens; initFollow >= 150 events;
//  converge >= 20 types with >= 12 figure mentions.
import { prep } from "./_fig_prep.mjs";
import { discourse } from "./_fig_disc.mjs";
import { intro } from "./_fig_adj.mjs";
import { initial } from "./_fig_init.mjs";

export const FAMILY = "fig";
export const STATS = [
  { id: "figShare", statement: "share of tokens whose type recurs within 127 units (figure tokens); null: units kept whole, their order shuffled", null: "unit-order" },
  { id: "arrival", statement: "figure births (figure tokens with no same-type token in the previous 127 units) per 1000 tokens", null: "unit-order" },
  { id: "persist", statement: "interpolated median, over births, of the span in units from the first mention to the last mention inside the 128-unit window (persistence half-life)", null: "unit-order" },
  { id: "crpTheta", statement: "mean over aligned 128-unit blocks of log2(theta), theta the Chinese-restaurant concentration that reproduces the number of distinct figures among the block's first 100 figure tokens", null: "unit-order" },
  { id: "fano", statement: "dispersion (Pearson chi-square per df) of the figure share across aligned 128-unit blocks; 1 = binomial", null: "unit-order" },
  { id: "introLeft", statement: "stratified standardised difference in left-company rank bin: first occurrence of a type that recurs minus first occurrence of a hapax (same unit bucket, position class, unit-length class)", null: "within-unit" },
  { id: "introRight", statement: "as introLeft with the right-hand company (lookahead)", null: "within-unit" },
  { id: "introLeftFq", statement: "as introLeft for window openings that recur inside the window versus those that do not, stratified also by the type's own count bin (frequency-free by stratification)", null: "within-unit" },
  { id: "initEnrich", statement: "log2 of observed unit-initial figure tokens over their chance number (sum of 1/len); units of one token skipped", null: "within-unit" },
  { id: "initSplit", statement: "mean over types with >= 8 figure tokens of the excess squared deviation (observed minus chance, minus binomial chance variance) of the unit-initial share", null: "within-unit" },
  { id: "initFollow", statement: "rarefied (100 events) distinct follower types per event after a unit-initial figure token", null: "within-unit" },
  { id: "converge", statement: "mean over types with >= 12 figure mentions of (distinct neighbour types among mentions 1-4 minus among mentions 9-12) / 8", null: "within-unit" },
];
export const PREDICT = {
  figShare: "universal+", arrival: "universal+", persist: "universal-", crpTheta: "specific", fano: "specific", introLeft: "specific",
  introRight: "specific", introLeftFq: "specific", initEnrich: "universal+", initSplit: "universal+", initFollow: "specific", converge: "specific",
};

/** compute(view) -> {[statId]: number|null}; deterministic; typed arrays, single passes, no randomness */
export function compute(view) {
  const P = prep(view);
  const r = { ...discourse(P), ...intro(P), ...initial(P) };
  for (const k of Object.keys(r)) if (!Number.isFinite(r[k])) r[k] = null;
  return r;
}
