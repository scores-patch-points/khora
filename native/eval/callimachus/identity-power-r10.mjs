#!/usr/bin/env node
// eval/callimachus/identity-power-r9.mjs — the ninth registration, exactly as pre-registered in GRAIN-R9-PREREG.md.
//   [amendment 1: planted twin INSIDE a neighbourhood of the top-20 other name nodes, each capped at 192 mentions]
//   [R10: random 2n of the node's whole list, 19 seeds, n in {48, 96}]
//   node native/eval/callimachus/identity-power-r10.mjs --text <pg2600.txt> --out <results.json>
// COMMITTED BEFORE IT IS RUN, and not edited after. Reads --text, writes only --out. No model.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeIdentityInduction } from "../../kernel/identity-induction.js";
import { capitalisedRuns } from "../../organs/callimachus.js";
import { splitSentences } from "../../adapters/text/spans.js";

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const TEXT = arg("--text"), OUT = arg("--out");
if (!TEXT || !OUT) { console.error("usage: --text <file> --out <results.json>"); process.exit(2); }
const raw = readFileSync(TEXT);
const text = raw.toString("utf8");
const OPTS = { draws: 199, alpha: 0.05, seed: 20261014, minOccurrences: 3, resolution: 1, maxHop: 1, smooth: 1, minFeatureCount: 1 };
const SIZES = [6, 12, 24, 48, 96, 192];
const DET = new Set(["the", "a", "an"]);
const clean = (t) => t.replace(/^[("'“‘\[]+|[)"'”’\],.;:!?]+$/g, "").replace(/['’]s$/i, "");
const keyOf = (run) => { const t = run.map(clean).filter(Boolean); while (t.length > 1 && DET.has(t[0].toLowerCase())) t.shift(); return t.join(" "); };

// the corpus's own attestation: a token that occurs lowercase anywhere is not part of a name
const lower = new Set((text.match(/\p{Ll}[\p{L}'’-]*/gu) ?? []).map((w) => w.toLowerCase()));
const isName = (k) => k.split(/\s+/).every((t) => !lower.has(t.toLowerCase().replace(/['’]s$/, "")) && /^\p{Lu}/u.test(t));

const mentions = new Map();
for (const sent of splitSentences(text)) {
  const runs = capitalisedRuns(sent.text ?? "").map(keyOf).filter((k) => k.length > 1);
  runs.forEach((k, i) => {
    const feats = [...new Set(runs.filter((_, j) => j !== i && runs[j] !== k))].map((o) => ({ f: `w:${o}`, hop: 1 }));
    if (!mentions.has(k)) mentions.set(k, []);
    mentions.get(k).push(feats);
  });
}
const ranked = [...mentions].filter(([k]) => isName(k)).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1));
const names = ranked.slice(0, 3);
const CAP = 192, TOPK = 20;
const around = (...exclude) => new Map(ranked.slice(0, TOPK + exclude.length).filter(([k]) => !exclude.includes(k)).slice(0, TOPK).map(([k, v]) => [k, v.slice(0, CAP)]));
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const isBound = (v) => v === "BOUND" || v === "bound";
const judge = (rec, a, b) => {
  const r = makeIdentityInduction(rec, { ...OPTS, namesNode: () => null }).judge(a, b);
  return { verdict: r.verdict, reason: r.reason ?? null, read: r.read ?? null, tests: r.tests ? { worlds: r.tests.worlds?.match ?? null, weightA: r.tests.weight?.a?.carries ?? null, weightB: r.tests.weight?.b?.carries ?? null, consequenceAligned: r.tests.consequence?.aligned ?? null, settled: r.tests.bound?.settled ?? null } : null };
};
const results = { prereg: "native/eval/callimachus/GRAIN-R10-PREREG.md", textSha256: createHash("sha256").update(raw).digest("hex"), declared: OPTS, sizes: SIZES, nodes: names.map(([k, v]) => ({ name: k, mentions: v.length })), twins: [], different: [], shuffles: [], predictions: {} };

results.draws = [];
for (const [name, occ] of names) for (const n of [48, 96]) {
  let boundN = 0; const rows = [];
  for (let s = 1; s <= 19; s++) {
    const rnd = mulberry(1000 + s);
    const idx = occ.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const take = idx.slice(0, 2 * n).sort((x, y) => x - y).map((i) => occ[i]);
    const rec = new Map([...around(name), [`${name}#a`, take.filter((_, i) => i % 2 === 0)], [`${name}#b`, take.filter((_, i) => i % 2 === 1)]]);
    const ind = makeIdentityInduction(rec, { ...OPTS, namesNode: () => null });
    const r = ind.judge(`${name}#a`, `${name}#b`);
    const c = r.tests?.consequence;
    rows.push({ seed: 1000 + s, verdict: r.verdict, reason: r.reason ?? null, worlds: r.tests?.worlds?.match ?? null, weightA: r.tests?.weight?.a?.carries ?? null, weightB: r.tests?.weight?.b?.carries ?? null, aligned: c?.aligned ?? null, margin: c ? c.observed - c.ceiling : null });
    if (isBound(r.verdict)) boundN++;
  }
  results.draws.push({ name, n, bound: boundN, of: 19, rows });
}
const P = results.predictions;
const g = (nm, n) => results.draws.find((d) => d.name === nm && d.n === n);
const [pn, nn, fn] = names.map(([k]) => k);
P.N1 = { pierre: g(pn, 96).bound, french: g(fn, 96).bound, holds: g(pn, 96).bound >= 15 && g(fn, 96).bound >= 15 };
P.N2 = { natasha: g(nn, 96).bound, holds: g(nn, 96).bound <= 4 };
const unb = g(nn, 96).rows.concat(g(nn, 48).rows).filter((r) => !isBound(r.verdict));
P.N3 = { unboundDraws: unb.length, otherFailing: unb.filter((r) => !(r.worlds && r.weightA && r.weightB && r.aligned === false)).length };
P.N3.holds = P.N3.otherFailing === 0;
P.reported = { perNameN: results.draws.map((d) => ({ name: d.name, n: d.n, bound: d.bound })) };
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ nodes: results.nodes, predictions: P }, null, 1));
