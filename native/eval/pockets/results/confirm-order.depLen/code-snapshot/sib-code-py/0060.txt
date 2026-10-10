#!/usr/bin/env python3
"""eval/notation-competence/chess_pgn-data.py — corpus split, GOLD, perturbations and derived renderings for the
chess_pgn family (SAN / PGN). This is the GOLD SIDE: it never imports or runs the adapter under test.

  /private/tmp/claude-501/venv/bin/python chess_pgn-data.py corpus            # split by SOURCE, write corpus/<split>/games.jsonl + manifest.json
  /private/tmp/claude-501/venv/bin/python chess_pgn-data.py gold  <split>     # gold/<split>/gold.jsonl.gz   (python-chess replay = the authority)
  /private/tmp/claude-501/venv/bin/python chess_pgn-data.py perturb <split>   # gold/<split>/perturb.jsonl.gz (legality oracle on perturbed texts)
  /private/tmp/claude-501/venv/bin/python chess_pgn-data.py foreign           # foreign text pools for R0 (UD prose, code by repo, sibling SMILES/FASTA as strangers)
  /private/tmp/claude-501/venv/bin/python chess_pgn-data.py reps  <split>     # gold/<split>/reps.jsonl.gz    (derived renderings: UCI, long, FAN, national letters, FEN; AUTHORED by script)

AUTHORITIES AND WHAT EACH IS TRUSTED FOR (nothing here is model-authored):
  python-chess (GPL-3.0+, used as an EXTERNAL ORACLE only: never vendored, never imported by the adapter):
     legal replay (Board.parse_san, push), from/to squares, captures, en passant, castling, promotion, check, mate, FEN.
  PGN Standard 1.1 §7-8 (token grammar) for the token boundaries, with python-chess's own pgn.MOVETEXT_REGEX group for the SAN
     lexeme (+ the standard's [+#] suffix, §7.9/§8.2.3.5) and TAG_REGEX for tag pairs. A token the replay cannot resolve makes the
     game gold-invalid: it is KEPT with first_unresolved_ply and is never silently dropped (a denominator, not a hole).
  PGN Standard §17 table of alternative piece letters, Unicode block U+2654..U+265F (figurines): for the DERIVED renderings only.

SPLITS ARE BY SOURCE (never by game inside one source):
  train  Lichess standard rated games (online play, CC0): 2013-01 (all) + 2020-01 (first 10 MiB of the zst frame)
  dev    Lichess broadcast (over-the-board, relayed by organisers, CC BY-SA 4.0): 2023-01
  test   Lichess broadcast 2024-01, with every game whose BroadcastName or Event also occurs ANYWHERE in the dev month removed, and
         every game whose movetext hash occurs in another split removed (events share players and opening theory).
Sampling inside a source: sha1("chess_pgn/v1|<game key>") mod M < K, so the sample is a pure function of the data.
"""
import sys, os, re, json, hashlib, subprocess, random, collections, gzip

import chess, chess.pgn

ROOT = "/private/tmp/claude-501/notation/chess_pgn"
RAW = f"{ROOT}/raw"
CORPUS = f"{ROOT}/corpus"
GOLD = f"{ROOT}/gold"
SALT = "chess_pgn/v1"


def gz(path, mode="rt"):
    """gold files are gzip JSONL (the train-scale gold was 800 MB uncompressed)."""
    return gzip.open(path, mode, encoding="utf8")

SOURCES = {
    "train": [
        dict(file="lichess_db_standard_rated_2013-01.pgn.zst", source="lichess_standard_rated_2013-01", licence="CC0-1.0", m=6, k=1, truncated=False),
        dict(file="lichess_db_standard_rated_2020-01.head10MB.pgn.zst", source="lichess_standard_rated_2020-01(head 10 MiB)", licence="CC0-1.0", m=9, k=1, truncated=True),
    ],
    "dev": [dict(file="lichess_db_broadcast_2023-01.pgn.zst", source="lichess_broadcast_2023-01", licence="CC-BY-SA-4.0", m=4, k=1, truncated=False)],
    "test": [dict(file="lichess_db_broadcast_2024-01.pgn.zst", source="lichess_broadcast_2024-01", licence="CC-BY-SA-4.0", m=5, k=1, truncated=False)],
}

# ── game splitting ──────────────────────────────────────────────────────────

