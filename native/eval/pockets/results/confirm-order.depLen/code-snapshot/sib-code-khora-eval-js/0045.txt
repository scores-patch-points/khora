// eval/law/name-war-and-peace-real.mjs — ARM R of the War and Peace name test: the SAME ablation read through khora's REAL production reading
// pipeline (the-fold/corpus-session.js: admitChunked + sessionReferents, English declared, the shipped priors and ear, lowercased text).
//
//   node eval/law/name-war-and-peace-real.mjs [--later 60] [--first 80] [--M 128]
//
// Pre-registered in eval/law/name-war-and-peace.mjs, AMENDMENT 1 item A4 (written before the full run). LABELLED CONTAMINATED: the production
// pipeline carries a POS prior, a frame prior and an ear, so any separation it shows may come from those, not from the field. It can inform
// how the rule could be USED to find names; it can neither confirm nor falsify the law (docs/LAW-FALSIFICATION.md 2.7, contamination ledger).
//
// SAMPLE. The first --later pairs of the main run's LATER sample (same seed, hence the same tokens) and every k-th pair of its FIRST sample.
// IMPACT. The token is deleted from its sentence; the window [s - M, s + F] (lowercased original sentence texts) is read before and after; the
// REFERENT INDEX is compared by id: ownExists (the token is a word of a referent's surface in the base reading), ownDelta (that referent's
// mention count lost to the ablation; a lost referent loses all), changed (referents whose mention count changed), born, lost.
// F = 0 is frame-causal (what the reader had when it read the token); F = 32 is NON-CAUSAL (what the single mention does to the later field).
// OUTCOMES. non-null share by class; leave-one-position-block-out ridge-logistic AUC of NAME vs matched COMMON for REAL (the four features above),
// the case-free rivals FREQ, FREQ+BURST+COMPANY-LITE, POSITION, and REAL combined with them; block-bootstrap intervals for the differences.
// PREDICTIONS (blind): R1 the real pipeline leaves a trace for recurring names more often than for frequency-matched common words (it nominates
// names through its priors); R2 at a single mention it is deaf in the causal arm (floor 2): non-null share <= 0.15 for both classes; R3 REAL adds
// less than 0.03 AUC over FREQ+BURST+COMPANY-LITE (the priors, not the field, do the separating); R4 the NON-causal F=32 arm hears first mentions
// of names better than the causal arm.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBook, labelBook, drawSample, buildCausal, cvScores, aucOf, bootDiff, round, mean, quantile, M } from "./name-war-and-peace.mjs";
import { seedFor } from "./impact.mjs";
import { createSession, admitChunked, sessionReferents } from "../../the-fold/corpus-session.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const N_LATER = Number(opt("--later", 60)), N_FIRST = Number(opt("--first", 80)), F_NC = 32;
const BLOCKS = 10;

const book = loadBook();
const lab = labelBook(book);
const smp = drawSample({ ...book, ...lab }, 600, seedFor("war-and-peace", "name-rule"));
const later = smp.later.slice(0, N_LATER * 2);
const stepFirst = Math.max(1, Math.floor(smp.first.length / 2 / N_FIRST));
const first = smp.first.filter((t) => t.pair % stepFirst === 0).slice(0, N_FIRST * 2);
const nSent = book.stream.length;

let reads = 0, readMs = 0;
const readReferents = async (text, tag) => {
  const t0 = Date.now();
  const session = createSession();
  admitChunked(session, { text, sourceId: tag, language: "eng" });
  const r = await sessionReferents(session, { sourceId: tag, limit: Infinity });
  reads += 1; readMs += Date.now() - t0;
  return r.referents;
};
const baseCache = new Map();
const windowText = (s, F, ablate = null) => {
  const lo = Math.max(0, s - M), hi = Math.min(nSent - 1, s + F);
  const parts = [];
  for (let k = lo; k <= hi; k++) {
    let t = book.texts[k];
    if (ablate && k === s) { const [st, len] = book.offs[s][ablate]; t = (t.slice(0, st) + t.slice(st + len)).replace(/\s{2,}/g, " "); }
    parts.push(t.toLowerCase());
  }
  return parts.join(" ");
};
const wordIn = (surface, id) => new RegExp(`(^|[^\\p{L}\\p{M}'’])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{M}'’])`, "u").test(surface);
async function impactReal(t, F) {
  const key = `${t.s}|${F}`;
  if (!baseCache.has(key)) baseCache.set(key, await readReferents(windowText(t.s, F), `b${t.s}_${F}`));
  const base = baseCache.get(key);
  const abl = await readReferents(windowText(t.s, F, t.i), `a${t.s}_${t.i}_${F}`);
  const byId = new Map(abl.map((r) => [r.id, r]));
  let changed = 0, born = 0, lost = 0, ownExists = 0, ownDelta = 0;
  for (const r of base) {
    const a = byId.get(r.id);
    const own = r.surfaces.some((sf) => wordIn(sf.toLowerCase(), t.id));
    if (!a) { lost += 1; if (own) { ownExists = 1; ownDelta = Math.max(ownDelta, r.mentions); } continue; }
    if (a.mentions !== r.mentions) { changed += 1; if (own) { ownExists = 1; ownDelta = Math.max(ownDelta, Math.abs(r.mentions - a.mentions)); } }
    else if (own) ownExists = 1;
  }
  const baseIds = new Set(base.map((r) => r.id));
  for (const r of abl) if (!baseIds.has(r.id)) born += 1;
  const nonNull = changed + born + lost > 0;
  return { ownExists, ownDelta, changed, born, lost, nonNull, REAL: [ownExists, Math.log1p(ownDelta), Math.log1p(changed), Math.log1p(born + lost)] };
}

