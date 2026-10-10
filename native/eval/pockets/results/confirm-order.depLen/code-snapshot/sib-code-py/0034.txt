#!/usr/bin/env python3
"""
topup.py -- round-2 selection: bring thin (language, split) cells up to DECLARED minimum diversity, using the same
rules as plan.py (qualifying repos only; reuse of already-selected repos first; then stars). Declared targets, fixed before
this round ran and chosen from the task text ("at least ~40 files per split") plus the diversity rule that one
repository must not carry a split (one repo = one set of idioms):
    fetched repos with >= 8 surviving files per split:  train >= 4, dev >= 3, test >= 3
    surviving files (unrestricted) per split:           >= 60
A cell short of target gets additional qualifying repos IN THAT SPLIT'S HASH BIN (never from another bin) until the target
is met or candidates run out (then the manifest records a typed gap). Trees for the next-best candidates are fetched
read-only when missing.
Usage: topup.py plan   -> writes pool/plan.json (round-1 backed up to pool/plan.round1.json) + pool/refetch.txt
"""
import json, math, os, shutil, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L
import plan as P

BASE = P.BASE
M = json.load(open(f"{BASE}/manifest.json"))
POOL = {e["fullName"]: e for e in json.load(open(P.POOL))}
PLAN = json.load(open(P.PLAN))
TARGET_REPOS = {"train": 4, "dev": 3, "test": 3}
TARGET_FILES = 60
MIN_REPO_FILES = 8
TREE_CANDIDATES = 40
CAP = L.CAP_PER_REPO_LANG
SAMP = math.ceil(L.OVERSAMPLE * CAP)

def cells():
    out = []
    for lang in L.LANGUAGES:
        d = M["languages"][lang]
        for b in ("train", "dev", "test"):
            byr = {}
            for r in d[b]:
                if not r["restricted"] and r["origin"] == "fetched":
                    byr[r["repo"]] = byr.get(r["repo"], 0) + 1
            big = [r for r, n in byr.items() if n >= MIN_REPO_FILES]
            nfiles = sum(1 for r in d[b] if not r["restricted"])
            if len(big) < TARGET_REPOS[b] or nfiles < TARGET_FILES:
                out.append((lang, b, len(big), nfiles, set(byr)))
    return out

def main():
    k = 1
    while os.path.exists(f"{BASE}/pool/plan.round{k}.json"):
        k += 1
    shutil.copy(P.PLAN, f"{BASE}/pool/plan.round{k}.json")
    print(f"plan backed up as plan.round{k}.json")
    defs = cells()
    print(f"deficit cells: {len(defs)}")
    # trees for next-best candidates of deficit cells
    want = set()
    for lang, b, nb, nf, have in defs:
        c = [e for e in POOL.values() if lang in e["hints"] and L.repo_split(e["fullName"]) == b]
        c.sort(key=lambda e: -e["stars"])
        want |= {e["fullName"] for e in c[:TREE_CANDIDATES]}
    need = [n for n in want if not os.path.exists(P.tree_path(n))]
    print(f"trees to fetch: {len(need)}", flush=True)
    with ThreadPoolExecutor(max_workers=6) as ex:
        list(ex.map(P.fetch_tree, need))
    elig = {}
    def get_elig(n):
        if n not in elig:
            t = P.load_tree(n)
            elig[n] = P.eligible_by_lang(POOL[n], t) if t else {}
        return elig[n]
    selected = set(PLAN["repos"])
    refetch = set()
    added = []
    for lang, b, nb, nf, have in defs:
        c = [e["fullName"] for e in POOL.values() if L.repo_split(e["fullName"]) == b]
        # qualifying = repo has >= MIN_PAIR_FILES eligible files of this language (any pool repo with a tree, any hint)
        q = []
        for n in c:
            if not os.path.exists(P.tree_path(n)):
                continue
            if n in have or lang in PLAN["repos"].get(n, {}).get("pairs", {}):
                continue  # already used (or already tried and filtered away): never re-pick a (repo, language) pair
            if len(get_elig(n).get(lang, [])) >= P.MIN_PAIR_FILES:
                q.append(n)
        # excluded after round 1 (licence/clone failure) must not come back
        bad = {x["repo"] for x in M["stats"]["repos_excluded_license_or_clone"]}
        tainted = {(t["repo"], t["language"]) for t in M["stats"].get("tainted_pairs", [])}
        q = [n for n in q if n not in bad and (n, lang) not in tainted]
        q.sort(key=lambda n: ((0 if n in selected else 1), -min(len(get_elig(n)[lang]), CAP), -POOL[n]["stars"]))
        n_have = nb
        f_have = nf
        picked = []
        for n in q:
            if n_have >= TARGET_REPOS[b] and f_have >= TARGET_FILES:
                break
            picked.append(n)
            n_have += 1
            f_have += int(min(len(get_elig(n)[lang]), CAP) * 0.8)  # expected survival after content filters (declared 0.8)
        for n in picked:
            r = PLAN["repos"].setdefault(n, {"split": L.repo_split(n), "license": POOL[n]["license"], "stars": POOL[n]["stars"],
                                              "size_kb": POOL[n]["size_kb"], "primary_language": POOL[n]["primary_language"], "pairs": {}})
            lst = sorted(get_elig(n)[lang], key=lambda ps: L.hash_order_key(n, ps[0]))[:SAMP]
            r["pairs"][lang] = {"n_eligible": len(get_elig(n)[lang]), "paths": [p for p, s in lst], "bytes_planned": sum(s for p, s in lst)}
            if n in selected:
                refetch.add(n)
            selected.add(n)
            added.append((lang, b, n))
        print(f"  {lang:11s} {b:5s} had repos={nb} files={nf}  +{len(picked)} repos (candidates {len(q)})" + ("  STILL SHORT" if n_have < TARGET_REPOS[b] else ""))
    json.dump(PLAN, open(P.PLAN, "w"), indent=0)
    # repos already fetched that gained a pair must be re-materialised (their .git is gone): clear meta so fetch.py redoes them
    todo = []
    for n, r in PLAN["repos"].items():
        mp = f"{BASE}/raw/_meta/{n.replace('/', '_')}.json"
        if n in refetch and os.path.exists(mp):
            os.remove(mp)
        if not os.path.exists(mp):
            todo.append(n)
    open(f"{BASE}/pool/refetch.txt", "w").write("\n".join(todo))
    print(f"added pairs: {len(added)}  repos to (re)fetch: {len(todo)}  total repos in plan: {len(PLAN['repos'])}")

if __name__ == "__main__":
    main()
