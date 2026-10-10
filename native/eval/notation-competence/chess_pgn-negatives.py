#!/usr/bin/env python3
"""eval/notation-competence/chess_pgn-negatives.py — the HARD NEGATIVE pools of the chess_pgn R0 (A4 of chess_pgn.mjs).

  /private/tmp/claude-501/venv/bin/python chess_pgn-negatives.py <split>        # split: dev | test (train is never written: no prior uses it)

WHAT THIS IS. An identifier that names chess from a tag header or from one SAN-shaped word is a rare-shape detector. The registered foreign pools (UD prose, code,
SMILES, FASTA) contain almost no SAN-shaped word (dev: 0 of 6,270 prose windows, 2 of 926 code windows), so their 0% false-alarm rate could not separate the identifier
from "any SAN-shaped word names chess". These pools are the strangers that can: every stream is 40 whitespace words (the registered W).

AUTHORED, NOT NATURAL (stated, never presented as held-out natural data): every pool below is produced BY SCRIPT from a seeded generator (seed = sha1 of
"chess_pgn/neg/v1|<split>|<kind>"; the dev and test seeds differ). The generators carry the SURFACE of each notation (the move grammar of draughts PDN, shogi USI and
western, xiangqi WXF and ICCS, Go GTP / SGF, battleship and spreadsheet coordinates, domino and bridge words, an xxd hexdump of real bytes); they do NOT play legal games of
those games (plausibility of the surface is what an identifier sees). Natural ingredients, taken from the SAME split's chess corpus so the envelope text is not the tell:
roster tag values (Event, Site, Date, Round, White, Black, Result), Lichess "{ [%clk h:mm:ss] }" comment style (half of the records), natural SAN words (the injections),
natural prose and code carriers (UD treebank dev / test text; held-out repositories). Nothing here is model-written text, and nothing is a gold label for the reader: the
label of every stream is "not chess", by construction.

KINDS (named-rate must be <= 0.05 each; each >= 100 streams per split or the kind is a typed gap):
  envelope pools (roster header + movetext of ANOTHER game; three views, 120 streams each: head = header + movetext first 40 words; movetext = from move 1;
  mid = cold window inside the movetext, numbering kept):  pdn_draughts shogi_usi shogi_western xiangqi_wxf xiangqi_iccs
  roster_prose    seven roster tag lines then prose
  tags_garbled    tag lines with invented tag names and natural values (a header that is not even the roster)
  strangers       battleship_lower battleship_upper sheet_lower sheet_upper go_gtp sgf domino bridge hexdump_xxd
  near-miss       prose_san_k{1,2,4} code_san_k{1,2,4}: a natural carrier window with k natural SAN words (drawn from THIS split's chess games) at random positions (authored)
Also written: foreign/<split>/code_extra.jsonl (the enlarged held-out code carrier pool: more repositories BY REPOSITORY and PyPI sdists BY PACKAGE; chess_pgn-fetch-code.py,
PROVENANCE in code_extra/PROVENANCE.json) and negatives/<split>/survey.json (how many NATURAL windows carry a SAN-shaped word: the typed gap of the near-miss kind).
"""
import sys, os, re, json, gzip, random, hashlib, importlib.util, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = "/private/tmp/claude-501/notation/chess_pgn"
CODE_DIR = "/Users/mlacy/Documents/3.0/ethos/09-source-code"
SALT = "chess_pgn/neg/v1"
W = 40
N_PER_KIND = 360          # 120 per view for the envelope kinds
EXTRA_REPOS = {"dev": ["bitcoin_bitcoin", "jedisct1_libsodium"], "test": ["aws_s2n-tls", "signalapp_libsignal", "ziglang_zig", "denoland_deno"]}
CODE_EXT = {".c", ".h", ".py", ".go", ".rs", ".ts", ".js", ".rb", ".scala", ".cc", ".cpp", ".java", ".zig", ".hs", ".pyx", ".pxd"}
MAX_PER_PACKAGE = 60
RAW_BYTES = {"dev": "lichess_db_broadcast_2023-01.pgn.zst", "test": "lichess_db_broadcast_2024-01.pgn.zst"}

spec = importlib.util.spec_from_file_location("chess_pgn_data", os.path.join(HERE, "chess_pgn-data.py"))
data = importlib.util.module_from_spec(spec); spec.loader.exec_module(data)

SAN_RE = re.compile(r"^(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$")   # independent of the adapter (the survey only)


