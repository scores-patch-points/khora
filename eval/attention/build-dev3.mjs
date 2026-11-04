// eval/attention/build-dev3.mjs — the ROUND-3 DEVELOPMENT set: DEV-SET-2.json (unchanged) + the 30 cases of PARA-GOLD-BIND v1 (SPENT: scored once in round 2).
// Texts for the second part live in the parent session's folder; this only concatenates the case lists and records both source hashes.
//   node eval/attention/build-dev3.mjs <PARA-GOLD-BIND-V1.binder.json> [--write]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const v1File = process.argv[2];
if (!v1File || v1File.startsWith("--")) { console.log("build-dev3: pass the path of PARA-GOLD-BIND-V1.binder.json"); process.exit(0); }
const d2 = JSON.parse(fs.readFileSync(path.join(HERE, "DEV-SET-2.json"), "utf8"));
const v1Buf = fs.readFileSync(v1File);
const v1 = JSON.parse(v1Buf);
const cases = [...d2.cases, ...v1.cases.map((c) => ({ ...c, origin: "bind-v1-spent" }))];
const out = { schema: "AttentionDev@3", created: "2026-11-03", note: "round-3 development set; tuned on, never scored on; includes spent sets", sources: { "DEV-SET-2.json": sha(fs.readFileSync(path.join(HERE, "DEV-SET-2.json"))), "PARA-GOLD-BIND-V1.binder.json": sha(v1Buf) }, cases };
const json = JSON.stringify(out, null, 1) + "\n";
console.log(`build-dev3: ${cases.length} cases; sha256 ${sha(Buffer.from(json))}`);
if (process.argv.includes("--write")) { fs.writeFileSync(path.join(HERE, "DEV-SET-3.json"), json); console.log("wrote DEV-SET-3.json"); }
