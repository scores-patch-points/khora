"""
langmap.py -- DECLARED constants for the khora polyglot code corpus builder.

This module is a declaration, not a measurement. Every number below is a
DECLARED threshold (READING-POLICY P4): chosen by the task statement or by a
stated reason, never by looking at how a reader scores on the result.

What lives here
  * the 51 target language ids (the task's list, verbatim)
  * the extension -> language map (extension is the ONLY name-level witness;
    ambiguous extensions are resolved by content rules, see resolve_*)
  * the file-eligibility filters (size, lines, minified, generated, vendored,
    lockfile, boilerplate)
  * the split rule (BY REPOSITORY, hash of the lower-cased owner/repo)
  * licence allow-list (permissive only for anything FETCHED)

Nothing here calls a model. Identification of a file's language from its
extension is a REGISTRY lookup (the extension is the giver: it is what the
file's author/toolchain declared); content rules only REFUSE (reject a file
whose content contradicts the extension) -- they never nominate a language
for a file the extension did not already name. `.h`, `.m`, `.v`, `.pl`,
`.cl`, `.f` are the six ambiguous extensions; each is resolved by a
declared, auditable rule below and the rule's verdict is recorded per file.
"""
import hashlib
import re

LANGUAGES = [
    "python", "javascript", "typescript", "tsx", "java", "c", "cpp", "c_sharp", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "haskell", "lua", "perl", "r", "julia",
    "bash", "sql", "html", "css", "json", "yaml", "toml", "zig", "ocaml", "elixir",
    "erlang", "clojure", "dart", "elm", "fortran", "commonlisp", "scheme", "racket", "verilog", "nim",
    "groovy", "objc", "powershell", "matlab", "cobol", "lean", "solidity", "svelte", "vue", "markdown",
    "latex",
]
assert len(LANGUAGES) == 51 and len(set(LANGUAGES)) == 51

# ---------------------------------------------------------------- extensions
# value starting with '@' = ambiguous, resolved by content (see resolve_ambiguous)
EXT = {}
def _add(lang, *exts):
    for e in exts:
        assert e not in EXT, e
        EXT[e] = lang

_add("python", ".py")
_add("javascript", ".js", ".mjs", ".cjs", ".jsx")
_add("typescript", ".ts", ".mts", ".cts")        # .d.ts excluded by name rule
_add("tsx", ".tsx")
_add("java", ".java")
_add("c", ".c")
_add("cpp", ".cpp", ".cc", ".cxx", ".c++", ".hpp", ".hh", ".hxx", ".h++", ".ipp", ".inl", ".tpp")
_add("c_sharp", ".cs")
_add("go", ".go")
_add("rust", ".rs")
_add("ruby", ".rb")
_add("php", ".php")
_add("swift", ".swift")
_add("kotlin", ".kt", ".kts")
_add("scala", ".scala", ".sc")
_add("haskell", ".hs", ".lhs")
_add("lua", ".lua")
_add("perl", ".pm")
_add("r", ".r")                                   # extension compared lower-cased
_add("julia", ".jl")
_add("bash", ".sh", ".bash")
_add("sql", ".sql")
_add("html", ".html", ".htm")
_add("css", ".css")
_add("json", ".json")
_add("yaml", ".yml", ".yaml")
_add("toml", ".toml")
_add("zig", ".zig")
_add("ocaml", ".ml", ".mli")
_add("elixir", ".ex", ".exs")
_add("erlang", ".erl", ".hrl")
_add("clojure", ".clj", ".cljs", ".cljc")
_add("dart", ".dart")
_add("elm", ".elm")
_add("fortran", ".f90", ".f95", ".f03", ".f08")   # .f / .for are ambiguous (Forth, Filebench)
_add("commonlisp", ".lisp", ".lsp", ".asd")
_add("scheme", ".scm", ".ss", ".sld")      # .sls omitted: SaltStack state files dominate it on GitHub
_add("racket", ".rkt")
_add("verilog", ".sv", ".svh", ".vh")             # SystemVerilog is carried in the verilog family; .v is ambiguous
_add("nim", ".nim", ".nims", ".nimble")
_add("groovy", ".groovy", ".gradle")
_add("objc", ".mm")                               # .m / .h are ambiguous
_add("powershell", ".ps1", ".psm1", ".psd1")
_add("cobol", ".cob", ".cbl", ".cobol", ".cpy")
_add("lean", ".lean")
_add("solidity", ".sol")
_add("svelte", ".svelte")
_add("vue", ".vue")
_add("markdown", ".md", ".markdown")
_add("latex", ".tex", ".sty", ".cls", ".ltx")
for _e, _r in {".h": "@h", ".m": "@m", ".v": "@v", ".pl": "@pl", ".cl": "@cl", ".f": "@f", ".for": "@f"}.items():
    EXT[_e] = _r
