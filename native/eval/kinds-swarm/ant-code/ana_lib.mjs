// ana_lib.mjs -- ant-code analysis helpers: dataset builders from data/rec, arms, CV with block bootstrap and permutation null (ridge-logistic via ant-shape/cvlib.mjs).
import fs from "node:fs"; import path from "node:path";
import { rngFor, seedFor } from "../../law/impact.mjs";
import { F, ARMS, buildFolds, foldScores, permNull, transferScores, featAuc, mean, quantile, round } from "../ant-shape/cvlib.mjs";
import { DATA, auc1 } from "./lib.mjs";
export { F, ARMS, buildFolds, foldScores, permNull, transferScores, featAuc, mean, quantile, round, auc1, rngFor, seedFor, DATA };
export const NFILES = { js: 12, py: 12, rb: 8, ud: 1 };
export function loadRecs(lang, variant) {
  const out = [];
  for (let idx = 0; idx < NFILES[lang]; idx++) { const f = path.join(DATA, "rec", `${lang}-${variant}-${idx}.json`); if (fs.existsSync(f)) out.push(JSON.parse(fs.readFileSync(f, "utf8"))); }
  return out;
}
const smpCache = {};
const unitsOf = (lang, idx) => { const f = path.join(DATA, "sample", `${lang}.json`); smpCache[lang] ??= JSON.parse(fs.readFileSync(f, "utf8")); return smpCache[lang].files[idx].units; };
/** dataset rows: kind later|first, pool E|O|A (A = E u O, positives once) | N (first). Each row: record + y + block + file. */
export function dataset(parts, kind, pool, lang, M = 128) {
  const rows = [], seenPos = new Set();
  for (const p of parts) {
    const N = unitsOf(lang, p.idx);
    const pools = pool === "A" ? ["E", "O"] : [pool];
    for (const pn of pools) for (const pr of p.pairs[kind]?.[pn] ?? []) {
      const pos = p.recs[pr.p], neg = p.recs[pr.n]; if (!pos || !neg) continue;
      const blk = (r) => (lang === "ud" ? Math.min(7, Math.floor(((r.meta.s - M) / Math.max(1, N - M)) * 8)) : p.idx);
      if (!seenPos.has(`${p.idx}:${pr.p}`)) { seenPos.add(`${p.idx}:${pr.p}`); rows.push({ ...pos, y: 1, block: blk(pos), file: p.idx, N, i: pos.meta.i, s: pos.meta.s, lang, nCls: "U" }); }
      rows.push({ ...neg, y: 0, block: blk(neg), file: p.idx, N, i: neg.meta.i, s: neg.meta.s, lang, nCls: pr.nCls ?? pn });
    }
  }
  return rows;
}
export const COMPANY = (r) => r.company;
export const SENTRY = (r) => { let t = 0; for (let b = 0; b < 3; b++) for (let k = 0; k < 6; k++) t += r.counts[(3 * 3 + b) * 6 + k]; return t; };
export const SCALARS = { S_ENTRY: SENTRY, LOCALCOUNT: (r) => r.rivals[0], BURST: (r) => r.rivals[4], RECENCY: (r) => -r.rivals[2], UNITLEN: (r) => r.rivals[14], INDEX: (r) => r.i, WORDLEN: (r) => r.rivals[15] };
export const ARMS2 = { ...ARMS, COMPANY: [COMPANY], "FULL+COMPANY": [F.FULL, COMPANY] };
export function aucIdx(scores, y, idx) { const ii = idx.filter((k) => scores[k] != null); return ii.length ? auc1(ii.map((k) => scores[k]), ii.map((k) => y[k])) : null; }
export function bootAuc(scoresList, y, blocks, B = 1000, seed = 1) { // scoresList: array of score arrays (paired); returns per-score CI and paired diff vs the first
  const ids = [...new Set(blocks)], by = new Map(); blocks.forEach((b, k) => (by.get(b) ?? by.set(b, []).get(b)).push(k));
  const rnd = rngFor(seed), res = scoresList.map(() => []), diffs = scoresList.map(() => []);
  for (let b = 0; b < B; b++) { const idx = []; for (let t = 0; t < ids.length; t++) idx.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const a = scoresList.map((s) => aucIdx(s, y, idx)); if (a.some((v) => v == null)) continue; a.forEach((v, j) => { res[j].push(v); diffs[j].push(v - a[0]); }); }
  return { ci: res.map((r) => [round(quantile(r, 0.025)), round(quantile(r, 0.975))]), diff: diffs.map((r) => [round(quantile(r, 0.025)), round(quantile(r, 0.975))]) };
}
/** CV for several arms on one dataset; returns {arm: {auc, scores}} and the fold sets (for the permutation null) */
export function cvArms(rows, armNames, { perm = [], B = 200, seed = 1 } = {}) {
  const y = rows.map((r) => r.y), blocks = rows.map((r) => r.block), out = {};
  for (const a of armNames) {
    const folds = buildFolds(rows, ARMS2[a], blocks); const scores = foldScores(folds, y, rows.length);
    out[a] = { scores, auc: round(aucIdx(scores, y, rows.map((_, k) => k))) };
    if (perm.includes(a)) { const nulls = permNull(folds, y, blocks, B, seed); out[a].perm = { q95: round(quantile(nulls, 0.95)), mean: round(mean(nulls)) }; }
  }
  return { out, y, blocks };
}
export const nonNullShare = (rows, y) => { const r = rows.filter((x) => x.y === y); return r.length ? round(r.filter((x) => !x.isNull).length / r.length) : null; };
