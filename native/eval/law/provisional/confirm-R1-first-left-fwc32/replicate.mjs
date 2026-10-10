// replicate.mjs: ROUND 2. Second, disjoint TRAIN window per language (windows2/), same pipeline as confirm.mjs, to (i) replicate the round-1 gradient, (ii) test the stability of language-level differences and of the
// in-scope exceptions, (iii) test two things that round 1 only SUGGESTED post hoc (the zero-shot S2 is above 0.5 almost everywhere, and its adjacency-specific part survives where the probe is deaf).
//   modes:  sanity | collect OUT.json | verdict W2.json OUT.json      (NAME_COMPANY_PAIRBLOCK=1; never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═══
// DISCLOSURE. Seen: every round-1 number (results/confirm.verdict.json, collect.*.json) for window 1 of the 53 stems: per-language FWC32, probe AUC, POSITION, shuffled AUC, pair-swap null, S1/S2/S3, shuffled S2; the post-hoc
//   tables (posthoc.json: decoys, zones, cuts, clades) and the observation that S2 is above 0.5 in 45 of 47 eligible languages including the zones where the probe is at chance. NOT seen: any window-2 AUC, score or control
//   (prep-windows2.mjs printed only tokens and FWC32; hun uig vie have no disjoint room and are skipped). Window 2 = a second contiguous train window with the same sentence count as window 1, disjoint from it.
// DATA / ELIGIBILITY / PIPELINE: exactly confirm.mjs (FIRST stratum, LEFT probe, matched pairs, PAIRBLOCK, 4 quartile blocks; eligible = >= 60 pairs and POSITION in [0.45, 0.55]; cmn-hans excluded from statistics).
//   Seeds: rngFor(seedFor("confirm-R1", stem, "pairs-w2" | "shuffle-w2" | "shuffle-pairs-w2")). No pair-swap null in round 2 (round 1 showed null means 0.498; this saves time).
// HYPOTHESES (each reported holds/fails; there is no combined verdict; they only qualify the scope statement). Pooled = all eligible languages of both sets with a window 2.
//   H1 gradient: Spearman(FWC32 of window 2, probe AUC) >= +0.40 with one-sided permutation p <= 0.05 (B = 5000).
//   H2 clean zone: share of languages with FWC32 >= 0.28 whose probe AUC >= 0.60 is >= 0.70 (needs n >= 8).
//   H3 deaf zone: share audible among FWC32 < 0.24 is <= 0.25 (needs n >= 5).
//   H4 reliability: Spearman(AUC window 1, AUC window 2) >= +0.50 over languages eligible in both windows (language-level differences are stable, not text noise).
//   H5 stable exceptions: the round-1 clean-zone misses are fixed now as lzh fas jpn ell (FWC32 >= 0.28, AUC < 0.60 in window 1); H5 holds if >= 3 of those with an eligible window 2 have window-2 AUC < 0.60 (needs >= 3 evaluable).
//   H6 zero-shot S2 is language-general (post-hoc origin, tested here): share of eligible languages with S2 paired AUC > 0.50 is >= 0.85 and the mean S2 is >= 0.55; among FWC32 < 0.24: mean S2 >= 0.54 and share > 0.50 >= 0.70;
//      adjacency-specific part: mean(S2 - shuffled S2) >= 0.03 among FWC32 < 0.24 and >= 0.06 among FWC32 >= 0.28.
//   H7 the probe's company-specific part: mean(AUC - shuffled AUC) >= 0.08 among FWC32 >= 0.28 and <= 0.04 among FWC32 < 0.20 (needs n >= 5 there).
//   Also reported (no gate): the pooled average of the two windows per language (rho with FWC32 averaged, audible share), the S1/S3 scores, language list of replicated and flipped calls.
// BLIND-ISH PREDICTIONS: H1 holds (0.9), H2 holds (0.8), H3 holds (0.8), H4 rho about 0.6 (holds 0.8), H5 holds (0.55; jpn and ell are the likely ones), H6 holds (0.7; the weakest part is share > 0.50 in the deaf zone),
//   H7 holds (0.75).
// NOT TESTED: new languages (round 2 re-uses the same 50 languages); RIGHT/BOTH arms; LATER stratum; IRC (all eligible days were consumed by the chat-scope lens' discovery/confirm split).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { HERE, round, mean, share, headerSha, describe, docFrom, shuffleDoc, pairsOf, rngFor, seedFor, cvAuc, SCORES, pairedAuc, spearman, permRho } from "./lib.mjs";
const inBand = (x) => x >= 0.45 && x <= 0.55, rd = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(HERE, f), "utf8"));
function rowOf(name, sents, upos, tag, meta = {}) {
  const t = tag ? "-" + tag : "", d = describe(sents), doc = docFrom(name, sents, upos), pr = pairsOf(doc, "FIRST", rngFor(seedFor("confirm-R1", name, "pairs" + t)));
  const row = { name, ...meta, fwc32: round(d.fwc32), tokens: d.tokens, pairs: pr.pairs, thin: pr.pairs < 60 }; if (row.thin) return row;
  row.auc = round(cvAuc(pr.rows, "LEFT")); row.position = round(cvAuc(pr.rows, "POSITION")); for (const [k, fn] of Object.entries(SCORES)) row[k] = round(pairedAuc(pr.rows, fn));
  const sd = shuffleDoc(name, sents, upos, rngFor(seedFor("confirm-R1", name, "shuffle" + t))), ps = pairsOf(sd, "FIRST", rngFor(seedFor("confirm-R1", name, "shuffle-pairs" + t)));
  row.shuf = { pairs: ps.pairs, thin: ps.pairs < 60 }; if (!row.shuf.thin) { row.shuf.auc = round(cvAuc(ps.rows, "LEFT")); row.shuf.position = round(cvAuc(ps.rows, "POSITION")); row.shuf.S2 = round(pairedAuc(ps.rows, SCORES.S2)); }
  return row;
}
const [mode, a1, a2] = process.argv.slice(2);
if (mode === "sanity") { // pipeline equality with round 1 on window 1 (same seeds, same code path)
  const R1 = [...rd("results/collect.new.json").rows, ...rd("results/collect.old.json").rows], res = [];
  for (const s of ["afr", "glg", "dan"]) { const w = rd(`windows/${s}.json`), r = rowOf(s, w.sents, w.upos, ""), ref = R1.find((x) => x.name === s); res.push({ s, mine: r.auc, ref: ref.auc, S2: r.S2, refS2: ref.S2, shuf: r.shuf.auc, refShuf: ref.shuf.auc, ok: r.auc === ref.auc && r.S2 === ref.S2 && r.shuf.auc === ref.shuf.auc }); }
  console.log(JSON.stringify(res)); process.exit(res.every((x) => x.ok) ? 0 : 3);
}
if (mode === "collect") {
  const R = { headerSha256: headerSha(import.meta.url), rows: [] };
  for (const f of fs.readdirSync(path.join(HERE, "windows2")).filter((x) => x.endsWith(".json")).sort()) { const w = rd(`windows2/${f}`); try { const r = rowOf(w.stem, w.sents, w.upos, "w2", { side: w.side, offset: w.offset }); R.rows.push(r); console.error(w.stem, "fwc", r.fwc32, "pairs", r.pairs, r.auc ?? "-", "pos", r.position ?? "-", "shuf", r.shuf?.auc ?? "-", "S2", r.S2 ?? "-"); } catch (e) { R.rows.push({ name: w.stem, error: String(e).slice(0, 200) }); console.error(w.stem, "ERROR", String(e).slice(0, 160)); } fs.writeFileSync(a1, JSON.stringify(R)); }
  console.log("collected", R.rows.length);
}
if (mode === "verdict") {
  const W2 = rd(a1).rows, R1 = [...rd("results/collect.new.json").rows, ...rd("results/collect.old.json").rows], ok = (r) => !r.error && !r.thin && r.name !== "cmn-hans" && inBand(r.position), e2 = W2.filter(ok), by1 = new Map(R1.map((r) => [r.name, r]));
  const sh = (r) => r.shuf && !r.shuf.thin && inBand(r.shuf.position), V = { headerSha256: headerSha(import.meta.url), nWindows: W2.length, eligible: e2.length, thin: W2.filter((r) => r.thin).map((r) => r.name), voided: W2.filter((r) => !r.error && !r.thin && r.name !== "cmn-hans" && !inBand(r.position)).map((r) => `${r.name}:${r.position}`) };
  const pm = permRho(e2.map((r) => r.fwc32), e2.map((r) => r.auc), 5000), z28 = e2.filter((r) => r.fwc32 >= 0.28), z24 = e2.filter((r) => r.fwc32 < 0.24), z20 = e2.filter((r) => r.fwc32 < 0.2);
  V.H1 = { rho: round(pm.rho, 3), p: round(pm.p, 4), holds: pm.rho >= 0.4 && pm.p <= 0.05 };
  V.H2 = { n: z28.length, shareAudible: round(share(z28, (r) => r.auc >= 0.6)), holds: z28.length >= 8 && share(z28, (r) => r.auc >= 0.6) >= 0.7 };
  V.H3 = { n: z24.length, shareAudible: round(share(z24, (r) => r.auc >= 0.6)), holds: z24.length >= 5 && share(z24, (r) => r.auc >= 0.6) <= 0.25 };
  const both = e2.filter((r) => by1.has(r.name) && ok(by1.get(r.name))), a1v = both.map((r) => by1.get(r.name).auc), a2v = both.map((r) => r.auc), rho12 = spearman(a1v, a2v);
  V.H4 = { n: both.length, spearman: round(rho12, 3), meanAbsDiff: round(mean(a1v.map((v, i) => Math.abs(v - a2v[i])))), holds: both.length >= 8 && rho12 >= 0.5 };
  const MISS = ["lzh", "fas", "jpn", "ell"], ev = e2.filter((r) => MISS.includes(r.name));
  V.H5 = { evaluable: ev.map((r) => `${r.name}:${r.auc}`), below60: ev.filter((r) => r.auc < 0.6).length, holds: ev.length >= 3 && ev.filter((r) => r.auc < 0.6).length >= 3 };
  const s2 = e2.map((r) => r.S2), gI = z24.filter(sh).map((r) => r.S2 - r.shuf.S2), gH = z28.filter(sh).map((r) => r.S2 - r.shuf.S2);
  V.H6 = { share50: round(share(s2, (x) => x > 0.5)), mean: round(mean(s2)), n24: z24.length, mean24: round(mean(z24.map((r) => r.S2))), share50_24: round(share(z24, (r) => r.S2 > 0.5)), gap24: round(mean(gI)), nGap24: gI.length, gap28: round(mean(gH)), nGap28: gH.length,
    holds: share(s2, (x) => x > 0.5) >= 0.85 && mean(s2) >= 0.55 && z24.length >= 5 && mean(z24.map((r) => r.S2)) >= 0.54 && share(z24, (r) => r.S2 > 0.5) >= 0.7 && mean(gI) >= 0.03 && mean(gH) >= 0.06 };
  const g28 = z28.filter(sh).map((r) => r.auc - r.shuf.auc), g20 = z20.filter(sh).map((r) => r.auc - r.shuf.auc);
  V.H7 = { gap28: round(mean(g28)), n28: g28.length, gap20: round(mean(g20)), n20: g20.length, holds: g20.length >= 5 && mean(g28) >= 0.08 && mean(g20) <= 0.04 };
  const avg = both.map((r) => ({ name: r.name, fwc: (r.fwc32 + by1.get(r.name).fwc32) / 2, auc: (r.auc + by1.get(r.name).auc) / 2, a1: by1.get(r.name).auc, a2: r.auc }));
  V.averaged = { n: avg.length, rho: round(spearman(avg.map((x) => x.fwc), avg.map((x) => x.auc)), 3), audible28: round(share(avg.filter((x) => x.fwc >= 0.28), (x) => x.auc >= 0.6)), n28: avg.filter((x) => x.fwc >= 0.28).length, audibleBelow24: round(share(avg.filter((x) => x.fwc < 0.24), (x) => x.auc >= 0.6)), nBelow24: avg.filter((x) => x.fwc < 0.24).length };
  V.flips = both.filter((r) => (r.auc >= 0.6) !== (by1.get(r.name).auc >= 0.6)).map((r) => `${r.name} fwc ${r.fwc32} w1 ${by1.get(r.name).auc} w2 ${r.auc}`);
  V.rows = e2.slice().sort((x, y) => x.fwc32 - y.fwc32).map((r) => ({ name: r.name, fwc32: r.fwc32, pairs: r.pairs, w1: by1.get(r.name)?.auc, w2: r.auc, pos: r.position, S2: r.S2, shufAuc: r.shuf?.auc, shufS2: r.shuf?.S2 }));
  fs.writeFileSync(a2, JSON.stringify(V, null, 1)); console.log(JSON.stringify({ ...V, rows: undefined }, null, 1));
}
