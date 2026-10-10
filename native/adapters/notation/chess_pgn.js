// adapters/notation/chess_pgn.js — a NOTATION ADAPTER for chess records: SAN inside PGN (and its siblings UCI / long algebraic /
// figurine / national piece letters, FEN as a position string).
//
// WHAT THIS IS. A medium grammar that lives in an adapter, never in the kernel. It reads TEXT, in reading order, from received priors:
//   priors/notation-chess_pgn-lexicon.json   the PGN token grammar and piece letters (giver: PGN Standard §7-8,§17; FIDE Laws App. C;
//                                            Unicode U+2654..265F), plus counts that come from TRAIN and are marked as such
//   priors/notation-chess_pgn-rules.json     the rules of the board as a table (giver: FIDE Laws of Chess Art. 2-3; PGN §16.1 FEN)
//   priors/notation-chess_pgn-identity.json  how chess-shaped a stream of words is, estimated on TRAIN only against a TRAIN background
// A system with no received prior is a TYPED GAP: loadPriors() reports it and every reader returns {gaps:[{reason:"prior_missing"}]}.
//
// LOVELACE'S LAW applied to code-like notation: the engine here has no pretensions to originate anything. It does what the text ORDERS:
// a SAN token orders "move the piece that can legally reach this square"; the board organ carries that order out and refuses what cannot
// be carried out (illegal_move, ambiguous_move), and a refused order ends the replay with a typed gap; it never guesses the intent.
//
// WHAT IT IS NOT. It is the SYSTEM UNDER TEST of eval/notation-competence/chess_pgn.mjs, never the gold: the gold is python-chess
// (an external oracle; this file imports nothing from it and nothing from any model). No LLM call anywhere.
//
// RULES THAT BIND IT (READING-SPEC / READING-POLICY): CAUSAL (the scanner emits a token only once its end is certain, so
// ear(prefix) is a prefix of ear(full); the board replays ply by ply from the prefix alone); priors REFUSE or NOMINATE, never admit (a
// SAN-shaped word is a nomination, the legal replay is what admits a ply); identity does not decay, presence does (the identifier latches
// its verdict, reports presence apart, and decays evidence with a window MEASURED on TRAIN by kernel/activation.js dmdWindow); casing is
// ONE witness (SAN uses case to separate bishop from b-pawn; legality is the witness that decides when the case is wrong or the letters
// are another language's).
//
// EXPORTS
//   FAMILY, PRIOR_FILES, loadPriors({dir})
//   ear(text, {priors, letters})        -> { tokens:[{s,e,text,cls,...}], gaps }          (tokens carry class; san tokens carry piece, to, ...)
//   createEar({priors, letters})        -> { push(chunk) -> tokens completed so far, end() -> remaining tokens }   (streaming ear)
//   read(text, {priors, letters})       -> { system, beings:[{id,kind,span}], relations:[{end1,label,end2,ply}], gaps, plies, tags, placement, tokens }
//   readFEN(text, {priors})             -> { ok, placement, relations, gaps }
//   detectLetters(text, {priors})       -> ranked piece-letter languages by legal replay (letters:"auto" uses it)
//   createIdentifier({priors,...})      -> { push(word) -> {system, present, evidence, envelope, witness, ...}, state() }   (R0, causal, one word at a time)
//   sanFeasible(attrs, R)               -> is this SAN word geometrically possible for SOME piece (board-free refusal; FIDE Art. 3)
//   engine pieces used by tests: initialPosition, resolveMove, applyMove, placementOf, compileRules, classifyWord, wordSanRegex
// beings kinds: player, piece (id = colour+piece+ORIGIN square, e.g. wN-g1: identity survives moves, castling and promotion), square,
// move (id ply<n>). relation labels: moves_to captures castles_with promotes_to gives_check checkmates occupies.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const FAMILY = "chess_pgn";
export const PRIOR_FILES = Object.freeze({
  lexicon: "notation-chess_pgn-lexicon.json",
  rules: "notation-chess_pgn-rules.json",
  identity: "notation-chess_pgn-identity.json",
});
export const PRIOR_DIR = fileURLToPath(new URL("../../priors/", import.meta.url));
/** the surfaces this adapter reads: SAN (also with national piece letters), UCI, long algebraic, figurine (FAN), FEN as a position string */
export const SYSTEMS = Object.freeze(["san", "uci", "long_algebraic", "fan", "national_letters", "fen"]);
const priorCache = new Map();

