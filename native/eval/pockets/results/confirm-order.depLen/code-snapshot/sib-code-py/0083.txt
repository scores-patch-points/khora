#!/usr/bin/env python3
"""Final manifest. Splits by SOURCE: musicxml sources fixed (see fetch scripts); Mutopia by maintainer, ethos negatives by repository:
split = ('train','dev','test')[int(sha256(key)[:8],16) % 3]. Derived ABC inherits the split of its source piece and exists only if admitted."""
import json, hashlib, os, re, glob, collections
ROOT = "/private/tmp/claude-501/notation/music_abc"
ETHOS = "/Users/mlacy/Documents/3.0/ethos/09-source-code"
split_of = lambda k: ("train", "dev", "test")[int(hashlib.sha256(k.encode()).hexdigest()[:8], 16) % 3]
man = json.load(open(f"{ROOT}/manifest.core.json"))
for m in man: m.setdefault("role", "positive"); m["system"] = "musicxml"; m["channel"] = "structured-text"; m["provenance"] = "natural"
# near-miss negatives: mscx (trees give origin paths), MEI
for repo, tree, src, split, suffix, dirn in [("OpenScore/Lieder", "lieder_tree.json", "openscore_lieder_mscx", "train", ".mscx", "mscx"),
                                              ("OpenScore/StringQuartets", "sq_tree.json", "openscore_quartets_mscx", "test", ".mscx", "mscx"),
                                              ("music-encoding/sample-encodings", "mei_tree.json", "mei_sample_encodings", "dev", ".mei", "mei")]:
    tree = json.load(open(f"{ROOT}/probe/{tree}"))["tree"]
    by = {hashlib.sha1(x["path"].encode()).hexdigest()[:12]: x for x in tree if x["type"] == "blob" and x["path"].endswith(suffix)}
    for f in sorted(glob.glob(f"{ROOT}/raw/{dirn}/*{suffix}")):
        k = os.path.basename(f).split(".")[0]
        if k not in by: continue
        # only the files this source's fetch wrote: mscx dir is shared by Lieder and SQ; decide by tree membership
        if dirn == "mscx" and not by[k]["path"].startswith("scores/"): continue
        x = by[k]
        man.append(dict(id=f"{src}:{k}", source=src, split=split, file=f"raw/{dirn}/{os.path.basename(f)}", origin=x["path"], bytes=os.path.getsize(f), full_bytes=x["size"],
                        format=("musescore-mscx" if suffix == ".mscx" else "mei"), role="negative_near_miss", system=None, channel="structured-text", provenance="natural",
                        url=f"https://raw.githubusercontent.com/{repo}/main/" + x["path"], license=("CC0-1.0" if "OpenScore" in repo else "ECL-2.0 (Apache-2.0-derived; borderline vs the permitted list; used only as a near-miss negative)")))
# a file under raw/mscx may belong to Lieder AND SQ trees (disjoint sha1 keys); keep unique ids
seen = set(); uniq = []
for m in man:
    if m["id"] in seen: continue
    seen.add(m["id"]); uniq.append(m)
man = uniq
# Mutopia
for m in json.load(open(f"{ROOT}/manifest.mutopia.json")):
    m["split"] = split_of("maint:" + (m.get("maintainer") or "unknown")); m["role"] = "positive"; m["system"] = "lilypond"; m["channel"] = "text"; m["provenance"] = "natural"
    man.append(m)
# ethos negatives (by repo)
for f in sorted(glob.glob(f"{ETHOS}/*/*")):
    if not os.path.isfile(f): continue
    repo = f.split("/")[-2]; name = os.path.basename(f)
    if name in ("README.md", "VETTING.md") and repo == "09-source-code": continue
    ext = name.rsplit(".", 1)[-1].lower()
    kind = ("code" if ext in ("c", "h", "js", "jsx", "go", "py", "ts", "rs", "rb", "scala", "cpp") else
            "markup" if ext in ("html", "svg", "xml") or ".html" in name else "data" if ext in ("json", "webmanifest") else "prose")
    man.append(dict(id=f"ethos:{repo}:{name}", source=f"ethos:{repo}", split=split_of("repo:" + repo), file=f, origin=f"ethos/09-source-code/{repo}/{name}", bytes=os.path.getsize(f),
                    format=f"other-{kind}", role="negative", system=None, channel="text", provenance="natural", absolute=True))
# derived ABC
val = json.load(open(f"{ROOT}/derived/validation.json"))
bysrc = {m["id"]: m for m in man}
for pid, r in sorted(val.items()):
    if not r["admitted"]: continue
    src = bysrc[pid]
    man.append(dict(id=f"abc:{pid}", source=src["source"] + ":derived-abc", split=src["split"], file=f"derived/{pid.replace(':','__')}.abc", origin=pid, bytes=os.path.getsize(f"{ROOT}/derived/{pid.replace(':','__')}.abc"),
                    format="abc", role="positive", system="abc", channel="text", provenance="derived (agent-authored deterministic converter from natural MusicXML; admitted by abcjs MIDI validation; NOT natural ABC)", derived_from=pid))
json.dump(man, open(f"{ROOT}/manifest.json", "w"), indent=1)
c = collections.Counter((m["split"], m["format"], m["role"]) for m in man)
for k, v in sorted(c.items(), key=lambda kv: str(kv[0])): print(k, v)
print("total", len(man), "bytes", sum(m["bytes"] for m in man))
by_maint = collections.Counter((m["split"], m.get("maintainer")) for m in man if m["format"] == "lilypond")
print(by_maint)
