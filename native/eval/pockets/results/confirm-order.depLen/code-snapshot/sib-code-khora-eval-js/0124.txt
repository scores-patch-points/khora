// provisional/polarity-map/lib.mjs — shared helpers for the polarity map (NEW FILE; imports existing modules, edits none).
// Company-DIVERSITY of a word FORM, label-free: neighbour collision rates / entropy / type-token ratio over the form's own occurrences.
import { createHash } from "node:crypto";
import fs from "node:fs";
process.env.NAME_COMPANY_PAIRBLOCK = "1"; // both members of a matched pair share a block (see NAME-COMPANY-RESULTS.md); must be set BEFORE the dynamic import below
const NC = await import("../../name-company.mjs");
export const pairsOf = NC.pairsOf;
export { rngFor, seedFor } from "../../impact.mjs";
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const headerSha = (file) => createHash("sha256").update(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);

// ── stream preparation: own rank bins (same recipe as name-company rankBins), occurrence index, k = earlier occurrences ──────────────
export function prep(stream) {
  const count = new Map(); for (const s of stream) for (const w of s) count.set(w, (count.get(w) ?? 0) + 1);
  const order = [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map();
  order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  const occ = new Map(), kArr = stream.map((u) => new Int32Array(u.length));
  stream.forEach((u, s) => u.forEach((w, i) => { let a = occ.get(w); if (!a) occ.set(w, (a = [])); kArr[s][i] = a.length / 2; a.push(s, i); }));
  return { stream, bins, count, occ, kArr };
}
// neighbours of occurrence (a,b): [left form, right form, left rank-bin, right rank-bin]; edges are "^"/"$" and bin 12
const nbOf = (P, a, b) => { const u = P.stream[a], hasL = b > 0, hasR = b + 1 < u.length, l = hasL ? u[b - 1] : "^", r = hasR ? u[b + 1] : "$"; return [l, r, hasL ? P.bins.get(l) ?? 11 : 12, hasR ? P.bins.get(r) ?? 11 : 12]; };
function stats(arr) { // unbiased pair-collision diversity D = 1 - sum c(c-1)/(n(n-1)); T = distinct/n; H = plug-in Shannon bits
  const m = new Map(); for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  const n = arr.length; let col = 0, H = 0;
  for (const c of m.values()) { col += c * (c - 1); const p = c / n; H -= p * Math.log2(p); }
  return { D: n > 1 ? 1 - col / (n * (n - 1)) : null, T: m.size / n, H };
}
export const FEATS = ["DLf", "DRf", "DLRf", "DLb", "DRb", "DLRb", "ELb", "ERb", "TLf", "TRf"];
export const CAUSAL_EXTRA = ["NOVL", "NOVR"];
/** Diversity features of the FORM at (s,i). mode FULL = all its occurrences (needs n>=3; includes the current one; NOT causal);
 *  mode CAUSAL4 = exactly the 4 occurrences immediately before (needs k>=4; prefix only; NOVL = share of those whose left form differs from the current left form; NOVR uses the right = lookahead of 1). */
export function divFeatures(P, s, i, mode) {
  const w = P.stream[s][i], o = P.occ.get(w), k = P.kArr[s][i], js = [];
  if (mode === "FULL") for (let j = 0; j < o.length / 2; j++) js.push(j); else for (let j = k - 4; j < k; j++) js.push(j);
  const lf = [], rf = [], lb = [], rb = [];
  for (const j of js) { const [l, r, bl, br] = nbOf(P, o[2 * j], o[2 * j + 1]); lf.push(l); rf.push(r); lb.push(bl); rb.push(br); }
  const a = stats(lf), b = stats(rf), c = stats(lb), d = stats(rb);
  const f = { DLf: a.D, DRf: b.D, DLRf: (a.D + b.D) / 2, DLb: c.D, DRb: d.D, DLRb: (c.D + d.D) / 2, ELb: c.H, ERb: d.H, TLf: a.T, TRf: b.T };
  if (mode !== "FULL") { const [cl, cr] = nbOf(P, s, i); f.NOVL = 1 - lf.filter((x) => x === cl).length / lf.length; f.NOVR = 1 - rf.filter((x) => x === cr).length / rf.length; }
  return f;
}
// ── statistics on matched pairs: rows[2k] positive, rows[2k+1] negative ─────────────────────────────────────────────────────────────
export function formCap(rows, cap = 3, maxPairs = 600) {
  const cp = new Map(), cn = new Map(), out = [];
  for (let k = 0; k < rows.length / 2 && out.length / 2 < maxPairs; k++) {
    const p = rows[2 * k], q = rows[2 * k + 1], a = cp.get(p.w) ?? 0, b = cn.get(q.w) ?? 0;
    if (a >= cap || b >= cap) continue; cp.set(p.w, a + 1); cn.set(q.w, b + 1); out.push(p, q);
  }
  return out;
}
const wr = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);
export function pairAuc(vp, vn, clusters, B, rnd) { // matched-pair win rate (= AUC on matched pairs) + cluster-bootstrap 95% CI (clusters = positive form)
  const n = vp.length; if (!n) return null;
  const d = vp.map((x, k) => wr(x, vn[k])), est = mean(d);
  const cid = new Map(); clusters.forEach((c, k) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += d[k]; a[1] += 1; });
  const cs = [...cid.values()], bs = [];
  for (let b = 0; b < B; b++) { let s = 0, m = 0; for (let t = 0; t < cs.length; t++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); }
  return { auc: round(est), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), nClusters: cs.length };
}
export function pooledAuc(x, y) { // Mann-Whitney, mid-ranks. y 1 = positive
  const idx = x.map((v, k) => [v, k]).sort((a, b) => a[0] - b[0]); let pos = 0, neg = 0, rs = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const av = (i + 1 + j) / 2; for (let k = i; k < j; k++) { if (y[idx[k][1]] === 1) { pos++; rs += av; } else neg++; } i = j; }
  return pos && neg ? (rs - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}
