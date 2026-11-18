# Reading baseline changes (append-only; written by record.mjs)

## 2026-11-17: baseline recorded: English pronoun binding measured on 125 GUM documents (0.689 precision, 49.5% of answerable); the error diagnosis (69% of the wrong bindings are non-persons: the non-personal ruling is absent on this machine); per-language registers, autonym registry and the typed gaps pronoun_presence_no_register / _unmeasured / _no_nonpersonal_ruling
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/the-fold/language-grammar.js, native/the-fold/language-names.js, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/adapters/text/pronoun-presence-chosen.js, native/adapters/text/clause-attach.js, native/adapters/text/non-personal.js

## 2026-11-17: added the non-personal-ruling gap to the canonical read; language names registry; status docs
files changed since the last record: (none)

## 2026-11-17: the generated language names data is now guarded too
files changed since the last record: native/the-fold/language-names.data.js

## 2026-11-18: the canonical English read applies the measured name ruling (name-prior.js, from UD English GUM train): precision 0.874 -> 0.911 at unchanged coverage on 66 unseen GUM documents (PREREG-ROUND14, NOVELS-RESULTS-ROUND14); read-core gains the namePersonhood hook, read-process passes it for English only
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/name-prior.js, native/adapters/text/name-prior/eng.json

## 2026-11-18: docs only: status note
files changed since the last record: (none)
