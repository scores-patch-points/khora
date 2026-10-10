// eval/law/provisional/confirm-relatedness-sister-dyads/prep.mjs — DATA PREPARATION ONLY (fresh windows -> matched-pair rows -> compact cache). No probe is fitted and no AUC is computed here;
// it prints only window sizes and pair counts (disclosed in confirm.mjs). Usage (env required):
//   NAME_COMPANY_PAIRBLOCK=1 node prep.mjs [stem,stem,...|all] [--shuffled]
import fs from "node:fs";
import path from "node:path";
import { freshDoc, pairsOf, packRow, cacheFile, rngFor, seedFor, HERE, TB, EXT } from "./fresh.mjs";

const MINFIRST = 150;
const which = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "all", shuffled = process.argv.includes("--shuffled");
const all = { ...TB, ...Object.fromEntries(Object.entries(EXT).map(([k, v]) => [k, v[0]])) };
const stems = which === "all" ? Object.keys(all) : which.split(",");
fs.mkdirSync(path.join(HERE, "data", "cache"), { recursive: true });
const metaFile = path.join(HERE, "data", `meta${shuffled ? "-shuf" : ""}.json`), meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
for (const stem of stems) {
  // WINDOW RULE (count-based, fixed before any AUC): attempt 0 is the seeded window; if it yields < MINFIRST FIRST pairs and the treebank is larger than one window, the next seeded window is tried (<= 5 attempts)
  // and the first that reaches MINFIRST is kept (else the one with the most FIRST pairs). The shuffled stream reuses the attempt chosen on the real stream.
  const t0 = Date.now(); let best = null;
  const realMeta = shuffled ? JSON.parse(fs.readFileSync(path.join(HERE, "data", "meta.json"), "utf8")) : null, attempts = shuffled ? [realMeta[stem]?.attempt ?? 0] : [0, 1, 2, 3, 4];
  for (const at of attempts) {
    const fd = freshDoc(stem, all[stem], shuffled, at); if (!fd) { console.error(`${stem}: no train file`); break; }
    const r = rngFor(seedFor("conf-rel-sister", stem, "pairs")), out = { fd, rows: {} };
    for (const st of ["LATER", "FIRST"]) out.rows[st] = pairsOf(fd.doc, st, r);
    if (!best || out.rows.FIRST.pairs > best.rows.FIRST.pairs) best = out;
    if (shuffled || out.rows.FIRST.pairs >= MINFIRST || fd.meta.wholeFile) break;
  }
  if (!best) continue;
  const fd = best.fd; meta[stem] = { ...fd.meta };
  for (const st of ["LATER", "FIRST"]) {
    const pr = best.rows[st];
    fs.writeFileSync(cacheFile(stem, st, shuffled ? ".shuf" : ""), JSON.stringify({ stem, stratum: st, shuffled, pairs: pr.pairs, dropped: pr.dropped, rows: pr.rows.map(packRow) }));
    meta[stem][st] = pr.pairs;
  }
  console.error(`${stem}${shuffled ? " (shuf)" : ""} ${all[stem]}: ${fd.meta.sentences} sents ${fd.meta.units} units (removed eval ${fd.meta.removedAsEvalText} dup ${fd.meta.removedAsDuplicate}); FIRST ${meta[stem].FIRST} LATER ${meta[stem].LATER} pairs, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 1));
}
