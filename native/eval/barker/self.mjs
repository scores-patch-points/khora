// eval/barker/self.mjs — BARKER'S MIRROR: the map put to its own tests (docs/BARKER.md section 7, S1-S8, plus S9).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  Written BEFORE the first run of this file on any data.
// Nothing below is a result. A prediction that fails is reported as failed. The sha256 of this leading comment block
// is stamped into every card (details.prereg_sha256), so a post-hoc edit of a rule is visible. Instrument BUGS found
// by the toy-fixture tests (tests/barker-self.test.js) are fixed in code and listed in the report that accompanies a
// run; no rule, threshold or constant declared here is changed after a number is seen. A change made after the first
// run on profiles goes BELOW, in ADDENDA, with its date and what had been seen.
//
// DISCLOSURE (what had been seen when this header was written, 2026-10-05). I read docs/BARKER.md whole, the scout
// summary of the booklet (paraphrase, page-cited there), the repo's kernel/rng.js, adapters/text/keyness.js,
// organs/frame.js and the competence ladder's header convention; I looked at the SHAPES of three received priors and
// at the NAMES of the sibling pilot's feature columns and its analysis report (which records: profile distances
// reproduce genealogy strongly; a planted word-order check on the concatenated vector failed). No instrument, null,
// planted world or test of THIS file had been run on any data. I did not open any TEST split; this module opens no
// corpus at all (it receives profiles), and the only file reads it can make are in defaultContext(), which asks
// profiles.mjs for TRAIN/DEV-derived profiles.
//
// ── WHAT THIS MODULE IS ────────────────────────────────────────────────────────────────────────────────────────
// "The map is itself coordinated; it never claims to stand outside." Barker's own output (its induced kinds of
// systems, its arch list, its transfer model) is a set of MAP ELEMENTS. This module applies to those elements the
// same discipline Barker applies to EO: stability under resampling of sentences and of features, consistency on
// held-out systems, label permutation, removal of whole families and lineages, the map as one row in its own
// comparison table, the false-arch rate of the whole procedure, an independence audit of its channels, scoring of
// systems that arrived after the freeze, and a "plural frameworks" check (S9, added here; see below). It is the
// immanent form of critique (FoA pp.70-72): the map's own presuppositions (II.5 pre-registration, II.23 a control
// built to fail and a power check) are turned on the map. Every falsifier here is khora's, labelled Barker-in-khora;
// none is attributed to FoA, which states no falsification criterion (BARKER.md 1.4). A statement about the
// operationalisation (these systems, this profile, this inducer) is never a statement about arches as FoA states them.
//
// ── WHAT IS MIRRORED (map elements) ────────────────────────────────────────────────────────────────────────────
//  kind    a reported Level-S kind (status CLUSTER or FAMILY-BOUND): MEMBERSHIP element, members = its smaller side.
//  axis    a reported Level-S kind with status GRADIENT: an AXIS element, the per-system score u of its separating
//          coordinate (a graded latent coordinate, BARKER.md 4.3; it is a finding in its own right, never a kind).
//  arch    an arch card (A01..A13, BARKER.md 4.7) whose status is PERSISTENT or PERSISTENT-OUTSIDE-IE.
// Levels R, W and K (entities nested in systems) and the code and notation families are NOT mirrored here: v1 mirrors
// Level S and the arch statuses. That is a typed gap printed in every card (gaps[]), never a silent omission.
//
// ── THE ONE ENGINE: RECOVERY UNDER PERTURBATION, WITH ITS OWN NULL BAR ─────────────────────────────────────────
// S1, S2a, S4 and S9 are the same question: if the input is perturbed, does the induction find this element again?
//  Candidates. For an induction on a perturbed matrix Y, Cand_m(Y) = the top m candidate splits in the INSTRUMENT'S
//   OWN RANKING (the reference inducer: split depth first, then the spectral statistic T; an injected inducer exposes
//   its own order), whether or not they pass the ceiling, so the selection of a best candidate is paid for on both
//   sides; m = the number of reported elements of that group in the base induction, at least 1. The same ranking is
//   used for observed and null draws, always.
//  Agreement. membership: adjusted Rand index (ARI) of the binary partitions {element | rest} and {candidate | rest},
//   over the systems both are defined on. axis: |Spearman rho| of the two score vectors over those systems.
//  Recovery. rec(e; Y) = max over c in Cand_m(Y) of agree(e, c).
//  Bar. bar(design) = the 95th percentile, over P independent PAIRS (Y1, Y2) of null redeals of the SAME design, of
//   max over (c1 in Cand_m(Y1), c2 in Cand_m(Y2)) of agree(c1, c2). Redeals: N-feat (every FEATURE BLOCK permuted
//   across systems as a unit, independently per feature) and N-cov (Gaussian copula with the observed marginals and
//   the Ledoit-Wolf-shrunk rank correlation: keeps every gradient, destroys discreteness); the bar is the LARGER of
//   the two 95th percentiles (the ceiling's own rule, BARKER.md 4.3). The bar is the null's, never a typed 0.8.
//  A design is (group, rows kept, features kept, bins); a perturbation that drops rows or features gets the bar of
//   ITS design, recomputed on the reduced design.
//
// ── THE TESTS (each: statistic, null, control built to fail, power check, pass rule) ───────────────────────────
//  S1  stability under resampling.
//   S1a sentence resample. B draws; in each, every system contributes ONE of its aligned half-resamples (a seed x a
//       half, N/2 words; profiles.mjs resamples[]); the matrix is re-binned, re-induced at D draws; statistic = the
//       5th percentile over draws of rec(e; Y_d). STABLE iff it exceeds bar. (Half-budget noise is deliberately
//       the harsher side: a kind that survives half the sample survives the full one.)
//       CONTROL: in each draw system i receives the vector of a uniformly random OTHER system (a fresh derangement),
//       i.e. sentence labels shuffled across systems: every element must read NOT stable; one that reads stable is
//       INSTRUMENT_FAILED for S1.
//   S1b feature split-half. R seeded random splits of the group's features into two halves; each half induced
//       independently; statistic = the 5th percentile over splits of min over the two halves of rec(e; half).
//       STABLE iff it exceeds the bar of the half-feature design. CONTROL: the rows of one half are shuffled before
//       induction (system identities broken between the halves): every element must read NOT stable.
//       The two halves are disjoint feature sets: when they agree it is two readings of the systems, not one.
//   POWER (both): a planted world on the REAL design (real branch sizes, lineages, group layout, resample noise
//       ratio estimated from the real profiles' resamples) with one cross-lineage planted kind at the registered cell
//       must read STABLE at rate >= 0.8 over powerReps worlds; a planted world with NO kind (the element taken as
//       the top candidate of that world) must read stable at a rate NOT rejected as <= alpha by the exact one-sided
//       binomial test (a rate rejected as too high is INSTRUMENT_FAILED). Without power an element reads
//       UNDERPOWERED and its real-data statistic is not computed (no peek).
//  S2  held-out systems.
//   S2a leave-one-SYSTEM-out consistency. Each system j is left out, the group is re-induced on the rest, the
//       element is matched (recovery under the bar of the n-1 design), and j is assigned by projection onto the
//       matched candidate's discriminant direction: member iff its score exceeds the (1-alpha) quantile of the
//       training non-members' scores (the population null at alpha) and exceeds 0. Statistic J = recall + specificity
//       - 1 (Youden), recall over in-sample members, specificity over in-sample non-members; a left-out system for
//       which the element is not recovered counts as not assigned. NULL: random kinds of the same size (1,000 draws)
//       through the same assignment step; p = (1 + #{J_null >= J}) / 1001. PASS iff p <= alpha.
//       CONTROL: a random membership claim of the same size, run through the full procedure, must fail; the pass rate
//       over R_c random claims must not be rejected as <= alpha (exact binomial).
//       POWER: the planted kind passes at rate >= 0.8.
//   S2b held-out signature prediction (BARKER.md 5.0 gain rule). The group's features are split into two seeded
//       halves; kinds (CLUSTER only) are induced on the training systems from half A only; the held-out system's
//       half-B signature (its bin per feature) is predicted by the mean of its assigned kind, else by the training
//       marginals (M0; the fallback is counted as no_kind). Loss = bits per half-B feature, mean over splits.
//       Models: M0 marginals, M3 kinds, M4 random kinds of the same size profile (1,000 draws). Gain, judged on
//       LINEAGES (nested mean systems -> branches -> lineages): (a) the lineage-cluster bootstrap 95% LOWER bound of
//       mean_l[loss_l(M0) - loss_l(M3)] exceeds s_L = 5% of mean_l loss_l(M0); (b) loss(M3) below the median of
//       loss(M4), p <= alpha; (c) the lineage sign gate by the reachability table (n_l >= 5, pass counts 5/5 6/6 7/7
//       7/8 8/9); (d) the gain survives dropping any one lineage; (e) a planted transfer calibrated to a loss
//       reduction of 2 s_L is called GAIN at rate >= 0.8 and one calibrated to 0.5 s_L is called NO GAIN at rate
//       >= 0.8. CONTROL: half-B columns permuted across systems: no gain. UNDERPOWERED unless (e) holds.
//  S3  label permutation. For each element b and the answer keys F (branch) and S (script): ARI(b, F), ARI(b, S) and
//       the conditional mutual informations I(b; F | S) and I(b; S | F) (plug-in, bits), each against 999 draws of
//       its label permuted WITHIN strata of the conditioning label; Holm over the elements x 2 tests. Reading:
//       GENEALOGY (F significant, S not), SCRIPT (S not F), BOTH, CROSS-CUTTING (neither). A GENEALOGY, SCRIPT or
//       BOTH element is WEAKENED ("kind equals family/script, relabelled"); this is a measured finding, not a defect.
//       CONTROL: labels permuted jointly across systems: a planted GENEALOGY element must then read CROSS-CUTTING at
//       a rate such that the false-association count is not rejected as <= alpha. POWER: a planted element equal to
//       one branch must read GENEALOGY and a planted cross-lineage element must read CROSS-CUTTING, each >= 0.8.
//  S4  family and lineage removal. Recompute every element with each of the branches removed and again with each of
//       the lineages removed (the engine, on the reduced design, with its own bar; arches by the injected card
//       engine). An element is STABLE iff its recovery (arch: its status) never changes in a single removal;
//       otherwise FAMILY-FRAGILE with the removal that flips it. The flip table is printed whole; the published
//       list is the stable set. CONTROL (built to fail): an element planted in exactly one branch must flip when
//       that branch is removed. POWER: that flip is detected at rate >= 0.8, and a cross-lineage planted element
//       is not flipped by more removals than the exact one-sided binomial test at alpha would reject as "a flip rate
//       of at most alpha" (the same calibration rule as S1).
//  S5  the map as a row in its own table. On the S2b held-out prediction task, the table rows are: Barker's kinds,
//       the nearest-script rival, the branch rival and the lineage rival (each under leave-one-system-out, each
//       coarsened to the comparison k of Barker's partition by TRAIN-ONLY agglomeration when it has more cells), the
//       marginals, and random kinds. Held-out loss at equal k, lineage-nested, with the cluster bootstrap. READING:
//       BEATS-RIVALS (lower bound of loss(best rival) - loss(Barker) above 5% of loss(best rival)); BEATS-NULL-ONLY
//       ("Barker's metastructure does not beat script/family at this n"); NOT-BEATING-NULL. POWER: the planted
//       cross-lineage kind world reads BEATS-RIVALS and a planted kind equal to a branch does NOT, each >= 0.8.
//  S6  false-arch rate of the WHOLE procedure. (a) W null worlds: world d redeals every group's matrix under N-feat
//       and runs the whole kind pipeline (the injected inducer, with its ceiling); the arch part is the injected
//       engine's stored null world d, joined by draw index. A world is FALSE if it contains any reported kind or any
//       PERSISTENT arch. The list-level rate must have an exact binomial (Clopper-Pearson) upper 95% bound <= 0.10,
//       else the list is WITHHELD (INSTRUMENT_FAILED for the list). (b) m in {1,3,5} kinds planted at once: the recall
//       surface, descriptive. (c) Gaussian-copula worlds of the real matrix and planted continuum worlds through the
//       same pipeline: the CLUSTER rate must not be rejected as <= alpha by the exact binomial test.
//  S7  independence audit. Channels x ancestors; two channels are joined iff they share a DATA ancestor (the source
//       file sha, the giver, the annotator pool) or an identical builder function; effective independent channels =
//       connected components. If only one exists the claim cannot be replicated across independent channels at all:
//       reported as such, not as support and not as weakness (the verdict function asks channel agreement only
//       "where more than one exists", BARKER.md 6.0). If more than one exists an element that holds in one component
//       only is CHANNEL-BOUND (WEAKENED). CONTROL: a duplicated channel (the same data under a second name) must
//       collapse to one component. POWER: an element planted in 1 of 3 independent channels must read CHANNEL-BOUND.
//  S8  prospective. A system whose firstSeen is after the freeze is scored EXACTLY ONCE by the frozen kinds, bins,
//       rival tables and marginals (nothing is refit), on the half-B signature loss of S2b. The ledger refuses a
//       second scoring. n_l < 5 lineages is UNDERPOWERED BY REACHABILITY and per-system numbers are descriptive.
//  S9  PLURAL FRAMEWORKS (proposed addition to BARKER.md section 7; it is the immanent reading of FoA p.54, an arch
//       is shown in two or more frameworks, and of FoA p.56, a framework read through another is not yet an
//       archtheory, so the bias of the lens must be tracked). The map's lens is: UD annotation, khora's instruments,
//       one author's alternatives. The map must survive losing each part of that lens. Frames, each one perturbation:
//       F-noEO remove every cell whose channel, giver, builder, id or input path is EO-derived (the classes of
//       BARKER.md 2.2 EXCLUDED list, recognised by token; cards are system-under-test outputs); if NOTHING is removed
//       the frame is VACUOUS and is printed as "scan clean", not as replication. F-bins re-bin at terciles instead of
//       the median split. F-group (ALL design only) remove each feature group in turn. Replacement of the scheme
//       itself: for every arch card whose registry entry declares an EO-adjacent scheme (A03 hierarchical order,
//       A05 graded middle, A09 triad: BARKER.md 4.7 notes), the injected engine is asked for the status under each
//       registered alternative scheme. PLURAL iff recovery (arch: status) is unchanged in every non-vacuous frame and,
//       for a single-group element, at least one OTHER group recovers it (the two-frameworks reading of an arch);
//       otherwise FRAME-BOUND naming the frames (WEAKENED). CONTROL: a planted element carried ONLY by EO-derived
//       cells must read EO-BOUND under F-noEO; a planted element carried by one group only must read FRAME-BOUND
//       under F-group. POWER: each is detected at rate >= 0.8 and a planted two-group element reads PLURAL.
//
// ── STANDING OF A MAP ELEMENT (one decision table, fixed now) ──────────────────────────────────────────────────
//  REFUTED     (a) S1 unstable (powered, control failed as it should) = "withdrawn from every downstream use", or
//              (b) S2a fails against random kinds with power, or (c) S6 lists the procedure as WITHHELD (then the
//              element is `withheld`, reported under refuted with the reason). A refuted element is not an arch.
//  WEAKENED    not refuted and any of: S3 GENEALOGY/SCRIPT/BOTH; S4 FAMILY-FRAGILE; S7 CHANNEL-BOUND; S9 FRAME-BOUND or
//              EO-BOUND; S5 BEATS-NULL-ONLY (map-level, carried by every kind element).
//  SURVIVES    every applicable test was powered, its control failed as it should, and the element passed it. Survival
//              is not confirmation: it is the element passing tests it could have failed.
//  UNDERPOWERED / NOT_RUN  everything else, with the reason. "Unmeasured" is never "survives".
//  The map-level trust suggestion is `cleared` only if S1-S8 each passed and S6's bound holds; otherwise `checked`
//  (BARKER.md 8.4): this module only SUGGESTS it; it edits nothing.
//
// ── TYPED NUMBERS (P4: a bare integer is provisional) ──────────────────────────────────────────────────────────
//  alpha 0.05 (adapters/text/keyness.js KEY_ALPHA, imported). SEED 20261005 mixed with test id and purpose through
//  kernel/rng.js seedFrom. bins 2 (median split; BARKER 3.8 PROVISIONAL), tercile for F-bins. Registered planted cell:
//  strength 0.8 (delta = Phi^-1((1+0.8)/2)), signatureCount min(12, ceil(p/2)) features of the group (BARKER 10.1:
//  the strongest cell is the one expected admissible; PROVISIONAL). Planted-power rate 0.8 (the repo's power rate).
//  s_L = 5% relative (BARKER 5.0; PROVISIONAL until signed, B5). False-arch bound 0.10 (BARKER S6). Minimum kind size
//  4 systems and depth limit 3 for the reference inducer only (BARKER 4.4's smallest kind; PROVISIONAL). Scale
//  presets (declared; every card prints the preset and `truncated` when below `doc`): doc {B 200, R 50, P 200,
//  perms 999, randKinds 1000, W 999, Dres 99, powerReps 30}; smoke and toy are smaller and say so. A scale below
//  `doc` is a typed gap in the card, never a quiet cap.
//
// ── THE INDUCER UNDER TEST ─────────────────────────────────────────────────────────────────────────────────────
//  The mirror is inducer-agnostic. ctx.induce(spec, opts) is Barker's inducer (organs/barker.js induceSystemKinds,
//  through inducerFromOrgan). If none is injected and organs/barker.js is absent, a LABELLED stand-in is used,
//  referenceInducer: the spectral splitter of BARKER 4.3 (I3) under an N-feat and N-cov ceiling, with the two-means
//  cluster index (SigClust) as an exact one-dimensional gap statistic in place of Hartigan's dip. It is the same
//  family of instrument, not the Barker menu (no Kanada, no characteristic sets). A run states which inducer it used.
//
// ── RECORDED PREDICTIONS (before any run; the architect-of-this-file's guesses, not findings) ──────────────────
//  P(any Level-S group reports at least one CLUSTER in the profiles) 0.30; at least one GRADIENT 0.80.
//  P(S1a: a GRADIENT axis reads stable) 0.70; P(a CLUSTER reads stable) 0.50.
//  P(S3 labels the dominant reported element GENEALOGY, SCRIPT or BOTH) 0.75.
//  P(S4 flips at least one reported kind under some single-branch removal) 0.55.
//  P(S5: Barker beats the best simple rival by the SESOI) 0.12; P(beats random kinds, if any kind exists) 0.50.
//  P(S2b power card passes at the real n, i.e. the gain rule can be passed at all) 0.30.
//  P(S6 list-level false-arch bound holds) 0.50.
//  P(S7 effective independent channels = 1 for the natural-language systems) 0.90.
//  P(S9 F-noEO is VACUOUS at Level S: nothing removed) 0.85; P(an ALL-design element is PLURAL under F-group) 0.35.
//  P(survives is non-empty in the first run) 0.10; P(refuted is non-empty) 0.30; P(most elements UNDERPOWERED) 0.45.
//  A run in which an element survives every applicable test would be a surprise and should send the reader back to the
//  controls before it is believed.
//
// ── INTERFACE (what the driver and the other modules supply; code written against docs/BARKER.md) ──────────────
//  ctx = { profiles: SystemProfile@1[] (TRAIN/DEV-derived, EO-free),
//          induce?: (spec, opts) => Induction | Promise<Induction>,
//          archs?: { ids, status(spec) => {id: status}, nullWorld(d) => {id: status}, schemes?, channelSupport? },
//          channels?, prospective?: { freezeIso, frozen?, ledger? }, scale?: "toy"|"smoke"|"doc"|object, seed?, groups?,
//          lib?: overrides for pure helpers, eoPatterns?, labelOf? }
//  spec = { systemIds, group, featureIds, continuous (n x p), matrix (n x m binary), blocks, branches, lineages,
//           cuts, bins, gaps }.   Induction = { kinds:[{id,status,members,u?,z?,p?}], candidates:[{members,u?,score}],
//           instrument, gaps? } (members are ROW INDICES of spec).
//  runSelf(ctx) resolves to { map, survives, weakened, refuted, notes, underpowered, notRun, cards, trust, frame,
//  preregSha }.  `cards` is the SelfCard[] of BARKER.md 8.2 (S1..S9).
//
// ── HONEST LIMITS, STATED NOW ──────────────────────────────────────────────────────────────────────────────────
//  With about 33 systems in 9 lineages the sign gates are coarse and most elements are expected to read
//  UNDERPOWERED; with no reported element at Level S the mirror has nothing to mirror, and says so with its power
//  cards (what it COULD have said). The N-cov null is Gaussian; the t-copula sensitivity belongs to the inducer's own
//  calibration (BARKER 4.4). A systematic error shared by all of UD's annotation conventions is outside every null.
//  Answer keys (branch, lineage, script) are typed by the profile author; if only `family` is given the module uses
//  it for branch AND lineage and records the typed gap `lineage_equals_branch` (the sign gates then overcount).

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSeededRng, seedFrom } from "../../kernel/rng.js";
import { KEY_ALPHA, logBinomialUpperTail } from "../../adapters/text/keyness.js";

