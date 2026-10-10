# khora polyglot competence card: natural languages, programming languages, notation and sign systems

Written 2026-10-06 by the synthesizer and completeness critic. Nothing under `/Users/mlacy/Documents/3.0/khora/native` that already existed was edited; nothing was committed; no model call is part of any score. Machine-readable twin: `/private/tmp/claude-501/polyglot/card-code-notation.json` (code and notation numbers are read from the per-language and per-family card files, not retyped; the card builder is `/private/tmp/claude-501/polyglot/build-card.mjs`). The natural-language half is merged by reference and by its matrix from `eval/competence/CARD.md` (`/private/tmp/claude-501/competence/card-all.json`), produced by a separate workflow.

**Provenance of numbers.** Rows marked *card file* were read from the TEST card on disk. Rows marked *agent diagnosis* come from the measurement and fix agents' reports (model output, verified against files where cheap: the c2 `outsideUnits` line, the stale `code-name-*` priors, the c0 read logs, the per-language c1/c2/c4 clauses and the notation card files were checked). Anything I could not verify is labelled. Authored or derived fixtures are labelled authored or derived and are never natural held-out data.

## 0. Read this first

- **No language, no programming language and no notation family is shown to read well.** The only unqualified 6/6 TEST result is `chess_pgn`, and its gold and reader implement the same standard (conformance, not skill; section 4).
- **Natural languages:** 150 language-rungs on TEST (25 languages): 32 pass, 62 fail, 56 unmeasured. R3 (find beings) fails 23 of 23 where measurable; the standing gate adds nothing over the prior's own lexicon filter. Falsified earlier: gate helps recurrence prediction. Only caseless-script coverage held.
- **Programming languages:** 8 languages with a TEST card x 6 rungs = 48 language-rungs: **9 pass, 10 fail, 29 unmeasured** (c0 of javascript and c carries a number but a null verdict). The 9 passes are R4 calls (6 of 6 measured languages), R3 beings (javascript only; 7 languages never read c3), R2 (go, ruby). R1 fails in 6 of 6 and R2 in 4 of 6, mostly because the registered margin over a hand-typed baseline is unreachable (RC2).
- **Notation and sign systems:** 8 families built (survey listed 26). 7 have a TEST card: 42 family-rungs, **23 pass, 18 fail, 1 null**; closed_codes was never run on TEST. 18 survey families have no adapter (typed gaps or not yet built).
- **TEST is spent** for natural languages (25 stems), code (python, javascript, typescript, c, go, java, ruby, rust each ran once through `run.mjs`; c0 for javascript and c and c3 for javascript were read directly) and 7 of 8 notation families. Every fix below must be pre-registered, developed on DEV, and judged on a fresh held-out draw. No result on this card may be re-labelled by an amendment.
- **Unmeasured is not good.** Section 5 lists what this card does NOT measure; section 8 is the completeness critique (what is missing from the plan, the ladder and the families).
- **Guard G0 reads 'failed' on every card** because 3 of 1192 repository tests (Barker and law workstreams) fail; no coding or reading test fails (RC13). Do not read exit code 1 as a reader failure.

## 1. Natural languages (merged from the separate workflow, `eval/competence/CARD.md`, read 2026-10-06)

Source: khora competence card, all languages (generated 2026-10-06T08:28:52.751Z). TEST read once per stem; module sha1s in that card. Not re-derived here; matrix copied verbatim.

Headline (copied): no language reads well; 32 pass / 62 fail / 56 unmeasured of 150; R0 19P/1F/5U, R1 5P/9F/11U, R2 4P/21F/0U, R3 0P/23F/2U, R4 1P/6F/18U, R5 3P/2F/20U; the capital-letter witness (non-causal) beats the heard reader in 13 of 16 cased languages; R3's gate fails K:lexicon_filter in 23 of 23; levels: partial 12, weak 13, 31 stems with priors and no TEST card are unmeasured.

| lang | R0 identify | R1 hear | R2 classify | R3 beings | R4 claims | R5 agree | level |
|---|---|---|---|---|---|---|---|
| eng | PASS | UNM-NN | FAIL | FAIL | PASS | PASS | **partial** |
| spa | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| rus | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| cmn | FAIL | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| cmn-hans | UNM-SD | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| arb | PASS | PASS | FAIL | UNM-UP | FAIL | UNM-NP | **partial** |
| heb | UNM-SD | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| fas | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| kor | UNM-SD | FAIL | FAIL | UNM-UP | FAIL | UNM-NP | **weak** |
| jpn | UNM-SD | PASS | FAIL | FAIL | UNM-UP | UNM-NP | **partial** |
| fra | PASS | FAIL | FAIL | FAIL | UNM-UP | FAIL | **weak** |
| deu | PASS | FAIL | PASS | FAIL | UNM-UP | FAIL | **partial** |
| ita | PASS | FAIL | FAIL | FAIL | UNM-UP | PASS | **partial** |
| por | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| nld | PASS | UNM-NN | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| pol | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ukr | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| hin | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| vie | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ind | PASS | FAIL | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| swe | PASS | UNM-NN | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| urd | PASS | UNM-NN | FAIL | FAIL | FAIL | UNM-NP | **weak** |
| tur | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ell | UNM-SD | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| fin | PASS | UNM-NN | FAIL | FAIL | UNM-UP | PASS | **partial** |

UNM-SD script-determined (R0 says nothing about reading), UNM-NN ear not needed and inert, UNM-UP underpowered, UNM-NP no parallel text. Root causes RC1-RC8 of that card (standing gate as rare-word filter; cased-script derived from letter category; refusal not loss-bounded; no affix layer; claim path cannot read who-did-what-to-whom; R0 coverage is not a likelihood; instrument problems; design conflicts) are in its section 6 and are not repeated. Its section 7 (is the beings tier the wrong design) says the standing gate is the wrong mechanism and the nominated ledger is not yet shown either way.

## 2. Programming languages (ladder c0-c5 = R0-R5, TEST, one read, card files)

Instrument: `eval/coding-competence/run.mjs` driving c0-c5; reader = adapters/code and adapters/text/code-structure.js with TRAIN-only priors (code-lex, code-ctx, code-name-<lang>, code-kw from a tree-sitter grammar or engine giver); gold = tree-sitter parse via gold.py (frozen, sha256 pinned; it was corrected while looking at smoke files that include TEST repos, so **TEST is blind to every prior but not fully blind to the gold**). Corpus: /private/tmp/claude-501/code-corpus (manifest CodeCorpusManifest@1), split by repository.

| language (TEST files / repos) | R0 identify | R1 hear | R2 classify | R3 beings | R4 relations | R5 agree | tally P/F/U |
|---|---|---|---|---|---|---|---|
| python (132 / 5) | UNMEASURED | FAIL 0.9977 vs 0.9999 (-0.0022) n=132 | FAIL 0.9991 vs 1.0000 (-0.0009) n=79883 | UNMEASURED | PASS 1.0000 vs 0.8104 (+0.1896) n=131 | UNMEASURED | 1/2/3 |
| javascript (128 / 3) | NULL 0.7000 vs 0.0205 n=30 (typed gap, see note) | FAIL 0.9582 vs 0.9599 (-0.0017) n=128 | FAIL 0.7128 vs 0.7128 (+0.0000) n=19949 | PASS 0.9412 vs 0.4855 (+0.4557) n=128 | PASS 0.9958 vs 0.7796 (+0.2162) n=128 | UNMEASURED | 2/2/2 |
| typescript (180 / 3) | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | 0/0/6 |
| c (171 / 5) | NULL 0.9333 vs 0.0205 n=30 (typed gap, see note) | FAIL 0.9789 vs 0.9448 (+0.0341) n=169 | FAIL 0.9627 vs 0.9619 (+0.0008) n=63052 | UNMEASURED | PASS 0.9952 vs 0.8699 (+0.1253) n=170 | UNMEASURED | 1/2/3 |
| go (131 / 4) | UNMEASURED | FAIL 1.0000 vs 1.0000 (+0.0000) n=131 | PASS 0.9861 vs 0.9806 (+0.0055) n=60147 | UNMEASURED | PASS 0.9996 vs 0.9349 (+0.0647) n=130 | UNMEASURED | 2/1/3 |
| java (180 / 3) | UNMEASURED | FAIL 0.9953 vs 0.9995 (-0.0042) n=180 | FAIL 0.9687 vs 0.9670 (+0.0017) n=40751 | UNMEASURED | PASS 0.9955 vs 0.6994 (+0.2961) n=180 | UNMEASURED | 1/2/3 |
| ruby (98 / 3) | UNMEASURED | FAIL 0.9631 vs 0.8908 (+0.0723) n=98 | PASS 0.9937 vs 0.9846 (+0.0091) n=21725 | UNMEASURED | PASS 0.9997 vs 0.5639 (+0.4358) n=98 | UNMEASURED | 2/1/3 |
| rust (180 / 3) | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | UNMEASURED | 0/0/6 |

Each cell: verdict, score, strongest control, margin (score minus control), n. R1 control = strongest cheap baseline b_typedDelimsOps (boundary F1); R2 control = strongest of freqT2/recipes/declKw/ablations; R3 control = keyword_regex; R4 control = naiveLexical regex rival. R0 null cells: score is slice accuracy, control the majority share; the verdict is null by derivation (MIN_REPOS 5), not by result. `python` and the other guarded c0/c3 cells read **no TEST file**.

### 2.1 Verdict per language

