// eval/notation-competence/chess_pgn.mjs — competence ladder R0..R5 for CHESS RECORDS (SAN inside PGN).
//
//   node eval/notation-competence/chess_pgn.mjs [--split dev|test] [--limit N]      (prints the card; also written to
//                                                                                    /private/tmp/claude-501/notation/chess_pgn/results/)
//   import { FAMILY, measure } from "./chess_pgn.mjs"       measure({split="dev", limit=null}) -> { family, rungs: { r0..r5 } }
//
// SYSTEM UNDER TEST: adapters/notation/chess_pgn.js (a notation adapter: ear -> tokens with class, read -> beings + relations, an
// identifier for R0), reading with RECEIVED priors only: priors/notation-chess_pgn-{lexicon,rules,identity}.json. The kernel is not
// touched. python-chess is the GOLD AUTHORITY (external oracle; GPL, never vendored, never imported by the adapter); the adapter is
// never the gold. Gold is built by chess_pgn-data.py, which never runs the adapter.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file; no threshold below is tuned after a ═══
// ═══ result; a failure is reported as a failure; amendments are appended as dated blocks and the registration digest moves)   ═══
//
// DISCLOSURE (what was seen before this header was written). Corpus-level facts about the DATA only, no reader output: the dev month has
// 1,191 selected games of which python-chess cannot resolve 27 (natural illegal king moves in over-the-board records; the test month has 0
// of 2,661), 112,726 brace comments in dev (engine eval/clock annotations and prose such as "Inaccuracy. Re8 was best."), no variations,
// no FEN set-ups, no null moves, no NAGs, no non-standard variants and no digit-zero castling in any of the four fetched files; 98% of the
// perturbed texts the oracle labels illegal. No adapter code existed and no instrument arm had run.
//
// CLAIM. A zero-model reader that holds only RECEIVED priors (the PGN token grammar and piece letters, the FIDE rules of the board, an
// identity profile estimated from TRAIN) and reads causally can, on HELD-OUT records from a different SOURCE than its priors came from,
// (R0) name the system chess_pgn from content alone, (R1) hear the PGN lexemes, (R2) classify them, (R3) find the beings the text
// declares (players, pieces by identity, squares, moves), (R4) find the relations and claims (moves_to, captures, castles_with,
// promotes_to, gives_check, checkmates, and the claim "this ply is legal"), (R5) agree with itself across representations of the same
// game (SAN, UCI, long algebraic, figurine, national piece letters, tight numbering, FEN), each better than the control built to fail.
// Chess is a formal notation, so the bar is near-perfect agreement with the independent oracle; the interesting results are the controls
// and the gaps, not the headline.
//
// DATA AND SPLITS (see /private/tmp/claude-501/notation/chess_pgn/PROVENANCE.md and corpus/manifest.json). Split BY SOURCE:
//   train  Lichess standard rated, online (CC0): 2013-01 + 2020-01 head      24,272 selected games  -> PRIORS ONLY
//   dev    Lichess broadcast, over the board (CC BY-SA 4.0): 2023-01          1,191 selected games  -> develop and smoke here
//   test   Lichess broadcast 2024-01, EVENT-DISJOINT from the dev month and hash-disjoint from every split   2,661 games -> ONCE, by the orchestrator
// Disjointness was verified, not assumed (manifest.disjointness_check: 0 shared events, 0 shared movetext hashes). Honest limit: dev and
// test share a production pipeline (Lichess broadcast relay) and differ in event; train differs in pipeline, population and era. No third
// open, permissively licensed game source with an independent oracle-checkable record was found. measure({split:"test"}) appends to a
// run ledger so a second TEST run is visible; foreign pools for R0 are split by repository / treebank split / sibling raw sub-source.
//
// UNITS, GOLD AND MATCHERS.
//  GAME = one PGN game text (tags + movetext), read cold by a fresh reader. `limit` keeps the first N games in file order (never a sample).
//  GOLD: tokens (PGN §7-8 lexemes via python-chess's MOVETEXT/TAG regexes + legal replay), plies (from/to, capture, ep, castle, promotion,
//  check, mate, piece identity tracked from the origin square: id = colour + piece + origin square, e.g. wN-g1; castling moves the rook,
//  promotion keeps the id), legality (first ply python-chess cannot resolve, null if none), final FEN placement. A SAN token the oracle
//  cannot resolve ends the replay: gold beings/relations stop there too, and the game stays in the denominator as a legality item.
//  R1 item = token span [s,e) (UTF-16 offsets). Matcher: exact span equality. F1 = 2|P∩G|/(|P|+|G|), micro (pooled) and per game.
//  R2 item = a gold token; correct iff the reader emitted a token with the SAME span AND the same class (a token the reader did not hear
//        as a unit is wrong: R1 errors are charged to R2). Classes: tag_name tag_value move_number san glyph nag comment result
//        variation_open variation_close line_comment other. Also piece (K Q R B N P of the moved piece, castling = K) on gold SAN tokens,
//        and can_name_a_being (san tokens and White/Black tag values).
//  R3 item = (game, kind, id). kinds: piece (moved or captured pieces), square (squares the SAN text names: destinations, none for castling),
//        move (id ply<n>), player (id white:<name> / black:<name> from the tags). F1 per kind, micro pooled over games; headline = piece.
//  R4 item = (game, ply, end1, label, end2), labels moves_to captures castles_with promotes_to gives_check checkmates (gives_check/checkmates:
//        end1 = the moving piece, end2 = the enemy king). Headline = micro F1. Legality item = a text (natural dev/test games plus the
//        oracle-labelled perturbed texts); correct iff the reader's first unresolved ply equals python-chess's (null = fully legal).
//  R5 item = (game, representation); agreement = the reader's relation set on that representation equals ITS OWN relation set on the SAN
//        rendering of the same game (set equality; mean Jaccard also reported), plus agreement with gold. Representations are AUTHORED BY
//        SCRIPT from natural games (uci, long, fan, tight, de, fr, es, hu, pl; letters per PGN Standard §17), labelled derived, never natural.
//        FEN arm: the final placement the reader derives from the SAN equals the placement it reads out of python-chess's FEN string.
//  R0 item = a STREAM of W = 40 whitespace words (declared; ~13 moves of movetext). The identifier is fed one word at a time and the verdict
//        after the 40th word is scored (named = it said chess_pgn at any word: identity latches, presence is reported separately).
//
// ARMS AND CONTROLS BUILT TO FAIL (every control is implemented here, in the instrument, independently of the adapter):
//  R0 real arms: head (first 40 words of the full game, tags included), movetext (movetext from move 1), mid (movetext from a random word
//     inside the game, cold start: no initial board, so the replay witness is silent). Controls: charshuf (each word's characters permuted
//     inside the word of the movetext stream: lengths and spaces kept, the notation destroyed), foreign streams by kind (prose x6 languages,
//     code by repository, SMILES, FASTA: strangers never seen by any prior). Diagnostic, not in the rule: san_noise (the SAN words of a
//     real stream shuffled among their positions: shape intact, legality destroyed: licence of the legality witness), no_legality and
//     no_decay ablations, naive_first_shape (names chess at the first SAN-shaped word).
//  R1 real = ear(text); controls: ws (whitespace split), naive_regex (one SAN regex over the raw text), shifted (real spans +1 char),
//     misaligned (game i's tokens against game i+1's gold). Extra: causal clause and the tight-numbering clause (below).
//  R2 real = the ear's class + piece; controls: majority (always the commonest gold class), label_shuffled (reader's classes permuted among
//     matched tokens, seeded Sattolo derangement); reference only (not a control): shape_given_gold_spans = a context-free regex given the gold
//     spans (if it matches the real arm, class is boundary-determined and R1 owns the difficulty: said, not hidden). National-letter clause:
//     piece accuracy on the de/fr/hu/pl renderings with the letters DECLARED vs the English-default reader (the control built to fail).
//  R3 real = read().beings; controls: no_board (identity guessed from the tokens alone: colour by parity, piece by letter, pawn by file,
//     K/Q at their home squares, N/B/R left unresolved), shuffled_plies (the game's SAN tokens permuted, scored against the ORIGINAL gold),
//     misaligned (game i's beings against game i+1's gold).
//  R4 real = read().relations and its first unresolved ply; controls: no_board relations, shuffled_plies, misaligned, and for legality
//     never_flag (the shape-only reader that accepts every SAN-shaped token) and misaligned labels.
//  R5 real = the reader with the representation's letters declared; controls: english_default (same reader, English letters on every
//     rendering), misaligned pairing (rendering of game i against SAN of game i+1), and fen_misaligned. Extra, reported: letters=auto
//     (the reader chooses the piece-letter language by legal replay; ties are a typed gap).
//
// PASS RULES (PASS iff ALL; not softened after a run; bare numbers are PROVISIONAL declarations, P4; ALPHA = 0.05 as keyness's KEY_ALPHA):
//  R0  TPR(head) >= 0.95, TPR(movetext) >= 0.95, TPR(mid) >= 0.80; every control kind named-rate <= 0.05 (a kind with < 100 streams is a
//      typed gap, not a pass); licence L0a: real movetext TPR - charshuf >= 0.75; L0b: median replayed plies of the movetext streams >= 10
//      and of san_noise <= 3 (the legality statistic moves under the perturbation); C0 causal: identifier verdict after t words equals
//      the verdict of a fresh identifier fed only the first t words, 100 streams x t in {5,10,20}.
//  R1  micro F1 >= 0.995; the real arm beats ws AND naive_regex per game by the exact one-sided sign test at ALPHA (ties dropped);
//      licence: shifted <= 0.20 and misaligned <= 0.20 micro F1; C1 causal: for 100 games x 3 cut points, the tokens ear(prefix) emits
//      before the end of input are exactly the first tokens of ear(full); T1 tight: on the derived tight renderings real F1 >= 0.99 and
//      ws F1 <= real - 0.30.
//  R2  micro class accuracy >= 0.995, macro >= 0.99, piece accuracy >= 0.999, can_name accuracy >= 0.995; real - majority >= 0.30;
//      real - label_shuffled >= 0.30; national-letter clause: declared piece accuracy >= 0.99 on each of de fr hu pl AND
//      english_default <= declared - 0.20 on the mean of the four.
//  R3  piece, square, move, player F1 each >= 0.99; real piece F1 - max(no_board, shuffled_plies, misaligned) >= 0.20 AND the per-game sign
//      test beats each of the three at ALPHA; licence: shuffled_plies and misaligned piece F1 <= real - 0.30.
//  R4  relation micro F1 >= 0.99; legality exact >= 0.98; real F1 - max(no_board, shuffled_plies, misaligned) >= 0.20; legality - never_flag
//      >= 0.30; licence: misaligned relation F1 and misaligned legality <= real - 0.30. Natural-illegal recall is REPORTED (gap when < 5).
//  R5  macro agreement over the nine non-SAN renderings >= 0.99 AND the minimum over renderings >= 0.98; misaligned <= 0.05;
//      english_default must fall at least 0.20 below declared on the homograph renderings (de fr hu pl mean); FEN agreement >= 0.99
//      and fen_misaligned <= 0.05.
//  score = the rung's headline (R0 mean TPR, R1 micro F1, R2 micro class accuracy, R3 piece F1, R4 relation F1, R5 macro agreement);
//  control = the strongest control IN THE RULE on the same metric (R0 the highest named-rate, R5 the highest control agreement);
//  margin = score - control (R0: score - control); pass = null with a typed gap when a needed arm cannot be run (never "pass by absence").
//
// PREDICTIONS (written blind; the ORDERS are the claims, the numbers are guesses):
//  P0  R0 passes; head ~1.00, movetext >= 0.98, mid 0.85-0.99; foreign named-rate <= 0.02 per kind, worst kind code or smiles; charshuf 0;
//      san_noise named-rate >= 0.5 (the shape witness is intact) while its median replayed plies is <= 3 (legality witness dead); the
//      no_decay ablation is no better on chess and strictly worse on foreign; naive_first_shape names >= 20% of code streams.
//  P1  R1 passes at >= 0.999; ws F1 0.55-0.75 on broadcast text (tags and comments break it), ~0.3 on the tight rendering;
//      naive_regex 0.3-0.5 (it also fires inside comments such as "Re8 was best"); shifted and misaligned < 0.05.
//  P2  R2 passes; majority ~0.45-0.55; label_shuffled < 0.4; shape_given_gold_spans ~ real (class is boundary-determined: R2 is thin for
//      a formal notation, stated); the English-default reader loses > 0.3 piece accuracy on hu and pl and > 0.2 on de and fr.
//  P3  R3 passes (piece F1 >= 0.995); no_board 0.45-0.65 on pieces (pawns, king, queen right; knights/bishops/rooks wrong); shuffled_plies < 0.3;
//      misaligned 0.2-0.5 (kings and e/d pawns are everywhere).
//  P4  R4 passes (relation F1 >= 0.995, legality exact >= 0.99 incl. the 27 natural illegal games); never_flag ~0.30-0.40; no_board relations
//      0.2-0.4; misaligned < 0.2.
//  P5  R5 passes; uci is the hardest (castling is a two-square king move there) but >= 0.99; tight, long, fan, national = 1.00; english_default
//      collapses on hu and pl (homograph letters), partly on fr de; letters=auto picks the right language on >= 0.85 of games and ties
//      between de/da/no/sv and fr/it/es-like sets are reported as typed gaps, not errors.
//  Headline guess: all six rungs pass on dev. If R0 mid or a foreign kind fails it is the identity profile, not the rules engine.
//
// TYPED GAPS DECLARED IN ADVANCE (denominators, never silent): recursive annotation variations, set-up positions ([FEN]), null moves,
// Chess960/variants, NAG glyph tokens, digit-zero castling and e.p. markers occur in NO fetched game: unmeasured, and the adapter types them
// (variation_skipped, setup_unread, null_move, variant_unsupported) instead of guessing; comments' prose claims ("Re8 was best") are not read
// (comment_text_unread, counted); opening names (ECO/Opening tags) are Lichess's own table, the gold would be circular: unmeasured; caseless
// (lower-cased) notation, Russian Cyrillic piece letters (not in the standard's table), descriptive notation (EDN/LEN) and Go/draughts/bridge
// near-miss strangers for R0 have no data and no authority here: unmeasured.
// LIMITS: one pipeline for dev and test; code foreign pool is 7 files per held-out split (windows within a file are correlated); R2 is thin by
// construction; the legality oracle is lenient about "x" and check marks exactly as the standard's import format suggests, so the reader is
// lenient the same way and records claim mismatches as gaps instead of errors; python-chess and the adapter both implement the same FIDE rules,
// so a shared misreading of the Laws would be invisible to R3/R4/R5 (mitigated, not removed: python-chess is a mature independent
// implementation, the games themselves were produced by Lichess's own engine and all 26,933 selected train/test games replay cleanly in the
// oracle, 0 of them rejected; the 27 natural illegal dev records are rejected by the oracle, the six inspected before this header are king moves).
//
// A0 DISCLOSURE (still before the first run of THIS file; no rule, arm, threshold or prediction above was changed by it):
//  (1) the adapter was written after the header and smoke-compared to the DEV gold on all 1,191 dev games (token spans, plies, piece ids,
//      captures, castling, check/mate flags, first unresolved ply, final placement): 0 mismatches. That is development on DEV, said here
//      because it means the dev R1/R3/R4 cards cannot be a surprise; the held-out evidence is TEST, run once by the orchestrator.
//  (2) the identity prior was rebuilt before any R0 arm ran: the first table gave a transition that no TRAIN chess stream contains
//      (an 'other' word followed by a SAN word) a +9 nat likelihood ratio out of add-one smoothing alone; it was replaced by shrinking each
//      model toward the pooled-count distribution with Dirichlet mass K (a transition one model has no data for says nothing). No foreign-
//      stream outcome had been looked at. The decay window measured by dmdWindow on TRAIN is 4 words (gamma 0.75).
//  (3) the stranger-notation foreign pools were enlarged (smiles 40 docs, fasta 60) so that every foreign kind has >= 100 windows.
// ═══ END PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ AMENDMENTS (appended after seeing results; the registration above is left as it was; where an amendment disagrees, THE AMENDMENT ═══
// ═══ GOVERNS from its re-run on; the first-run numbers are kept here so a failure stays a failure)                                    ═══
//
// FIRST FULL DEV RUN (registration digest 6627fb373e126281, 1,191 games, rules exactly as registered, priors as in A0):
//   R0 FAIL  tpr head/movetext/mid 1/1/1, median first-named word 1/1/3; foreign named-rate prose .0458 (eng .025 spa .025 deu .05 fra .10 ita .05
//            rus .025) code 0 smiles .0167 fasta 0; charshuf .7254 (rule <= .05); median replayed plies movetext 5 (rule >= 10) vs san_noise 0;
//            failed checks: controls_le_5pct, licence_charshuf, licence_legality_moves. Ablations no_legality / no_decay / unigram: identical, TPR 1,
//            foreign .0190 — the replay witness and the decay did no work because the first word already named the system.
//   R1 PASS  micro F1 1.0 (ws .3184, naive_regex .4283, shifted 0, misaligned .0309), tight 1.0 vs ws .4026, 0 causal violations.
//   R2 PASS  acc/macro/piece/can_name 1.0, majority .3105, label_shuffled .2559, shape_given_gold_spans 1.0 (the reference matches: class is boundary-
//            determined); national letters declared 1.0 vs English-default de .3831 fr .2811 hu .3831 pl .3831.
//   R3 FAIL  piece/square/move/player F1 1.0; controls no_board .7727, shuffled_plies .0114, misaligned .9078; failed checks: margin (.0922 < .20),
//            licence (misaligned .9078 > real - .30). The real arm is perfect; the instrument is saturated (below).
//   R4 PASS  relation F1 1.0 (no_board .5714, shuffled_plies .0004, misaligned .0182); legality exact 1.0 over 3,509 items (never_flag .3417; the
//            27 natural illegal games all flagged at the oracle's ply; 35 perturbed texts stay legal and are not flagged).
//   R5 PASS  agreement 1.0 on all nine renderings, misaligned 0, fen 1.0, English-default 0 on fan/de/fr/es/hu/pl, letters=auto right on 100%.
//   PREDICTION SCORECARD (blind guesses vs the first run): wrong: P0 foreign named-rate <= .02 (prose .0458), charshuf 0 (.7254), naive_first_shape on
//   code >= 20% (0%); P1 ws .55-.75 (.3184); P2 majority .45-.55 (.3105); P3 misaligned .2-.5 (.9078); P4 no_board relations .2-.4 (.5714); P5 uci hardest
//   (all 1.0). Right in order: every control collapses where predicted (shifted, shuffled_plies, misaligned relations, never_flag ~ .34, English-default).
//
// A1 INSTRUMENT (prompted by the results above, so post hoc, and said so). Three defects of the instrument, none of the system:
//   (a) R0 charshuf permuted characters inside a word at random, which leaves any two-character word ("e4", "1.") unchanged half of the time: the control was
//       not a valid perturbation. It is now a DERANGEMENT inside each word (no word of >= 2 distinct characters keeps its string).
//   (b) R0 licence L0b "median replayed plies >= 10" assumed ~3 words per ply; broadcast comments make it ~7, so a 40-word stream holds ~5 plies. The bare
//       number is replaced by an exact one-sided sign test at ALPHA that, stream by stream, the replayed plies of the real stream exceed those of its san_noise twin.
//   (c) R3 piece and square item sets saturate: a game moves or names most of what exists, so another game's gold scores .91. Items become ORDER-AWARE:
//       (kind, id, first-mention ply) for piece and square (move already carries its ply; player is unchanged). Thresholds are untouched.
//   The real-arm metrics and every threshold of the registration stand. The registered (v1) item definitions are still computed and kept in details.v1.
// A2 MECHANISM (adapter + identity prior, prompted by the same R0 run; the registered pass rule is not relaxed, the mechanism becomes stricter):
//   (a) the first word of a stream carries no evidence: TRAIN chess streams begin at the game start and TRAIN background windows begin mid-document, so the
//       '^>cur' bigram measured how the windows were cut (named at word 1 on "1." or "[Event"). (b) the Wald bound A = ln(99) assumes small increments; one
//       'other>mn' transition (a sentence-final year such as "1926.") adds 5.44 > A, so false alarms were 4.6% on prose against the declared alpha of 1%. A is
//       now CALIBRATED on held-back TRAIN background windows (smallest value at most alpha of them reach), never below A_wald; TRAIN is cross-fitted by index
//       parity (even games/docs estimate the LLR, odd ones calibrate A and measure the window); the dmdWindow decay window and A are iterated to a fixed point.
//   Prediction for the re-run, written before it: charshuf <= .05; prose <= .05 and falling; head and movetext TPR >= .95 but median first-named word >= 2;
//   mid TPR may fall below .80 (calibrated A is higher; legality is silent there): if it does, R0 fails on mid and that is a result, not a bug.
//   (the sentence "No further amendment to R0 will be made before the orchestrator's TEST run" that stood here was written before the second run and is
//   superseded by A3: it was a promise the second run did not allow me to keep, and that is said, not hidden.)
//
// SECOND DEV RUN (amendments A1+A2 in place; registration digest unchanged; A=5.519, gamma .875): R1 R2 R4 R5 PASS as before; R3 PASS (order-aware: real 1.0,
//   no_board .7663, shuffled_plies .0018, misaligned .0796; the v1 items still give misaligned .9078 and fail, kept in details.v1). R0 FAIL: tpr head 0 (!),
//   movetext 1, mid 1; median first-named word movetext 9, mid 6; foreign prose 0 code 0 smiles .0167 fasta 0 (every foreign pool is clean: none contains a SAN-shaped
//   word at word level except SMILES), charshuf .4676 (still), licence_legality passes (paired sign test 1103 wins, 0 losses). Predictions P(A2): charshuf <= .05 WRONG,
//   prose <= .05 right, head >= .95 WRONG (0), median first-named >= 2 right, mid >= .80 right.
// A3 MECHANISM (the last R0 amendment before the TEST run; written before the third run): two defects found by the second run.
//   (a) the pooled-count shrinkage I introduced before the first run (to stop one 'other>san' artefact) also erased the evidence of every sparse context: the background has
//       dozens of 'tagval' words, so a roster tag after a value moved only +0.38 and the 7-tag PGN header, the most obvious PGN signal, named nothing (head TPR 0). The standard
//       remedy replaces it: each model's bigram is interpolated toward ITS OWN add-one unigram with Dirichlet mass K (backoff), so a context a model has not seen inherits what
//       that model says about the class overall. (b) the SAN lexer accepted a promotion letter on any rank ("f3N", "c6N": what a within-word shuffle of "Nf3", "Nc6" yields),
//       a shape no game has: a promotion suffix is a SAN token only when the destination is on a promotion rank (rules prior: ranks 1 and 8); otherwise the word is not heard
//       as SAN (a lexer rule, applied to ear and identifier alike).
//   Predictions for the third run, written before it: charshuf <= .05, head TPR >= .95, movetext >= .95, mid >= .80 (guess .85-.99), every foreign kind <= .02, A_null larger
//   than before or equal. If mid still fails, R0 fails on mid and that is the result. From here the R0 card is what it is: no more R0 amendments before TEST.
//
// THIRD DEV RUN (A1+A2+A3; A = 5.524, window 4 words, gamma .75): ALL SIX RUNGS PASS the registered rules on dev. R0: tpr head/movetext/mid 1/1/1, median first-named word
//   2/2/5, charshuf .0042, foreign prose 0 code 0 smiles .0167 fasta 0, paired legality sign test 1103-0. Predictions of A3: charshuf <= .05 right, head >= .95 right, movetext
//   right, mid >= .80 right (guessed .85-.99, got 1.0), every foreign kind <= .02 right. R1 R2 R4 R5 unchanged (1.0 on the real arms, controls as in the first run), R3 order-aware
//   (real 1.0, no_board .7663, shuffled_plies .0018, misaligned .0796).
//   A DIAGNOSTIC ADDED AFTER A3 (reported, NOT a rule clause, no amendment made because of it): near-miss injection of k natural SAN words into 40-word foreign streams names them
//   chess at k=1 in .9667 of prose and .7476 of code streams (k=0: 0/0; k=2: 1/.8619; k=4: 1/.9048; k=8: 1/.9905). The foreign pools hold almost no SAN-shaped word, so the
//   registered false-alarm test cannot tell this identifier from "any SAN-shaped word names chess": R0 passes its rule and is a rare-shape detector, said on the card.
//
// A4 (2026-10-06) INDEPENDENT REVIEW OF THE THIRD-RUN CARD (five findings; reproduced by me on the unmodified adapter BEFORE any change: a PGN-tag header with no
//   move, a draughts PDN record, a shogi record, a xiangqi record and a header with invented tags were all named chess_pgn at word 2 with 0 plies replayed; prose with
//   three SAN-shaped words at word 8; a lowercase battleship / spreadsheet stream at word 2 / 9; and the NATURAL head arm: of 1,191 dev and 2,661 test games, 0 have a
//   single ply inside the first 40 words (the broadcast header is ~17 tag lines), a corpus fact read from the gold only, no reader output). Consequences, written BEFORE the
//   first run that contains any of the arms below. THE REGISTERED NUMBERS ARE NOT CHANGED OR RELAXED; every clause of the registration is kept; clauses are ADDED, and the
//   one clause that measured the wrong thing (head) is split, with the registered 0.95 kept on the part that carries chess content.
//   FINDING 1+2+5 (R0 = a PGN-envelope and rare-shape detector; the false-alarm control could not fail):
//   (a) MECHANISM (adapter + identity prior; stricter only). A name now needs TWO things: S_t has reached A (the SPRT evidence, as before) AND a necessary witness:
//         replay   the stream replays >= n_min SAN plies LEGALLY from the initial position (FIDE table), no illegal ply before; n_min is DERIVED on TRAIN as the smallest n
//                  for which a random SAN-shaped chain replays n plies from the initial position with probability <= alpha = 0.01 (two nulls, the larger bound wins: SAN
//                  words drawn by occurrence, and SAN words drawn uniformly by type, both from TRAIN);
//         header   >= r_min = 3 distinct seven-tag-roster tag openers (PGN §9.1) AND >= 1 legal ply from the initial position (r_min is a declared provisional, P4);
//         cold     only for a stream that does NOT claim the game start (its first move number is not "1."): a PGN numbering lattice (PGN §8.2.2: n. before white, n... before
//                  black after an interruption, +1 per two plies) holding for m_cold = 3 consecutive number tokens after the anchor, every SAN word between them
//                  geometrically feasible for SOME piece under the rules prior (a board-free refusal; FIDE Art. 3). m_cold is a declared provisional (P4).
//       A PGN tag header alone names nothing: the identifier reports `envelope` (>= r_min roster openers) apart from `system`, because PDN, shogi and xiangqi records wear the
//       same envelope. Identity still latches, presence still decays. The cold witness is STRUCTURE, not legality: it carries no legality licence (said on the card).
//   (b) INSTRUMENT. The head arm is split: head_roster = the game's own seven roster tag lines + movetext, first 40 words (DERIVED by script from natural games, labelled so;
//       the registered 0.95 applies to it) and head_nat = the natural full tag block (0 of N windows carry a ply: reported with its plies-in-window denominator; rule: named as
//       chess <= .05 and envelope detected >= .95: it measures the envelope, not chess). REAL hard-negative pools inside the rule, each >= 100 streams per split (fewer = typed
//       gap and pass null), each <= .05 named: other-game records wearing the PGN envelope (PDN draughts, shogi USI and western, xiangqi WXF and ICCS) in three views (head,
//       movetext from move 1, cold mid; half carry the Lichess "{ [%clk] }" comments so the clock envelope cannot be the tell), roster header + prose, tag blocks with invented
//       tag names, lowercase and uppercase battleship / spreadsheet / Go-GTP / SGF / domino / bridge / xxd hexdump strangers, and prose and code carriers with k in {1,2,4}
//       natural SAN words injected at random positions (authored; the words are natural, the carrier is natural, the placement is the authored part). The held-out code
//       carrier pool is enlarged beyond the registered 7 files per split (more repositories by repository, and permissively licensed PyPI sdists by package; PROVENANCE.md).
//       Naive baselines implemented HERE, independent of the adapter, as LICENCES: naive_first_shape (names at the first SAN-shaped word) and naive_header (names at the first
//       roster opener). A pool set that those baselines also pass is vacuous: licence L0d requires naive_first_shape >= .50 mean named-rate on the coordinate and near-miss pools and
//       naive_header >= .50 on the head views of the envelope pools. Licence L0c (the replay witness is necessary and does work): with legality disabled the movetext TPR must fall
//       by >= .50, and the san_noise twin (SAN words permuted among their positions, numbering "1." kept) must be named in <= .20 of streams.
//   (c) a natural SAN-shaped word in prose / code is so rare (surveyed with an independent regex before any run, on the enlarged pools: dev 0 of 6,270 prose windows and 7 of 6,055
//       code windows; test 0 of 6,091 and 102 of 7,894, the 102 concentrated in a few vector files) that a natural near-miss kind is NOT used in the rule: it is reported with its
//       denominators as a typed gap (dev underpowered; test not independent across windows), never to make a pass.
//   FINDING 3 (castling rules not measured; the reviewer broke the adapter two ways and R3/R4/R5 still scored 1.0). R4 gains a RULE-PROBE STRATUM, oracle-labelled by python-chess,
//       built from natural positions (chess_pgn-probes.py; every probe is a natural game prefix or an authored excursion from one, plus a constructed FEN family for the pinned
//       en-passant capture and for the three-queens file-and-rank disambiguation, which natural games never contain): castle_legal (K, Q), castle_legal_attacked_rook,
//       castle_legal_attacked_b_file, castle_through_attack, castle_out_of_check, castle_blocked, castle_rights_lost_king (the king went out and back, squares free, not attacked),
//       castle_rights_lost_rook, promo_queen, promo_under (N B R legal), promo_missing (no =X on the last rank), disambig_absent (ambiguous), disambig_file, disambig_rank,
//       disambig_both, ep_legal, ep_no_target, ep_pinned (the capture would expose the king along the rank), pin_illegal, king_into_check, check_ignored, plain_legal; and the
//       DIAGNOSTIC stratum ill_formed_promotion (e7=Q: under lexer rule A3b that word is not a SAN token, the reader types it unheard_token and counts no ply, python-chess calls
//       it illegal; reported, NOT in the rule, because the registered legality item is about legal versus illegal SAN tokens). Item = a text; correct iff the reader's first unresolved ply equals the oracle's AND, for a legal probe,
//       the reader's relations at the probed ply equal the oracle's (identity = origin square). Rule (added): each stratum with n >= 30 scores >= 0.99 exact (< 30 = typed gap
//       listing the stratum); control pseudo_legal (the oracle's own pseudo-legal moves: king safety and castling attacks ignored) must be beaten by >= .30 on the king-safety
//       strata (castle_through_attack, castle_out_of_check, ep_pinned, pin_illegal, king_into_check, check_ignored); licence: the misaligned-label reader <= real - .30. The
//       mutation licence is a TEST (tests/notation-chess_pgn.test.js): castle-through-attack, king-moves-keep-rights, rook-moves-keep-rights, no-promotion, no-pins mutants of the
//       adapter must each FAIL the probe rule.
//   FINDING 4 (typed gaps declared in the header but absent from the cards). measure() now emits them on the rungs with counts and denominators from the adapter's own gap
//       output and the gold: comment_text_unread (brace / ';' comments, count), variation_skipped, nag_unread, setup_position_read, variant_unsupported, null_move (absent in
//       the data: count 0 of N games, typed absent_from_data), opening_names_unmeasured, caseless_notation_unmeasured, descriptive_notation_unmeasured,
//       russian_piece_letters_unmeasured, chess_variants_unmeasured, natural_near_miss_unmeasured (see (c)), natural strangers (real draughts / shogi / xiangqi corpora)
//       unmeasured (the pools are authored by script), and gold token classes absent from the data.
//   PREDICTIONS for the run of A4 (blind; the orders are the claims, the numbers are guesses):
//     n_min derived = 2 (3 at most). head_nat: 0 plies in window for ~100% of games, named as chess ~0, envelope detected ~1.0. head_roster TPR .97-1.0, movetext 1.0 with median
//     first-named word 10-16 (n_min plies at ~6 words a ply once the clock comments are counted), mid .70-.95 (the cold witness needs ~3 numbered plies with clocks, ~6 without;
//     mid may FAIL .80 and if it does R0 fails and that is the result). Hard negatives: most kinds <= .02; the weakest are xiangqi_iccs (long-form squares can look chess-like) and
//     lowercase sheet / battleship in the cold view, which may exceed .05 (then R0 fails on that kind and that is the result). k = 4 injections <= .02. san_noise named <= .05.
//     Ablation no_legality: movetext TPR collapses (<= .2). Naive baselines: naive_first_shape ~1.0 on near-miss k=4, battleship and lowercase sheet; naive_header ~1.0 on head views.
//     R4 probes: every stratum >= .99 (the reviewer's 1,500-game fuzz found the adapter correct), pseudo_legal control .0-.3 on the safety strata, mutants fail. R1 R2 R3 R5
//     unchanged.
//   (the previous sentence "from here the R0 card is what it is: no more R0 amendments before TEST" is superseded by this independent review, said, not hidden.)
//
// FIRST A4 DEV RUN (registration digest 6627fb373e126281; A4 as written above; identity prior + witness: n_min = 3 derived on TRAIN (P_occurrence(L>=2) = .0188 > .01,
//   P(L>=3) = .0027), r_min = 3, m_cold = 3 declared; hard-negative pools 22 kinds x 360 streams, code carriers 7 registered + 185 extra files from 12 repositories/packages):
//   R0 FAIL, one failed check: controls_le_5pct. neg:xiangqi_iccs named .0806 (head .0083, movetext 0, MID .2333); the other 21 hard kinds <= .0194 (hexdump_xxd .0194,
//   battleship_lower .0167, sheet_lower .0056, go_gtp .0028, every other 0); foreign prose / code / smiles / fasta 0, charshuf 0. tpr head_roster 1.0, movetext 1.0, mid .9453
//   (witness: cold_lattice 1082, replay 25; head_roster header+replay 1187; movetext replay 1187); head_nat: 0 of 1,191 windows carry a gold ply, chess-named 0, envelope 1.0;
//   median first-named word movetext 18, head_roster 22, mid 27. Licences all hold: no_legality movetext TPR 0 (real 1.0), san_noise named .134 (<= .20), naive_first_shape
//   1.0 and naive_header 1.0 on the pools, the REGISTERED v1 identifier (evidence alone) exceeds .05 on 18 of 22 kinds (pooled hard-negative named-rate .707 against .0035 now).
//   R1 R2 R3 R5 PASS as before; R4 PASS: relation F1 1.0, legality 1.0, probes: 21 strata with n >= 30 all exact 1.0 (castle_through_attack, castle_out_of_check,
//   castle_rights_lost_king / rook through excursions, ep_pinned, pin_illegal, king_into_check, check_ignored included), pseudo_legal control .0033 on the safety strata,
//   misaligned legality .4173 against .9472; typed gaps: castle_legal_attacked_rook n = 10 < 30; ill_formed_promotion 0 of 150 (the reader types the word unheard_token and
//   counts no ply, as stated in the header: diagnostic, not in the rule).
//   PREDICTION SCORECARD (blind guesses of A4 vs this run): right: n_min <= 3 (3); head_nat 0 plies / named 0 / envelope 1.0; head_roster and movetext TPR (1.0); mid in
//   .70-.95 (.9453); most hard kinds <= .02; injections k = 4 <= .02 (0); no_legality collapses movetext (0); naive baselines ~1.0; every probe stratum >= .99; pseudo_legal control
//   .0-.3. WRONG: median first-named word 10-16 (movetext 18, head_roster 22); san_noise named <= .05 (.134: a shuffled movetext often keeps three legal opening plies);
//   and the weakest kind named in the header as a risk, xiangqi_iccs in the cold view, DID exceed .05 (.2333): that is the failure above.
// A5 MECHANISM (post hoc, prompted by that failure, said; written before the second run). The cold lattice counted long-algebraic / UCI words (e2e4, Ng1-f3) as plies,
//   and xiangqi ICCS writes squares the same way (h2e2): with Lichess-style clock comments every ply carries a move number, so three lattice-consistent plies of chess-shaped
//   long-form words suffice, and a stranger whose squares happen to fall inside a-h and 1-8 gets them (~.5 per ply). PGN movetext is SAN (§8.2.3); long forms are a different
//   REPRESENTATION (the adapter reads them, R5 derives them), not PGN movetext. Under the cold witness a LONG-FORM word now BREAKS the lattice (the replay witness still reads a
//   long-form stream legally from the initial position). The rule comes from the standard, not from a threshold: m_cold stays 3, every declared number is unchanged.
//   Prediction for the re-run, written before it: neg:xiangqi_iccs <= .05 (guess 0 in the cold view); every other kind unchanged within sampling (pools and seeds are identical);
//   mid TPR unchanged (.9453: the broadcast movetext is SAN short form); no other result moves. If xiangqi_iccs stays above .05, R0 fails and that is the result.
// A5 INSTRUMENT (post hoc, said; written before the re-run of R4). The mutation licence (tests/notation-chess_pgn.test.js) found one mutant that the single-ply probes do not see:
//   no-promotion (the promoted pawn stays a pawn on the board) is invisible on promo_under, because the probed ply itself carries the promotion and the wrong piece only matters
//   LATER. A stratum promo_follow is added: a later move (a move of the promoted piece) in the same natural game, labelled by the oracle, scored exactly as the others (legality
//   and relations at the probed ply). The selection of every other stratum is a pure hash of the data and is unchanged, so the first dev probe table above stands for them.
//   Prediction: real adapter exact >= .99 on promo_follow (guess 1.0); the no-promotion mutant falls below 1 on promo_follow.
//   (R4 A4 run, first: 21 strata >= .99; this adds one more rule stratum; a stratum with n < 30 stays a typed gap.)
// SECOND DEV RUN (A4 + A5 in place; registration digest 6627fb373e126281; every rung on dev; TEST NOT RUN by this agent: the one-time held-out run belongs to the orchestrator):
//   ALL SIX RUNGS PASS the registered rules and every clause A4 added. R0: tpr head_roster 1.0, movetext 1.0, mid .9453 (cold_lattice 1082, replay 25; the 58 unnamed mid windows
//   are the comment-heavy ones, <= 4 numbers in 40 words); natural head: 0 of 1,191 windows carry a ply, chess-named 0, envelope 1.0; hard negatives, 22 kinds x 360: max .0194
//   (hexdump_xxd), battleship_lower .0167, sheet_lower .0056, go_gtp .0028, xiangqi_iccs .0028 (head .0083, movetext 0, mid 0; it was .2333 in the cold view before A5), the others 0;
//   foreign prose / code (7 registered + 185 extra files, 12 repositories and packages) / smiles / fasta 0; charshuf 0; median first-named word movetext 18, head_roster 22, mid 27.
//   Licences: no_legality ablation takes movetext and head_roster TPR from 1.0 to 0 (the replay witness is necessary and does the work); san_noise named .134; naive_first_shape 1.0
//   and naive_header 1.0 on the pools; the registered v1 identifier names .707 of the pooled hard negatives (18 of 22 kinds above .05) against .0021 now. HONEST LIMITS, said:
//   (1) witness_only_no_evidence, no_decay and unigram ablations are IDENTICAL to the real arm: the verdict is decided by the necessary witness, the SPRT evidence is reached within
//   the first words anyway and adds nothing measurable here (the decay window moves presence only); (2) the mid verdict is STRUCTURE (a numbering lattice of SAN short form), it
//   has no legality licence: a numbered run of chess-shaped words that is not chess would be named; (3) the other-game pools are authored by script (surface grammars, not played
//   games) and the A5 fix was prompted by one of them on DEV: the pools of the TEST split use other seeds, other hexdump bytes and other carrier repositories, and what they say
//   will be the held-out answer; (4) natural near-miss kinds are not powered (typed gaps with denominators on the card).
//   R1 R2 R3 R5 unchanged (1.0). R4: relations 1.0, legality 1.0, rule probes 22 strata with n >= 30 all exact 1.0 (promo_follow 88 of 88), castle_legal_attacked_rook n = 10 typed
//   gap, ill_formed_promotion 0 of 150 (diagnostic), pseudo_legal control .0033 on the safety strata, misaligned legality .4173; typed gaps now on every rung (comment_text_unread
//   112,726 over 1,178 games; absent_from_data with counts 0 of 1,191 for variations, NAGs, FEN set-ups, variants, null moves, unheard tokens, nonstandard castling, claim
//   mismatches; absent token classes; and the declared unmeasured systems).
//   PREDICTION SCORECARD of A5 (written before the re-run): right: xiangqi_iccs <= .05 (.0028; guess was 0, the head view keeps one stream), every other kind unchanged (identical
//   pools, identical numbers), mid TPR unchanged (.9453), promo_follow >= .99 for the real adapter (1.0) and the no-promotion mutant falls below 1 on it (tests).
// ═══ END AMENDMENTS ═════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import * as chess from "../../adapters/notation/chess_pgn.js";

