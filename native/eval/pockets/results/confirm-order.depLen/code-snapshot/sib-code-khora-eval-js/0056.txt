// attack-PM-R1-unit-initial-excess/attack-A2-irc-perday.mjs -- ATTACK A2: does the IRC effect survive WITHOUT pooling days (each day its own stream, so day-dispersion is unavailable)? And what do the rivals do there? New file.
// ═══ PRE-REGISTRATION (written 2026-10-07 BEFORE the first run of this file; declared AFTER attacks A, B, C, C2 and the post-hoc IRC check C-irc-day were read) ═══════════════════════════════════════════
// DISCLOSURE. attack C-irc-day.json: in the POOLED 50-day stream the observable daysSeen (number of distinct days a form occurs on) gives AUC 0.892 [0.870,0.913] on the confirmer-style K0 rows against pInitX 0.902, and
//   the within-day span gives 0.384: the span rival of attack C (0.872) is a pooling artefact, but the pooled design lets a document-dispersion count reproduce the effect within 0.03. QUESTION: with each day its own
//   stream (nothing pooled; the reader sees one document), does pInitX keep >= 0.80, and which rivals are still within 0.03?
// DATA. The 50 fresh en days (manifest irc.freshEnAll), one stream per day, gold as ircLoad (= the confirmer's rules; stream identity checked in attack A). Pairs: K0 key (the confirmer's) per day, <= 40 pairs per day,
//   <= 3 per form, pooled over days; clusters = day|form. A second row set at K3 (exact index, unit length, character length, count within tol). FULL and CAUSAL4. Cluster bootstrap B=300.
// OBSERVABLES. pInitX and the rivals of attack C (logn, loc, rec, burst, span (within the day: the stream is the day), invLen, relPos, meanIdx, charLen, pInit): same definitions, same rows.
// VERDICT RULES. pInitX HOLDS per-day if AUC >= 0.80 with CI lower > 0.5 (FULL and CAUSAL4) and >= 200 pairs. A rival REPRODUCES it if AUC(rival) >= AUC(pInitX) - 0.03. 
// BLIND PREDICTIONS. pInitX per-day FULL >= 0.80: 0.85 (point 0.88); loc/burst/span rivals within 0.03: 0.15; relPos/meanIdx/pInit siblings within 0.03: 0.9.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, ircFiles, ircLoad, occsOf, buildPairs, localOf, SPECS, IRC_DEFS, rngFor, seedFor, headerSha, round, mean, quantile, wr, pairAuc, log } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), HDR = headerSha(fileURLToPath(import.meta.url)), RUNG = process.argv[2] ?? "K0", BD = 300;
function feats(o, mode) {
  const P = o.P, oc = P.occ.get(o.w), n = oc.length / 2, k = o.k, js = mode === "FULL" ? Array.from({ length: n }, (_, j) => j) : [k - 4, k - 3, k - 2, k - 1], gj = mode === "FULL" ? js : [...js, k];
  const sU = (j) => oc[2 * j], iU = (j) => oc[2 * j + 1], lU = (j) => P.stream[sU(j)].length; let init = 0, inv = 0, rel = 0, idx = 0;
  for (const j of js) { const len = lU(j), b = iU(j); if (b === 0) init++; inv += 1 / len; rel += len > 1 ? b / (len - 1) : 0; idx += b; }
  const m = js.length, L = localOf(P, o.w, 25); let loc; if (mode === "FULL") loc = L.loc[k]; else { loc = 0; for (const j of js) if (o.s - sU(j) <= 25) loc++; }
  let near = 0, g = 0; for (let t = 1; t < gj.length; t++) { g++; if (sU(gj[t]) - sU(gj[t - 1]) <= 5) near++; }
  const span = mode === "FULL" ? -(sU(n - 1) - sU(0)) / P.stream.length : -(o.s - sU(k - 4)) / P.stream.length;
  return { pInitX: (init - inv) / m, logn: Math.log2(mode === "FULL" ? n : k), loc, rec: -Math.log2(1 + L.dist[k]), burst: g ? near / g : 0, span, invLen: inv / m, relPos: -rel / m, meanIdx: -idx / m, charLen: [...o.w].length, pInit: init / m };
}
const F = ["pInitX", "logn", "loc", "rec", "burst", "span", "invLen", "relPos", "meanIdx", "charLen", "pInit"], out = { hdr: HDR, rung: RUNG };
const days = MAN.irc.freshEnAll.map((x) => x.id), bases = days.map((id) => ircLoad(id, ircFiles([id])));
for (const mode of ["FULL", "CAUSAL4"]) {
  const pairs = []; for (const b of bases) pairs.push(...buildPairs(b.P, occsOf(b.P, b.gold, IRC_DEFS.NK, mode, null, b.name), SPECS[RUNG], rngFor(seedFor(PRE, "A2", b.name, RUNG, mode)), { maxPairs: 40, mode }).pairs);
  const FP = pairs.map(([p]) => feats(p, mode)), FN = pairs.map(([, q]) => feats(q, mode)), cl = pairs.map(([p]) => `${p.name}|${p.w}`), rnd = rngFor(seedFor(PRE, "A2boot", RUNG, mode)), o = { pairs: pairs.length, nDays: new Set(pairs.map(([p]) => p.name)).size, aucs: {} };
  for (const f of F) { const w = pairs.map((_, i) => wr(FP[i][f], FN[i][f])); o.aucs[f] = round(mean(w)); }
  const r = pairAuc(FP.map((x) => x.pInitX), FN.map((x) => x.pInitX), cl, BD, rnd, 0); o.lo = r.lo; o.hi = r.hi; o.rivalsWithin03 = F.filter((f) => f !== "pInitX" && o.aucs[f] >= o.aucs.pInitX - 0.03);
  o.hold = o.pairs >= 200 && o.aucs.pInitX >= 0.8 && o.lo > 0.5; out[mode] = o; log(`${mode} ${JSON.stringify(o)}`);
}
fs.writeFileSync(path.join(HERE, "results", `A2-irc-perday-${RUNG}.json`), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