# a file that has been through the map names exactly one candidate (or one ambiguity)
assert set(v for v in EXT.values() if not v.startswith("@")) <= set(LANGUAGES)
assert set(LANGUAGES) <= set(v for v in EXT.values() if not v.startswith("@")) | {"c", "objc", "matlab"}

# ---------------------------------------------------------------- declared filter constants
SIZE_MAX = 200 * 1024            # task: skip files > 200 KB
LINES_MIN = 15                   # task: skip files with fewer than 15 lines
MAX_LINE_CODE = 1000             # minified: any line longer than this (code languages)
MEAN_LINE_CODE = 200             # minified: mean line length above this (code languages)
MEAN_LINE_TEXT = 500             # html/json/markdown/latex: only a mean line length that extreme is a minified artifact
TEXT_LIKE = {"html", "json", "markdown", "latex", "yaml", "toml"}  # long lines are normal there
CAP_PER_REPO_LANG = 60           # files kept per (repo, language): keeps one repo from being a language
OVERSAMPLE = 1.7                 # fetch this many x the cap, content filters thin them back to the cap
LANG_BYTES_CAP = 40 * 1000 * 1000  # task: ~40 MB selected text per language
DISK_CAP = 900 * 1000 * 1000     # task: ~900 MB raw on disk
MIN_FILES_PER_SPLIT = 40         # task: at least ~40 files per split where possible
QUOTA = {"train": 4, "dev": 2, "test": 2}   # target repos per split per language (pool selection)
MIN_REPOS_FOR_REPO_SPLIT = 3     # task: fewer than 3 repos -> split by top-level directory + leakage_risk

VENDOR_SEGMENTS = {
    "vendor", "vendored", "node_modules", "third_party", "thirdparty", "third-party", "3rdparty", "3rd_party",
    "external", "externals", "extern", "deps", "bower_components", "pods", "carthage", "dist", "build",
    "target", "out", ".git", "__pycache__", "site-packages", "generated", "gen", "_gen", "autogen",
    "testdata", "test_data", "fixtures", "__snapshots__", "snapshots", "baselines", ".venv", "venv",
    "coverage", "htmlcov", "_build", "bundled", "portablegit", "mingw32", "mingw64", "msys64",
}
LOCKFILE_RE = re.compile(
    r"(^|/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|cargo\.lock|gemfile\.lock|composer\.lock|"
    r"poetry\.lock|uv\.lock|pipfile\.lock|go\.sum|mix\.lock|pubspec\.lock|packages\.lock\.json|flake\.lock|"
    r"deno\.lock|bun\.lockb|podfile\.lock|stack\.yaml\.lock|cabal\.project\.freeze|renv\.lock|manifest\.toml|"
    r"[^/]*\.lock|[^/]*-lock\.[a-z]+|[^/]*\.lockfile)$", re.I)
GENERATED_NAME_RE = re.compile(
    r"(\.min\.|-min\.|\.bundle\.|\.pb\.go$|_pb2(_grpc)?\.py$|\.pb\.cc$|\.pb\.h$|\.generated\.|\.gen\.|\.g\.dart$|\.freezed\.dart$|"
    r"\.designer\.cs$|\.g\.cs$|_generated\.|\.d\.(ts|mts|cts)$|\.map$|\.snap$|bindata)", re.I)
TEMPLATE_DIALECT_RE = re.compile(
    r"\.(scala|twig|erb|ejs|hbs|jinja2?|j2|tmpl|tpl|mustache|liquid|njk|blade)\.(html?|xml|js|css|json|ya?ml|toml|md|sh|py|rb|php|txt)$", re.I)
BOILERPLATE_MD_RE = re.compile(
    r"(^|/)(license|licence|copying|notice|changelog|changes|history|news|release[-_ ]?notes?|code[-_]of[-_]conduct|"
    r"contributors|authors|security|third[-_]party[-_]notices?)(\.[a-z]+)?$", re.I)
