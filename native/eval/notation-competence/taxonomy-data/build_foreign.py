#!/usr/bin/env python3
"""build_foreign.py: the STRANGER pool for R0 (identify the system from content alone).

Strangers are real text that is NOT taxonomic nomenclature. Each stream is W=60 whitespace words cut at a seeded random word offset.
Kinds and sources (all local files already on this machine, each with its own provenance; nothing is fetched here):
  prose_en    English prose: ethos/01-literature-books/gutenberg (public domain, Project Gutenberg) + ethos/05-academic-papers/ntrs-white-papers (NASA, public domain)
  prose_xx    non-English prose: ethos 11-multi-language/{german,french,italian,latin}-originals + wikipedia-lang (CC BY-SA)
  legal       ethos/06-government-legal/world-legislation + un-udhr (public documents)
  code        ethos/09-source-code/<repo> (permissive licences; split by repository)
  chess_pgn   sibling family corpus /private/tmp/claude-501/notation/chess_pgn/corpus/<split>/games.jsonl (Lichess CC0 / CC BY-SA)
  smiles      sibling family corpus chem_smiles/corpus/<split>.json  (records[].smiles)
  chem_names  the same records' IUPAC-style names (a notation that LOOKS like names)
  dna         genetic/raw/fasta/*.fna.gz sequence lines only (no headers: headers carry organism binomials)
  abc         music_abc/derived/*.abc lines
EXCLUDED on purpose: The Origin of Species, Moby Dick and any encyclopedic or Wikipedia article about organisms (they contain binomials).
SPLIT BY SOURCE: a source (file / repository) goes to exactly one of train/dev/test by md5 bucket (50/25/25); sibling corpora keep their own split.
Output: corpus/foreign/{train,dev,test}.jsonl.gz {kind, source, split, text, words}.
"""
import gzip, hashlib, json, os, random, re, glob

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
ETHOS = "/Users/mlacy/Documents/3.0/ethos"
NOT = "/private/tmp/claude-501/notation"
W = 60
SEED = 20261006
PER_SOURCE = 8
CAP = {"train": 140, "dev": 110, "test": 130}

def bucket(src):
    h = int(hashlib.md5(src.encode()).hexdigest()[:8], 16) % 100
    return "train" if h < 50 else "dev" if h < 75 else "test"

def windows(text, rng, n, w=W):
    words = text.split()
    if len(words) < w + 5: return []
    out = []
    for _ in range(n):
        s = rng.randrange(0, len(words) - w)
        out.append(" ".join(words[s:s + w]))
    return out

def read(path):
    try:
        return open(path, encoding="utf8", errors="replace").read()
    except Exception:
        return ""

