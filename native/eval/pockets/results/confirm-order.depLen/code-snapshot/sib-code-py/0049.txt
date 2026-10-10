"""xauth_c4_py.py: Python's OWN parser (stdlib `ast`, the CPython compiler front end) as an independent authority for the
C4 edges of a python file: calls (caller, callee), imports, inheritance. Used only by eval/coding-competence/c4-xauth.mjs.

stdin: JSON list of file paths. stdout: JSON {path: {calls:[[caller,callee],...], imports:[...], extends:[[child,base],...]} | {error}}.

Edge definitions (declared in c4-xauth.mjs, the same SYNTACTIC rules c4-edges.mjs states for the gold; the PARSER is the
independent part):
  calls    an ast.Call whose func is a Name (callee = id) or an Attribute (callee = attr); any other callee shape (the result of
           a call, a subscript, a lambda) has no name and is skipped. caller = innermost enclosing def/async def/class by
           the node tree, except that a def's DECORATORS are evaluated in the enclosing scope (they sit outside the def's own
           syntax span, as in every grammar), while a def's defaults / annotations / a class's bases belong to the def / class.
           A call outside every def/class has caller "<top>". Lambdas and comprehensions are not named scopes.
  imports  ast.Import: each alias name as written; ast.ImportFrom: "." * level + module (None -> ""), `__future__` excluded
           (a compiler directive, not the load of a module; the same exclusion c4-edges.mjs states).
  extends  ast.ClassDef bases that are a Name (id) or an Attribute (final attr); keywords (metaclass=...), starred items,
           calls and subscripts are not bases.
"""
import ast
import json
import sys


class V(ast.NodeVisitor):
    def __init__(self):
        self.calls = []
        self.imports = []
        self.extends = []
        self.stack = ["<top>"]

    def caller(self):
        return self.stack[-1]

    def visit_Call(self, node):
        f = node.func
        if isinstance(f, ast.Name):
            self.calls.append([self.caller(), f.id])
        elif isinstance(f, ast.Attribute):
            self.calls.append([self.caller(), f.attr])
        self.generic_visit(node)

    def _def(self, node):
        for d in node.decorator_list:
            self.visit(d)
        self.stack.append(node.name)
        for field, value in ast.iter_fields(node):
            if field in ("decorator_list", "name"):
                continue
            if isinstance(value, list):
                for it in value:
                    if isinstance(it, ast.AST):
                        self.visit(it)
            elif isinstance(value, ast.AST):
                self.visit(value)
        self.stack.pop()

    visit_FunctionDef = _def
    visit_AsyncFunctionDef = _def

    def visit_ClassDef(self, node):
        for b in node.bases:
            if isinstance(b, ast.Name):
                self.extends.append([node.name, b.id])
            elif isinstance(b, ast.Attribute):
                self.extends.append([node.name, b.attr])
        self._def(node)

    def visit_Import(self, node):
        for a in node.names:
            self.imports.append(a.name)

    def visit_ImportFrom(self, node):
        mod = node.module or ""
        if mod == "__future__" and node.level == 0:
            return
        self.imports.append("." * node.level + mod)


def run(path):
    with open(path, "rb") as fh:
        raw = fh.read()
    try:
        src = raw.decode("utf-8")
    except UnicodeDecodeError:
        return {"error": "not utf-8"}
    if "\x00" in src:
        return {"error": "null byte"}
    try:
        tree = ast.parse(src, filename=path)
    except (SyntaxError, ValueError, RecursionError, MemoryError) as e:
        return {"error": "%s: %s" % (type(e).__name__, str(e)[:80])}
    v = V()
    try:
        v.visit(tree)
    except RecursionError:
        return {"error": "RecursionError while walking"}
    return {"calls": v.calls, "imports": v.imports, "extends": v.extends}


if __name__ == "__main__":
    sys.setrecursionlimit(5000)
    paths = json.loads(sys.stdin.read())
    out = {}
    for p in paths:
        try:
            out[p] = run(p)
        except Exception as e:  # never kill the batch: a failure is a typed gap for that file
            out[p] = {"error": "%s: %s" % (type(e).__name__, str(e)[:80])}
    sys.stdout.write(json.dumps(out))
