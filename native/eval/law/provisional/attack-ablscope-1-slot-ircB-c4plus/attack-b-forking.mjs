// attack-b-forking.mjs -- ATTACK B (FORKING PATHS, SCOPE RE-DERIVATION, MULTIPLICITY) on rule "ablscope-1-slot-ircB-c4plus": IF English IRC (M=256), token not message-initial, local count c >= 4 THEN S_ENTRY >= 1 marks a nickname.
//   node attack-b-forking.mjs [--B 1000] [--splits 400]      (reads ONLY the confirmer's registered design.json and stored reads; writes results/attack-b.json)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; the sha256 of everything above the END marker goes into the output) ═══
// WRITTEN: after attacks A and C (and their follow-ups) were run, BEFORE any statistic of THIS file was computed. DISCLOSURE: from the confirmer's task text I know its numbers (T1 AUC 0.847 on 75 pairs, strata 0.778 / 0.915 / 0.714, E_REUSE 0.817, group-A specificity 0.717, floor c<=3 exactly 0.500, DE / ES / IT 0.86 / 0.845 / 0.696 pooled 0.772,
//   UD pooled 0.5046, Turkish 0.621 flagged, Finnish 0.5625). From attacks A / C I know that S_ENTRY >= 1 is a subset of rinit >= 0.5 and that the signal sits entirely in the first slot (shufK 0.83). I have not computed any split-half, permutation-max, Holm or per-year statistic of this file.
// DATA. The confirmer's design.json with its stored reads: English arms E_CORE (33 untouched days, 75 B c4+ pairs), E_SRV (17 untouched ubuntu-server days), E_REUSE (14 days read by earlier tests), groups A (message-initial) and B, strata c2 c3 c4_6 c7_15 c16p; X_DE / X_ES / X_IT; UD (53 test splits, B c2..c16p, M=128).
//   Cells = (group, stratum): A c4_6, A c7_15, A c16p, B c2, B c3, B c4_6, B c7_15, B c16p (A c2/c3 were not designed). Unit of resampling = DAY (document). Score S_ENTRY; flag threshold 1.
// TESTS AND DECISION RULES (fixed now; thresholds as in the rule's own passIf / failIf, tightened where marked [T]).
//   B1 PROCESS AUDIT: (a) the sha256 of the confirmer's header recomputed from analyse.mjs equals the recorded one (logs/header.sha256 and results/confirmation.json) and the recorded file predates the first read file; (b) the confirmer's passList thresholds equal or tighten the scoper's passIf; (c) per-day strict AUC (> 0.5, = 0.5, < 0.5) for the 13 T1 days
//       and the number of T1 days whose S_ENTRY is identically 0 for names and controls (a day with AUC exactly 0.5 does not count as "AUC > 0.5"); (d) is the floor test (c <= 3, AUC exactly 0.500) informative? (share of c2/c3 tokens with S_ENTRY >= 1 among names and controls; if 0 for both, the floor test has no power).
//   B2 SPLIT-HALF SCOPE RE-DERIVATION over days, S = 400 random 50/50 splits of the English days that carry pairs (E_CORE + E_SRV + E_REUSE pooled): on the DISCOVERY half a cell is SELECTED if n >= 10 pairs, AUC >= 0.65 and specificity (share of controls with S = 0) >= 0.90; the scope = union of selected cells;
//       evaluated on the HELD-OUT half: AUC of the union (cells weighted by pairs), specificity, and the held-out AUC of the REGISTERED scope {B c4_6, B c7_15, B c16p}. The registered scope is NOT a lucky subset if: B c4_6 and B c7_15 are selected in >= 90% of splits, B c16p in >= 60%, B c2 and B c3 in <= 5%, every group-A cell in <= 10%,
//       and the 5th percentile of the held-out AUC of the registered scope is >= 0.70 [T: the confirmer's pass level is 0.62]. Also: discover on E_REUSE (all days), evaluate on E_CORE (the confirmation) and the reverse.
//   B3 SELECTION INFLATION / MULTIPLICITY: (a) the maximum over the 8 cells (n >= 20) of the cell AUC, observed vs its within-pair label-swap permutation null (B = 1000), q95 and p; (b) permutation p-value of the stratified AUC of every confirmatory set (T1 E_CORE, T2 E_REUSE, T3 E_SRV, DE, ES, IT, DE+ES+IT, 53 UD languages with >= 15 B c4+ pairs),
//       Holm-adjusted over all of them; the expected number of "AUC >= 0.62" sets under the null (sum of per-set null exceedance probabilities) vs the observed number; (c) 53 UD languages: observed number with AUC >= 0.62 and the observed max, vs the null distribution of both (B = 1000).
//       Decision: multiplicity does NOT explain the English pass if the T1 and T2 Holm-adjusted p < 0.01 and the observed cell max exceeds the null q95; the extension to other languages is NOT supported if the observed number of UD languages >= 0.62 lies inside the null 95% band.
//   B4 HETEROGENEITY OF THE SCOPE: AUC of the 497 English pairs by channel (ubuntu, kubuntu, xubuntu, ubuntu-server) and by year band (<= 2008, 2009-2011, >= 2012), leave-one-day-out range, share of the sensitivity carried by the top 3 positive forms. The scope "ubuntu/kubuntu/xubuntu 2004-2015" holds iff every channel and band
//       with >= 30 pairs has AUC >= 0.62.
//   B5 THRESHOLD CHOICE: AUC of S_ENTRY >= 1 vs >= 2 vs >= 3 vs the raw count (S_ALL) on the 497 pairs; the registered threshold >= 1 is "non-arbitrary" if its AUC is within 0.02 of the best of {>= 1, >= 2, >= 3}.
// VERDICT OF ATTACK B: SUCCESSFUL (rule FALLS) if the registered scope is not stable under B2 in the sense that B c4_6 or B c7_15 is selected in < 70% of splits or the 5th percentile held-out AUC < 0.62, or if B3 finds the English pass explained by multiplicity.
//   NARROWING if B2 is stable but a channel / year band fails B4, B c16p fails (< 60% selected), or the extension languages fail B3(c); FAILED if B2, B3 and B4 all pass.
// BLIND PREDICTIONS. B2: B c4_6 and B c7_15 selected >= 90%: 0.85; B c16p >= 60%: 0.75; B c2 / c3 <= 5%: 0.95; group A cells <= 10%: 0.90; 5th percentile held-out AUC >= 0.70: 0.65. B3: T1 and T2 Holm p < 0.01: 0.97; observed UD count inside null band: 0.90. B4: every channel/band with >= 30 pairs >= 0.62: 0.75; B5: >= 1 within 0.02 of the best: 0.70.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, ST23, loadTokens, pairsOf, byStratum, liveBy, summarise, sens, spec, aucPN, aucPairs, stratAuc, permStrat, round, mean, quantile, rngFor } from "./lib-a.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const B = Number(opt("--B", 1000)), NSPL = Number(opt("--splits", 400)); let seedCtr = 20261011; const nextSeed = () => seedCtr++;
const S = (m) => m.S, OUT = { module: "eval/law/provisional/attack-ablscope-1-slot-ircB-c4plus/attack-b-forking.mjs", rule: "ablscope-1-slot-ircB-c4plus", B, splits: NSPL };
const { tokens, missing } = loadTokens(); OUT.tokensLoaded = tokens.length; OUT.missing = missing;
const ENG = ["E_CORE", "E_SRV", "E_REUSE"], ALLP = pairsOf(tokens, (t) => t.cond === "real" && ENG.includes(t.arm));
const cellOf = (x) => `${x.grp}:${x.stratum}`, CELLS = ["A:c4_6", "A:c7_15", "A:c16p", "B:c2", "B:c3", "B:c4_6", "B:c7_15", "B:c16p"], REG = ["B:c4_6", "B:c7_15", "B:c16p"];
const stratOfCells = (ps, cells) => { let w = 0, a = 0; for (const c of cells) { const q = ps.filter((x) => cellOf(x) === c); if (q.length < 2) continue; a += aucPairs(q, S) * q.length; w += q.length; } return w ? a / w : null; };
const specOf = (ps) => (ps.length ? ps.filter((x) => x.n.S === 0).length / ps.length : null);