def stream_games(path):
    """Yield raw game texts from a .zst PGN. A game starts at a [Event line once the previous block has movetext or its own Event."""
    p = subprocess.Popen(["zstd", "-dc", path], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    cur, has_event, has_move = [], False, False
    for raw in p.stdout:
        line = raw.decode("utf8", "replace").rstrip("\r\n")
        if line.startswith("[Event ") and (has_move or has_event):
            yield "\n".join(cur).strip("\n")
            cur, has_event, has_move = [], False, False
        if line.startswith("[Event "):
            has_event = True
        elif line.strip() and not line.startswith("["):
            has_move = True
        cur.append(line)
    if cur:
        yield "\n".join(cur).strip("\n")
    p.stdout.close(); p.wait()


def tag_dict(text):
    d = {}
    for line in text.split("\n"):
        m = chess.pgn.TAG_REGEX.match(line)
        if m and m.group(1) not in d:
            d[m.group(1)] = m.group(2)
    return d


def game_key(tags):
    for k in ("GameURL", "Site"):
        v = tags.get(k)
        if v:
            return v.rstrip("/").split("/")[-1] if "lichess.org" in v else v
    return None


def movetext_of(text):
    lines = text.split("\n")
    i = 0
    while i < len(lines) and lines[i].startswith("["):
        i += 1
    return "\n".join(lines[i:]).strip()


def bucket(key):
    return int(hashlib.sha1(f"{SALT}|{key}".encode()).hexdigest(), 16)


def mt_hash(text):
    return hashlib.sha1(re.sub(r"\s+", " ", re.sub(r"\{[^}]*\}", "", movetext_of(text))).strip().encode()).hexdigest()


# ── corpus ──────────────────────────────────────────────────────────────────

def cmd_corpus():
    os.makedirs(CORPUS, exist_ok=True)
    manifest = {"generated_by": "eval/notation-competence/chess_pgn-data.py corpus", "salt": SALT, "splits": {}, "excluded": {}}
    dev_events, dev_broadcasts = set(), set()
    seen_hash = {}
    out = {s: [] for s in SOURCES}
    # dev first: its full-month event index is needed to keep test event-disjoint
    for split in ["dev", "train", "test"]:
        for src in SOURCES[split]:
            n_all = n_sel = n_bad = n_trunc = n_ev = n_dup = 0
            games = list(stream_games(f"{RAW}/{src['file']}"))
            if src["truncated"] and games:
                games = games[:-1]; n_trunc = 1   # the frame was cut mid-game: the last block is not a game
            for text in games:
                n_all += 1
                tags = tag_dict(text)
                if split == "dev":
                    if tags.get("Event"): dev_events.add(tags["Event"])
                    if tags.get("BroadcastName"): dev_broadcasts.add(tags["BroadcastName"])
            for text in games:
                tags = tag_dict(text)
                key = game_key(tags)
                mt = movetext_of(text)
                if key is None or not re.search(r"[a-h][1-8]", mt):
                    n_bad += 1; continue
                if bucket(key) % src["m"] >= src["k"]:
                    continue
                if split == "test" and (tags.get("BroadcastName") in dev_broadcasts or tags.get("Event") in dev_events):
                    n_ev += 1; continue
                h = mt_hash(text)
                if h in seen_hash and seen_hash[h] != split:
                    n_dup += 1; continue
                seen_hash.setdefault(h, split)
                n_sel += 1
                out[split].append({"id": f"{split}:{key}", "source": src["source"], "text": text})
            manifest["splits"].setdefault(split, []).append({
                "source": src["source"], "file": src["file"], "licence": src["licence"], "games_in_file": n_all, "selected": n_sel,
                "rule": f"sha1('{SALT}|<game key>') mod {src['m']} < {src['k']}", "malformed_or_no_movetext": n_bad,
                "dropped_truncated_last_block": n_trunc, "dropped_event_overlap_with_dev": n_ev, "dropped_movetext_hash_in_other_split": n_dup})
    for split, games in out.items():
        os.makedirs(f"{CORPUS}/{split}", exist_ok=True)
        with open(f"{CORPUS}/{split}/games.jsonl", "w") as f:
            for g in games:
                f.write(json.dumps(g, ensure_ascii=False) + "\n")
        manifest["splits"][split + "_total_selected"] = len(games)
    manifest["dev_event_index"] = {"events": len(dev_events), "broadcast_names": len(dev_broadcasts)}
    # verify disjointness (never trust the filter): no BroadcastName/Event of test in dev, no movetext hash shared
    def idx(split):
        ev, bn, hs = set(), set(), set()
        for g in out[split]:
            t = tag_dict(g["text"]); ev.add(t.get("Event")); bn.add(t.get("BroadcastName")); hs.add(mt_hash(g["text"]))
        return ev, bn, hs
    d, t, tr = idx("dev"), idx("test"), idx("train")
    manifest["disjointness_check"] = {
        "test_events_in_dev_month": len((t[0] - {None}) & dev_events), "test_broadcasts_in_dev_month": len((t[1] - {None}) & dev_broadcasts),
        "movetext_hash_overlap": {"train&dev": len(tr[2] & d[2]), "train&test": len(tr[2] & t[2]), "dev&test": len(d[2] & t[2])}}
    json.dump(manifest, open(f"{CORPUS}/manifest.json", "w"), indent=1)
    print(json.dumps(manifest, indent=1))


# ── gold ────────────────────────────────────────────────────────────────────

SAN_PAT = (r"(?:O-O-O|O-O|0-0-0|0-0|[NBKRQ]?[a-h]?[1-8]?[\-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|--|Z0|0000)[+#]*")
TOK_RE = re.compile(
    r"(?P<comment>\{[^}]*\}?)"
    r"|(?P<linecomment>;[^\n]*)"
    r"|(?P<nag>\$[0-9]+)"
    r"|(?P<result>(?:1-0|0-1|1/2-1/2|\*)(?![A-Za-z0-9_+#=:\-/]))"
    r"|(?P<san>" + SAN_PAT + r")(?![A-Za-z0-9_=])"
    r"|(?P<mn>[0-9]+\.*)"
    r"|(?P<vo>\()|(?P<vc>\))"
    r"|(?P<glyph>[?!]{1,2})")
CLS = {"comment": "comment", "linecomment": "line_comment", "nag": "nag", "result": "result", "san": "san", "mn": "move_number",
       "vo": "variation_open", "vc": "variation_close", "glyph": "glyph"}


def tokenise(text):
    """Gold tokens as (start, end, cls, extra) in Python (code point) offsets. extra = tag name for tag_value tokens."""
    toks, pos = [], 0
    lines = text.split("\n")
    # header: leading lines starting with '['
    i = 0
    while i < len(lines) and lines[i].startswith("["):
        line = lines[i]
        m = chess.pgn.TAG_REGEX.match(line)
        if m:
            toks.append((pos + m.start(1), pos + m.end(1), "tag_name", None))
            toks.append((pos + m.start(2), pos + m.end(2), "tag_value", m.group(1)))
        else:
            for w in re.finditer(r"\S+", line):
                toks.append((pos + w.start(), pos + w.end(), "other", None))
        pos += len(line) + 1
        i += 1
    body_start = pos
    body = "\n".join(lines[i:])
    covered = []
    for m in TOK_RE.finditer(body):
        kind = m.lastgroup
        toks.append((body_start + m.start(), body_start + m.end(), CLS[kind], None))
        covered.append((m.start(), m.end()))
    # residual non-space runs are 'other' tokens (nothing is silently dropped from the gold)
    mask = [False] * len(body)
    for s, e in covered:
        for j in range(s, e): mask[j] = True
    j = 0
    while j < len(body):
        if not mask[j] and not body[j].isspace():
            k = j
            while k < len(body) and not mask[k] and not body[k].isspace(): k += 1
            toks.append((body_start + j, body_start + k, "other", None)); j = k
        else:
            j += 1
    toks.sort(key=lambda t: (t[0], t[1]))
    return toks


def u16_map(text):
    """code-point index -> UTF-16 code-unit index (the adapter is JavaScript)."""
    if all(ord(c) <= 0xFFFF for c in text):
        return None
    arr, n = [], 0
    for c in text:
        arr.append(n); n += 2 if ord(c) > 0xFFFF else 1
    arr.append(n)
    return arr


PIECE = {chess.PAWN: "P", chess.KNIGHT: "N", chess.BISHOP: "B", chess.ROOK: "R", chess.QUEEN: "Q", chess.KING: "K"}


def piece_id(color, ptype, sq):
    return f"{'w' if color else 'b'}{PIECE[ptype]}-{chess.square_name(sq)}"


def replay(sans):
    """Replay a SAN list with python-chess. Returns (plies, board, first_unresolved_ply or None, error or None). Piece identity is tracked by origin square."""
    board = chess.Board()
    ids = {sq: piece_id(p.color, p.piece_type, sq) for sq, p in board.piece_map().items()}
    plies = []
    for n, san in enumerate(sans, 1):
        try:
            move = board.parse_san(san)
        except ValueError as e:
            return plies, board, n, f"{type(e).__name__}"
        if move == chess.Move.null():
            return plies, board, n, "null_move"
        color = board.turn
        ptype = board.piece_type_at(move.from_square)
        mover = ids[move.from_square]
        castle = board.is_castling(move)
        ep = board.is_en_passant(move)
        capture = board.is_capture(move)
        captured_id = captured_type = None
        rook_id = rook_to = None
        kingside = None
        san_canon = board.san(move)
        # long algebraic (FIDE Appendix C.8 'a longer form containing the square of departure')
        frm, to = chess.square_name(move.from_square), chess.square_name(move.to_square)
        if castle:
            rank = chess.square_rank(move.from_square)
            kingside = chess.square_file(move.to_square) > chess.square_file(move.from_square)
            r_from = chess.square(7 if kingside else 0, rank); r_to = chess.square(5 if kingside else 3, rank)
            rook_id = ids.pop(r_from); ids[r_to] = rook_id; rook_to = chess.square_name(r_to)
        elif ep:
            cap_sq = chess.square(chess.square_file(move.to_square), chess.square_rank(move.from_square))
            captured_id = ids.pop(cap_sq); captured_type = "P"
        elif capture:
            captured_type = PIECE[board.piece_type_at(move.to_square)]
            captured_id = ids.pop(move.to_square)
        ids[move.to_square] = ids.pop(move.from_square)
        promo = PIECE[move.promotion] if move.promotion else None
        board.push(move)
        check, mate = board.is_check(), board.is_checkmate()
        enemy_king = ids[board.king(board.turn)]
        pl_letter = "" if ptype == chess.PAWN else PIECE[ptype]
        if castle:
            long_alg = "O-O" if kingside else "O-O-O"
        else:
            long_alg = f"{pl_letter}{frm}{'x' if capture else '-'}{to}{'=' + promo if promo else ''}"
        long_alg += "#" if mate else ("+" if check else "")
        plies.append({
            "ply": n, "color": "w" if color else "b", "piece": PIECE[ptype], "pid": mover, "from": frm, "to": to,
            "capture": bool(capture), "captured_pid": captured_id, "captured_type": captured_type, "ep": bool(ep),
            "castle": (("K" if kingside else "Q") if castle else None), "rook_pid": rook_id, "rook_to": rook_to,
            "promotion": promo, "check": bool(check), "mate": bool(mate), "enemy_king": enemy_king,
            "san_canon": san_canon, "uci": move.uci(), "long": long_alg})
    return plies, board, None, None


def gold_game(g):
    text = g["text"]
    toks = tokenise(text)
    sans = [text[s:e] for s, e, c, _ in toks if c == "san"]
    plies, board, first_bad, err = replay([re.sub(r"[+#]+$", "", s) for s in sans])
    um = u16_map(text)
    cv = (lambda i: um[i]) if um else (lambda i: i)
    tags = tag_dict(text)
    out_toks, k = [], 0
    for s, e, c, extra in toks:
        t = {"s": cv(s), "e": cv(e), "cls": c}
        if extra: t["tag"] = extra
        if c == "san":
            k += 1
            if k <= len(plies):
                t["piece"] = plies[k - 1]["piece"]; t["ply"] = k
                plies[k - 1]["span"] = [cv(s), cv(e)]
                plies[k - 1]["text"] = text[s:e]
            else:
                t["ply"] = k          # beyond the replayed prefix: no piece gold
        out_toks.append(t)
    return {
        "id": g["id"], "source": g["source"], "text": text, "tags": tags, "tokens": out_toks, "n_san": len(sans),
        "valid": first_bad is None, "first_unresolved_ply": first_bad, "error": err, "plies": plies,
        "final_placement": board.board_fen() if first_bad is None else None,
        "comment_unterminated": bool(re.search(r"\{[^}]*\Z", movetext_of(text))),
    }


def cmd_gold(split):
    os.makedirs(f"{GOLD}/{split}", exist_ok=True)
    n = bad = 0
    with open(f"{CORPUS}/{split}/games.jsonl") as fin, gz(f"{GOLD}/{split}/gold.jsonl.gz", "wt") as fout:
        for line in fin:
            g = json.loads(line)
            r = gold_game(g)
            n += 1; bad += (not r["valid"])
            fout.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"gold {split}: {n} games, {bad} gold-invalid (python-chess could not resolve a SAN token)")


