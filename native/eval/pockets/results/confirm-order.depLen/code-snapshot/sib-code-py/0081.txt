#!/usr/bin/env python3
"""AUTHORED HARD NEGATIVES for the R0 identifier. LABEL: authored (written by the agent from a seeded template mix; NOT natural data, NEVER
presented as held-out natural data, NEVER used to derive a prior). They exist because the review (finding: R0 negatives too easy) asked for
look-alikes of the ABC signature features in non-music files: YAML / key-value text with X: T: K: M: L: lines, numeric tables with bars,
text about music written with note letters, minified-code-like text, and the text of three sibling notations (chess PGN, SMILES, FASTA).
They are a STRESS stratum: reported separately, with their own counts and Wilson bound; they never enter the natural false-music rate and
never the lexicon. Split = sha256('authored:'+id) mod 3, only so that each split run has its own copy of the stratum."""
import os, json, hashlib, random

ROOT = "/private/tmp/claude-501/notation/music_abc"
OUT = f"{ROOT}/negatives_authored"
os.makedirs(OUT, exist_ok=True)
split_of = lambda k: ("train", "dev", "test")[int(hashlib.sha256(k.encode()).hexdigest()[:8], 16) % 3]
rng = random.Random(20261006)
N = 18

WORDS = "alpha beta gamma delta river stone window garden market signal harbor winter copper lantern meadow orchard quartz ribbon saddle timber valley".split()
KEYS = ["C", "G", "D", "A", "F", "Bb", "Am", "Em", "Dmix", "Gdor"]
METERS = ["4/4", "3/4", "6/8", "2/4", "C", "C|"]
def words(n): return " ".join(rng.choice(WORDS) for _ in range(n))

def kv_yaml(i):
    out = ["# tune index (not music notation)", "tunes:"]
    for j in range(rng.randint(2, 5)):
        out += [f"  - X: {j + 1}", f"    T: {words(2).title()}", f"    C: {words(2).title()}", f"    M: {rng.choice(METERS)}", f"    L: 1/{rng.choice([4, 8, 16])}", f"    K: {rng.choice(KEYS)}", f"    note: {words(6)}"]
    return "\n".join(out) + "\n"
def kv_plain(i):
    # the header of an ABC tune and nothing else: a header is not music (no body)
    return f"X: {rng.randint(1, 40)}\nT: {words(3).title()}\nM: {rng.choice(METERS)}\nL: 1/8\nK: {rng.choice(KEYS)}\n"
def kv_ini(i):
    out = []
    for s in range(rng.randint(2, 4)):
        out += [f"[section{s}]", f"X = {rng.randint(1, 9)}", f"T: {words(2)}", f"K: {rng.choice(KEYS)}", f"M: {rng.choice(METERS)}", f"path = /opt/{rng.choice(WORDS)}/{rng.choice(WORDS)}", ""]
    return "\n".join(out)
def kv_email(i):
    return (f"From: {rng.choice(WORDS)}@example.org\nTo: {rng.choice(WORDS)}@example.org\nX: {rng.randint(1, 99)}\nT: {words(2)}\nM: {rng.choice(METERS)}\nK: {rng.choice(KEYS)}\n"
            f"Subject: {words(4)}\n\n{words(30)}.\n{words(24)}.\n")
def theory_prose(i):
    notes = "".join(rng.choice("ABCDEFG") for _ in range(8))
    return (f"In the key of {rng.choice(KEYS)} the scale runs {' '.join(rng.sample('ABCDEFG', 7))} and the tonic chord is built on {rng.choice('ABCDEFG')}. "
            f"A student might write {notes[:4]} | {notes[4:]} | on the board, then explain that a bar line separates measures. "
            f"The rest, written z, lasts as long as the note before it, and the sequence {' '.join(rng.sample('abcdefg', 5))} | repeats. {words(25)}.\n")
