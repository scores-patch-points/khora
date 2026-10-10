// eval/law/name-war-and-peace.mjs — TEST OF THE NAME RULE ON WAR AND PEACE
//
//   node eval/law/name-war-and-peace.mjs [--n 600] [--M 128] [--dry] [--out DIR]
//
// THE RULE UNDER TEST (user, 2026-10-05): "a name is that which affects the holographic field like a name" — we know a being is a name
// because ablating it changes the holograph the way ablating a name does (docs/LAW-FALSIFICATION.md 1.2 C2, 1.5; user refinements R1:
// ablate and read the SLOT, not the span; and the single-mention rule: a name can appear once and be a name).
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on War and Peace) ═══════════════════════════
// DISCLOSURE. Before this header: (a) the existing instrument eval/law/impact.mjs smoke on English UD DEV (150 tokens, M=8): 98% of
// 8-sentence windows had NO entry, 57% of tokens had a null impact signature, hapax null share 85%, span-signature NMI vs UPOS above
// slot-signature NMI; (b) a cost/deafness probe of impact.mjs on English UD DEV at M=32 and M=128 (100 tokens): windows with an entry
// 29% and 93%. Those two touched UD DEV English, never War and Peace. No War and Peace token has been read by impact.mjs. M=128 is chosen
// from (b): the reader must be able to hear a being at all. No threshold below was chosen after seeing a War and Peace result.
//
// DATA. Project Gutenberg #2600, Maude translation (ethos/11-multi-language/war-and-peace/en). Sentences by khora's splitSentences; the
// reader's stream is the lowercased NFC word units of each sentence, punctuation removed (impact.mjs's own unit stream). The readers
// are impact.mjs's THREE PRIOR-FREE shipped readers (R-A readForward atmosphere, R-B heardSurfaces/discoverReferents with floor 2, R-C
// relations-gfp), A-DEL ablation, frame-causal F=0 (the self sentence and the M=128 sentences before it). No capital, no POS prior, no
// frame prior, no ear enters any reader. The only caps/POS knowledge is in the LABELS and in the declared RIVAL arms, below.
//
// LABELS (evaluation only; never a feature of the impact arms). For every word form, over its NON-sentence-initial occurrences in the book:
//   capShare = share written with a capital. A form is
//   NAME    if capShare >= 0.90, n_noninitial >= 5, and the shipped English POS prior does not settle it as closed-class (excludes "I")
//   CHAR    NAME and a word of the hand-verified cast of 48 referents (eoreader5 priors/coref/war-and-peace.json: name, display, surfaces)
//   COMMON  if capShare <= 0.01, n_noninitial >= 5, and the shipped English POS prior settles it (>= 0.5) as NOUN, VERB, ADJ or ADV
//   FUNC    if the prior settles it as DET ADP PRON AUX CCONJ SCONJ PART and it occurs >= 50 times (reference arm only)
//   anything else is excluded (ambiguous case, rare, or unknown).
//   Known label noise: NAME includes nationalities and "god"; COMMON excludes unseen forms. The prior is a LABEL tool here, not a reader input.
// STRATA by occurrence order of the form in the book: FIRST (the first mention: the single-mention case, user rule 1.5) and LATER (4th
// mention onwards). Position and frequency are CONTROLLED BY MATCHING, not by adjustment:
//   LATER: each NAME token is paired with a COMMON token from a form of the same log2-frequency bin (book count), full windows (s >= M).
//   FIRST: each NAME form's first mention is paired with the first mention of the COMMON form (n >= 5) nearest in sentence position
//          (pairs further than 400 sentences apart are dropped and counted).
//   Types are drawn uniformly (not by frequency) so that "pierre" does not own the sample. N_LATER pairs = --n (600), FIRST = all NAME forms.
//
// OUTCOMES.
//   O1 TRACE  share of tokens whose ablation leaves a non-null slot signature, by class x stratum; the typed gap `no-slot` share.
//   O2 SEPARATION  leave-one-position-block-out (10 blocks of the book) ridge logistic regression (lambda 1.0 on standardised features, no
//      tuning), pooled AUC of NAME vs COMMON on the matched pairs, per stratum, per arm:
//        SLOT (85)  SLOT+ATM (104)  SPAN (32, the rival operationalisation R1)  COMPSTRUCT (8, impact.mjs company-structure)
//        FREQ (causal: log count so far, log count in window, log recency gap, window document frequency)
//        BURST (causal: count in the last 16 sentences over its book rate, a log ratio)
//        CAP (the capital witness: this token capitalised, sentence-initial, capital share of its earlier mentions) — a RIVAL witness
//        COMPANY-LITE (log counts of the left and right neighbour, bigram counts so far) — a non-causal-by-one-token rival
//        POSITION (log s, window length, sentence length) — must be at chance by construction of the matching
//        and the combinations SLOT+ATM+FREQ, SLOT+ATM+FREQ+CAP+BURST.
//   O3 SLOT vs SPAN   paired block-bootstrap (B=1000) of AUC(SLOT+ATM) - AUC(SPAN).
//   O4 BEYOND RIVALS  AUC(SLOT+ATM+FREQ) - AUC(FREQ), and AUC(SLOT+ATM+FREQ+CAP+BURST) - AUC(FREQ+CAP+BURST); block bootstrap 95% interval.
//   O5 FIRST MENTION, NON-CAUSAL  the same O2 on the FIRST pairs with F=32 (the 32 sentences AFTER the mention are visible to the
//      ablation): what a single mention does to the FUTURE field. Labelled NON-CAUSAL; never a claim about reading.
//   O6 EXTENT  median and p90 of the extent (tokens, frames) of the effect, by class (the "difference that makes a difference" horizon).
// CONTROLS BUILT TO FAIL.
//   K1 sham ablation (a space, not a token): null signature share must be 100% in the sample drawn for it.
//   K2 label permutation within position blocks (B=200): the null AUC distribution of SLOT+ATM (q95 reported).
//   K3 company shuffle: the same pipeline on within-sentence-shuffled text (200 LATER pairs): SLOT+ATM AUC must fall toward chance if the
//      signal is company/order; if it does not fall the signal is counts. Reported, not gating.
//   K4 POSITION arm AUC must be inside [0.45, 0.55] (else the matching failed and every AUC is suspect).
//   K5 licence of the instrument: CHAR-LATER non-null share >= 0.50, else the readers are DEAF at this scale (UNDERPOWERED(reader)).
//   K6 determinism: a 40-token re-run reproduces every signature hash.
// VERDICT (declared before the run; SESOI = 0.03 AUC, a bare provisional number, P4).
//   V1 DISCRIMINATES  LATER AUC(SLOT+ATM) >= 0.65 and > the K2 q95.
//   V2 BEYOND RIVALS  O4 lower 95% bound > 0 on both differences, and the point difference >= 0.03.
//   V3 SINGLE MENTION  FIRST, frame-causal: AUC(SLOT+ATM) >= 0.60 and > its permutation q95.
//   V4 SLOT NOT SPAN  O3 lower 95% bound > 0.
//   HOLDS            V1 & V2 & V3 & V4.
//   HOLDS-LATER      V1 & V2, V3 fails: the reader is deaf to a single mention; typed gap about the READER (1.5), not a falsification.
//   NOT-BEYOND-RIVALS  V1 true, V2 false: the holograph separates names but adds nothing the rivals (frequency, capitals, burstiness) do not
//                      already say: the claim "impact DETERMINES name-ness" (T5 case S) is FALSIFIED for these readers; "informs" survives.
//   FALSIFIED        V1 false.   UNDERPOWERED(reader)  K5 or K4 or K6 fails.
//   V4 is reported separately: it can fail while the rest holds (then R1, the slot-not-span refinement, is not supported by these readers).
// PREDICTIONS (blind; the orders are the claims):
//   P1 O1: NAME-LATER non-null share >= 0.60 and COMMON-LATER non-null share <= 0.45 (a name leaves a trace the matched common word does not).
//   P2 V1 holds, LATER AUC(SLOT+ATM) in [0.60, 0.80].
//   P3 V2 FAILS: FREQ+CAP+BURST already separate names from frequency-matched common words, so the impact adds < 0.03 over them.
//      (CAP alone is predicted >= 0.90: capitals are the strongest signal in English.)
//   P4 V3 FAILS (causal): the readers are deaf to a single mention (floor 2): FIRST AUC(SLOT+ATM) < 0.58, null share >= 0.85 for both classes.
//   P5 O5: the NON-causal F=32 arm separates FIRST names better than the causal arm: AUC >= 0.62.
//   P6 V4 FAILS: SPAN >= SLOT (the smoke's span NMI exceeded its slot NMI).
//   P7 COMPSTRUCT (impact.mjs company-structure impact) is within 0.03 of SLOT+ATM: no independent information in the slot signature.
//   HEADLINE guess: HOLDS-LATER is NOT reached because V2 fails; the verdict is NOT-BEYOND-RIVALS, with the rule's "affects the holograph
//   like a name" true as a description of recurring names and unsupported as a way to FIND a name that the rivals cannot.
// NOT RUN HERE (typed gaps): T11 identity-as-fold (alias substitution on the 48 referents); the planted-structure power checks of docs/LAW-FALSIFICATION.md
//   G0; any non-English text; the contaminated readers (nominated referent source) — the study of whether holographic standing can reject the
//   candidate generator's false positives is a separate pre-registration.
//
// ═══ AMENDMENT 1 — written after a DRY RUN (40 + 40 pairs, header sha256 82a944eb3bb6d4fc4834ed22417986787eaa072c13f2a968f56c849c2372b660),
// ═══ BEFORE the full run. The dry run found, and this amendment fixes, three things; no prediction was changed to match a result.
//   A1 CIRCULARITY. NAME is defined by capShare >= 0.90, so the CAP arm (this token capitalised) scores AUC 1.0 by construction (dry run: 1.0) and
//      V2 as first written ("beyond FREQ+CAP+BURST") could never pass. Capitals are the label here, not a rival that can be tested against it.
//      CAP stays in the table, labelled CIRCULAR, and is removed from V2. V2 now compares against the CASE-FREE rivals only (the heard rule: the reader
//      sees no capital): (a) FREQ and (b) FREQ+BURST+COMPANY-LITE. The arm "SLOT+ATM+FREQ+BURST+COMPANY-LITE" replaces "SLOT+ATM+FREQ+CAP+BURST".
//      P3 is amended the same way: V2 (against the case-free rivals) is predicted to FAIL; CAP's AUC is not a prediction (it is the label).
//   A2 COST. The ridge learner on 104 raw features is too slow for 200 permutations; impact arms (SLOT, SLOT+ATM, SPAN, and any combination containing
//      them) are projected to PCA-24 fitted on the training fold, as docs/LAW-FALSIFICATION.md T5 specifies ("impact arms PCA-24"). No threshold changes.
//   A3 WHAT THE DRY RUN SHOWED, said now so it cannot be hidden: on 40 LATER pairs the non-null share was NAME 0.52 vs COMMON 0.83 and CHAR 0.44
//      (n=9): names left LESS trace than frequency-matched common words, which would make P1 false and K5 (CHAR-LATER non-null >= 0.50) fail. P1 and K5 are
//      left as written. If K5 fails in the full run the verdict is UNDERPOWERED(reader): these readers cannot hear the characters at all, which is a finding
//      about the readers, not a test of the rule. In that case ARM R below is the test that matters.
//   A4 ARM R (added before the full run; labelled CONTAMINATED, no verdict): the SAME ablation read through khora's REAL production reading pipeline
//      (the-fold/corpus-session.js admitChunked + sessionReferents, English declared, the shipped priors, lowercased text, window = the M sentences
//      before the token plus its own). Its impact is the change in the REFERENT INDEX (an entry born, lost, or with a changed mention count). It is
//      reported as O7 with the same matching and the same block-CV AUC of NAME vs COMMON from {changed, mentionDelta, born, lost}, against the same
//      case-free rivals. Because the production pipeline carries priors, any separation it shows may come from the priors, not the field: it can inform the
//      rule's use for finding names, never confirm or falsify the law.
// ═══ END OF PRE-REGISTRATION ═════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { splitSentences } from "../../adapters/text/spans.js";
import { impactBatch, SIG_DIM, ATM_DIM, SPAN_DIM, C_DIM, rngFor, seedFor, shuffleSentences, fitPCA, projectPCA, D_IMP } from "./impact.mjs";
import { auc } from "../competence/lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..", "..");
const TEXT = "/Users/mlacy/Documents/3.0/ethos/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt";
const COREF = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoreader5/priors/coref/war-and-peace.json";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
export const DRY = args.includes("--dry");
const N_PAIRS = Number(opt("--n", DRY ? 40 : 600));
export const M = Number(opt("--M", 128));
const F_NONCAUSAL = 32;
const OUT = opt("--out", path.join(HERE, "results"));
const SESOI = 0.03, LAMBDA = 1.0, BOOT = 1000, PERM = 200, BLOCKS = 10, MAX_PAIR_GAP = 400;

