// lib.mjs -- ant-code shared pieces: stream views, candidate covariates, matching with caliper + balance gate, causal rivals, company-profile features.
// Zero-model. Gold classes (U/E/K/L/A/P) come ONLY from the parsers (lex_py.py, lex_js.mjs) and select/match/evaluate; no reader ever sees them.
import fs from "node:fs";
import path from "node:path";
import { rngFor, seedFor } from "../../law/impact.mjs";
export const HERE = path.dirname(new URL(import.meta.url).pathname);
export const DATA = path.join(HERE, "data");
export const M = 128;
export const r5 = (x) => (typeof x === "number" ? Number(x.toFixed(5)) : x);
export const arr5 = (a) => Array.from(a, r5);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : 0; };

/** NP view of a lexed file: units without P tokens (empty units dropped). Returns {stream, cls, decl, raw, unitOf (NP unit -> original unit), idxOf (NP unit, NP i -> original i)}. */
export function npView(lex) {
  const stream = [], cls = [], decl = [], raw = [], unitOf = [], idxOf = [];
  lex.units.forEach((u, s) => {
    const keep = u.map((_, i) => i).filter((i) => lex.cls[s][i] !== "P");
    if (!keep.length) return;
    stream.push(keep.map((i) => u[i])); cls.push(keep.map((i) => lex.cls[s][i])); decl.push(keep.map((i) => lex.decl[s][i])); raw.push(keep.map((i) => lex.raw[s][i]));
    unitOf.push(s); idxOf.push(keep);
  });
  return { stream, cls, decl, raw, unitOf, idxOf };
}
/** Class folding for matching: U positive, E external, O = keyword/literal, X excluded (ambiguous). */
export const fold = (c) => (c === "U" ? "U" : c === "E" ? "E" : c === "K" || c === "L" ? "O" : "X");
const bin2 = (n) => Math.log2(Math.max(1, n));

/** Every occurrence with its covariates (stream only; no reader). */
export function occurrences(stream, cls, decl, mx = M) {
  const occ = new Map();
  stream.forEach((u, s) => u.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); }));
  const out = [];
  stream.forEach((u, s) => u.forEach((w, i) => {
    const o = occ.get(w), k = o.findIndex(([a, b]) => a === s && b === i);
    let wm = 0, pw = 0;
    for (const [a, b] of o) { if (a >= s - mx && a <= s) { wm += 1; if (a < s || b < i) pw += 1; } }
    const prev = k > 0 ? o[k - 1][0] : null;
    out.push({ s, i, form: w, c: cls[s][i], f: fold(cls[s][i]), decl: decl[s][i], k, freq: o.length, wm, pw, gap: prev == null ? mx + 1 : s - prev, len: w.length, ll: u.length, init: i === 0 ? 1 : 0 });
  }));
  return out;
}
export const covOf = (c, first = false) => (first
  ? [bin2(c.freq), Math.log(c.len), Math.log1p(c.ll), Math.log1p(c.i)]
  : [bin2(c.freq), Math.log1p(c.wm), Math.log1p(c.gap), Math.log(c.len), Math.log1p(c.ll), Math.log1p(c.i)]);
export const COV_NAMES = ["log2freq", "log1p_wmc", "log1p_gap", "log_len", "log1p_unitlen", "log1p_idx"];
export const COV_NAMES_FIRST = ["log2freq", "log_len", "log1p_unitlen", "log1p_idx"];

/** candidates of one file: LATER (>= 1 earlier occurrence inside the window, s >= M, length >= 3) or FIRST (k == 0, s >= M, length >= 3). */
export function candidates(occs, kind, mx = M) {
  return occs.filter((c) => c.s >= mx && c.len >= 3 && c.f !== "X" && (kind === "later" ? c.pw >= 1 : c.k === 0));
}

// ── Mann-Whitney AUC (ties mid-rank) ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function auc1(vals, y) {
  const idx = vals.map((v, k) => [v, k]).sort((a, b) => a[0] - b[0]);
  let pos = 0, neg = 0, rs = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const avg = (i + 1 + j) / 2; for (let k = i; k < j; k++) { if (y[idx[k][1]] === 1) { pos++; rs += avg; } else neg++; } i = j; }
  return pos && neg ? (rs - (pos * (pos + 1)) / 2) / (pos * neg) : 0.5;
}

