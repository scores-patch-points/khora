// eval/competence/lib.mjs — shared, PURE-ish helpers for the competence ladder
// (R0..R5). Owner: whoever created this file first (the R2 instrument did).
// RULE FOR EVERYONE ELSE: read this file first, only ADD exports, never change
// or remove an existing one.
//
// Nothing here knows a language, a rung or a prior. It parses the treebanks the
// ladder is scored on, does the arithmetic every rung needs (exact binomial,
// seeded shuffles/derangements, binary F1) and writes a result card.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { logBinomialUpperTail, KEY_ALPHA } from "../../adapters/text/keyness.js";

export { KEY_ALPHA };

// ── where things live ───────────────────────────────────────────────────────
export const TB_DIR = "/private/tmp/claude-501/tb";          // TRAIN treebanks (what priors were built from)
export const EVAL_DIR = "/private/tmp/claude-501/ud-eval";   // HELD-OUT gold: <stem>/{dev,test}.conllu
export const COMPETENCE_OUT = "/private/tmp/claude-501/competence";

/** The held-out gold file for a stem and split, or null when it is not on disk. */
export function conlluPath(stem, split = "dev") {
  const p = path.join(EVAL_DIR, stem, `${split}.conllu`);
  return fs.existsSync(p) ? p : null;
}

// ── CoNLL-U ─────────────────────────────────────────────────────────────────
/**
 * parseConllu(text, {limit}) → [{ id, text, tokens, ranges }]
 *   tokens  the syntactic words (integer ids), each {id, form, lemma, upos, xpos, feats, head, deprel, misc, spaceAfter}
 *   ranges  multi-word-token lines ("3-4"): {from, to, form, spaceAfter}
 * Empty nodes (3.1) are dropped. `limit` caps the SENTENCES read (first N, in
 * file order — deterministic, never a sample).
 */
export function parseConllu(text, { limit = null } = {}) {
  const out = [];
  let cur = null;
  const flush = () => { if (cur && (cur.tokens.length || cur.ranges.length)) out.push(cur); cur = null; };
  for (const line of String(text).split("\n")) {
    if (limit != null && out.length >= limit) break;
    if (line.startsWith("#")) {
      cur ??= { id: null, text: null, tokens: [], ranges: [] };
      const m = /^#\s*(sent_id|text)\s*=\s*(.*)$/.exec(line);
      if (m) cur[m[1] === "sent_id" ? "id" : "text"] = m[2];
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    const c = line.split("\t");
    if (c.length < 4) continue;
    cur ??= { id: null, text: null, tokens: [], ranges: [] };
    const misc = c[9] ?? "_";
    const spaceAfter = !/(?:^|\|)SpaceAfter=No(?:\||$)/.test(misc);
    if (/^[0-9]+$/.test(c[0])) {
      cur.tokens.push({ id: Number(c[0]), form: c[1], lemma: c[2], upos: c[3], xpos: c[4], feats: c[5], head: c[6], deprel: c[7], misc, spaceAfter });
    } else if (/^[0-9]+-[0-9]+$/.test(c[0])) {
      const [from, to] = c[0].split("-").map(Number);
      cur.ranges.push({ from, to, form: c[1], spaceAfter });
    } // else: an empty node (3.1) — not a word of the surface text
  }
  flush();
  return limit != null ? out.slice(0, limit) : out;
}

export function readConllu(file, opts = {}) {
  return parseConllu(fs.readFileSync(file, "utf8"), opts);
}

// ── arithmetic ──────────────────────────────────────────────────────────────
/** mulberry32: a small seeded PRNG so every control arm is reproducible. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled COPY (Fisher–Yates). */
export function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** A DERANGEMENT of 0..n-1 (no fixed point) by Sattolo's algorithm: one n-cycle. n<2 has none → null. */
export function derangement(n, rng) {
  if (n < 2) return null;
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}

/** P(X >= k | n, p) — the exact upper binomial tail (keyness.js's own). */
export const binomUpperTail = (k, n, p = 0.5) => Math.exp(logBinomialUpperTail(k, n, p));

/**
 * One-sided exact SIGN test of "A beats B": of the `wins + losses` discordant
 * pairs, is `wins` more than a fair coin gives? p = P(X >= wins | n, 1/2).
 */
export function signTest(wins, losses) {
  const n = wins + losses;
  return { wins, losses, n, p: n === 0 ? 1 : binomUpperTail(wins, n, 0.5) };
}

/** The fewest discordant pairs at which a one-sided sign test CAN reach `alpha`: ceil(log2(1/alpha)). */
export const minDiscordantFor = (alpha = KEY_ALPHA) => Math.ceil(Math.log2(1 / alpha));

/** Binary confusion counts of boolean predictions against boolean gold (positive = true). */
export function confusion(pred, gold) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < gold.length; i++) {
    if (pred[i] && gold[i]) tp++; else if (pred[i]) fp++; else if (gold[i]) fn++; else tn++;
  }
  return { tp, fp, fn, tn };
}

