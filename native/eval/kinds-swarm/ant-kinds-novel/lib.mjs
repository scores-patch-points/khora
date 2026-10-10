// lib.mjs — shared pieces of ant-kinds-novel (kinds of beings in long texts). No LLM, no POS, no prior, no capital, no word list in anything
// that induces or reads. Capitals / the cast file are used ONLY to describe or to score kinds after the fact (they are in `describe`, never in `induce`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences } from "../../../adapters/text/spans.js";
import { rngFor, seedFor, shuffleSentences } from "../../law/impact.mjs";
import { loadBook } from "../../law/name-war-and-peace.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(HERE, "results");
export { rngFor, seedFor, shuffleSentences };
export const PP_TEXT = "/Users/mlacy/Documents/3.0/ethos/01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt";
export const COREF_WP = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json";

export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const median = (xs) => { if (!xs.length) return null; const s = xs.slice().sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };
export const log2 = Math.log2;
export const binFreq = (n) => Math.floor(Math.log2(Math.max(1, n)));
export const fold = (w) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// ── novels ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
function tokenize(text) {
  const sents = splitSentences(text);
  const stream = [], orig = [];
  for (const s of sents) {
    const toks = [], os = [];
    for (const m of s.text.matchAll(WORD)) {
      const w = m[0].replace(/^['’]+|['’]+$/g, "");
      if (!w || /^\p{N}+$/u.test(w)) continue;
      toks.push(w.normalize("NFC").toLowerCase().replace(/’/g, "'")); os.push(w);
    }
    if (toks.length >= 3) { stream.push(toks); orig.push(os); }
  }
  return { stream, orig };
}
export function loadNovel(id) {
  if (id === "wp") { const b = loadBook(); return { id, stream: b.stream.map((s) => s.map((w) => w.replace(/’/g, "'"))), orig: b.orig }; }
  if (id === "pp") {
    let text = fs.readFileSync(PP_TEXT, "utf8").replace(/^﻿/, "");
    text = text.slice(text.indexOf("It is a truth universally acknowledged"));
    text = text.slice(0, text.lastIndexOf("CHISWICK PRESS"));
    text = text.replace(/\[[^\]]{0,300}\]/g, " ").split("\n").filter((l) => !/^\s*(CHAPTER|Chapter) [IVXLC]+\.?\s*$/.test(l)).join("\n");
    return { id, ...tokenize(text) };
  }
  throw new Error(`unknown novel ${id}`);
}

