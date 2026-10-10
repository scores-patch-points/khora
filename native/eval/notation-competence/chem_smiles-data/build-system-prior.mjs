// build-system-prior.mjs — the R0 SYSTEM PRIOR of the chem_smiles family, built from TRAIN only.
//
//   priors/notation-chem_smiles-system.json
//     lm  : two character-bigram language models over [a-z ] — one on TRAIN IUPAC names, one on TRAIN English
//           (ChEBI definitions). Their per-character log-ratio is the feature `name_llr`.
//     nb  : naive-Bayes tables  P(feature value | system)  tallied on TRAIN, Laplace alpha = 1 (declared),
//           uniform class prior (declared: no base rate of "which notation arrives" is known),
//           abstention floor 0.5 (declared: below it the reader answers "ambiguous", it does not guess).
//
// The features are the ADAPTER'S OWN (adapters/notation/chem_smiles.js::featuresOf), so the prior is fitted on exactly what the
// reader later computes. Priors NOMINATE (READING-POLICY 3): the adapter only names a system when the posterior clears the floor.
//
// TRAIN items per class (all from corpus/train.json = ChEBI r255 + ChEMBL; nothing from dev/test):
//   smiles      the written SMILES of every TRAIN record
//   inchi       every TRAIN InChI; every OTHER one has its "InChI=1S/" header stripped (declared augmentation, so the class is not
//               carried by a self-announcing header alone)
//   iupac_name  ChEBI 'IUPAC NAME' strings
//   english     ChEBI definitions (HTML stripped)
//   formula     registry molecular-formula strings
//   selfies     ENGINE-DERIVED (selfies 2.2.0 encoder) over TRAIN SMILES
//
// Run: node build-system-prior.mjs        (requires the static priors to exist: elements + grammar)
import fs from "node:fs";
import path from "node:path";
import { loadPriors, featuresOf, FEATURE_NAMES, SYSTEMS, PRIOR_DIR } from "../../../adapters/notation/chem_smiles.js";

const ROOT = "/private/tmp/claude-501/notation/chem_smiles";
const corpus = JSON.parse(fs.readFileSync(path.join(ROOT, "corpus", "train.json"), "utf8"));
const ALPHA = 1, FLOOR = 1e-3, ABSTAIN = 0.5;

const priors = loadPriors();
if (!priors.elements || !priors.grammar) throw new Error("build the static priors first (build_static_priors.py)");

// ── character-bigram LMs over [a-z ] with '^' start ──
const ALPHABET = ["^", " ", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i))];
const index = Object.fromEntries(ALPHABET.map((c, i) => [c, i]));
function buildLm(texts) {
  const N = ALPHABET.length;
  const cnt = Array.from({ length: N }, () => new Float64Array(N));
  for (const t of texts) {
    const low = t.toLowerCase().replace(/[^a-z]+/g, " ").trim();
    let prev = index["^"];
    for (const ch of low) { const j = index[ch]; cnt[prev][j] += 1; prev = j; }
  }
  const logp = cnt.map((row) => { const tot = row.reduce((a, b) => a + b, 0) + ALPHA * N; return Array.from(row, (c) => +Math.log((c + ALPHA) / tot).toFixed(5)); });
  return { alphabet: ALPHABET, index, logp };
}
const names = corpus.names.map((x) => x.text);
const english = corpus.english;
const lm = { names: buildLm(names), english: buildLm(english) };

// ── TRAIN items per class ──
const items = {
  smiles: corpus.records.map((r) => r.smiles),
  inchi: corpus.records.map((r, i) => (i % 2 ? r.inchi.replace(/^InChI=1S?\//, "") : r.inchi)),
  iupac_name: names,
  english,
  formula: corpus.formula.map((x) => x.text),
  selfies: corpus.selfies.map((x) => x.text),
};

const withLm = { ...priors, system: { lm } };
const counts = {}; // feature -> class -> value -> n
const nClass = {};
for (const c of SYSTEMS) {
  nClass[c] = items[c].length;
  for (const text of items[c]) {
    const F = featuresOf(text, { priors: withLm, complete: true });
    for (const f of FEATURE_NAMES) {
      const v = F[f];
      if (v === undefined) continue;
      ((counts[f] ??= {})[c] ??= {})[String(v)] = (((counts[f] ??= {})[c] ??= {})[String(v)] ?? 0) + 1;
    }
  }
}
const tables = {};
for (const f of FEATURE_NAMES) {
  if (!counts[f]) continue;
  const domain = new Set();
  for (const c of SYSTEMS) for (const v of Object.keys(counts[f][c] ?? {})) domain.add(v);
  tables[f] = {};
  for (const c of SYSTEMS) {
    const tot = Object.values(counts[f][c] ?? {}).reduce((a, b) => a + b, 0) + ALPHA * domain.size;
    tables[f][c] = Object.fromEntries([...domain].map((v) => [v, +(((counts[f][c]?.[v] ?? 0) + ALPHA) / tot).toFixed(6)]));
  }
}
const out = {
  kind: "ChemSystemPrior@1", family: "chem_smiles",
  givers: [{ name: "TRAIN corpus tallies (ChEBI r255 CC BY 4.0 + ChEMBL CC BY-SA 3.0); SELFIES items engine-derived (selfies 2.2.0, MIT); English = ChEBI definitions", note: "split by SOURCE; dev (wwPDB CCD) and test (PubChem) are never read here" }],
  classes: SYSTEMS,
  declared: { laplace_alpha: ALPHA, class_prior: "uniform", unseen_value_floor: FLOOR, abstain_below: ABSTAIN },
  train_items: nClass,
  lm,
  nb: { class_prior: Object.fromEntries(SYSTEMS.map((c) => [c, 1 / SYSTEMS.length])), floor: FLOOR, abstain_below: ABSTAIN, tables },
  refuses: "WLN, SELFIES-like and any system outside `classes` are never nominated; a posterior below abstain_below is 'ambiguous', not a guess",
};
fs.writeFileSync(path.join(PRIOR_DIR, "notation-chem_smiles-system.json"), JSON.stringify(out));
console.log("wrote system prior", nClass);
