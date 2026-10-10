#!/usr/bin/env python3
"""Build the split-by-SOURCE corpus + manifest from raw/.

  TRAIN = chebi + chembl      (priors are built from these ONLY)
  DEV   = ccd                 (develop / smoke here)
  TEST  = pubchem             (the final card uses this ONCE)

Cross-source near-duplicates are removed by InChIKey connectivity block (first 14 chars):
  dev  minus train ;  test minus (train + dev).  Within a source, first occurrence wins.
English distractors for R0: TRAIN = ChEBI definitions (HTML stripped); DEV/TEST = UD English-EWT dev/test "# text" lines.
SELFIES distractors are ENGINE-DERIVED (selfies 2.2.0 encoder over the same split's SMILES), labelled so.
Formula distractors are the registry's own molecular-formula field.
"""
import gzip, hashlib, io, json, os, random, re, sys
from rdkit import Chem, RDLogger
RDLogger.DisableLog("rdApp.*")

ROOT = "/private/tmp/claude-501/notation/chem_smiles"
RAW = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "corpus")
os.makedirs(OUT, exist_ok=True)
SEED = 20261006
TAG = re.compile(r"<[^>]+>")


def strip(s):
    if s is None:
        return None
    s = TAG.sub("", s).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return " ".join(s.split())


def key14(inchi, smiles):
    try:
        if inchi and inchi.startswith("InChI="):
            return Chem.InchiToInchiKey(inchi)[:14]
    except Exception:
        pass
    try:
        m = Chem.MolFromSmiles(smiles)
        if m is not None:
            return Chem.MolToInchiKey(m)[:14]
    except Exception:
        pass
    return None


def jl(path):
    with open(path) as f:
        for line in f:
            if line.strip():
                yield json.loads(line)


def load_chebi():
    out = []
    for r in jl(os.path.join(RAW, "chebi", "api.jsonl")):
        if not r.get("smiles") or not r.get("inchi"):
            continue
        names = [strip(n) for n in (r.get("iupac_names") or []) if strip(n)]
        out.append({"id": r["id"], "source": "chebi", "smiles": r["smiles"], "inchi": r["inchi"],
                    "name": names[0] if names else None, "formula": r.get("formula")})
    return out


def load_chembl():
    out = []
    for r in jl(os.path.join(RAW, "chembl", "molecules.jsonl")):
        if not r.get("smiles") or not r.get("inchi"):
            continue
        out.append({"id": r["id"], "source": "chembl", "smiles": r["smiles"], "inchi": r["inchi"], "name": None, "formula": r.get("formula")})
    return out


def load_ccd():
    smi, ich = {}, {}
    with open(os.path.join(RAW, "ccd", "Components-smiles-stereo-oe.smi")) as f:
        for line in f:
            c = line.rstrip("\n").split("\t")
            if len(c) >= 2:
                smi[c[1]] = (c[0], c[2] if len(c) > 2 else None)
    with open(os.path.join(RAW, "ccd", "Components-inchi.ich")) as f:
        for line in f:
            c = line.rstrip("\n").split("\t")
            if len(c) >= 2:
                ich[c[1]] = c[0]
    out = []
    for k in sorted(smi):
        if k in ich and smi[k][0] and ich[k].startswith("InChI="):
            out.append({"id": f"CCD:{k}", "source": "ccd", "smiles": smi[k][0], "inchi": ich[k], "name": smi[k][1] or None, "formula": None})
    return out


def load_pubchem():
    out = []
    for r in jl(os.path.join(RAW, "pubchem", "props.jsonl")):
        if not r.get("SMILES") or not r.get("InChI"):
            continue
        out.append({"id": f"CID:{r['CID']}", "source": "pubchem", "smiles": r["SMILES"], "inchi": r["InChI"],
                    "name": r.get("IUPACName"), "formula": r.get("MolecularFormula")})
    return out


def chebi_definitions(n=3500):
    out = []
    with gzip.open(os.path.join(RAW, "chebi", "compounds.tsv.gz"), "rt", encoding="utf8") as f:
        head = f.readline().rstrip("\n").split("\t")
        ix = {h: i for i, h in enumerate(head)}
        for line in f:
            c = line.rstrip("\n").split("\t")
            if len(c) < len(head) or c[ix["stars"]] != "3":
                continue
            d = strip(c[ix["definition"]].strip('"'))
            if d and len(d) >= 40:
                out.append(d)
    rng = random.Random(SEED + 5)
    rng.shuffle(out)
    return out[:n]


