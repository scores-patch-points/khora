// eval/notation-competence/genetic.mjs — COMPETENCE CARD, FAMILY "genetic" (the genetic code: DNA / RNA /
// protein residues, FASTA + GenBank containers, codon tables) on rungs R0..R5.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══════════════════════════════════════════════════
// Written BEFORE the first run of this instrument on DEV. Nothing in this block is tuned after a result;
// a prediction that fails is reported as failed. The sha256 of this leading comment block is stamped into every
// result (meta.prereg_sha256); later amendments (bug fixes only) are appended under AMENDMENTS at the foot of the
// block and change the digest, so a comparison of digests shows that the claim moved.
//
// SYSTEM UNDER TEST: adapters/notation/genetic.js (ear, identify, scanGenome/read, hearFrame, translateSpan) with the
// received priors priors/notation-genetic-{codon-tables,alphabet,orf}.json, all built from TRAIN only by
// eval/notation-competence/genetic/build-priors.mjs. GOLD (never the system under test): the NCBI RefSeq annotation
// (CDS interval, strand, /codon_start, /transl_table, /translation, /transl_except, pseudo, partial) read with
// Biopython 1.88 (gold/<ACC>.json.gz), Biopython's CodonTable for the code classes, NCBI's own protein FASTA
// (fasta_cds_aa), and the sha256 of the Biopython-parsed sequence. Unit of analysis: the SOURCE (one genome record;
// one Rfam family; one treebank; one code file), never the window, token or line. Splits are by source (manifest).
//
// CLAIM. The adapter, driven only by received priors, (R0) names the notation of a text stream and the genetic-code variant
// of a genome from the prefix alone; (R1) hears the lexemes of its containers and the codon boundaries (frame) of an unannotated
// window; (R2) classifies codon tokens (stop vs sense) under the code it has inferred; (R3) finds the beings the text declares
// (GenBank features) and the ones it does not (ORFs in a bare genome); (R4) recovers the codon->amino-acid relation; (R5) agrees
// with itself across representations of the same content. Each claim is scored against controls built to fail; where a claim is
// not measurable the rung says so (typed gap), never a silent pass.
//
// CAUSALITY. Every verdict is a function of the prefix. R0 feeds ONE LINE at a time and reads the verdict before the next line
// exists to the system. The genome reader is a single left-to-right pass; each being carries `at` (residues consumed when it was
// emitted). R3 checks PREFIX-STABILITY directly: for every genome the beings of read(full) with at <= K must equal the beings
// of read(first K residues) (K = half the genome); any violation fails R3. The code state used for a token is the state in force
// at the residue where the token's CDS ends (stateAt(timeline, cds.end)), never the final state. Whole-genome statistics are used
// only for the instrument's own controls (the gc_stump control is fit on TRAIN only).
//
// MATCHERS (defined once).
//  * BEING MATCH. A reader being matches an evaluable gold CDS iff same strand AND same 3' end (the stop codon): key "+:<end>" /
//    "-:<start>". A being whose key is a NON-evaluable gold CDS (pseudo, partial, joined, exception, codon_start != 1) is IGNORED,
//    neither true nor false positive; every other being is a false positive. precision = TP/(TP+FP), recall = TP/#evaluable gold,
//    F1 per genome; the card averages F1 over genomes (macro). Start-exactness is NOT required (reported in details only).
//  * TOKEN GOLD. Codon tokens of an evaluable CDS in READING order (minus-strand CDS read from the right). Terminal codon is
//    'stop' iff the gold CDS ends in a stop of its annotated table; all other codons are 'sense'. A CDS whose annotated end
//    is not a stop is skipped (counted). Amino-acid gold of token k is /translation[k] for 1 <= k <= len-2; k = 0 carries the
//    initiator rule (a start codon reads as M whatever it spells) and is scored separately.
//  * FRAME LABEL (R1b). A window of 240 nt strictly inside an evaluable CDS (>= 3 nt from both ends); label (strand, offset) with
//    offset = plus-direction position (0..2) of the first codon boundary: ((cdsStart - winStart) mod 3) for plus,
//    ((cdsEnd - winStart) mod 3) for minus. 100 windows per genome, seeded by the accession (SEED ^ fnv1a(acc)), uniformly over
//    evaluable CDS >= 246 nt then uniformly inside; genomes with fewer evaluable CDS reuse CDS with replacement.
//  * CODE CLASS. (TGA status, AGR status) of the annotated table from Biopython: stop|sense. Exact table id is reported, not scored
//    (tables with the same class are not distinguishable from content; that is a typed gap, codon_aa_underdetermined).
//
// RUNGS: ARMS, CONTROLS BUILT TO FAIL, LICENCE CHECKS, PASS RULES. ALPHA = 0.05 for every one-sided exact sign test
// (ties dropped); "beats a control" = real > control on the unit AND sign-test p < ALPHA over units; a control that is
// UNLICENSED is reported but never gates a pass. If no control of a rung is licensed, pass = null.
//
//  R0 IDENTIFY. (a) SYSTEM. Streams of 40 non-blank lines fed one at a time: per genome genbank_head (gold "genbank"), genbank_origin
//   ("dna"), fasta_dna ("dna"), bare_dna ("dna"), fasta_protein ("protein"), bare_protein ("protein"); per Rfam family fasta_rna and
//   bare_rna ("rna": records written with U and no T only; records written with T are DNA alphabet and are a typed gap, not scored);
//   NEGATIVES with gold null: UD prose lines (5 streams per treebank) and C/Go source (3 streams per file). Stream accuracy: positives
//   = share of verdicts equal to gold over the window [d..end], d = first non-null verdict (never decided = 0); negatives = share of
//   verdicts that are null (a typed refusal). Source score = mean over its streams; positive score = macro over positive sources;
//   negative score likewise; score = mean(positive, negative). CONTROLS: majority (constant label of the most frequent gold
//   label); deranged_profiles (the dna/rna/protein letter profiles rotated one place); letter_permuted (the real listener on text
//   whose letters are permuted by a fixed derangement of A..Z). LICENCE (measured on the text, not on verdicts): mean per-letter
//   log-likelihood of the positive residue streams under the gold-class profile must fall by >= 0.5 nats under the control's
//   profile/text (majority: always licensed). (b) CODE. Per genome the final inferred (TGA, AGR) status after reading the whole
//   record vs the gold class; a status the evidence has not settled is filled by the TRAIN default class and counted as a
//   provisional typed gap (the strict accuracy with unsettled = wrong is reported in details, not gating). CONTROLS: majority_class (the TRAIN default class everywhere); gc_stump (genome GC
//   -> TGA status, threshold fit on TRAIN only, AGR always sense: the strongest composition-only rival); shuffled_verdicts (the real
//   verdicts re-dealt across genomes by a derangement, mean of 50 seeds). LICENCE: licensed iff the split holds >= 2 gold classes
//   (a constant cannot fail on a one-class split) and, for gc_stump, the stump is wrong on >= 1 genome of the split.
//   PASS R0 = (positives >= 0.90) AND (negatives >= 0.90) AND real beats every licensed system control AND (code accuracy >= 0.70)
//   AND real beats every licensed code control. score = system score; control = strongest licensed system control.
//
//  R1 HEAR. (a) CONTAINER LEXEMES. Per genome the GenBank text and the FASTA text are fed to ear(): four binary checks: the residues
//   concatenated from 'residues' tokens of the GenBank equal the Biopython sequence (sha256); same for the FASTA; the FASTA id and the
//   LOCUS id equal the gold accession; every ORIGIN position label equals 1 + the residues before its line. r1a = mean of the four.
//   CONTROL: naive_tokens (no container grammar: all alphabetic whitespace tokens of the GenBank are "residues", position labels are
//   unreadable, FASTA = lines not starting with '>'); LICENCE: its genbank-residue check must fail on >= 50% of genomes.
//   (b) CODON BOUNDARIES. hearFrame on 100 windows/genome (core stops TAA/TAG refuse a hypothesis; no table is told to the reader);
//   score = macro mean over genomes of the share of windows with the right (strand, offset). CONTROLS: stopfree_only (ablation: the
//   same refusal, no usage prior; exact expected accuracy 1/|surviving hypotheses| if the truth survives); deranged_usage (usage
//   tables re-dealt over the 64 codons per GC bin, 3 seeds, strongest seed). LICENCE: deranged_usage: mean log-odds of the TRUE
//   hypothesis under the real usage table exceeds the deranged table's by >= 0.5 nats per window; stopfree_only: mean #surviving
//   hypotheses > 1.2. chance (1/6) is reported, not a control.
//   PASS R1 = r1a >= 0.99 AND beats naive_tokens, AND frame accuracy >= 0.60 AND beats every licensed frame control.
//   score = frame accuracy; control = strongest licensed frame control.
//
//  R2 CLASSIFY. Codon tokens of every evaluable CDS (gold frame given: R2 isolates classification from R1), class read from the
//   reader's code state at the CDS end: stop | sense, where a disputed codon (TGA; AGA/AGG) whose status the evidence has not settled
//   takes the TRAIN default's nomination and is counted as a provisional typed gap (still scored: it is a prediction); only an
//   unreadable codon is unknown (a miss). Per genome macro-F1 over {stop, sense}; F1_c = 2TP/(2TP+FP+FN). CONTROLS: std_everywhere (TGA is
//   the only variant stop, no inference); deranged_stops (3 random non-stop codons as the stop set, seed per genome); all_sense;
//   nominate_all (TAA TAG TGA AGA AGG always stop). LICENCE: std_everywhere and nominate_all only if the split holds a genome whose
//   gold class differs from them (the statistic can move); deranged_stops and all_sense always. PASS R2 = mean macro-F1 >= 0.90 AND
//   real beats every licensed control. score = mean macro-F1; control = strongest licensed control mean.
//
//  R3 BEINGS. (a) UNDECLARED: scanGenome on the bare FASTA residues, matched against the evaluable gold with BEING MATCH. (b) DECLARED:
//   parseFeatures on the GenBank text: CDS features matched exactly (strand, parts sorted, partial flag) to the gold CDS; per-genome F1.
//   (c) CAUSALITY: prefix-stability violations over all genomes. CONTROLS (a): naive_orf (ATG only, standard stops, length gate, no
//   inference, no usage: the plain ORF finder); deranged_stops (stopOverride with 3 random non-stop codons); shuffled_sequence (the real
//   reader on the mononucleotide-shuffled genome scored against the real gold). (b): naive_regex (only simple forward a..b CDS ranges).
//   LICENCE: each control must score below the real arm on >= 50% of genomes (the statistic must move); a control that ties or beats
//   the real arm on most genomes is reported as BROKEN, not as an unlicensed pass. MECHANISM CLAIMS reported with their own sign
//   tests, not gating: usage_helps (real vs the reader without the usage nomination), inference_helps (real vs the reader with the
//   code fixed to the TRAIN default); a mechanism claim HOLDS iff sign-test p < ALPHA AND the mean F1 difference is >= 0.02. PASS R3 = mean F1(a) >= 0.60 AND real beats naive_orf, deranged_stops, shuffled_sequence
//   (licensed ones) AND (b) mean F1 >= 0.99 AND beats naive_regex AND zero prefix-stability violations.
//   score = mean F1(a); control = strongest licensed control mean.
//
//  R4 RELATIONS. Internal codon tokens (1 <= k <= len-2) of every evaluable CDS: the reader's committed amino acid (all attested
//   tables compatible with its code state agree) vs the NCBI /translation; an uncommitted codon is a typed gap codon_aa_underdetermined.
//   Per genome: coverage = committed/total, accuracy = correct/committed. CONTROLS are scored on the SAME committed tokens (matched
//   coverage): std_table (table 1 everywhere), deranged_table (the 64 codon->aa assignments of table 1 re-dealt by a derangement, seed
//   per genome), shifted_frame (the reader's table applied one nucleotide off). LICENCE: std_table only if the split holds an
//   alternate-code genome (>= 1 committed codon differs); the others always. PASS R4 = mean coverage >= 0.70 AND mean accuracy >= 0.98
//   AND real beats every licensed control. score = mean accuracy; control = strongest licensed control mean.
//
//  R5 AGREEMENT. (A) STRAND: beings of read(genome) vs read(reverse complement), keys mapped back, Jaccard; (B) RNA: read of the
//   genome transcribed to U vs the DNA reading, Jaccard (expected 1: U is folded onto T, a score below 1 is a notation-handling bug);
//   (C) PROTEIN: of the evaluable gold CDS, the share whose protein in NCBI's fasta_cds_aa agrees with the reader's translation of the
//   being sharing its stop (suffix agreement, the reader's undetermined residues X match anything). score_g = mean(A_g, C_g).
//   CONTROLS: deranged (A: B' keys rotated by n/3; C: the NCBI protein of a different CDS), std_table (reader with the code fixed to the TRAIN
//   default on both arms). LICENCE: deranged always; std_table only if an alternate-code genome is present. PASS R5 = B >= 0.99 of genomes
//   exactly 1 AND A >= 0.60 AND C >= 0.60 (macro) AND real beats every licensed control. score = mean(A, C); control = strongest licensed.
//
// PARAMETERS. DECLARED (provisional, P4): ALPHA 0.05; floors above (0.90, 0.99, 0.60, 0.70, 0.98); streams 40 lines; 100 windows of 240 nt;
// SEED 20261006; derangement seeds 11/23/37 for deranged_usage; 50 seeds for shuffled_verdicts; 0.5-nat licence margin; 0.02 minimal
// effect for a mechanism claim. DERIVED on TRAIN
// (in priors/notation-genetic-orf.json with grids and TRAIN scores): B (coding-window length, in codons), Lmin, Lconf (ORF length gates),
// start nominees (>= 5% of TRAIN annotated starts), GC-bin edges (tertiles of TRAIN genome GC), codon-usage tables.
//
// PREDICTIONS (my guesses before the first DEV run; failures are reported as failures)
//  P0  R0 system: positives >= 0.95, negatives >= 0.98 (alphabet-level identification is easy; passing it says little: deranged_profiles
//      and letter_permuted should fall near 0). R0 code: accuracy 0.65..0.85 (with the default filling unsettled genomes it cannot fall far below
//      the majority class); the evidence earns its keep only on alternate-code genomes; it beats majority_class and gc_stump only narrowly,
//      and the sign test against either may fail. pass: uncertain (p ~ 0.35).
//  P1  R1a: 1.00. R1b: macro accuracy 0.85..0.97 on dev (no genome above GC 0.55 except T. pallidum and adenovirus); stopfree_only ~ 0.5..0.75;
//      deranged_usage between them. pass: yes (p ~ 0.8).
//  P2  R2: macro-F1 0.90..0.98; the alternate-code genomes are where real beats std_everywhere (after the code is settled); wrong settlements on
//      standard-code genomes are where it loses. pass: uncertain (p ~ 0.5) because ties (genomes where the reader's state is the default) drop out
//      of the sign test.
//  P3  R3(a): mean F1 0.60..0.75 (TRAIN smoke ~0.68 in-sample); beats naive_orf mostly through the alternate-code genomes; usage_helps is
//      FALSE (mean difference < 0.02: the usage nomination barely moves F1); inference_helps TRUE (>= 0.02) on this mix of genomes. R3(b) >= 0.99.
//      Prefix-stability 0 violations. pass: p ~ 0.5, the floor and naive_orf being the risks.
//  P4  R4: coverage 0.75..0.90, accuracy >= 0.99; beats std_table on alternate-code genomes only. pass: yes (p ~ 0.65).
//  P5  R5: B = 1.0; A 0.60..0.80; C 0.55..0.75 (it inherits R3's recall). pass: uncertain (p ~ 0.4).
//
// LIMITS DISCLOSED. n = 19 dev genomes: a sign test needs >= 5 wins with no loss (>= 6 with one); genomes with one or two CDS (flaviviruses, polio)
// weigh as much as bacterial genomes in a macro mean; vertebrate mitogenomes are homologous across splits; the code is identified from stop
// behaviour only, so tables with the same stop class are one typed gap; Taxon-to-code lookup, introns, frameshifts, selenocysteine/pyrrolysine
// recoding and the T-written RNA of RNA viruses are not read (typed gaps). R0(a) is alphabet-level and close to a tautology for letter profiles;
// its information lies in latency, in the negatives and in the code arm.
//
// AMENDMENTS (append-only; each line: date, what, why; a bug fix never edits the claim above)
//   2026-10-06, BEFORE the first DEV run: after a TRAIN-only debug run of this instrument (in-sample, not a result) three design revisions were made.
//     (1) an unsettled code status falls back to the TRAIN default class (flagged provisional) for token classification (R2) and for the R0 code
//     verdict, because abstaining lost to the prior on standard-code genomes; (2) a mechanism claim needs an effect >= 0.02 on top of the sign test
//     (a 0.005 difference was 'significant' on TRAIN); (3) candidate-table caching (speed only). The R1 container parse, the matchers, the controls and
//     every floor are unchanged. Nothing has been changed after seeing DEV or TEST.
//   2026-10-06, AFTER the first full DEV run (the v1 card, kept in results/dev-run1.json with its own digest a4da9d95...): a diagnostic on the timelines showed
//     that the reader's code state FLAPPED (10..70 status changes per genome: settled -> unsettled -> settled at every look), a violation of READING-SPEC rule 2
//     (identity does not decay). v2 makes a settled status sticky: it is revoked only by the OPPOSITE verdict (log-likelihood ratio past the other threshold),
//     never by a return to unsettled. The claim, the matchers, the controls, the floors and the pass rules are unchanged; the TRAIN derivation was re-run (same
//     B, Lmin, Lconf). DEV run 2 is therefore NOT independent of DEV run 1 (the flaw was found on DEV); TEST has not been run. The instrument also now reports
//     stateChanges and wrongDecidedShare per genome (diagnostics, not gating).
//   2026-10-06, after DEV run 2 (v2, digest 94af4c6b...): BUG FIX in adapters/notation/genetic.js read(): the terminal codon of a being (the stop the reader
//     ended on) was translated as the code state said, so under an UNSETTLED state (TGA disputed) it became an undetermined X and the reader's protein ran one
//     residue past NCBI's; it is now always '*'. It touches R5 arm C only (R2/R4 translate the gold spans). Re-run as DEV run 3; claims, floors, rules unchanged.
//   2026-10-06, after DEV run 3 (digest c94ec7c6...), conformance only: R0 now hands each stream to a fresh listener one line at a time (as the CAUSALITY paragraph
//     already said) instead of through the adapter's identify() wrapper; the verdicts are identical. The final DEV card is DEV run 4 (this digest); numbers equal run 3.
//   2026-10-06, AFTER an independent adversarial review of the DEV run 4 card (digest 442bc312...), BEFORE any run of the amended instrument. The review planted mutants
//     (a two-pass lookahead reader, a reader with no beings, a reader with the ear removed, a real arm replaced by the naive ORF finder, space-free negatives, ...) through
//     the unmodified instrument and the instrument did not catch them. Findings F1..F6 below; every item makes the instrument STRICTER or more honest: no floor is lowered
//     and no pass rule is loosened, and the CLAIM paragraph above is untouched. Where a sentence above describes an older mechanism (K = half the genome; the licence of an
//     R3 control; R4 scored on committed codons), THIS AMENDMENT SUPERSEDES IT. DEV run 5a (digest dd193b80...) was the first run of the amended instrument and DEV run 5b (this digest, after amendment F1b) is the final
//     amended card; both are NOT independent of DEV runs 1-4 (the same DEV set, after the instrument was reviewed on it); TEST has not been run.
//     F1 CAUSALITY (R3c) was unfalsified. Prefix-stability is now checked at K in {n/20, n/10, n/4, n/2}, with the reader's full output (adapters/notation/genetic.js read():
//        every field of every being with at <= K: id, span, strand, at, how, llr, provisional, state, codons, ...) compared BOTH ways (read(full) restricted to at <= K against
//        read(first K residues)), and the code-state TIMELINE entries with at <= K compared entry by entry. Two PLANTED LOOKAHEAD readers are run through the same check on every
//        genome as controls built to fail: lookahead_state (pass 1 infers the final (TGA, AGR) state from the whole input; pass 2 emits with that state fixed from residue 0)
//        and lookahead_stamp (every being is stamped with the GC of the whole input). The check is LICENSED iff it flags each planted reader on >= 1 genome; an unlicensed
//        check leaves the causality claim unfalsified and R3 fails with gap causality_check_unlicensed. R3(c) passes iff the real reader has 0 violations at every K AND the check
//        is licensed. PREDICTION P3c: real reader 0 violations (the reviewer measured 0 at K = 0.05, 0.1, 0.25, 0.5n); lookahead_state flagged on >= 8 of 19 genomes; lookahead_stamp
//        flagged on every genome with a being before n/2.
//     F2 R0(a) NEGATIVES WERE SEPARABLE BY A DELIMITER GIVEN FOR FREE. The listener (adapters/notation/genetic.js createListener) now carries NULLS: a natural-language LETTER
//        background (UD treebank TRAIN profiles, the stems in the prior; eng/spa/deu/fra excluded so no source leaks) and the 26-letter flat null, and it names a notation only if
//        it beats BOTH by ln(1/alpha) nats AND fits (protein: composition goodness-of-fit with a TRAIN-derived tolerance; dna/rna: no letter outside the IUPAC-IUB nucleotide alphabet).
//        Typed refusals background_fits_better and profile_misfit:<notation> join not_genetic. Negatives are now FAMILIES, each built to need no whitespace to reject (except the two
//        delimiter families kept for continuity): prose_spaced (UD sentences), code (C/Go), wordlist (UD tokens one per line), caps_tokens (UD upper-case tokens; C macro name
//        parts), nospace_prose (UD sentences, letters only, 60-letter lines), shuffled_letters (the same lines, letters permuted within each line), cipher (the same lines, Caesar
//        shift 1..25 per stream, upper case), uniform_az (seeded uniform A-Z; SYNTHETIC), base64 and hex (of source-file bytes), peptide_3letter (the NCBI protein records of the
//        split's genomes spelled in the 3-letter code, e.g. MetLysVal; giver IUPAC-IUB 1983). Only prose_spaced and code are natural held-out streams; wordlist/caps_tokens are
//        natural tokens in a list; nospace_prose, shuffled_letters, cipher, base64, hex and peptide_3letter are DERIVED (deterministic transformations of natural data), uniform_az
//        is SYNTHETIC; none is presented as natural data. The diagnostic family flat20 (seeded uniform over the 20 amino-acid letters, SYNTHETIC) is REPORTED, NOT GATING: its gold is
//        contestable (a flat random peptide is a protein-alphabet string) and its composition lies inside the TRAIN protein envelope. NEGATIVES SCORE = macro over the gating families
//        (each family = mean over its sources); positives/negatives are reported by family, with the refusal reasons and the share of delimiter-bearing lines per family. NEW CONTROLS:
//        always_refuse (constant refusal; 0.5 by construction; always licensed) and delimiter_only (the pre-review rank-only listener, params {nulls: false}; LICENSED iff the split
//        holds >= 1 gating negative family with no delimiter in any line, measured on the streams; real must beat it by the sign test, which is what shows the nulls earn their keep).
//        The floors and the pass rule of R0 are unchanged (positives >= 0.90, negatives >= 0.90, beats every licensed system control, code accuracy >= 0.70, beats every licensed code
//        control). DISCLOSED LIMITS: the listener is composition-level (a string with protein composition in the wrong order is still named protein); flat20 and shuffled protein
//        residues are not refused; hex/base64 are refused because their lines carry digits (a non-letter alphabet refusal, kept as a family on purpose). PREDICTION P0': positives >= 0.90
//        (risks: mitochondrial-protein windows and SSU rRNA at the edge of the fit tolerance); every gating family >= 0.90 except wordlist and caps_tokens (few letters per line: the
//        first lines are undecidable, expected 0.80..0.95); delimiter_only below the real listener on every space-free family, near 0.0..0.3 on those; R0 pass p ~ 0.5.
//     F3 R4 WAS NEAR-TAUTOLOGICAL. Gold (NCBI /translation, made from gc.prt) and the reader's prior (gc.prt) share ONE giver, and the reader commits only where all attested tables agree,
//        so accuracy among committed codons is ~1 by construction: R4 tests CODE-STATE INFERENCE AND THE COMMIT POLICY, not the codon table (R5 arm C has the same shared-giver limit).
//        R4's headline is now TOKEN ACCURACY over ALL internal tokens, an uncommitted token counting as a MISS (coverage, abstention and committed accuracy are reported beside it);
//        every control is scored on all tokens too: std_table (table 1 everywhere), stop_class_only (table 1, but TGA read as W when the reader's code state says TGA is sense: the
//        reader's stop-class inference without its table inference), deranged_table, shifted_frame. std_table and stop_class_only are the HEADLINE controls; both are licensed iff they
//        are wrong on >= 1 gold token of the split (independent of the reader). The old matched-coverage comparison stays in details.committed_only (diagnostic, not gating). PASS R4 =
//        coverage >= 0.70 AND committed accuracy >= 0.98 (the floors unchanged) AND token accuracy beats every licensed control (sign test p < 0.05 and the mean). PREDICTION P4': the reader
//        abstains on ~8% of tokens (AAA, ATA... where attested tables disagree) and std_table is right on ~98-99% of tokens, so the reader's token accuracy (~0.92) is BELOW std_table's:
//        R4 FAILS and std_table is flagged BROKEN (p ~ 0.85).
//     F4 THE PASS COMBINATOR LEAKED. and() returned null if ANY conjunct was null, so a failed floor beside a null control test surfaced as pass=null ("unmeasured") instead of FAIL.
//        and() is now three-valued: false if any conjunct is false; null only if no conjunct is false and at least one is null; true otherwise. Whenever the beats-every-licensed-control
//        test is null (no control is licensed) the rung carries the typed gap no_licensed_control:<arm>.
//     F5 THE R3 LICENCE WAS CIRCULAR. A control was licensed iff the real arm beat it on >= 50% of genomes, so a control that tied or beat the real arm was silently dropped. Licences are
//        now independent of the real arm's score (data-based, like R1/R2): naive_orf is licensed iff the split holds an alternate-code genome or an evaluable gold CDS that starts on a
//        non-ATG codon (so its assumptions can be wrong); deranged_stops and shuffled_sequence are always licensed; naive_regex_declared is licensed iff the split holds a gold CDS the
//        regex cannot read (complement, join, partial). Every gating licensed control gets a STATUS: broken (its mean ties or beats the real arm: the instrument or the mechanism is broken;
//        pass = false; gap control_broken:<rung>.<arm>), not_significant (real ahead but sign test p >= 0.05; pass = false), ok. The statuses are in details.controlStatus of every rung.
//     F6 (the review item was cut off in the brief that reached this worker at "R1a (container lexemes) 'beats na"; read from the code: the R1a control naive_tokens had two of its four
//        checks hard-coded to 0, so real beat it BY CONSTRUCTION, ceiling 0.5). naive_tokens now ATTEMPTS all four checks with the dumbest tools that could succeed (id = the first
//        identifier-like token of the first line; position labels = every leading integer checked against the letters of the tokens before it, counted from the first integer-led line).
//        A competent REGEX container parser (regex_container: ORIGIN..// block with digits stripped, header regexes, label check) is run as a REPORTED, NON-GATING arm: R1a certifies that the
//        parse is correct, not that the container grammar beats a hand-written regex (PREDICTION P1': regex_container ties the real arm at 1.0; naive_tokens falls clearly below 0.99).
//   2026-10-06, after the FIRST run of the amended instrument (DEV run 5a) and after running the review's mutants against it (scratch trees under /private/tmp/claude-501/review/mutG2):
//     F1b a reader with a whole-input lookahead (mutant lookstate: pass 1 infers the final state, pass 2 emits with it fixed from residue 0) was flagged by R3(c) but R5 still passed on it,
//        because R2/R4/R5 do not run the prefix check themselves. CAUSALITY PRECONDITION: when the R3(c) prefix-stability check fails (a violation of the real reader, or an unlicensed check),
//        R2, R4 and R5 (which read the reader's timeline and beings) are FAILED with gap reader_not_causal, and meta.causalityPrecondition = failed. This is motivated by the mutant, not by any
//        DEV score, and it changes no result of the unmutated reader (0 violations, licensed check).
//     OUTCOME of the DEV run 5a predictions (kept here so the header, not memory, carries it): P3c HELD (real reader 0 violations in 2714 checks; lookahead_state flagged on 9 of 19 genomes,
//        lookahead_stamp on 18 of 19, the 19th emits no being before n/2); P1' HELD (regex_container 1.0 = real; naive_tokens 0.566); P4' HELD (R4 fails; std_table and stop_class_only both
//        BROKEN: token accuracy 0.918 against 0.973 and 0.980); P0' was WRONG on one point: wordlist and caps_tokens scored 1.0, not 0.80..0.95, because an 'undecided' verdict (too few
//        letters to name anything) is a typed refusal and counts as correct on a negative. P0' R0 pass: the system arm passes, the rung fails on the code arm as before (gc_stump not beaten significantly).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as G from "../../adapters/notation/genetic.js";
import * as L from "./genetic-lib.mjs";

