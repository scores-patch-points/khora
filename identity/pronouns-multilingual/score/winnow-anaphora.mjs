// winnow-anaphora.mjs — one winnow round over the anaphora rule space.
// The search climbs a SMOOTH fitness (mean reciprocal rank of the gold — a gradient), but the
// admission is the REAL metric (exact-match accuracy) on HELD-OUT docs it never saw.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { parseCorefUD } = await import("../fra/lib-corefud.mjs");
const DATA = `/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data/CorefUD_English-LitBank`;
const file = fs.readdirSync(DATA).find((f) => f.endsWith(`-dev.conllu`));
const docs = parseCorefUD(path.join(DATA, file));
const NDOC = +(process.argv[2] ?? 10);
const docsTo = docs.slice(0, NDOC);
const split = Math.floor(docsTo.length * 0.66);
const SIG = ["recency", "agenthood", "gender", "number", "frequency"];

function instancesOf(theseDocs) {
  const stream = [], ent = new Map();
  for (const doc of theseDocs) for (const s of doc.sents) for (const t of s.tokens) {
    const m = s.mentions?.find((x) => x.c0 <= t.start && t.end <= x.c1);
    const id = m?.ent ?? null; const idx = stream.length;
    stream.push({ form: t.form, upos: t.upos, gender: /\bGender=(\w+)/.exec(t.feats ?? "")?.[1] ?? null, number: /\bNumber=(\w+)/.exec(t.feats ?? "")?.[1] ?? null, agent: t.deprel === "nsubj" || t.deprel === "nsubj:pass", id });
    if (id) { const e = ent.get(id) ?? { freq: 0, agent: 0, gender: null, number: null, last: -1 }; e.freq++; if (t.deprel === "nsubj" || t.deprel === "nsubj:pass") e.agent++; if (t.gender) e.gender = t.gender; if (t.number) e.number = t.number; if (t.upos !== "PRON") e.last = idx; ent.set(id, e); }
  }
  const PRON = new Set(["he", "she", "it", "they", "him", "her", "them"]);
  const out = [];
  for (let i = 0; i < stream.length; i++) {
    const t = stream[i];
    if (t.upos !== "PRON" || !PRON.has(t.form.toLowerCase())) continue;
    const cands = [...ent.entries()].filter(([, e]) => e.last >= 0 && e.last < i);
    if (!t.id || !cands.length) continue;
    const feats = new Map();
    for (const [cid, e] of cands) feats.set(cid, [ 1 / (1 + (i - e.last)), e.agent, (t.gender && e.gender && t.gender === e.gender) ? 1 : 0, (t.number && e.number && t.number === e.number) ? 1 : 0, e.freq ]);
    out.push({ gold: t.id, feats });
  }
  return out;
}
const dev = instancesOf(docsTo.slice(0, split)), held = instancesOf(docsTo.slice(split));
console.log(`instances: dev ${dev.length}, held-out ${held.length} (${docsTo.length} docs)`);

// ranked(w, inst) -> the gold's rank (1 = best); the smooth fitness is 1/rank (MRR)
const weighted = (w, f) => w.reduce((s, wi, k) => s + wi * f[k], 0);
const rankOf = (w, inst) => { let r = 1, goldV = -Infinity; for (const [id, f] of inst.feats) if (id === inst.gold) { goldV = weighted(w, f); break; } for (const [id, f] of inst.feats) if (id !== inst.gold && weighted(w, f) > goldV) r++; return r; };
const mrr = (w, set) => set.reduce((s, inst) => s + 1 / rankOf(w, inst), 0) / set.length;
const acc = (w, set) => set.reduce((s, inst) => s + (rankOf(w, inst) === 1 ? 1 : 0), 0) / set.length;

const BASELINE = [0.5, 1, 0, 0, 0];
console.log(`baseline (hand-set)  dev acc ${(acc(BASELINE, dev) * 100).toFixed(1)}%  held-out acc ${(acc(BASELINE, held) * 100).toFixed(1)}%`);

// HUNT + WINNOW + BREED over the weight space, climbing MRR on DEV only
const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(7);
const rand = () => Math.round(rng() * 20) / 20;
let pop = Array.from({ length: 60 }, () => SIG.map(rand));
// seed with diverse single-signal and uniform rules so the search starts from reasonable points
pop.push(...SIG.map((_, k) => SIG.map((_, j) => (j === k ? 1 : 0))), SIG.map(() => 0.5));
let best = { w: null, mrr: -1 };
for (let gen = 0; gen < 40; gen++) {
  const scored = pop.map((w) => ({ w, m: mrr(w, dev) })).sort((a, b) => b.m - a.m);
  if (scored[0].m > best.mrr) best = { w: [...scored[0].w], mrr: scored[0].m };
  const parents = scored.slice(0, 12);
  const next = parents.map((p) => p.w);
  while (next.length < 60) { const a = parents[Math.floor(rng() * parents.length)].w, b = parents[Math.floor(rng() * parents.length)].w; next.push(a.map((x, k) => (rng() < 0.5 ? x : b[k])).map((x) => (rng() < 0.2 ? rand() : x))); }
  pop = next;
}
const heldAcc = acc(best.w, held), heldBase = acc(BASELINE, held);
console.log(`induced (BREED)      dev acc ${(acc(best.w, dev) * 100).toFixed(1)}%  MRR ${best.mrr.toFixed(3)}  held-out acc ${(heldAcc * 100).toFixed(1)}%`);
console.log(`  weights: ${SIG.map((s, k) => `${s}=${best.w[k]}`).join("  ")}`);
console.log(`\nHELD-OUT GATE: ${heldAcc >= heldBase ? "ADMITTED (+" + ((heldAcc - heldBase) * 100).toFixed(1) + " held-out acc)" : "REFUSED (" + ((heldAcc - heldBase) * 100).toFixed(1) + ")"}`);
