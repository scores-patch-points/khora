// attack-D.mjs: ATTACK D (specificity: is the FWC32-moderated left-company signal a NAME cue, or the same for any grammatical category?) on rule R1-first-left-fwc32.
//   modes: collect w1|w2 OUT.json | summary W1.json W2.json OUT.json      run:  NAME_COMPANY_PAIRBLOCK=1 node attack-D.mjs collect w1 results/D.w1.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in every output JSON) ═══
// DISCLOSURE. Seen when this header was written: everything in the headers of attack-A, attack-C, attack-B and their results: V1/V1b/V2/V3/V5/V6/V6b survive and V4 (name chain removed) narrows (clean-zone mean 0.647 -> 0.612, S2 0.61 -> 0.50);
//   same-row sentence-composition control 0.505; L1-only 0.62, RIGHT 0.62 in the clean zone; FINE rival 0.546 clean / 0.553 deaf; gradient robust to the multiverse; BUNDLE moderators. A TIMING PROBE of this file on one language (dan, w1, mean of 5 draws, LEFT AUC) printed before the full run: PN 0.648 (391 pairs), PV 0.741, PA 0.774, VN 0.660 (585), AN 0.661 (402), UN 0.581 (66 pairs). NOT seen: any other number of this file.
// QUESTION. The rule says the left-company probe identifies PROPN (names) against matched NOUN/VERB/ADJ, with strength moderated by FWC32. If the same machinery on the same windows separates OTHER categories as well, or better, from matched nouns,
//   and shows the same FWC32 gradient, then the confirmed signal is "grammatical category from function-word company", and "name cue" is an over-reading. This is a SPECIFICITY test; it cannot make the measured AUC wrong, it limits what it is a measure of.
// CONTRASTS (positive class vs negative class, FIRST stratum, default matching key, LEFT probe and FINE rival, 5 pair draws averaged, same eligibility: >= 60 pairs in >= 3 of 5 draws and POSITION in [0.45, 0.55]):
//   PN  PROPN vs NOUN (the rule's contrast restricted to nominal negatives)    PV  PROPN vs VERB    PA  PROPN vs ADJ    VN  VERB vs NOUN    AN  ADJ vs NOUN    UN  NUM vs NOUN (numerals: rare, name-like forms).
// DECISIONS (fixed now). S1: in the clean zone (FWC32 >= 0.28) "PROPN is specifically identified" requires mean AUC(PN) >= mean AUC(VN) + 0.03 AND >= mean AUC(AN) + 0.03; else "NOT SPECIFIC: other categories are at least as identifiable".
//   S2: FWC32 gradient is "name-specific" iff rho(PN) - max(rho(VN), rho(AN)) >= 0.15 (language level, pooled windows); else the moderator is a general property of company-based category inference.
//   S3: PROPN vs VERB and PROPN vs ADJ: report whether PROPN is easier or harder to separate from each than from NOUN (PN); the rule's mixed negatives are then a mixture whose weights decide the headline number.
//   Only languages with eligible rows for ALL of PN, VN, AN enter S1/S2 (paired set); UN and PV/PA are reported on whatever is eligible.
// BLIND PREDICTIONS. S1 NOT SPECIFIC: 0.80 (AUC(VN) clean about 0.72, AUC(AN) about 0.65, AUC(PN) about 0.65). S2 gradient not name-specific: 0.70 (VN gradient rho about 0.6). PV higher than PN: 0.8. UN clean-zone mean above 0.58: 0.5.
// NOT TESTED: UD-external categories (e.g. numerals vs names in chat), mechanism.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { win1, win2, listWin, rngFor, seedFor, pairsX, cvArm, A, headerSha, round, mean, spearman, permRho, inBand, describe } from "./lib-attack.mjs";
const R_DRAWS = 5, S = (...x) => new Set(x);
const CONTRASTS = { PN: [S("PROPN"), S("NOUN")], PV: [S("PROPN"), S("VERB")], PA: [S("PROPN"), S("ADJ")], VN: [S("VERB"), S("NOUN")], AN: [S("ADJ"), S("NOUN")], UN: [S("NUM"), S("NOUN")] };
const [mode, a1, a2, a3] = process.argv.slice(2);
function oneDraw(stem, w, tagw, cn, k) {
  const [pos, neg] = CONTRASTS[cn], pr = pairsX(w.sents, w.upos, { pos, neg }, { P: rngFor(seedFor("attack-R1", stem, "PD" + cn + tagw + "#" + k)), N: rngFor(seedFor("attack-R1", stem, "ND" + cn + tagw + "#" + k)) });
  const r = { pairs: pr.pairs }; if (pr.pairs < 60) return r; r.LEFT = cvArm(pr.rows, A.LEFT); r.POSITION = cvArm(pr.rows, A.POSITION); r.FINE = cvArm(pr.rows, A.FINE); return r;
}
if (mode === "collect") {
  const wk = a1, stems = listWin(wk === "w1" ? "windows" : "windows2").filter((s) => !process.env.ONLY || process.env.ONLY.split(",").includes(s)), R = { headerSha256: headerSha(import.meta.url), window: wk, rows: [] };
  for (const stem of stems) {
    const w = wk === "w1" ? win1(stem) : win2(stem), d = describe(w.sents), row = { name: stem, fwc32: round(d.fwc32), C: {} };
    for (const cn of Object.keys(CONTRASTS)) { try { const ds = []; for (let k = 0; k < R_DRAWS; k++) ds.push(oneDraw(stem, w, wk === "w1" ? "" : "-w2", cn, k)); const live = ds.filter((x) => x.LEFT != null);
      row.C[cn] = { pairs: round(mean(ds.map((x) => x.pairs)), 1), thin: live.length < 3 }; if (!row.C[cn].thin) for (const key of ["LEFT", "POSITION", "FINE"]) row.C[cn][key] = round(mean(live.map((x) => x[key]))); } catch (e) { row.C[cn] = { error: String(e).slice(0, 120) }; } }
    R.rows.push(row); fs.writeFileSync(a2, JSON.stringify(R)); console.error(stem, "fwc", row.fwc32, Object.entries(row.C).map(([k, x]) => `${k}:${x.pairs}/${x.LEFT ?? "-"}`).join(" "));
  }
  console.log("collected", wk, R.rows.length);
}
if (mode === "summary") {
  const rd = (f) => JSON.parse(fs.readFileSync(f, "utf8")), W1 = rd(a1), W2 = rd(a2), out = { headerSha256: headerSha(import.meta.url), zones: {} };
  const units = [...W1.rows.map((r) => ({ ...r, win: "w1" })), ...W2.rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.name !== "cmn-hans");
  const ok = (u, c) => u.C[c] && !u.C[c].error && !u.C[c].thin && inBand(u.C[c].POSITION), CN = Object.keys(CONTRASTS);
  const paired = units.filter((u) => ["PN", "VN", "AN"].every((c) => ok(u, c))); out.pairedN = paired.length;
  const zdef = { clean: (u) => u.fwc32 >= 0.28, mid: (u) => u.fwc32 >= 0.24 && u.fwc32 < 0.28, deaf: (u) => u.fwc32 < 0.24 };
  for (const [zn, f] of Object.entries(zdef)) { out.zones[zn] = { nPaired: paired.filter(f).length }; for (const c of CN) { const z = units.filter((u) => f(u) && ok(u, c)); out.zones[zn][c] = { n: z.length, LEFT: round(mean(z.map((u) => u.C[c].LEFT))), FINE: round(mean(z.map((u) => u.C[c].FINE))), pairs: round(mean(z.map((u) => u.C[c].pairs)), 0) }; } }
  out.gradient = {}; for (const c of CN) { const z = units.filter((u) => ok(u, c)); if (z.length >= 8) { const p = permRho(z.map((u) => u.fwc32), z.map((u) => u.C[c].LEFT), 2000); out.gradient[c] = { n: z.length, rho: round(p.rho, 3), p: round(p.p, 4) }; } }
  out.gradientPaired = {}; for (const c of ["PN", "VN", "AN"]) { const p = permRho(paired.map((u) => u.fwc32), paired.map((u) => u.C[c].LEFT), 2000); out.gradientPaired[c] = { n: paired.length, rho: round(p.rho, 3), p: round(p.p, 4) }; }
  const cl = paired.filter(zdef.clean), m = (c) => mean(cl.map((u) => u.C[c].LEFT));
  out.S1 = { cleanPN: round(m("PN")), cleanVN: round(m("VN")), cleanAN: round(m("AN")), specific: m("PN") >= m("VN") + 0.03 && m("PN") >= m("AN") + 0.03 };
  out.S2 = { rhoPN: out.gradientPaired.PN.rho, rhoVN: out.gradientPaired.VN.rho, rhoAN: out.gradientPaired.AN.rho, nameSpecific: out.gradientPaired.PN.rho - Math.max(out.gradientPaired.VN.rho, out.gradientPaired.AN.rho) >= 0.15 };
  const pv = units.filter((u) => ok(u, "PV") && ok(u, "PN") && zdef.clean(u)), pa = units.filter((u) => ok(u, "PA") && ok(u, "PN") && zdef.clean(u));
  out.S3 = { nPV: pv.length, PV: round(mean(pv.map((u) => u.C.PV.LEFT))), PNonPV: round(mean(pv.map((u) => u.C.PN.LEFT))), nPA: pa.length, PA: round(mean(pa.map((u) => u.C.PA.LEFT))), PNonPA: round(mean(pa.map((u) => u.C.PN.LEFT))) };
  fs.writeFileSync(a3, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
}
