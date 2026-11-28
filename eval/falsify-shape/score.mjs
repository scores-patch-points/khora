import fs from "node:fs";
const gold = JSON.parse(fs.readFileSync("gold/gold.json", "utf8")), arm = process.argv[2], ans = new Map(JSON.parse(fs.readFileSync(`arms/${arm}.json`, "utf8")).map((a) => [a.id, a]));
const F = ["negated", "form", "agent", "patient"], T = Object.fromEntries(F.map((f) => [f, { correct: 0, wrong: 0, abstain: 0 }])), cat = {}, wrongs = [];
const norm = (x) => (x == null ? null : String(x).toLowerCase().trim());
for (const g of gold) { const a = ans.get(g.id) ?? {}; cat[g.category] ??= { correct: 0, wrong: 0, abstain: 0 };
  for (const f of F) { const v = a[f]; let r;
    if (v === "ABSTAIN" || v === undefined) r = "abstain";
    else if (f === "agent" || f === "patient") r = (g[f] === null ? norm(v) === null : g[f].includes(norm(v))) ? "correct" : "wrong";
    else r = v === g[f] ? "correct" : "wrong";
    T[f][r]++; cat[g.category][r]++; if (r === "wrong") wrongs.push(`${g.id}.${f}: got ${JSON.stringify(v)} want ${JSON.stringify(g[f])}`); } }
const tot = F.reduce((s, f) => ({ correct: s.correct + T[f].correct, wrong: s.wrong + T[f].wrong, abstain: s.abstain + T[f].abstain }), { correct: 0, wrong: 0, abstain: 0 });
console.log(JSON.stringify({ arm, total: tot, byField: T, byCategory: cat }, null, 1)); console.log("WRONG:", wrongs.join(" | "));
