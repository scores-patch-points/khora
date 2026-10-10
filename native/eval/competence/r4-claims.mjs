// eval/competence/r4-claims.mjs — RUNG R4: FIND CLAIMS (who did what to whom), CASE-STRIPPED.
//
//   node eval/competence/r4-claims.mjs --stem <stem> [--split dev|test] [--limit N] [--causal [--block N]] [--verbose]
//   node eval/competence/r4-claims.mjs --all [--split dev|test]          (one JSON line per stem)
//   import { RUNG, measure } from "./r4-claims.mjs"     measure({stem, split, limit, causalBlock}) -> result card
//   The card is also written to /private/tmp/claude-501/competence/r4-<stem>-<split>.json.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first MEASURED run of this file; ═══
// ═══ no threshold below is tuned after a result; a failure is reported as a failure)               ═══
// DISCLOSURE. Before this header was written, two exploratory runs touched the reader but scored nothing:
// (1) five toy English sentences through engineRelationsFor, to see the shape of an edge ({end1,label,end2,
// refs,spans:[{ref:"material#A-B",start,end,text}]}); (2) timing runs of engineRelationsFor on the first
// 30-80 DEV sentences of eng, spa, cmn-hans, arb, kor that printed edge COUNTS and the first six edges of
// each as strings. I saw that the edges read as figure-connector-figure adjacency with long, noisy
// connector labels in cmn-hans/arb/kor/spa. No gold was read, nothing was scored, no rule below was chosen
// from a number; the predictions below are informed by having seen those strings, and say so.
//
// CLAIM. The PRODUCTION relation path (the-fold/reader-bundle.js engineRelationsFor, GFP mode, roleConfig
// OFF by design), reading held-out sentences of a language through that language's ear, emits edges
// {end1,label,end2} that connect a sentence's SUBJECT to its OBJECT (who ... whom): more than (i) the same
// reading deafened, (ii) edges of the same count placed at random, (iii) edges whose sentence pairing is
// destroyed. R4 sits above R1 (words), R2 (classes) and R3 (beings); it asks only whether the relation
// the reader draws between two beings is the claim the sentence makes.
//
// INPUT (case-stripped, the heard rule). The first N sentences (default N = 200, a COMPUTE budget, not a
// threshold; --limit overrides) of the DEV file of the stem, in file order. The sentence text is the
// `# text =` line, LOWERCASED, one passage per sentence (rebuilt from the tokens only when the line is
// absent; counted in details.gold.textRebuilt). No capital reaches the primary arm. The same system on
// the ORIGINAL-case text is a second, informational card (details.cased) with its own controls: it shows
// what the capital witness adds. Gold matching is case-blind on both.
//
// GOLD (system-independent: the treebank's own HEAD/DEPREL only). For every predicate P (a token that is
// the HEAD of at least one dependent whose base deprel — text before ":" — is nsubj or csubj, AND of at
// least one whose base deprel is obj or iobj): S(P) = those subject dependents, O(P) = those object
// dependents, each EXPANDED over `conj` dependents (the subject of "A and B ate" is A and B). The gold
// SUBJECT-OBJECT PAIRS of a sentence are S(P) x O(P) over its predicates (deduplicated on (S,O,P) token
// ids). A head word's KEYS = {its FORM, its LEMMA (when not "_"), where the treebank itself annotates a
// bound-morpheme split (lemma and xpos both carry "+", equal length: Sejong/Korean) the nominal STEM = the
// morphemes before the first J*/E*/VCP tag, accepted only if a prefix of the form, plus the first lemma
// morpheme, and the surface form of a multi-word-token range the word belongs to (del, au, des)}; all
// normalised (NFC, lowercase, Latin combining marks / Arabic harakat+tatweel / Hebrew niqqud stripped).
// Lemma/stem/MWT keys exist so the arm that PEELS bound morphemes (ear: Arabic al-, Korean particles) is
// not penalised by a surface-form matcher; they are applied identically to every arm, so they raise all
// arms' chance rate equally and the controls measure that rate. The gold also lists the sentence's
// NOMINAL HEADS: words with UPOS NOUN, PROPN or PRON.
//
// THE MATCHER (precise; identical for every arm). An end string (end1 / end2 / label) is normalised the
// same way and cut into TOKENS at every non-(letter|mark|number); its SQUASH is the string with those
// separators deleted. "end CONTAINS key" iff
//   key has an ideographic/syllabic character (Han, Kana, Hangul, Thai, Lao, Khmer, Myanmar), no spaces
//   between words in the script, so the unit is the character:
//        key length >= 2 (SUBSTRING_MIN.ideographic): the end's SQUASH includes the key; key length 1:
//        some token of the end equals the key.
//   otherwise (alphabetic): some token EQUALS the key, or key length >= 3 (SUBSTRING_MIN.alphabetic) and
//        some token INCLUDES the key (inflection: casa in casas); a key of several tokens (e-mail) is
//        tested on the SQUASH.
// SUBSTRING_MIN {2,3} are PROVISIONAL bare integers (P4), declared here, applied to every arm; their
// leniency is exactly what the controls price. A SYSTEM EDGE e HITS gold pair (s,o) of predicate v iff
//   end1 CONTAINS a key of s  AND  end2 CONTAINS a key of o            (direction: end1 is the earlier figure)
// An edge also hits as TRIPLE iff additionally label CONTAINS a key of v. The user's spec said "end1
// contains the subject head form and end2 contains the object head form (or label contains the verb)": the
// closest honest reading is: the PAIR hit is the unit (recall is "of gold subject-object pairs"), the
// label/verb clause is reported as the stricter TRIPLE recall (details), never as an alternative route to
// credit (that reading would credit an edge whose object end is wrong).
//
// METRICS (micro-averaged over the sample's sentences; every number is a ratio of sums).
//   recall      = gold pairs hit by >= 1 edge OF THE SAME SENTENCE / gold pairs.
//   precision   = (edges that hit ANY gold pair of their sentence, OR whose two ends contain keys of two
//                  DIFFERENT nominal heads of their sentence, either order) / all edges. Denominator =
//                  edges of ALL sampled sentences, including sentences with no gold pair. (the spec's own
//                  definition). STRICT precision (hit a gold pair only) is reported alongside.
//   F1          = 2PR/(P+R); P undefined (no edges) is 0, so F1 = 0: an arm that says nothing scores 0,
//                  and its zero is a failure, never "undefined = good".
// Also reported, never in the rule: undirected recall (either orientation), triple recall, nominal-only
// recall (both heads NOUN/PROPN), and the first real edges with their hit flags (--verbose).
//
// THE SYSTEM, in "arms":
//   prod        engineRelationsFor(passages, {language: stem}) — the PRODUCTION path. The ear is the whole
//               LANGUAGE LEG: the withEar scope (segmentation, bound-morpheme peel) AND the heard-nominal
//               tier that listens through it (language-context.js extractSurfacesHeard). [REAL ARM]
//   noear       the SAME reader, relation extractors and priors, built with makeEngineRelationReader
//               ({extractSurfaces: capital-only surfaces.js}) and run OUTSIDE withEar: exactly what the
//               production path did before the language leg existed. [CONTROL: "the same extraction
//               WITHOUT the ear"]. On lowercased input of a cased script the capital tier is blind, so
//               noear may emit ~nothing there: the primary comparison then shows what HEARING adds when
//               capitals are gone; the ORIGINAL-case card (details.cased) is the one that shows what the
//               language leg adds when the capital witness is present.
//   gfp         relations-gfp.js extractGfpRelations under withEar for the stem ear, one sentence at a time,
//               CAUSAL: the figure set for sentence i is the extractor's own recurrence rule (count >= 2
//               = its default minRec, length >= wordFloor(.,3), not a function class of the stem POS prior)
//               over the heard tokens of sentences 0..i only, handed in through `figures`. Its noear twin
//               runs without the ear. Informational: own card, own verdict (details.gfp), not the rung's.
//   roleConfig  relationExtractorsFor with the stem's RoleConfig@1 (SVO positional) on the heard sentence.
//               INFORMATION ONLY: roleConfig is OFF in production by design (the positional reader failed on
//               real prose); reported with F1 and its comparison to random adjacent edges, no pass rule.
// CAUSALITY (S3). engineRelationsFor reads the whole list: its referent index and recurrence are built from
// the WHOLE sample, so every earlier sentence is judged with later sentences in view. The primary arm is
// therefore a LOOKAHEAD (batch) variant, labelled so in the card (details.lookahead). The `--causal` flag
// adds the CAUSAL-AT-BLOCK-GRANULARITY variant (details.causal): block b is read from a fresh reader fed
// sentences 0..end-of-block-b, and only block b's edges are credited (default block 40; within-block
// lookahead <= block-1 sentences, named; --block 1 is strictly causal and slow). It is scored with the same
// rule against its own noear twin. The gfp arm is causal by construction.
//
// CONTROLS (all built to fail; all take per-sentence edge COUNTS from the arm they test).
//   noear           above.
//   random_adjacent same number of edges per sentence, each between two ADJACENT heard tokens of that
//                   sentence (heard through the stem's ear), end1 the earlier; label empty. Mean of R = 20
//                   seeded draws.
//   random_pair     same number per sentence, each between two DISTINCT random heard tokens (reading order).
//                   Chance for a sentence with this many tokens. Mean of R = 20 draws.
//   shuffled_gold   the arm's edges of sentence i are scored against the gold of sentence pi(i), pi a Sattolo
//                   derangement of the sample (no sentence keeps its own gold); mean of R = 20. The
//                   statistic that moves when the sentence pairing is destroyed.
//   crossed_edges   each edge keeps end1/label and takes the end2 of a random edge of a DIFFERENT sentence:
//                   an edge BETWEEN sentences ("cross-sentence pairing must score ~0"). Mean of R = 20.
//
// PASS RULE (PASS iff ALL; not softened after a run):
//  (G) POWER  gold subject-object pairs in the sample >= MIN_GOLD_PAIRS = 30 (PROVISIONAL bare integer,
//      P4). Fewer: pass = null with typed gap `underpowered`; numbers still reported.
//  (N) the real arm emitted >= 1 edge and F1 > 0. An arm that emits nothing FAILS.
//  (C) for EACH LICENSED control c in {noear, shuffled_gold, crossed_edges, random_adjacent, random_pair}:
//      the lower alpha-quantile (alpha = KEY_ALPHA = 0.05, one-sided; the repo's own standing alpha) of the
//      PAIRED BOOTSTRAP distribution of F1_real - F1_c is > 0. The bootstrap resamples SENTENCES (B = 1000,
//      seed 1, the same draw for both arms; randomised controls enter as their per-sentence expectations).
//  (L) LICENCE (II.23): the controls built to fail must fail. shuffled_gold recall <= 1/2 real recall AND
//      crossed_edges recall <= 1/2 real recall (1/2: the least movement that is a movement; PROVISIONAL).
//      A control that does as well as the real arm means the instrument or the mechanism is broken: pass =
//      false with the note, never a pass.
//  A control is LICENSED iff its per-sentence counts differ from the real arm's in >= 1 sentence (the
//  statistic moved under the perturbation); an unlicensed control is dropped from (C) and typed as a gap
//  `control_unlicensed:<name>`. The spec named two controls (no-ear, shuffled-sentence): `details.passSpec`
//  is (G)(N)(L) with (C) restricted to {noear, shuffled_gold, crossed_edges}; random_adjacent and
//  random_pair are STRICTER additions, and `pass` uses all five.
//  score = F1 of the real arm (primary: lowercased input, production, batch/lookahead); control = max F1 over
//  the LICENSED controls in (C) (all controls when none is licensed); margin = score - control.
//  Typed gaps: language_unheard (no received grammar: a gap, never another language's), no_gold, unmeasured,
//  underpowered, ear_inert (stem ear has neither segmenter nor peel: the ear arm differs from noear only
//  through the heard-nominal tier), surface_tier_heard_other_language (the production surface tier
//  auto-detects its language, the relation leg is declared: they disagree), edges_unmapped (an edge span
//  that lands in no sampled sentence), no_roleconfig, control_unlicensed:<name>.
//
// PREDICTIONS (written before the run, reported as failed when they fail):
//  P1 LEVEL. In every stem the production path's recall of gold subject-object pairs is < 0.25 and its
//     STRICT precision < 0.35: the reader finds beings that co-occur, it does not find who-did-what-to-whom.
//  P2 LICENCE. In every stem with >= 5 real edges, shuffled_gold and crossed_edges recall <= 1/2 the real
//     recall (clause L holds): the matcher is sentence-specific.
//  P3 EAR. cmn-hans: the real arm beats noear significantly (unspaced, uncased script: no capital tier, and
//     no figure without segmentation). eng, spa, rus on lowercased input: noear is blind (no capitals), so
//     the real arm beats it trivially; on ORIGINAL-case input the real arm does NOT beat noear
//     significantly in eng/spa (their ear is a no-op segmenter; the heard tier adds little over capitals).
//     arb: uncertain (peel only changes surface forms). kor: few edges (observed 20 / 60 sentences),
//     expected `underpowered` or FAIL.
//  P4 RUNG. At most 2 of the 6 smoke stems PASS the full rule (C): random_pair and random_adjacent are
//     expected to be hard to beat with noisy adjacency edges. The pre-registered expectation is a rung that
//     mostly FAILS; a pass anywhere is the surprise.
//  P5 GFP. The causal GFP arm has F1 below the production arm's in every stem (its figure set needs
//     recurrence in a 200-sentence prefix, and a 2-mention figure is rare early).
//  P6 ROLECONFIG. The positional SVO reader emits an edge in < 30% of sentences (it refuses most as
//     ambiguous_verb / no_verb) and its recall is < 0.10.
// SPLIT DISCIPLINE: DEV only while developing; the card is computed once on TEST, by the aggregator, never
// here. The header digest (lib.headerDigest) is stamped into every card so a post-hoc edit is visible.
//
// KNOWN LIMITS (said before they are found): (a) the production path loads the ENGLISH pos prior, verb
// vocabulary and morphology for every language (reader-bundle.js loadPriors): only the ear, the heard
// surface tier and the declared language are language-specific, so a failure in a non-English stem is
// partly "English priors applied to X", not only "X unheard". (b) The surface tier of the production path
// auto-detects its own language rather than reading the declared one. (c) Gold covers overt subject-object
// pairs only: pro-drop subjects, passives (nsubj:pass has no obj), copulas and intransitives are not in
// recall's denominator, but their edges DO count against precision unless both ends are nominal heads of
// the sentence. (d) The 1/2 and the substring floors are provisional. (e) Sentence mapping of production edges is
// by span offsets into the joined text; unmapped spans are counted as a gap, not dropped silently.
// ═══ POST-HOC ADDENDUM (written AFTER the first DEV run of eng cmn-hans arb kor spa rus; the PASS RULE above is UNCHANGED) ═══
// The pre-registered header's own digest, as stamped into every card of that first run:
//   9ef34eb1c69fa1bceea340f4bc363e05dfec56af1373c0c887400262c01b75cf
// What the first run showed (so the addendum cannot pretend not to know): the spec's precision counts an edge whose two ends
// are ANY two nominal heads of the sentence, and the production reader's figures are nominal by construction, so its lenient
// precision is ~0.7-0.9 in every stem while its recall of gold subject-object pairs is <= 0.041 and its STRICT precision
// <= 0.044. The rule as registered therefore asks "does the reader place edges between nouns of the sentence better than
// random tokens?", which is R3-shaped, not "does it find the claim". Only cmn-hans passed; arb failed random_adjacent only.
// POST-HOC DIAGNOSTIC (added; NOT in the rule, never changes `pass`): details.*.diagnostics reports, for the same arm, the
// STRICT F1 (precision = edges hitting a gold pair, no both-nominal credit) against every control AND against
// `random_nominal_pair` — same edge count per sentence, each edge between two random distinct NOMINAL HEADS (gold UPOS
// NOUN/PROPN/PRON, an ORACLE chance level: a system that merely finds nouns scores here). Paired bootstrap, same B/seed/alpha,
// lower alpha-quantile > 0 = "beats". A pass of the rule with a diagnostic that is NOT beaten means the pass is noun-finding.
// ═══ AMENDMENT v2, dated 2026-10-06 (FOLD-CONSTITUTION II.5): written BEFORE the first v2 run. The v1 rule above is NOT edited and ═══
// ═══ NOT hidden: its verdict is kept as `passLenient` / `passSpec` (informational). The v2 rule below is the card's `pass`.       ═══
// WHY THE RULE ITSELF IS CHANGED (a reviewer's six findings, each checked by me against the stored v1 DEV cards and the code; this
// is a change of what the verdict is ABOUT, not a tuning of a threshold against a number):
//  (1) BLOCKER. The v1 rule cannot fail a noun-finder. Its precision credits an edge whose ends hold two different nominal heads, and
//      the production reader's figures are nominal by construction, so lenient precision is ~0.9 whatever the edges say. A mutant
//      with NO claim structure (two edges per sentence between random distinct ORACLE nominal heads, scratch review/mut.mjs, DEV)
//      scored recall 0.036-0.093, lenient P 1.0, strict P 0.02, and PASSED v1 in cmn-hans, eng and spa. The one v1 pass (cmn-hans)
//      was therefore a finding about nouns (R3-shaped), not about claims. random_nominal_pair, the control matched to that, was
//      only a post-hoc diagnostic. Both are repaired below: the gating metric is STRICT and the nominal-pair control GATES.
//  (2) MAJOR. v1 had no power on the claim statistic: it gated gold PAIRS (the denominator), not real HITS (cmn-hans passed on 8
//      hits of 196, eng ~2 of 149), and its licence clause (control recall <= 1/2 real recall) held vacuously, 0 <= 0.5 x 0.04.
//  (3) MAJOR. v1's noear control was a degenerate zero-edge strawman (capital-only surfaces on lowercased input emit nothing, so
//      "beats noear" carried no information) and it bundled the heard-nominal TIER with the EAR, so nothing could be attributed.
//  (4) MAJOR. v1's verdict came from the LOOKAHEAD (batch) read, and the production surface tier (language-context.js
//      extractSurfacesHeard) re-detects its language from each call's text instead of reading the declared one.
//  (5) MAJOR. The production path loads ENGLISH priors for every language (reader-bundle.js loadPriors: pos-eng, UniMorph-eng, English
//      verb forms; makeEngineRelationReader: English determiners, negation words, first-person set, pronoun resolver), so a failure
//      in kor or arb was being read as "R4 of language X" when it is "the English relation vocabulary run over X". Greenberg-adjacent.
// DISCLOSURE (what I had seen before this block was written; no v2 gold was scored): the six stored v1 DEV cards (eng cmn-hans arb kor
// spa rus), the reviewer's mutation script and its printed numbers, a CPU profile of the v1 production read (the 548 s eng / 921 s kor
// batch reads are dominated by per-call language auto-detection in extractSurfacesHeard: STEM_SCRIPT and priorIsUnspaced; with the
// DECLARED language passed to the tier the same reads take ~1 s, edge counts printed, no gold read), and a 40-sentence-per-stem
// probe that auto-detected each DEV sentence alone: it disagreed with the declared stem on 3/40 eng and 1/40 cmn-hans sentences
// (0/40 arb kor spa). Nothing below was chosen from a v2 number; the v2 predictions say what I expect knowing the above.
//
// V2 GATING ARM "A" (the real arm): the PRODUCTION relation path engineRelationsFor (GFP mode, roleConfig off), DECLARED language,
//   the heard-nominal tier handed the DECLARED language (a drop-in for extractSurfacesHeard that cannot hear another language, passed
//   through the reader's own `extractSurfaces` seam), LOWERCASED text, one passage per sentence, read STRICTLY CAUSALLY: sentence k
//   is read from a FRESH reader fed sentences 0..k only (GATE_BLOCK = 1; v1's default block was 40), and only the edges that map to
//   sentence k are credited. No later sentence is ever in view. (The lookahead batch read is kept as details.lookahead, labelled.)
// V2 METRIC: STRICT. An edge counts only if it HITS a gold subject-object pair (the v1 matcher, unchanged, directed). strict
//   precision = edges that hit / all edges; recall = gold pairs hit / gold pairs; F1 = their harmonic mean (0 when no edge).
//   `score` = A's strict F1; `control` = the strongest strict F1 among the LICENSED, NON-DEGENERATE gating controls; margin = score-control.
// V2 GATING CONTROLS (each takes A's per-sentence edge counts; each built to fail):
//   shuffled_gold, crossed_edges, random_adjacent, random_pair   as v1, scored strictly;
//   random_nominal_pair   NEW, GATES. Same count per sentence, each edge between two random distinct ORACLE nominal heads (gold UPOS
//                         NOUN/PROPN/PRON) of the sentence: the chance level of a system that merely finds nouns;
//   ear_off_tier_on       NEW, GATES. The SAME reader, priors and heard-nominal tier, the ear OFF (identity segment/peel, read outside
//                         withEar, same declared language): the only deafened arm that is not a strawman. If the stem's ear is inert
//                         (no segmenter, no peel: withEar maps it to no ear) the arm is identical to A by construction and is
//                         typed `ear_inert` + `control_unlicensed:ear_off_tier_on`, not counted as beaten.
//   INFORMATIONAL (reported, never gating): tier_off_ear_on (ear on, capital-only surfaces), noear (both off: v1's control, kept so
//   v1 stays reproducible), details.ablation (the 2x2 ear x tier table: edges, hits, strict F1).
//   A control is LICENSED iff its per-sentence statistics differ from A's in >= 1 sentence; it is DEGENERATE iff it emitted 0 edges
//   while A emitted some (typed gap `control_degenerate:<name>`: a zero is not a beaten control). Unlicensed and degenerate controls
//   leave the gate and are typed; they are never counted as beaten.
// V2 PASS RULE (PASS iff ALL; evaluated on A; pass = null when a precondition cannot be met; never softened after a run):
//   (G1) POWER on the denominator: gold subject-object pairs >= MIN_GOLD_PAIRS (30, unchanged). Else null, gap `underpowered`.
//   (N)  A emitted >= 1 edge. An arm that says nothing FAILS (pass false).
//   (G2) POWER on the NUMERATOR: A's gold-pair HITS H >= HITS_NEEDED = max(c_alpha, ceil(1/LICENCE_RATIO)). c_alpha is DERIVED from
//        the material, not a bare integer: the null is A's own edges scored against the gold of a Sattolo derangement of the
//        sample (NULL_DRAWS = 199 seeded draws, so the permutation p-floor 1/200 is below alpha); c_alpha = the least c with
//        (1 + #{null draws with hits >= c}) / (NULL_DRAWS + 1) <= KEY_ALPHA (0.05). ceil(1/LICENCE_RATIO) = 2: below two hits "at
//        most half" cannot be told from "none". H < HITS_NEEDED: pass = null, typed gap `underpowered_hits {count: H, needed}`: the
//        sample cannot tell A from a deranged-pairing system; the claim is NOT shown (card `claimShown:false`); null is never "good".
//   (V)  NOUN-FINDING GUARD: random_nominal_pair must exist (some sentence has >= 2 gold nominal heads) and be licensed; else
//        null, gap `control_unmeasured:random_nominal_pair`: no verdict about claims without the noun-finding chance level.
//   (C2) for EACH gating control that is licensed and non-degenerate: the lower alpha-quantile (0.05, one-sided) of the PAIRED
//        BOOTSTRAP (sentences, B = 1000, seed 1, same draw for both arms) of strictF1(A) - strictF1(control) is > 0.
//   (L2) LICENCE by HITS (II.23), integers reported: the mean hits of shuffled_gold <= LICENCE_RATIO x H and the mean hits of
//        crossed_edges <= LICENCE_RATIO x H. With (G2) the licence can no longer hold only because recall is ~0.
//   (S)  The gating tier heard the DECLARED language in every call (probe: calls whose language differs = 0). Else null, gap
//        `surface_tier_heard_other_language`. The AS-SHIPPED production tier's disagreement (it re-detects per call) is measured
//        per sentence on the first AUTODETECT_BUDGET = 40 DEV sentences (compute budget) and typed with its denominator as the
//        informational gap `surface_tier_autodetect_disagrees {count, of}`: a defect of the production wiring, which the main
//        agent owns and this instrument does not paper over.
//   `passLenient` = the v1 rule applied to the same arm (noear = v1's strawman), informational. When passLenient is true while A
//   does not beat random_nominal_pair, the typed gap `pass_is_noun_finding` says the v1 pass was a finding about nouns.
//   pass = null with gap `lookahead_only` if the causal arm cannot be computed (the lookahead verdict is then shown, not gating).
// V2 TYPING OF THE ENGLISH PRIORS: every non-English stem carries the gap `english_priors_applied` (the gating arm is the English
//   relation vocabulary run over the stem: posPrior, verb forms, lemmatizer, determiners, negation words, first-person set, pronoun
//   resolver). Informational arm details.ownPriors reads the same sentences causally with the STEM'S OWN POS prior (verb forms derived
//   from it at the reader's own GRAMMAR_MIN_SHARE) and the English-only closed classes EMPTIED, not replaced (received closed-class
//   lists exist only for English): it answers "English priors, or the language?". It never gates.
// V2 PREDICTIONS (written before the first v2 run; reported as failed when they fail):
//  V1. No smoke stem (eng cmn-hans arb kor spa) PASSES v2: each either does not beat random_nominal_pair on strict F1, or has fewer
//      than HITS_NEEDED hits (pass null). A v2 pass anywhere is the surprise and is to be distrusted until re-run on TEST.
//  V2. The reviewer's mutant (2 edges per sentence between random distinct oracle nominal heads, no claims) does NOT pass v2: pass is
//      not true on eng, cmn-hans, spa DEV, and on a synthetic corpus in tests/competence-r4.test.js.
//  V3. eng and spa: ear_inert, ear_off_tier_on identical to A. cmn-hans: ear_off_tier_on emits fewer edges than A (no segmentation, no
//      figure). arb and kor: the ear changes the edge multiset of at least one sentence.
//  V4. Strictly causal edges <= lookahead edges in every stem (a fresh prefix has fewer recurring figures); causal hits <= lookahead
//      hits in at least 4 of the 5 stems.
//  V5. The English priors are not inert: in every non-English smoke stem the ownPriors arm's per-sentence edges differ from A's.
//  V6. tier_off_ear_on is DEGENERATE (0 edges) in all five smoke stems on lowercased input (capital-only surfaces are blind there):
//      the v1 noear control was a strawman everywhere, and the 2x2 ablation table shows the tier, not the ear, makes every edge.
// V2 KNOWN LIMITS: (a) block-1 reading credits a sentence only with what the reader says when that sentence is the LAST in view: a
//   claim the reader would only make once a figure has recurred is withheld until the recurrence. That is the price of causality and is
//   intended; the lookahead card shows what the batch read says. (b) ownPriors empties rather than replaces the English closed
//   classes. (c) c_alpha is a permutation null on A's own edge counts (hits are integers and the null is discrete: the realised
//   test level is <= alpha, not = alpha). (d) The strict matcher keeps v1's SUBSTRING_MIN leniency (priced by the controls).
// V2 DIGESTS: every card stamps details.headerDigests {full, original, amendmentV2}. `original` is the sha256 of the v1 block (lines
//   up to the POST-HOC ADDENDUM) and must equal the digest the addendum stamped; the test suite pins both so a post-hoc edit of the
//   pre-registration or of this amendment is visible.
// ═══ POST-RUN ADDENDUM to AMENDMENT v2, dated 2026-10-06: written AFTER the first v2 DEV run (eng cmn-hans arb kor spa, N = 200, block 1) ═══
// ═══ and BEFORE any further run. The v2 PASS RULE, its controls and its constants are UNCHANGED (the amendment's digest is pinned).     ═══
// FIRST v2 DEV RESULTS (so the addendum cannot pretend not to know them): eng pass null, underpowered_hits (1 hit of 149 gold pairs, 2
//   needed; strict F1 0.0102 vs random_nominal_pair 0.0108). cmn-hans pass FALSE, fail:random_nominal_pair (6 hits of 196; strict F1
//   0.0249 vs 0.0163, lower bound -0.005; passLenient TRUE, so `pass_is_noun_finding` is typed: v1's one PASS was a finding about nouns).
//   arb pass null (0 hits of 121), kor pass null (0 hits of 37), spa pass null (0 hits of 118): all `underpowered_hits`.
// PREDICTIONS, scored: V1 HELD (no stem passes). V2 HELD (the reviewer's mutant: v1 PASS, v2 pass false, in all five stems, scratch run
//   on DEV gold). V3 HELD (eng spa: ear_inert, ear-off identical; cmn-hans: ear-off 2 edges vs 285 for the ear; arb 342 vs 412; kor 23 vs
//   42). V4 HELD (causal edges 47 285 412 42 19 <= lookahead edges 80 387 645 67 45; causal hits <= lookahead hits in 5 of 5). V6 HELD
//   (tier_off_ear_on and noear emit 0 edges in all five). V5 FALSIFIED: the ownPriors arm's per-sentence edges are IDENTICAL to the
//   English-priors arm's in all four non-English stems (0 of 200 sentences differ). Reported as a failed prediction.
// WHAT V5 MEANS, AND THE ONE ADDITION. A control that does not move is either a broken instrument or an inert mechanism (II.23). A scratch
//   perturbation licence (not scored, 120 DEV sentences of cmn-hans, eng, kor, lookahead read) removed EVERY English-only seam (posPriorFor,
//   verb forms, lemmatizer, determiners, negation words, first-person set, pronoun resolver) and, separately, installed a junk prior: the
//   edge set did not change in any of them. The seams are inert for the EDGES of the dispatch (GFP) path: organs/hypergraph.js says its
//   posPrior "never filters" and dispatch mode hands vocabulary discovery to GFP's own rule. So the instrument is not broken, and the
//   English priors are not what limits R4 in kor, arb, cmn-hans, spa: the limit is the language-agnostic GFP extractor and the figure tier.
//   ADDED (informational, never in `pass`): measure() reports details.englishPriorsLicence for every non-English stem (the lookahead read
//   with every English-only seam removed, sentences changed / sentences) and the typed gap `english_priors_inert_for_edges` when that
//   perturbation changes no sentence. `english_priors_applied` stays (the English priors ARE loaded and disclosed).
// OTHER FACTS FROM THE RUN: the declared-language LOOKAHEAD arm reproduces v1's as-shipped edge counts exactly (80 387 645 67 45), so the
//   tier fix cost nothing and the strictly causal arm is the only change in what is measured; the gating tier heard the declared language
//   in every call (18k calls per stem, 0 other); the as-shipped tier's per-sentence auto-detection disagreed on 3/40 eng and 1/40 cmn-hans
//   DEV sentences. The card's licence.ok is null (not false) when real hits are 0 (unevaluable): labelling only, no verdict changes.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { KEY_ALPHA, conlluPath, readConllu, mulberry32, derangement, parseArgs, writeResult, headerDigest } from "./lib.mjs";

