// tests/notation-chess_pgn.test.js — the chess_pgn notation adapter and its INSTRUMENT are regression-guarded here.
//
// PREDICTION (FOLD-CONSTITUTION II.5, written before the first run of this file): on a TOY fixture whose right answer is known by construction
// (6 AUTHORED games, labelled authored in the fixture, never natural data; gold by the same python-chess oracle as the real corpora)
//   * a PERFECT reader scores 1 on R1 (span F1), R2 (class accuracy), R3 (piece F1), R4 (relation F1 and legality) and R5 (agreement), and its controls
//     score visibly lower (whitespace split, no-board reader, shuffled plies, misaligned game, English-default letters, never-flag);
//   * a DERANGED reader (spans shifted by one character / the right engine fed the plies in the wrong order / letters ignored / never flags) scores
//     LOW and the instrument says pass:false (II.23: a control built to fail must fail; an instrument a deranged reader passes is broken);
//   * the registration digest of the instrument header has not moved (a pre-registration is not edited after the fact);
//   * a missing prior, a missing foreign pool or a missing gold file is a TYPED GAP (pass:null), never a throw and never a pass.
// PASS RULE: every assertion below holds. Nothing here touches the dev or test corpora (the toy fixture is self-contained).
//
// A4/A5 ADDENDUM (independent review; PREDICTION written before the tests below were first run, 2026-10-06):
//   * the identifier names NOTHING from a PGN tag header, a draughts / shogi / xiangqi record in the PGN envelope, a header with invented tags, prose with SAN-shaped words, spreadsheet
//     or battleship coordinates, or a long-algebraic cold stream; it names a stream that replays >= n_min legal plies, a roster header plus one legal ply, and a cold numbered SAN window;
//     it reports the envelope apart from the system; a prior without the witness block is a typed gap, never a name;
//   * the instrument can FAIL: an identifier that names at the first SAN-shaped word (the registered v1 mechanism, and an independent naive one) is caught by the hard-negative pools of
//     measureR0 (named-rate >= .5 on the coordinate / near-miss kinds, the controls check false) while the real identifier is not; the toy pools are AUTHORED here, never natural data;
//   * the rule probes of R4 score 1 on every stratum for the real adapter (oracle-labelled, authored toy fixture) and each source MUTANT of the adapter (castle through attack, king moves keep
//     the rights, rook moves keep the rights, no promotion, no pins, no en passant) falls below 1 on the stratum of the rule it broke (II.23: a control built to fail must fail);
//   * missing probes are a typed gap (castling_and_rule_legality_unmeasured) and pass null, never a pass.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as chess from "../adapters/notation/chess_pgn.js";
import os from "node:os";
import { pathToFileURL } from "node:url";
import {
  PARAMS, measureR0, measureR1, measureR2, measureR3, measureR4, measureR5, withSut, registrationDigest, charShuffle, mulberry32, derangement,
  signTestPaired, goldRelations, goldBeings, shufflePlies, measure, scoreProbes, naiveFirstShape, naiveHeader, dataGaps,
} from "../eval/notation-competence/chess_pgn.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOY = JSON.parse(fs.readFileSync(path.join(HERE, "../eval/notation-competence/chess_pgn-toy.json"), "utf8"));
const GAMES = TOY.games;
const PROBES = JSON.parse(fs.readFileSync(path.join(HERE, "../eval/notation-competence/chess_pgn-probes-toy.json"), "utf8"));   // AUTHORED by script from seeded random play; gold = python-chess
const priors = chess.loadPriors({ fresh: true });
const keyOf = (r) => new Set(r.relations.map((x) => `${x.ply}|${x.end1}|${x.label}|${x.end2}`));
const eq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// ── the received priors ──────────────────────────────────────────────────────

test("priors are received: each names its giver, the standards tables carry no TRAIN counts, the TRAIN counts are marked and come from the train source only", () => {
  assert.deepEqual(priors.gaps, [], "all three prior files load");
  for (const k of ["lexicon", "rules", "identity"]) assert.ok(priors[k].givers.length >= 1, `${k} names a giver`);
  assert.equal(priors.rules.counts_from_train, null, "the rules are a standard, not a corpus statistic");
  assert.match(priors.lexicon.train.marker, /TRAIN ONLY/);
  assert.match(priors.identity.train.marker, /TRAIN ONLY/);
  for (const s of priors.lexicon.train.sources) assert.match(s, /^lichess_standard_rated/, "train source, never the broadcast months used for dev/test");
  assert.ok(priors.identity.sprt.A >= priors.identity.sprt.A_wald, "A is calibrated upward, never below the Wald bound");
  assert.match(priors.identity.window.basis, /dmdWindow/, "the decay window is measured by the kernel's dmdWindow, not set");
  assert.equal(priors.lexicon.letter_sets.de, "BSLTDK", "PGN section 17 transcribed");
});