def table_pipes(i):
    rows = []
    for r in range(rng.randint(6, 16)):
        rows.append(" | ".join([rng.choice("ABCDEFGabcdefgxz")] + [str(rng.randint(0, 99)) for _ in range(rng.randint(2, 5))]) + " |")
    return "\n".join(rows) + "\n"
def table_notes(i):
    hdr = "| beat | " + " | ".join(rng.sample(["C", "D", "E", "F", "G", "A", "B"], 4)) + " |"
    rows = [hdr, "|---|---|---|---|---|"]
    for r in range(rng.randint(4, 9)):
        rows.append(f"| {r + 1} | " + " | ".join(rng.choice(["C4", "D4", "E4", "F4", "G4", "A4", "z2", "B3", "c2"]) for _ in range(4)) + " |")
    return "\n".join(rows) + f"\n\n{words(12)}.\n"
def minjs(i):
    parts = []
    for j in range(rng.randint(40, 90)):
        a, b = rng.choice("abcdefg"), rng.choice("ABCDEFG")
        parts.append(f"function {a}{j}({b},{rng.choice('abcdefg')}){{var {rng.choice('ABCDEFG')}=[{b},{rng.randint(0, 9)},{a}];return {b}>{rng.randint(0, 9)}?{a}[{rng.randint(0, 3)}]:({rng.randint(2, 7)}*{b})}}")
    return ";".join(parts) + ";\n"
def pgn_like(i):
    mv = []
    for n in range(1, rng.randint(8, 25)):
        mv.append(f"{n}. {rng.choice(['e4', 'd4', 'Nf3', 'c4', 'g3', 'b3', 'a3', 'Bb5', 'Nc3'])} {rng.choice(['e5', 'd5', 'Nf6', 'c5', 'g6', 'c6', 'a6', 'Nc6', 'b6'])}")
    return f'[Event "{words(2)}"]\n[Site "?"]\n[Result "1/2-1/2"]\n\n' + " ".join(mv) + " 1/2-1/2\n"
def smiles_like(i):
    frag = ["CC(=O)O", "c1ccccc1", "CCN(CC)CC", "C1CCCCC1", "OC(=O)C", "CC(C)C", "NC(=O)C", "CCCC", "C=CC", "CC#N", "C1=CC=CC=C1"]
    return "\n".join("".join(rng.choice(frag) for _ in range(rng.randint(2, 5))) + f" {words(1)}" for _ in range(rng.randint(8, 24))) + "\n"
def fasta_like(i):
    out = []
    for r in range(rng.randint(2, 5)):
        out.append(f">{words(1)}_{r}")
        seq = "".join(rng.choice("ACGT") for _ in range(rng.randint(120, 400)))
        out += [seq[k:k + 60] for k in range(0, len(seq), 60)]
    return "\n".join(out) + "\n"

KINDS = {"kv_yaml": kv_yaml, "kv_plain_header": kv_plain, "kv_ini": kv_ini, "kv_email": kv_email, "theory_prose": theory_prose, "table_pipes": table_pipes,
         "table_notes": table_notes, "minified_js_like": minjs, "pgn_like": pgn_like, "smiles_like": smiles_like, "fasta_like": fasta_like}
man = []
for kind, fn in KINDS.items():
    for i in range(N):
        text = fn(i)
        pid = f"authored:{kind}:{i:02d}"
        fname = f"{OUT}/{kind}_{i:02d}.txt"
        open(fname, "w").write(text)
        man.append(dict(id=pid, source=f"authored:{kind}", split=split_of("authored:" + pid), file=fname, absolute=True, origin="authored by the agent (seeded templates)", bytes=len(text.encode()),
                        format=f"other-authored-{kind}", role="negative_authored", system=None, channel="text", provenance="AUTHORED (model-written fixture; not natural; never held-out natural data)", kind=kind,
                        head_sha256=hashlib.sha256(text.encode()[:4096]).hexdigest()))
json.dump(man, open(f"{ROOT}/manifest.negatives_authored.json", "w"), indent=1)
import collections
print(len(man), collections.Counter(m["split"] for m in man))
