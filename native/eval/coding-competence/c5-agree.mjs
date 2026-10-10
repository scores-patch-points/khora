// c5-agree.mjs: C5 AGREEMENT, the coding-competence rung "agreement across representations" (ladder R5) for
// PROGRAMMING LANGUAGES: the same algorithm written in many languages must be read as the same structure.
// Lovelace (Coding Capability Circle): the engine does what it is ordered to perform. Reading code is recovering what
// the text ORDERS (declarations, calls), and the order an algorithm states does not depend on the language it is
// spelled in. This file is an INSTRUMENT. It scores readers; it never calls a model and it is not a reader.
//
//   node eval/coding-competence/c5-agree.mjs --language python [--split dev|test] [--limit N] [--no-authority]
//   node eval/coding-competence/c5-agree.mjs --language all|a,b,c   (measureAll: one pass over every language)
//   prints ONE JSON line and writes /private/tmp/claude-501/coding-competence/c5-<language>-<split>.json
//   (measureAll: c5-all-<split>.json)
//   import { RUNG, measure, measureAll } from "./c5-agree.mjs";   // measure({ language, split = "dev", limit = null })
//   measureAll({ languages, split }) -> { perLanguage: {lang: result}, pairs: [...], notes: [...] }
//   --limit N = use only the first N of the 12 tasks (a DEV smoke-test device; refused with --split test).
//
// ===================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written BEFORE any program of the suite was authored and BEFORE this file
// was run against any program. Nothing below is tuned after a result. Failures are reported as failures. Amendments
// are append-only, dated, and sit at the bottom of this comment.
// ===================================================================================================================
//
// DISCLOSURE (what was looked at before this header). Only plumbing: the headers of c3-declared.mjs, c4-edges.mjs,
// run.mjs (its c5 contract: measureAll -> {perLanguage, pairs, notes}); the source of adapters/code/edges.js and of
// adapters/text/code-structure.js; gold.mjs and `gold.py languages|table`; and ONE API-shape probe of three TOY snippets
// (authored; a class plus a recursive function in python, java and go; none of them is one of the 12 tasks) through
// readEdges, parseDeclarations+callEdges and gold. The probe showed OUTPUT SHAPES only (readEdges declared[] lists some
// java methods twice; callEdges emits class-level callers; gold defs/calls). No program of the suite existed and no
// reader was run on any of them.
//
// CLAIM. A reader driven by received priors recovers, for the same algorithm written in different languages, the same
// DECLARED ENTITIES (as normalised identifier sub-words) and the same CALL STRUCTURE (the call multigraph among those
// entities, shape-wise and label-wise), much more than it does for different algorithms in different languages.
//
// WHAT IS MEASURED, AND WHAT IT IS NOT (disclosed, binding). The suite is AUTHORED by the model (label: authored,
// author: model) from ONE declared decomposition per task (the TASK SPEC below: entity names as English sub-words and the
// call structure). Every language therefore states the same decomposition BY CONSTRUCTION. Agreement among programs is
// high by authorship and is NOT the finding. The finding is whether a READER recovers that invariant structure through
// each language's own syntax (class bodies, method receivers, struct typedefs, paren-less calls, prefix forms ...), or
// loses it. The authority arm (tree-sitter gold, below) says whether the suite itself carries the invariant; the reader
// arms say whether the reader does. The suite is one author's: it licenses "the reader recovers the invariant
// decomposition", never "the reader generalises over independent authors" (that needs held-out tasks: see SPLITS).
//
// ---- TASK SPEC (12 tasks; names are English sub-words, spelled in each language's own casing convention) -----------
//  id              entities (declared names)                         call sites among them (caller -> callee xN)
//  fibonacci       fibonacci                                         fibonacci->fibonacci x2
//  gcd             gcd                                               gcd->gcd x1
//  binary_search   binary_search, search_range                       binary_search->search_range x1, search_range->search_range x2
//  quicksort       quicksort, partition                              quicksort->partition x1, quicksort->quicksort x2
//  merge_sort      merge_sort, merge                                 merge_sort->merge x1, merge_sort->merge_sort x2
//  factorial       factorial                                         factorial->factorial x1
//  palindrome      is_palindrome, normalize, reverse_text            is_palindrome->normalize x1, is_palindrome->reverse_text x1
//  word_count      count_words, split_words                          count_words->split_words x1
//  fizzbuzz        fizz_buzz, is_divisible                           fizz_buzz->is_divisible x3
//  linked_list     Node, reverse_list, to_array                      reverse_list->reverse_list x1
//  stack           Stack, push, pop, peek, is_empty                  pop->is_empty x1, peek->is_empty x1
//  tree_traversal  TreeNode, inorder, preorder                       inorder->inorder x2, preorder->preorder x2
// Decomposition rules for authors (frozen): quicksort is Lomuto in place over (items, low, high) in languages with
// mutable arrays (functional languages: partition returns the two sides, quicksort calls itself on each); merge_sort
// returns a sorted sequence (C: sorts a range of an array with a scratch array, same call structure); binary_search is
// the recursive helper search_range(items, target, low, high); reverse_list is the recursive form reverse_list(node,
// previous); to_array, split_words, normalize and reverse_text are iterative; the stack guards pop and peek with
// is_empty; constructors are the language's idiomatic ones and are NOT special-cased (they are declared entities the
// reader may or may not see; this lowers the name channel for stack, linked_list and tree_traversal, by design).
// Drivers: statements at top level in scripting languages, `main` elsewhere; node/stack/tree instances are built in the
// driver, never inside a spec entity, so a constructor call is never a spec edge. Canonical output (every executed
// program must print exactly this, trailing whitespace ignored): see TASKS[].out below. Booleans print as true/false.
// Programs may use the standard library for primitives (append, split, sort of the driver's print), never for the spec
// entity's own algorithm.
// AUTHORING DISCIPLINE. A program may be edited after the first validation only to (a) make it parse, (b) make it print
// the canonical output, or (c) repair a slip against the TASK SPEC; every edit is logged below under AMENDMENTS. A program
// is NEVER edited in response to what a reader or the agreement score did with it.
// VALIDATION (c5-tasks/validate.mjs -> c5-tasks/MANIFEST.json). Languages with a local toolchain EXECUTE every program
// and keep only those whose stdout equals the canonical output; every other language's programs are validated by
// tree-sitter parse (zero ERROR/MISSING nodes) and carry executed:false. A program the manifest does not vouch for (no
// entry, a sha256 that no longer matches, a parse error, an output mismatch) is EXCLUDED and counted as a typed gap.
// A missing manifest makes every verdict pass:null (an unvalidated fixture is not evidence).
// NOT APPLICABLE (typed, never a silent pass): html css json yaml toml markdown (declarative markup/data states no
// procedure), latex (document markup), sql (a recursive CTE expresses 3 of the 12 tasks: below the 8-task floor, and
// procedural dialects hide the body in a string). c_sharp (in the corpus, not in this task's language list) and any
// other language with no authored bundle is pass:null with a gap, never "good".
//
// ---- SYSTEMS (arms; the headline is the first) ----------------------------------------------------------------------
//  edges     adapters/code/edges.js readEdges with the received keyword prior (python, javascript, c, go, ruby, java; the
//            only CAUSAL reader, audited below). declared[] = entities, calls[] = per call site (caller, callee).
//  existing  adapters/text/code-structure.js parseDeclarations + callEdges, as shipped (regex recipes: python javascript
//            typescript tsx c go; count expanded to call sites). NOT causal (whole-file lookahead), so it never gates; it
//            is reported as an arm. A language with no recipe is a typed gap for this arm.
//  gold      tree-sitter via gold.mjs: defs of CORE kinds (gold.mjs CORE_DEF_KINDS) = entities; calls attributed to the
//            innermost enclosing def of kind function|method|class|interface|enum|module (C-family: the def is the
//            declarator, so its extent is extended over the following brace body, from gold's own punctuation tokens).
//            AUTHORITY ARM: not a khora reader. It says whether the authored suite carries the invariant in each language
//            and is reported in details.authority; it never gives a khora language a pass.
// A language with no `edges` reader has pass:null and a typed gap (reader_absent); its authority/existing arms still
// report. Mixed-system pairs are never formed: a pair is always two readings by the SAME system.
//
// ---- READING -> ALGORITHMIC GRAPH -----------------------------------------------------------------------------------
// A reading is {names[], calls[{caller,callee}]} (names reduced to the final segment after the last . :: # / ->).
// BOILERPLATE (derived, not listed): names a system declares in >= BOILER_SHARE (0.75) of a language's >= 8 non-empty
// readings carry no task information in that language (main, Main, a wrapper class): removed. 0.75 because no spec
// entity occurs in more than 3 of 12 tasks (Node/TreeNode share one sub-word), so the cut has 6x headroom, and it
// tolerates a reader that misses the entry point in up to 3 programs. ALGORITHMIC ENTITIES A = declared names minus
// boilerplate. ALGORITHMIC EDGES = call sites whose caller and callee are both in A (calls to the standard library, and
// calls made by the driver, are outside A and so are identical in every language by construction).
// SUB-WORDS: final segment; strip trailing ?!=; split on non-alphanumerics, camel/Pascal boundaries and acronym
// boundaries; lowercase (is_empty, isEmpty, IsEmpty, is-empty -> {is, empty}; quicksort stays one word).
// GRAPH of a program: word set W = union of sub-words of A; call multigraph over A with a multiplicity per (caller,
// callee) = number of call sites; R = recursive call sites (caller == callee), N = non-recursive call sites; the
// ISOMORPHISM CLASS of the multigraph restricted to nodes that have at least one edge (isolated entities belong to the
// name channel, not the call shape), as an exact canonical form (node relabelling, multiplicities respected).
//
// ---- PAIR SCORE (programs a, b of the SAME task in two languages, same system) -------------------------------------
//   J = |W_a ^ W_b| / |W_a v W_b|           (Jaccard of the sub-word sets; both empty = 0: an empty reading agrees about nothing)
//   D = 2(min(R_a,R_b) + min(N_a,N_b)) / (R_a+R_b+N_a+N_b)    (Dice over the recursive / non-recursive call-site counts; no calls on
//        either side = 1: identical empty shapes)
//   I = 1 if the isomorphism classes are equal else 0
//   S = (D + I)/2          the call-shape channel
//   s = (J + S)/2          THE SCORE (names and call shape weigh the same; declared, not tuned)
//   L = Dice over the LABELLED call multiset (caller sub-word label -> callee sub-word label, multiplicity-aware; both
//       empty = 1). DIAGNOSTIC ONLY (not in s, not gating): it is the channel that checks that quicksort calls partition
//       and itself, not merely that two functions and three edges exist. J and S are blind to a swap of which name owns
//       which edge, and the `shuffledLabels` control below shows exactly that blind spot.
//
// ---- AGGREGATION AND CONTROLS (per language X under test, system sigma) ---------------------------------------------
// Tasks T = the tasks whose X program is kept and read non-empty; partners P = other languages with >= 8 kept, non-empty
// readings by sigma (for `edges`: the other five dev languages; for `gold`: every other authored language).
// M[u][t] = mean over partners p of s(X's program of task u, p's program of task t).
// score   = mean over t of M[t][t]       (same-task agreement)
// control = max over the control arms below of the arm's same-task score (the strongest control, per the module contract)
// margin  = score - control
// CONTROL ARMS (all built to fail; the statistic must MOVE under each; arms 2-4 are REPS = 25 seeded replicate means):
//   1 taskPair            task u of X against task t != u of each partner (A in X vs B in Y): mean of the off-diagonal of M
//   2 shuffledIdentifiers every declared name of X's program is replaced by a distinct name drawn at random from the
//                         names of OTHER X programs (call topology kept): destroys the name channel only
//   3 shuffledGraphs      X's program keeps its names but takes the call structure of a derangement-chosen other X program:
//                         destroys the shape channel only
//   4 noReading           X's readings are all empty: an instrument that credits an empty reading is broken
//   (diagnostic, not a control arm: shuffledLabels permutes names WITHIN each X program, keeping topology; J and S are
//    blind to it by construction, L is not: reported as the declared blind spot of the composite)
// PERMUTATION TEST (the pass statistic): H0 = the task labels of X's programs carry no information about the partners'
// programs. Statistic(pi) = mean_t M[pi(t)][t]; pi uniform over all permutations of T (PERMS = 20000 seeded draws,
// identity included); p = (1 + #{pi: stat(pi) >= observed}) / (PERMS + 1), one-sided. The p-value is per language.
// RETRIEVAL (diagnostic): for each (X program t, partner p), the same-task partner program ranked among p's programs by s;
// top1 = share ranked first (ties share), chance = mean 1/|candidates|.
// CAUSALITY (system edges only): for every X program at cuts 25/50/75 percent, read the prefix with final:false; a prefix
// declared name or call site absent from the full-file reading is a RETRACTION. Gate: zero retractions.
//
// ---- PASS RULE (per language; system edges is the headline) -----------------------------------------------------------
// PASS iff ALL of:
//   (a) COVERAGE: |T| >= MIN_TASKS (8) and |P| >= MIN_PARTNERS (3), else pass:null (too few, NOT a fail);
//   (b) permutation p <= 0.05 (ALPHA, given by the task);
//   (c) score - taskPair >= MIN_MARGIN (0.10, the declared minimal effect, composite points);
//   (d) LICENCE, all of: names move (shuffledIdentifiers J <= 0.5 x real J); shape moves (real S - shuffledGraphs S >= 0.10);
//       empty reading earns nothing (noReading score <= 0.05 and |noReading same - noReading cross| <= 0.02). A failed
//       licence voids the pass (pass=false, licence_failed);
//   (e) CAUSALITY: zero retractions (system edges);
//   (f) the fixture is validated (manifest present and vouches for the programs used).
// Absolute score is NOT a pass condition (the number is there to be read). Headline result: score, control, margin as
// above; pass = rule; details carry every channel, per-task and per-partner tables, the existing and gold arms, the
// reader-vs-gold and reader-vs-spec agreement, the licence and the causality audit.
// A system arm other than the headline reports `pass_rule_met` by the same rule (causality item (e) not applicable to
// non-causal arms: they never gate).
//
// ---- SPLITS (rule 9) ----------------------------------------------------------------------------------------------------
// The suite is authored, not natural, and has no corpus split. DEV = the 12 tasks above (the model wrote and
// validated them while looking at them). TEST = a RESERVED set of 12 different tasks, to be authored by another hand
// AFTER the reader and this instrument are frozen: sum_list, reverse_string, bubble_sort, is_prime, collatz_steps,
// is_anagram, to_binary, queue, find_max, count_vowels, hanoi, pascal_row. Until c5-tasks/test/<language>.c5 bundles
// exist, split "test" answers pass:null with the typed gap no_held_out_tasks (never a DEV result relabelled as TEST);
// when they exist a TEST read is recorded in the ledger (C5_LEDGER, default
// /private/tmp/claude-501/coding-competence/test-ledger.json, key c5:<language>) and refused the second time. This
// agent ran DEV only, and only the six dev languages (python javascript c go ruby java) were looked at against any reader.
//
// ---- PREDICTIONS (made blind, 2026-10-05, before any run) ---------------------------------------------------------------
//  P1 suite: every program of a language with a local toolchain (python javascript typescript tsx ruby c cpp java objc
//     swift bash perl fortran, those that actually exist here) prints the canonical output after at most trivial authoring
//     fixes; >= 95% of all authored programs parse in tree-sitter with zero ERROR/MISSING nodes.
//  P2 authority arm (gold): same-task score >= 0.70 for the mean language; >= 80% of the authority-measured languages pass
//     the rule; the weakest are expected among lean, cobol, verilog, swift, elixir, the Lisps (calls/defs conventions of
//     the grammars), i.e. a failure there is a statement about gold's call model, not about khora.
//  P3 edges reader on the six dev languages, composite: score 0.80-0.97 each; taskPair control 0.10-0.28; margin to the
//     strongest control (shuffledGraphs expected highest, ~0.55-0.70) >= 0.20; permutation p <= 0.001 each; ALL SIX PASS.
//     Least confident: java and c (typedef struct / duplicate method declarations / forced wrapper entities), then ruby.
//     Channels: J same 0.80-1.00 (constructor-forced names cost stack, linked_list, tree_traversal), S same >= 0.85,
//     L same >= 0.75; retrieval top1 >= 0.90 against chance ~0.083.
//  P4 licence: shuffledIdentifiers J <= 0.15 everywhere (so the J licence holds); shuffledGraphs S <= 0.50 (shape licence
//     holds); noReading score 0.00; shuffledLabels leaves s unchanged to 1e-9 and drops L (declared blind spot, shown).
//  P5 existing arm: python javascript c go measured; ruby and java typed gaps (no recipe); same-task score 0.50-0.85,
//     BELOW the edges arm in each shared language (class-level callers and regex misses distort the shape); >= 3 of 4
//     meet the rule.
//  P6 causality: zero retractions in all six dev languages.
//  P7 reader vs spec (a fidelity check independent of cross-language agreement): edges J vs spec >= 0.85 mean; the declared
//     constructors/typedefs account for most of the loss.
//  P8 languages with no edges reader (44 of 50 authored) are pass:null with reader_absent; the verdict about them is the
//     authority arm only. typescript and tsx have no CAUSAL reader (existing arm only).
//
// ---- LIMITS (disclosed in advance) ----------------------------------------------------------------------------------------
// One author, one decomposition; agreement by construction in the name channel; constructor/ boilerplate handling is a
// declared derived rule, not a guarantee; call attribution depends on each reader's/grammar's notion of "innermost
// enclosing def"; JS/TS/TSX/Svelte/Vue and C/C++/ObjC pairs in the authority arm share syntax and agree more for it;
// the 12-task permutation test is exact in spirit but the partners are the same six programs for every task (not
// independent); small-n: n = tasks x partners pairs, correlated within task.
//
// ===================================================================================================================
// AMENDMENTS AND RUN LOG (append only; never edit the sections above)
// ===================================================================================================================
// A1 (2026-10-06, session 2). WRITTEN BEFORE the six remaining bundles were authored, before c5-tasks/validate.mjs
//    existed, and before any reader (edges, existing) or the gold arm was run on any bundle in this session.
//  PROVENANCE OF THIS FILE. Everything above this line, the instrument below it and c5-tasks/dev/{python,javascript}.c5
//    were written by an earlier session of the same task (file mtimes 2026-10-05 16:14 and 17:14). That session left no
//    run log, no MANIFEST.json, no validate.mjs, no test and no c5-*-dev.json result under
//    /private/tmp/claude-501/coding-competence/ (checked by ls). Whether it ran the instrument in memory on its two
//    bundles cannot be shown from the files, so that possibility is DISCLOSED. Session 2 read this whole file and both
//    bundles, changed nothing above this line and ran only toolchain probes (--version, a 3-line TypeScript smoke of node's
//    type stripping, `gold.py languages`) before writing this amendment.
//  SCOPE. This session's task lists EIGHT languages: python javascript typescript java c go rust ruby. The authored
//    suite is exactly those 8 x 12 = 96 programs. The 50-language list above stays as the vocabulary of typed gaps: a
//    language outside the 8 answers no_program_authored (unmeasured, never good). P2 and P8 are RESTATED for 8 languages
//    below (P2', P8'); every other prediction stands as written. DEV_LANGUAGES (python javascript c go ruby java) are the
//    only languages any reader is run against; typescript and rust are authored and validated, and only the existing arm
//    (typescript) and the authority arm (both) can read them. NO TEST run: split "test" keeps answering pass:null
//    no_held_out_tasks.
//  TOOLCHAINS (probed 2026-10-06). python 3.14.7; node 24.10 (javascript, and typescript through node's type stripping,
//    so erasable TypeScript syntax only); ruby 2.6.10 (so no syntax newer than 2.6); Apple clang 15 as gcc (-std=c11);
//    OpenJDK 25.0.2 at /opt/homebrew/opt/openjdk/bin (keg-only: /usr/bin/javac is a macOS stub that fails; java is
//    executed through the explicit path, programs compiled as Main.java). NO go and NO rustc on this machine: the 24 go
//    and rust programs are validated by tree-sitter parse only and carry executed:false (they were checked by hand for type
//    errors, which is a human check and is not recorded as execution).
//  AUTHORING DECISIONS frozen before writing the six bundles (a program is later edited ONLY under AUTHORING DISCIPLINE):
//   * spec entities carry exactly the spec sub-words and NO other declared helper, beyond what the language forces:
//     java a non-public wrapper `class Main` with `main`; c, go, rust `main`; explicit idiomatic constructors where the
//     language has them (python __init__, javascript/typescript constructor, ruby initialize, java Node/TreeNode/Stack,
//     rust Stack::new); no constructor in c and go. Whatever the spec leaves to the driver (sorting the printed word
//     counts, building nodes) is written INLINE in main, never as a helper function.
//   * a body never calls a library method that bears the name of the entity it is in (no self.items.push inside push, no
//     items.pop inside pop, no items.is_empty inside is_empty): such a call is textually a recursive edge.
//   * ruby predicates keep the spec sub-words and end in `?` (is_empty?, is_palindrome?, is_divisible?); the sub-word
//     normaliser strips the sigil, which is what it is for. A ruby local never shadows a Kernel method (no `p`).
//   * casing: camelCase java go javascript typescript; snake_case python c rust ruby; types in PascalCase everywhere.
//   * typescript is the javascript decomposition with type annotations; c uses `typedef struct Name { ... } Name;` and
//     functions take the struct pointer first; go uses pointer receivers and unexported names.
//  PREDICTIONS RESTATED FOR THE 8-LANGUAGE SCOPE (blind, before any run):
//   P1' suite: python javascript typescript ruby c java: every one of the 72 programs prints the canonical output after at
//      most trivial authoring fixes (the first execution may expose slips: each fix is logged below); go and rust: all 24
//      programs parse in tree-sitter with zero ERROR/MISSING nodes; all 96 programs parse.
//   P2' authority arm (gold): every one of the 8 languages is measured; same-task score >= 0.70 for the mean language and
//      >= 6 of 8 languages meet the rule; the weakest are expected among java (forced wrapper class) c and rust. A failure
//      there is a statement about gold's call model or the suite, not about khora.
//   P8' typescript has no causal reader: pass:null reader_absent, existing arm + gold only; rust has neither reader:
//      pass:null reader_absent, gold only. Languages outside the 8: no_program_authored.
//  FAILURE MODES NAMED IN ADVANCE (if one appears it is a RESULT, not a reason to edit a program): java declared[] lists
//    some methods twice; c typedef-struct and callers are read by a lexer, not a parser; ruby `is_empty?` paren-less calls;
//    go method receivers; any reader that credits a class-level caller for a call made in a method body.
//  RUN LOG: (none yet at the time of this amendment)
// A2 (2026-10-06, session 2). Instrument code fix BEFORE any reader run: tests/coding-c5.test.js showed that when a language
//    has no analysable partner (for example only one bundle is authored) measure() crashed into a generic `error` gap.
//    It now returns the typed gap no_analysable_readings with pass:null. No header rule, threshold or metric changed.
// A2b (2026-10-06, session 2). Message-only: the language_not_in_c5_list detail no longer calls the 50-language vocabulary "this task's
//    list" (this session's task lists 8). No logic changed.
// A3 (2026-10-06, session 2). SUITE VALIDATION (c5-tasks/validate.mjs, no reader run): 96 of 96 programs parse with zero
//    ERROR/MISSING nodes; the 72 programs of python javascript typescript ruby c java were executed and ALL printed the
//    canonical output on the FIRST execution (no authoring fix was needed: P1' holds for execution); go and rust (24
//    programs) are parse-only, executed:false. The 12 typescript programs also pass `deno check` (a real type check; deno
//    2.9.5), which is a stronger check than node's type stripping. Go and rust were checked by hand only.
// A4 (2026-10-06, session 2). DEV RUN LOG, appended after the FIRST reader run on the suite (suite, header, rule and
//    instrument frozen before it; tests/coding-c5.test.js: 19 tests incl. perfect / deranged / degenerate / licence /
//    end-to-end deranged control through the real readers, all pass). `--language <8 languages>`, 12 tasks, ~0.6 s each,
//    byte-identical on rerun. NEVER run on TEST (no c5-tasks/test, no ledger entry exists).
//    HEADLINE (edges reader, 5 partners = the other dev languages): score / taskPair / shuffledIdentifiers / shuffledGraphs /
//      noReading / margin to strongest control / p / retractions, J S L same-task, top1 (chance 0.083)
//      python      0.967 0.124 0.505 0.580 0 +0.387 5e-5 0  .934 1 1  1.0   PASS
//      javascript  0.967 0.124 0.506 0.589 0 +0.378 5e-5 0  .934 1 1  1.0   PASS
//      ruby        0.967 0.124 0.504 0.581 0 +0.386 5e-5 0  .934 1 1  1.0   PASS
//      c           0.955 0.124 0.505 0.571 0 +0.384 5e-5 0  .910 1 1  1.0   PASS
//      go          0.980 0.125 0.505 0.604 0 +0.376 5e-5 0  .960 1 1  1.0   PASS
//      java        0.980 0.125 0.507 0.605 0 +0.375 5e-5 0  .960 1 1  1.0   PASS
//      typescript, rust: pass:null reader_absent (typed gap; unmeasured is not good).
//      p = 5e-5 is the FLOOR of a 20000-draw test (1/(PERMS+1)): all six are at the floor, the test has no finer resolution.
//    WHERE THE LOSS IS: call structure is recovered perfectly (S = 1 and L = 1 in every dev language, equal to gold). All of
//      the name-channel loss is in linked_list, stack and tree_traversal (J .67-.88): python/javascript/ruby declare the
//      constructor (__init__ / constructor / initialize) that the spec does not name, and the c reader does not declare the
//      typedef struct (tree_traversal J .44 against the other languages, .50 against the spec); go and java match the
//      spec exactly (J = 1 against spec). On the first 8 tasks (no class in them) every language scores 1.000 (--limit 8).
//    AUTHORITY ARM (gold, tree-sitter, 7 partners): python .972 javascript .990 typescript .990 java .990 c .990 go .990 ruby
//      .972 rust .963; taskPair .125-.129; all 8 meet the rule. The suite carries the invariant in every authored language.
//    EXISTING ARM (regex recipes, not causal, never gates; 4 partners): python .755 javascript .760 typescript .789 go .783
//      c .489 against taskPair .086-.110; ruby and java reader_absent. NONE meets the rule: the licence fails. For python,
//      javascript, typescript and go an EMPTY reading earns .083-.094 (> .05) because the existing reader leaves some partner
//      programs with no call edges and two readings that both found nothing agree on shape by definition; for c the shape
//      licence fails (real S .104 is below the shuffled-graph S .180, it finds almost no call edges in C).
//    PREDICTION SCORECARD (stated plainly, misses included).
//      P1' held (96/96 parse; 72/72 executed first try; java needed the explicit JDK path).
//      P2' mean >= .70 and >= 6/8 pass: held (.98, 8/8); the WEAKEST-languages guess (java, c, rust) was WRONG: java and c
//          are among the highest, rust (.963) lowest, then python and ruby (.972).
//      P3 held except the upper bound: java and go scored .980, above the predicted .80-.97; taskPair .124 (in .10-.28), margin
//          +.375..+.387 (>= .20), strongest control = shuffledGraphs .57-.61 (in .55-.70), p at the floor, all six pass, J .91-.96,
//          S = L = 1, top1 = 1.0. The least-confident guess (java, c, then ruby) was WRONG on java: java is best.
//      P4 held (shuffledIdentifiers J .010 <= .15; shuffledGraphs S .23 <= .50; noReading 0 for edges; shuffledLabels leaves s
//          unchanged and drops L 1 -> .55).
//      P5 PARTLY FALSIFIED: measured/gap pattern held, below-edges held in every shared language, but c scored .489 (< .50) and
//          0 of 4 meet the rule (predicted >= 3 of 4).
//      P6 held (0 retractions at 36 cuts per language). P7 held (edges J vs spec .93-1.00; constructors/typedefs are all of it).
//      P8' held.
//    HONEST READING. The edges reader recovers the invariant call structure of 12 classic algorithms in six languages exactly,
//      and loses only the names of constructors/typedefs. That the controls all fall far below it is the licence that the
//      instrument can tell. It is NOT evidence of generality: the programs are one author's, built on one decomposition
//      (header LIMITS), and agreement among them is by construction; the score says the READER keeps up, not that the suite
//      is hard. The `existing` arm, which does not keep up, is where the instrument discriminates.
// A5 (2026-10-06, session 3: FIX PASS on five review findings). WRITTEN BEFORE the instrument below was changed and BEFORE any run
//    of the changed instrument. The A4 section above is the record of the UNFIXED instrument and is not edited. No pre-registered
//    condition is relaxed: every change adds a condition, tightens a statistic or adds a disclosure.
//  DISCLOSURE (what was looked at before this amendment). The reviewer's scratch scripts (/private/tmp/claude-501/review: drop.mjs,
//    caus.mjs, causal.mjs, fwd.mjs); the A4 numbers re-run once with the old instrument (python .9669 javascript .9669 c .9551
//    go .9800, unchanged); ONE audit-mutant power probe that printed retraction COUNTS only, over every character offset of the six
//    dev languages (final:false: 0 in all six; final:true: python 220, javascript 14, c 0, go 0, ruby 488, java 50; identifier plus
//    "(" read with final:true: python 2422, javascript 2718, c 3504, go 3219, ruby 2043, java 4359); and ONE probe of four toy
//    snippets through readEdges that printed declared[] and calls[] only. That probe showed that readEdges reports only the FINAL
//    identifier of a callee (python `self.items.pop()` inside pop gives caller pop, callee pop; go `j.buf.WriteString()` inside
//    WriteString gives a recursive edge), that a C prototype is not a declaration, and that a javascript method is listed twice. The
//    adversarial predictions for delegate_same_name and forward_reference below are therefore NOT blind (they were designed from that
//    probe); the other adversarial predictions are. No dev program and no dev bundle was edited or re-validated.
//  F1 SURVIVORSHIP (blocker). Denominators are KEPT programs, never non-empty readings. T = every task whose program of the language is
//    kept (vouched by the manifest); partners likewise. An EMPTY reading (no names and no call sites after the filters) stays in T and
//    scores 0 against every partner program: a wholly empty reading agrees about nothing, including with another wholly empty reading
//    (pairScore returns every channel 0 when either graph is empty; the old rule gave an empty reading 0.5 against a call-less one).
//    Reported: details.non_empty {focus:{non_empty, of}, partners:[...]} and gaps {reason:"empty_reading", count, of} for the focus
//    language and {reason:"partner_empty_reading", ...} per partner. New pass condition (a2) NON-EMPTY COVERAGE: non-empty focus
//    readings / kept focus programs >= NONEMPTY_SHARE = 0.9 (11 of 12: a reader blind on 2 of 12 programs fails; the old rule dropped
//    them and scored the survivors). A language with fewer than MIN_TASKS kept programs, or fewer than MIN_PARTNERS partners with at
//    least MIN_TASKS kept programs, still answers pass:null (a fixture gap, not a reader failure). Built to fail (tests): blanking k
//    programs of a real reading lowers the score by about k/12 of its value and fails the rule for k >= 2.
//    PREDICTION: on the six dev languages every one of the 12 programs reads non-empty, so F1 moves no dev number.
//  F2 CAUSALITY AUDIT POWER. The audit now cuts the prefix at EVERY character offset 1..len-1 of every kept program (stride 1,
//    CONST.AUDIT_STRIDE) and audits both the raw reading (declared names, call sites with their offsets) and the algorithmic reading
//    (after the boilerplate and A filters of F4). A retraction is any item of a final:false prefix reading that is absent from the
//    full reading. LICENCE (II.23): the same sweep is repeated with two MUTANT readers built to fail: M1 = the prefix read with
//    final:true (the end of the text counted as a terminator), M2 = the prefix with "(" appended when it ends inside an identifier,
//    read with final:true (a reader that does not wait for the end of a token). The audit is VALID only if M1 + M2 retract at least
//    one item in that language. M2 is pre-registered here because M1 alone has no power in c and go (probe above); it was added
//    before any run of the new audit. Pass condition (e) becomes: zero retractions AND a valid audit. An audit without power fails the
//    rule (reason audit_without_power); it never counts as a pass.
//    PREDICTION: 0 retractions in python javascript c go (the reviewer found 0 at ~44k cuts over six languages), audit valid in all four.
//  F3 DEV IS NOT BLIND, SO ITS PASS IS A SMOKE TEST. The dev suite was authored after the reader's source was read (A1 DISCLOSURE).
//    Every dev result now carries details.evidence = {class:"dev_smoke", blind:false, ...}, a result field smoke_only:true and a first
//    note saying so: a dev PASS licenses "the instrument and the reader run end to end", never "the reader generalises". TEST tasks
//    must be authored by another hand with no access to edges.js or to any dev result: STILL OUTSTANDING, not done in this session.
//    ADVERSARIAL ARM (new; authored by the model and DISCLOSED as authored with knowledge of the reader's weak cases; never
//    held-out): c5-tasks/adversarial/{python,javascript,c,go}.c5 (19 programs), vouched by c5-tasks/adversarial/MANIFEST.json
//    (validate-adversarial.mjs: executed where a toolchain exists, python javascript c; go parse-only). Tasks (spec in ADVERSARIAL
//    below): delegate_same_name (a library call that bears the entity's own name inside the entity, receiver a field),
//    forward_reference (callee declared after the call site; c with prototypes), nested_definitions (a function declared inside a
//    function; c: not applicable, typed), method_chain (a.b().c(); c: nested call arguments), call_through_variable (fn(x) where fn is
//    a parameter or a local alias; the indirect edge to the aliased function is NOT scored: there is no data flow). TRUTH of an
//    adversarial program = the author's declared decomposition (entities, and the call sites among them, receiver-aware: a call on a
//    field's own method is not a call of the declared entity of the same name). READ OK iff every spec entity (function, method or
//    class; C typedef types are not listed) is declared by the reader and the multiset of algorithmic call sites (caller label,
//    callee label) equals the spec. A miss is a TYPED GAP {reason:"adversarial_misread", feature, count, of}, never a verdict: the arm
//    does not gate (it exists to show weak cases). PREDICTIONS (misses are results): delegate_same_name misread in 4 of 4
//    languages (an extra recursive edge); forward_reference misread under the causal rule in 4 of 4 and read OK by the labelled
//    lookahead variant in 4 of 4; nested_definitions OK in python and javascript, misread in go (a closure variable is not a
//    declaration; least confident: javascript), not applicable in c; method_chain OK in all four; call_through_variable OK in python
//    javascript go, c uncertain (function-pointer declarators). The gold arm (tree-sitter) is run beside it with the same truth
//    and is expected to share the receiver-chain misses, because the instrument reduces a callee to its final identifier for every system.
//  F4 CAUSAL A FILTER AND FROZEN BOILERPLATE. (1) The A filter of the headline arm is CAUSAL: a call site is algorithmic only if the
//    caller and the callee are declared names AND the callee's EARLIEST declaration offset (declared[].at; a prototype is not a
//    declaration for the reader) is smaller than the call site's offset. A call whose callee is declared later is a FORWARD REFERENCE:
//    it is dropped from the headline and counted (gaps {reason:"forward_reference_dropped", count, of}, details.forward_references).
//    The old whole-file filter survives as a LABELLED non-gating system `edges_lookahead` ("NOT CAUSAL: a callee declared later counts
//    as known"). The existing and gold arms keep the whole-file filter (not causal, never gate). (2) Boilerplate is no longer derived
//    from the programs under evaluation. It is derived ONCE from DEV (same rule: names declared in >= 0.75 of >= 8 non-empty readings
//    of a system's language) and FROZEN in c5-tasks/boilerplate-dev.json (schema C5Boilerplate@1; sha256 of each dev bundle; per system
//    and language); every later run, DEV or TEST, reads the frozen set. A system/language with no frozen entry on DEV is derived in the
//    run and labelled boilerplate_source:"derived_on_dev"; on TEST a missing frozen entry is the typed gap no_frozen_boilerplate and
//    the TEST read is NOT consumed. Giver of the convention: the language reference (an entry point `main` in c, go, java, and the
//    wrapper class holding it in java); the frozen sets are what DEV shows. The audit of F2 covers the algorithmic reading too.
//    PREDICTION: dev has no forward reference (review: 0 of 26 to 46 algorithmic call sites per language), so the causal filter and
//    the frozen boilerplate leave every dev edges number unchanged to 4 decimals.
//  F5 THE HEADLINE MEASURES THE AUTHOR AS MUCH AS THE READER. (i) AMENDMENT OF THE PAIR SCORE (D, I and L above): a pair in which
//    NEITHER side has any call site states no shape and carries no shape agreement: D = I = 0 and L = 0. The old rule (both empty = 1)
//    let two readings that found no calls agree perfectly about nothing: a reader-free names-only extractor scored 0.69-0.82 against
//    a taskPair of 0.50-0.53 (review), and the A4 `existing`-arm licence failure had the same cause. No perfect reading is affected
//    (each of the 12 tasks states >= 1 algorithmic call site; a TEST task must too: the reserved TEST tasks are to be decomposed with
//    at least one entity-to-entity call), and no score can rise. (ii) NEW CONTROL, a reader-free baseline `declRegexNoCalls`:
//    per-language regular expressions for declaration syntax only (def class function method func type struct typedef), NO call sites,
//    no khora code, no prior (giver: the language reference's declaration syntax), run through the same pipeline as a fourth system
//    `baseline` (partners: the other baseline languages, same frozen-boilerplate rule). New pass condition (g) BASELINE: headline score
//    minus the baseline's same-task score >= MIN_MARGIN (0.10). The baseline is also entered in `controls`, so `control` and `margin`
//    include it. (iii) NEW CONDITION (h) FIDELITY TO INDEPENDENT GOLD: for each kept program, the pair score s of the edges reading
//    against the gold (tree-sitter) reading of the SAME program; this does not depend on the author's naming because both read the
//    same text; the mean over kept programs with a gold reading, an empty edges reading counting 0. Controls: mismatched = mean over
//    t != u of s(reader_t, gold_u); baseline = mean s(declRegexNoCalls_t, gold_t). (h): fidelity - max(mismatched, baseline) >=
//    MIN_MARGIN and n >= MIN_TASKS. If gold is unavailable (h) is unevaluated. THREE-VALUED RULE: false if any evaluated condition
//    fails; null if none fails and (g) or (h) is unevaluated; true only if all hold. So --no-authority never yields true. (g) and (h)
//    gate the headline system only. The headline `score` is the same pre-registered statistic.
//    PREDICTIONS: the baseline's same-task score <= 0.50 in each language (s = J/2 because S = 0 for pairs that state calls), margin
//    of the real score over it >= 0.45; fidelity (reader vs gold) >= 0.93, mismatched <= 0.20, baseline vs gold <= 0.55; (g) and (h)
//    hold in all four languages; the dev PASS stays PASS in python javascript c go (as a smoke test, F3).
//  A5 PASS RULE (headline, per language) = (a) coverage, (a2) non-empty coverage >= 0.9, (b) p <= 0.05, (c) score - taskPair >= 0.10,
//    (d) licence, (e) zero retractions and a valid audit, (f) validated fixture, (g) baseline margin, (h) gold fidelity margin.
//  STILL OUTSTANDING (not done here, reported to the owner): TEST tasks by another hand; proposals to adapters/code/edges.js
//    (emit the receiver chain of a callee, declare prototypes, de-duplicate declared[]) which are the cause of the adversarial misses.
//  RUN LOG: (none yet at the time of this amendment)
// A6 (2026-10-06, session 3). A5 RUN LOG, appended after the FIRST run of the changed instrument. The instrument was not edited between
//    that run and this entry (a rerun is byte-identical). Tests: tests/coding-c5.test.js 37 pass (19 before; 18 new built-to-fail guards,
//    one per mechanism of F1 to F5, incl. a real-pipeline blind-reader test and a real python end-to-end through gold). DEV only; no TEST
//    read exists or was made. New files: c5-tasks/adversarial/{python,javascript,c,go}.c5 + MANIFEST.json (validate-adversarial.mjs:
//    19 of 19 programs parse; 14 of 14 executed programs print the canonical output on the first execution; go 5 parse-only),
//    c5-tasks/boilerplate-dev.json. CLI additions: --audit-stride N (a DEV smoke device, refused on TEST), --freeze-boilerplate (DEV only).
//    HEADLINE (edges reader, the other five dev languages as partners) after the fix, with the A4 value in brackets:
//      lang        score        control  margin  p       pass    audit: cuts / retractions / mutants M1, M2       baseline (margin)   fidelity vs gold (mismatched, names-only)
//      python      .9669 (.9669) .5982   +.3687  5e-5    PASS    5095 / 0 / 220, 2422                             .4700 (+.497)       1.000 (.127, .500)
//      javascript  .9669 (.9669) .5756   +.3913  5e-5    PASS    5726 / 0 / 14, 2718                              .4700 (+.497)       .979  (.125, .479)
//      c           .9551 (.9551) .5808   +.3743  5e-5    PASS    10604 / 0 / 0, 3504                              .4845 (+.471)       .964  (.124, .500)
//      go          .9800 (.9800) .5970   +.3830  5e-5    PASS    7165 / 0 / 0, 3219                               .4845 (+.496)       1.000 (.125, .500)
//      (ruby .9669 and java .9800 also meet the A5 rule in `--language all`; they were not part of this fix pass.) All 12 programs of every
//      language read non-empty, no forward reference exists on dev (0 dropped), the frozen boilerplate equals the A4 derivation (c, go: main),
//      and the nine pass conditions hold in all four. p = 5e-5 is still the floor of a 20000-draw test. "control" is still the strongest
//      control (shuffledGraphs); the new reader-free control declRegexNoCalls (.47-.48) is in `controls` and is far below it.
//    PREDICTION SCORECARD (A5, stated plainly). F1 held (no dev number moved). F2 held (0 retractions; the audit is valid in all four;
//      M1 retracts nothing in c and go, so M2 carried the licence there, exactly as the pre-registration said). F4 held (numbers
//      unchanged to 4 decimals; 0 forward references on dev). F5 held on every stated bound: baseline <= .50 (.470-.4845), margin >= .45
//      (.471-.497), fidelity >= .93 (.964-1.000), mismatched <= .20 (.124-.127), names-only vs gold <= .55 (.479-.500). F3 adversarial,
//      with the two NOT-blind predictions marked: delegate_same_name misread in 4 of 4 (python pop->pop; javascript push->push and
//      pop->pop; c pop->pop through the function-pointer member; go WriteString->WriteString and Len->Len) [not blind: held];
//      forward_reference misread under the causal rule in 4 of 4, read OK by the lookahead variant in 4 of 4 (2 call sites dropped per
//      language) [not blind: held]; nested_definitions OK in python and javascript, misread in go (the closure variable `step` is
//      not declared: missing entity and both edges), c not applicable [held, including the least confident javascript guess];
//      method_chain OK in 4 of 4 [held]; call_through_variable OK in python javascript go and in c [held; c was the uncertain one].
//      The gold arm shares delegate_same_name (4 of 4) and the go closure miss, and reads forward_reference OK (it has no causal filter),
//      as predicted. Adversarial totals under the causal rule (OK of applicable): python 3/5, javascript 3/5, c 2/4, go 2/5;
//      under the lookahead variant 4/5, 4/5, 3/4, 3/5. Every miss is a typed gap {adversarial_misread, feature, count, of}.
//    WHAT CHANGED IN THE EVIDENCE (honest reading). (1) The dev numbers did not move, so F1/F4 changed what the instrument CAN CATCH,
//      not what it found: the blind-reader mutation of the review now gives score .67 and pass:false instead of 1.000 and pass:true
//      (test F1). (2) The audit now has power: 5k-10k cuts per language instead of 36, and it provably fails readers built to fail.
//      (3) Against the reader-free baseline the headline's whole margin is the call-shape channel (J is .93-.96 for the names-only
//      baseline too: the names are the author's), and that call structure is confirmed by independent gold (fidelity .96-1.00). The
//      remaining fidelity loss is the constructor/typedef names (javascript, c) as in A4. (4) The adversarial arm shows where the reader
//      is weak: it reports a callee by its final identifier only (no receiver), does not declare C prototypes or Go closure variables,
//      and lists some declarations twice. These are reader limits, outside this instrument; they are reported, not fixed here.
//    SIDE EFFECT OF THE F5 AMENDMENT, disclosed: the `existing` arm (regex recipes) now meets the rule in python, javascript and go (3 of 4;
//      A4: 0 of 4) because its A4 licence failures were the both-empty-agree artifact; c still fails (score .489, shape licence).
//      This is the metric being corrected, not the existing reader improving; A4's P5 ("at least 3 of 4 meet the rule") is therefore
//      numerically true now for a reason other than the one it predicted. The existing arm never gates.
//    STILL OUTSTANDING (unchanged by this pass): (a) the TEST tasks by another hand with no access to edges.js or any dev result (F3);
//      until they exist every C5 verdict is a DEV smoke test; (b) ruby and java have no adversarial bundle (typed gap
//      no_adversarial_program) and typescript and rust have no causal reader (reader_absent); (c) go is parse-only everywhere (no go
//      toolchain here), so the go dev and adversarial programs were never executed; (d) proposals to adapters/code/edges.js (not edited):
//      emit the receiver chain of a callee next to its final identifier, treat a C prototype as a declaration, declare Go closure
//      variables (var f func ...; f = func ...), de-duplicate declared[] (javascript methods and java methods appear twice).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { goldBatch, goldAvailable, CORE_DEF_KINDS } from "./gold.mjs";
import { readEdges, keywordsFor, edgeLanguages } from "../../adapters/code/edges.js";
import { parseDeclarations, callEdges, loadCodeKeywordPrior, keywordSetOf } from "../../adapters/text/code-structure.js";

