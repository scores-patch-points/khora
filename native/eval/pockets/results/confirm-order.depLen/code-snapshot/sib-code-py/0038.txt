#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GOLD EXTRACTOR for programming languages (khora / Lovelace, Coding Capability Circle).

WHAT THIS IS. An INSTRUMENT, not a reading. It turns a source file into GOLD for the
coding-competence ladder (R1 hear tokens, R2 classify tokens, R3 find beings, R4 find
relations) using an authority that is INDEPENDENT of khora: a tree-sitter grammar (via
tree-sitter-language-pack) plus that grammar's own shipped tags.scm / highlights.scm.
It never calls a model and it makes no claim about any khora reader. Lovelace's law:
the engine does what it is ordered to perform. This file orders the grammar, and every
mapping from grammar node types to a class / def / call / import / extends is declared
below with its giver. Where no mapping exists the output says so in a TYPED gap
(capabilities.<field>.status in {ok, not_applicable, gap}); empty is never a silent pass.

OUTPUT (one JSON object per file). All offsets are UTF-16 code units, so
text.slice(start, end) works on a JS string. unit = "utf16".
  { gold_version, language, grammar, unit, file,
    parse:{has_error, error_nodes, missing_nodes, error_bytes_frac, uncovered_tokens, n_bytes, n_chars},
    capabilities:{tokens,defs,calls,imports,extends -> {status, giver, reason?, caveat?}},
    tokens:[{start,end,type,class}]   class in keyword|identifier|literal|operator|
                                      punctuation|comment|string|type|other. Strings and comments are one
                                      lexeme each; text the grammar hides is added as type '<uncovered>'
                                      so the tokens cover every non-whitespace character.
    defs:[{kind,name,start,end,nameStart,nameEnd,node,nameCleaned?}]   start/end = the node the giver
                                      captured as the definition (for C functions that is the declarator,
                                      not the body); kinds: CORE_KINDS are R3 "beings", SECONDARY_KINDS are
                                      value-level declarations (constant, property, ...)
    refs:[{name,start,kind}]          identifier/type tokens that are not a def name; kind = call|import|
                                      the giver's reference kind|type|use
    calls:[{callee,start,end}]        callee = the final name; start = its first unit. A defining name is
                                      never a call; Lisp-family binding/lambda/clause lists are not calls
    imports:[{module,start,end}]      module as written, quotes/angles stripped
    extends:[{child,base,relation,start}]   relation: extends|implements|mixin|embeds|inherits|uses|...
    injections:[{language,start,end,has_error,error_bytes_frac}]   html/vue/svelte <script>/<style>
  }
USAGE. python gold.py extract LANG|- FILE | serve (JSONL: {id,language,text,fileName} -> {id,gold|error};
each request runs in a forked child under a wall-clock budget) | audit LANG FILE | table [--write|--check] |
languages | check.  Node: gold.mjs (goldFor, goldBatch, goldAvailable).

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file).
Prediction and pass rule for the INSTRUMENT SELF-CHECKS (tests/coding-gold.test.js).
They test the extractor, not any reader. Thresholds are declared here, not tuned.
  P1 fixtures parse clean. Every AUTHORED fixture (eval/coding-competence/fixtures/, written
     by the model, labelled authored, never natural data) has error_bytes_frac == 0 in its own
     grammar. Failure means the fixture or the grammar choice is wrong, and is reported.
  P2 real files parse nearly clean. Real corpus files (ethos/09-source-code) have
     error_bytes_frac <= 0.02 (declared tolerance: macro-heavy C and minified bundles may
     exceed it; a file above it is reported as a parse failure, never dropped silently).
  P3 control built to fail (II.23 / II.4). Parsing every fixture under a DERANGED grammar (a fixed
     cyclic shift of the language list: nobody keeps its own) must raise error_bytes_frac for at
     least 70% of the languages and the median must rise by >= 0.05 absolute; the statistic must
     MOVE under the perturbation. Languages whose grammar is permissive (parses anything) will
     not move: they are listed as a finding (error share is not an R0 signal for them), not hidden.
     AMENDMENT (recorded after the first full run hung on rust text under the COBOL grammar, before any
     result was seen): every parse in serve/batch mode runs in a forked child with a wall-clock budget
     (GOLD_PARSE_BUDGET_S, default 30; the test uses 10). An overrun, or a crash of a grammar library, is a typed
     per-file error, and in P3 it is scored as error share 1.0 (the statistic moved as far as it can).
  P4 defs. On each fixture the extracted set of (kind-free) def names equals the declared
     expected set for every language whose defs capability is ok. A mismatch is a mapping
     failure and is reported as one.
  P5 determinism. Extracting the same text twice yields byte-identical JSON.
  P6 offsets. Tokens are sorted, non-overlapping, non-empty; text.slice(nameStart,nameEnd)
     equals every def's name; the same holds for call callees and import modules (modulo quote
     stripping).
METRIC REVISION (disclosed). error_bytes_frac was first written as the width of ERROR nodes over all bytes. The
first smoke on real files scored the Linux kernel's sched/core.c and Godot's main.cpp at 1.0 because recovery made the
ROOT an ERROR node although nearly all of it parsed (hundreds of valid children). It was redefined, BEFORE any of P1-P6
was run, as the share of bytes in leaf tokens the parser could not attach to a grammar node (ERROR leaves and leaves
whose parent is an ERROR node). P1-P3 use this definition.
DISCLOSURE. The token-class rules and the authored queries below were corrected while looking at
DEV smoke files (the corpus files and the fixtures) and at an AUDIT that compares the structural
class with the grammar's own highlights.scm capture (python gold.py audit LANG FILE). The gold is
therefore an instrument built by looking at DEV, not a blind measurement; the held-out files that
a reader is scored on must never be used to adjust anything in this file. P4 in particular is a
REGRESSION GUARD, not a blind test: the queries were iterated until the fixtures matched the authored
expectations (written from the fixture source, though a few, such as swift stored properties and
kotlin's local `val`, deliberately mirror what the shipped tags call a definition).

FIRST FULL RUN (2026-10-05, tree-sitter-language-pack 1.21.0; reported as run, not tuned afterwards).
  P1 52/52 fixtures clean (51 languages; matlab has two files).  P2 9/9 corpus files <= 0.02 (worst 0.00017; DEV smoke
  on 3 files per language saw 0.0034 on linux sched/core.c); outside P2's list a real pg_dump (rdkit rddata.sql, COPY data blocks) scores 0.0916 under the sql grammar
  and is a PARSE FAILURE for that file.  P3 46/52 moved under the deranged grammar, median rise 0.184 (rule: >=70% and
  >=0.05: met). The 6 that did NOT move are permissive pairs: dart as markdown, haskell as php, json as racket,
  matlab as svelte, powershell as yaml, zig as html (prose-like grammars accept anything), so a parse-error share is NOT an
  R0 signal against a permissive grammar; rust text under the COBOL grammar overran the 10 s budget and is scored 1.0.
  P4 169/170 compared fields equal the authored expectations; the one difference is NAMED: kotlin `object Util` is mis-parsed
  by the grammar as an expression without any ERROR, so it is not found.  P5 identical.  P6 holds.
  Typed GAPS at this run: commonlisp.extends, lean.calls, perl.extends, r.extends (reasons in the table).
  Shipped tags.scm files proved unreliable in places, which is why every field has an authored top-up and a fixture:
  python's module-constant pattern targets an older grammar shape; dart's call pattern matches every identifier;
  typescript's file is TS-only additions (compose with javascript's); rust labels fns inside `mod {}` methods; the
  commonlisp and racket call patterns count every list head (special forms, binding lists).

THE MAPPING TABLE. MAPS (below) is the table: one row per language, each field with its giver.
`python gold.py table` prints it as markdown. Conventions every row follows:
  tokens   whitespace-only leaves are dropped (not lexemes); structural rules on the grammar's own node kinds (named/anonymous, the kind name),
           per-language `tok` overrides; strings/comments are atomic lexemes (interpolations
           stay inside the string token). GIVER: grammar node-types (Language API) + audit
           against the grammar's highlights.scm.
  defs     `@definition.<kind>` + `@name` captures. GIVER: the grammar's shipped tags.scm
           where `tags` is True, plus the authored `defs` query (same capture convention).
  calls    `@reference.call|send` + `@name`. GIVER: shipped tags.scm, plus authored `calls`.
  imports  `@module`. GIVER: authored query over the grammar's own node kinds (no shipped
           tags query captures imports).
  extends  `@child` + `@base[.<relation>]` in one match. GIVER: authored query over the
           grammar's own node kinds.
  na       {field: reason}: the field does not apply to the language (typed, not a pass).
