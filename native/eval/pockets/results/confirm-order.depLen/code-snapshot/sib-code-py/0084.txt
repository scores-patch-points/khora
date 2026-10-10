#!/usr/bin/env python3
"""R0 NEGATIVES, enlarged (review finding: the `other` class was 33 files on DEV and the ABC identifier fired on ordinary code).

NATURAL negatives are files of installed software on this machine, READ IN PLACE (not copied, not redistributed): Python packages in the
venv, Homebrew formulae, npm packages, the Python standard library, the macOS /usr/share (vim, zsh, ...). The unit of the split is the
PACKAGE / FORMULA (the repository analogue): split = ('train','dev','test')[int(sha256('repo:'+source)[:8],16) % 3] (the same rule as the
ethos negatives). A package never appears in two splits, so near-duplicate files cannot leak.

Types (kind): py, c, h, js, js_min (minified or very long lines), md, rst, txt, html, xml (other XML dialects), svg, plist, json, yaml,
ini (ini / cfg / toml / conf), table (csv / tsv / dat with mostly numeric content), css, sh, tex. Per (split, kind) quota Q and at most CAP
files per package per kind, taken in sha256(path) order: a deterministic sample, never hand-picked, never chosen by what the identifier says.
Excluded BY PROVENANCE (never by a verdict): any package that is a music library (music21, ly, mido, abcjs) and files with a music extension.

Each entry records the sha256 of the first 4096 bytes and the size: a drifted file is detected by the card and dropped as a typed gap.
Output: manifest.negatives.json (merged into manifest.json by merge_manifest.py) and negatives_summary.json."""
import os, sys, json, hashlib, collections, glob, re

ROOT = "/private/tmp/claude-501/notation/music_abc"
Q = 60          # per (split, kind)
CAP = 6         # per (package, kind)
CAP_RARE = {"js_min": 25, "table": 25, "yaml": 25, "tex": 25, "svg": 25, "plist": 25, "css": 25, "ini": 25, "sh": 25, "xml": 25, "rst": 25, "js": 25}   # kinds with few packages: more files per package so the quota can fill
MIN_BYTES, MAX_BYTES = 120, 400_000
split_of = lambda k: ("train", "dev", "test")[int(hashlib.sha256(k.encode()).hexdigest()[:8], 16) % 3]
MUSIC_PKG = {"music21", "ly", "mido", "abcjs", "frescobaldi_app", "python_ly", "partitura", "pretty_midi", "pychord"}
MUSIC_EXT = {".abc", ".ly", ".ily", ".mxl", ".musicxml", ".mid", ".midi", ".mscx", ".mscz", ".krn", ".mei", ".mxml"}
EXT_KIND = {".py": "py", ".c": "c", ".cc": "c", ".cpp": "c", ".h": "h", ".hpp": "h", ".js": "js", ".mjs": "js", ".md": "md", ".rst": "rst", ".txt": "txt",
            ".html": "html", ".htm": "html", ".xml": "xml", ".xsd": "xml", ".xsl": "xml", ".svg": "svg", ".plist": "plist", ".json": "json",
            ".yaml": "yaml", ".yml": "yaml", ".ini": "ini", ".cfg": "ini", ".toml": "ini", ".conf": "ini", ".csv": "table", ".tsv": "table", ".dat": "table",
            ".css": "css", ".sh": "sh", ".zsh": "sh", ".tex": "tex", ".sty": "tex", ".bib": "tex"}

def roots():
    out = []   # (dir, group_fn)
    for sp in glob.glob("/private/tmp/claude-501/venv/lib/python3*/site-packages"):
        out.append((sp, lambda rel: "pypi:" + re.sub(r"\.py$", "", rel.split(os.sep)[0]).lower().replace("-", "_")))
    for cel in sorted(glob.glob("/opt/homebrew/Cellar/*")):
        name = os.path.basename(cel)
        if name.startswith("python@"):
            for lib in glob.glob(cel + "/*/Frameworks/Python.framework/Versions/*/lib/python3*"):
                out.append((lib, lambda rel, n=name: "pystd:" + rel.split(os.sep)[0].replace(".py", "")))
            continue
        for ver in glob.glob(cel + "/*"):
            out.append((ver, lambda rel, n=name: "brew:" + n))
    def npm_group(rel, b):
        # nested packages: the innermost node_modules/<pkg> or node_modules/@scope/<pkg> names the package (the repository analogue)
        parts = rel.split(os.sep)
        for i in range(len(parts) - 2, -1, -1):
            if parts[i] == "node_modules":
                nm = parts[i + 1]
                if nm.startswith("@") and i + 2 < len(parts) - 1: nm = nm + "/" + parts[i + 2]
                return "npm:" + nm
        return "npm:" + b
    for nm in glob.glob("/opt/homebrew/lib/node_modules/*"):
        base = os.path.basename(nm)
        out.append((nm, lambda rel, b=base: npm_group(rel, b)))
    for d in ("vim", "zsh", "doc", "examples", "misc", "skel", "man"):
        p = "/usr/share/" + d
        if os.path.isdir(p): out.append((p, lambda rel, d=d: "usr_share:" + d))
    return out

