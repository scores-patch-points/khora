// lib.mjs — ant-kinds-ud: company vectors, spherical k-means, ARI/NMI, split-half stability, hierarchical kind induction.
// Pre-registration: PREREG.md (sha256 in PREREG.sha256). No gold, no capitals, no POS, no word lists anywhere in this file.
import { rngFor, seedFor, shuffleSentences } from "../../law/impact.mjs";
export { rngFor, seedFor, shuffleSentences };

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
export const quantile = (xs, q) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]; };
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);

// ── partition agreement ──
const comb2 = (n) => (n * (n - 1)) / 2;
export function ari(a, b) {
  const n = a.length; if (n < 2) return null;
  const m = new Map(), ra = new Map(), rb = new Map();
  for (let i = 0; i < n; i++) { const k = a[i] + "|" + b[i]; m.set(k, (m.get(k) ?? 0) + 1); ra.set(a[i], (ra.get(a[i]) ?? 0) + 1); rb.set(b[i], (rb.get(b[i]) ?? 0) + 1); }
  let sij = 0; for (const v of m.values()) sij += comb2(v);
  let sa = 0; for (const v of ra.values()) sa += comb2(v);
  let sb = 0; for (const v of rb.values()) sb += comb2(v);
  const exp = (sa * sb) / comb2(n), mx = (sa + sb) / 2;
  return mx - exp === 0 ? 0 : (sij - exp) / (mx - exp);
}
export function nmi(a, b, w = null) {
  const n = a.length; let tot = 0;
  const m = new Map(), ra = new Map(), rb = new Map();
  for (let i = 0; i < n; i++) {
    const wi = w ? w[i] : 1; tot += wi;
    let mm = m.get(a[i]); if (!mm) { mm = new Map(); m.set(a[i], mm); }
    mm.set(b[i], (mm.get(b[i]) ?? 0) + wi); ra.set(a[i], (ra.get(a[i]) ?? 0) + wi); rb.set(b[i], (rb.get(b[i]) ?? 0) + wi);
  }
  let I = 0; for (const [x, row] of m) for (const [y, v] of row) I += (v / tot) * Math.log((v * tot) / (ra.get(x) * rb.get(y)));
  const H = (r) => { let h = 0; for (const v of r.values()) h -= (v / tot) * Math.log(v / tot); return h; };
  const ha = H(ra), hb = H(rb);
  return ha + hb > 0 ? (2 * I) / (ha + hb) : 0;
}

// ── company space ──
/** buildSpace(stream, mm): forms with >= mm mentions; context words below mm collapse to `~`. */
export function buildSpace(stream, mm) {
  const cnt = new Map();
  for (const s of stream) for (const w of s) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const key = (w) => ((cnt.get(w) ?? 0) >= mm ? w : "~");
  const ids = new Map();
  const id = (k) => { let v = ids.get(k); if (v === undefined) { v = ids.size; ids.set(k, v); } return v; };
  const B0 = id("b:^"), A0 = id("a:$");
  const FB = new Map(), FA = new Map();
  for (const w of cnt.keys()) { const k = key(w); FB.set(w, id("b:" + k)); FA.set(w, id("a:" + k)); }
  const forms = [...cnt].filter(([, n]) => n >= mm).map(([w]) => w).sort();
  const fidx = new Map(forms.map((w, i) => [w, i]));
  return { cnt, forms, fidx, FB, FA, B0, A0, nF: ids.size, mm };
}

/** vectors(space, stream, mask, minTot): sparse L2-normalised sqrt-count company vectors, per form index. mask = Uint8Array over forms or null. */
export function vectors(space, stream, mask = null, minTot = 0) {
  const maps = new Map();
  for (const s of stream) {
    const n = s.length;
    for (let i = 0; i < n; i++) {
      const fi = space.fidx.get(s[i]); if (fi === undefined) continue;
      if (mask && !mask[fi]) continue;
      let m = maps.get(fi); if (!m) { m = new Map(); maps.set(fi, m); }
      const b = i > 0 ? space.FB.get(s[i - 1]) : space.B0, a = i < n - 1 ? space.FA.get(s[i + 1]) : space.A0;
      m.set(b, (m.get(b) ?? 0) + 1); m.set(a, (m.get(a) ?? 0) + 1);
    }
  }
  const out = { fi: [], X: [], tot: [] };
  for (const fi of [...maps.keys()].sort((x, y) => x - y)) {
    const m = maps.get(fi); let tot = 0; for (const v of m.values()) tot += v / 2;
    if (tot < minTot) continue;
    const ks = [...m.keys()].sort((x, y) => x - y);
    const idx = new Int32Array(ks.length), val = new Float64Array(ks.length); let nrm = 0;
    ks.forEach((k, j) => { idx[j] = k; const v = Math.sqrt(m.get(k)); val[j] = v; nrm += v * v; });
    nrm = Math.sqrt(nrm); for (let j = 0; j < val.length; j++) val[j] /= nrm;
    out.fi.push(fi); out.X.push({ idx, val }); out.tot.push(tot);
  }
  return out;
}

