#!/usr/bin/env python3
"""Fetch (a) Mutopia LilyPond sources with per-piece licence from the piece's own .rdf (only Public Domain / CC-BY / CC-BY-SA /
CC0 kept); (b) MuseScore .mscx near-miss negatives from OpenScore (CC0); (c) MEI near-miss negatives (ECL-2.0, flagged).
Deterministic sampling by sha256 of the path, rule fixed before reading any content."""
import hashlib, json, os, re, sys, time, urllib.request, urllib.parse
ROOT = "/private/tmp/claude-501/notation/music_abc"
UA = "khora-notation-music/1.0 (research fetch; contact michael.t.lacy@gmail.com)"
def get(url, tries=3, binary=False):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                d = r.read()
                return d if binary else d.decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1: return None
            time.sleep(2 + 2 * i)
def h(s): return hashlib.sha256(s.encode()).hexdigest()
def links(html, base):
    out = []
    for m in re.findall(r'href="([^"?#]+)"', html):
        if m.startswith("/") or m.startswith("http") or m.startswith(".."): continue
        out.append(m)
    return out
BASE = "https://www.mutopiaproject.org/ftp/"
def lic_of(rdf):
    m = re.search(r"<(?:mp:)?licen[cs]e[^>]*>([^<]+)<", rdf)
    s = (m.group(1) if m else "").strip()
    l = s.lower()
    if "noncommercial" in l or "non-commercial" in l or "nd" in l.split("-")[-1:] : return None, s
    if "public domain" in l: return "Public Domain", s
    if "attribution-sharealike" in l or "by-sa" in l: return "CC-BY-SA", s
    if "creative commons attribution" in l and "noncommercial" not in l and "noderiv" not in l and "no deriv" not in l: return "CC-BY", s
    if "creative commons zero" in l or "cc0" in l: return "CC0", s
    return None, s
manifest = []
def mutopia(ncomp=40, per=3):
    root = get(BASE)
    comps = [l for l in links(root, BASE) if l.endswith("/")]
    comps.sort(key=h)
    got_comp = 0
    for c in comps:
        if got_comp >= ncomp: break
        # BFS for piece dirs (dirs holding a .rdf)
        found = []; queue = [(c, 0)]
        while queue and len(found) < 40:
            d, depth = queue.pop(0)
            page = get(BASE + d)
            if not page: continue
            ls = links(page, d)
            rdfs = [l for l in ls if l.endswith(".rdf")]
            if rdfs: found.append((d, rdfs[0])); continue
            if depth < 3:
                for l in ls:
                    if l.endswith("/"): queue.append((d + l, depth + 1))
            time.sleep(0.1)
        found.sort(key=lambda x: h(x[0]))
        took = 0
        for d, rdfname in found:
            if took >= per: break
            rdf = get(BASE + d + rdfname)
            if not rdf: continue
            lic, raw = lic_of(rdf)
            if lic is None: continue
            maint = re.search(r"<(?:mp:)?maintainer>([^<]*)<", rdf); comp = re.search(r"<(?:mp:)?composer>([^<]*)<", rdf)
            instr = re.search(r"<(?:mp:)?for>([^<]*)<", rdf)
            stem = rdfname[:-4]
            lysdir = get(BASE + d + stem + "-lys/")
            if not lysdir: continue
            lyfiles = [l for l in links(lysdir, d) if l.endswith(".ly")]
            if not lyfiles: continue
            lyfiles.sort(key=lambda s: (("-let" in s) or ("-a4" in s) or ("-" in s[len(stem):]), s))
            ly = get(BASE + d + stem + "-lys/" + lyfiles[0])
            if not ly or len(ly) > 400_000: continue
            os.makedirs(f"{ROOT}/raw/mutopia", exist_ok=True)
            fn = hashlib.sha1((d + stem).encode()).hexdigest()[:12] + ".ly"
            open(f"{ROOT}/raw/mutopia/{fn}", "w", encoding="utf-8").write(ly)
            manifest.append(dict(id=f"mutopia:{fn[:-3]}", source="mutopia", split=None, file=f"raw/mutopia/{fn}", origin=d + stem + "-lys/" + lyfiles[0],
                                 bytes=len(ly.encode()), url=BASE + d + stem + "-lys/" + lyfiles[0], format="lilypond", license=lic, license_raw=raw,
                                 maintainer=(maint.group(1).strip() if maint else None), composer=(comp.group(1).strip() if comp else None), instrument=(instr.group(1).strip() if instr else None)))
            took += 1
            time.sleep(0.15)
        if took: got_comp += 1
        print("composer", c, "pieces", took, file=sys.stderr)