def main():
    rng = random.Random(SEED)
    pool = {"train": [], "dev": [], "test": []}
    def add(kind, src, texts, split=None):
        sp = split or bucket(src)
        for t in texts: pool[sp].append({"kind": kind, "source": src, "split": sp, "text": t, "words": len(t.split())})

    skip = ("pg62168", "pg2701", "eot.json", "structure.json", "Iliad", "Aeneid")
    # prose_en
    for p in sorted(glob.glob(f"{ETHOS}/01-literature-books/gutenberg/*.txt")):
        b = os.path.basename(p)
        if any(s in b for s in skip) or any(k in b for k in ("French", "German", "Spanish", "Italian", "Latin", "Greek", "Divine_Comedy")): continue
        add("prose_en", "gutenberg/" + b, windows(read(p), rng, PER_SOURCE))
    for p in sorted(glob.glob(f"{ETHOS}/05-academic-papers/ntrs-white-papers/*.txt"))[:80]:
        b = os.path.basename(p)
        if b.endswith("structure.json"): continue
        add("prose_en", "ntrs/" + b, windows(read(p), rng, 3))
    # prose_xx
    for d in ("german-originals", "french-originals", "italian-originals", "latin-originals"):
        for p in sorted(glob.glob(f"{ETHOS}/11-multi-language/{d}/*.txt")):
            b = os.path.basename(p)
            if b.endswith("structure.json"): continue
            add("prose_xx", f"{d}/{b}", windows(read(p), rng, PER_SOURCE))
    for p in sorted(glob.glob(f"{ETHOS}/11-multi-language/wikipedia-lang/*/*.txt")):
        add("prose_xx", "wikipedia-lang/" + "/".join(p.split("/")[-2:]), windows(read(p), rng, 4))
    for p in sorted(glob.glob(f"{ETHOS}/11-multi-language/gutenberg-non-en/*.txt"))[:0]:
        pass
    # legal
    for p in sorted(glob.glob(f"{ETHOS}/06-government-legal/world-legislation/*/*.md"))[:200]:
        add("legal", "legislation/" + "/".join(p.split("/")[-2:]), windows(read(p), rng, 2))
    for p in sorted(glob.glob(f"{ETHOS}/06-government-legal/un-udhr/udhr-*.txt"))[:120]:
        b = os.path.basename(p)
        if b.endswith("json"): continue
        add("legal", "udhr/" + b, windows(read(p), rng, 1, w=40))
    # code (by repository)
    for repo in sorted(os.listdir(f"{ETHOS}/09-source-code")):
        rp = f"{ETHOS}/09-source-code/{repo}"
        if not os.path.isdir(rp): continue
        files = []
        for dp, dn, fn in os.walk(rp):
            for f in fn:
                if re.search(r"\.(c|h|go|py|js|ts|rs|java|rb|cpp|cc|zig|hs|sh)$", f): files.append(os.path.join(dp, f))
        files.sort()
        rng.shuffle(files)
        texts = []
        for f in files[:8]:
            texts += windows(read(f), rng, 6)
        add("code", "code/" + repo, texts)
    # sibling notation corpora (own splits)
    for sp in ("train", "dev", "test"):
        p = f"{NOT}/chess_pgn/corpus/{sp}/games.jsonl"
        if os.path.exists(p):
            games = []
            with open(p, encoding="utf8") as f:
                for i, line in enumerate(f):
                    if i > 400: break
                    try: d = json.loads(line)
                    except Exception: continue
                    games.append(d.get("text") or d.get("pgn") or "")
            blob = "\n".join(games)
            add("chess_pgn", f"chess_pgn/{sp}", windows(blob, rng, 40), split=sp)
        p = f"{NOT}/chem_smiles/corpus/{sp}.json"
        if os.path.exists(p):
            d = json.load(open(p, encoding="utf8"))
            recs = d["records"]
            add("smiles", f"chem_smiles/{sp}", windows(" ".join(r["smiles"] for r in recs if r.get("smiles")), rng, 40), split=sp)
            add("chem_names", f"chem_smiles/{sp}/names", windows(" ".join((r.get("name") or "").replace(" ", "_") for r in recs if r.get("name")), rng, 40), split=sp)
    for p in sorted(glob.glob(f"{NOT}/genetic/raw/fasta/*.fna.gz"))[:12]:
        txt = gzip.open(p, "rt", errors="replace").read()
        txt = "\n".join(l for l in txt.split("\n") if not l.startswith(">"))
        add("dna", "genetic/" + os.path.basename(p), windows(txt, rng, 24, w=W))
    for p in sorted(glob.glob(f"{NOT}/music_abc/derived/*.abc"))[:200]:
        add("abc", "abc/" + os.path.basename(p), windows(read(p), rng, 1, w=40))
    out = {}
    for sp in pool:
        by = {}
        for r in pool[sp]: by.setdefault(r["kind"], []).append(r)
        keep = []
        for k, rs in sorted(by.items()):
            rng.shuffle(rs)
            keep += rs[:CAP[sp]]
        out[sp] = keep
    os.makedirs(f"{ROOT}/corpus/foreign", exist_ok=True)
    summary = {}
    for sp, rs in out.items():
        with gzip.open(f"{ROOT}/corpus/foreign/{sp}.jsonl.gz", "wt", encoding="utf8") as f:
            for r in rs: f.write(json.dumps(r, ensure_ascii=False) + "\n")
        c = {}
        for r in rs: c.setdefault(r["kind"], [0, set()]); c[r["kind"]][0] += 1; c[r["kind"]][1].add(r["source"])
        summary[sp] = {k: {"streams": v[0], "sources": len(v[1])} for k, v in c.items()}
    json.dump(summary, open(f"{ROOT}/corpus/foreign/summary.json", "w"), indent=1)
    print(json.dumps(summary, indent=1))

if __name__ == "__main__":
    main()
