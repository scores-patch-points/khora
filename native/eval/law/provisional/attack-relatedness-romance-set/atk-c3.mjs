// attack-relatedness-romance-set/atk-c3.mjs — REPLICATION of the post-hoc finding of atk-c2.mjs on splits that did not produce it: the function-word part of the company (bins 0-3 = the 15 commonest forms) carries the Romance-specific bonus.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-c3.mjs <dev|test|X|Y>   |   node atk-c3.mjs sum
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before any AUC of ONLYTOP4 / RARE was computed on dev, test, X or Y) ═══════════════════════════════════════════════════════════════════════════════════
// DISCLOSURE. atk-c2.mjs (windows A, B, C) found, post hoc: for the five primary Romance targets, ONLYTOP4 (only the bin 0-3 columns of the four slots; 16 features) a = 0.640, (a - g) = +0.053, (a - e) = +0.087; RARE (bins 9-12)
//   a = 0.651, (a - g) = +0.012, (a - e) = +0.030; for Germanic targets ONLYTOP4 (a - e) = +0.028 and (a - g) = +0.002. The arms were chosen after seeing the slot table (atk-shape.mjs, sets A B C). Not seen: any AUC of any arm on dev, test, X, Y
//   (the splits of this file); the dev/test caches and X/Y rows are not those of the windows used to choose the arms (X, Y overlap C by 4-28%, reported in atk-bx-build; dev/test are different files).
// DATA. dev, test = the scoper's UD dev/test FIRST caches (donors = that split's languages, >= 100 pairs); X, Y = my fresh train windows (atk-bx-build; 23 / 20 languages); V0M0 rows, BOTH arm columns subset as in atk-c2.
//   Primary targets cat fra ita por spa (those eligible with >= 60 pairs); pools a (Romance), g (Germanic), e (non-Romance), K=3 x 100 pairs, 20 draws, same triples for every arm.
// TESTS (thresholds fixed): per split, mean over the eligible primary targets. ONLYTOP4 REPLICATES in a split iff a >= 0.60 AND (a - g) >= 0.03 AND (a - e) >= 0.05. The finding REPLICATES iff it does so in >= 3 of the 4 splits.
//   RARE is GENUS-AGNOSTIC iff (a - g) < 0.03 in >= 3 of the 4 splits. BOTH is reported as the reference ((a - g) is expected below 0.05 there).
// BLIND PREDICTIONS. ONLYTOP4: a 0.63 (0.59-0.67), (a - g) +0.04 (0.015-0.07), (a - e) +0.08 (0.05-0.11); replicates in 3-4 of 4 splits (p = 0.65). RARE: a 0.65, (a - g) +0.01, genus-agnostic in 4 of 4.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { loadRoster, tripleAuc, round, mean } from "./atk-eval.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadLang, headerHash } from "../family-vs-relatedness/lib.mjs";
const SELF = fileURLToPath(import.meta.url), PRIM = ["cat", "fra", "ita", "por", "spa"], ARMS3 = ["BOTH", "ONLYTOP4", "RARE"], SPL = ["dev", "test", "X", "Y"];
const keep = (pred) => (x) => x.filter((_, j) => pred(j % 13)), COLS = { ONLYTOP4: (b) => b <= 3, RARE: (b) => b >= 9 };
const loadSplit = (s) => (s === "dev" || s === "test" ? Object.fromEntries(STEMS.map((t) => [t, loadLang(s, t, "FIRST")]).filter(([, L]) => L)) : loadRoster(s, "V0M0", STEMS, false, ["BOTH"]));
if (process.argv[1] === SELF && SPL.includes(process.argv[2])) {
  const split = process.argv[2], langs = loadSplit(split), out = { split, headerSha256: headerHash(SELF), targets: {} };
  for (const L of Object.values(langs)) for (const a of ["ONLYTOP4", "RARE"]) L.X[a] = L.X.BOTH.map(keep(COLS[a]));
  for (const T of [...ROM, ...GER]) {
    const L = langs[T]; if (!L || L.pairs < 60) continue;
    const own = ROM.includes(T) ? ROM : GER, other = ROM.includes(T) ? GER : ROM, rest = STEMS.filter((s) => !ROM.includes(s) && !GER.includes(s)), tag = (p) => `${split}|C3|${p}`, pick = (r) => r && Object.fromEntries(Object.entries(r.means).map(([k, v]) => [k, round(v)]));
    out.targets[T] = { a: pick(tripleAuc(T, L, own, langs, ARMS3, tag("a"))), g: pick(tripleAuc(T, L, other, langs, ARMS3, tag("g"))), e: pick(tripleAuc(T, L, [...other, ...rest], langs, ARMS3, tag("e"))) };
  }
  fs.writeFileSync(path.join(HERE, "results", `C3-${split}.json`), JSON.stringify(out, null, 1)); console.error(`${split} done ${Object.keys(out.targets).length} targets`);
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = SPL.map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `C3-${s}.json`), "utf8"))), res = { headerSha256: headerHash(SELF), perSplit: {}, groups: {} };
  const stat = (r, ts, arm) => { const rows = ts.map((t) => r.targets[t]).filter((x) => x?.a && x.g && x.e); return rows.length ? { n: rows.length, a: mean(rows.map((x) => x.a[arm])), g: mean(rows.map((x) => x.g[arm])), e: mean(rows.map((x) => x.e[arm])) } : null; };
  for (const r of R) { res.perSplit[r.split] = {}; for (const arm of ARMS3) { const s = stat(r, PRIM, arm); if (s) res.perSplit[r.split][arm] = { n: s.n, a: round(s.a), g: round(s.g), e: round(s.e), aMinusG: round(s.a - s.g), aMinusE: round(s.a - s.e), germanic: (() => { const q = stat(r, GER, arm); return q && { n: q.n, a: round(q.a), aMinusG: round(q.a - q.g), aMinusE: round(q.a - q.e) }; })() }; } }
  const rep = R.filter((r) => { const s = res.perSplit[r.split].ONLYTOP4; return s && s.a >= 0.6 && s.aMinusG >= 0.03 && s.aMinusE >= 0.05; }).length, ag = R.filter((r) => { const s = res.perSplit[r.split].RARE; return s && s.aMinusG < 0.03; }).length;
  res.ONLYTOP4_replicatesInSplits = rep; res.ONLYTOP4_verdict = rep >= 3 ? "REPLICATES" : "DOES NOT REPLICATE"; res.RARE_genusAgnosticSplits = ag;
  fs.writeFileSync(path.join(HERE, "results", "C3-summary.json"), JSON.stringify(res, null, 1));
  for (const r of R) for (const arm of ARMS3) { const s = res.perSplit[r.split][arm]; console.log(`${r.split.padEnd(5)} ${arm.padEnd(9)} n${s.n} a ${s.a} g ${s.g} e ${s.e} a-g ${s.aMinusG} a-e ${s.aMinusE} | germanic ${JSON.stringify(s.germanic)}`); }
  console.log(JSON.stringify({ rep: res.ONLYTOP4_replicatesInSplits, verdict: res.ONLYTOP4_verdict, rareAgnostic: res.RARE_genusAgnosticSplits }));
}
