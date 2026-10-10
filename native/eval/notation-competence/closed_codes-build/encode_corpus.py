#!/usr/bin/env python3
"""encode_corpus.py — the GOLD side. Plaintext units -> encoded forms, with the truth of every token.
INDEPENDENT of the adapter: this file never imports or reads the JS adapter or the priors/ files; it reads the
machine-extracted giver tables in gold/ (parse_itu.py, extract_tables.py). Every form is DERIVED (an encoder
applied to public-domain text) and every noise/jitter/decoy transform is AUTHORED; nothing here is natural data
except the plaintext. Forms (per unit):
  morse_spaced   letters ' ', words ' / '                       (ITU signals; text convention authored)
  morse_ws       letters ' ', words 3 spaces
  morse_unspaced signals of a word run together; words ' / '    (segmentation needs a language prior)
  keylog_s{0,15,30}  key-down '+ms' / key-up '-ms' durations at ITU ratios 1:3 / 1:3:7, lognormal jitter sigma 0 / .15 / .30,
                     per-stream tempo T0 log-uniform 40..120 ms, slow drift (sigma>0)
  morse_spaced_noisy  5% of signal tokens corrupted by one symbol edit (flip/delete/insert)
  braille        UEB grade-1 Unicode cells; word space is U+2800 for even and U+0020 for odd unit index (both are 'space')
  braille_noisy  3% of letter cells outside numbers replaced by a cell the table does not assign
  nato           ICAO words for letters+digits (alnum projection), words ' / ' , 15% variant spellings
  nato_concat    the same, each word's NATO words concatenated without spaces
  nato_noisy     5% of NATO words corrupted into out-of-lexicon strings
Gold per form: tokens with start/end offsets, class, value."""
import json, math, random, os, sys, re, hashlib
ROOT = "/private/tmp/claude-501/notation/closed_codes"
SEED = 20261006
itu = json.load(open(f"{ROOT}/gold/morse_itu_m1677_1.json", encoding="utf-8"))
bt = json.load(open(f"{ROOT}/gold/braille_ueb_g1.json", encoding="utf-8"))
nato = json.load(open(f"{ROOT}/gold/nato_icao.json", encoding="utf-8"))
def rng(*parts): return random.Random(":".join(str(p) for p in (SEED,) + parts))
# ── Morse table (gold) ──
M = {}   # char -> (signal, class)
for c, s in itu["letters"].items(): M[c] = (s, "letter")
for c, s in itu["figures"].items(): M[c] = (s, "figure")
for sg in itu["signs"]:
    g = sg["glyph"]
    if not g or sg["name"].startswith("Multiplication"): continue
    ch = '"' if sg["name"].startswith("Inverted") else g.replace("’", "'").replace("–", "-")
    if len(ch) == 1: M[ch] = (sg["signal"], "punctuation")
SIGCLASS = {}   # observed signal string -> class (for noisy tokens), prosigns included
for c, (s, k) in M.items(): SIGCLASS.setdefault(s, k)
for sg in itu["signs"]:
    if not sg["glyph"]: SIGCLASS.setdefault(sg["signal"], "signal")
SIGCLASS.setdefault(itu["accented"]["é"], "letter")
def sigclass(sig): return SIGCLASS.get(sig, "unassigned")
def words_of(p): return p.split(" ")
# ── Morse forms ──
def morse_spaced(p, wordgap=" / "):
    toks = []; out = []; pos = 0
    for wi, w in enumerate(words_of(p)):
        if wi:
            out.append(wordgap)
            a = wordgap.index("/") if "/" in wordgap else 0
            b = a + 1 if "/" in wordgap else len(wordgap)
            toks.append({"s": pos + a, "e": pos + b, "cls": "wordgap", "value": " "}); pos += len(wordgap)
        for ci, ch in enumerate(w):
            sig, k = M[ch.upper()]
            if ci: out.append(" "); pos += 1
            toks.append({"s": pos, "e": pos + len(sig), "cls": k, "value": ch.upper(), "signal": sig})
            out.append(sig); pos += len(sig)
    return "".join(out), toks
def morse_unspaced(p):
    out = []; words = []
    for wi, w in enumerate(words_of(p)):
        sigs = [M[ch.upper()][0] for ch in w]
        words.append({"word": w.upper(), "letters": [ch.upper() for ch in w], "sigs": sigs})
    s = " / ".join("".join(x["sigs"]) for x in words)
    return s, words
