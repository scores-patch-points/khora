#!/usr/bin/env node
// eval/callimachus/identity-power-r9.mjs — the ninth registration, exactly as pre-registered in GRAIN-R9-PREREG.md.
//   node native/eval/callimachus/identity-power-r9.mjs --text <pg2600.txt> --out <results.json>
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
const names = [...mentions].filter(([k]) => isName(k)).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1)).slice(0, 3);
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const isBound = (v) => v === "BOUND" || v === "bound";
const judge = (rec, a, b) => {
  const r = makeIdentityInduction(rec, { ...OPTS, namesNode: () => null }).judge(a, b);
  return { verdict: r.verdict, reason: r.reason ?? null, read: r.read ?? null, tests: r.tests ? { worlds: r.tests.worlds?.match ?? null, weightA: r.tests.weightA?.ok ?? r.tests.weightA ?? null, weightB: r.tests.weightB?.ok ?? r.tests.weightB ?? null, consequenceAligned: r.tests.consequence?.aligned ?? r.tests.consequenceAligned ?? null } : null };
};
const results = { prereg: "native/eval/callimachus/GRAIN-R9-PREREG.md", textSha256: createHash("sha256").update(raw).digest("hex"), declared: OPTS, sizes: SIZES, nodes: names.map(([k, v]) => ({ name: k, mentions: v.length })), twins: [], different: [], shuffles: [], predictions: {} };

for (const [name, occ] of names) for (const n of SIZES) {
  if (occ.length < 2 * n) { results.twins.push({ name, n, skipped: `only ${occ.length} mentions` }); continue; }
  const take = occ.slice(0, 2 * n);
  const rec = new Map([[`${name}#a`, take.filter((_, i) => i % 2 === 0)], [`${name}#b`, take.filter((_, i) => i % 2 === 1)]]);
  results.twins.push({ name, n, ...judge(rec, `${name}#a`, `${name}#b`) });
}
for (const n of SIZES) for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const [ka, oa] = names[i], [kb, ob] = names[j];
  if (oa.length < n || ob.length < n) { results.different.push({ a: ka, b: kb, n, skipped: true }); continue; }
  results.different.push({ a: ka, b: kb, n, ...judge(new Map([[ka, oa.slice(0, n)], [kb, ob.slice(0, n)]]), ka, kb) });
}
for (const n of SIZES) {
  let bound = 0, tried = 0;
  const [, oa] = names[0], [, ob] = names[1];
  if (oa.length < n || ob.length < n) { results.shuffles.push({ n, skipped: true }); continue; }
  for (let s = 1; s <= 19; s++) {
    const rnd = mulberry(900 + s);
    const pool = [...oa.slice(0, n), ...ob.slice(0, n)];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const r = judge(new Map([["S#1", pool.slice(0, n)], ["S#2", pool.slice(n)]]), "S#1", "S#2");
    tried++; if (isBound(r.verdict)) bound++;
  }
  results.shuffles.push({ n, seeds: tried, bound });
}

const P = results.predictions;
const byName = (nm) => results.twins.filter((t) => t.name === nm && !t.skipped).sort((a, b) => a.n - b.n);
P.P1 = { perName: names.map(([k]) => ({ name: k, smallestBoundN: byName(k).find((t) => isBound(t.verdict))?.n ?? null })) };
P.P1.holds = P.P1.perName.every((x) => x.smallestBoundN !== null);
P.P2 = { perName: names.map(([k]) => { const s = byName(k); const i = s.findIndex((t) => isBound(t.verdict)); return { name: k, flipsBack: i < 0 ? null : s.slice(i).some((t) => !isBound(t.verdict)) }; }) };
P.P2.holds = P.P2.perName.every((x) => x.flipsBack === false);
P.P3 = { anyBound: results.different.filter((d) => !d.skipped && isBound(d.verdict)).map((d) => `${d.a} | ${d.b} @${d.n}`) };
P.P3.holds = P.P3.anyBound.length === 0;
P.P4 = { perN: results.shuffles.map((s) => ({ n: s.n, bound: s.bound ?? null })), holds: results.shuffles.every((s) => s.skipped || s.bound <= 1) };
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(JSON.stringify({ nodes: results.nodes, predictions: P }, null, 1));
