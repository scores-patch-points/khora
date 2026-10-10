// analyse.mjs — the analysis of K2 / K3 per PREREG.md section 4-5, from the jsonl files of signature.mjs. Frozen before the CONF stage is read.
//   node analyse.mjs --corpus irc --stages dev|conf|dev,conf [--B 1000]       -> results/analysis.<corpus>.<stages>.json (+ stdout summary)
//   node analyse.mjs --corpus sms|cosem|enron                                    (K2 only)
import fs from "node:fs";
import path from "node:path";
import * as L from "./lib.mjs";
import { fitLogit, predict, standardise } from "../../law/name-war-and-peace.mjs";
import { fitPCA, projectPCA, D_IMP } from "../../law/impact.mjs";
import { auc } from "../../competence/lib.mjs";

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CORPUS = opt("--corpus", "irc"), STAGES = opt("--stages", CORPUS === "irc" ? "dev" : "dev").split(","), BOOT = Number(opt("--B", 1000)), NPERM = Number(opt("--perm", 200));
const R = L.round;
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const rowsAll = [], jointAll = [], seen = new Set();
const filesOf = (st, part) => fs.readdirSync(L.RESULTS).filter((f) => f.startsWith(`rows.${CORPUS}.${st}.${part}`) && f.endsWith(".jsonl")).map((f) => path.join(L.RESULTS, f));
for (const st of STAGES) { for (const f of [...filesOf(st, "single"), ...filesOf(st, "control")]) for (const r of readJsonl(f)) if (!seen.has(`${f.includes("control") ? "c" : "s"}|${st}|${r.block}|${r.s}|${r.i}`) && seen.add(`${f.includes("control") ? "c" : "s"}|${st}|${r.block}|${r.s}|${r.i}`)) rowsAll.push({ ...r, stage: st, block: CORPUS === "irc" ? `${st}:${r.block}` : r.block }); for (const r of readJsonl(path.join(L.RESULTS, `rows.${CORPUS}.${st}.joint.jsonl`))) jointAll.push({ ...r, stage: st, day: `${st}:${r.day}` }); }
if (CORPUS === "irc") { // A2: local-context rivals from the message stream (not stored in the rows)
  const cache = new Map(), days = L.ircDays();
  const dayOf = (rel) => { if (!cache.has(rel)) { const d = L.loadIrcDay(days.find((x) => x.rel === rel)), occ = new Map(); d.stream.forEach((m, s) => m.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push(s); })); cache.set(rel, { occ, N: d.stream.length, stream: d.stream }); } return cache.get(rel); };
  for (const r of rowsAll) { const { occ, N, stream } = dayOf(r.day), o = occ.get(r.form); let l4 = 0, l16 = 0; for (let j = r.k - 1; j >= 0; j--) { const d = o[r.k] - o[j]; if (d <= 4) l4++; if (d <= 16) l16++; else break; } const d1 = r.k > 0 ? o[r.k] - o[r.k - 1] : 1000; r.loc = [Math.log1p(r.inWin), Math.log((l16 + 0.5) / ((o.length / N) * 16 + 0.5)), Math.log1p(l4), -Math.log1p(d1), Math.log1p(r.i), Math.log1p(stream[r.s].length)]; }
}
const out = { module: "ant-kinds-chat/analyse.mjs", corpus: CORPUS, stages: STAGES, preregSha256: L.preregSha(), rows: rowsAll.length, jointRows: jointAll.length };
const feat = (r) => [...r.rec.sig, ...r.rec.atm];
const lg = (x) => Math.log1p(x);
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const mean = L.mean, quantile = L.quantile;
const bootBlocks = (blocks, stat, B, seed) => { const ids = [...new Set(blocks)], rnd = L.rngFor(seed), v = []; for (let b = 0; b < B; b++) { const pick = Array.from({ length: ids.length }, () => ids[Math.floor(rnd() * ids.length)]); const x = stat(pick); if (x != null && Number.isFinite(x)) v.push(x); } return { lo: R(quantile(v, 0.025)), hi: R(quantile(v, 0.975)), n: v.length }; };

