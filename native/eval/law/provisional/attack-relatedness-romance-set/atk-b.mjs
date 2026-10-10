// attack-relatedness-romance-set/atk-b.mjs — ATTACK B (FORKING PATHS) on rule "relatedness-romance-set": re-derive the donor-class structure on every available split with the rule's own pipeline.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-b.mjs <dev|test|A|B|C|X|Y>      writes results/B-<split>.json      |      node atk-b.mjs sum      applies the thresholds below, writes results/B-summary.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen: as atk-a.mjs/atk-c.mjs headers, plus the numbers of attacks A and C (a - g about +0.03 in the rule's pipeline and ~0 on raw-like tokens; a Germanic donor triple is nearly as good as a Romance one; a 2-parameter
//   neighbour-rarity score reproduces 70-79% of the Romance level and all of the Germanic level). Not seen: any split-wise donor-class table of any sample set, any X or Y number, any dev/test number of this attack.
// SPLITS (7): dev = UD dev (the scoper's DISCOVERY cache: the scope was chosen here, so it is in-sample); test = UD test (the scoper's confirmation: spent for the rule's own pass count, but no donor-class table was
//   computed on it before this attack); A, B, C = the confirmer's three fresh train windows (V0M0 rows rebuilt byte-identical); X, Y = my two NEW windows disjoint from A and B (and Y from X; overlap with C 4-28%, reported),
//   only the 23 / 20 languages with >= 100 FIRST pairs (those with >= 30k spare tokens) (decided from file sizes, before any AUC). Donors of a split are the languages of THAT split (so dev and test are the scoper's form B, A/B/C/X/Y the confirmer's form P).
// DONOR CLASSES (linguistic knowledge, groups.mjs genus plus one rule fixed here): R Romance (cat fra glg ita por ron spa); G Germanic (afr dan deu eng nld nob swe); S Slavic (bul ces hrv pol rus slk slv srp ukr);
//   O = every other language; E (for a target of class C) = every language not in C. TARGET classes: R, G, S. Pools need >= 3 donors with >= 100 pairs, targets >= 60 pairs; K=3 donors x 100 pairs, 20 seeded draws per pool.
// TESTS (thresholds fixed here).
//   B1 RELATEDNESS BEYOND NEIGHBOURS (Romance targets cat fra ita por spa; per-language mean over the splits where eligible; language bootstrap B=2000): R - G pooled mean >= 0.05 with lower bound > 0 AND R - G >= 0.05 in
//      >= 5 of 7 split means => the rule's relatedness reading HOLDS; pooled R - G < 0.03 => it FALLS; between => NARROWED. Also reported: G - O (Western-European neighbour effect), R - O, S - O.
//   B2 NOT A LUCKY SUBSET. The rule's own margin R - E >= 0.05 for the primary targets' split mean in >= 6 of 7 splits => not a lucky subset; <= 4 of 7 => lucky. Per-language pass table (a >= 0.60, a > q95, a - E >= 0.05)
//      for all 7 Romance languages: a language is IN SCOPE iff it passes in >= 70% of its eligible split-cells; the rule's scope (cat fra ita por spa, not glg ron) is checked against this.
//   B3 SCOPE MAP. The same rule (same genus vs not) applied to Germanic and Slavic targets in every split: pass rates per class. Slavic stays out of scope iff < 30% pass; Germanic "joins" iff >= 50% pass.
//   B4 MULTIPLICITY (atk-b2.mjs, own header). Not tested here.
// BLIND PREDICTIONS. B1: pooled R - G = +0.03 (0.01-0.05); R - G >= 0.05 in at most 1 of 7 splits => NARROWED or FALLS. G - O = +0.05 (0.03-0.08); S - O <= 0. B2: R - E >= 0.05 in 7 of 7 (the Romance bonus over the mixed
//   comparator is not lucky); glg passes in >= 70% of cells (the rule's exclusion of glg was test noise), ron in 40-60%. B3: Germanic targets: 50-70% pass (the same rule works for Germanic); Slavic < 30%. Thresholds may be
//   tightened after seeing discovery data, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, boot, round, mean } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadLang, headerHash } from "../family-vs-relatedness/lib.mjs";

