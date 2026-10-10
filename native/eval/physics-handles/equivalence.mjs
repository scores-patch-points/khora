// eval/physics-handles/equivalence.mjs — THE EQUIVALENCE PRINCIPLE: is a body's INERTIAL mass (resistance to being changed) its GRAVITATIONAL mass (the pull / warp it exerts)?
//
//   node eval/physics-handles/equivalence.mjs [--wave 1] [--out FILE]
//
// ═══ PRE-REGISTRATION (written before the first run of this file; the reader and gravity/curvature results it joins were produced earlier, and the reader's wave-1 headline
//     findings were READ before this header: fragility of a mention is flat in the mention count above the recurrence floor, REPORT.md section on inertia) ═══════════════════════════
// QUANTITIES (all per BODY = word type; units in brackets).
//   INERTIAL fragility phi_b = the mean SHADOW S (slot-changes) of single-mention deletions of the body with n >= 3 mentions in the window, over every sampled mention of it in the reader's
//     windows (reader-handles.mjs, SECOND half of the document); inertial mass is read as the RANK of -phi_b (more resistant = heavier). Bodies need >= 3 sampled mentions.
//   GRAVITATIONAL masses, both measured on the FIRST half of the same document (a different stretch of text from every reader window): m_g1 = the attraction ENERGY E_b of gravity.mjs --half H1
//     (excess coincidence summed over 8 lag bins x 2 sides, units probability x tokens); m_g2 = the curvature C_b of curvature.mjs --half H1 (DELETE: mean |change| of other pair distances).
//     Bodies = word types with >= 12 mentions in the first half (the same equivalence set the reader job targeted). IRC is EXCLUDED: its reader windows (3 channel-days, seed irc-w1) and its
//     gravity/curvature half-runs (6 channel-days, seed irc-g) are different documents, so no nickname is measured in both: a design gap, stated.
// RULES (fixed here; "bare provisional numbers"; not changed after any result).
//   EQ0 POWER GATE: split-half reliability of phi_b (Spearman of the mean over even-numbered against odd-numbered sampled mentions, bodies with >= 4 samples) must be >= 0.20 in the pooled data, else
//     the whole test is UNDERPOWERED (a null is then not a finding).
//   EQ1 SLOPE AND SPREAD: within each corpus the values are rank-normalised (z of the rank); the pooled OLS slope of z(-phi) on z(m_g) is the correlation r; the spread = sqrt(1 - r^2). The
//     partial Spearman of -phi and m_g given log n_H1 is the statistic, with a body-bootstrap interval. EQUIVALENCE SURVIVES iff, for m_g1 OR m_g2, the pooled partial rho >= 0.30 with lower bound
//     > 0.10 AND it exceeds the 95th percentile of the DERANGED control by >= 0.15 AND the sign is positive in >= 60% of the corpora. FALSIFIED iff the pooled interval includes 0 or is negative.
//   DERANGED control (built to fail): phi_b paired with the m_g of a random OTHER body of the same n_H1 quartile (2,000 derangements), the same partial statistic.
//   EQ2 REPLICATION: wave 2 (UD fold B) must agree in sign and be within 0.2 (run only if wave 2 and the fold-B half-runs exist).
// PREDICTION PQ1 (blind): the equivalence FAILS, the pooled partial rho is within +-0.10 of 0, because the reader's fragility is flat in n (measured) while the gravitational quantities are
//     driven by count and by the specificity of a body's company; a body that resists deletion is not the body that pulls hardest. PQ2: the slope of z(-phi) on z(m_g) is below 0.15.
// ═══ END OF PRE-REGISTRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { HERE, round, mean, median, quantile, spearman, partialSpearman, ols, ranks, mulberry32, shuffleInPlace, argv, headerSha256 } from "./lib.mjs";