export const RUNG = Object.freeze({
  id: "C5",
  ladder: "R5",
  name: "agreement",
  question: "Does the reader recover the same declared entities (as identifier sub-words) and the same call structure (recursive vs non-recursive call multigraph) for the same algorithm written in different languages, beyond what different algorithms give?",
});

// ---- declared constants (every threshold is declared with its reason; none tuned after a run) ------------------------
export const CONST = Object.freeze({
  ALPHA: 0.05,           // given by the task: the 5% permutation test
  PERMS: 20000,          // permutation draws: min p = 5e-5 << ALPHA; Monte Carlo error at p = 0.05 is about 0.0015
  REPS: 25,              // replicates of each randomised control arm (the arm's value is the replicate mean)
  MIN_MARGIN: 0.10,      // minimal effect, composite points over the task-pair control (c4 uses the same figure)
  MIN_TASKS: 8,          // two thirds of 12: below it the permutation reference set is too thin
  MIN_PARTNERS: 3,
  BOILER_SHARE: 0.75,    // see header: no spec entity occurs in more than 3 of 12 programs
  BOILER_MIN_PROGRAMS: 8,
  LIC_NAMES_RATIO: 0.5,  // shuffled-identifier J must fall to at most half of the real J
  LIC_SHAPE_DROP: 0.10,  // real S minus shuffled-graph S must be at least this
  LIC_EMPTY_SCORE: 0.05,
  LIC_EMPTY_MARGIN: 0.02,
  W_NAMES: 0.5,
  W_SHAPE: 0.5,
  CUTS: Object.freeze([0.25, 0.5, 0.75]), // the OLD audit's three cuts (A4); kept for the record, no longer used (A5 F2 sweeps every offset)
  NONEMPTY_SHARE: 0.9,   // A5 F1: non-empty focus readings / kept focus programs (11 of 12); the share of programs a reader may be blind on is 1 - this
  AUDIT_STRIDE: 1,       // A5 F2: the causality audit cuts at every character offset
  MAX_CANON_PERMS: 50000,
  SEED: 0xc5a9ee,
});

