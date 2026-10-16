#!/usr/bin/env python3
"""model-call-harness.py — attribute model calls to find-read vs irreducible.

Reads OpenCode's own database (session_message + session_v2) and classifies
every model call (an `assistant` message) by what its tool parts actually did,
so the grep-vs-surf+fold bet has a number that can move.

WHY: `measure-model-calls.sh` counts calls; it cannot say *where* they go.
The dominant waste pattern (visible in the DB) is the find-and-read loop —

    shell:grep "..."   -> read @offset -> read @offset -> read @offset

each step a separate model call paying `tokens_reasoning`. This harness labels
each call so the split is measured, not guessed.

Classification (disclosed, coarse — a heuristic, not a verdict):

    find-read  — mechanical-izable: grep / read / glob / websearch / webfetch,
                 plus a shell command whose verb is a read/search verb. This is
                 the surface surf+fold would absorb.
    do-work    — irreducible: write / edit, plus shell commands that mutate or
                 execute (node/python running a script, git add/commit/…, mkdir).
    steer      — question / skill (steering the human / loading discipline).
    think-only — no tool parts at all (the model reasoned/answered in the head).

The verb tables are the only hand-set part; they are at the top and are the
single place to sharpen the heuristic. Every call that matches no rule lands in
`other` and is reported, never silently assigned.

Usage:
    ./model-call-harness.py                 # current (most-recent) session
    ./model-call-harness.py SES_ID          # a specific session
    ./model-call-harness.py --all [N]       # last N sessions, newest first
    ./model-call-harness.py --all 5 --verbose

Runs model-free (sqlite3 + json, stdlib only) — zero model calls to measure.
"""

import json
import os
import re
import sqlite3
import sys

# ── DB discovery (same candidates as measure-model-calls.sh) ────────────────

def find_db():
    candidates = [
        os.path.expanduser("~/.local/share/opencode/opencode-local.db"),
        os.path.expanduser("~/.local/share/opencode/opencode.db"),
        os.path.expanduser("~/.local/share/opencode/opencode-fold.db"),
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.R_OK):
            return c
    return candidates[0]

# ── Classification tables (the ONLY hand-set part — sharpen here) ───────────

# Tool names that map straight to a class.
TOOL_CLASS = {
    # find-and-read: the loop surf+fold replaces
    "grep": "find-read", "read": "find-read", "glob": "find-read",
    "websearch": "find-read", "webfetch": "find-read", "browser": "find-read",
    "perceive": "find-read", "list": "find-read",
    # irreducible
    "write": "do-work", "edit": "do-work", "patch": "do-work",
    "todo": "do-work",
    # steering / discipline
    "question": "steer", "skill": "steer",
    # classified by command verb, not tool name
    "shell": None, "bash": None, "execute": None,
}

# Shell verb → class, for shell/bash/execute tool parts.
READ_VERBS = {
    # literal / structural search and read
    "grep", "rg", "cat", "sed", "head", "tail", "less", "more", "bat",
    "ls", "find", "awk", "sort", "uniq", "wc", "file", "stat", "readlink",
    "du", "which", "command", "type", "echo", "diff", "xxd", "od", "hexdump",
    "jq", "sqlite3", "psql", "pdftotext", "pdftoppm", "strings", "look",
    "zcat", "zgrep", "tree", "locate", "md5", "shasum", "sha256sum",
    # box probes / environment reads
    "pwd", "whoami", "date", "ps", "lsof", "mdfind", "id", "hostname", "env",
    # git / gh read-only subcommands
    "log", "diff", "show", "status", "ls-files", "branch", "remote", "grep",
    "blame", "rev-parse", "cat-file", "describe", "tag", "shortlog", "reflog",
    "view", "list", "api", "auth", "browse", "search",
    # version / probe reads
    "--version", "-v", "version", "--help", "-h",
}
DO_VERBS = {
    "node", "python3", "python", "npm", "npx", "pnpm", "yarn", "deno", "bun",
    "mkdir", "rm", "mv", "cp", "touch", "ln", "install", "brew", "apt", "apt-get",
    "curl", "wget", "ssh", "scp", "rsync", "docker", "make", "cmake", "ninja",
    "git", "gh", "bash", "sh", "zsh", "./", "open", "kill", "pkill", "launchctl",
    "defaults", "xattr", "chmod", "chown", "tee", "dd", "zip", "unzip", "tar",
    "opencode", "ollama", "ffmpeg", "mktemp", "npx", "pip", "pip3", "go", "cargo",
}