def ud_text(split, n=2500):
    out = []
    with open(f"/private/tmp/claude-501/ud-eval/eng/{split}.conllu", encoding="utf8") as f:
        for line in f:
            if line.startswith("# text = "):
                t = line[len("# text = "):].strip()
                if len(t) >= 25:
                    out.append(t)
    rng = random.Random(SEED + 6 + (1 if split == "test" else 0))
    rng.shuffle(out)
    return out[:n]


def dedupe(recs, seen, cap, seed):
    keep, local = [], set()
    for r in recs:
        k = key14(r["inchi"], r["smiles"])
        r["key14"] = k
        if k is None or k in seen or k in local:
            continue
        local.add(k)
        keep.append(r)
    rng = random.Random(seed)
    rng.shuffle(keep)
    keep = keep[:cap]
    return keep, {r["key14"] for r in keep}


def main():
    stats = {}
    chebi, chembl, ccd, pub = load_chebi(), load_chembl(), load_ccd(), load_pubchem()
    stats["raw_counts"] = {"chebi": len(chebi), "chembl": len(chembl), "ccd": len(ccd), "pubchem": len(pub)}
    train_pool = chebi + chembl
    train, k_train = dedupe(train_pool, set(), 7000, SEED)
    dev, k_dev = dedupe(ccd, k_train, 6000, SEED + 1)
    test, k_test = dedupe(pub, k_train | k_dev, 6000, SEED + 2)
    stats["after_dedupe"] = {"train": len(train), "dev": len(dev), "test": len(test)}
    stats["cross_source_removed"] = {
        "dev_vs_train": len([1 for r in ccd if key14(r["inchi"], r["smiles"]) in k_train]),
        "test_vs_train_or_dev": len([1 for r in pub if key14(r["inchi"], r["smiles"]) in (k_train | k_dev)]),
    }
    # engine-derived SELFIES distractors
    import selfies as sf
    eng = {"train": chebi_definitions(), "dev": ud_text("dev"), "test": ud_text("test")}
    splits = {"train": train, "dev": dev, "test": test}
    for name, recs in splits.items():
        # SELFIES (engine-derived) for a seeded subset
        rng = random.Random(SEED + 9 + len(name))
        sel = []
        for r in rng.sample(recs, min(len(recs), 1400)):
            try:
                s = sf.encoder(r["smiles"])
                if s:
                    sel.append({"id": r["id"], "text": s})
            except Exception:
                pass
        formula = []
        for r in recs:
            fm = r.get("formula")
            if fm is None:
                try:
                    m = Chem.MolFromSmiles(r["smiles"])
                    if m is not None:
                        from rdkit.Chem.rdMolDescriptors import CalcMolFormula
                        fm = CalcMolFormula(m)
                except Exception:
                    fm = None
            if fm and re.search(r"[A-Z]", fm):
                formula.append({"id": r["id"], "text": fm})
        names = [{"id": r["id"], "text": r["name"]} for r in recs if r.get("name")]
        with open(os.path.join(OUT, f"{name}.json"), "w") as f:
            json.dump({"split": name, "records": recs, "selfies": sel, "formula": formula[:1500], "names": names, "english": eng[name]}, f, ensure_ascii=False)
        stats[name] = {"records": len(recs), "by_source": {s: sum(1 for r in recs if r["source"] == s) for s in sorted({r["source"] for r in recs})},
                       "selfies": len(sel), "formula": min(len(formula), 1500), "names": len(names), "english": len(eng[name])}
    manifest = {
        "family": "chem_smiles", "seed": SEED,
        "split_rule": "BY SOURCE: train = ChEBI r255 + ChEMBL; dev = wwPDB CCD; test = PubChem. Dev/test records whose InChIKey connectivity block occurs in an earlier split are removed.",
        "sources": {
            "chebi": {"split": "train", "license": "CC BY 4.0", "url": "https://ftp.ebi.ac.uk/pub/databases/chebi/ ; https://www.ebi.ac.uk/chebi/backend/api/public/compound/{id}/"},
            "chembl": {"split": "train", "license": "CC BY-SA 3.0", "url": "https://www.ebi.ac.uk/chembl/api/data/molecule.json"},
            "ccd": {"split": "dev", "license": "CC0 1.0 (wwPDB)", "url": "https://files.wwpdb.org/pub/pdb/data/monomers/"},
            "pubchem": {"split": "test", "license": "public domain / open data (NCBI)", "url": "https://pubchem.ncbi.nlm.nih.gov/rest/pug/"},
            "ud-eng-ewt": {"split": "dev/test English distractors", "license": "CC BY-SA 4.0", "url": "local copy of UD_English-EWT dev/test conllu at /private/tmp/claude-501/ud-eval/eng/"},
        },
        "stats": stats,
    }
    with open(os.path.join(ROOT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(json.dumps(stats, indent=1))


if __name__ == "__main__":
    main()
