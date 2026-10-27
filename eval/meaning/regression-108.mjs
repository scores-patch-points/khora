// eval/meaning/regression-108.mjs — the frozen 108-pair regression set (regression-108.json): the set files must hash as frozen, and stage-run.mjs must give the baseline numbers.
// A difference is printed as a difference; nothing here tunes anything.   node eval/meaning/regression-108.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), K = path.join(HERE, "../..");
const M = JSON.parse(fs.readFileSync(path.join(HERE, "regression-108.json"), "utf8"));
let ok = true;
for (const [f, h] of Object.entries(M.files)) { const got = crypto.createHash("sha256").update(fs.readFileSync(path.join(K, f))).digest("hex"); if (got !== h) { ok = false; console.log(`CHANGED ${f}: the frozen set was edited (sha ${got.slice(0, 12)} vs ${h.slice(0, 12)})`); } }
const out = execSync("node eval/meaning/stage-run.mjs", { cwd: K, encoding: "utf8", maxBuffer: 1 << 26 });
const line = (name) => out.split("\n").find((l) => l.startsWith(name)) ?? "";
const parse = (l) => { const m = /C named\s+(\S+)\s+false-C (\S+)\s+E accepted\s+(\S+)\s+false-E (\d+)/.exec(l); return m ? { C: m[1], falseC: m[2], E: m[3], falseE: Number(m[4]) } : null; };
for (const [name, key] of [["rules (atoms arm)", "rules"], ["stage arm, both licenses", "stage"]]) { const got = parse(line(name)), want = M.baseline["stage-run.mjs"][key]; const same = got && JSON.stringify(got) === JSON.stringify(want); if (!same) ok = false; console.log(`${same ? "ok     " : "MOVED  "} ${key}: ${JSON.stringify(got)} ${same ? "" : "(baseline " + JSON.stringify(want) + ")"}`); }
console.log(ok ? "REGRESSION-108: baseline holds" : "REGRESSION-108: a number moved or a file changed (see above)"); process.exit(ok ? 0 : 1);