def corrupt_signal(sig, r):
    op = r.choice(["flip", "delete", "insert"])
    if op == "delete" and len(sig) == 1: op = "flip"
    i = r.randrange(len(sig))
    if op == "flip": return sig[:i] + ("-" if sig[i] == "." else ".") + sig[i + 1:]
    if op == "delete": return sig[:i] + sig[i + 1:]
    return sig[:i] + r.choice(".-") + sig[i:]
def morse_noisy(p, r, rho=0.05):
    toks = []; out = []; pos = 0
    for wi, w in enumerate(words_of(p)):
        if wi:
            out.append(" / "); toks.append({"s": pos + 1, "e": pos + 2, "cls": "wordgap", "value": " "}); pos += 3
        for ci, ch in enumerate(w):
            sig, k = M[ch.upper()]
            changed = r.random() < rho
            obs = corrupt_signal(sig, r) if changed else sig
            if ci: out.append(" "); pos += 1
            toks.append({"s": pos, "e": pos + len(obs), "cls": sigclass(obs), "value": ch.upper(), "signal": obs, "corrupted": changed})
            out.append(obs); pos += len(obs)
    return "".join(out), toks
# ── keylog (ITU 2.1-2.4 ratios) ──
def keylog(p, r, sigma):
    T = math.exp(r.uniform(math.log(40), math.log(120)))
    drift = 0.0
    def dur(ratio):
        nonlocal drift
        if sigma > 0:
            drift += r.gauss(0, 0.005)
            z = max(-2.5, min(2.5, r.gauss(0, 1)))
            return max(1, int(round(ratio * T * math.exp(drift + sigma * z))))
        return max(1, int(round(ratio * T)))
    runs = []   # (sign, ms, cls, char_index)
    chars = [(wi, ch) for wi, w in enumerate(words_of(p)) for ch in w]
    # build element list with gap classes
    elems = []
    wl = words_of(p); ci = 0
    for wi, w in enumerate(wl):
        for li, ch in enumerate(w):
            sig = M[ch.upper()][0]
            for ei, sym in enumerate(sig):
                elems.append(("+", "dit" if sym == "." else "dah", 1 if sym == "." else 3))
                if ei < len(sig) - 1: elems.append(("-", "intra", 1))
            if li < len(w) - 1: elems.append(("-", "letter", 3))
        if wi < len(wl) - 1: elems.append(("-", "word", 7))
    toks = []; parts = []
    for sign, cls, ratio in elems:
        ms = dur(ratio)
        parts.append(f"{sign}{ms}"); toks.append({"sign": sign, "ms": ms, "cls": cls})
    return " ".join(parts), toks, round(T, 2)
# ── Braille (UEB grade 1) ──
LET, DIG, IND, PU, PM = bt["letters"], bt["digits"], bt["indicators"], bt["punct_cells"], bt["ueb_multi"]
def braille(p, blank):
    cells = []      # {cell, role, lexeme_start}
    pending = []    # indicator cells bind FORWARD to the next core cell: one lexeme
    def core(cell, role):
        seq = pending[:] + [(cell, role)]
        pending.clear()
        for i, (c, r_) in enumerate(seq): cells.append({"cell": c, "role": r_, "lexeme_start": i == 0})
    for wi, w in enumerate(words_of(p)):
        if wi: core(blank, "space")
        letters = [c for c in w if c.isalpha()]
        capword = len(letters) >= 2 and all(c.isupper() for c in letters)
        numeric = False; cap_done = False
        for j, c in enumerate(w):
            if c.isdigit():
                if not numeric: pending.append((IND["numeric"], "numeric_indicator")); numeric = True
                core(DIG[c], "digit")
            elif c.isalpha():
                if numeric and c.lower() in "abcdefghij": pending.append((IND["grade1_letter"], "grade1_indicator"))
                numeric = False
                if c.isupper():
                    if capword:
                        if not cap_done: pending.extend([(IND["capital"], "capital_indicator")] * 2); cap_done = True
                    else: pending.append((IND["capital"], "capital_indicator"))
                core(LET[c.lower()], "letter")
            else:
                if numeric and c in ".," and j + 1 < len(w) and w[j + 1].isdigit():
                    core(PU[c][0], "punctuation_in_number"); continue
                numeric = False
                if c == "(": seq = PM["("]
                elif c == ")": seq = PM[")"]
                elif c == '"':
                    prev = w[j - 1] if j else None
                    seq = PM["\u201c"] if (prev is None or prev in "(-") else PM["\u201d"]
                else: seq = PU[c]
                for i, cell in enumerate(seq): cells.append({"cell": cell, "role": "punctuation", "lexeme_start": i == 0})
    assert not pending
    s = "".join(c["cell"] for c in cells)
    return s, [{"s": i, "e": i + 1, "role": c["role"], "lexeme_start": c["lexeme_start"]} for i, c in enumerate(cells)]
