// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/transfer-data.mjs  (Barker, the transfer: data side)
// Written BEFORE the first run of eval/barker/transfer.mjs. This file is the DATA HALF of the transfer module; the claim,
// the gain rule, the controls and the power checks are pre-registered in the header of eval/barker/transfer.mjs and in
// docs/BARKER.md section 5, and are not repeated here. What THIS file pre-registers is only what it computes:
//
//  1. ANSWER KEYS (never features). GENEALOGY gives, per stem, a lineage (Glottolog top-level family: the independence
//     unit), a branch (the blocking stratum) and a macro-area flag. Giver: the standard Glottolog / WALS classification,
//     typed by the transfer author; NO instrument reads it as a feature (a source scan in the test enforces that the
//     feature builders never import it). Script is DERIVED from the train text (Unicode script shares), not typed.
//  2. STAND-IN PROFILES. eval/barker/profiles.mjs (another workflow, concurrent) owns the SystemProfile@1 contract.
//     Until its profiles are on disk this file builds a LITE profile with the SAME feature ids and (where cheap) the same
//     definitions, from the TRAIN split only, with the same fixed budget N = 16,000 non-PUNCT words, seeds 1..5, halves
//     A and B, union U. The lite builder is a stand-in and is labelled so in every profile (`builder: "transfer-data.mjs
//     lite"`); when real profiles exist, transfer.mjs prefers them. Features NOT implemented here (typed gaps, never
//     imputed as supported): b12, b17, b18, c05, d07, d08, e03-e06, e08, g*, h*, i*.
//  3. DEV ONLY. Every held-out gold file is `dev.conllu`. `devPath` cannot build any other split (throws); this file
//     contains no string that names the other split. (The user's rule: develop and smoke on DEV; never touch TEST.)
//  4. TARGETS read from RECEIVED priors and cards, read-only: priors/role-config-<stem>.json (t01/t02),
//     priors/frame-<stem>.json (donor tables), /private/tmp/claude-501/competence/r<k>-<stem>-dev.json (rung outcomes,
//     the OUTPUT OF THE SYSTEM UNDER TEST: object of study, never gold).
//  5. INTEGRITY (controls built to fail): `buildFrameTable` re-implements scripts/build-frame-prior.mjs; at the received
//     setting it must reproduce the received frame-<stem>.json cells exactly for every stem whose sentence and hapax
//     counts equal the prior's own provenance (the G0 pattern); a mismatch is a typed `source_differs`, and the
//     transfer module reports how many stems were comparable. A zero-comparable result is UNDERPOWERED, not "ok".
//  6. KNOWN TRAP, encoded: stem `kor` pairs with tb/kor-gsd (the treebank the received kor priors were built from and
//     the dev file's own); tb/kor is the KAIST treebank and is NOT a system here (it is the within-language convention
//     twin, reported only as a gap).
// ═══ END PRE-REGISTRATION ═══

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseConllu, TB_DIR, EVAL_DIR } from "../competence/lib.mjs";
import { createSeededRng, shuffled } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "..", "..");
export const PRIORS_DIR = path.join(NATIVE, "priors");
export const CARDS_DIR = "/private/tmp/claude-501/competence";
export const OUT_DIR = "/private/tmp/claude-501/barker/out";

export const N_BUDGET = 16000;       // BARKER.md 3.5 / profiles.mjs: non-PUNCT words per system (halves of N/2); PROVISIONAL
export const MIN_ARCS = 30;          // cell floor (arcs); PROVISIONAL (BARKER 3.8)
export const SEEDS = [1, 2, 3, 4, 5];
export const CLOSED = new Set(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]);
export const UPOS = ["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X"]; // 17 UD UPOS

// ── paths: DEV ONLY ────────────────────────────────────────────────────────────────────────────────────────────────
/** stems whose train treebank is not tb/<stem>: the treebank the received priors were built from. */
export const TRAIN_STEM = Object.freeze({ kor: "kor-gsd" });
export const trainPath = (stem) => path.join(TB_DIR, TRAIN_STEM[stem] ?? stem, "train.conllu");
const ONLY_SPLIT = "dev";
/** The held-out gold file. Any split other than the development split is refused (the rule is structural, not a convention). */
export function devPath(stem, split = ONLY_SPLIT) {
  if (split !== ONLY_SPLIT) throw new Error(`transfer-data: only the development split may be read (asked for "${split}")`);
  return path.join(EVAL_DIR, stem, `${ONLY_SPLIT}.conllu`);
}

