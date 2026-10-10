// eval/physics-handles/reader-report.mjs — the analysis of reader-handles.mjs, implementing the rules of ITS pre-registered header, nothing else.
// (No rule, threshold or prediction is defined here; the header of reader-handles.mjs is the pre-registration. A defect found in this file after a result is fixed in the code and logged.)

import fs from "node:fs";
import path from "node:path";
import { round, mean, median, quantile, spearman, partialSpearman, ols, auc, blockBootstrap, mulberry32, sum, headerSha256 } from "./lib.mjs";
import { fitLaws } from "./attraction.mjs";

const DIST_EDGES = [0, 1, 2, 3, 5, 9, 17, 33, 65, 129, 257, 513, 1025];
const DIST_CENTER = DIST_EDGES.map((a, i) => (i === 0 ? 0.5 : i + 1 < DIST_EDGES.length ? Math.sqrt(a * (DIST_EDGES[i + 1] - 1 || 1)) : a * 1.5));
const nBinOf = (n) => (n <= 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : n <= 5 ? 3 : n <= 9 ? 4 : n <= 19 ? 5 : 6);

// ── small numerics ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function gammaQ(a, x) { // regularized upper incomplete gamma
  if (x <= 0) return 1;
  const gln = (() => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = a, tmp = a + 5.5; tmp -= (a + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (const cj of c) ser += cj / ++y; return -tmp + Math.log((2.5066282746310005 * ser) / a); })();
  if (x < a + 1) { let ap = a, del = 1 / a, s = del; for (let n = 0; n < 500; n++) { ap += 1; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-12) break; } return 1 - s * Math.exp(-x + a * Math.log(x) - gln); }
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d; for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}
const chi2sf = (x, df) => gammaQ(df / 2, x / 2);
function solveLin(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
/** Poisson regression, log link: X rows [1, x1, ...]; returns beta */
function poissonFit(X, y, iters = 30) {
  const p = X[0].length; let beta = new Array(p).fill(0); beta[0] = Math.log(Math.max(1e-3, mean(y)));
  for (let it = 0; it < iters; it++) {
    const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
    X.forEach((row, i) => { const eta = row.reduce((a, v, j) => a + v * beta[j], 0), mu = Math.exp(Math.max(-20, Math.min(20, eta))), z = eta + (y[i] - mu) / mu; for (let j = 0; j < p; j++) { b[j] += mu * row[j] * z; for (let k = 0; k < p; k++) A[j][k] += mu * row[j] * row[k]; } });
    for (let j = 0; j < p; j++) A[j][j] += 1e-6;
    const nb = solveLin(A, b); const diff = Math.max(...nb.map((v, j) => Math.abs(v - beta[j]))); beta = nb; if (diff < 1e-8) break;
  }
  return beta;
}
const dev = (y, mu) => 2 * ((y > 0 ? y * Math.log(y / mu) : 0) - (y - mu));
function cvDeviance(rowsX, y, block, K = 10) {
  const ids = [...new Set(block)], fold = new Map(ids.map((b, i) => [b, i % K])); let tot = 0, n = 0;
  for (let f = 0; f < K; f++) {
    const tr = [], te = []; block.forEach((b, i) => (fold.get(b) === f ? te : tr).push(i));
    if (!tr.length || !te.length) continue;
    const beta = poissonFit(tr.map((i) => rowsX[i]), tr.map((i) => y[i]));
    for (const i of te) { const mu = Math.exp(Math.max(-20, Math.min(20, rowsX[i].reduce((a, v, j) => a + v * beta[j], 0)))); tot += dev(y[i], Math.max(mu, 1e-9)); n++; }
  }
  return n ? tot / n : null;
}

// ── loading ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function load(dir, wave) {
  const out = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(`.w${wave}.jsonl`)).sort()) {
    const name = f.replace(`.w${wave}.jsonl`, "");
    out[name] = fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  }
  return out;
}
const ciOf = (blocks, stat, seed, B = 300) => { const r = blockBootstrap(blocks, stat, { B, seed }); return { point: round(r.point), lo: round(r.lo), hi: round(r.hi), n: r.n, blocks: r.blocks }; };