def braille_gold_plain(p):
    """what a correct reader returns: the plaintext with the open/close quote fold (curly -> straight is by the instrument)"""
    return p
UNASSIGNED_CELLS = [chr(0x2800 + i) for i in range(1, 256)]
assigned = set(LET.values()) | set(DIG.values()) | set(IND.values()) | {c for v in PU.values() for c in v} | {c for v in PM.values() for c in v}
UNASSIGNED_CELLS = [c for c in UNASSIGNED_CELLS if c not in assigned]
def braille_noisy(p, blank, r, rho=0.03):
    s, toks = braille(p, blank)
    cells = list(s); n_changed = 0
    for t in toks:
        if t["role"] == "letter" and not (t["s"] > 0 and toks[t["s"] - 1]["role"] in ("numeric_indicator", "digit", "punctuation_in_number", "grade1_indicator")):
            if r.random() < rho:
                cells[t["s"]] = r.choice(UNASSIGNED_CELLS); t["role"] = "unassigned"; t["corrupted"] = True; n_changed += 1
    return "".join(cells), toks
# ── NATO ──
def nato_forms(p, r, concat=False, noisy=False, rho=0.05):
    lex = set()
    for d in (nato["letters"], nato["digits"], nato["digits_itu_imo"]): lex |= {v.upper() for v in d.values()}
    for d in (nato["letter_variants"], nato["digit_variants"]):
        for v in d.values(): lex |= {x.upper() for x in v}
    out_words = []; toks = []; pos = 0
    first_word = True
    for wi, w in enumerate(words_of(p)):
        chars = [c.upper() for c in w if c.isalnum() and c.isascii()]
        if not chars: continue
        ws = []
        for c in chars:
            if c.isalpha():
                name = nato["letters"][c]
                if c in nato["letter_variants"] and r.random() < 0.15: name = r.choice(nato["letter_variants"][c])
            else:
                name = nato["digits"][c]
                if c in nato["digit_variants"] and r.random() < 0.15: name = r.choice(nato["digit_variants"][c])
                elif r.random() < 0.05: name = nato["digits_itu_imo"][c]
            ws.append((c, name))
        wtoks = []
        for c, name in ws:
            obs = name; cls = "letter" if c.isalpha() else "digit"; corrupted = False
            if noisy and r.random() < rho:
                for _ in range(20):
                    i = r.randrange(len(name)); cand = name[:i] + r.choice("abcdefghijklmnopqrstuvwxyz") + name[i + 1:]
                    if cand.upper() not in lex: obs = cand; cls = "unassigned"; corrupted = True; break
            wtoks.append((c, obs, cls, corrupted))
        sep_in = "" if concat else " "
        text_w = sep_in.join(o for _, o, _, _ in wtoks)
        if not first_word: out_words.append(" / "); toks.append({"s": pos + 1, "e": pos + 2, "cls": "wordgap", "value": " "}); pos += 3
        first_word = False
        for k, (c, o, cls, cor) in enumerate(wtoks):
            if k and not concat: pos += 1
            toks.append({"s": pos, "e": pos + len(o), "cls": cls, "value": c, "word": o, "corrupted": cor}); pos += len(o)
        out_words.append(text_w)
    return "".join(out_words), toks