def R(split, kind): return random.Random(f"{SALT}|{split}|{kind}")


def words(t): return t.split()


# ── natural ingredients ──────────────────────────────────────────────────────

def load_games(split):
    return [json.loads(l) for l in open(f"{ROOT}/corpus/{split}/games.jsonl")]


def roster_lines(tags, extra=()):
    ks = ["Event", "Site", "Date", "Round", "White", "Black", "Result"]
    lines = [f'[{k} "{tags[k]}"]' for k in ks if k in tags]
    lines += [f'[{k} "{v}"]' for k, v in extra]
    return lines


def clk(rng):
    return "{ [%%clk %d:%02d:%02d] }" % (rng.randrange(0, 2), rng.randrange(0, 60), rng.randrange(0, 60))


def numbered(plies, rng, comments, start=1):
    """PGN-style numbered movetext words: 'n. ply [comment] n... ply [comment] ...'. With comments black moves carry 'n...' (the PGN rule)."""
    out = []
    for i, p in enumerate(plies):
        n = start + i // 2
        if i % 2 == 0:
            out.append(f"{n}."); out.append(p)
        else:
            if comments: out.append(f"{n}...")
            out.append(p)
        if comments: out += clk(rng).split()
    return out


def views(rng, header_lines, mt_words, n_total, kind, extra=None):
    """3 views of one record: head (header + movetext), movetext from move 1, cold mid"""
    out = []
    hw = [w for l in header_lines for w in l.split()]
    for v in range(3):
        if v == 0: ws = (hw + mt_words)[:W]; view = "head"
        elif v == 1: ws = mt_words[:W]; view = "movetext"
        else:
            lo = int(0.1 * (len(mt_words) - W)); hi = int(0.5 * (len(mt_words) - W)); a = lo + rng.randrange(0, max(1, hi - lo + 1)); ws = mt_words[a:a + W]; view = "mid"
        if len(ws) == W: out.append((view, ws))
    return out


# ── movetext generators (surface only) ───────────────────────────────────────

def g_pdn(rng, n):
    out = []
    for _ in range(n):
        if rng.random() < 0.2:
            for _ in range(20):
                a = rng.randrange(1, 51); b = a + rng.choice([-11, -9, 9, 11])
                if 1 <= b <= 50: out.append(f"{a}x{b}"); break
            else: out.append("32-28")
        else:
            for _ in range(20):
                a = rng.randrange(1, 51); b = a + rng.choice([-6, -5, -4, 4, 5, 6])
                if 1 <= b <= 50: out.append(f"{a}-{b}"); break
            else: out.append("32-28")
    return out


def g_shogi_usi(rng, n):
    out = []
    for _ in range(n):
        if rng.random() < 0.06: out.append("%s*%d%s" % (rng.choice("PLNSGBR"), rng.randrange(1, 10), rng.choice("abcdefghi"))); continue
        f1 = rng.randrange(1, 10); r1 = rng.randrange(0, 9)
        f2 = min(9, max(1, f1 + rng.choice([-1, 0, 1]))); r2 = min(8, max(0, r1 + rng.choice([-2, -1, 1, 2])))
        out.append("%d%s%d%s%s" % (f1, "abcdefghi"[r1], f2, "abcdefghi"[r2], "+" if rng.random() < 0.12 else ""))
    return out


def g_shogi_west(rng, n):
    return ["%s%s%d%s%s" % (rng.choice("PPPLNSGBRK"), rng.choice("-----x"), rng.randrange(1, 10), rng.choice("abcdefghi"), rng.choice(["", "", "", "+", "="])) for _ in range(n)]


def g_xq_wxf(rng, n):
    return ["%s%d%s%d" % (rng.choice("CCHHRREAKPPPP"), rng.randrange(1, 10), rng.choice("+-="), rng.randrange(1, 10)) for _ in range(n)]


def g_xq_iccs(rng, n):
    out = []
    for _ in range(n):
        f = rng.randrange(0, 9); r = rng.randrange(0, 10)
        m = rng.random()
        if m < 0.4: f2, r2 = rng.randrange(0, 9), r
        elif m < 0.7: f2, r2 = f, rng.randrange(0, 10)
        else:
            df, dr = rng.choice([(1, 2), (2, 1), (-1, 2), (-2, 1), (1, -2), (2, -1), (-1, -2), (-2, -1)]); f2, r2 = min(8, max(0, f + df)), min(9, max(0, r + dr))
        out.append("%s%d%s%d" % ("abcdefghi"[f], r, "abcdefghi"[f2], r2))
    return out


