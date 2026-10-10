// eval/law/provisional/ablation-scope/strata-table.mjs — DESCRIPTIVE table: AUC of the frozen scores in EVERY local-count stratum, per corpus and group, for discovery round 2 and for confirmation.
//
//   node strata-table.mjs --data DIR --out FILE [--B 300]
//
// ═══ PRE-REGISTRATION (post hoc, descriptive: no test, no verdict, no threshold; written before this script was first run) ═══
// PURPOSE. The confirmation tested each rule only inside its frozen scope. The scope question ("where does it hold, where does it fade") needs every stratum. This prints, for each (corpus, group, stratum):
// n pairs, the oriented AUC with a 95% cluster-bootstrap interval of S_ENTRY, NONNULL, c.dSelf (sign + in group B, - in group A, as frozen), c.surprisalDestroyed (+), and the share of names / unlabelled tokens
// with S_ENTRY > 0 (the one-sided detector). Orientation = the frozen sign of the confirmation candidates; nothing is re-fitted. Pair-weighted rows at the end pool c4_6..c16p.
// The fragility hypothesis of NAME-RULE-RESULTS.md predicts AUC highest at c2/c3 and falling with c; the slot arm is predicted (from discovery) to rise with c; the company arm is predicted flat or falling.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadRows, buildPairs, cellPairs } from "./features.mjs";
import { vec, indexOfName } from "./components.mjs";
import { aucPairs, bootStrat, round } from "./stats.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt("--data", "data/confirmation"), OUTF = opt("--out", "results/strata-table.confirmation.json"), B = Number(opt("--B", 300));
const ST = ["c2", "c3", "c4_6", "c7_15", "c16p"], J = { dSelf: indexOfName("c.dSelf"), sd: indexOfName("c.surprisalDestroyed") };
const pairs = buildPairs(loadRows(DATA)); for (const x of pairs) { x.p.v = vec(x.p.raw.rec); x.n.v = vec(x.n.raw.rec); }
const out = { data: DATA, B, cells: {} };
for (const kind of [...new Set(pairs.map((p) => p.kind))]) for (const grp of ["A", "B"]) {
  const by = cellPairs(pairs, kind, grp, ST), sgn = grp === "A" ? -1 : 1;
  const scores = { S_ENTRY: (m) => m.S_ENTRY, NONNULL: (m) => m.NONNULL, dSelf: (m) => sgn * m.v[J.dSelf], surprisalDestroyed: (m) => m.v[J.sd] };
  const rows = {};
  for (const st of ST) {
    const ps = by[st]; if (ps.length < 10) continue;
    const r = { n: ps.length, entryPositive: [round(ps.filter((x) => x.p.S_ENTRY > 0).length / ps.length, 3), round(ps.filter((x) => x.n.S_ENTRY > 0).length / ps.length, 3)] };
    for (const [name, f] of Object.entries(scores)) { const b = bootStrat({ [st]: ps }, f, { B, seed: 31 }); r[name] = [b.point, b.lo, b.hi]; }
    rows[st] = r;
  }
  const hi = Object.fromEntries(["c4_6", "c7_15", "c16p"].filter((s) => by[s].length >= 10).map((s) => [s, by[s]]));
  if (Object.keys(hi).length) { rows["c4_6..c16p"] = { n: Object.values(hi).flat().length }; for (const [name, f] of Object.entries(scores)) { const b = bootStrat(hi, f, { B, seed: 32 }); rows["c4_6..c16p"][name] = [b.point, b.lo, b.hi]; } }
  out.cells[`${kind}.${grp}`] = rows;
}
out.headerSha256 = createHash("sha256").update(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("// ═══ END OF PRE-REGISTRATION")[0]).digest("hex");
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
for (const [k, rows] of Object.entries(out.cells)) { console.log(`== ${k}`); for (const [st, r] of Object.entries(rows)) console.log(`  ${st.padEnd(11)} n=${String(r.n).padStart(4)} S_ENTRY ${r.S_ENTRY[0]} [${r.S_ENTRY[1]},${r.S_ENTRY[2]}]  dSelf* ${r.dSelf[0]} [${r.dSelf[1]},${r.dSelf[2]}]  surprDestr ${r.surprisalDestroyed[0]} [${r.surprisalDestroyed[1]},${r.surprisalDestroyed[2]}]  nonNull ${r.NONNULL[0]}  entry>0 names/unl ${r.entryPositive ? r.entryPositive.join("/") : ""}`); }
