// eval/name-candidates.mjs — the instrument for adapters/text/name-candidates.js
//
// ============================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written BEFORE the first run of the
// module on any UD split. Nothing below is edited after a result is seen; a
// failed claim is reported as failed (section "REPORTING").
// ============================================================================
//
// WHAT IS CLAIMED
//   nameCandidates() NOMINATES the words of a text that a language's RECEIVED
//   priors (UD-train POS prior + FramePrior@1) read as possible names, from a
//   SINGLE mention, with no capital letters, no recurrence and no whole-text
//   statistic. It never admits (standing is always "nominated"); a downstream
//   witness decides. It is a recall-first candidate generator for
//   de-identification: precision is reported, never optimised.
//
// DATA (II.7 held-out discipline)
//   Priors were built from UD TRAIN only (/private/tmp/claude-501/tb/<stem>).
//   Development and every number in the smoke run come from DEV only
//   (/private/tmp/claude-501/ud-eval/<stem>/dev.conllu). TEST is read ONCE, in
//   the Measure phase, by whoever runs `--split test`; this file's author did
//   not run it. The module's design (the arms and the single cut) was fixed in
//   the module header before this instrument ran; no cut was tuned on DEV.
//
// DEFINITIONS
//   document    the split's sentences, each sentence's `# text`, joined by "\n".
//   gold token  a UD token (or a multi-word-token range) whose UPOS is PROPN
//               (for a range: any component is PROPN). Gold = the UPOS column.
//               Aligned to character offsets in the document; alignment rate is
//               reported and is a LICENCE check (below).
//   word unit   a unit the module reads (after its ear: script segmentation,
//               proclitic/enclitic peeling), as nameUnits() exposes it.
//   flagged     a word unit of a candidate (candidate.evidence.words).
//   RECALL      a gold PROPN token is recalled when >= 0.5 of its characters lie
//               inside flagged units (0.5 = the repo's one declared settledness
//               cut, reused as the coverage rule: Korean eojeols, Chinese words
//               and UD tokens are not the module's units, so overlap, not
//               identity, is scored).
//   PRECISION   a flagged unit is correct when >= 0.5 of its characters lie in
//               gold PROPN tokens.   precision = correct / flagged units.
//   flag rate   flagged units / word units.
//   SINGLE-MENTION slice  gold PROPN tokens whose lowercased surface occurs
//               exactly ONCE among all aligned tokens of the document (any UPOS):
//               the arrival count recurrence needs (>= 2) can never be met.
//   N           the module's flagged-unit count; every control is compared AT N
//               (matched flag rate) unless stated.
//
// CONTROLS BUILT TO FAIL (II.23 / II.4)
//   C1 capital-only   surfaces.js extractSurfaces on the LOWERCASED sentences;
//                     a token is flagged when its lowercased form is a token of a
//                     returned surface. Expected ~0 recall on lowercased text.
//                     LICENCE: the same control on the ORIGINAL cased text must
//                     score strictly higher (> 0), else the control is broken and
//                     proves nothing.
//   C2 unseen-word    flag-every-unseen-word baseline at matched rate: the word
//      baseline       units the prior has not attested; if more than N, a seeded
//                     random N of them; if fewer than N, all of them PLUS seeded
//                     random other units up to N (it gets every advantage). 50
//                     seeded draws (seeds 1..50). Also a plain random-N baseline.
//                     "Beats" = module recall strictly greater than the MAX over
//                     the 50 draws (a permutation rank test, p <= 1/51).
//   C3 deranged       the frame prior's rows permuted: sorted frame keys, each
//      frame prior    key takes the distribution of the key floor(n/2) places on
//                     (a derangement for n >= 2); marginal unchanged. Compared
//                     at matched N by ranking every unit by its naming mass
//                     under the deranged prior (ties: seeded random), and also
//                     reported at its own declared-cut flag rate.
//   C4 no-frame       framePrior = null: the module must fall to typed gap
//      ablation       no_frame_prior and flag only prior-attested names. Reported
//                     at its own rate (it cannot reach N); the frame's
//                     contribution = module recall - ablation recall.
//   C5 shuffled gold  the module's flagged set is held fixed and the gold
//                     PROPN labels are permuted over the document's tokens (50
//                     seeded permutations). The metric must not credit a random
//                     token set: shuffled recall must be within 3 binomial SD of
//                     the token-level flag rate and far below real recall.
//
// LICENCE CHECKS (the claim is licensed only if these hold)
//   L1 alignment    >= 0.95 of UD tokens align to document offsets, else the
//                   stem's numbers are marked UNLICENSED.
//   L2 held-out     no DEV `# text` line appears in TRAIN (reported count).
//   L3 power        any pass/fail claim on a stem needs >= 30 gold PROPN tokens
//                   (>= 30 single-mention tokens for P3), else "underpowered",
//                   which is neither pass nor fail.
//   L4 case-blind   the module is also run on the original cased text (below).
//
// PRE-REGISTERED PREDICTIONS (P1..P5; the pass rule is the ONLY gate)
//   P1  UD English EWT dev, lowercased input (the informal genres are inside
//       EWT): module recall > C1 recall AND > max(C2 draws) AND > C3 recall at
//       matched N AND the C5 shuffled-gold sanity holds.
//   P2  caseless scripts (cmn-hans, arb, heb, kor, jpn) where C1 recall is 0
//       on the lowercased text: module recall > max(C2 draws) at matched N.
//       A stem where C1 recall is not 0, or that fails L1/L3, is listed and
//       excluded, never counted as a pass.
//   P3  SINGLE-MENTION: recall on the single-mention slice >= 0.5 x overall
//       recall. JUSTIFICATION OF THE FRACTION: 0.5 is the repo's one declared
//       settledness cut. A recurrence tier scores exactly 0 on this slice by
//       construction; a nominator that retains at least HALF of its overall
//       recall on the slice is "not mostly blind to single mentions". The slice
//       is expected to be harder (a name seen once in train is more often
//       unattested than a recurring one), so the ratio is expected below 1;
//       a ratio under 0.5 is reported as a FAILURE of P3, not tuned away.
//       Tested on every stem with L3 power.
//   P4  CASE INVARIANCE exactly: for every sentence, nameCandidates(original),
//       nameCandidates(lowercased) and nameCandidates(uppercased) return the
//       same (start,end,basis,mass,unseen) lists. Zero mismatches. (Sentences
//       whose upper/lower-casing changes string length, e.g. German eszett, are
//       counted and skipped, not hidden.)  Also pre-registered: CAUSALITY
//       (C0): candidates of a prefix of k sentences equal the first k
//       sentences' candidates from the full read; zero mismatches.
//   P5  a language with no prior returns the typed gap: language "zzz" (no
//       prior) -> candidates [] and gap reason no_prior; a grammar without a
//       frame prior -> gap no_frame_prior; text in a script with no candidate
//       prior, language undeclared -> gap language_unheard. No other
//       language's grammar is used (candidates must be []).
//
// PREDICTED NUMBERS (information; NOT gates, may be wrong, and will be reported
//   as wrong if so): eng lowercased dev recall 0.6-0.8, precision 0.25-0.55,
//   C1 recall < 0.02, C2 matched-rate recall 0.2-0.45; single-mention ratio
//   0.5-0.85. cmn-hans/kor recall 0.5-0.8 (frame mass on segmenter-merged
//   fragments). arb: PADT tags names as X, not PROPN, so G is expected < 30 and
//   P1-style claims there are "underpowered". Precision will be poor wherever a
//   common word is also a name (mike, greg, mark, will): reported, not hidden.
//
// THE CURVE (--curve; information only, never part of a pass rule)
//   precision and recall as the naming-mass cut t over the unseen/X-only arm
//   sweeps 0.05..0.95. The declared 0.5 is marked. Also the arm breakdown.
//
// REPORTING  every result is printed as JSON by this script, including failures,
//   with the pre-registered verdict computed by the pre-registered rule.
//
// AMENDMENTS (POST-RUN, LABELLED; the pre-registered rule above is unchanged and is
// still the ONLY verdict computed by the `verdict` block)
//   A1  After the FIRST run (eng dev, lowercased; saved output kept) the control
//       C3 as pre-registered ("rank every unit by naming mass") proved degenerate:
//       a settled common NOUN has naming mass 1.0, so the ranking ranks common
//       nouns first and the TRUE frame prior scored 0.2941 against the deranged
//       prior's 0.2935 under the same ranking. A control that cannot tell the true
//       prior from the deranged one is not licensed (II.23). It is still reported
//       as pre-registered (`C3_derangedFramePrior.atMatchedN_rankedByMass`) and the
//       P1 verdict still uses it as written; it is NOT evidence about the frame.
//   A2  Added, labelled POST-HOC, so the frame's real contribution can be read:
//       C3' = rank by (flagged-by-that-prior first, then mass) at matched N, for
//       the true and the deranged prior; C2b = the module's prior-attested arms
//       plus RANDOM unseen words up to N (what the frame has to beat). Also
//       per-arm precision/recall, and recall excluding DEV sentences that also
//       occur verbatim in TRAIN (L2 found duplicates). These can only make the
//       module look worse or equal; they do not change any pass/fail.
//   A3  The causality check's long read is capped at twice the prefix length (the
//       listener scores every sentence against every candidate prior; reading
//       2000 sentences twice was only a cost, not a stronger check).
//
// USAGE  node eval/name-candidates.mjs --stem <stem> --split dev|test
//          [--limit N sentences] [--curve] [--listener] [--deid] [--quick]
//        (--listener: language NOT declared, heard per sentence from the prefix;
//         --quick: skip the 50-draw controls' repetitions down to 10, smoke only;
//         --deid: also score the peer's de-identification fixtures)
// ============================================================================


