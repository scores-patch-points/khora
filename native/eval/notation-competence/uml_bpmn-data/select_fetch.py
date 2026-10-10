#!/usr/bin/env python3
"""Select diagram-text (and stranger) files per repo from the git TREE metadata, then have git fetch exactly those blobs
(sparse checkout of a blob:none partial clone: one batched request per repo, not one per file).
Selection is deterministic: sorted by sha1(path), capped per class; sizes from the tree API (no blob read needed)."""
import json, hashlib, re, subprocess, sys, os
ROOT = "/private/tmp/claude-501/notation/uml_bpmn/raw"
H = lambda s: hashlib.sha1(s.encode()).hexdigest()
BPMN_EXT = (".bpmn", ".bpmn20.xml", ".bpmn2", ".bpmn.xml")
SKIP_DIR = re.compile(r"(^|/)(node_modules|target|build|dist|\.git)(/|$)")
def blobs(repo):
    d = json.load(open(f"{ROOT}/trees/{repo}.json"))
    return [(e["path"], e.get("size", 0)) for e in d["tree"] if e["type"] == "blob"]
def pick(rows, pred, cap, lo=200, hi=300_000):
    c = [(p, s) for p, s in rows if pred(p) and lo <= s <= hi and not SKIP_DIR.search(p)]
    c.sort(key=lambda t: H(t[0]))
    return c[:cap]
# class caps per repo: bpmn (positives), dmn/cmmn (sibling OMG XML strangers), xml (other XML strangers), xsd, plus single-class repos
PLAN = {
    "flowable-engine":      dict(bpmn=1200, dmn=120, cmmn=120, xml=150, xsd=20),
    "Activiti":             dict(bpmn=800, xml=150, xsd=16),
    "camunda-bpm-platform": dict(bpmn=1000, dmn=100, cmmn=100, xml=150, xsd=20),
    "camunda-modeler":      dict(bpmn=100, dmn=40, xml=24),
    "bpmn-moddle":          dict(bpmn=100, xsd=8),
    "kogito-runtimes":      dict(bpmn=700, dmn=60, xml=150, xsd=1),
    "kogito-examples":      dict(bpmn=120, dmn=40, xml=100),
}
def select(repo):
    rows = blobs(repo); plan = PLAN[repo]; out = {}
    low = lambda p: p.lower()
    is_bpmn = lambda p: low(p).endswith(BPMN_EXT)
    out["bpmn"] = pick(rows, is_bpmn, plan.get("bpmn", 0))
    if "dmn" in plan:  out["dmn"] = pick(rows, lambda p: low(p).endswith(".dmn"), plan["dmn"])
    if "cmmn" in plan: out["cmmn"] = pick(rows, lambda p: low(p).endswith(".cmmn"), plan["cmmn"])
    if "xml" in plan:  out["xml"] = pick(rows, lambda p: low(p).endswith(".xml") and not is_bpmn(p) and not low(p).endswith((".dmn.xml", ".cmmn.xml")), plan["xml"], lo=300, hi=150_000)
    if "xsd" in plan:  out["xsd"] = pick(rows, lambda p: low(p).endswith(".xsd"), plan["xsd"], lo=300, hi=300_000)
    return out
def miwg():
    rows = blobs("bpmn-miwg-test-suite")
    keep = [(p, s) for p, s in rows if p.lower().endswith(".bpmn") and 200 <= s <= 250_000 and not p.endswith("-roundtrip.bpmn")]
    keep.sort(key=lambda t: t[0])
    return {"bpmn": keep}
def other(repo, exts, cap=100000):
    rows = blobs(repo)
    return {"x": [(p, s) for p, s in rows if p.lower().endswith(exts) and "validation/" not in p][:cap]}
esc = lambda p: "/" + re.sub(r"([\\*?\[\]])", r"\\\1", p)
def checkout(repo, paths):
    d = f"{ROOT}/git/{repo}"
    subprocess.run(["git", "-C", d, "sparse-checkout", "init", "--no-cone"], check=True)
    pat = "\n".join(esc(p) for p in paths) + "\n"
    r = subprocess.run(["git", "-C", d, "sparse-checkout", "set", "--no-cone", "--stdin"], input=pat, text=True, capture_output=True)
    if r.returncode: print("sparse-set err", repo, r.stderr[:300])
    r = subprocess.run(["git", "-C", d, "checkout"], capture_output=True, text=True)
    print(repo, "checkout rc", r.returncode, r.stderr[-200:].strip(), flush=True)
sel = {}
for repo in PLAN:
    s = select(repo); sel[repo] = {k: [p for p, _ in v] for k, v in s.items()}
    print(repo, {k: len(v) for k, v in s.items()}, flush=True)
sel["bpmn-miwg-test-suite"] = {"bpmn": [p for p, _ in miwg()["bpmn"]]}
sel["mermaid"] = {"mmd": [p for p, _ in other("mermaid", (".mmd",))["x"]]}
sel["pydot"] = {"dot": [p for p, _ in other("pydot", (".dot",))["x"]]}
sel["libsbgn"] = {"sbgn": [p for p, _ in other("libsbgn", (".sbgn",))["x"]]}
json.dump(sel, open(f"{ROOT}/selection.json", "w"), indent=1)
only = sys.argv[1:] or list(sel)
for repo in only:
    allp = [p for v in sel[repo].values() for p in v]
    checkout(repo, allp)