const sdot = (x, c) => { let s = 0; for (let j = 0; j < x.idx.length; j++) s += x.val[j] * c[x.idx[j]]; return s; };

/** spherical k-means on sparse vectors (dense centroids), k-means++ seeding. Returns Int32Array labels. */
export function kmeans(X, K, nF, rnd, { restarts = 3, iters = 30 } = {}) {
  const n = X.length;
  if (K >= n) return Int32Array.from({ length: n }, (_, i) => i);
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const cents = [];
    const dense = (x) => { const c = new Float64Array(nF); for (let j = 0; j < x.idx.length; j++) c[x.idx[j]] = x.val[j]; return c; };
    cents.push(dense(X[Math.floor(rnd() * n)]));
    const mind = new Float64Array(n).fill(Infinity);
    for (let k = 1; k < K; k++) {
      let tot = 0;
      for (let i = 0; i < n; i++) { const d = 1 - sdot(X[i], cents[k - 1]); if (d < mind[i]) mind[i] = d; tot += mind[i] * mind[i]; }
      let pick = n - 1;
      if (tot > 0) { let u = rnd() * tot; for (let i = 0; i < n; i++) { u -= mind[i] * mind[i]; if (u <= 0) { pick = i; break; } } } else pick = Math.floor(rnd() * n);
      cents.push(dense(X[pick]));
    }
    let lab = new Int32Array(n).fill(-1), score = 0;
    for (let it = 0; it < iters; it++) {
      let changed = 0; score = 0;
      const sims = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let bk = 0, bs = -Infinity;
        for (let k = 0; k < K; k++) { const s = sdot(X[i], cents[k]); if (s > bs) { bs = s; bk = k; } }
        if (lab[i] !== bk) { lab[i] = bk; changed++; }
        sims[i] = bs; score += bs;
      }
      if (!changed) break;
      const nc = Array.from({ length: K }, () => new Float64Array(nF)), sz = new Int32Array(K);
      for (let i = 0; i < n; i++) { const c = nc[lab[i]]; sz[lab[i]]++; const x = X[i]; for (let j = 0; j < x.idx.length; j++) c[x.idx[j]] += x.val[j]; }
      for (let k = 0; k < K; k++) {
        if (!sz[k]) { let wi = 0, ws = Infinity; for (let i = 0; i < n; i++) if (sims[i] < ws) { ws = sims[i]; wi = i; } cents[k] = dense(X[wi]); sims[wi] = Infinity; continue; }
        let nr = 0; for (let f = 0; f < nF; f++) nr += nc[k][f] * nc[k][f]; nr = Math.sqrt(nr) || 1;
        for (let f = 0; f < nF; f++) nc[k][f] /= nr; cents[k] = nc[k];
      }
    }
    if (!best || score > best.score) best = { score, lab: Int32Array.from(lab) };
  }
  // relabel by first appearance (stable)
  const mp = new Map(); const out = new Int32Array(n);
  for (let i = 0; i < n; i++) { if (!mp.has(best.lab[i])) mp.set(best.lab[i], mp.size); out[i] = mp.get(best.lab[i]); }
  return out;
}

