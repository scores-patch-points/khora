# RESULT: the sentence shape on Genesis in every language the corpus holds (2026-11-27)

Split: **fresh** (nothing of the shape layer was built on Genesis); **no gold for roles**. Corpus christos-c/bible-corpus (CC0) at 44e5fca, fetched to scratch on the owner's word; **no corpus text is committed** (`out/*.json` hold counts and one boolean per verse id). Code frozen at khora c455c31; stamp 2026-11-27T23:12:33Z. First 200 verses, language declared from the corpus. Files are as run (absolute scratch paths).

## Coverage
57 editions carry Genesis. **24 have no parser prior** (typed gap `no_parser_prior`, nothing read): Albanian, Arabic, Bulgarian, Burmese, Estonian, Greek, Hebrew, Hindi, Hungarian, Italian, Kannada, Malagasy, Maori, Norwegian, Paite, Polish, Portuguese, Q'eqchi', Russian, Shona, Somali, Tuareg, Xhosa, Zarma. **33 editions in 29 languages were read**, 0 runtime errors. Every row got a label in all 33 (the relation-to-role map is language-independent); a marker table exists for 2 languages (English, Chinese), so elsewhere adposition-marked roles stay generic: specific-kāraka share 0.47 (Marathi) to 0.97 (English-WEB, Chinese).

## A. Codec by surprise (unchanged code, regression check)
26 of 28 editions with a held grammar (93%), the same on clean, lowercase and typo'd text; the 2 misses are the known Chinese -> Japanese. (Recorded before: 35 of 37 on a 65-edition table; this clone yields 57 editions and the script counts truth by the corpus' own ISO code, so cze, rum, arm, jap editions are not in its denominator.) No regression seen; not the same denominator.

## C. Negation, gold-free (kappa with English-WEB per verse, against a permuted null)
Ceiling: English KJV against English-WEB kappa 0.73 (11 and 13 negated verses of 200).
- **17 editions track** (kappa above their own null bar): Romanian 0.72, Cebuano 0.65, German 0.65, Swedish 0.64, Spanish 0.62, Turkish 0.62, Slovene 0.56, French 0.53, Creole 0.51, Tagalog 0.42, Farsi 0.33, Chinese 0.29 (both), Nepali 0.27, Armenian 0.25, Slovak 0.23, English KJV 0.73.
- **C1 TRIGGERED for 7 editions: negation is not being read.** Finnish and Malayalam find 0 negated verses; Czech, Lithuanian, Japanese (both) find 1; Indonesian finds 13 but they are not the verses English negates (kappa 0.09 = its null bar). Likely cause, NOT verified here: in these languages negation is on the verb itself (a prefix or suffix, Polarity=Neg on the VERB) or an auxiliary, and `negation-read.js` places negators that are separate words.
- **8 editions abstain** (typed `no-polarity-source`: the treebank's lexicon annotates no negator): Afrikaans, Danish, Esperanto, Icelandic, Marathi, Telugu, Vietnamese (both).
- Low-count caveat: Armenian, Nepali, Slovak "track" on 2 to 3 negated verses; weak evidence.

## B. parse-consistency OVER-FIRES on real prose. NEGATIVE for the check as built.
Share of sentences flagged: English-WEB 0.36, English KJV 0.54, French 0.63, German 0.50, Spanish 0.35, Japanese 0.16, Indonesian 0.27, Cebuano 0.97, Tagalog 0.99, Nepali 0.94 (all 33 in `summary.json`). On the hand-written held-out sets it flagged 22%.
- `clausal_participant` is the largest gap almost everywhere and fires on ordinary clausal complements (ccomp, xcomp: "God saw that it was good", "began to ..."). A clause as the thing said or seen is a legitimate structure, not a fault of the parse. On sentences written to have a noun patient this check helped; on narrative prose it abstains wherever a verb takes a clause. It should not be called an inconsistency; it should say "the patient is a clause", and abstain only for a caller that needs a nominal.
- `unattested_closed_class` is doing its job in French: this edition writes the apostrophe as a backtick ("l`homme", "qu`il"), the tokenizer does not split it, and the flag names exactly those tokens. In Tagalog it reflects a parser that tags function words wrongly ("at" as ADP, DET and PART).
- Without role gold there is no way to say what share of these flags is right. What is shown: the flag rate that looked acceptable on test sentences is not acceptable on prose, in any language.

## Not measured
Roles against any gold, in any language. Question form outside English. Whether the 17 "tracking" languages negate the RIGHT predicate. More than 200 verses. The 24 languages with no parser prior.
