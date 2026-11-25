// amend-wired-caveats.mjs — add the junk-input caveat and the attack summary to the two WIRED unit-cells priors, with the owner's word (2026-11-24, "Yes, add it").
// Idempotent (a prior that already carries the caveat is left alone), keeps a history entry with the file's previous sha256, touches only the metadata.
//   node amend-wired-caveats.mjs --dry   |   node amend-wired-caveats.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { priorsHome } from "../../../native/the-fold/prior-source.mjs";
import { junkCaveat, JUNK_MARKER, ATTACK } from "./caveats.mjs";

const DRY = process.argv.includes("--dry"), sha = (s) => crypto.createHash("sha256").update(s).digest("hex"), home = priorsHome().dir, out = [];
for (const head of ["op", "cell"]) {
  const name = `unit-cells-qwen3-embedding_4b-${head}.json`, file = path.join(home, name);
  if (!fs.existsSync(file)) { out.push({ name, amended: false, why: "not in the priors home (not wired)" }); continue; }
  const raw = fs.readFileSync(file, "utf8"), j = JSON.parse(raw);
  if (j.meta?.status?.startsWith("WIRED") !== true) { out.push({ name, amended: false, why: "not a wired unit-cells prior" }); continue; }
  if ((j.meta.caveats ?? []).some((c) => c.startsWith(JUNK_MARKER))) { out.push({ name, amended: false, why: "already carries the junk-input caveat" }); continue; }
  j.meta.caveats = [...(j.meta.caveats ?? []), junkCaveat(head)]; j.meta.attack = ATTACK;
  j.meta.history = [...(j.meta.history ?? []), { at: new Date().toISOString(), change: "added the junk-input caveat and the attack summary (metadata only; centroids and bounds untouched)", previousSha256: sha(raw), authority: "the owner's word, 2026-11-24" }];
  const text = JSON.stringify(j); if (!DRY) fs.writeFileSync(file, text);
  out.push({ name, amended: !DRY, previousSha256: sha(raw), sha256: sha(text), caveats: j.meta.caveats.length, centroidsUntouched: JSON.stringify(Object.keys(j.classes)) === JSON.stringify(Object.keys(JSON.parse(raw).classes)) });
}
console.log(JSON.stringify({ home, out }, null, 1));
