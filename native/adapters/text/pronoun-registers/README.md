# Pronoun registers (PronounPrior@1), one file per language stem

`<stem>.json` = `{ schema: "PronounPrior@1", language, provenance, forms: { token: { gender: {Masc|Fem|Neut|_: n}, number: {Sing|Plur: n} } } }`, MEASURED from a treebank's features (never hand-listed):
third-person personal pronouns (UD PronType=Prs, Person=3, or the language's own marking), with counts. `adapters/text/pronouns.js::normalizePronounClass` turns the counts into clean (gender vetoes) and soft (gender prefers) members.
Loaded by `adapters/text/pronoun-registers.js::registerFor(stem)`: this folder first, then the priors folder's `pronoun-<stem>.json`. English uses the resolver's built-in class (measured numbers in native/docs/PRONOUN-BINDING-STATUS.md).
`grc.json` starts as a copy of the janus prior (UD_Ancient_Greek-PROIEL test file only, 509 third-person tokens, article forms included): it is the baseline to beat, not a finished register.
Stems with no register get the typed gap `pronoun_presence_no_register` on the entry.
