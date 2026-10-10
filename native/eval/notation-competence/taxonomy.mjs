// eval/notation-competence/taxonomy.mjs — competence ladder R0..R5 for TAXONOMIC NOMENCLATURE (scientific names of organisms in running text).
//
//   node eval/notation-competence/taxonomy.mjs [--split dev|test] [--limit N]      (prints the card; also written to $TAXONOMY_ROOT/results/)
//   import { FAMILY, measure } from "./taxonomy.mjs"      measure({split="dev", limit=null}) -> { family, rungs: { r0..r5 } }
//
// SYSTEM UNDER TEST: adapters/notation/taxonomy.js (ear -> tokens with class, read -> beings + relations, identify for R0), reading with RECEIVED priors
// only: priors/notation-taxonomy-{lexicon,genera,refusal,classifier,identity}.json. The kernel is touched only through kernel/activation.js (decaying
// activation of the cast of genera). THE ADAPTER IS NEVER THE GOLD. The gold is built by eval/notation-competence/taxonomy-data/build_gold.py, which
// never runs the adapter: Plazi TreatmentBank curators' <taxonomicName> markup, audited by gnparser v1.11.1 (Global Names, MIT; word boundaries,
// word types, canonical form, authorship) and, for uninomials, by the GBIF Backbone Taxonomy (CC BY 4.0; the name must exist at an agreeing rank).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file on any split; no threshold below is tuned after a ═══
// ═══ result; a failure is reported as a failure; amendments are appended as dated blocks and the registration digest moves)              ═══
//
// DISCLOSURE (what was seen before this header was written). Corpus-level and gold-level facts only, no reader output on dev or test: the sizes and
// neutral-span counts of the gold audit (dev 685 treatments / 4,877 gold spans, test 1,086 / 8,888; TRAIN 1,787 / 17,591); a pilot of 41 treatments from
// eight journals (four of them test journals) was read as MARK-UP (names and attributes), not through the reader; the licence samples; the TRAIN
// cross-source fits printed by build-priors.mjs (binomial candidate F1 0.96, uninomial candidate F1 0.53, R0 TRAIN threshold and 0.8 TRAIN
// resubstitution TPR). The adapter was exercised on TRAIN documents and on hand-written strings only. The dev split was not read by the reader.
//
// CLAIM. A zero-model reader that holds only RECEIVED priors (the nomenclatural Codes' rank markers and family-group suffixes, a genus / epithet /
// author gazetteer and refusal vocabularies counted in TRAIN journals, naive-Bayes count tables fitted cross-source on TRAIN) and reads causally can,
// on HELD-OUT treatments from journals that none of its priors came from,
//   (R0) name the system taxonomy from content alone, and refuse hard negatives (taxonomic prose with no name in the window) and strangers,
//   (R1) hear the lexemes of a scientific name (genus, epithet, rank marker, author, year ...),
//   (R2) classify them,
//   (R3) find the beings the text declares (taxa; identity folds abbreviated and full genus: "P. concolor" = "Puma concolor"),
//   (R4) find the relations and claims (genus_of, species_of; authored_by, recombined_by, ex_author, in_author, year_of),
//   (R5) agree with itself across representations of the same taxon (ICZN, no-comma, ICN, upper-case, abbreviated, italic-marked, prose; and the
//        Plazi treatment against the GBIF Backbone record of the same taxon),
// each better than a control built to fail. Taxonomy is a formal notation embedded in free prose, so the interesting results are the controls, the
// uninomial rows (a capitalised word that is a genus, a place or a collector) and the gaps, not the headline.
//
// DATA AND SPLITS (see $TAXONOMY_ROOT/PROVENANCE.md and manifest.json). Split BY SOURCE (journal); no journal is in two splits, no treatment id is in two:
//   train  ZooKeys, PhytoKeys, MycoKeys, Biodiversity Data Journal (Pensoft)                       1,787 treatments -> PRIORS ONLY
//   dev    European Journal of Taxonomy, Adansonia, Linzer biologische Beitraege                      685 treatments -> develop and smoke here
//   test   Zootaxa, Phytotaxa, Papeis Avulsos de Zoologia, Blumea, Revue suisse de Zoologie       1,086 treatments -> ONCE, by the orchestrator
// Honest limits: all six hundred-odd dev treatments and the test ones come from Plazi's extraction pipeline (PDF extraction for most, TaxPub XML for
// Pensoft); the markup style differs between publishers (the Pensoft markup resolves fewer abbreviations through attributes than the dev/test markup
// does, see the audit), which is a real shift, not a leak. measure({split:"test"}) appends to a run ledger so a second TEST run is visible.
//
// UNITS, GOLD AND MATCHERS.
//  DOC = one treatment text (<= 20,000 characters, cut at a paragraph). `limit` keeps the first N treatments in file order (never a sample).
//  GOLD MENTION = a curators' <taxonomicName> span whose identity gnparser (word structure, canonical form) and the curators' attributes agree on
//    (uninomials: and the GBIF Backbone knows the name at an agreeing rank class). Everything else the curators tagged is a NEUTRAL span (typed, counted
//    by reason): the reader is neither rewarded nor punished for what it does inside one. Neutral reasons: gn_unparsed, gn_low_quality, epithet_only,
//    identity_mismatch, gbif_no_match, kind_disputed. Abbreviated mentions the curators left without a genus attribute are resolved by the UNIQUE-INITIAL
//    rule over the document's gold full names (res = doc_unique), left with id null when ambiguous or absent (the span still counts; the id does not).
//  UNMARKED-BUT-REAL names (a taxonomic name the curators did not tag) are counted as the reader's false positives in every headline; the
//    GBIF-adjudicated share of a seeded FP sample is reported separately (adjudicate.py, details.adjudication), never mixed into a pass rule.
//  R1 item = a gold lexeme span [s,e) (gnparser words of gold mentions: genus subgenus epithet infra uninomial rank author year marker hybrid).
//        Matcher: exact span equality, class ignored (class is R2). Reader tokens of the same class set only (connector/other are not name lexemes).
//        Micro-pooled P, R, F1; per-doc F1 for sign tests; reader tokens inside a neutral span are ignored.
//  R2 item = a gold lexeme; correct iff the reader emitted a token with the SAME span AND the same class (an unheard token is wrong: R1 errors are
//        charged to R2). Reported: micro accuracy, macro recall over classes with >= 20 gold tokens, can_name_a_being accuracy
//        (genus subgenus epithet infra uninomial vs rank author year marker hybrid).
//  R3 item = a mention: gold core span (from the genus word to the last epithet) + gold id (null = ambiguous abbreviation, then the span alone) in two
//        kind groups: BINOMIAL (species, infraspecific) and UNINOMIAL (genus, higher; genus-vs-higher confusion inside the group is reported, not charged).
//        TP iff the reader's being has the same core span, the same group and the same id (or the gold id is null). Reader beings in neutral spans are
//        ignored. Headline = joint micro F1 over both groups; the pass rule reads each group. Also reported: span-only F1, identity accuracy among
//        span-matched, F1 by gold kind, recall by gazetteer membership of the gold genus (OOV genus), F1 by journal, entity-set F1 per document.
//  R4 item = (doc, end1, label, end2) in a per-document SET. Labels: genus_of (genus id -> species id), species_of (species id -> infraspecific id)
//        [STRUCTURAL: derivable from the written name]; authored_by, recombined_by, ex_author, in_author (name id -> author key), year_of (name id ->
//        4-digit year) [CLAIMS: text-stated nomenclatural content]. Author key = lower-case letters of the NFKD form without marks, so "A. J. Paton" =
//        "A.J.Paton". Mentions with gold id null contribute no gold; reader relations from them are ignored. CLAIMS are scored only on gold mentions that
//        carry a text-grounded authority that gnparser read cleanly (claims_ok); on every other mention the reader's claims are ignored in both directions
//        (typed gaps: authority_outside_gold_span, claims_unreliable_span). Headline = claims micro F1.
//  R5 item = (document, representation). SHEETS are SCRIPT-AUTHORED from the gold (labelled DERIVED, never natural): per document up to 12 distinct gold
//        species/infraspecific names that carry an authority, rendered as lines in seven conventions: canon (ICZN "Genus epithet Author, Year" /
//        "(Author, Year) Combiner"), nocomma ("Author Year"), icn (no year), upper (AUTHOR upper-case), abbr (first mention of a genus in full, later
//        "G. epithet"), italic ("*Genus epithet* Author, Year"), prose (inside a template sentence). G_X = the gold items (resolved being ids + relation
//        triples) the sheet states in rendering X; C_X = the reader's items on X that are in G_X (right on X). AGREEMENT(X) = |C_X cap C_canon| / |G_X|: the share of the
//        facts the sheet states that the reader reads RIGHT ON BOTH the rendering and the canonical rendering. (The plain Jaccard of the reader's items
//        against its own canon reading is reported as self_consistency_diagnostic: a reader that is consistently wrong passes it.) NATURAL PAIR: for
//        treatments Plazi links to a GBIF Backbone taxon (ID-GBIF-Taxon) whose Backbone canonicalName equals the gold id of the treatment's first gold
//        mention, the reader's id of that mention equals its id for the Backbone's scientificName string.
//        Language-parallel agreement (the same content in two natural languages) has no open parallel corpus here: typed gap, with per-language R3 reported.
//  R0 item = a STREAM of W = 60 whitespace words fed to the identifier; the verdict "named" latches (it is the evidence curve crossing the TRAIN-derived
//        threshold at any word). Real arms: head (the first 60 words of a treatment with >= 2 gold names inside and no neutral span), mid (a seeded random
//        window with the same property), hard negatives (a window of a treatment that overlaps NO curator span: morphology, material examined, in the same
//        journals), strangers by kind (prose_en, prose_xx, legal, code, chess_pgn, smiles, chem_names, dna, abc: sources never seen by any prior; see
//        build_foreign.py). Strangers are real text assumed non-taxonomic; any stream the reader names is inspected and reported (details.named_strangers).
//
// ARMS AND CONTROLS BUILT TO FAIL (every control is implemented here, in the instrument, independently of the adapter):
//  R0 controls: charshuf (the letters of every word of a positive stream permuted: lengths, spaces and punctuation kept, the notation destroyed), wordshuf
//     (the words of a positive stream shuffled: the adjacency of genus, epithet and authority destroyed), hard negatives, every stranger kind,
//     naive_first_shape (names taxonomy at the first Capitalised word followed by a lower-case word). Diagnostic, not in the rule: lower (case-blind positives),
//     no_decay and no_gazetteer ablations.
//  R1 controls: naive_regex (a regex for "Genus epithet" bigrams and years), ws_caps (every capitalised word of 3+ letters, the lower-case word after it,
//     years), shifted (the real spans +1 character), misaligned (document i's tokens against document i+1's gold). Diagnostic: case_blind.
//  R2 controls: majority (always the commonest gold class), label_shuffled (the reader's classes derangement-permuted among the tokens it matched),
//     shape_only (a context-free regex classifier GIVEN the gold spans: a reference that says how much of the class is shape).
//  R3 controls: naive_regex (Genus-epithet bigrams as species beings, no uninomials, no abbreviations), misaligned (document i+1's beings), and the casing
//     arm case_blind (the same reader on lower-cased text: capitalisation is ONE witness, the rest must carry part of the reading). Diagnostic: no_gazetteer.
//  R4 controls: regex_authority (a regex for "Genus epithet Author, Year" giving authored_by and year_of), bind_shuffle (the reader's end2 values derangement-
//     permuted among its claims of one label inside a document: the right authors bound to the wrong names), misaligned.
//  R5 controls: misaligned pairing (rendering of document i against the canon reading of document i+1), naive_regex reader (the R3 regex reader run on every sheet).
//  CAUSAL LICENCES: C1/C3/C4: for 60 documents x cuts at 25/50/75 % (on a word boundary), the non-provisional tokens / beings / relations with at < cut of the
//     prefix scan are exactly those of the full scan; C0: the R0 verdict after t words of a stream equals the verdict of a fresh identifier fed the first
//     t words, 100 streams x t in {20, 40}.
//
// PASS RULES (PASS iff ALL; not softened after a run; bare numbers are PROVISIONAL declarations, P4; ALPHA = 0.05 as keyness's KEY_ALPHA):
//  R0  TPR(head) >= 0.70 and TPR(mid) >= 0.70; hard-negative named-rate <= 0.05 and every stranger kind with >= 30 streams <= 0.05 (a kind with fewer is a
//      typed gap, listed, not counted); licences: L0a TPR(mid) - charshuf >= 0.50; L0b TPR(mid) - wordshuf >= 0.20; L0c the negatives are not trivial:
//      naive_first_shape pooled negative rate >= 0.20; C0 causal agreement >= 0.99.
//  R1  micro F1 >= 0.85; real beats naive_regex AND ws_caps per document by the exact one-sided sign test at ALPHA; licences: shifted <= 0.20 and misaligned
//      <= 0.20 micro F1; C1 >= 0.999.
//  R2  micro class accuracy >= 0.80; macro >= 0.70; can_name accuracy >= 0.90; real - max(majority, label_shuffled, shape_only) >= 0.10.
//  R3  BINOMIAL joint F1 >= 0.85; UNINOMIAL joint F1 >= 0.50; joint micro F1 - max(naive_regex, misaligned) >= 0.15 and the per-document sign test beats
//      naive_regex at ALPHA; licence: misaligned <= joint - 0.50; casing clause: case_blind joint F1 >= 0.15 (capitalisation is not the only witness) and
//      <= joint - 0.05 (it is a witness); C3 >= 0.999.
//  R4  CLAIMS micro F1 >= 0.75; STRUCTURAL micro F1 >= 0.85; claims F1 - max(regex_authority, bind_shuffle, misaligned) >= 0.15; licences: misaligned <=
//      claims - 0.50 and bind_shuffle <= claims - 0.20 (binding matters); C4 >= 0.999.
//  R5  macro agreement over the six non-canon renderings >= 0.80 AND the minimum >= 0.60; misaligned <= 0.10; macro - naive_regex macro >= 0.20; the natural
//      pair agreement >= 0.90 when it has >= 50 items (fewer: typed gap, the rest of the rule decides, flagged).
//  score = the rung's headline (R0 mean TPR of head and mid, R1 micro F1, R2 micro class accuracy, R3 joint F1, R4 claims F1, R5 macro agreement);
//  control = the strongest control IN THE RULE on the same metric (R0 the highest named-rate among charshuf, wordshuf, hard negatives, stranger kinds; R5
//  the highest control agreement); margin = score - control; pass = null with a typed gap when a needed arm cannot be run (never "pass by absence").
//
// PREDICTIONS (written blind; the ORDERS are the claims, the numbers are guesses):
//  P0  R0: TPR head ~0.75, mid ~0.70 (it is the edge of the rule); hard-negative rate ~0.02; strangers <= 0.03 each (worst: chem_names or prose_xx
//      Latin); charshuf ~0.05; wordshuf ~0.2 (abbreviation and authority-year events survive shuffling less than adjacency does); naive_first_shape on
//      negatives >= 0.4. R0 passes or misses only on mid.
//  P1  R1 passes at ~0.88 micro F1; naive_regex ~0.55, ws_caps ~0.45; shifted and misaligned < 0.05. The lexeme errors are the dot of author abbreviations
//      ("Ridl." not in TRAIN), authors that look like the next name, and two-letter abbreviations.
//  P2  R2 passes; micro ~0.85, macro ~0.75, can_name ~0.93; majority ~0.30; label_shuffled ~0.20; shape_only ~0.60 (class is NOT boundary-determined here:
//      genus vs uninomial vs author needs position).
//  P3  R3 FAILS on the uninomial row: binomial joint F1 ~0.90 but uninomial ~0.40 (genus-only mentions are indistinguishable by shape from places and
//      collectors; the reader owns only what the gazetteer, the cast and the Code suffixes nominate); joint ~0.80; naive_regex ~0.45; misaligned ~0.05;
//      case_blind ~0.30 (the gazetteer and the cast carry it). Recall on OOV genera is lower than on gazetteer genera by >= 0.15.
//  P4  R4 passes on claims ~0.80 and structure ~0.88; regex_authority ~0.45; bind_shuffle ~0.35; misaligned ~0.03.
//  P5  R5 passes: canon is the reference; upper ~0.70, icn ~0.85, abbr ~0.85 (the cast resolves "G. epithet"), italic ~0.85, prose ~0.8, nocomma ~0.85;
//      macro ~0.82; naive_regex ~0.25 (no abbreviations, no authors beyond one word); natural pair ~0.85 on >= 50 items.
//  Headline guess: R0, R1, R2, R4 pass; R3 fails on the uninomial row (and says so); R5 passes with upper-case the weakest rendering.
//
// TYPED GAPS DECLARED IN ADVANCE (denominators, never silent): neutral spans by reason (the curators tagged something gnparser/Backbone refuse);
// abbreviations with id null (ambiguous initial) and unresolved by the reader (no earlier full genus: abbrev_unresolved) or ambiguous (abbrev_ambiguous);
// hybrid formulae (hybrid_formula_unread); the ICNP bacterial code and the ICNCP cultivar code (no data: icnp_bacteria_unmeasured, cultivars unmeasured);
// epithet-only mentions ("rufispina Walker, 1871", counted as neutral epithet_only: epithet_only_unread); higher classification links (family > genus,
// order > family) are WORLD KNOWLEDGE that the text does not state, the Plazi attributes that carry them are not text-grounded and are not scored:
// higher_classification_is_world_knowledge; synonymy / basionym / type-species statements ("Synonyms:", "Type species:") have no independent gold here:
// relation_synonymy_unmeasured; language-parallel agreement: language_parallel_unmeasured; species-level mentions have no third (Backbone) opinion in the
// gold: species_unchecked_by_backbone; GBIF-adjudicated precision exists only for the sampled FPs of the last dumped run.
// LIMITS: Plazi's mark-up is curated but not complete (untagged names are counted against the reader; see the adjudication); the three dev journals are
// 685 treatments from two publishers; the strangers are real texts assumed non-taxonomic and a few streams (Wikipedia) may mention organisms; the
// binomial candidate generator is regex-and-count based, so a genus written in a script other than Latin, a name split over two lines, or a name inside a
// table cell separated by a tab is a known weak point; gnparser and the reader both treat a lone capital + dot as an initial, so the gold and the reader share
// that convention (mitigated: the curators' attributes are the other opinion).
//
// AMENDMENT 0 (2026-10-06, BEFORE the first run on dev or test; made after a TRAIN-only debug run of this file that is not a result). (i) R5's agreement was
// the Jaccard of the reader's items against its own canon reading; on TRAIN the naive regex reader scored 0.79 on it (a reader that is consistently wrong is
// consistent), i.e. a control built to fail did as well as the real arm: the INSTRUMENT was broken, so the metric became the gold-anchored AGREEMENT(X)
// above (the plain Jaccard stays as a diagnostic), and the R5 numbers 0.85/0.70 became 0.80/0.60 because the new metric includes recall. (ii) R4 claims
// were scored against every curator span; on TRAIN 459 of 897 claim "false positives" were authorities the curators left outside their span or trailing junk
// ("BOR/MOL 15419", "Aug M") that gnparser reads as authors; claims are now scored only where the gold carries a clean text-grounded authority (claims_ok).
// (iii) Reader changes made before the first dev run, listed for the record: emphasis marks (* and _) are transparent to the lexer; ALL-CAPS and
// refused words are accepted as authors only when a year anchors the authority; token and mention read-stamps (`at`) cover every character consulted
// (10 tokens of lookahead); the gazetteer-less lower-case genus slot. No threshold of R0-R4 changed.
//
// AMENDMENT 1 (2026-10-06, AFTER run 1 on dev, which is kept in the report as the pre-registered run). Run 1 failed C1 (tokens 0.9944 < 0.999) for a reason that
// is the INSTRUMENT'S, not lookahead: the last tokens of a prefix are provisional and an undecided final dot can merge two tokens, shifting token indices by one,
// so the converse half of "exactly those" fails at the boundary. The licence is restated as NON-REVISION: every non-provisional item of the prefix scan
// is an item of the full scan (same threshold 0.999; the test suite's lookahead cheat is still caught). No other rule changed. Reader changes after run 1,
// made on dev evidence and therefore disclosed as development, not as registered: (a) the refusal vocabulary of epithets became a feature instead of a veto
// ("carina", "radius", "aster" are epithets and anatomical words) -- TRIED AND REVERTED (AMENDMENT 2): run 2 on dev was worse on almost every row (binomial joint F1 0.953 ->
// 0.935, natural-pair agreement 0.961 -> 0.907) because the candidate set filled with vetoed words and the naive-Bayes prior odds moved; (b) an author particle may
// start an authority when a year anchors it ("de Laubenfels, 1936"), kept.
//
// AMENDMENT 2 (2026-10-06, AFTER dev runs 1-3, BEFORE any test run and BEFORE the first run of this amended file on any split; the registration digest before
// this amendment was cac8e399cf80e27d445613a77a6656e29bb7a76d8b49187aafcabf318ce42551). It answers an independent review whose MUTATION TESTS on dev found that
// controls built to fail did as well as the real arm, i.e. the INSTRUMENT was blind (II.23/II.4). DISCLOSURE of what was seen before this amendment was written
// (dev numbers from the reviewer's mutants, no test data): C1/C3/C4 = 1/1/1 for an additive lookahead cheat (a being promoted by whole-text recurrence, honest `at`
// stamps) as for the honest reader; R5 macro 0.9214 real against 0.9243 for a "shotgun" reader (every authored_by / recombined_by / year_of against every author and
// year token) and 0.9330 for an accept-every-candidate reader with the classifier, gazetteer and refusal priors emptied; natural pair 0.9609 real against 0.9095 for
// that reader and 0.78 for a naive bigram regex; R2 0.921 real against 0.9299 and 0.9366 with the priors emptied. These facts chose WHICH arms are added; the
// margins below are declared by convention (0.05 = R3's casing margin, 0.10 = R2's margin), not fitted to them. DEV IS DEVELOPMENT: the reader was changed on dev
// evidence after run 1 (Amendment 1 (b)) and run 2's refusal-as-feature was tried and reverted (the AMENDMENT 2 cross-reference of Amendment 1 is resolved by this
// block: its numbers stand, no other reader change is made here and the adapter is untouched); so no dev number is a registered confirmation, and the registered
// claim is confirmed or refuted only by the single TEST run. No threshold of R0..R5 is lowered; every change below TIGHTENS a licence or charges something that
// was free.
//  (i)   C1/C3/C4 are again EXACT, in both directions. For every cut, the non-provisional items (!prov) with at < cut of the PREFIX scan and those of the FULL scan are
//        the same set: prefix subset of full (no revision) AND full subset of prefix (no lookahead promotion: an early item that exists only because later text was
//        counted). Amendment 1's one-directional text is superseded; its boundary worry is handled by the two filters that were always there (!prov, at < cut), and the
//        reviewer measured the honest adapter at 1.000 in both directions at margins 0, 200 and 1000 characters (60 dev docs x 3 cuts; 40 docs x 464 cuts), so no margin
//        is added. A unit (document x cut) is OK iff both directions hold; each direction is also reported. Threshold unchanged (0.999). LICENCE OF THE LICENCE (clause
//        LC1/LC3/LC4 of R1/R3/R4): an instrument-side ADDITIVE lookahead cheat (every capitalised word of >= 3 letters occurring >= 3 times ANYWHERE in the text is promoted
//        to a genus token / being / genus_of relation at its first occurrence with an honest low `at`) is run through the same check and must score <= 0.90 on the layer
//        it perturbs; if it does not, the licence is declared blind and the rung FAILS.
//  (ii)  R2 charges over-production. Headline = micro labelled-span F1 = 2*ok / (|G| + |R|), G the gold lexemes, R the reader's name-class tokens outside neutral spans,
//        ok the reader tokens with a gold span AND the gold class (an unheard gold lexeme and an extra reader token are both errors). Thresholds unchanged: micro >= 0.80,
//        macro (per-class recall over gold, as registered) >= 0.70, can_name (over gold, as registered) >= 0.90. Reported beside it: accuracy_over_gold (the old
//        headline, = recall), accuracy_over_reader_tokens (precision), class_accuracy_given_span, can_name_f1. label_shuffled is computed in the same F1 form; majority and
//        shape_only are GIVEN the gold spans (they cannot over-produce) and keep their gold denominator. NEW CONTROLS, implemented here by editing the received priors
//        (never the adapter): ablate_all (every TRAIN-counted prior emptied: classifier tables, genus / epithet / author gazetteers, suffix tables, refusal vocabularies;
//        the Codes' lexicon and the R0 identity prior kept: the accept-every-candidate reader) and shuffled_classifier (each classifier feature's [pos,neg] count pairs
//        deranged among that feature's values: same marginals, the association destroyed; everything else as shipped). NEW CLAUSE: real - max(ablate_all,
//        shuffled_classifier) >= 0.05 on the same metric: R2 certifies the received priors only if removing or scrambling them moves it.
//  (iii) R5 charges false facts. AGREEMENT(X) = |C_X cap C_canon| / |G_X cup R_X|, R_X the reader's items on rendering X (restricted to what X expresses): the facts the
//        sheet states that the reader reads right on both renderings, over the facts stated PLUS every item the reader asserts that the sheet does not. Thresholds unchanged
//        (macro >= 0.80, min >= 0.60, misaligned <= 0.10, macro - naive_regex >= 0.20). New arms (instrument-side): ablate_all and shuffled_classifier (as in (ii)) and
//        shotgun (the real reader's items plus authored_by, recombined_by and year_of from every being to every capitalised word and every 4-digit year of the text).
//        NEW CLAUSE: macro - max(ablate_all, shuffled_classifier, shotgun) >= 0.05. NATURAL PAIR: an item counts only when the Backbone string yields EXACTLY ONE resolved
//        being and it equals the treatment's id (an extra being on a clean string is a false fact); the bar stays 0.90 (a bar raised after seeing 0.96 and 0.91 would be
//        tuning; it certifies that the reader is self-consistent across a treatment and a Backbone string, and it has no power against a reader without priors, which is
//        exactly why the margin clause exists); NEW CLAUSE, when the pair has >= 50 items: agreement - max(naive_regex, ablate_all, shuffled_classifier) >= 0.05;
//        agreement_with_gold stays a diagnostic.
//  (iv)  DIAGNOSTICS, not in any rule: the single-component ablations (classifier only; gazetteers + refusal + suffix tables only) on R2 and R5, and ablate_all /
//        shuffled_classifier on R1, R3 and R4 plus shotgun on R4, as evidence that these rungs MOVE under the perturbation.
//  A pass is null (typed gap, never a pass by absence) when an arm a clause needs cannot be run (no priors given to build the ablations from, and none injected).
//  PREDICTIONS for the new quantities (written before the amended file ran; the ORDERS are the claims): C1/C3/C4 real 1.000 and the additive cheat <= 0.5 on every layer.
//  R2 F1: real ~0.85 (lower than the old 0.921: R1 errors and over-production are now charged), ablate_all ~0.40 (accept-all admits every capitalised word), shuffled_classifier
//  ~0.55; the margin clause holds; if shuffled_classifier is within 0.05 of real, R2 FAILS and the result is "the classifier does not carry R2". R5 new macro: real ~0.85,
//  shotgun ~0.15, ablate_all ~0.55, shuffled_classifier ~0.60, naive_regex lower than before; natural pair: real ~0.95, ablate_all ~0.90 (the reviewer's 0.9095 before the
//  Backbone-string charge), naive ~0.78: the natural-pair margin is predicted AT THE EDGE of 0.05 and either outcome is reported as it falls.
// ═══ END PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as Adapter from "../../adapters/notation/taxonomy.js";

