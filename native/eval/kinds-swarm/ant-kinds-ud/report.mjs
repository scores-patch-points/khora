// report.mjs — ant-kinds-ud K2 / K3 per language, then K1-K4 aggregation. Pre-registration: PREREG.md (sha256 in PREREG.sha256).
//   node report.mjs lang --stems a,b [--src dev] [--perm 1000] [--p3b 100]     -> results/<src>/lang/<stem>.json
//   node report.mjs agg  --stems a,b --verdict a,b [--src dev]                -> results/<src>/AGG.json, AGG.txt
// DECLARED DEVIATIONS from PREREG (compute under load > 100): D1 the Simpson intervals are paired-t (d +- 1.96 se) for observed AND null counts, not bootstrap.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fitLogit, predict, standardise, aucOf, bootDiff } from "../../law/name-war-and-peace.mjs";
import { fitPCA, projectPCA, SIG_LABELS, ATM_LABELS, rngFor, seedFor, D_IMP } from "../../law/impact.mjs";
import { mean, median, quantile, round } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STEMS = opt("--stems", "swe").split(",");
const VERDICT = (opt("--verdict", "") || "").split(",").filter(Boolean);
const SRC = opt("--src", "dev");
const BP = Number(opt("--perm", 1000)), P3B = Number(opt("--p3b", 100)), BSIM = Number(opt("--sim", 200));
const IND = opt("--ind", path.join(HERE, SRC === "dev" ? "induced" : "induced-" + SRC)), SIG = opt("--sig", path.join(HERE, SRC === "dev" ? "sig" : "sig-" + SRC));
const RES = opt("--res", path.join(HERE, "results", SRC));
const LABELS = [...SIG_LABELS, ...ATM_LABELS, "ext.tokens", "ext.frames", "ext.radius"];
const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const shuf = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const vecOf = (r) => [...r.sig, ...r.atm, ...r.ext];
const magOf = (r) => { let m = 0; for (let c = 0; c < 72; c++) m += Math.pow(2, Math.abs(r.sig[c])) - 1; return m; };
const sd = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1)); };

// ── z-scored matrix (constants dropped) ──
function zscore(recs) {
  const d = LABELS.length, V = recs.map(vecOf), n = V.length;
  const mu = new Array(d).fill(0), s = new Array(d).fill(0);
  for (const v of V) for (let c = 0; c < d; c++) mu[c] += v[c] / n;
  for (const v of V) for (let c = 0; c < d; c++) s[c] += (v[c] - mu[c]) ** 2 / n;
  const keep = []; for (let c = 0; c < d; c++) if (Math.sqrt(s[c]) > 1e-9) keep.push(c);
  return { Z: V.map((v) => keep.map((c) => (v[c] - mu[c]) / Math.sqrt(s[c]))), keep, labels: keep.map((c) => LABELS[c]) };
}