# git / gh subcommands that mutate or execute (overrides the read-only set).
DO_SUBCOMMANDS = {
    "add", "commit", "merge", "push", "pull", "fetch", "checkout", "switch",
    "stash", "rebase", "reset", "restore", "rm", "mv", "init", "clone",
    "submodule", "cherry-pick", "revert", "clean", "gc", "prune", "worktree",
    "create", "delete", "edit", "fork", "pr", "issue", "release", "run",
    "codespace", "secret",
}

_PREFIX = ("sudo", "command", "env", "nohup", "nice", "exec", "time", "xargs")


def _tokens(cmd):
    """Tokenize a shell command, normalizing separators and stripping quotes."""
    s = re.sub(r"&&|\|\||;|\|", " ", cmd or "")
    toks = []
    for t in s.split():
        t = t.strip("\"'")
        if t:
            toks.append(t)
    return toks


def _looks_path(t):
    return t.startswith(("/", "~", "$", ".")) or "/" in t


def shell_verb_class(command):
    """Classify a shell command string by its first meaningful verb."""
    if not command:
        return "other"
    toks = _tokens(command)
    i = 0
    while i < len(toks):
        t = toks[i]
        # env assignment (FOO=bar, db="$HOME/...") — skip
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", t):
            i += 1
            continue
        # leading cd DIR — skip both, only when the dir looks like a path
        if t == "cd":
            i += 1
            if i < len(toks) and _looks_path(toks[i]):
                i += 1
            continue
        if t in _PREFIX:
            i += 1
            continue
        break
    if i >= len(toks):
        return "other"
    verb = toks[i]
    if verb in ("git", "gh"):
        sub = toks[i + 1] if i + 1 < len(toks) else ""
        if sub in DO_SUBCOMMANDS:
            return "do-work"
        if sub in READ_VERBS:
            return "find-read"
        return "other"
    if verb in READ_VERBS:
        return "find-read"
    if verb in DO_VERBS:
        return "do-work"
    return "other"


def classify_tools(content_parts):
    """Return (classes_set, tool_summary_list) for one assistant message."""
    classes = set()
    tools = []  # list of (toolname, class, first_token_or_path)
    for part in content_parts:
        if not isinstance(part, dict) or part.get("type") != "tool":
            continue
        name = part.get("name") or "?"
        cls = TOOL_CLASS.get(name)
        detail = ""
        state = part.get("state") or {}
        inp = state.get("input") or {}
        if cls is None and name in ("shell", "bash", "execute"):
            cmd = inp.get("command") or ""
            cls = shell_verb_class(cmd)
            detail = (cmd.strip().split()[0] if cmd.strip().split() else "?")
        elif name == "read":
            detail = inp.get("path", "").split("/")[-1]
        elif name == "grep":
            detail = (inp.get("pattern") or "")[:24]
        elif name in ("websearch", "webfetch"):
            detail = (inp.get("query") or inp.get("url") or "")[:24]
        elif name == "glob":
            detail = (inp.get("pattern") or "")[:24]
        if cls is None:
            cls = "other"
        classes.add(cls)
        tools.append((name, cls, detail))
    return classes, tools


def reasoning_chars(content_parts):
    return sum(
        len(p.get("text") or "")
        for p in content_parts
        if isinstance(p, dict) and p.get("type") == "reasoning"
    )


# ── DB reading ──────────────────────────────────────────────────────────────

def load_session(db, sid):
    cur = db.execute(
        "SELECT id, title, tokens_input, tokens_output, tokens_reasoning, cost "
        "FROM session_v2 WHERE id = ?", (sid,))
    row = cur.fetchone()
    if not row:
        return None
    sid, title, tin, tout, treason, cost = row
    msgs = db.execute(
        "SELECT seq, data FROM session_message "
        "WHERE session_id = ? AND type = 'assistant' ORDER BY seq", (sid,)).fetchall()
    calls = []
    for seq, data in msgs:
        try:
            obj = json.loads(data)
        except (TypeError, ValueError):
            continue
        parts = obj.get("content") or []
        classes, tools = classify_tools(parts)
        calls.append({
            "seq": seq,
            "classes": classes,
            "tools": tools,
            "reasoning_chars": reasoning_chars(parts),
            "model": (obj.get("model") or {}).get("id", "?"),
        })
    return {
        "id": sid, "title": title, "tin": tin or 0, "tout": tout or 0,
        "treason": treason or 0, "cost": cost or 0, "calls": calls,
    }


