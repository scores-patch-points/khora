# priors-shipped

Priors khora ships itself, read by `the-fold/prior-source.mjs` last, for a name neither the janus home nor KHORA_PRIORS_DIR holds. Each file is derived by a script in this repo from a received treebank and carries its giver and licence.

| file | derived by | from |
|---|---|---|
| `frame-san.json` | identity/pronouns-multilingual/san/build-frame.mjs | UD Sanskrit-Vedic (CC BY-SA 4.0): without it the Sanskrit read has no cast |
| `convention-spread-eng.json` | identity/novels/build-convention-spread.mjs | UD English-GUM train (CC BY 4.0), counts only: the per-document spread the convention rung (round 31, opt-in) reads as its null |