test("a system with no received prior is a typed gap, not a guess", () => {
  const none = { gaps: [{ reason: "prior_missing", kind: "all" }], lexicon: null, rules: null, identity: null };
  assert.equal(chess.read("1. e4 e5", { priors: none }).gaps[0].reason, "prior_missing");
  assert.equal(chess.ear("1. e4 e5", { priors: none }).tokens.length, 0);
  assert.ok(chess.createIdentifier({ priors: none }).state().gaps.length > 0);
});

// ── the ear ──────────────────────────────────────────────────────────────────

test("the ear hears exactly the gold lexemes (spans and classes) on every toy game", () => {
  for (const g of GAMES) {
    const heard = chess.ear(g.text).tokens, gold = g.tokens;
    assert.deepEqual(heard.map((t) => [t.s, t.e, t.cls]), gold.map((t) => [t.s, t.e, t.cls]), g.id);
  }
});

test("a SAN-looking word inside a comment is not a move: the comment is one token", () => {
  const g = GAMES[1];
  const toks = chess.ear(g.text).tokens;
  const c = toks.find((t) => t.cls === "comment" && /Re8 was best/.test(t.text));
  assert.ok(c, "the quoted move stays inside its comment token");
  assert.equal(toks.filter((t) => t.cls === "san" && t.s >= c.s && t.e <= c.e).length, 0);
  const r = chess.read(g.text);
  assert.ok(!r.plies.some((p) => p.text === "Re8"), "Re8 is not read as a ply");
});

test("causal: every prefix emits exactly the first tokens of the whole reading; streaming equals batch", () => {
  const rng = mulberry32(7);
  for (const g of GAMES) {
    const full = chess.ear(g.text).tokens;
    for (let k = 0; k < 12; k++) {
      const cut = Math.floor(rng() * g.text.length);
      const got = chess.createEar().push(g.text.slice(0, cut));
      assert.ok(got.length <= full.length);
      got.forEach((t, i) => assert.deepEqual([t.s, t.e, t.cls], [full[i].s, full[i].e, full[i].cls]));
    }
    const e = chess.createEar(); const acc = [];
    for (let i = 0; i < g.text.length; i += 7) acc.push(...e.push(g.text.slice(i, i + 7)));
    acc.push(...e.end());
    assert.deepEqual(acc.map((t) => [t.s, t.e, t.cls]), full.map((t) => [t.s, t.e, t.cls]));
  }
});

test("causal reading: a prefix cut at a word boundary yields exactly the beings and relations of the whole reading that lie before the cut", () => {
  const rng = mulberry32(21);
  for (const g of GAMES) {
    const full = chess.read(g.text);
    for (let k = 0; k < 10; k++) {
      let cut = Math.floor(rng() * g.text.length);
      while (cut < g.text.length && !/\s/.test(g.text[cut])) cut++;
      const pre = chess.read(g.text.slice(0, cut));
      const nSan = chess.ear(g.text.slice(0, cut)).tokens.filter((x) => x.cls === "san").length;
      const itemOf = (b) => `${b.kind}|${b.id}|${b.ply ?? ""}`;
      const want = new Set(full.beings.filter((b) => b.span[1] <= cut).map(itemOf));
      assert.deepEqual([...new Set(pre.beings.map(itemOf))].sort(), [...want].sort(), `${g.id} beings @${cut}`);
      const wantRel = new Set(full.relations.filter((r) => r.ply <= nSan).map((r) => `${r.ply}|${r.end1}|${r.label}|${r.end2}`));
      assert.deepEqual([...keyOf(pre)].sort(), [...wantRel].sort(), `${g.id} relations @${cut}`);
    }
  }
});

test("lexer rule A3b: a promotion suffix only on a promotion rank; 'f3N' is not a move, 'e8=Q+' is", () => {
  const t = chess.ear("1. f3N e8=Q+ axb8=N").tokens;
  assert.equal(t.filter((x) => x.cls === "san").length, 2);
  assert.ok(t.some((x) => x.cls === "other" && x.text === "f3N"));
  assert.equal(t.find((x) => x.text === "e8=Q+").promotion, "Q");
  assert.equal(chess.isSanWord("f3N", chess.letterTable(priors.lexicon, "en")), false);
});

// ── the reader: beings and relations equal the oracle's ──────────────────────

test("read(): beings and relations equal the oracle's on every toy game, including the illegal one up to its first unresolved ply", () => {
  for (const g of GAMES) {
    const r = chess.read(g.text);
    assert.ok(eq(keyOf(r), goldRelations(g.plies)), `${g.id} relations`);
    const gb = goldBeings(g);
    for (const kind of ["piece", "square", "move", "player"]) {
      const got = new Set(r.beings.filter((b) => b.kind === kind).map((b) => (kind === "piece" || kind === "square" ? `${b.id}@${b.ply}` : b.id)));
      assert.ok(eq(got, gb[kind]), `${g.id} ${kind}`);
    }
    assert.equal(r.first_unresolved_ply, g.first_unresolved_ply, `${g.id} legality`);
    if (g.valid) assert.equal(r.placement, g.final_placement, `${g.id} final placement`);
  }
});