export const FAMILY = "taxonomy";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.TAXONOMY_ROOT ?? "/private/tmp/claude-501/notation/taxonomy";
export const PARAMS = Object.freeze({
  W: 60, ALPHA: 0.05, SEED: 20261006, CAUSAL_DOCS: 60, CUTS: [0.25, 0.5, 0.75], C0_STREAMS: 100, C0_T: [20, 40], STREAM_CAP: 400, KIND_MIN: 30,
  R5_DOCS: 150, R5_NAMES: 12, MACRO_MIN_TOKENS: 20,
  RULE: {
    r0: { tpr: 0.70, fpr: 0.05, l0a: 0.50, l0b: 0.20, l0c: 0.20, c0: 0.99 },
    r1: { f1: 0.85, shifted: 0.20, misaligned: 0.20, c1: 0.999, cheat: 0.90 },
    r2: { acc: 0.80, macro: 0.70, canName: 0.90, margin: 0.10, armMargin: 0.05 },
    r3: { binom: 0.85, uni: 0.50, margin: 0.15, misaligned: 0.50, caseMin: 0.15, caseDrop: 0.05, c3: 0.999, cheat: 0.90 },
    r4: { claims: 0.75, structural: 0.85, margin: 0.15, misaligned: 0.50, bind: 0.20, c4: 0.999, cheat: 0.90 },
    r5: { macro: 0.80, min: 0.60, misaligned: 0.10, margin: 0.20, natural: 0.90, naturalMin: 50, armMargin: 0.05 },
  },
});
const GOLD_CLASSES = new Set(["genus", "subgenus", "epithet", "infra", "uninomial", "rank", "author", "year", "marker", "hybrid"]);
const CLAIM = new Set(["authored_by", "recombined_by", "ex_author", "in_author", "year_of"]);
const STRUCT = new Set(["genus_of", "species_of"]);
const BIN = new Set(["species", "infraspecific"]);
const NOT_APPLICABLE = {};

