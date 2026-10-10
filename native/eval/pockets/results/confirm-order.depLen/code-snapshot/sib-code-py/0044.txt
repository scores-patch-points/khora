#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rust-priors-posthoc.py: POST HOC diagnosis (labelled post_hoc; written AFTER the first run of build-rust-priors.mjs showed R4a "fail" and R6
"not zero"; it changes no verdict and no threshold of that file). It re-parses the same TRAIN files (the file list the builder wrote to
rust-witness-input.json, so no other file is opened) and answers two questions the first run raised:

  Q1 (R4a fail, 187 leaves, ALL the word `_`): in which grammar positions does the identifier-typed leaf `_` occur, and is any of them a
      DECLARING position (the name of an item, a binding pattern, a parameter, a field, a type parameter)?
  Q2 (R6 not zero, 642 leaves, ALL the word `Self`): same question for `Self`, plus how many items are DECLARED with that name.

A declaring position = the leaf is the `name` field of an item (function_item, struct_item, enum_item, union_item, trait_item, type_item,
mod_item, const_item, static_item, macro_definition, function_signature_item, enum_variant, field_declaration), or sits in a `parameter` /
`let_declaration` / `const_parameter` / `type_parameter` / `lifetime_parameter` binding slot.

usage: python rust-priors-posthoc.py IN.json OUT.json   (IN = rust-witness-input.json)
"""
import collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402

NAME_FIELD_PARENTS = {"function_item", "struct_item", "enum_item", "union_item", "trait_item", "type_item", "mod_item", "const_item", "static_item", "macro_definition", "function_signature_item", "enum_variant", "field_declaration", "associated_type", "type_parameter", "const_parameter", "extern_crate_declaration"}
BINDING_PARENTS = {"parameter", "let_declaration", "closure_parameters", "tuple_pattern", "tuple_struct_pattern", "struct_pattern", "mut_pattern", "ref_pattern", "captured_pattern", "slice_pattern", "or_pattern", "field_pattern", "match_pattern", "self_parameter"}


def main():
    spec = json.load(open(sys.argv[1]))
    g = gold.resolve("rust")
    parser, lang = gold.load(g)
    words = {"_", "Self"}
    out = {w: {"leaves": 0, "byParent": collections.Counter(), "byGrandparent": collections.Counter(), "declaring": 0, "declaringExamples": [], "asNameFieldOfItem": 0} for w in words}
    for f in spec["files"]:
        root = parser.parse(open(f["path"], "rb").read()).root_node
        stack = [(root, ())]
        while stack:
            n, anc = stack.pop()
            if n.child_count == 0 and n.type in ("identifier", "type_identifier", "field_identifier", "shorthand_field_identifier"):
                tx = n.text.decode("utf8", "replace")
                if tx in words and not any(a in ("token_tree", "token_tree_pattern", "token_repetition", "token_repetition_pattern", "token_binding_pattern", "macro_definition", "macro_rule", "attribute_item", "inner_attribute_item", "attribute", "lifetime", "label") for a in anc):
                    o = out[tx]
                    o["leaves"] += 1
                    parent = anc[-1] if anc else None
                    o["byParent"][parent] += 1
                    o["byGrandparent"][".".join(anc[-2:])] += 1
                    p = n.parent
                    is_name = p is not None and p.type in NAME_FIELD_PARENTS and p.child_by_field_name("name") is not None and p.child_by_field_name("name").id == n.id
                    if is_name:
                        o["asNameFieldOfItem"] += 1
                    if is_name or (parent in BINDING_PARENTS):
                        o["declaring"] += 1
                        if len(o["declaringExamples"]) < 6:
                            o["declaringExamples"].append(f["id"] + ":" + str(n.start_point[0] + 1) + " <" + ".".join(anc[-2:]) + ">")
            for c in n.children:
                stack.append((c, anc + (n.type,)))
    res = {"post_hoc": True, "writtenAfter": "the first run's R4a fail (187 leaves, all `_`) and R6 not-zero (642 leaves, all `Self`) were seen", "files": len(spec["files"])}
    for w, o in out.items():
        res[w] = {"leaves": o["leaves"], "declaring": o["declaring"], "asNameFieldOfItem": o["asNameFieldOfItem"], "declaringExamples": o["declaringExamples"],
                  "byParent": dict(o["byParent"].most_common(8)), "byGrandparent": dict(o["byGrandparent"].most_common(8))}
    json.dump(res, open(sys.argv[2], "w"), indent=1)
    print(json.dumps({"_": {k: res["_"][k] for k in ("leaves", "declaring")}, "Self": {k: res["Self"][k] for k in ("leaves", "declaring", "asNameFieldOfItem")}}))


if __name__ == "__main__":
    main()
