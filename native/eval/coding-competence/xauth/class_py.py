#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""class_py.py: CPython's OWN tokenizer (stdlib `tokenize`) plus its keyword table (`keyword.iskeyword`) as an independent authority that
CLASSIFIES python tokens (c1-class-xauth.mjs, 2026-10-06). It shares nothing with the tree-sitter grammar the lexer's lexicon came from.
stdin: JSON list of file paths. stdout: JSON {path: {tokens:[[start,end,cls],...]} | {error}} with UTF-16 offsets.
cls (coarse, declared): reserved (NAME that keyword.iskeyword says is a reserved word: includes True / False / None, which the Python Language
Reference lists among the keywords), identifier (any other NAME; the soft keywords match / case / type / _ are identifiers here because
tokenize has no parse context), number (NUMBER), string (STRING; an f-string/t-string, FSTRING_START..FSTRING_END, nested, is ONE lexeme as in
xauth_py.py), comment (COMMENT), symbol (OP and everything else that is a token). NL, NEWLINE, INDENT, DEDENT, ENDMARKER, ENCODING are not lexemes."""
import sys, json, io, tokenize, keyword, bisect

SKIP = {tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER, tokenize.ENCODING}
OPEN = {getattr(tokenize, n) for n in ("FSTRING_START", "TSTRING_START") if hasattr(tokenize, n)}
CLOSE = {getattr(tokenize, n) for n in ("FSTRING_END", "TSTRING_END") if hasattr(tokenize, n)}


def cls_of(tok):
    if tok.type == tokenize.NAME:
        return "reserved" if keyword.iskeyword(tok.string) else "identifier"
    if tok.type == tokenize.NUMBER:
        return "number"
    if tok.type == tokenize.STRING:
        return "string"
    if tok.type == tokenize.COMMENT:
        return "comment"
    return "symbol"


def run(path):
    src = open(path, encoding="utf-8", newline="").read()
    starts = [0]
    for ln in src.split("\n")[:-1]:
        starts.append(starts[-1] + len(ln) + 1)
    astral = [i for i, ch in enumerate(src) if ord(ch) > 0xFFFF]

    def u16(i):
        return i + bisect.bisect_left(astral, i) if astral else i

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
                out.append([u16(ostart), u16(e), "string"])
            continue
        if depth > 0:
            continue
        out.append([u16(s), u16(e), cls_of(tok)])
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