// ── matching ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const PMAX = { later: 100, first: 50 }, FORM_CAP = 5;
const shuf = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
/** select the positives of a file (independent of the caliper): seeded shuffle, form cap */
export function selectPositives(cands, kind, seed) {
  const rnd = rngFor(seed), cnt = new Map(), out = [];
  for (const c of shuf(cands.filter((x) => x.f === "U"), rnd)) { if (out.length >= PMAX[kind]) break; if ((cnt.get(c.form) ?? 0) >= FORM_CAP) continue; cnt.set(c.form, (cnt.get(c.form) ?? 0) + 1); out.push(c); }
  return out;
}
/** greedy nearest-neighbour matching of `pos` into `pool` (class-folded candidates of that file); exact on first-in-line; caliper on the SD-standardised Euclid distance. */
export function matchInto(pos, pool, { kind, caliper, sdv, seed }) {
  const rnd = rngFor(seed), first = kind === "first", used = new Set(), cnt = new Map(), pairs = [];
  const P = pool.map((c, k) => ({ c, k, v: covOf(c, first).map((x, d) => x / (sdv[d] || 1)) }));
  for (const p of shuf(pos, rnd)) {
    const pv = covOf(p, first).map((x, d) => x / (sdv[d] || 1));
    let best = null, bd = Infinity;
    for (const q of P) {
      if (used.has(q.k) || q.c.init !== p.init || (cnt.get(q.c.form) ?? 0) >= FORM_CAP) continue;
      let d = 0; for (let t = 0; t < pv.length; t++) d += (pv[t] - q.v[t]) ** 2; d = Math.sqrt(d);
      if (d < bd) { bd = d; best = q; }
    }
    if (best && bd <= caliper) { used.add(best.k); cnt.set(best.c.form, (cnt.get(best.c.form) ?? 0) + 1); pairs.push({ p, n: best.c, d: bd }); }
  }
  return pairs;
}
/** balance of matched pairs (pooled over files): SMD and AUC of each covariate, plus the exact flag */
export function balanceOf(pairs, first) {
  const names = first ? COV_NAMES_FIRST : COV_NAMES;
  const P = pairs.map((x) => covOf(x.p, first)), N = pairs.map((x) => covOf(x.n, first));
  const rows = names.map((nm, d) => {
    const a = P.map((v) => v[d]), b = N.map((v) => v[d]);
    const s = Math.sqrt((sd(a) ** 2 + sd(b) ** 2) / 2);
    return { cov: nm, smd: s > 0 ? r5((mean(a) - mean(b)) / s) : 0, auc: r5(auc1([...a, ...b], [...a.map(() => 1), ...b.map(() => 0)])) };
  });
  const ok = rows.every((r) => Math.abs(r.smd) <= 0.1 && r.auc >= 0.44 && r.auc <= 0.56);
  return { n: pairs.length, rows, pass: pairs.length >= 30 && ok, initPos: r5(mean(pairs.map((x) => x.p.init))), initNeg: r5(mean(pairs.map((x) => x.n.init))) };
}
export const CALIPERS = [1.5, 1.0, 0.8, 0.6, 0.45, 0.3];

