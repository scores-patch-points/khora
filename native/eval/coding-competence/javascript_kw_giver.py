#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
javascript_kw_giver.py: the GIVER step of priors/code-kw-javascript.json (CodeKeywordPrior@1).

It is the JavaScript twin of python_kw_giver.py: same shape, same disclosure discipline, different engine. It reads the CLOSED
CLASSES of the JavaScript language off two authorities and writes them as a LanguageLawPrior@1-shaped JSON (the input shape that the
EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed and nothing is
counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for javascript, loaded through tree-sitter-language-pack (the authority
     gold.py uses). Rule, one for every language (the c0_grammar_keywords.py rule): every ANONYMOUS visible node kind that looks like a
     word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/, is a word token the grammar recognises somewhere. Plus a probe for the words the grammar gives a
     DEDICATED named terminal rather than an anonymous token: for every NAMED visible node kind that looks like a word, parse
     `x = <kind>;` and keep it iff the right-hand side is a leaf, named, not `identifier`, with text == the kind (that is how this,
     super, null, true, false and undefined enter: the grammar names them `this`, `super`, `null`, `true`, `false`, `undefined`).
  ENGINE (the arbiter of RESERVEDNESS): V8, through node (`node --experimental-vm-modules`), by COMPILE PROBES that execute nothing
     (`new vm.Script(src)` and `new vm.SourceTextModule(src)` only parse; a fixed probe string with the candidate word substituted):
       forms    var W;   function W(){}   W = 0;   function f(W){}
       goals    sloppy script, strict script (a "use strict" prologue), ES module
     A word is REFUSED in a goal iff ALL four forms raise SyntaxError in that goal. The engine's builtins are
     Object.getOwnPropertyNames(globalThis) of a FRESH vm context (the ECMAScript globals plus what V8 itself installs: console,
     WebAssembly, escape, unescape...; node's own host globals such as process, Buffer, require are excluded and counted).
  WHY BOTH. The grammar alone cannot say which words are reserved: tree-sitter lexes by parse state and its `identifier` rule swallows
     keywords where an identifier is allowed (K4 measures this: the grammar accepts most reserved words as a binding name). The engine
     alone cannot say which words the GRAMMAR (the reader's own lexer authority) gives a token, and V8 exposes no keyword list. The prior
     keeps what both agree on as HARD, in the strongest sense a code reader can use:
        hard = (grammar word tokens U grammar dedicated literal terminals)  INTERSECT  refused by V8 in the SLOPPY goal
     (a word refused in the sloppy goal is refused in every goal: strict code and modules only add restrictions).
        soft = (grammar word tokens U dedicated terminals) that V8 does NOT refuse in the sloppy goal
     Words reserved only in strict code (let, static, yield) or only in modules (await) are therefore SOFT (a sloppy script may declare
     them: `var let`), and are listed apart in derivation.contextualReservation, never refused. Hard words REFUSE (cannot name a
     binding); soft words and builtins are recorded and NEVER refuse (S83 polarity).
  A JAVASCRIPT-SPECIFIC LIMIT, stated here and measured in build-javascript-priors.mjs (R1m, R4b): "cannot name a being" holds for a
     BINDING (variable, function, class, parameter, label). A hard word CAN be a property or method name (`p.catch(f)`, `class A {
     delete() {} }`, `{default: 1}`), because the grammar's property_identifier is not an identifier. The prior is a refusal law for
     binding positions only; the file records this in its provenance.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  Disclosed exploratory reads that happened before this header was written (nothing else was looked at):
    (e1) the grammar's visible node kinds (gold.load + node_kind_for_id): 43 anonymous word kinds in javascript, 73 in typescript;
         the named word-shaped kinds; and that `x = this/super/null/true/false/undefined;` each parse to a dedicated leaf.
    (e2) V8 compile probes of ~40 words on the four forms in the sloppy and strict goals, and of 11 words in the module goal. They showed
         (and so K2/K3 below are confirmatory): enum, this, null, true, false, super, debugger, instanceof, typeof, delete, default, catch,
         finally, class refused in every goal; let, static, yield refused only in strict code; await only in modules; async, of, from,
         get, set, as, target, meta, using, undefined accepted everywhere; implements, interface, package, private, protected, public
         refused in strict code only; no word was refused on only some of the four forms.
    (e3) that tree-sitter-javascript parses `var if;`, `var class;`, `var this;` with no ERROR node (K4 is therefore expected to be large).
    (e4) esprima 4.0.1 (python) scanner keyword tables, as the independent cross-giver for K1.
    (e5) the contents of the older priors/code-kw-js.json (43 words, grammar-derived by an earlier builder): it lists get, set, of, from,
         meta, target, static, using, as, async, await, let, yield as hard and lists none of this, super, null, true, false.
  K1 cross-giver agreement (esprima 4.0.1, an independent ECMAScript scanner that is NOT the engine and NOT the grammar). reserved_by_esprima
     = the words of the probe vocabulary whose first token under esprima.tokenize is Keyword, Boolean or Null. Pass iff every word in the
     symmetric difference (hard xor reserved_by_esprima) is EXPLAINED by a recorded derivation fact: (a) not a word the JS grammar gives a
     token (engine-refused but not a grammar token), or (b) reserved only in strict code per V8. Expected: exactly {enum, let, yield}: enum
     is ES-reserved but is a TypeScript token, not a javascript one; let and yield are strict-only reserved. Anything unexplained fails.
  K2 declarability. Every SOFT word compiles as a var name, a function name, an assignment target and a parameter name in the sloppy goal,
     and no word is refused on only some forms (mixed = empty). Pass: both. Expected: pass.
  K3 arbiter consistency. Every HARD word is refused on all four forms in ALL THREE goals (sloppy, strict, module). Pass: every hard word.
     Expected: pass; expected hard size 35 (30 anonymous word tokens + this, super, null, true, false); a different size is reported, not
     a failure.
  K4 why the engine arbitrates (informational with a prediction). The number of V8-refused grammar words that the GRAMMAR itself parses
     cleanly as a binding name (`var W;`, no ERROR or MISSING). Prediction: > 0, and large (>= 20). If it is 0 the stated reason
     (tree-sitter's state-dependent lexing) is wrong and this file's WHY BOTH paragraph must be withdrawn.
  The prior-vs-incumbent (K5), word-rule control (K6), name-prior (N1..N6) and witness (R1..R5) predictions are pre-registered in the
  header of build-javascript-priors.mjs, which consumes this file's output.

GRAMMAR VERSION (typed gap, disclosed, same as python_kw_giver.py): the installed language pack records neither the upstream commit nor
a semantic version for its javascript grammar (Language.semantic_version is None). The prior records the PACK version, the sha256 of the
compiled grammar library, the ABI version, the upstream repository URL, and a fingerprint of the grammar's node-kind table; the upstream
commit is null (unrecorded), not guessed.

usage: python javascript_kw_giver.py OUT.json
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
FORMS = ("var {w};", "function {w}(){{}}", "{w} = 0;", "function f({w}){{}}")
GOALS = ("sloppy", "strict", "module")
NODE = os.environ.get("NODE") or shutil.which("node") or "node"

ENGINE_SRC = r'''
const vm = require("vm"), fs = require("fs");
const forms = %s;
const words = JSON.parse(fs.readFileSync(0, "utf8"));
const haveModule = typeof vm.SourceTextModule === "function";
function compiles(goal, src) {
  try {
    if (goal === "module") { if (!haveModule) return null; new vm.SourceTextModule(src, { identifier: "probe" }); }
    else new vm.Script(goal === "strict" ? '"use strict";' + src : src, { filename: "probe" });
    return true;
  } catch (e) { return e && e.name === "SyntaxError" ? false : "error:" + String(e && e.message).slice(0, 80); }
}
const probe = {};
for (const w of words) {
  probe[w] = {};
  for (const goal of ["sloppy", "strict", "module"]) probe[w][goal] = forms.map((f) => compiles(goal, f.split("{w}").join(w)));
}
const fresh = vm.createContext({});
const builtins = vm.runInContext("Object.getOwnPropertyNames(globalThis)", fresh).slice().sort();
const hostOnly = Object.getOwnPropertyNames(globalThis).filter((n) => !builtins.includes(n)).sort();
process.stdout.write(JSON.stringify({ node: process.version, v8: process.versions.v8, haveModule, builtins, hostOnlyCount: hostOnly.length, probe }));
''' % (json.dumps([f.replace("{{", "{").replace("}}", "}") for f in FORMS]),)


def run_engine(words):
    r = subprocess.run([NODE, "--experimental-vm-modules", "--no-warnings", "-e", ENGINE_SRC], input=json.dumps(sorted(words)), capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError("engine probe failed: " + r.stderr[-400:])
    return json.loads(r.stdout)


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def parse(parser, src):
    root = parser.parse(src.encode("utf8")).root_node
    return root, any(x.type == "ERROR" or x.is_missing for x in walk(root))


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


def refused_in(probe_w, goal):
    v = probe_w[goal]
    return all(x is False for x in v)


def accepted_in(probe_w, goal):
    v = probe_w[goal]
    return all(x is True for x in v)


def main():
    out = sys.argv[1]
    g = gold.resolve("javascript")
    parser, lang = gold.load(g)
    anon, named_word, kinds = kinds_of(lang)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()

    # sibling grammar (typescript) as the PROBE VOCABULARY ONLY: words the engine is asked about that the javascript grammar has no token for
    ts_anon = set()
    try:
        tparser, tlang = gold.load(gold.resolve("typescript"))
        ts_anon, _, _ = kinds_of(tlang)
    except Exception:  # typed gap, never silent
        ts_anon = set()

    # ---- GRAMMAR: dedicated named terminals ------------------------------------------------------------------------------
    literal_terminals = {}
    for w in sorted(named_word):
        root, bad = parse(parser, f"x = {w};\n")
        if bad:
            continue
        asg = next((n for n in walk(root) if n.type == "assignment_expression"), None)
        right = asg.child_by_field_name("right") if asg else None
        if right is not None and right.is_named and right.child_count == 0 and right.type != "identifier" and right.text.decode("utf8") == w:
            literal_terminals[w] = right.type
    grammar_words = sorted(anon | set(literal_terminals))

    # ---- ENGINE ---------------------------------------------------------------------------------------------------------
    vocabulary = sorted(set(grammar_words) | ts_anon)
    eng = run_engine(vocabulary)
    probe = eng["probe"]
    engine_errors = {w: p for w, p in probe.items() if any(isinstance(x, str) for goal in GOALS for x in p[goal])}
    refused_sloppy = {w for w in vocabulary if refused_in(probe[w], "sloppy")}
    mixed = sorted(w for w in vocabulary if not refused_in(probe[w], "sloppy") and not accepted_in(probe[w], "sloppy"))
    strict_reserved = sorted(w for w in vocabulary if w not in refused_sloppy and refused_in(probe[w], "strict"))
    module_reserved = sorted(w for w in vocabulary if not refused_in(probe[w], "strict") and w not in refused_sloppy and eng["haveModule"] and refused_in(probe[w], "module"))

    hard = sorted(set(grammar_words) & refused_sloppy)
    soft = sorted(set(grammar_words) - refused_sloppy)
    engine_refused_not_grammar = sorted(refused_sloppy - set(grammar_words))
    strict_reserved_not_grammar = sorted(set(strict_reserved) - set(grammar_words))

    # ---- esprima (K1's independent cross-giver) -------------------------------------------------------------------------
    esp = {}
    try:
        import esprima
        for w in vocabulary:
            try:
                t = esprima.tokenize(w)
                esp[w] = t[0].type if t else None
            except Exception:
                esp[w] = None
        esprima_version = esprima.version
    except Exception:
        esprima_version = None
    esp_reserved = sorted(w for w, t in esp.items() if t in ("Keyword", "Boolean", "Null"))

    # ---- checks K1..K4 (declared in the header) -------------------------------------------------------------------------
    sym = sorted(set(hard) ^ set(esp_reserved)) if esprima_version else None
    explained, unexplained = {}, []
    for w in (sym or []):
        if w in esp_reserved and w not in hard:
            if w not in grammar_words:
                explained[w] = "esprima-reserved; the javascript grammar has no token for it (V8 refuses it in the sloppy goal)" if w in refused_sloppy else "esprima-reserved; not a javascript grammar token"
            elif w in strict_reserved:
                explained[w] = "esprima-reserved; V8 reserves it only in strict code (a sloppy script may declare it)"
            elif w in module_reserved:
                explained[w] = "esprima-reserved; V8 reserves it only in modules"
            else:
                unexplained.append(w)
        else:
            unexplained.append(w)
    k1 = {"pass": esprima_version is not None and not unexplained, "esprima": esprima_version, "esprimaReserved": esp_reserved, "symmetricDifference": sym, "explained": explained, "unexplained": unexplained,
          "predictedExplained": ["enum", "let", "yield"], "explainedAsPredicted": sorted(explained) == ["enum", "let", "yield"]}
    k2_rows = {w: [x is True for x in probe[w]["sloppy"]] for w in soft}
    k2 = {"pass": not mixed and all(all(v) for v in k2_rows.values()), "soft": soft, "mixed": mixed, "declarable": k2_rows}
    k3 = {"pass": bool(hard) and all(refused_in(probe[w], gl) for w in hard for gl in GOALS if gl != "module" or eng["haveModule"]), "hard": len(hard), "moduleGoalProbed": eng["haveModule"],
          "predictedSize": 35, "sizeAsPredicted": len(hard) == 35}
    lenient = []
    for w in hard:
        root, bad = parse(parser, f"var {w};\n")
        if not bad:
            lenient.append(w)
    k4 = {"engineReservedWordsGrammarAcceptsAsBindingName": lenient, "n": len(lenient), "of": len(hard), "prediction_ge_20_held": len(lenient) >= 20}

    soft_sources = {}
    for w in soft:
        s = []
        if w in anon:
            s.append("grammar:anonymous-word-token")
        if w in literal_terminals:
            s.append(f"grammar:dedicated-terminal:{literal_terminals[w]}")
        if w in strict_reserved:
            s.append("engine:reserved-only-in-strict-code")
        if w in module_reserved:
            s.append("engine:reserved-only-in-modules")
        s.append("engine:accepted-as-binding-name-in-sloppy-script")
        soft_sources[w] = s

    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "javascript",
        "giver": {
            "resource": "tree-sitter grammar for javascript (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by V8 (the language engine, via node %s, compile probes that execute nothing) for reservedness, softness and builtins" % eng["node"],
            "engine": {"implementation": "v8", "version": eng["v8"], "node": eng["node"], "mode": "node --experimental-vm-modules: vm.Script (sloppy, strict) and vm.SourceTextModule (module) compile probes; nothing executed"},
            "note": "Derived, never hand-typed (javascript_kw_giver.py): hard = (grammar word tokens U grammar dedicated literal terminals) INTERSECT the words V8's compiler refuses as var/function/assignment/parameter names in the sloppy goal (so refused in every goal); soft = the grammar words V8 does not refuse (incl. the strict-only let/static/yield and the module-only await); builtins = Object.getOwnPropertyNames(globalThis) of a fresh vm context. Hard words refuse BINDING names only: a property or method may be named by a reserved word. Semantics stay in the engine.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": eng["builtins"],
        "lexicon": {"stdlibModules": []},
        "derivation": {
            "grammar": {
                "name": "javascript", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-javascript", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": sorted(anon), "dedicatedLiteralTerminals": literal_terminals,
                "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (c0_grammar_keywords.py rule) + dedicated named terminal probe `x = <kind>;` for every named word-shaped kind",
            },
            "engineProbeForms": [f.replace("{{", "{").replace("}}", "}") for f in FORMS], "engineGoals": list(GOALS), "engineModuleGoalProbed": eng["haveModule"],
            "probeVocabulary": {"size": len(vocabulary), "source": "javascript grammar words + dedicated terminals + the anonymous word kinds of the sibling typescript grammar (probe vocabulary only: a TypeScript-only word enters the prior never)", "typescriptSiblingWords": len(ts_anon)},
            "engineRefusedSloppy": sorted(refused_sloppy),
            "contextualReservation": {"strictOnly": strict_reserved, "moduleOnly": module_reserved, "note": "reserved only in strict code / only in modules: legally declarable in a sloppy script, therefore soft (never refused)"},
            "engineRefusedButNotGrammarToken": engine_refused_not_grammar,
            "strictReservedButNotGrammarToken": strict_reserved_not_grammar,
            "grammarWordsEngineDoesNotRefuse": soft,
            "softSources": soft_sources,
            "mixedWords": mixed, "engineProbeErrors": engine_errors,
            "hostGlobalsExcluded": eng["hostOnlyCount"],
            "builtinsNote": "V8 fresh-context globals: the ECMAScript globals plus what V8 installs itself (console, WebAssembly, escape, unescape, SharedArrayBuffer...). Browser globals (window, document) and node host globals (process, Buffer, require) are absent by construction: a typed gap, harmless because builtins never refuse",
            "stdlibModules": {"status": "not_applicable", "reason": "ECMA-262 defines no standard-library module namespace; node's builtinModules are host-specific and are not recorded (a fix for a name that failed to resolve is a host question, not a language one)"},
            "bindingOnly": "a reserved word cannot name a binding (variable, function, class, parameter, label) but can be a property or method name; the hard set is a refusal law for binding positions only",
            "esprima": {"version": esprima_version, "tokenTypes": esp},
            "checks": {"K1": k1, "K2": k2, "K3": k3, "K4": k4},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(eng["builtins"]), "stdlibModules": 0},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": soft, "K1": k1["pass"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient),
                      "K1_explained": explained, "K1_unexplained": unexplained, "engineRefusedNotGrammar": engine_refused_not_grammar,
                      "strictReservedNotGrammar": strict_reserved_not_grammar, "literalTerminals": literal_terminals, "engine": eng["v8"], "node": eng["node"], "mixed": mixed}))


if __name__ == "__main__":
    main()
