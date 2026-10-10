// sham_check.mjs -- control built to fail (K1): the SHAM ablation (a deletion that changes no text) must leave every record null. Reads data/rec/*-sham-*.json.
import fs from "node:fs"; import path from "node:path"; import { DATA } from "./lib.mjs";
const out = {};
for (const lang of ["js", "py"]) { let n = 0, nonNull = 0; for (let i = 0; i < 12; i++) { const f = path.join(DATA, "rec", `${lang}-sham-${i}.json`); if (!fs.existsSync(f)) continue; const d = JSON.parse(fs.readFileSync(f, "utf8")); for (const r of Object.values(d.recs)) { n += 1; if (!r.isNull) nonNull += 1; } }
  let det = { n: 0, same: 0 }; for (let i = 0; i < 12; i++) { const f = path.join(DATA, "rec", `${lang}-np-${i}.json`); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, "utf8")); if (d.det) { det.n += d.det.n; det.same += d.det.same; } } }
  out[lang] = { shamRecords: n, shamNonNull: nonNull, determinism: det }; }
fs.writeFileSync("results/sham-check.json", JSON.stringify(out)); console.log(JSON.stringify(out));