// ---- the task spec (frozen; see header) --------------------------------------------------------------------------------
export const TASKS = Object.freeze([
  { id: "fibonacci", entities: ["fibonacci"], edges: [["fibonacci", "fibonacci", 2]], out: "0 1 1 2 3 5 8 13 21 34 55" },
  { id: "gcd", entities: ["gcd"], edges: [["gcd", "gcd", 1]], out: "6 1 9 25" },
  { id: "binary_search", entities: ["binary_search", "search_range"], edges: [["binary_search", "search_range", 1], ["search_range", "search_range", 2]], out: "3 0 6 -1" },
  { id: "quicksort", entities: ["quicksort", "partition"], edges: [["quicksort", "partition", 1], ["quicksort", "quicksort", 2]], out: "0 1 2 3 5 5 6 9" },
  { id: "merge_sort", entities: ["merge_sort", "merge"], edges: [["merge_sort", "merge", 1], ["merge_sort", "merge_sort", 2]], out: "3 9 10 27 38 43 82" },
  { id: "factorial", entities: ["factorial"], edges: [["factorial", "factorial", 1]], out: "1 1 2 6 24 120 720 5040 40320 362880 3628800" },
  { id: "palindrome", entities: ["is_palindrome", "normalize", "reverse_text"], edges: [["is_palindrome", "normalize", 1], ["is_palindrome", "reverse_text", 1]], out: "true false true" },
  { id: "word_count", entities: ["count_words", "split_words"], edges: [["count_words", "split_words", 1]], out: "brown=1 dog=1 end=1 fox=1 jumps=1 lazy=1 over=1 quick=1 the=3" },
  { id: "fizzbuzz", entities: ["fizz_buzz", "is_divisible"], edges: [["fizz_buzz", "is_divisible", 3]], out: "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz" },
  { id: "linked_list", entities: ["Node", "reverse_list", "to_array"], edges: [["reverse_list", "reverse_list", 1]], out: "5 4 3 2 1" },
  { id: "stack", entities: ["Stack", "push", "pop", "peek", "is_empty"], edges: [["pop", "is_empty", 1], ["peek", "is_empty", 1]], out: "3 3 2 false 1 true" },
  { id: "tree_traversal", entities: ["TreeNode", "inorder", "preorder"], edges: [["inorder", "inorder", 2], ["preorder", "preorder", 2]], out: "1 2 3 4 5 6 7\n4 2 1 3 6 5 7" },
]);
export const TASK_IDS = Object.freeze(TASKS.map((t) => t.id));
export const RESERVED_TEST_TASKS = Object.freeze(["sum_list", "reverse_string", "bubble_sort", "is_prime", "collatz_steps", "is_anagram", "to_binary", "queue", "find_max", "count_vowels", "hanoi", "pascal_row"]);