test("specific rules: capture, en passant, castling both ways, promotion by capture, mate, disambiguation", () => {
  const rel = (g) => chess.read(GAMES[g].text).relations;
  assert.ok(rel(0).some((x) => x.label === "captures" && x.end1 === "wN-g1" && x.end2 === "bP-e7"), "Nxe5 by the g1 knight takes the pawn that began on e7 (identity is the origin square)");
  assert.ok(rel(0).some((x) => x.label === "gives_check" && x.end1 === "wB-f1"), "Bxf7+");
  assert.ok(rel(0).some((x) => x.label === "checkmates" && x.end1 === "wN-b1" && x.end2 === "bK-e8"), "Nd5# by the b1 knight");
  assert.ok(rel(1).some((x) => x.label === "captures" && x.end1 === "wP-e2" && x.end2 === "bP-c7"), "dxc6 e.p.: the e-pawn (now on d5) removes the c-pawn that is not on the destination square");
  assert.ok(rel(1).some((x) => x.label === "castles_with" && x.end2 === "wR-h1"), "O-O");
  assert.ok(rel(2).some((x) => x.label === "castles_with" && x.end2 === "wR-a1"), "O-O-O");
  assert.ok(rel(3).some((x) => x.label === "promotes_to" && x.end2 === "Q"), "axb8=Q");
  const g = chess.read(GAMES[1].text);
  assert.ok(g.plies.some((p) => p.text === "Nbd2" && p.pid === "wN-b1"), "file disambiguation picks the b1 knight");
});

test("the illegal move is refused with a typed gap and the rest of the replay is counted unread, not guessed", () => {
  const r = chess.read(GAMES[4].text);
  const g = (reason) => r.gaps.find((x) => x.reason === reason);
  assert.equal(g("illegal_move").ply, 3);
  assert.equal(g("replay_lost_plies_unread").count, 2);
  assert.equal(r.plies.length, 2);
});

// ── representations and piece-letter languages ───────────────────────────────

test("R5 mechanics: every derived rendering reads to the same relations as the SAN rendering (letters declared); English-default fails where letters differ; fen agrees", () => {
  const letters = { uci: "en", long: "en", tight: "en", fan: "fan", de: "de", fr: "fr", es: "es", hu: "hu", pl: "pl" };
  for (const r of TOY.reps) {
    const base = keyOf(chess.read(r.reps.en.text));
    assert.ok(eq(base, goldRelations(r.plies)), "SAN vs oracle");
    for (const [style, lt] of Object.entries(letters)) assert.ok(eq(keyOf(chess.read(r.reps[style].text, { letters: lt })), base), `${r.id} ${style}`);
    for (const style of ["de", "hu", "pl"]) assert.ok(!eq(keyOf(chess.read(r.reps[style].text, { letters: "en" })), base), `${r.id} ${style} English-default must fail`);
    const fen = chess.readFEN(`${r.final_placement} w - - 0 1`, { priors });
    assert.ok(fen.ok);
    assert.equal(fen.placement, r.final_placement);
  }
});

test("letters=auto chooses the piece-letter language by legal replay; sets shared by several languages are a typed tie, not an error", () => {
  const r = TOY.reps[0];
  for (const lang of ["de", "fr", "hu", "pl"]) {
    const d = chess.detectLetters(r.reps[lang].text, { priors });
    const want = priors.lexicon.letter_sets[lang].slice(1);
    const chosen = d.best ?? d.ties.find((k) => (k === "fan" ? "fan" : priors.lexicon.letter_sets[k].slice(1)) === want);
    assert.ok(chosen, lang);
    assert.equal(priors.lexicon.letter_sets[chosen].slice(1), want, lang);
  }
  assert.ok(chess.distinctLetterSets(priors.lexicon).length < Object.keys(priors.lexicon.letter_sets).length + 1, "de/da/no/sv share one set");
});

// ── R0 identifier ────────────────────────────────────────────────────────────

const words = (t) => t.split(/\s+/).filter(Boolean);
const PROSE = "The committee met on Tuesday to discuss the proposed changes to the zoning ordinance and several residents spoke against the plan before the vote was finally taken late in the evening";

test("identifier: names chess from a movetext stream, not from prose; the first word carries no evidence; the verdict is causal", () => {
  const mt = words(GAMES[5].text.split("\n\n")[1]);
  const idf = chess.createIdentifier({ priors });
  const s0 = idf.push(mt[0]);
  assert.equal(s0.evidence, 0, "a stream start is not evidence");
  assert.equal(s0.system, null);
  const trace = [s0, ...mt.slice(1).map((w) => idf.push(w))];
  assert.equal(trace.at(-1).system, "chess_pgn");
  assert.ok(trace.at(-1).plies_replayed >= 8, "the replay witness admitted plies");
  for (const t of [3, 5, 9]) { const fresh = chess.identify(mt.slice(0, t), { priors }); assert.equal(fresh.system, trace[t - 1].system); assert.ok(Math.abs(fresh.evidence - trace[t - 1].evidence) < 1e-9); }
  assert.equal(chess.identify(words(PROSE), { priors }).system, null, "prose is not named");
});

