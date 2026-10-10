#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
java_decl_walk.py: a DIRECT tree-sitter walk of java declaration nodes, independent of gold.py's tags.scm queries, used by
build-java-priors.mjs as the second reading of the same grammar (check N3): do the gold definition names and a plain node-type walk agree?

It reads ONLY the files named on stdin (the builder passes manifest TRAIN rows and nothing else).
stdin : JSON list of {"id": ..., "path": ...}
stdout: JSON list of {"id": ..., "decls": [[name, kind], ...]}   (kind: class|interface|enum|method, the gold kinds of the same nodes)
node types -> kind: class_declaration class, record_declaration class, interface_declaration interface, annotation_type_declaration interface,
enum_declaration enum, method_declaration method, constructor_declaration method. The `name` field of the node is the declared name.
No model, no network.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402

KINDS = {
    "class_declaration": "class", "record_declaration": "class",
    "interface_declaration": "interface", "annotation_type_declaration": "interface",
    "enum_declaration": "enum",
    "method_declaration": "method", "constructor_declaration": "method",
}


def main():
    parser, _lang = gold.load(gold.resolve("java"))
    items = json.loads(sys.stdin.read())
    out = []
    for it in items:
        data = open(it["path"], "rb").read()
        root = parser.parse(data).root_node
        decls = []
        stack = [root]
        while stack:
            n = stack.pop()
            k = KINDS.get(n.type)
            if k:
                nm = n.child_by_field_name("name")
                if nm is not None:
                    decls.append([nm.text.decode("utf8"), k])
            stack.extend(n.children)
        out.append({"id": it["id"], "decls": decls})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