export async function report(dir, { wave = 1 } = {}) {
  const C = load(dir, wave), names = Object.keys(C);
  const R = { wave, headerSha256: headerSha256(new URL("./reader-handles.mjs", import.meta.url).pathname), corpora: names, per: {}, pooled: {} };
  // ── flatten ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const singles = [], pairs = [], madd = [], dens = [], horiz = [], shuf = [], bodies = [];
  for (const name of names) for (const rec of C[name]) {
    const blk = `${name}#${rec.snapIdx}`;
    for (const s of rec.singles) singles.push({ ...s, corpus: name, blk, nM: rec.M, L: rec.L });
    for (const p of rec.pairs) pairs.push({ ...p, corpus: name, blk });
    if (rec.mentionAdd) madd.push({ ...rec.mentionAdd, corpus: name, blk });
    for (const d of rec.density) dens.push({ ...d, corpus: name, blk });
    for (const h of rec.horizon) horiz.push({ ...h, corpus: name, blk, bodyInfo: rec.bodies[h.form], gapMass: rec.massWindowGap });
    for (const s of rec.shuf) shuf.push({ ...s, corpus: name, blk });
    for (const [w, b] of Object.entries(rec.bodies)) bodies.push({ w, ...b, corpus: name, blk });
  }
  // ── controls and licence ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const K = { K1_sham: {}, K2_determinism: {}, K5_licence: {} };
  const passes = new Set();
  for (const name of names) {
    const recs = C[name];
    K.K1_sham[name] = { snapshots: recs.length, allZero: recs.every((r) => r.K1.S === 0 && r.K1.born === 0 && r.K1.shifted === 0) };
    const k2 = recs.map((r) => r.K2?.same).filter((x) => x !== undefined); K.K2_determinism[name] = { checked: k2.length, allSame: k2.every(Boolean) };
    const big = singles.filter((s) => s.corpus === name && s.n >= 3), share = big.length ? big.filter((s) => s.S >= 1).length / big.length : null;
    K.K5_licence[name] = { n: big.length, shareChanged: round(share), pass: share !== null && share >= 0.2 }; if (share !== null && share >= 0.2) passes.add(name);
  }
  R.controls = K; R.licensed = [...passes];
  const S3 = singles.filter((s) => passes.has(s.corpus) && s.n >= 3), S1 = singles.filter((s) => passes.has(s.corpus) && s.n === 1), S2 = singles.filter((s) => passes.has(s.corpus) && s.n === 2);
  const inLic = (x) => passes.has(x.corpus);

  // ── MASS-ADD ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const slopeStat = (rows) => { const x = rows.map((r) => r.SA + r.SB), y = rows.map((r) => r.SAB); const o = ols(x, y); return o ? o.b : NaN; };
  const ratioStat = (rows) => median(rows.map((r) => r.SAB / (r.SA + r.SB)));
  const mk = (kind) => pairs.filter((p) => inLic(p) && p.kind === kind && p.SA + p.SB >= 3);
  const far = mk("far"), near = mk("near");
  const addRes = {};
  for (const [kind, rows] of [["far", far], ["near", near]]) {
    if (rows.length < 10) { addRes[kind] = { n: rows.length, gap: "too_few_pairs" }; continue; }
    const blocks = rows.map((r) => r.blk), idx = (sel, f) => f(sel.map((i) => rows[i]));
    addRes[kind] = { n: rows.length, slope: ciOf(blocks, (sel) => idx(sel, slopeStat), 11), medianRatio: ciOf(blocks, (sel) => idx(sel, ratioStat), 12), shareSuper: round(rows.filter((r) => r.SAB > r.SA + r.SB).length / rows.length), shareSub: round(rows.filter((r) => r.SAB < r.SA + r.SB).length / rows.length), shareEqual: round(rows.filter((r) => r.SAB === r.SA + r.SB).length / rows.length) };
  }
  // informativeness control: replace S(B) by a random other body of the same n bin (K3)
  { const rnd = mulberry32(31), poolByBin = new Map(); for (const p of pairs.filter(inLic)) for (const [n, s] of [[p.nA, p.SA], [p.nB, p.SB]]) { const k = `${p.corpus}|${Math.min(5, nBinOf(n))}`; (poolByBin.get(k) ?? poolByBin.set(k, []).get(k)).push(s); }
    const r2 = (x, y) => { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); return sxx && syy ? (sxy * sxy) / (sxx * syy) : null; };
    if (far.length >= 10) { const real = r2(far.map((r) => r.SA + r.SB), far.map((r) => r.SAB)); const wrong = []; for (let t = 0; t < 200; t++) wrong.push(r2(far.map((r) => { const pool = poolByBin.get(`${r.corpus}|${Math.min(5, nBinOf(r.nB))}`) ?? [r.SB]; return r.SA + pool[Math.floor(rnd() * pool.length)]; }), far.map((r) => r.SAB))); addRes.K3_informativeness = { R2_real: round(real), R2_wrongSum_mean: round(mean(wrong.filter((v) => v !== null))), gain: round(real - mean(wrong.filter((v) => v !== null))), informative: real - mean(wrong.filter((v) => v !== null)) >= 0.10 }; } }
  { const f = addRes.far; if (f && !f.gap) { const inBand = (c) => c.lo >= 0.85 && c.hi <= 1.15; addRes.verdict = { additive: inBand(f.slope) && f.medianRatio.point >= 0.85 && f.medianRatio.point <= 1.15, slopeInsideBand: inBand(f.slope), falsified: f.slope.lo > 1.15 || f.slope.hi < 0.85, vacuous: addRes.K3_informativeness ? !addRes.K3_informativeness.informative : null }; } }
  if (far.length >= 10 && near.length >= 10) { const rb = ciOf([...far.map((r) => r.blk), ...near.map((r) => r.blk)], (sel) => { const f = sel.filter((i) => i < far.length).map((i) => far[i]), n = sel.filter((i) => i >= far.length).map((i) => near[i - far.length]); return f.length && n.length ? ratioStat(n) - ratioStat(f) : NaN; }, 13); addRes.P1_nearMinusFar = rb; }
  // across the mentions of ONE body
  { const rows = madd.filter(inLic).map((m) => ({ ...m, sum: sum(m.Ssingles) })), out = {};
    for (const [label, sel] of [["n=2", (r) => r.n === 2], ["n=3", (r) => r.n === 3], ["n=4-6", (r) => r.n >= 4]]) { const rr = rows.filter(sel); const ratioRows = rr.filter((r) => r.sum >= 3); out[label] = { bodies: rr.length, wholeGtSum: round(rr.filter((r) => r.Swhole > r.sum).length / Math.max(1, rr.length)), wholeEqSum: round(rr.filter((r) => r.Swhole === r.sum).length / Math.max(1, rr.length)), wholeLtSum: round(rr.filter((r) => r.Swhole < r.sum).length / Math.max(1, rr.length)), ratioRows: ratioRows.length, medianOmega: ratioRows.length >= 5 ? ciOf(ratioRows.map((r) => r.blk), (sel2) => median(sel2.map((i) => ratioRows[i].Swhole / ratioRows[i].sum)), 14) : null, meanWhole: round(mean(rr.map((r) => r.Swhole))), meanSumOfParts: round(mean(rr.map((r) => r.sum))) }; }
    addRes.mentionAdditivity = out; }
  R.pooled.massAdd = addRes;

  // ── MASS-DEF ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { const perC = {}, slopes = [];
    for (const name of names.filter((n2) => passes.has(n2))) {
      const b = bodies.filter((x) => x.corpus === name && x.mShadow !== undefined && x.n >= 1);
      if (b.length < 20) { perC[name] = { bodies: b.length, gap: "too_few_bodies" }; continue; }
      const cols = { n: b.map((x) => x.n), act: b.map((x) => x.act), born: b.map((x) => x.born), slots: b.map((x) => x.mSlots), shadow: b.map((x) => x.mShadow) };
      const mat = {}; for (const a of Object.keys(cols)) for (const c of Object.keys(cols)) if (a < c) mat[`${a}~${c}`] = round(spearman(cols[a], cols[c]));
      const o = ols(b.map((x) => Math.log(x.n)), b.map((x) => Math.log(x.mShadow + 0.5)));
      const bb = ciOf(b.map((x) => x.blk), (sel) => { const oo = ols(sel.map((i) => Math.log(b[i].n)), sel.map((i) => Math.log(b[i].mShadow + 0.5))); return oo ? oo.b : NaN; }, 15);
      perC[name] = { bodies: b.length, rank: mat, slopeLogShadowOnLogN: bb, se: round(o?.se), spearmanShadowN: round(spearman(cols.shadow, cols.n)) };
      if (o && o.se > 0) slopes.push({ name, b: o.b, w: 1 / o.se ** 2 });
    }
    let Q = null, p = null, pooled = null;
    if (slopes.length >= 2) { const sw = sum(slopes.map((s) => s.w)); pooled = sum(slopes.map((s) => s.w * s.b)) / sw; Q = sum(slopes.map((s) => s.w * (s.b - pooled) ** 2)); p = chi2sf(Q, slopes.length - 1); }
    const sameDef = p !== null && p > 0.05 && Object.values(perC).every((c) => c.gap || c.spearmanShadowN >= 0.3);
    R.pooled.massDef = { perCorpus: perC, pooledSlope: round(pooled), pooledSE: slopes.length ? round(1 / Math.sqrt(sum(slopes.map((s) => s.w)))) : null, Q: round(Q), df: slopes.length - 1, p: round(p, 5), sameAcrossCorpora: sameDef }; }

  // ── INERTIA ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { const out = { floorCliff: {}, perCorpus: {}, pooled: {} };
    const stat = (rows) => (sel) => spearman(sel.map((i) => rows[i].n), sel.map((i) => rows[i].S));
    out.pooled.spearman_n_S = ciOf(S3.map((s) => s.blk), stat(S3), 21);
    out.pooled.spearman_n_Sent = ciOf(S3.map((s) => s.blk), (sel) => spearman(sel.map((i) => S3[i].n), sel.map((i) => S3[i].entryCh)), 22);
    let nNeg = 0, nC = 0;
    for (const name of passes) { const rows = S3.filter((s) => s.corpus === name); if (rows.length < 30) { out.perCorpus[name] = { gap: "too_few" }; continue; } const c = ciOf(rows.map((s) => s.blk), stat(rows), 23 + name.length); out.perCorpus[name] = { spearman: c, meanS: round(mean(rows.map((r) => r.S))), n: rows.length, sig: c.hi < -0.05 }; nC++; if (c.hi < -0.05) nNeg++; }
    out.I1 = { pooledUpperBelowMinus005: out.pooled.spearman_n_S.hi < -0.05, corporaNegative: nNeg, corpora: nC, pass: out.pooled.spearman_n_S.hi < -0.05 && nNeg >= 0.6 * nC };
    // floor cliff
    const meanS = (rows) => mean(rows.map((r) => r.S)), m34 = S3.filter((s) => s.n <= 4);
    out.floorCliff = { meanS_n1: round(meanS(S1)), meanS_n2: round(meanS(S2)), meanS_n3to4: round(meanS(m34)), ratio_n2_over_n3to4: round(meanS(S2) / meanS(m34)), medianS_n1: median(S1.map((s) => s.S)), medianS_n2: median(S2.map((s) => s.S)), n1: S1.length, n2: S2.length };
    out.floorCliffPerCorpus = Object.fromEntries([...passes].map((name) => { const a = singles.filter((s) => s.corpus === name); const m = (f) => mean(a.filter(f).map((s) => s.S)); return [name, { n1: round(m((s) => s.n === 1)), n2: round(m((s) => s.n === 2)), n3to4: round(m((s) => s.n >= 3 && s.n <= 4)), n5to9: round(m((s) => s.n >= 5 && s.n <= 9)), n10up: round(m((s) => s.n >= 10)) }]; }));
    // form: Poisson models on n >= 3, CV by snapshot blocks
    const y = S3.map((s) => s.S), blk = S3.map((s) => s.blk);
    const Xc = S3.map(() => [1]), Xp = S3.map((s) => [1, Math.log(s.n)]), Xe = S3.map((s) => [1, s.n]);
    const dC = cvDeviance(Xc, y, blk), dP = cvDeviance(Xp, y, blk), dE = cvDeviance(Xe, y, blk);
    const best = [["constant", dC], ["power", dP], ["exponential", dE]].sort((a, b) => a[1] - b[1])[0][0];
    const bp = poissonFit(Xp, y), boots = [], blocksU = [...new Set(blk)], by = new Map(blocksU.map((b) => [b, []])); blk.forEach((b, i) => by.get(b).push(i)); const rnd = mulberry32(41);
    for (let t = 0; t < 150; t++) { const rows = []; for (let k = 0; k < blocksU.length; k++) rows.push(...by.get(blocksU[Math.floor(rnd() * blocksU.length)])); const b2 = poissonFit(rows.map((i) => Xp[i]), rows.map((i) => y[i])); boots.push(-b2[1]); }
    out.form = { cvDeviance: { constant: round(dC, 5), power: round(dP, 5), exponential: round(dE, 5) }, selected: best, powerExponent: { a: round(-bp[1]), lo: round(quantile(boots, 0.025)), hi: round(quantile(boots, 0.975)), consistentWith1: quantile(boots, 0.025) <= 1 && quantile(boots, 0.975) >= 1 }, P7: best === "power" && -bp[1] >= 0.3 && -bp[1] <= 1.5 };
    out.formPerCorpus = Object.fromEntries([...passes].map((name) => { const rows = S3.filter((s) => s.corpus === name); if (rows.length < 40) return [name, { gap: "too_few" }]; const yy = rows.map((r) => r.S), bb = rows.map((r) => r.blk); const d = { constant: cvDeviance(rows.map(() => [1]), yy, bb), power: cvDeviance(rows.map((r) => [1, Math.log(r.n)]), yy, bb), exponential: cvDeviance(rows.map((r) => [1, r.n]), yy, bb) }; const sel = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0]; return [name, { selected: sel, a: round(-poissonFit(rows.map((r) => [1, Math.log(r.n)]), yy)[1]) }]; }));
    // name-ness within exact n
    const nameRes = {};
    for (const name of passes) {
      const rows = singles.filter((s) => s.corpus === name && s.n >= 3 && s.isName !== null && s.isName !== undefined);
      if (rows.filter((r) => r.isName).length < 15) { nameRes[name] = { gap: "too_few_names", names: rows.filter((r) => r.isName).length }; continue; }
      const aucWithin = (sel) => { let num = 0, den = 0; const byN = new Map(); for (const i of sel) { const r = rows[i]; (byN.get(r.n) ?? byN.set(r.n, []).get(r.n)).push(r); } for (const [, rs] of byN) { const pos = rs.filter((x) => x.isName), neg = rs.filter((x) => !x.isName); if (pos.length < 2 || neg.length < 2) continue; const a = auc(rs.map((x) => x.entryCh), rs.map((x) => x.isName)); if (a !== null) { num += a * pos.length * neg.length; den += pos.length * neg.length; } } return den ? num / den : NaN; };
      const raw = auc(rows.map((x) => x.entryCh), rows.map((x) => x.isName));
      nameRes[name] = { names: rows.filter((r) => r.isName).length, nonNames: rows.filter((r) => !r.isName).length, aucRaw: round(raw), aucWithinN: ciOf(rows.map((r) => r.blk), aucWithin, 51) };
    }
    out.nameness = nameRes;
    // sham baseline
    out.sham = { medianS_n1: median(S1.map((s) => s.S)), meanS_n1: round(meanS(S1)), meanCollateral_n1: round(mean(S1.map((s) => s.col))), meanCollateral_n3up: round(mean(S3.map((s) => s.col))), ratioBaselineToLaw: round(mean(S1.map((s) => s.col)) / mean(S3.map((s) => s.col))) };
    R.pooled.inertia = out; }

  // ── DENSITY ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { const rows = []; for (const d of dens.filter(inLic)) { if (d.n >= 3) rows.push({ blk: d.blk, corpus: d.corpus, S: d.S, n: d.n, L: d.L, born: d.bornM }); for (const sm of d.small) if (sm.n >= 3) rows.push({ blk: d.blk, corpus: d.corpus, S: sm.S, n: sm.n, L: sm.L, born: sm.born }); }
    const out = { rows: rows.length, perCorpus: {} };
    const evalSet = (rs) => { const y = rs.map((r) => r.S), b = rs.map((r) => r.blk); return { n: cvDeviance(rs.map((r) => [1, Math.log(r.n)]), y, b), rho: cvDeviance(rs.map((r) => [1, Math.log(r.n / r.L)]), y, b), born: cvDeviance(rs.map((r) => [1, Math.log(r.born + 1e-6)]), y, b), constant: cvDeviance(rs.map(() => [1]), y, b) }; };
    out.pooled = evalSet(rows); out.pooled.densityWins = out.pooled.rho < out.pooled.n * 0.98 || out.pooled.born < out.pooled.n * 0.98;
    let nWin = 0, nC = 0;
    for (const name of passes) { const rs = rows.filter((r) => r.corpus === name); if (rs.length < 40) { out.perCorpus[name] = { gap: "too_few", rows: rs.length }; continue; } const d = evalSet(rs); const win = d.rho < d.n * 0.98 || d.born < d.n * 0.98; out.perCorpus[name] = { rows: rs.length, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, round(v, 5)])), densityWins: win }; nC++; if (win) nWin++; }
    out.P8 = { densityWinsIn: nWin, corpora: nC, nWinsIn: nC - nWin, pass: nC - nWin >= 0.6 * nC };
    R.pooled.density = out; }

  // ── HORIZON ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { const h = horiz.filter(inLic), out = { sampled: h.length, inertShare: round(h.filter((x) => x.inert).length / Math.max(1, h.length)), gapShare: round(h.filter((x) => !x.inert && x.Hslot === null).length / Math.max(1, h.filter((x) => !x.inert).length)), castDmdGapShare: round(mean(C[names[0]] ? Object.values(C).flat().filter((r) => passes.has(r.corpus ?? "")).map(() => 0) : [0])) };
    // dmdWindow cast gap share per corpus (from snapshot records)
    out.massWindowGapShare = Object.fromEntries([...passes].map((name) => [name, round(C[name].filter((r) => r.massWindowGap).length / C[name].length)]));
    const rows = h.filter((x) => !x.inert && x.Hslot !== null && x.Hcast !== null && x.bodyInfo);
    out.usable = rows.length;
    if (rows.length >= 30) { out.spearman_Hslot_Hcast = ciOf(rows.map((r) => r.blk), (sel) => spearman(sel.map((i) => rows[i].Hslot), sel.map((i) => rows[i].Hcast)), 61);
      const withMass = rows.filter((r) => r.bodyInfo.mShadow !== undefined); out.withMass = withMass.length;
      if (withMass.length >= 30) out.partial_Hslot_mShadow_given_Hcast_n = ciOf(withMass.map((r) => r.blk), (sel) => partialSpearman(sel.map((i) => withMass[i].Hslot), sel.map((i) => withMass[i].bodyInfo.mShadow), [sel.map((i) => withMass[i].Hcast), sel.map((i) => withMass[i].n)]), 62);
      out.spearman_Hslot_n = ciOf(rows.map((r) => r.blk), (sel) => spearman(sel.map((i) => rows[i].Hslot), sel.map((i) => rows[i].n)), 63);
      out.P9 = out.spearman_Hslot_Hcast.point >= 0.6; out.P10 = out.partial_Hslot_mShadow_given_Hcast_n ? out.partial_Hslot_mShadow_given_Hcast_n.point < 0.2 || out.partial_Hslot_mShadow_given_Hcast_n.lo <= 0 : null; }
    R.pooled.horizon = out; }

  // ── FORCE LAW (the reader's own gravity) ──────────────────────────────────────────────────────────────────────────────────────────────
  { const NB = DIST_EDGES.length, agg = (rows) => { const a = new Array(NB).fill(0), c = new Array(NB).fill(0); for (const r of rows) for (let b = 0; b < NB; b++) { a[b] += r.dAll[b]; c[b] += r.dCh[b]; } return c.map((x, b) => (a[b] > 0 ? x / a[b] : null)); };
    const fitCurve = (g3, g1) => { const ex = g3.map((v, b) => (v !== null && g1[b] !== null ? v - g1[b] : null)); const xs = [], ys = []; ex.forEach((v, b) => { if (b >= 1 && v !== null) { xs.push(DIST_CENTER[b]); ys.push(v); } }); const pos = ys.filter((v) => v > 0).length; const f = pos >= 5 ? fitLaws(xs, ys.map((v) => (v > 0 ? v : NaN))) : { gap: "too_few_positive_bins", positive: pos }; const sp = xs.length >= 4 ? spearman(xs.map(Math.log), ys) : null; return { excess: ex.map((v) => (v === null ? null : round(v, 5))), fit: f, spearmanLogRvsExcess: round(sp) }; };
    const out = { perCorpus: {}, pooled: null };
    const rowsOf = (name, f) => singles.filter((s) => s.corpus === name && f(s));
    let mono = 0, pw = 0, nC = 0, shufOk = 0, nShuf = 0;
    for (const name of passes) {
      const g3 = agg(rowsOf(name, (s) => s.n >= 3)), g1 = agg(rowsOf(name, (s) => s.n === 1)), cur = fitCurve(g3, g1);
      const sh3 = agg(shuf.filter((s) => s.corpus === name && s.n >= 3)), sh1 = agg(shuf.filter((s) => s.corpus === name && s.n === 1));
      const far = (g, h) => { let t = 0, k = 0; for (let b = 8; b < NB; b++) if (g[b] !== null && h[b] !== null) { t += g[b] - h[b]; k++; } return k ? t / k : null; };
      const realFar = far(g3, g1), shufFar = far(sh3, sh1);
      out.perCorpus[name] = { g_n3up: g3.map((v) => (v === null ? null : round(v, 5))), g_n1: g1.map((v) => (v === null ? null : round(v, 5))), ...cur, shuffled: { g_n3up: sh3.map((v) => (v === null ? null : round(v, 5))), farExcessReal: round(realFar, 6), farExcessShuffled: round(shufFar, 6), ratio: realFar && shufFar !== null ? round(shufFar / realFar) : null } };
      nC++; if (cur.spearmanLogRvsExcess !== null && cur.spearmanLogRvsExcess < -0.7) mono++; if (cur.fit.dAIC !== undefined && cur.fit.dAIC >= 4) pw++;
      if (realFar && shufFar !== null) { nShuf++; if (shufFar / realFar <= 0.5) shufOk++; }
    }
    const g3 = agg(S3), g1 = agg(S1); out.pooled = fitCurve(g3, g1); out.pooled.g_n3up = g3.map((v) => (v === null ? null : round(v, 5))); out.pooled.g_n1 = g1.map((v) => (v === null ? null : round(v, 5)));
    out.P11 = { monotoneIn: mono, corpora: nC, pass: mono >= 0.6 * nC }; out.P12 = { powerWinsIn: pw, corpora: nC, pass: pw >= 0.6 * nC }; out.P13 = { shuffledFarExcessLeHalfIn: shufOk, corpora: nShuf, pass: nShuf ? shufOk >= 0.6 * nShuf : null };
    // bootstrap interval of the pooled exponent over snapshots
    const blocks = [...new Set(S3.map((s) => s.blk))], bySnap = new Map(blocks.map((b) => [b, []])); S3.forEach((s) => bySnap.get(s.blk).push(s)); const bySnap1 = new Map(); for (const s of S1) (bySnap1.get(s.blk) ?? bySnap1.set(s.blk, []).get(s.blk)).push(s); const rnd = mulberry32(71), alphas = [];
    for (let t = 0; t < 150; t++) { const r3 = [], r1 = []; for (let k = 0; k < blocks.length; k++) { const b = blocks[Math.floor(rnd() * blocks.length)]; r3.push(...bySnap.get(b)); r1.push(...(bySnap1.get(b) ?? [])); } const f = fitCurve(agg(r3), agg(r1)).fit; if (f.alpha !== undefined) alphas.push(f.alpha); }
    out.pooled.alphaCI = alphas.length ? [round(quantile(alphas, 0.025)), round(quantile(alphas, 0.975))] : null;
    R.pooled.forceLaw = out; }

  // ── CONSERVATION and AFFECT ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { const net = (s) => (s.born - s.emptied) / (s.born + s.emptied + 1);
    const out = { n3up: { median: round(median(S3.map(net))), mean: round(mean(S3.map(net))), meanBorn: round(mean(S3.map((s) => s.born))), meanEmptied: round(mean(S3.map((s) => s.emptied))), n: S3.length }, n1: { median: round(median(S1.map(net))), mean: round(mean(S1.map(net))), meanBorn: round(mean(S1.map((s) => s.born))), meanEmptied: round(mean(S1.map((s) => s.emptied))), n: S1.length } };
    out.interval_n3up = ciOf(S3.map((s) => s.blk), (sel) => median(sel.map((i) => net(S3[i]))), 81);
    out.P14 = { conservedIfInMinus02To02: out.n3up.median >= -0.2 && out.n3up.median <= 0.2, predictedBelowMinus02: out.n3up.median < -0.2 };
    out.perCorpus = Object.fromEntries([...passes].map((name) => [name, { n3up: round(median(singles.filter((s) => s.corpus === name && s.n >= 3).map(net))), n1: round(median(singles.filter((s) => s.corpus === name && s.n === 1).map(net))) }]));
    R.pooled.conservation = out;
    const aff = { P_S_ge1_byN: Object.fromEntries([[1, (s) => s.n === 1], [2, (s) => s.n === 2], ["3-4", (s) => s.n >= 3 && s.n <= 4], ["5-9", (s) => s.n >= 5 && s.n <= 9], ["10-19", (s) => s.n >= 10 && s.n <= 19], ["20+", (s) => s.n >= 20]].map(([k, f]) => { const rows = singles.filter((s) => passes.has(s.corpus) && f(s)); return [k, { n: rows.length, p: round(rows.filter((s) => s.S >= 1).length / Math.max(1, rows.length)), meanS: round(mean(rows.map((s) => s.S))) }]; })) };
    const dir = sum(S3.map((s) => s.dir)), col = sum(S3.map((s) => s.col)); aff.collateralShare_n3up = round(col / Math.max(1, dir + col)); aff.collateralShareCI = ciOf(S3.map((s) => s.blk), (sel) => { const d = sum(sel.map((i) => S3[i].dir)), c2 = sum(sel.map((i) => S3[i].col)); return c2 / Math.max(1, d + c2); }, 82); aff.P15 = aff.collateralShare_n3up >= 0.5;
    const rA = new Array(6).fill(0), rC = new Array(6).fill(0); for (const s of S3) for (let q = 0; q < 6; q++) { rA[q] += s.rAll[q]; rC[q] += s.rCh[q]; }
    aff.byRadius = { labels: ["r0", "r1", "r2", "r3", "r4+", "unreachable"], slotsChangedShare: rC.map((x) => round(x / Math.max(1, sum(rC)))), probabilityChange: rC.map((x, q) => round(x / Math.max(1, rA[q]), 5)) };
    aff.entryShare = round(mean(S3.map((s) => (s.S ? s.entryCh / s.S : null)).filter((x) => x !== null)));
    R.pooled.affect = aff; }
  R.perCorpusCounts = Object.fromEntries(names.map((n2) => [n2, { snapshots: C[n2].length, singles: singles.filter((s) => s.corpus === n2).length, secondsMedian: median(C[n2].map((r) => r.seconds)) }]));
  fs.writeFileSync(path.join(dir, `_report.w${wave}.json`), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R.pooled, null, 1));
  return R;
}
