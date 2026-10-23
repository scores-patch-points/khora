// learn-nli-c.mjs — the NLI model's contradiction probability to name C (PREREG run 21a), leave-one-set-out over the spent sets.
//   node eval/meaning/atoms/learn-nli-c.mjs <run.txt> <nli.jsonl> <set=file.json>…
// run.txt: eval/meaning/run.mjs output with V=1 and the "nli" arm (MEANING_NLI), which prints each pair as <id>:<label><verdict>; a verdict C
// there is the chain's own (grammar-ud, janus, the atom rules). tc: the lowest threshold whose false-C rate (E and T pairs called C) on the
// training sets is at most 5%. Reported per held-out set and pooled: C named by the chain alone and with the NLI score, false-C rates, the
// E pairs lost to a false C, and the non-English / English split.
import fs from "node:fs";

const [, , runf, nf, ...sf] = process.argv, CAP = +(process.env.CAP ?? 5);
const nli = new Map(fs.readFileSync(nf, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [`${r.set}:${r.id}`, r.nli]));
const files = Object.fromEntries(sf.map((x) => x.split("=")));
const meta = {}; for (const [s, f] of Object.entries(files)) for (const p of JSON.parse(fs.readFileSync(f, "utf8")).pairs) meta[`${s}:${p.id}`] = p;
// run.txt: "== set (...)" opens a set; arm lines open an arm; the line after "nli" arm header with five spaces holds its rows
const rows = []; let set = null, arm = null;
for (const l of fs.readFileSync(runf, "utf8").split("\n")) {
  let m = /^== (\S+) /.exec(l); if (m) { set = m[1]; continue; }
  m = /^ {2}(\S+)\s+accuracy/.exec(l); if (m) { arm = m[1]; continue; }
  if (arm === "nli" && /^ {5}\S/.test(l)) for (const t of l.trim().split(/\s+/)) { const [id, lv] = t.split(":"); const k = `${set}:${id}`; if (nli.has(k)) rows.push({ set, id, label: lv[0], chain: lv[1] === "C", c: nli.get(k)[2], e: nli.get(k)[0], lang: meta[k]?.lang ?? "en", cross: /^cross/.test(meta[k]?.type ?? "") }); }
}
const sets = [...new Set(rows.map((r) => r.set))];
const isC = (r) => r.label === "C";
const rate = (rs, f, pick) => { const d = rs.filter(pick); return d.length ? d.filter(f).length / d.length : 0; };
const pickT = (train) => { let best = 1.01; for (let t = 1; t >= 0.2; t -= 0.01) { const fc = rate(train, (r) => r.chain || r.c >= t, (r) => !isC(r)); if (fc <= CAP / 100) best = t; else break; } return best; };
const tot = { n: 0, C: 0, chain: 0, withNli: 0, nonC: 0, falseChain: 0, falseNli: 0, E: 0, Elost: 0 }, lang = { en: [0, 0, 0], non: [0, 0, 0] };
for (const s of sets) {
  const test = rows.filter((r) => r.set === s), train = rows.filter((r) => r.set !== s), t = pickT(train);
  const call = (r) => r.chain || r.c >= t;
  const C = test.filter(isC), nc = test.filter((r) => !isC(r)), E = test.filter((r) => r.label === "E");
  const a = C.filter((r) => r.chain).length, b = C.filter(call).length, fc0 = nc.filter((r) => r.chain).length, fc1 = nc.filter(call).length;
  tot.C += C.length; tot.chain += a; tot.withNli += b; tot.nonC += nc.length; tot.falseChain += fc0; tot.falseNli += fc1; tot.E += E.length; tot.Elost += E.filter(call).length - E.filter((r) => r.chain).length;
  for (const r of C.filter((r) => ["fresh-ml", "fresh19", "fresh20"].includes(s))) { const k = r.lang === "en" && !r.cross ? "en" : "non"; lang[k][0]++; if (call(r)) lang[k][1]++; if (r.chain) lang[k][2]++; }
  console.log(`${s.padEnd(10)} tc=${t.toFixed(2)}  C named ${a}→${b} of ${C.length}   false-C ${fc0}→${fc1} of ${nc.length} (${(100 * fc1 / Math.max(1, nc.length)).toFixed(0)}%)`);
}
const pc = (x, y) => `${(100 * x / y).toFixed(1)}%`;
console.log(`pooled     C named ${tot.chain}→${tot.withNli} of ${tot.C} (${pc(tot.chain, tot.C)} → ${pc(tot.withNli, tot.C)}, +${(100 * (tot.withNli - tot.chain) / tot.C).toFixed(1)} points)   false-C ${tot.falseChain}→${tot.falseNli} of ${tot.nonC} (${pc(tot.falseNli, tot.nonC)})   E lost to a false C: ${tot.Elost} of ${tot.E}`);
console.log(`C4 (fresh-ml, fresh19, fresh20 only): English C named ${pc(lang.en[1], lang.en[0])} (chain ${pc(lang.en[2], lang.en[0])}, ${lang.en[0]} pairs)   non-English or cross ${pc(lang.non[1], lang.non[0])} (chain ${pc(lang.non[2], lang.non[0])}, ${lang.non[0]} pairs)`);
const all = pickT(rows); console.log(`tc on all nine: ${all.toFixed(2)}`);
