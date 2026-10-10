#!/usr/bin/env python3
"""Build the RECEIVED priors of the IPA adapter (priors/notation-ipa-{chart,binding,segments}.json).

Run with the venv python:  /private/tmp/claude-501/venv/bin/python build_priors.py
(identify prior = build-identify-prior.mjs, needs node because its classes are the adapter's.)

GIVERS (every prior names its giver; priors REFUSE or NOMINATE, never admit):
  chart     the IPA chart (International Phonetic Association, 'IPA Kiel' chart, CC BY-SA 4.0 per
            https://www.internationalphoneticassociation.org/content/ipa-chart , read 2026-10-06) as ENCODED in
            ipapy 0.0.9 data/ipa.dat (A. Pettarin, MIT): consonant / vowel / diacritic / suprasegmental / tone symbols
            with Unicode code points; + the Unicode Character Database 16.0.0 (general categories from python
            unicodedata; Scripts-16.0.0.txt fetched from unicode.org, Unicode License). NO split-derived count lives in
            this file: it is a STANDARDS table (counts are of the standard, not of TRAIN).
  binding   TRAIN ONLY: how each code point behaves inside the WikiPron TRAIN gold segmentation (the cldf `segments`
            library's segmentation as published in the TSVs of the TRAIN languages): head vs continuation counts.
  segments  TRAIN ONLY: segment-type counts of the WikiPron TRAIN languages and the PHOIBLE TRAIN languages' segment
            classes (consonant/vowel/tone, PHOIBLE SegmentClass). Which languages are TRAIN: manifest.wikipron.json.
"""
import collections, gzip, hashlib, json, os, re, sys, unicodedata, time

ROOT = "/private/tmp/claude-501/notation/ipa"
PRIORS = "/Users/mlacy/Documents/3.0/khora/native/priors"
IPADAT = "/private/tmp/claude-501/venv/lib/python3.14/site-packages/ipapy/data/ipa.dat"
SCRIPTS = f"{ROOT}/probe/Scripts.txt"
man = json.load(open(f"{ROOT}/manifest.wikipron.json"))
train_langs = sorted(i for i, s in man["lang_split"].items() if s == "train")
TODAY = time.strftime("%Y-%m-%d")


def cp_hex(c):
    return f"{ord(c):04X}"


def seq_str(hexes):
    return "".join(chr(int(h, 16)) for h in hexes.split("_"))


# ---------------------------------------------------------------- chart
chart_cp = {}   # code point (hex) -> {role, cls?, desc, chartProper}
chart_seq = {}  # NFC string (multi-cp) -> {cls, desc, chartProper}
section = None
not_in_chart = False
with open(IPADAT, encoding="utf8") as f:
    for raw in f:
        line = raw.rstrip("\n")
        if line.startswith("# NOT in IPA chart"):
            not_in_chart = True
            continue
        if re.match(r"^#\s+[A-Za-z]", line) and ("#   " in line) and line.rstrip().endswith("#"):
            # section banner like '#   CONSONANT   #' or '#   plosive / stop   #'
            not_in_chart = False
            continue
        if not line or line.startswith("#"):
            continue
        if "," not in line:
            continue
        desc, unic = line.rsplit(",", 1)
        words = desc.split()
        cls = words[-1]
        desc_clean = " ".join(words[:-1])
        for alt in unic.split():
            if alt in ("N/A", "???"):
                continue
            s = unicodedata.normalize("NFC", seq_str(alt))
            rec = {"cls": cls, "desc": desc_clean, "chartProper": not not_in_chart}
            if len(alt.split("_")) == 1 and len(s) == 1:
                chart_cp.setdefault(alt.upper().zfill(4), rec)
            else:
                chart_seq.setdefault(s, rec)

ROLE_OF_CLASS = {"consonant": "base", "vowel": "base", "diacritic": "diacritic", "suprasegmental": "suprasegmental", "tone": "tone"}
codepoints = {}
for h, rec in chart_cp.items():
    c = chr(int(h, 16))
    role = ROLE_OF_CLASS[rec["cls"]]
    cat = unicodedata.category(c)
    d = {"role": role, "gc": cat, "desc": rec["desc"], "chartProper": rec["chartProper"]}
    if rec["cls"] in ("consonant", "vowel"):
        d["cls"] = rec["cls"]
    if "tie-bar" in rec["desc"]:
        d["role"] = "tie"
    elif rec["desc"] in ("primary-stress", "secondary-stress"):
        d["role"] = "stress"
    elif rec["desc"] in ("long", "half-long"):
        d["role"] = "length"
    elif rec["desc"] in ("syllable-break", "minor-group", "major-group", "word-break", "linking"):
        d["role"] = "boundary"
    elif rec["cls"] == "tone":
        d["role"] = "tone-letter" if 0x02E5 <= int(h, 16) <= 0x02E9 else "tone-mark"
    codepoints[h] = d