// ── utilities ────────────────────────────────────────────────────────────────────────────
export function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hashSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** Sattolo: a cyclic permutation with NO fixed point (a derangement) of 0..n-1. */
export function derangement(n, rnd) { const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * i); [p[i], p[j]] = [p[j], p[i]]; } return p; }
export function shuffled(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function logChoose(n, k) { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; }
/** exact one-sided sign test: P(X >= wins) for X ~ Binomial(wins+losses, 1/2); ties dropped. */
export function signTest(a, b) {
  let w = 0, l = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] > b[i] + 1e-12) w++; else if (b[i] > a[i] + 1e-12) l++; }
  const n = w + l; if (!n) return { wins: 0, losses: 0, n: 0, p: 1 };
  let p = 0; for (let k = w; k <= n; k++) p += Math.exp(logChoose(n, k) - n * Math.LN2);
  return { wins: w, losses: l, n, p: Math.min(1, p) };
}
const rnd4 = (x) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10000) / 10000);
const f1of = (tp, fp, fn) => (2 * tp + fp + fn === 0 ? null : (2 * tp) / (2 * tp + fp + fn));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
function counts() { return { tp: 0, fp: 0, fn: 0 }; }
function prf(c) { return { p: c.tp + c.fp ? c.tp / (c.tp + c.fp) : null, r: c.tp + c.fn ? c.tp / (c.tp + c.fn) : null, f1: f1of(c.tp, c.fp, c.fn), tp: c.tp, fp: c.fp, fn: c.fn }; }
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const PREREG_SHA256 = (() => {
  try {
    const me = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
    const a = me.indexOf("═══ PRE-REGISTRATION"), b = me.indexOf("═══ END PRE-REGISTRATION");
    return a >= 0 && b > a ? sha256(me.slice(a, b)) : null;
  } catch { return null; }
})();

// ── zones: intervals the reader is not judged on ──────────────────────────────────────────
export function zones(mentions, { nullIds = false } = {}) {
  const z = mentions.filter((m) => m.status !== "gold" || (nullIds && (m.id === null || m.id === undefined))).map((m) => [m.s, m.e]).sort((a, b) => a[0] - b[0]);
  return z;
}
export function overlaps(z, s, e) {
  let lo = 0, hi = z.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (z[mid][1] <= s) lo = mid + 1; else hi = mid; }
  return lo < z.length && z[lo][0] < e;
}
const goldMentions = (doc) => doc.mentions.filter((m) => m.status === "gold");

