// attack-ac-followup.mjs -- FOLLOW-UP to attacks A and C on rule "ablscope-1-slot-ircB-c4plus" (two things my own first runs exposed).
//   node attack-ac-followup.mjs [--B 500]       (same stored reads as attack C; writes results/attack-ac-followup.json)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; the sha256 of everything above the END marker goes into the output) ═══
// WRITTEN: after attack A (attack-a-analyse.mjs) and attack C (attack-c-rivals.mjs) were run and their results read; BEFORE any statistic of THIS file was computed. This file is therefore POST-HOC with respect to the two flaws below; its thresholds are fixed now.
// DISCLOSURE. Attack C2 compared names with natural unlabelled tokens in strata of the local count only. The pooled unmatched AUC of raw stream position was 0.908 and of document frequency 0.74: a DAY-COMPOSITION ARTEFACT (names come disproportionately
//   from the largest days, the natural sample is equal per day). My C2 numbers for position / frequency are therefore void; the S_ENTRY and R_INIT numbers of C2 (0.728 / 0.787) are inflated or deflated by the same mixing by an unknown amount.
//   Attack A showed: count-exact matching (S1) leaves the AUC on the confirmer's own positives unchanged (0.802 vs 0.801); recency-matched pairs (S2, |dlast16| <= 1) give AUC 0.588 with sensitivity 0.197 (positives that can be matched on recency are those mentioned rarely in the last 16 messages);
//   attack C4 showed S_ENTRY >= 1 never occurs when rinit < 0.5 (flag rate 0 in zones z0-z2) and, inside rinit >= 0.5, flags 66-93% of names and 42-78% of unlabelled (AUC 0.59-0.60 in that zone). I have not looked at any recency decomposition.
// TESTS AND DECISION RULES.
//   F1 DAY-ADJUSTED NATURAL AUC (C2b): read positives vs natural unlabelled in cells (day x local-count stratum), cell AUCs weighted by names, cells need >= 2 of each; for S_ENTRY, rinit, cInit, docfreq, c, position, length, burst, fbin (direction-free for rivals).
//       Also the equal-false-alarm comparison of C2 redone with natural rows REWEIGHTED to the day x stratum composition of the names (weight = names / natural rows per cell). Void-check: stream position and in-message index must land in [0.45, 0.55] after day adjustment.
//       Decision: S_ENTRY >= 1 is "no better than the initial-share rival at equal false-alarm rate" if the weighted sensitivity of rinit >= tau at FPR <= FPR(S_ENTRY >= 1) is >= that of S_ENTRY >= 1 minus 0.02.
//   F2 RECENCY DECOMPOSITION (A8): bins of the evaluated occurrence's mentions in the last 16 messages: {0}, {1}, {2,3}, {4+}. Per bin: names, natural unlabelled, flag rate of S_ENTRY >= 1 among names and among unlabelled, and the day x stratum-celled AUC (cells >= 2 each).
//       S_ENTRY's discrimination is "recency-borne" if its AUC is <= 0.58 in the bin last16 = 0 (names not mentioned in the last 16 messages) while >= 0.70 in the bin 4+; it is "recency-free" if the AUC is >= 0.62 in every bin that has >= 20 names and >= 20 unlabelled.
//   F3 SENSITIVITY GRADIENT: names flagged by S_ENTRY >= 1 as a function of (log2 c bin) x (rinit >= 0.5 or not) to state the scope of the rule precisely (reported; no threshold).
// BLIND PREDICTIONS. F1: day-adjusted raw position and in-message index in [0.45, 0.55]: 0.95; document frequency (direction-free) <= 0.60: 0.75; S_ENTRY day-adjusted AUC within 0.04 of its C2 value 0.728: 0.60; rinit weighted sensitivity >= S_ENTRY - 0.02 at equal FPR: 0.75.
//   F2: sensitivity of S_ENTRY >= 1 among names at last16 = 0 is <= 0.30: 0.75, and at last16 >= 4 is >= 0.60: 0.80; "recency-borne" verdict: 0.50.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, loadTokens, readMaps, aucPN, round, mean, quantile, sEntry, sAll, blockOf, rngFor } from "./lib-a.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const Bn = Number(opt("--B", 500)); let seedCtr = 20261010; const nextSeed = () => seedCtr++;
const { tokens: confTokens } = loadTokens();
const reads = readMaps([path.join(CONF, "data", "read"), path.join(HERE, "data", "read-a2")]);
const a2Tokens = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-a2.json"), "utf8")).tokens.flatMap((t) => { const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`); return rec ? [{ ...t, S: sEntry(rec.counts), block: blockOf(t) }] : []; });
const ENG = ["E_CORE", "E_SRV", "E_REUSE"], rowMap = new Map(), add = (t) => { const k = `${t.doc}|${t.s}:${t.i}`; if (!rowMap.has(k)) rowMap.set(k, t); };
for (const t of confTokens) if (ENG.includes(t.arm) && t.cond === "real" && t.grp === "B" && ST4.includes(t.stratum)) add(t);
for (const t of a2Tokens) if (t.grp === "B" && ST4.includes(t.stratum)) add(t);
const rows = [...rowMap.values()], posRows = rows.filter((r) => r.y === 1), natRows = rows.filter((r) => r.y === 0 && r.kind === "nat");
const S = (r) => r.S, F = { S_ENTRY: S, rinit: (r) => r.rinit, cInit: (r) => r.cInit, docfreq: (r) => Math.log(r.docCount), logc: (r) => Math.log(r.c), pos: (r) => Math.log1p(r.s), idx: (r) => r.i, len: (r) => r.len, logsl: (r) => Math.log(r.sl), burst: (r) => Math.log((r.last16 + 0.5) / (r.rate * 16 + 0.5)), fbin: (r) => r.fbin };
const cellAuc = (rs, f, cellOf, minEach = 2) => { const cells = new Map(); for (const r of rs) { const c = cellOf(r); if (c == null) continue; const o = cells.get(c) ?? cells.set(c, { p: [], n: [] }).get(c); (r.y ? o.p : o.n).push(f(r)); } let w = 0, a = 0; for (const o of cells.values()) { if (o.p.length < minEach || o.n.length < minEach) continue; a += aucPN(o.p, o.n) * o.p.length; w += o.p.length; } return w ? a / w : null; };
function boot(rs, f, cellOf, minEach = 2) { const rnd = rngFor(nextSeed()), ids = [...new Set(rs.map((r) => r.block))], by = new Map(ids.map((b) => [b, []])); for (const r of rs) by.get(r.block).push(r); const xs = [];
  for (let b = 0; b < Bn; b++) { const x = []; for (let k = 0; k < ids.length; k++) x.push(...by.get(ids[Math.floor(rnd() * ids.length)])); const v = cellAuc(x, f, cellOf, minEach); if (v != null) xs.push(v); } return { point: round(cellAuc(rs, f, cellOf, minEach)), lo: round(quantile(xs, 0.025)), hi: round(quantile(xs, 0.975)) }; }
