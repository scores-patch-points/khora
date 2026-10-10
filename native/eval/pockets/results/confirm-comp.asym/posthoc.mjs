// results/confirm-comp.asym/posthoc.mjs — POST-HOC, NOT REGISTERED (written after the verdict was computed; reported as exploratory only).
//   (1) FULL-POCKET cell: comp.asym on the whole pocket (no half split), 10 within-unit draws, seed seedOf(id, 'full', 'comp', 'within-unit', k): is a pocket that is AMBIGUOUS on halves (low power) PRESENT on all its documents?
//   (2) FIVE ALTERNATIVE DOCUMENT SPLITS: halves by parity of sha256(`${id}:alt${r}:${doc}`), r = 1..5, seed seedOf(id, `${half}#alt${r}`, 'comp', 'within-unit', k): how stable is the PROTOCOL status of each sibling under the choice of split?
//   node posthoc.mjs  -> posthoc.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nullView, seedOf, sha256 } from "../../lib/pocket.mjs";
import * as comp from "../../laws/comp.mjs";
import { PREREG, statusOf } from "./confirm.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../..");
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
function zOf(view, seedKey, id) {
  const v = comp.compute(view).asym, xs = [];
  for (let k = 0; k < 10; k++) xs.push(comp.compute(nullView(view, "within-unit", seedOf(id, seedKey, comp.FAMILY, "within-unit", k))).asym);
  const f = xs.filter((x) => Number.isFinite(x)), { m, sd } = f.length >= 3 ? stat(f) : { m: NaN, sd: NaN };
  return { v, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null };
}
function altHalves(p, r) {
  const side = (d) => parseInt(sha256(`${p.id}:alt${r}:${d}`).slice(0, 2), 16) & 1, out = { discover: { id: p.id, units: [], docOf: [] }, confirm: { id: p.id, units: [], docOf: [] } }, renum = { discover: new Map(), confirm: new Map() };
  p.units.forEach((u, k) => { const w = side(p.docOf[k]) ? "confirm" : "discover", m = renum[w]; if (!m.has(p.docOf[k])) m.set(p.docOf[k], m.size); out[w].units.push(u); out[w].docOf.push(m.get(p.docOf[k])); });
  return out;
}
const ids = PREREG.siblings.filter((s) => !s.thin && s.role !== "control").map((s) => s.id);
const pockets = await (await import(pathToFileURL(path.join(POCKETS, "loaders/_sibling-asym-all.mjs")).href)).load(ids), out = {};
for (const p of pockets) {
  const reg = PREREG.siblings.find((s) => s.id === p.id), full = zOf({ id: p.id, units: p.units, docOf: p.docOf }, "full", p.id), splits = [];
  for (let r = 1; r <= 5; r++) { const H = altHalves(p, r), d = zOf(H.discover, `discover#alt${r}`, p.id), c = zOf(H.confirm, `confirm#alt${r}`, p.id); splits.push({ r, zD: d.z, zC: c.z, vD: d.v, vC: c.v, status: statusOf(d.z, c.z) }); }
  const tally = {}; for (const s of splits) tally[s.status] = (tally[s.status] ?? 0) + 1;
  out[p.id] = { role: reg.role, tokens: reg.tokens, fullPocket: full, registeredStatus: JSON.parse(fs.readFileSync(path.join(HERE, "pockets", `${p.id}.json`), "utf8")).status.asym, altSplitStatuses: tally, splits };
  console.error(p.id.padEnd(24), reg.role.padEnd(18), `full z ${full.z?.toFixed(1)} v ${full.v?.toFixed(4)}`.padEnd(30), JSON.stringify(tally));
}
fs.writeFileSync(path.join(HERE, "posthoc.json"), JSON.stringify({ note: "post-hoc, not registered; see header of posthoc.mjs", out }, null, 1));
