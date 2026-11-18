# Sanskrit (san) pronoun binding: preregistration

Written 2026-11-17, before any pronoun was bound on Sanskrit text and before any register was built or any finder number was computed. No LLM is part of any mechanism or run.

## What I already know before writing this (disclosed, not a result)
- On two small trial reads (a Wikisource Devanagari Panchatantra passage, a GRETIL Ramayana IAST passage) the shipped reader, with `language: "san"` declared: splits Devanagari prose on the danda; heard without a declaration, Devanagari text defaults to English with the gap `language_default`; builds NO cast (0 beings, 0 heard rows, 0 pronouns) in either script; files `pronoun_presence_no_register`. In IAST verse without a danda the whole passage is one sentence.
- `janus/priors` has `pos-san.json` (IAST, from UD_Sanskrit-Vedic train) and no `frame-san.json`; the heard-nominal tier is switched off without a frame prior. `native/scripts/build-frame-prior.mjs` imports `./lib/frame-build.mjs`, which is not in the repo (the builder cannot run on main).
- UD_Sanskrit-Vedic is IAST with unsandhied forms (column 2 equals `Unsandhied` on all 161,959 train tokens) and no PronType and no Person=3 on its PRON tokens. UD_Sanskrit-UFAL (Panchatantra, Devanagari with a Translit field per token, 230 sentences) carries PronType and Person on pronouns.
- Both treebanks: CC BY-SA 4.0 (LICENSE.txt in each). Evaluation texts: GRETIL (CC BY-NC-SA 4.0 in each file header; research use, not redistributed): Panchatantra (Visnusarman, Jha ed.), Hitopadesa, Dasakumaracarita; Sanskrit Wikisource Panchatantra (CC BY-SA, Devanagari). No coreference gold for Sanskrit is known to me; none is used.

## Method (frozen before running)
1. Register: third-person pronoun lemmas are those the UFAL treebank itself tags PronType=Dem, or PronType=Prs with Person=3 (by `LTranslit`). Vedic (IAST) tokens are taken when the UPOS is PRON and the lemma equals such a lemma (or such a lemma plus final `d`, the stem form: ena/enad). Forms keep treebank counts of Gender and Number. A form enters the shipped register iff its majority number is Singular and its majority gender is not Neuter (the English class likewise has no `it`; plural referents and non-persons cannot be told apart by presence). The excluded forms are listed in the build report. Vedic register counts come from the train split only; the test split is held out.
2. Dials: the shipped defaults (window 4, boost 2, feed 1, floor 2, margin 0.3). Never tuned in this work.
3. Evaluation texts are unread by any fitting step. The register is built from treebanks, which share no text with GRETIL. The UFAL Panchatantra preface and the first part of Mitrabheda overlap the Wikisource Panchatantra: overlapping sentences are removed from the Wikisource sample (by exact Devanagari sentence match).
4. Gold-free falsifier, as identity/novels/pronoun-falsify.mjs: a referent bound to both a masculine and a feminine register form has at least one wrong binding; lower-bound error = sum over referents of min(m, f), over bound pronouns; null = the same bound referents permuted over the same pronouns (200 permutations, seeded). Reported per text with a bootstrap over passages of the text (blocks of 100 sentences).
5. Gold that exists: the two treebanks' own pronoun tags, used ONLY to score the pronoun FINDER (not coreference).

## Hypotheses and predictions (each can fail)
- H1 the reader cannot read Sanskrit into a cast as shipped. Prediction: with the register present and nothing else changed, bound pronouns on the GRETIL Panchatantra sample = 0 (empty cast).
- H2 the register finds what the treebank tags. On the held-out Vedic test split (unsandhied IAST): finder recall of the tokens the treebank tags as bindable third-person pronouns (the same filter) >= 0.90; finder precision >= 0.80 (the loss is homographs such as `te`, which is also a second-person enclitic).
- H3 sandhi hides pronouns from the letter-boundary finder. In UFAL (the only sandhied gold with surface forms), the share of third-person pronoun tokens that sit inside a multi-word token (fused with a neighbour) is >= 0.10, and the share whose surface form the Vedic-built register does not contain (sandhi variants) is >= 0.15.
- H4 pro-drop removes most of the problem. In UFAL, among finite verbs with Person=3, the share with an overt third-person pronoun subject (nsubj/nsubj:pass child that is a pronoun of the register's lemmas) is <= 0.35. So at most about a third of third-person subjects are even findable.
- H5 a cast built from the heard-nominal tier (new, below) plus the register binds some pronouns on GRETIL Panchatantra prose: bound >= 100 pronouns in a 20,000-word sample.
- H6 the binding carries gender information: observed lower-bound contradiction rate below the permuted null, on the pooled sample and on >= 2 of the 3 narrative texts (Panchatantra, Hitopadesa, Dasakumaracarita), with a pooled null-minus-observed 95% interval above 0.
- H7 it is not clean: pooled observed lower bound is > 0 (some referents hold both genders) and the pooled lower-bound error is >= 17.3% (English chosen dials, round 10), because name folding across case forms is weak.
- H8 neuter forms hurt: adding the neuter-majority singular forms (excluded in the shipped register) raises the lower-bound contradiction rate when neuter is counted as a third class (a referent with pronouns of two different genders among m, f, n).
- H9 coverage: bound / found pronouns <= 0.50 (English: about 0.50 on unseen GUM).
- No claim about correctness (precision) is made: there is no gold. Contradiction rate is a lower bound on error only.

## What counts as a failure (kept and reported)
Any prediction above not met. Also: if the heard-nominal cast contains common nouns instead of characters, that is reported with the cast list.

## Files
This file, `.sha256` and `.time` are written before the first run. Scripts and outputs live beside it.
