#!/usr/bin/env python3
"""Fetch permissively licensed PyPI sdists (by PACKAGE; split by package) as extra held-out code carriers for the chess_pgn R0 negatives.
Records source URL, version, licence (PyPI metadata) and fetch date in code_extra/PROVENANCE.json. Only MIT / BSD / Apache-2.0 / ISC accepted."""
import json, urllib.request, os, sys, tarfile, io, datetime, re
ROOT = "/private/tmp/claude-501/notation/chess_pgn/code_extra"
PKGS = {"dev": ["requests", "click", "jinja2", "markupsafe", "idna"], "test": ["urllib3", "rich", "attrs", "pyyaml", "pynacl", "pycparser"]}
OK = re.compile(r"\b(MIT|BSD|Apache|ISC)\b", re.I)
prov = []
for split, pkgs in PKGS.items():
    for p in pkgs:
        meta = json.load(urllib.request.urlopen(f"https://pypi.org/pypi/{p}/json", timeout=60))
        info = meta["info"]; ver = info["version"]
        lic = (info.get("license_expression") or info.get("license") or "") + " | " + "; ".join(c for c in info.get("classifiers", []) if c.startswith("License"))
        if not OK.search(lic): print("SKIP licence", p, lic[:120]); prov.append({"split": split, "package": p, "skipped": "licence not in {MIT,BSD,Apache,ISC}", "licence": lic[:200]}); continue
        sd = [u for u in meta["urls"] if u["packagetype"] == "sdist"]
        if not sd: print("no sdist", p); continue
        u = sd[0]
        if u["size"] > 12_000_000: print("too big", p, u["size"]); continue
        data = urllib.request.urlopen(u["url"], timeout=120).read()
        d = f"{ROOT}/{split}/{p}"; os.makedirs(d, exist_ok=True)
        tf = tarfile.open(fileobj=io.BytesIO(data), mode="r:gz"); n = 0
        for m in tf.getmembers():
            if not m.isfile() or m.size > 400_000: continue
            if not re.search(r"\.(py|c|h|rs|go|js|ts|cpp|cc|pyx|pxd|txt|rst|md)$", m.name): continue
            if re.search(r"(^|/)(LICENSE|COPYING)", m.name): pass
            rel = m.name.split("/", 1)[1] if "/" in m.name else m.name
            out = f"{d}/{rel}"; os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, "wb").write(tf.extractfile(m).read()); n += 1
        prov.append({"split": split, "package": p, "version": ver, "url": u["url"], "sha256": u["digests"]["sha256"], "bytes": u["size"], "licence": lic[:200], "files_extracted": n, "fetched": datetime.date.today().isoformat()})
        print(split, p, ver, n, "files", lic[:80])
json.dump(prov, open(f"{ROOT}/PROVENANCE.json", "w"), indent=1)
