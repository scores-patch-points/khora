#!/usr/bin/env python3
"""
plan.py -- choose which (repository, language) pairs to fetch, from the GitHub search pool + tree listings.

Two subcommands:
  trees   fetch the recursive git tree (paths + blob sizes) of pool repositories via the read-only REST API
          (GET repos/{owner}/{repo}/git/trees/HEAD?recursive=1) and cache a compact form (only mapped-extension blobs).
  select  greedy per-language selection under DECLARED rules and write plan.json.

Declared selection rules (fixed before the first run; no reader has seen any file):
  * a (repo, language) pair QUALIFIES when the repo has >= MIN_PAIR_FILES name-eligible files of that language
    (name-eligible = langmap.name_candidates accepts, 300 B <= size <= 200 KB; ambiguous extensions are attributed
    by the repo's primary language / dominant unambiguous source language, and RE-RESOLVED by content at build time)
  * per language, per split bin (bin = langmap.repo_split(repo)), pick up to QUOTA[bin] repos:
      1. repos already selected for another language first (free: no extra clone), richest first
      2. then new repos by stars descending
    Languages are processed scarcest-first (fewest qualifying pool repos), so rare languages choose their repos before
    common ones can crowd them out.
  * a pair contributes at most ceil(OVERSAMPLE*CAP_PER_REPO_LANG) paths, chosen by sha1(repo+path) order (a
    pseudo-random sample that spans directories); content filters thin it back to CAP_PER_REPO_LANG at build time.
  * a language whose bin has < MIN_FILES_PER_SPLIT capped files gets up to EXTRA_REPOS additional qualifying repos in
    that bin; if still short it is reported as a DEFICIT (typed gap), never padded from another bin (a repo stays in
    exactly one split).
"""
import json, math, os, sys, time, hashlib, subprocess
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L

BASE = "/private/tmp/claude-501/code-corpus"
POOL = f"{BASE}/pool/search.json"
TREES = f"{BASE}/pool/trees"
PLAN = f"{BASE}/pool/plan.json"
MIN_PAIR_FILES = 10
MIN_BYTES = 300
EXTRA_REPOS = 3
PATH_SAFE = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-/+@=,~() ")

PRIMARY_AMBIG = {  # primary GitHub language -> {ambiguous extension: language it names there}
    "Objective-C": {"@m": "objc"}, "Objective-C++": {"@m": "objc"}, "MATLAB": {"@m": "matlab"}, "Octave": {"@m": "matlab"},
    "Verilog": {"@v": "verilog"}, "SystemVerilog": {"@v": "verilog"}, "Perl": {"@pl": "perl"},
    "Common Lisp": {"@cl": "commonlisp"}, "Fortran": {"@f": "fortran"}, "Fortran Free Form": {"@f": "fortran"},
}
HINT_AMBIG = {"objc": ("@m", "objc"), "matlab": ("@m", "matlab"), "verilog": ("@v", "verilog"), "perl": ("@pl", "perl"),
              "commonlisp": ("@cl", "commonlisp"), "fortran": ("@f", "fortran")}

def tree_path(name):
    return f"{TREES}/{name.replace('/', '__')}.json"

def fetch_tree(name):
    p = tree_path(name)
    if os.path.exists(p):
        return name, "cached"
    o, r = name.split("/", 1)
    for attempt in range(4):
        res = subprocess.run(["gh", "api", f"repos/{o}/{r}/git/trees/HEAD?recursive=1"], capture_output=True, text=True)
        if res.returncode == 0:
            try:
                j = json.loads(res.stdout)
            except Exception:
                return name, "badjson"
            files = []
            n_all = 0
            for t in j.get("tree", []):
                if t.get("type") != "blob":
                    continue
                n_all += 1
                if L.ext_of(t["path"]) in L.EXT and t.get("size", 0) <= L.SIZE_MAX * 4:
                    files.append([t["path"], t.get("size", 0)])
            json.dump({"repo": name, "truncated": bool(j.get("truncated")), "n_blobs": n_all, "files": files}, open(p, "w"))
            return name, "ok"
        err = res.stderr or ""
        if "rate limit" in err.lower() or "403" in err:
            time.sleep(60)
            continue
        if "404" in err or "409" in err or "empty" in err.lower():
            return name, "unavailable"
        time.sleep(2)
    return name, "failed"

