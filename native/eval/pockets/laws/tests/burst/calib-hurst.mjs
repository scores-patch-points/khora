// Calibration of the unit-order z on worlds whose units are exchangeable by construction (pl-null, pl-null2, pl-markov, pl-length):
// 8 disjoint 12-doc slices (~12k tokens) per world; for each statistic with null kind unit-order, observed vs 12 null draws -> z; also observed percentile among 150 draws for hurst.
import fs from "node:fs";
import { nullView, seedOf, tokenCount } from "../../../lib/pocket.mjs";
import { load } from "../../../loaders/planted.mjs";
import { compute, STATS } from "../../burst.mjs";
const out = [], DOCS = Number(process.env.DOCS || 25), NS = Number(process.env.NS || 4);
for (const id of process.argv.slice(2)) {
  const [p] = await load([id]);
  for (let s = 0; s < NS; s++) {
    const idx = []; p.docOf.forEach((d, k) => { if (d >= s * DOCS && d < (s + 1) * DOCS) idx.push(k); });
    const view = { id, which: "S" + s, units: idx.map((k) => p.units[k]), docOf: idx.map((k) => p.docOf[k]) };
    const obs = compute(view), rec = { id, slice: s, tokens: tokenCount(view.units), z: {}, pct: {} };
    for (const kind of ["unit-order", "token-global"]) {
      const dr = []; for (let k = 0; k < 40; k++) dr.push(compute(nullView(view, kind, seedOf("calib", id, s, kind, k))));
      for (const st of STATS.filter((t) => t.null === kind)) {
        const xs = dr.map((d) => d[st.id]).filter(Number.isFinite), m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
        // z with only the first 10 draws, as the atlas does
        const x10 = xs.slice(0, 10), m10 = x10.reduce((a, b) => a + b, 0) / 10, sd10 = Math.sqrt(x10.reduce((a, b) => a + (b - m10) ** 2, 0) / 9);
        rec.z[st.id] = sd10 > 0 ? +((obs[st.id] - m10) / sd10).toFixed(2) : null;
        rec.pct[st.id] = +(xs.filter((x) => x < obs[st.id]).length / xs.length).toFixed(3);
      }
    }
    out.push(rec); fs.writeFileSync(process.env.OUT || "calib-hurst.json", JSON.stringify(out, null, 1));
    console.error(id, s, "done");
  }
}
