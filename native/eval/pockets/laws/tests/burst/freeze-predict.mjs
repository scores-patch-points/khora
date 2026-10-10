// Freezes the blind PREDICT table of laws/burst.mjs (text-extracted, so it imports nothing and touches no data) with a sha256 of its canonical JSON.
import fs from "node:fs";
import { createHash } from "node:crypto";
const src = fs.readFileSync(new URL("../../burst.mjs", import.meta.url), "utf8");
const m = src.match(/export const PREDICT = (\{[\s\S]*?\n\});/);
const P = Function(`return (${m[1]})`)();
const canon = JSON.stringify(Object.keys(P).sort().map((k) => [k, P[k]]));
const ids = [...src.matchAll(/\{ id: "(\w+)", statement: "[^\n]*?", null: "([\w-]+)" \}/g)].map((x) => [x[1], x[2]]);
const out = { note: "blind PREDICT table of laws/burst.mjs frozen BEFORE any burst statistic was computed on any data (the compute modules did not yet exist)", sha256: createHash("sha256").update(canon).digest("hex"), canon: JSON.parse(canon), statsAndNulls: ids };
fs.writeFileSync(new URL("./predict-frozen.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(out.sha256, ids.length);