export const FAMILY = "genetic";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
const PREREG = SELF.split("\n").filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith("//") || x.trim() === "")).join("\n");
export const PREREG_SHA256 = crypto.createHash("sha256").update(PREREG).digest("hex");

export const PRE = Object.freeze({
  ALPHA: 0.05, SEED: 20261006, STREAM_LINES: 40, WINDOWS: 100, WINDOW_NT: 240,
  FLOORS: { r0_pos: 0.9, r0_neg: 0.9, r0_code: 0.7, r1_container: 0.99, r1_frame: 0.6, r2: 0.9, r3: 0.6, r3_declared: 0.99, r4_cov: 0.7, r4_acc: 0.98, r5_A: 0.6, r5_C: 0.6, r5_B: 0.99 },
  LICENCE_NATS: 0.5, MECH_MIN_EFFECT: 0.02, DERANGE_SEEDS: [11, 23, 37], SHUFFLE_SEEDS: 50,
  CAUSAL_FRACTIONS: [1 / 20, 1 / 10, 1 / 4, 1 / 2], // amendment F1: prefix-stability is checked at these fractions of the genome
  LINE_WIDTH: 60, STREAMS_PER_SOURCE: 5,             // amendment F2: negative-family streams (40 lines of 60 letters)
  UD: { dev: ["eng", "spa"], test: ["eng", "spa", "deu", "fra"] },
  CODE_FILES: {
    dev: ["curl_curl/lib_http.c", "git_git/refs.c", "WireGuard_wireguard-go/device_send.go"],
    test: ["curl_curl/lib_url.c", "git_git/builtin_commit.c", "WireGuard_wireguard-go/device_noise-protocol.go", "apache_httpd/server_core.c"],
  },
  CODE_ROOT: "/Users/mlacy/Documents/3.0/ethos/09-source-code", UD_ROOT: "/private/tmp/claude-501/ud-eval",
});

