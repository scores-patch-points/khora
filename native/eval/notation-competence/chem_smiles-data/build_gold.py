#!/usr/bin/env python3
"""Derive the INDEPENDENT GOLD for each split with the real authorities.

  SMILES  ->  RDKit (Chem.MolFromSmiles(sanitize=False) = the written structure; atom index == textual order of atoms)
              atoms (sym,z,aromatic,charge,isotope,explicit-H), bonds (as written), symmetrized SSSR rings, fragments.
              Sanitized parse (removeHs=False) additionally gives the RESOLVED type of implicit aromatic-aromatic bonds.
  tokens  ->  the published regex tokenizer of rxnfp (MIT; the Molecular Transformer / Schwaller 2019 pattern), loaded from
              the fetched file, with RDKit CONSEQUENCE checks: lossless, #atom tokens == RDKit atoms. Inconsistent => no token gold.
  InChI   ->  RDKit Chem.MolFromInchi (the IUPAC InChI library) : atoms in InChI numbering, bonds (no orders), plus the
              Hill-formula expansion order check.
  pairs   ->  same compound iff InChIKey connectivity block of RDKit(SMILES) == that of the record InChI.
  names   ->  OPSIN 2.9.0 (MIT) name -> SMILES; consistent iff its connectivity block equals the record's.
Output: gold/<split>.jsonl  (one JSON per record id) + gold/<split>.summary.json (denominators and gaps).
"""
import ast, json, os, re, subprocess, sys, tempfile
from collections import Counter
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula
RDLogger.DisableLog("rdApp.*")

ROOT = "/private/tmp/claude-501/notation/chem_smiles"
JAVA = "/opt/homebrew/opt/openjdk/bin/java"
JAR = "/private/tmp/claude-501/venv/lib/python3.14/site-packages/py2opsin/opsin-cli-2.9.0-jar-with-dependencies.jar"


def schwaller_pattern():
    src = open(os.path.join(ROOT, "raw", "tokenizer", "rxnfp_tokenization.py")).read()
    tree = ast.parse(src)
    for node in tree.body:
        if isinstance(node, ast.Assign) and getattr(node.targets[0], "id", None) == "SMI_REGEX_PATTERN":
            return ast.literal_eval(node.value)
    raise SystemExit("pattern not found")


PAT = re.compile(schwaller_pattern())
ATOM_TOK = re.compile(r"^(\[[^\]]+\]|Br|Cl|B|C|N|O|S|P|F|I|b|c|n|o|s|p|\*)$")
BT = {"SINGLE": "single", "DOUBLE": "double", "TRIPLE": "triple", "QUADRUPLE": "quadruple", "AROMATIC": "aromatic"}


def tokens_gold(smiles, n_atoms):
    toks, pos, bad = [], 0, None
    for m in PAT.finditer(smiles):
        if m.start() != pos:
            bad = "gap_in_cover"
            break
        toks.append([m.start(), m.end()])
        pos = m.end()
    if bad is None and pos != len(smiles):
        bad = "trailing_uncovered"
    if bad is None:
        na = sum(1 for s, e in toks if ATOM_TOK.match(smiles[s:e]))
        if na != n_atoms:
            bad = "atom_token_count_ne_rdkit_atoms"
    return {"tokens": toks if bad is None else None, "reason": bad}


def smiles_gold(smi):
    m = Chem.MolFromSmiles(smi, sanitize=False)
    if m is None:
        return {"ok": False, "reason": "rdkit_parse_fail"}
    atoms = [[a.GetSymbol(), a.GetAtomicNum(), 1 if a.GetIsAromatic() else 0, a.GetFormalCharge(), a.GetIsotope(), a.GetNumExplicitHs(), 1 if a.GetNoImplicit() else 0] for a in m.GetAtoms()]
    bonds = []
    for b in m.GetBonds():
        i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
        bonds.append([min(i, j), max(i, j), BT.get(str(b.GetBondType()), str(b.GetBondType()).lower())])
    bonds.sort()
    try:
        rings = sorted(sorted(list(r)) for r in Chem.GetSymmSSSR(m))
    except Exception:
        rings = None
    frags = [sorted(f) for f in Chem.GetMolFrags(m)]
    # resolved bond types for implicit aromatic-aromatic bonds (needs a sanitized parse with Hs kept)
    resolved = None
    h_total = None
    try:
        p = Chem.SmilesParserParams()
        p.removeHs = False
        ms = Chem.MolFromSmiles(smi, p)
        if ms is not None and ms.GetNumAtoms() == m.GetNumAtoms():
            h_total = [a.GetTotalNumHs() for a in ms.GetAtoms()]
            resolved = {}
            for b in ms.GetBonds():
                i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
                resolved[f"{min(i, j)}-{max(i, j)}"] = BT.get(str(b.GetBondType()), "other")
    except Exception:
        resolved = None
    inchi_key14 = None
    try:
        ms2 = Chem.MolFromSmiles(smi)
        if ms2 is not None:
            inchi_key14 = Chem.MolToInchiKey(ms2)[:14]
    except Exception:
        pass
    n, nb, nc = len(atoms), len(bonds), len(frags)
    formula = None
    try:
        formula = CalcMolFormula(m)
    except Exception:
        pass
    return {"ok": True, "atoms": atoms, "bonds": bonds, "rings": rings, "comps": frags, "mu": nb - n + nc,
            "resolved": resolved, "h_total": h_total, "key14": inchi_key14, "formula": formula,
            "elements": sorted({a[0] for a in atoms})}


HILL_ORDER_NOTE = "InChI formula: C first, then alphabetical (H counted only as implicit unless it is the only element)"


