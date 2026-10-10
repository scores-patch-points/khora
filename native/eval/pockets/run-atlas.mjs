// eval/pockets/run-atlas.mjs — compute every law statistic for every pocket on both document halves, with within-pocket null worlds.
//   node run-atlas.mjs [--pockets id1,id2] [--families f1,f2] [--out results/atlas] [--draws 10] [--resume]
// loaders/*.mjs  each: export async function load(onlyIds = null) -> Pocket[]   (build only the pockets whose id is in onlyIds when given; files starting with _ are ignored)
// laws/*.mjs     each: export const FAMILY; export const STATS = [{id, statement, null: "within-unit"|"unit-order"|"token-global"}];
//                      export function compute(view) -> { [statId]: number | null }       (deterministic; <= ~15 s on 150k tokens)
// Output per pocket: results/atlas/<pocketId>.json = { meta, halves: { discover|confirm: { [familyId.statId]: {v, nullMean, nullSd, z, n} } }, errors, seconds }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, nullView, seedOf } from "./lib/pocket.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(HERE, opt("--out", "results/atlas")), DRAWS = Number(opt("--draws", 10)), RESUME = argv.includes("--resume");
const onlyP = opt("--pockets", null)?.split(","), onlyF = opt("--families", null)?.split(",");
fs.mkdirSync(OUT, { recursive: true });

const importAll = async (dir) => { const d = path.join(HERE, dir); return Promise.all(fs.readdirSync(d).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort().map((f) => import(pathToFileURL(path.join(d, f)).href))); };
const families = (await importAll("laws")).filter((m) => m.FAMILY && (!onlyF || onlyF.includes(m.FAMILY)));
const pockets = [];
for (const m of await importAll("loaders")) for (const p of await m.load(onlyP)) if (!onlyP || onlyP.includes(p.id)) pockets.push(p);

const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
for (const p of pockets) {
  const file = path.join(OUT, `${p.id}.json`);
  if (RESUME && fs.existsSync(file)) continue;
  const t0 = Date.now(), meta = validate(p), res = { meta: { ...meta, group: p.group, register: p.register, language: p.language, script: p.script ?? null, extra: p.meta ?? null }, halves: {}, errors: [] };
  if (meta.thin) { res.skipped = "thin"; fs.writeFileSync(file, JSON.stringify(res)); console.error(`${p.id}: thin (${meta.tokens} tokens, ${meta.docs} docs)`); continue; }
  const H = halves(p);
  for (const which of ["discover", "confirm"]) {
    const view = H[which]; res.halves[which] = {};
    for (const fam of families) {
      try {
        const obs = fam.compute(view), kinds = [...new Set(fam.STATS.map((s) => s.null))], draws = {};
        for (const kind of kinds) { draws[kind] = []; for (let k = 0; k < DRAWS; k++) draws[kind].push(fam.compute(nullView(view, kind, seedOf(p.id, which, fam.FAMILY, kind, k)))); }
        for (const s of fam.STATS) {
          const xs = draws[s.null].map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id];
          const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
          res.halves[which][`${fam.FAMILY}.${s.id}`] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
        }
      } catch (e) { res.errors.push(`${which}/${fam.FAMILY}: ${String(e.message).slice(0, 200)}`); }
    }
  }
  res.seconds = (Date.now() - t0) / 1000;
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${p.id}: ${meta.tokens} tokens, ${res.seconds.toFixed(1)} s, ${res.errors.length} errors`);
}
