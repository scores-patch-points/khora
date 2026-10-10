#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
c0_grammar_keywords.py — the GIVER step of the C0 (language identification) prior: for every manifest language, read the
tree-sitter grammar's own node kinds (tree-sitter-language-pack, the same authority gold.py uses) and write the language's
keyword set as DATA. Nothing is hand-typed; nothing is counted on any corpus.

RULE (declared, one rule for every language; the same rule the existing code-kw-js prior's builder documents):
  keyword = an ANONYMOUS visible node kind that looks like a word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/  (reserved words, #directives)
          + a NAMED visible node kind /^(keyword|kw)_[a-z][a-z0-9_]*$/ with the prefix stripped (sql-style grammars name keywords).
  Named primitive-type nodes (C `int`, `void`) are NOT anonymous tokens and so are not here: that is the giver's own gap, kept.

usage: python c0_grammar_keywords.py OUT.json [lang ...]      (default: every language of the corpus manifest)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (gold.resolve / gold.load: the grammar loader of the gold instrument)

WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
NAMED_KW = re.compile(r"^(?:keyword|kw)_([a-z][a-z0-9_]*)$")


def keywords_of(lang):
    n = lang.node_kind_count
    kws, named = set(), set()
    for i in range(n):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        if lang.node_kind_is_named(i):
            m = NAMED_KW.match(k)
            if m:
                named.add(m.group(1))
        elif WORD.match(k):
            kws.add(k)
    return sorted(kws | named), len(kws), len(named), n


def main():
    out = sys.argv[1]
    manifest = json.load(open("/private/tmp/claude-501/code-corpus/manifest.json"))
    langs = sys.argv[2:] or list(manifest["languages"])
    res = {}
    for l in langs:
        try:
            g = gold.resolve(l)
            _, lang = gold.load(g)
            kws, n_anon, n_named, n_kinds = keywords_of(lang)
            res[l] = {"grammar": g, "keywords": kws, "anonymous_word_kinds": n_anon, "named_keyword_kinds": n_named, "node_kinds": n_kinds}
        except Exception as e:  # typed gap, never silent
            res[l] = {"grammar": None, "keywords": [], "error": str(e)[:200]}
    doc = {
        "schema": "GrammarKeywords@1",
        "giver": "tree-sitter grammars via tree-sitter-language-pack (node kinds: Language.node_kind_*), the authority gold.py uses",
        "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ plus named keyword_*/kw_* kinds (prefix stripped)",
        "languages": res,
    }
    json.dump(doc, open(out, "w"), indent=1, sort_keys=True)
    print(json.dumps({"out": out, "languages": len(res), "errors": [l for l, v in res.items() if v.get("error")], "sizes": {l: len(v["keywords"]) for l, v in res.items()}}))


if __name__ == "__main__":
    main()
