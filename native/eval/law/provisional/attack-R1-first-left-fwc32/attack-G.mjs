// attack-G.mjs: ATTACK G (rival-adjusted company signal; analysis of attack C rows only).   NAME_COMPANY_PAIRBLOCK=1 node attack-G.mjs results/C.w1.json results/C.w2.json OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in the output JSON) ═══
// DISCLOSURE. Seen: attack C summary (pooled zone means: clean LEFT 0.646, FINE 0.546, BEYOND 0.642; deaf LEFT 0.551, FINE 0.553, BEYOND 0.578; mid LEFT 0.588, FINE 0.535, BEYOND 0.592) and the per-language table of attack C (LEFT, FINE, L1only, S2, RIGHT, SENTCOMP),
//   attack F (non-IE gradient on raw-reader streams rho 0.61 with n = 24 language-windows, audible non-IE in the clean zone: mlt only). NOT seen: any per-language or per-clade statistic of BEYOND - FINE.
// QUESTION. Attack C found that a FINE rival (exact sentence index, sentence length, character length, form count, scored on the SAME matched rows) reaches 0.55 in the deaf zone and in several non-IE languages (est 0.61, lzh 0.80, kat 0.61), i.e. the matching key leaves a residual that equals
//   the "weak signal" of the deaf zone. The company signal that the rule is about is the INCREMENT over that rival: INC = AUC(LEFT + FINE) - AUC(FINE) on the same rows (BEYOND - FINE; positive and large only if company adds information the exact-position/length/count features do not carry).
// STATISTICS AND DECISIONS (fixed now; language-windows pooled of w1 and w2, eligible = >= 60 pairs (>= 3 of 5 draws) and POSITION in band, cmn-hans excluded). G1: Spearman(FWC32, INC) >= 0.40, one-sided permutation p <= 0.05 (B = 5000) = the gradient survives rival adjustment.
//   G2: deaf-zone (FWC32 < 0.24) mean INC <= 0.03 = no company signal there beyond rivals (the rule's own "mostly not audible" is then right, and the 0.52-0.58 AUCs of that zone are not company evidence). G3: clean-zone mean INC >= 0.07. G4 (non-IE): among language-windows of the non-IE list
//   (arb heb mlt cmn lzh jpn kor vie ind tur uig fin est hun eus kat tam tel wol) with >= 12 units: Spearman(FWC32, INC) > 0 with p <= 0.10; report the mean INC in their clean zone and deaf zone. G5: share of clean-zone units with INC >= 0.05; share of non-IE clean-zone units with INC >= 0.05.
// BLIND PREDICTIONS. G1 holds (0.85, rho about 0.55); G2 holds (0.70, mean about 0.025); G3 holds (0.85, about 0.095); G4 holds (0.45: n about 30, rho about 0.3); G5 clean 0.80, non-IE clean 0.50.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { rdj, round, mean, share, spearman, permRho, headerSha, inBand } from "./lib-attack.mjs";
const [f1, f2, outf] = process.argv.slice(2), NONIE = new Set("arb heb mlt cmn lzh jpn kor vie ind tur uig fin est hun eus kat tam tel wol".split(" "));
const units = [...rdj(f1).rows.map((r) => ({ ...r, win: "w1" })), ...rdj(f2).rows.map((r) => ({ ...r, win: "w2" }))].filter((r) => r.name !== "cmn-hans" && !r.error && !r.thin && inBand(r.POSITION)).map((r) => ({ ...r, inc: r.BEYOND - r.FINE }));
const out = { headerSha256: headerSha(import.meta.url), n: units.length }, cl = units.filter((u) => u.fwc32 >= 0.28), dl = units.filter((u) => u.fwc32 < 0.24), ml = units.filter((u) => u.fwc32 >= 0.24 && u.fwc32 < 0.28);
const g1 = permRho(units.map((u) => u.fwc32), units.map((u) => u.inc), 5000);
out.G1 = { rho: round(g1.rho, 3), p: round(g1.p, 4), rhoLeftAuc: round(spearman(units.map((u) => u.fwc32), units.map((u) => u.LEFT)), 3), rhoFine: round(spearman(units.map((u) => u.fwc32), units.map((u) => u.FINE)), 3) };
out.G2 = { nDeaf: dl.length, meanIncDeaf: round(mean(dl.map((u) => u.inc))), meanIncMid: round(mean(ml.map((u) => u.inc))), nMid: ml.length };
out.G3 = { nClean: cl.length, meanIncClean: round(mean(cl.map((u) => u.inc))) };
const ni = units.filter((u) => NONIE.has(u.name)), ie = units.filter((u) => !NONIE.has(u.name)), pn = ni.length >= 12 ? permRho(ni.map((u) => u.fwc32), ni.map((u) => u.inc), 5000) : { rho: null, p: null }, pi = permRho(ie.map((u) => u.fwc32), ie.map((u) => u.inc), 5000);
out.G4 = { nNonIE: ni.length, rho: round(pn.rho, 3), p: round(pn.p, 4), nonIEcleanN: ni.filter((u) => u.fwc32 >= 0.28).length, nonIEcleanInc: round(mean(ni.filter((u) => u.fwc32 >= 0.28).map((u) => u.inc))), nonIEdeafN: ni.filter((u) => u.fwc32 < 0.24).length, nonIEdeafInc: round(mean(ni.filter((u) => u.fwc32 < 0.24).map((u) => u.inc))), IE: { n: ie.length, rho: round(pi.rho, 3), p: round(pi.p, 4), cleanInc: round(mean(ie.filter((u) => u.fwc32 >= 0.28).map((u) => u.inc))), deafInc: round(mean(ie.filter((u) => u.fwc32 < 0.24).map((u) => u.inc))) } };
out.G5 = { clean05: round(share(cl, (u) => u.inc >= 0.05)), nonIEclean05: round(share(ni.filter((u) => u.fwc32 >= 0.28), (u) => u.inc >= 0.05)), deaf05: round(share(dl, (u) => u.inc >= 0.05)) };
out.decision = { G1: g1.rho >= 0.4 && g1.p <= 0.05, G2: out.G2.meanIncDeaf <= 0.03, G3: out.G3.meanIncClean >= 0.07, G4: ni.length >= 12 && pn.rho > 0 && pn.p <= 0.1 };
out.perClean = cl.slice().sort((a, b) => a.inc - b.inc).map((u) => `${u.name}:${u.win}:${round(u.fwc32, 2)}:${round(u.inc, 3)}`).join(" ");
fs.writeFileSync(outf, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
