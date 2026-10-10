// attack-C.mjs: ATTACK C (count rival / same-row controls) on rule R1-first-left-fwc32.   modes: collect w1|w2 OUT.json | summary W1.json W2.json OUT.json
//   run:  NAME_COMPANY_PAIRBLOCK=1 node attack-C.mjs collect w1 results/C.w1.json   (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen: the rule JSON, the confirmer's scripts and per-language window-1/window-2 tables (including its shuffled-stream AUC, which is NOT on the same rows as the real AUC: the shuffle re-matches pairs), the timing
//   probe of attack-A (two languages). Attack A's full results were NOT yet read when this header was written (its collect jobs were still running). A TIMING PROBE of this file on one language (dan, w1) was printed before the full run: LEFT 0.664, SENTCOMP 0.495, DOCCOMP 0.517, S2 0.630, RARE8 0.561, L34 0.568, RIGHT 0.581 (405 pairs, means of 5 draws).
//   No other number of this file has been seen.
// QUESTION. Does a cheaper observable, or a company-destroying control evaluated on the SAME matched rows, reproduce the LEFT probe's AUC within 0.03 (the SESOI)? Rows = pairsX default key, split rng, R = 5 draws averaged
//   (pair-sampling noise moves a 74-pair language by 0.1; see attack-A header). Every arm is scored on identical rows of the same draw.
// ARMS (same learner/CV as the probe unless "fixed"). LEFT = one-hot rank bins of left1+left2 (the rule's probe). FIXED scores, paired AUC (ties 0.5): S1 = bin(L1); S2 = bin(L1)+bin(L2); RARE_k = 1[bin(L1) >= k] for k in {5, 8, 10}
//   (cheapest rival: "the left neighbour is a rare form"; direction fixed: higher = name). SAME-ROW CONTROLS (company destroyed on the SAME target tokens): SENTCOMP = two random tokens of the same sentence at distance >= 3 from the
//   target replace left1/left2 (sentence composition without adjacency); DOCCOMP = two random tokens of the whole stream (pure background; must be about 0.5); L34 = tokens at distances 3 and 4 to the left (adjacency decay);
//   RIGHT = right1+right2 (other side); RIVALS = confirmer's POSITION+CHARLEN+FREQ; FINE = exact sentence index / sentence length / character length / count. BEYOND = AUC(LEFT+FINE) - AUC(FINE).
// ELIGIBLE: >= 60 pairs (>= 3 of 5 draws) and POSITION in [0.45, 0.55]; cmn-hans excluded.
// DECISIONS (fixed now; they can only be tightened). Zones: clean = FWC32 >= 0.28, deaf = FWC32 < 0.24 (the confirmer's cuts). For a rival arm X: "X reproduces LEFT" in a zone iff mean over zone languages of (LEFT - X) < 0.03.
//   C1 (SAME-ROW SHUFFLE): the rule needs LEFT - SENTCOMP >= 0.03 in the clean zone, and SENTCOMP mean <= 0.56 there, else the signal is sentence composition and not adjacency. C2 (CHEAPEST RIVAL): the rule needs LEFT - max(S2, RARE_k) >= 0.03 in the clean zone;
//   else a fixed one-line observable reproduces the probe and the "trained company probe" is not needed. C3 (RIVALS): FINE/RIVALS/FREQ/CHARLEN zone means within [0.47, 0.53] (the matching holds on same rows); BEYOND >= 0.05 clean zone.
//   C4: DOCCOMP zone means within [0.47, 0.53] (sanity of the AUC scale). Language-level counts reported: number of clean-zone languages where LEFT - X < 0.03.
// BLIND PREDICTIONS. C1 holds (LEFT - SENTCOMP >= 0.03): 0.9; SENTCOMP mean 0.52-0.55. C2 holds: 0.55 (S2 is close; RARE_10 may be within 0.03: P(some rival within 0.03) 0.45). C3 holds: 0.85. C4 holds: 0.95. L34 retains about 40% of the LEFT excess over 0.5: 0.5.
//   RIGHT >= LEFT - 0.03 in the clean zone: 0.7 (names have rare neighbours on both sides).
// NOT TESTED: IRC; LATER stratum.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { win1, win2, listWin, rngFor, seedFor, pairsX, cvArm, A, S1r, S2r, pairedScore, bin1, headerSha, round, mean, share, spearman, permRho, inBand, describe } from "./lib-attack.mjs";
const R_DRAWS = 5, oh13 = (n) => { const v = new Array(13).fill(0); v[Math.min(n, 12)] = 1; return v; };
const [mode, a1, a2, a3] = process.argv.slice(2);
function ctxArm(pr, sents, rnd, kind) {
  // returns an arm function row->features where left slots are replaced by control tokens (same target rows)
  const bins = pr.bins, binOf = (w) => bins.get(w) ?? 11, allTok = sents.flat(), memo = new Map();
  return (r) => {
    const key = r.pairId * 2 + r.y; if (!memo.has(key)) {
      const sent = sents[r.s], i = r.i, picks = [];
      if (kind === "SENTCOMP") { const cand = []; for (let j = 0; j < sent.length; j++) if (Math.abs(j - i) >= 3) cand.push(j); for (let t = 0; t < 2; t++) { if (cand.length) { const k = Math.floor(rnd() * cand.length); picks.push(binOf(sent[cand[k]])); cand.splice(k, 1); } else picks.push(12); } }
      else { for (let t = 0; t < 2; t++) picks.push(binOf(allTok[Math.floor(rnd() * allTok.length)])); }
      memo.set(key, [...oh13(picks[0]), ...oh13(picks[1])]);
    } return memo.get(key);
  };
}
function oneDraw(stem, w, tagw, k) {
  const sents = w.sents, upos = w.upos, pr = pairsX(sents, upos, {}, { P: rngFor(seedFor("attack-R1", stem, "P" + tagw + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "NC" + tagw + "#" + k)) });
  const r = { pairs: pr.pairs }; if (pr.pairs < 60) return r; const rows = pr.rows;
  r.LEFT = cvArm(rows, A.LEFT); r.POSITION = cvArm(rows, A.POSITION); r.RIGHT = cvArm(rows, A.RIGHT); r.L34 = cvArm(rows, A.L34); r.L1only = cvArm(rows, A.L1only);
  r.RIVALS = cvArm(rows, (x) => [...x.f.POS, ...x.f.CHAR, ...x.f.FREQ]); r.CHARLEN = cvArm(rows, A.CHARLEN); r.FREQ = cvArm(rows, A.FREQ);
  r.FINE = cvArm(rows, A.FINE); r.BEYOND = cvArm(rows, (x) => [...A.LEFT(x), ...A.FINE(x)]);
  r.S1 = pairedScore(rows, S1r); r.S2 = pairedScore(rows, S2r); for (const t of [5, 8, 10]) r["RARE" + t] = pairedScore(rows, (x) => (bin1(x.f.L1) >= t ? 1 : 0));
  r.SENTCOMP = cvArm(rows, ctxArm(pr, sents, rngFor(seedFor("attack-R1", stem, "SC" + tagw + "#" + k)), "SENTCOMP")); r.DOCCOMP = cvArm(rows, ctxArm(pr, sents, rngFor(seedFor("attack-R1", stem, "DC" + tagw + "#" + k)), "DOCCOMP"));
  return r;
}
if (mode === "collect") {
  const wk = a1, stems = listWin(wk === "w1" ? "windows" : "windows2").filter((s) => !process.env.ONLY || process.env.ONLY.split(",").includes(s)), R = { headerSha256: headerSha(import.meta.url), window: wk, rows: [] };
  for (const stem of stems) {
    const w = wk === "w1" ? win1(stem) : win2(stem), d = describe(w.sents), row = { name: stem, fwc32: round(d.fwc32), tokens: d.tokens };
    try { const ds = []; for (let k = 0; k < R_DRAWS; k++) ds.push(oneDraw(stem, w, wk === "w1" ? "" : "-w2", k)); const live = ds.filter((d) => d.LEFT != null); row.pairs = round(mean(ds.map((d) => d.pairs)), 1); row.thin = live.length < 3;
      if (!row.thin) for (const key of Object.keys(live[0])) if (key !== "pairs") row[key] = round(mean(live.map((d) => d[key]))); } catch (e) { row.error = String(e).slice(0, 150); }
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, "fwc", row.fwc32, "pairs", row.pairs, "LEFT", row.LEFT ?? "-", "SENT", row.SENTCOMP ?? "-", "DOC", row.DOCCOMP ?? "-", "S2", row.S2 ?? "-", "RARE8", row.RARE8 ?? "-", "L34", row.L34 ?? "-", "R", row.RIGHT ?? "-");
  }
  console.log("collected", wk, R.rows.length);
}
if (mode === "summary") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), W1 = rd(a1), W2 = rd(a2), out = { headerSha256: headerSha(import.meta.url), zones: {} };
  const units = [...W1.rows.map((r) => ({ ...r, win: "w1" })), ...W2.rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.name !== "cmn-hans" && !r.error && !r.thin && inBand(r.POSITION));
  const ARMS_ = ["LEFT", "POSITION", "RIGHT", "L34", "L1only", "RIVALS", "CHARLEN", "FREQ", "FINE", "BEYOND", "S1", "S2", "RARE5", "RARE8", "RARE10", "SENTCOMP", "DOCCOMP"];
  const zoneDefs = { clean: (u) => u.fwc32 >= 0.28, mid: (u) => u.fwc32 >= 0.24 && u.fwc32 < 0.28, deaf: (u) => u.fwc32 < 0.24, all: () => true };
  const sets = { pooled: units, w1: units.filter((u) => u.win === "w1"), w2: units.filter((u) => u.win === "w2") };
  out.n = Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length]));
  for (const [sn, us] of Object.entries(sets)) { out.zones[sn] = {}; for (const [zn, f] of Object.entries(zoneDefs)) { const z = us.filter(f); out.zones[sn][zn] = { n: z.length, ...Object.fromEntries(ARMS_.map((a) => [a, round(mean(z.map((u) => u[a])))])) }; } }
  const gaps = {}; for (const [zn, f] of Object.entries(zoneDefs)) { const z = units.filter(f); gaps[zn] = { n: z.length }; for (const a of ["SENTCOMP", "DOCCOMP", "S2", "S1", "RARE5", "RARE8", "RARE10", "RIGHT", "L34", "L1only", "FINE", "RIVALS"]) { const d = z.map((u) => u.LEFT - u[a]); gaps[zn][a] = { meanGap: round(mean(d)), nWithin003: d.filter((x) => x < 0.03).length }; } const best = z.map((u) => u.LEFT - Math.max(u.S2, u.RARE5, u.RARE8, u.RARE10)); gaps[zn].vsBestFixed = { meanGap: round(mean(best)), nWithin003: best.filter((x) => x < 0.03).length }; }
  out.gaps = gaps;
  const clean = units.filter(zoneDefs.clean), c1 = gaps.clean.SENTCOMP.meanGap >= 0.03 && out.zones.pooled.clean.SENTCOMP <= 0.56, c2 = gaps.clean.vsBestFixed.meanGap >= 0.03, inb = (x) => x >= 0.47 && x <= 0.53;
  const c3 = ["FINE", "RIVALS", "FREQ", "CHARLEN"].every((a) => ["clean", "deaf", "all"].every((z) => inb(out.zones.pooled[z][a]))) && out.zones.pooled.clean.BEYOND - out.zones.pooled.clean.FINE >= 0.05, c4 = ["clean", "deaf", "all"].every((z) => inb(out.zones.pooled[z].DOCCOMP));
  out.decisions = { C1_sameRowShuffle: c1, C2_cheapestRival: c2, C3_rivalsAndMatching: c3, C4_docBackground: c4, cleanN: clean.length };
  // gradient of each arm with FWC32 (does the cheap rival reproduce the SCOPE too?)
  out.gradient = {}; for (const a of ["LEFT", "SENTCOMP", "S2", "RARE8", "RIGHT", "L34", "FINE"]) { const pm = permRho(units.map((u) => u.fwc32), units.map((u) => u[a]), 2000); out.gradient[a] = { rho: round(pm.rho, 3), p: round(pm.p, 4) }; }
  fs.writeFileSync(a3, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ n: out.n, decisions: out.decisions, zonesPooled: out.zones.pooled, gaps: Object.fromEntries(Object.entries(gaps).map(([z, g]) => [z, Object.fromEntries(Object.entries(g).map(([a, v]) => [a, v.meanGap ?? v]))])), gradient: out.gradient }, null, 1));
}
