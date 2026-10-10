// attack-relatedness-romance-set/atk-a.mjs — ATTACK A (LEAKAGE AND CONFOUNDS) on rule "relatedness-romance-set". One run per sample set: NAME_COMPANY_PAIRBLOCK=1 node atk-a.mjs <A|B|C>
//   (never pass "run" as argv[2]; results/A-<set>.json; summary and verdicts by atk-a-sum.mjs, which imports THR from this file)
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen: the rule JSON, the confirmer's cell numbers and post-hoc E2-E4 numbers as given in the task text, the confirmer's and scoper's code (read in full). Run by me before this header, counts and balance only:
//   atk-build.mjs rebuilt the confirmer's windows A/B/C from raw CoNLL-U (text hash identical for every language) and the V0M0 rows byte-identical to the confirmer's cache for every language and set; pair counts of every
//   variant; the matching balance of the coarse key (positives sit later in the stream and are slightly shorter/earlier-in-sentence than their matched negatives; the strict matcher removes it). NOT seen: any AUC of any variant.
// DATA. The confirmer's three fresh UD TRAIN windows A, B, C (30k non-PUNCT tokens per language; the same text, so a result here is a re-test of the same sentences under different observables/matching). FIRST stratum, BOTH arm.
//   Probe = the scoper's (fitProbe: ridge-logistic on the rank-bin slots of left-1/left-2/right-1/right-2), donors = fresh windows of the same set (the confirmer's form P), K=3 donors x 100 pairs, 20 seeded draws, pair-flip q95.
// ATTACK VARIANTS (atk-build.mjs header): tokenisation V0 confirmer / V1 surface (multiword tokens unsplit; the gold treebank split of del=de+el, au=a+le is NOT visible to a reader) / V2 PUNCT kept as tokens (the gold PUNCT
//   deletion is a treebank label) / V3 both; matching M0 name-company coarse key (the confirmer's) / M1 strict (count +-1, chars +-1, index exact <=3 else +-2, sentence length +-2) / M2 M1 + sentence index within +-60;
//   F3 candidates >= 3 characters (the reader's figure floor); R2 candidates whose form occurs >= 2 times in the stream (the reader's recurrence floor). Variants run: V0M0 V0M1 V0M2 V1M0 V2M0 V3M0 V3M1 F3 R2.
// DONOR POOLS for a Romance target T: a = the other Romance languages (cat fra glg ita por ron spa), g = Germanic (afr dan deu eng nld nob swe), o = everything not Romance and not Germanic, e = everything not Romance
//   (the rule's own comparator). For a Germanic target the roles of Romance and Germanic swap. Pools use the languages with >= 100 pairs in that variant and set; targets need >= 60 pairs.
// TESTS (thresholds fixed here; the rule's own pass criteria; per language the three sets are averaged before the language bootstrap):
//   A1 SURVIVAL. A target-set passes iff a >= 0.60 and a > its pair-flip q95 and a - e >= 0.05. A variant SURVIVES iff, over primary targets (cat fra ita por spa, eligible), pooled mean(a - e) >= 0.06 AND the pass rate is
//      >= 70% in >= 2 of 3 sets AND the mean POSITION control of a is in [0.45, 0.55] AND the mean shuffled-sentence-target AUC (built for V0M0 V0M1 V3M0 V3M1 only) is <= 0.55. A variant FALLS iff pooled mean(a - e) < 0.03.
//      In between it is NARROWED. V0M0 must replicate the confirmer (pooled a - e within 0.03 of 0.09, a within 0.03 of 0.68), else the pipeline is wrong and nothing else is reported.
//   A2 COMPARATOR (relatedness beyond typological neighbours). In V0M0, the rule's relatedness reading SURVIVES iff pooled mean(a - g) >= 0.05 with a language-bootstrap lower bound > 0 and >= 70% of target-sets have
//      a - g >= 0.05; it FALLS iff pooled mean(a - g) < 0.03.
//   A3 TOKENISATION SENSITIVITY. |mean(a - e)[V1M0 or V2M0 or V3M0] - mean(a - e)[V0M0]| > 0.02 is reported as tokenisation-dependent (gold-treebank format effect).
//   A4 RECIPROCITY (descriptive): Germanic targets with Germanic donors (a), Romance donors (g) and the rest (e = not Germanic), same variants.
// BLIND PREDICTIONS. V0M0: a 0.68 (0.65-0.71), e 0.59 (0.57-0.61), a - e +0.09 (0.07-0.11). V0M1: a - e +0.085 (0.06-0.105); V0M2 +0.08 (0.05-0.10); V1M0 +0.08 (0.05-0.10), a shifts by <= 0.02; V2M0 a +0.02
//   higher than V0M0 (punctuation next to names is informative), a - e +0.085; V3M0 +0.08; V3M1 +0.075 (0.04-0.10); F3 +0.09; R2 a 0.64 (0.60-0.68), a - e +0.07 (0.04-0.10). A2: mean(a - g) = +0.03 (0.01-0.06), so the
//   relatedness reading probably FALLS or is NARROWED to a typological (Western European) neighbourhood. At least 2 variants SURVIVE. Germanic targets: a - e smaller than Romance's (+0.04).
// WHAT WOULD MAKE ME REPORT A SUCCESSFUL ATTACK: any of V1M0 V2M0 V3M0 V3M1 V0M1 V0M2 FALLS or loses >= 30% of the effect; or A2 FALLS. Thresholds may be tightened after seeing discovery data, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, round } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { sha256, headerHash } from "../family-vs-relatedness/lib.mjs";

