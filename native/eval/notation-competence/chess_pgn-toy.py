#!/usr/bin/env python3
"""eval/notation-competence/chess_pgn-toy.py — writes chess_pgn-toy.json, the TOY FIXTURE of tests/notation-chess_pgn.test.js.

AUTHORED, NOT NATURAL: the games below were written by the agent that built this instrument (a model) to exercise every rule once (castling both
ways, en passant, promotion by capture, file disambiguation, check, mate, an illegal move, a comment that quotes a SAN-looking move). They are
labelled `authored` in the fixture and are never presented as held-out natural data. The gold for them is produced by the same python-chess oracle
and the same gold functions as the real corpora (chess_pgn-data.py), so the toy exercises the instrument exactly as the real data does.

  /private/tmp/claude-501/venv/bin/python chess_pgn-toy.py
"""
import importlib.util, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("chess_pgn_data", os.path.join(HERE, "chess_pgn-data.py"))
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)

HEAD = '[Event "Toy {n}{ev}"]\n[Site "{site}"]\n[Date "2026.10.06"]\n[Round "-"]\n[White "{w}"]\n[Black "{b}"]\n[Result "{r}"]\n\n'

GAMES = [
    # 1 Legal's mate: captures, check, mate
    ("1-0", "1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0"),
    # 2 en passant, both castlings, file disambiguation (Nbd2), comments with clock tags and a SAN-looking word inside a comment
    ("1/2-1/2", "1. e4 d5 { Re8 was best. [%clk 0:01:00] } 2. exd5 c5 3. dxc6 Nf6 4. Nf3 e5 5. Bc4 Be7 6. O-O O-O 7. d4 Nc6 8. Nbd2 Nd7 9. Qe2 Bf6 1/2-1/2"),
    ("0-1", "1. d4 Nf6 2. Nc3 d5 3. Bf4 e6 4. Qd2 Be7 5. O-O-O O-O 6. e3 c5 7. Nf3 Nc6 8. Kb1 b5 9. dxc5 Bxc5 0-1"),
    # 3 promotion by capture
    ("*", "1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. a7 Nf6 5. axb8=Q Rxb8 6. h4 h5 7. g4 hxg4 *"),
    # 4 an illegal move (the king walks two squares): the oracle stops at ply 3
    ("*", "1. e4 e5 2. Ke3 Nc6 3. Ke4 *"),
    # 5 a plain short game with a glyph
    ("1-0", "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8?! 10. d4 Nbd7 1-0"),
    # 6 non-ASCII and astral-plane (UTF-16 surrogate pair) characters in the tags: the oracle counts code points, JavaScript counts UTF-16 units
    ("*", "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 *"),
]

out = {"authored": True, "note": "model-authored toy fixture; labelled authored; never natural held-out data", "games": [], "reps": [], "perturb": []}
for i, (res, mt) in enumerate(GAMES, 1):
    names = [("Ada", "Babbage", "", "authored"), ("Lovelace", "Turing", " round robin", "the Analytical Engine"), ("Hopper", "Knuth", " blitz", "Mem"), ("Dijkstra", "Wirth", "", "ETH Zurich lab"), ("Church", "Goedel", " finals", "IAS"), ("Boole", "De Morgan", " open", "Cork"), ("Ada \U0001F642 L\u00f8velace", "\u00c9variste", " \u2654 cup", "Z\u00fcrich")][i - 1]
    text = HEAD.format(n=i, r=res, w=names[0], b=names[1], ev=names[2], site=names[3]) + mt
    g = data.gold_game({"id": f"toy:{i}", "source": "authored", "text": text})
    out["games"].append(g)
    if g["valid"]:
        reps = {}
        for style in ["en", "uci", "long", "fan", "tight", "de", "fr", "es", "hu", "pl"]:
            t, spans = data.render(g["plies"], style, res)
            reps[style] = {"text": t, "spans": [{"s": s, "e": e, "cls": c} for s, e, c in spans]}
        out["reps"].append({"id": g["id"], "plies": g["plies"], "final_placement": g["final_placement"], "reps": reps})
# oracle-labelled perturbations of game 1 (swap, drop, replace) for the legality item
base = out["games"][0]
sans = [t for t in data.tokenise(base["text"]) if t[2] == "san"]
def mutate(kind):
    text = base["text"]
    if kind == "swap":
        (s1, e1, _, _), (s2, e2, _, _) = sans[3], sans[4]
        return text[:s1] + text[s2:e2] + text[e1:s2] + text[s1:e1] + text[e2:]
    if kind == "drop":
        s1, e1, _, _ = sans[5]
        return text[:s1] + text[e1:]
    s1, e1, _, _ = sans[6]
    return text[:s1] + "Qh5" + text[e1:]
for kind in ["swap", "drop", "replace"]:
    t = mutate(kind)
    s = [re_ for re_ in data.tokenise(t) if re_[2] == "san"]
    import re
    plies, board, bad, err = data.replay([re.sub(r"[+#]+$", "", t[a:b]) for a, b, c, _ in s])
    out["perturb"].append({"id": f"toy:1#{kind}", "kind": kind, "text": t, "first_unresolved_ply": bad, "error": err})

json.dump(out, open(os.path.join(HERE, "chess_pgn-toy.json"), "w"), ensure_ascii=False, indent=0)
print("games", len(out["games"]), "valid", sum(g["valid"] for g in out["games"]), "reps", len(out["reps"]), "perturb", [(p["kind"], p["first_unresolved_ply"]) for p in out["perturb"]])
