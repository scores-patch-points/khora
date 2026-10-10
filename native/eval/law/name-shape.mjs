// eval/law/name-shape.mjs — DO PROPER NOUNS HAVE A SPECIFIC SHAPE IN THE HOLOGRAPH, AND IS IT SPECIFIC TO WORD-ORDER FAMILIES?
//
//   node eval/law/name-shape.mjs run [--stems a,b] [--windows 4] [--tokens 60] [--dry] [--out DIR]
//   node eval/law/name-shape.mjs report [--out DIR]
//
// WHY (user, 2026-10-06): the single-token scores in name-rule-informal.mjs used one coordinate of the impact record and found the effect weak or
// absent in a novel. The user's position: "proper nouns have a specific shape in the holograph such that if you ablate all the ones we know are proper
// nouns there is a signature we can test against the ones we're not sure about", and "it is specific to word-order language families".
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file on any language) ════════════════════════════════════
// DISCLOSURE. Seen before this header: the beings ladder; the name-rule tests on IRC and War and Peace; the supervised War and Peace run, in which a
// FITTED classifier on the whole impact signature separated names at AUC 0.75 (and 0.63 at first mention) where the fixed one-coordinate score was at
// chance — a hint that a shape exists. impact.mjs's smoke on English DEV (150 tokens, M=8). No class-level joint ablation has been run on any text.
//
// OBJECT. SHAPE of a token class C in a window = the distribution, over (slot family, delta type), of the typed slot changes the reading shows when ALL
// tokens of class C in the window are deleted at once (a JOINT ablation), read by impact.mjs's three PRIOR-FREE readers with the null ceiling held fixed.
//   slot families (4): rel-end1, rel-label, rel-end2, ref-entry. delta types (6): emptied, retyped, rebound, refilled, shifted, born.
//   shape = the 24 counts of non-unchanged records divided by their sum (a distribution: it carries WHICH slots change and how, not how MANY).
//   Also kept: magnitude = non-unchanged records / all records. A window with no change has shape = null (a typed gap, not a zero).
// DATA. UD DEV (held-out gold) of the 25 stems of the competence card, case-stripped (lowercase word units, punctuation removed: impact.mjs's stream).
//   Gold UPOS is used ONLY to choose which tokens a class contains and to evaluate; no reader sees it, no prior, no capital.
// CLASSES. PROPN; NOUN; VERB; ADJ; RAND = a set the size of the PROPN set drawn from non-PROPN tokens matched token-for-token on the log2 stream
//   frequency of the form (10 draws per window: the null for "is the PROPN shape just the shape of deleting that many words of that frequency?").
// WINDOWS. --windows W windows per language of M consecutive sentences, M = min(128, floor(N / (W + 1))), ends spread evenly over [M, N).
// WORD-ORDER FAMILIES (data-derived, not typed): from each language's role-config prior (scripts/build-role-config.mjs, measured on its treebank) the pair
//   (share of subjects before their verb, share of objects before their verb); the 25 points are clustered by k-means with K = 3 (seeded, 20 restarts).
//   The clusters are named afterwards by their centroid (subject-first object-after = SVO-like, both-before = SOV-like, the rest = mixed/verb-first).
// TOKEN SAMPLE. Per language, --tokens PROPN tokens whose form occurs >= 2 times in the token's own causal window [s - M, s] (the readers need a
//   recurrence to hear anything), uniform over the stream with s >= M; each is paired with a non-PROPN NOUN/VERB/ADJ token matched on log2 stream
//   frequency and on the same recurrence condition. SINGLE-token impact profiles are the 24-d (family x type) distributions of impactOfToken's deltas.
//
// TESTS (per language, then across languages; every statistic below is fixed here).
//   T1 SPECIFIC     cos(shape_PROPN, mean shape_RAND) is BELOW the 5th percentile of cos(shape_RAND_i, shape_RAND_j) over the window-pooled random draws
//                   (the PROPN hole is not what deleting any set of that size and frequency leaves).
//   T2 DISTINCT     cos(PROPN half A, PROPN half B) > cos(PROPN half A, C half B) for each C in {NOUN, VERB, ADJ} (halves = even / odd windows):
//                   the PROPN shape reproduces and differs from the shapes of the other open classes.
//   T3 LABELS       token score = cos(profile, PROPN prototype) - mean cos(profile, NOUN/VERB/ADJ prototypes); a token whose ablation changes nothing scores 0.
//                   AUC of that score for PROPN vs the matched tokens, with prototypes from the OTHER half of the windows (a token is never scored by a
//                   prototype built from its own window). Fixed direction: higher = more PROPN-like.
//   T4 FAMILY       (a) the mean cosine between the PROPN shapes of two languages in the SAME family minus in DIFFERENT families, one-sided permutation test
//                   over family labels (B = 10000); (b) T3 with the prototype taken from the other languages of the same family vs of other families:
//                   mean AUC difference, and the number of languages whose same-family AUC exceeds the other-family AUC.
// CONTROLS BUILT TO FAIL. K1 sham: a joint ablation of ZERO tokens leaves every record unchanged (shape null). K2 label permutation of T3 (B = 1000).
//   K3 the RAND draws themselves: T1 must be reachable (the null distribution has spread) — if the RAND-RAND cosines are all within 0.01 of 1 the shapes
//   carry no information in that language and T1 is typed `uninformative`. K4 determinism: a re-run of one window reproduces the shape.
// VERDICT (SESOI 0.03 AUC, a bare provisional number). SHAPE EXISTS if T1 and T2 hold in >= 18 of the languages that are informative and T3's mean
//   AUC over languages is >= 0.60 with the K2 q95 below it. FAMILY-SPECIFIC if SHAPE EXISTS and T4a p <= 0.05 and T4b's mean difference >= 0.03 in favour
//   of the same family. Otherwise NOT SHOWN (the failed clause is named). UNINFORMATIVE where K3 fails.
// PREDICTIONS (blind; the orders are the claims).
//   P1 T1 holds in >= 18 of 25: the PROPN hole is not generic.   P2 T2 holds in >= 18 of 25.
//   P3 T3 mean AUC in [0.60, 0.80]: the shape labels held-out tokens above chance but far from perfectly (single-token ablations are small).
//   P4 T4a: same-family cosines exceed different-family cosines (p <= 0.05).   P5 T4b: same-family prototypes beat other-family prototypes by >= 0.03.
//   P6 The word-order clusters recover SOV-like {fas kor jpn hin urd tur} as one family (the measured order, not a typed list).
// NOT TESTED HERE: informal English (IRC) — run after this is read, with nicknames as the known set; first mentions (the readers are deaf to them
//   causally); non-UD text; identity as a fold.
//
// ═══ REVISION BEFORE THE FIRST RUN (user, 2026-10-06: "look at the shadow and imprint it makes on the holograph") ═══════════════════════════════
// The profile above is the SHADOW (what changes when the class is removed). Two further objects are added, all read from the same joint ablation:
//   IMPRINT  what the class occupies in the present reading X0: the distinct slots its tokens fill (impact.mjs tokenSlotsOf), counted by slot family
//            (rel-end1, rel-label, rel-end2, ref-entry) plus the tokens that fill NO slot; the imprint shape = those 5 counts / their sum.
//   SHADOW SPLIT  the non-unchanged records of the joint ablation split into DIRECT (the slot is one the class filled: its imprint) and COLLATERAL (every
//            other slot that changed: the rest of the field rearranging around the hole). collateral shape = the 24 (family x type) counts of the
//            collateral records / their sum. AMPLIFICATION = collateral records / direct records: how much the field changes beyond what the class itself held
//            (a measured difference-that-makes-a-difference, first order; a being that merely occupies slots has amplification near 0).
// TESTS ADDED (same machinery, same controls). T5 IMPRINT SPECIFIC: cos(imprint PROPN, mean imprint RAND) below the 5th percentile of RAND-RAND, as T1.
//   T6 AMPLIFICATION: amplification(PROPN) > mean amplification(RAND draws of the same window) per language; counted over languages.
//   T4c FAMILY by imprint shape and by collateral shape: the T4a statistic on each object.
// PREDICTIONS ADDED (blind). P7 T5 holds in >= 18 informative languages (the PROPN imprint is not the imprint of any equally frequent words).
//   P8 T6 holds in >= 18 of 25 (names are anchors: deleting them rearranges more of the field than deleting equally frequent words).
//   P9 the imprint shape is the more family-specific object (T4c imprint gap p <= 0.05) and the collateral shape is NOT (p > 0.05): word order decides WHERE a
//   name sits; what the rest of the field does when it goes is language-general.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { readConlluStream, makeSnapshot, impactOfToken, readWindow, slotStructure, slotDeltas, tokenSlotsOf, sentenceText, seedFor, rngFor } from "./impact.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..", "..");
const UD_EVAL = "/private/tmp/claude-501/ud-eval";
const STEMS25 = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"];
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes("--dry");
const W = Number(opt("--windows", DRY ? 2 : 4)), NTOK = Number(opt("--tokens", DRY ? 12 : 60));
const OUT = opt("--out", path.join(HERE, "results", "name-shape"));
const STEMS = opt("--stems", null)?.split(",") ?? STEMS25;
const FAM = 4, TYPES = ["emptied", "retyped", "rebound", "refilled", "shifted", "born"], DIM = FAM * TYPES.length;
const RAND_DRAWS = 10, CLASSES = ["PROPN", "NOUN", "VERB", "ADJ"], OPEN = new Set(["NOUN", "VERB", "ADJ"]);

