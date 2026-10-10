// lib.mjs -- shared helpers of the confirmation of rule ablscope-1-slot-ircB-c4plus (NEW FILE; imports existing modules, edits none).
// Documents (IRC channel-days, UD test splits), stream-only scramble conditions, outcome-blind matched pairs with a balance-improving swap, rival observables, instrument scores.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { loadUd } from "../ablation-scope/lib-ud.mjs";
import { indexAndCandidates, pairsForCellV3, strataOf } from "../ablation-scope/lib-pairs.mjs";
import { aucPN } from "../ablation-scope/stats.mjs";
import { rngFor, seedFor, DELTA_TYPES } from "../../impact.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const M_IRC = 256, M_UD = 128;
export const mOf = (name) => (name.startsWith("ud:") ? M_UD : M_IRC);
export const TAG = "ac";                                  // seed tag of every read of this confirmation (the scoper used "cf" / "m2" / "d")
export const seedTagOf = (name, cond) => `${name}:${TAG}${cond === "real" ? "" : ":" + cond}`;

/** A document under a condition: real | shufW (tokens permuted inside each message) | shufG (tokens permuted over the whole document, message lengths kept). Gold flags travel with their tokens. */
export function loadDocCond(name, cond = "real") {
  const base = name.startsWith("ud:") ? loadUd(name.slice(3), "test") : loadIrcDay(path.join(IRC_ROOT, `${name}.txt`), name);
  base.name = name;
  if (cond === "real") return base;
  const rnd = rngFor(seedFor("confirm-ablscope-1", "scramble", cond, name));
  const msgs = base.stream.map((m, s) => m.map((w, i) => ({ w, g: base.goldPos.has(`${s}:${i}`) })));
  const sh = (a) => { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  let out = msgs;
  if (cond === "shufW") out = msgs.map((m) => sh(m.slice()));
  else if (cond === "shufG") { const flat = sh(msgs.flat()); let p = 0; out = msgs.map((m) => flat.slice(p, (p += m.length))); }
  else throw new Error(`unknown condition ${cond}`);
  const goldPos = new Set(); out.forEach((m, s) => m.forEach((t, i) => { if (t.g) goldPos.add(`${s}:${i}`); }));
  return { ...base, stream: out.map((m) => m.map((t) => t.w)), goldPos, cond };
}

/** Stream-only rival observables of an occurrence: R_INIT = share of the form's in-window mentions that open a message; R_BURST from the scoper's definition. */
const lower = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };
export function addRivals(recs, occ, M) {
  const ini = new Map();
  for (const r of recs) {
    let o = ini.get(r.w);
    if (!o) { const arr = occ.get(r.w); o = { ms: arr.map((x) => x[0]), initPrefix: [0] }; arr.forEach((x, k) => o.initPrefix.push(o.initPrefix[k] + (x[1] === 0 ? 1 : 0))); ini.set(r.w, o); }
    const lo = lower(o.ms, r.s - M), hi = lower(o.ms, r.s + 1);
    r.cInit = o.initPrefix[hi] - o.initPrefix[lo]; r.rinit = r.cInit / Math.max(1, hi - lo);
  }
  return recs;
}

// ── S_ENTRY: non-unchanged typed deltas of the ref-entry family at radius bands 0-1 (identical definition to the scoper's features.mjs::ablationScores; checked by the K7 instrument-identity control) ──
const T = DELTA_TYPES.length;
export function sEntry(counts) { let s = 0; for (const band of [0, 1]) for (let t = 0; t < T; t++) s += counts[(3 * 3 + band) * T + t]; return s; }
export function sAll(counts) { let s = 0; for (const v of counts) s += v; return s; }
export function sOwn(counts) { let s = 0; for (let fam = 0; fam < 4; fam++) for (let t = 0; t < T; t++) s += counts[(fam * 3 + 0) * T + t]; return s; }

export const CONTROLS = ["R_LOGC", "R_POS", "R_IPOS", "R_FB", "R_LEN", "R_SL"];
export const ctlOf = (r) => ({ R_LOGC: Math.log(r.c), R_POS: Math.log1p(r.s), R_IPOS: r.i, R_FB: r.fbin, R_LEN: r.len, R_SL: Math.log(r.sl) });
export const burstOf = (r) => Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5));

/** Balance J of a set of pairs on the six matched-out controls: sum of squared (AUC - 0.5). Outcome-blind (no ablation value is involved). */
export function balanceJ(pairs) {
  if (pairs.length < 2) return 0;
  let J = 0; for (const k of CONTROLS) { const a = aucPN(pairs.map((x) => ctlOf(x.pos)[k]), pairs.map((x) => ctlOf(x.neg)[k])); J += (a - 0.5) ** 2; } return J;
}