// ── data ─────────────────────────────────────────────────────────────────────────────────
function readGz(p) { return zlib.gunzipSync(fs.readFileSync(p)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
/** loadData(split, {limit, root}) -> { docs, foreign, gbif, gaps }. Never throws: a missing file is a typed gap. */
export function loadData(split = "dev", { limit = null, root = ROOT } = {}) {
  const gaps = [];
  const out = { split, docs: [], foreign: [], gbif: {}, gaps, root, neutral: {} };
  try {
    const docs = readGz(path.join(root, "corpus", `${split}.jsonl.gz`));
    const gold = new Map(readGz(path.join(root, "gold", `${split}.gold.jsonl.gz`)).map((g) => [g.id, g.mentions]));
    out.docs = docs.map((d) => ({ id: d.id, journal: d.journal, lang: d.lang, text: d.text, gbif_taxon: d.gbif_taxon, mentions: gold.get(d.id) ?? [] }));
    if (limit) out.docs = out.docs.slice(0, limit);
  } catch (e) { gaps.push({ reason: "corpus_missing", count: 1, detail: String(e.message ?? e).slice(0, 120) }); }
  try { out.foreign = readGz(path.join(root, "corpus", "foreign", `${split}.jsonl.gz`)); } catch { gaps.push({ reason: "foreign_pool_missing", count: 1 }); }
  try { out.gbif = JSON.parse(fs.readFileSync(path.join(root, "raw", "gbif_records.json"), "utf8")); } catch { gaps.push({ reason: "gbif_records_missing", count: 1 }); }
  for (const d of out.docs) for (const m of d.mentions) if (m.status !== "gold") out.neutral[m.reason] = (out.neutral[m.reason] ?? 0) + 1;
  return out;
}

// ── readers ───────────────────────────────────────────────────────────────────────────────
/** the system under test: the adapter with the shipped priors. `variant` = ablation options passed to scan (noCase, noGazetteer, noDecay ...). */
export function adapterReader(priors = Adapter.loadPriors()) {
  const c = Adapter.compilePriors(priors);
  return {
    name: "adapter",
    gaps: priors.gaps ?? [],
    read: (text, opts = {}) => Adapter.read(text, c, opts),
    identify: (text, opts = {}) => Adapter.identify(text, c, opts),
  };
}

// naive baselines, implemented HERE (independently of the adapter)
const RE_BIGRAM = /\b(\p{Lu}[\p{Ll}]{2,}) (\p{Ll}{3,})\b/gu;
const RE_YEAR = /\b(1[5-9]\d\d|20\d\d)[a-z]?\b/g;
export function naiveBeings(text) {
  const beings = [];
  for (const m of text.matchAll(RE_BIGRAM)) beings.push({ id: `${m[1]} ${m[2]}`, kind: "species", span: [m.index, m.index + m[0].length] });
  return beings;
}
function naiveTokens(text) {
  const toks = [];
  for (const m of text.matchAll(RE_BIGRAM)) { toks.push({ s: m.index, e: m.index + m[1].length, cls: "genus" }); toks.push({ s: m.index + m[1].length + 1, e: m.index + m[0].length, cls: "epithet" }); }
  for (const m of text.matchAll(RE_YEAR)) toks.push({ s: m.index, e: m.index + m[0].length, cls: "year" });
  return toks;
}
function wsCapsTokens(text) {
  const toks = [];
  for (const m of text.matchAll(/\p{Lu}\p{Ll}{2,}(?: (\p{Ll}+))?/gu)) {
    const g = m[0].split(" ")[0].length;
    toks.push({ s: m.index, e: m.index + g, cls: "genus" });
    if (m[1]) toks.push({ s: m.index + g + 1, e: m.index + g + 1 + m[1].length, cls: "epithet" });
  }
  for (const m of text.matchAll(RE_YEAR)) toks.push({ s: m.index, e: m.index + m[0].length, cls: "year" });
  return toks;
}
const RE_AUTH = /\b(\p{Lu}[\p{Ll}]{2,} \p{Ll}{3,}) \(?((?:\p{Lu}[\p{L}.\-]*(?: (?:&|and|et) )?)+),? (\d{4})\)?/gu;
export function naiveRelations(text) {
  const rel = [];
  for (const m of text.matchAll(RE_AUTH)) {
    const end = m.index; const id = m[1];
    for (const a of m[2].split(/ (?:&|and|et) /)) rel.push({ end1: id, label: "authored_by", end2: Adapter.akey(a), span: [m.index, m.index + m[1].length] });
    rel.push({ end1: id, label: "year_of", end2: m[3], span: [m.index, m.index + m[1].length] });
  }
  return rel;
}
function naiveRead(text) { return { tokens: naiveTokens(text), beings: naiveBeings(text), relations: naiveRelations(text) }; }
export function naiveFirstShape(text) { return /\b\p{Lu}\p{Ll}{2,} \p{Ll}{3,}\b/u.test(text); }

// ── controls built by EDITING THE RECEIVED PRIORS (Amendment 2; instrument-side, the adapter is never touched) ──────────────────────────────
const emptyTable = () => ({ prior: { pos: 0, neg: 0 }, f: {} });
/** a derangement of the [pos,neg] count pairs among the values of every feature of one classifier table: same marginals per feature, the association destroyed. */
function shuffleTable(tab, rnd) {
  if (!tab || !tab.f) return tab;
  const f = {};
  for (const [name, row] of Object.entries(tab.f)) {
    const keys = Object.keys(row.v);
    if (keys.length < 2) { f[name] = row; continue; }
    const p = derangement(keys.length, rnd);
    const v = {}; keys.forEach((k, i) => { v[k] = row.v[keys[p[i]]]; });
    f[name] = { ...row, v };
  }
  return { ...tab, f };
}
export const ABLATIONS = Object.freeze(["ablate_all", "shuffled_classifier", "ablate_classifier", "ablate_lists"]);
/** ablatedPriors(priors, mode) -> a NEW priors object (the input is not mutated). Modes:
 *   "classifier"          the naive-Bayes count tables emptied (prior 0/0, no features; the TRAIN-derived thresholds kept: every candidate scores 0 and is admitted);
 *   "lists"               the genus / epithet / author gazetteers, the suffix tables, the previous-word list and the refusal vocabularies emptied;
 *   "all"                 both; only the Codes' lexicon (rank markers, family suffixes, connectors) and the R0 identity prior remain: the accept-every-candidate reader;
 *   "shuffled_classifier" every classifier feature's count pairs deranged among its values (everything else as shipped). */
export function ablatedPriors(priors, mode, { seed = PARAMS.SEED } = {}) {
  const out = { ...priors };
  const cls = priors?.classifier, gz = priors?.genera, rf = priors?.refusal;
  if ((mode === "classifier" || mode === "all") && cls) out.classifier = { ...cls, binom: emptyTable(), uni: emptyTable(), kind: emptyTable() };
  if (mode === "lists" || mode === "all") {
    if (gz) out.genera = { ...gz, names: {}, epithets: {}, author_words: {}, suffix_genus: [], suffix_epithet: [], suffix_uninomial: [], prev_words: [] };
    if (rf) out.refusal = { ...rf, cap_refuse: {}, low_stop: {} };
  }
  if (mode === "shuffled_classifier" && cls) {
    const rnd = mulberry32((seed ^ hashSeed("shuffled_classifier")) >>> 0);
    out.classifier = { ...cls, binom: shuffleTable(cls.binom, rnd), uni: shuffleTable(cls.uni, rnd), kind: shuffleTable(cls.kind, rnd) };
  }
  return out;
}
/** ablationReaders(priors) -> { ablate_all, shuffled_classifier, ablate_classifier, ablate_lists }: the adapter run on edited copies of the received priors.
 *  Only the first two are in a pass rule (R2, R5); the other two say WHICH prior carries a rung (diagnostics). */
export function ablationReaders(priors) {
  const mk = (name, mode) => { const r = adapterReader(ablatedPriors(priors, mode)); r.name = name; return r; };
  return { ablate_all: mk("ablate_all", "all"), shuffled_classifier: mk("shuffled_classifier", "shuffled_classifier"), ablate_classifier: mk("ablate_classifier", "classifier"), ablate_lists: mk("ablate_lists", "lists") };
}
/** the SHOTGUN reader (Amendment 2): the given reader's output plus authored_by, recombined_by (from every resolved being to every capitalised word of the text) and year_of
 *  (to every 4-digit year of the text). It asserts every fact a sheet could state and a thousand it does not: a metric blind to false facts scores it as well as the real reader. */
export function shotgunReader(reader) {
  return {
    name: "shotgun", gaps: reader.gaps ?? [], identify: reader.identify,
    read(text, opts) {
      const o = reader.read(text, opts);
      const authors = new Set(); for (const m of text.matchAll(/\p{Lu}[\p{L}.\-]*/gu)) { const k = Adapter.akey(m[0]); if (k.length >= 2) authors.add(k); }
      const years = new Set(); for (const m of text.matchAll(RE_YEAR)) years.add(m[1]);
      const relations = (o.relations ?? []).slice(); const have = new Set(relations.map(relKey)); const ids = new Set();
      for (const b of o.beings ?? []) {
        if (b.resolved === false || ids.has(b.id)) continue; ids.add(b.id);
        const add = (label, end2) => { const r = { end1: b.id, label, end2, at: b.at, prov: b.prov, span: b.span }; const k = relKey(r); if (!have.has(k)) { have.add(k); relations.push(r); } };
        for (const a of authors) { add("authored_by", a); add("recombined_by", a); }
        for (const y of years) add("year_of", y);
      }
      return { ...o, relations };
    },
  };
}

// ── R0: identify the system ────────────────────────────────────────────────────────────────
function wordSpans(text) { const out = []; const re = /\S+/g; let m; while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]); return out; }
export function r0Streams(data, { cap = PARAMS.STREAM_CAP, W = PARAMS.W } = {}) {
  const rnd = mulberry32(hashSeed("r0:" + data.split));
  const head = [], mid = [], hard = [];
  for (const d of data.docs) {
    const ws = wordSpans(d.text);
    if (ws.length < W + 3) continue;
    const win = (a) => [ws[a][0], ws[a + W - 1][1]];
    const inside = (a, b) => d.mentions.filter((m) => m.e > a && m.s < b);
    const okPos = (a, b) => { const ins = inside(a, b); const g = ins.filter((m) => m.status === "gold" && m.s >= a && m.e <= b).length; return g >= 2 && g === ins.length; };
    if (head.length < cap) { const [a, b] = win(0); if (okPos(a, b)) head.push({ kind: "head", source: d.id, journal: d.journal, text: d.text.slice(a, b) }); }
    if (mid.length < cap) for (let k = 0; k < 12; k++) { const st = Math.floor(rnd() * (ws.length - W)); const [a, b] = win(st); if (okPos(a, b)) { mid.push({ kind: "mid", source: d.id, journal: d.journal, text: d.text.slice(a, b) }); break; } }
    if (hard.length < cap) for (let k = 0; k < 12; k++) { const st = Math.floor(rnd() * (ws.length - W)); const [a, b] = win(st); if (!inside(a, b).length) { hard.push({ kind: "hard_negative", source: d.id, journal: d.journal, text: d.text.slice(a, b) }); break; } }
  }
  return { head, mid, hard };
}
function charShuf(text, rnd) { return text.replace(/\S+/g, (w) => { const c = [...w]; const letters = c.map((ch, i) => (/\p{L}/u.test(ch) ? i : -1)).filter((i) => i >= 0); const vals = shuffled(letters.map((i) => c[i]), rnd); letters.forEach((i, k) => { c[i] = vals[k]; }); return c.join(""); }); }
function wordShuf(text, rnd) { return shuffled(text.split(/\s+/).filter(Boolean), rnd).join(" "); }
const named = (reader, text, opts) => { try { const r = reader.identify(text, opts); return r.named === true; } catch { return false; } };
function rate(items, fn) { return items.length ? items.filter(fn).length / items.length : null; }

export function measureR0(data, reader, P = PARAMS) {
  const res = { id: "r0", rung: "R0", split: data.split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  const { head, mid, hard } = r0Streams(data, { cap: P.STREAM_CAP, W: P.W });
  const gaps = [];
  if (!head.length || !mid.length || !hard.length) { res.gaps.push({ reason: "unmeasured", count: 1 }, { reason: "no_positive_or_hard_negative_streams", count: head.length + mid.length + hard.length }); return res; }
  const rnd = mulberry32(hashSeed("r0c:" + data.split));
  const tprHead = rate(head, (s) => named(reader, s.text));
  const tprMid = rate(mid, (s) => named(reader, s.text));
  const charshuf = rate(mid, (s) => named(reader, charShuf(s.text, rnd)));
  const wordshuf = rate(mid, (s) => named(reader, wordShuf(s.text, rnd)));
  const lower = rate(mid, (s) => named(reader, s.text, { noCase: true }));
  const noDecay = rate(mid, (s) => named(reader, s.text, { noDecay: true }));
  const noGaz = rate(mid, (s) => named(reader, s.text, { noGazetteer: true }));
  const hardRate = rate(hard, (s) => named(reader, s.text));
  const kinds = {};
  for (const s of data.foreign) (kinds[s.kind] ??= []).push(s);
  const strangers = {}, namedStrangers = [];
  for (const [k, xs] of Object.entries(kinds)) {
    const r = rate(xs, (s) => { const n = named(reader, s.text); if (n && namedStrangers.length < 60) namedStrangers.push({ kind: k, source: s.source, text: s.text.slice(0, 160) }); return n; });
    strangers[k] = { named_rate: rnd4(r), streams: xs.length, sources: new Set(xs.map((x) => x.source)).size, naive_first_shape: rnd4(rate(xs, (s) => naiveFirstShape(s.text))) };
    if (xs.length < P.KIND_MIN) gaps.push({ reason: `stranger_kind_below_${P.KIND_MIN}_streams:${k}`, count: xs.length });
  }
  const negAll = [...hard.map((s) => s.text), ...data.foreign.map((s) => s.text)];
  const naivePooled = negAll.length ? negAll.filter(naiveFirstShape).length / negAll.length : null;
  const naivePos = rate(mid, (s) => naiveFirstShape(s.text));
  // C0: causal agreement
  const r0 = P.RULE.r0;
  const c0items = mid.slice(0, P.C0_STREAMS);
  let c0ok = 0, c0n = 0;
  for (const s of c0items) {
    const full = reader.identify(s.text, { final: true });
    const ws = wordSpans(s.text);
    for (const t of P.C0_T) {
      if (ws.length < t) continue;
      const prefix = s.text.slice(0, ws[t - 1][1]);
      const aNamed = full.namedAtWord !== null && full.namedAtWord !== undefined && full.namedAtWord <= t;
      const bNamed = reader.identify(prefix, { final: true }).named === true;
      c0n++; if (aNamed === bNamed) c0ok++;
    }
  }
  const c0 = c0n ? c0ok / c0n : null;
  const kindRates = Object.entries(strangers).filter(([, v]) => v.streams >= P.KIND_MIN).map(([k, v]) => [k, v.named_rate]);
  const controlsAll = { charshuf, wordshuf, hard_negatives: hardRate, ...Object.fromEntries(kindRates.map(([k, v]) => [`stranger:${k}`, v])) };
  res.n = head.length + mid.length + hard.length + data.foreign.length;
  res.score = rnd4(mean([tprHead, tprMid]));
  res.control = rnd4(Math.max(...Object.values(controlsAll).filter((v) => v !== null)));
  res.margin = rnd4(res.score - res.control);
  res.controls = Object.fromEntries(Object.entries(controlsAll).map(([k, v]) => [k, rnd4(v)]));
  res.controls.naive_first_shape_pooled_negatives = rnd4(naivePooled);
  const worstStranger = kindRates.length ? Math.max(...kindRates.map(([, v]) => v)) : null;
  const clauses = [
    ["tpr_head", tprHead, tprHead >= r0.tpr], ["tpr_mid", tprMid, tprMid >= r0.tpr], ["hard_negative_rate", hardRate, hardRate <= r0.fpr],
    ["worst_stranger_kind_rate", worstStranger, worstStranger === null ? null : worstStranger <= r0.fpr],
    ["L0a_mid_minus_charshuf", tprMid - charshuf, tprMid - charshuf >= r0.l0a], ["L0b_mid_minus_wordshuf", tprMid - wordshuf, tprMid - wordshuf >= r0.l0b],
    ["L0c_naive_first_shape_pooled_negatives", naivePooled, naivePooled >= r0.l0c], ["C0_causal_agreement", c0, c0 === null ? null : c0 >= r0.c0],
  ];
  res.pass = clauses.some((c) => c[2] === null) ? null : clauses.every((c) => c[2]);
  res.gaps = gaps;
  res.details = {
    streams: { head: head.length, mid: mid.length, hard_negative: hard.length, strangers: data.foreign.length }, tpr_head: rnd4(tprHead), tpr_mid: rnd4(tprMid), by_stranger_kind: strangers,
    ablations_on_mid: { lower_case_blind: rnd4(lower), no_decay: rnd4(noDecay), no_gazetteer: rnd4(noGaz) }, naive_first_shape_on_positives: rnd4(naivePos),
    tpr_by_journal: byJournal([...head, ...mid], (s) => named(reader, s.text)), named_strangers: namedStrangers, clauses: clauses.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })), causal: { items: c0n, agreement: rnd4(c0) },
  };
  res.notes.push("identity latches; the stream is W=60 whitespace words", "strangers are real text ASSUMED non-taxonomic: every named stranger is listed in details.named_strangers for inspection");
  return res;
}
function byJournal(items, fn) { const g = {}; for (const s of items) { (g[s.journal] ??= []).push(fn(s)); } return Object.fromEntries(Object.entries(g).map(([j, xs]) => [j, { n: xs.length, rate: rnd4(xs.filter(Boolean).length / xs.length) }])); }

