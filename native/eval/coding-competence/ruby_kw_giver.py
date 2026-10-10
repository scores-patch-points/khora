#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ruby_kw_giver.py: the GIVER step of priors/code-kw-ruby-grammar.json (CodeKeywordPrior@1).

It is the Ruby twin of javascript_kw_giver.py: same shape, same disclosure discipline, different engine. It reads the CLOSED CLASSES of
the Ruby language off two authorities and writes them as a LanguageLawPrior@1-shaped JSON (the input shape that the EXISTING, UNMODIFIED
scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed and nothing is counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for ruby, loaded through tree-sitter-language-pack (the authority gold.py
     uses). The compiled grammar's own node-kind table, NOT grammar.js source text (an earlier heuristic over grammar.js produced
     the incumbent priors/code-kw-ruby.json with `i`, `r`, `ri` as "keywords"). Rule, the c0_grammar_keywords.py rule extended by an
     optional trailing ? or ! (Ruby words may end so: `defined?`): every ANONYMOUS visible node kind that looks like a word,
     /^[A-Za-z_][A-Za-z0-9_]*[?!]?$/, is a word token the grammar recognises somewhere. Plus a probe for the words the grammar gives a
     DEDICATED named terminal rather than an anonymous token: for every candidate word W (the named word-shaped node kinds AND every word
     the engine reserves) parse `x = W` and keep it iff the right-hand side is a clean named leaf, not `identifier`/`constant`, with
     text == W (that is how self, super, true, false, __FILE__, __LINE__, __ENCODING__ enter: the grammar names them `self`, `super`,
     `true`, `false`, `file`, `line`, `encoding`).
  ENGINE (the arbiter of RESERVEDNESS): MRI Ruby, through `ruby --disable-gems`, by two mechanisms that execute nothing:
       (1) Ripper.lex(W): W is reserved iff its first token is :on_kw (the engine's own lexer);
       (2) COMPILE PROBES (RubyVM::InstructionSequence.compile only parses and compiles, never runs) of a fixed template with W substituted:
             binding forms   F1 `W = 0`   F2 `def f(W); end`   F3 `proc {|W| }`   F4 `for W in []; end`   F5 `begin; rescue => W; end`
             member forms    M1 `x.W`     M2 `def W; end`      M3 `h = { W: 1 }`  M4 `:W`
       The probe vocabulary is the grammar's word tokens + the named word-shaped node kinds + EVERY identifier-shaped symbol the running
       interpreter has interned (Symbol.all_symbols), so a reserved word the grammar names differently (__FILE__) is still asked about.
     A word is HARD (reserved) iff the lexer says :on_kw AND (for plain identifier-shaped words) all five binding forms raise SyntaxError.
     For words ending in ? or !, every binding form is a syntax error for ANY such word (`all? = 0`), so the binding forms are uninformative
     and the lexer alone arbitrates (disclosed in derivation.suffixWords). The engine's builtins are the Kernel functions
     (Kernel.private_instance_methods(false): puts, require, raise, lambda, loop, format, ...) and the core constants (Object.constants)
     of a fresh `--disable-gems` interpreter; the methods every object inherits (to_s, inspect, hash, class, ...) are recorded apart
     (derivation.inheritedObjectMethods) and are NOT builtins: defining one is overriding, the intended idiom, not shadowing.
  WHY BOTH. The grammar alone cannot say which words are reserved (K4 measures how many reserved words it parses as a binding name). The
     engine alone cannot say which words the GRAMMAR (the reader's own lexer authority) gives a token, and exposes no keyword list. The
     prior keeps what both agree on as HARD:
        hard = (grammar word tokens U grammar dedicated literal terminals)  INTERSECT  reserved by the engine
        soft = grammar ANONYMOUS word tokens that the engine does NOT reserve (declarable): the numeric-literal suffix tokens `i`, `r`, `ri`
               (the grammar lexes `2i`, `3r`, `4ri` as complex/rational literals: contextual by adjacency to a digit, never reserved).
  A RUBY-SPECIFIC LIMIT, stated here and measured in build-ruby-priors.mjs (R1m, R4b): "cannot name a being" holds for a BINDING (local
     variable, parameter, block parameter, for-variable, rescue variable, constant, class/module name). Every reserved word CAN be a METHOD
     name (`def end`, `def class`, `x.begin`, `Range#end`), a hash label (`{if: 1}`) and a symbol (`:end`): the grammar's member positions
     are not binding positions. The prior is a refusal law for binding positions only; the file records the member forms (M1..M4) too, so
     the limit is a measured list, not a footnote.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  Disclosed exploratory reads that happened before this header was written (nothing else was looked at):
    (e1) the grammar's visible node kinds (gold.load + node_kind_for_id): 37 anonymous word kinds in ruby:
         BEGIN END alias and begin break case class def defined? do else elsif end ensure for i if in module next nil not or r redo rescue
         retry return ri then undef unless until when while yield; the named word-shaped kinds include self super true false nil file line
         encoding. `i`, `r`, `ri` looked like numeric-literal suffixes (imaginary, rational), not keywords.
    (e2) MRI 2.6.10 (the only ruby on this machine: /usr/bin/ruby, macOS system Ruby) through a scratch probe (probe1.rb, kept beside the
         outputs): over the 3225 identifier-shaped words of Symbol.all_symbols, 40 words lex as :on_kw; `do` was absent from that vocabulary
         (not interned), which is why this file also feeds the grammar's own tokens to the engine; for plain words the compile probe
         `W = 0` refuses exactly the :on_kw words; `def W; end` compiled for all 40.
    (e3) the incumbent priors/code-kw-ruby.json (34 words: lowercase-only heuristic over grammar.js; contains i, r, ri; lacks BEGIN, END,
         defined?, true, false, self, super, __FILE__, __LINE__, __ENCODING__).
    (e4) the header counts of the existing priors/code-name-ruby.json (998 names / 1552 declarations / 22 at floor 2) and one gold
         extraction of one TRAIN file (Homebrew cmd/tap.rb). Nothing about keywords was learned from either.
  K1 cross-mechanism agreement (the lexer and the compile probe are two different mechanisms of one engine; neither is the grammar). Over
     the plain identifier-shaped probe words, {first Ripper token is :on_kw} == {all five binding forms refused}. Pass: symmetric difference
     empty. Expected: pass, 40 plain words (41 hard with `defined?`, the documented size of Ruby's reserved-word list; a different size is
     reported, not a failure).
  K1c control for K1 (II.23, the statistic must move). Compare the lexer set of W with the compile refusal of a DIFFERENT word (the next
     plain word in sorted order, cyclic shift). Pass (licence): symmetric difference >= 10. Expected: ~78.
  K2 declarability. Every SOFT word compiles on all five binding forms (it may be declared) and no word is refused on only some forms
     (mixed = empty). Pass: both. Expected: soft = [i, r, ri]; mixed = [].
  K3 arbiter consistency. Every HARD plain word is refused on all five binding forms (all-or-nothing); the hard set equals (grammar word
     tokens U dedicated terminals) INTERSECT engine-reserved; and NO engine-reserved word lacks a grammar token (engineReservedButNotGrammar
     is empty). Expected: pass; hard size 41 (34 anonymous word tokens + self, super, true, false, __FILE__, __LINE__, __ENCODING__).
  K4 why the engine arbitrates (informational with a prediction). The number of engine-reserved plain words that the GRAMMAR itself parses
     cleanly as a binding name (`W = 0`, no ERROR or MISSING). Prediction: > 0 (a permissive grammar accepts at least the value-literals
     `self = 0`, `nil = 0`, ... as an assignment target). If it is 0 the stated reason is wrong for ruby and the WHY BOTH paragraph must be
     withdrawn: the engine is then only a cross-check.
  K7 member positions (the Ruby-specific limit). Every hard plain word compiles on all four member forms M1..M4. Pass: every hard word on
     M1, M2 and M4 (M3, the label form, is reported but not required: it differs for words with a suffix). Expected: pass for all 41.
     A word that fails a member form is listed, not hidden.
  The prior-vs-incumbent (K5), word-rule control (K6), name-prior (N1..N6) and witness (R1..R5) predictions are pre-registered in the header
  of build-ruby-priors.mjs, which consumes this file's output.

AMENDMENT (written AFTER the first run's results were seen; changes no threshold and no pass rule above). The first run gave hard = 38 (predicted
41), K1 pass, K2 FAIL, K3 pass, K4 = 16 of 37, K7 pass. Two causes, both of my own probe, both stated here and neither a tuned threshold:
  (a) K2 "mixed" was computed over every probe word, and the vocabulary holds constants (String, EACCES, ...): a constant is a legal F1 target
      (`String = 0`) and an illegal F2..F5 target (a parameter cannot be a constant) for reasons that have nothing to do with reservedness. The
      declared rule ("no word is refused on only some forms") is a statement about ordinary lowercase identifiers; `mixed` is now computed over
      the words whose first character is a lowercase letter or `_`. Constant-shaped words are classified by F1 alone (BEGIN and END are the only
      reserved ones). The first run's mixed list (all constants) is kept in the log of this edit, not hidden.
  (b) The three words hard was short of (__FILE__, __LINE__, __ENCODING__, which exploration (e2) had seen lex as :on_kw in an interpreter with
      rubygems loaded) were never ASKED about: under --disable-gems the interpreter has not interned them, and the grammar's own kinds are the
      named `file`, `line`, `encoding`, not those texts. The probe vocabulary rule now also generates, for every named word-shaped grammar kind K,
      the variants K.upper() and __K.upper()__. After that edit K3's last clause ("no engine-reserved word lacks a grammar token") is expected to
      FAIL for exactly those three: a direct parse (recorded in derivation.grammarDunderProbe) shows this grammar version lexes __FILE__, __LINE__
      and __ENCODING__ as plain `identifier` in every context tried (assignment, argument, condition, operand, method body), although it declares
      the named kinds file/line/encoding. That is a grammar gap, reported as a failed K3, not patched. Under the declared rule the three are NOT in
      `keywords` (the grammar does not give them a token); they are carried in the prior as `engineReservedNotGrammarToken` (additive field, ignored
      by every loader) so a consumer that trusts the engine can refuse them.
  (c) The first two runs took the builtins AFTER the probe had required json, ripper and rbconfig, so they held JSON, OpenStruct, Ripper, the
      Kernel functions j and jj and similar contamination. Seen on reading the first output; fixed by snapshotting Kernel's functions, Object's
      constants and the inherited methods before the first require. Only the builtins change; no threshold or pass rule.

GRAMMAR VERSION (typed gap, disclosed, same as the sibling givers): the installed language pack records neither the upstream commit nor
a semantic version for its ruby grammar (Language.semantic_version is None). The prior records the PACK version, the sha256 of the compiled
grammar library, the ABI version, the upstream repository URL, and a fingerprint of the grammar's node-kind table; the upstream commit is
null (unrecorded), not guessed. ENGINE VERSION (typed gap): MRI 2.6.10 is older than the grammar (which parses Ruby 3.x syntax). The
reserved-word table is unchanged across the 2.x and 3.x releases (no word has been added since 1.9.1); the words that are contextual in newer
engines (`it` in 3.4, numbered parameters `_1`..`_9` since 2.7) are NOT probed here and are listed under derivation.engineVersionGaps.

usage: python ruby_kw_giver.py OUT.json
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

WORD = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*[?!]?$")
PLAIN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
BINDING_FORMS = {
    "F1": "{w} = 0",
    "F2": "def f({w}); end",
    "F3": "proc {|{w}| }",
    "F4": "for {w} in []; end",
    "F5": "begin; rescue => {w}; end",
}
MEMBER_FORMS = {
    "M1": "x.{w}",
    "M2": "def {w}; end",
    "M3": "h = { {w}: 1 }",
    "M4": ":{w}",
}
RUBY = os.environ.get("RUBY") or shutil.which("ruby") or "ruby"

ENGINE_SRC = r'''
# the builtins are snapshotted BEFORE this probe requires anything (json adds Kernel#j and JSON, ripper adds Ripper): they are the interpreter's own
ident0 = /\A[A-Za-z_][A-Za-z0-9_]*[?!]?\z/
kernel_fns = Kernel.private_instance_methods(false).map(&:to_s).select { |s| s =~ ident0 }.sort
consts = Object.constants.map(&:to_s).select { |s| s =~ ident0 }.sort
inherited = (Object.instance_methods + Object.private_instance_methods).map(&:to_s).select { |s| s =~ ident0 }.uniq.sort - kernel_fns
require "json"
require "ripper"
$VERBOSE = nil
input = JSON.parse($stdin.read)
forms = input["forms"]
word_re = /\A[A-Za-z_][A-Za-z0-9_]*[?!]?\z/
symbols = Symbol.all_symbols.map(&:to_s).select { |s| s =~ word_re }.uniq
words = (input["words"] + symbols).uniq.sort
def compiles?(src)
  RubyVM::InstructionSequence.compile(src)
  true
rescue SyntaxError
  false
rescue Exception => e
  "error:#{e.class}"
end
probe = {}
words.each do |w|
  lex = Ripper.lex(w)
  first = lex.first
  row = { "lex" => first ? first[1].to_s : nil, "lexTok" => first ? first[2] : nil, "lexN" => lex.size }
  forms.each { |k, t| row[k] = compiles?(t.gsub("{w}", w)) }
  probe[w] = row
end
require "rbconfig"
libdirs = [RbConfig::CONFIG["rubylibdir"], RbConfig::CONFIG["rubyarchdir"]]
std = []
libdirs.each do |d|
  next unless d && Dir.exist?(d)
  Dir.children(d).each do |f|
    next if f.start_with?(".")
    base = f.sub(/\.(rb|bundle|so)\z/, "")
    std << base if base =~ /\A[A-Za-z][A-Za-z0-9_]*\z/
  end
end
puts JSON.generate(
  "version" => RUBY_VERSION, "patchlevel" => RUBY_PATCHLEVEL, "platform" => RUBY_PLATFORM, "engine" => RUBY_ENGINE, "revision" => RUBY_REVISION.to_s, "description" => RUBY_DESCRIPTION,
  "symbols" => symbols.size, "probe" => probe, "kernelFunctions" => kernel_fns, "coreConstants" => consts, "inheritedObjectMethods" => inherited,
  "libdirs" => libdirs, "stdlibLibraries" => std.uniq.sort
)
'''


def run_engine(words):
    payload = json.dumps({"words": sorted(words), "forms": {**BINDING_FORMS, **MEMBER_FORMS}})
    r = subprocess.run([RUBY, "--disable-gems", "-e", ENGINE_SRC], input=payload, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError("engine probe failed: " + r.stderr[-500:])
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


def all_false(row, forms):
    return all(row[f] is False for f in forms)


def all_true(row, forms):
    return all(row[f] is True for f in forms)


def main():
    out = sys.argv[1]
    g = gold.resolve("ruby")
    parser, lang = gold.load(g)
    anon, named_word, kinds = kinds_of(lang)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()
    bforms, mforms = list(BINDING_FORMS), list(MEMBER_FORMS)

    # ---- ENGINE (first: its reserved words are also the probe vocabulary for the grammar's dedicated terminals) ----------
    variants = {k.upper() for k in named_word} | {"__%s__" % k.upper() for k in named_word}
    eng = run_engine(sorted(anon | named_word | variants))
    probe = eng["probe"]
    vocabulary = sorted(probe)
    plain = [w for w in vocabulary if PLAIN.match(w)]
    suffix = [w for w in vocabulary if not PLAIN.match(w)]
    lex_kw = sorted(w for w in vocabulary if probe[w]["lex"] == "on_kw")
    binding_refused = sorted(w for w in plain if all_false(probe[w], bforms))
    lower = [w for w in plain if re.match(r"^[a-z_]", w)]
    mixed = sorted(w for w in lower if not all_false(probe[w], bforms) and not all_true(probe[w], bforms))
    engine_errors = {w: p for w, p in probe.items() if any(isinstance(p[f], str) for f in bforms + mforms)}
    # reserved = lexer says keyword AND (plain: every binding form refused | suffix word: the lexer alone, the forms being uninformative)
    reserved = sorted(w for w in lex_kw if (w in binding_refused) or (w in suffix))
    lex_kw_plain = sorted(w for w in lex_kw if PLAIN.match(w))

    # ---- GRAMMAR: dedicated named terminals -----------------------------------------------------------------------------
    candidates = sorted(named_word | set(reserved))
    literal_terminals = {}
    for w in candidates:
        if w in anon:
            continue  # already an anonymous word token; the dedicated terminal probe is for the words the grammar names instead
        root, bad = parse(parser, f"x = {w}\n")
        if bad:
            continue
        asg = next((n for n in walk(root) if n.type == "assignment"), None)
        right = asg.child_by_field_name("right") if asg else None
        if right is not None and right.is_named and right.child_count == 0 and right.type not in ("identifier", "constant") and right.text.decode("utf8") == w:
            literal_terminals[w] = right.type
    # nil is both an anonymous token and a named terminal in this grammar: record the named kind too (disclosure only)
    for w in sorted(anon):
        root, bad = parse(parser, f"x = {w}\n")
        asg = None if bad else next((n for n in walk(root) if n.type == "assignment"), None)
        right = asg.child_by_field_name("right") if asg else None
        if right is not None and right.is_named and right.child_count == 0 and right.type not in ("identifier", "constant") and right.text.decode("utf8") == w:
            literal_terminals.setdefault(w, right.type)
    grammar_words = sorted(anon | set(literal_terminals))

    hard = sorted(set(grammar_words) & set(reserved))
    soft = sorted(w for w in anon if w not in set(reserved))
    engine_reserved_not_grammar = sorted(set(reserved) - set(grammar_words))
    grammar_words_not_hard = sorted(set(grammar_words) - set(hard))

    # numeric-suffix probe for the soft words: `1<W>` is a rational/complex literal
    suffix_probe = {}
    for w in soft:
        root, bad = parse(parser, f"x = 1{w}\n")
        asg = None if bad else next((n for n in walk(root) if n.type == "assignment"), None)
        right = asg.child_by_field_name("right") if asg else None
        suffix_probe[w] = {"clean": not bad, "rightHandSideType": right.type if right is not None else None, "text": right.text.decode("utf8") if right is not None else None}

    # the grammar's own parse of every engine-reserved word that is not a grammar token, in several contexts (what the reader's lexer authority does with it)
    dunder_probe = {}
    for w in engine_reserved_not_grammar:
        ctx = {"assignment": f"x = {w}\n", "argument": f"foo({w})\n", "condition": f"if {w} == 1\nend\n", "operand": f"a = {w} + 1\n", "statement": f"{w}\n"}
        row = {}
        for name, src in ctx.items():
            root, bad = parse(parser, src)
            types = sorted({n.type for n in walk(root) if n.is_named and n.child_count == 0 and n.text.decode("utf8") == w})
            row[name] = {"clean": not bad, "leafTypes": types}
        dunder_probe[w] = row

    # ---- checks K1..K4, K7 (declared in the header) -------------------------------------------------------------------------
    sym = sorted(set(lex_kw_plain) ^ set(binding_refused))
    k1 = {"pass": not sym, "lexKeywordPlainWords": len(lex_kw_plain), "bindingRefusedPlainWords": len(binding_refused), "symmetricDifference": sym, "predictedPlain": 40,
          "plainCountAsPredicted": len(lex_kw_plain) == 40, "suffixWordsLexKeyword": sorted(w for w in lex_kw if w in suffix), "suffixWordsInVocabulary": len(suffix)}
    shifted = {plain[i]: plain[(i + 1) % len(plain)] for i in range(len(plain))}
    ctl_refused = {w for w in plain if all_false(probe[shifted[w]], bforms)}
    ctl_sym = sorted(set(lex_kw_plain) ^ ctl_refused)
    k1c = {"derangement": "compile refusal of the next plain word in sorted order (cyclic shift) vs the lexer verdict of the word itself", "symmetricDifference": len(ctl_sym), "licenceMin": 10, "licensed": len(ctl_sym) >= 10}
    k2_rows = {w: [probe[w][f] is True for f in bforms] for w in soft}
    k2 = {"pass": not mixed and all(all(v) for v in k2_rows.values()), "soft": soft, "mixed": mixed, "declarable": k2_rows, "predictedSoft": ["i", "r", "ri"], "softAsPredicted": soft == ["i", "r", "ri"]}
    k3_forms = all(all_false(probe[w], bforms) for w in hard if PLAIN.match(w))
    k3 = {"pass": bool(hard) and k3_forms and not engine_reserved_not_grammar and set(hard) == (set(grammar_words) & set(reserved)), "hard": len(hard), "predictedSize": 41, "sizeAsPredicted": len(hard) == 41,
          "allHardPlainWordsRefusedOnAllBindingForms": k3_forms, "engineReservedButNotGrammar": engine_reserved_not_grammar}
    lenient = []
    for w in hard:
        if not PLAIN.match(w):
            continue
        root, bad = parse(parser, f"{w} = 0\n")
        if not bad:
            lenient.append(w)
    plain_hard = [w for w in hard if PLAIN.match(w)]
    k4 = {"engineReservedWordsGrammarAcceptsAsBindingName": lenient, "n": len(lenient), "of": len(plain_hard), "prediction_gt_0_held": len(lenient) > 0}
    member_fail = {f: sorted(w for w in plain_hard if probe[w][f] is not True) for f in mforms}
    k7 = {"pass": not member_fail["M1"] and not member_fail["M2"] and not member_fail["M4"], "failures": member_fail, "of": len(plain_hard),
          "suffixHardWords": [w for w in hard if not PLAIN.match(w)],
          "suffixHardWordMemberForms": {w: {f: probe[w][f] for f in mforms} for w in hard if not PLAIN.match(w)}}

    # ---- builtins and stdlib: engine-declared --------------------------------------------------------------------------------
    hard_set = set(hard)
    builtins_raw = sorted(set(eng["kernelFunctions"]) | set(eng["coreConstants"]))
    builtins = [b for b in builtins_raw if b not in hard_set]
    builtin_src = {b: ("kernel-function" if b in set(eng["kernelFunctions"]) else "core-constant") for b in builtins}
    stdlib = sorted(set(eng["stdlibLibraries"]))

    soft_sources = {}
    for w in soft:
        s = ["grammar:anonymous-word-token"]
        sp = suffix_probe[w]
        if sp["clean"] and sp["rightHandSideType"] in ("complex", "rational"):
            s.append(f"grammar:numeric-literal-suffix:{sp['rightHandSideType']}")
        s.append("engine:accepted-as-binding-name")
        soft_sources[w] = s
    hard_sources = {}
    for w in hard:
        s = []
        if w in anon:
            s.append("grammar:anonymous-word-token")
        if w in literal_terminals:
            s.append(f"grammar:dedicated-terminal:{literal_terminals[w]}")
        s.append("engine:lexer-keyword")
        s.append("engine:binding-forms-refused" if PLAIN.match(w) else "engine:suffix-word-lexer-only")
        hard_sources[w] = s

    lib_path = os.path.join(os.environ.get("GOLD_TS_CACHE", "/private/tmp/claude-501/coding-competence/ts-cache"), "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_ruby.dylib")
    lib_sha = hashlib.sha256(open(lib_path, "rb").read()).hexdigest() if os.path.exists(lib_path) else None

    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "ruby",
        "giver": {
            "resource": "tree-sitter grammar for ruby (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by MRI Ruby %s (the language engine: Ripper's lexer and RubyVM::InstructionSequence compile probes that execute nothing) for reservedness, softness and builtins" % eng["version"],
            "engine": {"implementation": eng["engine"], "version": eng["version"], "patchlevel": eng["patchlevel"], "platform": eng["platform"], "revision": eng["revision"], "description": eng["description"],
                       "mode": "ruby --disable-gems: Ripper.lex (first token :on_kw) and RubyVM::InstructionSequence.compile probes (binding forms F1..F5, member forms M1..M4); nothing executed"},
            "note": "Derived, never hand-typed (ruby_kw_giver.py): hard = (grammar word tokens U grammar dedicated literal terminals) INTERSECT the words MRI's lexer reserves and whose binding forms its compiler refuses; soft = the grammar's anonymous word tokens the engine does not reserve (the numeric-literal suffixes i, r, ri); builtins = Kernel's private functions + the core constants of a fresh --disable-gems interpreter. Hard words refuse BINDING names only: every reserved word can be a method name, a hash label or a symbol. Semantics stay in the engine.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": builtins,
        "lexicon": {"stdlibModules": stdlib},
        "derivation": {
            "grammar": {
                "name": "ruby", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-ruby", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint, "compiledLibrarySha256": lib_sha,
                "anonymousWordKinds": sorted(anon), "dedicatedLiteralTerminals": literal_terminals,
                "rule": "anonymous visible node kinds matching /^[A-Za-z_][A-Za-z0-9_]*[?!]?$/ (the c0_grammar_keywords.py rule plus the optional ?/! suffix) + dedicated named terminal probe `x = <word>` over the named word-shaped kinds and the engine-reserved words",
            },
            "engineProbeForms": {"binding": BINDING_FORMS, "member": MEMBER_FORMS},
            "probeVocabulary": {"size": len(vocabulary), "plain": len(plain), "suffixShaped": len(suffix), "interpreterSymbols": eng["symbols"], "grammarWords": len(set(anon) | named_word),
                                "source": "ruby grammar anonymous word kinds + named word-shaped kinds + every identifier-shaped symbol of the running interpreter (Symbol.all_symbols)"},
            "engineLexerKeywords": lex_kw, "engineReserved": reserved,
            "engineReservedButNotGrammar": engine_reserved_not_grammar,
            "grammarDunderProbe": dunder_probe,
            "grammarWordsNotHard": grammar_words_not_hard,
            "softSources": soft_sources, "hardSources": hard_sources, "numericSuffixProbe": suffix_probe,
            "mixedWords": mixed, "engineProbeErrors": engine_errors,
            "suffixWords": {"note": "words ending in ? or ! cannot be binding names for ANY word (`all? = 0` is a syntax error), so the binding forms are uninformative for them; the lexer alone arbitrates", "lexerKeywords": sorted(w for w in lex_kw if w in suffix)},
            "memberForms": k7,
            "builtinSources": builtin_src, "builtinsExcludedAsHard": sorted(set(builtins_raw) & hard_set),
            "inheritedObjectMethods": eng["inheritedObjectMethods"],
            "builtinsNote": "Kernel's private instance methods (the global functions) and Object.constants of a fresh --disable-gems interpreter. Methods every object inherits are recorded in inheritedObjectMethods and are not builtins; class-body DSL words (attr_accessor, include, private, ...) are Module methods and are not recorded (typed gap, harmless because builtins never refuse). Stdlib/gem constants (Set, JSON, ...) need a require and are absent by construction.",
            "stdlibModules": {"status": "engine-derived", "source": "top-level library names (.rb files, directories, .bundle/.so) under RbConfig rubylibdir and rubyarchdir of this engine", "libdirs": eng["libdirs"], "count": len(stdlib),
                              "caveat": "version-specific: MRI %s; libraries that later releases moved out of the default set (e.g. matrix, prime, rexml became bundled gems) differ, and installed gems are not listed" % eng["version"]},
            "engineVersionGaps": {"engine": eng["version"], "grammarTargets": "Ruby 3.x syntax", "notProbed": ["it (soft in 3.4+)", "numbered block parameters _1.._9 (reserved from 2.7; 3.0 makes assignment an error)", "pattern-matching find pattern"],
                                  "note": "the reserved-word table is unchanged across 2.x and 3.x; these contextual words would be additional SOFT words on a newer engine"},
            "bindingOnly": "a reserved word cannot name a binding (local variable, parameter, block parameter, for variable, rescue variable, constant, class or module name) but can be a method name (def end), a hash label ({if: 1}) or a symbol (:end); the hard set is a refusal law for binding positions only",
            "checks": {"K1": k1, "K1c": k1c, "K2": k2, "K3": k3, "K4": k4, "K7": k7},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(builtins), "stdlibModules": len(stdlib)},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": soft, "K1": k1["pass"], "K1c": k1c["licensed"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient), "K4_of": len(plain_hard),
                      "K7": k7["pass"], "K7_failures": member_fail, "engineReservedNotGrammar": engine_reserved_not_grammar, "literalTerminals": literal_terminals, "engine": eng["version"],
                      "mixed": mixed, "k1sym": sym, "plainLex": len(lex_kw_plain), "suffixKw": k1["suffixWordsLexKeyword"], "builtins": len(builtins), "stdlib": len(stdlib)}))


if __name__ == "__main__":
    main()