# ── perturbations (legality oracle) ─────────────────────────────────────────

def cmd_perturb(split, per_game=2, seed=20261006):
    rng = random.Random(f"{SALT}|perturb|{split}|{seed}")
    games = [json.loads(l) for l in gz(f"{GOLD}/{split}/gold.jsonl.gz")]
    pool = [g["text"][t["s"]:t["e"]] for g in games if g["valid"] for t in g["tokens"] if t["cls"] == "san" and "ply" in t]
    # text offsets in gold are UTF-16; rebuild with python text offsets by re-tokenising
    out = []
    for g in games:
        if not g["valid"] or g["n_san"] < 8:
            continue
        for kind in rng.sample(["swap", "replace", "drop"], per_game):
            text = g["text"]
            toks = [t for t in tokenise(text) if t[2] == "san"]
            n = len(toks)
            k = rng.randrange(2, n - 1)           # 0-based index of the perturbed SAN token, never the first move
            if kind == "swap":
                (s1, e1, _, _), (s2, e2, _, _) = toks[k], toks[k + 1]
                new = text[:s1] + text[s2:e2] + text[e1:s2] + text[s1:e1] + text[e2:]
            elif kind == "replace":
                s1, e1, _, _ = toks[k]
                repl = rng.choice(pool)
                new = text[:s1] + repl + text[e1:]
            else:
                s1, e1, _, _ = toks[k]
                new = text[:s1] + text[e1:]
            sans = [re.sub(r"[+#]+$", "", new[s:e]) for s, e, c, _ in tokenise(new) if c == "san"]
            plies, board, bad, err = replay(sans)
            out.append({"id": g["id"] + "#" + kind, "game": g["id"], "kind": kind, "at_ply": k + 1, "text": new, "n_san": len(sans),
                        "first_unresolved_ply": bad, "error": err})
    with gz(f"{GOLD}/{split}/perturb.jsonl.gz", "wt") as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    c = collections.Counter((r["kind"], r["first_unresolved_ply"] is None) for r in out)
    print(f"perturb {split}: {len(out)} texts; (kind, still_fully_legal) counts: {dict(c)}")


