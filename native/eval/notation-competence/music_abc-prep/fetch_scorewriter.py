#!/usr/bin/env python3
"""Extract the MusicXML files of zenodo.org/records/8305206 (CC-BY-4.0, Rettinghaus/Querfurth/Bogdahn, Enote GmbH)
into raw/scorewriter/ and append them to the manifest (source=scorewriter_comparison, split=test; the whole repo is ONE source)."""
import zipfile, json, hashlib, os, re
ROOT = "/private/tmp/claude-501/notation/music_abc"
z = zipfile.ZipFile(f"{ROOT}/probe/scorewriter.zip")
os.makedirs(f"{ROOT}/raw/scorewriter", exist_ok=True)
man = json.load(open(f"{ROOT}/manifest.core.json"))
man = [m for m in man if m["source"] != "scorewriter_comparison"]
n = 0
for i in z.infolist():
    p = i.filename.replace("scorewriter-comparison-1.0/", "")
    if i.is_dir() or not re.search(r"\.(xml|musicxml)$", p): continue
    parts = p.split("/")
    if len(parts) < 3: continue
    prog, test = parts[0], parts[1]
    b = z.read(i)
    fn = hashlib.sha1(p.encode()).hexdigest()[:12] + ".xml"
    open(f"{ROOT}/raw/scorewriter/{fn}", "wb").write(b)
    man.append(dict(id=f"scorewriter_comparison:{fn[:-4]}", source="scorewriter_comparison", split="test", file=f"raw/scorewriter/{fn}",
                    origin=p, bytes=len(b), url="https://zenodo.org/api/records/8305206/files/scorewriter-comparison-1.0.zip/content",
                    format="musicxml", exporter=prog, test=test, notes="CC-BY-4.0; same test content authored in 4 programs"))
    n += 1
json.dump(man, open(f"{ROOT}/manifest.core.json", "w"), indent=1)
print(n, "files", sum(m["bytes"] for m in man if m["source"] == "scorewriter_comparison"), "bytes")
