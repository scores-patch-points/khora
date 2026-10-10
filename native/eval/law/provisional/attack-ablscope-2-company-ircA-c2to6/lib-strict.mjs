// lib-strict.mjs -- STRICT matcher and lite member record for the attack (NEW FILE). Imports the scoper's candidate index (indexAndCandidates) and the confirmer's closed-form instrument.
// Strict key (all hard): same document, same group (message-initial), same stratum, EXACT local count c, EXACT form-frequency bin, EXACT character length, |ln message-length ratio| <= 0.35,
// |stream distance| <= 20% of the stream. Nearest-first on stream distance + message length. <= maxPerForm uses of one form per side, no token reused. No balance terms (the key is exact).
import fs from "node:fs";
import path from "node:path";
import { rngFor, seedFor } from "../../impact.mjs";
import { loadIrcDay, IRC_ROOT } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates, strataOf } from "../ablation-scope/lib-pairs.mjs";
import { controlScores, controlVector } from "../ablation-scope/features.mjs";
import { companyAt, occOf, initShare } from "../confirm-ablscope-2-company-ircA-c2to6/lib-dself.mjs";
export { loadIrcDay, indexAndCandidates, IRC_ROOT };

export function pairsStrict(cand, doc, { stratum, n = 150, tag = "atk", maxPerForm = 3, dmMax = 0.35, dsMax = 0.2, exactLen = true, exactFb = true, lenTol = 0 } = {}) {
  const rnd = rngFor(seedFor("atk-ablscope2", doc.name, stratum, tag));
  const P = cand.P.filter((r) => r.grp === "A" && r.stratum === stratum); for (let k = P.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [P[k], P[j]] = [P[j], P[k]]; }
  const pool = new Map();
  for (const r of cand.N) if (r.grp === "A" && r.stratum === stratum) { const k = `${r.c}`; (pool.get(k) ?? pool.set(k, []).get(k)).push(r); }
  const posUse = new Map(), negUse = new Map(), taken = new Set(), pairs = [];
  for (const p of P) {
    if (pairs.length >= n) break;
    if ((posUse.get(p.w) ?? 0) >= maxPerForm) continue;
    let best = null, bc = Infinity;
    for (const q of pool.get(`${p.c}`) ?? []) {
      if (taken.has(`${q.s}:${q.i}`) || (negUse.get(q.w) ?? 0) >= maxPerForm) continue;
      if (exactFb && q.fbin !== p.fbin) continue; if (exactLen && Math.abs(q.len - p.len) > lenTol) continue;
      const dm = Math.abs(Math.log(q.sl) - Math.log(p.sl)), ds = Math.abs(q.s - p.s) / cand.nMsg;
      if (dm > dmMax || ds > dsMax) continue;
      const cost = ds + dm + rnd() * 0.001; if (cost < bc) { bc = cost; best = q; }
    }
    if (!best) continue;
    taken.add(`${best.s}:${best.i}`); posUse.set(p.w, (posUse.get(p.w) ?? 0) + 1); negUse.set(best.w, (negUse.get(best.w) ?? 0) + 1); pairs.push({ pos: p, neg: best });
  }
  return pairs;
}
/** Lite member: closed-form dSelf (+ the 8 company components, per-dimension changes), the plain initial-share rivals, the control scores. No shuffles. */
export function memberLite(doc, occ, r, M) {
  const o = companyAt(doc.stream, r.s, r.i, M), ini = initShare(occ, r, M);
  return { w: r.w, s: r.s, i: r.i, c: r.c, dSelf: o.dSelf, c8: o.c8, dd: o.dd, ...ini, ...controlScores(r), cv: controlVector(r) };
}
export function dayDocs(names) { return names.map((n) => loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n)); }
