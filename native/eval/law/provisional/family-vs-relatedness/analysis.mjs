// eval/law/provisional/family-vs-relatedness/analysis.mjs — the frozen analysis functions of the family-vs-relatedness lens (own-language CV, single-donor transfer matrix,
// equalised-set transfer, dyadic fixed-effects regression, group-rule evaluation). Imported by discover.mjs and confirm.mjs; its sha256 is written into every result JSON
// and confirm.mjs refuses to run if it differs from the hash discover.mjs recorded. NEW FILE; no existing file is edited.
import { loadLang, fitProbe, pairSample, aucOn, pairFlipQ95, standardise, fitLogit, predict, aucOf, rngFor, seedFor, shuffleIn, mean, quantile, round } from "./lib.mjs";
import { STEMS, genus, fam, script, morph, team, woKnow, WO3, WO2 } from "./groups.mjs";

export const CAP_TRAIN = 100, MIN_DONOR = 100, MIN_TARGET = 60, K_SET = 3, DRAWS = 20, DYAD_DRAWS = 6;
export const STRATA = [["LATER", "BOTH"], ["FIRST", "LEFT"], ["FIRST", "BOTH"]];   // [stratum, arm]; LATER-BOTH is the primary cell
const rs = (...p) => rngFor(seedFor("fam-vs-rel", ...p));

/** load every roster language for a stratum; {stem: L}. tag is "" (real) or ".shuf" (within-sentence shuffled). */
export function loadAll(split, stratum, tag = "") { const out = {}; for (const s of STEMS) { const L = loadLang(split, s, stratum, tag); if (L) out[s] = L; } return out; }
export const donorsOf = (langs) => Object.keys(langs).filter((s) => langs[s].pairs >= MIN_DONOR);
export const targetsOf = (langs) => Object.keys(langs).filter((s) => langs[s].pairs >= MIN_TARGET);

/** leave-one-block-out (pair-level blocks) own-language AUC for an arm. */
export function cvAuc(L, arm) {
  const out = new Array(L.y.length).fill(null);
  for (const b of new Set(L.block)) {
    const tr = [], te = []; L.block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || new Set(tr.map((r) => L.y[r])).size < 2) continue;
    const [Xtr, Xte] = standardise(tr.map((r) => L.X[arm][r]), te.map((r) => L.X[arm][r]));
    if (!Xtr[0]?.length) continue;
    const w = fitLogit(Xtr, tr.map((r) => L.y[r])); te.forEach((r, k) => { out[r] = predict(w, Xte[k]); });
  }
  return aucOf(out, L.y);
}

/** a training part: CAP_TRAIN seeded pairs of language L. */
const part = (L, rnd) => ({ L, idx: pairSample(L, Math.min(CAP_TRAIN, L.pairs), rnd) });
/** sham: same rows as a part but labels swapped within a random half of the pairs (the sham probe must sit at chance). */
function shamPart(L, rnd) { const p = part(L, rnd); const y = L.y.slice(); for (let k = 0; k < p.idx.length; k += 2) if (rnd() < 0.5) { y[p.idx[k]] = 1 - y[p.idx[k]]; y[p.idx[k + 1]] = 1 - y[p.idx[k + 1]]; } return { L: { ...L, y }, idx: p.idx }; }

/** single-donor transfer matrix for one (stratum, arm): A[D][T] = mean over DYAD_DRAWS draws of the AUC of a probe fitted on CAP_TRAIN pairs of D, scored on every pair of T.
 *  Also the POSITION-arm control and a label-swap sham probe. */
export function dyadMatrix(langs, arm, tag) {
  const D = donorsOf(langs), T = targetsOf(langs), A = {}, P = {}, S = {};
  for (const d of D) {
    A[d] = {}; P[d] = {}; S[d] = {};
    const acc = {}, accP = {}, accS = {};
    for (let r = 0; r < DYAD_DRAWS; r++) {
      const rnd = rs("dyad", tag, d, arm, r), pt = part(langs[d], rnd);
      const f = fitProbe([pt], arm), fp = fitProbe([pt], "POSITION"), fs = fitProbe([shamPart(langs[d], rs("sham", tag, d, arm, r))], arm);
      for (const t of T) { if (t === d) continue; (acc[t] ??= []).push(aucOn(f, langs[t], arm)); (accP[t] ??= []).push(aucOn(fp, langs[t], "POSITION")); (accS[t] ??= []).push(aucOn(fs, langs[t], arm)); }
    }
    for (const t of Object.keys(acc)) { A[d][t] = round(mean(acc[t].filter((x) => x != null))); P[d][t] = round(mean(accP[t].filter((x) => x != null))); S[d][t] = round(mean(accS[t].filter((x) => x != null))); }
  }
  return { A, P, S, donors: D, targets: T };
}

