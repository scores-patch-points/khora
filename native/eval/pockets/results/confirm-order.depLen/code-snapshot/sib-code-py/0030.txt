#!/usr/bin/env python3
"""
fetch.py -- materialise the selected (repo, path) sets from plan.json.

Per repo (permissively licensed, selected by plan.py):
    git clone --depth 1 --filter=blob:none --no-checkout https://github.com/<owner>/<repo>.git raw/<owner>_<repo>
    git sparse-checkout set --no-cone --stdin   # exact planned paths + root licence files
    git checkout
A blob-less shallow clone with an exact-path sparse checkout downloads only the planned blobs (the task's disk budget:
~900 MB). Nothing downloaded is executed; files are read as text by build_manifest.py.
Records per repo (raw/_meta/<owner>_<repo>.json): url, commit SHA, branch, commit date, fetch date (UTC), root licence
files, detected licence family from the licence TEXT, GitHub-reported licence key, and whether they agree.
A repo whose licence text does not verify as a permissive allow-listed family is marked license_ok=false and is
EXCLUDED by build_manifest.py (its checkout may stay on disk but never enters the manifest).
"""
import json, os, re, subprocess, sys, time, datetime, shutil
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L

BASE = "/private/tmp/claude-501/code-corpus"
RAW = f"{BASE}/raw"
META = f"{RAW}/_meta"
PLAN = f"{BASE}/pool/plan.json"
LIC_NAME = re.compile(r"^((mit|apache|bsd|isc)[-_.])?(licen[cs]e|copying|unlicense)([._-][\w.-]*)?$", re.I)

def lic_family(text):
    t = " ".join(text.split())
    tl = t.lower()
    if "gnu general public license" in tl or "gnu affero" in tl or "gnu lesser general" in tl or "mozilla public license" in tl or "eclipse public license" in tl:
        # dual-licensed repos may also carry MIT/Apache; a GPL-family text in the root licence file is a refusal
        return "copyleft"
    if "apache license" in tl and "version 2.0" in tl:
        return "apache-2.0"
    if "this is free and unencumbered software released into the public domain" in tl:
        return "unlicense"
    if "creative commons" in tl and "cc0" in tl:
        return "cc0-1.0"
    if "permission is hereby granted, free of charge" in tl:
        return "mit"
    if "permission to use, copy, modify, and/or distribute this software for any purpose with or without fee" in tl or \
       "permission to use, copy, modify, and distribute this software for any purpose with or without fee" in tl:
        return "isc" if "isc" in tl or "and/or" in tl else "isc"
    if "redistribution and use in source and binary forms" in tl:
        return "bsd-3-clause" if "neither the name" in tl or "may be used to endorse" in tl else "bsd-2-clause"
    if "creative commons attribution" in tl:
        return "cc-by-family"
    return "unrecognised"

GIT_ENV = dict(os.environ, GIT_TERMINAL_PROMPT="0", GIT_ASKPASS="true")

def run(cmd, cwd=None, timeout=900):
    # public repositories only: no credential helper is consulted (no account credentials ever reach a clone)
    if cmd and cmd[0] == "git":
        cmd = ["git", "-c", "credential.helper="] + cmd[1:]
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=GIT_ENV)

