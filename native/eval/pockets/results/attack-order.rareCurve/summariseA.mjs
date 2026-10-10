// summariseA.mjs -- digest of A_raw_*.jsonl -> A_summary.json (and a printed table). node summariseA.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const rows = []; for (const f of fs.readdirSync(HERE).filter((x) => /^A_raw_\d+\.jsonl$/.test(x)).sort()) for (const l of fs.readFileSync(path.join(HERE, f), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
rows.sort((a, b) => (a.id < b.id ? -1 : 1));
const out = { nPockets: rows.length, baseMatchesAtlas: rows.filter((r) => r.baseMatchesAtlas).length, variants: {} };
const names = Object.keys(rows[0].variants);
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const isPres = (r) => r.status0 === "P+" || r.status0 === "P-";
for (const name of names) {
  const run = rows.filter((r) => r.variants[name] && !r.variants[name].skipped && r.variants[name].v != null), skip = rows.filter((r) => !run.includes(r));
  const o = { nRun: run.length, nSkipped: skip.length, skipReasons: [...new Set(skip.map((r) => r.variants[name]?.skipped ?? "undefined"))] };
  const cnt = (rs) => rs.reduce((a, r) => { a[r.variants[name].status] = (a[r.variants[name].status] || 0) + 1; return a; }, {});
  o.statusAll = cnt(run);
  for (const [lab, filt] of [["basePplus", (r) => r.status0 === "P+"], ["basePminus", (r) => r.status0 === "P-"], ["baseNotPresent", (r) => !isPres(r)]]) {
    const rs = run.filter(filt); if (!rs.length) continue;
    const same = rs.filter((r) => sgn(r.variants[name].v) === sgn(r.v0)).length;
    const keepP = rs.filter((r) => r.variants[name].status === (r.status0 === "P+" ? "P+" : "P-")).length, flip = rs.filter((r) => r.variants[name].status === (r.status0 === "P+" ? "P-" : "P+")).length;
    const ret = median(rs.map((r) => r.variants[name].v / r.v0));
    o[lab] = { n: rs.length, signAgree: same, signAgreeFrac: +(same / rs.length).toFixed(3), stillPresentSameSign: keepP, presentOppositeSign: flip, medianRetention: ret == null ? null : +ret.toFixed(3), medianV: +median(rs.map((r) => r.variants[name].v)).toFixed(4), medianV0: +median(rs.map((r) => r.v0)).toFixed(4) };
  }
  const nP = run.filter((r) => r.variants[name].status === "P+").length, nM = run.filter((r) => r.variants[name].status === "P-").length;
  o.lawLevel = { nPplus: nP, nPminus: nM, reversal: nP >= 3 && nM >= 3 };
  out.variants[name] = o;
}
fs.writeFileSync(path.join(HERE, "A_summary.json"), JSON.stringify(out, null, 1));
for (const [n, o] of Object.entries(out.variants)) console.log(n.padEnd(14), `run ${o.nRun}/skip ${o.nSkipped}`, `P+ base: sign ${o.basePplus?.signAgree}/${o.basePplus?.n} keepP ${o.basePplus?.stillPresentSameSign} flipP ${o.basePplus?.presentOppositeSign} ret ${o.basePplus?.medianRetention}`, `| P- base: sign ${o.basePminus?.signAgree}/${o.basePminus?.n} keepP ${o.basePminus?.stillPresentSameSign} flipP ${o.basePminus?.presentOppositeSign} ret ${o.basePminus?.medianRetention}`, `| law ${o.lawLevel.nPplus}+ ${o.lawLevel.nPminus}-`);
console.log("base matches atlas", out.baseMatchesAtlas, "/", out.nPockets);
