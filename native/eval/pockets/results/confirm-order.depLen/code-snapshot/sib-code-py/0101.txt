#!/usr/bin/env python3
"""gbif_match.py: the THIRD independent authority for uninomial gold: the GBIF Backbone Taxonomy (CC BY 4.0, https://api.gbif.org/v1/species/match).
For every distinct uninomial (genus or higher) the Plazi curators and gnparser agreed on, ask the Backbone whether the name exists (matchType EXACT)
and at which rank. Used by build_gold.py to turn "Perennials", "Branchlets", "Cataphylls" (curator mark-up slips that gnparser happily parses) into
NEUTRAL spans, and to give each uninomial a rank class from the Backbone, which must agree with the curators' rank to stay gold.
Cache: raw/gbif_uninomial.json {name: {matchType, rank, status, usageKey, canonicalName, confidence}}; resumable; <= 6 parallel requests.
"""
import gzip, json, os, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
UA = "khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)"
CACHE = f"{ROOT}/raw/gbif_uninomial.json"

def names():
    out = set()
    for split in ("train", "dev", "test"):
        p = f"{ROOT}/gold/{split}.gold.jsonl.gz"
        if not os.path.exists(p): continue
        with gzip.open(p, "rt", encoding="utf8") as f:
            for line in f:
                for m in json.loads(line)["mentions"]:
                    if m.get("status") == "gold" and m.get("kind") in ("genus", "higher"): out.add(m["id"])
    return sorted(out)

def query(n):
    url = "https://api.gbif.org/v1/species/match?" + urllib.parse.urlencode({"name": n, "strict": "true", "verbose": "false"})
    for k in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            r = json.loads(urllib.request.urlopen(req, timeout=60).read())
            return n, {k2: r.get(k2) for k2 in ("matchType", "rank", "status", "usageKey", "canonicalName", "confidence")}
        except Exception as e:
            time.sleep(1.0 * (k + 1))
    return n, None

def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    todo = [n for n in names() if n not in cache or cache[n] is None]
    print("uninomials", len(names()), "todo", len(todo), flush=True)
    done = 0
    with ThreadPoolExecutor(6) as ex:
        for n, r in ex.map(query, todo):
            cache[n] = r; done += 1
            if done % 500 == 0:
                json.dump(cache, open(CACHE, "w")); print(done, flush=True)
    json.dump(cache, open(CACHE, "w"))
    c = {}
    for v in cache.values():
        k = (v or {}).get("matchType", "error"); c[k] = c.get(k, 0) + 1
    print(c)

if __name__ == "__main__":
    main()
