// eval/kinds-swarm/ant-shape/cvlib.mjs — feature arms, leave-one-block-out CV with cached folds (PCA never sees labels, so folds are built once and re-used
// under label permutation), transfer fits, small stats. The learner is eval/law/name-war-and-peace.mjs's ridge-logistic (lambda 1.0, no tuning).
import fs from "node:fs";
import path from "node:path";
import { fitPCA, projectPCA, D_IMP, rngFor, seedFor } from "../../law/impact.mjs";
import { fitLogit, predict, standardise, aucOf } from "../../law/name-war-and-peace.mjs";
export { aucOf, rngFor, seedFor };

export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : 0; };
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const here = path.dirname(new URL(import.meta.url).pathname);
export const DATA = process.env.ANT_DATA ?? path.join(here, "data");
export const RES = process.env.ANT_RES ?? path.join(here, "results");

// ── loading ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadLang(stem, dir = "ud") {
  const f = path.join(DATA, dir, `${stem}.json`);
  if (!fs.existsSync(f)) return null;
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  if (!r.rows) return null;
  r.rows.forEach((x) => { x.N = r.N ?? x.N; x.lang = stem; });
  return r;
}
export function loadIrcRows(dir = "irc.json") {
  const f = path.join(DATA, dir);
  if (!fs.existsSync(f)) return null;
  const r = JSON.parse(fs.readFileSync(f, "utf8"));
  r.rows.forEach((x) => { x.lang = "irc"; });
  return r;
}
export const INFORMATIVE_PAIRS = Number(process.env.ANT_INFORMATIVE ?? 60);
export const isInformative = (L) => L && L.rows && L.rows.filter((r) => r.y === 1).length >= INFORMATIVE_PAIRS && L.rows.filter((r) => r.y === 0).length >= INFORMATIVE_PAIRS;

// ── feature arms ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const shape24 = (r) => { const c = new Array(24).fill(0); for (let fam = 0; fam < 4; fam++) for (let b = 0; b < 3; b++) for (let t = 0; t < 6; t++) c[fam * 6 + t] += r.counts[(fam * 3 + b) * 6 + t]; const tot = c.reduce((a, b) => a + b, 0); return tot ? c.map((x) => x / tot) : c; };
const changed = (r) => r.counts.reduce((a, b) => a + b, 0);
export const F = {
  FULL: (r) => [...r.sig, ...r.atm, ...r.span, ...r.c],
  SLOT: (r) => r.sig, ATM: (r) => r.atm, SPAN: (r) => r.span, C: (r) => r.c,
  SHAPE24: shape24,
  MAGNITUDE: (r) => [Math.log1p(changed(r)), Math.log1p(r.extent.tokens ?? 0), Math.log1p(r.extent.frames ?? 0), Math.log1p(r.extent.radius ?? 0), r.isNull ? 1 : 0],
  RIVALS: (r) => r.rivals,
  POSITION: (r) => { const q = Math.min(3, Math.floor((4 * r.s) / Math.max(1, r.N))); return [Math.log1p(r.s), r.s / Math.max(1, r.N), q === 0 ? 1 : 0, q === 1 ? 1 : 0, q === 2 ? 1 : 0]; },
};
export const ARMS = {
  FULL: [F.FULL], SLOT: [F.SLOT], ATM: [F.ATM], SPAN: [F.SPAN], C: [F.C], SHAPE24: [F.SHAPE24], MAGNITUDE: [F.MAGNITUDE], RIVALS: [F.RIVALS], POSITION: [F.POSITION],
  "FULL+RIVALS": [F.FULL, F.RIVALS],
};

// ── fold construction (labels never touched) and scoring ──────────────────────────────────────────────────────────────────────────────────────
function prep(parts, rowsTr, rowsTe) {
  let A = rowsTr.map(() => []), B = rowsTe.map(() => []);
  for (const fn of parts) {
    const Xtr = rowsTr.map(fn), Xte = rowsTe.map(fn);
    if (!Xtr.length || !Xtr[0].length) continue;
    let [a, b] = standardise(Xtr, Xte);
    if (!a[0]?.length) continue;
    if (a[0].length > D_IMP) { const pca = fitPCA(a, D_IMP); a = a.map((r) => projectPCA(pca, r)); b = b.map((r) => projectPCA(pca, r)); }
    A = A.map((r, k) => r.concat(a[k])); B = B.map((r, k) => r.concat(b[k]));
  }
  return { A, B };
}
export function buildFolds(rows, parts, blocks) {
  const ids = [...new Set(blocks)].sort((a, b) => a - b), folds = [];
  for (const b of ids) {
    const tr = [], te = [];
    blocks.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || tr.length < 20) continue;
    const { A, B } = prep(parts, tr.map((r) => rows[r]), te.map((r) => rows[r]));
    if (!A[0]?.length) continue;
    folds.push({ tr, te, A, B });
  }
  return folds;
}
export function foldScores(folds, y, n) {
  const out = new Array(n).fill(null);
  for (const f of folds) {
    const ytr = f.tr.map((r) => y[r]);
    if (new Set(ytr).size < 2) continue;
    const w = fitLogit(f.A, ytr);
    f.te.forEach((r, k) => { out[r] = predict(w, f.B[k]); });
  }
  return out;
}
export function permuteWithin(y, blocks, rnd) {
  const yp = y.slice(), by = new Map();
  blocks.forEach((b, r) => (by.get(b) ?? by.set(b, []).get(b)).push(r));
  for (const rs of by.values()) { const lab = rs.map((r) => y[r]); for (let k = lab.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [lab[k], lab[j]] = [lab[j], lab[k]]; } rs.forEach((r, k) => { yp[r] = lab[k]; }); }
  return yp;
}
export function permNull(folds, y, blocks, B, seed) {
  const rnd = rngFor(seed), out = [];
  for (let b = 0; b < B; b++) { const yp = permuteWithin(y, blocks, rnd); const a = aucOf(foldScores(folds, yp, y.length), yp); if (a != null) out.push(a); }
  return out;
}

