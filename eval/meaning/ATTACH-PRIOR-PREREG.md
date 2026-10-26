# AttachPrior@1 — where a dative phrase attaches is a fact about the verb, induced from gold in every language. Pre-registered 2026-10-26, before any prior is built

**The finding that motivates it** (an exploratory count, not a test; `UD_English-*` train+dev, 18 files; a verb with a direct object and a "to"-phrase after it, the phrase
attached to the verb (obl) or to the object noun (nmod)): attachment is lexical. send 57:1, bring 37:1, pay 15:1, add 51:0, say 34:0, recommend 28:1 attach to the verb;
show 23:649 (ATIS "flights to Boston"), list 1:338, need 0:136, find 2:95 attach to the noun; give 116:121 is mixed; sell 8:0 and license 1:0 are thin. The English reader attaches
"to Sagard" to the noun after a determiner and to the verb when the object is bare (`recipient-role.test.mjs`, the `todo`), which a per-verb fact would decide.

**Why not VerbNet.** English only, not a shipped prior, and a hand-curated list in the sense of lesson 71. A treebank is the same giver in every language
the repo has one for (365 treebanks on disk), and it states the attachment directly. Open content (which verb takes a recipient) is induced, never listed (lesson 71);
what is declared is only the closed class that marks a recipient (`RECIPIENT` in grammar-packs.js, and UD `Case=Dat`).

## The prior
`native/scripts/build-attach-prior.mjs --code=<iso> --dir=UD_<treebank>` writes `AttachPrior@1`: for each verb lemma, `{verb, noun}` = how often a dative-marked phrase after
the verb's object hangs on the verb vs on the object. A phrase is dative-marked when its case word is the language's declared recipient adposition or the phrase carries
`Case=Dat`. Provenance as `UDGrammar@1`: treebank, train file and sha256, the split rule, and the held-out score below. Train split only.

## The decision rule (no threshold)
For a verb lemma the prior says VERB if `verb > noun`, NOUN if `noun > verb`, and ABSTAINS on a tie or an unseen lemma (the reader then keeps the parser's attachment: a missing
fact degrades to what the parser said, never to a guess).

## Bars, on the official DEV split of each treebank (held out; the test split is not opened until the final run, once)
- **B1 beats no prior.** On the dev instances the prior decides, the rule is more accurate than the lemma-blind majority class of the train split (always VERB or always
  NOUN, whichever train held more). Strictly greater, in each language reported. A language where it is not greater is reported as a failure, not dropped.
- **B2 coverage is reported**, not barred: the share of dev instances the prior decides, per language.
- **B3 reach.** At least three languages with dative-marked instances in dev (declared: en es fr; ja and de by Case=Dat/に where the treebank has them) are measured; a language with
  fewer than 30 dev instances is reported as too few, not as a pass.
