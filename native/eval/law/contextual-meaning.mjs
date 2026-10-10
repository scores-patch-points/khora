// eval/law/contextual-meaning.mjs — THE DELTA MAP: contextual meaning from "the sentence with and without the word",
// compared across words, plus the polarity (negation) lens the delta is blind to. New file; nothing edited.
//
//   node eval/law/contextual-meaning.mjs --stem eng --n 250
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run) ═══════════════════════════════════
// THE METHOD (user, 2026-10-08): "we do the sentence with and without the word, we have the delta, we can then
// compare that to other words done similarly so we get their contextual meaning, and we start being able to get a
// map of contextual meaning space without ever defining a word." And: "it breaks on polarity but that's solveable."
//
// DELTA = impact.mjs::impactOfToken(delete) → the span signature (the offset/context effect of ablating the token);
// sig detected as the contextual carrier by eval/law/impact.mjs smoke (span NMI(types,role) 0.315 p=0.005 vs slot
// 0.195 p=0.055). POLARITY lens = NEGATION_WORDS (adapters/text/priors.js, giver lang/en), the reader's declared
// unmeasured dimension (relations-gfp.js hard-sets polarity "+") — appended as [negBefore, negAfter].
//
// CLAIMS (falsifiable), gold = the token's UPOS (used ONLY to score, never as a feature):
//   C1 MAP: types induced from the DELTA (span) recover role above a permutation null (NMI > nullQ95, p <= 0.05).
//   C2 POLARITY: adding the polarity lens separates NEGATED from AFFIRMATIVE occurrences of the SAME form better
//      than the delta alone: over forms with both, the mean cross-polarity cosine distance rises when the lens is
//      added (and the lens is not null — the negator occurrences exist).
//   C3 vs COMPANY: the delta map is NOT worse than a prior-free COMPANY map (the ±2 neighbour identities hashed to
//      128 dims) on role recovery (delta NMI >= company NMI - 0.02).
// FALSIFIED IF C1 fails, OR C2 adds nothing (no rise / no negated forms), OR C3 loses by > 0.02.
// CONTROLS: C2 sham = random relabelling of the polarity bit (must NOT raise separation); determinism on re-run.
// LIMITS: DEV only (TEST unread); English lens (spa/deu would need their own); n sampled, role-stratified.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import { readConlluStream, sampleTokens, impactBatch, impactTypes, assignType, nmiVsPermutation, isNullSignature } from "./impact.mjs";
import { NEGATION_WORDS } from "../../adapters/text/priors.js";
import { conlluPath, parseArgs, EVAL_DIR } from "../competence/lib.mjs";

const NEG = NEGATION_WORDS;
const has = (s, a, b) => s.slice(a, b).some((w) => NEG.has(w));
const fnv = (s, d) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % d; };
const cos = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : 0; };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);

function companyVec(sent, i, d = 128, idx = null) { const v = new Array(d).fill(0); for (const off of [-2, -1, 1, 2]) { const j = i + off; if (j >= 0 && j < sent.length) { const b = idx ? (idx.get(sent[j]) ?? fnv(sent[j], d)) : fnv(sent[j], d); v[b] += 1; } } return v; }

