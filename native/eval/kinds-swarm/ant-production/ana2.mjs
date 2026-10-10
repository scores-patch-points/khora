// ana2.mjs — POST-HOC diagnostics (dated amendment A1 in REPORT.md, written after reading ana.mjs on wp: deranged survival 1.14, shuffle 0.98):
// (a) prior-vocabulary coverage: is the token's form a form of the declared language's POS prior (deranging keeps the SET of forms), (b) single-feature AUCs,
// (c) separation inside the seen / unseen strata, (d) referent-index-only non-null share (the earlier probe's definition).  node ana2.mjs <corpus>
import fs from "node:fs";
import path from "node:path";
import { loadCorpus, loadArm, rivals, realFeat, REAL_NAMES, cvScores, aucOf, round, share, resultsDir } from "./ana-lib.mjs";
import { grammarOf } from "./lib.mjs";
const name = process.argv[2], CT = process.argv[3] ?? null, corpus = loadCorpus(name), riv = rivals(corpus), forms = grammarOf(corpus.language).posPrior.forms;
const seenOf = (w) => { const c = forms[w]; if (!c) return false; const t = Object.values(c).reduce((a, b) => a + b, 0); return t >= 1 && (c.X ?? 0) / t < 0.5; };
const ARMS = (process.env.ARMS ?? "real,deranged,company,null,shuffle").split(",").filter((a) => loadArm(name, a).length);
const keyset = (arm) => new Set(loadArm(name, arm).filter((r) => !CT || r.ctl === "N" || r.ctl === CT).map((r) => r.key));
let common = null; for (const a of ARMS.filter((x) => x !== "shuffle")) { const ks = keyset(a); common = common ? new Set([...common].filter((k) => ks.has(k))) : ks; }
const out = { corpus: name, arms: {} };
const refNN = (r) => r.ownDelta + r.refChanged + r.refBorn + r.refLost > 0;
for (const arm of ARMS) {
  const rows = loadArm(name, arm).filter((r) => !CT || r.ctl === "N" || r.ctl === CT).filter((r) => arm === "shuffle" || common.has(r.key)).sort((a, b) => a.n - b.n), A = (out.arms[arm] = { n: rows.length });
  rows.forEach((r) => { r.seen = seenOf(r.w); });
  const nm = rows.filter((r) => r.y === 1), ct = rows.filter((r) => r.y === 0);
  A.seenShare = { NAME: round(share(nm.map((r) => r.seen))), CTL: round(share(ct.map((r) => r.seen))) };
  A.refNonNull = { NAME: round(share(nm.map(refNN))), CTL: round(share(ct.map(refNN))) };
  A.singleAUC = {};
  const feats = rows.map(realFeat), y = rows.map((r) => r.y);
  REAL_NAMES.forEach((f, j) => { A.singleAUC[f] = round(aucOf(feats.map((v) => v[j]), y)); });
  const rv = rows.map(riv); A.singleAUC.FREQ_n = round(aucOf(rv.map((v) => v.FREQ[0]), y)); A.singleAUC.seen = round(aucOf(rows.map((r) => (r.seen ? 1 : 0)), y));
  A.strata = {};
  for (const [lab, flag] of [["seen", true], ["unseen", false]]) {
    const idx = rows.map((_, k) => k).filter((k) => rows[k].seen === flag), a = idx.filter((k) => y[k] === 1), b = idx.filter((k) => y[k] === 0);
    const S = { nName: a.length, nCtl: b.length };
    S.ownExists = { NAME: round(share(a.map((k) => rows[k].ownExists))), CTL: round(share(b.map((k) => rows[k].ownExists))) };
    S.refNonNull = { NAME: round(share(a.map((k) => refNN(rows[k])))), CTL: round(share(b.map((k) => refNN(rows[k])))) };
    if (a.length >= 8 && b.length >= 8) {
      const yy = idx.map((k) => y[k]), bl = idx.map((k) => rows[k].block);
      S.auc_REAL_cv = round(aucOf(cvScores(idx.map((k) => feats[k]), yy, bl), yy) ?? 0.5);
      S.auc_FREQPOS_cv = round(aucOf(cvScores(idx.map((k) => [...rv[k].FREQ, ...rv[k].POS]), yy, bl), yy) ?? 0.5);
      S.auc_REALFREQPOS_cv = round(aucOf(cvScores(idx.map((k) => [...feats[k], ...rv[k].FREQ, ...rv[k].POS]), yy, bl), yy) ?? 0.5);
      S.auc_ownExists_raw = round(aucOf(idx.map((k) => rows[k].ownExists), yy));
    }
    A.strata[lab] = S;
  }
}
fs.writeFileSync(path.join(resultsDir, `analysis2-${name}${CT ? "-" + CT : ""}.json`), JSON.stringify(out, null, 1));
for (const [arm, A] of Object.entries(out.arms)) { console.log(`== ${name} ${CT ?? ""} ${arm} n=${A.n} seen N/C ${A.seenShare.NAME}/${A.seenShare.CTL} refNonNull N/C ${A.refNonNull.NAME}/${A.refNonNull.CTL}`); console.log("  single AUC", JSON.stringify(A.singleAUC)); for (const [l, S] of Object.entries(A.strata)) console.log(`  ${l}:`, JSON.stringify(S)); }