export const SLA = ["bul", "ces", "hrv", "pol", "rus", "slk", "slv", "srp", "ukr"], PRIMARY = ["cat", "fra", "ita", "por", "spa"], SPLITS = ["dev", "test", "A", "B", "C", "X", "Y"];
export const OTH = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s) && !SLA.includes(s)), CLASSES = { R: ROM, G: GER, S: SLA };
const SELF = fileURLToPath(import.meta.url);
export const bHash = () => headerHash(SELF);
function loadSplit(split) {
  if (split === "dev" || split === "test") return Object.fromEntries(STEMS.map((s) => [s, loadLang(split, s, "FIRST")]).filter(([, L]) => L));
  return loadRoster(split, "V0M0", STEMS, false, ["BOTH", "POSITION"]);
}
if (process.argv[1] === SELF && SPLITS.includes(process.argv[2])) {
  const split = process.argv[2], langs = loadSplit(split), out = { split, headerSha256: headerHash(SELF), languages: Object.keys(langs).length, eligibleDonors: Object.keys(langs).filter((s) => langs[s].pairs >= 100).length, targets: {} }, t0 = Date.now();
  for (const [cls, members] of Object.entries(CLASSES)) for (const T of members) {
    const L = langs[T]; if (!L || L.pairs < 60) continue;
    const pools = { R: ROM, G: GER, S: SLA, O: OTH, E: STEMS.filter((s) => !members.includes(s)) }, rec = { cls, pairs: L.pairs };
    for (const [pn, pool] of Object.entries(pools)) {
      const own = pn === cls, r = tripleAuc(T, L, pool, langs, own ? ["BOTH", "POSITION"] : ["BOTH"], `${split}|B|${pn}`, 20, null, own);
      rec[pn] = r && { auc: round(r.means.BOTH), n: r.n, ...(own ? { pos: round(r.means.POSITION), q95: round(r.q95) } : {}) };
    }
    out.targets[T] = rec; console.error(`${split} ${cls} ${T} R ${rec.R?.auc} G ${rec.G?.auc} S ${rec.S?.auc} O ${rec.O?.auc} E ${rec.E?.auc} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); fs.writeFileSync(path.join(HERE, "results", `B-${split}.json`), JSON.stringify(out, null, 1));
}
else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = Object.fromEntries(SPLITS.map((s) => [s, JSON.parse(fs.readFileSync(path.join(HERE, "results", `B-${s}.json`), "utf8"))])), m = (xs) => (xs.length ? mean(xs) : null);
  const val = (s, t, f) => { const r = R[s].targets[t]; if (!r) return null; try { const v = f(r); return Number.isFinite(v) ? v : null; } catch { return null; } };
  const perLang = (ts, f) => ts.map((t) => ({ t, v: m(SPLITS.map((s) => val(s, t, f)).filter((x) => x != null)) })).filter((x) => x.v != null);
  const own = (c) => (c === "R" ? "R" : c === "G" ? "G" : "S"), res = { headerSha256: bHash(), thresholds: { relatedness: 0.05, falls: 0.03, splitsRG: 5, notLucky: 6, lucky: 4, scopePass: 0.7 }, B1: {}, B2: {}, B3: {}, matrix: {}, perSplit: {} };
  const diff = (ts, f) => boot(perLang(ts, f).map((x) => x.v));
  res.B1 = { RminusG: diff(PRIMARY, (r) => r.R.auc - r.G.auc), GminusO: diff(PRIMARY, (r) => r.G.auc - r.O.auc), RminusO: diff(PRIMARY, (r) => r.R.auc - r.O.auc), SminusO: diff(PRIMARY, (r) => r.S.auc - r.O.auc), RminusE: diff(PRIMARY, (r) => r.R.auc - r.E.auc) };
  for (const s of SPLITS) res.perSplit[s] = { eligibleDonors: R[s].eligibleDonors, primary: PRIMARY.filter((t) => R[s].targets[t]).length, RminusG: round(m(PRIMARY.map((t) => val(s, t, (r) => r.R.auc - r.G.auc)).filter((x) => x != null))), RminusE: round(m(PRIMARY.map((t) => val(s, t, (r) => r.R.auc - r.E.auc)).filter((x) => x != null))), GminusO: round(m(PRIMARY.map((t) => val(s, t, (r) => r.G.auc - r.O.auc)).filter((x) => x != null))), R: round(m(PRIMARY.map((t) => val(s, t, (r) => r.R.auc)).filter((x) => x != null))) };
  const ps = Object.values(res.perSplit).filter((x) => x.primary >= 3);
  res.B1.splitsRGge05 = ps.filter((x) => x.RminusG >= 0.05).length; res.B1.splitsUsed = ps.length; res.B1.verdict = res.B1.RminusG.mean < 0.03 ? "FALLS" : res.B1.RminusG.mean >= 0.05 && res.B1.RminusG.lo > 0 && res.B1.splitsRGge05 >= 5 ? "HOLDS" : "NARROWED";
  res.B2.splitsRminusEge05 = ps.filter((x) => x.RminusE >= 0.05).length; res.B2.verdict = res.B2.splitsRminusEge05 >= 6 ? "NOT_LUCKY" : res.B2.splitsRminusEge05 <= 4 ? "LUCKY" : "UNCLEAR";
  const passTable = (cls, ts) => Object.fromEntries(ts.map((t) => { const cells = SPLITS.map((s) => { const r = R[s].targets[t]; const a = r?.[cls]; return a && r.E ? { s, pass: a.auc >= 0.6 && a.auc > a.q95 && a.auc - r.E.auc >= 0.05, a: a.auc, e: r.E.auc } : null; }).filter(Boolean); return [t, { cells: cells.length, pass: cells.filter((c) => c.pass).length, rate: cells.length ? round(cells.filter((c) => c.pass).length / cells.length) : null, inScope: cells.length ? cells.filter((c) => c.pass).length / cells.length >= 0.7 : null, bySplit: Object.fromEntries(cells.map((c) => [c.s, `${c.a}/${c.e}${c.pass ? "+" : "-"}`])) }]; }));
  res.B2.romanceTable = passTable("R", ROM); res.B3.germanicTable = passTable("G", GER); res.B3.slavicTable = passTable("S", SLA);
  const rate = (tb) => { const v = Object.values(tb); const c = v.reduce((a, x) => a + x.cells, 0), p = v.reduce((a, x) => a + x.pass, 0); return { cells: c, pass: p, rate: round(p / Math.max(1, c)) }; };
  res.B3.rates = { romance: rate(res.B2.romanceTable), romancePrimary: rate(Object.fromEntries(PRIMARY.map((t) => [t, res.B2.romanceTable[t]]))), germanic: rate(res.B3.germanicTable), slavic: rate(res.B3.slavicTable) };
  for (const [cn, ts] of Object.entries({ R: ROM, G: GER, S: SLA })) res.matrix[cn] = Object.fromEntries(["R", "G", "S", "O", "E"].map((p) => [p, diff(ts, (r) => r[p].auc)]));
  fs.writeFileSync(path.join(HERE, "results", "B-summary.json"), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ B1: res.B1, B2verdict: res.B2, perSplit: res.perSplit, rates: res.B3.rates }, null, 1));
  for (const [cn, mm] of Object.entries(res.matrix)) console.log(`target class ${cn}: ` + Object.entries(mm).map(([p, v]) => `${p} ${v.mean} [${v.lo},${v.hi}]`).join("  "));
  for (const [t, v] of Object.entries(res.B2.romanceTable)) console.log(`${t} ${v.pass}/${v.cells} ${JSON.stringify(v.bySplit)}`);
  for (const t of ["eng", "deu", "nld", "dan", "swe", "nob", "afr"]) { const v = res.B3.germanicTable[t]; console.log(`${t} ${v.pass}/${v.cells} ${JSON.stringify(v.bySplit)}`); }
}
