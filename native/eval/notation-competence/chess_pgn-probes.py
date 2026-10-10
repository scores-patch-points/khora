#!/usr/bin/env python3
"""eval/notation-competence/chess_pgn-probes.py — the RULE-PROBE stratum of the chess_pgn R4 (A4 of chess_pgn.mjs). GOLD SIDE: never imports or runs the adapter.

  /private/tmp/claude-501/venv/bin/python chess_pgn-probes.py <split>     # dev | test -> gold/<split>/probes.jsonl.gz   (positions = natural games of that split)
  /private/tmp/claude-501/venv/bin/python chess_pgn-probes.py toy         # -> chess_pgn-probes-toy.json (AUTHORED: positions from seeded random legal play; the fixture of the tests)

WHY. The registered R4 scored relations and the legality of natural and perturbed games; an independent reviewer broke the adapter in two ways (castling through an
attacked square; king moves no longer clear castling rights) and R3, R4 and R5 still scored 1.0, because natural games and swap / drop / replace perturbations almost
never exercise those rules. Each probe here is ONE text whose last ply is the probed move, labelled by the python-chess ORACLE (legal or not, and the effect when legal).

PROBE SOURCES (all positions are natural; every text is AUTHORED BY SCRIPT from them and labelled so):
  prefix     the natural game replayed from the initial position up to a position, then ONE probed SAN (castling, promotion, disambiguation, en passant, pinned piece,
             king into check, move that ignores a check). The reader must replay the whole prefix (rights, pins and identities are carried by the replay).
  excursion  castling that would be LEGAL but for lost rights: from a natural position where castling is legal, the king (or the rook) steps out and back (the opponent
             answers with a quiet legal move each time), then the castling SAN. The squares are free and unattacked again: the only cause of illegality is the lost right.
             The restored-rights check is made with python-chess (the same position with the right set must make the castling legal), so no other cause is hidden.
  fen        a constructed family for the PINNED en-passant capture (the capture would expose the king along the rank) and its legal twin, [SetUp]/[FEN] start. The en-passant
             square is written into the FEN even when the capture is illegal (board.fen(en_passant="fen")) so the reader is given the target and must refuse the pin itself.
STRATA (each probe belongs to exactly one): castle_legal castle_legal_attacked_rook castle_legal_attacked_b_file castle_through_attack castle_out_of_check castle_blocked
  castle_rights_lost_king castle_rights_lost_rook promo_queen promo_under promo_missing promo_follow (a LATER move of a piece that promoted earlier in the same game: the
  promoted piece must act as the piece it became; added after the no-promotion mutant escaped the single-ply promotion probes, A5) disambig_absent disambig_file disambig_rank
  disambig_both ep_legal ep_no_target ep_pinned pin_illegal king_into_check check_ignored plain_legal, and the DIAGNOSTIC stratum ill_formed_promotion (a promotion suffix on a non-promotion rank is not a SAN
  token under the lexer rule A3b; the reader types it unheard_token and counts no ply, python-chess calls it illegal: reported, not in the rule).
CONTROL COLUMN pseudo_accepts: would a reader that carries out PSEUDO-LEGAL moves only (king safety and the castling attack conditions ignored) accept this probe? Computed
here from python-chess's pseudo-legal moves; it is the control built to fail of the king-safety strata.
Selection inside a stratum: the CAP smallest sha1("chess_pgn/probes/v1|<split>|<stratum>|<key>") values: a pure function of the data, never of any reader's output.
"""
import sys, os, re, json, gzip, random, hashlib, heapq, importlib.util, collections

import chess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = "/private/tmp/claude-501/notation/chess_pgn"
SALT = "chess_pgn/probes/v1"
CAP = {"dev": 150, "test": 150, "toy": 6}
GAME_GATE = {"dev": (2, 5), "test": (1, 5), "toy": (1, 1)}      # a game is used iff sha1(id) mod 5 < 2 (dev) / < 1 (test): bounded runtime, a pure function of the id

spec = importlib.util.spec_from_file_location("chess_pgn_data", os.path.join(HERE, "chess_pgn-data.py"))
data = importlib.util.module_from_spec(spec); spec.loader.exec_module(data)
PIECE, piece_id = data.PIECE, data.piece_id