import fs from "node:fs";
import { nameCandidates, nameUnits, MIN_SHARE } from "../adapters/text/name-candidates.js";
import { grammarFor } from "../the-fold/language-grammar.js";
import { extractSurfaces } from "../adapters/text/surfaces.js";

// ---- declared by the pre-registration above (not tuned) ---------------------
const COVER = MIN_SHARE;           // 0.5 coverage rule
const DRAWS = 50;                  // seeded draws per random control
const MIN_GOLD = 30;               // L3 power floor
const ALIGN_FLOOR = 0.95;          // L1
const P3_FRACTION = 0.5;           // P3
const CASELESS = ["cmn-hans", "arb", "heb", "kor", "jpn"];
const UD_DIR = "/private/tmp/claude-501/ud-eval";
const TB_DIR = "/private/tmp/claude-501/tb";
const DEID_DIR = "/private/tmp/claude-501/deid";

// ---- args --------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? (argv[i + 1]?.startsWith("--") || argv[i + 1] == null ? true : argv[i + 1]) : d; };
const STEM = arg("stem");
const SPLIT = arg("split", "dev");
const LIMIT = arg("limit") ? Number(arg("limit")) : Infinity;
const CURVE = argv.includes("--curve");
const LISTENER = argv.includes("--listener");
const QUICK = argv.includes("--quick");
const DEID = argv.includes("--deid");
const R = QUICK ? 10 : DRAWS;
if (!["dev", "test"].includes(SPLIT)) { console.error("--split dev|test"); process.exit(2); }
if (!STEM && !DEID) { console.error("usage: node eval/name-candidates.mjs --stem <stem> --split dev|test [--limit N] [--curve] [--listener] [--quick] [--deid]"); process.exit(2); }

