// attackD.mjs -- ATTACK D (planted worlds WITHOUT the claimed mechanism).   node attackD.mjs twins [ids]  |  iid  |  knobs
// depLen is a function of the BIN sequences only, so planted twins are generated on bins (bin = floor(log2 mid-rank), from the repo's prep()):
//   twins : for every real pocket half (both halves), a TWIN generated from lag statistics of the real half and nothing else, with the REAL unit lengths:
//           bag     tokens iid from the half's marginal bin distribution                                (no order structure at all: must give v ~ 0)
//           pos     iid given the relative position bucket (10 buckets of i/(L-1))                      (positional stratification only: no neighbour structure)
//           mk1     first-order Markov chain on bins, unit-initial law = real first-token law            (lag-1 class flow only)
//           mk2     second-order Markov chain on bins with back-off to mk1 when the context has < 5 occurrences
//           mk1pos  mk1 transition matrix mixed with the positional law 50/50 (flow + stratification)
//         R = 3 replicates per twin and half (mean v).  Question: does a world with NO long-range / dependency structure reproduce the pocket's v (sign and size)?
//   iid   : structure-free worlds with other exponents and unit-length laws (what pl-null2 did once): false-PRESENT check of the chance formula.
//   knobs : two-knob planted world: iid Zipf tokens + (a) same-bin adjacency avoidance (rejection with prob a) + (b) exponential-lag self-copy (prob q, tau 2) = no syntax; v(a,q) and its window sweep W.
import fs from "node:fs";
import path from "node:path";
import { halves, nullView, seedOf, rngOf, prep, binUnits, depParts, depCell, statusOf, loadCached, TABLE, HERE, f, tokensOf } from "./lib.mjs";
const mode = process.argv[2];