// ---- A5 F3: the ADVERSARIAL arm's spec. AUTHORED by the model with knowledge of the reader's weak cases (disclosed in A5), never
// held-out. Per task and language: the spec entities (function, method, class or type that the reader should declare; C typedef types
// are not listed), the algorithmic call sites among them (caller, callee, count; receiver-aware truth: a call on a field's own method
// is NOT a call of the declared entity of the same name; an indirect call through a variable is NOT an edge), and the canonical output
// the program must print (validate-adversarial.mjs executes it where a toolchain exists).
const ADV_STACK = { entities: ["Stack", "push", "pop", "peek", "is_empty"], edges: [["pop", "is_empty", 1], ["peek", "is_empty", 1]], out: "3 3 2 false 1 true" };
const ADV_FORWARD = { entities: ["total_cost", "apply_tax", "sum_prices"], edges: [["total_cost", "apply_tax", 1], ["total_cost", "sum_prices", 1]], out: "440" };
const ADV_NESTED = { entities: ["count_down", "step"], edges: [["count_down", "step", 1], ["step", "step", 1]], out: "5 4 3 2 1 0" };
const ADV_CHAIN = { entities: ["Builder", "add", "build", "make_label"], edges: [["make_label", "add", 2], ["make_label", "build", 1]], out: "alpha-beta" };
const ADV_VARIABLE = { entities: ["triple", "apply_twice", "run"], edges: [["run", "apply_twice", 1]], out: "45" };
export const ADVERSARIAL = Object.freeze([
  { id: "delegate_same_name", feature: "a library call that bears the entity's own name inside the entity (the receiver is a field, not the object)",
    spec: { python: ADV_STACK, javascript: ADV_STACK,
      c: { entities: ["is_empty", "push", "pop", "peek", "backend_pop"], edges: [["pop", "is_empty", 1], ["peek", "is_empty", 1]], out: "3 3 2 false 1 true" },
      go: { entities: ["Journal", "write_string", "len", "record"], edges: [["record", "len", 1], ["record", "write_string", 2]], out: "a|b|c" } } },
  { id: "forward_reference", feature: "a callee declared after the call site that names it",
    spec: { python: ADV_FORWARD, javascript: ADV_FORWARD, c: ADV_FORWARD, go: ADV_FORWARD } },
  { id: "nested_definitions", feature: "a function declared inside a function (a closure variable in go)",
    spec: { python: ADV_NESTED, javascript: ADV_NESTED, go: ADV_NESTED, c: { na: "C has no nested function definitions (the GNU extension is not standard C)" } } },
  { id: "method_chain", feature: "a call chain a.b().c() (c: nested call arguments f(g(h(x))))",
    spec: { python: ADV_CHAIN, javascript: ADV_CHAIN, go: ADV_CHAIN,
      c: { entities: ["add", "clamp", "clamp_sum"], edges: [["clamp_sum", "add", 2], ["clamp_sum", "clamp", 1]], out: "10" } } },
  { id: "call_through_variable", feature: "fn(x) where fn is a parameter or a local alias of a declared function (no data flow: the indirect edge is not scored)",
    spec: { python: ADV_VARIABLE, javascript: ADV_VARIABLE, c: ADV_VARIABLE, go: ADV_VARIABLE } },
]);
export const ADVERSARIAL_IDS = Object.freeze(ADVERSARIAL.map((t) => t.id));
export const ADVERSARIAL_LANGUAGES = Object.freeze(["python", "javascript", "c", "go"]);

