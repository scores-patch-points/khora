// attack-PM-R1-unit-initial-excess/attack-C.mjs -- ATTACK C (COUNT RIVAL / SHUFFLED-COMPANY) on rule PM-R1 (unit-initial excess pInitX). New file; edits nothing.
//
//   node attack-C.mjs ud|irc|code [rung]   -> results/C-<name>-<rung>.jsonl + results/C-<name>-<rung>-pairs.json      node attack-C.mjs probe [rung] -> results/C-probe-<rung>.json      node attack-C.mjs summary [rung]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; thresholds below may be tightened, never loosened, after any result) ════════════════════════
// DISCLOSURE (what I have seen). (1) Everything listed in attack-A.mjs's header, and (2) attack A's RESULTS (results/A-summary.txt): pInitX survives exact matching on count (+-tol), exact unit index, exact unit
//   length and exact character length (UD FULL median 0.574-0.582 over K1..K3, IRC en fresh 0.905-0.916, py 0.67-0.70, js 0.60-0.64); the local-count + recency rung K4 cost the IRC effect about 0.1 (fresh 0.818 on 225
//   pairs; replicate-en 0.756), so recurrence BURSTINESS shares part of the signal; LONG6 and DIST25 variants hold; the books' default segmenter splits at "Mr." (Middlemarch name-initial share 0.234 -> 0.098 and AUC
//   0.675 -> 0.574 with a title prior; median over 7 novels only 0.028). I have NOT computed any rival feature below, nor the probe, nor the re-cut control, on any data.
// DATA. Same FRESH cells as attack A, rebuilt with the same seeds: UD train windows of 59 treebanks; IRC en fresh pooled 50 days; the 16 py + 16 js fresh files. SAME-ROWS rule: the pairs are built ONCE per cell
//   (attack-lib buildPairs, rung K0 = the confirmer's key; rung K3 as a second row set, argv[3]) and EVERY observable below is evaluated on exactly those pairs.
// OBSERVABLES (all computed from the stream alone; direction fixed NOW, higher = more name-like). pInitX = the rule. RIVALS: logn (log2 total count; CAUSAL4: log2 mentions so far), loc (other mentions within
//   +-25 units; CAUSAL4: prior-4 mentions within 25 units before), rec (-log2(1+units since previous mention)), burst (share of consecutive-mention gaps <= 5 units; CAUSAL4: the 4 gaps over prior-4 + current), span
//   (-(first-to-last mention distance)/stream length; CAUSAL4: -(distance from 4th-previous mention to current)/stream length), invLen (mean 1/unit length of the mentions), relPos (-mean of index/(len-1)),
//   meanIdx (-mean unit index), charLen (characters). FAMILY SIBLINGS of pInitX (same position statistic, reported but NOT counted as rivals): pInit (raw unit-initial share) and antiFinalX (-pFinalX).
// TESTS. C1 same-rows AUC of every observable (cluster bootstrap B=300 over positive forms) and the paired difference AUC(pInitX) - AUC(rival) with a cluster bootstrap CI (B=200). C2 PROBE (a fitted classifier,
//   existence test only): ridge-logistic (lambda 1, no intercept, symmetrised pair differences, columns scaled by sd) on all rivals vs rivals + pInitX, leave-block-out (UD: leave-one-treebank-out; IRC/code: 5
//   folds by positive-form hash), pair-win-rate AUC with cluster bootstrap CI; reported as probe ADDITION = AUC(rivals+pInitX) - AUC(rivals). C3 RE-CUT CONTROL (shuffled company, boundaries destroyed): the token
//   stream is kept in order (company intact), the unit boundaries are redrawn with a random permutation of the unit-length multiset, gold moves with tokens; pInitX AUC FULL at K0 must fall to ~0.5 (control VALID if
//   AUC in [0.45,0.55] over IRC, and median over valid UD cells in [0.47,0.53]).
// VERDICT RULES. A rival REPRODUCES the effect in a register if its same-rows AUC >= AUC(pInitX) - 0.03 (UD: median over valid cells of AUC(rival) >= median of AUC(pInitX) - 0.03, AND in >= 50% of valid cells
//   AUC(rival) >= AUC(pInitX) - 0.03). pInitX CARRIES INFORMATION BEYOND THE RIVALS if probe ADDITION >= 0.02 with CI lower > 0. The rule SURVIVES C if no rival reproduces it, the probe addition holds, and the
//   re-cut control is valid; it is NARROWED if a rival reproduces it in a named register only.
// BLIND PREDICTIONS (probability my prior gives). IRC: no rival reproduces (0.80; the strongest rival is loc/burst/rec at ~0.75-0.85, which is within 0.03 only if matching on recency also removes pInitX); probe addition >= 0.02: 0.85.
//   UD: no rival reproduces (0.55; the dispersion rivals span/burst are the danger: names cluster in documents); probe addition >= 0.02: 0.55. Python: no rival reproduces (0.60; invLen/relPos are the danger). JS: some rival reproduces: 0.6.
//   Raw pInit within 0.03 of pInitX in IRC: 0.95, in UD: 0.45. Re-cut control valid: 0.90.
// NOT TESTED. First mentions; fitted rule form; company arms of the name-company test; non-lexical rivals.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, ircFiles, udWindow, ircLoad, codeBase, prep, occsOf, buildPairs, evalPairs, localOf, SPECS, UD_DEFS, IRC_DEFS, CODE_DEFS, rngFor, seedFor, headerSha, round, mean, quantile, lowMed, trueMed, sign, validCell, pairAuc, shuffleIn, wr, log } from "./attack-lib.mjs";
import { fitLogit } from "../../name-war-and-peace.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), name = process.argv[2], RUNG = process.argv[3] ?? "K0", HDR = headerSha(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
const CONF = path.join(HERE, "..", "confirm-PM-R1-unit-initial-excess");
const RES = (f) => path.join(HERE, "results", f), OUT = RES(`C-${name}-${RUNG}.jsonl`);
const emit = (o) => fs.appendFileSync(OUT, JSON.stringify({ hdr: HDR, rung: RUNG, ...o }) + "\n");
export const RIV = ["logn", "loc", "rec", "burst", "span", "invLen", "relPos", "meanIdx", "charLen"], SIB = ["pInit", "antiFinalX"], ALLF = ["pInitX", ...RIV, ...SIB];
const B = 300, BD = 200;
// ── observables ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function feats(o, mode) {
  const P = o.P, oc = P.occ.get(o.w), n = oc.length / 2, k = o.k, js = mode === "FULL" ? Array.from({ length: n }, (_, j) => j) : [k - 4, k - 3, k - 2, k - 1], gj = mode === "FULL" ? js : [...js, k];
  const sU = (j) => oc[2 * j], iU = (j) => oc[2 * j + 1], lU = (j) => P.stream[sU(j)].length;
  let init = 0, fin = 0, inv = 0, rel = 0, idx = 0; for (const j of js) { const len = lU(j), b = iU(j); if (b === 0) init++; if (b === len - 1) fin++; inv += 1 / len; rel += len > 1 ? b / (len - 1) : 0; idx += b; }
  const m = js.length, L = localOf(P, o.w, 25); let loc; if (mode === "FULL") loc = L.loc[k]; else { loc = 0; for (const j of js) if (o.s - sU(j) <= 25) loc++; }
  let near = 0, g = 0; for (let t = 1; t < gj.length; t++) { g++; if (sU(gj[t]) - sU(gj[t - 1]) <= 5) near++; }
  const span = mode === "FULL" ? -(sU(n - 1) - sU(0)) / P.stream.length : -(o.s - sU(k - 4)) / P.stream.length;
  return { pInitX: (init - inv) / m, logn: Math.log2(mode === "FULL" ? n : k), loc, rec: -Math.log2(1 + L.dist[k]), burst: g ? near / g : 0, span, invLen: inv / m, relPos: -rel / m, meanIdx: -idx / m, charLen: [...o.w].length, pInit: init / m, antiFinalX: -((fin - inv) / m) };
}
function diffCI(wa, wb, cl, rnd) { // paired cluster bootstrap of mean(wa - wb)
  const cid = new Map(); cl.forEach((c, k) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += wa[k] - wb[k]; a[1]++; }); const cs = [...cid.values()], bs = [];
  for (let b = 0; b < BD; b++) { let s = 0, m = 0; for (let t = 0; t < cs.length; t++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); }
  return { d: round(mean(wa.map((x, k) => x - wb[k]))), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)) };
}
/** all observables on the SAME pairs */
function sameRows(pairs, mode, tag, cellName) {
  if (!pairs.length) return { pairs: 0 };
  const FP = pairs.map(([p]) => feats(p, mode)), FN = pairs.map(([, q]) => feats(q, mode)), cl = pairs.map(([p]) => `${cellName}|${p.w}`), rnd = rngFor(seedFor(PRE, "C", tag, mode));
  const out = { pairs: pairs.length, aucs: {}, diffs: {} }, wins = {};
  for (const f of ALLF) wins[f] = pairs.map((_, k) => wr(FP[k][f], FN[k][f]));
  for (const f of ALLF) out.aucs[f] = round(mean(wins[f]));
  const rx = pairAuc(FP.map((x) => x.pInitX), FN.map((x) => x.pInitX), cl, B, rnd, 0); out.lo = rx.lo; out.hi = rx.hi;
  for (const f of [...RIV, ...SIB]) out.diffs[f] = diffCI(wins.pInitX, wins[f], cl, rnd);
  out.posCtl = round(mean(pairs.map(([p, q]) => wr(p.i === 0 ? 0 : p.i === 1 ? 1 : p.i <= 3 ? 2 : 3, q.i === 0 ? 0 : q.i === 1 ? 1 : q.i <= 3 ? 2 : 3))));
  const pr = pairs.map(([p, q], k) => ({ cl: cl[k], d: ALLF.map((f) => FP[k][f] - FN[k][f]) }));
  return { ...out, pairData: pr };
}
const keep = {}; // pair-level data for the probe, by register
function cell(reg, b, def, modes, extra = {}) {
  for (const mode of modes) {
    const oc = occsOf(b.P, b.gold, def, mode, null, b.name), { pairs } = buildPairs(b.P, oc, SPECS[RUNG], rngFor(seedFor(PRE, "Cpairs", reg, RUNG, mode)), { maxPairs: 600 });
    const r = sameRows(pairs, mode, reg + RUNG, reg), { pairData, ...row } = r; emit({ reg, mode, ...extra, ...row }); if (pairData) (keep[`${mode}|${reg}`] = pairData);
  }
}
// ── re-cut control: keep token order (company intact), redraw unit boundaries ───────────────────────────────────────────────────────────
function recut(b, seed) {
  const rnd = rngFor(seed), toks = b.P.stream.flat(), gd = b.gold.flat(), lens = shuffleIn(b.P.stream.map((u) => u.length), rnd), st = [], g2 = []; let p = 0;
  for (const L of lens) { st.push(toks.slice(p, p + L)); g2.push(gd.slice(p, p + L)); p += L; }
  return { name: b.name + "-recut", P: prep(st), gold: g2 };
}
function recutCell(reg, b, def, modes = ["FULL"]) {
  const r = recut(b, seedFor(PRE, "recut", reg)), oc = occsOf(r.P, r.gold, def, "FULL", null, r.name), { pairs } = buildPairs(r.P, oc, SPECS.K0, rngFor(seedFor(PRE, "recutpairs", reg)), { maxPairs: 600 });
  emit({ reg, mode: "FULL", ctl: "recut", ...evalPairs(r.P, pairs, "FULL", reg + "recut", { B, Bperm: 0, name: r.name }) });
}
function ud() { for (const tb of Object.keys(MAN.ud.files)) { const b = udWindow(tb); cell(tb, b, UD_DEFS.PN, ["FULL", "CAUSAL4"]); recutCell(tb, b, UD_DEFS.PN); log(`ud ${tb}`); } }
function irc() { const b = ircLoad("irc-en-fresh", ircFiles(MAN.irc.freshEnAll.map((x) => x.id))); cell("irc-en-fresh", b, IRC_DEFS.NK, ["FULL", "CAUSAL4"]); recutCell("irc-en-fresh", b, IRC_DEFS.NK); log("irc"); }
function code() {
  for (const lg of ["py", "js"]) {
    const bases = Array.from({ length: 16 }, (_, i) => codeBase(`code-${lg}-${i}`, path.join(CONF, "data", "lex", `${lg}-${i}.json`))), per = Math.ceil(1000 / 16);
    for (const mode of ["FULL", "CAUSAL4"]) {
      const pairs = []; for (const b of bases) pairs.push(...buildPairs(b.P, occsOf(b.P, b.gold, CODE_DEFS.PE, mode, null, b.name), SPECS[RUNG], rngFor(seedFor(PRE, "Cpairs", "code", lg, b.name, RUNG, mode)), { maxPairs: per }).pairs);
      const r = sameRows(pairs, mode, `code-${lg}${RUNG}`, `code-${lg}`), { pairData, ...row } = r; emit({ reg: `code-${lg}`, mode, ...row }); keep[`${mode}|code-${lg}`] = pairData;
    }
    const rs = []; for (const b of bases) { const r = recut(b, seedFor(PRE, "recut", lg, b.name)), oc = occsOf(r.P, r.gold, CODE_DEFS.PE, "FULL", null, b.name); rs.push(...buildPairs(r.P, oc, SPECS.K0, rngFor(seedFor(PRE, "recutpairs", lg, b.name)), { maxPairs: per }).pairs); }
    emit({ reg: `code-${lg}`, mode: "FULL", ctl: "recut", ...evalPairs(null, rs, "FULL", `code${lg}recut`, { B, Bperm: 0, name: `code-${lg}` }) }); log(`code-${lg}`);
  }
}
if (name === "ud") ud(); else if (name === "irc") irc(); else if (name === "code") code();
if (["ud", "irc", "code"].includes(name)) fs.writeFileSync(RES(`C-${name}-${RUNG}-pairs.json`), JSON.stringify(keep));
// ── PROBE (fitted classifier, existence test): ridge-logistic on symmetrised pair differences, leave-block-out ──────────────────────────────
function bootWin(wins, cl, rnd) {
  const cid = new Map(); cl.forEach((c, k) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += wins[k]; a[1]++; }); const cs = [...cid.values()], bs = [];
  for (let b = 0; b < BD; b++) { let s = 0, m = 0; for (let t = 0; t < cs.length; t++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); }
  return { auc: round(mean(wins)), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)) };
}
const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function cvWins(rows, cols, blockOf) { // rows: {cl, d}, cols: indices into d; returns per-row win value from leave-block-out ridge-logistic
  const blocks = [...new Set(rows.map(blockOf))], wins = new Array(rows.length);
  for (const bl of blocks) {
    const tr = rows.filter((r) => blockOf(r) !== bl), te = rows.map((r, k) => [r, k]).filter(([r]) => blockOf(r) === bl);
    const sd = cols.map((c) => Math.sqrt(mean(tr.map((r) => r.d[c] ** 2))) || 1), X = [], y = [];
    for (const r of tr) { const x = cols.map((c, j) => r.d[c] / sd[j]); X.push(x, x.map((v) => -v)); y.push(1, 0); }
    const w = fitLogit(X, y, 1.0);
    for (const [r, k] of te) { const z = cols.reduce((a, c, j) => a + w[j + 1] * (r.d[c] / sd[j]), 0); wins[k] = z > 0 ? 1 : z === 0 ? 0.5 : 0; }
  }
  return wins;
}
function probe() {
  const idx = (names) => names.map((f) => ALLF.indexOf(f)), NONPOS = ["logn", "loc", "rec", "burst", "span", "invLen", "charLen"], out = {};
  const K = JSON.parse(fs.readFileSync(RES(`C-ud-${RUNG}-pairs.json`), "utf8")), I = JSON.parse(fs.readFileSync(RES(`C-irc-${RUNG}-pairs.json`), "utf8")), Cd = JSON.parse(fs.readFileSync(RES(`C-code-${RUNG}-pairs.json`), "utf8"));
  const sets = {};
  for (const mode of ["FULL", "CAUSAL4"]) {
    const ud = Object.entries(K).filter(([k, v]) => k.startsWith(mode + "|") && v.length >= 60).flatMap(([k, v]) => v.map((r) => ({ ...r, blk: k }))); sets[`ud-${mode}`] = [ud, (r) => r.blk];
    for (const [k, v] of Object.entries(I)) if (k.startsWith(mode + "|")) sets[`irc-${mode}`] = [v.map((r) => ({ ...r })), (r) => hashStr(r.cl) % 5];
    for (const [k, v] of Object.entries(Cd)) if (k.startsWith(mode + "|")) sets[`${k.split("|")[1]}-${mode}`] = [v.map((r) => ({ ...r })), (r) => hashStr(r.cl) % 5];
  }
  for (const [nm, [rows, blockOf]] of Object.entries(sets)) {
    const rnd = rngFor(seedFor(PRE, "probe", nm, RUNG)), cl = rows.map((r) => r.cl), X = idx(["pInitX"]), R = idx(RIV), NP = idx(NONPOS);
    const w = { X: rows.map((r) => (r.d[0] > 0 ? 1 : r.d[0] === 0 ? 0.5 : 0)), R: cvWins(rows, R, blockOf), RX: cvWins(rows, [...R, ...X], blockOf), NP: cvWins(rows, NP, blockOf), NPX: cvWins(rows, [...NP, ...X], blockOf) };
    const o = { n: rows.length }; for (const [k, v] of Object.entries(w)) o[k] = bootWin(v, cl, rnd);
    o.additionAllRivals = diffCI(w.RX, w.R, cl, rnd); o.additionNonPosition = diffCI(w.NPX, w.NP, cl, rnd); out[nm] = o; log(`probe ${nm}`);
  }
  fs.writeFileSync(RES(`C-probe-${RUNG}.json`), JSON.stringify({ hdr: HDR, rung: RUNG, note: "probe = fitted classifier, existence test; NP/NPX columns (non-position rivals) are a POST-HOC addition declared after the K0 IRC/code rival table was seen", out }, null, 1));
  for (const [k, o] of Object.entries(out)) console.log(k.padEnd(14), `n ${o.n}`, `X ${o.X.auc}  R ${o.R.auc}  R+X ${o.RX.auc}  add ${o.additionAllRivals.d} [${o.additionAllRivals.lo},${o.additionAllRivals.hi}] | nonPos ${o.NP.auc}  nonPos+X ${o.NPX.auc}  add ${o.additionNonPosition.d} [${o.additionNonPosition.lo},${o.additionNonPosition.hi}]`);
}
if (name === "probe") probe();
// ── SUMMARY (mechanical implementation of the verdict rules of the header) ────────────────────────────────────────────────────────────────
function summary() {
  const rd = (n) => (fs.existsSync(RES(`C-${n}-${RUNG}.jsonl`)) ? fs.readFileSync(RES(`C-${n}-${RUNG}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  const U = rd("ud"), I = rd("irc"), Cc = rd("code"), T = [], out = { hdr: HDR, rung: RUNG, ud: {}, irc: {}, code: {}, recut: {} }, say = (s) => T.push(s), f3 = (x) => (x === null || x === undefined ? "  -  " : Number(x).toFixed(3));
  const RIVS = [...RIV, ...SIB];
  for (const mode of ["FULL", "CAUSAL4"]) {
    const cells = U.filter((x) => x.mode === mode && !x.ctl && x.pairs >= 60 && x.posCtl >= 0.45 && x.posCtl <= 0.55), o = { nValid: cells.length, medAuc: {}, shareWithin03: {}, medDiff: {}, reproduces: {} };
    for (const f of ALLF) o.medAuc[f] = lowMed(cells.map((c) => c.aucs[f]));
    for (const f of RIVS) { o.shareWithin03[f] = round(mean(cells.map((c) => (c.aucs[f] >= c.aucs.pInitX - 0.03 ? 1 : 0)))); o.medDiff[f] = lowMed(cells.map((c) => c.diffs[f].d)); o.reproduces[f] = o.medAuc[f] >= o.medAuc.pInitX - 0.03 && o.shareWithin03[f] >= 0.5; }
    out.ud[mode] = o; say(`UD ${mode} valid cells ${o.nValid}: median AUC pInitX ${f3(o.medAuc.pInitX)}`);
    for (const f of RIVS) say(`    ${f.padEnd(10)} medAUC ${f3(o.medAuc[f])}  med(pInitX - rival) ${f3(o.medDiff[f])}  share of cells within 0.03: ${f3(o.shareWithin03[f])}  REPRODUCES ${o.reproduces[f]}${SIB.includes(f) ? " (family sibling)" : ""}`);
  }
  for (const [nm, rows] of [["irc", I], ["code", Cc]]) for (const reg of [...new Set(rows.map((x) => x.reg))]) for (const mode of ["FULL", "CAUSAL4"]) {
    const c = rows.find((x) => x.reg === reg && x.mode === mode && !x.ctl); if (!c) continue; const o = { pairs: c.pairs, posCtl: c.posCtl, pInitX: c.aucs.pInitX, lo: c.lo, hi: c.hi, rivals: {} };
    say(`${reg} ${mode} pairs ${c.pairs} pInitX ${f3(c.aucs.pInitX)} [${f3(c.lo)},${f3(c.hi)}]`);
    for (const f of RIVS) { const d = c.diffs[f], rep = c.aucs[f] >= c.aucs.pInitX - 0.03; o.rivals[f] = { auc: c.aucs[f], diff: d.d, lo: d.lo, hi: d.hi, reproduces: rep }; say(`    ${f.padEnd(10)} AUC ${f3(c.aucs[f])}  pInitX - rival ${f3(d.d)} [${f3(d.lo)},${f3(d.hi)}]  REPRODUCES ${rep}${SIB.includes(f) ? " (family sibling)" : ""}`); }
    out[nm][`${reg}|${mode}`] = o;
  }
  const rc = U.filter((x) => x.ctl === "recut" && x.pairs >= 60 && x.posCtl >= 0.45 && x.posCtl <= 0.55), rcMed = lowMed(rc.map((x) => x.auc));
  out.recut = { udValid: rc.length, udMedian: rcMed, udValidControl: rcMed !== null && rcMed >= 0.47 && rcMed <= 0.53, irc: I.filter((x) => x.ctl === "recut").map((x) => ({ auc: x.auc, lo: x.lo, hi: x.hi, valid: x.auc >= 0.45 && x.auc <= 0.55 })), code: Cc.filter((x) => x.ctl === "recut").map((x) => ({ reg: x.reg, auc: x.auc, lo: x.lo, hi: x.hi })) };
  say(`RE-CUT control: UD median ${f3(rcMed)} over ${rc.length} valid cells (valid ${out.recut.udValidControl}); IRC ${JSON.stringify(out.recut.irc)}; code ${JSON.stringify(out.recut.code)}`);
  fs.writeFileSync(RES(`C-summary-${RUNG}.json`), JSON.stringify(out, null, 1)); fs.writeFileSync(RES(`C-summary-${RUNG}.txt`), T.join("\n") + "\n"); console.log(T.join("\n"));
}
if (name === "summary") summary();