def nato_alnum(p): return " ".join("".join(c.upper() for c in w if c.isalnum() and c.isascii()) for w in words_of(p) if any(c.isalnum() and c.isascii() for c in w))
# ── decoys (AUTHORED / transformed; label = what the stream is NOT) ──
def decoys(units, split, r, per=40):
    out = []
    texts = [u["text"] for u in units]
    def add(kind, text, note): out.append({"id": f"decoy:{split}:{kind}:{len(out)}", "kind": kind, "text": text, "authored": True, "note": note})
    for _ in range(per): add("prose", r.choice(texts), "plain English from the same split's sources (natural)")
    for _ in range(per):
        w = r.choice(texts).split(" ")
        o = []
        for x in w:
            o.append(x)
            if r.random() < 0.3: o.append(r.choice(["...", "--", "- -", ". . ."]))
        add("prose_ellipsis_dash", " ".join(o), "real sentence with inserted ellipsis/dash tokens (authored transform)")
    for _ in range(per):
        ch = r.choice("-=*._#~+")
        n = r.randint(3, 6)
        add("rules", " ".join(ch * r.randint(12, 40) for _ in range(n)), "long rule lines: every token longer than any Morse signal")
    for _ in range(per):
        n = r.randint(8, 30)
        add("noise_dotdash", " ".join("".join(r.choice(".-") for _ in range(r.randint(1, 8))) for _ in range(n)), "uniform random dot/dash tokens, length 1..8 (max-entropy decoy)")
    for _ in range(per):
        t = r.choice(texts)
        add("binary", " ".join(format(b, "08b") for b in t.encode()[:24]), "ASCII bytes as bit strings")
    for _ in range(per):
        t = r.choice(texts)
        add("hex", " ".join(format(b, "02x") for b in t.encode()[:30]), "ASCII bytes as hex")
    for _ in range(per):
        add("dna", " ".join("".join(r.choice("ACGT") for _ in range(3)) for _ in range(r.randint(8, 30))), "random codon-like triplets")
    for _ in range(per):
        add("unicode_pattern", "".join(r.choice("■□▒▓│─┌┐└┘•●") if r.random() > 0.2 else " " for _ in range(r.randint(20, 80))), "box-drawing / block / bullet glyphs (not Braille)")
    for _ in range(per):
        # letter strings that look like NATO spellings but are not in the lexicon (random pseudo-words of the lexicon's length range)
        n = r.randint(8, 25)
        add("pseudo_nato", " ".join("".join(r.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(r.randint(3, 8))).capitalize() for _ in range(n)), "random capitalised pseudo-words (out of lexicon)")
    return out
# ── build ──
def build(split):
    units = [json.loads(l) for l in open(f"{ROOT}/corpus/units/{split}.jsonl", encoding="utf-8")]
    recs = []
    for k, u in enumerate(units):
        p = u["text"]; uid = u["id"]
        blank = "⠀" if k % 2 == 0 else " "
        rec = {"id": uid, "source": u["source"], "split": split, "text": p, "alnum": nato_alnum(p), "forms": {}, "truth": {}}
        s, toks = morse_spaced(p); rec["forms"]["morse_spaced"] = s; rec["truth"]["morse_spaced"] = toks
        s, toks = morse_spaced(p, wordgap="   "); rec["forms"]["morse_ws"] = s; rec["truth"]["morse_ws"] = toks
        s, words = morse_unspaced(p); rec["forms"]["morse_unspaced"] = s; rec["truth"]["morse_unspaced"] = words
        s, toks = morse_noisy(p, rng(uid, "mn")); rec["forms"]["morse_spaced_noisy"] = s; rec["truth"]["morse_spaced_noisy"] = toks
        for sg, name in ((0.0, "keylog_s0"), (0.15, "keylog_s15"), (0.30, "keylog_s30")):
            s, toks, T = keylog(p, rng(uid, name), sg); rec["forms"][name] = s; rec["truth"][name] = {"tokens": toks, "T0_ms": T, "sigma": sg}
        s, toks = braille(p, blank); rec["forms"]["braille"] = s; rec["truth"]["braille"] = toks
        s, toks = braille_noisy(p, blank, rng(uid, "bn")); rec["forms"]["braille_noisy"] = s; rec["truth"]["braille_noisy"] = toks
        s, toks = nato_forms(p, rng(uid, "n")); rec["forms"]["nato"] = s; rec["truth"]["nato"] = toks
        s, toks = nato_forms(p, rng(uid, "n"), concat=True); rec["forms"]["nato_concat"] = s; rec["truth"]["nato_concat"] = toks
        s, toks = nato_forms(p, rng(uid, "nn"), noisy=True); rec["forms"]["nato_noisy"] = s; rec["truth"]["nato_noisy"] = toks
        recs.append(rec)
    dec = decoys(units, split, rng(split, "decoys"))
    with open(f"{ROOT}/corpus/{split}.jsonl", "w", encoding="utf-8") as f:
        for r_ in recs: f.write(json.dumps(r_, ensure_ascii=False) + "\n")
    with open(f"{ROOT}/corpus/{split}-decoys.jsonl", "w", encoding="utf-8") as f:
        for d in dec: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    return recs, dec
if __name__ == "__main__":
    for split in sys.argv[1:] or ["dev", "test"]:
        recs, dec = build(split)
        print(split, len(recs), "units", len(dec), "decoys", os.path.getsize(f"{ROOT}/corpus/{split}.jsonl"), "bytes")
