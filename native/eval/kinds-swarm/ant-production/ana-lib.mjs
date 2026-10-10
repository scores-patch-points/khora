// ana-lib.mjs — features, learners and statistics of the ant-production analysis. Learner = eval/law/name-war-and-peace.mjs (cvScores, fitLogit, ...), unchanged.
import fs from "node:fs";
import path from "node:path";
import { loadCorpus, HERE, round, mean, quantile, mulberry32, seedOf } from "./lib.mjs";
import { docStarts } from "./sample.mjs";
import { cvScores, fitLogit, predict, standardise, aucOf, bootDiff } from "../../law/name-war-and-peace.mjs";
export { cvScores, fitLogit, predict, standardise, aucOf, bootDiff, round, mean, quantile, mulberry32, seedOf, loadCorpus };
export const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
export const resultsDir = path.join(HERE, "results");
export function loadArm(corpus, arm) { return readJsonl(path.join(resultsDir, `tok-${corpus}-${arm}.jsonl`)); }
const L = Math.log1p;
export const REAL_NAMES = ["ownExists", "ownMentions", "refAbs", "refBornLost", "relLost", "relBorn", "relCollateral", "kindFlips"];
export const realFeat = (r) => [r.ownExists, L(r.ownMentions), L(r.refAbs), L(r.refBorn + r.refLost), L(r.relLost), L(r.relBorn), L(r.relCollateral), L(r.kindFlips)];
// causal rivals from the corpus itself (no gold): FREQ, POS, COMPANY-LITE
export function rivals(corpus) {
  const ds = docStarts(corpus), { sents, M } = corpus;
  const cnt = new Map(); for (const st of sents) for (const t of st) cnt.set(t.w, (cnt.get(t.w) ?? 0) + 1);
  return (u) => {
    const lo = Math.max(ds[u.s], u.s - M); let n = 0, df = 0, last = null;
    for (let k = lo; k <= u.s; k++) {
      const st = sents[k]; let hit = false;
      for (let j = 0; j < (k === u.s ? u.i : st.length); j++) if (st[j].w === u.w) { n += 1; hit = true; }
      if (hit) { df += 1; last = k; }
    }
    const st = sents[u.s], left = u.i > 0 ? st[u.i - 1].w : null, right = u.i + 1 < st.length ? st[u.i + 1].w : null;
    return {
      FREQ: [L(n), L(last == null ? 5000 : u.s - last), L(df)],
      POS: [u.i, u.i === 0 ? 1 : 0, u.i === st.length - 1 ? 1 : 0, st.length],
      COMPANY: [L(cnt.get(left) ?? 0), L(cnt.get(right) ?? 0), u.i === 0 ? 1 : 0, u.i === st.length - 1 ? 1 : 0],
    };
  };
}
export const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);
export function oneHot(labels, levels) { return labels.map((l) => levels.map((v) => (v === l ? 1 : 0))); }
// kinds with >= floor rows keep their own signature; the rest are "other"
export function kindLevels(rows, floor = 8) {
  const c = new Map(); for (const r of rows) c.set(r.kindSig, (c.get(r.kindSig) ?? 0) + 1);
  const keep = [...c].filter(([, n]) => n >= floor).map(([k]) => k).sort();
  return { keep, of: (r) => (keep.includes(r.kindSig) ? r.kindSig : "other") };
}
// leave-one-block-out with a SEPARATE ridge-logistic inside each kind stratum (strata with >= minRows training rows and both classes); others use the pooled fit
export function cvConditioned(X, y, block, strata, minRows = 12) {
  const out = new Array(X.length).fill(null);
  for (const b of [...new Set(block)]) {
    const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || tr.length < 20) continue;
    const fit = (rows) => { const [Xs, Xt] = standardise(rows.map((r) => X[r]), te.map((r) => X[r])); if (!Xs[0]?.length || new Set(rows.map((r) => y[r])).size < 2) return null; return { w: fitLogit(Xs, rows.map((r) => y[r])), std: standardise(rows.map((r) => X[r]), te.map((r) => X[r]))[1] }; };
    const pooled = fit(tr);
    const per = new Map();
    for (const st of new Set(strata)) { const rows = tr.filter((r) => strata[r] === st); if (rows.length >= minRows && new Set(rows.map((r) => y[r])).size === 2) per.set(st, fit(rows)); }
    te.forEach((r, k) => {
      const m = per.get(strata[r]) ?? pooled; if (!m) return;
      // standardisation inside a stratum fit differs from pooled: re-standardise this row with its own fit's training rows
      const rows = per.has(strata[r]) ? tr.filter((q) => strata[q] === strata[r]) : tr;
      const [, Xt] = standardise(rows.map((q) => X[q]), [X[r]]);
      out[r] = predict(m.w, Xt[0]);
    });
  }
  return out;
}
export function auc(scores, y) { return aucOf(scores, y); }
