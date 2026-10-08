// build-grc-lemma.mjs — a RECEIVED Greek noun-LEMMA table, from UD_Ancient_Greek-PROIEL.
// key = the inflected form (accent-stripped, lowercase); value = its lemma (same norm).
// Covers the declension the test split documents — including athematic stems
// (Μωϋσέως → Μωϋσῆς, Διός → Ζεύς, Ἀθηναίῃ → Ἀθήνη). A candidate prior (builder +
// source), disclosed: the treebank is Herodotus + Septuagint, NOT Homer, so
// Homeric-only names are absent — those fall back to the ending-strip in layer0.
import fs from "node:fs";
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const F = "/Users/mlacy/Documents/3.0/eoreader7-screenshot-pipeline/native/eval/fixtures/ud-greek-proiel/grc_proiel-ud-test.conllu";
const NOM = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM"]);
const map = new Map();
for (const line of fs.readFileSync(F, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const c = line.split("\t");
  if (c.length < 10 || !/^[0-9]+$/.test(c[0])) continue;
  if (!NOM.has(c[3])) continue;
  const k = norm(c[1]), v = norm(c[2] || c[1]);
  if (k && v) map.set(k, v);
}
const obj = {};
for (const [k, v] of map) obj[k] = v;
const out = { schema: "GreekNounLemma@1", giver: "UD_Ancient_Greek-PROIEL (test split, human-annotated)", source: "grc_proiel-ud-test.conllu", built: "build-grc-lemma.mjs", standing: "candidate — extracted from a received treebank; disclosed as the split we hold (Herodotus+Septuagint)", lemmas: obj };
fs.mkdirSync("/Users/mlacy/Documents/3.0/janus/priors/lemma", { recursive: true });
fs.writeFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", JSON.stringify(out));
console.log(`grc-lemma.json: ${Object.keys(obj).length} form→lemma pairs → janus/priors/lemma/`);
for (const k of ["διος", "διο", "αθηναιη", "αθηναια", "μωυσεως", "κεφαλης", "γυναικος"]) if (obj[k]) console.log(`  ${k} → ${obj[k]}`);