/** Read the received priors. Never throws: a missing or unreadable file becomes a typed gap on the returned object. */
export function loadPriors({ dir = PRIOR_DIR, fresh = false } = {}) {
  if (!fresh && priorCache.has(dir)) return priorCache.get(dir);
  const out = { dir, lexicon: null, rules: null, identity: null, gaps: [] };
  for (const [kind, file] of Object.entries(PRIOR_FILES)) {
    try { out[kind] = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf8")); }
    catch (e) { out.gaps.push({ reason: "prior_missing", kind, file, error: String(e.code ?? e.message) }); }
  }
  priorCache.set(dir, out);
  return out;
}

const missing = (priors, kinds) => (priors?.gaps ?? [{ reason: "prior_missing", kind: "all" }]).filter((g) => kinds.includes(g.kind) || g.kind === "all");

// ════════════════════════════════════════════════════════════════════════════
// letters: piece letters per language (PGN Standard §17) and figurines (Unicode), from the lexicon prior
// ════════════════════════════════════════════════════════════════════════════
const STD = "PNBRQK";
const tableCache = new WeakMap();

/** letterTable(lexicon, key) -> { key, toStd: Map(char -> std letter), pieceChars, promoChars }. key: a language code of the prior, "fan", or "en". */
export function letterTable(lexicon, key = "en") {
  let byKey = tableCache.get(lexicon);
  if (!byKey) tableCache.set(lexicon, (byKey = new Map()));
  if (byKey.has(key)) return byKey.get(key);
  const toStd = new Map();
  if (key === "fan") {
    const f = lexicon.figurines;
    for (let i = 0; i < 6; i++) { toStd.set(f.white[i], STD[i]); toStd.set(f.black[i], STD[i]); }
  } else {
    const set = lexicon.letter_sets[key];
    if (!set) { byKey.set(key, null); return null; }
    for (let i = 0; i < 6; i++) toStd.set(set[i], STD[i]);
  }
  const chars = (letters) => [...toStd.entries()].filter(([, v]) => letters.includes(v)).map(([k]) => k).join("");
  // UCI writes the promotion piece in lower case (e7e8q); that is a promotion letter only, never a piece letter (b is a file, B a bishop)
  const lower = new Map([["n", "N"], ["b", "B"], ["r", "R"], ["q", "Q"]]);
  const t = { key, toStd, lower, pieceChars: chars("NBRQK"), promoChars: chars("NBRQ") + "nbrq" };
  byKey.set(key, t);
  return t;
}

/** The distinct piece-letter sets of the prior (several languages share one) + FAN, in prior order. */
export function distinctLetterSets(lexicon) {
  const seen = new Map();
  for (const [k, v] of Object.entries(lexicon.letter_sets)) { const sig = v.slice(1); if (!seen.has(sig)) seen.set(sig, { key: k, languages: [k] }); else seen.get(sig).languages.push(k); }
  const out = [...seen.values()];
  out.push({ key: "fan", languages: ["fan"] });
  return out;
}

const sanSource = (t) => {
  const pc = t.pieceChars.replace(/[\]\\^-]/g, "\\$&"), pr = t.promoChars.replace(/[\]\\^-]/g, "\\$&");
  return `(?:(O-O-O|O-O|0-0-0|0-0)|([${pc}])?([a-h][1-8]|[a-h]|[1-8])?([x:\\-])?([a-h][1-8])(?:=?([${pr}]))?)([+#]{1,2})?`;
};
const stickyCache = new Map();
/** sticky SAN regex (groups: 1 castle, 2 piece, 3 from, 4 capture mark, 5 to, 6 promotion, 7 check marks), refusing a following symbol char. */
function sanSticky(t) {
  let r = stickyCache.get(t.key + "|" + t.pieceChars);
  if (!r) stickyCache.set(t.key + "|" + t.pieceChars, (r = new RegExp(sanSource(t) + "(?![A-Za-z0-9_=])", "y")));
  return r;
}
const wordCache = new Map();
/** anchored SAN regex over a whole word (+ optional suffix annotation). */
export function wordSanRegex(t, { glyph = false } = {}) {
  const k = t.key + "|" + t.pieceChars + "|" + glyph;
  let r = wordCache.get(k);
  if (!r) wordCache.set(k, (r = new RegExp("^" + sanSource(t) + (glyph ? "([?!]{1,2})?" : "") + "$")));
  return r;
}

/** A3b: a promotion suffix is part of a SAN token only when the destination is on a promotion rank (ranks 1 and 8, FIDE Art. 3.7); "f3N" is not a move */
const promotionOk = (m) => !m[6] || /[18]$/.test(m[5]);
/** exec an anchored SAN word and apply the lexer rules; null when the word is not a SAN token */
export function matchSanWord(word, table, { glyph = false } = {}) {
  const m = wordSanRegex(table, { glyph }).exec(word);
  return m && promotionOk(m) ? m : null;
}
/** is this whole word a SAN-shaped token (nomination, not admission)? */
export const isSanWord = (word, table) => matchSanWord(word, table) !== null;

