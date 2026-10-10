#!/usr/bin/env python3
"""build_hard_decoys.py — AMENDMENT 1 (2026-10-06): the HARD decoy tier for the closed_codes R0 identification rung.

Written BEFORE the amended instrument's first run; the kinds, counts, shares and seeds below are fixed by the
amendment header in eval/notation-competence/closed_codes.mjs and are never tuned after a result. Every decoy is
AUTHORED (label: what the stream is NOT) and says so; nothing here is natural data except the English words of H2.
INDEPENDENT of the adapter and of priors/: reads only the machine-extracted giver tables in gold/ and the split's units.

  H1 braille_outside_inventory   20..60 Braille-block cells drawn uniformly from the cells the UEB grade-1 giver does NOT carry
                                 (6-dot cells outside the table and every 8-dot cell U+2840..U+28FF), blank every ~7 cells.
                                 A script-only reader says 'braille'; the giver says every cell is out of table.  GATED.
  H2 prose_embeds_nato_words     a real sentence of the split with exactly round(0.20 * words) words replaced by ICAO words
                                 (letters, digit words and variants named by the giver).  GATED (<= 25% share: mostly prose).
  H3 dotdash_short_unassigned    8..30 dot/dash tokens of length <= 4 drawn from the strings of length <= 4 the ITU table does
                                 NOT assign (a script/alphabet test says Morse; the table refuses every token).  GATED.
  H4 dotdash_short_valid_gibberish  8..30 dot/dash tokens of length <= 4 drawn uniformly from the strings the ITU table DOES
                                 assign: Morse of random letters.  AMBIGUOUS BY CONSTRUCTION (no table reader can tell it from
                                 a Morse message of random letters): REPORTED, NEVER GATED (typed gap with denominators).
Output: corpus/{split}-decoys-hard.jsonl, 40 per kind, each {id, kind, tier, gated, text, authored, note}."""
import json, random, sys, itertools
ROOT = "/private/tmp/claude-501/notation/closed_codes"
SEED = 20261007
itu = json.load(open(f"{ROOT}/gold/morse_itu_m1677_1.json", encoding="utf-8"))
bt = json.load(open(f"{ROOT}/gold/braille_ueb_g1.json", encoding="utf-8"))
nato = json.load(open(f"{ROOT}/gold/nato_icao.json", encoding="utf-8"))
def rng(*parts): return random.Random(":".join(str(p) for p in (SEED,) + parts))

# giver tables
signals = set(itu["letters"].values()) | set(itu["figures"].values()) | {s["signal"] for s in itu["signs"]} | {itu["accented"]["é"]}
def strings(maxlen):
    for L in range(1, maxlen + 1):
        for t in itertools.product(".-", repeat=L): yield "".join(t)
short_all = list(strings(4))
short_valid = [s for s in short_all if s in signals]
short_unassigned = [s for s in short_all if s not in signals]

def flat_cells(v):
    out = []
    if isinstance(v, str): out.append(v)
    elif isinstance(v, dict): [out.extend(flat_cells(x)) for x in v.values()]
    elif isinstance(v, list): [out.extend(flat_cells(x)) for x in v]
    return out
inv = set()
for k in ("letters", "digits", "indicators", "punct_cells", "ueb_multi"):
    for c in flat_cells(bt.get(k, {})):
        for ch in c: inv.add(ch)
inv = {c for c in inv if "⠁" <= c <= "⣿"}
outside = [chr(0x2800 + i) for i in range(1, 256) if chr(0x2800 + i) not in inv]

words = []
for g in ("letters", "digits", "digits_itu_imo"): words += list(nato.get(g, {}).values())
for g in ("letter_variants", "digit_variants"):
    for v in nato.get(g, {}).values(): words += list(v)
words = sorted(set(words))

def build(split, per=40):
    units = [json.loads(l) for l in open(f"{ROOT}/corpus/units/{split}.jsonl", encoding="utf-8")]
    texts = [u["text"] for u in units if len(u["text"].split(" ")) >= 8]
    r = rng(split, "hard")
    out = []
    def add(kind, gated, text, note): out.append({"id": f"decoy:{split}:hard:{kind}:{len(out)}", "kind": kind, "tier": "hard", "gated": gated, "text": text, "authored": True, "note": note})
    for _ in range(per):
        n = r.randint(20, 60); cells = []
        for i in range(n):
            cells.append(r.choice(outside))
            if i < n - 1 and r.random() < 1 / 7: cells.append("⠀" if r.random() < 0.5 else " ")
        add("braille_outside_inventory", True, "".join(cells), f"{n} Braille-block cells, every one outside the UEB grade-1 giver table ({len(outside)} such cells)")
    for _ in range(per):
        w = r.choice(texts).split(" "); k = max(1, round(0.20 * len(w)))
        idx = set(r.sample(range(len(w)), k))
        o = [r.choice(words) if i in idx else x for i, x in enumerate(w)]
        add("prose_embeds_nato_words", True, " ".join(o), f"real sentence, {k} of {len(w)} words ({k/len(w):.2f}) replaced by giver-named ICAO words")
    for _ in range(per):
        n = r.randint(8, 30); toks = []
        for i in range(n):
            toks.append(r.choice(short_unassigned))
            if i < n - 1 and r.random() < 0.1: toks.append("/")
        add("dotdash_short_unassigned", True, " ".join(toks), f"{n} dot/dash tokens of length<=4 from the {len(short_unassigned)} strings the ITU table does not assign: {' '.join(short_unassigned)}")
    for _ in range(per):
        n = r.randint(8, 30)
        add("dotdash_short_valid_gibberish", False, " ".join(r.choice(short_valid) for _ in range(n)), f"{n} dot/dash tokens of length<=4 drawn from the {len(short_valid)} assigned strings: Morse of random letters (AMBIGUOUS_BY_CONSTRUCTION, reported not gated)")
    with open(f"{ROOT}/corpus/{split}-decoys-hard.jsonl", "w", encoding="utf-8") as f:
        for d in out: f.write(json.dumps(d, ensure_ascii=False) + "\n")
    return out

if __name__ == "__main__":
    print("short_unassigned", short_unassigned, "short_valid", len(short_valid), "outside cells", len(outside), "inventory cells", len(inv), "words", len(words))
    for split in sys.argv[1:] or ["dev", "test"]:
        d = build(split)
        print(split, len(d), "hard decoys")
