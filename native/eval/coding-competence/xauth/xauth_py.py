#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""xauth_py.py: CPython's OWN tokenizer (stdlib `tokenize`) as an independent authority for python token boundaries.
stdin: JSON list of file paths. stdout: JSON {path: {tokens:[[start,end,type],...]} | {error}} with UTF-16 offsets.
Dropped: NL, NEWLINE, INDENT, DEDENT, ENDMARKER, ENCODING. An f-string/t-string (FSTRING_START..FSTRING_END, nested) is merged into ONE
lexeme, because the grammar gold and the lexer treat it as one; everything else is the engine's own token."""
import sys, json, io, tokenize

SKIP = {tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER, tokenize.ENCODING}
OPEN = {getattr(tokenize, n) for n in ("FSTRING_START", "TSTRING_START") if hasattr(tokenize, n)}
CLOSE = {getattr(tokenize, n) for n in ("FSTRING_END", "TSTRING_END") if hasattr(tokenize, n)}


def run(path):
    src = open(path, encoding="utf-8", newline="").read()
    starts = [0]
    for ln in src.split("\n")[:-1]:
        starts.append(starts[-1] + len(ln) + 1)
    astral = [i for i, ch in enumerate(src) if ord(ch) > 0xFFFF]

    def u16(i):
        if not astral:
            return i
        import bisect
        return i + bisect.bisect_left(astral, i)

    out, depth, ostart = [], 0, None
    for tok in tokenize.generate_tokens(io.StringIO(src).readline):
        if tok.type in SKIP:
            continue
        s = starts[tok.start[0] - 1] + tok.start[1]
        e = starts[tok.end[0] - 1] + tok.end[1]
        if tok.type in OPEN:
            if depth == 0:
                ostart = s
            depth += 1
            continue
        if tok.type in CLOSE:
            depth -= 1
            if depth == 0:
                out.append([u16(ostart), u16(e), "STRING"])
            continue
        if depth > 0:
            continue
        out.append([u16(s), u16(e), tokenize.tok_name[tok.type]])
    return {"tokens": out}


def main():
    paths = json.load(sys.stdin)
    res = {}
    for p in paths:
        try:
            res[p] = run(p)
        except Exception as e:  # TokenError, SyntaxError, IndentationError, decode errors: a typed per-file error
            res[p] = {"error": "%s: %s" % (type(e).__name__, str(e)[:120])}
    json.dump(res, sys.stdout)


if __name__ == "__main__":
    main()