// ═══ ADDENDA (below the pre-registration; each states the date and what had been SEEN when it was written) ═══
// ADDENDUM A, 2026-10-05. SEEN: one toy-scale run of runSelf on a planted world (16 null worlds for S6, 0 of them false)
//   and the toy-fixture power cards. NO profile of any real system had been run. Finding: the S6 rule "the list-level
//   false-world rate has an exact upper 95% bound of at most 0.10, else the list is WITHHELD" cannot be met when W < 29
//   (zero false worlds give 1 - 0.05^(1/W) > 0.10 for W <= 28), so at a scale below W = 29 the rule would withhold the
//   list whatever the data showed: a failure of the rule's own power, not of the instrument (II.23). Amendment: if even
//   zero false worlds cannot reach the bound, S6 reads UNDERPOWERED (neither withheld nor passed); it still blocks
//   `cleared` and blocks SURVIVES for every element (the false-arch bound is then unknown). At the doc scale (W = 999)
//   this changes nothing, and no rule is relaxed: WITHHELD is still issued whenever the bound is attainable and fails.
// ADDENDUM B, 2026-10-05, same sight. Implementation facts the header did not spell out, fixed before any real run.
//   (1) The reference inducer applies Holm over depth as alpha / depth (header: "alpha divided by the number of splits
//   tested so far, Holm over depth"). (2) Power cards share ONE null bar per design across their planted worlds (the
//   bar is computed on the first planted world and reused: a declared approximation, because the planted worlds are
//   draws of one generator); real-data runs never share a bar. (3) ctx.plantCell may override the registered planted
//   cell for a TOY fixture (the registered cell is strength 0.8 with min(12, ceil(p/2)) signatures; a toy world is
//   too small to detect it); a real run leaves it unset. (4) The spectral step uses the hi column of each two-bin
//   block only: the lo column is its mirror image, so u and T are identical (verified on planted worlds) at half the
//   cost. (5) BUG found by the toy fixture and fixed in code: power-card worlds ignored ctx.plantCell, so every power
//   card read UNDERPOWERED on the toy for the wrong reason. No declared constant or rule above was changed by (1)-(5).
// ═══ END ADDENDA ═══

export const SELF_VERSION = "1";
export const SEED = 20261005;
export const ALPHA = KEY_ALPHA;                 // 0.05, the repo's declared resolution
export const POWER_RATE = 0.8;                  // the repo's power rate (PROVISIONAL: typed)
export const FALSE_ARCH_BOUND = 0.10;           // BARKER.md S6
export const SESOI_L = 0.05;                    // 5% relative loss reduction (BARKER.md 5.0; PROVISIONAL until signed)
export const MIN_KIND = 4;                      // the smallest kind a typological claim names (BARKER.md 4.4)
export const PLANT_STRENGTH = 0.8;              // the registered planted cell (BARKER.md 10.1)
export const PLANT_SIG_MAX = 12;
export const KIND_STATUS_MEMBERSHIP = Object.freeze(["CLUSTER", "FAMILY-BOUND"]);
export const SELF_STATUS = Object.freeze(["SURVIVES", "WEAKENED", "REFUTED", "UNDERPOWERED", "INSTRUMENT_FAILED", "NOT_RUN"]);
export const ARCH_LIKE = Object.freeze(["PERSISTENT", "PERSISTENT-OUTSIDE-IE"]);

/** Declared scale presets. Every card prints the preset it ran at; below `doc` it says `truncated: true`. */
export const SCALES = Object.freeze({
  tiny: Object.freeze({ name: "tiny", D: 19, Dres: 0, Dloo: 0, B: 8, R: 6, P: 24, perms: 99, randKinds: 60, looMax: 8,
    splits: 1, W: 8, Wc: 10, Wcont: 8, Dworld: 9, powerReps: 3, calibSteps: 2, calibReps: 1, controlReps: 3, plantedM: 1, axisNull: 8 }),
  doc: Object.freeze({ name: "doc", D: 99, Dres: 99, Dloo: 99, B: 200, R: 50, P: 200, perms: 999, randKinds: 1000, looMax: Infinity,
    splits: 10, W: 999, Wc: 200, Wcont: 100, Dworld: 99, powerReps: 30, calibSteps: 8, calibReps: 10, controlReps: 20, plantedM: 5, axisNull: 99 }),
  smoke: Object.freeze({ name: "smoke", D: 49, Dres: 0, Dloo: 19, B: 40, R: 16, P: 80, perms: 299, randKinds: 300, looMax: Infinity,
    splits: 3, W: 40, Wc: 40, Wcont: 30, Dworld: 19, powerReps: 8, calibSteps: 4, calibReps: 3, controlReps: 10, plantedM: 3, axisNull: 30 }),
  toy: Object.freeze({ name: "toy", D: 29, Dres: 0, Dloo: 0, B: 16, R: 8, P: 40, perms: 199, randKinds: 150, looMax: 12,
    splits: 2, W: 16, Wc: 20, Wcont: 16, Dworld: 15, powerReps: 5, calibSteps: 3, calibReps: 2, controlReps: 6, plantedM: 3, axisNull: 20 }),
});

// ── numerics (pure, seeded) ──────────────────────────────────────────────────────────────────────────────────────
export const rngFor = (seed, ...parts) => createSeededRng({ seed, parts });
const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);
export const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); let s = 0; for (const x of a) s += (x - m) * (x - m); return Math.sqrt(s / (a.length - 1)); };
export const median = (a) => quantile(a, 0.5);
/** type-7 quantile of a numeric array (not mutated). */
export function quantile(a, q) {
  const v = Array.from(a).filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return NaN;
  const h = (v.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
  return v[lo] + (v[hi] - v[lo]) * (h - lo);
}
export function gauss(rng) { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
export function shuffledIdx(n, rng) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** A derangement of 0..n-1 by Sattolo's algorithm (one n-cycle); n < 2 has none. */
export function derangement(n, rng) { if (n < 2) return null; const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; } return p; }
export const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Inverse standard normal CDF (Acklam's rational approximation, relative error about 1e-9). */
export function normInv(p) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= 1 - pl) { const q = p - 0.5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
/** Standard normal CDF (Abramowitz-Stegun 26.2.17, absolute error below 7.5e-8). */
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

// ── exact binomial machinery (the repo's own upper tail; no normal approximation anywhere) ───────────────────────
/** P(X >= k), X ~ Binomial(n, p). */
export const binomUpper = (k, n, p) => Math.exp(logBinomialUpperTail(k, n, p));
/** The smallest k with P(X >= k | n, p0) <= alpha: observing k or more REJECTS "the rate is at most p0". n+1 if none. */
export function binomCrit(n, p0 = ALPHA, alpha = ALPHA) { for (let k = 0; k <= n; k++) if (binomUpper(k, n, p0) <= alpha) return k; return n + 1; }
/** True iff k of n rejects "the true rate is at most p0" at one-sided alpha (the calibration rule of BARKER.md 4.4). */
export const rejectsAtMost = (k, n, p0 = ALPHA, alpha = ALPHA) => binomUpper(k, n, p0) <= alpha;
/** Exact (Clopper-Pearson) one-sided upper confidence bound for a rate after k of n. */
export function clopperUpper(k, n, conf = 0.95) {
  if (n <= 0) return 1; if (k >= n) return 1;
  const target = 1 - conf;                       // P(X <= k | p) = target at the bound
  let lo = k / n, hi = 1;
  for (let it = 0; it < 80; it++) {
    const p = (lo + hi) / 2;
    const cdf = 1 - binomUpper(k + 1, n, p);
    if (cdf > target) lo = p; else hi = p;
  }
  return (lo + hi) / 2;
}
export function wilson(k, n, z = 1.959964) {
  if (n <= 0) return { p: NaN, lo: 0, hi: 1 };
  const p = k / n, z2 = z * z, den = 1 + z2 / n, c = p + z2 / (2 * n), h = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return { p, lo: Math.max(0, (c - h) / den), hi: Math.min(1, (c + h) / den) };
}
/** Holm step-down: boolean reject flags in input order. */
export function holm(ps, alpha = ALPHA) {
  const m = ps.length, order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(m).fill(false);
  for (let r = 0; r < m; r++) { if (order[r][0] <= alpha / (m - r)) out[order[r][1]] = true; else break; }
  return out;
}
/** Exact one-sided sign-test p for k successes of n at chance 1/2. */
export const signTestP = (k, n) => (n <= 0 ? 1 : binomUpper(k, n, 0.5));
/** The lineage reachability table (BARKER.md 4.6): the smallest attainable sign p is 2^-n; alpha needs n >= 5. */
export function reachability(nLineages, alpha = ALPHA) {
  if (!(nLineages >= 1) || 2 ** -nLineages > alpha) return { unreachable: true, nLineages };
  for (let k = 0; k <= nLineages; k++) if (signTestP(k, nLineages) <= alpha) return { nLineages, kNeeded: k, minP: 2 ** -nLineages };
  return { unreachable: true, nLineages };
}

// ── agreement and information measures ───────────────────────────────────────────────────────────────────────────
/** Adjusted Rand index of two label arrays of equal length. Degenerate pairs: 1 if identical partitions, else 0. */
export function adjustedRand(a, b) {
  const n = a.length; if (n < 2) return 0;
  const ca = new Map(), cb = new Map(), cab = new Map();
  for (let i = 0; i < n; i++) {
    ca.set(a[i], (ca.get(a[i]) ?? 0) + 1); cb.set(b[i], (cb.get(b[i]) ?? 0) + 1);
    const k = `${a[i]}\u0000${b[i]}`; cab.set(k, (cab.get(k) ?? 0) + 1);
  }
  const c2 = (x) => x * (x - 1) / 2;
  let sA = 0, sB = 0, sAB = 0;
  for (const v of ca.values()) sA += c2(v); for (const v of cb.values()) sB += c2(v); for (const v of cab.values()) sAB += c2(v);
  const tot = c2(n), exp = sA * sB / tot, max = 0.5 * (sA + sB);
  if (max === exp) return (cab.size === ca.size && cab.size === cb.size) ? 1 : 0;
  return (sAB - exp) / (max - exp);
}
/** Average ranks (ties share the mean rank). */
export function ranks(a) {
  const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; i = j + 1; }
  return r;
}
export function pearson(x, y) {
  const n = x.length; if (n < 2) return 0; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
const log2 = (x) => Math.log2(x);
/** Plug-in entropy (bits) of the label counts. */
function entropyOf(counts, n) { let h = 0; for (const c of counts) if (c > 0) h -= (c / n) * log2(c / n); return h; }
/** Plug-in mutual information (bits) of two label arrays. */
export function mutualInfo(a, b) {
  const n = a.length; if (n < 2) return 0;
  const ca = new Map(), cb = new Map(), cab = new Map();
  for (let i = 0; i < n; i++) { ca.set(a[i], (ca.get(a[i]) ?? 0) + 1); cb.set(b[i], (cb.get(b[i]) ?? 0) + 1); const k = `${a[i]}\u0000${b[i]}`; cab.set(k, (cab.get(k) ?? 0) + 1); }
  return Math.max(0, entropyOf([...ca.values()], n) + entropyOf([...cb.values()], n) - entropyOf([...cab.values()], n));
}
/** Conditional mutual information I(a; b | c) in bits: the stratum-weighted mean of the plug-in MI inside each c stratum. */
export function condMutualInfo(a, b, c) {
  const n = a.length, groups = new Map();
  for (let i = 0; i < n; i++) { if (!groups.has(c[i])) groups.set(c[i], []); groups.get(c[i]).push(i); }
  let s = 0;
  for (const idx of groups.values()) s += (idx.length / n) * mutualInfo(idx.map((i) => a[i]), idx.map((i) => b[i]));
  return s;
}
/** A copy of `labels` shuffled only WITHIN each stratum of `strata`. */
export function permuteWithin(labels, strata, rng) {
  const out = labels.slice(), groups = new Map();
  strata.forEach((s, i) => { if (!groups.has(s)) groups.set(s, []); groups.get(s).push(i); });
  for (const idx of groups.values()) { const perm = shuffledIdx(idx.length, rng); idx.forEach((i, k) => { out[i] = labels[idx[perm[k]]]; }); }
  return out;
}

// ── lineage-nested means and the cluster bootstrap ───────────────────────────────────────────────────────────────
/** systems -> branches -> lineages. `items` = [{ v, branch, lineage }]. Returns { perLineage: Map, perBranch: Map, mean }. */
export function nestedMean(items) {
  const byBranch = new Map();
  for (const it of items) { if (!Number.isFinite(it.v)) continue; const k = `${it.lineage}\u0000${it.branch}`; if (!byBranch.has(k)) byBranch.set(k, { lineage: it.lineage, vs: [] }); byBranch.get(k).vs.push(it.v); }
  const perBranch = new Map(), byLineage = new Map();
  for (const [k, { lineage, vs }] of byBranch) { const m = mean(vs); perBranch.set(k, m); if (!byLineage.has(lineage)) byLineage.set(lineage, []); byLineage.get(lineage).push(m); }
  const perLineage = new Map(); for (const [l, ms] of byLineage) perLineage.set(l, mean(ms));
  return { perLineage, perBranch, mean: perLineage.size ? mean([...perLineage.values()]) : NaN };
}
/** Percentile cluster bootstrap over lineages of the mean of per-lineage values. */
export function lineageBootstrap(perLineage, { B = 2000, seed = SEED, label = "boot" } = {}) {
  const vals = [...perLineage.values()].filter(Number.isFinite), L = vals.length;
  if (!L) return { est: NaN, ci95: [NaN, NaN], L };
  const rng = rngFor(seed, label, L), ms = new Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < L; i++) s += vals[Math.floor(rng() * L)]; ms[b] = s / L; }
  return { est: mean(vals), ci95: [quantile(ms, 0.025), quantile(ms, 0.975)], L };
}

// ── profiles -> matrices ─────────────────────────────────────────────────────────────────────────────────────────
// Profiles are SystemProfile@1 (docs/BARKER.md 3.1). `labels` are ANSWER KEYS: read here only to stratify nulls and to
// decompose findings AFTER induction; they are never a feature.
export const cellsOf = (p) => p.cells ?? p.features ?? {};
export const branchOf = (p) => p.labels?.branch ?? p.labels?.family ?? "?";
export const lineageOf = (p) => p.labels?.lineage ?? p.labels?.stock ?? p.labels?.family ?? "?";
export const scriptOf = (p) => p.labels?.script ?? "?";
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** Feature ids present and finite in EVERY profile (a feature missing anywhere is a typed gap, never imputed). */
export function featureIdsOf(profiles, { group = "ALL", filter = null } = {}) {
  if (!profiles.length) return [];
  const first = cellsOf(profiles[0]), ids = [];
  for (const id of Object.keys(first)) {
    const g = first[id]?.group;
    if (g === "T") continue;
    if (group && group !== "ALL" && !(Array.isArray(group) ? group.includes(g) : g === group)) continue;
    let ok = true;
    for (const p of profiles) { const c = cellsOf(p)[id]; if (!c || !isNum(c.value)) { ok = false; break; } }
    if (!ok) continue;
    if (filter && !filter(id, first[id], profiles)) continue;
    ids.push(id);
  }
  return ids;
}
/** Features that exist in some profile with a value but are missing or non-finite in another (typed gaps, with denominators). */
export function featureGapsOf(profiles, { group = "ALL" } = {}) {
  const seen = new Map();
  for (const p of profiles) for (const [id, c] of Object.entries(cellsOf(p))) {
    if (c?.group === "T") continue;
    if (group && group !== "ALL" && c?.group !== group) continue;
    if (!seen.has(id)) seen.set(id, 0);
    if (isNum(c?.value)) seen.set(id, seen.get(id) + 1);
  }
  return [...seen].filter(([, have]) => have < profiles.length).map(([feature, have]) => ({ feature, reason: "missing_in_some_system", denominator: { have, need: profiles.length } }));
}
export function groupsOf(profiles) {
  const g = new Set();
  for (const id of featureIdsOf(profiles)) g.add(cellsOf(profiles[0])[id].group ?? "?");
  return [...g].sort();
}
const valueAt = (p, id, k) => { const c = cellsOf(p)[id]; if (k == null) return c.value; const r = c.resamples?.[k]; return isNum(r) ? r : c.value; };
/** Aligned half-resamples available to every cell that has any: the number K, or 0 if the layout is not aligned. */
export function resampleCount(profiles) {
  let K = null;
  for (const p of profiles) for (const c of Object.values(cellsOf(p))) {
    if (c?.group === "T" || !Array.isArray(c?.resamples) || !c.resamples.length) continue;
    if (K === null) K = c.resamples.length; else if (K !== c.resamples.length) return 0;
  }
  return K ?? 0;
}

const q7 = (sorted, q) => { const h = (sorted.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); };
function cutFor(col, bins) {
  const sorted = Float64Array.from(col).sort();
  if (bins === 3) return { t: [q7(sorted, 1 / 3), q7(sorted, 2 / 3)], ge: false };
  const t = q7(sorted, 0.5);
  let hi = 0; for (let i = 0; i < col.length; i++) if (col[i] > t) hi++;
  return { t: [t], ge: hi === 0 };               // ties at the median: if nothing is above it, "hi" is "at or above"
}
const binIdx = (x, cut) => { let b = 0; for (const t of cut.t) if (cut.ge ? x >= t : x > t) b++; return b; };

// A column table per profile array (cached by identity): features finite in every profile, values and aligned resamples as typed arrays.
const TABLES = new WeakMap();
function tableOf(profiles) {
  if (TABLES.has(profiles)) return TABLES.get(profiles);
  const n = profiles.length, K = resampleCount(profiles), ids = featureIdsOf(profiles, { group: "ALL" }), t = { n, K, ids, group: {}, cell0: {}, val: {}, res: {} };
  for (const id of ids) {
    const c0 = cellsOf(profiles[0])[id]; t.group[id] = c0.group ?? "?"; t.cell0[id] = c0;
    const v = new Float64Array(n), r = K ? new Float64Array(n * K).fill(NaN) : null;
    for (let i = 0; i < n; i++) { const c = cellsOf(profiles[i])[id]; v[i] = c.value; if (r && Array.isArray(c.resamples) && c.resamples.length === K) for (let k = 0; k < K; k++) r[i * K + k] = c.resamples[k]; }
    t.val[id] = v; t.res[id] = r;
  }
  TABLES.set(profiles, t); return t;
}
/**
 * buildSpec(profiles, opts): one group's n x p continuous matrix, its one-hot binned n x m matrix, the feature blocks,
 * the cuts and the answer keys. Options: group ("ALL" | name | names), rows (indices of profiles; default all),
 * pick (per kept row, the aligned resample index to read, null = the base value), source (per kept row, the position
 * whose vector this row reads: a derangement implements "sentence labels shuffled across systems"), bins (2|3),
 * featureIds (explicit list), filter (feature predicate), cuts (training cuts: a held-out spec is binned with them).
 */
export function buildSpec(profiles, o = {}) {
  const { group = "ALL", rows = null, pick: pickK = null, source = null, bins = 2, featureIds = null, filter = null, cuts: cutsIn = null } = o;
  const T = tableOf(profiles), rowIdx = rows ?? profiles.map((_, i) => i), n = rowIdx.length;
  const inGroup = (g) => !group || group === "ALL" || (Array.isArray(group) ? group.includes(g) : g === group);
  const fidAll = (featureIds ?? T.ids.filter((id) => T.group[id] !== "T" && inGroup(T.group[id]) && (!filter || filter(id, T.cell0[id], profiles)))).filter((id) => T.val[id]);
  const cols = fidAll.map((id) => {
    const x = new Float64Array(n), v = T.val[id], r = T.res[id], K = T.K;
    for (let i = 0; i < n; i++) { const src = rowIdx[source ? source[i] : i], k = pickK ? pickK[i] : null; let val = k == null || !r ? v[src] : r[src * K + k]; if (!Number.isFinite(val)) val = v[src]; x[i] = val; }
    return x;
  });
  const keep = [], cuts = {}, gaps = [];
  fidAll.forEach((id, f) => {
    const cut = cutsIn?.[id] ?? cutFor(cols[f], bins); let lo = 0, hi = 0, mid = 0;
    for (let i = 0; i < n; i++) { const b = binIdx(cols[f][i], cut); if (b === 0) lo++; else if (b === 1 && cut.t.length === 2) mid++; else hi++; }
    const distinct = (lo > 0) + (mid > 0) + (hi > 0);
    if (distinct < 2 && !cutsIn) { gaps.push({ feature: id, reason: "constant_after_binning", denominator: { have: n, need: n } }); return; }
    cuts[id] = cut; keep.push(f);
  });
  const nb = bins, continuous = Array.from({ length: n }, () => new Float64Array(keep.length)), matrix = Array.from({ length: n }, () => new Float64Array(keep.length * nb)), blocks = [];
  keep.forEach((f, j) => {
    const id = fidAll[f], c0 = j * nb;
    blocks.push({ feature: id, cols: Array.from({ length: nb }, (_, b) => c0 + b) });
    for (let r = 0; r < n; r++) { continuous[r][j] = cols[f][r]; matrix[r][c0 + binIdx(cols[f][r], cuts[id])] = 1; }
  });
  const sel = rowIdx.map((i) => profiles[i]);
  return { group: Array.isArray(group) ? group.join("+") : group, systemIds: sel.map((p) => p.id), rows: rowIdx, featureIds: keep.map((f) => fidAll[f]),
    continuous, matrix, blocks, cuts, bins: nb, branches: sel.map(branchOf), lineages: sel.map(lineageOf), scripts: sel.map(scriptOf), gaps };
}
/** The binned signature of one profile in a spec's column space (the spec's own cuts). */
export function signatureOf(profile, spec, { pick: k = null } = {}) {
  const v = new Float64Array(spec.matrix[0]?.length ?? 0);
  spec.blocks.forEach((blk) => { const x = valueAt(profile, blk.feature, k); v[blk.cols[binIdx(x, spec.cuts[blk.feature])]] = 1; });
  return v;
}
/** Row subset of a spec (keeps cuts and columns). */
export function subSpec(spec, rowsPos) {
  const take = (a) => rowsPos.map((i) => a[i]);
  return { ...spec, systemIds: take(spec.systemIds), rows: take(spec.rows ?? spec.systemIds.map((_, i) => i)), continuous: take(spec.continuous), matrix: take(spec.matrix), branches: take(spec.branches), lineages: take(spec.lineages), scripts: take(spec.scripts ?? spec.branches) };
}
/** Feature subset of a spec (by feature POSITION), re-indexing the one-hot columns. */
export function subSpecFeatures(spec, featPos) {
  const nb = spec.bins, m = featPos.length * nb;
  const matrix = spec.matrix.map((r) => { const o = new Float64Array(m); featPos.forEach((f, j) => { for (let b = 0; b < nb; b++) o[j * nb + b] = r[spec.blocks[f].cols[b]]; }); return o; });
  const continuous = spec.continuous.map((r) => Float64Array.from(featPos.map((f) => r[f])));
  const blocks = featPos.map((f, j) => ({ feature: spec.blocks[f].feature, cols: Array.from({ length: nb }, (_, b) => j * nb + b) }));
  return { ...spec, matrix, continuous, blocks, featureIds: featPos.map((f) => spec.featureIds[f]) };
}
/** Re-bin a continuous matrix with a spec's own cuts and blocks (used by the copula nulls). */
export function rebin(spec, X) {
  const n = X.length, nb = spec.bins, matrix = Array.from({ length: n }, () => new Float64Array(spec.blocks.length * nb));
  spec.blocks.forEach((blk, j) => { for (let r = 0; r < n; r++) matrix[r][j * nb + binIdx(X[r][j], spec.cuts[blk.feature])] = 1; });
  return { ...spec, continuous: X, matrix };
}

