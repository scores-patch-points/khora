// lib.mjs — shared pieces of ant-kinds-chat (see PREREG.md; sha256 in PREREG.sha256). No gold, no POS, no capital, no word list in any function here
// except `loadIrcDay`, whose gold is the speaker metadata and is used only AFTER induction (characterisation) and as the K3 positive class.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { rngFor, seedFor } from "../../law/impact.mjs";
export { rngFor, seedFor };

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS = path.join(HERE, "results");
export const ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community";
export const IRC_ROOT = path.join(ROOT, "ubuntu-irc");
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const preregSha = () => sha256(fs.readFileSync(path.join(HERE, "PREREG.md"), "utf8").split("# END OF PRE-REGISTRATION")[0]);
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const log2bin = (n) => Math.floor(Math.log2(Math.max(1, n)));

// ── tokenisation: copied from eval/law/name-rule-informal.mjs ──────────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
export const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());

// ── IRC: channel-days, split, gold (rule copied from name-rule-informal.mjs loadIrc) ───────────────────────────────────────────────────────
export function ircDays() {
  const out = [];
  for (const ch of ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]) {
    const d = path.join(IRC_ROOT, ch);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) {
      const p = path.join(d, f), head = fs.readFileSync(p, "utf8").slice(0, 400);
      const m = /messages: "(\d+)"/.exec(head);
      if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head)) {
        const rel = path.relative(IRC_ROOT, p);
        out.push({ rel, path: p, channel: ch, n: Number(m[1]), split: parseInt(sha256("kinds-chat|" + rel).slice(0, 2), 16) % 2 === 0 ? "DEV" : "CONF" });
      }
    }
  }
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}
export const nickForm = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
export function loadIrcDay(day) {
  const lines = fs.readFileSync(day.path, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
  const spoke = new Map();
  for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
  const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => nickForm(n)).filter((n) => n.length >= 3));
  const msgs = lines.map(([, nick, text]) => ({ nick: nickForm(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
  const tot = new Map(); let totalTokens = 0;
  for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); totalTokens += 1; }
  const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / totalTokens >= 1 / 300));
  const gold = new Set();
  msgs.forEach((m, k) => m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) gold.add(`${k}:${i}`); }));
  return { ...day, stream: msgs.map((m) => m.toks), speakers: msgs.map((m) => m.nick), gold, nickForms, topic };
}

