// classify-data.mjs — loads results/atlas/*.json into pockets x statistics cells for classify-atlas.mjs (PROTOCOL.md cell status; interpretations in results/FIXES.md entry 0).
//   --atlas <dir> overrides results/atlas (argv is read here so that every classify-* module sees the same data).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as CFG from "./classify-config.mjs";
import { fin, dummyCats } from "./classify-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
export const ATLAS = path.resolve(HERE, opt("--atlas", "results/atlas")), OUT = path.resolve(HERE, opt("--out", "results")), ROOT = HERE;
export const round = (x, d = 6) => (fin(x) ? Number(x.toPrecision(d)) : x ?? null);

// ---------------------------------------------------------------- load atlas, families
const recs = fs.readdirSync(ATLAS).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(fs.readFileSync(path.join(ATLAS, f), "utf8")));
const fams = [];
for (const f of fs.readdirSync(path.join(HERE, "laws")).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort()) fams.push(await import(pathToFileURL(path.join(HERE, "laws", f)).href));
const STAT = []; // {id, family, statement, null, predict}
for (const m of fams) for (const s of m.STATS) STAT.push({ id: `${m.FAMILY}.${s.id}`, family: m.FAMILY, statement: s.statement, null: s.null, predict: m.PREDICT?.[s.id] ?? null, inert: !!(m.INERT && m.INERT.includes(s.id)) });
const sIndex = new Map(STAT.map((s, i) => [s.id, i]));

const pockets = recs.map((r) => {
  const m = r.meta, tk = m.extra?.tokenisation ?? "";
  const p = { id: m.id, group: m.group, register: m.register, language: m.language, script: m.script ?? "NA", tokens: m.tokens, units: m.units, docs: m.docs, thin: !!m.thin, errors: r.errors?.length ?? 0,
    meanUnitLength: m.tokens / m.units, tokenisation: String(tk).slice(0, 160), rec: r };
  p.grain = CFG.grainOf({ id: p.id, meta: { tokenisation: tk } });
  p.kind = CFG.REAL_EXCLUDED_GROUPS.includes(p.group) ? (p.group === "pl" ? "planted" : "control") : "real";
  p.inLaw = p.kind === "real" && !p.thin;
  return p;
});
const byId = new Map(pockets.map((p) => [p.id, p]));

// ---------------------------------------------------------------- cells
export function cellOf(p, sid) {
  const a = p.rec.halves?.discover?.[sid], b = p.rec.halves?.confirm?.[sid];
  const vD = a?.v ?? null, vC = b?.v ?? null, zD = a?.z ?? null, zC = b?.z ?? null;
  const hasV = fin(vD) && fin(vC), defined = hasV && fin(zD) && fin(zC);
  let st = "nodata";
  if (defined) st = zD >= 4 && zC >= 4 ? "P+" : zD <= -4 && zC <= -4 ? "P-" : Math.abs(zD) < 2 && Math.abs(zC) < 2 ? "A" : "M";
  else if (hasV) st = "zundef";
  // sensitivity only: a zero-variance null with the observation off the null mean in the same direction in both halves
  const shifted = (x) => x && fin(x.v) && fin(x.nullMean) && x.nullSd === 0 && Math.abs(x.v - x.nullMean) > 1e-9 * Math.max(1, Math.abs(x.v)) ? Math.sign(x.v - x.nullMean) : 0;
  const sh = st === "zundef" && shifted(a) && shifted(a) === shifted(b) ? shifted(a) : 0;
  return { vD, vC, zD, zC, st, v: defined || hasV ? (vD + vC) / 2 : null, zmin: defined ? Math.min(Math.abs(zD), Math.abs(zC)) : null, shifted: sh };
}
const cells = pockets.map((p) => STAT.map((s) => (p.thin ? { st: "thin" } : cellOf(p, s.id))));
const lawIdx = pockets.map((p, i) => (p.inLaw ? i : -1)).filter((i) => i >= 0);
export const attrsFor = (idxs) => [
  ...CFG.CAT_ATTRS.map((n) => ({ name: n, type: "cat", ...dummyCats(idxs.map((i) => pockets[i][n])) })),
  { name: "tokens", type: "num", x: idxs.map((i) => Math.log10(pockets[i].tokens)) },
  { name: "meanUnitLength", type: "num", x: idxs.map((i) => Math.log10(pockets[i].meanUnitLength)) },
  { name: "docs", type: "num", x: idxs.map((i) => Math.log10(pockets[i].docs)) },
];
export { STAT, pockets, cells, byId, sIndex, recs, lawIdx };