// ── T2a: eta^2 across kinds with form-level label permutation within frequency strata (and unrestricted), per-coordinate eta^2, fragility slopes ──
function t2a(rows, Z, leaves, B, rnd, tag, labels) {
  const n = rows.length, d = Z[0].length, K = leaves.length;
  const lidx = new Map(leaves.map((l, i) => [l, i]));
  const forms = [...new Set(rows.map((r) => r.w))], fi = new Map(forms.map((w, i) => [w, i]));
  const formLeaf = forms.map((w) => lidx.get(rows.find((r) => r.w === w).leaf)), formFb = forms.map((w) => rows.find((r) => r.w === w).fb);
  const rowForm = rows.map((r) => fi.get(r.w));
  const mu = new Array(d).fill(0); for (const z of Z) for (let c = 0; c < d; c++) mu[c] += z[c] / n;
  const tot = new Array(d).fill(0); for (const z of Z) for (let c = 0; c < d; c++) tot[c] += (z[c] - mu[c]) ** 2;
  const totAll = tot.reduce((a, b) => a + b, 0);
  const xs = rows.map((r) => Math.log2(r.nw)), ys = rows.map((r) => Math.log2(1 + magOf(r)));
  const stat = (lab) => {
    const sums = Array.from({ length: K }, () => new Float64Array(d)), cnt = new Array(K).fill(0), sx = new Array(K).fill(0), sy = new Array(K).fill(0), sxy = new Array(K).fill(0), sxx = new Array(K).fill(0);
    for (let r = 0; r < n; r++) { const g = lab[r]; cnt[g]++; const z = Z[r]; for (let c = 0; c < d; c++) sums[g][c] += z[c]; sx[g] += xs[r]; sy[g] += ys[r]; sxy[g] += xs[r] * ys[r]; sxx[g] += xs[r] * xs[r]; }
    const bc = new Array(d).fill(0); let b = 0;
    for (let g = 0; g < K; g++) if (cnt[g]) for (let c = 0; c < d; c++) { const m = sums[g][c] / cnt[g] - mu[c]; const v = cnt[g] * m * m; bc[c] += v; b += v; }
    const sl = []; for (let g = 0; g < K; g++) if (cnt[g] >= 5) { const sxxc = sxx[g] - (sx[g] * sx[g]) / cnt[g]; if (sxxc > 1e-9) sl.push([cnt[g], (sxy[g] - (sx[g] * sy[g]) / cnt[g]) / sxxc]); }
    let slopeVar = null; if (sl.length >= 2) { const W = sl.reduce((a, x) => a + x[0], 0), m = sl.reduce((a, x) => a + x[0] * x[1], 0) / W; slopeVar = sl.reduce((a, x) => a + x[0] * (x[1] - m) ** 2, 0) / W; }
    return { eta: b / totAll, bc, slopeVar, slopes: sl };
  };
  const obsLab = rowForm.map((f) => formLeaf[f]);
  const obs = stat(obsLab);
  const permuted = (strat) => {
    const nl = new Array(forms.length);
    if (strat) { const by = new Map(); forms.forEach((w, i) => (by.get(formFb[i]) ?? by.set(formFb[i], []).get(formFb[i])).push(i)); for (const idxs of by.values()) { const labs = shuf(idxs.map((i) => formLeaf[i]), rnd); idxs.forEach((i, j) => { nl[i] = labs[j]; }); } }
    else { const labs = shuf(formLeaf, rnd); forms.forEach((_, i) => { nl[i] = labs[i]; }); }
    return stat(rowForm.map((f) => nl[f]));
  };
  const out = { tag, rows: n, kinds: K, eta2: round(obs.eta, 4) };
  for (const [name, strat] of [["freqStratified", true], ["unrestricted", false]]) {
    const nul = [], ge = new Array(d).fill(0); let sv = 0, svn = 0;
    for (let b = 0; b < B; b++) { const s = permuted(strat); nul.push(s.eta); for (let c = 0; c < d; c++) if (s.bc[c] >= obs.bc[c] - 1e-12) ge[c]++; if (obs.slopeVar != null && s.slopeVar != null) { svn++; if (s.slopeVar >= obs.slopeVar - 1e-12) sv++; } }
    out[name] = { nullMean: round(mean(nul), 4), nullQ95: round(quantile(nul, 0.95), 4), p: round((1 + nul.filter((x) => x >= obs.eta - 1e-12).length) / (B + 1), 4), slopeVar: round(obs.slopeVar), slopeP: svn ? round((1 + sv) / (svn + 1), 4) : null, coordP: ge.map((g) => (1 + g) / (B + 1)) };
  }
  const cp = out.freqStratified.coordP;
  out.topCoords = obs.bc.map((v, c) => ({ coord: labels[c], etaFrac: round(tot[c] ? v / tot[c] : 0, 3), p: round(cp[c], 4) })).sort((a, b) => b.etaFrac - a.etaFrac).slice(0, 10);
  out.coordsSigFreqStrat = cp.filter((x) => x <= 0.05).length;
  out.coordsTotal = cp.length;
  out.slopesObs = obs.slopes.map(([nn, b]) => [nn, round(b, 3)]);
  return out;
}

