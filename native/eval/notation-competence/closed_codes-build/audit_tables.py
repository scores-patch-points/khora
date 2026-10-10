#!/usr/bin/env python3
"""audit_tables.py — are the machine-read givers consistent with INDEPENDENT third-party implementations?
This audits the TABLES (prior/gold giver fidelity). It does not measure reading. Oracles are read as data
(source text parsed, never executed: morsepy imports winsound), licences recorded in PROVENANCE.md.
  Morse : morse3 2.9 (MIT), morsepy 0.3.2 (MIT)   vs  ITU-R M.1677-1 table parsed from the PDF
  Braille: pybraille 1.0.0 (MIT)                    vs  English Braille/UEB table parsed from en.wikipedia + UCD names
Output gold/audit_tables.json: per oracle, agreement counts and an itemised disagreement list (disagreements are RESULTS)."""
import re, json, ast, sys
ROOT = "/private/tmp/claude-501/notation/closed_codes"
PY = f"{ROOT}/pylib"
itu = json.load(open(f"{ROOT}/gold/morse_itu_m1677_1.json", encoding="utf-8"))
itu_map = {}
itu_map.update(itu["letters"]); itu_map.update(itu["figures"])
for s in itu["signs"]:
    if s["glyph"] and len(s["glyph"]) == 1 and s["name"].split()[0] not in ("Multiplication",):
        g = s["glyph"].replace("’", "'").replace("–", "-")
        itu_map[g] = s["signal"]
    if s["name"].startswith("Inverted commas"): itu_map['"'] = s["signal"]
def dict_from_source(path, name_regex):
    src = open(path, encoding="utf-8").read()
    m = re.search(name_regex + r"\s*=\s*(\{.*?\n\s*\})", src, flags=re.S)
    return ast.literal_eval(m.group(1))
def morse3_codes():
    src = open(f"{PY}/morse3.py", encoding="utf-8").read()
    m = re.search(r"self\.codes\s*=\s*(\{.*?\})", src, flags=re.S)
    return ast.literal_eval(m.group(1))
oracles = {"morse3": {k.upper(): v for k, v in morse3_codes().items() if k != " "},
           "morsepy": {k.upper(): v for k, v in dict_from_source(f"{PY}/morsepy/morsepy.py", "MORSE_DICT").items() if k != " "}}
out = {"morse": {}}
for name, tab in oracles.items():
    tab = {k: v for k, v in tab.items()}
    common = sorted(set(tab) & set(itu_map))
    agree = [k for k in common if tab[k] == itu_map[k]]
    dis = [{"char": k, "itu": itu_map[k], name: tab[k]} for k in common if tab[k] != itu_map[k]]
    extra = {k: v for k, v in tab.items() if k not in itu_map}          # signs the oracle has that the giver does not license
    missing = sorted(k for k in itu_map if k not in tab)                # giver signs the oracle lacks
    out["morse"][name] = {"compared": len(common), "agree": len(agree), "disagree": dis, "oracle_extras_not_in_giver": extra, "giver_signs_missing_in_oracle": missing}
# Braille
bt = json.load(open(f"{ROOT}/gold/braille_ueb_g1.json", encoding="utf-8"))
src = open(f"{PY}/pybraille/main.py", encoding="utf-8").read()
cu = ast.literal_eval(re.search(r"characterUnicodes = (\{.*?\})\n\nnumberPunct", src, flags=re.S).group(1))
mine = {}
for k, v in bt["letters"].items(): mine[k] = v
for k, v in bt["punct_cells"].items():
    if len(v) == 1: mine[k] = v[0]
dig = {k: v for k, v in bt["digits"].items()}
res = {"letters_compared": 0, "letters_agree": 0, "digits_compared": 0, "digits_agree": 0, "punct": [], "indicators": {}}
for k in "abcdefghijklmnopqrstuvwxyz":
    res["letters_compared"] += 1; res["letters_agree"] += int(cu[k] == bt["letters"][k])
for k in "0123456789":
    res["digits_compared"] += 1; res["digits_agree"] += int(cu[k] == bt["digits"][k])
for k, v in bt["punct_cells"].items():
    res["punct"].append({"char": k, "wikipedia_ueb": v, "pybraille": cu.get(k), "agree": cu.get(k) == v[0]})
for k, v in (("(", bt["ueb_multi"]["("]), (")", bt["ueb_multi"][")"])):
    res["punct"].append({"char": k, "wikipedia_ueb": v, "pybraille": cu.get(k), "agree": False, "note": "pybraille emits one cell U+2836 for both brackets (EBAE); UEB uses a two-cell form: oracle is EBAE-era here, giver is UEB"})
res["indicators"] = {"numeric": {"giver": bt["indicators"]["numeric"], "pybraille": cu["num"]}, "capital": {"giver": bt["indicators"]["capital"], "pybraille": cu["caps"]}}
out["braille"] = {"pybraille": res}
json.dump(out, open(f"{ROOT}/gold/audit_tables.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({"morse": {k: {kk: (vv if kk in ("compared", "agree") else vv) for kk, vv in v.items()} for k, v in out["morse"].items()}, "braille": {k: {kk: vv for kk, vv in v.items() if kk != "punct"} for k, v in out["braille"].items()}}, ensure_ascii=False, indent=1))
print([p for p in res["punct"] if not p["agree"]])