// ── the two redeals: N-feat (whole feature blocks) and N-cov (Gaussian copula, Ledoit-Wolf shrinkage) ─────────────
/** N-feat: every FEATURE BLOCK permuted across systems as a unit, independently per feature (one-hot structure kept). */
export function redealFeat(spec, rng) {
  const n = spec.matrix.length, m = spec.matrix[0].length, p = spec.continuous[0].length;
  const M = Array.from({ length: n }, () => new Float64Array(m)), C = Array.from({ length: n }, () => new Float64Array(p));
  spec.blocks.forEach((blk, f) => { const perm = shuffledIdx(n, rng); for (let i = 0; i < n; i++) { for (const c of blk.cols) M[i][c] = spec.matrix[perm[i]][c]; C[i][f] = spec.continuous[perm[i]][f]; } });
  return { ...spec, matrix: M, continuous: C };
}
function choleskyOf(R, ridge = 1e-9) {
  const p = R.length;
  for (let attempt = 0, r = ridge; attempt < 8; attempt++, r *= 10) {
    const L = Array.from({ length: p }, () => new Float64Array(p));
    let ok = true;
    for (let i = 0; i < p && ok; i++) for (let j = 0; j <= i; j++) {
      let s = R[i][j] + (i === j ? r : 0); for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) { if (s <= 1e-14) { ok = false; break; } L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
    }
    if (ok) return L;
  }
  throw new Error("cholesky failed");
}
/** Ledoit-Wolf (2004) analytic shrinkage intensity toward the identity, on column-centred unit-scale data. */
export function ledoitWolfDelta(Z, S) {
  const n = Z.length, p = S.length;
  let nS2 = 0, tr = 0; for (let i = 0; i < p; i++) { tr += S[i][i]; for (let j = 0; j < p; j++) nS2 += S[i][j] * S[i][j]; }
  const mu = tr / p; let d2 = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) { const d = S[i][j] - (i === j ? mu : 0); d2 += d * d; }
  d2 /= p; if (!(d2 > 1e-14)) return 1;
  let b2 = 0;
  for (let k = 0; k < n; k++) { const z = Z[k]; let nz2 = 0, zSz = 0; for (let i = 0; i < p; i++) { nz2 += z[i] * z[i]; let s = 0; for (let j = 0; j < p; j++) s += S[i][j] * z[j]; zSz += z[i] * s; } b2 += nz2 * nz2 - 2 * zSz + nS2; }
  b2 = Math.min(b2 / (n * n) / p, d2);
  return Math.max(0, Math.min(1, b2 / d2));
}
/** The Gaussian-copula model of a spec's continuous matrix: normal scores, shrunk correlation, Cholesky, empirical quantiles. */
export function copulaModel(spec) {
  const X = spec.continuous, n = X.length, p = X[0].length, Z = Array.from({ length: n }, () => new Float64Array(p)), sorted = [];
  for (let f = 0; f < p; f++) {
    const col = X.map((r) => r[f]), rk = ranks(col); sorted.push(Float64Array.from(col).sort());
    let m = 0; const t = new Float64Array(n); for (let i = 0; i < n; i++) { t[i] = normInv((rk[i] - 0.5) / n); m += t[i]; } m /= n;
    let v = 0; for (let i = 0; i < n; i++) v += (t[i] - m) ** 2; const s = Math.sqrt(v / n) || 1;
    for (let i = 0; i < n; i++) Z[i][f] = (t[i] - m) / s;
  }
  const S = Array.from({ length: p }, () => new Float64Array(p));
  for (let i = 0; i < p; i++) for (let j = i; j < p; j++) { let s = 0; for (let k = 0; k < n; k++) s += Z[k][i] * Z[k][j]; S[i][j] = S[j][i] = s / n; }
  const delta = ledoitWolfDelta(Z, S), R = S.map((row, i) => Float64Array.from(row, (v, j) => (1 - delta) * v + (i === j ? delta : 0)));
  return { n, p, delta, L: choleskyOf(R), sorted };
}
/** N-cov: n iid rows from N(0, R-hat), mapped back through each column's empirical quantiles, binned with the spec's cuts. */
export function redealCov(spec, rng, model = null) {
  const mo = model ?? copulaModel(spec), { n, p, L, sorted } = mo, xi = new Float64Array(p), X = Array.from({ length: n }, () => new Float64Array(p));
  for (let i = 0; i < n; i++) {
    for (let f = 0; f < p; f++) xi[f] = gauss(rng);
    for (let f = 0; f < p; f++) { let s = 0; for (let k = 0; k <= f; k++) s += L[f][k] * xi[k]; X[i][f] = sorted[f][Math.min(n - 1, Math.max(0, Math.floor(normCdf(s) * n)))]; }
  }
  return rebin(spec, X);
}
/** Effective feature dimension (sum lambda)^2 / sum lambda^2 of the correlation spectrum, by the Frobenius identity:
 *  sum lambda^2 = ||R||_F^2 and sum lambda = p, so PR = p^2 / ||R||_F^2. Printed beside every kind. */
export function participationRatio(spec) {
  const X = spec.continuous, n = X.length, p = X[0]?.length ?? 0; if (p < 2 || n < 3) return NaN;
  const cols = []; for (let f = 0; f < p; f++) { const c = ranks(X.map((r) => r[f])), m = mean(c), s = sd(c) || 1; cols.push(c.map((v) => (v - m) / s)); }
  let fro = 0; for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) { let r = 0; for (let k = 0; k < n; k++) r += cols[i][k] * cols[j][k]; r /= (n - 1); fro += r * r; }
  return (p * p) / fro;
}

// ── the design of a profile set, and planted worlds on it ────────────────────────────────────────────────────────
/**
 * estimateDesign(profiles): everything a planted world needs to LOOK like the real data, all derived from it:
 * the systems with their answer keys, the group layout, the half-resample noise ratio (within-system resample SD
 * over between-system SD, median over cells), the cross-feature correlation of that noise, and the branch ICC
 * (omega-squared by branch, median over features). Where a quantity cannot be derived it is 0 and a typed gap says so.
 */
export function estimateDesign(profiles) {
  const gaps = [], systems = profiles.map((p) => ({ id: p.id, branch: branchOf(p), lineage: lineageOf(p), script: scriptOf(p) }));
  const fids = featureIdsOf(profiles), groups = {};
  for (const id of fids) { const g = cellsOf(profiles[0])[id].group ?? "?"; (groups[g] ??= []).push(id); }
  const K = resampleCount(profiles), n = profiles.length;
  const sdb = new Map(), ratios = [];
  for (const id of fids) sdb.set(id, sd(profiles.map((p) => cellsOf(p)[id].value)));
  const devs = new Map();
  if (K >= 3) for (const id of fids) {
    const s = sdb.get(id); if (!(s > 0)) continue; const dv = [];
    for (const p of profiles) { const c = cellsOf(p)[id]; if (!Array.isArray(c.resamples) || c.resamples.length !== K) { dv.length = 0; break; } const r = c.resamples.filter(isNum); if (r.length >= 3) ratios.push(sd(r) / s); for (let k = 0; k < K; k++) dv.push((c.resamples[k] - c.value) / s); }
    if (dv.length === n * K) devs.set(id, dv);
  }
  const noiseRatio = ratios.length ? median(ratios) : 0;
  if (!ratios.length) gaps.push({ feature: "*", reason: "no_resamples_noise_unmeasured", denominator: { have: 0, need: fids.length } });
  let noiseCorr = 0;
  { const keys = [...devs.keys()], cs = []; const rng = rngFor(SEED, "design", "noiseCorr");
    for (let t = 0; t < Math.min(300, keys.length * (keys.length - 1) / 2); t++) { const a = keys[Math.floor(rng() * keys.length)], b = keys[Math.floor(rng() * keys.length)]; if (a !== b) cs.push(pearson(devs.get(a), devs.get(b))); }
    if (cs.length) noiseCorr = Math.max(0, Math.min(0.95, mean(cs))); }
  const byB = new Map(); systems.forEach((s, i) => { if (!byB.has(s.branch)) byB.set(s.branch, []); byB.get(s.branch).push(i); });
  const multi = [...byB.values()].filter((v) => v.length >= 2);
  const iccs = [];
  if (multi.length >= 2) for (const id of fids) {
    const x = profiles.map((p) => cellsOf(p)[id].value), gm = mean(x); let ssb = 0, ssw = 0, g = 0, N = 0;
    for (const idx of multi) { const m = mean(idx.map((i) => x[i])); ssb += idx.length * (m - gm) ** 2; for (const i of idx) ssw += (x[i] - m) ** 2; g++; N += idx.length; }
    const msw = ssw / Math.max(1, N - g), tot = ssb + ssw;
    if (tot > 0) iccs.push(Math.max(0, (ssb - (g - 1) * msw) / tot));
  }
  const icc = iccs.length ? Math.min(0.9, median(iccs)) : 0;
  if (!iccs.length) gaps.push({ feature: "*", reason: "icc_unmeasured_fewer_than_two_multi_system_branches", denominator: { have: multi.length, need: 2 } });
  return { n, systems, groups, K: K || 10, noiseRatio, noiseCorr, icc, gaps };
}
/** Loading that makes the continuum world's pairwise signature correlation EQUAL the kind world's at the same cell (closed form). */
export function matchedLoading({ strength, memberShare }) {
  const delta = normInv((1 + strength) / 2), v = delta * delta * memberShare * (1 - memberShare), rho = v / (1 + v);
  return { delta, rho, lambda: Math.sqrt(rho) };
}
/** Members spread over lineages first, then branches within a lineage, so a kind spans as many lineages as it can. */
export function crossLineageMembers(systems, size, offset = 0) {
  const byL = new Map();
  systems.forEach((s, i) => { if (!byL.has(s.lineage)) byL.set(s.lineage, new Map()); const m = byL.get(s.lineage); if (!m.has(s.branch)) m.set(s.branch, []); m.get(s.branch).push(i); });
  const lineages = [...byL.entries()].sort((a, b) => [...b[1].values()].flat().length - [...a[1].values()].flat().length || (a[0] < b[0] ? -1 : 1));
  const queues = lineages.map(([, m]) => [...m.values()].map((v) => v.slice()));
  const out = [];
  for (let r = 0; out.length < size && r < systems.length * 2; r++) {
    for (let li = 0; li < queues.length && out.length < size; li++) {
      const q = queues[(li + offset) % queues.length]; if (!q.length) continue;
      const b = q[r % q.length]; if (b.length) out.push(b.shift());
    }
  }
  return out.sort((a, b) => a - b);
}
/**
 * plantProfiles(design, opts): SystemProfile@1-shaped profiles with a KNOWN planted structure on the real design.
 * world: "null" (branch effects and noise only) | "kind" (planted gap) | "continuum" (one latent coordinate, no gap, the
 * pairwise correlation matched to the kind world) | "genealogy" (the kind IS a branch) | "script" (the kind IS a script)
 * | "eoOnly" (the kind is carried only by cells whose channel is a competence card).
 * truth.kinds[i] = { members (system ids), features (feature ids), lineageSpan, branches }.
 */
export function plantProfiles(design, o = {}) {
  const { world = "null", strength = PLANT_STRENGTH, nKinds = 1, kindSize = null, seed = SEED, sigGroups = null, signatureCount = null, variant = "free",
    members: membersIn = null, branchKey = null, channelOf = null } = o;
  const sys = design.systems, n = sys.length, rng = rngFor(seed, "plant", world, nKinds);
  const feats = []; for (const g of Object.keys(design.groups).sort()) for (const id of design.groups[g]) feats.push({ id, group: g });
  const p = feats.length, icc = o.icc ?? design.icc, a = Math.sqrt(icc), b = Math.sqrt(1 - icc);
  const bEff = new Map();
  const X = Array.from({ length: n }, () => new Float64Array(p));
  for (let f = 0; f < p; f++) for (let i = 0; i < n; i++) {
    const key = `${sys[i].branch}\u0000${f}`; if (!bEff.has(key)) bEff.set(key, gauss(rng));
    X[i][f] = a * bEff.get(key) + b * gauss(rng);
  }
  const sigPool = feats.map((x, f) => ({ ...x, f })).filter((x) => !sigGroups || sigGroups.includes(x.group));
  const sigN = Math.min(sigPool.length, signatureCount ?? Math.min(PLANT_SIG_MAX, Math.ceil(sigPool.length / 2)));
  const truth = { world, strength, signatureCount: sigN, kinds: [] };
  const delta = normInv((1 + strength) / 2);
  const cardFeat = new Set();
  const plantKind = (members, features, signs) => { for (const i of members) for (const f of features) X[i][f] += delta * signs[f]; };
  const lineSpan = (idx) => new Set(idx.map((i) => sys[i].lineage)).size;
  if (world === "kind" || world === "genealogy" || world === "script" || world === "eoOnly") {
    const usedFeat = new Set();
    for (let k = 0; k < nKinds; k++) {
      let members;
      if (membersIn?.[k]) members = membersIn[k].slice();
      else if (world === "genealogy") { const cnt = new Map(); sys.forEach((s, i) => { if (!cnt.has(s.branch)) cnt.set(s.branch, []); cnt.get(s.branch).push(i); }); const target = branchKey ?? [...cnt.entries()].filter(([, v]) => v.length >= MIN_KIND && v.length <= Math.floor(n / 2)).sort((x, y) => y[1].length - x[1].length)[k]?.[0]; members = cnt.get(target) ?? []; }
      else if (world === "script") { const cnt = new Map(); sys.forEach((s, i) => { if (!cnt.has(s.script)) cnt.set(s.script, []); cnt.get(s.script).push(i); }); const target = [...cnt.entries()].filter(([, v]) => v.length >= MIN_KIND && v.length <= Math.floor(n / 2)).sort((x, y) => y[1].length - x[1].length)[k]; members = target ? target[1] : []; }
      else members = crossLineageMembers(sys, kindSize ?? Math.max(MIN_KIND, Math.min(Math.floor(n / 2) - 1, Math.round(n / 6))), k);
      const avail = sigPool.filter((x) => !usedFeat.has(x.f)), pool = avail.length >= sigN ? avail : sigPool;
      const order = shuffledIdx(pool.length, rng), chosen = order.slice(0, sigN).map((j) => pool[j].f);
      chosen.forEach((f) => usedFeat.add(f));
      const signs = new Array(p).fill(1); for (const f of chosen) signs[f] = rng() < 0.5 ? -1 : 1;
      plantKind(members, chosen, signs);
      if (world === "eoOnly") chosen.forEach((f) => cardFeat.add(f));
      truth.kinds.push({ members: members.map((i) => sys[i].id), memberIdx: members, features: chosen.map((f) => feats[f].id), featIdx: chosen, lineageSpan: lineSpan(members), branches: [...new Set(members.map((i) => sys[i].branch))] });
    }
  } else if (world === "continuum") {
    const q = (kindSize ?? Math.max(MIN_KIND, Math.round(n / 6))) / n, { lambda } = matchedLoading({ strength, memberShare: q });
    const chosen = shuffledIdx(sigPool.length, rng).slice(0, sigN).map((j) => sigPool[j].f);
    const offs = new Map(); const t = new Float64Array(n);
    for (let i = 0; i < n; i++) { if (variant === "branch") { if (!offs.has(sys[i].branch)) offs.set(sys[i].branch, gauss(rng)); t[i] = (offs.get(sys[i].branch) + 0.5 * gauss(rng)) / Math.sqrt(1.25); } else t[i] = gauss(rng); }
    const signs = new Array(p).fill(1); for (const f of chosen) signs[f] = rng() < 0.5 ? -1 : 1;
    for (const f of chosen) for (let i = 0; i < n; i++) X[i][f] = lambda * signs[f] * t[i] + Math.sqrt(1 - lambda * lambda) * X[i][f];
    truth.kinds = null; truth.axisFeatures = chosen.map((f) => feats[f].id); truth.lambda = lambda; truth.axisU = Array.from(t);
  }
  // half-resamples: the planted noise carries the REAL noise ratio and cross-feature correlation
  const K = design.K, nr = o.noiseRatio ?? design.noiseRatio, rho = o.noiseCorr ?? design.noiseCorr;
  const sdBetween = []; for (let f = 0; f < p; f++) sdBetween.push(sd(X.map((r) => r[f])));
  const profiles = sys.map((s, i) => {
    const eta = Array.from({ length: K }, () => gauss(rng)), cells = {};
    feats.forEach((ft, f) => {
      const rs = []; for (let r = 0; r < K; r++) rs.push(X[i][f] + sdBetween[f] * nr * (Math.sqrt(rho) * eta[r] + Math.sqrt(1 - rho) * gauss(rng)));
      const isCard = cardFeat.has(f), ch = channelOf ? channelOf(ft, f) : (isCard ? "card:r1" : "ud:deprel");
      cells[ft.id] = { id: ft.id, group: ft.group, channel: ch, value: X[i][f], n: 1000, ci95: null, resamples: rs, definitionId: `${ft.id}@plant`, builder: "self.mjs@plant#plantProfiles",
        giver: isCard ? "competence card (system under test)" : "planted world", floor: null };
    });
    return { schema: "SystemProfile@1", id: s.id, kind: "nl", inputs: [{ path: `planted/${s.id}.conllu`, sha256: `plant-${s.id}`, role: "train" }],
      labels: { family: s.branch, branch: s.branch, lineage: s.lineage, script: s.script, macroarea: "plant" }, cells, gaps: [], eoFree: true };
  });
  return { profiles, truth };
}

/** A planted-design helper for tests and power cards: branches = [{ name, lineage, size, script }], groups = { A: 12, B: 12 }. */
export function designFromSpec({ branches, groups, icc = 0.25, noiseRatio = 0.5, noiseCorr = 0.3, K = 10 }) {
  const systems = [];
  for (const b of branches) for (let i = 0; i < b.size; i++) systems.push({ id: `${b.name}${i + 1}`, branch: b.name, lineage: b.lineage ?? b.name, script: Array.isArray(b.script) ? b.script[i % b.script.length] : (b.script ?? "Latn") });
  const g = {}; let c = 0;
  for (const [name, count] of Object.entries(groups)) g[name] = Array.from({ length: count }, () => `${name.toLowerCase()}${String(++c).padStart(3, "0")}`);
  return { n: systems.length, systems, groups: g, K, noiseRatio, noiseCorr, icc, gaps: [] };
}

