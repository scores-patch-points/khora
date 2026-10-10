// attack-relatedness-romance-set/atk-b2.mjs — ATTACK B4 (MULTIPLICITY / FORKING PATHS): is the Romance donor bonus larger than a random grouping of languages would give? Single-donor matrices per split + permutation of group labels.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-b2.mjs <dev|test|A|B|C|X|Y>      writes results/B2-<split>.json      |      node atk-b2.mjs sum
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════════════
// DISCLOSURE. Seen: attacks A, C and the B1-B3 tables of atk-b.mjs (Romance targets: Romance donors 0.660, Germanic 0.637, Slavic 0.578, other 0.564; Germanic targets: Germanic 0.673, Romance 0.648; Slavic targets: all pools
//   ~0.55-0.57; Romance margin over the rule's comparator >= 0.05 in 7/7 splits; ron passes 1/7, glg 4/5). Not seen: any single-donor matrix of any split.
// DATA. The same 7 splits as atk-b.mjs (dev, test, A, B, C, X, Y; V0M0 rows, FIRST stratum, BOTH arm). M[d][t] = mean over 4 seeded draws of the AUC on ALL rows of target t of the ridge-logistic probe fitted on 100 pairs of donor d.
//   Eligible language = >= 100 pairs (donor and target). Single-donor numbers are lower than triples; they are used ONLY as a statistic for the permutation, not as rule-level AUCs.
// STATISTIC. For a group G of eligible languages (size k >= 3): S(G) = mean over t in G of [ mean over d in G\{t} of M[d][t] - mean over d not in G, d != t of M[d][t] ] (donor and target quality enter symmetrically).
// TESTS (thresholds fixed): groups Romance (R), Germanic (Ge), Slavic (Sl), and the neighbourhood union R+Ge (WE). Null = 5000 random groups of the same size k drawn uniformly from the eligible languages of the split.
//   B4a: R is NOT a multiplicity artifact in a split iff its empirical p (share of random groups with S >= S_R) <= 0.0125 (= 0.05 / 4 candidate groups). Over splits: not an artifact iff that holds in >= 6 of 7 splits.
//   B4b (the rule's own forking path, 5 groups x 3 cells = 15 looks): p_R * 15 <= 0.05 in >= 6 of 7 splits.
//   B4c RANKS: for each Romance target, rank all other eligible donors by M[d][t] (1 = best); report mean rank of Romance donors, Germanic donors, Slavic donors, other donors, and the share of top-3 donors that are Romance /
//      Germanic / other (descriptive; in splits with >= 3 Romance targets).
// BLIND PREDICTIONS. S_R = +0.07 (0.05-0.10), p <= 0.002 in all 7 splits (multiplicity cannot explain the Romance bonus); S_Ge = +0.04 (0.02-0.07), p <= 0.05 in >= 5 splits; S_Sl = +0.01 (-0.01 to 0.03), p > 0.05
//   in >= 5 splits; S_WE >= S_R. Ranks: Romance donors rank best for Romance targets (mean rank ~3), Germanic donors next (~7), Slavic and other worse (~15); top-3 donors are Romance or Germanic in >= 85% of cases.
//   Thresholds may be tightened after seeing discovery data, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER, rs } from "./atk-lib.mjs";
import { loadRoster, round, mean } from "./atk-eval.mjs";
import { SLA, SPLITS } from "./atk-b.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadLang, headerHash, fitProbe, aucOn, pairSample, shuffleIn, quantile } from "../family-vs-relatedness/lib.mjs";

