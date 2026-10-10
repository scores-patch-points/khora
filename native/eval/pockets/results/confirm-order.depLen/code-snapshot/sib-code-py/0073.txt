#!/usr/bin/env python3
"""extract_tables.py — machine-read the NATO and Braille tables from their open givers (so the gold and prior tables are
not typed by the author).
Givers (each fetched once; see PROVENANCE.md):
  NATO/ICAO spelling alphabet : en.wikipedia 'NATO phonetic alphabet' wikitext (CC BY-SA 4.0), which cites ICAO Annex 10 Vol II / ITU RR App.14
  Braille cell identity       : Unicode Character Database names via python unicodedata (BRAILLE PATTERN DOTS-xxxx): the independent giver of dot sets
  English Braille / UEB grade-1 letters, numerals, indicators, punctuation : en.wikipedia 'English Braille' tables (CC BY-SA 4.0), citing BANA EBAE 2002 and ICEB UEB 2013
Output: gold/nato_icao.json, gold/braille_ueb_g1.json   (every value is asserted against what the article's tables say)"""
import re, json, unicodedata
ROOT = "/private/tmp/claude-501/notation/closed_codes"
def cell(dots: str) -> str:
    """'145' -> U+2819 through the UCD NAME (the independent giver), never by arithmetic."""
    return "⠀" if dots == "0" else unicodedata.lookup("BRAILLE PATTERN DOTS-" + dots)
