# Pronoun registers (PronounPrior@1), one file per language stem

`<stem>.json` = `{ schema: "PronounPrior@1", language, provenance, forms: { token: { gender: {Masc|Fem|Neut|_: n}, number: {Sing|Plur: n} } } }`, MEASURED from a treebank's features (never hand-listed):
third-person personal pronouns (UD PronType=Prs, Person=3, or the language's own marking), with counts. `adapters/text/pronouns.js::normalizePronounClass` turns the counts into clean (gender vetoes) and soft (gender prefers) members.
Loaded by `adapters/text/pronoun-registers.js::registerFor(stem)`: this folder first, then the priors folder's `pronoun-<stem>.json`. English uses the resolver's built-in class (measured numbers in native/docs/PRONOUN-BINDING-STATUS.md).
`grc.json` (Ancient Greek) is built by identity/pronouns-multilingual/grc/derive-register.mjs from the FULL UD Ancient_Greek-PROIEL (train+dev+test) and Perseus: a form is a member iff most of its tokens are UPOS PRON, most of its PRON tokens are third-person personal, singular outnumbers plural and its majority gender is Masc or Fem (so articles like οἱ, τὸν, τὰ, which the treebank tags DET, are out); `grc.shares.json` keeps every form's counts and shares. The old register (PROIEL test file only, articles included) is kept as identity/pronouns-multilingual/grc/register-base-main.json for comparison.
Stems with no register get the typed gap `pronoun_presence_no_register` on the entry.

## A register binds by default only if it carries its evaluation
Top-level `evaluation: { documents, answerable, precision, coverage, nullPrecision, resultsFile, method }` (precision = right / (right + wrong) of the bindings on gold or, where no gold exists, one minus the gold-free contradiction rate with the method named; coverage = bound / answerable; nullPrecision = the same with the bound referents permuted over the same pronouns; resultsFile = the file in the repo that holds the run).
Without it `presenceOptionsFor` returns the typed gap `pronoun_presence_unmeasured` and the read binds nothing. `grc.json` below is such a register today.