// ── B1 process audit ────────────────────────────────────────────────────────────────────────────────────────────────────
{ const src = fs.readFileSync(path.join(CONF, "analyse.mjs"), "utf8"), recomputed = createHash("sha256").update(src.split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  const logged = fs.readFileSync(path.join(CONF, "logs", "header.sha256"), "utf8").trim().split(/\s+/)[0], inJson = JSON.parse(fs.readFileSync(path.join(CONF, "results", "confirmation.json"), "utf8")).headerSha256;
  const rd = path.join(CONF, "data", "read"), jl = fs.readdirSync(rd).filter((f) => f.endsWith(".jsonl")).map((f) => fs.statSync(path.join(rd, f)));
  const firstRead = Math.min(...jl.map((s) => s.birthtimeMs)), hdrFile = fs.statSync(path.join(CONF, "logs", "header.sha256")), anaFile = fs.statSync(path.join(CONF, "analyse.mjs"));
  const passCode = src.slice(src.indexOf("function passList"), src.indexOf("// ── natural-sample"));
  const has = (re) => re.test(passCode);
  const T1p = ALLP.filter((x) => x.arm === "E_CORE" && x.grp === "B" && ST4.includes(x.stratum)), days = [...new Set(T1p.map((x) => x.doc))].sort();
  const perDay = days.map((d) => { const ps = T1p.filter((x) => x.doc === d), a = aucPairs(ps, S); return { day: d, pairs: ps.length, auc: round(a), allZero: ps.every((x) => x.p.S === 0 && x.n.S === 0), namesFlagged: ps.filter((x) => x.p.S >= 1).length }; });
  const floorPairs = ALLP.filter((x) => x.grp === "B" && ST23.includes(x.stratum)), floorByArm = (arms) => floorPairs.filter((x) => arms.includes(x.arm));
  OUT.B1 = { headerRecomputedEqualsLogged: recomputed === logged, headerRecomputedEqualsJson: recomputed === inJson, headerSha256: recomputed,
    headerLogPredatesFirstReadFile: hdrFile.mtimeMs < firstRead, headerLogTime: new Date(hdrFile.mtimeMs).toISOString(), firstReadFileBirth: new Date(firstRead).toISOString(), analyseMjsLastModified: new Date(anaFile.mtimeMs).toISOString(), analyseBodyEditedAfterFirstRead: anaFile.mtimeMs > firstRead,
    passListCode: { auc062: has(/r\.auc >= 0\.62/), lb055: has(/r\.ci\[0\] > 0\.55/), permQ95: has(/r\.auc > r\.permQ95/), controlsInBand: has(/r\.controlsInBand/), probe058: has(/controlProbeAuc <= 0\.58/), consistency75: has(/above \/ r\.consistency\.evaluable >= 0\.75/), spec095: has(/r\.spec >= 0\.95/) },
    perDayT1: { days: perDay.length, aucStrictlyAbove05: perDay.filter((d) => d.auc > 0.5).length, aucEqual05: perDay.filter((d) => d.auc === 0.5).length, aucBelow05: perDay.filter((d) => d.auc < 0.5).length, daysAllZero: perDay.filter((d) => d.allZero).length, detail: perDay },
    floor: { E_CORE_E_SRV: { pairs: floorByArm(["E_CORE", "E_SRV"]).length, namesFlagged: sens(floorByArm(["E_CORE", "E_SRV"])), controlsFlagged: round(1 - spec(floorByArm(["E_CORE", "E_SRV"]))) }, E_REUSE: { pairs: floorByArm(["E_REUSE"]).length, namesFlagged: sens(floorByArm(["E_REUSE"])), controlsFlagged: round(1 - spec(floorByArm(["E_REUSE"]))) } } };
  const fl = OUT.B1.floor.E_CORE_E_SRV; OUT.B1.floorTestHasNoPower = fl.namesFlagged === 0 && fl.controlsFlagged === 0; }

// ── B2 split-half scope re-derivation over days ──────────────────────────────────────────────────────────────────────
function discoverAndEvaluate(disc, held) {
  const sel = [];
  for (const c of CELLS) { const q = disc.filter((x) => cellOf(x) === c); if (q.length >= 10 && aucPairs(q, S) >= 0.65 && specOf(q) >= 0.90) sel.push(c); }
  const evalIn = (cells) => { const q = held.filter((x) => cells.includes(cellOf(x))); return { auc: q.length >= 4 ? stratOfCells(q, cells) : null, spec: specOf(q), n: q.length }; };
  return { sel, selectedHeld: sel.length ? evalIn(sel) : null, registeredHeld: evalIn(REG) };
}
{ const days = [...new Set(ALLP.map((x) => x.doc))].sort(), rnd = rngFor(nextSeed()), selCount = Object.fromEntries(CELLS.map((c) => [c, 0])), regAuc = [], selAuc = [], regSpec = []; let exactReg = 0, noneSel = 0, usable = 0;
  for (let k = 0; k < NSPL; k++) { const d = days.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const A = new Set(d.slice(0, Math.floor(d.length / 2))), r = discoverAndEvaluate(ALLP.filter((x) => A.has(x.doc)), ALLP.filter((x) => !A.has(x.doc)));
    for (const c of r.sel) selCount[c] += 1; if (r.sel.length === 3 && REG.every((c) => r.sel.includes(c))) exactReg += 1; if (!r.sel.length) noneSel += 1;
    if (r.registeredHeld.auc != null) { regAuc.push(r.registeredHeld.auc); regSpec.push(r.registeredHeld.spec); } if (r.selectedHeld?.auc != null) selAuc.push(r.selectedHeld.auc); usable += 1; }
  const frac = Object.fromEntries(CELLS.map((c) => [c, round(selCount[c] / usable, 3)]));
  OUT.B2 = { days: days.length, splits: usable, selectionFrequency: frac, exactRegisteredScopeFrequency: round(exactReg / usable, 3), noCellSelected: noneSel,
    registeredHeldOut: { median: round(quantile(regAuc, 0.5)), p05: round(quantile(regAuc, 0.05)), p95: round(quantile(regAuc, 0.95)), min: round(Math.min(...regAuc)), specMedian: round(quantile(regSpec, 0.5)), specP05: round(quantile(regSpec, 0.05)) },
    selectedScopeHeldOut: { n: selAuc.length, median: round(quantile(selAuc, 0.5)), p05: round(quantile(selAuc, 0.05)), p95: round(quantile(selAuc, 0.95)) } };
  const f = frac; OUT.B2.stable = { b46_b715_ge90: f["B:c4_6"] >= 0.9 && f["B:c7_15"] >= 0.9, b16p_ge60: f["B:c16p"] >= 0.6, floorCellsLe5: f["B:c2"] <= 0.05 && f["B:c3"] <= 0.05, groupALe10: ["A:c4_6", "A:c7_15", "A:c16p"].every((c) => f[c] <= 0.10), p05HeldOutGe070: OUT.B2.registeredHeldOut.p05 >= 0.70, p05HeldOutGe062: OUT.B2.registeredHeldOut.p05 >= 0.62,
    lowSelection70: f["B:c4_6"] < 0.7 || f["B:c7_15"] < 0.7 };
  // data-source split: discover on E_REUSE, evaluate on E_CORE (the confirmation direction) and the reverse
  OUT.B2.bySource = { reuseToCore: discoverAndEvaluate(ALLP.filter((x) => x.arm === "E_REUSE"), ALLP.filter((x) => x.arm === "E_CORE" || x.arm === "E_SRV")), coreToReuse: discoverAndEvaluate(ALLP.filter((x) => x.arm === "E_CORE" || x.arm === "E_SRV"), ALLP.filter((x) => x.arm === "E_REUSE")) }; }

// ── B3 selection inflation and multiplicity ─────────────────────────────────────────────────────────────────────────────
// exact one-sided binomial tail P(X >= k), X ~ Bin(n, 1/2) (McNemar exact test on the discordant pairs) -- added after run 1 because the permutation p-value cannot go below 1/(B+1)
const binomTail = (n, k) => { if (n === 0) return 1; const lf = [0]; for (let i = 1; i <= n; i++) lf.push(lf[i - 1] + Math.log(i)); let s = 0; for (let j = k; j <= n; j++) s += Math.exp(lf[n] - lf[j] - lf[n - j] - n * Math.LN2); return Math.min(1, s); };
const sw = (x) => ({ ...x, p: x.n, n: x.p });
const nullAuc = (by, rnd) => { const ps = {}; for (const [st, arr] of Object.entries(by)) ps[st] = arr.map((x) => (rnd() < 0.5 ? sw(x) : x)); return stratAuc(ps, S); };
{ const rnd = rngFor(nextSeed()), cells = CELLS.filter((c) => ALLP.filter((x) => cellOf(x) === c).length >= 20), obs = Object.fromEntries(cells.map((c) => [c, round(aucPairs(ALLP.filter((x) => cellOf(x) === c), S))])), maxObs = Math.max(...Object.values(obs)), mx = [];
  const byCell = Object.fromEntries(cells.map((c) => [c, ALLP.filter((x) => cellOf(x) === c)]));
  for (let b = 0; b < B; b++) { let m = 0; for (const c of cells) { const ps = byCell[c].map((x) => (rnd() < 0.5 ? sw(x) : x)), a = aucPairs(ps, S); if (a > m) m = a; } mx.push(m); }
  OUT.B3a = { cells: obs, observedMax: maxObs, nullMaxQ95: round(quantile(mx, 0.95)), nullMaxMean: round(mean(mx)), p: round((mx.filter((v) => v >= maxObs).length + 1) / (mx.length + 1), 4), minCellAucOfRegistered: Math.min(...REG.map((c) => obs[c])) }; }
{ const sets = {}, add = (name, ps) => { const by = liveBy(ps, ST4), n = Object.values(by).flat().length; if (n >= 15) sets[name] = by; };
  const g = (arms) => ALLP.filter((x) => arms.includes(x.arm) && x.grp === "B" && ST4.includes(x.stratum));
  add("T1_E_CORE", g(["E_CORE"])); add("T2_E_REUSE", g(["E_REUSE"])); add("T3_E_SRV", g(["E_SRV"]));
  const xp = (a) => pairsOf(tokens, (t) => t.cond === "real" && a.includes(t.arm) && t.grp === "B" && ST4.includes(t.stratum)); add("X_DE", xp(["X_DE"])); add("X_ES", xp(["X_ES"])); add("X_IT", xp(["X_IT"])); add("X_ALL", xp(["X_DE", "X_ES", "X_IT"]));
  const ud = pairsOf(tokens, (t) => t.arm === "UD" && t.grp === "B" && ST4.includes(t.stratum)), langs = [...new Set(ud.map((x) => x.doc))].sort(); for (const l of langs) add(`UD:${l.slice(3)}`, ud.filter((x) => x.doc === l));
  const rnd = rngFor(nextSeed()), names = Object.keys(sets), rec = {}; const nullByName = {};
  for (const nm of names) { const by = sets[nm], obs = stratAuc(by, S), xs = []; for (let b = 0; b < B; b++) xs.push(nullAuc(by, rnd)); nullByName[nm] = xs;
    const allp = Object.values(by).flat(), bN = allp.filter((x) => x.p.S >= 1 && x.n.S < 1).length, cN = allp.filter((x) => x.n.S >= 1 && x.p.S < 1).length;
    rec[nm] = { aucRaw: obs, signTest: { nameOnly: bN, controlOnly: cN, pExactOneSided: binomTail(bN + cN, bN) }, pairs: Object.values(by).flat().length, auc: round(obs), p: round((xs.filter((v) => v >= obs - 1e-12).length + 1) / (xs.length + 1), 4), nullExceed062: round(xs.filter((v) => v >= 0.62).length / xs.length, 4), nullQ95: round(quantile(xs, 0.95)) }; }
  // Holm over all sets
  const order = names.slice().sort((a, b) => rec[a].p - rec[b].p); let prev = 0; order.forEach((nm, k) => { const adj = Math.min(1, rec[nm].p * (names.length - k)); prev = Math.max(prev, adj); rec[nm].holm = round(prev, 4); });
  { const ord = names.slice().sort((a, b) => rec[a].signTest.pExactOneSided - rec[b].signTest.pExactOneSided); let pv = 0; ord.forEach((nm, k) => { const adj = Math.min(1, rec[nm].signTest.pExactOneSided * (names.length - k)); pv = Math.max(pv, adj); rec[nm].signTest.holmExact = pv; }); }
  const udNames = names.filter((n) => n.startsWith("UD:")), obsCount = udNames.filter((n) => rec[n].auc >= 0.62).length, expCount = udNames.reduce((a, n) => a + rec[n].nullExceed062, 0);
  // simultaneous null for the UD count / max
  const cnt = [], mxu = []; for (let b = 0; b < B; b++) { let c = 0, m = 0; for (const n of udNames) { const v = nullByName[n][b]; if (v >= 0.62) c += 1; if (v > m) m = v; } cnt.push(c); mxu.push(m); }
  const obsMax = Math.max(...udNames.map((n) => rec[n].aucRaw - 1e-12));
  OUT.B3b = { sets: rec, numberOfSets: names.length, udLanguages: udNames.length, udObservedCountGe062: obsCount, udExpectedCountGe062Null: round(expCount, 2), udNullCountQ95: quantile(cnt, 0.95), udNullCountMean: round(mean(cnt), 2), udObservedMax: round(obsMax + 1e-12), udNullMaxQ95: round(quantile(mxu, 0.95)), udMaxP: round((mxu.filter((v) => v >= obsMax).length + 1) / (mxu.length + 1), 4), udCountP: round((cnt.filter((v) => v >= obsCount).length + 1) / (cnt.length + 1), 4),
    udLanguagesGe062: udNames.filter((n) => rec[n].auc >= 0.62).map((n) => [n, rec[n].auc, rec[n].pairs, rec[n].p, rec[n].holm]),
    englishHolm: { T1: rec.T1_E_CORE?.holm, T2: rec.T2_E_REUSE?.holm }, englishHolmExact: { T1: rec.T1_E_CORE?.signTest.holmExact, T2: rec.T2_E_REUSE?.signTest.holmExact, T3: rec.T3_E_SRV?.signTest.holmExact }, udHolmExact: Object.fromEntries(udNames.filter((n) => rec[n].auc >= 0.55).map((n) => [n, rec[n].signTest.holmExact])), extensionLanguagesHolm: { DE: rec.X_DE?.holm, ES: rec.X_ES?.holm, IT: rec.X_IT?.holm, ALL: rec.X_ALL?.holm } };
  OUT.B3 = { multiplicityDoesNotExplainEnglishExact: (rec.T1_E_CORE?.signTest.holmExact ?? 1) < 0.01 && (rec.T2_E_REUSE?.signTest.holmExact ?? 1) < 0.01 && OUT.B3a.observedMax > OUT.B3a.nullMaxQ95, multiplicityDoesNotExplainEnglish: (rec.T1_E_CORE?.holm ?? 1) < 0.01 && (rec.T2_E_REUSE?.holm ?? 1) < 0.01 && OUT.B3a.observedMax > OUT.B3a.nullMaxQ95, udCountInsideNullBand: obsCount <= quantile(cnt, 0.95) }; }

// ── B4 heterogeneity of the scope ────────────────────────────────────────────────────────────────────────────────────────
{ const P4 = ALLP.filter((x) => x.grp === "B" && ST4.includes(x.stratum)), by = (ps) => liveBy(ps, ST4), au = (ps) => (Object.values(by(ps)).flat().length >= 6 ? round(stratAuc(by(ps), S)) : null);
  const chan = (x) => x.doc.split("/")[0], year = (x) => Number(x.doc.split("/")[1].slice(0, 4)), band = (x) => (year(x) <= 2008 ? "<=2008" : year(x) <= 2011 ? "2009-2011" : ">=2012");
  const grp = (f) => { const o = {}; for (const x of P4) (o[f(x)] ??= []).push(x); return Object.fromEntries(Object.entries(o).map(([k, ps]) => [k, { pairs: ps.length, days: new Set(ps.map((x) => x.doc)).size, auc: au(ps), sens: sens(ps), spec: spec(ps) }])); };
  const days = [...new Set(P4.map((x) => x.doc))], loo = days.map((d) => au(P4.filter((x) => x.doc !== d))).filter((v) => v != null);
  const flaggedByForm = new Map(); for (const x of P4) if (x.p.S >= 1) flaggedByForm.set(x.p.w, (flaggedByForm.get(x.p.w) ?? 0) + 1); const top3 = [...flaggedByForm].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w), nFlag = [...flaggedByForm.values()].reduce((a, b) => a + b, 0);
  OUT.B4 = { all: { pairs: P4.length, auc: au(P4) }, byChannel: grp(chan), byYearBand: grp(band), byArm: grp((x) => x.arm), leaveOneDayOut: { days: days.length, min: round(Math.min(...loo)), max: round(Math.max(...loo)) }, flaggedNamesTotal: nFlag, positiveFormsFlagged: flaggedByForm.size, top3FormsShareOfFlagged: round(top3.reduce((a, w) => a + flaggedByForm.get(w), 0) / nFlag), aucWithoutTop3Forms: au(P4.filter((x) => !top3.includes(x.p.w))) };
  const bad = [...Object.entries(OUT.B4.byChannel), ...Object.entries(OUT.B4.byYearBand)].filter(([, v]) => v.pairs >= 30 && (v.auc == null || v.auc < 0.62)); OUT.B4.failingGroups = bad.map(([k, v]) => [k, v.pairs, v.auc]); OUT.B4.scopeHolds = bad.length === 0; }
