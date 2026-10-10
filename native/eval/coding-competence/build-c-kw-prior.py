#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-c-kw-prior.py : the received CodeKeywordPrior@1 for the C programming language, DERIVED from its givers.
(khora / Lovelace, Coding Capability Circle.  Zero model: no LLM is called here or in any check of this prior.)

WHY A NEW FILE. priors/code-kw-c.json already exists (an earlier build by scripts/build-code-keyword-prior.mjs from the
ethos LanguageLawPrior@1; 38 words, grammar named generically, no version/URL).  Rule 10 forbids editing existing priors,
so this builder writes a SIBLING, priors/code-kw-c-grammar.json.  Swapping it in (cp) is the main agent's decision; the
consequences of the swap are reported by eval/coding-competence/verify-c-priors.mjs.

GIVERS (rule 3; every list below is a projection of a giver, never hand-typed):
  G1  the tree-sitter C grammar: tree-sitter/tree-sitter-c @ b780e47fc780ddc8da13afa35a3f4ed5c157823d (MIT), compiled by
      tree-sitter-language-pack 1.21.0 (MIT) and read through the Language API (node kinds), exactly as gold.py reads it.
        - reserved word tokens  = ANONYMOUS visible node kinds that look like words  /^[A-Za-z_][A-Za-z0-9_]*$/
        - directive tokens      = anonymous kinds /^#[a-z]+$/ (`#include`, `#define`, ...): kept in `directives` (stripped of
                                  '#'), NEVER in `keywords`: `include` or `define` is a legal identifier outside directive position
        - primitive-type tokens = the grammar's lexical `primitive_type` token, which is ONE token (not enumerable as node kinds):
                                  enumerated by PROBING THE GRAMMAR'S OWN LEXER with `W x;` over a lexicon (below)
        - literal tokens        = the grammar's named `true` / `false` / `null` nodes, probed the same way (`x = W;`)
  G2  the language ENGINES: Apple clang 15.0.0 and GNU gcc 15 (Homebrew), as installed here.  The grammar is a SUPERSET parser
      (GNU + MSVC + C23 + library-macro tokens such as `offsetof`, `defined`, `noreturn`), so it cannot say which of its
      tokens the LANGUAGE reserves; the compilers can.  Probe: `static int W = 1;` compiled with -fsyntax-only; a nonzero exit
      means W cannot be an identifier.  Dialects probed: c89, c17 (strict), gnu17, c23 (clang spells it c2x).
  LEXICON for the primitive/literal probe = every identifier-shaped word in the manifest's C TRAIN files (unrestricted ones;
      /private/tmp/claude-501/code-corpus/manifest.json) UNION the anonymous word kinds.  DEV and TEST files are never read.
      Consequence, disclosed: the primitive-type list is complete over the TRAIN vocabulary, not over every word the lexer
      could ever accept; verify-c-priors.mjs audits it against grammar.js's own `primitive_type` token list.

CLASSIFICATION RULE (one rule, declared before the first run, never tuned after):
  K         = reserved word tokens (G1) UNION probed primitive words UNION probed literal words
  keywords  = { w in K : BOTH engines reject `static int w = 1;` under -std=gnu17 }   HARD: refuse (cannot name a being)
  softKeywords = { w in (reserved word tokens UNION literal words) not in keywords }   the grammar lexes it specially but the
              default-dialect engines allow it as an identifier (offsetof, defined, NULL, noreturn, true, MS/clang
              vendor tokens, C23-only words): recorded, NEVER refuse (legally declarable; a macro shim `#define inline`
              or `#define true 1` is a real fact about the material, not a parse failure)
  builtins  = { w in primitive words not in keywords }                                     recorded, NEVER refuse
  A word the giver never saw is admitted (a witness cannot refuse what it never saw): engine-only reserved words (`_Bool`,
  `_Complex`, `__builtin_*` ...) are NOT added; the engine only SPLITS the grammar's tokens, it never extends them.
  stdlibModules = [] and `stdlibModulesNotApplicable`: C has no module system; headers are files read off `#include`
  syntax by the reader, never granted identity from a list (rule 4).
  The full engine matrix (clang,gcc x c89,c17,gnu17,c23) is stored so a consumer may choose another edition.