// ── inducers: the REFERENCE stand-in, and the adapter to organs/barker.js ────────────────────────────────────────
// The mirror is inducer-agnostic (header). referenceInducer is a LABELLED stand-in: the spectral splitter of
// BARKER.md 4.3 (I3) under an N-feat and N-cov ceiling, with the two-means cluster index (SigClust; exact in one
// dimension) as the gap statistic in place of Hartigan's dip. It is not the Barker menu (no Kanada, no
// characteristic sets) and a run states which inducer it used.
function spectralTop(M, colIdx = null) {
  // one-hot blocks of two bins are mirror images (lo = 1 - hi): their Gram doubles exactly, so the hi column alone gives the same u and T
  const n = M.length, cols = colIdx ?? Array.from({ length: M[0].length }, (_, c) => c), m = cols.length, mu = new Float64Array(m), sg = new Float64Array(m);
  for (let k = 0; k < m; k++) { const c = cols[k]; let s = 0; for (let i = 0; i < n; i++) s += M[i][c]; mu[k] = s / n; let v = 0; for (let i = 0; i < n; i++) v += (M[i][c] - mu[k]) ** 2; sg[k] = Math.sqrt(v / n); }
  const Z = Array.from({ length: n }, () => new Float64Array(m)); let total = 0;
  for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) { const z = sg[k] > 1e-12 ? (M[i][cols[k]] - mu[k]) / sg[k] : 0; Z[i][k] = z; total += z * z; }
  if (!(total > 1e-9)) return { T: 0, u: new Float64Array(n) };
  const G = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { let s = 0; const zi = Z[i], zj = Z[j]; for (let c = 0; c < m; c++) s += zi[c] * zj[c]; G[i][j] = G[j][i] = s; }
  let v = new Float64Array(n); for (let i = 0; i < n; i++) v[i] = 1 + (((i + 1) * 2654435761) % 997) / 997;
  let vm = 0; for (let i = 0; i < n; i++) vm += v[i]; vm /= n; for (let i = 0; i < n; i++) v[i] -= vm;
  const w = new Float64Array(n);
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < n; i++) { let s = 0; const gi = G[i]; for (let j = 0; j < n; j++) s += gi[j] * v[j]; w[i] = s; }
    let nw = 0; for (let i = 0; i < n; i++) nw += w[i] * w[i]; nw = Math.sqrt(nw); if (!(nw > 1e-12)) break;
    let diff = 0; for (let i = 0; i < n; i++) { const x = w[i] / nw; diff += (x - v[i]) ** 2; v[i] = x; }
    if (diff < 1e-14) break;
  }
  let vn = 0; for (let i = 0; i < n; i++) vn += v[i] * v[i]; vn = Math.sqrt(vn) || 1;
  let rq = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += G[i][j] * v[j] / vn; rq += s * v[i] / vn; }
  return { T: Math.max(0, Math.min(1, rq / total)), u: Float64Array.from(v, (x) => x / vn) };
}
/** Two-means gap statistic of a 1-D score vector: 1 - W2/W1, exact over every cut of the sorted values (larger = more gap-like). */
export function twoMeansGap(u) {
  const x = Array.from(u).sort((a, b) => a - b), n = x.length; if (n < 4) return 0;
  const p1 = new Float64Array(n + 1), p2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { p1[i + 1] = p1[i] + x[i]; p2[i + 1] = p2[i] + x[i] * x[i]; }
  const ssw = (a, b) => { const k = b - a, s = p1[b] - p1[a], q = p2[b] - p2[a]; return q - s * s / k; };
  const sst = ssw(0, n); if (!(sst > 1e-12)) return 0;
  let best = Infinity; for (let k = 1; k < n; k++) best = Math.min(best, ssw(0, k) + ssw(k, n));
  return Math.max(0, 1 - best / sst);
}
const sideSplit = (u) => { const pos = [], neg = []; for (let i = 0; i < u.length; i++) (u[i] > 0 ? pos : neg).push(i); return pos.length <= neg.length ? [pos, neg] : [neg, pos]; };
const largestBranchDropped = (rows, branches, lineages) => { const cnt = new Map(); for (const i of rows) cnt.set(branches[i], (cnt.get(branches[i]) ?? 0) + 1); let top = null, tc = -1; for (const [b, c] of cnt) if (c > tc) { top = b; tc = c; } return new Set(rows.filter((i) => branches[i] !== top).map((i) => lineages[i])).size; };
/** The reference inducer. Returns { instrument, kinds, candidates, gaps }; candidates are ranked by depth, then T. */
export function referenceInducer(spec, { draws = 0, alpha = ALPHA, seed = SEED, top = 3 } = {}) {
  const n = spec.matrix.length, out = { instrument: "reference-spectral (self.mjs stand-in; two-means gap, not Hartigan dip)", kinds: [], candidates: [], gaps: [] };
  if (n < 2 * MIN_KIND || !spec.matrix[0]?.length) { out.gaps.push({ reason: "too_few_rows_or_columns", denominator: { have: n, need: 2 * MIN_KIND } }); return out; }
  // candidates are ranked by depth, then T: the top m need only depth ceil(log2(m + 1)) when no ceiling is being computed
  const maxDepth = draws > 0 ? 3 : top <= 1 ? 1 : top <= 3 ? 2 : 3, colIdx = spec.bins === 2 ? spec.blocks.map((b) => b.cols[1]) : null;
  const queue = [{ rows: Array.from({ length: n }, (_, i) => i), depth: 1 }]; const all = [];
  while (queue.length) {
    const { rows, depth } = queue.shift(), sub = rows.length === n ? spec : subSpec(spec, rows), top = spectralTop(sub.matrix, colIdx);
    const [small, large] = sideSplit(top.u), memRows = small.map((i) => rows[i]), farRows = large.map((i) => rows[i]);
    const uFull = new Array(n).fill(null); rows.forEach((r, i) => { uFull[r] = top.u[i]; });
    const cand = { members: memRows.slice().sort((a, b) => a - b), u: uFull, score: top.T, depth, T: top.T, status: null };
    if (draws > 0 && rows.length >= 2 * MIN_KIND) {
      const a2 = alpha / depth, rng = rngFor(seed, "ref", spec.group, depth, rows.length, memRows.join(","));
      const tf = [], tc = [], gc = [], model = copulaModel(sub);
      for (let d = 0; d < draws; d++) { const f = spectralTop(redealFeat(sub, rng).matrix, colIdx); tf.push(f.T); const c = spectralTop(redealCov(sub, rng, model).matrix, colIdx); tc.push(c.T); gc.push(twoMeansGap(c.u)); }
      const qf = quantile(tf, 1 - a2), qc = quantile(tc, 1 - a2), useCov = qc >= qf, nullT = useCov ? tc : tf, ceiling = Math.max(qf, qc);
      const gap = twoMeansGap(top.u), nT = tf.concat(tc), mu = mean(nT), sg = sd(nT) || 1;
      const p = (1 + nullT.filter((t) => t >= top.T).length) / (draws + 1), pGap = (1 + gc.filter((g) => g >= gap).length) / (draws + 1);
      cand.z = (top.T - mu) / sg; cand.p = p; cand.pGap = pGap; cand.ceiling = ceiling; cand.pass = top.T > ceiling && p <= a2;
      if (cand.pass) cand.status = pGap <= a2 ? (largestBranchDropped(memRows, spec.branches, spec.lineages) >= 3 ? "CLUSTER" : "FAMILY-BOUND") : "GRADIENT";
    }
    all.push(cand);
    if (depth < maxDepth) for (const side of [farRows, memRows]) if (side.length >= 2 * MIN_KIND) queue.push({ rows: side.slice().sort((a, b) => a - b), depth: depth + 1 });
  }
  out.candidates = all.slice().sort((a, b) => a.depth - b.depth || b.T - a.T).map((c) => ({ members: c.members, u: c.u, score: c.T, depth: c.depth, z: c.z }));
  out.kinds = all.filter((c) => c.status).map((c) => ({ id: `ref:${spec.group}:${stableHashLocal(c.members.join(","))}`, status: c.status, members: c.members, u: c.u, z: c.z, p: c.p, pGap: c.pGap, depth: c.depth }));
  return out;
}
const stableHashLocal = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 10);

/** Adapter to organs/barker.js::induceSystemKinds (the contract of docs/BARKER.md 8.1). fallbackNomination is never read. */
export function inducerFromOrgan(organ) {
  return async function induce(spec, o = {}) {
    const raw = await organ.induceSystemKinds(spec.matrix.map((r) => Array.from(r)), {
      draws: o.draws ?? 0, alpha: o.alpha ?? ALPHA, seed: o.seed ?? SEED, branches: spec.branches, lineages: spec.lineages,
      blocks: spec.blocks.map((b) => b.cols), continuous: spec.continuous.map((r) => Array.from(r)), population: spec.systemIds,
    });
    const idx = new Map(spec.systemIds.map((id, i) => [id, i]));
    const toRows = (refs) => [...new Set((refs ?? []).map((r) => (typeof r === "number" ? r : idx.get(r))).filter((i) => i !== undefined))].sort((a, b) => a - b);
    const kinds = [];
    for (const k of raw?.kinds ?? []) {
      if (k.fallbackNomination) continue;                   // never read: it is present in 31 of 40 structureless controls (BARKER.md 2.4)
      const members = toRows(k.smallerSide ?? k.memberRefs ?? k.members);
      kinds.push({ id: k.id, status: k.status, members, u: k.gap?.u ?? k.u ?? null, z: k.statistic?.z ?? k.z, p: k.p });
    }
    const cands = (raw?.diagnostics?.candidates ?? []).map((c) => ({ members: toRows(c.smallerSide ?? c.memberRefs ?? c.members), u: c.u ?? null, score: c.score ?? c.T ?? 0 }));
    return { instrument: "organs/barker.js", kinds, candidates: cands.length ? cands : kinds.map((k) => ({ members: k.members, u: k.u, score: k.z ?? 0 })), gaps: raw?.gaps ?? [], refused: raw?.refused ?? [], candidatesSource: cands.length ? "diagnostics" : "kinds" };
  };
}
/** Coerce any inducer's output to the Induction shape the engine reads. */
export function normalizeInduction(raw, spec) {
  const n = spec.systemIds.length, clean = (m) => [...new Set((m ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < n))].sort((a, b) => a - b);
  const kinds = (raw?.kinds ?? []).filter((k) => k && k.status && k.status !== "REFUSED").map((k) => ({ ...k, members: clean(k.members) }));
  let candidates = (raw?.candidates ?? []).map((c) => ({ ...c, members: clean(c.members) })).filter((c) => c.members.length > 0);
  if (!candidates.length) candidates = kinds.map((k) => ({ members: k.members, u: k.u ?? null, score: k.z ?? 0 }));
  return { instrument: raw?.instrument ?? "unknown", kinds, candidates, gaps: raw?.gaps ?? [], candidatesSource: raw?.candidatesSource ?? "candidates" };
}

// ── runtime: ctx normalised, seeds, caches ───────────────────────────────────────────────────────────────────────
const seedOf = (rt, ...parts) => seedFrom({ seed: rt.seed, parts });
const scaleOf = (s) => (typeof s === "object" && s ? { ...SCALES.smoke, ...s, name: s.name ?? "custom" } : (SCALES[s ?? "smoke"] ?? SCALES.smoke));
const isBelowDoc = (sc) => Object.keys(SCALES.doc).some((k) => typeof SCALES.doc[k] === "number" && typeof sc[k] === "number" && sc[k] < SCALES.doc[k]);
export function makeRuntime(ctx = {}) {
  const profiles = ctx.profiles ?? [];
  const scale = scaleOf(ctx.scale), seed = ctx.seed ?? SEED;
  const induceRaw = ctx.induce ?? referenceInducer;
  const usedReference = !ctx.induce;
  const rt = { ctx, profiles, scale, seed, induceRaw, usedReference, cache: new Map(), gaps: [], design: ctx.design ?? (profiles.length ? estimateDesign(profiles) : null), lib: ctx.lib ?? {} };
  rt.induce = async (spec, o = {}) => normalizeInduction(await induceRaw(spec, { alpha: ALPHA, ...o }), spec);
  rt.log = typeof ctx.log === "function" ? ctx.log : null;
  return rt;
}
/** Timed stage: ctx.log(line) is told when a stage starts and ends (a long run is never silent). */
const stage = async (rt, name, fn) => { const t = Date.now(); rt.log?.(`> ${name}`); const r = await fn(); rt.log?.(`< ${name} ${((Date.now() - t) / 1000).toFixed(1)}s`); return r; };
const memo = async (rt, key, fn) => { if (!rt.cache.has(key)) rt.cache.set(key, await fn()); return rt.cache.get(key); };

// ── the one engine: recovery under perturbation, against its own null bar ────────────────────────────────────────
/** Reported map elements of an induction: membership kinds (CLUSTER, FAMILY-BOUND) and axis kinds (GRADIENT). */
export function elementsFromInduction(indn, spec, group) {
  const out = [], gaps = [];
  for (const k of indn.kinds) {
    if (KIND_STATUS_MEMBERSHIP.includes(k.status)) out.push({ id: k.id ?? `${group}:${k.members.join(",")}`, type: "kind", group, status: k.status, ids: new Set(k.members.map((i) => spec.systemIds[i])), size: k.members.length, source: k });
    else if (k.status === "GRADIENT") {
      if (!k.u) { gaps.push({ element: k.id, reason: "axis_without_scores", denominator: { have: 0, need: 1 } }); continue; }
      const u = new Map(); k.u.forEach((v, i) => { if (v != null && Number.isFinite(v)) u.set(spec.systemIds[i], v); });
      out.push({ id: k.id ?? `${group}:axis`, type: "axis", group, status: "GRADIENT", u, size: u.size, source: k });
    }
  }
  return { elements: out, gaps };
}
function agreeAgainst(e, specY, c) {
  const U = specY.systemIds;
  if (e.type === "axis") {
    const xs = [], ys = [];
    U.forEach((id, i) => { const a = e.u.get(id), b = c.u?.[i]; if (a != null && b != null) { xs.push(a); ys.push(b); } });
    return xs.length < 4 ? { a: 0, lost: true } : { a: Math.abs(spearman(xs, ys)), lost: false };
  }
  const nE = U.reduce((s, id) => s + (e.ids.has(id) ? 1 : 0), 0);
  if (nE < 2 || U.length - nE < 2) return { a: 0, lost: true };
  const cs = new Set(c.members);
  return { a: adjustedRand(U.map((id) => (e.ids.has(id) ? 1 : 0)), U.map((_, i) => (cs.has(i) ? 1 : 0))), lost: false };
}
/** rec(e; Y): the best agreement of the element with the top-m candidates of the induction on the perturbed design. */
export function recovery(e, specY, indY, m) {
  let best = { a: 0, lost: false, which: -1 };
  indY.candidates.slice(0, Math.max(1, m)).forEach((c, i) => { const r = agreeAgainst(e, specY, c); if (r.lost) { best = { a: 0, lost: true, which: -1 }; return; } if (r.a > best.a) best = { a: r.a, lost: false, which: i }; });
  return best;
}
function candVsCand(c1, c2, n, axis) {
  if (axis) { const xs = [], ys = []; for (let i = 0; i < n; i++) if (c1.u?.[i] != null && c2.u?.[i] != null) { xs.push(c1.u[i]); ys.push(c2.u[i]); } return xs.length < 4 ? 0 : Math.abs(spearman(xs, ys)); }
  const a = new Set(c1.members), b = new Set(c2.members);
  return adjustedRand(Array.from({ length: n }, (_, i) => (a.has(i) ? 1 : 0)), Array.from({ length: n }, (_, i) => (b.has(i) ? 1 : 0)));
}
/**
 * bar(design): the 95th percentile, over P independent pairs of null redeals of the SAME design, of the best agreement
 * between the top-m candidates of the two redeals (selection paid on both sides); the LARGER of the N-feat and N-cov
 * quantiles. `halve`: every redeal also draws a random half of the features (the S1b design).
 */
export async function nullBar(rt, spec, { m = 1, P = rt.scale.P, tag = "bar", halve = false } = {}) {
  const key = `bar|${spec.group}|${spec.systemIds.join(",")}|${spec.featureIds.join(",")}|${spec.bins}|${m}|${P}|${halve}|${tag}`;
  // power cards share one bar per DESIGN across their planted worlds (rt.sharedBars; declared approximation); real runs never do
  const store = rt.sharedBars ?? rt.cache;
  if (store.has(key)) return store.get(key);
  const result = await (async () => {
    const n = spec.systemIds.length, out = { member: {}, axis: {}, P };
    for (const type of ["feat", "cov"]) {
      const ms = [], as = [];
      for (let q = 0; q < P; q++) {
        const rng = rngFor(rt.seed, tag, type, spec.group, n, spec.featureIds.length, halve ? "h" : "f", q);
        const draw = () => {
          let base = spec;
          if (halve) { const f = shuffledIdx(spec.blocks.length, rng).slice(0, Math.max(2, Math.floor(spec.blocks.length / 2))).sort((a, b) => a - b); base = subSpecFeatures(spec, f); }
          return type === "feat" ? redealFeat(base, rng) : redealCov(base, rng);
        };
        const Y1 = draw(), Y2 = draw();
        const [i1, i2] = [await rt.induce(Y1, { draws: 0, top: m, seed: seedOf(rt, tag, "a", q) }), await rt.induce(Y2, { draws: 0, top: m, seed: seedOf(rt, tag, "b", q) })];
        let bm = 0, ba = 0;
        for (const c1 of i1.candidates.slice(0, m)) for (const c2 of i2.candidates.slice(0, m)) { bm = Math.max(bm, candVsCand(c1, c2, n, false)); ba = Math.max(ba, candVsCand(c1, c2, n, true)); }
        ms.push(bm); as.push(ba);
      }
      out.member[type] = quantile(ms, 0.95); out.axis[type] = quantile(as, 0.95);
    }
    out.memberBar = Math.max(out.member.feat, out.member.cov); out.axisBar = Math.max(out.axis.feat, out.axis.cov);
    return out;
  })();
  store.set(key, result);
  return result;
}
const barFor = (b, e) => (e.type === "axis" ? b.axisBar : b.memberBar);

// ── S1 stability under resampling ────────────────────────────────────────────────────────────────────────────────
/** S1a: sentence resample (half-resamples aligned across features). control: each system reads another system's vector. */
export async function s1aStats(rt, profiles, group, elements, m, { B = rt.scale.B, Dres = rt.scale.Dres, control = false, tag = "s1a" } = {}) {
  const n = profiles.length, K = resampleCount(profiles);
  if (K < 2) return { gap: { reason: "no_aligned_resamples", denominator: { have: K, need: 2 } } };
  const recs = elements.map(() => []), reHit = elements.map(() => 0);
  for (let d = 0; d < B; d++) {
    const rng = rngFor(rt.seed, tag, group, control ? "c" : "r", d), pickK = Array.from({ length: n }, () => Math.floor(rng() * K)), source = control ? derangement(n, rng) : null;
    const specD = buildSpec(profiles, { group, pick: pickK, source });
    const indD = await rt.induce(specD, { draws: Dres, top: m, seed: seedOf(rt, tag, group, d) });
    elements.forEach((e, k) => { const r = recovery(e, specD, indD, m); recs[k].push(r.a); if (indD.kinds.some((kk) => agreeAgainst(e, specD, { members: kk.members, u: kk.u }).a > 0.5)) reHit[k]++; });
  }
  return { B, recs, reRate: reHit.map((h) => h / B) };
}
/** S1b: feature split-half. control: the rows of one half are shuffled before induction. */
export async function s1bStats(rt, profiles, group, elements, m, { R = rt.scale.R, control = false, tag = "s1b", Dres = rt.scale.Dres } = {}) {
  const base = buildSpec(profiles, { group }), p = base.blocks.length;
  if (p < 4) return { gap: { reason: "too_few_features_to_split", denominator: { have: p, need: 4 } } };
  const recs = elements.map(() => []);
  for (let r = 0; r < R; r++) {
    const rng = rngFor(rt.seed, tag, group, control ? "c" : "r", r), perm = shuffledIdx(p, rng), h1 = perm.slice(0, Math.floor(p / 2)).sort((a, b) => a - b), h2 = perm.slice(Math.floor(p / 2)).sort((a, b) => a - b);
    let s1 = subSpecFeatures(base, h1), s2 = subSpecFeatures(base, h2);
    if (control) { const rp = shuffledIdx(s2.matrix.length, rng); s2 = { ...s2, matrix: rp.map((i) => s2.matrix[i]), continuous: rp.map((i) => s2.continuous[i]) }; }
    const [i1, i2] = [await rt.induce(s1, { draws: Dres, top: m, seed: seedOf(rt, tag, group, r, 1) }), await rt.induce(s2, { draws: Dres, top: m, seed: seedOf(rt, tag, group, r, 2) })];
    elements.forEach((e, k) => recs[k].push(Math.min(recovery(e, s1, i1, m).a, recovery(e, s2, i2, m).a)));
  }
  return { R, recs };
}
const decideStable = (recs, bar) => { const p05 = quantile(recs, 0.05); return { p05, median: median(recs), bar, stable: p05 > bar }; };

// ── S2 held-out systems ──────────────────────────────────────────────────────────────────────────────────────────
/** Discriminant of a membership set against its complement: member iff score > max(0, (1-alpha) quantile of non-members' scores). */
export function discriminant(matrix, memberRows, alpha = ALPHA) {
  const n = matrix.length, m = matrix[0].length, mem = new Set(memberRows), cK = new Float64Array(m), cO = new Float64Array(m); let nk = 0, no = 0;
  for (let i = 0; i < n; i++) { const t = mem.has(i) ? cK : cO; mem.has(i) ? nk++ : no++; for (let c = 0; c < m; c++) t[c] += matrix[i][c]; }
  if (nk < 1 || no < 1) return null;
  const w = new Float64Array(m), mid = new Float64Array(m); for (let c = 0; c < m; c++) { cK[c] /= nk; cO[c] /= no; w[c] = cK[c] - cO[c]; mid[c] = (cK[c] + cO[c]) / 2; }
  const score = (x) => { let s = 0; for (let c = 0; c < m; c++) s += (x[c] - mid[c]) * w[c]; return s; };
  const non = []; for (let i = 0; i < n; i++) if (!mem.has(i)) non.push(score(matrix[i]));
  return { score, theta: Math.max(0, quantile(non, 1 - alpha)), w };
}
const jYouden = (labels, assigned) => { let tp = 0, fn = 0, tn = 0, fp = 0; labels.forEach((l, i) => { if (l) (assigned[i] ? tp++ : fn++); else (assigned[i] ? fp++ : tn++); }); return { recall: tp + fn ? tp / (tp + fn) : NaN, spec: tn + fp ? tn / (tn + fp) : NaN, J: (tp + fn ? tp / (tp + fn) : 0) + (tn + fp ? tn / (tn + fp) : 0) - 1 }; };
/**
 * S2a: leave-one-system-out. For each left-out system j: re-induce on the rest, match each element (recovery against the
 * bar of the n-1 design), assign j by the matched candidate's discriminant. Elements may include random claims (controls).
 * Returns per element { J, recall, spec, recoveredRate, assigned[] } plus the per-j training matrices for the random-kind null.
 */
