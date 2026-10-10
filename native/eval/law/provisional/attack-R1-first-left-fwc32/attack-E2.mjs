// attack-E2.mjs: ATTACK E2 (precision of the within-language slope of attack E; analysis of E.json only).   NAME_COMPANY_PAIRBLOCK=1 node attack-E2.mjs results/E.json OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in the output JSON) ═══
// DISCLOSURE. Seen: the full summary of attack E (pooled within-language rho -0.219, 8 of 26 languages positive, within slope -0.605 AUC per unit FWC32, between slope +0.454, within FWC32 SD 0.0134 vs between 0.088, partial rho -0.219), per-language ranges. NOT seen: any interval for the slopes.
// QUESTION. Attack E found no within-language dose-response, but the within-language FWC32 range is narrow (SD 0.013), so the test could be underpowered. This script puts a language-cluster bootstrap 95% CI around the within slope (language-centred OLS) and around the between slope,
//   computes the power-style quantity "expected within-language AUC SD if the between slope were causal at stream level" = 0.454 x 0.0134 against the observed within-language AUC SD, and tests the difference within slope minus between slope by the same bootstrap. Also: the within slope after discarding the languages with the smallest FWC32 range (keep the top half by range), and the within slope of AUC on window index (drift).
// DECISIONS (fixed now). The between slope is "consistent with the within data" iff it lies inside the within-slope bootstrap 95% CI. If the CI upper bound is < 0.454 the stream-level reading (slope = between slope) is excluded at the 95% level; if the CI contains 0.454 the experiment is underpowered and the stream-level question is OPEN.
// BLIND PREDICTIONS. CI upper bound < 0.454: 0.60 (because the pooled estimate is strongly negative and the noise SD is about 0.03). The between slope CI excludes 0: 0.95.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { round, mean, mulberry, headerSha, inBand, spearman } from "./lib-attack.mjs";
const R = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), out = { headerSha256: headerSha(import.meta.url) }, rnd = mulberry(20261008);
const el = R.rows.filter((r) => !r.error && !r.thin && inBand(r.pos)), by = new Map(); for (const r of el) (by.get(r.name) ?? by.set(r.name, []).get(r.name)).push(r);
const langs = [...by.entries()].filter(([, v]) => v.length >= 4).map(([name, rows]) => ({ name, rows }));
const wslope = (ls) => { let sxy = 0, sxx = 0; for (const l of ls) { const mf = mean(l.rows.map((r) => r.fwc32)), ma = mean(l.rows.map((r) => r.auc)); for (const r of l.rows) { sxy += (r.fwc32 - mf) * (r.auc - ma); sxx += (r.fwc32 - mf) ** 2; } } return sxx ? sxy / sxx : null; };
const bslope = (ls) => { const m = ls.map((l) => ({ f: mean(l.rows.map((r) => r.fwc32)), a: mean(l.rows.map((r) => r.auc)) })), mf = mean(m.map((x) => x.f)), ma = mean(m.map((x) => x.a)); return m.reduce((t, x) => t + (x.f - mf) * (x.a - ma), 0) / m.reduce((t, x) => t + (x.f - mf) ** 2, 0); };
const boot = (fn, B = 4000) => { const v = [], n = langs.length; for (let b = 0; b < B; b++) { const s = Array.from({ length: n }, () => langs[Math.floor(rnd() * n)]); const x = fn(s); if (x != null && Number.isFinite(x)) v.push(x); } v.sort((a, b) => a - b); return [round(v[Math.floor(0.025 * v.length)], 3), round(v[Math.floor(0.975 * v.length)], 3)]; };
out.n = { langs: langs.length, windows: langs.reduce((a, l) => a + l.rows.length, 0) };
out.within = { slope: round(wslope(langs), 3), ci: boot(wslope) }; out.between = { slope: round(bslope(langs), 3), ci: boot(bslope) };
const diff = (s) => wslope(s) - bslope(s); out.diff = { est: round(diff(langs), 3), ci: boot(diff) };
const sdOf = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((t, x) => t + (x - m) ** 2, 0) / (xs.length - 1)); };
const wAuc = langs.flatMap((l) => { const m = mean(l.rows.map((r) => r.auc)); return l.rows.map((r) => r.auc - m); }), wF = langs.flatMap((l) => { const m = mean(l.rows.map((r) => r.fwc32)); return l.rows.map((r) => r.fwc32 - m); });
out.power = { withinFwcSD: round(sdOf(wF), 4), withinAucSD: round(sdOf(wAuc), 4), expectedAucSDFromBetweenSlope: round(out.between.slope * sdOf(wF), 4), ratio: round((out.between.slope * sdOf(wF)) / sdOf(wAuc), 3) };
const rng = (l) => Math.max(...l.rows.map((r) => r.fwc32)) - Math.min(...l.rows.map((r) => r.fwc32)), sorted = langs.slice().sort((a, b) => rng(b) - rng(a)), top = sorted.slice(0, Math.ceil(sorted.length / 2));
out.topHalfByRange = { n: top.length, slope: round(wslope(top), 3), meanRange: round(mean(top.map(rng)), 3), names: top.map((l) => l.name).join(" ") };
const drift = langs.map((l) => spearman(l.rows.map((r) => r.k), l.rows.map((r) => r.auc))); out.drift = { meanRhoAucVsWindowIndex: round(mean(drift), 3), meanRhoFwcVsWindowIndex: round(mean(langs.map((l) => spearman(l.rows.map((r) => r.k), l.rows.map((r) => r.fwc32)))), 3) };
out.decision = out.within.ci[1] < out.between.slope ? "STREAM_LEVEL_SLOPE_EXCLUDED_AT_95" : "UNDERPOWERED_OPEN";
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
