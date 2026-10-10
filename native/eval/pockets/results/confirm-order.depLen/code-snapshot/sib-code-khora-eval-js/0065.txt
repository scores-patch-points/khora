// verify.mjs: independent recomputation of the confirmer's headline numbers from its collect.*.json (no probe refit) and an independent 5-draw re-run of its four "extra" treebanks.   NAME_COMPANY_PAIRBLOCK=1 node verify.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in the output JSON) ═══
// DISCLOSURE. Seen: the confirmer's reported metrics (rule text of the task) and per-language window tables; attacks A, A2, B, C, D results. NOT seen: any number of this file.
// PART 1 (arithmetic audit). From collect.new.json (PRIMARY = 28 new languages, window 1) recompute with the confirmer's definitions (eligible = not thin, POSITION in [0.45, 0.55], not cmn-hans): n, Spearman(FWC32, AUC), frozen-model skill vs the dev mean 0.62359
//   with the model 0.623591 + 0.038715 (FWC32 - 0.303335) / 0.10758, clause c (>= 250 pairs: in-scope share audible, out-of-scope share), clause d (in-scope mean minus out-of-scope mean), clause e (FWC32 >= 0.28 audible share), S2 in-scope mean, share above 0.5, in-minus-out.
//   DECISION: the audit PASSES iff each recomputed value is within 0.005 (rho 0.01) of the reported one (rho 0.671, skill 0.210, c 8/10 and 0/4, d 0.088, e 11/12 = 0.917, S2 0.611 / 94% / +0.040).
// PART 2 (extra treebanks, the only out-of-ud-eval units). en_pud, grc_proiel, la_perseus (test, train), sa_ufal re-run with 5 independent pair draws (my own seeds) with the LEFT probe and the word FWC32.
//   The confirmer reported en_pud 0.636 (FWC32 0.35), grc_proiel 0.5993 (0.326), la_perseus test 0.539 (0.189) and train 0.509, sa_ufal 0.503 (0.219, 78 pairs). DECISION: report the draw-mean and draw-sd; a "hit" requires draw-mean AUC >= 0.60 for in-scope (FWC32 >= 0.2378) and < 0.60 for out-of-scope;
//   the single-draw call is "unstable" if the draw-sd >= 0.02 or the draws straddle 0.60.
// BLIND PREDICTIONS. PART 1 passes: 0.9. PART 2: en_pud hit 0.85; grc_proiel hit 0.45 (straddles); la and sa not audible 0.8.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { rdj, CONF, FIX, round, mean, share, spearman, headerSha, readConllu, describe, pairsX, cvArm, A, rngFor, seedFor, inBand, permRho } from "./lib-attack.mjs";
const out = { headerSha256: headerSha(import.meta.url) }, T = 0.2378, DEVMEAN = 0.62359, MODEL = (f) => 0.623591 + (0.038715 * (f - 0.303335)) / 0.10758;
const rows = rdj(path.join(CONF, "results/collect.new.json")).rows.filter((r) => !r.error && !r.thin && inBand(r.position) && r.name !== "cmn-hans");
const f = rows.map((r) => r.fwc32), a = rows.map((r) => r.auc), rm = (x, y) => Math.sqrt(mean(x.map((v, i) => (v - y[i]) ** 2)));
const big = rows.filter((r) => r.pairs >= 250), ins = big.filter((r) => r.fwc32 >= T), outs = big.filter((r) => r.fwc32 < T), inA = rows.filter((r) => r.fwc32 >= T), outA = rows.filter((r) => r.fwc32 < T), z28 = rows.filter((r) => r.fwc32 >= 0.28);
out.part1 = { n: rows.length, rho: round(spearman(f, a), 3), permP: round(permRho(f, a, 5000).p, 4), skill: round(1 - rm(f.map(MODEL), a) / rm(a.map(() => DEVMEAN), a)), c_in: `${ins.filter((r) => r.auc >= 0.6).length}/${ins.length}`, c_out: `${outs.filter((r) => r.auc >= 0.6).length}/${outs.length}`, d: round(mean(inA.map((r) => r.auc)) - mean(outA.map((r) => r.auc))), nIn: inA.length, nOut: outA.length,
  e: `${z28.filter((r) => r.auc >= 0.6).length}/${z28.length}`, S2in: round(mean(inA.map((r) => r.S2))), S2share: round(share(inA, (r) => r.S2 > 0.5)), S2diff: round(mean(inA.map((r) => r.S2)) - mean(outA.map((r) => r.S2))) };
const near = (x, y, t) => Math.abs(x - y) <= t; const P = out.part1;
out.part1.audit = { rho: near(P.rho, 0.671, 0.01), skill: near(P.skill, 0.21, 0.005), d: near(P.d, 0.088, 0.005), S2in: near(P.S2in, 0.611, 0.005), S2diff: near(P.S2diff, 0.04, 0.005), c: P.c_in === "8/10" && P.c_out === "0/4", e: P.e === "11/12" };
out.part1.pass = Object.values(out.part1.audit).every(Boolean);
// part 2
const EX = [["en_pud", `${FIX}/ud-english-pud/en_pud-ud-test.conllu`], ["grc_proiel", `${FIX}/ud-greek-proiel/grc_proiel-ud-test.conllu`], ["la_perseus_test", `${FIX}/ud-latin-perseus/la_perseus-ud-test.conllu`], ["la_perseus_train", `${FIX}/ud-latin-perseus/la_perseus-ud-train.conllu`], ["sa_ufal", `${FIX}/ud-sanskrit-ufal/sa_ufal-ud-test.conllu`]];
const ref = Object.fromEntries(rdj(path.join(CONF, "results/collect.extra.json")).rows.map((r) => [r.name, r])); out.part2 = [];
for (const [name, file] of EX) {
  const { sents, upos } = readConllu(file), d = describe(sents), ds = [];
  for (let k = 0; k < 5; k++) { const pr = pairsX(sents, upos, {}, { P: rngFor(seedFor("attack-R1", name, "PV#" + k)), N: rngFor(seedFor("attack-R1", name, "NV#" + k)) }); ds.push({ pairs: pr.pairs, auc: pr.pairs >= 60 ? cvArm(pr.rows, A.LEFT) : null, pos: pr.pairs >= 60 ? cvArm(pr.rows, A.POSITION) : null }); }
  const live = ds.filter((x) => x.auc != null), m = mean(live.map((x) => x.auc)), sd = live.length > 1 ? Math.sqrt(live.reduce((t, x) => t + (x.auc - m) ** 2, 0) / (live.length - 1)) : null;
  out.part2.push({ name, fwc32: round(d.fwc32), inScope: d.fwc32 >= T, pairs: round(mean(ds.map((x) => x.pairs)), 1), confirmerAuc: ref[name]?.auc ?? null, drawMean: round(m), drawSd: round(sd), drawMin: live.length ? round(Math.min(...live.map((x) => x.auc))) : null, drawMax: live.length ? round(Math.max(...live.map((x) => x.auc))) : null, pos: round(mean(live.map((x) => x.pos))),
    hit: live.length ? (m >= 0.6) === (d.fwc32 >= T) : null, straddles: live.length ? live.some((x) => x.auc >= 0.6) && live.some((x) => x.auc < 0.6) : null });
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
