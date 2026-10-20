// vendor-the-fold.mjs — copy the import closure of The Fold's chat falsifier into vendor/the-fold/, pinned by hash.
// The reverse of the-fold's own scripts/vendor-khora.mjs: the Fold's judge (fold-chat-falsify-answer.js: per-claim, per-source
// states / contradicts / silent, with the swap attack) is the one the door grounds with; this repo does not write a second one.
// An import of The Fold's own `./vendor/khora/native/…` is rewritten to this repo's native/ (it is the same file's source).
//   node scripts/vendor-the-fold.mjs [path-to-the-fold]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.resolve(process.argv[2] ?? path.join(root, "..", "the-fold"));
const out = path.join(root, "vendor", "the-fold");
const ENTRY = ["fold-chat-falsify-answer.js", "fold-chat-ground.js", "fold-chat-provenance.js", "fold-chat-void-keyed.js"];

const closure = new Set();
const queue = [...ENTRY];
while (queue.length) {
  const f = queue.pop();
  if (closure.has(f)) continue;
  closure.add(f);
  const text = fs.readFileSync(path.join(src, f), "utf8");
  for (const m of text.matchAll(/(?:from|import)\s+"\.\/([^"/]+\.js)"/g)) queue.push(m[1]);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const files = {};
for (const f of [...closure].sort()) {
  const text = fs.readFileSync(path.join(src, f), "utf8").replaceAll('"./vendor/khora/native/', '"../../native/');
  fs.writeFileSync(path.join(out, f), text);
  files[f] = crypto.createHash("sha256").update(text).digest("hex");
}
const git = (...a) => { try { return execFileSync("git", ["-C", src, ...a], { encoding: "utf8" }).trim(); } catch { return null; } };
fs.writeFileSync(path.join(out, "VENDOR.json"), JSON.stringify({ repo: "the-fold", commit: git("rev-parse", "HEAD"), uncommittedAtSync: git("status", "--short"), at: new Date().toISOString(), entry: ENTRY, files }, null, 2) + "\n");
console.log(`vendored ${closure.size} files into ${path.relative(root, out)}`);