// ── transfer: fit on trainRows, score testRows (optionally per-group z-scoring first: a label-free adaptation) ─────────────────────────────────
function zByGroup(rows, X) {
  const by = new Map(); rows.forEach((r, k) => (by.get(r.lang) ?? by.set(r.lang, []).get(r.lang)).push(k));
  const out = X.map((v) => v.slice());
  for (const ks of by.values()) {
    const d = X[ks[0]].length;
    for (let j = 0; j < d; j++) { const m = mean(ks.map((k) => X[k][j])), s = sd(ks.map((k) => X[k][j])); for (const k of ks) out[k][j] = s > 1e-9 ? (X[k][j] - m) / s : 0; }
  }
  return out;
}
export function transferScores(trainRows, testRows, parts, { z = false } = {}) {
  let A = trainRows.map(() => []), B = testRows.map(() => []);
  for (const fn of parts) {
    let Xtr = trainRows.map(fn), Xte = testRows.map(fn);
    if (z) { Xtr = zByGroup(trainRows, Xtr); Xte = zByGroup(testRows, Xte); }
    let [a, b] = standardise(Xtr, Xte);
    if (!a[0]?.length) continue;
    if (a[0].length > D_IMP) { const pca = fitPCA(a, D_IMP); a = a.map((r) => projectPCA(pca, r)); b = b.map((r) => projectPCA(pca, r)); }
    A = A.map((r, k) => r.concat(a[k])); B = B.map((r, k) => r.concat(b[k]));
  }
  if (!A[0]?.length) return testRows.map(() => null);
  const w = fitLogit(A, trainRows.map((r) => r.y));
  return B.map((x) => predict(w, x));
}
export function capRows(rows, perClass, seed) {
  const rnd = rngFor(seed), pick = (cls) => { const a = rows.filter((r) => r.y === cls); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, perClass); };
  return [...pick(1), ...pick(0)];
}

// ── statistics ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Mann-Whitney AUC of one feature (ties get mid-ranks); 0.5 for a constant feature. */
export function featAuc(vals, y) {
  const idx = vals.map((v, k) => [v, k]).sort((a, b) => a[0] - b[0]);
  let pos = 0, neg = 0, rs = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const avg = (i + 1 + j) / 2; for (let k = i; k < j; k++) { if (y[idx[k][1]] === 1) { pos++; rs += avg; } else neg++; } i = j; }
  return pos && neg ? (rs - (pos * (pos + 1)) / 2) / (pos * neg) : 0.5;
}
export const pearson = (a, b) => { const ma = mean(a), mb = mean(b); let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += (a[i] - ma) * (b[i] - mb); x += (a[i] - ma) ** 2; y += (b[i] - mb) ** 2; } return x > 0 && y > 0 ? d / Math.sqrt(x * y) : null; };
export function signTestOneSided(wins, n) { // P(X >= wins | n, 0.5)
  let p = 0, c = 1; const logs = [0]; for (let i = 1; i <= n; i++) logs.push(logs[i - 1] + Math.log(i));
  for (let k = wins; k <= n; k++) p += Math.exp(logs[n] - logs[k] - logs[n - k] - n * Math.log(2));
  return p;
}
export function bootMean(xs, B = 2000, seed = 1) { const rnd = rngFor(seed), m = []; for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[Math.floor(rnd() * xs.length)]; m.push(s / xs.length); } return { lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)) }; }

// ── word-order families, recomputed from the role-config priors (the k-means of eval/law/name-shape.mjs, same seed) ─────────────────────────────
function kmeans(points, K, seed, restarts = 20) {
  const rnd = rngFor(seed); let best = null;
  for (let r = 0; r < restarts; r++) {
    let cent = points.slice().sort(() => rnd() - 0.5).slice(0, K).map((p) => p.slice());
    let assign = new Array(points.length).fill(0);
    for (let it = 0; it < 100; it++) {
      assign = points.map((p) => { let bi = 0, bd = Infinity; cent.forEach((c, k) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = k; } }); return bi; });
      cent = cent.map((c, k) => { const m = points.filter((_, i) => assign[i] === k); return m.length ? [mean(m.map((p) => p[0])), mean(m.map((p) => p[1]))] : c; });
    }
    const sse = points.reduce((a, p, i) => a + (p[0] - cent[assign[i]][0]) ** 2 + (p[1] - cent[assign[i]][1]) ** 2, 0);
    if (!best || sse < best.sse) best = { sse, assign, cent };
  }
  return best;
}
export const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
export const TWIN = { cmn: "cmn-hans", "cmn-hans": "cmn", hin: "urd", urd: "hin" };
export function families() {
  const NATIVE = path.join(here, "..", "..", "..");
  const pts = STEMS25.map((s) => { const d = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", `role-config-${s}.json`), "utf8")); return [d.subject.before / Math.max(1, d.subject.total), d.object.before / Math.max(1, d.object.total)]; });
  const km = kmeans(pts, 3, seedFor("name-shape", "families"));
  const name = km.cent.map((c) => (c[0] >= 0.5 && c[1] >= 0.65 ? "SOV" : "SVO"));
  const three = {}, two = {}; STEMS25.forEach((s, i) => { three[s] = km.assign[i]; two[s] = name[km.assign[i]]; });
  return { three, two, centroids: km.cent.map((c) => c.map((x) => round(x, 2))), clusterNames: name };
}
