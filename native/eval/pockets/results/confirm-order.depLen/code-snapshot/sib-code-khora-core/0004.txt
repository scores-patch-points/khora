// adapters/code/identify.js — name a programming language (or a data/markup notation) from CONTENT ALONE, causally.
//
// WHAT THIS IS. A pure, zero-model identifier for the code channel's R0 rung. It is handed text one line at a
// time and, after every line, can say which candidate language leads. It never sees the file name, the extension or a
// shebang (stripShebang removes a leading `#!` line), and the verdict after line i is a function of lines 1..i only: all of
// its state lives in an explicit `state` object the caller owns, nothing is global, no whole-file statistic exists.
//
// LOVELACE'S LAW. The engine originates nothing: it recovers what the text ORDERS. Two witnesses, summed as one-vs-rest
// log-likelihood ratios (naive Bayes, independence assumed and disclosed, uniform language prior):
//   A  KEYWORD channel — RECEIVED, giver-named. Per language L a keyword set (python: the CPython engine; javascript and
//      the rest: the language's tree-sitter grammar, see priors/code-identify.json -> languages[].keywordSource). Each
//      DISTINCT word of a line is scored "member of L's set / not", with two rates counted on TRAIN: a_L = P(member | file is
//      L) and b_L = P(member | file is not L). A language with no keyword giver is a TYPED GAP (status "gap"): it contributes 0.
//   B  SHAPE channel — lexical statistics counted on TRAIN: punctuation runs, first token and first two tokens of the line
//      (a word is NAMED only if some received keyword set owns it, else it is W), last character, indent style, line-length
//      bucket, word-case shapes. Casing is ONE witness among these, never THE signal.
// The prior REFUSES or NOMINATES, it never admits: the output is a nomination (a leader and a margin), and a closed set
// has no "none of the above" (disclosed in the limits of eval/coding-competence/c0-identify.mjs).
//
// SPLIT DISCIPLINE. trainPrior is pure (texts in, prior out); the builder (eval/coding-competence/c0-build-prior.mjs) feeds it
// TRAIN files only, split by repository. Held-out files are scored by createIdentifier(prior) and never feed back.

import fs from "node:fs";

export const IDENTIFY_VERSION = "identify-1";
export const IDENTIFY_PRIOR_FILE = new URL("../../priors/code-identify.json", import.meta.url);
/** Declared caps (P4: provisional, chosen for run time). */
export const CAPS = Object.freeze({ MAX_LINES: 3000, MAX_LINE_CHARS: 2000 });

// ── text → lines ─────────────────────────────────────────────────────────────
/** Remove a UTF-8 BOM and a leading `#!` line: the shebang is a file-name-like hint the task hides. */
export function stripShebang(text) {
  let t = String(text ?? "");
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  if (t.startsWith("#!")) {
    const nl = t.search(/\r\n?|\n/);
    t = nl === -1 ? "" : t.slice(nl).replace(/^(\r\n?|\n)/, "");
  }
  return t;
}

/** Physical lines of the (shebang-stripped) text, capped at CAPS.MAX_LINES. */
export function splitLines(text) {
  const lines = stripShebang(text).split(/\r\n?|\n/);
  return lines.length > CAPS.MAX_LINES ? lines.slice(0, CAPS.MAX_LINES) : lines;
}