A field with neither a source nor an `na` reason is a typed GAP ("no mapping authored").
"""
import os, sys, re, json, hashlib, bisect, time, select, signal
from array import array

GOLD_VERSION = "gold-1"
CACHE_DIR = os.environ.get("GOLD_TS_CACHE") or "/private/tmp/claude-501/coding-competence/ts-cache"
# Own the parser cache: the venv may carry a .pth that points elsewhere (a survey cache).
os.environ["TREE_SITTER_LANGUAGE_PACK_CACHE_DIR"] = CACHE_DIR

FIELDS = ("tokens", "defs", "calls", "imports", "extends")
CLASSES = ("keyword", "identifier", "literal", "operator", "punctuation", "comment", "string", "type", "other")


def L(exts="", pack=None, tags=False, defs=None, calls=None, imports=None, extends=None, na=None,
      tok=None, atomic=(), notes="", refine=None, tokre=(), import_clean=None, call_stop=None, module=None, inject=False,
      shipped_calls=True, call_ctx=None, gaps=None, name_clean=None):
    """One row of the mapping table.
    `refine(node, kind) -> kind` corrects a giver's kind where the giver is known to mislabel (see `notes`).
    `shipped_calls=False` discards the shipped tags' reference.call captures when that pattern is known to
    over-match (see `notes`). `call_stop` is a regex of callee names that are special forms or defining heads,
    not calls (Lisp family, operators). `module=(pkg, fn)` loads a standalone grammar package when the
    language pack's is unusable. `inject` parses <script>/<style> bodies in their own grammar (included ranges).
    `tok` maps a node type (or 'type<parent_type') to a class; `tokre` does the same by regex on the node type;
    `atomic` lists node types that are one string lexeme; `import_clean=(regex, repl)` tidies module text.
    `call_ctx` (Lisp family) says which list heads make a list-with-a-symbol-head NOT a call (binding lists,
    lambda lists, clause lists, import/require forms): see lisp_call_blocked.
    `gaps={field: reason}` is a typed GAP with a reason (applicable, but no mapping authored).
    `name_clean=(regex, repl)` tidies a def name whose captured node carries punctuation (def.nameCleaned says so)."""
    return dict(exts=tuple(e if e.startswith(".") else "." + e for e in exts.split()), pack=pack, tags=tags,
                defs=defs, calls=calls, imports=imports, extends=extends, na=dict(na or {}),
                tok=dict(tok or {}), atomic=set(atomic), notes=notes, refine=refine,
                tokre=[(re.compile(a), b) for a, b in tokre], import_clean=import_clean,
                call_stop=re.compile(call_stop) if call_stop else None, module=module, inject=inject,
                shipped_calls=shipped_calls, call_ctx=call_ctx, gaps=dict(gaps or {}), name_clean=name_clean)


def _rust_refine(node, kind):
    # shipped tags label every fn in any declaration_list a 'method', including fns inside `mod { }`
    if kind == "method":
        par = node.parent
        gp = par.parent if par is not None else None
        if gp is not None and gp.type == "mod_item":
            return "function"
    return kind


# =====================================================================================
# THE MAPPING TABLE (instrument knowledge, per language, each with its giver)
# =====================================================================================
def _lisp(lists, syms, any_anc, first_arg, binding, clause):
    return {"lists": set(lists), "syms": set(syms), "any_anc": re.compile(any_anc), "first_arg": re.compile(first_arg),
            "binding": re.compile(binding), "clause": re.compile(clause)}


# THE MAPPING TABLE, generated by `python gold.py table --write` from MAPS (tests check it is current). Read each row
# as: which grammar gives structure, and for each field its giver (tags.scm = the grammar's shipped query; authored q =
# a query written here over the grammar's own node kinds; n/a = does not apply; GAP = applies, not mapped).
# @@TABLE-BEGIN@@
# | language | grammar (giver of structure) | exts | defs | calls | imports | extends | notes |
# |---|---|---|---|---|---|---|---|
# | bash | language-pack `bash` | .sh .bash .zsh .ksh .bats | authored q | authored q | authored q | n/a: shell has no inheritance | no shipped tags; every command_name is a call (builtins included) |
# | c | language-pack `c` | .c .h | tags.scm + authored q | tags.scm + authored q | authored q | n/a: C has no inheritance or interface clause | '.h' is read as C (C++ headers need language=cpp); function_declarator tags give prototypes too |
# | clojure | language-pack `clojure` | .clj .cljs .cljc .edn | authored q | authored q | authored q | n/a: Clojure has no inheritance clause (protocols/records implement, not extend) | no shipped tags: defs are read off the head symbol of a list (clojure.org special forms + defining macros); call_stop drops special forms and defining heads from calls |
# | cobol | language-pack `cobol` | .cob .cbl .cpy .cobol | authored q | authored q | authored q | n/a: COBOL has no inheritance in the grammar shipped | fixed-format source is read as given; a paragraph name is a HIDDEN token of paragraph_header (the node text is the name plus '.'), so its def is the header node with the period cleaned off, and the name text is emitted by the uncovered-text pass |
# | commonlisp | language-pack `commonlisp` | .lisp .cl .asd | tags.scm | tags.scm | authored q | GAP: superclasses are the list after the class name in defclass; not authored | shipped tags use @ignore and empty-suffix captures; ignore ranges are honoured and special forms are dropped from calls |
# | cpp | language-pack `cpp` | .cpp .cc .cxx .hpp .hh .hxx .ipp | tags.scm + authored q | tags.scm + authored q | authored q | authored q | tags give classes, functions, calls, impl; authored adds macros, namespaces, includes, bases |
# | csharp | language-pack `csharp` | .cs | tags.scm + authored q | tags.scm + authored q | authored q | authored q | shipped tags: class/interface/method/namespace, invocation as reference.send; authored adds struct/enum/record |
# | css | language-pack `css` | .css | authored q | authored q | authored q | n/a: CSS has no inheritance clause | custom property declarations and @keyframes names declare; class/id selectors are uses of HTML-side names, not declarations |
# | dart | language-pack `dart` | .dart | tags.scm + authored q | tags.scm DISCARDED + authored q | authored q | authored q | the shipped reference.call pattern matches every identifier (all selectors optional), so it is discarded and calls are authored: an identifier or member name followed by an argument_part |
# | elixir | language-pack `elixir` | .ex .exs | tags.scm + authored q | tags.scm | authored q | authored q | everything is a call; the shipped tags ignore def/defmodule/etc. as callees (@ignore ranges are honoured) |
# | elm | language-pack `elm` | .elm | tags.scm + authored q | tags.scm + authored q | authored q | n/a: Elm has no inheritance |  |
# | erlang | language-pack `erlang` | .erl .hrl | authored q | authored q | authored q | authored q | no shipped tags; each clause of a function is a def (multi-clause functions repeat the name) |
# | fortran | language-pack `fortran` | .f90 .f95 .f03 .f08 .f .for .ftn .f77 | tags.scm + authored q | tags.scm + authored q | authored q | authored q |  |
# | go | language-pack `go` | .go | tags.scm | tags.scm | authored q | authored q | tags: func/method/type; embedding is the only inheritance-like relation |
# | groovy | standalone tree-sitter-groovy (PyPI) | .groovy .gvy .gradle | authored q | authored q | authored q | authored q | the language-pack groovy grammar is a 61-kind toy with no declarations or keywords; this row uses the standalone tree-sitter-groovy 0.1.2 (amaanq, MIT). It needs `;` terminators: semicolon-less Groovy parses with MISSING nodes |
# | haskell | language-pack `haskell` | .hs .lhs | authored q | authored q | authored q | authored q | no shipped tags: defs authored; multi-clause functions yield one def per clause |
# | html | language-pack `html` | .html .htm .xhtml | authored q + injected script/style | injected script/style | authored q + injected script/style | n/a: markup has no inheritance | id attribute values declare addressable entities; embedded script/style (raw_text) are NOT parsed in their own grammar |
# | java | language-pack `java` | .java | tags.scm + authored q | tags.scm | authored q | authored q | shipped tags lacks enums and records |
# | javascript | language-pack `javascript` | .js .mjs .cjs .jsx | tags.scm | tags.scm | authored q | authored q | jsx parses with this grammar; require()/import() count as imports |
# | json | language-pack `json` | .json .jsonc .geojson .webmanifest | n/a: JSON declares no named entities (object keys are data, not declarations) | n/a: no call syntax | n/a: no import syntax | n/a: no inheritance | data format |
# | julia | language-pack `julia` | .jl | authored q | authored q | authored q | authored q | no shipped tags; a call whose callee is the defining name of a def is dropped (signatures parse as calls) |
# | kotlin | language-pack `kotlin` | .kt .kts | tags.scm + authored q | tags.scm + authored q | authored q | authored q | kotlin grammar has no field names; interface/class are class_declaration. KNOWN GRAMMAR LIMIT: a top-level `object Name { }` can parse (without any ERROR) as an object_literal expression, so object declarations are not reliably defs |
# | latex | language-pack `latex` | .tex .latex .sty .cls | authored q | authored q | authored q | n/a: no inheritance (\\documentclass is an import) | no shipped queries: commands the document defines, labels it declares; every command use is a call |
# | lean | language-pack `lean` | .lean | authored q | GAP: value-level application and type-level application are the same `app` node; telling them apart needs elaboration | authored q | authored q | no shipped tags; dotted names are single identifier tokens in this grammar |
# | lua | language-pack `lua` | .lua | tags.scm | tags.scm | authored q | n/a: Lua declares no inheritance; prototype chains are built by setmetatable calls, which are calls, not declarations |  |
# | markdown | language-pack `markdown` | .md .markdown .mdx | authored q | n/a: prose has no call syntax | n/a: no import syntax | n/a: no inheritance | block grammar only: inline spans are single `inline` tokens (the markdown_inline grammar is not run); fenced code is not injected because an example is not a declaration |
# | matlab | language-pack `matlab` | .m | tags.scm | tags.scm + authored q | n/a: MATLAB has no import statement for files (path-based); `import pkg.*` is rare and not authored | authored q | '.m' is ambiguous with Objective-C: callers must say language=matlab |
# | nim | language-pack `nim` | .nim .nims .nimble | authored q | authored q | authored q | authored q | no shipped tags; routine = proc/func/method/iterator/template/macro |
# | objc | language-pack `objc` | .m .mm | tags.scm(c) + authored q | tags.scm(c) + authored q | authored q | authored q | the ObjC grammar extends C: C's tags compose; authored adds @interface/@implementation/@protocol/methods/message sends. '.m' is ObjC here (Matlab also uses .m: pass language=matlab) |
# | ocaml | language-pack `ocaml` | .ml .mli | tags.scm | tags.scm | authored q | authored q | tags: modules, classes, methods, types, constructors, fields, let-bound functions; infix operator applications (callee with no letter) are not counted as calls |
# | perl | language-pack `perl` | .pl .pm .t | authored q | authored q | authored q | GAP: inheritance is `use parent`/`@ISA` relative to the enclosing package; one tree query cannot scope it (needs a procedural pass) | no shipped tags; package=class |
# | php | language-pack `php` | .php .phtml .php3 .php4 .php5 .php7 .phps | tags.scm + authored q | tags.scm | authored q | authored q | tags: class/interface/function/method + calls |
# | powershell | language-pack `powershell` | .ps1 .psm1 .psd1 | authored q | authored q | authored q | authored q | no shipped tags; commands are calls (cmdlets and external programs alike) |
# | python | language-pack `python` | .py .pyi .pyw | tags.scm + authored q | tags.scm | authored q | authored q | defs/calls: shipped tags.scm; its module-constant pattern targets an older grammar shape, so the authored defs query restores module-level assignments as 'constant' |
# | r | language-pack `r` | .r .R .rmd | tags.scm | tags.scm | authored q | GAP: S4 setClass(contains=) / R5 setRefClass are calls, not syntax; not authored | functions are anonymous values bound by <- or =; tags capture those bindings |
# | racket | language-pack `racket` | .rkt .rktl .scrbl | tags.scm + authored q | tags.scm | authored q | authored q | shipped tags treat every list head as a call: special forms are dropped by call_stop; struct is added as a def |
# | ruby | language-pack `ruby` | .rb .rake .gemspec | tags.scm | tags.scm | authored q | authored q | require/include are calls to ordinary methods; mixins are read off include/extend/prepend inside a class body |
# | rust | language-pack `rust` | .rs | tags.scm + authored q | tags.scm + authored q | authored q | authored q | tags: struct/enum/union/type=class, trait=interface, mod=module, macro_rules=macro, macro invocation=call; code inside macro token trees is not parsed into calls; refine: fn in a mod body is a function, not a method |
# | scala | language-pack `scala` | .scala .sc .sbt | tags.scm + authored q | tags.scm | authored q | authored q | module text is the whole import_declaration minus the keyword |
# | scheme | language-pack `scheme` | .scm .ss .sld | authored q | authored q | authored q | n/a: Scheme has no inheritance clause | no shipped tags: defs read off `(define ...)` heads (R7RS special forms are the giver for call_stop) |
# | solidity | language-pack `solidity` | .sol | tags.scm + authored q | tags.scm | authored q | authored q |  |
# | sql | language-pack `sql` | .sql .ddl .dml | authored q | authored q | n/a: standard SQL has no import statement (psql \\i is a client meta-command) | n/a: standard SQL has no inheritance clause (INHERITS is vendor-specific) | no shipped tags; the generic derekstride grammar (dialect-neutral); the postgres grammar differs |
# | svelte | language-pack `svelte` | .svelte | injected script/style | injected script/style | injected script/style | n/a: components do not inherit | markup parsed by the svelte grammar; <script> and <style> bodies are parsed in javascript/typescript and css and merged (injection by included ranges) |
# | swift | language-pack `swift` | .swift | tags.scm | tags.scm + authored q | authored q | authored q | tags: class_declaration covers class/struct/enum/actor; protocol=interface; no shipped calls |
# | toml | language-pack `toml` | .toml | authored q | n/a: no call syntax | n/a: no import syntax | n/a: no inheritance | table headers declare named sections |
# | tsx | language-pack `tsx` | .tsx | tags.scm(typescript+javascript) + authored q | tags.scm(typescript+javascript) + authored q | authored q | authored q | same node kinds as typescript plus JSX; queries are the typescript ones |
# | typescript | language-pack `typescript` | .ts .mts .cts | tags.scm(typescript+javascript) + authored q | tags.scm(typescript+javascript) + authored q | authored q | authored q | typescript's tags.scm holds only TS additions and is meant to be composed with javascript's; neither has calls for TS member forms, type aliases, enums |
# | verilog | language-pack `verilog` | .v .sv .svh .vh | authored q | authored q | authored q | n/a: hardware modules do not inherit (SystemVerilog `class extends` is not authored here) | SystemVerilog grammar; instantiations and system tasks are the call-like forms; hardware has no inheritance except SV classes (not authored) |
# | vue | language-pack `vue` | .vue | injected script/style | injected script/style | injected script/style | n/a: components do not inherit | markup parsed by the vue grammar; <script> and <style> bodies are parsed in javascript/typescript and css and merged (injection by included ranges); template {{ }} expressions are not parsed |
# | yaml | language-pack `yaml` | .yaml .yml | authored q | n/a: no call syntax | n/a: no import syntax (include tags are application conventions) | n/a: no inheritance (merge keys are a convention) | anchors (&name) are the only declarations |
# | zig | language-pack `zig` | .zig .zon | authored q | authored q | authored q | n/a: Zig has no inheritance | no shipped tags; const X = struct/enum/union is a type; const X = @import is a module binding |
# @@TABLE-END@@

_SCHEME_CTX = _lisp(("list",), ("symbol",),
                    r"^(import|export|define-library|define-record-type|include|cond-expand|require|provide|module|module\\*|define-struct|struct)$",
                    r"^(lambda|λ|case-lambda|define-syntax-rule|syntax-rules|named-lambda)$",
                    r"^(let|let\\*|letrec|letrec\\*|let-values|let\\*-values|do|let-syntax|letrec-syntax|for|for/list|for/fold|for/vector|for/sum|for\\*|match-let|match-define)$",
                    r"^(cond|case|match|guard|case-lambda)$")
_CL_CTX = _lisp(("list_lit",), ("sym_lit",),
                r"^(?i:defclass|defpackage|in-package|defstruct|define-condition|defgeneric|use-package|require)$",
                r"^(?i:lambda)$",
                r"^(?i:let|let\\*|flet|labels|macrolet|do|do\\*|dolist|dotimes|destructuring-bind|multiple-value-bind|with-slots|with-accessors|symbol-macrolet)$",
                r"^(?i:cond|case|ecase|typecase|etypecase|handler-case|restart-case|handler-bind)$")
_CLJ_CTX = _lisp(("list_lit",), ("sym_lit",), r"^(defprotocol|definterface|ns)$", r"^(fn|fn\\*)$", r"^$a", r"^$a")

MAPS = {
    # @@MAPS-BEGIN@@
    # ---- batch 1: the C family, scripting mainstream ---------------------------------------
    "python": L("py pyi pyw", tags=True, notes="defs/calls: shipped tags.scm; its module-constant pattern targets an older grammar shape, so the authored defs query restores module-level assignments as 'constant'",
        defs='''
(module (assignment left: (identifier) @name) @definition.constant)
''',
        imports='''
(import_statement name: (dotted_name) @module)
(import_statement name: (aliased_import name: (dotted_name) @module))
(import_from_statement module_name: (dotted_name) @module)
(import_from_statement module_name: (relative_import) @module)
''',
        extends='''
(class_definition name: (identifier) @child
  superclasses: (argument_list [(identifier) @base.extends (attribute attribute: (identifier) @base.extends)]))
'''),
    "javascript": L("js mjs cjs jsx", tags=True, notes="jsx parses with this grammar; require()/import() count as imports",
        imports='''
(import_statement source: (string) @module)
(export_statement source: (string) @module)
(call_expression function: (identifier) @_f arguments: (arguments . (string) @module) (#eq? @_f "require"))
(call_expression function: (import) arguments: (arguments . (string) @module))
''',
        extends='''
(class_declaration name: (identifier) @child
  (class_heritage [(identifier) @base.extends (member_expression property: (property_identifier) @base.extends)]))
'''),
    "typescript": L("ts mts cts", tags=("typescript", "javascript"),
        notes="typescript's tags.scm holds only TS additions and is meant to be composed with javascript's; neither has calls for TS member forms, type aliases, enums",
        defs='''
(type_alias_declaration name: (type_identifier) @name) @definition.type
(enum_declaration name: (identifier) @name) @definition.enum
(class_declaration name: (type_identifier) @name) @definition.class
''',
        calls='''
(call_expression function: (identifier) @name) @reference.call
(call_expression function: (member_expression property: (property_identifier) @name)) @reference.call
(new_expression constructor: (identifier) @name) @reference.class
''',
        imports='''
(import_statement source: (string) @module)
(export_statement source: (string) @module)
(import_require_clause source: (string) @module)
(call_expression function: (identifier) @_f arguments: (arguments . (string) @module) (#eq? @_f "require"))
''',
        extends='''
(class_declaration name: (type_identifier) @child
  (class_heritage (extends_clause value: [(identifier) @base.extends (member_expression property: (property_identifier) @base.extends)])))
(class_declaration name: (type_identifier) @child
  (class_heritage (implements_clause [(type_identifier) @base.implements (nested_type_identifier name: (type_identifier) @base.implements)])))
(abstract_class_declaration name: (type_identifier) @child
  (class_heritage (extends_clause value: [(identifier) @base.extends (member_expression property: (property_identifier) @base.extends)])))
(abstract_class_declaration name: (type_identifier) @child
  (class_heritage (implements_clause [(type_identifier) @base.implements (nested_type_identifier name: (type_identifier) @base.implements)])))
(interface_declaration name: (type_identifier) @child
  (extends_type_clause type: [(type_identifier) @base.extends (nested_type_identifier name: (type_identifier) @base.extends)]))
'''),
    "tsx": L("tsx", tags=("typescript", "javascript"), notes="same node kinds as typescript plus JSX; queries are the typescript ones",
        defs='''
(type_alias_declaration name: (type_identifier) @name) @definition.type
(enum_declaration name: (identifier) @name) @definition.enum
(class_declaration name: (type_identifier) @name) @definition.class
''',
        calls='''
(call_expression function: (identifier) @name) @reference.call
(call_expression function: (member_expression property: (property_identifier) @name)) @reference.call
(new_expression constructor: (identifier) @name) @reference.class
''',
        imports='''
(import_statement source: (string) @module)
(export_statement source: (string) @module)
(import_require_clause source: (string) @module)
(call_expression function: (identifier) @_f arguments: (arguments . (string) @module) (#eq? @_f "require"))
''',
        extends='''
(class_declaration name: (type_identifier) @child
  (class_heritage (extends_clause value: [(identifier) @base.extends (member_expression property: (property_identifier) @base.extends)])))
(class_declaration name: (type_identifier) @child
  (class_heritage (implements_clause [(type_identifier) @base.implements (nested_type_identifier name: (type_identifier) @base.implements)])))
(interface_declaration name: (type_identifier) @child
  (extends_type_clause type: [(type_identifier) @base.extends (nested_type_identifier name: (type_identifier) @base.extends)]))
'''),
    "java": L("java", tags=True, notes="shipped tags lacks enums and records",
        defs='''
(enum_declaration name: (identifier) @name) @definition.enum
(record_declaration name: (identifier) @name) @definition.class
(annotation_type_declaration name: (identifier) @name) @definition.interface
''',
        imports='''
(import_declaration (scoped_identifier) @module)
(import_declaration (identifier) @module)
''',
        extends='''
(class_declaration name: (identifier) @child superclass: (superclass (type_identifier) @base.extends))
(class_declaration name: (identifier) @child interfaces: (super_interfaces (type_list (type_identifier) @base.implements)))
(interface_declaration name: (identifier) @child (extends_interfaces (type_list (type_identifier) @base.extends)))
(enum_declaration name: (identifier) @child interfaces: (super_interfaces (type_list (type_identifier) @base.implements)))
'''),
    "c": L("c h", tags=True, notes="'.h' is read as C (C++ headers need language=cpp); function_declarator tags give prototypes too",
        defs='''
(preproc_def name: (identifier) @name) @definition.macro
(preproc_function_def name: (identifier) @name) @definition.macro
''',
        calls='''
(call_expression function: (identifier) @name) @reference.call
(call_expression function: (field_expression field: (field_identifier) @name)) @reference.call
''',
        imports='''
(preproc_include path: [(string_literal) (system_lib_string)] @module)
''',
        na={"extends": "C has no inheritance or interface clause"}),
    "cpp": L("cpp cc cxx hpp hh hxx ipp", tags=True, notes="tags give classes, functions, calls, impl; authored adds macros, namespaces, includes, bases",
        defs='''
(preproc_def name: (identifier) @name) @definition.macro
(preproc_function_def name: (identifier) @name) @definition.macro
(namespace_definition name: (namespace_identifier) @name) @definition.module
(struct_specifier name: (type_identifier) @name body: (_)) @definition.class
(enum_specifier name: (type_identifier) @name) @definition.type
(alias_declaration name: (type_identifier) @name) @definition.type
(function_declarator declarator: (field_identifier) @name) @definition.method
(function_declarator declarator: (qualified_identifier name: (identifier) @name)) @definition.function
(function_declarator declarator: (destructor_name) @name) @definition.method
''',
        calls='''
(call_expression function: (qualified_identifier name: (identifier) @name)) @reference.call
(call_expression function: (template_function name: (identifier) @name)) @reference.call
(call_expression function: (qualified_identifier name: (template_function name: (identifier) @name))) @reference.call
''',
        imports='''
(preproc_include path: [(string_literal) (system_lib_string)] @module)
(using_declaration (qualified_identifier) @module)
''',
        extends='''
(class_specifier name: (type_identifier) @child
  (base_class_clause [(type_identifier) @base.extends (qualified_identifier name: (type_identifier) @base.extends) (template_type name: (type_identifier) @base.extends)]))
(struct_specifier name: (type_identifier) @child
  (base_class_clause [(type_identifier) @base.extends (qualified_identifier name: (type_identifier) @base.extends) (template_type name: (type_identifier) @base.extends)]))
'''),
    "csharp": L("cs", tags=True, notes="shipped tags: class/interface/method/namespace, invocation as reference.send; authored adds struct/enum/record",
        defs='''
(struct_declaration name: (identifier) @name) @definition.class
(enum_declaration name: (identifier) @name) @definition.enum
(record_declaration name: (identifier) @name) @definition.class
''',
        calls='''
(invocation_expression function: (identifier) @name) @reference.call
(invocation_expression function: (generic_name (identifier) @name)) @reference.call
(invocation_expression function: (member_access_expression name: (generic_name (identifier) @name))) @reference.call
''',
        imports='''
(using_directive [(qualified_name) (identifier)] @module)
''',
        extends='''
(class_declaration name: (identifier) @child (base_list [(identifier) @base.base (qualified_name name: (identifier) @base.base) (generic_name (identifier) @base.base)]))
(struct_declaration name: (identifier) @child (base_list [(identifier) @base.base (qualified_name name: (identifier) @base.base) (generic_name (identifier) @base.base)]))
(interface_declaration name: (identifier) @child (base_list [(identifier) @base.extends (qualified_name name: (identifier) @base.extends) (generic_name (identifier) @base.extends)]))
(record_declaration name: (identifier) @child (base_list [(identifier) @base.base (qualified_name name: (identifier) @base.base)]))
'''),
    "go": L("go", tags=True, notes="tags: func/method/type; embedding is the only inheritance-like relation",
        imports='''
(import_spec path: (interpreted_string_literal) @module)
(import_spec path: (raw_string_literal) @module)
''',
        extends='''
(type_spec name: (type_identifier) @child type: (struct_type (field_declaration_list (field_declaration !name type: [(type_identifier) @base.embeds (pointer_type (type_identifier) @base.embeds) (qualified_type name: (type_identifier) @base.embeds)]))))
(type_spec name: (type_identifier) @child type: (interface_type (type_elem [(type_identifier) @base.embeds (qualified_type name: (type_identifier) @base.embeds)])))
'''),
    "rust": L("rs", tags=True, notes="tags: struct/enum/union/type=class, trait=interface, mod=module, macro_rules=macro, macro invocation=call; code inside macro token trees is not parsed into calls; refine: fn in a mod body is a function, not a method",
        refine=_rust_refine,
        defs='''
(function_signature_item name: (identifier) @name) @definition.method
(const_item name: (identifier) @name) @definition.constant
(static_item name: (identifier) @name) @definition.constant
''',
        calls='''
(call_expression function: (scoped_identifier name: (identifier) @name)) @reference.call
(call_expression function: (generic_function function: (identifier) @name)) @reference.call
(call_expression function: (generic_function function: (scoped_identifier name: (identifier) @name))) @reference.call
(call_expression function: (generic_function function: (field_expression field: (field_identifier) @name))) @reference.call
''',
        imports='''
(use_declaration argument: (_) @module)
(extern_crate_declaration name: (identifier) @module)
''',
        extends='''
(impl_item trait: [(type_identifier) @base.implements (scoped_type_identifier name: (type_identifier) @base.implements) (generic_type type: (type_identifier) @base.implements)]
  type: [(type_identifier) @child (generic_type type: (type_identifier) @child) (scoped_type_identifier name: (type_identifier) @child)])
(trait_item name: (type_identifier) @child bounds: (trait_bounds [(type_identifier) @base.extends (scoped_type_identifier name: (type_identifier) @base.extends) (generic_type type: (type_identifier) @base.extends)]))
'''),
    "ruby": L("rb rake gemspec", tags=True, notes="require/include are calls to ordinary methods; mixins are read off include/extend/prepend inside a class body",
        imports='''
(call method: (identifier) @_m arguments: (argument_list . (string) @module) (#any-of? @_m "require" "require_relative" "load" "autoload"))
''',
        extends='''
(class name: [(constant) @child (scope_resolution name: (constant) @child)]
  superclass: (superclass [(constant) @base.extends (scope_resolution name: (constant) @base.extends)]))
(class name: [(constant) @child (scope_resolution name: (constant) @child)]
  (body_statement (call method: (identifier) @_m arguments: (argument_list [(constant) @base.mixin (scope_resolution name: (constant) @base.mixin)]) (#any-of? @_m "include" "extend" "prepend"))))
(module name: [(constant) @child (scope_resolution name: (constant) @child)]
  (body_statement (call method: (identifier) @_m arguments: (argument_list [(constant) @base.mixin (scope_resolution name: (constant) @base.mixin)]) (#any-of? @_m "include" "extend" "prepend"))))
'''),
    "php": L("php phtml php3 php4 php5 php7 phps", tags=True, notes="tags: class/interface/function/method + calls",
        defs='''
(trait_declaration name: (name) @name) @definition.interface
(enum_declaration name: (name) @name) @definition.enum
''',
        imports='''
(namespace_use_clause . [(qualified_name) (name)] @module)
(include_expression [(string) (encapsed_string)] @module)
(include_once_expression [(string) (encapsed_string)] @module)
(require_expression [(string) (encapsed_string)] @module)
(require_once_expression [(string) (encapsed_string)] @module)
''',
        extends='''
(class_declaration name: (name) @child (base_clause [(name) @base.extends (qualified_name (name) @base.extends)]))
(class_declaration name: (name) @child (class_interface_clause [(name) @base.implements (qualified_name (name) @base.implements)]))
(interface_declaration name: (name) @child (base_clause [(name) @base.extends (qualified_name (name) @base.extends)]))
(class_declaration name: (name) @child body: (declaration_list (use_declaration [(name) @base.mixin (qualified_name (name) @base.mixin)])))
'''),
    # ---- batch 2: mobile/JVM/functional/scripting + data and markup formats ------------------
    "swift": L("swift", tags=True, notes="tags: class_declaration covers class/struct/enum/actor; protocol=interface; no shipped calls",
        calls='''
(call_expression (simple_identifier) @name) @reference.call
(call_expression (navigation_expression suffix: (navigation_suffix suffix: (simple_identifier) @name))) @reference.call
''',
        imports='''
(import_declaration (identifier) @module)
''',
        extends='''
(class_declaration name: (type_identifier) @child (inheritance_specifier inherits_from: (user_type (type_identifier) @base.inherits)))
(protocol_declaration name: (type_identifier) @child (inheritance_specifier inherits_from: (user_type (type_identifier) @base.inherits)))
'''),
    "kotlin": L("kt kts", tags=True, notes="kotlin grammar has no field names; interface/class are class_declaration. KNOWN GRAMMAR LIMIT: a top-level `object Name { }` can parse (without any ERROR) as an object_literal expression, so object declarations are not reliably defs",
        defs='''
(type_alias (type_identifier) @name) @definition.type
''',
        calls='''
(call_expression (simple_identifier) @name) @reference.call
(call_expression (navigation_expression (navigation_suffix (simple_identifier) @name))) @reference.call
''',
        imports='''
(import_header (identifier) @module)
''',
        extends='''
(class_declaration (type_identifier) @child (delegation_specifier [(constructor_invocation (user_type (type_identifier) @base.extends)) (user_type (type_identifier) @base.implements)]))
'''),
    "scala": L("scala sc sbt", tags=True, notes="module text is the whole import_declaration minus the keyword",
        import_clean=(r"^\s*import\s+", ""),
        defs='''
(function_declaration name: (identifier) @name) @definition.method
(object_definition name: (identifier) @name) @definition.module
(trait_definition name: (identifier) @name) @definition.interface
''',
        imports='''
(import_declaration) @module
''',
        extends='''
(class_definition name: (identifier) @child extend: (extends_clause [(type_identifier) @base.extends (generic_type type: (type_identifier) @base.extends)]))
(trait_definition name: (identifier) @child extend: (extends_clause [(type_identifier) @base.extends (generic_type type: (type_identifier) @base.extends)]))
(object_definition name: (identifier) @child extend: (extends_clause [(type_identifier) @base.extends (generic_type type: (type_identifier) @base.extends)]))
'''),
    "haskell": L("hs lhs", notes="no shipped tags: defs authored; multi-clause functions yield one def per clause",
        defs='''
(declarations (function name: (variable) @name) @definition.function)
(declarations (bind name: (variable) @name) @definition.constant)
(class name: (name) @name) @definition.interface
(data_type name: (name) @name) @definition.type
(newtype name: (name) @name) @definition.type
(type_synonym name: (name) @name) @definition.type
(class_declarations (signature name: (variable) @name) @definition.method)
(instance_declarations (function name: (variable) @name) @definition.method)
(data_constructor constructor: (prefix name: (constructor) @name)) @definition.variant
(data_constructor constructor: (record name: (constructor) @name)) @definition.variant
''',
        calls='''
(apply function: (variable) @name) @reference.call
(apply function: (qualified (variable) @name)) @reference.call
''',
        imports='''
(import module: (module) @module)
''',
        extends='''
(instance name: (name) @base.instance patterns: (type_patterns . (name) @child))
(instance name: (qualified (name) @base.instance) patterns: (type_patterns . (name) @child))
'''),
    "lua": L("lua", tags=True,
        imports='''
(function_call name: (identifier) @_f arguments: (arguments . (string) @module) (#eq? @_f "require"))
''',
        na={"extends": "Lua declares no inheritance; prototype chains are built by setmetatable calls, which are calls, not declarations"}),
    "perl": L("pl pm t", notes="no shipped tags; package=class",
        gaps={"extends": "inheritance is `use parent`/`@ISA` relative to the enclosing package; one tree query cannot scope it (needs a procedural pass)"},
        atomic=("heredoc_content", "regexp_content", "replacement", "transliteration_content", "quoted_word_list"),
        tok={"bareword": "identifier", "varname": "identifier", "autoquoted_bareword": "string", "method": "identifier",
             "function": "identifier", "package": "identifier", "php_tag": "other", "heredoc_content": "string",
             "regexp_content": "string", "replacement": "string", "transliteration_content": "string", "quoted_word_list": "string"},
        defs='''
(subroutine_declaration_statement name: (bareword) @name) @definition.function
(package_statement name: (package) @name) @definition.class
(method_declaration_statement name: (bareword) @name) @definition.method
(class_statement name: (package) @name) @definition.class
''',
        calls='''
(function_call_expression function: (function) @name) @reference.call
(method_call_expression method: (method) @name) @reference.call
(ambiguous_function_call_expression function: (function) @name) @reference.call
''',
        imports='''
(use_statement module: (package) @module)
(require_expression (bareword) @module)
(require_expression (string_literal) @module)
'''),
    "r": L("r R rmd", tags=True, notes="functions are anonymous values bound by <- or =; tags capture those bindings",
        gaps={"extends": "S4 setClass(contains=) / R5 setRefClass are calls, not syntax; not authored"},
        tok={"comma": "punctuation"},
        imports='''
(call function: (identifier) @_f arguments: (arguments argument: (argument value: [(identifier) (string)] @module)) (#any-of? @_f "library" "require" "requireNamespace" "loadNamespace"))
'''),
    "julia": L("jl", notes="no shipped tags; a call whose callee is the defining name of a def is dropped (signatures parse as calls)",
        defs='''
(module_definition name: (identifier) @name) @definition.module
(struct_definition (type_head [(identifier) @name (binary_expression . (identifier) @name)])) @definition.class
(abstract_definition (type_head [(identifier) @name (binary_expression . (identifier) @name)])) @definition.class
(primitive_definition (type_head [(identifier) @name (binary_expression . (identifier) @name)])) @definition.class
(function_definition (signature (call_expression . (identifier) @name))) @definition.function
(function_definition (signature (typed_expression (call_expression . (identifier) @name)))) @definition.function
(assignment . (call_expression . (identifier) @name)) @definition.function
(macro_definition (signature (call_expression . (identifier) @name))) @definition.macro
(const_statement (assignment . (identifier) @name)) @definition.constant
''',
        calls='''
(call_expression . (identifier) @name) @reference.call
(call_expression . (field_expression (identifier) @name .)) @reference.call
''',
        imports='''
(using_statement (identifier) @module)
(using_statement (selected_import . (identifier) @module))
(import_statement (identifier) @module)
(import_statement (selected_import . (identifier) @module))
''',
        extends='''
(struct_definition (type_head (binary_expression . (identifier) @child (operator) @_o . (identifier) @base.extends) (#eq? @_o "<:")))
(abstract_definition (type_head (binary_expression . (identifier) @child (operator) @_o . (identifier) @base.extends) (#eq? @_o "<:")))
'''),
    "bash": L("sh bash zsh ksh bats", notes="no shipped tags; every command_name is a call (builtins included)",
        defs='''
(function_definition name: (word) @name) @definition.function
(program (variable_assignment name: (variable_name) @name) @definition.variable)
''',
        calls='''
(command name: (command_name (word) @name)) @reference.call
''',
        imports='''
(command name: (command_name (word) @_c) . argument: (word) @module (#any-of? @_c "source" "."))
''',
        na={"extends": "shell has no inheritance"},
        tok={"word<command_name": "identifier", "word<function_definition": "identifier", "test_operator": "operator",
             "special_variable_name": "identifier", "variable_name": "identifier"}),
    "sql": L("sql ddl dml", notes="no shipped tags; the generic derekstride grammar (dialect-neutral); the postgres grammar differs",
        defs='''
(create_table (object_reference name: (identifier) @name)) @definition.table
(create_view (object_reference name: (identifier) @name)) @definition.view
(create_materialized_view (object_reference name: (identifier) @name)) @definition.view
(create_function (object_reference name: (identifier) @name)) @definition.function
(create_index column: (identifier) @name) @definition.index
(create_type (object_reference name: (identifier) @name)) @definition.type
(create_sequence (object_reference name: (identifier) @name)) @definition.sequence
(create_schema (identifier) @name) @definition.schema
(create_trigger (object_reference name: (identifier) @name)) @definition.trigger
''',
        calls='''
(invocation (object_reference name: (identifier) @name)) @reference.call
''',
        na={"imports": "standard SQL has no import statement (psql \\\\i is a client meta-command)",
            "extends": "standard SQL has no inheritance clause (INHERITS is vendor-specific)"},
        tokre=[(r"^keyword_", "keyword")], tok={"dollar_quote": "punctuation", "literal": "literal"}),
    "html": L("html htm xhtml", notes="id attribute values declare addressable entities; embedded script/style (raw_text) are NOT parsed in their own grammar",
        defs='''
(attribute (attribute_name) @_n (quoted_attribute_value (attribute_value) @name) (#eq? @_n "id")) @definition.id
''',
        imports='''
(script_element (start_tag (attribute (attribute_name) @_n (quoted_attribute_value (attribute_value) @module) (#eq? @_n "src"))))
(element (start_tag (tag_name) @_t (attribute (attribute_name) @_n (quoted_attribute_value (attribute_value) @module) (#eq? @_n "href"))) (#eq? @_t "link"))
(element (start_tag (tag_name) @_t (attribute (attribute_name) @_n (quoted_attribute_value (attribute_value) @module) (#eq? @_n "src"))) (#any-of? @_t "img" "iframe" "source" "embed"))
''',
        inject=True,
        na={"extends": "markup has no inheritance"},
        atomic=("quoted_attribute_value",),
        tok={"<": "punctuation", ">": "punctuation", "</": "punctuation", "/>": "punctuation", "=": "punctuation",
             "<!": "punctuation", "attribute_value": "string", "text": "other", "raw_text": "other", "doctype": "keyword"}),
    "css": L("css", notes="custom property declarations and @keyframes names declare; class/id selectors are uses of HTML-side names, not declarations",
        defs='''
(declaration (property_name) @name (#match? @name "^--")) @definition.variable
(keyframes_statement (keyframes_name) @name) @definition.keyframes
''',
        calls='''
(call_expression (function_name) @name) @reference.call
''',
        imports='''
(import_statement (call_expression (function_name) (arguments (string_value) @module)))
(import_statement (string_value) @module)
''',
        na={"extends": "CSS has no inheritance clause"},
        atomic=("color_value", "integer_value", "float_value"),
        tok={"from": "keyword", "to": "keyword", "plain_value": "other", "property_name": "identifier", "color_value": "literal",
             "integer_value": "literal", "float_value": "literal"}),
    "json": L("json jsonc geojson webmanifest", notes="data format",
        na={"defs": "JSON declares no named entities (object keys are data, not declarations)", "calls": "no call syntax",
            "imports": "no import syntax", "extends": "no inheritance"}),
    "yaml": L("yaml yml", notes="anchors (&name) are the only declarations",
        defs='''
(anchor (anchor_name) @name) @definition.anchor
''',
        calls=None,
        na={"calls": "no call syntax", "imports": "no import syntax (include tags are application conventions)", "extends": "no inheritance (merge keys are a convention)"},
        atomic=("double_quote_scalar", "single_quote_scalar", "block_scalar"),
        tok={"string_scalar": "string", "anchor_name": "identifier", "alias_name": "identifier", "double_quote_scalar": "string",
             "single_quote_scalar": "string", "block_scalar": "string"}),
    "toml": L("toml", notes="table headers declare named sections",
        defs='''
(table . (bare_key) @name) @definition.table
(table . (dotted_key) @name) @definition.table
(table_array_element . (bare_key) @name) @definition.table
(table_array_element . (dotted_key) @name) @definition.table
''',
        na={"calls": "no call syntax", "imports": "no import syntax", "extends": "no inheritance"},
        atomic=("quoted_key",), tok={"bare_key": "identifier", "quoted_key": "string"}),
    "zig": L("zig zon", notes="no shipped tags; const X = struct/enum/union is a type; const X = @import is a module binding",
        defs='''
(FnProto function: (IDENTIFIER) @name) @definition.function
(VarDecl variable_type_function: (IDENTIFIER) @name) @definition.constant
(VarDecl variable_type_function: (IDENTIFIER) @name (ErrorUnionExpr (SuffixExpr (ContainerDecl)))) @definition.class
(VarDecl variable_type_function: (IDENTIFIER) @name (ErrorUnionExpr (SuffixExpr (BUILTINIDENTIFIER) @_b)) (#eq? @_b "@import")) @definition.module
''',
        calls='''
(SuffixExpr variable_type_function: (IDENTIFIER) @name . (FnCallArguments)) @reference.call
(FieldOrFnCall function_call: (IDENTIFIER) @name) @reference.call
''',
        imports='''
(SuffixExpr (BUILTINIDENTIFIER) @_b . (FnCallArguments (ErrorUnionExpr (SuffixExpr (STRINGLITERALSINGLE) @module))) (#eq? @_b "@import"))
''',
        na={"extends": "Zig has no inheritance"},
        tok={"IDENTIFIER": "identifier", "INTEGER": "literal", "FLOAT": "literal", "BuildinTypeExpr": "type",
             "BUILTINIDENTIFIER": "identifier"}, atomic=("STRINGLITERALSINGLE", "CHAR_LITERAL", "BUILTINIDENTIFIER")),
    # ---- batch 3: functional / lisp / systems / hardware / contracts / docs --------------------
    "ocaml": L("ml mli", tags=True, call_stop=r"^[^\w]+$", notes="tags: modules, classes, methods, types, constructors, fields, let-bound functions; infix operator applications (callee with no letter) are not counted as calls",
        tok={"value_pattern": "identifier", "mult_operator": "operator", "add_operator": "operator", "rel_operator": "operator",
             "concat_operator": "operator", "pow_operator": "operator", "assign_operator": "operator", "hash_operator": "operator",
             "value_name": "identifier", "module_name": "identifier", "constructor_name": "identifier", "class_name": "identifier",
             "method_name": "identifier", "field_name": "identifier", "type_constructor": "type", "label_name": "identifier"},
        imports='''
(open_module module: (module_path) @module)
(include_module module: (module_path) @module)
''',
        extends='''
(class_binding (class_name) @child body: (object_expression (inheritance_definition class: (class_path (class_name) @base.inherits))))
'''),
    "elixir": L("ex exs", tags=True, notes="everything is a call; the shipped tags ignore def/defmodule/etc. as callees (@ignore ranges are honoured)",
        tok={"alias": "identifier", "keyword": "literal", "atom": "literal", "quoted_atom": "literal"},
        defs='''
(call target: (identifier) @_d (arguments (alias) @name) (#eq? @_d "defimpl")) @definition.module
(call target: (identifier) @_d (arguments (alias) @name) (#eq? @_d "defexception")) @definition.class
''',
        imports='''
(call target: (identifier) @_t (arguments . (alias) @module) (#any-of? @_t "alias" "import" "require" "use"))
''',
        extends='''
(call target: (identifier) @_d (arguments . (alias) @child) (do_block (call target: (identifier) @_u (arguments . (alias) @base.uses) (#eq? @_u "use"))) (#any-of? @_d "defmodule" "defprotocol"))
(call target: (identifier) @_d (arguments . (alias) @child) (do_block (unary_operator operand: (call target: (identifier) @_b (arguments . (alias) @base.behaviour)) (#eq? @_b "behaviour"))) (#any-of? @_d "defmodule" "defprotocol"))
'''),
    "erlang": L("erl hrl", notes="no shipped tags; each clause of a function is a def (multi-clause functions repeat the name)",
        defs='''
(fun_decl clause: (function_clause name: (atom) @name)) @definition.function
(module_attribute name: (atom) @name) @definition.module
(record_decl name: (atom) @name) @definition.type
(type_alias name: (type_name name: (atom) @name)) @definition.type
(opaque name: (type_name name: (atom) @name)) @definition.type
(pp_define lhs: (macro_lhs name: (var) @name)) @definition.macro
(pp_define lhs: (macro_lhs name: (atom) @name)) @definition.macro
''',
        calls='''
(call expr: (atom) @name) @reference.call
''',
        imports='''
(import_attribute module: (atom) @module)
(pp_include file: (string) @module)
(pp_include_lib file: (string) @module)
''',
        extends='''
((module_attribute name: (atom) @child) (behaviour_attribute name: (atom) @base.behaviour))
'''),
    "clojure": L("clj cljs cljc edn", call_ctx=_CLJ_CTX, call_stop=r"^(def|defn|defn-|defmacro|defmulti|defmethod|defonce|defprotocol|defrecord|deftype|definterface|ns|let|letfn|if|if-let|if-not|if-some|when|when-let|when-not|when-some|cond|condp|case|do|fn|loop|recur|quote|var|throw|try|catch|finally|binding|doseq|dotimes|for|->|->>|and|or|not|require|import|use)$",
        notes="no shipped tags: defs are read off the head symbol of a list (clojure.org special forms + defining macros); call_stop drops special forms and defining heads from calls",
        defs='''
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#any-of? @_h "defn" "defn-" "defmulti" "defmethod")) @definition.function
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#eq? @_h "defmacro")) @definition.macro
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#any-of? @_h "def" "defonce")) @definition.constant
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#any-of? @_h "defprotocol" "definterface")) @definition.interface
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#any-of? @_h "defrecord" "deftype")) @definition.class
(list_lit . value: (sym_lit name: (sym_name) @_h) . value: (sym_lit name: (sym_name) @name) (#eq? @_h "ns")) @definition.module
''',
        calls='''
(list_lit . value: (sym_lit name: (sym_name) @name)) @reference.call
''',
        imports='''
(list_lit value: (kwd_lit name: (kwd_name) @_k) value: (vec_lit . value: (sym_lit name: (sym_name) @module)) (#any-of? @_k "require" "use" "import"))
(list_lit value: (kwd_lit name: (kwd_name) @_k) value: (sym_lit name: (sym_name) @module) (#any-of? @_k "require" "use" "import"))
''',
        na={"extends": "Clojure has no inheritance clause (protocols/records implement, not extend)"},
        tok={"sym_name": "identifier", "kwd_name": "identifier", "marker": "punctuation", "num_lit": "literal", "nil_lit": "literal",
             "bool_lit": "literal", "char_lit": "literal", "kwd_ns": "identifier", "sym_ns": "identifier"}),
    "dart": L("dart", tags=True, shipped_calls=False,
        notes="the shipped reference.call pattern matches every identifier (all selectors optional), so it is discarded and calls are authored: an identifier or member name followed by an argument_part",
        calls='''
((identifier) @name @reference.call . (selector (argument_part)))
((selector (unconditional_assignable_selector (identifier) @name @reference.call)) . (selector (argument_part)))
''',
        defs='''
(mixin_declaration (identifier) @name) @definition.class
(enum_declaration name: (identifier) @name) @definition.enum
(extension_declaration name: (identifier) @name) @definition.class
(type_alias (type_identifier) @name) @definition.type
''',
        imports='''
(configurable_uri (uri (string_literal) @module))
''',
        extends='''
(class_definition name: (identifier) @child superclass: (superclass (type_identifier) @base.extends))
(class_definition name: (identifier) @child superclass: (superclass (mixins (type_identifier) @base.mixin)))
(class_definition name: (identifier) @child interfaces: (interfaces (type_identifier) @base.implements))
'''),
    "elm": L("elm", tags=True,
        defs='''
(type_alias_declaration name: (upper_case_identifier) @name) @definition.type
''',
        calls='''
(function_call_expr target: (value_expr name: (value_qid (lower_case_identifier) @name .))) @reference.call
''',
        imports='''
(import_clause moduleName: (upper_case_qid) @module)
''',
        na={"extends": "Elm has no inheritance"},
        tok={"module": "keyword", "import": "keyword", "type": "keyword", "alias": "keyword", "exposing": "keyword",
             "port": "keyword", "case": "keyword", "of": "keyword", "if": "keyword", "then": "keyword", "else": "keyword",
             "let": "keyword", "in": "keyword", "open_quote": "punctuation", "close_quote": "punctuation", "eq": "operator", "colon": "punctuation", "arrow": "operator", "pipe": "punctuation",
             "dot": "punctuation", "backslash": "operator", "operator_identifier": "operator", "upper_case_identifier": "identifier",
             "lower_case_identifier": "identifier", "number_literal": "literal", "string_constant": "string", "regular_string_part": "string"}),
    "fortran": L("f90 f95 f03 f08 f for ftn f77", tags=True,
        defs='''
(derived_type_statement (type_name) @name) @definition.class
(program_statement (name) @name) @definition.module
(subroutine_statement name: (name) @name) @definition.function
''',
        calls='''
(subroutine_call (identifier) @name) @reference.call
(call_expression (identifier) @name) @reference.call
''',
        imports='''
(use_statement (module_name) @module)
(include_statement (filename) @module)
''',
        extends='''
(derived_type_statement base: (base_type_specifier (identifier) @base.extends) (type_name) @child)
''',
        tok={"none": "keyword", "type_member": "identifier", "module_name": "identifier", "type_name": "type", "number_literal": "literal"}),
    "commonlisp": L("lisp cl asd", tags=True, call_ctx=_CL_CTX, call_stop=r"^(defun|defmacro|defvar|defparameter|defconstant|defclass|defgeneric|defmethod|defstruct|defpackage|in-package|let|let\\*|flet|labels|if|when|unless|cond|case|progn|lambda|quote|setf|setq|loop|dolist|dotimes|do|and|or|not|declare|the|function|multiple-value-bind|handler-case|unwind-protect)$",
        notes="shipped tags use @ignore and empty-suffix captures; ignore ranges are honoured and special forms are dropped from calls",
        imports='''
(list_lit . value: (sym_lit) @_h value: (kwd_lit (kwd_symbol) @module) (#match? @_h "^(?i:in-package|use-package|require)$"))
''',
        gaps={"extends": "superclasses are the list after the class name in defclass; not authored"}),
    "scheme": L("scm ss sld", call_ctx=_SCHEME_CTX, call_stop=r"^(define|define-syntax|define-record-type|define-values|lambda|let|let\\*|letrec|letrec\\*|let-values|if|cond|case|and|or|when|unless|do|begin|set!|quote|quasiquote|unquote|import|export|library|else|delay|parameterize|guard)$",
        notes="no shipped tags: defs read off `(define ...)` heads (R7RS special forms are the giver for call_stop)",
        defs='''
(list . (symbol) @_h . (list . (symbol) @name) (#eq? @_h "define")) @definition.function
(list . (symbol) @_h . (symbol) @name (#eq? @_h "define")) @definition.constant
(list . (symbol) @_h . (list . (symbol) @name) (#eq? @_h "define-syntax")) @definition.macro
(list . (symbol) @_h . (symbol) @name (#eq? @_h "define-syntax")) @definition.macro
(list . (symbol) @_h . (symbol) @name (#eq? @_h "define-record-type")) @definition.class
''',
        calls='''
(list . (symbol) @name) @reference.call
''',
        imports='''
(list . (symbol) @_h (list) @module (#eq? @_h "import"))
''', import_clean=(r"^\((.*)\)$", r"\1"),
        na={"extends": "Scheme has no inheritance clause"}),
    "racket": L("rkt rktl scrbl", tags=True, call_ctx=_SCHEME_CTX, call_stop=r"^(define|define/contract|define-syntax|define-syntax-rule|define-values|struct|lambda|λ|let|let\\*|letrec|if|cond|case|and|or|when|unless|begin|set!|quote|require|provide|module|module\\*|for|for/list|for/fold|match|else)$",
        notes="shipped tags treat every list head as a call: special forms are dropped by call_stop; struct is added as a def",
        defs='''
(list . (symbol) @_h . (symbol) @name (#eq? @_h "define")) @definition.constant
(list . (symbol) @_h . (symbol) @name (#eq? @_h "struct")) @definition.class
(list . (symbol) @_h . (list . (symbol) @name) (#eq? @_h "define-syntax-rule")) @definition.macro
''',
        imports='''
(list . (symbol) @_h [(symbol) (string)] @module (#eq? @_h "require"))
''',
        extends='''
(list . (symbol) @_h . (symbol) @child . (symbol) @base.extends (#eq? @_h "struct"))
'''),
    "verilog": L("v sv svh vh", notes="SystemVerilog grammar; instantiations and system tasks are the call-like forms; hardware has no inheritance except SV classes (not authored)",
        defs='''
(module_declaration (module_header (simple_identifier) @name)) @definition.module
(interface_declaration [(interface_nonansi_header (interface_identifier (simple_identifier) @name)) (interface_ansi_header (interface_identifier (simple_identifier) @name))]) @definition.module
(package_declaration (package_identifier (simple_identifier) @name)) @definition.module
(function_declaration (function_body_declaration (function_identifier (simple_identifier) @name))) @definition.function
(task_declaration (task_body_declaration (task_identifier (simple_identifier) @name))) @definition.function
(class_declaration (class_identifier (simple_identifier) @name)) @definition.class
''',
        calls='''
(module_instantiation (simple_identifier) @name) @reference.instance
(system_tf_call (system_tf_identifier) @name) @reference.call
''',
        imports='''
(include_compiler_directive (double_quoted_string) @module)
(package_import_item (package_identifier (simple_identifier) @module))
''',
        na={"extends": "hardware modules do not inherit (SystemVerilog `class extends` is not authored here)"},
        tok={"simple_identifier": "identifier", "system_tf_identifier": "identifier", "unsigned_number": "literal",
             "real_number": "literal", "string_literal": "string", "double_quoted_string": "string", "port_identifier": "identifier"}),
    "nim": L("nim nims nimble", notes="no shipped tags; routine = proc/func/method/iterator/template/macro",
        defs='''
(routine . (keyw) . (symbol (ident) @name)) @definition.function
(typeDef (symbol (ident) @name) . (primaryTypeDef)) @definition.type
''',
        calls='''
(primary (symbol (ident) @name) . (primarySuffix [(functionCall) (cmdCall)])) @reference.call
(primary (symbol) (primarySuffix (qualifiedSuffix (symbol (ident) @name))) . (primarySuffix [(functionCall) (cmdCall)])) @reference.call
''',
        imports='''
(stmt (importStmt (expr (primary (symbol (ident) @module)))))
(fromStmt (keyw) . (expr (primary (symbol (ident) @module))))
''',
        extends='''
(typeDef (symbol (ident) @child) . (primaryTypeDef (objectDecl (keyw) (typeDesc (primaryTypeDesc (symbol (ident) @base.extends))))))
(typeDef (symbol (ident) @child) . (primaryTypeDef (primaryPrefix) (objectDecl (keyw) (typeDesc (primaryTypeDesc (symbol (ident) @base.extends))))))
''',
        tok={"keyw": "keyword", "ident": "identifier", "float_lit": "literal", "int_lit": "literal", "operator": "operator"}),
    "groovy": L("groovy gvy gradle", module=("tree_sitter_groovy", "language"),
        notes="the language-pack groovy grammar is a 61-kind toy with no declarations or keywords; this row uses the standalone tree-sitter-groovy 0.1.2 (amaanq, MIT). It needs `;` terminators: semicolon-less Groovy parses with MISSING nodes",
        defs='''
(class_declaration name: (identifier) @name) @definition.class
(interface_declaration name: (identifier) @name) @definition.interface
(method_declaration name: (identifier) @name) @definition.method
(function_definition name: (identifier) @name) @definition.function
(enum_declaration name: (identifier) @name) @definition.enum
''',
        calls='''
(method_invocation name: (identifier) @name) @reference.call
''',
        imports='''
(import_declaration (scoped_identifier) @module)
''',
        extends='''
(class_declaration name: (identifier) @child superclass: (superclass (type_identifier) @base.extends))
(class_declaration name: (identifier) @child interfaces: (super_interfaces (type_list (type_identifier) @base.implements)))
(interface_declaration name: (identifier) @child (extends_interfaces (type_list (type_identifier) @base.extends)))
'''),
    "objc": L("m mm", tags=("c",), notes="the ObjC grammar extends C: C's tags compose; authored adds @interface/@implementation/@protocol/methods/message sends. '.m' is ObjC here (Matlab also uses .m: pass language=matlab)",
        defs='''
(class_interface "@interface" . (identifier) @name) @definition.class
(class_implementation "@implementation" . (identifier) @name) @definition.class
(protocol_declaration "@protocol" . (identifier) @name) @definition.interface
(method_declaration (method_type) . (identifier) @name) @definition.method
(method_definition (method_type) . (identifier) @name) @definition.method
(preproc_def name: (identifier) @name) @definition.macro
(preproc_function_def name: (identifier) @name) @definition.macro
''',
        calls='''
(call_expression function: (identifier) @name) @reference.call
(call_expression function: (field_expression field: (field_identifier) @name)) @reference.call
(message_expression method: (identifier) @name) @reference.call
''',
        imports='''
(preproc_include path: [(string_literal) (system_lib_string)] @module)
''',
        extends='''
(class_interface "@interface" . (identifier) @child superclass: (identifier) @base.extends)
(class_interface "@interface" . (identifier) @child (parameterized_arguments (type_name (type_identifier) @base.implements)))
'''),
    "powershell": L("ps1 psm1 psd1", call_stop=r"^(?i:using)$", notes="no shipped tags; commands are calls (cmdlets and external programs alike)",
        defs='''
(function_statement (function_name) @name) @definition.function
(class_statement . (simple_name) @name) @definition.class
(class_method_definition (simple_name) @name) @definition.method
(enum_statement (simple_name) @name) @definition.enum
''',
        calls='''
(command command_name: (command_name) @name) @reference.call
(invokation_expression (member_name (simple_name) @name)) @reference.call
''',
        imports='''
(command command_name: (command_name) @_c command_elements: (command_elements (generic_token) @module) (#match? @_c "^(?i:Import-Module|ipmo)$"))
''',
        extends='''
(class_statement . (simple_name) @child . (simple_name) @base.extends)
''',
        tok={"command_name": "identifier", "generic_token": "other", "simple_name": "identifier", "variable": "identifier",
             "function_name": "identifier", "member_name": "identifier", "command_parameter": "operator", "type_identifier": "type"}),
    "matlab": L("m", pack="matlab", tags=True, notes="'.m' is ambiguous with Objective-C: callers must say language=matlab",
        calls='''
(function_call name: (identifier) @name) @reference.call
''',
        extends='''
(class_definition name: (identifier) @child (superclasses (property_name (identifier) @base.extends)))
''',
        na={"imports": "MATLAB has no import statement for files (path-based); `import pkg.*` is rare and not authored"}),
    "cobol": L("cob cbl cpy cobol", notes="fixed-format source is read as given; a paragraph name is a HIDDEN token of paragraph_header (the node text is the name plus '.'), so its def is the header node with the period cleaned off, and the name text is emitted by the uncovered-text pass",
        name_clean=(r"\.$", ""),
        defs='''
(program_name) @name @definition.module
(data_description (entry_name) @name) @definition.variable
(paragraph_header) @name @definition.paragraph
''',
        calls='''
(perform_statement_call_proc procedure: (perform_procedure (label (qualified_word (WORD) @name)))) @reference.call
(call_statement x: (string) @name) @reference.call
''',
        imports='''
(copy_statement book: (WORD) @module)
''',
        na={"extends": "COBOL has no inheritance in the grammar shipped"},
        tok={"WORD": "identifier", "picture_9": "literal", "stop_statement": "keyword", "level_number": "literal"}),
    "lean": L("lean", notes="no shipped tags; dotted names are single identifier tokens in this grammar",
        defs='''
(declaration (structure name: (identifier) @name)) @definition.class
(declaration (def name: (identifier) @name)) @definition.function
(declaration (theorem name: (identifier) @name)) @definition.theorem
(declaration (inductive name: (identifier) @name)) @definition.type
(declaration (abbrev name: (identifier) @name)) @definition.function
''',
        gaps={"calls": "value-level application and type-level application are the same `app` node; telling them apart needs elaboration"},
        tok={"scientific_lit": "literal", "nat_lit": "literal", "type_const": "type", "true_const": "literal", "false_const": "literal"},
        imports='''
(import name: (identifier) @module)
''',
        extends='''
(instance type: (app fn: (identifier) @base.instance arg: (identifier) @child))
'''),
    "solidity": L("sol", tags=True,
        defs='''
(struct_declaration name: (identifier) @name) @definition.class
(enum_declaration name: (identifier) @name) @definition.enum
(event_definition name: (identifier) @name) @definition.event
(library_declaration name: (identifier) @name) @definition.module
(modifier_definition name: (identifier) @name) @definition.method
''',
        imports='''
(import_directive source: (string) @module)
''',
        extends='''
(contract_declaration name: (identifier) @child (inheritance_specifier ancestor: (user_defined_type (identifier) @base.extends)))
(interface_declaration name: (identifier) @child (inheritance_specifier ancestor: (user_defined_type (identifier) @base.extends)))
'''),
    "svelte": L("svelte", inject=True, notes="markup parsed by the svelte grammar; <script> and <style> bodies are parsed in javascript/typescript and css and merged (injection by included ranges)",
        na={"extends": "components do not inherit"},
        tok={"text": "other", "raw_text": "other", "raw_text_expr": "other", "<": "punctuation", ">": "punctuation", "</": "punctuation",
             "/>": "punctuation", "=": "punctuation"}, atomic=("quoted_attribute_value",)),
    "vue": L("vue", inject=True, notes="markup parsed by the vue grammar; <script> and <style> bodies are parsed in javascript/typescript and css and merged (injection by included ranges); template {{ }} expressions are not parsed",
        na={"extends": "components do not inherit"},
        tok={"text": "other", "raw_text": "other", "<": "punctuation", ">": "punctuation", "</": "punctuation", "/>": "punctuation",
             "=": "punctuation"}, atomic=("quoted_attribute_value",)),
    "markdown": L("md markdown mdx", notes="block grammar only: inline spans are single `inline` tokens (the markdown_inline grammar is not run); fenced code is not injected because an example is not a declaration",
        defs='''
(atx_heading heading_content: (inline) @name) @definition.section
(setext_heading heading_content: (paragraph (inline) @name)) @definition.section
''',
        na={"calls": "prose has no call syntax", "imports": "no import syntax", "extends": "no inheritance"},
        tokre=[(r"_marker", "punctuation"), (r"_delimiter$", "punctuation"), (r"^block_(continuation|quote)", "punctuation")],
        atomic=("inline", "html_block", "code_fence_content", "pipe_table_cell", "link_destination", "link_title", "link_label", "language"),
        tok={"inline": "other", "html_block": "other", "code_fence_content": "other", "pipe_table_cell": "other",
             "link_destination": "other", "link_title": "other", "link_label": "other", "language": "identifier", "info_string": "other"}),
    "latex": L("tex latex sty cls", notes="no shipped queries: commands the document defines, labels it declares; every command use is a call",
        defs='''
(new_command_definition declaration: (curly_group_command_name command: (command_name) @name)) @definition.macro
(old_command_definition declaration: (command_name) @name) @definition.macro
(label_definition name: (curly_group_label (label) @name)) @definition.label
''',
        calls='''
(generic_command command: (command_name) @name) @reference.call
''',
        imports='''
(package_include paths: (curly_group_path_list path: (path) @module))
(class_include path: (curly_group_path path: (path) @module))
(latex_include path: (curly_group_path path: (path) @module))
''',
        na={"extends": "no inheritance (\\\\documentclass is an import)"},
        tok={"command_name": "keyword", "word": "other", "placeholder": "other", "superscript": "operator", "subscript": "operator",
             "path": "string", "argc": "literal", "label": "identifier"}),
    # @@MAPS-END@@
}

ALIASES = {
    "c_sharp": "csharp", "c#": "csharp", "cs": "csharp", "js": "javascript", "jsx": "javascript", "mjs": "javascript",
    "cjs": "javascript", "ts": "typescript", "py": "python", "rs": "rust", "rb": "ruby", "kt": "kotlin", "hs": "haskell",
    "ml": "ocaml", "ex": "elixir", "erl": "erlang", "sh": "bash", "shell": "bash", "zsh": "bash", "objective-c": "objc",
    "objectivec": "objc", "objective_c": "objc", "ps1": "powershell", "common_lisp": "commonlisp", "cl": "commonlisp",
    "lisp": "commonlisp", "golang": "go", "c++": "cpp", "cxx": "cpp", "tex": "latex", "md": "markdown", "yml": "yaml",
    "pl": "perl", "jl": "julia", "clj": "clojure", "scm": "scheme", "rkt": "racket", "f90": "fortran", "fortran90": "fortran",
    "sol": "solidity", "m": "objc", "mat": "matlab",
}

# --- generic structural rules (documented; per-language `tok` overrides win) ---------------
COMMENT_RE = re.compile(r"comment|^shebang$|^pod$|^haddock$|^documentation$|^doc_string$")
STRINGLIKE_RE = re.compile(
    r"(^|_)(string|str|char|character|rune|heredoc|regex|regexp|template_string|raw_string|bytes?|"
    r"quoted|symbol_quoted|docstring|text_block|verbatim)($|_literal$|_lit$|_content$|_fragment$|_scalar$)|^(string|char|regex)_?literal$")
STRING_PART_RE = re.compile(
    r"(content|start|end|fragment|escape|interpolation|substitution|expansion|format|chars?|quote|delimiter|"
    r"raw|heredoc_(body|content|end|start)|text|part|segment|flags|pattern|opening|closing|sequence|specifier|"
    r"variable|name|simple_expansion|command_substitution|arithmetic_expansion|embedded|splice|escape|interpolat|open|close)", re.I)
NUMBER_RE = re.compile(
    r"(^|_)(integer|float|floating|fixnum|rational|complex|int|number|decimal|hex|hexadecimal|octal|binary|imaginary|real|numeric|bigint|"
    r"float_?literal|int_?literal|numeric_literal|number_literal)(_|$)")
LITERAL_NODE_RE = re.compile(
    r"^(true|false|null|nil|none|undefined|boolean|boolean_literal|bool|bool_literal|null_literal|nullptr|"
    r"boolean_constant|nan|inf|infinity|void_literal|unit|unit_literal)$")
TYPE_LEAF_RE = re.compile(
    r"^(type_identifier|primitive_type|builtin_type|predefined_type|sized_type_specifier|integral_type|"
    r"floating_point_type|boolean_type|void_type|type_name|type_variable|simple_type|basic_type|"
    r"type_constructor|type_id|type_ident|builtin_type_identifier|primitive_type_identifier|"
    r"type_parameter_name|numeric_type|class_name|qualified_type_name)$")
IDENT_RE = re.compile(
    r"(^|_)(identifier|ident|name|variable|constant|symbol|atom|label|property|field|namespace|module|package|"
    r"selector|keyword_identifier|var|id)(_|$)")
KEYWORD_LEAF_RE = re.compile(r"^(this|self|super|break|continue|return|import|pass|yield|async|await|global|"
                             r"nonlocal|new|delete|typeof|instanceof|void|default|static|abstract|final)$")
WORD_RE = re.compile(r"^[#@]?[^\W\d][\w]*[?!]?$", re.UNICODE)
LITERAL_WORDS = {"true", "false", "null", "nil", "none", "undefined", "nullptr", "yes", "no"}
PUNCT = {"(", ")", "[", "]", "{", "}", ",", ";", ":", ".", "::", "...", ":;"}
GENERIC_BRACKET_PARENT_RE = re.compile(r"type_(arguments|parameters|argument_list|parameter_list|list)|template_(argument|parameter)_list|generic|type_params")
TYPE_PARENTS = {"integral_type", "floating_point_type", "boolean_type", "void_type", "primitive_type", "predefined_type",
                "builtin_type", "simple_type", "basic_type", "numeric_type", "sized_type_specifier", "type_primitive", "intrinsic_type"}

# one name span may be declared by two tag patterns (a method is also a function): the most specific kind wins
KIND_RANK = {k: i for i, k in enumerate(["method", "function", "interface", "class", "struct", "enum", "type", "variant",
                                         "module", "macro", "prototype", "constant", "property", "field"])}
# which def kinds are "beings" for the R3 rung (named entities the text introduces) vs value-level declarations
CORE_KINDS = ["function", "method", "class", "interface", "type", "enum", "variant", "module", "macro", "table", "view",
              "index", "sequence", "schema", "trigger", "event", "theorem", "paragraph"]
SECONDARY_KINDS = ["constant", "variable", "property", "field", "label", "section", "id", "anchor", "keyframes"]
KIND_CANON = {"union": "type", "enum_variant": "variant", "trait": "interface", "": "other"}
QUOTES = "\"'`<>"


# =====================================================================================
# parser / query plumbing
# =====================================================================================
_pack = None
_PARSERS, _LANGS, _QCACHE = {}, {}, {}


def pack():
    global _pack
    if _pack is None:
        import tree_sitter_language_pack as p
        _pack = p
    return _pack


def resolve(language, file_name=None):
    """-> pack grammar name (or None). Giver for extension defaults: MAPS exts, then the pack's own detector."""
    if language:
        k = str(language).strip().lower()
        k = ALIASES.get(k, k)
        if k in MAPS:
            return MAPS[k].get("pack") or k
        return k
    if file_name:
        ext = os.path.splitext(file_name)[1].lower()
        base = os.path.basename(file_name).lower()
        for name, cfg in MAPS.items():
            if ext and ext in cfg["exts"]:
                return cfg.get("pack") or name
        if base in ("dockerfile", "makefile"):
            return base
        got = pack().detect_language_from_extension(ext.lstrip("."))
        return got
    return None