test("identity does not decay, presence does: once named, a foreign tail keeps the verdict but lets presence fade", () => {
  const mt = words(GAMES[5].text.split("\n\n")[1]);
  const idf = chess.createIdentifier({ priors });
  for (const w of mt) idf.push(w);
  assert.equal(idf.state().present, true);
  let st; for (let i = 0; i < 6; i++) for (const w of words(PROSE)) st = idf.push(w);
  assert.equal(st.system, "chess_pgn", "identity latched");
  assert.equal(st.present, false, "presence decayed");
});

// ── A4: the identifier needs a NECESSARY witness; the envelope is reported apart ─────────────────────────────────────────────────────────────────────────────────

const HDR = '[Event "Open"] [Site "Rome"] [Date "2023.01.01"] [Round "1"] [White "A"] [Black "B"] [Result "1-0"]';

test("identifier A4: a tag header, other-game records in the PGN envelope, invented tags, SAN-shaped words in prose, coordinates and a long-algebraic cold stream name NOTHING; the envelope is reported apart", () => {
  const cases = {
    tags_only: [HDR, true],
    pdn_draughts: [`${HDR} [GameType "20"] 1. 32-28 18-23 2. 37-32 12-18 3. 41-37 7-12 4. 46-41 1-7 5. 34-30 20-24 6. 30x19 14x23 1-0`, true],
    shogi: [`${HDR} 1. P-7f P-3d 2. P-2f P-8d 3. P-2e G-3b 1-0`, true],
    xiangqi_wxf: [`${HDR} 1. C2=5 N8+7 2. N2+3 R9=8 3. R1=2 C8+4 1-0`, true],
    garbled_tags: ['[Foo "bar"] [Bar "baz"] [Qux "x"] [Quux "y"] [Event "x"] [Zed "z"]', false],
    prose_with_san: ["The committee met on Tuesday and discussed Nf3 and then Be4 before Re8 closed the vote on the plan", false],
    spreadsheet: ["A1 B2 C3 D4 E5 F6 G7 H8 a1 b2 c3 d4 e5 f6 g7 h8 SUM c3 d4", false],
    battleship: ["e4 b7 h2 d5 a1 c3 g6 f8 e2 b4 h5 d7", false],
    cold_long_form: ["17. d4e5 c6d5 18. f3g5 h7h6 19. g5f7 e8f7 20. d1h5 g7g6 21. h5g6 f7e8 22. g6e6 d7e6", false],     // mid-game UCI: a long form is another representation, it breaks the cold lattice
  };
  for (const [name, [text, env]] of Object.entries(cases)) {
    const st = chess.identify(text, { priors });
    assert.equal(st.system, null, `${name} must not be named`);
    assert.equal(st.envelope, env, `${name} envelope`);
  }
  assert.ok(priors.identity.witness.n_min >= 2, "n_min is derived on TRAIN");
  assert.equal(priors.identity.witness.train.marker.startsWith("n_min derived from TRAIN ONLY"), true);
});

test("identifier A4: it names a stream that replays n_min legal plies, a roster header plus one legal ply, and a numbered SAN window that does not claim the game start; a stream that claims move 1 and is not legal is not named", () => {
  const mt = words(GAMES[5].text.split("\n\n")[1]);
  const replay = chess.identify(mt, { priors });
  assert.equal(replay.system, "chess_pgn"); assert.equal(replay.witness, "replay"); assert.ok(replay.plies_replayed >= priors.identity.witness.n_min);
  const head = chess.identify(`${HDR} 1. e4 e5 2. Nf3 Nc6`, { priors });
  assert.equal(head.system, "chess_pgn"); assert.equal(head.envelope, true); assert.ok(["header+replay", "replay"].includes(head.witness));
  const g3 = words(GAMES[2].text.split("\n\n")[1]);                      // "1. d4 Nf6 2. Nc3 d5 3. Bf4 e6 4. Qd2 Be7 5. O-O-O O-O 6. e3 c5 7. Nf3 Nc6 8. Kb1 b5 ..."
  const mid = chess.identify(g3.slice(g3.indexOf("3.")), { priors });
  assert.equal(mid.system, "chess_pgn"); assert.equal(mid.witness, "cold_lattice"); assert.equal(mid.plies_replayed, 0, "the cold witness is structure, not legality");
  const shuffledClaimingMove1 = [...g3]; const idx = g3.map((w, i) => (chess.isSanWord(w, chess.letterTable(priors.lexicon, "en")) ? i : -1)).filter((i) => i >= 0);
  const rev = idx.map((i) => g3[i]).reverse(); idx.forEach((i, k) => { shuffledClaimingMove1[i] = rev[k]; });
  assert.equal(chess.identify(shuffledClaimingMove1, { priors }).system, null, "a stream that claims the game start must replay legally");
  assert.equal(chess.identify(mt, { priors }).first_named_at, replay.first_named_at, "deterministic");
});

