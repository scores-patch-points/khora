// addendum.mjs -- POST-HOC DESCRIPTIVE ADDENDUM, written AFTER results/confirmation.json was read. Not part of the registered verdict (analyse.mjs header sha256 is unchanged). Everything here is exploratory and labelled so in the output:
//   (A) R_INIT as a stream-only rival at fixed untuned thresholds: matched sensitivity/specificity and false-alarm rate / PPV in the natural sample;  (B) the S_ENTRY x R_INIT cross-table on matched pairs and S_ENTRY's AUC among pairs with equal R_INIT group;
//   (C) which forms are the natural-sample false alarms of S_ENTRY >= 1;  (D) exact paired (sign) tests per UD language for S_ENTRY >= 1 (names vs matched unlabelled), Bonferroni over the evaluated languages.
import fs from "node:fs";
import path from "node:path";
import { HERE, sEntry, ctlOf, burstOf } from "./lib.mjs";
import { aucPN } from "../ablation-scope/stats.mjs";
const design = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design.json"), "utf8")), dir = path.join(HERE, "data", "read"), reads = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".summary.json"))) { const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), m = new Map(); for (const l of fs.readFileSync(path.join(dir, f.replace(".summary.json", ".jsonl")), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); m.set(o.k, o.rec); } reads.set(`${s.doc}|${s.cond}`, m); }
const ST = ["c4_6", "c7_15", "c16p"], round = (x, d = 4) => (typeof x === "number" ? Number(x.toFixed(d)) : x);
const toks = design.tokens.filter((t) => t.cond === "real" && t.grp === "B" && ST.includes(t.stratum)).map((t) => ({ ...t, S: sEntry(reads.get(`${t.doc}|${t.cond}`).get(`${t.s}:${t.i}`).counts) }));
const pairs = new Map(); for (const t of toks) if (t.kind === "pair") (pairs.get(t.pair) ?? pairs.set(t.pair, { arm: t.arm, doc: t.doc, stratum: t.stratum }).get(t.pair))[t.y ? "p" : "n"] = t;
const P = [...pairs.values()].filter((x) => x.p && x.n), nat = toks.filter((t) => t.kind === "nat");
const ARMS = { ENGLISH_UNTOUCHED: ["E_CORE", "E_SRV"], E_REUSE: ["E_REUSE"], X: ["X_DE", "X_ES", "X_IT"] };
const out = { note: "POST-HOC / EXPLORATORY; not part of the registered verdict" };
// (A) R_INIT thresholds
out.A_rinit = {};
for (const [k, arms] of Object.entries(ARMS)) { const ps = P.filter((x) => arms.includes(x.arm)), nn = nat.filter((x) => arms.includes(x.arm)); out.A_rinit[k] = { pairs: ps.length, auc: round(aucPN(ps.map((x) => x.p.rinit), ps.map((x) => x.n.rinit))) };
  for (const th of [0.1, 0.25, 0.5]) { const tpr = ps.filter((x) => x.p.rinit >= th).length / ps.length, tnr = ps.filter((x) => x.n.rinit < th).length / ps.length, fpr = nn.filter((x) => x.rinit >= th).length / nn.length;
    out.A_rinit[k][`th${th}`] = { sensMatched: round(tpr), specMatched: round(tnr), naturalFpr: round(fpr), naturalFlagged: nn.filter((x) => x.rinit >= th).length, naturalN: nn.length }; }
  const tprS = ps.filter((x) => x.p.S >= 1).length / ps.length, fprS = nn.filter((x) => x.S >= 1).length / nn.length; out.A_rinit[k].SENTRY = { sensMatched: round(tprS), naturalFpr: round(fprS) }; }
