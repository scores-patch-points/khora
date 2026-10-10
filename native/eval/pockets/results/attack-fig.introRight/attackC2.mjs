// attackC2.mjs -- ATTACK C (continued): the atlas z carries only the within-unit shuffle variance (10 draws), NOT document-sampling variance. DOCUMENT-GROUP check:
// documents of a pocket are split into G = 10 groups by sha256(id:doc) mod 10; for each group the introRight cell (10 within-unit draws, atlas-style seeds with seedId = id|grp|g) gives d_g = v - nullMean.
// t = mean(d_g) / (sd(d_g)/sqrt(G)) (9 df). A pocket 'holds at document level' if t has the sign of its atlas d and |t| >= 3 (p ~ 0.015 two-sided) and >= 8 of 10 groups share the sign.
//   node attackC2.mjs <idlist|file> [tag] -> C2_<tag>.json
import fs from "node:fs"; import path from "node:path";
import { loadCached, HERE, f, sha256, tokensOf } from "./lib.mjs"; import { cellFn, introSide, dCell } from "./variants.mjs";
const [idsArg, tag = ""] = process.argv.slice(2);
const ids = fs.existsSync(idsArg) ? fs.readFileSync(idsArg, "utf8").trim().split(",") : idsArg.split(",");
const G = 10, out = {};
for (const id of ids) {
  const p = loadCached(id), at = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")), a = at.halves.discover["fig.introRight"], b = at.halves.confirm["fig.introRight"], base = ((a.v - a.nullMean) + (b.v - b.nullMean)) / 2;
  const grp = (d) => parseInt(sha256(`${id}:${d}`).slice(2, 8), 16) % G, ds = [], toks = [];
  for (let g = 0; g < G; g++) {
    const units = [], docOf = []; p.units.forEach((u, k) => { if (grp(p.docOf[k]) === g) { units.push(u); docOf.push(p.docOf[k]); } });
    const view = { id: `${id}|grp|${g}`, which: "all", units, docOf }, c = cellFn(view, (P) => introSide(P, { side: "R", minPairs: 15 }), 10, view.id, "all"), d = dCell(c); toks.push(tokensOf(units)); if (d != null) ds.push(d);
  }
  const n = ds.length, m = ds.reduce((s, x) => s + x, 0) / n, sd = Math.sqrt(ds.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, n - 1)), t = sd > 0 ? m / (sd / Math.sqrt(n)) : null, sgn = base > 0 ? 1 : -1;
  const same = ds.filter((x) => Math.sign(x) === sgn).length;
  out[id] = { atlasD: base, nGroups: n, meanD: m, sdD: sd, t, sameSign: same, tokensPerGroup: toks.reduce((s, x) => s + x, 0) / G, holds: t != null && Math.sign(t) === sgn && Math.abs(t) >= 3 && same >= 8, ds };
  console.error(id.padEnd(24), "atlas d", f(base), "| groups d mean", f(m), "sd", f(sd), "t", f(t, 2), "same-sign", same + "/" + n, out[id].holds ? "HOLDS" : "no");
}
fs.writeFileSync(path.join(HERE, `C2${tag ? "_" + tag : ""}.json`), JSON.stringify(out, null, 1));