export async function s2aStats(rt, profiles, group, elements, m, { tag = "s2a", Dloo = rt.scale.Dloo } = {}) {
  const n = profiles.length, all = Array.from({ length: n }, (_, i) => i), need = new Set();
  elements.forEach((e) => { if (e.ids) profiles.forEach((p, i) => { if (e.ids.has(p.id)) need.add(i); }); });
  let J = all;
  if (Number.isFinite(rt.scale.looMax) && n > rt.scale.looMax) { const rng = rngFor(rt.seed, tag, "J", group), pool = shuffledIdx(n, rng).filter((i) => !need.has(i)); J = [...new Set([...need].slice(0, rt.scale.looMax).concat(pool))].slice(0, rt.scale.looMax).sort((a, b) => a - b); }
  const per = elements.map(() => ({ labels: [], assigned: [], recovered: 0 })), loo = []; let looBar = null;
  for (const j of J) {
    const rows = all.filter((i) => i !== j), specJ = buildSpec(profiles, { group, rows });
    const indJ = await rt.induce(specJ, { draws: Dloo, top: m, seed: seedOf(rt, tag, group, j) });
    // ONE bar for the n-1 design (its null depends on n, p and the marginals, not on which system left): a declared approximation
    looBar ??= await nullBar(rt, specJ, { m, P: rt.scale.P, tag: `${tag}-bar` });
    const bar = looBar, xj = signatureOf(profiles[j], specJ);
    loo.push({ j, specJ, xj });
    elements.forEach((e, k) => {
      const r = recovery(e, specJ, indJ, m), ok = !r.lost && r.a > barFor(bar, e);
      let assigned = false;
      if (ok && e.type !== "axis") { const d = discriminant(specJ.matrix, indJ.candidates[r.which].members); assigned = !!d && d.score(xj) > d.theta; }
      if (ok) per[k].recovered++;
      per[k].labels.push(e.ids ? e.ids.has(profiles[j].id) : false); per[k].assigned.push(assigned);
    });
  }
  return { J, loo, per: per.map((x) => ({ ...jYouden(x.labels, x.assigned), recoveredRate: x.recovered / J.length, labels: x.labels, assigned: x.assigned })) };
}
/** The random-kind null of S2a: the same assignment step on random members of the same size (Q draws); returns the J draws. */
export function s2aNull(rt, profiles, loo, size, { Q = rt.scale.randKinds, tag = "s2a-null" } = {}) {
  const n = profiles.length, out = [];
  for (let q = 0; q < Q; q++) {
    const rng = rngFor(rt.seed, tag, size, q), mem = new Set(shuffledIdx(n, rng).slice(0, size)), labels = [], assigned = [];
    for (const { j, specJ, xj } of loo) {
      const memRows = []; specJ.rows.forEach((orig, pos) => { if (mem.has(orig)) memRows.push(pos); });
      let a = false; if (memRows.length >= 2) { const d = discriminant(specJ.matrix, memRows); a = !!d && d.score(xj) > d.theta; }
      labels.push(mem.has(j)); assigned.push(a);
    }
    out.push(jYouden(labels, assigned).J);
  }
  return out;
}
/** S2a for axis elements: LOO re-projection consistency. Loadings are the column-wise correlations with the matched axis. */
export async function s2aAxis(rt, profiles, group, e, m, { tag = "s2a-axis", Dloo = rt.scale.Dloo } = {}) {
  const n = profiles.length, all = Array.from({ length: n }, (_, i) => i), s = [], u = []; let looBar = null;
  for (const j of all.slice(0, Number.isFinite(rt.scale.looMax) ? Math.max(rt.scale.looMax, 8) : n)) {
    const rows = all.filter((i) => i !== j), specJ = buildSpec(profiles, { group, rows }), indJ = await rt.induce(specJ, { draws: Dloo, top: m, seed: seedOf(rt, tag, group, j) });
    looBar ??= await nullBar(rt, specJ, { m, P: rt.scale.P, tag: `${tag}-bar` });
    const bar = looBar, r = recovery(e, specJ, indJ, m);
    if (r.lost || r.a <= bar.axisBar) { s.push(NaN); u.push(e.u.get(profiles[j].id) ?? NaN); continue; }
    const c = indJ.candidates[r.which], mm = specJ.matrix[0].length, xj = signatureOf(profiles[j], specJ), mu = new Float64Array(mm), sg = new Float64Array(mm), lam = new Float64Array(mm);
    const uu = c.u.map((v) => v ?? 0), nn = specJ.matrix.length;
    for (let cc = 0; cc < mm; cc++) { let a = 0; for (let i = 0; i < nn; i++) a += specJ.matrix[i][cc]; mu[cc] = a / nn; let v = 0; for (let i = 0; i < nn; i++) v += (specJ.matrix[i][cc] - mu[cc]) ** 2; sg[cc] = Math.sqrt(v / nn) || 0; }
    for (let cc = 0; cc < mm; cc++) { if (!sg[cc]) continue; let a = 0; for (let i = 0; i < nn; i++) a += ((specJ.matrix[i][cc] - mu[cc]) / sg[cc]) * uu[i]; lam[cc] = a / nn; }
    let proj = 0; for (let cc = 0; cc < mm; cc++) if (sg[cc]) proj += lam[cc] * (xj[cc] - mu[cc]) / sg[cc];
    // sign-align the matched axis to the element's own sign over the common systems
    const xs = [], ys = []; specJ.systemIds.forEach((id, i) => { const a = e.u.get(id); if (a != null && c.u[i] != null) { xs.push(a); ys.push(c.u[i]); } });
    s.push(proj * (pearson(xs, ys) < 0 ? -1 : 1)); u.push(e.u.get(profiles[j].id) ?? NaN);
  }
  const ok = s.map((v, i) => (Number.isFinite(v) && Number.isFinite(u[i]) ? i : -1)).filter((i) => i >= 0);
  return { rho: ok.length >= 4 ? spearman(ok.map((i) => s[i]), ok.map((i) => u[i])) : NaN, defined: ok.length, total: s.length };
}

// ── held-out signature prediction (S2b and S5) ───────────────────────────────────────────────────────────────────
const smoothHi = (hiCount, n) => (hiCount + 0.5) / (n + 1);
const bitsOf = (hiBits /*Float64Array over B features: 1 if hi*/, pHi /*Float64Array*/) => { let s = 0; for (let f = 0; f < pHi.length; f++) s -= Math.log2(hiBits[f] ? pHi[f] : 1 - pHi[f]); return s / pHi.length; };
const meanHi = (rows, matB) => { const f = matB[0].length / 2, out = new Float64Array(f); for (const r of rows) for (let c = 0; c < f; c++) out[c] += matB[r][2 * c + 1]; return Float64Array.from(out, (v) => smoothHi(v, rows.length)); };
const hiBitsOf = (x) => { const f = x.length / 2, o = new Float64Array(f); for (let c = 0; c < f; c++) o[c] = x[2 * c + 1]; return o; };
/** Train-only agglomeration of a labelling to k cells: merge the pair whose union least raises the train code length. */
export function coarsenLabels(labels, matB, k) {
  const cellsM = new Map(); labels.forEach((l, i) => { if (!cellsM.has(l)) cellsM.set(l, []); cellsM.get(l).push(i); });
  let cells = [...cellsM.entries()].map(([l, rows]) => ({ labs: [l], rows }));
  const ce = (rows) => { const f = matB[0].length / 2, p = meanHi(rows, matB); let s = 0; for (let c = 0; c < f; c++) { let h = 0; for (const r of rows) h += matB[r][2 * c + 1]; s -= h * Math.log2(p[c]) + (rows.length - h) * Math.log2(1 - p[c]); } return s; };
  while (cells.length > Math.max(1, k)) {
    let best = null;
    for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) { const d = ce(cells[a].rows.concat(cells[b].rows)) - ce(cells[a].rows) - ce(cells[b].rows); if (!best || d < best.d) best = { a, b, d }; }
    const merged = { labs: cells[best.a].labs.concat(cells[best.b].labs), rows: cells[best.a].rows.concat(cells[best.b].rows) };
    cells = cells.filter((_, i) => i !== best.a && i !== best.b).concat([merged]);
  }
  const map = new Map(); cells.forEach((c, i) => c.labs.forEach((l) => map.set(l, i)));
  return { map, cells: cells.map((c) => c.rows) };
}
/**
 * heldOutLosses: for each system j (leave-one-system-out) and each of S seeded splits of the group's features into
 * halves A and B: kinds (CLUSTER only) induced on the training systems from half A; j's half-B signature is predicted by
 * its assigned kind's mean, else by the training marginals (no_kind, counted). Rivals: nearest script, branch, lineage
 * (each coarsened to kCmp cells by train-only agglomeration when it has more). M4: random kinds of the same size profile.
 * Loss = bits per half-B feature. Returns per-system mean losses and the M4 draws.
 */
export async function heldOutLosses(rt, profiles, group, { splits = rt.scale.splits, Dloo = rt.scale.Dloo, kCmp = 2, Q = rt.scale.randKinds, tag = "s2b", rivals = true, permuteB = false, onlyRows = null } = {}) {
  const n = profiles.length, base = buildSpec(profiles, { group }), fids = base.featureIds, rows = onlyRows ?? Array.from({ length: n }, (_, i) => i);
  if (fids.length < 6) return { gap: { reason: "too_few_features_to_split", denominator: { have: fids.length, need: 6 } } };
  const acc = { M0: new Float64Array(n), M3: new Float64Array(n), script: new Float64Array(n), branch: new Float64Array(n), lineage: new Float64Array(n), M4: Array.from({ length: Q }, () => new Float64Array(n)), noKind: new Float64Array(n), cnt: new Float64Array(n) };
  for (let s = 0; s < splits; s++) {
    const rng = rngFor(rt.seed, tag, group, "split", s), perm = shuffledIdx(fids.length, rng), half = Math.floor(fids.length / 2);
    const A = perm.slice(0, half).map((i) => fids[i]), Bf = perm.slice(half).map((i) => fids[i]);
    for (const j of rows) {
      const tr = Array.from({ length: n }, (_, i) => i).filter((i) => i !== j);
      const sA = buildSpec(profiles, { group, rows: tr, featureIds: A }), sB = buildSpec(profiles, { group, rows: tr, featureIds: Bf });
      if (!sA.matrix[0]?.length || !sB.matrix[0]?.length) continue;
      let xB = hiBitsOf(signatureOf(profiles[j], sB)), matB = sB.matrix;
      if (permuteB) { const prng = rngFor(rt.seed, tag, "perm", s, j); xB = hiBitsOf(signatureOf(profiles[(j + 1 + Math.floor(prng() * (n - 1))) % n], sB)); }
      const xA = signatureOf(profiles[j], sA), M0 = meanHi(tr.map((_, i) => i), matB), l0 = bitsOf(xB, M0);
      const indA = await rt.induce(sA, { draws: Dloo, top: 3, seed: seedOf(rt, tag, group, s, j) });
      const kinds = indA.kinds.filter((k) => k.status === "CLUSTER");
      let l3 = l0, got = false, sizes = [];
      for (const k of kinds) sizes.push(k.members.length);
      let bestFit = -Infinity, bestK = null;
      for (const k of kinds) { const d = discriminant(sA.matrix, k.members); if (!d) continue; const sc = d.score(xA); if (sc > d.theta && sc - d.theta > bestFit) { bestFit = sc - d.theta; bestK = k; } }
      if (bestK) { l3 = bitsOf(xB, meanHi(bestK.members, matB)); got = true; }
      acc.M0[j] += l0; acc.M3[j] += l3; acc.noKind[j] += got ? 0 : 1; acc.cnt[j] += 1;
      if (rivals) {
        const labs = { script: (i) => profiles[tr[i]] && scriptOf(profiles[tr[i]]), branch: (i) => branchOf(profiles[tr[i]]), lineage: (i) => lineageOf(profiles[tr[i]]) }, mine = { script: scriptOf(profiles[j]), branch: branchOf(profiles[j]), lineage: lineageOf(profiles[j]) };
        for (const key of ["script", "branch", "lineage"]) {
          const lab = tr.map((_, i) => labs[key](i)); let map = null, cellRows = null;
          const distinct = new Set(lab).size;
          if (distinct > kCmp && kCmp >= 2) { const c = coarsenLabels(lab, matB, kCmp); map = c.map; cellRows = c.cells; }
          let lr = l0;
          if (map) { const cell = map.get(mine[key]); if (cell != null) lr = bitsOf(xB, meanHi(cellRows[cell], matB)); }
          else { const rr = []; lab.forEach((l, i) => { if (l === mine[key]) rr.push(i); }); if (rr.length) lr = bitsOf(xB, meanHi(rr, matB)); }
          acc[key][j] += lr;
        }
      }
      if (sizes.length) for (let q = 0; q < Q; q++) {
        const qr = rngFor(rt.seed, tag, "m4", s, j, q), order = shuffledIdx(tr.length, qr); let cur = 0, best = -Infinity, bestRows = null;
        for (const sz of sizes) { const rr = order.slice(cur, cur + sz); cur += sz; if (rr.length < 2) continue; const d = discriminant(sA.matrix, rr); if (!d) continue; const sc = d.score(xA); if (sc > d.theta && sc - d.theta > best) { best = sc - d.theta; bestRows = rr; } }
        acc.M4[q][j] += bestRows ? bitsOf(xB, meanHi(bestRows, matB)) : l0;
      } else for (let q = 0; q < Q; q++) acc.M4[q][j] += l0;
    }
  }
  const avg = (v) => Array.from(v, (x, i) => (acc.cnt[i] ? x / acc.cnt[i] : NaN));
  return { M0: avg(acc.M0), M3: avg(acc.M3), script: avg(acc.script), branch: avg(acc.branch), lineage: avg(acc.lineage), M4: acc.M4.map(avg), noKindRate: sum(Array.from(acc.noKind)) / Math.max(1, sum(Array.from(acc.cnt))), splits, defined: rows.length };
}
const lineageLoss = (profiles, perSystem) => nestedMean(profiles.map((p, i) => ({ v: perSystem[i], branch: branchOf(p), lineage: lineageOf(p) })));
/**
 * evaluateGain: the gain rule of BARKER.md 5.0, components (a)-(d) (e is the power card): (a) the lineage-cluster
 * bootstrap lower bound of mean_l[loss_l(base) - loss_l(model)] exceeds s_L = SESOI_L x mean_l loss_l(base); (b) the model
 * is below the median of the M4 draws with p <= alpha; (c) the lineage sign gate by reachability; (d) the gain survives
 * dropping any one lineage.
 */
export function evaluateGain(profiles, lossBase, lossModel, m4Draws, { B = 400, seed = SEED, tag = "gain" } = {}) {
  const base = lineageLoss(profiles, lossBase), model = lineageLoss(profiles, lossModel), L = [...base.perLineage.keys()].filter((l) => model.perLineage.has(l));
  const gains = new Map(L.map((l) => [l, base.perLineage.get(l) - model.perLineage.get(l)]));
  const sL = SESOI_L * mean(L.map((l) => base.perLineage.get(l))), boot = lineageBootstrap(gains, { B, seed, label: tag });
  const m3 = model.mean, m4 = (m4Draws ?? []).map((d) => lineageLoss(profiles, d).mean), pB = m4.length ? (1 + m4.filter((v) => v <= m3).length) / (m4.length + 1) : NaN;
  const k = [...gains.values()].filter((g) => g > 0).length, reach = reachability(L.length), sign = !reach.unreachable && k >= reach.kNeeded;
  let jack = L.length >= 2; const jackLower = [];
  for (const drop of L) { const g = new Map([...gains].filter(([l]) => l !== drop)), lb = lineageBootstrap(g, { B: Math.min(B, 200), seed, label: `${tag}-j-${drop}` }).ci95[0]; jackLower.push(lb); if (!(lb > sL)) jack = false; }
  const a = boot.ci95[0] > sL, b = Number.isFinite(pB) && pB <= ALPHA;
  return { gain: a && b && sign && jack, components: { a, b, c: sign, d: jack }, ci95: boot.ci95, meanGain: boot.est, sL, pB, k, nLineages: L.length, reach, m3, m4Median: m4.length ? median(m4) : NaN, jackLower };
}

// ── S3 label permutation: how much of an element is genealogy, how much script ───────────────────────────────────
/** The binary labelling of an element over the profiles (axis elements are cut at the median of their scores). */
export function labelOfElement(e, profiles) {
  if (e.type === "axis") { const v = profiles.map((p) => e.u.get(p.id)), med = median(v.filter((x) => x != null && Number.isFinite(x))); return v.map((x) => (x != null && Number.isFinite(x) && x > med ? 1 : 0)); }
  return profiles.map((p) => (e.ids.has(p.id) ? 1 : 0));
}
/** ARI and conditional mutual information of one labelling with branch (F) and script (S), each against its stratified permutation null. */
export function decomposeLabelling(b, profiles, { perms = SCALES.smoke.perms, seed = SEED, tag = "s3" } = {}) {
  const F = profiles.map(branchOf), Sx = profiles.map(scriptOf), obsF = condMutualInfo(b, F, Sx), obsS = condMutualInfo(b, Sx, F), nF = [], nS = [];
  for (let d = 0; d < perms; d++) { const rng = rngFor(seed, tag, d, b.join("")); nF.push(condMutualInfo(b, permuteWithin(F, Sx, rng), Sx)); nS.push(condMutualInfo(b, permuteWithin(Sx, F, rng), F)); }
  const ge = (arr, o) => (1 + arr.filter((v) => v >= o - 1e-12).length) / (perms + 1);
  return { ariF: adjustedRand(b, F), ariS: adjustedRand(b, Sx), cmiF: obsF, cmiS: obsS, pF: ge(nF, obsF), pS: ge(nS, obsS), nullMedF: median(nF), nullMedS: median(nS) };
}
/** Holm over every test of every row (2 per row), then the reading. */
export function readDecompositions(rows, alpha = ALPHA) {
  const ps = rows.flatMap((r) => [r.pF, r.pS]), rej = holm(ps, alpha);
  return rows.map((r, i) => { const f = rej[2 * i], s = rej[2 * i + 1]; return { ...r, sigF: f, sigS: s, reading: f && s ? "BOTH" : f ? "GENEALOGY" : s ? "SCRIPT" : "CROSS-CUTTING" }; });
}

// ── S4 family and lineage removal ────────────────────────────────────────────────────────────────────────────────
export async function s4Kinds(rt, profiles, group, elements, m) {
  const branches = [...new Set(profiles.map(branchOf))].sort(), lineages = [...new Set(profiles.map(lineageOf))].sort(), table = [], skipped = [];
  const removals = [...branches.map((b) => ({ kind: "branch", name: b, rows: profiles.map((p, i) => (branchOf(p) !== b ? i : -1)).filter((i) => i >= 0) })), ...lineages.map((l) => ({ kind: "lineage", name: l, rows: profiles.map((p, i) => (lineageOf(p) !== l ? i : -1)).filter((i) => i >= 0) }))];
  for (const rm of removals) {
    if (rm.rows.length < 2 * MIN_KIND) { skipped.push({ removal: `${rm.kind}:${rm.name}`, reason: "fewer_than_two_kinds_of_systems_left", denominator: { have: rm.rows.length, need: 2 * MIN_KIND } }); continue; }
    const specR = buildSpec(profiles, { group, rows: rm.rows }), indR = await rt.induce(specR, { draws: rt.scale.Dres, top: m, seed: seedOf(rt, "s4", group, rm.kind, rm.name) }), bar = await nullBar(rt, specR, { m, P: rt.scale.P, tag: "s4-bar" });
    for (const e of elements) { const r = recovery(e, specR, indR, m); table.push({ element: e.id, removal: `${rm.kind}:${rm.name}`, recovered: !r.lost && r.a > barFor(bar, e), lost: r.lost, agreement: r.a, bar: barFor(bar, e) }); }
  }
  return { table, skipped, removals: removals.length };
}
/** Arch statuses under removals, by the injected card engine; flips are changes from the base status. */
export async function s4Arches(rt, archs, base) {
  const profiles = rt.profiles, branches = [...new Set(profiles.map(branchOf))].sort(), lineages = [...new Set(profiles.map(lineageOf))].sort(), table = [];
  for (const b of branches) { const st = await archs.status({ dropBranches: [b] }); for (const id of archs.ids) table.push({ arch: id, removal: `branch:${b}`, from: base[id], to: st?.[id], flipped: st?.[id] !== base[id] }); }
  for (const l of lineages) { const st = await archs.status({ dropLineages: [l] }); for (const id of archs.ids) table.push({ arch: id, removal: `lineage:${l}`, from: base[id], to: st?.[id], flipped: st?.[id] !== base[id] }); }
  return { table };
}

// ── S7 independence audit ────────────────────────────────────────────────────────────────────────────────────────
// DATA ancestors per channel (BARKER.md 3.3: "the same treebank under two layers; a prior and the treebank it was built
// from" are ONE reading). Typed by the architect; PROVISIONAL; an explicit ctx.channels overrides it. The UD annotation
// pool is ONE ancestor across all treebanks (annotation conventions are shared).
export const DATA_ANCESTOR_RULES = Object.freeze([
  { test: /^ud:/, ancestors: ["annotation:UD"] },
  { test: /^raw:udtext$/, ancestors: ["annotation:UD"] },
  { test: /^prior:(?!.*unimorph)/, ancestors: ["annotation:UD"] },
  { test: /unimorph/, ancestors: ["data:UniMorph"] },
  { test: /^card:/, ancestors: ["annotation:UD", "instrument:competence-cards"] },
  { test: /^(grammar|ast):/, ancestors: ["data:tree-sitter-packs"] },
  { test: /^raw:src$/, ancestors: ["data:code-corpus"] },
]);
export function channelsOfProfiles(profiles, { group = "ALL" } = {}) {
  const seen = new Map();
  for (const id of featureIdsOf(profiles, { group })) for (const p of profiles) { const c = cellsOf(p)[id]; if (!c?.channel) continue; if (!seen.has(c.channel)) seen.set(c.channel, { id: c.channel, builders: new Set(), features: new Set() }); const s = seen.get(c.channel); s.builders.add(c.builder ?? ""); s.features.add(id); }
  return [...seen.values()].map((s) => { const anc = new Set(); let mapped = false; for (const r of DATA_ANCESTOR_RULES) if (r.test.test(s.id)) { r.ancestors.forEach((a) => anc.add(a)); mapped = true; } if (!mapped) anc.add(`unmapped:${s.id}`); return { id: s.id, ancestors: [...anc], builders: [...s.builders], features: [...s.features], mapped }; });
}
/** Connected components: channels are joined iff they share a DATA ancestor or an identical builder function. */
export function independenceAudit(channels) {
  const parent = channels.map((_, i) => i), find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x]))), uni = (a, b) => { parent[find(a)] = find(b); };
  const byKey = new Map();
  channels.forEach((c, i) => { for (const key of [...(c.ancestors ?? []).map((a) => `a:${a}`), ...(c.builders ?? []).filter(Boolean).map((b) => `b:${b}`)]) { if (byKey.has(key)) uni(i, byKey.get(key)); else byKey.set(key, i); } });
  const comp = new Map(); channels.forEach((c, i) => { const r = find(i); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(c.id); });
  const components = [...comp.values()];
  return { components, effectiveN: components.length, collapsed: channels.length > components.length, channels: channels.length };
}

