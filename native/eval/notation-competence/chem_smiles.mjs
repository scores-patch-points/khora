// eval/notation-competence/chem_smiles.mjs — the COMPETENCE LADDER (R0..R5) for CHEMICAL LINEAR NOTATION:
// SMILES, InChI, IUPAC names (and, only NAMED at R0: SELFIES, molecular formula, English). WLN is a typed gap.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run of measure(). Nothing below is tuned after a result; a prediction that fails is
// reported as failed. The sha256 of this leading comment block is stamped into every card (details.prereg_sha256), so an
// edit to the claim after the fact is visible to anyone who compares digests.
//
// CLAIM
//   adapters/notation/chem_smiles.js (a ZERO-MODEL reader: lexers + graph walkers + received priors built from TRAIN only)
//   (R0) names the notation system of a string from its content alone, reading the prefix only;
//   (R1) hears SMILES lexemes; (R2) classifies atom tokens (what being does the token name, with which attributes);
//   (R3) finds the beings a text declares (atoms, rings, components); (R4) finds the relations (bonds: chain, branch, ring
//   closure); (R5) agrees across representations of the same compound (SMILES <-> InChI; IUPAC name <-> structure);
//   each better than controls built to fail, on HELD-OUT SOURCES (DEV = wwPDB CCD, TEST = PubChem; TRAIN = ChEBI + ChEMBL).
//
// CHANNEL  structured text (linear string notation). Kernel stays medium-blind; this grammar lives in the adapter.
//
// GOLD AUTHORITIES (independent of the system under test; the adapter is never the gold)
//   SMILES structure   RDKit 2026.03.6, Chem.MolFromSmiles(sanitize=False): atoms in TEXTUAL order (index == ordinal of the atom
//                      token), bonds as written, symmetrised SSSR rings, fragments; a sanitized parse (Hs kept) for the RESOLVED
//                      type of implicit aromatic-aromatic bonds and for total H counts.
//   SMILES lexemes     the published tokenizer regex of rxnfp (MIT; the Molecular Transformer / Schwaller 2019 pattern), loaded from the
//                      fetched file, GATED by RDKit consequences (lossless cover; #atom tokens == RDKit atoms); inconsistent => no gold.
//   InChI structure    RDKit Chem.MolFromInchi (IUPAC InChI library): atoms in InChI numbering, bonds (no orders). Hydrogens RDKit
//                      appends for stereo parities are dropped (InChI never numbers H).
//   InChI lexemes      MECHANICAL: no independent lexeme engine exists; the gold is the Technical-Manual delimiter rule. R1 for InChI is
//                      reported with pass:null for that reason.
//   same compound      InChIKey connectivity block of RDKit(SMILES) == that of the record's InChI.
//   name <-> structure OPSIN 2.9.0 (MIT) name->SMILES; a pair is OPSIN-verified iff its connectivity block equals the record's.
//   R0 labels          the registry field the string came from (smiles/inchi/name/formula columns; ChEBI definitions and UD-EWT lines
//                      for English); SELFIES are ENGINE-DERIVED (selfies 2.2.0 encoder over the split's SMILES) and labelled so.
//
// WHAT IS FED (causal, S3). Each reader sees ONE string; R0 additionally sees prefixes of 8/16/32 characters before the whole.
//   Beings/relations carry `at` (the token that completed them). A causality licence re-reads prefixes cut at token boundaries and
//   requires atoms, bond endpoints and rings read from the prefix to be a SUBSET of those read from the whole text (violations must be 0).
//   Two decisions are made only when the text ENDS and are reported separately: the resolution of implicit aromatic-or-single bonds
//   and implicit-H counts. Ring beings are emitted AT the ring-closure token (shortest cycle through the closing bond in the graph
//   so far); they are NOT revised afterwards, so they can disagree with RDKit's symmetrised SSSR (predicted below).
//
// MATCHERS
//   R0  verdict(item) = identify(text).system over the 6 systems {smiles, inchi, iupac_name, english, formula, selfies}; abstention
//       ("ambiguous") counts as WRONG and is reported as coverage. Items: PER_CLASS per class, seeded first-N of the split; the
//       inchi class is half as-given, half with the "InChI=1S/" header stripped (so the header alone cannot carry it).
//       SCORE = accuracy at the full string.
//   R1  SMILES: per molecule, the reader's token (start,end) list == the gold list. SCORE = share of molecules segmented exactly.
//       (token F1 is reported too.) InChI: mechanical gold, reported, pass null. IUPAC names: UNMEASURED (OPSIN's CLI exposes no
//       morpheme parse; needs a Java harness over OPSIN internals).
//   R2  SMILES: per gold atom, the reader's atom at the same ordinal has the same (element, aromatic, charge, isotope) and, for a
//       bracket atom, the same explicit H count. A molecule whose atom count differs scores 0 for all its atoms.
//       SCORE = share of gold atoms matched. Reported: total-H accuracy on organic-subset atoms (needs sanitizable gold).
//       InChI: per gold atom, same element at the same InChI number. IUPAC names: unmeasured (no atom-level unit in a name).
//   R3  SMILES: beings of kind atom (id+element+span start), ring (member-set == a gold symmetrised-SSSR ring), component
//       (member-set == a gold fragment). SCORE = macro-F1 over the kinds that have gold support.
//       InChI: atom (id+element), ring, component against the RDKit-from-InChI structure.
//   R4  SMILES: relation == gold bond if unordered endpoints equal AND the label equals the as-written type (implicit bond between two
//       aromatic atoms is 'aromatic' by the default rule, as RDKit's unsanitized parse). SCORE = labelled micro-F1.
//       Reported: unlabelled F1; resolution of implicit aromatic bonds vs the sanitized parse.
//       InChI: endpoints only (InChI states no bond orders: typed gap). SCORE = unlabelled micro-F1.
//   R5  (a) SMILES <-> InChI: over pairs the gold calls the SAME COMPOUND and whose RDKit graphs (heavy atoms, element-labelled)
//       agree under a 4-round Weisfeiler-Lehman digest, SCORE = share where the READER's SMILES graph digest == the READER's InChI
//       graph digest. Pairs the gold itself says declare different graphs (metal disconnection, charge normalisation) are a typed gap.
//       (b) IUPAC name -> structure elements: over OPSIN-verified pairs, per element with >= 20 positives and >= 20 negatives, Youden's
//       J = recall + specificity - 1 of "the name's TRAIN-tallied n-grams evidence this element"; SCORE = macro-J. (J is chance-
//       corrected: a constant guess scores 0 however common the element.)
//       (c) across NATURAL languages: not applicable (applicable:false) to a notation.
//
// CONTROLS, BUILT TO FAIL (II.23/II.4). Each is run on the SAME items; each carries a LICENCE CHECK (the statistic must move).
//   R0  label_derangement (verdicts scored against deranged gold), content_shuffled (characters permuted within each string; licensed iff
//       it lowers accuracy by >= LICENCE_DROP), majority_class.
//   R1  char_level (every character a token), letter_run (an NL-style ear: letter/digit runs, punctuation single), random_cuts (same token
//       count, random cut points). Licence: random_cuts' token-F1 <= real - 0.20.
//   R2  caps_only (capitalisation as THE signal: an uppercase letter is an aliphatic atom, a lowercase letter an aromatic one,
//       two-letter symbols only when in the element table, brackets not understood), deranged_attributes (read attribute tuples dealt
//       out at random across atoms). Licence: deranged <= real - 0.20.
//   R3  deranged (the beings read from ANOTHER molecule), naive_text (every letter an atom, ring = text interval between equal digits,
//       component = dot-split). Licence: deranged <= real - 0.20.
//   R4  deranged (another molecule's relations), chain_only (consecutive atoms bonded; no branch, no ring closure semantics).
//   R5  deranged_pairs (the InChI of another compound), formula_only_deranged (element-multiset equality on deranged pairs); names:
//       deranged_pairs (name of another compound), majority_constant (J = 0 by construction). A control that does as well as the real
//       arm (margin <= 0) means the instrument or mechanism is broken and is reported as such.
//   Causality: lookahead_reader (atom ids numbered from the END of the prefix) must be CAUGHT by the causality check (violations > 0).
//
// PASS RULE (all constants declared in PARAMS; nothing is fitted). A system passes a rung iff
//   score >= its floor AND margin (score - strongest control) >= its margin floor AND an exact one-sided sign test of real-vs-strongest-
//   control on paired units gives p < KEY_ALPHA (keyness.js) AND the strongest control's licence holds AND (R3/R4) causality violations = 0.
//   R0 additionally: every class recall >= 0.5 and coverage >= 0.85. A rung passes iff every system measured at it with a non-null pass
//   passes; systems that cannot be measured are typed gaps with denominators, never passes. Rung score = mean over measured systems.
//
// PREDICTIONS (written before the first run; DEV figures, TEST expected a little lower: PubChem is Kekule-written and ring-denser)
//   R0  accuracy 0.90-0.98; weakest classes formula (short strings parse as SMILES) and iupac_name vs english; coverage >= 0.95;
//       content_shuffled 0.35-0.65; label_derangement ~0.17; majority 0.17. PASS predicted.
//   R1  SMILES exact 0.97-1.00 (both lexers read one grammar: this rung is easy for a grammar-driven reader and says little beyond
//       "the lexer is not broken"); char_level 0.20-0.60; letter_run < 0.10; PASS predicted.
//   R2  SMILES 0.985-1.000; caps_only 0.70-0.93 (it fails every bracket atom with charge/isotope/H and every Cl/Br it cannot attach);
//       total-H accuracy 0.93-0.99 (lower on aromatic heterocycles). InChI element-at-number 0.995-1.000. PASS predicted.
//   R3  atoms ~1.00, components ~1.00, RINGS 0.80-0.97 (the causal shortest-cycle ring disagrees with symmetrised SSSR on caged and
//       bridged systems and where SSSR has ties: cubane, adamantane, norbornane; more of these in PubChem than CCD); macro-F1 0.93-0.99.
//       PASS predicted on DEV, ring F1 under 0.90 predicted on TEST (a visible, reported failure of the ring sub-score, not of the rung).
//   R4  SMILES labelled F1 0.995-1.000; chain_only 0.55-0.85. InChI edges 0.97-1.00 (risk: repeated components '2*', empty ';;' segments).
//   R5  SMILES<->InChI agreement 0.93-0.99 of gold-agreeing pairs; deranged ~0.00-0.03. Names: macro-J 0.45-0.70 on DEV, a COIN FLIP at
//       the 0.50 floor (n-gram evidence is weak for O and N, strong for halogens/S/P); deranged and majority ~0.00.
//   R1/R2/R3/R4 for IUPAC names and every rung for WLN: UNMEASURED by construction (typed gaps below).
//
// TYPED GAPS (results, with the exact missing piece)
//   WLN (all rungs)         no open corpus and no open writer (Open Babel's WLN is read-only/GPL; its Python wheel lacks the format).
//   IUPAC names R1-R4       no morpheme grammar in the adapter (only TRAIN-tallied element evidence); no OPSIN parse-tree gold (the CLI
//                           returns structures only: a Java harness over uk.ac.cam.ch.wwmm.opsin internals is needed).
//   SELFIES, formula        named at R0 only; no being/relation reader.
//   Paywalled standards     none used; ISO/IEC chemistry nomenclature tables are not scraped.
// ═══ AMENDMENT 1 (2026-10-06): review round 1. Written BEFORE any re-run of measure() after the review. APPEND-ONLY. ═══
// Everything ABOVE this line is the original pre-registration, unchanged byte for byte; its sha256 (V1) is the literal
// PREREG_V1_SHA256 below, and a test checks that the text above this line still hashes to it. The card stamps BOTH digests.
//
// DISCLOSURE (II.5, honestly). Six independent findings were filed against the v1 instrument. The reviewer's scratch numbers on DEV
// are KNOWN to the author of this amendment: a bag-of-characters naive Bayes scores 0.9789 on the R0 DEV items (reader 0.9867;
// at prefix 8/16/32 the bag scores 0.8813/0.9728/0.9952, the reader 0.6847/0.9265/0.9832); a bracket-aware capitalisation reader
// scores 0.9955 of R2-SMILES atoms; alphabetical numbering scores 0.9961 on R2-InChI; a ring-only-naive control reaches R3 macro
// 0.9255 (ring F1 0.7766); edgeless reader graphs score 1.0 on the v1 R5(a). The predictions below are therefore INFORMED, not
// blind, and are labelled so. TEST (PubChem) is NOT run by this amendment; it is run once, at the end, under this text. No v1 threshold is
// lowered. Where a v1 RULE is changed it is changed because the v1 rule is provably unsatisfiable or provably unfalsifiable (stated per
// item), the v1 verdict is still computed and printed beside the v2 verdict, and the v2 rule is STRICTER on the reader at every point
// it differs except where stated.
//
// A1  R0 (reviewer findings 1 and 6). v1's strongest control (content_shuffled) re-ran the reader on shuffled characters: a function of
//     the reader itself, so it measured order-sensitivity, not identification. ADDED, all trained on TRAIN only, on EXACTLY the
//     items the system prior is built from (smiles; inchi, every other one header-stripped; ChEBI IUPAC names; ChEBI definitions;
//     registry formulas; engine-derived SELFIES), uniform class prior, Laplace alpha = PARAMS.R0.BASELINE_LAPLACE, forced choice (no abstention):
//       char_unigram_nb  multinomial NB over characters (ORDER-BLIND: a character histogram);
//       char_bigram_nb   multinomial NB over character bigrams with a start marker (order-AWARE, GRAMMAR-FREE: the n-gram model of finding 6);
//       length_only      NB over floor(log2(len+1)) (length alone);
//       case_mask_nb     NB over the mask U/l/d/s/p of each character (capitalisation and character class alone: caps as THE signal).
//     CLAIM REWORDED: an R0 pass asserts only that the reader's system verdict beats the STRONGEST of ALL controls, these included, by
//     MIN_MARGIN (0.2, unchanged), with p < KEY_ALPHA on a paired sign test against that control. It is NOT evidence of causal
//     identification from structure unless that margin exists; a reader that merely equals a character histogram is reported as
//     "no better than character statistics" and does not pass. Licences: char_unigram_nb, length_only and case_mask_nb must be
//     SHUFFLE-INVARIANT (accuracy on within-string permutations == accuracy on the originals, exactly: they sum over a sorted multiset), and
//     char_bigram_nb must MOVE under the shuffle (accuracy falls); each baseline is also reported as LIVE or INERT (beats majority by LICENCE_DROP).
//     The prefix curve (8/16/32) of the reader and of every baseline, on the same items, is reported. If the baselines cannot be built (no TRAIN
//     corpus) the rung's pass is null with a typed gap: never a pass. The v1 MIN_MARGIN is NOT lowered and no ceiling exemption is
//     added: a margin of 0.2 is unreachable when a baseline exceeds 0.8, and the rung then says FAIL (the headroom is reported).
//     PREDICTION (informed): char_unigram_nb ~0.97-0.99, char_bigram_nb ~0.98-0.995, length_only 0.25-0.45, case_mask_nb 0.55-0.85; the
//     reader's margin over the strongest is within +/-0.02; the reader is BELOW the strongest baseline at prefix 8 and 16. R0: FAIL predicted.
// A2  R2 (reviewer findings 2 and 4).
//     SMILES. v1's caps_only read the 'H' inside [C@H]/[nH] as an extra atom and zeroed the molecule (0.3629: a strawman). REPLACED by
//     caps_bracket_aware: attributes by capitalisation only (an uppercase letter is aliphatic, a lowercase one aromatic; two-letter
//     symbols only when in the element table), brackets understood as atom containers (the first symbol inside), charge = 0, isotope = 0,
//     H = 0; scored PER ATOM (a molecule is never zeroed). The v1 regex reader is kept as caps_only_naive (a control, expected weak).
//     RULE RE-DECLARED (the v1 micro-margin rule is unsatisfiable once a bracket-aware reader scores >= 0.95: a defect of the rule, not a
//     result to tune against): gold atoms are STRATIFIED by the gold's own flags (NoImplicit => bracket; else aromatic; else organic: 100% equal
//     to the token's bracketedness in DEV and TEST). The DECISIVE stratum is `bracket` (where charge, isotope, H, chirality are written). PASS iff
//     every stratum with >= MIN_STRATUM atoms scores >= MIN_SCORE (0.98, unchanged) AND the decisive stratum is supported AND the margin on
//     the decisive stratum over the strongest control (measured on that stratum) >= MIN_MARGIN (0.05, unchanged) AND a paired sign test on the
//     decisive stratum's atoms p < KEY_ALPHA AND deranged_attributes <= real - LICENCE_DROP on that stratum AND the capitalisation control is
//     COMPETENT on the plain strata (>= MIN_CONTROL_PLAIN = 0.95: a control that fails where it is built to read is a strawman, the v1 failure).
//     score/control/margin of the card are the decisive-stratum figures; the micro figures and the v1 micro verdict are in details.micro_v1_rule.
//     PREDICTION (informed): decisive-stratum real 0.99-1.00; strongest control on it 0.05-0.45; micro margin ~0.005 (the v1 rule would FAIL);
//     DEV PASS predicted; on TEST the aromatic stratum is EMPTY (PubChem is Kekule-written): a typed gap for that stratum, not a pass.
//     InChI. The unit tested is the expansion of the formula layer, a deterministic function of the text, and the rule that gives the
//     InChI numbering is the formula order itself: the honest control `formula_order_only` is the real arm's own rule, so its margin is 0 by
//     construction, and alphabetical numbering is within 0.004. R2 InChI is therefore DECLARED MECHANICAL: pass null with a typed gap, as for
//     R1 InChI. ADDED as reported controls: alphabetical_numbering and formula_order_only (an independent regex expansion in this file). The
//     v1 rule's verdict with those controls is printed beside it; the decisive subset (molecules whose Hill order differs from alphabetical)
//     is reported with n.
// A3  R3 (reviewer finding 5). v1's naive_text counted every letter as an atom (Cl -> C, L), a strawman. The R3 HEADLINE is the DECISIVE kind:
//     RING F1 (atoms and components are lexer-trivial for any reader that lexes; they stay reported). ADDED: naive_rings, which CREDITS the
//     reader's own atoms and components and replaces only ring logic with the textual interval between a closure digit pair (SMILES) / between
//     the two mentions of an atom reference (InChI), so only ring reasoning is tested. naive_text is demoted to details (strawman diagnostic).
//     PASS iff ring F1 >= MIN_KIND_F1 (0.90, = MIN_MACRO_F1 by declaration) AND every other kind with support >= MIN_KIND_F1 AND macro-F1 >= MIN_MACRO_F1
//     AND the ring-F1 margin over the strongest control's ring F1 >= MIN_MARGIN (0.15, unchanged) AND a paired sign test on per-molecule ring
//     exactness p < KEY_ALPHA AND deranged <= real - LICENCE_DROP on ring F1 AND the naive_rings control is live (falls under a deranged gold) AND
//     causality violations = 0 AND the lookahead reader is caught. A ring F1 under 0.90 on TEST therefore FAILS THE RUNG (v1 reported it as a sub-score only).
//     PREDICTION (informed): SMILES ring F1 DEV 0.97-0.99 (v1 predicted 0.80-0.97: that prediction FAILED, reported), naive_rings ring F1 0.70-0.85,
//     margin >= 0.15 on DEV: PASS predicted on DEV; TEST ring F1 < 0.90 predicted (cage and bridged systems): FAIL predicted on TEST.
//     InChI: ring F1 0.95-0.99, naive_rings 0.55-0.90 (no prediction of the margin); the same rule applies.
// A4  R5(a) (reviewer finding 3). v1 compared the reader's SMILES graph digest to the reader's own InChI graph digest: self-consistency, which
//     an edgeless reader satisfies (score 1.0). HEADLINE re-declared: the share of gold-agreeing pairs where BOTH reader graph digests equal the
//     RDKit gold graph digest (so connectivity is scored against an independent authority). Self-consistency is kept in details. CONTROLS on the
//     SAME real pairs, scored with the SAME statistic: edge_deleted (labels only), bond_scrambled (same labels, same edge count, edges
//     uniformly re-drawn, seeded), atom_count_only (every label C, no edges), and deranged_pairs (gold digest of another pair). Licence: the
//     strongest degraded control <= real - LICENCE_DROP (0.5), and the self-consistency of the edge_deleted reader is REPORTED (it is 1 by
//     construction: that is why self-consistency alone cannot be the headline). MIN_AGREE 0.9 and MIN_MARGIN 0.5 are unchanged. The old
//     element-bag control compares a weaker statistic and moves to details as a diagnostic.
//     PREDICTION (informed): real 0.95-1.00; edge_deleted ~0.01 (single-atom molecules only); bond_scrambled < 0.03; atom_count_only ~0.01; PASS predicted.
// SCOPE. Not amended: R1, R4, R5(b) names, the gold authorities, the split, every other threshold. A new constant is declared in PARAMS or it is not used.
// AMENDMENT 1b (2026-10-06; still BEFORE any re-run; it CORRECTS two premises of Amendment 1 after a one-off DEV probe of the capitalisation reader):
//   (i)  A2. The reviewer's 0.9955 credits the capitalisation control with the element and the aromatic flag only. Under THIS instrument's strict
//        attribute scoring (element, aromatic, charge, isotope, and the H of a bracket atom) a bracket-aware capitalisation reader scores micro 0.9168 on
//        DEV (organic 0.979, aromatic 0.977, bracket 0.121; probe over 6,000 molecules; no threshold was changed after it). The v1 micro-margin rule is
//        therefore SATISFIABLE (margin ~0.08 against the 0.05 floor) and the stratified rule is NOT a relaxation. The R2-SMILES pass is the CONJUNCTION
//        of the v1 micro rule (micro score >= MIN_SCORE, micro margin >= MIN_MARGIN over the strongest control's micro score, paired sign test p < KEY_ALPHA
//        on all atoms, deranged_attributes <= real - LICENCE_DROP) AND every A2 stratified condition. A2's claim that the v1 rule is "unsatisfiable" is WITHDRAWN.
//        Corrected PREDICTION (informed by the probe): micro control 0.90-0.95, micro margin 0.05-0.10 (NARROW; the v1 floor may be missed), bracket-stratum control
//        0.08-0.20, plain strata of the control 0.97-0.99 (the 'Cn'/'Sc'/'Sn' reading of a capitalisation reader loses a few percent: its own limit).
//   (ii) A3. With a control that credits the reader's atoms and components, the v1 macro margin is at most ONE THIRD of the ring margin (two of the three
//        kinds are equal by construction), so a macro margin >= 0.15 would demand a ring-F1 margin >= 0.45: the v1 macro-margin rule is arithmetically
//        diluted, not demanding. The floor 0.15 is applied to the undiluted decisive unit (ring F1), as A3 states; the v1 macro-margin verdict is printed beside it.
// ═══ END PRE-REGISTRATION ═══════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import * as adapter from "../../adapters/notation/chem_smiles.js";
import { KEY_ALPHA, logBinomialUpperTail } from "../../adapters/text/keyness.js";

