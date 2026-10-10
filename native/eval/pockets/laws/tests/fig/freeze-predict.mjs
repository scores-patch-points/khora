// tests/fig/freeze-predict.mjs — freeze the BLIND PREDICT table of family "fig" (run once, before any statistic is computed on any data).
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PREDICT, STATS, FAMILY } from "../../fig.mjs";
const here = new URL(".", import.meta.url).pathname;
const body = { family: FAMILY, stats: STATS.map((s) => ({ id: s.id, null: s.null })), predict: PREDICT, note: "written before any statistic of the family was computed on any data; written 2026-10-07" };
const json = JSON.stringify(body, null, 1);
const out = { ...body, sha256: createHash("sha256").update(json).digest("hex"), figMjsSha256AtFreeze: createHash("sha256").update(fs.readFileSync(new URL("../../fig.mjs", import.meta.url))).digest("hex") };
if (fs.existsSync(here + "predict-frozen.json")) { console.error("predict-frozen.json exists: refusing to overwrite"); process.exit(1); }
fs.writeFileSync(here + "predict-frozen.json", JSON.stringify(out, null, 1) + "\n");
console.log(out.sha256);