GENERATED_HEAD_RE = re.compile(
    r"(@generated|code generated|do not edit|do not modify|auto-?generated|automatically generated|"
    r"this file (is|was) (auto-?)?generated|machine[- ]generated|"
    r"generated by (the )?(protoc|protobuf|bison|flex|swig|antlr|thrift|grpc|cython|yacc|lex|openapi|swagger|sqlc|mockgen|stringer|"
    r"jooq|xtext|javadoc|doxygen|sphinx|pandoc|nbconvert|coverage\.py|rustdoc|typedoc|jsdoc|docusaurus|mkdocs|jekyll))", re.I)
GENERATED_HEAD_LINES = 25
# file-level licence REFUSAL (a permissively licensed repo may vendor a copyleft file): a header in the first
# HEADER_LICENSE_LINES lines naming a copyleft / source-available licence drops the file (fetched files only).
RESTRICTIVE_HEAD_RE = re.compile(
    r"(gnu\s+(lesser\s+|library\s+|affero\s+)?general\s+public\s+license|\b(a|l)?gpl[- ]?(v?[23]|-?only|-?or-later)|spdx-license-identifier:\s*\(?\s*(a|l)?gpl|"
    r"mozilla public license|spdx-license-identifier:\s*\(?\s*(mpl|epl|busl|sspl|cc-by-nc|cc-by-nd|osl|eupl|cddl)|eclipse public license|"
    r"business source license|server side public license|non-?commercial use only)", re.I)
HEADER_LICENSE_LINES = 40

# ---------------------------------------------------------------- split rule
SPLIT_BINS = {0: "train", 1: "train", 2: "dev", 3: "test"}   # sha256(lower(owner/repo)) mod 4 -> 50/25/25 of repos
def repo_split(repo_full_name: str) -> str:
    h = hashlib.sha256(repo_full_name.lower().encode("utf-8")).hexdigest()
    return SPLIT_BINS[int(h[:8], 16) % 4]

PERMISSIVE = {"mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "cc0-1.0", "cc-by-4.0",
              "cc-by-sa-4.0", "0bsd", "postgresql", "zlib", "psf-2.0", "bsl-1.0", "mit-0", "blueoak-1.0"}
# NB zlib/bsl-1.0/postgresql/psf are permissive in substance but are NOT on the task's list
# (MIT, BSD, Apache-2.0, ISC, CC0, CC-BY, CC-BY-SA, public domain): they are deliberately EXCLUDED from fetching.
FETCH_LICENSES = {"mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "cc0-1.0", "cc-by-4.0",
                  "cc-by-sa-4.0", "0bsd", "mit-0"}

# ---------------------------------------------------------------- name-level eligibility
def ext_of(path: str) -> str:
    base = path.rsplit("/", 1)[-1]
    i = base.rfind(".")
    return base[i:].lower() if i > 0 else ""

def name_candidates(path: str):
    """Return (language-or-@ambiguity, reason_if_rejected). Name-level only (no content)."""
    low = path.lower()
    parts = low.split("/")
    for seg in parts[:-1]:
        if seg in VENDOR_SEGMENTS:
            return None, "vendored/generated-dir:" + seg
    if LOCKFILE_RE.search(low):
        return None, "lockfile"
    if GENERATED_NAME_RE.search(low):
        return None, "generated-name"
    if TEMPLATE_DIALECT_RE.search(low):
        return None, "template-dialect"
    e = ext_of(path)
    lang = EXT.get(e)
    if lang is None:
        return None, "unmapped-extension"
    if lang == "markdown" and BOILERPLATE_MD_RE.search(low):
        return None, "boilerplate-markdown"
    return lang, None

def hash_order_key(repo: str, path: str) -> str:
    """Deterministic pseudo-random order for sampling within a (repo, language): sha1(repo+path)."""
    return hashlib.sha1((repo.lower() + "\0" + path).encode("utf-8")).hexdigest()

