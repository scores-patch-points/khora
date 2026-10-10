#!/usr/bin/env python3
"""uml_bpmn-data.py: corpus, split manifest and GOLD for the uml_bpmn notation family (BPMN 2.0 XML, Graphviz DOT).

Run with the venv:   /private/tmp/claude-501/venv/bin/python eval/notation-competence/uml_bpmn-data.py build [--only bpmn|dot|neg]
The fetch step is scripts/select_fetch.py + scripts/dot_fetch.py (copies kept in /private/tmp/claude-501/notation/uml_bpmn/scripts).

THIS FILE NEVER IMPORTS, RUNS OR CALLS THE ADAPTER (adapters/notation/uml_bpmn.js). The adapter is the system under test; this file is the
gold side. Gold authorities (independent of the adapter, and of each other where possible):
  * BPMN 2.0 XML
      - document structure: lxml / libxml2 (tree, namespaces, ids, attribute values) and Python's expat (the SAME document tokenised by a
        second, unrelated XML parser: markup-unit byte offsets, ordered raw attribute names/values). The i-th expat start tag must be the i-th
        lxml element or the document is dropped as a typed gap.
      - what a name MEANS (element class, which attributes are references): the OMG Semantic.xsd / BPMNDI.xsd as redistributed in
        bpmn-io/bpmn-moddle (MIT) under resources/bpmn/xsd. The adapter's PRIOR is built from a DIFFERENT artifact of the same standard
        (bpmn-moddle's resources/bpmn/json/bpmn.json, generated from the OMG CMOF) plus TRAIN counts; this file cross-checks the two tables.
  * Graphviz DOT: pydot (MIT; a pyparsing grammar of the DOT language), see build_dot().
Output (under /private/tmp/claude-501/notation/uml_bpmn): corpus/<split>/<id>.txt, corpus/manifest.json, gold/<split>/gold.jsonl.gz.
Split rule: BY SOURCE (repository lineage / treebank split / mermaid directory), never by file within one source. Cross-split structural
near-duplicates are REMOVED from the later split (priority train > dev > test) and counted in the manifest."""
import sys, os, re, json, gzip, hashlib, collections, random, subprocess, io
import xml.parsers.expat as EX
from lxml import etree

BASE = "/private/tmp/claude-501/notation/uml_bpmn"
RAW = f"{BASE}/raw"
CORPUS = f"{BASE}/corpus"
GOLD = f"{BASE}/gold"
ETHOS = "/Users/mlacy/Documents/3.0/ethos/09-source-code"
TB = "/private/tmp/claude-501/tb"
UDEVAL = "/private/tmp/claude-501/ud-eval"
XSD_DIR = f"{RAW}/git/bpmn-moddle/resources/bpmn/xsd"

NS_MODEL = "http://www.omg.org/spec/BPMN/20100524/MODEL"
NS_DI = {"http://www.omg.org/spec/BPMN/20100524/DI", "http://www.omg.org/spec/DD/20100524/DI", "http://www.omg.org/spec/DD/20100524/DC"}
NS_XSD = "http://www.w3.org/2001/XMLSchema"
XSD = lambda t: f"{{{NS_XSD}}}{t}"
MAX_BYTES = 250_000
H = lambda s: hashlib.sha1(s if isinstance(s, bytes) else s.encode()).hexdigest()
H256 = lambda b: hashlib.sha256(b).hexdigest()

# ───────────────────────────── the OMG XSD as the gold authority for "what a name means" ─────────────────────────────
class Xsd:
    def __init__(self):
        self.base = {}        # type name -> base type name
        self.elem_type = {}   # element name -> type name (global and local)
        self.attrs = {}       # type name -> {attr: xsd type}
        self.ref_text = set() # element names whose content is a QName/IDREF (child-element references)
        t = etree.parse(f"{XSD_DIR}/Semantic.xsd").getroot()
        strip = lambda s: s.split(":")[-1] if s else s
        for ct in t.iter(XSD("complexType")):
            n = ct.get("name")
            if not n: continue
            for ext in list(ct.iter(XSD("extension"))) + list(ct.iter(XSD("restriction"))):
                self.base[n] = strip(ext.get("base")); break
            self.attrs[n] = {a.get("name"): strip(a.get("type")) for a in ct.findall(f".//{XSD('attribute')}") if a.get("name")}
        for el in t.iter(XSD("element")):
            n, ty = el.get("name"), el.get("type")
            if n and ty:
                self.elem_type.setdefault(n, strip(ty))
                if strip(ty) in ("QName", "IDREF"): self.ref_text.add(n)
        # diagram-interchange attributes that are references (A1b: derived from BPMNDI/DI/DC.xsd; the first build hand-listed three of them and missed labelStyle)
        self.di_ref = set()
        for f in ("BPMNDI.xsd", "DI.xsd", "DC.xsd"):
            r = etree.parse(f"{XSD_DIR}/{f}").getroot()
            for a in r.iter(XSD("attribute")):
                if a.get("name") and strip(a.get("type")) in ("QName", "IDREF", "IDREFS"): self.di_ref.add(a.get("name"))
    def chain(self, ty):
        out = []
        while ty and ty not in out:
            out.append(ty); ty = self.base.get(ty)
        return out
    def klass(self, local):
        """element class of a MODEL-namespace element name (the gold class set)."""
        if local == "definitions": return "definitions"   # the document root (declared in BPMN20.xsd, not Semantic.xsd)
        ty = self.elem_type.get(local)
        if ty is None: return "model_other"
        c = self.chain(ty)
        if "tFlowNode" in c: return "flow_node"
        if any(x in c for x in ("tSequenceFlow", "tMessageFlow", "tAssociation", "tDataAssociation")): return "edge"
        if any(x in c for x in ("tParticipant", "tLane")): return "swimlane"
        if any(x in c for x in ("tProcess", "tCollaboration", "tChoreography")): return "process"
        # data: the XSD types that carry data items (hand-declared list of XSD type names; the derivation chain is the XSD's own)
        if any(x in c for x in ("tDataObject", "tDataObjectReference", "tDataStoreReference", "tDataStore", "tDataInput", "tDataOutput", "tProperty")): return "data"
        if "tArtifact" in c: return "artifact"
        return "model_other"
    def attr_role(self, local, attr):
        """role of an unqualified attribute on a MODEL element: decl | ref | label | other"""
        ty = self.elem_type.get(local)
        for t in self.chain(ty):
            if attr in self.attrs.get(t, {}):
                xt = self.attrs[t][attr]
                if xt == "ID": return "decl"
                if xt in ("IDREF", "QName", "IDREFS"): return "ref"
                if attr == "name": return "label"
                return "other"
        if attr == "id": return "decl"
        if attr == "name": return "label"
        return "other"
