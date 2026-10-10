// stratcell.mjs — one stratified cell: real estimate, wordshuf control, beyond-count (cell + log2(1+CNT_C128) bin), controls, bars, facets. New file.
import { stratAuc, summarize } from "./strat.mjs";
import { transform } from "./pairs.mjs";
import { round } from "./lib.mjs";
export const SBARS = { minCov: 60, auc: 0.7, lower: 0.65, shufDrop: 0.1, beyond: 0.6, beyondMin: 20 };
export function stratCell(docs, classOf, keyFn, { pooled = false, tag = "sc", bars = SBARS } = {}) {
  const r = stratAuc(docs, classOf, keyFn, { pooled, seed: tag }), sh = stratAuc(docs.map((d) => transform(d, "wordshuf")), classOf, keyFn, { pooled, seed: tag + "sh" }), bd = stratAuc(docs, classOf, keyFn, { pooled, rivalBin: true, seed: tag + "bd" });
  const auc = r.auc.ishare, drop = auc == null ? null : round(auc - (sh.auc.ishare ?? 0.5)), lower = r.ci?.[0] ?? null;
  const checks = { cov: r.covered >= bars.minCov, controls: r.ctlOk, auc: auc != null && auc >= bars.auc, lower: lower != null && lower >= Math.max(bars.lower, r.nullQ95 ?? 1), shuf: drop != null && drop >= bars.shufDrop, beyond: bd.covered >= bars.beyondMin && (bd.auc.ishare ?? 0) >= bars.beyond };
  const holds = Object.values(checks).every(Boolean), failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  const facet = (f) => { const rows = r.rows.filter(f); return rows.length ? summarize(rows, rows.length, null, tag + "f", 300) : null; };
  return { ...r, shuf: { covered: sh.covered, auc: sh.auc.ishare }, shufDrop: drop, beyond: { covered: bd.covered, auc: bd.auc.ishare, ci: bd.ci }, checks, holds, failed, facets: { INIT: facet((x) => x.init), NONINIT: facet((x) => !x.init) }, _rows: r.rows };
}