// ── per-line features (pure) ─────────────────────────────────────────────────
// words: optional one-char prefix # or @ (directives, annotations) then an ASCII identifier; numbers; ASCII punctuation
// runs (underscore is a word character). Non-ASCII characters are not tokens (they are separators).
const TOK = /([#@]?[A-Za-z_][A-Za-z0-9_]*)|([0-9][A-Za-z0-9_.]*)|([!-\/:-@\[-^`{-~]+)/g;
const LEAD_WS = /^[ \t]*/;
const capRun = (r) => (r.length > 3 ? r.slice(0, 3) + "+" : r);

/** Case shape of a word (one witness). */
export function wordShape(w) {
  const b = w.replace(/^[#@]/, "");
  if (b.length === 1) return b === "_" ? "us" : "c1";
  if (/^_+$/.test(b)) return "us";
  if (/^__.*__$/.test(b)) return "dunder";
  if (/^[A-Z][A-Z0-9_]+$/.test(b)) return "UPPER";
  if (/^_/.test(b)) return "_lead";
  if (/^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(b)) return "Camel";
  if (/^[A-Z][a-z0-9]*$/.test(b)) return "Cap";
  if (/^[a-z][a-z0-9]*$/.test(b)) return "lower";
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(b)) return "snake";
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(b)) return "camel";
  return "mix";
}

const lengthBucket = (n) => (n <= 20 ? "s" : n <= 60 ? "m" : n <= 100 ? "l" : n <= 140 ? "x" : "xx");

/**
 * featuresOfLine(line, lexUnion) -> null for a blank line, else
 *   { words: distinct words of the line, shape: distinct shape-feature strings }.
 * `lexUnion` (a Set) is the union of the RECEIVED keyword sets: the only word identities the shape channel may name.
 */
export function featuresOfLine(line, lexUnion) {
  const s = line.length > CAPS.MAX_LINE_CHARS ? line.slice(0, CAPS.MAX_LINE_CHARS) : line;
  const ws = LEAD_WS.exec(s)[0];
  if (ws.length === s.length) return null;
  const words = new Set();
  const shape = new Set();
  let t1 = null;
  let t2 = null;
  let nTok = 0;
  for (const m of s.matchAll(TOK)) {
    let canon;
    if (m[1] !== undefined) {
      const w = m[1];
      words.add(w);
      canon = lexUnion.has(w) ? w : "W";
    } else if (m[2] !== undefined) {
      canon = "N";
    } else {
      canon = capRun(m[3]);
      shape.add("p:" + canon);
    }
    if (nTok === 0) t1 = canon;
    else if (nTok === 1) t2 = canon;
    nTok++;
  }
  if (t1 !== null) shape.add("a:" + t1);
  if (t1 !== null && t2 !== null) shape.add("b:" + t1 + "_" + t2);
  const last = s.trimEnd().slice(-1);
  shape.add("e:" + (/[A-Za-z0-9_]/.test(last) ? "a" : last));
  const n = ws.length;
  shape.add("i:" + (ws.includes("\t") ? "t" : n === 0 ? "0" : n % 4 === 0 ? "4" : n % 2 === 0 ? "2" : "o"));
  shape.add("l:" + lengthBucket(s.length));
  for (const w of words) if (!lexUnion.has(w)) shape.add("w:" + wordShape(w));
  return { words: [...words], shape: [...shape] };
}

// ── training (pure: texts in, prior out; the caller reads files and names the givers) ───────────────
const push = (map, key, v) => {
  const a = map.get(key);
  if (a) a.push(v);
  else map.set(key, [v]);
};

/**
 * trainPrior({ languages: [{ id, keywords: string[]|null, keywordSource, files: [{ text, repo }] }], ...params })
 *   -> CodeIdentifyPrior@1 body (languages, features, counts, params). The caller adds provenance.
 * Every count is over the files handed in (TRAIN only, by contract of the caller). Thresholds are declared (P4).
 */
export function trainPrior({ languages, minCount = 30, minFiles = 5, maxFeatures = 20000, jeffreys = 0.5, laplace = 1, shapeNamesWords = true } = {}) {
  const K = languages.length;
  const lexUnion = new Set();
  const exactIdx = new Map();
  const foldIdx = new Map();
  languages.forEach((lg, i) => {
    for (const kw of lg.keywords ?? []) {
      lexUnion.add(kw);
      push(exactIdx, kw, i);
      push(foldIdx, kw.toLowerCase(), i);
    }
  });
  // shape lexicon: the received union (v1: line-start words the givers own are NAMED) or empty (blind: no word identity in the shape channel)
  const shapeLex = shapeNamesWords ? lexUnion : new Set();
  const featCount = new Map();
  const featFiles = new Map();
  const T = new Float64Array(K);
  const Hx = new Float64Array(K * K);
  const Hf = new Float64Array(K * K);
  const nLines = new Float64Array(K);
  const nFiles = new Float64Array(K);
  const repos = languages.map(() => new Set());
  languages.forEach((lg, i) => {
    for (const file of lg.files ?? []) {
      nFiles[i]++;
      if (file.repo) repos[i].add(file.repo);
      const seen = new Set();
      for (const line of splitLines(file.text)) {
        const fl = featuresOfLine(line, shapeLex);
        if (!fl) continue;
        nLines[i]++;
        for (const f of fl.shape) {
          let c = featCount.get(f);
          if (!c) featCount.set(f, (c = new Float64Array(K)));
          c[i]++;
          seen.add(f);
        }
        T[i] += fl.words.length;
        for (const w of fl.words) {
          const e = exactIdx.get(w);
          if (e) for (const L of e) Hx[i * K + L]++;
          const g = foldIdx.get(w.toLowerCase());
          if (g) for (const L of g) Hf[i * K + L]++;
        }
      }
      for (const f of seen) featFiles.set(f, (featFiles.get(f) ?? 0) + 1);
    }
  });
  // vocabulary: support thresholds, then the most frequent, deterministic order
  const vocab = [];
  for (const [f, c] of featCount) {
    let tot = 0;
    for (let i = 0; i < K; i++) tot += c[i];
    if (tot >= minCount && (featFiles.get(f) ?? 0) >= minFiles) vocab.push([f, tot]);
  }
  vocab.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const features = vocab.slice(0, maxFeatures).map((x) => x[0]);
  const counts = languages.map((_, i) => features.map((f) => featCount.get(f)[i]));
  // keyword channel rates (TRAIN): a = own rate, b = uniform mean of the other languages' rates of hitting L's set
  const kl = (a, b) => a * Math.log(a / b) + (1 - a) * Math.log((1 - a) / (1 - b));
  const out = languages.map((lg, L) => {
    const row = {
      id: lg.id,
      keywordSource: lg.keywordSource ?? null,
      keywords: [...new Set(lg.keywords ?? [])].sort(),
      nFiles: nFiles[L],
      nLines: nLines[L],
      nWords: T[L],
      nRepos: repos[L].size,
      repos: [...repos[L]].sort(),
      mode: "exact",
      a: null,
      b: null,
      status: "gap",
    };
    if (!row.keywords.length) return row;
    if (!(T[L] > 0)) return { ...row, status: "no_train" };
    let best = null;
    for (const [mode, H] of [["exact", Hx], ["fold", Hf]]) {
      const a = (H[L * K + L] + jeffreys) / (T[L] + 2 * jeffreys);
      let sb = 0;
      let nb = 0;
      for (let M = 0; M < K; M++) {
        if (M === L || !(T[M] > 0)) continue;
        sb += (H[M * K + L] + jeffreys) / (T[M] + 2 * jeffreys);
        nb++;
      }
      const b = nb ? sb / nb : 0.5;
      const k = kl(a, b);
      if (!best || k > best.k + 1e-12) best = { mode, a, b, k };
    }
    return { ...row, mode: best.mode, a: best.a, b: best.b, kl: best.k, status: best.a > best.b ? "ok" : "uninformative" };
  });
  return {
    languages: out,
    features,
    counts,
    params: { minCount, minFiles, maxFeatures, jeffreys, laplace, shapeNamesWords, caps: CAPS, version: IDENTIFY_VERSION, vocabularySize: features.length, vocabularyBeforeCap: vocab.length },
  };
}

// ── the identifier (causal) ──────────────────────────────────────────────────
/** Load priors/code-identify.json; null when absent or of another schema (a typed gap: nothing is guessed without a prior). */
export function loadIdentifyPrior(file = IDENTIFY_PRIOR_FILE) {
  try {
    const p = JSON.parse(fs.readFileSync(file, "utf8"));
    return p?.schema === "CodeIdentifyPrior@1" ? p : null;
  } catch {
    return null;
  }
}

/** z-score a score vector over the active languages (mean 0, SD 1; an SD of 0 gives all zeros). */
function zscore(v, active) {
  let n = 0, sum = 0;
  for (let L = 0; L < v.length; L++) if (active[L]) { n++; sum += v[L]; }
  const out = new Float64Array(v.length);
  if (!n) return out;
  const mean = sum / n;
  let ss = 0;
  for (let L = 0; L < v.length; L++) if (active[L]) ss += (v[L] - mean) ** 2;
  const sd = Math.sqrt(ss / n);
  if (sd > 0) for (let L = 0; L < v.length; L++) if (active[L]) out[L] = (v[L] - mean) / sd;
  return out;
}

/**
 * createIdentifier(prior, { shapePrior, combine }) -> { languages, K, begin(), feed(state, line), leader(state, opts), trace(text, opts), identify(text) }
 * The identifier holds only immutable tables derived from the priors; per-text state is the object begin() returns.
 *   shapePrior  an optional CodeIdentifyShapePrior@1 (same language order) that REPLACES the shape statistics of `prior`
 *               (the "blind" shape channel, built with word identity withheld). Default: the shape statistics of `prior`.
 *   combine     "sum" (default, v1): argmax of A + B, raw log-likelihood ratios;
 *               "z": each channel is z-scored across the active languages (equal weight, declared, not fitted) before summing.
 */
export function createIdentifier(prior, { shapePrior = null, combine = "sum" } = {}) {
  if (!prior || prior.schema !== "CodeIdentifyPrior@1") throw new TypeError("createIdentifier: a CodeIdentifyPrior@1 is required");
  const langs = prior.languages;
  const K = langs.length;
  const ids = langs.map((l) => l.id);
  if (shapePrior) {
    if (shapePrior.schema !== "CodeIdentifyShapePrior@1") throw new TypeError("createIdentifier: shapePrior must be a CodeIdentifyShapePrior@1");
    if (JSON.stringify(shapePrior.languageIds) !== JSON.stringify(ids)) throw new TypeError("createIdentifier: shapePrior language order differs from the prior's");
  }
  const shapeSrc = shapePrior ?? prior;
  const lexUnion = new Set();
  const exactIdx = new Map();
  const foldIdx = new Map();
  const u = new Float64Array(K);
  const d = new Float64Array(K);
  const active = new Uint8Array(K);
  langs.forEach((l, i) => {
    for (const kw of l.keywords ?? []) lexUnion.add(kw);
    active[i] = l.nFiles > 0 ? 1 : 0;
    if (l.status === "ok") {
      u[i] = Math.log(l.a / l.b);
      d[i] = Math.log((1 - l.a) / (1 - l.b));
      for (const kw of l.keywords) push(l.mode === "fold" ? foldIdx : exactIdx, l.mode === "fold" ? kw.toLowerCase() : kw, i);
    }
  });
  // the shape channel names a word only if the shape statistics were counted that way (v1: yes; blind: no)
  const shapeLex = shapeSrc.params?.shapeNamesWords === false ? new Set() : lexUnion;
  // shape weights: w[f*K + L] = ln P(f|L) - ln P(f|not L), P smoothed Laplace over the vocabulary, not-L the uniform mean of the others
  const V = shapeSrc.features.length;
  const alpha = shapeSrc.params?.laplace ?? 1;
  const featIndex = new Map(shapeSrc.features.map((f, i) => [f, i]));
  const weights = new Float32Array(V * K);
  const N = shapeSrc.counts.map((row) => row.reduce((s, x) => s + x, 0));
  for (let f = 0; f < V; f++) {
    const P = new Float64Array(K);
    let sum = 0;
    for (let i = 0; i < K; i++) {
      P[i] = (shapeSrc.counts[i][f] + alpha) / (N[i] + alpha * V);
      sum += P[i];
    }
    for (let i = 0; i < K; i++) {
      const notL = K > 1 ? (sum - P[i]) / (K - 1) : P[i];
      weights[f * K + i] = Math.log(P[i] / notL);
    }
  }

  function begin() {
    return { lines: 0, evidence: 0, A: new Float64Array(K), B: new Float64Array(K) };
  }

  /** Hand over ONE line. Mutates `state` (caller-owned); nothing else is touched. */
  function feed(state, line) {
    state.lines++;
    const fl = featuresOfLine(line, shapeLex);
    if (!fl) return state;
    state.evidence++;
    const T = fl.words.length;
    if (T) {
      const hits = new Int32Array(K);
      for (const w of fl.words) {
        const e = exactIdx.get(w);
        if (e) for (const L of e) hits[L]++;
        const g = foldIdx.get(w.toLowerCase());
        if (g) for (const L of g) hits[L]++;
      }
      for (let L = 0; L < K; L++) state.A[L] += T * d[L] + hits[L] * (u[L] - d[L]);
    }
    for (const f of fl.shape) {
      const i = featIndex.get(f);
      if (i === undefined) continue;
      const base = i * K;
      for (let L = 0; L < K; L++) state.B[L] += weights[base + L];
    }
    return state;
  }

  /** leader(state, {combine}) -> { index, language, margin } (margin = top1 - top2 of the combined score) or null before any evidence. */
  function leader(state, { A = state.A, B = state.B, mode = combine } = {}) {
    if (!state.evidence) return null;
    let sa = A, sb = B;
    if (mode === "z") { sa = zscore(A, active); sb = zscore(B, active); }
    let best = -1;
    let bs = -Infinity;
    let second = -Infinity;
    for (let L = 0; L < K; L++) {
      if (!active[L]) continue;
      const s = sa[L] + sb[L];
      if (s > bs) {
        second = bs;
        bs = s;
        best = L;
      } else if (s > second) second = s;
    }
    return best < 0 ? null : { index: best, language: ids[best], margin: second === -Infinity ? Infinity : bs - second };
  }

  /**
   * Feed a whole text line by line, recording every change of leader: transitions = [[lineNo (1-based), index|-1], ...].
   * opts.modes = ["sum","z"] additionally records the transitions of each combination in transitionsByMode.
   */
  function trace(text, { modes = [combine] } = {}) {
    const lines = splitLines(text);
    const state = begin();
    const byMode = Object.fromEntries(modes.map((m) => [m, { transitions: [], last: -2 }]));
    for (let i = 0; i < lines.length; i++) {
      feed(state, lines[i]);
      for (const m of modes) {
        const l = leader(state, { mode: m });
        const idx = l ? l.index : -1;
        const e = byMode[m];
        if (idx !== e.last) { e.transitions.push([i + 1, idx]); e.last = idx; }
      }
    }
    const transitionsByMode = Object.fromEntries(modes.map((m) => [m, byMode[m].transitions]));
    return { state, nLines: lines.length, transitions: transitionsByMode[modes[0]], transitionsByMode, final: leader(state, { mode: modes[0] }) };
  }

  /** identify(text) -> { language, margin, lines, evidence } (language null when the text has no non-blank line). */
  function identify(text) {
    const { state, final, nLines } = trace(text);
    return { language: final ? final.language : null, margin: final ? final.margin : null, lines: nLines, evidence: state.evidence };
  }

  return { languages: ids, K, begin, feed, leader, trace, identify, lexicon: lexUnion, statuses: langs.map((l) => l.status), active };
}

/** Load priors/code-identify-blind.json (CodeIdentifyShapePrior@1); null when absent. */
export function loadIdentifyShapePrior(file = new URL("../../priors/code-identify-blind.json", import.meta.url)) {
  try {
    const p = JSON.parse(fs.readFileSync(file, "utf8"));
    return p?.schema === "CodeIdentifyShapePrior@1" ? p : null;
  } catch {
    return null;
  }
}

/** Convenience: identify with the vendored prior; null verdict (typed gap) when the prior is absent. */
export function identifyText(text, { prior = loadIdentifyPrior(), shapePrior = null, combine = "sum" } = {}) {
  if (!prior) return { language: null, gap: "no_identify_prior" };
  return createIdentifier(prior, { shapePrior, combine }).identify(text);
}
