// eval/law/provisional/family-vs-relatedness/fingerprint.mjs — A LABEL-FREE RULE: donors chosen by the COMPANY FINGERPRINT of the unlabelled stream, not by genus.
//
//   NAME_COMPANY_PAIRBLOCK=1 node fingerprint.mjs dyads                       (dev: fingerprints, distances, within-target correlation, regression with a distance covariate)
//   NAME_COMPANY_PAIRBLOCK=1 node fingerprint.mjs sets <cell> <shard> <nsh>   (dev: nearest / farthest / shuffled-nearest sets) ; node fingerprint.mjs merge <cell>
//   NAME_COMPANY_PAIRBLOCK=1 node fingerprint.mjs test <cell>                  (test: form A dev donors -> test target; form B test donors -> test target)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen: all discover.mjs outputs (dev); sister.mjs dev output; the rule-1 test output (confirm-rules.json: Romance FIRST-BOTH, form A HOLDS 5/7, form B PARTIALLY HOLDS 4/7).
//   NOT seen: any confirm-<cell>.json (test cell replications, still running when this header was written), any sister.mjs test output, any fingerprint distance, any set built on a
//   fingerprint. No fingerprint has been computed by any script. Rule 1 was selected by genus LABELS (linguistic knowledge); the reader of the project has no labels, so this file asks
//   whether an OBSERVABLE of the stream predicts which donors transfer. Observables only: no capital, POS, list, genus, word-order or script label enters a fingerprint or a distance.
// FINGERPRINT of a language stream (all token occurrences, not only candidate names): for each slot s in {L1, L2, R1, R2} the histogram of the frequency-rank bin (13 values as in name-company:
//   12 log2 bins + edge) of the neighbour at that slot. FP1 = histogram over the 13 neighbour bins. FP3 = histogram over (own-token class x neighbour bin), own class = rank bin <= 3 / 4..8 / 9..11
//   (39 cells). Distance(a, b) = mean over the cell's slots of the Jensen-Shannon divergence (natural log, 0.5 pseudo-count) between the slot histograms. Slots: LEFT cells use L1, L2;
//   BOTH cells use all four. Streams are lowercase NFC word units, PUNCT dropped (lib.mjs readConllu), exactly the streams of the pairs.
// DEV STAGE `dyads` (cells FIRST-LEFT, FIRST-BOTH, LATER-BOTH). Variant choice: the variant (FP1 or FP3) with the more negative mean within-target Spearman correlation between dyad distance and
//   the dyad transfer AUC A[d][t] (discovery-<cell>.json) at FIRST-LEFT is used everywhere (ties: FP1). F1 DISTANCE PREDICTS TRANSFER: that mean <= -0.25 and the upper end of a bootstrap
//   over targets (B = 2000) < 0. F2 BEYOND LABELS: in the dyadic fixed-effects regression of discover.mjs (wo3 clear languages; covariates sameGenus, sameFamilyOnly, sameOrder, sameScript,
//   sameMorph, sameTeam) plus the z-scored distance, the distance coefficient <= -0.01 with a pigeonhole 95% CI (B = 500) excluding 0; the change of the sameGenus coefficient is reported.
// DEV STAGE `sets` (chosen variant). Per target and cell, three equalised sets of K = 3 donors x 100 pairs, 20 seeded draws: NEAR = the 3 eligible donors of smallest distance to the target;
//   FAR = the 3 of largest distance; NEARSHUF = the 3 nearest under fingerprints computed on within-sentence SHUFFLED streams (company destroyed: the control built to fail). RANDOM = set d of
//   discovery (3 random donors, same procedure). Per target: AUC on all target pairs, POSITION-arm control, AUC on the shuffled target rows, pair-flip q95. A target PASSES if NEAR >= 0.60, NEAR > q95
//   and NEAR - RANDOM >= 0.03. F3 SELECTION GAIN: mean(NEAR - RANDOM) >= 0.02 with a target-bootstrap lower bound > 0 and mean(NEAR - FAR) >= 0.05. F4 CONTROL: mean(NEAR - NEARSHUF) >= 0.02.
//   Position control mean in [0.45, 0.55] or the cell is void. The rule's SCOPE (primary cell FIRST-LEFT) = the passing targets, if >= 3. The share of same-genus donors among each target's NEAR
//   set is reported (it is a label used for REPORTING only).
// TEST STAGE. Form A (deployment): a target's TEST stream gives its fingerprint, the donors' DEV streams give theirs; donors' DEV rows train; the target's TEST rows score. Form B: test donors
//   and test targets. Scope targets that are thin on test (< 60 pairs) are counted out and listed. Rule verdict (form A, primary cell FIRST-LEFT): HOLDS if >= 3 eligible scope targets, >= 70% pass,
//   lower bound of mean(NEAR - RANDOM) > 0 over scope targets, position control in band, mean NEAR on shuffled target rows <= 0.55. PARTIALLY HOLDS: >= 50% pass and mean(NEAR - RANDOM) >= 0.02.
//   FAILS otherwise. F1-F4 are re-evaluated on test form B (all targets) as replication. RANDOM on test is drawn here with the same procedure (3 random eligible donors, 20 draws).
// BLIND PREDICTIONS. P1 F1 true (mean rho about -0.4). P2 F2 true but small (distance coefficient -0.01 to -0.03 per SD) and the sameGenus coefficient shrinks by >= 25% when the distance is in the model.
//   P3 the NEAR set is mostly same-genus for Romance targets (>= 60% of donor slots) and rarely elsewhere (< 30%). P4 F3 true in FIRST-LEFT and FIRST-BOTH. P5 F4 true. P6 dev scope contains
//   {spa, fra, ita, por, cat} and at least two non-Romance targets. P7 test form A is HOLDS or PARTIALLY HOLDS, with a pass fraction below its dev value.
// Thresholds may be tightened, never loosened. Code freeze: groups/lib/analysis hashes must equal those of discover.mjs.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, round, mean, quantile, rngFor, seedFor, shuffleIn, headerHash, sha256, loadLang, fitProbe, pairSample, aucOn, pairFlipQ95, udDocSplit } from "./lib.mjs";
import { genus, fam, script, morph, team, WO3 } from "./groups.mjs";
import { loadAll, donorsOf, targetsOf, boot, CAP_TRAIN, K_SET, DRAWS, STRATA } from "./analysis.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results");
const CELLS = { "FIRST-LEFT": ["FIRST", "LEFT", ["L1", "L2"]], "FIRST-BOTH": ["FIRST", "BOTH", ["L1", "L2", "R1", "R2"]], "LATER-BOTH": ["LATER", "BOTH", ["L1", "L2", "R1", "R2"]] };
const fileHash = (f) => sha256(fs.readFileSync(path.join(HERE, f), "utf8"));
const prov = () => ({ headerSha256: headerHash(SELF), groupsSha256: fileHash("groups.mjs"), libSha256: fileHash("lib.mjs"), analysisSha256: fileHash("analysis.mjs") });
const rs = (...p) => rngFor(seedFor("fam-vs-rel", "fingerprint", ...p));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(RES, f), "utf8"));