# ── Reporting ───────────────────────────────────────────────────────────────

CLASS_ORDER = ["find-read", "do-work", "steer", "think-only", "other"]


def class_of(call):
    """Bucket a call. PURE find-read is the mechanical-izable bucket — a call
    that did nothing but grep/read/glob/search. Any write/edit/mutation or
    human-steer in the call makes it irreducible (the residue surf+fold leaves)."""
    tools = call["tools"]
    if not tools:
        return "think-only"
    classes = [cls for _, cls, _ in tools]
    if all(c == "find-read" for c in classes):
        return "find-read"
    if all(c == "do-work" for c in classes):
        return "do-work"
    if all(c == "steer" for c in classes):
        return "steer"
    if all(c == "other" for c in classes):
        return "other"
    # mixed — irreducible parts win over mechanical
    if "do-work" in classes:
        return "do-work"
    if "steer" in classes:
        return "steer"
    if "find-read" in classes:
        return "find-read"
    return "other"


def report_session(s, verbose=False):
    n = len(s["calls"])
    print(f"session  {s['id']}")
    print(f"  title  {s['title']!r}")
    print(f"  model  {s['calls'][0]['model'] if s['calls'] else '?'}")

    from collections import Counter, defaultdict
    byclass = Counter()
    reason_byclass = defaultdict(int)
    toolhist = Counter()
    for c in s["calls"]:
        cls = class_of(c)
        byclass[cls] += 1
        reason_byclass[cls] += c["reasoning_chars"]
        for name, _, _ in c["tools"]:
            toolhist[name] += 1

    print(f"\n  model calls (assistant msgs) ..... {n}")
    total = n or 1
    for cls in CLASS_ORDER:
        if cls not in byclass:
            continue
        pct = 100.0 * byclass[cls] / total
        label = {
            "find-read": "find-read  (mechanical-izable)",
            "do-work": "do-work    (irreducible)",
            "steer": "steer      (question/skill)",
            "think-only": "think-only (no tool)",
            "other": "other      (unclassified)",
        }[cls]
        print(f"    {byclass[cls]:4d}  {pct:5.1f}%  {label}")

    print(f"\n  reasoning (session_v2, real) ..... {s['treason']} tokens")
    print(f"  reasoning chars by class (proxy):")
    for cls in CLASS_ORDER:
        if reason_byclass.get(cls):
            print(f"    {cls:10s}  {reason_byclass[cls]:7d} chars")

    print(f"\n  token/cost totals  in={s['tin']}  out={s['tout']}  "
          f"reason={s['treason']}  cost=${s['cost']:.4f}")

    print(f"\n  tool usage (tool name -> class):")
    for name, cnt in toolhist.most_common():
        cls = TOOL_CLASS.get(name)
        if cls is None:
            cls = "mixed (by verb)"
        print(f"    {name:12s} {cnt:5d}  {cls}")

    if verbose:
        print(f"\n  per-call attribution (find-read calls only):")
        for c in s["calls"]:
            if class_of(c) != "find-read":
                continue
            toks = ", ".join(
                f"{name}" + (f":{detail}" if detail else "")
                for name, cls, detail in c["tools"]
            )
            print(f"    #{c['seq']:>3}  [{toks}]")
    print()


def main():
    args = sys.argv[1:]
    db = sqlite3.connect(find_db())
    db.row_factory = sqlite3.Row
    verbose = "--verbose" in args

    if "--all" in args:
        n = 10
        if len(args) > args.index("--all") + 1:
            try:
                n = int(args[args.index("--all") + 1])
            except (ValueError, IndexError):
                pass
        rows = db.execute(
            "SELECT id FROM session_v2 ORDER BY time_updated DESC LIMIT ?",
            (n,)).fetchall()
        print(f"=== last {len(rows)} sessions, newest first ===\n")
        for r in rows:
            s = load_session(db, r["id"])
            if s and s["calls"]:
                report_session(s, verbose=verbose)
        return

    sid = None
    for a in args:
        if not a.startswith("-"):
            sid = a
            break
    if sid is None:
        sid = db.execute(
            "SELECT id FROM session_v2 ORDER BY time_updated DESC LIMIT 1"
        ).fetchone()[0]
        print(f"current session: {sid}\n")
    s = load_session(db, sid)
    if not s:
        print(f"no session {sid}", file=sys.stderr)
        sys.exit(1)
    report_session(s, verbose=verbose)


if __name__ == "__main__":
    main()
