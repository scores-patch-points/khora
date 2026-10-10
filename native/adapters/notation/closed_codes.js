// adapters/notation/closed_codes.js — THE CLOSED-CODE READER (Morse, Braille, ICAO spelling alphabet).
//
// A MEDIUM GRAMMAR LIVES IN AN ADAPTER; THE KERNEL STAYS MEDIUM-BLIND. This module reads TEXT that carries one of
// three table-driven codes and recovers what the text ORDERS (Lovelace: the engine does what it is ordered to
// perform; it originates nothing): which code it is, where its units begin and end, what class each unit is, and
// the plaintext the units spell. It declares no beings and no relations: a closed code has none (the beings live
// in the decoded plaintext, which is the natural-language reader's material). read() says so, typed.
//
// RECEIVED, GIVER-NAMED PRIORS (priors REFUSE or NOMINATE, never admit). Everything this module knows about a
// code comes from priors/notation-closed_codes-*.json, each naming its giver:
//   morse   ITU-R M.1677-1 signal table + ITU timing ratios (giver), character counts from TRAIN
//   braille English Braille / UEB grade-1 cells, indicators, punctuation (giver), cell counts from TRAIN
//   nato    ICAO spelling alphabet words and variants (giver), letter counts from TRAIN
//   lm      TRAIN English letter 4-gram (within words) — the language prior that segments run-on Morse
//   null    TRAIN English token counts — only used to say that a refused stream LOOKS like English (informative)
// A unit absent from a table is a typed gap (`unassigned`), never the nearest guess. The prior files are loaded
// by loadPriors(); a control or a test can inject any other priors (buildPriors(rawPriors)).
//
// CAUSAL (READING-SPEC S2/S3). Every verdict and token is a function of the prefix. listen() returns the whole
// trace (verdict after each token); ear()/read() commit a token when its right edge is seen. A token whose class
// is not yet determined (a Braille '.'/',' inside a number, a two-cell punctuation's first cell) carries
// open:true until the next cell resolves it. Keylog tempo is estimated from runs BEFORE the one being
// classified. Run-on Morse is segmented at the word gap (the word, not the sentence, is the causal unit).
//
// DECLARED / DERIVED PARAMETERS (P4: none is tuned on dev; see eval/notation-competence/closed_codes.mjs header)
//   alpha=beta=0.01 -> A = ln((1-beta)/alpha); nMin=3 tokens; eta=0.05 (in-alphabet invalid-token ceiling);
//   etaForeign=0.01 (out-of-alphabet); beam=64; tempo window=24 runs; variantShare=0.1 (declared: variants are the
//   minority); null models are max-entropy over each system's alphabet; length models geometric with means DERIVED
//   from TRAIN counts; keylog thresholds are geometric midpoints of the giver's timing ratios.
//
// NOT READ (typed, never guessed): Braille grade 2 (contractions) and formatting indicators beyond capitals and
// the numeric/letter indicators; Morse signals outside ITU-R M.1677-1 and accents other than e; semaphore and
// maritime flags (visual channel; in text the flag alphabet IS the spelling alphabet); keylog identification
// beyond its format.
//
// Pure ES module: no network, no model, no clock. Node `fs` is used only by loadRawPriors().

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "closed_codes";
export const SYSTEMS = Object.freeze(["morse", "braille", "nato"]);
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS_DIR = path.resolve(HERE, "../../priors");

const ALPHA = 0.01;
const BETA = 0.01;
export const PARAMS = Object.freeze({
  alpha: ALPHA,
  beta: BETA,
  A: Math.log((1 - BETA) / ALPHA),
  B: Math.log(BETA / (1 - ALPHA)),
  nMin: 3,
  eta: 0.05,
  etaForeign: 0.01,
  beam: 64,
  tempoWindow: 24,
  variantShare: 0.1,
  nonBlankCells: 255,
  morseNullMaxLen: 8,
});

// ── small numeric helpers ────────────────────────────────────────────────
const NEG = -Infinity;
const lse = (a, b) => (a === NEG ? b : b === NEG ? a : Math.max(a, b) + Math.log1p(Math.exp(-Math.abs(a - b))));
const ln = Math.log;

// ── priors ───────────────────────────────────────────────────────────────
export function loadRawPriors({ dir = PRIORS_DIR } = {}) {
  const out = {};
  for (const k of ["morse", "braille", "nato", "lm", "null"]) {
    try { out[k] = JSON.parse(fs.readFileSync(path.join(dir, `notation-closed_codes-${k}.json`), "utf8")); } catch { out[k] = null; }
  }
  return out;
}

const CLASS_RANK = { letter: 0, figure: 1, punctuation: 2, signal: 3 };