ENVELOPE = {
    "pdn_draughts": (g_pdn, [("GameType", "20")]),
    "shogi_usi": (g_shogi_usi, [("Handicap", "Even")]),
    "shogi_western": (g_shogi_west, [("Handicap", "Even")]),
    "xiangqi_wxf": (g_xq_wxf, [("Variant", "Xiangqi")]),
    "xiangqi_iccs": (g_xq_iccs, [("Variant", "Xiangqi")]),
}


def envelope_pool(split, kind, games):
    rng = R(split, kind); gen, extra = ENVELOPE[kind]; out = []
    while len(out) < N_PER_KIND:
        g = rng.choice(games); tags = data.tag_dict(g["text"])
        hdr = roster_lines(tags, extra)
        plies = gen(rng, 70)
        mt = numbered(plies, rng, comments=rng.random() < 0.5)
        for view, ws in views(rng, hdr, mt, 70, kind):
            if sum(1 for o in out if o["view"] == view) < N_PER_KIND // 3: out.append({"id": f"{split}:{kind}:{len(out)}", "kind": kind, "view": view, "ws": ws, "authored": True})
    return out


# ── strangers ────────────────────────────────────────────────────────────────

def sq(rng): return "%s%d" % (rng.choice("abcdefgh"), rng.randrange(1, 9))


def s_battleship_lower(rng):
    ws = []
    while len(ws) < W:
        ws.append(sq(rng))
        if rng.random() < 0.35: ws.append(rng.choice(["hit", "miss", "sunk"]))
    return ws[:W]


def s_battleship_upper(rng):
    ws = []
    while len(ws) < W:
        ws.append(sq(rng).upper())
        if rng.random() < 0.35: ws.append(rng.choice(["Hit", "Miss", "Sunk"]))
    return ws[:W]


def s_sheet_lower(rng):
    ws = []
    while len(ws) < W:
        r = rng.random()
        if r < 0.7: ws.append(sq(rng))
        elif r < 0.85: ws.append(f"{sq(rng)}:{sq(rng)}")
        else: ws.append(f"=sum({sq(rng)}:{sq(rng)})")
    return ws[:W]


def s_sheet_upper(rng):
    ws = []
    while len(ws) < W:
        r = rng.random()
        if r < 0.55: ws.append(sq(rng).upper())
        elif r < 0.75: ws.append(f"{sq(rng).upper()}:{sq(rng).upper()}")
        elif r < 0.9: ws.append(f"=SUM({sq(rng).upper()}:{sq(rng).upper()})")
        else: ws.append(f"{sq(rng).upper()}+{sq(rng).upper()}")
    return ws[:W]


def s_go_gtp(rng):
    letters = "abcdefghjklmnopqrst"
    low = rng.random() < 0.5
    def pt():
        p = "%s%d" % (rng.choice(letters), rng.randrange(1, 20)); return p if low else p.upper()
    ws = []
    if rng.random() < 0.5:
        n = rng.randrange(1, 40)
        while len(ws) < W:
            ws.append(f"{n}."); ws.append(pt()); ws.append(pt()); n += 1
    else:
        while len(ws) < W: ws.append(rng.choice("BW")); ws.append(pt())
    return ws[:W]


def s_sgf(rng):
    ws = ["(;GM[1]", "FF[4]", "SZ[19]", "KM[6.5]"]
    while len(ws) < W:
        ws.append("%s[%s%s]" % (rng.choice("BW"), rng.choice("abcdefghijklmnopqrs"), rng.choice("abcdefghijklmnopqrs")))
    return ws[:W]


def s_domino(rng):
    ws = []
    while len(ws) < W:
        a, b = rng.randrange(0, 7), rng.randrange(0, 7); ws.append(f"{a}-{b}" if rng.random() < 0.6 else f"[{a}|{b}]")
        if rng.random() < 0.1: ws.append(rng.choice(["pass", "boneyard", "draw"]))
    return ws[:W]


def s_bridge(rng):
    ws = []
    for _ in range(rng.randrange(4, 9)): ws.append("%d%s" % (rng.randrange(1, 8), rng.choice(["C", "D", "H", "S", "NT"])))
    ws += ["P", "P", "P"]
    while len(ws) < W: ws.append(rng.choice("SHDC") + rng.choice("AKQJT98765432"))
    return ws[:W]


