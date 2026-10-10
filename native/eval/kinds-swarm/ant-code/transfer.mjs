// transfer.mjs -- ant-code T3 (JS <-> PY) and T4 (code <-> UD-English PROPN, code -> IRC nicknames round C). usage: node transfer.mjs [--B 1000]
// Fit on all rows of the source (ridge-logistic, features standardised on the source; variant z = each corpus z-scored separately), score the target, AUC with a bootstrap over target blocks
// and a label-permutation null within target block (fixed scores). Arms available for every target: FULL; for code/UD also SHAPE24, MAGNITUDE, COMPANY, RIVALS.
import fs from "node:fs"; import path from "node:path";
import { loadRecs, dataset, transferScores, ARMS2, bootAuc, aucIdx, auc1, rngFor, seedFor, quantile, round, mean } from "./ana_lib.mjs";
const B = Number(process.argv.includes("--B") ? process.argv[process.argv.indexOf("--B") + 1] : 1000);
const rowsOf = (lang, variant = "np") => dataset(loadRecs(lang, variant), "later", lang === "ud" ? "E" : "A", lang);
const IRC = "/Users/mlacy/Documents/3.0/khora/native/eval/kinds-swarm/ant-adversary/data/irc";
function ircRows(stratum) {
  const out = [];
  for (const f of fs.readdirSync(IRC).filter((x) => x.startsWith("C-") && x.endsWith(".json")).sort()) { const d = JSON.parse(fs.readFileSync(path.join(IRC, f), "utf8")); d.rows.forEach((r) => { if (r.stratum === stratum) out.push({ ...r, block: f, lang: "irc", s: r.s, N: d.msgs ?? 1 }); }); }
  return out;
}
function permQ95(scores, y, blocks, Bn, seed) {
  const by = new Map(); blocks.forEach((b, k) => (by.get(b) ?? by.set(b, []).get(b)).push(k)); const rnd = rngFor(seed), out = [], all = scores.map((_, k) => k);
  for (let t = 0; t < Bn; t++) { const yp = y.slice(); for (const ks of by.values()) { const lab = ks.map((k) => y[k]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } ks.forEach((k, n) => { yp[k] = lab[n]; }); } out.push(aucIdx(scores, yp, all)); }
  return round(quantile(out, 0.95));
}
function run(name, train, test, armNames, z) {
  const y = test.map((r) => r.y), blocks = test.map((r) => r.block), res = { name, z, nTrain: train.length, nTest: test.length, nPos: y.filter((v) => v === 1).length, arms: {} };
  for (const a of armNames) {
    const sc = transferScores(train, test, ARMS2[a], { z }); if (sc.every((v) => v == null)) continue;
    const auc = aucIdx(sc, y, test.map((_, k) => k)); const bt = bootAuc([sc], y, blocks, 500, seedFor("ant-code", "tb", name, a));
    res.arms[a] = { auc: round(auc), ci: bt.ci[0], permQ95: permQ95(sc, y, blocks, B, seedFor("ant-code", "tp", name, a)) };
  }
  return res;
}
const FULLONLY = ["FULL"], ALL = ["FULL", "SHAPE24", "MAGNITUDE", "COMPANY", "RIVALS"];
const js = rowsOf("js"), py = rowsOf("py"), ud = rowsOf("ud"), irc = { INIT: ircRows("INIT"), NONINIT: ircRows("NONINIT") };
const code = [...js, ...py];
const jobs = [["T3 js->py", js, py, ALL], ["T3 py->js", py, js, ALL], ["T4 js->ud", js, ud, ALL], ["T4 py->ud", py, ud, ALL], ["T4 code->ud", code, ud, ALL], ["T4 ud->js", ud, js, ALL], ["T4 ud->py", ud, py, ALL], ["T4 ud->code", ud, code, ALL],
  ["T4 js->irc-INIT", js, irc.INIT, FULLONLY], ["T4 js->irc-NONINIT", js, irc.NONINIT, FULLONLY], ["T4 py->irc-INIT", py, irc.INIT, FULLONLY], ["T4 py->irc-NONINIT", py, irc.NONINIT, FULLONLY],
  ["T4 code->irc-INIT", code, irc.INIT, FULLONLY], ["T4 code->irc-NONINIT", code, irc.NONINIT, FULLONLY], ["T4 irc-NONINIT->js", irc.NONINIT, js, FULLONLY], ["T4 irc-NONINIT->py", irc.NONINIT, py, FULLONLY], ["T4 irc-INIT->ud", irc.INIT, ud, FULLONLY], ["T4 ud->irc-NONINIT", ud, irc.NONINIT, FULLONLY]];
const out = []; fs.mkdirSync("results", { recursive: true });
for (const [name, tr, te, arms] of jobs) for (const z of [false, true]) { if (!tr.length || !te.length) continue; const r = run(name, tr, te, arms, z); out.push(r); console.log(name, z ? "z" : "raw", JSON.stringify(Object.fromEntries(Object.entries(r.arms).map(([k, v]) => [k, `${v.auc} [${v.ci}] q95 ${v.permQ95}`])))); fs.writeFileSync("results/transfer.json", JSON.stringify(out)); }
