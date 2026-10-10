// attack-PM-R2-left-company-polarity/attack-C3-strata.mjs -- ATTACK C3: stratify the M2-matched pairs by the SIGN/TERCILE of each remaining rival difference (span, count, char length, mean unit length, mean unit index, free share). NEW FILE.
//   node attack-C3-strata.mjs code|book|ud   -> results/C3.<fam>.json     (never pass "run" as first arg)
//
// ═══ PRE-REGISTRATION (written before the first run of this file) ═══
// DISCLOSURE. Seen: attack A, A2, B, C, C2. In C2 the span caliper (|sp-sp'| <= 0.10) leaves too few code pairs (158/75/26) and the span control stays off 0.5 (js 0.36: bound identifiers are more local than external names), so C2 cannot be called valid for code. I did not look at any stratified
//   numbers. M2 rows = the same rows as attack C (same seeds: prefix 'pm-r2-attack-C', variant M2).
// QUESTION. If a remaining rival difference d = rival(P) - rival(N) (span sp, log2 count, char length, mean unit length ml, mean unit index mi) were driving DLx, the pair AUC would be ~0.5 in the stratum with d <= 0 (or d ~ 0) and above 0.5 only where d > 0 (or the reverse for negative-sign rivals).
//   For each rival the pairs are split in three by the sign of d with a deadband (|d| <= 5% of the rival's pooled SD counts as 'tie'); AUC (with cluster CI) is reported for each stratum.
// CRITERION (fixed now). The DLx effect is "not explained by rival r" iff, for js and py (code, HIGH) AUC >= 0.55 in BOTH the d > 0 and the d < 0 strata (and likewise <= 0.47 in both for books/UD pooled LOW), i.e. the sign survives where the rival would predict the opposite. Strata with < 40 pairs are marked small and not used.
// BLIND PREDICTIONS. code js: all strata >= 0.55 for all five rivals (0.7); py: (0.45); rb (0.25). Books pooled LOW in all strata (0.7). UD pooled LOW in all strata (0.8).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { specs, headerSha, HERE, round, mean, rngFor, seedFor, wr, quantile } from "./attack-lib.mjs";
import { candidates, strictPairs, capPerForm, VAL, profile } from "./attack-lib2.mjs";
const fam = process.argv[2], SHA = headerSha(fileURLToPath(import.meta.url)), M2 = { cn: 1, ces: 0.1, cfs: 0.1 };
const RIV = { sp: (r) => profile(r.P, r.w).sp, logn: VAL.logn, ch: VAL.ch, ml: VAL.ml, mi: VAL.mi, fs: VAL.fs, es: VAL.es };
const aucCI = (items) => { // items [{win, cl}] ; cluster bootstrap
  if (!items.length) return null; const by = new Map(); for (const it of items) { const a = by.get(it.cl) ?? by.set(it.cl, [0, 0]).get(it.cl); a[0] += it.win; a[1]++; } const S = [...by.values()], est = mean(items.map((i) => i.win)), rnd = rngFor(seedFor("pm-r2-attack-C3", "boot", String(items.length), String(est))), bs = [];
  for (let b = 0; b < 300; b++) { let s = 0, m = 0; for (let t = 0; t < S.length; t++) { const c = S[Math.floor(rnd() * S.length)]; s += c[0]; m += c[1]; } bs.push(s / m); } return { auc: round(est), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), pairs: items.length }; };
const out = { sha: SHA.slice(0, 16), fam, registers: {}, pooled: {} }, pooledItems = {};
for (const s of specs(fam)) {
  const bases = s.bases(); if (!bases) continue; const rows = [], per = Math.ceil(600 / bases.length);
  for (const b of bases) { const pr = strictPairs(candidates(b, s.def), rngFor(seedFor("pm-r2-attack-C", "M2", s.reg, b.name)), M2, Math.max(3000, per * 5)); rows.push(...capPerForm(pr.rows, 3).slice(0, per * 2)); }
  const n = rows.length / 2; if (n < 40) continue; const pairs = []; for (let k = 0; k < n; k++) { const p = rows[2 * k], q = rows[2 * k + 1]; pairs.push({ win: wr(VAL.DLx(p), VAL.DLx(q)), cl: `${s.reg}|${p.doc}|${p.w}`, d: Object.fromEntries(Object.entries(RIV).map(([k2, f]) => [k2, f(p) - f(q)])) }); }
  const strata = {}; for (const rv of Object.keys(RIV)) { const sd = Math.sqrt(mean(pairs.map((x) => x.d[rv] ** 2))), dead = 0.05 * sd; const pick = (f) => pairs.filter((x) => f(x.d[rv])); strata[rv] = { sdOfDiff: round(sd), pos: aucCI(pick((d) => d > dead)), tie: aucCI(pick((d) => Math.abs(d) <= dead)), neg: aucCI(pick((d) => d < -dead)) }; (pooledItems[rv] ??= { pos: [], tie: [], neg: [] }); for (const x of pairs) { const d = x.d[rv]; (d > dead ? pooledItems[rv].pos : d < -dead ? pooledItems[rv].neg : pooledItems[rv].tie).push(x); } }
  out.registers[s.reg] = { pairs: n, all: aucCI(pairs), strata }; console.error(`${s.reg} done`);
}
if (fam === "book" || fam === "ud") for (const rv of Object.keys(RIV)) out.pooled[rv] = { pos: aucCI(pooledItems[rv]?.pos ?? []), tie: aucCI(pooledItems[rv]?.tie ?? []), neg: aucCI(pooledItems[rv]?.neg ?? []) };
fs.writeFileSync(path.join(HERE, "results", `C3.${fam}.json`), JSON.stringify(out, null, 1));
for (const [reg, o] of Object.entries(out.registers)) { console.log(`== ${reg} pairs ${o.pairs} all ${o.all.auc} [${o.all.lo},${o.all.hi}]`); for (const [rv, st] of Object.entries(o.strata)) console.log(`   ${rv.padEnd(5)} d>0: ${st.pos ? `${st.pos.auc} (n${st.pos.pairs})` : "-"}   tie: ${st.tie ? `${st.tie.auc} (n${st.tie.pairs})` : "-"}   d<0: ${st.neg ? `${st.neg.auc} (n${st.neg.pairs})` : "-"}`); }
if (fam === "book" || fam === "ud") { console.log("== POOLED"); for (const [rv, st] of Object.entries(out.pooled)) console.log(`   ${rv.padEnd(5)} d>0: ${st.pos ? `${st.pos.auc} [${st.pos.lo},${st.pos.hi}] (n${st.pos.pairs})` : "-"}  tie: ${st.tie ? `${st.tie.auc} (n${st.tie.pairs})` : "-"}  d<0: ${st.neg ? `${st.neg.auc} [${st.neg.lo},${st.neg.hi}] (n${st.neg.pairs})` : "-"}`); }
