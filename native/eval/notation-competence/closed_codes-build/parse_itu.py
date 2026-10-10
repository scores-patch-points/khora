#!/usr/bin/env python3
"""parse_itu.py — extract the Morse signal table from ITU-R M.1677-1 by machine, so the giver table is read off the
authority and not typed by the author.

Input : `pdftotext -layout` of the official PDF (https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1677-1-200910-I!!PDF-E.pdf),
        saved as raw/itu.txt. The PDF is (c) ITU, free download, NOT redistributed; only the signal table (facts) is transcribed.
Output: gold/morse_itu_m1677_1.json  {letters, accented, figures, signs:[{name, glyph, signal}]}
Layout facts used (checked against the PDF text, then asserted below):
  1.1.1 letters   rows of up to 3 columns 'a .-  i ..  r .-.'; one accented-e row ('accented e ..-..')
  1.1.2 figures   rows '1 .----  6 -....'
  1.1.3 signs     'Name ........ [glyph] signal' (a long name wraps onto a second line)
The PDF renders dash as U+2212 or en dash and sometimes puts spaces inside a signal ('... --', '.- - .- .'); every
dash variant becomes '-' and whitespace inside a signal is deleted. Known artifact kept as extracted: the footnote
mark on 'Commercial at1' stays in the name string (the signal and glyph are right)."""
import re, json
ROOT = "/private/tmp/claude-501/notation/closed_codes"
SRC = f"{ROOT}/raw/itu.txt"
OUT = f"{ROOT}/gold/morse_itu_m1677_1.json"
txt = open(SRC, encoding="utf-8").read()
DASH = "−–‒—‐‑"
SIGCH = r"[.−–\-]"
def norm(sig):
    return re.sub(r"\s+", "", re.sub("[" + DASH + "]", "-", sig))
def block(start, end):
    a = txt.index(start); b = txt.index(end, a)
    return txt[a:b]
letters_blk = block("1.1.1   Letters", "1.1.2   Figures")
figs_blk = block("1.1.2   Figures", "Rec. ITU-R M.1677-1")
punct_blk = block("1.1.3    Punctuation", "2        Spacing")
letters, accented = {}, {}
for line in letters_blk.splitlines():
    s = line.strip()
    if not s or s.startswith("1.1") or s.startswith("Rec."): continue
    toks = re.sub(r"^accented\s+", "ACC ", s).split()
    i = 0
    while i < len(toks):
        acc = toks[i] == "ACC"
        if acc: i += 1
        if i + 1 < len(toks) and re.fullmatch(r"[a-z]", toks[i]) and re.fullmatch(SIGCH + "+", toks[i + 1]):
            ch, sig = toks[i], norm(toks[i + 1]); i += 2
            if acc: accented["é" if ch == "e" else ch + "'"] = sig
            else: letters[ch.upper()] = sig
        else:
            i += 1
figures = {}
for line in figs_blk.splitlines():
    for m in re.finditer(r"(\d)\s+((?:" + SIGCH + r"\s*)+)(?=\s{2,}|\s*\d\s|\s*$)", line.strip()):
        figures[m.group(1)] = norm(m.group(2))
signs, buf = [], ""
for l in [x.rstrip() for x in punct_blk.splitlines()[1:]]:
    if not l.strip(): continue
    buf = (buf + " " + l.strip()).strip()
    m = re.match(r"(.+?)\s*[.…]{3,}\s*(?:\[(.+?)\])?\s*(" + SIGCH + r"[.−–\-\s]*)$", buf)
    if m:
        signs.append({"name": re.sub(r"\s+", " ", m.group(1).strip()), "glyph": m.group(2), "signal": norm(m.group(3))}); buf = ""
assert len(letters) == 26, sorted(letters)
assert len(figures) == 10, figures
assert set(accented) == {"é"}, accented
assert len(signs) == 20, len(signs)
out = {"giver": "ITU-R M.1677-1 (10/2009) International Morse code, Annex 1 Part I s1.1",
       "url": "https://www.itu.int/dms_pubrec/itu-r/rec/m/R-REC-M.1677-1-200910-I!!PDF-E.pdf",
       "extracted_by": "scripts/parse_itu.py over pdftotext -layout",
       "letters": letters, "accented": accented, "figures": figures, "signs": signs}
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"letters {len(letters)} figures {len(figures)} signs {len(signs)} -> {OUT}")
