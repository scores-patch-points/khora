// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/transfer-gates.mjs  (Barker, the transfer: typed gates)
// Written BEFORE the first run of eval/barker/transfer.mjs --task L2. The claim, the routes, the flatness check and the gain rule
// of L2 are pre-registered in the header of eval/barker/transfer.mjs and in docs/BARKER.md section 5.2; this file pre-registers only
// the OUTCOME FUNCTIONS Y(system, tau) that the thresholds are scored by, each implementable from UD gold alone, scored on DEV.
// It reads existing source ONLY to reproduce a typed setting (adapters/text/script-floor.js::wordFloor); it edits nothing.
//
// GATE REGISTRY (a typed number is a gate only if its outcome is written here BEFORE any result):
//  G-frame  `min_frame = 5` (scripts/build-frame-prior.mjs). A frame cell is kept iff its hapax count is >= tau ("*|*" always).
//           Y = held-out cross-entropy (bits per OOV token, lower is better) of the system's OWN frame table (built from train with
//           floor tau) on its dev OOV tokens: lowercase form absent from train, gold UPOS (17 classes), context (P, N) resolved through
//           the system's own train majority classes (count < 2 -> UNK, edges ^ $), backoff P|N, P|*, *|N, *|*, additive smoothing
//           1/(17 x total). INTEGRITY: at tau = 5 the re-implemented builder reproduces the received priors/frame-<stem>.json cells
//           exactly for every stem whose sentence and hapax counts equal the prior's own provenance (the G0 pattern).
//  G-floor  `wordFloor(form, 3)` base length (adapters/text/script-floor.js; r2/r3 use it as `form.length >= wordFloor(form, 3)`).
//           PROXY outcome: the floor is how short a candidate may be and still carry a name. Y = token-level F1 (higher is better) of
//           "the form is a WORD (letters, marks, numerals, apostrophe) that is not numeric and passes length >= wordFloor(form, tau)" as a
//           detector of gold PROPN on dev tokens. The call to wordFloor is the real function (imported), so the typed setting is
//           reproduced by construction; the lane's other filters (recurrence, keyness) are NOT modelled, which is why it is a proxy.
//  G-volume `MIN_VOLUME = 20` (scripts/build-role-config.mjs): a marker candidate needs at least this many occurrences before it is
//           tested. Re-implemented with the builder's own max-statistic null (200 draws, alpha 0.05, seed-1 LCG, CLOSED classes).
//           Y = F1 (higher is better) on dev of "the token right after (on the dominant side) the discovered object marker is a gold
//           obj/iobj"; no marker discovered -> no prediction (F1 0). INTEGRITY: at tau = 20 the discovered object marker (form and
//           precision) equals the received role-config's wherever its provenance source is the same train file.
//  NOT RUN (typed gaps, each with the exact missing piece): ARRIVALS_FLOOR = 2 (listening-cast; declared "structural, not a dial", its
//           outcome needs the whole lane); KEY_ALPHA = 0.05 (the keyness reading; its outcome needs the lane and a gold of "being");
//           r1 NEED_FLOOR = 0.02 (needs r1's tokeniser and ear arms).
//
// GRID (pre-registered, never extended): tau = typed x 2^k, k = -2..4.
// CONTROLS BUILT TO FAIL: (i) a gate whose Y is constant over the grid must read INERT (flatness check); (ii) Y evaluated on the
//   dev file with UPOS labels permuted across tokens must be flat in tau (G-frame): the planted-null check lives in the test.
// POWER: tests/barker-transfer.test.js plants a tau* that depends on a kind and requires the kind-mate route to recover it.
// RECORDED PREDICTIONS: G-frame INERT in most lineages (the floor only touches rare cells: P 0.6); G-floor NOT inert in alphabetic scripts
//   (functions words of length <= 3 dominate: P 0.8) and flat in dense scripts (wordFloor caps at 2: P 0.95); G-volume INERT (P 0.8).
// ═══ END PRE-REGISTRATION ═══

import fs from "node:fs";
import path from "node:path";
import { wordFloor } from "../../adapters/text/script-floor.js";
import {
  readTreebank, trainPath, devPath, formTally, buildFrameTable, applyFloor, frameDist, oovTokens, readFramePrior, readRoleConfig, CLOSED, UPOS, uposIndex,
} from "./transfer-data.mjs";

