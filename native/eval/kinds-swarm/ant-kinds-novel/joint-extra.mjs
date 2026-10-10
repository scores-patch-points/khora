// joint-extra.mjs — EXPLORATORY (post-hoc, labelled so): per-kind nulls for the joint ablation and a magnitude statistic. Reads results/joint-<novel>.json.
import fs from "node:fs";
import path from "node:path";
import { OUT, round, mean, quantile } from "./lib.mjs";
const NOVEL = process.argv[2] ?? "wp", R = JSON.parse(fs.readFileSync(path.join(OUT, `joint-${NOVEL}.json`), "utf8")), K = R.K, Ws = R.windows;
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const sumV = (l) => l.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(l[0].length).fill(0));
const sh = (v) => { const t = v.reduce((a, b) => a + b, 0); return t > 0 ? v.map((x) => x / t) : null; };
const out = { perKind: [] };
for (let c = 0; c < K; c++) {
  const obs = Ws.map((w) => w.kinds[c]?.obs).filter(Boolean); if (!obs.length) continue;
  const nd = Ws[0].kinds[c]?.rand.length ?? 0, draws = [];
  for (let d = 0; d < nd; d++) { const r = Ws.map((w) => w.kinds[c]?.rand[d]).filter(Boolean); draws.push(sumV(r.map((x) => x.all))); }
  const so = sh(sumV(obs.map((x) => x.all)));
  const loo = draws.map((_, i) => cos(sh(draws[i]), sh(sumV(draws.filter((__, j) => j !== i)))));
  const mo = cos(so, sh(sumV(draws)));
  const nTok = obs.reduce((a, x) => a + x.tokens, 0), chPerTok = obs.reduce((a, x) => a + x.changed, 0) / nTok;
  const rch = Ws.flatMap((w) => w.kinds[c]?.rand ?? []); const rTok = rch.reduce((a, x) => a + x.tokens, 0);
  out.perKind.push({ c, tokens: nTok, cosObsVsRandMean: round(mo), randLooMin: round(Math.min(...loo)), randLooMedian: round(quantile(loo, 0.5)), outsideRandomRange: mo < Math.min(...loo), changedPerToken: round(chPerTok, 3), randChangedPerToken: round(rch.reduce((a, x) => a + x.changed, 0) / Math.max(1, rTok), 3) });
}
// magnitude heterogeneity: variance across kinds of changed-per-token, real partition vs random partitions
const cpt = (recs) => { const t = recs.reduce((a, x) => a + x.tokens, 0); return t ? recs.reduce((a, x) => a + x.changed, 0) / t : null; };
const vr = (x) => { x = x.filter((v) => v != null); const m = mean(x); return x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1); };
const real = vr(Array.from({ length: K }, (_, c) => cpt(Ws.map((w) => w.kinds[c]?.obs).filter(Boolean))));
const parts = Array.from({ length: R.PARTS }, (_, p) => vr(Array.from({ length: K }, (_, c) => cpt(Ws.map((w) => w.parts[p][c]).filter(Boolean)))));
out.magnitudeHeterogeneity = { realVarChangedPerToken: round(real, 5), partitionDraws: parts.map((x) => round(x, 5)), partitionMax: round(Math.max(...parts), 5), exceedsAll: real > Math.max(...parts) };
fs.writeFileSync(path.join(OUT, `joint-${NOVEL}.extra.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.magnitudeHeterogeneity)); out.perKind.forEach((p) => console.log(JSON.stringify(p)));
