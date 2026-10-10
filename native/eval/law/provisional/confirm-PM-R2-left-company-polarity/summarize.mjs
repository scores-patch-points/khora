// confirm-PM-R2-left-company-polarity/summarize.mjs -- assembles the headline numbers of the registered run (verdict.json), the post hoc count-caliper run (posthoc-verdict.json) and the sham ensemble (sham-summary.json) into results/summary.json. NEW FILE; computes nothing new except family medians.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { round, quantile } from "../polarity-map/lib.mjs";
const RES = path.join(path.dirname(fileURLToPath(import.meta.url)), "results"), J = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));
const V = J("verdict.json"), H = J("posthoc-verdict.json"), S = J("sham-summary.json");
const med = (a) => (a.length ? round(quantile(a, 0.5)) : null), fam = (T, f, key) => Object.values(T.tables.registers).filter((r) => r.fam === f && typeof r[key] === "number");
const ph = (n) => { const l = fs.readFileSync(path.join(RES, "ph.irc.jsonl"), "utf8").split("\n").filter(Boolean).map((x) => JSON.parse(x)).find((r) => r.reg === n && r.ctl === "real"); return l ? { pairs: l.pairs, auc: l.DLx.auc, lo: l.DLx.lo, hi: l.DLx.hi, ctrl: l.ctrl } : null; };
const out = { registered: { verdict: V.verdict, P: V.P, controls: V.controls, rhoVariants: V.report.rho, signAccuracy: V.report.signAccuracy, validity: V.report.validity, positionOnlyValidity: V.posthoc },
  postHocCountCaliper: { P: H.P, rhoVariants: H.report.rho, validity: H.report.validity },
  shamEnsemble: S.fam, shamNonUd: Object.fromEntries(Object.entries(S.rows).filter(([, r]) => r.fam !== "ud")),
  familyMedians: Object.fromEntries(["irc", "code", "book", "ud"].map((f) => [f, { registeredAll: med(fam(V, f, "DLx").map((r) => r.DLx)), registeredValid: med(fam(V, f, "DLx").filter((r) => r.valid).map((r) => r.DLx)), countCaliperAll: med(fam(H, f, "DLx").map((r) => r.DLx)), n: fam(V, f, "DLx").length, rareL_edgeMedian: med(fam(V, f, "rareL_edge").map((r) => r.rareL_edge)) }])),
  ircPooled37PostHoc: ph("irc-pooled37"), ircPooled37Registered: V.tables.registers["irc-pooled37"] ?? null };
fs.writeFileSync(path.join(RES, "summary.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ familyMedians: out.familyMedians, ircPooled37PostHoc: out.ircPooled37PostHoc }, null, 1));