export const RUNG = { id: "r4", name: "find claims", question: "who did what to whom?" };

// ── declared constants ──────────────────────────────────────────────────────
export const DEFAULT_LIMIT = 200;              // compute budget (sentences), not a threshold
export const MIN_GOLD_PAIRS = 30;              // PROVISIONAL bare integer (P4)
export const SUBSTRING_MIN = Object.freeze({ alphabetic: 3, ideographic: 2 }); // PROVISIONAL (P4)
export const DRAWS = 20;                       // seeded draws per randomised control
export const BOOT_B = 1000;
export const BOOT_SEED = 1;
export const LICENCE_RATIO = 0.5;              // PROVISIONAL: shuffled/crossed recall must be <= this x real recall
export const GFP_MIN_REC = 2;                  // relations-gfp.js's own default minRec
export const CAUSAL_BLOCK = 40;
export const CONTROLS_IN_RULE = Object.freeze(["noear", "shuffled_gold", "crossed_edges", "random_adjacent", "random_pair"]);
export const CONTROLS_IN_SPEC = Object.freeze(["noear", "shuffled_gold", "crossed_edges"]);
// ── v2 (header: AMENDMENT v2) ──
export const GATE_BLOCK = 1;                   // v2 gating arm: strictly causal (sentence k read from sentences 0..k only)
export const NULL_DRAWS = 199;                 // derangement-null draws: permutation p-floor 1/200 < KEY_ALPHA (a compute budget)
export const AUTODETECT_BUDGET = 40;           // sentences probed for the as-shipped tier's auto-detection (a compute budget)
export const GATING_CONTROLS_V2 = Object.freeze(["shuffled_gold", "crossed_edges", "random_adjacent", "random_pair", "random_nominal_pair", "ear_off_tier_on"]);
export const INFORMATIONAL_CONTROLS_V2 = Object.freeze(["tier_off_ear_on", "noear"]);
const SUBJ = new Set(["nsubj", "csubj"]);
const OBJ = new Set(["obj", "iobj"]);
const NOMINAL_UPOS = new Set(["NOUN", "PROPN", "PRON"]);
const PURE_NOMINAL_UPOS = new Set(["NOUN", "PROPN"]);
const IDEOGRAPHIC = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const SEP = /[^\p{L}\p{M}\p{N}]+/u;
const SEP_G = /[^\p{L}\p{M}\p{N}]+/gu;
const HEARD_WORD = /[\p{L}\p{M}\p{N}]+/gu;
const GFP_WORD = /[\p{L}\p{N}]+/gu;            // relations-gfp.js's own WORD (its figure counts must be replicated exactly)
const FUNCTION_CLASSES = new Set(["ADP", "CCONJ", "SCONJ", "DET", "PRON", "AUX", "PART", "INTJ", "NUM", "PUNCT", "SYM", "X"]); // relations-gfp.js's own