// ── other registers: documents = arrays of messages (token arrays) ─────────────────────────────────────────────────────────────────────────
const body = (txt) => { const m = /^---\n[\s\S]*?\n---\n/.exec(txt); return m ? txt.slice(m[0].length) : txt; };
const front = (txt, key) => { const m = new RegExp(`^${key}: "([^"]*)"`, "m").exec(txt.slice(0, 600)); return m ? m[1] : null; };
function loadFileDocs(dir, key, minMsgs) { // one document per FILE (halves are by file parity); `group` = contributor / conversation (impact windows concatenate a group)
  const docs = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
    const txt = fs.readFileSync(path.join(dir, f), "utf8");
    const stream = body(txt).split("\n").map(tokensOf).filter((t) => t.length >= 1);
    if (stream.length >= minMsgs) docs.push({ name: f, group: front(txt, key) ?? f, stream });
  }
  return docs;
}
export const loadSmsDocs = () => loadFileDocs(path.join(ROOT, "nus-sms", "en"), "contributor", 20);
export const loadCosemDocs = () => loadFileDocs(path.join(ROOT, "cosem"), "conversation", 20);
export function groupStreams(docs) { const by = new Map(); for (const d of docs) (by.get(d.group) ?? by.set(d.group, []).get(d.group)).push(...d.stream); return [...by].map(([name, stream]) => ({ name, stream })); }
const HDR = /^(from|to|cc|bcc|subject|sent|date|attachments|importance|mime-version|x-[\w-]+):/i;
export function emailSentences(txt) {
  const out = []; let inHdr = false, para = [];
  const flush = () => { if (para.length) { for (const s of para.join(" ").split(/(?<=[.!?])\s+/)) { const t = tokensOf(s); if (t.length >= 1) out.push(t); } para = []; } };
  for (const line of body(txt).split("\n")) {
    if (/^-- \w{3}, \d/.test(line) || /^-{5,}/.test(line) || /forwarded by/i.test(line)) { flush(); inHdr = false; continue; }
    if (HDR.test(line)) { flush(); inHdr = !/^subject:/i.test(line); continue; }
    if (inHdr) { if (!line.trim()) inHdr = false; continue; }
    if (!line.trim()) { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return out;
}
export function loadEnronDocs(mailboxes = null) {
  const dir = path.join(ROOT, "enron"), docs = [];
  for (const mb of fs.readdirSync(dir).sort()) {
    if (mailboxes && !mailboxes.includes(mb)) continue;
    for (const f of fs.readdirSync(path.join(dir, mb)).filter((x) => x.endsWith(".txt")).sort())
      docs.push({ name: `${mb}/${f}`, group: mb, mailbox: mb, stream: emailSentences(fs.readFileSync(path.join(dir, mb, f), "utf8")) });
  }
  return docs.filter((d) => d.stream.length >= 40);
}

// ── company vectors on integer ids (kind-standing.js contextVectors semantics: before=/after=, ^ and $ are their own tokens) ───────────────
export function countTypes(docs) {
  const c = new Map();
  for (const d of docs) for (const m of d) for (const t of m) c.set(t, (c.get(t) ?? 0) + 1);
  return c;
}
/** feature index: the F most frequent tokens (before/after), plus ^ and $. feature id: 2*j for before=tok_j, 2*j+1 for after=tok_j. */
export function featureIndex(counts, F) {
  const top = [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, F).map((x) => x[0]);
  const feat = new Map(top.map((t, j) => [t, j]));
  return { feat, F: top.length, P: 2 * (top.length + 2), names: [...top, "^", "$"] };
}
/** CSR of company counts for the forms in `vocab` (Map form -> row). */
export function companyCSR(docs, vocab, fi) {
  const V = vocab.size, maps = Array.from({ length: V }, () => new Map());
  const { feat, F } = fi;
  for (const d of docs) for (const m of d) {
    const n = m.length;
    for (let i = 0; i < n; i++) {
      const r = vocab.get(m[i]); if (r === undefined) continue;
      const mp = maps[r];
      const b = i > 0 ? feat.get(m[i - 1]) : F; if (b !== undefined) { const k = 2 * b; mp.set(k, (mp.get(k) ?? 0) + 1); }
      const a = i < n - 1 ? feat.get(m[i + 1]) : F + 1; if (a !== undefined) { const k = 2 * a + 1; mp.set(k, (mp.get(k) ?? 0) + 1); }
    }
  }
  let nnz = 0; for (const mp of maps) nnz += mp.size;
  const ptr = new Int32Array(V + 1), idx = new Int32Array(nnz), val = new Float64Array(nnz);
  let q = 0;
  maps.forEach((mp, r) => { ptr[r] = q; for (const [k, v] of [...mp].sort((a, b) => a[0] - b[0])) { idx[q] = k; val[q] = Math.sqrt(v); q++; } });
  ptr[V] = q;
  return { V, P: fi.P, ptr, idx, val };
}
/** type-mean of the sqrt-count rows */
export function csrMean(csr) {
  const mu = new Float64Array(csr.P);
  for (let q = 0; q < csr.val.length; q++) mu[csr.idx[q]] += csr.val[q];
  for (let k = 0; k < csr.P; k++) mu[k] /= csr.V;
  return mu;
}
function rowScale(csr, mu) { // s_i = 1 / ||x_i - mu||
  const muN = mu.reduce((a, b) => a + b * b, 0), s = new Float64Array(csr.V);
  for (let i = 0; i < csr.V; i++) {
    let xx = 0, xm = 0;
    for (let q = csr.ptr[i]; q < csr.ptr[i + 1]; q++) { xx += csr.val[q] ** 2; xm += csr.val[q] * mu[csr.idx[q]]; }
    const nn = Math.max(1e-12, xx - 2 * xm + muN); s[i] = 1 / Math.sqrt(nn);
  }
  return s;
}
const mulZ = (csr, mu, s, cols) => cols.map((w) => { // Z w, Z = diag(s)(X - 1 mu^T)
  const out = new Float64Array(csr.V); let c = 0; for (let k = 0; k < csr.P; k++) c += mu[k] * w[k];
  for (let i = 0; i < csr.V; i++) { let a = 0; for (let q = csr.ptr[i]; q < csr.ptr[i + 1]; q++) a += csr.val[q] * w[csr.idx[q]]; out[i] = s[i] * (a - c); }
  return out;
});
const mulZt = (csr, mu, s, cols) => cols.map((y) => { // Z^T y
  const out = new Float64Array(csr.P); let sy = 0;
  for (let i = 0; i < csr.V; i++) { const t = s[i] * y[i]; sy += t; for (let q = csr.ptr[i]; q < csr.ptr[i + 1]; q++) out[csr.idx[q]] += csr.val[q] * t; }
  for (let k = 0; k < csr.P; k++) out[k] -= mu[k] * sy;
  return out;
});
const dotv = (a, b) => { let t = 0; for (let k = 0; k < a.length; k++) t += a[k] * b[k]; return t; };
function orth(cols) { // modified Gram-Schmidt, twice
  const q = [];
  for (const c0 of cols) {
    const c = Float64Array.from(c0);
    for (let pass = 0; pass < 2; pass++) for (const u of q) { const d = dotv(u, c); for (let k = 0; k < c.length; k++) c[k] -= d * u[k]; }
    const n = Math.sqrt(dotv(c, c)); if (n < 1e-10) { q.push(new Float64Array(c.length)); continue; }
    for (let k = 0; k < c.length; k++) c[k] /= n; q.push(c);
  }
  return q;
}
function jacobiEigen(A) { // symmetric n x n (array of Float64Array), returns {vals, vecs (columns as arrays)}
  const n = A.length, a = A.map((r) => Float64Array.from(r)), v = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
  for (let sweep = 0; sweep < 30; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-14) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const kp = a[k][p], kq = a[k][q]; a[k][p] = c * kp - s * kq; a[k][q] = s * kp + c * kq; }
      for (let k = 0; k < n; k++) { const pk = a[p][k], qk = a[q][k]; a[p][k] = c * pk - s * qk; a[q][k] = s * pk + c * qk; }
      for (let k = 0; k < n; k++) { const kp = v[k][p], kq = v[k][q]; v[k][p] = c * kp - s * kq; v[k][q] = s * kp + c * kq; }
    }
  }
  const order = [...Array(n).keys()].sort((i, j) => a[j][j] - a[i][i]);
  return { vals: order.map((i) => a[i][i]), vecs: order.map((i) => Float64Array.from({ length: n }, (_, k) => v[k][i])) };
}
const gauss = (rnd) => { const u = Math.max(1e-12, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
/** randomized PCA of the row-normalised centred sqrt-count matrix; returns the FROZEN basis {mu, basis (D columns of length P)}. */
export function fitBasis(csr, D, rnd, power = 2) {
  const mu = csrMean(csr), s = rowScale(csr, mu), kk = Math.min(D + 10, csr.P, csr.V);
  let Q = orth(mulZ(csr, mu, s, Array.from({ length: kk }, () => Float64Array.from({ length: csr.P }, () => gauss(rnd)))));
  for (let it = 0; it < power; it++) { const W = orth(mulZt(csr, mu, s, Q)); Q = orth(mulZ(csr, mu, s, W)); }
  const Bt = mulZt(csr, mu, s, Q), G = Bt.map((a) => Float64Array.from(Bt, (b) => dotv(a, b)));
  const { vals, vecs } = jacobiEigen(G), d = Math.min(D, kk), basis = [];
  for (let j = 0; j < d; j++) { const v = new Float64Array(csr.P), sc = 1 / Math.sqrt(Math.max(vals[j], 1e-12)); for (let a = 0; a < kk; a++) { const c = vecs[j][a] * sc; if (c) for (let k = 0; k < csr.P; k++) v[k] += c * Bt[a][k]; } basis.push(v); }
  return { mu, basis, D: d };
}
/** project rows through a frozen basis; rows L2-normalised (row-major Float64Array V*D). */
export function project(csr, fb) {
  const s = rowScale(csr, fb.mu), cols = mulZ(csr, fb.mu, s, fb.basis), D = fb.D, E = new Float64Array(csr.V * D);
  for (let i = 0; i < csr.V; i++) { let n = 0; for (let j = 0; j < D; j++) n += cols[j][i] ** 2; n = Math.sqrt(n) || 1; for (let j = 0; j < D; j++) E[i * D + j] = cols[j][i] / n; }
  return E;
}
// ── spherical k-means ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function kmeans(E, V, D, K, rnd, { restarts = 3, iters = 30 } = {}) {
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const C = new Float64Array(K * D), pick = (i) => { for (let j = 0; j < D; j++) C[0 * D + j] = E[i * D + j]; };
    // k-means++ seeding on d = 1 - cos
    const first = Math.floor(rnd() * V); const cent = [first]; const dmin = new Float64Array(V).fill(Infinity);
    const upd = (c) => { for (let i = 0; i < V; i++) { let t = 0; for (let j = 0; j < D; j++) t += E[i * D + j] * E[c * D + j]; const d = 1 - t; if (d < dmin[i]) dmin[i] = d; } };
    upd(first);
    while (cent.length < K) { let tot = 0; for (let i = 0; i < V; i++) tot += dmin[i] ** 2; let u = rnd() * tot, ch = V - 1; for (let i = 0; i < V; i++) { u -= dmin[i] ** 2; if (u <= 0) { ch = i; break; } } cent.push(ch); upd(ch); }
    cent.forEach((c, k) => { for (let j = 0; j < D; j++) C[k * D + j] = E[c * D + j]; });
    let lab = new Int32Array(V).fill(-1), obj = 0;
    for (let it = 0; it < iters; it++) {
      let changed = 0; obj = 0;
      for (let i = 0; i < V; i++) { let bk = 0, bv = -Infinity; for (let k = 0; k < K; k++) { let t = 0; for (let j = 0; j < D; j++) t += E[i * D + j] * C[k * D + j]; if (t > bv) { bv = t; bk = k; } } if (lab[i] !== bk) { lab[i] = bk; changed++; } obj += bv; }
      const S = new Float64Array(K * D), cnt = new Int32Array(K);
      for (let i = 0; i < V; i++) { cnt[lab[i]]++; for (let j = 0; j < D; j++) S[lab[i] * D + j] += E[i * D + j]; }
      for (let k = 0; k < K; k++) {
        let n = 0; for (let j = 0; j < D; j++) n += S[k * D + j] ** 2; n = Math.sqrt(n);
        if (!cnt[k] || n < 1e-12) { const i = Math.floor(rnd() * V); for (let j = 0; j < D; j++) C[k * D + j] = E[i * D + j]; continue; }
        for (let j = 0; j < D; j++) C[k * D + j] = S[k * D + j] / n;
      }
      if (!changed) break;
    }
    if (!best || obj > best.obj) best = { labels: lab, centroids: C, obj, K, D };
  }
  return best;
}
export function assignTo(E, V, D, C, K) {
  const lab = new Int32Array(V);
  for (let i = 0; i < V; i++) { let bk = 0, bv = -Infinity; for (let k = 0; k < K; k++) { let t = 0; for (let j = 0; j < D; j++) t += E[i * D + j] * C[k * D + j]; if (t > bv) { bv = t; bk = k; } } lab[i] = bk; }
  return lab;
}
// ── partition comparison ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function contingency(a, b) {
  const ra = new Map(), rb = new Map(), cell = new Map(); let n = a.length;
  for (let i = 0; i < n; i++) { ra.set(a[i], (ra.get(a[i]) ?? 0) + 1); rb.set(b[i], (rb.get(b[i]) ?? 0) + 1); const k = a[i] + "|" + b[i]; cell.set(k, (cell.get(k) ?? 0) + 1); }
  return { ra, rb, cell, n };
}
export function ari(a, b) {
  const { ra, rb, cell, n } = contingency(a, b), c2 = (x) => x * (x - 1) / 2;
  let sc = 0, sa = 0, sb = 0; for (const v of cell.values()) sc += c2(v); for (const v of ra.values()) sa += c2(v); for (const v of rb.values()) sb += c2(v);
  const exp = (sa * sb) / c2(n), mx = (sa + sb) / 2;
  return mx - exp === 0 ? 1 : (sc - exp) / (mx - exp);
}
export function nmi(a, b) {
  const { ra, rb, cell, n } = contingency(a, b); let mi = 0, ha = 0, hb = 0;
  for (const [k, v] of cell) { const [x, y] = k.split("|"); mi += (v / n) * Math.log((v * n) / (ra.get(+x) * rb.get(+y))); }
  for (const v of ra.values()) ha -= (v / n) * Math.log(v / n); for (const v of rb.values()) hb -= (v / n) * Math.log(v / n);
  return ha + hb === 0 ? 1 : (2 * mi) / (ha + hb);
}
/** within-message shuffle of every document (marginals kept exactly, company destroyed) */
export function shuffleDocs(docs, seed) {
  const rnd = rngFor(seed);
  return docs.map((d) => d.map((m) => { const x = m.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }));
}
