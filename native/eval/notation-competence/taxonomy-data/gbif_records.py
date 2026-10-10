#!/usr/bin/env python3
"""gbif_records.py: the NATURAL cross-source pair for R5. Plazi links a treatment to a GBIF Backbone taxon (treatment attribute ID-GBIF-Taxon, written by Plazi);
this fetches that taxon's Backbone record (https://api.gbif.org/v1/species/<key>, CC BY 4.0): scientificName (the name string as the Backbone writes it),
canonicalName, rank, authorship, taxonomicStatus. The pair (Plazi treatment text, Backbone record) is two independent REPRESENTATIONS of the same taxon.
Cache: raw/gbif_records.json {key: record|null}. dev and test treatments only (train is not needed by any instrument)."""
import gzip, json, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
UA = "khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)"
CACHE = f"{ROOT}/raw/gbif_records.json"

def keys():
    out = set()
    for split in ("dev", "test"):
        with gzip.open(f"{ROOT}/corpus/{split}.jsonl.gz", "rt", encoding="utf8") as f:
            for line in f:
                d = json.loads(line)
                if d.get("gbif_taxon"): out.add(d["gbif_taxon"])
    return sorted(out)

def fetch(k):
    for i in range(4):
        try:
            req = urllib.request.Request(f"https://api.gbif.org/v1/species/{k}", headers={"User-Agent": UA})
            r = json.loads(urllib.request.urlopen(req, timeout=60).read())
            return k, {x: r.get(x) for x in ("key", "scientificName", "canonicalName", "rank", "authorship", "taxonomicStatus", "datasetKey")}
        except Exception:
            time.sleep(1.0 * (i + 1))
    return k, None

def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    todo = [k for k in keys() if k not in cache or cache[k] is None]
    print("keys", len(keys()), "todo", len(todo), flush=True)
    with ThreadPoolExecutor(6) as ex:
        for i, (k, r) in enumerate(ex.map(fetch, todo)):
            cache[k] = r
            if i % 300 == 299: json.dump(cache, open(CACHE, "w")); print(i + 1, flush=True)
    json.dump(cache, open(CACHE, "w"))
    print("fetched", sum(1 for v in cache.values() if v), "null", sum(1 for v in cache.values() if not v))

if __name__ == "__main__":
    main()
