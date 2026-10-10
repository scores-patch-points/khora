// classify-select.mjs — selection for confirmation (PROTOCOL.md), blind-PREDICT calibration, leads, redundancy between statistics.
import * as CFG from "./classify-config.mjs";
import { STAT, pockets, cells, lawIdx, round } from "./classify-data.mjs";
import { spearman } from "./classify-lib.mjs";

const DEF = new Set(["P+", "P-", "A", "M"]);
export function selectLaws(laws) {
  const eligible = (l) => !l.sizeConfounded && !l.g0.fail;
  const isSR = (l) => l.statuses.includes("POCKET-SPECIFIC") || l.statuses.includes("REVERSAL");
  const why = (l) => { const w = []; if (l.sizeConfounded) w.push("sizeConfounded (G1)"); if (l.g0.fail) w.push(`fails planted check: ${l.g0.reasons.join("; ")}`);
    if (!l.sharedProperty) w.push("no shared-property test (indicator has no variation)"); else if (!(l.sharedProperty.best.p < CFG.SEL.pShared)) w.push(`shared property p=${round(l.sharedProperty.best.p, 4)} >= 0.05 (${l.sharedProperty.best.attr})`);
    if (l.presentV?.heterogeneity == null) w.push("heterogeneity undefined"); return w; };
  const specAll = laws.filter(isSR).map((l) => ({ stat: l.stat, statuses: l.statuses, heterogeneity: l.presentV?.heterogeneity ?? null, sharedBest: l.sharedProperty?.best ?? null, pMax: l.sharedProperty?.pMax ?? null, eligible: eligible(l) && !!l.sharedProperty && l.sharedProperty.best.p < CFG.SEL.pShared && l.presentV?.heterogeneity != null, reasonsExcluded: why(l) }));
  const specElig = specAll.filter((s) => s.eligible).sort((a, b) => b.heterogeneity - a.heterogeneity || a.stat.localeCompare(b.stat));
  const specific = specElig.slice(0, CFG.SEL.maxSpecific).map((s) => ({ ...s, kind: s.statuses.includes("REVERSAL") && !s.statuses.includes("POCKET-SPECIFIC") ? "reversal" : "pocket-specific" }));
  const uniAll = laws.filter((l) => l.statuses.includes("UNIVERSAL")).map((l) => ({ stat: l.stat, sign: l.dominantSign, medianMinZ: l.medianMinZ, eligible: eligible(l), reasonsExcluded: eligible(l) ? [] : [l.sizeConfounded ? "sizeConfounded" : "", l.g0.fail ? "fails planted check" : ""].filter(Boolean) }));
  const universal = uniAll.filter((u) => u.eligible).sort((a, b) => b.medianMinZ - a.medianMinZ || a.stat.localeCompare(b.stat)).slice(0, CFG.SEL.maxUniversal).map((u) => ({ ...u, kind: "universal" }));
  return { rule: "up to 8 POCKET-SPECIFIC or REVERSAL statistics by heterogeneity (IQR(v among PRESENT)/median|v|), not sizeConfounded, not failing the planted check, shared-property permutation p < 0.05; plus up to 4 UNIVERSAL by median |z|",
    specific, universal, specificCandidatesAll: specAll.sort((a, b) => (b.heterogeneity ?? -1) - (a.heterogeneity ?? -1)), universalCandidatesAll: uniAll.sort((a, b) => (b.medianMinZ ?? 0) - (a.medianMinZ ?? 0)) };
}

/** Blind PREDICT (universal+, universal-, specific, absent) against the observed law status. strict: universal needs UNIVERSAL with that sign, specific needs POCKET-SPECIFIC, absent needs NULL-LAW or N = 0;
 *  loose: universal accepts MAJORITY too, specific accepts REVERSAL too. */
