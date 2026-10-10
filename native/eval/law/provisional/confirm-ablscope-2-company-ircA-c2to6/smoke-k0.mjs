// smoke-k0.mjs -- instrument check only: does the closed-form c.dSelf reproduce the scoper's stored impact records (rec.c[2])?  Reads scoper days only, no data of this confirmation.
import fs from "node:fs";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { companyAt } from "./lib-dself.mjs";
const f = "../ablation-scope/data/confirmation/ubuntu_2011-03-15.cf.c2-c3-c4_6.jsonl";
const rows = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, 60);
const doc = loadIrcDay(`${IRC_ROOT}/ubuntu/2011-03-15.txt`, "ubuntu/2011-03-15");
let mx = 0, n = 0, bad = 0, t0 = Date.now();
for (const r of rows) {
  if (doc.stream[r.s][r.i] !== r.w) { bad += 1; continue; }
  const o = companyAt(doc.stream, r.s, r.i, 256), d = Math.abs(o.dSelf - r.rec.c[2]); mx = Math.max(mx, d); n += 1;
  const sh = companyAt(doc.stream, r.s, r.i, 256, { sham: true });
  if (sh.dSelf !== 0) bad += 1;
  for (let k = 0; k < 8; k++) mx = Math.max(mx, Math.abs(o.c8[k] - r.rec.c[k]));
}
console.log(JSON.stringify({ n, bad, maxAbsDiff: mx, msPerTok: (Date.now() - t0) / Math.max(1, n) }));