export const FAMILY = "chem_smiles";
export const ROOT = "/private/tmp/claude-501/notation/chem_smiles";
export const SYSTEMS_MEASURED = ["smiles", "inchi", "iupac_name"];

export const PARAMS = Object.freeze({
  ALPHA: KEY_ALPHA,
  SEED: 20261006,
  // A1: BASELINE_LAPLACE = the declared Laplace alpha of the TRAIN-only baselines (the same alpha as the system prior).
  R0: { PER_CLASS: 600, PREFIXES: [8, 16, 32], MIN_ACC: 0.85, MIN_MARGIN: 0.2, MIN_CLASS_RECALL: 0.5, MIN_COVERAGE: 0.85, LICENCE_DROP: 0.1, BASELINE_LAPLACE: 1 },
  R1: { MIN_EXACT: 0.98, MIN_MARGIN: 0.25, LICENCE_DROP: 0.2 },
  // A2: MIN_STRATUM = least atoms for a stratum to be scored; MIN_CONTROL_PLAIN = least plain-strata score of the capitalisation control;
  //     MIN_DECISIVE = least molecules in the InChI decisive subset for it to be reported as measured.
  R2: { smiles: { MIN_SCORE: 0.98, MIN_MARGIN: 0.05, MIN_STRATUM: 100, MIN_CONTROL_PLAIN: 0.95 }, inchi: { MIN_SCORE: 0.98, MIN_MARGIN: 0.05, MIN_DECISIVE: 30 }, LICENCE_DROP: 0.2 },
  // A3: MIN_KIND_F1 = per-kind floor, equal to MIN_MACRO_F1 by declaration.
  R3: { MIN_MACRO_F1: 0.9, MIN_KIND_F1: 0.9, MIN_MARGIN: 0.15, LICENCE_DROP: 0.2 },
  R4: { smiles: { MIN_F1: 0.97, MIN_MARGIN: 0.1 }, inchi: { MIN_F1: 0.95, MIN_MARGIN: 0.1 }, LICENCE_DROP: 0.2 },
  // A4: LICENCE_DROP = how far the degraded-reader controls must sit below the real arm.
  R5: { smiles_inchi: { MIN_AGREE: 0.9, MIN_MARGIN: 0.5, LICENCE_DROP: 0.5 }, name: { MIN_J: 0.5, MIN_MARGIN: 0.3, MIN_SUPPORT: 20 } },
  WL_ROUNDS: 4,
  CAUSAL_SAMPLE: 200,
  CAUSAL_CUTS: [0.25, 0.5, 0.75],
});

/** One-level-deep override of PARAMS (the tests use it for TOY fixtures; the card stamps what was used). */
export function withParams(over = {}) {
  const merge = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === "object" && !Array.isArray(v) && a?.[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? merge(a[k], v) : v; return o; };
  return Object.freeze(merge(PARAMS, over));
}

const SRC = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
/** sha256 of the ORIGINAL (v1) pre-registration block, as published with the first card. The amendment is append-only: see AMENDMENT 1. */
export const PREREG_V1_SHA256 = "a55252a1645781c782c7edd69ff7ced074f0b43b6f753af5733625ae1b5443a1";
/** What the text above the amendment marker hashes to NOW (a test requires it to equal PREREG_V1_SHA256: the original claim was not edited). */
export const PREREG_V1_RECOMPUTED_SHA256 = createHash("sha256").update(SRC.slice(0, SRC.indexOf("// ═══ AMENDMENT 1"))).digest("hex");
/** sha256 of the whole pre-registration (original + amendments) up to the end marker. */
export const PREREG_SHA256 = createHash("sha256").update(SRC.slice(0, SRC.indexOf("// ═══ END PRE-REGISTRATION"))).digest("hex");

// ───────────────────────────── small, seeded arithmetic ─────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Sattolo: one n-cycle, so no element is its own image. n < 2 has none. */
export function derangement(n, rng) {
  if (n < 2) return null;
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}
export const f1Of = (tp, fp, fn) => (tp + fn === 0 && tp + fp === 0 ? null : tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn));
/** One-sided exact sign test: P(X >= wins | wins+losses, 1/2). */
export function signTest(wins, losses) {
  const n = wins + losses;
  return { wins, losses, n, p: n === 0 ? 1 : Math.exp(logBinomialUpperTail(wins, n, 0.5)) };
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x, k = 4) => (x === null || x === undefined || Number.isNaN(x) ? null : +x.toFixed(k));
const maxOf = (o) => { const v = Object.values(o).filter((x) => x !== null && x !== undefined); return v.length ? Math.max(...v) : null; };

function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
/** Weisfeiler-Lehman digest of an element-labelled graph {labels, edges}. */
export function wlHash(g, rounds = PARAMS.WL_ROUNDS) {
  if (!g) return null;
  const n = g.labels.length;
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of g.edges) { if (a === b || a >= n || b >= n) continue; adj[a].push(b); adj[b].push(a); }
  let lab = g.labels.map((l) => fnv(l));
  for (let r = 0; r < rounds; r++) lab = lab.map((l, i) => fnv(l + "|" + adj[i].map((j) => lab[j]).sort().join(",")));
  return `${n}:${g.edges.length}:${fnv(lab.slice().sort().join(";"))}`;
}
const elementBag = (g) => (g ? g.labels.slice().sort().join("") : null);