// ── equalised sets (the C2 design, extended to genus / order / different-both / random) ────────────────────────────────────────────
/** pools of donor languages for target T. a: same genus; b: same clear word order (wo3), different genus; c: opposite clear word order, different genus; d: everything else eligible
 *  (random, no exclusion); e: different genus, any order. MIXED targets get only a, d, e; MIXED donors enter only d, a, e. noTwin removes the same-team twin from a. */
export function poolsFor(T, donors, noTwin = false) {
  const o = WO3[T], ok = (x) => x !== T, gT = genus(T);
  const a = donors.filter((x) => ok(x) && genus(x) === gT && !(noTwin && team(x) && team(x) === team(T)));
  const clear = o !== "MIXED";
  const b = clear ? donors.filter((x) => ok(x) && genus(x) !== gT && WO3[x] === o) : [];
  const c = clear ? donors.filter((x) => ok(x) && genus(x) !== gT && WO3[x] !== "MIXED" && WO3[x] !== o) : [];
  const d = donors.filter(ok), e = donors.filter((x) => ok(x) && genus(x) !== gT);
  return { a, b, c, d, e };
}
export const SETS = ["a", "b", "c", "d", "e"];

/** per target: for each set type with >= K_SET donors, DRAWS seeded draws of K_SET donors x CAP_TRAIN pairs; AUC on the real target rows, on the shuffled target rows (if given),
 *  the POSITION-arm control, and a pair-flip null q95 from the first draw. */
export function setsFor(T, langs, arm, tag, shufLangs = null, noTwin = false) {
  const donors = donorsOf(langs), pools = poolsFor(T, donors, noTwin), res = {};
  for (const s of SETS) {
    const pool = pools[s]; if (pool.length < K_SET) { res[s] = null; continue; }
    const auc = [], pos = [], shuf = [], used = {}; let q95 = null, n0 = null;
    for (let dr = 0; dr < DRAWS; dr++) {
      const rnd = rs("sets", tag, T, s, arm, dr), pick = shuffleIn(pool.slice(), rnd).slice(0, K_SET);
      const parts = pick.map((x) => part(langs[x], rnd)); pick.forEach((x) => { used[x] = (used[x] ?? 0) + 1; });
      const f = fitProbe(parts, arm), fp = fitProbe(parts, "POSITION");
      const a1 = aucOn(f, langs[T], arm); if (a1 != null) auc.push(a1);
      const a2 = aucOn(fp, langs[T], "POSITION"); if (a2 != null) pos.push(a2);
      if (shufLangs?.[T]) { const a3 = aucOn(f, shufLangs[T], arm); if (a3 != null) shuf.push(a3); }
      if (dr === 0 && f) { const sc = f(langs[T].X[arm]); q95 = pairFlipQ95(sc, langs[T].y, rs("null", tag, T, s, arm)); n0 = langs[T].pairs; }
    }
    res[s] = { mean: round(mean(auc)), sd: round(Math.sqrt(mean(auc.map((x) => (x - mean(auc)) ** 2)))), pos: round(mean(pos)), shuf: shuf.length ? round(mean(shuf)) : null, q95: round(q95), pairs: n0, k: K_SET, draws: auc.length, used };
  }
  return res;
}

