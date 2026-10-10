#!/usr/bin/env python3
"""Fetch the selected DOT files (exact blob by git sha via the GitHub blobs API, read-only) from the permissively licensed, non-fork repos found by
dot_search.py, verify each blob's git sha1, write raw/dot/<repo>/<file> and raw/dot-corpus.json (split by REPOSITORY: sha1(repo) mod 10: 0-5 train, 6-7 dev, 8-9 test).
pydot's own test graphs (MIT per its REUSE.toml, one source) are added as a train source."""
import json, subprocess, hashlib, os, sys, re, time, base64
BASE = "/private/tmp/claude-501/notation/uml_bpmn"
RAW = f"{BASE}/raw"
meta = json.load(open(f"{RAW}/dot-search.json"))
PER_REPO = 4
H = lambda s: hashlib.sha1(s.encode()).hexdigest()
def split_of(repo):
    k = int(H(repo)[:8], 16) % 10
    return "train" if k <= 5 else ("dev" if k <= 7 else "test")
def gh_blob(repo, sha):
    r = subprocess.run(["gh", "api", f"repos/{repo}/git/blobs/{sha}", "-H", "Accept: application/vnd.github.raw+json"], capture_output=True)
    return r.stdout if r.returncode == 0 else None
docs = []
os.makedirs(f"{RAW}/dot", exist_ok=True)
repos = sorted(meta, key=lambda r: H(r))
n_fetch = 0
for repo in repos:
    m = meta[repo]
    files = sorted(m["files"], key=lambda f: H(f["path"]))
    got = 0
    for f in files:
        if got >= PER_REPO: break
        if not re.search(r"\.(dot|gv)$", f["path"], re.I): continue
        b = gh_blob(repo, f["sha"]); n_fetch += 1
        if b is None: continue
        if not (100 <= len(b) <= 60_000): continue
        gitsha = hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()
        if gitsha != f["sha"]: continue
        slug = repo.replace("/", "__")
        os.makedirs(f"{RAW}/dot/{slug}", exist_ok=True)
        fname = f"{H(f['path'])[:10]}.dot"
        open(f"{RAW}/dot/{slug}/{fname}", "wb").write(b)
        docs.append(dict(id=f"dot-{slug}-{fname[:-4]}", file=f"{slug}/{fname}", repo=repo, path=f["path"], license=m["license"], blob_sha=f["sha"], branch=m["branch"], split=split_of(repo),
                         url=f"https://github.com/{repo}/blob/{m['branch']}/{f['path']}"))
        got += 1
    if n_fetch % 50 == 0: print("fetched", n_fetch, "docs", len(docs), flush=True)
# pydot's own test graphs (one source, train)
sel = json.load(open(f"{RAW}/selection.json"))
for p in sel["pydot"]["dot"]:
    f = f"{RAW}/git/pydot/{p}"
    if not os.path.exists(f): continue
    b = open(f, "rb").read()
    if not (100 <= len(b) <= 60_000): continue
    slug = "pydot__pydot"; os.makedirs(f"{RAW}/dot/{slug}", exist_ok=True)
    fname = f"{H(p)[:10]}.dot"
    open(f"{RAW}/dot/{slug}/{fname}", "wb").write(b)
    docs.append(dict(id=f"dot-{slug}-{fname[:-4]}", file=f"{slug}/{fname}", repo="pydot/pydot", path=p, license="MIT", blob_sha=None, branch="main", split="train",
                     url=f"https://github.com/pydot/pydot/blob/main/{p}"))
json.dump(dict(fetched="2026-10-06", split_rule="sha1(repo) mod 10: 0-5 train, 6-7 dev, 8-9 test; pydot/pydot is train", per_repo=PER_REPO, docs=docs), open(f"{RAW}/dot-corpus.json", "w"), indent=0)
print("DONE docs", len(docs), "repos", len({d['repo'] for d in docs}))
