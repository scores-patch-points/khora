#!/usr/bin/env python3
"""manifest.json := manifest.pre-review-fix.json (the original: positives, near-miss negatives, the 107 ethos negatives) + manifest.negatives.json
(natural, enlarged) + manifest.negatives_authored.json (AUTHORED stress stratum). Idempotent: always starts from the saved original."""
import json, os, shutil, collections
ROOT = "/private/tmp/claude-501/notation/music_abc"
orig = f"{ROOT}/manifest.pre-review-fix.json"
if not os.path.exists(orig): shutil.copy(f"{ROOT}/manifest.json", orig)
man = json.load(open(orig))
ids = {m["id"] for m in man}
for extra in ("manifest.negatives.json", "manifest.negatives_authored.json"):
    p = f"{ROOT}/{extra}"
    if not os.path.exists(p): continue
    for m in json.load(open(p)):
        if m["id"] in ids: continue
        ids.add(m["id"]); man.append(m)
json.dump(man, open(f"{ROOT}/manifest.json", "w"), indent=1)
c = collections.Counter((m["split"], m["role"]) for m in man)
for k, v in sorted(c.items()): print(k, v)
print("total", len(man))
