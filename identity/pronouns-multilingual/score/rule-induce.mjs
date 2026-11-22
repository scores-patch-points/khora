// rule-induce.mjs — induce the anaphora RULE from the score, not hand-set it.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { parseCorefUD } = await import("../fra/lib-corefud.mjs");
const DATA = `/Users/mlacy/Downloads/workspace/corefud/CorefUD-1.3-public/data/CorefUD_English-LitBank`;
const file = fs.readdirSync(DATA).find((f) => f.endsWith(`-dev.conllu`)); const docs = parseCorefUD(path.join(DATA, file));
const N = +(process.argv[2] ?? 5); const docsTo = docs.slice(0, N);

const stream = []; const entityStats = new Map();
for (const doc of docsTo) for (const s of doc.sents) for (const t of s.tokens) {
  const gender = /\bGender=(\w+)/.exec(t.feats ?? "")?.[1] ?? null;
  const number = /\bNumber=(\w+)/.exec(t.feats ?? "")?.[1] ?? null;
  const agent = t.deprel === "nsubj" || t.deprel === "nsubj:pass";
  const m = s.mentions?.find((x) => x.c0 <= t.start && t.end <= x.c1);
  const ent = m?.ent ?? null;
  const idx = stream.length;
  stream.push({ form: t.form, upos: t.upos, gender, number, agent, ent });
  if (ent) { const e = entityStats.get(ent) ?? { mentions: 0, agent: 0, gender: null, number: null, lastSeen: -1 }; e.mentions++; if (agent) e.agent++; if (gender) e.gender = gender; if (number) e.number = number; if (t.upos !== "PRON") e.lastSeen = idx; entityStats.set(ent, e); }
}

const PRON = new Set(["he", "she", "it", "they", "him", "her", "them"]);
const instances = [];
for (let i = 0; i < stream.length; i++) {
  const t = stream[i];
  if (t.upos !== "PRON") continue;
  if (!PRON.has(t.form.toLowerCase())) continue;
  const cands = [...entityStats.entries()].filter(([, e]) => e.lastSeen >= 0 && e.lastSeen < i).map(([ent, e]) => ent);
  if (!t.ent || !cands.length) continue;
  const feats = new Map();
  for (const ent of cands) { const e = entityStats.get(ent); feats.set(ent, { recency: 1 / (1 + (i - e.lastSeen)), agent: e.agent, genderMatch: t.gender && e.gender ? (t.gender === e.gender ? 1 : 0) : 0, numberMatch: t.number && e.number ? (t.number === e.number ? 1 : 0) : 0 }); }
  instances.push({ pronoun: t.form, gold: t.ent, feats });
}
console.log(`instances: ${instances.length} (${docsTo.length} docs)`);

const scoreRule = (w) => { let right = 0; for (const inst of instances) { let best = null, bestV = -Infinity; for (const [ent, f] of inst.feats) { const v = w[0] * f.recency + w[1] * f.agent + w[2] * f.genderMatch + w[3] * f.numberMatch; if (v > bestV) { bestV = v; best = ent; } } if (best === inst.gold) right++; } return right / instances.length; };
const grid = [0, 0.5, 1]; let best = { acc: -1, w: null };
for (const a of grid) for (const b of grid) for (const c of grid) for (const d of grid) { const w = [a, b, c, d]; if (w.every((x) => x === 0)) continue; const acc = scoreRule(w); if (acc > best.acc) best = { acc, w }; }
console.log(`\ninduced (best of 80): recency=${best.w[0]} agenthood=${best.w[1]} gender=${best.w[2]} number=${best.w[3]} → ${(best.acc * 100).toFixed(1)}%`);
console.log(`hand-set (0.5/1/0/0):  ${(scoreRule([0.5, 1, 0, 0]) * 100).toFixed(1)}%`);
console.log(`all-equal (0.5):         ${(scoreRule([0.5, 0.5, 0.5, 0.5]) * 100).toFixed(1)}%`);