| language | verdict | why |
|---|---|---|
| python | **partial** | R4 passes (calls F1 1.000, 5999/5999; gold equals CPython ast edge for edge: independent witness). R1 0.9977 vs 0.9999 and R2 0.9991 vs 1.0 FAIL at near-ceiling, with a small real R1 deficit on rare forms (`>>=`, `b'..'`, `'''`). R0, R3, R5 holes (guard refusals; the aggregator also burned python's c0 read without opening a file). |
| javascript | **partial** | R3 passes (N-F1 0.9412 vs keyword_regex 0.4855, 3 of 3 repos) and R4 passes (calls 0.9916, imports 1.000, extends not measurable: 0 gold edges). R1 FAIL (regex literals 536/536 missed, s1 specificity fail), R2 FAIL (S1 equals freqT2: margin 0 by construction; H=1 commit cannot tell call from declaration). R0 slice 21/30 but null (3 repos); claim 2 FAIL (keyword channel inert). R5 hole. |
| typescript | **unmeasured** | no lex/ctx priors, no edge recipe, no loader entry; every rung returned a typed refusal before a TEST file was opened. DEV scratch only (not counted): R0 0.733, R1 0.9983, R2 0.7936 vs 0.7933, R3 0.9401 vs 0.7244, R4 calls 0.8987 (3 catastrophic files) FAIL. |
| c | **partial** | R4 passes (calls 0.9952 vs 0.8699). R1 FAIL (ceiling-bound d1/d2, margin 0.034); R2 FAIL (0.9627 vs 0.9619, B2 and C2 clauses fail); R0 28/30 slice, null (4 repos); 23 of 44 C11 reserved words missing from the prior (typed gap). |
| go | **partial** | R2 passes narrowly (0.9861 vs 0.9806, +0.0055) and R4 passes (0.9996 vs 0.9349). R1 FAIL at 1.000 vs 1.000 (headroom 0: a perfect lexer fails it). R0, R3, R5 holes. No go toolchain: second authority impossible. |
| java | **partial** | R4 passes (0.9955 vs 0.6994; no callEdges recipe exists for java, so the rival is the naive regex). R1 FAIL (-0.0042 vs hand baseline, and language specificity fails: the C prior is within 0.0016 of the Java prior), R2 FAIL (A2: T2 refusal does not beat frequency-matched, p5 -0.0005). 19 of 51 JLS reserved words missing from the prior. R0/R3/R5 holes. |
| ruby | **partial** | R2 passes (0.9937 vs 0.9846, +0.0091) and R4 passes (0.9997 vs 0.5639). R1 FAIL with real headroom (0.9631 vs 0.8908, margin 0.0724 < 0.10, headroom 0.1092): the one honest R1 miss. |
| rust | **unmeasured** | keyword and name priors only; every rung typed gap. |
| 40+ others | **unmeasured** | stub cards (no `measure()` export); see section 5. |

### 2.2 Per-rung findings

- **R0 identify.** Held-out evidence is two direct reads: javascript 21/30 (0.70) vs majority 0.0205 and c 28/30 (0.933) vs 0.0205, both pass:null because MIN_REPOS 5 > 3 and 4 repositories. Claim 2 (the received keyword prior helps) FAILS on javascript (pool real 0.8946 vs shape_only 0.8919 vs deranged 0.8912, 17/50 deranged draws at or above real, p 0.353) and on python DEV. Mechanism (agent diagnosis): the shape channel's absolute-indent feature carries a repo style (python i:2 = -5.16 nats/line, 5 of 6 DEV misreads are two-space-indent files); the keyword channel is a per-word Bernoulli that discards which keyword was seen. All 9 javascript TEST errors are inside the js/ts/tsx/vue family (family accuracy 30/30): javascript is almost a subset of typescript, so exact-extension gold punishes an unanswerable question (RC3).
- **R1 hear tokens.** Boundary F1 is 0.958-1.000 and class accuracy 0.986-0.999 against whitespace 0.25-0.31 and majority 0.37-0.48, and the keyword and delimiter licences MOVE (deranged keywords drop 0.068-0.136; no delimiters drop 0.19-0.35): the mechanism is real. It still fails in 6 of 6 because clauses d1/d2 demand +0.10 over a hand-typed delimiter+operator scanner with headroom 0 to 0.109 (ruby only has real headroom). Real deficits hide behind the ceiling: python rare forms, javascript regex literals (conditional: []), java/c specificity. (RC2, RC6)
- **R2 classify tokens.** Scores 0.71-0.999 over GOLD segmentation; causalEndToEnd is NOT licensed in any language (RC4). Python, javascript: the hand baselines (recipes, declKw, the def/class introducer) are at or near the reader; the learned settled tier refuses some real definitions (RC5). Go and ruby pass with margins 0.0055 and 0.0091 over the frequency-matched control, which is small.
- **R3 find beings.** Read once, on javascript only: N-F1 0.9412 (P 0.9623, R 0.9210) vs keyword_regex 0.4855, casing_only 0.0313, deranged_foreign 0.45, existing parseDeclarations 0.5042; prefix causality 0.992 (2 flips in 250). The other seven languages refused the TEST read behind `C3_FINAL_TEST=1`; for python the agent chose not to spend the read because DEV shows the pre-registered functions-and-classes clause is unreachable against a keyword regex that finds the same 443/443 callables.
- **R4 find relations.** The one rung that discriminates and passes in every measured language: calls F1 0.9916-1.000 vs naive regex 0.56-0.93 (margins +0.065 to +0.436), strongest shuffle controls 0.003-0.03, noScope ablation 0.12 (python), causality 0 retractions. Imports are typed non-discriminating (naive 0.984-1.0). Extends: python 46 edges F1 1.000 (not gating), java/ruby/c/go not applicable or unmeasured, javascript 0 gold edges. Authority: tree-sitter; independent second authority only for python (CPython ast).
- **R5 agree.** No held-out suite in any language; DEV authored smoke (python/javascript 0.967 vs 0.598) is not competence.
- **Sub-word reading (identifier pieces).** Only measured inside c1 (python TEST: 0.4374 of multi-piece identifier types covered by the lexicon vs random 0.142, margin 0.2954 pass; top unattested pieces are domain stems axi, axil). No hand-off to the prose reader.

### 2.3 Guards (card files)

G1 corpus integrity PASS everywhere (no repo or sha clash; deranged control caught). G2 prior provenance: PASS for java, ruby, typescript; PARTIAL for python, javascript, c, go because `code-name-{py,js,c,go}.json` record no trainRepos (and the py file holds Flask/FastAPI names from python TEST repos); no measured rung loads them (RC12, source edit 3). G0 regression 1189/1192 (RC13).

## 3. Competence verdict vocabulary used here

`pass` = the instrument's pre-registered rule passed. `fail` = it did not. `null` = the rule returned no verdict by derivation (underpowered, mechanical, no licensed control). `unmeasured` = no TEST result (refused, no reader, no data). `partial` = at least one rung passes against a licensed control and at least one does not. `conformance` = a pass whose gold shares the reader's standard or convention (RC11): it says the reader obeys the standard, not that it reads. A verdict is a statement about a split of 3-5 repositories (code) or 22-25 languages/genomes (notation); read the denominators.

## 4. Notation and sign systems (family x rung, TEST, one read; cells: verdict score vs strongest control (margin))

| family | channel | R0 | R1 | R2 | R3 | R4 | R5 | status |
|---|---|---|---|---|---|---|---|---|
| chem_smiles | structured-text (linear string notation SMILES, InChI | FAIL 0.9914 vs 0.9950 (-0.0036) | FAIL 1.0000 vs 0.4885 (+0.5115) | FAIL 1.0000 vs 0.9720 (+0.0280) | PASS 0.9878 vs 0.7986 (+0.1892) | PASS 1.0000 vs 0.4875 (+0.5125) | PASS 0.9983 vs 0.0012 (+0.9971) | partial |
| genetic | text / structured-text (FASTA, INSDC GenBank flat file) | PASS 0.9997 vs 0.6907 (+0.3091) | PASS 0.9514 vs 0.8668 (+0.0845) | FAIL 0.9374 vs 0.8271 (+0.1103) | PASS 0.6137 vs 0.3786 (+0.2351) | FAIL 0.9370 vs 0.9795 (-0.0425) | FAIL 0.6562 vs 0.6590 (-0.0028) | partial |
| chess_pgn | text (PGN/SAN/FEN) | PASS 0.9773 vs 0.0194 (+0.9579) | PASS 1.0000 vs 0.4304 (+0.5696) | PASS 1.0000 vs 0.3092 (+0.6908) | PASS 1.0000 vs 0.7651 (+0.2349) | PASS 1.0000 vs 0.5697 (+0.4303) | PASS 1.0000 vs 0.0000 (+1.0000) | pass (6/6) - read as conformance |
| ipa | text (Unicode IPA) | FAIL 0.9479 vs 0.9622 (-0.0143) | FAIL 0.9999 vs 0.9999 (+0.0000) | PASS 0.9946 vs 0.8380 (+0.1566) | FAIL 0.8628 vs 0.8580 (+0.0048) | FAIL 0.9994 vs 0.9995 (-0.0001) | FAIL 0.8419 vs 0.8548 (-0.0130) | weak (R2 only) |
| music_abc | text (ABC derived), structured-text (MusicXML natural), LilyPond lexer | PASS 0.9761 vs 0.2500 (+0.7261) | FAIL 0.9829 vs 0.4269 (+0.5560) | PASS 0.9935 vs 0.3701 (+0.6234) | PASS 0.9993 vs 0.6057 (+0.3936) | NULL 0.9992 vs 0.8265 (+0.1727) | FAIL 0.8502 vs 0.6483 (+0.2019) | partial (R0, R2, R3 pass; R4 null) |
| taxonomy | text (scientific names) + structured tables (taxdump, DwC-A) | FAIL 0.8575 vs 0.1175 (+0.7400) | PASS 0.9011 vs 0.3065 (+0.5946) | PASS 0.8947 vs 0.6362 (+0.2584) | PASS 0.8767 vs 0.2978 (+0.5789) | PASS 0.8611 vs 0.4189 (+0.4422) | FAIL 0.9066 vs 0.8972 (+0.0094) | partial-strong (R1-R4 pass) |
| uml_bpmn | structured-text (BPMN 2.0 XML, Graphviz DOT dialects | FAIL 0.8849 vs 0.2444 (+0.6405) | FAIL 0.9989 vs 0.9934 (+0.0055) | PASS 0.9990 vs 0.4577 (+0.5413) | PASS 1.0000 vs 0.5853 (+0.4147) | FAIL 1.0000 vs 0.3487 (+0.6513) | PASS 1.0000 vs 0.0080 (+0.9920) | partial (R2, R3, R5 pass) |
| closed_codes | text by construction (Morse dots/dashes, Unicode Braille UEB grade 1,  | DEV PASS 0.9979 vs 0.7188 (+0.2792) | DEV FAIL 0.9529 vs 0.6261 (+0.3268) | DEV FAIL 1.0000 vs 0.6142 (+0.3858) | DEV N/A (typed) | DEV N/A (typed) | DEV PASS 0.8149 vs 0.2322 (+0.5826) | unmeasured on TEST (dev smoke only) |

A FAIL with a positive margin means a non-margin clause failed (floor, licence, causality, stranger rate, sub-claim); the per-family notes below name it. 

Closed_codes cells are DEV (v1-registered card); its TEST was never run. chem_smiles cells are the per-system headline (SMILES where a system split exists), not the card's rung-level fold, whose margins are averaged across systems (R1 fold margin 0.7558 on a FAIL). Feasibility: tier A GO built = chem_smiles, genetic, chess_pgn, ipa, taxonomy; tier B/C built = music_abc, uml_bpmn, closed_codes.

### 4.1 chem_smiles

- Channel: structured-text (linear string notation SMILES, InChI; IUPAC names read only as element evidence; SELFIES/formula named at R0 only). Corpus: PubChem 6000 TEST records (train ChEBI+ChEMBL, dev wwPDB CCD); gold RDKit/OPSIN. Status: TEST consumed (one run, 7.7 s, card-test.json; first CLI call misparsed --split and read nothing).
- R0 FAIL 0.9914 vs char_bigram_nb 0.9950, margin -0.0036, n=3600. headroom 0.005 vs required margin 0.2; reader below grammar-free bigram at prefix 8 (0.629 vs 0.903); 0 abstentions of 3600.
- R1 FAIL 1.0000 vs random_cuts (exact share) 0.4885, margin +0.5115, n=6000. fails only its licence (random_cuts token-F1 drop 0.1198 < 0.2) because 48.5% of molecules have no multi-character token; InChI R1 is mechanical, pass null.
- R2 FAIL 1.0000 vs caps_bracket_aware (micro); decisive bracket stratum 0.1242 0.9720, margin +0.0280, n=166163. fails the v1 micro-margin conjunct (0.028 < 0.05; bracket atoms are 3.19% of atoms, so the floor was unreachable); decisive bracket stratum 1.0 vs 0.1242 (+0.8758); aromatic stratum empty (typed gap); InChI mechanical, pass null.
- R3 PASS 0.9878 vs naive_rings 0.7986, margin +0.1892, n=6000. ring F1 (SMILES); thin vs 0.15 floor; InChI ring F1 0.9791 vs branch-blind naive 0.5395 (upper-bound margin); rings are causal shortest cycles, not SSSR.
- R4 PASS 1.0000 vs chain_only 0.4875, margin +0.5125, n=6000. SMILES labelled F1; InChI unlabelled 0.999 vs path_only 0.7695; InChI repeat-prefix bug present (see root causes).
- R5 PASS 0.9983 vs bond_scrambled 0.0012, margin +0.9971, n=5973. SMILES<->InChI graph-digest agreement vs RDKit gold; IUPAC name element evidence macro-J 0.8233 (Si 0.0; 11 elements unsupported; 384 names not OPSIN-verified dropped).
- Unmeasured (typed gaps): IUPAC names R1-R4 (no morpheme grammar, no OPSIN parse-tree gold); WLN all rungs (no open corpus or writer; GPL read-only in Open Babel); InChI R1/R2 independent authority (mechanical); SELFIES/formula beings and relations; aromatic stratum of R2 (PubChem is Kekule-written).

### 4.2 genetic

- Channel: text / structured-text (FASTA, INSDC GenBank flat file); medium grammar in adapters/notation/genetic.js. Corpus: 22 NCBI RefSeq genomes (11 standard-class, 11 alternate-class: tables 2,4,5,9,13); priors from 25 TRAIN genomes. Status: TEST consumed (one run, 22 genomes, 10.4 s).
- R0 PASS 0.9997 vs delimiter_only (system arm); code arm 0.9545 vs gc_stump 0.5909 0.6907, margin +0.3091, n=88. DEV code arm was 0.7895 and did not beat gc_stump, so the TEST pass is split-sensitive; non-gating flat20 still named protein 99%.
- R1 PASS 0.9514 vs deranged_usage 0.8668, margin +0.0845, n=22. frame accuracy given coding; container lexemes tie a regex baseline (typed gap).
- R2 FAIL 0.9374 vs std_everywhere 0.8271, margin +0.1103, n=22. sign test 11-4-7, p=0.0592 > 0.05; one 3.4e-5 loss (unreadable N codons scored asymmetrically) flips the verdict; final-state diagnostic 0.9985 so the deficit is causal latency.
- R3 PASS 0.6137 vs naive_orf 0.3786, margin +0.2351, n=22. 0.6137 vs 0.60 floor (+0.0137); the win is wholly alternate-code (0.538 vs 0.059) and standard-class genomes tie naive (0.689 vs 0.699); causality 0 violations in 4205 checks, planted lookahead flagged.
- R4 FAIL 0.9370 vs stop_class_only 0.9795, margin -0.0425, n=22. token accuracy with abstention as miss; both licensed controls std_table 0.9723 and stop_class_only 0.9795 beat the reader; pre-registered as expected (P4').
- R5 FAIL 0.6562 vs std_table (code fixed) 0.6590, margin -0.0028, n=22. composite mean(A,C): control wins A (0.947 vs 0.702), reader wins C (0.611 vs 0.371); cancels.
- Unmeasured (typed gaps): table id within a stop class (not identifiable from DNA alone); 17 of 25 NCBI tables unattested in TRAIN; introns/spliced genes, frameshifts, selenocysteine; non-protein genes (rRNA/tRNA/ncRNA), 521 features; natural RNA genomes written with U; GFF/EMBL/GenPept, multi-record files.

### 4.3 chess_pgn

- Channel: text (PGN/SAN/FEN). Corpus: Lichess broadcast 2024-01 (CC BY-SA) vs train Lichess standard (CC0); oracle python-chess 1.11.2 (GPL, external only). Status: TEST consumed (run #1, ledgered).
- R0 PASS 0.9773 vs strongest of charshuf/prose/code/smiles/fasta/authored near-miss negatives 0.0194, margin +0.9579, n=10563. natural near-miss and natural strangers underpowered or unmeasured (typed).
- R1 PASS 1.0000 vs naive_regex 0.4304, margin +0.5696, n=2661. ear and oracle implement the same PGN token grammar (one standard).
- R2 PASS 1.0000 vs majority 0.3092, margin +0.6908, n=806309. thin for a formal notation: class read off the token's first characters.
- R3 PASS 1.0000 vs no_board 0.7651, margin +0.2349, n=2661. board organ and python-chess implement the same FIDE rules (shared misreading invisible).
- R4 PASS 1.0000 vs no_board 0.5697, margin +0.4303, n=2661. natural illegal-move recall underpowered; legality probes in a diagnostic stratum.
- R5 PASS 1.0000 vs misaligned_rendering 0.0000, margin +1.0000, n=400. renderings (UCI, long algebraic, FEN, other languages' piece letters) AUTHORED by script from natural games; agreement is set equality of the reader's own relations.
- Unmeasured (typed gaps): comment text; opening names; chess variants; Russian/caseless piece letters; descriptive notation.

### 4.4 ipa

- Channel: text (Unicode IPA). Corpus: WikiPron (Wiktionary-derived, CC BY-SA) + PHOIBLE inventories. Status: TEST consumed (test-final.json).
- R0 FAIL 0.9479 vs c_block_all (Unicode block membership rule) 0.9622, margin -0.0143, n=3070. sign test vs strongest control 2 wins 8 losses 15 ties; IPA is a block lookup here.
- R1 FAIL 0.9999 vs ucd_category (chart-free segmenter) 0.9999, margin +0.0000, n=92913. convention replica: gold is the segments-library rule; stress marks and syllable breaks absent; also fails causality (prefix stability < 1).
- R2 PASS 0.9946 vs ascii_rule 0.8380, margin +0.1566, n=1323. 209 wins 9 losses over 1323 PHOIBLE segment types.
- R3 FAIL 0.8628 vs ablated_unicode 0.8580, margin +0.0048, n=28. ceiling 0.862 (gold segmentation vs PHOIBLE); 28 languages.
- R4 FAIL 0.9994 vs ablated_binding 0.9995, margin -0.0001, n=92913. convention replica (structural binding edges).
- R5 FAIL 0.8419 vs mn_strip 0.8548, margin -0.0130, n=3329. narrow->broad retrieval; no received g2p prior.
- Unmeasured (typed gaps): IPA Braille; orthography->IPA (no g2p prior); stress marks and syllable breaks (absent from WikiPron); tone digit/arrow conventions.

### 4.5 music_abc

- Channel: text (ABC derived), structured-text (MusicXML natural), LilyPond lexer-only. Corpus: OpenScore MusicXML (CC0) natural; ABC DERIVED by exporter and certified by abcjs; The Session excluded (LLM-use prohibition). Status: TEST consumed (run #1 ledgered).
- R0 PASS 0.9761 vs deranged/majority 0.2500, margin +0.7261, n=1227. 0/930 false-music on natural negatives; natural ABC unmeasured.
- R1 FAIL 0.9829 vs deranged_prior 0.4269, margin +0.5560, n=276. musicxml 0.9989 pass, derived abc 0.9999 pass, lilypond 0.9498 FAIL (no event reader); rung fails on the LilyPond format.
- R2 PASS 0.9935 vs strongest licensed 0.3701, margin +0.6234, n=276.
- R3 PASS 0.9993 vs strongest licensed 0.6057, margin +0.3936, n=213.
- R4 NULL 0.9992 vs deranged_claims 0.8265, margin +0.1727, n=213. pass null: 3 admitted pieces excluded as uncertified by abcjs; ABC gold certified independently.
- R5 FAIL 0.8502 vs pitch_deranged_one_side 0.6483, margin +0.2019, n=86. derived-ABC vs natural-MusicXML reading: pitch-only agreement 0.4878, duration-only 0.8516 against a 0.98 gate.
- Unmeasured (typed gaps): natural ABC (none permissively licensed); tablature/TabCode; LilyPond events; Music Braille; natural-natural notation pairs.

### 4.6 taxonomy

- Channel: text (scientific names) + structured tables (taxdump, DwC-A). Corpus: GBIF Backbone, NCBI taxdump, Plazi treatments; gold gnparser. Status: TEST consumed (test-ledger.jsonl).
- R0 FAIL 0.8575 vs wordshuf (strangers incl. code named taxonomic 6.4%) 0.1175, margin +0.7400, n=1807. fails the worst-stranger-kind clause (0.0641); streams of 60 words.
- R1 PASS 0.9011 vs strongest licensed 0.3065, margin +0.5946, n=1086. connector and qualifier lexemes have no gold (typed).
- R2 PASS 0.8947 vs strongest licensed 0.6362, margin +0.2584, n=24623. class inventory is gnparser word types.
- R3 PASS 0.8767 vs strongest licensed 0.2978, margin +0.5789, n=1086. species unchecked by backbone; higher classification is world knowledge (typed).
- R4 PASS 0.8611 vs strongest licensed 0.4189, margin +0.4422, n=1086. synonymy and ICNP bacteria unmeasured.
- R5 FAIL 0.9066 vs ablate_all (0.8972) 0.8972, margin +0.0094, n=900. margin 0.0094; renderings authored by script, natural Plazi-vs-GBIF pair is a minor stratum.
- Unmeasured (typed gaps): names embedded in prose (BHL OCR); synonymy relations; ICNP (bacterial) code; language-parallel agreement.

### 4.7 uml_bpmn

- Channel: structured-text (BPMN 2.0 XML, Graphviz DOT dialects; the drawn diagram is image). Corpus: bpmn_xml and dot dialects; strangers incl. xml_dmn, markup, mermaid. Status: TEST consumed (ledger.jsonl).
- R0 FAIL 0.8849 vs stranger rates; xml_dmn named bpmn 0.2444 0.2444, margin +0.6405, n=4210. failed checks: bpmn_xml head >= 0.95; stranger.xml_dmn <= 0.05; xml_cmmn absent from split (typed).
- R1 FAIL 0.9989 vs naive_regex (bpmn_xml 0.9934) 0.9934, margin +0.0055, n=739. failed: dot.misaligned <= 0.20 and dot causal check.
- R2 PASS 0.9990 vs strongest licensed 0.4577, margin +0.5413, n=619196.
- R3 PASS 1.0000 vs strongest licensed 0.5853, margin +0.4147, n=17262.
- R4 FAIL 1.0000 vs adjacent_flow (bpmn_xml) 0.3487, margin +0.6513, n=13022. failed solely on dot.C34.causal; bpmn_xml margin held.
- R5 PASS 1.0000 vs misaligned 0.0080, margin +0.9920, n=3224. derived renderings.
- Unmeasured (typed gaps): UML XMI; SBGN-ML; CMMN; drawn diagrams (image channel).

### 4.8 closed_codes

- Channel: text by construction (Morse dots/dashes, Unicode Braille UEB grade 1, ICAO spelling words); semaphore and maritime flags typed gaps (channel-bound). Corpus: DERIVED: public-domain English encoded by an authored encoder; every noise/jitter/decoy transform authored; ITU-R M.1677-1 licence sign-off still owed. Status: TEST NEVER RUN (PROVENANCE: no TEST measurement has been run); only dev_card_v1_registered.json exists; instrument header carries 14 AMENDMENT markers since the v1 DEV card.
- R0 PASS 0.9979 vs alphabet-only reader 0.7188, margin +0.2792, n=1260. DEV.
- R1 FAIL 0.9529 vs strongest licensed 0.6261, margin +0.3268, n=100. DEV: fails sub-claim r1c braille lexeme (cell_per_token control matches real, margin 0.012 < 0.05).
- R2 FAIL 1.0000 vs strongest licensed 0.6142, margin +0.3858, n=100. DEV: fails r2b braille cell class (context-free control not beaten significantly, p=0.25).
- R3: {applicable:false, reason: a closed code declares no beings; they live in the decoded plaintext (natural-language card)}
- R4: {applicable:false, reason: a closed code declares no relations}
- R5 PASS 0.8149 vs strongest licensed 0.2322, margin +0.5826, n=100. DEV.
- Unmeasured (typed gaps): TEST for every rung; natural (non-derived) Morse/Braille; semaphore, maritime flags; Nemeth, Music Braille, IPA Braille, UEB grade 2; Morse accented letters and prosigns.

### 4.9 Notation families surveyed but not built (feasibility, `/private/tmp/claude-501/notation/survey/matrix.json`, fetched 2026-10-05; no corpus was downloaded)

| family | survey decision | channel and blocker |
|---|---|---|
| logic | GO tier A | Metamath set.mm CC0 (51 MB), FOLIO CC-BY-SA; measures Metamath ASCII and FOLIO FOL, not 'logic' in general; no adapter yet |
| mathnot | GO with caveat tier B | LaTeX via Wikidata P2534 CC0; R3/R4 typed partial |
| go_sgf | GO tier A | SGF FF[4]; CWI games public-domain claim with provenance risk; no adapter yet |
| lojban | GO tier A | names by morphology (cmevla), the cleanest rule-4 test; Tatoeba CC BY; no adapter yet |
| esperanto | GO tier A (R0-R2,R5), B (R3/R4) | overlaps the natural-language card; keep one canonical run |
| siteswap | GO with caveat tier B | exact synthetic gold; Juggling Lab GPL-2.0 usable as oracle only |
| whale | GO with caveat tier B | symbolic unit sequences (Dryad CC0); never claim hearing whale song |
| circuits | PARTIAL tier B | SPICE/KiCad, narrow idiom; no independent parser installed |
| tablature, blazon, craft | typed gap / derived tier C-D | no open natural corpus, or period prose that is not the modern notation (CYC crochet bench is NC) |
| dance (Labanotation), sign (SignWriting/Stokoe), whistled (Silbo), vervet, bee, visual standards (Isotype, ISO 5807, ASME Y14.5), physics diagrams (Feynman, Penrose, string diagrams) | typed gap tier D | channel-bound (graphic/audio/image) or licence-blocked or paywalled; paywalled standards were NOT scraped and are unmeasured by rule; bees: R0-R4 N/A, one calibration agreement only |
| Wilkins/Leibniz philosophical languages | NO SURVEY ROW | named by the user, never surveyed |

## 5. What this card does NOT measure (unmeasured is not good)

- **Held-out freshness for any fix.** TEST is spent for natural languages, 8 code languages and 7 notation families. A re-run on the same TEST is a second read and invalid under rule 9. Every proposed fix needs a fresh draw (second PubChem draw, COCONUT CC0, second UD treebanks, new repositories) staged first.
- **Competence of khora's own hearing end to end.** Code R2 is scored over gold (whole-file tree-sitter) segmentation; the causal end-to-end licence fails everywhere. A code reader that reads left to right on bytes it has not already segmented has not been shown to classify tokens.
- **Languages**: typescript and rust (all rungs), the 40+ stub languages, c0 for six languages, c3 for seven, c5 for all eight (no held-out tasks). Code R4 extends for javascript (0 gold edges), c, go, java, ruby; imports are non-discriminating everywhere.
- **What the text ORDERS beyond static structure**: execution order, control flow, dataflow, build order, tool-call and harness-loop ordering (Lovelace accountability 1); identity under renaming; cross-artifact agreement (code vs docstring vs test).
- **Natural held-out agreement for code and for most notation R5**: tasks and renderings are authored or derived (chess renderings, taxonomy renderings, closed codes are all derived; music ABC is exporter-derived; uml/bpmn renderings are derived).
- **Closed codes on TEST at all**, and any natural (non-derived) Morse or Braille; semaphore, maritime flags, Nemeth, Music Braille, IPA Braille, UEB grade 2.
- **IUPAC names R1-R4, WLN, SELFIES/formula beings, InChI R1/R2 (mechanical), the aromatic stratum of SMILES R2, the table id within a codon stop class, 17 of 25 NCBI genetic-code tables, introns/frameshifts/selenocysteine, non-protein genes, natural RNA genomes written with U, LilyPond events, natural ABC, tablature, UML XMI, SBGN, CMMN, drawn diagrams.**
- **Everything channel-bound** (dance, Labanotation, sign, whistled Silbo, bee waggle video, vervet and whale audio, Isotype, heraldry as drawn, Feynman/Penrose/string diagrams, flowcharts) and everything paywalled (ISO 5807, ASME Y14.5, IEC 60617): not scraped, not measured.
- **Reading rungs on non-ASCII source code**, identifier sub-word reading by the prose reader beyond the c1 coverage statistic, natural-language comments inside code, mixed artifacts (SQL in strings, regex in code).
- **The 31 natural-language stems with priors and no TEST card**, claims/negation/time, coreference, morphology inside the word, dialect and register (natural-language card section 8).
- **Causality of R5 matching** (code and natural languages) and of any rung whose reader is a whole-file two-pass reader (javascript R3 says so).
- **Whether any of this is good.** The instruments test conformance with a standard or a hand-built convention on 3-5 repositories or 22-25 genomes/languages. A pass is a pass against a named control on one split.

## 6. Root causes (clustered; priority = language-rungs and families unlocked)

### RC1 [priority 1, fault: design]

- **Cause:** TEST-read plumbing: the aggregator logs every rung as read even when a rung returned a guard refusal, c0/c3 refuse TEST unless env gates (C0_FINAL, C0_ARM, C3_FINAL_TEST) that run.mjs cannot forward, the c0 lock fingerprints identify.js and the priors for ALL languages, and the chem_smiles CLI parses --split as a split name and silently writes an all-null card (no rerun guard). Result: c0 reads logged-but-unread for python, go, java, typescript, rust, ruby; c3 refused for 7 of 8 languages; one language (javascript) reads c3.
- **Scope:** c0 x 6 languages (python, go, java, ruby, typescript, rust); c3 x 7 languages; chem_smiles CLI; any future TEST card (rule 9)
- **Files:** native/eval/coding-competence/run.mjs; native/eval/coding-competence/c0-identify.mjs; native/eval/coding-competence/c3-declared.mjs; native/eval/notation-competence/chem_smiles.mjs (CLI lines 1425-1437, foldRung 312-330)
- **Fix:** run.mjs: append to test-reads.jsonl only rungs whose result has n>0 (or that actually opened a TEST file) and record per-rung outcome plus the gate environment on the card; add --arm to run.mjs and export C0_ARM; read c0-test-reads.jsonl when computing 'TEST reads before'; report guard-refused rungs as 'guarded, not read'. Main agent decides by dated amendment (never by editing the log) whether python's logged c0 entry is void (no python line in c0-test-reads.jsonl, so no TEST file was opened). chem_smiles.mjs: parse --split/--limit, reject unknown splits, exit non-zero on an all-gap card, refuse to overwrite card-test.json without an explicit amendment id; drop rung-level score/control/margin from foldRung.
- **Rule compliance:** Rule 9 (TEST once) and II.5: the fix tightens discipline; no threshold changes; the frozen arm named_sum is the pre-registered v1 arm (DEV recommended none): keep identify.js frozen or delete the lock and re-freeze deliberately, one decision for all languages.

### RC2 [priority 2, fault: design]

- **Cause:** Ceiling-bound pre-registered margins: rules demand +0.10 (or +0.05, +0.2) over the strongest cheap baseline when that baseline already sits at 0.94-0.9999, so the rung cannot pass whatever the reader does (the instrument says so itself: 'a perfect lexer would fail it too'). Imports in code are non-discriminating against a naive regex. This is also a RESULT: on regular, closed lexical grammars the learned prior adds nothing measurable over hand-typed grammar.
- **Scope:** code R1 clauses d1/d2: python, javascript, c, go, java (ruby has headroom 0.1092, margin 0.0724 genuine miss); code R2 clause D: python, javascript (hand baselines recipes/declKw at 1.0); code R3 FT clause (python DEV); code R4 imports typed gap non_discriminating_vs_naive: all 6 measured languages; notation: chem R0 (headroom 0.005 vs 0.2), chem R2 micro (bracket share 0.0319 < 0.05), chem R1 licence, ipa R1/R4, uml R1, genetic R4
- **Files:** native/eval/coding-competence/c1-lex.mjs (d1/d2); native/eval/coding-competence/c1-baselines.mjs; native/eval/coding-competence/c2-names.mjs (clause D); native/eval/coding-competence/c3-declared.mjs; native/eval/notation-competence/chem_smiles.mjs (scoreR0 409-524, scoreR1Smiles 543-580, scoreR2Smiles 710-720)
- **Fix:** Dated pre-registered amendment, written before any re-run and judged on a FRESH held-out draw, never to relabel these cards: when baseline headroom < required margin, emit the typed gap non_discriminating_vs_baseline (the device c4 already uses for imports) and gate on a non-inferiority bound with a derived tolerance (relative error reduction with a declared factor); keep licences (controls built to fail) gating; report the original FAIL verdict beside it. Replace absolute floors that depend on corpus composition by stratum-level rules (chem R2: decisive bracket stratum, micro as diagnostic with the bracket share printed). Add rare-form strata as separate typed rows so TRAIN sparsity is visible.
- **Rule compliance:** II.5 (amendment first), II.23 (licences stay; a control that equals the real arm still means 'rung cannot discriminate', now typed instead of a silent fail), P4 (tolerance derived from the paired-difference CI, not chosen).

### RC3 [priority 3, fault: design]

- **Cause:** R0 as a closed-set forced choice with no refusal arm. The reader is a closed-world naive Bayes that never abstains (chem_smiles: 0 abstentions of 3600; 96.3% of SMILES with one ')' moved still named smiles), and the controls are grammar-free character models that already score 0.99. Notation R0 fails on TEST for chem, ipa, taxonomy, uml_bpmn (4 of 7 TEST families). In code, c0's keyword channel is inert (python and javascript claim 2 FAIL: shape_only equals real; deranged 17/50 >= real) and repository count caps claim 1.
- **Scope:** notation R0: chem_smiles, ipa, taxonomy, uml_bpmn; code c0: all 8 languages (claim 2 FAIL on python and javascript; claim 1 null by MIN_REPOS elsewhere)
- **Files:** native/adapters/notation/chem_smiles.js (identify 630-657, featuresOf 578-622); native/adapters/code/identify.js; native/priors/code-identify.json; native/eval/coding-competence/c0-build-prior.mjs; native/eval/notation-competence/chem_smiles.mjs (R0)
- **Fix:** Adapters (main agent): split NOMINATE from REFUSE per class from the received grammar (prefix-monotone vetoes: unknown character, ')' before '(', closure before any atom; at end of text unclosed brackets), nominate among non-refused classes with a TRAIN char-bigram LM, add a 'none' decision and abstain when every class is refused. Instrument: add minimal-edit hard-negative pairs (same histogram, broken grammar) and an out-of-system refusal arm scored positively on abstention; derive the margin floor from headroom. Code identify.js: relative (first-indent-unit) indentation or drop absolute i:* features, repo-support floor MIN_REPOS=2 for the shape vocabulary, count file-level properties once per file; add the declared families {javascript,typescript,tsx} as a secondary metric and a typed gap subset_ambiguity; mask strings/comments before the keyword channel; per-keyword-identity likelihood over engine-arbitrated hard sets. DEV prototype (chem, DEV only): grammar-broken SMILES called smiles 0.000, intact 1.000.
- **Rule compliance:** Rule 3 (priors refuse or nominate, never admit): the fix is literally the rule; rule 4 (no casing as THE signal); any identify.js change refuses on c0-final.lock and needs a new lock for all languages (RC1).

### RC4 [priority 4, fault: instrument]

- **Cause:** R2 for code is scored over GOLD segmentation (whole-file tree-sitter tokens) and its causal end-to-end claim is NOT licensed in any measured language; controls are siblings of the real arm (freqT2 shares S1's context table, so margin 0 by construction on javascript); the recipes arm is flattered (declaration matches that map to no unit are counted as outsideUnits and never charged: python TEST 21 docstring/string matches, recipes F1 1.0 vs 0.990 charged; c2-names.mjs line 689, verified in file).
- **Scope:** code R2: python, javascript, c, go, java, ruby (6)
- **Files:** native/eval/coding-competence/c2-names.mjs (line 689, clause D, causalEndToEnd licence); native/eval/coding-competence/c2-lib.mjs
- **Fix:** Charge every recipes admit that falls outside a decision unit as a false admit; use the whitespace-lexer arm as the licence control for causalEndToEnd (it already moves the statistic to 0 on python); score S1_lex (khora's own left-to-right lexer) as primary once licensed; make the admission control a different mechanism, not a sibling sharing the table; report refusal skill as error reduction against the base-rate error (room for A2 is 0.0258).
- **Rule compliance:** Rule 1 (causal): scoring over gold segmentation is lookahead on the hearing step; II.23 (a licensed control that does not move means the licence is wrong).

### RC5 [priority 5, fault: mechanism]

- **Cause:** Name-gate precedence and commit window: the TRAIN-settled non-name tier T2 outranks the text's own introducer (python: x y c s refused though defined; DEV precedence variant gives F1 1.0 with refusal coverage unchanged); javascript H=1 commit cannot tell a declaration from a call or a value-bearing key (DEV bounded-commit prototype F1 0.8114 -> 0.9067, leave-one-TRAIN-repo-out 4/4 repos up); the reader loads the OLD keyword prior code-kw-js.json (13 of its 43 'hard' words are legal names, omits this/true/false/null/super; code-kw-javascript.json is V8-arbitrated and unused).
- **Scope:** code R2: python, javascript, java (A2 fails), c; R2 for typescript and rust once built
- **Files:** native/adapters/code/name-gate.js (judge(), commit window); native/adapters/text/code-structure.js (CODE_KW_FILE); native/eval/coding-competence/build-c2-priors.mjs; native/priors/code-ctx-js.json
- **Fix:** name-gate.js judge(): a context nomination at a level with >= N_MIN_CTX support and ratio >= THETA_ADMIT whose key contains a received declarator outranks T2; T1 (engine hard keywords, 0 errors on 13271 refusals) stays absolute; add a declared bounded-window commit (read to the closing bracket / RHS of '=' or ':', window length declared and recorded) as arm S2 with extended checkCausality; raise SETTLED_MIN_REPOS so a settled non-name is not one repository's test vocabulary; soft keywords nominate, never refuse.
- **Rule compliance:** Rule 3 holds (T1 refuses, context nominates); causal (verdict is a function of the prefix up to the declared window end); re-registered, judged on TRAIN leave-one-repo-out; any c2 TEST read afterwards is a new read on a fresh draw.

### RC6 [priority 6, fault: mechanism]

- **Cause:** Lexer prior inherits TRAIN sparsity of a closed lexical grammar: python TRAIN has 0 triple-single-quote strings, 0 b'..' strings and no '>>', '>>=', '&=', '%=' (TEST: operator '>>' 0/14, '>>=' 0/2, string recall 0.9602, d1 margin significantly below zero); javascript regex literals are never lexed (conditional: [] because the opener precision counts comment tokens in the denominator; TEST string:regex 536/536 missed, highlight.js F1 0.9158 vs 0.991 elsewhere); 11 of 38 ECMA-262 reserved words missing from the lex keywords; typed keyword-vs-standard gaps: C 23 of 44, Java 19 of 51, Ruby 14 of 41.
- **Scope:** code R1: python, javascript, c, java, ruby
- **Files:** native/adapters/code/lex.js (deriveLexPrior); native/eval/coding-competence/build-lex-prior.mjs; native/priors/code-lex-{python,javascript,c,java,ruby}.json
- **Fix:** Union the TRAIN-derived lex prior with a RECEIVED closed lexical standard with a named giver (Python Language Reference 2.4/2.6 via tree-sitter node-types, ECMA-262 12.1 InputElementRegExp, ISO C N1570 6.4.1, JLS SE 21, ruby-lang.org syntax doc); exclude tokens owned by an unconditional comment/string spec from the conditional-opener denominator; handle backslash-newline as a received continuation token; the prior stays a nominator (the scanner decides by longest match). Add a rare-form stress fixture (authored, labelled) and score rare forms as their own typed stratum.
- **Rule compliance:** Rule 3 (nominate, never admit), rule 4 (no casing), rule 9 (TRAIN-only plus an external giver, no corpus peeking); a new reader means a new instrument version and a fresh held-out draw.

### RC7 [priority 7, fault: data]

- **Cause:** Too few repositories per split: MIN_REPOS = ceil(log2(1/0.05)) = 5 are needed for any repository-level sign test at alpha 0.05; TEST has javascript 3, java 3, ruby 3, typescript 3, rust 3, go 4, c 5 (4 extension-labelled for c0), python 5 (but lopsided: 3 of 5 repos are not typical python projects and two contribute one file each). A template-lineage leak exists across the split (alibaba/canal DEV admin-ui is a derivative of PanJiaChen/vue-element-admin TEST: 11 of 31 canal files share a relative path with 49 TEST files). javascript TEST has 0 gold extends edges. Natural-language c0 gold for matlab/.h/.m/.v/.pl is derived from content rules (gold_circular).
- **Scope:** code c0 claim 1: 7 languages; code c4 extends: javascript (0 gold edges), c/go (not applicable); per-repo clauses in python (flask/fastapi 1 file each); c0 gold basis for ambiguous extensions
- **Files:** native/eval/coding-competence/corpus/plan.py; native/eval/coding-competence/corpus/build_manifest.py; native/eval/coding-competence/run.mjs (add template-lineage guard to G1)
- **Fix:** Raise QUOTA to >= 5 repos per language per split (javascript needs >= 10 more permissively licensed repos); add a template-lineage guard to G1 (flag repo pairs in different splits whose shared-relative-path share exceeds a declared threshold; assign by family); add class-hierarchy repositories for javascript; record refusal-filter counts per (language, split) in the manifest; rebuild c0 priors from extension-labelled TRAIN rows only.
- **Rule compliance:** Rule 9 (split by repository), rule 11 (permissive licences only, PROVENANCE note per fetch, 60 MB cap per family).

### RC8 [priority 8, fault: data]

- **Cause:** R5 has no held-out suite: c5-tasks/test is empty, the 12 reserved tasks are 'to be authored by another hand', DEV's 60 tasks were authored after reading edges.js, a one-language card cannot form cross-language pairs, and the aggregator flags 'no_preregistration_header' falsely (its regex misses 'PRE-REGISTRATION' and scans only 140 lines). Notation R5 is mostly derived or script-rendered (chess, uml, taxonomy, music, closed codes).
- **Scope:** code R5: all 8 languages; notation R5 where renderings are authored
- **Files:** native/eval/coding-competence/c5-agree.mjs; native/eval/coding-competence/c5-tasks/; native/eval/coding-competence/run.mjs (line 200-201)
- **Fix:** Source held-out parallel implementations from natural permissively licensed data (TheAlgorithms/* repositories are MIT: python, javascript, java, c, go, ruby versions of the same algorithms; record URL, licence and fetch date in a PROVENANCE note); label any authored fixture as authored; run c5 in the pooled --all TEST card (one read); fix the header scan (match PRE-?REGISTRATION and read the whole leading comment block).
- **Rule compliance:** Rule 11 (Rosetta Code is GFDL, not on the permitted list: do not use); a model-authored suite stays labelled authored, never presented as natural held-out data.

### RC9 [priority 9, fault: mechanism]

- **Cause:** Genetic code-state inference: settlement is a single-look LLR at every occurrence over overlapping windows (anti-conservative; 6 of 22 TEST genomes settle a wrong status for a long stretch: Rickettsia AGR=stop from residue 1961 to 9933), provisional tokens use the TRAIN majority default (13 vs 12 genomes, a coin flip) until settlement at 2-9 kb in 15-40 kb genomes, no replay after settlement, abstention instead of nomination in R4, and a composite R5 that adds symmetric-but-wrong strand agreement to correctness. Final-state diagnostic (non-causal): R2 0.9985, R5 composite 0.813.
- **Scope:** genetic R2, R4, R5 (3 of 6 rungs)
- **Files:** native/adapters/notation/genetic.js (decideStatus, updateState, evaluate, coherent, aaFor, scanGenome); native/eval/notation-competence/genetic.mjs (measureR2, measureR4, measureR5)
- **Fix:** Settle-then-replay: when a disputed status settles at residue s, re-read the consumed prefix under it and emit revised tokens/beings at=s with a revises link (a function of residues <= s, still causal; provisional emissions keep their flag); derive the settlement boundary on TRAIN (sequential threshold so that the share of prefixes ever settling the WRONG status <= alpha at all looks; context-stratified null for stop-abutting-gene); nominate (flagged provisional) the TRAIN-weighted majority amino acid among compatible tables instead of abstaining (DEV 0.918 -> ~0.98, ties stop_class_only); restate R4 as non-inferiority to stop_class_only plus a typed unmeasured 'table id within class'; gate R5 arms separately; score unreadable codons identically for real and controls and add a block-bootstrap p-value.
- **Rule compliance:** Rule 2 (identity does not decay: provisional beings are linked to, not silently retracted), P4 (derived boundary), II.5 (pre-register, then re-measure on a FRESH split: TEST is consumed).

### RC10 [priority 10, fault: mechanism]

- **Cause:** chem_smiles adapter defects found by diagnosis (agent diagnosis, adapter not edited): (a) readInchiText advances compCursor by 1 after a 'k*' repeat segment and fetches the component size once before the repeat loop: on 1376 engine-derived multi-component InChI fixtures the shipped adapter equals RDKit in 86.8% and a patched copy in 100% (20 silent wrong reads); invisible on natural DEV/TEST (118 multi-component, 19 repeat-prefix of 6000); (b) several ring-closure digits on one atom ('Cc1cccc2ccccc12') compute the first closure ring on a graph lacking the second closure bond (44% of the 144 DEV molecules with wrong rings); (c) ring beings are causal shortest cycles, not SSSR (symmetrised SSSR over the reader's own graph gives DEV ring F1 0.9999); (d) R0 identify never refuses (RC3).
- **Scope:** chem R3, R4 (InChI), R5(a); chem R0
- **Files:** native/adapters/notation/chem_smiles.js (lines 430-467: size at 435, compCursor += 1 at 465; ring emission 244-250 and 456-458; shortestPath 134-150)
- **Fix:** InChI: size per repetition as compSizes[compCursor + rep] inside the rep loop and advance compCursor by reps (3-line diff); emit a typed gap when consumed atoms differ from the formula-layer count. SMILES: defer ring emission for a digit run on one atom to the next non-digit token (still causal), add all closing bonds of the run, then compute shortest cycles; implement symmetrised SSSR as a pure function of the prefix graph, allowing retraction, and change the causality licence from 'prefix rings subset of whole rings' to prefix-purity (read(prefix) == f(prefix graph)). Add a multi-component InChI engine-derived stress stratum (labelled authored/engine-derived).
- **Rule compliance:** Rule 1 (causal via prefix-pure retraction), rule 8 (silent wrong reads become typed gaps), rule 10 (proposals only, adapter not edited here).

### RC11 [priority 11, fault: design]

- **Cause:** Convention-replica and tautology rungs: gold and reader implement the same standard or convention, so a pass certifies conformance, not skill. chess_pgn scores 1.0000 on five rungs (python-chess and the board organ share the FIDE rules; ear and oracle share one token grammar); ipa R1/R4 gold is the segments-library Unicode-category rule and a chart-free segmenter reproduces it at 0.9999; chem R1 token regex vs the adapter's munch; code R4 gold is tree-sitter and only python has a second authority (CPython ast, 6076 calls, 800 imports, 46 extends, 0 disagreements; c/go/java/ruby: 'no second authority'); closed codes have a tautology floor (table identity).
- **Scope:** notation: chess_pgn x5, ipa R1/R4, chem R1/R2, closed_codes, music R1; code R4 x 6 languages (c, go, java, ruby single-authority)
- **Files:** native/eval/notation-competence/*.mjs (card headers); native/eval/coding-competence/c4-edges.mjs
- **Fix:** Add an 'authority independence' field to every rung result, one of {independent_engine, same_standard, same_convention, authored, derived}; report conformance rungs as conformance in the card; add a second authority where one exists (python ast done; Java: javac on a machine with a JVM; Ruby: Ripper; Go: go/parser (no go toolchain here: typed gap); JS: acorn/V8; chess: a second engine). Never list a same-standard 1.0000 as evidence of 'reading well'.
- **Rule compliance:** Rule 8 (gaps are results), II.23 (a control built to fail must exist: a perfect score with a conformance-bound gold is the signature of an instrument that cannot fail).

### RC12 [priority 12, fault: prior]

- **Cause:** Unbuilt readers and prior provenance: typescript lacks lex and ctx priors, an edge recipe and a loader entry, so all 6 TEST rungs are holes although DEV scratch shows R1 0.9983, R3 0.9401, R2 0.7936 vs 0.7933; rust has only keyword and name priors (6 holes); 40+ languages have 6.5 KB stub cards (no measure() export). priors/code-name-py.json, code-name-js.json, code-name-c.json, code-name-go.json record no trainRepos and the py file contains Flask and FastAPI (names from python TEST repos); they are loaded only by the older genericity path of code-structure.js, no measured rung loads them (verified by grep and by reading the priors).
- **Scope:** code: typescript (6), rust (6), 40+ languages; guard G2 'partial' on python, javascript, c, go cards
- **Files:** native/adapters/text/code-structure.js (CODE_KW_FILE, CODE_KW_LANG, CODE_NAME_SPLIT_FILE); native/eval/coding-competence/build-typescript-priors.mjs; native/eval/coding-competence/build-rust-priors.mjs; native/priors/code-name-{py,js,c,go}.json
- **Fix:** Build typescript and rust lex/ctx/edge recipes from TRAIN with named givers (typescript compiler 5.6.3 + tree-sitter already used for code-kw-typescript.json); repoint the old name loaders to train-only files or retire them (see sourceEdits); record trainRepos in every CodeNamePrior@1.
- **Rule compliance:** Rule 3 (typed gap for a system without a received prior), rule 9 (TRAIN-only).

### RC13 [priority 13, fault: instrument]

- **Cause:** Guard G0 reports 3 failing repository tests (tests/barker-induce.test.js x2: dominantSplit planted gap and Level R planted relation classes; tests/law-corpus.test.js x1: FAMILY_OF frozen table) that belong to the Barker and law workstreams. They make run.mjs exit 1 and mark every code card guards 'failed' although no coding test fails (1189/1192 pass). A card consumer reading the exit code would misread every language.
- **Scope:** all code cards (8) and all natural-language cards (25)
- **Files:** native/tests/barker-induce.test.js; native/tests/law-corpus.test.js; native/eval/coding-competence/run.mjs (G0 scope)
- **Fix:** Owners of Barker/law repair or pre-register those tests; run.mjs scopes G0 to tests touching the language under test (or labels failures 'other workstream') and reports which guard failed per language.
- **Rule compliance:** Rule 8 (typed result with denominator); no coding change needed.

## 7. Source edits the main agent must make (proposals only; I edited none of these)

1. **native/adapters/code/language.js** (EXT_TO_LANGUAGE (lines 27-39) and detectCodeLanguage). Add `".java": "java"`, `".rb": "ruby"`, `".rs": "rust"`, `".mts": "typescript"`, `".cts": "typescript"`. Decide `.tsx` (currently folded into typescript; eval/coding-competence/corpus/langmap.py treats tsx as its own language and the TEST corpus excludes it from typescript) and `.h` (currently 'c' by extension alone; langmap resolves .h by content/repo vote, so C++/ObjC headers are silently read as C: either map .h to null, honouring 'never content-guessed, a stranger is null', or keep and disclose). Update the JSDoc union. Do NOT add cpp/c_sharp/php/kotlin/swift/scala/bash until a measured card exists; an unmeasured language must say so.  
   Why: Measured languages (java, ruby partial; rust and typescript unmeasured) are invisible to the language detector today; the stranger-is-null discipline stays.  Gate: tests that enumerate detectCodeLanguage; main agent adds a typed disclosure for typescript/rust 'prior present, card unmeasured'.
2. **native/adapters/text/code-structure.js** (CODE_KW_FILE, CODE_KW_LANG (lines 47-48), loadCodeKeywordPrior). Repoint `js` from code-kw-js.json to code-kw-javascript.json (V8-arbitrated; 35 hard words, soft words listed apart; code-kw-js.json mixes 13 legal-name words into 'hard' and omits this/true/false/null/super). Add entries c -> code-kw-c.json, go -> code-kw-go.json, java -> code-kw-java.json, ruby -> code-kw-ruby.json, rust -> code-kw-rust.json, typescript -> code-kw-typescript.json (grammar + tsc 5.6.3 arbitrated, 44 hard / 41 soft) and delete the comment 'there is deliberately NO typescript alias' (superseded: the junk list it measured is not this file). Also add the same codes to CODE_KW_LANG.  
   Why: name-gate.js loadKeywordSet already loads code-kw-<code>.json directly for non-py/js; the loader is the only place py/js are pinned to the old files.  Gate: run tests/coding-*-priors.test.js and the existing code-structure tests; any c2/c0 javascript re-read after this change is a new read on a fresh draw (TEST is spent).
3. **native/adapters/text/code-structure.js** (CODE_NAME_SPLIT_FILE (line 77), loadCodeNamePriorSplits (97-98)). Repoint py -> code-name-python.json (TRAIN-only, 4 repos) and js -> code-name-javascript.json (TRAIN-only, 4 repos); for c and go use code-name-train-c.json (8 repos) and code-name-train-go.json (5 repos) after checking schema equality with the old split files (names, counts, provenance), or rebuild code-name-{c,go}.json with provenance.trainRepos. Retire code-name-py.json (contains Flask and FastAPI from python TEST repos; no trainRepos).  
   Why: Four priors on the genericity path cannot be cleared by guard G2 (agent: 'UNVERIFIABLE'; confirmed in files: trainRepos undefined for code-name-{c,go,js,py}.json).  Gate: genericityOf and codeGist outputs will change: run the existing code-structure tests and diff on a fixture before merging.
4. **native/adapters/code/name-gate.js** (judge(), loadKeywordSet (78-87)). Precedence: a context nomination with >= N_MIN_CTX support and ratio >= THETA_ADMIT whose key contains a received declarator outranks the T2 settled refusal; T1 stays absolute. Add the declared bounded-window commit as arm S2 with extended checkCausality; point js at code-kw-javascript.json via the loader change above.  
   Why: RC5; DEV-only evidence: python F1 0.9963 -> 1.0, javascript 0.8114 -> 0.9067 (TRAIN leave-one-repo-out 4/4 up).  Gate: pre-register in c2-names.mjs header first; new reader means new instrument version.
5. **native/adapters/code/lex.js** (deriveLexPrior). Exclude tokens explained by an unconditional comment/string spec from the conditional-opener denominator; accept a received closed lexical standard (named giver recorded in the prior) as a nominator union; handle backslash-newline continuation.  
   Why: RC6.  Gate: rebuild priors/code-lex-*.json from TRAIN only.
6. **native/adapters/code/identify.js (and eval/coding-competence/c0-build-prior.mjs)** (shape features i:*, keyword channel). Relative indentation unit, repo-support vocabulary floor, once-per-file file-level counts, mask strings/comments before the keyword channel, per-identity keyword likelihood. Rebuild priors/code-identify*.json from extension-labelled TRAIN rows.  
   Why: RC3; DEV: dropping i:* features gives python 133/134 from 128/134 (pool effect untested).  Gate: c0-final.lock fingerprints identify.js: any edit voids the frozen arm for ALL languages; do it only as a deliberate re-freeze.
7. **native/adapters/notation/chem_smiles.js** (readInchiText (430-467), SMILES ring emission (244-250), identify (630-657)). See RC10 and RC3: per-repetition component size; deferred ring emission for digit runs; prefix-pure symmetrised SSSR; refuse-then-nominate identify with a 'none' decision.  
   Why: agent-diagnosed defects, patched copy verified on engine-derived fixtures only.  Gate: tests/notation-chem_smiles.test.js (26 tests) plus a new repeat-segment fixture; TEST is consumed, re-measure on a fresh draw (second PubChem draw, COCONUT CC0).
8. **native/adapters/notation/genetic.js** (decideStatus, updateState, evaluate, coherent, aaFor, scanGenome). See RC9: settle-then-replay, derived sequential boundary, nominate-provisional majority aa, coherent() must not demote a settled status.  
   Why: RC9.  Gate: tests/notation-genetic.test.js (38 tests); fresh split.
9. **native/eval/coding-competence/run.mjs** (readTestReads/logging (599), header scan (200-201), module resolution). RC1 and RC8 fixes; name the R1 module explicitly (rename c1-lex.mjs to c1-hear.mjs or add a rung map; four files export measure() and the aggregator picks 'the first by name' and flags ambiguous_module); keep c1-loro, c1-xauth, c1-xauth-class under non-rung names.  
   Why: A rename or a new c1-a*.mjs would silently change which instrument speaks for R1.  Gate: tests/coding-run.test.js.
10. **native/kernel/*, native/organs/*, native/the-fold/*, native/memory/*** (-). None proposed. The kernel stays medium-blind; every fix above lives in an adapter, a prior builder or an instrument.  
   Why: Rule 3.  Gate: -

## 8. Completeness critic

### 8.1 Reference list: feasible but not built
- logic (Metamath set.mm CC0, mmverify.py MIT as oracle; FOLIO CC-BY-SA for R5): tier A GO, no adapter yet
- go_sgf (SGF FF[4], CWI game database public-domain claim with provenance risk): tier A GO, no adapter
- lojban (cmevla marked by morphology, the cleanest test of rule 4; Tatoeba CC BY, camxes parsers): tier A GO, no adapter
- esperanto (UD_Esperanto-Prago CC BY-SA, Fundamento): tier A, must cross-reference the natural-language card to avoid a duplicate
- mathnot (Wikidata P2534 CC0 + LaTeX), siteswap (arithmetic gold; Juggling Lab is GPL: oracle only, never vendored), whale song (Dryad CC0 unit sequences; never present as hearing), circuits (SPICE/KiCad; no independent parser yet)

### 8.2 Reference list: typed gaps by the survey
- tablature, blazon (derived only), craft/knitting (Victorian prose is not CYC notation; CrochetBench is NC), dance/Labanotation (channel-bound, no open corpus), sign (SignWriting licence-blocked, Stokoe/HamNoSys NC), whistled/Silbo (audio, OpenSLR NC-SA), bees (continuous variables: R0-R4 N/A, one calibration agreement), vervet (audio, LDC terms), Isotype/visual standards (image channel; ISO 5807, ASME Y14.5, IEC 60617 paywalled: never scraped), physics diagrams (Feynman, Penrose graphical tensor notation, string diagrams: image/object channel, no permissive corpus)

### 8.3 Named by the user, no row, no adapter, no card
- Wilkins / Leibniz philosophical languages (Maat) appear in the user's list but have no survey row, no adapter and no card
- maritime flags and Chappe semaphore: a typed gap inside closed_codes (channel-bound), no separate measurement
- IPA Braille, Nemeth, Music Braille, UEB grade 2 (closed_codes covers UEB grade 1 only)
- IUPAC Blue Book as a giver (names read only as element n-grams from TRAIN tallies, not from the nomenclature); WLN (typed gap: no open corpus or writer)
- SBGN PD L1 (survey: needs an export route), UML class/sequence XMI (BPMN XML and DOT only), flowcharts (Gilbreth/ISO 5807 paywalled)
- ICNP bacterial code and synonymy relations (taxonomy), Esperanto/Lojban natural-language counterparts

### 8.4 Gaps in the ladder
- Lovelace's own accountability is unmeasured: no instrument measures the harness, the loop or the ORDER of operations a model cannot originate (what the-fold/code-loop.js, code-scout, code-hunt, code-piece do), nor control-flow order, call order within a function, build/dependency order or tool-call order; 'reading code is recovering what the text ORDERS' is measured only as static declarations, calls, imports and extends. A card of recorded harness traces with ordering invariants (read-before-edit, test-after-edit), labelled authored where synthesised, is missing.
- No identity rung. Memory notes say identity is a fold that survives substitution (slots, not spans). A cheap, controllable test for code: rename all locals/parameters by a bijection (tree-sitter gold gives scopes) and require the reader's beings/edges to map by that bijection; same for SMILES atom-order permutations (chem R5(a) does graph digest equality, which is the right model) and import aliasing (`import numpy as np`). Slot-delta ablation (ablate tokens, read slot deltas) is not applied to any code rung.
- R0 has no refusal arm anywhere: every R0 is closed-set forced choice or stranger rates on authored/assumed-negative text (taxonomy 'strangers are real text ASSUMED non-taxonomic'). Code R0 never sees a non-code or foreign-code stranger beyond the candidate set; prior-less languages are named as a neighbour (natural-language card RC6).
- R3 and R4 are N/A or typed for closed codes, IPA, bees; fine, but 'typed' ought to carry the alternative the family does have (for IPA: a segment-class inventory; for closed codes: plaintext handoff to the natural-language ladder): no instrument measures that handoff.
- No rung for NOMINATION vs REFUSAL as such: rule 3 says priors refuse or nominate; no instrument scores 'refused a true being' against 'nominated a false one' with the cost structure (R2 B3 in natural languages is the only one).
- No rung for code-switching inside one artifact: natural-language comments and identifiers inside code (c1 has a sub-word coverage statistic, python TEST 0.4374 vs random 0.142, margin 0.2954, but nothing hands identifier pieces to the prose reader or reads comments with the listening cast), SQL inside strings, regex inside code, markup inside prose, SMILES or FASTA inside documents (chess_pgn's stranger arm touches this once).
- Cross-family R5 is nearly absent: R5 is within-family or derived-rendering; there is no pair like code <-> docstring/README claim, or code <-> its test, which is where Lovelace's 'what happens outside the model' would be witnessed.

### 8.5 Families and languages a polyglot reader still needs
- Query languages (SQL, GraphQL: adapters/code/graphql.js exists with no card; SPARQL; jq), regular expressions as a notation of their own (a closed grammar with declared beings: groups, classes, anchors), markup (HTML/XML/LaTeX/Markdown: stub cards only), config and data (JSON/YAML/TOML/INI have 10-12 KB DEV stubs), shell and build files (bash, Makefile, Dockerfile, CMake), diff/patch/unified-diff, protobuf/Thrift IDL, binary formats (ELF, PNG chunks, protobuf wire, pcap), log and trace formats, URL/email/MIME grammars, spreadsheet formulas, units (UCUM), time/date notation (ISO 8601, cron), currency/phone/ISBN checksums, DNS and network notation.
- Programming languages with no card: cpp, c_sharp, php, kotlin, swift, scala, dart, bash, r, julia, lua, perl, haskell, ocaml, elixir, erlang, clojure, scheme, racket, zig, nim, verilog, solidity, objc, matlab, powershell, cobol, fortran, lean, svelte, vue, tsx, html, css, markdown, sql: stub cards (6.5 KB, 'no measure() export'); and the esoteric/constructed languages the user cares about (klingon has a stub, nothing else).
- Natural-language side (see eval/competence/CARD.md section 9): coreference and identity fold, morphology inside the word, dialect and register, in-sentence code-switching, 31 expansion stems with priors and no TEST card, Esperanto/Lojban as constructed languages with rule-4 value.

### 8.6 Does the evidence say a rung or a family is the wrong design?
- YES, as pre-registered, for code R1 and R2 on lexically regular languages. Six of six measured languages show hand-typed baselines at 0.94-0.9999 F1 / class accuracy and the learned prior's margin is -0.004 to +0.034 (ruby, the only language with real headroom, misses by 0.027). The honest reading is a negative result: the learned lex/keyword prior adds nothing measurable over a hand-typed delimiter+operator scanner, and keyword-tier-only S1 equals S1 in python. R1/R2 should be re-stated as strata on irregular constructs (regex literals, string prefixes, templates, heredocs, contextual keywords), not corpus means, or retired as gating rungs and kept as conformance diagnostics.
- YES for R2 'can this token name a being' in code: for a language with a received hard-keyword set the answer is a lookup (T1 refuses 13271 tokens with 0 errors); the live question is declaration versus reference, which is R3. R2 and R3 are conflated for code; the javascript R2 deficit (declaration vs call needs the bracket that follows) shows the real task is R3 with a bounded window.
- PARTLY for code R3: javascript passes on callable definitions (N-F1 0.9412 vs keyword_regex 0.4855) because arrow, assignment and method forms defeat a keyword regex; python DEV shows the opposite (callable 443/443 and type 80/80 found by the keyword regex too; the advantage there comes entirely from the 'constant' kind whose gold is a model-authored query, authored share of gold names 21.7%; typescript DEV 17.8%). So R3's verdict depends on which gold kinds are shipped versus authored: report authored-kind and shipped-kind as separate claims.
- NO for code R4 calls (the discriminating rung: reader 0.9916-1.000 vs the rung's naive control 0.56-0.93 and shuffled controls 0.00-0.03, with causality 0 retractions), but its independence is single-authority except python.
- YES for code R5 as sourced (authored tasks); the design is right, the data is wrong (RC8).
- YES for composite rungs: chem R1 licence on token-F1, chem R2 micro margin, genetic R5 composite, ipa R1/R4 convention replicas. A rung whose statistic is dominated by trivial units (1-character tokens, organic-subset atoms, symmetric-but-wrong strand agreement) measures corpus composition.
- NO, but under-powered, for natural-language R3 standing gate: the natural-language card's own finding (gate is the wrong mechanism, K:lexicon_filter 23/23) is the only place where evidence says the mechanism, not the instrument, is wrong; the code and notation work do not touch the listening-cast gate at all.
- The unit 'language x rung' is the wrong grain for code when TEST has 3-5 repositories: a per-language verdict is mostly a statement about 3 repos (javascript R0 per-repo accuracy 0.3 / 0.9 / 0.9). The card should report repository-level units and refuse per-language verdicts below MIN_REPOS (the c0 rule already does).

### 8.7 Negative results to keep on the record
- R0 keyword channel (code): inert; claim 2 FAIL python and javascript (shape_only 0.967 = real 0.967; deranged draws >= real 17/50).
- Python R2: S1 with the settled tier off scores F1 1.000: the received keyword prior plus def/class order do the work; learnedPriorsHelp NOT SUPPORTED.
- Genetic R4/R5: inference of the code state does not beat 'use the standard table' (R4) and has not been shown to help R5 on either split (DEV p=0.11).
- Natural-language card: standing gate falsified (carried over).
- chem R0, ipa R0, ipa R1/R4: character n-gram or Unicode-block lookup equals the reader: the reader is a lookup on these systems.

### 8.8 Process findings
- Several instruments were reviewed 'needs_fixes' twice, and the fix agents produced honest FAILs rather than tuned passes (chem R0, genetic R4/R5, ipa R0-R5). That is the instrument working; the card keeps those failures as failures.
- Pre-registered predictions that failed (chem: R1 PASS predicted, FAIL observed; R3 ring F1 < 0.90 predicted, 0.9878 observed; R4 chain_only 0.55-0.85 predicted, 0.4875; R5 names macro-J 0.45-0.70 predicted, 0.8233; genetic: P0' wrong on wordlist/caps_tokens) are reported in the family cards; none was tuned after seeing a result.
- Two TEST-lineage caveats not closed: alibaba/canal (DEV) is a vue-element-admin derivative (TEST) (38% of javascript TEST); the code gold extractor was corrected while looking at smoke files that include TEST repos.
- The user's brief listed Lovelace/notation/Barker/law/physics as unbuilt. Reality: code priors exist for 8 languages (typescript and rust without a measurable reader), 8 notation adapters and instruments exist, and every one has a TEST card except closed_codes. Barker, law and physics were not part of this synthesis; their only trace here is the 3 failing tests in G0.
- Licence flags still open: the ITU-R M.1677-1 PDF fetch for closed_codes is not on the permitted list and the user's explicit sign-off is owed (a CC BY-SA Wikipedia table and MIT oracles verify the same 36 signals); UN UDHR was removed from the closed_codes TEST split for the same reason; The Session ABC data was excluded (LLM-use prohibition).

## 9. Next order of work (by unlock count)

1. RC1 (harness gates and read ledger) and a one-line decision on c0-final.lock: unlocks the guarded cells without touching a reader. 2. RC2 (headroom-aware rule) written as a dated amendment, then re-measure R1/R2 on a fresh draw. 3. RC7 and RC8 (data: more repositories, TheAlgorithms-based c5). 4. RC4 (R2 end-to-end licence, charge recipes outside units). 5. RC3, RC5, RC6, RC9, RC10 (mechanism fixes, each with its own pre-registered arm and control built to fail). 6. RC12 (typescript, rust, the loader repoints). 7. Build the next tier-A families (logic/Metamath, go_sgf, lojban) and a Lovelace ordering instrument (section 8.4).

