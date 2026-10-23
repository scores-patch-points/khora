// learn-nli.mjs — a local multilingual NLI model's scores (MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli; sentence as premise, claim as
// hypothesis) as a feature of the atom matcher, leave-one-set-out cross-validated (PREREG run 20b). Three arms per held-out set:
//   rules   the atom verdict as dumped (grammar-ud's verdict unless the atoms say E or C)
//   nli     E when the entailment probability reaches a threshold chosen on the other sets (best accuracy with false accepts at most 10%)
//   matcher the atom matcher (atom-match.js) with the NLI scores as one more unit of the pair
//   node eval/meaning/atoms/learn-nli.mjs <units.jsonl> <nli.jsonl> [out.json]
import fs from "node:fs";
import path from "node:path";
import { trainMatcher, decide } from "../../../native/kernel/atom-match.js";

const [, , uf, nf, out = path.join(path.dirname(new URL(import.meta.url).pathname), "atom-matcher-nli.json")] = process.argv;
const J = (f) => fs.readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const nli = new Map(J(nf).map((r) => [`${r.set}:${r.id}`, r.nli]));
const band = (x) => (x < 0.2 ? "0" : x < 0.4 ? "1" : x < 0.6 ? "2" : x < 0.8 ? "3" : x < 0.95 ? "4" : "5");
const rows = J(uf).filter((r) => nli.has(`${r.set}:${r.id}`)).map((r) => {
  const [e, n, c] = nli.get(`${r.set}:${r.id}`), lp = r.lang === "en" ? "same" : "x"; // a cross-language pair has an English claim over a source in another language
  return { ...r, e, c, units: [...(r.units ?? []), { what: "nli", options: [[`n:e=${band(e)}`, `n:c=${band(c)}`, `n:e=${band(e)}:${r.lang}`, `n:e=${band(e)}:${lp}`, "n:bias"]] }] };
});
const sets = [...new Set(rows.map((r) => r.set))];
const NEGW = +(process.env.NEGW ?? 3), opt = { epochs: 12, margin: 1, negWeight: NEGW };
const verdict = { rules: (r) => (r.rule === "C" ? "C" : r.rule === "E" ? "E" : r.base) };
const stats = (rs, f) => { let acc = 0, fa = 0, nn = 0, ea = 0, ne = 0; for (const r of rs) { const said = f(r) === "E"; if ((r.label === "E") === said) acc++; if (r.label === "E") { ne++; if (said) ea++; } else { nn++; if (said) fa++; } } return { n: rs.length, acc: 100 * acc / rs.length, fa: 100 * fa / Math.max(1, nn), ea, ne }; };
const fmt = (s) => `${s.acc.toFixed(1)}% fa ${s.fa.toFixed(0)}% E ${s.ea}/${s.ne}`;
// the threshold: best accuracy on the training rows with at most FACAP (default 10) % false accepts
const pick = (rs) => { let best = 0.99, bv = -1; for (let t = 0.3; t <= 0.995; t += 0.01) { const s = stats(rs, (r) => (r.e >= t ? "E" : "N")); if (s.fa <= +(process.env.FACAP ?? 10) && s.acc > bv) { bv = s.acc; best = t; } } return best; };
const T = { rules: 0, nli: 0, matcher: 0, n: 0 }, fa = { rules: [0, 0], nli: [0, 0], matcher: [0, 0] };
for (const s of sets) {
  const test = rows.filter((r) => r.set === s), train = rows.filter((r) => r.set !== s);
  const t = pick(train), M = trainMatcher(train.map((r) => ({ units: r.units, label: r.label })), opt);
  const arms = { rules: verdict.rules, nli: (r) => (r.rule === "C" ? "C" : r.e >= t ? "E" : "N"), matcher: (r) => (r.rule === "C" ? "C" : decide(r.units, M.w).ok ? "E" : r.base) };
  const st = Object.fromEntries(Object.entries(arms).map(([k, f]) => [k, stats(test, f)]));
  for (const k of Object.keys(arms)) { T[k] += st[k].acc * st[k].n; const nn = test.filter((r) => r.label !== "E"); fa[k][0] += nn.filter((r) => arms[k](r) === "E").length; fa[k][1] += nn.length; }
  T.n += test.length;
  console.log(`${s.padEnd(10)} n=${String(test.length).padStart(3)}  rules ${fmt(st.rules)} | nli(t=${t.toFixed(2)}) ${fmt(st.nli)} | matcher+nli ${fmt(st.matcher)}`);
}
console.log(`pooled     rules ${(T.rules / T.n).toFixed(1)}% fa ${(100 * fa.rules[0] / fa.rules[1]).toFixed(1)}% | nli ${(T.nli / T.n).toFixed(1)}% fa ${(100 * fa.nli[0] / fa.nli[1]).toFixed(1)}% | matcher+nli ${(T.matcher / T.n).toFixed(1)}% fa ${(100 * fa.matcher[0] / fa.matcher[1]).toFixed(1)}%`);
const M = trainMatcher(rows.map((r) => ({ units: r.units, label: r.label })), opt);
fs.writeFileSync(out, JSON.stringify({ ...M, trained: sets, opt, nliThreshold: pick(rows) }) + "\n");
console.log(`wrote ${out}`);
