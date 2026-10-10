// eval/physics-handles/gravity-report.mjs — analysis of gravity.mjs: implements the rules of ITS pre-registered header (PG1..PG9), nothing else.
import fs from "node:fs";
import path from "node:path";
import { round, mean, median, quantile, spearman, permP, familiesOf, STEMS25, sum, headerSha256 } from "./lib.mjs";

const load = (dir, name) => { const f = path.join(dir, `${name}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };

export async function report(dir) {
  const stems = STEMS25.filter((s) => s !== "cmn-hans"); // same text as cmn in another script: excluded from across-language statistics
  const F = familiesOf(STEMS25).fam;
  const all = {};
  for (const s of STEMS25) for (const f of ["A", "B"]) { const r = load(dir, `ud-${s}-${f}`); if (r) all[`${s}:${f}`] = r; }
  for (const n of ["irc", "wp", "sms-en", "cosem"]) { const r = load(dir, n); if (r) all[n] = r; }
  const R = { headerSha256: headerSha256(new URL("./gravity.mjs", import.meta.url).pathname), corpora: Object.keys(all).length, perCorpus: {}, tests: {} };
  const powered = Object.entries(all).filter(([, r]) => !r.underpowered);
  // per corpus table
  for (const [k, r] of Object.entries(all)) {
    const t = r.token, b = r.burst;
    R.perCorpus[k] = { tokens: r.tokens, bodies: r.bodies, mentions: r.mentions, underpowered: r.underpowered, aboveBand: t.binsAboveBand ?? null, alpha: t.fit?.alpha ?? null, alphaCI: t.alphaCI?.map((x) => round(x, 3)) ?? null, dAIC: round(t.fit?.dAIC, 2) ?? null, dAICshare: t.dAICshare ?? null, fitGap: t.fit?.gap ?? null, asym12: r.asym12?.mean ?? null, massSpearman: r.massDependence?.spearmanNvsA1 ?? null, massCI: [r.massDependence?.lo, r.massDependence?.hi], controlRatios: r.controlRatios ?? null, burstAbove: b?.all?.above ?? null, burstAlpha: b?.all?.fit?.alpha ?? null, burstDAIC: round(b?.all?.fit?.dAIC, 2) ?? null, burstDAICshare: b?.all?.dAICshare ?? null, burstReach: b?.all?.reach ?? null, dilationSpearman: b?.dilation?.spearman ?? null, burstNullInBand: b?.all?.nullInBand ?? null };
  }
  const P = Object.fromEntries(powered.map(([k, r]) => [k, R.perCorpus[k]]));
  const frac = (xs, f) => { const v = xs.filter((x) => x !== undefined); return { n: v.length, k: v.filter(f).length, share: v.length ? round(v.filter(f).length / v.length) : null }; };
  // PG1
  R.tests.PG1_existence = { ...frac(Object.values(P), (c) => c.aboveBand >= 6), rule: ">= 6 of 8 bins above the band, in >= 90% of powered corpora", pass: null };
  R.tests.PG1_existence.pass = R.tests.PG1_existence.share >= 0.9; R.tests.PG1_existence.falsified = frac(Object.values(P), (c) => c.aboveBand < 4).share >= 0.5;
  // PG2
  const fitted = Object.values(P).filter((c) => c.alpha !== null);
  R.tests.PG2_form = { fitted: fitted.length, powerWins: fitted.filter((c) => c.dAIC >= 4 && (c.dAICshare ?? 0) >= 0.8).length, share: round(fitted.filter((c) => c.dAIC >= 4 && (c.dAICshare ?? 0) >= 0.8).length / Math.max(1, fitted.length)), medianAlpha: round(median(fitted.map((c) => c.alpha))), alphaQuartiles: [round(quantile(fitted.map((c) => c.alpha), 0.25)), round(quantile(fitted.map((c) => c.alpha), 0.75))], pass: null };
  R.tests.PG2_form.pass = R.tests.PG2_form.share >= 0.75; R.tests.PG2_form.falsified = R.tests.PG2_form.share < 0.5; R.tests.PG2_form.alphaInPredictedRange = R.tests.PG2_form.medianAlpha >= 0.2 && R.tests.PG2_form.medianAlpha <= 1.0;
  // PG3 stability
  const both = stems.filter((s) => all[`${s}:A`]?.token.fit?.alpha !== undefined && all[`${s}:B`]?.token.fit?.alpha !== undefined && !all[`${s}:A`].underpowered && !all[`${s}:B`].underpowered);
  const aA = both.map((s) => all[`${s}:A`].token.fit.alpha), aB = both.map((s) => all[`${s}:B`].token.fit.alpha);
  R.tests.PG3_stability = { languages: both.length, spearman: round(spearman(aA, aB)), medianAbsDiff: round(median(aA.map((a, i) => Math.abs(a - aB[i])))), pass: null };
  R.tests.PG3_stability.pass = R.tests.PG3_stability.spearman >= 0.6 && R.tests.PG3_stability.medianAbsDiff <= 0.15;
  // widest view: ALL languages with a fit on both folds regardless of the power floor (reported, not gating)
  { const b2 = stems.filter((s) => all[`${s}:A`]?.token.fit?.alpha !== undefined && all[`${s}:B`]?.token.fit?.alpha !== undefined); R.tests.PG3_stability.allLanguagesRegardlessOfPower = { languages: b2.length, spearman: round(spearman(b2.map((s) => all[`${s}:A`].token.fit.alpha), b2.map((s) => all[`${s}:B`].token.fit.alpha))) }; }
  // PG4 family
  const famTest = (langs, value) => {
    const L = langs.filter((s) => value(s) !== null && value(s) !== undefined); const labs = L.map((s) => F[s]), v = L.map(value);
    const stat = (lab) => { const d = [], e = []; for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) (lab[i] === lab[j] ? e : d).push(Math.abs(v[i] - v[j])); return d.length && e.length ? mean(d) - mean(e) : 0; };
    const obs = stat(labs); return { languages: L.length, meanDiffMinusSame: round(obs), p: round(permP(obs, stat, labs, { B: 10000, seed: 3 }), 4) };
  };
  R.tests.PG4_family = {};
  for (const f of ["A", "B"]) {
    R.tests.PG4_family[`alpha_${f}`] = famTest(stems.filter((s) => all[`${s}:${f}`] && !all[`${s}:${f}`].underpowered), (s) => all[`${s}:${f}`].token.fit?.alpha ?? null);
    R.tests.PG4_family[`asym_${f}`] = famTest(stems.filter((s) => all[`${s}:${f}`]), (s) => all[`${s}:${f}`].asym12?.mean ?? null);
    R.tests.PG4_family[`alpha_${f}_allLanguages`] = famTest(stems.filter((s) => all[`${s}:${f}`]), (s) => all[`${s}:${f}`].token.fit?.alpha ?? null);
  }
  R.tests.PG4_family.alphaFamilySpecific = R.tests.PG4_family.alpha_A.p <= 0.05 && R.tests.PG4_family.alpha_B.p <= 0.05;
  R.tests.PG4_family.asymFamilySpecific = R.tests.PG4_family.asym_A.p <= 0.05 && R.tests.PG4_family.asym_B.p <= 0.05;
  R.tests.PG4_family.byFamilyMeans = Object.fromEntries([...new Set(Object.values(F))].map((fam) => { const ls = stems.filter((s) => F[s] === fam); const al = ls.flatMap((s) => ["A", "B"].map((f) => all[`${s}:${f}`]?.token.fit?.alpha).filter((x) => x !== undefined && x !== null)); const asy = ls.flatMap((s) => ["A", "B"].map((f) => all[`${s}:${f}`]?.asym12?.mean).filter((x) => x !== undefined && x !== null)); return [fam, { languages: ls.length, meanAlpha: round(mean(al)), meanAsym12: round(mean(asy)) }]; }));
  // PG5 controls
  const cr = Object.values(P).map((c) => c.controlRatios).filter(Boolean);
  R.tests.PG5_nulls = { N1: frac(cr, (c) => c.N1_near !== null && c.N1_near <= 0.5 && c.N1_far !== null && c.N1_far >= 0.75), N2: frac(cr, (c) => c.N2_far !== null && c.N2_far <= 0.5 && c.N2_near !== null && c.N2_near >= 0.75), medians: { N1_near: round(median(cr.map((c) => c.N1_near).filter((x) => x !== null))), N1_far: round(median(cr.map((c) => c.N1_far).filter((x) => x !== null))), N2_near: round(median(cr.map((c) => c.N2_near).filter((x) => x !== null))), N2_far: round(median(cr.map((c) => c.N2_far).filter((x) => x !== null))) }, burstUnderN2InBand: null };
  R.tests.PG5_nulls.pass = R.tests.PG5_nulls.N1.share >= 0.75 && R.tests.PG5_nulls.N2.share >= 0.75;
  // PG6
  R.tests.PG6_notConstant = { ...frac(Object.values(P), (c) => c.massCI[1] !== undefined && c.massCI[1] < 0), medianSpearman: round(median(Object.values(P).map((c) => c.massSpearman).filter((x) => x !== null))), positiveIn: Object.values(P).filter((c) => c.massCI[0] > 0).length };
  R.tests.PG6_notConstant.pass = R.tests.PG6_notConstant.share >= 2 / 3;
  // PG7 / PG8
  R.tests.PG7_burst = { above6: frac(Object.values(P), (c) => (c.burstAbove ?? 0) >= 6), powerWins: frac(Object.values(P).filter((c) => c.burstAlpha !== null), (c) => c.burstDAIC >= 4 && (c.burstDAICshare ?? 0) >= 0.8), medianAlphaL: round(median(Object.values(P).map((c) => c.burstAlpha).filter((x) => x !== null))), medianReach: median(Object.values(P).map((c) => c.burstReach).filter((x) => x !== null)) };
  R.tests.PG7_burst.pass = R.tests.PG7_burst.above6.share >= 0.75 && R.tests.PG7_burst.powerWins.share >= 0.75;
  R.tests.PG8_dilation = { noDilation: frac(Object.values(P), (c) => c.dilationSpearman !== null && c.dilationSpearman <= 0.3), dilation: frac(Object.values(P), (c) => c.dilationSpearman !== null && c.dilationSpearman >= 0.5), medianSpearman: round(median(Object.values(P).map((c) => c.dilationSpearman).filter((x) => x !== null))) };
  R.tests.PG8_dilation.predictionHolds = R.tests.PG8_dilation.noDilation.share >= 0.6; R.tests.PG8_dilation.dilationSurvives = R.tests.PG8_dilation.dilation.share >= 0.6;
  // PG9 vacuum
  R.tests.PG9_vacuum = Object.fromEntries(Object.entries(all).filter(([, r]) => r.vacuum).map(([k, r]) => [k, { slope: r.vacuum.slope, rows: r.vacuum.rows.map((x) => ({ tokens: x.tokens, band012: x.band012 })) }]));
  R.tests.PG9_vacuum.pass = Object.values(R.tests.PG9_vacuum).length > 0 && Object.values(R.tests.PG9_vacuum).every((v) => v.slope !== null && v.slope >= -0.65 && v.slope <= -0.35);
  // informal vs formal English
  R.informalVsFormal = Object.fromEntries(["irc", "sms-en", "cosem", "wp", "eng:A", "eng:B"].filter((k) => all[k]).map((k) => [k, { alpha: R.perCorpus[k].alpha, CI: R.perCorpus[k].alphaCI, dAIC: R.perCorpus[k].dAIC, mentions: R.perCorpus[k].mentions, underpowered: R.perCorpus[k].underpowered, aboveBand: R.perCorpus[k].aboveBand }]));
  fs.writeFileSync(path.join(dir, "_report.json"), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R.tests, null, 1));
  return R;
}
