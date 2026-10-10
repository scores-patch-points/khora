// eval/law/provisional/family-vs-relatedness/cache.mjs — builds matched-pair rows (name-company pairsOf, PAIRBLOCK) for a split and writes a compact cache. DATA PREPARATION ONLY:
// no probe is fitted and no AUC is computed here. Usage (env required):
//   NAME_COMPANY_PAIRBLOCK=1 node cache.mjs <dev|test> <stem,stem,...|all> [--shuffled]
// The split argument is explicit; the test split is built only by the confirmation step after the rules are frozen.
import fs from "node:fs";
import path from "node:path";
import { udDocSplit, pairsOf, packRow, cacheFile, rngFor, seedFor, HERE } from "./lib.mjs";
import { STEMS } from "./groups.mjs";

const [split, which] = [process.argv[2], process.argv[3]];
const shuffled = process.argv.includes("--shuffled");
if (!["dev", "test"].includes(split)) throw new Error("split must be dev or test");
const stems = !which || which === "all" ? STEMS : which.split(",");
fs.mkdirSync(path.join(HERE, "cache", split), { recursive: true });
const summary = {};
for (const stem of stems) {
  const t0 = Date.now();
  const doc = udDocSplit(stem, split, shuffled); if (!doc) { console.error(`${stem}: no ${split}`); continue; }
  const r = rngFor(seedFor("fam-vs-rel", stem, split, shuffled ? "shuf" : "real"));
  summary[stem] = {};
  for (const st of ["LATER", "FIRST"]) {
    const pr = pairsOf(doc, st, r);
    fs.writeFileSync(cacheFile(split, stem, st, shuffled ? ".shuf" : ""), JSON.stringify({ stem, split, stratum: st, shuffled, pairs: pr.pairs, dropped: pr.dropped, rows: pr.rows.map(packRow) }));
    summary[stem][st] = pr.pairs;
  }
  console.error(`${split} ${stem}${shuffled ? " (shuffled)" : ""}: LATER ${summary[stem].LATER} FIRST ${summary[stem].FIRST} pairs, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
fs.writeFileSync(path.join(HERE, "cache", `${split}${shuffled ? "-shuf" : ""}-counts.json`), JSON.stringify(summary));