function buildMorse(raw) {
  if (!raw) return null;
  const bySignal = new Map();
  const charSignal = new Map();
  for (const s of raw.signals) {
    if (!bySignal.has(s.signal)) bySignal.set(s.signal, []);
    bySignal.get(s.signal).push(s);
    if (!charSignal.has(s.char)) charSignal.set(s.char, s.signal);
  }
  const canon = new Map();
  for (const [sig, list] of bySignal) {
    const sorted = [...list].sort((a, b) => (CLASS_RANK[a.class] ?? 9) - (CLASS_RANK[b.class] ?? 9));
    canon.set(sig, { char: sorted[0].char, class: sorted[0].class, candidates: sorted.map((x) => x.char), name: sorted[0].name || null });
  }
  const counts = raw.counts?.char_counts || {};
  let total = 0;
  for (const s of canon.keys()) for (const e of bySignal.get(s)) if (e.alias_of == null) total += counts[e.char] || 0;
  const K = canon.size;
  const pSig = new Map();
  for (const s of canon.keys()) {
    let c = 0;
    for (const e of bySignal.get(s)) if (e.alias_of == null) c += counts[e.char] || 0;
    pSig.set(s, (c + 1) / (total + K));
  }
  let maxLen = 0;
  for (const s of canon.keys()) maxLen = Math.max(maxLen, s.length);
  // letters usable by the run-on decoder: signals whose canonical char is a single LM-alphabet char
  const runChars = new Map();
  for (const [sig, list] of bySignal) {
    for (const e of list) {
      if (e.alias_of != null || e.class === "signal" || e.char.length !== 1 || e.char === "é") continue;
      if (!runChars.has(sig)) runChars.set(sig, []);
      runChars.get(sig).push(e.char);
    }
  }
  let symPerChar = 0, ctot = 0;
  for (const [sig, list] of bySignal) for (const e of list) {
    if (e.alias_of != null || e.char.length !== 1) continue;
    const c = counts[e.char] || 0; symPerChar += c * sig.length; ctot += c;
  }
  symPerChar = ctot ? symPerChar / ctot : 2.6;
  return { raw, bySignal, canon, charSignal, pSig, maxLen, runChars, ratios: raw.timing_ratios, symPerChar };
}

function buildBraille(raw) {
  if (!raw) return null;
  const cell = new Map(); // cell -> {role, value}
  for (const [k, v] of Object.entries(raw.letters)) cell.set(v, { role: "letter", value: k });
  const digitOf = new Map();
  for (const [k, v] of Object.entries(raw.digits)) digitOf.set(v, k);
  const punct1 = new Map();
  for (const [ch, cells] of Object.entries(raw.punct_cells)) if (cells.length === 1) punct1.set(cells[0], ch);
  const ind = raw.indicators;
  const multi = new Map(); // first cell -> Map(second -> char)
  const addMulti = (seq, ch) => { if (!multi.has(seq[0])) multi.set(seq[0], new Map()); multi.get(seq[0]).set(seq[1], ch); };
  addMulti(raw.punct_multi_cell["("], "(");
  addMulti(raw.punct_multi_cell[")"], ")");
  addMulti(raw.punct_multi_cell.quote_open, '"');
  addMulti(raw.punct_multi_cell.quote_close, '"');
  const inventory = new Set([...cell.keys(), ...digitOf.keys(), ...punct1.keys(), ind.numeric, ind.capital, ind.grade1_letter, ...multi.keys()]);
  for (const m of multi.values()) for (const k of m.keys()) inventory.add(k);
  const counts = raw.counts?.cell_counts || {};
  let total = 0;
  for (const c of inventory) total += counts[c] || 0;
  const K = inventory.size;
  const p = new Map();
  for (const c of inventory) p.set(c, ((counts[c] || 0) + 1) / (total + K));
  return { raw, cell, digitOf, punct1, ind, multi, inventory, p, spaceCells: new Set(raw.space_cells) };
}

function buildNato(raw, variantShare) {
  if (!raw) return null;
  const counts = raw.counts?.char_counts || {};
  const K = 36;
  let total = 0;
  for (const c of Object.keys(counts)) total += counts[c];
  const pChar = (c) => ((counts[c] || 0) + 1) / (total + K);
  const lex = new Map(); // lowercase word w/o hyphen -> {char, class, p, official}
  const add = (w, ch, cls, share) => {
    const key = w.toLowerCase().replace(/-/g, "");
    const prev = lex.get(key);
    const p = pChar(ch) * share;
    if (prev) { prev.p += p; return; }
    lex.set(key, { char: ch, class: cls, p, word: w });
  };
  for (const [c, w] of Object.entries(raw.letters)) {
    const vs = raw.letter_variants?.[c] || [];
    add(w, c, "letter", vs.length ? 1 - variantShare : 1);
    for (const v of vs) add(v, c, "letter", variantShare / vs.length);
  }
  for (const [c, w] of Object.entries(raw.digits)) {
    const vs = [...(raw.digit_variants?.[c] || [])];
    const itu = raw.digits_itu_imo?.[c];
    if (itu) vs.push(itu);
    add(w, c, "digit", vs.length ? 1 - variantShare : 1);
    for (const v of vs) add(v, c, "digit", variantShare / vs.length);
  }
  let maxWord = 0;
  for (const k of lex.keys()) maxWord = Math.max(maxWord, k.length);
  return { raw, lex, maxWord };
}

function buildLM(raw) {
  if (!raw) return null;
  const ctx = new Map();
  for (const [k, v] of Object.entries(raw.contexts)) {
    let C = 0, T = 0;
    for (const n of Object.values(v)) { C += n; T += 1; }
    ctx.set(k, { next: v, C, T });
  }
  const V = raw.alphabet.length + 1;
  const cache = new Map();
  function prob(h, ch, maxHist) {
    const hh = h.length > maxHist ? h.slice(h.length - maxHist) : h;
    const key = hh + "\u0000" + ch;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    let r;
    if (hh.length === 0 && !ctx.has("")) r = 1 / V;
    else {
      const lower = hh.length === 0 ? 1 / V : prob(hh.slice(1), ch, maxHist);
      const e = ctx.get(hh);
      r = e ? ((e.next[ch] || 0) + e.T * lower) / (e.C + e.T) : lower;
    }
    cache.set(key, r);
    return r;
  }
  return { raw, order: raw.order, alphabet: new Set(raw.alphabet), prob };
}

