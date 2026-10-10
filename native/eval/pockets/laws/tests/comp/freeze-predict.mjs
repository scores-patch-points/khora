// Freezes the blind PREDICT table of laws/comp.mjs (text-extracted, so it does not import the not-yet-written compute module) with a sha256 of its canonical JSON.
import fs from "node:fs";
import { createHash } from "node:crypto";
const src = fs.readFileSync(new URL("../../comp.mjs", import.meta.url), "utf8");
const m = src.match(/export const PREDICT = (\{[\s\S]*?\n\});/);
const P = Function(`return (${m[1]})`)();
const canon = JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]]));
const out = { note: "blind PREDICT table of laws/comp.mjs frozen BEFORE any comp statistic was computed on any data (no _comp_core.mjs existed at freeze time)", sha256: createHash("sha256").update(canon).digest("hex"), canon: JSON.parse(canon) };
fs.writeFileSync(new URL("./predict-frozen.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(out.sha256);
