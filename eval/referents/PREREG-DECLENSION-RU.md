# PREREG-DECLENSION-RU — the declension fold behind the read, on Russian names (UD Russian), pre-registered

Registered 2026-10-27 by `referent-read`, after the wiring and its unit tests exist (`native/the-fold/declension-wiring.test.mjs`, 8 tests, commit `eb2c9a7`) and before any
UD Russian text is read by the reader with the option on or off. Hash and time beside it (`.sha256`, `.time`) and in the log entry that freezes the commit.
Leave: the user said "go" (2026-10-27) for this unit, which the coordinating session relayed from claude-ring (h4, claude-ring-20 and -23: "Пьер, Пьера, Пьеру are one being (ru)" on the scoreboard).

## What is claimed

`readWith(text, { declension: true })` (and `readDocument`, which forwards options) folds the case forms of a name into one being: the language's UniMorph rule table (`janus/priors/declension-rus.json`,
sha256 `c3d20b04d6be10704ae15fb2524cc456958006516a3425c8c7785261e2670237`, 89 rules, giver `github.com/unimorph/rus`) is handed, pairwise, to the organs the index already takes (`discoverReferents`, `namesCorefer`),
gated by the language's own part-of-speech prior (`janus/priors/pos-rus.json`, sha256 `92bc492f49c846a0c749f577d47723e105a26ce3b7b71cbb522c73abd80093d3`, built from UD_Russian-GSD train): a form it has seen used more
as other than as NOUN, PROPN or ADJ is not folded, an unseen form is. One ending source, named: `declension-rus.json`; the janus `endings-rus-hl.json` is not read (hyperlexicon-optimization-21: it adds nothing on the Russian text on disk).
Off by default, byte-identical off. With no prior for the language, or no part-of-speech prior, a typed gap and no fold.

## Data (UD_Russian, `/Users/mlacy/Downloads/workspace/data/ud/`)

- **D, design:** `UD_Russian-Taiga/ru_taiga-ud-dev.conllu` (sha256 `91e8be6f74afd91623500d73954c5595db51a2eb3c7b0e02e38fb3b2508b1b6f`), 9 documents. The implementation may be iterated against D; the bars may not.
- **T, confirmation, fresh:** `UD_Russian-Taiga/ru_taiga-ud-test.conllu` (sha256 `14183d7f002557e9e26b85e212dc54fe3f7929a7d72491615c50b9b3145e6278`), 9 documents. Read once, after the implementation commit is frozen and logged. Taiga is out of the part-of-speech prior's training data (GSD train).
- **S, cross-check, reported and not a confirmation:** `UD_Russian-GSD/ru_gsd-ud-test.conllu` (sha256 `f26e022329162a1c6306f76644d06f770f1572501755421165387137fe63138d`), 601 sentences cut into blocks of 100 sentences (the file has no document marks). GSD train built the part-of-speech prior, so the gate is in-distribution here.
Documents are the files' `# newdoc` units; the text is the sentences' `# text` joined by one space; `language: "ru"`, `minCharacters: 0`, no lexicon.

## Measure

**Gold names.** In each sentence, a maximal run of consecutive PROPN tokens is one name; its gold identity is the lower-cased lemma sequence of the run (UD's lemma column: the case forms of one name share it), its span runs from the first token's first character to the last token's last.
**Evaluation set G:** gold names that at least one *plain-arm* cast span overlaps (more than 0 characters). All arms are scored over this one set, and over one universe: every arm labels a gold name from `entry.cast` (the beings), never `entry.heard`.
**Labels:** the `ref` of the cast span with the largest overlap (ties: the earlier-starting span, then the longer); a gold name with no cast span in an arm is a singleton cluster of its own.
**Scores:** pairwise precision, recall and F1 over G (two gold names are a gold pair when their identities are equal), and B-cubed, micro-pooled over the split.
**Arms:** `plain` (no option); `gated` (`declension: true`); `ungated` (the same rule table handed to the same organs without the part-of-speech gate, through `readerOptions`); `control` (see below).

## Controls (built to fail)

- **C1, a shuffled prior:** the rule table's `to` sides permuted among its rules (a seeded Fisher-Yates, seed 20261127), read with the gated option, 19 draws. Its recall gain over plain is the null: the real gain must exceed all 19 (one-sided p = 1/20).
- **C2, option off:** the entries of `readWith(text, opts)` and of `readWith(text, { ...opts, declension: false })` on this branch are byte-identical (`ms` zeroed) to those of the base commit, over every document of D, T and S and the unit-test fixtures.
- **C3, a gate seen firing:** the unit test shows the gate refusing a verb and a pronoun the rule alone reaches; a mutation of the module that removes the gate fails it (done: the gate test fails).

## Bars (decided now)

- **B1** gated pairwise recall is above plain's, and the gain exceeds every one of the 19 shuffled-prior gains, on D and on T.
- **B2** gated pairwise F1 is at least plain's (the recall must not be bought with more precision than it earns), on D and on T.
- **B3** gated pairwise precision and F1 are each at least ungated's minus 0.005 (0.005 is the user's own margin): the gate must not cost anything the rule alone gets right.
- **B4** the 8 unit tests pass; the CI workflow's own steps (native parity gate, organs, root `npm test`, `npm run test:code`) pass.
- **B5** C2 holds.

## Decision rule and what is not claimed

All of B1 to B5 hold on T and the PR's CI is green: merge and log the merged sha. Any fails: a finding, reported with numbers, unmerged. The option is off by default either way.
Not claimed whatever the numbers: that the fold is right for any case the rule table does not reach (a stem alternation such as Пётр / Петра stays two, as a known limit); that two people who share a name are told apart (a name is a name; the fold is on the spelling's case, not on the person: aligned-English person identity is a different measure, hyperlexicon-optimization-16);
that anything holds for another language (only Russian has a declension prior and a UD part-of-speech prior here). A name-class gate that rejects a form it has not seen would be a different design; this one admits the unseen.
Reported, not barred: B-cubed, the number of beings in each arm, the milliseconds, and the first twenty folds that join two gold identities (for reading).