def gh_raw(repo, treefile, suffix, n, max_bytes, source, split, fmt, outdir, prefer=None):
    tree = json.load(open(treefile))["tree"]
    cand = [x for x in tree if x["type"] == "blob" and x["path"].endswith(suffix) and x["size"] <= max_bytes and (prefer is None or prefer in x["path"])]
    cand.sort(key=lambda x: h(x["path"]))
    os.makedirs(f"{ROOT}/raw/{outdir}", exist_ok=True)
    k = 0
    for x in cand[:n]:
        url = f"https://raw.githubusercontent.com/{repo}/main/" + urllib.parse.quote(x["path"])
        d = get(url, binary=True)
        if d is None: continue
        fn = hashlib.sha1(x["path"].encode()).hexdigest()[:12] + suffix
        open(f"{ROOT}/raw/{outdir}/{fn}", "wb").write(d)
        manifest.append(dict(id=f"{source}:{fn.split('.')[0]}", source=source, split=split, file=f"raw/{outdir}/{fn}", origin=x["path"], bytes=len(d), url=url, format=fmt))
        k += 1; time.sleep(0.15)
    print(source, k, file=sys.stderr)
def gh_range(repo, treefile, suffix, n, max_total, source, split, fmt, outdir, nbytes=16384):
    """Only the first nbytes of each (large) file: R0 reads prefixes only. Recorded as truncated."""
    tree = json.load(open(treefile))["tree"]
    cand = [x for x in tree if x["type"] == "blob" and x["path"].endswith(suffix)]
    cand.sort(key=lambda x: h(x["path"]))
    os.makedirs(f"{ROOT}/raw/{outdir}", exist_ok=True)
    k = 0
    for x in cand[:n]:
        url = f"https://raw.githubusercontent.com/{repo}/main/" + urllib.parse.quote(x["path"])
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Range": f"bytes=0-{nbytes-1}"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r: d = r.read()
        except Exception: continue
        fn = hashlib.sha1(x["path"].encode()).hexdigest()[:12] + suffix
        open(f"{ROOT}/raw/{outdir}/{fn}", "wb").write(d)
        manifest.append(dict(id=f"{source}:{fn.split('.')[0]}", source=source, split=split, file=f"raw/{outdir}/{fn}", origin=x["path"], bytes=len(d), full_bytes=x["size"], truncated_to=nbytes, url=url, format=fmt))
        k += 1; time.sleep(0.15)
    print(source, k, file=sys.stderr)
if __name__ == "__main__":
    P = f"{ROOT}/probe"
    gh_raw("OpenScore/Lieder", f"{P}/lieder_tree.json", ".mscx", 12, 150_000, "openscore_lieder_mscx", "train", "musescore-mscx", "mscx")
    gh_range("OpenScore/StringQuartets", f"{P}/sq_tree.json", ".mscx", 12, None, "openscore_quartets_mscx", "test", "musescore-mscx", "mscx")
    gh_raw("music-encoding/sample-encodings", f"{P}/mei_tree.json", ".mei", 12, 120_000, "mei_sample_encodings", "dev", "mei", "mei", prefer="MEI_5.0")
    mutopia()
    json.dump(manifest, open(f"{ROOT}/manifest.extra.json", "w"), indent=1)
    print(len(manifest), "extra files", sum(m["bytes"] for m in manifest))

# NOTE (2026-10-06): the mutopia() breadth-first crawl above was too slow and is SUPERSEDED by fetch_mutopia.py (listing pages, same licence rule);
# gh_raw/gh_range (mscx near-miss negatives from the OpenScore repos, MEI sample encodings) are the parts that were used.
