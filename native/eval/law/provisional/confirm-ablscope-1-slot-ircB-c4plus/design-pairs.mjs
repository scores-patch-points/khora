// design-pairs.mjs -- OUTCOME-BLIND DESIGN of the confirmation of rule ablscope-1-slot-ircB-c4plus: which documents, which cells, which matched pairs, which natural-sample tokens.
// No impact / ablation value of any token of these documents exists when this runs (only counts, positions, lengths and frequencies of the streams are used). Output: data/design.json (its sha256 is printed and recorded by the analysis).
//   node design-pairs.mjs
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { excludedDays, allDays } from "./design-days.mjs";
import { aucPN } from "../ablation-scope/stats.mjs";
import { HERE, M_IRC, M_UD, mOf, loadDocCond, buildDocPairs, naturalSample, slimOf, ctlOf, CONTROLS, TAG } from "./lib.mjs";

const ledger = excludedDays();
const reasonsOf = (n) => ledger.get(n) ?? [];
const earlyOnly = (n) => reasonsOf(n).length > 0 && reasonsOf(n).every((r) => /^(name-rule-informal|name-company)/.test(r));
const eng = allDays(["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"]).filter((d) => d.lang === "en");
const ARMS = {
  E_CORE: { days: eng.filter((d) => d.channel !== "ubuntu-server" && !ledger.has(d.name)).map((d) => d.name), cond: ["real"], note: "PRIMARY: untouched English ubuntu/kubuntu/xubuntu days" },
  E_SRV: { days: eng.filter((d) => d.channel === "ubuntu-server" && !ledger.has(d.name)).map((d) => d.name), cond: ["real"], note: "untouched English ubuntu-server days (same register, channel not named in the rule scope)" },
  E_REUSE: { days: eng.filter((d) => earlyOnly(d.name)).map((d) => d.name), cond: ["real"], note: "NOT untouched: English days read by name-rule-informal / name-company only; scope replication, excluded from the verdict" },
  X_DE: { days: allDays(["ubuntu-de"]).map((d) => d.name), cond: ["real"], note: "extension: German IRC" },
  X_ES: { days: allDays(["ubuntu-es"]).map((d) => d.name), cond: ["real"], note: "extension: Spanish IRC" },
  X_IT: { days: allDays(["ubuntu-it"]).map((d) => d.name), cond: ["real"], note: "extension: Italian IRC" },
  SHUF: { days: ["kubuntu/2007-03-15", "kubuntu/2007-07-15", "ubuntu/2005-03-15"], cond: ["real", "shufW", "shufG"], note: "mechanism controls: scrambled streams" },
  UD: { days: fs.readdirSync("/private/tmp/claude-501/ud-eval").filter((s) => fs.existsSync(`/private/tmp/claude-501/ud-eval/${s}/test.conllu`)).sort().map((s) => `ud:${s}`), cond: ["real"], note: "exploratory: UD test splits (written text), M=128 sentences" },
};
const BIG = [["B", "c2", 999], ["B", "c3", 999], ["B", "c4_6", 999], ["B", "c7_15", 999], ["B", "c16p", 999], ["A", "c4_6", 999], ["A", "c7_15", 999], ["A", "c16p", 999]];
const cellsFor = (arm) => (arm === "UD" ? [["B", "c2", 30], ["B", "c3", 30], ["B", "c4_6", 999], ["B", "c7_15", 999], ["B", "c16p", 999]] : arm === "SHUF" ? [["B", "c4_6", 30], ["B", "c7_15", 30], ["B", "c16p", 30]]
  : arm === "E_REUSE" ? [["B", "c2", 10], ["B", "c3", 10], ["B", "c4_6", 14], ["B", "c7_15", 14], ["B", "c16p", 14], ["A", "c4_6", 10], ["A", "c7_15", 10], ["A", "c16p", 10]] : BIG);
const natN = { E_CORE: 100, E_SRV: 100, X_DE: 100, X_ES: 100, X_IT: 100, E_REUSE: 30, UD: 20, SHUF: 0 };