// ── B5 threshold choice ────────────────────────────────────────────────────────────────────────────────────────────────
{ const P5 = liveBy(ALLP.filter((x) => x.grp === "B" && ST4.includes(x.stratum)), ST4), thr = (k) => (m) => (m.S >= k ? 1 : 0), r = { ge1: stratAuc(P5, thr(1)), ge2: stratAuc(P5, thr(2)), ge3: stratAuc(P5, thr(3)), SALL: stratAuc(P5, (m) => m.SALL), S_raw: stratAuc(P5, S) };
  OUT.B5 = { ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, round(v)])), ge1WithinOf002OfBest: r.ge1 >= Math.max(r.ge1, r.ge2, r.ge3) - 0.02 }; }
// ── verdict of attack B ─────────────────────────────────────────────────────────────────────────────────────────────────
// REGISTERED MECHANICAL (as in the header, permutation Holm; run 1 = results/attack-b.registered-mechanical-run1.json) and CORRECTED (run 2): the permutation p-value cannot go below 1/(B+1) = 0.001, so Holm over 38 sets gives >= 0.038 > 0.01 and the registered
// criterion "Holm p < 0.01" was unsatisfiable by construction (a flaw of my registration, the same one the confirmer met for its UD bound); run 2 uses the exact sign test on the discordant pairs. Run 1 also coded the UD flag in the inverted direction and rounded the UD maximum upward.
{ const st = OUT.B2.stable, mk = (multOk) => { const hard = st.lowSelection70 || !st.p05HeldOutGe062 || !multOk, soft = !st.b16p_ge60 || !OUT.B4.scopeHolds || OUT.B3.udCountInsideNullBand || !st.p05HeldOutGe070 || !st.groupALe10 || !st.floorCellsLe5; return hard ? "SUCCESSFUL" : soft ? "NARROWING" : "FAILED"; };
  OUT.verdictAttackB_registeredMechanical = mk(OUT.B3.multiplicityDoesNotExplainEnglish); OUT.verdictAttackB = mk(OUT.B3.multiplicityDoesNotExplainEnglishExact);
  OUT.verdictSoftFlags = { b16pLt60: !st.b16p_ge60, scopeBandFails: !OUT.B4.scopeHolds, udInsideNullBand_extensionUnsupported: OUT.B3.udCountInsideNullBand, p05Lt070: !st.p05HeldOutGe070, groupAFlags: !st.groupALe10, floorCellsFlag: !st.floorCellsLe5 }; }
OUT.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-b.json"), JSON.stringify(OUT, null, 1));
const keep = { headerSha256: OUT.headerSha256, verdictAttackB: OUT.verdictAttackB, verdictAttackB_registeredMechanical: OUT.verdictAttackB_registeredMechanical, verdictSoftFlags: OUT.verdictSoftFlags, B1: { ...OUT.B1, perDayT1: { ...OUT.B1.perDayT1, detail: undefined } }, B2: OUT.B2, B3a: OUT.B3a, B3: OUT.B3, B3b: { ...OUT.B3b, sets: Object.fromEntries(Object.entries(OUT.B3b.sets).filter(([k]) => !k.startsWith("UD:"))) }, B4: OUT.B4, B5: OUT.B5 };
console.log(JSON.stringify(keep, null, 1));