function measure(stem, n, seed = 7) {
  const dev = readConlluStream(conlluPath(stem, "dev"));
  const sample = sampleTokens(dev.sents, { gold: dev.upos, n, seed, mode: "role" });
  const batch = impactBatch(dev.sents, sample, { M: 8, F: 0, modes: ["delete"] });
  const del = batch.records.delete;
  const live = sample.map((t, k) => k).filter((k) => del[k] && !del[k].gap && del[k].span);
  const span = live.map((k) => del[k].span);
  const pol = live.map((k) => { const { s, i } = sample[k]; const sent = dev.sents[s]; return [has(sent, 0, i) ? 1 : 0, has(sent, i + 1, sent.length) ? 1 : 0]; });
  const aug = span.map((r, j) => [...r, ...pol[j]]);
  const comp = live.map((k) => companyVec(dev.sents[sample[k].s], sample[k].i));
  const roles = live.map((k) => sample[k].upos);

  const typeNMI = (rows, tag) => { const v = impactTypes(rows, { seed: seed + tag.length, isNull: () => false }); const types = rows.map((r) => assignType(r, v, { isNull: () => false })); return { K: v.K, gap: v.gap, ...nmiVsPermutation(types, roles, { B: 200, seed: seed + 1 }) }; };
  const delta = typeNMI(span, "delta");
  const deltaPol = typeNMI(aug, "aug");
  const company = typeNMI(comp, "comp");

  // C2: cross-polarity separation among forms that occur BOTH negated and affirmative
  const forms = new Map();
  live.forEach((k, j) => { const id = sample[k].id; const neg = pol[j][0] + pol[j][1] > 0 ? 1 : 0; if (!forms.has(id)) forms.set(id, { neg: [], aff: [] }); (neg ? forms.get(id).neg : forms.get(id).aff).push(j); });
  const both = [...forms.values()].filter((f) => f.neg.length && f.aff.length);
  const crossDist = (getVec) => { const ds = []; for (const f of both) for (const a of f.neg) for (const b of f.aff) ds.push(1 - cos(getVec(a), getVec(b))); return mean(ds); };
  const dSpan = crossDist((j) => span[j]);
  const dAug = crossDist((j) => aug[j]);
  // sham: random polarity bit
  let sh = 0; const rnd = (() => { let s0 = 12345; return () => ((s0 = (Math.imul(s0, 1664525) + 1013904223) >>> 0) / 4294967296); })();
  const randBit = pol.map((p) => [rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0]);
  const augSham = span.map((r, j) => [...r, ...randBit[j]]);
  const dSham = crossDist((j) => augSham[j]);

  // ── THE FELT SENSE, PER PART OF SPEECH (user, 2026-10-08): "how something is, contextually, verby", for every POS.
  // One axis per POS = mean(delta of that POS) - mean(delta of the rest), built from the deltas themselves (gold only
  // selects the poles to SCORE; no label enters a feature). AUC = one-vs-rest separability of that POS by its axis.
  const meanOf = (rows) => rows[0].map((_, c) => rows.reduce((s, r) => s + r[c], 0) / rows.length);
  const aucOf = (scores, labels) => { const pos = scores.filter((_, j) => labels[j]), neg = scores.filter((_, j) => !labels[j]); if (!pos.length || !neg.length) return null; let w = 0; for (const p of pos) for (const n of neg) w += p > n ? 1 : p === n ? 0.5 : 0; return w / (pos.length * neg.length); };
  const axesOf = (rows) => {
    const out = {};
    for (const p of [...new Set(roles)]) {
      const lab = roles.map((r) => r === p);
      const P = rows.filter((_, j) => lab[j]), O = rows.filter((_, j) => !lab[j]);
      if (P.length < 8 || O.length < 8) { out[p] = { n: P.length, auc: null }; continue; }
      const mp = meanOf(P), mo = meanOf(O);
      let d = mp.map((x, c) => x - mo[c]); const nrm = Math.hypot(...d) || 1; d = d.map((x) => x / nrm);
      out[p] = { n: P.length, auc: round(aucOf(rows.map((r) => cos(r, d)), lab)) };
    }
    return out;
  };
  const axes = axesOf(span);
  const axesPol = axesOf(aug);
  const homographs = (() => {
    const byForm = new Map();
    live.forEach((k, j) => { const id = sample[k].id; if (!byForm.has(id)) byForm.set(id, []); byForm.get(id).push(roles[j]); });
    return [...byForm.entries()].filter(([, ps]) => new Set(ps).size >= 2).map(([id, ps]) => ({ id, pos: [...new Set(ps)], n: ps.length })).sort((a, b) => b.n - a.n).slice(0, 6);
  })();

  const negForms = both.length;
  const polarityHelps = negForms >= 3 && dAug > dSpan + 1e-6;
  const c1 = delta.p <= 0.05 && delta.nmi > delta.nullQ95;
  const c3 = delta.nmi >= company.nmi - 0.02;
  const pass = c1 && (negForms < 3 ? null : polarityHelps) && c3;
  return { stem, n: live.length, K: delta.K, negForms,
    delta: { nmi: round(delta.nmi), nullQ95: round(delta.nullQ95), p: round(delta.p) },
    deltaPol: { nmi: round(deltaPol.nmi), nullQ95: round(deltaPol.nullQ95), p: round(deltaPol.p) },
    company: { nmi: round(company.nmi), nullQ95: round(company.nullQ95), p: round(company.p) },
    polarity: { crossSpan: round(dSpan), crossAug: round(dAug), crossSham: round(dSham) },
    feltSense: { axes, axesPol, homographs },
    pass, c1, c3, polarityHelps };
}

const a = parseArgs();
let stems = a.stems ? String(a.stems).split(",") : a.stem ? [a.stem] : null;
if (!stems) { try { stems = fs.readdirSync(EVAL_DIR).filter((s) => fs.existsSync(`${EVAL_DIR}/${s}/dev.conllu`)); } catch { stems = ["eng"]; } }
console.log("stem   n    K   deltaNMI p     POS felt-sense axes (AUC one-vs-rest)");
for (const stem of stems) {
  let r; try { r = measure(stem, a.n ?? 250); } catch (e) { console.log(`${stem.padEnd(7)} GAP ${String(e.message).slice(0, 60)}`); continue; }
  const axes = Object.entries(r.feltSense.axes).filter(([, v]) => v.auc != null).sort((x, y) => y[1].auc - x[1].auc).map(([p, v]) => `${p} ${v.auc}`).join("  ");
  console.log(`${stem.padEnd(7)}${String(r.n).padEnd(5)}${String(r.K).padEnd(4)}${String(r.delta.nmi).padEnd(8)}${String(r.delta.p).padEnd(6)}${axes}`);
  if (r.feltSense.homographs.length) console.log(`        homographs (same form, >1 role): ${r.feltSense.homographs.map((h) => `${h.id}:${h.pos.join("/")}`).join("  ")}`);
}