// ── normalisation and the matcher ───────────────────────────────────────────
const normMemo = new Map();
/** NFC, lowercase, Latin combining marks / Arabic harakat+tatweel / Hebrew niqqud removed. The SAME for gold and system. */
export function norm(s) {
  const k = String(s ?? "");
  let v = normMemo.get(k);
  if (v === undefined) {
    v = k.normalize("NFD").replace(/[̀-ًͯ-ٰٟـ֑-ׇ]/g, "").normalize("NFC").toLowerCase();
    if (normMemo.size > 50000) normMemo.clear();
    normMemo.set(k, v);
  }
  return v;
}

/** An end string prepared for matching: tokens (cut at every non-letter/mark/number) and squash (separators deleted). */
export function prep(end) {
  const e = norm(end);
  return { tokens: e.split(SEP).filter(Boolean), squash: e.replace(SEP_G, "") };
}

/** A gold key prepared: its normalised squash, whether it is ideographic, whether it was several tokens. */
export function keyInfo(key) {
  const e = norm(key);
  const tokens = e.split(SEP).filter(Boolean);
  const squash = tokens.join("");
  return { squash, ideographic: IDEOGRAPHIC.test(squash), multi: tokens.length > 1, length: [...squash].length };
}

/** "end CONTAINS key" — the matcher, as pre-registered in the header. `p` = prep(end); `key` = a raw key or a keyInfo. */
export function containsKey(p, key) {
  const k = typeof key === "string" ? keyInfo(key) : key;
  if (!k.squash) return false;
  if (k.ideographic) return k.length >= SUBSTRING_MIN.ideographic ? p.squash.includes(k.squash) : p.tokens.includes(k.squash);
  if (k.multi) return p.squash.includes(k.squash);
  for (const t of p.tokens) if (t === k.squash || (k.length >= SUBSTRING_MIN.alphabetic && t.includes(k.squash))) return true;
  return false;
}
const anyKey = (p, keys) => keys.some((k) => containsKey(p, k));

// ── gold ────────────────────────────────────────────────────────────────────
const baseRel = (d) => String(d ?? "").split(":")[0];

/** The nominal stem where the treebank itself annotates the bound-morpheme split (lemma and xpos both carry "+"), else null. */
export function boundStem(tok) {
  const lem = String(tok.lemma ?? ""), x = String(tok.xpos ?? "");
  if (!lem.includes("+") || !x.includes("+")) return null;
  const parts = lem.split("+").map((p) => p.replace(/\/[A-Za-z]+$/, "")), tags = x.split("+");
  if (parts.length !== tags.length) return null;
  let stem = "";
  for (let i = 0; i < parts.length; i++) { if (/^(J|E|VCP)/.test(tags[i])) break; stem += parts[i]; }
  return stem && norm(tok.form).startsWith(norm(stem)) ? stem : null;
}

/** The KEYS of a gold word (forms the system may legitimately have written for it), as keyInfos with their raw spelling. */
export function keysOf(tok, ranges = []) {
  const raw = new Set();
  const add = (x) => { const n = norm(x); if (n && n !== "_") raw.add(n); };
  add(tok.form);
  const lem = String(tok.lemma ?? "");
  if (lem && lem !== "_") {
    if (lem.includes("+")) {
      const st = boundStem(tok);
      if (st) add(st);
      add(lem.split("+")[0].replace(/\/[A-Za-z]+$/, ""));
    } else add(lem);
  }
  for (const r of ranges) if (tok.id >= r.from && tok.id <= r.to) add(r.form);
  return [...raw].map(keyInfo).filter((k) => k.squash);
}

