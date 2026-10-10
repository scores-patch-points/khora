// c2-lib.mjs : shared plumbing of the C2 NAMES instrument (c2-names.mjs pre-registers everything; nothing is declared here
// that the header does not declare). Pure functions where possible so the toy-fixture test can exercise them without
// python or a corpus. No model anywhere.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { isCoreKind } from "./gold.mjs";
import { isWordLike } from "../../adapters/code/name-gate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const MANIFEST = process.env.C2_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
export const OUT_DIR = process.env.C2_OUT_DIR || "/private/tmp/claude-501/coding-competence";

// declared constants (c2-names.mjs header). The name-gate PARAMS (N_MIN_CTX, ...) live in the adapter.
export const CONSTS = Object.freeze({
  BOOT_B: 1000, BOOT_ALPHA: 0.05, MIN_REFUSED: 200, MIN_CORE: 200, MIN_CORE_PER_REPO: 20, LICENCE_RATIO: 0.5, PARSE_FAIL: 0.02,
  // amendments A6-A9 (c2-names.mjs header): declared before the arms they govern were first run
  ABLATED_RATIO: 0.9, SEG_RATIO: 0.9, REPEAT_REASON_MIN: 20, LEX_CAUSALITY_FILES: 40, LEX_CAUSALITY_PER_FILE: 20,
});

/** the six languages C2 is built for (manifest names), in the cyclic order the deranged control uses */
export const LANGUAGES = Object.freeze(["python", "javascript", "c", "go", "ruby", "java"]);
export function derangedLanguageOf(language) {
  const i = LANGUAGES.indexOf(language);
  return i < 0 ? null : LANGUAGES[(i + 1) % LANGUAGES.length];
}

// ── deterministic randomness ──────────────────────────────────────────────────────────────────────────────────────
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
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
export function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// ── corpus ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadManifest() { return JSON.parse(fs.readFileSync(MANIFEST, "utf8")); }

/** Deterministic selection of up to `limit` files of a split: inside each repository files are ordered by sha256, and the
 *  repositories are drawn round-robin (so a small limit still spans every repository). limit null = all. */
export function selectFiles(rows, limit = null) {
  const byRepo = new Map();
  for (const r of rows) { if (!byRepo.has(r.repo)) byRepo.set(r.repo, []); byRepo.get(r.repo).push(r); }
  const repos = [...byRepo.keys()].sort();
  for (const k of repos) byRepo.get(k).sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : 0));
  const out = [];
  const cap = limit == null ? Infinity : limit;
  for (let round = 0; out.length < cap; round++) {
    let any = false;
    for (const k of repos) {
      const f = byRepo.get(k)[round];
      if (f) { out.push(f); any = true; if (out.length >= cap) break; }
    }
    if (!any) break;
  }
  return out;
}

// ── gold -> units ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * prepareFile(text, gold) -> { stream, units, defsTotal, defsOutsideUnits, defsPartial, coreNames }
 *   stream  texts of the code lexemes (comments dropped), in order: all a reader is given
 *   units   [{ i (index in stream), label: core|secondary|none, cls (gold class, scoring only), start }]
 * Units are gold tokens that are not string/comment and are word-like. A gold def maps to the token containing its nameStart.
 */
export function prepareFile(text, gold) {
  const toks = gold.tokens ?? [];
  const stream = [];
  const meta = [];
  for (const t of toks) {
    if (t.class === "comment") continue;
    stream.push(text.slice(t.start, t.end));
    meta.push(t);
  }
  const starts = meta.map((t) => t.start);
  const findTok = (pos) => {
    let lo = 0, hi = starts.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (starts[mid] <= pos) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans >= 0 && pos < meta[ans].end ? ans : -1;
  };
  const labelAt = new Map(); // stream index -> "core" | "secondary"
  const kindAt = new Map(); // stream index -> the first core def kind
  let defsOutsideUnits = 0, defsPartial = 0;
  const defs = gold.defs ?? [];
  for (const d of defs) {
    const k = findTok(d.nameStart);
    if (k < 0 || meta[k].class === "string" || !isWordLike(stream[k])) { defsOutsideUnits++; continue; }
    if (meta[k].start !== d.nameStart || meta[k].end !== d.nameEnd) defsPartial++;
    const core = isCoreKind(d.kind);
    const prev = labelAt.get(k);
    if (core) { labelAt.set(k, "core"); if (!kindAt.has(k)) kindAt.set(k, d.kind); } else if (!prev) labelAt.set(k, "secondary");
  }
  const units = [];
  for (let k = 0; k < meta.length; k++) {
    if (meta[k].class === "string" || !isWordLike(stream[k])) continue;
    units.push({ i: k, label: labelAt.get(k) ?? "none", cls: meta[k].class, start: meta[k].start, end: meta[k].end, kind: kindAt.get(k) ?? null });
  }
  return { stream, units, defsTotal: defs.length, defsOutsideUnits, defsPartial };
}

