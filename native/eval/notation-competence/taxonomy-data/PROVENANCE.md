# PROVENANCE — taxonomy notation family (scientific names of organisms)

Fetch date: 2026-10-06. Fetcher: `scripts/fetch.py` (copied in `/Users/mlacy/Documents/3.0/khora/native/eval/notation-competence/taxonomy-data/`). User-Agent
`khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)`; at most 4 parallel connections (6 for the small GBIF JSON calls), 0.25 s pause per
worker; no credentials, no login, no robots/terms bypass; no paywalled PDF was touched (only the Plazi/GBIF/Zenodo JSON/XML APIs below).
Family corpus on disk: 41,201,217 bytes (raw 33.7 MB incl. the 11 MB search index, corpus 5.5 MB, gold 1.9 MB) -- under the 60 MB cap.

## 1. The text corpus: Plazi TreatmentBank treatments

| item | value |
|---|---|
| source | Plazi TreatmentBank, `https://tb.plazi.org/GgServer/search` (index) and `https://tb.plazi.org/GgServer/xml/<docId>` (one XML per treatment) |
| what a record is | one taxonomic *treatment* (the part of a taxonomic paper about one name), XML with the curators' `<taxonomicName>` markup (GoldenGATE-assisted, human-curated) |
| licence | **CC0 public-domain dedication**, stated by Plazi (plazi.org footer "Published under CC0 Public Domain Dedication"; Plazi's position that treatment data and publication metadata are public domain whether or not they sit in copyrighted articles). Evidence, `raw/license_check.json`: for a seeded sample of 20 treatments per journal that carry a treatment-level Zenodo/BLR deposit (`<treatment ID-Zenodo-Dep>`), the Zenodo record licence is `cc-zero` in 240 of 240 sampled treatments, 12 of 12 journals (only a part of each journal's treatments carries its own deposit: ZooKeys 165 of 700, PhytoKeys 68 of 450, BDJ 59 of 450, MycoKeys 63 of 250, EJT 343 of 350, Adansonia 65 of 120, Linzer 133 of 230, Zootaxa 382 of 450, Phytotaxa 138 of 250, Papeis Avulsos 60 of 150, Blumea 28 of 150, Revue suisse 64 of 100; for the rest the status rests on Plazi's blanket declaration) (ZooKeys, PhytoKeys, BDJ, MycoKeys, EJT, Adansonia, Linzer biol. Beitr., Zootaxa, Phytotaxa, Papeis Avulsos de Zoologia, Blumea, Revue suisse de Zoologie). |
| **licence caveat (flagged for the orchestrator)** | the ARTICLE-level Zenodo deposits of some test journals carry non-commercial licences (Papeis Avulsos de Zoologia: CC BY-NC 4.0; Blumea: CC BY-NC-ND 4.0; Zootaxa and Phytotaxa article records: no licence field). Only the treatment records are CC0. The treatments were used on Plazi's CC0 declaration; if that is not accepted, drop those four test journals (they are labelled in `manifest.json`) and nothing else changes. Nothing from those journals reaches TRAIN or DEV. |
| size and sampling | per (journal, year 2008-2025) the search returns <= 500 index hits (71,124 hits recorded in `raw/index.json`); treatments were sampled with a seeded RNG (seed 20261006) inside each journal's pooled hits: 3,650 XML fetched (train 1,850 / dev 700 / test 1,100); 3,558 kept after the text build (train 1,787 / dev 685 / test 1,086; 92 dropped as shorter than 80 characters or unparsable) |
| text build | `scripts/build_corpus.py`: element text concatenated, whitespace collapsed, a newline at block boundaries, a tab between table cells, `normalizedToken` replaced by its `originalValue` (the verbatim text), each treatment cut at a paragraph boundary at <= 20,000 characters, characters above U+FFFF replaced by U+FFFD. Names the curators tagged are kept as spans (not as the gold: see 3). |

### Split (BY SOURCE = journal; `manifest.json`, `disjointness_check.ok = true`: 0 shared journals, 0 shared treatment ids)
| split | journals | treatments |
|---|---|---|
| train (priors only) | ZooKeys, PhytoKeys, MycoKeys, Biodiversity Data Journal (Pensoft) | 1,787 |
| dev (develop, smoke) | European Journal of Taxonomy, Adansonia, Linzer biologische Beitraege | 685 |
| test (ONCE) | Zootaxa, Phytotaxa, Papeis Avulsos de Zoologia, Blumea, Revue suisse de Zoologie | 1,086 |
Honest limit: dev/test share Plazi's extraction pipeline; train is Pensoft TaxPub XML (the markup resolves fewer abbreviations through attributes than the PDF-extracted dev/test markup does).

## 2. Independent authorities for the gold (never the system under test)
| authority | what it decides | licence / provenance |
|---|---|---|
| Plazi curators' markup | what is a name mention; for abbreviated mentions which genus | CC0 (above) |
| **gnparser v1.11.1** (Global Names Parser) | word boundaries and word types, canonical form, authorship (original / combination / ex / in), year, quality warnings | MIT. Used through the PyPI wheel `gnparser 0.1.3` (pieterprovoost/gnparser-python) found pre-installed in `/private/tmp/claude-501/venv`, which loads a prebuilt native library `libgnparser.dylib` (sha256 `7dd6b3f03f750d7ec8daa485303ab2c6f2124f66d370e1a2eae9ea488a6a7c1d`) wrapping the Go library. The adapter never imports it. |
| **GBIF Backbone Taxonomy** (`https://api.gbif.org/v1/species/match?strict=true`, `/species/<key>`) | for uninomials: does the name exist, at which rank class (genus-like / higher-like); the Backbone record of the taxon Plazi links to a treatment (R5 natural pair) | dataset d7dddbf4-2cf0-4f39-9b2a-bb099caae36c, DOI 10.15468/39omei, **CC BY 4.0** (the dataset API says `legalcode/by/4.0`; the task hint said CC0: the API is the authority) |
| Plazi `ID-GBIF-Taxon` link | which Backbone taxon a treatment is about | Plazi markup (CC0) |
| the nomenclatural Codes (ICZN 4th ed. 1999; ICN Shenzhen 2018) | the givers of the lexicon prior (rank markers, family-group suffixes, year window, connectors). Free to read, copyrighted: only facts (suffix lists, rank terms, article numbers) are encoded in `priors/notation-taxonomy-lexicon.json`, with the article cited per row. Not scraped. | giver only |
GBIF calls made: 3,552 species/match (uninomials), 967 species records (dev + test treatments), 317 species/match for the false-positive adjudication (146 binomials + 171 uninomials, distinct ids); Zenodo calls: ~240 (licence samples). Caches: `raw/gbif_uninomial.json`, `raw/gbif_records.json`.

## 3. Gold (`scripts/build_gold.py`; never runs the adapter)
A curators' span is GOLD only when gnparser agrees (parsed, cardinality 1-3, quality <= 4, identity equal to the curators' attributes; abbreviated genus must prefix the curators' genus; authorship counted only where it is in the text) and, for uninomials, the Backbone knows the name at an agreeing rank class. Otherwise NEUTRAL (typed by reason, counted):
| split | gold | gn_unparsed | gn_low_quality | epithet_only | identity_mismatch | gbif_no_match | kind_disputed |
|---|---|---|---|---|---|---|---|
| train | 17,591 | 213 | 95 | 395 | 527 | 968 | 88 |
| dev | 4,877 | 200 | 65 | 208 | 155 | 245 | 9 |
| test | 8,888 | 362 | 88 | 605 | 356 | 828 | 64 |
Abbreviated mentions the curators left without a genus attribute are resolved by the UNIQUE-INITIAL rule over the document's gold full names (train: 2,855 `doc_unique`, 466 ambiguous, 47 none; dev: 2; test: 1; the dev/test markup resolves abbreviations through attributes). `claims_ok = false` marks spans whose authorship gnparser read with a quality-3+ warning (train 371, dev 121, test 552).

## 4. Strangers for R0 (`scripts/build_foreign.py`; nothing fetched, local files with their own provenance)
Windows of 60 whitespace words: prose_en (`/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg`, Project Gutenberg public domain, without The Origin of Species and Moby Dick; `05-academic-papers/ntrs-white-papers`, NASA public domain), prose_xx (`ethos/11-multi-language/{german,french,italian,latin}-originals`, `wikipedia-lang`), legal (`ethos/06-government-legal/{world-legislation,un-udhr}`), code (`ethos/09-source-code/<repo>`, split by repository), and sibling notation families built in parallel under `/private/tmp/claude-501/notation/` (chess_pgn, chem_smiles records and names, genetic FASTA sequence lines without headers, music_abc), each with its own PROVENANCE. A source goes to exactly one of train/dev/test by md5 bucket (50/25/25); sibling corpora keep their own split. Strangers are real text ASSUMED non-taxonomic: dev inspection found one Czech statute that lists protected species with Latin binomials (the reader was right), see the report.

## 5. Priors (`/Users/mlacy/Documents/3.0/khora/native/priors/notation-taxonomy-*.json`, built from TRAIN only by `eval/notation-competence/taxonomy-data/build-priors.mjs`)
lexicon (givers: ICZN, ICN; TRAIN counts per entry), genera (gazetteer, epithets, author words, suffix tables; giver: TRAIN gold), refusal (giver: TRAIN running text), classifier (naive-Bayes count tables fitted cross-source, thresholds derived on held-out folds), identity (R0 Poisson rates, TRAIN-stranger threshold, activation window measured by kernel `dmdWindow`). Every file names its giver and its split.