# ── derived renderings (AUTHORED by script from natural games; labelled so) ──

# PGN Standard 1.1 section 17: pawn knight bishop rook queen king
LETTERS = {
    "en": "PNBRQK", "de": "BSLTDK", "fr": "PCFTDR", "es": "PCATDR", "hu": "GHFBVK", "pl": "PSGWHK", "nl": "OPLTDK", "cs": "PJSVDK", "fi": "PRLTDK",
}
# Unicode block Miscellaneous Symbols U+2654..U+265F: white K Q R B N P then black K Q R B N P
FIG_W = {"K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙"}
FIG_B = {"K": "♚", "Q": "♛", "R": "♜", "B": "♝", "N": "♞", "P": "♟"}


def localise(san, lang):
    if lang == "en":
        return san
    tbl = dict(zip("PNBRQK", LETTERS[lang]))
    if san.startswith("O-O"):
        return san
    out = san
    if out[0] in "NBRQK":
        out = tbl[out[0]] + out[1:]
    out = re.sub(r"=([NBRQ])", lambda m: "=" + tbl[m.group(1)], out)
    return out


def figurine(san, color):
    tbl = FIG_W if color == "w" else FIG_B
    if san.startswith("O-O"):
        return san
    out = san
    if out[0] in "NBRQK":
        out = tbl[out[0]] + out[1:]
    out = re.sub(r"=([NBRQ])", lambda m: "=" + tbl[m.group(1)], out)
    return out