/** The 50 languages of the task list (the corpus also holds c_sharp, which this task does not list). */
export const LANGUAGES = Object.freeze(["python", "javascript", "typescript", "tsx", "java", "c", "cpp", "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "haskell", "lua", "perl", "r", "julia", "bash", "sql", "html", "css", "json", "yaml", "toml", "zig", "ocaml", "elixir", "erlang", "clojure", "dart", "elm", "fortran", "commonlisp", "scheme", "racket", "verilog", "nim", "groovy", "objc", "powershell", "matlab", "cobol", "lean", "solidity", "svelte", "vue", "markdown", "latex"]);
export const DEV_LANGUAGES = Object.freeze(["python", "javascript", "c", "go", "ruby", "java"]);
export const EXT = Object.freeze({
  python: "py", javascript: "js", typescript: "ts", tsx: "tsx", java: "java", c: "c", cpp: "cpp", go: "go", rust: "rs", ruby: "rb", php: "php",
  swift: "swift", kotlin: "kt", scala: "scala", haskell: "hs", lua: "lua", perl: "pl", r: "R", julia: "jl", bash: "sh", sql: "sql", zig: "zig",
  ocaml: "ml", elixir: "exs", erlang: "erl", clojure: "clj", dart: "dart", elm: "elm", fortran: "f90", commonlisp: "lisp", scheme: "scm",
  racket: "rkt", verilog: "v", nim: "nim", groovy: "groovy", objc: "m", powershell: "ps1", matlab: "m", cobol: "cob", lean: "lean",
  solidity: "sol", svelte: "svelte", vue: "vue", html: "html", css: "css", json: "json", yaml: "yaml", toml: "toml", markdown: "md", latex: "tex",
});
export const NOT_APPLICABLE = Object.freeze({
  html: "markup: it declares elements and attributes and states no procedure (no function, recursion or call), so none of the 12 algorithms can be written in it",
  css: "stylesheet language: it declares rules and custom properties and states no procedure, so none of the 12 algorithms can be written in it",
  json: "data format: it declares no named entity and has no call syntax, so none of the 12 algorithms can be written in it",
  yaml: "data format: it declares no named entity and has no call syntax, so none of the 12 algorithms can be written in it",
  toml: "data format: it declares tables and keys and has no call syntax, so none of the 12 algorithms can be written in it",
  markdown: "prose markup: it has no call syntax and no procedure, so none of the 12 algorithms can be written in it",
  latex: "document-preparation markup: TeX macros can compute but are not an idiomatic way to state these 12 algorithms and none was authored (typed not applicable, not unmeasured)",
  sql: "declarative query language: a recursive CTE can state 3 of the 12 tasks (fibonacci, factorial, gcd), below the 8-task coverage floor, and procedural dialects put the body in a string the grammar does not parse",
});
export const LANG_ALIAS = Object.freeze({ py: "python", js: "javascript", ts: "typescript", rs: "rust", rb: "ruby", kt: "kotlin", hs: "haskell", ml: "ocaml", ex: "elixir", erl: "erlang", sh: "bash", ps1: "powershell", golang: "go", "c++": "cpp", cs: "csharp", csharp: "csharp", c_sharp: "csharp", common_lisp: "commonlisp", lisp: "commonlisp", objective_c: "objc", tex: "latex", md: "markdown", yml: "yaml", pl: "perl", jl: "julia", clj: "clojure", scm: "scheme", rkt: "racket", f90: "fortran", sol: "solidity" });
export const normLanguage = (l) => { const s = String(l ?? "").toLowerCase(); return LANG_ALIAS[s] ?? s; };

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TASK_DIR = process.env.C5_TASK_DIR || path.join(HERE, "c5-tasks");
const OUT_DIR = () => process.env.C5_OUT_DIR || "/private/tmp/claude-501/coding-competence";
const LEDGER = () => process.env.C5_LEDGER || "/private/tmp/claude-501/coding-competence/test-ledger.json";
const SEP = "\u0001";
const TOP = "<top>";
const round = (x, d = 4) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(...parts) { return crypto.createHash("sha256").update(parts.join("|")).digest().readUInt32LE(0) ^ CONST.SEED; }
function shuffleInPlace(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** A seeded derangement of 0..n-1 (n >= 2): no element keeps its place. */
export function derangement(n, rng) {
  if (n < 2) return n === 1 ? [0] : [];
  for (let k = 0; k < 2000; k++) {
    const p = shuffleInPlace([...Array(n).keys()], rng);
    if (p.every((v, i) => v !== i)) return p;
  }
  return [...Array(n).keys()].map((i) => (i + 1) % n);
}

// ---- names ------------------------------------------------------------------------------------------------------------------
/** Final segment of a qualified name (after the last ., ::, #, / or ->). */
export function finalName(s) {
  const t = String(s ?? "");
  const parts = t.split(/::|->|[.#/]/).filter((x) => x.length);
  return parts.length ? parts[parts.length - 1] : t;
}
/** Normalised identifier sub-words: is_empty, isEmpty, IsEmpty, is-empty -> ["is","empty"]. */
export function subwords(name) {
  const base = finalName(name).replace(/[?!=]+$/, "");
  return base
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w.toLowerCase());
}
export const labelOf = (name) => subwords(name).join(" ");

// ---- graphs -------------------------------------------------------------------------------------------------------------------
function* permutationsOf(arr) {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutationsOf(rest)) yield [arr[i], ...p];
  }
}
function* orderings(classes, k = 0) {
  if (k === classes.length) { yield []; return; }
  for (const head of permutationsOf(classes[k])) for (const tail of orderings(classes, k + 1)) yield [...head, ...tail];
}
/** Exact canonical form of a directed multigraph (node names are forgotten; edge multiplicities and self-loops kept). "" for no nodes. */
export function canonicalForm(nodeNames, edgeCount) {
  const nodes = [...nodeNames].sort();
  const n = nodes.length;
  if (!n) return "";
  const idx = new Map(nodes.map((x, i) => [x, i]));
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const [k, c] of edgeCount) { const [u, v] = k.split(SEP); M[idx.get(u)][idx.get(v)] += c; }
  const sig = nodes.map((_, i) => {
    let o = 0, inn = 0;
    for (let j = 0; j < n; j++) if (j !== i) { o += M[i][j]; inn += M[j][i]; }
    return `${M[i][i]}.${o}.${inn}`;
  });
  const byClass = new Map();
  sig.forEach((s, i) => { if (!byClass.has(s)) byClass.set(s, []); byClass.get(s).push(i); });
  const keys = [...byClass.keys()].sort();
  const classes = keys.map((k) => byClass.get(k));
  let total = 1;
  for (const c of classes) for (let f = 2; f <= c.length; f++) total *= f;
  const render = (order) => { let s = ""; for (const i of order) { for (const j of order) s += `${M[i][j]},`; s += ";"; } return s; };
  if (total > CONST.MAX_CANON_PERMS) return `~${keys.join(",")}|${render(classes.flat())}`; // refinement only; flagged by "~" (never reached on the suite)
  let best = null;
  for (const order of orderings(classes)) { const r = render(order); if (best === null || r < best) best = r; }
  return `${keys.join(",")}|${best}`;
}

/** Graph of an algorithmic reading { names:[...], edges:[[caller,callee], ...] (one per call site) }. */
export function graphOf(algo) {
  const cnt = new Map();
  for (const [c, e] of algo.edges ?? []) { const k = `${c}${SEP}${e}`; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
  let R = 0, N = 0;
  const nodes = new Set();
  for (const [k, c] of cnt) { const [u, v] = k.split(SEP); if (u === v) R += c; else N += c; nodes.add(u); nodes.add(v); }
  const words = new Set();
  for (const nm of algo.names ?? []) for (const w of subwords(nm)) words.add(w);
  const ledges = new Map();
  for (const [k, c] of cnt) { const [u, v] = k.split(SEP); const kk = `${labelOf(u)}${SEP}${labelOf(v)}`; ledges.set(kk, (ledges.get(kk) ?? 0) + c); }
  return { words, R, N, canon: canonicalForm(nodes, cnt), ledges, nNames: (algo.names ?? []).length, nEdges: R + N };
}

const jaccard = (a, b) => { if (!a.size && !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i += 1; return i / (a.size + b.size - i); };
function diceMulti(a, b) {
  let sum = 0, mn = 0;
  for (const v of a.values()) sum += v;
  for (const v of b.values()) sum += v;
  if (sum === 0) return 0; // A5 F5: no labelled call on either side states no structure, so nothing is agreed (was 1)
  for (const [k, v] of a) if (b.has(k)) mn += Math.min(v, b.get(k));
  return (2 * mn) / sum;
}
/** A wholly empty reading: no names and no call sites. It agrees about nothing (A5 F1). */
export const isEmptyGraph = (g) => !g || ((g.nNames ?? 0) === 0 && (g.nEdges ?? 0) === 0 && !(g.words && g.words.size));
/**
 * Pair score of two graphs (same task, two languages, same system): { J, D, I, S, L, s }.
 * A5: (F1) a wholly empty reading scores 0 on every channel against anything, another empty reading included;
 *     (F5) a pair with NO call site on either side states no shape: D = I = L = 0 (the pre-registered "= 1" is amended, see header).
 */
export function pairScore(a, b) {
  if (isEmptyGraph(a) || isEmptyGraph(b)) return { J: 0, D: 0, I: 0, S: 0, L: 0, s: 0 };
  const J = jaccard(a.words, b.words);
  const tot = a.R + b.R + a.N + b.N;
  const D = tot === 0 ? 0 : (2 * (Math.min(a.R, b.R) + Math.min(a.N, b.N))) / tot;
  const I = tot === 0 ? 0 : a.canon === b.canon ? 1 : 0;
  const S = (D + I) / 2;
  return { J, D, I, S, L: diceMulti(a.ledges, b.ledges), s: CONST.W_NAMES * J + CONST.W_SHAPE * S };
}

/** Names declared in >= BOILER_SHARE of >= BOILER_MIN_PROGRAMS non-empty readings of one (system, language). A5 F4: used ONCE, on DEV, to FREEZE the set (see frozenBoilerplate). */
export function deriveBoilerplate(readings /* Map task -> reading */) {
  const live = [...readings.values()].filter((r) => r && r.names?.length);
  if (live.length < CONST.BOILER_MIN_PROGRAMS) return new Set();
  const cnt = new Map();
  for (const r of live) for (const nm of new Set(r.names)) cnt.set(nm, (cnt.get(nm) ?? 0) + 1);
  const need = Math.ceil(CONST.BOILER_SHARE * live.length);
  return new Set([...cnt].filter(([, c]) => c >= need).map(([nm]) => nm));
}
/**
 * reading {names, decls?:[{name, at}], calls:[{caller, callee, at}]} -> algorithmic reading {names, edges:[[caller, callee, at]], forwardRefs}
 * (boilerplate and non-algorithmic calls removed).
 *   causal:false  the whole-file filter (A4): caller and callee are names declared ANYWHERE in the file. NOT causal: a callee declared
 *                 later counts as known. Used by the non-causal arms and by the labelled `edges_lookahead` system.
 *   causal:true   A5 F4: a call site counts only if the callee's EARLIEST declaration offset is smaller than the call site's offset.
 *                 Calls dropped because the callee is declared later are FORWARD REFERENCES (counted in forwardRefs, never silently lost).
 */
export function algorithmic(reading, boiler = new Set(), { causal = false } = {}) {
  const A = new Set((reading?.names ?? []).filter((n) => n && !boiler.has(n)));
  let first = null;
  if (causal) {
    if (!reading?.decls) throw new Error("causal A filter needs declaration offsets (reading.decls)");
    first = new Map();
    for (const d of reading.decls) if (d?.name && (!first.has(d.name) || d.at < first.get(d.name))) first.set(d.name, d.at);
  }
  const edges = [];
  let forwardRefs = 0;
  for (const c of reading?.calls ?? []) {
    if (c.caller === TOP || !A.has(c.caller) || !A.has(c.callee)) continue;
    if (causal) {
      const at = first.get(c.callee);
      if (at === undefined || !(at < c.at)) { forwardRefs += 1; continue; }
    }
    edges.push([c.caller, c.callee, c.at]);
  }
  return { names: [...A], edges, forwardRefs };
}

// ---- the statistics -------------------------------------------------------------------------------------------------------------
const CH = ["s", "J", "D", "I", "S", "L"];
/** Pair matrices of focus graphs (Map task -> graph) against partners ([{language, graphs: Map}]), over `tasks`. */
export function pairMatrices(focus, partners, tasks) {
  const n = tasks.length;
  const mk = () => Array.from({ length: n }, () => new Array(n).fill(0));
  const sum = Object.fromEntries(CH.map((c) => [c, mk()]));
  const cnt = Array.from({ length: n }, () => new Array(n).fill(0));
  const top1 = [];
  for (const P of partners) {
    for (let u = 0; u < n; u++) {
      const fu = focus.get(tasks[u]);
      if (!fu) continue;
      const row = new Array(n).fill(null);
      for (let t = 0; t < n; t++) {
        const pt = P.graphs.get(tasks[t]);
        if (!pt) continue;
        const ps = pairScore(fu, pt);
        row[t] = ps.s;
        for (const c of CH) sum[c][u][t] += ps[c];
        cnt[u][t] += 1;
      }
      // retrieval: the focus program of task u against every partner program; is the same-task one ranked first?
      if (row[u] !== null) {
        const others = row.filter((v, t) => v !== null && t !== u);
        if (others.length) {
          const best = Math.max(...others);
          const ties = others.filter((v) => Math.abs(v - best) < 1e-12).length;
          top1.push(row[u] > best + 1e-12 ? 1 : Math.abs(row[u] - best) < 1e-12 ? 1 / (1 + ties) : 0);
          top1.chance = (top1.chance ?? []);
          top1.chance.push(1 / (others.length + 1));
        }
      }
    }
  }
  const M = Object.fromEntries(CH.map((c) => [c, Array.from({ length: n }, (_, u) => Array.from({ length: n }, (_, t) => (cnt[u][t] ? sum[c][u][t] / cnt[u][t] : null)))]));
  return { M, cnt, top1: top1.length ? mean(top1) : null, chance: top1.chance ? mean(top1.chance) : null, nRetrieval: top1.length };
}
const diagMean = (m) => { const v = m.map((r, i) => r[i]).filter((x) => x !== null); return v.length ? mean(v) : null; };
const offMean = (m) => { const v = []; m.forEach((r, u) => r.forEach((x, t) => { if (u !== t && x !== null) v.push(x); })); return v.length ? mean(v) : null; };

/** One-sided permutation test over task labels. M[u][t] may be null (missing) and is then skipped. */
export function permutationTest(M, { perms = CONST.PERMS, seed = CONST.SEED } = {}) {
  const n = M.length;
  const stat = (pi) => { let s = 0, c = 0; for (let t = 0; t < n; t++) { const v = M[pi[t]][t]; if (v !== null) { s += v; c += 1; } } return c ? s / c : -Infinity; };
  const id = [...Array(n).keys()];
  const obs = stat(id);
  const rng = mulberry32(seed);
  let ge = 0, sum = 0, sum2 = 0;
  for (let b = 0; b < perms; b++) {
    const v = stat(shuffleInPlace(id.slice(), rng));
    if (v >= obs - 1e-12) ge += 1;
    sum += v; sum2 += v * v;
  }
  const m = sum / perms;
  return { observed: obs, p: (1 + ge) / (perms + 1), nullMean: m, nullSd: Math.sqrt(Math.max(0, sum2 / perms - m * m)), perms };
}

/** Control-arm graphs for the focus language. `algo` = Map task -> algorithmic reading. kind: shuffledIdentifiers | shuffledGraphs | shuffledLabels | noReading. */
export function perturbedFocus(kind, algo, tasks, rng) {
  const out = new Map();
  const names = tasks.filter((t) => algo.has(t));
  if (kind === "noReading") { for (const t of names) out.set(t, graphOf({ names: [], edges: [] })); return out; }
  if (kind === "shuffledGraphs") {
    const g = new Map(names.map((t) => [t, graphOf(algo.get(t))]));
    const pi = derangement(names.length, rng);
    names.forEach((t, i) => { const own = g.get(t), other = g.get(names[pi[i]]); out.set(t, { ...own, R: other.R, N: other.N, canon: other.canon, ledges: other.ledges, nEdges: other.nEdges }); });
    return out;
  }
  const pool = [...new Set(names.flatMap((t) => algo.get(t).names))];
  let synth = 0;
  for (const t of names) {
    const a = algo.get(t);
    let map;
    if (kind === "shuffledLabels") {
      const perm = shuffleInPlace(a.names.slice(), rng);
      map = new Map(a.names.map((nm, i) => [nm, perm[i]]));
    } else { // shuffledIdentifiers
      const own = new Set(a.names);
      const cand = shuffleInPlace(pool.filter((x) => !own.has(x)), rng);
      map = new Map(a.names.map((nm, i) => [nm, cand[i] ?? `zz${synth++}`]));
    }
    out.set(t, graphOf({ names: a.names.map((nm) => map.get(nm)), edges: a.edges.map(([c, e]) => [map.get(c), map.get(e)]) }));
  }
  return out;
}

/**
 * The whole agreement analysis for ONE focus language (pure: readings in, numbers out).
 *   focus     Map task -> algorithmic reading {names, edges}      (X, after boilerplate removal): ONE ENTRY PER KEPT PROGRAM, an empty
 *             reading included (A5 F1: the denominator is the kept programs, never the programs the reader happened to read)
 *   partners  [{language, algo: Map task -> algorithmic reading}]  (likewise: every kept program, empty readings included)
 *   tasks     task ids to use (in order)
 */
export function analyse({ focus, partners, tasks, seed = CONST.SEED, perms = CONST.PERMS, reps = CONST.REPS }) {
  const T = tasks.filter((t) => focus.has(t));
  const nonEmptyOf = (algo, ts) => ts.filter((t) => algo.has(t) && algo.get(t).names.length > 0).length;
  const rows = partners.map((p) => {
    const have = T.filter((t) => p.algo.has(t));
    return { language: p.language, graphs: new Map(have.map((t) => [t, graphOf(p.algo.get(t))])), kept: have.length, nonEmpty: nonEmptyOf(p.algo, have) };
  });
  const floor = Math.min(CONST.MIN_TASKS, T.length);
  const parts = rows.filter((p) => p.graphs.size >= floor);
  const dropped = rows.filter((p) => p.graphs.size < floor).map((p) => ({ language: p.language, kept: p.kept, floor }));
  const nonEmpty = { focus: { non_empty: nonEmptyOf(focus, T), of: T.length }, partners: parts.map((p) => ({ language: p.language, non_empty: p.nonEmpty, of: p.kept })) };
  const out = { tasks: T, partners: parts.map((p) => p.language), nTasks: T.length, nPartners: parts.length, nonEmpty, partnersDropped: dropped };
  if (!T.length || !parts.length) return { ...out, empty: true };
  const real = pairMatrices(new Map(T.map((t) => [t, graphOf(focus.get(t))])), parts, T);
  const perm = permutationTest(real.M.s, { perms, seed: seed ^ 0x1 });
  const same = {}, cross = {};
  for (const c of CH) { same[c] = diagMean(real.M[c]); cross[c] = offMean(real.M[c]); }
  const nPairs = real.cnt.reduce((a, r, u) => a + r[u], 0);
  const perTask = T.map((t, i) => {
    const wrong = real.M.s.map((r) => r[i]).filter((v, u) => u !== i && v !== null);
    return { task: t, same: round(real.M.s[i][i]), bestWrong: round(wrong.length ? Math.max(...wrong) : null), J: round(real.M.J[i][i]), S: round(real.M.S[i][i]), L: round(real.M.L[i][i]), empty: focus.get(t).names.length === 0 };
  });
  const arms = {};
  for (const kind of ["shuffledIdentifiers", "shuffledGraphs", "shuffledLabels", "noReading"]) {
    const R = kind === "noReading" ? 1 : reps;
    const acc = Object.fromEntries(CH.map((c) => [c, []]));
    const crossAcc = [];
    for (let r = 0; r < R; r++) {
      const rng = mulberry32(seedOf(kind, r, seed));
      const g = perturbedFocus(kind, focus, T, rng);
      const m = pairMatrices(g, parts, T);
      for (const c of CH) acc[c].push(diagMean(m.M[c]));
      crossAcc.push(offMean(m.M.s));
    }
    arms[kind] = { ...Object.fromEntries(CH.map((c) => [c, mean(acc[c].filter((x) => x !== null))])), cross: mean(crossAcc.filter((x) => x !== null)), reps: R };
  }
  return { ...out, nPairs, same, cross, perm, perTask, top1: real.top1, chance: real.chance, arms, M: real.M };
}

/**
 * The pre-registered pass rule applied to an analysis (see header, A5 PASS RULE).
 *   causal    null when the arm is not audited, else { retracted, licence_ok }: zero retractions AND a valid (licensed) audit
 *   baseline  { score }: the reader-free names-only baseline's same-task score (undefined = not evaluated)
 *   fidelity  { n, s, mismatched, baseline }: reader-vs-gold agreement and its controls (undefined = not evaluated)
 *   gate      { baseline, fidelity }: whether (g) and (h) gate this arm (the headline: yes; other arms: no)
 * THREE-VALUED: false if any evaluated condition fails; null if none fails and a gated condition is unevaluated; true only if all hold.
 */
export function passRule(a, { causal = null, validated = true, baseline = undefined, fidelity = undefined, gate = { baseline: true, fidelity: true } } = {}) {
  const reasons = [];
  const cond = {};
  if (!a || a.empty) return { pass: null, cond, reasons: ["no analysable readings"], licence: null };
  cond.coverage = a.nTasks >= CONST.MIN_TASKS && a.nPartners >= CONST.MIN_PARTNERS;
  if (!cond.coverage) reasons.push(`coverage: ${a.nTasks} tasks (floor ${CONST.MIN_TASKS}), ${a.nPartners} partners (floor ${CONST.MIN_PARTNERS})`);
  if (!validated) { cond.validated = false; reasons.push("fixture not validated"); }
  if (!cond.coverage || !validated) return { pass: null, cond, reasons, licence: null };
  const score = a.same.s;
  const taskPair = a.cross.s;
  const share = a.nonEmpty ? a.nonEmpty.focus.non_empty / Math.max(1, a.nonEmpty.focus.of) : 1;
  cond.nonEmpty = share >= CONST.NONEMPTY_SHARE - 1e-12;
  cond.permutation = a.perm.p <= CONST.ALPHA;
  cond.effect = score - taskPair >= CONST.MIN_MARGIN;
  const names = a.arms.shuffledIdentifiers.J <= CONST.LIC_NAMES_RATIO * a.same.J;
  const shape = a.same.S - a.arms.shuffledGraphs.S >= CONST.LIC_SHAPE_DROP;
  const empty = a.arms.noReading.s <= CONST.LIC_EMPTY_SCORE && Math.abs(a.arms.noReading.s - (a.arms.noReading.cross ?? 0)) <= CONST.LIC_EMPTY_MARGIN;
  const licence = { ok: names && shape && empty, names_move: names, shape_moves: shape, empty_earns_nothing: empty,
    shuffledIdentifiers_J: round(a.arms.shuffledIdentifiers.J), real_J: round(a.same.J), real_S: round(a.same.S), shuffledGraphs_S: round(a.arms.shuffledGraphs.S), noReading_score: round(a.arms.noReading.s) };
  cond.licence = licence.ok;
  if (causal !== null) cond.causality = causal.retracted === 0 && causal.licence_ok === true;
  const unevaluated = [];
  if (gate.baseline) {
    if (baseline == null || baseline.score == null) unevaluated.push("baseline");
    else { cond.baseline = score - baseline.score >= CONST.MIN_MARGIN - 1e-12; cond.baseline_margin = round(score - baseline.score); }
  }
  if (gate.fidelity) {
    if (fidelity == null || fidelity.s == null) unevaluated.push("fidelity");
    else {
      const ctl = Math.max(fidelity.mismatched ?? -Infinity, fidelity.baseline ?? -Infinity);
      cond.fidelity = fidelity.n >= CONST.MIN_TASKS && fidelity.s - ctl >= CONST.MIN_MARGIN - 1e-12;
      cond.fidelity_margin = round(fidelity.s - ctl);
    }
  }
  if (!cond.nonEmpty) reasons.push(`non-empty coverage ${a.nonEmpty.focus.non_empty}/${a.nonEmpty.focus.of} < ${CONST.NONEMPTY_SHARE}: the reader is blind on too many kept programs`);
  if (!cond.permutation) reasons.push(`permutation p ${a.perm.p.toFixed(5)} > ${CONST.ALPHA}`);
  if (!cond.effect) reasons.push(`score - taskPair ${(score - taskPair).toFixed(3)} < ${CONST.MIN_MARGIN}`);
  if (!licence.ok) reasons.push(`licence failed (names ${names}, shape ${shape}, empty ${empty})`);
  if (causal !== null && !cond.causality) reasons.push(causal.retracted !== 0 ? `causality: ${causal.retracted} retractions` : "audit_without_power: no mutant reader was retracted, so the causality audit proves nothing");
  if (cond.baseline === false) reasons.push(`baseline: score - reader-free baseline ${cond.baseline_margin} < ${CONST.MIN_MARGIN}`);
  if (cond.fidelity === false) reasons.push(`fidelity: reader-vs-gold ${round(fidelity.s)} - strongest control ${round(Math.max(fidelity.mismatched ?? -Infinity, fidelity.baseline ?? -Infinity))} < ${CONST.MIN_MARGIN} (n ${fidelity.n})`);
  const evaluated = ["nonEmpty", "permutation", "effect", "licence", "causality", "baseline", "fidelity"].filter((k) => cond[k] !== undefined);
  const failed = evaluated.some((k) => cond[k] === false);
  if (!failed && unevaluated.length) reasons.push(`unevaluated: ${unevaluated.join(", ")} (no verdict can be true without it)`);
  const pass = failed ? false : unevaluated.length ? null : true;
  return { pass, cond, reasons, licence, unevaluated };
}

// ---- the fixture: bundles, manifest -------------------------------------------------------------------------------------------
/** Split a bundle ("@@@@ task <id>" markers) into Map task -> program text. */
export function parseBundle(text) {
  const out = new Map();
  const marks = [...String(text).matchAll(/^@@@@ task ([a-z_]+)[ \t]*\r?\n/gm)];
  marks.forEach((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    out.set(m[1], text.slice(start, end).replace(/\s+$/, "") + "\n");
  });
  return out;
}
export const bundlePath = (language, split = "dev") => path.join(TASK_DIR, split, `${language}.c5`);
export function loadBundle(language, split = "dev") {
  try { return parseBundle(fs.readFileSync(bundlePath(language, split), "utf8")); } catch { return null; }
}
export function authoredLanguages(split = "dev") {
  try { return fs.readdirSync(path.join(TASK_DIR, split)).filter((f) => f.endsWith(".c5")).map((f) => f.slice(0, -3)).sort(); } catch { return []; }
}
export const programFileName = (language, task) => `${task}.${EXT[language] ?? "txt"}`;
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export function loadManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(TASK_DIR, "MANIFEST.json"), "utf8")); } catch { return null; }
}
/** Does the manifest vouch for this program? -> {kept, executed, why} */
export function vouch(manifest, language, task, text) {
  if (!manifest) return { kept: false, executed: false, why: "fixture_manifest_absent" };
  const e = manifest.programs?.[language]?.[task];
  if (!e) return { kept: false, executed: false, why: "program_unvalidated" };
  if (e.sha256 !== sha256(text)) return { kept: false, executed: false, why: "program_changed_since_validation" };
  if (e.parse && e.parse.ok === false) return { kept: false, executed: !!e.executed, why: "parse_error" };
  if (e.executed && e.output_ok === false) return { kept: false, executed: true, why: "output_mismatch" };
  return { kept: true, executed: !!e.executed, why: null };
}

// ---- readers (systems) ------------------------------------------------------------------------------------------------------------
const EXISTING_EXT = { python: "py", javascript: "js", typescript: "ts", tsx: "tsx", c: "c", go: "go" };