/** build the indexed priors object from raw JSON (injectable: a control passes deranged raw priors). */
export function buildPriors(raw) {
  const gaps = [];
  for (const k of ["morse", "braille", "nato", "lm"]) if (!raw[k]) gaps.push({ reason: `no_prior:${k}`, count: null });
  const morse = buildMorse(raw.morse);
  const lm = buildLM(raw.lm);
  const braille = buildBraille(raw.braille);
  const nato = buildNato(raw.nato, PARAMS.variantShare);
  // derived length models (geometric means from TRAIN counts)
  let mChars = 4.5, mAlpha = 4.5, derived = "defaults (null prior absent)";
  if (raw.null) {
    let n = 0, sumLen = 0, sumAlpha = 0, nAlpha = 0;
    for (const [t, c] of Object.entries(raw.null.tokens)) { n += c; sumLen += t.length * c; const a = t.replace(/[^a-z]/g, "").length; if (a) { sumAlpha += a * c; nAlpha += c; } }
    if (n) { mChars = sumLen / n; derived = "TRAIN null tokens"; }
    if (nAlpha) mAlpha = sumAlpha / nAlpha;
  }
  const mMorse = morse ? Math.max(2, mChars * morse.symPerChar) : 12;
  const naturalSet = raw.null ? new Set(Object.keys(raw.null.tokens)) : new Set();
  return { raw, morse, braille, nato, lm, gaps, lengthModels: { mChars, mAlpha, mMorse, derived }, naturalSet };
}

let CACHE = null;
export function loadPriors(opts = {}) {
  if (opts.dir || opts.fresh) return buildPriors(loadRawPriors(opts));
  if (!CACHE) CACHE = buildPriors(loadRawPriors());
  return CACHE;
}

// ── tokenizing ───────────────────────────────────────────────────────────
const isBraille = (c) => c >= "⠁" && c <= "⣿";
const isSpaceCh = (c) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "⠀" || c === " " || c === "　";

/** whitespace-delimited tokens; each Braille cell is a token of its own. Offsets are UTF-16 indices. */
export function tokenize(text) {
  const toks = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (isSpaceCh(c)) { i++; continue; }
    if (isBraille(c)) { toks.push({ start: i, end: i + 1, text: c }); i++; continue; }
    let j = i;
    while (j < text.length && !isSpaceCh(text[j]) && !isBraille(text[j])) j++;
    toks.push({ start: i, end: j, text: text.slice(i, j) });
    i = j;
  }
  return toks;
}

const DOTS = new Set([".", "·", "•", "∙"]);
const DASHES = new Set(["-", "−", "–", "—", "‒"]);
/** token -> canonical dot/dash string, or null when it is not entirely dots and dashes */
export function dotdash(tok) {
  let s = "";
  for (const c of tok) { if (DOTS.has(c)) s += "."; else if (DASHES.has(c)) s += "-"; else return null; }
  return s.length ? s : null;
}

// ── run-on likelihoods ───────────────────────────────────────────────────
/** ln of the forward probability that a TRAIN-English word (letter 4-gram, end-of-word) has this Morse run. */
export function morseRunLogProb(sig, M, LM, { lmOrder } = {}) {
  const maxHist = Math.max(0, (lmOrder || LM.order) - 1);
  const padN = Math.max(0, LM.order - 1);
  const L = sig.length;
  const at = Array.from({ length: L + 1 }, () => new Map());
  at[0].set("^".repeat(padN), 0);
  for (let i = 0; i < L; i++) {
    for (const [h, lp] of at[i]) {
      for (let len = 1; len <= M.maxLen && i + len <= L; len++) {
        const chars = M.runChars.get(sig.slice(i, i + len));
        if (!chars) continue;
        for (const ch of chars) {
          if (!LM.alphabet.has(ch)) continue;
          const nlp = lp + ln(LM.prob(h, ch, maxHist));
          const nh = (h + ch).slice(-Math.max(padN, 1));
          const m = at[i + len];
          m.set(nh, m.has(nh) ? lse(m.get(nh), nlp) : nlp);
        }
      }
    }
  }
  let tot = NEG;
  for (const [h, lp] of at[L]) tot = lse(tot, lp + ln(LM.prob(h, "$", maxHist)));
  return tot;
}

/** ln of the forward probability that a run of letters is a concatenation of lexicon words. */
export function natoRunLogProb(tok, N) {
  const w = tok.toLowerCase().replace(/-/g, "");
  if (!/^[a-z]+$/.test(w)) return NEG;
  const L = w.length;
  const f = new Array(L + 1).fill(NEG);
  f[0] = 0;
  for (let i = 0; i < L; i++) {
    if (f[i] === NEG) continue;
    for (let len = 1; len <= N.maxWord && i + len <= L; len++) {
      const e = N.lex.get(w.slice(i, i + len));
      if (e) f[i + len] = lse(f[i + len], f[i] + ln(e.p));
    }
  }
  return f[L];
}

