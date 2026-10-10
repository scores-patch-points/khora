// eval/physics-handles/lib.mjs — shared tools for the physics-handles experiments: corpus loaders, seeded randomness, statistics.
// No model, no LLM, no prior, no capital, no POS tag is used by anything here. Gold (UD UPOS, IRC speaker metadata, the hand-verified War and
// Peace cast) is only ever RETURNED beside the text for evaluation/stratification; no function in this file turns gold into a feature.
// Typed numbers in this file are stated where they occur and carry a reason. It holds no pre-registration of its own: every experiment file
// (gravity.mjs, curvature.mjs, reader-handles.mjs, clock-energy.mjs, equivalence.mjs) carries its own header, written before its first run.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.join(HERE, "..", "..");
export const FOLD = { A: "/private/tmp/claude-501/fold80", B: "/private/tmp/claude-501/fold80B" };
export const IRC_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc";
export const SMS_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/nus-sms/en";
export const COSEM_ROOT = "/Users/mlacy/Documents/3.0/ethos/19-organic-community/cosem";
export const COREF = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json";
export const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];

// ── seeded randomness (sha256 seed, mulberry32 stream) ───────────────────────────────────────────────────────────────────────────────────
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const seedFor = (...parts) => parseInt(sha256(["khora-physics-handles-v1", ...parts.map(String)].join("\x1f")).slice(0, 8), 16) >>> 0;
export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const rngFor = (...parts) => mulberry32(seedFor(...parts));
export function shuffleInPlace(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const headerSha256 = (file) => sha256(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]);

// ── plain statistics ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const sum = (xs) => { let s = 0; for (const x of xs) s += x; return s; };
export const mean = (xs) => (xs.length ? sum(xs) / xs.length : null);
export const median = (xs) => quantile(xs, 0.5);
export const sd = (xs) => { if (xs.length < 2) return null; const m = mean(xs); return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1)); };
export const quantile = (xs, q) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export function ranks(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const avg = (i + j + 1) / 2; for (let k = i; k < j; k++) r[idx[k][1]] = avg; i = j; }
  return r;
}
export function pearson(x, y) {
  const n = x.length; if (n < 3) return null;
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
/** residuals of y on [1, z...] by least squares (normal equations; z a list of columns) */
export function residuals(y, zs) {
  const n = y.length, k = zs.length + 1;
  const X = y.map((_, i) => [1, ...zs.map((z) => z[i])]);
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) { b[p] += X[i][p] * y[i]; for (let q = 0; q < k; q++) A[p][q] += X[i][p] * X[i][q]; }
  for (let p = 0; p < k; p++) A[p][p] += 1e-9;
  const beta = solve(A, b);
  return y.map((yi, i) => yi - X[i].reduce((a, v, p) => a + v * beta[p], 0));
}
export function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-12));
}
/** partial Spearman of x and y given the columns zs (rank-transform everything, regress out, correlate residuals) */
export function partialSpearman(x, y, zs) {
  const rx = ranks(x), ry = ranks(y), rz = zs.map(ranks);
  return pearson(residuals(rx, rz), residuals(ry, rz));
}
/** simple OLS y = a + b x, with the standard error of b */
export function ols(x, y) {
  const n = x.length; if (n < 3) return null;
  const mx = mean(x), my = mean(y); let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  if (sxx === 0) return null;
  const b = sxy / sxx, a = my - b * mx;
  const rss = sum(x.map((xi, i) => (y[i] - a - b * xi) ** 2));
  return { a, b, se: Math.sqrt(rss / Math.max(1, n - 2) / sxx), n, rss };
}
export function auc(scores, y) {
  const idx = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
  let pos = 0, neg = 0, rs = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const avg = (i + 1 + j) / 2; for (let k = i; k < j; k++) { if (y[idx[k][1]]) { pos++; rs += avg; } else neg++; } i = j; }
  return pos && neg ? (rs - (pos * (pos + 1)) / 2) / (pos * neg) : null;
}
/** percentile bootstrap over BLOCKS: `stat(indices)` is evaluated on resampled block members; returns {point, lo, hi, n} */
export function blockBootstrap(blockOf, stat, { B = 500, seed = 1 } = {}) {
  const ids = [...new Set(blockOf)], by = new Map(ids.map((b) => [b, []]));
  blockOf.forEach((b, i) => by.get(b).push(i));
  const point = stat(blockOf.map((_, i) => i));
  const rnd = mulberry32(seed), vals = [];
  for (let t = 0; t < B; t++) {
    const rows = []; for (let k = 0; k < ids.length; k++) rows.push(...by.get(ids[Math.floor(rnd() * ids.length)]));
    const v = stat(rows); if (Number.isFinite(v)) vals.push(v);
  }
  return { point, lo: quantile(vals, 0.025), hi: quantile(vals, 0.975), n: blockOf.length, blocks: ids.length };
}
/** one-sided permutation p for a statistic of group labels (smaller is more extreme when `less`) */
export function permP(obs, statOfLabels, labels, { B = 5000, seed = 1, less = false } = {}) {
  const rnd = mulberry32(seed); let ge = 0;
  for (let b = 0; b < B; b++) { const v = statOfLabels(shuffleInPlace(labels.slice(), rnd)); if (less ? v <= obs + 1e-12 : v >= obs - 1e-12) ge++; }
  return (ge + 1) / (B + 1);
}