// ── S9 plural frameworks ─────────────────────────────────────────────────────────────────────────────────────────
// The EO-derived input classes of BARKER.md 2.2 (EXCLUDED list), recognised by token. Assembled from fragments so that
// this file never spells an EO instrument's name: only the scan of a profile does.
const frag = (...p) => p.join("");
export const EO_PATTERNS = Object.freeze([frag("case", "-priors"), frag("act", "-prior"), frag("\\.eo", "t\\.json"), frag("by", "Face"), frag("cu", "be\\.js"), frag("phase", "post"), frag("relation", "-kinds"), frag("hyper", "lexicon"), "^card:", "competence"].map((s) => new RegExp(s, "i")));
export function isEoDerivedCell(cell, profile, patterns = EO_PATTERNS) {
  const fields = [cell?.id, cell?.group, cell?.channel, cell?.builder, cell?.giver, cell?.definitionId, ...(profile?.inputs ?? []).map((i) => i.path)].filter((x) => typeof x === "string");
  return fields.some((f) => patterns.some((r) => r.test(f)));
}
export function eoFilterOf(profiles, patterns = EO_PATTERNS) { return (id) => !profiles.some((p) => isEoDerivedCell(cellsOf(p)[id], p, patterns)); }
export function eoRemovedOf(profiles, { group = "ALL", patterns = EO_PATTERNS } = {}) { return featureIdsOf(profiles, { group }).filter((id) => profiles.some((p) => isEoDerivedCell(cellsOf(p)[id], p, patterns))); }
/** One frame = one perturbation of the design; returns { vacuous, removed } or the recovery rows. */
export async function s9Frames(rt, profiles, group, elements, m, { patterns = EO_PATTERNS } = {}) {
  const rows = [], gs = groupsOf(profiles), frames = [];
  const removed = eoRemovedOf(profiles, { group, patterns });
  frames.push({ id: "F-noEO", opts: { filter: eoFilterOf(profiles, patterns) }, vacuous: removed.length === 0, removed });
  frames.push({ id: "F-bins3", opts: { bins: 3 } });
  if (group === "ALL") for (const g of gs) frames.push({ id: `F-group:${g}`, opts: { group: gs.filter((x) => x !== g) }, groupDropped: g });
  const frameRecs = [];
  for (const f of frames) {
    if (f.vacuous) { frameRecs.push({ frame: f.id, vacuous: true, removed: f.removed.length }); continue; }
    const spec = buildSpec(profiles, { group: f.opts.group ?? group, bins: f.opts.bins ?? 2, filter: f.opts.filter ?? null });
    if (spec.blocks.length < 4) { frameRecs.push({ frame: f.id, gap: { reason: "too_few_features_after_frame", denominator: { have: spec.blocks.length, need: 4 } } }); continue; }
    const ind = await rt.induce(spec, { draws: rt.scale.Dres, top: m, seed: seedOf(rt, "s9", group, f.id) }), bar = await nullBar(rt, spec, { m, P: rt.scale.P, tag: `s9-${f.id}` });
    for (const e of elements) { const r = recovery(e, spec, ind, m); rows.push({ element: e.id, frame: f.id, recovered: !r.lost && r.a > barFor(bar, e), agreement: r.a, bar: barFor(bar, e), removed: f.removed?.length ?? 0 }); }
    frameRecs.push({ frame: f.id, vacuous: false, features: spec.blocks.length, removed: f.removed?.length ?? 0 });
  }
  const otherGroups = [];
  if (group !== "ALL") for (const g of gs.filter((x) => x !== group)) {
    const spec = buildSpec(profiles, { group: g }); if (spec.blocks.length < 4) { otherGroups.push({ group: g, gap: { reason: "too_few_features", denominator: { have: spec.blocks.length, need: 4 } } }); continue; }
    const ind = await rt.induce(spec, { draws: rt.scale.Dres, top: m, seed: seedOf(rt, "s9g", group, g) }), bar = await nullBar(rt, spec, { m, P: rt.scale.P, tag: `s9g-${g}` });
    for (const e of elements) { const r = recovery(e, spec, ind, m); otherGroups.push({ element: e.id, group: g, recovered: !r.lost && r.a > barFor(bar, e), agreement: r.a, bar: barFor(bar, e) }); }
  }
  return { rows, frameRecs, otherGroups, removed };
}

// ── planted-world power cards: the instrument must be able to say yes AND no on the real design ──────────────────
/** N-feat at the PROFILE level: every feature's values and resamples permuted across systems (so the whole pipeline re-runs). */
export function redealProfilesFeat(profiles, rng) {
  const n = profiles.length, perms = new Map(featureIdsOf(profiles).map((id) => [id, shuffledIdx(n, rng)]));
  return profiles.map((p, i) => { const cells = {}; for (const [id, c] of Object.entries(cellsOf(p))) { const pm = perms.get(id); if (!pm) { cells[id] = c; continue; } const src = cellsOf(profiles[pm[i]])[id]; cells[id] = { ...c, value: src.value, resamples: src.resamples }; } return { ...p, cells }; });
}
const typeOfEl = (e) => (e.type === "axis" ? "axis" : "kind");
const planted = (rt, gr, type, r, o = {}) => {
  const world = o.world ?? (type === "axis" ? "continuum" : "kind");
  const { profiles, truth } = plantProfiles(rt.design, { world, kindSize: gr.size ?? undefined, seed: seedOf(rt, "pw", world, gr.group, r, o.tag ?? ""), sigGroups: gr.group === "ALL" || Array.isArray(gr.group) ? null : [gr.group], ...(rt.plantCell ?? {}), ...o });
  const e = type === "axis" ? { id: "planted-axis", type: "axis", u: new Map(profiles.map((p, i) => [p.id, truth.axisU[i]])), size: profiles.length } : { id: "planted", type: "kind", ids: new Set(truth.kinds[0].members), size: truth.kinds[0].members.length };
  return { profiles, truth, e, rtp: { ...rt, profiles, cache: new Map(), sharedBars: (rt.sharedBars ??= new Map()) } };
};
/** Reps of a planted world with the element known, and of a no-structure world with the element = the top candidate. */
async function plantedReps(rt, gr, type, fn) {
  const reps = rt.scale.powerReps, out = { reps, hit: 0, nullHit: 0, nullReps: 0 };
  for (let r = 0; r < reps; r++) {
    const w = planted(rt, gr, type, r);
    if (await fn(w.rtp, w.profiles, w.e, false)) out.hit++;
    const nw = plantProfiles(rt.design, { world: "null", icc: 0, seed: seedOf(rt, "pn", gr.group, r) }), rtn = { ...rt, profiles: nw.profiles, cache: new Map(), sharedBars: (rt.sharedBars ??= new Map()) };
    const spec = buildSpec(nw.profiles, { group: gr.group }), ind = await rtn.induce(spec, { draws: 0, top: gr.m, seed: seedOf(rt, "pn-ind", gr.group, r) }), c = ind.candidates[0];
    if (!c) continue;
    const en = type === "axis" ? (c.u ? { id: "null-axis", type: "axis", u: new Map(c.u.map((v, i) => [spec.systemIds[i], v]).filter(([, v]) => v != null)), size: c.u.length } : null) : { id: "null-top", type: "kind", ids: new Set(c.members.map((i) => spec.systemIds[i])), size: c.members.length };
    if (!en) continue; out.nullReps++;
    if (await fn(rtn, nw.profiles, en, true)) out.nullHit++;
  }
  out.rate = out.hit / reps; out.nullOk = out.nullReps ? !rejectsAtMost(out.nullHit, out.nullReps) : true; out.ok = out.rate >= POWER_RATE && out.nullOk;
  return out;
}
const powerMemo = (rt, key, fn) => memo(rt, `power|${key}`, () => stage(rt, `power ${key}`, fn));

// ── S1 runner ────────────────────────────────────────────────────────────────────────────────────────────────────
async function runS1(rt, grs) {
  const rows = [], gaps = [];
  for (const gr of grs) {
    for (const test of ["a", "b"]) {
      const types = [...new Set(gr.elements.map(typeOfEl))];
      for (const type of types) {
        const els = gr.elements.filter((e) => typeOfEl(e) === type), halve = test === "b";
        const stat = async (rtp, profiles, es, control) => (test === "a" ? s1aStats(rtp, profiles, gr.group, es, gr.m, { control }) : s1bStats(rtp, profiles, gr.group, es, gr.m, { control }));
        const decide = async (rtp, profiles, e) => { const spec = buildSpec(profiles, { group: gr.group }), bar = await nullBar(rtp, spec, { m: gr.m, tag: `s1${test}-bar`, halve }), st = await stat(rtp, profiles, [e], false); return st.recs ? decideStable(st.recs[0], barFor(bar, e)).stable : false; };
        const pw = await powerMemo(rt, `s1${test}|${gr.group}|${type}|${gr.size}|${gr.m}`, () => plantedReps(rt, gr, type, decide));
        if (!pw.ok) { els.forEach((e) => rows.push({ element: e.id, test: `S1${test}`, status: "UNDERPOWERED", reason: pw.nullOk ? "planted_power_below_0.8" : "false_stable_rate_on_null_world_rejected", power: pw })); continue; }
        const spec = gr.spec, bar = await nullBar(rt, spec, { m: gr.m, tag: `s1${test}-bar`, halve });
        const ctl = await stat(rt, rt.profiles, els, true), real = await stat(rt, rt.profiles, els, false);
        if (!ctl.recs || !real.recs) { els.forEach((e) => rows.push({ element: e.id, test: `S1${test}`, status: "NOT_RUN", gap: (ctl.gap ?? real.gap) })); gaps.push(ctl.gap ?? real.gap); continue; }
        els.forEach((e, k) => {
          const c = decideStable(ctl.recs[k], barFor(bar, e)), r = decideStable(real.recs[k], barFor(bar, e));
          if (c.stable) rows.push({ element: e.id, test: `S1${test}`, status: "INSTRUMENT_FAILED", reason: "control_read_stable", control: c, power: pw });
          else rows.push({ element: e.id, test: `S1${test}`, status: r.stable ? "stable" : "unstable", ...r, control: c, power: pw, reRate: real.reRate?.[k] });
        });
      }
    }
  }
  return { rows, gaps };
}

// ── S2a runner ───────────────────────────────────────────────────────────────────────────────────────────────────
async function s2aRun(rt, profiles, group, elements, m, controlSizes) {
  const rng = rngFor(rt.seed, "s2a-claims", group), n = profiles.length, claims = [];
  controlSizes.forEach((sz, k) => claims.push({ id: `control-${k}`, type: "kind", control: true, size: sz, ids: new Set(shuffledIdx(n, rng).slice(0, sz).map((i) => profiles[i].id)) }));
  const kinds = elements.filter((e) => e.type !== "axis"), st = kinds.length || claims.length ? await s2aStats(rt, profiles, group, [...kinds, ...claims], m) : null;
  const out = { kinds: [], controls: [], st };
  if (!st) return out;
  const sizes = [...new Set([...kinds, ...claims].map((e) => e.size))], nulls = new Map();
  for (const sz of sizes) nulls.set(sz, s2aNull(rt, profiles, st.loo, sz));
  [...kinds, ...claims].forEach((e, k) => { const r = st.per[k], nu = nulls.get(e.size), p = (1 + nu.filter((v) => v >= r.J - 1e-12).length) / (nu.length + 1); (e.control ? out.controls : out.kinds).push({ element: e.id, size: e.size, J: r.J, recall: r.recall, spec: r.spec, recoveredRate: r.recoveredRate, p, pass: p <= ALPHA }); });
  return out;
}
async function runS2a(rt, grs) {
  const rows = [], gaps = [];
  for (const gr of grs) {
    const kinds = gr.elements.filter((e) => e.type !== "axis"), axes = gr.elements.filter((e) => e.type === "axis");
    if (kinds.length) {
      const pw = await powerMemo(rt, `s2a|${gr.group}|${gr.size}|${gr.m}`, async () => {
        const reps = rt.scale.powerReps; let hit = 0, ctlPass = 0, ctlN = 0;
        for (let r = 0; r < reps; r++) { const w = planted(rt, gr, "kind", r), o = await s2aRun(w.rtp, w.profiles, gr.group, [w.e], gr.m, [w.e.size]); if (o.kinds[0]?.pass) hit++; o.controls.forEach((c) => { ctlN++; if (c.pass) ctlPass++; }); }
        const ctlOk = ctlN ? !rejectsAtMost(ctlPass, ctlN) : true;
        return { reps, hit, rate: hit / reps, controlPass: ctlPass, controlN: ctlN, nullOk: ctlOk, ok: hit / reps >= POWER_RATE && ctlOk };
      });
      if (!pw.ok) kinds.forEach((e) => rows.push({ element: e.id, test: "S2a", status: "UNDERPOWERED", reason: pw.nullOk ? "planted_power_below_0.8" : "random_claims_pass_rate_rejected", power: pw }));
      else {
        const o = await s2aRun(rt, rt.profiles, gr.group, kinds, gr.m, Array.from({ length: rt.scale.controlReps }, () => kinds[0].size));
        const ctlPass = o.controls.filter((c) => c.pass).length, ctlFailed = rejectsAtMost(ctlPass, o.controls.length);
        o.kinds.forEach((r) => rows.push({ element: r.element, test: "S2a", status: ctlFailed ? "INSTRUMENT_FAILED" : r.pass ? "pass" : "fail", ...r, power: pw, control: { pass: ctlPass, n: o.controls.length } }));
      }
    }
    for (const e of axes) {
      const pw = await powerMemo(rt, `s2a-axis|${gr.group}|${gr.m}`, async () => {
        const reps = Math.max(2, Math.ceil(rt.scale.powerReps / 2)); let hit = 0;
        for (let r = 0; r < reps; r++) { const w = planted(rt, gr, "axis", r), a = await s2aAxis(w.rtp, w.profiles, gr.group, w.e, gr.m), nu = await axisNull(w.rtp, w.profiles, gr.group, gr.m); if (Number.isFinite(a.rho) && (1 + nu.filter((v) => v >= a.rho).length) / (nu.length + 1) <= ALPHA) hit++; }
        return { reps, hit, rate: hit / reps, ok: hit / reps >= POWER_RATE };
      });
      if (!pw.ok) { rows.push({ element: e.id, test: "S2a", status: "UNDERPOWERED", reason: "planted_axis_power_below_0.8", power: pw }); continue; }
      const a = await s2aAxis(rt, rt.profiles, gr.group, e, gr.m), nu = await axisNull(rt, rt.profiles, gr.group, gr.m), p = (1 + nu.filter((v) => v >= a.rho).length) / (nu.length + 1);
      rows.push({ element: e.id, test: "S2a", status: Number.isFinite(a.rho) && p <= ALPHA ? "pass" : "fail", rho: a.rho, p, defined: a.defined, power: pw });
    }
  }
  return { rows, gaps };
}
/** Null of the axis LOO projection: the same procedure on N-feat redeals, the element being each redeal's top axis. */
async function axisNull(rt, profiles, group, m) {
  const out = [], P = Math.min(rt.scale.axisNull ?? 20, 99);
  for (let q = 0; q < P; q++) {
    const rng = rngFor(rt.seed, "axnull", group, q), pn = redealProfilesFeat(profiles, rng), rtn = { ...rt, profiles: pn, cache: new Map() }, spec = buildSpec(pn, { group }), ind = await rtn.induce(spec, { draws: 0, top: m, seed: seedOf(rt, "axnull", q) }), c = ind.candidates[0];
    if (!c?.u) continue;
    const e = { type: "axis", u: new Map(c.u.map((v, i) => [spec.systemIds[i], v]).filter(([, v]) => v != null)) };
    const a = await s2aAxis(rtn, pn, group, e, m); if (Number.isFinite(a.rho)) out.push(a.rho);
  }
  return out;
}

// ── S2b and S5 runner (the held-out signature prediction; the gain rule; the map as a row of its own table) ──────
async function calibratePlantedGain(rt, gr, targetRel) {
  const lo0 = 0.05, hi0 = 2.5; let lo = lo0, hi = hi0, best = null;
  for (let it = 0; it < rt.scale.calibSteps; it++) {
    const s = (lo + hi) / 2; let gains = [];
    for (let r = 0; r < rt.scale.calibReps; r++) {
      const w = planted(rt, gr, "kind", 1000 + r, { strength: s }), kCmp = 2;
      const ho = await heldOutLosses(w.rtp, w.profiles, gr.group, { splits: 1, Q: 0, kCmp, rivals: false, tag: `cal${it}` });
      if (ho.gap) return { gap: ho.gap };
      const b = lineageLoss(w.profiles, ho.M0).mean, g = (b - lineageLoss(w.profiles, ho.M3).mean) / b; gains.push(g);
    }
    const g = mean(gains); best = { strength: s, relGain: g };
    if (g < targetRel) lo = s; else hi = s;
  }
  return best;
}
async function runS2bS5(rt, grs) {
  const s2b = [], s5 = [], gaps = [];
  for (const gr of grs) {
    const clusters = gr.elements.filter((e) => e.type === "kind" && e.status === "CLUSTER");
    if (!clusters.length) { s2b.push({ group: gr.group, status: "NOT_RUN", reason: "no_CLUSTER_element_to_predict_with" }); s5.push({ group: gr.group, status: "NOT_RUN", reason: "no_CLUSTER_element_to_register_as_a_rival" }); continue; }
    const kCmp = 1 + clusters.length;
    // power: planted transfers calibrated to 2 s_L and 0.5 s_L (relative), then the gain rule on each
    const pw = await powerMemo(rt, `s2b|${gr.group}|${gr.size}`, async () => {
      const up = await calibratePlantedGain(rt, gr, 2 * SESOI_L), down = await calibratePlantedGain(rt, gr, 0.5 * SESOI_L);
      if (up.gap || down.gap) return { ok: false, gap: up.gap ?? down.gap };
      let upHit = 0, downHit = 0; const reps = rt.scale.powerReps;
      for (let r = 0; r < reps; r++) {
        const wu = planted(rt, gr, "kind", 2000 + r, { strength: up.strength }), hu = await heldOutLosses(wu.rtp, wu.profiles, gr.group, { kCmp, rivals: false, tag: "pu" });
        if (!hu.gap && evaluateGain(wu.profiles, hu.M0, hu.M3, hu.M4, { seed: rt.seed, tag: "pu" }).gain) upHit++;
        const wd = planted(rt, gr, "kind", 3000 + r, { strength: down.strength }), hd = await heldOutLosses(wd.rtp, wd.profiles, gr.group, { kCmp, rivals: false, tag: "pd" });
        if (!hd.gap) { const g = evaluateGain(wd.profiles, hd.M0, hd.M3, hd.M4, { seed: rt.seed, tag: "pd" }); if (g.ci95[1] < g.sL) downHit++; }
      }
      return { reps, up, down, upRate: upHit / reps, downRate: downHit / reps, ok: upHit / reps >= POWER_RATE && downHit / reps >= POWER_RATE };
    });
    // control built to fail: the held-out half-B signatures replaced by another system's
    const ctl = await heldOutLosses(rt, rt.profiles, gr.group, { kCmp, rivals: false, permuteB: true, tag: "s2b-ctl" });
    const ctlGain = ctl.gap ? null : evaluateGain(rt.profiles, ctl.M0, ctl.M3, ctl.M4, { seed: rt.seed, tag: "s2b-ctl" });
    if (!pw.ok) { s2b.push({ group: gr.group, status: "UNDERPOWERED", reason: pw.gap ? "gap" : "planted_2sL_or_0.5sL_not_resolved_at_the_real_n", power: pw, control: ctlGain }); }
    else if (ctlGain?.gain) { s2b.push({ group: gr.group, status: "INSTRUMENT_FAILED", reason: "permuted_B_signatures_read_as_gain", power: pw, control: ctlGain }); }
    const ho = await (pw.ok && !ctlGain?.gain ? heldOutLosses(rt, rt.profiles, gr.group, { kCmp }) : Promise.resolve(null));
    if (ho && !ho.gap) {
      const g = evaluateGain(rt.profiles, ho.M0, ho.M3, ho.M4, { seed: rt.seed, tag: "s2b" });
      s2b.push({ group: gr.group, status: g.gain ? "GAIN" : (g.ci95[1] < g.sL ? "NO_GAIN" : "UNDERPOWERED"), reason: g.gain ? "all_of_a_b_c_d_hold" : "interval_straddles_or_gate_failed", gain: g, noKindRate: ho.noKindRate, power: pw, control: ctlGain });
      // S5: the best simple rival at equal k against Barker's kinds
      const rivalLoss = (key) => ho[key]; const keys = ["script", "branch", "lineage"], means = keys.map((k) => lineageLoss(rt.profiles, ho[k]).mean), best = keys[means.indexOf(Math.min(...means))];
      const vsRival = evaluateGain(rt.profiles, rivalLoss(best), ho.M3, ho.M4, { seed: rt.seed, tag: "s5" }), vsNull = evaluateGain(rt.profiles, ho.M0, ho.M3, ho.M4, { seed: rt.seed, tag: "s5n" });
      const reading = vsRival.gain ? "BEATS-RIVALS" : (vsNull.components.a && vsNull.components.b ? "BEATS-NULL-ONLY" : "NOT-BEATING-NULL");
      s5.push({ group: gr.group, status: reading, bestRival: best, table: { M0: lineageLoss(rt.profiles, ho.M0).mean, M3: lineageLoss(rt.profiles, ho.M3).mean, script: means[0], branch: means[1], lineage: means[2], M4median: vsNull.m4Median }, vsRival, kCmp });
    } else if (ho?.gap) { s2b.push({ group: gr.group, status: "NOT_RUN", gap: ho.gap }); gaps.push(ho.gap); }
    if (!ho && !s5.some((x) => x.group === gr.group)) s5.push({ group: gr.group, status: "UNDERPOWERED", reason: "S2b_power_or_control_did_not_clear" });
  }
  return { s2b, s5, gaps };
}