function sanAttrs(m, t) {
  if (m[1]) return { piece: "K", castle: /^[O0]-[O0]-[O0]$/.test(m[1]) ? "Q" : "K", to: null, capture: false, promotion: null, fromFile: null, fromRank: null, form: "castle", check: /\+/.test(m[7] ?? ""), mate: /#/.test(m[7] ?? ""), digitZero: m[1][0] === "0" };
  const from = m[3] ?? null;
  return {
    piece: m[2] ? t.toStd.get(m[2]) : "P", castle: null, to: m[5], capture: m[4] === "x" || m[4] === ":", promotion: m[6] ? (t.toStd.get(m[6]) ?? t.lower.get(m[6])) : null,
    fromFile: from && /[a-h]/.test(from[0]) ? from[0] : null, fromRank: from ? (from.length === 2 ? from[1] : /[1-8]/.test(from) ? from : null) : null,
    form: from && from.length === 2 ? "long" : "short", check: /\+/.test(m[7] ?? ""), mate: /#/.test(m[7] ?? ""), pieceLetter: m[2] ?? null, dash: m[4] === "-",
  };
}

// ════════════════════════════════════════════════════════════════════════════
// the ear: a causal scanner (a token is emitted only when its end is certain)
// ════════════════════════════════════════════════════════════════════════════
const TAG_LINE = /^\[\s*([A-Za-z0-9_][A-Za-z0-9_+#=:-]*)\s+"(.*)"\s*\]\s*$/d;
const RESULTS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);
const WS_CH = /\s/;
const BREAK_CH = /[\s{}();$]/;

function scan(text, t, final) {
  const tokens = [], counts = { unheard_token: 0, tag_line_unparsed: 0, comment_unterminated: 0 };
  const n = text.length, sticky = sanSticky(t);
  const push = (s, e, cls, extra) => tokens.push({ s, e, text: text.slice(s, e), cls, ...extra });
  let i = 0, lineStart = true;
  while (i < n) {
    const ch = text[i];
    if (ch === "\n") { lineStart = true; i++; continue; }
    if (WS_CH.test(ch)) { i++; continue; }
    if (lineStart && ch === "[") {
      const eol = text.indexOf("\n", i);
      if (eol < 0 && !final) break;
      const end = eol < 0 ? n : eol;
      const m = TAG_LINE.exec(text.slice(i, end));
      if (m) {
        push(i + m.indices[1][0], i + m.indices[1][1], "tag_name");
        push(i + m.indices[2][0], i + m.indices[2][1], "tag_value", { tag: m[1] });
        i = end; lineStart = false; continue;
      }
      counts.tag_line_unparsed++;
    }
    lineStart = false;
    if (ch === "{") {
      const close = text.indexOf("}", i + 1);
      if (close < 0) { if (!final) break; push(i, n, "comment", { unterminated: true }); counts.comment_unterminated++; i = n; continue; }
      push(i, close + 1, "comment"); i = close + 1; continue;
    }
    if (ch === ";") {
      const eol = text.indexOf("\n", i);
      if (eol < 0 && !final) break;
      const end = eol < 0 ? n : eol; push(i, end, "line_comment"); i = end; continue;
    }
    if (ch === "(") { push(i, i + 1, "variation_open"); i++; continue; }
    if (ch === ")") { push(i, i + 1, "variation_close"); i++; continue; }
    if (ch === "$") {
      let j = i + 1; while (j < n && text.charCodeAt(j) >= 48 && text.charCodeAt(j) <= 57) j++;
      if (j >= n && !final) break;
      if (j === i + 1) { push(i, j, "other"); counts.unheard_token++; } else push(i, j, "nag", { nag: Number(text.slice(i + 1, j)) });
      i = j; continue;
    }
    let j = i; while (j < n && !BREAK_CH.test(text[j])) j++;
    if (j === i) j = i + 1;                       // a stray '}' or similar: one char, heard as other
    if (j >= n && !final) break;                  // the word may still grow
    lexWord(text, i, j, t, sticky, push, counts);
    i = j;
  }
  return { tokens, counts, pos: i };
}

function lexWord(text, i, j, t, sticky, push, counts) {
  const w = text.slice(i, j);
  if (RESULTS.has(w)) { push(i, j, "result"); return; }
  let k = 0;
  while (k < w.length) {
    const c = w.charCodeAt(k);
    if (c >= 48 && c <= 57) {
      if (w.startsWith("0-0", k)) { sticky.lastIndex = k; const m = sticky.exec(w); if (m && m[1]) { push(i + k, i + k + m[0].length, "san", sanAttrs(m, t)); k += m[0].length; continue; } }
      let e = k; while (e < w.length && w.charCodeAt(e) >= 48 && w.charCodeAt(e) <= 57) e++;
      while (e < w.length && w[e] === ".") e++;
      push(i + k, i + e, "move_number", { n: Number(w.slice(k, e).replace(/\.+$/, "")), dots: (w.slice(k, e).match(/\./g) ?? []).length });
      k = e; continue;
    }
    sticky.lastIndex = k;
    const m = sticky.exec(w);
    if (m && promotionOk(m)) { push(i + k, i + k + m[0].length, "san", sanAttrs(m, t)); k += m[0].length; continue; }
    const g = /^[?!]{1,2}/.exec(w.slice(k));
    if (g) { push(i + k, i + k + g[0].length, "glyph"); k += g[0].length; continue; }
    push(i + k, j, "other"); counts.unheard_token++; k = w.length;
  }
}

const gapsOf = (counts) => Object.entries(counts).filter(([, v]) => v > 0).map(([reason, count]) => ({ reason, count }));

/** ear(text) -> tokens with class. letters: "en" (default), a language code of the prior, or "fan". */
export function ear(text, { priors = loadPriors(), letters = "en" } = {}) {
  const pm = missing(priors, ["lexicon"]);
  if (pm.length || !priors.lexicon) return { tokens: [], gaps: pm.length ? pm : [{ reason: "prior_missing", kind: "lexicon" }] };
  const t = letterTable(priors.lexicon, letters === "auto" ? "en" : letters);
  if (!t) return { tokens: [], gaps: [{ reason: "letters_unknown", letters }] };
  const { tokens, counts } = scan(String(text), t, true);
  return { tokens, gaps: gapsOf(counts) };
}

/** Streaming ear: push(chunk) returns the tokens that became certain; end() flushes. Equivalent to ear() by construction (the same scanner). */
export function createEar({ priors = loadPriors(), letters = "en" } = {}) {
  const t = priors?.lexicon ? letterTable(priors.lexicon, letters === "auto" ? "en" : letters) : null;
  if (!t) throw new TypeError("createEar: lexicon prior missing or letters unknown");
  let buf = "", emitted = 0;
  const step = (final) => { const r = scan(buf, t, final); const fresh = r.tokens.slice(emitted); emitted = r.tokens.length; return fresh; };
  return { push(chunk) { buf += chunk; return step(false); }, end() { return step(true); }, get text() { return buf; } };
}

// ════════════════════════════════════════════════════════════════════════════
// the board organ (rules from the prior; the algorithm is Lovelace's: carry out the order or refuse it)
// ════════════════════════════════════════════════════════════════════════════
const FILES = "abcdefgh";
export const sqName = (i) => FILES[i & 7] + ((i >> 3) + 1);
export const sqIndex = (s) => (s.charCodeAt(1) - 49) * 8 + (s.charCodeAt(0) - 97);
const rulesCache = new WeakMap();

export function compileRules(rules) {
  let c = rulesCache.get(rules);
  if (c) return c;
  const sq = (name) => sqIndex(name);
  c = {
    knight: rules.moves.N.deltas, king: rules.moves.K.deltas,
    dirsB: rules.moves.B.dirs, dirsR: rules.moves.R.dirs, dirsQ: rules.moves.Q.dirs,
    pawn: rules.moves.P,
    back: rules.initial.back_rank, backRank: { w: rules.initial.white_back_rank - 1, b: rules.initial.black_back_rank - 1 },
    pawnRank: { w: rules.initial.white_pawn_rank - 1, b: rules.initial.black_pawn_rank - 1 },
    castling: Object.fromEntries(["w", "b"].map((col) => [col, Object.fromEntries(["K", "Q"].map((s) => {
      const r = rules.castling[col][s];
      return [s, { king: sq(r.king), kingTo: sq(r.king_to), rook: sq(r.rook), rookTo: sq(r.rook_to), between: r.between.map(sq), path: r.king_path.map(sq) }];
    }))])),
    promotion: rules.promotion_pieces,
  };
  rulesCache.set(rules, c);
  return c;
}

const mk = (c, t, sq) => ({ c, t, id: `${c === 0 ? "w" : "b"}${t}-${sqName(sq)}` });

export function initialPosition(R) {
  const board = new Array(64).fill(null);
  for (let f = 0; f < 8; f++) {
    board[R.backRank.w * 8 + f] = mk(0, R.back[f], R.backRank.w * 8 + f);
    board[R.backRank.b * 8 + f] = mk(1, R.back[f], R.backRank.b * 8 + f);
    board[R.pawnRank.w * 8 + f] = mk(0, "P", R.pawnRank.w * 8 + f);
    board[R.pawnRank.b * 8 + f] = mk(1, "P", R.pawnRank.b * 8 + f);
  }
  return { board, turn: 0, rights: { w: { K: true, Q: true }, b: { K: true, Q: true } }, ep: -1, fullmove: 1 };
}

/** FEN (PGN §16.1): six fields; ids are origin squares in THIS position (a FEN cannot know where a piece began). */
export function parseFEN(fen) {
  const f = String(fen).trim().split(/\s+/);
  if (f.length < 4) return null;
  const rows = f[0].split("/");
  if (rows.length !== 8) return null;
  const board = new Array(64).fill(null);
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[7 - r]) {
      if (/[1-8]/.test(ch)) file += Number(ch);
      else if (/[pnbrqkPNBRQK]/.test(ch)) { if (file > 7) return null; board[r * 8 + file] = mk(ch === ch.toUpperCase() ? 0 : 1, ch.toUpperCase(), r * 8 + file); file++; }
      else return null;
    }
    if (file !== 8) return null;
  }
  const rights = { w: { K: f[2].includes("K"), Q: f[2].includes("Q") }, b: { K: f[2].includes("k"), Q: f[2].includes("q") } };
  return { board, turn: f[1] === "b" ? 1 : 0, rights, ep: /^[a-h][36]$/.test(f[3]) ? sqIndex(f[3]) : -1, fullmove: Number(f[5] ?? 1) || 1 };
}

export function placementOf(pos) {
  const rows = [];
  for (let r = 7; r >= 0; r--) {
    let row = "", gap = 0;
    for (let f = 0; f < 8; f++) {
      const p = pos.board[r * 8 + f];
      if (!p) gap++; else { if (gap) { row += gap; gap = 0; } row += p.c === 0 ? p.t : p.t.toLowerCase(); }
    }
    rows.push(row + (gap || ""));
  }
  return rows.join("/");
}

function attacked(pos, sq, by, R) {
  const f = sq & 7, r = sq >> 3, b = pos.board;
  const at = (ff, rr) => (ff < 0 || ff > 7 || rr < 0 || rr > 7 ? undefined : b[rr * 8 + ff]);
  const dir = by === 0 ? 1 : -1;                                  // a pawn of colour `by` attacks one rank ahead of itself
  for (const df of [-1, 1]) { const p = at(f + df, r - dir); if (p && p.c === by && p.t === "P") return true; }
  for (const [df, dr] of R.knight) { const p = at(f + df, r + dr); if (p && p.c === by && p.t === "N") return true; }
  for (const [df, dr] of R.king) { const p = at(f + df, r + dr); if (p && p.c === by && p.t === "K") return true; }
  for (const [dirs, kinds] of [[R.dirsB, "BQ"], [R.dirsR, "RQ"]]) {
    for (const [df, dr] of dirs) {
      let ff = f + df, rr = r + dr;
      while (ff >= 0 && ff <= 7 && rr >= 0 && rr <= 7) {
        const p = b[rr * 8 + ff];
        if (p) { if (p.c === by && kinds.includes(p.t)) return true; break; }
        ff += df; rr += dr;
      }
    }
  }
  return false;
}

const kingOf = (pos, c) => { for (let i = 0; i < 64; i++) { const p = pos.board[i]; if (p && p.c === c && p.t === "K") return i; } return -1; };
export const inCheck = (pos, c, R) => { const k = kingOf(pos, c); return k >= 0 && attacked(pos, k, 1 - c, R); };

/** Carry a move out (copy-on-write). mv: {from,to,castle:{rook,rookTo}|null,capSq,promotion,double} */
export function applyMove(pos, mv, R) {
  const board = pos.board.slice();
  const p = board[mv.from];
  board[mv.from] = null;
  if (mv.capSq >= 0) board[mv.capSq] = null;
  board[mv.to] = mv.promotion ? { c: p.c, t: mv.promotion, id: p.id } : p;
  if (mv.castle) { board[mv.castle.rookTo] = board[mv.castle.rook]; board[mv.castle.rook] = null; }
  const rights = { w: { ...pos.rights.w }, b: { ...pos.rights.b } };
  const col = p.c === 0 ? "w" : "b";
  if (p.t === "K") { rights[col].K = false; rights[col].Q = false; }
  for (const cc of ["w", "b"]) for (const s of ["K", "Q"]) { const rk = R.castling[cc][s].rook; if (mv.from === rk || mv.to === rk) rights[cc][s] = false; }
  let ep = -1;
  if (mv.double) ep = (mv.from + mv.to) >> 1;
  return { board, turn: 1 - pos.turn, rights, ep, fullmove: pos.fullmove + (pos.turn === 1 ? 1 : 0) };
}

const onBoard = (f, r) => f >= 0 && f <= 7 && r >= 0 && r <= 7;

/** every square a piece reaches by its own geometry (pseudo-legal, king safety not yet tested); pawn handled apart */
function pseudoTargets(pos, from, R) {
  const p = pos.board[from], f = from & 7, r = from >> 3, out = [];
  const b = pos.board;
  if (p.t === "N" || p.t === "K") {
    for (const [df, dr] of p.t === "N" ? R.knight : R.king) { if (onBoard(f + df, r + dr)) { const d = (r + dr) * 8 + f + df; if (!b[d] || b[d].c !== p.c) out.push({ to: d, capSq: b[d] ? d : -1 }); } }
  } else if (p.t === "P") {
    const dir = p.c === 0 ? 1 : -1, last = p.c === 0 ? 7 : 0, start = R.pawnRank[p.c === 0 ? "w" : "b"];
    const one = (r + dir) * 8 + f;
    if (onBoard(f, r + dir) && !b[one]) {
      out.push({ to: one, capSq: -1, promo: r + dir === last });
      const two = (r + 2 * dir) * 8 + f;
      if (r === start && !b[two]) out.push({ to: two, capSq: -1, double: true });
    }
    for (const df of [-1, 1]) {
      if (!onBoard(f + df, r + dir)) continue;
      const d = (r + dir) * 8 + f + df;
      if (b[d] && b[d].c !== p.c) out.push({ to: d, capSq: d, promo: r + dir === last });
      else if (!b[d] && d === pos.ep) out.push({ to: d, capSq: r * 8 + f + df, ep: true });
    }
  } else {
    for (const [df, dr] of p.t === "B" ? R.dirsB : p.t === "R" ? R.dirsR : R.dirsQ) {
      let ff = f + df, rr = r + dr;
      while (onBoard(ff, rr)) {
        const d = rr * 8 + ff;
        if (b[d]) { if (b[d].c !== p.c) out.push({ to: d, capSq: d }); break; }
        out.push({ to: d, capSq: -1 }); ff += df; rr += dr;
      }
    }
  }
  return out;
}

const legalAfter = (pos, mv, R) => !inCheck(applyMove(pos, mv, R), pos.turn, R);

/** any legal move at all (castling cannot answer a check, so it is not needed to decide mate) */
export function hasLegalMove(pos, R) {
  for (let from = 0; from < 64; from++) {
    const p = pos.board[from];
    if (!p || p.c !== pos.turn) continue;
    for (const tg of pseudoTargets(pos, from, R)) {
      const promos = tg.promo ? R.promotion : [null];
      for (const promo of promos) if (legalAfter(pos, { from, to: tg.to, capSq: tg.capSq, castle: null, promotion: promo, double: !!tg.double }, R)) return true;
    }
  }
  return false;
}

function castleMove(pos, side, R) {
  const col = pos.turn === 0 ? "w" : "b", c = R.castling[col][side];
  const king = pos.board[c.king], rook = pos.board[c.rook];
  if (!pos.rights[col][side] || !king || king.t !== "K" || king.c !== pos.turn || !rook || rook.t !== "R" || rook.c !== pos.turn) return null;
  if (c.between.some((s) => pos.board[s])) return null;
  if (c.path.some((s) => attacked(pos, s, 1 - pos.turn, R))) return null;
  return { from: c.king, to: c.kingTo, capSq: -1, castle: { rook: c.rook, rookTo: c.rookTo, side }, promotion: null, double: false };
}

/**
 * Carry out one SAN order. parsed: a san token's attributes. strict=false (default) follows the PGN import-format guidance: the capture mark
 * and check marks are CLAIMS checked against the board and recorded, not conditions.
 * returns { ok:true, mv, piece, captured, next, notes } | { ok:false, reason }
 */
export function resolveMove(pos, parsed, R) {
  const col = pos.turn === 0 ? "w" : "b", notes = [];
  let mv = null;
  if (parsed.castle) {
    mv = castleMove(pos, parsed.castle, R);
    if (!mv) return { ok: false, reason: "illegal_move" };
  } else {
    const dest = sqIndex(parsed.to);
    let pieceType = parsed.piece;
    const filt = [];
    const fullFrom = parsed.fromFile && parsed.fromRank && !parsed.pieceLetter;   // "e2e4": whatever stands on e2 (castling by a two-file king step included)
    for (let from = 0; from < 64; from++) {
      const p = pos.board[from];
      if (!p || p.c !== pos.turn) continue;
      if (parsed.fromFile && (from & 7) !== FILES.indexOf(parsed.fromFile)) continue;
      if (parsed.fromRank && (from >> 3) !== Number(parsed.fromRank) - 1) continue;
      if (fullFrom) { filt.push(from); continue; }
      if (p.t !== pieceType) continue;
      if (pieceType === "P" && !parsed.fromFile && (from & 7) !== (dest & 7)) continue;     // a pawn without a file only pushes
      filt.push(from);
    }
    const found = [];
    for (const from of filt) {
      const p = pos.board[from];
      if (p.t === "K" && (parsed.fromFile || parsed.fromRank) && Math.abs((dest & 7) - (from & 7)) === 2 && (dest >> 3) === (from >> 3)) {
        const side = (dest & 7) > (from & 7) ? "K" : "Q";
        const cm = castleMove(pos, side, R);
        if (cm && cm.from === from && cm.to === dest) { found.push(cm); continue; }
      }
      for (const tg of pseudoTargets(pos, from, R)) {
        if (tg.to !== dest) continue;
        const wantPromo = parsed.promotion ?? null;
        if (tg.promo ? wantPromo == null || !R.promotion.includes(wantPromo) : wantPromo != null) continue;
        const cand = { from, to: dest, capSq: tg.capSq, castle: null, promotion: tg.promo ? wantPromo : null, double: !!tg.double, ep: !!tg.ep };
        if (legalAfter(pos, cand, R)) found.push(cand);
      }
    }
    if (found.length === 0) return { ok: false, reason: "illegal_move" };
    if (found.length > 1) return { ok: false, reason: "ambiguous_move" };
    mv = found[0];
  }
  const piece = pos.board[mv.from];
  const captured = mv.capSq >= 0 ? pos.board[mv.capSq] : null;
  // the capture mark and the check marks are CLAIMS checked against the board (PGN import-format guidance), not conditions
  const uciStyle = parsed.form === "long" && !parsed.dash && !parsed.capture && !parsed.check && !parsed.mate;     // e2e4 carries no claims
  if (!parsed.castle && !uciStyle && (parsed.capture || parsed.dash ? parsed.capture !== !!captured : !!captured)) notes.push("capture_claim_mismatch");
  const next = applyMove(pos, mv, R);
  const check = inCheck(next, next.turn, R);
  const mate = check && !hasLegalMove(next, R);
  if ((parsed.mate && !mate) || (parsed.check && !parsed.mate && !check) || (!uciStyle && !parsed.check && !parsed.mate && check)) notes.push("check_claim_mismatch");
  return { ok: true, mv, piece, captured, next, check, mate, notes, color: col };
}

// ════════════════════════════════════════════════════════════════════════════
// read(): tokens -> beings + relations, in reading order, from the prefix only
// ════════════════════════════════════════════════════════════════════════════
function readCore(text, tokens, lexicon, rules) {
  const R = compileRules(rules);
  const beings = [], relations = [], plies = [], gaps = new Map(), tags = {};
  const seen = new Set();
  const gap = (reason, extra = {}) => { const k = reason; const g = gaps.get(k) ?? { reason, count: 0, ...extra }; g.count++; gaps.set(k, g); return g; };
  const being = (id, kind, span, extra = {}) => { const k = `${kind}|${id}`; if (seen.has(k)) return; seen.add(k); beings.push({ id, kind, span, ...extra }); };
  let pos = initialPosition(R), lost = false, ply = 0, depth = 0, pendingMn = null, setupOk = true, started = false, firstUnresolved = null;
  let pendingTag = null;
  const startFromFEN = () => {
    if (tags.FEN) { const p = parseFEN(tags.FEN); if (p) pos = p; else { gap("setup_unreadable"); setupOk = false; } if (p) gap("setup_position_read"); }
    if (tags.Variant && !/^(Standard|From Position)$/i.test(tags.Variant)) { gap("variant_unsupported", { variant: tags.Variant }); setupOk = false; }
  };
  for (const tk of tokens) {
    if (tk.cls === "tag_name") { pendingTag = tk; continue; }
    if (tk.cls === "tag_value") {
      if (pendingTag) tags[pendingTag.text] = tk.text.replace(/\\(["\\])/g, "$1");
      if (pendingTag && (pendingTag.text === "White" || pendingTag.text === "Black")) being(`${pendingTag.text.toLowerCase()}:${tk.text}`, "player", [tk.s, tk.e]);
      pendingTag = null; continue;
    }
    if (!started && (tk.cls === "san" || tk.cls === "move_number" || tk.cls === "comment" || tk.cls === "result")) { started = true; startFromFEN(); }
    if (tk.cls === "comment" || tk.cls === "line_comment") { gap("comment_text_unread"); continue; }
    if (tk.cls === "variation_open") { depth++; gap("variation_skipped"); continue; }
    if (tk.cls === "variation_close") { depth = Math.max(0, depth - 1); continue; }
    if (tk.cls === "nag") { gap("nag_unread"); continue; }
    if (tk.cls === "other") continue;
    if (depth > 0) continue;
    if (tk.cls === "move_number") { pendingMn = tk; continue; }
    if (tk.cls !== "san") continue;
    ply++;
    if (!setupOk) { gap("replay_not_attempted"); continue; }
    if (lost) { gap("replay_lost_plies_unread"); continue; }
    if (tk.piece === undefined || (tk.to == null && !tk.castle)) { gap("san_unparsed", { ply }); lost = true; firstUnresolved ??= ply; continue; }
    if (tk.digitZero) gap("nonstandard_castling_glyph");
    if (pendingMn && pendingMn.n !== pos.fullmove) gap("move_number_mismatch");
    pendingMn = null;
    const res = resolveMove(pos, tk, R);
    if (!res.ok) { const g = gap(res.reason, { ply, san: tk.text, span: [tk.s, tk.e] }); g.ply ??= ply; lost = true; firstUnresolved ??= ply; continue; }
    for (const nt of res.notes) gap(nt);
    const span = [tk.s, tk.e], mover = res.piece, mv = res.mv;
    const color = res.color;
    const rec = {
      ply, color, piece: mover.t, pid: mover.id, from: sqName(mv.from), to: sqName(mv.to), capture: !!res.captured, captured_pid: res.captured?.id ?? null,
      captured_type: res.captured?.t ?? null, ep: !!mv.ep, castle: mv.castle ? mv.castle.side : null, rook_pid: mv.castle ? pos.board[mv.castle.rook].id : null,
      rook_to: mv.castle ? sqName(mv.castle.rookTo) : null, promotion: mv.promotion, check: res.check, mate: res.mate,
      enemy_king: pos.board[kingOf(pos, 1 - pos.turn)]?.id ?? null, span, text: tk.text,
    };
    plies.push(rec);
    being(`ply${ply}`, "move", span, { ply });
    being(mover.id, "piece", span, { ply });
    if (tk.to) being(tk.to, "square", span, { ply });
    if (tk.form === "long" && tk.fromFile) being(`${tk.fromFile}${tk.fromRank}`, "square", span, { ply });
    if (res.captured) being(res.captured.id, "piece", span, { ply });
    relations.push({ ply, end1: mover.id, label: "moves_to", end2: rec.to });
    if (rec.castle) { being(rec.rook_pid, "piece", span, { ply }); relations.push({ ply, end1: rec.rook_pid, label: "moves_to", end2: rec.rook_to }, { ply, end1: mover.id, label: "castles_with", end2: rec.rook_pid }); }
    if (res.captured) relations.push({ ply, end1: mover.id, label: "captures", end2: res.captured.id });
    if (mv.promotion) relations.push({ ply, end1: mover.id, label: "promotes_to", end2: mv.promotion });
    const kingId = res.next.board[kingOf(res.next, res.next.turn)]?.id;
    if (res.mate) relations.push({ ply, end1: mover.id, label: "checkmates", end2: kingId });
    else if (res.check) relations.push({ ply, end1: mover.id, label: "gives_check", end2: kingId });
    pos = res.next;
  }
  if (!started) startFromFEN();
  return { beings, relations, plies, gaps: [...gaps.values()], tags, placement: placementOf(pos), first_unresolved_ply: firstUnresolved, plies_read: plies.length, position: pos };
}

/** Rank the distinct piece-letter languages by how many plies replay legally (the legal replay is the witness that decides the language). */
export function detectLetters(text, { priors = loadPriors() } = {}) {
  if (missing(priors, ["lexicon", "rules"]).length || !priors.lexicon || !priors.rules) return { ranking: [], best: null, ties: [], gaps: [{ reason: "prior_missing" }] };
  const ranking = [];
  for (const set of distinctLetterSets(priors.lexicon)) {
    const t = letterTable(priors.lexicon, set.key);
    const { tokens } = ear(text, { priors, letters: set.key });
    const r = readCore(text, tokens, priors.lexicon, priors.rules);
    const sanN = tokens.filter((x) => x.cls === "san").length;
    ranking.push({ key: set.key, languages: set.languages, resolved: r.plies_read, san_tokens: sanN, other_tokens: tokens.filter((x) => x.cls === "other").length });
  }
  ranking.sort((a, b) => b.resolved - a.resolved || a.other_tokens - b.other_tokens);
  const top = ranking[0];
  const ties = ranking.filter((r) => r.resolved === top.resolved && r.other_tokens === top.other_tokens);
  return { ranking, best: ties.length === 1 ? top.key : null, ties: ties.map((r) => r.key), gaps: ties.length > 1 ? [{ reason: "letters_ambiguous", candidates: ties.map((r) => r.key) }] : [] };
}

/** read(text) — one game. letters: "en" | language code | "fan" | "auto". */
export function read(text, { priors = loadPriors(), letters = "en" } = {}) {
  const pm = missing(priors, ["lexicon", "rules"]);
  if (pm.length || !priors.lexicon || !priors.rules) return { system: FAMILY, beings: [], relations: [], plies: [], gaps: pm.length ? pm : [{ reason: "prior_missing" }], tags: {}, tokens: [], placement: null };
  const extra = [];
  let use = letters;
  if (letters === "auto") {
    const d = detectLetters(text, { priors });
    use = d.best ?? d.ties[0] ?? "en";
    extra.push(...d.gaps);
  }
  const { tokens, gaps: earGaps } = ear(text, { priors, letters: use });
  const r = readCore(String(text), tokens, priors.lexicon, priors.rules);
  return { system: FAMILY, letters: use, tokens, ...r, gaps: [...earGaps, ...r.gaps, ...extra] };
}

/** readFEN(text): a FEN position as `occupies` relations (type-level, since a FEN cannot name a piece's origin) */
export function readFEN(text, { priors = loadPriors() } = {}) {
  const pm = missing(priors, ["rules"]);
  if (pm.length) return { ok: false, placement: null, relations: [], gaps: pm };
  const pos = parseFEN(text);
  if (!pos) return { ok: false, placement: null, relations: [], gaps: [{ reason: "fen_unreadable" }] };
  return { ok: true, placement: placementOf(pos), relations: occupiesOf(pos), gaps: [] };
}

export function occupiesOf(pos) {
  const out = [];
  for (let i = 0; i < 64; i++) { const p = pos.board[i]; if (p) out.push({ end1: `${p.c === 0 ? "w" : "b"}${p.t}`, label: "occupies", end2: sqName(i) }); }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// R0: the identifier (causal, one word at a time)
// ════════════════════════════════════════════════════════════════════════════
export const IDENTITY_CLASSES = Object.freeze(["^", "mn", "mn_san", "san", "san_glyph", "glyph", "nag", "result", "tagopen_roster", "tagopen_other", "tagval", "cm_open", "cm", "other"]);

/** classify one whitespace word given the running state ctx = {inBrace, inTag}; mutates ctx. */
export function classifyWord(word, ctx, { lexicon, table }) {
  if (ctx.inBrace) { if (word.includes("}")) ctx.inBrace = false; return "cm"; }
  if (word.startsWith("{")) { if (!word.includes("}")) ctx.inBrace = true; return "cm_open"; }
  if (ctx.inTag) { if (word.endsWith("]")) ctx.inTag = false; return "tagval"; }
  const m = /^\[([A-Za-z0-9_]+)$/.exec(word);
  if (m) { ctx.inTag = true; return lexicon.tag_roster.includes(m[1]) ? "tagopen_roster" : "tagopen_other"; }
  if (RESULTS.has(word)) return "result";
  if (/^\$\d+$/.test(word)) return "nag";
  if (/^\d+\.{1,3}$/.test(word)) return "mn";
  const fused = /^\d+\.{1,3}(.+)$/.exec(word);
  if (fused && isSanWord(fused[1], table)) return "mn_san";
  if (isSanWord(word, table)) return "san";
  if (matchSanWord(word, table, { glyph: true })) return "san_glyph";
  if (/^[?!]{1,2}$/.test(word)) return "glyph";
  return "other";
}

/** The SAN part of a classified word (for the replay witness), or null. */
function sanOfWord(word, cls, table) {
  const body = cls === "mn_san" ? word.replace(/^\d+\.{1,3}/, "") : cls === "san_glyph" ? word.replace(/[?!]{1,2}$/, "") : word;
  const m = matchSanWord(body, table);
  if (!m) return null;
  const a = sanAttrs(m, table);
  return a;
}

/**
 * sanFeasible(a, R): can this SAN word (attrs from sanAttrs) be a move of SOME piece, by geometry alone (no board, no colour)? A REFUSAL from the rules prior (FIDE Laws
 * Art. 3), never an admission: true means "not refused". Castling is feasible; a pawn lands on ranks 2..7 unless it promotes (colour-free union of the two sides' ranges),
 * a pawn capture needs a file next to the destination file; a piece with a named origin file / rank / both must reach the destination by its own geometry; a SAN word that
 * names both origin squares and no piece letter (e2e4) may be any piece, a king stepping two squares included (UCI castling).
 */
export function sanFeasible(a, R) {
  if (a.castle) return true;
  if (!a.to) return false;
  const tf = a.to.charCodeAt(0) - 97, tr = a.to.charCodeAt(1) - 49;
  const ff = a.fromFile ? a.fromFile.charCodeAt(0) - 97 : null, fr = a.fromRank ? Number(a.fromRank) - 1 : null;
  const reach = (t, df, dr) => {
    if (df === 0 && dr === 0) return false;
    if (t === "N") return R.knight.some(([x, y]) => x === df && y === dr);
    if (t === "K") return R.king.some(([x, y]) => x === df && y === dr);
    if (t === "B") return Math.abs(df) === Math.abs(dr);
    if (t === "R") return df === 0 || dr === 0;
    if (t === "Q") return df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr);
    return false;
  };
  const exists = (t) => {
    const fs = ff != null ? [ff] : [0, 1, 2, 3, 4, 5, 6, 7], rs = fr != null ? [fr] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const f of fs) for (const r of rs) if (reach(t, tf - f, tr - r)) return true;
    return false;
  };
  if (a.pieceLetter) return exists(a.piece);
  if (ff != null && fr != null) {                                  // e2e4: any piece; a king may step two files (castling written as a king move); a pawn push or capture
    const df = tf - ff, dr = tr - fr;
    return ["N", "B", "R", "Q"].some((t) => reach(t, df, dr)) || (Math.abs(df) <= 1 && Math.abs(dr) === 1) || (df === 0 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && dr === 0) || (Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df || dr));
  }
  // a pawn
  if (!a.promotion && (tr < 1 || tr > 6)) return false;
  if (a.promotion && tr !== 0 && tr !== 7) return false;
  if (ff != null) return Math.abs(ff - tf) === 1;                  // a pawn capture: the origin file is next to the destination file
  if (a.capture) return false;                                     // "xe5" names no file
  return true;
}

/**
 * createIdentifier({priors, legality, decay, bigram, witness}) — feed words, read the verdict after each.
 *  evidence S_t = max(0, gamma * S_{t-1} + llr_t): llr = TRAIN-estimated class-bigram log-likelihood ratio (chess vs background) plus, while the board is
 *  in sync with the stream from the initial position, the replay witness (a SAN word that is legal here adds ln(p_legal_real / p_legal_null)).
 *  A4 (independent review): the evidence alone NAMES NOTHING. The system is named at the first word at which the SPRT evidence has reached A (S >= A at some word so far)
 *  AND a NECESSARY WITNESS holds (prior: identity.witness, plies and thresholds DERIVED on TRAIN or declared there):
 *    replay  >= n_min SAN plies replayed LEGALLY from the initial position (the FIDE table), consecutively from the first SAN word;
 *    header  >= r_min distinct seven-tag-roster openers (PGN 9.1) AND >= 1 legal ply from the initial position;
 *    cold    only when the stream does NOT claim the game start (its first move number is not "1."): a PGN numbering lattice (8.2.2) that holds for m_cold consecutive
 *            number tokens after its anchor, every SAN word since the anchor being geometrically feasible for some piece (sanFeasible) and in SAN SHORT form (A5: a
 *            long-algebraic / UCI word is another representation, not PGN movetext, and breaks the lattice). Structure, not legality.
 *  A tag header alone names nothing: `envelope` (>= r_min roster openers) is reported apart from `system` (PDN, shogi and xiangqi records wear the same envelope).
 *  Identity does not decay, presence does: `present` is S >= A now; `system` stays named once named. gamma is the prior's kernel/activation.js dmdWindow measurement
 *  (decay:false = undecayed control). witness:false is the REGISTERED v1 identifier (evidence alone), kept as an ablation: it is what the hard-negative pools must catch.
 */
export function createIdentifier({ priors = loadPriors(), legality = true, decay = true, bigram = true, letters = "en", witness = true, evidence = true } = {}) {
  const pm = missing(priors, ["lexicon", "rules", "identity"]);
  if (pm.length || !priors.lexicon || !priors.rules || !priors.identity) {
    const gaps = pm.length ? pm : [{ reason: "prior_missing" }];
    const dead = { system: null, present: false, evidence: 0, words: 0, plies_replayed: 0, in_sync: false, envelope: false, roster_tags: 0, witness: null, gaps };
    return { push() { return dead; }, state() { return dead; }, gaps };
  }
  const id = priors.identity;
  if (witness && !id.witness) {
    const gaps = [{ reason: "witness_prior_missing", kind: "identity.witness", detail: "a name needs a necessary witness (A4); the identity prior carries none" }];
    const dead = { system: null, present: false, evidence: 0, words: 0, plies_replayed: 0, in_sync: false, envelope: false, roster_tags: 0, witness: null, gaps };
    return { push() { return dead; }, state() { return dead; }, gaps };
  }
  const W = id.witness ?? { n_min: 0, r_min: 0, m_cold: 0 };
  const table = letterTable(priors.lexicon, letters), R = compileRules(priors.rules);
  const gamma = decay ? id.window.gamma : 1, A = id.sprt.A, ctx = { inBrace: false, inTag: false };
  let S = 0, named = false, reached = false, prev = "^", words = 0, pos = initialPosition(R), sync = true, plies = 0, firstNamed = null, kind = null;
  const roster = new Set();
  let startClaim = null, anchor = null, numsOk = 0;                // the numbering lattice (cold witness)
  const unigram = (cur) => id.unigram_llr[cur] ?? 0;
  const state = () => ({ system: named ? FAMILY : null, present: S >= A, evidence: S, words, plies_replayed: plies, in_sync: sync, first_named_at: firstNamed, envelope: roster.size >= W.r_min && W.r_min > 0, roster_tags: roster.size, witness: kind, numbers_in_lattice: numsOk, gaps: [] });
  const number = (word) => {
    const m = /^(\d+)(\.{1,3})/.exec(word); if (!m) return;
    const n = Number(m[1]), black = m[2].length >= 2;
    if (startClaim === null) startClaim = n === 1 && !black;
    if (!anchor || anchor.plies === 0) { anchor = { n, black, plies: 0 }; numsOk = 0; return; }
    const s = (anchor.black ? 1 : 0) + anchor.plies, expN = anchor.n + Math.floor(s / 2), expBlack = s % 2 === 1;
    if (n === expN && black === expBlack) numsOk++; else { anchor = { n, black, plies: 0 }; numsOk = 0; }
  };
  return {
    push(word) {
      const cls = classifyWord(word, ctx, { lexicon: priors.lexicon, table });
      // the first word carries no evidence by itself: a stream START is a property of how the window was cut, not of the notation (A2a)
      const llr = bigram ? (prev === "^" ? 0 : id.bigram_llr[`${prev}>${cls}`] ?? 0) : unigram(cls);
      S = Math.max(0, gamma * S + llr);
      if (cls === "tagopen_roster") { const m = /^\[([A-Za-z0-9_]+)$/.exec(word); if (m) roster.add(m[1]); }
      if (cls === "mn" || cls === "mn_san") number(word);
      if (cls === "san" || cls === "san_glyph" || cls === "mn_san") {
        const parsed = sanOfWord(word, cls, table);
        // A5: PGN movetext is SAN short form; a long-algebraic / UCI word (e2e4, Ng1-f3) is another representation, not movetext: under the cold witness it breaks the lattice
        if (anchor) { anchor.plies++; if (!parsed || !sanFeasible(parsed, R) || parsed.form === "long") { anchor = null; numsOk = 0; } }
        if (legality && sync) {
          const res = parsed ? resolveMove(pos, parsed, R) : { ok: false };
          if (res.ok) { pos = res.next; plies++; S += id.legality.llr; } else sync = false;
        }
      }
      words++;
      prev = cls;
      if (!evidence || S >= A) reached = true;                       // evidence:false = the witness alone names (an ablation: what does the SPRT evidence add?)
      if (!named && reached) {
        if (!witness) { named = true; firstNamed = words; kind = "evidence_only"; }
        else if (plies >= W.n_min) { named = true; firstNamed = words; kind = "replay"; }
        else if (roster.size >= W.r_min && plies >= 1) { named = true; firstNamed = words; kind = "header+replay"; }
        else if (startClaim === false && numsOk >= W.m_cold) { named = true; firstNamed = words; kind = "cold_lattice"; }
      }
      return state();
    },
    state,
  };
}

/** identify(words | text) -> final state of a fresh identifier fed every whitespace word (convenience for tests, the instrument and sibling-style callers). */
export function identify(wordsOrText, opts = {}) {
  const words = typeof wordsOrText === "string" ? wordsOrText.split(/\s+/).filter(Boolean) : wordsOrText;
  const idf = createIdentifier(opts);
  let st = idf.state();
  for (const w of words) st = idf.push(w);
  return st;
}