// ── tokens, corpora ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
/** lowercased NFC word units of a message (same unit stream as eval/law/name-rule-informal.mjs) */
export const tokensOf = (text) => [...String(text).matchAll(WORD)].map((m) => m[0].replace(/^['’]+|['’]+$/g, "")).filter((w) => w && !/^\p{N}+$/u.test(w)).map((w) => w.normalize("NFC").toLowerCase());
/** the readers' visibility floor (impact.mjs minWordLength): a token shorter than this is invisible to the three readers */
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
export const readerVisible = (w) => w.length >= (DENSE.test(w) ? 2 : 3);

/** A held-out UD slice (fold80 tail = fold A, fold80B tail = fold B). Case-stripped, punctuation removed; docs split at `# newdoc`. UPOS returned beside, for evaluation only. */
export function loadUD(stem, fold, { merge = false } = {}) {
  const file = fold === "dev" ? path.join("/private/tmp/claude-501/ud-eval", stem, "dev.conllu") : path.join(FOLD[fold], stem, "tail.conllu");
  if (!fs.existsSync(file)) return null;
  const docs = []; let cur = { sents: [], upos: [] }, s = [], u = [];
  const flush = () => { if (s.length) { cur.sents.push(s); cur.upos.push(u); } s = []; u = []; };
  const closeDoc = () => { flush(); if (cur.sents.length) docs.push(cur); cur = { sents: [], upos: [] }; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") { if (/^#\s*newdoc/.test(line)) closeDoc(); continue; }
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0]) || f[3] === "PUNCT") continue;
    s.push(f[1].normalize("NFC").toLowerCase()); u.push(f[3]);
  }
  closeDoc();
  if (!docs.length) return null;
  if (merge) return { name: `ud-${stem}-${fold}`, kind: "ud", stem, fold, docs: [{ name: `${stem}${fold}`, sents: docs.flatMap((d) => d.sents), upos: docs.flatMap((d) => d.upos), nameGold: null }] };
  return { name: `ud-${stem}-${fold}`, kind: "ud", stem, fold, docs: docs.map((d, i) => ({ name: `${stem}${fold}#${i}`, sents: d.sents, upos: d.upos, nameGold: null })) };
}

/** Ubuntu IRC channel-days (>= 1,500 messages, lang en): message bodies only, lowercased; gold = a nickname that spoke >= 3 times that day (speaker is METADATA; same rule as name-rule-informal.mjs). */
export function loadIRC(nfiles = 6, seedTag = "irc") {
  const dirs = ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"].map((d) => path.join(IRC_ROOT, d)).filter((d) => fs.existsSync(d));
  const cands = [];
  for (const d of dirs) for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".txt")).sort()) {
    const p = path.join(d, f), head = fs.readFileSync(p, "utf8").slice(0, 400);
    const m = /messages: "(\d+)"/.exec(head);
    if (m && Number(m[1]) >= 1500 && /lang: "en"/.test(head)) cands.push(p);
  }
  const rnd = rngFor(seedTag, "files");
  const files = shuffleInPlace(cands.slice(), rnd).slice(0, nfiles).sort();
  const docs = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, "utf8").split("\n").map((l) => /^<([^>]+)>\s?(.*)$/.exec(l)).filter(Boolean);
    const spoke = new Map(); for (const [, nick] of lines) spoke.set(nick, (spoke.get(nick) ?? 0) + 1);
    const form = (n) => n.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    const nickForms = new Set([...spoke].filter(([, c]) => c >= 3).map(([n]) => form(n)).filter((n) => n.length >= 3));
    const msgs = lines.map(([, nick, text]) => ({ nick: form(nick), toks: tokensOf(text) })).filter((m) => m.toks.length >= 1);
    const tot = new Map(); let total = 0; for (const m of msgs) for (const t of m.toks) { tot.set(t, (tot.get(t) ?? 0) + 1); total++; }
    const topic = new Set([...nickForms].filter((n) => (tot.get(n) ?? 0) / total >= 1 / 300));
    const gold = new Set();
    msgs.forEach((m, k) => m.toks.forEach((t, i) => { if (nickForms.has(t) && !topic.has(t) && t !== m.nick) gold.add(`${k}:${i}`); }));
    docs.push({ name: path.relative(IRC_ROOT, f), sents: msgs.map((m) => m.toks), upos: null, nameGold: gold });
  }
  return { name: "irc", kind: "informal", docs };
}

