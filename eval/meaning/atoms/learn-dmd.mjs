// learn-dmd.mjs — PREREG run 21b: the NLI thresholds for E (entailment te) and for C (contradiction tc) chosen by DMD (dmd-threshold.mjs), no
// cap, leave-one-set-out over the spent sets.
//   node eval/meaning/atoms/learn-dmd.mjs <run.txt> <nli.jsonl> <set=file.json>…
// run.txt: eval/meaning/run.mjs output with V=1 and arms atoms and nli (MEANING_ATOMS=1, MEANING_NLI): each arm prints its pairs as
// <id>:<label><verdict>; the nli arm's verdict C is the chain's own (grammar-ud, janus, the atom rules).
import fs from "node:fs";
import { dmdThreshold } from "./dmd-threshold.mjs";

const [, , runf, nf, ...sf] = process.argv, MODE = process.env.DMD_MODE ?? "accuracy";
const nli = new Map(fs.readFileSync(nf, "utf8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [`${r.set}:${r.id}`, r.nli]));
const meta = {}; for (const kv of sf) { const [s, f] = kv.split("="); for (const p of JSON.parse(fs.readFileSync(f, "utf8")).pairs) meta[`${s}:${p.id}`] = p; }
const arms = { atoms: new Map(), nli: new Map() }; let set = null, arm = null;
for (const l of fs.readFileSync(runf, "utf8").split("\n")) {
  let m = /^== (\S+) /.exec(l); if (m) { set = m[1]; continue; }
  m = /^ {2}(\S+)\s+accuracy/.exec(l); if (m) { arm = m[1]; continue; }
  if (arms[arm] && /^ {5}\S/.test(l)) for (const t of l.trim().split(/\s+/)) { const [id, lv] = t.split(":"); arms[arm].set(`${set}:${id}`, { label: lv[0], v: lv[1] }); }
}
const rows = [...arms.nli].filter(([k]) => nli.has(k)).map(([k, r]) => ({ k, set: k.split(":")[0], label: r.label, chain: r.v === "C", rules: arms.atoms.get(k)?.v, e: nli.get(k)[0], c: nli.get(k)[2], lang: meta[k]?.lang ?? "en", cross: /^cross/.test(meta[k]?.type ?? "") }));
const sets = [...new Set(rows.map((r) => r.set))], pct = (x, y) => (y ? (100 * x / y).toFixed(1) : "-") + "%";
const T = { n: 0, rulesOk: 0, eOk: 0, rulesFA: 0, eFA: 0, nonE: 0, rulesEacc: 0, eEacc: 0, E: 0, C: 0, chainC: 0, cNamed: 0, nonC: 0, chainFC: 0, cFC: 0 }, lang = { en: [0, 0, 0], non: [0, 0, 0] };
for (const s of sets) {
  const test = rows.filter((r) => r.set === s), train = rows.filter((r) => r.set !== s);
  // te: E against not-E among pairs the chain does not call C; tc: C against not-C among all
  const dE = dmdThreshold(train.filter((r) => !r.chain), { score: (r) => r.e, positive: (r) => r.label === "E", mode: MODE });
  const dC = dmdThreshold(train, { score: (r) => r.c, positive: (r) => r.label === "C", mode: MODE });
  const eCall = (r) => !r.chain && r.e >= dE.t, cCall = (r) => r.chain || r.c >= dC.t;
  let eOk = 0, rOk = 0, eFA = 0, rFA = 0, eAcc = 0, rAcc = 0;
  for (const r of test) { const isE = r.label === "E"; if (eCall(r) === isE) eOk++; if ((r.rules === "E") === isE) rOk++; if (!isE) { T.nonE++; if (eCall(r)) { eFA++; T.eFA++; } if (r.rules === "E") { rFA++; T.rulesFA++; } } else { T.E++; if (eCall(r)) T.eEacc++; if (r.rules === "E") T.rulesEacc++; } }
  const C = test.filter((r) => r.label === "C"), nc = test.filter((r) => r.label !== "C");
  T.n += test.length; T.rulesOk += rOk; T.eOk += eOk; T.C += C.length; T.chainC += C.filter((r) => r.chain).length; T.cNamed += C.filter(cCall).length; T.nonC += nc.length; T.chainFC += nc.filter((r) => r.chain).length; T.cFC += nc.filter(cCall).length;
  if (["fresh-ml", "fresh19", "fresh20"].includes(s)) for (const r of C) { const k = r.lang === "en" && !r.cross ? "en" : "non"; lang[k][0]++; if (cCall(r)) lang[k][1]++; if (r.chain) lang[k][2]++; }
  const dd = (d) => (d.gap ? `gap@${d.n}` : `${d.depth}/${d.n}`);
  console.log(`${s.padEnd(10)} te=${dE.t.toFixed(2)} (depth ${dd(dE)}) tc=${dC.t.toFixed(2)} (depth ${dd(dC)})  E acc rules ${pct(rOk, test.length)} → dmd ${pct(eOk, test.length)}, false-accept ${rFA}→${eFA} of ${test.filter((r) => r.label !== "E").length}   C named ${C.filter((r) => r.chain).length}→${C.filter(cCall).length} of ${C.length}, false-C ${nc.filter((r) => r.chain).length}→${nc.filter(cCall).length} of ${nc.length} (${pct(nc.filter(cCall).length, nc.length)})`);
}
console.log(`pooled E   accuracy rules ${pct(T.rulesOk, T.n)} → dmd ${pct(T.eOk, T.n)}   false-accept ${pct(T.rulesFA, T.nonE)} → ${pct(T.eFA, T.nonE)}   E accepted ${T.rulesEacc} → ${T.eEacc} of ${T.E}`);
console.log(`pooled C   named ${pct(T.chainC, T.C)} → ${pct(T.cNamed, T.C)} (${T.chainC}→${T.cNamed} of ${T.C})   false-C ${T.chainFC}→${T.cFC} of ${T.nonC} (${pct(T.cFC, T.nonC)})`);
console.log(`C4 (fresh-ml, fresh19, fresh20): English ${pct(lang.en[1], lang.en[0])} (chain ${pct(lang.en[2], lang.en[0])}, ${lang.en[0]} pairs), non-English/cross ${pct(lang.non[1], lang.non[0])} (chain ${pct(lang.non[2], lang.non[0])}, ${lang.non[0]} pairs)`);
const aE = dmdThreshold(rows.filter((r) => !r.chain), { score: (r) => r.e, positive: (r) => r.label === "E", mode: MODE }), aC = dmdThreshold(rows, { score: (r) => r.c, positive: (r) => r.label === "C", mode: MODE });
console.log(`all nine: te=${aE.t.toFixed(2)} (depth ${aE.gap ? "gap" : aE.depth}/${aE.n})  tc=${aC.t.toFixed(2)} (depth ${aC.gap ? "gap" : aC.depth}/${aC.n})`);
