#!/usr/bin/env python3
"""build_priors.py — build the RECEIVED priors for the closed_codes adapter into khora/native/priors/.
Tables come from their named givers (standards; machine-extracted by parse_itu.py / extract_tables.py).
Every COUNT comes from the TRAIN split only (4 Gutenberg books); no dev/test sentence is read here.
Kinds written:
  notation-closed_codes-morse.json   ITU-R M.1677-1 table + timing ratios (giver) + char counts (TRAIN)
  notation-closed_codes-braille.json English Braille/UEB grade-1 cells+indicators (giver) + cell counts (TRAIN)
  notation-closed_codes-nato.json    ICAO spelling alphabet words+variants (giver) + letter/digit counts (TRAIN)
  notation-closed_codes-lm.json      letter n-gram counts, order<=4 within words (TRAIN)  [used for unspaced-code segmentation]
  notation-closed_codes-null.json    natural-English token counts (TRAIN)                 [the 'not a closed code' hypothesis]
"""
import json, re, os, glob, collections, datetime, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
ROOT = "/private/tmp/claude-501/notation/closed_codes"
OUT = "/Users/mlacy/Documents/3.0/khora/native/priors"
TODAY = "2026-10-06"
man = json.load(open(f"{ROOT}/manifest.json", encoding="utf-8"))
train_files = sorted(glob.glob(f"{ROOT}/corpus/train/*.txt"))
train_sources = [os.path.basename(f)[:-4] for f in train_files]
assert all(man["sources"][s]["split"] == "train" for s in train_sources) and len(train_sources) == 4
lines = []
for f in train_files:
    lines += [l.rstrip("\n") for l in open(f, encoding="utf-8")]
text_sha = hashlib.sha256("\n".join(lines).encode()).hexdigest()
TRAIN = {"sources": train_sources, "sentences": len(lines), "chars": sum(len(l) for l in lines), "text_sha256": text_sha}
itu = json.load(open(f"{ROOT}/gold/morse_itu_m1677_1.json", encoding="utf-8"))
bt = json.load(open(f"{ROOT}/gold/braille_ueb_g1.json", encoding="utf-8"))
nato = json.load(open(f"{ROOT}/gold/nato_icao.json", encoding="utf-8"))
aud = json.load(open(f"{ROOT}/gold/audit_tables.json", encoding="utf-8"))
def hdr(kind, giver):
    return {"schema": "NotationPrior@1", "family": "closed_codes", "kind": kind, "giver": giver, "built": TODAY,
            "train": TRAIN, "rule": "priors REFUSE or NOMINATE, never admit: a unit absent from the table is a typed gap, never a guess"}
# ── MORSE ──────────────────────────────────────────────────────────────────
signals = []
for ch, sig in itu["letters"].items(): signals.append({"char": ch, "signal": sig, "class": "letter"})
for ch, sig in itu["figures"].items(): signals.append({"char": ch, "signal": sig, "class": "figure"})
for s in itu["signs"]:
    g = s["glyph"]
    if s["name"].startswith("Error"): signals.append({"char": "<ERR>", "signal": s["signal"], "class": "signal", "name": "error"})
    elif s["name"].startswith("Understood"): signals.append({"char": "<VE>", "signal": s["signal"], "class": "signal", "name": "understood"})
    elif s["name"].startswith("Invitation"): signals.append({"char": "<K>", "signal": s["signal"], "class": "signal", "name": "invitation_to_transmit"})
    elif s["name"] == "Wait": signals.append({"char": "<AS>", "signal": s["signal"], "class": "signal", "name": "wait"})
    elif s["name"].startswith("End of work"): signals.append({"char": "<SK>", "signal": s["signal"], "class": "signal", "name": "end_of_work"})
    elif s["name"].startswith("Starting"): signals.append({"char": "<KA>", "signal": s["signal"], "class": "signal", "name": "starting_signal"})
    elif s["name"].startswith("Multiplication"): signals.append({"char": "×", "signal": s["signal"], "class": "punctuation", "name": "multiplication_sign", "alias_of": "X"})
    else:
        ch = g.replace("’", "'").replace("–", "-")
        if s["name"].startswith("Inverted commas"): ch = '"'
        signals.append({"char": ch, "signal": s["signal"], "class": "punctuation", "name": s["name"].split("(")[0].strip()})
