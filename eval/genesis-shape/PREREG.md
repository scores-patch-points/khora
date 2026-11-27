# PREREG: the sentence shape on Genesis in every language the corpus holds (2026-11-27)
Corpus: christos-c/bible-corpus (CC0), fetched to scratch on the owner's word, not committed. 57 editions carry Genesis. Code frozen at khora c455c31 (branch weave-roles-polarity-question). Written before any edition is read by the code under test. Split: FRESH (none of today's changes was built on Genesis); NO GOLD for roles.

**Text**: the first 200 verses of Genesis by the id order of English-WEB (chapters 1 to about 8), each verse read as its own text.
**Language**: the corpus ISO code mapped to the priors' ISO 639-3 by a declared table (alb sqi, arm hye, cze ces, gre ell, rum ron, jap jpn, mao mri; the rest unchanged). The language is DECLARED from the corpus, not found (the codec fold is test A).

**A. Codec found by surprise** (unchanged code, a regression check): `scripts/measure-codec-fold.mjs --verses 40`, as recorded before (35 of 37 on 65 editions; this clone has 57 editions, so the denominator may differ and that is reported, not adjusted).

**B. What the shape layer does in each language** (descriptive, per edition): parser prior held or the typed gap; tokenizer prior present, absent, or filled by an adapter; marker table present; rows labelled; share of participants with a SPECIFIC kāraka (not the generic one); share of sentences parse-consistency flags, by gap; negation source available and its carrier count.

**C. A gold-free falsifier for negation (verse-aligned)**: for each verse, neg = at least one predication has polarity "-" (negation-read over the verse's rows). Translations of one verse should mostly agree on that. Statistic: Cohen's kappa between an edition's neg vector and English-WEB's, over the verses both hold. Null: the same kappa with the edition's vector permuted across verses (1000 seeded permutations); the bar is the 95th percentile of that null, read from the data, not typed. Ceiling for reference: English (KJV) against English-WEB.
 - FALSIFIER C1: an edition with a held parser and a negation source whose kappa does not exceed its own null bar -> negation is NOT being read in that language (whatever the features say).
 - An edition with no negation source is an ABSTENTION (typed gap), counted separately.
 - What C cannot show: that a role or a negation is RIGHT; only that the reading tracks the same verses as English. Translations legitimately differ (a negated verb in one, "without" in another), so kappa below 1 is expected even for a perfect reader; the English-KJV ceiling shows how far below.
**Not measured**: roles against any gold; question form outside English (no adapter: typed gap); editions whose language has no parser prior (reported as gaps); anything beyond 200 verses.