def walk(top, depth=10):
    stack = [(top, 0)]
    while stack:
        d, k = stack.pop()
        try: es = sorted(os.scandir(d), key=lambda e: e.name)
        except OSError: continue
        for e in es:
            if e.is_symlink(): continue
            if e.is_dir(follow_symlinks=False):
                if k < depth and e.name not in ("__pycache__", ".git"): stack.append((e.path, k + 1))
            elif e.is_file(follow_symlinks=False):
                yield e.path

def classify(path, head, size):
    ext = os.path.splitext(path)[1].lower()
    if ext in MUSIC_EXT: return None
    kind = EXT_KIND.get(ext)
    if kind is None: return None
    if b"\0" in head: return None
    txt = head.decode("utf-8", "replace")
    if txt.count("�") > 8: return None
    if kind == "js":
        lines = txt.split("\n")
        if ".min." in os.path.basename(path) or (len(lines) < 12 and len(txt) >= 2000) or (sum(len(l) for l in lines) / max(1, len(lines)) > 300): kind = "js_min"
    if kind == "table":
        nonspace = [c for c in txt if not c.isspace()]
        if not nonspace: return None
        share = sum(1 for c in nonspace if c.isdigit() or c in ",.;-+eE|") / len(nonspace)
        if share < 0.6: return None
    if kind == "txt":
        # a .txt that is a table of numbers is a table, not prose
        nonspace = [c for c in txt if not c.isspace()]
        if nonspace and sum(1 for c in nonspace if c.isdigit() or c in ",.;-+eE|") / len(nonspace) > 0.6: kind = "table"
    return kind

def main():
    cands = collections.defaultdict(list)    # (split, kind) -> [(sha, group, path, size, head_sha)]
    seen_groups = collections.Counter()
    n_scanned = 0
    for top, gfn in roots():
        for p in walk(top):
            rel = os.path.relpath(p, top)
            grp = gfn(rel)
            gbase = grp.split(":", 1)[1]
            if gbase.split(".")[0].lower() in MUSIC_PKG or "music21" in p or "/ly/" in p: continue
            try: size = os.path.getsize(p)
            except OSError: continue
            if size < MIN_BYTES or size > MAX_BYTES: continue
            ext = os.path.splitext(p)[1].lower()
            if ext not in EXT_KIND: continue
            n_scanned += 1
            try:
                with open(p, "rb") as f: head = f.read(4096)
            except OSError: continue
            kind = classify(p, head, size)
            if not kind: continue
            sp = split_of("repo:" + grp)
            cands[(sp, kind)].append((hashlib.sha256(p.encode()).hexdigest(), grp, p, size, hashlib.sha256(head).hexdigest()))
            seen_groups[grp] += 1
    entries = []; summary = collections.defaultdict(lambda: collections.Counter())
    for (sp, kind), lst in sorted(cands.items()):
        lst.sort()
        per = collections.Counter(); n = 0
        for sha, grp, p, size, hsha in lst:
            if per[grp] >= CAP_RARE.get(kind, CAP): continue
            per[grp] += 1; n += 1
            entries.append(dict(id=f"neg:{grp}:{sha[:12]}", source=grp, split=sp, file=p, absolute=True, origin=p, bytes=size, format=f"other-{kind}", role="negative",
                                system=None, channel="text", provenance="natural (installed software file on this machine, read in place; not copied or redistributed)",
                                kind=kind, head_sha256=hsha))
            if n >= Q: break
        summary[sp][kind] = n
    json.dump(entries, open(f"{ROOT}/manifest.negatives.json", "w"), indent=1)
    out = dict(scanned=n_scanned, entries=len(entries), by_split_kind={s: dict(v) for s, v in summary.items()},
               groups_per_split={s: len({e["source"] for e in entries if e["split"] == s}) for s in ("train", "dev", "test")},
               candidates={f"{s}/{k}": len(v) for (s, k), v in sorted(cands.items())})
    json.dump(out, open(f"{ROOT}/negatives_summary.json", "w"), indent=1)
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()
