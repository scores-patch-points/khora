// eval/law/provisional/attack-relatedness-sister-dyads/attackE.mjs — ATTACK E (NAME-INTERNAL COMPANY) on rule "relatedness-sister-dyads".
//   NAME_COMPANY_PAIRBLOCK=1 node attackE.mjs      (writes results/attackE.json; needs data/base and data/noprop built by build.mjs; never pass "run" as argv[2])
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═════════════════════════════════════════════════════════════
// DISCLOSURE. attackA-D HAVE RUN (headers in their result files): the sister contrast of IWR+NGm survives every matching/tokenisation/causal variant (+0.067..+0.097), rivals and shuffles do not reproduce it, and the effect grows with
//   donor training size (+0.043 at 25 pairs, +0.078 at 100, +0.087 at 400). Seen BEFORE this header (build diagnostics, no probe): the share of FIRST-mention gold-PROPN tokens that have another gold-PROPN token among their two left
//   neighbours (name-INTERNAL company: the previous token belongs to the same multi-token name): spa 0.46, por 0.49, glg 0.50, cat 0.57, fra 0.36, ita 0.39, dan 0.41, nob 0.43, swe 0.42, deu 0.47, nld 0.41, afr 0.52, hin 0.66, urd 0.63,
//   cmn 0.38, eng 0.37, rus 0.39, heb 0.50; and the pair counts of the filtered configuration (spa 600, por 600, glg 185, cat 574, fra 600, ita 600, dan 600, nob 594, swe 214, deu 600, nld 600, afr 93, hin 491, urd 499).
//   NOT SEEN: any AUC of the filtered configuration.
// QUESTION. A large share (36-66%) of the positives sit directly behind another name token. "Rare left neighbour" is then a trivial cue for the second token of a name and is language-general (it explains the ~0.55 baseline from non-genus
//   donors). Does the SISTER advantage survive when name-internal company is removed, i.e. when neither candidate (positive or matched negative) has a gold-PROPN token among its two left neighbours? (Gold is used only to select the
//   evaluation rows, as everywhere in this lens; no feature changes.)
// CONFIGURATION. data/noprop: coarse matching exactly as the confirmer's (pairsOf), candidates restricted as above, window A FIRST stratum, LEFT arm, single donor 100 pairs, 6 draws, ridge probe, the confirmer's pass definition; donors need >= 100
//   pairs (afr, glg, swe may drop out), targets >= 60; ctrl from the same configuration. Matched-out RIVALS arm and position arm as controls.
// THRESHOLDS (fixed now; may be tightened, never loosened). As attackA: SURVIVES iff IWR+NGm contrast >= 0.05 AND bootstrap lower bound >= 0.03 AND pass fraction >= 0.60 AND mean position AUC in [0.45, 0.55]; ATTENUATED iff not SURVIVES but
//   contrast >= 0.03 and lower bound > 0; FAILS otherwise. The same rule per cluster (IWR, NGm). The attack is SUCCESSFUL iff the verdict is not SURVIVES.
// BLIND PREDICTIONS. PE1 mean sister AUC falls to [0.57, 0.62] (the rare-neighbour cue is removed). PE2 contrast in [0.04, 0.065]: verdict SURVIVES 45%, ATTENUATED 50%, FAILS 5%. PE3 RIVALS arm contrast <= 0.015 and position in [0.47, 0.53].
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, IN_SCOPE, sub, headerHash, sha256, mean, round, dyadsOf } from "./lib.mjs";
import { loadCfg, transferMatrix, summarize } from "./transfer.mjs";

const SELF = fileURLToPath(import.meta.url), cl = (s) => sub(s) ?? null, band = (v) => v != null && v >= 0.45 && v <= 0.55, inSet = (set) => (d, t) => set.includes(cl(d)) && cl(d) === cl(t);
const verdict = (s) => (s.n === 0 ? "EMPTY" : s.diff.mean >= 0.05 && s.diff.lo >= 0.03 && s.frac >= 0.6 && band(s.pos) ? "SURVIVES" : s.diff.mean >= 0.03 && s.diff.lo > 0 ? "ATTENUATED" : "FAILS");
const out = { headerSha256: headerHash(SELF), codeSha256: sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]), variants: {} };
const L = loadCfg("noprop"); out.pairs = Object.fromEntries(Object.entries(L).filter(([s]) => ["spa", "por", "glg", "cat", "fra", "ita", "dan", "nob", "swe", "deu", "nld", "afr", "hin", "urd"].includes(s)).map(([s, l]) => [s, l.pairs]));
for (const arm of ["LEFT", "RIVALS"]) {
  const M = transferMatrix(L, { arm, seed: "atkE", withControls: true }), r = { arm, eligibleDonors: M.donors.length, eligibleTargets: M.targets.length };
  for (const [tag, set] of [["IWR+NGm", ["IWR", "NGm"]], ["IWR", ["IWR"]], ["NGm", ["NGm"]], ["CWGm", ["CWGm"]], ["Hind", ["Hind"]]]) { const dy = dyadsOf(M, inSet(set)); r[tag] = summarize(dy, `E-${arm}-${tag}`); r[tag].verdict = verdict(r[tag]); r[tag].failing = dy.filter((x) => !x.pass).map((x) => `${x.d}>${x.t}:${x.auc}`); }
  const oos = [...new Set(Object.keys(M.A).map(cl).filter(Boolean))].filter((c) => !IN_SCOPE.includes(c)); r.outOfScope = summarize(dyadsOf(M, (d, t) => oos.includes(cl(d)) && cl(d) === cl(t)), `E-${arm}-oos`);
  out.variants[arm] = r; fs.writeFileSync(path.join(RES, "attackE.json"), JSON.stringify(out, null, 1));
  console.error(`E ${arm} IWR+NGm ${r["IWR+NGm"].nPass}/${r["IWR+NGm"].n} auc ${r["IWR+NGm"].meanAuc} ctrl ${r["IWR+NGm"].meanCtrl} contrast ${r["IWR+NGm"].diff.mean} [${r["IWR+NGm"].diff.lo},${r["IWR+NGm"].diff.hi}] pos ${r["IWR+NGm"].pos} ${r["IWR+NGm"].verdict} | IWR ${r.IWR.nPass}/${r.IWR.n} ${r.IWR.diff.mean} ${r.IWR.verdict} | NGm ${r.NGm.nPass}/${r.NGm.n} ${r.NGm.diff.mean} ${r.NGm.verdict} | CWGm ${r.CWGm.nPass}/${r.CWGm.n} ${r.CWGm.diff.mean} | Hind ${r.Hind.nPass}/${r.Hind.n} ${r.Hind.diff.mean} | OOS ${r.outOfScope.nPass}/${r.outOfScope.n} ${r.outOfScope.diff.mean}`);
}
console.log("E done");