def cfg_of(grammar):
    for name, cfg in MAPS.items():
        if (cfg.get("pack") or name) == grammar and not cfg.get("variant_of"):
            return name, cfg
    return grammar, L()  # generic: structural tokens only, typed gaps for the rest


def load(grammar):
    if grammar in _PARSERS:
        return _PARSERS[grammar], _LANGS[grammar]
    cfg = MAPS.get(grammar)
    if cfg and cfg.get("module"):
        import importlib
        from tree_sitter import Language, Parser
        mod = importlib.import_module(cfg["module"][0])
        lang = Language(getattr(mod, cfg["module"][1])())
        _PARSERS[grammar], _LANGS[grammar] = Parser(lang), lang
        return _PARSERS[grammar], _LANGS[grammar]
    p = pack()
    try:
        lang = p.get_language(grammar)
    except Exception:
        try:
            p.download([grammar])
            lang = p.get_language(grammar)
        except Exception as e:  # noqa
            raise LookupError("grammar %r unavailable: %s" % (grammar, e))
    parser = p.get_parser(grammar)
    _PARSERS[grammar], _LANGS[grammar] = parser, lang
    return parser, lang


def compile_q(grammar, src, tag):
    """-> (Query|None, error|None); cached."""
    key = (grammar, tag, hashlib.sha1((src or "").encode()).hexdigest())
    if key in _QCACHE:
        return _QCACHE[key]
    from tree_sitter import Query
    _, lang = load(grammar)
    try:
        q = Query(lang, src)
        res = (q, None)
    except Exception as e:  # noqa
        res = (None, "%s: %s" % (type(e).__name__, str(e)[:200]))
    _QCACHE[key] = res
    return res


