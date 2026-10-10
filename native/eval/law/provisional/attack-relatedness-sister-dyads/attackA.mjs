// eval/law/provisional/attack-relatedness-sister-dyads/attackA.mjs — ATTACK A (LEAKAGE AND CONFOUNDS) on rule "relatedness-sister-dyads" as confirmed on the fresh UD train windows (confirmer: PARTIAL, IWR+NGm 35/36).
//   NAME_COMPANY_PAIRBLOCK=1 node attackA.mjs      (needs data/<cfg>/ built by build.mjs; writes results/attackA.json; never pass "run" as argv[2])
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file) ═════════════════════════════════════════════════════════════
// DISCLOSURE (what the attacker had seen). READ: the rule JSON and the confirmer's report given with the task (headline numbers: FIRST-LEFT in-scope 38/44, IWR 29/30, NGm 6/6, CWGm 2/6, Hind 1/2; mean AUC 0.632 vs 0.560);
//   confirm.mjs, verdict.mjs, fresh.mjs, prep.mjs, replicate.mjs, posthoc.mjs, name-company.mjs (pairsOf, featuresOf, ARMS), the scoper's lib/groups/subbranch/sister; one confirmer cell (A[spa][por] 0.6181, A[por][spa] 0.6294,
//   position 0.5014, shuffled 0.5077 of spa>por). BUILT AND INSPECTED BEFORE THIS HEADER (no probe fitted, no AUC): the row sets of every configuration below (data/<cfg>/), verified equal to the confirmer's cache (base: 49/49 languages
//   equal, raw-window stream equals freshDoc's), their pair counts (strict keeps 600 pairs for spa por cat fra ita dan deu nld hin urd, 224 glg, 131 afr, 323 swe; ultra fewer) and the pair BALANCE of spa ita deu hin cmn: coarse matching
//   leaves PROPN 0.4-1.0 characters SHORTER than the matched negative (deu -1.02, ita -0.49, spa -0.39), sentence length +0.3..+1.2, index within +-0.1 except hin/cmn -2..-3; strict and ultra make chars/index/count exact.
//   NOT SEEN: any AUC of any variant; any confirmer AUC beyond the two cells above.
// QUESTION. Does any observable of the rule use the gold definition, capitals, lists, the reader's figure/recurrence floor, or a tokenisation that a raw-text reader would not have? Is the matching (position, form frequency,
//   character length, sentence length) tight enough? Does the sister advantage survive when the matching key is made stricter, when UD syntactic words are replaced by SURFACE tokens (multiword tokens such as "del", "du", "zum"
//   kept whole, so that the UD analysis "de el" is not visible), when the rank bins are computed from the PREFIX only (causal), and when the negative must come from the same neighbourhood of the text?
//   AUDIT (read, not run): features = rank-bin slots of the two left neighbours in lowercased PUNCT-free streams; no capital, no UPOS, no word list, no speaker field; gold PROPN enters only as the donor's training label and the target's
//   evaluation label (documented in confirm.mjs). The reader's 3-character figure floor and recurrence floor are NOT in this pipeline (FIRST stratum includes hapax; char length is a MATCHING variable, not a feature).
// CONFIGURATIONS (all FIRST stratum, LEFT arm, single donor 100 pairs, 6 draws, ridge-logistic PROBE (existence test), the confirmer's pass definition: AUC >= 0.60, > analytic q95 for the variant's pair count, >= 0.05 above
//   the target's mean from donors outside its genus; ctrl from the same variant's eligible donors; donors >= 100 pairs, targets >= 60):
//   V0 base (reproduction gate); V1 strict: |count| <= 1, chars exact, index exact (<= 3) else +-1, sentence length +-2, nearest neighbour; V2 ultra: count exact, chars exact, index exact, sentence length +-1;
//   V3 local: strict-like (count +-1, chars +-1, index exact<=3 else +-3, sentence length +-4) AND negative within 12 sentences of the positive (controls name-dense sections); V4 surf: surface tokens, coarse matching;
//   V5 surfstrict: surface tokens, strict; V6 causal: first 30% of the units never candidates, coarse matching, the SAME rows scored three ways: LEFT (global alphabetical-tie bins, registered), LEFTM (global mid-tie bins),
//   LEFTC (prefix-only bins: counts so far, mid-tie); the tie-rule control is LEFTM vs LEFTC. Also the matched-out RIVALS arm (position, char length, form frequency) on V0 and V1 (built to fail: sister minus ctrl contrast ~ 0).
// SCOPE EVALUATED: the confirmer's narrowed scope IWR+NGm (36 ordered dyads, 9 targets), also IWR and NGm alone; CWGm and Hind and out-of-scope clusters are reported. Contrast = target-level mean of (AUC - ctrl_t),
//   language bootstrap B = 2000 over targets.
// THRESHOLDS (fixed now; thresholds may be tightened, never loosened). VALIDITY GATE: V0 must reproduce the confirmer's FIRST-LEFT A matrix: max |A_mine - A_confirmer| <= 0.0005 over every cell (same seeds) - else every
//   number below is labelled NOT COMPARABLE. For each variant on IWR+NGm: SURVIVES iff contrast >= 0.05 AND bootstrap lower bound >= 0.03 AND pass fraction >= 0.60 AND mean position-arm AUC in [0.45, 0.55] (position control void
//   outside the band). ATTENUATED iff not SURVIVES but contrast >= 0.03 and lower bound > 0. FAILS otherwise. The same rule is applied to IWR and to NGm separately (cluster minimum 2 dyads). An attack is SUCCESSFUL
//   (rule narrowed or falls) only for a variant whose IWR+NGm verdict is not SURVIVES, or whose single-cluster verdict is not SURVIVES; the number is the contrast with its interval.
// BLIND PREDICTIONS. PA1 gate holds. PA2 V1 strict: SURVIVES, contrast in [0.060, 0.085]. PA3 V2 ultra: SURVIVES with fewer eligible dyads (afr, glg, swe and small donors drop). PA4 V3 local: SURVIVES, contrast within 0.02 of V0.
//   PA5 V4/V5 surface: NGm unchanged within 0.015 of V0 (no multiword tokens in dan/nob/swe), IWR contrast lower than V0 by 0.01-0.04 but >= 0.04 (verdict SURVIVES at 55%, ATTENUATED at 40%, FAILS at 5%).
//   PA6 V6 causal: LEFTC SURVIVES on IWR+NGm (contrast >= 0.05) with mean AUC at most 0.02 below LEFTM. PA7 RIVALS arm contrast <= 0.015 in V0 and V1; position means in [0.47, 0.53] in every variant.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, IN_SCOPE, sub, headerHash, sha256, mean, round, boot, rs, quantile } from "./lib.mjs";
import { loadCfg, transferMatrix, summarize } from "./transfer.mjs";
import { dyadsOf } from "./lib.mjs";