/** The sentence text: the `# text =` line, else rebuilt from the tokens (counted by the caller). */
export function sentenceText(s) {
  if (s.text && String(s.text).trim()) return { text: String(s.text).trim(), rebuilt: false };
  const skip = new Set(); const at = new Map();
  for (const r of s.ranges ?? []) { at.set(r.from, r); for (let i = r.from; i <= r.to; i++) skip.add(i); }
  let out = "";
  for (const t of s.tokens) {
    const r = at.get(t.id);
    if (r) out += r.form + (r.spaceAfter ? " " : "");
    else if (!skip.has(t.id)) out += t.form + (t.spaceAfter ? " " : "");
  }
  return { text: out.trim(), rebuilt: true };
}

/**
 * goldOfSentence(s) → { pairs: [{sId,oId,vId, s:{keys,upos}, o:{keys,upos}, v:{keys}, pure}], nominals: [{id, keys, upos}], nSubjects, nObjects }
 * Pure treebank: HEAD/DEPREL/UPOS only.
 */
export function goldOfSentence(s) {
  const byId = new Map(s.tokens.map((t) => [t.id, t]));
  const kids = new Map();
  for (const t of s.tokens) { const h = Number(t.head); if (Number.isFinite(h)) { if (!kids.has(h)) kids.set(h, []); kids.get(h).push(t); } }
  const expand = (t) => {
    const out = [t], seen = new Set([t.id]), stack = [t];
    while (stack.length) for (const c of kids.get(stack.pop().id) ?? []) if (baseRel(c.deprel) === "conj" && !seen.has(c.id)) { seen.add(c.id); out.push(c); stack.push(c); }
    return out;
  };
  const node = (t) => ({ id: t.id, upos: t.upos, keys: keysOf(t, s.ranges) });
  const preds = new Map();
  const slot = (h) => { if (!preds.has(h)) preds.set(h, { subj: [], obj: [] }); return preds.get(h); };
  for (const t of s.tokens) {
    const b = baseRel(t.deprel), h = Number(t.head);
    if (!byId.has(h)) continue;
    if (SUBJ.has(b)) slot(h).subj.push(...expand(t));
    else if (OBJ.has(b)) slot(h).obj.push(...expand(t));
  }
  const pairs = [], seen = new Set();
  let nSubjects = 0, nObjects = 0;
  for (const [h, { subj, obj }] of preds) {
    nSubjects += subj.length; nObjects += obj.length;
    if (!subj.length || !obj.length) continue;
    const v = byId.get(h), vn = { keys: keysOf(v, s.ranges) };
    for (const a of subj) for (const o of obj) {
      if (a.id === o.id) continue;
      const k = `${a.id}|${o.id}|${h}`;
      if (seen.has(k)) continue;
      seen.add(k);
      pairs.push({ sId: a.id, oId: o.id, vId: h, s: node(a), o: node(o), v: vn, pure: PURE_NOMINAL_UPOS.has(a.upos) && PURE_NOMINAL_UPOS.has(o.upos) });
    }
  }
  const nominals = s.tokens.filter((t) => NOMINAL_UPOS.has(t.upos)).map((t) => ({ id: t.id, upos: t.upos, keys: keysOf(t, s.ranges) }));
  return { pairs, nominals, nSubjects, nObjects };
}

// ── scoring one sentence ────────────────────────────────────────────────────
/**
 * scoreSentence(gold, edges) → { g, h, e, m, ms, ht, hu, gN, hN }
 *   g gold pairs, h pairs hit (directed), e edges, m edges counted by the spec's precision (hit a gold pair OR both
 *   ends contain two different nominal heads), ms edges that hit a gold pair (strict), ht pairs hit as TRIPLE
 *   (label contains the verb), hu pairs hit in EITHER orientation, gN pairs whose two heads are NOUN/PROPN, hN of them hit.
 */
export function scoreSentence(gold, edges) {
  const out = { g: gold.pairs.length, h: 0, e: edges.length, m: 0, ms: 0, ht: 0, hu: 0, gN: gold.pairs.filter((p) => p.pure).length, hN: 0 };
  if (!edges.length) return out;
  const hit = new Set(), hitT = new Set(), hitU = new Set();
  for (const ed of edges) {
    const e1 = prep(ed.end1), e2 = prep(ed.end2), lab = prep(ed.label ?? "");
    let strict = false;
    gold.pairs.forEach((p, k) => {
      if (anyKey(e1, p.s.keys) && anyKey(e2, p.o.keys)) {
        hit.add(k); hitU.add(k); strict = true;
        if (anyKey(lab, p.v.keys)) hitT.add(k);
      } else if (anyKey(e2, p.s.keys) && anyKey(e1, p.o.keys)) hitU.add(k);
    });
    let counted = strict;
    if (!counted && gold.nominals.length > 1) {
      const m1 = gold.nominals.filter((n) => anyKey(e1, n.keys));
      if (m1.length) {
        const m2 = gold.nominals.filter((n) => anyKey(e2, n.keys));
        counted = m1.some((a) => m2.some((b) => b.id !== a.id));
      }
    }
    if (strict) out.ms++;
    if (counted) out.m++;
  }
  out.h = hit.size; out.ht = hitT.size; out.hu = hitU.size;
  out.hN = [...hit].filter((k) => gold.pairs[k].pure).length;
  return out;
}

// ── aggregation, bootstrap ──────────────────────────────────────────────────
const KEYS = ["g", "h", "e", "m", "ms", "ht", "hu", "gN", "hN"];
const zeroCols = (n) => Object.fromEntries(KEYS.map((k) => [k, new Float64Array(n)]));
/** per-sentence stat objects → columns */
export function toCols(stats) {
  const c = zeroCols(stats.length);
  stats.forEach((s, i) => { for (const k of KEYS) c[k][i] = s[k]; });
  return c;
}
const sumOf = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
const f1Of = (G, H, E, M) => { const R = G ? H / G : 0, P = E ? M / E : 0; return R + P ? (2 * R * P) / (R + P) : 0; };
/** totals → { recall, precision, f1, ... } from columns */
export function summaryOf(c) {
  const t = Object.fromEntries(KEYS.map((k) => [k, sumOf(c[k])]));
  return {
    pairs: t.g, hits: t.h, edges: t.e, counted: t.m,
    recall: t.g ? t.h / t.g : 0, precision: t.e ? t.m / t.e : 0, strictPrecision: t.e ? t.ms / t.e : 0,
    f1: f1Of(t.g, t.h, t.e, t.m), f1Strict: f1Of(t.g, t.h, t.e, t.ms),
    tripleRecall: t.g ? t.ht / t.g : 0, undirectedRecall: t.g ? t.hu / t.g : 0, nominalRecall: t.gN ? t.hN / t.gN : null,
  };
}

/** Paired bootstrap over SENTENCES of F1(a) - F1(b): { observed, lower, p, mean, B, alpha }. `lower` is the alpha-quantile. */
export function bootstrapDiff(a, b, { B = BOOT_B, seed = BOOT_SEED, alpha = KEY_ALPHA } = {}) {
  const n = a.g.length;
  const observed = f1Of(sumOf(a.g), sumOf(a.h), sumOf(a.e), sumOf(a.m)) - f1Of(sumOf(b.g), sumOf(b.h), sumOf(b.e), sumOf(b.m));
  if (!n) return { observed, lower: observed, p: 1, mean: observed, B: 0, alpha };
  const rng = mulberry32(seed), d = new Float64Array(B);
  for (let r = 0; r < B; r++) {
    let ag = 0, ah = 0, ae = 0, am = 0, bg = 0, bh = 0, be = 0, bm = 0;
    for (let t = 0; t < n; t++) {
      const i = Math.floor(rng() * n);
      ag += a.g[i]; ah += a.h[i]; ae += a.e[i]; am += a.m[i];
      bg += b.g[i]; bh += b.h[i]; be += b.e[i]; bm += b.m[i];
    }
    d[r] = f1Of(ag, ah, ae, am) - f1Of(bg, bh, be, bm);
  }
  const sorted = Float64Array.from(d).sort();
  let le0 = 0, sum = 0;
  for (const x of d) { if (x <= 0) le0++; sum += x; }
  return { observed, lower: sorted[Math.min(B - 1, Math.floor(alpha * B))], p: (le0 + 1) / (B + 1), mean: sum / B, B, alpha };
}

/** True iff the control's per-sentence counts differ from the real arm's in >= 1 sentence (the statistic moved). */
export function moves(real, ctrl) {
  for (const k of ["g", "h", "e", "m"]) for (let i = 0; i < real[k].length; i++) if (Math.abs(real[k][i] - ctrl[k][i]) > 1e-9) return true;
  return false;
}