export const FAMILY = "chess_pgn";
const HERE = path.dirname(fileURLToPath(import.meta.url));
/** The system under test. A seam for the instrument's own tests (a perfect reader must score 1, a deranged one low); production never swaps it. */
let SUT = chess;
export function withSut(sut, fn) { const prev = SUT; SUT = sut; try { return fn(); } finally { SUT = prev; } }
const SELF = fileURLToPath(import.meta.url);
export const DATA = "/private/tmp/claude-501/notation/chess_pgn";
const OUT = `${DATA}/results`;
const LEDGER = "/private/tmp/claude-501/notation-competence/chess_pgn-test-runs.jsonl";

/** Every number the pass rules use, declared above in the header; bare numbers are provisional (P4). */
export const PARAMS = Object.freeze({
  ALPHA: 0.05, SEED: 20261006, W: 40,
  R0: Object.freeze({ head: 0.95, movetext: 0.95, mid: 0.80, control: 0.05, minStreams: 100, margin: 0.75, medianPliesReal: 10, medianPliesNoise: 3, causalStreams: 100, causalT: [5, 10, 20], windowsPerDoc: { prose: 1, code: 30, smiles: 3, fasta: 2 },
    // A4 (declared in the header before the first run that uses them)
    windowsPerExtraDoc: 3, headNatNamedMax: 0.05, headNatEnvelope: 0.95, noLegalityDrop: 0.50, sanNoiseMax: 0.20, naiveFirst: 0.50, naiveHeader: 0.50, v1CaughtKinds: 3,
    coordinateKinds: Object.freeze(["battleship_lower", "sheet_lower", "hexdump_xxd", "prose_san_k2", "prose_san_k4", "code_san_k2", "code_san_k4"]),
    envelopeKinds: Object.freeze(["pdn_draughts", "shogi_usi", "shogi_western", "xiangqi_wxf", "xiangqi_iccs"]) }),
  R1: Object.freeze({ f1: 0.995, ceiling: 0.20, tight: 0.99, tightGap: 0.30, causalGames: 100, causalCuts: 3 }),
  R2: Object.freeze({ acc: 0.995, macro: 0.99, piece: 0.999, canName: 0.995, margin: 0.30, national: 0.99, nationalDrop: 0.20 }),
  R3: Object.freeze({ f1: 0.99, margin: 0.20, licence: 0.30 }),
  R4: Object.freeze({ f1: 0.99, legal: 0.98, margin: 0.20, legalMargin: 0.30, licence: 0.30, minIllegal: 5,
    // A4 rule probes
    probeExact: 0.99, probeMinN: 30, probeMargin: 0.30, probeLicence: 0.30,
    safetyStrata: Object.freeze(["castle_through_attack", "castle_out_of_check", "ep_pinned", "pin_illegal", "king_into_check", "check_ignored"]), diagnosticStrata: Object.freeze(["ill_formed_promotion"]) }),
  R5: Object.freeze({ macro: 0.99, min: 0.98, control: 0.05, drop: 0.20, fen: 0.99 }),
});