// ════════════════ K2-J: joint ablation of whole kinds vs random partitions of the same sizes ════════════════════════════════════════════════
function analyseJoint(J) {
  if (!J.length) return { gap: "no_rows" };
  const shape = (r) => { const t = r.counts.reduce((a, b) => a + b, 0); return t > 0 ? r.counts.map((x) => x / t) : null; };
  const wins = new Map();
  for (const r of J) { const k = `${r.day}|${r.win}`; (wins.get(k) ?? wins.set(k, []).get(k)).push(r); }
  const modes = [...new Set(J.map((r) => r.mode))].filter((m) => m.startsWith("null")), res = { windows: wins.size, nullDraws: modes.length };
  const disp = (rs) => { const sh = rs.map(shape).filter(Boolean); if (sh.length < 2) return null; let t = 0, n = 0; for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) { t += 1 - cos(sh[i], sh[j]); n++; } return t / n; };
  const per = [];
  for (const [k, rs] of wins) {
    const real = disp(rs.filter((r) => r.mode === "real")), nulls = modes.map((m) => disp(rs.filter((r) => r.mode === m))).filter((x) => x !== null);
    if (real === null || nulls.length < 2) continue;
    per.push({ win: k, day: k.split("|")[0], real, nullMean: mean(nulls), nullMax: Math.max(...nulls), diff: real - mean(nulls), classesReal: rs.filter((r) => r.mode === "real").length });
  }
  res.J1 = { windowsUsed: per.length, meanReal: R(mean(per.map((p) => p.real))), meanNull: R(mean(per.map((p) => p.nullMean))), meanDiff: R(mean(per.map((p) => p.diff))), windowsRealAboveNullMean: per.filter((p) => p.diff > 0).length, windowsRealAboveNullMax: per.filter((p) => p.real > p.nullMax).length };
  res.J1.bootDiff = bootBlocks(per.map((p) => p.day), (pick) => mean(pick.flatMap((d) => per.filter((p) => p.day === d).map((p) => p.diff))), BOOT, 11);
  res.J1.perWindow = per.map((p) => ({ win: p.win, real: R(p.real), nullMean: R(p.nullMean), classes: p.classesReal }));
  // J2 reproducibility across windows: margin cos(c@w1, c@w2) - mean_{c' != c} cos(c@w1, c'@w2)
  const margin = (mode) => {
    const wl = [...wins].map(([k, rs]) => rs.filter((r) => r.mode === mode).map((r) => ({ c: r.c, s: shape(r) })).filter((x) => x.s)), ms = [];
    for (let a = 0; a < wl.length; a++) for (let b = 0; b < wl.length; b++) { if (a === b) continue; for (const x of wl[a]) { const same = wl[b].find((y) => y.c === x.c); const others = wl[b].filter((y) => y.c !== x.c); if (!same || !others.length) continue; ms.push(cos(x.s, same.s) - mean(others.map((y) => cos(x.s, y.s)))); } }
    return ms.length ? mean(ms) : null;
  };
  res.J2 = { real: R(margin("real")), nulls: modes.map((m) => R(margin(m))) };
  res.J2.nullMean = R(mean(res.J2.nulls.filter((x) => x !== null))); res.J2.realAboveAllNulls = res.J2.nulls.every((x) => x === null || res.J2.real > x);
  // descriptive per kind (real): fragility = changed slots per deleted token, amplification, imprint
  const byC = new Map(); for (const r of J.filter((r) => r.mode === "real")) (byC.get(r.c) ?? byC.set(r.c, []).get(r.c)).push(r);
  res.perKind = [...byC].sort((a, b) => a[0] - b[0]).map(([c, rs]) => ({ kind: c, windows: rs.length, meanTokens: R(mean(rs.map((r) => r.tokens)), 1), changedPerToken: R(mean(rs.map((r) => r.changed / r.tokens))), amplification: R(mean(rs.map((r) => (r.direct.reduce((a, b) => a + b, 0) ? r.collateral.reduce((a, b) => a + b, 0) / r.direct.reduce((a, b) => a + b, 0) : null)).filter((x) => x !== null))), noSlotShare: R(mean(rs.map((r) => r.noSlot / r.tokens))) }));
  // pairwise similarity of the real kinds' mean shadow shapes (descriptive)
  const mshape = new Map(); for (const [c, rs] of byC) { const sh = rs.map(shape).filter(Boolean); if (sh.length) mshape.set(c, sh[0].map((_, i) => mean(sh.map((s) => s[i])))); }
  const cs = [...mshape.keys()].sort((a, b) => a - b); res.meanShapeCos = cs.map((a) => cs.map((b) => R(cos(mshape.get(a), mshape.get(b)), 3))); res.meanShapeKinds = cs;
  return res;
}

