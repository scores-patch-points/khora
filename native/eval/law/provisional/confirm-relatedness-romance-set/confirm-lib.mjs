// confirm-relatedness-romance-set/confirm-lib.mjs — the REGISTERED PROCEDURE's helpers (loaders, controls, verdict function). Imported by confirm.mjs (whose header is the pre-registration);
// its sha256 is written into every result JSON. It re-uses the scoper's frozen analysis.mjs (setsFor, groupTable ...) unchanged: the same statistic as the rule was found with.
import fs from "node:fs";
import path from "node:path";
import { round, mean, rngFor, seedFor, shuffleIn, pairSample, fitProbe, aucOn, sha256 } from "../family-vs-relatedness/lib.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadAll as loadDev, donorsOf, poolsFor, K_SET, CAP_TRAIN, MIN_TARGET } from "../family-vs-relatedness/analysis.mjs";
import { loadFresh, CROSS, HERE } from "./lib-fresh.mjs";

export const PRIMARY = ["cat", "fra", "ita", "por", "spa"];          // the rule's targets
export const SECONDARY = ["glg", "ron"];                              // borderline in the rule (failed on dev/test); reported, not counted in the primary verdict
export const ROMANCE7 = [...PRIMARY, ...SECONDARY];
export const CROSS_KEYS = Object.keys(CROSS);                         // spaGSD porBOS glgTG
export const SCOPER = path.join(HERE, "..", "family-vs-relatedness");
export const rs = (...p) => rngFor(seedFor("conf-rel", ...p));
export const fileHash = (dir, f) => sha256(fs.readFileSync(path.join(dir, f), "utf8"));
/** the scoper's code must be byte-identical to the code it recorded when it selected the rule (discovery-selection.json). */
export function frozenCheck() {
  const sel = JSON.parse(fs.readFileSync(path.join(SCOPER, "results", "discovery-selection.json"), "utf8")), out = {};
  for (const [k, f] of [["groupsSha256", "groups.mjs"], ["libSha256", "lib.mjs"], ["analysisSha256", "analysis.mjs"]]) { out[k] = fileHash(SCOPER, f); if (sel[k] !== out[k]) throw new Error(`code freeze violated: ${f} differs from discovery-selection.json`); }
  return out;
}
/** roster of fresh windows for (set, stratum[, shuffled]) keyed by language stem. */
export function loadRoster(set, stratum, shuf = false) { const o = {}; for (const s of STEMS) { const L = loadFresh(set, s, stratum, shuf); if (L) o[s] = L; } return o; }
/** parse a cell id "<P|D|XP|XD>-<A|B|C>-<FIRST|LATER>-<BOTH|LEFT>". */
export function parseCell(id) { const [form, set, stratum, arm] = id.split("-"); if (!["P", "D", "XP", "XD"].includes(form) || !["A", "B", "C"].includes(set) || !["FIRST", "LATER"].includes(stratum) || !["BOTH", "LEFT"].includes(arm)) throw new Error(`bad cell id ${id}`); return { id, form, set, stratum, arm }; }
/** donor base: P/XP = fresh windows of the same set (every other language's TRAIN text); D/XD = the scoper's DEV rows (the deployment donors). */
export const donorBase = (c, shuf = false) => (c.form.endsWith("P") ? loadRoster(c.set, c.stratum, shuf) : loadDev("dev", c.stratum, shuf ? ".shuf" : ""));
/** mean AUC on the real target of a probe fitted on K_SET donors drawn from `pool` (stem list; default = the same-genus pool a), `draws` seeded draws. mode "sham": donor labels swapped within a random half of the pairs; "plain": as is. */
export function transferPool(lang, langs, targetL, arm, tag, mode, draws = 10, poolOverride = null, poolTag = "a") {
  const L2 = { ...langs, [lang]: targetL }, pool = poolOverride ? poolOverride.filter((x) => L2[x] && x !== lang && L2[x].pairs >= 100) : poolsFor(lang, donorsOf(L2)).a; if (pool.length < K_SET) return null;
  const out = [];
  for (let d = 0; d < draws; d++) {
    const rnd = rs("ctrl", tag, mode, poolTag, lang, arm, d), pick = shuffleIn(pool.slice(), rnd).slice(0, K_SET);
    const parts = pick.map((x) => {
      const L = L2[x], idx = pairSample(L, Math.min(CAP_TRAIN, L.pairs), rnd), y = L.y.slice();
      if (mode === "sham") for (let k = 0; k < idx.length; k += 2) if (rnd() < 0.5) { y[idx[k]] = 1 - y[idx[k]]; y[idx[k + 1]] = 1 - y[idx[k + 1]]; }
      return { L: { ...L, y }, idx };
    });
    const a = aucOn(fitProbe(parts, arm), targetL, arm); if (a != null) out.push(a);
  }
  return out.length ? { mean: round(mean(out)), n: out.length, pool: pool.length } : null;
}
/** same-genus-pool control used by confirm-run.mjs: returns the mean only. */
export const transferA = (lang, langs, targetL, arm, tag, mode, draws = 10) => { const r = transferPool(lang, langs, targetL, arm, tag, mode, draws); return r ? r.mean : null; };
/** REGISTERED per-cell verdict (primary scope). g = groupTable entry for the eligible targets; ex = {sham, shufDonor} means over those targets. */
export function verdictOf(g, ex) {
  if (!g || g.n < 3) return "UNDERPOWERED";
  const frac = g.nPass / g.n, band = g.positionControl != null && g.positionControl >= 0.45 && g.positionControl <= 0.55;
  const shufOk = g.shuffledControl == null || g.shuffledControl <= 0.55, shamOk = ex.sham == null || (ex.sham >= 0.45 && ex.sham <= 0.55), sdOk = ex.shufDonor == null || ex.shufDonor <= 0.55;
  if (!band || !shufOk || !shamOk || !sdOk) return "VOID";
  if (frac >= 0.7 && g.diffBoot.lo > 0) return "HOLDS";
  if (frac < 0.5 || g.diffBoot.mean < 0.03) return "FAILS";
  return "PARTIALLY HOLDS";
}
export const eligibleTarget = (L) => L && L.pairs >= MIN_TARGET;
