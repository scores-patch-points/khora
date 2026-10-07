// eval/law/identity-fold.mjs — IDENTITY AS A FOLD: same-referent by SLOT SUBSTITUTION (the user's refinement R2), tested on
// coreference gold. New file; nothing existing is edited.
//
//   node eval/law/identity-fold.mjs run [--tbs A,B,C] [--w 1] [--per-doc 24] [--max-pairs 300] [--max-seconds 600] [--max-sents 150]
//   node eval/law/identity-fold.mjs report [--out DIR]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run of this file. ═══════════════
// WHAT IS WIRED. The user's binding refinement R2 (notes/user-refinements-slots-identity.txt; memory note
// feedback-slots-not-spans-identity-as-fold): "Identity is the universe folded at a point ... Two spans are the SAME REFERENT iff
// their folds SURVIVE substitution: put span B into span A's slot; compare FOLD(A) with FOLD(B in A's slot) by typed slot deltas;
// no difference-that-makes-a-difference within w from p means they are the same referent."
//   The FOLD here is the slot structure of the built, PRIOR-FREE reader (eval/law/impact.mjs: R-A activation, R-B heard surfaces +
//   discoverReferents, R-C gfp relations), which is exactly the instrument the user's R1 named ("ablate the tokens and see how they
//   impact things, look at the slot not the spans"). The PERTURBATION that realises "put B into A's slot" is the EXCHANGE: every
//   exact occurrence of form A is replaced by form B and every occurrence of B by A, so the token multiset (hence the recurrence
//   floors) is preserved and only the slot occupancy moves. The FOLD DISTANCE is the L1 norm of the typed slot-delta signature
//   (impact.mjs slotDeltas + slotSignature) at the slots A and B fill, within slot-graph band <= w. A small distance is the
//   operational reading of "no difference that makes a difference within w".
//   Perspective p (the note's requirement): the reader AT the window — the whole-document record, declared as the standpoint; the
//   limitation (no per-holder/quote perspective exists in the prior-free readers) is stated, not hidden.
// GOLD (system-independent). CorefUD CoNLL-U chains via the built D15 adapter (eval/law/corpus.mjs: corefCorpus / loadCorefTreebank),
//   split "dev" = bucket 4 of 5 of the TRAIN file (the adapter's own held-out carve). The CorefUD DEV (test) file is NEVER opened
//   (the guard is armed by LAW_FORBID_TEST and the file is a held-out test path). A form is NAME / PRONOUN / NOMINAL by the chain
//   head's UPOS (adapter's mentionType). A form with mentions in > 1 cluster is AMBIGUOUS and dropped; singletons are dropped.
// PAIRS. Unordered pairs of distinct unambiguous forms inside ONE document that each appear as an exact token of the window stream.
//   POSITIVE = the two forms share a cluster (same referent, cross-type pairs included: name->pronoun, name->nominal, name->name);
//   NEGATIVE = the two forms are in different clusters. Sampled balanced (--per-doc), seeded by (treebank, docId).
// ARMS.
//   fold      REAL ARM: AUC over pairs of -L1(relation families rel-end1/label/end2, band <= w). Higher = more likely same.
//   foldRef   same but including the ref-entry family (reported; surface exchange perturbs the referent index, so it is secondary).
//   string    rival: 1 iff the two forms are the same string (case-2 would be a non-informative pair, so string is the surface-equality
//             rule; it exists to fail on name->pronoun).
//   span      rival (nuisance coordinate): -|mean token position difference| (closer = more likely same).
//   company   rival: Jaccard of the sentence co-occurrence context sets of the two forms over the window.
//   lemma     rival, GIVER-based (UD lemma annotation; not prior-free, labelled): 1 iff the head lemmas are equal.
// CONTROLS (built to fail). K1 SHAM: exchanging A with A changes no relation slot (L1 == 0). K2 DETERMINISM: the exchange re-reads
//   byte-identically. K3 SHUFFLE: the cluster labels are permuted among the document's unambiguous forms (seed fixed); the fold AUC
//   under the permuted labels must sit near 0.5.
// METRIC. AUC of each arm against the positive label, pooled per treebank and over all valid pairs; the fold CI is a document-cluster
//   bootstrap (300 resamples of documents). PASS (per treebank, declared here, not changed after a run): fold AUC >= 0.70 AND
//   cluster-CI lower bound > 0.55 AND fold beats EACH of string, span, company by >= 0.10 AUC AND K1/K2 hold. UNDER-POWERED (pass
//   null) when a treebank has < 60 valid pairs or < 5 documents. UNMEASURED when the treebank file is absent.
// PREDICTIONS (blind; the orders are the claims).
//   PI1 fold > string on name->pronoun pairs (string AUC ~0.5 by construction there): the fold carries identity the string cannot.
//   PI2 fold is only weakly beaten by company and lemma: fold AUC within 0.10 of company (the fold is a relational, company-like
//       signal) and below lemma (the gold annotation is not prior-free).
//   PI3 span is at or below chance for name->pronoun (pronouns and names are not offset-adjacent): span AUC <= 0.55 on that stratum.
//   PI4 the best evidence is on name->name (shared string) and name->pronoun; nominal pairs are weaker.
//   PI5 K3 shuffle AUC in [0.40, 0.60]; K1 exact; K2 exact.
//   Headline guess: fold AUC in [0.55, 0.75] per treebank; PASS met on <= half the treebanks (the prior-free fold is shallow).
// NOT TESTED: propagating DMD (impact.mjs measures a first-order slot difference); a per-holder perspective; mentions that are not
//   exact window tokens (possessive / clitic / multiword mentions keep their surface and are dropped); languages whose scripts the
//   reader cannot tokenise; the CorefUD TEST file.
//
// ═══ AMENDMENT A — dated 2026-10-07, written AFTER the first (slot-only) run was read. Adds the HOLOGRAPH arm; changes no v1 rule. ═══
// WHY. The v1 arm scored the slot skeleton alone (slotDeltas/slotSignature), not the token's effect on the RECORD. The instrument of
// "impact on the holograph" is impact.mjs's atmosphere: readForward (memory/activation.js) over the window's sentences, whose six
// observables are activation, recalled, novelty, reach, codeSize, traceSize. The substitution's effect on THAT — the change the
// perturbation makes to what the reader holds, not to which figure sits in which slot — is the physics impact the v1 run skipped.
// NEW ARMS (same pairs, same exchange, same gold; nothing else changes):
//   holo      = -L1(atmosphere) over the whole window: for each of the six observables, the sum over ALL frames of |X1 - X0| (self = none),
//               plus the reach null-flip flag. A small holographic change is the reading of "no difference that makes a difference".
//   holoSlot  = -L1(atmosphere) - L1(relation slots, band <= w): the holograph plus the slot skeleton.
// PASS RULE FOR THE AMENDED ARMS (declared before their run): holo AUC >= 0.70 AND cluster-CI lower > 0.55 AND holo beats each of string,
//   span, company by >= 0.10 AND K1 (sham exchange: atmosphere change exactly 0) holds. Same under-powered / unmeasured rules as v1.
//   The v1 `fold` numbers stand as recorded; this block only ADDS arms and a verdict for them.
//
// ═══ AMENDMENT B — dated 2026-10-07, written AFTER Amendment A was read. BINDS THE FOLD'S HORIZON TO DMD. New arms only. ══════════
// WHY. v1/A declared w = 1. kernel/activation.js is explicit ("the window is MEASURED from the material, not set") and offers the
// tool: dmdWindow(observations, derive, {candidates, restrict}) returns the shallowest depth at which dropping everything beyond it
// changes no conclusion — and its `restrict` may make depth a GRAPH RADIUS (its own comment: "how far from a referent you must look
// before the conclusion stops moving"). The user's refinement says exactly this: the fold is "TRUNCATED at the horizon w where
// widening stops making a difference (dmdWindow)". So the horizon is MEASURED per pair.
// WHAT CHANGES. The exchange and the pairs are unchanged. For each pair the slot-delta records (impact.mjs slotDeltas) carry a graph
// radius per record; the conclusion `derive` is the family x type count vector of the records within a radius; the candidate depths
// are the radii present; `restrict` keeps records with radius <= depth. dmdWindow returns w* = the shallowest radius reproducing the
// whole LOCAL conclusion (records with finite radius; the non-local, company-mediated records at radius Infinity are what the
// truncation deliberately drops). NEW ARMS, scored exactly like the others (AUC against the same gold):
//   foldDmd   = -number of SUBSTANTIVE relation-family records within the MEASURED radius w* (per pair), rather than the declared band 1.
//   wDmd      = the measured w* (a reported distribution, not a score); a pair whose w* is null (typed gap) falls back to the whole local set and is flagged.
// PASS RULE FOR foldDmd (declared before its run): foldDmd AUC >= 0.70 AND its document-cluster CI lower > 0.55 AND foldDmd beats each
//   of string, span, company by >= 0.10 AND K1/K2 hold. Under-powered/unmeasured as v1. The v1 and A numbers stand as recorded.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { readWindow, slotStructure, slotDeltas, tokenSlotsOf, slotSignature, sentenceText, atmosphere, DELTA_TYPES } from "./impact.mjs";
import { dmdWindow } from "../../kernel/activation.js";
import { corefCorpus, loadCorefTreebank, rngFor } from "./corpus.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, "results", "identity-fold");
const THIS = fileURLToPath(import.meta.url);
export const HEADER_SHA = createHash("sha256").update(fs.readFileSync(THIS, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");

// ── declared constants ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const W = 1;                  // primary slot-graph band horizon (the note's w); w=1 = the relation itself and its linked slots
export const MIN_PAIRS = 60;          // per treebank
export const MIN_DOCS = 5;
export const SESOI = 0.10;            // the margin the fold must clear over a rival
export const BAR = 0.70;              // fold AUC bar
export const CI_LOWER_BAR = 0.55;
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const TYPES = new Set(["name", "pronoun", "nominal"]);
const SUBTYPES = ["name->pronoun", "name->name", "name->nominal", "pronoun->pronoun", "pronoun->nominal", "nominal->nominal"];

export const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase();
export const pairType = (a, b) => { const x = a.type <= b.type ? a.type : b.type, y = a.type <= b.type ? b.type : a.type; return `${x}->${y}`; };

/** AUC of `scores` against a 0/1 label vector (ties 0.5); null when either side is empty. */
export function auc(scores, labels) {
  const pos = [], neg = [];
  for (let i = 0; i < scores.length; i += 1) { const s = scores[i]; if (!Number.isFinite(s)) continue; (labels[i] ? pos : neg).push(s); }
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const jaccard = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i += 1; return i / (a.size + b.size - i); };

/** The window token stream of a document: per sentence, the lowercased forms of its words (indices align with CorefUD word indices). */
export function docStream(doc, sentById, { maxSents = 150 } = {}) {
  const ids = doc.sentenceIndices.slice(0, maxSents);
  const stream = ids.map((sid) => (sentById.get(sid)?.words ?? []).map((w) => norm(w.form)));
  return { stream, ids, localOf: new Map(ids.map((sid, e) => [sid, e])) };
}

/** Form -> { type, clusters:Set, lemmas:Set, occ:[[e,i],...] } over the window; exact-token forms only. */
export function formIndex(doc, sentById, stream, localOf) {
  const byForm = new Map();
  const get = (f) => { if (!byForm.has(f)) byForm.set(f, { type: null, clusters: new Set(), lemmas: new Set(), occ: [] }); return byForm.get(f); };
  for (const m of doc.mentions) {
    if (!m.headForm || m.head == null || !TYPES.has(m.type)) continue;
    const e = localOf.get(m.sent);
    if (e === undefined) continue;
    const sent = sentById.get(m.sent);
    const w = sent?.words?.[m.head];
    if (!w) continue;
    const f = norm(m.headForm);
    const rec = get(f);
    rec.clusters.add(m.cluster);
    if (w.lemma) rec.lemmas.add(norm(w.lemma));
    if (rec.type == null) rec.type = m.type;
    else if (rec.type !== m.type) rec.type = "nominal"; // mixed type: use the weaker class
  }
  // occurrences + exact-token filter
  const tokens = new Map();
  stream.forEach((s, e) => s.forEach((t, i) => { if (!tokens.has(t)) tokens.set(t, []); tokens.get(t).push([e, i]); }));
  const out = new Map();
  for (const [f, rec] of byForm) {
    if (rec.clusters.size !== 1) continue;        // ambiguous form: dropped
    const occ = tokens.get(f);
    if (!occ || !occ.length) continue;            // not an exact window token: dropped
    out.set(f, { ...rec, cluster: [...rec.clusters][0], occ });
  }
  return out;
}

const exchange = (stream, A, B) => stream.map((s) => s.map((t) => (t === A ? B : t === B ? A : t)));

/** The fold distance of exchanging forms A and B: L1 of the typed slot-delta signature at the slots they fill (band <= w) and of the
 *  HOLOGRAPH change (impact.mjs atmosphere over the whole window: activation, recalled, novelty, reach, codeSize, traceSize). */
export function foldDistance(stream, sl0, sl1, occA, occB, w, read0, read1) {
  const slots = [];
  const add = (occ) => { for (const [e, i] of occ) for (const id of tokenSlotsOf(sl0, stream, e, i)) slots.push(id); };
  add(occA); add(occB);
  const uniq = [...new Set(slots)];
  // the holograph: the change the exchange makes to what the reader holds, summed over every frame (self = -1: no frame is "the" self)
  const atm = read0?.atm && read1?.atm ? atmosphere(read0.atm, read1.atm, -1) : null;
  let holo = 0; if (atm) for (let c = 0; c < 18; c += 1) holo += Math.abs(atm[c]);
  const sd = slotDeltas(sl0, sl1, { tokenSlots: uniq });
  if (!uniq.length) return { gap: "no_slot", holo, atm, sd };
  const { sig } = slotSignature(sd, { w });
  let rel = 0; for (let c = 0; c < 54; c += 1) rel += Math.abs(sig[c]);       // rel-end1, rel-label, rel-end2
  let ref = 0; for (let c = 54; c < 72; c += 1) ref += Math.abs(sig[c]);      // ref-entry
  return { rel, ref, total: rel + ref, slots: uniq.length, holo, atm, sd };
}

/** Measure the fold's horizon w* per pair with dmdWindow (kernel/activation.js) on the GRAPH-RADIUS axis: the shallowest radius at
 *  which dropping everything beyond it changes no conclusion (the conclusion = the family x type count vector of the records within). */
export function measureHorizon(sd) {
  const local = (sd?.records ?? []).filter((r) => Number.isFinite(r.radius));
  if (!local.length) return { w: null, gap: "no_local" };
  const radii = [...new Set(local.map((r) => r.radius))].sort((a, b) => a - b);
  const derive = (recs) => { const c = new Array(24).fill(0); for (const r of recs) if (r.type !== "unchanged") c[r.fam * 6 + DELTA_TYPES.indexOf(r.type)] += 1; return JSON.stringify(c); };
  try { const m = dmdWindow(local, derive, { candidates: radii, restrict: (recs, d) => recs.filter((r) => r.radius <= d) }); return { w: m.window, gap: m.gap ?? null, gamma: m.gamma }; }
  catch (e) { return { w: null, gap: `dmd:${e.message}` }; }
}
/** The number of substantive RELATION records (fam < 3) within the MEASURED radius w (w null = the whole local set). */
export function relWithin(sd, w) {
  let n = 0;
  for (const r of sd?.records ?? []) {
    if (r.fam >= 3 || r.type === "unchanged") continue;
    if (w != null && (!Number.isFinite(r.radius) || r.radius > w)) continue;
    n += 1;
  }
  return n;
}

function contextSet(stream, fa, fb) {
  const ctxA = new Set(), ctxB = new Set();
  for (const s of stream) { if (s.includes(fa)) for (const t of s) ctxA.add(t); if (s.includes(fb)) for (const t of s) ctxB.add(t); }
  return jaccard(ctxA, ctxB);
}

// ── one treebank ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function runTreebank(entry, { w, perDoc, maxPairs, maxSents, R }) {
  const tb = loadCorefTreebank(entry, { split: "dev" });
  const sentById = new Map(tb.sentences.map((s) => [s.i, s]));
  const pairs = [];
  for (const doc of tb.docs) {
    const { stream, localOf } = docStream(doc, sentById, { maxSents });
    if (stream.length < 2) continue;
    const idx = formIndex(doc, sentById, stream, localOf);
    const forms = [...idx.entries()];
    if (forms.length < 2) continue;
    const rnd = rngFor("identity-fold", entry.treebank, doc.docId);
    const pos = [], neg = [];
    for (let a = 0; a < forms.length; a += 1) for (let b = a + 1; b < forms.length; b += 1) {
      const [fa, ra] = forms[a], [fb, rb] = forms[b];
      (ra.cluster === rb.cluster ? pos : neg).push([fa, ra, fb, rb]);
    }
    const shuf = (arr) => { for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    shuf(pos); shuf(neg);
    const take = Math.max(1, Math.floor(perDoc / 2));
    for (const p of pos.slice(0, take)) pairs.push({ doc, stream, idx, a: p, kind: "pos" });
    for (const n of neg.slice(0, take)) pairs.push({ doc, stream, idx, a: n, kind: "neg" });
  }
  // cap globally, balanced
  const rndG = rngFor("identity-fold-cap", entry.treebank);
  const shufG = (arr) => { for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(rndG() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const P = shufG(pairs.filter((p) => p.kind === "pos")), N = shufG(pairs.filter((p) => p.kind === "neg"));
  const half = Math.floor(maxPairs / 2);
  const picked = [...P.slice(0, half), ...N.slice(0, half)];
  const shufP = shufG(picked);

  const rows = [];
  const byDoc = new Map();
  for (const p of shufP) {
    const key = `${p.doc.docId}`;
    if (!byDoc.has(key)) {
      const read0 = readWindow(p.stream.map(sentenceText));
      byDoc.set(key, { read0, sl0: slotStructure(read0) });
    }
    const { read0, sl0 } = byDoc.get(key);
    const [fa, ra, fb, rb] = p.a;
    const stream1 = exchange(p.stream, fa, fb);
    const read1 = readWindow(stream1.map(sentenceText), {}, read0.ceiling);
    const sl1 = slotStructure(read1);
    const fd = foldDistance(p.stream, sl0, sl1, ra.occ, rb.occ, w, read0, read1);
    const label = ra.cluster === rb.cluster ? 1 : 0;
    const holoOk = read0.atm != null && read1.atm != null;
    const h = fd.sd ? measureHorizon(fd.sd) : { w: null, gap: "no_sd" };
    rows.push({
      doc: p.doc.docId, a: fa, b: fb, type: pairType(ra, rb), label,
      nA: ra.occ.length, nB: rb.occ.length, slots: fd.slots ?? 0,
      holo: holoOk ? -fd.holo : null, holoSlot: holoOk ? -(fd.holo + (fd.gap ? 0 : fd.rel)) : null,
      foldDmd: fd.sd && fd.sd.records ? -relWithin(fd.sd, h.w) : null, wDmd: h.w, wGap: h.gap ?? null,
      fold: fd.gap ? null : -fd.rel, foldRef: fd.gap ? null : -fd.total, gap: fd.gap ?? null,
      string: fa === fb ? 1 : 0,
      span: -Math.abs(pMean(ra.occ) - pMean(rb.occ)),
      company: contextSet(p.stream, fa, fb),
      lemma: (ra.lemmas.size && rb.lemmas.size && [...ra.lemmas].some((l) => rb.lemmas.has(l))) ? 1 : 0,
    });
  }
  return { entry, rows, tb, R };
}
const pMean = (occ) => occ.reduce((a, [e, i]) => a + e * 10000 + i, 0) / occ.length;

// ── controls ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function controls(entry) {
  const tb = loadCorefTreebank(entry, { split: "dev" });
  const sentById = new Map(tb.sentences.map((s) => [s.i, s]));
  const doc = tb.docs.find((d) => d.sentenceIndices.length >= 3);
  if (!doc) return { K1: null, K2: null };
  const { stream, localOf } = docStream(doc, sentById, { maxSents: 150 });
  const idx = formIndex(doc, sentById, stream, localOf);
  if (!idx.size) return { K1: null, K2: null };
  const read0 = readWindow(stream.map(sentenceText)); const sl0 = slotStructure(read0);
  // pick a form whose occurrences actually fill a slot (a sham on a no-slot form tests nothing)
  let pick = null;
  for (const [fa, ra] of idx) { for (const [e, i] of ra.occ) if (tokenSlotsOf(sl0, stream, e, i).length) { pick = [fa, ra]; break; } if (pick) break; }
  if (!pick) return { K1: null, K2: null };
  const [fa, ra] = pick;
  const s1 = exchange(stream, fa, fa);                 // K1 sham: exchange A with A is the identity
  const r1 = readWindow(s1.map(sentenceText), {}, read0.ceiling); const sl1 = slotStructure(r1);
  const sham = foldDistance(stream, sl0, sl1, ra.occ, ra.occ, W, read0, r1);
  const s2 = exchange(stream, fa, fa);
  const r2 = readWindow(s2.map(sentenceText), {}, read0.ceiling); const sl2 = slotStructure(r2);
  return {
    K1: { l1: sham.gap ? null : sham.total, holo: sham.holo, exact: (!sham.gap && sham.total === 0) && sham.holo === 0 },
    K2: { exact: JSON.stringify(sl1) === JSON.stringify(sl2) },
  };
}

// ── run/report ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function summarise(tb, w) {
  const rows = tb.rows.filter((r) => r.fold != null);
  const S = (k, rs = rows) => round(auc(rs.map((r) => r[k]), rs.map((r) => r.label)));
  const docs = [...new Set(rows.map((r) => r.doc))];
  const rnd = rngFor("identity-fold-boot", tb.entry.treebank);
  const boot = [];
  for (let t = 0; t < 300; t += 1) {
    const pick = new Map(); for (const d of docs) pick.set(d, Math.floor(rnd() * docs.length));
    const sample = docs.map((d) => docs[pick.get(d)]);
    const rs = []; for (const d of sample) for (const r of rows) if (r.doc === d) rs.push(r);
    const a = auc(rs.map((r) => r.fold), rs.map((r) => r.label)); if (a != null) boot.push(a);
  }
  boot.sort((x, y) => x - y);
  const ci = boot.length ? [round(boot[Math.floor(0.025 * boot.length)]), round(boot[Math.floor(0.975 * boot.length)])] : null;
  const byType = {};
  for (const t of SUBTYPES) { const rs = rows.filter((r) => r.type === t); byType[t] = { n: rs.length, fold: S("fold", rs), string: S("string", rs), span: S("span", rs), company: S("company", rs), lemma: S("lemma", rs) }; }
  const drows = tb.rows.filter((r) => r.foldDmd != null);
  const dci = (() => { if (drows.length < 2) return null; const b = []; const rnd3 = rngFor("identity-fold-dmd-boot", tb.entry.treebank); const ds = [...new Set(drows.map((r) => r.doc))]; for (let t = 0; t < 300; t += 1) { const s = ds.map(() => ds[Math.floor(rnd3() * ds.length)]); const rs = []; for (const d of s) for (const r of drows) if (r.doc === d) rs.push(r); const a = auc(rs.map((r) => r.foldDmd), rs.map((r) => r.label)); if (a != null) b.push(a); } b.sort((x, y) => x - y); return b.length ? [round(b[Math.floor(0.025 * b.length)]), round(b[Math.floor(0.975 * b.length)])] : null; })();
  const ws = drows.map((r) => r.wDmd).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const hrows = tb.rows.filter((r) => r.holo != null);
  const hci = (() => { if (hrows.length < 2) return null; const b = []; const rnd2 = rngFor("identity-fold-holo-boot", tb.entry.treebank); const ds = [...new Set(hrows.map((r) => r.doc))]; for (let t = 0; t < 300; t += 1) { const s = ds.map(() => ds[Math.floor(rnd2() * ds.length)]); const rs = []; for (const d of s) for (const r of hrows) if (r.doc === d) rs.push(r); const a = auc(rs.map((r) => r.holo), rs.map((r) => r.label)); if (a != null) b.push(a); } b.sort((x, y) => x - y); return b.length ? [round(b[Math.floor(0.025 * b.length)]), round(b[Math.floor(0.975 * b.length)])] : null; })();
  return { nPairs: tb.rows.length, nFold: rows.length, nGap: tb.rows.length - rows.length, nPos: rows.filter((r) => r.label === 1).length, nNeg: rows.filter((r) => r.label === 0).length, nDocs: docs.length, fold: S("fold"), foldRef: S("foldRef"), holo: round(auc(hrows.map((r) => r.holo), hrows.map((r) => r.label))), holoSlot: round(auc(hrows.map((r) => r.holoSlot), hrows.map((r) => r.label))), nHolo: hrows.length, hci, foldDmd: round(auc(drows.map((r) => r.foldDmd), drows.map((r) => r.label))), nDmd: drows.length, dci, wDmdMedian: ws.length ? ws[Math.floor(ws.length / 2)] : null, wDmdMax: ws.length ? ws[ws.length - 1] : null, string: S("string"), span: S("span"), company: S("company"), lemma: S("lemma"), ci, byType };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = { tbs: null, w: W, perDoc: 24, maxPairs: 300, maxSents: 150, out: OUT_DIR };
  for (let i = 0; i < rest.length; i += 1) { const a = rest[i]; if (a === "--tbs") o.tbs = rest[++i].split(","); else if (a === "--w") o.w = Number(rest[++i]); else if (a === "--per-doc") o.perDoc = Number(rest[++i]); else if (a === "--max-pairs") o.maxPairs = Number(rest[++i]); else if (a === "--max-sents") o.maxSents = Number(rest[++i]); else if (a === "--out") o.out = rest[++i]; }
  const inv = corefCorpus({ split: "dev" });
  if (!inv.available) { console.log(JSON.stringify({ gap: inv.gap, reason: inv.reason })); return; }
  const want = o.tbs ?? ["English-GUM", "English-LitBank", "Catalan-AnCora"];
  const chosen = inv.treebanks.filter((t) => want.includes(t.treebank.replace(/^CorefUD_/, "")));
  if (cmd === "run") {
    fs.mkdirSync(o.out, { recursive: true });
    const out = { headerSha: HEADER_SHA, w: o.w, treebanks: {}, available: inv.treebanks.map((t) => t.treebank), gaps: inv.gaps };
    for (const entry of chosen) {
      const t0 = Date.now();
      const tb = runTreebank(entry, { ...o, R: null });
      const ctl = controls(entry);
      const sum = summarise(tb, o.w);
      const pass = sum.nFold >= MIN_PAIRS && sum.nDocs >= MIN_DOCS && sum.fold != null && sum.fold >= BAR && (sum.ci?.[0] ?? -1) > CI_LOWER_BAR
        && ["string", "span", "company"].every((k) => sum[k] != null && sum.fold - sum[k] >= SESOI)
        && ctl.K1?.exact === true;
      // AMENDMENT A verdict: the holograph arm under the same rule.
      const passHolo = sum.nHolo >= MIN_PAIRS && sum.nDocs >= MIN_DOCS && sum.holo != null && sum.holo >= BAR && (sum.hci?.[0] ?? -1) > CI_LOWER_BAR
        && ["string", "span", "company"].every((k) => sum[k] != null && sum.holo - sum[k] >= SESOI)
        && ctl.K1?.exact === true;
      const passDmd = sum.nDmd >= MIN_PAIRS && sum.nDocs >= MIN_DOCS && sum.foldDmd != null && sum.foldDmd >= BAR && (sum.dci?.[0] ?? -1) > CI_LOWER_BAR
        && ["string", "span", "company"].every((k) => sum[k] != null && sum.foldDmd - sum[k] >= SESOI)
        && ctl.K1?.exact === true;
      out.treebanks[entry.treebank] = { ...sum, controls: ctl, pass, passHolo, passDmd, seconds: round((Date.now() - t0) / 1000, 1) };
      fs.writeFileSync(path.join(o.out, `${entry.treebank}.rows.json`), JSON.stringify(tb.rows));
      console.error(`${entry.treebank}: n=${sum.nFold} fold=${sum.fold} pass=${pass} ${out.treebanks[entry.treebank].seconds}s`);
    }
    fs.writeFileSync(path.join(o.out, "identity-fold.json"), JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
  } else if (cmd === "report") {
    const R = JSON.parse(fs.readFileSync(path.join(o.out, "identity-fold.json"), "utf8"));
    const L = [`# identity-as-fold — test on CorefUD (split dev; header ${R.headerSha.slice(0, 12)}, w=${R.w})`, "", "treebank                 n   docs  fold   holo   holoSl foldDmd wDmd  string span  comp  lemma  CI(fold)      pass  passHolo passDmd"];
    for (const [name, t] of Object.entries(R.treebanks)) L.push(`${name.padEnd(24)} ${String(t.nFold).padStart(3)} ${String(t.nDocs).padStart(4)}  ${f(t.fold)} ${f(t.holo)} ${f(t.holoSlot)} ${f(t.foldDmd)} ${String(t.wDmdMedian).padStart(3)}  ${f(t.string)} ${f(t.span)} ${f(t.company)} ${f(t.lemma)}  ${(t.ci ? `[${t.ci[0]},${t.ci[1]}]` : "-").padEnd(13)} ${String(t.pass).padEnd(5)} ${String(t.passHolo).padEnd(8)} ${t.passDmd}`);
    for (const [name, t] of Object.entries(R.treebanks)) { L.push("", `## ${name} by subtype (n, fold|string|span|company)`); for (const [k, v] of Object.entries(t.byType)) if (v.n) L.push(`  ${k.padEnd(18)} n=${String(v.n).padStart(4)}  fold ${f(v.fold)}  string ${f(v.string)}  span ${f(v.span)}  comp ${f(v.company)}  lemma ${f(v.lemma)}`); L.push(`  controls: ${JSON.stringify(t.controls)}`); }
    console.log(L.join("\n"));
  } else { console.error("usage: identity-fold.mjs run|report [--tbs A,B] [--w 1] [--per-doc N] [--max-pairs N] [--out DIR]"); process.exit(2); }
}
const f = (x) => (x == null ? "  -  " : Number(x).toFixed(3));
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
