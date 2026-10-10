// eval/notation-competence/chess_pgn-priors.mjs — builds the RECEIVED priors of the chess_pgn family.
//
//   node eval/notation-competence/chess_pgn-priors.mjs --stage tables     standards tables only (no TRAIN counts): lexicon + rules (+ identity stub)
//   node eval/notation-competence/chess_pgn-priors.mjs --stage train      reads the TRAIN split ONLY and completes lexicon counts + identity (+ the A4 witness block, chained)
//   node eval/notation-competence/chess_pgn-priors.mjs --stage witness    adds / refreshes ONLY identity.witness (n_min derived on TRAIN; r_min and m_cold declared); the rest of the prior is kept
//
// Outputs: priors/notation-chess_pgn-{lexicon,rules,identity}.json   (CREATED here; no existing prior is touched)
//
// GIVERS (every prior names its giver; priors REFUSE or NOMINATE, never admit):
//   lexicon  PGN Standard 1.1 §7 (tokens), §8.2.3 (SAN), §8.2.3.8 (suffix glyphs), §8.2.4 (NAG 0..255), §9.1 (seven tag roster), §17
//            (alternative piece letters; the table below is transcribed from it); FIDE Laws of Chess 2023 Appendix C.2-C.3 (abbreviations are
//            the player's own language); Unicode U+2654..U+265F (figurines). Counts: TRAIN only (Lichess standard rated, CC0), marked.
//   rules    FIDE Laws of Chess 2023 Art. 2 (the chessboard, initial position) and Art. 3 (moves of the pieces: leapers, sliders, pawn, castling,
//            en passant, promotion), PGN §16.1 (FEN). A standards table: NO TRAIN counts.
//   identity how chess-shaped a stream of words is. TRAIN chess streams (head, movetext, mid views of Lichess standard rated games) against a
//            TRAIN BACKGROUND (UD treebank prose of 6 languages, code from the TRAIN repositories). Class-bigram log-likelihood ratios, each model interpolated
//            toward its own unigram with Dirichlet mass K (backoff); the replay witness LR = ln(p_legal_real / p_legal_null) where p_null = P(a SAN word drawn at random from the
//            TRAIN SAN vocabulary is legal at a TRAIN position) (the shuffled-order null); SPRT bounds from declared alpha = beta = 0.01;
//            the evidence decay window MEASURED by kernel/activation.js dmdWindow on TRAIN chess streams (the shallowest depth at which
//            dropping everything older changes no verdict, required for >= 1 - alpha of streams): derived, not set.
// Held-out discipline: reads corpus/train and foreign/train only. dev/test are never opened here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { dmdWindow, gammaFor } from "../../kernel/activation.js";
import * as chess from "../../adapters/notation/chess_pgn.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../../priors");
const DATA = "/private/tmp/claude-501/notation/chess_pgn";
const TODAY = new Date().toISOString().slice(0, 10);

// ── seeded RNG (the same family as the instrument) ──────────────────────────
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── standards tables ─────────────────────────────────────────────────────────
const GIVERS = {
  pgn: { name: "PGN Standard 1.1 (Edwards 1994, community-revised 2026-04-18)", url: "https://github.com/fsmosca/PGN-Standard/blob/master/PGN-Standard.txt", sections: ["§7 tokens", "§8.2.3 SAN", "§8.2.3.8 suffix annotations", "§8.2.4 NAG", "§9.1 tag roster", "§16.1 FEN", "§17 alternative piece letters"], licence_note: "repo carries no licence field; only facts (grammar, letter table) are encoded" },
  fide: { name: "FIDE Laws of Chess, effective 1 January 2023", url: "https://handbook.fide.com/chapter/E012023", sections: ["Art. 2 the chessboard", "Art. 3 the moves of the pieces", "Appendix C algebraic notation"], licence_note: "FIDE text is copyrighted; only the rules as facts are encoded" },
  unicode: { name: "Unicode Standard, Miscellaneous Symbols U+2654..U+265F (chess figurines)", url: "https://www.unicode.org/charts/PDF/U2600.pdf", licence_note: "character repertoire" },
};

