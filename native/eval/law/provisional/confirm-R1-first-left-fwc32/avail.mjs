// avail.mjs: DATA AVAILABILITY scan (not a test; reports NO AUC, no probe, no score). Stream descriptors (tokens, FWC32, ...) and the number of FIRST matched pairs the name-company matcher yields,
// so that eligibility (>= 60 pairs) and the scope side of each fresh data set are known BEFORE the pre-registered run.   NAME_COMPANY_PAIRBLOCK=1 node avail.mjs OUT.json [windows|extra|both]
import fs from "node:fs";
import path from "node:path";
import { HERE, FIX, readConllu, describe, docFrom, pairsOf, rngFor, seedFor, round } from "./lib.mjs";
export const EXTRA = [["en_pud", `${FIX}/ud-english-pud/en_pud-ud-test.conllu`, "eng"], ["grc_proiel", `${FIX}/ud-greek-proiel/grc_proiel-ud-test.conllu`, "grc"], ["la_perseus_test", `${FIX}/ud-latin-perseus/la_perseus-ud-test.conllu`, "lat"],
  ["la_perseus_train", `${FIX}/ud-latin-perseus/la_perseus-ud-train.conllu`, "lat"], ["sa_ufal", `${FIX}/ud-sanskrit-ufal/sa_ufal-ud-test.conllu`, "san"], ["sa_vedic", `${FIX}/ud-sanskrit-vedic/sa_vedic-ud-test.conllu`, "san"]];
if (process.argv[1]?.endsWith("avail.mjs")) {
  const [out, which = "both"] = process.argv.slice(2), R = { note: "availability only; no outcome", rows: [] };
  const items = [];
  if (which !== "extra") for (const f of fs.readdirSync(path.join(HERE, "windows")).filter((x) => x.endsWith(".json")).sort()) { const w = JSON.parse(fs.readFileSync(path.join(HERE, "windows", f), "utf8")); items.push({ name: w.stem, kind: "train-window", sents: w.sents, upos: w.upos, taken: w.taken, trainSentences: w.trainSentences }); }
  if (which !== "windows") for (const [name, file, lang] of EXTRA) { const { sents, upos } = readConllu(file); items.push({ name, kind: "extra-treebank", lang, sents, upos }); }
  for (const it of items) {
    const d = describe(it.sents), doc = docFrom(it.name, it.sents, it.upos), pr = pairsOf(doc, "FIRST", rngFor(seedFor("confirm-R1", "avail", it.name)));
    const nP = it.upos.reduce((t, u) => t + u.filter((x) => x === "PROPN").length, 0), nO = it.upos.reduce((t, u) => t + u.filter((x) => ["NOUN", "VERB", "ADJ"].includes(x)).length, 0);
    const row = { name: it.name, kind: it.kind, lang: it.lang, sentences: d.sentences, tokens: d.tokens, fwc32: round(d.fwc32), propnTokens: nP, openTokens: nO, firstPairs: pr.pairs, dropped: pr.dropped };
    R.rows.push(row); console.error(JSON.stringify(row));
  }
  fs.writeFileSync(out, JSON.stringify(R, null, 1));
}