export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };

// ── the book ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadBook() {
  let text = fs.readFileSync(TEXT, "utf8").replace(/^﻿/, "");
  const a = text.indexOf("*** START OF"), b = text.indexOf("*** END OF");
  text = text.slice(text.indexOf("\n", a) + 1, b);
  const first = text.indexOf("BOOK ONE: 1805");
  const body = text.indexOf("BOOK ONE: 1805", first + 1);
  text = text.slice(body >= 0 ? body : first);
  text = text.split("\n").filter((l) => !/^\s*(CHAPTER [IVXLC]+|BOOK [A-Z]+(?:: ?\d+)?|FIRST EPILOGUE.*|SECOND EPILOGUE.*)\s*$/.test(l)).join("\n");
  const sents = splitSentences(text);
  const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
  const stream = [], orig = [], texts = [], offs = [];
  for (const s of sents) {
    const toks = [], os = [], of = [];
    for (const m of s.text.matchAll(WORD)) {
      const w = m[0].replace(/^['’]+|['’]+$/g, "");
      if (!w || /^\p{N}+$/u.test(w)) continue;
      const lead = m[0].length - m[0].replace(/^['’]+/, "").length;
      toks.push(w.normalize("NFC").toLowerCase()); os.push(w); of.push([m.index + lead, w.length]);
    }
    if (toks.length >= 3) { stream.push(toks); orig.push(os); texts.push(s.text); offs.push(of); }
  }
  return { stream, orig, texts, offs };
}

export function labelBook({ stream, orig }) {
  const pos = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "pos-eng.json"), "utf8")).forms;
  const CLOSED = new Set(["DET", "ADP", "PRON", "AUX", "CCONJ", "SCONJ", "PART"]), OPEN = new Set(["NOUN", "VERB", "ADJ", "ADV"]);
  const settled = (w) => { const c = pos[w]; if (!c) return null; const t = Object.values(c).reduce((a, b) => a + b, 0); const [k, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return n / t >= 0.5 ? k : null; };
  const st = new Map();
  stream.forEach((sent, s) => sent.forEach((w, i) => {
    const r = st.get(w) ?? { n: 0, noninit: 0, cap: 0, occ: [] };
    r.n += 1; r.occ.push([s, i]);
    if (i > 0) { r.noninit += 1; if (/^\p{Lu}/u.test(orig[s][i])) r.cap += 1; }
    st.set(w, r);
  }));
  const cast = new Set();
  const ref = JSON.parse(fs.readFileSync(COREF, "utf8")).referents;
  for (const r of ref) for (const f of [r.name, r.display, ...(r.surfaces ?? [])]) for (const m of String(f ?? "").matchAll(/[\p{L}\p{M}'’]+/gu)) cast.add(m[0].normalize("NFC").toLowerCase());
  const cls = new Map();
  for (const [w, r] of st) {
    const cs = r.noninit ? r.cap / r.noninit : 0;
    const k = settled(w);
    if (r.noninit >= 5 && cs >= 0.9 && !CLOSED.has(k)) cls.set(w, cast.has(w) ? "CHAR" : "NAME");
    else if (r.noninit >= 5 && cs <= 0.01 && OPEN.has(k)) cls.set(w, "COMMON");
    else if (r.n >= 50 && CLOSED.has(k)) cls.set(w, "FUNC");
  }
  return { st, cls, cast };
}

// ── sampling (matched) ──────────────────────────────────────────────────────────────────────────────────────────────
const bin = (n) => Math.floor(Math.log2(n));
export function drawSample({ stream, st, cls }, nPairs, seed) {
  const rnd = rngFor(seed);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const types = (c) => [...cls].filter(([, k]) => k === c || (c === "NAME" && k === "CHAR")).map(([w]) => w);
  const nameT = types("NAME").filter((w) => st.get(w).n >= 10), commonT = types("COMMON");
  const commonByBin = new Map();
  for (const w of commonT) { const b = bin(st.get(w).n); (commonByBin.get(b) ?? commonByBin.set(b, []).get(b)).push(w); }
  const laterOcc = (w) => st.get(w).occ.slice(3).filter(([s]) => s >= M);
  const out = { later: [], first: [], func: [], dropped: 0 };
  let guard = 0;
  while (out.later.length < nPairs * 2 && guard++ < nPairs * 40) {
    const w = pick(nameT), lo = laterOcc(w);
    if (!lo.length) continue;
    const pool = (commonByBin.get(bin(st.get(w).n)) ?? []).filter((c) => laterOcc(c).length);
    if (!pool.length) continue;
    const c = pick(pool), lc = laterOcc(c);
    const [s1, i1] = pick(lo), [s2, i2] = pick(lc);
    out.later.push({ s: s1, i: i1, id: w, cls: cls.get(w), y: 1, pair: out.later.length / 2 | 0 }, { s: s2, i: i2, id: c, cls: "COMMON", y: 0, pair: out.later.length / 2 | 0 });
  }
  // FIRST mentions: every NAME form, matched to the COMMON form (n >= 5) whose first mention is nearest in position
  const firstOf = (w) => st.get(w).occ[0];
  const commonFirst = commonT.map((w) => ({ w, s: firstOf(w)[0], i: firstOf(w)[1] })).sort((a, b) => a.s - b.s);
  const used = new Set();
  const names = types("NAME").filter((w) => st.get(w).n >= 5).map((w) => ({ w, s: firstOf(w)[0], i: firstOf(w)[1] })).sort((a, b) => a.s - b.s);
  const limit = DRY ? Math.min(names.length, nPairs) : names.length;
  for (const nm of names.slice(0, limit)) {
    let best = null;
    for (const c of commonFirst) { if (used.has(c.w)) continue; const d = Math.abs(c.s - nm.s); if (best === null || d < best.d) best = { c, d }; if (c.s > nm.s && best && c.s - nm.s > best.d) break; }
    if (!best || best.d > MAX_PAIR_GAP) { out.dropped += 1; continue; }
    used.add(best.c.w);
    const p = out.first.length / 2 | 0;
    out.first.push({ s: nm.s, i: nm.i, id: nm.w, cls: cls.get(nm.w), y: 1, pair: p }, { s: best.c.s, i: best.c.i, id: best.c.w, cls: "COMMON", y: 0, pair: p });
  }
  // FUNC reference: later occurrences of closed-class forms
  const funcT = [...cls].filter(([, k]) => k === "FUNC").map(([w]) => w);
  for (let k = 0; k < (DRY ? 20 : 300); k++) { const w = pick(funcT), lo = laterOcc(w); if (lo.length) { const [s, i] = pick(lo); out.func.push({ s, i, id: w, cls: "FUNC", y: 0 }); } }
  return out;
}

// ── features ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function buildCausal(stream, orig, st) {
  // running counts for causal arms: count of a form BEFORE sentence s (and before i within s)
  const seen = new Map();   // form -> array of [s, i] positions in order (from st.occ)
  const idxOf = (w, s, i) => { const occ = st.get(w).occ; let lo = 0, hi = occ.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (occ[mid][0] < s || (occ[mid][0] === s && occ[mid][1] < i)) lo = mid + 1; else hi = mid; } return lo; };
  const bigram = new Map();
  stream.forEach((sent) => sent.forEach((w, i) => { if (i > 0) { const k = `${sent[i - 1]} ${w}`; bigram.set(k, (bigram.get(k) ?? 0) + 1); } }));
  void seen; void bigram;
  const rate = (w) => st.get(w).n / stream.length;
  return (t) => {
    const { s, i, id } = t;
    const occ = st.get(id).occ, k = idxOf(id, s, i);
    const before = k;                                         // mentions strictly before this token
    const lastGap = k > 0 ? (s - occ[k - 1][0]) : 5000;       // sentences since the previous mention
    let inWin = 0, inLast16 = 0, winDF = 0;
    for (let j = k - 1; j >= 0 && s - occ[j][0] <= M; j--) { inWin += 1; if (s - occ[j][0] <= 16) inLast16 += 1; }
    const sentsWith = new Set(); for (let j = k - 1; j >= 0 && s - occ[j][0] <= M; j--) sentsWith.add(occ[j][0]); winDF = sentsWith.size;
    const FREQ = [Math.log1p(before), Math.log1p(inWin), Math.log1p(lastGap), Math.log1p(winDF)];
    const expected = Math.max(1e-6, rate(id) * 16);
    const BURST = [Math.log((inLast16 + 0.5) / (expected + 0.5)), Math.log1p(inLast16)];
    let capPrev = 0, nPrev = 0;
    for (let j = 0; j < k; j++) { const [ss, ii] = occ[j]; if (ii > 0) { nPrev += 1; if (/^\p{Lu}/u.test(orig[ss][ii])) capPrev += 1; } }
    const CAP = [/^\p{Lu}/u.test(orig[s][i]) ? 1 : 0, i === 0 ? 1 : 0, nPrev ? capPrev / nPrev : 0.5];
    const left = i > 0 ? stream[s][i - 1] : null, right = i + 1 < stream[s].length ? stream[s][i + 1] : null;
    const cnt = (w) => (w && st.has(w) ? st.get(w).n : 0);
    const COMPANY = [Math.log1p(cnt(left)), Math.log1p(cnt(right)), left ? Math.log1p(0) : 0, i === 0 ? 1 : 0, right ? 0 : 1];
    const POSITION = [Math.log1p(s), Math.min(s, M), Math.log1p(stream[s].length)];
    return { FREQ, BURST, CAP, COMPANY, POSITION };
  };
}

// ── learner: ridge logistic regression (IRLS), generic measuring instrument ─────────────────────────────────────────────────
function solve(A, b) {
  const n = b.length;
  const M2 = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    const d = M2[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = M2[r][c] / d; if (f) for (let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let v = M2[r][n]; for (let k = r + 1; k < n; k++) v -= M2[r][k] * x[k]; x[r] = v / (M2[r][r] || 1e-12); }
  return x;
}
export function fitLogit(X, y, lambda = LAMBDA, iters = 25) {
  const n = X.length, d = X[0].length + 1;
  const w = new Array(d).fill(0);
  for (let it = 0; it < iters; it++) {
    const g = new Array(d).fill(0), H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let r = 0; r < n; r++) {
      const x = [1, ...X[r]];
      let z = 0; for (let k = 0; k < d; k++) z += w[k] * x[k];
      const p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
      const wt = Math.max(1e-6, p * (1 - p));
      for (let k = 0; k < d; k++) { g[k] += (p - y[r]) * x[k]; for (let l = 0; l < d; l++) H[k][l] += wt * x[k] * x[l]; }
    }
    for (let k = 1; k < d; k++) { g[k] += lambda * w[k]; H[k][k] += lambda; }
    H[0][0] += 1e-8;
    const step = solve(H, g);
    let mx = 0; for (let k = 0; k < d; k++) { w[k] -= step[k]; mx = Math.max(mx, Math.abs(step[k])); }
    if (mx < 1e-6) break;
  }
  return w;
}
export const predict = (w, x) => { let z = w[0]; for (let k = 0; k < x.length; k++) z += w[k + 1] * x[k]; return z; };
export function standardise(train, ...others) {
  const d = train[0].length, mu = new Array(d).fill(0), sd = new Array(d).fill(0);
  for (const r of train) for (let k = 0; k < d; k++) mu[k] += r[k] / train.length;
  for (const r of train) for (let k = 0; k < d; k++) sd[k] += (r[k] - mu[k]) ** 2 / train.length;
  const keep = []; for (let k = 0; k < d; k++) if (Math.sqrt(sd[k]) > 1e-9) keep.push(k);
  const f = (r) => keep.map((k) => (r[k] - mu[k]) / Math.sqrt(sd[k]));
  return [train.map(f), ...others.map((o) => o.map(f))];
}
/** leave-one-block-out predictions for a feature matrix; returns scores aligned to rows (null where an arm has no variance). Arms wider than D_IMP
 * (24) are projected to PCA-24 fitted on the training fold (docs/LAW-FALSIFICATION.md T5). */
export function cvScores(X, y, block) {
  const out = new Array(X.length).fill(null);
  const ids = [...new Set(block)];
  for (const b of ids) {
    const tr = [], te = [];
    block.forEach((bb, r) => (bb === b ? te : tr).push(r));
    if (!te.length || tr.length < 20 || new Set(tr.map((r) => y[r])).size < 2) continue;
    const [Xtr, Xte] = standardise(tr.map((r) => X[r]), te.map((r) => X[r]));
    if (!Xtr[0]?.length) continue;
    let A = Xtr, B = Xte;
    if (Xtr[0].length > D_IMP) { const pca = fitPCA(Xtr, D_IMP); A = Xtr.map((r) => projectPCA(pca, r)); B = Xte.map((r) => projectPCA(pca, r)); }
    const w = fitLogit(A, tr.map((r) => y[r]));
    te.forEach((r, k) => { out[r] = predict(w, B[k]); });
  }
  return out;
}
export const aucOf = (scores, y, rows = null) => { const idx = (rows ?? scores.map((_, k) => k)).filter((k) => scores[k] != null); if (!idx.length) return null; return auc(idx.map((k) => scores[k]), idx.map((k) => y[k] === 1)); };
export function bootDiff(sA, sB, y, block, B = BOOT, seed = 1) {
  const rnd = rngFor(seed); const ids = [...new Set(block)];
  const byBlock = new Map(ids.map((b) => [b, []])); block.forEach((b, r) => byBlock.get(b).push(r));
  const diffs = [];
  for (let t = 0; t < B; t++) {
    const rows = []; for (let k = 0; k < ids.length; k++) rows.push(...byBlock.get(ids[Math.floor(rnd() * ids.length)]));
    const a = aucOf(sA, y, rows), b = aucOf(sB, y, rows);
    if (a != null && b != null) diffs.push(a - b);
  }
  const point = aucOf(sA, y) - aucOf(sB, y);
  return { point: round(point), lo: round(quantile(diffs, 0.025)), hi: round(quantile(diffs, 0.975)), n: diffs.length };
}
const cat = (...parts) => (r) => parts.flatMap((p) => p[r]);

// ── the run ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function recordsToFeatures(rows, recs, causalFeat) {
  return rows.map((t, r) => { const rec = recs[r]; const c = causalFeat(t); return { SLOT: rec.sig, ATM: rec.atm, SPAN: rec.span, COMPSTRUCT: rec.c, ...c, isNull: rec.isNull, noSlot: rec.noSlot, extent: rec.extent, hash: rec.hash }; });
}
function armTable(rows, feats, y, block, tag, seed) {
  const A = {
    SLOT: (f) => f.SLOT, "SLOT+ATM": (f) => [...f.SLOT, ...f.ATM], SPAN: (f) => f.SPAN, COMPSTRUCT: (f) => f.COMPSTRUCT,
    FREQ: (f) => f.FREQ, BURST: (f) => f.BURST, CAP: (f) => f.CAP, "COMPANY-LITE": (f) => f.COMPANY, POSITION: (f) => f.POSITION,
    "FREQ+CAP+BURST": (f) => [...f.FREQ, ...f.CAP, ...f.BURST],
    "FREQ+BURST+COMPANY-LITE": (f) => [...f.FREQ, ...f.BURST, ...f.COMPANY],
    "SLOT+ATM+FREQ": (f) => [...f.SLOT, ...f.ATM, ...f.FREQ],
    "SLOT+ATM+FREQ+BURST+COMPANY-LITE": (f) => [...f.SLOT, ...f.ATM, ...f.FREQ, ...f.BURST, ...f.COMPANY],
    "SLOT+ATM+FREQ+CAP+BURST": (f) => [...f.SLOT, ...f.ATM, ...f.FREQ, ...f.CAP, ...f.BURST],
  };
  const scores = {}, res = {};
  for (const [name, fn] of Object.entries(A)) { scores[name] = cvScores(feats.map(fn), y, block); res[name] = round(aucOf(scores[name], y)); }
  const diffs = {
    "SLOT+ATM - SPAN": bootDiff(scores["SLOT+ATM"], scores.SPAN, y, block, BOOT, seed),
    "SLOT+ATM+FREQ - FREQ": bootDiff(scores["SLOT+ATM+FREQ"], scores.FREQ, y, block, BOOT, seed + 1),
    "SLOT+ATM+FREQ+BURST+COMPANY-LITE - FREQ+BURST+COMPANY-LITE": bootDiff(scores["SLOT+ATM+FREQ+BURST+COMPANY-LITE"], scores["FREQ+BURST+COMPANY-LITE"], y, block, BOOT, seed + 2),
    "CAP-COMBINATION (circular) - FREQ+CAP+BURST": bootDiff(scores["SLOT+ATM+FREQ+CAP+BURST"], scores["FREQ+CAP+BURST"], y, block, BOOT, seed + 5),
    "SLOT+ATM - COMPSTRUCT": bootDiff(scores["SLOT+ATM"], scores.COMPSTRUCT, y, block, BOOT, seed + 3),
  };
  // K2: label permutation within blocks
  const rnd = rngFor(seed + 9), nulls = [];
  const byB = new Map(); block.forEach((b, r) => (byB.get(b) ?? byB.set(b, []).get(b)).push(r));
  const X = feats.map(A["SLOT+ATM"]);
  for (let p = 0; p < (DRY ? 5 : PERM); p++) {
    const yp = y.slice();
    for (const rows2 of byB.values()) { const lab = rows2.map((r) => y[r]); for (let k = lab.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [lab[k], lab[j]] = [lab[j], lab[k]]; } rows2.forEach((r, k) => { yp[r] = lab[k]; }); }
    const a = aucOf(cvScores(X, yp, block), yp); if (a != null) nulls.push(a);
  }
  return { tag, n: y.length, auc: res, diffs, permutationNull: { q95: round(quantile(nulls, 0.95)), mean: round(mean(nulls)), draws: nulls.length } };
}
const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);

