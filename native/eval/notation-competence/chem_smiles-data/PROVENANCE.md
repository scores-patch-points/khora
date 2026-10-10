# PROVENANCE — family `chem_smiles` (chemical linear notation: SMILES, InChI, IUPAC names)

All fetched 2026-10-06 by `scripts/fetch.py` (seed 20261006, polite rate, User-Agent names the project). Raw bytes: `raw/`. Raw total ~36 MB (cap ~60 MB).
Derived (regenerable, not fetched): `corpus/` (11 MB), `gold/` (70 MB, RDKit/OPSIN output).

## Corpora (split by SOURCE, never by record)

| split | source | what was fetched | URL | licence | selection |
|---|---|---|---|---|---|
| TRAIN | ChEBI release 255 | 4,200 compound records via REST API (3,111 have a structure) + `flat_files/compounds.tsv.gz` (definitions = English R0 distractors) | https://ftp.ebi.ac.uk/pub/databases/chebi/ ; https://www.ebi.ac.uk/chebi/backend/api/public/compound/{id}/ | CC BY 4.0 (attribution: ChEBI, EMBL-EBI, release 255) | seeded random sample of 3-star ids |
| TRAIN | ChEMBL | 3,993 molecules (canonical_smiles, standard_inchi, formula) | https://www.ebi.ac.uk/chembl/api/data/molecule.json?limit=500&offset=… | CC BY-SA 3.0 | 8 seeded random offsets x 500 |
| DEV | wwPDB Chemical Component Dictionary | `Components-smiles-stereo-oe.smi` (7.4 MB), `Components-inchi.ich` (12.1 MB): SMILES + InChI + (lower-cased) systematic name per ligand id | https://files.wwpdb.org/pub/pdb/data/monomers/ | CC0 1.0 | joined on component id; seeded sample of 6,000 after de-duplication |
| TEST | PubChem | 9,000 seeded random CIDs, properties `SMILES, ConnectivitySMILES, InChI, IUPACName, MolecularFormula` | https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/…/property/…/JSON | public domain / open data (NCBI); attribute PubChem | seeded 6,000 after de-duplication |
| DEV/TEST English (R0 distractor only) | UD English-EWT dev / test | `# text =` lines of the local copy used by the natural-language card | /private/tmp/claude-501/ud-eval/eng/{dev,test}.conllu (fetched earlier by another workflow) | CC BY-SA 4.0 | length >= 25 chars, seeded |

Sizes after de-duplication: TRAIN 6,886 (ChEBI 2,990 + ChEMBL 3,896), DEV 6,000, TEST 6,000. Cross-source near-duplicates removed by InChIKey connectivity block
(first 14 characters): DEV minus TRAIN removed 1,104 CCD records (ChEBI curates many CCD ligands); TEST minus (TRAIN+DEV) removed 4. Overlap check after the fact: 0 / 0 / 0
(train&dev, train&test, dev&test). `manifest.json` (rules, counts, sha256 of corpus and gold files), `manifest-ids.json` (record ids per split).

Other R0 classes: IUPAC names = ChEBI `IUPAC NAME` field (TRAIN), CCD name column (DEV), PubChem `IUPACName` (TEST); formulae = each registry's own molecular-formula field;
SELFIES are ENGINE-DERIVED (selfies 2.2.0 encoder over the split's own SMILES) and labelled so everywhere they appear. No model-authored text is in any corpus; test fixtures under
`tests/` are hand-written ("authored") toy molecules whose facts were cross-checked with RDKit.

## Gold authorities and standards (givers)

| use | authority | licence | where |
|---|---|---|---|
| SMILES structure gold (atoms in textual order, bonds as written, symmetrised SSSR, fragments, sanitized H and resolved bond types); InChI structure gold (InChI library via RDKit); InChIKey | RDKit 2026.03.6 | BSD-3-Clause | venv `/private/tmp/claude-501/venv` |
| SMILES lexeme gold | rxnfp `SMI_REGEX_PATTERN` (Molecular Transformer / Schwaller et al. 2019), loaded from the fetched file, gated by RDKit consequences | MIT | `raw/tokenizer/rxnfp_tokenization.py`, `rxnfp_LICENSE` |
| name <-> structure pairing gate | OPSIN 2.9.0 (jar from the `py2opsin` wheel), run with Homebrew OpenJDK 25 | MIT | `scripts/build_gold.py` |
| element table (received prior) | PubChem Periodic Table export of the IUPAC/NIST atomic data | public domain | `raw/pubchem-periodictable.json` |
| InChI layer prefixes, Hill-sorted formula, H never numbered | InChI Technical Manual (IUPAC-InChI/InChI) | MIT | `raw/inchi/InChI_TechMan.pdf` (+ `techman.txt`) |
| SMILES lexical facts, organic subset, normal valences | Daylight SMILES Theory Manual (Weininger 1988); OpenSMILES v1.0 | see below | facts only |
| SELFIES alphabet | selfies 2.2.0 `get_semantic_robust_alphabet()` | MIT | engine call |

**OpenSMILES licence note (honest record).** The OpenSMILES specification text is GFDL-1.2, which is not on this family's permitted-licence list. `opensmiles.asciidoc` was fetched once
(86 KB) to cross-check the grammar facts (organic subset, aromatic symbols, bracket grammar, bond symbols, normal valences), and then DELETED from disk. The prior stores facts only.
The Daylight manual was not fetched (copyright, not open); the same facts are the named giver in the prior.

## Not fetched / typed gaps
* WLN (Wiswesser): no open corpus; no open writer (Open Babel documents WLN as read-only, GPL; the Python wheel carries no WLN format).
* Paywalled standards (ISO/IEC, ASME, IEC 60617): none scraped or used.
* IUPAC Blue Book: not fetched; names are read through TRAIN-tallied element evidence only (no nomenclature grammar).

## Reproduce
`scripts/fetch.py ccd chebi chembl pubchem periodic` -> `scripts/build_corpus.py` -> `scripts/build_gold.py train dev test` ->
`eval/notation-competence/chem_smiles-data/build_static_priors.py` -> `…/build-system-prior.mjs` -> `node eval/notation-competence/chem_smiles.mjs dev`.
Copies of the scripts live in `/Users/mlacy/Documents/3.0/khora/native/eval/notation-competence/chem_smiles-data/`.
