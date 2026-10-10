#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
python_kw_giver.py: the GIVER step of priors/code-kw-python.json (CodeKeywordPrior@1).

WHAT THIS DOES. It reads the CLOSED CLASSES of the Python language off two authorities and writes them as a
LanguageLawPrior@1-shaped JSON (the input shape scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1).
Nothing is hand-typed and nothing is counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for python, loaded through tree-sitter-language-pack (the
     authority gold.py uses). Rule, one for every language (the c0_grammar_keywords.py rule): every ANONYMOUS visible node kind
     that looks like a word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/, is a word token the grammar recognises somewhere. Plus, for every
     word the engine reserves that is NOT an anonymous kind, a probe: parse `x = <word>` with the grammar and keep the word iff the
     grammar gives it a DEDICATED named terminal (leaf, named, not `identifier`, text == the word): that is how True / False /
     None enter (the grammar names them `true`, `false`, `none`).
  ENGINE (the arbiter of RESERVEDNESS): CPython, run as `python -I -S` (isolated, no site) from this very interpreter:
     keyword.kwlist, keyword.softkwlist, dir(builtins), sys.stdlib_module_names, and a COMPILE PROBE: a word is REFUSED by the
     engine iff `def W(): pass`, `class W: pass`, `W = 0` and `def f(W): pass` ALL raise SyntaxError under compile(). compile() only
     parses; nothing is executed.
  WHY BOTH. The grammar alone cannot say which words are reserved: tree-sitter lexes by parse state (a keyword that is not valid
     in the current state lexes as an identifier), and its token set carries Python-2 legacy words (`print`, `exec`) and the
     contextual `match`/`case`/`type` as tokens. The engine alone cannot say which words the GRAMMAR (the reader's own lexer
     authority) gives a token. The prior keeps what both agree on as HARD and records the rest as SOFT (declarable):
        hard  = (grammar word tokens U grammar dedicated literal terminals)  INTERSECT  engine-refused
        soft  = (grammar word tokens that the engine does not refuse) U engine keyword.softkwlist
     Hard words REFUSE (cannot name a being); soft words and builtins are recorded and NEVER refuse (S83 polarity).

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  One exploratory read happened before this header was written, and is disclosed: listing the grammar's anonymous word node
  kinds (gold.load + node_kind_for_id) showed 37 kinds. That count is NOT used by any prediction below except K1's wording.
  K1 giver agreement. The hard set equals the engine's keyword.kwlist exactly (35 words). Pass: symmetric difference empty.
     Expected: pass, with True/False/None entering through the grammar's dedicated terminals and `async`/`await` entering
     through the grammar's anonymous kinds. A disagreement is the FINDING (listed in `derivation.disagreement`), never fixed
     by editing a list.
  K2 declarability. Every SOFT word compiles as a def name, a class name, an assignment target and a parameter name in the
     engine. Pass: all of them. Expected: pass (`_`, `case`, `exec`, `match`, `print`, `type`).
  K3 arbiter consistency. Every HARD word is refused on all four compile forms. Pass: 35 of 35. (Guards the probe forms.)
  K4 why the engine arbitrates (informational, no pass rule). The number of engine-reserved words the GRAMMAR itself parses
     cleanly as a def name (`def W(): pass` with no ERROR/MISSING). Prediction: > 0. If it is 0 the stated reason (tree-sitter's
     state-dependent lexing) is wrong and this file's WHY BOTH paragraph must be withdrawn.
  The name-prior predictions (N1..N4) and the refusal-polarity / control predictions (R1..R4) are pre-registered in the header
  of build-python-priors.mjs, which consumes this file's output.

GRAMMAR VERSION (typed gap, disclosed): the installed language pack records neither the upstream commit nor a semantic version
for its python grammar (Language.semantic_version is None). The prior therefore records the PACK version, the sha256 of the
compiled grammar library, the ABI version, the upstream repository URL, and a fingerprint of the grammar's node-kind table;
the upstream commit is `null` (unrecorded), not guessed.