/** War and Peace (Maude). Gold = the hand-verified cast forms (eoreader5 coref prior) minus titles that appear in >= 3 referents' displays (same rule as name-rule-informal.mjs). Lazy import: the book loader lives in eval/law. */
export async function loadWP() {
  const { loadBook } = await import("../law/name-war-and-peace.mjs");
  const book = loadBook();
  const ref = JSON.parse(fs.readFileSync(COREF, "utf8")).referents;
  const per = ref.map((r) => new Set([r.name, r.display, ...(r.surfaces ?? [])].flatMap((f) => tokensOf(f))));
  const df = new Map(); for (const s of per) for (const w of s) df.set(w, (df.get(w) ?? 0) + 1);
  const cast = new Set([...df].filter(([, n]) => n < 3).map(([w]) => w).filter((w) => w.length >= 3));
  const gold = new Set(); book.stream.forEach((sent, k) => sent.forEach((w, i) => { if (cast.has(w)) gold.add(`${k}:${i}`); }));
  return { name: "wp", kind: "novel", docs: [{ name: "war-and-peace", sents: book.stream, upos: null, nameGold: gold }] };
}

/** NUS SMS (English) / CoSEM (Singlish chat): one non-empty body line = one message; one file = one document. No gold. */
export function loadLines(root, name, maxFiles = 40) {
  const files = fs.readdirSync(root).filter((f) => f.endsWith(".txt")).sort().slice(0, maxFiles);
  const docs = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), "utf8").split(/^---\s*$/m);
    const body = text.length >= 3 ? text.slice(2).join("\n") : text.join("\n");
    const sents = body.split("\n").map(tokensOf).filter((t) => t.length >= 1);
    if (sents.length >= 20) docs.push({ name: f, sents, upos: null, nameGold: null });
  }
  return { name, kind: "informal", docs };
}

// ── word-order families, DERIVED from the role-config priors (subject-before-verb share, object-before-verb share), k-means K=3 ─────────────
function kmeans(points, K, seed, restarts = 20) {
  const rnd = mulberry32(seed); let best = null;
  for (let r = 0; r < restarts; r++) {
    let cent = shuffleInPlace(points.slice(), rnd).slice(0, K).map((p) => p.slice());
    let assign = new Array(points.length).fill(0);
    for (let it = 0; it < 100; it++) {
      assign = points.map((p) => { let bi = 0, bd = Infinity; cent.forEach((c, k) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = k; } }); return bi; });
      cent = cent.map((c, k) => { const m = points.filter((_, i) => assign[i] === k); return m.length ? [mean(m.map((p) => p[0])), mean(m.map((p) => p[1]))] : c; });
    }
    const sse = points.reduce((a, p, i) => a + (p[0] - cent[assign[i]][0]) ** 2 + (p[1] - cent[assign[i]][1]) ** 2, 0);
    if (!best || sse < best.sse) best = { sse, assign, cent };
  }
  return best;
}
export function familiesOf(stems = STEMS25) {
  const pts = stems.map((s) => { const d = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", `role-config-${s}.json`), "utf8")); return [d.subject.before / Math.max(1, d.subject.total), d.object.before / Math.max(1, d.object.total)]; });
  const km = kmeans(pts, 3, seedFor("families"));
  // cluster names are LABELS only (typed thresholds, no test depends on them): object-before >= 0.65 SOV-like; subject-before >= 0.9 with object-before < 0.35 strict-SVO-like; the rest freer-order
  const name = km.cent.map((c) => (c[1] >= 0.65 ? "SOV-like" : c[0] >= 0.9 && c[1] < 0.35 ? "strict-SVO-like" : "freer-order"));
  const fam = {}; stems.forEach((s, i) => { fam[s] = `${name[km.assign[i]]}#${km.assign[i]}`; });
  return { fam, centroids: km.cent.map((c, k) => ({ cluster: k, name: name[k], subjectBefore: round(c[0], 2), objectBefore: round(c[1], 2) })), points: Object.fromEntries(stems.map((s, i) => [s, pts[i].map((x) => round(x, 2))])) };
}

export const log2 = Math.log2;
export function writeJSON(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); }
export function argv() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  return { args, opt, has: (k) => args.includes(k), cmd: args[0] };
}