// ── small helpers ────────────────────────────────────────────────────────────────────────────────
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seedOf = (s, extra = 0) => (PRE.SEED ^ fnv(String(s)) ^ extra) >>> 0;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const round = (x, d = 4) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(d));
const mean = L.mean;
function shape(id, rung, split, o = {}) {
  return { id, rung, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {}, ...o };
}
function unmeasured(id, rung, split, reason, extra = {}) {
  return shape(id, rung, split, { pass: null, gaps: [{ reason: "unmeasured", detail: reason, count: 1 }], ...extra });
}
function addGap(gaps, reason, count = 1) { if (!count) return; const g = gaps.find((x) => x.reason === reason); if (g) g.count += count; else gaps.push({ reason, count }); }
/**
 * the strongest LICENSED control and the pre-registered "beats every licensed control" test. arms: {name: {values:[per-unit], licensed, mean, gating?}}.
 * STATUS of each arm (amendment F5): unlicensed (never gates), reported (licensed but gating:false: shown, never gates), broken (a licensed gating control whose
 * mean TIES OR BEATS the real arm: the instrument or the mechanism is broken, pass = false), not_significant (real ahead, sign test p >= ALPHA: pass = false), ok.
 */
function versus(realVals, arms, realMean = null) {
  const out = { licensed: [], unlicensed: [], reported: [], broken: [], notSignificant: [], tests: {}, status: {}, strongest: null, beatsAll: null };
  let best = null, all = true, any = false;
  const rm = realMean ?? mean(realVals);
  for (const [name, a] of Object.entries(arms)) {
    const t = L.pairedSign(realVals, a.values);
    const gating = a.gating !== false;
    let status;
    if (!a.licensed) status = "unlicensed";
    else if (!gating) status = "reported";
    else if (!(rm > a.mean + 1e-12)) status = "broken";
    else if (!(t.p < PRE.ALPHA)) status = "not_significant";
    else status = "ok";
    out.status[name] = status;
    out.tests[name] = { ...t, realMean: round(rm), controlMean: round(a.mean), licensed: a.licensed, gating, status, licenceNote: a.licenceNote ?? null };
    if (!a.licensed) { out.unlicensed.push(name); continue; }
    if (!gating) { out.reported.push(name); continue; }
    any = true; out.licensed.push(name);
    if (best == null || a.mean > best.mean) best = { name, mean: a.mean };
    if (status === "broken") out.broken.push(name); else if (status === "not_significant") out.notSignificant.push(name);
    if (status !== "ok") all = false;
  }
  out.strongest = best; out.beatsAll = any ? all : null;
  return out;
}
/** the typed gaps a versus() result owes: no licensed control (the test is null) and every BROKEN control (amendments F4, F5). */
function controlGaps(gaps, vs, label) {
  if (vs.beatsAll === null) addGap(gaps, `no_licensed_control:${label}`);
  for (const n of vs.broken) addGap(gaps, `control_broken:${label}.${n}`);
  for (const n of vs.notSignificant) addGap(gaps, `control_not_beaten_significantly:${label}.${n}`);
}
const ge = (x, f) => (x == null ? null : x >= f);
/** THREE-VALUED conjunction (amendment F4): false if any conjunct is false; null only if none is false and at least one is null/undefined; true otherwise. */
const and = (...xs) => (xs.some((x) => x === false) ? false : xs.some((x) => x == null) ? null : true);

// ── corpus context ─────────────────────────────────────────────────────────────────────────────────
function makeCtx(split, limit, corpusRoot = null) {
  const all = L.splitRecords(split, corpusRoot ?? undefined);
  if (!all) return null;
  const recs = limit != null ? all.slice(0, limit) : all;
  const cache = new Map();
  const tables = L.loadTablesGold();
  const priors = G.loadPriors();
  const C = G.compilePriors(priors);
  const ctx = {
    split, recs, priors, C, tables, scans: new Map(),
    g(rec) {
      if (!cache.has(rec.acc)) cache.set(rec.acc, { rec, gold: L.loadGold(rec.acc), seq: L.loadGenomeSeq(rec.acc) });
      return cache.get(rec.acc);
    },
    gb(rec) { const o = this.g(rec); return (o.gb ??= L.loadGenbankText(rec.acc)); },
    fa(rec) { const o = this.g(rec); return (o.fa ??= L.loadFastaText(rec.acc)); },
    goldClass(rec) { const t = tables[String(rec.table_majority)]; return { tga: t.tga, agr: t.agr }; },
    scan(rec, variant = "real") {
      const key = rec.acc + ":" + variant;
      if (this.scans.has(key)) return this.scans.get(key);
      const o = this.g(rec); const def = C.defaults;
      let opts;
      if (variant === "real") opts = {};
      else if (variant === "noUsage") opts = { noUsage: true };
      else if (variant === "noInference") opts = { fixedState: { tga: def.tga, agr: def.agr } };
      else if (variant === "naive") opts = { naive: true };
      else throw new Error("variant " + variant);
      const t0 = Date.now();
      const sc = G.scanGenome(o.seq, { priors, ...opts });
      sc.ms = Date.now() - t0;
      this.scans.set(key, sc); return sc;
    },
  };
  return ctx;
}
const codeKey = (s) => `${s.tga}/${s.agr}`;

