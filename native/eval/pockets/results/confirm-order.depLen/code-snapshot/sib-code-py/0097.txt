#!/usr/bin/env python3
"""build_corpus.py: Plazi treatment XML -> plain-text documents with the curators' name spans.

Input : raw/<split>.jsonl.gz  (fetch.py)
Output: corpus/<split>.jsonl.gz, one JSON object per treatment:
   {id, split, journal, origin, year, lang, title, gbif_taxon, text, truncated, names:[{s,e,rank,genus,subGenus,species,subSpecies,variety,form,
    tribe,subFamily,family,order,authority,authorityName,authorityYear,baseAuthorityName,baseAuthorityYear,status,parent,section}]}
The TEXT is what a reader gets: element text concatenated, whitespace collapsed to one space, a newline at every block boundary, a tab
between table cells. normalizedToken elements are replaced by their originalValue (the verbatim text; Plazi's content is the
diacritic-stripped form). Characters above U+FFFF are replaced by U+FFFD so that offsets are identical in Python code points and JavaScript UTF-16 units.
The name spans are Plazi's markup (GoldenGATE-assisted, curated). They are NOT the gold: build_gold.py audits them with gnparser.
Each treatment is cut at a paragraph boundary to <= MAXCHARS characters (declared; names past the cut are dropped with the text).
"""
import gzip, json, os, sys, re
from lxml import etree

ROOT = os.environ.get("TAXONOMY_ROOT", "/private/tmp/claude-501/notation/taxonomy")
MAXCHARS = 20000
BLOCK = {"paragraph", "heading", "subSubSection", "subSection", "section", "caption", "tr", "table", "treatment", "keyStep", "keyLead", "key"}
CELL = {"td", "th"}
ATTRS = ["rank", "genus", "subGenus", "species", "subSpecies", "variety", "form", "tribe", "subFamily", "family", "order", "class", "authority",
         "authorityName", "authorityYear", "baseAuthorityName", "baseAuthorityYear", "status", "isUncertain"]

def local(tag):
    return tag.split("}")[-1] if isinstance(tag, str) else None

class TB:
    def __init__(self):
        self.buf = []; self.pend = False; self.open = None; self.names = []; self.depth = 0; self.nested = 0
    def last(self):
        return self.buf[-1] if self.buf else None
    def add(self, s):
        for ch in s:
            if ch.isspace():
                if self.buf and self.buf[-1] != "\n" and self.buf[-1] != "\t": self.pend = True
                continue
            if self.pend:
                self.buf.append(" "); self.pend = False
            if self.open is not None and self.open["s"] is None: self.open["s"] = len(self.buf)
            self.buf.append("\ufffd" if ord(ch) > 0xFFFF else ch)   # astral characters -> U+FFFD: offsets are then identical in code points and UTF-16 units
            if self.open is not None: self.open["e"] = len(self.buf)
    def nl(self):
        if self.buf and self.buf[-1] != "\n": self.buf.append("\n")
        self.pend = False
    def tab(self):
        if self.buf and self.buf[-1] not in ("\n", "\t"): self.buf.append("\t")
        self.pend = False

def walk(el, tb, ctx):
    tag = local(el.tag)
    if tag is None:  # comment / PI
        return
    if tag == "normalizedToken":
        tb.add(el.get("originalValue") or "".join(el.itertext()))
        return
    is_name = tag == "taxonomicName"
    if tag in BLOCK: tb.nl()
    if tag in CELL: tb.tab()
    sec = ctx.get("section")
    if tag == "subSubSection" and el.get("type"): ctx = dict(ctx, section=el.get("type"))
    opened = None
    if is_name:
        if tb.open is None:
            opened = {"s": None, "e": None, "parent": local(el.getparent().tag) if el.getparent() is not None else None, "section": ctx.get("section")}
            for a in ATTRS:
                if el.get(a) is not None: opened[a] = el.get(a)
            tb.open = opened
        else:
            tb.nested += 1
    if el.text: tb.add(el.text)
    for ch in el:
        walk(ch, tb, ctx)
        if ch.tail: tb.add(ch.tail)
    if opened is not None:
        tb.open = None
        if opened["s"] is not None and opened["e"] is not None: tb.names.append(opened)
    if tag in BLOCK: tb.nl()

def build(rec, split):
    root = etree.fromstring(rec["xml"].encode("utf8"))
    t = None
    for el in root.iter():
        if local(el.tag) == "treatment": t = el; break
    if t is None: return None
    tb = TB(); walk(t, tb, {})
    text = "".join(tb.buf).strip("\n")
    lead = len("".join(tb.buf)) - len("".join(tb.buf).lstrip("\n"))
    names = [dict(n, s=n["s"] - lead, e=n["e"] - lead) for n in tb.names]
    truncated = False
    if len(text) > MAXCHARS:
        cut = text.rfind("\n", 0, MAXCHARS)
        cut = cut if cut > MAXCHARS // 2 else MAXCHARS
        text = text[:cut]; truncated = True
        names = [n for n in names if n["e"] <= cut]
    if len(text) < 80: return None
    for n in names: assert text[n["s"]:n["e"]].strip(), (rec["docId"], n)
    return {"id": rec["docId"], "split": split, "journal": rec["journal"], "origin": rec["origin"], "year": rec["year"], "lang": root.get("docLanguage") or "",
            "title": rec.get("title", ""), "gbif_taxon": t.get("ID-GBIF-Taxon"), "text": text, "truncated": truncated, "names": names, "nested": tb.nested}

def main():
    os.makedirs(f"{ROOT}/corpus", exist_ok=True)
    stats = {}
    for split in ("train", "dev", "test"):
        src = f"{ROOT}/raw/{split}.jsonl.gz"
        if not os.path.exists(src): continue
        n = bad = 0; chars = 0; names = 0
        with gzip.open(src, "rt", encoding="utf8") as f, gzip.open(f"{ROOT}/corpus/{split}.jsonl.gz", "wt", encoding="utf8") as out:
            for line in f:
                rec = json.loads(line)
                try: d = build(rec, split)
                except Exception as e:
                    bad += 1; print("bad", rec["docId"], repr(e)[:120], file=sys.stderr); continue
                if d is None: bad += 1; continue
                out.write(json.dumps(d, ensure_ascii=False) + "\n"); n += 1; chars += len(d["text"]); names += len(d["names"])
        stats[split] = {"docs": n, "dropped": bad, "chars": chars, "plazi_name_spans": names, "bytes_gz": os.path.getsize(f"{ROOT}/corpus/{split}.jsonl.gz")}
        print(split, stats[split], flush=True)
    json.dump(stats, open(f"{ROOT}/corpus/stats.json", "w"), indent=1)

if __name__ == "__main__":
    main()