PRE-REGISTERED PREDICTIONS AND PASS RULES (II.5): written BEFORE the first run of this builder or of verify-c-priors.mjs.
  P1 (split is real).  At least 9 of the grammar's non-directive anonymous word tokens end up SOFT, not hard (library macros /
     C23-only / vendor tokens: offsetof, defined, NULL, noreturn, alignas, alignof, thread_local, constexpr, nullptr are my
     named expectations).  Hard keywords include every C89 keyword the grammar lexes as anonymous tokens (auto break case
     const continue default do else enum extern for goto if long register return short signed sizeof static struct switch
     typedef union unsigned volatile while).  FAIL if any of those 27 is not hard, or if fewer than 9 words are soft.
  P2 (primitives).  The lexer probe finds char int float double void among the primitive words; they are HARD (engine
     rejects them); `bool`, `size_t` and the stdint words are NOT hard (builtins).  >= 20 primitive words found over TRAIN.
     FAIL if any of char/int/float/double/void is missing or not hard.
  P3 (instrument licence for the engine probe).  Control word `while` is rejected by every engine x dialect cell and the
     nonsense word `zz_probe_ok` is accepted by every cell.  FAIL (instrument broken, no prior is written) otherwise.
  P4 (engine disagreement is a result).  At least one word differs between dialects (C23 words: true/false/alignas/...
     reserved in c23, not in gnu17).  If none differs the matrix is uninformative and this is reported.
  The corpus-facing predictions (refusal precision S1, coverage S2, with controls built to fail) are pre-registered in the
  header of verify-c-priors.mjs and are run by that script.