// ═══ R0 ═════════════════════════════════════════════════════════════════════════════════════════════
function nonBlank(text) { return text.split("\n").filter((l) => l.trim() !== ""); }
function windowLines(lines, start, n) { return lines.slice(start, start + n).join("\n"); }
const AZ = (t) => t.normalize("NFD").replace(/\p{M}+/gu, "").replace(/[^A-Za-z]/g, "");
const chunk = (letters, w = PRE.LINE_WIDTH) => letters.match(new RegExp(`.{1,${w}}`, "g")) ?? [];
// 3-letter amino-acid codes (IUPAC-IUB Joint Commission on Biochemical Nomenclature, 1983: a published standard; used only to SPELL negatives)
const AA3 = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile", L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", X: "Xaa", U: "Sec", O: "Pyl", B: "Asx", Z: "Glx", J: "Xle" };
const udCache = new Map();
/** UD treebank split -> {sentences: [# text lines], tokens: [FORM]} (document order). */
function readUd(stem, split) {
  const key = stem + "/" + split;
  if (udCache.has(key)) return udCache.get(key);
  const p = path.join(PRE.UD_ROOT, stem, `${split}.conllu`);
  let out = null;
  if (L.exists(p)) {
    const sentences = [], tokens = [];
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      if (line.startsWith("# text = ")) sentences.push(line.slice(9));
      else if (line && line[0] !== "#") { const f = line.split("\t"); if (/^\d+$/.test(f[0]) && f[1]) tokens.push(f[1]); }
    }
    out = { sentences, tokens };
  }
  udCache.set(key, out); return out;
}
/** the negative families. gating families make the negatives score; `prov` is natural | natural-tokens | derived | synthetic (never presented as natural held-out data). */
export const NEG_FAMILIES = Object.freeze({
  prose_spaced: { prov: "natural", gating: true }, code: { prov: "natural", gating: true },
  wordlist: { prov: "natural-tokens", gating: true }, caps_tokens: { prov: "natural-tokens", gating: true },
  nospace_prose: { prov: "derived", gating: true }, shuffled_letters: { prov: "derived", gating: true }, cipher: { prov: "derived", gating: true },
  uniform_az: { prov: "synthetic", gating: true }, base64: { prov: "derived", gating: true }, hex: { prov: "derived", gating: true },
  peptide_3letter: { prov: "derived", gating: true }, flat20: { prov: "synthetic", gating: false },
});
function buildStreams(ctx) {
  const streams = []; const gaps = [];
  const N = PRE.STREAM_LINES, W = PRE.LINE_WIDTH, S = PRE.STREAMS_PER_SOURCE;
  for (const rec of ctx.recs) {
    const gb = nonBlank(ctx.gb(rec)), fa = nonBlank(ctx.fa(rec));
    const oi = gb.findIndex((l) => l.startsWith("ORIGIN")), oe = gb.findIndex((l, i) => i > oi && l.startsWith("//"));
    const nOrig = oe - oi - 1, oStart = oi + 1 + Math.min(100, Math.max(0, nOrig - N - 5));
    const seqLines = fa.slice(1), fStart = Math.min(100, Math.max(0, seqLines.length - N - 5));
    const add = (kind, gold, text) => streams.push({ source: rec.acc, kind, gold, text, sourceType: "genome", family: "genome" });
    add("genbank_head", "genbank", windowLines(gb, 0, N));
    add("genbank_origin", "dna", windowLines(gb, oStart, N));
    add("fasta_dna", "dna", windowLines(fa, 0, N));
    add("bare_dna", "dna", windowLines(seqLines, fStart, N));
    const prot = L.loadProteins(rec.acc);
    if (prot.length) {
      const lines = []; const bare = [];
      for (const p of prot) { lines.push(">" + p.id); for (const x of p.seq.match(/.{1,60}/g) ?? []) { lines.push(x); bare.push(x); } if (lines.length > N + 5) break; }
      add("fasta_protein", "protein", windowLines(lines, 0, N)); add("bare_protein", "protein", windowLines(bare, 0, N));
      // NEGATIVE family peptide_3letter: the same protein records spelled in the 3-letter code (no delimiter anywhere), DERIVED
      const three = prot.map((p) => [...p.seq.toUpperCase()].map((ch) => AA3[ch] ?? "Xaa").join("")).join("");
      const pl = chunk(three, W);
      if (pl.length >= 10) streams.push({ source: `peptide3|${rec.acc}`, kind: "peptide3_0", gold: null, text: pl.slice(0, N).join("\n"), sourceType: "neg", family: "peptide_3letter" });
      else addGap(gaps, "peptide_3letter_source_too_short", 1);
    } else addGap(gaps, "no_protein_records_for_source", 1);
  }
  // RNA families (this split only): records written with U and no T are rna notation; T-written ones are a typed gap
  const rnaDir = path.join(L.ROOT, "raw", "rna");
  if (L.exists(rnaDir)) {
    for (const f of fs.readdirSync(rnaDir).filter((x) => x.startsWith(ctx.split + "_")).sort()) {
      const recs = L.parseFasta(fs.readFileSync(path.join(rnaDir, f), "utf8"));
      const pure = [], withT = [];
      for (const r of recs) { const u = r.seq.toUpperCase(); (u.includes("U") && !u.includes("T") ? pure : withT).push(r); }
      addGap(gaps, "rna_family_records_written_with_T", withT.length);
      addGap(gaps, "info:rna_family_records_scored", pure.length);
      const lines = []; const bare = [];
      for (const r of pure) { lines.push(">" + r.id); for (const x of r.seq.match(/.{1,60}/g) ?? []) { lines.push(x); bare.push(x); } }
      for (let i = 0; i < 3; i++) {
        const a = windowLines(lines, i * N, N), b = windowLines(bare, i * N, N);
        if (a.split("\n").length >= N) streams.push({ source: f, kind: `fasta_rna_${i}`, gold: "rna", text: a, sourceType: "rna", family: "genome" });
        if (b.split("\n").length >= N) streams.push({ source: f, kind: `bare_rna_${i}`, gold: "rna", text: b, sourceType: "rna", family: "genome" });
      }
    }
  }
  // ── NEGATIVES, by family (amendment F2) ────────────────────────────────────────────────────────────────
  const neg = (family, origin, kind, text) => streams.push({ source: `${family}|${origin}`, kind, gold: null, text, sourceType: "neg", family });
  for (const stem of PRE.UD[ctx.split] ?? []) {
    const ud = readUd(stem, ctx.split);
    if (!ud) { addGap(gaps, "negative_source_missing", 1); continue; }
    const origin = `ud:${stem}`;
    // prose_spaced: the original negatives (sentences with their spaces and punctuation)
    for (let i = 0; i < 5; i++) { const t = windowLines(ud.sentences, 100 + i * N, N); if (t.split("\n").length >= N) neg("prose_spaced", origin, `prose_${i}`, t); }
    // wordlist: one word per line (letters folded to A-Z), natural order of the treebank
    const words = ud.tokens.filter((x) => /^\p{L}+$/u.test(x)).map(AZ).filter((x) => x.length >= 2);
    for (let i = 0; i < S; i++) { const w = words.slice(1000 + i * N, 1000 + (i + 1) * N); if (w.length >= N) neg("wordlist", origin, `wordlist_${i}`, w.join("\n")); }
    // caps_tokens: the treebank's ASCII upper-case tokens of >= 2 letters (acronyms, initialisms), one per line
    const caps = ud.tokens.filter((x) => /^[A-Z]{2,}$/.test(x));
    for (let i = 0; i < S; i++) { const w = caps.slice(i * N, (i + 1) * N); if (w.length >= N) neg("caps_tokens", origin, `caps_${i}`, w.join("\n")); }
    if (caps.length < N) addGap(gaps, `caps_tokens_source_too_small:${origin}`, 1);
    // nospace_prose / shuffled_letters / cipher: the sentences' letters only, in 60-letter lines (no delimiter anywhere), then permuted / shifted
    const letters = AZ(ud.sentences.slice(100, 100 + 400).join(" "));
    const lines = chunk(letters);
    for (let i = 0; i < S; i++) {
      const w = lines.slice(i * N, (i + 1) * N); if (w.length < N) { addGap(gaps, `nospace_family_source_too_small:${origin}`, 1); continue; }
      neg("nospace_prose", origin, `nospace_${i}`, w.join("\n"));
      const rng = L.mulberry32(seedOf(origin + ":shuf", i));
      neg("shuffled_letters", origin, `shuf_${i}`, w.map((ln) => L.shuffled(ln.split(""), rng).join("")).join("\n"));
      const sh = 1 + Math.floor(L.mulberry32(seedOf(origin + ":cipher", i))() * 25);
      neg("cipher", origin, `cipher_${i}_s${sh}`, w.map((ln) => ln.toUpperCase().replace(/[A-Z]/g, (c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + sh) % 26)))).join("\n"));
    }
  }
  for (const f of PRE.CODE_FILES[ctx.split] ?? []) {
    const p = path.join(PRE.CODE_ROOT, f);
    if (!L.exists(p)) { addGap(gaps, "negative_source_missing", 1); continue; }
    const origin = `code:${f}`;
    const raw = fs.readFileSync(p); const text = raw.toString("utf8");
    const lines = nonBlank(text);
    for (let i = 0; i < 3; i++) { const t = windowLines(lines, 30 + i * 100, N); if (t.split("\n").length >= N) neg("code", origin, `code_${i}`, t); }
    // caps_tokens from C/Go macro names split on '_' (CURLE_OK -> CURLE, OK)
    const parts = [...text.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)].flatMap((m) => m[0].split("_")).filter((x) => /^[A-Z]{2,}$/.test(x));
    for (let i = 0; i < 3; i++) { const w = parts.slice(i * N, (i + 1) * N); if (w.length >= N) neg("caps_tokens", origin, `capscode_${i}`, w.join("\n")); }
    if (parts.length < N) addGap(gaps, `caps_tokens_source_too_small:${origin}`, 1);
    // base64 / hex of the file's own bytes (MIME-style 60-char lines): digits and +/= make these refusals an ALPHABET refusal, kept on purpose
    for (let i = 0; i < 3; i++) {
      const off = 4096 + i * 4096, b = raw.subarray(off, off + 4096);
      if (b.length < 2000) continue;
      neg("base64", origin, `b64_${i}`, chunk(b.toString("base64")).slice(0, N).join("\n"));
      neg("hex", origin, `hex_${i}`, chunk(b.toString("hex")).slice(0, N).join("\n"));
    }
  }
  // synthetic families (seeded; labelled SYNTHETIC): uniform A-Z, and the diagnostic flat20 (uniform over the 20 amino-acid letters)
  for (const [fam, alpha] of [["uniform_az", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"], ["flat20", "ACDEFGHIKLMNPQRSTVWY"]]) {
    for (let i = 0; i < S; i++) {
      const rng = L.mulberry32(seedOf(fam, i));
      const ls = Array.from({ length: N }, () => Array.from({ length: W }, () => alpha[Math.floor(rng() * alpha.length)]).join(""));
      neg(fam, "synthetic", `${fam}_${i}`, ls.join("\n"));
    }
  }
  return { streams, gaps };
}
/** feed the stream to a FRESH listener ONE LINE AT A TIME; the verdict after line i is read before line i+1 is handed over (causal, R0). */
function listen(text, priors, params = null) {
  const L0 = G.createListener({ priors, params }); const out = []; let i = 0;
  for (const line of text.split("\n")) { if (!line.trim()) continue; i++; const v = L0.feed(line); out.push({ line: i, system: v.system, gap: v.gap }); }
  return out;
}
function scoreStream(verdicts, gold) {
  if (!verdicts.length) return { acc: 0, d: null };
  if (gold === null) return { acc: verdicts.filter((v) => v.system === null).length / verdicts.length, d: null };
  const d = verdicts.findIndex((v) => v.system != null);
  if (d < 0) return { acc: 0, d: null };
  const win = verdicts.slice(d);
  return { acc: win.filter((v) => v.system === gold).length / win.length, d: d + 1 };
}
const residueLetters = (text) => text.split("\n").filter((l) => !l.startsWith(">")).join("").replace(/[^A-Za-z]/g, "").toUpperCase();
function meanLl(text, profile) { const s = residueLetters(text); if (!s.length) return null; let t = 0; for (let i = 0; i < s.length; i++) t += profile[s.charCodeAt(i)]; return t / s.length; }
function permuteLetters(text, rng) {
  const up = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); const p = L.derangement(26, rng); const map = {};
  up.forEach((c, i) => { map[c] = up[p[i]]; map[c.toLowerCase()] = up[p[i]].toLowerCase(); });
  return text.replace(/[A-Za-z]/g, (c) => map[c]);
}
function derangeProfiles(priors) {
  const clone = structuredClone(priors);
  const P = clone.alphabet.profiles;
  clone.alphabet.profiles = { dna: P.rna, rna: P.protein, protein: P.dna };
  return clone;
}
function measureR0(ctx) {
  const id = "genetic.r0.identify", rung = "r0";
  const priors = ctx.priors;
  if (!priors.ok) return unmeasured(id, rung, ctx.split, "priors missing: " + JSON.stringify(priors.gaps));
  const { streams, gaps } = buildStreams(ctx);
  const nullsActive = !!G.compilePriors(priors)?.alphabet?.nulls;
  if (!nullsActive) addGap(gaps, "listener_nulls_missing_in_prior(rank_only_listener)", 1);
  const realV = streams.map((s) => listen(s.text, priors));
  const real = realV.map((v, i) => scoreStream(v, streams[i].gold));
  const dpri = derangeProfiles(priors);
  const arms = { deranged_profiles: streams.map((s) => scoreStream(listen(s.text, dpri), s.gold)) };
  const permText = streams.map((s) => permuteLetters(s.text, L.mulberry32(seedOf("r0.letters", fnv(s.source + s.kind)))));
  arms.letter_permuted = streams.map((s, i) => scoreStream(listen(permText[i], priors), s.gold));
  // delimiter_only: the pre-review rank-only listener (no nulls, no fit): it refuses only on whitespace/punctuation/digits
  arms.delimiter_only = streams.map((s) => scoreStream(listen(s.text, priors, { nulls: false }), s.gold));
  // majority label over positive streams, and the constant refusal
  const lab = {}; for (const s of streams) if (s.gold) lab[s.gold] = (lab[s.gold] ?? 0) + 1;
  const maj = Object.entries(lab).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  arms.majority = streams.map((s) => ({ acc: s.gold === maj ? 1 : 0, d: 1 }));
  arms.always_refuse = streams.map((s) => ({ acc: s.gold === null ? 1 : 0, d: null }));
  // per source aggregation; per family aggregation (negatives: macro over GATING families)
  const sources = [...new Set(streams.map((s) => s.source))];
  const famOf = Object.fromEntries(streams.map((s) => [s.source, s.family]));
  const isPos = sources.map((s) => famOf[s] === "genome");
  const agg = (arr) => sources.map((src) => mean(arr.filter((_, i) => streams[i].source === src).map((x) => x.acc)));
  const realBy = agg(real);
  const armBy = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, agg(v)]));
  const families = [...new Set(sources.map((s) => famOf[s]))];
  const famScore = (vals) => Object.fromEntries(families.map((f) => [f, mean(vals.filter((_, i) => famOf[sources[i]] === f))]));
  const posOf = (vals) => mean(vals.filter((_, i) => isPos[i]));
  const negOf = (vals) => { const fs_ = famScore(vals); return mean(families.filter((f) => f !== "genome" && NEG_FAMILIES[f]?.gating).map((f) => fs_[f])); };
  const posAcc = posOf(realBy), negAcc = negOf(realBy);
  const bal = (vals) => mean([posOf(vals), negOf(vals)]);
  const score = mean([posAcc, negAcc]);
  // licence (measured on the text, not on verdicts): mean per-letter log-likelihood under the gold-class profile
  const compiled = G.compilePriors(priors).alphabet.profiles, dcomp = G.compilePriors(dpri).alphabet.profiles;
  const resStreams = streams.map((s, i) => ({ s, i })).filter(({ s }) => s.gold && s.gold !== "genbank");
  const llReal = mean(resStreams.map(({ s }) => meanLl(s.text, compiled[s.gold])));
  const llDer = mean(resStreams.map(({ s }) => meanLl(s.text, dcomp[s.gold])));
  const llPerm = mean(resStreams.map(({ s, i }) => meanLl(permText[i], compiled[s.gold])));
  // delimiter-bearing lines per family, measured on the streams: a line is delimiter-bearing iff it has a character that is not a letter
  const delimShare = {};
  for (const f of families) { const ls = streams.filter((s) => s.family === f).flatMap((s) => s.text.split("\n").filter((l) => l.trim() && l[0] !== ">")); delimShare[f] = ls.length ? ls.filter((l) => /[^A-Za-z]/.test(l)).length / ls.length : null; }
  const spaceFreeFamilies = families.filter((f) => f !== "genome" && NEG_FAMILIES[f]?.gating && delimShare[f] === 0);
  const lic = {
    majority: { ok: true, note: "constant label" },
    always_refuse: { ok: true, note: "constant refusal (0.5 by construction)" },
    deranged_profiles: { ok: llReal != null && llDer != null && llReal - llDer >= PRE.LICENCE_NATS, note: `mean ll real ${round(llReal)} vs deranged ${round(llDer)}` },
    letter_permuted: { ok: llReal != null && llPerm != null && llReal - llPerm >= PRE.LICENCE_NATS, note: `mean ll real ${round(llReal)} vs permuted text ${round(llPerm)}` },
    delimiter_only: { ok: spaceFreeFamilies.length > 0, note: `gating negative families with no delimiter in any line: ${spaceFreeFamilies.join(", ") || "none"}` },
  };
  const sys = {};
  for (const [k, v] of Object.entries(armBy)) sys[k] = { values: v, mean: bal(v), licensed: lic[k].ok, licenceNote: lic[k].note };
  const vs = versus(realBy, sys, score);
  controlGaps(gaps, vs, "r0.system");
  // by family: score, sources, refusal reasons, latency, and the delimiter_only rival beside the real listener
  const refusal = {}; const refusalOf = (i) => { const f = streams[i].family; for (const v of realV[i]) if (v.system == null) { const r = (refusal[f] ??= {}); r[v.gap] = (r[v.gap] ?? 0) + 1; } };
  streams.forEach((_, i) => refusalOf(i));
  const realFam = famScore(realBy), delimFam = famScore(armBy.delimiter_only);
  const byFamily = Object.fromEntries(families.map((f) => [f, {
    score: round(realFam[f]), delimiter_only: round(delimFam[f]), sources: sources.filter((s) => famOf[s] === f).length,
    streams: streams.filter((s) => s.family === f).length, lineDelimiterShare: round(delimShare[f]),
    provenance: f === "genome" ? "natural" : NEG_FAMILIES[f]?.prov ?? "?", gating: f === "genome" ? true : !!NEG_FAMILIES[f]?.gating,
    refusalReasons: refusal[f] ?? null,
  }]));
  const worstNeg = Object.entries(byFamily).filter(([f, v]) => f !== "genome" && v.gating).sort((a, b) => a[1].score - b[1].score)[0] ?? null;
  // latency
  const lat = streams.map((s, i) => ({ k: s.kind.replace(/_\d$/, ""), d: real[i].d })).filter((x) => x.d != null);
  const latBy = {}; for (const x of lat) (latBy[x.k] ??= []).push(x.d);
  const latency = Object.fromEntries(Object.entries(latBy).map(([k, v]) => [k, { median: L.median(v), max: Math.max(...v), n: v.length }]));
  const undecided = streams.filter((s, i) => s.gold && real[i].d == null).map((s) => `${s.source}/${s.kind}`);
  // gaps: why refusals happened on the positive streams (typed)
  const verdictGaps = {};
  streams.forEach((s, i) => { if (s.gold) for (const v of realV[i]) if (v.system == null) verdictGaps[v.gap] = (verdictGaps[v.gap] ?? 0) + 1; });
  for (const [k, c] of Object.entries(verdictGaps)) addGap(gaps, `positive_stream_lines_refused:${k}`, c);
  // (b) CODE CLASS
  const codeRows = ctx.recs.map((rec) => {
    const sc = ctx.scan(rec); const gc = ctx.goldClass(rec);
    const def0 = ctx.C.defaults; const fs0 = sc.finalState;
    const got = { tga: fs0.tga === "unknown" ? def0.tga : fs0.tga, agr: fs0.agr === "unknown" ? def0.agr : fs0.agr };
    return { acc: rec.acc, gold: gc, got, evidenced: fs0, strictOk: fs0.tga === gc.tga && fs0.agr === gc.agr, ok: got.tga === gc.tga && got.agr === gc.agr, gc: rec.gc, table: rec.table_majority, n: rec.length, firstDecisionAt: (sc.timeline.find((t) => t.tga !== "unknown") ?? {}).at ?? null };
  });
  const codeReal = codeRows.map((r) => (r.ok ? 1 : 0));
  const codeAcc = mean(codeReal);
  const goldClasses = new Set(codeRows.map((r) => codeKey(r.gold)));
  const def = ctx.C.defaults; const majC = { tga: def.tga, agr: def.agr };
  const majVals = codeRows.map((r) => (r.gold.tga === majC.tga && r.gold.agr === majC.agr ? 1 : 0));
  // gc_stump fit on TRAIN only
  const train = L.splitRecords("train") ?? [];
  const tr = train.map((r) => ({ gc: r.gc, sense: ctx.tables[String(r.table_majority)].tga === "sense" }));
  let bestT = 0, bestErr = Infinity;
  const cuts = [...new Set(tr.map((r) => r.gc))].sort((a, b) => a - b);
  for (let i = 0; i + 1 < cuts.length; i++) { const t = (cuts[i] + cuts[i + 1]) / 2; const err = tr.filter((r) => (r.gc < t) !== r.sense).length; if (err < bestErr) { bestErr = err; bestT = t; } }
  const stumpVals = codeRows.map((r) => { const p = { tga: r.gc < bestT ? "sense" : "stop", agr: "sense" }; return p.tga === r.gold.tga && p.agr === r.gold.agr ? 1 : 0; });
  // shuffled verdicts: mean over seeds of the accuracy when verdicts are re-dealt by a derangement
  const shufPer = codeRows.map(() => 0); let sh = 0;
  for (let s = 0; s < PRE.SHUFFLE_SEEDS; s++) { const d = L.derangement(codeRows.length, L.mulberry32(seedOf("r0.shuf", s))); if (!d) break; sh++; codeRows.forEach((r, i) => { const v = codeRows[d[i]].got; shufPer[i] += v.tga === r.gold.tga && v.agr === r.gold.agr ? 1 : 0; }); }
  const shufVals = shufPer.map((x) => (sh ? x / sh : 0));
  const multi = goldClasses.size >= 2;
  const codeArms = {
    majority_class: { values: majVals, mean: mean(majVals), licensed: multi && majVals.some((x) => x === 0), licenceNote: `gold classes in split: ${[...goldClasses].join(", ")}` },
    gc_stump: { values: stumpVals, mean: mean(stumpVals), licensed: multi && stumpVals.some((x) => x === 0), licenceNote: `TRAIN-fit threshold GC<${round(bestT)} => TGA sense (train errors ${bestErr}/${tr.length})` },
    shuffled_verdicts: { values: shufVals, mean: mean(shufVals), licensed: multi, licenceNote: `mean over ${sh} derangements` },
  };
  const codeVs = versus(codeReal, codeArms);
  controlGaps(gaps, codeVs, "r0.code");
  const exactTable = null; // table ids inside one stop class are not identifiable from content (typed gap)
  const codeGap = []; addGap(codeGap, "table_id_within_stop_class_unidentifiable", codeRows.length);
  for (const r of codeRows) if (r.evidenced.tga === "unknown" || r.evidenced.agr === "unknown") addGap(codeGap, "code_state_provisional_at_end(prior default used)", 1);
  const sysPass = and(ge(posAcc, PRE.FLOORS.r0_pos), ge(negAcc, PRE.FLOORS.r0_neg), vs.beatsAll);
  const codePass = and(ge(codeAcc, PRE.FLOORS.r0_code), codeVs.beatsAll);
  const out = shape(id, rung, ctx.split, {
    n: sources.length, score: round(score), control: vs.strongest ? round(vs.strongest.mean) : null,
    margin: vs.strongest ? round(score - vs.strongest.mean) : null, pass: and(sysPass, codePass),
    controls: Object.fromEntries([...Object.entries(sys).map(([k, v]) => [k, round(v.mean)]), ...Object.entries(codeArms).map(([k, v]) => ["code." + k, round(v.mean)])]),
    gaps: [...gaps, ...codeGap],
    notes: [
      "R0(a) negatives are FAMILIES that need no whitespace to reject (word lists, caps tokens, letters-only prose, shuffled letters, ciphertext, random A-Z, 3-letter peptides, base64, hex); negatives = macro over the gating families; see details.system.byFamily",
      "the listener names a notation only against letter nulls (natural-language background, 26-letter flat) and a fit test; delimiter_only is the pre-review rank-only listener (a control built to fail on the space-free families)",
      "RNA viruses are written with T in GenBank/FASTA; RNA notation is measured on Rfam families only.",
    ],
    details: {
      system: { positives: round(posAcc), negatives: round(negAcc), worstNegativeFamily: worstNeg ? { family: worstNeg[0], score: worstNeg[1].score } : null, sourcesN: sources.length, streamsN: streams.length, byFamily, nullsActive, controlTests: vs.tests, controlStatus: vs.status, licensed: vs.licensed, unlicensed: vs.unlicensed, pass: sysPass, latencyLines: latency, positiveStreamsNeverDecided: undecided, perSource: Object.fromEntries(sources.map((s, i) => [s, round(realBy[i])])) },
      code: { accuracy: round(codeAcc), strictAccuracy_unknownCountsWrong: round(mean(codeRows.map((r) => (r.strictOk ? 1 : 0)))), floor: PRE.FLOORS.r0_code, pass: codePass, controlTests: codeVs.tests, controlStatus: codeVs.status, rows: codeRows.map((r) => ({ acc: r.acc, table: r.table, gold: codeKey(r.gold), got: codeKey(r.got), evidenced: codeKey(r.evidenced), ok: r.ok, gc: r.gc, firstDecisionAt: r.firstDecisionAt })), byGoldClass: Object.fromEntries([...goldClasses].map((k) => [k, { n: codeRows.filter((r) => codeKey(r.gold) === k).length, correct: codeRows.filter((r) => codeKey(r.gold) === k && r.ok).length }])) },
      floors: { pos: PRE.FLOORS.r0_pos, neg: PRE.FLOORS.r0_neg, code: PRE.FLOORS.r0_code }, tableIdExact: exactTable,
      controlStatus: { ...vs.status, ...Object.fromEntries(Object.entries(codeVs.status).map(([k, v]) => ["code." + k, v])) },
    },
  });
  return out;
}

