// learn-swap.mjs — PREREG run 22a: E only when the NLI entailment reaches te AND the atoms show no role or direction swap (atom-support.js
// swapFlags); te from the false-accept share (dmd-threshold.mjs, mode pure) over the training pairs that are neither chain-C nor flagged;
// leave-one-set-out over the spent sets.
//   node eval/meaning/atoms/learn-swap.mjs <run21a.txt> <swap-dump.jsonl> <nli.jsonl> <set=file.json>…
import fs from "node:fs";
import { dmdThreshold } from "./dmd-threshold.mjs";

const [, , runf, dumpf, nf, ...sf] = process.argv;
const J = (f) => fs.readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const nli = new Map(J(nf).map((r) => [`${r.set}:${r.id}`, r.nli]));
const swap = new Map(J(dumpf).map((r) => [`${r.set}:${r.id}`, r.swaps ?? []]));
const meta = {}; for (const kv of sf) { const [s, f] = kv.split("="); for (const p of JSON.parse(fs.readFileSync(f, "utf8")).pairs) meta[`${s}:${p.id}`] = p; }
const arms = { atoms: new Map(), nli: new Map() }; let set = null, arm = null;
for (const l of fs.readFileSync(runf, "utf8").split("\n")) {
  let m = /^== (\S+) /.exec(l); if (m) { set = m[1]; continue; }
  m = /^ {2}(\S+)\s+accuracy/.exec(l); if (m) { arm = m[1]; continue; }
  if (arms[arm] && /^ {5}\S/.test(l)) for (const t of l.trim().split(/\s+/)) { const [id, lv] = t.split(":"); arms[arm].set(`${set}:${id}`, { label: lv[0], v: lv[1] }); }
}
const rows = [...arms.nli].filter(([k]) => nli.has(k)).map(([k, r]) => ({ k, set: k.split(":")[0], label: r.label, chain: r.v === "C", rules: arms.atoms.get(k)?.v, e: nli.get(k)[0], swaps: swap.get(k) ?? [], lang: meta[k]?.lang ?? "en", cross: /^cross/.test(meta[k]?.type ?? "") }));
const sets = [...new Set(rows.map((r) => r.set))], pct = (x, y) => (y ? (100 * x / y).toFixed(1) : "-") + "%";
const T = { n: 0, rOk: 0, aOk: 0, bOk: 0, nonE: 0, rFA: 0, aFA: 0, bFA: 0, E: 0, rE: 0, aE: 0, bE: 0, aAcc: 0, bAcc: 0, flagged: 0, flaggedE: 0 }, per = {};
for (const s of sets) {
  const test = rows.filter((r) => r.set === s), train = rows.filter((r) => r.set !== s && !r.chain);
  const dN = dmdThreshold(train, { score: (r) => r.e, positive: (r) => r.label === "E", mode: "pure" });                     // NLI alone (21c)
  const dS = dmdThreshold(train.filter((r) => !r.swaps.length), { score: (r) => r.e, positive: (r) => r.label === "E", mode: "pure" }); // NLI and no swap
  const aCall = (r) => !r.chain && r.e >= dN.t, bCall = (r) => !r.chain && !r.swaps.length && r.e >= dS.t;
  for (const r of test) { const isE = r.label === "E"; T.n++; if ((r.rules === "E") === isE) T.rOk++; if (aCall(r) === isE) T.aOk++; if (bCall(r) === isE) T.bOk++;
    if (isE) { T.E++; if (r.rules === "E") T.rE++; if (aCall(r)) T.aE++; if (bCall(r)) T.bE++; } else { T.nonE++; if (r.rules === "E") T.rFA++; if (aCall(r)) T.aFA++; if (bCall(r)) T.bFA++; }
    if (r.swaps.length) { T.flagged++; if (isE) T.flaggedE++; }
    const k = r.cross ? "cross" : r.lang; const o = (per[k] ??= { n: 0, ok: 0, E: 0, Ea: 0, fa: 0, nn: 0 }); o.n++; if (bCall(r) === isE) o.ok++; if (isE) { o.E++; if (bCall(r)) o.Ea++; } else { o.nn++; if (bCall(r)) o.fa++; } }
  const nE = test.filter((r) => r.label !== "E").length;
  console.log(`${s.padEnd(10)} te(nli) ${dN.t.toFixed(2)} te(nli+swap) ${dS.t.toFixed(2)} (depth ${dS.gap ? "gap" : dS.depth}/${dS.n})  flagged ${test.filter((r) => r.swaps.length).length} (E ${test.filter((r) => r.swaps.length && r.label === "E").length})   acc rules ${pct(test.filter((r) => (r.rules === "E") === (r.label === "E")).length, test.length)} → nli+swap ${pct(test.filter((r) => bCall(r) === (r.label === "E")).length, test.length)}   FA ${test.filter((r) => r.rules === "E" && r.label !== "E").length}→${test.filter((r) => bCall(r) && r.label !== "E").length} of ${nE}   E ${test.filter((r) => r.rules === "E" && r.label === "E").length}→${test.filter((r) => bCall(r) && r.label === "E").length} of ${test.filter((r) => r.label === "E").length}`);
}
const share = (fa, e) => pct(fa, fa + e);
console.log(`pooled   accuracy rules ${pct(T.rOk, T.n)} | nli(21c) ${pct(T.aOk, T.n)} | nli+swap ${pct(T.bOk, T.n)}`);
console.log(`         false-accept (of ${T.nonE} not-E) rules ${pct(T.rFA, T.nonE)} | nli ${pct(T.aFA, T.nonE)} | nli+swap ${pct(T.bFA, T.nonE)}   E accepted (of ${T.E}) rules ${T.rE} | nli ${T.aE} | nli+swap ${T.bE}`);
console.log(`         unsupported share of accepted: rules ${share(T.rFA, T.rE)} | nli ${share(T.aFA, T.aE)} | nli+swap ${share(T.bFA, T.bE)}   swap flag on ${T.flagged} pairs, ${T.flaggedE} of them E`);
console.log("per language (nli+swap):", Object.entries(per).map(([k, o]) => `${k} ${pct(o.ok, o.n)} (E ${o.Ea}/${o.E}, fa ${o.fa}/${o.nn})`).join(" · "));