// ───────────────────────────── data ─────────────────────────────
export function loadData(split, root = ROOT) {
  try {
    const corpus = JSON.parse(fs.readFileSync(path.join(root, "corpus", `${split}.json`), "utf8"));
    const gold = new Map();
    for (const line of fs.readFileSync(path.join(root, "gold", `${split}.jsonl`), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const g = JSON.parse(line);
      gold.set(g.id, g);
    }
    return { corpus, gold };
  } catch { return null; }
}

// ───────────────────────────── result shape ─────────────────────────────
function card({ rung, system = null, split, n = 0, applicable = true, score = null, control = null, controls = {}, pass = null, gaps = [], notes = [], details = {} }) {
  const margin = score !== null && control !== null ? round(score - control) : null;
  return { id: `${FAMILY}${system ? ":" + system : ""}:${rung.toLowerCase()}`, rung, split, n, applicable, score: round(score), control: round(control), margin, pass, controls: Object.fromEntries(Object.entries(controls).map(([k, v]) => [k, typeof v === "number" ? round(v) : v])), gaps, notes, details };
}
const unmeasured = (rung, split, system, missing, extra = {}) => card({ rung, system, split, applicable: true, pass: null, gaps: [{ reason: "unmeasured", missing, ...extra }] });
const notApplicable = (rung, split, system, reason) => ({ ...card({ rung, system, split, applicable: false, pass: null }), reason });

/** Fold per-system cards into one rung card (score = mean over measured; pass = conjunction of non-null; gaps listed). */
function foldRung(rung, split, systems, extraDetails = {}) {
  const measured = Object.entries(systems).filter(([, c]) => c.applicable && c.score !== null);
  const passes = measured.map(([, c]) => c.pass).filter((p) => p !== null);
  const gaps = [];
  for (const [s, c] of Object.entries(systems)) for (const g of c.gaps ?? []) gaps.push({ system: s, ...g });
  const controls = {};
  for (const [s, c] of measured) for (const [k, v] of Object.entries(c.controls)) controls[`${s}.${k}`] = v;
  const score = measured.length ? mean(measured.map(([, c]) => c.score)) : null;
  const control = measured.length && measured.every(([, c]) => c.control !== null) ? mean(measured.map(([, c]) => c.control)) : null;
  return {
    id: `${FAMILY}:${rung.toLowerCase()}`, rung, split,
    n: measured.reduce((a, [, c]) => a + (c.n ?? 0), 0),
    applicable: Object.values(systems).some((c) => c.applicable),
    score: round(score), control: round(control), margin: score !== null && control !== null ? round(score - control) : null,
    pass: passes.length ? passes.every(Boolean) : null,
    controls, gaps, notes: [`rung score = mean over measured systems (${measured.map(([s]) => s).join(", ") || "none"}); pass = every measured system with a non-null pass passes`],
    details: { systems, prereg_sha256: PREREG_SHA256, ...extraDetails },
  };
}

// ───────────────────────────── R0 ─────────────────────────────
function seededFirst(arr, n, seed) { return shuffled(arr, mulberry32(seed)).slice(0, n); }

export function r0Items(corpus, perClass, seed = PARAMS.SEED) {
  const items = [];
  const add = (xs, gold, view, mapText = (x) => x.text ?? x) => xs.forEach((x) => items.push({ id: x.id ?? null, text: mapText(x), gold, view }));
  const strip = (s) => s.replace(/^InChI=1S?\//, "");
  add(seededFirst(corpus.records.map((r) => ({ id: r.id, text: r.smiles })), perClass, seed + 1), "smiles", "as_given");
  const inchi = seededFirst(corpus.records.map((r) => ({ id: r.id, text: r.inchi })), perClass, seed + 2);
  add(inchi.slice(0, Math.ceil(perClass / 2)), "inchi", "as_given");
  add(inchi.slice(Math.ceil(perClass / 2)), "inchi", "header_stripped", (x) => strip(x.text));
  add(seededFirst(corpus.names ?? [], perClass, seed + 3), "iupac_name", "as_given");
  add(seededFirst((corpus.english ?? []).map((t, i) => ({ id: `en${i}`, text: t })), perClass, seed + 4), "english", "as_given");
  add(seededFirst(corpus.formula ?? [], perClass, seed + 5), "formula", "as_given");
  add(seededFirst(corpus.selfies ?? [], perClass, seed + 6), "selfies", "as_given");
  return items;
}

// ── A1: ORDER-BLIND and GRAMMAR-FREE baselines, trained on TRAIN only, on exactly the items the system prior is built from ──
/** The TRAIN items per class (the recipe of chem_smiles-data/build-system-prior.mjs: every other InChI has its header stripped). */
export function trainItemsOf(train) {
  return {
    smiles: (train.records ?? []).map((r) => r.smiles),
    inchi: (train.records ?? []).map((r, i) => (i % 2 ? r.inchi.replace(/^InChI=1S?\//, "") : r.inchi)),
    iupac_name: (train.names ?? []).map((x) => x.text),
    english: train.english ?? [],
    formula: (train.formula ?? []).map((x) => x.text),
    selfies: (train.selfies ?? []).map((x) => x.text),
  };
}
const caseMask = (ch) => (ch >= "A" && ch <= "Z" ? "U" : ch >= "a" && ch <= "z" ? "l" : ch >= "0" && ch <= "9" ? "d" : /\s/.test(ch) ? "s" : "p");
/**
 * Multinomial naive Bayes over a feature sequence, uniform class prior (as the system prior), Laplace alpha, forced choice.
 * sortFeatures: sum over the SORTED multiset of features, so an order-blind model is bit-for-bit invariant to permutations of the text.
 */
function nbClassifier(items, featuresOf_, alpha, sortFeatures) {
  const classes = Object.keys(items).filter((c) => items[c].length);
  const cnt = {}, tot = {};
  const vocab = new Set();
  for (const c of classes) {
    cnt[c] = new Map(); tot[c] = 0;
    for (const t of items[c]) for (const k of featuresOf_(t)) { cnt[c].set(k, (cnt[c].get(k) ?? 0) + 1); tot[c]++; vocab.add(k); }
  }
  const V = vocab.size + 1; // +1: one slot for an unseen feature
  return {
    classes,
    classify(text) {
      let ks = featuresOf_(text);
      if (sortFeatures) ks = ks.slice().sort();
      let best = null, b = -Infinity;
      for (const c of classes) {
        const den = tot[c] + alpha * V;
        let s = 0;
        for (const k of ks) s += Math.log(((cnt[c].get(k) ?? 0) + alpha) / den);
        if (s > b) { b = s; best = c; }
      }
      return best;
    },
  };
}
/**
 * The A1 baselines. None reads a grammar; none abstains; all are fitted on `train` only (a TRAIN corpus object, as corpus/train.json).
 * orderBlind = true => provably invariant to permuting the characters of the string (licence-checked in scoreR0).
 */
export function buildBaselines(train, { alpha = PARAMS.R0.BASELINE_LAPLACE } = {}) {
  if (!train?.records?.length) return null;
  const items = trainItemsOf(train);
  const mk = (name, orderBlind, usesOrder, feat, sort) => ({ name, orderBlind, usesOrder, ...nbClassifier(items, feat, alpha, sort) });
  const list = [
    mk("char_unigram_nb", true, false, (t) => [...t], true),
    mk("char_bigram_nb", false, true, (t) => { const cs = [...t]; const out = []; for (let i = 0; i < cs.length; i++) out.push((i ? cs[i - 1] : "\u0001") + cs[i]); return out; }, false),
    mk("length_only", true, false, (t) => [String(Math.floor(Math.log2([...t].length + 1)))], true),
    mk("case_mask_nb", true, false, (t) => [...t].map(caseMask), true),
  ];
  return Object.fromEntries(list.map((b) => [b.name, b]));
}

export function scoreR0({ items, verdict, reader, split, seed = PARAMS.SEED, baselines = null, params = PARAMS }) {
  const P = params.R0;
  const n = items.length;
  if (!n) return unmeasured("R0", split, null, "no items");
  const full = items.map((it) => verdict(it.text, true));
  const correct = items.map((it, i) => full[i] === it.gold);
  const acc = mean(correct.map(Number));
  const coverage = mean(full.map((v) => (v ? 1 : 0)));
  const classes = [...new Set(items.map((it) => it.gold))];
  const perClass = {};
  const confusion = {};
  for (const c of classes) {
    const idx = items.map((it, i) => (it.gold === c ? i : -1)).filter((i) => i >= 0);
    perClass[c] = { n: idx.length, recall: round(mean(idx.map((i) => Number(correct[i])))), abstained: idx.filter((i) => !full[i]).length };
    confusion[c] = {};
    for (const i of idx) { const v = full[i] ?? "ABSTAIN"; confusion[c][v] = (confusion[c][v] ?? 0) + 1; }
  }
  const byView = {};
  for (const v of new Set(items.map((it) => `${it.gold}/${it.view}`))) {
    const idx = items.map((it, i) => (`${it.gold}/${it.view}` === v ? i : -1)).filter((i) => i >= 0);
    byView[v] = round(mean(idx.map((i) => Number(correct[i]))));
  }
  // causal prefixes (the reader and every baseline see the same prefixes of the same items)
  const bnames = baselines ? Object.keys(baselines) : [];
  const prefix = {};
  for (const p of P.PREFIXES) {
    const idx = items.map((it, i) => (it.text.length > p ? i : -1)).filter((i) => i >= 0);
    const cell = { n: idx.length, accuracy: round(mean(idx.map((i) => Number(verdict(items[i].text.slice(0, p), false) === items[i].gold)))) };
    cell.baselines = Object.fromEntries(bnames.map((b) => [b, round(mean(idx.map((i) => Number(baselines[b].classify(items[i].text.slice(0, p)) === items[i].gold))))]));
    prefix[p] = cell;
  }
  const stable = [];
  for (let i = 0; i < n; i++) {
    const marks = [...P.PREFIXES.filter((p) => items[i].text.length > p), items[i].text.length];
    let first = null;
    for (let k = marks.length - 1; k >= 0; k--) {
      const v = verdict(marks[k] === items[i].text.length ? items[i].text : items[i].text.slice(0, marks[k]), marks[k] === items[i].text.length);
      if (v === items[i].gold) first = marks[k]; else break;
    }
    stable.push(first);
  }
  const stableDecided = stable.filter((x) => x !== null).sort((a, b) => a - b);
  // controls: each keeps its per-item correctness vector (best seed for the stochastic ones) for the paired sign test
  const vecs = {}, accOf = {};
  const accs = { label_derangement: [], content_shuffled: [] }, seedVecs = { label_derangement: [], content_shuffled: [] };
  let shufTexts0 = null;
  for (let s = 0; s < 3; s++) {
    const sig = derangement(n, mulberry32(seed + 100 + s));
    const ld = items.map((it, i) => full[i] === items[sig[i]].gold);
    accs.label_derangement.push(mean(ld.map(Number))); seedVecs.label_derangement.push(ld);
    const texts = items.map((it, i) => shuffled([...it.text], mulberry32(seed + 1000 * (s + 1) + i)).join(""));
    if (s === 0) shufTexts0 = texts;
    const sh = texts.map((t, i) => verdict(t, true) === items[i].gold);
    accs.content_shuffled.push(mean(sh.map(Number))); seedVecs.content_shuffled.push(sh);
  }
  for (const k of ["label_derangement", "content_shuffled"]) { const j = accs[k].indexOf(Math.max(...accs[k])); accOf[k] = accs[k][j]; vecs[k] = seedVecs[k][j]; }
  const counts = {};
  for (const it of items) counts[it.gold] = (counts[it.gold] ?? 0) + 1;
  const maj = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  vecs.majority_class = items.map((it) => it.gold === maj); accOf.majority_class = mean(vecs.majority_class.map(Number));
  // the A1 baselines, on the same items; and on the within-string permutations (the licences)
  const baseDetail = {}, shufRaw = {};
  for (const b of bnames) {
    const B = baselines[b];
    vecs[b] = items.map((it) => B.classify(it.text) === it.gold);
    accOf[b] = mean(vecs[b].map(Number));
    const shufAcc = mean(shufTexts0.map((t, i) => Number(B.classify(t) === items[i].gold)));
    shufRaw[b] = shufAcc;
    baseDetail[b] = {
      accuracy: round(accOf[b]), accuracy_on_shuffled_text: round(shufAcc), order_blind_by_construction: B.orderBlind, uses_order: B.usesOrder,
      live: accOf[b] - accOf.majority_class >= P.LICENCE_DROP,
      per_class_recall: Object.fromEntries(classes.map((c) => { const idx = items.map((it, i) => (it.gold === c ? i : -1)).filter((i) => i >= 0); return [c, round(mean(idx.map((i) => Number(vecs[b][i]))))]; })),
    };
  }
  const controls = { label_derangement: accOf.label_derangement, content_shuffled: accOf.content_shuffled, majority_class: accOf.majority_class, ...Object.fromEntries(bnames.map((b) => [b, accOf[b]])) };
  const strongestName = Object.entries(controls).sort((a, b) => b[1] - a[1])[0][0];
  const strongest = controls[strongestName];
  // licences: the shuffle control must move the reader; order-blind baselines must NOT move; the order-aware baseline must move
  const licence = { content_shuffled: { licensed: acc - controls.content_shuffled >= P.LICENCE_DROP, drop: round(acc - controls.content_shuffled) } };
  for (const b of bnames) {
    if (baselines[b].orderBlind) licence[`${b}_shuffle_invariant`] = { licensed: shufRaw[b] === accOf[b], delta: round(shufRaw[b] - accOf[b], 6) };
    else if (baselines[b].usesOrder) licence[`${b}_moves_under_shuffle`] = { licensed: shufRaw[b] < accOf[b], delta: round(shufRaw[b] - accOf[b], 6) };
  }
  // paired sign test of the real reader against the STRONGEST control (whichever it is)
  let wins = 0, losses = 0;
  for (let i = 0; i < n; i++) { if (correct[i] && !vecs[strongestName][i]) wins++; else if (!correct[i] && vecs[strongestName][i]) losses++; }
  const sign = signTest(wins, losses);
  const minRecall = Math.min(...Object.values(perClass).map((c) => c.recall ?? 0));
  const margin = acc - strongest;
  const broken = margin <= 0;
  const haveBaselines = bnames.length > 0;
  const licensedAll = Object.values(licence).every((l) => l.licensed);
  const pass = !haveBaselines ? null : !broken && acc >= P.MIN_ACC && margin >= P.MIN_MARGIN && sign.p < params.ALPHA && minRecall >= P.MIN_CLASS_RECALL && coverage >= P.MIN_COVERAGE && licensedAll;
  // reported-only diagnostic (NOT in the pass rule): the reader on the items the strongest ORDER-BLIND / grammar-free baseline gets wrong
  const wrongByStrongest = vecs[strongestName].map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const verdictOnBaselineErrors = { baseline: strongestName, n: wrongByStrongest.length, reader_accuracy_on_them: wrongByStrongest.length ? round(mean(wrongByStrongest.map((i) => Number(correct[i])))) : null, reader_wins: wins, reader_losses: losses };
  const gaps = [{ reason: "ambiguous_abstention", count: full.filter((v) => !v).length, of: n }, { reason: "wln_not_a_class", note: UNREAD_WLN }];
  if (!haveBaselines) gaps.push({ reason: "order_blind_baselines_unavailable", note: "no TRAIN corpus to fit them on: pass is null, never a pass (A1)" });
  const notes = [
    broken ? "a control does as well as the real arm: the instrument or the mechanism is broken" : "abstention counts as wrong; coverage reported",
    haveBaselines && margin < P.MIN_MARGIN ? `the reader does NOT beat the strongest control (${strongestName}) by the declared margin ${P.MIN_MARGIN}: no evidence of identification beyond ${strongestName} (A1: reported as FAIL, no ceiling exemption)` : null,
    haveBaselines && 1 - strongest < P.MIN_MARGIN ? `headroom ${round(1 - strongest)} is below MIN_MARGIN ${P.MIN_MARGIN}: the margin is unreachable on this task and the rung can only FAIL (reported, not exempted)` : null,
  ].filter(Boolean);
  return card({
    rung: "R0", system: "multiclass", split, n, score: acc, control: strongest, controls, pass, gaps, notes,
    details: {
      coverage: round(coverage), per_class: perClass, confusion, by_view: byView, prefix_accuracy: prefix,
      first_stable_correct_len: { decided: stableDecided.length, of: n, median: stableDecided.length ? stableDecided[Math.floor(stableDecided.length / 2)] : null },
      strongest_control: strongestName, headroom: round(1 - strongest), margin_reachable: 1 - strongest >= P.MIN_MARGIN,
      baselines: baseDetail, reader_vs_strongest_on_its_errors: verdictOnBaselineErrors,
      licence, sign_vs_strongest: { control: strongestName, ...sign }, min_class_recall: round(minRecall), majority_label: maj,
      claim: "pass = the reader's verdict beats the strongest of ALL controls, order-blind and grammar-free baselines included, by MIN_MARGIN; otherwise no evidence of identification from structure",
      prereg_sha256: PREREG_SHA256,
    },
  });
}
const UNREAD_WLN = adapter.UNREAD.wln.missing;

// ───────────────────────────── R1 ─────────────────────────────
const pairKey = (t) => `${t.start}:${t.end}`;
const tokenPairs = (toks) => toks.filter((t) => t.cls !== "incomplete").map((t) => [t.start, t.end]);

function charLevel(text) { return [...text].map((_, i) => [i, i + 1]); }
function letterRun(text) { const out = []; const re = /[A-Za-z]+|[0-9]+|[^A-Za-z0-9]/g; let m; while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]); return out; }
function randomCuts(text, k, rng) {
  const n = text.length; if (k <= 1 || n < 2) return [[0, n]];
  const cuts = new Set();
  while (cuts.size < Math.min(k - 1, n - 1)) cuts.add(1 + Math.floor(rng() * (n - 1)));
  const c = [0, ...[...cuts].sort((a, b) => a - b), n];
  return c.slice(0, -1).map((x, i) => [x, c[i + 1]]);
}
const sameTokens = (a, b) => a.length === b.length && a.every((x, i) => x[0] === b[i][0] && x[1] === b[i][1]);
function tokenCounts(pred, gold) { const g = new Set(gold.map((x) => x.join(":"))); let tp = 0; for (const x of pred) if (g.has(x.join(":"))) tp++; return { tp, fp: pred.length - tp, fn: gold.length - tp }; }

export function scoreR1Smiles({ recs, gold, reader, split, seed = PARAMS.SEED }) {
  const P = PARAMS.R1;
  const items = recs.filter((r) => gold.get(r.id)?.tok?.tokens);
  const dropped = recs.length - items.length;
  if (!items.length) return unmeasured("R1", split, "smiles", "no token gold");
  const arms = { real: [], char_level: [], letter_run: [], random_cuts: [] };
  const tot = { real: { tp: 0, fp: 0, fn: 0 }, char_level: { tp: 0, fp: 0, fn: 0 }, letter_run: { tp: 0, fp: 0, fn: 0 }, random_cuts: { tp: 0, fp: 0, fn: 0 } };
  const bad = [];
  items.forEach((r, i) => {
    const gt = gold.get(r.id).tok.tokens;
    const pred = {
      real: tokenPairs(reader.ear(r.smiles, { system: "smiles" })),
      char_level: charLevel(r.smiles), letter_run: letterRun(r.smiles), random_cuts: randomCuts(r.smiles, gt.length, mulberry32(seed + i)),
    };
    for (const k of Object.keys(arms)) {
      arms[k].push(sameTokens(pred[k], gt));
      const c = tokenCounts(pred[k], gt); tot[k].tp += c.tp; tot[k].fp += c.fp; tot[k].fn += c.fn;
    }
    if (!arms.real[i] && bad.length < 5) bad.push(r.smiles);
  });
  const exact = Object.fromEntries(Object.keys(arms).map((k) => [k, mean(arms[k].map(Number))]));
  const tokF1 = Object.fromEntries(Object.keys(tot).map((k) => [k, f1Of(tot[k].tp, tot[k].fp, tot[k].fn)]));
  const controls = { char_level: exact.char_level, letter_run: exact.letter_run, random_cuts: exact.random_cuts };
  const strongest = maxOf(controls);
  const strongestName = Object.entries(controls).sort((a, b) => b[1] - a[1])[0][0];
  let wins = 0, losses = 0;
  items.forEach((_, i) => { if (arms.real[i] && !arms[strongestName][i]) wins++; else if (!arms.real[i] && arms[strongestName][i]) losses++; });
  const sign = signTest(wins, losses);
  const licensed = tokF1.random_cuts <= tokF1.real - P.LICENCE_DROP;
  const margin = exact.real - strongest;
  const pass = exact.real >= P.MIN_EXACT && margin >= P.MIN_MARGIN && sign.p < PARAMS.ALPHA && licensed;
  return card({
    rung: "R1", system: "smiles", split, n: items.length, score: exact.real, control: strongest, controls, pass,
    gaps: dropped ? [{ reason: "no_token_gold_(rdkit_consequence_check_failed)", count: dropped, of: recs.length }] : [],
    notes: ["gold = published rxnfp regex tokenizer gated by RDKit consequences"],
    details: { token_f1: Object.fromEntries(Object.entries(tokF1).map(([k, v]) => [k, round(v)])), strongest_control: strongestName, licence: { random_cuts_token_f1_drop: { licensed, drop: round(tokF1.real - tokF1.random_cuts) } }, sign_vs_strongest: sign, examples_wrong: bad },
  });
}

export function scoreR1Inchi({ recs, reader, split, seed = PARAMS.SEED }) {
  const items = recs.slice();
  if (!items.length) return unmeasured("R1", split, "inchi", "no records");
  // mechanical gold: the header 'InChI=1S/' and every '/' layer delimiter (Technical Manual); no independent lexeme engine exists
  const mech = (t) => {
    const out = [];
    const m = /^InChI=1S?\//.exec(t);
    let off = 0;
    if (m) { out.push([0, m[0].length]); off = m[0].length; }
    let pos = off;
    t.slice(off).split("/").forEach((L, i) => { if (i > 0) out.push([pos - 1, pos]); pos += L.length + 1; });
    return out;
  };
  const rng = mulberry32(seed + 5);
  let exact = 0, ctl = 0;
  for (const r of items) {
    const gold = mech(r.inchi);
    const pred = reader.ear(r.inchi, { system: "inchi" }).filter((t) => t.cls === "header" || t.cls === "layer_sep").map((t) => [t.start, t.end]);
    if (sameTokens(pred, gold)) exact++;
    const cuts = new Set();
    while (cuts.size < Math.min(gold.length, r.inchi.length)) cuts.add(Math.floor(rng() * r.inchi.length));
    if (sameTokens([...cuts].sort((a, b) => a - b).map((p) => [p, p + 1]), gold)) ctl++;
  }
  const score = exact / items.length, control = ctl / items.length;
  return card({
    rung: "R1", system: "inchi", split, n: items.length, score, control, controls: { random_delimiters: control }, pass: null,
    gaps: [{ reason: "no_independent_authority_for_inchi_lexemes", note: "gold is the Technical-Manual delimiter rule (mechanical); reported, pass not asserted" }],
    notes: ["delimiter hearing only (header + '/'); element/count and atom-reference tokens are exercised at R2-R4 against RDKit-from-InChI"],
  });
}

// ───────────────────────────── R2 ─────────────────────────────
const attrKey = (a) => `${a.element}|${a.aromatic ? 1 : 0}|${a.charge}|${a.isotope}`;
function goldAtomKey(g) { return `${g[0]}|${g[2]}|${g[3]}|${g[4]}`; }
/** A2 strata, from the GOLD's own flags (NoImplicit => a bracket atom; 100% equal to the token's bracketedness in DEV and TEST). */
export const R2_STRATA = ["organic", "aromatic", "bracket"];
export const R2_DECISIVE = "bracket";
const strataOf = (ga) => (ga[6] === 1 ? "bracket" : ga[2] === 1 ? "aromatic" : "organic");

/** The v1 control, kept as a control (A2): capitalisation as THE signal, brackets NOT understood ('H' in [C@H] becomes an atom). Expected weak. */
function capsOnlyNaiveAtoms(text, elementSetArr) {
  const E = new Set(elementSetArr);
  const out = [];
  const re = /[A-Z][a-z]?|[a-z]/g;
  let m;
  while ((m = re.exec(text))) {
    const t = m[0];
    if (t.length === 2 && !E.has(t)) { out.push({ element: t[0], aromatic: false, charge: 0, isotope: 0 }); out.push({ element: t[1].toUpperCase(), aromatic: true, charge: 0, isotope: 0 }); continue; }
    if (t.length === 1 && t >= "a") out.push({ element: t.toUpperCase(), aromatic: true, charge: 0, isotope: 0 });
    else out.push({ element: t, aromatic: false, charge: 0, isotope: 0 });
  }
  return out;
}
/**
 * A2: capitalisation as the signal, brackets understood as atom CONTAINERS (the first symbol inside), nothing else read from them:
 * charge = 0, isotope = 0, H = 0. An uppercase letter is aliphatic, a lowercase one aromatic; two-letter symbols only when in the element table.
 * Scored per atom (it never zeroes a molecule).
 */
export function capsBracketAwareAtoms(text, elementSetArr) {
  const E = new Set(elementSetArr);
  const out = [];
  const re = /\[([^\]]*)\]|[A-Z][a-z]?|[a-z]|\*/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[0][0] === "[") {
      const inner = /^(\d+)?(\*|[A-Z][a-z]?|[a-z][a-z]?)/.exec(m[1]);
      if (!inner) { out.push({ element: "?", aromatic: false, charge: 0, isotope: 0, bracket: true, h: 0 }); continue; }
      const sym = inner[2];
      if (sym === "*") out.push({ element: "*", aromatic: false, charge: 0, isotope: 0, bracket: true, h: 0 });
      else if (sym[0] >= "a") { const two = sym.length === 2 && E.has(sym[0].toUpperCase() + sym[1]); out.push({ element: two ? sym[0].toUpperCase() + sym[1] : sym[0].toUpperCase(), aromatic: true, charge: 0, isotope: 0, bracket: true, h: 0 }); }
      else { const two = sym.length === 2 && E.has(sym); out.push({ element: two ? sym : sym[0], aromatic: false, charge: 0, isotope: 0, bracket: true, h: 0 }); }
      continue;
    }
    const t = m[0];
    if (t.length === 2 && !E.has(t)) { out.push({ element: t[0], aromatic: false, charge: 0, isotope: 0, bracket: false }); out.push({ element: t[1].toUpperCase(), aromatic: true, charge: 0, isotope: 0, bracket: false }); }
    else if (t.length === 1 && t >= "a") out.push({ element: t.toUpperCase(), aromatic: true, charge: 0, isotope: 0, bracket: false });
    else out.push({ element: t, aromatic: false, charge: 0, isotope: 0, bracket: false });
  }
  return out;
}
const atomMatches = (a, ga) => !!a && attrKey(a) === goldAtomKey(ga) && (!a.bracket || (a.h ?? 0) === ga[5]);

