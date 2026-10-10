// lib.mjs: own helpers for the R2 confirmation (NEW FILE). Imports existing modules, edits none. Not a test script (computes no outcome by itself).
// Requires env NAME_COMPANY_PAIRBLOCK=1 before node starts (name-company.mjs reads it at import). Never pass "run" as argv[2] of a script that imports name-company.mjs.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pairsOf, ARMS } from "../../name-company.mjs";
import { fitLogit, predict, standardise, aucOf } from "../../name-war-and-peace.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1 before starting node");
export { pairsOf, ARMS, rngFor, seedFor };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LAW = path.join(HERE, "..", "..");
export const UD = "/private/tmp/claude-501/ud-eval", TB = "/private/tmp/claude-501/tb";
export const EO = "/Users/mlacy/Documents/EO Testing/EO Embedding testing/data/ud";
export const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : null; };
export const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : null);
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
/** sha256 of the file text up to (not including) the marker string (FOLD-CONSTITUTION II.5 record). */
export function headerSha(metaUrl, marker = "END OF PRE-REGISTRATION") { const t = fs.readFileSync(fileURLToPath(metaUrl), "utf8"), k = t.indexOf(marker); return sha256(k >= 0 ? t.slice(0, k) : t); }

/** Mirror of impact.mjs readConlluStream (NFC lowercase word units, UPOS PUNCT dropped, integer ids only, multiword ranges skipped) WITHOUT its refusal of test splits. */
export function readConllu(file) {
  const sents = [], upos = []; let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t"); if (f.length < 10 || !/^\d+$/.test(f[0])) continue; if (f[3] === "PUNCT") continue;
    cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]);
  }
  flush(); return { sents, upos };
}
/** share of tokens whose form is among the K commonest forms of the stream (ties broken by form string). K = 32 is FWC32. */
export function fwcK(sents, K = 32) {
  const c = new Map(); let n = 0; for (const s of sents) for (const w of s) { c.set(w, (c.get(w) ?? 0) + 1); n += 1; }
  const top = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K); return n ? top.reduce((t, x) => t + x[1], 0) / n : null;
}
export const tokensOf = (sents) => sents.reduce((t, s) => t + s.length, 0);
/** A pairsOf document from sentence and UPOS arrays; same classes and CV blocks as name-company udDoc (PROPN = P; NOUN/VERB/ADJ = N; block = sentence quartile). */
export function docFrom(name, sents, upos) { const n = sents.length; return { name, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : OPEN.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) }; }
export function shuffleIn(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** the same document with every sentence's tokens (and UPOS) shuffled within the sentence: company destroyed, sentence composition and length kept. */
export function shuffleDoc(name, sents, upos, rnd) {
  const idx = sents.map((s) => shuffleIn(s.map((_, i) => i), rnd));
  return docFrom(name, sents.map((s, k) => idx[k].map((j) => s[j])), upos.map((u, k) => idx[k].map((j) => u[j])));
}
// ── probe: identical to name-company.mjs cvScoresLocal + cvAuc (those are not exported there) ───────────────────────────────────────────
export function cvScores(X, y, block) {
  const out = new Array(X.length).fill(null);
  for (const b of new Set(block)) {
    const tr = [], te = []; block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || new Set(tr.map((r) => y[r])).size < 2) continue;
    const [Xtr, Xte] = standardise(tr.map((r) => X[r]), te.map((r) => X[r])); if (!Xtr[0]?.length) continue;
    const w = fitLogit(Xtr, tr.map((r) => y[r])); te.forEach((r, k) => { out[r] = predict(w, Xte[k]); });
  }
  return out;
}
export function cvAuc(rows, arm, yOverride = null) {
  const X = rows.map((r) => ARMS[arm](r.f)), y = yOverride ?? rows.map((r) => r.y), block = rows.map((r) => r.block);
  return aucOf(cvScores(X, y, block), y);
}
/** pair-flip permutation of the labels: rows come in matched pairs (positive at 2k, its matched negative at 2k+1, same block); each pair's labels are swapped with probability 1/2. */
export function pairFlipY(rows, rnd) { const y = rows.map((r) => r.y); for (let k = 0; k + 1 < rows.length; k += 2) if (rnd() < 0.5) { const t = y[k]; y[k] = y[k + 1]; y[k + 1] = t; } return y; }
/** keep m of the matched pairs (seeded); rows stay in pair order */
export function subsamplePairs(rows, m, rnd) { const ids = shuffleIn(Array.from({ length: rows.length / 2 }, (_, k) => k), rnd).slice(0, m).sort((a, b) => a - b); return ids.flatMap((k) => [rows[2 * k], rows[2 * k + 1]]); }
// ── statistics ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function ranks(xs) { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[idx[t][1]] = rk; i = j + 1; } return r; }
export function pearson(a, b) { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; }
export const spearman = (a, b) => pearson(ranks(a), ranks(b));
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const rmse = (a, b) => Math.sqrt(mean(a.map((v, i) => (v - b[i]) ** 2)));
/** one-sided permutation p for Spearman rho >= observed (B permutations of the second vector). */
export function permRho(a, b, B = 4000, seed = 4242) { const rho = spearman(a, b), r = mulberry(seed); let ge = 0; for (let k = 0; k < B; k++) if (spearman(a, shuffleIn(b.slice(), r)) >= rho - 1e-12) ge += 1; return { rho, p: (ge + 1) / (B + 1) }; }
export function wilson(k, n, z = 1.96) { if (!n) return [null, null]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; }
/** OLS y ~ 1 + X (no scaling), returns coefficients; solves normal equations with a tiny ridge on slopes. */
export function ols(X, y) { const p = X[0].length + 1, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0); X.forEach((r, i) => { const z = [1, ...r]; for (let a = 0; a < p; a++) { b[a] += z[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += z[a] * z[c]; } }); for (let a = 1; a < p; a++) A[a][a] += 1e-10;
  const M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < p; c++) { let q = c; for (let r = c + 1; r < p; r++) if (Math.abs(M[r][c]) > Math.abs(M[q][c])) q = r; [M[c], M[q]] = [M[q], M[c]]; const d = M[c][c] || 1e-12; for (let j = c; j <= p; j++) M[c][j] /= d; for (let r = 0; r < p; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = c; j <= p; j++) M[r][j] -= f * M[c][j]; } } return M.map((r) => r[p]); }