STRATA = ["castle_legal", "castle_legal_attacked_rook", "castle_legal_attacked_b_file", "castle_through_attack", "castle_out_of_check", "castle_blocked",
          "castle_rights_lost_king", "castle_rights_lost_rook", "promo_queen", "promo_under", "promo_missing", "disambig_absent", "disambig_file", "disambig_rank",
          "disambig_both", "ep_legal", "ep_no_target", "ep_pinned", "pin_illegal", "king_into_check", "check_ignored", "plain_legal", "promo_follow", "ill_formed_promotion"]
SAFETY = ["castle_through_attack", "castle_out_of_check", "ep_pinned", "pin_illegal", "king_into_check", "check_ignored"]


def h(split, stratum, key): return int(hashlib.sha1(f"{SALT}|{split}|{stratum}|{key}".encode()).hexdigest(), 16)


class Pick:
    """keep the CAP candidates with the smallest hash (max-heap on the hash)"""
    def __init__(self, cap): self.cap, self.heap, self.n, self.seen = cap, [], 0, 0
    def offer(self, hv, payload):
        self.seen += 1; self.n += 1
        if len(self.heap) < self.cap: heapq.heappush(self.heap, (-hv, self.n, payload))
        elif -self.heap[0][0] > hv: heapq.heapreplace(self.heap, (-hv, self.n, payload))
    def items(self): return [p for _, _, p in sorted(self.heap, key=lambda x: (-x[0], x[1]))]


# ── gold: replay from any start, identity by origin square (the same convention as chess_pgn-data.py replay) ──────────────────────────────
def replay2(board0, sans):
    board = board0.copy()
    ids = {sq: piece_id(p.color, p.piece_type, sq) for sq, p in board.piece_map().items()}
    plies = []
    for n, san in enumerate(sans, 1):
        try: move = board.parse_san(san)
        except ValueError: return plies, board, n
        color = board.turn; ptype = board.piece_type_at(move.from_square); mover = ids[move.from_square]
        castle = board.is_castling(move); ep = board.is_en_passant(move); capture = board.is_capture(move)
        captured_id = rook_id = rook_to = None; kingside = None
        if castle:
            rank = chess.square_rank(move.from_square); kingside = chess.square_file(move.to_square) > chess.square_file(move.from_square)
            r_from = chess.square(7 if kingside else 0, rank); r_to = chess.square(5 if kingside else 3, rank)
            rook_id = ids.pop(r_from); ids[r_to] = rook_id; rook_to = chess.square_name(r_to)
        elif ep: captured_id = ids.pop(chess.square(chess.square_file(move.to_square), chess.square_rank(move.from_square)))
        elif capture: captured_id = ids.pop(move.to_square)
        ids[move.to_square] = ids.pop(move.from_square)
        promo = PIECE[move.promotion] if move.promotion else None
        board.push(move)
        plies.append({"ply": n, "pid": mover, "to": chess.square_name(move.to_square), "captured_pid": captured_id, "castle": bool(castle), "rook_pid": rook_id, "rook_to": rook_to,
                      "promotion": promo, "check": board.is_check(), "mate": board.is_checkmate(), "enemy_king": ids[board.king(board.turn)]})
    return plies, board, None


def rel_keys(p):
    k = lambda a, b, c: f"{p['ply']}|{a}|{b}|{c}"
    out = [k(p["pid"], "moves_to", p["to"])]
    if p["captured_pid"]: out.append(k(p["pid"], "captures", p["captured_pid"]))
    if p["castle"]: out += [k(p["rook_pid"], "moves_to", p["rook_to"]), k(p["pid"], "castles_with", p["rook_pid"])]
    if p["promotion"]: out.append(k(p["pid"], "promotes_to", p["promotion"]))
    if p["mate"]: out.append(k(p["pid"], "checkmates", p["enemy_king"]))
    elif p["check"]: out.append(k(p["pid"], "gives_check", p["enemy_king"]))
    return out


SAN_PARSE = re.compile(r"^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])(?:=([QRBN]))?[+#]?$")