// ── ANSWER KEYS (typed; giver: Glottolog top-level family / standard classification) ─────────────────────────────────
const G = (lineage, branch, macro) => Object.freeze({ lineage, branch, macro });
export const GENEALOGY_GIVER = "Glottolog top-level family and standard branch classification, typed by the transfer author as an ANSWER KEY (never a feature)";
export const GENEALOGY = Object.freeze({
  rus: G("Indo-European", "Slavic", "IE"), ukr: G("Indo-European", "Slavic", "IE"), pol: G("Indo-European", "Slavic", "IE"),
  bul: G("Indo-European", "Slavic", "IE"), ces: G("Indo-European", "Slavic", "IE"), slk: G("Indo-European", "Slavic", "IE"),
  slv: G("Indo-European", "Slavic", "IE"), hrv: G("Indo-European", "Slavic", "IE"), srp: G("Indo-European", "Slavic", "IE"),
  spa: G("Indo-European", "Romance", "IE"), ita: G("Indo-European", "Romance", "IE"), por: G("Indo-European", "Romance", "IE"),
  fra: G("Indo-European", "Romance", "IE"), ron: G("Indo-European", "Romance", "IE"), cat: G("Indo-European", "Romance", "IE"),
  glg: G("Indo-European", "Romance", "IE"),
  eng: G("Indo-European", "Germanic", "IE"), deu: G("Indo-European", "Germanic", "IE"), nld: G("Indo-European", "Germanic", "IE"),
  swe: G("Indo-European", "Germanic", "IE"), dan: G("Indo-European", "Germanic", "IE"), nob: G("Indo-European", "Germanic", "IE"),
  hin: G("Indo-European", "Indo-Iranian", "IE"), urd: G("Indo-European", "Indo-Iranian", "IE"), fas: G("Indo-European", "Indo-Iranian", "IE"),
  ell: G("Indo-European", "Hellenic", "IE"), hye: G("Indo-European", "Armenian", "IE"),
  lav: G("Indo-European", "Baltic", "IE"), lit: G("Indo-European", "Baltic", "IE"),
  arb: G("Afro-Asiatic", "Semitic", "nonIE"), heb: G("Afro-Asiatic", "Semitic", "nonIE"),
  cmn: G("Sino-Tibetan", "Sinitic", "nonIE"), "cmn-hans": G("Sino-Tibetan", "Sinitic", "nonIE"),
  jpn: G("Japonic", "Japonic", "nonIE"), kor: G("Koreanic", "Koreanic", "nonIE"), tur: G("Turkic", "Turkic", "nonIE"),
  fin: G("Uralic", "Finnic", "nonIE"), est: G("Uralic", "Finnic", "nonIE"), hun: G("Uralic", "Ugric", "nonIE"),
  ind: G("Austronesian", "Austronesian", "nonIE"), vie: G("Austroasiatic", "Austroasiatic", "nonIE"),
  kat: G("Kartvelian", "Kartvelian", "nonIE"), tam: G("Dravidian", "Dravidian", "nonIE"), tel: G("Dravidian", "Dravidian", "nonIE"),
  eus: G("Basque", "Basque", "nonIE"),
  afr: G("Indo-European", "Germanic", "IE"), cym: G("Indo-European", "Celtic", "IE"), gle: G("Indo-European", "Celtic", "IE"),
  lzh: G("Sino-Tibetan", "Sinitic", "nonIE"), mlt: G("Afro-Asiatic", "Semitic", "nonIE"), wol: G("Niger-Congo", "Atlantic", "nonIE"),
  grc: G("Indo-European", "Hellenic", "IE"), lat: G("Indo-European", "Italic", "IE"), san: G("Indo-European", "Indo-Iranian", "IE"),
  mar: G("Indo-European", "Indo-Iranian", "IE"), uig: G("Turkic", "Turkic", "nonIE"),
});
export const genealogyOf = (stem) => GENEALOGY[stem] ?? null;

// ── reading a treebank ──────────────────────────────────────────────────────────────────────────────────────────────
const sha256File = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function readTreebank(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { sentences: parseConllu(raw), sha256: createHash("sha256").update(raw).digest("hex"), file };
}

/** Which stems are measurable now: train + dev on disk. A stem without either is a typed gap, never silently dropped. */
export function discoverStems({ tbDir = TB_DIR, evalDir = EVAL_DIR } = {}) {
  const have = [], gaps = [];
  const candidates = new Set();
  const dirs = (root) => (fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []);
  for (const d of dirs(tbDir)) candidates.add(d);
  for (const d of dirs(evalDir)) candidates.add(d);
  for (const stem of [...candidates].sort()) {
    if (stem === "kor-gsd") continue; // reached through the override of `kor`
    if (!GENEALOGY[stem]) { gaps.push({ stem, reason: "no_genealogy_key" }); continue; }
    const tp = trainPath(stem), dp = path.join(evalDir, stem, "dev.conllu");
    if (!fs.existsSync(tp)) { gaps.push({ stem, reason: "no_train" }); continue; }
    if (!fs.existsSync(dp)) { gaps.push({ stem, reason: "no_dev" }); continue; }
    have.push(stem);
  }
  return { stems: have, gaps };
}