// ── dyadic fixed-effects regression: transfer AUC(D -> T) = alpha_T + beta_D + sum gamma_k * same_k(D,T) ────────────────────────────────
export const COVS = ["sameGenus", "sameFamilyOnly", "sameOrder", "sameScript", "sameMorph", "sameTeam"];
/** labels = {genus, fam, order, script, morph, team} functions stem -> label (order may return null = excluded). */
export const LABELS = { genus, fam, order: (s) => (WO3[s] === "MIXED" ? null : WO3[s]), script, morph, team };
export const LABELS_WO2 = { ...LABELS, order: (s) => WO2[s] };
export const LABELS_KNOW = { ...LABELS, order: (s) => woKnow(s) };
export function dyadRows(A, labels) {
  const rows = [];
  for (const d of Object.keys(A)) for (const t of Object.keys(A[d])) {
    const v = A[d][t]; if (v == null || d === t) continue;
    const od = labels.order(d), ot = labels.order(t); if (od == null || ot == null) continue;
    const g = labels.genus(d) === labels.genus(t), f = labels.fam(d) === labels.fam(t);
    rows.push({ d, t, y: v, x: [g ? 1 : 0, f && !g ? 1 : 0, od === ot ? 1 : 0, labels.script(d) === labels.script(t) ? 1 : 0, labels.morph(d) === labels.morph(t) ? 1 : 0, labels.team(d) && labels.team(d) === labels.team(t) ? 1 : 0] });
  }
  return rows;
}
function solveSym(M, b) {
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let v = A[r][n]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / (A[r][r] || 1e-12); }
  return x;
}
/** weighted least squares with target and donor fixed effects (ridge 1e-6 on the effects only); wT, wD = per-language weights (default 1). Returns the COVS coefficients. */
export function regress(rows, wT = null, wD = null) {
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))].sort(), tI = new Map(T.map((x, i) => [x, i])), dI = new Map(D.map((x, i) => [x, i - 1]));
  const k = COVS.length, p = k + T.length + D.length - 1, XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
  for (const r of rows) {
    const w = (wT ? wT[r.t] ?? 0 : 1) * (wD ? wD[r.d] ?? 0 : 1); if (!w) continue;
    const idx = [], val = [];
    r.x.forEach((v, j) => { if (v) { idx.push(j); val.push(v); } });
    idx.push(k + tI.get(r.t)); val.push(1);
    const di = dI.get(r.d); if (di >= 0) { idx.push(k + T.length + di); val.push(1); }
    for (let a = 0; a < idx.length; a++) { Xty[idx[a]] += w * val[a] * r.y; for (let b = 0; b < idx.length; b++) XtX[idx[a]][idx[b]] += w * val[a] * val[b]; }
  }
  for (let j = k; j < p; j++) XtX[j][j] += 1e-6;
  const beta = solveSym(XtX, Xty); return Object.fromEntries(COVS.map((c, j) => [c, beta[j]]));
}
/** pigeonhole bootstrap over targets and donors independently (multinomial language weights). */
export function bootRegress(rows, B, rnd) {
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))], out = Object.fromEntries(COVS.map((c) => [c, []]));
  for (let b = 0; b < B; b++) {
    const wT = Object.fromEntries(T.map((x) => [x, 0])), wD = Object.fromEntries(D.map((x) => [x, 0]));
    for (let i = 0; i < T.length; i++) wT[T[Math.floor(rnd() * T.length)]] += 1;
    for (let i = 0; i < D.length; i++) wD[D[Math.floor(rnd() * D.length)]] += 1;
    const be = regress(rows, wT, wD); for (const c of COVS) out[c].push(be[c]);
  }
  return Object.fromEntries(COVS.map((c) => [c, { lo: round(quantile(out[c], 0.025)), hi: round(quantile(out[c], 0.975)) }]));
}
/** permutation null: permute the (family, genus) tuple across languages [genus] or the clear word-order label across clear languages [order]; returns q95 of the permuted coefficient. */
export function permNull(A, labels, which, B, rnd) {
  const langs = [...new Set([...Object.keys(A), ...Object.values(A).flatMap((o) => Object.keys(o))])];
  const vals = [];
  for (let b = 0; b < B; b++) {
    let L2 = labels;
    if (which === "genus") { const tup = langs.map((s) => [labels.fam(s), labels.genus(s)]), sh = shuffleIn(tup.slice(), rnd), m = new Map(langs.map((s, i) => [s, sh[i]])); L2 = { ...labels, fam: (s) => m.get(s)?.[0] ?? labels.fam(s), genus: (s) => m.get(s)?.[1] ?? labels.genus(s) }; }
    if (which === "order") { const cl = langs.filter((s) => labels.order(s) != null), ol = shuffleIn(cl.map((s) => labels.order(s)), rnd), m = new Map(cl.map((s, i) => [s, ol[i]])); L2 = { ...labels, order: (s) => (m.has(s) ? m.get(s) : null) }; }
    const be = regress(dyadRows(A, L2)); vals.push(which === "genus" ? be.sameGenus : be.sameOrder);
  }
  return { q95: round(quantile(vals, 0.95)), q05: round(quantile(vals, 0.05)), mean: round(mean(vals)) };
}