// ── the controls built to fail ──────────────────────────────────────────────
function sampleK(rng, N, k) {
  const idx = Array.from({ length: N }, (_, i) => i);
  const take = Math.min(k, N);
  for (let i = 0; i < take; i++) { const j = i + Math.floor(rng() * (N - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, take);
}
function randomEdges(rng, toks, k, kind) {
  const T = toks.length;
  if (T < 2 || k <= 0) return [];
  if (kind === "adjacent") return sampleK(rng, T - 1, k).map((j) => ({ end1: toks[j], label: "", end2: toks[j + 1] }));
  const total = (T * (T - 1)) / 2, want = Math.min(k, total), seen = new Set(), out = [];
  while (out.length < want) {
    const a = Math.floor(rng() * T), b = Math.floor(rng() * T);
    if (a === b) continue;
    const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * T + hi;
    if (seen.has(key)) continue;
    seen.add(key); out.push({ end1: toks[lo], label: "", end2: toks[hi] });
  }
  return out;
}
function meanCols(runs, n) {
  const c = zeroCols(n);
  for (const r of runs) for (const k of KEYS) for (let i = 0; i < n; i++) c[k][i] += r[k][i] / runs.length;
  return c;
}
/** random_adjacent / random_pair: per-sentence edge counts of the arm, edges drawn at random from the sentence's heard tokens. */
export function randomArm({ gold, toks, counts, kind, draws = DRAWS, seed = 101 }) {
  const n = gold.length, runs = [];
  for (let r = 0; r < draws; r++) {
    const rng = mulberry32(seed + r * 7919);
    runs.push(toCols(gold.map((g, i) => scoreSentence(g, randomEdges(rng, toks[i] ?? [], counts[i], kind)))));
  }
  return meanCols(runs, n);
}
/** shuffled_gold: the arm's edges of sentence i scored against the gold of pi(i), pi a derangement. null when n < 2. */
export function shuffledGoldArm({ gold, edges, draws = DRAWS, seed = 202 }) {
  const n = gold.length;
  if (n < 2) return null;
  const runs = [];
  for (let r = 0; r < draws; r++) {
    const pi = derangement(n, mulberry32(seed + r * 104729));
    runs.push(toCols(edges.map((es, i) => scoreSentence(gold[pi[i]], es))));
  }
  return meanCols(runs, n);
}
/** crossed_edges: every edge keeps end1/label and takes the end2 of a random edge of a DIFFERENT sentence. null when no other sentence has an edge. */
export function crossedEdgesArm({ gold, edges, draws = DRAWS, seed = 303 }) {
  const n = gold.length, pool = [];
  edges.forEach((es, i) => es.forEach((e) => pool.push({ i, end2: e.end2 })));
  if (!pool.length || !edges.some((es, i) => es.length && pool.some((p) => p.i !== i))) return null;
  const runs = [];
  for (let r = 0; r < draws; r++) {
    const rng = mulberry32(seed + r * 1299709);
    runs.push(toCols(edges.map((es, i) => {
      const other = pool.filter((p) => p.i !== i);
      return scoreSentence(gold[i], other.length ? es.map((e) => ({ end1: e.end1, label: e.label, end2: other[Math.floor(rng() * other.length)].end2 })) : []);
    })));
  }
  return meanCols(runs, n);
}

/** POST-HOC DIAGNOSTIC arm (not in the rule): per-sentence edge counts of the arm, each edge between two random DISTINCT gold nominal heads (reading order). An oracle chance level. */
export function nominalPairArm({ gold, counts, draws = DRAWS, seed = 404 }) {
  const n = gold.length, runs = [];
  const forms = gold.map((g) => g.nominals.map((x) => x.keys[0]?.squash ?? ""));
  for (let r = 0; r < draws; r++) {
    const rng = mulberry32(seed + r * 15485863);
    runs.push(toCols(gold.map((g, i) => scoreSentence(g, randomEdges(rng, forms[i], counts[i], "pair")))));
  }
  return meanCols(runs, n);
}

// ── one system, the whole rule ──────────────────────────────────────────────
/**
 * evaluateSystem({ edges, noear, gold, toks, ... }) → the pre-registered rule applied to ONE system.
 *   edges: per-sentence [{end1,label,end2}]; noear: the same system deafened (or null); gold: per-sentence goldOfSentence;
 *   toks: per-sentence heard tokens (the random controls' material).
 * `pass` is null (underpowered) below minGold gold pairs; otherwise true/false by (G)(N)(C)(L). `passSpec` = the spec's two controls only.
 */
export function evaluateSystem({ edges, noear = null, gold, toks, draws = DRAWS, B = BOOT_B, seed = BOOT_SEED, alpha = KEY_ALPHA, minGold = MIN_GOLD_PAIRS, withSpec = true }) {
  const n = gold.length;
  const realStats = edges.map((es, i) => scoreSentence(gold[i], es));
  const real = toCols(realStats);
  const counts = edges.map((es) => es.length);
  const arms = {};
  const gaps = [], notes = [];
  if (noear) arms.noear = toCols(noear.map((es, i) => scoreSentence(gold[i], es)));
  else gaps.push({ reason: "noear_absent", count: 1 });
  arms.random_adjacent = randomArm({ gold, toks, counts, kind: "adjacent", draws });
  arms.random_pair = randomArm({ gold, toks, counts, kind: "pair", draws });
  const sh = shuffledGoldArm({ gold, edges, draws }); if (sh) arms.shuffled_gold = sh; else gaps.push({ reason: "unmeasured", count: 1, detail: "shuffled_gold needs >= 2 sentences" });
  const cr = crossedEdgesArm({ gold, edges, draws }); if (cr) arms.crossed_edges = cr; else gaps.push({ reason: "unmeasured", count: 1, detail: "crossed_edges needs edges in >= 2 different sentences" });
  const s = summaryOf(real);
  const controls = {};
  for (const [name, cols] of Object.entries(arms)) {
    const sm = summaryOf(cols);
    const licensed = moves(real, cols);
    const boot = bootstrapDiff(real, cols, { B, seed, alpha });
    controls[name] = { f1: sm.f1, recall: sm.recall, precision: sm.precision, edges: sm.edges, licensed, boot, beats: licensed && boot.lower > 0 };
    if (!licensed) gaps.push({ reason: `control_unlicensed:${name}`, count: 1 });
  }
  // POST-HOC DIAGNOSTIC (header addendum): STRICT F1 against every control and the oracle nominal-pair chance level. Never enters `pass`.
  const strictCols = (c) => ({ ...c, m: c.ms });
  const nomArm = nominalPairArm({ gold, counts, draws });
  const diagArms = { ...arms, random_nominal_pair: nomArm };
  const diagnostics = { note: "POST-HOC, not in the pass rule: strict F1 (edges that hit a gold pair) vs every control and vs random_nominal_pair (oracle chance: any two nominal heads of the sentence)", f1Strict: s.f1Strict, recall: s.recall, controls: {} };
  for (const [name, cols] of Object.entries(diagArms)) {
    const sm = summaryOf(cols), b = bootstrapDiff(strictCols(real), strictCols(cols), { B, seed, alpha });
    diagnostics.controls[name] = { f1Strict: sm.f1Strict, recall: sm.recall, strictPrecision: sm.strictPrecision, diffLower: b.lower, diffObserved: b.observed, p: b.p, beats: b.lower > 0 };
  }
  diagnostics.beatsNominalPair = diagnostics.controls.random_nominal_pair.beats;
  diagnostics.beatsAllStrict = Object.values(diagnostics.controls).every((c) => c.beats);
  const inRule = CONTROLS_IN_RULE.filter((c) => controls[c]);
  const ruled = inRule.filter((c) => controls[c].licensed);
  const specRuled = CONTROLS_IN_SPEC.filter((c) => controls[c]?.licensed);
  // (L) licence: the controls built to fail must fail
  const ratio = (c) => (controls[c] && s.recall > 0 ? controls[c].recall / s.recall : null);
  const licence = {
    shuffledRatio: ratio("shuffled_gold"), crossedRatio: ratio("crossed_edges"), maxRatio: LICENCE_RATIO,
    ok: ["shuffled_gold", "crossed_edges"].every((c) => !controls[c] || (s.recall > 0 && controls[c].recall <= LICENCE_RATIO * s.recall)),
  };
  const powered = s.pairs >= minGold;
  const emitted = s.edges > 0 && s.f1 > 0;
  const allBeat = ruled.every((c) => controls[c].beats);
  const specBeat = specRuled.every((c) => controls[c].beats);
  const rule = (beat, ruledNames) => (!powered ? null : emitted && ruledNames.length > 0 && beat && licence.ok);
  if (!powered) gaps.push({ reason: "underpowered", count: s.pairs, detail: `gold pairs ${s.pairs} < ${minGold}` });
  if (powered && !emitted) notes.push("the real arm emitted no edge (or F1 = 0): an arm that says nothing fails");
  if (powered && emitted && !licence.ok) notes.push(`LICENCE FAILED: shuffled_gold/crossed_edges recall is not <= ${LICENCE_RATIO} x real recall — a control built to fail did as well; the matcher is too lenient or the arm is not sentence-specific (II.23)`);
  for (const c of ruled) if (powered && emitted && !controls[c].beats) notes.push(`does not beat ${c} (F1 ${s.f1.toFixed(3)} vs ${controls[c].f1.toFixed(3)}, lower ${controls[c].boot.lower.toFixed(3)})`);
  const strongest = (names) => names.reduce((m, c) => Math.max(m, controls[c].f1), -Infinity);
  const control = ruled.length ? strongest(ruled) : inRule.length ? strongest(inRule) : null;
  return {
    n, summary: s, controls, licence, powered, emitted,
    pass: rule(allBeat, ruled), passSpec: rule(specBeat, specRuled),
    control: Number.isFinite(control) ? control : null,
    ruled, gaps, notes, diagnostics, cols: { real, ...arms }, nominalPairCols: nomArm,
  };
}

// ═══ V2: the claim rule (header: AMENDMENT v2) ═══════════════════════════════
/** The digests of the leading pre-registration: {full, original (the v1 block), amendmentV2 (up to the post-run addendum), postRunAddendum}. */
export function headerDigests(file = fileURLToPath(import.meta.url)) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  const sha = (a) => createHash("sha256").update(a.join("\n").trim()).digest("hex");
  const at = (re) => lines.findIndex((l) => re.test(l));
  const iAdd = at(/^\/\/ ═══ POST-HOC ADDENDUM/), iAmend = at(/^\/\/ ═══ AMENDMENT v2/), iPost = at(/^\/\/ ═══ POST-RUN ADDENDUM/);
  return {
    full: sha(lines), original: sha(lines.slice(0, iAdd >= 0 ? iAdd : lines.length)),
    amendmentV2: iAmend >= 0 ? sha(lines.slice(iAmend, iPost > iAmend ? iPost : lines.length)) : null,
    postRunAddendum: iPost >= 0 ? sha(lines.slice(iPost)) : null,
  };
}

/** A copy of the columns whose precision numerator is the STRICT count (edges that hit a gold pair): the v2 metric. */
export const strictCols = (c) => ({ ...c, m: c.ms });

/** moves() over a chosen set of statistics (v2 adds the strict count `ms`). */
export function movesOn(real, ctrl, keys = ["g", "h", "e", "m", "ms"]) {
  for (const k of keys) for (let i = 0; i < real[k].length; i++) if (Math.abs(real[k][i] - ctrl[k][i]) > 1e-9) return true;
  return false;
}

/** The derangement null of the HIT COUNT: the arm's edges of sentence i scored against the gold of pi(i); one total per draw. null when n < 2. */
export function shuffledNullHits({ gold, edges, draws = NULL_DRAWS, seed = 505 }) {
  const n = gold.length;
  if (n < 2) return null;
  const out = new Float64Array(draws);
  for (let r = 0; r < draws; r++) {
    const pi = derangement(n, mulberry32(seed + r * 32452843));
    let h = 0;
    for (let i = 0; i < n; i++) if (edges[i]?.length) h += scoreSentence(gold[pi[i]], edges[i]).h;
    out[r] = h;
  }
  return out;
}

/**
 * criticalHits(nullHits, {alpha}) -> { c, kmax, R, alpha }: the least hit count c whose PERMUTATION p, (1 + #{null >= c}) / (R + 1),
 * is <= alpha. Derived from the null draws (not a bare integer). Fewer than 1/alpha - 1 draws cannot reach alpha: c = Infinity.
 */
export function criticalHits(nullHits, { alpha = KEY_ALPHA } = {}) {
  const R = nullHits.length;
  const kmax = Math.floor(alpha * (R + 1) + 1e-9) - 1;
  if (kmax < 0) return { c: Infinity, kmax, R, alpha };
  const desc = Float64Array.from(nullHits).sort().reverse();
  return { c: desc[Math.min(kmax, R - 1)] + 1, kmax, R, alpha };
}
/** The permutation p of an observed hit count against the null draws. */
export const permutationP = (H, nullHits) => { let ge = 0; for (const x of nullHits) if (x >= H) ge++; return (1 + ge) / (nullHits.length + 1); };

/**
 * evaluateClaims({ edges, earOff, earInert, tierOff, noear, gold, toks, tierHeardOther, ... }) -> the v2 rule on ONE arm.
 *   edges   the real arm A, per sentence [{end1,label,end2}]
 *   earOff  the same reader/tier with the ear off (null: absent -> typed gap); earInert: the stem's ear is inert -> earOff is A by construction
 *   tierOff ear on, capital-only surfaces (informational); noear both off (informational + the v1 rule's control)
 *   tierHeardOther  number of gating-tier calls that heard a language other than the declared one (rule S)
 * pass: true | false | null by (G1)(N)(G2)(V)(C2)(L2)(S); verdict names the reason; claimShown = pass === true.
 */
export function evaluateClaims({ edges, earOff = null, earInert = false, skipEarOff = false, tierOff = null, noear = null, gold, toks, draws = DRAWS, nullDraws = NULL_DRAWS, B = BOOT_B, seed = BOOT_SEED, alpha = KEY_ALPHA, minGold = MIN_GOLD_PAIRS, tierHeardOther = 0 }) {
  const n = gold.length;
  const lenient = evaluateSystem({ edges, noear, gold, toks, draws, B, seed, alpha, minGold });   // the v1 rule on this arm: informational
  const real = lenient.cols.real;
  const sReal = summaryOf(real);
  const gaps = [], notes = [];
  const scoreArm = (es) => toCols(es.map((e, i) => scoreSentence(gold[i], e)));
  const arms = {};
  for (const c of ["shuffled_gold", "crossed_edges", "random_adjacent", "random_pair"]) if (lenient.cols[c]) arms[c] = lenient.cols[c];
  arms.random_nominal_pair = lenient.nominalPairCols;
  if (earOff) arms.ear_off_tier_on = scoreArm(earOff); else if (!skipEarOff) gaps.push({ reason: "control_unmeasured:ear_off_tier_on", count: 1 });
  const info = {};
  if (tierOff) info.tier_off_ear_on = scoreArm(tierOff);
  if (noear) info.noear = scoreArm(noear);
  const nominalSentences = gold.filter((g) => g.nominals.length >= 2).length;

  const describe = (cols, gating) => {
    const sm = summaryOf(cols);
    const licensed = movesOn(real, cols), degenerate = sReal.edges > 0 && sm.edges === 0;
    const boot = bootstrapDiff(strictCols(real), strictCols(cols), { B, seed, alpha });
    return { f1Strict: sm.f1Strict, f1: sm.f1, recall: sm.recall, strictPrecision: sm.strictPrecision, edges: sm.edges, hits: sm.hits, licensed, degenerate, boot, beats: licensed && !degenerate && boot.lower > 0, gating };
  };
  const controls = {};
  for (const [name, cols] of Object.entries(arms)) controls[name] = describe(cols, true);
  for (const [name, cols] of Object.entries(info)) controls[name] = describe(cols, false);
  for (const [name, c] of Object.entries(controls)) {
    if (c.gating && !c.licensed) gaps.push({ reason: `control_unlicensed:${name}`, count: 1 });
    if (c.degenerate) gaps.push({ reason: `control_degenerate:${name}`, count: 1, detail: `the control emitted 0 edges (real arm ${sReal.edges}): a zero is not a beaten control` });
  }
  if (earInert && !skipEarOff) gaps.push({ reason: "ear_inert", count: 1, detail: "no segmenter and no peel: withEar maps this ear to no ear, so ear_off_tier_on is A by construction" });
  const ruled = GATING_CONTROLS_V2.filter((c) => controls[c] && controls[c].licensed && !controls[c].degenerate);

  // (G2) the hit-count power: derived from the derangement null of A's own edges
  const nullHits = shuffledNullHits({ gold, edges, draws: nullDraws });
  const crit = nullHits ? criticalHits(nullHits, { alpha }) : { c: Infinity, kmax: -1, R: 0, alpha };
  const hitsNeeded = Math.max(crit.c, Math.ceil(1 / LICENCE_RATIO));
  const H = sReal.hits;
  const nullMean = nullHits ? sumOf(nullHits) / nullHits.length : null;
  const hits = { real: H, needed: hitsNeeded, criticalAlpha: crit.c, licenceFloor: Math.ceil(1 / LICENCE_RATIO), nullDraws: nullHits?.length ?? 0, nullMean, nullMax: nullHits ? Math.max(...nullHits) : null, permutationP: nullHits ? permutationP(H, nullHits) : null, shuffledMean: controls.shuffled_gold ? controls.shuffled_gold.hits : null, crossedMean: controls.crossed_edges ? controls.crossed_edges.hits : null };
  // (L2) the licence, by hits
  const licence = {
    realHits: H, shuffledHits: hits.shuffledMean, crossedHits: hits.crossedMean, maxRatio: LICENCE_RATIO,
    ok: H > 0 ? ["shuffled_gold", "crossed_edges"].every((c) => !controls[c] || controls[c].hits <= LICENCE_RATIO * H) : null,   // null: unevaluable with no real hit
  };

  const powered = sReal.pairs >= minGold;
  let pass, verdict;
  if (!powered) { pass = null; verdict = "underpowered"; gaps.push({ reason: "underpowered", count: sReal.pairs, detail: `gold pairs ${sReal.pairs} < ${minGold}` }); }
  else if (!(sReal.edges > 0)) { pass = false; verdict = "fail:no_edges"; notes.push("the real arm emitted no edge: an arm that says nothing fails"); }
  else if (!(H >= hitsNeeded)) {
    pass = null; verdict = "underpowered_hits";
    gaps.push({ reason: "underpowered_hits", count: H, of: hitsNeeded, detail: `real gold-pair hits ${H} < ${hitsNeeded} needed (derangement null: mean ${nullMean == null ? "n/a" : nullMean.toFixed(2)}, alpha-critical ${crit.c}, licence floor ${hits.licenceFloor}); the sample cannot tell this arm from a deranged-pairing system: the claim is NOT shown` });
  } else if (!controls.random_nominal_pair || !nominalSentences) {
    pass = null; verdict = "control_unmeasured:random_nominal_pair";
    gaps.push({ reason: "control_unmeasured:random_nominal_pair", count: 1, detail: "no sentence has two gold nominal heads: no noun-finding chance level, no verdict about claims" });
  } else if (!controls.random_nominal_pair.licensed) {
    pass = false; verdict = "fail:random_nominal_pair_identical";
    notes.push("the oracle nominal-pair control scores exactly what the real arm scores in every sentence: nothing here shows more than noun-finding (II.23)");
  } else if (tierHeardOther > 0) {
    pass = null; verdict = "surface_tier_heard_other_language";
    gaps.push({ reason: "surface_tier_heard_other_language", count: tierHeardOther, detail: "the gating tier heard a language other than the declared one" });
  } else {
    const losers = ruled.filter((c) => !controls[c].beats);
    for (const c of losers) notes.push(`does not beat ${c} (strict F1 ${sReal.f1Strict.toFixed(3)} vs ${controls[c].f1Strict.toFixed(3)}, lower ${controls[c].boot.lower.toFixed(3)})`);
    if (!licence.ok) notes.push(`LICENCE FAILED: shuffled_gold/crossed_edges hits (${hits.shuffledMean?.toFixed(2)}, ${hits.crossedMean?.toFixed(2)}) are not <= ${LICENCE_RATIO} x real hits ${H} — a control built to fail did as well (II.23)`);
    pass = losers.length === 0 && ruled.length > 0 && licence.ok;
    verdict = pass ? "pass" : (losers.length ? `fail:${losers.join("+")}` : "fail:licence");
  }
  if (lenient.pass === true && controls.random_nominal_pair && !controls.random_nominal_pair.beats) gaps.push({ reason: "pass_is_noun_finding", count: 1, detail: "the v1 (lenient) rule would pass this arm but it does not beat the oracle nominal-pair chance level on strict F1" });
  const control = ruled.length ? Math.max(...ruled.map((c) => controls[c].f1Strict)) : null;
  return {
    n, summary: sReal, pass, verdict, claimShown: pass === true, passLenient: lenient.pass, passSpec: lenient.passSpec,
    hits, licence, controls, gating: ruled, powered, nominalSentences, gaps: [...gaps, ...lenient.gaps.filter((g) => !gaps.some((x) => x.reason === g.reason))], notes,
    score: sReal.f1Strict, control, margin: control == null ? null : sReal.f1Strict - control, lenient, cols: { real, ...arms, ...info },
  };
}

// ── mapping a production report's edges back to sentences ───────────────────
/** offsets of passages joined by "\n\n" (exactly engineRelationsFor's join) → [{start,end}] */
export function offsetsOf(texts) {
  let off = 0;
  return texts.map((t) => { const o = { start: off, end: off + t.length }; off += t.length + 2; return o; });
}
/**
 * mapEdgesToSentences(edges, offsets) → { per, unmapped, instances }
 * An engine edge carries spans [{ref:"material#A-B", start, end}]: A is the chunk's absolute start in the joined text and
 * start the sentence's offset inside it, so A+start lands inside exactly one passage. An edge that recurs in several
 * sentences is one instance in each. A span that lands nowhere is COUNTED (unmapped), never dropped silently.
 */
export function mapEdgesToSentences(edges, offsets) {
  const per = offsets.map(() => []);
  let unmapped = 0, instances = 0;
  const find = (a) => { let lo = 0, hi = offsets.length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (a < offsets[mid].start) hi = mid - 1; else if (a >= offsets[mid].end) lo = mid + 1; else return mid; } return -1; };
  for (const e of edges ?? []) {
    const spans = e.spans ?? [];
    if (!spans.length) { unmapped++; continue; }
    const hit = new Set();
    for (const sp of spans) {
      const m = /#(\d+)-(\d+)$/.exec(String(sp.ref ?? ""));
      const k = m ? find(Number(m[1]) + Number(sp.start ?? 0)) : -1;
      if (k < 0) unmapped++; else hit.add(k);
    }
    for (const k of hit) { per[k].push({ end1: e.end1, label: e.label, end2: e.end2 }); instances++; }
  }
  return { per, unmapped, instances };
}