def pseudo_accepts(board, san):
    """would a reader that carries out PSEUDO-LEGAL moves only (no king safety, no castling attack test) accept this SAN? (the control built to fail)"""
    c = board.turn; rank = 0 if c == chess.WHITE else 7
    if san.startswith("O-O"):
        kside = san.rstrip("+#") == "O-O"
        kf, rf = chess.square(4, rank), chess.square(7 if kside else 0, rank)
        between = [chess.square(f, rank) for f in ((5, 6) if kside else (1, 2, 3))]
        rights = board.has_kingside_castling_rights(c) if kside else board.has_queenside_castling_rights(c)
        k, r = board.piece_at(kf), board.piece_at(rf)
        return bool(rights and k and k.piece_type == chess.KING and k.color == c and r and r.piece_type == chess.ROOK and r.color == c and all(board.piece_at(s) is None for s in between))
    m = SAN_PARSE.match(san)
    if not m: return False
    pt = {"K": chess.KING, "Q": chess.QUEEN, "R": chess.ROOK, "B": chess.BISHOP, "N": chess.KNIGHT, None: chess.PAWN}[m.group(1)]
    ff = "abcdefgh".index(m.group(2)) if m.group(2) else None; fr = int(m.group(3)) - 1 if m.group(3) else None
    to = chess.parse_square(m.group(4)); promo = {"Q": chess.QUEEN, "R": chess.ROOK, "B": chess.BISHOP, "N": chess.KNIGHT, None: None}[m.group(5)]
    cands = []
    for mv in board.generate_pseudo_legal_moves():
        if board.is_castling(mv) or mv.to_square != to or board.piece_type_at(mv.from_square) != pt or mv.promotion != promo: continue
        if ff is not None and chess.square_file(mv.from_square) != ff: continue
        if fr is not None and chess.square_rank(mv.from_square) != fr: continue
        if pt == chess.PAWN and ff is None and chess.square_file(mv.from_square) != chess.square_file(to): continue
        cands.append(mv)
    return len(cands) == 1


def oracle(board, san):
    try: return board.parse_san(san)
    except ValueError: return None


# ── candidate generation at one position ─────────────────────────────────────
def castle_stratum(board, side, hist):
    c = board.turn; rank = 0 if c == chess.WHITE else 7; kside = side == "K"
    san = "O-O" if kside else "O-O-O"
    kf, rf = chess.square(4, rank), chess.square(7 if kside else 0, rank)
    between = [chess.square(f, rank) for f in ((5, 6) if kside else (1, 2, 3))]
    path = [chess.square(f, rank) for f in ((5, 6) if kside else (3, 2))]
    k, r = board.piece_at(kf), board.piece_at(rf)
    home = bool(k and k.piece_type == chess.KING and k.color == c and r and r.piece_type == chess.ROOK and r.color == c)
    rights = board.has_kingside_castling_rights(c) if kside else board.has_queenside_castling_rights(c)
    legal = oracle(board, san) is not None
    if not home: return san, None, None
    empty = all(board.piece_at(s) is None for s in between)
    in_check = board.is_check(); attacked_path = any(board.is_attacked_by(not c, s) for s in path)
    if legal:
        if not kside and board.is_attacked_by(not c, chess.square(1, rank)): return san, "castle_legal_attacked_b_file", True
        if board.is_attacked_by(not c, rf): return san, "castle_legal_attacked_rook", True
        return san, "castle_legal", True
    if rights:
        if not empty: return san, "castle_blocked", False
        if in_check: return san, "castle_out_of_check", False
        if attacked_path: return san, "castle_through_attack", False
        return san, None, None
    # rights absent, king and rook at home, squares free and safe: the only cause is the lost right
    if empty and not in_check and not attacked_path:
        if hist["king_moved"][c]: return san, "castle_rights_lost_king", False
        if hist["rook_moved"][(c, side)]: return san, "castle_rights_lost_rook", False
    return san, None, None


def disambig_kind(canon):
    m = re.match(r"^[NBRQK]([a-h])?([1-8])?x?[a-h][1-8]", canon)
    if not m: return None
    return "both" if m.group(1) and m.group(2) else "file" if m.group(1) else "rank" if m.group(2) else None


