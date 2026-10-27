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
- Anything about the cast itself: sentence-initial words admitted as beings are a different problem, measured below by `cast-initial.mjs`.

# The cast: a capital that is only the sentence's

The cast (`read-core.mjs`) names a being what the capital tier names. A word the text never writes lower-case, whose one capital the sentence
cut calls mid-sentence ("Grab" after a heading with no full stop, "Well" in a transcript), used to pass on that capital: `surfaces.js` read
"capitalised, never lower-case" as the strongest evidence of a name and skipped the test it runs for every word written both ways. A probe over GUM
slices B, C and D before this change found 70 of 2,321 cast beings that were one word with every mention at a sentence start; about 32 had no gold mention (IF, Well, First,
After, Why, While, Actually, Create, Wow, Sometimes …).

A capital is a **convention**, kept more or less by a text, not a rule. Its home is **janus**: `priors/conventions-eng.json` (`Conventions@1`),
built by janus `scripts/build-conventions-prior.mjs` and folded by `native/organs/nomos.js` into one `NomosRule@1` per convention, each with the
standing of its own giver or builder, its witnesses, the address where the reader stands on it, and where it departs. There are four (a capital marks a
name; a capital opens a sentence; a sentence end is marked; the treebank attests a form's use). khora holds no copy: `native/adapters/text/conventions.js`
reads the prior as data (`conventionOf(prior, stem)`), the cast's report cites the conventions it read by, and an absent prior is a typed gap. The
figures are measured by the builder on GUM train (sha256 pinned in the prior) and describe how closely English keeps each convention: a name is a
capital mid-sentence 97.1% of the time, a word that is not a name 3.1%, so a mid-sentence capital is a name 68.9% of the time; a sentence-initial
capital is a name 8.0% of the time; 9.1% of gold sentences end with no terminal mark. The cast never reads them. (The frozen registrations
`PREREG-CAST*.md` name `conventions.js` and `convention-witness.mjs` as they were when written; the measuring moved to the builder, with the same counts.)

## The change

One branch in `surfaces.js::surfacesFromEvidence`, in the test the file already has. For a single word with no lower-case occurrence in the text,
`form-usage.js` hands it the received treebank's use of the form (`pos-eng.json`, UD_English-EWT, tag counts kept; read through the repo's own
`wordclass.js::classifyWord`): `nominal` (tagged NOUN, PROPN or ADJ) and `other`. The same exact tail and the same alpha as the two-sided test asks
whether `other` exceeds what `nominal` plus the text's own capitals balance. "Grab" (8 uses, all verbs) is refused on its one capital; "Government"
never is; a form the treebank has not seen is undecided and stays a being; a word the text also writes lower-case is not asked. A refused word
leaves `entry.cast` and stays in `entry.heard`. English only, and only with a pos prior: another language, or no prior, reads as before.
No word list, no part-of-speech rule, no lexicon.

```bash
GUM_TRAIN=/path/to/en_gum-ud-train.conllu node eval/referents/cast-initial.mjs [--set E|A] [--json out.json]
```

## Pre-registration

`PREREG-CAST.md` (sha256 in `PREREG-CAST.sha`, 2026-10-27T14:13:51Z) fixed the bars and the sets before any code; `PREREG-CAST-A1.md`
(`PREREG-CAST-A1.sha`, 2026-10-27T14:26:42Z) amended the *mechanism* after slice A was read and before E, B, C or D was scored. It says what A
overturned: the first mechanism (the lexicon's name-sense share as the null of the tail) was inverted in direction and dropped 22% of the gold-overlapping
beings on A; no dictionary-only rating separates "Grab" from "Google" (a verb in Wiktionary); and the defect is not the eval's space-join (a newline
join leaves 26 of 27). The bar numbers were not changed.

| set | draw | role |
|---|---|---|
| A | 30 documents, seed 20261110 | design: the rule's form was chosen on it (in-sample) |
| E | 30 of the 65 documents set aside by seed 20261140, mulberry32 seed 20261150 | confirmation: scored once, after A1 |
| B, C, D | the pronoun golden's slices | regression of the pronoun binding |

## Result