export const GRID_K = Object.freeze([-2, -1, 0, 1, 2, 3, 4]);
export const K_TYPED = 2; // index of k = 0 in GRID_K
const log2 = Math.log2;

const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;
const NUMERIC = /^[\p{N}'’]+$/u;

/** per-sentence sufficient statistics: stats[k] = Float64Array(nSent * width); y(sums) maps column sums to Y */
function emptyStats(nSent, width) { return Float64Array.from({ length: nSent * width }).fill(0); }

// ── G-frame ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const GATE_FRAME = {
  id: "G-frame", typed: 5, file: "scripts/build-frame-prior.mjs", unit: "bits per OOV token", better: "min", width: 2, proxy: false,
  grid: GRID_K.map((k) => 5 * 2 ** k),
  prepare(sys) {
    const tally = formTally(sys.train);
    const table = buildFrameTable(sys.train, { floor: 5, tally });
    const oov = oovTokens(sys.dev, tally);
    return { tally, table, oov, nSent: sys.dev.length };
  },
  stats(prep, tau) {
    const frames = applyFloor(prep.table, tau);
    const st = emptyStats(prep.nSent, 2);
    for (const t of prep.oov) {
      const fd = frameDist(frames, t.P, t.N);
      const p = fd ? fd.dist[t.u] : 1 / UPOS.length;
      st[t.s * 2] += -log2(p); st[t.s * 2 + 1] += 1;
    }
    return st;
  },
  y(sums) { return sums[1] ? sums[0] / sums[1] : NaN; },
};

// ── G-floor ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const GATE_FLOOR = {
  id: "G-floor", typed: 3, file: "adapters/text/script-floor.js", unit: "F1 of the length floor as a PROPN detector (tokens)", better: "max", width: 3, proxy: true,
  grid: GRID_K.map((k) => 3 * 2 ** k),
  prepare(sys) {
    const toks = sys.dev.map((s) => s.tokens.filter((t) => t.upos !== "PUNCT").map((t) => ({ f: t.form, gold: t.upos === "PROPN" })));
    return { toks, nSent: sys.dev.length };
  },
  stats(prep, tau) {
    const st = emptyStats(prep.nSent, 3);
    prep.toks.forEach((ts, s) => {
      for (const t of ts) {
        const pred = WORDISH.test(t.f) && !NUMERIC.test(t.f) && t.f.length >= wordFloor(t.f, tau);
        if (pred && t.gold) st[s * 3]++; else if (pred) st[s * 3 + 1]++; else if (t.gold) st[s * 3 + 2]++;
      }
    });
    return st;
  },
  y(sums) { const [tp, fp, fn] = sums; return tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : NaN; },
};

// ── G-volume ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const CLOSED_MARKER = new Set(["ADP", "PART", "SCONJ", "CCONJ", "DET", "AUX"]);
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }; // the builder's own makeRng

/** parse as the builder does: base deprel, form, upos, head; skip MWT ranges */
const builderSentences = (sents) => sents.map((s) => s.tokens.map((t) => ({ id: t.id, form: t.form, upos: t.upos, head: Number(t.head), deprel: t.deprel.split(":")[0] })));

function positionStats(sentences, deprels) {
  let before = 0, after = 0;
  for (const toks of sentences) for (const t of toks) { if (!deprels.includes(t.deprel)) continue; if (t.id < t.head) before++; else after++; }
  const total = before + after;
  return { total, before, after, dominantSide: total ? (before >= after ? "before" : "after") : null };
}
function tallyHits(sentences, deprels, side) {
  const byForm = new Map();
  for (const toks of sentences) {
    const byId = new Map(toks.map((t) => [t.id, t]));
    for (const t of toks) {
      const nb = byId.get(side === "after" ? t.id + 1 : t.id - 1);
      const isRole = !!nb && deprels.includes(nb.deprel);
      const row = byForm.get(t.form) ?? { hits: 0, total: 0 };
      row.total++; if (isRole) row.hits++;
      byForm.set(t.form, row);
    }
  }
  return byForm;
}
/** dominant UPOS by form (builder's own) */
function dominantUposByForm(sentences) {
  const counts = new Map();
  for (const toks of sentences) for (const t of toks) { let m = counts.get(t.form); if (!m) counts.set(t.form, (m = new Map())); m.set(t.upos, (m.get(t.upos) ?? 0) + 1); }
  const dom = new Map();
  for (const [form, m] of counts) { let best = null, bn = 0; for (const [u, n] of m) if (n > bn) { bn = n; best = u; } dom.set(form, best); }
  return dom;
}
/**
 * markerPrep(trainSentences): everything the builder's discoverMarker computes that does NOT depend on MIN_VOLUME: the real
 * tally, and the per-draw per-form null hit rates over the CLOSED forms of every volume >= the smallest grid value. The ceiling
 * for a given tau is then the (1-alpha) quantile of the max over the eligible set per draw.
 */