// ── identification (Wald SPRT over received priors) ───────────────────────
function geomLogLen(L, mean) { const q = 1 - 1 / Math.max(1.0001, mean); return ln(1 - q) + (L - 1) * ln(q); }

/** per-token log-likelihood ratio contributions (null = neutral for that system) */
export function tokenEvidence(tok, P, ab = {}) {
  const prm = PARAMS;
  const lnEta = ln(prm.eta), lnEtaF = ln(prm.etaForeign);
  const out = { morseSp: 0, morseRun: 0, braille: 0, nato: 0 };
  const t = tok.text;
  // Morse
  if (P.morse && P.lm) {
    if (t === "/") { out.morseSp = null; out.morseRun = null; }
    else {
      const dd = dotdash(t);
      if (dd === null) { out.morseSp = lnEtaF; out.morseRun = lnEtaF; }
      else {
        const L = dd.length;
        if (L <= prm.morseNullMaxLen) {
          const p = P.morse.pSig.get(dd);
          const u = 1 / (prm.morseNullMaxLen * 2 ** L);
          out.morseSp = p ? ln((1 - prm.eta) * p / u + prm.eta) : lnEta;
        } else out.morseSp = lnEtaF;
        const lp = morseRunLogProb(dd, P.morse, P.lm, { lmOrder: ab.lmOrder });
        if (lp === NEG) out.morseRun = lnEta;
        else {
          const lu = geomLogLen(L, P.lengthModels.mMorse) - L * ln(2);
          out.morseRun = ln((1 - prm.eta) * Math.exp(lp - lu) + prm.eta);
        }
      }
    }
  } else { out.morseSp = null; out.morseRun = null; }
  // Braille
  if (P.braille) {
    if (t === "/") out.braille = lnEtaF;
    else if (t.length === 1 && isBraille(t)) {
      const p = P.braille.p.get(t);
      out.braille = p ? ln((1 - prm.eta) * p * prm.nonBlankCells + prm.eta) : lnEta;
    } else out.braille = lnEtaF;
  } else out.braille = null;
  // NATO
  if (P.nato) {
    if (t === "/") out.nato = null;
    else if (/^[A-Za-z-]+$/.test(t)) {
      const lp = natoRunLogProb(t, P.nato);
      if (lp === NEG) out.nato = lnEta;
      else {
        const L = t.replace(/-/g, "").length;
        const lu = geomLogLen(L, P.lengthModels.mAlpha) - L * ln(26);
        out.nato = ln((1 - prm.eta) * Math.exp(lp - lu) + prm.eta);
      }
    } else out.nato = lnEtaF;
  } else out.nato = null;
  return out;
}

const KEYLOG_TOK = /^[+-]\d{1,7}$/;
/** the keylog FORMAT gate. When `text` is given and does not end in whitespace its last token may be cut mid-run (a prefix
 *  of a stream is a normal input), so that token is not held against the format. */
export function looksKeylog(tokens, text = null) {
  let toks = tokens;
  if (text !== null && toks.length && !/\s$/.test(text)) toks = toks.slice(0, -1);
  if (toks.length < PARAMS.nMin) return false;
  let prev = null;
  for (const t of toks) {
    if (!KEYLOG_TOK.test(t.text)) return false;
    if (prev !== null && prev === t.text[0]) return false;
    prev = t.text[0];
  }
  return true;
}

/**
 * listen(text) — sequential identification. Returns the verdict at EVERY token (trace), so a caller can ask what
 * the reader said at the k-th token without the reader having seen token k+1.
 * verdict: 'morse' | 'braille' | 'nato' | 'none' | null (unheard: evidence neither accepts nor rejects)
 */
export function listen(text, { priors, ablate = {}, maxTokens = Infinity } = {}) {
  const P = priors || loadPriors();
  const prm = PARAMS;
  const tokens = tokenize(text).slice(0, maxTokens);
  const trace = [];
  let Ssp = 0, Srun = 0, Sb = 0, Sn = 0, n = 0;
  let first = null;
  let form = null;
  if (looksKeylog(tokens, text)) {
    return { verdict: "morse", form: "keylog", by: "format", tokens: tokens.length, trace: [], llr: null, first: tokens.length ? prm.nMin : null, natural: null };
  }
  let nNatural = 0;
  for (const tok of tokens) {
    const e = tokenEvidence(tok, P, ablate);
    if (P.naturalSet.has(tok.text.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))) nNatural++;
    if (tok.text === "/" ) { trace.push({ n, verdict: trace.length ? trace[trace.length - 1].verdict : null }); continue; }
    n++;
    if (e.morseSp !== null) { Ssp += e.morseSp; Srun += e.morseRun; }
    if (e.braille !== null) Sb += e.braille;
    if (e.nato !== null) Sn += e.nato;
    const Sm = Math.max(Ssp, Srun);
    const L = { morse: P.morse && P.lm ? Sm : NEG, braille: P.braille ? Sb : NEG, nato: P.nato ? Sn : NEG };
    let verdict = null;
    if (n >= prm.nMin) {
      let best = null, bv = NEG, second = NEG;
      for (const s of SYSTEMS) { if (L[s] > bv) { second = bv; bv = L[s]; best = s; } else if (L[s] > second) second = L[s]; }
      if (best && bv >= prm.A && bv - second > 1e-9) verdict = best;
      else if (SYSTEMS.every((s) => L[s] <= prm.B)) verdict = "none";
    }
    if (verdict !== null && first === null) first = n;
    trace.push({ n, verdict, llr: { morse: Sm, braille: Sb, nato: Sn } });
    form = Srun > Ssp ? "unspaced" : "spaced";
  }
  const last = trace.length ? trace[trace.length - 1] : { n: 0, verdict: null, llr: null };
  return { verdict: last.verdict, form: last.verdict === "morse" ? form : null, by: "llr", tokens: n, trace, llr: last.llr, first, natural: { covered: nNatural, of: tokens.length } };
}

