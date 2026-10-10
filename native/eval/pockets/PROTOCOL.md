# POCKET-UNIVERSE LAW ATLAS — protocol (pre-registration, written before any law statistic was computed on any pocket)

Date: 2026-10-07. Written by the orchestrating session; every agent in the atlas workflow works under it. Do not change a rule after seeing atlas output; amendments are
appended below the line `AMENDMENTS` with a date and the reason, and never loosen a threshold.

## What is being asked
"Discover any other laws that exist in any pocket universes." Operationally: a POCKET is a bounded text world (a language, register, genre, book, channel, code language, a planted
synthetic world). A LAW is a regularity of fixed form (a statistic with a null world and a direction) that holds in some pockets. The deliverable is a map: which laws hold in
which pockets, which hold everywhere, which hold only in some (and what those have in common), which reverse sign, and which constants (exponents, rates) vary by pocket class.
Provisional and scoped laws are explicitly wanted; the claim for each is its scope.

## Objects (see lib/pocket.mjs)
Pocket = {id, group, register, language, script, units, docOf, meta}. Document halves: DISCOVER and CONFIRM, split by hash parity of the document (never by unit). All law statistics are
computed on each half separately. NULL WORLDS (lib/pocket.mjs nullView): within-unit shuffle, unit-order shuffle, token-global shuffle; each statistic names its null in advance. 10 null draws per
half (seeded). z = (v - nullMean)/nullSd.

## Instrument gates (nothing is concluded unless they pass)
G0 PLANTED WORLDS. loaders/planted.mjs builds synthetic pockets with exactly known laws (an iid Zipf world with NO structure; a bursty world; a Markov/frame world; a parallelism world; a
   length-law world; a vocative/name-slot world) and results/planted-truth.json states, per world, the phenomena planted and the statistics expected to fire. Gate: in the iid world fewer
   than 2% of (statistic, half) cells have |z| >= 4; every planted phenomenon is recovered by at least one statistic in both halves with the expected sign.
G1 SIZE CONFOUND. For every statistic, across non-planted non-thin pockets, Spearman rho against log(tokens) and against mean unit length. |rho| >= 0.7 flags the statistic sizeConfounded
   (it may still be reported, never among the headline laws).
G2 DETERMINISM. Re-running a pocket gives byte-identical atlas JSON (checked on 3 pockets).
G3 TOKENISATION. Each pocket documents its tokenisation in meta.tokenisation; laws are never compared across pockets whose tokenisation grain differs (e.g. characters versus words) without saying so.

## Cell status
PRESENT(P, s): |z| >= 4 in BOTH halves with the same sign.   ABSENT(P, s): |z| < 2 in both halves.   AMBIGUOUS: anything else. Pockets that are thin (< 20,000 tokens or < 20 docs) are excluded from
all law-level counts and reported separately. Planted pockets are excluded from law-level counts (they are the instrument check).

## Law status over pockets (statistic s; N = non-thin real pockets with a defined cell)
UNIVERSAL: PRESENT with one sign in >= 85% of N.    MAJORITY: 60-85%.    POCKET-SPECIFIC: PRESENT in at least 2 pockets and at most 59% of N, with ABSENT in at least 25% of N.
REVERSAL: PRESENT with each sign in at least 3 pockets.    NULL-LAW: PRESENT in fewer than 2 pockets.    (Statuses are not exclusive: a statistic can be REVERSAL and POCKET-SPECIFIC.)
CONSTANT VARIES: for a UNIVERSAL or MAJORITY statistic, the between-pocket spread of v among PRESENT pockets, and eta-squared of v on each of group, register, script (one-way ANOVA; a
permutation p over pocket labels, 2000 draws). A constant is "pocket-class-specific" if eta-squared >= 0.5 and permutation p < 0.01 for some attribute.
SHARED PROPERTY of POCKET-SPECIFIC and REVERSAL laws: the pockets where it is PRESENT are compared with the rest on group, register, script, tokens, mean unit length, doc count: report the
attribute with the largest eta-squared / Cramer's V and its permutation p. No other attribute is searched after seeing results.

## Selection for confirmation (fixed now)
Up to 8 statistics: the 8 largest by between-pocket heterogeneity (interquartile range of v among PRESENT pockets divided by the median |v|) among POCKET-SPECIFIC or REVERSAL statistics that are
not sizeConfounded and whose SHARED PROPERTY permutation p < 0.05; plus up to 4 UNIVERSAL statistics with the largest median |z|. Each is confirmed by SIBLING REPLICATION: at least two NEW pockets
of the same kind not in the atlas, with blind predictions of presence and sign fixed before computing, and by an adversary (leakage, tokenisation artefact, size, a cheaper rival statistic,
multiplicity: the atlas tests (#statistics x #pockets) cells, so the expected number of false PRESENT cells at |z| >= 4 in both halves is reported against a binomial reference).

## Honesty rules
Negative results are reported with the same prominence as positive ones. A law found only in one pocket is a LEAD, not a law. A statistic that is a deterministic function of unit length or token
count is not a law. No capital letters, POS priors, treebank labels, word lists or speaker names enter any statistic: laws are stated in observables of the token stream itself.

AMENDMENTS (dated, append only):