// ── R1 / R2: tokens ────────────────────────────────────────────────────────────────────────
function goldTokenMap(doc) {
  const m = new Map();
  for (const g of goldMentions(doc)) for (const [s, e, c] of g.tokens ?? []) if (GOLD_CLASSES.has(c)) m.set(`${s}:${e}`, { s, e, cls: c, text: doc.text.slice(s, e) });
  return m;
}
export function scoreR1(docs, tokenSets) {
  const tot = counts(); const perDoc = [];
  docs.forEach((d, i) => {
    const gold = goldTokenMap(d); const z = zones(d.mentions);
    const seen = new Set(); const c = counts();
    for (const t of tokenSets[i] ?? []) {
      if (!GOLD_CLASSES.has(t.cls)) continue;
      const k = `${t.s}:${t.e}`; if (seen.has(k)) continue; seen.add(k);
      if (gold.has(k)) c.tp++; else if (!overlaps(z, t.s, t.e)) c.fp++;
    }
    c.fn = gold.size - c.tp;
    tot.tp += c.tp; tot.fp += c.fp; tot.fn += c.fn;
    perDoc.push(gold.size + c.fp ? f1of(c.tp, c.fp, c.fn) ?? 0 : null);
  });
  return { ...prf(tot), perDoc };
}
const NAMEY = new Set(["genus", "subgenus", "epithet", "infra", "uninomial"]);
function shapeOnlyClass(w) {
  if (/^\d{4}[a-z]?$/.test(w)) return "year";
  if (/^(?:subsp|ssp|var|subvar|f|fo|forma|morph|nothosubsp)\.?$/i.test(w)) return "rank";
  if (/^(?:cf|aff|sp|spp)\.?$/i.test(w)) return "marker";
  if (/^×$/.test(w)) return "hybrid";
  if (/^\p{Ll}[\p{L}\-]*$/u.test(w)) return "epithet";
  if (/^\p{Lu}\.?$/u.test(w) || /\.$/.test(w) || /^\p{Lu}{2,}$/u.test(w)) return "author";
  if (/^\p{Lu}[\p{Ll}\-]+$/u.test(w)) return "genus";
  return "author";
}
/** scoreR2 (Amendment 2). Items: every GOLD lexeme (an unheard one is wrong) AND every reader name-class token outside neutral spans that is not a gold lexeme (over-production
 *  is wrong). Headline `f1` = 2*ok / (|G| + |R|): R = the reader's name-class tokens at a gold span or outside every neutral span (the same reader tokens R1 counts), ok = of
 *  those, the ones whose span AND class are the gold's. Beside it: `accuracy` = ok/|G| (the pre-Amendment-2 headline, the RECALL side), `accuracy_over_reader_tokens` (the
 *  precision side), `class_accuracy_given_span`. majority and shape_only are GIVEN the gold spans (they cannot over-produce) and keep the gold denominator. */
export function scoreR2(docs, tokenSets, rnd) {
  const classes = {}; let n = 0, ok = 0, nameOk = 0, nR = 0, heard = 0;
  const matched = [];   // [docIdx, key, readerCls]
  const goldAll = [];
  docs.forEach((d, i) => {
    const gold = goldTokenMap(d); const by = new Map(); const z = zones(d.mentions); const seen = new Set();
    for (const t of tokenSets[i] ?? []) {
      by.set(`${t.s}:${t.e}`, t);
      if (!GOLD_CLASSES.has(t.cls)) continue;
      const k = `${t.s}:${t.e}`; if (seen.has(k)) continue; seen.add(k);
      if (gold.has(k) || !overlaps(z, t.s, t.e)) nR++;
    }
    for (const [k, g] of gold) {
      goldAll.push([g.cls, g.text]);
      n++;
      (classes[g.cls] ??= { n: 0, ok: 0 }).n++;
      const t = by.get(k);
      if (t && GOLD_CLASSES.has(t.cls)) heard++;
      if (t && t.cls === g.cls) { ok++; classes[g.cls].ok++; }
      if (t && NAMEY.has(t.cls) === NAMEY.has(g.cls)) nameOk++;
      if (t) matched.push([i, k, t.cls]);
    }
  });
  const macro = mean(Object.values(classes).filter((c) => c.n >= PARAMS.MACRO_MIN_TOKENS).map((c) => c.ok / c.n));
  // controls
  const freq = {}; for (const [c] of goldAll) freq[c] = (freq[c] ?? 0) + 1;
  const maj = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  const majorityAcc = maj ? maj[1] / n : null;
  const shapeAcc = n ? goldAll.filter(([c, w]) => shapeOnlyClass(w) === c).length / n : null;
  // label_shuffled: derange the reader's classes among the tokens it matched, then score on all gold
  let shufOk = 0;
  const perm = derangement(matched.length, rnd);
  const goldByDoc = docs.map(goldTokenMap);
  matched.forEach(([i, k, c], idx) => { const g = goldByDoc[i].get(k); if (g && matched[perm[idx]][2] === g.cls) shufOk++; });
  const F = (x) => (n + nR ? (2 * x) / (n + nR) : null);
  return {
    n, n_reader_tokens: nR, f1: F(ok), accuracy: n ? ok / n : null, accuracy_over_reader_tokens: nR ? ok / nR : null, class_accuracy_given_span: heard ? ok / heard : null,
    macro, can_name_accuracy: n ? nameOk / n : null, can_name_f1: F(nameOk),
    per_class: Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, { n: v.n, recall: rnd4(v.ok / v.n) }])), majority: majorityAcc, majority_class: maj?.[0] ?? null, shape_only: shapeAcc,
    label_shuffled: F(shufOk), label_shuffled_over_gold: n ? shufOk / n : null,
  };
}

// ── R3 beings ───────────────────────────────────────────────────────────────────────────────
const grp = (k) => (BIN.has(k) ? "bin" : "uni");
export function scoreR3(docs, beingSets, { gazetteer = null } = {}) {
  const tot = { bin: counts(), uni: counts() }, all = counts(); const perDoc = [];
  let spanTp = 0, spanFp = 0, spanFn = 0, idOk = 0, idN = 0, kindOk = 0, kindN = 0;
  const kinds = {}; const oov = { in: { n: 0, tp: 0 }, out: { n: 0, tp: 0 } }; const jr = {};
  const entity = [];
  docs.forEach((d, i) => {
    const gold = goldMentions(d); const z = zones(d.mentions);
    const goldBy = new Map(gold.map((g) => [`${g.core[0]}:${g.core[1]}`, g]));
    const used = new Set(); const dc = counts();
    const goldIds = new Set(gold.filter((g) => g.id).map((g) => g.id)); const readIds = new Set();
    for (const b of beingSets[i] ?? []) {
      const k = `${b.span[0]}:${b.span[1]}`; const g = goldBy.get(k);
      const grpB = grp(b.kind);
      if (g) {
        spanTp++;
        const okId = g.id === null || g.id === undefined || g.id === b.id;
        const okGrp = grp(g.kind) === grpB;
        if (g.id !== null && g.id !== undefined) { idN++; if (g.id === b.id) idOk++; }
        if (grp(g.kind) === "uni" && grpB === "uni") { kindN++; if (g.kind === b.kind) kindOk++; }
        if (okId && okGrp) { tot[grpB].tp++; all.tp++; dc.tp++; used.add(k); readIds.add(b.id); }
        else { tot[grpB].fp++; all.fp++; dc.fp++; }
      } else if (!overlaps(z, b.span[0], b.span[1])) { tot[grpB].fp++; all.fp++; dc.fp++; spanFp++; readIds.add(b.id); }
    }
    for (const g of gold) {
      const gk = `${g.core[0]}:${g.core[1]}`; const gr = grp(g.kind);
      const k = (kinds[g.kind] ??= { n: 0, tp: 0 }); k.n++;
      if (used.has(gk)) k.tp++; else { tot[gr].fn++; all.fn++; dc.fn++; spanFn++; }
      if (gazetteer && (g.kind === "species" || g.kind === "infraspecific") && g.id) { const w = g.id.split(" ")[0]; const bucket = gazetteer.has(w) ? "in" : "out"; oov[bucket].n++; if (used.has(gk)) oov[bucket].tp++; }
      const J = (jr[d.journal] ??= { bin: counts(), uni: counts() }); if (used.has(gk)) J[gr].tp++; else J[gr].fn++;
    }
    for (const b of beingSets[i] ?? []) { const k = `${b.span[0]}:${b.span[1]}`; const J = (jr[d.journal] ??= { bin: counts(), uni: counts() }); if (!used.has(k) && (goldBy.has(k) || !overlaps(z, b.span[0], b.span[1]))) J[grp(b.kind)].fp++; }
    perDoc.push(gold.length + dc.fp ? f1of(dc.tp, dc.fp, dc.fn) ?? 0 : null);
    const inter = [...goldIds].filter((x) => readIds.has(x)).length;
    if (goldIds.size || readIds.size) entity.push((2 * inter) / (goldIds.size + readIds.size));
  });
  const kindsOut = Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { n: v.n, recall: rnd4(v.tp / v.n) }]));
  return {
    joint: prf(all), binomial: prf(tot.bin), uninomial: prf(tot.uni), perDoc, span_only: { tp: spanTp, fp: spanFp, fn: spanFn }, identity_accuracy_among_span_matched: idN ? idOk / idN : null, uninomial_kind_accuracy: kindN ? kindOk / kindN : null,
    by_gold_kind: kindsOut, recall_by_gazetteer: gazetteer ? { genus_in_gazetteer: { n: oov.in.n, recall: rnd4(oov.in.n ? oov.in.tp / oov.in.n : null) }, genus_out_of_gazetteer: { n: oov.out.n, recall: rnd4(oov.out.n ? oov.out.tp / oov.out.n : null) } } : null,
    by_journal: Object.fromEntries(Object.entries(jr).map(([j, v]) => [j, { binomial_f1: rnd4(prf(v.bin).f1), uninomial_f1: rnd4(prf(v.uni).f1) }])), entity_set_f1: rnd4(mean(entity)),
  };
}

// ── R4 relations ────────────────────────────────────────────────────────────────────────────
const relKey = (r) => `${r.end1}|${r.label}|${r.end2}`;
export function scoreR4(docs, relSets) {
  const tot = { claims: counts(), structural: counts() }; const labels = {}; const perDocClaims = [];
  docs.forEach((d, i) => {
    const gm = goldMentions(d).filter((g) => g.id !== null && g.id !== undefined);
    // claims are scored only where the gold mention carries a text-grounded authority and gnparser read it cleanly (typed gap: claims_unreliable_span / authority_outside_gold_span)
    const claimOk = (g) => g.claims_ok !== false && (g.auth ?? []).length > 0;
    const goldRel = new Set();
    for (const g of gm) for (const [lab, val] of g.rel ?? []) { if (CLAIM.has(lab) && !claimOk(g)) continue; const [a, b] = STRUCT.has(lab) ? val.split("|") : [g.id, val]; goldRel.add(`${a}|${lab}|${b}`); }
    const z = zones(d.mentions, { nullIds: true });
    const zc = [...z, ...goldMentions(d).filter((g) => g.id !== null && g.id !== undefined && !claimOk(g)).map((g) => [g.core[0], g.core[1]])].sort((a, b) => a[0] - b[0]);
    const readRel = new Map();
    for (const r of relSets[i] ?? []) {
      if (r.span && overlaps(z, r.span[0], r.span[1])) continue;
      if (CLAIM.has(r.label) && r.span && overlaps(zc, r.span[0], r.span[1])) continue;
      readRel.set(relKey(r), r);
    }
    const dc = counts();
    for (const k of readRel.keys()) {
      const lab = k.split("|")[1]; const g = CLAIM.has(lab) ? "claims" : "structural"; const L = (labels[lab] ??= counts());
      if (goldRel.has(k)) { tot[g].tp++; L.tp++; if (g === "claims") dc.tp++; } else { tot[g].fp++; L.fp++; if (g === "claims") dc.fp++; }
    }
    for (const k of goldRel) {
      if (readRel.has(k)) continue;
      const lab = k.split("|")[1]; const g = CLAIM.has(lab) ? "claims" : "structural"; (labels[lab] ??= counts()).fn++; tot[g].fn++; if (g === "claims") dc.fn++;
    }
    perDocClaims.push(dc.tp + dc.fp + dc.fn ? f1of(dc.tp, dc.fp, dc.fn) ?? 0 : null);
  });
  return { claims: prf(tot.claims), structural: prf(tot.structural), by_label: Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, rnd4(prf(v).f1)])), perDocClaims };
}

// ── causal licences ─────────────────────────────────────────────────────────────────────────
function cutAt(text, frac) { let cut = Math.floor(text.length * frac); while (cut > 0 && !/\s/.test(text[cut])) cut--; return cut; }
/** C1/C3/C4 (Amendment 2): EXACT, in both directions. For every cut, the NON-PROVISIONAL items (!prov) with at < cut of the PREFIX scan and those of the FULL scan are
 *  the same set: (fwd) every such prefix item is an item of the full scan (the reader never revises what it said once it was no longer provisional) AND (conv) every such
 *  full-scan item is an item of the prefix scan (no lookahead promotion: an item the full text has at a point before the cut that the prefix, lacking the later text,
 *  does not). Amendment 1 had dropped (conv) after the first dev run, which made the licence blind to ADDITIVE lookahead (a being promoted early because it recurs
 *  later); the two filters (!prov, at < cut) are what handle the boundary, and no margin is added. A unit = (document, cut); it is OK iff both directions hold.
 *  Returns, per layer, the share of OK units, with each direction beside it. */