/** the hand-verified cast of War and Peace: forms (diacritic-folded) of the names, surnames (final display tokens) — title-like shared tokens dropped by a DERIVED rule */
export function castWP() {
  const ref = JSON.parse(fs.readFileSync(COREF_WP, "utf8")).referents;
  const toks = (s) => [...String(s ?? "").matchAll(/[\p{L}\p{M}'’]+/gu)].map((m) => fold(m[0]));
  const nonFinal = new Map(); // token -> number of referents whose display has it in a non-final position
  for (const r of ref) { const t = toks(r.display); new Set(t.slice(0, -1)).forEach((w) => nonFinal.set(w, (nonFinal.get(w) ?? 0) + 1)); }
  const titleLike = new Set([...nonFinal].filter(([, c]) => c >= 3).map(([w]) => w));
  const core = new Set(), all = new Set();
  for (const r of ref) {
    const t = toks(r.display), nm = toks(r.name), sf = (r.surfaces ?? []).map(toks);
    [...nm, t[t.length - 1], ...sf.map((x) => x[x.length - 1])].filter(Boolean).forEach((w) => { if (!titleLike.has(w)) core.add(w); });
    [...toks(r.name), ...t, ...sf.flat(), ...String(r.id).split("_").map(fold)].forEach((w) => all.add(w));
  }
  return { core, all, titleLike, n: ref.length };
}

// ── form table, company counts, projection ────────────────────────────────────────────────────────────────────────────
export function formTable(stream, { nmin, ctxMin }) {
  const cnt = new Map();
  for (const s of stream) for (const w of s) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const forms = [...cnt].filter(([, n]) => n >= nmin).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w]) => w);
  const idx = new Map(forms.map((w, i) => [w, i]));
  const ctx = [...cnt].filter(([, n]) => n >= ctxMin).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([w]) => w);
  const cidx = new Map(ctx.map((w, i) => [w, i + 2])); // 0 = '^', 1 = '$'
  const C = ctx.length + 2;
  return { cnt, forms, idx, ctx, cidx, C, D: 2 * C, F: forms.length };
}
/** counts[f*D + j]: before-context j and after-context C+j of every mention of form f; `half[s]` in {0,1,null}: which count matrix the sentence feeds (null = both) */
export function companyCounts(stream, T, half = null) {
  const { idx, cidx, C, D, F } = T;
  const mats = [new Int32Array(F * D), new Int32Array(F * D)];
  stream.forEach((sent, s) => {
    const h = half ? half[s] : 0, L = sent.length;
    for (let i = 0; i < L; i++) {
      const f = idx.get(sent[i]); if (f === undefined) continue;
      const b = i > 0 ? cidx.get(sent[i - 1]) : 0, a = i + 1 < L ? cidx.get(sent[i + 1]) : 1;
      const m = mats[h ?? 0];
      if (b !== undefined) m[f * D + b] += 1;
      if (a !== undefined) m[f * D + C + a] += 1;
    }
  });
  return mats;
}
export function projector(D, d, seed) {
  const rnd = rngFor(seed), P = new Float32Array(D * d), s = 1 / Math.sqrt(d);
  for (let k = 0; k < P.length; k++) P[k] = rnd() < 0.5 ? -s : s;
  return P;
}
/** Hellinger (sqrt count) -> random projection to d -> L2 normalise. zero rows stay zero. Returns Float32Array(F*d) */
export function project(counts, T, P, d) {
  const { F, D } = T, out = new Float32Array(F * d);
  for (let f = 0; f < F; f++) {
    const o = f * d; let any = false;
    for (let j = 0; j < D; j++) {
      const c = counts[f * D + j]; if (!c) continue; any = true;
      const v = Math.sqrt(c), pj = j * d;
      for (let k = 0; k < d; k++) out[o + k] += v * P[pj + k];
    }
    if (any) { let n = 0; for (let k = 0; k < d; k++) n += out[o + k] ** 2; n = Math.sqrt(n) || 1; for (let k = 0; k < d; k++) out[o + k] /= n; }
  }
  return out;
}
export const rowIsZero = (X, f, d) => { for (let k = 0; k < d; k++) if (X[f * d + k] !== 0) return false; return true; };
const dotr = (X, f, c, d) => { let t = 0; for (let k = 0; k < d; k++) t += X[f * d + k] * c[k]; return t; };

/** spherical 2-means (generally K) on the rows `items` of X (dim d); returns {cent, labels aligned to items} */
export function skmeans(X, d, items, K, rnd, restarts = 5, iters = 60) {
  const fit = items.filter((f) => !rowIsZero(X, f, d));
  if (fit.length < K * 2) return null;
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const cent = [Float64Array.from({ length: d }, (_, k) => X[fit[Math.floor(rnd() * fit.length)] * d + k])];
    while (cent.length < K) {
      const d2 = fit.map((f) => { let m = Infinity; for (const c of cent) m = Math.min(m, Math.max(0, 1 - dotr(X, f, c, d))); return m * m; });
      let tot = d2.reduce((a, b) => a + b, 0), u = rnd() * tot, pick = fit.length - 1;
      for (let q = 0; q < fit.length; q++) { u -= d2[q]; if (u <= 0) { pick = q; break; } }
      cent.push(Float64Array.from({ length: d }, (_, k) => X[fit[pick] * d + k]));
    }
    let lab = new Int32Array(fit.length).fill(-1);
    for (let it = 0; it < iters; it++) {
      let moved = 0;
      fit.forEach((f, q) => { let bi = 0, bv = -Infinity; cent.forEach((c, k) => { const v = dotr(X, f, c, d); if (v > bv) { bv = v; bi = k; } }); if (lab[q] !== bi) { lab[q] = bi; moved++; } });
      const sums = Array.from({ length: K }, () => new Float64Array(d)), cn = new Int32Array(K);
      fit.forEach((f, q) => { cn[lab[q]]++; for (let k = 0; k < d; k++) sums[lab[q]][k] += X[f * d + k]; });
      for (let k = 0; k < K; k++) { if (!cn[k]) { const f = fit[Math.floor(rnd() * fit.length)]; for (let q = 0; q < d; q++) cent[k][q] = X[f * d + q]; continue; } let n = 0; for (let q = 0; q < d; q++) n += sums[k][q] ** 2; n = Math.sqrt(n) || 1; for (let q = 0; q < d; q++) cent[k][q] = sums[k][q] / n; }
      if (!moved) break;
    }
    let obj = 0; fit.forEach((f, q) => { obj += dotr(X, f, cent[lab[q]], d); });
    if (!best || obj > best.obj) best = { obj, cent: cent.map((c) => Float64Array.from(c)) };
  }
  return best;
}
export const assignRow = (X, d, f, cent) => { let bi = 0, bv = -Infinity; cent.forEach((c, k) => { const v = dotr(X, f, c, d); if (v > bv) { bv = v; bi = k; } }); return bi; };

