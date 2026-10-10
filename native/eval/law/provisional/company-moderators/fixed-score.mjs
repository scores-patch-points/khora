// fixed-score.mjs: zero-shot company scores (no fit, no labels at reading time) on the SAME matched pairs the probe used.   NAME_COMPANY_PAIRBLOCK=1 node fixed-score.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// STATUS: DISCOVERY on dev, written after moderators.dev.json / robust.dev.json / frozen.dev.json were seen and BEFORE any fixed score was computed.
// WHY: the user prefers a FIXED score with a direction and threshold fixed in advance over a fitted probe. The moderator rules so far say WHERE a probe can hear names; this asks
//   whether a zero-shot score can too, and whether the same moderator (FWC32) scopes it.
// DISCLOSURE: I know the probe AUCs; I know nothing about any single-slot score on these pairs. No test file is opened.
// OBJECT: the matched pairs of name-company (same seeds: rngFor(seedFor("name-company", stem)), LATER then FIRST; same pairsOf; dev; amended PAIRBLOCK). Each pair = (name occurrence, matched open-class occurrence).
//   Slot code b(.) = frequency-rank bin of the neighbour in the stream's own ranks (0 = commonest ... 11 = rare) or 12 = sentence edge. Observables: ranks and positions only.
// SCORES (3, direction FIXED here: higher score = more name-like; no sign flipping afterwards):
//   S1 = b(left1)            (causal: usable at the first mention)
//   S2 = b(left1) + b(left2) (causal, two slots)
//   S3 = b(left1) + b(left2) + b(right1) + b(right2)  (two tokens of lookahead)
//   Hypothesis behind the direction: a name stands among rarer neighbours (other name parts, rare context) than a matched common/ordinary word, which stands next to function words.
// METRIC: PAIRED AUC = share of pairs in which the name's score exceeds its matched control's (ties 0.5). 50% = nothing. Languages with < 60 pairs in the stratum are thin and excluded.
// TESTS (dev, discovery only): per stratum LATER and FIRST and per score: mean paired AUC over languages; number of languages >= 0.55 and <= 0.45; Spearman(AUC, FWC32);
//   in-scope (FWC32 >= the frozen T60 of that stratum: LATER 0.2795, FIRST 0.2378) mean minus out-of-scope mean. A fixed score is a CANDIDATE RULE only if, in-scope, mean >= 0.56 and
//   >= 70% of in-scope languages are >= 0.55, and the in-scope minus out-of-scope difference >= 0.03; candidates go to confirm.mjs, which fixes their pass/fail before opening test.
// BLIND PREDICTIONS: S1 LATER and FIRST > 0.5 in most languages (names among rarer neighbours); the effect is larger in-scope; mean paired AUC about 0.55-0.58 (a weaker signal than the probe because it uses one fixed direction).
//   I would not be surprised if S2/S3 are not better than S1.
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pairsOf, udDoc } from "../../name-company.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
import { round, mean, headerSha } from "./util.mjs";
import { spearman } from "./stats.mjs";
if (process.env.NAME_COMPANY_PAIRBLOCK !== "1") throw new Error("set NAME_COMPANY_PAIRBLOCK=1");
const HERE = path.dirname(fileURLToPath(import.meta.url)), D = JSON.parse(fs.readFileSync(path.join(HERE, "results/descriptors.dev.json"), "utf8")).languages, T60 = { LATER: 0.2795, FIRST: 0.2378 };
const bin = (oh) => oh.indexOf(1);
export const SCORES = { S1: (f) => bin(f.L1), S2: (f) => bin(f.L1) + bin(f.L2), S3: (f) => bin(f.L1) + bin(f.L2) + bin(f.R1) + bin(f.R2) };
export function pairedAuc(rows, score) { let w = 0, n = 0; for (let k = 0; k + 1 < rows.length; k += 2) { const a = score(rows[k].f), b = score(rows[k + 1].f); w += a > b ? 1 : a === b ? 0.5 : 0; n += 1; } return { auc: w / n, pairs: n }; }
if (process.argv[1]?.endsWith("fixed-score.mjs")) {
  const STEMS = ["eng", "spa", "rus", "cmn", "cmn-hans", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"], per = {};
  for (const stem of STEMS) { const doc = udDoc(stem); if (!doc) continue; const r = rngFor(seedFor("name-company", stem)), pr = { LATER: pairsOf(doc, "LATER", r), FIRST: pairsOf(doc, "FIRST", r) }; per[stem] = {};
    for (const st of ["LATER", "FIRST"]) { per[stem][st] = { pairs: pr[st].pairs, thin: pr[st].pairs < 60 }; if (pr[st].pairs >= 60) for (const [k, fn] of Object.entries(SCORES)) per[stem][st][k] = round(pairedAuc(pr[st].rows, fn).auc); }
    console.error(stem, JSON.stringify(per[stem].LATER), JSON.stringify(per[stem].FIRST)); }
  const R = { headerSha256: headerSha(import.meta.url), per, summary: {} };
  for (const st of ["LATER", "FIRST"]) for (const k of Object.keys(SCORES)) { const ls = STEMS.filter((s) => per[s] && !per[s][st].thin), a = ls.map((s) => per[s][st][k]), fw = ls.map((s) => D[s].FWC32), ins = ls.filter((s) => D[s].FWC32 >= T60[st]), out = ls.filter((s) => D[s].FWC32 < T60[st]);
    R.summary[`${st}_${k}`] = { n: ls.length, mean: round(mean(a)), ge055: a.filter((x) => x >= 0.55).length, le045: a.filter((x) => x <= 0.45).length, rhoWithFWC32: round(spearman(fw, a), 3), inScopeN: ins.length, inScopeMean: round(mean(ins.map((s) => per[s][st][k]))), inScopeGe055: ins.filter((s) => per[s][st][k] >= 0.55).length, outN: out.length, outMean: round(mean(out.map((s) => per[s][st][k]))), diff: round(mean(ins.map((s) => per[s][st][k])) - mean(out.map((s) => per[s][st][k]))) }; }
  fs.writeFileSync(process.argv[2], JSON.stringify(R, null, 1)); console.log(JSON.stringify(R.summary, null, 0));
}