// ── Simpson check ──
function simpson(pairs, byKey, Zmap, cls, leaves, B, rnd, labels) {
  const P = pairs.filter((p) => p.cls === cls && Zmap.has(p.pos) && Zmap.has(p.ctl));
  if (P.length < 30) return { cls, gap: "few_pairs", pairs: P.length };
  const d = labels.length;
  const delta = P.map((p) => Zmap.get(p.pos).map((v, c) => v - Zmap.get(p.ctl)[c]));
  const posRec = P.map((p) => byKey.get(p.pos));
  const forms = [...new Set(posRec.map((r) => r.w))], fi = new Map(forms.map((w, i) => [w, i]));
  const formLeaf = forms.map((w) => posRec.find((r) => r.w === w).leaf), formFb = forms.map((w) => posRec.find((r) => r.w === w).fb);
  const rowForm = posRec.map((r) => fi.get(r.w));
  const ci = (rowsIdx) => { const n = rowsIdx.length, m = new Array(d).fill(0), s = new Array(d).fill(0); for (const r of rowsIdx) for (let c = 0; c < d; c++) m[c] += delta[r][c] / n; for (const r of rowsIdx) for (let c = 0; c < d; c++) s[c] += (delta[r][c] - m[c]) ** 2 / Math.max(1, n - 1); return m.map((x, c) => { const se = Math.sqrt(s[c] / n); return { m: x, lo: x - 1.96 * se, hi: x + 1.96 * se }; }); };
  const pooled = ci(delta.map((_, i) => i));
  const countFor = (labOfForm) => {
    const g = new Map(); rowForm.forEach((f, r) => { const l = labOfForm[f]; if (l < 0) return; (g.get(l) ?? g.set(l, []).get(l)).push(r); });
    const kinds = [...g].filter(([, v]) => v.length >= 15);
    const cis = kinds.map(([l, v]) => ({ leaf: l, n: v.length, ci: ci(v) }));
    let rev = 0, canc = 0; const revList = [];
    for (let c = 0; c < d; c++) {
      const pe = pooled[c], pos = pe.lo > 0, neg = pe.hi < 0;
      let anyPos = false, anyNeg = false;
      for (const k of cis) { const x = k.ci[c]; if (x.lo > 0) anyPos = true; if (x.hi < 0) anyNeg = true; if ((pos && x.hi < 0) || (neg && x.lo > 0)) { rev++; revList.push({ leaf: k.leaf, n: k.n, coord: labels[c], pooled: round(pe.m, 3), kind: round(x.m, 3) }); } }
      if (!pos && !neg && anyPos && anyNeg) canc++;
    }
    return { rev, canc, revList, kinds: cis.map((k) => ({ leaf: k.leaf, n: k.n })) };
  };
  const obs = countFor(formLeaf);
  const nr = [], nc = [];
  for (let b = 0; b < B; b++) { const nl = new Array(forms.length); const by = new Map(); forms.forEach((w, i) => (by.get(formFb[i]) ?? by.set(formFb[i], []).get(formFb[i])).push(i)); for (const idxs of by.values()) { const labs = shuf(idxs.map((i) => formLeaf[i]), rnd); idxs.forEach((i, j) => { nl[i] = labs[j]; }); } const c = countFor(nl); nr.push(c.rev); nc.push(c.canc); }
  return { cls, pairs: P.length, kindsTested: obs.kinds, pooledSigCoords: pooled.filter((x) => x.lo > 0 || x.hi < 0).length, reversal: { obs: obs.rev, nullQ95: quantile(nr, 0.95), nullMean: round(mean(nr), 2), above: obs.rev > quantile(nr, 0.95) }, cancellation: { obs: obs.canc, nullQ95: quantile(nc, 0.95), nullMean: round(mean(nc), 2), above: obs.canc > quantile(nc, 0.95) }, top: obs.revList.slice(0, 8) };
}

