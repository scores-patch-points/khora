#!/usr/bin/env python3
"""Cross-check of the ITU-R M.1677-1 giver table (gold/morse_itu_m1677_1.json) against the CC BY-SA 4.0 en.wikipedia
'Morse code' article table (raw/wp_Morse_code.wikitext). Licence-motivated audit (review finding: ITU PDF is (c) ITU):
if the factual letter and figure tables are identical, a PERMISSIVELY LICENSED giver for the same facts exists."""
import re, json
ROOT = "/private/tmp/claude-501/notation/closed_codes"
wt = open(f"{ROOT}/raw/wp_Morse_code.wikitext", encoding="utf-8").read().split("\n")
itu = json.load(open(f"{ROOT}/gold/morse_itu_m1677_1.json", encoding="utf-8"))
start = next(i for i, l in enumerate(wt) if l.startswith('{| class="wikitable sortable"') and i > 330)
rows = []
for l in wt[start:start + 260]:
    if "{{morse|" not in l: continue
    m = re.search(r"\{\{morse\|([a-z|]+)\}\}", l)
    if not m: continue
    sig = "".join("." if e == "dot" else "-" for e in m.group(1).split("|") if e in ("dot", "dash"))
    ch = re.search(r"\[\[([A-Z0-9])\|", l) or re.search(r"^\|\s*(?:rowspan=\"\d+\" \| \w+ \|\| )?\[\[([0-9])\]\]", l)
    if ch: rows.append((ch.group(1), sig))
wp = {}
for c, s in rows: wp.setdefault(c, s)
gold = {**itu["letters"], **itu["figures"]}
agree = [c for c in gold if wp.get(c) == gold[c]]
miss = [c for c in gold if c not in wp]
diff = [(c, gold[c], wp.get(c)) for c in gold if c in wp and wp[c] != gold[c]]
out = {"wikipedia_chars_parsed": len(wp), "itu_letters_figures": len(gold), "agree": len(agree), "not_parsed": miss, "disagree": diff}
json.dump(out, open(f"{ROOT}/gold/audit_morse_wikipedia.json", "w"), indent=1)
print(json.dumps(out))
