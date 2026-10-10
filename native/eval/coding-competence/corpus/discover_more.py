#!/usr/bin/env python3
"""
discover_more.py <lang-id>... -- widen the candidate pool for scarce languages (declared before it ran: limit 100 per licence,
stars >= 1, same licence allow-list and archived/fork exclusions as discover.py). Merges NEW repos into pool/search.json and
fetches their trees (read-only). Used for languages where the round-1..4 selection could not reach the declared per-split
diversity (scheme)."""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L
import discover as D
import plan as P

def main():
    langs = sys.argv[1:]
    pool = {e["fullName"]: e for e in json.load(open(D.OUT))}
    new = []
    for lang in langs:
        for nm in D.SEARCH[lang]:
            for lic in D.LICENSES:
                cmd = ["gh", "search", "repos", "--language", nm, "--license", lic, "--stars", ">=1", "--size", "50..150000", "--sort", "stars",
                       "--limit", "100", "--archived=false", "--include-forks=false",
                       "--json", "fullName,license,size,stargazersCount,language,isArchived,isFork,pushedAt"]
                r = subprocess.run(cmd, capture_output=True, text=True)
                if r.returncode != 0:
                    time.sleep(20); continue
                for x in json.loads(r.stdout):
                    lk = (x.get("license") or {}).get("key", "")
                    if lk not in L.FETCH_LICENSES or x.get("isArchived") or x.get("isFork"):
                        continue
                    e = pool.get(x["fullName"])
                    if e is None:
                        e = pool[x["fullName"]] = {"fullName": x["fullName"], "license": lk, "size_kb": x["size"], "stars": x["stargazersCount"],
                                                   "primary_language": x.get("language"), "pushedAt": x.get("pushedAt"), "hints": []}
                        new.append(x["fullName"])
                    if lang not in e["hints"]:
                        e["hints"].append(lang)
                time.sleep(2.5)
    json.dump(sorted(pool.values(), key=lambda x: -x["stars"]), open(D.OUT, "w"), indent=0)
    print(f"new repos: {len(new)}")
    for n in new:
        P.fetch_tree(n)
    print("trees fetched")

if __name__ == "__main__":
    main()