// ── joint (T2b) ──
const sumv = (a, b) => (a ? a.map((x, i) => x + b[i]) : b.slice());
const shapeOf = (v) => { if (!v) return null; const t = v.reduce((a, b) => a + b, 0); return t > 0 ? v.map((x) => x / t) : null; };
function aggJ(list) { if (!list.length) return null; const o = { c: null, col: null, imp: null, nd: 0, nc: 0, ch: 0, n: 0, w: list.length }; for (const x of list) { o.c = sumv(o.c, x.c); o.col = sumv(o.col, x.col); o.imp = sumv(o.imp, x.imp); o.nd += x.nd; o.nc += x.nc; o.ch += x.ch; o.n += x.n; } return o; }
const dispersion = (shapes) => { const S = shapes.filter(Boolean); if (S.length < 2) return null; const d = []; for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) d.push(1 - cos(S[i], S[j])); return mean(d); };
function jointAnalysis(J, desc) {
  const wins = J.windows;
  const leafSet = new Set(); wins.forEach((w) => Object.keys(w.real).forEach((l) => leafSet.add(Number(l))));
  const realAgg = new Map(), pseudoAgg = new Map();
  for (const l of [...leafSet]) {
    const list = wins.map((w) => w.real[l]).filter(Boolean); if (list.length < 2) continue;
    realAgg.set(l, aggJ(list));
    const per = []; for (let b = 0; b < J.B; b++) { const pl = wins.map((w) => w.pseudo[b]?.[l]).filter(Boolean); per.push(pl.length >= 2 ? aggJ(pl) : null); }
    pseudoAgg.set(l, per);
  }
  const L = [...realAgg.keys()].sort((a, b) => a - b);
  const out = { evaluatedKinds: L, windows: wins.length, sham: J.sham, determinism: J.determinism, perKind: {}, dispersion: {} };
  const fields = { shadow: "c", imprint: "imp", collateral: "col" };
  for (const [name, f] of Object.entries(fields)) {
    const obs = dispersion(L.map((l) => shapeOf(realAgg.get(l)[f]))), nul = [];
    for (let b = 0; b < J.B; b++) { const D = dispersion(L.map((l) => { const a = pseudoAgg.get(l)[b]; return a ? shapeOf(a[f]) : null; })); if (D != null) nul.push(D); }
    out.dispersion[name] = { obs: round(obs), nullMean: round(mean(nul)), nullMax: round(nul.length ? Math.max(...nul) : null), draws: nul.length, p: obs != null && nul.length ? round((1 + nul.filter((x) => x >= obs).length) / (nul.length + 1), 4) : null, pass: obs != null && nul.length > 0 && nul.every((x) => x < obs) };
  }
  const ampOf = (a) => (a && a.nd ? a.nc / a.nd : null);
  for (const l of L) {
    const a = realAgg.get(l), per = pseudoAgg.get(l);
    const S = shapeOf(a.c), pm = shapeOf(per.filter(Boolean).reduce((s, x) => sumv(s, x.c), null));
    const nulC = []; per.forEach((x, b) => { if (!x) return; const others = per.filter((y, bb) => y && bb !== b).reduce((s, y) => sumv(s, y.c), null); const sh = shapeOf(x.c), om = shapeOf(others); if (sh && om) nulC.push(cos(sh, om)); });
    const co = S && pm ? cos(S, pm) : null;
    const q05 = nulC.length ? quantile(nulC, 0.05) : null, sdn = nulC.length > 2 ? sd(nulC) : null;
    const ampN = per.filter(Boolean).map(ampOf).filter((x) => x != null), magN = per.filter(Boolean).map((x) => x.ch / Math.max(1, x.n));
    out.perKind[l] = { windows: wins.filter((w) => w.real[l]).length, tokens: a.c ? null : null, cosToRand: round(co), nullQ05: round(q05), specific: co != null && q05 != null && co < q05, z: co != null && sdn ? round((mean(nulC) - co) / sdn, 2) : null, amplification: round(ampOf(a)), ampNullMean: round(mean(ampN)), ampAbove: ampOf(a) != null && ampN.length ? ampOf(a) > mean(ampN) : null, magnitude: round(a.ch / Math.max(1, a.n)), magNullMean: round(mean(magN)), imprint: shapeOf(a.imp)?.map((x) => round(x, 3)), imprintNull: shapeOf(per.filter(Boolean).reduce((s, x) => sumv(s, x.imp), null))?.map((x) => round(x, 3)), desc: desc[l] ?? null };
  }
  out.gold = {};
  for (const cls of ["PROPN", "NOUN"]) {
    const lw = wins.filter((w) => w.gold[cls]); if (lw.length < 2) { out.gold[cls] = { gap: "few_windows" }; continue; }
    const A = aggJ(lw.map((w) => w.gold[cls]));
    const per = []; for (let b = 0; b < (J.B); b++) { const pl = lw.map((w) => w.randGold[cls][b]).filter(Boolean); per.push(pl.length ? aggJ(pl) : null); }
    const S = shapeOf(A.c), pm = shapeOf(per.filter(Boolean).reduce((s, x) => sumv(s, x.c), null));
    const nulC = []; per.forEach((x, b) => { if (!x) return; const om = shapeOf(per.filter((y, bb) => y && bb !== b).reduce((s, y) => sumv(s, y.c), null)); const sh = shapeOf(x.c); if (sh && om) nulC.push(cos(sh, om)); });
    const co = S && pm ? cos(S, pm) : null, q05 = nulC.length ? quantile(nulC, 0.05) : null, sdn = nulC.length > 2 ? sd(nulC) : null;
    out.gold[cls] = { windows: lw.length, cosToRand: round(co), nullQ05: round(q05), specific: co != null && q05 != null && co < q05, z: co != null && sdn ? round((mean(nulC) - co) / sdn, 2) : null, amplification: round(ampOf(A)), ampNullMean: round(mean(per.filter(Boolean).map(ampOf).filter((x) => x != null))) };
  }
  return out;
}