// ── counting ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const COUNT_FIELDS = Object.freeze(["adm", "tp", "fp", "sec", "ref", "refNone", "refCore", "refSec"]);

/** tally one file for one arm. verdictOf(unit, k) -> "admit" | "refuse" | other (unsettled). */
export function tallyFile(prepared, verdictOf) {
  const c = { adm: 0, tp: 0, fp: 0, sec: 0, ref: 0, refNone: 0, refCore: 0, refSec: 0 };
  prepared.units.forEach((u, k) => {
    const v = verdictOf(u, k);
    if (v === "admit") {
      c.adm++;
      if (u.label === "core") c.tp++; else if (u.label === "none") c.fp++; else c.sec++;
    } else if (v === "refuse") {
      c.ref++;
      if (u.label === "none") c.refNone++; else if (u.label === "core") c.refCore++; else c.refSec++;
    }
  });
  return c;
}

export function baseCounts(prepared) {
  const b = { U: prepared.units.length, core: 0, secondary: 0, none: 0 };
  for (const u of prepared.units) b[u.label]++;
  return b;
}

export function sumCounts(list) {
  const out = {};
  for (const c of list) for (const [k, v] of Object.entries(c)) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** metrics from summed counts of an arm and the summed base counts */
export function metricsOf(c, base) {
  const precisionDen = c.tp + c.fp;
  const precision = precisionDen ? c.tp / precisionDen : null;
  const recall = base.core ? c.tp / base.core : null;
  const fn = base.core - c.tp;
  const f1 = 2 * c.tp + c.fp + fn ? (2 * c.tp) / (2 * c.tp + c.fp + fn) : null;
  const baseRate = base.U ? base.none / base.U : null;
  const refPrecision = c.ref ? c.refNone / c.ref : null;
  return {
    admit: { n: c.adm, tp: c.tp, fp: c.fp, secondaryNeutral: c.sec, precision, recall, f1 },
    refuse: {
      n: c.ref, errors: c.refCore + c.refSec, errorsCore: c.refCore, errorsSecondary: c.refSec, precision: refPrecision,
      baseRate, margin: refPrecision == null || baseRate == null ? null : refPrecision - baseRate,
      coverage: base.none ? c.refNone / base.none : null,
    },
  };
}

// ── bootstrap ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Paired, repository-stratified file-cluster bootstrap. files: [{ repo, v: {fieldName: number} }] with the same fields in
 * every file. statFn(sum) -> {stat: value}. Returns { stat: {p5, p50, p95, mean, n} } over B resamples. Within each repo
 * the files are resampled with replacement (the repo keeps its size); repositories are kept (strata).
 */
export function stratifiedBootstrap(files, statFn, { B = CONSTS.BOOT_B, seed = 1 } = {}) {
  const strata = new Map();
  for (const f of files) { if (!strata.has(f.repo)) strata.set(f.repo, []); strata.get(f.repo).push(f); }
  const rng = mulberry32(seed);
  const draws = {};
  const fields = files.length ? Object.keys(files[0].v) : [];
  for (let b = 0; b < B; b++) {
    const sum = Object.fromEntries(fields.map((k) => [k, 0]));
    for (const arr of strata.values()) {
      for (let j = 0; j < arr.length; j++) {
        const f = arr[Math.floor(rng() * arr.length)];
        for (const k of fields) sum[k] += f.v[k];
      }
    }
    const s = statFn(sum);
    for (const [k, v] of Object.entries(s)) { if (v == null || Number.isNaN(v)) continue; (draws[k] ??= []).push(v); }
  }
  const out = {};
  for (const [k, arr] of Object.entries(draws)) {
    arr.sort((x, y) => x - y);
    const q = (p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(p * (arr.length - 1))))];
    out[k] = { p5: q(0.05), p50: q(0.5), p95: q(0.95), mean: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length };
  }
  return out;
}

