// learn-match.mjs — train the atom matcher (native/kernel/atom-match.js) on the pair sets' labels, leave-one-set-out cross-validated, and
// write the model trained on every set. Input: the units run.mjs dumps (MEANING_ATOMS=1 MEANING_ATOMS_UNITS=<file.jsonl>).
//   node eval/meaning/atoms/learn-match.mjs <units.jsonl> [out.json]
// Per held-out set: the arm's accuracy, false accepts and E accepted with the rules (as dumped) and with the matcher trained on the others.
import fs from "node:fs";
import path from "node:path";
import { trainMatcher, decide } from "../../../native/kernel/atom-match.js";

const [, , file, out = path.join(path.dirname(new URL(import.meta.url).pathname), "atom-matcher.json")] = process.argv;
const rows = fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const sets = [...new Set(rows.map((r) => r.set))];
const opt = { epochs: +(process.env.EPOCHS ?? 12), margin: +(process.env.MARGIN ?? 1), negWeight: +(process.env.NEGW ?? 1) };
// the arm: grammar-ud's verdict (base), unless the atoms say C (the rules) or E
const armOf = (r, model) => (r.rule === "C" ? "C" : model ? (decide(r.units, model.w).ok ? "E" : r.base) : r.rule === "E" ? "E" : r.base);
const stats = (rs, model) => { let acc = 0, fa = 0, nn = 0, ea = 0, ne = 0; for (const r of rs) { const v = armOf(r, model), said = v === "E"; if ((r.label === "E") === said) acc++; if (r.label === "E") { ne++; if (said) ea++; } else { nn++; if (said) fa++; } } return { n: rs.length, acc: +(100 * acc / rs.length).toFixed(1), fa: +(100 * fa / Math.max(1, nn)).toFixed(1), ea: `${ea}/${ne}` }; };
const ex = (rs) => rs.map((r) => ({ units: r.units ?? [], label: r.label }));
let tot = { rule: 0, learned: 0, n: 0 };
for (const s of sets) {
  const test = rows.filter((r) => r.set === s), train = rows.filter((r) => r.set !== s);
  const m = trainMatcher(ex(train), opt), a = stats(test, null), b = stats(test, m);
  tot.rule += a.acc * a.n; tot.learned += b.acc * b.n; tot.n += a.n;
  console.log(`${s.padEnd(10)} n=${String(a.n).padStart(3)}  rules ${a.acc}% fa ${a.fa}% E ${a.ea}   learned ${b.acc}% fa ${b.fa}% E ${b.ea}`);
}
console.log(`pooled     rules ${(tot.rule / tot.n).toFixed(1)}%   learned ${(tot.learned / tot.n).toFixed(1)}%`);
const M = trainMatcher(ex(rows), opt);
fs.writeFileSync(out, JSON.stringify({ ...M, trained: sets, opt }, null, 0) + "\n");
console.log(`wrote ${out} (${Object.keys(M.w).length} weights)`);
