# negation-forms — free-standing negation words per language, from Universal Dependencies gold

Generated 2026-11-24T04:45:23Z for the reader session (item 6, negation marks) by the grammatical-categories session. Derived data, not a hypothesis test: no preregistration; every number below is exploratory and tied to the files' sha256.
- `negation-forms.mjs` sha256 ddfcadd880f49bca046bbfb4ca38322b3dfdd8a96874a6085cd56d545ecb63c8
- `negation-forms.json` sha256 ca51ff368a4a8756f90ad7f864a9660c62104afa1bb72b0ec7bc368904dcd5eb

## What it is
Per language, the forms whose UD gold carries **Polarity=Neg** (the negative particle: "not", "n't", "nor", Finnish "ei") or **PronType=Neg** (negative pronouns, determiners, adverbs: "nothing", "nobody", "never", "no" as a determiner), each with its UPOS (one word, two parts of speech, two entries), the counts of each feature, how many times the form+UPOS occurs in all, and the share of those occurrences that are marked. VERB tokens are not listed: where a language negates inside the verb (Czech ne-, Turkish -me-, Kazakh), `affixalVerbRate` says what share of its verbs carry Polarity=Neg and a form list cannot carry it.

**The finding that explains reader item 6:** in the English gold, "never", "nothing", "nobody", "none", "nowhere" and "no" as a determiner carry **PronType=Neg, not Polarity=Neg**; Polarity=Neg is on "not", "n't", "nor", "neither" (CCONJ) and the interjection "no". "without" (ADP, SCONJ) carries no negation feature at all. A list from Polarity=Neg alone misses exactly the words item 6 names.

## Giver and split (named)
- **Giver:** the UD treebank's own annotation (human or converted; its quality differs by treebank and was not audited). Source: github.com/UniversalDependencies, shallow clones in workspace/ud-treebanks (commit per treebank in the file); English from the UD_English-EWT copy in eo-lexical-analysis/data/crossling/English (licence recorded as CC BY-SA 4.0, not verified from that copy).
- **Selection:** per language, the treebank whose train gold marks the most free-standing negation (ties: the larger train); chosen from train counts only, not from the held-out numbers.
- **Split:** the list is built from the **train** split; recall and precision are measured on the **dev** split (test when there is no dev). A language with no train split has its list built from what exists and carries `heldout: null`: no claim.
- **Dial:** `dominantOnly` keeps forms whose marked share is at least 0.5 (a declared dial, reported beside the unfiltered list).

## Numbers (exploratory, dev split, languages with at least 20 marked held-out tokens)
245 languages; 169 have annotated free-standing negators in their chosen treebank, 76 do not (negation is inside the verb, or the treebank does not annotate Polarity or PronType; absence is not evidence about the language). 73 languages have a held-out check of 20 or more marked tokens: macro recall 0.904 and precision 0.882 for the whole list; 0.844 and 0.983 for the dominant forms. **English (EWT train to dev):** 273 marked dev tokens, recall 1.00, precision 0.986 (dominant-only: precision 1.00); listed forms include not, n't, nt, n’t, no (DET), never, nothing, nobody, none, nowhere, no one ("one"/PRON, 21 of 44 occurrences marked), nor, neither.

## Limits (read before using)
- It is the gold's idea of negation in the treebank's genre (web text for EWT). **Chat spelling ("dont", "cant", "nope", "nah", "naw", "nvm") is not covered unless the treebank had it**; "nt" and "n’t" are there because EWT has them. Nothing here was tested on chat.
- A list is a lexicon, not a reading: "no" as ADV (24 occurrences in EWT) is unmarked, so the form alone is not enough; the UPOS has to come from the reader. Scope of a negation (what it negates) is not in this file.
- Licences: 36 languages' lists come from CC BY-NC-SA treebanks (flagged `nc: true`); the file holds aggregate counts of forms, no sentence text, but do not ship it in anything commercial.
- Nothing is wired into any reader path or the priors home; the owner of the reader decides.