// natural PPV for R_INIT and S_ENTRY, pooled over strata with candidate counts of the design report
const rep = JSON.parse(fs.readFileSync(path.join(HERE, "results", "design-report.json"), "utf8"));
const cand = (arms, st) => { let p = 0, n = 0; for (const a of arms) for (const v of Object.values(rep.arms[a].perDay)) { const c = v.candidateCounts?.[`B:${st}`]; if (c) { p += c.P; n += c.N; } } return [p, n]; };
out.A_ppv = {};
for (const [k, arms] of Object.entries(ARMS)) { const res = {}; for (const [lab, flag] of [["S_ENTRY>=1", (t) => t.S >= 1], ["R_INIT>=0.25", (t) => t.rinit >= 0.25], ["R_INIT>=0.5", (t) => t.rinit >= 0.5]]) { let tp = 0, fp = 0;
    for (const st of ST) { const ps = P.filter((x) => arms.includes(x.arm) && x.stratum === st), nn = nat.filter((x) => arms.includes(x.arm) && x.stratum === st); if (!ps.length || !nn.length) continue; const [cp, cn] = cand(arms, st); tp += (ps.filter((x) => flag(x.p)).length / ps.length) * cp; fp += (nn.filter(flag).length / nn.length) * cn; }
    res[lab] = { ppvPooled: round(tp / (tp + fp)), expectedFlaggedNames: round(tp, 1), expectedFlaggedUnlabelled: round(fp, 1) }; } out.A_ppv[k] = res; }
// (B) cross-table and S_ENTRY AUC within equal R_INIT group
const eng = P.filter((x) => ["E_CORE", "E_SRV", "E_REUSE"].includes(x.arm)), cell = (x) => `${x.rinit >= 0.25 ? "R+" : "R-"}`;
out.B_cross = { pairsEnglish: eng.length, names: {}, unlabelled: {}, sentryAucWithinSameRinitGroup: {} };
for (const g of ["R+", "R-"]) { const nm = eng.filter((x) => cell(x.p) === g), un = eng.filter((x) => cell(x.n) === g); out.B_cross.names[g] = { n: nm.length, sEntryGe1: nm.length ? round(nm.filter((x) => x.p.S >= 1).length / nm.length) : null }; out.B_cross.unlabelled[g] = { n: un.length, sEntryGe1: un.length ? round(un.filter((x) => x.n.S >= 1).length / un.length) : null };
  const both = eng.filter((x) => cell(x.p) === g && cell(x.n) === g); out.B_cross.sentryAucWithinSameRinitGroup[g] = both.length >= 6 ? { pairs: both.length, auc: round(aucPN(both.map((x) => x.p.S), both.map((x) => x.n.S))) } : { pairs: both.length }; }
// (C) natural false alarms of S_ENTRY >= 1
out.C_falseAlarmForms = {}; for (const [k, arms] of Object.entries(ARMS)) { const cnt = new Map(); for (const t of nat.filter((x) => arms.includes(x.arm) && x.S >= 1)) cnt.set(t.w, (cnt.get(t.w) ?? 0) + 1); out.C_falseAlarmForms[k] = [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 25); }
// (D) UD exact paired tests
const ud = [...pairs.values()].filter((x) => x.arm === "UD" && x.p && x.n), langs = [...new Set(ud.map((x) => x.doc))], lr = [];
const binomTail = (k, n) => { let s = 0, c = 1; for (let i = 0; i <= n; i++) { if (i > 0) c = (c * (n - i + 1)) / i; if (i >= k) s += c; } return s / 2 ** n; };
for (const d of langs) { const ps = ud.filter((x) => x.doc === d); const b = ps.filter((x) => x.p.S >= 1 && x.n.S === 0).length, c = ps.filter((x) => x.p.S === 0 && x.n.S >= 1).length; if (ps.length >= 15) lr.push({ lang: d, pairs: ps.length, nameOnly: b, unlabelledOnly: c, pOneSided: b + c ? binomTail(b, b + c) : 1 }); }
const K = lr.length; out.D_ud = { languagesTested: K, bonferroniAlpha: round(0.05 / Math.max(1, K), 5), top: lr.sort((a, b) => a.pOneSided - b.pOneSided).slice(0, 8).map((r) => ({ ...r, pOneSided: round(r.pOneSided, 5), pBonferroni: round(Math.min(1, r.pOneSided * K), 4) })) };
fs.writeFileSync(path.join(HERE, "results", "addendum.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