# =====================================================================================
# token walk
# =====================================================================================
def leaf_class(ntype, named, text, parent, cfg, cache):
    ck = (ntype, named, parent, text if not named else None)
    hit = cache.get(ck)
    if hit is not None:
        return hit
    tok = cfg["tok"]
    c = tok.get(ntype + "<" + (parent or ""))
    if c is None:
        c = tok.get(ntype)
    if c is None:
        for rx, cls in cfg["tokre"]:
            if rx.search(ntype):
                c = cls
                break
    if c is not None:
        pass
    elif COMMENT_RE.search(ntype):
        c = "comment"
    elif not named:
        s = text
        if LITERAL_NODE_RE.match(parent or "") and WORD_RE.match(s):
            c = "literal"
        elif WORD_RE.match(s):
            if s.lower() in LITERAL_WORDS:
                c = "literal"
            elif parent in TYPE_PARENTS:
                c = "type"
            else:
                c = "keyword"
        elif s in PUNCT:
            c = "punctuation"
        elif s in ("\"", "'", "`", '"""', "'''"):
            c = "punctuation"
        elif s in ("<", ">") and parent and GENERIC_BRACKET_PARENT_RE.search(parent):
            c = "punctuation"
        else:
            c = "operator"
    else:
        if ntype == "operator":
            c = "operator"
        elif LITERAL_NODE_RE.match(ntype):
            c = "literal"
        elif TYPE_LEAF_RE.match(ntype) or ntype.endswith("_type_identifier"):
            c = "type"
        elif STRINGLIKE_RE.search(ntype):
            c = "string"
        elif NUMBER_RE.search(ntype):
            c = "literal"
        elif IDENT_RE.search(ntype):
            c = "identifier"
        elif KEYWORD_LEAF_RE.match(ntype):
            c = "keyword"
        else:
            c = "other"
    cache[ck] = c
    return c


