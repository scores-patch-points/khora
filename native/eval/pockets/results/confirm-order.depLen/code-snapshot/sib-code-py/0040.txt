#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
java_kw_giver.py: the GIVER step of the java CodeKeywordPrior@1 (candidate for priors/code-kw-java.json).

WHAT THIS DOES. It reads the CLOSED CLASSES of the Java language off two authorities and writes them as a LanguageLawPrior@1-shaped
JSON (the input shape scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed in the prior and
nothing is counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for java, loaded through tree-sitter-language-pack (the authority
     gold.py uses). Rule, one for every language (the c0_grammar_keywords.py rule, with the leading [#@] dropped because a name cannot
     start with one): every ANONYMOUS visible node kind that looks like a word, /^[A-Za-z][A-Za-z0-9_]*$/, is a word token the grammar
     recognises somewhere. Plus, for every word of the ENGINE's own vocabulary (below) that is NOT an anonymous kind, a probe: parse the
     word in four slots with the grammar and keep the word iff the grammar gives it a DEDICATED named terminal (a leaf, named, not
     `identifier`/`type_identifier`, text == the word). That is how this / super / true / false / null / boolean / void enter (the grammar
     names them `this`, `super`, `true`, `false`, `null_literal`, `boolean_type`, `void_type`).
  ENGINE (the arbiter of RESERVEDNESS): javac, the Java language's own compiler, driven through javax.tools / com.sun.source.util.JavacTask
     by JavaKwProbe.java (run as a single-file source program under the same JDK). The engine contributes
        (i)   its own VOCABULARY: com.sun.tools.javac.parser.Tokens.TokenKind (every token with a fixed word) and the public Name fields
              of com.sun.tools.javac.util.Names (the compiler's own name table), both read by reflection, never typed here;
        (ii)  a COMPILE PROBE. A word is placed as the NAME of a being in seven positions: class, interface, enum, method, field, local
              variable, parameter (templates in JavaKwProbe.java). javac ACCEPTS the position iff the snippet raises no ERROR diagnostic
              (snippets are otherwise valid, so any error is the word's);
        (iii) `builtins` = the public top-level types of java.lang (JLS 7.3: java.lang.* is imported by every compilation unit), read from
              the JDK's own module image; `stdlibModules` = the unqualified exports of every system module (the packages `import` names).
     A word is REFUSED iff javac rejects it in ALL seven positions; PARTIAL (a restricted identifier) iff it accepts it in some and rejects
     it in others (e.g. a type name `var` is refused, a variable `var` is accepted); ACCEPTED iff it accepts it everywhere.
  WHY BOTH. The grammar alone cannot say which words are reserved: tree-sitter lexes by parse state (a keyword that is not valid in the
     current state may lex as an identifier). The engine alone cannot say which words the GRAMMAR (the reader's own lexer authority) gives
     a token. The prior keeps what both agree on as HARD and records the rest as SOFT (declarable):
        hard  = (grammar word tokens U grammar dedicated terminals)  INTERSECT  engine-refused
        soft  = (grammar word tokens the engine does not refuse) U (engine PARTIAL words)
     Hard words REFUSE (cannot name a being); soft words and builtins are recorded and NEVER refuse (S83 polarity). Java's contextual
     keywords (module-info words `exports module open opens provides requires to transitive uses with`, and `permits record sealed when
     yield var`) are legal names of beings in ordinary code and therefore SOFT, never hard.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned; failures are reported).
  DISCLOSED, SEEN BEFORE THIS HEADER (and nothing else): (a) priors/code-kw-java.json already exists (built by an earlier pass through
  scripts/build-code-keyword-prior.mjs from ethos/derived-priors/code-priors/java-language-law-prior-v1.json): 59 "hard" keywords which
  include the contextual words above; (b) the grammar's anonymous word-like kinds (60 incl. `@interface`, exactly that list plus nothing)
  and that the grammar has visible named kinds `this super true false null_literal void_type boolean_type`; (c) the javap member listing
  of javac's Tokens.TokenKind (50 keyword members + TRUE FALSE NULL UNDERSCORE, by name only, nothing probed); (d) the name gate's
  priors/code-ctx-java.json `settled` list (words learned from TRAIN as never-declared: it contains void this null boolean true false,
  exactly the words (a) lacks). No probe, no token, no TRAIN file had been looked at.
  K1 giver agreement. (a) hard is a subset of the engine's own token vocabulary E = {TokenKind words}: no word is hard on the grammar's say
     alone. (b) the engine-refused words the grammar does NOT give (engineRefusedButNotGrammarToken) number <= 3. Expected: exactly the two
     reserved-unused words {const, goto}; expected |hard| = 51 (50 JLS keywords minus const, goto, plus true false null). `_` is expected
     PARTIAL under JDK 25 (accepted as an unnamed local). A disagreement is the FINDING (derivation.disagreement), never fixed by editing.
  K2 declarability. Every SOFT word is accepted by javac in at least one position (consistency guard of the soft rule). Expected: pass; the
     soft set is expected to contain the fifteen contextual words in (a) and `var`, with a position matrix recorded for each.
  K3 the probe can fail (II.23, a control built to fail, with a licence check that the statistic MOVES). (a) every hard word is refused in
     7 of 7 positions (guards the templates); (b) authored plain identifiers (foo bar baz value name items x1 tmp Item result) are accepted in
     7 of 7 (the probe says "accept"); (c) the same words under a deliberately BROKEN template set are refused by javac in 7 of 7 for >= 99%
     of the vocabulary, and under a TRIVIAL template set (the word is not placed) refused for <= 1%. Pass: a, b, c all hold. Under (c) a
     probe that returned the real arm's answer regardless of template would be caught.
  K4 why the engine arbitrates (informational, no pass rule). The number of HARD words the grammar itself parses cleanly (no ERROR/MISSING)
     as a field name (`class A { int W; }`). Prediction: > 0 (tree-sitter's keyword extraction lexes a keyword that is invalid in the current
     state as an identifier). If it is 0 the stated reason is wrong and the WHY BOTH paragraph must be withdrawn.
  K5 cross-version witness. The same procedure under a second JDK (17.0.x) yields the SAME hard set. Expected: pass; the raw engine-refused sets
     are expected to differ by exactly {`_`} (a keyword before 22, an unnamed variable after). The difference is reported either way.
  K6/K7 and the name-prior and TRAIN-witness predictions are pre-registered in the header of build-java-priors.mjs, which consumes this file's
     output.

AMENDMENT A1 (written AFTER run 1, before run 2; disclosed, not hidden). Run 1 (kept as java-law-prior.run1-analyze-level.json beside the
  output) confirmed K1..K5 exactly as pre-registered (hard = 51, engine-only = {const, goto}, `_` partial and the only JDK 17/25 difference,
  K4 = 51 of 51 hard words parse cleanly as a field name in the grammar, K3 pass with 69 of 69 broken-template refusals and 0 of 69 trivial-
  template refusals). It ALSO exposed a defect in my own instrument that K2 could not see (K2 is a consistency guard and passed trivially): five
  words, clone finalize getClass hashCode toString, were listed PARTIAL (hence soft) because the METHOD template `class A { void W() {} }` collides
  with java.lang.Object's own methods (an override clash found in attribution), which is a SEMANTIC refusal of the signature, not a lexical
  refusal of the word. Those five are not closed-class words. Amendment: (1) the method template becomes `class A { void W(boolean p, boolean q) {} }`,
  a signature no member of Object has, so no override or clash can refuse the word; (2) the probe also records a PARSE-LEVEL column (JavacTask.parse(),
  syntax diagnostics only) so a word accepted by the parser and refused only in attribution is visible (`analyzeOnly`), and `probe` stays the
  analysis-level answer. No threshold, rule or prediction above changes. Prediction for run 2, written before it: PARTIAL = exactly the run-1
  PARTIAL set minus those five ( `_ permits record sealed var yield` ), the hard set is unchanged (51), and `analyzeOnly` is empty or contains no
  hard word. If run 2 differs, the difference is reported as a failure of this prediction.

GRAMMAR VERSION (typed gap, disclosed): the installed language pack records neither the upstream commit nor a semantic version for its java
grammar (Language.semantic_version is None; the pack manifest lists no per-language revision). The prior therefore records the PACK version, the
sha256 of the compiled grammar library, the ABI version, the upstream repository URL, and a fingerprint of the grammar's node-kind table; the
upstream commit is `null` (unrecorded), not guessed.

usage: python java_kw_giver.py OUT.json [--jdk HOME] [--jdk2 HOME]
"""
import hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

PROBE_JAVA = os.path.join(HERE, "JavaKwProbe.java")
JDK_PRIMARY = os.environ.get("JAVA_PRIMARY_HOME", "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home")
JDK_SECOND = os.environ.get("JAVA_SECOND_HOME", "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home")
TS_CACHE = os.environ.get("GOLD_TS_CACHE", "/private/tmp/claude-501/coding-competence/ts-cache")

WORD = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")          # a word that could be the name of a being
LOOSE_WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_-]*$")  # c0_grammar_keywords' loose rule, to list what the strict rule drops
# AUTHORED controls (labelled so: a test fixture, not a prior): plain identifiers javac must accept in every position
CONTROL_WORDS = ("foo", "bar", "baz", "value", "name", "items", "x1", "tmp", "Item", "result")
TERMINAL_TEMPLATES = (
    "class A { Object f() { return %W%; } }",
    "class A { Object f() { return %W%.x; } }",
    "class A { %W% f; }",
    "class A { %W% f() { } }",
)
NAME_TEMPLATE = "class A { int %W%; }"
LEAF_NOT_DEDICATED = ("identifier", "type_identifier")


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def parse(parser, src):
    tree = parser.parse(src.encode("utf8"))
    root = tree.root_node
    bad = any(x.type == "ERROR" or x.is_missing for x in walk(root))
    return root, bad


def java_cmd(jdk, flags):
    return [os.path.join(jdk, "bin", "java"),
            "--add-exports", "jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED",
            "--add-exports", "jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
            PROBE_JAVA, *flags]


def run_engine(jdk, words, mode="standard", inventory=False):
    flags = []
    if mode != "standard":
        flags.append("--" + mode)
    if inventory:
        flags.append("--inventory")
    r = subprocess.run(java_cmd(jdk, flags), input="\n".join(words) + "\n", capture_output=True, text=True, timeout=900)
    if r.returncode != 0:
        raise RuntimeError("engine probe failed (%s): %s" % (jdk, r.stderr[-600:]))
    return json.loads(r.stdout)


def main():
    argv = sys.argv[1:]
    out = argv[0]
    jdk = argv[argv.index("--jdk") + 1] if "--jdk" in argv else JDK_PRIMARY
    jdk2 = argv[argv.index("--jdk2") + 1] if "--jdk2" in argv else JDK_SECOND
    g = gold.resolve("java")
    parser, lang = gold.load(g)

    # ---- GRAMMAR: anonymous word kinds ---------------------------------------------------------------------------------
    anon, loose_only, kinds = set(), set(), []
    for i in range(lang.node_kind_count):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        named = lang.node_kind_is_named(i)
        kinds.append((k, named))
        if not named:
            if WORD.match(k):
                anon.add(k)
            elif LOOSE_WORD.match(k):
                loose_only.add(k)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()

    # ---- ENGINE (primary): vocabulary + probe over grammar words U controls U engine vocabulary --------------------------
    eng = run_engine(jdk, sorted(anon | set(CONTROL_WORDS)), inventory=True)
    positions = eng["positions"]
    probe = eng["probe"]                                   # word -> [accepted per position]
    vocab_tokens = sorted({t["name"] for t in eng["tokenKinds"] if t["name"] and re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", t["name"])})
    tok_keyword_words = sorted(set(vocab_tokens))
    refused = {w for w, row in probe.items() if not any(row)}
    partial = {w for w, row in probe.items() if any(row) and not all(row)}

    # ---- GRAMMAR: dedicated named terminal for engine-vocabulary words that are not anonymous kinds --------------------------
    literal_terminals = {}
    for w in sorted((refused | partial) - anon):
        if not re.match(r"^[A-Za-z][A-Za-z0-9_]*$", w):
            continue
        for tpl in TERMINAL_TEMPLATES:
            root, bad = parse(parser, tpl.replace("%W%", w))
            if bad:
                continue
            leaf = next((n for n in walk(root) if n.is_named and n.child_count == 0 and n.type not in LEAF_NOT_DEDICATED and n.text.decode("utf8") == w), None)
            if leaf is not None:
                literal_terminals[w] = leaf.type
                break

    grammar_words = sorted(anon | set(literal_terminals))
    gw = set(grammar_words)
    hard = sorted(gw & refused)
    soft_grammar = gw - refused
    soft = sorted(soft_grammar | (partial - set(hard)))
    soft_sources = {w: sorted(([s for s, ok in (("grammar", w in gw), ("engine-restricted", w in partial)) if ok])) for w in soft}
    engine_refused_not_grammar = sorted(refused - gw)

    # ---- controls for the probe (K3) --------------------------------------------------------------------------------------
    ctl_words = sorted(anon | set(CONTROL_WORDS))
    broken = run_engine(jdk, ctl_words, mode="broken")["probe"]
    trivial = run_engine(jdk, ctl_words, mode="trivial")["probe"]
    broken_refused_all = sum(1 for w in ctl_words if not any(broken[w]))
    trivial_refused_all = sum(1 for w in ctl_words if not any(trivial[w]))
    controls_ok = all(all(probe[w]) for w in CONTROL_WORDS)

    # ---- second JDK (K5) ---------------------------------------------------------------------------------------------------
    eng2 = None
    refused2 = partial2 = hard2 = None
    try:
        words2 = sorted(set(probe))
        eng2 = run_engine(jdk2, words2, inventory=True)
        refused2 = {w for w, row in eng2["probe"].items() if not any(row)}
        partial2 = {w for w, row in eng2["probe"].items() if any(row) and not all(row)}
        hard2 = sorted(gw & refused2)
    except Exception as e:  # typed gap, never silent
        eng2 = {"error": str(e)[:300]}

    # ---- checks K1..K5 (declared in the header) -------------------------------------------------------------------------
    E = set(tok_keyword_words)
    k1 = {
        "pass": set(hard) <= E and len(engine_refused_not_grammar) <= 3,
        "hard": len(hard), "hardNotInEngineTokenVocabulary": sorted(set(hard) - E),
        "engineRefusedButNotGrammarToken": engine_refused_not_grammar,
        "engineTokenWordsNotHard": sorted(E - set(hard)),
        "expected": {"hard": 51, "engineOnly": ["const", "goto"], "partial": ["_"]},
        "hardCountAsPredicted": len(hard) == 51,
    }
    k2_rows = {w: {"accepted": [p for p, ok in zip(positions, probe[w]) if ok]} for w in soft if w in probe}
    k2 = {"pass": all(len(v["accepted"]) >= 1 for v in k2_rows.values()) and len(k2_rows) == len(soft), "soft": soft, "acceptedPositions": k2_rows}
    k3 = {
        "pass": all(not any(probe[w]) for w in hard) and controls_ok and broken_refused_all >= 0.99 * len(ctl_words) and trivial_refused_all <= 0.01 * len(ctl_words),
        "hardRefusedEverywhere": all(not any(probe[w]) for w in hard), "controlsAcceptedEverywhere": controls_ok, "controlWords": list(CONTROL_WORDS),
        "controlsAre": "authored fixtures (plain identifiers); never data",
        "brokenTemplate": {"words": len(ctl_words), "refusedEverywhere": broken_refused_all}, "trivialTemplate": {"words": len(ctl_words), "refusedEverywhere": trivial_refused_all},
    }
    lenient = []
    for w in hard:
        root, bad = parse(parser, NAME_TEMPLATE.replace("%W%", w))
        if not bad:
            lenient.append(w)
    k4 = {"hardWordsGrammarAcceptsAsFieldName": lenient, "n": len(lenient), "of": len(hard), "prediction_gt_0_held": len(lenient) > 0}
    k5 = {"jdk2": (eng2 or {}).get("java"), "pass": hard2 is not None and hard2 == hard}
    if hard2 is not None:
        k5.update({"hardOnlyPrimary": sorted(set(hard) - set(hard2)), "hardOnlySecond": sorted(set(hard2) - set(hard)),
                   "engineRefusedDiff": sorted(refused ^ refused2), "partialDiff": sorted(partial ^ partial2)})
    else:
        k5["error"] = (eng2 or {}).get("error", "second JDK not run")

    # A1 cross-check: words the PARSER accepts in a position but ANALYSIS refuses (semantic, not lexical refusals), and the A1 prediction (K8)
    parse_probe = eng["parseProbe"]
    analyze_only = {w: [p for p, a, b in zip(positions, parse_probe[w], probe[w]) if a and not b] for w in sorted(probe)}
    analyze_only = {w: v for w, v in analyze_only.items() if v}
    parse_refused = {w for w, row in parse_probe.items() if not any(row)}
    parse_partial = {w for w, row in parse_probe.items() if any(row) and not all(row)}
    k8 = {
        "pass": set(partial) == {"_", "permits", "record", "sealed", "var", "yield"} and len(hard) == 51 and not (set(analyze_only) & set(hard)),
        "predictedPartial": ["_", "permits", "record", "sealed", "var", "yield"], "partial": sorted(partial),
        "hard": len(hard), "analyzeOnly": analyze_only, "analyzeOnlyHardWords": sorted(set(analyze_only) & set(hard)),
        "parseLevelRefused": len(parse_refused), "parseLevelRefusedEqualsAnalyzeLevel": parse_refused == refused,
        "parseLevelPartial": sorted(parse_partial), "note": "amendment A1 prediction (written before run 2); the parse-level columns are a cross-check, `probe` stays the analysis-level answer",
    }

    builtins = eng["builtins"]
    packages = eng["packages"]
    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "java",
        "giver": {
            "resource": "tree-sitter grammar for java (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by javac (the language engine, OpenJDK %s) for reservedness, restricted identifiers, java.lang builtins and the platform packages" % eng["java"]["version"],
            "engine": {"implementation": "javac (OpenJDK, jdk.compiler)", "version": eng["java"]["version"], "vendor": eng["java"]["vendor"], "vm": eng["java"]["vm"], "defaultRelease": eng["java"]["sourceVersionLatest"], "mode": "javax.tools.JavaCompiler -proc:none -Xlint:none, JavacTask.analyze()"},
            "note": "Derived, never hand-typed (java_kw_giver.py + JavaKwProbe.java): hard = grammar word tokens U grammar dedicated terminals, INTERSECT the words javac refuses as the name of a class, interface, enum, method, field, local variable and parameter in ALL seven positions; soft = grammar word tokens javac does not refuse U words javac accepts in some positions and refuses in others; builtins = the public top-level types of java.lang read from the JDK module image; stdlibModules = the unqualified exports of every system module (packages, the unit `import` names). Semantics stay in javac.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": builtins,
        "lexicon": {"stdlibModules": packages},
        "derivation": {
            "grammar": {
                "name": "java", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-java", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None; the pack manifest lists no per-language revision); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": sorted(anon), "anonymousKindsDroppedByWordRule": sorted(loose_only), "dedicatedLiteralTerminals": literal_terminals,
                "rule": "anonymous visible node kinds matching /^[A-Za-z][A-Za-z0-9_]*$/ + dedicated named terminal probe (4 slots) for engine-vocabulary words that are not anonymous kinds",
            },
            "engineProbePositions": positions, "engineProbeTemplates": eng["templates"],
            "engineVocabulary": {"tokenKindWords": tok_keyword_words, "namesTableWords": len(eng.get("namesTable", [])), "probedWords": len(probe), "namesTableError": eng.get("namesTableError")},
            "engineRefused": sorted(refused), "enginePartial": sorted(partial),
            "engineRefusedButNotGrammarToken": engine_refused_not_grammar,
            "grammarWordsEngineDoesNotRefuse": sorted(gw - refused),
            "softSources": soft_sources,
            "positionMatrix": {w: dict(zip(positions, probe[w])) for w in sorted(set(soft) | partial | set(engine_refused_not_grammar))},
            "secondJdk": {k: v for k, v in (eng2 or {}).items() if k in ("java", "error")},
            "disagreement": {"engineRefusedButNotGrammar": engine_refused_not_grammar, "hardNotInEngineTokenVocabulary": k1["hardNotInEngineTokenVocabulary"]},
            "checks": {"K1": k1, "K2": k2, "K3": k3, "K4": k4, "K5": k5, "K8": k8},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(builtins), "stdlibModules": len(packages)},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": soft, "K1": k1["pass"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient), "K5": k5["pass"], "K8": k8["pass"], "analyzeOnly": analyze_only,
                      "engineRefusedNotGrammar": engine_refused_not_grammar, "literalTerminals": literal_terminals, "engine": eng["java"]["version"],
                      "builtins": len(builtins), "packages": len(packages)}))


if __name__ == "__main__":
    main()
