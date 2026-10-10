// dump.mjs -- load pockets by id through the atlas loaders (same dispatch as run-atlas.mjs, files starting with _ ignored) and cache {meta, units, docOf} as JSON in a cache dir.
//   node dump.mjs CACHEDIR idsFile     (idsFile: one id per line; ids already cached are skipped). New file; edits nothing.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), POCKETS = path.resolve(HERE, "../..");
const [cache, idsFile] = process.argv.slice(2);
fs.mkdirSync(cache, { recursive: true });
const want = fs.readFileSync(idsFile, "utf8").split("\n").map((x) => x.trim()).filter((x) => x && !fs.existsSync(path.join(cache, `${x}.json`)));
const dir = path.join(POCKETS, "loaders");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).sort();
const left = new Set(want);
console.error(`want ${left.size}`);
for (const f of files) {
  if (!left.size) break;
  const m = await import(pathToFileURL(path.join(dir, f)).href);
  // ask each loader only for the ids; loaders ignore ids they do not hold
  let ps = [];
  try { ps = await m.load([...left]); } catch (e) { console.error(`${f}: load error ${String(e.message).slice(0, 160)}`); continue; }
  for (const p of ps) {
    if (!left.has(p.id)) continue;
    fs.writeFileSync(path.join(cache, `${p.id}.json`), JSON.stringify({ id: p.id, group: p.group, register: p.register, language: p.language, script: p.script ?? null, units: p.units, docOf: p.docOf, meta: p.meta ?? null }));
    left.delete(p.id); console.error(`${p.id} cached (${f}) ${p.units.length} units, ${left.size} left`);
  }
}
if (left.size) console.error("NOT FOUND:", [...left].join(","));
console.error("DONE");