// ── hearing: Morse ───────────────────────────────────────────────────────
function lowerMedian(arr) { const s = [...arr].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; }

function morseUnit(sig, M) {
  const c = M.canon.get(sig);
  return c ? { value: c.char, class: c.class, candidates: c.candidates, name: c.name } : null;
}

/** word-final beam decode of a run-on Morse word under the TRAIN letter n-gram. modes: beam | greedy */
export function decodeRun(sig, M, LM, { mode = "beam", lmOrder, beam = PARAMS.beam } = {}) {
  const L = sig.length;
  if (mode === "greedy") {
    const out = []; let i = 0; const unk = [];
    while (i < L) {
      let took = 0;
      for (let len = Math.min(4, L - i); len >= 1; len--) {
        const cs = M.runChars.get(sig.slice(i, i + len));
        if (cs && /[A-Z]/.test(cs[0])) { out.push({ start: i, end: i + len, value: cs[0] }); took = len; break; }
      }
      if (!took) { out.push({ start: i, end: i + 1, value: "?" }); took = 1; }
      i += took;
    }
    return { letters: out, logp: null };
  }
  const maxHist = Math.max(0, (lmOrder || LM.order) - 1);
  const padN = Math.max(0, LM.order - 1);
  const at = Array.from({ length: L + 1 }, () => new Map());
  at[0].set("^".repeat(padN), { lp: 0, path: [] });
  for (let i = 0; i < L; i++) {
    let states = [...at[i].entries()];
    if (states.length > beam) { states.sort((a, b) => b[1].lp - a[1].lp); states = states.slice(0, beam); }
    for (const [h, st] of states) {
      for (let len = 1; len <= M.maxLen && i + len <= L; len++) {
        const chars = M.runChars.get(sig.slice(i, i + len));
        if (!chars) continue;
        for (const ch of chars) {
          if (!LM.alphabet.has(ch)) continue;
          const lp = st.lp + ln(LM.prob(h, ch, maxHist));
          const nh = (h + ch).slice(-Math.max(padN, 1));
          const cur = at[i + len].get(nh);
          if (!cur || lp > cur.lp) at[i + len].set(nh, { lp, path: [...st.path, { start: i, end: i + len, value: ch }] });
        }
      }
    }
  }
  let best = null;
  for (const [h, st] of at[L]) {
    const lp = st.lp + ln(LM.prob(h, "$", maxHist));
    if (!best || lp > best.lp) best = { lp, path: st.path };
  }
  if (!best) return { letters: [{ start: 0, end: L, value: "?" }], logp: null };
  return { letters: best.path, logp: best.lp };
}

function morseHear(text, P, ab = {}) {
  const M = P.morse, LM = P.lm;
  const gaps = [];
  const tokens = [];
  const units = [];
  const raw = tokenize(text);
  const keylog = looksKeylog(raw, text);
  const prm = PARAMS;
  if (keylog) return keylogHear(text, raw, P, ab);
  // fewer than nMin tokens that all look like the start of a keylog: the FORM is not yet determined, so nothing is committed
  if (raw.length > 0 && raw.length < prm.nMin + 1 && raw.every((t) => /^[+-]\d*$/.test(t.text))) {
    const toks = raw.map((t) => ({ start: t.start, end: t.end, text: t.text, kind: "run", class: "unassigned", value: "?", open: true, gap: "form_undetermined" }));
    return { form: null, tokens: toks, units: [], gaps: [{ at: raw[0].start, reason: "form_undetermined" }] };
  }
  let Ssp = 0, Srun = 0;
  // word gaps: a '/' token, or a whitespace run of >= 3 spaces between two tokens
  for (let k = 0; k < raw.length; k++) {
    const tk = raw[k];
    if (k > 0) {
      const between = text.slice(raw[k - 1].end, tk.start);
      if (/^[ \t⠀]{3,}$/.test(between) || /^[ \t]*\n+[ \t]*$/.test(between)) tokens.push({ start: raw[k - 1].end, end: tk.start, text: between, kind: "wordgap", class: "wordgap", value: " ", open: false });
    }
    if (tk.text === "/") { tokens.push({ start: tk.start, end: tk.end, text: "/", kind: "wordgap", class: "wordgap", value: " ", open: false }); continue; }
    const e = tokenEvidence(tk, P, ab);
    if (e.morseSp !== null) { Ssp += e.morseSp; Srun += e.morseRun; }
    const dd = dotdash(tk.text);
    const formNow = ab.form || (Srun > Ssp ? "unspaced" : "spaced");
    if (dd === null) {
      const t = { start: tk.start, end: tk.end, text: tk.text, kind: "signal", class: "unassigned", value: "?", open: false, gap: "foreign_to_alphabet" };
      tokens.push(t); units.push(t); gaps.push({ at: tk.start, reason: "foreign_to_alphabet" }); continue;
    }
    if (formNow === "spaced") {
      const u = morseUnit(dd, M);
      const t = u
        ? { start: tk.start, end: tk.end, text: tk.text, kind: "signal", class: u.class, value: u.value, candidates: u.candidates, open: false }
        : { start: tk.start, end: tk.end, text: tk.text, kind: "signal", class: "unassigned", value: "?", open: false, gap: "signal_not_in_giver" };
      if (!u) gaps.push({ at: tk.start, reason: "signal_not_in_giver" });
      tokens.push(t); units.push(t);
    } else {
      const r = decodeRun(dd, M, LM, { mode: ab.unspaced === "greedy" ? "greedy" : "beam", lmOrder: ab.lmOrder });
      const letters = r.letters.map((l) => ({ start: tk.start + l.start, end: tk.start + l.end, value: l.value }));
      const t = { start: tk.start, end: tk.end, text: tk.text, kind: "word_run", class: "word", value: letters.map((l) => l.value).join(""), letters, logp: r.logp, open: false };
      tokens.push(t); units.push(t);
    }
  }
  return { form: ab.form || (Srun > Ssp ? "unspaced" : "spaced"), tokens, units, gaps };
}