export function scoreR2Smiles({ recs, gold, reads, reader, split, elements, seed = PARAMS.SEED, params = PARAMS }) {
  const P = params.R2.smiles, LD = params.R2.LICENCE_DROP;
  const atomsX = []; // per gold atom: {s, real, aware, naive, der}
  const pool = []; // indices into atomsX of atoms whose read tuple exists (the reader's atom count == the gold's)
  const poolRead = [], poolGold = [];
  let usable = 0, mismatchMol = 0, awareMismatchMol = 0, hN = 0, hOk = 0;
  recs.forEach((r, i) => {
    const g = gold.get(r.id)?.smi;
    if (!g?.ok) return;
    usable++;
    const atoms = reads[i].beings.filter((b) => b.kind === "atom");
    const aware = capsBracketAwareAtoms(r.smiles, elements);
    const naive = capsOnlyNaiveAtoms(r.smiles, elements);
    const sameCount = atoms.length === g.atoms.length;
    if (!sameCount) mismatchMol++;
    if (aware.length !== g.atoms.length) awareMismatchMol++;
    g.atoms.forEach((ga, k) => {
      const a = sameCount ? atoms[k] : null;
      const naiveOk = naive.length === g.atoms.length && attrKey(naive[k]) === goldAtomKey(ga) && !(ga[6] === 1 && ga[5] > 0);
      atomsX.push({ s: strataOf(ga), real: atomMatches(a, ga), aware: atomMatches(aware[k], ga), naive: naiveOk, der: false });
      if (a) { pool.push(atomsX.length - 1); poolRead.push(attrKey(a) + "|" + (a.bracket ? a.h : "-")); poolGold.push(goldAtomKey(ga) + "|" + (a.bracket ? ga[5] : "-")); }
    });
    // implicit-H (secondary): organic-subset atoms vs sanitized RDKit total H
    if (g.h_total && sameCount) atoms.forEach((a, k) => { if (!a.bracket && a.h_total !== null && a.h_total !== undefined) { hN++; if (a.h_total === g.h_total[k]) hOk++; } });
  });
  if (!atomsX.length) return unmeasured("R2", split, "smiles", "no parsed gold atoms");
  // deranged attributes: deal the read tuples out across the atoms that have one
  const sig = derangement(pool.length, mulberry32(seed + 31));
  if (sig) for (let i = 0; i < pool.length; i++) atomsX[pool[i]].der = poolRead[sig[i]] === poolGold[i];
  const rate = (rows, k) => (rows.length ? rows.filter((x) => x[k]).length / rows.length : null);
  const byStratum = {};
  for (const s of R2_STRATA) {
    const rows = atomsX.filter((x) => x.s === s);
    byStratum[s] = { n: rows.length, supported: rows.length >= P.MIN_STRATUM, real: rate(rows, "real"), caps_bracket_aware: rate(rows, "aware"), caps_only_naive: rate(rows, "naive"), deranged_attributes: rate(rows, "der") };
  }
  const D = byStratum[R2_DECISIVE];
  const micro = { n: atomsX.length, real: rate(atomsX, "real"), caps_bracket_aware: rate(atomsX, "aware"), caps_only_naive: rate(atomsX, "naive"), deranged_attributes: rate(atomsX, "der") };
  const ctlKey = { caps_bracket_aware: "aware", caps_only_naive: "naive", deranged_attributes: "der" };
  const argmax = (o) => Object.keys(ctlKey).map((k) => [k, o[k] ?? -1]).sort((a, b) => b[1] - a[1])[0];
  const pairedSign = (rows, name) => { let w = 0, l = 0; for (const x of rows) { const c = x[ctlKey[name]]; if (x.real && !c) w++; else if (!x.real && c) l++; } return signTest(w, l); };
  // decisive stratum (the headline)
  const [bestD, bestDv] = D.n ? argmax(D) : [null, null];
  const signD = D.n ? pairedSign(atomsX.filter((x) => x.s === R2_DECISIVE), bestD) : null;
  // the v1 micro rule: printed beside, and a CONJUNCT of the pass (Amendment 1b)
  const [bestM, bestMv] = argmax(micro);
  const signM = pairedSign(atomsX, bestM);
  const microPass = micro.real >= P.MIN_SCORE && micro.real - bestMv >= P.MIN_MARGIN && signM.p < params.ALPHA && micro.deranged_attributes <= micro.real - LD;
  // licences
  const capsPlain = rate(atomsX.filter((x) => x.s !== R2_DECISIVE), "aware");
  const licence = {
    deranged_attributes_decisive: { licensed: D.n ? D.deranged_attributes <= D.real - LD : false, drop: D.n ? round(D.real - D.deranged_attributes) : null },
    caps_control_competent_on_plain_strata: { licensed: capsPlain !== null && capsPlain >= P.MIN_CONTROL_PLAIN, score: round(capsPlain), floor: P.MIN_CONTROL_PLAIN },
  };
  const strataOk = R2_STRATA.filter((s) => byStratum[s].supported).every((s) => byStratum[s].real >= P.MIN_SCORE);
  const dMargin = D.n ? D.real - bestDv : null;
  const v2 = D.supported && strataOk && dMargin >= P.MIN_MARGIN && signD.p < params.ALPHA && licence.deranged_attributes_decisive.licensed && licence.caps_control_competent_on_plain_strata.licensed;
  const pass = D.supported ? v2 && microPass : null;
  const controls = { caps_bracket_aware: D.caps_bracket_aware, caps_only_naive: D.caps_only_naive, deranged_attributes: D.deranged_attributes };
  const gaps = [
    mismatchMol ? { reason: "atom_count_differs_from_rdkit", count: mismatchMol, of: usable } : null,
    recs.length - usable ? { reason: "rdkit_parse_failed", count: recs.length - usable, of: recs.length } : null,
    !D.supported ? { reason: "decisive_stratum_unsupported", stratum: R2_DECISIVE, n: D.n, need: P.MIN_STRATUM } : null,
    ...R2_STRATA.filter((s) => s !== R2_DECISIVE && !byStratum[s].supported).map((s) => ({ reason: "stratum_unsupported", stratum: s, n: byStratum[s].n, need: P.MIN_STRATUM, note: "empty or too small in this split: not scored, never counted as a pass" })),
  ].filter(Boolean);
  const fix = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" && k !== "n" ? round(v) : v]));
  return card({
    rung: "R2", system: "smiles", split, n: D.n, score: D.real, control: bestDv, controls, pass, gaps,
    notes: [
      "headline = the DECISIVE stratum (bracket atoms: element, aromatic, charge, isotope and explicit H must all be read); micro and the other strata are in details",
      "pass = the v1 micro rule AND every stratified condition (Amendment 1b); capitalisation is ONE witness: caps_bracket_aware reads element letters by case and brackets as containers only",
    ],
    details: {
      strata: Object.fromEntries(R2_STRATA.map((s) => [s, fix(byStratum[s])])),
      micro: fix(micro),
      micro_v1_rule: { score: round(micro.real), strongest_control: bestM, strongest_control_score: round(bestMv), margin: round(micro.real - bestMv), floor_score: P.MIN_SCORE, floor_margin: P.MIN_MARGIN, sign: signM, pass: microPass },
      strongest_control_on_decisive_stratum: bestD, decisive_margin: round(dMargin), sign_vs_strongest_decisive: signD,
      licence, strata_floor_ok: strataOk,
      total_h_accuracy_organic_subset: { n: hN, accuracy: round(hOk / (hN || 1)) },
      molecules_usable: usable, caps_bracket_aware_atom_count_differs_molecules: awareMismatchMol,
    },
  });
}