def render(plies, style, result="*"):
    """Return (text, spans) where spans are built BY CONSTRUCTION: [(start, end, cls)]. style: uci|long|fan|tight|<lang>."""
    parts = []   # (token, cls, glued_to_next)
    for p in plies:
        n = (p["ply"] + 1) // 2
        white = p["color"] == "w"
        if style == "uci":
            parts.append((p["uci"], "san", False)); continue
        if style == "tight":
            if white: parts.append((f"{n}.", "move_number", True))
            parts.append((p["san_canon"], "san", False)); continue
        if white: parts.append((f"{n}.", "move_number", False))
        if style == "long": parts.append((p["long"], "san", False))
        elif style == "fan": parts.append((figurine(p["san_canon"], p["color"]), "san", False))
        else: parts.append((localise(p["san_canon"], style), "san", False))
    parts.append((result, "result", False))
    text, spans = "", []
    for i, (tok, cls, glued) in enumerate(parts):
        if i and not parts[i - 1][2]:
            text += " "
        s = len(text); text += tok; spans.append((s, len(text), cls))
    return text, spans


def cmd_reps(split, limit=400):
    games = [json.loads(l) for l in gz(f"{GOLD}/{split}/gold.jsonl.gz")]
    games = [g for g in games if g["valid"] and g["n_san"] >= 10 and not any(t["cls"] in ("variation_open",) for t in g["tokens"])]
    rng = random.Random(f"{SALT}|reps|{split}")
    rng.shuffle(games)
    games = games[:limit]
    out = []
    for g in games:
        res = next((g["text"][t["s"]:t["e"]] for t in g["tokens"] if t["cls"] == "result"), "*")
        reps = {}
        for style in ["en", "uci", "long", "fan", "tight", "de", "fr", "es", "hu", "pl"]:
            text, spans = render(g["plies"], style, res)
            reps[style] = {"text": text, "spans": [{"s": s, "e": e, "cls": c} for s, e, c in spans]}
        out.append({"id": g["id"], "plies": g["plies"], "final_placement": g["final_placement"], "reps": reps})
    with gz(f"{GOLD}/{split}/reps.jsonl.gz", "wt") as f:
        for r in out: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"reps {split}: {len(out)} games x {len(out[0]['reps']) if out else 0} renderings (AUTHORED by script from natural games)")