const r4 = (x) => (x == null || Number.isNaN(x) ? null : Number(x.toFixed(4)));
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const lower = (t) => { let o = ""; for (const ch of t) { const l = ch.toLowerCase(); o += l.length === ch.length ? l : ch; } return o; };
const upper = (t) => t.toUpperCase();

// ---- CoNLL-U -----------------------------------------------------------------
function parseConllu(file, limit) {
  const sents = [];
  let cur = null;
  const push = () => { if (cur && cur.rows.length) sents.push(cur); cur = null; };
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# text = ")) { cur ??= { text: null, rows: [] }; cur.text = line.slice(9); continue; }
    if (line.startsWith("#")) { cur ??= { text: null, rows: [] }; continue; }
    if (!line.trim()) { push(); if (sents.length >= limit) break; continue; }
    const f = line.split("\t");
    if (f.length < 10) continue;
    cur ??= { text: null, rows: [] };
    cur.rows.push({ id: f[0], form: f[1], upos: f[3], misc: f[9] });
  }
  push();
  return sents.slice(0, limit);
}

/** UD units of a sentence: tokens, with a multi-word-token range collapsed to ONE unit (PROPN if any component is). */
function goldUnits(sent) {
  const units = [];
  for (let i = 0; i < sent.rows.length; i++) {
    const r = sent.rows[i];
    if (r.id.includes(".")) continue; // empty nodes
    const m = r.id.match(/^(\d+)-(\d+)$/);
    if (m) {
      const n = Number(m[2]) - Number(m[1]) + 1;
      const comps = sent.rows.slice(i + 1, i + 1 + n);
      units.push({ form: r.form, upos: comps.some((c) => c.upos === "PROPN") ? "PROPN" : comps[0]?.upos ?? "X" });
      i += n;
      continue;
    }
    units.push({ form: r.form, upos: r.upos });
  }
  return units;
}

function buildDocument(sents) {
  let doc = "";
  const tokens = [];
  let total = 0, aligned = 0;
  for (const s of sents) {
    const units = goldUnits(s);
    const text = s.text ?? units.map((u) => u.form).join(" ");
    const base = doc.length;
    let cursor = 0;
    for (const u of units) {
      total += 1;
      const at = text.indexOf(u.form, cursor);
      if (at < 0 || at - cursor > 3) continue;
      aligned += 1;
      tokens.push({ start: base + at, end: base + at + u.form.length, form: u.form.toLowerCase(), upos: u.upos, prop: u.upos === "PROPN" });
      cursor = at + u.form.length;
    }
    doc += text + "\n";
  }
  return { doc: doc.slice(0, -1), tokens, alignment: total ? aligned / total : 0, units: total };
}

// ---- scoring -------------------------------------------------------------------
const mark = (n, spans) => { const a = new Uint8Array(n); for (const s of spans) a.fill(1, s.start, s.end); return a; };
const share = (a, s, e) => { let c = 0; for (let i = s; i < e; i++) c += a[i]; return c / Math.max(1, e - s); };

