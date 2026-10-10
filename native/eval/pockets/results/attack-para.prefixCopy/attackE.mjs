// attackE.mjs -- ATTACK E (null world): the atlas null shuffles units over the WHOLE half (destroying document-level topic as well as adjacency). Here the same statistics are compared with a WITHIN-DOCUMENT
// unit-order shuffle (units re-dealt only among the positions of their own document; documents are the loaders' chapters / files / 100-unit or 25-unit blocks) and, for like-for-like, with the atlas null
// at the same number of draws.  Statistics: prefixCopy (the law), firstTokCopy (1-token prefix), prefixNoDup (exact-duplicate pairs removed from the numerator), posPar, posParTail (offsets 2..7).
// Output out/E/<id>.json: per half, {global:{key:{v,nullMean,nullSd,z}}, within:{...}, meta}.     node attackE.mjs --pockets ids.txt|id1,id2 [--out out/E] [--draws 50]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, loadCached, MATRIX, HERE, optOf } from "./lib.mjs";
const opt = optOf(process.argv.slice(2));
const OUT = path.resolve(HERE, opt("--out", "out/E")), DRAWS = Number(opt("--draws", 50));
const want = opt("--pockets", "defined385.txt"), WANT = fs.existsSync(path.resolve(HERE, want)) ? fs.readFileSync(path.resolve(HERE, want), "utf8").split("\n").filter(Boolean) : want.split(",");
fs.mkdirSync(OUT, { recursive: true });
const M = MATRIX(), IDX = M.statistics.indexOf("para.prefixCopy"), meta = new Map(M.pockets.map((p) => [p.id, p]));
const KEYS = ["prefixCopy", "firstTokCopy", "prefixNoDup", "posPar", "posParTail"];
for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const r = meta.get(id), p = loadCached(id), H = halves(p), res = { id, group: r.group, register: r.register, grain: r.grain, tokens: r.tokens, units: r.units, docs: r.docs, meanUnitLength: r.meanUnitLength, atlasStatus: r.cells[IDX][4], halves: {} };
  for (const which of ["discover", "confirm"]) {
    const g = cells(H[which], { keys: KEYS, nullKind: "unit-order", draws: DRAWS }), w = cells(H[which], { keys: KEYS, nullKind: "within-doc", draws: DRAWS, tag: "E" });
    const docs = new Set(H[which].docOf).size;
    res.halves[which] = { global: Object.fromEntries(KEYS.map((k) => [k, g[k]])), within: Object.fromEntries(KEYS.map((k) => [k, w[k]])), meta: { ...g._meta, docs } };
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} done`);
}