const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : null; };
const bin = (n) => Math.floor(Math.log2(Math.max(1, n)));

/** counts[fam * 6 + type] of the NON-unchanged records of a slotDeltas result, and the magnitude (changed / all). */
function profileOf(sd) {
  const c = new Array(DIM).fill(0); let all = 0, changed = 0;
  for (const r of sd.records) { all += 1; if (r.type === "unchanged") continue; changed += 1; c[r.fam * TYPES.length + TYPES.indexOf(r.type)] += 1; }
  return { counts: c, changed, all };
}
const shapeOf = (counts) => { const t = counts.reduce((a, b) => a + b, 0); return t > 0 ? counts.map((x) => x / t) : null; };

// ── one language ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function runStem(stem) {
  const file = path.join(UD_EVAL, stem, "dev.conllu");
  if (!fs.existsSync(file)) return { stem, gap: "no_gold" };
  const { sents, upos } = readConlluStream(file);
  const N = sents.length;
  const M = Math.min(128, Math.floor(N / (W + 1)));
  if (M < 20) return { stem, gap: "too_short", N };
  const rnd = rngFor(seedFor("name-shape", stem));
  const freq = new Map(); for (const s of sents) for (const w of s) freq.set(w, (freq.get(w) ?? 0) + 1);
  const ends = Array.from({ length: W }, (_, k) => Math.floor(M + ((k + 0.5) * (N - M)) / W));
  const res = { stem, N, M, windows: [], tokens: [], gaps: [] };
  // JOINT ablations per window
  for (const e of ends) {
    const snap = makeSnapshot(sents, e, { M, F: 0 });
    const lo = snap.lo, hi = snap.hi;
    const gold = []; for (let s = lo; s <= hi; s++) gold.push(upos[s]);
    // a JOINT ablation of the tokens at the positions in `del` ("k:i"): shadow (all / direct / collateral) and imprint
    const joint = (del) => {
      const sents1 = snap.sents.map((sent, k) => sent.filter((_, i) => !del.has(`${k}:${i}`)));
      const reading1 = readWindow(sents1.map(sentenceText), snap.ropts, snap.ceiling ?? null);
      const sd = slotDeltas(snap.sl0, slotStructure(reading1));
      const I = new Set(); let noSlot = 0;
      for (const key of del) { const [k, i] = key.split(":").map(Number); const ids = tokenSlotsOf(snap.sl0, snap.sents, k, i); if (!ids.length) noSlot += 1; ids.forEach((id) => I.add(id)); }
      const fam = [0, 0, 0, 0];
      for (const id of I) { const [, kind, , f] = id.split(":"); fam[kind === "r" ? Number(f) : 3] += 1; }
      const all = new Array(DIM).fill(0), direct = new Array(DIM).fill(0), collateral = new Array(DIM).fill(0); let n = 0, changed = 0;
      for (const r of sd.records) { n += 1; if (r.type === "unchanged") continue; changed += 1; const c = r.fam * TYPES.length + TYPES.indexOf(r.type); all[c] += 1; (r.side === 0 && I.has(r.id) ? direct : collateral)[c] += 1; }
      const nd = direct.reduce((a, b) => a + b, 0), nc = collateral.reduce((a, b) => a + b, 0);
      return { counts: all, changed, all: n, direct, collateral, imprint: { fam, noSlot, tokens: del.size, slots: I.size }, amplification: nd ? nc / nd : null };
    };
    const delOf = (pred) => { const d = new Set(); gold.forEach((g, k) => g.forEach((u, i) => { if (pred(u, k, i)) d.add(`${k}:${i}`); })); return d; };
    const win = { end: e, lo, hi, classes: {}, rand: [], n: {} };
    for (const C of CLASSES) { win.n[C] = gold.flat().filter((u) => u === C).length; win.classes[C] = win.n[C] ? joint(delOf((u) => u === C)) : null; }
    // K1 sham: delete nothing
    if (e === ends[0]) { const z = joint(new Set()); win.sham = { changed: z.changed }; }
    // RAND: same number of NON-PROPN tokens, matched on log2 stream frequency token-for-token
    const propn = []; gold.forEach((g, k) => g.forEach((u, i) => { if (u === "PROPN") propn.push([k, i]); }));
    const pool = new Map(); gold.forEach((g, k) => g.forEach((u, i) => { if (u !== "PROPN") { const b = bin(freq.get(snap.sents[k][i])); (pool.get(b) ?? pool.set(b, []).get(b)).push([k, i]); } }));
    for (let d = 0; d < RAND_DRAWS && propn.length; d++) {
      const del = new Set();
      for (const [k, i] of propn) { const p = (pool.get(bin(freq.get(snap.sents[k][i]))) ?? []).filter(([a, b]) => !del.has(`${a}:${b}`)); if (p.length) { const [a, b] = p[Math.floor(rnd() * p.length)]; del.add(`${a}:${b}`); } }
      win.rand.push(joint(del));
    }
    res.windows.push(win);
    if (e === ends[0]) { const again = joint(delOf((u) => u === "PROPN")); res.determinism = { same: JSON.stringify(again.counts) === JSON.stringify(win.classes.PROPN?.counts) }; }
  }
  // SINGLE-token profiles: PROPN tokens with >= 2 occurrences in their causal window, each matched to a non-PROPN open-class token
  const occ = new Map(); sents.forEach((s, si) => s.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([si, i]); }));
  const recurs = (w, s) => { const o = occ.get(w); let c = 0; for (const [os] of o) if (os <= s && s - os <= M) c += 1; return c >= 2; };
  const cands = { P: [], O: new Map() };
  sents.forEach((s, si) => { if (si < M) return; s.forEach((w, i) => { if (!recurs(w, si)) return; if (upos[si][i] === "PROPN") cands.P.push([si, i, w]); else if (OPEN.has(upos[si][i])) { const b = bin(freq.get(w)); (cands.O.get(b) ?? cands.O.set(b, []).get(b)).push([si, i, w]); } }); });
  const picked = [];
  const shuf = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  for (const [si, i, w] of shuf(cands.P).slice(0, NTOK)) {
    const pool = cands.O.get(bin(freq.get(w))) ?? [];
    if (!pool.length) continue;
    const [sj, j, v] = pool[Math.floor(rnd() * pool.length)];
    picked.push({ s: si, i, id: w, y: 1 }, { s: sj, i: j, id: v, y: 0 });
  }
  const bySent = new Map(); picked.forEach((t) => (bySent.get(t.s) ?? bySent.set(t.s, []).get(t.s)).push(t));
  for (const [s, ts] of bySent) {
    const snap = makeSnapshot(sents, s, { M, F: 0 });
    for (const t of ts) {
      const rec = impactOfToken(snap, t.i, { mode: "delete", withC: false, keepDeltas: true });
      const p = rec.sd ? profileOf(rec.sd) : { counts: new Array(DIM).fill(0), changed: 0, all: 0 };
      res.tokens.push({ s: t.s, i: t.i, y: t.y, counts: p.counts, changed: p.changed, all: p.all, windowIndex: ends.findIndex((e) => e >= t.s) });
    }
  }
  res.gaps = res.windows.every((w) => !w.classes.PROPN) ? ["no_PROPN_in_any_window"] : [];
  return res;
}

