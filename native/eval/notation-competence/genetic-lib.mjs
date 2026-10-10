// eval/notation-competence/genetic-lib.mjs — corpus access and pure scoring arithmetic for the
// GENETIC family instrument. Nothing here knows a claim, a control or a pass rule (those live in
// genetic.mjs, in its pre-registration header) and nothing here is the system under test.
//
// GOLD AUTHORITIES (independent of adapters/notation/genetic.js):
//   * NCBI RefSeq annotation inside the GenBank flat files, read by Biopython 1.88
//     (scripts/derive-gold.py): CDS locations, /transl_table, /translation, /transl_except, pseudo, partial.
//   * Biopython's CodonTable (NCBI gc.prt as implemented there): gold/tables.json.
//   * NCBI efetch FASTA / fasta_cds_aa: the independent protein representation (R5).
// The corpus lives outside the repo (see PROVENANCE.md in it); a missing corpus is a typed gap.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export const ROOT = process.env.KHORA_GENETIC_CORPUS ?? "/private/tmp/claude-501/notation/genetic";

export const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
export function readJsonGz(p) { return JSON.parse(zlib.gunzipSync(fs.readFileSync(p)).toString("utf8")); }
export function readTextGz(p) { return zlib.gunzipSync(fs.readFileSync(p)).toString("utf8"); }

export function loadManifest(root = ROOT) {
  const p = path.join(root, "manifest.json");
  if (!exists(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
/** the records of a split, in manifest order (the order is the file order: deterministic). */
export function splitRecords(split, root = ROOT) {
  const m = loadManifest(root);
  return m ? m.records.filter((r) => r.split === split) : null;
}
export const loadGold = (acc, root = ROOT) => readJsonGz(path.join(root, "gold", `${acc}.json.gz`));
export const loadGenbankText = (acc, root = ROOT) => readTextGz(path.join(root, "raw", "gbk", `${acc}.gb.gz`));
export const loadFastaText = (acc, root = ROOT) => readTextGz(path.join(root, "raw", "fasta", `${acc}.fna.gz`));
export function loadTablesGold(root = ROOT) { return JSON.parse(fs.readFileSync(path.join(root, "gold", "tables.json"), "utf8")); }
/** parse a FASTA text into [{id, desc, seq}] (plain parser; the system under test has its own). */
export function parseFasta(text) {
  const out = []; let cur = null;
  for (const line of text.split("\n")) {
    if (line.startsWith(">")) { const sp = line.search(/\s/); cur = { id: sp < 0 ? line.slice(1) : line.slice(1, sp), desc: sp < 0 ? "" : line.slice(sp + 1), parts: [] }; out.push(cur); }
    else if (cur && line.trim()) cur.parts.push(line.trim());
  }
  return out.map((r) => ({ id: r.id, desc: r.desc, seq: r.parts.join("") }));
}
export function loadGenomeSeq(acc, root = ROOT) { const r = parseFasta(loadFastaText(acc, root)); return r[0].seq.toUpperCase(); }
export function loadProteins(acc, root = ROOT) {
  const p = path.join(root, "raw", "cds_aa", `${acc}.faa.gz`);
  if (!exists(p)) return [];
  const t = readTextGz(p);
  if (!t.startsWith(">")) return [];
  return parseFasta(t);
}

// ── gold views ──────────────────────────────────────────────────────────────────────────────
/** the 3' end key of a CDS on its own strand: '+' -> end (exclusive, includes the stop), '-' -> start. */
export const stopKey = (strand, start, end) => (strand === -1 || strand === "-" ? `-:${start}` : `+:${end}`);
export function goldKeys(gold) {
  const ev = new Map(), all = new Set();
  for (const c of gold.cds) {
    const k = stopKey(c.strand, c.start, c.end);
    all.add(k);
    if (c.evaluable) ev.set(k, c);
  }
  return { eval: ev, all };
}
export const beingKey = (b) => stopKey(b.strand, b.span[0], b.span[1]);

/**
 * matchBeings(beings, gold, {atMost}) — the PRE-REGISTERED matcher. A being matches an evaluable gold CDS iff it is on
 * the same strand and has the same 3' end (the stop codon). A being matching a CDS the gold marks non-evaluable
 * (pseudo, partial, joined, exception) is IGNORED (neither true nor false positive). Anything else is a false positive.
 * Several beings sharing one key count once. Returns counts and precision/recall/F1 (null when undefined).
 */
export function matchBeings(beings, gold, { filter = null } = {}) {
  const { eval: ev, all } = goldKeys(gold);
  const seen = new Set(); let tp = 0, fp = 0, ign = 0;
  const matched = new Set();
  for (const b of beings) {
    if (filter && !filter(b)) continue;
    const k = beingKey(b);
    if (seen.has(k)) continue; seen.add(k);
    if (ev.has(k)) { tp++; matched.add(k); }
    else if (all.has(k)) ign++;
    else fp++;
  }
  const nGold = ev.size;
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = nGold ? tp / nGold : null;
  const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : (precision != null && recall != null ? 0 : null);
  return { tp, fp, ignored: ign, nGold, fn: nGold - tp, precision, recall, f1, matched };
}

// ── arithmetic ────────────────────────────────────────────────────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** a derangement of 0..n-1 (Sattolo: one n-cycle, no fixed point); n<2 has none -> null. */
export function derangement(n, rng) { if (n < 2) return null; const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; } return p; }
function lgamma(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const cj of c) s += cj / ++y; return -t + Math.log((2.5066282746310005 * s) / x); }
const lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
/** P(X >= k | n, p) exact upper binomial tail. */
export function binomUpperTail(k, n, p = 0.5) {
  if (k <= 0) return 1; if (k > n) return 0;
  if (p <= 0) return 0; if (p >= 1) return 1;
  let s = 0; const lp = Math.log(p), lq = Math.log(1 - p);
  const terms = []; for (let i = k; i <= n; i++) terms.push(lchoose(n, i) + i * lp + (n - i) * lq);
  const m = Math.max(...terms); for (const t of terms) s += Math.exp(t - m);
  return Math.min(1, Math.exp(m) * s);
}
/** one-sided exact sign test: is `wins` more than a fair coin gives out of wins+losses (ties dropped by the caller)? */
export function signTest(wins, losses) { const n = wins + losses; return { wins, losses, n, p: n === 0 ? 1 : binomUpperTail(wins, n, 0.5) }; }
/** paired per-unit comparison real vs control: ties dropped; returns {wins, losses, ties, p, meanDiff}. */
export function pairedSign(realVals, ctrlVals, eps = 1e-12) {
  let w = 0, l = 0, t = 0, d = 0, n = 0;
  for (let i = 0; i < realVals.length; i++) {
    const a = realVals[i], b = ctrlVals[i];
    if (a == null || b == null) continue;
    n++; d += a - b;
    if (a > b + eps) w++; else if (b > a + eps) l++; else t++;
  }
  return { ...signTest(w, l), ties: t, n, meanDiff: n ? d / n : null };
}
export const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
export const median = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
export function f1of(tp, fp, fn) { const p = tp + fp ? tp / (tp + fp) : null, r = tp + fn ? tp / (tp + fn) : null; return p != null && r != null ? (p + r > 0 ? (2 * p * r) / (p + r) : 0) : null; }