// ── causal rivals (copied from ant-shape/collect.mjs rivalsOf) and company-profile features (T5) ─────────────────────────────────────────────
export function indexStream(stream) { const occ = new Map(); stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); })); return occ; }
export const RIVAL_LABELS = ["logWinBefore", "logPrefix", "logGap", "logWinSents", "burst", "logLast16", "logLeftWinFreq", "logRightWinFreq", "leftDiv", "rightDiv", "sameLeft", "sameRight", "sentInitial", "sentFinal", "logSentLen", "logWordLen"];
export function rivalsOf(stream, occ, mx, s, i) {
  const w = stream[s][i], o = occ.get(w);
  const k = o.findIndex(([a, b]) => a === s && b === i);
  const len = stream[s].length;
  const left = i > 0 ? stream[s][i - 1] : null, right = i + 1 < len ? stream[s][i + 1] : null;
  const winCount = (word) => { if (word == null) return 0; let c = 0; for (const [a] of occ.get(word)) if (a >= s - mx && a <= s) c += 1; return c; };
  let cWin = 0, last16 = 0, sameL = 0, sameR = 0;
  const sentSet = new Set(), lset = new Set(), rset = new Set();
  for (let j = k - 1; j >= 0; j--) {
    const [a, b] = o[j]; if (s - a > mx) break;
    cWin += 1; if (s - a <= 16) last16 += 1; sentSet.add(a);
    const l = b > 0 ? stream[a][b - 1] : null, r = b + 1 < stream[a].length ? stream[a][b + 1] : null;
    lset.add(l); rset.add(r); if (l === left) sameL += 1; if (r === right) sameR += 1;
  }
  const gap = cWin > 0 ? s - o[k - 1][0] : mx + 1;
  const rate = k / Math.max(1, s);
  return arr5([Math.log1p(cWin), Math.log1p(k), Math.log1p(gap), Math.log1p(sentSet.size), Math.log((last16 + 0.5) / (rate * 16 + 0.5)), Math.log1p(last16),
    Math.log1p(winCount(left)), Math.log1p(winCount(right)), cWin ? lset.size / cWin : 0, cWin ? rset.size / cWin : 0, cWin ? sameL / cWin : 0, cWin ? sameR / cWin : 0,
    i === 0 ? 1 : 0, i === len - 1 ? 1 : 0, Math.log1p(len), Math.log(Math.max(1, w.length))]);
}
const NB = 13; // 12 rank bins + edge
const rankTable = (stream, s, mx) => {
  const cnt = new Map(); for (let a = Math.max(0, s - mx); a <= s; a++) for (const w of stream[a]) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const byc = new Map(); for (const c of cnt.values()) byc.set(c, (byc.get(c) ?? 0) + 1);
  const cs = [...byc.keys()].sort((a, b) => b - a); const start = new Map(); let r = 1; for (const c of cs) { start.set(c, r); r += byc.get(c); }
  return (w) => { const c = cnt.get(w); if (!c) return NB - 1; const rank = start.get(c) + (byc.get(c) - 1) / 2; return Math.min(11, Math.floor(Math.log2(rank))); };
};
/** T5 COMPANY (104-d): one-hot rank-bin of left1,right1,left2,right2 neighbours of the occurrence (52) + the mean of the same over the form's earlier window occurrences (52). */
export function companyOf(stream, occ, mx, s, i, cache = new Map()) {
  let bin = cache.get(s); if (!bin) { bin = rankTable(stream, s, mx); cache.set(s, bin); }
  const oneHot = (a, b) => { const v = new Array(4 * NB).fill(0); [-1, 1, -2, 2].forEach((d, t) => { const u = stream[a]; const j = b + d; v[t * NB + (j < 0 || j >= u.length ? NB - 1 : bin(u[j]))] = 1; }); return v; };
  const own = oneHot(s, i), o = occ.get(stream[s][i]), acc = new Array(4 * NB).fill(0); let n = 0;
  for (const [a, b] of o) { if (a < s - mx || a > s || (a === s && b >= i)) continue; const v = oneHot(a, b); for (let t = 0; t < v.length; t++) acc[t] += v[t]; n += 1; }
  return arr5([...own, ...acc.map((x) => (n ? x / n : 0))]);
}
export const slim = (rec) => ({ sig: arr5(rec.sig), atm: arr5(rec.atm), span: arr5(rec.span), c: arr5(rec.c), counts: rec.counts.map((x) => Math.round(x)), isNull: rec.isNull, noSlot: rec.noSlot, nTokenSlots: rec.nTokenSlots, extent: { tokens: rec.extent.tokens, frames: rec.extent.frames, radius: rec.extent.radius }, hash: rec.hash });
/** within-unit shuffle with a tracked permutation (idx map old -> new) */
export function shuffleTracked(stream, seed) {
  const rnd = rngFor(seed), newIndex = [];
  const out = stream.map((u) => { const p = u.map((_, i) => i); for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } const ni = new Array(u.length); p.forEach((old, nw) => { ni[old] = nw; }); newIndex.push(ni); return p.map((old) => u[old]); });
  return { stream: out, newIndex };
}
