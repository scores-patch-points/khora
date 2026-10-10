// Freezes the AMENDED blind PREDICT table of laws/comp.mjs (divSlope redefined and re-predicted before the new definition was computed on any data). Same extraction and hashing as freeze-predict.mjs.
import fs from "node:fs";
import { createHash } from "node:crypto";
const src = fs.readFileSync(new URL("../../comp.mjs", import.meta.url), "utf8");
const m = src.match(/export const PREDICT = (\{[\s\S]*?\n\});/);
const P = Function(`return (${m[1]})`)();
const canon = JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]]));
const orig = JSON.parse(fs.readFileSync(new URL("./predict-frozen.json", import.meta.url), "utf8"));
const changed = orig.canon.filter(([k, v]) => P[k] !== v).map(([k, v]) => ({ id: k, was: v, now: P[k] }));
const out = { note: "AMENDED blind PREDICT table of laws/comp.mjs: divSlope was redefined (size confound seen in a first sweep) and re-predicted BEFORE the new definition was computed on any data; all other entries unchanged from predict-frozen.json", originalSha256: orig.sha256, sha256: createHash("sha256").update(canon).digest("hex"), changed, canon: JSON.parse(canon) };
fs.writeFileSync(new URL("./predict-amended.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(out.sha256, JSON.stringify(changed));
