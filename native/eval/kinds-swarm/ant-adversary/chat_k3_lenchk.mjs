// ant-adversary / chat_k3_lenchk.mjs — attack (b)/(c) on ant-kinds-chat K3: their kind-mate negatives (tag NK) include 1-2 character forms the reader cannot see (null by construction) and are less often message-initial than the positives.
// Uses THEIR rows (results/rows.irc.*.single*.jsonl, read-only). Fitted arms: leave-one-day-out ridge CV (their learner), IMP = sig+atm, LOC = [log1p inWin, log dayCount, initial, i].
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cvScores, aucOf } from "../../law/name-war-and-peace.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), RES = path.join(HERE, "..", "ant-kinds-chat", "results");
const rows = []; for (const f of fs.readdirSync(RES).filter((x) => /^rows\.irc\..*single.*\.jsonl$/.test(x))) for (const l of fs.readFileSync(path.join(RES, f), "utf8").split("\n")) { if (!l) continue; try { rows.push(JSON.parse(l)); } catch { /* skip */ } }
const fam = { P: [], NP: [], NK: [], NR: [] };
for (const r of rows) for (const t of r.tags) { const p = t.split(":")[0]; if (fam[p]) fam[p].push({ ...r, pair: t.split(":").slice(1).join(":") }); }
const imp = (r) => [...r.rec.sig, ...r.rec.atm], loc = (r) => [Math.log1p(r.inWin), Math.log(r.dayCount), r.i === 0 ? 1 : 0, r.i];
const round = (x) => (x == null ? null : Number(x.toFixed(3)));
function run(name, P, N) {
  const rs = [...P.map((r) => ({ ...r, y: 1 })), ...N.map((r) => ({ ...r, y: 0 }))], y = rs.map((r) => r.y), blk = rs.map((r) => r.day);
  const a = (f) => round(aucOf(cvScores(rs.map(f), y, blk), y));
  return { name, nPos: P.length, nNeg: N.length, IMP: a(imp), LOC: a(loc), IMPLOC: a((r) => [...loc(r), ...imp(r)]), initPos: round(P.filter((r) => r.i === 0).length / P.length), initNeg: round(N.filter((r) => r.i === 0).length / N.length), meanLenPos: round(P.reduce((s, r) => s + r.form.length, 0) / P.length), meanLenNeg: round(N.reduce((s, r) => s + r.form.length, 0) / N.length) };
}
const L3 = (r) => [...r.form].length >= 3, INIT = (r) => r.i === 0;
const out = [
  run("P vs NK (all kind-mates)", fam.P, fam.NK),
  run("P vs NK, negatives >= 3 chars", fam.P, fam.NK.filter(L3)),
  run("P vs NK, negatives >= 3 chars AND initial; positives initial", fam.P.filter(INIT), fam.NK.filter((r) => L3(r) && INIT(r))),
  run("P vs NP (pooled), all", fam.P, fam.NP),
  run("P vs NP, negatives >= 3 chars", fam.P, fam.NP.filter(L3)),
  run("P non-initial vs NP >= 3 chars non-initial", fam.P.filter((r) => !INIT(r)), fam.NP.filter((r) => L3(r) && !INIT(r))),
];
fs.mkdirSync(path.join(HERE, "results"), { recursive: true }); fs.writeFileSync(path.join(HERE, "results", "chat_k3_lenchk.json"), JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