# every code point of the blocks IPA text is written in, with its UCD general category (a standards table, not learned)
BLOCKS = [("Basic Latin", 0x0020, 0x007F), ("Latin-1 Supplement", 0x00A0, 0x00FF), ("Latin Extended-A", 0x0100, 0x017F),
          ("Latin Extended-B", 0x0180, 0x024F), ("IPA Extensions", 0x0250, 0x02AF), ("Spacing Modifier Letters", 0x02B0, 0x02FF),
          ("Combining Diacritical Marks", 0x0300, 0x036F), ("Greek and Coptic", 0x0370, 0x03FF), ("Phonetic Extensions", 0x1D00, 0x1D7F),
          ("Phonetic Extensions Supplement", 0x1D80, 0x1DBF), ("Combining Diacritical Marks Supplement", 0x1DC0, 0x1DFF),
          ("Latin Extended Additional", 0x1E00, 0x1EFF), ("General Punctuation", 0x2000, 0x206F), ("Superscripts and Subscripts", 0x2070, 0x209F),
          ("Arrows", 0x2190, 0x21FF), ("Latin Extended-C", 0x2C60, 0x2C7F), ("Modifier Tone Letters", 0xA700, 0xA71F),
          ("Latin Extended-D", 0xA720, 0xA7FF), ("Latin Extended-E", 0xAB30, 0xAB6F), ("Latin Extended-G", 0x1DF00, 0x1DFFF)]
table = {}
for name, lo, hi in BLOCKS:
    for cpv in range(lo, hi + 1):
        c = chr(cpv)
        gc = unicodedata.category(c)
        if gc in ("Cn", "Cc", "Co", "Cs"):
            continue
        table[f"{cpv:04X}"] = {"gc": gc, "b": name}
for h, d in codepoints.items():
    table.setdefault(h, {"gc": d["gc"], "b": "chart"})
    table[h].update({k: v for k, v in d.items() if k != "gc"})

# scripts (Unicode Scripts-16.0.0.txt) -> compact ranges
scripts = []
names = []
with open(SCRIPTS, encoding="utf8") as f:
    for line in f:
        line = line.split("#")[0].strip()
        if not line:
            continue
        rng, sc = [x.strip() for x in line.split(";")]
        lo, hi = (rng.split("..") + [rng])[:2] if ".." in rng else (rng, rng)
        if sc not in names:
            names.append(sc)
        scripts.append([int(lo, 16), int(hi, 16), names.index(sc)])
scripts.sort()

chart = {
    "kind": "IPAChartPrior@1",
    "built": TODAY,
    "giver": {
        "name": "IPA chart (International Phonetic Association) as encoded in ipapy ipa.dat; Unicode Character Database",
        "chart": {"url": "https://www.internationalphoneticassociation.org/content/ipa-chart", "license": "CC BY-SA 4.0 (stated on that page, read 2026-10-06)",
                  "attribution": "International Phonetic Alphabet in IPA Kiel, www.internationalphoneticassociation.org. Copyright International Phonetic Association."},
        "encoding": {"package": "ipapy 0.0.9.0 data/ipa.dat dated 2019-05-05", "author": "Alberto Pettarin", "license": "MIT"},
        "ucd": {"version": unicodedata.unidata_version, "files": ["python unicodedata general categories", "Scripts-16.0.0.txt https://www.unicode.org/Public/16.0.0/ucd/Scripts.txt"], "license": "Unicode License v3 (https://www.unicode.org/terms_of_use.html)"},
    },
    "split": "none: a standards table. No count in this file comes from TRAIN, DEV or TEST.",
    "counts": {"chart_codepoints": len(chart_cp), "chart_multi_codepoint_symbols": len(chart_seq), "table_codepoints": len(table),
               "script_ranges": len(scripts), "chart_proper_codepoints": sum(1 for d in chart_cp.values() if d["chartProper"])},
    "roles": "role per code point: base (consonant|vowel symbol), diacritic (dependent mark), tie (tie bar), length, stress, boundary, tone-letter, tone-mark; code points not in the chart carry only their UCD general category 'gc' (nominated by category: Lm/Mn/Sk dependent, L* base)",
    "codepoints": table,
    "sequences": chart_seq,
    "scriptNames": names,
    "scriptRanges": scripts,
}
json.dump(chart, open(f"{PRIORS}/notation-ipa-chart.json", "w"), ensure_ascii=False, separators=(",", ":"))

