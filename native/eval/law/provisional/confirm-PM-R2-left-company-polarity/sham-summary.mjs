// confirm-PM-R2-left-company-polarity/sham-summary.mjs -- summary of posthoc-sham.mjs against the registered real cells (rule stated in posthoc-sham.mjs's header: calibrated iff empirical two-sided p <= 0.05). NEW FILE.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { round, mean, quantile } from "../polarity-map/lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "results");
const rd = (re) => fs.readdirSync(RES).filter((f) => re.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const conf = rd(/^conf\..*\.jsonl$/).filter((r) => r.ctl === "real" && r.DLx), sh = rd(/^sham\..*\.jsonl$/), reg = Object.fromEntries(conf.map((c) => [c.reg, c]));
const out = { rows: {}, fam: {} };
for (const s of sh) {
  const c = reg[s.reg]; if (!c || c.pairs < 60 || s.nSham < 10) continue;
  const d = Math.abs(c.DLx.auc - 0.5), ge = s.sham.filter((a) => Math.abs(a - 0.5) >= d - 1e-12).length, p = round((ge + 1) / (s.nSham + 1)), z = s.shamSd ? round((c.DLx.auc - s.shamMean) / s.shamSd) : null;
  out.rows[s.reg] = { fam: s.fam, real: c.DLx.auc, shamMean: s.shamMean, shamSd: s.shamSd, shamMin: round(Math.min(...s.sham)), shamMax: round(Math.max(...s.sham)), pEmp: p, z, calibrated: p <= 0.05, posCtl: c.posControlOk, freqCtl: c.freqControlOk, pairs: c.pairs };
}
for (const f of ["code", "irc", "book", "ud"]) {
  const rs = Object.entries(out.rows).filter(([, r]) => r.fam === f), sd = rs.map(([, r]) => r.shamSd).filter((x) => x), cal = rs.filter(([, r]) => r.calibrated);
  out.fam[f] = { n: rs.length, calibrated: cal.length, calibratedAbove: cal.filter(([, r]) => r.real > 0.5).length, calibratedBelow: cal.filter(([, r]) => r.real < 0.5).length, medShamSd: round(quantile(sd, 0.5)), medShamMean: round(quantile(rs.map(([, r]) => r.shamMean), 0.5)), expectedFalse: round(0.05 * rs.length) };
}
fs.writeFileSync(path.join(RES, "sham-summary.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ fam: out.fam, nonUd: Object.fromEntries(Object.entries(out.rows).filter(([, r]) => r.fam !== "ud")) }, null, 1));
