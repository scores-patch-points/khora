#!/usr/bin/env python3
"""Gold lexemes for the derived ABC texts. Primary authority: abcjs element spans (trimmed to the 'core' by the ABC 2.1
grammar: leading whitespace/annotations/decorations/grace/tuplet prefix and trailing whitespace removed). Secondary:
music21's tokenizer (agreement reported; where both define the class and disagree the lexeme is DISPUTED and excluded).
Field lines come from the standard's line rule (a line starting 'X:' with X a letter): w:/W: -> 'lyric', others 'field'."""
import json, re, subprocess, sys, os, glob, collections
ROOT = "/private/tmp/claude-501/notation/music_abc"
LEAD = re.compile(r'^(?:\s+|"[^"]*"|![^!]*!|\+[^+]*\+|[.~HLMOPSTuv]|\{[^}]*\}|\(\d+(?::\d*){0,2}|\()+')
def core(txt, s, e):
    seg = txt[s:e]
    m = LEAD.match(seg)
    a = s + (m.end() if m else 0)
    b = e
    while b > a and txt[b - 1].isspace(): b -= 1
    return a, b
def abcjs_all(paths):
    p = subprocess.run(["node", f"{ROOT}/scripts/abc_lexgold.mjs"] + paths, capture_output=True, text=True, timeout=600)
    return json.loads(p.stdout)
def m21_tokens(txt):
    from music21 import abcFormat
    h = abcFormat.ABCHandler(); h.process(txt)
    out = []; cur = 0
    for t in h.tokens:
        i = txt.find(t.src, cur)
        if i < 0: continue
        cur = i + len(t.src)
        cn = type(t).__name__
        if cn == "ABCNote":
            a, b = core(txt, i, i + len(t.src)); k = "rest" if getattr(t, "isRest", False) else "note"
            if txt[a:b][:1] in "xX": k = "spacer"
            out.append((a, b, k))
        elif cn == "ABCChord":
            a, b = core(txt, i, i + len(t.src))
            if re.match(r"\[[A-Za-z]:", txt[a:b]): continue   # music21 mis-tokenises inline fields as chords
            out.append((a, b, "chord"))
        elif cn == "ABCBar": out.append((i, i + len(t.src), "bar"))
        elif cn == "ABCTie": out.append((i, i + len(t.src), "tie"))
    return out
def field_lines(txt):
    out = []; pos = 0
    for line in txt.split("\n"):
        if re.match(r"^[A-Za-z]:", line):
            k = "lyric" if line[0] in "wW" else "field"
            out.append(dict(s=pos, e=pos + len(line), k=k))
        pos += len(line) + 1
    return out
def main(split_filter=None):
    val = json.load(open(f"{ROOT}/derived/validation.json"))
    ids = [p for p, r in val.items() if r["admitted"]]
    os.makedirs(f"{ROOT}/gold/abclex", exist_ok=True)
    paths = {p: f"{ROOT}/derived/{p.replace(':','__')}.abc" for p in ids}
    chunk = 40
    items = list(paths.items())
    stats = collections.Counter()
    for i in range(0, len(items), chunk):
        sub = items[i:i + chunk]
        res = abcjs_all([p for _, p in sub])
        for pid, path in sub:
            r = res[path]
            txt = open(path, encoding="utf-8").read()
            if not r["ok"]: json.dump(dict(ok=False, err=r["err"]), open(f"{ROOT}/gold/abclex/{pid.replace(':','__')}.json", "w")); stats["abcjs_fail"] += 1; continue
            lex = []
            for el in r["els"]:
                t = el["t"]; a, b = core(txt, el["s"], el["e"])
                if t == "note":
                    ch = txt[a:a + 1]
                    # CLASS BY THE FIRST CHARACTER OF THE CORE (ABC 2.1 grammar: z/Z rests, x/X/y spacers, [ chords), never by abcjs rest.type:
                    # abcjs types a whole-bar rest (z8 in 4/4, z6 in 6/8) 'whole', which the previous version fell through to 'note'.
                    if el["r"] in ("invisible", "spacer"):
                        # abcjs materialises a voice OVERLAY (&) as an extra voice holding invisible rests that carry the source spans of the
                        # other voice's notes: an invisible rest whose text is not x/X/y is an abcjs artefact, not a lexeme of the text.
                        if ch not in ("x", "X", "y"): continue
                        k = "spacer"
                    elif ch in ("z", "Z"): k = "rest"
                    elif ch in ("x", "X", "y"): k = "spacer"
                    elif el["r"] is not None: continue                      # a rest-typed element whose text is not z/Z/x/X/y: artefact
                    elif ch == "[": k = "chord"
                    else: k = "note"
                    lex.append(dict(s=a, e=b, k=k))
                elif t == "bar":
                    bs, be = el["s"], el["e"]                                  # the bar symbol itself: abcjs may start the element at the whitespace before it
                    while bs < be and txt[bs].isspace(): bs += 1
                    while be > bs and txt[be - 1].isspace(): be -= 1
                    lex.append(dict(s=bs, e=be, k="bar"))
            seen_ = set(); lex_ = []
            for x in lex:
                key_ = (x["s"], x["e"], x["k"])
                if key_ in seen_: continue
                seen_.add(key_); lex_.append(x)
            lex = lex_
            m21 = m21_tokens(txt)
            m21set = {(a, b): k for a, b, k in m21}
            for x in lex:
                if x["k"] in ("note", "chord", "rest", "bar"):
                    s_, e_ = x["s"], x["e"]
                    tied = x["k"] in ("note", "chord") and txt[e_ - 1:e_] == "-"
                    if tied: e_ -= 1
                    k2 = m21set.get((s_, e_))
                    ok = (k2 == x["k"])
                    if ok and tied: ok = (m21set.get((e_, e_ + 1)) == "tie")          # the tie itself: music21's ABCTie token at that offset
                    if ok and not tied and x["k"] in ("note", "chord") and m21set.get((e_, e_ + 1)) == "tie": ok = False   # music21 sees a tie the span lacks
                    x["agree"] = ok
                    x["tied"] = bool(tied)
                    if not ok: x["m21"] = k2
                    stats["agree" if ok else "disputed:" + x["k"]] += 1
                    stats[("agree:" if ok else "disputed:") + pid.split(":")[0] + ":" + x["k"]] += 1
                else: x["agree"] = True
            lex.sort(key=lambda x: x["s"])
            json.dump(dict(ok=True, lex=lex, fields=field_lines(txt), n_m21=len(m21)), open(f"{ROOT}/gold/abclex/{pid.replace(':','__')}.json", "w"))
    print(dict(stats))
if __name__ == "__main__":
    main()