// ── arithmetic (self-contained: the instrument shares nothing with the system under test) ─────────────────────────────
export function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Sattolo: a permutation of 0..n-1 with no fixed point (one n-cycle); null when n < 2 */
export function derangement(n, rng) { if (n < 2) return null; const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; } return p; }
const logFact = (() => { const t = [0]; return (n) => { for (let i = t.length; i <= n; i++) t[i] = t[i - 1] + Math.log(i); return t[n]; }; })();
/** exact P(X >= k | n, p) */
export function binomUpperTail(k, n, p = 0.5) {
  if (k <= 0) return 1; if (k > n) return 0;
  let s = 0; const lp = Math.log(p), lq = Math.log(1 - p);
  for (let i = k; i <= n; i++) s += Math.exp(logFact(n) - logFact(i) - logFact(n - i) + i * lp + (n - i) * lq);
  return Math.min(1, s);
}
/** one-sided exact sign test of "A beats B" over paired values; ties dropped */
export function signTestPaired(a, b) {
  let wins = 0, losses = 0;
  for (let i = 0; i < a.length; i++) { if (a[i] > b[i]) wins++; else if (a[i] < b[i]) losses++; }
  const n = wins + losses;
  return { wins, losses, n, p: n === 0 ? 1 : binomUpperTail(wins, n, 0.5) };
}
const f1Of = ({ tp, p, g }) => (p + g === 0 ? 1 : (2 * tp) / (p + g));
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
const median = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r4 = (x) => (x == null ? x : Math.round(x * 1e4) / 1e4);
function setCounts(pred, gold) { let tp = 0; for (const x of pred) if (gold.has(x)) tp++; return { tp, p: pred.size, g: gold.size }; }
const pool = (cs) => cs.reduce((a, c) => ({ tp: a.tp + c.tp, p: a.p + c.p, g: a.g + c.g }), { tp: 0, p: 0, g: 0 });
const microF1 = (cs) => f1Of(pool(cs));