// ── K3: CV arms ──
function cvArms(sigRows, grp, y, block) {
  const n = y.length, ids = [...new Set(block)];
  const out = { P: new Array(n).fill(null), Kd: new Array(n).fill(null), PK: new Array(n).fill(null), C: new Array(n).fill(null) };
  const groups = [...new Set(grp)].sort((a, b) => a - b);
  for (const b of ids) {
    const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || tr.length < 30 || new Set(tr.map((r) => y[r])).size < 2) continue;
    const [Str, Ste] = standardise(tr.map((r) => sigRows[r]), te.map((r) => sigRows[r]));
    if (!Str[0]?.length) continue;
    let A = Str, Bm = Ste;
    if (Str[0].length > D_IMP) { const pca = fitPCA(Str, D_IMP); A = Str.map((r) => projectPCA(pca, r)); Bm = Ste.map((r) => projectPCA(pca, r)); }
    const ytr = tr.map((r) => y[r]);
    const oh = (r) => groups.map((g) => (grp[r] === g ? 1 : 0));
    const Gtr = tr.map(oh), Gte = te.map(oh);
    const wP = fitLogit(A, ytr);
    te.forEach((r, k) => { out.P[r] = predict(wP, Bm[k]); });
    let Gs = null;
    try { Gs = standardise(Gtr, Gte); } catch { Gs = null; }
    if (Gs && Gs[0][0]?.length) {
      const wK = fitLogit(Gs[0], ytr); te.forEach((r, k) => { out.Kd[r] = predict(wK, Gs[1][k]); });
      const Atr = A.map((a, i) => [...a, ...Gs[0][i]]), Bte = Bm.map((a, i) => [...a, ...Gs[1][i]]);
      const wPK = fitLogit(Atr, ytr); te.forEach((r, k) => { out.PK[r] = predict(wPK, Bte[k]); });
    } else { te.forEach((r, k) => { out.Kd[r] = 0; out.PK[r] = predict(wP, Bm[k]); }); }
    const wg = new Map();
    for (const g of groups) { const idx = tr.map((r, i) => (grp[r] === g ? i : -1)).filter((i) => i >= 0); const yy = idx.map((i) => ytr[i]); const n1 = yy.filter((v) => v === 1).length; if (idx.length >= 30 && n1 >= 5 && idx.length - n1 >= 5) wg.set(g, fitLogit(idx.map((i) => A[i]), yy)); }
    te.forEach((r, k) => { out.C[r] = predict(wg.get(grp[r]) ?? wP, Bm[k]); });
  }
  return out;
}
const blocksOf = (rows, N) => rows.map((r) => Math.min(9, Math.floor((r.s / N) * 10)));