export function causalChecks(docs, reader, P = PARAMS) {
  const picks = docs.filter((d) => goldMentions(d).length >= 5).slice(0, P.CAUSAL_DOCS);
  const mk = () => ({ ok: 0, fwd: 0, conv: 0, n: 0 });
  const out = { tokens: mk(), beings: mk(), relations: mk() };
  for (const d of picks) {
    const full = reader.read(d.text);
    for (const fr of P.CUTS) {
      const cut = cutAt(d.text, fr); if (cut < 20) continue;
      const pre = reader.read(d.text.slice(0, cut));
      const unit = (a, b, f, key) => {
        const final = (xs) => (xs ?? []).filter((x) => !x.prov && x.at < cut).map(f);
        const inAll = (xs) => new Set((xs ?? []).map(f));
        const setA = inAll(a), setB = inAll(b);
        const fwd = final(a).every((k) => setB.has(k));
        const conv = final(b).every((k) => setA.has(k));
        const o = out[key]; o.n++; if (fwd) o.fwd++; if (conv) o.conv++; if (fwd && conv) o.ok++;
      };
      unit(pre.tokens, full.tokens, (t) => `${t.s}:${t.e}:${t.cls}`, "tokens");
      unit(pre.beings, full.beings, (b) => `${b.span}|${b.id}|${b.kind}`, "beings");
      unit(pre.relations, full.relations, relKey, "relations");
    }
  }
  const r = (o) => (o.n ? o.ok / o.n : null);
  const dir = (o) => ({ non_revision: o.n ? o.fwd / o.n : null, no_lookahead_additions: o.n ? o.conv / o.n : null });
  return { tokens: r(out.tokens), beings: r(out.beings), relations: r(out.relations), items: out.tokens.n, docs: picks.length, by_direction: { tokens: dir(out.tokens), beings: dir(out.beings), relations: dir(out.relations) } };
}
/** the LICENCE OF THE LICENCE (Amendment 2): an ADDITIVE lookahead cheat built here, independently of the adapter. Every capitalised word of >= 3 letters that occurs
 *  >= minCount times ANYWHERE in the text it is given is promoted to a genus token, a genus being and a genus_of relation at its FIRST occurrence, with an honest low
 *  `at` and prov:false: a whole-text statistic judging an earlier unit. It never revises anything the honest reader said, so a one-directional (non-revision) licence
 *  passes it; the two-directional licence must not. */
export function lookaheadCheat(reader, { minCount = 3 } = {}) {
  return {
    name: "additive_lookahead_cheat", gaps: reader.gaps ?? [], identify: reader.identify,
    read(text, opts) {
      const o = reader.read(text, opts);
      const first = new Map(), n = new Map();
      for (const m of text.matchAll(/\p{Lu}\p{Ll}{2,}/gu)) { n.set(m[0], (n.get(m[0]) ?? 0) + 1); if (!first.has(m[0])) first.set(m[0], [m.index, m.index + m[0].length]); }
      const tokens = [], beings = [], relations = [];
      for (const [w, c] of n) {
        if (c < minCount) continue;
        const [s, e] = first.get(w);
        tokens.push({ s, e, t: w, cls: "genus", at: e, prov: false });
        beings.push({ id: w, kind: "genus", span: [s, e], at: e, prov: false, resolved: true });
        relations.push({ end1: w, label: "genus_of", end2: `${w} cheatus`, at: e, prov: false, span: [s, e] });
      }
      return { ...o, tokens: (o.tokens ?? []).concat(tokens), beings: (o.beings ?? []).concat(beings), relations: (o.relations ?? []).concat(relations) };
    },
  };
}

// ── R5: renderings ──────────────────────────────────────────────────────────────────────────
export const RENDERINGS = ["canon", "nocomma", "icn", "upper", "abbr", "italic", "prose"];
/** names of a document that carry a plain authority (authored_by [+ recombined_by] [+ year]) and a resolved id. */
export function r5Names(doc, max = PARAMS.R5_NAMES) {
  const seen = new Set(); const out = [];
  for (const g of goldMentions(doc)) {
    if (!BIN.has(g.kind) || !g.id || seen.has(g.id)) continue;
    const auth = g.auth ?? [];
    if (!auth.some(([l]) => l === "authored_by")) continue;
    if (auth.some(([l]) => l === "ex_author" || l === "in_author")) continue;
    const parts = g.id.split(" ");
    out.push({ id: g.id, genus: parts[0], epithet: parts[1], infra: parts[2] ?? null, orig: auth.filter(([l]) => l === "authored_by").map(([, t]) => t), comb: auth.filter(([l]) => l === "recombined_by").map(([, t]) => t), year: (auth.find(([l]) => l === "year") ?? [])[1] ?? null });
    seen.add(g.id); if (out.length >= max) break;
  }
  return out;
}
const join = (xs) => xs.join(" & ");
export function renderSheet(names, style) {
  const seenGenus = new Set(); const lines = [];
  for (const n of names) {
    const sp = (full = true, ital = false) => { const g = full ? n.genus : `${n.genus[0]}.`; const base = `${g} ${n.epithet}`; const t = n.infra ? `${base} subsp. ${n.infra}` : base; return ital ? `*${t}*` : t; };
    const recomb = n.comb.length > 0;
    const y = n.year;
    let auth;
    if (style === "icn") auth = recomb ? `(${join(n.orig)}) ${join(n.comb)}` : join(n.orig);
    else if (style === "nocomma") auth = recomb ? `(${join(n.orig)}${y ? " " + y : ""}) ${join(n.comb)}` : `${join(n.orig)}${y ? " " + y : ""}`;
    else { const o = style === "upper" ? n.orig.map((x) => x.toUpperCase()) : n.orig; const c = style === "upper" ? n.comb.map((x) => x.toUpperCase()) : n.comb; auth = recomb ? `(${join(o)}${y ? ", " + y : ""}) ${join(c)}` : `${join(o)}${y ? ", " + y : ""}`; }
    const full = style === "abbr" ? !seenGenus.has(n.genus) : true;
    seenGenus.add(n.genus);
    let line = `${sp(full, style === "italic")} ${auth}`;
    if (style === "prose") line = `It was identified as ${line} by the author.`;
    lines.push(line);
  }
  return style === "prose" ? lines.join(" ") : lines.join("\n");
}
function sheetItems(names, style) {
  const ids = new Set(), rel = new Set();
  for (const n of names) {
    ids.add(n.id);
    const sp = `${n.genus} ${n.epithet}`;
    rel.add(`${n.genus}|genus_of|${n.infra ? sp : n.id}`); if (n.infra) { rel.add(`${n.genus}|genus_of|${sp}`); rel.add(`${sp}|species_of|${n.id}`); }
    for (const o of n.orig) rel.add(`${n.id}|authored_by|${Adapter.akey(o)}`);
    for (const o of n.comb) rel.add(`${n.id}|recombined_by|${Adapter.akey(o)}`);
    if (n.year && style !== "icn") rel.add(`${n.id}|year_of|${n.year.slice(0, 4)}`);
  }
  return { ids, rel };
}
function readerItems(out) {
  const ids = new Set(), rel = new Set();
  for (const b of out.beings ?? []) if (b.resolved !== false) ids.add(b.id);
  for (const r of out.relations ?? []) rel.add(relKey(r));
  return { ids, rel };
}
const jaccard = (a, b) => { const A = new Set([...a.ids].map((x) => "i:" + x).concat([...a.rel].map((x) => "r:" + x))); const B = new Set([...b.ids].map((x) => "i:" + x).concat([...b.rel].map((x) => "r:" + x))); const inter = [...A].filter((x) => B.has(x)).length; const uni = A.size + B.size - inter; return uni ? inter / uni : null; };
/** restrict an item set to the labels a rendering expresses (icn has no year). */
const restrict = (it, style) => ({ ids: it.ids, rel: new Set([...it.rel].filter((k) => !(style === "icn" && k.includes("|year_of|")))) });

/** measureR5(data, reader, P, controls) — AMENDMENT 2: AGREEMENT(X) = |C_X cap C_canon| / |G_X cup R_X| charges false facts; `controls` = { ablate_all, shuffled_classifier, ... } readers
 *  built on edited priors (ablationReaders(priors)); a shotgun reader is derived from `reader` here. Without ablate_all and shuffled_classifier the prior-contribution clauses are null
 *  (a typed gap, the pass is null: never a pass by absence). */
