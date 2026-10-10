#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
typescript_kw_giver.py: the GIVER step of priors/code-kw-typescript.json (CodeKeywordPrior@1).

WHAT THIS DOES. It reads the CLOSED CLASSES of TypeScript off two authorities and writes them as a LanguageLawPrior@1-shaped
JSON (the input shape scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed and
nothing is counted on any corpus (the same discipline as python_kw_giver.py, which this file mirrors; the language is data):

  GRAMMAR (the giver the mission names): the tree-sitter grammar for typescript, loaded through tree-sitter-language-pack (the
     authority gold.py uses). Rule, one for every language (the c0_grammar_keywords.py rule): every ANONYMOUS visible node kind
     that looks like a word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/, is a word token the grammar recognises somewhere. Plus, for every
     engine-table word that is NOT an anonymous kind, a probe: parse `x = <word>;` and keep the word iff the grammar gives it a
     DEDICATED named terminal (leaf, named, not `identifier`, text == the word): that is how true / false / null / this / super /
     undefined enter (the grammar names them `true`, `false`, `null`, `this`, `super`, `undefined`).
  ENGINE (the arbiter of RESERVEDNESS): the TypeScript compiler (the `typescript` npm package, Apache-2.0), loaded read-only from a
     copy already on this machine (typescript_engine_probe.mjs; nothing is installed or downloaded). Its scanner tables
     (ts.SyntaxKind ranges: reserved words, strict-mode future-reserved words, contextual keywords) give the KEYWORD POOL, and a
     COMPILE PROBE gives refusal: a word is REFUSED by the engine iff `function W() {}`, `class W {}`, `const W = 0;` and
     `function f(W) {}` ALL yield a diagnostic the control identifiers do not yield, in ES-module context (strict mode: the corpus is
     ES-module TypeScript). Three more forms ask whether the word may be a PROPERTY / METHOD name (IdentifierName): `class C { W() {} }`,
     `({ W: 0 })`, `x.W`. The engine's ES standard library (lib.esnext.d.ts) is read through the checker for BUILTINS.
  WHY BOTH. The grammar alone cannot say which words are reserved: tree-sitter lexes by parse state, and its token set carries
     contextual words (`get`, `set`, `of`, `from`, `as`, `type`, `declare`, `namespace`, `readonly`, `abstract`, ...) that are legal
     binding names. The engine alone cannot say which words the GRAMMAR (the reader's own lexer authority) gives a token. The prior keeps
     what the engine REFUSES as HARD and records the rest of the pool as SOFT (declarable):
        pool = grammar word tokens U grammar dedicated literal terminals U engine keyword table
        hard = pool words the engine refuses on ALL FOUR binding forms V1..V4
        soft = pool - hard                       (including words refused on only SOME forms, listed as `partiallyRefused`)
     Hard words REFUSE (cannot name a being); soft words and builtins are recorded and NEVER refuse (S83 polarity).
  SCOPE OF REFUSAL (a language fact the python prior does not need): TypeScript/JavaScript let a reserved word name a PROPERTY or METHOD
     (`map.delete(k)`, `{ default: 1 }`, `class C { new() {} }`). The hard set therefore refuses BINDING names only (function, class,
     const/let/var, parameter, type/interface/enum/namespace names); it must not refuse a token that sits in property position. The giver
     DERIVES that fact from the engine (K5) and writes it as `propertyNameDeclarable`; the assembling builder records it as the prior's
     `refusalScope`.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  DISCLOSED BEFORE THIS HEADER (nothing else was looked at): (1) the grammar's anonymous word node kinds were listed once
  (gold.load + node_kind_for_id): 73 kinds, none of them null/true/false/this/super/undefined (named nodes) and none of `package`;
  (2) the local TypeScript packages are 5.6.3 (n8n's, Apache-2.0) and 4.2.4 (jupyter's, Apache-2.0); their SyntaxKind range
  boundaries were printed (5.6.3: reserved 83..118 = 36 words, future-reserved 119..127 = 9 words, contextual 128..165). No probe has
  been run, no result seen.
  PRIMARY ENGINE = the highest local version; the older local version is the cross-check (K6).
  K1 giver agreement. hard == the engine's own scanner ranges reserved U futureReserved (36 + 9 = 45 words on 5.6.3). Pass: symmetric
     difference empty. Expected: pass, with the nine strict-mode words (implements interface let package private protected public static
     yield) refused because the probe is an ES module. A disagreement is the FINDING (listed in derivation.disagreement), never
     fixed by editing a list. `package` is in the pool through the ENGINE table only (the grammar has no token for it): engine-only
     hard words are listed in derivation.hardFromEngineOnly.
  K2 declarability of the contextual keywords. No engine-CONTEXTUAL keyword (range 128..165: abstract, any, as, asserts, async,
     await, ... of, ...) is in the hard set. Pass: none is. Expected: pass; words refused on SOME but not all forms (the predefined
     type names are refused as a CLASS name, `await` at module top level) are listed in derivation.partiallyRefused (informational).
  K3 the probe is not blind. Every control identifier is accepted on all seven forms (no diagnostics), and `class` is refused on all four
     binding forms. Pass: both. (Guards the probe forms: a probe that refused nothing would also "agree" with an empty set.)
  K4 why the engine arbitrates (informational, no pass rule). The number of engine-hard words the GRAMMAR parses cleanly as a
     function name (`function W() {}` with no ERROR/MISSING). Prediction: > 0. If it is 0 the stated reason (tree-sitter's
     state-dependent lexing) is wrong and the WHY BOTH paragraph above must be withdrawn.
  K5 property-name declarability. Every hard word is accepted (no new diagnostic) on all three property forms P1..P3. Pass: all hard
     words. Expected: pass (IdentifierName admits reserved words). A word that fails is listed: it would REFUSE in property position too.
  K6 cross-engine agreement (control for the arbiter: the answer must not be an accident of one compiler version). The hard set
     derived with the older local engine (over the same pool) equals the primary engine's. Pass: symmetric difference empty. Expected:
     pass. A difference is reported as engine drift (a finding), not reconciled.
  K7 word-rule control built to fail (II.23). The word rule (c0_grammar_keywords.py rule, run UNMODIFIED) applied to the python, go,
     ruby, c and java grammars gives candidate sets whose symmetric difference with the typescript hard set is >= 10 for EVERY one of
     them. Pass: all five. (A rule that returned the typescript list for any grammar would be broken.)
  K8 the arbiter moves the statistic (control). The grammar word tokens that the engine does NOT refuse number >= 20 (the contextual
     tokens). Pass: >= 20. If the grammar word rule alone already equalled the hard set the engine would add nothing.
  K9 (informational, prediction >= 8, no pass rule). The hard words of the older priors/code-kw-js.json that the engine says are
     DECLARABLE (accepted on at least one binding form): what a refusal gate built from the javascript grammar's word rule would wrongly
     refuse. Prediction: >= 8 (as, async, await, from, get, meta, of, set, target, using).
  The name-prior predictions (N*) and the TRAIN-witness predictions (R*) are pre-registered in the header of build-typescript-priors.mjs,
  which consumes this file's output.

FIRST FULL RUN (2026-10-06, TypeScript 5.6.3 primary, 4.2.4 cross-check; reported as run, not tuned afterwards).
  K1 FAILED: hard = 44, not 45. The one word the scanner ranges list as reserved but the all-four-forms rule does not return is `this`: it is refused
  as a function, class and const name, but ACCEPTED on V4 `function f(this) {}` (TypeScript's explicit `this` PARAMETER, a type-annotation device that
  binds nothing). It therefore lands in the soft set and is listed in derivation.partiallyRefused. The rule was NOT changed and the set was NOT edited;
  a rule that treats the `this` parameter as a non-binding is a proposal for the owner (see the report), not an amendment made here.
  K2 K3 K5 K6 K7 K8 passed; K4 = 44 of 44 hard words parse cleanly as a function name in the grammar (the grammar cannot arbitrate: the WHY BOTH reason
  holds); K9 = 10; hardFromEngineOnly = [package].
  AMENDMENT 1 (made AFTER that run; informational only, no hard/soft decision, K3 or K5 reads it). The first run's R4 witness (build-typescript-priors.mjs)
  found `default` typed `identifier` in `export { default as X } from "./X.svelte"`: a MODULE EXPORT NAME, which is neither a binding nor a property.
  Two forms were added to the engine probe, P4 `import { W as y } from "m"` and P5 `export { x as W }`, and the result is written as
  moduleSpecifierNameDeclarable and K5b so that the refusal scope is derived from the engine, not from one corpus file. K3 is still computed over the
  seven original forms (the P4 control identifiers yield a "cannot find module" baseline diagnostic by construction).

GRAMMAR VERSION (typed gap, disclosed): the installed language pack records neither the upstream commit nor a semantic version for its
typescript grammar (Language.semantic_version is None). The prior therefore records the PACK version, the sha256 of the compiled grammar
library, the ABI version, the upstream repository URL, and a fingerprint of the grammar's node-kind table; the upstream commit is `null`.

usage: python typescript_kw_giver.py OUT.json
env:   TS_ENGINE_DIR  os.pathsep-separated directories holding a `typescript` package (default: the two local copies named above)
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

LANGUAGE = "typescript"
WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
VALUE_FORMS = ("V1", "V2", "V3", "V4")
PROP_FORMS = ("P1", "P2", "P3")
SPEC_FORMS = ("P4", "P5")  # AMENDMENT 1: module export-name forms, informational (not read by any hard/soft decision, K3 or K5)
ORIGINAL_FORMS = VALUE_FORMS + PROP_FORMS
CONTROLS = ["zq9wv", "foo", "Bar"]
DEFAULT_ENGINES = ["/opt/homebrew/lib/node_modules/n8n/node_modules/typescript", "/Users/mlacy/Documents/jupyter/node_modules/typescript"]
NATIVE = os.path.abspath(os.path.join(HERE, "..", ".."))


def vkey(v):
    return tuple(int(x) if x.isdigit() else 0 for x in re.split(r"[.\-]", v))


def engines():
    dirs = [d for d in (os.environ.get("TS_ENGINE_DIR") or os.pathsep.join(DEFAULT_ENGINES)).split(os.pathsep) if d]
    found = []
    for d in dirs:
        p = os.path.join(d, "package.json")
        if os.path.exists(p) and os.path.exists(os.path.join(d, "lib", "typescript.js")):
            found.append((json.load(open(p))["version"], d))
    if not found:
        raise RuntimeError("no local typescript package found (set TS_ENGINE_DIR)")
    found.sort(key=lambda x: vkey(x[0]), reverse=True)
    return found


def run_probe(ts_dir, words):
    node = shutil.which("node")
    r = subprocess.run([node, os.path.join(HERE, "typescript_engine_probe.mjs")], input=json.dumps({"tsDir": ts_dir, "words": sorted(words), "controls": CONTROLS}),
                       capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError("engine probe failed: " + r.stderr[-600:])
    return json.loads(r.stdout)


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def parse(parser, src):
    tree = parser.parse(src.encode("utf8"))
    root = tree.root_node
    bad = any(x.type == "ERROR" or x.is_missing for x in walk(root))
    return root, bad


def refused_on(probe_row, forms):
    return [f for f in forms if probe_row[f]["codes"]]


def main():
    out = sys.argv[1]
    g = gold.resolve(LANGUAGE)
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

    # ---- ENGINE (primary + cross-check) ----------------------------------------------------------------------------------
    eng_list = engines()
    primary_dir = eng_list[0][1]
    older = next((e for e in eng_list[1:] if e[0] != eng_list[0][0]), None)
    eng = run_probe(primary_dir, anon)
    table = eng["tokenTable"]
    engine_words = {t["text"] for t in table}
    range_of = {t["text"]: t["range"] for t in table}

    # ---- GRAMMAR: dedicated named terminal for engine words that are not anonymous kinds -----------------------------------
    literal_terminals = {}
    for w in sorted(engine_words - anon):
        root, bad = parse(parser, f"x = {w};\n")
        if bad:
            continue
        asg = next((n for n in walk(root) if n.type == "assignment_expression"), None)
        right = asg.child_by_field_name("right") if asg else None
        if right is not None and right.is_named and right.child_count == 0 and right.type != "identifier" and right.text.decode("utf8") == w:
            literal_terminals[w] = right.type

    pool = sorted(anon | engine_words | set(literal_terminals))
    probe = eng["probe"]
    missing = [w for w in pool if w not in probe]
    if missing:  # words the engine table did not carry were not probed: probe them now
        extra = run_probe(primary_dir, set(pool))
        probe = extra["probe"]
        eng["probe"] = probe
    refused_all = {w for w in pool if len(refused_on(probe[w], VALUE_FORMS)) == len(VALUE_FORMS)}
    partial = {w: refused_on(probe[w], VALUE_FORMS) for w in pool if 0 < len(refused_on(probe[w], VALUE_FORMS)) < len(VALUE_FORMS)}
    hard = sorted(refused_all)
    soft = sorted(set(pool) - refused_all)

    # ---- checks K1..K9 (declared in the header) ------------------------------------------------------------------------------
    scanner_hard = {t["text"] for t in table if t["range"] in ("reserved", "futureReserved")}
    k1 = {"pass": set(hard) == scanner_hard, "hard": len(hard), "scannerReservedPlusFuture": len(scanner_hard),
          "hardNotInScannerRanges": sorted(set(hard) - scanner_hard), "scannerRangesNotHard": sorted(scanner_hard - set(hard))}
    contextual = {t["text"] for t in table if t["range"] == "contextual"}
    k2 = {"pass": not (contextual & set(hard)), "contextualInHard": sorted(contextual & set(hard)), "contextualWords": len(contextual),
          "partiallyRefused": {w: partial[w] for w in sorted(partial)}}
    k3 = {"pass": all(eng["controlOk"][f] for f in ORIGINAL_FORMS) and all(probe["class"][f]["codes"] for f in VALUE_FORMS) if "class" in probe else False,
          "controlOk": eng["controlOk"], "classRefusedOn": refused_on(probe["class"], VALUE_FORMS) if "class" in probe else None}
    lenient = []
    for w in hard:
        root, bad = parse(parser, f"function {w}() {{}}\n")
        if not bad:
            lenient.append(w)
    k4 = {"engineHardWordsGrammarAcceptsAsFunctionName": lenient, "n": len(lenient), "prediction_gt_0_held": len(lenient) > 0}
    prop_declarable = sorted(w for w in hard if not refused_on(probe[w], PROP_FORMS))
    k5 = {"pass": len(prop_declarable) == len(hard), "declarable": len(prop_declarable), "hard": len(hard),
          "refusedInPropertyPosition": {w: refused_on(probe[w], PROP_FORMS) for w in hard if refused_on(probe[w], PROP_FORMS)}}
    spec_declarable = sorted(w for w in hard if not refused_on(probe[w], SPEC_FORMS))
    k5b = {"informational": True, "forms": list(SPEC_FORMS), "declarable": len(spec_declarable), "hard": len(hard),
           "refused": {w: refused_on(probe[w], SPEC_FORMS) for w in hard if refused_on(probe[w], SPEC_FORMS)}, "controlOk": {f: eng["controlOk"][f] for f in SPEC_FORMS}}
    if older:
        eng_old = run_probe(older[1], set(pool))
        hard_old = sorted(w for w in pool if w in eng_old["probe"] and len(refused_on(eng_old["probe"][w], VALUE_FORMS)) == len(VALUE_FORMS))
        sd = sorted(set(hard) ^ set(hard_old))
        k6 = {"pass": not sd, "primary": eng_list[0][0], "crossCheck": older[0], "hardPrimary": len(hard), "hardCrossCheck": len(hard_old), "symmetricDifference": sd,
              "crossCheckControlOk": eng_old["controlOk"], "crossCheckEngine": eng_old["engine"]}
    else:
        k6 = {"pass": None, "gap": "only one local typescript engine version found: no cross-check possible"}
    grammar_not_refused = sorted(anon - refused_all)
    k8 = {"pass": len(grammar_not_refused) >= 20, "grammarWordTokens": len(anon), "grammarWordTokensEngineDoesNotRefuse": len(grammar_not_refused), "words": grammar_not_refused}
    hard_from_engine_only = sorted(w for w in hard if w not in anon and w not in literal_terminals)
    engine_refused_not_grammar_token = sorted(refused_all - anon)

    # K9 (informational): the older javascript prior's hard words that the engine says are declarable
    js = json.load(open(os.path.join(NATIVE, "priors", "code-kw-js.json")))
    js_over = sorted(w for w in js["keywords"] if w in probe and len(refused_on(probe[w], VALUE_FORMS)) < len(VALUE_FORMS))
    js_unknown = sorted(w for w in js["keywords"] if w not in probe)
    k9 = {"jsHardWords": len(js["keywords"]), "engineSaysDeclarable": js_over, "n": len(js_over), "notInTypescriptPool": js_unknown, "prediction_ge_8_held": len(js_over) >= 8}

    soft_sources = {w: sorted(s for s, ok in (("grammar", w in anon), ("grammarNamedTerminal", w in literal_terminals), ("engine:" + range_of.get(w, "-"), w in engine_words)) if ok) for w in soft}
    bt = eng["builtins"]
    builtins = sorted(set(bt["values"]) | set(bt["types"]))
    doc = {
        "schema": "LanguageLawPrior@1",
        "language": LANGUAGE,
        "giver": {
            "resource": f"tree-sitter grammar for typescript (tree-sitter-language-pack {gold_pack_version()}) for the word tokens, arbitrated by the TypeScript compiler {eng['engine']['version']} (the language engine) for reservedness, softness and builtins",
            "engine": {"implementation": "typescript", "version": eng["engine"]["version"], "license": eng["engine"]["license"], "package": "typescript (npm)", "path": eng["engine"]["tsDir"],
                       "typescriptJsSha256": eng["engine"]["typescriptJsSha256"], "mode": "ES-module probe (leading `export {};`), noLib, alwaysStrict, parse + bind + check only; nothing emitted or executed"},
            "note": "Derived, never hand-typed (typescript_kw_giver.py + typescript_engine_probe.mjs): pool = grammar word tokens U grammar dedicated literal terminals U the engine's scanner keyword table; hard = pool words the engine refuses as function/class/const/parameter names; soft = the rest of the pool; builtins = global symbols of the engine's ES library (lib.esnext.d.ts). Semantics stay in the engine.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": builtins,
        "lexicon": {"stdlibModules": []},
        "derivation": {
            "grammar": {
                "name": LANGUAGE, "package": "tree-sitter-language-pack", "packageVersion": gold_pack_version(), "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-typescript", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": sorted(anon), "dedicatedLiteralTerminals": literal_terminals,
                "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (c0_grammar_keywords.py rule) + dedicated named terminal probe `x = <word>;` for engine-table words that are not anonymous kinds",
            },
            "engineProbeForms": eng["forms"], "engineControls": CONTROLS, "engineRanges": eng["ranges"],
            "engineTokenTable": {t["text"]: t["range"] for t in table},
            "engineProbe": {w: {f: probe[w][f]["codes"] for f in list(ORIGINAL_FORMS) + list(SPEC_FORMS)} for w in pool},
            "engineProbeMessages": {w: next((probe[w][f]["msg"] for f in VALUE_FORMS if probe[w][f]["msg"]), None) for w in hard},
            "engineRefused": hard,
            "engineBuiltins": {"lib": bt["lib"], "libFiles": bt["libFiles"], "values": len(bt["values"]), "types": len(bt["types"]), "union": len(builtins),
                               "scope": "global symbols of the ECMAScript standard library only (lib.esnext.d.ts and the files it references); DOM / WebWorker / ScriptHost are host APIs, not the language"},
            "stdlibModules": "not_applicable: TypeScript has no engine-declared module list; module resolution is host-defined (node builtins live in @types/node, a separate giver). Typed gap, not an empty pass.",
            "propertyNameDeclarable": prop_declarable,
            "moduleSpecifierNameDeclarable": spec_declarable,
            "partiallyRefused": {w: partial[w] for w in sorted(partial)},
            "hardFromEngineOnly": hard_from_engine_only,
            "engineRefusedButNotGrammarToken": engine_refused_not_grammar_token,
            "grammarWordsEngineDoesNotRefuse": grammar_not_refused,
            "softSources": soft_sources,
            "disagreement": {"hardNotInScannerRanges": k1["hardNotInScannerRanges"], "scannerRangesNotHard": k1["scannerRangesNotHard"]},
            "checks": {"K1": k1, "K2": k2, "K3": k3, "K4": k4, "K5": k5, "K5b": k5b, "K6": k6, "K8": k8, "K9": k9},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(builtins), "stdlibModules": 0},
    }
    # K7 needs the other grammars' word rule: run c0_grammar_keywords.py (unmodified) on the control grammars
    ctl_out = out + ".k7-controls.json"
    ctl_langs = ["python", "go", "ruby", "c", "java"]
    subprocess.run([sys.executable, os.path.join(HERE, "c0_grammar_keywords.py"), ctl_out] + ctl_langs, check=True, capture_output=True, text=True, timeout=300)
    ctl = json.load(open(ctl_out))["languages"]
    k7 = {l: {"candidates": len(ctl[l]["keywords"]) if ctl[l].get("keywords") is not None else None,
              "symmetricDifferenceWithTypescriptHard": len(set(hard) ^ set(ctl[l]["keywords"])) if ctl[l].get("keywords") is not None else None, "error": ctl[l].get("error")} for l in ctl_langs}
    k7["pass"] = all((k7[l]["symmetricDifferenceWithTypescriptHard"] or -1) >= 10 for l in ctl_langs)
    doc["derivation"]["checks"]["K7"] = k7
    os.remove(ctl_out)
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": len(soft), "builtins": len(builtins), "K1": k1["pass"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient),
                      "K5": k5["pass"], "K6": k6.get("pass"), "K7": k7["pass"], "K8": k8["pass"], "K9_n": len(js_over),
                      "scannerRangesNotHard": k1["scannerRangesNotHard"], "hardNotInScannerRanges": k1["hardNotInScannerRanges"], "contextualInHard": k2["contextualInHard"],
                      "hardFromEngineOnly": hard_from_engine_only, "literalTerminals": literal_terminals, "engine": eng["engine"]["version"]}))


def gold_pack_version():
    try:
        from importlib.metadata import version
        return version("tree-sitter-language-pack")
    except Exception:
        return "unknown"


if __name__ == "__main__":
    main()
