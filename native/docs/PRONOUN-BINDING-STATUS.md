# Pronoun binding: what the canonical read does, and the numbers to check any change against

**Standing: measured, provisional.** Evidence: `identity/novels/NOVELS-RESULTS-ROUND10.md`, `PREREG-ROUND10.md`, `PREREG-ROUND11.md`, the ledger `identity/LEARNING-ABOUT-LEARNING.md` (entries 22-31). They win any disagreement with this page.

## What the read does
`native/the-fold/read-process.mjs::readToWeft` binds the third-person singular **he/she class** (he him his himself she her hers herself) by decayed presence over the cast (`adapters/text/pronouns.js::resolvePronounsByPresence`), with the dials `PRONOUN_PRESENCE_DEFAULT` (`adapters/text/pronoun-presence-chosen.js`: window 4, boost 2, feed 1, floor 2, margin 0.3). The result is `pronounsPresence` on the entry. Other languages use their own measured register (`adapters/text/pronoun-registers/<stem>.json`, else a `pronoun-<stem>.json` prior; unspaced scripts are matched without a word boundary); a language with no register carries the typed gap `pronoun_presence_no_register`. Off: `readerOptions: { pronounPresence: null }`. Never bound: I, you, we, it, they, relatives, descriptions.

## Measured on UD English GUM (a gold coreference corpus), documents no dial was tuned on
An answerable pronoun is a gold he/she whose entity has a named mention the cast covers; RIGHT iff the bound being's cast spans overlap a gold mention of that entity (the repo's own golden, `eval/referents/pronoun-golden.mjs`). One read per document, no Wiktionary pack on the machine, GUM master file sha256 `4672bc44...` (not the README's file).
| slice | docs | answerable | default dials: precision / coverage | chosen dials | random assignment |
|---|---|---|---|---|---|
| E (preregistered confirmation) | 30 | 329 | 0.716 / 43% | 0.492 / 78% | 0.403 |
| C | 30 | 254 | 0.669 / 56% | 0.796 / 71% | 0.713 |
| D | 30 | 369 | 0.703 / 47% | 0.610 / 90% | 0.447 |
| F (never touched) | 35 | 347 | 0.670 / 53% | 0.362 / 81% | 0.269 |
| pooled | 125 | 1,299 | **0.689** / ~51% | 0.547 / ~80% | ~0.5 |
By genre (chosen dials): biography 0.90, fiction 0.49, conversation 0.49, news 0.16. The binding's own margin does not separate right from wrong (precision flat across margin quartiles), so no margin setting buys precision.
Gold-free check on 48 novels: at least 17% of the pronouns bound by the chosen dials are provably wrong (a referent bound to both "he" and "she"); the default dials: about 15%.
The CHOSEN dials (window 3, boost 1, floor 0, margin 0; `PRESENCE-DIALS-B.json`, preregistered on slice B) are kept as `chosenPronounPresence()`; their 84% on slice B was in-sample.

## Why it is wrong 31% of the time (error diagnosis, `identity/novels/NOVELS-RESULTS-ROUND12.md`)
Of 200 wrong bindings on 92 GUM documents: **69% bound a non-person** (a topic, a place, an organisation: the ruling that refuses these, `adapters/text/non-personal.js`, needs the Wiktionary pack and is absent on the measuring machine; the read now says so with the gap `pronoun_presence_no_nonpersonal_ruling`), 25% lost the right antecedent to a more salient one (the winner's gender is usually unknown, so agreement cannot help), 5% had no earlier mention, 1.5% were the other gender. Three documents hold 43% of the errors. Refusing non-persons perfectly would give 0.875 precision at 39% coverage.

## Guards against a silent drop
`eval/reading-baseline/BASELINE.json` holds the reading-critical files' hashes next to the numbers they were measured at; `native/tests/reading-baseline.test.mjs` fails when either side changes alone (`record.mjs --note` re-records, `CHANGES.md` is the append-only log). No language but English binds unless its register carries an evaluation (`pronoun_presence_unmeasured`); no register is `pronoun_presence_no_register`. Languages are identified by their own name in their own script with English aliases (`native/the-fold/language-names.js`).

## Regression check
`GUM_TRAIN=en_gum-ud-train.conllu KHORA_PRIORS_DIR=... node identity/novels/gum-falsify3.mjs F` (and E, C, D) should reproduce the table within sampling noise; a lower pooled precision at the same coverage is a regression. Mandarin and Ancient Greek: not working (the reader builds no cast in Chinese; the pronoun registry has English only); see `identity/pronouns-multilingual/` if present.
