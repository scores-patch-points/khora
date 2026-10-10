// atlas-g2.mjs — G2 DETERMINISM: re-run 3 pockets with run-atlas.mjs in a fresh process and compare with results/atlas/<id>.json byte for byte, apart from the wall-clock field `seconds`
// (run-atlas.mjs writes Date.now()-based seconds, so full byte identity is impossible; see results/FIXES.md 0.5).   node atlas-g2.mjs <scratchDir> [id1,id2,id3]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const scratch = path.resolve(process.argv[2]), ids = (process.argv[3] || "ud-eng,pl-frames,oc-irc-kubuntu-0506").split(",");
fs.mkdirSync(scratch, { recursive: true });
const run = spawnSync("node", [path.join(HERE, "run-atlas.mjs"), "--pockets", ids.join(","), "--out", scratch], { encoding: "utf8", maxBuffer: 1 << 26 });
const strip = (s) => s.replace(/,"seconds":[0-9.eE+-]+/, "");
const sha = (s) => createHash("sha256").update(s).digest("hex");
const rows = ids.map((id) => {
  const a = fs.readFileSync(path.join(HERE, "results/atlas", `${id}.json`), "utf8"), b = fs.readFileSync(path.join(scratch, `${id}.json`), "utf8");
  return { id, bytesOriginal: a.length, bytesRerun: b.length, sha256OriginalWithoutSeconds: sha(strip(a)), sha256RerunWithoutSeconds: sha(strip(b)), identicalExceptSeconds: strip(a) === strip(b), identicalIncludingSeconds: a === b };
});
const out = { status: rows.every((r) => r.identicalExceptSeconds) ? "PASS (byte-identical except the wall-clock field `seconds`)" : "FAIL", rows, runStderrTail: String(run.stderr || "").trim().split("\n").slice(-4) };
fs.writeFileSync(path.join(HERE, "results/g2-determinism.json"), JSON.stringify(out, null, 1));
console.log(out.status, JSON.stringify(rows.map((r) => [r.id, r.identicalExceptSeconds, r.identicalIncludingSeconds])));