export function ari(a, b) {
  const n = a.length; if (!n) return 0;
  const ka = [...new Set(a)], kb = [...new Set(b)];
  if (ka.length < 2 || kb.length < 2) return 0;
  const tab = new Map(); a.forEach((x, i) => { const k = `${x}|${b[i]}`; tab.set(k, (tab.get(k) ?? 0) + 1); });
  const ra = new Map(), rb = new Map();
  a.forEach((x) => ra.set(x, (ra.get(x) ?? 0) + 1)); b.forEach((x) => rb.set(x, (rb.get(x) ?? 0) + 1));
  const c2 = (x) => (x * (x - 1)) / 2;
  let s = 0; for (const v of tab.values()) s += c2(v);
  let sa = 0; for (const v of ra.values()) sa += c2(v);
  let sb = 0; for (const v of rb.values()) sb += c2(v);
  const exp = (sa * sb) / c2(n), mx = (sa + sb) / 2;
  return mx === exp ? 0 : (s - exp) / (mx - exp);
}
export function nmi(a, b) {
  const n = a.length; if (!n) return 0;
  const cnt = (xs) => { const m = new Map(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return m; };
  const pa = cnt(a), pb = cnt(b), pab = cnt(a.map((x, i) => `${x}|${b[i]}`));
  const H = (m) => { let h = 0; for (const v of m.values()) h -= (v / n) * Math.log(v / n); return h; };
  let I = 0; for (const [k, v] of pab) { const [x, y] = k.split("|"); const xa = [...pa.keys()].find((q) => String(q) === x), yb = [...pb.keys()].find((q) => String(q) === y); I += (v / n) * Math.log((v * n) / (pa.get(xa) * pb.get(yb))); }
  const h = (H(pa) + H(pb)) / 2; return h ? I / h : 0;
}

// ── the induction: recursive STABLE bisection of company vectors ──────────────────────────────────────────────────────
// A node splits in two only if the two-part partition is reproduced by clusterings fitted on DISJOINT halves of the text (block-random halves) beyond
// every draw of the same statistic on company-shuffled text (the repo's own perturbation null). The number of kinds is the number of leaves.
export const INDUCE = Object.freeze({ nmin: 20, ctxMin: 50, d: 192, pairs: 10, nullDraws: 20, minLeaf: 30, block: 100, restarts: 5 });

export function induce(stream, P0 = {}, seedTag = "induce") {
  const P = { ...INDUCE, ...P0 };
  const T = formTable(stream, { nmin: P.nmin, ctxMin: P.ctxMin });
  const proj = projector(T.D, P.d, seedFor(seedTag, "proj"));
  const nS = stream.length, nB = Math.ceil(nS / P.block);
  const draw = (strm, seed) => { // one A/B halving by random blocks; returns {A, B, full}
    const rnd = rngFor(seed), blk = Array.from({ length: nB }, () => (rnd() < 0.5 ? 0 : 1));
    const half = new Int8Array(nS); for (let s = 0; s < nS; s++) half[s] = blk[Math.floor(s / P.block)];
    const [cA, cB] = companyCounts(strm, T, half);
    const full = new Int32Array(cA.length); for (let k = 0; k < full.length; k++) full[k] = cA[k] + cB[k];
    return { A: project(cA, T, proj, P.d), B: project(cB, T, proj, P.d), full: project(full, T, proj, P.d) };
  };
  const obs = Array.from({ length: P.pairs }, (_, p) => draw(stream, seedFor(seedTag, "obs", p)));
  const nul = Array.from({ length: P.nullDraws }, (_, p) => draw(shuffleSentences(stream, seedFor(seedTag, "shuf", p)), seedFor(seedTag, "nulh", p)));
  const fullObs = obs[0].full;
  const rnd = rngFor(seedFor(seedTag, "km"));
  const stat = (D0, items) => {
    const a = skmeans(D0.A, P.d, items, 2, rnd, 3), b = skmeans(D0.B, P.d, items, 2, rnd, 3);
    if (!a || !b) return 0;
    const lab = (c) => items.map((f) => assignRow(D0.full, P.d, f, c.cent));
    return ari(lab(a), lab(b));
  };
  const nodes = [], leaves = [];
  const grow = (items, path) => {
    const node = { path, size: items.length };
    nodes.push(node);
    const leaf = (why) => { node.leaf = why; leaves.push({ path, items }); };
    if (items.length < 2 * P.minLeaf) return leaf("small");
    const top = skmeans(fullObs, P.d, items, 2, rnd, 10);
    if (!top) return leaf("no_fit");
    const lab = items.map((f) => assignRow(fullObs, P.d, f, top.cent));
    const nL = lab.filter((x) => x === 0).length;
    node.sizes = [nL, items.length - nL];
    if (Math.min(...node.sizes) < P.minLeaf) return leaf("child_small");
    const o = obs.map((D0) => stat(D0, items)), z = nul.map((D0) => stat(D0, items));
    node.ariObsMedian = round(median(o)); node.ariNullMax = round(Math.max(...z)); node.ariNullQ95 = round(quantile(z, 0.95)); node.ariObsMin = round(Math.min(...o));
    node.cent = top.cent;
    if (!(median(o) > Math.max(...z))) return leaf("unstable");
    node.split = true;
    grow(items.filter((_, q) => lab[q] === 0), path + "0");
    grow(items.filter((_, q) => lab[q] === 1), path + "1");
  };
  grow(T.forms.map((_, i) => i), "r");
  const kindOf = new Map();
  leaves.forEach((lf, k) => { lf.id = k; lf.pathId = lf.path; lf.forms = lf.items.map((f) => T.forms[f]); lf.forms.forEach((w) => kindOf.set(w, k)); });
  return { P, T, nodes, leaves, kindOf, fullObs, proj };
}

/** descend the tree for a form of thin count (5 <= n < nmin): needs its projected company vector and the node centroids. */
export function assignThin(ind, stream, minN = 5) {
  const { T, P, nodes, leaves } = ind;
  const nT = formTable(stream, { nmin: minN, ctxMin: P.ctxMin });
  // use the SAME context vocabulary as the induction: rebuild counts with T's cidx
  const thin = nT.forms.filter((w) => !T.idx.has(w));
  const idx2 = new Map(thin.map((w, i) => [w, i])), C = T.C, D = T.D;
  const counts = new Int32Array(thin.length * D);
  for (const sent of stream) for (let i = 0; i < sent.length; i++) {
    const f = idx2.get(sent[i]); if (f === undefined) continue;
    const b = i > 0 ? T.cidx.get(sent[i - 1]) : 0, a = i + 1 < sent.length ? T.cidx.get(sent[i + 1]) : 1;
    if (b !== undefined) counts[f * D + b] += 1; if (a !== undefined) counts[f * D + C + a] += 1;
  }
  const proj = ind.proj;
  const X = project(counts, { F: thin.length, D }, proj, P.d);
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const out = new Map();
  thin.forEach((w, f) => {
    if (rowIsZero(X, f, P.d)) return;
    let path = "r";
    for (;;) { const n = byPath.get(path); if (!n || !n.split) break; path += String(assignRow(X, P.d, f, n.cent)); }
    const leaf = leaves.find((l) => l.path === path); if (leaf) out.set(w, leaf.id);
  });
  return out;
}

/** Pride and Prejudice person-name forms, hand-written from knowledge of the novel BEFORE any count was seen (PREREG piece 4). Scoring/cast arm only. */
export function castPP() {
  const core = new Set("elizabeth lizzy eliza jane darcy bingley bennet wickham collins charlotte lydia kitty catherine lucas gardiner georgiana hurst caroline denny phillips philips forster fitzwilliam bourgh maria harriet hill reynolds william charles george fanny anne jenkinson".split(" "));
  return { core, all: core, titleLike: new Set(), n: core.size };
}