// ── S3 and S4 runners ────────────────────────────────────────────────────────────────────────────────────────────
async function runS3(rt, grs) {
  const rowsIn = [], meta = [];
  for (const gr of grs) for (const e of gr.elements) { rowsIn.push({ element: e.id, group: gr.group, ...decomposeLabelling(labelOfElement(e, rt.profiles), rt.profiles, { perms: rt.scale.perms, seed: rt.seed, tag: `s3-${e.id}` }) }); meta.push(e); }
  // power and control on planted labellings (no induction needed: the question is whether the decomposition reads them right)
  const pw = await powerMemo(rt, "s3", async () => {
    const reps = rt.scale.powerReps, des = rt.design; let gHit = 0, xHit = 0, ctlSig = 0, ctlN = 0;
    for (let r = 0; r < reps; r++) {
      const wg = plantProfiles(des, { world: "genealogy", seed: seedOf(rt, "s3g", r), branchKey: null, nKinds: 1 }), tg = wg.truth.kinds[0]; if (!tg || !tg.members.length) continue;
      const bG = wg.profiles.map((p) => (tg.members.includes(p.id) ? 1 : 0)), dG = readDecompositions([{ ...decomposeLabelling(bG, wg.profiles, { perms: rt.scale.perms, seed: rt.seed, tag: `s3pg${r}` }) }])[0];
      if (dG.reading === "GENEALOGY" || dG.reading === "BOTH") gHit++;
      const wx = plantProfiles(des, { world: "kind", seed: seedOf(rt, "s3x", r), kindSize: Math.max(MIN_KIND, Math.round(des.n / 6)) }), tx = wx.truth.kinds[0], bX = wx.profiles.map((p) => (tx.members.includes(p.id) ? 1 : 0)), dX = readDecompositions([{ ...decomposeLabelling(bX, wx.profiles, { perms: rt.scale.perms, seed: rt.seed, tag: `s3px${r}` }) }])[0];
      if (dX.reading === "CROSS-CUTTING") xHit++;
      // control: labels permuted jointly across systems; the planted genealogy element must dissolve
      const rng = rngFor(rt.seed, "s3ctl", r), perm = shuffledIdx(wg.profiles.length, rng), lab = wg.profiles.map((p, i) => ({ ...p, labels: { ...wg.profiles[perm[i]].labels } })), dC = readDecompositions([{ ...decomposeLabelling(bG, lab, { perms: rt.scale.perms, seed: rt.seed, tag: `s3pc${r}` }) }])[0];
      ctlN++; if (dC.sigF || dC.sigS) ctlSig++;
    }
    const ctlOk = ctlN ? !rejectsAtMost(ctlSig, ctlN) : true;
    return { reps, genealogyRate: gHit / reps, crossRate: xHit / reps, controlSig: ctlSig, controlN: ctlN, nullOk: ctlOk, ok: gHit / reps >= POWER_RATE && xHit / reps >= POWER_RATE && ctlOk };
  });
  if (!pw.ok) return { rows: meta.map((e) => ({ element: e.id, test: "S3", status: "UNDERPOWERED", reason: "planted_genealogy_or_cross_lineage_not_read_correctly_or_control_failed", power: pw })), power: pw };
  return { rows: readDecompositions(rowsIn).map((r) => ({ ...r, test: "S3", status: r.reading === "CROSS-CUTTING" ? "cross-cutting" : "relabelling", power: pw })), power: pw };
}
async function runS4(rt, grs) {
  const rows = [], skipped = [];
  for (const gr of grs) {
    if (!gr.elements.length) continue;
    const pw = await powerMemo(rt, `s4|${gr.group}|${gr.size}|${gr.m}`, async () => {
      const reps = Math.max(2, Math.ceil(rt.scale.powerReps / 2)); let single = 0, crossFlips = 0, crossTests = 0;
      for (let r = 0; r < reps; r++) {
        const wg = planted(rt, gr, "kind", r, { world: "genealogy" }); if (!wg.truth.kinds[0]?.members.length) continue;
        const t = await s4Kinds(wg.rtp, wg.profiles, gr.group, [wg.e], gr.m), br = wg.truth.kinds[0].branches[0];
        if (t.table.find((x) => x.removal === `branch:${br}`)?.recovered === false) single++;
        const wx = planted(rt, gr, "kind", 500 + r), tx = await s4Kinds(wx.rtp, wx.profiles, gr.group, [wx.e], gr.m);
        tx.table.forEach((x) => { crossTests++; if (!x.recovered) crossFlips++; });
      }
      const crossOk = crossTests ? !rejectsAtMost(crossFlips, crossTests, ALPHA) : true;
      return { reps, singleFamilyFlipRate: single / reps, crossFlips, crossTests, ok: single / reps >= POWER_RATE && crossOk, nullOk: crossOk };
    });
    if (!pw.ok) { gr.elements.forEach((e) => rows.push({ element: e.id, test: "S4", status: "UNDERPOWERED", reason: "planted_single_family_flip_not_detected_or_cross_lineage_element_flips_too_often", power: pw })); continue; }
    const t = await s4Kinds(rt, rt.profiles, gr.group, gr.elements, gr.m); skipped.push(...t.skipped);
    for (const e of gr.elements) { const mine = t.table.filter((x) => x.element === e.id), flips = mine.filter((x) => !x.recovered); rows.push({ element: e.id, test: "S4", status: flips.length ? "FAMILY-FRAGILE" : "stable", flips: flips.map((x) => x.removal), removalsTested: mine.length, table: mine, power: pw }); }
  }
  return { rows, skipped };
}

// ── S6 false-arch rate of the whole procedure ────────────────────────────────────────────────────────────────────
async function runS6(rt, grs, archs) {
  const W = rt.scale.W, perGroup = Object.fromEntries(grs.map((g) => [g.group, 0])); let kindWorlds = 0, archWorlds = 0, falseWorlds = 0;
  for (let d = 0; d < W; d++) {
    const pn = redealProfilesFeat(rt.profiles, rngFor(rt.seed, "s6a", d)), rtn = { ...rt, profiles: pn, cache: new Map() };
    let kf = false;
    for (const gr of grs) { const sp = buildSpec(pn, { group: gr.group }); if (sp.blocks.length < 6) continue; const ind = await rtn.induce(sp, { draws: rt.scale.Dworld, top: gr.m, seed: seedOf(rt, "s6a", gr.group, d) }); if (ind.kinds.length) { kf = true; perGroup[gr.group]++; } }
    const af = archs?.nullWorld ? Object.values((await archs.nullWorld(d)) ?? {}).some((s) => ARCH_LIKE.includes(s)) : false;
    if (kf) kindWorlds++; if (af) archWorlds++; if (kf || af) falseWorlds++;
  }
  const upper = clopperUpper(falseWorlds, W), holds = upper <= FALSE_ARCH_BOUND, attainable = clopperUpper(0, W) <= FALSE_ARCH_BOUND;   // ADDENDUM A: below W = 29 even zero false worlds cannot reach the bound
  // (b) planted recall surface: m kinds at once on disjoint members
  const recall = [], repsB = Math.max(2, Math.ceil(rt.scale.powerReps / 2));
  for (const m of [1, 3, 5].filter((x) => x <= rt.scale.plantedM)) {
    let found = 0, total = 0;
    for (let r = 0; r < repsB; r++) {
      const sys = rt.design.systems, used = new Set(), members = [], sz = Math.max(MIN_KIND, Math.round(rt.design.n / (2 * m + 2)));
      for (let k = 0; k < m; k++) { const left = sys.map((s, i) => ({ ...s, i })).filter((s) => !used.has(s.i)), pick = crossLineageMembers(left, sz, k).map((j) => left[j].i); if (pick.length < MIN_KIND) break; pick.forEach((i) => used.add(i)); members.push(pick); }
      if (!members.length) continue;
      const w = plantProfiles(rt.design, { world: "kind", nKinds: members.length, members, seed: seedOf(rt, "s6b", m, r), ...(rt.plantCell ?? {}) }), sp = buildSpec(w.profiles, { group: "ALL" }), ind = await rt.induce(sp, { draws: rt.scale.Dworld, top: m, seed: seedOf(rt, "s6b-ind", m, r) });
      members.forEach((mem, k) => { total++; const T = new Set(mem); if (ind.kinds.some((kk) => kk.status === "CLUSTER" && (() => { const inter = kk.members.filter((i) => T.has(i)).length, f1 = 2 * inter / (kk.members.length + T.size); return f1 >= 0.9; })())) found++; });
    }
    recall.push({ planted: m, recall: total ? found / total : NaN, found, total });
  }
  // (c) Gaussian-copula worlds of each real group and planted continuum worlds, through the same pipeline
  const copula = [];
  for (const gr of grs) {
    if (gr.spec.blocks.length < 6) continue;
    const model = copulaModel(gr.spec); let k = 0;
    for (let w = 0; w < rt.scale.Wc; w++) { const sp = redealCov(gr.spec, rngFor(rt.seed, "s6c", gr.group, w), model), ind = await rt.induce(sp, { draws: rt.scale.Dworld, top: gr.m, seed: seedOf(rt, "s6c", gr.group, w) }); if (ind.kinds.some((x) => x.status === "CLUSTER")) k++; }
    copula.push({ group: gr.group, clusterWorlds: k, worlds: rt.scale.Wc, rejected: rejectsAtMost(k, rt.scale.Wc), delta: model.delta });
  }
  const continuum = [];
  for (const variant of ["free", "branch"]) {
    let k = 0, grad = 0;
    for (let w = 0; w < rt.scale.Wcont; w++) { const cw = plantProfiles(rt.design, { world: "continuum", variant, seed: seedOf(rt, "s6k", variant, w), ...(rt.plantCell ?? {}) }), sp = buildSpec(cw.profiles, { group: "ALL" }), ind = await rt.induce(sp, { draws: rt.scale.Dworld, top: 1, seed: seedOf(rt, "s6k-ind", variant, w) }); if (ind.kinds.some((x) => x.status === "CLUSTER")) k++; if (ind.kinds.some((x) => x.status === "GRADIENT")) grad++; }
    continuum.push({ variant, clusterWorlds: k, gradientWorlds: grad, worlds: rt.scale.Wcont, rejected: rejectsAtMost(k, rt.scale.Wcont) });
  }
  const calibrationFailed = copula.some((c) => c.rejected) || continuum.some((c) => c.rejected);
  const withheld = (attainable && !holds) || calibrationFailed, status = withheld ? "INSTRUMENT_FAILED" : attainable ? "SURVIVES" : "UNDERPOWERED";
  return { worlds: W, falseWorlds, kindWorlds, archWorlds, rate: falseWorlds / W, upper95: upper, bound: FALSE_ARCH_BOUND, holds, attainable, perGroup, recall, copula, continuum, calibrationFailed, withheld, status, reason: !attainable ? `W=${W} worlds cannot reach an upper 95% bound of ${FALSE_ARCH_BOUND} even with zero false worlds (needs W >= 29)` : undefined, archsInjected: !!archs?.nullWorld };
}

// ── S7 runner ────────────────────────────────────────────────────────────────────────────────────────────────────
export async function s7Element(rt, profiles, group, e, m, channels, audit) {
  const comps = audit.components.map((ids) => ({ ids, features: new Set(channels.filter((c) => ids.includes(c.id)).flatMap((c) => c.features ?? [])) })), out = [];
  for (const c of comps) {
    const fids = [...c.features].filter((id) => cellsOf(profiles[0])[id] && (group === "ALL" || cellsOf(profiles[0])[id].group === group));
    if (fids.length < 6) { out.push({ channels: c.ids, features: fids.length, gap: "fewer_than_6_features" }); continue; }
    const spec = buildSpec(profiles, { group, featureIds: fids }), ind = await rt.induce(spec, { draws: rt.scale.Dres, top: m, seed: seedOf(rt, "s7", group, c.ids.join("|")) }), bar = await nullBar(rt, spec, { m, P: rt.scale.P, tag: `s7-${c.ids.join("|")}` }), r = recovery(e, spec, ind, m);
    out.push({ channels: c.ids, features: fids.length, recovered: !r.lost && r.a > barFor(bar, e), agreement: r.a, bar: barFor(bar, e) });
  }
  const tested = out.filter((x) => x.recovered !== undefined), holds = tested.filter((x) => x.recovered).length;
  return { components: out, holdsIn: holds, tested: tested.length, status: tested.length < 2 ? "UNTESTABLE" : holds >= 2 ? "replicated" : "CHANNEL-BOUND" };
}
async function runS7(rt, grs) {
  const channels = rt.ctx.channels ?? channelsOfProfiles(rt.profiles), audit = independenceAudit(channels), rows = [];
  const dup = channels.length ? independenceAudit([...channels, { ...channels[0], id: `${channels[0].id}#duplicate` }]) : null;
  const control = { expected: "a duplicated channel adds no component", duplicatedEffectiveN: dup?.effectiveN, effectiveN: audit.effectiveN, ok: !dup || dup.effectiveN === audit.effectiveN };
  // power: an element planted in 1 of 3 independent channels reads CHANNEL-BOUND; one planted in all three reads replicated
  const pw = await powerMemo(rt, "s7", async () => {
    const reps = Math.max(2, Math.ceil(rt.scale.powerReps / 2)), chByGroup = { 0: "ud:deprel", 1: "prior:pos-x-unimorph", 2: "grammar:tree-sitter" }; let bound = 0, repl = 0, tot = 0;
    const gnames = Object.keys(rt.design.groups).sort();
    if (gnames.length < 3) return { ok: false, gap: { reason: "design_has_fewer_than_3_groups_for_3_planted_channels", denominator: { have: gnames.length, need: 3 } } };
    for (let r = 0; r < reps; r++) {
      const chOf = (ft) => chByGroup[gnames.indexOf(ft.group) % 3];
      const one = plantProfiles(rt.design, { world: "kind", seed: seedOf(rt, "s7p1", r), sigGroups: [gnames[0]], channelOf: chOf, ...(rt.plantCell ?? {}) }), all = plantProfiles(rt.design, { world: "kind", seed: seedOf(rt, "s7p3", r), channelOf: chOf, ...(rt.plantCell ?? {}) });
      for (const [w, tag] of [[one, "one"], [all, "all"]]) {
        const rtp = { ...rt, profiles: w.profiles, cache: new Map() }, chs = channelsOfProfiles(w.profiles), au = independenceAudit(chs), e = { type: "kind", ids: new Set(w.truth.kinds[0].members), size: w.truth.kinds[0].members.length };
        const res = await s7Element(rtp, w.profiles, "ALL", e, 1, chs, au); if (tag === "one") { tot++; if (res.status === "CHANNEL-BOUND") bound++; } else if (res.status === "replicated") repl++;
      }
    }
    return { reps, boundRate: bound / Math.max(1, tot), replicatedRate: repl / reps, ok: bound / Math.max(1, tot) >= POWER_RATE && repl / reps >= POWER_RATE };
  });
  const applicable = audit.effectiveN >= 2;
  for (const gr of grs) for (const e of gr.elements) {
    if (!applicable) { rows.push({ element: e.id, test: "S7", status: "not_applicable", reason: "one_independent_channel_exists_so_channel_agreement_cannot_be_asked" }); continue; }
    if (!pw.ok || !control.ok) { rows.push({ element: e.id, test: "S7", status: !control.ok ? "INSTRUMENT_FAILED" : "UNDERPOWERED", reason: !control.ok ? "duplicated_channel_added_a_component" : "planted_1_of_3_channels_not_read_correctly", power: pw }); continue; }
    const r = await s7Element(rt, rt.profiles, gr.group, e, gr.m, channels, audit); rows.push({ element: e.id, test: "S7", status: r.status, ...r, power: pw });
  }
  return { audit, control, power: pw, rows, channels: channels.map((c) => ({ id: c.id, ancestors: c.ancestors, mapped: c.mapped })) };
}

// ── S8 prospective ───────────────────────────────────────────────────────────────────────────────────────────────
export function makeLedger(file = null) {
  const m = new Map(); if (file && fs.existsSync(file)) { try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(file, "utf8")))) m.set(k, v); } catch { /* an unreadable ledger is a fresh ledger, and says so */ } }
  return { has: (id) => m.has(id), get: (id) => m.get(id), mark: (id, hash) => { m.set(id, hash); if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(Object.fromEntries(m))); } }, size: () => m.size };
}
async function runS8(rt, grs, prospective) {
  const fresh = prospective?.newProfiles ?? [];
  if (!fresh.length) return { status: "NOT_RUN", gap: { reason: "no_system_first_seen_after_the_freeze", denominator: { have: 0, need: 1 } }, rows: [] };
  const ledger = prospective.ledger ?? (rt.ledger ??= makeLedger(prospective.ledgerPath ?? null)), rows = [];
  for (const p of fresh) {
    if (ledger.has(p.id)) { rows.push({ system: p.id, status: "REFUSED", reason: "already_scored_once", hash: ledger.get(p.id) }); continue; }
    const per = [];
    for (const gr of grs.filter((g) => g.elements.some((e) => e.type === "kind" && e.status === "CLUSTER"))) {
      const rng = rngFor(rt.seed, "s8", gr.group), fids = gr.spec.featureIds, perm = shuffledIdx(fids.length, rng), half = Math.floor(fids.length / 2), A = perm.slice(0, half).map((i) => fids[i]), Bf = perm.slice(half).map((i) => fids[i]);
      const sA = buildSpec(rt.profiles, { group: gr.group, featureIds: A }), sB = buildSpec(rt.profiles, { group: gr.group, featureIds: Bf }), usable = (id) => cellsOf(p)[id] && isNum(cellsOf(p)[id].value);
      if (![...A, ...Bf].every(usable)) { per.push({ group: gr.group, gap: "new_system_lacks_features" }); continue; }
      const xA = signatureOf(p, sA), xB = hiBitsOf(signatureOf(p, sB)), M0 = meanHi(sB.matrix.map((_, i) => i), sB.matrix), l0 = bitsOf(xB, M0);
      let l3 = l0, assigned = false;
      for (const e of gr.elements.filter((x) => x.type === "kind" && x.status === "CLUSTER")) { const rowsK = sA.systemIds.map((id, i) => (e.ids.has(id) ? i : -1)).filter((i) => i >= 0), d = discriminant(sA.matrix, rowsK); if (d && d.score(xA) > d.theta) { l3 = bitsOf(xB, meanHi(rowsK, sB.matrix)); assigned = true; break; } }
      const rival = (lab, mine) => { const r = rt.profiles.map((q, i) => (lab(q) === mine ? i : -1)).filter((i) => i >= 0); return r.length ? bitsOf(xB, meanHi(r, sB.matrix)) : l0; };
      per.push({ group: gr.group, M0: l0, M3: l3, assigned, script: rival(scriptOf, scriptOf(p)), branch: rival(branchOf, branchOf(p)), lineage: rival(lineageOf, lineageOf(p)) });
    }
    ledger.mark(p.id, createHash("sha256").update(JSON.stringify(per)).digest("hex").slice(0, 16)); rows.push({ system: p.id, status: "SCORED", lineage: lineageOf(p), per });
  }
  const scored = rows.filter((r) => r.status === "SCORED"), nl = new Set(scored.map((r) => r.lineage)).size, reach = reachability(nl);
  return { status: scored.length ? (reach.unreachable ? "UNDERPOWERED" : "SCORED") : "NOT_RUN", reason: reach.unreachable ? "n_lineages_below_5_unreachable_by_reachability_descriptive_only" : undefined, nLineages: nl, reach, rows };
}