export function markerPrep(sentencesRaw, { draws = 200, alpha = 0.05, seed = 1, minVolumeFloor = 5 } = {}) {
  const sentences = builderSentences(sentencesRaw);
  const objDeprels = ["obj", "iobj"];
  const pos = positionStats(sentences, objDeprels);
  const side = pos.dominantSide ?? "after";
  const real = tallyHits(sentences, objDeprels, side);
  const dom = dominantUposByForm(sentences);
  const candidates = new Set();
  for (const [form, { total }] of real) if (total >= minVolumeFloor && CLOSED_MARKER.has(dom.get(form))) candidates.add(form);
  const rng = lcg(seed);
  const drawRates = []; // per draw: Map(form -> rate) for candidate forms
  for (let d = 0; d < draws; d++) {
    const shuffledS = sentences.map((toks) => {
      const roleIds = toks.filter((t) => objDeprels.includes(t.deprel)).map((t) => t.id);
      const pool = toks.map((t) => t.id);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const red = new Set(pool.slice(0, roleIds.length));
      return toks.map((t) => ({ ...t, deprel: red.has(t.id) ? objDeprels[0] : (objDeprels.includes(t.deprel) ? "_was_role_" : t.deprel) }));
    });
    const dt = tallyHits(shuffledS, [objDeprels[0]], side);
    const rates = new Map();
    for (const form of candidates) { const row = dt.get(form); rates.set(form, row?.total ? row.hits / row.total : 0); }
    drawRates.push(rates);
  }
  return { real, dom, candidates, drawRates, side, pos, alpha, draws };
}
/** the object marker the builder would discover at a given MIN_VOLUME (or null) */
export function discoverObjectMarker(prep, minVolume) {
  const eligible = [...prep.candidates].filter((f) => prep.real.get(f).total >= minVolume);
  if (!eligible.length) return null;
  const maxNull = prep.drawRates.map((rates) => { let m = 0; for (const f of eligible) { const r = rates.get(f) ?? 0; if (r > m) m = r; } return m; }).sort((a, b) => a - b);
  const idx = Math.min(maxNull.length - 1, Math.ceil((1 - prep.alpha) * maxNull.length) - 1);
  const ceiling = maxNull[Math.max(0, idx)];
  let best = null;
  for (const f of eligible) { const { hits, total } = prep.real.get(f); const precision = hits / total; if (!best || precision > best.precision) best = { form: f, hits, total, precision }; }
  if (!best || best.precision <= ceiling) return null;
  return { ...best, nullCeiling: ceiling };
}
export const GATE_VOLUME = {
  id: "G-volume", typed: 20, file: "scripts/build-role-config.mjs", unit: "F1 of the discovered object marker on dev", better: "max", width: 3, proxy: false,
  grid: GRID_K.map((k) => 20 * 2 ** k),
  prepare(sys) {
    const prep = markerPrep(sys.train);
    return { prep, dev: builderSentences(sys.dev), nSent: sys.dev.length };
  },
  stats(P, tau) {
    const marker = discoverObjectMarker(P.prep, tau);
    const st = emptyStats(P.nSent, 3);
    const side = P.prep.side;
    P.dev.forEach((toks, s) => {
      const isObj = (t) => t && (t.deprel === "obj" || t.deprel === "iobj");
      const byId = new Map(toks.map((t) => [t.id, t]));
      const predicted = new Set();
      if (marker) for (const t of toks) if (t.form === marker.form) { const nb = byId.get(side === "after" ? t.id + 1 : t.id - 1); if (nb) predicted.add(nb.id); }
      for (const t of toks) {
        const gold = isObj(t), pred = predicted.has(t.id);
        if (pred && gold) st[s * 3]++; else if (pred) st[s * 3 + 1]++; else if (gold) st[s * 3 + 2]++;
      }
    });
    return st;
  },
  y(sums) { const [tp, fp, fn] = sums; return tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : NaN; },
};

