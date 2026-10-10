// attack-E3.mjs: ATTACK E3 (intervention on the stream's function-word density WITHIN a language) on rule R1-first-left-fwc32.   modes: collect OUT.json | summary IN.json OUT.json
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-E3.mjs collect results/E3.json     (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen: attack E (natural windows: within-language slope -0.605, CI [-1.14, -0.15], between slope +0.454; within-language FWC32 SD only 0.013) and attack E2. A TIMING PROBE of collect on one language (nob) was printed before the full run: LOW FWC32 0.266 / LEFT AUC 0.676, RAND 0.364 / 0.706, HIGH 0.467 / 0.677 (600 pairs each). NOT seen: any other number of this file.
// QUESTION. Natural windows of one treebank hardly differ in FWC32, so attack E could not test a stream-level mechanism with leverage. Here the stream's function-word density is CHANGED by sentence selection, holding language, treebank, annotation and
//   sentence-length distribution fixed: sentences are sorted by the share of their tokens that belong to the language's own 32 commonest forms (density d); LOW = lowest-density 40% and HIGH = highest-density 40% WITHIN each sentence-length bucket (lb of the matching key),
//   RAND = a random 40% (control). If FWC32 of the stream (not of the language) moderates the probe, HIGH (higher FWC32 by construction) should give a higher LEFT AUC than LOW, by about between-slope x delta-FWC32 (slope 0.454).
// DATA. Stems with >= 5000 TRAIN sentences (readConllu of tb/<stem>/train.conllu; the first min(N, 12000) sentences as the sample); each stream is a random subset of at most 3000 of its selected sentences, in original order. Per stream: FWC32 of the stream's own ranks,
//   V0b LEFT probe (5 pair draws, default matching key; POSITION control). Eligible language: all three streams have >= 60 pairs (>= 3 of 5 draws) and POSITION in [0.45, 0.55]. cmn-hans excluded.
// STATISTICS AND DECISIONS (fixed now). dF = FWC32(HIGH) - FWC32(LOW), dA = AUC(HIGH) - AUC(LOW). E3a: mean dF >= 0.05 (otherwise the intervention is too weak: INCONCLUSIVE). E3b: mean dA >= 0.02, share of languages with dA > 0 >= 0.65 (one-sided sign p <= 0.10).
//   E3c: ratio = mean dA / mean dF; the between-language slope is "reproduced by intervention" iff ratio >= 0.25 (more than half of 0.454). E3d: language-level Spearman(dF, dA) reported. Control: RAND - mean(HIGH, LOW) |AUC difference| <= 0.01 and FWC32(RAND) within 0.02 of the full-sample FWC32.
//   VERDICT: STREAM_LEVEL_CAUSAL_SUPPORT iff E3a, E3b and E3c hold; NO_SUPPORT iff E3a holds and mean dA < 0.01 or ratio < 0.10; else INCONCLUSIVE.
// BLIND PREDICTIONS. mean dF about 0.12; mean dA about 0.02 (P(E3b) = 0.40); P(ratio >= 0.25) = 0.35; P(NO_SUPPORT) = 0.40. Reason: selection by density also changes which tokens are neighbours, and window E showed no natural slope.
// NOT TESTED: other selection variables (sentence length, name density), IRC.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { listWin, rngFor, seedFor, pairsX, cvArm, A, headerSha, round, mean, share, spearman, mulberry, shuffleIn, inBand, readConllu, describe, lb, TB } from "./lib-attack.mjs";
const [mode, a1, a2] = process.argv.slice(2), trainFile = (stem) => path.join(TB, stem === "kor" ? "kor-gsd" : stem, "train.conllu"), R_DRAWS = 5;
const topSet = (sents, K = 32) => { const c = new Map(); for (const s of sents) for (const w of s) c.set(w, (c.get(w) ?? 0) + 1); return new Set([...c].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, K).map((x) => x[0])); };
function probe(stem, tag, sents, upos) { const ds = []; for (let j = 0; j < R_DRAWS; j++) { const pr = pairsX(sents, upos, {}, { P: rngFor(seedFor("attack-R1", stem, "PQ" + tag + "#" + j)), N: rngFor(seedFor("attack-R1", stem, "NQ" + tag + "#" + j)) }); ds.push(pr.pairs >= 60 ? { pairs: pr.pairs, auc: cvArm(pr.rows, A.LEFT), pos: cvArm(pr.rows, A.POSITION) } : { pairs: pr.pairs }); }
  const live = ds.filter((x) => x.auc != null); const d = describe(sents); return { fwc32: round(d.fwc32), sentences: sents.length, tokens: d.tokens, meanSentLen: round(d.meanSentLen), pairs: round(mean(ds.map((x) => x.pairs)), 1), thin: live.length < 3, auc: live.length >= 3 ? round(mean(live.map((x) => x.auc))) : null, pos: live.length >= 3 ? round(mean(live.map((x) => x.pos))) : null }; }
