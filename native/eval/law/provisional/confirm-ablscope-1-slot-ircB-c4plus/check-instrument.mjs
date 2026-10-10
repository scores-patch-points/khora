// check-instrument.mjs -- control K7 (INSTRUMENT IDENTITY): re-read 24 tokens that the scoper (ablation-scope lens) already read in its own confirmation files with ITS seed tag, using THIS lens's
// reading call, and compare record hashes and S_ENTRY. The scoper's values are used for nothing else. Registered in the header of analyse.mjs (K7).
import fs from "node:fs";
import path from "node:path";
import { impactBatch } from "../../impact.mjs";
import { ablationScores } from "../ablation-scope/features.mjs";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { HERE, sEntry } from "./lib.mjs";
const SC = path.join(HERE, "..", "ablation-scope", "data", "confirmation");
const out = { files: [], same: 0, total: 0, sEntrySame: 0, sEntryNonZero: 0 };
for (const f of ["ubuntu_2011-03-15.cf.c7_15-c16p.jsonl", "ubuntu_2012-03-15.cf.c2-c3-c4_6.jsonl"]) {
  const rows = fs.readFileSync(path.join(SC, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, 12), name = rows[0].doc;
  const doc = loadIrcDay(path.join(IRC_ROOT, `${name}.txt`), name);
  const res = impactBatch(doc.stream, rows.map((r) => ({ s: r.s, i: r.i, id: r.w })), { M: 256, F: 0, modes: ["delete"], seedTag: `${name}:cf`, maxSeconds: Infinity });
  let same = 0, se = 0, nz = 0;
  rows.forEach((r, k) => { const rec = res.records.delete[k]; if (rec && rec.hash === r.rec.hash) same += 1; const mine = rec ? sEntry(Array.from(rec.counts)) : null, theirs = ablationScores(r.rec).S_ENTRY; if (mine === theirs) se += 1; if (theirs > 0) nz += 1; });
  out.files.push({ f, doc: name, n: rows.length, hashSame: same, sEntrySame: se, theirNonZero: nz }); out.same += same; out.total += rows.length; out.sEntrySame += se; out.sEntryNonZero += nz;
}
fs.writeFileSync(path.join(HERE, "results", "K7-instrument-identity.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