const causalFeat = buildCausal(book.stream, book.orig, lab.st);
const blockOf = (t) => Math.min(BLOCKS - 1, Math.floor((t.s / nSent) * BLOCKS));
const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);

async function runSet(rows, F, label) {
  const recs = [];
  const t0 = Date.now();
  for (let k = 0; k < rows.length; k++) {
    recs.push(await impactReal(rows[k], F));
    if (k % 20 === 0) console.error(`${label}: ${k}/${rows.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  const y = rows.map((t) => t.y), block = rows.map(blockOf);
  const feats = rows.map((t, k) => ({ ...causalFeat(t), REAL: recs[k].REAL }));
  const arms = {
    REAL: (f) => f.REAL, FREQ: (f) => f.FREQ, "FREQ+BURST+COMPANY-LITE": (f) => [...f.FREQ, ...f.BURST, ...f.COMPANY], POSITION: (f) => f.POSITION,
    "REAL+FREQ": (f) => [...f.REAL, ...f.FREQ], "REAL+FREQ+BURST+COMPANY-LITE": (f) => [...f.REAL, ...f.FREQ, ...f.BURST, ...f.COMPANY],
  };
  const scores = {}, auc = {};
  for (const [n, fn] of Object.entries(arms)) { scores[n] = cvScores(feats.map(fn), y, block); auc[n] = round(aucOf(scores[n], y)); }
  const diffs = {
    "REAL+FREQ - FREQ": bootDiff(scores["REAL+FREQ"], scores.FREQ, y, block, 1000, 11),
    "REAL+FREQ+BURST+COMPANY-LITE - FREQ+BURST+COMPANY-LITE": bootDiff(scores["REAL+FREQ+BURST+COMPANY-LITE"], scores["FREQ+BURST+COMPANY-LITE"], y, block, 1000, 12),
  };
  const trace = {};
  rows.forEach((t, k) => { const c = t.y === 1 ? "NAME" : "COMMON"; const b = (trace[c] ??= { n: 0, nonNull: 0, ownExists: 0 }); b.n += 1; if (recs[k].nonNull) b.nonNull += 1; if (recs[k].ownExists) b.ownExists += 1; });
  for (const b of Object.values(trace)) { b.nonNullShare = round(b.nonNull / b.n); b.ownExistsShare = round(b.ownExists / b.n); }
  const charTrace = rows.map((t, k) => (t.cls === "CHAR" ? recs[k].nonNull : null)).filter((x) => x !== null);
  return { label, F, n: rows.length, trace, charNonNullShare: round(share(charTrace)), charN: charTrace.length, auc, diffs, medianOwnDelta: { NAME: quantile(rows.map((t, k) => (t.y === 1 ? recs[k].ownDelta : null)).filter((x) => x !== null), 0.5), COMMON: quantile(rows.map((t, k) => (t.y === 0 ? recs[k].ownDelta : null)).filter((x) => x !== null), 0.5) } };
}

const out = { module: "eval/law/name-war-and-peace-real.mjs", contaminated: true, M, sample: { later: later.length / 2, first: first.length / 2 } };
out.later = await runSet(later, 0, "LATER causal");
out.firstCausal = await runSet(first, 0, "FIRST causal");
out.firstNoncausal = await runSet(first, F_NC, `FIRST F=${F_NC}`);
out.cost = { reads, seconds: round(readMs / 1000, 1) };
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
fs.writeFileSync(path.join(HERE, "results", "name-war-and-peace-real.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