/** adaptive keylog hearing. tempo from runs BEFORE the one being classified; thresholds from the giver's ratios. */
function keylogHear(text, raw, P, ab = {}) {
  const R = P.morse.ratios;
  const tDD = Math.sqrt(R.dash / R.dot);            // dit | dah
  const tG1 = Math.sqrt(R.letter_gap / R.intra_letter_gap);  // intra | letter
  const tG2 = Math.sqrt(R.letter_gap * R.word_gap); // letter | word
  const prm = PARAMS;
  const tokens = [], units = [], gaps = [];
  const prev = [];
  let cur = []; // elements of the letter being built
  let curStart = null;
  const flush = (endIdx, why) => {
    if (!cur.length) return;
    const sig = cur.map((e) => (e.element === "dit" ? "." : "-")).join("");
    const u = morseUnit(sig, P.morse);
    const unit = u
      ? { start: cur[0].start, end: cur[cur.length - 1].end, text: sig, kind: "signal", class: u.class, value: u.value, candidates: u.candidates, open: false }
      : { start: cur[0].start, end: cur[cur.length - 1].end, text: sig, kind: "signal", class: "unassigned", value: "?", open: false, gap: "signal_not_in_giver" };
    if (!u) gaps.push({ at: unit.start, reason: "signal_not_in_giver" });
    units.push(unit); cur = [];
  };
  for (let i = 0; i < raw.length; i++) {
    const tk = raw[i];
    const m = /^([+-])(\d+)$/.exec(tk.text);
    if (!m) { tokens.push({ start: tk.start, end: tk.end, text: tk.text, kind: "run", class: "unassigned", open: false, gap: "not_a_run" }); continue; }
    const sign = m[1], ms = Number(m[2]);
    let T;
    if (ab.oracleT) T = ab.oracleT;
    else if (typeof ab.tempo === "number") T = ab.tempo;
    else if (i === 0) T = ms;
    else if (i < 3) T = Math.min(...prev);
    else T = lowerMedian(prev.slice(-prm.tempoWindow));
    const r = ms / Math.max(1, T);
    const t = { start: tk.start, end: tk.end, text: tk.text, kind: "run", sign, ms, T, ratio: r, open: false };
    const g1 = ab.thresholds ? ab.thresholds.g1 : tG1, g2 = ab.thresholds ? ab.thresholds.g2 : tG2, dd = ab.thresholds ? ab.thresholds.dd : tDD;
    if (sign === "+") {
      t.element = r >= dd ? "dah" : "dit";
      t.class = t.element;
      cur.push(t);
    } else {
      t.gap = r < g1 ? "intra" : r < g2 ? "letter" : "word";
      t.class = t.gap;
      if (t.gap !== "intra") flush(i, t.gap);
      if (t.gap === "word") units.push({ start: tk.start, end: tk.end, text: tk.text, kind: "wordgap", class: "wordgap", value: " ", open: false });
    }
    tokens.push(t);
    prev.push(ms);
  }
  flush(raw.length, "end");
  return { form: "keylog", tokens, units, gaps };
}