// ── script (DERIVED from the train text, never typed) ─────────────────────────────────────────────────────────────────
const SCRIPTS = ["Latin", "Cyrillic", "Greek", "Arabic", "Hebrew", "Devanagari", "Han", "Hiragana", "Katakana", "Hangul", "Georgian", "Armenian", "Tamil", "Telugu", "Thai", "Bengali"];
const SCRIPT_RE = SCRIPTS.map((s) => [s, new RegExp(`\\p{Script=${s}}`, "u")]);
const scriptOfChar = (() => {
  const cache = new Map();
  return (ch) => {
    let v = cache.get(ch);
    if (v !== undefined) return v;
    v = null;
    if (/\p{L}/u.test(ch)) { v = "Other"; for (const [s, re] of SCRIPT_RE) if (re.test(ch)) { v = s; break; } }
    cache.set(ch, v);
    return v;
  };
})();
/** Unicode script share vector over the LETTERS of the train forms. Derived, not typed. */
export function scriptShares(sentences, { maxTokens = 200000 } = {}) {
  const counts = new Map();
  let total = 0, seen = 0;
  outer: for (const s of sentences) for (const t of s.tokens) {
    if (t.upos === "PUNCT") continue;
    for (const ch of t.form) { const sc = scriptOfChar(ch); if (!sc) continue; counts.set(sc, (counts.get(sc) ?? 0) + 1); total++; }
    if (++seen >= maxTokens) break outer;
  }
  const shares = {};
  for (const [k, v] of counts) shares[k] = v / Math.max(1, total);
  let dominant = null, best = -1;
  for (const [k, v] of Object.entries(shares)) if (v > best) { best = v; dominant = k; }
  return { shares, dominant };
}
export function cosineShares(a, b) {
  let d = 0, na = 0, nb = 0;
  for (const [k, v] of Object.entries(a)) { na += v * v; d += v * (b[k] ?? 0); }
  for (const v of Object.values(b)) nb += v * v;
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// LITE PROFILE: the stand-in for profiles.mjs. Same ids, same N, same seeds, TRAIN split only.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const BASE = (d) => { const i = d.indexOf(":"); return i < 0 ? d : d.slice(0, i); };
const CLAUSE = new Set(["ccomp", "xcomp", "advcl", "acl", "csubj"]);
const NOMINALS = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM", "DET"]);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const H = (counts, total) => { let h = 0; for (const c of counts) if (c > 0) { const p = c / total; h -= p * Math.log2(p); } return h; };
const hasFeat = (feats, key) => feats !== "_" && feats.startsWith(`${key}=`) || feats.includes(`|${key}=`);

/** sentences → words (non-PUNCT count) */
export const wordsIn = (sents) => { let w = 0; for (const s of sents) for (const t of s.tokens) if (t.upos !== "PUNCT") w++; return w; };

/** Fill half A to >= N/2 words, then half B to >= N/2, from a seeded shuffle of sentences. null when the file is short. */
export function sampleHalves(sents, N, seed, system) {
  const rng = createSeededRng({ seed, system, purpose: "sample" });
  const order = shuffled(sents.map((_, i) => i), rng);
  const half = N / 2;
  const A = [], B = [];
  let wa = 0, wb = 0, k = 0;
  while (k < order.length && wa < half) { const s = sents[order[k++]]; A.push(s); wa += s.tokens.reduce((a, t) => a + (t.upos !== "PUNCT" ? 1 : 0), 0); }
  while (k < order.length && wb < half) { const s = sents[order[k++]]; B.push(s); wb += s.tokens.reduce((a, t) => a + (t.upos !== "PUNCT" ? 1 : 0), 0); }
  if (wa < half || wb < half) return null;
  return { A, B, U: A.concat(B) };
}

// order-2 Witten-Bell character model, integer-keyed ---------------------------------------------------------------
function wbSurprisals(trainSeqs, testSeqs, V) {
  const c1 = new Map(), n1p = new Map(); // unigram counts, distinct types
  const c2 = new Map(), c2ctx = new Map(), n2ctx = new Map(); // bigram (b,c): count; context b: count, distinct followers
  const c3 = new Map(), c3ctx = new Map(), n3ctx = new Map(); // trigram (a,b,c); context (a,b)
  let tot1 = 0, types1 = 0;
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const seq of trainSeqs) {
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i];
      if (!c1.has(c)) types1++;
      bump(c1, c); tot1++;
      if (i >= 1) {
        const b = seq[i - 1], k2 = b * V + c;
        if (!c2.has(k2)) bump(n2ctx, b);
        bump(c2, k2); bump(c2ctx, b);
      }
      if (i >= 2) {
        const a = seq[i - 2], b = seq[i - 1], ctx = a * V + b, k3 = ctx * V + c;
        if (!c3.has(k3)) bump(n3ctx, ctx);
        bump(c3, k3); bump(c3ctx, ctx);
      }
    }
  }
  const floor = 1 / (V + 1);
  const p1 = (c) => ((c1.get(c) ?? 0) + types1 * floor) / (tot1 + types1 || 1);
  const p2 = (b, c) => { const cc = c2ctx.get(b) ?? 0; if (!cc) return p1(c); const n = n2ctx.get(b); return ((c2.get(b * V + c) ?? 0) + n * p1(c)) / (cc + n); };
  const p3 = (a, b, c) => { const ctx = a * V + b; const cc = c3ctx.get(ctx) ?? 0; if (!cc) return p2(b, c); const n = n3ctx.get(ctx); return ((c3.get(ctx * V + c) ?? 0) + n * p2(b, c)) / (cc + n); };
  const out = [];
  for (const seq of testSeqs) {
    const s = new Float64Array(seq.length).fill(NaN);
    for (let i = 2; i < seq.length; i++) s[i] = -Math.log2(p3(seq[i - 2], seq[i - 1], seq[i]));
    out.push(s);
  }
  return out;
}

/** the character stream of a sentence: the surface units (an MWT range uses its range surface), initial flags */
function unitChars(sent) {
  const skip = new Set();
  const rangeAt = new Map();
  for (const r of sent.ranges ?? []) { rangeAt.set(r.from, r); for (let i = r.from; i <= r.to; i++) skip.add(i); }
  const chars = [], init = [];
  const emit = (form) => { let first = true; for (const ch of form.replace(/\s+/g, "")) { chars.push(ch); init.push(first); first = false; } };
  for (const t of sent.tokens) {
    if (rangeAt.has(t.id)) { emit(rangeAt.get(t.id).form); continue; }
    if (skip.has(t.id)) continue;
    emit(t.form);
  }
  return { chars, init };
}