// ── cards ────────────────────────────────────────────────────────────────────
function makeCard(rung, split, o = {}) {
  return { id: `${FAMILY}.${rung}`, rung: rung.toUpperCase(), split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {}, ...o };
}
const unmeasured = (rung, split, detail, extra = {}) => makeCard(rung, split, { gaps: [{ reason: "unmeasured", detail }], ...extra });
const finish = (c) => { if (c.score != null && c.control != null && c.margin == null) c.margin = r4(c.score - c.control); return c; };

// ── data ─────────────────────────────────────────────────────────────────────
const readGz = (p) => zlib.gunzipSync(fs.readFileSync(p)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const readJsonl = (p) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
function loadGold(split, limit) { const p = `${DATA}/gold/${split}/gold.jsonl.gz`; if (!fs.existsSync(p)) return null; const a = readGz(p); return limit == null ? a : a.slice(0, limit); }
function loadPerturb(split, limit) { const p = `${DATA}/gold/${split}/perturb.jsonl.gz`; if (!fs.existsSync(p)) return null; const a = readGz(p); return limit == null ? a : a.slice(0, Math.max(2, limit * 2)); }
function loadReps(split, limit) { const p = `${DATA}/gold/${split}/reps.jsonl.gz`; if (!fs.existsSync(p)) return null; const a = readGz(p); return limit == null ? a : a.slice(0, Math.min(limit, a.length)); }
function loadForeign(split) {
  const out = {};
  for (const kind of ["prose", "code", "smiles", "fasta"]) { const p = `${DATA}/foreign/${split}/${kind}.jsonl`; out[kind] = fs.existsSync(p) ? readJsonl(p) : null; }
  // A4: the enlarged held-out code carrier pool (more repositories, PyPI sdists by package); the registered files keep their registered window count
  const px = `${DATA}/foreign/${split}/code_extra.jsonl`;
  if (out.code && fs.existsSync(px)) out.code = [...out.code, ...readJsonl(px).map((d) => ({ ...d, extra: true }))];
  return out;
}
/** A4: hard-negative pools (authored by script, chess_pgn-negatives.py): { kind: [{id, kind, view, ws, ...}] } or null */
function loadNegatives(split) {
  const dir = `${DATA}/negatives/${split}`;
  if (!fs.existsSync(dir)) return null;
  const out = {};
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith(".jsonl")) out[f.slice(0, -6)] = readJsonl(`${dir}/${f}`);
  return Object.keys(out).length ? out : null;
}
/** A4: rule probes (chess_pgn-probes.py): [{id, stratum, text, probe_ply, san, legal, first_unresolved_ply, rel, pseudo_accepts, src}] or null */
function loadProbes(split, limit) {
  const p = `${DATA}/gold/${split}/probes.jsonl.gz`;
  if (!fs.existsSync(p)) return null;
  const a = readGz(p);
  if (limit == null) return a;
  const step = Math.max(1, Math.floor(a.length / Math.max(30, limit * 4)));
  return a.filter((_, i) => i % step === 0);                         // a stratified thinning (items are grouped by stratum), never a prefix
}

const words = (t) => t.split(/\s+/).filter(Boolean);
const movetextOf = (text) => { const lines = text.split("\n"); let i = 0; while (i < lines.length && lines[i].startsWith("[")) i++; return lines.slice(i).join("\n").trim(); };
const safeRead = (text, opts) => { try { return SUT.read(text, opts); } catch (e) { return { beings: [], relations: [], plies: [], gaps: [{ reason: "reader_exception", error: String(e.message ?? e) }], first_unresolved_ply: 0, placement: null, tokens: [], tags: {}, position: null }; } };
const safeEar = (text, opts) => { try { return SUT.ear(text, opts).tokens; } catch { return []; } };
const spanKey = (s, e) => `${s}-${e}`;

// ── gold-derived item sets (python-chess's replay, written by chess_pgn-data.py) ─────────────────────────────────────
const relKey = (ply, e1, label, e2) => `${ply}|${e1}|${label}|${e2}`;
export function goldRelations(plies) {
  const out = new Set();
  for (const p of plies) {
    out.add(relKey(p.ply, p.pid, "moves_to", p.to));
    if (p.captured_pid) out.add(relKey(p.ply, p.pid, "captures", p.captured_pid));
    if (p.castle) { out.add(relKey(p.ply, p.rook_pid, "moves_to", p.rook_to)); out.add(relKey(p.ply, p.pid, "castles_with", p.rook_pid)); }
    if (p.promotion) out.add(relKey(p.ply, p.pid, "promotes_to", p.promotion));
    if (p.mate) out.add(relKey(p.ply, p.pid, "checkmates", p.enemy_king)); else if (p.check) out.add(relKey(p.ply, p.pid, "gives_check", p.enemy_king));
  }
  return out;
}
/** A1c: piece and square items are ORDER-AWARE (id@first-mention-ply); piece1/square1 keep the registered v1 id-only sets for details.v1 */
export function goldBeings(g) {
  const out = { piece: new Set(), square: new Set(), move: new Set(), player: new Set(), piece1: new Set(), square1: new Set() };
  const first = (kind, id, ply) => { if (!out[kind + "1"].has(id)) { out[kind + "1"].add(id); out[kind].add(`${id}@${ply}`); } };
  if (g.tags?.White != null) out.player.add(`white:${g.tags.White}`);
  if (g.tags?.Black != null) out.player.add(`black:${g.tags.Black}`);
  for (const p of g.plies) {
    first("piece", p.pid, p.ply); if (p.captured_pid) first("piece", p.captured_pid, p.ply); if (p.rook_pid) first("piece", p.rook_pid, p.ply);
    if (!p.castle) first("square", p.to, p.ply);
    out.move.add(`ply${p.ply}`);
  }
  return out;
}
export function readerBeings(r) {
  const out = { piece: new Set(), square: new Set(), move: new Set(), player: new Set(), piece1: new Set(), square1: new Set() };
  for (const b of r.beings ?? []) {
    if (b.kind === "piece" || b.kind === "square") { out[b.kind + "1"].add(b.id); out[b.kind].add(`${b.id}@${b.ply}`); } else out[b.kind]?.add(b.id);
  }
  return out;
}
const readerRelations = (r) => new Set((r.relations ?? []).map((x) => relKey(x.ply, x.end1, x.label, x.end2)));
const KINDS = ["piece", "square", "move", "player"];
const LABELS = ["moves_to", "captures", "castles_with", "promotes_to", "gives_check", "checkmates"];

/** the weak reader of the controls: what the TOKENS alone say (no board): colour by parity, piece by letter, pawn by file, K/Q at home */
function noBoardRead(text) {
  const toks = safeEar(text, undefined);
  const beings = { piece: new Set(), square: new Set(), move: new Set(), player: new Set(), piece1: new Set(), square1: new Set() }, rel = new Set();
  const first = (kind, id, ply) => { if (!beings[kind + "1"].has(id)) { beings[kind + "1"].add(id); beings[kind].add(`${id}@${ply}`); } };
  let pendingTag = null, ply = 0;
  for (const t of toks) {
    if (t.cls === "tag_name") { pendingTag = t; continue; }
    if (t.cls === "tag_value") { if (pendingTag && (pendingTag.text === "White" || pendingTag.text === "Black")) beings.player.add(`${pendingTag.text.toLowerCase()}:${t.text}`); pendingTag = null; continue; }
    if (t.cls !== "san") continue;
    ply++;
    const c = ply % 2 === 1 ? "w" : "b", rank = c === "w" ? 1 : 8, pr = c === "w" ? 2 : 7;
    beings.move.add(`ply${ply}`);
    if (t.castle) {
      const king = `${c}K-e${rank}`, rook = `${c}R-${t.castle === "K" ? "h" : "a"}${rank}`, kTo = `${t.castle === "K" ? "g" : "c"}${rank}`, rTo = `${t.castle === "K" ? "f" : "d"}${rank}`;
      first("piece", king, ply); first("piece", rook, ply);
      rel.add(relKey(ply, king, "moves_to", kTo)); rel.add(relKey(ply, rook, "moves_to", rTo)); rel.add(relKey(ply, king, "castles_with", rook));
      continue;
    }
    first("square", t.to, ply);
    let id = null;
    if (t.piece === "K") id = `${c}K-e${rank}`; else if (t.piece === "Q") id = `${c}Q-d${rank}`; else if (t.piece === "P") id = `${c}P-${t.fromFile ?? t.to[0]}${pr}`;
    if (id) { first("piece", id, ply); rel.add(relKey(ply, id, "moves_to", t.to)); }
  }
  return { beings, rel };
}

/** the game's SAN tokens permuted among their positions (seeded) — the same words, an order no game has */
export function shufflePlies(text, rng) {
  const toks = safeEar(text, undefined).filter((t) => t.cls === "san");
  if (toks.length < 2) return text;
  const perm = shuffled(toks.map((_, i) => i), rng);
  let out = "", last = 0;
  toks.forEach((t, i) => { out += text.slice(last, t.s) + toks[perm[i]].text; last = t.e; });
  return out + text.slice(last);
}

