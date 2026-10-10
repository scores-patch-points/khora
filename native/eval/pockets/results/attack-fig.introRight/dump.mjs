// dump.mjs -- load pockets by id through the atlas loaders (same dispatch as run-atlas.mjs) and cache {meta, units, docOf} as JSON in a cache dir.
//   node dump.mjs CACHEDIR id1,id2,...
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../..");
const [cache, idsArg] = process.argv.slice(2);
fs.mkdirSync(cache, { recursive: true });
const want = idsArg.split(",").filter((x) => x && !fs.existsSync(path.join(cache, `${x}.json`)));
const dir = path.join(POCKETS, "loaders");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort();
let left = new Set(want);
for (const f of files) {
  if (!left.size) break;
  const m = await import(pathToFileURL(path.join(dir, f)).href);
  const ps = await m.load([...left]);
  for (const p of ps) {
    if (!left.has(p.id)) continue;
    fs.writeFileSync(path.join(cache, `${p.id}.json`), JSON.stringify({ id: p.id, group: p.group, register: p.register, language: p.language, script: p.script ?? null, units: p.units, docOf: p.docOf, meta: p.meta ?? null }));
    left.delete(p.id); console.error(`${p.id} cached (${f}) ${p.units.length} units`);
  }
}
if (left.size) console.error("NOT FOUND:", [...left].join(","));
