#!/usr/bin/env python3
"""adjudicate.py: GBIF Backbone adjudication of the reader's R3 false positives (a seeded sample of DISTINCT ids), per kind group.
Input  results/<split>-fps.json (dump-fps.mjs).  Output results/<split>-adjudication.json.
A false positive whose id the Backbone knows (matchType EXACT) is a real name the curators did not tag: gold incompleteness, not a reading error.
Abbreviated, unresolved ids ("P. concolor") cannot be adjudicated and are counted apart."""
import json, os, random, sys, time, urllib.parse, urllib.request, collections
from concurrent.futures import ThreadPoolExecutor

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
UA = "khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)"
split = sys.argv[1] if len(sys.argv) > 1 else "dev"
N = {"bin": 400, "uni": 300}
fps = json.load(open(f"{ROOT}/results/{split}-fps.json"))
rng = random.Random(11)

def group(k): return "bin" if k in ("species", "infraspecific") else "uni"

def q(name):
    url = "https://api.gbif.org/v1/species/match?" + urllib.parse.urlencode({"name": name, "strict": "true", "verbose": "false"})
    for i in range(4):
        try:
            r = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read())
            return name, {k: r.get(k) for k in ("matchType", "rank", "status", "canonicalName")}
        except Exception:
            time.sleep(1 + i)
    return name, None

res = {"split": split, "fp_total": len(fps), "groups": {}}
for g in ("bin", "uni"):
    rows = [x for x in fps if group(x["kind"]) == g]
    unresolved = [x for x in rows if not x["resolved"]]
    ids = sorted({x["id"] for x in rows if x["resolved"]})
    sample = rng.sample(ids, min(N[g], len(ids)))
    with ThreadPoolExecutor(6) as ex: out = dict(ex.map(q, sample))
    c = collections.Counter((out[i] or {}).get("matchType", "error") for i in sample)
    exact = [i for i in sample if (out[i] or {}).get("matchType") == "EXACT"]
    res["groups"][g] = {"fp_mentions": len(rows), "unresolved_abbrev_mentions": len(unresolved), "distinct_resolved_ids": len(ids), "sampled": len(sample), "match_types": dict(c),
                        "share_known_to_backbone": round(len(exact) / max(1, len(sample)), 4), "examples_known": exact[:12], "examples_unknown": [i for i in sample if i not in exact][:12]}
json.dump(res, open(f"{ROOT}/results/{split}-adjudication.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(res, indent=1, ensure_ascii=False))
