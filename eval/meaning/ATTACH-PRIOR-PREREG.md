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
- **P1 beats no prior.** On the dev instances the prior decides, the rule is more accurate than the lemma-blind majority class of the train split (always VERB or always
  NOUN, whichever train held more). Strictly greater, in each language reported. A language where it is not greater is reported as a failure, not dropped.
- **P2 coverage is reported**, not barred: the share of dev instances the prior decides, per language.
- **P3 reach.** At least three languages with dative-marked instances in dev (declared: en es fr; ja and de by Case=Dat/に where the treebank has them) are measured; a language with
  fewer than 30 dev instances is reported as too few, not as a pass.
- **P4 determinism.** The prior's bytes are identical on a second build.
- **Control built to fail.** The same prior with the lemmas deranged (each lemma's counts given to another lemma) must fall to or below the lemma-blind majority class on dev.
  If it does not, the prior is reading something other than the verb.

## Stage 2, registered now and run only if P1 holds in at least two languages
The reader re-attaches a dative phrase hanging on the object to the verb when the prior says VERB (atoms.js, where the declared recipient word marks the phrase), on the held-out dev
SENTENCES run through khora's own parser (not gold): the attachment the parser gave against gold, with and without the prior. Bar: strictly fewer wrong attachments among
decided instances with the prior than without; and the 108 English pairs, the 448 non-English texts and the full native suite move only where an atom moves (each change read).
A parser that already agrees with the prior gains nothing, and that is the finding to report.

## What would falsify the whole idea
The lemma-blind majority class matches the prior on dev (attachment is not lexical enough to learn from thousands of sentences); or the deranged control matches it (the
prior is a proxy for something else); or the prior helps gold but changes no parser attachment (the parser has already learned it).
