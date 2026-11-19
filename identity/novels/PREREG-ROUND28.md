# PREREG-ROUND28 — nest the holons: containment of any depth, and the asker's own nest

You said: nest holons, that makes sense. Round 27 fixed three levels (settlement, first-level division, country) and read the level of each ancestor from a short class list; it reached a third of the people and could not say "which county". A holon, in the sense the repo already uses (Koestler: a whole that is part of a larger whole; same-for's `level`: part inside whole), is just that: each place is a holon, its parent is the larger whole it belongs to, to any depth. This round makes the nest the structure, not three named levels.

## What is built
1. `native/adapters/text/holon-nest.js`, a generic nest over parent edges: a holon has an id, a label, the class names it is an instance of, and a parent (or none). Operations: the path from a holon to its root; whether one holon is inside another; the lowest common ancestor of two paths. Nothing in it is about places; the same nest would hold day inside month inside year, or token inside claim inside text. A place is the first client.
2. The question's grain is the holon on the subject's path that the question's noun names: the noun (city, town, county, district, borough, state, province, region, prefecture, department, canton, country, nation) is matched against the class names of the holons on the path, as a whole word ("state of the United States" matches state; "constituent country" matches country). If several match: for "country" the one nearest the root, for every other noun the one nearest the subject.
3. The answer string is resolved to a holon on the subject's path by label. When two holons on the path carry the same label (Lima the city, Lima the province), the question's grain resolves the string: if one of them is the asked holon, that one is meant. If no holon is asked (a bare "where"), the finer one is read.
4. Verdicts: same (the asked holon), roll_up (a holon inside the asked one), too_coarse (a holon that contains it), other (not on the path).
5. For a bare "where", the asker holds a nest of their own (their own place's path). The shared ground is the lowest common ancestor of the asker's path and the subject's path. An answer counts only if it is strictly finer than the shared ground: already_held otherwise. This replaces round 27's fixed "holds country / holds state" levels. The minimal informative answer is the child of the shared ground on the subject's path; anything at or below it counts.
6. The question's grain reader generalises: the noun is read by the governed-noun rule of round 27 plus one declared fallback (the first list noun in the three tokens after a "which" or "what"), which targets the two phrasings round 27 missed.

## Giver (fresh people, so the held-out is unread)
Wikidata SPARQL, 900 actors (occupation Q33999) with a birthplace (round 27 used politicians), and for every birthplace the whole located-in chain WITH parent edges and each ancestor's instance-of class labels (no class filter). Paced to one request a minute. Raw, with query text, time stamp and hash, in `identity/place-grain/data/wikidata-nest.json`.

## Items and split
People split by the hash of their Wikidata id: even = development (harness debugging only), odd = held-out, scored once. For each person with a usable nest (a path of at least two holons ending at a root): the question forms city, state, country, and county or district (whenever a holon with that noun exists on the path), crossed with every holon on the path as the answer, plus a random distractor holon from another person and a trap (a label from the data that contains or is contained in the asked holon's label but is not on the path). For "where": the asker is a random other person from the same split; every holon on the subject's path is an answer. Gold is computed by a separate plain function from the same nest.

## Systems compared
JUDGE (the above); B1 string equality at the asked holon's label; B2 string containment either way; B3 grain-blind (any label on the path accepted); B4 for "where": the finest holon is the only accepted answer (no asker).

## Claims, decided before running
- N1 coverage (reported, not a bar): the share of people with a usable nest; round 27 reached 34% with the class list.
- N2 depth (reported): the share of nests with more than three holons, and the accuracy on the county or district questions, which round 27 could not ask.
- N3 the hierarchy is needed: B2 false-accepts traps and the JUDGE does not. The grain is needed: B3 gets every too_coarse item wrong. Holdings are needed: on "where", the JUDGE beats B1-B4. If any baseline matches the JUDGE on its claim, that claim is refuted.
- N4 the asker's own nest: on "where", the accepted answers must change with the asker: for the same subject, an asker who shares more of the path gets a smaller set of counting answers. Reported as the share of "where" items right for each system, and the share of subjects whose counting set differs across two askers.
- N5 string ambiguity: items whose answer string names more than one holon on the path (Lima, Lima; New York, New York): the JUDGE's accuracy on them, with the question's grain resolving the string, against the round 27 rule (first level matched).
- N6 the question reader: accuracy on the frozen 42 phrasings of round 27 plus 8 new (county and district), with every miss listed.

## What this does and does not show
Same circularity as round 27: the gold and the judge read one nest, so agreement is partly by construction. What the run can show is that the baselines fail where nesting, grain and the asker's own place matter, that nesting reaches more of the world than a three-level class list, and that the question reader works on real wording. It does not show that an answer string can be read from free text, nor that the shared-ground rule is the right one for every asker.
