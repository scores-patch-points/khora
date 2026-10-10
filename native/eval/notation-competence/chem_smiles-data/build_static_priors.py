#!/usr/bin/env python3
"""Build the STATIC received priors of the chem_smiles family from TRAIN only (+ named standards).

  priors/notation-chem_smiles-elements.json   element table (giver: PubChem periodic table export of IUPAC/NIST data) + TRAIN tallies
  priors/notation-chem_smiles-grammar.json    SMILES lexical facts (Daylight / OpenSMILES), InChI layer prefixes (InChI Technical Manual),
                                              SELFIES alphabet (selfies 2.2.0 engine; MIT)
  priors/notation-chem_smiles-nameparts.json  name n-gram -> element evidence, tallied on TRAIN (ChEBI IUPAC names x ChEBI structures)

TRAIN = ChEBI r255 + ChEMBL (corpus/train.json); gold atoms come from RDKit (gold/train.jsonl). Nothing from dev/test is read.
Run:  /private/tmp/claude-501/venv/bin/python build_static_priors.py
The system prior (R0 LM + naive Bayes) is built by build-system-prior.mjs because its features are the adapter's own.
"""
import json, os, re
from collections import Counter, defaultdict

ROOT = "/private/tmp/claude-501/notation/chem_smiles"
PRIORS = "/Users/mlacy/Documents/3.0/khora/native/priors"
FETCHED = "2026-10-06"

# declared constants (P4: declared, not tuned after any result)
NAME_MIN_COUNT = 8       # an n-gram must occur in >= 8 TRAIN names
NAME_MIN_PRECISION = 0.97  # P(element present | n-gram in name) on TRAIN
NAME_MIN_LIFT = 0.10      # P(e | gram) - P(e | no gram) >= 0.10 absolute (an n-gram must raise the odds, not just co-occur with a common element)
NAME_NGRAM = (3, 10)


def load_train():
    corpus = json.load(open(os.path.join(ROOT, "corpus", "train.json")))
    gold = {}
    with open(os.path.join(ROOT, "gold", "train.jsonl")) as f:
        for line in f:
            g = json.loads(line)
            gold[g["id"]] = g
    return corpus, gold


def elements_prior(corpus, gold):
    t = json.load(open(os.path.join(ROOT, "raw", "pubchem-periodictable.json")))["Table"]
    cols = t["Columns"]["Column"]
    rec_ct, atom_ct = Counter(), Counter()
    n_ok = 0
    for r in corpus["records"]:
        g = gold.get(r["id"])
        if not g or not g["smi"]["ok"]:
            continue
        n_ok += 1
        syms = [a[0] for a in g["smi"]["atoms"]]
        atom_ct.update(syms)
        rec_ct.update(set(syms))
    symbols = {}
    for row in t["Row"]:
        c = dict(zip(cols, row["Cell"]))
        s = c["Symbol"]
        symbols[s] = {"z": int(c["AtomicNumber"]), "name": c["Name"], "block": c["GroupBlock"],
                      "train": {"records": rec_ct.get(s, 0), "atoms": atom_ct.get(s, 0)}}
    return {
        "kind": "ChemElementPrior@1", "family": "chem_smiles",
        "givers": [{"name": "PubChem Periodic Table (atomic data of IUPAC / NIST)", "url": "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON",
                    "license": "public domain (NCBI/NLM)", "fetched": FETCHED, "raw": "raw/pubchem-periodictable.json"}],
        "refuses": "a bracket atom whose symbol is not in this table (and not '*' or an aromatic symbol of the grammar prior)",
        "train_counts": {"source": "TRAIN = ChEBI r255 + ChEMBL; atoms read by RDKit (Chem.MolFromSmiles sanitize=False) from the written SMILES",
                         "records_parsed": n_ok, "elements_attested": sum(1 for v in symbols.values() if v["train"]["records"] > 0)},
        "unattested_in_train": sorted([s for s, v in symbols.items() if v["train"]["records"] == 0], key=lambda s: symbols[s]["z"]),
        "symbols": symbols,
    }


