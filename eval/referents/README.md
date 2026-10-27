# eval/referents — a golden for pronoun binding

`organs/hypergraph.js` used to say *"No golden exists for pronoun binding in THIS repo"*. `pronoun-golden.mjs` is one: it reads whole
documents of UD_English-GUM through the master pipeline (`reading.js::readDocument`) and scores the bindings the pipeline itself reports
(`entry.pronouns`) against GUM's gold coreference. It resolves nothing; it counts what the reader did.

```bash
GUM_TRAIN=/path/to/UD_English-GUM/en_gum-ud-train.conllu node eval/referents/pronoun-golden.mjs [--regimes] [--check] [--slice B,C,D]
```

GUM is CC BY-SA and is not vendored: without `GUM_TRAIN` the eval says so and exits 0. The numbers below were measured on the training file
with sha256 `88c410ca6a51ccc79f9536d75feb1633421691165cd191f8137f8b37569a0329` (the eval prints the hash of the file it was given). It also
needs a lexicon giver (the local Wiktionary pack, `adapters/text/wiktionary-pack.js`) and skips, saying why, when there is none.

## What is scored

A gold pronoun is **answerable** when it is third-person singular personal and its gold entity has a proper-name mention the reader's cast
covers. An answerable pronoun the reader bound is **right** when the bound being's own mention spans overlap a gold mention of the
pronoun's entity, **wrong** otherwise. Precision is right / (right + wrong); coverage is bound / answerable. A being's entities come only
from its own cast spans, never from the pronoun being scored (a first harness of this family counted the pronoun's own mention among the
bound being's and read 88% precision; the corrected scorer reads far lower).

## What differs between the arms

Two arms per regime, the same lexicon, documents and dials; they differ in one thing, `readerOptions.nonPersonalOf`:

- **shipped** — `nonPersonalOf = null`: the production call as it was, `{ minActivation 0.05, minMargin 0.2 }` and nothing else.
- **shipped + np** — the default: the same dials plus the resolver's `nonPersonal` input, ruled by two givers
  (`adapters/text/non-personal.js`): month and weekday names from TimePrior@1, and a head word the lexicon giver lists as a common noun and
  never as a name. Nothing is a list typed in the repo.

`--regimes` adds the two other regimes `pronouns.js::resolvePronouns` already carries behind declared dials (defined and registered
before scoring in a pre-registration kept outside this repo, sha256 `f3c49e993b9199ef29df66d335d673dcd4331df3d9e82ada8fcb95125c3c143c`):
**adjudicated** (`contestedMargin 0.2`) and **null+presence** (the null test, draws 199, alpha 0.05, plus the presence arbiter, window 12).
None of them is adopted by this change; they are scored so that the next decision has a number.

## Slices

Seeded draws of 30 documents of at least 20 sentences each (id order, mulberry32):

| slice | seed | status |
|---|---|---|
| B | 20261120 | **in-sample**: its errors were read to find the rule |
| C | 20261130 | out of sample: never looked at while the rule was built |
| D | 20261141 | out of sample: drawn after 65 other documents were set aside for another experiment |

## Result (the run of this change, `--regimes --check`, one run, deterministic)

```
arm                     B right/wrong   C right/wrong   D right/wrong    pooled right/wrong  precision  coverage of answerable
shipped                  5/12            0/6             13/26            18/44               0.290      6.4% of 964
shipped + np             17/5            3/6             29/18            49/29               0.628      8.1% of 964
adjudicated              12/23           2/11            26/58            40/92               0.303      13.7% of 964
adjudicated + np         43/12           9/23            49/35            101/70              0.591      17.7% of 964
null+presence            35/16           33/18           16/31            84/65               0.564      15.5% of 964
null+presence + np       35/8            33/12           17/15            85/35               0.708      12.4% of 964
```

Read it so:

- At the shipped dials, binding precision is **29%** (18 right, 44 wrong), on 6.4% of the answerable pronouns. The ruling takes it to
  **63%** (49 right, 29 wrong) and loses no right binding on any slice.
- **Out of sample** (C and D only, the rule never saw them): shipped 13 right / 32 wrong (.29) → 32 right / 24 wrong (.57). The in-sample
  slice B (5/12 → 17/5) flatters the pooled figure; C alone is 0 → 3 right with 6 wrong either way, which is too few to say anything.
- The ruling lowers the wrong bindings in every regime and slice except slice C under two regimes: under shipped they stay at 6, and
  under adjudicated they rise from 11 to 23 while the right ones rise from 2 to 9 (the ruling frees the resolver to bind more, and more
  of what it binds is wrong there). It is a ruling on who may be a candidate, not a claim that the remaining bindings are good: **the most
  precise arm (null+presence + np) binds 12.4% of the answerable pronouns, and 35 of its 120 bindings are wrong.**
- This eval does not break the remaining wrong bindings down. The earlier reading of them, by hand on the third slice, found them
  mostly bound to another person or to a cast artifact rather than to a place or an organisation; the ruling cannot touch either.

## Not claimed

- That the shipped dials, or any of the three regimes, are the operating point. The regime question is a separate decision.
- That the ruling transfers beyond English, beyond GUM's genres, or to the hyperlexicon door's answers: this eval uses the local Wiktionary
  pack, and the door (`HL_DOOR`, port 11450) was not running when it was measured.
- That the golden's notion of right is the only one. It counts a binding right when the bound being overlaps a gold mention of the entity,
  which credits a being the cast has merged correctly and a cast artifact that happens to sit on a gold span alike.
- Anything about the cast itself: sentence-initial words admitted as beings are a different problem (see the PR description).