// ── hearing: Braille ─────────────────────────────────────────────────────
function brailleHear(text, P, ab = {}) {
  const B = P.braille;
  const ind = B.ind;
  const tokens = [], gaps = [];
  let numeric = false, numericPending = false, capPending = 0, capWord = false, g1 = false, bundle = false;
  let openIdx = null, openCell = null;
  let lastWasDigitLike = false;
  const push = (i, cls, value, lexemeStart, extra = {}) => { const t = { start: i, end: i + 1, text: text[i], kind: "cell", class: cls, value, lexemeStart, open: false, ...extra }; tokens.push(t); return t; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (!(isBraille(c) || c === "⠀" || c === " ")) {
      if (isSpaceCh(c)) { numeric = false; numericPending = false; capPending = 0; capWord = false; g1 = false; bundle = false; continue; }
      push(i, "unassigned", "?", true, { gap: "not_a_cell" }); gaps.push({ at: i, reason: "not_a_cell" }); numeric = false; continue;
    }
    if (c === "⠀" || c === " ") {
      if (openIdx !== null) { tokens[openIdx].class = "unassigned"; tokens[openIdx].open = false; tokens[openIdx].gap = "incomplete_composition"; gaps.push({ at: tokens[openIdx].start, reason: "incomplete_composition" }); openIdx = null; }
      push(i, "space", " ", true);
      numeric = false; numericPending = false; capPending = 0; capWord = false; g1 = false; bundle = false;
      continue;
    }
    // resolve an open two-cell composition first
    if (openIdx !== null) {
      const second = B.multi.get(openCell)?.get(c);
      if (second !== undefined) {
        tokens[openIdx].open = false; tokens[openIdx].value = "";
        push(i, "punctuation", second, false);
        openIdx = null; openCell = null; bundle = false; continue;
      }
      tokens[openIdx].class = "unassigned"; tokens[openIdx].open = false; tokens[openIdx].gap = "incomplete_composition";
      gaps.push({ at: tokens[openIdx].start, reason: "incomplete_composition" }); openIdx = null; openCell = null;
    }
    if (c === ind.numeric) { push(i, "numeric_indicator", "", true); numericPending = !ab.contextFree; numeric = false; bundle = true; continue; }
    if (c === ind.capital) {
      capPending = capPending === 0 ? 1 : 2;
      push(i, "capital_indicator", "", !bundle); bundle = true; continue;
    }
    if (c === ind.grade1_letter) { push(i, "grade1_indicator", "", true); g1 = true; bundle = true; continue; }
    const letter = B.cell.get(c);
    if (letter) {
      const L = letter.value;
      if ((numericPending || numeric) && !ab.contextFree && "abcdefghij".includes(L) && !g1) {
        const d = B.raw.digits;
        let dv = null;
        for (const [k, v] of Object.entries(d)) if (v === c) dv = k;
        push(i, "digit", dv, !(numericPending), {});
        numeric = true; numericPending = false; bundle = false; capPending = 0; continue;
      }
      if (numericPending && !g1) gaps.push({ at: i, reason: "numeric_indicator_without_digit" });
      numeric = false; numericPending = false;
      let v = L;
      if (capPending === 2) { capWord = true; }
      if (capPending > 0 || capWord) v = L.toUpperCase();
      push(i, "letter", v, !bundle);
      capPending = 0; g1 = false; bundle = false; continue;
    }
    if (B.multi.has(c)) { const t = push(i, "punctuation", "", true, { open: true }); openIdx = tokens.length - 1; openCell = c; numeric = false; numericPending = false; bundle = false; continue; }
    const p1 = B.punct1.get(c);
    if (p1 !== undefined) {
      const prevTok = tokens[tokens.length - 1];
      // a '.' or ',' directly after a digit keeps numeric mode ONLY if a digit-letter cell follows: the next cell decides
      // (the letter branch continues it, every other branch clears it), so the punctuation token itself needs no revision
      const keep = numeric && (p1 === "." || p1 === ",") && prevTok && prevTok.class === "digit";
      push(i, "punctuation", p1, true);
      if (!keep) numeric = false;
      numericPending = false; capPending = 0; g1 = false; bundle = false;
      continue;
    }
    // a digit cell that is not a letter cell cannot occur (digits are letter cells a-j); everything else is outside the prior
    push(i, "unassigned", "?", true, { gap: "cell_not_in_prior" });
    gaps.push({ at: i, reason: "cell_not_in_prior" });
    numeric = false; numericPending = false; capPending = 0; g1 = false; bundle = false;
  }
  if (openIdx !== null) tokens[openIdx].open = true;
  const units = tokens.filter((t) => ["letter", "digit", "punctuation", "space", "unassigned"].includes(t.class) && (t.value !== "" || t.class === "unassigned"));
  return { form: "cells", tokens, units, gaps };
}

// ── hearing: NATO ────────────────────────────────────────────────────────
function natoParse(word, N) {
  const w = word.toLowerCase();
  const key = w.replace(/-/g, "");
  const L = key.length;
  // map back to original offsets (hyphens are kept inside a word span)
  const offs = [];
  for (let i = 0; i < w.length; i++) if (w[i] !== "-") offs.push(i);
  const best = new Array(L + 1).fill(NEG); const back = new Array(L + 1).fill(null);
  best[0] = 0;
  for (let i = 0; i < L; i++) {
    if (best[i] === NEG) continue;
    for (let len = 1; len <= N.maxWord && i + len <= L; len++) {
      const e = N.lex.get(key.slice(i, i + len));
      if (!e) continue;
      const s = best[i] + ln(e.p);
      if (s > best[i + len]) { best[i + len] = s; back[i + len] = { from: i, e }; }
    }
    // unknown single char: allowed with a flat penalty so a partial parse is still returned
    const s = best[i] - 12;
    if (s > best[i + 1]) { best[i + 1] = s; back[i + 1] = { from: i, e: null }; }
  }
  const segs = [];
  let j = L;
  while (j > 0) { const b = back[j]; segs.push({ from: b.from, to: j, e: b.e }); j = b.from; }
  segs.reverse();
  // merge adjacent unknowns
  const merged = [];
  for (const s of segs) {
    const prev = merged[merged.length - 1];
    if (!s.e && prev && !prev.e) prev.to = s.to; else merged.push({ ...s });
  }
  return { merged, offs, key };
}