/** An independent, minimal expansion of the InChI formula layer (this file's own control; NOT the adapter). H is never numbered. */
export function expandFormulaLayer(inchi, { alphabetical = false } = {}) {
  const f = /^InChI=1S?\/([^/]*)/.exec(inchi)?.[1] ?? inchi.split("/")[0];
  const atoms = [];
  for (const part of f.split(".")) {
    const m = /^(\d+)?(.*)$/.exec(part);
    const mult = m[1] ? +m[1] : 1;
    let els = [...m[2].matchAll(/([A-Z][a-z]?)(\d*)/g)].map((x) => [x[1], x[2] ? +x[2] : 1]).filter((x) => x[0] !== "H");
    if (alphabetical) els = els.slice().sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (let k = 0; k < mult; k++) for (const [e, c] of els) for (let j = 0; j < c; j++) atoms.push(e);
  }
  return atoms;
}

export function scoreR2Inchi({ recs, gold, reads, split, seed = PARAMS.SEED, params = PARAMS }) {
  const P = params.R2.inchi;
  let n = 0, ok = 0, alpha = 0, formulaOnly = 0, wins = 0, losses = 0, mism = 0, usable = 0;
  const pool = [], poolGold = [];
  const dec = { molecules: 0, atoms: 0, real: 0, alphabetical: 0, formula_order_only: 0 };
  let nonDecAtoms = 0, nonDecReal = 0;
  recs.forEach((r, i) => {
    const g = gold.get(r.id)?.inchi;
    if (!g?.ok) return;
    usable++;
    const atoms = reads[i].beings.filter((b) => b.kind === "atom");
    const same = atoms.length === g.atoms.length;
    if (!same) mism++;
    const alphaAtoms = expandFormulaLayer(r.inchi, { alphabetical: true });
    const fmtAtoms = expandFormulaLayer(r.inchi);
    const decisive = alphaAtoms.length === fmtAtoms.length && alphaAtoms.some((e, k) => e !== fmtAtoms[k]);
    if (decisive) dec.molecules++;
    g.atoms.forEach((sym, k) => {
      n++;
      const real = same && atoms[k].element === sym;
      const al = alphaAtoms.length === g.atoms.length && alphaAtoms[k] === sym;
      const fo = fmtAtoms.length === g.atoms.length && fmtAtoms[k] === sym;
      if (real) ok++;
      if (al) alpha++;
      if (fo) formulaOnly++;
      if (decisive) { dec.atoms++; if (real) dec.real++; if (al) dec.alphabetical++; if (fo) dec.formula_order_only++; } else { nonDecAtoms++; if (real) nonDecReal++; }
      if (same) { pool.push(atoms[k].element); poolGold.push(sym); }
    });
  });
  if (!n) return unmeasured("R2", split, "inchi", "no parsed InChI gold");
  const sig = derangement(pool.length, mulberry32(seed + 41));
  let der = 0;
  if (sig) for (let i = 0; i < pool.length; i++) der += pool[sig[i]] === poolGold[i] ? 1 : 0;
  let carbonOk = 0; for (const s of poolGold) if (s === "C") carbonOk++;
  const score = ok / n;
  const controls = { deranged_elements: (der / (pool.length || 1)) * (pool.length / n), always_carbon: carbonOk / n, alphabetical_numbering: alpha / n, formula_order_only: formulaOnly / n };
  const strongest = maxOf(controls);
  const strongestName = Object.entries(controls).sort((a, b) => b[1] - a[1])[0][0];
  // paired sign vs the strongest control (deranged_elements has no per-atom vector here: it is never the strongest in practice)
  recs.forEach((r, i) => {
    const g = gold.get(r.id)?.inchi; if (!g?.ok) return;
    const atoms = reads[i].beings.filter((b) => b.kind === "atom");
    const ctl = strongestName === "alphabetical_numbering" || strongestName === "formula_order_only" ? expandFormulaLayer(r.inchi, { alphabetical: strongestName === "alphabetical_numbering" }) : null;
    g.atoms.forEach((sym, k) => {
      const real = atoms.length === g.atoms.length && atoms[k].element === sym;
      const c = strongestName === "always_carbon" ? sym === "C" : ctl ? ctl.length === g.atoms.length && ctl[k] === sym : false;
      if (real && !c) wins++; else if (!real && c) losses++;
    });
  });
  const sign = signTest(wins, losses);
  const margin = score - strongest;
  const v1RuleVerdict = score >= P.MIN_SCORE && margin >= P.MIN_MARGIN && sign.p < params.ALPHA;
  const frac = (x, d) => (d ? round(x / d) : null);
  return card({
    rung: "R2", system: "inchi", split, n, score, control: strongest, controls, pass: null,
    gaps: [
      { reason: "mechanical_rung", note: "the unit tested is the expansion of the formula layer: a deterministic function of the text whose rule IS the formula order (Technical Manual). formula_order_only is the real arm's own rule, so its margin is 0 by construction; no pass is asserted (Amendment 1, A2)" },
      mism ? { reason: "atom_count_differs_from_rdkit", count: mism, of: usable } : null,
    ].filter(Boolean),
    notes: ["element at InChI number: formula layer expanded in written (Hill) order, H never numbered", "declared MECHANICAL (pass null); the v1 verdict with the promoted controls is in details.v1_rule_verdict"],
    details: {
      v1_rule_verdict: { pass: v1RuleVerdict, strongest_control: strongestName, margin: round(margin), floor_margin: P.MIN_MARGIN },
      // a mechanical rung cannot be PASSED, but it is reported when the reader does worse than the rule it is supposed to apply
      reader_below_mechanical_rule: score < controls.formula_order_only, floor_check: { floor: P.MIN_SCORE, met: score >= P.MIN_SCORE },
      decisive_subset: { definition: "molecules whose written (Hill) element order differs from alphabetical order", molecules: dec.molecules, supported: dec.molecules >= P.MIN_DECISIVE, atoms: dec.atoms, real: frac(dec.real, dec.atoms), alphabetical_numbering: frac(dec.alphabetical, dec.atoms), formula_order_only: frac(dec.formula_order_only, dec.atoms), non_decisive_real: frac(nonDecReal, nonDecAtoms) },
      sign_vs_strongest: { control: strongestName, ...sign },
    },
  });
}

// ───────────────────────────── R3 ─────────────────────────────
const setKey = (m) => m.join(",");
function multisetTP(pred, gold) { const g = new Map(); for (const x of gold) g.set(x, (g.get(x) ?? 0) + 1); let tp = 0; for (const x of pred) { const c = g.get(x) ?? 0; if (c > 0) { tp++; g.set(x, c - 1); } } return tp; }

function beingSets(res) {
  const atoms = res.beings.filter((b) => b.kind === "atom").map((b) => `${b.id}|${b.element}|${b.span?.[0] ?? ""}`);
  const rings = res.beings.filter((b) => b.kind === "ring").map((b) => setKey(b.members));
  const comps = res.beings.filter((b) => b.kind === "component").map((b) => setKey(b.members));
  return { atoms, rings, comps };
}
function goldSetsSmiles(g, tok, text) {
  const spans = tok?.tokens ? tok.tokens.filter(([s, e]) => /^(\[[^\]]+\]|Br|Cl|B|C|N|O|S|P|F|I|b|c|n|o|s|p|\*)$/.test(text.slice(s, e))).map(([s]) => s) : null;
  return {
    atoms: g.atoms.map((a, i) => `a${i}|${a[0]}|${spans ? spans[i] : ""}`),
    rings: (g.rings ?? []).map(setKey),
    comps: g.comps.map(setKey),
  };
}
function naiveText(text) {
  const atoms = [];
  const re = /[A-Za-z]/g; let m;
  while ((m = re.exec(text))) atoms.push({ el: m[0].toUpperCase(), pos: m.index });
  const closes = new Map();
  const rings = [];
  const rr = /%\d\d|\d/g;
  while ((m = rr.exec(text))) {
    const k = m[0];
    if (closes.has(k)) { const a = closes.get(k); closes.delete(k); const mem = atoms.map((x, i) => (x.pos >= a - 1 && x.pos < m.index ? i : -1)).filter((i) => i >= 0); if (mem.length) rings.push(setKey(mem)); }
    else closes.set(k, m.index);
  }
  const comps = [];
  let off = 0;
  for (const seg of text.split(".")) { const mem = atoms.map((x, i) => (x.pos >= off && x.pos < off + seg.length ? i : -1)).filter((i) => i >= 0); if (mem.length) comps.push(setKey(mem)); off += seg.length + 1; }
  return { atoms: atoms.map((a, i) => `a${i}|${a.el}|${a.pos}`), rings, comps };
}
function macroF1(parts) {
  const f = [];
  const per = {};
  for (const k of ["atoms", "rings", "comps"]) {
    const p = parts[k];
    if (p.tp + p.fn === 0) { per[k] = { f1: null, support: 0 }; continue; }
    const v = f1Of(p.tp, p.fp, p.fn);
    per[k] = { f1: round(v), support: p.tp + p.fn, tp: p.tp, fp: p.fp, fn: p.fn };
    f.push(v);
  }
  return { macro: f.length ? mean(f) : null, per };
}
const newParts = () => ({ atoms: { tp: 0, fp: 0, fn: 0 }, rings: { tp: 0, fp: 0, fn: 0 }, comps: { tp: 0, fp: 0, fn: 0 } });
function addParts(parts, pred, gold) { for (const k of ["atoms", "rings", "comps"]) { const tp = multisetTP(pred[k], gold[k]); parts[k].tp += tp; parts[k].fp += pred[k].length - tp; parts[k].fn += gold[k].length - tp; } }
const exactMol = (pred, gold) => ["atoms", "rings", "comps"].every((k) => multisetTP(pred[k], gold[k]) === gold[k].length && pred[k].length === gold[k].length);

