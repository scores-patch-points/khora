#!/usr/bin/env python3
"""Admit a derived ABC piece only if an INDEPENDENT ABC engine (abcjs MIDI export) reproduces the music21 gold, line by line:
the multiset of sounding notes (absolute onset, midi, duration; ties merged; grace excluded) must match within 1 tick/480.
Result: derived/validation.json {id: {admitted, reason, lines:[{ok,n_gold,n_abc,miss}]}}."""
import json, os, sys, glob, collections
from fractions import Fraction
import mido
ROOT = "/private/tmp/claude-501/notation/music_abc"
TPB = 480
def gold_sounding(line):
    ev = []
    for m in line["measures"]:
        base = Fraction(m["start"])
        for e in m["ev"]:
            if e["k"] != "n": continue
            ev.append([base + Fraction(e["on"]), e["midi"], Fraction(e["dur"]), e["tie"]])
    ev.sort(key=lambda x: (x[0], x[1]))
    out = []; open_ = {}  # midi -> index in out of chain awaiting continuation
    for on, mid, dur, tie in ev:
        if mid in open_ and out[open_[mid]][0] + out[open_[mid]][2] == on and tie in ("stop", "continue"):
            out[open_[mid]][2] += dur
            if tie == "stop": del open_[mid]
        else:
            out.append([on, mid, dur])
            if tie in ("start", "continue"): open_[mid] = len(out) - 1
            elif mid in open_ and tie is None: del open_[mid]
    return [(int(round(o * TPB)), m, int(round(d * TPB))) for o, m, d in out]
def abc_sounding(path):
    m = mido.MidiFile(path)
    tpb = m.ticks_per_beat
    out = []
    for tr in m.tracks:
        t = 0; op = {}
        for msg in tr:
            t += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                op.setdefault(msg.note, []).append(t)
            elif msg.type in ("note_off", "note_on"):
                if op.get(msg.note):
                    s = op[msg.note].pop(0)
                    out.append((int(round(s * TPB / tpb)), msg.note, int(round((t - s) * TPB / tpb))))
    return out
def _match(xs, ys, tol):
    """multiset match of (time, midi) pairs within tol ticks; returns number unmatched (max of the two sides)."""
    xs = sorted(xs, key=lambda z: (z[1], z[0])); ys = sorted(ys, key=lambda z: (z[1], z[0]))
    used = [False] * len(ys); miss = 0
    j0 = 0
    for x in xs:
        hit = False
        for j in range(len(ys)):
            if used[j] or ys[j][1] != x[1]: continue
            if abs(ys[j][0] - x[0]) <= tol: used[j] = True; hit = True; break
        if not hit: miss += 1
    return max(miss, used.count(False))
def same(a, b, tol=1):
    """Compare the multisets of NOTE-ONS and of NOTE-OFFS (robust to same-pitch overlap pairing)."""
    on_a = [(o, m) for o, m, d in a]; on_b = [(o, m) for o, m, d in b]
    off_a = [(o + d, m) for o, m, d in a]; off_b = [(o + d, m) for o, m, d in b]
    miss = _match(on_a, on_b, tol) + _match(off_a, off_b, tol)
    return (len(a) == len(b) and miss == 0), len(a), len(b), miss
if __name__ == "__main__":
    idx = json.load(open(f"{ROOT}/derived/index.json"))
    res = {}
    for pid, info in idx.items():
        if not info.get("ok"): continue
        fn = pid.replace(":", "__")
        g = json.load(open(f"{ROOT}/gold/event/{fn}.json"))
        if not g["ok"]: res[pid] = dict(admitted=False, reason="gold_unavailable"); continue
        lines = []; ok = True
        for k, line in enumerate(g["parts"]):
            mp = f"{ROOT}/derived/midi/{fn}.{k}.mid"
            if not os.path.exists(mp): ok = False; lines.append(dict(ok=False, why="no_midi")); continue
            try:
                r = same(gold_sounding(line), abc_sounding(mp))
            except Exception as e:
                ok = False; lines.append(dict(ok=False, why=f"error:{type(e).__name__}")); continue
            lines.append(dict(ok=bool(r[0]), n_gold=r[1], n_abc=r[2], miss=(r[3] if len(r) > 3 else None)))
            ok = ok and bool(r[0])
        res[pid] = dict(admitted=ok, reason=("ok" if ok else "abcjs_disagrees_with_gold"), lines=lines)
    json.dump(res, open(f"{ROOT}/derived/validation.json", "w"))
    c = collections.Counter((p.split(":")[0], r["reason"]) for p, r in res.items())
    for k, v in sorted(c.items()): print(k, v)
