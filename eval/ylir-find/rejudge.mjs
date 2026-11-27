// rejudge.mjs — re-score every arm's answers (results-answers-dev*.json) with the whole-word rule of answer-probe.mjs, the same for each arm. Reads only the results files and answers-dev.json.
//   node eval/ylir-find/rejudge.mjs
import fs from "node:fs"; import path from "node:path";
const HERE = path.dirname(new URL(import.meta.url).pathname), AD = JSON.parse(fs.readFileSync(path.join(HERE, "answers-dev.json"), "utf8")), AF = JSON.parse(fs.readFileSync(path.join(HERE, "answers-facts.json"), "utf8"));
const wordsOf = (t) => { const out = []; let cur = ""; for (const ch of String(t ?? "").toLowerCase()) { if (ch !== ch.toUpperCase() || (ch >= "0" && ch <= "9") || ch === "-" || ch === "’" || ch === "'") cur += ch; else { if (cur) out.push(cur); cur = ""; } } if (cur) out.push(cur); return out; };
for (const f of fs.readdirSync(HERE).filter((x) => /^results-answers-.*\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")), A = d.set === "facts" ? AF : AD, t = { right: 0, wrong: 0, gap: 0 }, rows = [];
  for (const r of d.results) { const acc = A.scored[r.q]; if (!acc) continue; const v = !r.answer ? "gap" : wordsOf(r.answer).some((w) => acc.includes(w)) ? "right" : "wrong"; t[v]++; rows.push(`${v.padEnd(5)} ${r.q.slice(0, 40).padEnd(40)} ${r.answer ?? ""}`.slice(0, 120)); }
  const ctl = d.results.filter((r) => d.controls?.some((c) => c.q === r.q)).map((r) => (r.answer ? "WRONG" : "gap"));
  console.log(`${f}: right ${t.right}, wrong ${t.wrong}, gap ${t.gap} of ${t.right + t.wrong + t.gap}; controls ${ctl.join(",")}`); if (process.env.SHOW) console.log(rows.join("\n"));
}
