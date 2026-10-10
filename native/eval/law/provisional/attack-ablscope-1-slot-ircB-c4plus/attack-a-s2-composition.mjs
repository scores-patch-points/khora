// attack-a-s2-composition.mjs -- POST-HOC DECOMPOSITION of why the strictest matching S2 (330 pairs) lowers the AUC of S_ENTRY to 0.588 in attack A, on rule "ablscope-1-slot-ircB-c4plus".
//   node attack-a-s2-composition.mjs      (same stored reads; writes results/attack-a-s2-composition.json)
// ═══ PRE-REGISTRATION (the sha256 of everything above the END marker goes into the output) ═══
// WRITTEN after attacks A, C and the follow-up were run; BEFORE any statistic of this file. DISCLOSURE: S2 pairs: AUC 0.588 [0.556, 0.630], sensitivity 0.197, specificity 0.979; the S1 pairs on the confirmer's own positives 0.802 (sens 0.614); recency decomposition F2 shows the AUC of S_ENTRY
//   within bins of last16 of 0.69 / 0.70 / 0.77 / 0.81 (day x stratum cells, natural unlabelled), i.e. not recency-borne; attack C4 shows S_ENTRY >= 1 never occurs when rinit < 0.5.
// HYPOTHESIS H (composition): the S2 positives are a matchability-selected subset in which few positives have rinit >= 0.5; within the positives with rinit >= 0.5, the sensitivity of S_ENTRY >= 1 in S2 is within 0.10 of the one in S1 (conf positives), so the S2 drop is a change of
//   the positive population (names that never open a message are the ones for which a strictly matched control exists), not a recency-conditional loss of the signal.
// DECISION: H holds if (share of S2 positives with rinit >= 0.5) <= (the same share in S1 conf positives) - 0.10 AND |sens(S2 | rinit>=0.5) - sens(S1conf | rinit>=0.5)| <= 0.10. If H does not hold, the S2 drop is a genuine loss of signal at strict matching and counts against the rule.
// BLIND PREDICTION: H holds: 0.60.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HERE, CONF, ST4, readMaps, pairsOf, liveBy, stratAuc, round, sEntry, blockOf } from "./lib-a.mjs";
const reads = readMaps([path.join(CONF, "data", "read"), path.join(HERE, "data", "read-a2")]);
const toks = JSON.parse(fs.readFileSync(path.join(HERE, "data", "design-a2.json"), "utf8")).tokens.flatMap((t) => { const rec = reads.get(`${t.doc}|${t.cond}`)?.get(`${t.s}:${t.i}`); return rec ? [{ ...t, S: sEntry(rec.counts), block: blockOf(t) }] : []; });
const OUT = { rule: "ablscope-1-slot-ircB-c4plus", levels: {} }, S = (m) => m.S;
const stat = (ps) => { const hi = ps.filter((x) => x.p.rinit >= 0.5), by = liveBy(hi, ST4); return { pairs: ps.length, shareNamesRinitGe05: round(hi.length / ps.length), sensAll: round(ps.filter((x) => x.p.S >= 1).length / ps.length), sensGivenRinitGe05: hi.length ? round(hi.filter((x) => x.p.S >= 1).length / hi.length) : null,
  fprAll: round(ps.filter((x) => x.n.S >= 1).length / ps.length), pairsRinitGe05: hi.length, aucRinitGe05: Object.values(by).flat().length >= 4 ? round(stratAuc(by, S)) : null, meanLast16Names: round(ps.reduce((a, x) => a + x.p.last16, 0) / ps.length), meanLast16Neg: round(ps.reduce((a, x) => a + x.n.last16, 0) / ps.length) }; };
for (const lv of ["S1", "S2", "S3"]) { const ps = pairsOf(toks, (t) => t.level === lv); OUT.levels[lv] = { all: stat(ps), confPositives: stat(ps.filter((x) => x.p.conf)) }; }
const s1 = OUT.levels.S1.confPositives, s2 = OUT.levels.S2.all;
OUT.H = { shareS2: s2.shareNamesRinitGe05, shareS1conf: s1.shareNamesRinitGe05, sensS2given: s2.sensGivenRinitGe05, sensS1given: s1.sensGivenRinitGe05, holds: s2.shareNamesRinitGe05 <= s1.shareNamesRinitGe05 - 0.10 && Math.abs(s2.sensGivenRinitGe05 - s1.sensGivenRinitGe05) <= 0.10 };
OUT.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(path.join(HERE, "results", "attack-a-s2-composition.json"), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify(OUT, null, 1));