def grammar_prior():
    import selfies as sf
    alpha = sorted(t[1:-1] for t in sf.get_semantic_robust_alphabet())
    return {
        "kind": "ChemNotationGrammar@1", "family": "chem_smiles",
        "givers": [
            {"name": "Daylight SMILES Theory Manual (Weininger 1988; Daylight CIS)", "url": "https://ics.uci.edu/~dock/manuals/DaylightTheoryManual/theory.smiles.html", "use": "FACTS ONLY (token classes, organic subset, normal valences); no text stored"},
            {"name": "OpenSMILES specification v1.0", "url": "https://github.com/opensmiles/OpenSMILES", "license": "GFDL-1.2 (not on the family's permitted-licence list): read once to cross-check the grammar facts, NOT stored", "use": "cross-check of: aliphatic_organic, aromatic_organic, bracket-atom grammar, bond symbols, ring-bond forms, normal valences"},
            {"name": "InChI Technical Manual (IUPAC-InChI/InChI)", "url": "https://github.com/IUPAC-InChI/InChI/blob/dev/INCHI-1-DOC/InChI_TechMan.pdf", "license": "MIT", "fetched": FETCHED, "raw": "raw/inchi/InChI_TechMan.pdf", "use": "layer prefixes /c /h /q /p /b /t /m /s /i /f /o (+ /r /z); formula layer = Hill-sorted; H atoms never numbered"},
            {"name": "SELFIES 2.2.0 engine alphabet (Krenn et al. 2020)", "url": "https://github.com/aspuru-guzik-group/selfies", "license": "MIT", "use": "get_semantic_robust_alphabet() + the token pattern verified on TRAIN SELFIES"},
        ],
        "smiles": {
            "organic_subset": ["B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"],
            "aromatic_organic": ["b", "c", "n", "o", "p", "s"],
            "aromatic_bracket": ["b", "c", "n", "o", "p", "s", "se", "as"],
            "wildcard": "*",
            "bond_chars": {"-": "single", "=": "double", "#": "triple", "$": "quadruple", ":": "aromatic", "/": "single", "\\": "single", "~": "any"},
            "ring_closure": ["digit", "%nn", "%(nnn)"],
            "valences": {"B": [3], "C": [4], "N": [3, 5], "O": [2], "P": [3, 5], "S": [2, 4, 6], "F": [1], "Cl": [1], "Br": [1], "I": [1]},
            "note": "an implicit bond between two aromatic atoms is 'single or aromatic' (OpenSMILES); the reader labels it 'aromatic' by the default rule and resolves it at end of text",
        },
        "inchi": {
            "header": "InChI=", "versions": ["1S", "1"],
            "layers": {"c": "connections", "h": "hydrogens", "q": "charge", "p": "protons", "b": "double_bond_stereo", "t": "sp3_stereo", "m": "inversion", "s": "stereo_type", "i": "isotopic", "f": "fixed_h", "o": "transposition", "r": "reconnected", "z": "polymer"},
        },
        "selfies": {"alphabet": alpha, "structural_pattern": r"^[=#/\\-]?(?:[0-9]+)?(?:[A-Z][a-z]?|\*)(?:@@?)?(?:H[0-9])?(?:[+-][0-9]+)?$|^[=#]?(?:Branch|Ring)[123]$"},
    }


def nameparts_prior(corpus, gold):
    byid = {r["id"]: r for r in corpus["records"]}
    docs = []  # (set(grams), set(elements))
    for rid, r in byid.items():
        g = gold.get(rid)
        if not r.get("name") or not g or not g["smi"]["ok"]:
            continue
        low = re.sub(r"[^a-z]+", "|", r["name"].lower())
        grams = set()
        for run in low.split("|"):
            for n in range(NAME_NGRAM[0], NAME_NGRAM[1] + 1):
                for i in range(0, len(run) - n + 1):
                    grams.add(run[i:i + n])
        els = {a[0] for a in g["smi"]["atoms"]} - {"C", "H"}
        docs.append((grams, els))
    cnt = Counter()
    co = defaultdict(Counter)
    n_docs = len(docs)
    n_el = Counter()
    for _, els in docs:
        n_el.update(els)
    for grams, els in docs:
        for gm in grams:
            cnt[gm] += 1
            for e in els:
                co[gm][e] += 1
    kept = []
    for gm, c in cnt.items():
        if c < NAME_MIN_COUNT:
            continue
        for e, k in co[gm].items():
            if k / c < NAME_MIN_PRECISION:
                continue
            rest = n_docs - c
            p_not = (n_el[e] - k) / rest if rest > 0 else 0.0
            if k / c - p_not >= NAME_MIN_LIFT:
                kept.append((len(gm), gm, e, c, k))
    kept.sort()
    grams = []
    have = defaultdict(list)
    for L, gm, e, c, k in kept:
        if any(sub in gm for sub in have[e]):
            continue  # a shorter kept gram of the same element already covers it
        have[e].append(gm)
        grams.append({"g": gm, "e": e, "n": c, "p": round(k / c, 4)})
    grams.sort(key=lambda x: (x["e"], x["g"]))
    return {
        "kind": "ChemNameElementEvidence@1", "family": "chem_smiles",
        "givers": [{"name": "TRAIN tallies: ChEBI r255 'IUPAC NAME' field x the same entry's structure (RDKit atoms)", "license": "CC BY 4.0", "note": "a corpus tally, not a nomenclature grammar"}],
        "declared": {"min_count": NAME_MIN_COUNT, "min_precision": NAME_MIN_PRECISION, "min_lift_abs": NAME_MIN_LIFT, "ngram": list(NAME_NGRAM), "elements": "all except C and H (carbon and hydrogen are implicit in organic names)"},
        "train_docs": len(docs),
        "refuses": "everything not listed: absence of an n-gram is NOT evidence of an element's absence",
        "grams": grams,
    }


def main():
    corpus, gold = load_train()
    os.makedirs(PRIORS, exist_ok=True)
    for name, obj in (("elements", elements_prior(corpus, gold)), ("grammar", grammar_prior()), ("nameparts", nameparts_prior(corpus, gold))):
        p = os.path.join(PRIORS, f"notation-chem_smiles-{name}.json")
        with open(p, "w") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        print("wrote", p, os.path.getsize(p))
    np_ = json.load(open(os.path.join(PRIORS, "notation-chem_smiles-nameparts.json")))
    print("name grams", len(np_["grams"]), "by element", dict(Counter(g["e"] for g in np_["grams"])))


if __name__ == "__main__":
    main()
