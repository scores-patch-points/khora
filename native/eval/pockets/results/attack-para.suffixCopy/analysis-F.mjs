// analysis-F.mjs -- the REVERSAL leg: the four pockets where the atlas calls suffixCopy PRESENT with NEGATIVE sign (cd-mscx, cd-musicxml, fm-law-ro, ml-lat-summa), re-run with 200 draws, atlas null and within-doc null,
// with an exact Poisson LOWER tail on the hit count (the law is "below null"): is the sign robust?
import fs from "node:fs";
import path from "node:path";
import { halves, cells, prepView, loadCached, HERE } from "./lib.mjs";
import { logPoisUpper, lgamma } from "./stats.mjs";
import { atlasRows, writeJson, readJson } from "./common.mjs";
const A = atlasRows(), neg = Object.values(A).filter((r) => r.status === "P-").map((r) => r.id);
// P(X <= k | lam) = 1 - P(X >= k+1)
const lowerTail = (k, lam) => { if (k >= lam) return 1; let s = 0; for (let i = 0; i <= k; i++) s += Math.exp(-lam + i * Math.log(lam) - lgamma(i + 1)); return Math.min(1, s); };
const res = {};
for (const id of neg) {
  const p = loadCached(id), H = halves(p); res[id] = { atlas: { zD: A[id].zD, zC: A[id].zC, vD: A[id].vD, vC: A[id].vC } };
  for (const kind of ["unit-order", "within-doc"]) {
    const row = {};
    for (const which of ["discover", "confirm"]) {
      const c = cells(prepView(H[which]), { id, which, nullKind: kind, draws: 200, keys: ["suffixCopy"] }), m = c._meta, lam = m.nullS2Mean;
      row[which] = { z: c.suffixCopy.z, v: c.suffixCopy.v, nullMean: c.suffixCopy.nullMean, hits: m.S2, expectedHits: +lam.toFixed(1), np: m.np, poissonLowerTailP: lowerTail(m.S2, lam) };
    }
    res[id][kind] = row;
  }
  console.log(id, JSON.stringify({ atlasZ: [A[id].zD, A[id].zC].map((x) => +x.toFixed(2)), "unit-order(200)": ["discover", "confirm"].map((w) => { const x = res[id]["unit-order"][w]; return `${x.hits} vs ${x.expectedHits} z ${x.z?.toFixed(1)} pLow ${x.poissonLowerTailP.toExponential(1)}`; }), "within-doc(200)": ["discover", "confirm"].map((w) => { const x = res[id]["within-doc"][w]; return `${x.hits} vs ${x.expectedHits} z ${x.z?.toFixed(1)} pLow ${x.poissonLowerTailP.toExponential(1)}`; }) }));
}
writeJson("out/analysis-F.json", res);
