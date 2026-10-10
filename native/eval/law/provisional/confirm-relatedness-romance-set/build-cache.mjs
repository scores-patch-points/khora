// confirm-relatedness-romance-set/build-cache.mjs — DATA PREPARATION ONLY: builds the train windows (sets A, B), their matched-pair rows (name-company pairsOf, PAIRBLOCK) for the
// FIRST and LATER strata, real and within-sentence-shuffled, and writes compact caches. No probe is fitted and no AUC is computed here (counts only).
//   NAME_COMPANY_PAIRBLOCK=1 node build-cache.mjs <stem,stem,...|roster|cross> | node build-cache.mjs --verify ita
// --verify: rebuilds the scoper's ita DEV FIRST rows with this file's doc builder and checks they are identical to the scoper's cache (pipeline equivalence; no AUC).
import fs from "node:fs";
import path from "node:path";
import { HERE, SETS, CROSS, trainFile, windowsOf, docOf, writeCache, pairsOf, rngFor, seedFor, UDE, round } from "./lib-fresh.mjs";
import { readConllu, packRow, cacheFile } from "../family-vs-relatedness/lib.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";

const arg = process.argv[2];
if (arg === "--verify") {
  const stem = process.argv[3] || "ita", { sents, upos } = readConllu(path.join(UDE, stem, "dev.conllu")), doc = docOf(stem, sents, upos), r = rngFor(seedFor("fam-vs-rel", stem, "dev", "real"));
  pairsOf(doc, "LATER", r); const fr = pairsOf(doc, "FIRST", r), mine = fr.rows.map(packRow), theirs = JSON.parse(fs.readFileSync(cacheFile("dev", stem, "FIRST"), "utf8")).rows;
  const same = mine.length === theirs.length && mine.every((a, i) => a.every((v, k) => v === theirs[i][k]));
  console.log(JSON.stringify({ verify: stem, pairsMine: fr.pairs, pairsTheirs: theirs.length / 2, identical: same }));
  process.exit(same ? 0 : 1);
}
const stems = arg === "roster" ? STEMS : arg === "cross" ? Object.keys(CROSS) : (arg || "").split(",").filter(Boolean);
if (!stems.length) throw new Error("usage: build-cache.mjs <roster|cross|stem,stem,...> | --verify <stem>");
fs.mkdirSync(path.join(HERE, "cache", "meta"), { recursive: true });
for (const stem of stems) {
  const t0 = Date.now(), cross = CROSS[stem], file = cross ? cross.file : trainFile(stem), banStem = cross ? cross.lang : stem;
  if (!fs.existsSync(file)) { console.error(`${stem}: no train file ${file}`); continue; }
  const W = windowsOf(stem, file, banStem), meta = {};
  for (const set of SETS) {
    const w = W[set]; if (!w) { meta[set] = null; console.error(`${stem} set ${set}: no disjoint window`); continue; }
    meta[set] = w.meta; const counts = {};
    for (const shuf of [false, true]) {
      const doc = docOf(stem, w.sents, w.upos, shuf), r = rngFor(seedFor("conf-rel", "pairs", set, stem, shuf ? "shuf" : "real"));
      for (const st of ["LATER", "FIRST"]) { const pr = pairsOf(doc, st, r); writeCache(set, stem, st, shuf, pr); counts[`${st}${shuf ? "s" : ""}`] = pr.pairs; }
    }
    meta[set].pairs = counts;
    console.error(`${stem} ${set}: ${w.meta.tokens} tok ${w.meta.sentences} sent range ${w.meta.sentenceRange} dupRemoved ${w.meta.removedDupOfDevTest} pairs ${JSON.stringify(counts)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  fs.writeFileSync(path.join(HERE, "cache", "meta", `${stem}.json`), JSON.stringify(meta));
}
