// attack-c-rivals.mjs -- ATTACK C (COUNT / POSITION / INITIAL-SLOT RIVALS AND SHUFFLED-COMPANY CONTROLS) on rule "ablscope-1-slot-ircB-c4plus": IF English IRC (M=256), token not message-initial, local count c >= 4, THEN S_ENTRY >= 1 marks a nickname.
//   node attack-c-rivals.mjs [--B 1000]      (reads the confirmer's design.json + stored reads, this attack's design-a2 reads (data/read-a2) and shufK reads (data/read-c); writes results/attack-c.json)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; the sha256 of everything above the END marker goes into the output) ═══
// WRITTEN: after the fresh reads of design-a2.json and design-c.json were EXECUTED (they store records only) and after attack-a-analyse.mjs was run, but BEFORE any statistic of THIS file was computed.
//   DISCLOSURE: from attack A I have seen (a) the confirmer's baseline recomputed: E_CORE 75 pairs AUC 0.847, E_REUSE 407 pairs 0.817, all English 497 pairs 0.824 (spec 0.990, sens 0.658); (b) count-exact matching S1: pooled 952 pairs AUC 0.705, on the confirmer's own positives
//   (324 pairs) 0.802 vs 0.801 with the confirmer's negatives (matching of negatives cannot move the AUC because the unlabelled false-alarm rate is ~1% whatever the match); (c) strictest S2 (330 pairs, recency matched) AUC 0.588; (d) initial-share-matched S3 (431 pairs) AUC 0.500, sens 0.028 = unlabelled 0.028,
//   but I have NOT yet decomposed S3 by R_INIT zone; (e) paired logistic OR of S_ENTRY >= 1 falls from ~320 to ~9 when d R_INIT is added; (f) the unmatched covariate R_DOCCOUNT has AUC 0.442 on the confirmer's 497 pairs (names are burstier / have lower document frequency than matched controls at equal local count).
//   I have NOT looked at shufK results (data/read-c exists, its S_ENTRY values never inspected) nor at any rival AUC of this file.
//
// DATA. Same rows for every comparison within a test. English B c4+ matched pairs (c4_6 c7_15 c16p): P_T1 = E_CORE (75, untouched), P_REUSE = E_REUSE (407), P_ALL = E_CORE + E_SRV + E_REUSE (497), P_S1conf = count-exact (S1) pairs whose positive is one of the confirmer's (conf true);
//   P_X = German + Spanish + Italian IRC (136). Rows for C2/C4: every read English B c4+ positive (confirmer pair positives + design-a2 positives, deduplicated by day and position) and every read unlabelled (confirmer pair negatives, natural samples, design-a2 negatives).
//   SHUF: kubuntu/2007-03-15, kubuntu/2007-07-15, ubuntu/2005-03-15 read as real / shufW / shufG (confirmer) and shufK (this attack: tokens permuted inside each message EXCEPT the first token), 30 pairs per cell per day.
// STATISTICS (as the confirmer): stratified AUC (c4_6, c7_15, c16p), cluster bootstrap B=1000 (blocks = document x half stream), paired difference by the same bootstrap. A RIVAL's AUC is DIRECTION-FREE: max(AUC, 1-AUC) with its direction reported (generous to the rival).
//
// TESTS AND DECISION RULES (fixed now).
//   C1 RIVALS ON THE SAME PAIRS. Rivals: cheap count / position / length / frequency observables (log document frequency of the form, log local count c, count before s, mentions in the last 16 messages, burst, character length, log message length, stream position, in-message index,
//       frequency bin) and initial-slot observables (number of in-window message-initial mentions cInit; share rinit; flags cInit >= 1, rinit >= 0.25, rinit >= 0.5). A rival REPRODUCES the rule if its direction-free AUC >= AUC(S_ENTRY) - 0.03 on the same pairs (P_ALL decides; P_T1, P_REUSE, P_S1conf, P_X reported).
//       Reading: if a CHEAP matched-out covariate reproduces it, the rule FALLS (a count/position/length/frequency artefact). If only an initial-slot observable reproduces it, the rule is DOMINATED by a cheaper stream-only observable (it stands as a flag, narrowed to "echo of initial-slot recurrence").
//   C2 NATURAL (UNMATCHED) POPULATION: read positives vs natural unlabelled, stratified AUC of S_ENTRY and of the same rivals; plus sensitivity of the rival rinit >= tau at the SAME false-alarm rate as S_ENTRY >= 1 (tau = smallest observed rinit threshold with FPR <= FPR of S_ENTRY >= 1, per stratum, pooled).
//   C3 SHUFFLED-COMPANY CONTROLS on the same three days: S_ENTRY and R_INIT AUC under real / shufW / shufG / shufK. shufK KEEPS the initial slot: if S_ENTRY AUC(shufK) >= AUC(real) - 0.05 the signal is carried by the first slot alone (the rest of the message is not "company" for this rule);
//       if AUC(shufK) <= 0.58 the signal needs words after the first token. Position control R_IPOS must be in [0.45, 0.55] in each condition or the condition is void. Confirmer's expectation for shufW / shufG (0.5075 / 0.5036) must be reproduced within 0.03 or the stored reads are suspect.
//   C4 CONDITIONAL ON THE INITIAL SHARE (rows, not pairs): bins of rinit = {0}, (0, 0.25), [0.25, 0.5), [0.5, 1]; per stratum x bin AUC of S_ENTRY names vs unlabelled (cells need >= 5 of each); stratified over cells weighted by names; block bootstrap B=500.
//       S_ENTRY CARRIES information beyond rinit iff the zone rinit >= 0.25 has AUC >= 0.62 with lower bound > 0.55 (>= 20 names and >= 20 unlabelled); otherwise it is an echo. Also reported: S3 pairs of attack A split by rinit zone.
//   C5 SPEED: is the cheap rival also a better flag? (sensitivity, specificity of rinit >= 0.5 and of S_ENTRY >= 1 on P_ALL pairs and on natural rows).
// VERDICT OF ATTACK C: SUCCESSFUL if C1 finds a cheap matched-out covariate that reproduces the rule, or C3 shows shufG/shufW reproduces it (>= 0.62). NARROWING if only initial-slot rivals reproduce / dominate it, if shufK reproduces the real AUC, or C4 says echo.
//   FAILED (rule stands against C) if no rival is within 0.03, shufK <= 0.58 and C4 carries.
// BLIND PREDICTIONS (direction not blind: see the disclosure). P1 no cheap matched-out covariate reaches AUC(S_ENTRY) - 0.03 on P_ALL: 0.90 (their direction-free AUCs <= 0.56). P2 rinit beats S_ENTRY on P_ALL by >= 0.08 (interval excludes 0): 0.90; cInit within 0.05 of rinit: 0.7.
//   P3 shufK AUC >= real - 0.05: 0.80; shufW <= 0.55: 0.90; shufG <= 0.55: 0.90. P4 C4 zone rinit >= 0.25 CARRIES (AUC >= 0.62, LB > 0.55): 0.40. P5 at equal natural false-alarm rate, rinit >= tau has sensitivity >= that of S_ENTRY >= 1: 0.85.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, loadTokens, readMaps, pairsOf, byStratum, liveBy, summarise, diffCi, sens, spec, aucPairs, aucPN, stratAuc, round, mean, quantile, blockBoot, sEntry, sAll, blockOf, rngFor } from "./lib-a.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const B = Number(opt("--B", 1000)); let seedCtr = 20261009; const nextSeed = () => seedCtr++;

