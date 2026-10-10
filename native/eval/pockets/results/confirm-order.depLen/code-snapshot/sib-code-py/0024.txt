#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ast_extract.py -- OPTIONAL adjunct of eval/barker/profiles.mjs (BARKER.md section 8, appendix B1). Venv only:
    /private/tmp/claude-501/venv/bin/python eval/barker/ast_extract.py inventory <language>
    /private/tmp/claude-501/venv/bin/python eval/barker/ast_extract.py files <language> < paths.json

WHAT IT IS. A zero-model measuring tool. It parses source files with the language's own tree-sitter grammar
(tree-sitter 0.26 + tree-sitter-language-pack 1.21; the pack's parsers are read from the cache gold.py already
filled, nothing is downloaded, no network) and prints, as JSON lines, SUFFICIENT STATISTICS per file that the JS
profile module aggregates. It never writes files, never imports a khora module, never calls a model, and never
reads a file it was not handed (the caller passes TRAIN paths only; the TEST split is never opened here either).

inventory <language>  -> one JSON object: the grammar's own symbol table counts (visible named kinds, anonymous
    keyword-like symbols, anonymous symbolic tokens, field names, declared brace pair / end keyword / indent symbol).
files <language>      -> stdin is a JSON list of {path}; stdout one JSON object per file:
    {path, ok, bytes, nchars, leaves, errLeaves, tree:{nodes, leaf, kidsSum, nonleaf, heightMax, depthSum, dh[6],
    surv[15], ord[8]}, kinds:{kind:count}, sym:{brace, endkw, paren leaf counts}, cls:"<one char per leaf>", starts:[code point offsets], ids:[identifier text]}