const tokens = [], report = { tag: TAG, arms: {}, ledgerSize: ledger.size };
let pid = 0;
for (const [arm, A] of Object.entries(ARMS)) {
  const rep = { note: A.note, days: A.days.length, perDay: {}, pairs: 0, pooledControls: {} };
  const armPairs = [];
  for (const cond of A.cond) for (const name of A.days) {
    const M = mOf(name);
    let doc; try { doc = loadDocCond(name, cond); } catch (e) { rep.perDay[`${name}|${cond}`] = { error: String(e.message).slice(0, 80) }; continue; }
    if (doc.stream.length <= M + 20) { rep.perDay[`${name}|${cond}`] = { skipped: "too short", units: doc.stream.length }; continue; }
    const cells = cellsFor(arm).map(([grp, stratum, n]) => ({ grp, stratum, n }));
    const { cand, pairs } = buildDocPairs(doc, M, cells);
    const used = new Set(pairs.flatMap((x) => [`${x.pos.s}:${x.pos.i}`, `${x.neg.s}:${x.neg.i}`]));
    const perCell = {};
    for (const x of pairs) { const id = `${arm}|${name}|${cond}|${pid++}`, base = { arm, doc: name, cond, pair: id, grp: x.grp, stratum: x.stratum, units: doc.stream.length };
      tokens.push({ ...base, kind: "pair", y: 1, ...slimOf(x.pos) }); tokens.push({ ...base, kind: "pair", y: 0, ...slimOf(x.neg) }); perCell[`${x.grp}:${x.stratum}`] = (perCell[`${x.grp}:${x.stratum}`] ?? 0) + 1; armPairs.push(x); }
    const nat = {};
    if (natN[arm]) for (const st of ["c4_6", "c7_15", "c16p"]) {
      const r = naturalSample(cand, doc, { grp: "B", stratum: st, n: natN[arm] }, used, TAG, M);
      for (const q of r.sample) tokens.push({ arm, doc: name, cond, pair: null, kind: "nat", y: 0, grp: "B", stratum: st, units: doc.stream.length, ...slimOf(q) });
      nat[st] = { drawn: r.sample.length, pool: r.poolSize, posCandidates: cand.P.filter((q) => q.grp === "B" && q.stratum === st).length };
    }
    const cnt = {}; for (const grp of ["A", "B"]) for (const st of ["c2", "c3", "c4_6", "c7_15", "c16p"]) cnt[`${grp}:${st}`] = { P: cand.P.filter((q) => q.grp === grp && q.stratum === st).length, N: cand.N.filter((q) => q.grp === grp && q.stratum === st).length };
    rep.perDay[`${name}|${cond}`] = { units: doc.stream.length, goldForms: doc.goldForms?.length ?? null, pairs: perCell, natural: nat, candidateCounts: cnt };
    rep.pairs += pairs.length;
  }
  // design-time balance of the pooled arm on the six controls (no ablation value is involved)
  for (const grp of ["A", "B"]) for (const st of ["c2", "c3", "c4_6", "c7_15", "c16p"]) {
    const ps = armPairs.filter((x) => x.grp === grp && x.stratum === st); if (ps.length < 8) continue;
    rep.pooledControls[`${grp}:${st}`] = { n: ps.length, ...Object.fromEntries(CONTROLS.map((k) => [k, Number(aucPN(ps.map((x) => ctlOf(x.pos)[k]), ps.map((x) => ctlOf(x.neg)[k])).toFixed(3))])) };
  }
  report.arms[arm] = rep;
  console.error(`${arm}: ${rep.days} days, ${rep.pairs} pairs`);
}
const out = JSON.stringify({ tag: TAG, tokens });
fs.mkdirSync(path.join(HERE, "data"), { recursive: true });
fs.writeFileSync(path.join(HERE, "data", "design.json"), out);
report.designSha256 = createHash("sha256").update(out).digest("hex"); report.tokens = tokens.length;
fs.writeFileSync(path.join(HERE, "results", "design-report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ designSha256: report.designSha256, tokens: tokens.length, pairs: Object.fromEntries(Object.entries(report.arms).map(([k, v]) => [k, v.pairs])) }));