// ════════════════════════════════════════════════════════════════════════════
// R1 — hear tokens
// ════════════════════════════════════════════════════════════════════════════
const NAIVE_SAN = /(?<![A-Za-z0-9])(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?(?![A-Za-z0-9])/g;

export function measureR1(split, games, reps) {
  const P = PARAMS.R1, rng = mulberry32(PARAMS.SEED + 1);
  if (!games?.length) return unmeasured("r1", split, "gold missing");
  const arms = { real: [], ws: [], naive_regex: [], shifted: [], misaligned: [] }, perGame = { real: [], ws: [], naive_regex: [] };
  const goldSets = games.map((g) => new Set(g.tokens.map((t) => spanKey(t.s, t.e))));
  const realToks = games.map((g) => safeEar(g.text));
  const realSets = realToks.map((ts) => new Set(ts.map((t) => spanKey(t.s, t.e))));
  games.forEach((g, i) => {
    const gs = goldSets[i], rs = realSets[i];
    const ws = new Set(); for (const m of g.text.matchAll(/\S+/g)) ws.add(spanKey(m.index, m.index + m[0].length));
    const nv = new Set(); for (const m of g.text.matchAll(NAIVE_SAN)) nv.add(spanKey(m.index, m.index + m[0].length));
    const sh = new Set([...rs].map((k) => { const [s, e] = k.split("-").map(Number); return spanKey(s + 1, e + 1); }));
    const cr = setCounts(rs, gs), cw = setCounts(ws, gs), cn = setCounts(nv, gs);
    arms.real.push(cr); arms.ws.push(cw); arms.naive_regex.push(cn); arms.shifted.push(setCounts(sh, gs)); arms.misaligned.push(setCounts(rs, goldSets[(i + 1) % games.length]));
    perGame.real.push(f1Of(cr)); perGame.ws.push(f1Of(cw)); perGame.naive_regex.push(f1Of(cn));
  });
  const micro = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, microF1(v)]));
  const sign = { ws: signTestPaired(perGame.real, perGame.ws), naive_regex: signTestPaired(perGame.real, perGame.naive_regex) };
  // by stratum of the gold token class (what does ws / naive miss?)
  const byClass = {};
  games.forEach((g, i) => { for (const t of g.tokens) { const c = (byClass[t.cls] ??= { n: 0, heard: 0 }); c.n++; if (realSets[i].has(spanKey(t.s, t.e))) c.heard++; } });
  // C1 causal: the tokens emitted before the end of any prefix are exactly the first tokens of the full read
  let causalFail = 0, causalN = 0;
  for (const g of games.slice(0, P.causalGames)) {
    const full = safeEar(g.text);
    for (let c = 0; c < P.causalCuts; c++) {
      const cut = Math.floor(g.text.length * (0.1 + 0.8 * rng()));
      const e = SUT.createEar(); const got = e.push(g.text.slice(0, cut));
      causalN++;
      if (got.length > full.length || got.some((t, k) => t.s !== full[k].s || t.e !== full[k].e || t.cls !== full[k].cls)) causalFail++;
    }
  }
  // T1 tight renderings (derived, spans by construction)
  let tight = null;
  if (reps?.length) {
    const cr = [], cw = [];
    for (const r of reps) {
      const rep = r.reps.tight, gs = new Set(rep.spans.map((t) => spanKey(t.s, t.e)));
      const rs = new Set(safeEar(rep.text).map((t) => spanKey(t.s, t.e)));
      const ws = new Set(); for (const m of rep.text.matchAll(/\S+/g)) ws.add(spanKey(m.index, m.index + m[0].length));
      cr.push(setCounts(rs, gs)); cw.push(setCounts(ws, gs));
    }
    tight = { n: reps.length, real: r4(microF1(cr)), ws: r4(microF1(cw)) };
  }
  const c = makeCard("r1", split, { n: games.length });
  c.score = r4(micro.real); c.control = r4(Math.max(micro.ws, micro.naive_regex));
  c.controls = { ws: r4(micro.ws), naive_regex: r4(micro.naive_regex), shifted: r4(micro.shifted), misaligned: r4(micro.misaligned) };
  c.details = { micro_f1: Object.fromEntries(Object.entries(micro).map(([k, v]) => [k, r4(v)])), sign_tests: sign, heard_by_gold_class: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, { n: v.n, recall: r4(v.heard / v.n) }])), causal: { cuts: causalN, violations: causalFail }, tight, gold_tokens: sum(goldSets.map((s) => s.size)) };
  const lic = micro.shifted <= P.ceiling && micro.misaligned <= P.ceiling;
  const checks = { f1: micro.real >= P.f1, sign_ws: sign.ws.p <= PARAMS.ALPHA, sign_naive: sign.naive_regex.p <= PARAMS.ALPHA, licence: lic, causal: causalFail === 0 };
  if (tight) checks.tight = tight.real >= P.tight && tight.ws <= tight.real - P.tightGap; else c.gaps.push({ reason: "unmeasured", detail: "tight renderings missing" });
  c.details.checks = checks;
  c.gaps.push(...dataGaps(games, [], ["tokens"]));
  c.notes.push("The ear and the gold tokeniser implement the same PGN token grammar (python-chess's regexes are the oracle's side): independent code, one standard. The boundary difficulty lives in comments and tag lines, where whitespace splitting fails.");
  c.pass = tight ? Object.values(checks).every(Boolean) : null;
  if (!lic) c.notes.push("licence failed: a control that scores as well as the real arm means the instrument or the mechanism is broken (II.23)");
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// R2 — classify tokens
// ════════════════════════════════════════════════════════════════════════════
const canName = (cls, tag) => cls === "san" || (cls === "tag_value" && (tag === "White" || tag === "Black"));
function shapeClass(text, s, e, body) {
  const left = s > 0 ? body[s - 1] : "";
  const w = body.slice(s, e);
  if (left === "[") return "tag_name";
  if (left === '"') return "tag_value";
  if (w.startsWith("{")) return "comment";
  if (w.startsWith(";")) return "line_comment";
  if (w === "(") return "variation_open"; if (w === ")") return "variation_close";
  if (/^\$\d+$/.test(w)) return "nag";
  if (["1-0", "0-1", "1/2-1/2", "*"].includes(w)) return "result";
  if (/^\d+\.*$/.test(w)) return "move_number";
  if (/^[?!]{1,2}$/.test(w)) return "glyph";
  if (/^(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?[x-]?[a-h][1-8](?:=?[QRBN])?)[+#]*$/.test(w)) return "san";
  return "other";
}

export function measureR2(split, games, reps) {
  const P = PARAMS.R2, rng = mulberry32(PARAMS.SEED + 2);
  if (!games?.length) return unmeasured("r2", split, "gold missing");
  const classN = {}, classOk = {}, matchedLabels = [], matchedIdx = [];
  let total = 0, ok = 0, shapeOk = 0, pieceN = 0, pieceOk = 0, cnN = 0, cnOk = 0;
  const per = [];   // per gold token record: {cls, predCls|null}
  games.forEach((g) => {
    const tokens = safeEar(g.text), by = new Map(tokens.map((t) => [spanKey(t.s, t.e), t]));
    for (const t of g.tokens) {
      const pt = by.get(spanKey(t.s, t.e));
      total++; classN[t.cls] = (classN[t.cls] ?? 0) + 1;
      const hit = pt && pt.cls === t.cls;
      if (hit) { ok++; classOk[t.cls] = (classOk[t.cls] ?? 0) + 1; }
      if (shapeClass(null, t.s, t.e, g.text) === t.cls) shapeOk++;
      if (pt) matchedLabels.push(pt.cls);
      per.push(pt ? pt.cls : null);
      if (t.cls === "san" && t.piece) { pieceN++; if (pt && pt.cls === "san" && pt.piece === t.piece) pieceOk++; }
      cnN++; if (canName(pt?.cls, pt?.tag) === canName(t.cls, t.tag)) cnOk++;
    }
  });
  const acc = ok / total;
  const classes = Object.keys(classN);
  const macro = mean(classes.map((c) => (classOk[c] ?? 0) / classN[c]));
  const majorityClass = classes.sort((a, b) => classN[b] - classN[a])[0];
  const majority = classN[majorityClass] / total;
  // label_shuffled: the reader's own classes permuted among the tokens it matched (seeded Sattolo): the labels lose their tokens
  const d = derangement(matchedLabels.length, rng);
  let shufOk = 0, k = 0, idx = 0;
  games.forEach((g) => { for (const t of g.tokens) { if (per[idx] != null) { if (matchedLabels[d[k]] === t.cls) shufOk++; k++; } idx++; } });
  const labelShuffled = d ? shufOk / total : null;
  // national-letter clause on the derived renderings
  let national = null;
  if (reps?.length) {
    national = {};
    for (const lang of ["de", "fr", "hu", "pl"]) {
      let n = 0, okDecl = 0, okEn = 0;
      for (const r of reps) {
        const rep = r.reps[lang], spans = rep.spans.filter((s) => s.cls === "san");
        const byD = new Map(safeEar(rep.text, { letters: lang }).map((t) => [spanKey(t.s, t.e), t])), byE = new Map(safeEar(rep.text, { letters: "en" }).map((t) => [spanKey(t.s, t.e), t]));
        spans.forEach((s, i) => { n++; const gp = r.plies[i]?.piece; const a = byD.get(spanKey(s.s, s.e)), b = byE.get(spanKey(s.s, s.e)); if (a && a.cls === "san" && a.piece === gp) okDecl++; if (b && b.cls === "san" && b.piece === gp) okEn++; });
      }
      national[lang] = { n, declared: r4(okDecl / n), english_default: r4(okEn / n) };
    }
  }
  const c = makeCard("r2", split, { n: total });
  c.score = r4(acc); c.control = r4(Math.max(majority, labelShuffled ?? 0));
  c.controls = { majority: r4(majority), label_shuffled: r4(labelShuffled), shape_given_gold_spans_REFERENCE_not_a_control: r4(shapeOk / total) };
  const pieceAcc = pieceN ? pieceOk / pieceN : null, cnAcc = cnOk / cnN;
  c.details = { micro_accuracy: r4(acc), macro_recall: r4(macro), per_class_recall: Object.fromEntries(Object.entries(classN).map(([k2, v]) => [k2, { n: v, recall: r4((classOk[k2] ?? 0) / v) }])), majority_class: majorityClass, piece_accuracy: r4(pieceAcc), piece_n: pieceN, can_name_accuracy: r4(cnAcc), national_letters: national };
  const natDrop = national ? mean(Object.values(national).map((v) => v.declared - v.english_default)) : null;
  const checks = {
    acc: acc >= P.acc, macro: macro >= P.macro, piece: pieceAcc != null && pieceAcc >= P.piece, can_name: cnAcc >= P.canName,
    margin_majority: acc - majority >= P.margin, margin_shuffled: labelShuffled != null && acc - labelShuffled >= P.margin,
  };
  if (national) { checks.national_declared = Object.values(national).every((v) => v.declared >= P.national); checks.national_english_default_falls = natDrop >= P.nationalDrop; c.details.national_mean_drop = r4(natDrop); }
  else c.gaps.push({ reason: "unmeasured", detail: "derived renderings missing" });
  c.details.checks = checks;
  c.gaps.push(...dataGaps(games, [], ["tokens"]), ...STATIC_GAPS.r2);
  c.pass = national ? Object.values(checks).every(Boolean) : null;
  c.notes.push("R2 is thin for a formal notation: once the boundaries are heard the class is read off the token's own first characters (the shape_given_gold_spans reference); the difficulty lives in R1 and in the piece-letter prior.");
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// R3 — find beings
// ════════════════════════════════════════════════════════════════════════════
export function measureR3(split, games) {
  const P = PARAMS.R3;
  if (!games?.length) return unmeasured("r3", split, "gold missing");
  const arms = { real: [], no_board: [], shuffled_plies: [], misaligned: [] }, v1 = { real: [], no_board: [], shuffled_plies: [], misaligned: [] };
  const gold = games.map(goldBeings), reads3 = [];
  games.forEach((g, i) => {
    const rd = safeRead(g.text); reads3.push(rd);
    const real = readerBeings(rd);
    const nb = noBoardRead(g.text).beings;
    const sh = readerBeings(safeRead(shufflePlies(g.text, mulberry32(PARAMS.SEED + 3000 + i))));
    const nx = gold[(i + 1) % games.length];
    arms.real.push(KINDS.map((k) => setCounts(real[k], gold[i][k])));
    arms.no_board.push(KINDS.map((k) => setCounts(nb[k], gold[i][k])));
    arms.shuffled_plies.push(KINDS.map((k) => setCounts(sh[k], gold[i][k])));
    arms.misaligned.push(KINDS.map((k) => setCounts(real[k], nx[k])));
    const one = (b, gl) => [setCounts(b.piece1, gl.piece1), setCounts(b.square1, gl.square1)];
    v1.real.push(one(real, gold[i])); v1.no_board.push(one(nb, gold[i])); v1.shuffled_plies.push(one(sh, gold[i])); v1.misaligned.push(one(real, nx));
  });
  const kindIdx = Object.fromEntries(KINDS.map((k, j) => [k, j]));
  const f1 = (arm, kind) => microF1(arms[arm].map((cs) => cs[kindIdx[kind]]));
  const perGamePiece = (arm) => arms[arm].map((cs) => f1Of(cs[kindIdx.piece]));
  const table = Object.fromEntries(Object.keys(arms).map((a) => [a, Object.fromEntries(KINDS.map((k) => [k, r4(f1(a, k))]))]));
  const v1f1 = (arm, kind) => microF1(v1[arm].map((cs) => cs[kind === "piece" ? 0 : 1]));
  const v1Table = Object.fromEntries(Object.keys(v1).map((a) => [a, { piece: r4(v1f1(a, "piece")), square: r4(v1f1(a, "square")) }]));
  const ctl = ["no_board", "shuffled_plies", "misaligned"];
  const sign = Object.fromEntries(ctl.map((a) => [a, signTestPaired(perGamePiece("real"), perGamePiece(a))]));
  const strongest = Math.max(...ctl.map((a) => f1(a, "piece")));
  const c = makeCard("r3", split, { n: games.length });
  c.score = r4(f1("real", "piece")); c.control = r4(strongest);
  c.controls = Object.fromEntries(ctl.map((a) => [a, r4(f1(a, "piece"))]));
  c.details = { f1_by_arm_and_kind: table, v1: { note: "registered v1 items (id only, order-blind), kept so the saturation stays visible", f1_piece_square_by_arm: v1Table, v1_checks: { margin: v1f1("real", "piece") - Math.max(...ctl.map((a) => v1f1(a, "piece"))) >= P.margin, licence: v1f1("misaligned", "piece") <= v1f1("real", "piece") - P.licence } }, item: "piece and square items are (id@first-mention-ply) (A1c); move ply<n>; player white:/black:<name>", sign_tests_piece: sign, gold_items: Object.fromEntries(KINDS.map((k) => [k, sum(gold.map((g) => g[k].size))])), gold_invalid_games: games.filter((g) => !g.valid).length };
  const checks = {
    piece: f1("real", "piece") >= P.f1, square: f1("real", "square") >= P.f1, move: f1("real", "move") >= P.f1, player: f1("real", "player") >= P.f1,
    margin: f1("real", "piece") - strongest >= P.margin, sign: ctl.every((a) => sign[a].p <= PARAMS.ALPHA),
    licence: f1("shuffled_plies", "piece") <= f1("real", "piece") - P.licence && f1("misaligned", "piece") <= f1("real", "piece") - P.licence,
  };
  c.details.checks = checks;
  c.gaps.push(...dataGaps(games, reads3, ["adapter"]), ...STATIC_GAPS.r3);
  c.notes.push("Piece identity is the ORIGIN square (survives moves, castling, promotion). The board organ and python-chess implement the same FIDE rules: independent code, one rulebook; a shared misreading of the Laws would be invisible here.");
  c.pass = Object.values(checks).every(Boolean);
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// R4 — find relations and the legality claim
// ════════════════════════════════════════════════════════════════════════════
/** A4: the rule-probe stratum. item = {stratum, text, probe_ply, legal, first_unresolved_ply, rel, pseudo_accepts}; per-stratum legality / effect / exact for the reader and the controls. */
export function scoreProbes(items) {
  const P = PARAMS.R4, rows = items.map((it) => {
    const r = safeRead(it.text), got = r.first_unresolved_ply ?? null;
    const legalOk = got === (it.first_unresolved_ply ?? null);
    let effectOk = null;
    if (it.legal) { const g = new Set((r.relations ?? []).filter((x) => x.ply === it.probe_ply).map((x) => relKey(x.ply, x.end1, x.label, x.end2))); effectOk = eqSets(g, new Set(it.rel)); }
    return { it, got, legalOk, effectOk, ok: legalOk && (effectOk == null || effectOk) };
  });
  const n = rows.length, mis = (i) => rows[(i + 1) % n].it;
  const by = {};
  rows.forEach((r, i) => {
    const b = (by[r.it.stratum] ??= { n: 0, legal_items: 0, legality: 0, effect: 0, exact: 0, never_flag: 0, pseudo: 0, misaligned: 0, src: {} });
    b.n++; b.src[r.it.src] = (b.src[r.it.src] ?? 0) + 1;
    if (r.legalOk) b.legality++; if (r.it.legal) { b.legal_items++; if (r.effectOk) b.effect++; } if (r.ok) b.exact++;
    if (r.it.legal) b.never_flag++;                                 // a reader that never flags is right exactly on the legal probes
    if (r.it.pseudo_accepts === r.it.legal) b.pseudo++;             // the pseudo-legal reader (king safety ignored) is right when its verdict equals the oracle's
    if (r.got === (mis(i).first_unresolved_ply ?? null)) b.misaligned++;
  });
  const table = Object.fromEntries(Object.entries(by).map(([k, b]) => [k, { n: b.n, sources: b.src, legality_exact: r4(b.legality / b.n), effect_exact_on_legal: b.legal_items ? r4(b.effect / b.legal_items) : null, exact: r4(b.exact / b.n), legal_items: b.legal_items,
    control_never_flag: r4(b.never_flag / b.n), control_pseudo_legal: r4(b.pseudo / b.n), control_misaligned: r4(b.misaligned / b.n) }]));
  const ruled = Object.entries(table).filter(([k]) => !P.diagnosticStrata.includes(k));
  const strong = ruled.filter(([, v]) => v.n >= P.probeMinN), small = ruled.filter(([, v]) => v.n < P.probeMinN).map(([k, v]) => ({ stratum: k, n: v.n }));
  const safety = P.safetyStrata.filter((k) => table[k] && table[k].n >= P.probeMinN);
  const realSafety = safety.length ? mean(safety.map((k) => table[k].legality_exact)) : null, pseudoSafety = safety.length ? mean(safety.map((k) => table[k].control_pseudo_legal)) : null;
  const overall = { n, exact: r4(rows.filter((r) => r.ok).length / n), legality_exact: r4(rows.filter((r) => r.legalOk).length / n), misaligned_legality: r4(mean(rows.map((r, i) => (r.got === (mis(i).first_unresolved_ply ?? null) ? 1 : 0)))) };
  return { table, overall, strong: strong.map(([k]) => k), small, safety_strata: safety, real_on_safety: r4(realSafety), pseudo_legal_on_safety: r4(pseudoSafety), failing: strong.filter(([, v]) => v.exact < P.probeExact).map(([k, v]) => ({ stratum: k, exact: v.exact, n: v.n })) };
}

export function measureR4(split, games, perturbed, probes = null) {
  const P = PARAMS.R4;
  if (!games?.length) return unmeasured("r4", split, "gold missing");
  const goldRel = games.map((g) => goldRelations(g.plies));
  const arms = { real: [], no_board: [], shuffled_plies: [], misaligned: [] };
  const byLabel = Object.fromEntries(LABELS.map((l) => [l, { real: { tp: 0, p: 0, g: 0 } }]));
  const natural = [];
  const reals = games.map((g) => safeRead(g.text));
  games.forEach((g, i) => {
    const real = readerRelations(reals[i]);
    const nb = noBoardRead(g.text).rel;
    const sh = readerRelations(safeRead(shufflePlies(g.text, mulberry32(PARAMS.SEED + 4000 + i))));
    arms.real.push(setCounts(real, goldRel[i])); arms.no_board.push(setCounts(nb, goldRel[i])); arms.shuffled_plies.push(setCounts(sh, goldRel[i]));
    arms.misaligned.push(setCounts(real, goldRel[(i + 1) % games.length]));
    for (const l of LABELS) { const f = (set) => new Set([...set].filter((k) => k.split("|")[2] === l)); const cc = setCounts(f(real), f(goldRel[i])); const b = byLabel[l].real; b.tp += cc.tp; b.p += cc.p; b.g += cc.g; }
    natural.push({ id: g.id, label: g.first_unresolved_ply ?? null, got: reals[i].first_unresolved_ply ?? null });
  });
  const micro = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, microF1(v)]));
  const ctl = ["no_board", "shuffled_plies", "misaligned"];
  const strongest = Math.max(...ctl.map((a) => micro[a]));
  // legality: natural games + oracle-labelled perturbed texts
  const items = [...natural];
  let perN = 0;
  if (perturbed?.length) for (const r of perturbed) { const got = safeRead(r.text).first_unresolved_ply ?? null; items.push({ id: r.id, label: r.first_unresolved_ply ?? null, got, kind: r.kind }); perN++; }
  const exact = (xs) => xs.length ? xs.filter((x) => x.label === x.got).length / xs.length : null;
  const legal = exact(items);
  const neverFlag = items.length ? items.filter((x) => x.label === null).length / items.length : null;
  const misL = items.length ? items.filter((x, i) => items[(i + 1) % items.length].label === x.got).length / items.length : null;
  const nat = natural.filter((x) => x.label !== null);
  const natRecall = nat.length ? nat.filter((x) => x.got === x.label).length / nat.length : null;
  const falseFlags = natural.filter((x) => x.label === null && x.got !== null).length;
  const byKind = {}; for (const x of items) { if (!x.kind) continue; const b = (byKind[x.kind] ??= { n: 0, ok: 0 }); b.n++; if (x.label === x.got) b.ok++; }
  const c = makeCard("r4", split, { n: games.length });
  c.score = r4(micro.real); c.control = r4(strongest);
  c.controls = { no_board: r4(micro.no_board), shuffled_plies: r4(micro.shuffled_plies), misaligned: r4(micro.misaligned), legality_never_flag: r4(neverFlag), legality_misaligned_labels: r4(misL) };
  c.details = {
    relation_f1_by_arm: Object.fromEntries(Object.entries(micro).map(([k, v]) => [k, r4(v)])),
    real_f1_by_label: Object.fromEntries(LABELS.map((l) => [l, { f1: r4(f1Of(byLabel[l].real)), gold: byLabel[l].real.g, predicted: byLabel[l].real.p }])),
    gold_relations: sum(goldRel.map((s) => s.size)),
    legality: { items: items.length, natural: natural.length, perturbed: perN, exact: r4(legal), never_flag: r4(neverFlag), by_perturbation: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { n: v.n, exact: r4(v.ok / v.n) }])), natural_illegal_games: nat.length, natural_illegal_recall: r4(natRecall), natural_false_flags: falseFlags, perturbed_still_legal: perturbed ? perturbed.filter((r) => r.first_unresolved_ply == null).length : null },
  };
  const checks = {
    f1: micro.real >= P.f1, margin: micro.real - strongest >= P.margin,
    legality_exact: legal != null && legal >= P.legal, legality_margin: legal != null && legal - neverFlag >= P.legalMargin,
    licence_relations: micro.misaligned <= micro.real - P.licence, licence_legality: misL != null && misL <= (legal ?? 0) - P.licence,
  };
  if (!perturbed?.length) c.gaps.push({ reason: "unmeasured", detail: "perturbed legality texts missing" });
  if (nat.length < P.minIllegal) c.gaps.push({ reason: "natural_illegal_recall_underpowered", count: nat.length, of: P.minIllegal });
  // A4 rule probes (castling, promotion, disambiguation, en passant, pins, king safety), per rule
  let probesOk = true;
  if (!probes?.length) { probesOk = false; c.gaps.push({ reason: "castling_and_rule_legality_unmeasured", detail: "oracle-labelled rule probes missing (chess_pgn-probes.py): castling through or out of check, lost rights, promotion, en passant, pins are unmeasured by the natural and perturbed items alone" }); }
  else {
    const pr = scoreProbes(probes);
    c.details.rule_probes = { ...pr, note: "AUTHORED BY SCRIPT from natural positions (prefix / excursion / fen); gold = the python-chess oracle; the control built to fail is pseudo_legal (king safety and castling attacks ignored)" };
    for (const s of pr.small) c.gaps.push({ reason: "probe_stratum_underpowered", stratum: s.stratum, n: s.n, need: P.probeMinN, detail: "fewer than 30 probes: reported in the table, not in the rule" });
    c.gaps.push({ reason: "diagnostic_stratum_not_in_rule", stratum: "ill_formed_promotion", detail: "a promotion suffix on a non-promotion rank (e7=Q) is not a SAN token under lexer rule A3b; the reader types it unheard_token and counts no ply; reported in the table", entry: pr.table.ill_formed_promotion ?? null });
    c.controls.probe_pseudo_legal_on_safety_strata = pr.pseudo_legal_on_safety; c.controls.probe_misaligned_legality = pr.overall.misaligned_legality;
    if (!pr.strong.length || !pr.safety_strata.length) { probesOk = false; c.gaps.push({ reason: "probes_underpowered", strata_with_n_ge_min: pr.strong.length, safety_strata_with_n_ge_min: pr.safety_strata.length, need: P.probeMinN, detail: "no stratum (or no king-safety stratum) reaches the minimum item count (a --limit smoke run thins the probes): the probe clauses are a typed gap, pass null, never a pass or a fail by absence" }); }
    else {
      checks.probe_every_stratum = pr.failing.length === 0;
      checks.probe_beats_pseudo_legal = pr.real_on_safety - pr.pseudo_legal_on_safety >= P.probeMargin;
      checks.probe_licence_misaligned = pr.overall.misaligned_legality <= pr.overall.legality_exact - P.probeLicence;
    }
  }
  c.gaps.push(...dataGaps(games, reals, ["adapter"]), ...STATIC_GAPS.r4);
  c.details.checks = checks;
  // a failed check is a FAIL even when a gap blocks the rest; a gap alone blocks a PASS (null): never a pass by absence
  c.pass = !perturbed?.length ? null : Object.values(checks).some((v) => v === false) ? false : probesOk ? true : null;
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// R5 — agreement across representations
// ════════════════════════════════════════════════════════════════════════════
const REP_LETTERS = { uci: "en", long: "en", tight: "en", fan: "fan", de: "de", fr: "fr", es: "es", hu: "hu", pl: "pl" };
const eqSets = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const jaccard = (a, b) => { const u = new Set([...a, ...b]); if (!u.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / u.size; };

export function measureR5(split, reps, priors) {
  const P = PARAMS.R5;
  if (!reps?.length) return unmeasured("r5", split, "derived renderings missing");
  const n = reps.length;
  const E = reps.map((r) => readerRelations(safeRead(r.reps.en.text)));
  const G = reps.map((r) => goldRelations(r.plies));
  const enGold = E.filter((s, i) => eqSets(s, G[i])).length / n;
  const out = {};
  for (const [style, letters] of Object.entries(REP_LETTERS)) {
    let agree = 0, jac = 0, goldAgree = 0, agreeEn = 0, mis = 0;
    reps.forEach((r, i) => {
      const X = readerRelations(safeRead(r.reps[style].text, { letters }));
      if (eqSets(X, E[i])) agree++; jac += jaccard(X, E[i]); if (eqSets(X, G[i])) goldAgree++;
      if (eqSets(readerRelations(safeRead(r.reps[style].text, { letters: "en" })), E[i])) agreeEn++;
      if (eqSets(X, E[(i + 1) % n])) mis++;
    });
    out[style] = { agreement: r4(agree / n), jaccard: r4(jac / n), agreement_with_gold: r4(goldAgree / n), english_default: r4(agreeEn / n), misaligned: r4(mis / n) };
  }
  const styles = Object.keys(out);
  const macro = mean(styles.map((s) => out[s].agreement)), min = Math.min(...styles.map((s) => out[s].agreement));
  const misMacro = mean(styles.map((s) => out[s].misaligned));
  // FEN: the final placement from the SAN reading vs the placement read out of the oracle's FEN string
  const fenSan = reps.map((r) => { const rd = safeRead(r.reps.en.text); return rd.position ? new Set(SUT.occupiesOf(rd.position).map((x) => `${x.end1}|${x.end2}`)) : new Set(); });
  const fenGold = reps.map((r) => { const f = SUT.readFEN(`${r.final_placement} w - - 0 1`, { priors }); return new Set((f.relations ?? []).map((x) => `${x.end1}|${x.end2}`)); });
  const fenAgree = fenSan.filter((s, i) => eqSets(s, fenGold[i])).length / n, fenMis = fenSan.filter((s, i) => eqSets(s, fenGold[(i + 1) % n])).length / n;
  // letters=auto: the legal replay picks the language of the piece letters
  const lex = priors.lexicon, auto = {};
  for (const lang of ["de", "fr", "es", "hu", "pl"]) {
    let right = 0, tie = 0, wrong = 0; const sig = lex.letter_sets[lang].slice(1);
    for (const r of reps) {
      const d = SUT.detectLetters(r.reps[lang].text, { priors });
      const sigOf = (k) => (k === "fan" ? "fan" : lex.letter_sets[k].slice(1));
      if (d.best) { if (sigOf(d.best) === sig) right++; else wrong++; } else if (d.ties.some((k) => sigOf(k) === sig)) tie++; else wrong++;
    }
    auto[lang] = { right: r4(right / n), tied_typed_gap: r4(tie / n), wrong: r4(wrong / n) };
  }
  const homo = ["de", "fr", "hu", "pl"];
  const drop = mean(homo.map((s) => out[s].agreement - out[s].english_default));
  const c = makeCard("r5", split, { n });
  c.score = r4(macro); c.control = r4(Math.max(misMacro, fenMis));
  c.controls = { misaligned_rendering: r4(misMacro), fen_misaligned: r4(fenMis), english_default_mean_on_de_fr_hu_pl: r4(mean(homo.map((s) => out[s].english_default))) };
  c.notes.push("Renderings are AUTHORED BY SCRIPT from natural games (derived, never natural text); agreement is set equality of the reader's own relations, so a reader wrong in the same way on every rendering would still agree: agreement_with_gold is reported beside it.");
  c.details = { per_rendering: out, san_vs_gold_agreement: r4(enGold), fen_agreement: r4(fenAgree), letters_auto: auto, homograph_drop: r4(drop), renderings_are: "AUTHORED BY SCRIPT from natural games (derived), never natural held-out text" };
  const checks = { macro: macro >= P.macro, min: min >= P.min, misaligned: misMacro <= P.control, english_default_falls: drop >= P.drop, fen: fenAgree >= P.fen, fen_misaligned: fenMis <= P.control };
  c.details.checks = checks;
  c.pass = Object.values(checks).every(Boolean);
  if (Object.values(auto).some((a) => a.tied_typed_gap > 0)) c.gaps.push({ reason: "letters_ambiguous", detail: "piece-letter sets shared by several languages (e.g. de/da/no/sv) are ties by construction: typed, not errors", per_language: Object.fromEntries(Object.entries(auto).map(([k, v]) => [k, v.tied_typed_gap])) });
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// R0 — identify the system from content alone (causal, one word at a time)
// ════════════════════════════════════════════════════════════════════════════
function runStream(ws, priors, opts) {
  const idf = SUT.createIdentifier({ priors, ...opts });
  let st = idf.state();
  for (const w of ws) st = idf.push(w);
  return st;
}
/** A1a: a derangement inside the word: no word of >= 2 distinct characters keeps its string */
export function charShuffle(w, rng) {
  const cs = [...w];
  if (new Set(cs).size < 2) return w;
  for (let k = 0; k < 40; k++) { const p = derangement(cs.length, rng); if (!p) break; const o = p.map((i) => cs[i]).join(""); if (o !== w) return o; }
  const rot = cs.slice(1).concat(cs[0]).join("");
  return rot !== w ? rot : shuffled(cs, rng).reverse().join("");
}

const ROSTER_TAGS = ["Event", "Site", "Date", "Round", "White", "Black", "Result"];
const rosterHeader = (text) => text.split("\n").filter((l) => ROSTER_TAGS.some((k) => l.startsWith(`[${k} `))).join("\n");
/** the naive baselines of the licences, implemented HERE, independent of the adapter */
const NAIVE_SAN_WORD = /^(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;
export const naiveFirstShape = (ws) => ws.some((w) => NAIVE_SAN_WORD.test(w));
export const naiveHeader = (ws) => ws.some((w) => /^\[(?:Event|Site|Date|Round|White|Black|Result)$/.test(w));

function chessStreams(games, W, rng) {
  const out = { head: [], head_roster: [], movetext: [], mid: [] }; let short = 0; const headPlies = [];
  for (const g of games) {
    const hw = words(g.text), mw = words(movetextOf(g.text));
    if (hw.length >= W) {
      out.head.push(hw.slice(0, W));
      const ms = [...g.text.matchAll(/\S+/g)], end = ms[W - 1].index + ms[W - 1][0].length;
      headPlies.push(g.plies.filter((p) => p.span && p.span[1] <= end).length);       // gold plies inside the natural head window
    } else short++;
    const rw = words(`${rosterHeader(g.text)}\n${movetextOf(g.text)}`);
    if (rw.length >= W) out.head_roster.push(rw.slice(0, W)); else short++;
    if (mw.length >= W) out.movetext.push(mw.slice(0, W)); else short++;
    if (mw.length >= 2 * W) { const lo = Math.floor(0.1 * (mw.length - W)), hi = Math.floor(0.5 * (mw.length - W)); const a = lo + Math.floor(rng() * (hi - lo + 1)); out.mid.push(mw.slice(a, a + W)); } else short++;
  }
  return { ...out, short, headPlies };
}
function foreignWindows(docs, perDoc, W, rng, kind) {
  const out = [];
  for (const d of docs) {
    const w = words(d.text); if (w.length < W) continue;
    const per = d.extra ? PARAMS.R0.windowsPerExtraDoc : perDoc;
    const k = kind === "fasta" ? Math.min(per, Math.floor(w.length / W)) : per;
    for (let i = 0; i < k; i++) { const a = kind === "fasta" ? i * W : Math.floor(rng() * (w.length - W + 1)); out.push({ ws: w.slice(a, a + W), doc: d }); }
  }
  return out;
}

/** gaps that are DATA-dependent (counted from the gold and from the adapter's own gap output) */
export function dataGaps(games, reads, which) {
  const n = games.length, out = [];
  const total = (reason) => { let games_ = 0, count = 0; for (const r of reads) { const g = (r.gaps ?? []).find((x) => x.reason === reason); if (g) { games_++; count += g.count ?? 1; } } return { games: games_, count }; };
  if (which.includes("adapter")) {
    for (const reason of ["comment_text_unread", "variation_skipped", "nag_unread", "setup_position_read", "setup_unreadable", "variant_unsupported", "unheard_token", "nonstandard_castling_glyph", "move_number_mismatch", "capture_claim_mismatch", "check_claim_mismatch"]) {
      const t = total(reason);
      out.push(t.games === 0 ? { reason: "absent_from_data", feature: reason, count: 0, games: 0, of: n, detail: "no fetched game triggers this typed adapter gap: unmeasured, not good" } : { reason, count: t.count, games: t.games, of: n, detail: reason === "comment_text_unread" ? "brace and ';' comments are heard as one token and their prose claims (e.g. 'Re8 was best') are not read" : "typed adapter gap, counted" });
    }
    const nullMoves = games.filter((g) => g.error === "null_move").length;
    out.push(nullMoves === 0 ? { reason: "absent_from_data", feature: "null_move", count: 0, games: 0, of: n, detail: "no null move in any fetched game" } : { reason: "null_move", count: nullMoves, of: n });
  }
  if (which.includes("tokens")) {
    const counts = {}; let tot = 0;
    for (const g of games) for (const t of g.tokens) { counts[t.cls] = (counts[t.cls] ?? 0) + 1; tot++; }
    for (const cls of ["nag", "variation_open", "variation_close", "line_comment", "other"]) if (!counts[cls]) out.push({ reason: "absent_from_data", feature: `token_class:${cls}`, count: 0, of: tot, detail: `gold token class ${cls} does not occur in the fetched games: its recall is unmeasured` });
  }
  return out;
}
const STATIC_GAPS = {
  r0: [
    { reason: "natural_strangers_unmeasured", detail: "no real draughts / shogi / xiangqi / Go corpus was fetched: the other-game pools are authored by script from the notations' surface grammars (labelled authored); natural SAN-shaped words in prose and code are too rare to power a kind (see natural_near_miss)" },
    { reason: "caseless_notation_unmeasured", detail: "lower-cased SAN (nf3, bxc6) has no data and no authority here" },
    { reason: "descriptive_notation_unmeasured", detail: "English / Lewis descriptive notation (P-K4) has no data and no authority here" },
  ],
  r2: [
    { reason: "russian_piece_letters_unmeasured", detail: "Cyrillic piece letters are not in PGN Standard section 17: no authority, no data" },
    { reason: "caseless_notation_unmeasured", detail: "lower-cased SAN has no data" },
  ],
  r3: [
    { reason: "opening_names_unmeasured", detail: "ECO / Opening tags are Lichess's own table: a gold derived from them would be circular" },
    { reason: "chess_variants_unmeasured", detail: "Chess960 / crazyhouse / atomic ... are typed variant_unsupported by the adapter and have no gold here" },
  ],
  r4: [
    { reason: "descriptive_notation_unmeasured", detail: "descriptive notation has no data and no authority here" },
    { reason: "chess_variants_unmeasured", detail: "variant rules (Chess960 castling, crazyhouse drops) are not read and not measured" },
  ],
};

export function measureR0(split, games, foreign, priors, negatives = null) {
  const P = PARAMS.R0, W = PARAMS.W, rng = mulberry32(PARAMS.SEED);
  if (!games?.length) return unmeasured("r0", split, "gold missing");
  if (SUT.createIdentifier({ priors }).state().gaps?.length) return unmeasured("r0", split, "identity prior missing (or its necessary witness)");
  const cs = chessStreams(games, W, rng);
  const table = SUT.letterTable(priors.lexicon, "en"), isSan = (w) => SUT.isSanWord(w, table);
  const verdicts = (streams, opts) => streams.map((s) => runStream(s, priors, opts));
  const rate = (vs) => (vs.length ? vs.filter((v) => v.system).length / vs.length : null);
  const envRate = (vs) => (vs.length ? vs.filter((v) => v.envelope).length / vs.length : null);
  const real = { head: verdicts(cs.head), head_roster: verdicts(cs.head_roster), movetext: verdicts(cs.movetext), mid: verdicts(cs.mid) };
  const tpr = Object.fromEntries(Object.entries(real).map(([k, v]) => [k, rate(v)]));
  const first = Object.fromEntries(Object.entries(real).map(([k, v]) => [k, median(v.filter((x) => x.system).map((x) => x.first_named_at))]));
  const witnessUsed = Object.fromEntries(Object.entries(real).map(([k, v]) => [k, Object.fromEntries(Object.entries(v.filter((x) => x.system).reduce((m, x) => ((m[x.witness] = (m[x.witness] ?? 0) + 1), m), {})))]));
  // natural head windows: how many carry any gold ply (the registered 'head' arm measured the ENVELOPE)
  const headWithPly = cs.headPlies.filter((k) => k >= 1).length;
  const headMovesIdx = cs.headPlies.map((k, i) => (k >= 1 ? i : -1)).filter((i) => i >= 0);
  const headNat = { n: cs.head.length, windows_with_a_gold_ply: headWithPly, median_gold_plies_in_window: median(cs.headPlies), chess_named_rate: r4(rate(real.head)), envelope_detected_rate: r4(envRate(real.head)), head_moves_tpr: headMovesIdx.length ? r4(rate(headMovesIdx.map((i) => real.head[i]))) : null };
  // controls built to fail
  const charshuf = cs.movetext.map((s, i) => s.map((w) => charShuffle(w, mulberry32(PARAMS.SEED + 100 + i * 131 + w.length))));
  const sanNoise = cs.movetext.map((s, i) => { const idx = s.map((w, j) => (isSan(w) ? j : -1)).filter((j) => j >= 0); const pw = shuffled(idx.map((j) => s[j]), mulberry32(PARAMS.SEED + 200 + i)); const o = s.slice(); idx.forEach((j, k) => { o[j] = pw[k]; }); return o; });
  const csV = verdicts(charshuf), snV = verdicts(sanNoise);
  const kinds = {}, kindWins = {};
  const fr = mulberry32(PARAMS.SEED + 7), gaps = [];
  for (const kind of ["prose", "code", "smiles", "fasta"]) {
    const docs = foreign?.[kind];
    if (!docs) { gaps.push({ reason: "unmeasured", detail: `foreign pool ${kind} missing` }); continue; }
    const wins = foreignWindows(docs, P.windowsPerDoc[kind], W, fr, kind);
    const vs = wins.map((x) => runStream(x.ws, priors, {}));
    const byLang = {};
    wins.forEach((x, i) => { const k = x.doc.lang ?? x.doc.repo ?? "?"; (byLang[k] ??= []).push(vs[i]); });
    kindWins[kind] = wins;
    kinds[kind] = { n: vs.length, named: vs.filter((v) => v.system).length, rate: rate(vs), docs: docs.length, by_lang: Object.fromEntries(Object.entries(byLang).map(([k, v]) => [k, { n: v.length, rate: r4(rate(v)) }])), shape_first_rate: wins.filter((x) => x.ws.some((w) => isSan(w))).length / (wins.length || 1) };
    if (kind === "code") kinds[kind].files = { registered: docs.filter((d) => !d.extra).length, extra: docs.filter((d) => d.extra).length, repositories: [...new Set(docs.map((d) => d.repo ?? "?"))].length };
  }
  // A4 hard negatives: authored pools, three views for the envelope kinds; the registered v1 identifier (evidence alone) and the naive baselines run on the SAME streams
  const hard = {}; let hardMissing = false;
  if (!negatives) { hardMissing = true; gaps.push({ reason: "unmeasured", detail: "hard-negative pools missing (chess_pgn-negatives.py): a named-rate on strangers that carry no SAN-shaped word cannot fail" }); }
  else {
    for (const [kind, rows] of Object.entries(negatives)) {
      const vs = rows.map((r) => runStream(r.ws, priors, {})), v1 = rows.map((r) => runStream(r.ws, priors, { witness: false }));
      const byView = {};
      rows.forEach((r, i) => { (byView[r.view] ??= []).push(vs[i]); });
      const headRows = rows.filter((r) => r.view === "head");
      hard[kind] = { n: rows.length, named: vs.filter((v) => v.system).length, rate: rate(vs), by_view: Object.fromEntries(Object.entries(byView).map(([k, v]) => [k, { n: v.length, rate: r4(rate(v)) }])), envelope_rate: r4(envRate(vs)),
        v1_registered_identifier_rate: rate(v1), naive_first_shape_rate: rows.filter((r) => naiveFirstShape(r.ws)).length / rows.length, naive_header_rate_on_head_view: headRows.length ? headRows.filter((r) => naiveHeader(r.ws)).length / headRows.length : null };
    }
  }
  // ablations on the real movetext streams and on foreign pooled
  const hardWs = negatives ? Object.values(negatives).flat().map((r) => r.ws) : [];
  const ablate = (opts) => ({ movetext: rate(verdicts(cs.movetext, opts)), head_roster: rate(verdicts(cs.head_roster, opts)), mid: rate(verdicts(cs.mid, opts)), foreign: rate(verdicts(Object.values(kindWins).flat().map((x) => x.ws), opts)), hard_negatives: hardWs.length ? rate(verdicts(hardWs, opts)) : null });
  const abl = { no_legality: ablate({ legality: false }), no_decay: ablate({ decay: false }), unigram: ablate({ bigram: false }), witness_only_no_evidence: ablate({ evidence: false }), v1_registered_no_witness: ablate({ witness: false }) };
  // near-miss injection (DIAGNOSTIC, authored; superseded in the rule by the injected pools): dose-response of k natural SAN words in foreign carriers
  const vocab = [...new Set(cs.movetext.flat().filter(isSan))].sort();
  const inject = (ws, k, r) => { const o = ws.slice(); for (const pos of shuffled(o.map((_, i) => i), r).slice(0, k)) o[pos] = vocab[Math.floor(r() * vocab.length)]; return o; };
  const nearMiss = {};
  for (const k of [0, 1, 2, 4, 8]) {
    nearMiss[k] = {};
    for (const kind of ["prose", "code"]) {
      if (!kindWins[kind] || !vocab.length) continue;
      const vs = kindWins[kind].slice(0, 400).map((x, i) => runStream(inject(x.ws, k, mulberry32(PARAMS.SEED + 900 + k * 7919 + i)), priors, {}));
      nearMiss[k][kind] = r4(rate(vs));
    }
  }
  const naiveFirst = cs.movetext.filter((s) => s.some((w) => isSan(w))).length / (cs.movetext.length || 1);
  // natural near-miss survey (independent regex): windows of the foreign prose / code pools that carry a SAN-shaped word without any injection
  const survey = {};
  for (const kind of ["prose", "code"]) { let win = 0, hit = 0; for (const d of foreign?.[kind] ?? []) { const w = words(d.text); for (let a = 0; a + W <= w.length; a += W) { win++; if (w.slice(a, a + W).some((x) => NAIVE_SAN_WORD.test(x))) hit++; } } survey[kind] = { windows: win, windows_with_a_san_shaped_word: hit }; }
  // licence / causal
  const medReal = median(real.movetext.map((v) => v.plies_replayed)), medNoise = median(snV.map((v) => v.plies_replayed));
  const legalSign = signTestPaired(real.movetext.map((v) => v.plies_replayed), snV.map((v) => v.plies_replayed));
  let causalFail = 0, causalN = 0;
  for (const s of cs.movetext.slice(0, P.causalStreams)) {
    const idf = SUT.createIdentifier({ priors }); const trace = [];
    for (const w of s) trace.push(idf.push(w));
    for (const t of P.causalT) { causalN++; const fresh = runStream(s.slice(0, t), priors, {}); if (fresh.system !== trace[t - 1].system || Math.abs(fresh.evidence - trace[t - 1].evidence) > 1e-9) causalFail++; }
  }
  const ctlRates = { charshuf: rate(csV), ...Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.rate])), ...Object.fromEntries(Object.entries(hard).map(([k, v]) => [`neg:${k}`, v.rate])) };
  const ctlN = { charshuf: csV.length, ...Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.n])), ...Object.fromEntries(Object.entries(hard).map(([k, v]) => [`neg:${k}`, v.n])) };
  const score = mean([tpr.head_roster, tpr.movetext, tpr.mid].filter((x) => x != null));
  const strongest = Math.max(...Object.values(ctlRates).filter((x) => x != null));
  const c = makeCard("r0", split, { n: cs.head.length + cs.head_roster.length + cs.movetext.length + cs.mid.length });
  c.score = r4(score); c.control = r4(strongest); c.gaps.push(...gaps);
  c.controls = Object.fromEntries(Object.entries(ctlRates).map(([k, v]) => [k, r4(v)]));
  const sanNoiseRate = rate(snV);
  const coordMean = mean(P.coordinateKinds.filter((k) => hard[k]).map((k) => hard[k].naive_first_shape_rate));
  const headMean = mean(P.envelopeKinds.filter((k) => hard[k]?.naive_header_rate_on_head_view != null).map((k) => hard[k].naive_header_rate_on_head_view));
  const v1Caught = Object.entries(hard).filter(([, v]) => v.v1_registered_identifier_rate > P.control).map(([k]) => k);
  c.details = {
    stream_words: W, tpr: Object.fromEntries(Object.entries(tpr).map(([k, v]) => [k, r4(v)])), streams: { head_nat: cs.head.length, head_roster: cs.head_roster.length, movetext: cs.movetext.length, mid: cs.mid.length, games_short_for_a_view: cs.short },
    head_nat: headNat, median_first_named_at_word: first, named_by_witness: witnessUsed,
    median_plies_replayed: { movetext: medReal, san_noise: medNoise, paired_sign_test_real_gt_noise: legalSign, v1_rule_ge_10_and_le_3_would_have_been: medReal >= P.medianPliesReal && medNoise <= P.medianPliesNoise },
    foreign: kinds, hard_negatives: hard, control_n: ctlN, ablations_named_rate: abl,
    licences: { naive_first_shape_mean_on_coordinate_and_near_miss_kinds: r4(coordMean), naive_header_mean_on_head_view_of_envelope_kinds: r4(headMean), san_noise_named_rate: r4(sanNoiseRate), v1_registered_identifier_exceeds_5pct_on: v1Caught },
    diagnostic_not_in_rule: { near_miss_injection_named_rate_by_k_injected_san_words: nearMiss, san_noise_named_rate: r4(sanNoiseRate), naive_first_shape_named_rate_on_movetext: r4(naiveFirst), natural_near_miss_survey: survey },
    causal: { checks: causalN, violations: causalFail }, identity_window: priors.identity.window.window, gamma: priors.identity.window.gamma, witness_prior: priors.identity.witness ? { n_min: priors.identity.witness.n_min, r_min: priors.identity.witness.r_min, m_cold: priors.identity.witness.m_cold } : null,
  };
  const smallKind = Object.entries(ctlN).filter(([, n]) => n < P.minStreams).map(([k]) => k);
  if (smallKind.length) c.gaps.push({ reason: "underpowered_control_kind", kinds: smallKind, need: P.minStreams });
  for (const kind of ["prose", "code"]) c.gaps.push({ reason: survey[kind].windows_with_a_san_shaped_word < P.minStreams ? "natural_near_miss_underpowered" : "natural_near_miss_not_independent", kind, windows: survey[kind].windows, with_a_san_shaped_word: survey[kind].windows_with_a_san_shaped_word, need: P.minStreams, detail: "natural windows that carry a SAN-shaped word are too few (underpowered) or concentrated in a few files whose windows are correlated (not independent) to be a rule kind: reported with denominators, never used to pass" });
  c.gaps.push(...STATIC_GAPS.r0);
  const hardRatesOk = Object.values(hard).every((v) => v.rate <= P.control);
  const checks = {
    tpr_head_roster: tpr.head_roster >= P.head, tpr_movetext: tpr.movetext >= P.head, tpr_mid: tpr.mid >= P.mid,
    head_nat_not_named_as_chess: headNat.chess_named_rate <= P.headNatNamedMax, head_nat_envelope_detected: headNat.envelope_detected_rate >= P.headNatEnvelope,
    controls_le_5pct: Object.values(ctlRates).every((x) => x != null && x <= P.control), licence_charshuf: tpr.movetext - ctlRates.charshuf >= P.margin,
    licence_legality_moves: legalSign.p <= PARAMS.ALPHA, causal: causalFail === 0,
    licence_no_legality: abl.no_legality.movetext != null && tpr.movetext - abl.no_legality.movetext >= P.noLegalityDrop, licence_san_noise: sanNoiseRate <= P.sanNoiseMax,
    licence_naive_first_shape_caught: coordMean != null && coordMean >= P.naiveFirst, licence_naive_header_caught: headMean != null && headMean >= P.naiveHeader,
    licence_v1_identifier_caught: v1Caught.length >= P.v1CaughtKinds,
  };
  c.details.checks = checks;
  c.details.hard_negative_kinds_over_5pct = Object.entries(hard).filter(([, v]) => v.rate > P.control).map(([k, v]) => ({ kind: k, rate: r4(v.rate), by_view: v.by_view }));
  c.pass = gaps.length || smallKind.length || hardMissing ? null : Object.values(checks).every(Boolean);
  const nm1 = Math.max(nearMiss[1]?.prose ?? 0, nearMiss[1]?.code ?? 0);
  c.notes.push(`A4: a NAME needs the SPRT evidence AND a necessary witness (replay >= ${priors.identity.witness?.n_min} legal plies from the initial position, or >= ${priors.identity.witness?.r_min} roster openers and one legal ply, or - cold windows that do not claim the game start - a numbering lattice of ${priors.identity.witness?.m_cold} consecutive numbers with feasible SAN). The cold witness is STRUCTURE, not legality: the mid arm carries no legality licence. A PGN tag header alone names nothing (envelope is reported apart).`);
  c.notes.push(`The registered natural 'head' arm measured the ENVELOPE: ${headNat.windows_with_a_gold_ply} of ${headNat.n} natural head windows contain a single gold ply (the broadcast header is ~17 tag lines). The head arm with chess content is head_roster (the game's own seven roster lines + movetext, DERIVED by script from natural games).`);
  if (nm1 > 0.5) c.notes.push(`near-miss diagnostic still names ${r4(nearMiss[1].prose)} / ${r4(nearMiss[1].code)} (prose / code) at k=1: see hard_negatives.`);
  c.notes.push("ablations: no_decay and unigram stay identical to the real arm on the positives (the SPRT evidence is reached within the first words either way; the decay window changes PRESENCE, not the verdict, and does no measurable work on these streams); no_legality collapses movetext and head_roster (the replay witness is necessary and does the work there); witness_only_no_evidence reports what the evidence adds beyond the witness.");
  c.notes.push("hard-negative pools are AUTHORED BY SCRIPT (surface grammars of draughts PDN, shogi, xiangqi, Go, battleship, spreadsheet, domino, bridge, an xxd hexdump of real bytes; injections of natural SAN words into natural carriers): labelled authored, never natural held-out text.");
  return finish(c);
}

