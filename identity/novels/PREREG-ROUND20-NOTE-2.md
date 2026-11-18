# PREREG-ROUND20 NOTE 2 — the Wikidata giver for names: gender and kind (registered before it is asked or scored)

NOTE-1 results (U, sighted for S0 and S6; written before this note): overcomeable (soft) mode: corrected table 304/30 -> 319/29, shipped table 319/31 -> 321/30; dev and test unchanged; the GUM-measured gender table changed no binding (too thin: 179 gendered entities, 468 words). Soft mode is now in the canonical read (shipped table); the corrected table failed O2's coverage clause by 0.4 points (63.0% against 63.4%) and is not shipped.

## The giver
`adapters/text/wikidata-name-giver.js`: for each capitalised word of a cast being's mentions, one wbsearchentities (language en, limit 10) and one wbgetentities (claims P31) over the exact-label results, public Wikidata (CC0). Only name strings leave the machine, never text of the documents. Every answer is cached on disk with its query date and replayed offline (`~/.khora/giver-cache/wikidata-names.jsonl`).
- GENDER prior (categorical, an attested given-name class): a word whose exact-label entities include a male given name (Q12308941) counts +1 m; a female given name (Q11879590) +1 f; unisex (Q3409032) neither. A being's gender is known when one gender strictly exceeds the other over its words (minimum 1: attestation, not a count). Fed to the rung as the overcomeable `priorGender`.
- KIND: a being is non-personal by the giver when it has at least one word with an exact-label result and NO word has a person reading (an exact-label entity that is human Q5, a given name, or a family name). No list of place or organisation words anywhere.
## Arms (U, 66 documents, 552 pronouns; soft mode on in all)
S6s = the shipped name table (soft) 321/30; G = + giver gender prior; K = giver kind ruling alone (no table); S6s+K = table union giver kind; S6s+K+G = both.
- W1: G precision >= S6s and no fewer right bindings (the giver gender prior must not cost).
- W2: K alone vs the table alone: counts and precision/coverage; the union vs S6s: bootstrap by document, permutation of the changed set, 20 shuffled-name controls (the giver's answers re-assigned to other words).
- W3 (descriptive): the number of distinct words asked, answered, and the share with a given-name reading; how many of the pronouns' gold entities are people the giver calls non-personal (its false rulings).
Failures reported; nothing tuned; if the network is unreachable the arms are reported as not run.
