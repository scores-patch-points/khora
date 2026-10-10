#!/usr/bin/env python3
"""Build the IPA corpus: split BY LANGUAGE (source), subsample deterministically, derive GOLD with the
real authorities. Label-blind: the split and the sample use only the README table, ISO codes and word
hashes; no reader has run.

SPLIT RULE (declared before any reader ran): language = ISO 639-3 code. Languages are grouped by the
script of their largest unfiltered file; inside a script group they are sorted by
sha256("khora-ipa-split-v1|"+iso) and assigned by rank position u=(r+0.5)/n: u<0.6 train, u<0.8 dev,
else test. All files of one ISO (broad+narrow, dialects) share the split. PHOIBLE languages follow the
WikiPron split when the ISO is present there; otherwise u = first 8 hex digits of
sha256("khora-ipa-split-v1|"+key)/2^32 with the same 0.6/0.8 cuts (key = ISO6393 or "g:"+Glottocode).

SAMPLE RULE: per ISO, rate = min(1, CAP_WORDS / max over its files of unique words); a word is kept in
every file of that ISO iff sha256(iso+"|"+word)[:8]/2^32 < rate. So a word kept in the broad file is
kept in the narrow file too (R5 pairs). CAP_WORDS = 2000.

GOLD (R1/R4): the WikiPron segmentation in the TSV itself (made by the cldf `segments` library, ipa
mode, per the WikiPron README). Re-derived here with `segments` as a reproduction check (seglib_ok) and
cross-checked with panphon.FeatureTable.ipa_segs (an independent segmenter) on dev/test.
"""
import csv, gzip, hashlib, json, os, sys, collections, unicodedata, time

ROOT = "/private/tmp/claude-501/notation/ipa"
RAW = f"{ROOT}/raw/wikipron"
OUT_C = f"{ROOT}/corpus"
OUT_G = f"{ROOT}/gold"
CAP_WORDS = 2000
SALT = "khora-ipa-split-v1|"


def sha_u(s):
    return int(hashlib.sha256(s.encode("utf8")).hexdigest()[:8], 16) / 2 ** 32


def split_of_u(u):
    return "train" if u < 0.6 else ("dev" if u < 0.8 else "test")


metas = []
for fn in sorted(os.listdir(RAW)):
    if fn.endswith(".json"):
        metas.append(json.load(open(f"{RAW}/{fn}")))
by_iso = collections.defaultdict(list)
for m in metas:
    by_iso[m["iso"]].append(m)

# script group per ISO = script of the largest file
iso_script = {}
for iso, ms in by_iso.items():
    iso_script[iso] = max(ms, key=lambda m: m["n"])["script"]
groups = collections.defaultdict(list)
for iso, sc in iso_script.items():
    groups[sc].append(iso)
lang_split = {}
for sc, isos in groups.items():
    isos.sort(key=lambda i: hashlib.sha256((SALT + i).encode()).hexdigest())
    n = len(isos)
    for r, iso in enumerate(isos):
        lang_split[iso] = split_of_u((r + 0.5) / n)

# ---- parse + sample
parsed = {}
bad = collections.Counter()
for m in metas:
    rows = []
    seen = set()
    with gzip.open(f"{RAW}/{m['file']}.gz", "rt", encoding="utf8") as f:
        for ln in f:
            ln = ln.rstrip("\n")
            if not ln:
                continue
            c = ln.split("\t")
            if len(c) != 2:
                bad["not2cols"] += 1
                continue
            w, p = c
            if (w, p) in seen:
                continue
            seen.add((w, p))
            rows.append((w, p))
    parsed[m["file"]] = rows
iso_maxwords = {}
for iso, ms in by_iso.items():
    iso_maxwords[iso] = max(len({w for w, _ in parsed[m["file"]]}) for m in ms)
rate = {iso: min(1.0, CAP_WORDS / max(1, mw)) for iso, mw in iso_maxwords.items()}

os.makedirs(OUT_C, exist_ok=True)
os.makedirs(OUT_G, exist_ok=True)
for s in ("train", "dev", "test"):
    os.makedirs(f"{OUT_C}/{s}", exist_ok=True)

from segments import Tokenizer
import panphon

tok = Tokenizer()
ft = panphon.FeatureTable()
manifest = {"created": time.strftime("%Y-%m-%d"), "cap_words": CAP_WORDS, "salt": SALT, "files": [], "lang_split": lang_split,
            "script_of_iso": iso_script, "rate": rate, "skipped_lines": dict(bad)}
gold_w = {s: gzip.open(f"{OUT_G}/wikipron-{s}.jsonl.gz", "wt", encoding="utf8") for s in ("dev", "test")}
stats = collections.Counter()
for m in metas:
    iso = m["iso"]
    split = lang_split[iso]
    kept = [(w, p) for w, p in parsed[m["file"]] if sha_u(iso + "|" + w) < rate[iso]]
    kept.sort(key=lambda wp: (sha_u(iso + "|" + wp[0]), wp[0], wp[1]))  # deterministic pseudo-random order
    with open(f"{OUT_C}/{split}/{m['file']}", "w", encoding="utf8") as f:
        for w, p in kept:
            f.write(f"{w}\t{p}\n")
    ok = 0
    if split in gold_w:
        for w, p in kept:
            segs = p.split(" ")
            joined = "".join(segs)
            nfc = lambda L: [unicodedata.normalize("NFC", x) for x in L]
            lib = nfc(tok(joined, ipa=True).split(" ")) if joined else []
            pp = nfc(ft.ipa_segs(joined))
            segs_n = nfc(segs)  # the library NFD-normalises; compare under NFC (WikiPron files are NFC)
            rec = {"iso": iso, "file": m["file"], "word": w, "pron": joined, "segs": segs, "seglib": lib == segs_n, "panphon": pp}
            gold_w[split].write(json.dumps(rec, ensure_ascii=False) + "\n")
            ok += lib == segs_n
            if split == "dev":  # TEST aggregates are deliberately not tallied or printed (held-out discipline)
                stats[split + ".lines"] += 1
                stats[split + ".seglib_ok"] += lib == segs_n
                stats[split + ".panphon_ok"] += pp == segs_n
    manifest["files"].append({"file": m["file"], "iso": iso, "split": split, "script": m["script"], "dialect": m["dialect"], "nb": m["nb"],
                              "readme_entries": m["n"], "fetch_mode": m["mode"], "fetched_bytes": m["bytes"], "kept_lines": len(kept),
                              "kept_words": len({w for w, _ in kept}), "sampling_rate": rate[iso]})
for g in gold_w.values():
    g.close()
manifest["gold_reproduction"] = dict(stats)
manifest["split_counts"] = {s: sum(1 for v in lang_split.values() if v == s) for s in ("train", "dev", "test")}
manifest["split_lines"] = {s: sum(f["kept_lines"] for f in manifest["files"] if f["split"] == s) for s in ("train", "dev", "test")}
json.dump(manifest, open(f"{ROOT}/manifest.wikipron.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({"split_counts": manifest["split_counts"], "split_lines": manifest["split_lines"], "gold_reproduction": dict(stats), "bad": dict(bad)}, indent=1))