// ── aggregation ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sumCounts = (list) => list.reduce((a, c) => a.map((x, i) => x + c[i]), new Array(DIM).fill(0));
function kmeans(points, K, seed, restarts = 20) {
  const rnd = rngFor(seed); let best = null;
  for (let r = 0; r < restarts; r++) {
    let cent = points.slice().sort(() => rnd() - 0.5).slice(0, K).map((p) => p.slice());
    let assign = new Array(points.length).fill(0);
    for (let it = 0; it < 100; it++) {
      assign = points.map((p) => { let bi = 0, bd = Infinity; cent.forEach((c, k) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = k; } }); return bi; });
      cent = cent.map((c, k) => { const m = points.filter((_, i) => assign[i] === k); return m.length ? [mean(m.map((p) => p[0])), mean(m.map((p) => p[1]))] : c; });
    }
    const sse = points.reduce((a, p, i) => a + (p[0] - cent[assign[i]][0]) ** 2 + (p[1] - cent[assign[i]][1]) ** 2, 0);
    if (!best || sse < best.sse) best = { sse, assign, cent };
  }
  return best;
}
function familiesOf(stems) {
  const pts = stems.map((s) => { const d = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", `role-config-${s}.json`), "utf8")); return [d.subject.before / Math.max(1, d.subject.total), d.object.before / Math.max(1, d.object.total)]; });
  const km = kmeans(pts, 3, seedFor("name-shape", "families"));
  const name = km.cent.map((c) => (c[0] >= 0.5 && c[1] >= 0.65 ? "SOV-like" : c[0] >= 0.5 && c[1] < 0.35 ? "SVO-like" : "mixed/verb-first"));
  const fam = {}; stems.forEach((s, i) => { fam[s] = `${name[km.assign[i]]}#${km.assign[i]}`; });
  return { fam, centroids: km.cent.map((c, k) => ({ cluster: k, name: name[k], subjectBefore: round(c[0], 2), objectBefore: round(c[1], 2) })), points: Object.fromEntries(stems.map((s, i) => [s, pts[i].map((x) => round(x, 2))])) };
}
const aucOf = (scores, y) => { const idx = scores.map((s, k) => [s, k]).sort((a, b) => a[0] - b[0]); let pos = 0, neg = 0, rs = 0; for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const avg = (i + 1 + j) / 2; for (let k = i; k < j; k++) { if (y[idx[k][1]]) { pos++; rs += avg; } else neg++; } i = j; } return pos && neg ? (rs - (pos * (pos + 1)) / 2) / (pos * neg) : null; };
const tokenScore = (counts, protos) => { const sh = shapeOf(counts); if (!sh) return 0; const cp = cos(sh, protos.PROPN); if (cp == null) return 0; const others = ["NOUN", "VERB", "ADJ"].map((c) => (protos[c] ? cos(sh, protos[c]) : null)).filter((x) => x != null); return cp - (others.length ? mean(others) : 0); };

function report(dir) {
  const R = {}; for (const s of STEMS25) { const p = path.join(dir, `${s}.json`); if (fs.existsSync(p)) { const r = JSON.parse(fs.readFileSync(p, "utf8")); if (r.windows?.length && !r.gaps?.length) R[s] = r; } }
  const stems = Object.keys(R);
  const rnd = rngFor(seedFor("name-shape", "report"));
  const out = { stems: stems.length, perLanguage: {}, families: null };
  const F = familiesOf(stems); out.families = { centroids: F.centroids, membership: F.fam, points: F.points };
  const shapes = {}, halves = {}, imprints = {}, collaterals = {};
  for (const s of stems) {
    const r = R[s], W2 = r.windows;
    const pool = (win, C) => win.map((w) => w.classes[C]?.counts).filter(Boolean);
    shapes[s] = Object.fromEntries(CLASSES.map((C) => [C, shapeOf(sumCounts(W2.flatMap((w) => (w.classes[C] ? [w.classes[C].counts] : []))))]));
    const A = W2.filter((_, k) => k % 2 === 0), B = W2.filter((_, k) => k % 2 === 1);
    halves[s] = { A: Object.fromEntries(CLASSES.map((C) => [C, shapeOf(sumCounts(pool(A, C)) )])), B: Object.fromEntries(CLASSES.map((C) => [C, shapeOf(sumCounts(pool(B, C)))])), Aw: A, Bw: B };
    // T1: PROPN vs random-set shapes; null = cosines between independent random draws, pooled over windows
    const randShapes = W2.flatMap((w) => w.rand.map((c) => shapeOf(c.counts)).filter(Boolean));
    const randMean = shapeOf(sumCounts(W2.flatMap((w) => w.rand.map((c) => c.counts))));
    const nullCos = []; for (let i = 0; i < randShapes.length; i++) for (let j = i + 1; j < randShapes.length; j++) { const c = cos(randShapes[i], randShapes[j]); if (c != null) nullCos.push(c); }
    const cP = shapes[s].PROPN && randMean ? cos(shapes[s].PROPN, randMean) : null;
    const q05 = quantile(nullCos, 0.05), spread = nullCos.length ? Math.max(...nullCos) - Math.min(...nullCos) : 0;
    const informative = nullCos.length > 5 && quantile(nullCos, 0.5) < 0.99;
    // T2
    const hA = halves[s].A, hB = halves[s].B;
    const self = hA.PROPN && hB.PROPN ? cos(hA.PROPN, hB.PROPN) : null;
    const vs = Object.fromEntries(["NOUN", "VERB", "ADJ"].map((C) => [C, hA.PROPN && hB[C] ? cos(hA.PROPN, hB[C]) : null]));
    const t2 = self != null && Object.values(vs).every((v) => v != null && self > v);
    // imprint (what the class occupies) and collateral shadow (what the rest of the field does), amplification
    const impOf = (list) => { const t = [0, 0, 0, 0, 0]; for (const x of list) { x.imprint.fam.forEach((v, k) => { t[k] += v; }); t[4] += x.imprint.noSlot; } const n = t.reduce((a, b) => a + b, 0); return n ? t.map((v) => v / n) : null; };
    const colOf = (list) => shapeOf(sumCounts(list.map((x) => x.collateral)));
    const ampOf = (list) => { const d = list.reduce((a, x) => a + x.direct.reduce((p, q) => p + q, 0), 0), c = list.reduce((a, x) => a + x.collateral.reduce((p, q) => p + q, 0), 0); return d ? c / d : null; };
    const pl = W2.map((w) => w.classes.PROPN).filter(Boolean), rl = W2.flatMap((w) => w.rand);
    const impP = impOf(pl), impR = impOf(rl), colP = colOf(pl), colR = colOf(rl);
    const impRandShapes = rl.map((x) => impOf([x])).filter(Boolean);
    const impNull = []; for (let i = 0; i < impRandShapes.length; i++) for (let j = i + 1; j < impRandShapes.length; j++) { const c = cos(impRandShapes[i], impRandShapes[j]); if (c != null) impNull.push(c); }
    const cImp = impP && impR ? cos(impP, impR) : null, q05i = quantile(impNull, 0.05);
    const infImp = impNull.length > 5 && quantile(impNull, 0.5) < 0.99;
    const ampP = ampOf(pl), ampR = ampOf(rl);
    imprints[s] = impP; collaterals[s] = colP;
    const extraOut = { imprintPropn: impP?.map((x) => round(x, 3)), imprintRandom: impR?.map((x) => round(x, 3)), imprintLabels: ["end1", "label", "end2", "entry", "no-slot"], T5: { cosImprintPropnVsRandom: round(cImp), nullQ05: round(q05i), informative: infImp, specific: infImp && cImp != null && q05i != null && cImp < q05i }, collateralVsRandom: colP && colR ? round(cos(colP, colR)) : null, T6: { amplificationPropn: round(ampP), amplificationRandom: round(ampR), higher: ampP != null && ampR != null && ampP > ampR }, slotsPerPropnToken: round(mean(pl.map((x) => x.imprint.slots / Math.max(1, x.imprint.tokens)))), noSlotShare: round(mean(pl.map((x) => x.imprint.noSlot / Math.max(1, x.imprint.tokens)))) };
    out.perLanguage[s] = { windows: W2.length, M: r.M, propnTokensDeleted: round(mean(W2.map((w) => w.n.PROPN)), 1), magnitudePropn: round(mean(W2.map((w) => (w.classes.PROPN ? w.classes.PROPN.changed / w.classes.PROPN.all : null)).filter((x) => x != null))), T1: { cosPropnVsRandom: round(cP), nullQ05: round(q05), nullMedian: round(quantile(nullCos, 0.5)), informative, specific: informative && cP != null && q05 != null && cP < q05 }, T2: { splitHalfPropn: round(self), vsNoun: round(vs.NOUN), vsVerb: round(vs.VERB), vsAdj: round(vs.ADJ), distinct: t2 }, determinism: r.determinism, sham: r.windows[0]?.sham, ...extraOut };
    void spread;
  }
  // T3 token labels: own-language prototypes (other half), and cross-language prototypes
  const protoOther = (s, half) => { const r = R[s]; const ws = r.windows.filter((_, k) => (half === "A" ? k % 2 === 1 : k % 2 === 0)); return Object.fromEntries(CLASSES.map((C) => [C, shapeOf(sumCounts(ws.flatMap((w) => (w.classes[C] ? [w.classes[C].counts] : []))))])); };
  const tokenHalf = (r, t) => (t.windowIndex % 2 === 0 ? "A" : "B");
  const classProtos = (langs) => Object.fromEntries(CLASSES.map((C) => [C, shapeOf(sumCounts(langs.flatMap((l) => R[l].windows.flatMap((w) => (w.classes[C] ? [shapeOf(w.classes[C].counts)?.map((x) => x * Math.max(1, w.classes[C].changed)) ?? new Array(DIM).fill(0)] : [])))))]));
  const auc3 = {}, aucSame = {}, aucOther = {}, perm = [];
  for (const s of stems) {
    const r = R[s]; if (r.tokens.length < 20) continue;
    const sc = r.tokens.map((t) => tokenScore(t.counts, protoOther(s, tokenHalf(r, t))));
    const y = r.tokens.map((t) => t.y === 1);
    auc3[s] = aucOf(sc, y);
    const same = stems.filter((l) => l !== s && F.fam[l] === F.fam[s]), other = stems.filter((l) => F.fam[l] !== F.fam[s]);
    if (same.length) { const pr = classProtos(same); aucSame[s] = aucOf(r.tokens.map((t) => tokenScore(t.counts, pr)), y); }
    if (other.length) { const pr = classProtos(other); aucOther[s] = aucOf(r.tokens.map((t) => tokenScore(t.counts, pr)), y); }
    out.perLanguage[s].T3 = { tokens: r.tokens.length, nullShare: { PROPN: round(mean(r.tokens.filter((t) => t.y === 1).map((t) => (t.changed === 0 ? 1 : 0)))), other: round(mean(r.tokens.filter((t) => t.y === 0).map((t) => (t.changed === 0 ? 1 : 0)))) }, aucOwnPrototype: round(auc3[s]), aucSameFamilyPrototype: round(aucSame[s]), aucOtherFamilyPrototype: round(aucOther[s]), family: F.fam[s] };
    // K2 label permutation (own prototype)
    const nulls = []; for (let p = 0; p < 200; p++) { const yp = y.slice(); for (let i = yp.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [yp[i], yp[j]] = [yp[j], yp[i]]; } const a = aucOf(sc, yp); if (a != null) nulls.push(a); }
    out.perLanguage[s].T3.permQ95 = round(quantile(nulls, 0.95));
  }
  // T4a family similarity of PROPN shapes
  const L = stems.filter((s) => shapes[s].PROPN);
  const pairs = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) pairs.push([L[i], L[j], cos(shapes[L[i]].PROPN, shapes[L[j]].PROPN)]);
  const gap = (lab) => { const a = pairs.filter(([x, y]) => lab[x] === lab[y]).map((p) => p[2]), b = pairs.filter(([x, y]) => lab[x] !== lab[y]).map((p) => p[2]); return mean(a) - mean(b); };
  const obs = gap(F.fam), labs = L.map((s) => F.fam[s]);
  let ge = 0; const B = 10000; for (let b = 0; b < B; b++) { const sh = labs.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } const lab = Object.fromEntries(L.map((s, i) => [s, sh[i]])); if (gap(lab) >= obs - 1e-12) ge += 1; }
  out.T4a = { meanSameMinusDifferent: round(obs), permutationP: round((ge + 1) / (B + 1)), pairs: pairs.length, languages: L.length, meanSame: round(mean(pairs.filter(([x, y]) => F.fam[x] === F.fam[y]).map((p) => p[2]))), meanDifferent: round(mean(pairs.filter(([x, y]) => F.fam[x] !== F.fam[y]).map((p) => p[2]))) };
  const famTest = (shapeMap) => {
    const LL = stems.filter((x) => shapeMap[x]);
    const pr = []; for (let i = 0; i < LL.length; i++) for (let j = i + 1; j < LL.length; j++) pr.push([LL[i], LL[j], cos(shapeMap[LL[i]], shapeMap[LL[j]])]);
    const g2 = (lab) => { const a = pr.filter(([x, y]) => lab[x] === lab[y]).map((q) => q[2]), b = pr.filter(([x, y]) => lab[x] !== lab[y]).map((q) => q[2]); return mean(a) - mean(b); };
    const ob = g2(F.fam), lb = LL.map((x) => F.fam[x]); let g = 0;
    for (let b = 0; b < 10000; b++) { const sh = lb.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } if (g2(Object.fromEntries(LL.map((x, i) => [x, sh[i]]))) >= ob - 1e-12) g += 1; }
    return { languages: LL.length, meanSameMinusDifferent: round(ob), permutationP: round((g + 1) / 10001) };
  };
  out.T4c = { imprint: famTest(imprints), collateral: famTest(collaterals), totalShadow: out.T4a ? { meanSameMinusDifferent: out.T4a.meanSameMinusDifferent, permutationP: out.T4a.permutationP } : null };
  out.T5 = { informative: stems.filter((x) => out.perLanguage[x].T5?.informative).length, specific: stems.filter((x) => out.perLanguage[x].T5?.specific).length };
  out.T6 = { languages: stems.filter((x) => out.perLanguage[x].T6?.amplificationPropn != null).length, propnHigher: stems.filter((x) => out.perLanguage[x].T6?.higher).length, meanAmplificationPropn: round(mean(stems.map((x) => out.perLanguage[x].T6?.amplificationPropn).filter((v) => v != null))), meanAmplificationRandom: round(mean(stems.map((x) => out.perLanguage[x].T6?.amplificationRandom).filter((v) => v != null))) };
  const both = stems.filter((s) => aucSame[s] != null && aucOther[s] != null);
  out.T4b = { languages: both.length, meanAucSame: round(mean(both.map((s) => aucSame[s]))), meanAucOther: round(mean(both.map((s) => aucOther[s]))), meanDiff: round(mean(both.map((s) => aucSame[s] - aucOther[s]))), sameBeatsOther: both.filter((s) => aucSame[s] > aucOther[s]).length };
  out.T3 = { languages: Object.keys(auc3).length, meanAuc: round(mean(Object.values(auc3).filter((x) => x != null))), above060: Object.values(auc3).filter((x) => x != null && x >= 0.6).length, aboveOwnPermQ95: Object.keys(auc3).filter((s) => auc3[s] > out.perLanguage[s].T3.permQ95).length };
  const inf = stems.filter((s) => out.perLanguage[s].T1.informative);
  out.T1 = { informative: inf.length, specific: inf.filter((s) => out.perLanguage[s].T1.specific).length };
  out.T2 = { languages: stems.length, distinct: stems.filter((s) => out.perLanguage[s].T2.distinct).length };
  const V_shape = out.T1.informative >= 1 && out.T1.specific >= 18 && out.T2.distinct >= 18 && out.T3.meanAuc >= 0.6 && out.T3.meanAuc > mean(Object.keys(auc3).map((s) => out.perLanguage[s].T3.permQ95));
  const V_family = V_shape && out.T4a.permutationP <= 0.05 && out.T4b.meanDiff >= 0.03;
  out.verdict = { shapeExists: V_shape, familySpecific: V_family, determinismAll: stems.every((s) => R[s].determinism?.same !== false), shamAllNull: stems.every((s) => (R[s].windows[0]?.sham?.changed ?? 0) === 0) };
  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (cmd === "run") {
    for (const stem of STEMS) { const t0 = Date.now(); const r = await runStem(stem); r.ms = Date.now() - t0; fs.writeFileSync(path.join(OUT, `${stem}.json`), JSON.stringify(r)); console.error(`${stem}: ${r.gap ?? "ok"} ${r.ms}ms (M=${r.M}, windows ${r.windows?.length}, tokens ${r.tokens?.length})`); }
  } else if (cmd === "report") {
    const o = report(OUT); const sha = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
    fs.writeFileSync(path.join(OUT, "_report.json"), JSON.stringify({ ...o, headerSha256: sha }, null, 1)); console.log(JSON.stringify({ ...o, headerSha256: sha }, null, 1));
  } else { console.error("usage: name-shape.mjs run|report"); process.exit(2); }
}
await main();