const OUT = { module: "eval/law/provisional/attack-ablscope-1-slot-ircB-c4plus/attack-ac-followup.mjs", rule: "ablscope-1-slot-ircB-c4plus", B: Bn, rows: { names: posRows.length, natural: natRows.length } };

// ── F1 day-adjusted natural AUC and weighted equal-false-alarm comparison ───────────────────────────────────────────────
const dayCell = (r) => `${r.doc}|${r.stratum}`, all = [...posRows, ...natRows];
OUT.F1 = { auc: {} };
for (const [k, f] of Object.entries(F)) { const a = cellAuc(all, f, dayCell), dir = a >= 0.5 ? 1 : -1, bb = boot(all, (r) => dir * f(r), dayCell); OUT.F1.auc[k] = { aucDirFree: bb.point, ci: [bb.lo, bb.hi], direction: dir === 1 ? "higher=name" : "lower=name" }; }
OUT.F1.positionVoidCheck = { pos: OUT.F1.auc.pos.aucDirFree, idx: OUT.F1.auc.idx.aucDirFree, inBand: OUT.F1.auc.pos.aucDirFree <= 0.55 && OUT.F1.auc.idx.aucDirFree <= 0.55 };
{ const cellsP = new Map(), cellsN = new Map(); for (const r of posRows) (cellsP.get(dayCell(r)) ?? cellsP.set(dayCell(r), []).get(dayCell(r))).push(r); for (const r of natRows) (cellsN.get(dayCell(r)) ?? cellsN.set(dayCell(r), []).get(dayCell(r))).push(r);
  const eq = {};
  for (const [name, f] of [["rinit", F.rinit], ["cInit", F.cInit]]) { const per = {}; let tpR = 0, tpS = 0, np = 0;
    for (const st of ST4) { const P_ = [], N_ = []; for (const [c, ps] of cellsP) { if (!c.endsWith(`|${st}`)) continue; const ns = cellsN.get(c); if (!ns) continue; P_.push(...ps); const w = ps.length / ns.length; for (const r of ns) N_.push({ r, w }); }
      if (!P_.length) continue; const W = N_.reduce((a, x) => a + x.w, 0), fprOf = (g) => N_.filter((x) => g(x.r)).reduce((a, x) => a + x.w, 0) / W, fS = fprOf((r) => r.S >= 1), tS = P_.filter((r) => r.S >= 1).length / P_.length;
      const ths = [...new Set([...P_, ...N_.map((x) => x.r)].map(f))].filter((v) => v > 0).sort((a, b) => a - b); let best = Infinity; for (const th of ths) if (fprOf((r) => f(r) >= th) <= fS) { best = th; break; }
      const tR = Number.isFinite(best) ? P_.filter((r) => f(r) >= best).length / P_.length : 0, fR = Number.isFinite(best) ? fprOf((r) => f(r) >= best) : 0; per[st] = { names: P_.length, naturalWeightedRows: N_.length, fprS: round(fS, 4), sensS: round(tS), tau: Number.isFinite(best) ? round(best, 3) : null, fprRival: round(fR, 4), sensRival: round(tR) }; tpR += tR * P_.length; tpS += tS * P_.length; np += P_.length; }
    eq[name] = { perStratum: per, pooledSensRival: round(tpR / np), pooledSensS: round(tpS / np), rivalAtLeastSMinus002: tpR / np >= tpS / np - 0.02 }; }
  OUT.F1.equalFalseAlarmWeighted = eq; }

