// verifies that laws/comp.mjs PREDICT equals the frozen blind table (predict-frozen.json) except for the one amended entry (predict-amended.json), and that the freeze files predate every result file by mtime.
import fs from "node:fs";
import { createHash } from "node:crypto";
import * as fam from "../../comp.mjs";
const here = (f) => new URL(f, import.meta.url), rd = (f) => JSON.parse(fs.readFileSync(here(f), "utf8"));
const canon = JSON.stringify(Object.keys(fam.PREDICT).sort().map((k) => [k, fam.PREDICT[k]])), sha = createHash("sha256").update(canon).digest("hex");
const orig = rd("./predict-frozen.json"), amd = rd("./predict-amended.json");
const diff = orig.canon.filter(([k, v]) => fam.PREDICT[k] !== v).map(([k]) => k);
const mt = (f) => fs.statSync(here(f)).mtimeMs, results = fs.readdirSync(new URL(".", import.meta.url)).filter((f) => /^results-.*\.json$/.test(f));
const allowed = new Set(["universal+", "universal-", "specific", "absent"]);
console.log(JSON.stringify({ currentSha: sha, amendedSha: amd.sha256, matchesAmended: sha === amd.sha256, originalSha: orig.sha256, entriesDifferingFromOriginal: diff, valuesAllowed: Object.values(fam.PREDICT).every((v) => allowed.has(v)), idsMatchStats: fam.STATS.every((s) => s.id in fam.PREDICT) && Object.keys(fam.PREDICT).length === fam.STATS.length, originalFreezePredatesAllResults: results.every((f) => mt("./predict-frozen.json") < mt("./" + f)), amendedFreezePredatesNewDivSlopeResults: results.every((f) => mt("./predict-amended.json") <= mt("./" + f)) }, null, 1));
