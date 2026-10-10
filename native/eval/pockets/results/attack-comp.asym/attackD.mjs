// attackD.mjs -- ATTACK D part 1: TWINS.  For every real non-thin pocket half (both halves of the atlas split) generate planted twins of the half from a few of its own low-order statistics and NOTHING else,
// keeping the REAL unit lengths, then compute comp.asym (the repo's definition, asymVar defaults) on the twin.  Question: which mechanism reproduces the pocket's comp.asym?
//   bag    tokens iid from the half's unigram law                                     (no order and no position structure: must give ~0)
//   pos    iid given the relative position bucket (10 buckets of i/(L-1)); token-level  (positional stratification only: NO neighbour dependence, i.e. no company at all)
//   edge   iid given the slot class first / last / interior; token-level                 (edge slots only, no company)
//   mk1    first-order Markov chain on the 12 rank bins (bin transition matrix of the real half), unit-initial bin law from the real first tokens, token inside a bin drawn by count   (directed rank-class company only)
//   mk1sym the same chain with the transition counts SYMMETRISED (T + T')  = reversible company: the same adjacent-bin co-occurrence strength, with the direction (the antisymmetric part) removed
// R = 3 replicate twins per kind and half; twin value = mean v; twin z = (v - atlas nullMean)/atlas nullSd in the units of the atlas within-unit null of the real half (so |z| >= 4 reads like an atlas cell).
// Output D-twins/<id>.json.   node attackD.mjs [--pockets id1,id2] [--all]   (default: the PRESENT pockets of the atlas; --all = every real non-thin pocket)
import fs from "node:fs";
import path from "node:path";
import { halves, loadCached, prep, TABLE, HERE, rngOf, seedOf, f } from "./lib.mjs";
import { asymVar } from "./asymvar.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const rows = TABLE().filter((r) => r.kind === "real" && !r.thin && ["P+", "P-", "A", "M"].includes(r.status)), ALL = argv.includes("--all");
const WANT = opt("--pockets", null)?.split(",") ?? rows.filter((r) => ALL || r.status === "P+" || r.status === "P-").map((r) => r.id);
const OUT = path.join(HERE, "D-twins"); fs.mkdirSync(OUT, { recursive: true });
const KINDS = ["bag", "pos", "edge", "mk1", "mk1sym"], R = 3, NBIN = 12;
const cumOf = (cnt, off, n) => { const c = new Float64Array(n); let s = 0; for (let i = 0; i < n; i++) { s += cnt[off + i]; c[i] = s; } return c; };
const pick = (c, rnd) => { const tot = c[c.length - 1]; if (!(tot > 0)) return -1; const u = rnd() * tot; let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] > u) hi = m; else lo = m + 1; } return lo; };
function fit(P) {
  const { us, w, bin, cnt, V, nUnits } = P, K = 10, posC = new Float64Array(K * V), edgeC = new Float64Array(3 * V), T = new Float64Array(NBIN * NBIN), init = new Float64Array(NBIN), lens = [];
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1], L = e - s; lens.push(L);
    for (let i = s; i < e; i++) { const j = i - s, b = Math.min(K - 1, Math.floor((K * j) / Math.max(1, L - 1))); posC[b * V + w[i]]++; edgeC[(j === 0 ? 0 : j === L - 1 ? 1 : 2) * V + w[i]]++; if (i > s) T[bin[w[i - 1]] * NBIN + bin[w[i]]]++; }
    init[bin[w[s]]]++;
  }
  const TS = new Float64Array(NBIN * NBIN); for (let i = 0; i < NBIN; i++) for (let j = 0; j < NBIN; j++) TS[i * NBIN + j] = T[i * NBIN + j] + T[j * NBIN + i];
  const byBin = Array.from({ length: NBIN }, () => []), cntB = Array.from({ length: NBIN }, () => []);
  for (let t = 0; t < V; t++) { byBin[bin[t]].push(t); cntB[bin[t]].push(cnt[t]); }
  return { V, lens, bag: cumOf(cnt, 0, V), pos: Array.from({ length: K }, (_, b) => cumOf(posC, b * V, V)), edge: Array.from({ length: 3 }, (_, c) => cumOf(edgeC, c * V, V)), K,
    trans: Array.from({ length: NBIN }, (_, b) => cumOf(T, b * NBIN, NBIN)), transS: Array.from({ length: NBIN }, (_, b) => cumOf(TS, b * NBIN, NBIN)), init: cumOf(init, 0, NBIN), byBin, binCum: cntB.map((c) => cumOf(c, 0, c.length)) };
}
function gen(m, kind, rnd, names) {
  const out = [];
  for (const L of m.lens) {
    const u = new Array(L); let b = -1;
    for (let i = 0; i < L; i++) {
      let t;
      if (kind === "bag") t = pick(m.bag, rnd);
      else if (kind === "pos") t = pick(m.pos[Math.min(m.K - 1, Math.floor((m.K * i) / Math.max(1, L - 1)))], rnd);
      else if (kind === "edge") t = pick(m.edge[i === 0 ? 0 : i === L - 1 ? 1 : 2], rnd);
      else { const TR = kind === "mk1sym" ? m.transS : m.trans; b = i === 0 ? pick(m.init, rnd) : pick(TR[b], rnd); if (b < 0) b = pick(m.init, rnd); t = m.byBin[b][pick(m.binCum[b], rnd)]; }
      u[i] = names[t];
    }
    out.push(u);
  }
  return out;
}
const rowOf = new Map(rows.map((r) => [r.id, r]));
for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`); if (fs.existsSync(file)) continue;
  const r = rowOf.get(id), H = halves(loadCached(id)), atlas = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")), res = { id, status: r.status, group: r.group, register: r.register, language: r.language, real: {}, null: {}, twin: {} };
  for (const w of ["discover", "confirm"]) {
    const view = H[w], P = prep(view), names = [], seen = new Map(); for (const u of view.units) for (const t of u) if (!seen.has(t)) { seen.set(t, names.length); names.push(t); }
    const a = atlas.halves[w]["comp.asym"], m = fit(P); res.real[w] = a.v; res.null[w] = { mean: a.nullMean, sd: a.nullSd }; res.twin[w] = {};
    for (const k of KINDS) { const vs = []; for (let rep = 0; rep < R; rep++) { const v = asymVar(prep({ units: gen(m, k, rngOf(seedOf("attackD", id, w, k, rep)), names) })); if (Number.isFinite(v)) vs.push(v); } res.twin[w][k] = vs.length ? vs.reduce((x, y) => x + y, 0) / vs.length : null; }
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(`${id} ${r.status} real ${f(res.real.discover, 4)}/${f(res.real.confirm, 4)} ${KINDS.map((k) => `${k} ${f(res.twin.discover[k], 4)}/${f(res.twin.confirm[k], 4)}`).join(" ")}`);
}
