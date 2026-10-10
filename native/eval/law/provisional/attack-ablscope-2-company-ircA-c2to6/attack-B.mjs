// attack-B.mjs -- ATTACK B (FORKING PATHS, MULTIPLICITY, PRE-REGISTRATION INTEGRITY) on rule ablscope-2-company-ircA-c2to6.   node attack-B.mjs --stage compute|analyse   (does not import name-company.mjs)
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written BEFORE the first run of this file) ═══
// DISCLOSURE. Seen: confirm.en.json in full (primary 0.834; strata 0.816/0.833/0.844; decay arm c7_15 0.8315 on 105 pairs and c16p 0.876 on 11 pairs with R_FB 0.285 void; per-day AUCs; channels; years), the rule JSON (scoper: decay 0.67 at c7-15, 0.64 at c16+),
//   attack-A/A2/C/C2 outputs of mine (strict re-match 0.850 on 136 pairs; R_INIT 0.880; first-token-fixed shuffle 0.833). NOT seen before this header: any split-half, permutation-count, day-clustered bootstrap, component ranking, fresh-day score, year trend or
//   stratum-wise median of mine. The 26 fresh English days (unused by the confirmer and by every earlier test; design count: 77 eligible group-A positives at c2..c6) have never been scored with c.dSelf or R_INIT by anyone.
// DATA. (R) the confirmer's EN pairs, group A, all strata c2,c3,c4_6,c7_15,c16p (466 pairs, 23 days; c7+ pairs carry the confirmer's own void flag, R_FB 0.285). (F) 26 fresh English days.
// B0 PRE-REGISTRATION INTEGRITY. Recompute sha256 of confirm.mjs text before its END marker and compare with results/header.sha256.txt and with every confirm.*.json headerSha256; compare file mtimes (header.sha256.txt must predate rows.en.jsonl);
//   compare the confirmer's T1/T2 thresholds (0.65, 0.58) with the rule's passIf (0.62, 0.55): tightening only. PASS iff all hold.
// B1 SCOPE RE-DERIVATION ON RANDOM DAY SPLITS (2000 draws, seed fixed): split the 23 days 50/50 at random; on the DERIVE half compute per-stratum AUC of -dSelf (strata c2,c3,c4_6,c7_15,c16p; a stratum needs >= 15 pairs); derived scope = strata with AUC >= 0.62.
//   On the held-out half report the stratified AUC over (i) the derived scope and (ii) the registered scope {c2,c3,c4_6}. Also report the share of splits in which the derived scope equals the registered scope and the share in which it contains c7_15. Same with R_INIT.
//   The registered upper edge (c <= 6) is RE-DERIVABLE iff the derived scope excludes c7_15 in >= 80% of splits. The registered scope HOLDS OUT iff the held-out AUC of the registered scope is >= 0.65 in >= 95% of splits.
// B2 MULTIPLICITY. (a) exact sign test of days with AUC > 0.5 among evaluable days (>= 10 pairs); (b) within-pair label-swap permutation null (2000 draws) of two counts: days (>= 10 pairs) with AUC > 0.5, and day x stratum cells (>= 8 pairs) with AUC >= 0.62;
//   observed counts must exceed the null 99th percentile; (c) day-level cluster bootstrap (resample whole days, B=1000) of the primary stratified AUC: lower bound must exceed 0.58; (d) leave-one-channel-out AUCs and the Spearman correlation of day AUC with year.
// B3 COMPONENT PICK. AUC of each of the 8 company components (both signs) and of the 7 descriptor-dimension changes (both signs) on R primary pairs. dSelf was nominated from 223 components in discovery: report its rank among the 30 signed scores.
// B4 FRESH DAYS (descriptive, small). v3 matched pairs (confirmer's matcher, group A, c2,c3,c4_6) on F, and a POPULATION check (all eligible positives vs <= 60 random group-A negatives per stratum-day): stratified AUC of -dSelf and R_INIT, with controls.
//   FRESH-PASS iff the v3 pair set has >= 15 pairs and AUC(-dSelf) >= 0.65 and the population AUC(-dSelf) >= 0.65; INCONCLUSIVE if either set is < 15 pairs/positives.
// B5 DECAY: per-stratum median dSelf of names and non-names on R (all strata) and the per-stratum AUC of -dSelf and R_INIT, to test whether the registered decay with c is a property of the phenomenon or of the observable's resolution.
// BLIND PREDICTIONS. P1 B0 passes (0.90). P2 the registered upper edge is NOT re-derivable: c7_15 in the derived scope in >= 80% of splits (0.70); the registered scope holds out (0.85). P3 day sign test p < 0.001, day count and cell count exceed null q99 (0.90); day-level bootstrap LB > 0.58 (0.85).
//   P4 dSelf ranks within the top 3 of 30 signed scores (0.6); initShare dimension ranks above it (0.8). P5 fresh pairs < 30 and AUC >= 0.65 (0.6). P6 median dSelf shrinks with c for both labels while the R_INIT AUC does not decay (0.8).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { HERE, RES, CONF, headerSha, readJsonl, NEG, groupBy, strat, boot, perm, aucOfPairs, round, mean, quantile, rngFor, occOf, aucPN, sha256File } from "./lib-atk.mjs";
import { loadIrcDay, indexAndCandidates, memberLite, IRC_ROOT } from "./lib-strict.mjs";
import { pairsForCellV3 } from "../ablation-scope/lib-pairs.mjs";
import { seedFor } from "../../impact.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), STAGE = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : "analyse", B = 1000, M = 256;
const D = JSON.parse(fs.readFileSync(path.join(RES, "days-attack.json"), "utf8")), FRESH = path.join(RES, "rows.B-fresh.jsonl"), OUT = path.join(RES, "attack-B.json");
const STR = ["c2", "c3", "c4_6", "c7_15", "c16p"], PRIM = ["c2", "c3", "c4_6"];