test("identifier A4: a prior without the witness block is a typed gap and names nothing; the registered v1 mechanism (witness:false) is kept as an ablation and still names a tag header", () => {
  const bare = { ...priors, identity: { ...priors.identity, witness: undefined } };
  const idf = chess.createIdentifier({ priors: bare });
  assert.equal(idf.state().gaps[0].reason, "witness_prior_missing");
  assert.equal(chess.identify(words(GAMES[5].text.split("\n\n")[1]), { priors: bare }).system, null);
  assert.equal(chess.identify(HDR, { priors, witness: false }).system, "chess_pgn", "the v1 mechanism names an envelope: that is what the hard-negative pools must catch");
});

test("sanFeasible refuses geometry no piece has, and only refuses", () => {
  const R = chess.compileRules(priors.rules), t = chess.letterTable(priors.lexicon, "en");
  const attrsOf = (w) => chess.ear(w).tokens.find((x) => x.cls === "san");
  const f = (w) => { const a = attrsOf(w); return a ? chess.sanFeasible(a, R) : null; };
  assert.equal(f("Nf3"), true); assert.equal(f("exd5"), true); assert.equal(f("O-O"), true); assert.equal(f("e8=Q+"), true);
  assert.equal(f("a1"), false, "a pawn cannot land on rank 1 without promoting");
  assert.equal(f("axh5"), false, "a pawn capture needs a neighbouring file");
  assert.equal(f("xe5"), false);
  assert.equal(f("Nad3"), false, "a knight three files away cannot be the mover");
  assert.equal(f("Bb1c2"), true);
  assert.equal(f("Ba1b3"), false, "a bishop does not move like that");
});

// ── the instrument: a perfect reader scores 1, a deranged one low ────────────

const approx = (x, y, e = 1e-9) => Math.abs(x - y) < e;

test("R1: the perfect reader scores 1 and beats whitespace and the naive regex; a one-character-shifted reader scores 0 and fails", () => {
  const c = measureR1("dev", GAMES, TOY.reps);
  assert.ok(approx(c.score, 1));
  assert.ok(c.controls.ws < 0.6 && c.controls.naive_regex < 0.8, JSON.stringify(c.controls));
  assert.ok(c.controls.shifted <= 0.05 && c.controls.misaligned <= 0.2);
  assert.equal(c.details.causal.violations, 0);
  assert.equal(c.pass, true);
  const shifted = { ...chess, ear: (t, o) => ({ tokens: chess.ear(t, o).tokens.map((x) => ({ ...x, s: x.s + 1, e: x.e + 1 })), gaps: [] }), createEar: (o) => { const e = chess.createEar(o); return { push: (x) => e.push(x).map((t) => ({ ...t, s: t.s + 1, e: t.e + 1 })), end: () => [] }; } };
  const d = withSut(shifted, () => measureR1("dev", GAMES, TOY.reps));
  assert.ok(d.score < 0.05, "deranged score " + d.score);
  assert.equal(d.pass, false);
});

test("R2: perfect class accuracy 1 with the majority and label-shuffled controls low; the letter prior moves the national-letter score; a reader that mislabels everything fails", () => {
  const c = measureR2("dev", GAMES, TOY.reps);
  assert.ok(approx(c.score, 1) && approx(c.details.piece_accuracy, 1));
  assert.ok(c.controls.majority < 0.6 && c.controls.label_shuffled < 0.5, JSON.stringify(c.controls));
  for (const v of Object.values(c.details.national_letters)) assert.ok(v.declared === 1 && v.english_default < 1);
  assert.equal(c.pass, true);
  const relabel = { ...chess, ear: (t, o) => ({ tokens: chess.ear(t, o).tokens.map((x) => ({ ...x, cls: x.cls === "san" ? "glyph" : x.cls })), gaps: [] }) };
  const d = withSut(relabel, () => measureR2("dev", GAMES, TOY.reps));
  assert.ok(d.score < 0.8 && d.pass === false, "deranged " + d.score);
});

test("R3: the perfect reader scores 1 on piece identity; no-board, shuffled-plies and misaligned controls score lower; the right engine fed the wrong order fails (II.23)", () => {
  const c = measureR3("dev", GAMES);
  assert.ok(approx(c.score, 1));
  assert.ok(c.controls.shuffled_plies < 0.7 && c.controls.misaligned < 0.7 && c.controls.no_board < 1, JSON.stringify(c.controls));
  const wrongOrder = { ...chess, read: (t, o) => chess.read(shufflePlies(t, mulberry32(11)), o) };
  const d = withSut(wrongOrder, () => measureR3("dev", GAMES));
  assert.ok(d.score < 0.7, "deranged " + d.score);
  assert.equal(d.pass, false);
});

test("R3 is order-aware: the registered v1 id-only items saturate, the order-aware items do not (the licence of the amendment)", () => {
  const c = measureR3("dev", GAMES);
  const v1 = c.details.v1.f1_piece_square_by_arm;
  assert.ok(v1.misaligned.piece >= c.controls.misaligned, "id-only misaligned score is never below the order-aware one");
});