def cmd_trees(limit_per_bin=None):
    pool = json.load(open(POOL))
    os.makedirs(TREES, exist_ok=True)
    names = [e["fullName"] for e in pool]
    if len(sys.argv) > 2 and sys.argv[2].startswith("--top"):
        # declared prioritisation: per language hint and per split bin, the TOP-N pool repos by stars
        # (the pool is only a candidate list; fetching trees for the rest adds throughput cost, not coverage)
        n_top = int(sys.argv[2][5:] or 16)
        keep = set()
        for lang in L.LANGUAGES:
            for b in ("train", "dev", "test"):
                c = [e for e in pool if lang in e["hints"] and L.repo_split(e["fullName"]) == b]
                c.sort(key=lambda e: -e["stars"])
                keep |= {e["fullName"] for e in c[:n_top]}
        names = [n for n in names if n in keep]
    print(f"pool={len(names)}", flush=True)
    t0 = time.time()
    done = 0
    stat = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        for name, st in ex.map(fetch_tree, names):
            done += 1
            stat[st] = stat.get(st, 0) + 1
            if done % 100 == 0:
                print(f"  trees {done}/{len(names)} {stat} {time.time()-t0:.0f}s", flush=True)
    print("trees done", stat)

def load_tree(name):
    p = tree_path(name)
    if not os.path.exists(p):
        return None
    return json.load(open(p))

def eligible_by_lang(entry, tree):
    """Return {language: [(path, size)]} name-level eligible files for this repo."""
    files = tree["files"]
    # unambiguous source counts for .h dominance
    nc = sum(1 for p, s in files if L.ext_of(p) == ".c")
    ncpp = sum(1 for p, s in files if L.EXT.get(L.ext_of(p)) == "cpp" and L.ext_of(p) not in (".hpp", ".hh", ".hxx", ".h++", ".ipp", ".inl", ".tpp"))
    nobjc = sum(1 for p, s in files if L.ext_of(p) in (".mm",)) + (sum(1 for p, s in files if L.ext_of(p) == ".m") if entry.get("primary_language") in ("Objective-C", "Objective-C++") else 0)
    h_lang = "c"
    if nobjc > max(nc, ncpp):
        h_lang = "objc"
    elif ncpp > nc:
        h_lang = "cpp"
    amb = dict(PRIMARY_AMBIG.get(entry.get("primary_language"), {}))
    for h in entry.get("hints", []):
        if h in HINT_AMBIG:
            amb.setdefault(HINT_AMBIG[h][0], HINT_AMBIG[h][1])
    out = {}
    for path, size in files:
        if size < MIN_BYTES or size > L.SIZE_MAX:
            continue
        if any(ch not in PATH_SAFE for ch in path):
            continue
        lang, why = L.name_candidates(path)
        if lang is None:
            continue
        if lang.startswith("@"):
            if lang == "@h":
                lang = h_lang
            else:
                lang = amb.get(lang)
                if lang is None:
                    continue
        out.setdefault(lang, []).append((path, size))
    return out