function draw(cnt, off, B, rnd) { let t = 0; for (let b = 0; b < B; b++) t += cnt[off + b]; if (t <= 0) return -1; let u = rnd() * t; for (let b = 0; b < B; b++) { u -= cnt[off + b]; if (u < 0) return b; } return B - 1; }
function fit(bu, B) {
  const init = new Float64Array(B), T = new Float64Array(B * B), marg = new Float64Array(B), pos = new Float64Array(10 * B), T2 = new Float64Array(B * B * B), lens = bu.map((u) => u.length);
  for (const u of bu) { const L = u.length; init[u[0]]++; for (let i = 0; i < L; i++) { const b = u[i]; marg[b]++; pos[Math.min(9, Math.floor((10 * i) / Math.max(1, L - 1))) * B + b]++; if (i) T[u[i - 1] * B + b]++; if (i > 1) T2[(u[i - 2] * B + u[i - 1]) * B + b]++; } }
  return { B, init, T, marg, pos, T2, lens };
}
function gen(m, kind, rnd) {
  const { B, init, T, marg, pos, T2, lens } = m, out = [];
  const rs = (cnt, off) => { let t = 0; for (let b = 0; b < B; b++) t += cnt[off + b]; return t; };
  for (const L of lens) {
    const u = new Array(L);
    for (let i = 0; i < L; i++) {
      let b = -1;
      if (kind === "bag") b = draw(marg, 0, B, rnd);
      else if (kind === "pos") b = draw(pos, Math.min(9, Math.floor((10 * i) / Math.max(1, L - 1))) * B, B, rnd);
      else if (i === 0) b = draw(init, 0, B, rnd);
      else if (kind === "mk1") b = draw(T, u[i - 1] * B, B, rnd);
      else if (kind === "mk2") { const off = (u[i - 2] * B + u[i - 1]) * B; b = i >= 2 && rs(T2, off) >= 5 ? draw(T2, off, B, rnd) : draw(T, u[i - 1] * B, B, rnd); }
      else if (kind === "mk1pos") { const p = draw(pos, Math.min(9, Math.floor((10 * i) / Math.max(1, L - 1))) * B, B, rnd); b = rnd() < 0.5 ? p : draw(T, u[i - 1] * B, B, rnd); }
      if (b < 0) b = draw(marg, 0, B, rnd);
      u[i] = b;
    }
    out.push(u);
  }
  return out;
}
async function twins() {
  const rows = TABLE().filter((r) => r.kind === "real" && !r.thin), want = process.argv[3]?.split(",") ?? rows.map((r) => r.id), OUT = path.join(HERE, "D-twins"); fs.mkdirSync(OUT, { recursive: true });
  const KINDS = ["bag", "pos", "mk1", "mk2", "mk1pos"], R = 3;
  for (const id of want) {
    const file = path.join(OUT, `${id}.json`); if (fs.existsSync(file)) continue;
    const r = rows.find((x) => x.id === id), H = halves(loadCached(id)), res = { id, status: r.status, group: r.group, register: r.register, grain: r.grain, mul: r.mul, atlasV: [r.vD, r.vC], real: {}, twin: {} };
    for (const w of ["discover", "confirm"]) {
      const { bu, P } = binUnits(H[w]), B = P.B, m = fit(bu, B); res.real[w] = depParts(bu, B).v; res.twin[w] = {};
      for (const k of KINDS) { const vs = []; for (let rep = 0; rep < R; rep++) { const v = depParts(gen(m, k, rngOf(seedOf("attackD", id, w, k, rep))), B).v; if (Number.isFinite(v)) vs.push(v); } res.twin[w][k] = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; }
    }
    fs.writeFileSync(file, JSON.stringify(res)); console.error(`${id} ${r.status} real ${f(res.real.discover, 4)}/${f(res.real.confirm, 4)} mk1 ${f(res.twin.discover.mk1, 4)}/${f(res.twin.confirm.mk1, 4)} mk2 ${f(res.twin.discover.mk2, 4)} pos ${f(res.twin.discover.pos, 4)} bag ${f(res.twin.discover.bag, 4)}`);
  }
}
// ---- structure-free worlds ------------------------------------------------------------------------------------------------------------------------------------------------------------------
const cdfOf = (w) => { const c = new Float64Array(w.length); let s = 0; for (let i = 0; i < w.length; i++) { s += w[i]; c[i] = s; } for (let i = 0; i < c.length; i++) c[i] /= s; return c; };
const pick = (cdf, u) => { let lo = 0, hi = cdf.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return lo; };
const LAWS = {
  fixed4: (rnd) => 4, fixed12: (rnd) => 12, fixed40: (rnd) => 40,
  geom8: (rnd) => 2 + Math.floor(Math.log(1 - rnd()) / Math.log(1 - 1 / 7)),
  logn: (rnd) => Math.max(2, Math.min(45, Math.round(Math.exp(Math.log(9) + 0.55 * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()))))),
  shexp16: (rnd) => Math.min(70, 2 + Math.floor(-14 * Math.log(1 - rnd()))),
};
function iid() {
  const out = [], V = 5000;
  for (const s of [0.6, 1.0, 1.3, 1.8]) {
    const cdf = cdfOf(Float64Array.from({ length: V }, (_, i) => Math.pow(i + 1, -s)));
    for (const [law, fn] of Object.entries(LAWS)) for (const seed of [0, 1]) {
      const rnd = rngOf(seedOf("attackD", "iid", s, law, seed)), units = []; let tok = 0;
      while (tok < 100000) { const L = fn(rnd), u = []; for (let k = 0; k < L; k++) u.push("w" + pick(cdf, rnd())); units.push(u); tok += L; }
      const view = { id: `iid-${s}-${law}-${seed}`, which: "discover", units, docOf: units.map(() => 0) }, c = depCell(view, 30);
      out.push({ s, law, seed, tokens: tok, units: units.length, v: c.v, nullMean: c.nullMean, nullSd: c.nullSd, z: c.z, V: c.V }); console.error(view.id, f(c.v, 5), "z", f(c.z, 2));
    }
  }
  const z = out.map((o) => o.z);
  fs.writeFileSync(path.join(HERE, "D-iid.json"), JSON.stringify({ worlds: out, n: out.length, nAbsZge4: z.filter((x) => Math.abs(x) >= 4).length, nAbsZge2: z.filter((x) => Math.abs(x) >= 2).length, maxAbsV: Math.max(...out.map((o) => Math.abs(o.v))), maxAbsNullMean: Math.max(...out.map((o) => Math.abs(o.nullMean))) }, null, 1));
  console.log("iid worlds", out.length, "|z|>=4:", z.filter((x) => Math.abs(x) >= 4).length, "|z|>=2:", z.filter((x) => Math.abs(x) >= 2).length, "max|v|", Math.max(...out.map((o) => Math.abs(o.v))).toFixed(5));
}

