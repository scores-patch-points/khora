#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
go_kw_giver.py: the GIVER step of the Go keyword prior (CodeKeywordPrior@1, written by build-go-priors.mjs as
priors/code-kw-golang.json; see the NAMING NOTE below).

It is the Go twin of python_kw_giver.py / javascript_kw_giver.py: same shape, same disclosure discipline, different authorities. It
reads the CLOSED CLASSES of the Go language off three authorities and writes them as a LanguageLawPrior@1-shaped JSON (the input shape
that the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed and
nothing is counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for go, loaded through tree-sitter-language-pack (the authority
     gold.py uses). Three things are read off it, all as data:
       (a) every ANONYMOUS visible node kind that looks like a word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (the c0_grammar_keywords.py rule);
       (b) every NAMED visible word-shaped node kind that is a DEDICATED LITERAL TERMINAL: parse `var x = <kind>` and keep it iff the
           right-hand side is a named leaf whose type and text are both the kind (that is how true, false, nil, iota enter);
       (c) the grammar's OWN shipped highlights.scm (the pack's `get_highlights_query("go")`, upstream tree-sitter-go): the `@keyword`
           word list, the `@constant.builtin` kinds and the `#match? @function.builtin "^(...)$"` builtin-function alternation. These are
           declarations the grammar's authors made, parsed here by three regular expressions over the query text.
  STANDARD (the arbiter of RESERVEDNESS and of the predeclared identifiers): the Go language specification, https://go.dev/ref/spec
     (fetched once to /private/tmp/claude-501/coding-competence/go/spec/go-spec.html by curl; see PROVENANCE-go.md; this script does NO
     network I/O). No Go toolchain exists on this machine (no `go` binary; none was downloaded), so the spec is the language's own law
     standing in for the engine python_kw_giver.py and javascript_kw_giver.py use (CPython compile(), V8 compile probes). The spec's
     "Keywords" block says which words are reserved ("may not be used as identifiers"); its "Predeclared identifiers" block (Types,
     Constants, Zero value, Functions) lists what the universe block declares and a program may SHADOW; its "Blank identifier" paragraph
     names `_`. Both blocks are read by an HTML parse of the page, not typed.
  WHY BOTH. The grammar alone cannot say which words are reserved: tree-sitter lexes by parse state, and (measured in the sibling
     givers) its identifier rule can swallow keywords. The spec alone cannot say which words the READER'S OWN LEXER AUTHORITY gives a
     token. The prior keeps what both agree on as HARD:
        hard = (grammar anonymous word tokens)  INTERSECT  (spec Keywords)
     and records, never refuses, the rest:
        soft = (grammar dedicated literal terminals U the grammar's blank_identifier text) that the spec does not reserve
               (true false nil iota and the blank identifier `_`: a program may shadow the first four; `_` introduces no binding)
        builtins = the grammar's highlights.scm builtin functions U the spec's predeclared Types, Constants, Zero value and Functions
     Hard words REFUSE (cannot name a being); soft words and builtins are recorded and NEVER refuse (S83 polarity: shadowing a
     predeclared identifier is legal Go and is a fact about the material, not a parse failure).
  A GO-SPECIFIC NOTE, stated here: the spec says its keywords "may not be used as identifiers", and a field or method name is an
     identifier, so the refusal is not confined to binding positions the way javascript's is (a javascript property may be named
     `delete`; a Go selector may not be named `type`). This is the spec's statement, not measured here: K3 probes only the four
     binding forms below.
  TYPED GAPS (disclosed, never silent): (1) there is no Go compiler on this machine, so reservedness is arbitrated by the spec, not by
     an engine compile; (2) the standard library is not part of the language specification and `go list std` needs the toolchain, so
     lexicon.stdlibModules is an empty list recorded as a typed gap, not as zero; (3) the installed language pack records neither the
     upstream commit nor a semantic version for its go grammar (Language.semantic_version is None): the prior records the PACK version,
     the ABI version, the sha256 of the compiled library and a fingerprint of the node-kind table; the upstream commit is null.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  Disclosed exploratory reads that happened before this header was written (nothing else was looked at):
    (e1) the incumbent priors/code-kw-go.json: 25 hard keywords, no soft keywords, no builtins, built by an earlier step from the ethos
         go-language-law-prior-v1.json (a tree-sitter node-types derivation); its provenance names no grammar version.
    (e2) the grammar's visible node kinds: 25 anonymous word kinds (the Go keywords) and, among the named word-shaped kinds, `true`,
         `false`, `nil`, `iota` and `blank_identifier`; the highlights.scm text (keyword list, constant.builtin kinds, the builtin
         function alternation of 15 names).
    (e3) the spec page's Keywords block (25 words), Predeclared identifiers block (Types, Constants, Zero value, Functions) and its
         Blank identifier paragraph ("represented by the underscore character <code>_</code>"); the spec header line
         "Language version go1.27 (May 26, 2026)".
    (e4) the manifest's go TRAIN list (5 repositories, 185 files). No corpus file is read by this script.
  K1 cross-giver agreement. A = grammar anonymous word kinds; B = spec Keywords; C = highlights.scm @keyword list. Pass iff A == B == C
     (25 words). Expected: pass, size 25.
  K2a declarability of builtins. Every spec predeclared Type, every builtin function (grammar list U spec list) parses with no ERROR
     and no MISSING node as a binding name in all four forms below (the grammar treats them as plain identifiers). Pass: all. Expected:
     pass. (This is a GRAMMAR-side check; the spec is the authority that shadowing them is legal.)
  K2b grammar over-refusal (informational with a prediction). The dedicated terminals true, false, nil, iota are lexed as dedicated
     tokens, so the grammar is expected to REFUSE them (ERROR or MISSING) in at least one binding form although the spec allows
     shadowing. Prediction: all 4 refused in at least one form. If any is accepted everywhere, the stated reason for arbitrating by
     the spec rather than the grammar loses one of its witnesses (reported, not a failure of the prior).
  K3 hard words are refused by the grammar. Every hard word is refused (ERROR or MISSING) in ALL four binding forms. Pass: every hard
     word. Expected: pass, 25/25 (a miss would be a grammar leniency, as in the javascript giver's K4).
  K4 builtin-function sources. grammar highlights.scm builtin functions G_b (15 names) versus spec Functions S_f. Pass iff
     G_b is a SUBSET of S_f (the grammar's query is not ahead of the spec). Prediction (reported either way, not part of the pass rule):
     S_f minus G_b == {clear, max, min} (names the spec lists and the grammar's older query does not).
  K5 incumbent. hard == the incumbent priors/code-kw-go.json hard set. Expected: identical (symmetric difference empty).
  K6 control built to fail (II.23/II.4). The SAME word rule (anonymous word kinds) applied to other grammars (python, javascript, c,
     ruby, java) must NOT reproduce the Go keyword list: for each, |A_other xor B| >= 5. Licence: the K1 statistic moves (a wrong
     grammar disagrees with the Go spec). Pass iff every control grammar that loads has |xor| >= 5; a control that matches Go's list
     means the instrument is broken.
  K7 constants. The grammar's dedicated literal terminals == spec Constants U Zero value (true false iota nil). Expected: equal.
  K8 counts. Predicted: hard 25, soft 5 (_, false, iota, nil, true), builtins 43 (22 types + 3 constants + nil + 17 functions);
     a different count is reported, not a failure.
  The corpus (TRAIN) witness predictions R1..R5 and the name-prior predictions N1..N5 are pre-registered in the header of
  build-go-priors.mjs, which consumes this file's output.

AMENDMENTS AFTER THE FIRST RUN (stated honestly; the pre-registered text above is unchanged).
  First run, as pre-registered: K1 pass (25), K2a pass, K4 pass and its prediction held (spec-only = clear, max, min), K5 pass (identical to
  the incumbent), K6 pass (xor with the Go spec: python 44, javascript 44, c 50, ruby 49, java 61). Four things did NOT go as predicted:
    K2b FAILED its prediction: true, false, nil, iota are NOT refused by the grammar in any binding form (it lexes them as identifiers
        where an identifier is wanted), so "the grammar over-refuses them" is false; the grammar agrees with the spec here.
    K3 FAILED: no hard word is refused by the grammar in all four forms; every one of the 25 parses CLEAN in at least one binding form
        (`var break int` parses with no ERROR). Tree-sitter's keyword extraction lets the identifier rule swallow a keyword where only
        an identifier is valid, exactly as the javascript giver's K4 found. The hard set is therefore NOT read from grammar refusal; it
        is the grammar's token list ARBITRATED BY THE SPEC, which is the reason both givers are used.
    K8 FAILED, two causes: (i) my arithmetic: the spec's Functions block lists 18 names, not 17, so builtins = 22 + 3 + 1 + 18 = 44,
        not 43; (ii) a defect in the dedicated-terminal rule, below.
  Three defects were fixed after the first run (none changes a pre-registered pass rule):
    A1 (before any result was produced) two highlights.scm regular expressions had nested `\s*` and backtracked catastrophically;
        the ambiguous `\s*` was removed. No output depended on it.
    A2 the dedicated-terminal probe `var x = <kind>` admitted the grammar's generic `identifier` kind (its text coincides with the kind
        name): the first run listed `identifier` as a soft keyword and K7 failed on it. The generic identifier kind is now excluded, as
        javascript_kw_giver.py excludes it (`right.type != "identifier"`).
    A3 the blank identifier was probed as `var _ = 0`, which this grammar parses as a plain `identifier`; the form in which it emits
        its `blank_identifier` kind is `import _ "fmt"` (found by trying six candidate forms after the first run). The text `_` still
        comes from the spec's Blank identifier paragraph and the kind from the grammar; the probe only verifies they meet.
  Pre-registered K8 soft = {_, false, iota, nil, true} is re-evaluated after A2 and A3; the builtins prediction stays recorded as wrong.

NAMING NOTE. priors/code-kw-go.json and priors/code-name-go.json already exist (the incumbents; a keyword prior from the ethos law
prior, and a name prior built from an ethos tree that holds a repository the manifest assigns to TEST). Rule 10 forbids editing them,
so the Go priors built here are the new files priors/code-kw-golang.json and priors/code-name-golang.json (the same convention as
code-kw-python.json beside code-kw-py.json); adopting them is a rename or a loader edit, reported to the main agent, never done here.

usage: python go_kw_giver.py OUT.json SPEC.html [FETCH_META.json]
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)
from bs4 import BeautifulSoup  # noqa: E402

WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
# four binding forms (a declared name in a package var, a short var declaration, a function name, a parameter name)
FORMS = (
    "package p\nvar {w} int\n",
    "package p\nfunc f() {{\n\t{w} := 0\n\t_ = {w}\n}}\n",
    "package p\nfunc {w}() {{}}\n",
    "package p\nfunc f({w} int) {{}}\n",
)
CONTROL_GRAMMARS = ("python", "javascript", "c", "ruby", "java")
CONTROL_MIN_XOR = 5


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def broken(parser, src):
    root = parser.parse(src.encode("utf8")).root_node
    return any(x.type == "ERROR" or x.is_missing for x in walk(root))


def forms_of(w):
    return [f.format(w=w) for f in FORMS]


def refused_forms(parser, w):
    """the binding forms in which the grammar yields ERROR/MISSING for word w"""
    return [i for i, src in enumerate(forms_of(w)) if broken(parser, src)]


def kinds_of(lang):
    anon, named, allk = set(), set(), []
    for i in range(lang.node_kind_count):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        nm = lang.node_kind_is_named(i)
        allk.append((k, nm))
        if WORD.match(k):
            (named if nm else anon).add(k)
    return anon, named, allk


def spec_blocks(html):
    s = BeautifulSoup(html, "html.parser")
    page_text = s.get_text(" ")
    m = re.search(r"Language version (go[0-9.]+)\s*\(([^)]*)\)", page_text)
    kw_pre = s.find(id="Keywords").find_next("pre").get_text()
    keywords = kw_pre.split()
    pre = s.find(id="Predeclared_identifiers").find_next("pre").get_text()
    groups, cur = {}, None
    for line in pre.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.endswith(":"):
            cur = line[:-1]
            groups[cur] = []
        elif cur is not None:
            groups[cur].extend(line.split())
    blank = s.find(id="Blank_identifier").find_next("p")
    bm = re.search(r"underscore character\s*(.+)", blank.get_text(" ", strip=True))
    code = blank.find("code")
    return {
        "version": m.group(1) if m else None, "versionDate": m.group(2) if m else None,
        "keywords": keywords, "predeclared": groups, "blankIdentifier": code.get_text() if code is not None else None,
    }


def highlights_declared(q):
    out = {"keyword": [], "constantBuiltinKinds": [], "builtinFunctions": []}
    m = re.search(r'\[((?:\s*"[^"]*")+)\s*\]\s*@keyword', q or "")
    if m:
        out["keyword"] = re.findall(r'"([^"]*)"', m.group(1))
    m = re.search(r"\[((?:\s*\(\w+\))+)\s*\]\s*@constant\.builtin", q or "")
    if m:
        out["constantBuiltinKinds"] = re.findall(r"\((\w+)\)", m.group(1))
    m = re.search(r'#match\?\s+@function\.builtin\s+"\^\(([^)]*)\)\$"', q or "")
    if m:
        out["builtinFunctions"] = m.group(1).split("|")
    return out


def main():
    out, spec_path = sys.argv[1], sys.argv[2]
    meta = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
    html = open(spec_path, "rb").read()
    spec_sha = hashlib.sha256(html).hexdigest()
    spec = spec_blocks(html.decode("utf8"))

    g = gold.resolve("go")
    parser, lang = gold.load(g)
    anon, named_word, kinds = kinds_of(lang)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()
    hl = highlights_declared(gold.pack().get_highlights_query("go"))

    # ---- GRAMMAR: dedicated named terminals ----------------------------------------------------------------------------
    literal_terminals = {}
    for w in sorted(named_word):
        if w == "identifier":  # the probe variable is named like the grammar's generic identifier kind: a coincidence, not a dedicated terminal (A2)
            continue
        src = "package p\nvar x = %s\n" % w
        root = parser.parse(src.encode("utf8")).root_node
        if any(x.type == "ERROR" or x.is_missing for x in walk(root)):
            continue
        for n in walk(root):
            if n.type == w and n.is_named and n.child_count == 0 and n.text.decode("utf8") == w:
                literal_terminals[w] = n.type
                break
    # the blank identifier: kind from the grammar, text from the spec, verified by a parse
    blank_text, blank_kind = spec["blankIdentifier"], None
    if blank_text and any(k == "blank_identifier" and nm for k, nm in kinds):
        root = parser.parse(('package p\nimport %s "fmt"\n' % blank_text).encode("utf8")).root_node  # the form in which this grammar emits blank_identifier (A3)
        for n in walk(root):
            if n.type == "blank_identifier" and n.text.decode("utf8") == blank_text:
                blank_kind = n.type
                break

    grammar_words = sorted(anon)                     # anonymous word tokens (the c0 rule)
    spec_keywords = sorted(set(spec["keywords"]))
    hard = sorted(set(grammar_words) & set(spec_keywords))
    dedicated = sorted(literal_terminals)
    soft = sorted(set(dedicated) | ({blank_text} if blank_kind else set()))
    soft = [w for w in soft if w not in hard]

    pre = spec["predeclared"]
    spec_types = sorted(set(pre.get("Types", [])))
    spec_consts = sorted(set(pre.get("Constants", [])))
    spec_zero = sorted(set(pre.get("Zero value", [])))
    spec_funcs = sorted(set(pre.get("Functions", [])))
    g_funcs = sorted(set(hl["builtinFunctions"]))
    builtins = sorted(set(g_funcs) | set(spec_types) | set(spec_consts) | set(spec_zero) | set(spec_funcs))

    # ---- checks ------------------------------------------------------------------------------------------------------
    k1 = {"pass": sorted(grammar_words) == spec_keywords == sorted(hl["keyword"]), "grammarAnonymousWordKinds": grammar_words, "specKeywords": spec_keywords,
          "highlightsKeyword": sorted(hl["keyword"]), "size": len(hard), "predictedSize": 25, "sizeAsPredicted": len(hard) == 25}
    k2a_rows = {w: refused_forms(parser, w) for w in sorted(set(builtins) - set(dedicated))}
    k2a_bad = {w: r for w, r in k2a_rows.items() if r}
    k2a = {"pass": not k2a_bad, "checked": len(k2a_rows), "refusedByGrammar": k2a_bad}
    k2b_rows = {w: refused_forms(parser, w) for w in dedicated}
    k2b = {"allRefusedInAtLeastOneForm": all(k2b_rows[w] for w in dedicated), "refusedFormsByWord": k2b_rows, "prediction": "all 4 refused in at least one form"}
    k3_rows = {w: refused_forms(parser, w) for w in hard}
    k3_bad = {w: [i for i in range(len(FORMS)) if i not in r] for w, r in k3_rows.items() if len(r) != len(FORMS)}
    k3 = {"pass": bool(hard) and not k3_bad, "hard": len(hard), "acceptedByGrammarInForms": k3_bad}
    k4 = {"pass": set(g_funcs) <= set(spec_funcs), "grammarBuiltinFunctions": g_funcs, "specFunctions": spec_funcs,
          "specOnly": sorted(set(spec_funcs) - set(g_funcs)), "grammarOnly": sorted(set(g_funcs) - set(spec_funcs)),
          "predictedSpecOnly": ["clear", "max", "min"], "specOnlyAsPredicted": sorted(set(spec_funcs) - set(g_funcs)) == ["clear", "max", "min"]}
    inc_path = os.path.join(HERE, "..", "..", "priors", "code-kw-go.json")
    try:
        inc = json.load(open(inc_path))["keywords"]
        k5 = {"pass": sorted(inc) == hard, "against": "priors/code-kw-go.json", "incumbentHard": len(inc), "symmetricDifference": sorted(set(inc) ^ set(hard))}
    except Exception as e:  # typed gap, never silent
        k5 = {"pass": None, "gap": "incumbent unreadable: %s" % str(e)[:120]}
    k6_rows = {}
    for cg in CONTROL_GRAMMARS:
        try:
            _, clang = gold.load(gold.resolve(cg))
            canon, _, _ = kinds_of(clang)
            k6_rows[cg] = {"anonymousWordKinds": len(canon), "xorWithGoSpecKeywords": len(set(canon) ^ set(spec_keywords)), "sharedWithGoSpec": sorted(set(canon) & set(spec_keywords))}
        except Exception as e:  # typed gap, never silent
            k6_rows[cg] = {"gap": str(e)[:120]}
    loaded = {c: v for c, v in k6_rows.items() if "xorWithGoSpecKeywords" in v}
    k6 = {"pass": bool(loaded) and all(v["xorWithGoSpecKeywords"] >= CONTROL_MIN_XOR for v in loaded.values()), "minXor": CONTROL_MIN_XOR, "grammars": k6_rows}
    k7 = {"pass": sorted(dedicated) == sorted(set(spec_consts) | set(spec_zero)), "grammarDedicatedTerminals": dedicated, "highlightsConstantBuiltinKinds": sorted(hl["constantBuiltinKinds"]),
          "specConstantsAndZeroValue": sorted(set(spec_consts) | set(spec_zero))}
    k8 = {"hard": len(hard), "soft": len(soft), "builtins": len(builtins), "predicted": {"hard": 25, "soft": 5, "builtins": 43}, "asPredicted": [len(hard), len(soft), len(builtins)] == [25, 5, 43]}

    soft_sources = {}
    for w in soft:
        s = []
        if w in literal_terminals:
            s.append("grammar:dedicated-terminal:%s" % literal_terminals[w])
        if w == blank_text and blank_kind:
            s.append("grammar:%s + spec:blank-identifier (declarable syntactically, introduces no binding)" % blank_kind)
        s.append("spec:not-a-keyword (predeclared / blank, may be shadowed)")
        soft_sources[w] = s
    builtin_sources = {}
    for w in builtins:
        s = []
        if w in g_funcs:
            s.append("grammar:highlights.scm:function.builtin")
        if w in spec_types:
            s.append("spec:predeclared:Types")
        if w in spec_consts:
            s.append("spec:predeclared:Constants")
        if w in spec_zero:
            s.append("spec:predeclared:Zero value")
        if w in spec_funcs:
            s.append("spec:predeclared:Functions")
        builtin_sources[w] = s

    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "go",
        "giver": {
            "resource": "tree-sitter grammar for go (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by the Go language specification (%s, %s) for which words are reserved and which identifiers are predeclared" % (spec["version"], spec["versionDate"]),
            "engine": {"implementation": "go-language-specification", "version": spec["version"], "date": spec["versionDate"], "url": meta.get("url", "https://go.dev/ref/spec"),
                       "fetchedAt": meta.get("fetchedAt"), "sha256": spec_sha, "mode": "HTML parse of the Keywords, Predeclared identifiers and Blank identifier sections; no Go toolchain on this machine (typed gap)"},
            "note": "Derived, never hand-typed (go_kw_giver.py): hard = grammar anonymous word tokens INTERSECT the spec's Keywords; soft = the grammar's dedicated literal terminals (true false nil iota) and blank identifier that the spec does not reserve; builtins = the grammar highlights.scm builtin functions U the spec's predeclared Types, Constants, Zero value and Functions. Hard words refuse in every identifier position; soft words and builtins never refuse (shadowing a predeclared identifier is legal Go). Semantics and type-checking stay in the Go compiler.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": builtins,
        "lexicon": {"stdlibModules": []},
        "derivation": {
            "grammar": {
                "name": "go", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-go", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": grammar_words, "dedicatedLiteralTerminals": literal_terminals, "blankIdentifierKind": blank_kind,
                "highlightsDeclared": hl,
                "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (c0_grammar_keywords.py rule) + dedicated named terminal probe `var x = <kind>` for every named word-shaped kind + highlights.scm @keyword / @constant.builtin / @function.builtin declarations",
            },
            "spec": {
                "url": meta.get("url", "https://go.dev/ref/spec"), "version": spec["version"], "versionDate": spec["versionDate"], "fetchedAt": meta.get("fetchedAt"), "sha256": spec_sha,
                "licence": "BSD-3-Clause (the specification is doc/go_spec.html of https://github.com/golang/go); only word lists are extracted, no spec text is redistributed",
                "keywords": spec_keywords, "predeclared": pre, "blankIdentifier": blank_text,
            },
            "bindingForms": [f.replace("{{", "{").replace("}}", "}") for f in FORMS],
            "softSources": soft_sources, "builtinSources": builtin_sources,
            "contextualReservation": {"status": "none_recorded", "note": "the spec reserves exactly its Keywords block; no word is reserved only in some contexts"},
            "stdlibModules": {"status": "gap", "reason": "the standard library is not part of the language specification and `go list std` needs the Go toolchain, which is not installed on this machine; an empty list here is a typed gap, not zero"},
            "bindingOnly": False,
            "checks": {"K1": k1, "K2a": k2a, "K2b": k2b, "K3": k3, "K4": k4, "K5": k5, "K6": k6, "K7": k7, "K8": k8},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(builtins), "stdlibModules": 0},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": soft, "builtins": len(builtins), "K1": k1["pass"], "K2a": k2a["pass"], "K2b": k2b["allRefusedInAtLeastOneForm"], "K3": k3["pass"],
                      "K4": k4["pass"], "K4_specOnly": k4["specOnly"], "K5": k5.get("pass"), "K6": k6["pass"], "K7": k7["pass"], "K8": k8["asPredicted"],
                      "K6_xor": {c: v.get("xorWithGoSpecKeywords") for c, v in k6_rows.items()}, "K2b_forms": k2b_rows, "K3_bad": k3_bad, "K2a_bad": k2a_bad}))


if __name__ == "__main__":
    main()