// ── the systems under test (heavy modules are loaded lazily so the instrument imports cheaply) ──
let _S = null;
/** The reader's modules, loaded once. Exported so the tests can hold the declared-language tier to extractSurfacesHeard. */
export async function loadSystem() {
  if (_S) return _S;
  const [bundle, earMod, ctxMod, gfp, surf, gram, floor, wc, rl, hn, gt] = await Promise.all([
    import("../../the-fold/reader-bundle.js"), import("../../adapters/text/active-ear.js"), import("../../the-fold/language-context.js"),
    import("../../adapters/text/relations-gfp.js"), import("../../adapters/text/surfaces.js"), import("../../the-fold/language-grammar.js"),
    import("../../adapters/text/script-floor.js"), import("../../adapters/text/wordclass.js"), import("../../adapters/text/relations-language.js"),
    import("../../adapters/text/heard-nominals.js"), import("../../adapters/text/grain-typing.js"),
  ]);
  _S = {
    engineRelationsFor: bundle.engineRelationsFor, makeEngineRelationReader: bundle.makeEngineRelationReader, chunkSource: bundle.chunkSource,
    withEar: earMod.withEar, hear: earMod.hear, languageContextFor: ctxMod.languageContextFor, extractSurfacesHeard: ctxMod.extractSurfacesHeard,
    extractGfpRelations: gfp.extractGfpRelations, plainSurfaces: surf.extractSurfaces, diaNorm: surf.diaNorm, grammarFor: gram.grammarFor, detectLanguage: gram.detectLanguage,
    wordFloor: floor.wordFloor, classifyWord: wc.classifyWord, dominantClass: wc.dominantClass, relationExtractorsFor: rl.relationExtractorsFor,
    createNominalIndex: hn.createNominalIndex, GRAMMAR_MIN_SHARE: gt.GRAMMAR_MIN_SHARE,
  };
  return _S;
}

const heardOf = (S, ear, t) => (ear ? S.withEar(ear, () => S.hear(t)) : t);

/**
 * makeTier(S, stem, { ear, probe }) -> a drop-in for the reader's `extractSurfaces` seam: language-context.js
 * extractSurfacesHeard (capital-run surfaces UNIONED with the caseless heard-nominal tier) with ONE change: the language is the
 * DECLARED one (languageContextFor(text, { language: stem })), never re-detected from each call's text, so the tier cannot silently
 * hear another language (AMENDMENT v2 finding 4). ear:false hands the tier an identity ear (no segment, no peel): the ear-off arm.
 * probe: { calls, other, language } counts the calls whose context language is not the declared one.
 */
export function makeTier(S, stem, { ear = true, probe = null } = {}) {
  return (sentences, opts = {}) => {
    const capital = S.plainSurfaces(sentences, opts);
    const text = (sentences ?? []).map((s) => String(s?.text ?? s ?? "")).join("\n");
    const ctx = S.languageContextFor(text, { language: stem });
    if (probe) { probe.calls++; if (ctx.language !== probe.language) probe.other++; }
    if (!ctx.grammar?.framePrior) return capital;
    const idx = S.createNominalIndex({ posPrior: ctx.grammar.posPrior, framePrior: ctx.grammar.framePrior, segment: ear ? ctx.ear.segment : null, peel: ear ? ctx.ear.peel : null, commonNouns: !ctx.casedScript });
    for (const s of sentences ?? []) idx.add(s);
    const have = new Set(capital.map((c) => S.diaNorm(c.surface)));
    const heard = idx.beings({ minMentions: 2 }).filter((h) => !have.has(S.diaNorm(h.surface)));
    return [...capital, ...heard];
  };
}

/** The stem's OWN priors for the production reader's English-only seams (informational arm): the stem POS prior, verb forms derived from it at the reader's own share floor, the English closed classes EMPTIED (received lists exist only for English). */
export function ownPriorOverrides(S, grammar) {
  const forms = new Set();
  for (const [w, counts] of Object.entries(grammar.posPrior?.forms ?? {})) {
    let total = 0; for (const v of Object.values(counts)) total += v;
    if (total > 0 && (((counts.VERB ?? 0) + (counts.AUX ?? 0)) / total) >= S.GRAMMAR_MIN_SHARE) forms.add(w.toLowerCase());
  }
  return {
    posPriorFor: () => grammar.posPrior, verbForms: forms.size ? forms : null, oovLexicon: forms.size ? forms : null,
    createLemmatizer: null, morphologyIndex: null, determiners: new Set(), definiteDeterminers: new Set(), negationWords: new Set(), firstPerson: new Set(), resolvePronouns: null,
  };
}

/** Every English-only seam of the production reader REMOVED (the perturbation licence of the English-priors typing: if the edge set does not move, those seams do not shape the edges). */
export function noEnglishSeams() {
  return {
    posPriorFor: () => null, verbForms: null, oovLexicon: null, createLemmatizer: null, morphologyIndex: null, attestedVerbs: false,
    determiners: new Set(), definiteDeterminers: new Set(), negationWords: new Set(), firstPerson: new Set(), resolvePronouns: null,
  };
}

/**
 * One read of `texts` (one passage each) -> per-sentence edges, by ARM:
 *   A    the real arm: engineRelationsFor (ear on) with the declared-language tier
 *   B    ear_off_tier_on: the same reader and tier, ear off (read outside withEar, identity segment/peel)
 *   C    tier_off_ear_on: engineRelationsFor with capital-only surfaces
 *   D    noear: capital-only surfaces, no ear (v1's control)
 *   OWN  A with the stem's own priors in the English-only seams
 *   NOENG A with every English-only seam removed (perturbation licence for the English-priors typing)
 */