function k3a(cls, pairs, byKey, N) {
  const P = pairs.filter((p) => p.cls === cls);
  const rows = [], y = [];
  for (const p of P) { const a = byKey.get(p.pos), c = byKey.get(p.ctl); if (a && c) { rows.push(a, c); y.push(1, 0); } }
  if (rows.length < 80) return { cls, gap: "few_rows", rows: rows.length };
  const X = rows.map(vecOf), grp = rows.map((r) => r.leaf), block = blocksOf(rows, N);
  const sc = cvArms(X, grp, y, block);
  const A = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, round(aucOf(v, y))]));
  const diffs = {};
  for (const [name, [a, b]] of Object.entries({ "C-P": ["C", "P"], "PK-Kd": ["PK", "Kd"], "C-PK": ["C", "PK"], "PK-P": ["PK", "P"], "C-Kd": ["C", "Kd"] })) diffs[name] = bootDiff(sc[a], sc[b], y, block, 500, 1);
  // within-kind AUC of the pooled signature model (a Simpson-style look: is the signal concentrated in some kinds?)
  const within = {};
  for (const g of [...new Set(grp)]) { const idx = grp.map((v, i) => (v === g ? i : -1)).filter((i) => i >= 0); const n1 = idx.filter((i) => y[i] === 1).length; if (idx.length >= 30 && n1 >= 10 && idx.length - n1 >= 10) within[g] = { n: idx.length, nPos: n1, aucP: round(aucOf(sc.P, y, idx)), aucC: round(aucOf(sc.C, y, idx)) }; }
  return { cls, rows: rows.length, pairs: rows.length / 2, groups: [...new Set(grp)].length, auc: A, diffs, within, supported: diffs["C-PK"].point >= 0.03 && diffs["C-PK"].lo > 0 && diffs["PK-Kd"].point >= 0.03 && diffs["PK-Kd"].lo > 0 };
}
function k3b(recs, N, nperm, rnd) {
  const out = {};
  const kindRecs = recs.filter((r) => r.roles.includes("kind") && r.leaf >= 0);
  const leaves = [...new Set(kindRecs.map((r) => r.leaf))].sort((a, b) => a - b);
  for (const l of leaves) {
    const pos = kindRecs.filter((r) => r.leaf === l); if (pos.length < 40) continue;
    const pool = new Map(); for (const r of recs) if (r.leaf !== l) (pool.get(r.fb) ?? pool.set(r.fb, []).get(r.fb)).push(r);
    const used = new Set(), rows = [], y = [];
    for (const p of pos) { const c = (pool.get(p.fb) ?? []).filter((r) => !used.has(r.k)); if (!c.length) continue; const q = c[Math.floor(rnd() * c.length)]; used.add(q.k); rows.push(p, q); y.push(1, 0); }
    if (rows.length < 80) continue;
    const X = rows.map(vecOf), block = blocksOf(rows, N), grp = rows.map(() => 0);
    const sc = cvArms(X, grp, y, block).P;
    const auc = aucOf(sc, y);
    const nul = [];
    const byB = new Map(); block.forEach((b, r) => (byB.get(b) ?? byB.set(b, []).get(b)).push(r));
    for (let t = 0; t < nperm; t++) { const yp = y.slice(); for (const rs of byB.values()) { const lab = shuf(rs.map((r) => y[r]), rnd); rs.forEach((r, k) => { yp[r] = lab[k]; }); } const a = aucOf(cvArms(X, grp, yp, block).P, yp); if (a != null) nul.push(a); }
    out[l] = { pairs: rows.length / 2, auc: round(auc), permQ95: round(quantile(nul, 0.95)), detectable: auc != null && auc > quantile(nul, 0.95) };
  }
  return out;
}