def hexdump_source(split):
    import subprocess
    raw = open(f"{ROOT}/raw/{RAW_BYTES[split]}", "rb").read()
    return raw[:3_000_000]


def s_hexdump_factory(split):
    raw = hexdump_source(split)
    def f(rng):
        a = rng.randrange(0, len(raw) - 4096) & ~15
        ws = []
        for i in range(0, 4096, 16):
            chunk = raw[a + i: a + i + 16]
            ws.append("%08x:" % (a + i)); ws += ["%02x" % b for b in chunk]
            ws.append("".join(chr(b) if 32 <= b < 127 and chr(b) not in " " else "." for b in chunk))
            if len(ws) >= W: break
        return ws[:W]
    return f


STRANGERS = {"battleship_lower": s_battleship_lower, "battleship_upper": s_battleship_upper, "sheet_lower": s_sheet_lower, "sheet_upper": s_sheet_upper,
             "go_gtp": s_go_gtp, "sgf": s_sgf, "domino": s_domino, "bridge": s_bridge}


def stranger_pool(split, kind, fn):
    rng = R(split, kind)
    return [{"id": f"{split}:{kind}:{i}", "kind": kind, "view": "window", "ws": fn(rng), "authored": True} for i in range(N_PER_KIND)]


def roster_prose_pool(split, games, prose):
    rng = R(split, "roster_prose"); out = []
    pw = [words(d["text"]) for d in prose if len(words(d["text"])) >= 60]
    while len(out) < N_PER_KIND:
        g = rng.choice(games); hdr = roster_lines(data.tag_dict(g["text"]))
        p = rng.choice(pw); a = rng.randrange(0, len(p) - 40)
        ws = ([w for l in hdr for w in l.split()] + p[a:a + 40])[:W]
        out.append({"id": f"{split}:roster_prose:{len(out)}", "kind": "roster_prose", "view": "head", "ws": ws, "authored": True})
    return out


def tags_garbled_pool(split, games, prose):
    rng = R(split, "tags_garbled"); out = []
    vocab = sorted({w for d in prose for w in re.findall(r"[A-Za-z]{4,}", d["text"])})
    pool_vals = []
    for g in games[:400]:
        t = data.tag_dict(g["text"]); pool_vals += [v for k, v in t.items() if k in ("Event", "Site", "White", "Black")]
    while len(out) < N_PER_KIND:
        ws = []
        while len(ws) < W:
            name = rng.choice(vocab).capitalize() + rng.choice(["", "Name", "Id", "Info", "X"])
            line = f'[{name} "{rng.choice(pool_vals)}"]'; ws += line.split()
        out.append({"id": f"{split}:tags_garbled:{len(out)}", "kind": "tags_garbled", "view": "head", "ws": ws[:W], "authored": True})
    return out


# ── near-miss injections ─────────────────────────────────────────────────────

def san_pool(split):
    games = [json.loads(l) for l in data.gz(f"{ROOT}/gold/{split}/gold.jsonl.gz")]
    out = []
    for g in games:
        if not g["valid"]: continue
        # token offsets are UTF-16: rebuild the SAN words by re-tokenising in python offsets
        out += [g["text"][s:e] for s, e, c, _ in data.tokenise(g["text"]) if c == "san"]
    return out


def carrier_windows(docs, rng, n, per_doc):
    out = []
    usable = [d for d in docs if len(words(d["text"])) >= W]
    rng.shuffle(usable)
    i = 0
    while len(out) < n and usable:
        d = usable[i % len(usable)]; i += 1
        w = words(d["text"]); a = rng.randrange(0, len(w) - W + 1); out.append((d, w[a:a + W]))
        if i > 50 * n: break
    return out


def injection_pool(split, kind, carriers, sans, k):
    rng = R(split, kind); out = []
    for i, (d, ws) in enumerate(carriers):
        ws = ws[:]
        for pos in rng.sample(range(len(ws)), k): ws[pos] = rng.choice(sans)
        out.append({"id": f"{split}:{kind}:{i}", "kind": kind, "view": "window", "ws": ws, "k": k, "carrier": d["id"], "authored": True})
    return out


# ── code pool enlargement ────────────────────────────────────────────────────

