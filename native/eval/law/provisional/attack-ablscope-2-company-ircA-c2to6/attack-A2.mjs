// attack-A2.mjs -- ATTACK A, AMENDMENT A1 (written after attack-A.mjs ran; tightening only). attack-A.mjs pre-registered S_FB with character length FREE (exact c, exact fbin); its pooled controls then came out
//   R_LEN 0.7235 (out of band), so S_FB is VOID under the project's control rule (my design error, not a result about the rule). This file repairs the design: S_FBL1 = exact c, exact fbin, |dlen| <= 1, |ln message-length ratio| <= 0.5.
//   node attack-A2.mjs --stage compute|analyse
// ═══ PRE-REGISTRATION (written BEFORE the first run of this file) ═══
// DISCLOSURE. attack-A.mjs results seen: ladders on confirmer pairs all in band and >= 0.82 (exactC 287 pairs 0.821; exactC+FB 164: 0.857; exactC+FB+LEN 70: 0.859; caliper 30: 0.881); S_FBLEN (exact c, fbin, len; 78 pairs) 0.860 in band;
//   S_FB void (R_LEN 0.72) with AUC 0.827; R_INIT >= -dSelf on every rung. I have NOT computed S_FBL1 pairs or any score on them. Design count for S_FBL1: not run before this header.
// TEST. S_FBL1 on the 23 confirmer days (cap 150 pairs/cell/day, c2/c3/c4_6): SURVIVES iff pairs >= 100, AUC(-dSelf) >= 0.65 with bootstrap (B=1000, day x quartile blocks) lower bound > 0.58, six pooled controls in [0.45, 0.55].
//   FALLS iff AUC < 0.58 or interval includes 0.5. VOID iff controls out of band. Also reported: R_INIT, label-swap permutation q95, AUC inside pairs tied on R_INIT.
// BLIND PREDICTION. AUC in [0.80, 0.88] and controls in band (0.65); R_INIT > -dSelf (0.80).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, headerSha, readJsonl, NEG, strat, boot, perm, perStratum, controlAucs, inBand, round, occOf } from "./lib-atk.mjs";
import { loadIrcDay, indexAndCandidates, pairsStrict, memberLite, IRC_ROOT } from "./lib-strict.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), STAGE = process.argv.includes("--stage") ? process.argv[process.argv.indexOf("--stage") + 1] : "analyse", B = 1000, M = 256;
const D = JSON.parse(fs.readFileSync(path.join(RES, "days-attack.json"), "utf8")), ROWS = path.join(RES, "rows.A2.jsonl"), OUT = path.join(RES, "attack-A2.json");
function compute() {
  fs.writeFileSync(ROWS, "");
  for (const [set, names] of [["conf", D.confEn], ["fresh", D.freshEn]]) for (const n of names) {
    const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M), occ = occOf(doc), lines = [];
    for (const st of ["c2", "c3", "c4_6"]) pairsStrict(cand, doc, { stratum: st, n: 150, tag: "A2", exactLen: true, lenTol: 1, dmMax: 0.5 }).forEach((p, k) => {
      lines.push(JSON.stringify({ id: `${n}#S_FBL1${st}#${k}`, set, doc: n, stratum: st, block: `${n}|q${Math.min(3, Math.floor((4 * p.pos.s) / cand.nMsg))}`, p: memberLite(doc, occ, p.pos, M), n: memberLite(doc, occ, p.neg, M) })); });
    fs.appendFileSync(ROWS, lines.map((l) => l + "\n").join(""));
  }
}
function analyse() {
  const rows = readJsonl(ROWS), res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "A2 strict rematch S_FBL1", headerSha256: SHA, B };
  for (const set of ["conf", "fresh"]) {
    const ps = rows.filter((r) => r.set === set); if (ps.length < 8) { res[set] = { pairs: ps.length }; continue; }
    const f = (q) => strat(q, NEG), bt = boot(ps, f, { B, seed: 41 }), bi = boot(ps, (q) => strat(q, (m) => m.R_INIT), { B, seed: 42 }), pm = perm(ps, f, { B, seed: 43 }), ctl = controlAucs(ps), ti = ps.filter((x) => x.p.R_INIT === x.n.R_INIT);
    res[set] = { pairs: ps.length, days: new Set(ps.map((x) => x.doc)).size, aucNegDSelf: bt.point, ci: [bt.lo, bt.hi], aucRInit: bi.point, ciRInit: [bi.lo, bi.hi], permQ95: pm.q95, perStratum: perStratum(ps, NEG), controls: ctl, controlsInBand: inBand(ctl), tiesOnRInit: { pairs: ti.length, aucNegDSelf: ti.length >= 8 ? round(strat(ti, NEG)) : null } };
  }
  const c = res.conf; res.verdict = c.controlsInBand ? (c.pairs >= 100 && c.aucNegDSelf >= 0.65 && c.ci[0] > 0.58 ? "SURVIVES" : (c.aucNegDSelf < 0.58 || c.ci[0] <= 0.5 ? "FALLS" : "NARROWS")) : "VOID";
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(res.verdict, JSON.stringify(res.conf), JSON.stringify(res.fresh));
}
if (STAGE === "compute" || STAGE === "both") compute();
if (STAGE === "analyse" || STAGE === "both") analyse();