def candidates(board, hist):
    """yield (stratum, san, extra) for the side to move"""
    c = board.turn; legal = list(board.legal_moves); out = []
    for side in ("K", "Q"):
        san, st, lg = castle_stratum(board, side, hist)
        if st: out.append((st, san, {"side": side}))
    for mv in legal:
        canon = board.san(mv); bare = re.sub(r"[+#]$", "", canon)
        if mv.promotion:
            out.append(("promo_queen" if mv.promotion == chess.QUEEN else "promo_under", canon, {}))
            if mv.promotion == chess.QUEEN:
                miss = re.sub(r"=[QRBN]", "", canon)
                if oracle(board, miss) is None: out.append(("promo_missing", miss, {}))
            continue
        dk = disambig_kind(canon)
        if dk:
            out.append((f"disambig_{dk}", canon, {}))
            m = re.match(r"^([NBRQK])([a-h])?([1-8])?(x?[a-h][1-8].*)$", canon)
            bare_san = m.group(1) + m.group(4)
            if oracle(board, bare_san) is None and pseudo_count_ambiguous(board, bare_san): out.append(("disambig_absent", bare_san, {}))
        if board.is_en_passant(mv): out.append(("ep_legal", canon, {}))
        elif not board.is_castling(mv): out.append(("plain_legal", canon, {}))
    # en passant capture of an empty square without an en-passant right
    for sq in board.pieces(chess.PAWN, c):
        r = chess.square_rank(sq); f = chess.square_file(sq)
        if r == (4 if c == chess.WHITE else 3):
            for df in (-1, 1):
                if 0 <= f + df <= 7:
                    to = chess.square(f + df, r + (1 if c == chess.WHITE else -1))
                    if board.piece_at(to) is None and board.ep_square != to:
                        san = f"{'abcdefgh'[f]}x{chess.square_name(to)}"
                        if oracle(board, san) is None: out.append(("ep_no_target", san, {}))
    # illegal pseudo-legal moves: why
    legal_set = set(legal)
    for mv in board.generate_pseudo_legal_moves():
        if mv in legal_set or board.is_castling(mv): continue
        if mv.promotion and mv.promotion != chess.QUEEN: continue
        pt = board.piece_type_at(mv.from_square)
        if board.is_check(): st = "check_ignored"
        elif pt == chess.KING: st = "king_into_check"
        elif board.is_pinned(c, mv.from_square): st = "pin_illegal"
        else: continue
        try: san = board.san(mv)
        except ValueError: continue
        if oracle(board, san) is None: out.append((st, san, {}))
    # a promotion suffix on a non-promotion rank (diagnostic)
    for mv in legal:
        if board.piece_type_at(mv.from_square) == chess.PAWN and not mv.promotion and chess.square_rank(mv.to_square) not in (0, 7) and not board.is_capture(mv):
            out.append(("ill_formed_promotion", board.san(mv).rstrip("+#") + "=Q", {})); break
    return out


def pseudo_count_ambiguous(board, san):
    m = SAN_PARSE.match(san)
    if not m: return False
    pt = {"K": chess.KING, "Q": chess.QUEEN, "R": chess.ROOK, "B": chess.BISHOP, "N": chess.KNIGHT}[m.group(1)]
    to = chess.parse_square(m.group(4))
    return sum(1 for mv in board.legal_moves if mv.to_square == to and board.piece_type_at(mv.from_square) == pt) > 1


# ── excursions (rights lost, squares free and safe again) ────────────────────
def quiet_reply(board, rng):
    qs = [m for m in board.legal_moves if not board.is_capture(m) and not board.gives_check(m) and not board.is_castling(m)]
    return rng.choice(qs) if qs else None


