// confirm-relatedness-romance-set/confirm.mjs — INDEPENDENT CONFIRMATION of candidate rule "relatedness-romance-set" on UD TRAIN text that no earlier test of this lens used.
//   NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs <cell>      cell = <P|D|XP|XD>-<A|B|C>-<FIRST|LATER>-<BOTH|LEFT>   e.g. P-C-FIRST-BOTH      or   E1-<A|B|C>
//   (never pass "run" as the first argument: name-company.mjs would start its main())
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file, before any AUC was computed on any train window) ═══════════════════════════════════════════
// RULE UNDER TEST (verbatim essentials). If the stream is Romance (cat fra ita por spa; glg, ron borderline) and the company profile (frequency-rank bins of 2 left + 2 right neighbours, BOTH arm) is
//   learned on 3 OTHER Romance languages (100 matched pairs each), proper nouns at their FIRST mention are separated from position/length/frequency-matched open-class words at AUC 0.66-0.71, about +0.08 above
//   a profile learned on 3 non-Romance languages. passIf: >= 70% of eligible Romance targets (>= 3) have AUC >= 0.60, above their pair-flip permutation q95, and >= 0.05 above an equalised set of 3
//   non-Romance donors; lower language-bootstrap bound of the mean difference > 0; mean POSITION-arm control in [0.45, 0.55]; mean shuffled-sentence-target AUC <= 0.55. failIf: < 50% of eligible targets pass
//   or mean difference < 0.03, or the position control leaves [0.45, 0.55], or the shuffled-target AUC exceeds 0.55.
// DISCLOSURE (what the author had seen). The rule JSON including its dev and test numbers (test FIRST-BOTH form A: cat .678 fra .685 ita .662 por .669 spa .710 glg .587 ron .594, same .655 vs other .573;
//   form B 4/7), the scoper's code (lib.mjs groups.mjs analysis.mjs cache.mjs confirm.mjs, imported here UNCHANGED and hash-checked against results/discovery-selection.json) and confirm-rules.json per-language numbers.
//   The scoper's confirmation already READ UD test.conllu for this very rule (the task text calls test untouched; for THIS rule it is spent), so test.conllu is NOT used here. NOT seen: any AUC of any train window,
//   of any es_gsd / pt_bosque / gl_treegal window. SEEN (counts only, before any AUC): matched-pair counts of every window (e.g. ita window A has 6 FIRST pairs, all other Romance windows >= 277), and the window
//   boundaries. DESIGN CHANGE after seeing counts only: window set C (spread chunks) was added because ita window A (a contiguous 30k-token stretch of ISDT) holds almost no names; A and B stay as built. Other lenses
//   (R1/R2 fwc32 confirmations) read 20k-token windows of the same tb train files for DIFFERENT rules; I have read none of their results; overlap with my windows is not excluded.
// DATA. Fresh text = TRAIN splits (never opened by this lens): /private/tmp/claude-501/tb/<stem>/train.conllu (the same treebanks as ud-eval: cat+spa AnCora, fra GSD, ita ISDT, por GSD, glg CTG, ron RRT, and every
//   other roster language; kor = Korean-GSD), sentences identical to a ud-eval dev/test sentence removed. Three disjoint-or-independent sample sets of 30,000 non-PUNCT word units per language: A = one contiguous
//   window, B = a second contiguous window disjoint from A, C = ten chunks of 3,000 tokens, one per tenth of the file (independent draw, may overlap A/B). Languages whose file is shorter get the whole file (and no B).
//   CROSS-TREEBANK targets (different annotators and text, never in any earlier test): spaGSD (UD Spanish-GSD train), porBOS (Portuguese-Bosque train), glgTG (Galician-TreeGal train; 13.8k tokens, so A=C, no B).
//   Pairs: name-company pairsOf under NAME_COMPANY_PAIRBLOCK=1, <= 600 pairs per language and stratum; eligibility as the scoper's: target >= 60 pairs, donor >= 100 pairs. Gold (UPOS PROPN versus NOUN/VERB/ADJ) only labels.
//   Observables: rank-bin slots of left-1, left-2, right-1, right-2 (log2 frequency rank within the stream), no capitals, POS, strings, lists or speaker field. A ridge-logistic probe is an EXISTENCE test, not a rule.
// PROCEDURE. Every cell uses the scoper's frozen setsFor/groupTable unchanged: K=3 donors x 100 seeded pairs, 20 draws, same-genus set a versus different-genus set e, pair-flip null q95 (first draw, B=200).
//   Cells (stratum-arm FIRST-BOTH unless stated): P-{A,B,C} = donors are the fresh train windows of the same set (everything fresh); D-{A,B,C} = donors are the scoper's DEV rows (the deployment form), target fresh;
//   P-{A,B,C}-LATER-BOTH and P-{A,B,C}-FIRST-LEFT (the rule's secondary scope); XP/XD-{A,B,C} = cross-treebank targets. Primary targets = cat fra ita por spa; glg and ron are reported as secondary (the rule already
//   excludes them). A target is "thin" and counted out when its window has < 60 pairs (rule scope: targets with < 60 pairs are out of scope).
// PASS (per target) = same AUC >= 0.60 and > its own q95 and same - different-genus >= 0.05 (scoper's groupTable). CELL VERDICT (function verdictOf in confirm-lib.mjs): UNDERPOWERED if < 3 eligible primary targets;
//   VOID if mean POSITION control of set a is outside [0.45, 0.55] or mean shuffled-sentence-target AUC > 0.55 or the sham-probe mean (donor labels swapped inside a random half of the pairs) is outside [0.45, 0.55]
//   or the donor-shuffled mean (donors' sentences shuffled, target real) > 0.55; else HOLDS if >= 70% pass and the lower bound of the language bootstrap of (same - other) > 0; else FAILS if < 50% pass or mean
//   (same - other) < 0.03; else PARTIALLY HOLDS.
// TIGHTENINGS relative to the rule (allowed; none loosened): (1) three independent fresh sample sets instead of one test; (2) the sham probe and donor-shuffled controls (rule has only position + shuffled-target);
//   (3) the deployment form D must not FAIL; (4) test.conllu is excluded (spent for this rule).
// OVERALL VERDICT (summarize.mjs). Let P = verdicts of P-A, P-B, P-C (FIRST-BOTH, primary scope; UNDERPOWERED cells are dropped). CONFIRMED iff >= 2 of the usable P cells HOLD, no usable P cell is FAILS or VOID,
//   and no D cell is FAILS or VOID. NOT_CONFIRMED iff >= 2 usable P cells are FAILS/VOID, or none HOLDS and none PARTIALLY HOLDS. Otherwise PARTIAL, and the scope is stated as the languages that pass in >= 2/3 of the
//   P cells in which they are eligible. Secondary strata, glg/ron, cross-treebank cells and E1 never change the verdict; they are reported as scope.
// BLIND PREDICTIONS (point; plausible range). P-cells, primary five: mean same-genus AUC 0.65 (0.62-0.69); mean different-genus AUC 0.575 (0.55-0.60); mean difference +0.075 (0.04-0.10); 4 of 5 targets pass per
//   set (fra and cat are the likely failures, as in form B on test); P(>= 2 of 3 P cells HOLD) = 0.65. Position control 0.50 (0.48-0.52), shuffled-target 0.525 (0.50-0.545), sham 0.50 (0.48-0.52), donor-shuffled
//   0.52 (0.50-0.545). glg and ron: each fails (AUC < 0.60 or margin < 0.05) in >= 2 of 3 P sets, p = 0.75. D cells: same AUC about 0.01 higher than P. noTwin (cat without spa, spa without cat): difference stays
//   >= 0.04, drops by 0 to 0.03. LATER-BOTH: same 0.62 (0.58-0.66), different 0.53, >= 3 of 5 pass in a set with p = 0.5. FIRST-LEFT: same 0.62, 3 of 5 pass. Cross-treebank: spaGSD same 0.63 (0.58-0.68) with
//   difference +0.04 (it is lower than the AnCora spa because the annotators and text differ), porBOS 0.64 with +0.05, glgTG fails. E1 (GSD-family control, targets fra por spaGSD): genealogy-beyond-team
//   (r - o) mean +0.05 (0.02-0.08) and team (g - o) mean +0.01 (-0.02 to +0.04), i.e. the Romance bonus is mostly genealogy or genre of the Romance treebanks, not the GSD team.
// WHAT WOULD FALSIFY. >= 2 usable P cells FAILS or VOID; or the in-scope difference is under 0.03 on fresh train text; or the bonus vanishes with noTwin or E1 shows team >= genealogy-beyond-team.
// NOT TESTABLE HERE. Chat register (every ubuntu-es / ubuntu-it IRC day was used by the chat-scope lens; gold there is nick-based, not PROPN); genre-versus-relatedness (UD genre cannot be separated from genealogy);
//   any Romance language outside the roster (no other UD Romance treebanks on disk).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import { fileURLToPath } from "node:url";
import { headerHash } from "../family-vs-relatedness/lib.mjs";
import { runCell } from "./confirm-run.mjs";
import { runE1 } from "./confirm-e1.mjs";

const SELF = fileURLToPath(import.meta.url), id = process.argv[2];
if (!id || id === "run") throw new Error("usage: NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs <cell>   (cell = P-A-FIRST-BOTH ... | E1-A)");
const hh = headerHash(SELF);
if (id.startsWith("E1-")) runE1(id.slice(3), hh); else runCell(id, hh);