def atomic_class(n, ntype, cfg, acache):
    """string/comment lexemes: one token for the whole node. None when n is not atomic."""
    v = acache.get(ntype, 0)
    if v == 0:
        if ntype in cfg["atomic"] or ntype in cfg["tok"] and cfg["tok"][ntype] in ("string", "comment") and n.child_count:
            v = cfg["tok"].get(ntype) or "string"
        elif COMMENT_RE.search(ntype):
            v = "comment"
        elif STRINGLIKE_RE.search(ntype) and not ntype.endswith(("_content", "_fragment", "_start", "_end")):
            v = "maybe"
        else:
            v = None
        acache[ntype] = v
    if v == "maybe":
        # a string-like node is one lexeme only if every child is anonymous or a string part
        for ch in n.children:
            if ch.is_named and not STRING_PART_RE.search(ch.type):
                return None
        return "string"
    return v


def walk_tokens(tree, src, cfg):
    """-> (tokens[(sb,eb,type,class)], stats). Iterative DFS; no recursion limit.
    error_bytes_frac = bytes of leaf tokens that the parser could not attach to any grammar node, i.e. ERROR leaves
    and leaves whose PARENT is an ERROR node, over all bytes. (Counting the full width of an ERROR node would
    score a file 1.0 whenever recovery wraps the whole translation unit in one ERROR root, although almost all of
    it parsed: the Linux kernel's sched/core.c does exactly that.)"""
    toks = []
    cache, acache = {}, {}
    cur = tree.walk()
    stack = []  # parent node types
    err_nodes = miss_nodes = err_bytes = 0
    total = len(src)
    while True:
        n = cur.node
        sb, eb = n.start_byte, n.end_byte
        ntype = n.type
        descend = False
        if n.is_missing:
            miss_nodes += 1
        elif eb > sb:
            if ntype == "ERROR":
                err_nodes += 1
            ac = atomic_class(n, ntype, cfg, acache) if n.is_named else None
            if ac:
                toks.append((sb, eb, ntype, ac))
            elif n.child_count == 0 and not src[sb:eb].strip():
                pass  # a whitespace-only leaf (a newline token) is not a lexeme
            elif n.child_count == 0:
                parent = stack[-1] if stack else None
                if ntype == "ERROR":
                    toks.append((sb, eb, ntype, "other"))
                    err_bytes += eb - sb
                else:
                    text = src[sb:eb].decode("utf-8", "replace") if not n.is_named else ""
                    toks.append((sb, eb, ntype, leaf_class(ntype, n.is_named, text, parent, cfg, cache)))
                    if parent == "ERROR":
                        err_bytes += eb - sb
            else:
                descend = True
        if descend and cur.goto_first_child():
            stack.append(ntype)
            continue
        while True:
            if cur.goto_next_sibling():
                break
            if not cur.goto_parent():
                return toks, dict(error_nodes=err_nodes, missing_nodes=miss_nodes,
                                  error_bytes_frac=(err_bytes / total if total else 0.0))
            stack.pop()