def excursion(board, side, kind, rng):
    """returns the SAN list [excursion plies..., castle SAN] or None"""
    c = board.turn; rank = 0 if c == chess.WHITE else 7; kside = side == "K"
    b = board.copy(); sans = []
    if kind == "king":
        kf = chess.square(4, rank)
        steps = [m for m in b.legal_moves if m.from_square == kf and not b.is_castling(m) and chess.square_rank(m.to_square) == rank]
        if not steps: return None
        out = rng.choice(steps); back = chess.Move(out.to_square, kf)
    else:
        rf = chess.square(7 if kside else 0, rank)
        steps = [m for m in b.legal_moves if m.from_square == rf and chess.square_rank(m.to_square) == rank]
        if not steps: return None
        out = rng.choice(steps); back = chess.Move(out.to_square, rf)
    for mv in (out, None, back, None):
        if mv is None:
            r = quiet_reply(b, rng)
            if r is None: return None
            mv = r
        elif not b.is_legal(mv): return None
        sans.append(b.san(mv)); b.push(mv)
    cm = chess.Move(chess.square(4, rank), chess.square(6 if kside else 2, rank))
    san = "O-O" if kside else "O-O-O"
    if oracle(b, san) is not None: return None                       # rights were not lost
    t = b.copy(); t.castling_rights |= chess.BB_SQUARES[chess.square(7 if kside else 0, rank)]     # the same position with the right restored
    if not t.is_legal(cm): return None                               # something else would also forbid it: not a clean probe
    return sans + [san]


# ── constructed FEN family: the pinned en-passant capture and its legal twin ─────────────────────
def ep_fen_family(rng, n):
    out = []
    tries = 0
    while len(out) < n and tries < 4000:
        tries += 1
        white = rng.random() < 0.5
        f = rng.randrange(1, 7); left = rng.random() < 0.5            # the capturing pawn on f, the double-pushed pawn on f-1 (left) or f+1
        g = f - 1 if left else f + 1
        rank = 4 if white else 3                                       # 0-based: white pawn on rank 5, black on rank 4
        lo, hi = min(f, g), max(f, g)
        kfile = rng.randrange(0, lo) if lo > 0 else None; rfile = rng.randrange(hi + 1, 8) if hi < 7 else None
        flip = rng.random() < 0.5
        if kfile is None or rfile is None: continue
        pinned = rng.random() < 0.65
        if flip: kfile, rfile = rfile, kfile
        b = chess.Board(None)
        cap, vic = (chess.WHITE, chess.BLACK) if white else (chess.BLACK, chess.WHITE)
        b.set_piece_at(chess.square(f, rank), chess.Piece(chess.PAWN, cap)); b.set_piece_at(chess.square(g, rank), chess.Piece(chess.PAWN, vic))
        b.set_piece_at(chess.square(kfile, rank), chess.Piece(chess.KING, cap))
        if pinned: b.set_piece_at(chess.square(rfile, rank), chess.Piece(chess.ROOK if rng.random() < 0.7 else chess.QUEEN, vic))
        ok = False
        for _ in range(30):
            sq = chess.square(rng.randrange(0, 8), rng.choice([7, 6]) if white else rng.choice([0, 1]))
            if b.piece_at(sq) is None and chess.square_rank(sq) != rank:
                b.set_piece_at(sq, chess.Piece(chess.KING, vic)); ok = True; break
        if not ok: continue
        b.turn = cap; b.ep_square = chess.square(g, rank + (1 if white else -1))
        san = f"{'abcdefgh'[f]}x{chess.square_name(b.ep_square)}"
        legal = oracle(b, san) is not None
        if pinned == legal: continue                                   # the construction must do what it says
        fen = b.fen(en_passant="fen")
        if not any(o[0] == fen for o in out): out.append((fen, san, "ep_legal" if legal else "ep_pinned", b))
    return out


# ── constructed FEN family: file AND rank both needed to name the mover (three pieces reach one square) ────────────────────────────
def both_fen_family(rng, n):
    out = []; tries = 0
    while len(out) < n and tries < 4000:
        tries += 1
        white = rng.random() < 0.5; col = chess.WHITE if white else chess.BLACK
        f, r = rng.randrange(0, 6), rng.randrange(0, 6)
        pt = rng.choice([chess.QUEEN, chess.QUEEN, chess.ROOK]) if False else chess.QUEEN
        # the mover at (f, r), a twin on its file at (f, r+2), a twin on its rank at (f+2, r), all reaching (f+1, r+1) along a diagonal
        pieces = [(f, r), (f, r + 2), (f + 2, r)]
        b = chess.Board(None)
        for (ff, rr) in pieces: b.set_piece_at(chess.square(ff, rr), chess.Piece(pt, col))
        occupied = {chess.square(ff, rr) for ff, rr in pieces} | {chess.square(f + 1, r + 1)}
        placed = 0
        for k_col, k_rank in ((col, rng.randrange(0, 8)), (not col, rng.randrange(0, 8))):
            for _ in range(40):
                sq = chess.square(rng.randrange(0, 8), k_rank if False else rng.randrange(0, 8))
                if sq in occupied or b.piece_at(sq): continue
                b.set_piece_at(sq, chess.Piece(chess.KING, k_col)); placed += 1; break
        if placed != 2 or b.is_check(): continue
        b.turn = col
        target = chess.square_name(chess.square(f + 1, r + 1)); src = chess.square_name(chess.square(f, r))
        both = f"Q{src}{target}"
        if oracle(b, both) is None or oracle(b, f"Q{src[0]}{target}") is not None or oracle(b, f"Q{src[1]}{target}") is not None: continue
        if not b.is_valid(): continue
        fen = b.fen()
        if not any(o[0] == fen for o in out): out.append((fen, both, "disambig_both", b))
    return out


