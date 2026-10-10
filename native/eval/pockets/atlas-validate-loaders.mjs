// atlas-validate-loaders.mjs — validate every pocket of one loader, one id at a time (low memory). New file of the atlas-run phase.
//   node atlas-validate-loaders.mjs <loaderFile> <manifestFile> [outJsonl]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validate, halves, sha256 } from "./lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [loaderFile, manifestFile, outArg] = process.argv.slice(2);
const mods = []; for (const f of loaderFile.split(",")) mods.push(await import(pathToFileURL(path.join(HERE, "loaders", f)).href));
const man = JSON.parse(fs.readFileSync(path.join(HERE, "loaders", manifestFile), "utf8"));
const ids = man.pockets.map((p) => p.id);
const out = path.resolve(HERE, outArg || `results/validate/${loaderFile}.jsonl`);
fs.writeFileSync(out, "");
for (const id of ids) {
  const t0 = Date.now();
  let rec;
  try {
    let ps = []; for (const mod of mods) { ps = (await mod.load([id])).filter((p) => p.id === id); if (ps.length) break; }
    if (ps.length !== 1) rec = { id, ok: false, error: `load([id]) returned ${ps.length} pockets` };
    else {
      const p = ps[0], v = validate(p), H = halves(p);
      const ht = (h) => h.units.reduce((n, u) => n + u.length, 0);
      const h = sha256(p.units.map((u) => u.join(" ")).join("\n") + "\x1e" + p.docOf.join(","));
      rec = { id, ok: true, group: p.group, register: p.register, language: p.language, script: p.script ?? null, tokens: v.tokens, units: v.units, docs: v.docs, thin: v.thin, overCap: v.overCap,
        halfTokens: [ht(H.discover), ht(H.confirm)], halfDocs: [new Set(H.discover.docOf).size, new Set(H.confirm.docOf).size], sha: h.slice(0, 16), tokenisation: p.meta?.tokenisation ?? null };
    }
  } catch (e) { rec = { id, ok: false, error: String(e.message).slice(0, 300) }; }
  rec.sec = (Date.now() - t0) / 1000;
  fs.appendFileSync(out, JSON.stringify(rec) + "\n");
}
console.error(`${loaderFile}: done ${ids.length}`);
