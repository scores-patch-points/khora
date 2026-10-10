// attackA.mjs -- SIZE, UNIT-LENGTH AND TOKENISATION attack on para.formulaCov.
//   node attackA.mjs --shard i/n [--variants a,b] [--ids id1,id2] [--draws 20] [--out out/A]
// For every real pocket (cached loaded pockets) and every variant that applies, recompute formulaCov on both document halves with `draws` within-unit shuffles (seed tag "A:<variant>").
// Per cell: v, nullMean, nullSd, z from the first 10 draws (atlas style), z/p from all draws, tokens, units, mean unit length.  No Math.random, no Date.
import fs from "node:fs";
import path from "node:path";
import { HERE, loadCached, MATRIX, halves, cell, tokensOf, f } from "./lib.mjs";
import { VARIANTS } from "./variants.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [si, sn] = opt("--shard", "0/1").split("/").map(Number), DRAWS = Number(opt("--draws", 20)), OUT = path.join(HERE, opt("--out", "out/A"));
const only = opt("--variants", null)?.split(","), onlyIds = opt("--ids", null)?.split(",");
fs.mkdirSync(OUT, { recursive: true });
const ids = MATRIX().pockets.filter((p) => p.kind === "real").map((p) => p.id).filter((id) => !onlyIds || onlyIds.includes(id));
const names = Object.keys(VARIANTS).filter((n) => !only || only.includes(n));
ids.forEach((id, k) => {
  if (k % sn !== si) return;
  const file = path.join(OUT, `${id}.json`); let res = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { id, variants: {} };
  const p = loadCached(id), tok = tokensOf(p.units);
  for (const name of names) {
    if (res.variants[name]) continue;
    const V = VARIANTS[name]; if (tok < V.minTokens) { res.variants[name] = { skipped: `tokens ${tok} < ${V.minTokens}` }; continue; }
    const q = V.make(p), docs = new Set(q.docOf).size, qt = tokensOf(q.units);
    if (docs < 10 || qt < 10000) { res.variants[name] = { skipped: `variant too thin (${qt} tokens, ${docs} docs)` }; continue; }
    const H = halves(q), o = { tokens: qt, units: q.units.length, docs, meanUnitLength: qt / q.units.length };
    for (const w of ["discover", "confirm"]) {
      const c = cell(H[w], id, w, DRAWS, `A:${name}`);
      // atlas-style z from the first 10 draws only
      const c10 = cell(H[w], id, w, 10, `A:${name}`);
      o[w] = { v: c.v, nullMean: c.nullMean, nullSd: c.nullSd, z: c.z, p: c.p, z10: c10.z, nullMean10: c10.nullMean, nullSd10: c10.nullSd, tokens: tokensOf(H[w].units), units: H[w].units.length };
    }
    res.variants[name] = o;
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} ${names.map((n) => (res.variants[n].skipped ? "-" : `${n}:${f(res.variants[n].discover?.v, 3)}`)).join(" ")}`);
});