function boundaryFeatures(sents) {
  const units = sents.map(unitChars);
  const alpha = new Map();
  for (const u of units) for (const ch of u.chars) if (!alpha.has(ch)) alpha.set(ch, alpha.size);
  const V = alpha.size + 1;
  const seqs = units.map((u) => Int32Array.from(u.chars, (ch) => alpha.get(ch)));
  const folds = [[], []];
  seqs.forEach((s, i) => folds[i % 2].push(i));
  let sumInit = 0, nInit = 0, sumOther = 0, nOther = 0;
  for (const f of [0, 1]) {
    const trainIdx = folds[1 - f], testIdx = folds[f];
    const sur = wbSurprisals(trainIdx.map((i) => seqs[i]), testIdx.map((i) => seqs[i]), V);
    testIdx.forEach((si, k) => {
      const s = sur[k], init = units[si].init;
      for (let i = 2; i < s.length; i++) { if (init[i]) { sumInit += s[i]; nInit++; } else { sumOther += s[i]; nOther++; } }
    });
  }
  // unigram entropy and zlib bits/char
  const counts = new Map();
  let total = 0;
  for (const s of seqs) for (const c of s) { counts.set(c, (counts.get(c) ?? 0) + 1); total++; }
  const h0 = H([...counts.values()], total);
  const text = units.map((u) => u.chars.join("")).join("\n");
  const nChars = [...text].length;
  const z = zlib.deflateSync(Buffer.from(text, "utf8"), { level: 9 }).length;
  const allMean = (sumInit + sumOther) / Math.max(1, nInit + nOther);
  return {
    c01: nInit && nOther ? sumInit / nInit - sumOther / nOther : null,
    c02: nInit + nOther ? allMean : null,
    c03: h0,
    c04: nChars ? (8 * z) / nChars : null,
  };
}

// Clauset-Shalizi-Newman (continuous approximation of the discrete MLE) with x_min by KS ------------------------------
function zipfExponent(typeCounts) {
  const xs = typeCounts.slice().sort((a, b) => a - b);
  const uniq = [...new Set(xs)];
  let best = null;
  for (const xmin of uniq) {
    const tail = xs.filter((x) => x >= xmin);
    if (tail.length < 50) break;
    const n = tail.length;
    let s = 0;
    for (const x of tail) s += Math.log(x / (xmin - 0.5));
    if (!(s > 0)) continue;
    const alpha = 1 + n / s;
    if (!(alpha > 1)) continue;
    let ks = 0;
    for (let i = 0; i < n; i++) {
      const cdfModel = 1 - Math.pow((tail[i] - 0.5) / (xmin - 0.5), 1 - alpha);
      const emp = (i + 1) / n, empPrev = i / n;
      ks = Math.max(ks, Math.abs(emp - cdfModel), Math.abs(empPrev - cdfModel));
    }
    if (!best || ks < best.ks) best = { ks, alpha, xmin, n };
  }
  return best ? 1 / (best.alpha - 1) : null;
}
function ols(x, y) {
  const n = x.length;
  if (n < 2) return null;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  return sxx ? sxy / sxx : null;
}