const { opt } = argv();
const wave = Number(opt("--wave", 1));
const readerDir = path.join(HERE, "results", "reader"), gravDir = path.join(HERE, "results", "gravity"), curvDir = path.join(HERE, "results", "curvature");
const zOf = (xs) => { const r = ranks(xs), m = mean(r), s = Math.sqrt(r.reduce((a, v) => a + (v - m) ** 2, 0) / r.length) || 1; return r.map((v) => (v - m) / s); };
const boot = (n, stat, seed) => { const rnd = mulberry32(seed), v = []; for (let t = 0; t < 300; t++) { const idx = Array.from({ length: n }, () => Math.floor(rnd() * n)); const x = stat(idx); if (Number.isFinite(x)) v.push(x); } return { lo: round(quantile(v, 0.025)), hi: round(quantile(v, 0.975)) }; };

const out = { wave, headerSha256: headerSha256(new URL(import.meta.url).pathname), perCorpus: {}, pooled: {} };
const pool = { phi: [], g1: [], g2: [], logn: [], quartile: [], corpus: [] };
const relPairs = [];
const files = fs.readdirSync(readerDir).filter((f) => f.endsWith(`.w${wave}.jsonl`) && !/^irc/.test(f));
for (const f of files) {
  const name = f.replace(`.w${wave}.jsonl`, ""); // e.g. ud-eng-A
  const gf = path.join(gravDir, `${name}.H1.json`), cf = path.join(curvDir, `${name}.H1.json`);
  if (!fs.existsSync(gf)) { out.perCorpus[name] = { gap: "no_gravity_H1" }; continue; }
  const grav = JSON.parse(fs.readFileSync(gf, "utf8")), curv = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, "utf8")) : null;
  const E = new Map((grav.energies ?? []).map((e) => [e.w, e])), Cc = new Map((curv?.per ?? []).map((p) => [p.w, p]));
  const samples = new Map();
  for (const l of fs.readFileSync(path.join(readerDir, f), "utf8").split("\n").filter(Boolean)) { const rec = JSON.parse(l); for (const s of rec.singles) if (s.n >= 3 && E.has(s.form)) (samples.get(s.form) ?? samples.set(s.form, []).get(s.form)).push(s.S); }
  const bodies = [...samples].filter(([, v]) => v.length >= 3).map(([w, v]) => ({ w, phi: mean(v), n: E.get(w).n, g1: E.get(w).E, g2: Cc.get(w)?.Cdel ?? null, samples: v }));
  if (bodies.length < 20) { out.perCorpus[name] = { gap: "too_few_bodies", bodies: bodies.length }; continue; }
  const lgn = bodies.map((b) => Math.log(b.n)), qs = quantile(bodies.map((b) => b.n), 0.25), qm = quantile(bodies.map((b) => b.n), 0.5), q3 = quantile(bodies.map((b) => b.n), 0.75);
  const quart = bodies.map((b) => (b.n <= qs ? 0 : b.n <= qm ? 1 : b.n <= q3 ? 2 : 3));
  const rel = bodies.filter((b) => b.samples.length >= 4);
  for (const b of rel) relPairs.push([mean(b.samples.filter((_, i) => i % 2 === 0)), mean(b.samples.filter((_, i) => i % 2 === 1))]);
  const stat = (g) => { const ok = bodies.map((b, i) => i).filter((i) => Number.isFinite(g(bodies[i]))); return ok.length >= 20 ? { rho: round(partialSpearman(ok.map((i) => -bodies[i].phi), ok.map((i) => g(bodies[i])), [ok.map((i) => lgn[i])])), raw: round(spearman(ok.map((i) => -bodies[i].phi), ok.map((i) => g(bodies[i])))), n: ok.length } : { gap: "too_few" }; };
  out.perCorpus[name] = { bodies: bodies.length, medianSamples: median(bodies.map((b) => b.samples.length)), phiVsLogN: round(spearman(bodies.map((b) => b.phi), lgn)), m_g1_energy: stat((b) => b.g1), m_g2_curvature: stat((b) => b.g2), g1VsLogN: round(spearman(bodies.map((b) => b.g1), lgn)) };
  const zPhi = zOf(bodies.map((b) => -b.phi)), zG1 = zOf(bodies.map((b) => b.g1)), zG2 = bodies.every((b) => b.g2 !== null) ? zOf(bodies.map((b) => b.g2)) : bodies.map(() => NaN);
  bodies.forEach((b, i) => { pool.phi.push(zPhi[i]); pool.g1.push(zG1[i]); pool.g2.push(zG2[i]); pool.logn.push(lgn[i] - mean(lgn)); pool.quartile.push(quart[i]); pool.corpus.push(name); });
}
out.reliability = { pairs: relPairs.length, spearman: relPairs.length >= 20 ? round(spearman(relPairs.map((p) => p[0]), relPairs.map((p) => p[1]))) : null }; out.reliability.pass = out.reliability.spearman !== null && out.reliability.spearman >= 0.2;
const rnd = mulberry32(99);
for (const [key, gk] of [["m_g1_energy", "g1"], ["m_g2_curvature", "g2"]]) {
  const idx = pool.phi.map((_, i) => i).filter((i) => Number.isFinite(pool[gk][i]));
  if (idx.length < 40) { out.pooled[key] = { gap: "too_few", n: idx.length }; continue; }
  const x = idx.map((i) => pool.phi[i]), y = idx.map((i) => pool[gk][i]), z = idx.map((i) => pool.logn[i]);
  const rho = partialSpearman(x, y, [z]), o = ols(y, x), ci = boot(idx.length, (s) => partialSpearman(s.map((i) => x[i]), s.map((i) => y[i]), [s.map((i) => z[i])]), 5);
  const nulls = []; const qd = idx.map((i) => pool.quartile[i]);
  for (let t = 0; t < 2000; t++) { const yp = y.slice(); for (const qq of [0, 1, 2, 3]) { const ii = qd.map((v, i) => (v === qq ? i : -1)).filter((i) => i >= 0); const vals = shuffleInPlace(ii.map((i) => y[i]), rnd); ii.forEach((i, k) => { yp[i] = vals[k]; }); } nulls.push(partialSpearman(x, yp, [z])); }
  const perC = Object.values(out.perCorpus).map((c) => c[key]?.rho).filter((v) => v !== undefined && v !== null);
  out.pooled[key] = { n: idx.length, partialRho: round(rho), ci, rawRho: round(spearman(x, y)), slopeZ: round(o?.b), spread: round(Math.sqrt(Math.max(0, 1 - (o?.b ?? 0) ** 2))), derangedQ95: round(quantile(nulls, 0.95)), derangedMean: round(mean(nulls)), positiveInCorpora: perC.filter((v) => v > 0).length, corpora: perC.length };
  const s = out.pooled[key]; s.survives = s.partialRho >= 0.3 && s.ci.lo > 0.1 && s.partialRho - s.derangedQ95 >= 0.15 && s.positiveInCorpora >= 0.6 * s.corpora; s.falsified = s.ci.lo <= 0;
}
out.verdict = { underpowered: !out.reliability.pass, equivalenceSurvives: Object.values(out.pooled).some((s) => s.survives) && out.reliability.pass, falsified: Object.values(out.pooled).every((s) => s.falsified === true) && out.reliability.pass, PQ1_withinPm010: Object.values(out.pooled).every((s) => s.partialRho !== undefined && Math.abs(s.partialRho) <= 0.1), PQ2_slopeBelow015: Object.values(out.pooled).every((s) => s.slopeZ !== undefined && Math.abs(s.slopeZ) < 0.15) };
fs.writeFileSync(opt("--out", path.join(HERE, "results", `equivalence.w${wave}.json`)), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ reliability: out.reliability, pooled: out.pooled, verdict: out.verdict, perCorpus: out.perCorpus }, null, 1));
