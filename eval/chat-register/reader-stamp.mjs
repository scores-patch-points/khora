// reader-stamp.mjs — WHICH READER MADE THIS NUMBER. The ingestion session found (2026-11-24) that the prior door takes the FIRST existing home, and ../janus/priors beside the workspace is an
// 18-file stand-in that shadows the real janus (~/Documents/janus/priors): under it the English parser is english-parser, not ud-parser, and the language cannot be detected. A number that does
// not say which reader made it is not comparable (the repo's rule: a measure that changed is a new row). Every probe in this directory puts this in its stamp.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export async function readerStamp() {
  const ps = await import("file://" + ROOT + "/native/the-fold/prior-source.mjs"), home = ps.priorsHome();
  let files = null; try { files = fs.readdirSync(home.dir).length; } catch { files = null; }
  const g = await import("file://" + ROOT + "/native/adapters/text/grammar-en.js").catch(() => null);
  return { priorsHome: home.dir, priorsFiles: files, KHORA_PRIORS_DIR: process.env.KHORA_PRIORS_DIR ?? null, parser: g?.READER ?? "unknown" };
}