/** The lite feature vector of a sentence set. `nWords` fixes the d-group window (N for a union, N/2 for a half). */
export function liteFeatures(sents, { nWords = null, withDirection = true } = {}) {
  const f = {};
  let W = 0, nSent = 0, nonProjSent = 0, arcs = 0, nonProjArcs = 0, depLenSum = 0, mwt = 0;
  const upos = new Map();
  const rel = new Map(); // base deprel -> {n, before}
  const ratePer = new Map();
  let textSent = 0, spaces = 0, udWords = 0;
  // tree accumulators
  let heightSum = 0, treeSent = 0, depthSum = 0, depthN = 0, leaves = 0, nonLeaf = 0, childSum = 0;
  const depthHist = [0, 0, 0, 0, 0, 0];
  let clauseSum = 0;
  const strahler = [0, 0, 0, 0];
  // morphology
  let featPairs = 0, nominals = 0, nominalsCase = 0, mwtCount = 0;
  let finV = 0, finVagr = 0, nounN = 0, nounDef = 0, verbN = 0, verbTense = 0;
  const formSet = new Set(), lemmaSet = new Set();
  const formUpos = new Map();
  const closedForms = new Set();
  let closedTok = 0;
  const lowerWords = [];
  for (const s of sents) {
    nSent++;
    const toks = s.tokens;
    const n = toks.length;
    mwt += s.ranges?.length ?? 0;
    udWords += n;
    if (s.text) { textSent++; for (let i = 0; i < s.text.length; i++) if (/\s/.test(s.text[i])) spaces++; }
    // id -> index (ids are 1..n after empty nodes are dropped, but do not assume)
    const idx = new Map(toks.map((t, i) => [t.id, i]));
    const head = toks.map((t) => idx.get(Number(t.head)) ?? -1);
    const isP = toks.map((t) => t.upos === "PUNCT");
    const dbase = toks.map((t) => BASE(t.deprel));
    // children among non-PUNCT
    const kids = toks.map(() => []);
    for (let i = 0; i < n; i++) if (!isP[i] && head[i] >= 0 && !isP[head[i]] && dbase[i] !== "punct") kids[head[i]].push(i);
    // det children for definiteness
    const hasDet = new Set();
    for (let i = 0; i < n; i++) if (dbase[i] === "det" && head[i] >= 0) hasDet.add(head[i]);
    let sentNonProj = false;
    for (let i = 0; i < n; i++) {
      const t = toks[i];
      if (isP[i]) continue;
      W++;
      upos.set(t.upos, (upos.get(t.upos) ?? 0) + 1);
      const lw = t.form.toLowerCase();
      if (t.upos !== "SYM") { lowerWords.push(lw); formSet.add(lw); if (t.lemma && t.lemma !== "_") lemmaSet.add(t.lemma.toLowerCase()); }
      if (t.upos !== "SYM") { let m = formUpos.get(lw); if (!m) formUpos.set(lw, (m = new Map())); m.set(t.upos, (m.get(t.upos) ?? 0) + 1); }
      if (CLOSED.has(t.upos)) { closedTok++; closedForms.add(`${lw}\t${t.upos}`); }
      const fe = t.feats;
      if (fe && fe !== "_") featPairs += fe.split("|").length;
      if (NOMINALS.has(t.upos)) { nominals++; if (hasFeat(fe ?? "_", "Case")) nominalsCase++; }
      if (t.upos === "NOUN") { nounN++; if (hasFeat(fe ?? "_", "Definite") || hasDet.has(i)) nounDef++; }
      if (t.upos === "VERB" || t.upos === "AUX") {
        verbN++;
        if (hasFeat(fe ?? "_", "Tense")) verbTense++;
        if (hasFeat(fe ?? "_", "VerbForm=Fin") || fe?.includes("VerbForm=Fin") || hasFeat(fe ?? "_", "Mood")) { finV++; if (hasFeat(fe ?? "_", "Person") || hasFeat(fe ?? "_", "Number")) finVagr++; }
      }
      const b = dbase[i];
      if (head[i] >= 0 && b !== "punct" && !isP[head[i]]) {
        arcs++;
        depLenSum += Math.abs(i - head[i]);
        let key = b; if (b === "iobj") key = "obj";
        const r = rel.get(key) ?? { n: 0, before: 0 };
        r.n++; if (i < head[i]) r.before++;
        rel.set(key, r);
        const r2 = rel.get("*all*") ?? { n: 0, before: 0 };
        r2.n++; if (i < head[i]) r2.before++;
        rel.set("*all*", r2);
      }
      ratePer.set(b, (ratePer.get(b) ?? 0) + 1);
    }
    // non-projectivity
    const dominated = (k, h) => { let c = k, guard = 0; while (c >= 0 && guard++ <= n) { if (c === h) return true; c = head[c]; } return false; };
    for (let i = 0; i < n; i++) {
      if (isP[i] || head[i] < 0 || isP[head[i]] || dbase[i] === "punct") continue;
      const lo = Math.min(i, head[i]), hi = Math.max(i, head[i]);
      let np = false;
      for (let k = lo + 1; k < hi && !np; k++) if (!isP[k] && !dominated(k, head[i])) np = true;
      if (np) { nonProjArcs++; sentNonProj = true; }
    }
    if (sentNonProj) nonProjSent++;
    // tree stats over non-PUNCT words
    const depth = new Int32Array(n).fill(0);
    const getDepth = (i) => {
      if (depth[i]) return depth[i];
      const h = head[i];
      depth[i] = h >= 0 && !isP[h] && !isP[i] && h !== i ? getDepth(h) + 1 : 1; // recursion depth is bounded by sentence length
      return depth[i];
    };
    const clauseDepth = new Int32Array(n).fill(-1);
    const getClause = (i) => {
      if (clauseDepth[i] >= 0) return clauseDepth[i];
      const h = head[i];
      const up = h >= 0 && !isP[h] && h !== i ? getClause(h) : 0;
      clauseDepth[i] = up + (CLAUSE.has(dbase[i]) ? 1 : 0);
      return clauseDepth[i];
    };
    let maxDepth = 0, maxClause = 0, any = false;
    const order = new Int32Array(n).fill(0);
    // Strahler by post-order via depth sorting
    const nodes = [];
    for (let i = 0; i < n; i++) if (!isP[i]) { any = true; nodes.push(i); }
    if (!any) continue;
    for (const i of nodes) {
      const d = getDepth(i);
      if (d > maxDepth) maxDepth = d;
      depthSum += d; depthN++;
      depthHist[Math.min(5, d - 1)]++;
      const k = kids[i].length;
      if (k === 0) leaves++; else { nonLeaf++; childSum += k; }
      const c = getClause(i); if (c > maxClause) maxClause = c;
    }
    nodes.sort((a, b) => depth[b] - depth[a]);
    for (const i of nodes) {
      if (!kids[i].length) { order[i] = 1; }
      else {
        let m = 0, cnt = 0;
        for (const k of kids[i]) { if (order[k] > m) { m = order[k]; cnt = 1; } else if (order[k] === m) cnt++; }
        order[i] = m + (cnt >= 2 ? 1 : 0);
      }
      strahler[Math.min(3, order[i] - 1)]++;
    }
    heightSum += maxDepth; treeSent++; clauseSum += maxClause;
  }
  const per100 = (x) => (W ? (100 * x) / W : null);
  f.a13 = per100(ratePer.get("case") ?? 0); f.a14 = per100(ratePer.get("det") ?? 0); f.a15 = per100(ratePer.get("aux") ?? 0);
  f.a16 = per100(ratePer.get("mark") ?? 0); f.a17 = per100(ratePer.get("cop") ?? 0);
  f.a18 = nSent ? nonProjSent / nSent : null;
  f.a19 = arcs ? nonProjArcs / arcs : null;
  f.a20 = W ? H([...upos.values()], W) : null;
  f.a21 = textSent >= 0.95 * nSent && udWords ? spaces / udWords : null;
  f.a22 = arcs ? depLenSum / arcs : null;
  if (withDirection) {
    const dir = (keys) => { let n = 0, b = 0; for (const k of keys) { const r = rel.get(k); if (r) { n += r.n; b += r.before; } } return n >= MIN_ARCS ? b / n : null; };
    f.a01 = dir(["nsubj"]); f.a02 = dir(["obj"]); f.a03 = dir(["case"]); f.a04 = dir(["amod"]); f.a05 = dir(["nmod"]); f.a06 = dir(["aux"]);
    f.a07 = dir(["acl"]); f.a08 = dir(["mark"]); f.a09 = dir(["det"]); f.a10 = dir(["advmod"]); f.a11 = dir(["cop"]);
    const all = rel.get("*all*"); f.a12 = all && all.n ? all.before / all.n : null;
  }
  f.b01 = treeSent ? heightSum / treeSent : null;
  f.b02 = depthN ? depthSum / depthN : null;
  for (let k = 0; k < 6; k++) f[`b0${3 + k}`] = depthN ? depthHist[k] / depthN : null;
  f.b09 = nonLeaf ? childSum / nonLeaf : null;
  f.b10 = depthN ? leaves / depthN : null;
  f.b11 = treeSent ? clauseSum / treeSent : null;
  const sn = strahler.reduce((a, b) => a + b, 0);
  for (let k = 0; k < 4; k++) f[`b${13 + k}`] = sn ? strahler[k] / sn : null;
  Object.assign(f, boundaryFeatures(sents));
  // D recurrence on the first nWords lowercase words of the set's order
  const words = nWords ? lowerWords.slice(0, nWords) : lowerWords;
  const tc = new Map();
  for (const w of words) tc.set(w, (tc.get(w) ?? 0) + 1);
  const V = tc.size, Nw = words.length;
  const counts = [...tc.values()];
  f.d01 = zipfExponent(counts);
  const grid = [1000, 2000, 4000, 8000, 16000].filter((n) => n <= Nw);
  if (grid.length >= 3) {
    const seen = new Set(); let g = 0; const xs = [], ys = [];
    for (let i = 0; i < words.length && g < grid.length; i++) { seen.add(words[i]); if (i + 1 === grid[g]) { xs.push(Math.log10(grid[g])); ys.push(Math.log10(seen.size)); g++; } }
    f.d02 = ols(xs, ys);
  } else f.d02 = null;
  f.d03 = V ? counts.filter((c) => c === 1).length / V : null;
  f.d04 = Nw ? counts.filter((c) => c === 1).length / Nw : null;
  f.d05 = Nw ? V / Nw : null;
  f.d06 = Nw ? counts.slice().sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0) / Nw : null;
  // E inventory
  f.e01 = W ? closedTok / W : null;
  f.e02 = W ? (1000 * closedForms.size) / W : null;
  let amb = 0, nForms = 0, entSum = 0;
  for (const m of formUpos.values()) { nForms++; if (m.size > 1) { amb++; const tot = [...m.values()].reduce((a, b) => a + b, 0); entSum += H([...m.values()], tot); } }
  f.e07 = nForms ? amb / nForms : null;
  f.e07h = amb ? entSum / amb : null;
  // F morphology
  f.f01 = W ? featPairs / W : null;
  f.f02 = nominals ? nominalsCase / nominals : null;
  f.f03 = lemmaSet.size ? formSet.size / lemmaSet.size : null;
  f.f04 = W ? (100 * mwt) / W : null;
  f.f05 = finV >= MIN_ARCS ? finVagr / finV : null;
  f.f06 = nounN >= MIN_ARCS ? nounDef / nounN : null;
  f.f07 = verbN >= MIN_ARCS ? verbTense / verbN : null;
  return f;
}

