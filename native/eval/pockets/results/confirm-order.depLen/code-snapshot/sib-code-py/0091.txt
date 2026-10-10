#!/usr/bin/env python3
"""GOLD for the MusicXML channel. Authority = music21 10.5.0 (BSD-3, independent implementation of the MusicXML
importer) for the event table; Python's expat (xml.parsers.expat) for element SPANS. Neither is the system under test.

Event table (per piece): parts (music21 order: part, then its staves) -> measures (file order, 0-based index) ->
events {on, dur (quarter lengths, exact Fraction strings), k: 'n'|'r', midi (notes), tie}. Excluded and COUNTED:
grace notes, chord symbols (harmony), unpitched notes. Measure meter/key = the state in effect at the measure.
"""
import sys, os, json, zipfile, io, re, time, warnings, traceback
from fractions import Fraction
warnings.filterwarnings("ignore")
ROOT = "/private/tmp/claude-501/notation/music_abc"

def read_xml_bytes(path):
    if path.endswith(".mxl"):
        z = zipfile.ZipFile(path)
        root = None
        try:
            c = z.read("META-INF/container.xml").decode("utf8", "replace")
            m = re.search(r'full-path="([^"]+)"', c)
            root = m.group(1) if m else None
        except KeyError:
            pass
        if root is None:
            root = [n for n in z.namelist() if n.lower().endswith((".xml", ".musicxml")) and not n.startswith("META-INF")][0]
        return z.read(root)
    return open(path, "rb").read()

def fr(x):
    f = Fraction(x).limit_denominator(100000)
    return f"{f.numerator}/{f.denominator}" if f.denominator != 1 else f"{f.numerator}"

def piece_gold(path):
    from music21 import converter, stream, note, chord, meter, key, harmony
    s = converter.parse(path)
    parts = list(s.parts)
    skipped = dict(grace=0, harmony=0, unpitched=0, other=0)
    out = []
    for pi, p in enumerate(parts):
        ms = list(p.getElementsByClass(stream.Measure))
        mrows = []
        cur_meter = None; cur_fifths = None
        voices_max = 0
        for mi, m in enumerate(ms):
            for ts in m.getElementsByClass(meter.TimeSignature):
                rs = ts.ratioString
                cur_meter = rs if re.fullmatch(r"\d+/\d+", rs or "") else "composite"
                break
            for ks in m.getElementsByClass(key.KeySignature):
                cur_fifths = int(ks.sharps); break
            voices_max = max(voices_max, len(m.voices))
            evs = []
            for el in m.recurse().notesAndRests:
                if isinstance(el, harmony.Harmony): skipped["harmony"] += 1; continue
                if isinstance(el, note.Unpitched): skipped["unpitched"] += 1; continue
                if el.duration.isGrace: skipped["grace"] += 1; continue
                on = el.getOffsetInHierarchy(m)
                dur = el.duration.quarterLength
                if isinstance(el, note.Rest):
                    evs.append(dict(on=fr(on), dur=fr(dur), k="r", midi=None, tie=None))
                elif isinstance(el, note.Note):
                    evs.append(dict(on=fr(on), dur=fr(dur), k="n", midi=int(el.pitch.midi), tie=(el.tie.type if el.tie else None)))
                elif isinstance(el, chord.Chord):
                    for n in sorted(el.notes, key=lambda n: n.pitch.midi):
                        evs.append(dict(on=fr(on), dur=fr(dur), k="n", midi=int(n.pitch.midi), tie=(n.tie.type if n.tie else None)))
                else:
                    skipped["other"] += 1
            evs.sort(key=lambda e: (Fraction(e["on"]), 0 if e["k"] == "r" else 1, e["midi"] if e["midi"] is not None else -1))
            mrows.append(dict(i=mi, number=str(m.number), start=fr(m.offset), meter=cur_meter, fifths=cur_fifths, ev=evs))
        out.append(dict(ordinal=pi, cls=type(p).__name__, name=(p.partName or p.id), voices_max=voices_max, measures=mrows))
    return dict(parts=out, skipped=skipped)

def lexemes(path):
    """Element spans by expat (character offsets), classes by the MusicXML content model (a note is pitched/rest/unpitched/grace/cue/chord)."""
    import xml.parsers.expat as ex
    data = read_xml_bytes(path)
    text = data.decode("utf-8", "replace")
    astral = any(ord(c) > 0xFFFF for c in text)
    # byte -> char map (only needed offsets, built once)
    if len(text) == len(data):
        b2c = None
    else:
        b2c = {}; cum = 0
        for i, c in enumerate(text):
            b2c[cum] = i; cum += len(c.encode("utf-8"))
        b2c[cum] = len(text)
    cv = (lambda b: b) if b2c is None else (lambda b: b2c.get(b, None))
    stack = []; res = []
    p = ex.ParserCreate()
    def start(name, attrs):
        stack.append(dict(name=name, s=p.CurrentByteIndex, kids=set(), attrs=attrs))
        if len(stack) > 1: stack[-2]["kids"].add(name)
    def end(name):
        e = stack.pop()
        if name in ("note", "measure", "part"):
            # end offset = end of the closing tag; expat gives index of '</' for the end event
            eb = p.CurrentByteIndex
            close = data.find(b">", eb) + 1
            kids = e["kids"]
            if name == "note":
                cls = "grace" if "grace" in kids else "cue" if "cue" in kids else "rest" if "rest" in kids else "unpitched" if "unpitched" in kids else "pitched" if "pitch" in kids else "other"
                if "chord" in kids and cls == "pitched": cls = "pitched_chord"
            else:
                cls = name
            res.append(dict(s=cv(e["s"]), e=cv(close), k=cls))
    p.StartElementHandler = start; p.EndElementHandler = end
    p.Parse(data, True)
    return dict(astral=astral, n_chars=len(text), spans=res)

def one(task):
    mid, path = task
    t = time.time()
    try:
        g = piece_gold(path)
        l = lexemes(path)
        return mid, dict(id=mid, ok=True, secs=round(time.time() - t, 2), **g), l
    except Exception as e:
        return mid, dict(id=mid, ok=False, error=f"{type(e).__name__}: {e}"[:300], tb=traceback.format_exc()[-600:]), None

if __name__ == "__main__":
    from multiprocessing import Pool
    only = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else None
    man = json.load(open(f"{ROOT}/manifest.core.json"))
    tasks = [(m["id"], f"{ROOT}/{m['file']}") for m in man if (only is None or m["split"] in only)]
    os.makedirs(f"{ROOT}/gold/event", exist_ok=True); os.makedirs(f"{ROOT}/gold/lex", exist_ok=True)
    tasks = [t for t in tasks if not os.path.exists(f"{ROOT}/gold/event/{t[0].replace(':','__')}.json")]
    print(len(tasks), "pieces", file=sys.stderr)
    done = 0; bad = 0
    with Pool(7, maxtasksperchild=8) as pool:
        for mid, g, l in pool.imap_unordered(one, tasks):
            fn = mid.replace(":", "__")
            json.dump(g, open(f"{ROOT}/gold/event/{fn}.json", "w"))
            if l is not None: json.dump(l, open(f"{ROOT}/gold/lex/{fn}.json", "w"))
            done += 1; bad += (not g["ok"])
            if done % 25 == 0: print(done, "done", bad, "failed", file=sys.stderr)
    print("finished", done, "failed", bad, file=sys.stderr)