def code_extra(split):
    docs = []
    for repo in EXTRA_REPOS[split]:
        d = f"{CODE_DIR}/{repo}"
        if not os.path.isdir(d): continue
        for fn in sorted(os.listdir(d)):
            base = fn[:-4] if fn.endswith(".txt") else fn
            if os.path.splitext(base)[1] not in CODE_EXT: continue
            docs.append({"id": f"{split}:code:{repo}:{fn}", "lang": os.path.splitext(base)[1][1:], "text": open(f"{d}/{fn}", encoding="utf8", errors="replace").read()[:60000], "origin": f"{d}/{fn}", "repo": repo})
    base = f"{ROOT}/code_extra/{split}"
    if os.path.isdir(base):
        for pkg in sorted(os.listdir(base)):
            files = []
            for dp, _, fns in os.walk(f"{base}/{pkg}"):
                for fn in fns:
                    if os.path.splitext(fn)[1] in CODE_EXT: files.append(os.path.join(dp, fn))
            files.sort(key=lambda p: hashlib.sha1((SALT + p).encode()).hexdigest())
            for p in files[:MAX_PER_PACKAGE]:
                docs.append({"id": f"{split}:code:pypi:{pkg}:{os.path.relpath(p, base)}", "lang": os.path.splitext(p)[1][1:], "text": open(p, encoding="utf8", errors="replace").read()[:60000], "origin": p, "repo": f"pypi:{pkg}"})
    return docs


def main(split):
    assert split in ("dev", "test"), "dev and test only: train is never written"
    out_dir = f"{ROOT}/negatives/{split}"; os.makedirs(out_dir, exist_ok=True)
    games = load_games(split)
    prose = [json.loads(l) for l in open(f"{ROOT}/foreign/{split}/prose.jsonl")]
    code0 = [json.loads(l) for l in open(f"{ROOT}/foreign/{split}/code.jsonl")]
    extra = code_extra(split)
    with open(f"{ROOT}/foreign/{split}/code_extra.jsonl", "w") as f:
        for d in extra: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    code = code0 + extra
    sans = san_pool(split)
    pools = {}
    for kind in ENVELOPE: pools[kind] = envelope_pool(split, kind, games)
    for kind, fn in STRANGERS.items(): pools[kind] = stranger_pool(split, kind, fn)
    pools["hexdump_xxd"] = stranger_pool(split, "hexdump_xxd", s_hexdump_factory(split))
    pools["roster_prose"] = roster_prose_pool(split, games, prose)
    pools["tags_garbled"] = tags_garbled_pool(split, games, prose)
    for k in (1, 2, 4):
        pools[f"prose_san_k{k}"] = injection_pool(split, f"prose_san_k{k}", carrier_windows(prose, R(split, f"carrier_prose_{k}"), N_PER_KIND, 1), sans, k)
        pools[f"code_san_k{k}"] = injection_pool(split, f"code_san_k{k}", carrier_windows(code, R(split, f"carrier_code_{k}"), N_PER_KIND, 1), sans, k)
    for kind, rows in pools.items():
        with open(f"{out_dir}/{kind}.jsonl", "w") as f:
            for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    # survey: natural windows (no injection) that carry a SAN-shaped word (independent regex): the typed gap of a natural near-miss kind
    def survey(docs):
        win = hit = 0; files = len(docs)
        for d in docs:
            w = words(d["text"])
            for a in range(0, len(w) - W + 1, W):
                win += 1; hit += any(SAN_RE.match(x) for x in w[a:a + W])
        return {"files": files, "windows": win, "windows_with_a_san_shaped_word": hit}
    man = {"split": split, "authored_by_script": True, "salt": SALT, "W": W, "streams_per_kind": N_PER_KIND, "kinds": {k: len(v) for k, v in pools.items()},
           "views": {k: dict(collections.Counter(r["view"] for r in v)) for k, v in pools.items()},
           "code_pool": {"registered_files": len(code0), "extra_files": len(extra), "extra_repos": EXTRA_REPOS[split], "extra_pypi_packages_cap_per_package": MAX_PER_PACKAGE, "by_repo": dict(collections.Counter(d["repo"] for d in code))},
           "survey_natural_windows": {"prose": survey(prose), "code": survey(code)}, "san_vocabulary": {"tokens": len(sans), "types": len(set(sans))},
           "hexdump_source": RAW_BYTES[split]}
    json.dump(man, open(f"{out_dir}/manifest.json", "w"), indent=1)
    print(json.dumps({"split": split, "kinds": man["kinds"], "code_pool": man["code_pool"]["by_repo"], "survey": man["survey_natural_windows"]}, indent=1)[:3000])


if __name__ == "__main__":
    main(sys.argv[1])