export const GATES = Object.freeze({ "G-frame": GATE_FRAME, "G-floor": GATE_FLOOR, "G-volume": GATE_VOLUME });

// ── scoring: Y over the grid, the per-sentence stats for the bootstrap, tau*, flatness ───────────────────────────────────
const colSums = (st, width) => { const s = new Float64Array(width); for (let i = 0; i < st.length; i += width) for (let c = 0; c < width; c++) s[c] += st[i + c]; return s; };

/** Y over the grid for one system: { Y: number[7], stats: Float64Array[7] } */
export function gateTable(gate, sys) {
  const prep = gate.prepare(sys);
  const stats = gate.grid.map((tau) => gate.stats(prep, tau));
  const Y = stats.map((st) => gate.y(colSums(st, gate.width)));
  return { Y, stats, prep };
}
/** the loss orientation shared by all gates: lower is better */
export const lossOf = (gate, y) => (gate.better === "min" ? y : -y);

/** tau* index (ties broken toward the typed value) */
export function argBest(gate, Y) {
  let best = -1;
  for (let k = 0; k < Y.length; k++) {
    if (!Number.isFinite(Y[k])) continue;
    if (best < 0 || lossOf(gate, Y[k]) < lossOf(gate, Y[best]) - 1e-12 || (Math.abs(lossOf(gate, Y[k]) - lossOf(gate, Y[best])) <= 1e-12 && Math.abs(k - K_TYPED) < Math.abs(best - K_TYPED))) best = k;
  }
  return best;
}
/** paired bootstrap over dev sentences of Y(tau*) - Y(typed) in loss orientation: { diff, se } */
export function flatness(gate, tab, { B = 300, seed = 1 } = {}) {
  const kStar = argBest(gate, tab.Y);
  if (kStar < 0) return { kStar, diff: NaN, se: NaN, flat: true };
  const diff = lossOf(gate, tab.Y[K_TYPED]) - lossOf(gate, tab.Y[kStar]);
  if (kStar === K_TYPED || diff <= 0) return { kStar, diff: 0, se: 0, flat: true };
  const w = gate.width, nSent = tab.stats[0].length / w;
  let s = seed >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ds = [];
  for (let b = 0; b < B; b++) {
    const a = new Float64Array(w), c = new Float64Array(w);
    for (let i = 0; i < nSent; i++) { const r = Math.floor(rng() * nSent); for (let j = 0; j < w; j++) { a[j] += tab.stats[kStar][r * w + j]; c[j] += tab.stats[K_TYPED][r * w + j]; } }
    ds.push(lossOf(gate, gate.y(c)) - lossOf(gate, gate.y(a)));
  }
  const m = ds.reduce((x, y) => x + y, 0) / B;
  const se = Math.sqrt(ds.reduce((x, y) => x + (y - m) ** 2, 0) / (B - 1));
  return { kStar, diff, se, flat: diff <= se };
}

// ── integrity (controls built to fail) ───────────────────────────────────────────────────────────────────────────────
/** G-frame: does the re-implemented builder reproduce the received prior? */
export function frameIntegrity(stem, train) {
  const rec = readFramePrior(stem);
  if (!rec) return { stem, comparable: false, reason: "no_received_prior" };
  const table = buildFrameTable(train, { floor: 5 });
  if (rec.provenance?.sentences !== table.sentences || rec.provenance?.hapax !== table.hapax) return { stem, comparable: false, reason: "source_differs", received: { sentences: rec.provenance?.sentences, hapax: rec.provenance?.hapax }, mine: { sentences: table.sentences, hapax: table.hapax } };
  const a = rec.frames, b = table.frames;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let mism = 0;
  for (const k of keys) { const x = a[k] ?? {}, y = b[k] ?? {}; const us = new Set([...Object.keys(x), ...Object.keys(y)]); for (const u of us) if ((x[u] ?? 0) !== (y[u] ?? 0)) mism++; }
  return { stem, comparable: true, mismatches: mism, cells: keys.size, equal: mism === 0 };
}
/** G-volume: does the re-implemented discovery reproduce the received object marker at 20? */
export function volumeIntegrity(stem, train, { draws = 200 } = {}) {
  const rc = readRoleConfig(stem);
  if (!rc) return { stem, comparable: false, reason: "no_received_prior" };
  const src = rc.provenance?.source ?? "";
  if (!src.endsWith(`/tb/${stem === "kor" ? "kor-gsd" : stem}/train.conllu`) || rc.provenance?.null_draws !== draws) return { stem, comparable: false, reason: "source_differs", source: src };
  const prep = markerPrep(train, { draws, seed: rc.provenance.null_seed ?? 1, alpha: rc.provenance.null_alpha ?? 0.05, minVolumeFloor: 20 });
  const m = discoverObjectMarker(prep, 20);
  const r = rc.object.marker;
  const equal = (!m && !r) || (m && r && m.form === r.form && Math.abs(m.precision - r.precision) < 1e-9);
  return { stem, comparable: true, equal, mine: m ? { form: m.form, precision: m.precision } : null, received: r ? { form: r.form, precision: r.precision } : null };
}

