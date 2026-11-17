# PREREG: identity from stated rules, tested omnilingually

Written before any person data for this test is fetched. Stamped (`OMNI-PREREG.md.sha256`, `.time`) first.
Subject: khora `main` @ 148037f as pushed — `identity-exclusion.js` judging with the register read by
`adapters/wikidata/constraints.js` (EXPERIMENTAL), exactly the pipeline of RULES-PREREG (09c15ab3…), unchanged.

## Why this test
The rules are keyed to item and property ids, so on paper they are language-blind. The RECORDS are not: calendars and
date precision, naming conventions, which properties get filled in, and how often statements carry references all
vary by language and region. Two samples (Russian Empire, Kingdom of France) said little about the rest of the world.

## Languages (33, item ids verified by English label before fetching)
Japanese Q5287, Chinese Q7850, Arabic Q13955, Russian Q7737, French Q150, German Q188, Spanish Q1321, Portuguese Q5146,
Persian Q9168, Turkish Q256, Hindi Q1568, Korean Q9176, Hebrew Q9288, Greek Q9129, Polish Q809, Italian Q652,
English Q1860, Swahili Q7838, Amharic Q28244, Ottoman Turkish Q36730, Sanskrit Q11059, Thai Q9217, Vietnamese Q9199,
Latin Q397, Bangla Q9610, Tamil Q5885, Indonesian Q9240, Swedish Q9027, Czech Q9056, Norwegian Q9043, Ukrainian Q8798,
Hungarian Q9067, Yiddish Q8641.

## Data
Per language: humans (P31 = Q5) with "languages spoken, written or signed" (P1412) = that language and a date of birth
(P569) in 1700–1900, the first 120 by item id. A language returning fewer than 40 items is reported as too thin and
left out of the bars (named, not hidden). Constraints fetched for every property appearing. All data saved.
Split-half exactly as RULES-PREREG (seed 20261125, each half carries its item's P31).

## Hypotheses
- **O1 sound everywhere.** In EVERY language with >= 40 items, true pairs contradicted <= 5%. Any language over the bar
  falsifies "it is sound omnilingually" there; each is named with its contradicting statements.
- **O2 power does not collapse.** Distinct pairs contradicted >= 20% in at least 80% of the languages with >= 40 items.
- **O3 measured, not a falsifier.** Rank correlation (Spearman) across languages between the share of referenced
  statements and power. RULES-RESULTS predicted references drive power.
- **Power check (pooled over all usable languages).** M-norules: distinct contradicted < 5% in every language.
  M-flip: true pairs contradicted > 5% in at least half the languages. Otherwise the test cannot see failure.

## Decision rule
This tests the EXPERIMENTAL label. O1 and O2 hold and the power check passes: propose (not make) a commit removing the
label, for the user to approve. Otherwise the label stays and the per-language failures are reported. No code changes.
