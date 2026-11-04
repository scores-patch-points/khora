// R1 helper: sha256 of JSON.stringify(entry) (ms excluded) for each fixture, read through read-core.mjs::readWith with the given extra options.
//   node eval/cast/r1-hashes.mjs [<khora dir>] [json options]    prints { fixture: sha256 }
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
export async function r1Hashes(khoraDir, extra = {}) {
  const { readWith } = await import(path.join(khoraDir, "native/the-fold/read-core.mjs"));
  const out = {};
  for (const f of fs.readdirSync(path.join(here, "fixtures")).filter((x) => x.endsWith(".txt")).sort()) {
    const e = readWith(fs.readFileSync(path.join(here, "fixtures", f), "utf8"), { language: "en", minCharacters: 0, ...extra });
    out[f] = crypto.createHash("sha256").update(JSON.stringify({ ...e, ms: 0 })).digest("hex");
  }
  return out;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log(JSON.stringify(await r1Hashes(path.resolve(process.argv[2] ?? path.join(here, "../..")), process.argv[3] ? JSON.parse(process.argv[3]) : {}), null, 1));
}
