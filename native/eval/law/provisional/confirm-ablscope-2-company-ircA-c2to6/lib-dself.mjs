// lib-dself.mjs -- instrument and statistics for the confirmation of ablscope-2-company-ircA-c2to6 (NEW FILE; imports existing modules, edits none).
// c.dSelf is read WITHOUT the reader: it is the l2 shift of the window-local identity-grain company descriptor of the evaluated form when ONE mention is deleted (impact.mjs companyStructureImpact,
// component "dSelf", then logT). The window is [s-M, s] exactly as impactBatch/makeSnapshot build it (windowOf, F = 0), the deletion is impact.mjs ablate(mode "delete"). Nothing else is used.
import { windowOf, ablate, windowCompanyModel, companyStructureImpact, rngFor } from "../../impact.mjs";
import { controlScores, controlVector, CONTROLS } from "../ablation-scope/features.mjs";
import { aucPN, quantile, mean, round } from "../ablation-scope/stats.mjs";
export { CONTROLS, round, mean, quantile, aucPN };

export const logT = (x) => (x === 0 ? 0 : Math.sign(x) * Math.log2(1 + Math.abs(x)));
const DESC = ["log1p_count", "distLeft", "distRight", "entLeft", "entRight", "initShare", "finalShare"];
export { DESC };

/** One mention deleted from the window `sents` (self = index of the evaluated message). Returns {c8 (the 8 company components, logT), dSelf, dd (|per-dimension descriptor change|, raw)}. sham = nothing deleted. */
export function companyOnSents(sents, self, i, { sham = false } = {}) {
  const sents1 = sham ? sents : ablate(sents, self, i, { mode: "delete" }).sents;
  const c8 = companyStructureImpact(sents, self, i, sents1);
  const t = sents[self][i], m0 = windowCompanyModel(sents), m1 = windowCompanyModel(sents1), d0 = m0.descriptor(t), d1 = m1.descriptor(t);
  return { c8, dSelf: c8[2], dd: d0.map((x, k) => Math.abs(x - d1[k])) };
}
/** The closed-form company shift of the mention at (s, i) of `stream`, window M messages back. */
export function companyAt(stream, s, i, M, opt = {}) {
  const win = windowOf(stream, s, { M, F: 0 });
  return companyOnSents(win.sents, win.self, i, opt);
}
/** A within-message permutation of every message of the stream (marginals kept, word order destroyed). inv[s][i] = new index of the token that sat at i. */
export function shuffleDoc(stream, seed) {
  const rnd = rngFor(seed), perm = stream.map((s) => { const idx = s.map((_, k) => k); for (let k = idx.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; } return idx; });
  const out = stream.map((s, k) => perm[k].map((o) => s[o])), inv = perm.map((p) => { const q = []; p.forEach((o, nw) => { q[o] = nw; }); return q; });
  return { stream: out, inv };
}
/** The company shift of the same mention when the word order of every message of the window is destroyed (ALL) or of every message except the evaluated one (OTHERS). */
export function shuffledShift(stream, shuf, s, i, M, mode) {
  const win = windowOf(shuf.stream, s, { M, F: 0 });
  if (mode === "ALL") return companyOnSents(win.sents, win.self, shuf.inv[s][i]).dSelf;
  const sents = win.sents.slice(); sents[win.self] = stream[s];
  return companyOnSents(sents, win.self, i).dSelf;
}
/** Plain-count rivals read from the form's own window mentions: R_INIT = share of the window mentions (evaluated one included) that open their message; ALLINIT = 1 when every one does. */
export function initShare(occ, r, M) {
  const list = (occ.get(r.w) ?? []).filter(([s]) => s >= r.s - M && s <= r.s); let init = 0; for (const [, i] of list) if (i === 0) init += 1;
  return { R_INIT: init / list.length, ALLINIT: init === list.length ? 1 : 0, nWin: list.length };
}
export function occOf(doc) { const occ = new Map(); doc.stream.forEach((sent, s) => sent.forEach((w, i) => { (occ.get(w) ?? occ.set(w, []).get(w)).push([s, i]); })); return occ; }