// ── fingerprints and distances ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function fingerprint(stream) {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const order = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map(); order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  const H = { L1: new Array(39).fill(0), L2: new Array(39).fill(0), R1: new Array(39).fill(0), R2: new Array(39).fill(0) };
  for (const s of stream) for (let i = 0; i < s.length; i++) {
    const ob = bins.get(s[i]), oc = ob <= 3 ? 0 : ob <= 8 ? 1 : 2;
    for (const [nm, j] of [["L1", i - 1], ["L2", i - 2], ["R1", i + 1], ["R2", i + 2]]) H[nm][oc * 13 + (j < 0 || j >= s.length ? 12 : bins.get(s[j]))] += 1;
  }
  return H;
}
const norm = (h) => { const t = h.reduce((a, b) => a + b, 0) + 0.5 * h.length; return h.map((x) => (x + 0.5) / t); };
const js = (p, q) => { let s = 0; for (let i = 0; i < p.length; i++) { const m = (p[i] + q[i]) / 2; s += 0.5 * p[i] * Math.log(p[i] / m) + 0.5 * q[i] * Math.log(q[i] / m); } return s; };
const marg = (h) => { const o = new Array(13).fill(0); for (let k = 0; k < 39; k++) o[k % 13] += h[k]; return o; };
export const dist = (a, b, variant, slots) => mean(slots.map((s) => js(norm(variant === "FP1" ? marg(a[s]) : a[s]), norm(variant === "FP1" ? marg(b[s]) : b[s]))));
function fpAll(split, shuffled = false) {
  const f = path.join(RES, `fingerprints-${split}${shuffled ? "-shuf" : ""}.json`); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const out = {}; for (const stem of Object.keys(JSON.parse(fs.readFileSync(path.join(HERE, "cache", `${split}-counts.json`), "utf8")))) out[stem] = fingerprint(udDocSplit(stem, split, shuffled).stream);
  fs.writeFileSync(f, JSON.stringify(out)); return out;
}
const rank = (xs) => { const o = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
const pearson = (x, y) => { const mx = mean(x), my = mean(y); let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; } return n / Math.sqrt(dx * dy); };
const spearman = (x, y) => pearson(rank(x), rank(y));