// A5 F5: the reader-free BASELINE (`declRegexNoCalls`). Regular expressions for declaration syntax only; NO call sites, no khora code,
// no prior. Giver: the language reference's declaration syntax (def, class, function, method shorthand, func, type, struct, typedef,
// modifiers + return type + name + parameter list + opening brace). The stop list is the set of control keywords that the method
// shorthand shapes (`name(...) {`) share with `if (...) {`: it is part of the shape, not a prior.
const BASELINE_STOP = new Set(["if", "for", "while", "switch", "catch", "return", "function", "else", "do", "with", "try", "synchronized", "sizeof"]);
const DECL_REGEX = Object.freeze({
  python: [/^[ \t]*(?:async[ \t]+)?def[ \t]+([A-Za-z_]\w*)/gm, /^[ \t]*class[ \t]+([A-Za-z_]\w*)/gm],
  javascript: [
    /\bfunction[ \t]*\*?[ \t]*([A-Za-z_$][\w$]*)[ \t]*\(/g,
    /\bclass[ \t]+([A-Za-z_$][\w$]*)/g,
    /\b(?:const|let|var)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]*)?(?:function\b|\([^)]*\)[ \t]*=>|[A-Za-z_$][\w$]*[ \t]*=>)/g,
    /^[ \t]*(?:static[ \t]+|async[ \t]+|get[ \t]+|set[ \t]+)*([A-Za-z_$][\w$]*)[ \t]*\([^)\n]*\)[ \t]*\{/gm,
  ],
  c: [
    /^[A-Za-z_][\w \t*]*?[ \t*]([A-Za-z_]\w*)[ \t]*\([^;{}]*\)[ \t]*\{/gm,
    /\btypedef[ \t]+struct[ \t]+([A-Za-z_]\w*)[ \t]*\{/g,
    /^struct[ \t]+([A-Za-z_]\w*)[ \t]*\{/gm,
  ],
  go: [/^func[ \t]+(?:\([^)]*\)[ \t]*)?([A-Za-z_]\w*)[ \t]*\(/gm, /^type[ \t]+([A-Za-z_]\w*)[ \t]+(?:struct|interface)\b/gm],
  ruby: [/^[ \t]*def[ \t]+(?:self\.)?([A-Za-z_]\w*[?!=]?)/gm, /^[ \t]*(?:class|module)[ \t]+([A-Za-z_]\w*)/gm],
  java: [
    /\b(?:class|interface|enum|record)[ \t]+([A-Za-z_]\w*)/g,
    /^[ \t]*(?:(?:public|private|protected|static|final|abstract|synchronized|native)[ \t]+)*(?:<[^>\n]+>[ \t]+)?[\w<>\[\],.?]+[ \t]+([A-Za-z_]\w*)[ \t]*\([^)\n]*\)[ \t]*(?:throws[ \t]+[\w., ]+)?\{/gm,
    /^[ \t]*(?:public|private|protected)[ \t]+([A-Za-z_]\w*)[ \t]*\([^)\n]*\)[ \t]*(?:throws[ \t]+[\w., ]+)?\{/gm,
  ],
});
export const SYSTEM_LANGUAGES = (system) => (system === "edges" || system === "edges_lookahead" ? edgeLanguages() : system === "existing" ? Object.keys(EXISTING_EXT) : system === "baseline" ? Object.keys(DECL_REGEX) : null);
function kwFor(language) {
  try { const k = keywordsFor(language); return k?.keywords ?? null; } catch { return null; }
}
/** The edges reader's reading: {names, decls:[{name, at}] (earliest offset per name), calls:[{caller, callee, at}]}. */
export function readingEdges(text, language, fileName, { final = true } = {}) {
  const r = readEdges({ text, language, fileName, keywords: kwFor(language), final });
  const first = new Map();
  for (const d of r.declared ?? []) { const n = finalName(d.name); if (n && (!first.has(n) || d.at < first.get(n))) first.set(n, d.at); }
  return {
    names: [...first.keys()],
    decls: [...first].map(([name, at]) => ({ name, at })),
    calls: (r.calls ?? []).map((c) => ({ caller: c.caller === TOP ? TOP : finalName(c.caller), callee: finalName(c.callee), at: c.at })),
  };
}
/** The reader-free baseline's reading: declared names by regular expression, NO call sites. null for a language with no recipe. */
export function readingDeclRegex(text, language) {
  const res = DECL_REGEX[language];
  if (!res) return null;
  const first = new Map();
  for (const re of res) for (const m of String(text).matchAll(re)) { const nm = m[1]; if (!nm || BASELINE_STOP.has(nm)) continue; if (!first.has(nm) || m.index < first.get(nm)) first.set(nm, m.index); }
  return { names: [...first.keys()], decls: [...first].map(([name, at]) => ({ name, at })), calls: [] };
}
export function readingExisting(text, language, fileName) {
  let keywords = null;
  try { const code = { python: "python", javascript: "javascript", typescript: "javascript", tsx: "javascript", c: "c", go: "go" }[language]; const p = loadCodeKeywordPrior(code); keywords = p ? keywordSetOf(p) : null; } catch { keywords = null; }
  const ents = parseDeclarations(text, fileName, { keywords });
  const calls = [];
  for (const e of callEdges(text, ents)) for (let i = 0; i < (e.count ?? 1); i++) calls.push({ caller: e.caller, callee: e.callee });
  return { names: [...new Set(ents.map((e) => e.name))], calls };
}
const CALLER_KINDS = new Set(["function", "method", "class", "interface", "enum", "module"]);
const DECLARATOR_ONLY = new Set(["c", "cpp", "objc"]);
function defExtent(def, gold, text, language) {
  if (!DECLARATOR_ONLY.has(language)) return [def.start, def.end];
  const toks = gold.tokens ?? [];
  let lo = 0, hi = toks.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (toks[mid].start < def.end) lo = mid + 1; else hi = mid; }
  let i = lo;
  while (i < toks.length && toks[i].class === "comment") i += 1;
  if (i >= toks.length || text.slice(toks[i].start, toks[i].end) !== "{") return [def.start, def.end];
  let depth = 0;
  for (; i < toks.length; i++) {
    if (toks[i].class !== "punctuation") continue;
    const s = text.slice(toks[i].start, toks[i].end);
    if (s === "{") depth += 1;
    else if (s === "}") { depth -= 1; if (depth === 0) return [def.start, toks[i].end]; }
  }
  return [def.start, text.length];
}
export function readingGold(gold, text, language) {
  if (!gold || gold.error) return null;
  const defs = [];
  const names = new Map();
  for (const d of gold.defs ?? []) {
    if (!CORE_DEF_KINDS.includes(d.kind) || !d.name) continue;
    const n = finalName(d.name);
    if (!names.has(n) || d.start < names.get(n)) names.set(n, d.start);
    if (CALLER_KINDS.has(d.kind)) { const [s, e] = defExtent(d, gold, text, language); if (e > s) defs.push({ name: n, s, e }); }
  }
  const calls = [];
  for (const c of gold.calls ?? []) {
    let best = null;
    for (const d of defs) if (d.s <= c.start && c.start < d.e && (best === null || d.s >= best.s)) best = d;
    calls.push({ caller: best ? best.name : TOP, callee: finalName(c.callee), at: c.start });
  }
  return { names: [...names.keys()], decls: [...names].map(([name, at]) => ({ name, at })), calls };
}

// ---- frozen boilerplate (A5 F4) ------------------------------------------------------------------------------------------------------
export const BOILER_FILE = () => path.join(TASK_DIR, "boilerplate-dev.json");
export function loadFrozen() {
  try { const j = JSON.parse(fs.readFileSync(BOILER_FILE(), "utf8")); return j?.schema === "C5Boilerplate@1" ? j : null; } catch { return null; }
}
const FROZEN_SYSTEMS = ["edges", "existing", "gold", "baseline"];
/** Which (system, language) entries a run over `languages` would need and the frozen file lacks. */
export function frozenMissing(fz, languages) {
  const out = [];
  for (const l of languages) {
    if (NOT_APPLICABLE[l]) continue;
    for (const system of FROZEN_SYSTEMS) {
      const reads = system === "gold" ? true : (SYSTEM_LANGUAGES(system) ?? []).includes(l);
      if (reads && !Array.isArray(fz?.systems?.[system]?.[l])) out.push({ system, language: l });
    }
  }
  return out;
}
/** Derive the boilerplate of every (system, language) ONCE from DEV and freeze it (CLI --freeze-boilerplate; refused for any other split). */
export async function freezeBoilerplate({ languages = null, write = true } = {}) {
  const ctx = await buildContext({ split: "dev", authority: true, languages, adversarial: false, frozenOverride: null });
  const systems = Object.fromEntries(FROZEN_SYSTEMS.map((s) => [s, {}]));
  for (const system of FROZEN_SYSTEMS) {
    for (const l of ctx.authored) {
      if (NOT_APPLICABLE[l]) continue;
      const reads = readingsOf(ctx, system, l);
      if (reads) systems[system][l] = [...deriveBoilerplate(reads)].sort();
    }
  }
  const out = {
    schema: "C5Boilerplate@1",
    derived_from: "dev",
    rule: `names a system declares in >= ${CONST.BOILER_SHARE} of >= ${CONST.BOILER_MIN_PROGRAMS} non-empty readings of one language (header, READING -> ALGORITHMIC GRAPH); derived ONCE on DEV, frozen, never re-derived from the programs under evaluation (A5 F4)`,
    giver: "the language reference's entry-point convention (an entry point main in c, go, java; the wrapper class holding it in java), as DEV shows it",
    derived_at: new Date().toISOString(),
    bundles_sha256: Object.fromEntries([...ctx.bundleSha]),
    systems,
  };
  if (write) { fs.mkdirSync(TASK_DIR, { recursive: true }); fs.writeFileSync(BOILER_FILE(), JSON.stringify(out, null, 1) + "\n"); }
  return out;
}

// ---- the context (programs, readings, caches) -----------------------------------------------------------------------------------
const ADV_DIR = () => path.join(TASK_DIR, "adversarial");
export function loadAdversarialManifest() {
  try { return JSON.parse(fs.readFileSync(path.join(ADV_DIR(), "MANIFEST.json"), "utf8")); } catch { return null; }
}
function loadAdversarial(languages) {
  const manifest = loadAdversarialManifest();
  const programs = new Map(); // language -> Map task -> {text, kept, executed, why, applicable, reason}
  for (const language of ADVERSARIAL_LANGUAGES) {
    if (languages && !languages.includes(language)) continue;
    let b = null;
    try { b = parseBundle(fs.readFileSync(path.join(ADV_DIR(), `${language}.c5`), "utf8")); } catch { b = null; }
    if (!b) continue;
    const m = new Map();
    for (const T of ADVERSARIAL) {
      const sp = T.spec[language];
      if (!sp) { m.set(T.id, { text: null, kept: false, executed: false, why: "no_spec_for_language", applicable: false }); continue; }
      if (sp.na) { m.set(T.id, { text: null, kept: false, executed: false, why: null, applicable: false, reason: sp.na }); continue; }
      const text = b.get(T.id);
      if (text === undefined) { m.set(T.id, { text: null, kept: false, executed: false, why: "program_not_authored", applicable: true }); continue; }
      m.set(T.id, { text, applicable: true, ...vouch(manifest, language, T.id, text) });
    }
    programs.set(language, m);
  }
  return { manifest, programs, gold: new Map() };
}
export async function buildContext({ split = "dev", limit = null, authority = true, languages = null, adversarial = null, frozenOverride = undefined } = {}) {
  const tasks = TASK_IDS.slice(0, limit && limit > 0 ? limit : TASK_IDS.length);
  const manifest = loadManifest();
  const authored = authoredLanguages(split).filter((l) => !languages || languages.includes(l));
  const programs = new Map(); // language -> Map task -> {text, kept, executed, why}
  const bundleSha = new Map();
  for (const language of authored) {
    const b = loadBundle(language, split) ?? new Map();
    try { bundleSha.set(language, sha256(fs.readFileSync(bundlePath(language, split), "utf8"))); } catch { /* absent */ }
    const m = new Map();
    for (const t of tasks) {
      const text = b.get(t);
      if (text === undefined) { m.set(t, { text: null, kept: false, executed: false, why: "program_not_authored" }); continue; }
      m.set(t, { text, ...vouch(manifest, language, t, text) });
    }
    programs.set(language, m);
  }
  const adv = (adversarial ?? split === "dev") ? loadAdversarial(languages) : null;
  const frozen = frozenOverride !== undefined ? frozenOverride : loadFrozen();
  const ctx = { split, tasks, manifest, programs, authored, authority, reads: new Map(), algos: new Map(), gold: new Map(), notes: [], adv, frozen, bundleSha };
  if (authority) await prefetchGold(ctx);
  return ctx;
}
async function prefetchGold(ctx) {
  const av = goldAvailable();
  if (!av.available) { ctx.goldUnavailable = av.reason; return; }
  const items = [];
  const advItems = [];
  for (const [language, m] of ctx.programs) for (const [task, p] of m) if (p.kept && p.text !== null) items.push({ language, task, text: p.text, fileName: programFileName(language, task) });
  if (ctx.adv) for (const [language, m] of ctx.adv.programs) for (const [task, p] of m) if (p.kept && p.text !== null) advItems.push({ language, task, text: p.text, fileName: programFileName(language, task) });
  const all = [...items, ...advItems];
  const res = await goldBatch(all.map(({ language, text, fileName }) => ({ language, text, fileName })), { chunk: 60 });
  all.forEach((it, i) => (i < items.length ? ctx.gold : ctx.adv.gold).set(`${it.language}|${it.task}`, res[i]));
}
/** Readings of every kept program of a language by a system -> Map task -> reading | null (system cannot read the language). */
export function readingsOf(ctx, system, language) {
  if (system === "edges_lookahead") system = "edges"; // the same readings; only the A filter differs (algoSet)
  const key = `${system}|${language}`;
  if (ctx.reads.has(key)) return ctx.reads.get(key);
  const progs = ctx.programs.get(language);
  let out = null;
  if (progs) {
    if (system === "gold") {
      out = ctx.goldUnavailable ? null : new Map();
      // A5 F1: a kept program that gold could not read stays in the map as an empty reading (flagged), it is not silently dropped
      if (out) for (const [task, p] of progs) { if (!p.kept) continue; const r = readingGold(ctx.gold.get(`${language}|${task}`), p.text, language); out.set(task, r ?? { names: [], decls: [], calls: [], error: "gold_unreadable" }); }
    } else if ((SYSTEM_LANGUAGES(system) ?? []).includes(language)) {
      out = new Map();
      for (const [task, p] of progs) {
        if (!p.kept) continue;
        const fileName = programFileName(language, task);
        try { out.set(task, system === "edges" ? readingEdges(p.text, language, fileName) : system === "baseline" ? readingDeclRegex(p.text, language) : readingExisting(p.text, language, fileName)); } catch (e) { out.set(task, { names: [], decls: [], calls: [], error: String(e?.message ?? e) }); }
      }
    }
  }
  ctx.reads.set(key, out);
  return out;
}
/** The boilerplate of a (system, language): FROZEN from DEV (A5 F4); derived in the run only on DEV when no entry is frozen (labelled). */
export function boilerFor(ctx, system, language, reads) {
  const fz = ctx.frozen?.systems?.[system]?.[language];
  if (Array.isArray(fz)) return { set: new Set(fz), source: "frozen_dev" };
  if (ctx.split !== "dev") throw new Error(`no frozen boilerplate for ${system}/${language}: it is never derived from the programs under evaluation`);
  return { set: deriveBoilerplate(reads), source: "derived_on_dev" };
}
/** Algorithmic readings of a (system, language): Map task -> {names, edges, forwardRefs}. The headline `edges` is causal; `edges_lookahead` is the labelled whole-file variant. */
export function algoSet(ctx, system, language) {
  const key = `${system}|${language}`;
  if (ctx.algos.has(key)) return ctx.algos.get(key);
  const base = system === "edges_lookahead" ? "edges" : system;
  const reads = readingsOf(ctx, base, language);
  let out = null;
  if (reads) {
    const { set: boiler, source } = boilerFor(ctx, base, language, reads);
    const causal = system === "edges";
    const algo = new Map();
    let forwardRefs = 0;
    for (const [t, r] of reads) { const a = algorithmic(r, boiler, { causal }); algo.set(t, a); forwardRefs += a.forwardRefs; }
    out = { algo, boiler: [...boiler].sort(), boilerSet: boiler, boilerSource: source, forwardRefs, causal };
  }
  ctx.algos.set(key, out);
  return out;
}