BEING_CLASSES = ("flow_node", "swimlane", "process", "data", "artifact")
EDGE_LABELS = {"sequenceFlow": "sequence_flow", "messageFlow": "message_flow", "association": "association"}

# ───────────────────────────────────────────── offsets ─────────────────────────────────────────────
def b2u(b):
    """byte offset -> UTF-16 code-unit offset (what a JavaScript string index is)."""
    if b.isascii(): return lambda i: i
    arr = [0] * (len(b) + 1); u = 0; i = 0
    for ch in b.decode("utf-8"):
        n = len(ch.encode("utf-8"))
        for k in range(n): arr[i + k] = u
        i += n; u += 2 if ord(ch) > 0xFFFF else 1
    arr[i] = u
    return lambda j: arr[j]

def expat_units(b):
    """markup units of a UTF-8 XML document from expat (raw qnames, no namespace processing). Returns (units, attrs_by_unit, nstart).
    unit = [s, e, kind] in BYTE offsets; kinds: decl pi comment doctype cdata tag_start tag_empty tag_end text.  Raises on malformed XML."""
    p = EX.ParserCreate(); p.ordered_attributes = True
    ev = []
    def rec(kind, keep=None):
        def f(*a): ev.append((p.CurrentByteIndex, kind, a))
        return f
    p.StartElementHandler = rec("start"); p.EndElementHandler = rec("end"); p.CharacterDataHandler = rec("chars")
    p.CommentHandler = rec("comment"); p.ProcessingInstructionHandler = rec("pi"); p.XmlDeclHandler = rec("decl")
    p.StartCdataSectionHandler = rec("cdata+"); p.EndCdataSectionHandler = rec("cdata-"); p.DefaultHandler = rec("default")
    p.StartDoctypeDeclHandler = rec("doctype")
    p.Parse(b, True)
    n = len(b)
    units, attrs = [], {}
    starts = [e[0] for e in ev]
    def next_start(i):
        k = ev[i][0]
        for j in range(i + 1, len(ev)):
            if ev[j][0] > k: return ev[j][0]
        return n
    def rstripped(s, e):
        while e > s and b[e - 1:e] in (b" ", b"\t", b"\r", b"\n"): e -= 1
        return e
    i = 0; nstart = 0; skip_end = -1
    while i < len(ev):
        idx, kind, a = ev[i]
        if kind == "start":
            e = rstripped(idx, next_start(i))
            # an empty-element tag <a/> is an expat start event followed at once by an end event with NO end-tag text of its own; the end event's
            # offset cannot tell <a/></p> from <a></a>, so the tag's own last two bytes decide (the tag extent itself is expat's)
            selfclosing = b[idx:e].endswith(b"/>") and i + 1 < len(ev) and ev[i + 1][1] == "end"
            if selfclosing: skip_end = i + 1
            attrs[len(units)] = [(a[1][k], a[1][k + 1]) for k in range(0, len(a[1]), 2)]
            units.append([idx, e, "tag_empty" if selfclosing else "tag_start", a[0]]); nstart += 1
        elif kind == "end":
            if i != skip_end:
                units.append([idx, rstripped(idx, next_start(i)), "tag_end", a[0]])
        elif kind in ("comment", "pi", "decl", "doctype"):
            units.append([idx, rstripped(idx, next_start(i)), kind])
        elif kind == "cdata+":
            j = i + 1
            while j < len(ev) and ev[j][1] != "cdata-": j += 1
            units.append([idx, ev[j][0] + 3 if j < len(ev) else n, "cdata"]); i = j
        elif kind == "chars":
            j = i; txt = ""
            while j + 1 < len(ev) and ev[j + 1][1] == "chars": j += 1
            for k in range(i, j + 1): txt += ev[k][2][0]
            if txt.strip():
                s = idx; e = next_start(j)
                # trim surrounding whitespace to the non-blank run (the gold text unit)
                while s < e and b[s:s + 1] in (b" ", b"\t", b"\r", b"\n"): s += 1
                e = rstripped(s, e)
                units.append([s, e, "text", txt.strip()])
            i = j
        i += 1
    # self-check of the gold units: ordered, non-overlapping, and as many closing tags as non-empty start tags
    for k in range(1, len(units)):
        assert units[k][0] >= units[k - 1][1], "unit overlap"
    assert sum(1 for u in units if u[2] == "tag_end") == sum(1 for u in units if u[2] == "tag_start"), "tag balance"
    return units, attrs, nstart

# ───────────────────────────────────────────── BPMN gold ─────────────────────────────────────────────
XSDG = None
def struct_fp(root):
    seq = []
    for el in root.iter():
        if not isinstance(el.tag, str): continue
        q = etree.QName(el)
        if q.namespace in NS_DI: continue
        seq.append(((q.namespace or "") + "|" + q.localname))
    return H("\n".join(seq))

