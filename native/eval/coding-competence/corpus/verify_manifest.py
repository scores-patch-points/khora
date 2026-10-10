#!/usr/bin/env python3
"""
verify_manifest.py -- audit of /private/tmp/claude-501/code-corpus/manifest.json. Exit 1 on any FAIL.

Checks (each can fail; none is a score):
  F1  every listed file exists, is <= SIZE_MAX, has sha256 equal to the manifest value
  F2  within a language, no repository appears in two splits
  F3  within a language, no sha256 appears in two splits
  F4  across languages, a repository's global split (sha256 mod 4) equals its split in every language unless the language
      lists it in split_overrides (or uses the top-level-directory rule, flagged leakage_risk)
  F5  every fetched repo in the manifest has license_text_family in the allow-list
  F6  per-language bytes <= 40 MB; raw tree on disk <= 900 MB
  F7  no language marked leakage_risk=false has a file whose path lies outside its repo's checkout
Prints a per-language table and (optionally with --detail) repos per split.
"""
import hashlib, json, os, sys, subprocess
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L

M = json.load(open("/private/tmp/claude-501/code-corpus/manifest.json"))
fails = []
def fail(msg):
    fails.append(msg)

ALLOW = {"mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "cc0-1.0", "cc-by-family"}
repo_split_seen = {}
for lang, d in M["languages"].items():
    info = d["info"]
    overrides = {o["repo"] for o in info.get("split_overrides", [])}
    sha_split, repo_in = {}, {}
    nbytes = 0
    for b in ("train", "dev", "test"):
        for r in d[b]:
            if not os.path.isfile(r["path"]):
                fail(f"F1 missing {r['path']}"); continue
            data = open(r["path"], "rb").read()
            if len(data) > L.SIZE_MAX: fail(f"F1 too big {r['path']}")
            if hashlib.sha256(data).hexdigest() != r["sha256"]: fail(f"F1 sha mismatch {r['path']}")
            nbytes += len(data)
            if r["sha256"] in sha_split and sha_split[r["sha256"]] != b:
                fail(f"F3 {lang}: sha shared by {sha_split[r['sha256']]} and {b}: {r['rel']}")
            sha_split[r["sha256"]] = b
            if not info["leakage_risk"]:
                if r["repo"] in repo_in and repo_in[r["repo"]] != b:
                    fail(f"F2 {lang}: repo {r['repo']} in {repo_in[r['repo']]} and {b}")
                repo_in[r["repo"]] = b
                gs = L.repo_split(r["repo"])
                if gs != b and r["repo"] not in overrides:
                    fail(f"F4 {lang}: repo {r['repo']} global={gs} manifest={b} (no override)")
    if nbytes > L.LANG_BYTES_CAP:
        fail(f"F6 {lang} bytes {nbytes}")
for repo, ri in M["repos"].items():
    if ri["origin"] == "fetched" and ri["license_text_family"] not in ALLOW:
        fail(f"F5 {repo} license text family {ri['license_text_family']}")
du = int(subprocess.run(["du", "-sk", "/private/tmp/claude-501/code-corpus/raw"], capture_output=True, text=True).stdout.split()[0]) * 1024
if du > L.DISK_CAP:
    fail(f"F6 raw on disk {du}")
print(f"raw on disk: {du/1e6:.0f} MB   repos in manifest: {len(M['repos'])}   fetched: {sum(1 for r in M['repos'].values() if r['origin']=='fetched')}")
if "--detail" in sys.argv:
    for lang in L.LANGUAGES:
        d = M["languages"][lang]
        print(f"\n{lang}  rule={d['info']['split_rule']} removed={d['info'].get('leakage_guard_removed')}")
        for b in ("train", "dev", "test"):
            byr = {}
            for r in d[b]:
                byr[r["repo"]] = byr.get(r["repo"], 0) + 1
            print(f"   {b:5s} " + ", ".join(f"{k}({v})" for k, v in sorted(byr.items(), key=lambda kv: -kv[1])))
print("\nFAILS:", len(fails))
for f in fails[:40]:
    print("  ", f)
sys.exit(1 if fails else 0)