# accented e is a table entry too; the TRAIN/dev/test plaintext is accent-folded so it is never produced (typed, not measured)
signals.append({"char": "é", "signal": itu["accented"]["é"], "class": "letter", "name": "accented_e"})
# timing ratios parsed from ITU s2 (words -> numbers), asserted
itu_txt = open(f"{ROOT}/raw/itu.txt", encoding="utf-8").read()
W2N = {"one": 1, "three": 3, "seven": 7}
tm = {
 "dash": W2N[re.search(r"A dash is equal to (\w+) dots", itu_txt).group(1)],
 "intra_letter_gap": W2N[re.search(r"space between the signals forming the same letter is equal to (\w+) dot", itu_txt).group(1)],
 "letter_gap": W2N[re.search(r"space between two letters is equal to (\w+) dots", itu_txt).group(1)],
 "word_gap": W2N[re.search(r"space between two words is equal to (\w+) dots", itu_txt).group(1)],
 "dot": 1,
}
assert (tm["dash"], tm["intra_letter_gap"], tm["letter_gap"], tm["word_gap"]) == (3, 1, 3, 7), tm
# counts: character frequency over TRAIN plaintext, upper-cased (Morse has no case), restricted to chars the table carries
cc = collections.Counter()
for l in lines:
    for c in l.upper(): cc[c] += 1
table_chars = {s["char"] for s in signals}
morse_counts = {c: cc[c] for c in sorted(table_chars) if c in cc and len(c) == 1}
space_n = cc[" "]
morse = hdr("morse-table", {"name": "ITU-R M.1677-1 (10/2009) International Morse code", "url": itu["url"], "section": "Annex 1 Part I s1.1 (signals), s2 (spacing)",
    "licence_note": "ITU copyright, free download; the signal table is facts; PDF is NOT redistributed; only the table is transcribed by scripts/parse_itu.py",
    "audit": {"morse3_MIT": [aud["morse"]["morse3"]["compared"], aud["morse"]["morse3"]["agree"]], "morsepy_MIT": [aud["morse"]["morsepy"]["compared"], aud["morse"]["morsepy"]["agree"]]}})
morse.update({"signals": signals, "timing_ratios": tm,
              "refuses": {"signals_not_in_giver": ["-.-.-- (!)", "-.-.-. (;)", "..--.- (_)", "accents other than e"], "note": "oracle packages carry these; ITU M.1677-1 does not: refused"},
              "counts": {"from": "TRAIN", "char_counts": morse_counts, "space_count": space_n, "n_chars": sum(cc.values())}})
