// attack-E.mjs: ATTACK E (is FWC32 a property of the STREAM, as the rule says, or only of the language/treebank?) on rule R1-first-left-fwc32.   modes: collect OUT.json | summary IN.json OUT.json
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-E.mjs collect results/E.json     (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen when written: attacks A, B, C results (see their headers; A: strict matching, NOUN-only, hash tie, i >= 4 all survive, name-chain removal narrows; C: same-row sentence-composition control 0.505, S2 0.607, L1-only 0.624, FINE 0.546;
//   B: gradient robust over the multiverse, within-clade rho 0.42, moderators are a bundle); attack D collect jobs running (no D result read); attack A2 jobs launched after a timing probe on heb/fra (heb surface-stream FWC32 0.145 and AUC 0.528 vs word-stream 0.398 and 0.705).
//   The confirmer's observation that lzh FWC32 was 0.34 in window 1 and 0.23 in window 2 with the audibility flipping the wrong way (so the scope looks like a property of the stream); the confirmer's windows (w1 w2) are 1 or 2 windows per language.
// QUESTION. The rule's scope variable is FWC32 of THE STREAM. Almost all of its support is BETWEEN languages (47 languages, one or three streams each). If FWC32 is the moderator at the stream level, then WITHIN a language, windows of the same treebank
//   with higher FWC32 should give higher probe AUC. If the within-language relationship is absent while the between-language one is strong, FWC32 is a language/treebank-level proxy (analyticity, tokenisation, annotation convention), not a stream-level moderator, and a per-stream rule is not supported.
// DESIGN. For every stem with >= 4 windows: cut contiguous, non-overlapping windows of W = 1200 sentences from the START of the treebank's TRAIN file (up to 12 windows; the last incomplete window is dropped); per window: FWC32 of the window's own stream, V0b LEFT probe (5 pair draws, default matching key, as attack A),
//   POSITION. Eligible window: >= 60 pairs (>= 3 of 5 draws) and POSITION in [0.45, 0.55]. A language enters the within-language analysis with >= 4 eligible windows. cmn-hans excluded. Sentences are the UPOS-PUNCT-dropped lowercase word units of lib readConllu (same as the confirmer).
// STATISTICS AND DECISIONS (fixed now). E1: pooled WITHIN-language Spearman (ranks of FWC32 and AUC centred within language) with one-sided permutation p (FWC32 permuted within language, B = 5000). E2: per-language Spearman; share positive; one-sided sign test.
//   E3: partial within-language Spearman controlling log2 tokens of the window and mean sentence length (rank residuals centred within language). E4: between-language Spearman of language means (FWC32 mean vs AUC mean) for the same languages, and the slope ratio:
//   within-language OLS slope of AUC on FWC32 (pooled, language-centred) divided by the between-language slope. DECISION: STREAM-LEVEL SUPPORT iff E1 rho >= 0.25 with p <= 0.05 and E2 share positive >= 0.60; E3 partial >= 0.15.
//   NO STREAM-LEVEL SUPPORT iff E1 rho < 0.15 or p > 0.10 -> the rule's per-stream wording is narrowed to "language/treebank-level descriptor". Between those: inconclusive.
// BLIND PREDICTIONS. E1 rho about 0.15 (P(support) 0.30; P(no support) 0.45); E2 share positive about 0.65; slope ratio about 0.4. Reason: within a treebank FWC32 varies by 0.02-0.05 between windows (genre mix), small against probe noise of 0.02-0.04 per window.
// NOT TESTED: windows of other sizes, IRC, other arms.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { listWin, rngFor, seedFor, pairsX, cvArm, A, headerSha, round, mean, share, spearman, ranks, pearson, mulberry, shuffleIn, inBand, readConllu, describe, TB, UD } from "./lib-attack.mjs";
const W = 1200, MAXW = 12, R_DRAWS = 5, [mode, a1, a2] = process.argv.slice(2);
const trainFile = (stem) => path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu");
if (mode === "collect") {
  const R = { headerSha256: headerSha(import.meta.url), W, rows: [] };
  for (const stem of listWin("windows").filter((s) => s !== "cmn-hans" && (!process.env.ONLY || process.env.ONLY.split(",").includes(s)))) {
    const tp = trainFile(stem); if (!fs.existsSync(tp)) continue; const { sents, upos } = readConllu(tp), nW = Math.min(MAXW, Math.floor(sents.length / W)); if (nW < 4) { console.error(stem, "windows", nW, "skip"); continue; }
    for (let k = 0; k < nW; k++) {
      const s = sents.slice(k * W, (k + 1) * W), u = upos.slice(k * W, (k + 1) * W), d = describe(s), row = { name: stem, k, fwc32: round(d.fwc32), tokens: d.tokens, meanSentLen: round(d.meanSentLen), ttr: round(d.ttr) };
      try { const ds = []; for (let j = 0; j < R_DRAWS; j++) { const pr = pairsX(s, u, {}, { P: rngFor(seedFor("attack-R1", stem, "PE" + k + "#" + j)), N: rngFor(seedFor("attack-R1", stem, "NE" + k + "#" + j)) }); if (pr.pairs < 60) { ds.push({ pairs: pr.pairs }); continue; } ds.push({ pairs: pr.pairs, auc: cvArm(pr.rows, A.LEFT), pos: cvArm(pr.rows, A.POSITION) }); }
        const live = ds.filter((x) => x.auc != null); row.pairs = round(mean(ds.map((x) => x.pairs)), 1); row.thin = live.length < 3; if (!row.thin) { row.auc = round(mean(live.map((x) => x.auc))); row.pos = round(mean(live.map((x) => x.pos))); } } catch (e) { row.error = String(e).slice(0, 120); }
      R.rows.push(row); console.error(stem, k, "fwc", row.fwc32, "pairs", row.pairs, "auc", row.auc ?? "-");
    }
    fs.writeFileSync(a1, JSON.stringify(R));
  }
  fs.writeFileSync(a1, JSON.stringify(R)); console.log("collected", R.rows.length);
}
if (mode === "summary") {
  const R = JSON.parse(fs.readFileSync(a1, "utf8")), out = { headerSha256: headerSha(import.meta.url), W: R.W }, rnd = mulberry(20261007);
  const el = R.rows.filter((r) => !r.error && !r.thin && inBand(r.pos)), by = new Map(); for (const r of el) (by.get(r.name) ?? by.set(r.name, []).get(r.name)).push(r);
  const langs = [...by.entries()].filter(([, v]) => v.length >= 4).map(([name, rows]) => ({ name, rows })); out.nLangs = langs.length; out.nWindows = langs.reduce((a, l) => a + l.rows.length, 0); out.langs = langs.map((l) => ({ name: l.name, n: l.rows.length, fwcRange: [round(Math.min(...l.rows.map((r) => r.fwc32))), round(Math.max(...l.rows.map((r) => r.fwc32)))], aucRange: [round(Math.min(...l.rows.map((r) => r.auc))), round(Math.max(...l.rows.map((r) => r.auc)))], rho: round(spearman(l.rows.map((r) => r.fwc32), l.rows.map((r) => r.auc)), 3) }));
  const flat = langs.flatMap((l) => l.rows.map((r) => ({ ...r, lang: l.name })));
  const centRanks = (vals, labs) => { const r = ranks(vals), m = new Map(); labs.forEach((l, i) => (m.get(l) ?? m.set(l, []).get(l)).push(i)); const c = r.slice(); for (const idx of m.values()) { const mu = mean(idx.map((i) => r[i])); for (const i of idx) c[i] = r[i] - mu; } return c; };
  const within = (fl, fv = (r) => r.fwc32) => pearson(centRanks(fl.map(fv), fl.map((r) => r.lang)), centRanks(fl.map((r) => r.auc), fl.map((r) => r.lang)));
  const obs = within(flat); let ge = 0; const B = 5000, idxBy = new Map(); flat.forEach((r, i) => (idxBy.get(r.lang) ?? idxBy.set(r.lang, []).get(r.lang)).push(i));
  for (let b = 0; b < B; b++) { const f = flat.map((r) => r.fwc32); for (const idx of idxBy.values()) { const v = shuffleIn(idx.map((i) => f[i]), rnd); idx.forEach((i, k) => (f[i] = v[k])); } if (within(flat.map((r, i) => ({ ...r, fwc32: f[i] }))) >= obs - 1e-12) ge++; }
  out.E1 = { rho: round(obs, 3), p: round((ge + 1) / (B + 1), 4) };
  const per = out.langs.map((l) => l.rho), pos = per.filter((x) => x > 0).length; let sp = 0; for (let j = pos; j <= per.length; j++) { let c = 1; for (let t = 0; t < j; t++) c = (c * (per.length - t)) / (t + 1); sp += c / 2 ** per.length; }
  out.E2 = { nLangs: per.length, nPositive: pos, share: round(pos / per.length, 3), signP: round(sp, 4), medianRho: round(per.slice().sort((a, b) => a - b)[Math.floor(per.length / 2)], 3) };
  // E3 partial: residualise centred ranks of fwc and auc on centred ranks of log tokens and mean sentence length
  const res = (y, xs) => { // OLS residual of y on xs (no intercept; all centred)
    const n = y.length, k = xs.length; const G = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => xs[i].reduce((a, v, t) => a + v * xs[j][t], 0))), g = xs.map((x) => x.reduce((a, v, t) => a + v * y[t], 0));
    const b = new Array(k).fill(0); if (k === 2) { const det = G[0][0] * G[1][1] - G[0][1] * G[1][0] || 1e-12; b[0] = (g[0] * G[1][1] - g[1] * G[0][1]) / det; b[1] = (G[0][0] * g[1] - G[1][0] * g[0]) / det; } else if (k === 1) b[0] = g[0] / (G[0][0] || 1e-12);
    return y.map((v, t) => v - xs.reduce((a, x, i) => a + b[i] * x[t], 0)); };
  const labs = flat.map((r) => r.lang), cf = centRanks(flat.map((r) => r.fwc32), labs), ca = centRanks(flat.map((r) => r.auc), labs), c1 = centRanks(flat.map((r) => Math.log2(r.tokens)), labs), c2 = centRanks(flat.map((r) => r.meanSentLen), labs);
  out.E3 = { partialRho: round(pearson(res(cf, [c1, c2]), res(ca, [c1, c2])), 3), rhoWithLogTokens: round(pearson(c1, ca), 3), rhoWithSentLen: round(pearson(c2, ca), 3), rhoFwcAndSentLen: round(pearson(cf, c2), 3) };
  const means = langs.map((l) => ({ f: mean(l.rows.map((r) => r.fwc32)), a: mean(l.rows.map((r) => r.auc)) })), mf = mean(means.map((x) => x.f)), ma = mean(means.map((x) => x.a)), bBetween = means.reduce((t, x) => t + (x.f - mf) * (x.a - ma), 0) / means.reduce((t, x) => t + (x.f - mf) ** 2, 0);
  let sxy = 0, sxx = 0; for (const l of langs) { const mfl = mean(l.rows.map((r) => r.fwc32)), mal = mean(l.rows.map((r) => r.auc)); for (const r of l.rows) { sxy += (r.fwc32 - mfl) * (r.auc - mal); sxx += (r.fwc32 - mfl) ** 2; } }
  out.E4 = { betweenRho: round(spearman(means.map((x) => x.f), means.map((x) => x.a)), 3), betweenSlope: round(bBetween, 3), withinSlope: round(sxy / sxx, 3), slopeRatio: round(sxy / sxx / bBetween, 3), withinFwcSD: round(Math.sqrt(sxx / flat.length), 4), betweenFwcSD: round(Math.sqrt(means.reduce((t, x) => t + (x.f - mf) ** 2, 0) / means.length), 4) };
  out.decision = out.E1.rho >= 0.25 && out.E1.p <= 0.05 && out.E2.share >= 0.6 && out.E3.partialRho >= 0.15 ? "STREAM_LEVEL_SUPPORT" : out.E1.rho < 0.15 || out.E1.p > 0.1 ? "NO_STREAM_LEVEL_SUPPORT" : "INCONCLUSIVE";
  fs.writeFileSync(a2, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