```
set E (confirmation, out of sample): cast beings 869 -> 843; initial-only single-word 37 (14 with a gold mention, 23 without)
B1  held     15 of 23 = 65.2%  initial-only beings without a gold mention dropped (bar >= 50%)
B2  held     initial-only with a gold mention dropped 1 of 14 = 7.1% (bar <= 25%); all gold-overlapping dropped 7 of 831 = 0.8% (bar <= 1.0%)
B3  held     share of cast beings with a gold mention 95.63% -> 97.75%
B4  held     0 beings added, 0 multi-word surfaces dropped
B5  held     30 documents of E (pos prior withheld) and a German passage read to byte-identical entries by the base commit and by this one
B6  held     pronoun golden, B+C+D, default run: shipped 18 right / 44 wrong, shipped + np 49 right / 29 wrong; the same as before
K1  drop every initial-only being: B2 FAILED (14 of 14 dropped), as built
K2  shuffled giver: B1 FAILED (1 of 23) and B2 FAILED (9 of 831 = 1.1%), as built
```

Design set A, for comparison (in-sample; the bars were registered for E): 827 -> 804; B1 63.6% (7 of 11); B2 would FAIL, 6 of 16 initial-only with gold
(37.5%: "Anything", "We", "Three", "Each", "Figure", "He": a pronoun, a determiner, a numeral, a caption) and 12 of 806 gold-overlapping (1.5%).

The 26 dropped on E: 15 initial-only without gold (However, Together, Imagine, Try, How ×2, Probably, While, Yeah, Oh ×2, Why, On, Somehow, Who),
1 initial-only with gold (What), 6 other gold-overlapping (Let, My, Still, Figure, Hi, May), 4 other without (Hey ×2, Yeah, Wow). The 8 initial-only
beings without gold that stay on E: Due, Describe, Distinguish, Sorry, Breathing, Mm, Okay, Operating ("Okay" is tagged ADJ and INTJ in the treebank, so
its nominal share is not low; the imperatives the treebank has not seen are undecided). Reported with no bar: the narrower class (NOUN and PROPN only)
drops 18 of the 23 but 26 of 831 gold-overlapping beings (3.1%); on A the extra losses were mostly demonyms.

## Not shown

- That it transfers beyond English, beyond GUM's genres, or to the hyperlexicon door's answers. E is one draw of 30 documents with 23 false admissions
  in it: 15 of 23 has a wide interval.
- That the pronoun bindings improve: the golden is unchanged to the digit, which is what B6 asked, not more.
- The cause. The sentence cut does not break at a heading that carries no full stop, with or without a newline; the cast only decides what to do with
  the lone capital the cut leaves. Eight false admissions stay on E, and a fix in `spans.js::splitSentences` would change every downstream count.
- A case-aware prior. `pos-eng.json` is keyed on the case-folded form, so a name whose lower-case twin is a function word ("May", "Will") is judged by
  the twin's use and is refused unless the text's capitals nearly balance it. That is one of the 7 gold-overlapping beings dropped on E.
- That the adjective belongs in the nominal class on principle: it was added after A showed the narrower class dropping 17 demonym occurrences, a choice
  made by reading A and recorded in A1.
- That "gold-overlapping" means "a being": GUM marks "What", "Let", "My" and "Hi" as mentions, and the bars count their loss against the rule.
- That the registration is independent of me: it is hashed and timestamped by this machine's clock and lands in the same PR as the code, so it shows
  the order of work (A1 before E) to a reader who trusts the clock, and nothing more.


## referent-read.mjs — the referent ledger against the plain index (pre-registered)

`readWith(text, { referents: true })` adds `entry.referents` (ReadingReferents@1, `native/adapters/text/reading-referents.js`): a referent inserted once and addressed
`ref_<hash of its INS event>` (never a slug of a spelling), spans content-addressed, mentions bound by CON events, edges between referents per statement, and typed gaps for
what the spans cannot decide. The plain index (`entry.cast`, `ref:auto:<slug>`) is untouched, so the two arms are one read. The option is off by default and the entry is then byte-identical.

```bash
GUM_TRAIN=/path/en_gum-ud-train.conllu node eval/referents/referent-read.mjs --slice A,E,F [--out f.json] [--dump-off f.json --dump-only]
```

Scores name clustering (B-cubed and pairwise, micro-pooled) of both arms over the same gold names (PROPN-headed, non-nested, covered by a plain cast span), a shuffled-assignment control, and
(with `--dump-off`) hashes of the entries read without the option, to be diffed between the base commit and the branch. The registration is `PREREG-REFERENT-READ.md` (and `-2`, an amendment
after the first confirmation slice came out red because the harness scored the arms over different universes); `.sha256` and `.time` sit beside each. Read the registrations before the numbers.