// ═══ R1 ═════════════════════════════════════════════════════════════════════════════════════════════
function residuesFromTokens(text, toks) { const parts = []; for (const t of toks) if (t.kind === "residues") parts.push(text.slice(t.start, t.end)); return parts.join(""); }
/**
 * NAIVE control of R1a (amendment F6): NO container grammar, but every one of the four checks is ATTEMPTED with the dumbest tool that could succeed
 * (it used to have two checks hard-coded to 0, so the real arm beat it by construction).
 *   residues: GenBank = every alphabetic whitespace token; FASTA = every line that does not start with '>'.
 *   ids:      FASTA = the first token of the first line minus a leading '>'; GenBank = the second token of the first line (positional, no LOCUS keyword).
 *   labels:   every line that starts with an integer is a label; it must equal 1 + the letters of the alphabetic tokens of all lines from the first
 *             integer-led line up to (not including) this one.
 */
function naiveContainerChecks(gb, fa, gold) {
  const naiveGbRes = (gb.match(/\b[A-Za-z]+\b/g) ?? []).join("").toUpperCase();
  const naiveFaRes = fa.split("\n").filter((l) => !l.startsWith(">")).join("").replace(/\s/g, "").toUpperCase();
  const gbExact = sha(naiveGbRes) === gold.seq_sha256, faExact = sha(naiveFaRes) === gold.seq_sha256;
  const fid = (fa.split("\n")[0].trim().split(/\s+/)[0] ?? "").replace(/^>/, "");
  const lid = gb.split("\n")[0].trim().split(/\s+/)[1] ?? null;
  const idsExact = fid === gold.version && lid === gold.version.split(".")[0];
  const lines = gb.split("\n"); let started = false, before = 0, ok = true, nlab = 0;
  for (const ln of lines) {
    const m = /^\s*(\d+)\b/.exec(ln);
    if (m) { started = true; nlab++; if (Number(m[1]) !== before + 1) ok = false; }
    if (started) before += (ln.match(/\b[A-Za-z]+\b/g) ?? []).join("").length;
  }
  return [gbExact, faExact, idsExact, ok && nlab > 0].map(Number);
}
/** a COMPETENT regex container parser (REPORTED, NON-GATING arm of R1a: it shows that the check certifies the parse, not that the grammar beats a regex). */
function regexContainerChecks(gb, fa, gold) {
  const blk = /^ORIGIN[^\n]*\n([\s\S]*?)^\/\//m.exec(gb);
  const gbRes = blk ? blk[1].replace(/[\d\s]/g, "").toUpperCase() : "";
  const faRes = fa.split("\n").filter((l) => l && !l.startsWith(">")).join("").replace(/\s/g, "").toUpperCase();
  const fid = /^>(\S+)/m.exec(fa)?.[1], lid = /^LOCUS\s+(\S+)/m.exec(gb)?.[1];
  const idsExact = fid === gold.version && lid === gold.version.split(".")[0];
  let before = 0, ok = true, nlab = 0;
  if (blk) for (const ln of blk[1].split("\n")) { const m = /^\s*(\d+)((?:\s+[A-Za-z]+)+)\s*$/.exec(ln); if (!m) continue; nlab++; if (Number(m[1]) !== before + 1) ok = false; before += m[2].replace(/\s/g, "").length; }
  return [sha(gbRes) === gold.seq_sha256, sha(faRes) === gold.seq_sha256, idsExact, ok && nlab > 0].map(Number);
}
function containerChecks(ctx, rec) {
  const o = ctx.g(rec); const gb = ctx.gb(rec), fa = ctx.fa(rec);
  const tg = G.ear(gb), tf = G.ear(fa);
  const gbRes = residuesFromTokens(gb, tg).toUpperCase(), faRes = residuesFromTokens(fa, tf).toUpperCase();
  const gbExact = sha(gbRes) === o.gold.seq_sha256, faExact = sha(faRes) === o.gold.seq_sha256;
  const fid = tf.find((t) => t.kind === "header")?.id, lid = tg.find((t) => t.kind === "locus")?.id;
  const idsExact = fid === o.gold.version && lid === o.gold.version.split(".")[0];
  // position labels: each ORIGIN coordinate = 1 + residues before its line
  let before = 0, ok = true, nlab = 0; let lastLine = -1;
  for (const t of tg) {
    if (t.kind === "coordinate") { if (t.value !== before + 1) ok = false; nlab++; lastLine = t.line; }
    else if (t.kind === "residues" && t.line === lastLine) before += t.end - t.start;
  }
  const posOk = ok && nlab > 0;
  return { real: [gbExact, faExact, idsExact, posOk].map(Number), naive: naiveContainerChecks(gb, fa, o.gold), regex: regexContainerChecks(gb, fa, o.gold), nlab };
}
function frameWindows(ctx, rec) {
  const o = ctx.g(rec); const rng = L.mulberry32(seedOf(rec.acc, 7));
  const cds = o.gold.cds.filter((c) => c.evaluable && c.end - c.start >= PRE.WINDOW_NT + 6);
  if (!cds.length) return [];
  const out = [];
  for (let i = 0; i < PRE.WINDOWS; i++) {
    const c = cds[Math.floor(rng() * cds.length)];
    const lo = c.start + 3, hi = c.end - 3 - PRE.WINDOW_NT; // window start range (inclusive)
    const ws = lo + Math.floor(rng() * (hi - lo + 1));
    const strand = c.strand === -1 ? "-" : "+";
    const anchor = c.strand === -1 ? c.end : c.start;
    out.push({ win: o.seq.slice(ws, ws + PRE.WINDOW_NT), strand, offset: (((anchor - ws) % 3) + 3) % 3 });
  }
  return out;
}
function derangeUsage(priors, seed) {
  const clone = structuredClone(priors); const rng = L.mulberry32(seed);
  for (const b of clone.orf.usage.bins) {
    const p = L.derangement(64, rng);
    const re = (tab) => Object.fromEntries(G.CODONS.map((c, i) => [c, tab[G.CODONS[p[i]]]]));
    b.inFrame = re(b.inFrame); b.shadow = re(b.shadow);
  }
  return clone;
}
function measureR1(ctx) {
  const id = "genetic.r1.hear", rung = "r1";
  const priors = ctx.priors;
  if (!priors.ok) return unmeasured(id, rung, ctx.split, "priors missing");
  const recs = ctx.recs;
  const gaps = [];
  // (a)
  const cc = recs.map((rec) => containerChecks(ctx, rec));
  const r1aReal = cc.map((c) => mean(c.real)), r1aNaive = cc.map((c) => mean(c.naive)), r1aRegex = cc.map((c) => mean(c.regex));
  const naiveLic = cc.filter((c) => c.naive[0] === 0).length / cc.length >= 0.5;
  const aVs = versus(r1aReal, {
    naive_tokens: { values: r1aNaive, mean: mean(r1aNaive), licensed: naiveLic, licenceNote: `naive genbank-residue check fails on ${cc.filter((c) => c.naive[0] === 0).length}/${cc.length} genomes` },
    regex_container: { values: r1aRegex, mean: mean(r1aRegex), licensed: true, gating: false, licenceNote: "a competent hand-written regex parser: REPORTED, NOT GATING (amendment F6)" },
  });
  controlGaps(gaps, aVs, "r1.container");
  if (aVs.tests.regex_container.controlMean >= aVs.tests.regex_container.realMean) addGap(gaps, "container_lexemes_tie_regex_baseline(parse_correct_not_better_than_regex)", 1);
  const r1a = mean(r1aReal);
  const aPass = and(ge(r1a, PRE.FLOORS.r1_container), aVs.beatsAll);
  // (b)
  const dArms = PRE.DERANGE_SEEDS.map((s) => ({ s, pr: derangeUsage(priors, s) }));
  const realV = [], stopfreeV = [], derV = PRE.DERANGE_SEEDS.map(() => []);
  let llTrueReal = [], llTrueDer = [], alive = [];
  let nWin = 0, allRefused = 0;
  const perGenome = [];
  for (const rec of recs) {
    const W = frameWindows(ctx, rec);
    if (!W.length) { realV.push(null); stopfreeV.push(null); derV.forEach((d) => d.push(null)); addGap(gaps, "no_evaluable_cds_ge_246nt", 1); continue; }
    let ok = 0, sf = 0; const dok = PRE.DERANGE_SEEDS.map(() => 0);
    for (const w of W) {
      nWin++;
      const h = G.hearFrame(w.win, { priors });
      if (h.gap) allRefused++;
      if (h.strand === w.strand && h.offset === w.offset) ok++;
      const hs = G.hearFrame(w.win, { priors, mode: "stopfree" });
      const al = hs.hypotheses ?? [];
      alive.push(al.length);
      if (al.some((x) => x.strand === w.strand && x.offset === w.offset)) sf += 1 / al.length;
      const ti = (w.strand === "+" ? 0 : 3) + w.offset;
      if (Number.isFinite(h.scores[ti])) llTrueReal.push(h.scores[ti]);
      dArms.forEach((d, j) => { const hd = G.hearFrame(w.win, { priors: d.pr }); if (hd.strand === w.strand && hd.offset === w.offset) dok[j]++; if (j === 0 && Number.isFinite(hd.scores[ti])) llTrueDer.push(hd.scores[ti]); });
    }
    realV.push(ok / W.length); stopfreeV.push(sf / W.length); dok.forEach((x, j) => derV[j].push(x / W.length));
    perGenome.push({ acc: rec.acc, gc: rec.gc, acc_real: round(ok / W.length), stopfree: round(sf / W.length), deranged: round(Math.max(...dok) / W.length) });
  }
  if (allRefused) addGap(gaps, "all_frames_refused_by_core_stops", allRefused);
  const derMeans = derV.map((v) => mean(v)); const bestJ = derMeans.indexOf(Math.max(...derMeans));
  const llGap = (mean(llTrueReal) ?? 0) - (mean(llTrueDer) ?? 0);
  const frameArms = {
    stopfree_only: { values: stopfreeV, mean: mean(stopfreeV), licensed: mean(alive) > 1.2, licenceNote: `mean surviving hypotheses ${round(mean(alive), 3)}` },
    deranged_usage: { values: derV[bestJ], mean: derMeans[bestJ], licensed: llGap >= PRE.LICENCE_NATS, licenceNote: `true-hypothesis log-odds: real - deranged = ${round(llGap)} nats/window; strongest seed ${PRE.DERANGE_SEEDS[bestJ]}` },
  };
  const bVs = versus(realV, frameArms);
  controlGaps(gaps, bVs, "r1.frame");
  const frameAcc = mean(realV);
  const bPass = and(ge(frameAcc, PRE.FLOORS.r1_frame), bVs.beatsAll);
  addGap(gaps, "frame_hearing_needs_no_table_told: core stops only (TGA/AGR not used)", recs.length);
  return shape(id, rung, ctx.split, {
    n: recs.length, score: round(frameAcc), control: bVs.strongest ? round(bVs.strongest.mean) : null,
    margin: bVs.strongest ? round(frameAcc - bVs.strongest.mean) : null, pass: and(aPass, bPass),
    controls: { naive_tokens_r1a: round(mean(r1aNaive)), regex_container_r1a: round(mean(r1aRegex)), stopfree_only: round(frameArms.stopfree_only.mean), deranged_usage: round(frameArms.deranged_usage.mean), chance: round(1 / 6) },
    gaps, notes: ["score is the codon-boundary (frame) accuracy; the container lexeme result is in details.container and gates the pass too."],
    details: {
      container: { score: round(r1a), floor: PRE.FLOORS.r1_container, pass: aPass, controlTests: aVs.tests, controlStatus: aVs.status, perGenome: recs.map((r, i) => ({ acc: r.acc, real: cc[i].real, naive: cc[i].naive, regex: cc[i].regex })) },
      frame: { accuracy: round(frameAcc), floor: PRE.FLOORS.r1_frame, windows: nWin, controlTests: bVs.tests, controlStatus: bVs.status, licensed: bVs.licensed, unlicensed: bVs.unlicensed, perGenome },
      controlStatus: { ...Object.fromEntries(Object.entries(aVs.status).map(([k, v]) => ["container." + k, v])), ...Object.fromEntries(Object.entries(bVs.status).map(([k, v]) => ["frame." + k, v])) },
    },
  });
}

