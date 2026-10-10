#!/usr/bin/env python3
"""license_check.py: PROVENANCE evidence. For a seeded sample of fetched treatments per journal, read the <treatment> element's own ID-Zenodo-Dep attribute (the treatment deposit, not the article deposit) and ask the
Zenodo record API (Biodiversity Literature Repository) which licence the deposit carries. Writes raw/license_check.json. Never fetches the treatment text again."""
import gzip, json, os, random, re, time, urllib.request, collections

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
UA = "khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)"
rng = random.Random(7)
out = {}
for split in ("train", "dev", "test"):
    by = collections.defaultdict(list)
    with gzip.open(f"{ROOT}/raw/{split}.jsonl.gz", "rt", encoding="utf8") as f:
        for line in f:
            d = json.loads(line)
            t = re.search(r'<treatment [^>]*>', d["xml"])
            m = re.search(r'ID-Zenodo-Dep="(\d+)"', t.group(0)) if t else None   # the TREATMENT's own deposit (the document-level one is the article)
            a = re.search(r'ID-Zenodo-Dep="(\d+)"', d["xml"])
            by[d["journal"]].append((d["docId"], m.group(1) if m else None, a.group(1) if a else None))
    for j, items in by.items():
        withdep = [i for i in items if i[1]]
        sample = rng.sample(withdep, min(20, len(withdep)))
        res = collections.Counter(); ex = []
        for docId, dep, art in sample:
            try:
                req = urllib.request.Request(f"https://zenodo.org/api/records/{dep}", headers={"User-Agent": UA})
                r = json.loads(urllib.request.urlopen(req, timeout=60).read())
                lic = (r.get("metadata", {}).get("license") or {}).get("id") or str(r.get("metadata", {}).get("rights"))
            except Exception as e:
                lic = "error:" + type(e).__name__
            res[lic] += 1
            if len(ex) < 2: ex.append(dep)
            time.sleep(0.4)
        out[j] = {"split": split, "docs": len(items), "with_treatment_zenodo_dep": len(withdep), "sampled": len(sample), "treatment_deposit_licenses": dict(res), "example_deposits": ex}
        print(j, out[j], flush=True)
json.dump(out, open(f"{ROOT}/raw/license_check.json", "w"), indent=1, ensure_ascii=False)
