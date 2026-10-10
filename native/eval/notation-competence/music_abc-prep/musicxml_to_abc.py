#!/usr/bin/env python3
"""DERIVED ABC. A deterministic converter (authored by the agent; NOT natural ABC, NEVER held-out natural data) from a
natural MusicXML piece to ABC 2.1 text. It is not an authority: every derived piece is VALIDATED by an independent ABC
engine (abcjs, MIT) against the music21-derived gold (scripts/validate_derived_abc.py); only pieces whose ABC text
provably says what the gold says are admitted. Constructs the converter does not write (typed, counted):
nested tuplets, gaps/overlaps inside one voice, composite meters, microtones, unpitched notes,
repeat barlines (|: :|, [1 [2 are NOT written), grace notes (not written; excluded from the gold too).
Multi-voice staves are written with ABC voice OVERLAY (&) inside the bar; gaps inside an overlay voice are written as the invisible rest x.
Style variation (deterministic, from sha1(piece id)): bit0 terse '/' vs explicit '/2'; bit1 voice blocks vs interleaved
inline [V:n]; bit2 bars per line 4 vs 6.
"""
import sys, re, json, hashlib, warnings
from fractions import Fraction
warnings.filterwarnings("ignore")

class Unsupported(Exception):
    pass

LETTER = "CDEFGAB"
SHARPS = "FCGDAEB"; FLATS = "BEADGCF"
MAJOR_BY_FIFTHS = {-7: "Cb", -6: "Gb", -5: "Db", -4: "Ab", -3: "Eb", -2: "Bb", -1: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#"}
MODE_ABC = {"major": "", "minor": "m", "dorian": "dor", "phrygian": "phr", "lydian": "lyd", "mixolydian": "mix", "locrian": "loc", "ionian": "", "aeolian": "m"}

def key_alters(fifths):
    d = {c: 0 for c in LETTER}
    if fifths > 0:
        for c in SHARPS[:fifths]: d[c] = 1
    elif fifths < 0:
        for c in FLATS[:-fifths]: d[c] = -1
    return d

def abc_pitch(step, octv, alter, state, keyalt, force=False):
    """ABC text for a pitch; state = {'oct': {(step,octave): alter}, 'pitch': {step: alter}} for the current bar.
    An explicit accidental is written unless BOTH propagation semantics give the wanted alteration: the ABC 2.1 standard's
    default (%%propagate-accidentals pitch: all octaves, up to the bar end) and the octave-specific reading that abcjs
    implements. The derived text is therefore unambiguous under either."""
    eff_oct = state["oct"].get((step, octv), keyalt[step])
    eff_pit = state["pitch"].get(step, keyalt[step])
    acc = ""
    if alter != eff_oct or alter != eff_pit or force:
        acc = {0: "=", 1: "^", -1: "_", 2: "^^", -2: "__"}[alter]
        state["oct"][(step, octv)] = alter
        state["pitch"][step] = alter
    if octv >= 5:
        s = step.lower() + "'" * (octv - 5)
    else:
        s = step + "," * (4 - octv)
    return acc + s

def frac_text(m, terse):
    """Length multiplier text for Fraction m>0 (relative to L:)."""
    n, d = m.numerator, m.denominator
    if d == 1: return "" if n == 1 else str(n)
    if n == 1:
        if terse and d == 2: return "/"
        if terse and d == 4: return "//"
        return f"/{d}"
    return f"{n}/{d}"

def default_q(p, compound):
    return {2: 3, 3: 2, 4: 3, 5: (3 if compound else 2), 6: 2, 7: (3 if compound else 2), 8: 3, 9: (3 if compound else 2)}.get(p)

def clean_text(t):
    t = re.sub(r"[\r\n\t]+", " ", str(t or "")).strip()
    return t

def convert(path, pid):
    from music21 import converter, stream, note, chord, meter, key, harmony, clef as m21clef
    h = int(hashlib.sha1(pid.encode()).hexdigest()[:4], 16)
    terse = bool(h & 1); interleaved = bool(h & 2); per_line = 4 if not (h & 4) else 6
    s = converter.parse(path)
    parts = list(s.parts)
    if not parts: raise Unsupported("no_parts")
    lines = []
    allq = []
    for p in parts:
        ms = list(p.getElementsByClass(stream.Measure))
        if not ms: raise Unsupported("no_measures")
        lines.append(ms)
    nm = len(lines[0])
    if any(len(ms) != nm for ms in lines): raise Unsupported("unequal_measure_counts")
    # first meter/key
    def first_of(ms, cls):
        for m in ms:
            for x in m.getElementsByClass(cls): return x
        return None
    ts0 = first_of(lines[0], meter.TimeSignature)
    if ts0 is None: raise Unsupported("no_meter")
    if not re.fullmatch(r"\d+/\d+", ts0.ratioString or ""): raise Unsupported("composite_meter")
    # collect durations to choose L:
    for ms in lines:
        for m in ms:
            for el in m.notesAndRests:
                if isinstance(el, harmony.Harmony) or el.duration.isGrace: continue
                allq.append(float(el.duration.quarterLength))
    if not allq: raise Unsupported("empty")
    allq.sort(); med = allq[len(allq) // 2]
    Lq = Fraction(1, 4) * 4 if False else None
    if med <= 0.25: L = Fraction(1, 16)
    elif med <= 1.0: L = Fraction(1, 8)
    else: L = Fraction(1, 4)
    Lql = L * 4  # unit in quarter lengths
    def keytext(m_or_ks):
        ks = m_or_ks
        if isinstance(ks, key.Key):
            tonic = ks.tonic.name.replace("-", "b")
            mode = MODE_ABC.get(ks.mode, None)
            if mode is None: raise Unsupported("mode_" + str(ks.mode))
            return tonic + mode
        f = int(ks.sharps)
        if f not in MAJOR_BY_FIFTHS: raise Unsupported("fifths_range")
        return MAJOR_BY_FIFTHS[f]
    ks0 = first_of(lines[0], key.KeySignature)
    fifths0 = int(ks0.sharps) if ks0 is not None else 0
    k_text0 = keytext(ks0) if ks0 is not None else "C"
    md = s.metadata
    title = clean_text(getattr(md, "title", None)) if md else ""
    comp = clean_text(getattr(md, "composer", None)) if md else ""
    out_voices = []   # per voice: list of (bar_text, lyric_syllables) per measure
    cur_meter_txt = f"{ts0.numerator}/{ts0.denominator}"
    compound0 = ts0.numerator in (6, 9, 12) and ts0.denominator in (8, 16) 
    for vi, ms in enumerate(lines):
        bars = []
        state = {"oct": {}, "pitch": {}}
        tie_ok = {}
        stops = set(); starts = []
        for m_ in ms:
            base_ = Fraction(m_.offset).limit_denominator(1000)
            for e_ in m_.recurse().notesAndRests:
                if isinstance(e_, harmony.Harmony) or e_.duration.isGrace: continue
                on_ = base_ + Fraction(e_.getOffsetInHierarchy(m_)).limit_denominator(1000)
                end_ = on_ + Fraction(e_.duration.quarterLength).limit_denominator(100000)
                members = e_.notes if isinstance(e_, chord.Chord) else ([e_] if isinstance(e_, note.Note) else [])
                for n_ in members:
                    if n_.tie and n_.tie.type in ("stop", "continue"): stops.add((on_, n_.pitch.midi))
                    if n_.tie and n_.tie.type in ("start", "continue"): starts.append((on_, end_, n_.pitch.midi))
        for on_, end_, mid_ in starts:
            tie_ok[(on_, mid_)] = (end_, mid_) in stops
        meter_now = cur_meter_txt; fifths_now = fifths0; compound = compound0
        keyalt = key_alters(fifths_now)
        carry_tie = False
        for mi, m in enumerate(ms):
            inline = ""
            for ts in m.getElementsByClass(meter.TimeSignature):
                t = f"{ts.numerator}/{ts.denominator}"
                if not re.fullmatch(r"\d+/\d+", ts.ratioString or ""): raise Unsupported("composite_meter")
                if t != meter_now and mi > 0:
                    inline += f"[M:{t}]"
                meter_now = t; compound = ts.numerator in (6, 9, 12) and ts.denominator in (8, 16)
                break
            for ks in m.getElementsByClass(key.KeySignature):
                f = int(ks.sharps)
                if f != fifths_now and mi > 0:
                    inline += f"[K:{keytext(ks)}]"
                fifths_now = f; keyalt = key_alters(f)
                break
            state = {"oct": {}, "pitch": {}}
            span = (Fraction(ms[mi + 1].offset).limit_denominator(1000) - Fraction(m.offset).limit_denominator(1000)) if mi + 1 < len(ms) else None
            syms = [e for e in m.recurse().notesAndRests if isinstance(e, harmony.ChordSymbol)]
            cs_at = {}
            for cs in syms:
                f = str(getattr(cs, "figure", "") or "")
                if re.fullmatch(r"[A-G][#b-]?[A-Za-z0-9#+/()\-]{0,10}", f): cs_at.setdefault(cs.getOffsetInHierarchy(m), f.replace("-", "b"))
            if len(m.voices):
                streams = [v for v in m.voices if any((not isinstance(e, harmony.Harmony)) and (not e.duration.isGrace) for e in v.recurse().notesAndRests)]
                if not streams: streams = [m]
            else:
                streams = [m]
            seg_texts = []; lyr = []
            prev_keys = set()
            for si, sm in enumerate(streams):
                evs = [e for e in sm.recurse().notesAndRests if not isinstance(e, harmony.Harmony) and not e.duration.isGrace]
                if len(streams) > 1: state = {"oct": {}, "pitch": {}}
                seg_keys = set()
                pos = Fraction(0)
                toks = []
                i = 0
                tp_left = 0
                while i < len(evs):
                    el = evs[i]
                    if isinstance(el, note.Unpitched): raise Unsupported("unpitched")
                    on = Fraction(el.getOffsetInHierarchy(m)).limit_denominator(1000)
                    if on < pos: raise Unsupported("overlap_in_voice")
                    if on > pos:
                        gl = frac_text(Fraction(on - pos).limit_denominator(1000) / Lql, terse)
                        toks.append("x" + gl); pos = on
                    tups = el.duration.tuplets
                    if len(tups) > 1: raise Unsupported("nested_tuplet")
                    pre = ""
                    if tups:
                        tp = tups[0]
                        if tp_left == 0:
                            pnum, qnum = tp.numberNotesActual, tp.numberNotesNormal
                            r = 0
                            for j in range(i, len(evs)):
                                tj = evs[j].duration.tuplets
                                if not tj or (tj[0].numberNotesActual, tj[0].numberNotesNormal) != (pnum, qnum): break
                                r += 1
                                if tj[0].type == "stop" or r == pnum: break
                            tp_left = r
                            dq = default_q(pnum, compound)
                            if qnum == dq and r == pnum: pre = f"({pnum}"
                            else: pre = f"({pnum}:{qnum}:{r}"
                        tp_left -= 1
                        mult_written = Fraction(el.duration.quarterLength).limit_denominator(100000) * Fraction(tp.numberNotesActual, tp.numberNotesNormal)
                    else:
                        if tp_left: raise Unsupported("tuplet_broken")
                        mult_written = Fraction(el.duration.quarterLength).limit_denominator(100000)
                    length = frac_text(mult_written / Lql, terse)
                    cs = cs_at.pop(on, None) if si == 0 else None
                    lead = (f'"{cs}"' if cs else "")
                    if isinstance(el, note.Rest):
                        body = "z" + length; tie = ""
                    elif isinstance(el, note.Note):
                        pn = el.pitch
                        if pn.accidental and pn.accidental.alter != int(pn.accidental.alter): raise Unsupported("microtone")
                        alter = int(pn.accidental.alter) if pn.accidental else 0
                        force = si > 0 and pn.step in prev_keys
                        body = abc_pitch(pn.step, pn.octave, alter, state, keyalt, force=force) + length
                        seg_keys.add(pn.step)
                        tie = "-" if (el.tie and el.tie.type in ("start", "continue") and tie_ok.get((Fraction(m.offset).limit_denominator(1000) + on, el.pitch.midi))) else ""
                        if si == 0 and not (el.tie and el.tie.type in ("stop", "continue")):
                            lyr.append(el.lyrics[0].text if el.lyrics and el.lyrics[0].text else "")
                    elif isinstance(el, chord.Chord):
                        inner = ""
                        mb = Fraction(m.offset).limit_denominator(1000)
                        okt = lambda n: bool(n.tie and n.tie.type in ("start", "continue") and tie_ok.get((mb + on, n.pitch.midi)))
                        ties = {okt(n) for n in el.notes}
                        for n in sorted(el.notes, key=lambda n: n.pitch.midi):
                            pn = n.pitch
                            if pn.accidental and pn.accidental.alter != int(pn.accidental.alter): raise Unsupported("microtone")
                            alter = int(pn.accidental.alter) if pn.accidental else 0
                            force = si > 0 and pn.step in prev_keys
                            inner += abc_pitch(pn.step, pn.octave, alter, state, keyalt, force=force)
                            if len(ties) > 1 and okt(n): inner += "-"
                            seg_keys.add(pn.step)
                        body = "[" + inner + "]" + length
                        tie = "-" if ties == {True} else ""
                        if si == 0: lyr.append("")
                    else:
                        raise Unsupported("element_" + type(el).__name__)
                    toks.append(pre + lead + body + tie)
                    pos = on + Fraction(el.duration.quarterLength).limit_denominator(100000)
                    i += 1
                seg_end = pos
                if span is not None:
                    if seg_end > span: raise Unsupported("measure_overflow")
                    if seg_end < span:
                        toks.append("x" + frac_text(Fraction(span - seg_end).limit_denominator(1000) / Lql, terse))
                prev_keys |= seg_keys
                seg_texts.append(" ".join(toks))
            toks = [" & ".join(seg_texts)]
            bars.append((inline + " ".join(toks), lyr))
        out_voices.append(bars)
    # ---- assemble
    nv_all = len(out_voices)
    def assemble(vis):
        nv = len(vis)
        hdr = ["X:1"]
        if title: hdr.append("T:" + title)
        if comp: hdr.append("C:" + comp)
        hdr.append(f"M:{cur_meter_txt}")
        hdr.append(f"L:{L.numerator}/{L.denominator}")
        if nv > 1:
            for n_, vi in enumerate(vis):
                nm_ = clean_text(parts[vi].partName or f"Voice {vi+1}")
                cl = first_of(lines[vi], m21clef.Clef)
                clef_txt = ""
                if cl is not None:
                    sign = getattr(cl, "sign", None)
                    clef_txt = {"G": "treble", "F": "bass", "C": "alto"}.get(sign, "")
                hdr.append(f'V:{n_+1} name="{nm_.replace(chr(34), "")}"' + (f" clef={clef_txt}" if clef_txt else ""))
        hdr.append("K:" + k_text0)
        body = []
        def music_line(vi, a, b):
            segs = [out_voices[vi][k][0] for k in range(a, b)]
            endbar = "|]" if b == nm else "|"
            return " | ".join(segs) + " " + endbar
        def lyric_line(vi, a, b):
            sy = []
            for k in range(a, b):
                for t_ in out_voices[vi][k][1]: sy.append(t_)
            if not any(sy): return None
            return "w: " + " ".join((re.sub(r"\s+", "~", t_) if t_ else "*") for t_ in sy)
        if nv == 1:
            vi = vis[0]
            for a in range(0, nm, per_line):
                b = min(nm, a + per_line)
                body.append(music_line(vi, a, b))
                lw = lyric_line(vi, a, b)
                if lw: body.append(lw)
        elif interleaved:
            for a in range(0, nm, per_line):
                b = min(nm, a + per_line)
                for n_, vi in enumerate(vis):
                    body.append(f"[V:{n_+1}] " + music_line(vi, a, b))
                    lw = lyric_line(vi, a, b)
                    if lw: body.append(lw)
        else:
            for n_, vi in enumerate(vis):
                body.append(f"V:{n_+1}")
                for a in range(0, nm, per_line):
                    b = min(nm, a + per_line)
                    body.append(music_line(vi, a, b))
                    lw = lyric_line(vi, a, b)
                    if lw: body.append(lw)
        return "\n".join(hdr + body) + "\n"
    full = assemble(list(range(nv_all)))
    per_line_txt = [assemble([vi]) for vi in range(nv_all)] if nv_all > 1 else [full]
    return full, per_line_txt, dict(n_voices=nv_all, n_measures=nm, L=f"{L.numerator}/{L.denominator}", style=dict(terse=terse, interleaved=interleaved, per_line=per_line))

if __name__ == "__main__":
    t, lines_, info = convert(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "x")
    sys.stdout.write(t); print(json.dumps(info), file=sys.stderr)