// ═══ shared: codon tokens of the evaluable CDS under the reader's code state ═══════════════════════
function* tokensOf(ctx, rec, sc) {
  const o = ctx.g(rec);
  for (const c of o.gold.cds) {
    if (!c.evaluable) continue;
    if (!c.stop_complete) { yield { skip: "evaluable_without_complete_stop", cds: c }; continue; }
    const state = G.stateAt(sc.timeline, c.end);
    const tr = G.translateSpan(o.seq, c.start, c.end, c.strand === -1 ? "-" : "+", state, ctx.priors);
    yield { cds: c, tr, state };
  }
}

// ═══ R2 ═════════════════════════════════════════════════════════════════════════════════════════════
const STD_STOP = new Set(["TAA", "TAG", "TGA"]);
const ALL_STOP = new Set(["TAA", "TAG", "TGA", "AGA", "AGG"]);
function macroF1(conf) { // conf[gold][pred]
  const f = (cls) => { let tp = conf[cls][cls], fn = 0, fp = 0; for (const g of ["stop", "sense"]) for (const p of ["stop", "sense", "unknown"]) { if (g === cls && p !== cls) fn += conf[g][p]; if (g !== cls && p === cls) fp += conf[g][p]; } return tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null; };
  const a = f("stop"), b = f("sense");
  return { stop: a, sense: b, macro: mean([a, b]) };
}
function measureR2(ctx) {
  const id = "genetic.r2.classify", rung = "r2";
  if (!ctx.priors.ok) return unmeasured(id, rung, ctx.split, "priors missing");
  const gaps = []; const rows = [];
  const mk = () => ({ stop: { stop: 0, sense: 0, unknown: 0 }, sense: { stop: 0, sense: 0, unknown: 0 } });
  const arms = { real: [], std_everywhere: [], deranged_stops: [], all_sense: [], nominate_all: [] };
  const startRecall = { n: 0, hit: 0 }; const nomIdx = new Set(ctx.C.params.startNominees);
  let nTok = 0, nUnknown = 0, nProv = 0;
  for (const rec of ctx.recs) {
    const sc = ctx.scan(rec); const rng = L.mulberry32(seedOf(rec.acc, 2));
    const non = G.CODONS.filter((c) => !STD_STOP.has(c)); const dst = new Set(L.shuffled(non, rng).slice(0, 3));
    const cf = { real: mk(), std_everywhere: mk(), deranged_stops: mk(), all_sense: mk(), nominate_all: mk() };
    for (const t of tokensOf(ctx, rec, sc)) {
      if (t.skip) { addGap(gaps, t.skip, 1); continue; }
      t.tr.forEach((tok, k) => {
        const last = k === t.tr.length - 1;
        if (tok.provisional) nProv++;
        const gold = last ? "stop" : "sense";
        nTok++; cf.real[gold][tok.class]++; if (tok.class === "unknown") nUnknown++;
        cf.std_everywhere[gold][STD_STOP.has(tok.codon) ? "stop" : "sense"]++;
        cf.deranged_stops[gold][dst.has(tok.codon) ? "stop" : "sense"]++;
        cf.all_sense[gold].sense++;
        cf.nominate_all[gold][ALL_STOP.has(tok.codon) ? "stop" : "sense"]++;
        if (k === 0) { startRecall.n++; if (nomIdx.has(tok.codon)) startRecall.hit++; }
      });
    }
    const m = {}; for (const a of Object.keys(arms)) { m[a] = macroF1(cf[a]); arms[a].push(m[a].macro); }
    rows.push({ acc: rec.acc, table: rec.table_majority, state: codeKey(sc.finalState), stopF1: round(m.real.stop), senseF1: round(m.real.sense), macro: round(m.real.macro), std_everywhere: round(m.std_everywhere.macro) });
  }
  const altPresent = ctx.recs.some((r) => { const g = ctx.goldClass(r); return !(g.tga === "stop" && g.agr === "sense"); });
  const carms = {};
  const lic = { std_everywhere: altPresent, deranged_stops: true, all_sense: true, nominate_all: true };
  for (const k of ["std_everywhere", "deranged_stops", "all_sense", "nominate_all"]) carms[k] = { values: arms[k], mean: mean(arms[k]), licensed: lic[k], licenceNote: k === "std_everywhere" ? `alternate-code genomes in split: ${ctx.recs.filter((r) => { const g = ctx.goldClass(r); return !(g.tga === "stop" && g.agr === "sense"); }).length}` : null };
  const vs = versus(arms.real, carms);
  controlGaps(gaps, vs, "r2");
  const score = mean(arms.real);
  addGap(gaps, "token_class_unknown", nUnknown);
  addGap(gaps, "token_class_provisional_from_prior_default", nProv);
  return shape(id, rung, ctx.split, {
    n: ctx.recs.length, score: round(score), control: vs.strongest ? round(vs.strongest.mean) : null, margin: vs.strongest ? round(score - vs.strongest.mean) : null,
    pass: and(ge(score, PRE.FLOORS.r2), vs.beatsAll),
    controls: Object.fromEntries(Object.entries(carms).map(([k, v]) => [k, round(v.mean)])), gaps,
    notes: ["gold frame is given (R2 isolates classification from R1); unknown counts as a miss of the gold class", `tokens ${nTok}, unreadable ${nUnknown}, provisional (prior default, code not yet settled) ${nProv}`],
    details: { floor: PRE.FLOORS.r2, controlTests: vs.tests, controlStatus: vs.status, licensed: vs.licensed, unlicensed: vs.unlicensed, startNomineeRecall: startRecall.n ? round(startRecall.hit / startRecall.n) : null, perGenome: rows },
  });
}

// ═══ R3 ═════════════════════════════════════════════════════════════════════════════════════════════
function shuffledSeq(seq, rng) { const a = seq.split(""); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(""); }
function featureKey(strand, parts, partial) { return `${strand}|${parts.map((p) => `${p.start}-${p.end}:${p.strand}`).sort().join(",")}|${partial ? "p" : "c"}`; }
function declaredBeings(ctx, rec, naive = false) {
  const gb = ctx.gb(rec);
  if (naive) { const out = []; for (const m of gb.matchAll(/^ {5}CDS\s+(\d+)\.\.(\d+)\s*$/gm)) out.push(`1|${Number(m[1]) - 1}-${m[2]}:1|c`); return out; }
  return G.parseFeatures(gb, { keys: ["CDS"] }).filter((f) => f.parsed.ok).map((f) => { const ps = f.parsed.parts; const st = ps[0].strand; return featureKey(st, ps, f.parsed.partial); });
}
function goldDeclared(gold) { return gold.cds.map((c) => featureKey(c.strand ?? 1, c.parts, c.partial)); }
function f1Sets(pred, goldArr) {
  const g = new Set(goldArr), p = new Set(pred);
  let tp = 0; for (const x of p) if (g.has(x)) tp++;
  const prec = p.size ? tp / p.size : null, rec = g.size ? tp / g.size : null;
  return prec != null && rec != null ? (prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0) : (g.size === 0 && p.size === 0 ? 1 : 0);
}
// ── causality (amendment F1): prefix-stability at several K, whole beings, both directions, plus the code-state timeline ───────────────────
const canonJson = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));
/**
 * prefixStability(readFn, seq, fractions) where readFn(seq) -> {beings, timeline}. For each fraction f, K = floor(f * n): the beings of read(full) with at <= K
 * must equal, field for field, the beings of read(first K residues); the timeline entries with at <= K must equal the prefix's timeline entry by entry.
 * Returns {violations, checked, perK[]}. A violation is a being (or timeline entry) present on one side only or different on any field.
 */
export function prefixStability(readFn, seq, fractions = PRE.CAUSAL_FRACTIONS) {
  const full = readFn(seq);
  const perK = []; let violations = 0, checked = 0;
  for (const f of fractions) {
    const K = Math.floor(seq.length * f);
    const pre = readFn(seq.slice(0, K));
    const exp = full.beings.filter((b) => b.at <= K).map(canonJson), got = pre.beings.map(canonJson);
    const bal = new Map();
    for (const x of exp) bal.set(x, (bal.get(x) ?? 0) + 1);
    for (const x of got) bal.set(x, (bal.get(x) ?? 0) - 1);
    let vb = 0; for (const v of bal.values()) vb += Math.abs(v);
    const ft = full.timeline.filter((t) => t.at <= K).map(canonJson), pt = pre.timeline.map(canonJson);
    let vt = Math.abs(ft.length - pt.length); for (let i = 0; i < Math.min(ft.length, pt.length); i++) if (ft[i] !== pt[i]) vt++;
    perK.push({ f: round(f, 4), K, beings: exp.length, timelineEntries: ft.length, violationsBeings: vb, violationsTimeline: vt });
    violations += vb + vt; checked += exp.length + ft.length;
  }
  return { violations, checked, perK };
}
const readerOf = (priors) => (seq) => { const o = G.read(">x\n" + seq + "\n", { priors }); return { beings: o.beings, timeline: o.code?.timeline ?? [] }; };
/** PLANTED LOOKAHEAD (control built to fail): pass 1 infers the final (TGA, AGR) state from the WHOLE input, pass 2 emits with that state fixed from residue 0. */
const lookaheadStateReader = (priors, def) => (seq) => {
  const w = G.scanGenome(seq, { priors }).finalState;
  const st = { tga: w.tga === "unknown" ? def.tga : w.tga, agr: w.agr === "unknown" ? def.agr : w.agr };
  const o = G.read(">x\n" + seq + "\n", { priors, fixedState: st });
  return { beings: o.beings, timeline: o.code?.timeline ?? [] };
};
/** PLANTED LOOKAHEAD (control built to fail): the real reader, every being stamped with the GC of the whole input. */
const lookaheadStampReader = (priors) => (seq) => {
  const r = readerOf(priors)(seq); let g = 0, a = 0;
  for (let i = 0; i < seq.length; i++) { const c = seq[i]; if (c === "G" || c === "C") g++; else if (c === "A" || c === "T") a++; }
  const gcWhole = g / Math.max(1, g + a);
  return { beings: r.beings.map((b) => ({ ...b, gcWhole })), timeline: r.timeline };
};

