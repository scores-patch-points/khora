// attack-PM-R2-left-company-polarity/summarize-C2.mjs -- mechanical summary of results/C2.*.jsonl (criteria fixed in attack-C2-dispersion.mjs's header). NEW FILE.  node summarize-C2.mjs -> results/C2-summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, round, rngFor, seedFor, quantile } from "./attack-lib.mjs";
const RES = path.join(HERE, "results"), all = fs.readdirSync(RES).filter((f) => /^C2\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))).filter((r) => r.pairs > 0);
const med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const pooled = (cs, tag) => { const cl = [], wins = []; let off = 0; for (const c of cs) { for (let k = 0; k < c.wins.length; k++) { wins.push(c.wins[k] === "1" ? 1 : c.wins[k] === "0" ? 0 : 0.5); cl.push(c.cl[k] + off); } off += Math.max(...c.cl) + 1; }
  if (!wins.length) return null; const by = new Map(); wins.forEach((w, k) => { const a = by.get(cl[k]) ?? by.set(cl[k], [0, 0]).get(cl[k]); a[0] += w; a[1]++; }); const S = [...by.values()], est = wins.reduce((a, b) => a + b, 0) / wins.length, rnd = rngFor(seedFor("pm-r2-attack-C2", "pool", tag)), bs = [];
  for (let b = 0; b < 400; b++) { let s = 0, m = 0; for (let t = 0; t < S.length; t++) { const c = S[Math.floor(rnd() * S.length)]; s += c[0]; m += c[1]; } bs.push(s / m); } return { auc: round(est), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), pairs: wins.length }; };
const out = {};
for (const fam of ["irc", "code", "book", "ud"]) { const cs = all.filter((c) => c.fam === fam), val = cs.filter((c) => c.valid); if (!cs.length) continue;
  out[fam] = { cells: cs.length, valid: val.length, medAll: med(cs.map((c) => c.DLx.auc)), medValid: med(val.map((c) => c.DLx.auc)), pooledAll: pooled(cs, fam + "all"), pooledValid: pooled(val, fam + "val"), NEG: val.filter((c) => c.DLx.hi < 0.5 && c.DLx.auc <= 0.47).length, POS: val.filter((c) => c.DLx.lo > 0.5 && c.DLx.auc >= 0.53).length,
    perReg: fam === "ud" ? undefined : Object.fromEntries(cs.map((c) => [c.reg, { pairs: c.pairs, auc: c.DLx.auc, lo: c.DLx.lo, hi: c.DLx.hi, valid: c.valid, ctrl: c.ctrl, Dobs: c.Dobs }])) }; }
fs.writeFileSync(path.join(RES, "C2-summary.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