// ---- the causality audit (A5 F2) ----------------------------------------------------------------------------------------------------
const callKey = (c) => `${c.caller}${SEP}${c.callee}${SEP}${c.at}`;
const edgeKey = (e) => `${e[0]}${SEP}${e[1]}${SEP}${e[2]}`;
/**
 * Causality audit of the edges reader on one language's kept programs. EVERY character offset is a cut (stride 1). For each prefix read with
 * final:false, an item of the RAW reading (declared name, call site) or of the ALGORITHMIC reading (after the boilerplate and the causal A
 * filter) that the full-file reading does not contain is a RETRACTION. LICENCE (II.23): the same sweep is repeated with two mutant readers
 * built to fail, M1 (the prefix read with final:true) and M2 (the prefix with "(" appended when it ends inside an identifier, read with
 * final:true); the audit is VALID only if the mutants are retracted at least once. `reader` is injectable (tests build non-causal readers).
 */
export function causalAudit(ctx, language, { boiler = new Set(), stride = CONST.AUDIT_STRIDE, reader = readingEdges, mutants = true, programs = null } = {}) {
  const progs = programs ?? ctx.programs.get(language);
  const examples = [];
  let files = 0, cuts = 0, raw = 0, alg = 0;
  const mut = { final_true: 0, ident_open_paren: 0 };
  const note = (e) => { if (examples.length < 5) examples.push(e); };
  for (const [task, p] of progs ?? []) {
    if (!p.kept) continue;
    const fileName = programFileName(language, task);
    let full;
    try { full = reader(p.text, language, fileName); } catch { continue; }
    files += 1;
    const fullNames = new Set(full.names);
    const fullCalls = new Set(full.calls.map(callKey));
    const fa = full.decls ? algorithmic(full, boiler, { causal: true }) : null;
    const faNames = new Set(fa?.names ?? []);
    const faEdges = new Set((fa?.edges ?? []).map(edgeKey));
    const outside = (r) => { let v = 0; for (const n of r.names) if (!fullNames.has(n)) v += 1; for (const c of r.calls) if (!fullCalls.has(callKey(c))) v += 1; return v; };
    for (let cut = 1; cut < p.text.length; cut += Math.max(1, stride)) {
      const pre = p.text.slice(0, cut);
      let r;
      try { r = reader(pre, language, fileName, { final: false }); } catch { continue; }
      cuts += 1;
      for (const nm of r.names) if (!fullNames.has(nm)) { raw += 1; note({ task, cut, kind: "name", value: nm }); }
      for (const c of r.calls) if (!fullCalls.has(callKey(c))) { raw += 1; note({ task, cut, kind: "call", value: `${c.caller}->${c.callee}@${c.at}` }); }
      if (fa && r.decls) {
        const pa = algorithmic(r, boiler, { causal: true });
        for (const nm of pa.names) if (!faNames.has(nm)) { alg += 1; note({ task, cut, kind: "algorithmic_name", value: nm }); }
        for (const e of pa.edges) if (!faEdges.has(edgeKey(e))) { alg += 1; note({ task, cut, kind: "algorithmic_edge", value: `${e[0]}->${e[1]}@${e[2]}` }); }
      }
      if (mutants) {
        try { mut.final_true += outside(reader(pre, language, fileName, { final: true })); } catch { /* a mutant that throws is not retracted */ }
        if (/[A-Za-z0-9_$]$/.test(pre)) { try { mut.ident_open_paren += outside(reader(`${pre}(`, language, fileName, { final: true })); } catch { /* idem */ } }
      }
    }
  }
  const mutTotal = mut.final_true + mut.ident_open_paren;
  return { files, cuts, stride, retracted: raw + alg, raw, algorithmic: alg, examples, licence_ok: mutants && mutTotal > 0, licence: { ok: mutants && mutTotal > 0, mutants: mut, note: "M1 = prefix read with final:true; M2 = prefix plus '(' read with final:true when the cut ends inside an identifier; the audit is valid only if a mutant is retracted" } };
}

// ---- per-system analysis of one language ------------------------------------------------------------------------------------------
function compact(a, rule, extra = {}) {
  if (!a || a.empty) return { empty: true, ...extra };
  return {
    n_tasks: a.nTasks, n_partners: a.nPartners, partners: a.partners, n_pairs: a.nPairs,
    non_empty: a.nonEmpty, partners_dropped: a.partnersDropped,
    score: round(a.same.s), control_taskPair: round(a.cross.s),
    arms: Object.fromEntries(Object.entries(a.arms).map(([k, v]) => [k, round(v.s)])),
    channels_same: Object.fromEntries(CH.filter((c) => c !== "s").map((c) => [c, round(a.same[c])])),
    channels_cross: Object.fromEntries(CH.filter((c) => c !== "s").map((c) => [c, round(a.cross[c])])),
    arm_channels: Object.fromEntries(Object.entries(a.arms).map(([k, v]) => [k, { J: round(v.J), S: round(v.S), L: round(v.L) }])),
    permutation: { p: round(a.perm.p, 6), null_mean: round(a.perm.nullMean), null_sd: round(a.perm.nullSd), perms: a.perm.perms },
    top1: round(a.top1), chance: round(a.chance),
    per_task: a.perTask,
    pass_rule_met: rule?.pass ?? null, conditions: rule?.cond, reasons: rule?.reasons, licence: rule?.licence,
    ...extra,
  };
}
function analyseSystem(ctx, system, language) {
  const mine = algoSet(ctx, system, language);
  if (!mine) return { gap: system === "gold" ? "gold_unavailable" : "reader_absent" };
  const partners = [];
  const excluded = [];
  for (const l of ctx.authored) {
    if (l === language) continue;
    if (NOT_APPLICABLE[l]) { excluded.push({ language: l, reason: "not_applicable" }); continue; }
    const p = algoSet(ctx, system, l);
    if (p) partners.push({ language: l, algo: p.algo });
    else excluded.push({ language: l, reason: system === "gold" ? "gold_unavailable" : "no_reader_for_language" });
  }
  const a = analyse({ focus: mine.algo, partners, tasks: ctx.tasks, seed: seedOf("c5", system === "edges_lookahead" ? "edges" : system, language) });
  return { a, boiler: mine.boiler, boilerSource: mine.boilerSource, forwardRefs: mine.forwardRefs, partnersConsidered: partners.length, partnersExcluded: excluded };
}
/** Agreement of a reader's graphs with the spec truth and with gold, per program (diagnostics, not gating). */
function fidelity(ctx, system, language) {
  const mine = algoSet(ctx, system, language);
  if (!mine) return null;
  const spec = (t) => { const T = TASKS.find((x) => x.id === t); return graphOf({ names: T.entities, edges: T.edges.flatMap(([c, e, n]) => Array(n).fill([c, e])) }); };
  const gold = system === "gold" ? null : algoSet(ctx, "gold", language);
  const rows = [];
  for (const t of ctx.tasks) {
    const a = mine.algo.get(t);
    if (!a) continue;
    const g = graphOf(a);
    const vs = pairScore(g, spec(t));
    const row = { task: t, vs_spec: { J: round(vs.J), S: round(vs.S), L: round(vs.L), s: round(vs.s) } };
    const ga = gold?.algo.get(t);
    if (ga) { const x = pairScore(g, graphOf(ga)); row.vs_gold = { J: round(x.J), S: round(x.S), L: round(x.L), s: round(x.s) }; }
    rows.push(row);
  }
  const avg = (key, ch) => { const v = rows.map((r) => r[key]?.[ch]).filter((x) => x != null); return v.length ? round(mean(v)) : null; };
  return { n: rows.length, vs_spec: { J: avg("vs_spec", "J"), S: avg("vs_spec", "S"), L: avg("vs_spec", "L"), s: avg("vs_spec", "s") }, vs_gold: gold ? { J: avg("vs_gold", "J"), S: avg("vs_gold", "S"), L: avg("vs_gold", "L"), s: avg("vs_gold", "s") } : null, per_task: rows };
}
/**
 * A5 F5 (h): fidelity of the headline reader to INDEPENDENT gold, per kept program, with its controls. The denominator is every kept program
 * that gold could read; an empty edges reading counts 0 (F1). `mismatched` = mean s(reader_t, gold_u) over t != u; `baseline` = mean
 * s(declRegexNoCalls_t, gold_t). Pure function of three algorithmic maps (tests feed it directly).
 */
export function fidelityStats(readerAlgo, goldAlgo, baselineAlgo, tasks) {
  const T = tasks.filter((t) => readerAlgo.has(t) && goldAlgo.has(t) && goldAlgo.get(t).names.length > 0);
  const missingGold = tasks.filter((t) => readerAlgo.has(t) && !(goldAlgo.has(t) && goldAlgo.get(t).names.length > 0));
  if (!T.length) return { n: 0, of: readerAlgo.size, missing_gold: missingGold, s: null };
  const R = new Map(T.map((t) => [t, graphOf(readerAlgo.get(t))]));
  const G = new Map(T.map((t) => [t, graphOf(goldAlgo.get(t))]));
  const same = mean(T.map((t) => pairScore(R.get(t), G.get(t)).s));
  const off = [];
  for (const t of T) for (const u of T) if (t !== u) off.push(pairScore(R.get(t), G.get(u)).s);
  const base = baselineAlgo ? mean(T.map((t) => (baselineAlgo.has(t) ? pairScore(graphOf(baselineAlgo.get(t)), G.get(t)).s : 0))) : null;
  return { n: T.length, of: readerAlgo.size, missing_gold: missingGold, s: same, mismatched: off.length ? mean(off) : null, baseline: base };
}
function fidelityGate(ctx, language) {
  const R = algoSet(ctx, "edges", language), G = algoSet(ctx, "gold", language), B = algoSet(ctx, "baseline", language);
  if (!R || !G) return null;
  return fidelityStats(R.algo, G.algo, B?.algo ?? null, ctx.tasks);
}

// ---- the adversarial arm (A5 F3) ------------------------------------------------------------------------------------------------------
/** Read one adversarial program's algorithmic reading against its spec -> {ok, missing_entities, missing_edges, extra_edges}. Pure. */
export function scoreAdversarial(spec, algo) {
  const have = new Set((algo?.names ?? []).map(labelOf));
  const missingEntities = spec.entities.filter((e) => !have.has(labelOf(e)));
  const want = new Map();
  for (const [c, e, n] of spec.edges) want.set(`${labelOf(c)}${SEP}${labelOf(e)}`, (want.get(`${labelOf(c)}${SEP}${labelOf(e)}`) ?? 0) + n);
  const got = new Map();
  for (const [c, e] of algo?.edges ?? []) { const k = `${labelOf(c)}${SEP}${labelOf(e)}`; got.set(k, (got.get(k) ?? 0) + 1); }
  const show = (k) => k.split(SEP).join("->");
  const missing = [], extra = [];
  for (const [k, n] of want) { const g = got.get(k) ?? 0; if (g < n) missing.push(`${show(k)} x${n - g}`); }
  for (const [k, g] of got) { const n = want.get(k) ?? 0; if (g > n) extra.push(`${show(k)} x${g - n}`); }
  return { ok: !missingEntities.length && !missing.length && !extra.length, missing_entities: missingEntities, missing_edges: missing, extra_edges: extra };
}
function adversarialArm(ctx, language) {
  const progs = ctx.adv?.programs.get(language);
  if (!progs) return { authored: false, gaps: [{ reason: "no_adversarial_program", count: 1, detail: `no c5-tasks/adversarial/${language}.c5 bundle (adversarial languages: ${ADVERSARIAL_LANGUAGES.join(", ")})` }] };
  const bE = algoSet(ctx, "edges", language)?.boilerSet ?? new Set(); // frozen from DEV (or labelled derived_on_dev)
  const bG = algoSet(ctx, "gold", language)?.boilerSet ?? new Set();
  const rows = [];
  const gaps = [];
  for (const T of ADVERSARIAL) {
    const p = progs.get(T.id);
    const sp = T.spec[language];
    if (!p || !sp) { rows.push({ task: T.id, applicable: false, reason: "no_spec_for_language" }); continue; }
    if (sp.na) { rows.push({ task: T.id, feature: T.feature, applicable: false, reason: sp.na }); continue; }
    if (!p.kept) { rows.push({ task: T.id, feature: T.feature, applicable: true, kept: false, why: p.why }); gaps.push({ reason: p.why ?? "program_unvalidated", count: 1, of: 1, detail: `adversarial ${T.id}` }); continue; }
    const fileName = programFileName(language, T.id);
    const row = { task: T.id, feature: T.feature, applicable: true, kept: true, executed: p.executed };
    try {
      const r = readingEdges(p.text, language, fileName);
      row.causal = scoreAdversarial(sp, algorithmic(r, bE, { causal: true }));
      row.lookahead = scoreAdversarial(sp, algorithmic(r, bE, { causal: false }));
      row.forward_refs_dropped = algorithmic(r, bE, { causal: true }).forwardRefs;
    } catch (e) { row.causal = { ok: false, error: String(e?.message ?? e) }; row.lookahead = { ok: false, error: String(e?.message ?? e) }; }
    const g = ctx.adv.gold.get(`${language}|${T.id}`);
    const gr = readingGold(g, p.text, language);
    row.gold = gr ? scoreAdversarial(sp, algorithmic(gr, bG, { causal: false })) : { ok: null, why: "gold_unavailable" };
    rows.push(row);
    if (row.causal.ok === false) gaps.push({ reason: "adversarial_misread", feature: T.id, count: 1, of: 1, system: "edges (causal)", detail: { missing_entities: row.causal.missing_entities, missing_edges: row.causal.missing_edges, extra_edges: row.causal.extra_edges, lookahead_ok: row.lookahead.ok, gold_ok: row.gold.ok } });
  }
  const app = rows.filter((r) => r.applicable && r.kept);
  const tally = (k) => ({ ok: app.filter((r) => r[k]?.ok === true).length, of: app.length });
  return { authored: true, label: "AUTHORED by the model with knowledge of the reader's weak cases (A5 DISCLOSURE); not held-out; not gating", programs: rows, summary: { causal: tally("causal"), lookahead: tally("lookahead"), gold: tally("gold") }, gaps };
}

function fixtureGaps(ctx, language) {
  const progs = ctx.programs.get(language);
  const gaps = [];
  if (!progs) return { gaps, kept: 0, executed: 0, total: 0 };
  const by = new Map();
  let kept = 0, executed = 0;
  for (const [, p] of progs) { if (p.kept) { kept += 1; if (p.executed) executed += 1; } else by.set(p.why, (by.get(p.why) ?? 0) + 1); }
  for (const [reason, count] of by) gaps.push({ reason, count, of: progs.size });
  return { gaps, kept, executed, total: progs.size };
}

const gapResult = (base, { applicable = true, reason = null, gaps = [], notes = [], details = {} } = {}) => ({
  id: RUNG.id, rung: "R5", split: base.split, language: base.language, n: 0, applicable, ...(reason ? { reason } : {}), score: null, control: null, margin: null, pass: null,
  controls: {}, gaps, notes, details: { authored_fixture: true, ...details },
});

export const SMOKE_NOTE = "DEV RESULT = SMOKE TEST: the dev suite was authored after the reader's source was read (header A1 DISCLOSURE), so a dev PASS licenses 'the instrument and the reader run end to end', never 'the reader generalises'. Only a TEST suite authored by another hand, with no access to edges.js or to any dev result, can measure the reader.";