export const LITE_DIRECTION = ["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10", "a11", "a12"];
/** STRICT predictors: groups C, D, E, F plus a13..a21 and b01..b16: NO direction feature (BARKER 5.1). */
export const LITE_STRICT = [
  "a13", "a14", "a15", "a16", "a17", "a18", "a19", "a20", "a21",
  "b01", "b02", "b03", "b04", "b05", "b06", "b07", "b08", "b09", "b10", "b11", "b13", "b14", "b15", "b16",
  "c01", "c02", "c03", "c04",
  "d01", "d02", "d03", "d04", "d05", "d06",
  "e01", "e02", "e07", "e07h",
  "f01", "f02", "f03", "f04", "f05", "f06", "f07",
];
export const LITE_GAPS = ["b12", "b17", "b18", "c05", "d07", "d08", "e03", "e04", "e05", "e06", "e08", "g01", "g02", "g03", "g04", "g05"];

/**
 * buildLiteProfile(stem) → { id, stem, kind:"nl", labels, budget, values, resamples, gaps, inputs, builder, eoFree:true }
 *   values[id]    mean over seeds of the feature on the union (a null if undefined in any seed)
 *   resamples[id] the ten half values (5 seeds x halves A, B) used as evidence counts by the signature index
 * Returns { gap } instead when the train file is short of the fixed budget or absent.
 */