export function measureR5(data, reader, P = PARAMS, controls = null) {
  const res = { id: "r5", rung: "R5", split: data.split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  const docs = data.docs.map((d) => ({ d, names: r5Names(d, P.R5_NAMES) })).filter((x) => x.names.length >= 3).slice(0, P.R5_DOCS);
  if (!docs.length) { res.gaps.push({ reason: "unmeasured", count: 1 }, { reason: "no_document_with_3_authored_names", count: 0 }); return res; }
  const naiveReader = { read: (t) => naiveRead(t) };
  const styles = RENDERINGS.filter((s) => s !== "canon");
  const arms = { real: reader, naive: naiveReader, shotgun: shotgunReader(reader), ...(controls ?? {}) };
  const armKeys = Object.keys(arms);
  const haveAblation = !!(controls && controls.ablate_all && controls.shuffled_classifier);
  const A = {}; for (const k of armKeys) { A[k] = {}; for (const st of styles) A[k][st] = []; }
  const D = { mis: {}, self: {}, gold: {}, prec: {} }; for (const k of Object.keys(D)) for (const st of styles) D[k][st] = [];
  const keyset = (it) => new Set([...it.ids].map((x) => "i:" + x).concat([...it.rel].map((x) => "r:" + x)));
  const inter = (a, b) => [...a].filter((x) => b.has(x)).length;
  // AGREEMENT(X) = |C_X cap C_canon| / |G_X cup R_X|, C = reader items that are in the gold, R_X = all the reader's items on X: of the facts the sheet states, the share the reader reads
  // right on BOTH renderings, over the facts stated PLUS every item the reader asserts that the sheet does not (false facts are charged: Amendment 2)
  const canon = {};
  for (const k of armKeys) canon[k] = docs.map(({ names }) => readerItems(arms[k].read(renderSheet(names, "canon"))));
  docs.forEach(({ names }, i) => {
    for (const st of styles) {
      const text = renderSheet(names, st);
      const G = keyset(sheetItems(names, st));
      for (const k of armKeys) {
        const Xfull = readerItems(arms[k].read(text));
        const X = keyset(restrict(Xfull, st));
        const Cx = new Set([...X].filter((x) => G.has(x)));
        const Cc = new Set([...keyset(restrict(canon[k][i], st))].filter((x) => G.has(x)));
        const den = G.size + X.size - Cx.size;
        A[k][st].push(den ? inter(Cx, Cc) / den : null);
        if (k === "real") {
          // misaligned: this rendering against the canon reading of the NEXT document
          const nextC = new Set([...keyset(restrict(canon.real[(i + 1) % docs.length], st))].filter((x) => G.has(x)));
          D.mis[st].push(den ? inter(Cx, nextC) / den : null);
          // diagnostics: plain self-consistency (a reader that is consistently wrong passes it), recall and precision against the gold of this rendering
          const Rc = keyset(restrict(canon.real[i], st));
          const un = X.size + Rc.size - inter(X, Rc);
          if (un) D.self[st].push(inter(X, Rc) / un);
          D.gold[st].push(G.size ? Cx.size / G.size : null);
          D.prec[st].push(X.size ? Cx.size / X.size : null);
        }
      }
    }
  });
  const m = (arr) => mean(arr.filter((v) => v !== null));
  const macroOf = (k) => mean(styles.map((s) => m(A[k][s])));
  const per = Object.fromEntries(styles.map((s) => [s, m(A.real[s])]));
  const macro = mean(Object.values(per)), minA = Math.min(...Object.values(per));
  const naiveMacro = macroOf("naive"), shotMacro = macroOf("shotgun");
  const misMacro = mean(styles.map((s) => m(D.mis[s])));
  const ablMacro = haveAblation ? Math.max(macroOf("ablate_all"), macroOf("shuffled_classifier")) : null;
  // natural pair: Plazi treatment vs GBIF Backbone record (the Backbone string must yield EXACTLY ONE resolved being: an extra being on a clean string is a false fact)
  const natural = []; let natGapNoRec = 0, natGapDiff = 0;
  data.docs.forEach((d, idx) => {
    if (!d.gbif_taxon) return;
    const rec = data.gbif?.[d.gbif_taxon]; if (!rec || !rec.scientificName) { natGapNoRec++; return; }
    const g0 = goldMentions(d).find((mm) => mm.id && (mm.kind === "species" || mm.kind === "infraspecific" || mm.kind === "genus" || mm.kind === "higher"));
    if (!g0 || g0.id !== rec.canonicalName) { natGapDiff++; return; }
    natural.push({ d, g0, rec, idx });
  });
  const pairRows = (rd) => natural.map(({ d, g0, rec }) => {
    const a = rd.read(d.text).beings.find((b) => b.span[0] === g0.core[0] && b.span[1] === g0.core[1]);
    const bs = rd.read(rec.scientificName).beings.filter((b) => b.resolved !== false);
    return { a: a?.id ?? null, b: bs.length === 1 ? bs[0].id : null, extra: bs.length > 1 ? bs.length : 0, gold: g0.id };
  });
  const agree = (rows) => (rows.length ? rows.filter((r) => r.a !== null && r.a === r.b).length / rows.length : null);
  const natArms = armKeys.filter((k) => k !== "shotgun");
  const natRowsBy = Object.fromEntries(natArms.map((k) => [k, pairRows(arms[k])]));
  const natRows = natRowsBy.real;
  const natAgree = agree(natRows);
  const natGold = natRows.length ? natRows.filter((r) => r.a === r.gold && r.b === r.gold).length / natRows.length : null;
  const natMis = natRows.length > 1 ? natRows.filter((r, i) => r.a !== null && r.a === natRows[(i + 1) % natRows.length].b).length / natRows.length : null;
  const natCtl = Object.fromEntries(natArms.filter((k) => k !== "real").map((k) => [k, agree(natRowsBy[k])]));
  const natCtlMax = haveAblation ? Math.max(natCtl.naive ?? 0, natCtl.ablate_all ?? 0, natCtl.shuffled_classifier ?? 0) : null;
  const r5 = P.RULE.r5;
  res.n = docs.length * styles.length;
  const controlsInRule = [misMacro ?? 0, naiveMacro ?? 0, shotMacro ?? 0, ...(haveAblation ? [ablMacro] : [])];
  const ctl = Math.max(...controlsInRule);
  res.score = rnd4(macro); res.control = rnd4(ctl); res.margin = rnd4(macro - ctl);
  res.controls = { misaligned: rnd4(misMacro), naive_regex: rnd4(naiveMacro), shotgun: rnd4(shotMacro), natural_pair_misaligned: rnd4(natMis), natural_pair_naive_regex: rnd4(natCtl.naive ?? null) };
  for (const k of ["ablate_all", "shuffled_classifier", "ablate_classifier", "ablate_lists"]) if (arms[k]) { res.controls[k] = rnd4(macroOf(k)); res.controls[`natural_pair_${k}`] = rnd4(natCtl[k] ?? null); }
  const natDecisive = natRows.length >= r5.naturalMin;
  const natOk = natDecisive ? natAgree >= r5.natural : null;
  const natMarginOk = natDecisive ? (haveAblation ? natAgree - natCtlMax >= r5.armMargin : null) : null;
  const clauses = [
    ["macro_agreement", macro, macro >= r5.macro], ["min_rendering_agreement", minA, minA >= r5.min], ["misaligned", misMacro, misMacro <= r5.misaligned], ["macro_minus_naive", macro - naiveMacro, macro - naiveMacro >= r5.margin],
    ["macro_minus_prior_ablated_and_shotgun", haveAblation ? macro - Math.max(ablMacro, shotMacro) : null, haveAblation ? macro - Math.max(ablMacro, shotMacro) >= r5.armMargin : null],
  ];
  const natClauses = natDecisive ? [["natural_pair_agreement", natAgree, natOk], ["natural_pair_minus_naive_and_prior_ablated", haveAblation ? natAgree - natCtlMax : null, natMarginOk]] : [];
  const all = [...clauses, ...natClauses];
  res.pass = all.some((c) => c[2] === false) ? false : all.some((c) => c[2] === null) ? null : true;
  if (!natDecisive) { res.gaps.push({ reason: `natural_pair_below_${r5.naturalMin}_items`, count: natRows.length }); res.notes.push("natural pair not decisive (too few items); rule decided by the derived renderings"); }
  if (!haveAblation) res.gaps.push({ reason: "prior_ablated_arms_unavailable", count: 1 });
  res.gaps.push({ reason: "language_parallel_unmeasured", count: 0 }, { reason: "natural_pair_no_backbone_record", count: natGapNoRec }, { reason: "natural_pair_names_differ_or_no_gold_name", count: natGapDiff });
  const extraN = natRows.filter((r) => r.extra > 0).length;
  res.details = {
    documents: docs.length, agreement_by_rendering: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, rnd4(v)])),
    recall_on_this_rendering_by_rendering: Object.fromEntries(styles.map((s) => [s, rnd4(m(D.gold[s]))])), precision_on_this_rendering_by_rendering: Object.fromEntries(styles.map((s) => [s, rnd4(m(D.prec[s]))])),
    self_consistency_diagnostic_by_rendering: Object.fromEntries(styles.map((s) => [s, rnd4(m(D.self[s]))])), naive_agreement_by_rendering: Object.fromEntries(styles.map((s) => [s, rnd4(m(A.naive[s]))])),
    agreement_by_arm: Object.fromEntries(armKeys.map((k) => [k, Object.fromEntries(styles.map((s) => [s, rnd4(m(A[k][s]))]))])),
    natural_pair: { items: natRows.length, agreement: rnd4(natAgree), agreement_with_gold: rnd4(natGold), backbone_strings_with_extra_beings: extraN, by_arm: Object.fromEntries(Object.entries(natCtl).map(([k, v]) => [k, rnd4(v)])), examples_disagree: natRows.filter((r) => r.a !== r.b).slice(0, 8) },
    clauses: all.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })), sheets_are: "DERIVED: script-authored from gold mentions, never natural text",
  };
  res.notes.push("renderings are authored by script from the gold (derived, not natural); the natural pair is Plazi treatment vs GBIF Backbone record", "AGREEMENT charges false facts (Amendment 2): the denominator is the gold facts of the rendering plus every item the reader asserts that the sheet does not");
  return res;
}

// ── the ladder ───────────────────────────────────────────────────────────────────────────────
function rung(id, split) { return { id, rung: id.toUpperCase(), split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} }; }
const gazetteerOf = (priors) => { try { const c = Adapter.compilePriors(priors); return c.gaz; } catch { return null; } };

/** runLadder({data, reader, priors, params, controlReaders}) -> { family, rungs } computed on injected data/readers (the tests inject toy ones).
 *  controlReaders = { ablate_all, shuffled_classifier, [ablate_classifier, ablate_lists] } (Amendment 2): readers on edited priors; when not given they are built from `priors`
 *  (ablationReaders). When neither exists the prior-contribution clauses of R2 and R5 are null and those rungs' pass is null (a typed gap, never a pass by absence). */
