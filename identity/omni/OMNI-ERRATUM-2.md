# ERRATUM 2 to OMNI-PREREG.md (43205d94…; ERRATUM-1 b048d19b…), filed before any result was computed

Prompted by the same independent review. Checked against the id files here before filing: 3,773 rows, 3,642 distinct
items; 30 of 33 id files are in pure text order.

## Correcting ERRATUM-1's stated limitation
ERRATUM-1 said "first 120 by item id" takes the lowest (oldest) ids. Wrong: `ORDER BY ?item` sorts IRIs as TEXT, so each
sample is a prefix of the text-sorted list. For most languages that means mostly items numbered 100,000,000 and up,
i.e. RECENTLY CREATED items (Polish 1.00, Yiddish 0.95, English 0.85), for a few mostly older ones (Hungarian 0.06,
Vietnamese 0.12), varying by language. Item age and creation source (bulk imports) are therefore CONFOUNDED with
language in every cross-language contrast; differences between languages are not attributed to language.

## The unit is the distinct item
The query has no DISTINCT, so rows are not items. Every n, interval and threshold uses DISTINCT items (the entity files
are keyed by item, so the analysis already does). Too thin (< 40 distinct): Swahili (31) and Amharic (39). Amharic is
out of the bars by this rule.

## Reported beside each language's contradicted true pairs
The number of items holding two or more truthy birth dates (preferred if any, else normal rank) within 1700–1900: their
halves can conflict when the two statements land in different halves, so they are expected to drive the
record-disagreement class.

## Scripts changed by this erratum (sha256)
- `omni-score.py` e7302a10e0e5d7fdd1329315bdff696da2701c942953f456b49baecd0aaee3d9
