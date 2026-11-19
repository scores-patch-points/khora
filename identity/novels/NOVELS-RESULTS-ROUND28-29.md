# Rounds 28 and 29: nesting holons, then computing the nesting from the read itself

Round 28 (PREREG-ROUND28.md, stamped 2026-11-19T01:08:12Z) built the nest as a generic structure over parent edges (`holon-nest.js`, `nest-grain.js`) with Wikidata as the giver. Its held-out run was **not done**: you then said structured data must not be a dependency and the nesting should be computed from the holograph like a person does, and that these are referents, not strings. Round 28's code and its fresh giver data (890 actors, 1,542 holons with parent edges, `identity/place-grain/data/wikidata-nest.json`) stand as the reference side; no round 28 number is claimed.

Round 29 (PREREG-ROUND29.md, 2026-11-19T01:44:01Z, two addenda, frozen in FREEZE-ROUND29.md) computes the nest from the read's own edges (`native/adapters/text/nest-from-read.js`) and uses Wikidata only to score. Held-out (odd hash of the Wikidata id) scored once, on the Wikipedia lead paragraphs.

## Held-out result
- Population: 432 people; 406 have a lead; 339 were read (67 under 200 characters are skipped by the reader).
- E1 REACH: the read names the birthplace as a cast being for **41 of 307 scored people (13.3%)**. Only 15% of leads state the birthplace at all (found on development), and a place named once is not a cast being.
- E2 PRECISION of the steps the read extracted: **5 of 8 (0.625)**, no direction errors (the parent is never the child's descendant). The random-parent null: 0 of 22. The cues carry signal; the count is too small to put a margin on.
- E3 RECALL: reaches any gold ancestor for **5 of 41 (12.2%)**; the gold parent 0 of 41 (Wikidata's parent is often a county the text never names); the gold country 0 of 41.
- E4 SILENCE: 34 leads name the birthplace with no containment; the gold has a parent for all 34. The result there is a typed gap, not a guess.
- E5 against a regex ("born in X, Y"): regex named the birthplace in 15 leads, 5 steps at precision 0.6, parent recall 0. The read-based extraction does NOT beat it on the preregistered measure (both 0 on the gold parent); precision is the same within the noise of 5 and 8 steps. Claim not met.
- E6 THE JUDGE on an extracted nest, against the Wikidata judge: agreement **0.30 over 60 items, below both trivial baselines (0.35)**. Claim not met. The positional grain rule ("country" = the root of the extracted chain) fails when the text gives "Kansas" and never "United States".
- Wrong steps seen: London's parent "Douglas Thomas Pattinson", New Jersey's "Sinatra", Wellington's "April": a being after a comma beside a place is taken for a place. This is the false-container error predicted in addendum 1.

## Reading
- What works: where the text states a containment ("born in Topeka, Kansas"), the read's edges give it with correct direction, and a random parent is never right. Referent resolution through aliases fixed several development false negatives.
- What does not: a lead paragraph almost never says it (13% reach), recall is 12%, and the judge over an extracted nest loses to trivial baselines on this text. The extractor takes any capitalised being after a comma beside a place for a place; a person or a month passes. Nothing here supports claiming the nesting can be computed on the fly from a lead.
- What this does not show: that a longer, place-rich text would do better. It is likely (the cue works when present), but untested: the article fetch (first 5,000 characters) was throttled by Wikipedia to about 40 pages in 17 minutes and was stopped (`identity/place-grain/fetch-early.py`, kept for a later round).
- Not repaired, by rule: the false-container error; single-mention places are not cast beings (the edges name them; the extractor reads only cast beings); no class nouns beyond position.
- Development, before the freeze: on 352 even-hash leads, steps 12 of 18 after the referent change (10 of 17 before), null 0.21.