/** Score a set of flagged unit spans against the document's gold tokens. */
function score(doc, tokens, spans, { labels = null } = {}) {
  const n = doc.length;
  const fl = mark(n, spans);
  const goldChars = mark(n, tokens.filter((t, i) => (labels ? labels[i] : t.prop)));
  const prop = [];
  tokens.forEach((t, i) => { if (labels ? labels[i] : t.prop) prop.push(i); });
  const recalled = new Set();
  for (const i of prop) { const t = tokens[i]; if (share(fl, t.start, t.end) >= COVER) recalled.add(i); }
  let tp = 0;
  for (const s of spans) if (share(goldChars, s.start, s.end) >= COVER) tp += 1;
  // token-level flag rate: tokens covered >= 0.5 by flagged chars
  let flaggedTokens = 0;
  for (const t of tokens) if (share(fl, t.start, t.end) >= COVER) flaggedTokens += 1;
  return { gold: prop.length, recalled: recalled.size, recall: prop.length ? recalled.size / prop.length : null, flagged: spans.length, tp, precision: spans.length ? tp / spans.length : null, tokenFlagRate: tokens.length ? flaggedTokens / tokens.length : null, recalledSet: recalled, propIdx: prop };
}
const brief = (sc) => ({ gold: sc.gold, recalled: sc.recalled, recall: r4(sc.recall), flagged: sc.flagged, tp: sc.tp, precision: r4(sc.precision), tokenFlagRate: r4(sc.tokenFlagRate) });

// ---- the controls ----------------------------------------------------------------
const deranged = (framePrior) => {
  if (!framePrior?.frames) return framePrior;
  const keys = Object.keys(framePrior.frames).sort();
  const n = keys.length;
  const shift = Math.max(1, Math.floor(n / 2));
  const frames = {};
  keys.forEach((k, i) => { frames[k] = framePrior.frames[keys[(i + shift) % n]]; });
  return { ...framePrior, frames };
};
const eligible = (u) => u.refused !== "below-glyph-floor" && u.refused !== "digit";

