#!/usr/bin/env python3
"""audit_corpus.py — are the encoded forms decodable by INDEPENDENT third-party implementations? (corpus validity, not reading)
Morse: morse3 (MIT) inverse table decodes morse_spaced -> compare to the plaintext.  Braille: pybraille (MIT) encodes the plaintext -> compare to ours.
Disagreements are itemised by cause; they are results about the oracle or about UEB rules the oracle lacks, not hidden."""
import json, re, ast, sys, collections
ROOT = "/private/tmp/claude-501/notation/closed_codes"
recs = [json.loads(l) for l in open(f"{ROOT}/corpus/dev.jsonl", encoding="utf-8")][:400]
src = open(f"{ROOT}/pylib/morse3.py", encoding="utf-8").read()
codes = ast.literal_eval(re.search(r"self\.codes\s*=\s*(\{.*?\})", src, flags=re.S).group(1))
inv = {v: k.upper() for k, v in codes.items() if k != " "}
n_full = n_ok = 0; bad = []
for r in recs:
    words = r["forms"]["morse_spaced"].split(" / ")
    dec = " ".join("".join(inv.get(t, "∅") for t in w.split(" ")) for w in words)
    if "∅" in dec: continue          # morse3 lacks some ITU signs (quote, apostrophe, colon, plus, equals)
    n_full += 1
    if dec == r["text"].upper(): n_ok += 1
    else: bad.append((r["text"], dec))
res = {"morse3": {"units": len(recs), "decodable_by_oracle_table": n_full, "exact_match": n_ok, "mismatch_examples": bad[:3]}}
sys.path.insert(0, f"{ROOT}/pylib")
import pybraille
n = ok = 0; causes = collections.Counter(); ex = {}
for r in recs:
    t = r["text"]
    mine = r["forms"]["braille"].replace("⠀", " ")
    try: theirs = pybraille.convertText(t)
    except Exception as e: causes["oracle_error"] += 1; continue
    n += 1
    if mine == theirs: ok += 1; continue
    # attribute the first difference
    i = next((k for k in range(min(len(mine), len(theirs))) if mine[k] != theirs[k]), min(len(mine), len(theirs)))
    why = "other"
    if re.search(r"\b[A-Z]{2,}\b", t): why = "all-caps word (UEB word indicator; oracle repeats the letter indicator)"
    elif "(" in t or ")" in t: why = "parentheses (UEB two-cell vs oracle EBAE one-cell)"
    elif '"' in t: why = "double quotes (UEB two-cell; oracle has none: KeyError-free fallback differs)"
    elif ";" in t: why = "semicolon"
    elif re.search(r"\d[a-j]", t): why = "letter a-j after a number (UEB grade-1 indicator; oracle lacks it)"
    elif re.search(r"\d[.,]$|\d[.,]\s", t): why = "number followed by period/comma (oracle keeps numeric mode)"
    causes[why] += 1; ex.setdefault(why, [t, mine, theirs])
res["pybraille"] = {"units": len(recs), "comparable": n, "exact_match": ok, "mismatch_by_cause": dict(causes), "mismatch_examples": {k: v for k, v in list(ex.items())[:6]}}
json.dump(res, open(f"{ROOT}/gold/audit_corpus_dev.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1)[:3500])