# ── foreign text pools (R0 negatives / background) ─────────────────────────

FOREIGN = f"{ROOT}/foreign"
UD_TB, UD_EVAL = "/private/tmp/claude-501/tb", "/private/tmp/claude-501/ud-eval"
CODE_DIR = "/Users/mlacy/Documents/3.0/ethos/09-source-code"
PROSE_STEMS = ["eng", "spa", "deu", "fra", "ita", "rus"]
# code is split BY REPOSITORY (never by file within one repo): the same language appears in train and held-out splits from DIFFERENT repos
CODE_REPOS = {
    "train": ["curl_curl", "torvalds_linux", "postgres_postgres", "python_cpython", "golang_go", "BurntSushi_ripgrep", "microsoft_TypeScript", "rails_rails", "apache_spark"],
    "dev": ["openssl_openssl", "apache_httpd", "pallets_flask", "kubernetes_kubernetes", "sharkdp_bat", "godotengine_godot"],
    "test": ["git_git", "openssh_openssh-portable", "sqlite_sqlite", "tiangolo_fastapi", "WireGuard_wireguard-go", "astral-sh_ruff", "ggerganov_llama.cpp"],
}
CODE_EXT = {".c", ".h", ".py", ".go", ".rs", ".ts", ".js", ".rb", ".scala", ".cc", ".cpp", ".java", ".zig", ".hs"}
SIB = "/private/tmp/claude-501/notation"


def sha1_file(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): h.update(chunk)
    return h.hexdigest()


def ud_text_lines(path):
    with open(path, encoding="utf8") as f:
        return [l[len("# text = "):].strip() for l in f if l.startswith("# text = ")]