/** Evaluate one cell from pooled rows (each row carries its own P): matched-pair AUC + CI for every feature, pooled AUC, controls. */
export function evalCell(rows, mode, rnd, B = 300) {
  const n = rows.length / 2; if (!n) return { pairs: 0 };
  const F = rows.map((r) => divFeatures(r.P, r.s, r.i, mode)), names = mode === "FULL" ? FEATS : [...FEATS, ...CAUSAL_EXTRA];
  const pos = rows.filter((_, k) => k % 2 === 0), neg = rows.filter((_, k) => k % 2 === 1), cl = pos.map((r) => `${r.doc}|${r.w}`), y = rows.map((r) => r.y);
  const cell = { pairs: n, posForms: new Set(cl).size, feats: {}, ctrl: {} };
  for (const f of names) { const x = F.map((o) => o[f]), vp = x.filter((_, k) => k % 2 === 0), vn = x.filter((_, k) => k % 2 === 1); const a = pairAuc(vp, vn, cl, B, rnd); cell.feats[f] = { ...a, pooled: round(pooledAuc(x, y)), mean: round(mean(vp)), meanNeg: round(mean(vn)) }; }
  const ctl = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2), len: (r) => [...r.w].length, slen: (r) => r.P.stream[r.s].length, kprior: (r) => r.P.kArr[r.s][r.i] };
  for (const [nm, g] of Object.entries(ctl)) cell.ctrl[nm] = round(pairAuc(pos.map(g), neg.map(g), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55;
  cell.freqControlOk = cell.ctrl.logn >= 0.45 && cell.ctrl.logn <= 0.55;
  return cell;
}
/** A doc for pairsOf from a base {name, P, gold}, a class definition def(gold, form) -> "P"|"N"|null and a mode (eligibility: FULL n>=3 [flat occ list >= 6], CAUSAL4 k>=4). */
export function docOf(base, def, mode, P = base.P, gold = base.gold) {
  return { name: base.name, stream: P.stream, block: () => 0, cls: (s, i) => { const w = P.stream[s][i], g = def(gold[s][i], w); if (!g) return null; if (mode === "FULL" ? P.occ.get(w).length < 6 : P.kArr[s][i] < 4) return null; return g; } };
}
/** Pool matched pairs over one or more bases (code: one base per file), then evaluate. opts.get(base) -> {P, gold} lets controls swap in shuffled streams. */
export function runCells(bases, def, mode, seedTag, { B = 300, maxPairs = 600, perBase = null, get = (b) => ({ P: b.P, gold: b.gold }) } = {}) {
  const rows = [], meta = { dropped: 0, pairsBeforeCap: 0 };
  const per = perBase ?? Math.ceil(maxPairs / bases.length);
  for (const b of bases) {
    const { P, gold } = get(b), r = rngFor(seedFor("polarity-map", seedTag, b.name, mode));
    const pr = pairsOf(docOf(b, def, mode, P, gold), "LATER", r, Math.max(3000, per * 5));
    meta.dropped += pr.dropped; meta.pairsBeforeCap += pr.pairs;
    for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); }
  }
  const rnd = rngFor(seedFor("polarity-map", seedTag, "boot", bases[0].name, mode));
  return { ...evalCell(rows, mode, rnd, B), ...meta };
}
/** within-sentence shuffle of a base (company destroyed, sentence length kept); gold moves with its token */
export function shuffledOf(base, seed) {
  const rnd = rngFor(seed), st = [], gd = [];
  base.P.stream.forEach((u, s) => { const idx = shuffleIn(u.map((_, i) => i), rnd); st.push(idx.map((j) => u[j])); gd.push(idx.map((j) => base.gold[s][j])); });
  return { P: prep(st), gold: gd };
}
// ── label-free register properties (computed from the stream ONLY: no gold, no casing, no POS) ────────────────────────────────────
export const PROP_NAMES = ["logMeanLen", "initRareEnrich", "finalRareEnrich", "leftRigid", "rightRigid", "asymRigid", "topLeftShare", "rareRareLeft", "ttr10k"];
export function propsOf(P) {
  const S = P.stream, RARE = 7; let nTok = 0, rare0 = 0, n0 = 0, rareM = 0, nM = 0, rareF = 0, nF = 0, topL = 0, nL = 0, rr = 0, nr = 0;
  for (const u of S) {
    nTok += u.length;
    u.forEach((w, i) => {
      const rare = (P.bins.get(w) ?? 11) >= RARE;
      if (i === 0) { n0++; if (rare) rare0++; } else if (u.length >= 2 && i === u.length - 1) { nF++; if (rare) rareF++; } else { nM++; if (rare) rareM++; }
      if (i > 0) { const lb = P.bins.get(u[i - 1]) ?? 11; nL++; if (lb <= 1) topL++; if (rare) { nr++; if (lb >= RARE) rr++; } }
    });
  }
  const sm = 1e-3, e0 = (rare0 / n0 + sm) / (rareM / nM + sm), eF = (rareF / nF + sm) / (rareM / nM + sm);
  let lr = [], rrg = [], seen = 0; // type-averaged rigidity of rare forms with n >= 3 (collision rate of neighbour forms), first 2000 such forms in sorted order
  for (const [w, o] of [...P.occ].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (o.length < 6 || (P.bins.get(w) ?? 11) < RARE) continue; if (seen++ >= 2000) break;
    const L = [], R = []; for (let j = 0; j < o.length; j += 2) { const u = S[o[j]], b = o[j + 1]; L.push(b > 0 ? u[b - 1] : "^"); R.push(b + 1 < u.length ? u[b + 1] : "$"); }
    lr.push(1 - stats(L).D); rrg.push(1 - stats(R).D);
  }
  const types = new Set(); let cnt = 0; for (const u of S) { for (const w of u) { if (cnt < 10000) types.add(w); cnt++; } if (cnt >= 10000) break; }
  const leftRigid = mean(lr), rightRigid = mean(rrg);
  return { nTok, nUnit: S.length, logMeanLen: round(Math.log2(nTok / S.length)), initRareEnrich: round(Math.log2(e0)), finalRareEnrich: round(Math.log2(eF)), leftRigid: round(leftRigid), rightRigid: round(rightRigid), asymRigid: round(leftRigid - rightRigid), topLeftShare: round(topL / nL), rareRareLeft: round(nr ? rr / nr : null), ttr10k: cnt >= 10000 ? round(types.size / 10000) : null, rigidForms: lr.length };
}
import { rngFor, seedFor } from "../../impact.mjs";
