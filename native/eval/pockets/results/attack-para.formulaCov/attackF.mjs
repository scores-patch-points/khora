// attackF.mjs -- the 149 real pockets that are NOT PRESENT in the atlas (148 z undefined, 1 ambiguous): 200 within-unit draws per half instead of 10, seeds tag "F".
//   node attackF.mjs --shard i/n [--draws 200] [--out out/F]
// Records per half: v, nullMean, nullSd, max of the null draws, number of draws >= v (exact tail p = (1 + ge)/(1 + draws)).
import fs from "node:fs";
import path from "node:path";
import { HERE, loadCached, MATRIX, halves, nullView, seedOf, fcov, meanSd, f } from "./lib.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [si, sn] = opt("--shard", "0/1").split("/").map(Number), DRAWS = Number(opt("--draws", 200)), OUT = path.join(HERE, opt("--out", "out/F")); fs.mkdirSync(OUT, { recursive: true });
const sidx = MATRIX().statistics.indexOf("para.formulaCov");
const ids = MATRIX().pockets.filter((p) => p.kind === "real" && p.cells[sidx][4] !== "P+").map((p) => p.id);
ids.forEach((id, k) => {
  if (k % sn !== si) return; const file = path.join(OUT, `${id}.json`); if (fs.existsSync(file)) return;
  const p = loadCached(id), H = halves(p), res = { id, draws: DRAWS, halves: {} };
  for (const w of ["discover", "confirm"]) {
    const v = fcov(H[w]), xs = []; for (let d = 0; d < DRAWS; d++) { const x = fcov(nullView(H[w], "within-unit", seedOf(id, w, "F", "within-unit", d))); if (Number.isFinite(x)) xs.push(x); }
    if (v == null || xs.length < 3) { res.halves[w] = { v, n: xs.length }; continue; }
    const { m, sd } = meanSd(xs), ge = xs.filter((x) => x >= v).length;
    res.halves[w] = { v, nullMean: m, nullSd: sd, nullMax: Math.max(...xs), ge, p: (1 + ge) / (1 + xs.length), z: sd > 0 ? (v - m) / sd : null, n: xs.length };
  }
  fs.writeFileSync(file, JSON.stringify(res)); console.error(`${id} D v=${f(res.halves.discover.v, 4)} p=${f(res.halves.discover.p, 4)} C v=${f(res.halves.confirm.v, 4)} p=${f(res.halves.confirm.p, 4)}`);
});
