// eval/law/provisional/family-vs-relatedness/confirm.mjs — CONFIRMATION on UD TEST.conllu (untouched by every script of the name-company line and by discover.mjs) of the (at most two)
// group rules that discover.mjs selected, and a replication of the genus-vs-word-order contrasts.
//
//   NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs rules                 (the chosen rules, forms A and B)
//   NAME_COMPANY_PAIRBLOCK=1 node confirm.mjs <LATER-BOTH|FIRST-LEFT|FIRST-BOTH>   (full-pipeline replication on test, test donors -> test targets)
//   needs cache/test built first:  node cache.mjs test all ; node cache.mjs test all --shuffled
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file, and after discover.mjs had been launched but before any of its output was read) ═══════
// DISCLOSURE. This header was written while the three discovery cells were still running; no discovery number (regression coefficient, set mean, group table, selection) had been
//   read. The test split has not been read by any script of this lens or by any earlier name-company script (impact.mjs refuses test files; lib.mjs readConllu is the only reader
//   that opens one, and it has not yet been called on a test file). The test PAIR COUNTS per language are not known to the author.
// WHAT IS CONFIRMED. The rules in results/discovery-selection.json `chosen` (<= 2). Each rule R = (cell, group, tier, scope): "a company profile (cell's arm, cell's stratum) learned on
//   K = 3 languages of group G (100 pairs each, 20 seeded draws) transfers to a target L in scope(R) at AUC >= 0.60, above its pair-flip permutation q95, and at least 0.05 above the AUC
//   of an equalised set of 3 languages outside G". For a genus group the control set is "different genus, any order" (e); for an order group it is "opposite clear word order, different
//   genus" (c) and the same set is "same word order, different genus" (b). scope = all eligible members of G on dev (STRICT tier) or the languages that passed on dev (PARTIAL tier).
// FORMS. A (the DEPLOYMENT form, primary): donors' DEV rows -> target's TEST rows (target pairs never seen). B (replication, secondary): donors' TEST rows -> target's TEST rows.
//   Eligibility is recomputed per form (donor >= 100 pairs, target >= 60 pairs on the test rows used); a scope language that is thin on test is listed as thin and counted out.
// VERDICT PER RULE (form A). HOLDS: >= 3 eligible scope targets, >= 70% pass (pass = AUC >= 0.60 and > q95 and same - control >= 0.05), lower bound of the language bootstrap of
//   (same - control) > 0, mean POSITION control of the same-set in [0.45, 0.55] and mean shuffled-target AUC <= 0.55. PARTIALLY HOLDS: not HOLDS, >= 3 eligible scope targets, >= 50% pass,
//   mean (same - control) >= 0.03. FAILS: otherwise. UNDERPOWERED: < 3 eligible scope targets on test. Form B is reported with the same criteria and does not change the verdict.
//   Out-of-scope members of G (those that failed on dev) are reported separately: they are scope information, not part of the verdict.
// REPLICATION OF THE LENS VERDICTS (cell mode). The discover.mjs pipeline run with test donors and test targets, same code (hash-checked), same thresholds: sameGenus / sameOrder /
//   sameScript regression coefficients with pigeonhole CIs and permutation q95, and the GENUS (a - b) and ORDER (b - c) contrasts. A dev verdict REPLICATES if it holds under the
//   same thresholds on test.
// BLIND PREDICTIONS (written without knowledge of the discovery output). P1 shrinkage: every rule's pass fraction on test (form A) is below its dev pass fraction, by >= 0.10 for PARTIAL
//   tier rules (their scope was chosen on dev passes) and by < 0.10 for STRICT rules. P2 at least one chosen rule is HOLDS or PARTIALLY HOLDS in form A. P3 the position and shuffled-target
//   controls stay in band. P4 the sign of every dev lens coefficient (sameGenus, sameOrder, sameScript) is reproduced on test, the size shrinks.
// CODE FREEZE. The provenance hashes (groups.mjs, lib.mjs, analysis.mjs, cache.mjs) written by discover.mjs must equal the current ones or this script refuses to run. Thresholds, K, CAP and
//   seeds' structure are those of discover.mjs; only the seed tag differs ("confirm-A", "confirm-B"). Nothing may be tuned on test.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, round, mean, rngFor, seedFor, headerHash, sha256 } from "./lib.mjs";
import { team, genus, WO3 } from "./groups.mjs";
import { STRATA, loadAll, targetsOf, donorsOf, cvAuc, dyadMatrix, dyadRows, regress, bootRegress, permNull, setsFor, contrasts, groupTable, boot, LABELS, LABELS_WO2, LABELS_KNOW, AUC_MIN, SAME_MARGIN } from "./analysis.mjs";

const SELF = fileURLToPath(import.meta.url), RES = path.join(HERE, "results");
const fileHash = (f) => sha256(fs.readFileSync(path.join(HERE, f), "utf8"));
const frozen = () => {
  const sel = JSON.parse(fs.readFileSync(path.join(RES, "discovery-selection.json"), "utf8"));
  for (const [k, f] of [["groupsSha256", "groups.mjs"], ["libSha256", "lib.mjs"], ["analysisSha256", "analysis.mjs"], ["cacheSha256", "cache.mjs"]]) if (sel[k] !== fileHash(f)) throw new Error(`code freeze violated: ${f} changed since discovery`);
  return sel;
};
const prov = () => ({ headerSha256: headerHash(SELF), groupsSha256: fileHash("groups.mjs"), libSha256: fileHash("lib.mjs"), analysisSha256: fileHash("analysis.mjs"), cacheSha256: fileHash("cache.mjs") });
const rs = (...p) => rngFor(seedFor("fam-vs-rel", "confirm", ...p));
const rnd4 = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, round(v)]));

