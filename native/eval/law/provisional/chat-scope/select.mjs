// select.mjs — the mechanical SHORTLIST registered in discover.mjs's header, applied to results/discovery.real.fb4.json (the amended run: v1 had out-of-band controls in NONINIT cells; v1 is kept).
// Written and run BEFORE confirm.mjs exists. Dated notes (2026-10-07), made before any confirm day was scored:
//  N1. Rule 2 clause (a) selects the SAME column as Rule 1 (ISHARE_Cinf is also the best causal column on NONINIT); a rule is a score+threshold, so (a) adds no second rule: the NONINIT facet is carried as a
//      scope clause of Rule 1. Rule 2 is therefore clause (b). This reading is mine and is recorded here before confirm.
//  N2. Threshold of a count rule is calibrated on the discovery pairs of the stratum the rule is claimed for (FIRST for Rule 2), on an extended grid {1,2,3,4,6,8,12,16,24,32,48,64}; share rules use {0.6,0.67,0.75,0.8,0.9}.
import fs from "node:fs";
process.env.CHAT_FREQBIN = "4";
const R = JSON.parse(fs.readFileSync(new URL("./results/discovery.real.fb4.json", import.meta.url), "utf8"));
const holds = (c, col) => c && c.n >= 60 && c.ctlOk && c.auc[col] >= 0.6 && c.ci?.[col]?.[0] > c.nullQ95;
const cheap = (col) => (/^INIT/.test(col) ? 0 : /^ISHARE/.test(col) ? 1 : 2), win = (col) => { const m = /_([CT])(\d+|inf)$/.exec(col); return m ? (m[2] === "inf" ? 1e9 : Number(m[2])) : 0; };
function best(cols, cell) {
  const ok = cols.filter((c) => holds(cell, c)).sort((a, b) => cell.auc[b] - cell.auc[a]); if (!ok.length) return null;
  const top = cell.auc[ok[0]], tie = ok.filter((c) => top - cell.auc[c] <= 0.01).sort((a, b) => win(a) - win(b) || cheap(a) - cheap(b));
  return { column: tie[0], auc: cell.auc[tie[0]], ci: cell.ci[tie[0]], tiedWith: tie.slice(1) };
}
const famC = R.columns.filter((c) => /^(INIT|ISHARE|NDIV|NBIN|CON)_C|^REC_C$|^FNEXT$/.test(c)), famT = R.columns.filter((c) => /^(INIT|ISHARE|NDIV|NBIN|CNT)_T/.test(c) && !/^CNT/.test(c));
const r1 = best(famC, R.cells["LATER|EN|ALL"]), r2a = best(famC, R.cells["LATER|EN|NONINIT"]), r2b = best(famT, R.cells["FIRST|EN|ALL"]);
const out = { source: "results/discovery.real.fb4.json", rule1: r1, rule2a_NONINIT_causal: r2a, rule2b_FIRST_lookahead: r2b, notes: ["N1", "N2"] };
const { daysOf, collect } = await import("./collect.mjs"); const { thrRule } = await import("./stats.mjs");
const dayPairs = collect(daysOf("discovery"), "real", 400).out;
function calib(col, st, grid) { const ps = dayPairs[st].filter((p) => p.lang === "en"); const rows = grid.map((t) => ({ t, ...thrRule(ps, col, t) })); return { n: ps.length, rows, theta: (rows.find((r) => r.fpr <= 0.15) ?? {}).t ?? null }; }
if (r1) out.rule1.calibration = calib(r1.column, "LATER", /^ISHARE/.test(r1.column) ? [0.6, 0.67, 0.75, 0.8, 0.9] : [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]);
if (r2b) out.rule2b_FIRST_lookahead.calibration = calib(r2b.column, "FIRST", /^ISHARE/.test(r2b.column) ? [0.6, 0.67, 0.75, 0.8, 0.9] : [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]);
fs.writeFileSync(new URL("./results/selection.json", import.meta.url), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
