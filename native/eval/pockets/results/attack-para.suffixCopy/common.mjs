// common.mjs -- loaders for the analysis scripts (read the atlas matrix, the run outputs).
import fs from "node:fs";
import path from "node:path";
import { HERE, statusOf, f } from "./lib.mjs";
import { poissonZ, logPoisUpper, median, mean, quantile } from "./stats.mjs";
export { HERE, statusOf, f, median, mean, quantile, poissonZ };
export const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const writeJson = (p, o) => fs.writeFileSync(path.join(HERE, p), JSON.stringify(o, null, 1));
export const dirJson = (sub) => { const D = path.join(HERE, sub), o = {}; for (const fl of fs.readdirSync(D)) if (fl.endsWith(".json")) o[fl.slice(0, -5)] = readJson(path.join(D, fl)); return o; };
/** atlas matrix rows for para.suffixCopy: {id, meta..., vD, zD, vC, zC, status} (real non-thin pockets only) */
export function atlasRows(statId = "para.suffixCopy") {
  const m = readJson(path.join(HERE, "../atlas-matrix.json")), si = m.statistics.indexOf(statId), rows = {};
  for (const p of m.pockets) { if (p.kind !== "real") continue; const c = p.cells[si]; rows[p.id] = { id: p.id, group: p.group, register: p.register, language: p.language, script: p.script, grain: p.grain, tokens: p.tokens, units: p.units, docs: p.docs, meanUnitLength: p.meanUnitLength, vD: c[0], zD: c[1], vC: c[2], zC: c[3], status: c[4] }; }
  return rows;
}
export const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + "%" : "NA");
export const countBy = (xs, key) => { const o = {}; for (const x of xs) { const k = key(x); o[k] = (o[k] || 0) + 1; } return o; };
/** probability that Poisson(lam) reaches the count k4(lam) at which the Poisson z reaches 4 (Poisson upper tail <= 3.167e-5), plus the threshold */
export function powerAt4(lamNull, lamAlt) {
  if (!(lamNull > 0)) return { k4: null, p: 0 };
  const target = Math.log(3.167e-5); let k = Math.max(1, Math.floor(lamNull));
  while (logPoisUpper(k, lamNull) > target) k++;
  // P(X >= k) for X ~ Poisson(lamAlt)
  const p = Math.exp(logPoisUpper(k, Math.max(lamAlt, 1e-9)));
  return { k4: k, p: Math.min(1, p) };
}
