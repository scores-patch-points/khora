#!/usr/bin/env python3
"""Derive the PHOIBLE per-language tables used as the INDEPENDENT second authority (R2 class gold, R3 inventory gold).

Source: https://github.com/phoible/dev data/phoible.csv (CC BY 4.0, code MIT), fetched 2026-10-06, sha256 in PROVENANCE.md.
Split: language key = ISO6393 (else "g:"+Glottocode). If the ISO is a WikiPron language its WikiPron split is used (so one
language is never in two splits across the two sources); otherwise u = sha256("khora-ipa-split-v1|"+key)[:8]/2^32, cuts 0.6/0.8.
Output: corpus/phoible/{train,dev,test}.json.gz = {key: {iso, glotto, name, n_inventories, sources:[...],
  phonemes: {segment: {cls, n_inv, marginal}}, allophones: [segment,...]}}
SegmentClass in PHOIBLE is one of consonant|vowel|tone (the column is the gold for R2).
"""
import csv, gzip, hashlib, json, os, collections, unicodedata

ROOT = "/private/tmp/claude-501/notation/ipa"
man = json.load(open(f"{ROOT}/manifest.wikipron.json"))
lang_split = man["lang_split"]
SALT = man["salt"]


def sha_u(s):
    return int(hashlib.sha256(s.encode("utf8")).hexdigest()[:8], 16) / 2 ** 32


def split_of_u(u):
    return "train" if u < 0.6 else ("dev" if u < 0.8 else "test")


langs = {}
import io
_raw = f"{ROOT}/raw/phoible.csv"
_f = open(_raw, encoding="utf8", newline="") if os.path.exists(_raw) else io.TextIOWrapper(gzip.open(_raw + ".gz", "rb"), encoding="utf8", newline="")
with _f as f:
    for r in csv.DictReader(f):
        iso = r["ISO6393"] if r["ISO6393"] not in ("", "NA") else None
        key = iso or ("g:" + r["Glottocode"])
        L = langs.setdefault(key, {"iso": iso, "glotto": r["Glottocode"], "name": r["LanguageName"], "inv": set(), "sources": set(), "phonemes": {}, "allo": set()})
        L["inv"].add(r["InventoryID"])
        L["sources"].add(r["Source"])
        p = unicodedata.normalize("NFC", r["Phoneme"])
        e = L["phonemes"].setdefault(p, {"cls": r["SegmentClass"], "invs": set(), "marginal": False})
        assert e["cls"] == r["SegmentClass"], (key, p)
        e["invs"].add(r["InventoryID"])
        e["marginal"] = e["marginal"] or r["Marginal"] == "TRUE"
        if r["Allophones"] not in ("", "NA"):
            for a in r["Allophones"].split(" "):
                L["allo"].add(unicodedata.normalize("NFC", a))

out = {"train": {}, "dev": {}, "test": {}}
for key, L in langs.items():
    iso = L["iso"]
    sp = lang_split[iso] if iso in lang_split else split_of_u(sha_u(key))
    out[sp][key] = {"iso": iso, "glotto": L["glotto"], "name": L["name"], "n_inventories": len(L["inv"]), "sources": sorted(L["sources"]),
                    "wikipron_language": iso in lang_split,
                    "phonemes": {p: {"cls": e["cls"], "n_inv": len(e["invs"]), "marginal": e["marginal"]} for p, e in sorted(L["phonemes"].items())},
                    "allophones": sorted(L["allo"])}
os.makedirs(f"{ROOT}/corpus/phoible", exist_ok=True)
summary = {}
for sp, d in out.items():
    with gzip.open(f"{ROOT}/corpus/phoible/{sp}.json.gz", "wt", encoding="utf8") as f:
        json.dump(d, f, ensure_ascii=False)
    if sp != "test":  # TEST aggregates are not printed
        summary[sp] = {"languages": len(d), "with_wikipron_text": sum(1 for v in d.values() if v["wikipron_language"]),
                       "phoneme_types": len({p for v in d.values() for p in v["phonemes"]}),
                       "class_types": dict(collections.Counter(c for c in {(p, e["cls"]) for v in d.values() for p, e in v["phonemes"].items()} for c in [c[1]]))}
summary["test_languages"] = len(out["test"])
print(json.dumps(summary, indent=1))
