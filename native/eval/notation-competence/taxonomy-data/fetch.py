#!/usr/bin/env python3
"""fetch.py: TreatmentBank (Plazi) sampler for the taxonomy notation family.

Source   : https://tb.plazi.org/GgServer  (Plazi TreatmentBank; treatment XML + search index)
License  : CC0 public-domain dedication, stated by Plazi (plazi.org footer: "Published under CC0 Public Domain Dedication";
           Zenodo/BLR treatment deposits carry license cc-zero, spot-checked by license_check below).
Politeness: <= 4 parallel connections, 0.25 s pause per worker, identified User-Agent, resumable (existing files are kept).
Split    : BY SOURCE = journal. Every treatment of a journal goes to exactly one split (manifest-checked).
Sampling : per (journal, year) the search returns the first <=500 index hits; the sample is seeded-random inside the pooled hits.
Writes   : raw/index.json (every hit seen), raw/<split>.jsonl.gz ({docId, journal, origin, year, xml}), manifest.json,
           raw/license_check.json (Zenodo record license for a random sample of fetched treatments per journal).
"""
import gzip, json, os, random, re, sys, time, hashlib, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
RAW = f"{ROOT}/raw"
UA = "khora-notation-taxonomy/1.0 (research use; contact michael.t.lacy@gmail.com)"
SEED = 20261006

# SPLIT BY SOURCE (journal). Declared before any reading. quota = treatments sampled per journal.
JOURNALS = {
    "train": [("ZooKeys", 700), ("PhytoKeys", 450), ("Biodiversity Data Journal", 450), ("MycoKeys", 250)],
    "dev":   [("European Journal of Taxonomy", 350), ("Adansonia", 120), ("Linzer biologische Beiträge", 230)],
    "test":  [("Zootaxa", 450), ("Phytotaxa", 250), ("Papéis Avulsos de Zoologia", 150), ("Blumea", 150), ("Revue suisse de Zoologie", 100)],
}
YEARS = list(range(2008, 2026))

def get(url, params=None, retries=4, timeout=120):
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    for k in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            time.sleep(1.5 * (k + 1))
    return None

def search(journal, year):
    q = {"resultFormat": "xml", "indexName": "0", "minSubResultSize": "1", "docType": "treatment",
         "BibMetaData.docOrigin": journal + "*", "BibMetaData.docDate": str(year)}
    b = get("https://tb.plazi.org/GgServer/search", q)
    if not b:
        return []
    s = b.decode("utf8", "replace")
    out = []
    for m in re.finditer(r'<document ([^>]*)>', s):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if a.get("docType") == "treatment":
            out.append({"docId": a["docId"], "origin": a.get("docOrigin", ""), "year": a.get("docDate", ""), "title": a.get("docTitle", "")})
    return out

def main():
    os.makedirs(RAW, exist_ok=True)
    idx_path = f"{RAW}/index.json"
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    jobs = [(sp, j, y) for sp, js in JOURNALS.items() for j, _ in js for y in YEARS if f"{j}|{y}" not in index]
    def run(job):
        sp, j, y = job
        hits = search(j, y)
        time.sleep(0.25)
        return f"{j}|{y}", hits
    with ThreadPoolExecutor(4) as ex:
        for key, hits in ex.map(run, jobs):
            index[key] = hits
    json.dump(index, open(idx_path, "w"))
    print("index buckets", len(index), "hits", sum(len(v) for v in index.values()), flush=True)

    rng = random.Random(SEED)
    manifest = {"seed": SEED, "fetched": time.strftime("%Y-%m-%d"), "splits": {}, "journals": {}}
    chosen = {}
    seen = set()
    for sp, js in JOURNALS.items():
        for j, quota in js:
            pool = []
            for y in YEARS:
                for h in index.get(f"{j}|{y}", []):
                    if h["docId"] not in seen:
                        pool.append(h)
            pool = sorted({h["docId"]: h for h in pool}.values(), key=lambda h: h["docId"])
            rng.shuffle(pool)
            take = pool[:quota]
            for h in take:
                seen.add(h["docId"])
            chosen[(sp, j)] = take
            manifest["journals"][j] = {"split": sp, "quota": quota, "pool": len(pool), "taken": len(take)}
    # fetch XML
    for sp in JOURNALS:
        path = f"{RAW}/{sp}.jsonl.gz"
        have = {}
        if os.path.exists(path):
            with gzip.open(path, "rt", encoding="utf8") as f:
                for line in f:
                    d = json.loads(line); have[d["docId"]] = d
        todo = [(j, h) for (s, j), hs in chosen.items() if s == sp for h in hs if h["docId"] not in have]
        print(sp, "have", len(have), "todo", len(todo), flush=True)
        def fx(item):
            j, h = item
            b = get(f"https://tb.plazi.org/GgServer/xml/{h['docId']}")
            time.sleep(0.25)
            return None if b is None else {"docId": h["docId"], "journal": j, "origin": h["origin"], "year": h["year"], "title": h["title"], "xml": b.decode("utf8", "replace")}
        n = 0
        with ThreadPoolExecutor(4) as ex:
            for d in ex.map(fx, todo):
                if d: have[d["docId"]] = d
                n += 1
                if n % 200 == 0: print(sp, n, flush=True)
        with gzip.open(path + ".tmp", "wt", encoding="utf8") as f:
            for d in have.values():
                f.write(json.dumps(d, ensure_ascii=False) + "\n")
        os.replace(path + ".tmp", path)
        manifest["splits"][sp] = {"n": len(have), "bytes_gz": os.path.getsize(path), "sha256": hashlib.sha256(open(path, "rb").read()).hexdigest()}
    json.dump(manifest, open(f"{ROOT}/manifest.json", "w"), indent=1, ensure_ascii=False)
    print(json.dumps(manifest, indent=1, ensure_ascii=False)[:3000])

if __name__ == "__main__":
    main()