// PGN §17, order: pawn knight bishop rook queen king (transcribed)
const LETTER_SETS = {
  cs: "PJSVDK", da: "BSLTDK", nl: "OPLTDK", en: "PNBRQK", et: "PROVLK", fi: "PRLTDK", fr: "PCFTDR", de: "BSLTDK", hu: "GHFBVK",
  is: "PRBHDK", it: "PCATDR", no: "BSLTDK", pl: "PSGWHK", pt: "PCBTDR", ro: "PCNTDR", es: "PCATDR", sv: "BSLTDK",
};

function lexiconTables() {
  return {
    schema: "NotationLexiconPrior@1", family: "chess_pgn", kind: "lexicon", built: TODAY, built_by: "eval/notation-competence/chess_pgn-priors.mjs",
    givers: [GIVERS.pgn, GIVERS.fide, GIVERS.unicode],
    semantics: "NOMINATES token classes and piece letters; admits nothing: a SAN-shaped word is a candidate until the board replays it.",
    pieces: { order: "PNBRQK", english: { P: "pawn", N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" } },
    letter_sets: LETTER_SETS,
    figurines: { white: "♙♘♗♖♕♔", black: "♟♞♝♜♛♚", order: "PNBRQK" },
    files: "abcdefgh", ranks: "12345678",
    results: ["1-0", "0-1", "1/2-1/2", "*"],
    castling: { short: "O-O", long: "O-O-O", tolerated_variants: ["0-0", "0-0-0"], note: "PGN §8.2.3.3 prescribes the letter O; the digit zero is read as a nonstandard glyph and recorded as a gap" },
    glyph_suffixes: ["!", "?", "!!", "!?", "?!", "??"],
    nag: { min: 0, max: 255 },
    tag_roster: ["Event", "Site", "Date", "Round", "White", "Black", "Result"],
    check_marks: ["+", "#"],
    train: null,
  };
}

function rulesTable() {
  const kn = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const k = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]], orth = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const castle = (rank) => ({
    K: { king: `e${rank}`, king_to: `g${rank}`, rook: `h${rank}`, rook_to: `f${rank}`, between: [`f${rank}`, `g${rank}`], king_path: [`e${rank}`, `f${rank}`, `g${rank}`] },
    Q: { king: `e${rank}`, king_to: `c${rank}`, rook: `a${rank}`, rook_to: `d${rank}`, between: [`b${rank}`, `c${rank}`, `d${rank}`], king_path: [`e${rank}`, `d${rank}`, `c${rank}`] },
  });
  return {
    schema: "NotationRulesPrior@1", family: "chess_pgn", kind: "rules", built: TODAY, built_by: "eval/notation-competence/chess_pgn-priors.mjs",
    givers: [GIVERS.fide, GIVERS.pgn],
    semantics: "REFUSES: a move the table does not allow is not carried out. The table is a standard, not a corpus statistic.",
    counts_from_train: null,
    board: { files: "abcdefgh", ranks: "12345678", squares: 64 },
    initial: { back_rank: "RNBQKBNR", white_back_rank: 1, black_back_rank: 8, white_pawn_rank: 2, black_pawn_rank: 7 },
    moves: {
      N: { kind: "leaper", deltas: kn }, K: { kind: "leaper", deltas: k },
      B: { kind: "slider", dirs: diag }, R: { kind: "slider", dirs: orth }, Q: { kind: "slider", dirs: [...diag, ...orth] },
      P: { kind: "pawn", push: 1, double_from_rank: { w: 2, b: 7 }, promotion_rank: { w: 8, b: 1 }, capture_files: [-1, 1], en_passant_capture_rank: { w: 5, b: 4 } },
    },
    castling: { w: castle(1), b: castle(8), conditions: ["king and rook unmoved (rights)", "squares between empty", "king not in check and not crossing or landing on an attacked square"] },
    promotion_pieces: ["N", "B", "R", "Q"],
    fen: { fields: 6, placement_order: "rank 8 to rank 1, file a to h, digits count empty squares" },
  };
}

function identityStub() {
  return { schema: "NotationIdentityPrior@1", family: "chess_pgn", kind: "identity", built: TODAY, stage: "stub", givers: [], train: null };
}

