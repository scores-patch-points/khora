#!/usr/bin/env python3
"""
discover.py -- candidate-repository POOL for the polyglot code corpus (read-only GitHub search).

Declared (not tuned; fixed before the first query):
  * for each target language, query `gh search repos --language=<linguist name>` once per permissive
    licence in LICENSES, sorted by stars, limit 25, size window 200 KB..150 MB (the window only bounds the
    clone's tree cost; files are pulled by sparse checkout), stars >= MIN_STARS (3 for rare languages, 40 otherwise)
  * archived repos and forks are dropped (a fork duplicates its upstream)
  * the GitHub-reported SPDX/licence key must be in langmap.FETCH_LICENSES (MIT, BSD-2/3, Apache-2.0, ISC,
    Unlicense, CC0, CC-BY, CC-BY-SA, 0BSD, MIT-0); anything else is not fetched. The licence is RE-VERIFIED against
    the LICENSE file after clone (build_manifest.py); a mismatch drops the repo.
  * the pool is only a candidate list: no file has been read, no reader has been run.
Output: /private/tmp/claude-501/code-corpus/pool/search.json
Only the GitHub search API is called (read-only metadata of public repositories).
"""
import json, os, subprocess, sys, time
sys.path.insert(0, os.path.dirname(__file__))
import langmap as L

OUT = "/private/tmp/claude-501/code-corpus/pool/search.json"
BYLANG = "/private/tmp/claude-501/code-corpus/pool/search_by_lang"
LICENSES = ["mit", "apache-2.0", "bsd-3-clause", "bsd-2-clause", "isc", "unlicense"]
# language id -> linguist names to search
SEARCH = {
    "python": ["Python"], "javascript": ["JavaScript"], "typescript": ["TypeScript"], "tsx": ["TypeScript:react"],
    "java": ["Java"], "c": ["C"], "cpp": ["C++"], "c_sharp": ["C#"], "go": ["Go"], "rust": ["Rust"], "ruby": ["Ruby"],
    "php": ["PHP"], "swift": ["Swift"], "kotlin": ["Kotlin"], "scala": ["Scala"], "haskell": ["Haskell"], "lua": ["Lua"],
    "perl": ["Perl"], "r": ["R"], "julia": ["Julia"], "bash": ["Shell"], "sql": ["PLpgSQL", "SQL", "TSQL"],
    "html": ["HTML"], "css": ["CSS"], "json": ["JSON"], "yaml": ["YAML"], "toml": ["TOML"], "zig": ["Zig"],
    "ocaml": ["OCaml"], "elixir": ["Elixir"], "erlang": ["Erlang"], "clojure": ["Clojure"], "dart": ["Dart"],
    "elm": ["Elm"], "fortran": ["Fortran", "Fortran Free Form"], "commonlisp": ["Common Lisp"], "scheme": ["Scheme"],
    "racket": ["Racket"], "verilog": ["Verilog", "SystemVerilog"], "nim": ["Nim"], "groovy": ["Groovy"],
    "objc": ["Objective-C"], "powershell": ["PowerShell"], "matlab": ["MATLAB"], "cobol": ["COBOL"],
    "lean": ["Lean", "Lean 4"], "solidity": ["Solidity"], "svelte": ["Svelte"], "vue": ["Vue"],
    "markdown": ["Markdown"], "latex": ["TeX"],
}
RARE = {"cobol", "lean", "elm", "verilog", "nim", "racket", "scheme", "commonlisp", "fortran", "solidity", "svelte",
        "powershell", "matlab", "zig", "erlang", "julia", "latex", "toml", "json", "yaml", "groovy", "ocaml", "haskell",
        "clojure", "elixir", "dart", "perl", "r", "lua", "markdown", "sql"}

def gh_search(lang_name, lic, stars, size, extra=None):
    q = []
    topic_kw = None
    if ":" in lang_name:
        lang_name, topic_kw = lang_name.split(":", 1)
    cmd = ["gh", "search", "repos"]
    if topic_kw:
        cmd.append(topic_kw)
    cmd += ["--language", lang_name, "--license", lic, "--stars", f">={stars}", "--size", size, "--sort", "stars",
            "--limit", "25", "--archived=false", "--include-forks=false",
            "--json", "fullName,license,size,stargazersCount,language,isArchived,isFork,pushedAt,description"]
    for attempt in range(4):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            try:
                return json.loads(r.stdout)
            except Exception:
                return []
        err = (r.stderr or "")[:200]
        if "rate limit" in err.lower() or "secondary" in err.lower() or "403" in err:
            time.sleep(35)
            continue
        time.sleep(3)
    return []

def one_lang(lang):
    per = f"{BYLANG}/{lang}.json"
    if os.path.exists(per):
        return lang, json.load(open(per))
    stars = 3 if lang in RARE else 40
    out = []
    for nm in SEARCH[lang]:
        for lic in LICENSES:
            out.append({"query": [nm, lic], "results": gh_search(nm, lic, stars, "200..150000")})
            time.sleep(1.0)
    json.dump(out, open(per, "w"))
    return lang, out

def main():
    os.makedirs(BYLANG, exist_ok=True)
    pool = {}
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=4) as ex:
        for lang, out in ex.map(one_lang, list(SEARCH)):
            for q in out:
                for r in q["results"]:
                    lk = (r.get("license") or {}).get("key", "")
                    if lk not in L.FETCH_LICENSES or r.get("isArchived") or r.get("isFork"):
                        continue
                    e = pool.setdefault(r["fullName"], {
                        "fullName": r["fullName"], "license": lk, "size_kb": r["size"], "stars": r["stargazersCount"],
                        "primary_language": r.get("language"), "pushedAt": r.get("pushedAt"), "hints": []})
                    if lang not in e["hints"]:
                        e["hints"].append(lang)
            print(f"{lang:12s} pool={len(pool)}", flush=True)
            json.dump(sorted(pool.values(), key=lambda x: -x["stars"]), open(OUT, "w"), indent=0)
    print("DONE", len(pool))

if __name__ == "__main__":
    main()