async function main() {
  const t0 = Date.now();
  const book = loadBook();
  const lab = labelBook(book);
  const counts = {}; for (const k of lab.cls.values()) counts[k] = (counts[k] ?? 0) + 1;
  console.error(`book: ${book.stream.length} sentences, ${book.stream.reduce((a, s) => a + s.length, 0)} tokens; labelled forms ${JSON.stringify(counts)}`);
  const seed = seedFor("war-and-peace", "name-rule");
  const smp = drawSample({ ...book, ...lab }, N_PAIRS, seed);
  const causalFeat = buildCausal(book.stream, book.orig, lab.st);
  const nSent = book.stream.length;
  const blockOf = (t) => Math.min(BLOCKS - 1, Math.floor((t.s / nSent) * BLOCKS));
  const mk = (rows, F, modes = ["delete"], stream = book.stream) => impactBatch(stream, rows, { M, F, modes, seedTag: "wp", maxSeconds: Infinity });
  const result = { module: "eval/law/name-war-and-peace.mjs", dry: DRY, M, nPairsRequested: N_PAIRS, book: { sentences: nSent, labelled: counts }, sample: { laterPairs: smp.later.length / 2, firstPairs: smp.first.length / 2, firstDropped: smp.dropped, func: smp.func.length } };

  // LATER (frame-causal)
  console.error("reading LATER pairs…");
  const L = mk(smp.later, 0, ["delete", "sham"]);
  const Lrec = L.records.delete, Lsham = L.records.sham;
  const lf = recordsToFeatures(smp.later, Lrec, causalFeat);
  const ly = smp.later.map((t) => t.y), lb = smp.later.map(blockOf);
  // FIRST causal and non-causal
  console.error("reading FIRST pairs (causal, then F=32)…");
  const Fc = mk(smp.first, 0, ["delete"]), Fn = mk(smp.first, F_NONCAUSAL, ["delete"]);
  const ff = recordsToFeatures(smp.first, Fc.records.delete, causalFeat), fn = recordsToFeatures(smp.first, Fn.records.delete, causalFeat);
  const fy = smp.first.map((t) => t.y), fb = smp.first.map(blockOf);
  // FUNC reference
  const Fu = mk(smp.func, 0, ["delete"]);

  // O1 trace table
  const traceOf = (rows, recs) => { const o = {}; rows.forEach((t, k) => { const r = recs[k]; const key = t.cls; const b = (o[key] ??= { n: 0, nonNull: 0, noSlot: 0 }); b.n += 1; if (!r.isNull) b.nonNull += 1; if (r.noSlot) b.noSlot += 1; }); for (const b of Object.values(o)) { b.nonNullShare = round(b.nonNull / b.n); b.noSlotShare = round(b.noSlot / b.n); } return o; };
  result.O1_trace = { later: traceOf(smp.later, Lrec), laterByLabel: { NAME: round(share(smp.later.map((t, k) => (t.y === 1 ? !Lrec[k].isNull : null)).filter((x) => x !== null))), COMMON: round(share(smp.later.map((t, k) => (t.y === 0 ? !Lrec[k].isNull : null)).filter((x) => x !== null))) }, firstCausal: traceOf(smp.first, Fc.records.delete), firstNoncausal: traceOf(smp.first, Fn.records.delete), func: traceOf(smp.func, Fu.records.delete) };
  // O6 extent
  const ext = (rows, recs) => { const o = {}; rows.forEach((t, k) => { (o[t.y === 1 ? "NAME" : t.cls] ??= []).push(recs[k]); }); return Object.fromEntries(Object.entries(o).map(([c, rs]) => [c, { medianTokens: quantile(rs.map((r) => r.extent.tokens), 0.5), p90Tokens: quantile(rs.map((r) => r.extent.tokens), 0.9), medianFrames: quantile(rs.map((r) => r.extent.frames), 0.5) }])); };
  result.O6_extent = { later: ext(smp.later, Lrec), firstNoncausal: ext(smp.first, Fn.records.delete) };
  // K1 sham, K5 licence, K6 determinism
  result.K1_sham = { nullShare: round(share(Lsham.map((r) => r.isNull))), n: Lsham.length };
  const charLater = smp.later.map((t, k) => (t.cls === "CHAR" ? !Lrec[k].isNull : null)).filter((x) => x !== null);
  result.K5_licence = { charLaterNonNullShare: round(share(charLater)), n: charLater.length, pass: charLater.length ? share(charLater) >= 0.5 : null };
  const det = mk(smp.later.slice(0, 40), 0, ["delete"]);
  result.K6_determinism = { same: det.records.delete.filter((r, k) => r.hash === Lrec[k].hash).length, total: 40 };

  // O2-O4: LATER (primary), FIRST causal, FIRST non-causal, and CHAR-only LATER
  result.O2_later = armTable(smp.later, lf, ly, lb, "LATER matched by frequency, frame-causal", seed + 100);
  result.O2_first_causal = armTable(smp.first, ff, fy, fb, "FIRST matched by position, frame-causal", seed + 200);
  result.O5_first_noncausal = armTable(smp.first, fn, fy, fb, `FIRST matched by position, NON-CAUSAL F=${F_NONCAUSAL}`, seed + 300);
  const charIdx = smp.later.map((t, k) => k).filter((k) => smp.later[k].cls === "CHAR" || smp.later[k].y === 0);
  if (charIdx.length > 60) result.O2_later_char_vs_common = armTable(charIdx.map((k) => smp.later[k]), charIdx.map((k) => lf[k]), charIdx.map((k) => ly[k]), charIdx.map((k) => lb[k]), "LATER, CHAR vs matched COMMON", seed + 400);

  // K3 company shuffle on 200 LATER pairs
  const sub = smp.later.slice(0, Math.min(smp.later.length, DRY ? 40 : 400));
  const shuffled = shuffleSentences(book.stream, seedFor("war-and-peace", "shuffle"));
  const sh = mk(sub, 0, ["delete"], shuffled);
  const shf = recordsToFeatures(sub, sh.records.delete, causalFeat);
  const shy = sub.map((t) => t.y), shb = sub.map(blockOf);
  result.K3_company_shuffle = { n: sub.length, aucSlotAtm: round(aucOf(cvScores(shf.map((f) => [...f.SLOT, ...f.ATM]), shy, shb), shy)), unshuffledSameRows: round(aucOf(cvScores(lf.slice(0, sub.length).map((f) => [...f.SLOT, ...f.ATM]), shy, shb), shy)) };

  // verdicts
  const A = result.O2_later;
  const V1 = A.auc["SLOT+ATM"] >= 0.65 && A.auc["SLOT+ATM"] > A.permutationNull.q95;
  const d1 = A.diffs["SLOT+ATM+FREQ - FREQ"], d2 = A.diffs["SLOT+ATM+FREQ+BURST+COMPANY-LITE - FREQ+BURST+COMPANY-LITE"];
  const V2 = d1.lo > 0 && d2.lo > 0 && d1.point >= SESOI && d2.point >= SESOI;
  const Fa = result.O2_first_causal;
  const V3 = Fa.auc["SLOT+ATM"] >= 0.60 && Fa.auc["SLOT+ATM"] > Fa.permutationNull.q95;
  const V4 = A.diffs["SLOT+ATM - SPAN"].lo > 0;
  const k4 = A.auc.POSITION >= 0.45 && A.auc.POSITION <= 0.55;
  const under = result.K5_licence.pass === false || !k4 || result.K6_determinism.same !== 40;
  const verdict = under ? "UNDERPOWERED(reader)" : !V1 ? "FALSIFIED" : V2 ? (V3 ? "HOLDS" : "HOLDS-LATER") : "NOT-BEYOND-RIVALS";
  result.K4_position = { aucPositionLater: A.auc.POSITION, inside: k4 };
  result.verdict = { V1_discriminates: V1, V2_beyond_rivals: V2, V3_single_mention_causal: V3, V4_slot_not_span: V4, verdict, seconds: round((Date.now() - t0) / 1000, 1) };
  result.cost = { readingsLater: L.cost, readingsFirst: Fc.cost };
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, DRY ? "name-war-and-peace.dry.json" : "name-war-and-peace.json");
  fs.writeFileSync(file, JSON.stringify(result, null, 1));
  const sha = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  console.log(JSON.stringify({ ...result.verdict, headerSha256: sha, file }, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