// ── one language ──
function lang(stem) {
  const t0 = Date.now();
  const ind = rd(path.join(IND, `${stem}.json`)), rec = rd(path.join(SIG, `${stem}.rec.json`));
  const jf = path.join(SIG, `${stem}.joint.json`);
  const J = fs.existsSync(jf) ? rd(jf) : null;
  const rnd = rngFor(seedFor("kinds-ud-report", stem, SRC));
  const recs = rec.records, N = rec.N;
  const { Z, labels } = zscore(recs);
  const byKey = new Map(recs.map((r) => [r.k, r])), Zmap = new Map(recs.map((r, i) => [r.k, Z[i]]));
  const desc = {}; for (const l of ind.leaves) desc[l.leaf] = { top: l.top, forms: l.forms, tokens: l.tokens, majority: l.majority, purity: l.purity, propn: l.propn, noun: l.noun, nominal: l.nominal, upos: l.upos, members: l.members.slice(0, 8) };
  const out = { stem, src: SRC, N, records: recs.length, pairs: rec.pairs.length, M: rec.M, desc };
  // T2a over all kinds and over the nominal stratum
  const kindIdx = recs.map((r, i) => (r.roles.includes("kind") && r.leaf >= 0 ? i : -1)).filter((i) => i >= 0);
  const cnt = new Map(); kindIdx.forEach((i) => cnt.set(recs[i].leaf, (cnt.get(recs[i].leaf) ?? 0) + 1));
  const kept = [...cnt].filter(([, n]) => n >= 20).map(([l]) => l).sort((a, b) => a - b);
  const sel = (ls) => kindIdx.filter((i) => ls.includes(recs[i].leaf));
  out.recordsPerKind = Object.fromEntries(cnt);
  if (kept.length >= 2) { const ii = sel(kept); out.T2a_all = t2a(ii.map((i) => recs[i]), ii.map((i) => Z[i]), kept, BP, rnd, "all", labels); }
  const nominal = kept.filter((l) => (desc[l]?.nominal ?? 0) >= 0.5);
  if (nominal.length >= 2) { const ii = sel(nominal); out.T2a_nominal = t2a(ii.map((i) => recs[i]), ii.map((i) => Z[i]), nominal, BP, rnd, "nominal", labels); out.nominalKinds = nominal; }
  // descriptive per-kind table from the single-token records
  out.perKindSingle = Object.fromEntries(kept.map((l) => { const rs = kindIdx.map((i) => recs[i]).filter((r) => r.leaf === l); return [l, { n: rs.length, meanNw: round(mean(rs.map((r) => r.nw)), 1), nullShare: round(mean(rs.map((r) => r.isNull)), 3), noSlotShare: round(mean(rs.map((r) => r.noSlot)), 3), meanMag: round(mean(rs.map(magOf)), 2), meanExtentTok: round(mean(rs.map((r) => r.ext[0])), 1) }]; }));
  // Simpson
  out.simpson = { PROPN: simpson(rec.pairs, byKey, Zmap, "PROPN", kept, BSIM, rnd, labels), NOUN: simpson(rec.pairs, byKey, Zmap, "NOUN", kept, BSIM, rnd, labels) };
  // K3
  out.K3a = { PROPN: k3a("PROPN", rec.pairs, byKey, N), NOUN: k3a("NOUN", rec.pairs, byKey, N) };
  out.K3b = k3b(recs, N, P3B, rnd);
  // joint
  out.joint = J ? jointAnalysis(J, desc) : { gap: "no_joint_file" };
  out.ms = Date.now() - t0;
  return out;
}

if (cmd === "lang") {
  fs.mkdirSync(path.join(RES, "lang"), { recursive: true });
  for (const stem of STEMS) {
    const r = lang(stem);
    for (const k of ["T2a_all", "T2a_nominal"]) if (r[k]) for (const m of ["freqStratified", "unrestricted"]) delete r[k][m].coordP;
    fs.writeFileSync(path.join(RES, "lang", `${stem}.json`), JSON.stringify(r));
    console.error(`${stem}: T2a all p=${r.T2a_all?.freqStratified?.p} nominal p=${r.T2a_nominal?.freqStratified?.p} | joint shadow p=${r.joint?.dispersion?.shadow?.p} | K3a PROPN C-PK ${r.K3a.PROPN.diffs?.["C-PK"]?.point} PK-Kd ${r.K3a.PROPN.diffs?.["PK-Kd"]?.point} | ${r.ms}ms`);
  }
}
export { lang, zscore, cos, vecOf };
