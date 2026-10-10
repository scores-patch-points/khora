#!/usr/bin/env python3
"""lex_py.py -- ant-code: Python source -> units of lexical tokens with PARSER GOLD (ast + tokenize, stdlib only).
usage: python3 lex_py.py FILE > file.json      (one JSON object: {file, lang, units:[[form..]], cls:[[c..]], decl:[[0/1..]], raw:[[text..]]})
Gold classes (per token): U user identifier (name bound in this file by def/class/param/assign-target/for/with/except/comprehension/walrus/self.x=...),
 E external (imported, builtin, attribute/free name not bound here), K keyword, L literal (number/string; strings become 's'+hash), P operator/punct,
 A ambiguous (bound here AND imported/builtin, dunder, or one lowercase form in two classes): excluded from every class by the reader harness.
decl=1 marks the BINDING occurrence of a user identifier. Reader form: lowercase, every char outside [a-z0-9] -> 'z'; numbers 'n'+alnum; strings 's'+7 hex.
Units: tokenize logical lines (NEWLINE-terminated). Comments, INDENT/DEDENT dropped. No gold is ever given to a reader (see collect.mjs)."""
import ast, builtins, io, json, keyword, sys, tokenize, re

def fnv(s):
    h = 2166136261
    for ch in s.encode("utf8", "replace"):
        h = ((h ^ ch) * 16777619) & 0xFFFFFFFF
    return "%07x" % (h & 0xFFFFFFF)

def enc_name(t):
    return re.sub(r"[^a-z0-9]", "z", t.lower()) if t.isascii() else t.lower()

def main(path):
    src = open(path, encoding="utf8", errors="replace").read()
    tree = ast.parse(src)
    bound, imported, decl_sites = set(), set(), set()
    lines = src.split("\n")
    def site(l, c): decl_sites.add((l, c))
    for n in ast.walk(tree):
        if isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)): bound.add(n.id); site(n.lineno, n.col_offset) if isinstance(n.ctx, ast.Store) else None
        elif isinstance(n, ast.arg): bound.add(n.arg); site(n.lineno, n.col_offset)
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)): bound.add(n.name); decl_sites.add(("def", n.name, n.lineno))
        elif isinstance(n, ast.ExceptHandler) and n.name: bound.add(n.name)
        elif isinstance(n, ast.Attribute) and isinstance(n.ctx, ast.Store): bound.add(n.attr); site(n.end_lineno, n.end_col_offset - len(n.attr))
        elif isinstance(n, (ast.Import, ast.ImportFrom)):
            for a in n.names:
                imported.add((a.asname or a.name.split(".")[0]).lower() if a.name != "*" else "*")
        elif n.__class__.__name__ in ("MatchAs", "MatchStar") and getattr(n, "name", None): bound.add(n.name)
        elif n.__class__.__name__ == "MatchMapping" and getattr(n, "rest", None): bound.add(n.rest)
    bnames = {b.lower() for b in bound}
    ext_names = {x.lower() for x in dir(builtins)} | imported
    kws = set(keyword.kwlist)
    units, cur_f, cur_c, cur_d, cur_r = [], [], [], [], []
    def flush():
        nonlocal cur_f, cur_c, cur_d, cur_r
        if cur_f: units.append((cur_f, cur_c, cur_d, cur_r))
        cur_f, cur_c, cur_d, cur_r = [], [], [], []
    def add(f, c, d, r): cur_f.append(f); cur_c.append(c); cur_d.append(d); cur_r.append(r)
    toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    seen_def_name = set()
    prev_kw = None
    for tk in toks:
        tt, ts, (l, c) = tk.type, tk.string, tk.start
        name = tokenize.tok_name[tt]
        if name == "NEWLINE" or name == "ENDMARKER": flush(); prev_kw = None; continue
        if name in ("COMMENT", "NL", "INDENT", "DEDENT", "FSTRING_START", "FSTRING_END", "ENCODING"): continue
        if name == "NAME":
            if ts in kws or ts in ("True", "False", "None"): add(ts.lower(), "K", 0, ts); prev_kw = ts; continue
            low = ts.lower(); f = enc_name(ts)
            if ts.startswith("__") and ts.endswith("__") and len(ts) > 4: cls = "A"
            elif low in bnames and low in ext_names: cls = "A"
            elif low in bnames: cls = "U"
            else: cls = "E"
            d = 0
            if cls == "U":
                if (l, c) in decl_sites: d = 1
                elif prev_kw in ("def", "class") and ("def", ts, l) in decl_sites: d = 1
            add(f, cls, d, ts); prev_kw = None
        elif name == "NUMBER": add("n" + re.sub(r"[^a-z0-9]", "", ts.lower()), "L", 0, ts); prev_kw = None
        elif name in ("STRING", "FSTRING_MIDDLE"): add("s" + fnv(ts), "L", 0, ts[:20]); prev_kw = None
        else: add(ts, "P", 0, ts); prev_kw = None
    flush()
    # form-level ambiguity: one lowercase form seen in two different classes -> A everywhere
    byform = {}
    for f, c, d, r in units:
        for a, b in zip(f, c):
            if b != "P": byform.setdefault(a, set()).add(b)
    bad = {a for a, s in byform.items() if len(s - {"A"}) > 1}
    out = {"file": path, "lang": "py", "units": [u[0] for u in units], "cls": [["A" if (a in bad and b != "P") else b for a, b in zip(u[0], u[1])] for u in units],
           "decl": [u[2] for u in units], "raw": [u[3] for u in units], "nBound": len(bound), "nImported": len(imported)}
    json.dump(out, sys.stdout)

if __name__ == "__main__": main(sys.argv[1])