// ════════════════════════════════════════════════════════════════════════════
// measure
// ════════════════════════════════════════════════════════════════════════════
export function registrationDigest() {
  const src = fs.readFileSync(SELF, "utf8");
  const a = src.indexOf("// ═══ PRE-REGISTRATION"), b = src.indexOf("// ═══ END PRE-REGISTRATION");
  return createHash("sha256").update(src.slice(a, b)).digest("hex").slice(0, 16);
}
export function amendmentsDigest() {
  const src = fs.readFileSync(SELF, "utf8");
  const a = src.indexOf("// ═══ AMENDMENTS"), b = src.indexOf("// ═══ END AMENDMENTS");
  return a < 0 ? null : createHash("sha256").update(src.slice(a, b)).digest("hex").slice(0, 16);
}

/** measure({split="dev", limit=null, rungs}) -> { family, split, rungs: { r0..r5 }, ... } — never throws for missing data */
export async function measure({ split = "dev", limit = null, rungs = ["r0", "r1", "r2", "r3", "r4", "r5"] } = {}) {
  const t0 = Date.now(), notes = [];
  const priors = chess.loadPriors({ fresh: true });
  const digest = registrationDigest();
  if (split === "test") {
    try { fs.mkdirSync(path.dirname(LEDGER), { recursive: true }); const prior = fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).length : 0; fs.appendFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), split, limit, digest }) + "\n"); notes.push(prior === 0 ? "TEST run #1 (the one-time held-out run)" : `TEST run #${prior + 1}: TEST has been run before — this is NOT the one-time held-out evidence`); } catch (e) { notes.push("test ledger unwritable: " + e.message); }
  }
  const out = { family: FAMILY, split, limit, pre_registration_digest: digest, amendments_digest: amendmentsDigest(), priors: Object.fromEntries(Object.entries(chess.PRIOR_FILES).map(([k, f]) => [k, priors[k] ? "loaded" : "MISSING " + f])), rungs: {}, notes };
  if (priors.gaps.length) { for (const r of ["r0", "r1", "r2", "r3", "r4", "r5"]) out.rungs[r] = unmeasured(r, split, "prior missing: " + priors.gaps.map((g) => g.file).join(",")); return out; }
  const games = loadGold(split, limit);
  const reps = loadReps(split, limit), perturbed = loadPerturb(split, limit), foreign = loadForeign(split), negatives = loadNegatives(split), probes = loadProbes(split, limit);
  const run = { r0: () => measureR0(split, games, foreign, priors, negatives), r1: () => measureR1(split, games, reps), r2: () => measureR2(split, games, reps), r3: () => measureR3(split, games), r4: () => measureR4(split, games, perturbed, probes), r5: () => measureR5(split, reps, priors) };
  for (const r of rungs) {
    const t = Date.now();
    try { out.rungs[r] = run[r](); } catch (e) { out.rungs[r] = makeCard(r, split, { gaps: [{ reason: "instrument_exception", error: String(e.stack ?? e).slice(0, 600) }] }); }
    out.rungs[r].details = { ...out.rungs[r].details, seconds: r4((Date.now() - t) / 1000) };
  }
  out.seconds = r4((Date.now() - t0) / 1000);
  if (Object.values(out.rungs).some((c) => c.score != null)) try { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(`${OUT}/${split}${limit ? "-n" + limit : ""}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, JSON.stringify(out, null, 1)); } catch { /* card still returned */ }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2), get = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const only = get("--only", null);
  const res = await measure({ split: get("--split", "dev"), limit: get("--limit", null) ? Number(get("--limit", null)) : null, rungs: only ? only.split(",") : undefined });
  const brief = (c) => ({ pass: c.pass, score: c.score, control: c.control, margin: c.margin, n: c.n, controls: c.controls, checks: c.details?.checks, gaps: c.gaps.map((g) => g.reason) });
  console.log(JSON.stringify({ family: res.family, split: res.split, digest: res.pre_registration_digest, seconds: res.seconds, rungs: Object.fromEntries(Object.entries(res.rungs).map(([k, v]) => [k, brief(v)])), notes: res.notes }, null, 1));
}