// ════════════════ K2-S: kind from the single-token record, Simpson slopes ═══════════════════════════════════════════════════════════════════
function lodoCentroid(X, y, block, labelsUsed, folds) {
  // folds: precomputed [{te: [idx], Xtr, Xte, tr: [idx]}]
  const pred = new Array(X.length).fill(null);
  for (const f of folds) {
    const cent = new Map(), cnt = new Map();
    f.tr.forEach((r, k) => { const c = labelsUsed[r]; if (!cent.has(c)) { cent.set(c, new Float64Array(f.Xtr[0].length)); cnt.set(c, 0); } const v = cent.get(c); f.Xtr[k].forEach((x, j) => { v[j] += x; }); cnt.set(c, cnt.get(c) + 1); });
    for (const [c, v] of cent) for (let j = 0; j < v.length; j++) v[j] /= cnt.get(c);
    f.te.forEach((r, k) => { let best = null, bd = Infinity; for (const [c, v] of cent) { let d = 0; for (let j = 0; j < v.length; j++) d += (f.Xte[k][j] - v[j]) ** 2; if (d < bd) { bd = d; best = c; } } pred[r] = best; });
  }
  return pred;
}
function balAcc(pred, y, rows) { const by = new Map(); for (const r of rows) { if (pred[r] === null) continue; const b = by.get(y[r]) ?? by.set(y[r], [0, 0]).get(y[r]); b[1]++; if (pred[r] === y[r]) b[0]++; } return by.size ? mean([...by.values()].map(([h, n]) => h / n)) : null; }
function makeFolds(X, block) {
  const folds = [];
  for (const b of [...new Set(block)]) { const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r)); if (!te.length || tr.length < 20) continue; const [Xtr, Xte] = standardise(tr.map((r) => X[r]), te.map((r) => X[r])); if (!Xtr[0]?.length) continue; folds.push({ tr, te, Xtr, Xte }); }
  return folds;
}
function analyseS(rows) {
  const S = rows.filter((r) => r.tags.some((t) => t.startsWith("S")));
  if (S.length < 50) return { gap: "too_few_rows", n: S.length };
  const y = S.map((r) => r.kind), block = S.map((r) => r.block), strata = S.map((r) => `${r.block}|${L.log2bin(r.inWin + 1)}`);
  const res = { n: S.length, kinds: [...new Set(y)].length, blocks: [...new Set(block)].length };
  const arms = { RECORD: S.map(feat), FREQ: S.map((r) => [lg(r.inWin), lg(r.dayCount)]), "RECORD+FREQ": S.map((r) => [...feat(r), lg(r.inWin), lg(r.dayCount)]) };
  const rowsIdx = S.map((_, k) => k), rnd = L.rngFor(L.seedFor("kinds-chat", "perm-S", CORPUS)), by = new Map(); strata.forEach((s, k) => (by.get(s) ?? by.set(s, []).get(s)).push(k));
  res.S1 = {};
  for (const [name, X] of Object.entries(arms)) {
    const folds = makeFolds(X, block), obs = balAcc(lodoCentroid(X, y, block, y, folds), y, rowsIdx), nulls = [];
    for (let p = 0; p < NPERM; p++) { const yp = y.slice(); for (const idx of by.values()) { const lab = idx.map((k) => y[k]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } idx.forEach((k, i) => { yp[k] = lab[i]; }); } nulls.push(balAcc(lodoCentroid(X, y, block, yp, folds), y.map((_, k) => yp[k]), rowsIdx)); }
    // NOTE: the permutation permutes the TRAINING labels used to fit centroids while the evaluation labels stay the true ones would be a different null; here both are permuted consistently (labels shuffled within strata, pipeline rerun end to end)
    res.S1[name] = { balancedAccuracy: R(obs), nullMean: R(mean(nulls)), nullQ95: R(quantile(nulls, 0.95)), chance: R(1 / res.kinds) };
  }
  res.S1.recordMinusFreq = R(res.S1.RECORD.balancedAccuracy - res.S1.FREQ.balancedAccuracy);
  res.S1.recordAboveNullQ95 = res.S1.RECORD.balancedAccuracy > res.S1.RECORD.nullQ95;
  // S2 slopes of log1p(changed slots) on log1p(local mentions)
  const slope = (rs) => { const xs = rs.map((r) => lg(r.inWin)), ys = rs.map((r) => lg(r.rec.S_ALL)), mx = mean(xs), my = mean(ys); let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; }); return sxx > 1e-9 ? sxy / sxx : null; };
  const kinds = [...new Set(y)].sort((a, b) => a - b), sl = [];
  for (const c of kinds) { const rs = S.filter((r) => r.kind === c); if (rs.length < 15) continue; const bb = bootBlocks(rs.map((r) => r.block), (pick) => slope(pick.flatMap((b) => rs.filter((r) => r.block === b))), BOOT / 2, 100 + c); sl.push({ kind: c, n: rs.length, slope: R(slope(rs)), lo: bb.lo, hi: bb.hi, meanNonNull: R(mean(rs.map((r) => (r.rec.isNull ? 0 : 1)))), meanChanged: R(mean(rs.map((r) => r.rec.S_ALL)), 2), meanLocal: R(mean(rs.map((r) => r.inWin)), 2) }); }
  const pooled = slope(S), pb = bootBlocks(block, (pick) => slope(pick.flatMap((b) => S.filter((r) => r.block === b))), BOOT / 2, 99);
  res.S2 = { pooledSlope: R(pooled), pooledLo: pb.lo, pooledHi: pb.hi, perKind: sl, signReversal: sl.filter((k) => (pooled > 0 && k.hi < 0) || (pooled < 0 && k.lo > 0)).map((k) => k.kind), kindsPositiveCI: sl.filter((k) => k.lo > 0).length, kindsNegativeCI: sl.filter((k) => k.hi < 0).length, kindsWithCIcrossing0: sl.filter((k) => k.lo <= 0 && k.hi >= 0).length };
  res.S3 = { nonNullShare: R(mean(S.map((r) => (r.rec.isNull ? 0 : 1)))) };
  return res;
}

