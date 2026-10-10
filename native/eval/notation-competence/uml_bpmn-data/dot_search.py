#!/usr/bin/env python3
"""Find candidate DOT files in PERMISSIVELY LICENSED public repos via the GitHub code-search API (read-only metadata),
rate-limited to <= 8 requests/minute. Writes raw/dot-search.json: {repo: {license, fork, stars, files:[{path, sha, size?}]}}.
Only repo-level SPDX in ALLOWED is kept; GitHub's NOASSERTION/NONE repos are dropped (never guess a licence)."""
import json, subprocess, sys, time, collections
OUT = "/private/tmp/claude-501/notation/uml_bpmn/raw/dot-search.json"
ALLOWED = {"MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "CC0-1.0", "Unlicense", "CC-BY-4.0", "CC-BY-SA-4.0", "0BSD"}
QUERIES = []
for ext in ("dot", "gv"):
    for kw in ("digraph", "graph"):
        for lo, hi in ((100, 300), (300, 700), (700, 1500), (1500, 4000), (4000, 12000)):
            QUERIES.append(f"{kw} extension:{ext} size:{lo}..{hi}")
def gh(args):
    r = subprocess.run(["gh", "api"] + args, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr
cands = collections.defaultdict(dict)
calls = 0
def throttle():
    global calls
    calls += 1
    time.sleep(7.5)
for q in QUERIES:
    for page in (1, 2, 3):
        throttle()
        rc, out, err = gh(["-X", "GET", "search/code", "-f", f"q={q}", "-f", "per_page=100", "-f", f"page={page}"])
        if rc != 0:
            print("ERR", q, page, err[:200], file=sys.stderr)
            if "rate limit" in err.lower() or "403" in err:
                time.sleep(60)
            break
        d = json.loads(out)
        items = d.get("items", [])
        for it in items:
            repo = it["repository"]["full_name"]
            cands[repo][it["path"]] = {"path": it["path"], "sha": it["sha"]}
        print(q, page, len(items), "repos so far", len(cands), flush=True)
        if len(items) < 100:
            break
json.dump({k: {"files": list(v.values())} for k, v in cands.items()}, open(OUT + ".candidates", "w"))
meta = {}
for repo in sorted(cands):
    rc, out, err = gh([f"repos/{repo}", "--jq", "[.license.spdx_id, .fork, .stargazers_count, .size, .default_branch, .archived] | @json"])
    if rc != 0:
        continue
    lic, fork, stars, size, br, arch = json.loads(out)
    if lic in ALLOWED and not fork:
        meta[repo] = {"license": lic, "fork": fork, "stars": stars, "size_kb": size, "branch": br, "files": list(cands[repo].values())}
    time.sleep(0.4)
json.dump(meta, open(OUT, "w"), indent=1)
print("DONE repos_total", len(cands), "permissive_nonfork", len(meta), "files", sum(len(m["files"]) for m in meta.values()))