# =====================================================================================
# query runs
# =====================================================================================
def run_matches(tree, query):
    from tree_sitter import QueryCursor
    cur = QueryCursor(query)
    return cur.matches(tree.root_node)


def first(nodes):
    return nodes[0] if nodes else None


def norm_kind(suffix):
    suffix = suffix or ""
    return KIND_CANON.get(suffix, suffix or "other")


def tags_grammars(cfg, grammar):
    """Which grammars' shipped tags.scm feed this language: True = its own; a tuple = a documented composition."""
    t = cfg["tags"]
    if t is True:
        return (grammar,)
    return tuple(t) if t else ()


def lisp_call_blocked(nm, spec, src):
    """In a Lisp every list headed by a symbol looks like a call. Block the ones that are not applications:
    (a) the parameter list right after lambda-like heads, (b) a binding inside the binding list of let-like
    heads, (c) any list nested in import/require/defclass-like forms, (d) a clause directly under cond/case-like
    heads. Giver: the heads are each Lisp dialect's own special forms (R7RS, Racket reference, CLHS, clojure.org)."""
    lists, syms = spec["lists"], spec["syms"]

    def elems(L):
        return [c for c in L.children if c.is_named and "comment" not in c.type]

    def head(L):
        es = elems(L)
        if es and es[0].type in syms:
            return src[es[0].start_byte:es[0].end_byte].decode("utf-8", "replace")
        return None

    n = nm.parent
    while n is not None and n.type not in lists:
        n = n.parent
    if n is None:
        return False
    chain, a = [], n.parent
    while a is not None:
        if a.type in lists:
            chain.append(a)
        a = a.parent
    for a in chain:
        h = head(a)
        if h and spec["any_anc"].search(h):
            return True
    if chain:
        h0 = head(chain[0])
        es0 = elems(chain[0])
        if h0 and n in es0:
            idx = es0.index(n)
            if spec["first_arg"].search(h0) and idx == 1:
                return True
            if spec["clause"].search(h0) and idx >= 1:
                return True
        if len(chain) > 1 and chain[0] in elems(chain[1]):
            h1 = head(chain[1])
            if h1 and spec["binding"].search(h1) and elems(chain[1]).index(chain[0]) in (1, 2):
                return True
    return False


