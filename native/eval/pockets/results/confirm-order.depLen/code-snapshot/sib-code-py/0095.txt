#!/usr/bin/env python3
"""Giver facts from the W3C MusicXML 4.1 XSD (fetched raw from github.com/w3c/musicxml, gh-pages/schema/musicxml.xsd): the element
vocabulary, the content model (child element names) of the elements the reader uses, and a few enumerations. Facts only."""
import json, sys
from lxml import etree
XS = "http://www.w3.org/2001/XMLSchema"
t = etree.parse("/private/tmp/claude-501/notation/music_abc/giver/musicxml.xsd"); r = t.getroot()
q = lambda x: "{%s}%s" % (XS, x)
ctypes = {c.get("name"): c for c in r.findall(q("complexType"))}
groups = {g.get("name"): g for g in r.findall(q("group"))}
elems = {}
for e in r.iter(q("element")):
    if e.get("name") and e.get("name") not in elems: elems[e.get("name")] = e
def children(node, seen=None):
    seen = seen if seen is not None else set(); out = []
    for e in node.iter():
        tag = etree.QName(e).localname
        if tag == "element" and e is not node and (e.get("name") or e.get("ref")): out.append(e.get("name") or e.get("ref"))
        elif tag == "group" and e.get("ref") and e.get("ref") not in seen:
            seen.add(e.get("ref")); out += children(groups[e.get("ref")], seen)
    return out
def cm(name):
    e = elems.get(name)
    if e is None: return None
    ty = e.get("type")
    node = ctypes.get(ty) if ty else e.find(q("complexType"))
    if node is None: return []
    return sorted(set(children(node)))
want = ["score-partwise", "score-timewise", "part-list", "score-part", "part", "measure", "attributes", "note", "backup", "forward", "barline", "direction", "harmony",
        "key", "time", "clef", "pitch", "unpitched", "rest", "grace", "cue", "chord", "tie", "tied", "duration", "voice", "staff", "staves", "divisions", "transpose",
        "identification", "work", "lyric", "notations", "time-modification", "print", "creator"]
enums = {}
for st in r.findall(q("simpleType")):
    es = [x.get("value") for x in st.iter(q("enumeration"))]
    if es: enums[st.get("name")] = es
out = dict(giver="W3C MusicXML 4.1 XSD", url="https://raw.githubusercontent.com/w3c/musicxml/gh-pages/schema/musicxml.xsd",
           git_commit="ba41a601a8272de2d75eb24547f809af228fde5f (last commit touching the file, 2026-09-30)",
           licence="W3C Community Contributor License Agreement (header of the XSD); facts only are encoded",
           elements=sorted(elems), content_model={w: cm(w) for w in want},
           enums={k: enums[k] for k in ["step", "note-type-value", "start-stop", "start-stop-continue", "clef-sign", "mode", "yes-no"] if k in enums})
json.dump(out, open("/private/tmp/claude-501/notation/music_abc/giver/musicxml-xsd-facts.json", "w"), indent=1)
print(len(out["elements"]), {k: len(v or []) for k, v in out["content_model"].items()})
