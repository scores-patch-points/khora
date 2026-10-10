#!/usr/bin/env python3
"""Fetch the open chem_smiles corpora. Every fetch is seeded and polite; raw bytes land in raw/<source>/.

Sources (split by SOURCE, never by record):
  TRAIN  chebi   ChEBI release 255 (CC BY 4.0)         REST API, seeded sample of 3-star compound ids + compounds.tsv.gz definitions (English)
  TRAIN  chembl  ChEMBL (CC BY-SA 3.0)                 REST API, seeded random offsets
  DEV    ccd     wwPDB Chemical Component Dictionary (CC0)  Components-smiles-stereo-oe.smi + Components-inchi.ich
  TEST   pubchem PubChem (public domain / open data)  PUG REST, seeded random CIDs
  giver  pubchem periodic table JSON (public domain)
Usage: fetch.py <what>   what in: ccd chebi chembl pubchem periodic
"""
import gzip, io, json, os, random, sys, time, urllib.request, urllib.error, concurrent.futures as cf

ROOT = "/private/tmp/claude-501/notation/chem_smiles"
RAW = os.path.join(ROOT, "raw")
UA = {"User-Agent": "khora-notation-competence/1.0 (research; contact michael.t.lacy@gmail.com)"}
SEED = 20261006


def get(url, tries=4, timeout=60, binary=False):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            return data if binary else data.decode("utf8")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 404):
                return None
            time.sleep(1.5 * (k + 1))
        except Exception as e:  # network blips
            last = e
            time.sleep(1.5 * (k + 1))
    sys.stderr.write(f"FAILED {url}: {last}\n")
    return None


def save(path, data, binary=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb" if binary else "w") as f:
        f.write(data)


def ccd():
    base = "https://files.wwpdb.org/pub/pdb/data/monomers/"
    for f in ("Components-smiles-stereo-oe.smi", "Components-inchi.ich"):
        d = get(base + f, binary=True, timeout=180)
        save(os.path.join(RAW, "ccd", f), d, binary=True)
        print("ccd", f, len(d))


def chebi(n_struct=4200, n_def=4000):
    comp = get("https://ftp.ebi.ac.uk/pub/databases/chebi/flat_files/compounds.tsv.gz", binary=True, timeout=180)
    save(os.path.join(RAW, "chebi", "compounds.tsv.gz"), comp, binary=True)
    rows = []
    with gzip.open(io.BytesIO(comp), "rt", encoding="utf8") as f:
        head = f.readline().rstrip("\n").split("\t")
        ix = {h: i for i, h in enumerate(head)}
        for line in f:
            c = line.rstrip("\n").split("\t")
            if len(c) < len(head):
                continue
            rows.append(c)
    three = [int(c[ix["id"]]) for c in rows if c[ix["stars"]] == "3"]
    rng = random.Random(SEED)
    rng.shuffle(three)
    ids = sorted(three[:n_struct])
    print("chebi 3-star ids", len(three), "sampling", len(ids))
    out = os.path.join(RAW, "chebi", "api.jsonl")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    def one(i):
        j = get(f"https://www.ebi.ac.uk/chebi/backend/api/public/compound/{i}/", timeout=40)
        if not j:
            return None
        d = json.loads(j)
        ds = d.get("default_structure") or {}
        cd = d.get("chemical_data") or {}
        nm = d.get("names") or {}
        return {
            "id": f"CHEBI:{i}", "name": d.get("name"), "definition": d.get("definition"),
            "smiles": ds.get("smiles"), "inchi": ds.get("standard_inchi"), "inchikey": ds.get("standard_inchi_key"),
            "formula": cd.get("formula"), "charge": cd.get("charge"),
            "iupac_names": [x["name"] for x in (nm.get("IUPAC NAME") or [])],
        }

    n = 0
    with open(out, "w") as fo, cf.ThreadPoolExecutor(max_workers=5) as ex:
        for rec in ex.map(one, ids):
            if rec:
                fo.write(json.dumps(rec, ensure_ascii=False) + "\n")
                n += 1
                if n % 500 == 0:
                    print("chebi api", n, flush=True)
    print("chebi api records", n)


def chembl(n_pages=8, page=500):
    total = 2921148
    rng = random.Random(SEED + 1)
    offs = sorted(rng.sample(range(0, total - page), n_pages))
    out = os.path.join(RAW, "chembl", "molecules.jsonl")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    n = 0
    with open(out, "w") as fo:
        for o in offs:
            j = get(f"https://www.ebi.ac.uk/chembl/api/data/molecule.json?limit={page}&offset={o}", timeout=120)
            if not j:
                continue
            for m in json.loads(j)["molecules"]:
                st = m.get("molecule_structures") or {}
                pr = m.get("molecule_properties") or {}
                if not st.get("canonical_smiles"):
                    continue
                fo.write(json.dumps({
                    "id": m["molecule_chembl_id"], "smiles": st.get("canonical_smiles"), "inchi": st.get("standard_inchi"),
                    "inchikey": st.get("standard_inchi_key"), "formula": pr.get("full_molformula"), "pref_name": m.get("pref_name"),
                }, ensure_ascii=False) + "\n")
                n += 1
            print("chembl offset", o, "total", n, flush=True)
            time.sleep(0.5)
    print("chembl records", n)


def pubchem(n_cids=9000, batch=150):
    rng = random.Random(SEED + 2)
    cids = sorted(rng.sample(range(1, 160_000_000), n_cids))
    out = os.path.join(RAW, "pubchem", "props.jsonl")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    n = 0
    with open(out, "w") as fo:
        for i in range(0, len(cids), batch):
            b = cids[i:i + batch]
            url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" + ",".join(map(str, b)) + "/property/MolecularFormula,SMILES,ConnectivitySMILES,InChI,IUPACName/JSON"
            j = get(url, timeout=90)
            if j:
                for p in json.loads(j)["PropertyTable"]["Properties"]:
                    fo.write(json.dumps(p, ensure_ascii=False) + "\n")
                    n += 1
            if (i // batch) % 10 == 0:
                print("pubchem batch", i // batch, "records", n, flush=True)
            time.sleep(0.25)
    print("pubchem records", n)


def periodic():
    j = get("https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON", timeout=60)
    save(os.path.join(RAW, "pubchem-periodictable.json"), j)
    print("periodic bytes", len(j))


if __name__ == "__main__":
    for w in sys.argv[1:]:
        globals()[w]()