test("R4: perfect relation F1 and legality 1 (natural + oracle-labelled perturbed texts); never_flag and misaligned labels lower; a reader that never flags fails", () => {
  const c = measureR4("dev", GAMES, TOY.perturb, PROBES.items);
  assert.ok(approx(c.score, 1) && approx(c.details.legality.exact, 1), JSON.stringify(c.details.legality));
  assert.ok(c.controls.legality_never_flag < 0.8 && c.controls.no_board < 1);
  assert.equal(c.details.legality.natural_illegal_recall, 1);
  const neverFlags = { ...chess, read: (t, o) => ({ ...chess.read(t, o), first_unresolved_ply: null }) };
  const d = withSut(neverFlags, () => measureR4("dev", GAMES, TOY.perturb, PROBES.items));
  assert.ok(d.details.legality.exact < 0.7, "deranged legality " + d.details.legality.exact);
  assert.equal(d.pass, false);
});

test("R4 without rule probes is a typed gap and pass null (castling legality unmeasured), never a pass; the card carries the data gaps with denominators", () => {
  const c = measureR4("dev", GAMES, TOY.perturb);
  assert.equal(c.pass, null);
  assert.ok(c.gaps.some((g) => g.reason === "castling_and_rule_legality_unmeasured"));
  const withProbes = measureR4("dev", GAMES, TOY.perturb, PROBES.items);
  const rows = withProbes.gaps.filter((g) => g.reason === "absent_from_data");
  assert.ok(rows.some((g) => g.feature === "variation_skipped" && g.count === 0 && g.of === GAMES.length), "an absent adapter gap is typed with its denominator");
  assert.ok(withProbes.gaps.some((g) => g.reason === "comment_text_unread" && g.count >= 1), "the comment gap is counted");
  assert.ok(withProbes.gaps.some((g) => g.reason === "chess_variants_unmeasured"));
});

test("rule probes: every stratum scores 1 for the real adapter, and the control built to fail (pseudo-legal reader) is far below on the king-safety strata", () => {
  const pr = scoreProbes(PROBES.items);
  for (const [k, v] of Object.entries(pr.table)) if (k !== "ill_formed_promotion") assert.equal(v.exact, 1, `${k} ${JSON.stringify(v)}`);
  assert.ok(pr.table.ill_formed_promotion.legality_exact < 1, "the diagnostic stratum is reported as it is: an ill-formed word is not a counted ply");
  for (const k of ["castle_through_attack", "castle_out_of_check", "ep_pinned", "pin_illegal", "king_into_check", "check_ignored"]) assert.ok(pr.table[k].control_pseudo_legal <= 0.2, `${k} pseudo ${pr.table[k].control_pseudo_legal}`);
  for (const k of ["castle_rights_lost_king", "castle_rights_lost_rook", "ep_pinned", "disambig_both", "castle_through_attack"]) assert.ok(pr.table[k]?.n >= 6, `${k} is present in the toy probes`);
  assert.ok(pr.overall.misaligned_legality < pr.overall.legality_exact - 0.2);
});

// ── mutants of the adapter: a rule broken in the SOURCE must show in the stratum of that rule (the instrument can fail) ──────────────────────────────────────────
const ADAPTER = path.join(HERE, "../adapters/notation/chess_pgn.js");
async function mutant(name, old, neu) {
  const src = fs.readFileSync(ADAPTER, "utf8");
  assert.equal(src.split(old).length - 1, 1, `mutation site for ${name} is unique`);
  const abs = fileURLToPath(new URL("../priors/", import.meta.url));
  const patched = src.replace(old, neu).replace('fileURLToPath(new URL("../../priors/", import.meta.url))', JSON.stringify(abs));
  const f = path.join(os.tmpdir(), `chess_pgn_mutant_${process.pid}_${name}.mjs`);
  fs.writeFileSync(f, patched);
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(f, { force: true }); }
}
const MUTANTS = [
  ["castle_through_attack", 'if (c.path.some((s) => attacked(pos, s, 1 - pos.turn, R))) return null;', "", ["castle_through_attack", "castle_out_of_check"]],
  ["king_keeps_rights", 'if (p.t === "K") { rights[col].K = false; rights[col].Q = false; }', "", ["castle_rights_lost_king"]],
  ["rook_keeps_rights", 'for (const cc of ["w", "b"]) for (const s of ["K", "Q"]) { const rk = R.castling[cc][s].rook; if (mv.from === rk || mv.to === rk) rights[cc][s] = false; }', "", ["castle_rights_lost_rook"]],
  ["no_promotion", "board[mv.to] = mv.promotion ? { c: p.c, t: mv.promotion, id: p.id } : p;", "board[mv.to] = p;", ["promo_follow"]],   // promo_under alone does not see it: the wrong piece matters only LATER (A5)
  ["no_pins", "const legalAfter = (pos, mv, R) => !inCheck(applyMove(pos, mv, R), pos.turn, R);", "const legalAfter = (pos, mv, R) => true;", ["pin_illegal", "king_into_check", "check_ignored"]],
  ["no_en_passant", "else if (!b[d] && d === pos.ep)", "else if (false)", ["ep_legal"]],
];
for (const [name, old, neu, strata] of MUTANTS) {
  test(`mutant ${name}: the rule probes catch it (II.23)`, async () => {
    const m = await mutant(name, old, neu);
    const pr = withSut(m, () => scoreProbes(PROBES.items));
    for (const k of strata) assert.ok(pr.table[k].exact < 1, `${name}: ${k} must fall below 1, got ${pr.table[k].exact}`);
    assert.ok(Object.entries(pr.table).some(([k, v]) => k !== "ill_formed_promotion" && v.exact < 1));
  });
}