# ── assembling items ─────────────────────────────────────────────────────────
def movetext(sans, black_first=False, fullmove=1):
    out = []; n = fullmove; black = black_first
    for i, s in enumerate(sans):
        if not black: out.append(f"{n}."); out.append(s); black = True
        else:
            if i == 0: out.append(f"{n}...")
            out.append(s); black = False; n += 1
    return " ".join(out)


def make_item(split, stratum, src, key, fen, prefix, probe, extra=None):
    board0 = chess.Board(fen) if fen else chess.Board()
    sans = list(prefix) + [probe]
    plies, board, bad = replay2(board0, sans)
    probe_ply = len(sans)
    # the board before the probe, for the pseudo-legal control
    pre_plies, pre_board, pre_bad = replay2(board0, list(prefix))
    assert pre_bad is None, ("prefix not legal", key)
    legal = bad is None
    text = (f'[SetUp "1"]\n[FEN "{fen}"]\n\n' if fen else "") + movetext(sans, black_first=(board0.turn == chess.BLACK), fullmove=board0.fullmove_number)
    return {"id": f"{split}:{stratum}:{key}", "stratum": stratum, "src": src, "text": text, "probe_ply": probe_ply, "san": probe, "legal": legal,
            "first_unresolved_ply": bad, "rel": rel_keys(plies[-1]) if legal else None, "pseudo_accepts": pseudo_accepts(pre_board, probe), **(extra or {})}


def games_for(split):
    if split == "toy":
        rng = random.Random(f"{SALT}|toy|games")
        for gi in range(700):
            b = chess.Board(); sans = []
            for _ in range(rng.randrange(40, 160)):
                ms = list(b.legal_moves)
                if not ms: break
                # bias toward the rules under test: castling, promotions, captures, pawn pushes, and the odd underpromotion
                w = [4 if b.is_castling(m) else 3 if m.promotion else 2 if b.is_capture(m) else 1 for m in ms]
                m = rng.choices(ms, w)[0]; sans.append(b.san(m)); b.push(m)
            yield f"toy:{gi}", sans
        return
    for l in data.gz(f"{ROOT}/gold/{split}/gold.jsonl.gz"):
        g = json.loads(l)
        if not g["valid"]: continue
        lo, m = GAME_GATE[split]
        if int(hashlib.sha1((SALT + g["id"]).encode()).hexdigest(), 16) % m >= lo: continue
        yield g["id"], [p["san_canon"] for p in g["plies"]]