// ---- measure ---------------------------------------------------------------------------------------------------------------------------
export async function measure({ language, split = "dev", limit = null, authority = true, ctx = null, auditStride = CONST.AUDIT_STRIDE } = {}) {
  const asked = String(language ?? "");
  const lang = normLanguage(asked);
  const base = { language: asked, split };
  try {
    if (split === "test") {
      if (limit) return gapResult(base, { gaps: [{ reason: "limit_refused_on_test", count: 1 }], notes: ["limit is a DEV smoke-test device: a limited TEST read would spend the held-out set on a sample (rule 9)"] });
      if (auditStride !== CONST.AUDIT_STRIDE) return gapResult(base, { gaps: [{ reason: "audit_stride_refused_on_test", count: 1 }], notes: ["a strided causality audit is a DEV smoke-test device: the TEST audit sweeps every offset (A5 F2)"] });
      const have = authoredLanguages("test");
      if (!have.length) return gapResult(base, { gaps: [{ reason: "no_held_out_tasks", count: 1, detail: `c5-tasks/test/ holds no bundles; the 12 reserved TEST tasks (${RESERVED_TEST_TASKS.join(", ")}) are to be authored by another hand after the reader and this instrument are frozen` }], notes: ["C5 has no TEST data yet: a DEV result is never relabelled as TEST"] });
      if (NOT_APPLICABLE[lang]) return gapResult(base, { applicable: false, reason: NOT_APPLICABLE[lang] });
      // A5 F4: the boilerplate is frozen from DEV; without it a TEST read would derive it from the evaluated programs. Checked BEFORE the one-shot ledger is spent.
      const fz = loadFrozen();
      const miss = frozenMissing(fz, have);
      if (!fz || miss.length) return gapResult(base, { gaps: [{ reason: "no_frozen_boilerplate", count: miss.length || 1, detail: fz ? `${BOILER_FILE()} has no entry for ${miss.slice(0, 6).map((m) => `${m.system}/${m.language}`).join(", ")}${miss.length > 6 ? " ..." : ""}` : `${BOILER_FILE()} is absent: freeze it on DEV (--freeze-boilerplate) before a TEST read` }], notes: ["the boilerplate is never derived from the programs under evaluation; the TEST read was NOT consumed"] });
      let led = {};
      try { led = JSON.parse(fs.readFileSync(LEDGER(), "utf8")); } catch { led = {}; }
      if (led[`c5:${lang}`]) return gapResult(base, { gaps: [{ reason: "test_already_read", count: 1, detail: led[`c5:${lang}`] }], notes: ["TEST is consumed once per language (rule 9)"] });
      led[`c5:${lang}`] = new Date().toISOString();
      fs.mkdirSync(path.dirname(LEDGER()), { recursive: true });
      fs.writeFileSync(LEDGER(), JSON.stringify(led, null, 1));
    }
    if (NOT_APPLICABLE[lang]) return { ...gapResult(base, { applicable: false, reason: NOT_APPLICABLE[lang] }), pass: null };
    const c = ctx ?? await buildContext({ split, limit, authority });
    if (!c.authored.includes(lang)) {
      return gapResult(base, { gaps: [{ reason: LANGUAGES.includes(lang) ? "no_program_authored" : "language_not_in_c5_list", count: 1, detail: LANGUAGES.includes(lang) ? `no c5-tasks/${split}/${lang}.c5 bundle` : `${asked} is not in the instrument's 50-language vocabulary (LANGUAGES)` }], notes: ["unmeasured is not good (rule 8)"] });
    }
    const fx = fixtureGaps(c, lang);
    const gaps = [...fx.gaps];
    const notes = [`FIXTURE IS AUTHORED (model-written, labelled authored): not held-out natural data. ${fx.kept}/${fx.total} programs of ${lang} kept (${fx.executed} executed locally, ${fx.kept - fx.executed} validated by tree-sitter parse only, executed:false)`];
    if (split === "dev") notes.unshift(SMOKE_NOTE);
    if (!c.manifest) notes.push("c5-tasks/MANIFEST.json absent: the fixture is unvalidated, so no verdict is given");
    if (c.frozen && c.bundleSha.get(lang) && c.frozen.bundles_sha256?.[lang] && c.frozen.bundles_sha256[lang] !== c.bundleSha.get(lang)) notes.push(`frozen boilerplate is STALE for ${lang}: the dev bundle changed after the boilerplate was frozen`);
    const validated = Boolean(c.manifest);

    // systems (the analyses first: the headline's rule needs the baseline and the fidelity)
    const systems = {};
    const ana = {};
    for (const sys of ["edges", "edges_lookahead", "existing", "baseline", "gold"]) {
      if (sys === "gold" && !c.authority) { systems.gold = { skipped: "authority arm switched off (--no-authority)" }; continue; }
      const r = analyseSystem(c, sys, lang);
      if (r.gap) { systems[sys] = { gap: r.gap }; continue; }
      ana[sys] = r;
    }
    const caus = ana.edges ? causalAudit(c, lang, { boiler: algoSet(c, "edges", lang).boilerSet, stride: auditStride }) : null;
    const fgate = c.authority && ana.edges ? fidelityGate(c, lang) : null;
    const baselineEv = ana.baseline && !ana.baseline.a.empty ? { score: ana.baseline.a.same.s } : undefined;
    const rules = {};
    for (const sys of Object.keys(ana)) {
      const r = ana[sys];
      const head = sys === "edges";
      rules[sys] = passRule(r.a, head
        ? { causal: caus, validated, baseline: baselineEv, fidelity: fgate ?? undefined, gate: { baseline: true, fidelity: true } }
        : { causal: null, validated, gate: { baseline: false, fidelity: false } });
      const label = {
        edges: {},
        edges_lookahead: { gating: false, label: "NOT CAUSAL: whole-file A filter (a callee declared later counts as known); the A4 filter, kept as a labelled variant" },
        existing: { gating: false, note: "regex recipes, whole-file lookahead: not causal, never gates" },
        baseline: { gating: false, label: "reader-free baseline declRegexNoCalls: declaration regexes, NO call sites; the headline must beat it by MIN_MARGIN (condition g)" },
        gold: { gating: false, note: "authority arm: independent tree-sitter parse of the same authored programs" },
      }[sys];
      systems[sys] = compact(r.a, rules[sys], { boilerplate: r.boiler, boilerplate_source: r.boilerSource, ...(sys === "edges" || sys === "edges_lookahead" ? { forward_refs_dropped: r.forwardRefs } : {}), partners_excluded: r.partnersExcluded, ...(head ? { causality: caus } : {}), ...label });
    }
    const fid = {
      edges: ana.edges ? fidelity(c, "edges", lang) : null,
      existing: ana.existing ? fidelity(c, "existing", lang) : null,
      gold: c.authority && ana.gold ? fidelity(c, "gold", lang) : null,
    };
    const adv = c.adv ? adversarialArm(c, lang) : { authored: false, gaps: [{ reason: "no_adversarial_arm_on_split", count: 1, detail: `the adversarial arm runs on dev only` }] };
    const details = { authored_fixture: true, tasks: c.tasks, fixture: { kept: fx.kept, executed: fx.executed, total: fx.total }, systems, fidelity: fid, fidelity_gate: fgate, adversarial: adv, headline_system: "edges",
      evidence: split === "dev" ? { class: "dev_smoke", blind: false, why: "the dev suite was authored after the reader's source was read (A1 DISCLOSURE); only a TEST suite from another hand can measure the reader" } : { class: "held_out_authored", blind: null, why: "TEST bundles are authored; whether their author was blind to the reader is not recorded by the instrument" } };
    if (systems.gold?.n_tasks) details.authority = { system: "gold", score: systems.gold.score, control_taskPair: systems.gold.control_taskPair, pass_rule_met: systems.gold.pass_rule_met, n_partners: systems.gold.n_partners };

    const head = ana.edges;
    if (!head) {
      gaps.unshift({ reason: "reader_absent", count: 1, detail: `no causal khora reader for ${lang} (adapters/code/edges.js reads ${edgeLanguages().join(", ")})${ana.existing ? "; the shipped regex reader (existing arm) is reported in details.systems.existing but is not causal and never gates" : ""}` });
      notes.push(`unmeasured is not good: ${lang} has no causal reader, so the khora verdict is a typed gap; the authority arm is in details.authority`);
      return { ...gapResult(base, { gaps, notes, details }), n: 0 };
    }
    if (head.a.empty) {
      gaps.unshift({ reason: "no_analysable_readings", count: 1, detail: `no kept program of ${lang}, or no partner language with >= ${Math.min(CONST.MIN_TASKS, c.tasks.length)} kept programs (${head.partnersConsidered} partner languages considered, ${head.a.partnersDropped?.length ?? 0} below the floor)` });
      notes.push("unmeasured is not good: nothing to compare, so the verdict is a typed gap (a fixture gap, not a reader failure)");
      return { ...gapResult(base, { gaps, notes, details }), n: 0 };
    }
    const a = head.a;
    const rule = rules.edges;
    // survivorship accounting (A5 F1): what the reader and its partners did NOT read stays in the ledger
    const ne = a.nonEmpty;
    if (ne.focus.non_empty < ne.focus.of) gaps.push({ reason: "empty_reading", count: ne.focus.of - ne.focus.non_empty, of: ne.focus.of, detail: `kept programs of ${lang} the edges reader read as empty: scored 0 against every partner` });
    for (const p of ne.partners) if (p.non_empty < p.of) gaps.push({ reason: "partner_empty_reading", count: p.of - p.non_empty, of: p.of, detail: `partner ${p.language}` });
    for (const d of a.partnersDropped ?? []) gaps.push({ reason: "partner_below_floor", count: 1, detail: `${d.language}: ${d.kept} kept programs < ${d.floor}` });
    if (head.forwardRefs > 0) {
      const lookEdges = [...algoSet(c, "edges_lookahead", lang).algo.values()].reduce((x, y) => x + y.edges.length, 0);
      gaps.push({ reason: "forward_reference_dropped", count: head.forwardRefs, of: lookEdges, detail: "algorithmic call sites whose callee is declared at a LATER offset: dropped by the causal A filter (the edges_lookahead variant keeps them); a labelled cost of causality" });
    }
    if (fgate?.missing_gold?.length) gaps.push({ reason: "gold_unreadable", count: fgate.missing_gold.length, of: fgate.of, detail: `kept programs gold could not read: ${fgate.missing_gold.join(", ")} (excluded from the fidelity statistic only)` });
    if (!c.authority) gaps.push({ reason: "fidelity_unevaluated", count: 1, detail: "authority arm switched off: the independent-gold condition (h) is unevaluated, so no verdict can be true" });
    else if (c.goldUnavailable) gaps.push({ reason: "gold_unavailable", count: 1, detail: c.goldUnavailable });
    if (!baselineEv) gaps.push({ reason: "baseline_unevaluated", count: 1, detail: `no reader-free baseline for ${lang} (DECL_REGEX has ${Object.keys(DECL_REGEX).join(", ")}): condition (g) unevaluated` });
    if (split === "dev") for (const g of adv.gaps ?? []) gaps.push(g);

    const baselineScore = baselineEv?.score ?? null;
    const controls = { taskPair: round(a.cross.s), shuffledIdentifiers: round(a.arms.shuffledIdentifiers.s), shuffledGraphs: round(a.arms.shuffledGraphs.s), noReading: round(a.arms.noReading.s), ...(baselineScore !== null ? { declRegexNoCalls: round(baselineScore) } : {}) };
    const score = a.same?.s ?? null;
    const control = Math.max(...Object.values(controls));
    const result = {
      id: RUNG.id, rung: "R5", split, language: asked, n: a.nPairs ?? 0, applicable: true,
      score: round(score), control: round(control), margin: round(score - control), pass: rule.pass, ...(split === "dev" ? { smoke_only: true } : {}),
      controls, gaps, notes,
      details: { ...details, partners: a.partners, boilerplate: head.boiler, boilerplate_source: head.boilerSource, non_empty: ne, forward_references: { dropped: head.forwardRefs, note: "call sites whose callee is declared at a LATER offset (dropped by the causal A filter); the edges_lookahead system keeps them" },
        pass_rule: { conditions: rule.cond, reasons: rule.reasons, unevaluated: rule.unevaluated }, licence: rule.licence, causality: caus,
        baseline: baselineEv ? { system: "declRegexNoCalls", same_task_score: round(baselineScore), margin: round(score - baselineScore), required: CONST.MIN_MARGIN } : null,
        permutation: { p: round(a.perm.p, 6), null_mean: round(a.perm.nullMean), perms: a.perm.perms }, channels_same: systems.edges.channels_same, channels_cross: systems.edges.channels_cross,
        shuffledLabels: { s: round(a.arms.shuffledLabels.s), L: round(a.arms.shuffledLabels.L), real_L: round(a.same.L), note: "declared blind spot of the composite: s is unchanged by construction, L drops" },
        top1: round(a.top1), chance: round(a.chance), per_task: a.perTask },
    };
    if (rule.pass === null) result.gaps.push({ reason: "unmeasured", count: 1, detail: rule.reasons.join("; ") });
    if (rule.pass === false) result.notes.push(`FAILED: ${rule.reasons.join("; ")}`);
    return result;
  } catch (e) {
    return { ...gapResult(base, { gaps: [{ reason: "error", count: 1, detail: String(e?.message ?? e).slice(0, 300) }] }), details: { error: String(e?.stack ?? e).slice(0, 1200) } };
  }
}

export async function measureAll({ languages = null, split = "dev", limit = null, authority = true, auditStride = CONST.AUDIT_STRIDE } = {}) {
  const list = languages?.length ? languages : [...new Set([...authoredLanguages(split), ...Object.keys(NOT_APPLICABLE)])];
  if (split === "test") {
    const perLanguage = {};
    for (const l of list) perLanguage[l] = await measure({ language: l, split, limit, auditStride });
    return { perLanguage, pairs: [], notes: ["split test: read only the languages asked for"] };
  }
  const ctx = await buildContext({ split, limit, authority });
  const perLanguage = {};
  for (const l of list) perLanguage[l] = await measure({ language: l, split, limit, authority, ctx, auditStride });
  // language-pair table: same-task vs different-task mean score for every pair of authored languages, per system. A5 F1: every kept program
  // counts; an empty reading scores 0 against its partner (it is not dropped).
  const pairs = [];
  for (const system of ["edges", "edges_lookahead", "existing", "baseline", ...(authority ? ["gold"] : [])]) {
    const langs = ctx.authored.filter((l) => !NOT_APPLICABLE[l] && readingsOf(ctx, system, l));
    const graphs = new Map(langs.map((l) => { const s = algoSet(ctx, system, l); return [l, new Map([...s.algo].map(([t, a]) => [t, graphOf(a)]))]; }));
    for (let i = 0; i < langs.length; i++) for (let j = i + 1; j < langs.length; j++) {
      const A = graphs.get(langs[i]), B = graphs.get(langs[j]);
      const same = [], diff = [];
      for (const [ta, ga] of A) for (const [tb, gb] of B) (ta === tb ? same : diff).push(pairScore(ga, gb).s);
      if (same.length >= CONST.MIN_TASKS) pairs.push({ a: langs[i], b: langs[j], system, n_tasks: same.length, same: round(mean(same)), control: round(mean(diff)), margin: round(mean(same) - mean(diff)) });
    }
  }
  const notes = [`C5 over ${ctx.authored.length} authored languages, ${ctx.tasks.length} tasks, split ${split}${limit ? ` (limit ${limit})` : ""}; authored fixture, not natural data`];
  if (split === "dev") notes.unshift(SMOKE_NOTE);
  if (ctx.goldUnavailable) notes.push(`gold unavailable: ${ctx.goldUnavailable}`);
  return { perLanguage, pairs, notes, tasks: ctx.tasks, authored: ctx.authored };
}

// ---- CLI -----------------------------------------------------------------------------------------------------------------------------------
async function main(argv) {
  const arg = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const split = arg("--split", "dev");
  const limit = arg("--limit") ? Number(arg("--limit")) : null;
  const auditStride = arg("--audit-stride") ? Number(arg("--audit-stride")) : CONST.AUDIT_STRIDE;
  const authority = !argv.includes("--no-authority");
  if (argv.includes("--freeze-boilerplate")) {
    if (split !== "dev") { console.error("the boilerplate is frozen from DEV only"); process.exit(2); }
    const out = await freezeBoilerplate({ languages: arg("--language") ? arg("--language").split(",").map(normLanguage) : null });
    console.log(JSON.stringify({ file: BOILER_FILE(), systems: out.systems }));
    return;
  }
  const lang = arg("--language");
  if (!lang) { console.error("usage: node c5-agree.mjs --language <lang|a,b,c|all> [--split dev|test] [--limit N] [--audit-stride N] [--no-authority] | --freeze-boilerplate"); process.exit(2); }
  fs.mkdirSync(OUT_DIR(), { recursive: true });
  if (lang === "all" || lang.includes(",")) {
    const r = await measureAll({ languages: lang === "all" ? null : lang.split(",").map(normLanguage), split, limit, authority, auditStride });
    const file = path.join(OUT_DIR(), `c5-all-${split}.json`);
    fs.writeFileSync(file, JSON.stringify(r));
    const sum = Object.fromEntries(Object.entries(r.perLanguage).map(([l, x]) => [l, x.applicable === false ? "na" : x.pass === true ? "pass" : x.pass === false ? "fail" : "null"]));
    console.log(JSON.stringify({ file, summary: sum, pairs: r.pairs.length, notes: r.notes }));
    return;
  }
  const r = await measure({ language: lang, split, limit, authority, auditStride });
  fs.writeFileSync(path.join(OUT_DIR(), `c5-${lang}-${split}.json`), JSON.stringify(r));
  console.log(JSON.stringify(r));
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((e) => { console.error(e?.stack ?? e); process.exit(2); });
}
