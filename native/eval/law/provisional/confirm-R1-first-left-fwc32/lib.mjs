// lib.mjs: own helpers for the R1 confirmation (NEW FILE). Imports existing modules, edits none. Not a test script (no outcome is computed here).
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
export const FIX = "/Users/mlacy/Documents/3.0/eoreader7-segment-level/native/eval/fixtures";
export const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : null; };
export const share = (xs, f) => (xs.length ? xs.filter(f).length / xs.length : null);
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
/** sha256 of the file text up to the line holding the end-of-header marker (FOLD-CONSTITUTION II.5 record). */
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
/** share of tokens whose form is among the K commonest forms of the stream (ties broken by form string). */
export function fwcK(sents, K = 32) {
  const c = new Map(); let n = 0; for (const s of sents) for (const w of s) { c.set(w, (c.get(w) ?? 0) + 1); n += 1; }
  const top = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K); return top.reduce((t, x) => t + x[1], 0) / n;
}
/** stream descriptors that need no label: tokens, types, TTR, hapax share, mean sentence length, FWC at several K. */
export function describe(sents) {
  const c = new Map(); let n = 0; for (const s of sents) for (const w of s) { c.set(w, (c.get(w) ?? 0) + 1); n += 1; }
  const hap = [...c.values()].filter((v) => v === 1).length;
  return { tokens: n, sentences: sents.length, types: c.size, ttr: c.size / n, hapaxTypeShare: hap / c.size, hapaxTokenShare: hap / n, meanSentLen: n / sents.length, fwc8: fwcK(sents, 8), fwc16: fwcK(sents, 16), fwc32: fwcK(sents, 32), fwc64: fwcK(sents, 64), fwc128: fwcK(sents, 128) };
}
/** A pairsOf document from sentence and UPOS arrays; same classes and CV blocks as name-company udDoc (PROPN = P; NOUN/VERB/ADJ = N; block = sentence quartile). */
export function docFrom(name, sents, upos) { const n = sents.length; return { name, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : OPEN.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) }; }
/** the same document with every sentence's tokens (and UPOS) shuffled within the sentence: company destroyed, sentence composition and length kept. */
export function shuffleDoc(name, sents, upos, rnd) {
  const idx = sents.map((s) => shuffleIn(s.map((_, i) => i), rnd));
  return docFrom(name, sents.map((s, k) => idx[k].map((j) => s[j])), upos.map((u, k) => idx[k].map((j) => u[j])));
}
export function shuffleIn(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

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
export const cvAuc = (rows, arm, y = null) => { const yy = y ?? rows.map((r) => r.y); return aucOf(cvScores(rows.map((r) => ARMS[arm](r.f)), yy, rows.map((r) => r.block)), yy); };
/** pair-swap permutation null: each matched pair's two labels are swapped with probability 1/2 (both members stay in one CV block); returns B AUCs. */
export function pairSwapNull(rows, arm, B, rnd) {
  const out = [], X = rows.map((r) => ARMS[arm](r.f)), blk = rows.map((r) => r.block);
  for (let b = 0; b < B; b++) { const y = rows.map((r) => r.y); for (let k = 0; k + 1 < rows.length; k += 2) if (rnd() < 0.5) { y[k] = 1 - y[k]; y[k + 1] = 1 - y[k + 1]; } const a = aucOf(cvScores(X, y, blk), y); if (a != null) out.push(a); }
  return out;
}
// ── zero-shot fixed scores on the same pairs (higher = more name-like; direction fixed in advance) ───────────────────────────────────────
const bin = (oh) => oh.indexOf(1);
export const SCORES = { S1: (f) => bin(f.L1), S2: (f) => bin(f.L1) + bin(f.L2), S3: (f) => bin(f.L1) + bin(f.L2) + bin(f.R1) + bin(f.R2) };
export function pairedAuc(rows, score) { let w = 0, n = 0; for (let k = 0; k + 1 < rows.length; k += 2) { const a = score(rows[k].f), b = score(rows[k + 1].f); w += a > b ? 1 : a === b ? 0.5 : 0; n += 1; } return n ? w / n : null; }
// ── statistics ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function ranks(xs) { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[idx[t][1]] = rk; i = j + 1; } return r; }
export function pearson(a, b) { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; }
export const spearman = (a, b) => pearson(ranks(a), ranks(b));
/** partial Spearman of a and b controlling for c (rank residuals). */
export function partialSpearman(a, b, c) { const ra = ranks(a), rb = ranks(b), rc = ranks(c), rab = pearson(ra, rb), rac = pearson(ra, rc), rbc = pearson(rb, rc); const d = Math.sqrt((1 - rac ** 2) * (1 - rbc ** 2)); return d ? (rab - rac * rbc) / d : 0; }
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** one-sided permutation p for Spearman(a,b) >= observed (language-label permutation of b against a). */
export function permRho(a, b, B = 5000, seed = 20261007) { const rho = spearman(a, b), r = mulberry(seed); let ge = 0; for (let k = 0; k < B; k++) if (spearman(a, shuffleIn(b.slice(), r)) >= rho - 1e-12) ge += 1; return { rho, p: (ge + 1) / (B + 1) }; }
export const rmse = (a, b) => Math.sqrt(mean(a.map((v, i) => (v - b[i]) ** 2)));
/** language-bootstrap percentile CI of Spearman(a,b). */
export function bootRho(a, b, B = 2000, seed = 777) { const r = mulberry(seed), n = a.length, out = []; for (let k = 0; k < B; k++) { const ia = Array.from({ length: n }, () => Math.floor(r() * n)); out.push(spearman(ia.map((i) => a[i]), ia.map((i) => b[i]))); } out.sort((x, y) => x - y); return [out[Math.floor(0.025 * B)], out[Math.floor(0.975 * B)]]; }
