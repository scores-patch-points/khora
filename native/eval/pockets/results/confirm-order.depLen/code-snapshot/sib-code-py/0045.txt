#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rust_kw_giver.py: the GIVER step of priors/code-kw-rust.json (CodeKeywordPrior@1).

It is the Rust twin of javascript_kw_giver.py / python_kw_giver.py: same shape, same disclosure discipline, a different arbiter. It reads the
CLOSED CLASSES of the Rust language off three received authorities and writes them as a LanguageLawPrior@1-shaped JSON (the input shape the
EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs projects into a CodeKeywordPrior@1). Nothing is hand-typed as a keyword and nothing
is counted on any corpus:

  GRAMMAR (the giver the mission names): the tree-sitter grammar for rust, loaded through tree-sitter-language-pack (the authority gold.py
     uses). The shared rule (c0_grammar_keywords.py): every ANONYMOUS visible node kind that looks like a word, /^[#@]?[A-Za-z][A-Za-z0-9_]*$/,
     is a word token the grammar recognises. Three RUST-SPECIFIC extensions, each a rule over the grammar's own tables and none a word list:
       (R+1) an anonymous visible kind that is a word followed by `!` (`macro_rules!`): the word, because the grammar tokenises the bang with it;
       (R+2) the single anonymous kind `_`: both authorities below settle it, and the grammar tokenises it;
       (R+3) DEDICATED TERMINALS. tree-sitter-rust gives `crate`, `self`, `super` and `mut` named leaf kinds (`crate`, `self`, `super`,
             `mutable_specifier`), not anonymous tokens, so the shared rule cannot see them. A named leaf kind is a dedicated terminal iff
             (a) its kind equals its text, or the GRAMMAR PACK'S OWN highlights.scm classifies the kind as @keyword or @variable.builtin, AND
             (b) over a library of authored probe sentences (PROBE_LIBRARY below: ordinary Rust, containing no keyword list) it is a leaf with
                 exactly ONE distinct word-shaped text and its kind is not an identifier family. Its text then enters the grammar words.
  AUTHORITIES FOR RESERVEDNESS (the arbiter; the grammar alone cannot say, see K4). There is NO rust toolchain on this machine, so unlike V8
     for javascript there is no running engine: the arbiter is TWO independent declared authorities read as TEXT (never executed):
       (A) the Rust Reference, src/keywords.md and src/identifiers.md, rust-lang/reference @ a286e1e (MIT OR Apache-2.0). Its lexer grammar
           blocks STRICT_KEYWORDS, RESERVED_KEYWORDS, WEAK_KEYWORDS and RESERVED_RAW_IDENTIFIER are parsed, and its per-edition notes.
       (B) the compiler's own keyword table, compiler/rustc_span/src/symbol.rs, rust-lang/rust @ b57eb9a (MIT OR Apache-2.0): the `Keywords`
           block parsed by the section comments and `Matching predicates:` lines it carries, the edition years in the predicate bodies,
           `can_be_raw`, `is_path_segment_keyword` and `STDLIB_STABLE_CRATES`.
     The prior keeps what the grammar and BOTH authorities agree on as HARD, in the strongest sense a reader can use (the analogue of the
     javascript sloppy-goal rule: reserved in EVERY edition):
        hard = grammar words  INTERSECT  (reserved with no edition condition in A)  INTERSECT  (reserved with no edition condition in B)
        soft = grammar words that are not hard
     Words reserved only from an edition on (async, await, dyn, try: 2018; gen: 2024) are therefore SOFT: an edition-2015 crate may declare
     them, so the giver does not settle them. Weak keywords (default, macro_rules, raw, union), macro fragment specifiers (block, expr, ...,
     which are anonymous grammar tokens only after `$x:`) and the like are SOFT. Hard words REFUSE; soft words and builtins are recorded and
     NEVER refuse (S83 polarity).
  A RUST-SPECIFIC LIMIT, stated here and measured by K5 and in build-rust-priors.mjs (R1r, R4r): "cannot name a being" holds for the BARE word.
     The raw-identifier escape `r#match` legally names a being with a hard keyword's spelling (all hard words except `_`, `crate`, `self`,
     `super`, which both authorities exclude from raw form). The grammar lexes `r#match` as ONE identifier whose text keeps the `r#`, so a
     refusal on the exact string never refuses it. The reserved-but-not-grammar-token words (`Self`, abstract, become, box, do, final, macro,
     override, priv, typeof, unsized, virtual) are settled by both authorities too, but the grammar has no token for them, so they are NOT in
     the hard set (hard is a subset of the grammar's own words); they are listed in derivation.reservedButNotGrammarToken and in the prior's
     `refusalScope` as a typed, derived list a consumer MAY use.
  BUILTINS (recorded, never refuse): (i) PRIMITIVE TYPES: the words W of rustc's interned-symbol list (symbol.rs `Symbols` block, used only as
     a probe vocabulary) for which the grammar parses `fn f(x: W) {}` cleanly with a `primitive_type` node whose text is W (the grammar's
     primitive types: tree-sitter-rust aliases them, so they are not in its kind table); (ii) the STABLE PRELUDE: the names `pub use`d by
     library/core and library/std prelude v1.rs, parsed with the same grammar, skipping items carrying #[unstable]. Items and macros are not
     separated (the files do not separate them): `r#try` keeps its raw spelling. Library names beyond the prelude (std::collections::HashMap...)
     are NOT read: a typed gap, harmless because builtins never refuse.
  stdlibModules: STDLIB_STABLE_CRATES of symbol.rs (std, core, alloc, proc_macro): the crate roots a path can start from without a Cargo
     dependency. Not Python's importable module list: a Rust `use` of a third-party crate is a Cargo question, not a language one.

