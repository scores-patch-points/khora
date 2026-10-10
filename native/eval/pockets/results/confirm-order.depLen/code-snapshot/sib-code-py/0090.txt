#!/usr/bin/env python3
"""Gold lexemes for LilyPond text: python-ly 0.9.10's lexer (Frescobaldi; GPL-2.0+, used as a tool, not distributed). Spans are the
lexer's token spans; classes are mapped from the lexer's own class names: Note->pitch; Rest/Spacer/Skip->rest; Length->duration;
Octave->octave; PipeSymbol->bar; LyricText/MarkupWord->word; brackets (Sequential*/Simultaneous*/OpenBracket*/CloseBracket*/Chord*/
Slur*/Beam*)->bracket; Quoted strings (start..end merged)->string; LineComment and Block comments (start..end merged)->comment; any token
whose text begins with a backslash->command. Everything else is not scored. Files with a non-BMP character are skipped (typed)."""
import json, os, re, ly.lex
ROOT = "/private/tmp/claude-501/notation/music_abc"
BR = re.compile(r"^(Sequential|Simultaneous)(Start|End)$|^(Open|Close)Bracket(Markup)?$|^Chord(Start|End)$|^Slur(Start|End)$|^Beam(Start|End)$")
def lex(txt):
    out = []; toks = list(ly.lex.state("lilypond").tokens(txt))
    i = 0
    while i < len(toks):
        t = toks[i]; cn = type(t).__name__; mod = type(t).__module__.split(".")[-1]; s = str(t)
        if cn == "StringQuotedStart":
            j = i
            while j < len(toks) and type(toks[j]).__name__ != "StringQuotedEnd": j += 1
            e = toks[min(j, len(toks) - 1)].end
            out.append(dict(s=t.pos, e=e, k="string")); i = j + 1; continue
        if cn == "BlockCommentStart":
            j = i
            while j < len(toks) and type(toks[j]).__name__ != "BlockCommentEnd": j += 1
            e = toks[min(j, len(toks) - 1)].end
            out.append(dict(s=t.pos, e=e, k="comment")); i = j + 1; continue
        k = None
        if mod == "scheme": k = None
        elif s.startswith("\\") and cn not in ("VoiceSeparator",): k = "command"
        elif cn == "Note": k = "pitch"
        elif cn in ("Rest", "Spacer", "Skip"): k = "rest"
        elif cn == "Length": k = "duration"
        elif cn == "Octave": k = "octave"
        elif cn == "PipeSymbol": k = "bar"
        elif cn in ("LyricText", "MarkupWord"): k = "word"
        elif cn == "LineComment": k = "comment"
        elif BR.match(cn): k = "bracket"
        if k: out.append(dict(s=t.pos, e=t.end, k=k))
        i += 1
    return out
if __name__ == "__main__":
    man = json.load(open(f"{ROOT}/manifest.json"))
    os.makedirs(f"{ROOT}/gold/lylex", exist_ok=True)
    n = bad = 0
    for m in man:
        if m["format"] != "lilypond": continue
        txt = open(f"{ROOT}/{m['file']}", encoding="utf-8").read()
        fn = m["id"].replace(":", "__")
        if any(ord(c) > 0xFFFF for c in txt):
            json.dump(dict(ok=False, why="astral"), open(f"{ROOT}/gold/lylex/{fn}.json", "w")); bad += 1; continue
        try:
            json.dump(dict(ok=True, lex=lex(txt)), open(f"{ROOT}/gold/lylex/{fn}.json", "w")); n += 1
        except Exception as e:
            json.dump(dict(ok=False, why=str(e)[:100]), open(f"{ROOT}/gold/lylex/{fn}.json", "w")); bad += 1
    print(n, "ok", bad, "bad")
