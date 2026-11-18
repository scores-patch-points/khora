# PREREG-ROUND22 — French: a register from the treebank and the first measured pronoun baseline (written before the register is derived or any French text is read through it)

The user: "get our French up to speed", "go get that French stuff", "look at the translation work we did on UDHR". Obtained 2026-11-18 (authorised): UD French-GSD (UniversalDependencies/UD_French-GSD, CC BY-SA 4.0; train 25,775,984 + dev 2,595,547 + test 729,227 bytes) and CorefUD 1.3 public (lindat.mff.cuni.cz handle 11234/1-5896, 102,547,413 bytes; per-dataset licences in the archive; French-Democrat CC BY-SA 4.0, French-ANCOR CC BY-NC-SA 4.0), stored under identity/pronouns-multilingual/data/fra (not committed). The archive also carries gold coreference for 20 more languages.
State today: French has a POS prior and the English-shaped positional clause reader, no pronoun register, no morphology prior, no gold (competency tier "lexical"). The UDHR Rosetta work (the-fold's 516-language parallel, ~/eoreader7/native/eval/lavar) checks a language's own seam against article-aligned positions: a grid, never content; it carries no French coreference.

## Register (identity/pronouns-multilingual/fra/derive-register.mjs, adapted from the Greek derivation)
From UD French-GSD train+dev+test: a form is a member iff (1) most of its tokens are UPOS PRON, (2) most of its PRON tokens are third-person personal (Person=3, PronType=Prs), (3) among those Sing > Plur, (4) the majority gender is Masc or Fem. No hand list of French pronouns. The register is PronounPrior@1 with its counts and provenance; it binds only when it carries an evaluation.
## Data
CorefUD French-Democrat (Dem1921, written French of the 19th-21st centuries): train (50 documents) is DEVELOPMENT (read once for the baseline; the register is not tuned on it); dev (46 documents) is the TEST, read once after the code is frozen. French-ANCOR (spoken French) is a secondary, reported separately.
Gold: tokens PRON, Person=3, Number=Sing, PronType=Prs, Gender Masc or Fem, a mention of a coreference entity that also has a proper-noun mention a cast span overlaps (answerable, as for English GUM). RIGHT iff the bound being's cast spans overlap a mention of the same gold entity.
## Hypotheses (default dials, the canonical read; nothing tuned)
- F1: the French register's binding beats the shuffled-referent null on the test set.
- F2: coverage and precision reported by form (il, elle, lui, ...), and the bindings on tokens the gold does not call a mention (expletive il) reported as their own count: the precision over gold pronouns ignores them.
- F3: the same read with the English-shaped clause reader's roles vs without is NOT tested here.
- F4 (descriptive): the typed gaps of the French read (no morphology, no non-personal ruling, no gold for names) and what the profile says.
Failures reported. Nothing tuned. A register ships only with its measured evaluation.