function capitalOnly(sentenceTexts, doc, tokensText) {
  let surfaces = [];
  try { surfaces = extractSurfaces(sentenceTexts.map((text) => ({ text }))); } catch (e) { return { error: String(e.message ?? e), spans: [] }; }
  const forms = new Set();
  for (const sf of surfaces) for (const w of String(sf.surface).toLowerCase().match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? []) forms.add(w);
  const spans = [];
  const re = /[\p{L}\p{M}\p{N}'’]+/gu;
  let m;
  const low = tokensText;
  while ((m = re.exec(low))) if (forms.has(m[0])) spans.push({ start: m.index, end: m.index + m[0].length });
  return { surfaces: surfaces.length, spans };
}

// ---- run ----------------------------------------------------------------------------
function readGrammar(stem) {
  const g = grammarFor(stem);
  if (!g.language) throw new Error(`no grammar for ${stem}: ${g.gap}`);
  return g;
}
const sig = (c) => `${c.start}-${c.end}|${c.basis}|${c.mass}|${c.unseen}|${c.standing}|${c.lane}`;
const spansOfCandidates = (cands) => cands.flatMap((c) => c.evidence.words.map((w) => ({ start: w.start, end: w.end })));

function p5Checks() {
  const out = {};
  const a = nameCandidates("kitchen soy mike went to boston", { language: "zzz" });
  out.noPrior = { candidates: a.candidates.length, gaps: a.gaps.map((g) => g.reason), pass: a.candidates.length === 0 && a.gaps.some((g) => g.reason === "no_prior") };
  const g = grammarFor("en");
  const b = nameCandidates("kitchen xyzzy qwerty", { grammar: { language: "eng", posPrior: g.posPrior, framePrior: null } });
  out.noFramePrior = { candidates: b.candidates.length, gaps: b.gaps.map((x) => x.reason), pass: b.candidates.length === 0 && b.gaps.some((x) => x.reason === "no_frame_prior") };
  const c = nameCandidates("ก็ไปที่นั่นกับเพื่อน แล้วก็กลับบ้าน");
  out.unheard = { candidates: c.candidates.length, gaps: c.gaps.map((x) => x.reason), pass: c.candidates.length === 0 && c.gaps.some((x) => x.reason === "language_unheard") };
  const d = nameCandidates("ไปกับเพื่อน", { grammar: { language: null, gap: "none" } });
  out.noGrammar = { candidates: d.candidates.length, gaps: d.gaps.map((x) => x.reason), pass: d.candidates.length === 0 && d.gaps.some((x) => x.reason === "no_prior") };
  out.pass = Object.values(out).every((x) => x.pass);
  return out;
}

function main() {
  const file = `${UD_DIR}/${STEM}/${SPLIT}.conllu`;
  const sents = parseConllu(file, LIMIT);
  const built = buildDocument(sents);
  const { doc, tokens } = built;
  const docLower = lower(doc);
  const grammar = readGrammar(STEM);
  const opts = LISTENER ? {} : { grammar };
  const t0 = Date.now();

  // L2: held-out — no DEV sentence text appears in TRAIN
  let heldout = { note: "train file not found" };
  const trainFile = `${TB_DIR}/${STEM}/train.conllu`;
  if (fs.existsSync(trainFile) && SPLIT !== "train") {
    const train = new Set();
    for (const line of fs.readFileSync(trainFile, "utf8").split("\n")) if (line.startsWith("# text = ")) train.add(line.slice(9));
    const dev = sents.map((s) => s.text).filter(Boolean);
    heldout = { devSentences: dev.length, inTrain: dev.filter((t) => train.has(t)).length };
    Object.defineProperty(heldout, "trainSet", { value: train, enumerable: false });
  }

  // the module, on LOWERCASED text (the instrument lowercases before the module sees it)
  const mod = nameUnits(docLower, opts);
  const spans = spansOfCandidates(mod.candidates);
  const sc = score(doc, tokens, spans);
  const N = spans.length;

  // single-mention slice
  const freq = new Map();
  for (const t of tokens) freq.set(t.form, (freq.get(t.form) ?? 0) + 1);
  const singleIdx = sc.propIdx.filter((i) => freq.get(tokens[i].form) === 1);
  const recalledSingle = singleIdx.filter((i) => sc.recalledSet.has(i)).length;
  const recallSingle = singleIdx.length ? recalledSingle / singleIdx.length : null;
  const propForm = new Map();
  for (const i of sc.propIdx) propForm.set(tokens[i].form, (propForm.get(tokens[i].form) ?? 0) + 1);
  const singleProp = sc.propIdx.filter((i) => propForm.get(tokens[i].form) === 1);
  const recallSingleProp = singleProp.length ? singleProp.filter((i) => sc.recalledSet.has(i)).length / singleProp.length : null;
  const multiIdx = sc.propIdx.filter((i) => freq.get(tokens[i].form) > 1);
  const recallRecurring = multiIdx.length ? multiIdx.filter((i) => sc.recalledSet.has(i)).length / multiIdx.length : null;

  // arms and misses
  const unitSpans = mod.units.map((u) => ({ ...u }));
  const armCounts = {};
  for (const c of mod.candidates) for (const w of c.evidence.words) { const k = String(w.basis).split("|")[0] + (String(w.basis).includes("frame") ? "|frame" : ""); armCounts[k] = (armCounts[k] ?? 0) + 1; }
  const fpForms = new Map();
  const goldChars = mark(doc.length, tokens.filter((t) => t.prop));
  for (const c of mod.candidates) for (const w of c.evidence.words) if (share(goldChars, w.start, w.end) < COVER) fpForms.set(w.text, (fpForms.get(w.text) ?? 0) + 1);
  const missReasons = {};
  const missForms = new Map();
  for (const i of sc.propIdx) {
    if (sc.recalledSet.has(i)) continue;
    const t = tokens[i];
    const over = unitSpans.filter((u) => u.start < t.end && u.end > t.start);
    const why = over.length ? over.map((u) => u.refused ?? (u.flagged ? "flagged-partial" : `not-nominated:${u.settled ?? "unsettled"}`)).join("+") : "no-unit";
    missReasons[why] = (missReasons[why] ?? 0) + 1;
    missForms.set(t.form, (missForms.get(t.form) ?? 0) + 1);
  }
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([form, n]) => `${form}:${n}`);

  // C1 capital-only (lowercased and, as the licence, the original cased text)
  const sentTexts = sents.map((s) => s.text ?? "");
  const cap = capitalOnly(sentTexts.map(lower), doc, docLower);
  const capCased = capitalOnly(sentTexts, doc, docLower);
  const capLowerScore = score(doc, tokens, cap.spans);
  const capCasedScore = score(doc, tokens, capCased.spans);

  // C2 unseen-word baseline at matched rate; plain random baseline
  const pool = mod.units.filter(eligible);
  const unseenPool = pool.filter((u) => u.unseen);
  const otherPool = pool.filter((u) => !u.unseen);
  const unseenDraws = [], randomDraws = [];
  for (let d = 1; d <= R; d++) {
    const rnd = mulberry32(d);
    let pick;
    if (unseenPool.length >= N) pick = shuffle(unseenPool, rnd).slice(0, N);
    else pick = unseenPool.concat(shuffle(otherPool, rnd).slice(0, N - unseenPool.length));
    unseenDraws.push(score(doc, tokens, pick));
    randomDraws.push(score(doc, tokens, shuffle(pool, mulberry32(1000 + d)).slice(0, N)));
  }
  const summarise = (draws) => ({ draws: draws.length, recallMean: r4(draws.reduce((a, x) => a + x.recall, 0) / draws.length), recallMax: r4(Math.max(...draws.map((x) => x.recall))), precisionMean: r4(draws.reduce((a, x) => a + x.precision, 0) / draws.length) });
  const unseenSummary = { ...summarise(unseenDraws), unseenPool: unseenPool.length, N, padded: unseenPool.length < N };
  const randomSummary = summarise(randomDraws);

  // C3 deranged frame prior (matched N by naming-mass rank; and at its own declared-cut rate)
  const gD = { ...grammar, framePrior: deranged(grammar.framePrior) };
  const modD = nameUnits(docLower, { grammar: gD });
  const ownD = score(doc, tokens, spansOfCandidates(modD.candidates));
  const rankedD = shuffle(modD.units.filter(eligible), mulberry32(7)).sort((a, b) => (b.mass ?? -1) - (a.mass ?? -1)).slice(0, N);
  const matchedD = score(doc, tokens, rankedD);
  // the TRUE prior ranked the same way (so the comparison is rank-vs-rank)
  const rankedT = shuffle(mod.units.filter(eligible), mulberry32(7)).sort((a, b) => (b.mass ?? -1) - (a.mass ?? -1)).slice(0, N);
  const matchedT = score(doc, tokens, rankedT);

  // A2 (POST-HOC): flagged-first ranking at matched N, true vs deranged; C2b; per-arm; non-duplicate sentences
  const flaggedFirst = (units, seed) => shuffle(units.filter(eligible), mulberry32(seed)).sort((a, b) => (Number(b.flagged) - Number(a.flagged)) || ((b.pathB ? b.mass ?? -1 : -1) - (a.pathB ? a.mass ?? -1 : -1))).slice(0, N);
  const postHoc = {
    C3prime_trueFramePrior_flaggedFirst_atN: brief(score(doc, tokens, flaggedFirst(mod.units, 11))),
    C3prime_derangedFramePrior_flaggedFirst_atN: brief(score(doc, tokens, flaggedFirst(modD.units, 11))),
  };
  const attestedArm = mod.units.filter((u) => String(u.arm ?? "").startsWith("prior:"));
  const c2b = [];
  for (let d = 1; d <= R; d++) c2b.push(score(doc, tokens, attestedArm.concat(shuffle(mod.units.filter((u) => eligible(u) && u.unseen), mulberry32(d)).slice(0, Math.max(0, N - attestedArm.length)))));
  postHoc.C2b_attestedArms_plus_random_unseen_atN = summarise(c2b);
  const armScore = (pred) => { const sp = mod.candidates.flatMap((c) => c.evidence.words).filter(pred).map((w) => ({ start: w.start, end: w.end })); const a = score(doc, tokens, sp); return { flagged: a.flagged, tp: a.tp, precision: r4(a.precision), recallContribution: r4(a.recalled / Math.max(1, sc.gold)) }; };
  postHoc.byArm = { attestedPROPN: armScore((w) => String(w.basis).startsWith("prior:")), unseenOrXFrame: armScore((w) => /^(unseen|x-only)\|/.test(String(w.basis))), titleOrInitial: armScore((w) => /^(title|initial)$/.test(String(w.basis))) };
  {
    const dupSet = new Set(sents.filter((x) => x.text && heldout.trainSet?.has(x.text)).map((x) => x.text));
    let off = 0; const dupRanges = [];
    for (const x of sents) { const len = (x.text ?? "").length; if (dupSet.has(x.text)) dupRanges.push([off, off + len]); off += len + 1; }
    const inDup = (t) => dupRanges.some(([a, b]) => t.start >= a && t.end <= b);
    const keep = sc.propIdx.filter((i) => !inDup(tokens[i]));
    postHoc.recallExcludingTrainDuplicateSentences = { gold: keep.length, recall: r4(keep.filter((i) => sc.recalledSet.has(i)).length / Math.max(1, keep.length)) };
  }

  // C4 no-frame-prior ablation
  const gN = { ...grammar, framePrior: null };
  const modN = nameUnits(docLower, { grammar: gN });
  const ablation = score(doc, tokens, spansOfCandidates(modN.candidates));

  // C5 shuffled gold
  const labelsBase = tokens.map((t) => t.prop);
  const shuf = [];
  for (let d = 1; d <= R; d++) shuf.push(score(doc, tokens, spans, { labels: shuffle(labelsBase, mulberry32(5000 + d)) }));
  const shufMean = shuf.reduce((a, x) => a + x.recall, 0) / shuf.length;
  const pFlag = sc.tokenFlagRate;
  const sd = Math.sqrt((pFlag * (1 - pFlag)) / Math.max(1, sc.gold));
  const shuffled = { recallMean: r4(shufMean), recallMax: r4(Math.max(...shuf.map((x) => x.recall))), tokenFlagRate: r4(pFlag), sd3: r4(3 * sd), withinThreeSd: Math.abs(shufMean - pFlag) <= 3 * sd, farBelowReal: shufMean < sc.recall };

  // P4: case invariance (per sentence, declared or listener grammar), plus C0 causality
  let inv = { sentences: sents.length, compared: 0, skippedLengthChange: 0, mismatchesLower: 0, mismatchesUpper: 0, examples: [] };
  // (in listener mode every call builds a fresh listener, which is slow: the per-sentence check is sampled to the first 40)
  const invSents = LISTENER ? sents.slice(0, 40) : sents;
  inv.sentences = invSents.length;
  for (const s of invSents) {
    const t = s.text ?? "";
    if (!t) continue;
    const base = nameCandidates(t, opts).candidates.map(sig).join(";");
    const lo = lower(t), up = upper(t);
    if (up.length !== t.length) { inv.skippedLengthChange += 1; continue; }
    inv.compared += 1;
    if (nameCandidates(lo, opts).candidates.map(sig).join(";") !== base) { inv.mismatchesLower += 1; if (inv.examples.length < 3) inv.examples.push({ text: t.slice(0, 80), as: "lower" }); }
    if (nameCandidates(up, opts).candidates.map(sig).join(";") !== base) { inv.mismatchesUpper += 1; if (inv.examples.length < 3) inv.examples.push({ text: t.slice(0, 80), as: "upper" }); }
  }
  inv.pass = inv.compared > 0 && inv.mismatchesLower === 0 && inv.mismatchesUpper === 0;
  // also on the whole cased document vs lowercased document
  const casedDoc = nameCandidates(doc, opts).candidates.map(sig).join(";");
  const lowDoc = nameCandidates(docLower, opts).candidates.map(sig).join(";");
  inv.wholeDocumentIdentical = casedDoc === lowDoc;
  inv.pass = inv.pass && inv.wholeDocumentIdentical;

  const K = Math.min(150, sents.length);
  const prefixText = sents.slice(0, K).map((s) => s.text ?? "").join("\n");
  const causalOpts = [["declared", { grammar }], ["listener", {}]];
  const causality = {};
  for (const [name, o] of causalOpts) {
    const full = nameCandidates(sents.slice(0, Math.min(sents.length, 2 * K)).map((s) => s.text ?? "").join("\n"), o).candidates.filter((c) => c.end <= prefixText.length).map(sig).join(";");
    const pre = nameCandidates(prefixText, o).candidates.map(sig).join(";");
    causality[name] = { sentences: K, identical: full === pre };
  }
  causality.pass = Object.values(causality).every((x) => x === true || x.identical);

  // curve (information only)
  let curve = null;
  if (CURVE) {
    curve = [];
    const prior = (u) => String(u.arm ?? "").startsWith("prior:");
    const sweep = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
    for (const t of sweep) {
      const picked = mod.units.filter((u) => prior(u) || (u.pathB && u.mass != null && u.mass >= t));
      const c = score(doc, tokens, picked);
      const cs = singleIdx.length ? singleIdx.filter((i) => c.recalledSet.has(i)).length / singleIdx.length : null;
      curve.push({ cut: t, declared: t === 0.5, flagged: c.flagged, recall: r4(c.recall), recallSingle: r4(cs), precision: r4(c.precision) });
    }
    const priorOnly = score(doc, tokens, mod.units.filter(prior));
    curve.push({ cut: "prior-attested arms only (no unseen arm)", flagged: priorOnly.flagged, recall: r4(priorOnly.recall), precision: r4(priorOnly.precision) });
  }

  // verdicts (the pre-registered rule, mechanically)
  const licensed = built.alignment >= ALIGN_FLOOR;
  const powered = sc.gold >= MIN_GOLD;
  const beatsBaseline = sc.recall > unseenSummary.recallMax;
  const verdict = { licensedAlignment: licensed, powered };
  if (STEM === "eng") {
    verdict.P1 = !licensed || !powered ? "unlicensed-or-underpowered" : (sc.recall > capLowerScore.recall && beatsBaseline && sc.recall > matchedD.recall && shuffled.withinThreeSd && shuffled.farBelowReal && capCasedScore.recall > capLowerScore.recall && capCasedScore.recall > 0) ? "PASS" : "FAIL";
    verdict.P1_detail = { moduleRecall: r4(sc.recall), capitalOnlyRecall: r4(capLowerScore.recall), capitalOnlyCasedRecall: r4(capCasedScore.recall), unseenBaselineMax: unseenSummary.recallMax, derangedMatchedRecall: r4(matchedD.recall), shuffledGoldOk: shuffled.withinThreeSd && shuffled.farBelowReal };
  } else verdict.P1 = "n/a (English claim)";
  if (CASELESS.includes(STEM)) {
    verdict.P2 = !licensed || !powered ? "excluded: unlicensed-or-underpowered" : capLowerScore.recall !== 0 ? "excluded: capital-only recall is not 0" : beatsBaseline ? "PASS" : "FAIL";
    verdict.P2_detail = { moduleRecall: r4(sc.recall), capitalOnlyRecall: r4(capLowerScore.recall), unseenBaselineMax: unseenSummary.recallMax };
  } else verdict.P2 = "n/a (caseless-script claim)";
  verdict.P3 = singleIdx.length < MIN_GOLD ? `underpowered (single-mention gold ${singleIdx.length} < ${MIN_GOLD})` : (recallSingle >= P3_FRACTION * sc.recall ? "PASS" : "FAIL");
  verdict.P3_detail = { overall: r4(sc.recall), singleMention: r4(recallSingle), ratio: r4(recallSingle / sc.recall), fraction: P3_FRACTION, singleN: singleIdx.length };
  verdict.P4 = inv.pass ? "PASS" : "FAIL";
  verdict.C0_causality = causality.pass ? "PASS" : "FAIL";
  verdict.P5 = p5Checks().pass ? "PASS" : "FAIL";

  const out = {
    stem: STEM, split: SPLIT, mode: LISTENER ? "language heard per sentence (listener)" : "language declared", sentences: sents.length, ms: Date.now() - t0,
    licence: { alignment: r4(built.alignment), L1: licensed, goldPropnTokens: sc.gold, L3: powered, heldout, tokens: tokens.length },
    module: {
      language: mod.language, languages: mod.languages, regime: mod.regime, gaps: mod.gaps, candidates: mod.candidates.length, flaggedUnits: N,
      ...brief(sc), recallSingleMention: r4(recallSingle), singleMentionGold: singleIdx.length, singleRecalled: recalledSingle,
      recallSingleMentionByPropnFormOnce: r4(recallSingleProp), recallRecurring: r4(recallRecurring), recurringGold: multiIdx.length,
      arms: armCounts, topFalsePositives: top(fpForms, 15), topMissedForms: top(missForms, 15), missReasons,
    },
    postHoc,
    controls: {
      C1_capitalOnly_lowercased: { surfaces: cap.surfaces, ...brief(capLowerScore), error: cap.error },
      C1_licence_capitalOnly_cased: { surfaces: capCased.surfaces, ...brief(capCasedScore), error: capCased.error },
      C2_unseenWordBaseline_matchedRate: unseenSummary,
      C2_randomWordBaseline_matchedRate: randomSummary,
      C3_derangedFramePrior: { atMatchedN_rankedByMass: brief(matchedD), trueFramePrior_atMatchedN_rankedByMass: brief(matchedT), atOwnDeclaredCut: brief(ownD) },
      C4_noFramePriorAblation: { ...brief(ablation), gaps: modN.gaps.map((g) => g.reason) },
      C5_shuffledGold: shuffled,
    },
    P4_caseInvariance: inv,
    C0_causality: causality,
    P5_typedGaps: p5Checks(),
    verdict,
    ...(curve ? { curve } : {}),
  };
  console.log(JSON.stringify(out, null, 2));
}