def extract_defs_calls(grammar, tree, src):
    """Run the shipped tags query (plus any documented composition) and the authored defs/calls queries.
    Honours tree-sitter-tags semantics: a capture named @ignore removes any tag whose @name lies inside it.
    -> defs, calls, tagrefs, errors"""
    name, cfg = cfg_of(grammar)
    defs, calls, tagrefs, errors = {}, {}, {}, []
    ignores = []
    sources = []
    for tg in tags_grammars(cfg, grammar):
        t = pack().get_tags_query(tg)
        if t:
            sources.append(("tags" if tg == grammar else "tags:" + tg, t))
    if cfg["defs"]:
        sources.append(("defs", cfg["defs"]))
    if cfg["calls"]:
        sources.append(("calls", cfg["calls"]))
    for tag, qsrc in sources:
        q, err = compile_q(grammar, qsrc, tag)
        if err:
            errors.append((tag, err))
            continue
        for _pi, caps in run_matches(tree, q):
            nm0 = first(caps.get("name", []))
            for ig in caps.get("ignore", []):
                ignores.append((ig.start_byte, ig.end_byte))
            for key, nodes in caps.items():
                if key.startswith("local.") or key in ("name", "doc", "ignore") or not nodes:
                    continue
                # a pattern that captures the name node itself as @reference.* has no separate @name
                nm = nm0 if nm0 is not None else (nodes[0] if key.startswith("reference") else None)
                if key.startswith("definition"):
                    if nm is None:
                        continue
                    node = nodes[0]
                    kind = norm_kind(key.split(".", 1)[1] if "." in key else "")
                    if cfg["refine"]:
                        kind = cfg["refine"](node, kind)
                    d = (nm.start_byte, nm.end_byte, kind)
                    defs.setdefault(d, (node.start_byte, node.end_byte, node.type, kind))
                elif key.startswith("reference"):
                    if nm is None:
                        continue
                    rk = key.split(".", 1)[1] if "." in key else "ref"
                    if rk.startswith("_"):
                        continue
                    if rk in ("call", "send"):
                        if tag.startswith("tags") and not cfg["shipped_calls"]:
                            continue
                        if cfg["call_ctx"] and lisp_call_blocked(nm, cfg["call_ctx"], src):
                            continue
                        calls.setdefault((nm.start_byte, nm.end_byte), 1)
                    elif rk == "instance":
                        calls.setdefault((nm.start_byte, nm.end_byte), 1)
                    else:
                        tagrefs.setdefault(nm.start_byte, rk)
    if ignores:
        ignores.sort()
        starts = [a for a, _b in ignores]
        pm, m = [], -1
        for _a, b in ignores:  # prefix maximum of the end offsets: "some ignore starting at or before x reaches y"
            m = max(m, b)
            pm.append(m)

        def ignored(sb, eb):
            i = bisect.bisect_right(starts, sb) - 1
            return i >= 0 and pm[i] >= eb
        calls = {k: v for k, v in calls.items() if not ignored(*k)}
        tagrefs = {k: v for k, v in tagrefs.items() if not ignored(k, k + 1)}
    return defs, calls, tagrefs, errors


def strip_quotes(s):
    s = s.strip()
    while len(s) >= 2 and s[0] in QUOTES and s[-1] in QUOTES:
        s = s[1:-1]
    return s.strip()


def extract_imports(grammar, tree, src):
    name, cfg = cfg_of(grammar)
    out, errors = {}, []
    if cfg["imports"]:
        q, err = compile_q(grammar, cfg["imports"], "imports")
        if err:
            errors.append(("imports", err))
        else:
            for _pi, caps in run_matches(tree, q):
                for key, nodes in caps.items():
                    if key == "module" or key.startswith("module."):
                        for node in nodes:
                            out.setdefault((node.start_byte, node.end_byte), 1)
    return out, errors


def extract_extends(grammar, tree, src):
    name, cfg = cfg_of(grammar)
    out, errors = {}, []
    if cfg["extends"]:
        q, err = compile_q(grammar, cfg["extends"], "extends")
        if err:
            errors.append(("extends", err))
        else:
            for _pi, caps in run_matches(tree, q):
                ch = first(caps.get("child", []))
                if ch is None:
                    continue
                for key, nodes in caps.items():
                    if key == "base" or key.startswith("base."):
                        rel = key.split(".", 1)[1] if "." in key else "extends"
                        for b in nodes:
                            out.setdefault((ch.start_byte, ch.end_byte, b.start_byte, b.end_byte, rel), 1)
    return out, errors


# =====================================================================================
# offsets: tree-sitter gives UTF-8 byte offsets; consumers slice JS strings (UTF-16 units)
# =====================================================================================
def make_b2u(text, nbytes):
    if len(text) == nbytes:
        return None  # pure ASCII: identity
    arr = array("I", [0]) * (nbytes + 1)
    b = u = 0
    for ch in text:
        o = ord(ch)
        if o < 0x80:
            nb, nu = 1, 1
        elif o < 0x800:
            nb, nu = 2, 1
        elif o < 0x10000:
            nb, nu = 3, 1
        else:
            nb, nu = 4, 2
        for k in range(nb):
            arr[b + k] = u
        b += nb
        u += nu
    arr[nbytes] = u
    return arr


_NONWS = re.compile(rb"\S+")


def fill_uncovered(toks, src):
    """Every non-whitespace run of the source that no token covers (a grammar's hidden text) becomes an
    'other' token of type '<uncovered>', so the tokens cover all non-whitespace text. -> (toks, n_added)"""
    def cls(b):
        txt = b.decode("utf-8", "replace")
        if txt in PUNCT or txt in ("\"", "'", "`"):
            return "punctuation"   # hidden delimiter characters (dots in a dotted name, quotes of a scalar)
        return "other"
    out, pos, added = [], 0, 0
    for t in sorted(toks, key=lambda t: (t[0], t[1])):
        if t[0] > pos:
            for m in _NONWS.finditer(src, pos, t[0]):
                out.append((m.start(), m.end(), "<uncovered>", cls(m.group())))
                added += 1
        out.append(t)
        pos = max(pos, t[1])
    for m in _NONWS.finditer(src, pos, len(src)):
        out.append((m.start(), m.end(), "<uncovered>", cls(m.group())))
        added += 1
    return out, added


def _point(src, b):
    row = src.count(b"\n", 0, b)
    col = b - (src.rfind(b"\n", 0, b) + 1)
    return (row, col)


INJECT_Q = {
    "script": "(script_element (start_tag) @tag (raw_text) @body)",
    "style": "(style_element (start_tag) @tag (raw_text) @body)",
}
TS_LANG_RE = re.compile(r"""(lang|type)\s*=\s*["']?(?:text/)?(ts|tsx|typescript)\b""", re.I)


def find_injections(grammar, tree, src):
    """-> [(start_byte, end_byte, injected_grammar)] for <script>/<style> bodies (html, vue, svelte)."""
    out = []
    for kind, qsrc in INJECT_Q.items():
        q, err = compile_q(grammar, qsrc, "inject-" + kind)
        if err:
            continue
        for _pi, caps in run_matches(tree, q):
            body, tag = first(caps.get("body", [])), first(caps.get("tag", []))
            if body is None or body.end_byte <= body.start_byte:
                continue
            if kind == "style":
                g = "css"
            else:
                tagtxt = src[tag.start_byte:tag.end_byte].decode("utf-8", "replace") if tag is not None else ""
                g = "typescript" if TS_LANG_RE.search(tagtxt) else "javascript"
            out.append((body.start_byte, body.end_byte, g))
    return sorted(set(out))


def analyze(grammar, src, ranges=None):
    """Byte-level extraction for one grammar over src (optionally restricted to byte ranges: an injection)."""
    name, cfg = cfg_of(grammar)
    parser, lang = load(grammar)
    if ranges:
        from tree_sitter import Parser, Range
        parser = Parser(lang)
        parser.included_ranges = [Range(_point(src, sb), _point(src, eb), sb, eb) for sb, eb in ranges]
    tree = parser.parse(src)
    toks, stats = walk_tokens(tree, src, cfg)
    defs, calls, tagrefs, derrs = extract_defs_calls(grammar, tree, src)
    imps, ierrs = extract_imports(grammar, tree, src)
    exts, eerrs = extract_extends(grammar, tree, src)
    return {"name": name, "cfg": cfg, "tree": tree, "toks": toks, "stats": stats, "defs": defs, "calls": calls,
            "tagrefs": tagrefs, "imps": imps, "exts": exts, "derrs": derrs, "ierrs": ierrs, "eerrs": eerrs}


def capabilities(grammar, cfg, a):
    errs = {}
    for tag, e in a["derrs"]:
        errs.setdefault("calls" if tag == "calls" else "defs", []).append("%s: %s" % (tag, e))
    for tag, e in a["ierrs"]:
        errs.setdefault("imports", []).append(e)
    for tag, e in a["eerrs"]:
        errs.setdefault("extends", []).append(e)
    caps = {"tokens": {"status": "ok", "giver": "structural rules over %s node kinds (Language API) + audit vs highlights.scm" % grammar}}
    has_tags = any(pack().get_tags_query(tg) for tg in tags_grammars(cfg, grammar))
    for f in ("defs", "calls", "imports", "extends"):
        if f in cfg["na"]:
            caps[f] = {"status": "not_applicable", "reason": cfg["na"][f]}
            continue
        if f in cfg["gaps"] and not cfg[f]:
            caps[f] = {"status": "gap", "reason": cfg["gaps"][f]}
            continue
        parts = []
        if f in ("defs", "calls") and has_tags:
            parts.append("tags.scm shipped by tree-sitter-language-pack (%s)" % "+".join(tags_grammars(cfg, grammar)))
        if cfg[f]:
            parts.append("authored query over %s node kinds" % grammar)
        if cfg["inject"] and f in ("defs", "calls", "imports"):
            parts.append("injected <script>/<style> bodies parsed in their own grammar")
        if f in errs:
            caps[f] = {"status": "gap", "reason": "query failed to compile: " + " | ".join(errs[f])}
        elif not parts:
            caps[f] = {"status": "gap", "reason": "no mapping authored for %s" % grammar}
        else:
            caps[f] = {"status": "ok", "giver": " + ".join(parts)}
    return caps