# ---------------------------------------------------------------- content-level rules
_CPP_H = re.compile(r"^\s*(template\s*<|namespace\s+\w+|class\s+\w+\s*(:|\{)|using\s+namespace\b|#\s*include\s*<(iostream|string|vector|memory|map|algorithm)>)", re.M)
_OBJC = re.compile(r"(@interface\b|@implementation\b|@protocol\b|@end\b|#import\b|@property\b|@selector\()")
_MATLAB = re.compile(r"^\s*(function\b|classdef\b|%[^\n]*$|end\s*;?\s*$|if\b|for\b|while\b|switch\b)", re.M)
_VERILOG = re.compile(r"\bmodule\b[\s\S]*\bendmodule\b")
_PERL = re.compile(r"(^#!.*perl|^\s*use\s+(strict|warnings|v?5|[A-Z]\w+(::\w+)*)\b|^\s*package\s+[\w:]+\s*;|^\s*my\s+[\$@%]\w|^\s*sub\s+\w+\s*\{)", re.M)
_PROLOG = re.compile(r"^\s*:-\s|^\s*\w+\(.*\)\s*:-\s*$", re.M)
_CL = re.compile(r"^\s*\((defun|defmacro|defpackage|in-package|defvar|defparameter|defclass|defgeneric|defmethod|asdf:)", re.M | re.I)
_FORTRAN = re.compile(r"^\s*(program|subroutine|function|module|implicit\s+(none|real|integer)|use\s+\w+|contains|end\s+(program|subroutine|function|module|do|if)|real|integer|double\s+precision|call\s+\w+|c\s+\S)", re.M | re.I)
_LATEX = re.compile(r"\\(documentclass|usepackage|begin|newcommand|renewcommand|section|def|RequirePackage|ProvidesPackage|ProvidesClass|NeedsTeXFormat|input|chapter)\b")

def resolve_ambiguous(amb: str, text: str, repo_c_cpp_objc=None):
    """
    Resolve an '@x' extension by content. Returns (language-or-None, rule).
    The rule only chooses among the languages the extension could name; None = refused.
    repo_c_cpp_objc: (n_c, n_cpp, n_objc) counts of unambiguous source files in the same repo (for .h).
    """
    if amb == "@h":
        if _OBJC.search(text):
            return "objc", "h:objc-syntax"
        if _CPP_H.search(text):
            return "cpp", "h:cpp-syntax"
        if repo_c_cpp_objc:
            nc, ncpp, nobjc = repo_c_cpp_objc
            if nobjc > max(nc, ncpp):
                return "objc", "h:repo-dominant-objc"
            if ncpp > nc:
                return "cpp", "h:repo-dominant-cpp"
        return "c", "h:repo-dominant-c-or-default"
    if amb == "@m":
        if _OBJC.search(text):
            return "objc", "m:objc-syntax"
        if _MATLAB.search(text) and not re.search(r"^\s*(:-|#include|#import|@interface)", text, re.M):
            return "matlab", "m:matlab-syntax"
        return None, "m:unresolved-refused"
    if amb == "@v":
        return ("verilog", "v:module-endmodule") if _VERILOG.search(text) else (None, "v:no-module-refused")
    if amb == "@pl":
        if _PROLOG.search(text) and not _PERL.search(text):
            return None, "pl:prolog-refused"
        return ("perl", "pl:perl-syntax") if _PERL.search(text) else (None, "pl:no-perl-syntax-refused")
    if amb == "@cl":
        return ("commonlisp", "cl:lisp-form") if _CL.search(text) else (None, "cl:no-lisp-form-refused")
    if amb == "@f":
        return ("fortran", "f:fortran-syntax") if _FORTRAN.search(text) else (None, "f:no-fortran-syntax-refused")
    return None, "unknown-ambiguity"

_SCHEME = re.compile(r"\((define|define-syntax|define-record-type|define-library|define-values|lambda|library|import|module|let\*?|letrec\*?|cond|case|begin|set!|if|when|unless|do)[\s)]")
_SCALA_SC = re.compile(r"^\s*(val|def|object|class|trait|import|package|case\s+class)\b", re.M)

def content_sanity(lang: str, text: str, ext: str = ""):
    """Refusal-only content checks for unambiguous extensions. Returns reason-string if refused else None."""
    if lang == "latex" and not _LATEX.search(text):
        return "latex:no-tex-command"
    if lang == "perl" and not _PERL.search(text):
        return "perl:no-perl-syntax"
    if lang == "scheme" and len(_SCHEME.findall(text)) < 2:
        # .sls is also SaltStack state, .scm is also tree-sitter query files: a Scheme file has >= 2 core forms
        return "scheme:no-scheme-forms"
    if lang == "scala" and ext == ".sc" and not _SCALA_SC.search(text):
        return "scala:sc-not-scala"
    return None
