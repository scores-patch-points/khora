# Pronoun binding: what the canonical read does, and the numbers to check any change against

**Standing: measured, provisional.** Evidence: `identity/novels/NOVELS-RESULTS-ROUND10.md`, `PREREG-ROUND10.md`, `PREREG-ROUND11.md`, the ledger `identity/LEARNING-ABOUT-LEARNING.md` (entries 22-31). They win any disagreement with this page.

## What the read does
`native/the-fold/read-process.mjs::readToWeft` binds the third-person singular **he/she class** (he him his himself she her hers herself) by decayed presence over the cast (`adapters/text/pronouns.js::resolvePronounsByPresence`), with the dials `PRONOUN_PRESENCE_DEFAULT` (`adapters/text/pronoun-presence-chosen.js`: window 4, boost 2, feed 1, floor 2, margin 0.3). The result is `pronounsPresence` on the entry. **English only**: in another language the entry carries the typed gap `pronoun_presence_english_only`. Off: `readerOptions: { pronounPresence: null }`. Never bound: I, you, we, it, they, relatives, descriptions.

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

## Regression check
`GUM_TRAIN=en_gum-ud-train.conllu KHORA_PRIORS_DIR=... node identity/novels/gum-falsify3.mjs F` (and E, C, D) should reproduce the table within sampling noise; a lower pooled precision at the same coverage is a regression. Mandarin and Ancient Greek: not working (the reader builds no cast in Chinese; the pronoun registry has English only); see `identity/pronouns-multilingual/` if present.
