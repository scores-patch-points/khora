// atlas-provenance.mjs — records sha256 + mtime of every code file the atlas depends on (laws/*.mjs, loaders/*.mjs and *.manifest.json, lib, run-atlas, PROTOCOL, classify-*), so a result can be tied to the code that made it.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const list = (d, re) => fs.readdirSync(path.join(HERE, d)).filter((f) => re.test(f)).sort().map((f) => path.join(d, f));
const files = [...list("laws", /\.mjs$/), ...list("loaders", /\.(mjs|json)$/), "lib/pocket.mjs", "run-atlas.mjs", "PROTOCOL.md", ...list(".", /^(classify|atlas)-.*\.mjs$/)];
const out = { node: process.version, files: Object.fromEntries(files.map((f) => { const p = path.join(HERE, f); return [f, { sha256: sha(p), bytes: fs.statSync(p).size, mtimeIso: fs.statSync(p).mtime.toISOString() }]; })) };
fs.writeFileSync(path.join(HERE, "results/provenance.json"), JSON.stringify(out, null, 1));
console.log(files.length, "files; newest mtime:", Object.entries(out.files).map(([f, v]) => [v.mtimeIso, f]).sort().slice(-3).map((x) => x.join(" ")).join(" | "));
