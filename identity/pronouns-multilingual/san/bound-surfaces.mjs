// bound-surfaces.mjs — which beings the bound pronouns went to (H11 evidence): re-reads the same chunks as eval-read.mjs and tallies the surface of each binding's being.
import fs from "node:fs"; import { readToWeft } from "../../../native/the-fold/read-process.mjs";
const [FILE, K, CH] = process.argv.slice(2); const text = fs.readFileSync(FILE, "utf8"), n = +K, len = +CH; const tally = {}; let total = 0;
for (let i = 0; i < n; i++) { let a = Math.floor(((i + +(process.env.GRID_SHIFT ?? 0.5)) / n) * (text.length - len)); const nl = text.indexOf("\n", a); a = nl < 0 ? a : nl + 1; let b = a + len; const last = Math.max(text.lastIndexOf("|", b), text.lastIndexOf("\n", b)); if (last > a + len / 2) b = last + 1;
  const e = readToWeft(text.slice(a, b), { address: "x", language: "san" }); for (const p of e.pronounsPresence ?? []) { total++; tally[p.surface] = (tally[p.surface] ?? 0) + 1; } }
console.log(total, Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${k}:${v}`).join(" "));