test("the natural-game R3/R4/R5 items alone do NOT catch the castle-through-attack mutant (the reviewer's finding, kept as a regression of the instrument's blind spot)", async () => {
  const m = await mutant("blind", 'if (c.path.some((s) => attacked(pos, s, 1 - pos.turn, R))) return null;', "");
  const c = withSut(m, () => measureR3("dev", GAMES));
  assert.ok(approx(c.score, 1), "R3 on natural toy games is blind to the broken rule: only the rule probes see it");
});

test("R5: the perfect reader agrees with itself across renderings (1) and the misaligned pairing does not; a reader that ignores the declared letters fails", () => {
  const c = measureR5("dev", TOY.reps, priors);
  assert.ok(approx(c.score, 1), JSON.stringify(c.details.per_rendering));
  assert.equal(c.controls.misaligned_rendering, 0);
  assert.equal(c.details.fen_agreement, 1);
  assert.equal(c.pass, true);
  const ignoresLetters = { ...chess, read: (t, o) => chess.read(t, { ...o, letters: "en" }) };
  const d = withSut(ignoresLetters, () => measureR5("dev", TOY.reps, priors));
  assert.ok(d.score < 0.9 && d.pass === false, "deranged " + d.score);
});

test("R0 instrument: the char-shuffle control is a derangement inside each word; missing foreign pools are a typed gap, not a pass", () => {
  const rng = mulberry32(3);
  for (const w of ["e4", "Nf3", "1.", "Bxc6+", "O-O", "{", "[%clk", "0:03:00]", "exd5=Q+"]) {
    const o = charShuffle(w, rng);
    assert.equal(o.length, w.length);
    assert.deepEqual([...o].sort(), [...w].sort(), "same characters");
    if (new Set(w).size >= 2) assert.notEqual(o, w, `${w} must not keep its string`);
  }
  const c = measureR0("dev", GAMES, { prose: null, code: null, smiles: null, fasta: null }, priors);
  assert.equal(c.pass, null);
  assert.ok(c.gaps.some((g) => g.reason === "unmeasured"));
});