// ── aggregation over targets: contrasts with language-bootstrap CIs, and the per-group rule table ─────────────────────────────────────
const boot = (xs, B = 2000, rnd = rngFor(7)) => {
  if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 };
  const m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(rnd() * xs.length)]; m.push(t / xs.length); }
  return { mean: round(mean(xs)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)), n: xs.length, pos: xs.filter((x) => x > 0).length };
};
export { boot };
/** R = {T: {a,b,c,d,e}} for one cell. Contrasts: GENUS = a - b (genus beyond word order), ORDER = b - c (word order beyond genus), GENUSvsNOT = a - e, SAMEvsRANDOM = a - d. */
export function contrasts(R) {
  const pick = (x, y) => Object.entries(R).filter(([, r]) => r[x] && r[y]).map(([t, r]) => [t, r[x].mean - r[y].mean]);
  const out = {};
  for (const [name, x, y] of [["GENUS_a-b", "a", "b"], ["ORDER_b-c", "b", "c"], ["GENUSvsNOT_a-e", "a", "e"], ["SAMEvsRANDOM_a-d", "a", "d"], ["ORDERvsRANDOM_b-d", "b", "d"]]) {
    const v = pick(x, y); out[name] = { ...boot(v.map(([, d]) => d), 2000, rngFor(seedFor("fam-vs-rel", "boot", name))), perTarget: Object.fromEntries(v.map(([t, d]) => [t, round(d)])) };
  }
  const setMean = (k) => { const v = Object.values(R).filter((r) => r[k]).map((r) => r[k].mean); return { mean: round(mean(v)), n: v.length }; };
  out.setMeans = Object.fromEntries(SETS.map((k) => [k, setMean(k)]));
  out.positionControl = Object.fromEntries(SETS.map((k) => [k, round(mean(Object.values(R).filter((r) => r[k]).map((r) => r[k].pos)))]));
  out.shuffledControl = Object.fromEntries(SETS.map((k) => { const v = Object.values(R).filter((r) => r[k]?.shuf != null).map((r) => r[k].shuf); return [k, v.length ? round(mean(v)) : null]; }));
  return out;
}
export const SAME_MARGIN = 0.05, AUC_MIN = 0.60;
/** candidate groups: genus groups (Romance, Slavic, Germanic) judged by a (same genus) against e (not that genus); order groups (SOV, SVO) judged by b (same order, other genus)
 *  against c (opposite order, other genus). A target passes if same >= 0.60, same > its own pair-flip q95, and same - control >= 0.05. */
export const CANDIDATES = [["genus", "Romance"], ["genus", "Slavic"], ["genus", "Germanic"], ["order", "SOV"], ["order", "SVO"]];
export function groupTable(R) {
  const out = {};
  for (const [kind, g] of CANDIDATES) {
    const same = kind === "genus" ? "a" : "b", ctrl = kind === "genus" ? "e" : "c";
    const targets = Object.keys(R).filter((t) => (kind === "genus" ? genus(t) === g : WO3[t] === g) && R[t][same] && R[t][ctrl]);
    const rows = targets.map((t) => { const s = R[t][same], c = R[t][ctrl]; return { t, same: s.mean, ctrl: c.mean, diff: round(s.mean - c.mean), q95: s.q95, pass: s.mean >= AUC_MIN && s.mean > s.q95 && s.mean - c.mean >= SAME_MARGIN, pos: s.pos, shuf: s.shuf }; });
    const dBoot = boot(rows.map((r) => r.diff), 2000, rngFor(seedFor("fam-vs-rel", "grp", kind, g)));
    out[`${kind}:${g}`] = { kind, group: g, sameSet: same, ctrlSet: ctrl, n: rows.length, nPass: rows.filter((r) => r.pass).length, meanSame: round(mean(rows.map((r) => r.same))), meanCtrl: round(mean(rows.map((r) => r.ctrl))), diffBoot: dBoot, positionControl: round(mean(rows.map((r) => r.pos))), shuffledControl: rows.some((r) => r.shuf != null) ? round(mean(rows.filter((r) => r.shuf != null).map((r) => r.shuf))) : null, passing: rows.filter((r) => r.pass).map((r) => r.t), failing: rows.filter((r) => !r.pass).map((r) => r.t), rows };
  }
  return out;
}
