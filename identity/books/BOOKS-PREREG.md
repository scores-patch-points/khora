# PREREG: a net-new kind (book works in Open Library): rules and identity learned from records alone

Written before any book data is fetched. Stamped first. No stated rules exist for this kind and none are used: every rule
below is learned from the records.

## Disclosed deviation before this prereg
The first plan was arXiv preprints against Crossref journal records. arXiv's API answered "Rate exceeded" on three attempts
a minute apart (no data was fetched), so it was dropped rather than hammered. A probe of Open Library read ONE work's
editions (the poetry search's first work with 3-30 editions; nine editions) to learn the field shapes. It showed that many
edition records have no author, a different language and a translated title per edition, and differing publishers.

## Data
Open Library, for each of 10 subjects (fiction, poetry, history, science, philosophy, religion, children, biography,
mathematics, art): the first 60 works with 3 <= edition_count <= 40 at a seeded offset (seed 20261127, offset in [0,1500]) of
the subject search, then each work's editions (editions.json, limit 40). A work found under several subjects stays with
the first in the list above. Sequential requests, 1.2 s apart, a generic user agent. All raw records saved.

## Records and relations (declared; the values are what the records say, nothing else)
One record per edition. Relations, each a SET of values: title_tok (NFKC-lowercased alphanumeric tokens of the title, length
>= 2), author (author keys), language (language keys), translated_from (language keys), publisher (lowercased, punctuation
stripped), year (4-digit year of publish_date, as `y:YYYY`: the one time relation), pages (number_of_pages), format
(physical_format), class (LC and Dewey classification strings), subject (subject strings, lowercased), series. Excluded:
every identifier specific to an edition (ISBN, OCLC, LCCN, source records, local ids) and the work key. Coverage of each
relation is reported.

## Truth and groups
Truth = the work key (never used inside the score; used to form the self and stranger references on TRAINING works and to
score test pairs). Groups = subjects; leave-subject-out: each subject is judged with what is learned from the others.

## Method: ladder v1 with dates by closeness (LADDER-RESULTS F1), unchanged
Per training work with >= 2 editions, one random pair of its editions (seeded) is its "self" pair; stranger pairs are random
pairs of editions from different training works (as many as there are self pairs). Learned from those: m_r (a work's two
editions disjoint on r), c_r (strangers overlap on r), p_r(v), and for `year` the gap distribution self vs stranger.
Lambda as before; the levels usual / SURPRISE / STARTLE / SHOCK are units of 1.4826 x MAD, each relative to its reference.
The unit guard: if the unit of the self reference is under 1% of the stranger Lambda's unit, the subject is reported with
a "collapsed unit" label (the F2 lesson); results are reported either way, the label only marks them.

## Test
Per test subject: for each work with >= 2 editions, one random pair of its editions (a TRUE pair); for each work, 20 random
cross-work edition pairs (DISTINCT pairs). All seeded.

## Questions (exploratory; no ship decision, no typed bars)
- Q1 soundness: pooled true pairs at SURPRISE or above, Clopper-Pearson 95% interval; per subject.
- Q2 power: distinct pairs at SURPRISE or above, per subject and pooled.
- Q3 evidence: true and distinct results stratified by the number of relations both records hold (0, 1, 2, 3+).
- Q4 translation: true pairs whose language sets are disjoint vs overlapping.
- Q5 what carries identity: drop each relation from Lambda in turn; change in Q1 and Q2.
- Q6 what was learned (the register): per relation, coverage, share of works whose editions all agree (single), m_r, c_r,
  and for year the median gap self vs stranger. Relations with a single-share >= 0.9 are listed as rule candidates.
- Controls: C1 editions dealt at random to training works (truth scrambled) must collapse power; C2 year categorical
  instead of by closeness; C3 reference learned from the test subject itself (leak).

## Predictions, stated now so they can fail
1. Translated editions are the weakest stratum: more true pairs with no comparable evidence or at SURPRISE.
2. The learned register will call year, publisher, pages and format plural; author and title tokens the most
   single-like; year's self gap median will exceed the stranger gap median much less than a person's birth year did.
3. At least 20% of distinct pairs have zero comparable relations.