# ---------------------------------------------------------------- binding + segments (TRAIN only)
head = collections.Counter(); cont = collections.Counter(); after_tie = collections.Counter(); after_same = collections.Counter()
seg_tok = collections.Counter(); seg_lang = collections.defaultdict(set)
n_tok = 0; n_lines = 0
TIE = {"͡", "͜"}
for fn in sorted(os.listdir(f"{ROOT}/corpus/train")):
    iso = fn.split("_")[0]
    assert man["lang_split"][iso] == "train", fn
    with open(f"{ROOT}/corpus/train/{fn}", encoding="utf8") as f:
        for ln in f:
            w, p = ln.rstrip("\n").split("\t")
            n_lines += 1
            for s in p.split(" "):
                s = unicodedata.normalize("NFC", s)
                n_tok += 1
                seg_tok[s] += 1
                seg_lang[s].add(iso)
                prev = None
                for i, ch in enumerate(s):
                    if i == 0:
                        head[ch] += 1
                    else:
                        cont[ch] += 1
                        if prev in TIE:
                            after_tie[ch] += 1
                        if unicodedata.category(ch) == "Sk" and unicodedata.category(prev) == "Sk":
                            after_same[ch] += 1
                    prev = ch
cps = sorted(set(head) | set(cont))
binding = {
    "kind": "IPABindingPrior@1",
    "built": TODAY,
    "giver": {"name": "WikiPron TRAIN-language gold segmentation (cldf `segments` library, ipa mode, as published in the WikiPron TSVs)",
              "source": "https://github.com/CUNY-CL/wikipron data/scrape/tsv", "code_license": "Apache-2.0", "data_license": "Wiktionary CC BY-SA 4.0 / GFDL",
              "split": "TRAIN languages only", "train_languages": train_langs},
    "counts": {"train_lines": n_lines, "train_segments": n_tok, "codepoints": len(cps)},
    "note": "head = first code point of a gold segment, cont = a later code point of a gold segment, afterTie = cont immediately after a tie bar, afterTone = a tone letter (Sk) cont after a tone letter. A code point whose cont share >= 1/2 is DEPENDENT (it names no being by itself). Stress marks and syllable boundaries NEVER occur in WikiPron segments (the scraper strips them): their binding is NOT TRAIN-attested, a typed gap.",
    "codepoints": {cp_hex(c): {"h": head[c], "c": cont[c], **({"t": after_tie[c]} if after_tie[c] else {}), **({"s": after_same[c]} if after_same[c] else {})} for c in cps},
}
json.dump(binding, open(f"{PRIORS}/notation-ipa-binding.json", "w"), ensure_ascii=False, separators=(",", ":"))

# PHOIBLE TRAIN classes
ph = json.load(gzip.open(f"{ROOT}/corpus/phoible/train.json.gz", "rt", encoding="utf8"))
cls_langs = collections.defaultdict(lambda: collections.Counter())
for key, L in ph.items():
    for p, e in L["phonemes"].items():
        cls_langs[p][e["cls"]] += 1
segments = {
    "kind": "IPASegmentsPrior@1",
    "built": TODAY,
    "giver": [
        {"name": "WikiPron TRAIN-language segment types (token and language counts)", "source": "https://github.com/CUNY-CL/wikipron", "license": "Apache-2.0 code; Wiktionary CC BY-SA 4.0 data", "split": "TRAIN languages only"},
        {"name": "PHOIBLE TRAIN-language segment classes (SegmentClass: consonant|vowel|tone)", "source": "https://github.com/phoible/dev data/phoible.csv", "license": "CC BY 4.0 data, MIT code", "split": "TRAIN languages only (ISO6393 split with WikiPron's)", "train_languages": len(ph)},
    ],
    "counts": {"wikipron_train_segment_types": len(seg_tok), "wikipron_train_tokens": n_tok, "phoible_train_languages": len(ph), "phoible_train_phoneme_types": len(cls_langs), "wikipron_hapax_dropped": sum(1 for v in seg_tok.values() if v < 2)},
    "note": "NOMINATES a class for an exact segment string attested in TRAIN (majority of the languages that attest it); a segment never seen in TRAIN gets NO nomination (the chart head class or a typed gap decides). The WikiPron table lists only types with >= 2 TRAIN tokens (hapaxes dropped, counted in counts.wikipron_hapax_dropped); the PHOIBLE table lists every TRAIN-language phoneme type.",
    "wikipron": {s: [seg_tok[s], len(seg_lang[s])] for s in sorted(seg_tok, key=lambda x: (-seg_tok[x], x)) if seg_tok[s] >= 2},
    "phoible": {p: dict(c) for p, c in sorted(cls_langs.items())},
}
json.dump(segments, open(f"{PRIORS}/notation-ipa-segments.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps({"chart": chart["counts"], "binding": binding["counts"], "segments": segments["counts"]}, indent=1))
for fn in ("chart", "binding", "segments"):
    print(fn, os.path.getsize(f"{PRIORS}/notation-ipa-{fn}.json"))
