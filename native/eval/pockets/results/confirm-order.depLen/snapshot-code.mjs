// results/confirm-order.depLen/snapshot-code.mjs — freezes the five repository-code sibling pockets: copies every chosen source file byte for byte into code-snapshot/<id>/NNNN.txt and writes
// code-snapshot/index.json. REASON: the live trees under /Users/mlacy/Documents/3.0/khora/native/eval (and the others) are written by other jobs while the atlas phase runs; the primary run of
// sib-code-khora-eval-js saw 296484 tokens, a size test three minutes earlier 291120, and a later re-read yet another content. The frozen copy makes every later run byte-identical.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sha256 } from "../../lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), R = "/Users/mlacy/Documents/3.0";
const m = await import(pathToFileURL(path.join(HERE, "../../loaders/_sibling-deplen-code.mjs")).href);
const SNAP = path.join(HERE, "code-snapshot"), index = {};
for (const id of ["sib-code-khora-core", "sib-code-khora-eval-js", "sib-code-fold-js", "sib-code-misc-js", "sib-code-py"]) {
  const [p] = await m.load([id]); fs.mkdirSync(path.join(SNAP, id), { recursive: true }); index[id] = { tokensAtSnapshot: p.units.reduce((a, u) => a + u.length, 0), docs: [] };
  p.meta.docFiles.forEach((f, n) => {
    const buf = fs.readFileSync(path.join(R, f.rel));
    if (sha256(buf) !== f.sha256) throw new Error(`${f.rel} changed while snapshotting`);
    const name = String(n).padStart(4, "0") + ".txt"; fs.writeFileSync(path.join(SNAP, id, name), buf);
    index[id].docs.push({ n, file: name, rel: f.rel, sha256: f.sha256, bytes: buf.length });
  });
  index[id].unitsFingerprint = sha256(JSON.stringify(p.units)).slice(0, 16); index[id].docOfFingerprint = sha256(JSON.stringify(p.docOf)).slice(0, 16);
  console.error(`${id}: ${index[id].docs.length} files, ${index[id].tokensAtSnapshot} tokens`);
}
fs.writeFileSync(path.join(SNAP, "index.json"), JSON.stringify(index, null, 1));
console.error("index sha256", sha256(fs.readFileSync(path.join(SNAP, "index.json"))));