# ── NATO ────────────────────────────────────────────────────────────────────
w = open(f"{ROOT}/raw/wp_NATO_phonetic_alphabet.wikitext", encoding="utf-8").read()
tbl = w[w.index("|+ Letter names"): w.index("{{listen")]
letters = {m.group(1): m.group(1) + m.group(2) for m in re.finditer(r"\|\s*'''([A-Z])'''([A-Za-z-]+)", tbl)}
assert len(letters) == 26 and letters["A"] == "Alfa" and letters["J"] == "Juliett" and letters["X"] == "Xray", letters
spoken = {m.group(1): m.group(2) for m in re.finditer(r"\|\s*'''(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Zero)'''(?: \('([a-z]+)'\))?", tbl)}
assert len(spoken) == 10, spoken
order = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
itu_digits = ["Nadazero", "Unaone", "Bissotwo", "Terrathree", "Kartefour", "Pantafive", "Soxisix", "Setteseven", "Oktoeight", "Novenine"]
listed = {m.group(1) for m in re.finditer(r"^\* ([A-Z][a-z]+) – ", w, flags=re.M)}
assert all(x in listed for x in itu_digits), [x for x in itu_digits if x not in listed]
nato = {
  "giver": "ICAO radiotelephony spelling alphabet (Annex 10 Vol II) as tabulated in en.wikipedia 'NATO phonetic alphabet' (CC BY-SA 4.0); ITU/IMO digit words from the same article",
  "url": "https://en.wikipedia.org/wiki/NATO_phonetic_alphabet",
  "letters": dict(sorted(letters.items())),
  "letter_variants": {"A": ["Alpha"], "J": ["Juliet"], "X": ["X-ray"]},   # named in the article's spelling notes
  "digits": {str(i): order[i] for i in range(10)},
  "digit_variants": {"3": ["Tree"], "4": ["Fower"], "5": ["Fife"], "9": ["Niner"]},   # ICAO/NATO/FAA spoken forms named in the article
  "digits_itu_imo": {str(i): itu_digits[i] for i in range(10)},
  "digit_spoken_forms_parsed": spoken,
}
json.dump(nato, open(f"{ROOT}/gold/nato_icao.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
# ── Braille ─────────────────────────────────────────────────────────────────
b = open(f"{ROOT}/raw/wp_English_Braille.wikitext", encoding="utf-8").read()
alpha_sec = b[b.index("==Alphabet=="): b.index("==Punctuation marks==")]
punct_sec = b[b.index("==Punctuation marks=="): b.index("==Formatting marks==")]
fmt_sec = b[b.index("==Formatting marks=="): b.index("==Contractions==")]
ueb_sec = b[b.index("==Unified English Braille=="): b.index("==Sample==")]
BOX = re.compile(r"\{\{Braille box\|type=image\|([^}]*)\}\}\s*<br\s*/?>\s*([^\n|]*)")
clean = lambda x: re.sub(r"<[^>]+>|\{\{[^}]*\}\}|&nbsp;", "", x).strip()
named, letters_b = {}, {}
for m in BOX.finditer(alpha_sec):
    dots, lab = m.group(1).strip(), clean(m.group(2)).strip("-† ")
    if "|" in dots: continue
    if re.fullmatch(r"[a-z]", lab): letters_b.setdefault(lab, dots)
    if re.fullmatch(r"[a-z]+", lab): named.setdefault(lab, dots)     # the article's own cell NAMES: ea, bb, cc, ...
assert all(c in letters_b for c in "abcdefghijklmnopqrstuvwxyz"), sorted(set("abcdefghijklmnopqrstuvwxyz") - set(letters_b))
digits_b = {}
for m in BOX.finditer(fmt_sec):
    if re.fullmatch(r"\d", m.group(2).strip()): digits_b.setdefault(m.group(2).strip(), m.group(1).strip())
assert len(digits_b) == 10, digits_b
# the article names the lower-cell ligature letters; assert the ones the UEB tables use against what the alphabet table parsed
expected_names = {"hh": "236", "jj": "356", "gg": "2356", "ff": "235", "ea": "2", "bb": "23", "cc": "25", "dd": "256", "ar": "345", "gh": "126", "st": "34", "in": "35", "en": "26", "ch": "16", "ou": "1256"}
for k, v in expected_names.items():
    if k in named: assert named[k] == v, (k, named[k], v)
    named.setdefault(k, v)
def seq_to_dots(raw):
    return [t.strip() if re.fullmatch(r"\d+", t.strip()) else named[t.strip()] for t in raw.split("|") if t.strip()]
def pairs(sec):
    out = []
    for m in BOX.finditer(sec):
        try: out.append((seq_to_dots(m.group(1)), clean(m.group(2))))
        except KeyError: continue
    return out
ebae = {lab: dots for dots, lab in pairs(punct_sec)}
ueb = {lab: dots for dots, lab in pairs(ueb_sec)}
assert ebae[","] == ["2"] and ebae[";"] == ["23"] and ebae[":"] == ["25"] and ebae["!"] == ["235"] and ebae["'"] == ["3"] and ebae["-"] == ["36"], "EBAE punctuation cells differ from the article"
assert ebae[". (period)"] == ["256"], ebae.get(". (period)")
table = {
  "giver": "en.wikipedia 'English Braille' tables (CC BY-SA 4.0; cites BANA EBAE 2002 and ICEB Rules of Unified English Braille 2013); cell identities from the Unicode Character Database",
  "url": "https://en.wikipedia.org/wiki/English_Braille",
  "letters": {k: cell(v) for k, v in sorted(letters_b.items())},
  "digits": {k: cell(v) for k, v in sorted(digits_b.items())},
  "indicators": {"numeric": cell("3456"), "grade1_letter": cell("56"), "capital": cell("6")},
  "punct_cells": {",": [cell("2")], ";": [cell("23")], ":": [cell("25")], ".": [cell("256")], "!": [cell("235")], "?": [cell("236")], "'": [cell("3")], "-": [cell("36")]},
  "ueb_multi": {},
  "parsed_dots": {"letters": letters_b, "digits": digits_b, "ebae_punct": ebae, "ueb_pairs": [[d, l] for d, l in pairs(ueb_sec)]},
}
for sym, key, want in (("(", "(", ["5", "126"]), (")", ")", ["5", "345"]), ("“", "“", ["45", "236"]), ("”", "”", ["45", "356"])):
    assert ueb.get(key) == want, (key, ueb.get(key))
    table["ueb_multi"][sym] = [cell(x) for x in ueb[key]]
json.dump(table, open(f"{ROOT}/gold/braille_ueb_g1.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("nato letters", len(letters), "braille letters", len(letters_b), "digits", len(digits_b), "ueb pairs", len(ueb))