// causality: prefix reads must be a SUBSET of the full read
export function causalViolations(recs, reader, sys, { sample = PARAMS.CAUSAL_SAMPLE, cuts = PARAMS.CAUSAL_CUTS, seed = PARAMS.SEED, readFn = null } = {}) {
  const pick = shuffled(recs, mulberry32(seed + 9)).slice(0, sample);
  let checked = 0, violations = 0;
  const examples = [];
  const rd = readFn ?? ((t, final) => reader.read(t, { system: sys, final }));
  for (const r of pick) {
    const text = sys === "smiles" ? r.smiles : r.inchi;
    const toks = reader.ear(text, { system: sys });
    const comp = sys === "inchi" ? toks.filter((t) => t.cls === "atom_ref") : toks.filter((t) => t.cls !== "incomplete");
    if (comp.length < 4) continue;
    const full = rd(text, true);
    const fullAtoms = new Map(full.beings.filter((b) => b.kind === "atom").map((b) => [b.id, b.element]));
    const fullRel = new Set(full.relations.map((x) => [x.end1, x.end2].sort().join("-")));
    const fullRings = new Set(full.beings.filter((b) => b.kind === "ring").map((b) => setKey(b.members)));
    for (const c of cuts) {
      const t = comp[Math.max(0, Math.min(comp.length - 1, Math.floor(c * comp.length) - 1))];
      const pre = rd(text.slice(0, t.end), false);
      checked++;
      const badAtom = pre.beings.some((b) => b.kind === "atom" && fullAtoms.get(b.id) !== b.element && !(sys === "inchi"));
      const badRel = pre.relations.some((x) => !fullRel.has([x.end1, x.end2].sort().join("-")));
      const badRing = pre.beings.some((b) => b.kind === "ring" && !fullRings.has(setKey(b.members)));
      if (badAtom || badRel || badRing) { violations++; if (examples.length < 3) examples.push({ text: text.slice(0, 80), cut: t.end }); }
    }
  }
  return { checked, violations, examples };
}
/** A deliberately LOOKAHEAD reader (licence for the causality check): atom ids are numbered from the END of the text read so far. */
function lookaheadRead(reader, sys) {
  return (t, final) => {
    const r = reader.read(t, { system: sys, final });
    const n = r.beings.filter((b) => b.kind === "atom").length;
    const re = (id) => (id[0] === "a" ? `a${n - 1 - +id.slice(1)}` : id);
    return { ...r, beings: r.beings.map((b) => (b.kind === "atom" ? { ...b, id: re(b.id) } : b)), relations: r.relations.map((x) => ({ ...x, end1: re(x.end1), end2: re(x.end2) })) };
  };
}

// per-kind F1s, raw (unrounded), and their macro over the kinds that have support
function kindF1(parts) {
  const out = { per: {}, macro: null };
  const f = [];
  for (const k of ["atoms", "rings", "comps"]) {
    const p = parts[k];
    if (p.tp + p.fn === 0) { out.per[k] = { f1: null, support: 0 }; continue; }
    const v = f1Of(p.tp, p.fp, p.fn);
    out.per[k] = { f1: v, support: p.tp + p.fn, tp: p.tp, fp: p.fp, fn: p.fn };
    f.push(v);
  }
  out.macro = f.length ? mean(f) : null;
  return out;
}
const roundPer = (per) => Object.fromEntries(Object.entries(per).map(([k, v]) => [k, { ...v, f1: round(v.f1) }]));
const ringExact = (pred, gold) => multisetTP(pred.rings, gold.rings) === gold.rings.length && pred.rings.length === gold.rings.length;

/**
 * A3: ring logic replaced by the TEXTUAL INTERVAL between a closure-digit pair; the reader's atoms and components are CREDITED, so only
 * ring reasoning is tested. `atomStarts` = the start offsets of the atoms the reader read, in text order. Digits inside brackets are not closures.
 */
export function naiveRingsSmiles(text, atomStarts) {
  const re = /\[[^\]]*\]|%\(\d{3}\)|%\d\d|\d/g;
  const open = new Map();
  const rings = [];
  let m;
  while ((m = re.exec(text))) {
    const tk = m[0];
    if (tk[0] === "[") continue;
    let lo = 0, hi = atomStarts.length - 1, own = -1; // owner = the last atom starting before the digit
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (atomStarts[mid] < m.index) { own = mid; lo = mid + 1; } else hi = mid - 1; }
    if (own < 0) continue;
    if (open.has(tk)) {
      const a = open.get(tk); open.delete(tk);
      if (a !== own) { const mem = []; for (let k = Math.min(a, own); k <= Math.max(a, own); k++) mem.push(k); rings.push(setKey(mem)); }
    } else open.set(tk, own);
  }
  return rings;
}
/** The InChI analogue: the textual interval between two mentions of the same atom reference inside one connection-layer segment ('n*' repeats expanded). */
export function naiveRingsInchi(text, compStarts) {
  const head = /^InChI=1S?\//.exec(text);
  const layers = text.slice(head ? head[0].length : 0).split("/");
  const cl = layers.find((L, i) => i > 0 && L[0] === "c");
  if (!cl) return [];
  const rings = [];
  let comp = 0;
  for (const seg of cl.slice(1).split(";")) {
    let s = seg, reps = 1;
    const rm = /^(\d+)\*/.exec(s);
    if (rm) { reps = +rm[1]; s = s.slice(rm[0].length); }
    for (let rep = 0; rep < reps; rep++) {
      const base = compStarts[comp] ?? 0;
      const seen = new Map();
      const seq = [];
      for (const x of s.matchAll(/\d+/g)) {
        const ref = +x[0] - 1;
        if (seen.has(ref)) { const mem = new Set(); for (let k = seen.get(ref); k < seq.length; k++) mem.add(seq[k]); rings.push(setKey([...mem].map((v) => v + base).sort((a, b) => a - b))); }
        else seen.set(ref, seq.length);
        seq.push(ref);
      }
      comp++;
    }
  }
  return rings;
}

export function scoreR3Smiles({ recs, gold, reads, reader, split, seed = PARAMS.SEED, params = PARAMS }) {
  const P = params.R3;
  const parts = newParts(), partsNaiveText = newParts(), partsNaiveRings = newParts(), partsDer = newParts(), partsNaiveRingsDer = newParts();
  let n = 0, exR = 0, exN = 0, winsN = 0, lossesN = 0, winsD = 0, lossesD = 0;
  const usable = [];
  recs.forEach((r, i) => { if (gold.get(r.id)?.smi?.ok) usable.push(i); });
  if (!usable.length) return unmeasured("R3", split, "smiles", "no parsed gold");
  const sig = derangement(usable.length, mulberry32(seed + 51));
  const byMu = { mono: { tp: 0, fp: 0, fn: 0 }, poly: { tp: 0, fp: 0, fn: 0 } };
  const ringBad = [];
  const naiveSets = new Map();
  usable.forEach((i, u) => {
    const r = recs[i], g = gold.get(r.id);
    const gs = goldSetsSmiles(g.smi, g.tok, r.smiles);
    const pr = beingSets(reads[i]);
    const starts = reads[i].beings.filter((b) => b.kind === "atom").map((b) => b.span?.[0]).filter((x) => x !== undefined);
    const nr = { atoms: pr.atoms, comps: pr.comps, rings: naiveRingsSmiles(r.smiles, starts) };
    naiveSets.set(i, nr);
    addParts(parts, pr, gs);
    addParts(partsNaiveText, naiveText(r.smiles), gs);
    addParts(partsNaiveRings, nr, gs);
    if (sig) addParts(partsDer, beingSets(reads[usable[sig[u]]]), gs);
    n++;
    const a = ringExact(pr, gs), b = ringExact(nr, gs), c = sig ? ringExact(beingSets(reads[usable[sig[u]]]), gs) : false;
    if (a) exR++; if (b) exN++;
    if (a && !b) winsN++; else if (!a && b) lossesN++;
    if (a && !c) winsD++; else if (!a && c) lossesD++;
    const bucket = (g.smi.mu ?? 0) >= 2 ? byMu.poly : byMu.mono;
    const tp = multisetTP(pr.rings, gs.rings); bucket.tp += tp; bucket.fp += pr.rings.length - tp; bucket.fn += gs.rings.length - tp;
    if (!a) { if (ringBad.length < 6) ringBad.push({ smiles: r.smiles.slice(0, 90), read: pr.rings.length, gold: gs.rings.length }); }
  });
  // the naive_rings control moved onto another molecule's gold: it must fall (licence that the control is live)
  usable.forEach((i, u) => { if (sig) addParts(partsNaiveRingsDer, naiveSets.get(i), goldSetsSmiles(gold.get(recs[usable[sig[u]]].id).smi, gold.get(recs[usable[sig[u]]].id).tok, recs[usable[sig[u]]].smiles)); });
  const real = kindF1(parts), naive = kindF1(partsNaiveRings), der = kindF1(partsDer), nt = kindF1(partsNaiveText), nrd = kindF1(partsNaiveRingsDer);
  if (real.per.rings.support === 0) return { ...unmeasured("R3", split, "smiles", "no rings in the gold: the decisive kind has no support"), details: { per_kind: roundPer(real.per) } };
  const ringReal = real.per.rings.f1, ringNaive = naive.per.rings.f1, ringDer = der.per.rings.f1;
  const controls = { deranged: ringDer, naive_rings: ringNaive };
  const strongest = maxOf(controls);
  const caus = causalViolations(usable.map((i) => recs[i]), reader, "smiles", { seed });
  const lookahead = causalViolations(usable.map((i) => recs[i]), reader, "smiles", { seed, readFn: lookaheadRead(reader, "smiles") });
  const strongestName = ringNaive >= ringDer ? "naive_rings" : "deranged";
  const sign = strongestName === "naive_rings" ? signTest(winsN, lossesN) : signTest(winsD, lossesD);
  const licence = {
    deranged: { licensed: ringDer <= ringReal - P.LICENCE_DROP },
    naive_rings_live: { licensed: (nrd.per.rings.f1 ?? 0) <= ringNaive - P.LICENCE_DROP, naive_rings_on_deranged_gold: round(nrd.per.rings.f1) },
  };
  const kindFloorOk = Object.values(real.per).filter((v) => v.support > 0).every((v) => v.f1 >= P.MIN_KIND_F1);
  const margin = ringReal - strongest;
  const macroMargin = real.macro - Math.max(naive.macro, der.macro);
  const pass = ringReal >= P.MIN_KIND_F1 && kindFloorOk && real.macro >= P.MIN_MACRO_F1 && margin >= P.MIN_MARGIN && sign.p < params.ALPHA && licence.deranged.licensed && licence.naive_rings_live.licensed && caus.violations === 0 && lookahead.violations > 0;
  return card({
    rung: "R3", system: "smiles", split, n, score: ringReal, control: strongest, controls, pass,
    gaps: [{ reason: "ring_beings_are_causal_shortest_cycles_not_symmetrised_SSSR", note: "see details.rings; predicted to under-read caged/bridged systems" }],
    notes: ["headline = RING F1 (the decisive kind: atoms and components are lexer-trivial and reported); pass needs every kind >= MIN_KIND_F1", "naive_rings credits the reader's atoms and components and replaces only ring logic with the textual interval between a closure-digit pair"],
    details: {
      per_kind: roundPer(real.per), macro_f1: { real: round(real.macro), naive_rings: round(naive.macro), deranged: round(der.macro), naive_text_strawman: round(nt.macro) },
      macro_v1_rule_with_fair_control: { macro_margin: round(macroMargin), floor_margin: P.MIN_MARGIN, pass_v1_shape: real.macro >= P.MIN_MACRO_F1 && macroMargin >= P.MIN_MARGIN, note: "diluted by the credited kinds (Amendment 1b, ii): printed, not decisive" },
      naive_rings_per_kind: roundPer(naive.per), naive_text_strawman_per_kind: roundPer(nt.per),
      kind_floor_ok: kindFloorOk,
      rings_by_cyclomatic: { monocyclic: round(f1Of(byMu.mono.tp, byMu.mono.fp, byMu.mono.fn)), polycyclic: round(f1Of(byMu.poly.tp, byMu.poly.fp, byMu.poly.fn)) },
      ring_examples_wrong: ringBad, ring_exact_molecule_rate: { real: round(exR / n), naive_rings: round(exN / n) },
      causality: caus, causality_licence_lookahead_reader: lookahead, sign_vs_strongest: { control: strongestName, ...sign }, licence,
    },
  });
}