/** flatten per-file arm counts + base counts into one numeric vector object ("arm.field", "base.field") */
export function flattenFile(base, armCounts) {
  const v = {};
  for (const [k, x] of Object.entries(base)) v[`base.${k}`] = x;
  for (const [arm, c] of Object.entries(armCounts)) for (const [k, x] of Object.entries(c)) v[`${arm}.${k}`] = x;
  return v;
}

/** the arm's counts back out of a flattened (summed) vector */
export function armOf(sum, arm) {
  const c = {};
  for (const k of COUNT_FIELDS) c[k] = sum[`${arm}.${k}`] ?? 0;
  return c;
}
export function baseOf(sum) {
  return { U: sum["base.U"] ?? 0, core: sum["base.core"] ?? 0, secondary: sum["base.secondary"] ?? 0, none: sum["base.none"] ?? 0 };
}
export function f1Of(sum, arm) { return metricsOf(armOf(sum, arm), baseOf(sum)).admit.f1; }
export function refMarginOf(sum, arm) { return metricsOf(armOf(sum, arm), baseOf(sum)).refuse.margin; }

// ── context-table derangement (control) ───────────────────────────────────────────────────────────────────────────
/** permute the VALUES of every level's table among its keys (seeded shuffle then cyclic shift: no key keeps its row) */
export function derangeTables(tables, seed) {
  const rng = mulberry32(seed);
  const out = {};
  for (const [lvl, map] of Object.entries(tables)) {
    const keys = [...map.keys()].sort();
    const vals = keys.map((k) => map.get(k));
    shuffleInPlace(vals, rng);
    const m = new Map();
    keys.forEach((k, idx) => m.set(k, vals[(idx + 1) % vals.length]));
    out[lvl] = m;
  }
  return out;
}

/** the texts of the word-like units permuted among the unit positions (labels stay put); everything else stays */
export function shuffleUnitTexts(prepared, rng) {
  const idx = prepared.units.map((u) => u.i);
  const texts = idx.map((i) => prepared.stream[i]);
  shuffleInPlace(texts, rng);
  const stream = prepared.stream.slice();
  idx.forEach((i, k) => { stream[i] = texts[k]; });
  return stream;
}

/** DIAGNOSTIC (amendment A3): every lexeme text of the stream permuted over every position, punctuation included */
export function shuffleAllTexts(prepared, rng) {
  const stream = prepared.stream.slice();
  shuffleInPlace(stream, rng);
  return stream;
}

// ── the test ledger (held-out discipline: TEST is read once per reader; amendment A9) ───────────────────────────────────
/** the two FIXED places the ledger lives: no environment variable moves them (C2_OUT_DIR does not). An entry in either blocks. */
export const LEDGER_PATHS = Object.freeze([
  "/private/tmp/claude-501/coding-competence/c2-test-ledger.json",
  path.join(HERE, "c2-test-ledger.json"),
]);

export function sha256Bytes(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
export function sha256File(p) { try { return sha256Bytes(fs.readFileSync(p)); } catch { return null; } }
export function sha256Json(o) { return sha256Bytes(JSON.stringify(o)); }

/** sha256 of a language's manifest rows (split, repo, path, sha256), stable under unrelated manifest changes */
export function manifestRowsSha(languageEntry) {
  const rows = [];
  for (const sp of ["train", "dev", "test"]) for (const r of languageEntry?.[sp] ?? []) rows.push([sp, r.repo, r.path, r.sha256]);
  rows.sort((a, b) => (a.join("\u0001") < b.join("\u0001") ? -1 : 1));
  return sha256Json(rows);
}

/** The ledger key. It hashes what the READER and the HELD-OUT SET are (the shipped TRAIN-derived priors, the language's manifest
 *  rows); it does NOT hash the instrument source or its comments, so editing a header cannot re-open TEST. priorFiles = absolute
 *  paths; a missing file hashes to null and is part of the key. */
export function testLedgerKey({ language, priorFiles, manifestSha }) {
  const priors = {};
  for (const f of [...priorFiles].sort()) priors[path.basename(f)] = sha256File(f);
  const key = sha256Json({ language, priors, manifestSha }).slice(0, 32);
  return { key, parts: { language, priors, manifestSha } };
}

function readLedger(p) { try { const j = JSON.parse(fs.readFileSync(p, "utf8")); return j && typeof j === "object" ? j : {}; } catch { return {}; } }
function writeLedger(p, ledger) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(ledger, null, 1));
  fs.renameSync(tmp, p);
}
const asPaths = (x) => (Array.isArray(x) ? x : [x]);