// ---- fit: per-pocket best (a, q) of the two-knob world on the TRAINING windows W in {4,12,32}, then HELD-OUT prediction of v at W in {6,8,20,64}; reads A2/*.json (pocket-level v = mean of halves at each W)
async function fitMode() {
  const V = 5000, cdf = cdfOf(Float64Array.from({ length: V }, (_, i) => 1 / (i + 1))), WS = [4, 6, 8, 12, 20, 32, 64], binOf = (t) => Math.floor(Math.log2(t + 1)), grid = [];
  for (let a = 0; a <= 0.9001; a += 0.15) for (let q = 0; q <= 0.4001; q += 0.05) {
    const rnd = rngOf(seedOf("attackD", "fit", a.toFixed(2), q.toFixed(2))), hist = [], toks = [];
    for (let i = 0; i < 300000; i++) {
      let t;
      if (hist.length > 8 && rnd() < q) { let l = 1; while (l < 8 && rnd() > 1 - Math.exp(-1 / 2)) l++; t = hist[hist.length - l]; }
      else { t = pick(cdf, rnd()); if (hist.length && binOf(t) === binOf(hist[hist.length - 1]) && rnd() < a) t = pick(cdf, rnd()); }
      hist.push(t); toks.push(t);
    }
    const vs = {}; for (const W of WS) { const bu = []; for (let i = 0; i + W <= toks.length && bu.length * W < 150000; i += W) bu.push(toks.slice(i, i + W).map(binOf)); vs[W] = depParts(bu, 40).v; }
    grid.push({ a: +a.toFixed(2), q: +q.toFixed(2), vs });
  }
  const files = fs.readdirSync(path.join(HERE, "A2")).filter((x) => x.endsWith(".json")).sort(), TRAIN = [4, 12, 32], TEST = [6, 8, 20, 64], out = [];
  for (const fl of files) {
    const r = JSON.parse(fs.readFileSync(path.join(HERE, "A2", fl), "utf8")), v = {};
    for (const W of WS) { const c = r.W[W]; if (c.discover && c.confirm) v[W] = 0.5 * (c.discover.v + c.confirm.v); }
    if (!TRAIN.every((W) => W in v) || !TEST.every((W) => W in v)) continue;
    let best = null; for (const g of grid) { const e = TRAIN.reduce((s, W) => s + (g.vs[W] - v[W]) ** 2, 0); if (!best || e < best.e) best = { e, g }; }
    const cst = TRAIN.reduce((s, W) => s + v[W], 0) / TRAIN.length, o = { id: r.id, register: r.register, group: r.group, atlasStatus: r.atlasStatus, a: best.g.a, q: best.g.q, trainRmse: Math.sqrt(best.e / TRAIN.length), test: {} };
    for (const W of TEST) o.test[W] = { real: v[W], world: best.g.vs[W], constant: cst, zero: 0 };
    out.push(o);
  }
  const cells = out.flatMap((o) => TEST.map((W) => ({ o, W, ...o.test[W] }))), sse = (k) => cells.reduce((s, c) => s + (c.real - c[k]) ** 2, 0), my = cells.reduce((s, c) => s + c.real, 0) / cells.length, sst = cells.reduce((s, c) => s + (c.real - my) ** 2, 0);
  const big = cells.filter((c) => Math.abs(c.real) >= 0.01), sign = (k) => big.filter((c) => (c.real > 0) === (c[k] > 0)).length / big.length;
  const summary = { nPockets: out.length, nHeldOutCells: cells.length, gridWorlds: grid.length, heldOutR2: { world: 1 - sse("world") / sst, constant: 1 - sse("constant") / sst, zero: 1 - sse("zero") / sst }, nBig: big.length, signAgreeBig: { world: sign("world"), constant: sign("constant") },
    medianTrainRmse: out.map((o) => o.trainRmse).sort((x, y) => x - y)[out.length >> 1] };
  const by = {}; for (const o of out) { const k = o.register; (by[k] ||= []).push(o); }
  summary.byRegister = Object.fromEntries(Object.entries(by).filter(([, v]) => v.length >= 8).map(([k, v]) => { const cs = v.flatMap((o) => TEST.map((W) => o.test[W])); const bg = cs.filter((c) => Math.abs(c.real) >= 0.01); return [k, { n: v.length, medianA: v.map((o) => o.a).sort()[v.length >> 1], medianQ: v.map((o) => o.q).sort()[v.length >> 1], signAgreeHeldOut: bg.filter((c) => (c.real > 0) === (c.world > 0)).length / Math.max(1, bg.length) }]; }));
  fs.writeFileSync(path.join(HERE, "D-fit.json"), JSON.stringify({ summary, pockets: out }, null, 1)); console.log(JSON.stringify(summary, null, 1));
}