/** loads a system's train and dev sentences (DEV only) */
export function loadSys(stem) {
  const tr = readTreebank(trainPath(stem));
  const dv = readTreebank(devPath(stem));
  return { stem, train: tr.sentences, dev: dv.sentences, trainSha: tr.sha256, devSha: dv.sha256 };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// per-system summaries shared by L2 and L3 (cached on disk by the files' size and mtime; DEV only)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const OWN_SIZES = Object.freeze([50, 200, 1000, 5000]);

/** L3 target side: the dev OOV tokens as counts over (context key, gold UPOS), plus own-table reference losses */
export function l3Prep(sys) {
  const tally = formTally(sys.train);
  const oov = oovTokens(sys.dev, tally);
  const ctx = {};
  for (const t of oov) { const k = `${t.P}|${t.N}`; (ctx[k] ??= new Array(UPOS.length).fill(0))[t.u]++; }
  const ceOf = (frames) => {
    let bits = 0;
    for (const t of oov) { const fd = frameDist(frames, t.P, t.N); bits += -log2(fd ? fd.dist[t.u] : 1 / UPOS.length); }
    return oov.length ? bits / oov.length : NaN;
  };
  const own = {};
  for (const n of OWN_SIZES) own[n] = ceOf(buildFrameTable(sys.train.slice(0, n), { floor: 5 }).frames);
  own.full = ceOf(buildFrameTable(sys.train, { floor: 5, tally }).frames);
  return { nTok: oov.length, ctx, own, uniform: Math.log2(UPOS.length), trainSentences: sys.train.length, devSentences: sys.dev.length };
}

/**
 * systemSummary(stem, { cacheDir, gates }) -> { stem, l3, gates: { id: { Y, kStar, diff, se, flat } }, integrity: { frame } }
 * Everything is derived from the train and dev files of the stem; the file stats key the cache.
 */
export function systemSummary(stem, { cacheDir = null, gates = ["G-frame", "G-floor"], force = false } = {}) {
  const tp = trainPath(stem), dp = devPath(stem);
  const st = (f) => { const x = fs.statSync(f); return `${x.size}-${Math.round(x.mtimeMs)}`; };
  const cacheFile = cacheDir ? path.join(cacheDir, `l23-${stem}-${st(tp)}-${st(dp)}.json`) : null;
  let cached = null;
  if (cacheFile && !force && fs.existsSync(cacheFile)) { try { cached = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { cached = null; } }
  const want = gates.filter((g) => !cached?.gates?.[g]);
  if (cached && !want.length && cached.l3) return cached;
  const sys = loadSys(stem);
  const out = cached ?? { stem, gates: {}, l3: null, integrity: {} };
  if (!out.l3) out.l3 = l3Prep(sys);
  if (!out.integrity.frame) out.integrity.frame = frameIntegrity(stem, sys.train);
  for (const gid of want) {
    const gate = GATES[gid];
    const tab = gateTable(gate, sys);
    const fl = flatness(gate, tab);
    out.gates[gid] = { Y: tab.Y, kStar: fl.kStar, diff: fl.diff, se: fl.se, flat: fl.flat, grid: gate.grid };
  }
  out.sys = { trainSha: sys.trainSha, devSha: sys.devSha, trainWords: sys.train.reduce((a, s) => a + s.tokens.reduce((b, t) => b + (t.upos !== "PUNCT" ? 1 : 0), 0), 0), trainVocab: formTally(sys.train).size };
  if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out)); }
  return out;
}