function measureR3(ctx) {
  const id = "genetic.r3.beings", rung = "r3";
  if (!ctx.priors.ok) return unmeasured(id, rung, ctx.split, "priors missing");
  const gaps = [];
  const V = { real: [], naive_orf: [], deranged_stops: [], shuffled_sequence: [], noUsage: [], noInference: [] };
  const declared = [], declaredNaive = [], per = [];
  const def = ctx.C.defaults;
  const readReal = readerOf(ctx.priors), readState = lookaheadStateReader(ctx.priors, def), readStamp = lookaheadStampReader(ctx.priors);
  const causal = { real: { violations: 0, checked: 0, perK: {} }, lookahead_state: { flaggedGenomes: 0, violations: 0 }, lookahead_stamp: { flaggedGenomes: 0, violations: 0 }, perGenome: [] };
  let nonAtg = 0, nonSimple = 0, nEvalCds = 0;
  for (const rec of ctx.recs) {
    const o = ctx.g(rec); const gold = o.gold;
    const m = (sc) => L.matchBeings(sc.beings, gold);
    const real = ctx.scan(rec); const mr = m(real);
    V.real.push(mr.f1 ?? 0);
    V.naive_orf.push(m(ctx.scan(rec, "naive")).f1 ?? 0);
    V.noUsage.push(m(ctx.scan(rec, "noUsage")).f1 ?? 0);
    V.noInference.push(m(ctx.scan(rec, "noInference")).f1 ?? 0);
    const rng = L.mulberry32(seedOf(rec.acc, 3));
    const non = G.CODONS.filter((c) => !STD_STOP.has(c)); const dst = L.shuffled(non, rng).slice(0, 3);
    V.deranged_stops.push(m(G.scanGenome(o.seq, { priors: ctx.priors, stopOverride: dst })).f1 ?? 0);
    V.shuffled_sequence.push(m(G.scanGenome(shuffledSeq(o.seq, L.mulberry32(seedOf(rec.acc, 4))), { priors: ctx.priors })).f1 ?? 0);
    // declared
    const g = goldDeclared(gold);
    declared.push(f1Sets(declaredBeings(ctx, rec), g)); declaredNaive.push(f1Sets(declaredBeings(ctx, rec, true), g));
    // data facts for the licences (independent of any reader's score)
    for (const c of gold.cds) {
      if (c.strand === -1 || c.n_parts > 1 || c.partial) nonSimple++;
      if (!c.evaluable) continue;
      nEvalCds++;
      const codon = c.strand === -1 ? G.revcomp(o.seq.slice(c.end - 3, c.end)) : o.seq.slice(c.start, c.start + 3);
      if (codon !== "ATG") nonAtg++;
    }
    // causality (amendment F1): the real reader and the two planted lookahead readers, through the same check
    const ps = prefixStability(readReal, o.seq), pS = prefixStability(readState, o.seq), pT = prefixStability(readStamp, o.seq);
    causal.real.violations += ps.violations; causal.real.checked += ps.checked;
    ps.perK.forEach((k) => { const a = (causal.real.perK[k.f] ??= { K_example: k.K, beings: 0, timelineEntries: 0, violations: 0 }); a.beings += k.beings; a.timelineEntries += k.timelineEntries; a.violations += k.violationsBeings + k.violationsTimeline; });
    if (pS.violations > 0) causal.lookahead_state.flaggedGenomes++; causal.lookahead_state.violations += pS.violations;
    if (pT.violations > 0) causal.lookahead_stamp.flaggedGenomes++; causal.lookahead_stamp.violations += pT.violations;
    causal.perGenome.push({ acc: rec.acc, real: ps.violations, lookahead_state: pS.violations, lookahead_stamp: pT.violations });
    // typed gaps from gold
    for (const c of gold.cds) {
      if (c.evaluable) continue;
      const why = c.pseudo ? "cds_pseudo" : c.partial ? "cds_partial" : c.n_parts > 1 ? (c.wraps_origin ? "cds_join_across_origin" : "cds_joined_spliced_or_slippage") : c.transl_except.length ? "cds_translation_exception_or_incomplete_stop" : "cds_other_nonevaluable";
      addGap(gaps, why, 1);
    }
    addGap(gaps, "non_protein_genes_not_read", gold.non_cds.length);
    const decisionAt = (real.timeline.find((t) => t.tga !== "unknown") ?? {}).at ?? null;
    const gcl = ctx.goldClass(rec); let wrongShare = 0;
    real.timeline.forEach((t, i) => { const end = real.timeline[i + 1]?.at ?? o.seq.length; const okT = t.tga === gcl.tga || t.tga === "unknown", okA = t.agr === gcl.agr || t.agr === "unknown"; if (!(okT && okA)) wrongShare += end - t.at; });
    const post = decisionAt != null ? L.matchBeings(real.beings, gold, { filter: (b) => b.at >= decisionAt }) : null;
    per.push({ acc: rec.acc, gc: rec.gc, table: rec.table_majority, nEval: mr.nGold, beings: real.beings.length, precision: round(mr.precision), recall: round(mr.recall), f1: round(mr.f1), naive_orf: round(V.naive_orf.at(-1)), noUsage: round(V.noUsage.at(-1)), noInference: round(V.noInference.at(-1)), state: codeKey(real.finalState), stateChanges: real.timeline.length - 1, wrongDecidedShare: round(wrongShare / o.seq.length), decisionAt, postDecisionPrecision: post ? round(post.precision) : null, declaredF1: round(declared.at(-1)), ms: real.ms });
  }
  const nAlt = ctx.recs.filter((r) => { const g = ctx.goldClass(r); return !(g.tga === "stop" && g.agr === "sense"); }).length;
  const altPresent = nAlt > 0;
  // LICENCES are properties of the DATA and of the perturbation, never of the real arm's score (amendment F5)
  const mk = (vals, licensed, licenceNote) => ({ values: vals, mean: mean(vals), licensed, licenceNote });
  const arms = {
    naive_orf: mk(V.naive_orf, altPresent || nonAtg > 0, `its assumptions can be wrong here: alternate-code genomes ${nAlt}, evaluable gold CDS on a non-ATG start ${nonAtg}/${nEvalCds}`),
    deranged_stops: mk(V.deranged_stops, true, "built to fail; always licensed"),
    shuffled_sequence: mk(V.shuffled_sequence, true, "built to fail; always licensed"),
  };
  const vs = versus(V.real, arms);
  controlGaps(gaps, vs, "r3.undeclared");
  const score = mean(V.real);
  const dVs = versus(declared, { naive_regex: mk(declaredNaive, nonSimple > 0, `gold CDS the regex cannot read (complement / join / partial): ${nonSimple}`) });
  controlGaps(gaps, dVs, "r3.declared");
  const dMean = mean(declared);
  const mech = {
    usage_helps: { ...L.pairedSign(V.real, V.noUsage), realMean: round(score), controlMean: round(mean(V.noUsage)), predicted: false },
    inference_helps: { ...L.pairedSign(V.real, V.noInference), realMean: round(score), controlMean: round(mean(V.noInference)), predicted: true },
  };
  mech.usage_helps.holds = mech.usage_helps.p < PRE.ALPHA && score - mean(V.noUsage) >= PRE.MECH_MIN_EFFECT;
  mech.inference_helps.holds = mech.inference_helps.p < PRE.ALPHA && score - mean(V.noInference) >= PRE.MECH_MIN_EFFECT;
  const checkLicensed = causal.lookahead_state.flaggedGenomes >= 1 && causal.lookahead_stamp.flaggedGenomes >= 1;
  if (!checkLicensed) addGap(gaps, "causality_check_unlicensed(cannot_flag_a_planted_lookahead)", 1);
  const causalPass = and(causal.real.violations === 0, checkLicensed);
  const pass = and(ge(score, PRE.FLOORS.r3), vs.beatsAll, ge(dMean, PRE.FLOORS.r3_declared), dVs.beatsAll, causalPass);
  return shape(id, rung, ctx.split, {
    n: ctx.recs.length, score: round(score), control: vs.strongest ? round(vs.strongest.mean) : null, margin: vs.strongest ? round(score - vs.strongest.mean) : null, pass,
    controls: { naive_orf: round(mean(V.naive_orf)), deranged_stops: round(mean(V.deranged_stops)), shuffled_sequence: round(mean(V.shuffled_sequence)), ablation_no_usage: round(mean(V.noUsage)), ablation_no_inference: round(mean(V.noInference)), naive_regex_declared: round(mean(declaredNaive)) },
    gaps, notes: [
      `declared (GenBank features) mean F1 ${round(dMean)}; prefix-stability violations of the real reader ${causal.real.violations}/${causal.real.checked} (beings + timeline entries, K = n/20, n/10, n/4, n/2)`,
      `the causality check flags the planted lookahead readers on ${causal.lookahead_state.flaggedGenomes} (state) and ${causal.lookahead_stamp.flaggedGenomes} (stamp) of ${ctx.recs.length} genomes (licence: >= 1 each)`,
      "match = same strand + same stop codon; non-evaluable gold CDS are ignored (not false positives); start exactness not required",
      "ablations (no_usage, no_inference) are mechanism claims reported in details.mechanism, not gating",
    ],
    details: { floor: PRE.FLOORS.r3, controlTests: vs.tests, controlStatus: { ...vs.status, ...Object.fromEntries(Object.entries(dVs.status).map(([k, v]) => [k + "_declared", v])) }, licensed: vs.licensed, unlicensed: vs.unlicensed, mechanism: mech, declared: { mean: round(dMean), floor: PRE.FLOORS.r3_declared, controlTests: dVs.tests }, causality: { violations: causal.real.violations, checked: causal.real.checked, pass: causalPass, fractions: PRE.CAUSAL_FRACTIONS, perK: causal.real.perK, checkLicensed, planted: { lookahead_state: causal.lookahead_state, lookahead_stamp: causal.lookahead_stamp }, perGenome: causal.perGenome }, alternateCodeGenomesPresent: altPresent, licenceFacts: { alternateCodeGenomes: nAlt, nonAtgStarts: nonAtg, evaluableCds: nEvalCds, goldCdsNotReadableByRegex: nonSimple }, perGenome: per },
  });
}

// ═══ R4 ═════════════════════════════════════════════════════════════════════════════════════════════
/**
 * Token scores of ONE genome (amendment F3): the headline is TOKEN ACCURACY over ALL internal tokens, an uncommitted token counting as a MISS. `rows` are
 * [{committed, aa, goldAa, stdAa, sclAa, derAa, shiftAa}] (stdAa = table 1; sclAa = table 1 with TGA read as W when the reader's state says TGA is sense; derAa = a
 * deranged table; shiftAa = the reader's table one nucleotide off, null where it does not commit).
 */
function tokenScores(rows) {
  const tot = rows.length; let com = 0, ok = 0, std = 0, scl = 0, der = 0, shift = 0, stdC = 0, sclC = 0, derC = 0, shiftC = 0, stdWrong = 0, sclWrong = 0;
  for (const r of rows) {
    if (r.committed) { com++; if (r.aa === r.goldAa) ok++; if (r.stdAa === r.goldAa) stdC++; if (r.sclAa === r.goldAa) sclC++; if (r.derAa === r.goldAa) derC++; if (r.shiftAa === r.goldAa) shiftC++; }
    if (r.stdAa === r.goldAa) std++; else stdWrong++;
    if (r.sclAa === r.goldAa) scl++; else sclWrong++;
    if (r.derAa === r.goldAa) der++;
    if (r.shiftAa != null && r.shiftAa === r.goldAa) shift++;
  }
  const d = (x, n) => (n ? x / n : null);
  return { tokens: tot, coverage: d(com, tot), abstention: d(tot - com, tot), committedAccuracy: d(ok, com), tokenAccuracy: d(ok, tot), std_table: d(std, tot), stop_class_only: d(scl, tot), deranged_table: d(der, tot), shifted_frame: d(shift, tot), committed_only: { std_table: d(stdC, com), stop_class_only: d(sclC, com), deranged_table: d(derC, com), shifted_frame: d(shiftC, com) }, stdWrong, sclWrong };
}
function measureR4(ctx) {
  const id = "genetic.r4.relations", rung = "r4";
  if (!ctx.priors.ok) return unmeasured(id, rung, ctx.split, "priors missing");
  const gaps = []; const C = ctx.C;
  const t1 = C.tables["1"]; if (!t1) return unmeasured(id, rung, ctx.split, "table 1 missing from the codon prior");
  const idxTGA = G._internals.IDX.TGA;
  const S = []; const per = [];
  const underCodons = {};
  let initN = 0, initHit = 0; const nomSet = new Set(C.params.startNominees);
  let stdWrongAll = 0, sclWrongAll = 0;
  for (const rec of ctx.recs) {
    const sc = ctx.scan(rec); const o = ctx.g(rec);
    const rng = L.mulberry32(seedOf(rec.acc, 5));
    const perm = L.derangement(64, rng);
    const rows = [];
    for (const t of tokensOf(ctx, rec, sc)) {
      if (t.skip) { addGap(gaps, t.skip, 1); continue; }
      const c = t.cds; const tr = t.tr; const prot = c.translation;
      initN++; if (nomSet.has(tr[0].codon)) initHit++;
      for (let k = 1; k <= tr.length - 2 && k < prot.length; k++) {
        const tok = tr[k]; const goldAa = prot[k];
        if (!tok.committed) underCodons[tok.codon] = (underCodons[tok.codon] ?? 0) + 1;
        const ci = G.codonIndex(tok.codon);
        const stdAa = ci >= 0 ? t1.aa[ci] : null;
        const sclAa = ci === idxTGA && G.classifyCodon(ci, t.state, C) === "sense" ? "W" : stdAa; // the reader's stop-class inference only, table 1 elsewhere
        const derAa = ci >= 0 ? t1.aa[perm[ci]] : null;
        let shiftAa = null; // the reader's table applied one nucleotide off
        const p = tok.pos + (c.strand === -1 ? -1 : 1);
        if (p >= 0 && p + 3 <= o.seq.length) { const tri = o.seq.slice(p, p + 3); const cod = c.strand === -1 ? G.revcomp(tri) : tri; const ai = G.aaFor(G.codonIndex(cod), t.state, C); shiftAa = ai.committed ? ai.aa : null; }
        rows.push({ committed: tok.committed, aa: tok.aa, goldAa, stdAa, sclAa, derAa, shiftAa });
      }
    }
    const sc4 = tokenScores(rows);
    S.push(sc4); stdWrongAll += sc4.stdWrong; sclWrongAll += sc4.sclWrong;
    per.push({ acc: rec.acc, table: rec.table_majority, state: codeKey(sc.finalState), tokens: sc4.tokens, coverage: round(sc4.coverage), committedAccuracy: round(sc4.committedAccuracy), tokenAccuracy: round(sc4.tokenAccuracy), std_table: round(sc4.std_table), stop_class_only: round(sc4.stop_class_only) });
  }
  const col = (k) => S.map((x) => x[k]);
  const acc = col("tokenAccuracy"), cov = col("coverage"), commAcc = col("committedAccuracy");
  // LICENCES: independent of the reader. std_table / stop_class_only can fail iff table 1 (the stop-class variant) is wrong on >= 1 gold token of the split.
  const arms = {
    std_table: { values: col("std_table"), mean: mean(col("std_table")), licensed: stdWrongAll > 0, licenceNote: `gold tokens table 1 gets wrong: ${stdWrongAll}` },
    stop_class_only: { values: col("stop_class_only"), mean: mean(col("stop_class_only")), licensed: sclWrongAll > 0, licenceNote: `gold tokens the stop-class-only variant gets wrong: ${sclWrongAll}` },
    deranged_table: { values: col("deranged_table"), mean: mean(col("deranged_table")), licensed: true, licenceNote: "built to fail; always licensed" },
    shifted_frame: { values: col("shifted_frame"), mean: mean(col("shifted_frame")), licensed: true, licenceNote: "built to fail; always licensed" },
  };
  const vs = versus(acc, arms);
  controlGaps(gaps, vs, "r4");
  const score = mean(acc), coverage = mean(cov), committedAcc = mean(commAcc);
  const topUnder = Object.entries(underCodons).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [c, n] of topUnder) addGap(gaps, `codon_aa_underdetermined:${c}`, n);
  const committedOnly = Object.fromEntries(["std_table", "stop_class_only", "deranged_table", "shifted_frame"].map((k) => [k, round(mean(S.map((x) => x.committed_only[k])))]));
  return shape(id, rung, ctx.split, {
    n: ctx.recs.length, score: round(score), control: vs.strongest ? round(vs.strongest.mean) : null, margin: vs.strongest ? round(score - vs.strongest.mean) : null,
    pass: and(ge(coverage, PRE.FLOORS.r4_cov), ge(committedAcc, PRE.FLOORS.r4_acc), vs.beatsAll),
    controls: { std_table: round(arms.std_table.mean), stop_class_only: round(arms.stop_class_only.mean), deranged_table: round(arms.deranged_table.mean), shifted_frame: round(arms.shifted_frame.mean), coverage: round(coverage), committed_accuracy: round(committedAcc) },
    gaps, notes: [
      "score is TOKEN ACCURACY over ALL internal tokens; an uncommitted token is a miss (abstention = 1 - coverage); controls are scored on all tokens too (amendment F3)",
      "R4's gold (NCBI /translation) and the reader's prior (gc.prt) share one giver: committed accuracy is ~1 by construction, so R4 tests code-state inference and the commit policy, not the codon table",
      "the first codon (initiator rule) is reported in details; the matched-coverage comparison of the earlier card is kept in details.committed_only (diagnostic, not gating)",
    ],
    details: { floors: { coverage: PRE.FLOORS.r4_cov, accuracy: PRE.FLOORS.r4_acc }, coverage: round(coverage), abstention: round(1 - coverage), committedAccuracy: round(committedAcc), tokenAccuracy: round(score), controlTests: vs.tests, controlStatus: vs.status, licensed: vs.licensed, unlicensed: vs.unlicensed, committed_only: committedOnly, initiatorNomineeRecall: initN ? round(initHit / initN) : null, topUnderdeterminedCodons: topUnder, perGenome: per },
  });
}

