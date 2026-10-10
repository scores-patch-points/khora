// attack-I.mjs: EXPLORATORY follow-up (not part of the verdict on R1): is there a label-free left-company cue that does NOT depend on FWC32, because name chains (31-35% of first-mention names have a PROPN left neighbour vs 2-5% of nouns, in BOTH zones, attack H) are present everywhere?
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-I.mjs collect w1|w2 OUT.json | summary W1.json W2.json OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen: attacks A..H and E3, A3 (all results). In attack H the gold UPOS shares of left-1 were: clean zone PROPN-left 0.345 (names) vs 0.019 (nouns); deaf zone 0.314 vs 0.048; DET-left 0.096 vs 0.29 (clean) and 0.004 vs 0.043 (deaf). A TIMING PROBE on two w1 languages was printed before the full run: fin (FWC32 0.159) NEW1 0.526, PREVNEW 0.530, S2 0.537; nob (0.357) NEW1 0.614, PREVNEW 0.652, S2 0.668. NOT seen: any other number of this file.
// CANDIDATE LABEL-FREE CUES (fixed scores, direction fixed in advance: higher = name; paired AUC with ties 0.5 on the V0b matched rows of attack A, PROPN vs NOUN/VERB/ADJ as the rule, 5 draws). No label, case, POS, list. All causal (use only text before the target):
//   NEW1 = 1[the left-1 neighbour is, at its position, the FIRST occurrence of its form in the stream]; NEW12 = NEW1 + NEW2 (same for left-2); CHAIN2 = 1[left-1 and left-2 are both first occurrences]; PREVNEW = number of first occurrences among the 3 tokens to the left (0..3).
//   Reference: S2 (rank-bin sum; the rule's fixed score). Gold control only for description: the share of NEW1 rows whose left-1 is gold PROPN.
// DECISIONS (fixed now; language-windows pooled over w1 and w2; eligible = >= 60 pairs, POSITION in band; zones clean >= 0.28 / deaf < 0.24). A cue is "FWC32-free and audible" iff its mean paired AUC in the DEAF zone is >= 0.55 AND its Spearman(FWC32, AUC) <= 0.30 (weak gradient) AND the clean-zone mean >= 0.55.
//   A cue "beats S2 in the deaf zone" iff deaf-zone mean AUC(cue) - AUC(S2) >= 0.03.
// BLIND PREDICTIONS. NEW1 deaf-zone AUC about 0.55 (P(>= 0.55) = 0.55); gradient rho <= 0.30: 0.5; beats S2 in the deaf zone: 0.7. PREVNEW is the strongest of the four: 0.5.
// NOT TESTED: whether the cue is name-specific (attack D says the left company carries category information in general); IRC; LATER.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { win1, win2, listWin, rngFor, seedFor, pairsX, pairedScore, S2r, headerSha, round, mean, share, spearman, permRho, inBand, describe } from "./lib-attack.mjs";
const [mode, a1, a2, a3] = process.argv.slice(2), R_DRAWS = 5;
function oneDraw(stem, w, tagw, k, firstAt) {
  const pr = pairsX(w.sents, w.upos, {}, { P: rngFor(seedFor("attack-R1", stem, "PI" + tagw + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "NI" + tagw + "#" + k)) }); if (pr.pairs < 60) return { pairs: pr.pairs };
  const isNew = (r, d) => { const j = r.i - d; return j >= 0 && firstAt.get(w.sents[r.s][j]) === r.s + ":" + j ? 1 : 0; };
  const sc = { NEW1: (r) => isNew(r, 1), NEW12: (r) => isNew(r, 1) + isNew(r, 2), CHAIN2: (r) => isNew(r, 1) * isNew(r, 2), PREVNEW: (r) => isNew(r, 1) + isNew(r, 2) + isNew(r, 3), S2: S2r };
  const o = { pairs: pr.pairs }; for (const [k2, fn] of Object.entries(sc)) o[k2] = pairedScore(pr.rows, fn); const pos = pr.rows.filter((r) => r.y === 1 && isNew(r, 1)); o.new1Propn = pos.length ? pos.filter((r) => w.upos[r.s][r.i - 1] === "PROPN").length / pos.length : null; return o;
}
if (mode === "collect") {
  const wk = a1, stems = listWin(wk === "w1" ? "windows" : "windows2").filter((s) => s !== "cmn-hans" && (!process.env.ONLY || process.env.ONLY.split(",").includes(s))), R = { headerSha256: headerSha(import.meta.url), window: wk, rows: [] };
  for (const stem of stems) { const w = wk === "w1" ? win1(stem) : win2(stem), d = describe(w.sents), firstAt = new Map(); w.sents.forEach((s, si) => s.forEach((x, j) => { if (!firstAt.has(x)) firstAt.set(x, si + ":" + j); }));
    const ds = []; for (let k = 0; k < R_DRAWS; k++) ds.push(oneDraw(stem, w, wk === "w1" ? "" : "-w2", k, firstAt)); const live = ds.filter((x) => x.NEW1 != null), row = { name: stem, fwc32: round(d.fwc32), pairs: round(mean(ds.map((x) => x.pairs)), 1), thin: live.length < 3 };
    if (!row.thin) for (const k of Object.keys(live[0])) if (k !== "pairs") row[k] = round(mean(live.map((x) => x[k]).filter((x) => x != null))); R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, "fwc", row.fwc32, "pairs", row.pairs, "NEW1", row.NEW1 ?? "-", "PREVNEW", row.PREVNEW ?? "-", "S2", row.S2 ?? "-"); }
  console.log("collected", wk, R.rows.length);
}
if (mode === "summary") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), out = { headerSha256: headerSha(import.meta.url), zones: {} }, units = [...rd(a1).rows, ...rd(a2).rows].filter((r) => !r.thin && r.NEW1 != null && r.name !== "cmn-hans");
  // POSITION control is not stored for paired scores; matching is the same as attack A (V0b), whose POSITION arm is in band for the same stems: use attack A eligibility
  const A1 = rd(a1.replace("I.", "A.").replace("results/I", "results/A")), A2 = rd(a2.replace("I.", "A.").replace("results/I", "results/A")), okA = (wk, name) => { const v = (wk === 1 ? A1 : A2).rows.find((x) => x.name === name)?.V?.V0b; return v && !v.thin && inBand(v.pos); };
  const U = [...rd(a1).rows.map((r) => ({ ...r, wk: 1 })), ...rd(a2).rows.map((r) => ({ ...r, wk: 2 }))].filter((r) => !r.thin && r.NEW1 != null && r.name !== "cmn-hans" && okA(r.wk, r.name)); out.n = U.length;
  const zs = { clean: (u) => u.fwc32 >= 0.28, mid: (u) => u.fwc32 >= 0.24 && u.fwc32 < 0.28, deaf: (u) => u.fwc32 < 0.24 }; for (const [zn, f] of Object.entries(zs)) { const z = U.filter(f); out.zones[zn] = { n: z.length, ...Object.fromEntries(["NEW1", "NEW12", "CHAIN2", "PREVNEW", "S2"].map((k) => [k, round(mean(z.map((u) => u[k])))])), new1Propn: round(mean(z.map((u) => u.new1Propn))) }; }
  out.gradient = Object.fromEntries(["NEW1", "NEW12", "CHAIN2", "PREVNEW", "S2"].map((k) => { const p = permRho(U.map((u) => u.fwc32), U.map((u) => u[k]), 2000); return [k, { rho: round(p.rho, 3), p: round(p.p, 4) }]; }));
  out.decision = Object.fromEntries(["NEW1", "NEW12", "CHAIN2", "PREVNEW"].map((k) => [k, { audibleFree: out.zones.deaf[k] >= 0.55 && out.gradient[k].rho <= 0.3 && out.zones.clean[k] >= 0.55, beatsS2Deaf: out.zones.deaf[k] - out.zones.deaf.S2 >= 0.03 }]));
  fs.writeFileSync(a3, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