/** the merged view of the ledger files (union; for a key present in several, the earliest `at` wins) */
export function testLedgerRead(paths) {
  const merged = {};
  for (const p of asPaths(paths)) {
    for (const [k, v] of Object.entries(readLedger(p))) if (!merged[k] || (v?.at ?? "") < (merged[k]?.at ?? "")) merged[k] = v;
  }
  return merged;
}

/**
 * testLedgerCheck(paths, key, { repeatReason, record, meta, language }) -> { allowed, previous, repeat, previousKeysForLanguage, error }
 *   - an entry for `key` in ANY path blocks, unless repeatReason (a string of >= REPEAT_REASON_MIN characters) is given; then the
 *     repeat (with its reason) is appended to the entry and allowed = true, repeat = true: the caller must not treat it as a card.
 *   - record = true writes the entry (state "started") to EVERY path BEFORE the caller measures; a write failure is FATAL
 *     (allowed = false, error = "ledger-unwritable:<path>"): nothing may be measured without a durable record.
 *   - previousKeysForLanguage: other keys already recorded for the same language (TEST read before under different priors).
 */
export function testLedgerCheck(paths, key, { repeatReason = null, record = true, meta = {}, language = null } = {}) {
  const ps = asPaths(paths);
  const merged = testLedgerRead(ps);
  const previous = merged[key] ?? null;
  const lang = language ?? meta?.language ?? null;
  const previousKeysForLanguage = lang ? Object.entries(merged).filter(([k, v]) => k !== key && v?.language === lang).map(([k]) => k) : [];
  const reasonOk = typeof repeatReason === "string" && repeatReason.trim().length >= CONSTS.REPEAT_REASON_MIN;
  if (previous && !repeatReason) return { allowed: false, previous, repeat: false, previousKeysForLanguage, error: null };
  if (previous && !reasonOk) return { allowed: false, previous, repeat: false, previousKeysForLanguage, error: `repeat-reason-too-short (< ${CONSTS.REPEAT_REASON_MIN} characters)` };
  const repeat = Boolean(previous);
  if (record) {
    const at = new Date().toISOString();
    for (const p of ps) {
      try {
        const led = readLedger(p);
        const cur = led[key] ?? previous ?? { language: lang, at, state: "started", meta, repeats: [] };
        if (repeat) cur.repeats = [...(cur.repeats ?? []), { at, reason: repeatReason.trim() }];
        led[key] = cur;
        writeLedger(p, led);
      } catch (e) {
        return { allowed: false, previous, repeat, previousKeysForLanguage, error: `ledger-unwritable:${p}:${String(e?.message ?? e).slice(0, 120)}` };
      }
    }
  }
  return { allowed: true, previous, repeat, previousKeysForLanguage, error: null };
}

/** mark the entry completed with a result digest; returns { ok, errors } (a failure here is reported in the card, never swallowed) */
export function testLedgerComplete(paths, key, patch = {}) {
  const errors = [];
  for (const p of asPaths(paths)) {
    try {
      const led = readLedger(p);
      if (!led[key]) { errors.push(`${p}: no entry for key`); continue; }
      led[key] = { ...led[key], state: "completed", completedAt: new Date().toISOString(), ...patch };
      writeLedger(p, led);
    } catch (e) { errors.push(`${p}: ${String(e?.message ?? e).slice(0, 120)}`); }
  }
  return { ok: errors.length === 0, errors };
}

// ── hand baselines and the frequency-matched control (amendment A6) ──────────────────────────────────────────────────
/** the declarator-keyword sets of the declKw hand baseline: declared in c2-names.mjs A6(a), from each language's reference grammar */
export const DECL_KEYWORDS = Object.freeze({
  python: Object.freeze(["def", "class"]), javascript: Object.freeze(["function", "class"]), c: Object.freeze(["struct", "union", "enum"]),
  go: Object.freeze(["func", "type"]), ruby: Object.freeze(["def", "class", "module"]), java: Object.freeze(["class", "interface", "enum"]),
});

/** declKw: admit iff the previous lexeme is a declarator keyword and the word is not a hard keyword; never refuses; H = 0 */
export function declKwJudge(stream, i, declSet, kwSet) {
  const w = stream[i];
  if (i > 0 && declSet.has(stream[i - 1]) && !(kwSet && kwSet.has(w))) return { verdict: "admit", basis: "declarator" };
  return { verdict: "unsettled", basis: "no-declarator" };
}

