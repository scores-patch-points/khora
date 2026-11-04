// eval/attention/build-dev5.mjs — the ROUND-5 DEVELOPMENT set: DEV-SET-4.json (unchanged) + the 40 cases of PARA-GOLD-BIND v3 (SPENT: scored once in round 4).
// Texts for the second part live in the parent session's folder; this only concatenates the case lists and records both source hashes.
//   node eval/attention/build-dev5.mjs <PARA-GOLD-BIND-V3.binder.json> [--write]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const v3File = process.argv[2];
if (!v3File || v3File.startsWith("--")) { console.log("build-dev5: pass the path of PARA-GOLD-BIND-V3.binder.json"); process.exit(0); }
const d4 = JSON.parse(fs.readFileSync(path.join(HERE, "DEV-SET-4.json"), "utf8"));
const v3Buf = fs.readFileSync(v3File);
const v3 = JSON.parse(v3Buf);
const cases = [...d4.cases, ...v3.cases.map((c) => ({ ...c, origin: "bind-v3-spent" }))];
const out = { schema: "AttentionDev@5", created: "2026-11-03", note: "round-5 development set; tuned on, never scored on; includes spent sets", sources: { "DEV-SET-4.json": sha(fs.readFileSync(path.join(HERE, "DEV-SET-4.json"))), "PARA-GOLD-BIND-V3.binder.json": sha(v3Buf) }, cases };
const json = JSON.stringify(out, null, 1) + "\n";
console.log(`build-dev5: ${cases.length} cases; sha256 ${sha(Buffer.from(json))}`);
if (process.argv.includes("--write")) { fs.writeFileSync(path.join(HERE, "DEV-SET-5.json"), json); console.log("wrote DEV-SET-5.json"); }