// ── data ──────────────────────────────────────────────────────────────────────────────────────────────────────
const { tokens: confTokens } = loadTokens();
const readsA = readMaps([path.join(CONF, "data", "read"), path.join(HERE, "data", "read-a2")]), readsC = readMaps([path.join(HERE, "data", "read-c")]);
const attach = (design, reads) => design.tokens.flatMap((t) => { const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`); return rec ? [{ ...t, S: sEntry(rec.counts), SALL: sAll(rec.counts), block: blockOf(t) }] : []; });
const a2Tokens = attach(JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-a2.json"), "utf8")), readsA);
const cTokens = attach(JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-c.json"), "utf8")), readsC);
const ENG = ["E_CORE", "E_SRV", "E_REUSE"], XL = ["X_DE", "X_ES", "X_IT"];
const pairSet = (arms) => pairsOf(confTokens, (t) => arms.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum));
const P = { P_T1: pairSet(["E_CORE"]), P_REUSE: pairSet(["E_REUSE"]), P_ALL: pairSet(ENG), P_X: pairSet(XL), P_S1conf: pairsOf(a2Tokens, (t) => t.level === "S1" && t.conf) };
const S = (m) => m.S;
const RIV = { docfreq: (m) => Math.log(m.docCount), logc: (m) => Math.log(m.c), cBefore: (m) => m.cBefore, last16: (m) => m.last16, burst: (m) => Math.log((m.last16 + 0.5) / (m.rate * 16 + 0.5)), len: (m) => m.len, logsl: (m) => Math.log(m.sl), pos: (m) => Math.log1p(m.s), idx: (m) => m.i, fbin: (m) => m.fbin,
  cInit: (m) => m.cInit, rinit: (m) => m.rinit, flag_cInit1: (m) => (m.cInit >= 1 ? 1 : 0), flag_rinit25: (m) => (m.rinit >= 0.25 ? 1 : 0), flag_rinit50: (m) => (m.rinit >= 0.5 ? 1 : 0) };
const CHEAP = ["docfreq", "logc", "cBefore", "last16", "burst", "len", "logsl", "pos", "idx", "fbin"], INITIAL = ["cInit", "rinit", "flag_cInit1", "flag_rinit25", "flag_rinit50"];
const OUT = { module: "eval/law/provisional/attack-ablscope-1-slot-ircB-c4plus/attack-c-rivals.mjs", rule: "ablscope-1-slot-ircB-c4plus", B, sizes: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.length])), a2Tokens: a2Tokens.length, cTokens: cTokens.length };

// ── C1 rivals on the same pairs ─────────────────────────────────────────────────────────────────────────────────────
function rivalTable(pairs, { full }) {
  const by = liveBy(pairs, ST4), sS = summarise(pairs, S, { B: full ? B : 400, seed: nextSeed() }), out = { S_ENTRY: { auc: sS.auc, ci: sS.ci, n: sS.pairs }, rivals: {} };
  for (const [k, f] of Object.entries(RIV)) {
    const a = stratAuc(by, f), dir = a >= 0.5 ? 1 : -1, g = (m) => dir * f(m), ad = dir === 1 ? a : 1 - a, row = { aucDirFree: round(ad), direction: dir === 1 ? "higher=name" : "lower=name", reproduces: ad >= sS.auc - 0.03 };
    if (full || INITIAL.includes(k)) { const b = summarise(pairs, g, { B: full ? B : 400, seed: nextSeed() }), d = diffCi(pairs, S, g, { B: full ? B : 400, seed: nextSeed() }); row.ci = b.ci; row.sMinusRival = d; }
    out.rivals[k] = row;
  }
  return out;
}
OUT.C1 = {}; for (const [k, ps] of Object.entries(P)) OUT.C1[k] = rivalTable(ps, { full: k === "P_ALL" || k === "P_T1" });
OUT.C1.verdict = (() => { const t = OUT.C1.P_ALL, s = t.S_ENTRY.auc, cheap = CHEAP.filter((k) => t.rivals[k].reproduces), init = INITIAL.filter((k) => t.rivals[k].reproduces);
  return { sEntryAuc: s, cheapReproducing: cheap, initialReproducing: init, cheapMax: Math.max(...CHEAP.map((k) => t.rivals[k].aucDirFree)), outcome: cheap.length ? "FALLS_TO_CHEAP_RIVAL" : init.length ? "DOMINATED_BY_INITIAL_SLOT_RIVAL" : "NO_RIVAL" }; })();

// ── row-level (unpaired) helpers: cell-stratified AUC weighted by positives and a block bootstrap of it ─────────────
const cellAuc = (rows, f, cellOf, { minEach = 2 } = {}) => { const cells = new Map(); for (const r of rows) { const c = cellOf(r); if (c == null) continue; const o = cells.get(c) ?? cells.set(c, { p: [], n: [] }).get(c); (r.y ? o.p : o.n).push(f(r)); }
  let w = 0, a = 0, used = 0; for (const o of cells.values()) { if (o.p.length < minEach || o.n.length < minEach) continue; const v = aucPN(o.p, o.n); a += v * o.p.length; w += o.p.length; used += 1; } return w ? a / w : null; };
function rowBoot(rows, f, cellOf, { Bn = 500, seed = 1, minEach = 2 } = {}) {
  const rnd = rngFor(seed), ids = [...new Set(rows.map((r) => r.block))], by = new Map(ids.map((b) => [b, []])); for (const r of rows) by.get(r.block).push(r);
  const xs = []; for (let b = 0; b < Bn; b++) { const rs = []; for (let k = 0; k < ids.length; k++) rs.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const v = cellAuc(rs, f, cellOf, { minEach }); if (v != null) xs.push(v); }
  return { point: round(cellAuc(rows, f, cellOf, { minEach })), lo: round(quantile(xs, 0.025)), hi: round(quantile(xs, 0.975)) };
}
const stOf = (r) => r.stratum;
// unique English B c4+ rows: positives (pair y=1 of confirmer and design-a2) and unlabelled (pair y=0, natural samples, design-a2 negatives); keep first occurrence of a (day, s:i)
const rowMap = new Map(); const add = (t) => { const k = `${t.doc}|${t.s}:${t.i}`; if (!rowMap.has(k)) rowMap.set(k, t); };
for (const t of confTokens) if (ENG.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum)) add(t);
for (const t of a2Tokens) if (t.grp === "B" && ST4.includes(t.stratum)) add(t);
const rows = [...rowMap.values()], posRows = rows.filter((r) => r.y === 1), natRows = rows.filter((r) => r.y === 0 && r.kind === "nat"), negRows = rows.filter((r) => r.y === 0);
OUT.rowCounts = { positives: posRows.length, natural: natRows.length, allUnlabelled: negRows.length };

// ── C2 natural population ──────────────────────────────────────────────────────────────────────────────────────────
OUT.C2 = { counts: OUT.rowCounts, auc: {} };
{ const rr = [...posRows, ...natRows];
  for (const [k, f] of [["S_ENTRY", S], ...Object.entries(RIV)]) { const a = cellAuc(rr, f, stOf), dir = a >= 0.5 ? 1 : -1; const bb = rowBoot(rr, (r) => dir * f(r), stOf, { Bn: 300, seed: nextSeed() }); OUT.C2.auc[k] = { aucDirFree: bb.point, ci: [bb.lo, bb.hi], direction: dir === 1 ? "higher=name" : "lower=name" }; }
  // equal-false-alarm comparison: per stratum, smallest rinit / cInit threshold whose natural FPR <= FPR(S_ENTRY >= 1); sensitivity on positives
  const eq = {};
  for (const [name, f] of [["rinit", RIV.rinit], ["cInit", RIV.cInit]]) { let tp = 0, np = 0, fpS = 0, nn = 0, tpS = 0; const per = {};
    for (const st of ST4) { const P_ = posRows.filter((r) => r.stratum === st), N_ = natRows.filter((r) => r.stratum === st); if (!P_.length || !N_.length) continue;
      const fS = N_.filter((r) => r.S >= 1).length / N_.length, tS = P_.filter((r) => r.S >= 1).length / P_.length, ths = [...new Set([...P_, ...N_].map(f))].sort((a, b) => a - b); let best = ths[ths.length - 1] + 1;
      for (const th of ths) { if (th <= 0) continue; if (N_.filter((r) => f(r) >= th).length / N_.length <= fS) { best = th; break; } }
      const tR = P_.filter((r) => f(r) >= best).length / P_.length, fR = N_.filter((r) => f(r) >= best).length / N_.length; per[st] = { nPos: P_.length, nNat: N_.length, fprS: round(fS), sensS: round(tS), tau: round(best, 3), fprRival: round(fR), sensRival: round(tR) }; tp += tR * P_.length; np += P_.length; tpS += tS * P_.length; }
    eq[name] = { perStratum: per, pooledSensRival: round(tp / np), pooledSensS: round(tpS / np) }; }
  OUT.C2.equalFalseAlarm = eq; }

// ── C3 shuffled-company controls on the same three days ─────────────────────────────────────────────────────────────
OUT.C3 = { conds: {} };
{ const shufConf = pairsOf(confTokens, (t) => t.arm === "SHUF" && t.grp === "B" && ST4.includes(t.stratum)), shufK = pairsOf(cTokens, () => true);
  for (const cond of ["real", "shufW", "shufG", "shufK"]) { const ps = cond === "shufK" ? shufK : shufConf.filter((x) => x.cond === cond), by = liveBy(ps, ST4), all = Object.values(by).flat();
    const sm = summarise(ps, S, { B, seed: nextSeed() }), rin = summarise(ps, RIV.rinit, { B: 500, seed: nextSeed() }), ctl = { R_IPOS: round(stratAuc(by, RIV.idx)), R_POS: round(stratAuc(by, RIV.pos)), R_LOGC: round(stratAuc(by, RIV.logc)), R_LEN: round(stratAuc(by, RIV.len)) };
    OUT.C3.conds[cond] = { pairs: all.length, days: new Set(all.map((x) => x.doc)).size, S_ENTRY: { auc: sm.auc, ci: sm.ci, perStratum: sm.perStratum }, sens: sens(all), spec: spec(all), rinit: { auc: rin.auc, ci: rin.ci }, controls: ctl, positionControlInBand: ctl.R_IPOS >= 0.45 && ctl.R_IPOS <= 0.55 && ctl.R_POS >= 0.45 && ctl.R_POS <= 0.55 }; }
  const c = OUT.C3.conds, a = (k) => c[k].S_ENTRY.auc;
  OUT.C3.verdict = { real: a("real"), shufK: a("shufK"), shufW: a("shufW"), shufG: a("shufG"), shufKcarriesFirstSlot: a("shufK") >= a("real") - 0.05, shufKneedsMore: a("shufK") <= 0.58, shufWorGreproduce: Math.max(a("shufW"), a("shufG")) >= 0.62, confirmerShufWgShufG_withinTolerance: Math.abs(a("shufW") - 0.5075) <= 0.03 && Math.abs(a("shufG") - 0.5036) <= 0.03 }; }

// ── C4 conditional on the initial share (rows) ───────────────────────────────────────────────────────────────────────
const zoneOf = (r) => (r.rinit === 0 ? "z0" : r.rinit < 0.25 ? "z1" : r.rinit < 0.5 ? "z2" : "z3"), cellOfRS = (r) => `${r.stratum}|${zoneOf(r)}`, inZone = (zs) => (r) => (zs.includes(zoneOf(r)) ? cellOfRS(r) : null);
OUT.C4 = { zones: {}, perCell: {} };
{ for (const st of ST4) for (const z of ["z0", "z1", "z2", "z3"]) { const P_ = posRows.filter((r) => r.stratum === st && zoneOf(r) === z), N_ = negRows.filter((r) => r.stratum === st && zoneOf(r) === z), Nn = natRows.filter((r) => r.stratum === st && zoneOf(r) === z);
    OUT.C4.perCell[`${st}|${z}`] = { names: P_.length, unlabelled: N_.length, natural: Nn.length, sensS: P_.length ? round(P_.filter((r) => r.S >= 1).length / P_.length) : null, fprS: N_.length ? round(N_.filter((r) => r.S >= 1).length / N_.length) : null, auc: P_.length >= 2 && N_.length >= 2 ? round(aucPN(P_.map(S), N_.map(S))) : null, meanRinitNames: P_.length ? round(mean(P_.map((r) => r.rinit))) : null, meanRinitUnl: N_.length ? round(mean(N_.map((r) => r.rinit))) : null }; }
  const mk = (zs) => { const rr = rows.filter((r) => zs.includes(zoneOf(r))), bb = rowBoot(rr, S, inZone(zs), { Bn: 500, seed: nextSeed(), minEach: 5 }); return { names: rr.filter((r) => r.y).length, unlabelled: rr.filter((r) => !r.y).length, auc: bb.point, ci: [bb.lo, bb.hi] }; };
  OUT.C4.zones = { zone_ge025: mk(["z2", "z3"]), zone_z3_ge05: mk(["z3"]), zone_z2: mk(["z2"]), zone_z1: mk(["z1"]), zone_z0: mk(["z0"]), all_cells: mk(["z0", "z1", "z2", "z3"]) };
  const zg = OUT.C4.zones.zone_ge025; OUT.C4.verdict = zg.names >= 20 && zg.unlabelled >= 20 && zg.auc >= 0.62 && zg.ci[0] > 0.55 ? "CARRIES" : "ECHO";
  // S3 pairs of attack A split by the positive's rinit zone
  const s3 = pairsOf(a2Tokens, (t) => t.level === "S3"), z3 = {};
  for (const z of ["z0", "z1", "z2", "z3"]) { const ps = s3.filter((x) => zoneOf(x.p) === z), by = liveBy(ps, ST4); z3[z] = { pairs: ps.length, auc: Object.values(by).flat().length >= 4 ? round(stratAuc(by, S)) : null, sensNames: sens(ps), flaggedUnlabelled: ps.length ? round(ps.filter((x) => x.n.S >= 1).length / ps.length) : null }; }
  OUT.C4.S3byZone = z3; }

// ── C5 the cheap rival as a flag ────────────────────────────────────────────────────────────────────────────────────
{ const ps = P.P_ALL, flag = (name, f) => ({ name, sens: round(ps.filter((x) => f(x.p)).length / ps.length), spec: round(ps.filter((x) => !f(x.n)).length / ps.length), naturalFpr: round(natRows.filter((r) => f(r)).length / natRows.length), naturalSensPositives: round(posRows.filter((r) => f(r)).length / posRows.length) });
  OUT.C5 = [flag("S_ENTRY>=1", (m) => m.S >= 1), flag("rinit>=0.5", (m) => m.rinit >= 0.5), flag("rinit>=0.25", (m) => m.rinit >= 0.25), flag("cInit>=1", (m) => m.cInit >= 1), flag("cInit>=2", (m) => m.cInit >= 2), flag("S>=1 AND rinit>=0.5", (m) => m.S >= 1 && m.rinit >= 0.5), flag("S>=1 AND rinit<0.5", (m) => m.S >= 1 && m.rinit < 0.5), flag("rinit>=0.5 AND S=0", (m) => m.rinit >= 0.5 && m.S === 0)]; }

const hdr = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
OUT.headerSha256 = createHash("sha256").update(hdr).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-c.json"), JSON.stringify(OUT, null, 1));
console.log(JSON.stringify({ headerSha256: OUT.headerSha256, sizes: OUT.sizes, rowCounts: OUT.rowCounts, C1verdict: OUT.C1.verdict, C3verdict: OUT.C3.verdict, C4verdict: OUT.C4.verdict }, null, 1));
