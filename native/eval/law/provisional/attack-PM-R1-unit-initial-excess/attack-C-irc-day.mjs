// attack-PM-R1-unit-initial-excess/attack-C-irc-day.mjs -- POST-HOC CHECK of attack C's IRC span rival: is span (0.872 vs pInitX 0.902, diff 0.030 [-0.002,0.064]) an artefact of POOLING 50 days into one stream
// (a nick exists on one day, an ordinary word on every day)? New file.
// ═══ PRE-REGISTRATION (written 2026-10-07 after attack C results were read; DECLARED POST-HOC) ═══════════════════════════════════════════════════════════════════════════════════════════════════
// DISCLOSURE. attack C IRC K0 FULL rows (same seeds are reused here, so the SAME 600 pairs): pInitX 0.902, span 0.872, loc 0.839, burst 0.833, relPos 0.904. WHAT IS COMPUTED. spanDay = -(distance between the first and
//   last mention of the form INSIDE THE EVALUATED MENTION'S OWN DAY)/(number of messages of that day); locDay = other mentions within +-25 messages (identical to loc); daysSeen = -(number of distinct days on which the
//   form occurs) (a pure pooling observable). Same-rows AUC with cluster bootstrap (B=300). RULE: the span rival is a POOLING ARTEFACT if AUC(spanDay) < AUC(pInitX) - 0.03 while AUC(daysSeen) >= 0.70.
// BLIND PREDICTION. spanDay < 0.84 (0.7); daysSeen >= 0.70 (0.6).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRE, MAN, ircFiles, ircLoad, occsOf, buildPairs, SPECS, IRC_DEFS, rngFor, seedFor, headerSha, round, mean, quantile, wr, featuresOf } from "./attack-lib.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), HDR = headerSha(fileURLToPath(import.meta.url));
const b = ircLoad("irc-en-fresh", ircFiles(MAN.irc.freshEnAll.map((x) => x.id))), oc = occsOf(b.P, b.gold, IRC_DEFS.NK, "FULL", null, "irc-en-fresh");
const { pairs } = buildPairs(b.P, oc, SPECS.K0, rngFor(seedFor(PRE, "Cpairs", "irc-en-fresh", "K0", "FULL")), { maxPairs: 600 });
const dayLen = new Map(); b.day.forEach((d) => dayLen.set(d, (dayLen.get(d) ?? 0) + 1));
function f(o) { const oc2 = b.P.occ.get(o.w), d = b.day[o.s], ss = []; const days = new Set(); for (let j = 0; j < oc2.length / 2; j++) { const s = oc2[2 * j]; days.add(b.day[s]); if (b.day[s] === d) ss.push(s); } return { spanDay: -(ss[ss.length - 1] - ss[0]) / dayLen.get(d), daysSeen: -days.size, pInitX: featuresOf(b.P, o.s, o.i, "FULL").pInitX }; }
const FP = pairs.map(([p]) => f(p)), FN = pairs.map(([, q]) => f(q)), cl = pairs.map(([p]) => p.w), out = { hdr: HDR, pairs: pairs.length, aucs: {} };
for (const k of ["pInitX", "spanDay", "daysSeen"]) { const w = pairs.map((_, i) => wr(FP[i][k], FN[i][k])), cid = new Map(); cl.forEach((c, i) => { let a = cid.get(c); if (!a) cid.set(c, (a = [0, 0])); a[0] += w[i]; a[1]++; }); const cs = [...cid.values()], rnd = rngFor(seedFor(PRE, "Cday", k)), bs = []; for (let t = 0; t < 300; t++) { let s = 0, m = 0; for (let u = 0; u < cs.length; u++) { const c = cs[Math.floor(rnd() * cs.length)]; s += c[0]; m += c[1]; } bs.push(s / m); } out.aucs[k] = { auc: round(mean(w)), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)) }; }
out.spanIsPoolingArtefact = out.aucs.spanDay.auc < out.aucs.pInitX.auc - 0.03 && out.aucs.daysSeen.auc >= 0.7;
fs.writeFileSync(path.join(HERE, "results", "C-irc-day.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