PRE-REGISTRATION (READING-POLICY II.5; written BEFORE the first run of this file; thresholds declared, never tuned).
  Disclosed exploratory reads that happened before this header was written (nothing else was looked at; no corpus file of any split was opened):
    (e1) the grammar's visible node kinds (gold.load): 54 anonymous word kinds (as async await block break const continue default dyn else enum
         expr expr_2021 extern false fn for gen ident if impl in let lifetime literal loop match meta mod move pat pat_param path pub raw ref
         return static stmt struct trait true try tt ty type union unsafe use vis where while yield); the anonymous non-word kinds `macro_rules!`
         and `_`; named word-shaped kinds including `self`, `super`, `crate`, `mutable_specifier`, `primitive_type`, `fragment_specifier`; and
         that no kind named u8/bool/str exists (primitive types are aliased).
    (e2) the pack's rust highlights.scm in full: a `@keyword` capture list (as async await break const continue default dyn else enum extern fn
         for gen if impl in let loop macro_rules! match mod move pub raw ref return static struct trait type union unsafe use where while yield),
         `(crate)`, `(mutable_specifier)`, `(super)` @keyword, `(self)` @variable.builtin, true/false as boolean_literal @constant.builtin, and
         no capture for `try`.
    (e3) the Reference keywords.md and identifiers.md in full; symbol.rs's Keywords block, the is_* predicates, can_be_raw and
         STDLIB_STABLE_CRATES. They agree on the surface: strict (35 words incl. `_`, `Self`), reserved (abstract become box do final gen macro
         override priv try typeof unsized virtual yield), weak (macro_rules raw safe union + 'static); edition: async/await/dyn 2018, try 2018,
         gen 2024; raw identifiers cannot be `_ crate self Self super`.
    (e4) core and std prelude v1.rs in full.
    (e5) grammar probes: `fn f() { let W = 0; }` for 35 reserved words (29 parse with no ERROR, 27 of them with an `identifier` node: true and
         false are clean but not identifiers; const, ref, mut, crate, self, super are not clean); `macro_rules! m { ($x:W) => {}; }` makes the 15 words above
         `fragment_specifier` leaves; `fn f(x: W) {}` for 21 candidate type names yields `primitive_type` for exactly 17 (u8 i8 u16 i16 u32 i32 u64
         i64 u128 i128 isize usize f32 f64 bool str char; not f16, f128, String, Option); and a four-line probe library produced the named leaf
         kinds crate, super, self (kind == text) and mutable_specifier (text `mut`). The PROBE_LIBRARY in this file is that library plus the
         `pub(crate)` / `pub(super)` / `pub(self)` / `pub(in ..)` visibility forms, added before the first run of this file.
  Cross-giver, one check per fact, all written down BEFORE the run. Because (e3) already showed the lists, K1..K4 are CONFIRMATORY; K5, K7 and
  K8 are not.
  K1 authority agreement. Let A_always (B_always) be the words the Reference (rustc) reserves with no edition condition, `_` included, `$crate`,
     `{{root}}` and lifetimes excluded (non-word); A_cond (B_cond) the {word: edition year} tables; and the reserved-raw sets. Pass iff
     A_always == B_always AND A_cond == B_cond AND the reserved-raw sets agree. Expected: pass; A_cond == {async:2018, await:2018, dyn:2018,
     try:2018, gen:2024}. The weak lists are compared informationally (rustc adds auto, builtin, catch, contract_*, default, pin, reuse, yeet).
  K2 soft discipline. Every soft word has at least one class from {weak (A or B), edition-conditional (A and B), macro fragment specifier
     (probe), unlisted by both}, and no soft word is in A_always or B_always. Pass: both. Expected: pass; soft = 24 = async await block default
     dyn expr expr_2021 gen ident item lifetime literal macro_rules meta pat pat_param path raw stmt try tt ty union vis.
  K3 arbiter consistency. Every hard word is a grammar word, is in A_always AND B_always, and has no edition note in either. Pass: all.
     Expected: pass; expected hard size 36 (_ as break const continue crate else enum extern false fn for if impl in let loop match mod move mut
     pub ref return self static struct super trait true type unsafe use where while yield); a different size is reported, not a failure.
  K4 why an arbiter (informational with a prediction). The number of hard words the GRAMMAR ITSELF parses cleanly as a binding name (`let W =
     0;`, no ERROR or MISSING, an `identifier` node with text W). Prediction: >= 20 (tree-sitter lexes by parse state). If the number is below 10
     the WHY paragraph of this docstring is wrong and must be withdrawn.
  K5 raw-identifier escape. For every hard word that rustc's can_be_raw admits, `let r#W = 0;` parses cleanly with an `identifier` node whose
     text is `r#W`. LICENCE (control built to fail): the same probe with the invalid prefix `q#` parses cleanly for fewer than half of those
     words; otherwise K5 is "unlicensed". Pass: all of them clean AND licensed. Expected: pass. (Words rustc excludes are expected to be
     reported with the grammar's verdict on `r#_`, `r#crate`... but have no pass rule.)
  K6 builtins. The primitive types derived by the probe are >= 10 with positives <= 5% of the probe vocabulary (the probe discriminates), the
     stable prelude names are >= 40, and no builtin is in the hard set. Pass: all three. Expected: primitive types = 17.
  K7 stdlib crates. STDLIB_STABLE_CRATES parses to a non-empty list of words each present in the Symbols vocabulary. Expected: [std, core,
     alloc, proc_macro].
  K8 (control for the shared word rule) is run by build-rust-priors.mjs, which consumes this file's output; its rule is in that header.
GRAMMAR VERSION (typed gap, disclosed, as in the python and javascript givers): the installed language pack records neither the upstream commit
nor a semantic version for its rust grammar. The prior records the PACK version, the sha256 of the compiled grammar library, the ABI version,
the upstream URL and a fingerprint of the node-kind table; the upstream commit is null, not guessed.

usage: python rust_kw_giver.py OUT.json
"""
import collections, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gold  # noqa: E402  (the grammar loader of the gold instrument: same authority, same cache)

SRC_DIR = os.environ.get("RUST_GIVER_SOURCES") or "/private/tmp/claude-501/coding-competence/rust-priors/giver-sources"
WORD = re.compile(r"^[#@]?[A-Za-z][A-Za-z0-9_]*$")
BANG_WORD = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)!$")

# AUTHORED probe sentences (model-written fixture, labelled authored: ordinary Rust, containing no keyword list; used ONLY to find the texts
# of the grammar's dedicated named terminals, rule R+3). Coverage is bounded by this library: K9 reports any highlights.scm keyword kind whose
# text was not found.
PROBE_LIBRARY = [
    "use crate::alpha::beta;\nuse super::gamma;\nuse self::delta;\nuse std::{self, io};\n",
    "struct Holder<'a, T: Copy> { value: &'a mut T, other: u8 }\n",
    "impl Holder<'_, i32> { fn grab(&self, y: &mut i32) -> Self { let mut z = 0u8; let r = &raw const z; Self { value: y, other: z } } }\n",
    "macro_rules! mk { ($x:expr) => { $x }; }\nfn main() { let v = mk!(1); self::grab(); super::other(); }\n",
    "mod outer { pub(crate) fn inner() {} pub(super) fn upper() {} pub(self) fn mine() {} pub(in crate::outer) fn scoped() {} }\n",
]

FAMILY_SUFFIX = ("identifier",)  # kinds whose text varies by construction (open class)


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)


def parse(parser, src):
    root = parser.parse(src.encode("utf8")).root_node
    return root, any(x.type == "ERROR" or x.is_missing for x in walk(root))


def kinds_of(lang):
    anon, named, allk, anon_all = set(), set(), [], set()
    for i in range(lang.node_kind_count):
        k = lang.node_kind_for_id(i)
        if k is None or not lang.node_kind_is_visible(i):
            continue
        nm = lang.node_kind_is_named(i)
        allk.append((k, nm))
        if not nm:
            anon_all.add(k)
        if WORD.match(k):
            (named if nm else anon).add(k)
    return anon, named, allk, anon_all


# ── the authority texts (sha256-verified against SOURCES.json) ────────────────────────────────────────────────────────────────────────
def load_sources():
    meta = json.load(open(os.path.join(SRC_DIR, "SOURCES.json")))
    out, rows = {}, {}
    for f in meta["files"]:
        b = open(os.path.join(SRC_DIR, f["file"]), "rb").read()
        if sha256_bytes(b) != f["sha256"]:
            raise RuntimeError("giver source %s does not match its recorded sha256" % f["file"])
        out[f["file"]] = b.decode("utf8")
        rows[f["file"]] = {k: f[k] for k in ("url", "repo", "commit", "commit_date", "bytes", "sha256")}
    return out, rows, meta


def parse_reference(md, ident_md):
    """Reference lexer-grammar blocks -> strict, reserved, weak word lists, edition notes, reserved raw identifiers."""
    def block(root_name, text):
        m = re.search(r"@root\s+%s\s*->(.*?)```" % re.escape(root_name), text, re.S)
        return re.findall(r"`([^`]+)`", m.group(1)) if m else []
    strict = block("STRICT_KEYWORDS", md)
    reserved = block("RESERVED_KEYWORDS", md)
    weak = block("WEAK_KEYWORDS", md)
    # edition notes: a label r[lex.keywords.(strict|reserved).editionYYYY] followed by blockquote lines until the next label
    editions, label = {}, None
    for line in md.splitlines():
        m = re.match(r"^r\[lex\.keywords\.(strict|reserved)\.edition(\d{4})\]", line)
        if m:
            label = (m.group(1), int(m.group(2)))
            continue
        if line.startswith("r["):
            label = None
            continue
        if label and line.startswith(">"):
            for w in re.findall(r"`([A-Za-z_][A-Za-z0-9_]*)`", line):
                editions[w] = label[1]
    rr = re.search(r"RESERVED_RAW_IDENTIFIER\s*->(.*?)```", ident_md, re.S)
    reserved_raw = re.findall(r"`([^`]+)`", rr.group(1)) if rr else []
    reserved_raw = [w for w in reserved_raw if w != "r#"]
    return {"strict": strict, "reserved": reserved, "weak": weak, "editions": editions, "reservedRawIdentifier": reserved_raw}


def parse_rustc(src):
    lines = src.splitlines()
    i0 = next(i for i, l in enumerate(lines) if re.match(r"^\s*Keywords\s*\{", l))
    indent = len(lines[i0]) - len(lines[i0].lstrip())
    sections, cur, comments, preds = [], None, [], []
    entry_re = re.compile(r'^\s*(\w+):\s*"((?:[^"\\]|\\.)*)",?\s*(?://\s*(.*))?$')
    for l in lines[i0 + 1:]:
        if re.match(r"^ {%d}\}" % indent, l):
            break
        s = l.strip()
        if not s:
            continue
        if s.startswith("//"):
            t = s[2:].strip()
            if t.startswith("tidy-alphabetical"):
                continue
            m = re.match(r"Matching predicates:\s*(.*)$", t)
            if m:
                preds = re.findall(r"`([^`]+)`", m.group(1)) if "`" in m.group(1) else []
                if cur is not None and cur["open"]:
                    cur["open"] = False
                continue
            if cur is not None and not cur["open"] and not comments:
                pass
            comments.append(t)
            continue
        m = entry_re.match(l)
        if not m:
            continue
        if comments or preds or cur is None:
            cur = {"comments": comments, "predicates": [p for p in preds if p != "is_reserved"], "entries": [], "open": True}
            sections.append(cur)
            comments, preds = [], []
        year = None
        if m.group(3):
            ym = re.search(r">=\s*(\d{4})\s*Edition", m.group(3))
            year = int(ym.group(1)) if ym else None
        cur["entries"].append({"ident": m.group(1), "text": m.group(2), "edition": year})
    cls_of = {"is_special": "special", "is_used_keyword_always": "used_always", "is_unused_keyword_always": "unused_always",
              "is_used_keyword_conditional": "used_conditional", "is_unused_keyword_conditional": "unused_conditional", "is_weak": "weak"}
    table = {}
    for sct in sections:
        pred = sct["predicates"][0] if sct["predicates"] else None
        cls = cls_of.get(pred) or ("lifetime" if any("Lifetime keywords" in c for c in sct["comments"]) else "unknown")
        for e in sct["entries"]:
            table[e["text"]] = {"class": cls, "ident": e["ident"], "edition": e["edition"], "section": sct["comments"][:1]}
    ident_to_text = {e["ident"]: t for t, e in ((t, v) for t, v in table.items())}
    # edition years in the predicate bodies (authoritative code, cross-checks the trailing comments)
    pred_years = {}
    m = re.search(r"fn is_used_keyword_conditional.*?\{(.*?)\n    \}", src, re.S)
    if m:
        ym = re.search(r"Edition::Edition(\d{4})", m.group(1))
        rng = re.search(r"self\s*>=\s*kw::(\w+)\s*&&\s*self\s*<=\s*kw::(\w+)", m.group(1))
        if ym and rng:
            lo, hi = ident_to_text.get(rng.group(1)), ident_to_text.get(rng.group(2))
            for t, e in table.items():
                if e["class"] == "used_conditional":
                    pred_years[t] = int(ym.group(1))
            pred_years["__range__"] = [lo, hi]
    m = re.search(r"fn is_unused_keyword_conditional.*?\{(.*?)\n    \}", src, re.S)
    if m:
        for kid, yr in re.findall(r"kw::(\w+)\s*&&\s*edition\(\)\.at_least_rust_(\d{4})", m.group(1)):
            pred_years[ident_to_text.get(kid, kid)] = int(yr)
    # raw-identifier law
    def fn_body(name):
        mm = re.search(r"fn %s\(self\)[^{]*\{(.*?)\n    \}" % name, src, re.S)
        return mm.group(1) if mm else ""
    seg = [ident_to_text.get(k, k) for k in re.findall(r"kw::(\w+)", fn_body("is_path_segment_keyword"))]
    raw_body = fn_body("can_be_raw")
    excl = [ident_to_text.get(k, k) for k in re.findall(r"kw::(\w+)", raw_body)]
    cannot_be_raw = sorted(set(excl) | set(seg))
    # stdlib crates
    sm = re.search(r"STDLIB_STABLE_CRATES:[^=]*=\s*&\[(.*?)\];", src, re.S)
    stdlib = re.findall(r"sym::(\w+)", sm.group(1)) if sm else []
    # symbols vocabulary (probe vocabulary only)
    j0 = next(i for i, l in enumerate(lines) if re.match(r"^\s*Symbols\s*\{", l))
    ind2 = len(lines[j0]) - len(lines[j0].lstrip())
    vocab = []
    for l in lines[j0 + 1:]:
        if re.match(r"^ {%d}\}" % ind2, l):
            break
        mm = entry_re.match(l)
        if mm:
            vocab.append(mm.group(2))
            continue
        mm = re.match(r"^\s*(\w+),", l)
        if mm:
            vocab.append(mm.group(1))
    return {"table": table, "predYears": pred_years, "cannotBeRaw": cannot_be_raw, "stdlibCrates": stdlib, "symbolVocabulary": sorted(set(vocab)), "sections": [{"comments": s["comments"], "predicates": s["predicates"], "n": len(s["entries"])} for s in sections]}


def reserved_sets_rustc(rc):
    always, cond = set(), {}
    for t, e in rc["table"].items():
        if not (WORD.match(t) or t == "_"):
            continue
        if e["class"] in ("used_always", "unused_always"):
            always.add(t)
        elif e["class"] == "special" and t == "_":
            always.add(t)
        elif e["class"] in ("used_conditional", "unused_conditional"):
            cond[t] = rc["predYears"].get(t) or e["edition"]
    return always, cond


def reserved_sets_reference(ref):
    cond = dict(ref["editions"])
    always = {w for w in ref["strict"] + ref["reserved"] if (WORD.match(w) or w == "_") and w not in cond}
    return always, cond


# ── prelude (parsed with the SAME grammar) ───────────────────────────────────────────────────────────────────────────────────────────
def prelude_names(parser, text):
    root = parser.parse(text.encode("utf8")).root_node
    names, skipped_unstable, wildcard = set(), [], 0

    def last_ident(n):
        if n.type == "scoped_identifier":
            return last_ident(n.child_by_field_name("name"))
        return n.text.decode()

    def leaves(n, parent_last=None):
        t = n.type
        if t == "identifier":
            yield n.text.decode()
        elif t == "scoped_identifier":
            yield from leaves(n.child_by_field_name("name"))
        elif t == "scoped_use_list":
            path = n.child_by_field_name("path")
            lst = n.child_by_field_name("list")
            pl = last_ident(path) if path is not None else parent_last
            for c in (lst.named_children if lst is not None else []):
                if c.type == "self":
                    if pl:
                        yield pl
                else:
                    yield from leaves(c, pl)
        elif t == "use_list":
            for c in n.named_children:
                yield from leaves(c, parent_last)
        elif t == "use_as_clause":
            a = n.child_by_field_name("alias")
            if a is not None and a.text.decode() != "_":
                yield a.text.decode()
        elif t == "self":
            if parent_last:
                yield parent_last

    attrs = []
    for c in root.children:
        if c.type == "attribute_item":
            attrs.append(c.text.decode())
            continue
        if c.type in ("line_comment", "block_comment", "inner_attribute_item"):
            continue
        if c.type == "use_declaration":
            arg = c.child_by_field_name("argument")
            if any(a.startswith("#[unstable") for a in attrs):
                skipped_unstable.extend(sorted(set(leaves(arg))))
            else:
                if arg is not None and arg.type == "use_wildcard":
                    wildcard += 1
                else:
                    names.update(leaves(arg))
        attrs = []
    return names, sorted(set(skipped_unstable)), wildcard


# ── highlights.scm (the grammar package's own classification) ────────────────────────────────────────────────────────────────────────
def parse_highlights(hl):
    literals = sorted(set(re.findall(r'^"([^"]+)"\s*@keyword\s*$', hl, re.M)))
    named = sorted(set(re.findall(r"\((\w+)\)\s*@(?:keyword|variable\.builtin)\b", hl)))
    return literals, named


def main():
    out = sys.argv[1]
    src, src_rows, src_meta = load_sources()
    ref = parse_reference(src["reference-keywords.md"], src["reference-identifiers.md"])
    rc = parse_rustc(src["rustc_span-symbol.rs"])
    A_always, A_cond = reserved_sets_reference(ref)
    B_always, B_cond = reserved_sets_rustc(rc)
    ref_cannot_raw = sorted(ref["reservedRawIdentifier"])

    g = gold.resolve("rust")
    parser, lang = gold.load(g)
    anon, named_word, kinds, anon_all = kinds_of(lang)
    fingerprint = hashlib.sha256(json.dumps(sorted(set(kinds))).encode()).hexdigest()
    hl_text = gold.pack().get_highlights_query("rust")
    hl_literals, hl_named = parse_highlights(hl_text)

    # ---- GRAMMAR words: shared rule + R+1 + R+2 + R+3 ---------------------------------------------------------------------------------
    bang = {m.group(1): k for k in anon_all for m in [BANG_WORD.match(k)] if m}
    underscore = ["_"] if "_" in anon_all else []
    census = collections.defaultdict(set)
    for sent in PROBE_LIBRARY:
        root, bad = parse(parser, sent)
        for n in walk(root):
            if n.child_count == 0 and n.is_named:
                census[n.type].add(n.text.decode())
    candidates = set(hl_named) | {k for k in named_word if k in census and census[k] == {k}}
    dedicated = {}
    for k in sorted(candidates):
        texts = census.get(k, set())
        if len(texts) == 1 and not k.endswith(FAMILY_SUFFIX):
            tx = next(iter(texts))
            if WORD.match(tx):
                dedicated[k] = tx
    k9_missing = sorted(k for k in hl_named if k not in dedicated)
    grammar_words = sorted(anon | set(bang) | set(underscore) | set(dedicated.values()))
    gw = set(grammar_words)

    # ---- HARD / SOFT -------------------------------------------------------------------------------------------------------------------
    arbiter = A_always & B_always
    hard = sorted(gw & arbiter)
    soft = sorted(gw - set(hard))
    reserved_not_grammar = sorted(arbiter - gw)

    # fragment specifiers by probe
    frag = []
    for w in sorted(gw):
        root, bad = parse(parser, "macro_rules! m { ($x:%s) => {}; }\n" % w)
        fs = [n for n in walk(root) if n.type == "fragment_specifier"]
        if not bad and fs and fs[0].text.decode() == w:
            frag.append(w)

    # ---- checks ------------------------------------------------------------------------------------------------------------------------
    # K1
    ref_weak = {w for w in ref["weak"] if WORD.match(w)}
    rc_weak = {t for t, e in rc["table"].items() if e["class"] == "weak"}
    rc_cond_years_from_comments = {t: e["edition"] for t, e in rc["table"].items() if e["class"] in ("used_conditional", "unused_conditional")}
    reserved_raw_rc = sorted((set(rc["cannotBeRaw"]) & {w for w in rc["cannotBeRaw"] if WORD.match(w) or w == "_"}))
    k1 = {
        "pass": A_always == B_always and A_cond == B_cond and set(ref_cannot_raw) == set(reserved_raw_rc),
        "A_always": sorted(A_always), "B_always": sorted(B_always), "onlyReference": sorted(A_always - B_always), "onlyRustc": sorted(B_always - A_always),
        "A_cond": A_cond, "B_cond": B_cond, "rustcCommentYearsEqualPredicateYears": rc_cond_years_from_comments == {t: rc["predYears"].get(t) for t in rc_cond_years_from_comments},
        "referenceReservedRaw": ref_cannot_raw, "rustcCannotBeRaw": rc["cannotBeRaw"], "reservedRawAgree": set(ref_cannot_raw) == set(reserved_raw_rc),
        "weak": {"reference": sorted(ref_weak), "rustc": sorted(rc_weak), "onlyReference": sorted(ref_weak - rc_weak), "onlyRustc": sorted(rc_weak - ref_weak)},
        "predictedCond": {"async": 2018, "await": 2018, "dyn": 2018, "try": 2018, "gen": 2024},
    }
    k1["condAsPredicted"] = A_cond == k1["predictedCond"]
    # K2
    classes = {}
    for w in soft:
        c = []
        if w in ref_weak or w in rc_weak:
            c.append("weak:" + "+".join(x for x, s in (("reference", ref_weak), ("rustc", rc_weak)) if w in s))
        if w in A_cond and w in B_cond:
            c.append("edition-conditional:%s" % A_cond[w])
        if w in frag:
            c.append("macro-fragment-specifier")
        listed = w in A_always or w in B_always or w in A_cond or w in B_cond or w in ref_weak or w in rc_weak
        if not c and not listed:
            c.append("unlisted-by-both-authorities")
        classes[w] = c
    k2 = {"pass": all(classes.values()) and not (set(soft) & (A_always | B_always)), "soft": soft, "classes": classes,
          "predictedSoft": ["async", "await", "block", "default", "dyn", "expr", "expr_2021", "gen", "ident", "item", "lifetime", "literal", "macro_rules", "meta", "pat", "pat_param", "path", "raw", "stmt", "try", "tt", "ty", "union", "vis"]}
    k2["softAsPredicted"] = soft == k2["predictedSoft"]
    # K3
    k3 = {"pass": bool(hard) and all(w in gw and w in A_always and w in B_always and w not in A_cond and w not in B_cond for w in hard),
          "hard": len(hard), "predictedSize": 36, "sizeAsPredicted": len(hard) == 36}
    # K4
    lenient = []
    for w in hard:
        root, bad = parse(parser, "fn f() { let %s = 0; }\n" % w)
        ids = [n for n in walk(root) if n.type == "identifier" and n.text.decode() == w]
        if not bad and ids:
            lenient.append(w)
    k4 = {"engineReservedWordsGrammarAcceptsAsBindingName": lenient, "n": len(lenient), "of": len(hard), "prediction_ge_20_held": len(lenient) >= 20, "withdrawBelow": 10}
    # K5
    can_raw = [w for w in hard if w not in rc["cannotBeRaw"]]
    cannot_raw_in_hard = [w for w in hard if w in rc["cannotBeRaw"]]

    def raw_probe(prefix, ws):
        res = {}
        for w in ws:
            root, bad = parse(parser, "fn f() { let %s%s = 0; }\n" % (prefix, w))
            ids = [n for n in walk(root) if n.type == "identifier" and n.text.decode() == prefix + w]
            res[w] = bool(not bad and ids)
        return res
    real_raw = raw_probe("r#", can_raw)
    ctl_raw = raw_probe("q#", can_raw)
    lic5 = len(can_raw) > 0 and sum(ctl_raw.values()) < len(can_raw) / 2
    k5 = {"pass": lic5 and all(real_raw.values()), "licensed": lic5, "words": len(can_raw), "cleanAsRawIdentifier": sum(real_raw.values()), "notClean": sorted(w for w, ok in real_raw.items() if not ok),
          "controlPrefix": "q#", "controlCleanCount": sum(ctl_raw.values()), "cannotBeRawInHard": cannot_raw_in_hard,
          "grammarVerdictOnCannotBeRaw": raw_probe("r#", cannot_raw_in_hard)}
    # K6 builtins
    vocab = rc["symbolVocabulary"]
    prims = []
    for w in vocab:
        if not WORD.match(w):
            continue
        root, bad = parse(parser, "fn f(x: %s) {}\n" % w)
        ps = [n for n in walk(root) if n.type == "primitive_type"]
        if not bad and ps and ps[0].text.decode() == w:
            prims.append(w)
    prims = sorted(set(prims))
    names_core, unstable_core, wc_core = prelude_names(parser, src["rust-library_core_src_prelude_v1.rs"])
    names_std, unstable_std, wc_std = prelude_names(parser, src["rust-library_std_src_prelude_v1.rs"])
    prelude = sorted(names_core | names_std)
    builtins = sorted(set(prims) | set(prelude))
    k6 = {"pass": len(prims) >= 10 and len(prims) <= 0.05 * len(vocab) and len(prelude) >= 40 and not (set(builtins) & set(hard)),
          "primitiveTypes": prims, "probeVocabulary": len(vocab), "primitiveShareOfVocabulary": len(prims) / max(1, len(vocab)), "predictedPrimitiveTypes": 17,
          "preludeNames": len(prelude), "preludeCore": len(names_core), "preludeStd": len(names_std), "unstableSkipped": sorted(set(unstable_core) | set(unstable_std)), "wildcardUsesSkipped": wc_core + wc_std,
          "builtinsInHard": sorted(set(builtins) & set(hard)), "builtinsInSoft": sorted(set(builtins) & set(soft))}
    # K7
    k7 = {"pass": bool(rc["stdlibCrates"]) and all(w in set(vocab) for w in rc["stdlibCrates"]), "stdlibStableCrates": rc["stdlibCrates"], "predicted": ["std", "core", "alloc", "proc_macro"]}
    # K9 (informational): the grammar pack's own highlights vs the grammar words
    hl_words = sorted({w.rstrip("!") for w in hl_literals})
    k9 = {"highlightsKeywordLiterals": hl_words, "highlightsKeywordNamedKinds": hl_named, "namedKindsWithoutFoundText": k9_missing,
          "highlightsWordsNotGrammarWords": sorted(set(hl_words) - gw),
          "grammarWordsNotHighlightedAsKeyword": sorted(gw - set(hl_words) - set(dedicated.values())),
          "dedicatedTerminals": dedicated}

    soft_sources = {}
    for w in soft:
        s = []
        if w in anon:
            s.append("grammar:anonymous-word-token")
        if w in bang:
            s.append("grammar:anonymous-token:" + bang[w])
        if w in underscore:
            s.append("grammar:anonymous-token:_")
        if w in dedicated.values():
            s.append("grammar:dedicated-terminal")
        s += ["authority:" + c for c in classes[w]]
        soft_sources[w] = s
    hard_sources = {}
    for w in hard:
        s = []
        if w in anon:
            s.append("grammar:anonymous-word-token")
        if w in bang:
            s.append("grammar:anonymous-token:" + bang[w])
        if w in underscore:
            s.append("grammar:anonymous-token:_")
        for k, tx in dedicated.items():
            if tx == w:
                s.append("grammar:dedicated-terminal:" + k)
        s += ["reference:%s" % ("strict" if w in ref["strict"] else "reserved"), "rustc:%s" % rc["table"][w]["class"] if w in rc["table"] else "rustc:special"]
        hard_sources[w] = s

    doc = {
        "schema": "LanguageLawPrior@1",
        "language": "rust",
        "giver": {
            "resource": "tree-sitter grammar for rust (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by two declared authorities read as text (the Rust Reference keywords.md @ a286e1e and rustc's keyword table symbol.rs @ b57eb9a; no rust toolchain is available, so no engine is run) for which words are reserved; hard = grammar words INTERSECT reserved-in-every-edition by BOTH authorities",
            "engine": {"implementation": "rustc keyword table (rust-lang/rust compiler/rustc_span/src/symbol.rs), READ AS TEXT", "commit": src_rows["rustc_span-symbol.rs"]["commit"], "mode": "no compile probe: no rust toolchain locally (a typed gap; an engine arbiter like V8 for javascript is the unmeasured upgrade)"},
            "note": "Derived, never hand-typed (rust_kw_giver.py): hard = (grammar word tokens U `macro_rules!`-style bang tokens U `_` U dedicated named terminals) INTERSECT the words the Rust Reference AND rustc's own table both reserve with no edition condition; soft = the rest of the grammar words (edition-conditional async/await/dyn/try/gen, weak default/macro_rules/raw/union, macro fragment specifiers); builtins = grammar-probed primitive types U the stable std prelude names; stdlibModules = STDLIB_STABLE_CRATES. Hard words refuse BARE names only: the raw identifier `r#match` legally names a being. Semantics stay in the engine.",
        },
        "lexical": {"keywords": hard, "softKeywords": soft},
        "builtins": builtins,
        "lexicon": {"stdlibModules": sorted(rc["stdlibCrates"])},
        "derivation": {
            "grammar": {
                "name": "rust", "package": "tree-sitter-language-pack", "packageVersion": "1.21.0", "packageLicense": "MIT",
                "packageSource": "https://github.com/xberg-io/tree-sitter-language-pack",
                "upstream": "https://github.com/tree-sitter/tree-sitter-rust", "upstreamLicense": "MIT",
                "upstreamCommit": None, "upstreamCommitNote": "not recorded by the installed pack (Language.semantic_version is None); typed gap, not guessed",
                "abi": lang.abi_version, "nodeKindCount": lang.node_kind_count, "nodeKindFingerprintSha256": fingerprint,
                "anonymousWordKinds": sorted(anon), "bangTokens": bang, "underscoreToken": underscore, "dedicatedTerminals": dedicated,
                "rule": "anonymous visible node kinds matching /^[#@]?[A-Za-z][A-Za-z0-9_]*$/ (c0_grammar_keywords.py rule) + R+1 word-bang anonymous kinds + R+2 the anonymous `_` + R+3 dedicated named terminals (kind == text, or classified @keyword/@variable.builtin by the pack's highlights.scm; single fixed text over the authored probe library)",
                "probeLibrary": {"authored": True, "sentences": len(PROBE_LIBRARY), "note": "model-written fixture; contains no keyword list; only locates the text of dedicated terminals"},
                "highlightsScm": {"source": "tree-sitter-language-pack get_highlights_query('rust') (tree-sitter-rust queries/highlights.scm)", "sha256": sha256_bytes(hl_text.encode("utf8")), "keywordLiterals": hl_words, "keywordNamedKinds": hl_named},
            },
            "authorities": {
                "reference": {"files": {k: src_rows[k] for k in ("reference-keywords.md", "reference-identifiers.md", "reference-LICENSE-MIT")}, "licence": "MIT OR Apache-2.0", "strict": ref["strict"], "reserved": ref["reserved"], "weak": ref["weak"], "editionNotes": ref["editions"], "reservedRawIdentifier": ref["reservedRawIdentifier"]},
                "rustc": {"file": src_rows["rustc_span-symbol.rs"], "licence": "MIT OR Apache-2.0", "sections": rc["sections"], "classes": {t: {"class": e["class"], "edition": e["edition"]} for t, e in sorted(rc["table"].items())}, "predicateEditionYears": rc["predYears"], "cannotBeRaw": rc["cannotBeRaw"]},
                "preludeFiles": {k: src_rows[k] for k in ("rust-library_core_src_prelude_v1.rs", "rust-library_std_src_prelude_v1.rs")},
                "sourcesProvenance": "/private/tmp/claude-501/coding-competence/rust-priors/giver-sources/PROVENANCE.md (fetched 2026-10-06 with curl; sha256 verified before every read)",
                "fetchedAt": src_meta["fetched_at"],
            },
            "reservedInEveryEdition": {"reference": sorted(A_always), "rustc": sorted(B_always)},
            "editionConditional": {"reference": A_cond, "rustc": B_cond, "note": "reserved only from the edition on (async/await/dyn/try 2018, gen 2024): legally declarable in an older edition, therefore SOFT, never refused"},
            "reservedButNotGrammarToken": reserved_not_grammar,
            "reservedButNotGrammarTokenNote": "settled by BOTH authorities but the grammar has no token for them (Self is a type_identifier; the others are unused reserved words): derived, kept out of the hard set so that hard is a subset of the grammar's own words; a consumer MAY refuse them too",
            "grammarWordsNotHard": soft, "softSources": soft_sources, "hardSources": hard_sources,
            "macroFragmentSpecifiers": frag,
            "primitiveTypes": prims, "preludeNames": prelude, "preludeUnstableSkipped": k6["unstableSkipped"],
            "builtinsNote": "primitive types by grammar probe over rustc's interned-symbol vocabulary + the stable names of std::prelude::v1 / core::prelude::v1 (items and macros together; `r#try` keeps its raw spelling). Library names beyond the prelude (HashMap, Rc, ...) are NOT read: a typed gap, harmless because builtins never refuse",
            "stdlibModules": {"status": "ok", "giver": "rustc STDLIB_STABLE_CRATES", "crates": sorted(rc["stdlibCrates"]), "note": "crate roots of the standard distribution; a use of any other crate is a Cargo question, not a language one"},
            "bindingOnly": "a hard keyword cannot name a being as a BARE word; the raw identifier `r#word` (the grammar lexes it as one identifier whose text keeps `r#`) can, for every hard word except `_`, `crate`, `self`, `super`",
            "refusalScope": {"rawIdentifierEscape": True, "cannotBeRaw": [w for w in hard if w in rc["cannotBeRaw"]], "editionConditional": A_cond},
            "checks": {"K1": k1, "K2": k2, "K3": k3, "K4": k4, "K5": k5, "K6": k6, "K7": k7, "K9": k9},
        },
        "counts": {"keywords": len(hard), "softKeywords": len(soft), "builtins": len(builtins), "stdlibModules": len(rc["stdlibCrates"])},
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
    print(json.dumps({"out": out, "hard": len(hard), "soft": len(soft), "builtins": len(builtins), "K1": k1["pass"], "K2": k2["pass"], "K3": k3["pass"], "K4_n": len(lenient),
                      "K5": k5["pass"], "K6": k6["pass"], "K7": k7["pass"], "K1_condAsPredicted": k1["condAsPredicted"], "K2_softAsPredicted": k2["softAsPredicted"],
                      "K3_sizeAsPredicted": k3["sizeAsPredicted"], "reservedButNotGrammarToken": reserved_not_grammar, "dedicated": dedicated, "primitive": len(prims), "prelude": len(prelude),
                      "K9_missing": k9_missing}))


if __name__ == "__main__":
    main()
