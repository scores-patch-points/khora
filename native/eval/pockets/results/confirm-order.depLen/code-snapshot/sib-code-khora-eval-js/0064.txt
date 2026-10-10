// attack-H.mjs: ATTACK H (DESCRIPTIVE: what is in the left company of first-mention names vs matched nouns?) on rule R1-first-left-fwc32. No gate, no decision threshold; reports shares only.
//   run: NAME_COMPANY_PAIRBLOCK=1 node attack-H.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written 2026-10-07 BEFORE the first run of this file; sha256 of this header is recorded in the output JSON) ═══
// DISCLOSURE. Seen: attacks A, A2, A3 (collect running), B, C, D, E, E2, E3, F, G, verify. NOT seen: the UPOS composition of left neighbours of any class in this stream set.
// DESCRIPTION ONLY. For the V0b matched rows (default key, split rng, one draw, w1 windows, PROPN vs NOUN only: the nominal contrast of attack A V2) of languages grouped by FWC32 zone (clean >= 0.28, deaf < 0.24): the share of rows whose LEFT-1 neighbour has gold UPOS in {DET, ADP, ADJ, NOUN, PROPN, NUM, VERB, AUX, PRON, other, edge}
//   per class, and the mean rank-bin of LEFT-1 per class and UPOS. GOLD UPOS IS USED FOR DESCRIPTION ONLY. Reported alongside: the share of the probe's V0b AUC that remains when rows with PROPN-left are removed (attack A V4: clean 0.647 -> 0.612) and the share of positives with DET-left. No hypothesis is registered;
//   the output is used to word the mechanism remark of the verdict (company = function-word presence/absence before the word and name chains), not to test anything.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import { win1, listWin, rngFor, seedFor, pairsX, headerSha, round, mean, describe } from "./lib-attack.mjs";
const KEYS = ["DET", "ADP", "ADJ", "NOUN", "PROPN", "NUM", "VERB", "AUX", "PRON", "edge", "other"], out = { headerSha256: headerSha(import.meta.url), zones: {} };
const acc = { clean: { P: {}, N: {}, nP: 0, nN: 0, binP: [], binN: [] }, deaf: { P: {}, N: {}, nP: 0, nN: 0, binP: [], binN: [] } };
for (const stem of listWin("windows").filter((s) => s !== "cmn-hans")) {
  const w = win1(stem), f = describe(w.sents).fwc32, z = f >= 0.28 ? "clean" : f < 0.24 ? "deaf" : null; if (!z) continue;
  const pr = pairsX(w.sents, w.upos, { neg: new Set(["NOUN"]) }, { P: rngFor(seedFor("attack-R1", stem, "PH")), N: rngFor(seedFor("attack-R1", stem, "NH")) }); if (pr.pairs < 60) continue;
  const a = acc[z]; for (const r of pr.rows) { const u = r.i >= 1 ? w.upos[r.s][r.i - 1] : "edge", k = KEYS.includes(u) ? u : "other", c = r.y ? "P" : "N"; a[c][k] = (a[c][k] ?? 0) + 1; a["n" + c] += 1; if (r.i >= 1) a["bin" + c].push(r.f.L1.indexOf(1)); }
}
for (const z of ["clean", "deaf"]) { const a = acc[z]; out.zones[z] = { nPos: a.nP, nNeg: a.nN, L1uposShare: Object.fromEntries(KEYS.map((k) => [k, { PROPN: round((a.P[k] ?? 0) / a.nP, 3), NOUN: round((a.N[k] ?? 0) / a.nN, 3) }])), meanBinL1: { PROPN: round(mean(a.binP), 2), NOUN: round(mean(a.binN), 2) } }; }
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
