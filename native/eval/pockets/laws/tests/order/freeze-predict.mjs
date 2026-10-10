// Freezes the blind PREDICT table of laws/order.mjs (text-extracted, so it does not import the not-yet-written compute modules) with a sha256 of its canonical JSON.
import fs from "node:fs";
import { createHash } from "node:crypto";
const src = fs.readFileSync(new URL("../../order.mjs", import.meta.url), "utf8");
const m = src.match(/export const PREDICT = (\{[\s\S]*?\n\});/);
const P = Function(`return (${m[1]})`)();
const canon = JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]]));
const out = { note: "blind PREDICT table of laws/order.mjs frozen BEFORE any order statistic was computed on any data (the compute helpers _order_*.mjs did not yet exist)", sha256: createHash("sha256").update(canon).digest("hex"), canon: JSON.parse(canon), orderMjsSha256AtFreeze: createHash("sha256").update(src).digest("hex") };
fs.writeFileSync(new URL("./predict-frozen.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(out.sha256);
