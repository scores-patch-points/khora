// Re-derives the sha256 of laws/phys.mjs's PREDICT table and compares it with predict-frozen.json (frozen before any statistic was computed).
import fs from "node:fs";
import { createHash } from "node:crypto";
const src = fs.readFileSync(new URL("../../phys.mjs", import.meta.url), "utf8");
const P = Function(`return (${src.match(/export const PREDICT = (\{[\s\S]*?\n\});/)[1]})`)();
const canon = JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]])), frozen = JSON.parse(fs.readFileSync(new URL("./predict-frozen.json", import.meta.url), "utf8"));
const now = createHash("sha256").update(canon).digest("hex");
console.log(JSON.stringify({ frozenSha256: frozen.sha256, currentSha256: now, unchanged: now === frozen.sha256 }));