export const VARS = ["V0M0", "V0M1", "V0M2", "V1M0", "V2M0", "V3M0", "V3M1", "F3", "R2"], SHUF = ["V0M0", "V0M1", "V3M0", "V3M1"], PRIMARY = ["cat", "fra", "ita", "por", "spa"];
export const THR = { auc: 0.60, margin: 0.05, survive: 0.06, fall: 0.03, passRate: 0.7, comparator: 0.05, tokShift: 0.02, replicateA: 0.68, replicateDiff: 0.09, tol: 0.03 };
const SELF = fileURLToPath(import.meta.url);
export const setHash = () => headerHash(SELF);
if (process.argv[1] === SELF) {
  const set = process.argv[2]; if (!["A", "B", "C"].includes(set)) throw new Error("usage: NAME_COMPANY_PAIRBLOCK=1 node atk-a.mjs <A|B|C>");
  const out = { set, headerSha256: headerHash(SELF), libSha256: sha256(fs.readFileSync(path.join(HERE, "atk-eval.mjs"), "utf8")), variants: {} }, t0 = Date.now();
  for (const v of VARS) {
    const langs = loadRoster(set, v, STEMS, false, ["BOTH", "POSITION"]), shufs = SHUF.includes(v) ? loadRoster(set, v, [...ROM, ...GER], true, ["BOTH"]) : {}, rec = out.variants[v] = {};
    for (const T of [...ROM, ...GER]) {
      const L = langs[T]; if (!L || L.pairs < 60) { rec[T] = { pairs: L ? L.pairs : 0, thin: true }; continue; }
      const own = ROM.includes(T) ? ROM : GER, other = ROM.includes(T) ? GER : ROM, rest = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s)), tag = (p) => `${set}|${v}|${p}`;
      const a = tripleAuc(T, L, own, langs, ["BOTH", "POSITION"], tag("a"), 20, shufs[T] ?? null, true), g = tripleAuc(T, L, other, langs, ["BOTH"], tag("g")), o = tripleAuc(T, L, rest, langs, ["BOTH"], tag("o")), e = tripleAuc(T, L, [...other, ...rest], langs, ["BOTH"], tag("e"));
      rec[T] = { pairs: L.pairs, balance: L.balance, a: a && { n: a.n, auc: round(a.means.BOTH), pos: round(a.means.POSITION), shuf: round(a.shuf), q95: round(a.q95) }, g: g && { n: g.n, auc: round(g.means.BOTH) }, o: o && { n: o.n, auc: round(o.means.BOTH) }, e: e && { n: e.n, auc: round(e.means.BOTH) } };
    }
    console.error(`${set} ${v} ${PRIMARY.map((t) => `${t}:${rec[t]?.a?.auc}/${rec[t]?.e?.auc}/${rec[t]?.g?.auc}`).join(" ")} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); fs.writeFileSync(path.join(HERE, "results", `A-${set}.json`), JSON.stringify({ ...out, seconds: (Date.now() - t0) / 1000 }, null, 1));
  }
}