export function buildLiteProfile(stem, { N = N_BUDGET, seeds = SEEDS, cacheDir = null } = {}) {
  const tp = trainPath(stem);
  if (!fs.existsSync(tp)) return { stem, gap: { reason: "no_train" } };
  const gen = genealogyOf(stem);
  // the cache key is the file's size and mtime (cheap), so a cached profile never re-parses a treebank
  const st = fs.statSync(tp);
  const cacheFile = cacheDir ? path.join(cacheDir, `lite-${stem}-N${N}-${st.size}-${Math.round(st.mtimeMs)}.json`) : null;
  if (cacheFile && fs.existsSync(cacheFile)) { try { return JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch { /* rebuild */ } }
  const tb = readTreebank(tp);
  const budget = wordsIn(tb.sentences);
  const shares = scriptShares(tb.sentences);
  const base = {
    id: `nl:${stem}@sha256:${tb.sha256.slice(0, 12)}`, stem, kind: "nl",
    labels: { lineage: gen?.lineage ?? null, branch: gen?.branch ?? null, macro: gen?.macro ?? null, script: shares.dominant, scriptShares: shares.shares, giver: GENEALOGY_GIVER, typedBy: "transfer-data.mjs" },
    budget: { N, halves: 2, seeds, unit: "non-PUNCT UD word", available: budget },
    inputs: [{ path: tp, sha256: tb.sha256, role: "train" }],
    builder: "eval/barker/transfer-data.mjs#buildLiteProfile (STAND-IN for profiles.mjs)", eoFree: true,
  };
  if (budget < N) return { ...base, gap: { reason: "below_fixed_budget", denominator: { have: budget, need: N } } };
  const ids = [...LITE_STRICT, ...LITE_DIRECTION];
  const acc = Object.fromEntries(ids.map((id) => [id, []]));
  const res = Object.fromEntries(ids.map((id) => [id, []]));
  for (const seed of seeds) {
    const sm = sampleHalves(tb.sentences, N, seed, stem);
    if (!sm) return { ...base, gap: { reason: "short_in_seed", seed } };
    const fU = liteFeatures(sm.U, { nWords: N });
    const fA = liteFeatures(sm.A, { nWords: N / 2 });
    const fB = liteFeatures(sm.B, { nWords: N / 2 });
    for (const id of ids) { acc[id].push(fU[id] ?? null); res[id].push(fA[id] ?? null, fB[id] ?? null); }
  }
  const values = {}, resamples = {}, gaps = [];
  for (const id of ids) {
    const have = acc[id].filter((v) => v != null && Number.isFinite(v));
    if (have.length === seeds.length) { values[id] = mean(have); resamples[id] = res[id]; }
    else gaps.push({ feature: id, reason: "undefined_in_some_seed", denominator: { have: have.length, need: seeds.length } });
  }
  for (const id of LITE_GAPS) gaps.push({ feature: id, reason: "not_implemented_in_lite_stand_in" });
  const out = { ...base, values, resamples, gaps };
  if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(out)); }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// TARGETS: received priors and cards, read-only
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export function readRoleConfig(stem) {
  const p = path.join(PRIORS_DIR, `role-config-${stem}.json`);
  return fs.existsSync(p) ? readJson(p) : null;
}
/** The eight L1 targets (BARKER 5.1) from a received RoleConfig@1; each carries its loss kind. */
export const L1_TARGETS = Object.freeze([
  { id: "objBeforeShare", kind: "share" }, { id: "subjBeforeShare", kind: "share" },
  { id: "objMarkerPresent", kind: "binary" }, { id: "subjMarkerPresent", kind: "binary" },
  { id: "objReliability", kind: "share" }, { id: "subjReliability", kind: "share" },
  { id: "objDominantBefore", kind: "binary" }, { id: "subjDominantBefore", kind: "binary" },
]);
export function roleConfigTargets(rc) {
  if (!rc || !rc.object || !rc.subject) return null;
  const share = (x) => (x.total > 0 ? x.before / x.total : null);
  return {
    objBeforeShare: share(rc.object), subjBeforeShare: share(rc.subject),
    objMarkerPresent: rc.object.marker ? 1 : 0, subjMarkerPresent: rc.subject.marker ? 1 : 0,
    objReliability: rc.object.reliability ?? null, subjReliability: rc.subject.reliability ?? null,
    objDominantBefore: rc.object.dominantSide ? (rc.object.dominantSide === "before" ? 1 : 0) : null,
    subjDominantBefore: rc.subject.dominantSide ? (rc.subject.dominantSide === "before" ? 1 : 0) : null,
  };
}
export function readFramePrior(stem) {
  const p = path.join(PRIORS_DIR, `frame-${stem}.json`);
  return fs.existsSync(p) ? readJson(p) : null;
}

