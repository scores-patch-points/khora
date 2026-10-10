// summarize.mjs — assembles results/summary.json from the result JSONs (no new computation; discovery = results/discovery.real.fb4.json, confirm = results/confirm.json).
import fs from "node:fs";
const J = (f) => JSON.parse(fs.readFileSync(new URL(`./results/${f}`, import.meta.url), "utf8"));
const D = J("discovery.real.fb4.json"), C = J("confirm.json"), P = J("probe-frame.json"), L = J("explore-limits.json");
const cell = (k) => { const c = C.cells[k]; if (!c) return null; const u = c.strict ?? c.full; return { variant: c.variant, holds: c.holds, n: u?.n ?? c.full.n, days: u?.days ?? c.full.days, auc: u?.auc ?? c.full.auc, ci: u?.ci ?? null, dayCi: u?.dayCi ?? null, tpr: u?.thr?.tpr ?? c.full.thr?.tpr, fpr: u?.thr?.fpr ?? c.full.thr?.fpr, balPrec: u?.thr?.balPrec ?? c.full.thr?.balPrec, beyond: u?.beyondRival, ctl: c.full.ctl, note: c.variant === "VOID" ? "controls out of band (point estimate only)" : c.reason || "" }; };
const dcell = (k, col) => { const c = D.cells[k]; return c ? { n: c.n, days: c.days, ctlOk: c.ctlOk, auc: c.auc[col], ci: c.ci?.[col] } : null; };
const scopes = ["ALL", "EN", "NONEN", "DE", "ES", "IT", "ubuntu", "kubuntu", "xubuntu", "ubuntu-server", "EN_2004-07", "EN_2008-11", "EN_2012-15", "NONEN_2004-11", "NONEN_2012-15", "EN_swarm", "EN_notSwarm"];
const S = { headerSha256: { discover: D.headerSha256, confirm: C.headerSha256 }, selectionSha256: C.selectionSha256, rules: {}, secondary: {}, naturalPrevalence: C.natural, probe: P.cells, limits: L, controls: { wordshuf: C.shuf.wordshuf, msgshuf: C.shuf.msgshuf } };
for (const [rn, col, st] of [["R1", "ISHARE_Cinf", "LATER"], ["R2", "INIT_Tinf", "FIRST"]]) {
  S.rules[rn] = { column: col, theta: C.rules[rn].theta, stratum: st, verdict: C[`verdict_${rn}`], scope: {} };
  for (const sc of scopes) for (const fa of ["ALL", "INIT", "NONINIT"]) { const c = cell(`${rn}|${st}|${sc}|${fa}`); if (c) S.rules[rn].scope[`${sc}|${fa}`] = { confirm: c, discovery: dcell(`${st}|${sc}|${fa}`, col) }; }
}
for (const k of Object.keys(C.secondary)) S.secondary[k] = { n: C.secondary[k].n, confirm: C.secondary[k].auc, discoveryEN: D.cells[k.replace("|", "|") + "|ALL"]?.auc };
fs.writeFileSync(new URL("./results/summary.json", import.meta.url), JSON.stringify(S, null, 1)); console.log("summary written", Object.keys(S.rules.R1.scope).length, Object.keys(S.rules.R2.scope).length);