def extract(language=None, text="", file_name=None):
    grammar = resolve(language, file_name)
    if not grammar:
        raise LookupError("cannot resolve a grammar for language=%r file=%r" % (language, file_name))
    src = text.encode("utf-8", "surrogatepass")
    host = analyze(grammar, src)
    name, cfg = host["name"], host["cfg"]
    b2u_arr = make_b2u(text, len(src))
    u = (lambda b: b) if b2u_arr is None else (lambda b: b2u_arr[b])
    dec = lambda sb, eb: src[sb:eb].decode("utf-8", "replace")

    toks = list(host["toks"])
    defs, calls, tagrefs = dict(host["defs"]), dict(host["calls"]), dict(host["tagrefs"])
    imps, exts = dict(host["imps"]), dict(host["exts"])
    injections = []
    if cfg["inject"]:
        for sb, eb, g in find_injections(grammar, host["tree"], src):
            try:
                sub = analyze(g, src, [(sb, eb)])
            except Exception as e:  # noqa
                injections.append({"language": g, "start": u(sb), "end": u(eb), "error": str(e)[:120]})
                continue
            toks = [t for t in toks if not (t[0] == sb and t[1] == eb)] + sub["toks"]
            defs.update(sub["defs"]); calls.update(sub["calls"]); tagrefs.update(sub["tagrefs"])
            imps.update(sub["imps"]); exts.update(sub["exts"])
            injections.append({"language": g, "start": u(sb), "end": u(eb), "has_error": bool(sub["tree"].root_node.has_error),
                               "error_bytes_frac": round(sub["stats"]["error_bytes_frac"], 6)})
        toks.sort(key=lambda t: (t[0], t[1]))
    toks, n_uncovered = fill_uncovered(toks, src)
    caps = capabilities(grammar, cfg, host)
    if toks and n_uncovered / len(toks) > 0.05:
        caps["tokens"]["caveat"] = ("%d of %d tokens (%.0f%%) are text the grammar hides (type '<uncovered>', class other)"
                                    % (n_uncovered, len(toks), 100.0 * n_uncovered / len(toks)))

    # defs: one name span, most specific kind wins
    out_defs, def_name_starts, by_span = [], set(), {}
    for (nsb, neb, kind), v in defs.items():
        cur_ = by_span.get((nsb, neb))
        if cur_ is None or KIND_RANK.get(kind, 50) < KIND_RANK.get(cur_[0][2], 50):
            by_span[(nsb, neb)] = ((nsb, neb, kind), v)
    for (nsb, neb, kind), (sb, eb, ntype, _k) in sorted(v for v in by_span.values()):
        nm_txt = dec(nsb, neb)
        d = {"kind": kind, "name": nm_txt, "start": u(sb), "end": u(eb), "nameStart": u(nsb), "nameEnd": u(neb), "node": ntype}
        if cfg["name_clean"]:
            cleaned = re.sub(cfg["name_clean"][0], cfg["name_clean"][1], nm_txt).strip()
            if cleaned != nm_txt:
                d["name"], d["nameCleaned"] = cleaned, True
        out_defs.append(d)
        def_name_starts.add(nsb)
    out_defs.sort(key=lambda d: (d["start"], d["nameStart"], d["kind"]))
    # a defining name is not a call site (Julia/Haskell signatures parse as applications)
    dn_spans = {(nsb, neb) for (nsb, neb, _k) in defs}
    calls = {k: v for k, v in calls.items() if k not in dn_spans}
    if cfg["call_stop"]:
        calls = {k: v for k, v in calls.items() if not cfg["call_stop"].search(dec(*k))}
    out_calls = [{"callee": dec(sb, eb), "start": u(sb), "end": u(eb)} for (sb, eb) in sorted(calls)]
    out_imports, imp_ranges = [], []
    for (sb, eb) in sorted(imps):
        mod = strip_quotes(dec(sb, eb))
        if cfg["import_clean"]:
            mod = re.sub(cfg["import_clean"][0], cfg["import_clean"][1], mod).strip()
        out_imports.append({"module": mod, "start": u(sb), "end": u(eb)})
        imp_ranges.append((sb, eb))
    out_ext = [{"child": dec(csb, ceb), "base": dec(bsb, beb), "relation": rel, "start": u(bsb)}
               for (csb, ceb, bsb, beb, rel) in sorted(exts, key=lambda k: (k[2], k[0]))]
    # refs: identifier/type tokens that are not a def name
    call_starts = {sb for (sb, _e) in calls}
    imp_starts = [r[0] for r in imp_ranges]
    refs = []
    for sb, eb, ntype, cls in toks:
        if cls not in ("identifier", "type") or sb in def_name_starts:
            continue
        kind = "call" if sb in call_starts else None
        if kind is None:
            i = bisect.bisect_right(imp_starts, sb) - 1
            if i >= 0 and imp_ranges[i][0] <= sb < imp_ranges[i][1]:
                kind = "import"
        if kind is None:
            kind = tagrefs.get(sb) or ("type" if cls == "type" else "use")
        refs.append({"name": dec(sb, eb), "start": u(sb), "kind": kind})
    tokens = [{"start": u(sb), "end": u(eb), "type": ntype, "class": cls} for sb, eb, ntype, cls in toks]
    st = host["stats"]
    res = {
        "gold_version": GOLD_VERSION,
        "language": name,
        "grammar": grammar,
        "unit": "utf16",
        "file": file_name,
        "parse": {"has_error": bool(host["tree"].root_node.has_error), "error_nodes": st["error_nodes"],
                  "missing_nodes": st["missing_nodes"], "error_bytes_frac": round(st["error_bytes_frac"], 6),
                  "uncovered_tokens": n_uncovered, "n_bytes": len(src), "n_chars": len(text)},
        "capabilities": caps,
        "tokens": tokens, "defs": out_defs, "refs": refs, "calls": out_calls,
        "imports": out_imports, "extends": out_ext,
    }
    if injections:
        res["injections"] = injections
    return res


# =====================================================================================
# AUDIT: structural class vs the grammar's own highlights.scm capture (diagnostic only)
# =====================================================================================
def hl_class(cap):
    """Map a highlights.scm capture name to a gold class (None = not a class claim). Used by the AUDIT only."""
    h = cap.lstrip("@").split(".")
    top = h[0]
    sub = h[1] if len(h) > 1 else ""
    if top == "comment":
        return "comment"
    if top in ("string", "character", "escape"):
        return "string"
    if top in ("number", "float", "boolean"):
        return "literal"
    if top == "constant":
        return "literal" if sub in ("builtin", "numeric") else "identifier"
    if top in ("include", "conditional", "repeat", "exception", "define", "preproc", "storageclass"):
        return "keyword"
    if top == "keyword":
        return "operator|keyword" if sub == "operator" else "keyword"
    if top == "operator":
        return "operator"
    if top in ("punctuation", "delimiter", "bracket"):
        return "punctuation"
    if top == "type" or (top == "storage" and sub == "type"):
        return "type"
    if top in ("function", "method", "variable", "property", "field", "parameter", "attribute", "label", "namespace",
               "module", "constructor", "tag", "symbol", "identifier", "macro", "decorator", "annotation"):
        return "identifier"
    return None


def audit(language, text, file_name=None):
    grammar = resolve(language, file_name)
    name, cfg = cfg_of(grammar)
    parser, lang = load(grammar)
    hl = pack().get_highlights_query(grammar)
    if not hl:
        return {"language": name, "audit": "no highlights.scm shipped: structural classes unaudited"}
    q, err = compile_q(grammar, hl, "highlights")
    if err:
        return {"language": name, "audit": "highlights.scm failed to compile: " + err}
    src = text.encode("utf-8", "surrogatepass")
    tree = parser.parse(src)
    toks, _ = walk_tokens(tree, src, cfg)
    from tree_sitter import QueryCursor
    capmap = {}
    for _pi, caps in QueryCursor(q).matches(tree.root_node):
        for key, nodes in caps.items():
            if key.startswith("_"):
                continue
            hc = hl_class(key)
            if hc is None:
                continue
            for nd in nodes:
                capmap.setdefault((nd.start_byte, nd.end_byte), set()).add(hc)
    starts = sorted(capmap)
    agree = dis = unk = 0
    confusion = {}
    for sb, eb, ntype, cls in toks:
        cands = set(capmap.get((sb, eb), ()))
        if not cands and cls in ("string", "comment"):
            i = bisect.bisect_left(starts, (sb, 0))
            while i < len(starts) and starts[i][0] < eb:
                if starts[i][1] <= eb:
                    cands |= capmap[starts[i]]
                i += 1
        if not cands:
            unk += 1
            continue
        flat = set()
        for c in cands:
            flat |= set(c.split("|"))
        if cls in flat:
            agree += 1
        else:
            dis += 1
            key = (ntype, cls, "/".join(sorted(flat)))
            confusion[key] = confusion.get(key, 0) + 1
    top = sorted(confusion.items(), key=lambda kv: -kv[1])[:25]
    return {"language": name, "tokens": len(toks), "covered": agree + dis, "agree": agree, "disagree": dis,
            "no_highlight": unk, "agreement": (agree / (agree + dis)) if (agree + dis) else None,
            "top_disagreements": [{"type": k[0], "mine": k[1], "highlights": k[2], "n": v} for k, v in top]}


# =====================================================================================
# CLI: extract | batch | serve | audit | table | languages | check
# =====================================================================================
def table_md():
    """The mapping table as markdown, one row per language, each field with its giver. The same text is embedded
    (as comments) between the TABLE markers at the top of this file; tests/coding-gold.test.js checks they agree."""
    rows = ["| language | grammar (giver of structure) | exts | defs | calls | imports | extends | notes |", "|---|---|---|---|---|---|---|---|"]
    for name, cfg in sorted(MAPS.items()):
        if cfg["module"]:
            gram = "standalone %s (PyPI)" % cfg["module"][0].replace("_", "-")
        else:
            gram = "language-pack `%s`" % (cfg.get("pack") or name)

        def cell(f):
            if f in cfg["na"]:
                return "n/a: " + cfg["na"][f]
            if f in cfg["gaps"] and not cfg[f]:
                return "GAP: " + cfg["gaps"][f]
            parts = []
            if f in ("defs", "calls") and cfg["tags"]:
                parts.append("tags.scm" if cfg["tags"] is True else "tags.scm(" + "+".join(cfg["tags"]) + ")")
                if f == "calls" and not cfg["shipped_calls"]:
                    parts[-1] = "tags.scm DISCARDED"
            if cfg[f]:
                parts.append("authored q")
            if cfg["inject"] and f in ("defs", "calls", "imports"):
                parts.append("injected script/style")
            return " + ".join(parts) if parts else "GAP: no mapping authored"
        rows.append("| %s | %s | %s | %s | %s | %s | %s | %s |" % (
            name, gram, " ".join(cfg["exts"]), cell("defs"), cell("calls"), cell("imports"), cell("extends"),
            (cfg["notes"] or "").replace("|", "/")))
    return "\n".join(rows)


def write_table():
    """Rewrite the TABLE block at the top of this file from MAPS."""
    path = os.path.abspath(__file__)
    src = open(path, encoding="utf-8").read()
    b, e = "# @@TABLE-BEGIN@@\n", "# @@TABLE-END@@"
    i, j = src.index(b) + len(b), src.index(e)
    block = "".join("# " + ln + "\n" for ln in table_md().split("\n"))
    open(path, "w", encoding="utf-8").write(src[:i] + block + src[j:])


def embedded_table():
    src = open(os.path.abspath(__file__), encoding="utf-8").read()
    b, e = "# @@TABLE-BEGIN@@\n", "# @@TABLE-END@@"
    i, j = src.index(b) + len(b), src.index(e)
    return "\n".join(ln[2:] if ln.startswith("# ") else ln for ln in src[i:j].rstrip("\n").split("\n"))


def kinds_doc():
    return {"core": CORE_KINDS, "secondary": SECONDARY_KINDS}


PARSE_BUDGET_S = float(os.environ.get("GOLD_PARSE_BUDGET_S") or 30)


def extract_guarded(req, budget=None):
    """extract() in a forked child with a wall-clock budget. tree-sitter's error recovery can run for minutes on
    text that is not the grammar's language (the deranged-grammar control provokes it), and py-tree-sitter 0.26's
    progress callback segfaults, so the only reliable guard is a process boundary. A budget overrun or a crash
    in a grammar library is a typed ERROR for that one file, never a hang or a lost batch.
    -> {"gold": ...} | {"error": "..."}"""
    budget = PARSE_BUDGET_S if budget is None else budget
    try:  # warm the grammar and its queries in the parent so each child starts hot
        extract(req.get("language"), "", req.get("fileName"))
    except Exception as e:  # noqa
        return {"error": "%s: %s" % (type(e).__name__, e)}
    r, w = os.pipe()
    pid = os.fork()
    if pid == 0:  # child
        try:
            os.close(r)
            try:
                out = {"gold": extract(req.get("language"), req.get("text", ""), req.get("fileName"))}
            except BaseException as e:  # noqa
                out = {"error": "%s: %s" % (type(e).__name__, e)}
            data = json.dumps(out, ensure_ascii=False, separators=(",", ":")).encode("utf-8", "surrogatepass")
            with os.fdopen(w, "wb") as f:
                f.write(data)
        finally:
            os._exit(0)
    os.close(w)
    deadline = time.monotonic() + budget
    chunks = []
    timed_out = False
    while True:
        left = deadline - time.monotonic()
        if left <= 0:
            timed_out = True
            break
        ready, _, _ = select.select([r], [], [], min(left, 1.0))
        if ready:
            b = os.read(r, 1 << 20)
            if not b:
                break
            chunks.append(b)
    os.close(r)
    if timed_out:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    _, status = os.waitpid(pid, 0)
    if timed_out:
        return {"error": "ParseBudgetExceeded: no result within %.0fs (GOLD_PARSE_BUDGET_S); the grammar's error recovery did not finish on this text" % budget}
    data = b"".join(chunks)
    if not data:
        sig = os.WTERMSIG(status) if os.WIFSIGNALED(status) else None
        return {"error": "ExtractorCrashed: the grammar library died (signal %s)" % sig}
    return json.loads(data.decode("utf-8", "surrogatepass"))


def _out(obj):
    sys.stdout.buffer.write((json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8", "surrogatepass"))
    sys.stdout.buffer.flush()


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd = argv[1]
    if cmd == "check":
        pack()
        import importlib.metadata as md
        vers = {}
        for pkg in ("tree-sitter", "tree-sitter-language-pack", "tree-sitter-groovy"):
            try:
                vers[pkg] = md.version(pkg)
            except Exception:  # noqa
                vers[pkg] = None
        _out({"ok": True, "gold_version": GOLD_VERSION, "cache": CACHE_DIR, "languages": len(MAPS), "versions": vers,
              "core_kinds": CORE_KINDS, "secondary_kinds": SECONDARY_KINDS})
        return 0
    if cmd == "languages":
        _out({"gold_version": GOLD_VERSION, "languages": {k: list(v["exts"]) for k, v in MAPS.items()}, "aliases": ALIASES})
        return 0
    if cmd == "table":
        if "--write" in argv:
            write_table()
            print("table block rewritten")
        elif "--check" in argv:
            ok = embedded_table().strip() == table_md().strip()
            print("table block is current" if ok else "table block is STALE: run `python gold.py table --write`")
            return 0 if ok else 1
        else:
            print(table_md())
        return 0
    if cmd == "extract":  # extract LANG FILE
        lang, path = argv[2], argv[3]
        text = open(path, encoding="utf-8", errors="replace").read()
        _out(extract(None if lang == "-" else lang, text, path))
        return 0
    if cmd == "audit":
        lang, path = argv[2], argv[3]
        text = open(path, encoding="utf-8", errors="replace").read()
        _out(audit(None if lang == "-" else lang, text, path))
        return 0
    if cmd in ("serve", "batch"):  # JSONL in: {id,language,text,fileName}; JSONL out: {id,gold|error}
        for line in sys.stdin.buffer:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line.decode("utf-8", "surrogatepass"))
            except Exception as e:  # noqa
                _out({"id": None, "error": "bad request: %s" % e})
                continue
            res = extract_guarded(req)
            res["id"] = req.get("id")
            _out(res)
        return 0
    print("unknown command", cmd, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
