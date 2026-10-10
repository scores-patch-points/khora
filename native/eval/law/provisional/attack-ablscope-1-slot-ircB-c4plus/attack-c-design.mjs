// attack-c-design.mjs -- OUTCOME-BLIND DESIGN of the shuffled-company control "shufK" of attack C on rule ablscope-1-slot-ircB-c4plus.
// shufK = tokens permuted inside each message EXCEPT the message-initial token (first slot kept in place). The three days of the confirmer's SHUF arm (kubuntu/2007-03-15, kubuntu/2007-07-15, ubuntu/2005-03-15) are used so that the
// confirmer's real / shufW / shufG reads of the same days are the comparators. Pairs: the confirmer's own builder (matching v3 + outcome-blind balance swap), cells B c4_6 / c7_15 / c16p, 30 pairs per cell per day.
// No ablation value is read or computed here. Output data/design-c.json.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildDocPairs, slimOf, M_IRC } from "../confirm-ablscope-1-slot-ircB-c4plus/lib.mjs";
import { HERE, loadDocAny, aucPN } from "./lib-a.mjs";
const DAYS = ["kubuntu/2007-03-15", "kubuntu/2007-07-15", "ubuntu/2005-03-15"], tokens = [], report = { perDay: {} };
let pid = 0;
const all = [];
for (const name of DAYS) {
  const doc = loadDocAny(name, "shufK"), cells = ["c4_6", "c7_15", "c16p"].map((stratum) => ({ grp: "B", stratum, n: 30 }));
  const { pairs } = buildDocPairs(doc, M_IRC, cells);
  const per = {};
  for (const x of pairs) { const id = `SHUFK|${name}|shufK|${pid++}`, base = { arm: "SHUFK", doc: name, cond: "shufK", pair: id, grp: x.grp, stratum: x.stratum, units: doc.stream.length };
    tokens.push({ ...base, kind: "pair", y: 1, ...slimOf(x.pos) }); tokens.push({ ...base, kind: "pair", y: 0, ...slimOf(x.neg) }); per[x.stratum] = (per[x.stratum] ?? 0) + 1; all.push(x); }
  report.perDay[name] = per; console.error(name, JSON.stringify(per));
}
const f = { R_LOGC: (r) => Math.log(r.c), R_POS: (r) => Math.log1p(r.s), R_IPOS: (r) => r.i, R_FB: (r) => r.fbin, R_LEN: (r) => r.len, R_SL: (r) => Math.log(r.sl), R_RINIT: (r) => r.rinit };
report.designControls = Object.fromEntries(Object.entries(f).map(([k, g]) => [k, Number(aucPN(all.map((x) => g(x.pos)), all.map((x) => g(x.neg))).toFixed(3))]));
const out = JSON.stringify({ tag: "ac", tokens }); fs.writeFileSync(path.join(HERE, "data", "design-c.json"), out);
report.designSha256 = createHash("sha256").update(out).digest("hex"); report.tokens = tokens.length; report.pairs = all.length;
fs.writeFileSync(path.join(HERE, "results", "design-c-report.json"), JSON.stringify(report, null, 1)); console.log(JSON.stringify(report));