// ── compute (B4): fresh English days ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function compute() {
  fs.writeFileSync(FRESH, ""); const t0 = Date.now();
  for (const n of D.freshEn) {
    const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M), occ = occOf(doc), lines = [], rnd = rngFor(seedFor("atk-B", "fresh", n));
    for (const st of PRIM) {
      const blockOf = (s) => `${n}|q${Math.min(3, Math.floor((4 * s) / cand.nMsg))}`;
      const pr = pairsForCellV3(cand, doc, M, { grp: "A", stratum: st, n: 150, seedTag: "atk-fresh" });
      pr.pairs.forEach((p, k) => lines.push(JSON.stringify({ kind: "pair", id: `${n}#${st}#${k}`, doc: n, stratum: st, block: blockOf(p.pos.s), p: memberLite(doc, occ, p.pos, M), n: memberLite(doc, occ, p.neg, M) })));
      const P = cand.P.filter((r) => r.grp === "A" && r.stratum === st), Nn = cand.N.filter((r) => r.grp === "A" && r.stratum === st).sort(() => rnd() - 0.5).slice(0, 60);
      for (const r of P) lines.push(JSON.stringify({ kind: "pos", doc: n, stratum: st, block: blockOf(r.s), m: memberLite(doc, occ, r, M) }));
      for (const r of Nn) lines.push(JSON.stringify({ kind: "neg", doc: n, stratum: st, block: blockOf(r.s), m: memberLite(doc, occ, r, M) }));
    }
    fs.appendFileSync(FRESH, lines.map((l) => l + "\n").join("")); console.error(`${n}: ${lines.length} rows, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
// ── B0 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function b0() {
  const f = path.join(CONF, "..", "confirm.mjs"), own = createHash("sha256").update(fs.readFileSync(f, "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
  const rec = fs.readFileSync(path.join(CONF, "header.sha256.txt"), "utf8").match(/[0-9a-f]{64}/)[0], inJson = ["en", "other", "books", "ud"].map((a) => JSON.parse(fs.readFileSync(path.join(CONF, `confirm.${a}.json`), "utf8")).headerSha256);
  const mt = (p) => fs.statSync(p).mtimeMs, hdrT = mt(path.join(CONF, "header.sha256.txt")), rowsT = mt(path.join(CONF, "rows.en.jsonl")), ctlT = mt(path.join(CONF, "ctl.en.json"));
  const rowsSha = sha256File(path.join(CONF, "rows.en.jsonl")), recRows = JSON.parse(fs.readFileSync(path.join(CONF, "confirm.en.json"), "utf8")).rowsSha256;
  const tight = { T1: { rule: 0.62, confirmer: 0.65 }, T2: { rule: 0.55, confirmer: 0.58 } }; tight.tightenedOnly = tight.T1.confirmer >= tight.T1.rule && tight.T2.confirmer >= tight.T2.rule;
  return { recomputedHeaderSha: own, recordedSha: rec, equalRecorded: own === rec, equalInAllJson: inJson.every((x) => x === own), headerPredatesRows: hdrT < rowsT, headerMinusRowsSeconds: round((rowsT - hdrT) / 1000, 1), rowsShaMatchesJson: rowsSha === recRows, thresholds: tight,
    pass: own === rec && inJson.every((x) => x === own) && hdrT < rowsT && rowsSha === recRows && tight.tightenedOnly };
}
// ── analysis ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RI = (m) => m.R_INIT, inScope = (ps, sc) => ps.filter((x) => sc.includes(x.stratum)), shuffleIdx = (n, rnd) => { const a = Array.from({ length: n }, (_, k) => k); for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
function b1(R, days, f, seed) {
  const rnd = rngFor(seed), out = { derivedEqualsRegistered: 0, derivedHasC7_15: 0, derivedEmpty: 0, heldRegistered: [], heldDerived: [] }, draws = 2000;
  for (let d = 0; d < draws; d++) {
    const idx = shuffleIdx(days.length, rnd), dv = new Set(idx.slice(0, 11).map((k) => days[k])), A = R.filter((x) => dv.has(x.doc)), Bv = R.filter((x) => !dv.has(x.doc));
    const scope = STR.filter((st) => { const ps = A.filter((x) => x.stratum === st); return ps.length >= 15 && aucOfPairs(ps, f) >= 0.62; });
    if (!scope.length) out.derivedEmpty++; else { out.heldDerived.push(strat(inScope(Bv, scope), f)); if (scope.includes("c7_15")) out.derivedHasC7_15++; }
    if (scope.length === 3 && PRIM.every((s) => scope.includes(s))) out.derivedEqualsRegistered++;
    out.heldRegistered.push(strat(inScope(Bv, PRIM), f));
  }
  const q = (a, p) => round(quantile(a.filter((v) => v != null && Number.isFinite(v)), p));
  return { draws, shareDerivedEqualsRegistered: round(out.derivedEqualsRegistered / draws), shareDerivedContainsC7_15: round(out.derivedHasC7_15 / draws), shareDerivedEmpty: round(out.derivedEmpty / draws),
    heldOutRegistered: { median: q(out.heldRegistered, 0.5), q05: q(out.heldRegistered, 0.05), shareGE065: round(out.heldRegistered.filter((v) => v >= 0.65).length / draws) }, heldOutDerived: { median: q(out.heldDerived, 0.5), q05: q(out.heldDerived, 0.05) } };
}
const binomTail = (k, n) => { let t = 0, c = 1; for (let i = 0; i <= n; i++) { if (i > 0) c = (c * (n - i + 1)) / i; if (i >= k) t += c; } return t / 2 ** n; };
function b2(P) {
  const byDay = groupBy(P, (x) => x.doc), dayAuc = (ps) => (ps.length >= 10 ? strat(ps, NEG) : null), obs = [...byDay].map(([d, ps]) => [d, dayAuc(ps)]).filter(([, a]) => a != null);
  const cellsOf = (ps) => { let n = 0; for (const [, dp] of groupBy(ps, (x) => x.doc)) for (const st of PRIM) { const c = dp.filter((x) => x.stratum === st); if (c.length >= 8 && aucOfPairs(c, NEG) >= 0.62) n++; } return n; };
  const daysAbove = (ps) => { let n = 0; for (const [, dp] of groupBy(ps, (x) => x.doc)) { const a = dayAuc(dp); if (a != null && a > 0.5) n++; } return n; };
  const o = { days: daysAbove(P), cells: cellsOf(P) }, rnd = rngFor(seedFor("atk-B", "perm")), nd = [], nc = [];
  for (let b = 0; b < 2000; b++) { const ps = P.map((x) => (rnd() < 0.5 ? { ...x, p: x.n, n: x.p } : x)); nd.push(daysAbove(ps)); nc.push(cellsOf(ps)); }
  const ev = obs.length, above = obs.filter(([, a]) => a > 0.5).length, dayBlocks = [...byDay.keys()], rb = rngFor(seedFor("atk-B", "dayboot")), xs = [];
  for (let b = 0; b < B; b++) { const ps = []; for (let k = 0; k < dayBlocks.length; k++) ps.push(...byDay.get(dayBlocks[Math.floor(rb() * dayBlocks.length)])); xs.push(strat(ps, NEG)); }
  const chan = (x) => x.doc.split("/")[0], loco = Object.fromEntries([...new Set(P.map(chan))].map((c) => [c, round(strat(P.filter((x) => chan(x) !== c), NEG))]));
  const yr = obs.map(([d, a]) => [Number(d.split("/")[1].slice(0, 4)), a]), rank = (v) => v.map((x) => v.filter((y) => y < x).length + (v.filter((y) => y === x).length + 1) / 2), ra = rank(yr.map((x) => x[0])), rb2 = rank(yr.map((x) => x[1])), ma = mean(ra), mb = mean(rb2);
  const sp = ra.reduce((t, x, i) => t + (x - ma) * (rb2[i] - mb), 0) / Math.sqrt(ra.reduce((t, x) => t + (x - ma) ** 2, 0) * rb2.reduce((t, x) => t + (x - mb) ** 2, 0));
  return { evaluableDays: ev, daysAbove05: above, signTestP: binomTail(above, ev), observed: o, nullDays: { mean: round(mean(nd)), q99: quantile(nd, 0.99), max: Math.max(...nd) }, nullCells: { mean: round(mean(nc)), q99: quantile(nc, 0.99), max: Math.max(...nc) },
    dayClusterBoot: { point: round(strat(P, NEG)), lo: round(quantile(xs, 0.025)), hi: round(quantile(xs, 0.975)) }, leaveOneChannelOut: loco, spearmanDayAucYear: round(sp), minDayAuc: round(Math.min(...obs.map((x) => x[1]))) };
}
function b3(P) {
  const L8 = ["dLeft", "dRight", "dSelf", "classLeftChanged", "classRightChanged", "surprisalDestroyed", "surprisalCreated", "bigramNet"], L7 = ["d.log1p_count", "d.distLeft", "d.distRight", "d.entLeft", "d.entRight", "d.initShare", "d.finalShare"], rows = [];
  L8.forEach((n, k) => { const a = strat(P, (m) => m.c8[k]); rows.push([`+c.${n}`, a], [`-c.${n}`, 1 - a]); }); L7.forEach((n, k) => { const a = strat(P, (m) => m.dd[k]); rows.push([`+${n}`, a], [`-${n}`, 1 - a]); });
  rows.sort((a, b) => b[1] - a[1]); const rank = rows.findIndex((r) => r[0] === "-c.dSelf") + 1; return { rankOfNegDSelfAmong30: rank, top8: rows.slice(0, 8).map(([n, a]) => `${n} ${round(a, 3)}`), negDSelf: round(rows.find((r) => r[0] === "-c.dSelf")[1]) };
}
function popStrat(pos, neg, f) { let w = 0, a = 0; for (const st of PRIM) { const P = pos.filter((x) => x.stratum === st), N = neg.filter((x) => x.stratum === st); if (!P.length || !N.length) continue; a += aucPN(P.map((x) => f(x.m)), N.map((x) => f(x.m))) * P.length; w += P.length; } return w ? a / w : null; }
function b4() {
  const rows = readJsonl(FRESH), pairs = rows.filter((r) => r.kind === "pair"), pos = rows.filter((r) => r.kind === "pos"), neg = rows.filter((r) => r.kind === "neg"), out = { v3Pairs: pairs.length, positives: pos.length, negativesSampled: neg.length, days: new Set(pos.map((x) => x.doc)).size };
  if (pairs.length >= 8) { const b = boot(pairs, (ps) => strat(ps, NEG), { B, seed: 61 }), bi = boot(pairs, (ps) => strat(ps, RI), { B, seed: 62 }); out.pairs = { n: pairs.length, aucNegDSelf: b.point, ci: [b.lo, b.hi], aucRInit: bi.point, ciRInit: [bi.lo, bi.hi] };
    out.pairControls = Object.fromEntries(["R_LOGC", "R_POS", "R_IPOS", "R_FB", "R_LEN", "R_SL"].map((c) => [c, round(strat(pairs, (m) => m[c]))])); }
  const blocks = [...new Set([...pos, ...neg].map((x) => x.block))], rnd = rngFor(seedFor("atk-B", "popboot")), draw = (f) => { const xs = []; for (let b = 0; b < B; b++) { const cnt = new Map(); for (let k = 0; k < blocks.length; k++) { const x = blocks[Math.floor(rnd() * blocks.length)]; cnt.set(x, (cnt.get(x) ?? 0) + 1); }
    const rs = (a) => a.flatMap((x) => Array.from({ length: cnt.get(x.block) ?? 0 }, () => x)), v = popStrat(rs(pos), rs(neg), f); if (v != null) xs.push(v); } return [round(quantile(xs, 0.025)), round(quantile(xs, 0.975))]; };
  out.population = { negDSelf: { auc: round(popStrat(pos, neg, NEG)), ci: draw(NEG) }, R_INIT: { auc: round(popStrat(pos, neg, RI)), ci: draw(RI) } };
  out.populationControls = Object.fromEntries(["R_LOGC", "R_POS", "R_FB", "R_LEN", "R_SL"].map((c) => [c, round(popStrat(pos, neg, (m) => m[c]))]));
  out.freshPass = pairs.length >= 15 && out.pairs.aucNegDSelf >= 0.65 && out.population.negDSelf.auc >= 0.65; return out;
}
function b5(R) {
  const out = {}, med = (a) => round(quantile(a, 0.5));
  for (const st of STR) { const ps = R.filter((x) => x.stratum === st); out[st] = { pairs: ps.length, medianDSelfName: med(ps.map((x) => x.p.dSelf)), medianDSelfNonName: med(ps.map((x) => x.n.dSelf)), aucNegDSelf: ps.length >= 8 ? round(aucOfPairs(ps, NEG)) : null, aucRInit: ps.length >= 8 ? round(aucOfPairs(ps, RI)) : null,
    controlRFB: ps.length >= 8 ? round(aucOfPairs(ps, (m) => m.R_FB)) : null }; }
  const sp = path.join(CONF, "supplement-pop.json"); out.confirmerPopulationSupplement = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, "utf8")) : null; return out;
}
function analyse() {
  const t0 = Date.now(), R = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && STR.includes(r.stratum)), P = R.filter((x) => PRIM.includes(x.stratum)), days = [...new Set(R.map((x) => x.doc))];
  const res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "B forking paths", headerSha256: SHA, B, pairsR: R.length, pairsPrimary: P.length, days: days.length };
  res.B0 = b0(); res.B1_negDSelf = b1(R, days, NEG, 11); res.B1_RInit = b1(R, days, RI, 12); res.B2 = b2(P); res.B3 = b3(P); res.B4 = b4(); res.B5 = b5(R);
  res.analyseSeconds = round((Date.now() - t0) / 1000, 1); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log("B0", res.B0.pass, "B1", JSON.stringify(res.B1_negDSelf), "B2", JSON.stringify(res.B2).slice(0, 400));
}
if (STAGE === "compute" || STAGE === "both") compute();
if (STAGE === "analyse" || STAGE === "both") analyse();