def cmd_foreign():
    manifest = {"note": "foreign text pools for R0; copied/sampled once so the instrument does not depend on sibling workflows' directories", "pools": []}
    for split in ["train", "dev", "test"]:
        os.makedirs(f"{FOREIGN}/{split}", exist_ok=True)
        docs = {"prose": [], "code": [], "smiles": [], "fasta": []}
        for stem in PROSE_STEMS:
            path = f"{UD_TB}/{stem}/train.conllu" if split == "train" else f"{UD_EVAL}/{stem}/{split}.conllu"
            if not os.path.exists(path): manifest["pools"].append({"split": split, "kind": "prose", "stem": stem, "gap": "missing " + path}); continue
            lines = ud_text_lines(path)
            rng = random.Random(f"{SALT}|prose|{split}|{stem}")
            n_docs = 40
            for i in range(n_docs):
                a = rng.randrange(0, max(1, len(lines) - 60))
                docs["prose"].append({"id": f"{split}:prose:{stem}:{i}", "lang": stem, "text": " ".join(lines[a:a + 60]), "origin": path, "sha1_origin": None})
            manifest["pools"].append({"split": split, "kind": "prose", "stem": stem, "origin": path, "docs": n_docs})
        for repo in CODE_REPOS[split]:
            d = f"{CODE_DIR}/{repo}"
            if not os.path.isdir(d): manifest["pools"].append({"split": split, "kind": "code", "repo": repo, "gap": "missing dir"}); continue
            n = 0
            for fn in sorted(os.listdir(d)):
                base = fn[:-4] if fn.endswith(".txt") else fn
                if os.path.splitext(base)[1] not in CODE_EXT: continue
                text = open(f"{d}/{fn}", encoding="utf8", errors="replace").read()
                docs["code"].append({"id": f"{split}:code:{repo}:{fn}", "lang": os.path.splitext(base)[1][1:], "text": text[:60000], "origin": f"{d}/{fn}", "repo": repo}); n += 1
            manifest["pools"].append({"split": split, "kind": "code", "repo": repo, "files": n})
        if split in ("dev", "test"):
            # stranger notations from the sibling families' raw folders (read-only); NEVER part of any prior
            smi = f"{SIB}/chem_smiles/raw/ccd/Components-smiles-stereo-oe.smi"
            if os.path.exists(smi):
                rows = open(smi, encoding="utf8", errors="replace").read().split("\n")
                rows = [r for r in rows if r.strip()]
                keep = [r for r in rows if (bucket("smiles|" + r.split("\t")[1] if "\t" in r else r) % 2 == (0 if split == "dev" else 1))]
                rng = random.Random(f"{SALT}|smiles|{split}"); rng.shuffle(keep)
                for i in range(40):
                    docs["smiles"].append({"id": f"{split}:smiles:{i}", "lang": "smiles", "text": "\n".join(keep[i * 40:(i + 1) * 40]), "origin": smi})
                manifest["pools"].append({"split": split, "kind": "smiles", "origin": smi, "sha1_origin": sha1_file(smi), "docs": 40})
            else:
                manifest["pools"].append({"split": split, "kind": "smiles", "gap": "missing " + smi})
            sub, ext = ("cds_aa", ".faa.gz") if split == "dev" else ("fasta", ".fna.gz")
            fdir = f"{SIB}/genetic/raw/{sub}"
            if os.path.isdir(fdir):
                files = sorted(f for f in os.listdir(fdir) if f.endswith(ext))[:60]
                for fn in files:
                    try:
                        with gzip.open(f"{fdir}/{fn}", "rt", errors="replace") as f:
                            txt = f.read(6000)
                    except OSError:
                        continue
                    docs["fasta"].append({"id": f"{split}:fasta:{fn}", "lang": "fasta", "text": txt, "origin": f"{fdir}/{fn}"})
                manifest["pools"].append({"split": split, "kind": "fasta", "origin": fdir, "docs": len(docs["fasta"])})
            else:
                manifest["pools"].append({"split": split, "kind": "fasta", "gap": "missing " + fdir})
        for kind, ds in docs.items():
            if not ds: continue
            with open(f"{FOREIGN}/{split}/{kind}.jsonl", "w") as f:
                for d in ds: f.write(json.dumps(d, ensure_ascii=False) + "\n")
            print(f"foreign {split}/{kind}: {len(ds)} docs")
    json.dump(manifest, open(f"{FOREIGN}/manifest.json", "w"), indent=1)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "corpus": cmd_corpus()
    elif cmd == "gold": cmd_gold(sys.argv[2])
    elif cmd == "perturb": cmd_perturb(sys.argv[2])
    elif cmd == "reps": cmd_reps(sys.argv[2])
    elif cmd == "foreign": cmd_foreign()
    else: raise SystemExit(__doc__)
