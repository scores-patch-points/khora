// attackE.mjs -- WHAT CARRIES THE COVERAGE? Decompose formulaCov by frequency rank (an observable of the stream): recurring (>= 3) within-unit 4-grams made ONLY of the K most frequent types ("head skeleton")
// versus 4-grams with at least one (tail1) or at least two (tail2) types outside the top K ("content-bearing").  Same within-unit null, atlas seeds scheme with tag "E".
//   node attackE.mjs --shard i/n [--K 100] [--draws 20] [--ids a,b] [--out out/E]
import fs from "node:fs";
import path from "node:path";
import { HERE, loadCached, MATRIX, halves, nullView, seedOf, meanSd, f } from "./lib.mjs";
import { prep } from "../../laws/_para_prep.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const [si, sn] = opt("--shard", "0/1").split("/").map(Number), DRAWS = Number(opt("--draws", 20)), KS = opt("--K", "100").split(",").map(Number), OUT = path.join(HERE, opt("--out", "out/E")), onlyIds = opt("--ids", null)?.split(",");
fs.mkdirSync(OUT, { recursive: true });
const R = (x) => (Number.isFinite(x) ? Math.round(x * 1099511627776) / 1099511627776 : null);
/** returns {all, head, tail1, tail2} coverage shares for each K: {[K]: {head, tail1, tail2}} plus all */
function parts(view, Ks) {
  const P = prep(view), { nU, start, ids, cnt } = P, K4 = P.keys(4), count = new Map(); let denom = 0;
  for (let i = 0; i < K4.length; i++) if (K4[i] >= 0) count.set(K4[i], (count.get(K4[i]) || 0) + 1);
  const sorted = Int32Array.from(cnt).sort().reverse(), thr = Ks.map((k) => sorted[Math.min(k, sorted.length) - 1]);
  const covAll = { n: 0 }, cov = Ks.map(() => ({ head: 0, tail1: 0, tail2: 0 }));
  for (let u = 0; u < nU; u++) {
    if (start[u + 1] - start[u] < 4) continue;
    denom += start[u + 1] - start[u]; let rAll = start[u] - 1; const rH = Ks.map(() => start[u] - 1), r1 = Ks.map(() => start[u] - 1), r2 = Ks.map(() => start[u] - 1);
    for (let i = start[u]; i + 4 <= start[u + 1]; i++) {
      if (!(count.get(K4[i]) >= 3)) continue; const e = i + 3;
      covAll.n += e - Math.max(rAll, i - 1); rAll = e;
      for (let q = 0; q < Ks.length; q++) {
        let out = 0; for (let j = 0; j < 4; j++) if (cnt[ids[i + j]] < thr[q]) out++;
        if (out === 0) { cov[q].head += e - Math.max(rH[q], i - 1); rH[q] = e; }
        if (out >= 1) { cov[q].tail1 += e - Math.max(r1[q], i - 1); r1[q] = e; }
        if (out >= 2) { cov[q].tail2 += e - Math.max(r2[q], i - 1); r2[q] = e; }
      }
    }
  }
  if (denom < 1000) return null;
  const o = { all: R(covAll.n / denom) }; Ks.forEach((k, q) => { o[`head${k}`] = R(cov[q].head / denom); o[`tail1_${k}`] = R(cov[q].tail1 / denom); o[`tail2_${k}`] = R(cov[q].tail2 / denom); }); return o;
}
const keys = (Ks) => ["all", ...Ks.flatMap((k) => [`head${k}`, `tail1_${k}`, `tail2_${k}`])];
const ids = MATRIX().pockets.filter((p) => p.kind === "real").map((p) => p.id).filter((id) => !onlyIds || onlyIds.includes(id));
ids.forEach((id, k) => {
  if (k % sn !== si) return; const file = path.join(OUT, `${id}.json`); if (fs.existsSync(file)) return;
  const p = loadCached(id), H = halves(p), res = { id, Ks: KS, halves: {} };
  for (const w of ["discover", "confirm"]) {
    const obs = parts(H[w], KS); if (!obs) { res.halves[w] = null; continue; }
    const draws = []; for (let d = 0; d < DRAWS; d++) { const o = parts(nullView(H[w], "within-unit", seedOf(id, w, "E", "within-unit", d)), KS); if (o) draws.push(o); }
    const cellOf = {}; for (const key of keys(KS)) { const xs = draws.map((o) => o[key]), { m, sd } = meanSd(xs), ge = xs.filter((x) => x >= obs[key]).length; cellOf[key] = { v: obs[key], nullMean: m, nullSd: sd, z: sd > 0 ? (obs[key] - m) / sd : null, p: (1 + ge) / (1 + xs.length) }; }
    res.halves[w] = cellOf;
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} ${res.halves.discover ? keys(KS).map((key) => `${key}:${f(res.halves.discover[key].v, 4)}(z ${f(res.halves.discover[key].z, 0)})`).join(" ") : "thin"}`);
});