export function scoreR3Inchi({ recs, gold, reads, reader, split, seed = PARAMS.SEED, params = PARAMS }) {
  const P = params.R3;
  const parts = newParts(), partsDer = newParts(), partsBlind = newParts(), partsNaiveRings = newParts(), partsNaiveRingsDer = newParts();
  const usable = [];
  recs.forEach((r, i) => { if (gold.get(r.id)?.inchi?.ok) usable.push(i); });
  if (!usable.length) return unmeasured("R3", split, "inchi", "no parsed InChI gold");
  const sig = derangement(usable.length, mulberry32(seed + 61));
  let n = 0, wins = 0, losses = 0;
  const gsets = (g) => ({ atoms: g.atoms.map((s, i) => `a${i}|${s}|`), rings: (g.rings ?? []).map(setKey), comps: g.comps.map(setKey) });
  const psets = (res) => { const s = beingSets(res); return { atoms: res.beings.filter((b) => b.kind === "atom").map((b) => `${b.id}|${b.element}|`), rings: s.rings, comps: s.comps }; };
  const prs = usable.map((i) => psets(reads[i]));
  const naiveRs = usable.map((i) => ({ ...psets(reads[i]), rings: naiveRingsInchi(recs[i].inchi, reads[i].beings.filter((b) => b.kind === "component").map((b) => b.members[0])) }));
  usable.forEach((i, u) => {
    const g = gold.get(recs[i].id).inchi, gs = gsets(g), pr = prs[u];
    addParts(parts, pr, gs);
    if (sig) addParts(partsDer, prs[sig[u]], gs);
    // formula-only control: the atoms the formula layer declares, no connection layer at all
    addParts(partsBlind, { atoms: pr.atoms, rings: [], comps: [] }, gs);
    addParts(partsNaiveRings, naiveRs[u], gs);
    if (sig) addParts(partsNaiveRingsDer, naiveRs[u], gsets(gold.get(recs[usable[sig[u]]].id).inchi));
    n++;
  });
  const real = kindF1(parts), der = kindF1(partsDer), blind = kindF1(partsBlind), naive = kindF1(partsNaiveRings), nrd = kindF1(partsNaiveRingsDer);
  if (real.per.rings.support === 0) return { ...unmeasured("R3", split, "inchi", "no rings in the gold: the decisive kind has no support"), details: { per_kind: roundPer(real.per) } };
  const ringReal = real.per.rings.f1;
  const controls = { deranged: der.per.rings.f1, formula_only: blind.per.rings.f1 ?? 0, naive_rings: naive.per.rings.f1 };
  const strongest = maxOf(controls);
  const strongestName = Object.entries(controls).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0][0];
  // paired per-molecule ring exactness vs the strongest control (formula_only has no rings: never ahead of a reader that reads some)
  usable.forEach((i, u) => {
    const gs = gsets(gold.get(recs[i].id).inchi);
    const a = ringExact(prs[u], gs);
    const b = strongestName === "naive_rings" ? ringExact(naiveRs[u], gs) : strongestName === "deranged" ? (sig ? ringExact(prs[sig[u]], gs) : false) : ringExact({ rings: [] }, gs);
    if (a && !b) wins++; else if (!a && b) losses++;
  });
  const caus = causalViolations(usable.map((i) => recs[i]), reader, "inchi", { seed });
  const sign = signTest(wins, losses);
  const licence = {
    deranged: { licensed: (der.per.rings.f1 ?? 0) <= ringReal - P.LICENCE_DROP },
    naive_rings_live: { licensed: (nrd.per.rings.f1 ?? 0) <= (naive.per.rings.f1 ?? 0) - P.LICENCE_DROP, naive_rings_on_deranged_gold: round(nrd.per.rings.f1) },
  };
  const kindFloorOk = Object.values(real.per).filter((v) => v.support > 0).every((v) => v.f1 >= P.MIN_KIND_F1);
  const margin = ringReal - strongest;
  const pass = ringReal >= P.MIN_KIND_F1 && kindFloorOk && real.macro >= P.MIN_MACRO_F1 && margin >= P.MIN_MARGIN && sign.p < params.ALPHA && licence.deranged.licensed && licence.naive_rings_live.licensed && caus.violations === 0;
  return card({
    rung: "R3", system: "inchi", split, n, score: ringReal, control: strongest, controls, pass,
    gaps: [{ reason: "naive_rings_inchi_is_branch_blind", note: "the InChI interval control ignores parentheses (branches), like the SMILES one, but InChI's canonical numbering puts closures far apart: it is much weaker than the SMILES control; no branch-aware control was pre-registered, so the InChI ring margin is an upper bound" }],
    notes: ["headline = RING F1; atoms declared by the formula layer (H never numbered); rings/components from the connection layer; pass needs every kind >= MIN_KIND_F1", "naive_rings credits the reader's atoms and components and replaces only ring logic with the textual interval between two mentions of one atom reference"],
    details: { per_kind: roundPer(real.per), macro_f1: { real: round(real.macro), formula_only: round(blind.macro), deranged: round(der.macro), naive_rings: round(naive.macro) }, naive_rings_per_kind: roundPer(naive.per), kind_floor_ok: kindFloorOk, strongest_control: strongestName, causality: caus, sign_vs_strongest: { control: strongestName, ...sign }, licence },
  });
}

// ───────────────────────────── R4 ─────────────────────────────
const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export function scoreR4Smiles({ recs, gold, reads, reader, split, seed = PARAMS.SEED }) {
  const P = PARAMS.R4.smiles;
  const usable = [];
  recs.forEach((r, i) => { if (gold.get(r.id)?.smi?.ok) usable.push(i); });
  if (!usable.length) return unmeasured("R4", split, "smiles", "no parsed gold");
  const sig = derangement(usable.length, mulberry32(seed + 71));
  const T = () => ({ tp: 0, fp: 0, fn: 0 });
  const lab = { real: T(), chain_only: T(), deranged: T() }, unl = { real: T(), chain_only: T(), deranged: T() };
  let wins = 0, losses = 0, resN = 0, resOk = 0, n = 0;
  const bad = [];
  const edges = (rels, resolved = false) => rels.map((x) => ({ k: edgeKey(+x.end1.slice(1), +x.end2.slice(1)), label: x.label }));
  const add = (T_, pred, gold_, labelled) => {
    const g = new Map(); for (const b of gold_) g.set(b.k, (g.get(b.k) ?? []).concat(b.label));
    let tp = 0;
    for (const p of pred) { const L = g.get(p.k); if (!L) continue; const idx = labelled ? L.indexOf(p.label) : (L.length ? 0 : -1); if (idx >= 0) { L.splice(idx, 1); tp++; if (!L.length) g.delete(p.k); } }
    T_.tp += tp; T_.fp += pred.length - tp; T_.fn += gold_.length - tp;
    return tp === gold_.length && pred.length === gold_.length;
  };
  usable.forEach((i, u) => {
    const r = recs[i], g = gold.get(r.id).smi;
    const goldE = g.bonds.map((b) => ({ k: edgeKey(b[0], b[1]), label: b[2] }));
    const real = edges(reads[i].relations);
    // chain-only: consecutive atoms of the same component, default-rule label
    const atoms = reads[i].beings.filter((b) => b.kind === "atom");
    const comps = reads[i].beings.filter((b) => b.kind === "component");
    const chain = [];
    for (const c of comps) for (let k = 0; k + 1 < c.members.length; k++) { const a = atoms[c.members[k]], b = atoms[c.members[k + 1]]; chain.push({ k: edgeKey(c.members[k], c.members[k + 1]), label: a.aromatic && b.aromatic ? "aromatic" : "single" }); }
    const der = sig ? edges(reads[usable[sig[u]]].relations) : [];
    const a1 = add(lab.real, real, goldE, true), a2 = add(lab.chain_only, chain, goldE, true), a3 = add(lab.deranged, der, goldE, true);
    void a3;
    add(unl.real, real, goldE, false); add(unl.chain_only, chain, goldE, false); add(unl.deranged, der, goldE, false);
    n++;
    if (a1 && !a2) wins++; else if (!a1 && a2) losses++;
    if (!a1 && bad.length < 5) bad.push(r.smiles.slice(0, 90));
    if (g.resolved) for (const x of reads[i].relations) { if (!x.explicit && x.label === "aromatic") { const key = edgeKey(+x.end1.slice(1), +x.end2.slice(1)); const gr = g.resolved[key]; if (gr) { resN++; if (x.label_resolved === gr) resOk++; } } }
  });
  const f = (T_) => f1Of(T_.tp, T_.fp, T_.fn);
  const score = f(lab.real);
  const controls = { chain_only: f(lab.chain_only), deranged: f(lab.deranged) };
  const strongest = maxOf(controls);
  const caus = causalViolations(usable.map((i) => recs[i]), reader, "smiles", { seed });
  const sign = signTest(wins, losses);
  const margin = score - strongest;
  const pass = score >= P.MIN_F1 && margin >= P.MIN_MARGIN && sign.p < PARAMS.ALPHA && controls.deranged <= score - PARAMS.R4.LICENCE_DROP && caus.violations === 0;
  return card({
    rung: "R4", system: "smiles", split, n, score, control: strongest, controls, pass,
    notes: ["score = labelled micro-F1 over bonds (chain, branch, ring closure)", "implicit bond between two aromatic atoms: 'aromatic' by the default rule; resolution reported in details"],
    details: { unlabelled_f1: { real: round(f(unl.real)), chain_only: round(f(unl.chain_only)), deranged: round(f(unl.deranged)) }, implicit_aromatic_resolution_vs_sanitized_rdkit: { n: resN, accuracy: round(resOk / (resN || 1)), note: "decided at END of text (needs ring context); not part of the causal score" }, causality: caus, sign_vs_chain_only: sign, examples_wrong: bad },
  });
}

export function scoreR4Inchi({ recs, gold, reads, reader, split, seed = PARAMS.SEED }) {
  const P = PARAMS.R4.inchi;
  const usable = [];
  recs.forEach((r, i) => { if (gold.get(r.id)?.inchi?.ok) usable.push(i); });
  if (!usable.length) return unmeasured("R4", split, "inchi", "no parsed InChI gold");
  const sig = derangement(usable.length, mulberry32(seed + 81));
  const T = () => ({ tp: 0, fp: 0, fn: 0 });
  const A = { real: T(), path_only: T(), deranged: T() };
  let wins = 0, losses = 0, n = 0, mism = 0;
  const addE = (T_, pred, g) => { const gs = new Set(g); const ps = new Set(pred); let tp = 0; for (const p of ps) if (gs.has(p)) tp++; T_.tp += tp; T_.fp += ps.size - tp; T_.fn += gs.size - tp; return tp === gs.size && ps.size === gs.size; };
  usable.forEach((i, u) => {
    const r = recs[i], g = gold.get(r.id).inchi;
    const goldE = g.bonds.map((b) => edgeKey(b[0], b[1]));
    const real = reads[i].relations.map((x) => edgeKey(+x.end1.slice(1), +x.end2.slice(1)));
    // path_only: consecutive atom references of the connection layer, ignoring () and , (no branch/closure semantics)
    const toks = reader.ear(r.inchi, { system: "inchi" }).filter((t) => t.cls === "atom_ref" || t.cls === "component_sep");
    const pathE = [];
    for (let k = 0; k + 1 < toks.length; k++) if (toks[k].cls === "atom_ref" && toks[k + 1].cls === "atom_ref") pathE.push(edgeKey(toks[k].ref - 1, toks[k + 1].ref - 1));
    const der = sig ? reads[usable[sig[u]]].relations.map((x) => edgeKey(+x.end1.slice(1), +x.end2.slice(1))) : [];
    const a = addE(A.real, real, goldE), b = addE(A.path_only, pathE, goldE); addE(A.deranged, der, goldE);
    n++;
    if (a && !b) wins++; else if (!a && b) losses++;
    if (reads[i].beings.filter((x) => x.kind === "atom").length !== g.atoms.length) mism++;
  });
  const f = (T_) => f1Of(T_.tp, T_.fp, T_.fn);
  const score = f(A.real);
  const controls = { path_only: f(A.path_only), deranged: f(A.deranged) };
  const strongest = maxOf(controls);
  const caus = causalViolations(usable.map((i) => recs[i]), reader, "inchi", { seed });
  const sign = signTest(wins, losses);
  const margin = score - strongest;
  const pass = score >= P.MIN_F1 && margin >= P.MIN_MARGIN && sign.p < PARAMS.ALPHA && controls.deranged <= score - PARAMS.R4.LICENCE_DROP && caus.violations === 0;
  return card({
    rung: "R4", system: "inchi", split, n, score, control: strongest, controls, pass,
    gaps: [{ reason: "bond_order_not_in_notation", note: "InChI states connectivity only; labels cannot be scored" }, mism ? { reason: "atom_count_differs_from_rdkit", count: mism, of: n } : null].filter(Boolean),
    details: { causality: caus, sign_vs_path_only: sign },
  });
}

// ───────────────────────────── R5 ─────────────────────────────
function goldGraphSmiles(g) {
  const keep = []; const map = new Map();
  g.atoms.forEach((a, i) => { if (a[0] !== "H") { map.set(i, keep.length); keep.push(a[0]); } });
  return { labels: keep, edges: g.bonds.filter((b) => map.has(b[0]) && map.has(b[1])).map((b) => [map.get(b[0]), map.get(b[1])]) };
}
const goldGraphInchi = (g) => ({ labels: g.atoms.slice(), edges: g.bonds.slice() });

/** A4: degraded readers, applied identically to the real pairs. Each returns a graph {labels, edges} (or null). */
export const DEGRADERS = {
  /** labels only: a connectivity-blind reader */
  edge_deleted: (g) => (g ? { labels: g.labels.slice(), edges: [] } : null),
  /** atom count only: every label C, no edges */
  atom_count_only: (g) => (g ? { labels: g.labels.map(() => "C"), edges: [] } : null),
  /** same labels, same number of edges, edges drawn uniformly at random among atom pairs (seeded) */
  bond_scrambled: (g, rng) => {
    if (!g) return null;
    const n = g.labels.length, m = Math.min(g.edges.length, (n * (n - 1)) / 2);
    const seen = new Set(), edges = [];
    while (edges.length < m) { const a = Math.floor(rng() * n), b = Math.floor(rng() * n); if (a === b) continue; const k = a < b ? `${a}-${b}` : `${b}-${a}`; if (seen.has(k)) continue; seen.add(k); edges.push([a, b]); }
    return { labels: g.labels.slice(), edges };
  },
};

