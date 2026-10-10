// Re-derives the sha256 of laws/freq.mjs's PREDICT table and compares it with predict-frozen.json (frozen before any statistic was computed).
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PREDICT } from "../../freq.mjs";
const canon = JSON.stringify(Object.keys(PREDICT).sort().map((k) => [k, PREDICT[k]])), frozen = JSON.parse(fs.readFileSync(new URL("./predict-frozen.json", import.meta.url), "utf8"));
const now = createHash("sha256").update(canon).digest("hex");
console.log(JSON.stringify({ frozenSha256: frozen.sha256, currentSha256: now, unchanged: now === frozen.sha256 }));