def cmd_select():
    pool = {e["fullName"]: e for e in json.load(open(POOL))}
    elig = {}
    for name, e in pool.items():
        t = load_tree(name)
        if t is None:
            continue
        elig[name] = eligible_by_lang(e, t)
    print(f"repos with trees: {len(elig)} of {len(pool)}")
    cap = L.CAP_PER_REPO_LANG
    samp = math.ceil(L.OVERSAMPLE * cap)
    qualifying = {lang: [n for n in elig if len(elig[n].get(lang, [])) >= MIN_PAIR_FILES] for lang in L.LANGUAGES}
    order = sorted(L.LANGUAGES, key=lambda l: len(qualifying[l]))
    selected_repos = set()
    pairs = {}  # (lang) -> {bin: [repo...]}
    report = {}
    for lang in order:
        pairs[lang] = {"train": [], "dev": [], "test": []}
        for b in ("train", "dev", "test"):
            quota = L.QUOTA[b]
            cands = [n for n in qualifying[lang] if L.repo_split(n) == b]
            def key(n, reuse_first=True):
                cnt = min(len(elig[n][lang]), cap)
                return ((0 if (n in selected_repos) else 1), -cnt, -pool[n]["stars"])
            cands.sort(key=key)
            chosen = []
            for n in cands:
                if len(chosen) >= quota:
                    break
                chosen.append(n)
            tot = sum(min(len(elig[n][lang]), cap) for n in chosen)
            extra = [n for n in cands if n not in chosen]
            extra.sort(key=lambda n: (-min(len(elig[n][lang]), cap), -pool[n]["stars"]))
            while tot < L.MIN_FILES_PER_SPLIT and extra and len(chosen) < quota + EXTRA_REPOS:
                n = extra.pop(0)
                chosen.append(n)
                tot += min(len(elig[n][lang]), cap)
            pairs[lang][b] = chosen
            for n in chosen:
                selected_repos.add(n)
        # BORROW rule (declared): if a split bin has no candidate repo at all and the language has >= 3 qualifying repos
        # overall, take the next-best qualifying repos from the other bins (up to 6 repos in total) so that
        # build_manifest.py can apply its language-local rank split; these repos keep their global bin in the plan.
        got = [n for b in pairs[lang] for n in pairs[lang][b]]
        empty = [b for b in ("train", "dev", "test") if not pairs[lang][b]]
        if empty and len(qualifying[lang]) >= L.MIN_REPOS_FOR_REPO_SPLIT and len(got) < 6:
            rest = [n for n in qualifying[lang] if n not in got]
            rest.sort(key=lambda n: ((0 if n in selected_repos else 1), -min(len(elig[n][lang]), cap), -pool[n]["stars"]))
            for n in rest[:6 - len(got)]:
                pairs[lang][L.repo_split(n)].append(n)
                selected_repos.add(n)
    plan = {"declared": {"CAP_PER_REPO_LANG": cap, "OVERSAMPLE": L.OVERSAMPLE, "QUOTA": L.QUOTA, "MIN_PAIR_FILES": MIN_PAIR_FILES,
                          "MIN_FILES_PER_SPLIT": L.MIN_FILES_PER_SPLIT, "MIN_BYTES": MIN_BYTES}, "repos": {}, "coverage": {}}
    for lang in L.LANGUAGES:
        cov = {}
        for b in ("train", "dev", "test"):
            ns = pairs[lang][b]
            tot = sum(min(len(elig[n][lang]), cap) for n in ns)
            cov[b] = {"repos": len(ns), "capped_files_planned": tot, "candidate_repos_in_bin": len([n for n in qualifying[lang] if L.repo_split(n) == b])}
            for n in ns:
                r = plan["repos"].setdefault(n, {"split": L.repo_split(n), "license": pool[n]["license"], "stars": pool[n]["stars"],
                                                  "size_kb": pool[n]["size_kb"], "primary_language": pool[n]["primary_language"], "pairs": {}})
                lst = sorted(elig[n][lang], key=lambda ps: L.hash_order_key(n, ps[0]))[:samp]
                r["pairs"][lang] = {"n_eligible": len(elig[n][lang]), "paths": [p for p, s in lst], "bytes_planned": sum(s for p, s in lst)}
        plan["coverage"][lang] = cov
    json.dump(plan, open(PLAN, "w"), indent=0)
    print(f"selected repos: {len(plan['repos'])}")
    tot_bytes = sum(p["bytes_planned"] for r in plan["repos"].values() for p in r["pairs"].values())
    print(f"planned bytes (oversampled, name-level): {tot_bytes/1e6:.0f} MB")
    print("\nLANGUAGE COVERAGE (planned capped files; repos) train/dev/test")
    for lang in L.LANGUAGES:
        c = plan["coverage"][lang]
        flag = "  <-- SHORT" if any(c[b]["capped_files_planned"] < L.MIN_FILES_PER_SPLIT for b in c) else ""
        print(f"  {lang:11s} " + "  ".join(f"{b}:{c[b]['capped_files_planned']:4d}f/{c[b]['repos']}r(of {c[b]['candidate_repos_in_bin']})" for b in ("train", "dev", "test")) + flag)

if __name__ == "__main__":
    {"trees": cmd_trees, "select": cmd_select}[sys.argv[1]]()