usage: build-c-kw-prior.py [--out PRIOR.json] [--log LOG.json] [--no-write]
"""
import argparse, concurrent.futures, datetime, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (grammar loader + cache configuration only; the derivation below does not use gold's classes)

MANIFEST = os.environ.get("C_PRIORS_MANIFEST", "/private/tmp/claude-501/code-corpus/manifest.json")
DEFAULT_OUT = os.path.join(HERE, "..", "..", "priors", "code-kw-c-grammar.json")
DEFAULT_LOG = "/private/tmp/claude-501/coding-competence/c-priors/kw-derivation.json"

GRAMMAR = {
    "name": "tree-sitter-c",
    "source": "https://github.com/tree-sitter/tree-sitter-c",
    "rev": "b780e47fc780ddc8da13afa35a3f4ed5c157823d",
    "licence": "MIT",
    "abi_version": 14,
    "compiled_by": "tree-sitter-language-pack 1.21.0 (MIT, https://github.com/xberg-io/tree-sitter-language-pack), parsers-macos-arm64 "
                   "sha256 cad37e5ebb7b818e5d1e106cbc54604ed3389cf69e08732a8f567f4d4e442195",
    "rev_read_from": "https://raw.githubusercontent.com/xberg-io/tree-sitter-language-pack/v1.21.0/sources/language_definitions.json (entry `c`)",
}
ENGINES = [("clang", "clang"), ("gcc", "/opt/homebrew/bin/gcc-15")]
DIALECTS = ["c89", "c17", "gnu17", "c23"]
HARD_DIALECT = "gnu17"
WORD = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
DIRECTIVE = re.compile(r"^#[A-Za-z]+$")
IDENT_BYTES = re.compile(rb"[A-Za-z_][A-Za-z0-9_]*")


def engine_version(exe):
    out = subprocess.run([exe, "--version"], capture_output=True, text=True).stdout.splitlines()
    return out[0].strip() if out else None


def std_flag(engine, dialect):
    if dialect == "c23" and engine == "clang":
        return "-std=c2x"  # clang 15 spells C23 as c2x
    return "-std=" + dialect


def rejects(exe, engine, dialect, word):
    """True when `static int <word> = 1;` does not compile: the engine reserves <word> in this dialect."""
    src = "static int %s = 1;\n" % word
    r = subprocess.run([exe, std_flag(engine, dialect), "-fsyntax-only", "-w", "-x", "c", "-"], input=src.encode(), capture_output=True)
    return r.returncode != 0


def grammar_kinds(lang):
    anon, named = set(), set()
    for i in range(lang.node_kind_count):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        (named if lang.node_kind_is_named(i) else anon).add(k)
    return anon, named


def train_lexicon():
    m = json.load(open(MANIFEST))
    rows = [r for r in m["languages"]["c"]["train"] if not r.get("restricted")]
    words, repos = set(), set()
    for r in rows:
        repos.add(r["repo"])
        for w in IDENT_BYTES.findall(open(r["path"], "rb").read()):
            if len(w) <= 40:
                words.add(w.decode("ascii"))
    return words, {"files": len(rows), "repos": sorted(repos), "restricted_excluded": sum(1 for r in m["languages"]["c"]["train"] if r.get("restricted")),
                   "manifest": os.path.basename(MANIFEST), "split": "train"}


def probe_primitive(parser, w):
    t = parser.parse(("%s x;\n" % w).encode())
    root = t.root_node
    if root.has_error or root.child_count != 1:
        return False
    d = root.children[0]
    return d.type == "declaration" and d.child_count > 0 and d.children[0].type == "primitive_type" and d.children[0].text == w.encode()


def probe_literal(parser, w):
    src = ("void f(void) { x = %s; }\n" % w).encode()
    t = parser.parse(src)
    stack = [t.root_node]
    while stack:
        n = stack.pop()
        if n.type in ("true", "false", "null") and n.text == w.encode():
            return n.type
        stack.extend(n.children)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--log", default=DEFAULT_LOG)
    ap.add_argument("--no-write", action="store_true")
    a = ap.parse_args()

    parser, lang = gold.load("c")
    anon, named = grammar_kinds(lang)
    anon_words = sorted(k for k in anon if WORD.match(k))
    directives = sorted(k[1:] for k in anon if DIRECTIVE.match(k))

    lex, train = train_lexicon()
    lexicon = sorted(lex | set(anon_words))
    prim = sorted(w for w in lexicon if probe_primitive(parser, w))
    lit_type = {}
    for w in lexicon:
        t = probe_literal(parser, w)
        if t:
            lit_type[w] = t
    lit = sorted(lit_type)

    K = sorted(set(anon_words) | set(prim) | set(lit))
    controls = ["while", "zz_probe_ok"]
    cells = [(eng, exe, d) for eng, exe in ENGINES for d in DIALECTS]
    versions = {eng: engine_version(exe) for eng, exe in ENGINES}

    def one(args):
        w, (eng, exe, d) = args
        return (w, eng, d, rejects(exe, eng, d, w))

    jobs = [(w, c) for w in K + controls for c in cells]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        res = list(ex.map(one, jobs))
    rej = {}
    for w, eng, d, r in res:
        rej.setdefault(w, {})[(eng, d)] = r

    # P3: instrument licence (a control built to fail)
    p3 = all(rej["while"][c[0:1] + c[2:3]] for c in cells) and not any(rej["zz_probe_ok"][(c[0], c[2])] for c in cells)
    if not p3:
        sys.stderr.write("REFUSING: engine probe controls failed (while must be rejected everywhere, zz_probe_ok accepted everywhere)\n")
        sys.exit(2)

    def hard(w):
        return all(rej[w][(eng, HARD_DIALECT)] for eng, _ in ENGINES)

    keywords = sorted(w for w in K if hard(w))
    soft = sorted(w for w in set(anon_words) | set(lit) if not hard(w))
    builtins = sorted(w for w in prim if not hard(w))
    assert not (set(keywords) & set(soft)) and not (set(keywords) & set(builtins)), "classes overlap"

    matrix = {w: ["".join("1" if rej[w][(eng, d)] else "0" for d in DIALECTS) for eng, _ in ENGINES] for w in K}
    differs = sorted(w for w in K if len(set("".join(matrix[w]))) > 1)  # some cell (engine x dialect) disagrees with another

    prior = {
        "schema": "CodeKeywordPrior@1",
        "language": "c",
        "provenance": {
            "giver": "tree-sitter grammar tree-sitter-c (reserved word tokens, primitive-type and literal tokens) split into hard / soft / builtin by the language engines clang 15 and gcc 15 (default dialect gnu17)",
            "giverNote": "Reserved words are the grammar's anonymous word-like node kinds (Language API); directive tokens are kept apart; the grammar's single `primitive_type` token and its `true`/`false`/`null` nodes are enumerated by probing the grammar's own lexer over the TRAIN vocabulary. The grammar is a superset parser (GNU, MSVC, C23, library-macro tokens), so the compilers decide which tokens the language reserves: a word is HARD only if both engines reject it as an identifier under -std=gnu17. Never hand-typed; no model.",
            "grammar": GRAMMAR,
            "engines": versions,
            "engine_probe": "static int <word> = 1;  -fsyntax-only, dialects " + ",".join(DIALECTS) + ", hard dialect " + HARD_DIALECT,
            "source": "tree-sitter-language-pack 1.21.0 Language API (node kinds) + clang/gcc probes; TRAIN vocabulary from " + os.path.basename(MANIFEST),
            "builder": "khora native/eval/coding-competence/build-c-kw-prior.py (the sibling of scripts/build-code-keyword-prior.mjs; same CodeKeywordPrior@1 shape)",
            "trainVocabulary": {"files": train["files"], "repos": train["repos"], "restricted_excluded": train["restricted_excluded"], "distinct_words": len(lex), "split": "train"},
            "keywords_read": len(keywords),
            "soft_keywords_read": len(soft),
            "builtins_read": len(builtins),
            "stdlib_modules_read": 0,
            "stdlib_modules_projected": 0,
            "stdlibModulesNotApplicable": "C has no module system; headers are files, read off #include syntax by the reader and never granted identity from a list",
            "note": "hard keywords refuse (cannot name a being); soft keywords and builtins are recorded but never refuse (legally declarable; a macro shim such as `#define inline` or `#define true 1` is a real fact about the material, not a parse failure). A word the grammar never saw is admitted.",
        },
        "keywords": keywords,
        "softKeywords": soft,
        "builtins": builtins,
        "stdlibModules": [],
        "directives": directives,
        "engine": {"engines": [e for e, _ in ENGINES], "dialects": DIALECTS, "reservedBits": "per word: one 4-char string per engine, 1 = cannot be an identifier in that dialect", "reserved": matrix},
    }
    log = {
        "builtOn": datetime.date.today().isoformat(),
        "grammar": GRAMMAR, "node_kind_count": lang.node_kind_count, "anonymous_visible_kinds": len(anon), "anonymous_word_kinds": anon_words,
        "directive_kinds": directives, "lexicon_size": len(lexicon), "primitive_words": prim, "literal_words": lit_type,
        "controls": {c: {"%s/%s" % (e, d): rej[c][(e, d)] for e, _, d in cells} for c in controls},
        "words_differing_between_cells": differs,
        "counts": {"K": len(K), "keywords": len(keywords), "soft": len(soft), "builtins": len(builtins)},
        "train": train, "engine_versions": versions,
    }
    # P1/P2/P4 are evaluated and printed here so a failure is visible at build time; verify-c-priors.mjs re-checks from the file.
    c89 = "auto break case const continue default do else enum extern for goto if long register return short signed sizeof static struct switch typedef union unsigned volatile while".split()
    p1_missing = [w for w in c89 if w not in keywords]
    p1 = (not p1_missing) and len([w for w in anon_words if w in soft]) >= 9
    p2 = all(w in keywords for w in "char int float double void".split()) and len(prim) >= 20 and "bool" not in keywords
    log["preregistered"] = {"P1": p1, "P1_missing_c89": p1_missing, "P1_soft_anonymous": len([w for w in anon_words if w in soft]),
                            "P2": p2, "P2_primitives": len(prim), "P3": p3, "P4_words_differing": len(differs)}
    os.makedirs(os.path.dirname(a.log), exist_ok=True)
    json.dump(log, open(a.log, "w"), indent=1, sort_keys=True)
    if not a.no_write:
        json.dump(prior, open(a.out, "w"))
    print(json.dumps({"out": None if a.no_write else os.path.normpath(a.out), "log": a.log, "counts": log["counts"], "preregistered": log["preregistered"]}))


if __name__ == "__main__":
    main()
