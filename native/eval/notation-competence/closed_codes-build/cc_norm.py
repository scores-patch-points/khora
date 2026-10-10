"""cc_norm.py — the ONE plaintext normal form for the closed_codes corpus (declared, not tuned).

Every unit's plaintext is folded into the intersection of what the codes under test can carry:
  letters A-Z a-z, digits 0-9, space, and the punctuation  . , : ? ' " ( ) - /
Folds (all declared; the fold is the reason a unit is DERIVED data, not natural data):
  accents -> ASCII (NFKD, drop combining marks)   [Morse ITU M.1677-1 carries only accented e: no other accent is measured]
  ’ ‘ -> '    “ ” -> "    – — ― -> -    … -> .    ; -> ,    ! -> .    [ { -> (    ] } -> )
  every other character -> space; whitespace collapsed.
"""
import re, unicodedata
FOLD = {"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", "―": "-",
        "…": ".", ";": ",", "!": ".", "[": "(", "{": "(", "]": ")", "}": ")", "_": " "}
ALLOWED = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:?'\"()-/")
def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    out = []
    for c in s:
        c = FOLD.get(c, c)
        out.append(c if c in ALLOWED else " ")
    s = "".join(out)
    s = re.sub(r"\.{2,}", ".", s)          # '. . .' / '...' -> '.'
    s = re.sub(r"-{2,}", "-", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s
ABBREV = ["Mr", "Mrs", "Ms", "Dr", "St", "Mt", "Messrs", "Jr", "Sr", "vs", "etc", "i.e", "e.g", "Col", "Capt", "Gen", "Lt", "Prof", "Rev", "Hon"]
def sentences(text: str):
    t = text
    for a in ABBREV:
        t = re.sub(r"\b%s\." % re.escape(a), a + "\u0001", t)
    parts = re.split(r"(?<=[.?])[\"')]*\s+(?=[A-Z\"'(])", t)
    for p in parts:
        yield p.replace("\u0001", ".").strip()
UP = re.compile(r"[A-Z]")
def encodable(p: str):
    """coverage filter: the sentence must lie inside what the ENCODERS (gold) implement. Returns (ok, reason)."""
    if not (25 <= len(p) <= 120): return False, "length"
    words = p.split(" ")
    if len(words) < 5: return False, "few_words"
    letters = [c for c in p if c.isalpha()]
    if not letters or sum(c.islower() for c in letters) < 0.6 * len(letters): return False, "mostly_caps"
    if re.search(r"\d[-/]|[-/]\d", p): return False, "digit_adjacent_hyphen_or_slash"
    if re.search(r"\d[:'\"()?]|[:'\"(?]\d", p): return False, "digit_adjacent_punct"   # numeric-mode termination corners (typed exclusion)
    if re.search(r"\d\.(?!\d|\s|$)|\d,(?!\d|\s|$)", p): return False, "digit_adjacent_punct"
    if re.search(r"/", p): return False, "slash"
    if re.search(r"(?<![A-Za-z0-9])[.,:?]|[.,:?]{2,}", p): return False, "stray_punct"
    if re.search(r"\(\s|\s\)", p): return False, "paren_space"
    caps_run = 0
    for w in words:
        core = re.sub(r"^[^A-Za-z0-9]+|[^A-Za-z0-9]+$", "", w)
        letters_w = [c for c in core if c.isalpha()]
        if len(letters_w) >= 2 and all(c.isupper() for c in letters_w):
            if re.search(r"[A-Za-z][-'.][A-Za-z]", core): return False, "caps_word_internal_punct"
            caps_run += 1
            if caps_run >= 3: return False, "caps_passage"
        else:
            caps_run = 0
        if sum(1 for c in core if c.isupper()) >= 2 and not all(c.isupper() for c in letters_w) and re.search(r"[a-z][A-Z]", core): pass
    return True, ""
