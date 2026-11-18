# corefud-scorer (a giver for judging coreference competency)
- Source: https://github.com/ufal/corefud-scorer, commit 4fd7b0e0c661aeeff88bc60c19ef507b84d1b590 (2025-01-30 14:50:36 +0100). Licence: see corefud-scorer/LICENSE.
- The official scorer of the CRAC Shared Tasks on Multilingual Coreference Resolution; primary metric: CoNLL F1 (mean of MUC, B-cubed and CEAFe F1) with HEAD mention matching and singletons ignored; a supplementary score includes singletons. All mentions count, pronouns of every person and number and nominal mentions alike.
- Data it judges: CorefUD 1.3 public (lindat handle 11234/1-5896, CorefUD-1.3-public.zip, 102,547,413 bytes), fixed dev sets per language. Nothing here is tuned to our reader.
- Needs: Python 3 with the udapi package (requirements.txt). NOT installed (the sandbox denied creating a virtual environment and a pip install; the user decides).
- Writer: identity/pronouns-multilingual/score/predict-corefud.mjs turns a canonical read into a CorefUD system file (round-trip self-tested: the gold written back as the system parses to the same 139 clusters and 756 mentions).