/** rung outcomes (L4): { <outcomeId>: 0|1 } per stem, from the cards on disk. `pass: null` is MISSING, never 0. */
export function cardOutcomes(stem, { dir = CARDS_DIR } = {}) {
  const out = {};
  const have = {};
  for (const rung of ["r1", "r2", "r3", "r4"]) {
    const p = path.join(dir, `${rung}-${stem}-dev.json`);
    if (!fs.existsSync(p)) continue;
    let c; try { c = readJson(p); } catch { continue; }
    have[rung] = true;
    if (c.pass === true || c.pass === false) out[`${rung}.pass`] = c.pass ? 1 : 0;
    const reasons = new Set((c.gaps ?? []).map((g) => g.reason));
    for (const r of reasons) out[`${rung}.gap.${r}`] = 1;
    if (rung === "r1" && c.details?.need && typeof c.details.need.needs === "boolean") out["r1.needs_ear"] = c.details.need.needs ? 1 : 0;
  }
  // a gap reason is DEFINED (0) for every system that has that rung's card but not that reason
  return { out, have };
}
/** all reasons ever seen on a rung, so a card that lacks one is a 0 and a stem without the card is undefined */
export function collectCardOutcomes(stems, opts = {}) {
  const per = new Map();
  const ids = new Set();
  for (const s of stems) { const r = cardOutcomes(s, opts); per.set(s, r); for (const k of Object.keys(r.out)) ids.add(k); }
  const table = {}; // outcomeId -> { stem: 0|1 }
  for (const id of ids) {
    const rung = id.split(".")[0];
    table[id] = {};
    for (const s of stems) {
      const r = per.get(s);
      if (!r.have[rung]) continue; // no card for that rung: undefined
      if (id.includes(".gap.") || id === "r1.needs_ear") table[id][s] = r.out[id] ?? 0;
      else if (id in r.out) table[id][s] = r.out[id];
    }
  }
  return table;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// FRAME TABLES (re-implementation of scripts/build-frame-prior.mjs, parameterised by the cell floor)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const tot = (m) => { let s = 0; for (const v of Object.values(m)) s += v; return s; };
const majority = (m) => { let b = null, bn = -1; for (const [k, v] of Object.entries(m)) if (v > bn) { bn = v; b = k; } return b; };

/** form -> {upos: n} over sentences, forms lowercased (the builder's own unit) */
export function formTally(sents) {
  const tally = new Map();
  for (const s of sents) for (const t of s.tokens) { const f = t.form.toLowerCase(); let m = tally.get(f); if (!m) tally.set(f, (m = {})); m[t.upos] = (m[t.upos] ?? 0) + 1; }
  return tally;
}
export const classOfForm = (tally, form) => { const m = tally.get(form); return !m || tot(m) < 2 ? "UNK" : majority(m); };

/**
 * buildFrameTable(sents, {floor}) → { frames:{key:{upos:n}}, marginal, hapax, sentences }
 * Exactly build-frame-prior.mjs at floor = 5 (cells below the floor dropped, "*|*" always kept).
 */
export function buildFrameTable(sents, { floor = 5, tally = null } = {}) {
  const T = tally ?? formTally(sents);
  const frames = {};
  const bump = (key, u) => { const c = (frames[key] ??= {}); c[u] = (c[u] ?? 0) + 1; };
  const marginal = {};
  let hapax = 0;
  for (const s of sents) {
    const toks = s.tokens;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const m = T.get(t.form.toLowerCase());
      if (tot(m) !== 1) continue;
      const P = i === 0 ? "^" : classOfForm(T, toks[i - 1].form.toLowerCase());
      const N = i === toks.length - 1 ? "$" : classOfForm(T, toks[i + 1].form.toLowerCase());
      bump(`${P}|${N}`, t.upos); bump(`${P}|*`, t.upos); bump(`*|${N}`, t.upos); bump("*|*", t.upos);
      marginal[t.upos] = (marginal[t.upos] ?? 0) + 1; hapax++;
    }
  }
  const kept = {};
  for (const [k, v] of Object.entries(frames)) if (tot(v) >= floor || k === "*|*") kept[k] = v;
  return { frames: kept, allFrames: frames, marginal, hapax, sentences: sents.length };
}
export const applyFloor = (table, floor) => {
  const kept = {};
  for (const [k, v] of Object.entries(table.allFrames)) if (tot(v) >= floor || k === "*|*") kept[k] = v;
  return kept;
};

/** The backoff chain of the reader (adapters/text/heard-nominals.js::frameDistribution): P|N, P|*, *|N, *|* */
export const BACKOFF = (p, n) => [`${p}|${n}`, `${p}|*`, `*|${n}`, "*|*"];

/** Smoothed distribution over the 17 UPOS from a frame table cell: additive 1/(|U| x total) (BARKER 5.3). */
export function smoothedCell(cell) {
  const T = tot(cell), a = 1 / (UPOS.length * T);
  const d = new Float64Array(UPOS.length);
  const denom = T + a * UPOS.length;
  for (let i = 0; i < UPOS.length; i++) d[i] = ((cell[UPOS[i]] ?? 0) + a) / denom;
  return d;
}
export function frameDist(frames, p, n) {
  for (const key of BACKOFF(p, n)) if (frames[key]) return { key, dist: smoothedCell(frames[key]) };
  return null;
}
const UIDX = Object.fromEntries(UPOS.map((u, i) => [u, i]));
export const uposIndex = (u) => UIDX[u];

/**
 * The OOV tokens of a held-out file against a train tally: every token whose lowercase form is absent from train, with its
 * gold UPOS and its (P, N) frame resolved through the SYSTEM'S OWN train majority classes. Returns per-sentence entries.
 */
export function oovTokens(devSents, trainTally) {
  const out = [];
  devSents.forEach((s, si) => {
    const toks = s.tokens;
    for (let i = 0; i < toks.length; i++) {
      const f = toks[i].form.toLowerCase();
      if (trainTally.has(f)) continue;
      const u = UIDX[toks[i].upos];
      if (u === undefined) continue;
      const P = i === 0 ? "^" : classOfForm(trainTally, toks[i - 1].form.toLowerCase());
      const N = i === toks.length - 1 ? "$" : classOfForm(trainTally, toks[i + 1].form.toLowerCase());
      out.push({ s: si, u, P, N });
    }
  });
  return out;
}
export { sha256File };