const SELF = fileURLToPath(import.meta.url);
const loadSplit = (split) => (split === "dev" || split === "test" ? Object.fromEntries(STEMS.map((s) => [s, loadLang(split, s, "FIRST")]).filter(([, L]) => L)) : loadRoster(split, "V0M0", STEMS, false, ["BOTH", "POSITION"]));
const S = (G, M, all) => { const v = []; for (const t of G) { const w = G.filter((d) => d !== t).map((d) => M[d][t]), o = all.filter((d) => d !== t && !G.includes(d)).map((d) => M[d][t]); if (w.length && o.length) v.push(mean(w) - mean(o)); } return v.length ? mean(v) : null; };
if (process.argv[1] === SELF && SPLITS.includes(process.argv[2])) {
  const split = process.argv[2], langs = loadSplit(split), el = Object.keys(langs).filter((s) => langs[s].pairs >= 100), M = {}, t0 = Date.now();
  for (const d of el) { M[d] = {}; const acc = {}; for (let r = 0; r < 4; r++) { const rnd = rs("sd", split, d, r), f = fitProbe([{ L: langs[d], idx: pairSample(langs[d], 100, rnd) }], "BOTH"); for (const t of el) if (t !== d) (acc[t] ??= []).push(aucOn(f, langs[t], "BOTH")); } for (const t of Object.keys(acc)) M[d][t] = mean(acc[t].filter((x) => x != null)); }
  const groups = { R: ROM.filter((x) => el.includes(x)), Ge: GER.filter((x) => el.includes(x)), Sl: SLA.filter((x) => el.includes(x)) }; groups.WE = [...groups.R, ...groups.Ge];
  const out = { split, headerSha256: headerHash(SELF), eligible: el.length, groups, stat: {}, ranks: {}, topDonors: {} }, rnd = rs("perm", split);
  for (const [gn, G] of Object.entries(groups)) {
    if (G.length < 3) continue; const obs = S(G, M, el), null_ = []; for (let b = 0; b < 5000; b++) null_.push(S(shuffleIn(el.slice(), rnd).slice(0, G.length), M, el));
    out.stat[gn] = { k: G.length, S: round(obs), nullMean: round(mean(null_)), nullQ95: round(quantile(null_, 0.95)), nullQ99: round(quantile(null_, 0.99)), nullMax: round(Math.max(...null_)), p: round((null_.filter((x) => x >= obs).length + 1) / 5001) };
  }
  const cls = (d) => (ROM.includes(d) ? "R" : GER.includes(d) ? "Ge" : SLA.includes(d) ? "Sl" : "O");
  for (const t of groups.R) { const order = el.filter((d) => d !== t).sort((a, b) => M[b][t] - M[a][t]), rk = {}; order.forEach((d, i) => (rk[cls(d)] ??= []).push(i + 1)); out.ranks[t] = Object.fromEntries(Object.entries(rk).map(([k, v]) => [k, round(mean(v), 2)])); out.topDonors[t] = order.slice(0, 3).map((d) => `${d}:${cls(d)}:${round(M[d][t], 3)}`); }
  fs.writeFileSync(path.join(HERE, "results", `B2-${split}.json`), JSON.stringify({ ...out, seconds: (Date.now() - t0) / 1000 }, null, 1)); console.error(`${split} ${JSON.stringify(out.stat)} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = SPLITS.map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `B2-${s}.json`), "utf8"))), res = { headerSha256: headerHash(SELF), perSplit: {} };
  for (const r of R) res.perSplit[r.split] = { eligible: r.eligible, stat: r.stat, ranks: r.ranks, top: r.topDonors };
  const cnt = (g, f) => R.filter((r) => r.stat[g] && f(r.stat[g])).length;
  res.B4a = { R_p_le_0125: cnt("R", (s) => s.p <= 0.0125), B4b_R_p15_le_05: cnt("R", (s) => s.p * 15 <= 0.05), Ge_p_le_05: cnt("Ge", (s) => s.p <= 0.05), Sl_p_le_05: cnt("Sl", (s) => s.p <= 0.05), WE_p_le_0125: cnt("WE", (s) => s.p <= 0.0125), splits: R.length };
  const tops = R.flatMap((r) => Object.values(r.topDonors).flat()).map((x) => x.split(":")[1]); res.top3Share = Object.fromEntries(["R", "Ge", "Sl", "O"].map((k) => [k, round(tops.filter((x) => x === k).length / tops.length)]));
  const rk = (k) => { const v = R.flatMap((r) => Object.values(r.ranks).map((o) => o[k]).filter((x) => x != null)); return round(mean(v), 2); }; res.meanRank = Object.fromEntries(["R", "Ge", "Sl", "O"].map((k) => [k, rk(k)]));
  fs.writeFileSync(path.join(HERE, "results", "B2-summary.json"), JSON.stringify(res, null, 1));
  for (const r of R) console.log(r.split, r.eligible, Object.entries(r.stat).map(([g, s]) => `${g}(k${s.k}) S ${s.S} null ${s.nullMean} q95 ${s.nullQ95} max ${s.nullMax} p ${s.p}`).join(" | "));
  console.log(JSON.stringify({ B4a: res.B4a, top3Share: res.top3Share, meanRank: res.meanRank }));
}
