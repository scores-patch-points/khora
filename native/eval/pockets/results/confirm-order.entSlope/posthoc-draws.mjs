// results/confirm-order.entSlope/posthoc-draws.mjs — POST-HOC (not pre-registered, does not change the verdict): the registered z uses 10 within-unit null draws (sd with 9 degrees of freedom). Recompute z for every scored
// sibling with 100 draws (seeds seedOf(id, half, 'order', 'within-unit', k), k = 0..99; k < 10 are the registered draws) and report whether any PRESENT / ABSENT status changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf } from "../../lib/pocket.mjs";
import * as ORDER from "../../laws/order.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../..");
const PRE = JSON.parse(fs.readFileSync(path.join(HERE, "confirm.mjs"), "utf8").match(/export const PREREG = (\{[\s\S]*?\n\});\n\/\/ ===== END/)[1]);
const stat = (a, b) => (a == null || b == null ? "UNDEFINED" : a >= 4 && b >= 4 ? "PRESENT+" : a <= -4 && b <= -4 ? "PRESENT-" : Math.abs(a) < 2 && Math.abs(b) < 2 ? "ABSENT" : "AMBIGUOUS");
const out = {}, ids = (process.argv[2] ?? PRE.siblings.filter((s) => s.scored).map((s) => s.id).join(",")).split(",");
for (const id of ids) {
  const sp = PRE.siblings.find((s) => s.id === id), p = (await (await import(pathToFileURL(path.join(ROOT, sp.loader)).href)).load([id])).find((x) => x.id === id), H = halves(p), z = {}, z10 = {};
  for (const which of ["discover", "confirm"]) {
    const view = H[which], v = ORDER.compute(view).entSlope, xs = [];
    for (let k = 0; k < 100; k++) xs.push(ORDER.compute(nullView(view, "within-unit", seedOf(p.id, which, "order", "within-unit", k))).entSlope);
    const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return { m, sd: Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) }; };
    const a = sd(xs), b = sd(xs.slice(0, 10)); z[which] = (v - a.m) / a.sd; z10[which] = (v - b.m) / b.sd;
  }
  out[id] = { expect: sp.expect, z10: { discover: +z10.discover.toFixed(2), confirm: +z10.confirm.toFixed(2), status: stat(z10.discover, z10.confirm) }, z100: { discover: +z.discover.toFixed(2), confirm: +z.confirm.toFixed(2), status: stat(z.discover, z.confirm) } };
  console.error(id, JSON.stringify(out[id]));
}
fs.writeFileSync(path.join(HERE, "posthoc-draws.json"), JSON.stringify(out, null, 1) + "\n");
