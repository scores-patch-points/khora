#!/usr/bin/env python3
"""make_manifest.py: finalise manifest.json (split by SOURCE) with the disjointness check, sizes, digests, licence evidence and gold audit."""
import gzip, hashlib, json, os, collections

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
m = json.load(open(f"{ROOT}/manifest.json"))
split_journals, split_ids, docs_by = {}, {}, {}
for sp in ("train", "dev", "test"):
    ids, js = [], collections.Counter()
    with gzip.open(f"{ROOT}/corpus/{sp}.jsonl.gz", "rt", encoding="utf8") as f:
        for line in f:
            d = json.loads(line); ids.append(d["id"]); js[d["journal"]] += 1
    split_ids[sp] = set(ids); split_journals[sp] = dict(js)
    m["splits"][sp].update({"docs_in_corpus": len(ids), "journals": dict(js), "ids_sha256": hashlib.sha256("\n".join(sorted(ids)).encode()).hexdigest(),
                            "corpus_bytes_gz": os.path.getsize(f"{ROOT}/corpus/{sp}.jsonl.gz"), "gold_bytes_gz": os.path.getsize(f"{ROOT}/gold/{sp}.gold.jsonl.gz"),
                            "gold_audit": json.load(open(f"{ROOT}/gold/{sp}.audit.json"))})
check = {"shared_journals": {}, "shared_treatment_ids": {}}
for a, b in (("train", "dev"), ("train", "test"), ("dev", "test")):
    check["shared_journals"][f"{a}/{b}"] = sorted(set(split_journals[a]) & set(split_journals[b]))
    check["shared_treatment_ids"][f"{a}/{b}"] = len(split_ids[a] & split_ids[b])
check["ok"] = all(not v for v in check["shared_journals"].values()) and all(v == 0 for v in check["shared_treatment_ids"].values())
m["disjointness_check"] = check
if os.path.exists(f"{ROOT}/raw/license_check.json"):
    m["licence_check"] = json.load(open(f"{ROOT}/raw/license_check.json"))
sizes = {}
for sub in ("raw", "corpus", "gold"):
    t = 0
    for dp, dn, fn in os.walk(f"{ROOT}/{sub}"):
        for x in fn: t += os.path.getsize(os.path.join(dp, x))
    sizes[sub] = t
m["family_corpus_bytes"] = sizes
m["family_corpus_bytes"]["total"] = sum(sizes.values())
m["gold_authorities"] = {"plazi_markup": "https://tb.plazi.org/GgServer (treatment XML, CC0)", "gnparser": "v1.11.1 (Global Names, MIT) via PyPI wheel gnparser 0.1.3 (pieterprovoost/gnparser-python wrapping the Go library)", "gbif_backbone": "https://api.gbif.org/v1/species/match (GBIF Backbone Taxonomy, CC BY 4.0), uninomials only"}
json.dump(m, open(f"{ROOT}/manifest.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps({"disjointness": check, "sizes": sizes}, indent=1))