const SELF = fileURLToPath(import.meta.url), cl = (s) => sub(s) ?? null, band = (v) => v != null && v >= 0.45 && v <= 0.55;
const inSet = (set) => (d, t) => set.includes(cl(d)) && cl(d) === cl(t);
const verdict = (s) => (s.n === 0 ? "EMPTY" : s.diff.mean >= 0.05 && s.diff.lo >= 0.03 && s.frac >= 0.6 && band(s.pos) ? "SURVIVES" : s.diff.mean >= 0.03 && s.diff.lo > 0 ? "ATTENUATED" : "FAILS");
const out = { headerSha256: headerHash(SELF), codeSha256: sha256(fs.readFileSync(SELF, "utf8").split("// ═══ END OF PRE-REGISTRATION")[1]), variants: {} };
const conf = JSON.parse(fs.readFileSync(path.join(path.dirname(RES), "..", "confirm-relatedness-sister-dyads", "results", "transfer-FIRST-LEFT.json"), "utf8"));
const save = () => fs.writeFileSync(path.join(RES, "attackA.json"), JSON.stringify(out, null, 1));
function evalVariant(name, langs, arm, seed, note) {
  const t0 = Date.now(), M = transferMatrix(langs, { arm, seed, withControls: true }), r = { note, arm, eligibleDonors: M.donors.length, eligibleTargets: M.targets.length, pairsPerTarget: M.pairs };
  for (const [tag, set] of [["IWR+NGm", ["IWR", "NGm"]], ["IWR", ["IWR"]], ["NGm", ["NGm"]], ["CWGm", ["CWGm"]], ["Hind", ["Hind"]], ["all-in-scope", IN_SCOPE]]) {
    const dy = dyadsOf(M, inSet(set)); r[tag] = { ...summarize(dy, `${name}-${arm}-${tag}`) }; r[tag].verdict = verdict(r[tag]);
    r[tag].failing = dy.filter((x) => !x.pass).map((x) => `${x.d}>${x.t}:${x.auc}`);
  }
  const oos = [...new Set(Object.keys(M.A).map(cl).filter(Boolean))].filter((c) => !IN_SCOPE.includes(c)); r.outOfScope = summarize(dyadsOf(M, (d, t) => oos.includes(cl(d)) && cl(d) === cl(t)), `${name}-${arm}-oos`);
  r.seconds = round((Date.now() - t0) / 1000, 0); out.variants[`${name}:${arm}`] = r; save();
  console.error(`${name}:${arm} ${r.seconds}s IWR+NGm ${r["IWR+NGm"].nPass}/${r["IWR+NGm"].n} contrast ${r["IWR+NGm"].diff.mean} [${r["IWR+NGm"].diff.lo},${r["IWR+NGm"].diff.hi}] auc ${r["IWR+NGm"].meanAuc} pos ${r["IWR+NGm"].pos} ${r["IWR+NGm"].verdict}`);
  return M;
}
// V0 reproduction gate
const L0 = loadCfg("base"), M0 = evalVariant("V0-base", L0, "LEFT", "conf", "confirmer's rows and seeds");
{ let mx = 0, n = 0, bad = []; for (const d of Object.keys(conf.A)) for (const t of Object.keys(conf.A[d])) { const a = conf.A[d][t], b = M0.A[d]?.[t]; if (a == null || b == null) continue; n++; const e = Math.abs(a - b); if (e > mx) mx = e; if (e > 0.0005) bad.push(`${d}>${t}`); }
  out.gate = { cells: n, maxAbsDiff: round(mx, 5), badCells: bad.slice(0, 20), nBad: bad.length, holds: mx <= 0.0005 }; save(); console.error(`GATE cells ${n} max|diff| ${mx} holds ${mx <= 0.0005}`); }