// ════════════════ K3: nicknames, pooled vs kind-mates, conditioned model vs local count ═════════════════════════════════════════════════════
function pairsOf(rows, negTag) {
  const P = new Map(), N = new Map();
  for (const r of rows) for (const t of r.tags) { if (t.startsWith("P:")) P.set(t.slice(2), r); else if (t.startsWith(negTag + ":")) N.set(t.slice(negTag.length + 1), r); }
  return [...P].filter(([id]) => N.has(id)).map(([id, p]) => ({ id, pos: p, neg: N.get(id), block: p.block, kind: p.kind }));
}
const flat = (pairs) => pairs.flatMap((p) => [{ ...p.pos, y: 1, pid: p.id, kindPair: p.kind }, { ...p.neg, y: 0, pid: p.id, kindPair: p.kind }]);
function fitScore(train, test, featFn) {
  if (train.length < 20 || new Set(train.map((r) => r.y)).size < 2) return test.map(() => null);
  const [Xtr, Xte] = standardise(train.map(featFn), test.map(featFn)); if (!Xtr[0]?.length) return test.map(() => null);
  let A = Xtr, B = Xte; if (Xtr[0].length > D_IMP) { const pca = fitPCA(Xtr, D_IMP); A = Xtr.map((r) => projectPCA(pca, r)); B = Xte.map((r) => projectPCA(pca, r)); }
  const w = fitLogit(A, train.map((r) => r.y)); return B.map((x) => predict(w, x));
}
const aucRows = (sc, y, rows) => { const idx = rows.filter((k) => sc[k] != null); return idx.length ? auc(idx.map((k) => sc[k]), idx.map((k) => y[k] === 1)) : null; };
function bootAuc(sA, sB, y, block, pid, B, seed) {
  const ids = [...new Set(block)], byB = new Map(ids.map((b) => [b, []])); block.forEach((b, r) => byB.get(b).push(r));
  const rnd = L.rngFor(seed), all = sA.map((_, k) => k).filter((k) => sA[k] != null && (!sB || sB[k] != null)), inAll = new Uint8Array(sA.length); all.forEach((k) => { inAll[k] = 1; });
  const a = [], d = [];
  for (let t = 0; t < B; t++) { const rows = []; for (let k = 0; k < ids.length; k++) rows.push(...byB.get(ids[Math.floor(rnd() * ids.length)]).filter((r) => inAll[r])); const x = aucRows(sA, y, rows); if (x == null) continue; a.push(x); if (sB) { const z = aucRows(sB, y, rows); if (z != null) d.push(x - z); } }
  const pairs = [...new Set(pid)], byP = new Map(pairs.map((p) => [p, []])); pid.forEach((p, r) => byP.get(p).push(r));
  const a2 = [], d2 = []; for (let t = 0; t < B; t++) { const rows = []; for (let k = 0; k < pairs.length; k++) rows.push(...byP.get(pairs[Math.floor(rnd() * pairs.length)]).filter((r) => inAll[r])); const x = aucRows(sA, y, rows); if (x == null) continue; a2.push(x); if (sB) { const z = aucRows(sB, y, rows); if (z != null) d2.push(x - z); } }
  const pt = aucRows(sA, y, all);
  return { auc: R(pt), blockCI: [R(quantile(a, 0.025)), R(quantile(a, 0.975))], pairCI: [R(quantile(a2, 0.025)), R(quantile(a2, 0.975))], n: all.length, diff: sB ? { point: R(pt - aucRows(sB, y, all)), blockCI: [R(quantile(d, 0.025)), R(quantile(d, 0.975))], pairCI: [R(quantile(d2, 0.025)), R(quantile(d2, 0.975))] } : null };
}
function permAuc(sc, y, pid, B, seed) { // swap the labels inside a pair at random (null of "this score separates the pair")
  const rnd = L.rngFor(seed), byP = new Map(); pid.forEach((p, r) => (byP.get(p) ?? byP.set(p, []).get(p)).push(r)); const v = [];
  for (let t = 0; t < B; t++) { const yp = y.slice(); for (const rs of byP.values()) if (rs.length === 2 && rnd() < 0.5) { yp[rs[0]] = y[rs[1]]; yp[rs[1]] = y[rs[0]]; } v.push(aucRows(sc, yp, sc.map((_, k) => k))); }
  return { q95: R(quantile(v.filter((x) => x != null), 0.95)), mean: R(mean(v.filter((x) => x != null))) };
}
function analyseK3(rows) {
  const pP = pairsOf(rows, "NP"), pK = pairsOf(rows, "NK");
  const res = { pairsP: pP.length, pairsK: pK.length, positivesByKind: {} };
  if (pP.length < 40) return { ...res, gap: "too_few_pairs" };
  for (const p of pK) res.positivesByKind[p.kind] = (res.positivesByKind[p.kind] ?? 0) + 1;
  const FP = flat(pP), FK = flat(pK), blocks = [...new Set(FP.map((r) => r.block))];
  const F = (r) => feat(r), FC = (r) => [...feat(r), lg(r.inWin)], FL = (r) => r.loc, FRL = (r) => [...feat(r), ...r.loc];
  // scores on each arm (leave-one-block-out): pooled model fitted on arm P (all kinds), scored on P and K; conditioned model fitted on K rows of the same kind in other blocks
  const sc = { P: { COUNT: FP.map((r) => lg(r.inWin)), S_ENTRY: FP.map((r) => r.rec.S_ENTRY), POS: FP.map((r) => Math.log1p(r.s)), BURST: FP.map((r) => r.loc[1]), RECENCY: FP.map((r) => r.loc[3]), REC_pooled: FP.map(() => null), RECCOUNT_pooled: FP.map(() => null), LOC_pooled: FP.map(() => null), RECLOC_pooled: FP.map(() => null) }, K: { COUNT: FK.map((r) => lg(r.inWin)), S_ENTRY: FK.map((r) => r.rec.S_ENTRY), BURST: FK.map((r) => r.loc[1]), RECENCY: FK.map((r) => r.loc[3]), LOC_pooled: FK.map(() => null), RECLOC_pooled: FK.map(() => null), LOC_cond: FK.map(() => null), RECLOC_cond: FK.map(() => null), REC_pooled: FK.map(() => null), RECCOUNT_pooled: FK.map(() => null), REC_cond: FK.map(() => null), RECCOUNT_cond: FK.map(() => null) } };
  const pR = pairsOf(rows, "NR"), FR = flat(pR);
  sc.R = { COUNT: FR.map((r) => lg(r.inWin)), S_ENTRY: FR.map((r) => r.rec.S_ENTRY), BURST: FR.map((r) => r.loc[1]), REC_pooled: FR.map(() => null), LOC_pooled: FR.map(() => null) };
  const MIN_TRAIN_PAIRS = 30;
  for (const b of blocks) {
    const trP = FP.filter((r) => r.block !== b), teP = FP.map((r, k) => [r, k]).filter(([r]) => r.block === b), teK = FK.map((r, k) => [r, k]).filter(([r]) => r.block === b);
    for (const [name, fn] of [["REC_pooled", F], ["RECCOUNT_pooled", FC], ["LOC_pooled", FL], ["RECLOC_pooled", FRL]]) { const sp = fitScore(trP, teP.map(([r]) => r), fn), sk = fitScore(trP, teK.map(([r]) => r), fn); teP.forEach(([, k], q) => { sc.P[name][k] = sp[q]; }); teK.forEach(([, k], q) => { sc.K[name][k] = sk[q]; }); }
    const teR = FR.map((r, k) => [r, k]).filter(([r]) => r.block === b);
    if (teR.length) for (const [name, fn] of [["REC_pooled", F], ["LOC_pooled", FL]]) { const sr = fitScore(trP, teR.map(([r]) => r), fn); teR.forEach(([, k], q) => { sc.R[name][k] = sr[q]; }); }
    const kindsHere = [...new Set(teK.map(([r]) => r.kindPair))];
    for (const c of kindsHere) {
      const tr = FK.filter((r) => r.block !== b && r.kindPair === c), te = teK.filter(([r]) => r.kindPair === c); if (tr.length / 2 < MIN_TRAIN_PAIRS) continue;
      for (const [name, fn] of [["REC_cond", F], ["RECCOUNT_cond", FC], ["LOC_cond", FL], ["RECLOC_cond", FRL]]) { const s = fitScore(tr, te.map(([r]) => r), fn); te.forEach(([, k], q) => { sc.K[name][k] = s[q]; }); }
    }
  }
  const yP = FP.map((r) => r.y), yK = FK.map((r) => r.y), bP = FP.map((r) => r.block), bK = FK.map((r) => r.block), pidP = FP.map((r) => r.pid), pidK = FK.map((r) => r.pid);
  res.armP = {}; for (const n of Object.keys(sc.P)) res.armP[n] = { ...bootAuc(sc.P[n], null, yP, bP, pidP, BOOT, 5), perm: permAuc(sc.P[n], yP, pidP, BOOT, 6) };
  res.pairsR = pR.length; res.armR = {};
  if (pR.length >= 30) { const yR = FR.map((r) => r.y), bR = FR.map((r) => r.block), pidR = FR.map((r) => r.pid); for (const n of Object.keys(sc.R)) res.armR[n] = bootAuc(sc.R[n], null, yR, bR, pidR, BOOT, 9); }
  res.armK = {}; for (const n of Object.keys(sc.K)) res.armK[n] = { ...bootAuc(sc.K[n], null, yK, bK, pidK, BOOT, 7), perm: permAuc(sc.K[n], yK, pidK, BOOT, 8) };
  // restrict the K-arm comparisons to rows where the conditioned score exists
  const ok = FK.map((_, k) => sc.K.REC_cond[k] != null), mask = (s) => s.map((v, k) => (ok[k] ? v : null));
  res.armK_conditionedRows = { n: ok.filter(Boolean).length, pairs: ok.filter(Boolean).length / 2 };
  const KC = { COUNT: mask(sc.K.COUNT), S_ENTRY: mask(sc.K.S_ENTRY), REC_pooled: mask(sc.K.REC_pooled), REC_cond: sc.K.REC_cond, RECCOUNT_cond: sc.K.RECCOUNT_cond, BURST: mask(sc.K.BURST), LOC_cond: sc.K.LOC_cond, RECLOC_cond: sc.K.RECLOC_cond };
  res.armK_same_rows = {}; for (const n of Object.keys(KC)) res.armK_same_rows[n] = { auc: R(aucRows(KC[n], yK, KC[n].map((_, k) => k))) };
  res.T2 = { "REC_cond - COUNT": bootAuc(KC.REC_cond, KC.COUNT, yK, bK, pidK, BOOT, 21).diff, "RECCOUNT_cond - COUNT": bootAuc(KC.RECCOUNT_cond, KC.COUNT, yK, bK, pidK, BOOT, 22).diff, "REC_cond - REC_pooled(on K rows)": bootAuc(KC.REC_cond, KC.REC_pooled, yK, bK, pidK, BOOT, 23).diff, "REC_cond - LOC_cond": bootAuc(KC.REC_cond, KC.LOC_cond, yK, bK, pidK, BOOT, 25).diff, "RECLOC_cond - LOC_cond": bootAuc(KC.RECLOC_cond, KC.LOC_cond, yK, bK, pidK, BOOT, 26).diff, "REC_cond - BURST": bootAuc(KC.REC_cond, KC.BURST, yK, bK, pidK, BOOT, 27).diff, "S_ENTRY - COUNT": bootAuc(KC.S_ENTRY, KC.COUNT, yK, bK, pidK, BOOT, 24).diff };
  const okP = FP.map((r) => FK.length ? true : true);
  res.T3 = { "AUC(REC_cond, K arm) - AUC(REC_pooled, P arm)": R(res.armK_same_rows.REC_cond.auc - res.armP.REC_pooled.auc) };
  // Simpson check on the nick contrast, per kind of the positive: sign of (pos - kind-mate) for COUNT, S_ENTRY, S_ALL, record non-null
  res.simpsonNick = {}; for (const c of [...new Set(pK.map((p) => p.kind))].sort((a, b) => a - b)) { const ps = pK.filter((p) => p.kind === c); if (ps.length < 10) continue; const d = (f) => R(mean(ps.map((p) => f(p.pos) - f(p.neg))), 3); res.simpsonNick[c] = { pairs: ps.length, dCOUNT: d((r) => lg(r.inWin)), dS_ENTRY: d((r) => r.rec.S_ENTRY), dS_ALL: d((r) => lg(r.rec.S_ALL)), dNonNull: d((r) => (r.rec.isNull ? 0 : 1)), dExtent: d((r) => lg(r.rec.extent.tokens)) }; }
  const allP = flat(pP), dd = (f) => R(mean(pP.map((p) => f(p.pos) - f(p.neg))), 3);
  res.pooledNickContrast = { pairs: pP.length, dCOUNT: dd((r) => lg(r.inWin)), dS_ENTRY: dd((r) => r.rec.S_ENTRY), dS_ALL: dd((r) => lg(r.rec.S_ALL)), dNonNull: dd((r) => (r.rec.isNull ? 0 : 1)), dExtent: dd((r) => lg(r.rec.extent.tokens)) };
  res.nonNull = { pos: R(mean(FP.filter((r) => r.y === 1).map((r) => (r.rec.isNull ? 0 : 1)))), negP: R(mean(FP.filter((r) => r.y === 0).map((r) => (r.rec.isNull ? 0 : 1)))), negK: R(mean(FK.filter((r) => r.y === 0).map((r) => (r.rec.isNull ? 0 : 1)))) };
  return res;
}

