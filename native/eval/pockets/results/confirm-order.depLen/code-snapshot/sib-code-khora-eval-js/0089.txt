// eval/law/provisional/chat-scope/probe-frame.mjs — PROBE (a FITTED lookup table; an existence test, NOT a rule): does the rank-bin of the token right after a word carry a nickname signal
// that the fixed score FNEXT (= minus the bin) could have missed (non-monotone vocative frames)?
//
//   node probe-frame.mjs        -> results/probe-frame.json
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══════════════════════════════════════════════════════════════════════
// DISCLOSURE. Seen: the discovery table (FNEXT EN LATER 0.517, FIRST 0.514, NONINIT LATER 0.42 i.e. reversed) and the confirm secondary table (FNEXT EN LATER 0.541, FIRST 0.517; DE 0.52, ES 0.36, IT 0.44);
//   both for the fixed monotone score only. No probe has been fitted. This probe touches the CONFIRM days after their rule verdict was written; it is a descriptive follow-up, not a confirmation.
// PROBE. Table naive-Bayes on ONE categorical feature: next-token rank bin b in 0..12 (12 = message end): score(b) = log((P_b + 1)/(P + 13)) - log((N_b + 1)/(N + 13)), P_b / N_b = positives / negatives of the
//   fitting pairs with that bin. Fitted on DISCOVERY matched pairs (amended matcher, quarter-octave), separately per stratum {LATER, FIRST} and facet {INIT, NONINIT}, evaluated on CONFIRM pairs of the same
//   stratum/facet: EN -> EN, EN -> NONEN (transfer), plus the NONEN fit on discovery evaluated on NONEN confirm (n small). Paired AUC with pair-bootstrap CI (B=300) and the null q95 0.5 + 1.645*0.5/sqrt(n).
//   The probe sees no recurrence, no first-slot share, no speaker, no capitals, no list: only the one-token right company in rank-bin terms (the single-mention causal observable up to one token of lookahead).
// PREDICTIONS (blind). EN LATER INIT: probe AUC <= 0.60. EN FIRST INIT: <= 0.58. EN NONINIT (either stratum): <= 0.60. EN -> NONEN transfer <= 0.55. i.e. frame company is not where the signal is.
//   It "carries signal" if AUC >= 0.60 and the lower bound exceeds the null q95.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
process.env.CHAT_FREQBIN = "4";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const { daysOf, collect } = await import("./collect.mjs");
const { bootPairs, round } = await import("./stats.mjs");
const binOf = (p) => -p.FNEXT;
function fit(ps) { const P = new Array(13).fill(0), N = new Array(13).fill(0); for (const p of ps) { P[binOf(p.pos)]++; N[binOf(p.neg)]++; } const np = ps.length; return P.map((x, b) => Math.log((x + 1) / (np + 13)) - Math.log((N[b] + 1) / (np + 13))); }
const auc = (ps, tab) => { let w = 0; for (const p of ps) { const d = tab[binOf(p.pos)] - tab[binOf(p.neg)]; w += d > 0 ? 1 : d === 0 ? 0.5 : 0; } return w / ps.length; };
function boot(ps, tab) { const d = ps.map((p) => { const x = tab[binOf(p.pos)] - tab[binOf(p.neg)]; return x > 0 ? 1 : x === 0 ? 0.5 : 0; }); let s = 1; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); const v = []; for (let b = 0; b < 300; b++) { let t = 0; for (let k = 0; k < d.length; k++) t += d[Math.floor(r() * d.length)]; v.push(t / d.length); } v.sort((a, b) => a - b); return [round(v[7]), round(v[292])]; }
const disc = collect(daysOf("discovery"), "real", 400).out, conf = collect(daysOf("confirm"), "real", 400).out;
const SC = { EN: (p) => p.lang === "en", NONEN: (p) => p.lang !== "en" }, FA = { INIT: (p) => p.init, NONINIT: (p) => !p.init };
const R = { fitted: "PROBE (naive-Bayes table over next-token rank bin); not a rule", cells: {} };
for (const st of ["LATER", "FIRST"]) for (const [fn, ff] of Object.entries(FA)) for (const [fitSc, evSc] of [["EN", "EN"], ["EN", "NONEN"], ["NONEN", "NONEN"]]) {
  const tr = disc[st].filter((p) => SC[fitSc](p) && ff(p)), te = conf[st].filter((p) => SC[evSc](p) && ff(p)); if (tr.length < 20 || te.length < 20) continue;
  const tab = fit(tr), a = auc(te, tab);
  R.cells[`${st}|${fn}|fit ${fitSc} -> eval ${evSc}`] = { nFit: tr.length, nEval: te.length, auc: round(a), ci: boot(te, tab), nullQ95: round(0.5 + (1.645 * 0.5) / Math.sqrt(te.length)), table: tab.map((x) => round(x, 2)) };
}
R.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(new URL("./results/probe-frame.json", import.meta.url), JSON.stringify(R, null, 1));
for (const [k, c] of Object.entries(R.cells)) console.log(k.padEnd(34), "nFit", c.nFit, "nEval", c.nEval, "AUC", c.auc, JSON.stringify(c.ci), "q95", c.nullQ95);
