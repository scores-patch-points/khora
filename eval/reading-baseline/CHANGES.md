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

## 2026-11-18: Greek and Sanskrit read their clauses through the case-marked (Chomsky) seam: 0 clauses became 64 (grc sample) and 48 (san sample) with null subjects recorded; the pronoun rung takes an optional roles input (case-read subject, co-argument rule), default off by the preregistered rule (PREREG-ROUND19, NOVELS-RESULTS-ROUND19); greek.mjs moved to adapters/text/greek-seam.js; frame-san.json ships in native/priors-shipped; grc and san registers carry their evaluation
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/adapters/text/case-marked-clauses.js, native/adapters/text/greek-seam.js, native/the-fold/prior-source.mjs, native/adapters/text/pronoun-registers/grc.json, native/adapters/text/pronoun-registers/san.json, native/priors-shipped/frame-san.json

## 2026-11-18: docs only: the Greek register's share table moved out of the registers directory (the guard reads every json there as a register)
files changed since the last record: (none)

## 2026-11-18: docs and result files only
files changed since the last record: (none)

## 2026-11-18: one priors-home rule (prior-source.mjs: KHORA_PRIORS_DIR, janus beside the workspace, ~/Documents/janus/priors, vendored); pronoun-registers reads the same door; overcomeable non-personal ruling is the default in the read (pp.nonPersonalSoft ?? true); rung options priorGender, genderModel (surprise-weighted gender, experimental, off) and roles
files changed since the last record: native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/pronoun-registers.js, native/the-fold/prior-source.mjs

## 2026-11-18: per-language competency profile on the entry (language-competency.js); English evaluation recorded with the soft ruling
files changed since the last record: native/the-fold/read-core.mjs, native/adapters/text/pronouns.js

## 2026-11-18: language-competency.js is reading-critical
files changed since the last record: native/adapters/text/language-competency.js

## 2026-11-18: Greek binds dropped (null) subjects by default (PREREG-ROUND21 / NOVELS-RESULTS-ROUND21: 0.551 precision at 43.3% coverage on 809 answerable gold dropped subjects, above the shuffled null; overt bindings unchanged); the competency profile states it
files changed since the last record: native/the-fold/read-process.mjs, native/the-fold/read-core.mjs, native/adapters/text/pronouns.js, native/adapters/text/case-marked-clauses.js, native/adapters/text/language-competency.js