// ---- two-knob world --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function knobs() {
  const V = 5000, cdf = cdfOf(Float64Array.from({ length: V }, (_, i) => 1 / (i + 1))), grid = [], WS = [4, 8, 12, 20, 32, 64, 0];   // W = 0 means natural units (lognormal lengths)
  const binOf = (t) => Math.floor(Math.log2(t + 1));      // rank-index octave (rank = t+1; Zipf draw index is the type rank): 1 | 2-3 | 4-7 ...
  for (const a of [0, 0.5, 0.9]) for (const q of [0, 0.1, 0.25, 0.4]) {
    const rnd = rngOf(seedOf("attackD", "knobs", a, q)), hist = [], toks = [];
    // one long stream with two mechanisms: (a) the next token is redrawn once if it lands in the previous token's bin (prob a), (b) with prob q it copies a recent token (lag ~ exp(tau=2), lags 1..8)
    for (let i = 0; i < 400000; i++) {
      let t;
      if (hist.length > 8 && rnd() < q) { let l = 1; while (l < 8 && rnd() > 1 - Math.exp(-1 / 2)) l++; t = hist[hist.length - l]; }
      else { t = pick(cdf, rnd()); if (hist.length && binOf(t) === binOf(hist[hist.length - 1]) && rnd() < a) t = pick(cdf, rnd()); }
      hist.push(t); toks.push(t);
    }
    const row = { a, q, v: {} };
    for (const W of WS) {
      const units = []; if (W) { for (let i = 0; i + W <= toks.length && units.length * W < 100000; i += W) units.push(toks.slice(i, i + W).map((x) => "w" + x)); }
      else { const lr = LAWS.logn(rnd); let i = 0; while (i < toks.length && units.length < 12000) { const L = LAWS.logn(rnd); units.push(toks.slice(i, i + L).map((x) => "w" + x)); i += L; } }
      const c = depCell({ id: `knob-${a}-${q}-${W}`, which: "discover", units, docOf: units.map(() => 0) }, 10); row.v[W] = { v: c.v, z: c.z };
    }
    grid.push(row); console.error(`a=${a} q=${q} ` + WS.map((W) => `${W}:${f(row.v[W].v, 3)}(z${f(row.v[W].z, 0)})`).join(" "));
  }
  fs.writeFileSync(path.join(HERE, "D-knobs.json"), JSON.stringify(grid, null, 1));
}

if (mode === "fit") await fitMode();
else if (mode === "twins") await twins(); else if (mode === "iid") iid(); else if (mode === "knobs") knobs(); 