- **B4 determinism.** The prior's bytes are identical on a second build.
- **Control built to fail.** The same prior with the lemmas deranged (each lemma's counts given to another lemma) must fall to or below the lemma-blind majority class on dev.
  If it does not, the prior is reading something other than the verb.

## Stage 2, registered now and run only if B1 holds in at least two languages
The reader re-attaches a dative phrase hanging on the object to the verb when the prior says VERB (atoms.js, where the declared recipient word marks the phrase), on the held-out dev
SENTENCES run through khora's own parser (not gold): the attachment the parser gave against gold, with and without the prior. Bar: strictly fewer wrong attachments among
decided instances with the prior than without; and the 108 English pairs, the 448 non-English texts and the full native suite move only where an atom moves (each change read).
A parser that already agrees with the prior gains nothing, and that is the finding to report.

## What would falsify the whole idea
The lemma-blind majority class matches the prior on dev (attachment is not lexical enough to learn from thousands of sentences); or the deranged control matches it (the
prior is a proxy for something else); or the prior helps gold but changes no parser attachment (the parser has already learned it).

---

## RESULT 1 (2026-10-26; code `native/kernel/attach-prior.js` + `native/scripts/build-attach-prior.mjs` at the commit that adds this block; per treebank, train builds, official dev scores)

| treebank | train inst. | dev inst. | dev coverage | prior (decided) | lemma-blind majority (same instances) | deranged control | B1 |
|---|---|---|---|---|---|---|---|
| English EWT | 417 | 46 | 0.761 | 0.943 | 0.886 | 0.571 | **met** |
| English GUM | 325 | 46 | 0.674 | 0.774 | 0.903 | 0.581 | missed |
| English LinES | 161 | 53 | 0.547 | 1.000 | 1.000 | 0.931 | missed (a tie is not strictly greater) |
| Spanish AnCora | 1358 | 183 | 0.869 | 0.811 | 0.805 | 0.747 | **met** (by 0.006: 1 instance in 159) |
| Spanish GSD | 851 | 58 | 0.707 | 0.780 | 0.756 | 0.625 | **met** (by 0.024) |
| French GSD | 1236 | 132 | 0.780 | 0.845 | 0.874 | 0.769 | missed |
| French Sequoia | 162 | 37 | 0.568 | 0.571 | 0.905 | 0.810 | missed |
| German GSD | 2377 | 133 | 0.699 | 0.688 | 0.742 | 0.563 | missed |
| Japanese GSD | 251 | 13 | 0.692 | 1.000 | 1.000 | 1.000 | too few (13 < 30), reported, not a pass |

- **B1: NOT MET.** 3 of 9 treebanks beat the lemma-blind majority; by language, English is mixed (1 of 3), Spanish 2 of 2, French 0 of 2, German 0 of 1. "Strictly greater in each language reported" fails.
- **B4 met** (every build byte-identical on a second run). **The deranged control fell** everywhere (at or below the majority), but that is weak evidence here: the majority class alone is 0.74 to 1.00, so almost any rule matches it.
- **Stage 2 is NOT run**: it was registered to run only if B1 held in at least two languages. English is mixed and Spanish holds by a margin of one to four instances on dev sets of 58 and 183.
- **The exploratory count did not survive held-out scoring.** send 57:1 and bring 37:1 were counted on train+dev pooled over 18 files; scored on a held-out dev, a per-verb prior is not reliably better than "the dative phrase hangs on the verb" (or on the noun, in ATIS-like corpora). The dev sets are small (13 to 183 instances), so a difference of one or two instances is the whole margin: this result cannot show the prior is useless, only that it is not shown useful.
- **What is learned, universal:** a lexical signal seen in a pooled count is a hypothesis; held-out scoring against the strongest lemma-blind baseline is what decides it, and the baseline here (the corpus's majority attachment) is strong.

---

## AMENDMENT 1 (2026-10-26, written after RESULT 1 and before this run; RESULT 1 stands)

RESULT 1's training sets are small (161 to 2377 instances) and the signal appeared pooled. So: for each language, pool the train splits of ALL its treebanks that have both a train and a
dev split, and score on the pooled dev splits. Everything else is as registered: the rule (strict majority, a tie or unseen lemma abstains), the lemma-blind majority class of the pooled
train, B1 to B4, the deranged control. One run, no re-tuning. The risk that makes it a fair test and not a rescue: pooling mixes genres (ATIS "flights to Boston" is noun-attached, a
filing is verb-attached), so a prior pooled across genres can be worse than any one genre's; if so that is the result. Languages: those with at least 2 such treebanks and
dative-marked instances: en, es, fr, de (ja has one). If B1 holds in at least two of the four languages, stage 2 is run as registered; otherwise the idea is closed here.

---

## RESULT 2 — Amendment 1, pooled per language (2026-10-26; one run, nothing re-tuned; RESULT 1 stands beside it)

| language | pooled treebanks (train+dev both present) | train inst. | dev inst. | coverage | prior | lemma-blind majority | deranged control | B1 |
|---|---|---|---|---|---|---|---|---|
| en | 11 treebanks (Atis, CHILDES, ESL, ESLSpok, EWT, GUM, GUMReddit, LinES, ParTUT, ...) | 2734 | 381 | 0.913 | 0.897 | 0.603 | 0.354 | **met** (+0.294) |
| es | AnCora + GSD | 2209 | 241 | 0.871 | 0.810 | 0.800 | 0.689 | **met** (+0.010, about 2 instances) |
| fr | 9 treebanks | 1785 | 244 | 0.840 | 0.829 | 0.834 | 0.755 | missed (-0.005) |
| de | GSD only (the others lack a train or a dev split here) | 2377 | 133 | 0.699 | 0.688 | 0.742 | 0.563 | missed |

B1 holds in 2 of 4 languages: stage 2 runs as registered. B4 met in all four; the deranged control fell in all four.
The English margin is large because pooled genres (ATIS noun-attached, filings verb-attached) make the lemma-blind majority weak: the prior is learning the verb AND, partly, the genre the verb
appears in. That is disclosed, not corrected: the reader sees one sentence of one genre.

## RESULT 3 — stage 2: khora's own parser on the held-out dev SENTENCES against gold (same pooled priors; `eval/meaning/attach-stage2.mjs`)

| | en | es |
|---|---|---|
| dev sentences with a gold instance | 371 (19 skipped: tokenisation differs) | 230 (25 skipped) |
| instances / decided by the prior | 360 / 331 | 215 / 187 |
| **parser wrong, of the decided** (the phrase on the wrong head, or elsewhere) | 157 | 63 |
| **with the prior wrong, of the decided** | 35 | 36 |
| of those, instances where the parser chose between the verb and the noun | 224 | 162 |
| parser wrong / with prior wrong, among those | **50 / 26** | **38 / 30** |
| the parser attached the phrase elsewhere (neither verb nor object noun) | 107 | 25 |

- **Bar met in both languages, strictly** (35 < 157 and 36 < 63; and on the verb-or-noun subset, 26 < 50 and 30 < 38). The honest size of the gain is the subset: English roughly halves
  its verb-or-noun errors (22% to 12%); Spanish moves from 23% to 19%, about 8 of 162. The prior does not help where the parser attaches the phrase elsewhere (107 English instances):
  a re-attachment rule that only moves nmod-of-object to the verb cannot reach those.
- **Not yet measured, so not claimed:** that wiring it into the reader changes any atom, verdict or the `todo` test. The registered check (the 108 English pairs, the 448 non-English texts and the
  full native suite move only where an atom moves, each change read) is the next step and needs the priors shipped (janus/priors/attach-<lang>.json) and the reader to load them.
- **What is learned:** the verdict on a lexical prior depends on the baseline it is held against. Per treebank and against the corpus majority it mostly failed; pooled it passes in two languages,
  partly because pooling makes the baseline weaker. Both numbers are kept.
