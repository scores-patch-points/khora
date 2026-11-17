# download-books.py — the seeded draw (books-order.json), from the official Project Gutenberg mirror gutenberg.pglaf.org
# (www.gutenberg.org answered 503 with Retry-After 3600 on 2026-11-17; the ebook id is the same, so the text is the same ebook).
# Cut between the document own story_start / story_end markers. 2 s between requests.
import json, time, urllib.request, re, os, sys
sel = json.load(open("books-order-r6.json")); os.makedirs("books", exist_ok=True)
UA = {"User-Agent": "novel-qa-experiment/0.1 (research)"}
def get(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90) as r: return r.read()
    except Exception: return None
manifest = []
for i, s in enumerate(sel[0:14]):
    if sum(m["ok"] for m in manifest) >= 8: break
    eid = re.search(r"/(?:ebooks|files)/(\d+)", s["story_url"]).group(1)
    path = "/".join(eid[:-1]) if len(eid) > 1 else "0"
    raw = None; used = None
    for suf in (".txt", "-0.txt", "-8.txt"):
        u = f"https://gutenberg.pglaf.org/{path}/{eid}/{eid}{suf}"; raw = get(u); time.sleep(2)
        if raw: used = u; break
    if raw is None: manifest.append({**s, "ok": False, "why": "download failed"}); print(i, s["document_id"][:8], "DOWNLOAD FAILED", flush=True); continue
    txt = raw.decode("utf-8", "replace").replace("\r\n", "\n")
    def mk(m): return re.compile(r"\s*".join(re.escape(t) for t in m.split()))
    tok = lambda z: len(re.findall(r"\w+|[^\w\s]", z))
    starts = list(re.finditer(r"^\*\*\* ?START OF[^\n]*\n", txt, re.M)); endm = list(re.finditer(r"^\*\*\* ?END OF[^\n]*", txt, re.M))
    ma = mk(s["story_start"]).search(txt); mbs = list(mk(s["story_end"]).finditer(txt))
    a0 = ma.start() if ma else (starts[0].end() if starts else None); b0 = mbs[-1].end() if mbs else (endm[-1].start() if endm else None)
    if a0 is None or b0 is None or b0 <= a0: manifest.append({**s, "ok": False, "why": "markers not found", "mirror_url": used}); print(i, s["document_id"][:8], "MARKERS", flush=True); continue
    nq_words = tok(txt[a0:b0]); stated = int(s["story_word_count"])
    if abs(nq_words - stated) > 0.15 * stated: manifest.append({**s, "ok": False, "why": f"token count {nq_words} vs stated {stated}: a different text", "mirror_url": used}); print(i, s["document_id"][:8], "DIFFERENT TEXT", nq_words, stated, flush=True); continue
    endm = list(re.finditer(r"^\*\*\* ?END OF[^\n]*", txt, re.M)); e = endm[-1].start() if endm and endm[-1].start() > a0 else b0
    cut = txt[a0:e].rstrip() + "\n"; words = len(cut.split()); fn = f"books/{s['document_id'][:8]}.txt"; open(fn, "w", encoding="utf8").write(cut)
    manifest.append({**s, "ok": True, "file": fn, "mirror_url": used, "raw_bytes": len(raw), "cut_words": words, "nq_words": nq_words}); print(i, s.get("role"), s["document_id"][:8], f"{words} words (NQ-cut {nq_words}, stated {stated})", s["wiki_title"][:40], flush=True)
json.dump(manifest, open("books-manifest-r6.json", "w"), indent=1); print("usable:", sum(m["ok"] for m in manifest))