const write = (name, obj) => { fs.writeFileSync(path.join(PRIORS, name), JSON.stringify(obj, null, 1) + "\n"); console.log("wrote", name, fs.statSync(path.join(PRIORS, name)).size, "bytes"); };

// ── TRAIN readers ────────────────────────────────────────────────────────────
const readJsonl = (p) => fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const words = (t) => t.split(/\s+/).filter(Boolean);
const movetextOf = (text) => { const lines = text.split("\n"); let i = 0; while (i < lines.length && lines[i].startsWith("[")) i++; return lines.slice(i).join("\n").trim(); };

function trainStreams(games, W, rng) {
  const out = { head: [], movetext: [], mid: [] };
  for (const g of games) {
    const hw = words(g.text), mw = words(movetextOf(g.text));
    if (hw.length >= W) out.head.push(hw.slice(0, W));
    if (mw.length >= W) out.movetext.push(mw.slice(0, W));
    if (mw.length >= 2 * W) { const lo = Math.floor(0.1 * (mw.length - W)), hi = Math.floor(0.5 * (mw.length - W)); const a = lo + Math.floor(rng() * (hi - lo + 1)); out.mid.push(mw.slice(a, a + W)); }
  }
  return out;
}

function classSeq(stream, priors) {
  const ctx = { inBrace: false, inTag: false }, table = chess.letterTable(priors.lexicon, "en");
  return stream.map((w) => chess.classifyWord(w, ctx, { lexicon: priors.lexicon, table }));
}