def gold_bpmn(raw, with_gold=True):
    """returns dict(ok, why, text, gold, fp) for a BPMN-ish document. gold is None when with_gold is False."""
    global XSDG
    XSDG = XSDG or Xsd()
    if raw.startswith(b"\xef\xbb\xbf"): raw = raw[3:]
    try: text = raw.decode("utf-8")
    except UnicodeDecodeError: return dict(ok=False, why="non_utf8")
    m = re.match(rb'\s*<\?xml[^>]*encoding=["\']([^"\']+)', raw)
    if m and m.group(1).lower() not in (b"utf-8", b"utf8", b"us-ascii", b"ascii"): return dict(ok=False, why="declared_non_utf8")
    if b"<!ENTITY" in raw: return dict(ok=False, why="internal_entities")
    try: root = etree.fromstring(raw, etree.XMLParser(resolve_entities=False, huge_tree=False))
    except Exception: return dict(ok=False, why="lxml_parse_error")
    try: units, attrs, nstart = expat_units(raw)
    except Exception: return dict(ok=False, why="expat_parse_error")
    els = [e for e in root.iter() if isinstance(e.tag, str)]
    if len(els) != nstart: return dict(ok=False, why="expat_lxml_element_count_mismatch")
    q = etree.QName(root)
    rootns, rootlocal = q.namespace, q.localname
    is_bpmn = rootns == NS_MODEL or rootns in NS_DI
    out = dict(ok=True, text=text, root=[rootns, rootlocal], is_bpmn=is_bpmn, fp=struct_fp(root))
    if not with_gold: return out
    cv = b2u(raw)
    # map unit index -> element for start tags (document order)
    si = [k for k, u in enumerate(units) if u[2] in ("tag_start", "tag_empty")]
    assert len(si) == len(els)
    elems, beings, relations, aroles, ids = [], [], [], [], set()
    parent_of = {}
    for el in els:
        for ch in el: parent_of[ch] = el
    for k, el in zip(si, els):
        qn = etree.QName(el); ns, loc = qn.namespace, qn.localname
        if ns == NS_MODEL: cls = XSDG.klass(loc)
        elif ns in NS_DI: cls = "diagram"
        else: cls = "ext"
        elems.append([k, ns, loc, cls])
        # attribute roles: raw ordered attribute names from expat, role from the XSD for unqualified attributes on MODEL elements
        roles = []
        for (an, av) in attrs[k]:
            if an == "xmlns" or an.startswith("xmlns:"): roles.append("nsdecl")
            elif ns == NS_MODEL and ":" not in an: roles.append(XSDG.attr_role(loc, an))
            elif ns in NS_DI and ":" not in an: roles.append("ref" if an in XSDG.di_ref else ("decl" if an == "id" else "other"))
            else: roles.append("ext")
        aroles.append([k, roles])
        if ns == NS_MODEL and el.get("id"): ids.add(el.get("id"))
    # text units roles
    troles = []
    ui_text = [k for k, u in enumerate(units) if u[2] == "text"]
    # parent element of a text unit: nearest preceding tag_start/tag_empty not yet closed -> track a stack
    stack, elem_iter = [], iter(zip(si, els))
    pending = {k: el for k, el in zip(si, els)}
    for k, u in enumerate(units):
        if u[2] == "tag_start": stack.append(pending[k])
        elif u[2] == "tag_end": stack.pop() if stack else None
        elif u[2] == "text":
            par = stack[-1] if stack else None
            qp = etree.QName(par) if par is not None else None
            troles.append([k, "ref_text" if qp is not None and qp.namespace == NS_MODEL and qp.localname in XSDG.ref_text else "text"])
    for k, el in zip(si, els):
        qn = etree.QName(el)
        if qn.namespace != NS_MODEL: continue
        loc = qn.localname; cls = XSDG.klass(loc)
        if cls in BEING_CLASSES and el.get("id"):
            beings.append(dict(id=el.get("id"), kind=loc, cls=cls, unit=k, name=el.get("name")))
        if loc in EDGE_LABELS:
            relations.append(dict(e1=el.get("sourceRef"), label=EDGE_LABELS[loc], e2=el.get("targetRef"), unit=k))
        elif loc in ("dataInputAssociation", "dataOutputAssociation"):
            srcs = [c.text.strip() for c in el if isinstance(c.tag, str) and etree.QName(c).localname == "sourceRef" and c.text]
            tgts = [c.text.strip() for c in el if isinstance(c.tag, str) and etree.QName(c).localname == "targetRef" and c.text]
            for s_ in srcs:
                for t_ in tgts: relations.append(dict(e1=s_, label="data_association", e2=t_, unit=k))
        elif loc == "boundaryEvent" and el.get("attachedToRef"):
            relations.append(dict(e1=el.get("id"), label="attached_to", e2=el.get("attachedToRef"), unit=k))
    # an edge element that names no endpoint orders nothing: it is not a relation (counted, typed)
    n_noend = sum(1 for r in relations if r["e1"] is None or r["e2"] is None)
    relations = [r for r in relations if r["e1"] is not None and r["e2"] is not None]
    for r in relations: r["resolved"] = bool(r["e1"] in ids and r["e2"] in ids)
    def conv(u):
        return [cv(u[0]), cv(u[1]), u[2]] + ([u[3]] if u[2] in ("tag_start", "tag_empty", "tag_end") else [])
    gunits = [conv(u) for u in units]
    out["gold"] = dict(root=out["root"], units=gunits, attrs={str(k): [[n, v] for n, v in a] for k, a in attrs.items()},
                       elems=elems, aroles=aroles, troles=troles, beings=beings, relations=relations, n_chars=cv(len(raw)),
                       has_doctype=any(u[2] == "doctype" for u in units), nids=len(ids), edges_without_endpoints=n_noend)
    return out

# ───────────────────────────────────────────── corpus assembly ─────────────────────────────────────────────
LINEAGE = {  # repo -> (lineage, split, licence, licence-url)
    "flowable-engine": ("activiti", "train", "Apache-2.0", "https://github.com/flowable/flowable-engine"),
    "Activiti": ("activiti", "train", "Apache-2.0", "https://github.com/Activiti/Activiti"),
    "camunda-bpm-platform": ("camunda", "dev", "Apache-2.0", "https://github.com/camunda/camunda-bpm-platform"),
    "camunda-modeler": ("camunda", "dev", "MIT", "https://github.com/camunda/camunda-modeler"),
    "bpmn-moddle": ("camunda", "dev", "MIT", "https://github.com/bpmn-io/bpmn-moddle"),
    "kogito-runtimes": ("jbpm", "test", "Apache-2.0", "https://github.com/apache/incubator-kie-kogito-runtimes"),
    "kogito-examples": ("jbpm", "test", "Apache-2.0", "https://github.com/apache/incubator-kie-kogito-examples"),
}
CAPS = {  # per-split post-dedupe caps per source (deterministic by sha1(path); MIWG is kept whole per process)
    "bpmn": {"flowable-engine": 900, "Activiti": 600, "camunda-bpm-platform": 300, "camunda-modeler": 70, "bpmn-moddle": 80, "kogito-runtimes": 320, "kogito-examples": 110},
    "dmn": {"flowable-engine": 60, "camunda-bpm-platform": 40, "camunda-modeler": 25, "kogito-runtimes": 30, "kogito-examples": 20},
    "cmmn": {"flowable-engine": 60, "camunda-bpm-platform": 40},
    "xml": {"flowable-engine": 70, "Activiti": 60, "camunda-bpm-platform": 50, "camunda-modeler": 12, "kogito-runtimes": 45, "kogito-examples": 35},
    "xsd": {"flowable-engine": 10, "Activiti": 8, "camunda-bpm-platform": 10, "kogito-runtimes": 1},
}
MIWG_SPLIT = lambda proc: "dev" if proc.startswith("A.") else "test"

