// design-counts2.mjs -- DESIGN-TIME COUNTS ONLY: sizes of strict-ladder pair sets (exact c; exact fbin; len and message-length tolerances) and of v3 pairs on the fresh days. No score computed.
import fs from "node:fs";
import path from "node:path";
import { RES } from "./lib-atk.mjs";
import { loadIrcDay, indexAndCandidates, pairsStrict, IRC_ROOT } from "./lib-strict.mjs";
import { pairsForCellV3 } from "../ablation-scope/lib-pairs.mjs";
const D = JSON.parse(fs.readFileSync(path.join(RES, "days-attack.json"), "utf8")), M = 256;
const variants = { "exactC+FB,len<=1(x),dm.5": { exactLen: false, dmMax: 0.5 }, "exactC+FB+LEN,dm.7": { exactLen: true, dmMax: 0.7 }, "exactC only,dm.5,len free,fb free": { exactLen: false, exactFb: false, dmMax: 0.5 } };
for (const [vn, opt] of Object.entries(variants)) {
  const t = { conf: 0, fresh: 0 };
  for (const [tag, names] of [["conf", D.confEn], ["fresh", D.freshEn]]) for (const n of names) { const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M);
    for (const st of ["c2", "c3", "c4_6"]) t[tag] += pairsStrict(cand, doc, { stratum: st, ...opt }).length; }
  console.log(vn, JSON.stringify(t));
}
let v3 = 0, P = 0; for (const n of D.freshEn) { const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M);
  for (const st of ["c2", "c3", "c4_6"]) { const r = pairsForCellV3(cand, doc, M, { grp: "A", stratum: st, n: 150, seedTag: "atk-fresh" }); v3 += r.pairs.length; P += r.nPos; } }
console.log("fresh en v3 pairs", v3, "positives", P);