function trainStage() {
  const rng = mulberry32(20261006);
  const W = 40;
  const priors = chess.loadPriors({ fresh: true });
  if (!priors.lexicon || !priors.rules) throw new Error("run --stage tables first");
  const games = readJsonl(`${DATA}/corpus/train/games.jsonl`);
  const trainSources = [...new Set(games.map((g) => g.source))];
  console.log("TRAIN games", games.length, trainSources);

  // 1. lexicon counts (TRAIN only)
  const tagNames = {}, clsCounts = {}, forms = { short: 0, long: 0, castle: 0 }, glyphs = {}, results = {}, letters = {};
  let withComments = 0, sanTotal = 0, captures = 0, checks = 0, mates = 0, promos = 0;
  for (const g of games) {
    const { tokens } = chess.ear(g.text, { priors });
    const seen = new Set();
    let hasComment = false;
    for (const t of tokens) {
      clsCounts[t.cls] = (clsCounts[t.cls] ?? 0) + 1;
      if (t.cls === "tag_name") { if (!seen.has(t.text)) { seen.add(t.text); tagNames[t.text] = (tagNames[t.text] ?? 0) + 1; } }
      if (t.cls === "glyph") glyphs[t.text] = (glyphs[t.text] ?? 0) + 1;
      if (t.cls === "result") results[t.text] = (results[t.text] ?? 0) + 1;
      if (t.cls === "comment") hasComment = true;
      if (t.cls === "san") { sanTotal++; forms[t.form] = (forms[t.form] ?? 0) + 1; if (t.capture) captures++; if (t.check) checks++; if (t.mate) mates++; if (t.promotion) promos++; letters[t.piece] = (letters[t.piece] ?? 0) + 1; }
    }
    if (hasComment) withComments++;
  }
  const lexicon = { ...lexiconTables(), train: {
    marker: "COUNTS BELOW COME FROM TRAIN ONLY (Lichess standard rated, online, CC0); the grammar tables above come from the standards",
    sources: trainSources, games: games.length, built: TODAY,
    tag_name_games: Object.fromEntries(Object.entries(tagNames).sort((a, b) => b[1] - a[1])),
    token_class_counts: clsCounts, san: { total: sanTotal, forms, capture_marked: captures, check_marked: checks, mate_marked: mates, promotions: promos, by_piece: letters },
    glyph_counts: glyphs, result_counts: results, games_with_brace_comments: withComments,
  } };

  // 2. identity. TRAIN is cross-fitted by index parity: EVEN games / docs estimate the class-bigram LLR, ODD ones measure the decay window and
  //    calibrate the decision threshold (a threshold calibrated on the data its LLR was estimated from would be optimistic).
  const estGames = games.filter((_, i) => i % 2 === 0), calGames = games.filter((_, i) => i % 2 === 1);
  const chessEst = trainStreams(estGames, W, rng), chessCal = trainStreams(calGames, W, rng);
  const chessSeqs = [...chessEst.head, ...chessEst.movetext, ...chessEst.mid].map((s) => classSeq(s, priors));
  const prose = readJsonl(`${DATA}/foreign/train/prose.jsonl`), code = readJsonl(`${DATA}/foreign/train/code.jsonl`);
  const windows = (docs, n) => { const out = []; const usable = docs.filter((d) => words(d.text).length >= W); const per = Math.ceil(n / usable.length); for (const d of usable) { const w = words(d.text); for (let i = 0; i < per; i++) { const a = Math.floor(rng() * (w.length - W + 1)); out.push(w.slice(a, a + W)); } } return out.slice(0, n); };
  const half = (docs, r) => docs.filter((_, i) => i % 2 === r);
  const nEach = 3000;
  const bgEst = [...windows(half(prose, 0), nEach), ...windows(half(code, 0), nEach)];
  const bgCal = [...windows(half(prose, 1), nEach), ...windows(half(code, 1), nEach)];
  const bg = bgEst.map((s) => classSeq(s, priors));
  const K = chess.IDENTITY_CLASSES.length - 1;                    // current classes (the start symbol is never a current class)
  const count = (seqs) => { const c = {}, tot = {}, uni = {}; let n = 0; for (const s of seqs) { let prev = "^"; for (const cur of s) { c[`${prev}>${cur}`] = (c[`${prev}>${cur}`] ?? 0) + 1; tot[prev] = (tot[prev] ?? 0) + 1; uni[cur] = (uni[cur] ?? 0) + 1; n++; prev = cur; } } return { c, tot, uni, n }; };
  const c1 = count(chessSeqs), c0 = count(bg);
  // SMOOTHING (A3a). Each model's bigram is interpolated toward ITS OWN add-one unigram with Dirichlet mass lambda = K (backoff): p_m(cur|prev) =
  // (c_m(prev,cur) + lambda * p_m(cur)) / (n_m(prev) + lambda). A context a model has not seen inherits what that model says about the class overall.
  // (The pooled-count shrinkage used before the second dev run erased the evidence of every sparse context: head TPR 0.)
  const bigram_llr = {}, unigram_llr = {}, lambda = K;
  const uni = (c, cur) => ((c.uni[cur] ?? 0) + 1) / (c.n + K);
  const smooth = (c, prev, cur) => ((c.c[`${prev}>${cur}`] ?? 0) + lambda * uni(c, cur)) / ((c.tot[prev] ?? 0) + lambda);
  for (const prev of chess.IDENTITY_CLASSES) for (const cur of chess.IDENTITY_CLASSES.slice(1)) {
    // A2a: the start symbol carries no evidence: the TRAIN chess streams begin at the game start while background windows begin mid-document,
    // so '^>cur' would measure how the windows were cut, not the notation
    bigram_llr[`${prev}>${cur}`] = prev === "^" ? 0 : Math.log(smooth(c1, prev, cur) / smooth(c0, prev, cur));
  }
  for (const cur of chess.IDENTITY_CLASSES.slice(1)) unigram_llr[cur] = Math.log(uni(c1, cur) / uni(c0, cur));

  // 3. replay witness: p_real (movetext streams from move 1) and p_null (random SAN word from the TRAIN vocabulary at a TRAIN position)
  const R = chess.compileRules(priors.rules);
  let okReal = 0, nReal = 0;
  const pool = [];
  for (const g of games) for (const t of chess.ear(g.text, { priors }).tokens) if (t.cls === "san") pool.push(t);
  for (const g of games.slice(0, 5000)) {
    let pos = chess.initialPosition(R);
    for (const t of chess.ear(g.text, { priors }).tokens.filter((x) => x.cls === "san").slice(0, 20)) { const r = chess.resolveMove(pos, t, R); nReal++; if (r.ok) { okReal++; pos = r.next; } else break; }
  }
  let okNull = 0, nNull = 0;
  for (let i = 0; i < 20000; i++) {
    const g = games[Math.floor(rng() * games.length)];
    const sans = chess.ear(g.text, { priors }).tokens.filter((x) => x.cls === "san");
    if (sans.length < 4) continue;
    const k = Math.floor(rng() * sans.length);
    let pos = chess.initialPosition(R), good = true;
    for (let j = 0; j < k; j++) { const r = chess.resolveMove(pos, sans[j], R); if (!r.ok) { good = false; break; } pos = r.next; }
    if (!good) continue;
    const draw = pool[Math.floor(rng() * pool.length)];
    nNull++; if (chess.resolveMove(pos, draw, R).ok) okNull++;
  }
  const pReal = (okReal + 1) / (nReal + 2), pNull = (okNull + 1) / (nNull + 2);
  const legality = { p_real: pReal, p_null: pNull, llr: Math.log(pReal / pNull), n_real: nReal, ok_real: okReal, n_null: nNull, ok_null: okNull, null_model: "SAN word drawn uniformly from the TRAIN SAN occurrences, tried at a random TRAIN position (same words, shuffled order)" };

  // 4. decision threshold and decay window.
  //    A_wald = ln((1-beta)/alpha) from declared alpha = beta = 0.01 (Wald). It assumes small increments; here one transition can add more than A, so
  //    the false-alarm rate it implies does not hold (A2b, added after the first dev run: measured 4.6% on prose against alpha = 1%). A is therefore
  //    CALIBRATED on held-back TRAIN background windows: the smallest value that at most alpha of them reach (max of the evidence over the window),
  //    never below A_wald. The decay window is measured by dmdWindow with the final A; window and A are iterated to a fixed point (at most 3 rounds).
  const alpha = 0.01, beta = 0.01, A_wald = Math.log((1 - beta) / alpha);
  const identityCore = { schema: "NotationIdentityPrior@1", family: "chess_pgn", kind: "identity", built: TODAY, built_by: "eval/notation-competence/chess_pgn-priors.mjs",
    givers: [{ name: "kernel/activation.js dmdWindow (Bateson: difference that makes a difference)", note: "the decay window is measured, not set" }, { name: "Wald SPRT bound from declared alpha=beta=0.01, calibrated against held-back TRAIN background" }, GIVERS.pgn, GIVERS.fide],
    semantics: "NOMINATES the system chess_pgn from a stream of words; the verdict latches (identity does not decay), presence decays with the measured window.",
    bigram_llr, unigram_llr, legality, classes: chess.IDENTITY_CLASSES, start_symbol: "carries no evidence (A2a)" };
  const candidates = [4, 6, 8, 12, 16, 24, 32];
  const sample = [...chessCal.head.slice(0, 1500), ...chessCal.movetext.slice(0, 1500), ...chessCal.mid.slice(0, 1500)];
  const nullMaxima = (gamma) => {
    const tp = { ...priors, identity: { ...identityCore, sprt: { A: Infinity }, window: { gamma } } };
    const ms = bgCal.map((s) => { const idf = chess.createIdentifier({ priors: tp }); let m = 0; for (const w of s) m = Math.max(m, idf.push(w).evidence); return m; });
    ms.sort((a, b) => a - b);
    const idx = ms.length - Math.floor(alpha * ms.length) - 1;
    return { A_null: ms[idx] + 1e-9, n: ms.length, share_reaching_wald: ms.filter((m) => m >= A_wald).length / ms.length, max: ms.at(-1) };
  };
  const windowFor = (A) => {
    const tp = { ...priors, identity: { ...identityCore, sprt: { A }, window: { gamma: 1 } } };
    const agreeAt = Object.fromEntries(candidates.map((d) => [d, 0]));
    let measured = 0, undefinedN = 0;
    for (const s of sample) {
      const res = dmdWindow(s, (obs) => chess.identify(obs, { priors: tp, decay: false }).system === "chess_pgn", { candidates });
      measured++;
      if (res.window == null) { undefinedN++; continue; }
      for (const d of candidates) if (d >= res.window) agreeAt[d]++;
    }
    const share = Object.fromEntries(candidates.map((d) => [d, agreeAt[d] / measured]));
    const w = candidates.find((d) => share[d] >= 1 - alpha) ?? null;
    return { w, share, measured, undefinedN };
  };
  let A = A_wald, gamma = 0.75, win = windowFor(A), rounds = [];
  for (let r = 0; r < 3; r++) {
    const g = win.w ? gammaFor(win.w) : gammaFor(candidates.at(-1));
    const nm = nullMaxima(g);
    const A2 = Math.max(A_wald, nm.A_null);
    rounds.push({ round: r + 1, window: win.w, gamma: g, A_null: nm.A_null, share_of_null_windows_reaching_A_wald: nm.share_reaching_wald, A: A2 });
    gamma = g;
    const w2 = windowFor(A2);
    const stable = w2.w === win.w && Math.abs(A2 - A) < 1e-9;
    A = A2; win = w2;
    if (stable) break;
  }
  const windowRec = win.w ? { window: win.w, gamma: gammaFor(win.w), candidates, agree_share: win.share, streams_measured: win.measured, streams_no_agreeing_depth: win.undefinedN, basis: "kernel/activation.js dmdWindow on held-back TRAIN chess streams: the smallest candidate depth at which dropping everything older changes no verdict for >= 1-alpha of streams", fixed_point_rounds: rounds }
    : { window: candidates.at(-1), gamma: gammaFor(candidates.at(-1)), candidates, agree_share: win.share, streams_measured: win.measured, gap: "reach_exceeds_candidates", basis: "no candidate reached 1-alpha agreement; the widest candidate is used and the gap is typed", fixed_point_rounds: rounds };
  const identity = { ...identityCore, sprt: { alpha, beta, A_wald, A_null_calibrated: rounds.at(-1)?.A_null, A, calibration: "smallest A that at most alpha of held-back TRAIN background windows reach (max evidence over the window), never below A_wald" }, window: windowRec, train: {
    marker: "ALL COUNTS FROM TRAIN ONLY; cross-fitted by index parity: even games/docs estimate the LLR, odd ones measure the window and calibrate A",
    chess: { sources: trainSources, games: games.length, estimation_games: estGames.length, calibration_games: calGames.length, streams: chessSeqs.length, stream_words: W, views: ["head", "movetext", "mid"], words: c1.n },
    background: { prose_stems: [...new Set(prose.map((d) => d.lang))], code_repos_train: [...new Set(code.map((d) => d.repo))], estimation_streams: bg.length, calibration_streams: bgCal.length, words: c0.n, equal_weight: "3000 prose windows + 3000 code windows per half",
      licence_note: "this prior keeps ONLY aggregate class-transition frequencies and the numbers derived from them; no background text is retained. The text came from UD treebank train splits (each treebank's own LICENSE.txt in /private/tmp/claude-501/tb/<stem>/, mostly CC BY-SA 4.0) and from the TRAIN repositories under ethos/09-source-code (each repo's own licence)." } } };
  return { lexicon, identity, report: { legality, sprt: identity.sprt, window: windowRec, c1n: c1.n, c0n: c0.n, sha: createHash("sha1").update(JSON.stringify(bigram_llr)).digest("hex").slice(0, 10) } };
}