def read_file(path):
    b = open(path, "rb").read()
    return b

def walk_sel():
    sel = json.load(open(f"{RAW}/selection.json"))
    return sel

def build_bpmn(docs, stats):
    sel = walk_sel()
    seen_fp = {}  # fp -> split (priority order enforced by processing splits in order)
    cand = []     # (split_priority, record)
    for repo, (lineage, split, lic, url) in LINEAGE.items():
        for cls in ("bpmn", "dmn", "cmmn", "xml", "xsd"):
            paths = sel[repo].get(cls, [])
            for p in paths:
                f = f"{RAW}/git/{repo}/{p}"
                if not os.path.exists(f): continue
                cand.append(dict(repo=repo, path=p, cls=cls, lineage=lineage, split=split, license=lic, group=None))
    # MIWG: reference + tool exports, split by PROCESS group; each tool dir is a vendor
    for p in sel["bpmn-miwg-test-suite"]["bpmn"]:
        f = f"{RAW}/git/bpmn-miwg-test-suite/{p}"
        if not os.path.exists(f): continue
        m = re.search(r"/(?P<proc>[A-Z]\.\d+\.\d+)(?:-export)?\.bpmn$", p)
        if not m: stats["miwg_unparsed_name"] += 1; continue
        cand.append(dict(repo="bpmn-miwg-test-suite", path=p, cls="bpmn", lineage="miwg:" + p.split("/")[0], split=MIWG_SPLIT(m.group("proc")), license="CC-BY-3.0", group=m.group("proc"), tool=p.split("/")[0]))
    cand.sort(key=lambda c: (["train", "dev", "test"].index(c["split"]), c["repo"], H(c["path"])))
    per_cap = collections.Counter()
    for c in cand:
        raw = read_file(f"{RAW}/git/{c['repo']}/{c['path']}")
        if len(raw) > MAX_BYTES or len(raw) < 150: stats["size_out_of_range"] += 1; continue
        want_gold = c["cls"] == "bpmn"
        r = gold_bpmn(raw, with_gold=want_gold)
        if not r["ok"]:
            stats["drop:" + r["why"] + ":" + c["cls"]] += 1; continue
        # content-verified label: BPMN iff root in the standard's namespaces; a provenance/content mismatch is a typed gap, not a relabel
        if c["cls"] == "bpmn" and not r["is_bpmn"]:
            stats["bpmn_provenance_but_not_bpmn_ns(excluded)"] += 1; continue
        if c["cls"] != "bpmn" and r["is_bpmn"]:
            stats["stranger_provenance_but_bpmn_ns(excluded)"] += 1; continue
        key = (c["cls"] == "bpmn", r["fp"])
        if key in seen_fp:
            same = seen_fp[key] == c["split"]
            # A1 (post hoc, disclosed in the instrument header): the MIWG suite is the same reference processes exported by many tools, so its
            # same-split near-duplicates are the point (the cross-tool R5 arm); they are exempt from SAME-split de-duplication, never from CROSS-split
            if not (same and c["repo"] == "bpmn-miwg-test-suite"):
                stats[f"dedup_{'same' if same else 'cross'}_split:{c['cls']}"] += 1; continue
            stats["miwg_same_split_duplicates_kept"] += 1
        else:
            seen_fp[key] = c["split"]
        capk = (c["split"], c["cls"], c["repo"])
        capn = CAPS.get(c["cls"], {}).get(c["repo"], 10**9) if c["repo"] != "bpmn-miwg-test-suite" else 10**9
        if per_cap[capk] >= capn: stats[f"capped:{c['cls']}"] += 1; continue
        per_cap[capk] += 1
        did = f"{c['repo']}--{H(c['path'])[:8]}"
        rec = dict(id=did, split=c["split"], source=c["repo"], lineage=c["lineage"], license=c["license"], path=c["path"], sha256=H256(raw),
                   bytes=len(raw), n_chars=None, kind="pos" if c["cls"] == "bpmn" else "neg",
                   dialect="bpmn_xml" if c["cls"] == "bpmn" else "other",
                   neg_kind=None if c["cls"] == "bpmn" else {"dmn": "xml_dmn", "cmmn": "xml_cmmn", "xml": "xml_other", "xsd": "xml_other"}[c["cls"]],
                   group=c.get("group"), tool=c.get("tool"), fragment=bool(c["cls"] == "bpmn" and r["root"][1] != "definitions"))
        rec["text"] = r["text"]
        if want_gold: rec["gold"] = r["gold"]; rec["_raw"] = raw
        docs.append(rec)
    return docs

def build_neg_other(docs, stats):
    """mermaid (by directory), SBGN-ML (by directory): near-miss diagram strangers. Never in any prior; gold = provenance label only."""
    sel = walk_sel()
    MM = {"sequence": "dev", "class-diagram": "dev", "flowchart": "test", "gitgraph": "test"}
    rng = random.Random(20261006)
    mm = []
    for p in sel["mermaid"]["mmd"]:
        f = f"{RAW}/git/mermaid/{p}"
        if not os.path.exists(f): continue
        parts = p.split("/")
        sub = parts[2] if len(parts) > 3 else "misc"
        mm.append((sub, p, f))
    mm.sort(key=lambda t: H(t[1]))
    per = collections.Counter()
    for sub, p, f in mm:
        split = MM.get(sub, "test" if H(sub)[0] in "01234567" else "dev")
        if per[(split, sub)] >= 40: continue
        raw = read_file(f)
        if not (60 <= len(raw) <= 20000): continue
        try: text = raw.decode("utf-8")
        except UnicodeDecodeError: continue
        per[(split, sub)] += 1
        docs.append(dict(id=f"mermaid--{H(p)[:8]}", split=split, source="mermaid", lineage="mermaid", license="MIT", path=p, sha256=H256(raw), bytes=len(raw),
                         kind="neg", dialect="other", neg_kind="mermaid:" + sub, group=None, text=text))
    SB = {"PD": "dev", "ER": "test", "AF": "test", "example-files": "dev"}
    for p in sel["libsbgn"]["sbgn"]:
        f = f"{RAW}/git/libsbgn/{p}"
        if not os.path.exists(f): continue
        raw = read_file(f)
        r = gold_bpmn(raw, with_gold=False)
        if not r["ok"]: stats["drop:sbgn:" + r["why"]] += 1; continue
        sub = p.split("/")[-2] if "/" in p else "misc"
        docs.append(dict(id=f"libsbgn--{H(p)[:8]}", split=SB.get(sub, "test"), source="libsbgn", lineage="libsbgn", license="Apache-2.0 (libsbgn is dual LGPL-2.1+ / Apache-2.0; the Apache-2.0 option is taken)",
                         path=p, sha256=H256(raw), bytes=len(raw), kind="neg", dialect="other", neg_kind="sbgn_ml", group=None, text=r["text"]))
    return docs