function readArm(S, texts, { arm, stem, probe = null, own = null }) {
  const offsets = offsetsOf(texts);
  const passages = texts.map((t) => ({ ref: "s", text: t }));
  const chunk = () => S.chunkSource("material", texts.join("\n\n"), {});
  let report;
  if (arm === "A") report = S.engineRelationsFor(passages, { language: stem, extractSurfaces: makeTier(S, stem, { ear: true, probe }) });
  else if (arm === "OWN") report = S.engineRelationsFor(passages, { language: stem, extractSurfaces: makeTier(S, stem, { ear: true }), ...own });
  else if (arm === "NOENG") report = S.engineRelationsFor(passages, { language: stem, extractSurfaces: makeTier(S, stem, { ear: true }), ...noEnglishSeams() });
  else if (arm === "B") report = S.makeEngineRelationReader({ language: stem, extractSurfaces: makeTier(S, stem, { ear: false }) })(chunk());
  else if (arm === "C") report = S.engineRelationsFor(passages, { language: stem, extractSurfaces: S.plainSurfaces });
  else report = S.makeEngineRelationReader({ extractSurfaces: S.plainSurfaces })(chunk());
  return { ...mapEdgesToSentences(report?.edges ?? [], offsets), total: (report?.edges ?? []).length };
}

/**
 * The CAUSAL read: block b is read from a fresh reader fed sentences 0..end-of-block-b; only block b's edges are credited.
 * block = 1 is strictly causal (sentence k sees sentences 0..k only); a larger block has within-block lookahead <= block-1.
 */
export function causalReads(S, texts, { arm, stem, block = GATE_BLOCK, probe = null, own = null }) {
  const per = texts.map(() => []);
  let unmapped = 0;
  for (let lo = 0; lo < texts.length; lo += block) {
    const hi = Math.min(texts.length, lo + block);
    const r = readArm(S, texts.slice(0, hi), { arm, stem, probe, own });
    unmapped += r.unmapped;
    for (let k = lo; k < hi; k++) per[k] = r.per[k];
  }
  return { per, unmapped };
}
/** The LOOKAHEAD read: the whole sample at once (every earlier sentence is judged with later ones in view). Labelled wherever it appears. */
const batchReads = (S, texts, o) => { const r = readArm(S, texts, o); return { per: r.per, unmapped: r.unmapped, total: r.total }; };

/** The four arms of the 2x2 ear x tier ablation over `texts`, read causally (block) or as a lookahead batch. B is A by construction when the ear is inert. */
function armSet(S, texts, { stem, block = null, earInert, probe = null }) {
  const read = (arm, p = null) => (block ? causalReads(S, texts, { arm, stem, block, probe: p }) : batchReads(S, texts, { arm, stem, probe: p }));
  const A = read("A", probe);
  const Bx = earInert ? { per: A.per, unmapped: 0, byConstruction: true } : read("B");
  return { A, B: Bx, C: read("C"), D: read("D") };
}

/** The GFP extractor, one sentence at a time, figures = the extractor's own recurrence rule over the PREFIX (causal). */
function gfpEdges(S, texts, { ear, posPrior }) {
  const counts = new Map(), per = [];
  const dominant = (tags) => Object.entries(tags ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const isFunction = (tok) => { const e = posPrior?.forms?.[tok]; return e ? FUNCTION_CLASSES.has(dominant(e)) : false; };
  for (const t of texts) {
    const heard = heardOf(S, ear, t);
    for (const m of heard.matchAll(GFP_WORD)) { const k = m[0].toLowerCase(); counts.set(k, (counts.get(k) ?? 0) + 1); }
    const figures = new Set([...counts].filter(([k, c]) => c >= GFP_MIN_REC && k.length >= S.wordFloor(k, 3) && !isFunction(k)).map(([k]) => k));
    const run = () => S.extractGfpRelations(t, { posPrior, figures });
    per.push((ear ? S.withEar(ear, run) : run()).map((e) => ({ end1: e.end1, label: e.label, end2: e.end2 })));
  }
  return per;
}

/** The stem's RoleConfig@1 positional reader, one edge at most per sentence. INFORMATION ONLY. */
function roleConfigEdges(S, texts, { ear, grammar }) {
  const procl = Array.isArray(grammar.proclitics) ? new Set(grammar.proclitics) : grammar.proclitics instanceof Set ? grammar.proclitics : null;
  const ex = S.relationExtractorsFor({ language: grammar.language, roleConfig: grammar.roleConfig, posPrior: grammar.posPrior, classifyWord: S.classifyWord, dominantClass: S.dominantClass, ...(procl ? { proclitics: procl } : {}) });
  let threw = 0;
  const per = texts.map((t) => {
    try { return ex.extractRelations(heardOf(S, ear, t)).map((e) => ({ end1: e.end1, label: e.label, end2: e.end2 })); } catch { threw++; return []; }
  });
  return { per, threw, mode: ex.mode };
}

/** The AS-SHIPPED production tier re-detects its language from the text of each call. Probe: detect each of the first `budget` sentences alone (the shortest text it can be handed). */
function autodetectProbe(S, texts, declared, budget) {
  const sample = texts.slice(0, Math.max(0, budget));
  const heard = {};
  let disagree = 0;
  for (const t of sample) {
    const lang = S.detectLanguage(t)?.language ?? null;
    heard[String(lang)] = (heard[String(lang)] ?? 0) + 1;
    if (lang !== declared) disagree++;
  }
  return { of: sample.length, disagree, heard, declared };
}

// ── the rung ────────────────────────────────────────────────────────────────
const unmeasured = (base, why, detail) => ({ ...base, pass: null, gaps: [{ reason: "unmeasured", count: 1, detail: why }, ...base.gaps], notes: [...base.notes, detail ?? why] });
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const r6 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1e6) / 1e6);
/** The v1 card of an evaluateSystem result (lenient numbers, the v1 rule's verdict): informational arms (cased, gfp, roleConfig) and the lenient side of the gating card. */
const armCard = (ev) => ev && ({
  edges: ev.summary.edges, recall: r3(ev.summary.recall), precision: r3(ev.summary.precision), strictPrecision: r3(ev.summary.strictPrecision),
  f1: r3(ev.summary.f1), f1Strict: r3(ev.summary.f1Strict), tripleRecall: r3(ev.summary.tripleRecall), undirectedRecall: r3(ev.summary.undirectedRecall), nominalRecall: r3(ev.summary.nominalRecall),
  pass: ev.pass, passSpec: ev.passSpec, control: r3(ev.control), licence: { ok: ev.licence.ok, shuffledRatio: r3(ev.licence.shuffledRatio), crossedRatio: r3(ev.licence.crossedRatio) },
  controls: Object.fromEntries(Object.entries(ev.controls).map(([k, c]) => [k, { f1: r3(c.f1), recall: r3(c.recall), precision: r3(c.precision), edges: r3(c.edges), licensed: c.licensed, beats: c.beats, diffLower: r3(c.boot.lower), diffObserved: r3(c.boot.observed), p: r3(c.boot.p) }])),
  gaps: ev.gaps, notes: ev.notes,
  diagnostics: ev.diagnostics && {
    note: ev.diagnostics.note, f1Strict: r3(ev.diagnostics.f1Strict), beatsNominalPair: ev.diagnostics.beatsNominalPair, beatsAllStrict: ev.diagnostics.beatsAllStrict,
    controls: Object.fromEntries(Object.entries(ev.diagnostics.controls).map(([k, c]) => [k, { f1Strict: r3(c.f1Strict), recall: r3(c.recall), diffLower: r3(c.diffLower), p: r3(c.p), beats: c.beats }])),
  },
});
/** The v2 card of an evaluateClaims result. */
export const claimsCard = (ev) => ev && ({
  verdict: ev.verdict, pass: ev.pass, claimShown: ev.claimShown, passLenient: ev.passLenient, passSpec: ev.passSpec,
  pairs: ev.summary.pairs, edges: ev.summary.edges, hits: ev.hits.real, hitsNeeded: ev.hits.needed,
  recall: r3(ev.summary.recall), strictPrecision: r3(ev.summary.strictPrecision), f1Strict: r6(ev.summary.f1Strict), lenientF1: r3(ev.summary.f1), lenientPrecision: r3(ev.summary.precision),
  score: r6(ev.score), control: r6(ev.control), margin: r6(ev.margin), gating: ev.gating,
  hitsNull: { real: ev.hits.real, needed: ev.hits.needed, criticalAlpha: Number.isFinite(ev.hits.criticalAlpha) ? ev.hits.criticalAlpha : "unreachable", licenceFloor: ev.hits.licenceFloor, nullDraws: ev.hits.nullDraws, nullMean: r3(ev.hits.nullMean), nullMax: ev.hits.nullMax, permutationP: r3(ev.hits.permutationP) },
  licence: { ok: ev.licence.ok, realHits: ev.licence.realHits, shuffledHits: r3(ev.licence.shuffledHits), crossedHits: r3(ev.licence.crossedHits), maxRatio: ev.licence.maxRatio },
  controls: Object.fromEntries(Object.entries(ev.controls).map(([k, c]) => [k, { gating: c.gating, f1Strict: r6(c.f1Strict), recall: r3(c.recall), strictPrecision: r3(c.strictPrecision), edges: r3(c.edges), hits: r3(c.hits), licensed: c.licensed, degenerate: c.degenerate, beats: c.beats, diffLower: r6(c.boot.lower), diffObserved: r6(c.boot.observed), p: r3(c.boot.p) }])),
  lenient: armCard(ev.lenient), gaps: ev.gaps, notes: ev.notes,
});

/**
 * measure({ stem, split, limit, causalBlock, evalDir, B, verbose, autodetect, ownPriors }) — the rung's contract. Reads the held-out gold, runs every
 * arm, applies the v2 rule (evaluateClaims) and returns the card. Never throws for a stem lacking data: pass:null + a typed gap.
 * The gating read is STRICTLY CAUSAL by default (block 1, GATE_BLOCK); `causalBlock` > 1 trades causality for speed and says so.
 */