// ════════════════ run ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
out.joint = analyseJoint(jointAll);
out.S = analyseS(rowsAll);
if (CORPUS === "irc") out.K3 = analyseK3(rowsAll);
const j = out.joint, s = out.S, k3 = out.K3;
out.verdicts = {
  K2_J1: j.J1 ? (j.J1.bootDiff.lo > 0 ? "J1 holds (real dispersion > random frequency-stratified partitions, lower bound > 0)" : "J1 not shown (lower bound <= 0)") : "no data",
  K2_S1: s.S1 ? `S1 record accuracy ${s.S1.RECORD.balancedAccuracy} vs null q95 ${s.S1.RECORD.nullQ95}; record - freq-only = ${s.S1.recordMinusFreq} (SESOI 0.03)` : "no data",
  K3: k3 && k3.armK ? `K arm: AUC REC_cond ${k3.armK.REC_cond?.auc} (block CI ${k3.armK.REC_cond?.blockCI}); COUNT ${k3.armK.COUNT.auc}; REC_cond - COUNT ${JSON.stringify(k3.T2?.["REC_cond - COUNT"])}; RECCOUNT_cond - COUNT ${JSON.stringify(k3.T2?.["RECCOUNT_cond - COUNT"])}` : "no data",
};
const file = path.join(L.RESULTS, `analysis.${CORPUS}.${STAGES.join("+")}.json`);
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ file, rows: out.rows, jointRows: out.jointRows, verdicts: out.verdicts }, null, 1));