# RULE 11 (provenance and licence): only MIT, BSD, Apache-2.0, ISC, CC0, CC-BY, CC-BY-SA, public domain. The manifest records the EXACT SPDX per document (a generic string
# hid the Italian treebank's non-commercial terms from the first licence record; dated amendment A6 of uml_bpmn.mjs). A document whose SPDX is not in ALLOWED_SPDX makes the
# build fail loudly (see licence_audit below); a treebank known to be non-permissive is listed in PROSE_EXCLUDED with the line of its LICENSE.txt that says so.
ALLOWED_SPDX = {"MIT", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "ISC", "CC0-1.0", "CC-BY-3.0", "CC-BY-4.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0", "Unlicense"}
PROSE_TREEBANKS = {   # stem -> (treebank, SPDX as the treebank's own LICENSE.txt / README `License:` line states it; read 2026-10-06)
    "eng": ("UD_English-EWT v2.18", "CC-BY-SA-4.0"),
    "spa": ("UD_Spanish-AnCora", "CC-BY-4.0"),
    "deu": ("UD_German-GSD", "CC-BY-SA-4.0"),
    "fra": ("UD_French-GSD", "CC-BY-SA-4.0"),
    "rus": ("UD_Russian-GSD", "CC-BY-SA-4.0"),
}
PROSE_EXCLUDED = {    # stem -> why (typed gap in the R0 card: `prose_language_excluded_licence:<stem>`)
    "ita": ("UD_Italian-ISDT", "CC BY-NC-SA 3.0 (tb/ita/LICENSE.txt: 'Attribution-NonCommercial-ShareAlike 3.0 Unported licence'; README `License: CC BY-NC-SA 3.0`): non-commercial terms are not permissive"),
}
PROSE_STEMS = list(PROSE_TREEBANKS)
def conllu_texts(path):
    out = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("# text = "): out.append(line[9:].strip())
    return out
def build_prose(docs, stats):
    for stem, (tb, why) in PROSE_EXCLUDED.items(): stats[f"prose_excluded_licence:{stem}"] += 1
    for split in ("train", "dev", "test"):
        for stem in PROSE_STEMS:
            path = f"{TB}/{stem}/train.conllu" if split == "train" else f"{UDEVAL}/{stem}/{split}.conllu"
            if not os.path.exists(path): stats[f"prose_missing:{stem}:{split}"] += 1; continue
            lines = conllu_texts(path)
            n = 40 if split == "train" else 24
            per = 14  # sentences per document
            tb, spdx = PROSE_TREEBANKS[stem]
            for k in range(n):
                chunk = lines[k * per:(k + 1) * per]
                if len(chunk) < per: break
                text = " ".join(chunk)
                docs.append(dict(id=f"prose-{stem}-{split}-{k:03d}", split=split, source=f"ud-{stem}", lineage=f"ud-{stem}-{split}", license=f"{spdx} ({tb}; the treebank's LICENSE.txt and README read)", path=f"{stem}/{split}",
                                 sha256=H256(text.encode()), bytes=len(text.encode()), kind="neg", dialect="other", neg_kind=f"prose:{stem}", group=None, text=text))
    return docs

CODE_CORPUS = "/private/tmp/claude-501/code-corpus"
CODE_LANGS = {"code": ["c", "cpp", "go", "python", "javascript", "typescript", "java", "rust", "ruby", "php", "bash", "sql", "c_sharp"],
              "markup": ["html", "vue", "svelte", "latex", "markdown"], "data": ["json", "yaml", "toml", "css"]}
PER_LANG = 6
def build_code(docs, stats):
    """strangers from the sibling code corpus (/private/tmp/claude-501/code-corpus: permissively licensed repositories, split BY REPOSITORY, built by another
    workflow; read-only here). Programming languages, markup (html/vue/svelte/latex/markdown) and data (json/yaml/toml/css) are separate stranger groups."""
    m = json.load(open(f"{CODE_CORPUS}/manifest.json"))
    SPDX_OF = {"mit": "MIT", "apache-2.0": "Apache-2.0", "bsd-3-clause": "BSD-3-Clause", "bsd-2-clause": "BSD-2-Clause", "unlicense": "Unlicense", "isc": "ISC", "cc0-1.0": "CC0-1.0"}
    for grp, langs in CODE_LANGS.items():
        for lang in langs:
            L = m["languages"].get(lang)
            if not L: stats[f"code_lang_missing:{lang}"] += 1; continue
            for split in ("train", "dev", "test"):
                rows = [r for r in L[split] if not r.get("restricted")]
                rows.sort(key=lambda r: H(r["path"]))
                taken = 0
                for r in rows:
                    if taken >= PER_LANG: break
                    rp = m["repos"].get(r["repo"], {})
                    spdx = SPDX_OF.get(str(rp.get("license", "")).lower())
                    if spdx is None or rp.get("license_class") != "permissive": stats[f"drop:code_licence_not_allowed:{rp.get('license')}"] += 1; continue
                    try: raw = open(r["path"], "rb").read()
                    except OSError: continue
                    try: text = raw.decode("utf-8")
                    except UnicodeDecodeError: continue
                    if len(text) < 600: continue
                    taken += 1
                    docs.append(dict(id=f"{grp}-{lang}--{H(r['path'])[:8]}", split=split, source=r["repo"], lineage=f"code-{r['repo']}", license=f"{spdx} (repository licence per the code-corpus manifest; negatives only, text never redistributed)",
                                     path=r["rel"], sha256=H256(raw), bytes=len(raw), kind="neg", dialect="other", neg_kind=f"{grp}:{lang}", group=None, text=text))
    return docs