/** the top-K most frequent TRAIN non-keyword words with >= minOcc occurrences in >= minRepos repositories, IGNORING whether the
 *  word is ever a definition (the frequency-matched control of the settled tier). stat: Map word -> { occ, repos:Set }. */
export function frequentSetOf(stat, kwSet, K, { minOcc, minRepos }) {
  const cands = [];
  for (const [w, s] of stat) { if (kwSet.has(w)) continue; if (s.occ >= minOcc && s.repos.size >= minRepos) cands.push([w, s.occ]); }
  cands.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return new Set(cands.slice(0, K).map((x) => x[0]));
}

// ── khora's own lexer as the segmentation (amendment A7) ─────────────────────────────────────────────────────────────
/** the lexeme stream a reader holds when it segments by itself: comments dropped; units = word-like, non-string lexemes */
export function lexStreamOf(text, lexemes) {
  const stream = [];
  const units = [];
  for (const lx of lexemes) {
    if (lx.class === "comment") continue;
    const t = text.slice(lx.start, lx.end);
    stream.push(t);
    if (lx.class !== "string" && isWordLike(t)) units.push({ i: stream.length - 1, start: lx.start, end: lx.end });
  }
  return { stream, units };
}

/**
 * lexArmFile(prepared, lex, judge) -> { counts, seg }
 *   A gold unit is read iff the lexer produced a unit with exactly its [start, end); otherwise it is unsettled (a segmentation miss).
 *   A lexer unit that is no gold unit is an EXTRA (it can only be a non-name): admitted -> false positive, refused -> refused non-name.
 */
export function lexArmFile(prepared, lex, judge) {
  const byKey = new Map();
  for (const lu of lex.units) byKey.set(`${lu.start}:${lu.end}`, judge(lex.stream, lu.i));
  const goldKeys = new Set(prepared.units.map((u) => `${u.start}:${u.end}`));
  const counts = tallyFile(prepared, (u) => byKey.get(`${u.start}:${u.end}`)?.verdict ?? "miss");
  const seg = { goldUnits: prepared.units.length, unmatchedGold: 0, unmatchedGoldCore: 0, extras: 0, extrasAdmitted: 0, extrasRefused: 0 };
  for (const u of prepared.units) if (!byKey.has(`${u.start}:${u.end}`)) { seg.unmatchedGold++; if (u.label === "core") seg.unmatchedGoldCore++; }
  for (const [k, v] of byKey) {
    if (goldKeys.has(k)) continue;
    seg.extras++;
    if (v.verdict === "admit") { counts.adm++; counts.fp++; seg.extrasAdmitted++; } else if (v.verdict === "refuse") { counts.ref++; counts.refNone++; seg.extrasRefused++; }
  }
  return { counts, seg };
}

/**
 * checkLexCausality(text, lexemes, lexFn, indices) -> { checked, mismatches, selfUnstable }
 * For each lexeme index k: lexing text.slice(0, end_k) and lexing that prefix followed by garbage must both reproduce lexemes
 * 0..k-1 of the whole-file lexing exactly. selfUnstable counts lexemes whose own extent changed when the text after them was
 * cut (a lexeme's own one-char peek; declared, reported). A mismatch among lexemes 0..k-1 is look-ahead.
 */
const GARBAGE = '\n"zz\'`/* #<';
export function checkLexCausality(text, lexemes, lexFn, indices) {
  const mismatches = [];
  let selfUnstable = 0;
  const same = (a, b) => a && b && a.start === b.start && a.end === b.end && a.class === b.class;
  for (const k of indices) {
    const cut = lexemes[k].end;
    const pre = text.slice(0, cut);
    const a = lexFn(pre);
    const b = lexFn(pre + GARBAGE);
    let bad = null;
    for (let j = 0; j < k; j++) { if (!same(a[j], lexemes[j])) { bad = { which: "truncated", j }; break; } if (!same(b[j], lexemes[j])) { bad = { which: "garbled", j }; break; } }
    if (bad) { mismatches.push({ k, ...bad, full: lexemes[bad.j], got: (bad.which === "truncated" ? a : b)[bad.j] ?? null }); if (mismatches.length >= 5) break; }
    if (!same(a[k], lexemes[k])) selfUnstable++;
  }
  return { checked: indices.length, mismatches, selfUnstable };
}

export function topN(counter, n = 12) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
}