/** The full member record of one occurrence (one token of a pair). */
export function memberOf(doc, shuf, occ, r, M) {
  const o = companyAt(doc.stream, r.s, r.i, M), ini = initShare(occ, r, M);
  return { w: r.w, s: r.s, i: r.i, c: r.c, dSelf: o.dSelf, c8: o.c8, dd: o.dd, shufAll: shuffledShift(doc.stream, shuf, r.s, r.i, M, "ALL"), shufOthers: shuffledShift(doc.stream, shuf, r.s, r.i, M, "OTHERS"),
    sham: companyAt(doc.stream, r.s, r.i, M, { sham: true }).dSelf, ...ini, ...controlScores(r), cv: controlVector(r) };
}

// ── statistics on pair lists. A pair = {id, doc, grp, stratum, block, p: member, n: member}; a score f maps a member to a number, HIGHER = name. ──
export const aucOfPairs = (pairs, f) => aucPN(pairs.map((x) => f(x.p)), pairs.map((x) => f(x.n)));
const STR_ORDER = ["c2", "c3", "c4_6", "c7_15", "c16p"];
/** Pair-weighted mean of the per-stratum AUCs (a ranking is only ever compared inside one count stratum). */
export function strat(pairs, f) {
  let w = 0, a = 0;
  for (const st of STR_ORDER) { const ps = pairs.filter((x) => x.stratum === st); if (ps.length < 2) continue; const v = aucOfPairs(ps, f); if (v == null) continue; a += v * ps.length; w += ps.length; }
  return w ? a / w : null;
}
export const perStratum = (pairs, f) => Object.fromEntries(STR_ORDER.map((st) => { const ps = pairs.filter((x) => x.stratum === st); return [st, ps.length >= 8 ? { n: ps.length, auc: round(aucOfPairs(ps, f)) } : { n: ps.length, auc: null }]; }));
function resample(pairs, rnd) {
  const ids = [...new Set(pairs.map((x) => x.block))], cnt = new Map();
  for (let k = 0; k < ids.length; k++) { const b = ids[Math.floor(rnd() * ids.length)]; cnt.set(b, (cnt.get(b) ?? 0) + 1); }
  const out = []; for (const x of pairs) { const k = cnt.get(x.block) ?? 0; for (let r = 0; r < k; r++) out.push(x); }
  return out;
}
/** Cluster bootstrap (resampling blocks; both members of a pair share the block) of any statistic fn(pairs) -> number. Returns {point, lo, hi}. */
export function boot(pairs, fn, { B = 1000, seed = 1, qLo = 0.025, qHi = 0.975 } = {}) {
  const rnd = rngFor(seed), xs = [];
  for (let b = 0; b < B; b++) { const v = fn(resample(pairs, rnd)); if (v != null && Number.isFinite(v)) xs.push(v); }
  return { point: round(fn(pairs)), lo: round(quantile(xs, qLo)), hi: round(quantile(xs, qHi)), nBoot: xs.length };
}
/** Within-pair label-swap permutation null of fn: {q95, mean, p}. */
export function perm(pairs, fn, { B = 1000, seed = 1 } = {}) {
  const rnd = rngFor(seed), obs = fn(pairs), xs = [];
  for (let b = 0; b < B; b++) { const v = fn(pairs.map((x) => (rnd() < 0.5 ? { ...x, p: x.n, n: x.p } : x))); if (v != null) xs.push(v); }
  return { q95: round(quantile(xs, 0.95)), mean: round(mean(xs)), p: round(xs.filter((v) => v >= obs - 1e-12).length / Math.max(1, xs.length), 4) };
}
/** Strict-caliper subset: identical form-frequency bin, identical character length, |ln message-length ratio| <= 0.25, |ln local-count ratio| <= 0.15. */
export const caliperOf = (pairs) => pairs.filter((x) => x.p.R_FB === x.n.R_FB && x.p.R_LEN === x.n.R_LEN && Math.abs(x.p.R_SL - x.n.R_SL) <= 0.25 && Math.abs(x.p.R_LOGC - x.n.R_LOGC) <= 0.15);
export const controlAucs = (pairs) => Object.fromEntries(CONTROLS.map((c) => [c, round(strat(pairs, (m) => m[c]))]));
export const inBand = (ctl) => Object.values(ctl).every((v) => v != null && v >= 0.45 && v <= 0.55);