// ---- the peer's de-identification fixtures (information; no gate) ---------------------
function deid() {
  const g = grammarFor("en");
  const res = {};
  for (const f of ["cases", "cases-heldout"]) {
    const { cases } = JSON.parse(fs.readFileSync(`${DEID_DIR}/${f}.json`, "utf8"));
    let gold = 0, caught = 0, extra = 0, capCaught = 0, negCases = 0, negTouched = 0;
    const misses = [], extras = [];
    for (const c of cases) {
      const r = nameCandidates(c.text.toLowerCase(), { grammar: g });
      const words = new Set(r.candidates.flatMap((x) => x.evidence.words.map((w) => w.text)));
      const goldWords = [...new Set(c.gold.flatMap((x) => x.toLowerCase().replace(/^@/, "").split(/\s+/)).filter((w) => w.length >= 2 && !/^(and|the)$/.test(w)))];
      const capWords = new Set(extractSurfaces([{ text: c.text.toLowerCase() }]).flatMap((x) => String(x.surface).toLowerCase().split(/\s+/)));
      let missed = [];
      for (const w of goldWords) { gold += 1; if (words.has(w)) caught += 1; else missed.push(w); if (capWords.has(w)) capCaught += 1; }
      const ex = [...words].filter((w) => !goldWords.includes(w));
      extra += ex.length;
      if (!goldWords.length) { negCases += 1; if (ex.length) negTouched += 1; }
      if (missed.length) misses.push({ id: c.id, text: c.text.slice(0, 90), missed });
      if (ex.length) extras.push({ id: c.id, extra: ex });
    }
    res[f] = { cases: cases.length, goldWords: gold, caught, recall: r4(caught / gold), capitalOnlyCaught: capCaught, extraFlaggedWords: extra, noNameCases: negCases, noNameCasesTouched: negTouched, misses, extras: extras.slice(0, 12) };
  }
  console.log(JSON.stringify({ deid: res }, null, 2));
}

if (DEID) deid(); else main();
