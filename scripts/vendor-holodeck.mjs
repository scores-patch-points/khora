// vendor-holodeck.mjs — copy the import closure of the Holodeck's model-free research into vendor/holodeck/, pinned by hash.
// The Holodeck (holodeck-research.js: search, gate, read, stop; holodeck-research-read.js: statements with spans;
// holodeck-research-terrain.js: the nine registers; holodeck-summary.js: a grounded summary selected by stance) is the one
// research pipeline; the door gathers with it and does not write a second one. Same shape as vendor-the-fold.mjs:
//   - an import of the Holodeck's own `./vendor/khora/native/…` (or `../khora/native/…`) is rewritten to this repo's native/
//   - an import of the Holodeck's `./vendor/fold-chat/…` is rewritten to vendor/the-fold/ (the same files, vendored from The Fold)
//   node scripts/vendor-holodeck.mjs [path-to-holodeck]
// khora is a symlink to ~/.khora: pass the path explicitly when running from the workspace.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.resolve(process.argv[2] ?? path.join(root, "..", "holodeck"));
const out = path.join(root, "vendor", "holodeck");
const ENTRY = ["holodeck-research.js", "holodeck-research-lanes.js", "holodeck-research-terrain.js", "holodeck-summary.js", "holodeck-reader.js"];

const closure = new Set();
const queue = [...ENTRY];
while (queue.length) {
  const f = queue.pop();
  if (closure.has(f)) continue;
  closure.add(f);
  const text = fs.readFileSync(path.join(src, f), "utf8");
  for (const m of text.matchAll(/(?:from|import\s*\()\s*['"]\.\/([^'"/]+\.js)['"]/g)) queue.push(m[1]);
}
const rewrite = (text) =>
  text
    .replaceAll("'./vendor/khora/native/", "'../../native/").replaceAll('"./vendor/khora/native/', '"../../native/')
    .replaceAll("'../khora/native/", "'../../native/").replaceAll('"../khora/native/', '"../../native/')
    .replaceAll("'./vendor/fold-chat/", "'../the-fold/").replaceAll('"./vendor/fold-chat/', '"../the-fold/')
    .replaceAll("'./vendor/the-fold/", "'../the-fold/").replaceAll('"./vendor/the-fold/', '"../the-fold/');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const files = {};
for (const f of [...closure].sort()) {
  const text = rewrite(fs.readFileSync(path.join(src, f), "utf8"));
  fs.writeFileSync(path.join(out, f), text);
  files[f] = crypto.createHash("sha256").update(text).digest("hex");
}
const git = (...a) => { try { return execFileSync("git", ["-C", src, ...a], { encoding: "utf8" }).trim(); } catch { return null; } };
fs.writeFileSync(path.join(out, "VENDOR.json"), JSON.stringify({ repo: "holodeck", commit: git("rev-parse", "HEAD"), uncommittedAtSync: git("status", "--short"), at: new Date().toISOString(), entry: ENTRY, files }, null, 2) + "\n");
console.log(`vendored ${closure.size} files into ${path.relative(root, out)}`);
