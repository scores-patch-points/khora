// common.mjs: shared helpers for the attack on R2-later-both-fwc32 (NEW FILE; computes no outcome by itself; imports existing modules, edits none).
// Requires env NAME_COMPANY_PAIRBLOCK=1 before node starts. Never pass "run" as argv[2] of a script that imports name-company.mjs.
// It re-implements name-company's occurrence collection, company features and matched pairing (code of name-company.mjs pairsOf/featuresOf, read, not edited)
// with switches: tie handling of frequency ranks, stricter matching, unique-form pairs, extra bookkeeping per occurrence. Mode "orig" with tie "alpha"
// must reproduce the confirmer's rows exactly (checked by attackA.mjs repro).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aucOf } from "../../name-war-and-peace.mjs";
import { HERE as CONF_DIR, UD, readConllu, fwcK, docFrom, cvScores, rngFor, seedFor, shuffleIn, round, mean, sd, share, quantile, headerSha, shuffleDoc, mulberry, spearman, ranks, pearson, wilson, permRho, ols } from "../confirm-R2-later-both-fwc32/lib.mjs";
export { CONF_DIR, UD, readConllu, fwcK, docFrom, rngFor, seedFor, shuffleIn, round, mean, sd, share, quantile, headerSha, shuffleDoc, mulberry, spearman, ranks, pearson, wilson, permRho, ols, aucOf };
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1");
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const RESULTS = path.join(HERE, "results");
export const TSCOPE = 0.2795, AUDIBLE = 0.6;
const W = JSON.parse(fs.readFileSync(path.join(CONF_DIR, "windows.json"), "utf8"));
const dupKeys = (stem) => { const s = new Set(); for (const sp of ["dev", "test"]) for (const x of readConllu(path.join(UD, stem, sp + ".conllu")).sents) s.add(x.join(" ")); return s; };
/** the confirmer's primary window of a stem, exactly as confirm.mjs loadWindow builds it */
export function loadWindow(stem) {
  const w = W[stem]; if (!w || w.error) throw new Error("no window for " + stem);
  const t = readConllu(w.source), sents = t.sents.slice(w.offset, w.offset + w.taken), upos = t.upos.slice(w.offset, w.offset + w.taken);
  if (w.set === "A") return { sents, upos, w };
  const D = dupKeys(stem), keep = sents.map((x) => !D.has(x.join(" ")));
  return { sents: sents.filter((_, i) => keep[i]), upos: upos.filter((_, i) => keep[i]), w };
}
/** confirmer's per-language results (rows/*.json) */
export function confirmRows() { const d = path.join(CONF_DIR, "results", "rows"); return fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), "utf8"))); }
export const eligible = (r) => !r.thin && r.position >= 0.45 && r.position <= 0.55;
// ── features ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NB = 13, oh = (n, k) => { const v = new Array(k).fill(0); v[Math.min(n, k - 1)] = 1; return v; };
export const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const cb = (w) => { const n = [...w].length; return n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : 3; };
export const lb = (n) => Math.max(0, Math.min(4, Math.floor(Math.log2(Math.max(2, n))) - 2));
export const fb = (n) => Math.floor(Math.log2(Math.max(1, n)));
/** rank bins of every form: tie "alpha" = name-company's rankBins (ties by form string); "mid" = tied forms share the mid-rank; "rand" = ties broken by seeded shuffle */
export function binsOf(stream, tie = "alpha", rnd = null) {
  const c = new Map(); for (const s of stream) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1);
  const order = [...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map(), bin = (r) => Math.min(11, Math.floor(Math.log2(r + 1)));
  if (tie === "alpha") order.forEach(([w], r) => bins.set(w, bin(r)));
  else { let i = 0; while (i < order.length) { let j = i; while (j + 1 < order.length && order[j + 1][1] === order[i][1]) j++;
      if (tie === "mid") for (let t = i; t <= j; t++) bins.set(order[t][0], bin((i + j) / 2));
      else { const g = shuffleIn(order.slice(i, j + 1), rnd); g.forEach(([w], t) => bins.set(w, bin(i + t))); }
      i = j + 1; } }
  return { bins, count: c };
}
const slot = (sent, j, bins) => (j < 0 || j >= sent.length ? 12 : bins.get(sent[j]) ?? 11);
const sentRarity = (sent, i, bins) => { const o = []; for (let j = 0; j < sent.length; j++) if (j !== i) o.push(bins.get(sent[j]) ?? 11); return o.length ? [o.reduce((a, b) => a + b, 0) / o.length, o.filter((x) => x >= 9).length / o.length] : [0, 0]; };
export function featuresOf(sent, i, bins, count, w, o) {
  const nb = [slot(sent, i - 1, bins), slot(sent, i - 2, bins), slot(sent, i + 1, bins), slot(sent, i + 2, bins)], inter = nb.filter((x) => x !== 12), len = sent.length;
  return { L1: oh(nb[0], NB), L2: oh(nb[1], NB), R1: oh(nb[2], NB), R2: oh(nb[3], NB), POS: [...oh(ib(i), 4), ...oh(lb(len), 5)], CHAR: oh(cb(w), 4), FREQ: [Math.log2(Math.max(1, count.get(w) ?? 1))],
    K: [Math.log2(1 + o.k)], REC: [Math.log2(1 + o.rec)], DEND: oh(Math.min(len - 1 - i, 3), 4), LENX: [Math.log2(len)], IDX: [Math.log2(1 + i)], CLEN: [[...w].length],
    NBR: [inter.length ? inter.reduce((a, b) => a + b, 0) / inter.length : 0, inter.length], NBRMAX: [inter.length ? Math.max(...inter) : 0], SENT: sentRarity(sent, i, bins), _nb: nb };
}
export const ARMX = {
  LEFT: (f) => [...f.L1, ...f.L2], RIGHT: (f) => [...f.R1, ...f.R2], BOTH: (f) => [...f.L1, ...f.L2, ...f.R1, ...f.R2],
  POSITION: (f) => f.POS, CHARLEN: (f) => f.CHAR, FREQ: (f) => f.FREQ, RIVALS: (f) => [...f.POS, ...f.CHAR, ...f.FREQ],
  SENT: (f) => f.SENT, "NBR+SENT": (f) => [...f.NBR, ...f.SENT],
  K: (f) => f.K, REC: (f) => f.REC, DEND: (f) => f.DEND, NBR: (f) => f.NBR, NBRMAX: (f) => f.NBRMAX,
  RIVALSX: (f) => [...f.POS, ...f.CHAR, ...f.FREQ, ...f.K, ...f.REC, ...f.DEND, ...f.LENX, ...f.IDX, ...f.CLEN],
  "BOTH+RIVALS": (f) => [...f.L1, ...f.L2, ...f.R1, ...f.R2, ...f.POS, ...f.CHAR, ...f.FREQ],
  "BOTH+RIVALSX": (f) => [...f.L1, ...f.L2, ...f.R1, ...f.R2, ...f.POS, ...f.CHAR, ...f.FREQ, ...f.K, ...f.REC, ...f.DEND, ...f.LENX, ...f.IDX, ...f.CLEN],
};
/** CV AUC of an arm function over rows (same ridge-logistic, same leave-block-out as the confirmer); yOverride for permutations */
export function cvAucX(rows, arm, yOverride = null) {
  if (rows.length < 20) return null;
  const fn = typeof arm === "function" ? arm : ARMX[arm], X = rows.map((r) => fn(r.f)), y = yOverride ?? rows.map((r) => r.y), block = rows.map((r) => r.block);
  return aucOf(cvScores(X, y, block), y);
}