/** verdict criteria shared by forms A and B; g = groupTable entry restricted to the eligible scope targets. */
function verdictOf(g) {
  const frac = g.n ? g.nPass / g.n : 0, inBand = g.positionControl != null && g.positionControl >= 0.45 && g.positionControl <= 0.55, shufOk = g.shuffledControl == null || g.shuffledControl <= 0.55;
  if (g.n < 3) return "UNDERPOWERED";
  if (frac >= 0.7 && g.diffBoot.lo > 0 && inBand && shufOk) return "HOLDS";
  if (frac >= 0.5 && g.diffBoot.mean >= 0.03) return "PARTIALLY HOLDS";
  return "FAILS";
}
function rules() {
  const sel = frozen(), out = { ...prov(), chosen: sel.chosen.map((x) => ({ cell: x.cell, group: x.group, tier: x.tier, devNPass: x.nPass, devN: x.n, scope: x.scope })), results: [] };
  for (const rule of sel.chosen) {
    const [stratum, arm] = rule.cell.split("-"), key = rule.group, kind = rule.kind, gname = key.split(":")[1];
    const dev = loadAll("dev", stratum), tst = loadAll("test", stratum), tstShuf = loadAll("test", stratum, ".shuf");
    const members = Object.keys(tst).filter((t) => (kind === "genus" ? genus(t) === gname : WO3[t] === gname));
    const res = { cell: rule.cell, group: key, tier: rule.tier, scope: rule.scope, thinOnTest: rule.scope.filter((t) => !tst[t] || tst[t].pairs < 60), forms: {} };
    for (const form of ["A", "B"]) {
      const R = {};
      for (const t of members.filter((t) => tst[t] && tst[t].pairs >= 60)) {
        const langs = form === "A" ? { ...dev, [t]: tst[t] } : tst; R[t] = setsFor(t, langs, arm, `confirm-${form}-${rule.cell}`, tstShuf);
      }
      const inScope = Object.fromEntries(Object.entries(R).filter(([t]) => rule.scope.includes(t))), outScope = Object.fromEntries(Object.entries(R).filter(([t]) => !rule.scope.includes(t)));
      const gIn = groupTable(inScope)[key], gOut = groupTable(outScope)[key];
      res.forms[form] = { verdict: verdictOf(gIn), inScope: { ...gIn }, outOfScope: { n: gOut.n, nPass: gOut.nPass, meanSame: gOut.meanSame, meanCtrl: gOut.meanCtrl, passing: gOut.passing, failing: gOut.failing } };
      console.error(`${rule.cell} ${key} form ${form}: ${res.forms[form].verdict} (${gIn.nPass}/${gIn.n})`);
    }
    res.verdictA = res.forms.A.verdict; out.results.push(res);
  }
  fs.writeFileSync(path.join(RES, "confirm-rules.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out.results.map((r) => ({ cell: r.cell, group: r.group, tier: r.tier, A: r.forms.A.verdict, nPassA: `${r.forms.A.inScope.nPass}/${r.forms.A.inScope.n}`, B: r.forms.B.verdict, nPassB: `${r.forms.B.inScope.nPass}/${r.forms.B.inScope.n}` })), null, 1));
}
function cell(stratum, arm) {
  frozen(); const t0 = Date.now(), tag = `${stratum}-${arm}`, langs = loadAll("test", stratum), shuf = loadAll("test", stratum, ".shuf");
  const T = targetsOf(langs), out = { cell: tag, split: "test", ...prov(), targets: T, donors: donorsOf(langs), own: {} };
  for (const s of T) out.own[s] = { pairs: langs[s].pairs, cv: round(cvAuc(langs[s], arm)), cvPosition: round(cvAuc(langs[s], "POSITION")) };
  const dm = dyadMatrix(langs, arm, `confirm-${tag}`); out.dyad = { A: dm.A, P: dm.P, S: dm.S }; const regs = {};
  for (const [name, lab] of [["wo3", LABELS], ["wo2", LABELS_WO2], ["know", LABELS_KNOW]]) { const rows = dyadRows(dm.A, lab); regs[name] = { n: rows.length, est: rnd4(regress(rows)), ci: bootRegress(rows, 1000, rs("bootreg", tag, name)) }; }
  regs.wo3.permGenus = permNull(dm.A, LABELS, "genus", 300, rs("permG", tag)); regs.wo3.permOrder = permNull(dm.A, LABELS, "order", 300, rs("permO", tag));
  regs.positionControl = rnd4(regress(dyadRows(dm.P, LABELS))); regs.shamControl = rnd4(regress(dyadRows(dm.S, LABELS))); out.regression = regs;
  const R = {}; for (const t of T) { R[t] = setsFor(t, langs, arm, `confirm-B-${tag}`, shuf); console.error(`${tag}: sets ${t} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  out.sets = R; out.contrasts = contrasts(R); out.groupTable = groupTable(R); out.seconds = round((Date.now() - t0) / 1000, 1);
  fs.writeFileSync(path.join(RES, `confirm-${tag}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ cell: tag, regression: regs.wo3.est, GENUS: out.contrasts["GENUS_a-b"].mean, ORDER: out.contrasts["ORDER_b-c"].mean }, null, 1));
}
const mode = process.argv[2];
if (mode === "rules") rules();
else { const c = STRATA.find(([s, a]) => `${s}-${a}` === mode); if (!c) throw new Error("usage: confirm.mjs <rules|LATER-BOTH|FIRST-LEFT|FIRST-BOTH>"); cell(c[0], c[1]); }