# ───────────────────────────── derived renderings for R5 (AUTHORED by script from natural documents, labelled so) ─────────────────────────────
def _copy_with_nsmap(el, nsmap_for):
    """rebuild the tree with a different namespace-prefix layout (lxml serialises it)."""
    q = etree.QName(el)
    new = etree.Element(el.tag, attrib=dict(el.attrib), nsmap=nsmap_for)
    new.text = el.text; new.tail = el.tail
    for ch in el:
        if isinstance(ch.tag, str): new.append(_copy_with_nsmap(ch, None))
        else: new.append(ch)
    return new

def bpmn_renderings(raw):
    """-> {name: text}. Four renderings that preserve the model exactly; each is re-read by gold_bpmn and kept only if its beings and relations
    equal the original's (semantic invariance verified by the gold side, not assumed)."""
    out = {}
    try:
        root = etree.fromstring(raw, etree.XMLParser(resolve_entities=False, remove_blank_text=True))
    except Exception:
        return out
    try: out["pretty"] = etree.tostring(root, pretty_print=True, xml_declaration=True, encoding="UTF-8").decode("utf-8")
    except Exception: pass
    try: out["c14n"] = etree.tostring(root, method="c14n").decode("utf-8")
    except Exception: pass
    try:
        nm = dict(root.nsmap)
        pref = [k for k, v in nm.items() if v == NS_MODEL]
        if pref and pref[0] is not None:
            nm2 = {k: v for k, v in nm.items() if v != NS_MODEL}
            nm2[None] = NS_MODEL
            if None not in nm or nm.get(None) == NS_MODEL:
                out["default_ns"] = etree.tostring(_copy_with_nsmap(root, nm2), xml_declaration=True, encoding="UTF-8").decode("utf-8")
        elif None in nm and nm[None] == NS_MODEL:
            nm2 = {k: v for k, v in nm.items() if v != NS_MODEL}
            nm2["semantic"] = NS_MODEL
            out["prefixed_ns"] = etree.tostring(_copy_with_nsmap(root, nm2), xml_declaration=True, encoding="UTF-8").decode("utf-8")
    except Exception: pass
    try:
        t = etree.tostring(root, encoding="us-ascii").decode("ascii")      # non-ASCII as numeric character references
        t = re.sub(r'(\s[\w:.-]+)="([^"\'<]*)"', lambda m: f"{m.group(1)}='{m.group(2)}'", t)   # single-quoted attribute values where no quote is inside
        out["ascii_single_quote"] = t
    except Exception: pass
    return out

def derive_reps(docs_by_split, stats):
    reps = {sp: [] for sp in docs_by_split}
    for sp, ds in docs_by_split.items():
        for d in ds:
            if d["dialect"] != "bpmn_xml" or d.get("_raw") is None: continue
            g0 = d["gold"]
            key0 = (sorted((b["id"], b["kind"]) for b in g0["beings"]), sorted((r["e1"], r["label"], r["e2"]) for r in g0["relations"]))
            for name, text in bpmn_renderings(d["_raw"]).items():
                r = gold_bpmn(text.encode("utf-8"))
                if not r["ok"]: stats[f"rep_dropped:{name}:{r['why']}"] += 1; continue
                g1 = r["gold"]
                key1 = (sorted((b["id"], b["kind"]) for b in g1["beings"]), sorted((r_["e1"], r_["label"], r_["e2"]) for r_ in g1["relations"]))
                if key1 != key0: stats[f"rep_dropped:{name}:invariance"] += 1; continue
                reps[sp].append(dict(id=d["id"], rep=name, text=text, n_chars=g1["n_chars"]))
                stats[f"rep_kept:{name}"] += 1
    return reps

def bpmn_to_dot(g):
    """AUTHORED cross-notation rendering: the flow structure of a BPMN document written as DOT (nodes = flow nodes, edges = sequence/message flows)."""
    q = lambda s: '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'
    lines = ["digraph process {"]
    nodes = [b for b in g["beings"] if b["cls"] == "flow_node"]
    ids = {b["id"] for b in nodes}
    for b in nodes:
        lines.append(f"  {q(b['id'])} [label={q(b['name'] or b['kind'])}];")
    for r in g["relations"]:
        if r["label"] in ("sequence_flow", "message_flow") and r["e1"] in ids and r["e2"] in ids:
            lines.append(f"  {q(r['e1'])} -> {q(r['e2'])};")
    lines.append("}")
    return "\n".join(lines) + "\n"

# ───────────────────────────────────────────── DOT (pydot gold) ─────────────────────────────────────────────
def build_dot(docs, stats):
    import importlib.util
    p = f"{BASE}/raw/dot-corpus.json"
    if not os.path.exists(p):
        stats["dot_corpus_absent"] += 1; return docs
    spec = json.load(open(p))
    for rec in spec["docs"]:
        raw = open(f"{RAW}/dot/{rec['file']}", "rb").read()
        if raw.startswith(b"\xef\xbb\xbf"): raw = raw[3:]     # a byte-order mark is not part of the notation (same normalisation as the BPMN documents)
        try: text = raw.decode("utf-8")
        except UnicodeDecodeError: stats["drop:dot:non_utf8"] += 1; continue
        g = gold_dot(text)
        if not g["ok"]: stats["drop:dot:" + g["why"]] += 1; continue
        docs.append(dict(id=rec["id"], split=rec["split"], source=rec["repo"], lineage=rec["repo"], license=rec["license"], path=rec["path"], sha256=H256(raw), bytes=len(raw),
                         kind="pos", dialect="dot", neg_kind=None, group=None, text=text, gold=g["gold"], fp=g["fp"]))
    return docs