DEFINITIONS (identical to the header of eval/barker/profiles.mjs; restated for the reader).
  named tree: nodes = named tree-sitter nodes except comments and ERROR nodes; parent = nearest included ancestor.
  leaf token = a tree-sitter node with no children and non-zero width; its class (one character):
    k keyword  (anonymous, spelled like an identifier)      o symbolic (anonymous, contains one of + - * / % = < > ! & | ^ ~ ? @ # $ \\)
    d delimiter (any other anonymous token)                 c comment (named, kind contains "comment")
    l literal  (named, kind contains string char number integer float decimal hex octal binary boolean true false
                null nil none regex literal escape)
    i identifier (named, kind contains identifier name symbol variable constant atom, or equals word)
    x other named leaf
  A leaf under an ERROR node counts in errLeaves.
Typed rules here are PROVISIONAL (BARKER 3.8): the kind-name substrings above are a heuristic reading of each grammar's
own naming and are the weakest part of group I; they are reported, not tuned.
"""
import sys, os, re, json, bisect, signal

os.environ.setdefault("TREE_SITTER_LANGUAGE_PACK_CACHE_DIR", "/private/tmp/claude-501/coding-competence/ts-cache")

OPCH = set("+-*/%=<>!&|^~?@#$\\")
KW_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
END_KW = {"end", "endif", "endfor", "endwhile", "endfunction", "end_if", "endmodule", "fi", "done", "esac", "endcase", "endclass", "endtry"}
LIT_SUB = ("string", "char", "number", "integer", "float", "decimal", "hex", "octal", "binary", "boolean", "true", "false", "null", "nil", "none", "regex", "literal", "escape")
ID_SUB = ("identifier", "name", "symbol", "variable", "constant", "atom")


def load(lang):
    if lang == "groovy":
        import importlib
        from tree_sitter import Language, Parser
        mod = importlib.import_module("tree_sitter_groovy")
        l = Language(mod.language())
        return Parser(l), l
    import tree_sitter_language_pack as p
    l = p.get_language(lang)
    return p.get_parser(lang), l


def classify(node, text):
    if not node.is_named:
        if KW_RE.match(text):
            return "k"
        return "o" if any(ch in OPCH for ch in text) else "d"
    t = node.type
    if "comment" in t:
        return "c"
    if any(s in t for s in LIT_SUB):
        return "l"
    if t == "word" or any(s in t for s in ID_SUB):
        return "i"
    return "x"


def inventory(lang):
    parser, l = load(lang)
    kw = 0
    sym = 0
    named = 0
    anon = 0
    braces = set()
    declares_end = False
    declares_indent = False
    kw_letters = 0
    kw_latin = 0
    for i in range(l.node_kind_count):
        name = l.node_kind_for_id(i)
        if name is None:
            continue
        vis = l.node_kind_is_visible(i)
        isn = l.node_kind_is_named(i)
        low = name.lower()
        if "indent" in low or "dedent" in low:
            declares_indent = True
        if not vis:
            continue
        if isn:
            named += 1
        else:
            anon += 1
            if KW_RE.match(name):
                kw += 1
                if low in ("end", "endif", "endfor", "endwhile", "endfunction", "end_if", "endmodule", "fi", "done", "esac"):
                    declares_end = True
                for ch in name:
                    if ch.isalpha():
                        kw_letters += 1
                        if ch.isascii():
                            kw_latin += 1
            elif name and all(ch in OPCH for ch in name):
                sym += 1  # h03: made ONLY of operator characters (the header's definition); the leaf class "o" below is the looser "contains one of"
            if name in ("{", "}"):
                braces.add(name)
    return {
        "language": lang, "nodeKindCount": l.node_kind_count, "h01": kw, "h03": sym, "h04": named, "anonymousVisible": anon,
        "h08": l.field_count, "h06b": 1 if braces == {"{", "}"} else 0, "h06e": 1 if declares_end else 0, "h06i": 1 if declares_indent else 0,
        "h07": (kw_latin / kw_letters) if kw_letters else None,
        "pack": "tree-sitter-language-pack 1.21.0" if lang != "groovy" else "tree-sitter-groovy 0.1.2",
    }


class Boom(Exception):
    pass


def _alarm(signum, frame):
    raise Boom("parse budget exceeded")


def extract(parser, path):
    with open(path, "rb") as f:
        data = f.read()
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return {"path": path, "ok": False, "reason": "not_utf8"}
    # byte offset -> code point offset
    if len(text) == len(data):
        b2c = None
    else:
        pos = [0]
        acc = 0
        for ch in text:
            acc += len(ch.encode("utf-8"))
            pos.append(acc)
        # pos[i] = byte offset at the START of char i (pos has len(text)+1 entries)
        def b2c(b, _pos=pos):
            return bisect.bisect_left(_pos, b)
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(20)
    try:
        tree = parser.parse(data)
    finally:
        signal.alarm(0)
    cls = []
    starts = []
    ids = []
    kinds = {}
    dh = [0] * 6
    surv = [0] * 15
    ordc = [0] * 8
    st = {"nodes": 0, "leaf": 0, "kidsSum": 0, "nonleaf": 0, "heightMax": 0, "depthSum": 0}
    leaves = 0
    err_leaves = 0
    err_depth = 0
    cnt_sym = {"brace": 0, "endkw": 0, "paren": 0}
    stack = []  # frames [depth, size, kids, maxord, cnt]
    included_flags = []  # parallel stack: was the node at this cursor depth an included named node, is error

    cur = tree.walk()

    def enter(n):
        nonlocal leaves, err_leaves, err_depth
        t = n.type
        is_err = t == "ERROR"
        inc = n.is_named and not is_err and "comment" not in t
        if is_err:
            err_depth += 1
        if inc:
            stack.append([len(stack) + 1, 1, 0, 0, 0])
            kinds[t] = kinds.get(t, 0) + 1
        if n.child_count == 0 and n.end_byte > n.start_byte and not n.is_missing:
            tx = data[n.start_byte:n.end_byte].decode("utf-8", errors="replace")
            c = classify(n, tx)
            cls.append(c)
            starts.append(n.start_byte if b2c is None else b2c(n.start_byte))
            leaves += 1
            if err_depth > 0:
                err_leaves += 1
            if c == "i" and len(ids) < 50000:
                ids.append(tx)
            if c == "d" and tx in ("{", "}"):
                cnt_sym["brace"] += 1
            elif c == "d" and tx in ("(", ")"):
                cnt_sym["paren"] += 1
            elif c == "k" and tx.lower() in END_KW:
                cnt_sym["endkw"] += 1
        included_flags.append((inc, is_err))

    def leave(n):
        nonlocal err_depth
        inc, is_err = included_flags.pop()
        if is_err:
            err_depth -= 1
        if not inc:
            return
        d, size, kids, maxord, cnt = stack.pop()
        if kids == 0:
            order = 1
            st["leaf"] += 1
        else:
            order = maxord + 1 if cnt >= 2 else maxord
            st["nonleaf"] += 1
            st["kidsSum"] += kids
        st["nodes"] += 1
        st["depthSum"] += d
        st["heightMax"] = max(st["heightMax"], d)
        dh[min(d, 6) - 1] += 1
        for s in range(2, 17):
            if size >= s:
                surv[s - 2] += 1
        ordc[min(order, 8) - 1] += 1
        if stack:
            p = stack[-1]
            p[1] += size
            p[2] += 1
            if order > p[3]:
                p[3] = order
                p[4] = 1
            elif order == p[3]:
                p[4] += 1

    done = False
    while not done:
        enter(cur.node)
        if cur.goto_first_child():
            continue
        leave(cur.node)
        if cur.goto_next_sibling():
            continue
        while True:
            if not cur.goto_parent():
                done = True
                break
            leave(cur.node)
            if cur.goto_next_sibling():
                break
    return {"path": path, "ok": True, "bytes": len(data), "nchars": len(text), "leaves": leaves, "errLeaves": err_leaves,
            "tree": {**st, "dh": dh, "surv": surv, "ord": ordc}, "kinds": kinds, "sym": cnt_sym, "cls": "".join(cls), "starts": starts, "ids": ids}


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    cmd, lang = argv[1], argv[2]
    if cmd == "inventory":
        print(json.dumps(inventory(lang)))
        return 0
    if cmd == "files":
        parser, _ = load(lang)
        reqs = json.load(sys.stdin)
        for r in reqs:
            try:
                out = extract(parser, r["path"])
            except Boom as e:
                out = {"path": r["path"], "ok": False, "reason": str(e)}
            except Exception as e:  # a typed per-file failure, never a silent drop
                out = {"path": r["path"], "ok": False, "reason": "%s: %s" % (type(e).__name__, str(e)[:120])}
            sys.stdout.write(json.dumps(out) + "\n")
        return 0
    print("unknown command")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
