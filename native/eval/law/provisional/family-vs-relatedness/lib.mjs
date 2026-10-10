// eval/law/provisional/family-vs-relatedness/lib.mjs — shared helpers for the family-vs-relatedness lens (no pre-registration of its own: it only
// moves data; every test script carries its own header). NEW FILE; imports the existing modules and edits none of them.
//
// Requires env NAME_COMPANY_PAIRBLOCK=1 BEFORE node starts (name-company.mjs reads it at import). Never pass "run" as argv[2] of a script that imports name-company.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ARMS, pairsOf } from "../../name-company.mjs";
import { fitLogit, predict, standardise, aucOf } from "../../name-war-and-peace.mjs";
import { rngFor, seedFor } from "../../impact.mjs";

if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("lib.mjs: set NAME_COMPANY_PAIRBLOCK=1 (pair-level CV blocks) before starting node");

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UD = "/private/tmp/claude-501/ud-eval";
export { ARMS, pairsOf, fitLogit, predict, standardise, aucOf, rngFor, seedFor };
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const shuffleIn = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const headerHash = (file) => sha256(fs.readFileSync(file, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]);

/** Mirror of impact.mjs readConlluStream (lowercase NFC word units, PUNCT dropped, multiword ranges skipped) WITHOUT its refusal to read a test split. */
export function readConllu(file) {
  const sents = [], upos = []; let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    if (f[3] === "PUNCT") continue;
    cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]);
  }
  flush();
  return { sents, upos };
}
const OPEN = new Set(["NOUN", "VERB", "ADJ"]);
/** Mirror of name-company.mjs udDoc, with a split argument and an optional within-sentence shuffle (company destroyed, sentence length kept). */
export function udDocSplit(stem, split = "dev", shuffled = false) {
  const p = path.join(UD, stem, `${split}.conllu`); if (!fs.existsSync(p)) return null;
  let { sents, upos } = readConllu(p);
  if (shuffled) { const rnd = rngFor(seedFor("fam-vs-rel", stem, split, "shuffle")); const idx = sents.map((s) => shuffleIn(s.map((_, i) => i), rnd)); sents = sents.map((s, k) => idx[k].map((j) => s[j])); upos = upos.map((u, k) => idx[k].map((j) => u[j])); }
  const n = sents.length;
  return { name: stem, stream: sents, cls: (s, i) => (upos[s][i] === "PROPN" ? "P" : OPEN.has(upos[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) };
}

const argmax = (v) => v.indexOf(Math.max(...v));
/** compact row: [y, block, L1, L2, R1, R2, ib, lb, cb, freq] where each slot is the one-hot index. */
export const packRow = (r) => [r.y, r.block, argmax(r.f.L1), argmax(r.f.L2), argmax(r.f.R1), argmax(r.f.R2), argmax(r.f.POS.slice(0, 4)), argmax(r.f.POS.slice(4)), argmax(r.f.CHAR), r.f.FREQ[0]];
const oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
export function unpackRow(a) {
  return { y: a[0], block: a[1], f: { L1: oh(a[2], 13), L2: oh(a[3], 13), R1: oh(a[4], 13), R2: oh(a[5], 13), POS: [...oh(a[6], 4), ...oh(a[7], 5)], CHAR: oh(a[8], 4), FREQ: [a[9]] } };
}

export const cacheFile = (split, stem, stratum, tag = "") => path.join(HERE, "cache", split, `${stem}.${stratum}${tag}.json`);
/** load a cached language/stratum as {pairs, rows:[{y,block,f}], X:{BOTH,LEFT,POSITION}} or null. Rows are ordered pos,neg,pos,neg,... (pairsOf order). */
export function loadLang(split, stem, stratum, tag = "") {
  const p = cacheFile(split, stem, stratum, tag); if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const rows = j.rows.map(unpackRow);
  const X = {}; for (const a of ["BOTH", "LEFT", "POSITION"]) X[a] = rows.map((r) => ARMS[a](r.f));
  return { stem, split, stratum, pairs: j.pairs, dropped: j.dropped, rows, y: rows.map((r) => r.y), block: rows.map((r) => r.block), X };
}

// ── learning and transfer ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** take n pairs (pair index k -> rows 2k, 2k+1) from a loaded language, seeded; returns row indices. */
export function pairSample(L, n, rnd) { const idx = shuffleIn(Array.from({ length: L.pairs }, (_, k) => k), rnd).slice(0, n); return idx.flatMap((k) => [2 * k, 2 * k + 1]); }
/** fit the probe (ridge-logistic, standardised) on rows (list of {L, idx}); returns a scorer for a feature matrix of the same arm, or null. */
export function fitProbe(parts, arm) {
  const X = [], y = [];
  for (const { L, idx } of parts) for (const r of idx) { X.push(L.X[arm][r]); y.push(L.y[r]); }
  if (!X.length || new Set(y).size < 2) return null;
  const mu = new Array(X[0].length).fill(0), sd = new Array(X[0].length).fill(0);
  for (const r of X) for (let k = 0; k < mu.length; k++) mu[k] += r[k] / X.length;
  for (const r of X) for (let k = 0; k < mu.length; k++) sd[k] += (r[k] - mu[k]) ** 2 / X.length;
  const keep = []; for (let k = 0; k < mu.length; k++) if (Math.sqrt(sd[k]) > 1e-9) keep.push(k);
  if (!keep.length) return null;
  const f = (r) => keep.map((k) => (r[k] - mu[k]) / Math.sqrt(sd[k]));
  const w = fitLogit(X.map(f), y);
  return (Xte) => Xte.map((r) => predict(w, f(r)));
}
/** AUC of a scorer on every row of language T. */
export const aucOn = (scorer, T, arm) => (scorer ? aucOf(scorer(T.X[arm]), T.y) : null);
/** pair-flip permutation null of the AUC for scores s on rows ordered pos,neg,pos,neg: returns the q95 over B draws. Scores are fixed; each pair's label is flipped with p=0.5. */
export function pairFlipQ95(scores, y, rnd, B = 200) {
  const n = y.length / 2, out = [];
  for (let b = 0; b < B; b++) { const yy = y.slice(); for (let k = 0; k < n; k++) if (rnd() < 0.5) { yy[2 * k] = 1 - yy[2 * k]; yy[2 * k + 1] = 1 - yy[2 * k + 1]; } const a = aucOf(scores, yy); if (a != null) out.push(a); }
  return quantile(out, 0.95);
}
/** language-level bootstrap of a mean over per-language values (resamples languages with replacement). */
export function bootMean(xs, B = 2000, rnd = rngFor(7)) {
  if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 };
  const m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(rnd() * xs.length)]; m.push(t / xs.length); }
  return { mean: round(mean(xs)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)), n: xs.length };
}
export const signP = (w, l) => { const n = w + l; if (!n) return 1; let p = 0; const lc = (k) => { let s = 0; for (let i = 2; i <= k; i++) s += Math.log(i); return s; }; for (let k = w; k <= n; k++) p += Math.exp(lc(n) - lc(k) - lc(n - k) - n * Math.log(2)); return p; };