// the hard-negative pools of the instrument: AUTHORED here (toy), never natural data; the naive and the registered-v1 identifier must be CAUGHT, the real one must not
function toyNegatives() {
  const rng = mulberry32(5), sq = () => "abcdefgh"[Math.floor(rng() * 8)] + (1 + Math.floor(rng() * 8));
  const hdr = HDR.split(" ");
  const SANS = ["e4", "Nf3", "Bb5", "exd5", "Qxe5+", "O-O", "Rd1", "c4", "Nbd2", "h3"];
  const pw = words(PROSE);
  const rows = (kind, n, f) => Array.from({ length: n }, (_, i) => ({ id: `${kind}:${i}`, kind, view: "window", ws: f(i), authored: true }));
  return {
    battleship_lower: rows("battleship_lower", 120, () => Array.from({ length: 40 }, sq)),
    pdn_draughts: Object.assign(rows("pdn_draughts", 120, (i) => [...hdr, ...Array.from({ length: 40 }, (_, j) => (j % 3 === 0 ? `${Math.floor(j / 3) + 1}.` : `${1 + Math.floor(rng() * 50)}-${1 + Math.floor(rng() * 50)}`))].slice(0, 40)).map((r, i) => ({ ...r, view: "head" }))),
    prose_san_k4: rows("prose_san_k4", 120, () => { const ws = pw.concat(pw).slice(0, 40); for (let k = 0; k < 4; k++) ws[Math.floor(rng() * 40)] = SANS[Math.floor(rng() * SANS.length)]; return ws; }),
  };
}
// AUTHORED long records: the toy games re-rendered with a Lichess-style clock comment on every ply (so a 40-word window holds a few plies, as in the broadcast data)
const longGames = () => GAMES.filter((g) => g.valid).map((g) => {
  const sans = chess.ear(g.text).tokens.filter((t) => t.cls === "san").map((t) => t.text);
  const mt = sans.map((x, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : `${(i - 1) / 2 + 1}... `}${x} { [%clk 0:0${i % 10}:00] }`).join(" ");
  return { text: `${g.text.split("\n\n")[0]}\n\n${mt}`, plies: [], valid: true };
}).filter((g) => words(g.text.split("\n\n")[1]).length >= 80);
const naiveIdentifier = () => ({ ...chess, createIdentifier: () => { let named = false, n = 0, env = false; const st = () => ({ system: named ? "chess_pgn" : null, present: named, evidence: 0, words: n, plies_replayed: 0, envelope: env, witness: null, first_named_at: named ? n : null, gaps: [] }); return { push(w) { n++; if (naiveFirstShape([w])) named = true; if (naiveHeader([w])) env = true; return st(); }, state: st }; } });

test("R0 instrument A4: the real identifier is not caught by the hard-negative pools; the naive one (names at the first SAN-shaped word) and the registered v1 mechanism ARE (II.23)", () => {
  const negs = toyNegatives(), games = longGames();
  assert.ok(games.length >= 1, "toy games with >= 40 movetext words");
  const none = { prose: null, code: null, smiles: null, fasta: null };
  const real = measureR0("dev", games, none, priors, negs);
  for (const k of Object.keys(negs)) assert.ok(real.details.hard_negatives[k].rate <= 0.05, `${k} ${real.details.hard_negatives[k].rate}`);
  assert.equal(real.details.checks.controls_le_5pct, true);
  assert.ok(real.details.licences.naive_first_shape_mean_on_coordinate_and_near_miss_kinds >= 0.5 || real.details.hard_negatives.battleship_lower.naive_first_shape_rate >= 0.5, "the naive baseline fires on the coordinate pool: the pool is not vacuous");
  assert.ok(real.details.hard_negatives.pdn_draughts.naive_header_rate_on_head_view >= 0.9, "the naive header baseline names every PDN head stream");
  assert.ok(real.details.hard_negatives.pdn_draughts.envelope_rate >= 0.9, "the real identifier reports the envelope of the PDN heads, but names nothing");
  const naive = withSut(naiveIdentifier(), () => measureR0("dev", games, none, priors, negs));
  assert.ok(naive.details.hard_negatives.battleship_lower.rate >= 0.5 && naive.details.hard_negatives.prose_san_k4.rate >= 0.5, JSON.stringify(naive.controls));
  assert.equal(naive.details.checks.controls_le_5pct, false); assert.notEqual(naive.pass, true);
  const v1 = withSut({ ...chess, createIdentifier: (o) => chess.createIdentifier({ ...o, witness: false }) }, () => measureR0("dev", games, none, priors, negs));
  assert.ok(v1.details.hard_negatives.pdn_draughts.rate >= 0.5, "the registered v1 identifier names the PDN envelope: " + v1.details.hard_negatives.pdn_draughts.rate);
  assert.equal(v1.details.checks.controls_le_5pct, false);
});

test("R0 instrument A4: missing hard-negative pools are a typed gap and pass null (never a pass by absence); natural near-miss is reported with denominators, not used to pass", () => {
  const c = measureR0("dev", longGames(), { prose: null, code: null, smiles: null, fasta: null }, priors, null);
  assert.equal(c.pass, null);
  assert.ok(c.gaps.some((g) => g.reason === "unmeasured" && /hard-negative/.test(g.detail)));
  assert.ok(c.gaps.some((g) => g.reason === "natural_strangers_unmeasured"));
});

test("typed gaps: dataGaps counts the adapter's own gap output with denominators and types the absent features", () => {
  const reads = GAMES.map((g) => chess.read(g.text));
  const rows = dataGaps(GAMES, reads, ["adapter", "tokens"]);
  assert.ok(rows.find((r) => r.reason === "comment_text_unread" && r.count >= 1));
  assert.ok(rows.find((r) => r.reason === "absent_from_data" && r.feature === "variation_skipped" && r.of === GAMES.length));
  assert.ok(rows.find((r) => r.reason === "absent_from_data" && r.feature === "token_class:nag"));
});

test("instrument arithmetic: exact sign test and derangements; the pre-registration digest has not moved", () => {
  const t = signTestPaired([1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]);
  assert.ok(approx(t.p, 1 / 64));
  assert.equal(signTestPaired([1, 0], [1, 0]).p, 1, "ties are dropped, no discordant pairs: no evidence");
  const rng = mulberry32(5);
  for (let n = 2; n < 40; n++) { const p = derangement(n, rng); assert.ok(p.every((v, i) => v !== i)); assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i)); }
  assert.equal(registrationDigest(), "6627fb373e126281", "the registration block of the instrument header is frozen; amendments live after it");
  assert.equal(PARAMS.ALPHA, 0.05);
});

test("measure() never throws for missing data: a split with no gold is six typed gaps", async () => {
  const card = await measure({ split: "no-such-split", limit: 5 });
  for (const r of ["r0", "r1", "r2", "r3", "r4", "r5"]) {
    assert.equal(card.rungs[r].pass, null, r);
    assert.ok(card.rungs[r].gaps.length >= 1, r);
    for (const f of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(f in card.rungs[r], `${r}.${f}`);
  }
});