// ── F2 recency decomposition ───────────────────────────────────────────────────────────────────────────────────────────
const bin16 = (r) => (r.last16 === 0 ? "l0" : r.last16 === 1 ? "l1" : r.last16 <= 3 ? "l2_3" : "l4p");
OUT.F2 = { bins: {} };
for (const b of ["l0", "l1", "l2_3", "l4p"]) { const P_ = posRows.filter((r) => bin16(r) === b), N_ = natRows.filter((r) => bin16(r) === b), rr = [...P_, ...N_], bb = P_.length >= 2 && N_.length >= 2 ? boot(rr, S, dayCell) : { point: null, lo: null, hi: null };
  OUT.F2.bins[b] = { names: P_.length, natural: N_.length, sensS: P_.length ? round(P_.filter((r) => r.S >= 1).length / P_.length) : null, fprS: N_.length ? round(N_.filter((r) => r.S >= 1).length / N_.length, 4) : null, aucDayStratumCells: bb.point, ci: [bb.lo, bb.hi],
    sensRinit50: P_.length ? round(P_.filter((r) => r.rinit >= 0.5).length / P_.length) : null, fprRinit50: N_.length ? round(N_.filter((r) => r.rinit >= 0.5).length / N_.length, 4) : null }; }
{ const b = OUT.F2.bins, ok = (x) => x.names >= 20 && x.natural >= 20, live = Object.values(b).filter(ok);
  OUT.F2.verdict = { recencyBorne: b.l0.aucDayStratumCells != null && b.l4p.aucDayStratumCells != null && b.l0.aucDayStratumCells <= 0.58 && b.l4p.aucDayStratumCells >= 0.70, recencyFree: live.length > 0 && live.every((x) => x.aucDayStratumCells >= 0.62), sensL0: b.l0.sensS, sensL4p: b.l4p.sensS }; }

// ── F3 sensitivity gradient: names flagged by (c stratum) x (rinit zone) ────────────────────────────────────────────
OUT.F3 = {};
for (const st of ST4) for (const z of ["rinit<0.5", "rinit>=0.5"]) { const P_ = posRows.filter((r) => r.stratum === st && (z === "rinit>=0.5" ? r.rinit >= 0.5 : r.rinit < 0.5)), N_ = natRows.filter((r) => r.stratum === st && (z === "rinit>=0.5" ? r.rinit >= 0.5 : r.rinit < 0.5));
  OUT.F3[`${st}|${z}`] = { names: P_.length, namesFlagged: P_.length ? round(P_.filter((r) => r.S >= 1).length / P_.length) : null, natural: N_.length, naturalFlagged: N_.length ? round(N_.filter((r) => r.S >= 1).length / N_.length, 4) : null }; }
const hdr = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0];
OUT.headerSha256 = createHash("sha256").update(hdr).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-ac-followup.json"), JSON.stringify(OUT, null, 1));
console.log(JSON.stringify(OUT, null, 1));
