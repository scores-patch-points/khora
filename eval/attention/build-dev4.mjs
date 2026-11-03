// eval/attention/build-dev4.mjs — the ROUND-4 DEVELOPMENT set: DEV-SET-3.json (unchanged) + the 36 cases of PARA-GOLD-BIND v2 (SPENT: scored once in round 3).
// Texts for the second part live in the parent session's folder; this only concatenates the case lists and records both source hashes.
//   node eval/attention/build-dev4.mjs <PARA-GOLD-BIND-V2.binder.json> [--write]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const v2File = process.argv[2];
if (!v2File || v2File.startsWith("--")) { console.log("build-dev4: pass the path of PARA-GOLD-BIND-V2.binder.json"); process.exit(0); }
const d3 = JSON.parse(fs.readFileSync(path.join(HERE, "DEV-SET-3.json"), "utf8"));
const v2Buf = fs.readFileSync(v2File);
const v2 = JSON.parse(v2Buf);
const cases = [...d3.cases, ...v2.cases.map((c) => ({ ...c, origin: "bind-v2-spent" }))];
const out = { schema: "AttentionDev@4", created: "2026-11-03", note: "round-4 development set; tuned on, never scored on; includes spent sets", sources: { "DEV-SET-3.json": sha(fs.readFileSync(path.join(HERE, "DEV-SET-3.json"))), "PARA-GOLD-BIND-V2.binder.json": sha(v2Buf) }, cases };
const json = JSON.stringify(out, null, 1) + "\n";
console.log(`build-dev4: ${cases.length} cases; sha256 ${sha(Buffer.from(json))}`);
if (process.argv.includes("--write")) { fs.writeFileSync(path.join(HERE, "DEV-SET-4.json"), json); console.log("wrote DEV-SET-4.json"); }
