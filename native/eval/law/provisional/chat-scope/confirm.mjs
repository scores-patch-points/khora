// eval/law/provisional/chat-scope/confirm.mjs — CONFIRMATION of the two shortlisted chat-scope rules on IRC days that no earlier test, no earlier agent and no discovery step touched.
//
//   node confirm.mjs dry        -> results/confirm.dry.json   (DISCOVERY days; debugging only, never a result)
//   node confirm.mjs confirm    -> results/confirm.json       (CONFIRM days from split.json; one shot)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; discover.mjs header sha256 b4dcd46ed1e626d32de8595df8672efd4367fd1c14adff3fd0cf522b79e68b50) ═══
// DISCLOSURE. Seen: everything in discover.mjs's disclosure; the full discovery output (v1 half-octave run and the amended quarter-octave run `fb4`, real + msgshuf + wordshuf); explore-fp.mjs (which
//   ordinary words fire the rule, which nicks it misses, discovery days only); explore-beyond.mjs (beyond-count AUC of frame statistics); select.mjs's output (results/selection.json). NOT seen: any score on any
//   CONFIRM day (36 days, split.json "confirm": never loaded by any script before this run); the census of day counts included them (counts only). The matcher, scores and controls are exactly those of discovery
//   run `fb4` (CHAT_FREQBIN=4, set at the top of this file). Swarm overlap: kinds-swarm read English days with >= 1500 messages for kind induction (not rules); scope EN_swarm / EN_notSwarm reports them apart.
// RULES (fixed; text-only; nothing fitted; direction +1 = more name-like; each is a score + threshold + scope claim):
//   R1  "FIRST-SLOT SHARE": for an occurrence of word w in message m (any position), ISHARE_Cinf = (a + 1) / (b + 2), a = number of EARLIER messages in the day in which w is the first word, b = number of earlier
//       messages containing w. Flag as name-like iff ISHARE_Cinf >= 0.67 (theta from select.mjs: smallest grid value with EN LATER discovery FPR <= 0.15; i.e. at least two earlier first-word occurrences).
//       Claim: LATER mentions (the form occurred earlier that day), causal (prefix only), in IRC-like chat, for the vocative/addressee slot AND for non-initial mentions of the same forms.
//   R2  "FIRST MENTION BY LOOKAHEAD": for the FIRST occurrence of w in the day, INIT_Tinf = number of OTHER messages in the day in which w is the first word. Flag iff INIT_Tinf >= 2 (calibrated on the discovery
//       FIRST EN pairs, extended grid; select.mjs note N2). Claim: first mentions are identifiable retroactively from later first-slot recurrence; NOT causal (whole-day lookahead).
// DATA / MATCHING. As discovery (exact cell matching, quarter-octave frequency bin, 400 pairs per day per stratum). Cell evaluation: paired AUC; four raw controls (i, len, cl, lc) must be in [0.45, 0.55];
//   if not, the STRICT subset (equal raw i, message length, character length, |d log2 count| <= 0.15; n >= 40) replaces the cell and its controls are re-checked; if still out, the cell is VOID (reported, no verdict).
//   Pair-bootstrap 95% CI (B=300) and day-cluster CI (>= 4 days); null q95 = 0.5 + 1.645 * 0.5 / sqrt(n).
// SCOPES. ALL, EN (ubuntu kubuntu xubuntu ubuntu-server), each channel, NONEN, DE, ES, IT, EN x era (2004-07, 2008-11, 2012-15), NONEN x era (2004-11, 2012-15), EN_swarm, EN_notSwarm; facets ALL, INIT (i=0), NONINIT.
// CELL HOLDS (bars are tightened vs discovery where the discovery bar was 0.60): R1: n >= 60 (strict: >= 40), AUC >= 0.70, pair-CI lower bound >= 0.65 and > null q95. R2: AUC >= 0.62, lower bound >= 0.55 and > null q95.
// RULE VERDICT. R1 HOLDS (scoped) iff LATER x EN x ALL holds, AND wordshuf (token order shuffled inside every message, re-run on the confirm days) lowers its EN LATER AUC by >= 0.10, AND beyond-rival AUC vs equal
//   CNT_C128 bins >= 0.60 (EN, ALL facet). R2 HOLDS (scoped) iff FIRST x EN x ALL holds, AND wordshuf lowers it by >= 0.05, AND beyond-rival AUC vs equal CNT_Tinf bins >= 0.60. Otherwise NOT CONFIRMED and the
//   discovery effect is reported as a failed replication. The scope statement of a rule = the list of cells that hold; every cell that does not hold is a stated limit.
// NATURAL PREVALENCE (unmatched, labelled; the positional confound is part of how a rule works in practice): R1 over every LATER token >= 3 chars, R2 over every FIRST token >= 3 chars: precision, recall, FPR,
//   prevalence by facet and language group; baseline "flag every message-initial token" for R1.
// SECONDARY (no verdict): AUC of every discovery column on confirm LATER and FIRST pairs for EN, DE, ES, IT, NONEN (replication of the which-cues-survive-outside-English table).
// BLIND PREDICTIONS (informed by discovery, so they are checks of out-of-sample drift). R1: EN LATER ALL AUC in [0.82, 0.92]; EN INIT >= 0.82; EN NONINIT >= 0.78; every EN channel with n >= 60 >= 0.80; EN 2012-15
//   not below 2004-07 by more than 0.06; NONEN LATER ALL >= 0.80 (strict fallback allowed); TPR at 0.67 in [0.55, 0.72], FPR in [0.09, 0.19]; wordshuf EN <= 0.72; msgshuf EN within 0.03 of real. Natural prevalence:
//   R1 precision within the INIT facet exceeds the flag-every-initial baseline by >= 0.15. R2: EN FIRST ALL AUC in [0.64, 0.74]; TPR at 2 in [0.25, 0.40], FPR in [0.06, 0.18]; EN NONINIT facet AUC > INIT facet AUC;
//   NONEN FIRST ALL >= 0.60 but underpowered (n ~ 50); wordshuf <= 0.58.
// NOT TESTED: any fitted classifier; cross-day text; anything that reads the speaker field, a list, capitals or the colon.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
process.env.CHAT_FREQBIN = "4";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const { daysOf, collect } = await import("./collect.mjs");
const { evalCell, swarmPool, natural, addTally, prf } = await import("./confirm-lib.mjs");
const { pAuc, round } = await import("./stats.mjs");
const MODE = process.argv[2] ?? "dry";
if (!["dry", "confirm"].includes(MODE)) throw new Error("mode");
const SEL = JSON.parse(fs.readFileSync(new URL("./results/selection.json", import.meta.url), "utf8"));
if (SEL.rule1.column !== "ISHARE_Cinf" || SEL.rule1.calibration.theta !== 0.67 || SEL.rule2b_FIRST_lookahead.column !== "INIT_Tinf" || SEL.rule2b_FIRST_lookahead.calibration.theta !== 2) throw new Error("selection mismatch");
const RULES = {
  R1: { column: "ISHARE_Cinf", theta: 0.67, stratum: "LATER", rivals: ["CNT_C128", "CNT_C32", "CNT_Cinf"], crit: { minN: 60, auc: 0.7, lower: 0.65 }, shuf: 0.1, beyond: ["CNT_C128", 0.6] },
  R2: { column: "INIT_Tinf", theta: 2, stratum: "FIRST", rivals: ["CNT_Tinf", "CNT_T128"], crit: { minN: 60, auc: 0.62, lower: 0.55 }, shuf: 0.05, beyond: ["CNT_Tinf", 0.6] },
};
const days = daysOf(MODE === "dry" ? "discovery" : "confirm"), sw = new Map(days.map((d) => [d.key, swarmPool(d)]));
const SCOPES = {
  ALL: () => true, EN: (p) => p.lang === "en", NONEN: (p) => p.lang !== "en", DE: (p) => p.channel === "ubuntu-de", ES: (p) => p.channel === "ubuntu-es", IT: (p) => p.channel === "ubuntu-it",
  ubuntu: (p) => p.channel === "ubuntu", kubuntu: (p) => p.channel === "kubuntu", xubuntu: (p) => p.channel === "xubuntu", "ubuntu-server": (p) => p.channel === "ubuntu-server",
  "EN_2004-07": (p) => p.lang === "en" && p.era === "2004-07", "EN_2008-11": (p) => p.lang === "en" && p.era === "2008-11", "EN_2012-15": (p) => p.lang === "en" && p.era === "2012-15",
  "NONEN_2004-11": (p) => p.lang !== "en" && p.era !== "2012-15", "NONEN_2012-15": (p) => p.lang !== "en" && p.era === "2012-15",
  EN_swarm: (p) => p.lang === "en" && sw.get(p.day), EN_notSwarm: (p) => p.lang === "en" && !sw.get(p.day),
};
const FACETS = { ALL: () => true, INIT: (p) => p.init, NONINIT: (p) => !p.init };
const t0 = Date.now(), R = { mode: MODE, days: days.map((d) => d.key), swarmDays: [...sw].filter(([, v]) => v).map(([k]) => k), rules: RULES, cells: {}, shuf: {}, secondary: {}, natural: {} };
const real = collect(days, "real", 400);
R.info = real.info;
for (const [rn, rule] of Object.entries(RULES)) for (const [sn, sf] of Object.entries(SCOPES)) for (const [fn, ff] of Object.entries(FACETS)) {
  const ps = real.out[rule.stratum].filter((p) => sf(p) && ff(p)); if (ps.length < 10) continue;
  R.cells[`${rn}|${rule.stratum}|${sn}|${fn}`] = evalCell(ps, rule);
}
for (const m of ["wordshuf", "msgshuf"]) {
  const sh = collect(days, m, 400).out; R.shuf[m] = {};
  for (const [rn, rule] of Object.entries(RULES)) for (const sn of ["EN", "NONEN"]) { const ps = sh[rule.stratum].filter(SCOPES[sn]); R.shuf[m][`${rn}|${sn}`] = { n: ps.length, auc: round(pAuc(ps, rule.column)) }; }
}
for (const st of ["LATER", "FIRST"]) for (const sn of ["EN", "DE", "ES", "IT", "NONEN"]) {
  const ps = real.out[st].filter(SCOPES[sn]); if (!ps.length) continue;
  const cols = Object.keys(ps[0].pos).filter((k) => /^(CNT|INIT|ISHARE|NDIV|NBIN|REC|FNEXT|CON)/.test(k));
  R.secondary[`${st}|${sn}`] = { n: ps.length, auc: Object.fromEntries(cols.map((c) => [c, round(pAuc(ps, c))])) };
}
const nat = {}; for (const d of days) { const g = d.lang === "en" ? "EN" : d.channel.replace("ubuntu-", "").toUpperCase(); addTally((nat[g] ??= {}), natural(d, 0.67, 2)); addTally((nat.ALL ??= {}), natural(d, 0.67, 2)); if (d.lang !== "en") addTally((nat.NONEN ??= {}), natural(d, 0.67, 2)); }
for (const [g, T] of Object.entries(nat)) { R.natural[g] = {}; for (const [rn, byF] of Object.entries(T)) R.natural[g][rn] = Object.fromEntries(Object.entries(byF).map(([f, o]) => [f, prf(o)])); }
for (const [rn, rule] of Object.entries(RULES)) {
  const c = R.cells[`${rn}|${rule.stratum}|EN|ALL`], u = c?.strict ?? c?.full, sh = R.shuf.wordshuf[`${rn}|EN`], br = u?.beyondRival?.[rule.beyond[0]];
  R[`verdict_${rn}`] = { cellHolds: !!c?.holds, auc: u?.auc, ci: u?.ci, wordshufAuc: sh?.auc, shufDrop: round((u?.auc ?? 0) - (sh?.auc ?? 0)), shufOk: (u?.auc ?? 0) - (sh?.auc ?? 0) >= rule.shuf, beyond: br, beyondOk: (br?.auc ?? 0) >= rule.beyond[1], HOLDS: !!c?.holds && (u.auc - sh.auc >= rule.shuf) && (br?.auc ?? 0) >= rule.beyond[1] };
}
R.seconds = round((Date.now() - t0) / 1000, 1);
R.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
R.selectionSha256 = createHash("sha256").update(fs.readFileSync(new URL("./results/selection.json", import.meta.url))).digest("hex");
fs.writeFileSync(new URL(`./results/confirm${MODE === "dry" ? ".dry" : ""}.json`, import.meta.url), JSON.stringify(R));
console.log(JSON.stringify({ mode: MODE, seconds: R.seconds, sha: R.headerSha256, verdict_R1: R.verdict_R1, verdict_R2: R.verdict_R2 }, null, 1));