def _unq(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"': return s[1:-1].replace('\\"', '"')
    return s

def gold_dot(text):
    """beings = nodes (explicit or implied by an edge) and subgraphs/clusters; relations = edges; strings = the identifier strings pydot sees, by role.
    Source of truth: pydot's parse. Items pydot represents ambiguously (subgraph or compound endpoints) are NOT guessed: they go to gold.gaps."""
    try:
        import pydot
        gs = pydot.graph_from_dot_data(text)
    except Exception:
        return dict(ok=False, why="pydot_parse_error")
    if not gs: return dict(ok=False, why="pydot_empty")
    g = gs[0]
    nodes = {}; edges = []; subs = []; gaps = collections.Counter()
    strings = collections.defaultdict(set)
    directed = g.get_type() == "digraph"
    def attrs_of(obj):
        try: return obj.get_attributes() or {}
        except Exception: return {}
    def add_attrs(obj):
        for k, v in attrs_of(obj).items():
            strings[_unq(str(k))].add("attr_name")
            if v is not None: strings[_unq(str(v))].add("attr_value")
    def endname(x):
        x = x.strip()
        if x.startswith('"'):
            # a quoted name, possibly followed by a port: the name ends at the closing quote (A1d: the first build kept `"a":p` whole)
            i = 1
            while i < len(x):
                if x[i] == "\\": i += 2; continue
                if x[i] == '"': break
                i += 1
            return _unq(x[:i + 1])
        return _unq(x.split(":")[0]) if ":" in x else x
    def walk(gr, depth):
        add_attrs(gr)
        for n in gr.get_nodes():
            raw = n.get_name()
            nm = _unq(raw)
            add_attrs(n)
            # `node [..]`, `edge [..]`, `graph [..]` are attribute statements (pydot lists them as pseudo-nodes); a QUOTED "node" is an ordinary ID (A1e)
            if raw in ("node", "edge", "graph", "") or nm == "": continue
            nodes.setdefault(nm, 0); strings[nm].add("node_id")
        for e in gr.get_edges():
            a, b = e.get_source(), e.get_destination()
            add_attrs(e)
            if not (isinstance(a, str) and isinstance(b, str)):
                # a subgraph used as an edge end: the edge itself is a typed gap (pydot does not expand it), but the nodes DECLARED inside that
                # subgraph are real beings and pydot keeps them in the endpoint's object dictionary (A1c: the first build did not walk it)
                gaps["compound_endpoint"] += 1
                for x in (a, b):
                    if isinstance(x, str):
                        nm = endname(x); nodes.setdefault(nm, 0); strings[nm].add("node_id")   # the plain end is still a node the statement names
                    elif x is not None:
                        try: walk(pydot.Subgraph(obj_dict=dict(x)), depth + 1)
                        except Exception: gaps["compound_endpoint_unwalked"] += 1
                continue
            a1, b1 = endname(a), endname(b)
            nodes.setdefault(a1, 0); nodes.setdefault(b1, 0)
            strings[a1].add("node_id"); strings[b1].add("node_id")
            edges.append((a1, "directed" if directed else "undirected", b1))
        for sg in gr.get_subgraphs():
            nm = _unq(sg.get_name() or "")
            if nm: subs.append(nm); strings[nm].add("graph_name")
            walk(sg, depth + 1)
    gname = _unq(g.get_name() or "")
    if gname: strings[gname].add("graph_name")
    walk(g, 0)
    if any('"' in n for n in nodes):
        return dict(ok=False, why="pydot_quoted_port_misparse")     # pydot folds `"a":"p"` into one name with stray quotes: the gold would be wrong, so the document is dropped (typed gap)
    fp = H("\n".join(sorted(f"{a}>{b}" for a, _, b in edges)) + "|" + "\n".join(sorted(nodes)))
    return dict(ok=True, fp=fp, gold=dict(directed=directed, strict=bool(g.get_strict()), beings=[dict(id=n, kind="node") for n in nodes], subgraphs=[s for s in subs if s],
                                          relations=[dict(e1=a, label=l, e2=b) for a, l, b in edges], gaps=dict(gaps), n_edges_raw=len(edges),
                                          strings={k: sorted(v) for k, v in strings.items() if k != ""}))

def dot_renderings(text):
    """pydot's own writer (an independent serialiser) and its one-line form; kept only when the gold side re-derives the same beings/relations."""
    out = {}
    try:
        import pydot
        g = pydot.graph_from_dot_data(text)[0]
        s = g.to_string()
        out["pydot_writer"] = s + "\n"
        out["one_line"] = re.sub(r"[\r\n\t]+", " ", s) + "\n"
    except Exception:
        pass
    return out

def xsd_tables():
    x = Xsd()
    el = {n: x.klass(n) for n in x.elem_type}
    el["definitions"] = "definitions"
    at = {}
    for n in x.elem_type:
        roles = {}
        for t in x.chain(x.elem_type[n]):
            for a, xt in x.attrs.get(t, {}).items():
                roles.setdefault(a, "decl" if xt == "ID" else ("ref" if xt in ("IDREF", "QName", "IDREFS") else ("label" if a == "name" else "other")))
        at[n] = roles
    return dict(source="OMG Semantic.xsd as redistributed in bpmn-io/bpmn-moddle resources/bpmn/xsd (MIT)", elements=el, attr_roles=at, ref_text_elements=sorted(x.ref_text))

# ───────────────────────────────────────────── main ─────────────────────────────────────────────
def main():
    only = None
    if "--only" in sys.argv: only = sys.argv[sys.argv.index("--only") + 1]
    stats = collections.Counter()
    docs = []
    if only in (None, "bpmn"): build_bpmn(docs, stats)
    if only in (None, "dot"): build_dot(docs, stats)
    if only in (None, "neg"):
        build_neg_other(docs, stats); build_prose(docs, stats); build_code(docs, stats)
    # DOT near-duplicates across splits (priority train > dev > test) and exact text duplicates
    seen = {}
    out = []
    order = {"train": 0, "dev": 1, "test": 2}
    docs.sort(key=lambda d: (order[d["split"]], d["id"]))
    for d in docs:
        if d["dialect"] == "dot":
            k = ("dot", d.get("fp"))
            if k in seen: stats[f"dedup_dot_{'same' if seen[k]==d['split'] else 'cross'}_split"] += 1; continue
            seen[k] = d["split"]
        k2 = ("sha", d["sha256"])
        if k2 in seen and d["dialect"] != "bpmn_xml": stats["dedup_exact_text"] += 1; continue
        seen[k2] = d["split"]
        out.append(d)
    docs = out
    for sp in ("train", "dev", "test"):
        os.makedirs(f"{CORPUS}/{sp}", exist_ok=True); os.makedirs(f"{GOLD}/{sp}", exist_ok=True)
    stats2 = collections.Counter()
    reps = derive_reps({sp: [d for d in docs if d["split"] == sp] for sp in ("dev", "test")}, stats2)
    dotx = {sp: [] for sp in ("dev", "test")}
    for sp in ("dev", "test"):
        for d in docs:
            if d["split"] == sp and d["dialect"] == "bpmn_xml" and d.get("gold"):
                g = d["gold"]
                if sum(1 for r in g["relations"] if r["label"] == "sequence_flow") >= 2:
                    dotx[sp].append(dict(id=d["id"], text=bpmn_to_dot(g)))
    dotreps = {sp: [] for sp in ("dev", "test")}
    for sp in ("dev", "test"):
        for d in docs:
            if d["split"] == sp and d["dialect"] == "dot" and d.get("gold"):
                g0 = d["gold"]
                key0 = (sorted(b["id"] for b in g0["beings"]), sorted((r["e1"], r["label"], r["e2"]) for r in g0["relations"]))
                for name, t in dot_renderings(d["text"]).items():
                    r = gold_dot(t)
                    if not r["ok"]: stats[f"dotrep_dropped:{name}:{r['why']}"] += 1; continue
                    g1 = r["gold"]
                    key1 = (sorted(b["id"] for b in g1["beings"]), sorted((r_["e1"], r_["label"], r_["e2"]) for r_ in g1["relations"]))
                    if key1 != key0 or g1["gaps"] != g0["gaps"]: stats[f"dotrep_dropped:{name}:invariance"] += 1; continue
                    dotreps[sp].append(dict(id=d["id"], rep=name, text=t)); stats[f"dotrep_kept:{name}"] += 1
    json.dump(xsd_tables(), open(f"{GOLD}/xsd-classes.json", "w"))
    for sp in ("dev", "test"):
        with gzip.open(f"{GOLD}/{sp}/dotreps.jsonl.gz", "wt", encoding="utf-8") as fh:
            for r in dotreps[sp]: fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        with gzip.open(f"{GOLD}/{sp}/reps.jsonl.gz", "wt", encoding="utf-8") as fh:
            for r in reps[sp]: fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        with gzip.open(f"{GOLD}/{sp}/dotx.jsonl.gz", "wt", encoding="utf-8") as fh:
            for r in dotx[sp]: fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    for d in docs: d.pop("_raw", None)
    stats.update(stats2)
    manifest_docs = []
    gold_by_split = {sp: [] for sp in order}
    for d in docs:
        text = d.pop("text")
        with open(f"{CORPUS}/{d['split']}/{d['id']}.txt", "w", encoding="utf-8", newline="") as fh: fh.write(text)
        d["n_chars"] = len(text.encode("utf-16-le")) // 2
        g = d.pop("gold", None); d.pop("fp", None)
        if g is not None:
            g["id"] = d["id"]; g["dialect"] = d["dialect"]; gold_by_split[d["split"]].append(g)
        manifest_docs.append(d)
    for sp, gl in gold_by_split.items():
        with gzip.open(f"{GOLD}/{sp}/gold.jsonl.gz", "wt", encoding="utf-8") as fh:
            for g in gl: fh.write(json.dumps(g, ensure_ascii=False) + "\n")
    cnt = collections.Counter((d["split"], d["dialect"], (d["neg_kind"] or "").split(":")[0]) for d in manifest_docs)
    src_split = collections.defaultdict(set)
    for d in manifest_docs: src_split[d["source"]].add(d["split"])
    # the rule is BY SOURCE. Reported separately: (a) a source with a TRAIN document and a held-out document = a leak (UD treebanks excepted: their train/dev/test is the
    # treebank's own partition of one corpus, used only for prose strangers); (b) sources that sit in both dev and test but never in train: strangers (mermaid by diagram
    # directory, libsbgn by directory, a code repository the sibling corpus assigned to different splits per language), never part of any prior
    sha_split = collections.defaultdict(set)
    for d in manifest_docs: sha_split[d["sha256"]].add(d["split"])
    leaks = {s: sorted(v) for s, v in src_split.items() if "train" in v and len(v) > 1 and not s.startswith("ud-")}
    heldout_shared = {s: sorted(v) for s, v in src_split.items() if "train" not in v and len(v) > 1 and s != "bpmn-miwg-test-suite"}
    miwg_tools = collections.defaultdict(set)
    for d in manifest_docs:
        if d["source"] == "bpmn-miwg-test-suite": miwg_tools[d["group"]].add(d["split"])
    # RULE 11 made mechanical: the exact SPDX of every document (the text before the first " (" of its licence record) must be in ALLOWED_SPDX or the build stops
    lic_counts = collections.Counter(d["license"].split(" (")[0].strip() for d in manifest_docs)
    lic_by_source = collections.defaultdict(set)
    for d in manifest_docs: lic_by_source[d["source"]].add(d["license"].split(" (")[0].strip())
    not_allowed = {k: v for k, v in lic_counts.items() if k not in ALLOWED_SPDX}
    licence_audit = dict(rule="only MIT, BSD, Apache-2.0, ISC, CC0, CC-BY, CC-BY-SA, public domain (Unlicense)", allowed_spdx=sorted(ALLOWED_SPDX), spdx_counts=dict(sorted(lic_counts.items())),
                         documents_with_spdx_not_allowed=not_allowed, prose_treebanks={k: dict(treebank=v[0], spdx=v[1]) for k, v in PROSE_TREEBANKS.items()},
                         prose_excluded={k: dict(treebank=v[0], why=v[1]) for k, v in PROSE_EXCLUDED.items()}, sources_with_more_than_one_spdx={k: sorted(v) for k, v in lic_by_source.items() if len(v) > 1})
    if not_allowed: raise SystemExit(f"licence audit FAILED (rule 11): {not_allowed}")
    manifest = dict(generated="2026-10-06", splits=["train", "dev", "test"], licence_audit=licence_audit, counts={f"{a}|{b}|{c}": n for (a, b, c), n in sorted(cnt.items())}, stats=dict(stats),
                    disjointness_check=dict(train_sources_also_in_dev_or_test=leaks, treebank_partitions_of_one_corpus=sorted(s for s in src_split if s.startswith("ud-")), strangers_in_both_dev_and_test_never_in_train=heldout_shared,
                                        miwg_process_groups_in_more_than_one_split={k: sorted(v) for k, v in miwg_tools.items() if len(v) > 1}, exact_text_duplicates_across_splits=sum(1 for v in sha_split.values() if len(v) > 1)),
                    docs=manifest_docs)
    json.dump(manifest, open(f"{CORPUS}/manifest{'' if only is None else '-' + only}.json", "w"), indent=0)
    print(json.dumps(dict(counts=manifest["counts"], stats=manifest["stats"], disjoint=manifest["disjointness_check"]), indent=1))

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "build": main()
    else: print(__doc__)