// ── A4 (independent review of R0): the NECESSARY WITNESS of the identifier ────────────────────────────────────────────────────────────────
// n_min is DERIVED on TRAIN: the smallest number of plies n for which a random SAN-shaped chain replays n plies LEGALLY from the initial position with probability <= alpha.
// Two nulls, the larger bound wins: SAN words drawn BY OCCURRENCE (the shuffled-order null of the legality witness) and SAN words drawn UNIFORMLY BY TYPE (every distinct
// SAN string TRAIN contains once: a stranger that is not shaped like real play). r_min (roster openers) and m_cold (consecutive numbers of the lattice) are DECLARED
// provisionals (P4), said in the prior. Reads corpus/train only; the identity prior is rewritten with the block added and nothing else touched.
function witnessStage() {
  const rng = mulberry32(20261006 ^ 0xa4);
  const priors = chess.loadPriors({ fresh: true });
  if (!priors.identity || priors.identity.stage === "stub") throw new Error("run --stage train first");
  const games = readJsonl(`${DATA}/corpus/train/games.jsonl`);
  const trainSources = [...new Set(games.map((g) => g.source))];
  const R = chess.compileRules(priors.rules);
  const occ = [];
  for (const g of games) for (const t of chess.ear(g.text, { priors }).tokens) if (t.cls === "san") occ.push(t);
  const typeMap = new Map(); for (const t of occ) if (!typeMap.has(t.text)) typeMap.set(t.text, t);
  const types = [...typeMap.values()];
  const TRIALS = 200000, NMAX = 8, alpha = 0.01;
  const chain = (pool) => { let pos = chess.initialPosition(R), L = 0; for (let k = 0; k < NMAX; k++) { const r = chess.resolveMove(pos, pool[Math.floor(rng() * pool.length)], R); if (!r.ok) break; pos = r.next; L++; } return L; };
  const dist = (pool) => { const ge = new Array(NMAX + 1).fill(0); for (let i = 0; i < TRIALS; i++) { const L = chain(pool); for (let n = 1; n <= L; n++) ge[n]++; } return ge.map((x) => x / TRIALS); };
  const pOcc = dist(occ), pType = dist(types);
  let nMin = null; for (let n = 1; n <= NMAX; n++) if (Math.max(pOcc[n], pType[n]) <= alpha) { nMin = n; break; }
  const identity = { ...priors.identity, witness: {
    schema: "NotationIdentityWitness@1",
    semantics: "a NAME needs the SPRT evidence AND one of these necessary witnesses; the evidence alone names nothing (A4). Priors REFUSE or NOMINATE: the witness is a refusal of the naming, not an admission.",
    givers: [{ name: "FIDE Laws of Chess 2023 Art. 2-3 (the table the replay is carried out on)" }, { name: "PGN Standard 1.1 §8.2.2 (move number indications: the numbering lattice) and §9.1 (the seven tag roster)", url: GIVERS.pgn.url }],
    n_min: nMin, alpha, n_min_basis: "smallest n with max(P_occurrence(L>=n), P_type(L>=n)) <= alpha, L = plies a random SAN-shaped chain replays legally from the initial position (DERIVED on TRAIN)",
    null_chain: { trials: TRIALS, p_replay_at_least_n_by_occurrence: pOcc, p_replay_at_least_n_by_type: pType, vocabulary: { occurrences: occ.length, types: types.length } },
    r_min: 3, r_min_basis: "DECLARED provisional (P4): distinct seven-tag-roster openers that make a PGN envelope; with >= 1 legal ply they name chess",
    m_cold: 3, m_cold_basis: "DECLARED provisional (P4): consecutive lattice-consistent move-number tokens after the anchor (cold start only: the first number is not 1.), every SAN word since the anchor feasible for some piece",
    witnesses: ["replay (>= n_min legal plies from the initial position)", "header+replay (>= r_min roster openers and >= 1 legal ply)", "cold_lattice (not a game-start claim; numbering lattice + feasible SAN)"],
    train: { marker: "n_min derived from TRAIN ONLY (Lichess standard rated, CC0); r_min and m_cold are declarations, not estimates", sources: trainSources, games: games.length, built: TODAY },
  } };
  write("notation-chess_pgn-identity.json", identity);
  console.log(JSON.stringify({ n_min: nMin, pOcc: pOcc.map((x) => +x.toFixed(5)), pType: pType.map((x) => +x.toFixed(5)), vocabulary: { occurrences: occ.length, types: types.length } }, null, 1));
}

const stage = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : "tables";
if (stage === "tables") {
  write("notation-chess_pgn-lexicon.json", lexiconTables());
  write("notation-chess_pgn-rules.json", rulesTable());
  write("notation-chess_pgn-identity.json", identityStub());
} else if (stage === "train") {
  const { lexicon, identity, report } = trainStage();
  write("notation-chess_pgn-lexicon.json", lexicon);
  write("notation-chess_pgn-identity.json", identity);
  console.log(JSON.stringify(report, null, 1));
  witnessStage();                                              // A4: the identity prior is incomplete without its necessary witness: chain it so a rebuild never drops it
} else if (stage === "witness") {
  witnessStage();
} else { console.error("unknown stage", stage); process.exit(2); }