/** F1 of the POSITIVE class from a confusion; null when the gold has no positive (undefined, not 0). */
export const f1Of = ({ tp, fp, fn }) => (tp + fn === 0 ? null : tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn));

/** Accuracy, precision, recall, F1 (positive), macro-F1 from a confusion. */
export function summarise({ tp, fp, fn, tn }) {
  const n = tp + fp + fn + tn;
  // negative-class F1: undefined only when the gold has no negative (tn+fp === 0); a constant-positive arm scores 0 on it
  const f1neg = tn + fp === 0 ? null : tn === 0 ? 0 : (2 * tn) / (2 * tn + fn + fp);
  const f1pos = f1Of({ tp, fp, fn });
  return {
    n, tp, fp, fn, tn,
    accuracy: n ? (tp + tn) / n : null,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
    f1: f1pos,
    macroF1: f1pos == null || f1neg == null ? null : (f1pos + f1neg) / 2,
  };
}

/** ROC-AUC of a score against a boolean gold (rank statistic, ties half-counted); null if one class is empty. */
export function auc(scores, gold) {
  const idx = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
  let pos = 0, neg = 0, rankSum = 0;
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j < idx.length && idx[j][0] === idx[i][0]) j++;
    const avgRank = (i + 1 + j) / 2; // 1-based mean rank of the tie group
    for (let k = i; k < j; k++) { if (gold[idx[k][1]]) { pos++; rankSum += avgRank; } else neg++; }
    i = j;
  }
  return pos === 0 || neg === 0 ? null : (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

// ── CLI / output ────────────────────────────────────────────────────────────
/** parseArgs(argv) → { stem, split, limit, all, flags:Set, rest } — `--stem x --split dev --limit 300 --all`. */
export function parseArgs(argv = process.argv.slice(2)) {
  const o = { stem: null, split: "dev", limit: null, all: false, flags: new Set(), rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stem") o.stem = argv[++i];
    else if (a === "--split") o.split = argv[++i];
    else if (a === "--limit") o.limit = Number(argv[++i]);
    else if (a === "--all") o.all = true;
    else if (a.startsWith("--")) o.flags.add(a.slice(2));
    else o.rest.push(a);
  }
  return o;
}

/** Write one result card to COMPETENCE_OUT/<rung>-<stem>-<split>.json; returns the path. */
export function writeResult(rung, stem, split, result) {
  fs.mkdirSync(COMPETENCE_OUT, { recursive: true });
  const file = path.join(COMPETENCE_OUT, `${rung}-${stem}-${split}.json`);
  fs.writeFileSync(file, JSON.stringify(result) + "\n");
  return file;
}

/** sha256 of a file's leading `//` comment block — the stamp that makes a post-hoc edit of a pre-registration visible. */
export function headerDigest(file) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  return createHash("sha256").update(lines.join("\n").trim()).digest("hex");
}