if (mode === "collect") {
  const R = { headerSha256: headerSha(import.meta.url), rows: [] };
  for (const stem of listWin("windows").filter((s) => s !== "cmn-hans" && (!process.env.ONLY || process.env.ONLY.split(",").includes(s)))) {
    const tp = trainFile(stem); if (!fs.existsSync(tp)) continue; const all = readConllu(tp); if (all.sents.length < 5000) continue;
    const N = Math.min(12000, all.sents.length), sents = all.sents.slice(0, N), upos = all.upos.slice(0, N), top = topSet(sents), rnd = mulberry(seedFor("attack-R1", stem, "E3sel") >>> 0);
    const groups = new Map(); sents.forEach((s, i) => { if (!s.length) return; const g = lb(s.length), d = s.reduce((t, w) => t + (top.has(w) ? 1 : 0), 0) / s.length + rnd() * 1e-6; (groups.get(g) ?? groups.set(g, []).get(g)).push({ i, d }); });
    const pick = { LOW: [], HIGH: [], RAND: [] };
    for (const g of groups.values()) { g.sort((x, y) => x.d - y.d); const m = Math.floor(0.4 * g.length); pick.LOW.push(...g.slice(0, m).map((x) => x.i)); pick.HIGH.push(...g.slice(g.length - m).map((x) => x.i)); pick.RAND.push(...shuffleIn(g.slice(), rnd).slice(0, m).map((x) => x.i)); }
    const row = { name: stem, nSample: N, fwcSample: round(describe(sents).fwc32) };
    for (const [nm, ids] of Object.entries(pick)) { const keep = shuffleIn(ids.slice(), rnd).slice(0, 3000).sort((x, y) => x - y); row[nm] = probe(stem, nm, keep.map((i) => sents[i]), keep.map((i) => upos[i])); }
    R.rows.push(row); fs.writeFileSync(a1, JSON.stringify(R)); console.error(stem, "sample fwc", row.fwcSample, ["LOW", "RAND", "HIGH"].map((k) => `${k}:${row[k].fwc32}/${row[k].auc ?? "-"}(${row[k].pairs})`).join(" "));
  }
  console.log("collected", R.rows.length);
}
if (mode === "summary") {
  const R = JSON.parse(fs.readFileSync(a1, "utf8")), out = { headerSha256: headerSha(import.meta.url) }, ok = (x) => x && !x.thin && inBand(x.pos), el = R.rows.filter((r) => ok(r.LOW) && ok(r.HIGH) && ok(r.RAND));
  out.nLangs = el.length; const dF = el.map((r) => r.HIGH.fwc32 - r.LOW.fwc32), dA = el.map((r) => r.HIGH.auc - r.LOW.auc), pos = dA.filter((x) => x > 0).length; let sp = 0; for (let j = pos; j <= el.length; j++) { let c = 1; for (let t = 0; t < j; t++) c = (c * (el.length - t)) / (t + 1); sp += c / 2 ** el.length; }
  out.E3a = { meanDF: round(mean(dF)), minDF: round(Math.min(...dF)), meanFwcLow: round(mean(el.map((r) => r.LOW.fwc32))), meanFwcHigh: round(mean(el.map((r) => r.HIGH.fwc32))), meanFwcRand: round(mean(el.map((r) => r.RAND.fwc32))), meanFwcSample: round(mean(el.map((r) => r.fwcSample))) };
  out.E3b = { meanDA: round(mean(dA)), nPositive: pos, share: round(pos / el.length, 3), signP: round(sp, 4), meanAucLow: round(mean(el.map((r) => r.LOW.auc))), meanAucHigh: round(mean(el.map((r) => r.HIGH.auc))), meanAucRand: round(mean(el.map((r) => r.RAND.auc))) };
  out.E3c = { ratio: round(mean(dA) / mean(dF), 3) }; out.E3d = { spearmanDFDA: round(spearman(dF, dA), 3) };
  out.control = { randMinusMeanHL: round(mean(el.map((r) => r.RAND.auc - (r.HIGH.auc + r.LOW.auc) / 2))), randFwcMinusSample: round(mean(el.map((r) => r.RAND.fwc32 - r.fwcSample))), meanSentLenLow: round(mean(el.map((r) => r.LOW.meanSentLen)), 2), meanSentLenHigh: round(mean(el.map((r) => r.HIGH.meanSentLen)), 2) };
  out.perLanguage = el.map((r) => ({ name: r.name, fwcLow: r.LOW.fwc32, fwcHigh: r.HIGH.fwc32, aucLow: r.LOW.auc, aucHigh: r.HIGH.auc, aucRand: r.RAND.auc, pairsLow: r.LOW.pairs, pairsHigh: r.HIGH.pairs }));
  const a = out.E3a.meanDF >= 0.05, b = out.E3b.meanDA >= 0.02 && out.E3b.share >= 0.65 && out.E3b.signP <= 0.1, c = out.E3c.ratio >= 0.25;
  out.verdict = a && b && c ? "STREAM_LEVEL_CAUSAL_SUPPORT" : a && (out.E3b.meanDA < 0.01 || out.E3c.ratio < 0.1) ? "NO_SUPPORT" : "INCONCLUSIVE";
  fs.writeFileSync(a2, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