json.dump(morse, open(f"{OUT}/notation-closed_codes-morse.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# ── BRAILLE ────────────────────────────────────────────────────────────────
cells = []
for k, v in bt["letters"].items(): cells.append({"cell": v, "role": "letter", "value": k})
for k, v in bt["digits"].items(): cells.append({"cell": v, "role": "digit_in_numeric_mode", "value": k})   # a-j cells double as digits after the numeric indicator
cell_counts = collections.Counter()
for l in lines:
    i = 0; numeric = False; allcap_prev = False
    words = l.split(" ")
    for w in words:
        letters = [c for c in w if c.isalpha()]
        capword = len(letters) >= 2 and all(c.isupper() for c in letters)
        numeric = False; cap_emitted = False
        for j, c in enumerate(w):
            if c.isdigit():
                if not numeric: cell_counts[bt["indicators"]["numeric"]] += 1; numeric = True
                cell_counts[bt["digits"][c]] += 1
            elif c.isalpha():
                if numeric and c.lower() in "abcdefghij": cell_counts[bt["indicators"]["grade1_letter"]] += 1
                numeric = False
                if c.isupper():
                    if capword:
                        if not cap_emitted: cell_counts[bt["indicators"]["capital"]] += 2; cap_emitted = True
                    else: cell_counts[bt["indicators"]["capital"]] += 1
                cell_counts[bt["letters"][c.lower()]] += 1
            else:
                if numeric and c in ".," and j + 1 < len(w) and w[j + 1].isdigit():
                    cell_counts[bt["punct_cells"][c][0]] += 1; continue
                numeric = False
                if c in bt["punct_cells"]:
                    for x in bt["punct_cells"][c]: cell_counts[x] += 1
                elif c == "(": [cell_counts.update([x]) for x in bt["ueb_multi"]["("]]
                elif c == ")": [cell_counts.update([x]) for x in bt["ueb_multi"][")"]]
                elif c == '"':
                    for x in bt["ueb_multi"]["“" if j == 0 else "”"]: cell_counts[x] += 1
        cell_counts["⠀"] += 1       # the word space
braille = hdr("braille-table", {"name": "English Braille / Unified English Braille grade-1 (uncontracted) cells, indicators and punctuation", "url": bt["url"],
    "cell_identity_giver": "Unicode Character Database names BRAILLE PATTERN DOTS-xxxx (python unicodedata)", "licence_note": "en.wikipedia tables CC BY-SA 4.0 (attribution in PROVENANCE.md); cites BANA EBAE 2002 / ICEB UEB 2013",
    "audit": {"pybraille_MIT": {"letters": [26, 26], "digits": [10, 10], "disagreements": ["semicolon (oracle error)", "parentheses (oracle is EBAE one-cell, giver UEB two-cell)"]}}})
braille.update({"letters": bt["letters"], "digits": bt["digits"], "indicators": bt["indicators"], "punct_cells": bt["punct_cells"],
    "punct_multi_cell": {"(": bt["ueb_multi"]["("], ")": bt["ueb_multi"][")"], "quote_open": bt["ueb_multi"]["“"], "quote_close": bt["ueb_multi"]["”"]},
    "space_cells": ["⠀", " "],
    "rules": {"numeric_mode": "numeric indicator opens numeric mode; letter cells a-j read as digits 1-9,0; ',' and '.' continue it only when a digit cell follows; any other cell or a space ends it",
              "grade1_letter_after_number": "a letter a-j directly after a number needs the grade-1 letter indicator",
              "capital": "one capital indicator before the letter; two before a word of >=2 letters that is all capitals",
              "scope": "grade-1 (uncontracted) text; contractions, formatting indicators beyond capitals/numeric, Nemeth, music and IPA braille are NOT in this prior (typed gaps)"},
    "counts": {"from": "TRAIN", "cell_counts": dict(sorted(cell_counts.items())), "n_cells": sum(cell_counts.values())}})
json.dump(braille, open(f"{OUT}/notation-closed_codes-braille.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# ── NATO ───────────────────────────────────────────────────────────────────
alnum = collections.Counter()
for l in lines:
    for c in l.upper():
        if c.isalnum() and c.isascii(): alnum[c] += 1
natoj = hdr("spelling-table", {"name": "ICAO radiotelephony spelling alphabet (ICAO Annex 10 Vol II), ITU/IMO digit words", "url": nato["url"], "licence_note": nato["giver"]})
natoj.update({"letters": nato["letters"], "letter_variants": nato["letter_variants"], "digits": nato["digits"], "digit_variants": nato["digit_variants"],
              "digits_itu_imo": nato["digits_itu_imo"], "counts": {"from": "TRAIN", "char_counts": dict(sorted(alnum.items())), "n_chars": sum(alnum.values())}})
json.dump(natoj, open(f"{OUT}/notation-closed_codes-nato.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# ── LM (letter n-gram within words, TRAIN) ────────────────────────────────
ORDER = 4   # history length 3
sigma = sorted({c for l in lines for c in l.upper() if c != " "})
ctx = collections.defaultdict(collections.Counter)
for l in lines:
    for w in l.upper().split(" "):
        if not w: continue
        seq = ["^"] * (ORDER - 1) + list(w) + ["$"]
        for i in range(ORDER - 1, len(seq)):
            nxt = seq[i]
            for h in range(0, ORDER):          # history lengths 0..3
                key = "".join(seq[i - h:i]) if h else ""
                ctx[key][nxt] += 1
lm = hdr("letter-ngram", {"name": "TRAIN English letter n-gram (within-word, word-boundary aware)", "url": None, "licence_note": "derived from the 4 TRAIN Gutenberg books (US public domain)"})
lm.update({"order": ORDER, "alphabet": sigma, "start": "^", "end": "$",
           "contexts": {k: dict(sorted(v.items())) for k, v in sorted(ctx.items())}})
json.dump(lm, open(f"{OUT}/notation-closed_codes-lm.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
# ── NULL (natural-English token model, TRAIN) ──────────────────────────────
tok = collections.Counter()
for l in lines:
    for w in l.lower().split(" "):
        if w: tok[w] += 1
N = sum(tok.values()); n1 = sum(1 for v in tok.values() if v == 1)
nul = hdr("natural-null", {"name": "TRAIN English raw-token counts (case-folded, punctuation attached), Good-Turing unseen mass from hapax count", "url": None, "licence_note": "derived from the 4 TRAIN Gutenberg books (US public domain)"})
nul.update({"n_tokens": N, "types": len(tok), "hapax": n1, "tokens": {k: v for k, v in sorted(tok.items()) if v >= 2}})
json.dump(nul, open(f"{OUT}/notation-closed_codes-null.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps({"train": TRAIN, "morse_chars": len(morse_counts), "braille_cells": len(cell_counts), "lm_contexts": len(ctx), "null_tokens": N, "null_types": len(tok), "hapax": n1}, indent=1))
for f in sorted(glob.glob(f"{OUT}/notation-closed_codes-*.json")): print(os.path.basename(f), os.path.getsize(f))
