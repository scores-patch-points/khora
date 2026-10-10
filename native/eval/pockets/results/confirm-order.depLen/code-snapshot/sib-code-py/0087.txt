#!/usr/bin/env python3
"""Mutopia LilyPond sources. Piece enumeration via the site's own listing pages (make-table.cgi, 10 pieces/page); pages chosen
deterministically (sha256 of the offset) before any content was read; licence per piece from its .rdf (<mp:licence>);
only Public Domain / CC-BY / CC-BY-SA / CC0 kept. robots.txt: Allow all (checked 2026-10-06)."""
import hashlib, json, os, re, sys, time, urllib.request
sys.path.insert(0, "/private/tmp/claude-501/notation/music_abc/scripts")
ROOT = "/private/tmp/claude-501/notation/music_abc"
UA = "khora-notation-music/1.0 (research fetch; contact michael.t.lacy@gmail.com)"
def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1: return None
            time.sleep(2 + 2 * i)
def lic_of(rdf):
    m = re.search(r"<(?:mp:)?licen[cs]e[^>]*>([^<]+)<", rdf)
    s = (m.group(1) if m else "").strip(); l = s.lower()
    if "noncommercial" in l or "non-commercial" in l or "noderiv" in l: return None, s
    if "public domain" in l: return "Public Domain", s
    if "attribution-sharealike" in l or "by-sa" in l: return "CC-BY-SA", s
    if "creative commons attribution" in l: return "CC-BY", s
    if "creative commons zero" in l or "cc0" in l: return "CC0", s
    return None, s
h = lambda s: hashlib.sha256(s.encode()).hexdigest()
offsets = sorted(range(0, 2400, 10), key=lambda o: h(f"mutopia-offset-{o}"))[:34]
Q = "searchingfor=&Composer=&Instrument=&Style=&collection=&id=&solo=&recent=&timelength=&timeunit=&lilyversion=&preview="
pieces = []
for o in offsets:
    page = get(f"https://www.mutopiaproject.org/cgibin/make-table.cgi?startat={o}&{Q}")
    if not page: continue
    for l in re.findall(r'href="(https://www\.mutopiaproject\.org/ftp/[^"]+\.ly)"', page):
        if l not in [p for p in pieces]: pieces.append(l)
    time.sleep(0.3)
print(len(pieces), "candidate pieces", file=sys.stderr)
os.makedirs(f"{ROOT}/raw/mutopia", exist_ok=True)
man = []
for lyurl in pieces:
    base = lyurl[:-3]
    rdf = get(base + ".rdf")
    if not rdf: continue
    lic, raw = lic_of(rdf)
    if lic is None: continue
    ly = get(lyurl)
    if not ly or len(ly.encode()) > 400_000: continue
    maint = re.search(r"<(?:mp:)?maintainer>([^<]*)<", rdf); comp = re.search(r"<(?:mp:)?composer>([^<]*)<", rdf); instr = re.search(r"<(?:mp:)?for>([^<]*)<", rdf)
    fn = hashlib.sha1(lyurl.encode()).hexdigest()[:12] + ".ly"
    open(f"{ROOT}/raw/mutopia/{fn}", "w", encoding="utf-8").write(ly)
    man.append(dict(id=f"mutopia:{fn[:-3]}", source="mutopia", split=None, file=f"raw/mutopia/{fn}", origin=lyurl.replace("https://www.mutopiaproject.org/ftp/", ""),
                    bytes=len(ly.encode()), url=lyurl, format="lilypond", license=lic, license_raw=raw,
                    maintainer=(maint.group(1).strip() if maint else None), composer=(comp.group(1).strip() if comp else None), instrument=(instr.group(1).strip() if instr else None)))
    time.sleep(0.2)
    if len(man) >= 160: break
json.dump(man, open(f"{ROOT}/manifest.mutopia.json", "w"), indent=1)
print(len(man), "pieces kept", sum(m["bytes"] for m in man), "bytes", file=sys.stderr)
