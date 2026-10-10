#!/usr/bin/env python3
"""build_units.py — corpus step 1: raw sources -> normalized sentences, SPLIT BY SOURCE, TRAIN text for priors.
Sources (all fetched once, see PROVENANCE.md). Split assigned BEFORE any measurement, by genre spread:
  train: pride-and-prejudice, moby-dick, origin-of-species, tale-of-two-cities
  dev  : frankenstein, on-liberty
  test : sherlock-holmes, dracula, art-of-war, time-machine, un-udhr-1948
No sentence of any dev/test source is used to build any prior. Units per dev/test source: <= UNITS_PER_SOURCE
(seeded sample over the encodable sentences, kept in book order)."""
import re, json, random, hashlib, os, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from cc_norm import norm, sentences, encodable
ROOT = "/private/tmp/claude-501/notation/closed_codes"
RAW = f"{ROOT}/raw/gutenberg"
SPLIT = {
  "pride-and-prejudice": "train", "moby-dick": "train", "origin-of-species": "train", "tale-of-two-cities": "train",
  "frankenstein": "dev", "on-liberty": "dev",
  "sherlock-holmes": "test", "dracula": "test", "art-of-war": "test", "time-machine": "test", "un-udhr-1948": "test",
}
FILES = {"pride-and-prejudice": "pg1342-pride-and-prejudice.txt", "moby-dick": "pg2701-moby-dick.txt",
         "origin-of-species": "pg1228-origin-of-species.txt", "tale-of-two-cities": "pg98-tale-of-two-cities.txt",
         "frankenstein": "pg84-frankenstein.txt", "on-liberty": "pg34901-on-liberty.txt",
         "sherlock-holmes": "pg1661-sherlock-holmes.txt", "dracula": "pg345-dracula.txt",
         "art-of-war": "pg132-art-of-war.txt", "time-machine": "pg35-time-machine.txt"}
UNITS_PER_SOURCE = 200
SEED = 20261006
def strip_pg(t):
    a = re.search(r"\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n", t)
    b = re.search(r"\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK", t)
    return t[a.end(): b.start()] if a and b else t
def paragraphs(t):
    t = t.replace("\r\n", "\n")
    for para in re.split(r"\n\s*\n", t):
        yield re.sub(r"\s+", " ", para).strip()
def body_of(slug):
    if slug == "un-udhr-1948":
        h = open(f"{ROOT}/raw/un_udhr_en.html", encoding="utf-8").read()
        h = re.sub(r"<script.*?</script>|<style.*?</style>", "", h, flags=re.S)
        h = re.sub(r"<(br|/p|/h\d|/li|/div)[^>]*>", "\n\n", h)
        h = html.unescape(re.sub(r"<[^>]+>", " ", h))
        i = h.find("Preamble"); j = h.find("Article 30")
        j = h.find("\n", h.find("Nothing in this Declaration", j)) if j >= 0 else len(h)
        return h[i:j]
    return strip_pg(open(f"{RAW}/{FILES[slug]}", encoding="utf-8", errors="replace").read())
manifest = {"seed": SEED, "units_per_source": UNITS_PER_SOURCE, "normal_form": "scripts/cc_norm.py", "sources": {}}
os.makedirs(f"{ROOT}/corpus/train", exist_ok=True); os.makedirs(f"{ROOT}/corpus/units", exist_ok=True)
units = {"dev": [], "test": []}
for slug, split in SPLIT.items():
    body = body_of(slug)
    sents = []
    for para in paragraphs(body):
        for s in sentences(para):
            n = norm(s)
            if n: sents.append(n)
    ok = []
    rej = {}
    for i, n in enumerate(sents):
        good, why = encodable(n)
        if good: ok.append((i, n))
        else: rej[why] = rej.get(why, 0) + 1
    rec = {"split": split, "sentences": len(sents), "encodable": len(ok), "rejected_by": rej, "chars": sum(len(x) for x in sents)}
    if split == "train":
        # priors are built from the WHOLE normalized TRAIN text (every sentence, not only the encodable ones)
        with open(f"{ROOT}/corpus/train/{slug}.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(sents) + "\n")
        rec["train_file"] = f"corpus/train/{slug}.txt"
    else:
        rng = random.Random(f"{SEED}:{slug}")
        take = ok if len(ok) <= UNITS_PER_SOURCE else sorted(rng.sample(ok, UNITS_PER_SOURCE))
        for k, (i, n) in enumerate(take):
            units[split].append({"id": f"{slug}:{i}", "source": slug, "split": split, "idx": i, "text": n})
        rec["units"] = len(take)
    if slug in FILES:
        rec["raw_sha256"] = hashlib.sha256(open(f"{RAW}/{FILES[slug]}", "rb").read()).hexdigest()
    else:
        rec["raw_sha256"] = hashlib.sha256(open(f"{ROOT}/raw/un_udhr_en.html", "rb").read()).hexdigest()
    manifest["sources"][slug] = rec
for split in ("dev", "test"):
    with open(f"{ROOT}/corpus/units/{split}.jsonl", "w", encoding="utf-8") as f:
        for u in units[split]: f.write(json.dumps(u, ensure_ascii=False) + "\n")
manifest["units"] = {k: len(v) for k, v in units.items()}
json.dump(manifest, open(f"{ROOT}/manifest.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(json.dumps(manifest, indent=1)[:4000])