def inchi_gold(inchi):
    try:
        m = Chem.MolFromInchi(inchi, sanitize=False, removeHs=False)
    except Exception:
        m = None
    if m is None:
        return {"ok": False, "reason": "rdkit_inchi_parse_fail"}
    syms = [a.GetSymbol() for a in m.GetAtoms()]
    # RDKit appends explicit H atoms for stereo parities; InChI never NUMBERS hydrogens, so they are artefacts of the toolkit:
    # keep the heavy atoms (which must be a prefix) and the bonds among them.
    heavy = [i for i, s in enumerate(syms) if s != "H"]
    prefix = heavy == list(range(len(heavy)))
    atoms = [syms[i] for i in heavy]
    hs = set(range(len(syms))) - set(heavy)
    bonds = sorted([min(b.GetBeginAtomIdx(), b.GetEndAtomIdx()), max(b.GetBeginAtomIdx(), b.GetEndAtomIdx())] for b in m.GetBonds()
                   if b.GetBeginAtomIdx() not in hs and b.GetEndAtomIdx() not in hs)
    try:
        rings = sorted(sorted(list(r)) for r in Chem.GetSymmSSSR(m))
    except Exception:
        rings = None
    comps = [sorted(i for i in f if i not in hs) for f in Chem.GetMolFrags(m)]
    comps = [c for c in comps if c]
    return {"ok": True, "heavy_is_prefix": prefix, "n_h_artefacts": len(hs), "atoms": atoms, "bonds": bonds, "rings": rings, "comps": comps,
            "key14": Chem.InchiToInchiKey(inchi)[:14] if Chem.InchiToInchiKey(inchi) else None}


def run_opsin(names):
    """names: list[str] -> list[str|None] (SMILES or None)."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write("\n".join(n.replace("\n", " ") for n in names) + "\n")
        path = f.name
    r = subprocess.run([JAVA, "-jar", JAR, "-osmi", path], capture_output=True, text=True, timeout=1800)
    os.unlink(path)
    lines = r.stdout.split("\n")
    out = []
    for i in range(len(names)):
        s = lines[i].strip() if i < len(lines) else ""
        out.append(s or None)
    return out


CIP = re.compile(r"\(([0-9a-z,'\-]*)\)")


def rescue_case(name):
    """Gold-side rescue only (the READER never sees this): CCD names lower-case CIP descriptors and letter locants."""
    s = re.sub(r"\(([^()]*)\)", lambda m: "(" + re.sub(r"(?<=[0-9,'])([rsezrs])(?=[,)'])", lambda k: k.group(1).upper(), m.group(1)) + ")", name)
    s = re.sub(r"(?<![A-Za-z])([nospl])(?=-)", lambda m: m.group(1).upper(), s)
    s = re.sub(r"(?<![A-Za-z])([dl])-", lambda m: m.group(1).upper() + "-", s)
    return s


def main(splits):
    for split in splits:
        corpus = json.load(open(os.path.join(ROOT, "corpus", f"{split}.json")))
        recs = corpus["records"]
        out_path = os.path.join(ROOT, "gold", f"{split}.jsonl")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        summ = Counter()
        gold = {}
        for r in recs:
            g = {"id": r["id"], "source": r["source"]}
            sg = smiles_gold(r["smiles"])
            g["smi"] = sg
            summ["records"] += 1
            if not sg["ok"]:
                summ["smiles_rdkit_fail"] += 1
            else:
                tg = tokens_gold(r["smiles"], len(sg["atoms"]))
                g["tok"] = tg
                summ["token_gold_ok" if tg["tokens"] else "token_gold_" + tg["reason"]] += 1
            ig = inchi_gold(r["inchi"])
            g["inchi"] = ig
            if not ig["ok"]:
                summ["inchi_rdkit_fail"] += 1
            if sg["ok"] and ig["ok"]:
                same = sg["key14"] is not None and sg["key14"] == r["key14"]
                g["same_compound"] = bool(same)
                summ["pair_same" if same else "pair_registry_disagree"] += 1
            gold[r["id"]] = g
        # OPSIN on names (gold-quality gate for the name <-> structure pairing)
        withn = [r for r in recs if r.get("name")]
        if withn:
            smis = run_opsin([r["name"] for r in withn])
            retry = [(i, rescue_case(r["name"])) for i, (r, s) in enumerate(zip(withn, smis)) if s is None]
            if retry:
                s2 = run_opsin([n for _, n in retry])
                for (i, _), s in zip(retry, s2):
                    if s:
                        smis[i] = s
                        gold[withn[i]["id"]]["name_rescued"] = True
            for r, s in zip(withn, smis):
                g = gold[r["id"]]
                summ["names"] += 1
                if s is None:
                    g["name_opsin"] = {"ok": False}
                    summ["name_opsin_unparsed"] += 1
                    continue
                m = Chem.MolFromSmiles(s)
                k = None
                if m is not None:
                    try:
                        k = Chem.MolToInchiKey(m)[:14]
                    except Exception:
                        k = None
                cons = bool(k and k == r["key14"])
                g["name_opsin"] = {"ok": True, "smiles": s, "consistent": cons, "key14": k}
                summ["name_opsin_consistent" if cons else "name_opsin_inconsistent"] += 1
        with open(out_path, "w") as f:
            for r in recs:
                f.write(json.dumps(gold[r["id"]]) + "\n")
        with open(os.path.join(ROOT, "gold", f"{split}.summary.json"), "w") as f:
            json.dump(dict(summ), f, indent=1)
        print(split, dict(summ), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:] or ["train", "dev", "test"])