// ═══ R5 ═════════════════════════════════════════════════════════════════════════════════════════════
function keysOf(beings, n, flip = false, shift = 0) {
  const s = new Set();
  for (const b of beings) {
    let strand = b.strand, a = b.span[0], e = b.span[1];
    if (flip) { strand = strand === "+" ? "-" : "+"; [a, e] = [n - e, n - a]; }
    if (shift) { a = (a + shift) % n; e = (e + shift) % n; }
    s.add(strand === "-" ? `-:${a}` : `+:${e}`);
  }
  return s;
}
const jaccard = (A, B) => { if (!A.size && !B.size) return 1; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };
function suffixAgree(R, P) { // R reader protein (X = undetermined, matches anything), P NCBI protein; both end at the last sense codon
  const a = R.replace(/\*$/, ""), Pt = P.slice(1); // the first residue of either is the initiator rule, not a codon reading
  const n = Math.min(a.length - 1, Pt.length); if (n < 10) return false;
  for (let i = 1; i <= n; i++) { const x = a[a.length - i], y = Pt[Pt.length - i]; if (x !== "X" && x !== y) return false; }
  return true;
}
function proteinAgreement(ctx, rec, readOut, shuffleSeed = null) {
  const o = ctx.g(rec); const prot = L.loadProteins(rec.acc);
  const byPid = new Map(); for (const p of prot) { const m = /\[protein_id=([^\]]+)\]/.exec(p.desc); if (m) byPid.set(m[1], p.seq); }
  const enc = new Map(); for (const r of readOut.relations) if (r.label === "encodes") enc.set(r.end1, r.end2.slice("protein:".length));
  const byKey = new Map(); for (const b of readOut.beings) byKey.set(L.beingKey(b), enc.get(b.id));
  const gold = o.gold.cds.filter((c) => c.evaluable && c.protein_id && byPid.has(c.protein_id));
  if (!gold.length) return null;
  let order = gold.map((_, i) => i);
  if (shuffleSeed != null) { const d = L.derangement(gold.length, L.mulberry32(shuffleSeed)); if (d) order = d; }
  let ok = 0;
  gold.forEach((c, i) => { const R = byKey.get(L.stopKey(c.strand, c.start, c.end)); const Pc = gold[order[i]]; if (R != null && suffixAgree(R, byPid.get(Pc.protein_id))) ok++; });
  return ok / gold.length;
}
function measureR5(ctx) {
  const id = "genetic.r5.agreement", rung = "r5";
  if (!ctx.priors.ok) return unmeasured(id, rung, ctx.split, "priors missing");
  const gaps = []; const def = ctx.C.defaults;
  const A = [], Brna = [], Cc = [], real = [], Ader = [], Cder = [], derComb = [], Astd = [], Cstd = [], stdComb = [], per = [];
  for (const rec of ctx.recs) {
    const o = ctx.g(rec); const n = o.seq.length;
    const fa = ctx.fa(rec); const head = fa.slice(0, fa.indexOf("\n") + 1);
    const fwd = G.read(fa, { priors: ctx.priors });
    const rc = G.read(head + G.revcomp(o.seq), { priors: ctx.priors });
    const rna = G.read(head + o.seq.replace(/T/g, "U"), { priors: ctx.priors });
    const Kf = keysOf(fwd.beings, n), Kr = keysOf(rc.beings, n, true);
    const a = jaccard(Kf, Kr), ader = jaccard(Kf, keysOf(rc.beings, n, true, Math.floor(n / 3)));
    const b = jaccard(Kf, keysOf(rna.beings, n));
    const c = proteinAgreement(ctx, rec, fwd), cder = proteinAgreement(ctx, rec, fwd, seedOf(rec.acc, 6));
    // reader with the code fixed to the TRAIN default on both arms
    const fs0 = { fixedState: { tga: def.tga, agr: def.agr }, priors: ctx.priors };
    const fwdS = G.read(fa, fs0), rcS = G.read(head + G.revcomp(o.seq), fs0);
    const astd = jaccard(keysOf(fwdS.beings, n), keysOf(rcS.beings, n, true)), cstd = proteinAgreement(ctx, rec, fwdS);
    A.push(a); Brna.push(b); Cc.push(c); Ader.push(ader); Cder.push(cder); Astd.push(astd); Cstd.push(cstd);
    real.push(c == null ? a : (a + c) / 2); derComb.push(cder == null ? ader : (ader + cder) / 2); stdComb.push(cstd == null ? astd : (astd + cstd) / 2);
    per.push({ acc: rec.acc, A: round(a), B: round(b), C: round(c), deranged: round(derComb.at(-1)), std_table: round(stdComb.at(-1)) });
  }
  const altPresent = ctx.recs.some((r) => { const g = ctx.goldClass(r); return !(g.tga === "stop" && g.agr === "sense"); });
  const arms = {
    deranged: { values: derComb, mean: mean(derComb), licensed: true, licenceNote: "rotated mapping + wrong-CDS protein pairing" },
    std_table: { values: stdComb, mean: mean(stdComb), licensed: altPresent, licenceNote: `alternate-code genomes in split: ${altPresent}` },
  };
  const vs = versus(real, arms);
  controlGaps(gaps, vs, "r5");
  const score = mean(real), mA = mean(A), mC = mean(Cc), bExact = Brna.filter((x) => x >= 1 - 1e-12).length / Brna.length;
  addGap(gaps, "protein_records_absent_for_source", Cc.filter((x) => x == null).length);
  return shape(id, rung, ctx.split, {
    n: ctx.recs.length, score: round(score), control: vs.strongest ? round(vs.strongest.mean) : null, margin: vs.strongest ? round(score - vs.strongest.mean) : null,
    pass: and(ge(bExact, PRE.FLOORS.r5_B), ge(mA, PRE.FLOORS.r5_A), ge(mC, PRE.FLOORS.r5_C), vs.beatsAll),
    controls: { deranged: round(arms.deranged.mean), std_table: round(arms.std_table.mean), arm_A_strand: round(mA), arm_B_rna_exact_share: round(bExact), arm_C_protein: round(mC) },
    gaps, notes: ["arm B is expected to be exactly 1 (U is folded onto T); a value below 1 is a notation-handling bug, not a competence difference", "reverse-complement and RNA renderings are DERIVED by the instrument (not natural data)"],
    details: { floors: { A: PRE.FLOORS.r5_A, C: PRE.FLOORS.r5_C, B: PRE.FLOORS.r5_B }, controlTests: vs.tests, controlStatus: vs.status, licensed: vs.licensed, unlicensed: vs.unlicensed, perGenome: per },
  });
}

/**
 * CAUSALITY PRECONDITION (amendment F1b): R2, R4 and R5 read the reader's code-state timeline and beings. If the reader fails the prefix-stability check of R3(c)
 * (a violation, or a check that cannot flag a planted lookahead), their verdicts are not about a causal reader: they FAIL with a typed gap. Mutates rungs/meta.
 */
function applyCausalityPrecondition(rungs, meta) {
  const caus = rungs.r3?.details?.causality;
  if (caus && caus.pass !== true) {
    for (const r of ["r2", "r4", "r5"]) {
      if (!rungs[r]) continue;
      rungs[r].pass = and(rungs[r].pass, false);
      addGap(rungs[r].gaps, "reader_not_causal(precondition: r3 prefix-stability failed or its check is unlicensed)", 1);
      rungs[r].notes = [...(rungs[r].notes ?? []), "CAUSALITY PRECONDITION FAILED: this rung read the reader's timeline/beings, so its verdict is void (fails)"];
    }
    meta.causalityPrecondition = "failed";
  } else if (caus) meta.causalityPrecondition = "passed";
  return rungs;
}

// ═══ measure ═══════════════════════════════════════════════════════════════════════════════════════════
/**
 * measure({split = "dev", limit = null}) -> { family, rungs: {r0..r5}, meta }.
 * limit = the first N genomes of the split (manifest order). Never throws for missing data: a rung that cannot be measured
 * returns {pass: null, gaps: [{reason: "unmeasured", ...}]}.
 */
export async function measure({ split = "dev", limit = null, corpusRoot = null } = {}) {
  const t0 = Date.now();
  const meta = { prereg_sha256: PREREG_SHA256, split, limit, seed: PRE.SEED, alpha: PRE.ALPHA, floors: PRE.FLOORS };
  const ids = { r0: "genetic.r0.identify", r1: "genetic.r1.hear", r2: "genetic.r2.classify", r3: "genetic.r3.beings", r4: "genetic.r4.relations", r5: "genetic.r5.agreement" };
  let ctx = null;
  try { ctx = makeCtx(split, limit, corpusRoot); } catch (e) { meta.error = String(e?.message ?? e); }
  if (!ctx) return { family: FAMILY, rungs: Object.fromEntries(Object.entries(ids).map(([r, i]) => [r, unmeasured(i, r, split, "corpus or manifest missing at " + (corpusRoot ?? L.ROOT) + (meta.error ? ": " + meta.error : ""))])), meta };
  meta.genomes = ctx.recs.length; meta.priorsOk = ctx.priors.ok; meta.priorsTrain = ctx.priors.orf?.train?.records?.length ?? null;
  const fns = { r0: measureR0, r1: measureR1, r2: measureR2, r3: measureR3, r4: measureR4, r5: measureR5 };
  const rungs = {};
  for (const [r, fn] of Object.entries(fns)) {
    const t1 = Date.now();
    try { rungs[r] = fn(ctx); }
    catch (e) { rungs[r] = shape(ids[r], r, split, { pass: null, gaps: [{ reason: "unmeasured", detail: "instrument error: " + String(e?.stack ?? e).slice(0, 400), count: 1 }] }); }
    rungs[r].details = { ...rungs[r].details, ms: Date.now() - t1, prereg_sha256: PREREG_SHA256 };
  }
  applyCausalityPrecondition(rungs, meta);
  meta.ms = Date.now() - t0;
  return { family: FAMILY, rungs, meta };
}

// CLI: node eval/notation-competence/genetic.mjs [--split dev|test|train] [--limit N] [--out file.json]
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const get = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const split = get("--split", "dev"), limit = get("--limit", null);
  const res = await measure({ split, limit: limit == null ? null : Number(limit) });
  const out = get("--out", null);
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  for (const [r, v] of Object.entries(res.rungs)) console.log(r, `n=${v.n}`, `score=${v.score}`, `control=${v.control}`, `margin=${v.margin}`, `pass=${v.pass}`, JSON.stringify(v.controls));
  console.log(JSON.stringify(res.meta));
}

// pure scoring pieces, exported so tests/notation-genetic.test.js can show a perfect reader scores 1 and a deranged control scores low
export const _scoring = { applyCausalityPrecondition, and, ge, controlGaps, prefixStability, lookaheadStateReader, lookaheadStampReader, readerOf, tokenScores, naiveContainerChecks, regexContainerChecks, buildStreams, NEG_FAMILIES, listen, macroF1, versus, suffixAgree, f1Sets, jaccard, keysOf, featureKey, scoreStream, permuteLetters, derangeProfiles, derangeUsage, shuffledSeq, seedOf, fnv };