def main(split):
    cap = CAP[split]
    picks = {s: Pick(cap) for s in STRATA}
    exc = {s: Pick(cap) for s in ("castle_rights_lost_king", "castle_rights_lost_rook")}
    nG = nP = 0; cache = {}
    for gid, sans in games_for(split):
        nG += 1; cache[gid] = sans
        # promo_follow: a LATER move of a piece that began as a pawn and promoted earlier in the same game (the promoted piece must act as the piece it became)
        allp, _, _ = replay2(chess.Board(), sans)
        promoted = {}
        for p in allp:
            if p["promotion"]: promoted.setdefault(p["pid"], p["ply"])
        for p in allp:
            j = promoted.get(p["pid"])
            if j is not None and p["ply"] > j: picks["promo_follow"].offer(h(split, "promo_follow", f"{gid}@{p['ply'] - 1}"), ("prefix", gid, p["ply"] - 1, sans[p["ply"] - 1], {}))
        board = chess.Board(); hist = {"king_moved": {True: False, False: False}, "rook_moved": {(c, s): False for c in (True, False) for s in "KQ"}}
        for i, san in enumerate(sans):
            nP += 1
            for st, probe, extra in candidates(board, hist):
                picks[st].offer(h(split, st, f"{gid}@{i}|{probe}"), ("prefix", gid, i, probe, extra))
                if st in ("castle_legal", "castle_legal_attacked_rook", "castle_legal_attacked_b_file"):
                    for kind, st2 in (("king", "castle_rights_lost_king"), ("rook", "castle_rights_lost_rook")):
                        hv = h(split, st2, f"{gid}@{i}|{probe}|exc")
                        if hv % 6 == 0: exc[st2].offer(hv, ("excursion", gid, i, probe, {"side": extra["side"], "kind": kind}))
            mv = board.parse_san(san); c = board.turn
            if board.piece_type_at(mv.from_square) == chess.KING: hist["king_moved"][c] = True
            for col in (True, False):
                for side, f in (("K", 7), ("Q", 0)):
                    rsq = chess.square(f, 0 if col else 7)
                    if mv.from_square == rsq or mv.to_square == rsq: hist["rook_moved"][(col, side)] = True
            board.push(mv)
    items = []; strata_n = collections.Counter(); drop = collections.Counter()
    rng = random.Random(f"{SALT}|{split}|build")
    for st in STRATA:
        if st in ("ep_pinned",): continue
        sel = picks[st].items()
        if st in exc: sel = sel + exc[st].items()
        for src, gid, i, probe, extra in sel:
            prefix = cache[gid][:i]
            if src == "excursion":
                b = chess.Board()
                for s in prefix: b.push_san(s)
                ex = excursion(b, extra["side"], extra["kind"], random.Random(f"{SALT}|{gid}|{i}|{extra['kind']}"))
                if not ex: drop[st] += 1; continue
                it = make_item(split, st, "excursion", f"{gid}@{i}:{extra['kind']}", None, prefix + ex[:-1], ex[-1], {"side": extra["side"]})
            else:
                it = make_item(split, st, "prefix", f"{gid}@{i}", None, prefix, probe, {k: v for k, v in extra.items() if k == "side"})
            if it["stratum"] == "castle_rights_lost_king" or it["stratum"] == "castle_rights_lost_rook": assert not it["legal"]
            items.append(it); strata_n[st] += 1
    # the constructed en-passant family
    for k, (fen, san, st, b) in enumerate(ep_fen_family(random.Random(f"{SALT}|{split}|epfen"), 70 if split != "toy" else 14)):
        items.append(make_item(split, st, "fen", f"fen{k}", fen, [], san)); strata_n[st] += 1
    for k, (fen, san, st, b) in enumerate(both_fen_family(random.Random(f"{SALT}|{split}|bothfen"), 40 if split != "toy" else 8)):
        items.append(make_item(split, st, "fen", f"both{k}", fen, [], san)); strata_n[st] += 1
    if split != "toy": os.makedirs(f"{ROOT}/gold/{split}", exist_ok=True)
    summary = {"split": split, "games": nG, "positions": nP, "items": len(items), "by_stratum": dict(strata_n), "by_src": dict(collections.Counter(i["src"] for i in items)),
               "excursion_dropped": dict(drop), "candidates_seen": {s: picks[s].seen for s in STRATA}}
    if split == "toy":
        out = {"authored": True, "note": "AUTHORED BY SCRIPT: positions from seeded random legal play (bias toward castling, promotion, captures); gold = the python-chess oracle", "items": items}
        json.dump(out, open(os.path.join(HERE, "chess_pgn-probes-toy.json"), "w"), ensure_ascii=False, indent=0)
    else:
        with data.gz(f"{ROOT}/gold/{split}/probes.jsonl.gz", "wt") as f:
            for it in items: f.write(json.dumps(it, ensure_ascii=False) + "\n")
    json.dump(summary, open(f"{ROOT}/gold/{split}-probes-summary.json" if split != "toy" else os.path.join(HERE, "chess_pgn-probes-toy.summary.json"), "w"), indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
