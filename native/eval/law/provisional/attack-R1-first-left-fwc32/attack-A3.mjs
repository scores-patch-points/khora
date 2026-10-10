// attack-A3.mjs: ATTACK A3 (causal reading-time ranks) on rule R1-first-left-fwc32.   modes: collect w1|w2 OUT.json | summary W1.json W2.json OUT.json
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-A3.mjs collect w1 results/A3.w1.json     (never pass "run" as first argument)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen: attacks A, A2, B, C, D, E, E2, F, G and verify (see their headers), E3 collection running (no E3 result read). A TIMING PROBE on one language (nob, w1) was printed before the full run: V0t 0.7035, V7 0.6986 (600 pairs; prefix FWC32 0.399 vs window 0.357). NOT seen: any other number of this file. Code check only: sanity.mjs still reproduces the confirmer's rows exactly after the lib change.
// QUESTION. The rule says its signal is available at READING time (first mention, "causal"), but the frequency-rank bins of the left neighbours are computed on the WHOLE stream (including text after the target). A reader at the first mention of a form only has the prefix.
//   V7 recomputes the rank bins from the PREFIX only: snapshots of the stream's rank bins are taken every 250 tokens, a target at token index t uses the snapshot built from tokens [0, 250 * floor(t/250)) (a neighbour not yet seen is bin 11, rare); targets (both classes) with t < 1000 are dropped
//   (the prefix would be too short); hashed tie-break. V0t = identical rows and rule but whole-stream ranks (hashed tie-break), also restricted to t >= 1000: the paired baseline. Both: default matching key, split rng, 5 pair draws, LEFT probe and S2.
// DECISIONS (fixed now; language-windows pooled over w1 and w2; eligible = >= 60 pairs and POSITION in [0.45, 0.55]). CAUSAL SURVIVES iff clean-zone (FWC32 >= 0.28, FWC32 of the whole window as the scope variable) mean AUC(V7) >= AUC(V0t) - 0.03 and Spearman(FWC32, AUC(V7)) >= 0.40 (p <= 0.05, B = 2000)
//   and clean-zone audible share >= 0.60. NARROWED if the AUC drop is in (0.03, 0.06] or the share falls under 0.60; FALLS_CAUSAL otherwise. The scope variable is also evaluated causally: FWC32 computed on the first 1000 tokens only (FWC32 of the prefix) vs the window: Spearman between them and
//   the gradient with the prefix FWC32 (report only).
// BLIND PREDICTIONS. V7 survives: 0.70 (drop about 0.015); prefix-FWC32 gradient rho >= 0.55: 0.8.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { win1, win2, listWin, rngFor, seedFor, pairsX, cvArm, A, S2r, pairedScore, headerSha, round, mean, share, permRho, spearman, inBand, describe, fwcK } from "./lib-attack.mjs";
const [mode, a1, a2, a3] = process.argv.slice(2), R_DRAWS = 5, VAR = { V0t: { tie: "hash", causal: { every: 250, minT: 1000, off: true } }, V7: { tie: "hash", causal: { every: 250, minT: 1000 } } };
function rowFor(stem, w, tagw, v) { const ds = []; for (let k = 0; k < R_DRAWS; k++) { const pr = pairsX(w.sents, w.upos, VAR[v], { P: rngFor(seedFor("attack-R1", stem, "PA3" + tagw + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "NA3" + v + tagw + "#" + k)) }); ds.push(pr.pairs >= 60 ? { pairs: pr.pairs, auc: cvArm(pr.rows, A.LEFT), pos: cvArm(pr.rows, A.POSITION), S2: pairedScore(pr.rows, S2r) } : { pairs: pr.pairs }); }
  const live = ds.filter((x) => x.auc != null); const r = { pairs: round(mean(ds.map((x) => x.pairs)), 1), thin: live.length < 3 }; if (!r.thin) for (const k of ["auc", "pos", "S2"]) r[k] = round(mean(live.map((x) => x[k]))); return r; }
if (mode === "collect") {
  const wk = a1, stems = listWin(wk === "w1" ? "windows" : "windows2").filter((s) => s !== "cmn-hans" && (!process.env.ONLY || process.env.ONLY.split(",").includes(s))), R = { headerSha256: headerSha(import.meta.url), window: wk, rows: [] };
  for (const stem of stems) { const w = wk === "w1" ? win1(stem) : win2(stem), d = describe(w.sents), row = { name: stem, fwc32: round(d.fwc32), fwcPrefix: round(fwcK(w.sents.reduce((acc, s) => { if (acc.n < 1000) { acc.s.push(s.slice(0, 1000 - acc.n)); acc.n += s.length; } return acc; }, { s: [], n: 0 }).s, 32)), V: {} };
    for (const v of Object.keys(VAR)) { try { row.V[v] = rowFor(stem, w, wk === "w1" ? "" : "-w2", v); } catch (e) { row.V[v] = { error: String(e).slice(0, 120) }; } }
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, "fwc", row.fwc32, "prefix", row.fwcPrefix, Object.entries(row.V).map(([k, x]) => `${k}:${x.pairs}/${x.auc ?? "-"}`).join(" ")); }
  console.log("collected", wk, R.rows.length);
}
if (mode === "summary") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), units = [...rd(a1).rows.map((r) => ({ ...r, win: "w1" })), ...rd(a2).rows.map((r) => ({ ...r, win: "w2" }))], out = { headerSha256: headerSha(import.meta.url) };
  const el = units.filter((u) => ["V0t", "V7"].every((v) => u.V[v] && !u.V[v].error && !u.V[v].thin && inBand(u.V[v].pos))); out.n = el.length;
  for (const v of ["V0t", "V7"]) { const f = el.map((u) => u.fwc32), a = el.map((u) => u.V[v].auc), pm = permRho(f, a, 2000), cl = el.filter((u) => u.fwc32 >= 0.28), dl = el.filter((u) => u.fwc32 < 0.24); out[v] = { rho: round(pm.rho, 3), p: round(pm.p, 4), nClean: cl.length, cleanMean: round(mean(cl.map((u) => u.V[v].auc))), cleanAudible: round(share(cl, (u) => u.V[v].auc >= 0.6)), nDeaf: dl.length, deafMean: round(mean(dl.map((u) => u.V[v].auc))), cleanS2: round(mean(cl.map((u) => u.V[v].S2))), meanAll: round(mean(a)) }; }
  out.delta = { clean: round(out.V7.cleanMean - out.V0t.cleanMean), deaf: round(out.V7.deafMean - out.V0t.deafMean), pairedClean: round(mean(el.filter((u) => u.fwc32 >= 0.28).map((u) => u.V.V7.auc - u.V.V0t.auc))), cleanS2: round(out.V7.cleanS2 - out.V0t.cleanS2) };
  out.prefixFwc = { rhoPrefixVsWindow: round(spearman(el.map((u) => u.fwc32), el.map((u) => u.fwcPrefix)), 3), gradientPrefix: round(spearman(el.map((u) => u.fwcPrefix), el.map((u) => u.V.V7.auc)), 3), gradientWindow: round(spearman(el.map((u) => u.fwc32), el.map((u) => u.V.V7.auc)), 3) };
  const drop = -out.delta.pairedClean; out.verdict = out.V7.rho >= 0.4 && out.V7.p <= 0.05 && drop <= 0.03 && out.V7.cleanAudible >= 0.6 ? "CAUSAL_SURVIVES" : drop <= 0.06 && out.V7.rho >= 0.4 ? "NARROWED" : "FALLS_CAUSAL";
  fs.writeFileSync(a3, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