export function scoreR5SmilesInchi({ recs, gold, smilesReads, inchiReads, reader, split, seed = PARAMS.SEED, params = PARAMS }) {
  const P = params.R5.smiles_inchi;
  const pairs = [];
  const goldH = [];
  let disagree = 0, notSame = 0, unparsed = 0;
  recs.forEach((r, i) => {
    const g = gold.get(r.id);
    if (!g?.smi?.ok || !g?.inchi?.ok) { unparsed++; return; }
    if (!g.same_compound) { notSame++; return; }
    const hg = wlHash(goldGraphSmiles(g.smi));
    if (hg !== wlHash(goldGraphInchi(g.inchi))) { disagree++; return; }
    pairs.push(i); goldH.push(hg);
  });
  if (!pairs.length) return unmeasured("R5", split, "smiles_inchi", "no gold-agreeing pairs");
  const gS = pairs.map((i) => reader.graphOf(smilesReads[i]));
  const gI = pairs.map((i) => reader.graphOf(inchiReads[i]));
  const hs = gS.map((g) => wlHash(g)), hi = gI.map((g) => wlHash(g));
  const both = (x, y, hg) => x !== null && y !== null && x === hg && y === hg; // BOTH reader digests equal the RDKit gold digest
  const real = pairs.map((_, k) => both(hs[k], hi[k], goldH[k]));
  const score = mean(real.map(Number));
  const diag = {
    smiles_vs_gold: round(mean(pairs.map((_, k) => Number(hs[k] === goldH[k])))),
    inchi_vs_gold: round(mean(pairs.map((_, k) => Number(hi[k] === goldH[k])))),
    self_consistency_v1_statistic: round(mean(pairs.map((_, k) => Number(hs[k] !== null && hs[k] === hi[k])))),
    element_bag_agreement: round(mean(pairs.map((_, k) => Number(gS[k] !== null && elementBag(gS[k]) === elementBag(gI[k]))))),
  };
  // controls on the SAME real pairs, SAME statistic
  const vec = {}, acc = {};
  for (const [name, fn] of Object.entries(DEGRADERS)) {
    const rng = mulberry32(seed + 140 + name.length);
    const dS = gS.map((g) => fn(g, rng)), dI = gI.map((g) => fn(g, rng));
    vec[name] = pairs.map((_, k) => both(wlHash(dS[k]), wlHash(dI[k]), goldH[k]));
    acc[name] = mean(vec[name].map(Number));
    diag[`self_consistency_of_${name}_reader`] = round(mean(pairs.map((_, k) => Number(wlHash(dS[k]) !== null && wlHash(dS[k]) === wlHash(dI[k])))));
  }
  const dAcc = [], dVec = [];
  for (let s = 0; s < 3; s++) {
    const sig = derangement(pairs.length, mulberry32(seed + 90 + s));
    if (!sig) continue;
    const v = pairs.map((_, k) => both(hs[k], hi[k], goldH[sig[k]]));
    dVec.push(v); dAcc.push(mean(v.map(Number)));
  }
  const bi = dAcc.length ? dAcc.indexOf(Math.max(...dAcc)) : -1;
  vec.deranged_pairs = bi >= 0 ? dVec[bi] : pairs.map(() => false);
  acc.deranged_pairs = bi >= 0 ? dAcc[bi] : 0;
  const controls = { ...acc };
  const strongestName = Object.entries(controls).sort((a, b) => b[1] - a[1])[0][0];
  const strongest = controls[strongestName];
  let wins = 0, losses = 0;
  pairs.forEach((_, k) => { if (real[k] && !vec[strongestName][k]) wins++; else if (!real[k] && vec[strongestName][k]) losses++; });
  const sign = signTest(wins, losses);
  const degradedMax = Math.max(...Object.keys(DEGRADERS).map((k) => acc[k]));
  const licence = { degraded_readers_fall: { licensed: degradedMax <= score - P.LICENCE_DROP, strongest_degraded: round(degradedMax), drop: round(score - degradedMax) } };
  const margin = score - strongest;
  const pass = score >= P.MIN_AGREE && margin >= P.MIN_MARGIN && sign.p < params.ALPHA && licence.degraded_readers_fall.licensed;
  const wrong = [];
  pairs.forEach((i, k) => { if (!real[k] && wrong.length < 5) wrong.push({ id: recs[i].id, smiles: recs[i].smiles.slice(0, 70), inchi: recs[i].inchi.slice(0, 70), smiles_graph_ok: hs[k] === goldH[k], inchi_graph_ok: hi[k] === goldH[k] }); });
  return card({
    rung: "R5", system: "smiles_inchi", split, n: pairs.length, score, control: strongest, controls, pass,
    gaps: [
      { reason: "gold_notations_declare_different_graphs", count: disagree, of: recs.length, note: "metal disconnection / charge normalisation in InChI: not a reader error, excluded" },
      { reason: "registry_says_different_compound", count: notSame, of: recs.length },
      { reason: "rdkit_could_not_parse_one_side", count: unparsed, of: recs.length },
    ].filter((g) => g.count),
    notes: [
      "score = share of gold-agreeing pairs where BOTH the reader's SMILES graph digest and the reader's InChI graph digest equal the RDKit gold digest (heavy atoms, element-labelled, 4-round WL): connectivity is scored against an independent authority (Amendment 1, A4)",
      "self-consistency (reader SMILES digest == reader InChI digest, the v1 statistic) is reported in details.diagnostics: an edgeless reader satisfies it",
    ],
    details: { diagnostics: diag, strongest_control: strongestName, sign_vs_strongest: { control: strongestName, ...sign }, licence, disagreements_examples: wrong },
  });
}

export function scoreR5Name({ recs, gold, reader, split, seed = PARAMS.SEED }) {
  const P = PARAMS.R5.name;
  const usable = [];
  let unverified = 0;
  recs.forEach((r) => {
    const g = gold.get(r.id);
    if (!r.name || !g?.smi?.ok) return;
    if (!g.name_opsin?.ok || !g.name_opsin.consistent) { unverified++; return; }
    usable.push(r);
  });
  if (!usable.length) return unmeasured("R5", split, "iupac_name", "no OPSIN-verified name/structure pairs");
  const present = (r) => new Set(gold.get(r.id).smi.atoms.map((a) => a[0]));
  const evid = usable.map((r) => reader.nameElements(r.name).elements);
  const cand = {};
  for (const r of usable) for (const e of present(r)) if (e !== "C" && e !== "H") cand[e] = (cand[e] ?? 0) + 1;
  const N = usable.length;
  const els = Object.keys(cand).filter((e) => cand[e] >= P.MIN_SUPPORT && N - cand[e] >= P.MIN_SUPPORT);
  if (!els.length) return unmeasured("R5", split, "iupac_name", `no element with >= ${P.MIN_SUPPORT} positives and negatives`);
  const J = (predSets) => {
    const per = {};
    for (const e of els) {
      let tp = 0, fn = 0, tn = 0, fp = 0;
      usable.forEach((r, k) => { const g = present(r).has(e), p = predSets[k].has(e); if (g && p) tp++; else if (g) fn++; else if (p) fp++; else tn++; });
      const rec = tp / (tp + fn || 1), spec = tn / (tn + fp || 1);
      per[e] = { support: tp + fn, recall: round(rec), specificity: round(spec), j: round(rec + spec - 1) };
    }
    return { macro: mean(Object.values(per).map((x) => x.j)), per };
  };
  const real = J(evid);
  const dj = [];
  for (let s = 0; s < 3; s++) { const sig = derangement(N, mulberry32(seed + 120 + s)); if (sig) dj.push(J(usable.map((_, k) => evid[sig[k]])).macro); }
  const constant = J(usable.map(() => new Set(els.filter((e) => cand[e] / N >= 0.5)))).macro; // best constant guess per element
  const controls = { deranged_pairs: Math.max(...dj, 0), majority_constant: constant };
  const strongest = maxOf(controls);
  // paired per (record, element) correctness vs deranged seed 0
  const sig0 = derangement(N, mulberry32(seed + 120));
  let wins = 0, losses = 0;
  if (sig0) usable.forEach((r, k) => { for (const e of els) { const g = present(r).has(e); const a = evid[k].has(e) === g, b = evid[sig0[k]].has(e) === g; if (a && !b) wins++; else if (!a && b) losses++; } });
  const sign = signTest(wins, losses);
  const margin = real.macro - strongest;
  const pass = real.macro >= P.MIN_J && margin >= P.MIN_MARGIN && sign.p < PARAMS.ALPHA;
  return card({
    rung: "R5", system: "iupac_name", split, n: N, score: real.macro, control: strongest, controls, pass,
    gaps: [{ reason: "name_not_opsin_verified", count: unverified, of: recs.filter((r) => r.name).length, note: "OPSIN could not parse the name or parsed a different structure; excluded" }, { reason: "elements_without_support", note: `elements with < ${P.MIN_SUPPORT} positives or negatives are not scored`, elements: Object.keys(cand).filter((e) => !els.includes(e)) }].filter((g) => g.count || g.elements?.length),
    notes: ["macro Youden J over elements: chance-corrected, so a constant guess scores 0 however common the element", "evidence = TRAIN-tallied n-grams (priors/notation-chem_smiles-nameparts.json); a name grammar is NOT read"],
    details: { per_element: real.per, sign_vs_deranged_pairs: sign, elements_scored: els },
  });
}

// ───────────────────────────── ladder ─────────────────────────────
/** The corpus half of a split (no gold): R0's baselines need TRAIN's corpus only. */
export function loadCorpus(split, root = ROOT) {
  try { return JSON.parse(fs.readFileSync(path.join(root, "corpus", `${split}.json`), "utf8")); } catch { return null; }
}
/** Pure ladder over injected data and reader (used by the tests with toy fixtures). */
export function runLadder({ data, reader, split = "dev", limit = null, seed = PARAMS.SEED, elements = null, params = PARAMS, baselines }) {
  const recs = (limit ? data.corpus.records.slice(0, limit) : data.corpus.records).slice();
  const gold = data.gold;
  const els = elements ?? (reader.elementSymbols ? reader.elementSymbols() : []);
  // A1: the order-blind / grammar-free baselines come from the TRAIN corpus (data.train), or are injected; none => R0 pass is null, never a pass
  const bl = baselines !== undefined ? baselines : data.train ? buildBaselines(data.train) : null;
  const rungs = {};
  const guard = (rung, f) => { try { return f(); } catch (e) { return { ...unmeasured(rung, split, null, "instrument error"), gaps: [{ reason: "unmeasured", error: String(e?.message ?? e) }] }; } };

  rungs.r0 = guard("R0", () => {
    const items = r0Items(data.corpus, limit ?? PARAMS.R0.PER_CLASS, seed);
    const c = scoreR0({ items, verdict: (t, complete) => reader.identify(t, { complete }).system, reader, split, seed, baselines: bl, params });
    return foldRung("R0", split, { multiclass: c, wln: { ...unmeasured("R0", split, "wln", UNREAD_WLN), gaps: [{ reason: adapter.UNREAD.wln.gap, missing: UNREAD_WLN }] } });
  });

  const smilesReads = recs.map((r) => reader.read(r.smiles, { system: "smiles" }));
  const inchiReads = recs.map((r) => reader.read(r.inchi, { system: "inchi" }));

  rungs.r1 = guard("R1", () => foldRung("R1", split, {
    smiles: scoreR1Smiles({ recs, gold, reader, split, seed }),
    inchi: scoreR1Inchi({ recs, reader, split, seed }),
    iupac_name: unmeasured("R1", split, "iupac_name", "an OPSIN morpheme-parse gold (Java harness over OPSIN internals) and a morpheme grammar in the adapter"),
    wln: unmeasured("R1", split, "wln", UNREAD_WLN),
  }));
  rungs.r2 = guard("R2", () => foldRung("R2", split, {
    smiles: scoreR2Smiles({ recs, gold, reads: smilesReads, reader, split, elements: els, seed, params }),
    inchi: scoreR2Inchi({ recs, gold, reads: inchiReads, split, seed, params }),
    iupac_name: unmeasured("R2", split, "iupac_name", "an atom-level unit in names needs the morpheme grammar and its OPSIN parse gold"),
    wln: unmeasured("R2", split, "wln", UNREAD_WLN),
  }));
  rungs.r3 = guard("R3", () => foldRung("R3", split, {
    smiles: scoreR3Smiles({ recs, gold, reads: smilesReads, reader, split, seed, params }),
    inchi: scoreR3Inchi({ recs, gold, reads: inchiReads, reader, split, seed, params }),
    iupac_name: unmeasured("R3", split, "iupac_name", "name-structure beings (parent, substituents) need the morpheme grammar; OPSIN gives structures, not morphemes"),
    wln: unmeasured("R3", split, "wln", UNREAD_WLN),
  }));
  rungs.r4 = guard("R4", () => foldRung("R4", split, {
    smiles: scoreR4Smiles({ recs, gold, reads: smilesReads, reader, split, seed }),
    inchi: scoreR4Inchi({ recs, gold, reads: inchiReads, reader, split, seed }),
    iupac_name: unmeasured("R4", split, "iupac_name", "substituent-of relations need the morpheme grammar and parse-tree gold"),
    wln: unmeasured("R4", split, "wln", UNREAD_WLN),
  }));
  rungs.r5 = guard("R5", () => foldRung("R5", split, {
    smiles_inchi: scoreR5SmilesInchi({ recs, gold, smilesReads, inchiReads, reader, split, seed, params }),
    iupac_name: scoreR5Name({ recs, gold, reader, split, seed }),
    natural_languages: notApplicable("R5", split, "natural_languages", "a chemical notation has no natural-language rendering to agree with"),
    wln: unmeasured("R5", split, "wln", UNREAD_WLN),
  }));
  return { family: FAMILY, rungs };
}

export const DEFAULT_READER = {
  identify: adapter.identify, ear: adapter.ear, read: adapter.read, graphOf: adapter.graphOf, nameElements: adapter.nameElements,
  elementSymbols: () => { const P = adapter.loadPriors(); return P.elements ? Object.keys(P.elements.symbols) : []; },
};

/** The family entry point. Never throws: missing data is a typed gap. */
export async function measure({ split = "dev", limit = null } = {}) {
  const data = loadData(split);
  if (!data) {
    const g = (r) => ({ id: `${FAMILY}:${r.toLowerCase()}`, rung: r, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [{ reason: "unmeasured", missing: `corpus/gold for split '${split}' under ${ROOT} (run scripts/fetch.py, build_corpus.py, build_gold.py)` }], notes: [], details: {} });
    return { family: FAMILY, rungs: { r0: g("R0"), r1: g("R1"), r2: g("R2"), r3: g("R3"), r4: g("R4"), r5: g("R5") } };
  }
  const priors = adapter.loadPriors();
  if (!priors.grammar || !priors.elements || !priors.system) {
    const g = (r) => ({ id: `${FAMILY}:${r.toLowerCase()}`, rung: r, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [{ reason: "unmeasured", missing: "priors/notation-chem_smiles-{elements,grammar,system}.json" }], notes: [], details: {} });
    return { family: FAMILY, rungs: { r0: g("R0"), r1: g("R1"), r2: g("R2"), r3: g("R3"), r4: g("R4"), r5: g("R5") } };
  }
  data.train = split === "train" ? null : loadCorpus("train"); // the baselines are fitted on TRAIN only, never on the split under test
  const out = runLadder({ data, reader: DEFAULT_READER, split, limit });
  out.provenance = {
    prereg_sha256: PREREG_SHA256, prereg_v1_sha256: PREREG_V1_SHA256, prereg_v1_text_unchanged: PREREG_V1_SHA256 === PREREG_V1_RECOMPUTED_SHA256,
    split, limit, seed: PARAMS.SEED, params: PARAMS,
    baselines_fitted_on: data.train ? { split: "train", records: data.train.records.length, names: (data.train.names ?? []).length, english: (data.train.english ?? []).length, formula: (data.train.formula ?? []).length, selfies: (data.train.selfies ?? []).length } : null,
  };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const split = process.argv[2] ?? "dev";
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : null;
  const res = await measure({ split, limit });
  const outDir = "/private/tmp/claude-501/notation/chem_smiles/results";
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `card-${split}${limit ? "-" + limit : ""}.json`);
  fs.writeFileSync(file, JSON.stringify(res, null, 1));
  const line = (c) => `${c.id.padEnd(28)} score=${c.score} control=${c.control} margin=${c.margin} pass=${c.pass}`;
  for (const r of Object.values(res.rungs)) { console.log(line(r)); for (const [s, c] of Object.entries(r.details?.systems ?? {})) console.log("    " + line(c) + (c.applicable === false ? " (n/a)" : "")); }
  console.log("wrote", file);
}
