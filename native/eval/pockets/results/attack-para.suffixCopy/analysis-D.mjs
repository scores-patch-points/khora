// analysis-D.mjs -- attack D: summary of the planted worlds (run-D.mjs output): per setting, status counts under the four null worlds, mean v and mean null, ratio.
import { readJson, writeJson, mean, median, countBy } from "./common.mjs";
import path from "node:path";
import { HERE } from "./common.mjs";
const J = readJson(path.join(HERE, "out/D.json")), KINDS = ["unit-order", "within-doc", "len", "doc-len"];
const out = { reps: J.reps, draws: J.draws, settings: {}, atlasPlanted: {} };
for (const [k, arr] of Object.entries(J.settings)) {
  const row = { nullWorlds: {} };
  for (const kind of KINDS) { const c = countBy(arr, (r) => r.nulls[kind].suffixCopy.status); row.nullWorlds[kind] = c; }
  const v = arr.flatMap((r) => [r.nulls["unit-order"].suffixCopy.vD, r.nulls["unit-order"].suffixCopy.vC]).filter((x) => x != null), nm = arr.flatMap((r) => [r.nulls["unit-order"].suffixCopy.nullD, r.nulls["unit-order"].suffixCopy.nullC]).filter((x) => x != null);
  row.meanV = +mean(v).toFixed(5); row.meanNull = +mean(nm).toFixed(5); row.ratio = +(mean(v) / mean(nm)).toFixed(2);
  row.medianZunitOrder = +median(arr.flatMap((r) => [r.nulls["unit-order"].suffixCopy.zD, r.nulls["unit-order"].suffixCopy.zC]).filter((x) => x != null)).toFixed(1);
  out.settings[k] = row;
}
for (const r of J.atlasPlanted) out.atlasPlanted[r.id] = Object.fromEntries(KINDS.map((k) => [k, `${r.nulls[k].suffixCopy.status} z ${r.nulls[k].suffixCopy.zD?.toFixed(1)}/${r.nulls[k].suffixCopy.zC?.toFixed(1)}`]));
writeJson("out/analysis-D.json", out);
const fmt = (c) => Object.entries(c).map(([a, b]) => `${a}${b}`).join("/");
console.log("setting".padEnd(26), "atlas-null".padEnd(10), "within-doc".padEnd(10), "len-class".padEnd(10), "doc+len".padEnd(10), " meanV   meanNull ratio  medZ(atlas null)");
for (const [k, r] of Object.entries(out.settings)) console.log(k.padEnd(26), ...KINDS.map((kd) => fmt(r.nullWorlds[kd]).padEnd(10)), String(r.meanV).padEnd(8), String(r.meanNull).padEnd(8), String(r.ratio).padEnd(6), r.medianZunitOrder);
console.log(JSON.stringify(out.atlasPlanted, null, 1));
