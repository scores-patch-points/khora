// freeze.mjs: fit the dev models once and write the frozen coefficients/thresholds (results/frozen.dev.json) that confirm.mjs reads. Dev only; no test file.
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: bookkeeping after moderators.dev.json and robust.dev.json were seen. It fits (i) LATER: AUC ~ M1 FWC32 + M3 log2 pairs (the best-of-7 model, sign-valid),
//   (ii) LATER and FIRST: AUC ~ M1 alone (stream-observable, no label), and writes, for the M1-only models, the FWC32 value T at which the dev fit predicts AUC = 0.60.
//   FIRST uses M1 only because M3 has the wrong sign there (not predicted, skill ~ 0) and M2 adds nothing over M1 (M1+M2 skill 0.225 < M1 0.231). No thresholds are tuned.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, headerSha } from "./util.mjs";
import { fitOls } from "./stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), LAW = path.join(HERE, "..", "..");
const own = JSON.parse(fs.readFileSync(path.join(LAW, "results/name-company-pairblocks/own.json"), "utf8")), D = JSON.parse(fs.readFileSync(path.join(HERE, "results/descriptors.dev.json"), "utf8")).languages;
const STR = { LATER: "BOTH", FIRST: "LEFT" }, F = { headerSha256: headerSha(import.meta.url), devMeanAuc: {}, models: {} };
for (const st of ["LATER", "FIRST"]) {
  const langs = Object.keys(own).filter((l) => !own[l][st].thin && D[l]), y = langs.map((l) => own[l][st][STR[st]]); F.devMeanAuc[st] = round(mean(y), 5);
  const x1 = langs.map((l) => D[l].FWC32), x3 = langs.map((l) => Math.log2(own[l][st].pairs)), f1 = fitOls(x1.map((v) => [v]), y), T = f1.mu[0] + (f1.s[0] * (0.6 - f1.w[0])) / f1.w[1];
  F.models[st + "_M1"] = { w: f1.w, mu: f1.mu, s: f1.s, T60: round(T, 4), n: langs.length, devClassAtT: langs.map((l, i) => ({ l, fwc: round(x1[i]), auc: y[i], pairs: own[l][st].pairs, inScope: x1[i] >= T, audible: y[i] >= 0.6 })) };
  if (st === "LATER") { const f13 = fitOls(x1.map((v, i) => [v, x3[i]]), y); F.models.LATER_M1M3 = { w: f13.w, mu: f13.mu, s: f13.s, n: langs.length }; }
}
fs.writeFileSync(path.join(HERE, "results/frozen.dev.json"), JSON.stringify(F, null, 1));
for (const k of Object.keys(F.models)) { const m = F.models[k]; console.log(k, "T60", m.T60, "w", m.w.map((v) => round(v, 4)), "mu", m.mu.map((v) => round(v, 4)), "s", m.s.map((v) => round(v, 4))); }
for (const st of ["LATER", "FIRST"]) { const rows = F.models[st + "_M1"].devClassAtT, ins = rows.filter((r) => r.inScope), out = rows.filter((r) => !r.inScope); const big = (a) => a.filter((r) => r.pairs >= 250);
  console.log(st, "inScope", ins.length, "audible", ins.filter((r) => r.audible).length, "| pairs>=250:", big(ins).length, big(ins).filter((r) => r.audible).length, "|| out", out.length, out.filter((r) => r.audible).length, "| pairs>=250:", big(out).length, big(out).filter((r) => r.audible).length);
  console.log("  in-scope fails:", ins.filter((r) => !r.audible).map((r) => r.l + ":" + r.auc + "/" + r.pairs).join(" "), "| out-of-scope audible:", out.filter((r) => r.audible).map((r) => r.l + ":" + r.auc + "/" + r.pairs).join(" ")); }
