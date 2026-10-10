#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rust_witness.py: the CONTEXT-AWARE witness of the rust keyword prior (a helper of build-rust-priors.mjs; it reads only the files the builder
names, and the builder names only manifest TRAIN rows).

WHY IT EXISTS. gold.mjs tokens carry a node type and a class but no ancestry, and tree-sitter lexes by parse state: inside a macro token tree
(`quote! { fn #name() {} }`, `#[serde(default)]`, a `macro_rules!` body) the grammar's `identifier` swallows keywords, and `'static` is the
identifier `static` inside a `lifetime` node. Counting those as "a hard keyword used as an identifier" would measure the grammar's
state-dependent lexing, not the prior. This helper parses the same grammar (gold.load: the same authority and cache) and splits every
open-class identifier leaf spelled as a hard keyword by CONTEXT:
    grammar  : an ordinary grammar position (a binding, a path segment, a field, a type name...): the only place "a hard keyword cannot name a
               being" is a claim
    token    : inside a macro token tree, a macro definition, or an attribute (token soup: not a binding position)
    lifetime : inside a `lifetime` or `label` node (`'static`, `'_`): a lifetime keyword, not the bare word
usage: python rust_witness.py IN.json OUT.json
  IN  = {"files":[{"id":"repo/rel","path":"/abs/file.rs"}], "hard":[...], "soft":[...], "reservedNotGrammar":[...], "controls":{"javascript":[...]}}
        controls: foreign keyword sets (a control built to fail: the same collision count under a foreign language's keywords must be > 0)
"""
import json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402

OPEN_TYPES = ("identifier", "type_identifier", "field_identifier", "shorthand_field_identifier")
TOKEN_ANCESTORS = {"token_tree", "token_tree_pattern", "token_repetition", "token_repetition_pattern", "token_binding_pattern", "macro_definition", "macro_rule", "attribute_item", "inner_attribute_item", "attribute"}
LIFETIME_ANCESTORS = {"lifetime", "label"}


def context_of(ancestors):
    if any(a in LIFETIME_ANCESTORS for a in ancestors):
        return "lifetime"
    if any(a in TOKEN_ANCESTORS for a in ancestors):
        return "token"
    return "grammar"


def main():
    spec = json.load(open(sys.argv[1]))
    hard, soft, rng = set(spec["hard"]), set(spec["soft"]), set(spec.get("reservedNotGrammar", []))
    controls = {k: set(v) - hard for k, v in (spec.get("controls") or {}).items()}
    ctl_counts = {k: collections.defaultdict(collections.Counter) for k in controls}
    g = gold.resolve("rust")
    parser, lang = gold.load(g)
    ident_hard = collections.defaultdict(lambda: collections.Counter())      # word -> Counter(context)
    ident_soft = collections.defaultdict(lambda: collections.Counter())
    ident_rng = collections.defaultdict(lambda: collections.Counter())
    kw_tokens = collections.defaultdict(lambda: collections.Counter())       # hard word as its OWN grammar token (anonymous or dedicated named) -> Counter(context)
    examples = collections.defaultdict(list)
    raw = collections.Counter()
    raw_hard = collections.Counter()
    raw_examples = []
    n_files = n_leaves = n_ident = n_err_files = 0
    for f in spec["files"]:
        text = open(f["path"], "rb").read()
        root = parser.parse(text).root_node
        n_files += 1
        if root.has_error:
            n_err_files += 1
        stack = [(root, ())]
        while stack:
            n, anc = stack.pop()
            if n.child_count == 0:
                n_leaves += 1
                t = n.type
                tx = n.text.decode("utf8", "replace")
                if t in OPEN_TYPES:
                    n_ident += 1
                    if tx.startswith("r#"):
                        raw[context_of(anc)] += 1
                        if tx[2:] in hard:
                            raw_hard[tx[2:]] += 1
                            if len(raw_examples) < 12:
                                raw_examples.append(f["id"] + ":" + str(n.start_point[0] + 1) + " " + tx)
                    else:
                        ctx = context_of(anc)
                        for cname, cset in controls.items():
                            if tx in cset:
                                ctl_counts[cname][tx][ctx] += 1
                        if tx in hard or tx in soft or tx in rng:
                            tgt = ident_hard if tx in hard else (ident_soft if tx in soft else ident_rng)
                            tgt[tx][ctx] += 1
                            key = (tx, ctx)
                            if len(examples[key]) < 4:
                                examples[key].append(f["id"] + ":" + str(n.start_point[0] + 1) + " <" + ".".join(anc[-2:]) + ">")
                elif tx in hard and t not in ("string_content", "escape_sequence", "line_comment", "block_comment", "doc_comment", "string_literal", "char_literal", "raw_string_literal", "integer_literal", "float_literal"):
                    kw_tokens[tx][context_of(anc)] += 1
            for c in n.children:
                stack.append((c, anc + (n.type,)))
    out = {
        "files": n_files, "filesWithParseError": n_err_files, "leaves": n_leaves, "openIdentifierLeaves": n_ident,
        "hardAsIdentifier": {w: dict(c) for w, c in sorted(ident_hard.items())},
        "softAsIdentifier": {w: dict(c) for w, c in sorted(ident_soft.items())},
        "reservedNotGrammarAsIdentifier": {w: dict(c) for w, c in sorted(ident_rng.items())},
        "hardAsOwnToken": {w: dict(c) for w, c in sorted(kw_tokens.items())},
        "controls": {k: {"byContext": {ctx: sum(c.get(ctx, 0) for c in v.values()) for ctx in ("grammar", "token", "lifetime")}, "words": {w: dict(c) for w, c in sorted(v.items(), key=lambda kv: -sum(kv[1].values()))[:25]}} for k, v in ctl_counts.items()},
        "rawIdentifiers": {"byContext": dict(raw), "hardSpelled": dict(raw_hard), "examples": raw_examples},
        "examples": {"%s|%s" % k: v for k, v in sorted(examples.items())},
    }
    json.dump(out, open(sys.argv[2], "w"), indent=1)
    print(json.dumps({"files": n_files, "openIdentifierLeaves": n_ident, "hardAsIdentifierWords": len(ident_hard)}))


if __name__ == "__main__":
    main()