evalVariant("V0-base", L0, "RIVALS", "atk", "matched-out arm (position, chars, form frequency), built to fail");
for (const [name, cfg, note] of [["V1-strict", "strict", "count +-1, chars exact, index exact, sentlen +-2"], ["V2-ultra", "ultra", "count exact, chars exact, index exact, sentlen +-1"], ["V3-local", "local", "strict-like + negative within 12 sentences"], ["V4-surf", "surf", "surface tokens (multiword tokens whole), coarse matching"], ["V5-surfstrict", "surfstrict", "surface tokens, strict"]]) {
  const L = loadCfg(cfg); evalVariant(name, L, "LEFT", "atk", note); if (name === "V1-strict") evalVariant(name, L, "RIVALS", "atk", "matched-out arm on strict rows");
}
const Lc = loadCfg("causal"); for (const arm of ["LEFT", "LEFTM", "LEFTC"]) evalVariant("V6-causal", Lc, arm, "atk", "burn-in 30%, coarse matching; LEFT global alphabetical ties, LEFTM global mid-tie, LEFTC prefix-only bins");
// paired comparison of the per-target contrast with V0 (IWR+NGm targets)
const tgt = (v) => out.variants[v]["IWR+NGm"].perTarget; out.deltaVsV0 = {};
for (const v of Object.keys(out.variants)) { if (v === "V0-base:LEFT" || v.endsWith("RIVALS")) continue; const a = tgt(v), b = tgt("V0-base:LEFT"), ts = Object.keys(a).filter((t) => b[t] != null), rnd = rs("deltaboot", v); const d = ts.map((t) => a[t] - b[t]); out.deltaVsV0[v] = boot(d, 2000, rnd); }
save(); console.log(JSON.stringify({ gate: out.gate, delta: out.deltaVsV0, summary: Object.fromEntries(Object.entries(out.variants).map(([k, v]) => [k, { n: v["IWR+NGm"].n, nPass: v["IWR+NGm"].nPass, auc: v["IWR+NGm"].meanAuc, ctrl: v["IWR+NGm"].meanCtrl, diff: v["IWR+NGm"].diff, pos: v["IWR+NGm"].pos, verdict: v["IWR+NGm"].verdict, IWR: [v.IWR.nPass, v.IWR.n, v.IWR.diff.mean, v.IWR.verdict], NGm: [v.NGm.nPass, v.NGm.n, v.NGm.diff.mean, v.NGm.verdict] }])) }, null, 1));
