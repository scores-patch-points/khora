#!/usr/bin/env python3
"""Fetch the WikiPron 'Big Scrape' TSVs chosen by a DECLARED, label-blind rule.

Selection rule (declared before any reader ran; it uses only the README table, never file content):
  - unfiltered TSVs only (the *_filtered.tsv files are near-duplicates of the unfiltered ones);
  - files whose README entry count >= MIN_ENTRIES (500);
  - n <= FULL_MAX_ENTRIES (35,000): fetch the whole file; larger: CHUNKS (6) byte-range chunks of
    CHUNK_BYTES (96 KiB) at offsets size*i/CHUNKS (systematic sample, line-aligned).
Politeness: sequential, 0.2 s between requests, User-Agent names the purpose. No credentials.
Source: https://github.com/CUNY-CL/wikipron (data/scrape/tsv), raw.githubusercontent.com. Data derives from
Wiktionary (CC BY-SA 4.0 / GFDL, https://en.wiktionary.org/wiki/Wiktionary:Copyrights).
"""
import gzip, hashlib, json, os, sys, time, urllib.request

ROOT = "/private/tmp/claude-501/notation/ipa"
RAW = f"{ROOT}/raw/wikipron"
BASE = "https://raw.githubusercontent.com/CUNY-CL/wikipron/master/data/scrape/tsv/"
MIN_ENTRIES, FULL_MAX_ENTRIES, CHUNKS, CHUNK_BYTES = 500, 35000, 6, 96 * 1024
UA = "khora-notation-ipa-fetch/1.0 (competence-card corpus; contact: repo owner)"
os.makedirs(RAW, exist_ok=True)


def get(url, rng=None, tries=4):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Range": f"bytes={rng[0]}-{rng[1]}"} if rng else {})})
    for k in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read(), r.headers
        except Exception as e:  # noqa
            time.sleep(1.5 * (k + 1))
            last = e
    raise last


def head_size(url):
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return int(r.headers["Content-Length"])


rows = [r for r in json.load(open(f"{ROOT}/probe/wikipron_table.json")) if not r["filtered"] and r["n"] >= MIN_ENTRIES]
rows.sort(key=lambda r: r["file"])
log = open(f"{ROOT}/logs/fetch_wikipron.log", "a")
done = 0
for r in rows:
    out = f"{RAW}/{r['file']}.gz"
    meta = f"{RAW}/{r['file']}.json"
    if os.path.exists(out) and os.path.exists(meta):
        continue
    url = BASE + r["file"]
    try:
        if r["n"] <= FULL_MAX_ENTRIES:
            data, hdr = get(url)
            info = {"mode": "full", "bytes": len(data)}
        else:
            size = head_size(url)
            parts = []
            for i in range(CHUNKS):
                off = size * i // CHUNKS
                lo = max(0, off - 1)  # one byte earlier so a line starting exactly at off is recognised
                b, _ = get(url, rng=(lo, min(size - 1, off + CHUNK_BYTES)))
                if i > 0:
                    nl = b.find(b"\n")
                    b = b[nl + 1:] if nl >= 0 else b""
                else:
                    pass
                last = b.rfind(b"\n")
                b = b[:last + 1] if last >= 0 else b
                parts.append(b)
                time.sleep(0.2)
            data = b"".join(parts)
            info = {"mode": "range-chunks", "file_bytes": size, "chunks": CHUNKS, "chunk_bytes": CHUNK_BYTES, "bytes": len(data)}
        info.update({"sha256_of_fetched": hashlib.sha256(data).hexdigest(), "url": url, "fetched": time.strftime("%Y-%m-%d"), **r})
        with gzip.open(out, "wb") as f:
            f.write(data)
        json.dump(info, open(meta, "w"), ensure_ascii=False)
        done += 1
        log.write(f"ok {r['file']} {info['mode']} {info['bytes']}\n"); log.flush()
    except Exception as e:  # noqa
        log.write(f"FAIL {r['file']} {e}\n"); log.flush()
    time.sleep(0.2)
print("fetched", done, "of", len(rows))
