#!/usr/bin/env python3
"""
inventory_local.py -- map the existing ethos/09-source-code material onto the 51 target languages.

Declared (not tuned): extension map = langmap.EXT; a collected-document suffix ".txt" is peeled once
when the remaining extension is mapped (the ethos collector appended .txt to docs: "x.md.txt").
Directory name "<owner>_<repo>" -> "<owner>/<repo>" (split on the FIRST underscore).
Licences: read from PROVENANCE.md front matter when present, else the KNOWN UPSTREAM licence
(declared in LOCAL_KNOWN_LICENSE below, labelled license_source=known-upstream-unverified-locally).
Output: /private/tmp/claude-501/code-corpus/local-inventory.json (+ stdout table).
"""
import json, os, re, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L

ROOT = "/Users/mlacy/Documents/3.0/ethos/09-source-code"
OUT = "/private/tmp/claude-501/code-corpus/local-inventory.json"

# Known upstream licence of each local landmark-tier repo (their directories carry no LICENSE file; see VETTING.md "Licence gaps").
LOCAL_KNOWN_LICENSE = {
    "BurntSushi/ripgrep": "unlicense/mit", "denoland/deno": "mit", "ggerganov/llama.cpp": "mit", "ghc/ghc": "bsd-3-clause",
    "godotengine/godot": "mit", "golang/go": "bsd-3-clause", "microsoft/TypeScript": "apache-2.0", "pallets/flask": "bsd-3-clause",
    "postgres/postgres": "postgresql", "rails/rails": "mit", "sharkdp/bat": "mit/apache-2.0", "sqlite/sqlite": "public-domain",
    "tiangolo/fastapi": "mit", "torvalds/linux": "gpl-2.0-only", "ziglang/zig": "mit", "astral-sh/ruff": "mit",
    "python/cpython": "psf-2.0", "apache/spark": "apache-2.0", "rails/rails ": "mit",
    "clovenbradshaw/bare-metal-eo-matrix-app": "unspecified-own-repo",
}
LICENSE_CLASS = {
    "mit": "permissive", "apache-2.0": "permissive", "bsd-3-clause": "permissive", "bsd-2-clause": "permissive", "isc": "permissive",
    "unlicense/mit": "permissive", "mit/apache-2.0": "permissive", "public-domain": "permissive",
    "curl (mit-style)": "permissive",
    "postgresql": "permissive-not-on-fetch-list", "psf-2.0": "permissive-not-on-fetch-list",
    "gpl-2.0-only": "copyleft-local-read-only", "gpl-2.0": "copyleft-local-read-only", "agpl-3.0": "copyleft-local-read-only",
    "unspecified-own-repo": "own-code-unlicensed-local-only",
}

def read_prov_license(d):
    p = os.path.join(d, "PROVENANCE.md")
    if not os.path.exists(p):
        return None
    t = open(p, encoding="utf-8", errors="replace").read(2000)
    m = re.search(r"^license:\s*(.+)$", t, re.M)
    return m.group(1).strip() if m else None

def repo_of_dir(name):
    o, _, r = name.partition("_")
    return f"{o}/{r}"

def effective_ext(fn):
    e = L.ext_of(fn)
    if e == ".txt":
        base = fn[:-4]
        e2 = L.ext_of(base)
        if e2 in L.EXT:
            return e2, True
    return e, False

def main():
    files = []
    for d in sorted(os.listdir(ROOT)):
        dp = os.path.join(ROOT, d)
        if not os.path.isdir(dp):
            continue
        repo = repo_of_dir(d)
        lic = read_prov_license(dp)
        lic_src = "PROVENANCE.md"
        if not lic:
            lic = LOCAL_KNOWN_LICENSE.get(repo)
            lic_src = "known-upstream-unverified-locally" if lic else "unknown"
        if lic and (lic.lower().startswith("curl") or lic.lower().startswith("bsd")):
            lic_class = "permissive"
        else:
            lic_class = LICENSE_CLASS.get((lic or "").lower(), "unknown")
        if repo == "signalapp/libsignal":
            lic, lic_class = "agpl-3.0", "copyleft-local-read-only"
        if repo == "git/git":
            lic, lic_class = "gpl-2.0", "copyleft-local-read-only"
        for fn in sorted(os.listdir(dp)):
            fp = os.path.join(dp, fn)
            if not os.path.isfile(fp):
                continue
            e, peeled = effective_ext(fn)
            lang = L.EXT.get(e)
            data = open(fp, "rb").read()
            text = data.decode("utf-8", errors="replace")
            nlines = text.count("\n") + 1
            files.append({
                "path": fp, "file": fn, "repo": repo, "ext": e, "txt_peeled": peeled, "language_ext": lang,
                "bytes": len(data), "lines": nlines, "sha256": hashlib.sha256(data).hexdigest(),
                "license": lic, "license_source": lic_src, "license_class": lic_class,
                "split": L.repo_split(repo),
            })
    json.dump(files, open(OUT, "w"), indent=1)
    # summaries
    per_lang, per_repo = {}, {}
    for f in files:
        k = f["language_ext"] or "(unmapped)"
        a = per_lang.setdefault(k, {"files": 0, "bytes": 0, "repos": set()})
        a["files"] += 1; a["bytes"] += f["bytes"]; a["repos"].add(f["repo"])
        b = per_repo.setdefault(f["repo"], {"files": 0, "bytes": 0, "langs": set(), "license": f["license"], "class": f["license_class"], "split": f["split"]})
        b["files"] += 1; b["bytes"] += f["bytes"]; b["langs"].add(k)
    print(f"{len(files)} files in {len(per_repo)} repos")
    print("\nPER LANGUAGE (extension-mapped; unresolved .h/.m etc shown as @x)")
    for k, a in sorted(per_lang.items(), key=lambda kv: -kv[1]["files"]):
        print(f"  {k:12s} files={a['files']:3d} bytes={a['bytes']:8d} repos={len(a['repos'])}")
    print("\nPER REPO")
    for r, b in sorted(per_repo.items()):
        print(f"  {r:42s} files={b['files']:2d} bytes={b['bytes']:7d} split={b['split']:5s} lic={b['license']} [{b['class']}] langs={sorted(b['langs'])}")

if __name__ == "__main__":
    main()