// ── S9 runner ────────────────────────────────────────────────────────────────────────────────────────────────────
async function runS9(rt, grs, archs) {
  const rows = [], gs = Object.keys(rt.design?.groups ?? {}).sort();
  const pw = await powerMemo(rt, "s9", async () => {
    if (gs.length < 3) return { ok: false, gap: { reason: "design_has_fewer_than_3_groups", denominator: { have: gs.length, need: 3 } } };
    const reps = Math.max(2, Math.ceil(rt.scale.powerReps / 2)); let eo = 0, single = 0, plural = 0, ctlPlural = 0;
    for (let r = 0; r < reps; r++) {
      const mk = (o) => { const w = plantProfiles(rt.design, { world: o.world ?? "kind", seed: seedOf(rt, "s9p", o.tag, r), sigGroups: o.sigGroups, ...(rt.plantCell ?? {}) }), e = { type: "kind", ids: new Set(w.truth.kinds[0].members), size: w.truth.kinds[0].members.length }; return { w, e, rtp: { ...rt, profiles: w.profiles, cache: new Map() } }; };
      const a = mk({ world: "eoOnly", tag: "eo" }), fa = await s9Frames(a.rtp, a.w.profiles, "ALL", [a.e], 1); if (fa.rows.some((x) => x.frame === "F-noEO" && !x.recovered) && !fa.frameRecs.find((f) => f.frame === "F-noEO")?.vacuous) eo++;
      const b = mk({ tag: "one", sigGroups: [gs[0]] }), fb = await s9Frames(b.rtp, b.w.profiles, "ALL", [b.e], 1); if (fb.rows.some((x) => x.frame === `F-group:${gs[0]}` && !x.recovered)) single++;
      const c = mk({ tag: "two", sigGroups: gs.slice(0, 2) }), fc = await s9Frames(c.rtp, c.w.profiles, "ALL", [c.e], 1); if (fc.rows.filter((x) => !x.frame.startsWith("F-noEO")).every((x) => x.recovered)) plural++;
      if (fb.rows.filter((x) => !x.frame.startsWith("F-noEO")).every((x) => x.recovered)) ctlPlural++;      // the single-group element must NOT read plural
    }
    const ctlOk = !rejectsAtMost(ctlPlural, reps);
    return { reps, eoBoundRate: eo / reps, singleGroupFrameBoundRate: single / reps, twoGroupPluralRate: plural / reps, singleGroupFalsePlural: ctlPlural, nullOk: ctlOk, ok: eo / reps >= POWER_RATE && single / reps >= POWER_RATE && plural / reps >= POWER_RATE && ctlOk };
  });
  const noEO = eoRemovedOf(rt.profiles);
  for (const gr of grs) {
    if (!gr.elements.length) continue;
    if (!pw.ok) { gr.elements.forEach((e) => rows.push({ element: e.id, test: "S9", status: "UNDERPOWERED", reason: pw.gap ? "gap" : "planted_EO_only_or_single_group_or_two_group_not_read_correctly", power: pw })); continue; }
    const fr = await s9Frames(rt, rt.profiles, gr.group, gr.elements, gr.m);
    for (const e of gr.elements) {
      const mine = fr.rows.filter((x) => x.element === e.id), broken = mine.filter((x) => !x.recovered), others = fr.otherGroups.filter((x) => x.element === e.id), otherOk = gr.group === "ALL" || others.some((x) => x.recovered);
      const eoBound = broken.some((x) => x.frame === "F-noEO"), plural = broken.length === 0 && otherOk;
      rows.push({ element: e.id, test: "S9", status: plural ? "PLURAL" : eoBound ? "EO-BOUND" : "FRAME-BOUND", brokenFrames: broken.map((x) => x.frame), otherGroupsRecovering: others.filter((x) => x.recovered).map((x) => x.group), vacuousFrames: fr.frameRecs.filter((f) => f.vacuous).map((f) => f.frame), frames: mine, power: pw });
    }
  }
  const archRows = [];
  if (archs?.status) {
    const base = await archs.status({}), frames = [{ frame: "noEO" }];
    for (const [id, sc] of Object.entries(archs.schemes ?? {})) for (const alt of sc.alternatives ?? []) frames.push({ frame: "altScheme", scheme: id, alternative: alt });
    const results = []; for (const f of frames) results.push({ f, st: await archs.status(f) });
    for (const id of archs.ids ?? Object.keys(base)) {
      const broken = results.filter(({ f, st }) => (f.scheme ? f.scheme === id : true) && st?.[id] !== base[id]).map(({ f }) => (f.scheme ? `altScheme:${f.alternative}` : f.frame));
      archRows.push({ arch: id, test: "S9", status: broken.length ? (broken.includes("noEO") ? "EO-BOUND" : "FRAME-BOUND") : "PLURAL", brokenFrames: broken, base: base[id] });
    }
  }
  return { rows, archRows, power: pw, eoDerivedFeatures: noEO.length, eoVacuous: noEO.length === 0 };
}

// ── the pre-registration digest (the eval/competence convention) ─────────────────────────────────────────────────
const SELF_FILE = fileURLToPath(import.meta.url);
/** sha256 of this file's leading comment block: stamped into every card as details.prereg_sha256. */
export function headerDigest(file = SELF_FILE) {
  const lines = []; for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  return createHash("sha256").update(lines.join("\n").trim()).digest("hex");
}
export const PREREG_SHA = headerDigest();
/** sha256 of the ADDENDA block (hashed apart so the pre-registration digest above stays that of the original text). */
export function addendaDigest(file = SELF_FILE) {
  const t = fs.readFileSync(file, "utf8"), a = t.indexOf("// ═══ ADDENDA"), b = t.indexOf("// ═══ END ADDENDA ═══");
  return a >= 0 && b > a ? createHash("sha256").update(t.slice(a, b)).digest("hex") : null;
}
export const ADDENDA_SHA = addendaDigest();

// ── aggregation: cards, the standing of each map element, the trust suggestion ───────────────────────────────────
const ROW_CLASS = {
  stable: "SURVIVES", unstable: "REFUTED", pass: "SURVIVES", fail: "REFUTED", "cross-cutting": "SURVIVES", relabelling: "WEAKENED", "FAMILY-FRAGILE": "WEAKENED", PLURAL: "SURVIVES",
  "FRAME-BOUND": "WEAKENED", "EO-BOUND": "WEAKENED", replicated: "SURVIVES", not_applicable: "SURVIVES", "CHANNEL-BOUND": "WEAKENED", UNTESTABLE: "UNDERPOWERED",
  "BEATS-RIVALS": "SURVIVES", "BEATS-NULL-ONLY": "WEAKENED", "NOT-BEATING-NULL": "REFUTED", GAIN: "SURVIVES", NO_GAIN: "WEAKENED", SCORED: "UNDERPOWERED",
  UNDERPOWERED: "UNDERPOWERED", INSTRUMENT_FAILED: "INSTRUMENT_FAILED", NOT_RUN: "NOT_RUN", REFUSED: "NOT_RUN", SURVIVES: "SURVIVES",
};
const classOf = (row) => ROW_CLASS[row.status] ?? "NOT_RUN";
const PRECEDENCE = ["INSTRUMENT_FAILED", "REFUTED", "WEAKENED", "UNDERPOWERED", "NOT_RUN", "SURVIVES"];
const worst = (classes) => PRECEDENCE.find((c) => classes.includes(c)) ?? "NOT_RUN";
function cardOf(id, title, rows, extra = {}) {
  const classes = rows.map(classOf), status = rows.length ? worst(classes) : "NOT_RUN";
  return { id, title, status, rows: rows.length, counts: Object.fromEntries(PRECEDENCE.map((c) => [c, classes.filter((x) => x === c).length])), pass: rows.length > 0 && classes.every((c) => c === "SURVIVES"), details: { prereg_sha256: PREREG_SHA }, ...extra, perElement: rows };
}
/** One decision table for a map element (the header's STANDING table). `tests` maps a test id to its row. */
export function standingOf(tests, { mapLevel = {}, kind = "kind" } = {}) {
  const refuted = [], weakened = [], missing = [];
  for (const [k, row] of Object.entries(tests)) {
    if (!row) continue; const c = classOf(row);
    if (c === "REFUTED") refuted.push(`${k}: ${row.status}`);
    else if (c === "WEAKENED") weakened.push(`${k}: ${row.reading ?? row.status}`);
    else if (c !== "SURVIVES") missing.push(`${k}: ${row.status}${row.reason ? ` (${row.reason})` : ""}`);
  }
  if (mapLevel.withheld) refuted.push("S6: the procedure is WITHHELD (false-arch bound or copula/continuum calibration failed)");
  if (kind === "kind" && mapLevel.s5 === "BEATS-NULL-ONLY") weakened.push("S5: the map does not beat the best simple rival (script/branch/lineage) at this n");
  if (kind === "kind" && mapLevel.s5 === "NOT-BEATING-NULL") refuted.push("S5: the map does not beat random kinds on held-out systems");
  if (refuted.length) return { standing: "REFUTED", reasons: refuted, also: weakened };
  if (weakened.length) return { standing: "WEAKENED", reasons: weakened, missing };
  if (missing.length) return { standing: "UNDERPOWERED", reasons: missing };
  return { standing: "SURVIVES", reasons: ["every applicable test was powered, its control failed as it should, and the element passed it"] };
}
const lineLines = (cards) => {
  const out = [], order = ["INSTRUMENT_FAILED", "UNDERPOWERED", "REFUTED", "WEAKENED", "NOT_RUN", "SURVIVES"];
  for (const st of order) for (const c of cards.filter((x) => x.status === st)) out.push(`${c.id} ${c.status}: ${c.title} (${Object.entries(c.counts ?? {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(", ") || "no per-element rows"})`);
  return out;
};

/**
 * runSelf(ctx) -> { map, survives, weakened, refuted, notes, underpowered, notRun, cards, trust, frame, preregSha }.
 * Power cards and calibration run before any real-data statistic; a test whose power card fails is not run on real data.
 */
export async function runSelf(ctx = {}) {
  const rt = makeRuntime(ctx), notes = [], gaps = [...(rt.design?.gaps ?? [])];
  if (!rt.profiles.length) throw new TypeError("runSelf: ctx.profiles is empty");
  if (rt.ctx.plantCell) rt.plantCell = rt.ctx.plantCell;
  const sc = rt.scale, truncated = isBelowDoc(sc);
  const lin = [...new Set(rt.profiles.map(lineageOf))].length, br = [...new Set(rt.profiles.map(branchOf))].length;
  if (rt.profiles.every((p) => !p.labels?.lineage && !p.labels?.branch)) gaps.push({ feature: "*", reason: "lineage_equals_branch_only_family_label_given", denominator: { have: lin, need: 9 } });
  // ── base inductions: the map as built ──
  const names = ctx.groups ?? ["ALL", ...groupsOf(rt.profiles)], grs = [];
  for (const name of names) {
    const spec = buildSpec(rt.profiles, { group: name });
    if (spec.blocks.length < 6) { gaps.push({ feature: name, reason: "group_has_fewer_than_6_usable_features", denominator: { have: spec.blocks.length, need: 6 } }); continue; }
    const ind = await stage(rt, `base induction ${name}`, () => rt.induce(spec, { draws: sc.D, top: 3, seed: seedOf(rt, "base", name) })), { elements, gaps: eg } = elementsFromInduction(ind, spec, name); gaps.push(...eg, ...spec.gaps.map((g) => ({ ...g, group: name })));
    const kindSizes = elements.filter((e) => e.type === "kind").map((e) => e.size), size = kindSizes.length ? Math.round(median(kindSizes)) : Math.max(MIN_KIND, Math.round(rt.profiles.length / 6));
    grs.push({ group: name, spec, ind, elements, m: Math.max(1, elements.length), size, pr: participationRatio(spec) });
  }
  const working = grs.filter((g) => g.elements.length), allElements = grs.flatMap((g) => g.elements);
  if (!allElements.length) notes.push("Level S: no kind and no axis was reported by the inducer in any group, so the mirror has no Level-S element to test; the power cards below say what it COULD have said.");
  // ── the tests (power cards run inside each runner, before the real-data statistic of that test) ──
  const forPower = working.length ? working : grs.filter((g) => g.group === "ALL");
  const s1 = await stage(rt, "S1", () => runS1(rt, working)), s2a = await stage(rt, "S2a", () => runS2a(rt, working)), s2b = await stage(rt, "S2b+S5", () => runS2bS5(rt, working)), s3 = await stage(rt, "S3", () => runS3(rt, working)), s4 = await stage(rt, "S4", () => runS4(rt, working));
  const archs = ctx.archs ?? null;
  let archBase = null, archElements = [];
  if (archs?.status) { archBase = await archs.status({}); archElements = (archs.ids ?? Object.keys(archBase)).filter((id) => ARCH_LIKE.includes(archBase[id])); }
  const s6 = await stage(rt, "S6", () => runS6(rt, grs, archs)), s7 = await stage(rt, "S7", () => runS7(rt, working)), s8 = await stage(rt, "S8", () => runS8(rt, grs, ctx.prospective)), s9 = await stage(rt, "S9", () => runS9(rt, working, archs));
  // arch rows: S4 (with the engine's own planted control), S7 (channel support), S9
  const archRows = new Map(archElements.map((id) => [id, {}]));
  if (archElements.length) {
    const ctl = archs.controls?.s4 ? await archs.controls.s4() : null, t = await s4Arches(rt, archs, archBase);
    for (const id of archElements) {
      const flips = t.table.filter((x) => x.arch === id && x.flipped);
      archRows.get(id).S4 = ctl === null ? { arch: id, test: "S4", status: "UNDERPOWERED", reason: "the_arch_engine_supplied_no_planted_single_family_control", flips: flips.map((x) => x.removal) } : ctl === false ? { arch: id, test: "S4", status: "INSTRUMENT_FAILED", reason: "planted_single_family_arch_did_not_flip" } : { arch: id, test: "S4", status: flips.length ? "FAMILY-FRAGILE" : "stable", flips: flips.map((x) => x.removal), removalsTested: t.table.filter((x) => x.arch === id).length };
      const support = archs.channelSupport?.[id];
      archRows.get(id).S7 = s7.audit.effectiveN < 2 ? { arch: id, test: "S7", status: "not_applicable", reason: "one_independent_channel_exists" } : !support ? { arch: id, test: "S7", status: "NOT_RUN", reason: "channelSupport_not_supplied" } : (() => { const comps = new Set(s7.audit.components.map((ids, k) => (ids.some((c) => support.includes(c)) ? k : -1)).filter((k) => k >= 0)); return { arch: id, test: "S7", status: comps.size >= 2 ? "replicated" : "CHANNEL-BOUND", components: comps.size }; })();
      archRows.get(id).S9 = s9.archRows.find((r) => r.arch === id) ?? { arch: id, test: "S9", status: "NOT_RUN", reason: "no_archs_engine" };
    }
  }
  // ── standing of each element ──
  const mapLevel = { withheld: s6.withheld, s5: s2b.s5.find((r) => r.status === "BEATS-RIVALS") ? "BEATS-RIVALS" : s2b.s5.find((r) => r.status === "BEATS-NULL-ONLY") ? "BEATS-NULL-ONLY" : s2b.s5.find((r) => r.status === "NOT-BEATING-NULL") ? "NOT-BEATING-NULL" : null };
  const s6Row = { status: s6.status, reason: s6.reason };
  const rowsFor = (id) => ({ S6: s6Row, S1a: s1.rows.find((r) => r.element === id && r.test === "S1a"), S1b: s1.rows.find((r) => r.element === id && r.test === "S1b"), S2a: s2a.rows.find((r) => r.element === id), S3: s3.rows.find((r) => r.element === id), S4: s4.rows.find((r) => r.element === id), S7: s7.rows.find((r) => r.element === id), S9: s9.rows.find((r) => r.element === id) });
  const elements = [];
  for (const gr of grs) for (const e of gr.elements) elements.push({ id: e.id, type: e.type, group: gr.group, status: e.status, size: e.size, pr: gr.pr, tests: rowsFor(e.id), ...standingOf(rowsFor(e.id), { mapLevel, kind: "kind" }) });
  for (const id of archElements) elements.push({ id, type: "arch", group: null, status: archBase[id], tests: archRows.get(id), ...standingOf(archRows.get(id), { mapLevel, kind: "arch" }) });
  const ids = (s) => elements.filter((e) => e.standing === s).map((e) => e.id);
  // ── cards ──
  const cards = [
    cardOf("S1a", "stability under sentence resampling", s1.rows.filter((r) => r.test === "S1a")), cardOf("S1b", "stability under feature split-half", s1.rows.filter((r) => r.test === "S1b")),
    cardOf("S2a", "leave-one-system-out consistency", s2a.rows), cardOf("S2b", "held-out signature prediction (gain rule, BARKER 5.0)", s2b.s2b.map((r) => ({ ...r, element: r.group }))),
    cardOf("S3", "label permutation: genealogy and script decomposition", s3.rows, { power: s3.power }), cardOf("S4", "family and lineage removal", [...s4.rows, ...[...archRows.values()].map((r) => r.S4).filter(Boolean)], { skipped: s4.skipped }),
    cardOf("S5", "the map as a row in its own table", s2b.s5.map((r) => ({ ...r, element: r.group }))),
    { id: "S6", title: "false-arch rate of the whole procedure", pass: s6.status === "SURVIVES", ...s6, details: { prereg_sha256: PREREG_SHA } },
    cardOf("S7", "independence audit", s7.rows, { audit: s7.audit, control: s7.control, power: s7.power, channels: s7.channels }),
    { id: "S8", title: "prospective scoring (once)", status: s8.status === "SCORED" ? "SURVIVES" : s8.status === "UNDERPOWERED" ? "UNDERPOWERED" : "NOT_RUN", pass: false, ...s8, details: { prereg_sha256: PREREG_SHA } },
    cardOf("S9", "plural frameworks: EO-derived cells removed, alternative schemes", [...s9.rows, ...s9.archRows], { power: s9.power, eoDerivedFeatures: s9.eoDerivedFeatures, eoVacuous: s9.eoVacuous }),
  ];
  cards.forEach((c) => { c.scale = sc.name; c.truncated = truncated; });
  // ── notes: failures first ──
  notes.push(...lineLines(cards));
  if (s7.audit.effectiveN < 2) notes.push(`S7: ${s7.audit.effectiveN} independent channel${s7.audit.effectiveN === 1 ? "" : "s"} among ${s7.audit.channels} (all UD-derived channels share one annotation pool): no element can be shown channel-independent; this is a limit, not a support.`);
  if (s9.eoVacuous) notes.push("S9: F-noEO removed nothing at Level S (no EO-derived cell in the profiles): reported as scan clean, not as replication.");
  if (truncated) notes.push(`scale "${sc.name}" is below the doc scale: every card says truncated (a typed gap, never a quiet cap).`);
  if (rt.usedReference) notes.push("inducer: referenceInducer (self.mjs stand-in: spectral splitter, two-means gap); not the Barker menu. A run under organs/barker.js is the registered one.");
  if (s6.withheld) notes.push(`S6: the arch/kind list is WITHHELD (false-world rate ${s6.falseWorlds}/${s6.worlds}, upper 95% ${s6.upper95.toFixed(3)} against ${FALSE_ARCH_BOUND}; calibrationFailed ${s6.calibrationFailed}).`);
  else if (!s6.attainable) notes.push(`S6: UNDERPOWERED: ${s6.reason}; observed ${s6.falseWorlds} false worlds of ${s6.worlds}.`);
  if (!s6.archsInjected) notes.push("S6: no arch engine supplied: the arch part of the false-world count is a typed gap (kinds only).");
  for (const g of gaps.slice(0, 20)) notes.push(`gap: ${g.feature ?? g.element ?? g.group ?? "*"} ${g.reason} ${g.denominator ? `(${g.denominator.have} of ${g.denominator.need})` : ""}`);
  const allPass = cards.filter((c) => /^S[1-9]/.test(c.id) && c.id !== "S2b" && c.id !== "S5").every((c) => c.pass || (c.id === "S7" && s7.audit.effectiveN < 2 && c.status !== "INSTRUMENT_FAILED"));
  const trust = allPass && s6.status === "SURVIVES" && s8.status === "SCORED" ? "cleared" : "checked";
  // ── the frame the report is stamped with ──
  let frame = null;
  try {
    const { declareFrame } = await import("../../organs/frame.js");
    const r = await declareFrame({ organs: { mirror: `eval/barker/self.mjs@${PREREG_SHA.slice(0, 12)}`, inducer: rt.usedReference ? "referenceInducer(self.mjs)" : "ctx.induce" }, givers: { profiles: ctx.givers?.profiles ?? "SystemProfile@1 via eval/barker/profiles.mjs", answerKeys: ctx.givers?.answerKeys ?? (rt.profiles[0]?.labels?.giver ?? "profile author, Glottolog-level classification") }, numbers: { alpha: ALPHA, seed: rt.seed, B: sc.B, R: sc.R, P: sc.P, perms: sc.perms, W: sc.W, powerReps: sc.powerReps, systems: rt.profiles.length, lineages: lin, branches: br } });
    frame = r.frame ?? r;
  } catch (e) { notes.push(`frame: not stamped (${e.message})`); }
  const map = { frame: frame?.id ?? null, systems: rt.profiles.map((p) => p.id), lineages: lin, branches: br, groups: grs.map((g) => ({ group: g.group, features: g.spec.blocks.length, effectiveDimension: g.pr, elements: g.elements.length })), inducer: rt.usedReference ? "referenceInducer" : "ctx.induce", elements,
    rivals: s2b.s5, heldOut: s2b.s2b, decomposition: s3.rows, flips: s4.rows.map((r) => ({ element: r.element, flips: r.flips })), audit: s7.audit, plural: s9.rows.map((r) => ({ element: r.element, status: r.status, broken: r.brokenFrames })), prospective: { status: s8.status, rows: s8.rows }, falseWorlds: { rate: s6.rate, upper95: s6.upper95, holds: s6.holds }, scale: sc.name, truncated };
  return { map, survives: ids("SURVIVES"), weakened: ids("WEAKENED"), refuted: ids("REFUTED"), underpowered: ids("UNDERPOWERED"), notRun: allElements.length ? [] : ["(no Level-S element reported)"], notes, cards, trust, trustReason: trust === "cleared" ? "S1-S8 passed and S6's bound holds" : "checked until S1-S8 pass (BARKER.md 8.4); this module only suggests", frame, preregSha: PREREG_SHA, gaps };
}

/** A convenience context from the sibling modules, when they exist: profiles.mjs::loadProfiles and organs/barker.js. */
export async function defaultContext({ profilesDir = "/private/tmp/claude-501/barker/out", scale = "smoke", archs = null, prospective = null } = {}) {
  let organ = null, prof = null; const missing = [];
  try { organ = await import("../../organs/barker.js"); } catch { missing.push("organs/barker.js"); }
  try { prof = await import("./profiles.mjs"); } catch { missing.push("eval/barker/profiles.mjs"); }
  if (!prof?.loadProfiles) throw Object.assign(new Error(`dependency_missing: ${["eval/barker/profiles.mjs::loadProfiles", ...missing].join(", ")}`), { code: "dependency_missing" });
  const profiles = await prof.loadProfiles(profilesDir);
  return { profiles, scale, archs, prospective, induce: organ?.induceSystemKinds ? inducerFromOrgan(organ) : undefined, organMissing: !organ };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
  const ctx = await defaultContext({ profilesDir: arg("--profiles-dir", undefined), scale: arg("--scale", "smoke") });
  const r = await runSelf(ctx);
  console.log(JSON.stringify({ survives: r.survives, weakened: r.weakened, refuted: r.refuted, underpowered: r.underpowered, trust: r.trust, notes: r.notes }, null, 2));
}