export function runLadder({ data, reader, priors = null, params = PARAMS, controlReaders = null }) {
  const P = params, split = data.split;
  const rungs = {};
  if (!data.docs.length) {
    for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) { const r = rung(k, split); r.gaps.push({ reason: "unmeasured", count: 1 }, ...data.gaps); rungs[k] = r; }
    return { family: FAMILY, split, rungs };
  }
  const docs = data.docs;
  const outs = docs.map((d) => reader.read(d.text));
  const rndAll = mulberry32(hashSeed("ladder:" + split));
  const arms = controlReaders ?? (priors ? ablationReaders(priors) : null);
  const haveArms = !!(arms && arms.ablate_all && arms.shuffled_classifier);
  const armOuts = arms ? Object.fromEntries(Object.entries(arms).map(([k, rd]) => [k, docs.map((d) => rd.read(d.text))])) : {};
  const armGap = haveArms ? [] : [{ reason: "prior_ablated_arms_unavailable", count: 1 }];
  // the causal licence is computed ONCE and shared by R1, R3 and R4; its licence-of-the-licence (the additive lookahead cheat) with it
  const causal = causalChecks(docs, reader, P);
  const causalCheat = causalChecks(docs, lookaheadCheat(reader), P);
  const causalDetail = { ...causal, additive_cheat: { tokens: causalCheat.tokens, beings: causalCheat.beings, relations: causalCheat.relations, by_direction: causalCheat.by_direction } };
  const pairs = (a, b) => { const x = [], y = []; a.perDoc.forEach((v, i) => { if (v !== null && b.perDoc[i] !== null) { x.push(v); y.push(b.perDoc[i]); } }); return signTest(x, y); };
  // R0
  rungs.r0 = measureR0(data, reader, P);
  // R1
  {
    const r = rung("r1", split); const rule = P.RULE.r1;
    const real = scoreR1(docs, outs.map((o) => o.tokens ?? []));
    const naive = scoreR1(docs, docs.map((d) => naiveTokens(d.text)));
    const ws = scoreR1(docs, docs.map((d) => wsCapsTokens(d.text)));
    const shifted = scoreR1(docs, outs.map((o) => (o.tokens ?? []).map((t) => ({ ...t, s: t.s + 1, e: t.e + 1 }))));
    const mis = scoreR1(docs, outs.map((_, i) => outs[(i + 1) % outs.length].tokens ?? []));
    const caseBlind = scoreR1(docs, docs.map((d) => reader.read(d.text, { noCase: true }).tokens ?? []));
    const sNaive = pairs(real, naive), sWs = pairs(real, ws);
    const c = causal;
    r.n = docs.length; r.score = rnd4(real.f1); r.control = rnd4(Math.max(naive.f1 ?? 0, ws.f1 ?? 0)); r.margin = rnd4(real.f1 - r.control);
    r.controls = { naive_regex: rnd4(naive.f1), ws_caps: rnd4(ws.f1), shifted: rnd4(shifted.f1), misaligned: rnd4(mis.f1), case_blind_diagnostic: rnd4(caseBlind.f1) };
    const ablDiag = {}; for (const k of Object.keys(armOuts)) { ablDiag[k] = rnd4(scoreR1(docs, armOuts[k].map((o) => o.tokens ?? [])).f1); r.controls[`${k}_diagnostic`] = ablDiag[k]; }
    const clauses = [["micro_f1", real.f1, real.f1 >= rule.f1], ["sign_vs_naive_regex_p", sNaive.p, sNaive.p <= P.ALPHA], ["sign_vs_ws_caps_p", sWs.p, sWs.p <= P.ALPHA], ["L1a_shifted", shifted.f1, shifted.f1 <= rule.shifted], ["L1b_misaligned", mis.f1, mis.f1 <= rule.misaligned], ["C1_causal_tokens", c.tokens, c.tokens === null ? null : c.tokens >= rule.c1], ["LC1_additive_cheat_caught", causalCheat.tokens, causalCheat.tokens === null ? null : causalCheat.tokens <= rule.cheat]];
    r.pass = clauses.some((x) => x[2] === null) ? null : clauses.every((x) => x[2]);
    r.details = { precision: rnd4(real.p), recall: rnd4(real.r), tp: real.tp, fp: real.fp, fn: real.fn, sign_tests: { naive_regex: sNaive, ws_caps: sWs }, causal: causalDetail, prior_ablated_diagnostic_f1: ablDiag, clauses: clauses.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })) };
    r.gaps = [{ reason: "connector_and_qualifier_lexemes_have_no_gold", count: 0 }]; r.notes.push("name lexemes only (gnparser words of gold mentions); classes are R2");
    rungs.r1 = r;
    // R2 (Amendment 2): headline = labelled-span F1 (over-production charged); prior-ablated arms are controls IN THE RULE
    const r2 = rung("r2", split); const rl = P.RULE.r2;
    const s2 = scoreR2(docs, outs.map((o) => o.tokens ?? []), rndAll);
    const ab2 = {};
    for (const k of Object.keys(armOuts)) ab2[k] = scoreR2(docs, armOuts[k].map((o) => o.tokens ?? []), mulberry32(hashSeed("r2arm:" + k + split)));
    const ablIn = haveArms ? Math.max(ab2.ablate_all.f1 ?? 0, ab2.shuffled_classifier.f1 ?? 0) : null;
    r2.n = s2.n; r2.score = rnd4(s2.f1);
    const ctlOld = Math.max(s2.majority ?? 0, s2.label_shuffled ?? 0, s2.shape_only ?? 0);
    const ctl = Math.max(ctlOld, ablIn ?? 0);
    r2.control = rnd4(ctl); r2.margin = rnd4(s2.f1 - ctl);
    r2.controls = { majority: rnd4(s2.majority), label_shuffled: rnd4(s2.label_shuffled), shape_only_given_gold_spans: rnd4(s2.shape_only) };
    for (const k of Object.keys(ab2)) r2.controls[k] = rnd4(ab2[k].f1);
    const cl2 = [
      ["micro_labelled_span_f1", s2.f1, s2.f1 >= rl.acc], ["macro_recall", s2.macro, s2.macro >= rl.macro], ["can_name_accuracy", s2.can_name_accuracy, s2.can_name_accuracy >= rl.canName],
      ["margin_over_controls", s2.f1 - ctlOld, s2.f1 - ctlOld >= rl.margin],
      ["margin_over_prior_ablated", haveArms ? s2.f1 - ablIn : null, haveArms ? s2.f1 - ablIn >= rl.armMargin : null],
    ];
    r2.pass = s2.n ? (cl2.some((x) => x[2] === false) ? false : cl2.some((x) => x[2] === null) ? null : true) : null;
    r2.details = {
      per_class: s2.per_class, majority_class: s2.majority_class, n_reader_tokens: s2.n_reader_tokens, accuracy_over_gold: rnd4(s2.accuracy), accuracy_over_reader_tokens: rnd4(s2.accuracy_over_reader_tokens), class_accuracy_given_span: rnd4(s2.class_accuracy_given_span),
      can_name_accuracy: rnd4(s2.can_name_accuracy), can_name_f1: rnd4(s2.can_name_f1), macro_recall: rnd4(s2.macro),
      by_prior_ablated_arm: Object.fromEntries(Object.entries(ab2).map(([k, v]) => [k, { f1: rnd4(v.f1), accuracy_over_gold: rnd4(v.accuracy), accuracy_over_reader_tokens: rnd4(v.accuracy_over_reader_tokens), macro_recall: rnd4(v.macro), n_reader_tokens: v.n_reader_tokens }])),
      clauses: cl2.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })),
    };
    r2.gaps = [{ reason: "class_inventory_is_gnparser_word_types", count: 0 }, ...armGap]; r2.notes.push("an unheard token is wrong AND an extra token is wrong (Amendment 2): the headline is the labelled-span F1; R1 errors are charged to R2; shape_only is a reference control GIVEN the gold spans");
    rungs.r2 = r2;
  }
  // R3
  {
    const r = rung("r3", split); const rule = P.RULE.r3;
    const gz = gazetteerOf(priors);
    const real = scoreR3(docs, outs.map((o) => o.beings ?? []), { gazetteer: gz });
    const naive = scoreR3(docs, docs.map((d) => naiveBeings(d.text)));
    const mis = scoreR3(docs, outs.map((_, i) => outs[(i + 1) % outs.length].beings ?? []));
    const caseBlind = scoreR3(docs, docs.map((d) => reader.read(d.text, { noCase: true }).beings ?? []));
    const noGaz = scoreR3(docs, docs.map((d) => reader.read(d.text, { noGazetteer: true }).beings ?? []));
    const sNaive = pairs(real, naive); const c = causal;
    const jf = real.joint.f1 ?? 0;
    r.n = docs.length; r.score = rnd4(jf); r.control = rnd4(Math.max(naive.joint.f1 ?? 0, mis.joint.f1 ?? 0)); r.margin = rnd4(jf - r.control);
    r.controls = { naive_regex: rnd4(naive.joint.f1), misaligned: rnd4(mis.joint.f1), case_blind: rnd4(caseBlind.joint.f1), no_gazetteer_diagnostic: rnd4(noGaz.joint.f1) };
    const ablDiag = {}; for (const k of Object.keys(armOuts)) { ablDiag[k] = { joint_f1: rnd4(scoreR3(docs, armOuts[k].map((o) => o.beings ?? [])).joint.f1) }; r.controls[`${k}_diagnostic`] = ablDiag[k].joint_f1; }
    const clauses = [
      ["binomial_joint_f1", real.binomial.f1, (real.binomial.f1 ?? 0) >= rule.binom], ["uninomial_joint_f1", real.uninomial.f1, (real.uninomial.f1 ?? 0) >= rule.uni],
      ["margin_over_naive_and_misaligned", jf - r.control, jf - r.control >= rule.margin], ["sign_vs_naive_regex_p", sNaive.p, sNaive.p <= P.ALPHA],
      ["L3a_misaligned", mis.joint.f1, (mis.joint.f1 ?? 0) <= jf - rule.misaligned],
      ["casing_not_collapse", caseBlind.joint.f1, (caseBlind.joint.f1 ?? 0) >= rule.caseMin], ["casing_is_a_witness", jf - (caseBlind.joint.f1 ?? 0), jf - (caseBlind.joint.f1 ?? 0) >= rule.caseDrop],
      ["C3_causal_beings", c.beings, c.beings === null ? null : c.beings >= rule.c3], ["LC3_additive_cheat_caught", causalCheat.beings, causalCheat.beings === null ? null : causalCheat.beings <= rule.cheat],
    ];
    r.pass = clauses.some((x) => x[2] === null) ? null : clauses.every((x) => x[2]);
    r.details = { binomial: real.binomial, uninomial: real.uninomial, joint: real.joint, span_only: real.span_only, identity_accuracy_among_span_matched: rnd4(real.identity_accuracy_among_span_matched), uninomial_kind_accuracy: rnd4(real.uninomial_kind_accuracy), by_gold_kind: real.by_gold_kind, recall_by_gazetteer: real.recall_by_gazetteer, by_journal: real.by_journal, entity_set_f1: real.entity_set_f1, sign_vs_naive: sNaive, causal: causalDetail, case_blind: { binomial: rnd4(caseBlind.binomial.f1), uninomial: rnd4(caseBlind.uninomial.f1) }, prior_ablated_diagnostic: ablDiag, clauses: clauses.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })), neutral_spans_by_reason: data.neutral };
    r.gaps = [{ reason: "species_unchecked_by_backbone", count: 0 }, { reason: "higher_classification_is_world_knowledge", count: 0 }, ...Object.entries(data.neutral ?? {}).map(([k, v]) => ({ reason: `neutral_span:${k}`, count: v }))];
    r.notes.push("untagged-but-real names count against the reader (see adjudication for the sampled share)", "binomial and uninomial rows are scored apart because a capitalised word that is a genus, a place or a collector is not decidable by shape");
    rungs.r3 = r;
  }
  // R4
  {
    const r = rung("r4", split); const rule = P.RULE.r4;
    const rels = outs.map((o) => o.relations ?? []);
    const real = scoreR4(docs, rels);
    const naive = scoreR4(docs, docs.map((d) => naiveRelations(d.text)));
    const mis = scoreR4(docs, rels.map((_, i) => rels[(i + 1) % rels.length]));
    // bind_shuffle: derange end2 among the claims of one label inside a document
    const rnd = mulberry32(hashSeed("bind:" + split));
    const bound = rels.map((rs) => {
      const out = rs.map((x) => ({ ...x })); const byLabel = {};
      out.forEach((x, k) => { if (CLAIM.has(x.label)) (byLabel[x.label] ??= []).push(k); });
      for (const ks of Object.values(byLabel)) { if (ks.length < 2) continue; const p = derangement(ks.length, rnd); const vals = ks.map((k) => out[k].end2); ks.forEach((k, j) => { out[k].end2 = vals[p[j]]; }); }
      return out;
    });
    const bind = scoreR4(docs, bound);
    const c = causal;
    const cf = real.claims.f1 ?? 0;
    r.n = docs.length; r.score = rnd4(cf); const ctrl = Math.max(naive.claims.f1 ?? 0, bind.claims.f1 ?? 0, mis.claims.f1 ?? 0); r.control = rnd4(ctrl); r.margin = rnd4(cf - ctrl);
    r.controls = { regex_authority: rnd4(naive.claims.f1), bind_shuffle: rnd4(bind.claims.f1), misaligned: rnd4(mis.claims.f1), structural_misaligned: rnd4(mis.structural.f1) };
    const ablDiag = {}; for (const k of Object.keys(armOuts)) { ablDiag[k] = { claims_f1: rnd4(scoreR4(docs, armOuts[k].map((o) => o.relations ?? [])).claims.f1) }; r.controls[`${k}_diagnostic`] = ablDiag[k].claims_f1; }
    // shotgun diagnostic on the first 100 documents (every authored_by / recombined_by / year_of against every capitalised word / year: thousands of relations per document)
    const SG = Math.min(100, docs.length); const sgReader = shotgunReader(reader);
    const sg = scoreR4(docs.slice(0, SG), docs.slice(0, SG).map((d) => sgReader.read(d.text).relations ?? []));
    const sgReal = scoreR4(docs.slice(0, SG), rels.slice(0, SG));
    r.controls.shotgun_diagnostic_first_100_docs = rnd4(sg.claims.f1);
    const clauses = [["claims_f1", cf, cf >= rule.claims], ["structural_f1", real.structural.f1, (real.structural.f1 ?? 0) >= rule.structural], ["margin_over_controls", cf - ctrl, cf - ctrl >= rule.margin], ["L4a_misaligned", mis.claims.f1, (mis.claims.f1 ?? 0) <= cf - rule.misaligned], ["L4b_bind_shuffle", bind.claims.f1, (bind.claims.f1 ?? 0) <= cf - rule.bind], ["C4_causal_relations", c.relations, c.relations === null ? null : c.relations >= rule.c4], ["LC4_additive_cheat_caught", causalCheat.relations, causalCheat.relations === null ? null : causalCheat.relations <= rule.cheat]];
    r.pass = clauses.some((x) => x[2] === null) ? null : clauses.every((x) => x[2]);
    r.details = { claims: real.claims, structural: real.structural, f1_by_label: real.by_label, causal: causalDetail, prior_ablated_diagnostic: ablDiag, shotgun_diagnostic: { docs: SG, claims_f1: rnd4(sg.claims.f1), real_claims_f1_same_docs: rnd4(sgReal.claims.f1), claims_precision: rnd4(sg.claims.p) }, clauses: clauses.map(([n, v, ok]) => ({ clause: n, value: rnd4(v), ok })) };
    r.gaps = [{ reason: "higher_classification_is_world_knowledge", count: 0 }, { reason: "relation_synonymy_unmeasured", count: 0 }, { reason: "icnp_bacteria_unmeasured", count: 0 }];
    r.notes.push("claims = text-stated nomenclatural content; structural = derivable from the written name and reported apart");
    rungs.r4 = r;
  }
  rungs.r5 = measureR5(data, reader, P, arms);
  return { family: FAMILY, split, rungs };
}

/** measure({split="dev", limit=null}) -> { family, rungs }. Never throws for missing data. */
export async function measure({ split = "dev", limit = null, root = ROOT } = {}) {
  let ledger = null;
  try {
    const data = loadData(split, { limit, root });
    const priors = Adapter.loadPriors();
    const reader = adapterReader(priors);
    if (split === "test") {
      const dir = path.join(root, "results"); fs.mkdirSync(dir, { recursive: true });
      const lp = path.join(dir, "test-ledger.jsonl");
      const before = fs.existsSync(lp) ? fs.readFileSync(lp, "utf8").split("\n").filter(Boolean).length : 0;
      fs.appendFileSync(lp, JSON.stringify({ at: new Date().toISOString(), limit, prereg: PREREG_SHA256 }) + "\n");
      ledger = { test_runs_before_this_one: before };
    }
    const controlReaders = ablationReaders(priors);
    const out = runLadder({ data, reader, priors, controlReaders });
    out.prereg_sha256 = PREREG_SHA256; out.priors_ok = priors.ok; out.priors_gaps = priors.gaps; out.ledger = ledger; out.data_gaps = data.gaps;
    out.sizes = { docs: data.docs.length, foreign_streams: data.foreign.length }; out.amendments = 2; out.prior_ablated_arms = Object.keys(controlReaders);
    for (const r of Object.values(out.rungs)) { r.gaps = [...(r.gaps ?? []), ...(priors.ok ? [] : priors.gaps)]; }
    try { const dir = path.join(root, "results"); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `${split}${limit ? "-limit" + limit : ""}-card.json`), JSON.stringify(out, null, 1)); } catch { /* read-only is fine */ }
    return out;
  } catch (e) {
    const rungs = {};
    for (const k of ["r0", "r1", "r2", "r3", "r4", "r5"]) { const r = rung(k, split); r.gaps.push({ reason: "unmeasured", count: 1 }, { reason: "instrument_error", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); rungs[k] = r; }
    return { family: FAMILY, split, rungs };
  }
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const i = process.argv.indexOf("--split"), j = process.argv.indexOf("--limit");
  const split = i > 0 ? process.argv[i + 1] : "dev"; const limit = j > 0 ? Number(process.argv[j + 1]) : null;
  const t0 = Date.now();
  const card = await measure({ split, limit });
  console.log(JSON.stringify(card, null, 1));
  console.error(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const [k, r] of Object.entries(card.rungs)) console.error(`${k}: score=${r.score} control=${r.control} margin=${r.margin} pass=${r.pass}`);
}
