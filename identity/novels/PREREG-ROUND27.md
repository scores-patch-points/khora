# PREREG-ROUND27 — what counts for the question: grain, containment, and what the asker already holds

The case: where a president is from, "Topeka" is the right answer sometimes and "Kansas" other times. Two things decide it: the grain the question asks for ("which state", "which city"), and what the asker already holds (said to a Kansan, "Kansas" adds nothing). Neither is in khora: `same-for` can take the asking as its perspective, `holdings.js` and `whom.js` split fresh from held, `same-other-disk` has "more specific" for intervals only; nothing knows Topeka is inside Kansas, and nothing reads a question's grain. This round builds that and measures what it can honestly measure.

## Giver
Wikidata, by SPARQL: people with a birthplace (P19) and many sitelinks (> 55, widely known), and for each birthplace the located-in chain (P131*, each ancestor with its instance-of classes). The endpoint allows one request a minute; the fetch is paced to it. Saved raw with the query text, a timestamp and a hash (`identity/place-grain/data/`, script `fetch-places.py`). Levels are read from the classes, not from names: country = an instance of country or sovereign state; admin1 = an instance of a first-level administrative division (state of the United States, region, province, prefecture, federal subject, constituent country...); settlement = the birthplace itself when it sits below an admin1 that sits below a country.

## What is built
1. `place-grain.js`, a judge that takes (question text, subject's chain, answer string, asker's holdings) and returns same, same-by-roll-up (finer than asked), too-coarse (a gap, not wrong), already-held (true but nothing fresh), or other.
2. The question's grain is read from the question by the reader's own parser (`english-parser.js`): the noun a wh-determiner governs ("which STATE", "what COUNTRY", "in which CITY") maps by lemma to a level through a fixed list declared here: city, town, village -> settlement; state, province, region, prefecture, county? (no: only these) -> admin1; country, nation -> country. A bare "where" has no grain of its own: the asker's holdings decide it.
3. Rules, declared now: answer at the asked level and the same entity: same. Answer finer than asked and inside the asked entity: same-by-roll-up. Answer coarser than asked: too-coarse. For "where": an answer counts only if it is strictly finer than the finest level the asker already holds; otherwise already-held. An answer whose string names nothing in the subject's chain: other.

## Items (mechanical, from the chain; the gold is Wikidata's)
For each person with a complete chain (settlement, admin1, country): every question form (city, state, country, where with holdings {}, {country}, {country, admin1}) crossed with every true answer level (the person's own settlement, admin1, country, by label), plus distractors: (a) a random place of the same level from another person; (b) a TRAP: a place from the dataset whose label contains, or is contained in, the true label at the asked level but is not in the person's chain ("Kansas City" for Kansas, "Virginia" and "West Virginia"). People are split by a hash of their Wikidata id: even = development (used only to debug the question parser's phrasing coverage), odd = held-out, scored once.

## Systems compared
- JUDGE: the above.
- B1 string equality with the true label at the asked level.
- B2 string containment either way with the true label at the asked level.
- B3 grain-blind chain lookup: an answer is same if its label equals ANY label in the chain (no question grain, no holdings).

## Claims, decided before running
- C1 (the hierarchy is needed): B2 false-accepts trap items at a rate above zero on held-out, and the JUDGE does not. If B2 matches the JUDGE on traps, containment of strings is enough and the hierarchy adds nothing here.
- C2 (the question's grain is needed): B3 gets wrong every too-coarse item and every finer-than-asked item it is scored on against the gold (it has no grain to compare with); the JUDGE gets them right. If B3 matches the JUDGE overall, the grain adds nothing on this data.
- C3 (the asker's holdings are needed): for "where" with holdings, the JUDGE's verdict on the same answer changes exactly where the holdings put the level boundary; B1, B2 and B3 cannot change with holdings. Reported as the share of "where" items the JUDGE gets right against each baseline.
- C4 (the question parser): accuracy of the grain read from the question's own words, on a frozen list of 12 phrasings per grain written before the run (listed in the harness), held-out. Reported, with every miss listed.
- C5 (the giver, reported not claimed): the share of people with a complete chain; the share of chain labels that name more than one entity in the data (homonyms), which is how often a bare answer string cannot be told from the string alone (e.g. Georgia, Paris).

## What this does and does not show
The gold for the items comes from the same Wikidata chain the judge reads, so the judge's agreement with it is partly by construction. What the run can show: that the baselines fail where the question's grain and the hierarchy matter (C1, C2, C3); that the question's grain can be read from real question wording (C4); and how much of the world the giver covers (C5). It does not show that a reader can extract the answer string from free text, nor that the declared rules are the right ones for every asker. Those are the next steps and are not claimed.
