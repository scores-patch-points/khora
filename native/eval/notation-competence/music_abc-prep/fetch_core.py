#!/usr/bin/env python3
"""Fetch the music_abc core corpus (MusicXML) with provenance. Deterministic sampling.
Sources (split BY SOURCE):
  TRAIN  openscore_lieder        github.com/OpenScore/Lieder            CC0-1.0   (.mxl)
  DEV    zenodo_leone_allemandes zenodo.org/records/5145348             CC-BY-4.0 (MusicXML zip)
  DEV    zenodo_ciciban          zenodo.org/records/17187648            CC-BY-4.0 (MusicXML zip)
  TEST   openscore_quartets      github.com/OpenScore/StringQuartets    CC0-1.0   (.mxl)
Sampling rule (declared before any content was read): order candidate paths by sha256(path), take the first N
that satisfy the size bound read from the git tree listing (not from content).
"""
import hashlib, json, os, sys, time, urllib.request, zipfile, io
ROOT = "/private/tmp/claude-501/notation/music_abc"
UA = "khora-notation-music/1.0 (research fetch; contact michael.t.lacy@gmail.com)"
RAW = f"{ROOT}/raw"
def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2 + 2 * i)
def h(p): return hashlib.sha256(p.encode()).hexdigest()
manifest = []
def gh_sample(repo, treefile, outdir, split, source, n, max_bytes):
    tree = json.load(open(treefile))["tree"]
    cand = [x for x in tree if x["type"] == "blob" and x["path"].endswith(".mxl") and x["size"] <= max_bytes]
    cand.sort(key=lambda x: h(x["path"]))
    os.makedirs(f"{RAW}/{outdir}", exist_ok=True)
    got = 0
    for x in cand:
        if got >= n: break
        url = f"https://raw.githubusercontent.com/{repo}/main/" + urllib.request.quote(x["path"])
        data = get(url)
        fn = hashlib.sha1(x["path"].encode()).hexdigest()[:12] + ".mxl"
        open(f"{RAW}/{outdir}/{fn}", "wb").write(data)
        manifest.append(dict(id=f"{source}:{fn[:-4]}", source=source, split=split, file=f"raw/{outdir}/{fn}",
                             origin=x["path"], bytes=len(data), url=url, format="musicxml-mxl"))
        got += 1
        time.sleep(0.15)
    print(source, split, got, "files", sum(m["bytes"] for m in manifest if m["source"] == source), "bytes", file=sys.stderr)
def zen(rec, fname, outdir, split, source, license_id, notes):
    url = f"https://zenodo.org/api/records/{rec}/files/{urllib.request.quote(fname)}/content"
    data = get(url)
    os.makedirs(f"{RAW}/{outdir}", exist_ok=True)
    zf = zipfile.ZipFile(io.BytesIO(data))
    k = 0
    for info in sorted(zf.infolist(), key=lambda i: i.filename):
        if info.is_dir() or "__MACOSX" in info.filename: continue
        low = info.filename.lower()
        if not (low.endswith(".xml") or low.endswith(".musicxml") or low.endswith(".mxl")): continue
        b = zf.read(info)
        fn = hashlib.sha1(info.filename.encode()).hexdigest()[:12] + (".mxl" if low.endswith(".mxl") else ".xml")
        open(f"{RAW}/{outdir}/{fn}", "wb").write(b)
        manifest.append(dict(id=f"{source}:{fn.rsplit('.',1)[0]}", source=source, split=split, file=f"raw/{outdir}/{fn}",
                             origin=info.filename, bytes=len(b), url=url, format="musicxml-mxl" if fn.endswith(".mxl") else "musicxml", notes=notes))
        k += 1
    print(source, split, k, "files from zip of", len(data), "bytes", file=sys.stderr)
if __name__ == "__main__":
    P = f"{ROOT}/probe"
    gh_sample("OpenScore/Lieder", f"{P}/lieder_tree.json", "openscore_lieder", "train", "openscore_lieder", 300, 120_000)
    gh_sample("OpenScore/StringQuartets", f"{P}/sq_tree.json", "openscore_quartets", "test", "openscore_quartets", 36, 220_000)
    zen(5145348, "Leone_Allemandes_Corpus.zip", "zenodo_leone", "dev", "zenodo_leone_allemandes", "CC-BY-4.0", "24 allemandes, Leone 1768")
    zen(17187648, "MusicXML.zip", "zenodo_ciciban", "dev", "zenodo_ciciban", "CC-BY-4.0", "123 Slovenian children's songs")
    json.dump(manifest, open(f"{ROOT}/manifest.core.json", "w"), indent=1)
    print("total", len(manifest), sum(m["bytes"] for m in manifest))