export function calibrate(laws) {
  const rows = laws.map((l) => {
    const sg = l.dominantSign, obs = l.statuses.includes("UNIVERSAL") ? `UNIVERSAL${sg}` : l.statuses.includes("MAJORITY") ? `MAJORITY${sg}` : l.statuses.includes("REVERSAL") ? "REVERSAL" : l.statuses.includes("POCKET-SPECIFIC") ? "POCKET-SPECIFIC" : l.statuses.includes("NULL-LAW") ? "NULL-LAW" : l.N ? "PARTIAL" : "UNDEFINED";
    const p = l.predict; let strict = false, loose = false;
    if (p === "universal+" || p === "universal-") { const want = p.endsWith("+") ? "+" : "-"; strict = l.statuses.includes("UNIVERSAL") && sg === want; loose = strict || (l.statuses.includes("MAJORITY") && sg === want); }
    else if (p === "specific") { strict = l.statuses.includes("POCKET-SPECIFIC"); loose = strict || l.statuses.includes("REVERSAL"); }
    else if (p === "absent") { strict = loose = l.statuses.includes("NULL-LAW") || l.N === 0; }
    return { stat: l.stat, predict: p, observed: obs, fracPresent: l.fracPresent, fracPos: l.fracPos, fracNeg: l.fracNeg, strict, loose };
  });
  const conf = {}; for (const r of rows) { const k = `${r.predict} -> ${r.observed}`; conf[k] = (conf[k] || 0) + 1; }
  return { n: rows.length, strictMatches: rows.filter((r) => r.strict).length, looseMatches: rows.filter((r) => r.loose).length, rows, confusion: conf,
    note: "comp.divSlope is scored with its amended prediction (universal+), amended before the new definition was computed (laws/tests/comp/predict-amended.json)." };
}

/** LEADS (PROTOCOL: a law found in only one pocket is a lead, not a law): (1) statistics PRESENT (either sign) in exactly one real pocket; (2) SOLE-SIGN EXCEPTIONS: a (statistic, sign) PRESENT in exactly one real pocket
 *  while the opposite sign is PRESENT in >= 10 pockets (single-pocket reversals of an otherwise scoped or universal law). */
export function leadsOf(laws) {
  const cellFor = (id, j) => cells[pockets.findIndex((q) => q.id === id)][j];
  const single = laws.filter((l) => l.nPos + l.nNeg === 1).map((l) => { const j = STAT.findIndex((s) => s.id === l.stat), id = (l.nPos ? l.presentPockets.pos : l.presentPockets.neg)[0], p = pockets.find((q) => q.id === id), c = cellFor(id, j);
    return { stat: l.stat, pocket: id, sign: l.nPos ? "+" : "-", zD: round(c.zD, 4), zC: round(c.zC, 4), v: round(c.v, 5), group: p.group, register: p.register, N: l.N }; });
  const sole = [];
  for (const l of laws) { const j = STAT.findIndex((s) => s.id === l.stat);
    for (const [sg, n, other, ids] of [["+", l.nPos, l.nNeg, l.presentPockets.pos], ["-", l.nNeg, l.nPos, l.presentPockets.neg]]) if (n === 1 && other >= 10 && Array.isArray(ids)) { const id = ids[0], p = pockets.find((q) => q.id === id), c = cellFor(id, j);
      sole.push({ stat: l.stat, pocket: id, sign: sg, dominantSignElsewhere: sg === "+" ? "-" : "+", nElsewhere: other, zD: round(c.zD, 4), zC: round(c.zC, 4), v: round(c.v, 5), group: p.group, register: p.register, language: p.language, tokens: p.tokens }); } }
  return { singlePocketStatistics: single, soleSignExceptions: sole };
}

/** For every statistic the most similar other statistic over the pockets where both are defined (|Spearman| of pocket-level v, >= 30 shared pockets). */
export function redundancy(laws) {
  const V = STAT.map((_, j) => lawIdx.map((i) => (DEF.has(cells[i][j].st) ? cells[i][j].v : null))), out = {};
  for (let a = 0; a < STAT.length; a++) { let best = null;
    for (let b = 0; b < STAT.length; b++) { if (a === b) continue; const x = [], y = []; for (let k = 0; k < lawIdx.length; k++) if (V[a][k] != null && V[b][k] != null) { x.push(V[a][k]); y.push(V[b][k]); }
      if (x.length < 30) continue; const r = spearman(x, y); if (r != null && (best == null || Math.abs(r) > Math.abs(best.rho))) best = { stat: STAT[b].id, rho: round(r, 3), n: x.length }; }
    out[STAT[a].id] = best; }
  return out;
}