/** Build matched pairs for one document: matching v3 of the scoper (calipers |dlen|<=1, |dfbin|<=1, |dlb|<=1, |ds|<=20%, |dln msglen|<=0.5 for big pools; running-balance cost), then an OUTCOME-BLIND balance-improving swap of negatives
 *  (same day, same cell pool, same hard calipers, accepted only if the six control AUCs of the cell move closer to 0.5). Returns { cand, pairs, taken, pools }. */
export function buildDocPairs(doc, M, cells, { tag = TAG, swapIters = 3, maxPerForm = 4 } = {}) {
  const cand = indexAndCandidates(doc, M);
  const pairs = [], N = cand.nMsg;
  for (const cell of cells) {
    const r = pairsForCellV3(cand, doc, M, { grp: cell.grp, stratum: cell.stratum, n: cell.n, seedTag: tag, maxPerForm });
    let cur = r.pairs.map((p) => ({ grp: cell.grp, stratum: cell.stratum, pos: p.pos, neg: p.neg }));
    if (cur.length >= 6 && swapIters > 0) {
      const rnd = rngFor(seedFor("confirm-ablscope-1", "swap", doc.name, cell.grp, cell.stratum, tag));
      const pool = new Map(); for (const q of cand.N) if (q.stratum === cell.stratum && q.grp === cell.grp) { const k = `${q.mb}|${q.pc}`; (pool.get(k) ?? pool.set(k, []).get(k)).push(q); }
      const taken = new Set(cur.map((x) => `${x.neg.s}:${x.neg.i}`)), negUse = new Map(); for (const x of cur) negUse.set(x.neg.w, (negUse.get(x.neg.w) ?? 0) + 1);
      let J = balanceJ(cur);
      for (let it = 0; it < swapIters; it++) {
        const order = cur.map((_, k) => k); for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
        for (const k of order) {
          const p = cur[k].pos, arr = pool.get(`${p.mb}|${p.pc}`) ?? [];
          for (let tries = 0; tries < 40 && arr.length; tries++) {
            const q = arr[Math.floor(rnd() * arr.length)];
            if (taken.has(`${q.s}:${q.i}`) || q === cur[k].neg) continue;
            const dl = q.len - p.len, df = q.fbin - p.fbin, db = q.lb - p.lb, ds = (q.s - p.s) / N, dm = Math.log(q.sl) - Math.log(p.sl);
            if (Math.abs(dl) > 1 || Math.abs(df) > 1 || Math.abs(db) > 1 || Math.abs(ds) > 0.2) continue;
            if (arr.length >= 1000 && Math.abs(dm) > 0.5) continue;
            if ((negUse.get(q.w) ?? 0) >= maxPerForm && q.w !== cur[k].neg.w) continue;
            const old = cur[k].neg; cur[k] = { ...cur[k], neg: q };
            const J2 = balanceJ(cur);
            if (J2 < J - 1e-12) { J = J2; taken.delete(`${old.s}:${old.i}`); taken.add(`${q.s}:${q.i}`); negUse.set(old.w, negUse.get(old.w) - 1); negUse.set(q.w, (negUse.get(q.w) ?? 0) + 1); }
            else cur[k] = { ...cur[k], neg: old };
          }
        }
      }
    }
    pairs.push(...cur);
  }
  addRivals(pairs.flatMap((x) => [x.pos, x.neg]), cand.occ, M);
  return { cand, pairs };
}

/** Uniform random sample of unlabelled (natural-population) eligible tokens of a cell, excluding tokens already used in pairs. */
export function naturalSample(cand, doc, cell, excludeKeys, tag = TAG, M = M_IRC) {
  const rnd = rngFor(seedFor("confirm-ablscope-1", "natural", doc.name, cell.grp, cell.stratum, tag));
  const arr = cand.N.filter((q) => q.stratum === cell.stratum && q.grp === cell.grp && !excludeKeys.has(`${q.s}:${q.i}`));
  for (let k = arr.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [arr[k], arr[j]] = [arr[j], arr[k]]; }
  const sample = arr.slice(0, cell.n); addRivals(sample, cand.occ, M);
  return { sample, poolSize: arr.length };
}
export { strataOf };
export const slimOf = (r) => ({ s: r.s, i: r.i, w: r.w, c: r.c, cBefore: r.cBefore, last16: r.last16, docCount: r.docCount, rate: r.rate, len: r.len, sl: r.sl, fbin: r.fbin, lb: r.lb, mb: r.mb, pc: r.pc, stratum: r.stratum, grp: r.grp, cInit: r.cInit, rinit: r.rinit });