usage: python python_kw_giver.py OUT.json
"""
import hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
FORMS = ("def {w}(): pass", "class {w}: pass", "{w} = 0", "def f({w}): pass")

ENGINE_SRC = r'''
import json, sys, keyword, builtins
forms = %r
def refused(w):
    out = []
    for f in forms:
        try:
            compile(f.format(w=w), "<probe>", "exec"); out.append(False)
        except SyntaxError:
            out.append(True)
    return out
words = json.loads(sys.stdin.read())
print(json.dumps({
    "version": sys.version, "implementation": sys.implementation.name,
    "kwlist": list(keyword.kwlist), "softkwlist": list(keyword.softkwlist),
    "builtins": sorted(dir(builtins)), "stdlib": sorted(sys.stdlib_module_names),
    "probe": {w: refused(w) for w in words},
}))
''' % (list(FORMS),)

SITE_SRC = "import json,builtins;print(json.dumps(sorted(dir(builtins))))"


def run_engine(words):
    r = subprocess.run([sys.executable, "-I", "-S", "-c", ENGINE_SRC], input=json.dumps(sorted(words)), capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError("engine probe failed: " + r.stderr[-400:])
    site = subprocess.run([sys.executable, "-I", "-c", SITE_SRC], capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout), (json.loads(site.stdout) if site.returncode == 0 else None)


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def parse(parser, src):
    tree = parser.parse(src.encode("utf8"))
    root = tree.root_node
    bad = any(x.type == "ERROR" or x.is_missing for x in walk(root))
    return root, bad


def main():
    out = sys.argv[1]
    g = gold.resolve("python")
    parser, lang = gold.load(g)

    # ---- GRAMMAR: anonymous word kinds ---------------------------------------------------------------------------------
    anon, kinds = set(), []
    for i in range(lang.node_kind_count):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        named = lang.node_kind_is_named(i)
        kinds.append((k, named))
        if not named and WORD.match(k):
            anon.add(k)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()

    # ---- ENGINE ----------------------------------------------------------------------------------------------------------
    # words to probe: the grammar's anonymous words plus every word the engine itself lists (so a word only the engine
    # reserves is seen too; the grammar probe below decides whether the grammar gives it a dedicated terminal)
    eng0, _ = run_engine(sorted(anon))
    probe_words = sorted(anon | set(eng0["kwlist"]) | set(eng0["softkwlist"]))
    eng, site_builtins = run_engine(probe_words)
    refused = {w for w, forms in eng["probe"].items() if all(forms)}

    # ---- GRAMMAR: dedicated named terminal for words that are not anonymous kinds ---------------------------------------
    literal_terminals = {}
    for w in sorted(set(probe_words) - anon):
        root, bad = parse(parser, f"x = {w}\n")
        if bad:
            continue
        asg = next((n for n in walk(root) if n.type == "assignment"), None)
        right = asg.child_by_field_name("right") if asg else None
        if right is not None and right.is_named and right.child_count == 0 and right.type != "identifier" and right.text.decode("utf8") == w:
            literal_terminals[w] = right.type

    grammar_words = sorted(anon | set(literal_terminals))
    hard = sorted(set(grammar_words) & refused)
    soft = sorted((set(grammar_words) - refused) | set(eng["softkwlist"]))

    # ---- checks K1..K4 (declared in the header) -------------------------------------------------------------------------
    kw = set(eng["kwlist"])
    k1 = {"pass": set(hard) == kw and len(hard) == 35, "hard": len(hard), "engineKwlist": len(kw),
          "grammarOnly": sorted(set(hard) - kw), "engineOnly": sorted(kw - set(hard))}
    k2_rows = {w: [not x for x in eng["probe"][w]] for w in soft if w in eng["probe"]}
    k2 = {"pass": all(all(v) for v in k2_rows.values()) and len(k2_rows) == len(soft), "soft": soft, "declarable": k2_rows}
    k3 = {"pass": all(all(eng["probe"][w]) for w in hard), "hard": len(hard)}
    lenient = []
    for w in sorted(set(hard)):
        root, bad = parse(parser, f"def {w}(): pass\n")
        if not bad:
            lenient.append(w)
    k4 = {"engineReservedWordsGrammarAcceptsAsDefName": lenient, "n": len(lenient), "prediction_gt_0_held": len(lenient) > 0}
    engine_refused_not_grammar = sorted(refused - set(grammar_words))

    stdlib_all = eng["stdlib"]
    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "python",
        "giver": {
            "resource": "tree-sitter grammar for python (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by CPython (the language engine) for reservedness, softness, builtins and stdlib",
            "engine": {"implementation": eng["implementation"], "version": eng["version"].split()[0], "full": eng["version"], "mode": "python -I -S (isolated, no site)"},
            "note": "Derived, never hand-typed (python_kw_giver.py): hard = grammar word tokens U grammar dedicated literal terminals, INTERSECT the words the engine's compile() refuses as def/class/assign/param names; soft = grammar word tokens the engine does not refuse U keyword.softkwlist; builtins = dir(builtins) and stdlib = sys.stdlib_module_names of the isolated engine. Semantics stay in the engine.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": eng["builtins"],
        "lexicon": {"stdlibModules": stdlib_all},
        "derivation": {
            "grammar": {
                "name": "python", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-python", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": sorted(anon), "dedicatedLiteralTerminals": literal_terminals,
                "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (c0_grammar_keywords.py rule) + dedicated named terminal probe `x = <word>` for engine-reserved words that are not anonymous kinds",
            },
            "engineProbeForms": list(FORMS),
            "engineRefused": sorted(refused),
            "engineKwlist": eng["kwlist"], "engineSoftkwlist": eng["softkwlist"],
            "engineRefusedButNotGrammarToken": engine_refused_not_grammar,
            "grammarWordsEngineDoesNotRefuse": sorted(set(grammar_words) - refused),
            "softSources": {w: sorted(([s for s, ok in (("grammar", w in grammar_words), ("engine", w in eng["softkwlist"])) if ok])) for w in soft},
            "siteAddedBuiltins": sorted(set(site_builtins or []) - set(eng["builtins"])) if site_builtins else None,
            "disagreement": {"grammarOnlyHard": k1["grammarOnly"], "engineOnlyHard": k1["engineOnly"]},
            "checks": {"K1": k1, "K2": k2, "K3": k3, "K4": k4},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(eng["builtins"]), "stdlibModules": len(stdlib_all)},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": soft, "K1": k1["pass"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient),
                      "grammarOnly": k1["grammarOnly"], "engineOnly": k1["engineOnly"], "engineRefusedNotGrammar": engine_refused_not_grammar,
                      "literalTerminals": literal_terminals, "engine": eng["version"].split()[0]}))


if __name__ == "__main__":
    main()