function natoHear(text, P, ab = {}) {
  const N = P.nato;
  const tokens = [], gaps = [];
  let concat = false;
  const raw = tokenize(text);
  for (const tk of raw) {
    if (tk.text === "/") { tokens.push({ start: tk.start, end: tk.end, text: "/", kind: "wordgap", class: "wordgap", value: " ", open: false }); continue; }
    if (!/^[A-Za-z-]+$/.test(tk.text)) {
      tokens.push({ start: tk.start, end: tk.end, text: tk.text, kind: "word", class: "unassigned", value: "?", open: false, gap: "foreign_to_alphabet" });
      gaps.push({ at: tk.start, reason: "foreign_to_alphabet" }); continue;
    }
    if (ab.chunk) {
      for (let i = 0; i < tk.text.length; i += ab.chunk) tokens.push({ start: tk.start + i, end: tk.start + Math.min(tk.text.length, i + ab.chunk), text: tk.text.slice(i, i + ab.chunk), kind: "word", class: "unassigned", value: "?", open: false });
      continue;
    }
    const { merged, offs } = natoParse(tk.text, N);
    if (merged.some((s) => !s.e)) {
      // REFUSE: a token that does not parse fully into lexicon words is ONE unassigned token; no boundaries are invented inside it
      tokens.push({ start: tk.start, end: tk.end, text: tk.text, kind: "word", class: "unassigned", value: "?", open: false, gap: "word_not_in_lexicon" });
      gaps.push({ at: tk.start, reason: "word_not_in_lexicon" });
      continue;
    }
    if (merged.length > 1) concat = true;
    for (const s of merged) {
      const a = tk.start + offs[s.from], b = tk.start + offs[s.to - 1] + 1;
      tokens.push({ start: a, end: b, text: text.slice(a, b), kind: "word", class: s.e.class, value: s.e.char, open: false });
    }
  }
  const units = tokens.filter((t) => t.kind === "word");
  return { form: concat ? "concatenated" : "spaced", tokens, units, gaps };
}

// ── public: ear / read ───────────────────────────────────────────────────
function decodedText(e) {
  if (e.system === "braille") return e.tokens.map((t) => t.value ?? "").join("");
  const src = e.form === "keylog" ? e.units : e.tokens;
  let out = "";
  for (const t of src) {
    if (t.class === "wordgap") { if (!out.endsWith(" ")) out += " "; continue; }
    out += t.value ?? "?";
  }
  return out.trim();
}

/**
 * ear(text, {priors, system}) -> { system, form, tokens, units, gaps, verdict }
 * With no `system`, the system is the causal verdict of listen() over the whole text (a null verdict is a typed gap:
 * nothing is heard). `tokens` are lexical tokens with class; `units` are the decoded symbols.
 */
export function ear(text, opts = {}) {
  const P = opts.priors || loadPriors();
  const ab = opts.ablate || {};
  let system = opts.system || null;
  let verdict = null;
  if (!system) {
    verdict = listen(text, { priors: P, ablate: ab });
    system = SYSTEMS.includes(verdict.verdict) ? verdict.verdict : null;
    if (!system) return { system: null, form: null, tokens: [], units: [], gaps: [{ reason: verdict.verdict === "none" ? "not_a_closed_code" : "unheard", count: 1 }], verdict };
  }
  let r;
  if (system === "morse") { if (!P.morse || !P.lm) return { system, form: null, tokens: [], units: [], gaps: [{ reason: "no_prior:morse", count: 1 }], verdict }; r = morseHear(text, P, ab); }
  else if (system === "braille") { if (!P.braille) return { system, form: null, tokens: [], units: [], gaps: [{ reason: "no_prior:braille", count: 1 }], verdict }; r = brailleHear(text, P, ab); }
  else if (system === "nato") { if (!P.nato) return { system, form: null, tokens: [], units: [], gaps: [{ reason: "no_prior:nato", count: 1 }], verdict }; r = natoHear(text, P, ab); }
  else return { system, form: null, tokens: [], units: [], gaps: [{ reason: "unknown_system", count: 1 }], verdict };
  const g = new Map();
  for (const x of r.gaps) g.set(x.reason, (g.get(x.reason) || 0) + 1);
  return { system, form: r.form, tokens: r.tokens, units: r.units, gaps: [...g].map(([reason, count]) => ({ reason, count })), verdict };
}

/**
 * read(text, {priors, system}) -> { beings: [], relations: [], system, form, decoded: {text, words}, tokens, gaps, verdict }
 * beings and relations are EMPTY BY KIND, not by failure: a closed code declares none; `typed` says why, and
 * `handoff` is the decoded plaintext for the natural-language reader (R3/R4 live there).
 */
export function read(text, opts = {}) {
  const e = ear(text, opts);
  const typed = [
    { rung: "r3", applicable: false, reason: "a closed code declares no beings; the beings are the plaintext's (natural-language card)" },
    { rung: "r4", applicable: false, reason: "a closed code declares no relations or claims; decode-then-read is the natural-language card's" },
  ];
  if (!e.system) return { beings: [], relations: [], system: null, form: null, decoded: null, tokens: [], gaps: e.gaps, typed, handoff: null, verdict: e.verdict };
  const out = decodedText(e);
  return {
    beings: [], relations: [], system: e.system, form: e.form,
    decoded: { text: out }, tokens: e.tokens, units: e.units, gaps: e.gaps, typed,
    handoff: { channel: "text", text: out, from: `closed_code:${e.system}` }, verdict: e.verdict,
  };
}