def fetch_repo(args):
    name, info = args
    dirn = name.replace("/", "_")
    dest = f"{RAW}/{dirn}"
    mp = f"{META}/{dirn}.json"
    if os.path.exists(mp):
        return name, "cached"
    url = f"https://github.com/{name}.git"
    if os.path.exists(dest):
        shutil.rmtree(dest, ignore_errors=True)
    r = run(["git", "clone", "-q", "--depth", "1", "--filter=blob:none", "--no-checkout", url, dest])
    for _retry in range(2):
        if r.returncode == 0:
            break
        shutil.rmtree(dest, ignore_errors=True)
        time.sleep(8)
        r = run(["git", "clone", "-q", "--depth", "1", "--filter=blob:none", "--no-checkout", url, dest])
    if r.returncode != 0:
        json.dump({"repo": name, "error": "clone-failed", "stderr": r.stderr[:300]}, open(mp, "w"))
        return name, "clone-failed"
    sha = run(["git", "rev-parse", "HEAD"], cwd=dest).stdout.strip()
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=dest).stdout.strip()
    cdate = run(["git", "log", "-1", "--format=%cI"], cwd=dest).stdout.strip()
    root = run(["git", "ls-tree", "--name-only", "HEAD"], cwd=dest).stdout.splitlines()
    lic_files = [f for f in root if LIC_NAME.match(f)]
    pats = set()
    for lang, pr in info["pairs"].items():
        for p in pr["paths"]:
            pats.add("/" + p)
    for f in lic_files:
        pats.add("/" + f)
    run(["git", "sparse-checkout", "init", "--no-cone"], cwd=dest)
    sp = subprocess.run(["git", "-c", "credential.helper=", "sparse-checkout", "set", "--no-cone", "--stdin"], cwd=dest, input="\n".join(sorted(pats)) + "\n",
                        capture_output=True, text=True, timeout=900, env=GIT_ENV)
    co = run(["git", "checkout"], cwd=dest, timeout=1500)
    for _retry in range(2):
        if co.returncode == 0:
            break
        time.sleep(5)
        co = run(["git", "checkout"], cwd=dest, timeout=1500)
    lic_text, fam = "", None
    for f in lic_files:
        fp = os.path.join(dest, f)
        if os.path.isfile(fp):
            lic_text = open(fp, encoding="utf-8", errors="replace").read()[:6000]
            fam = lic_family(lic_text)
            if fam in ("mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "cc0-1.0", "cc-by-family"):
                break
    reported = info["license"]
    agree = (fam == reported) or (fam in ("bsd-2-clause", "bsd-3-clause") and reported in ("bsd-2-clause", "bsd-3-clause")) or \
            (fam == "cc-by-family" and reported.startswith("cc-by")) or (fam == "isc" and reported in ("isc", "0bsd"))
    ok = bool(lic_files) and fam in ("mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "cc0-1.0", "cc-by-family") and agree
    meta = {"repo": name, "url": url[:-4], "clone": "git clone --depth 1 --filter=blob:none --no-checkout + sparse-checkout(exact paths)",
            "commit": sha, "branch": branch, "commit_date": cdate,
            "fetched_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "github_reported_license": reported, "license_files": lic_files, "license_text_family": fam,
            "license_agree": agree, "license_ok": ok, "checkout_rc": co.returncode, "sparse_rc": sp.returncode,
            "split": info["split"], "stars": info["stars"], "primary_language": info["primary_language"],
            "pairs": {l: len(p["paths"]) for l, p in info["pairs"].items()}}
    json.dump(meta, open(mp, "w"), indent=1)
    # the blob-less .git only holds trees + fetched blobs; keep the working tree, drop .git to respect the disk budget
    shutil.rmtree(os.path.join(dest, ".git"), ignore_errors=True)
    return name, "ok" if ok else f"license-not-verified:{fam}/{reported}"

def main():
    only = sys.argv[1:]  # optional repo names
    plan = json.load(open(PLAN))
    os.makedirs(META, exist_ok=True)
    jobs = [(n, i) for n, i in plan["repos"].items() if not only or n in only]
    print(f"fetching {len(jobs)} repos", flush=True)
    t0 = time.time()
    stat = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        for k, (name, st) in enumerate(ex.map(fetch_repo, jobs), 1):
            stat[st.split(":")[0]] = stat.get(st.split(":")[0], 0) + 1
            if st not in ("ok", "cached"):
                print(f"  {name}: {st}", flush=True)
            if k % 20 == 0:
                du = run(["du", "-sk", RAW]).stdout.split()[0]
                print(f"  {k}/{len(jobs)} {stat} raw={int(du)/1024:.0f}MB {time.time()-t0:.0f}s", flush=True)
    print("fetch done", stat)

if __name__ == "__main__":
    main()
