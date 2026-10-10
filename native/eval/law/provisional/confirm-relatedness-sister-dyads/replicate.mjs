// eval/law/provisional/confirm-relatedness-sister-dyads/replicate.mjs — WINDOW REPLICATION of the confirmation (second, DISJOINT window of the same fresh train files). Bounds the window noise of confirm.mjs's verdict.
//
//   NAME_COMPANY_PAIRBLOCK=1 node replicate.mjs        (builds window B in memory for every language that has one, FIRST-LEFT transfer, registered ladder verdict; writes results/replicate-B.json)
//
// ═══ PRE-REGISTRATION (written before the first run of this file; confirm.mjs verdict ALREADY SEEN) ══════════════════════════════════════════════════════
// DISCLOSURE. Seen before this header: the full verdict of confirm.mjs on window A (header sha256 cfdb91c6274255b176778ef08af8c677a19d68f2360897c720e4250468f6d66f): FIRST-LEFT PARTIAL, IWR 29/30, NGm 6/6, CWGm 2/6
//   (deu has 0 passing dyads; nld<->afr pass), Hind 1/2 (hin>urd AUC 0.608, contrast 0.0499), pooled out-of-scope 1/28; position 0.5004, sham 0.5009, shuffled 0.531; post-hoc: shuffled contrast +0.013 vs real +0.068.
//   This file therefore tests the REGISTERED LADDER verdict a second time, with the same code (verdict.mjs, same seeds family), on text that does not overlap window A. It is a replication of the window
//   sampling, NOT of the treebank (same train files; for glg, afr, cym, fao and other files shorter than two windows there is no disjoint window B, they drop out).
// DATA. Window B of language s: the deduplicated sentence list of confirm.mjs's freshDoc (dedup against the scoper's dev/test text and within file); B = 40000 units of consecutive sentences with seeded start
//   (seedFor("conf-rel-sister", s, "windowB")) drawn from the larger of the two regions outside window A (data/meta.json windowStart/windowEnd); languages without 40000 spare units have no window B.
//   Same pairing (pairsOf FIRST, PAIRBLOCK), same donor (>= 100 FIRST pairs) / target (>= 60) eligibility, same probe (LEFT, 100 pairs, 6 draws), same dyad pass definition, same ctrl_t from the eligible
//   non-genus roster donors that HAVE a window B, same shuffled-target control (within-sentence shuffle of window B), same position and sham probes.
// TESTS. The ladder verdict of verdict.mjs (T1-T7, rungs IWR+NGm+CWGm+Hind > +CWGm > IWR+NGm > IWR) on window-B dyads. Report-only: per cluster pass counts, the A-vs-B agreement of every in-scope dyad that exists in
//   both (pass/fail agreement fraction and the correlation of AUC), out-of-scope pooled pass fraction.
// BLIND PREDICTIONS. R1 IWR (5 languages without glg; 20 dyads) pass fraction >= 0.80. R2 NGm >= 5/6. R3 deu<->nld pass 0/2 or 1/2 (not 2/2). R4 Hind passes >= 1/2. R5 out-of-scope pooled pass <= 0.10 of dyads.
//   R6 position and sham means in [0.47, 0.53]; shuffled mean <= 0.545. R7 ladder verdict = PARTIAL with narrowed scope IWR+NGm (or IWR). R8 dyad-level pass/fail agreement with window A >= 0.85, AUC correlation >= 0.6.
// Thresholds may be tightened, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, TB, EXT, DATA_UD, WINDOW_UNITS, trainFileOf, evalTextSet, readConllu, pairsOf, ARMS, rngFor, seedFor, shuffleIn, round, mean, fitProbe, pairSample, aucOn, sha256 } from "./fresh.mjs";
import { pairFlipQ95, headerHash } from "../family-vs-relatedness/lib.mjs";
import { sub } from "../family-vs-relatedness/subbranch.mjs";
import { IN_SCOPE, verdictOf, dyadsOf } from "./verdict.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results"), rs = (...p) => rngFor(seedFor("conf-rel-sister", "B", ...p)), OPEN = new Set(["NOUN", "VERB", "ADJ"]);
const metaA = JSON.parse(fs.readFileSync(path.join(HERE, "data", "meta.json"), "utf8")), cl = (s) => sub(s) ?? EXT[s]?.[2] ?? null, CAP_TRAIN = 100, MIN_DONOR = 100, MIN_TARGET = 60, DRAWS = 6;
const ALL = { ...TB, ...Object.fromEntries(Object.entries(EXT).map(([k, v]) => [k, v[0]])) };
/** window B rows (real and shuffled) of one language, or null. */
function windowB(stem) {
  const { sents: S0, upos: U0 } = readConllu(trainFileOf(ALL[stem])), ev = evalTextSet(stem), seen = new Set(), sents = [], upos = [];
  S0.forEach((s, k) => { const t = s.join(" "); if (ev.has(t) || seen.has(t)) return; seen.add(t); sents.push(s); upos.push(U0[k]); });
  const pre = [0]; sents.forEach((s) => pre.push(pre[pre.length - 1] + s.length)); const total = pre[pre.length - 1], a = metaA[stem].windowStart, b = metaA[stem].windowEnd;
  const before = pre[a], after = total - pre[b]; if (Math.max(before, after) < WINDOW_UNITS) return null;
  const rnd = rs(stem, "windowB"), useAfter = after >= before, lo = useAfter ? b : 0, hiUnits = useAfter ? total : pre[a], room = hiUnits - pre[lo] - WINDOW_UNITS;
  let s0 = lo; { const target = pre[lo] + Math.floor(rnd() * Math.max(1, room)); while (s0 < sents.length && pre[s0 + 1] <= target) s0++; } let e0 = s0; while (e0 < sents.length && pre[e0] - pre[s0] < WINDOW_UNITS && (useAfter || e0 < a)) e0++;
  const build = (shuffled) => {
    let ws = sents.slice(s0, e0), wu = upos.slice(s0, e0);
    if (shuffled) { const r2 = rs(stem, "shuffleB"), idx = ws.map((s) => shuffleIn(s.map((_, i) => i), r2)); ws = ws.map((s, k) => idx[k].map((j) => s[j])); wu = wu.map((u, k) => idx[k].map((j) => u[j])); }
    const n = ws.length, doc = { name: stem, stream: ws, cls: (s, i) => (wu[s][i] === "PROPN" ? "P" : OPEN.has(wu[s][i]) ? "N" : null), block: (s) => Math.min(3, Math.floor((s / n) * 4)) };
    const pr = pairsOf(doc, "FIRST", rs(stem, "pairsB")), X = {}; for (const arm of ["BOTH", "LEFT", "POSITION"]) X[arm] = pr.rows.map((r) => ARMS[arm](r.f));
    return { pairs: pr.pairs, y: pr.rows.map((r) => r.y), X };
  };
  return { real: build(false), shuf: build(true), units: pre[e0] - pre[s0], sentences: e0 - s0, range: [s0, e0] };
}
const langs = {}, shuf = {}, winMeta = {};
for (const s of Object.keys(ALL)) { const w = windowB(s); if (!w) { console.error(`${s}: no window B`); continue; } langs[s] = w.real; shuf[s] = w.shuf; winMeta[s] = { units: w.units, sentences: w.sentences, range: w.range, pairs: w.real.pairs }; console.error(`${s}: B ${w.units} units, FIRST ${w.real.pairs} pairs`); }
const D = Object.keys(TB).filter((s) => langs[s]?.pairs >= MIN_DONOR), T = Object.keys(langs).filter((s) => langs[s].pairs >= MIN_TARGET), A = {}, P = {}, S = {}, SH = {}, FL = {};
for (const d of D) {
  A[d] = {}; P[d] = {}; S[d] = {}; SH[d] = {}; FL[d] = {}; const acc = {}, accP = {}, accS = {}, accH = {};
  for (let r = 0; r < DRAWS; r++) {
    const rnd = rs("tr", d, r), idx = pairSample(langs[d], Math.min(CAP_TRAIN, langs[d].pairs), rnd), pt = { L: langs[d], idx }, y2 = langs[d].y.slice();
    for (let k = 0; k < idx.length; k += 2) if (rnd() < 0.5) { y2[idx[k]] = 1 - y2[idx[k]]; y2[idx[k + 1]] = 1 - y2[idx[k + 1]]; }
    const f = fitProbe([pt], "LEFT"), fp = fitProbe([pt], "POSITION"), fsh = fitProbe([{ L: { ...langs[d], y: y2 }, idx }], "LEFT");
    for (const t of T) {
      if (t === d) continue; (acc[t] ??= []).push(aucOn(f, langs[t], "LEFT")); (accP[t] ??= []).push(aucOn(fp, langs[t], "POSITION")); (accS[t] ??= []).push(aucOn(fsh, langs[t], "LEFT")); (accH[t] ??= []).push(aucOn(f, shuf[t], "LEFT"));
      if (r === 0 && f && cl(d) && cl(d) === cl(t)) FL[d][t] = round(pairFlipQ95(f(langs[t].X.LEFT), langs[t].y, rs("flip", d, t), 200));
    }
  }
  const mn = (a) => (a && a.filter((x) => x != null).length ? round(mean(a.filter((x) => x != null))) : null);
  for (const t of Object.keys(acc)) { A[d][t] = mn(acc[t]); P[d][t] = mn(accP[t]); S[d][t] = mn(accS[t]); SH[d][t] = mn(accH[t]); }
}
const XB = { A, P, S, SH, FL, pairs: Object.fromEntries(T.map((t) => [t, langs[t].pairs])) }, vB = verdictOf(XB, "B");
const XA = JSON.parse(fs.readFileSync(path.join(RES, "transfer-FIRST-LEFT.json"), "utf8")), inS = (d, t) => IN_SCOPE.includes(cl(d)) && cl(d) === cl(t) && !EXT[d] && !EXT[t];
const dA = Object.fromEntries(dyadsOf(XA, inS).map((x) => [`${x.d}>${x.t}`, x])), dB = dyadsOf(XB, inS), both = dB.filter((x) => dA[`${x.d}>${x.t}`]);
const agree = both.filter((x) => dA[`${x.d}>${x.t}`].pass === x.pass).length, xs = both.map((x) => dA[`${x.d}>${x.t}`].auc), ys = both.map((x) => x.auc), mx = mean(xs), my = mean(ys);
const corr = both.length > 2 ? round(xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0))) : null;
const clusters = [...new Set(Object.keys(TB).map(cl).filter(Boolean))].filter((c) => !IN_SCOPE.includes(c)), oos = dyadsOf(XB, (d, t) => clusters.includes(cl(d)) && cl(d) === cl(t) && !EXT[d] && !EXT[t]);
const out = { headerSha256: headerHash(SELF), verdictSha256: sha256(fs.readFileSync(path.join(HERE, "verdict.mjs"), "utf8")), windowB: winMeta, donors: D.length, targets: T.length, verdict: vB, dyadsB: dB, agreement: { n: both.length, passFailAgree: agree, aucCorrelation: corr },
  outOfScopeB: { n: oos.length, nPass: oos.filter((x) => x.pass).length, dyads: oos.filter((x) => x.pass).map((x) => `${x.d}>${x.t}:${x.auc}`) } };
fs.writeFileSync(path.join(RES, "replicate-B.json"), JSON.stringify(out, null, 1));
const f0 = vB.rungs[0];
console.log(JSON.stringify({ verdict: vB.verdict, narrowed: vB.narrowedScope, n: f0.n, nPass: f0.nPass, meanAuc: f0.meanAuc, ctrl: f0.meanCtrl, diff: f0.diffBoot, pos: f0.position, sham: f0.sham, shuf: f0.shuffled, perCluster: f0.perCluster, tests: f0.tests, rungs: vB.rungs.map((r) => [r.clusters.join("+"), r.n, r.nPass, r.holds]), agreement: out.agreement, oos: out.outOfScopeB }, null, 1));