// ── split-half stability against the shuffled-company null ──
function maskOf(space, subset) { if (!subset) return null; const m = new Uint8Array(space.forms.length); for (const i of subset) m[i] = 1; return m; }
function halfPair(space, streamA, streamB, subset, K, rnd, mm) {
  const mask = maskOf(space, subset), mt = Math.ceil(mm / 2);
  const A = vectors(space, streamA, mask, mt), B = vectors(space, streamB, mask, mt);
  const inB = new Map(B.fi.map((f, j) => [f, j]));
  const ia = [], ib = [];
  A.fi.forEach((f, j) => { if (inB.has(f)) { ia.push(j); ib.push(inB.get(f)); } });
  if (ia.length < 4 * K) return { ari: null, n: ia.length };
  const la = kmeans(ia.map((j) => A.X[j]), K, space.nF, rnd), lb = kmeans(ib.map((j) => B.X[j]), K, space.nF, rnd);
  return { ari: ari(Array.from(la), Array.from(lb)), n: ia.length };
}
/** stability(space, stream, subset, K, S, tag, {chrono}) -> {medObs, q95Null, margin, obs, nul, nElig}. Random sentence halves (or chronological halves if chrono). */
export function stability(space, stream, subset, K, S, tag, { chrono = false } = {}) {
  const obs = [], nul = [], ns = [];
  for (let s = 0; s < S; s++) {
    const rnd = rngFor(seedFor(tag, "split", K, s));
    let isA;
    if (chrono) { const h = stream.length >> 1; isA = stream.map((_, i) => i < h); } else isA = stream.map(() => rnd() < 0.5);
    const split = (st) => [st.filter((_, i) => isA[i]), st.filter((_, i) => !isA[i])];
    const [A, B] = split(stream);
    const r1 = halfPair(space, A, B, subset, K, rnd, space.mm);
    const z = shuffleSentences(stream, seedFor(tag, "null", K, s));
    const [ZA, ZB] = split(z);
    const r0 = halfPair(space, ZA, ZB, subset, K, rnd, space.mm);
    if (r1.ari != null) { obs.push(r1.ari); ns.push(r1.n); }
    if (r0.ari != null) nul.push(r0.ari);
  }
  const medObs = median(obs), q95Null = nul.length ? quantile(nul, 0.95) : null;
  return { K, medObs, q95Null, margin: medObs != null && q95Null != null ? medObs - q95Null : null, obs, nul, nElig: mean(ns) };
}

export const LADDER = [2, 3, 4, 6, 8, 12, 16, 24];
export const SUB_LADDER = [2, 3, 4];

/** induce(stream, {mm, S, minChild, tag}): hierarchical company-only kinds. Returns {space, curve, Kstar, top, leaf, sub}. */
export function induce(stream, { mm = 5, S = 10, minChild = 8, tag = "x", minForms = 60 } = {}) {
  const space = buildSpace(stream, mm);
  const nForms = space.forms.length;
  if (nForms < minForms) return { space, gap: "thin", nForms };
  const Kcap = Math.floor(Math.sqrt(nForms));
  const ladder = LADDER.filter((K) => K <= Kcap);
  const curve = ladder.map((K) => { const r = stability(space, stream, null, K, S, tag + ":top"); return { K, medObs: round(r.medObs), q95Null: round(r.q95Null), margin: round(r.margin), nElig: round(r.nElig, 1) }; });
  let Kstar = 1, bm = 0; for (const c of curve) if (c.margin != null && c.margin > bm) { bm = c.margin; Kstar = c.K; }
  const full = vectors(space, stream, null, 0);
  const n = space.forms.length;
  const top = new Int32Array(n).fill(-1);
  const pos = new Map(full.fi.map((f, j) => [f, j]));
  if (Kstar === 1) full.fi.forEach((f) => { top[f] = 0; });
  else { const lab = kmeans(full.X, Kstar, space.nF, rngFor(seedFor(tag, "final")), { restarts: 10 }); full.fi.forEach((f, j) => { top[f] = lab[j]; }); }
  // refinement
  const leaf = new Int32Array(n).fill(-1), parent = [], subInfo = [];
  let nl = 0;
  for (let k = 0; k < Math.max(1, Kstar); k++) {
    const members = []; for (let f = 0; f < n; f++) if (top[f] === k) members.push(f);
    let split = null;
    if (members.length >= 2 * minChild) {
      const lad = SUB_LADDER.filter((K) => K * minChild <= members.length);
      const cs = lad.map((K) => { const r = stability(space, stream, members, K, S, tag + ":sub" + k); return { K, margin: r.margin, medObs: r.medObs, q95Null: r.q95Null }; }).filter((c) => c.margin != null && c.margin > 0).sort((a, b) => b.margin - a.margin);
      subInfo.push({ top: k, size: members.length, tried: cs.concat([]).map((c) => ({ K: c.K, margin: round(c.margin) })), all: lad });
      for (const c of cs) {
        const X = members.map((f) => full.X[pos.get(f)]);
        const lab = kmeans(X, c.K, space.nF, rngFor(seedFor(tag, "subfinal", k, c.K)), { restarts: 10 });
        const sz = new Array(c.K).fill(0); lab.forEach((l) => sz[l]++);
        if (Math.min(...sz) >= minChild) { split = { K: c.K, lab, margin: c.margin }; break; }
      }
    } else subInfo.push({ top: k, size: members.length, tried: [], all: [] });
    if (split) { const base = nl; for (let j = 0; j < split.K; j++) { parent.push(k); nl++; } members.forEach((f, j) => { leaf[f] = base + split.lab[j]; }); subInfo[subInfo.length - 1].accepted = split.K; }
    else { parent.push(k); members.forEach((f) => { leaf[f] = nl; }); nl++; }
  }
  return { space, curve, Kstar, margin: bm, top, leaf, parent, nLeaves: nl, subInfo, Kcap, nForms };
}