export async function measure({ stem, split = "dev", limit = null, causalBlock = null, evalDir = null, B = BOOT_B, verbose = false, autodetect = AUTODETECT_BUDGET, ownPriors = true } = {}) {
  const base = { stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
  if (!stem) return unmeasured(base, "no_stem", "no stem given");
  const file = evalDir ? `${evalDir}/${stem}/${split}.conllu` : conlluPath(stem, split);
  if (!file || !fs.existsSync(file)) return unmeasured({ ...base, gaps: [{ reason: "no_gold", count: 1 }] }, "no_gold", `no held-out gold at ${file ?? `ud-eval/${stem}/${split}.conllu`}`);
  let S;
  try { S = await loadSystem(); } catch (e) { return unmeasured(base, "error: reader failed to load", String(e?.message ?? e).slice(0, 200)); }
  const grammar = S.grammarFor(stem);
  if (!grammar.language || !grammar.posPrior?.forms) return unmeasured({ ...base, gaps: [{ reason: "language_unheard", count: 1 }] }, "language_unheard", grammar.gap ?? `no received grammar for ${stem}: a typed gap, never another language's grammar`);
  const t0 = Date.now(), ms = {};
  const tick = (k) => { const t = Date.now(); ms[k] = t - (tick.last ?? t0); tick.last = t; };
  const cap = limit ? Number(limit) : DEFAULT_LIMIT;
  const block = Math.max(1, Math.floor(Number(causalBlock ?? GATE_BLOCK)));
  const parsed = readConllu(file, { limit: cap });
  let rebuilt = 0;
  const sents = [];
  for (const s of parsed) {
    const { text, rebuilt: rb } = sentenceText(s);
    if (!text) continue;
    if (rb) rebuilt++;
    sents.push({ s, text });
  }
  const gold = sents.map(({ s }) => goldOfSentence(s));
  const original = sents.map((x) => x.text);
  const lower = original.map((t) => t.toLowerCase());
  const N = sents.length;
  const goldPairs = gold.reduce((a, g) => a + g.pairs.length, 0);
  const goldInfo = { sentences: N, withPairs: gold.filter((g) => g.pairs.length).length, pairs: goldPairs, nominalPairs: gold.reduce((a, g) => a + g.pairs.filter((p) => p.pure).length, 0), subjects: gold.reduce((a, g) => a + g.nSubjects, 0), objects: gold.reduce((a, g) => a + g.nObjects, 0), textRebuilt: rebuilt, limit: cap };
  tick("gold");
  const out = { ...base, n: N, details: { rule: "v2", headerDigest: headerDigest(fileURLToPath(import.meta.url)), headerDigests: headerDigests(), input: "lowercased (case-stripped), one passage per sentence", gold: goldInfo } };
  const gaps = out.gaps, notes = out.notes;
  let claims = null, la = null;
  try {
    const joined = lower.join("\n\n");
    const ctx = S.languageContextFor(joined, { language: stem });
    if (!ctx.language) return unmeasured({ ...out, gaps: [{ reason: "language_unheard", count: 1 }, ...gaps] }, "language_unheard", ctx.gap ?? "no ear for this language");
    const earInert = !ctx.ear?.segment && !ctx.ear?.peel;
    const probe = { calls: 0, other: 0, language: ctx.language };
    const ear = ctx.ear ?? null;
    out.details.language = { declared: stem, grammar: ctx.language, casedFraction: ctx.casedFraction, casedScript: ctx.casedScript, earSegment: Boolean(ctx.ear?.segment), earPeel: Boolean(ctx.ear?.peel), earInert };
    const toks = lower.map((t) => (heardOf(S, ear, t).match(HEARD_WORD) ?? []));
    tick("language");
    const nonEnglish = ctx.language !== "eng";
    if (nonEnglish) gaps.push({ reason: "english_priors_applied", count: 1, detail: "the production reader loads ENGLISH priors for every language (pos-eng, UniMorph-eng, English verb forms, determiners, negation words, first-person set, pronoun resolver): this arm is the English relation vocabulary run over the stem; see details.ownPriors" });

    // ── GATING (v2): the production reader, declared language, STRICTLY CAUSAL, lowercased ──
    let gate = null;
    try {
      gate = armSet(S, lower, { stem, block, earInert, probe }); tick("causal_arms");
      if (gate.A.unmapped) gaps.push({ reason: "edges_unmapped", count: gate.A.unmapped, detail: "causal production (ear) spans landing in no sampled sentence" });
      claims = evaluateClaims({ edges: gate.A.per, earOff: gate.B.per, earInert, tierOff: gate.C.per, noear: gate.D.per, gold, toks, B, tierHeardOther: probe.other });
      tick("score");
    } catch (e) {
      gaps.push({ reason: "lookahead_only", count: 1, detail: `the causal arm failed (${String(e?.message ?? e).slice(0, 120)}): only the lookahead read is shown and pass is null` });
    }

    // ── the LOOKAHEAD (batch) read, labelled: every earlier sentence is judged with later ones in view (S3) ──
    const lk = armSet(S, lower, { stem, block: null, earInert }); tick("lookahead_arms");
    la = evaluateClaims({ edges: lk.A.per, earOff: lk.B.per, earInert, tierOff: lk.C.per, noear: lk.D.per, gold, toks, B });
    out.details.lookahead = { ...claimsCard(la), note: "LOOKAHEAD (S3): the whole sample is read at once, so every earlier sentence is judged with later sentences in view; informational, never the verdict", unmapped: lk.A.unmapped };

    // ── the perturbation licence of the English-priors typing (post-run addendum): remove every English-only seam, lookahead read ──
    if (nonEnglish) {
      try {
        const ne = batchReads(S, lower, { arm: "NOENG", stem }); tick("english_seams_removed");
        const changed = ne.per.filter((es, i) => JSON.stringify(es) !== JSON.stringify(lk.A.per[i])).length;
        const edgesWith = lk.A.per.reduce((a, es) => a + es.length, 0), edgesWithout = ne.per.reduce((a, es) => a + es.length, 0);
        out.details.englishPriorsLicence = { perturbation: "every English-only seam removed (posPriorFor, verbForms, oovLexicon, lemmatizer, determiners, negation words, first-person set, pronoun resolver, attestedVerbs)", read: "lookahead batch, declared-language tier, ear on", sentences: N, sentencesChanged: changed, edgesWithEnglishSeams: edgesWith, edgesWithout, moved: changed > 0 };
        if (changed === 0) gaps.push({ reason: "english_priors_inert_for_edges", count: 0, of: N, detail: "removing every English-only seam changes no sentence's edges: the English priors are loaded but do not shape the edge set of this path; a failure here is not caused by them" });
      } catch (e) { gaps.push({ reason: "error: english-priors licence", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); }
    }

    const pick = claims ?? la;
    out.score = r6(pick.score); out.control = r6(pick.control);
    out.margin = out.score != null && out.control != null ? r6(out.score - out.control) : null;
    out.pass = claims ? claims.pass : null;
    out.controls = Object.fromEntries(Object.entries(pick.controls).map(([k, c]) => [k, r6(c.f1Strict)]));
    if (claims) {
      gaps.push(...claims.gaps); notes.push(...claims.notes);
      const causalInfo = { block, withinBlockLookahead: block - 1, strictlyCausal: block === 1, tierCalls: probe.calls, tierCallsHearingOtherLanguage: probe.other };
      out.details.causal = causalInfo;
      out.details.primary = { ...claimsCard(claims), arm: "A: production engineRelationsFor, declared language, declared-language heard-nominal tier, ear on, lowercased, causal block " + block, edgesTotalUnmapped: gate.A.unmapped, ...causalInfo };
      out.details.passSpec = claims.passSpec; out.details.passLenient = claims.passLenient;
      const row = (es) => { const sm = summaryOf(toCols(es.map((e, i) => scoreSentence(gold[i], e)))); return { edges: sm.edges, hits: sm.hits, f1Strict: r6(sm.f1Strict) }; };
      out.details.ablation = { note: "2x2 ear x tier on lowercased input, strictly causal reads; the gate uses ear_off_tier_on only", ear_on_tier_on: row(gate.A.per), ear_off_tier_on: { ...row(gate.B.per), identicalToEarOn: Boolean(gate.B.byConstruction) }, ear_on_tier_off: row(gate.C.per), ear_off_tier_off: row(gate.D.per) };
      out.details.edgesPerSentence = r3(claims.summary.edges / Math.max(1, N));
    } else {
      gaps.push(...la.gaps); notes.push(...la.notes);
      out.pass = null;
    }
    out.details.claimShown = Boolean(claims?.claimShown);

    // ── the AS-SHIPPED surface tier re-detects its language per call: measured per sentence, typed, never papered over ──
    if (autodetect > 0) {
      const ad = autodetectProbe(S, lower, ctx.language, autodetect); tick("autodetect");
      out.details.autodetect = { ...ad, note: "the production tier (language-context.js extractSurfacesHeard) calls languageContextFor(text) WITHOUT the declared language; each of the first sentences detected alone, the shortest text it can be handed" };
      if (ad.disagree > 0) gaps.push({ reason: "surface_tier_autodetect_disagrees", count: ad.disagree, of: ad.of, detail: `as shipped, the production surface tier hears ${JSON.stringify(ad.heard)} for declared ${ctx.language}; the gating arm declares the language` });
    }

    // ── informational: original case (what the capital witness adds), lookahead batch ──
    try {
      const cs = armSet(S, original, { stem, block: null, earInert }); tick("cased");
      out.details.cased = { ...claimsCard(evaluateClaims({ edges: cs.A.per, earOff: cs.B.per, earInert, tierOff: cs.C.per, noear: cs.D.per, gold, toks, B })), note: "original-case text, LOOKAHEAD batch: the capital witness is present for cased scripts; informational, never the rung's verdict" };
    } catch (e) { gaps.push({ reason: "error: cased arm", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); }

    // ── informational: GFP extractor under the ear, causal ────────────────
    try {
      const gReal = gfpEdges(S, lower, { ear, posPrior: ctx.grammar.posPrior }), gNo = gfpEdges(S, lower, { ear: null, posPrior: ctx.grammar.posPrior }); tick("gfp");
      out.details.gfp = armCard(evaluateSystem({ edges: gReal, noear: gNo, gold, toks, B }));
      out.details.gfp.note = "relations-gfp.js extractGfpRelations, one sentence at a time, figure set from the PREFIX only (causal); informational, v1 lenient rule";
    } catch (e) { gaps.push({ reason: "error: gfp arm", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); }

    // ── information only: roleConfig (OFF in production by design) ─────────
    if (!ctx.grammar.roleConfig) gaps.push({ reason: "no_roleconfig", count: 1 });
    else {
      try {
        const rc = roleConfigEdges(S, lower, { ear, grammar: ctx.grammar });
        const sub = evaluateSystem({ edges: rc.per, noear: null, gold, toks, B });
        const withEdge = rc.per.filter((es) => es.length).length;
        out.details.roleConfig = { ...armCard(sub), mode: rc.mode, sentencesWithEdge: withEdge, shareWithEdge: r3(withEdge / Math.max(1, N)), threw: rc.threw, beatsRandomAdjacent: sub.controls.random_adjacent?.beats ?? null, beatsRandomPair: sub.controls.random_pair?.beats ?? null, note: "INFORMATION ONLY: roleConfig is OFF in production by design (the positional reader failed on real prose); no pass rule" };
        delete out.details.roleConfig.pass; delete out.details.roleConfig.passSpec;
        tick("roleConfig");
      } catch (e) { gaps.push({ reason: "error: roleConfig arm", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); }
    }

    // ── informational: the same causal read with the STEM'S OWN priors in the English-only seams ──
    if (!nonEnglish) out.details.ownPriors = { skipped: "the stem is English: the production priors ARE the stem's" };
    else if (ownPriors && claims) {
      try {
        const own = causalReads(S, lower, { arm: "OWN", stem, block, own: ownPriorOverrides(S, ctx.grammar) }); tick("own_priors");
        const evOwn = evaluateClaims({ edges: own.per, earOff: null, earInert, skipEarOff: true, gold, toks, B });
        const differs = own.per.filter((es, i) => JSON.stringify(es) !== JSON.stringify(gate.A.per[i])).length;
        out.details.ownPriors = { ...claimsCard(evOwn), sentencesDifferingFromEnglishPriors: differs, edgesEnglishPriors: claims.summary.edges, edgesOwnPriors: evOwn.summary.edges, note: "INFORMATIONAL: the same strictly causal reading with the stem's own POS prior / verb forms and the English closed classes emptied; answers 'English priors, or the language?'; never gating" };
      } catch (e) { gaps.push({ reason: "error: ownPriors arm", count: 1, detail: String(e?.message ?? e).slice(0, 160) }); }
    }

    if (verbose && gate) out.details.examples = gate.A.per.flatMap((es, i) => es.slice(0, 2).map((e) => ({ i, end1: e.end1, label: String(e.label).slice(0, 50), end2: e.end2, hit: scoreSentence(gold[i], [e]).ms > 0, nominalPair: scoreSentence(gold[i], [e]).m > 0 }))).slice(0, 12);
  } catch (e) {
    return unmeasured({ ...out, gaps: [{ reason: `error: ${String(e?.message ?? e).slice(0, 160)}`, count: 1 }, ...gaps] }, "error", `the reader threw: ${String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")}`);
  }
  if (goldInfo.withPairs === 0) gaps.push({ reason: "unmeasured", count: 1, detail: "no gold subject-object pair in the sample" });
  out.details.ms = { ...ms, total: Date.now() - t0 };
  return out;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const slim = (r, verbose) => (verbose ? r : { ...r, details: { ...r.details, examples: undefined } });
async function main() {
  const a = parseArgs();
  const verbose = a.flags.has("verbose");
  const argv = process.argv.slice(2);
  const bi = argv.indexOf("--block"), ai = argv.indexOf("--autodetect");
  const causalBlock = bi >= 0 ? Number(argv[bi + 1]) : null;       // default GATE_BLOCK = 1 (strictly causal); --causal is accepted and means the default
  const autodetect = ai >= 0 ? Number(argv[ai + 1]) : AUTODETECT_BUDGET;
  let stems = a.stem ? [a.stem] : [];
  if (a.all) { const g = await import("../../the-fold/language-grammar.js"); stems = g.availableStems().filter((s) => conlluPath(s, a.split)); }
  if (!stems.length) { console.error("usage: r4-claims.mjs --stem <stem> [--split dev|test] [--limit N] [--block N] [--autodetect N] [--verbose] | --all"); process.exit(2); }
  for (const stem of stems) {
    const r = await measure({ stem, split: a.split, limit: a.limit, causalBlock, autodetect, verbose });
    writeResult(RUNG.id, stem, a.split, r);
    console.log(JSON.stringify(slim(r, verbose)));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