// ── dyadic regression with a distance covariate ─────────────────────────────────────────────────────────────────────────────────────
function solve(M, b) {
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12; for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
  const x = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let v = A[r][n]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / (A[r][r] || 1e-12); } return x;
}
function wls(rows, K, wT = null, wD = null) {
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))].sort(), tI = new Map(T.map((x, i) => [x, i])), dI = new Map(D.map((x, i) => [x, i - 1])), p = K + T.length + D.length - 1;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
  for (const r of rows) {
    const w = (wT ? wT[r.t] ?? 0 : 1) * (wD ? wD[r.d] ?? 0 : 1); if (!w) continue;
    const idx = [], val = []; r.x.slice(0, K).forEach((v, j) => { if (v) { idx.push(j); val.push(v); } }); idx.push(K + tI.get(r.t)); val.push(1); const di = dI.get(r.d); if (di >= 0) { idx.push(K + T.length + di); val.push(1); }
    for (let a = 0; a < idx.length; a++) { Xty[idx[a]] += w * val[a] * r.y; for (let b = 0; b < idx.length; b++) XtX[idx[a]][idx[b]] += w * val[a] * val[b]; }
  }
  for (let j = K; j < p; j++) XtX[j][j] += 1e-6;
  return solve(XtX, Xty).slice(0, K);
}
const RCOV = ["sameGenus", "sameFamilyOnly", "sameOrder", "sameScript", "sameMorph", "sameTeam", "distZ"];
function distRows(A, fp, variant, slots) {
  const rows = [];
  for (const d of Object.keys(A)) for (const t of Object.keys(A[d])) {
    const v = A[d][t]; if (v == null || d === t || WO3[d] === "MIXED" || WO3[t] === "MIXED" || !fp[d] || !fp[t]) continue;
    rows.push({ d, t, y: v, dist: dist(fp[d], fp[t], variant, slots), x: [genus(d) === genus(t) ? 1 : 0, fam(d) === fam(t) && genus(d) !== genus(t) ? 1 : 0, WO3[d] === WO3[t] ? 1 : 0, script(d) === script(t) ? 1 : 0, morph(d) === morph(t) ? 1 : 0, team(d) && team(d) === team(t) ? 1 : 0] });
  }
  const m = mean(rows.map((r) => r.dist)), sd = Math.sqrt(mean(rows.map((r) => (r.dist - m) ** 2))); rows.forEach((r) => r.x.push((r.dist - m) / sd)); return rows;
}
function regDist(A, fp, variant, slots, B, rnd) {
  const rows = distRows(A, fp, variant, slots), full = wls(rows, 7), base = wls(rows, 6), T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))], reps = [];
  for (let b = 0; b < B; b++) {
    const wT = Object.fromEntries(T.map((x) => [x, 0])), wD = Object.fromEntries(D.map((x) => [x, 0])); for (let i = 0; i < T.length; i++) wT[T[Math.floor(rnd() * T.length)]] += 1; for (let i = 0; i < D.length; i++) wD[D[Math.floor(rnd() * D.length)]] += 1;
    reps.push(wls(rows, 7, wT, wD));
  }
  const ci = (j) => [round(quantile(reps.map((r) => r[j]), 0.025)), round(quantile(reps.map((r) => r[j]), 0.975))];
  return { n: rows.length, withDist: Object.fromEntries(RCOV.map((c, j) => [c, { est: round(full[j]), ci: ci(j) }])), withoutDist: Object.fromEntries(RCOV.slice(0, 6).map((c, j) => [c, round(base[j])])), sameGenusShrink: round(1 - full[0] / base[0]) };
}
function stageDyads() {
  const fpD = fpAll("dev"), out = { ...prov(), cells: {} };
  for (const [cell, [, , slots]] of Object.entries(CELLS)) {
    const j = rd(`discovery-${cell}.json`), A = j.dyad.A, T = j.targets; out.cells[cell] = {};
    for (const v of ["FP1", "FP3"]) {
      const rhos = T.map((t) => { const ds = Object.keys(A).filter((d) => d !== t && A[d][t] != null && fpD[d] && fpD[t]); return ds.length < 8 ? null : spearman(ds.map((d) => dist(fpD[d], fpD[t], v, slots)), ds.map((d) => A[d][t])); }).filter((x) => x != null);
      out.cells[cell][v] = { meanRho: round(mean(rhos)), boot: boot(rhos, 2000, rs("rho", cell, v)), n: rhos.length };
    }
  }
  out.variant = out.cells["FIRST-LEFT"].FP3.meanRho < out.cells["FIRST-LEFT"].FP1.meanRho ? "FP3" : "FP1";
  for (const [cell, [, , slots]] of Object.entries(CELLS)) out.cells[cell].regression = regDist(rd(`discovery-${cell}.json`).dyad.A, fpD, out.variant, slots, 500, rs("regdist", cell));
  fs.writeFileSync(path.join(RES, "fingerprint-dyads.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ variant: out.variant, rho: Object.fromEntries(Object.entries(out.cells).map(([c, v]) => [c, { FP1: v.FP1.meanRho, FP3: v.FP3.meanRho }])), distCoef: Object.fromEntries(Object.entries(out.cells).map(([c, v]) => [c, v.regression.withDist.distZ])), sameGenusShrink: Object.fromEntries(Object.entries(out.cells).map(([c, v]) => [c, v.regression.sameGenusShrink])) }, null, 1));
}

// ── nearest / farthest / shuffled-nearest / random sets ─────────────────────────────────────────────────────────────────────────────
const byDist = (xs) => xs.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
function oneSet(T, nm, fixed, cand, c) {
  const auc = [], pos = [], shuf = [], used = {}; let q95 = null;
  for (let dr = 0; dr < DRAWS; dr++) {
    const rnd = rs("sets", c.tag, T, nm, dr), picked = fixed ?? shuffleIn(cand.slice(), rnd).slice(0, K_SET);
    picked.forEach((x) => { used[x] = (used[x] ?? 0) + 1; });
    const parts = picked.map((x) => ({ L: c.donorLangs[x], idx: pairSample(c.donorLangs[x], Math.min(CAP_TRAIN, c.donorLangs[x].pairs), rnd) })), f = fitProbe(parts, c.arm), fp = fitProbe(parts, "POSITION");
    const a1 = aucOn(f, c.tLang, c.arm); if (a1 != null) auc.push(a1); const a2 = aucOn(fp, c.tLang, "POSITION"); if (a2 != null) pos.push(a2);
    if (c.tShuf) { const a3 = aucOn(f, c.tShuf, c.arm); if (a3 != null) shuf.push(a3); }
    if (dr === 0 && f) q95 = pairFlipQ95(f(c.tLang.X[c.arm]), c.tLang.y, rs("null", c.tag, T, nm));
  }
  return { mean: round(mean(auc)), pos: round(mean(pos)), shuf: shuf.length ? round(mean(shuf)) : null, q95: round(q95), pairs: c.tLang.pairs, used };
}
function setsNear(T, c) {
  const cand = c.donorList.filter((x) => x !== T), dN = byDist(cand.map((x) => [x, dist(c.fpD[x], c.fpT, c.variant, c.slots)])), dS = byDist(cand.map((x) => [x, dist(c.fpDS[x], c.fpTS, c.variant, c.slots)]));
  const near = dN.slice(0, K_SET).map((x) => x[0]), far = dN.slice(-K_SET).map((x) => x[0]), nearShuf = dS.slice(0, K_SET).map((x) => x[0]), res = {};
  for (const [nm, fixed] of [["near", near], ["far", far], ["nearShuf", nearShuf], ["rand", null]]) res[nm] = oneSet(T, nm, fixed, cand, c);
  res.near.donors = near; res.far.donors = far; res.nearShuf.donors = nearShuf; res.near.sameGenusShare = round(near.filter((x) => genus(x) === genus(T)).length / near.length);
  return res;
}
const variantOf = () => rd("fingerprint-dyads.json").variant;
function devCtx(cell, T, langs, shuf, fpD, fpDS, variant) { const [, arm, slots] = CELLS[cell]; return { cell, arm, slots, variant, donorLangs: langs, donorList: donorsOf(langs), tLang: langs[T], tShuf: shuf[T], fpD, fpT: fpD[T], fpDS, fpTS: fpDS[T], tag: `dev-${cell}` }; }
function stageSets(cell, shard, nsh) {
  const [st] = CELLS[cell], langs = loadAll("dev", st), shuf = loadAll("dev", st, ".shuf"), fpD = fpAll("dev"), fpDS = fpAll("dev", true), variant = variantOf(), T = targetsOf(langs).filter((_, i) => i % nsh === shard), R = {}, t0 = Date.now();
  for (const t of T) { R[t] = setsNear(t, devCtx(cell, t, langs, shuf, fpD, fpDS, variant)); console.error(`${cell} shard ${shard}: ${t} ${((Date.now() - t0) / 1000).toFixed(0)}s`); fs.writeFileSync(path.join(RES, `fingerprint-${cell}.sets-${shard}.json`), JSON.stringify({ R, done: false })); }
  fs.writeFileSync(path.join(RES, `fingerprint-${cell}.sets-${shard}.json`), JSON.stringify({ R, done: true }));
}
const PASS = (r) => r.near.mean >= 0.6 && r.near.mean > r.near.q95 && r.near.mean - r.rand.mean >= 0.03;
export function evalSets(R, scope = null) {
  const ts = Object.keys(R).filter((t) => !scope || scope.includes(t)), rows = ts.map((t) => ({ t, near: R[t].near.mean, far: R[t].far.mean, rand: R[t].rand.mean, nearShuf: R[t].nearShuf.mean, pass: PASS(R[t]), pos: R[t].near.pos, shuf: R[t].near.shuf, sgs: R[t].near.sameGenusShare, donors: R[t].near.donors }));
  const b = (f) => boot(rows.map(f), 2000, rs("agg", String(rows.length), String(f).length));
  const gain = b((r) => r.near - r.rand), nf = b((r) => r.near - r.far), ns = b((r) => r.near - r.nearShuf);
  const romance = rows.filter((r) => genus(r.t) === "Romance").map((r) => r.sgs), other = rows.filter((r) => genus(r.t) !== "Romance").map((r) => r.sgs);
  return { n: rows.length, nPass: rows.filter((r) => r.pass).length, passing: rows.filter((r) => r.pass).map((r) => r.t), failing: rows.filter((r) => !r.pass).map((r) => r.t), meanNear: round(mean(rows.map((r) => r.near))), meanRand: round(mean(rows.map((r) => r.rand))), meanFar: round(mean(rows.map((r) => r.far))), meanNearShuf: round(mean(rows.map((r) => r.nearShuf))), gainOverRandom: gain, nearMinusFar: nf, nearMinusNearShuf: ns, positionControl: round(mean(rows.map((r) => r.pos))), shuffledTarget: rows.some((r) => r.shuf != null) ? round(mean(rows.filter((r) => r.shuf != null).map((r) => r.shuf))) : null, sameGenusShareRomance: romance.length ? round(mean(romance)) : null, sameGenusShareOther: other.length ? round(mean(other)) : null, rows };
}
function stageMerge(cell) {
  const R = {}; for (const f of fs.readdirSync(RES).filter((x) => x.startsWith(`fingerprint-${cell}.sets-`))) { const j = rd(f); if (!j.done) throw new Error(`${f} unfinished`); Object.assign(R, j.R); }
  const E = evalSets(R), out = { cell, ...prov(), variant: variantOf(), eval: E, scope: E.passing, sets: R }; fs.writeFileSync(path.join(RES, `fingerprint-${cell}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ cell, n: E.n, nPass: E.nPass, passing: E.passing, meanNear: E.meanNear, meanRand: E.meanRand, meanFar: E.meanFar, meanNearShuf: E.meanNearShuf, gain: E.gainOverRandom, nearMinusFar: E.nearMinusFar, nearMinusNearShuf: E.nearMinusNearShuf, pos: E.positionControl, shuffledTarget: E.shuffledTarget, sgsRomance: E.sameGenusShareRomance, sgsOther: E.sameGenusShareOther }, null, 1));
}
function stageTest(cell) {
  const [st, arm, slots] = CELLS[cell], variant = variantOf(), scope = rd("fingerprint-FIRST-LEFT.json").scope, dis = rd("fingerprint-dyads.json");
  for (const k of ["groupsSha256", "libSha256", "analysisSha256"]) if (dis[k] !== prov()[k]) throw new Error(`code freeze violated: ${k}`);
  const dev = loadAll("dev", st), tst = loadAll("test", st), tstShuf = loadAll("test", st, ".shuf"), fpDev = fpAll("dev"), fpDevS = fpAll("dev", true), fpTst = fpAll("test"), fpTstS = fpAll("test", true), T = targetsOf(tst), out = { cell, ...prov(), variant, scope, forms: {} };
  for (const form of ["A", "B"]) {
    const R = {}, t0 = Date.now();
    for (const t of T) {
      const donorLangs = form === "A" ? dev : tst;
      R[t] = setsNear(t, { cell, arm, slots, variant, donorLangs, donorList: donorsOf(donorLangs), tLang: tst[t], tShuf: tstShuf[t], fpD: form === "A" ? fpDev : fpTst, fpT: fpTst[t], fpDS: form === "A" ? fpDevS : fpTstS, fpTS: fpTstS[t], tag: `test-${form}-${cell}` });
      console.error(`${cell} form ${form}: ${t} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    out.forms[form] = { all: (({ rows, ...e }) => e)(evalSets(R)), scope: evalSets(R, scope), sets: R };
  }
  fs.writeFileSync(path.join(RES, `fingerprint-test-${cell}.json`), JSON.stringify(out, null, 1));
  const v = (E) => (E.n < 3 ? "UNDERPOWERED" : E.nPass / E.n >= 0.7 && E.gainOverRandom.lo > 0 && E.positionControl >= 0.45 && E.positionControl <= 0.55 && (E.shuffledTarget == null || E.shuffledTarget <= 0.55) ? "HOLDS" : E.nPass / E.n >= 0.5 && E.gainOverRandom.mean >= 0.02 ? "PARTIALLY HOLDS" : "FAILS");
  console.log(JSON.stringify({ cell, A: { verdict: v(out.forms.A.scope), nPass: `${out.forms.A.scope.nPass}/${out.forms.A.scope.n}` }, B: { verdict: v(out.forms.B.scope), nPass: `${out.forms.B.scope.nPass}/${out.forms.B.scope.n}` } }, null, 1));
}
const mode = process.argv[2];
if (mode === "dyads") stageDyads(); else if (mode === "sets") stageSets(process.argv[3], Number(process.argv[4]), Number(process.argv[5])); else if (mode === "merge") stageMerge(process.argv[3]); else if (mode === "test") stageTest(process.argv[3]); else throw new Error("usage: fingerprint.mjs <dyads|sets|merge|test>");
