// scene-kinds.mjs — WHAT WE CAN ACTUALLY DO TODAY: Greek EOT -> action situations
// (bounded by bayes-surprise to the holograph + the position-vocabulary ground) ->
// SCENE-KINDS INDUCED by janus (company over each scene's {position,action,outcome}),
// falsified against the frequency band. The Odyssey folds into its kinds.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, paradigmOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { dmd } = await import(`${KHOR}/native/kernel/dmd.js`);
const { induceKinds, frequencyBands } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
// THE ELEMENT KINDS (the 2026-10-08 lever: induce at the KIND grain, not the surface grain)
//   action-kind = the verb's paradigm cell (tense·voice·mood) — collapses inflected forms
//   role-class   = the case's role seat (agent/patient/recipient), not raw Nom:Acc
const ROLE = { Nom: "agt", Acc: "pat", Dat: "rcv", Gen: "gen", Voc: "voc" };
const roleOf = (x) => (x ? (ROLE[x.case] ?? "?") : "(∅)");
const actionKindOf = (v) => { const p = v ? paradigmOf(v, casePrior) : null; return p ? `v:${p.tense}:${p.voice}:${p.mood}` : `v:${String(v ?? "·")}`; };
const ALL = confirmedVerbSet(posPrior);
const CHARS = Number(process.argv[2] || 120000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readCl = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };

// THE HOLOGRAPH + ILLIAD SEED (the carried ground)
const holo = createHolograph({ alpha: 1 });
for (const c of readCl(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readCl(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);

// SCENES = action situations; the boundary is a SIGNIFICANT holograph revision
// (bayes above the 90th pct), not every blink. A situation is an arena that RUNS.
const lens = clauses.map((c) => String(c.verb ?? "").length + face(c.subject).length + face(c.object).length);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
const MIN_LEN = 4;
for (let i = 0; i < clauses.length; i++) {
  const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0);
  if (rev && cur.length >= MIN_LEN) { scenes.push(cur); cur = []; }
  cur.push(clauses[i]);
}
if (cur.length) scenes.push(cur);

// SCENE VECTORS: each scene's company = the ELEMENT-KINDS it contains
const elem = (c) => [`${actionKindOf(c.verb)}`, `r:${roleOf(c.subject)}:${roleOf(c.object)}`, `o:${c.object ? face(c.object) : "∅"}`];
const sceneVecs = scenes.map((sc, i) => {
  const names = [...new Set(sc.flatMap(elem))];
  const company = {}; for (const n of names) company[n] = sc.flatMap(elem).filter((e) => e === n).length;
  return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: [], passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
});

// INDUCE THE KINDS — janus, from company, never taught. THE THIN-COMPANY CURE:
// an IDF-WEIGHTED COSINE — the generic elements (o:∅, pro-drop roles, the narrative
// Past:Act:Ind) carry near-zero weight, the distinctive ones carry the kind.
const df = new Map();
for (const v of sceneVecs) for (const n of v.names) df.set(n, (df.get(n) ?? 0) + 1);
const N = sceneVecs.length;
const idf = new Map(); for (const n of df.keys()) idf.set(n, Math.log(1 + N / (1 + (df.get(n) ?? 0))));
const wcos = (a, b) => {
  const va = (n) => idf.get(n) * (a.company[n] ?? 0), vb = (n) => idf.get(n) * (b.company[n] ?? 0);
  let dot = 0, la = 0, lb = 0;
  for (const n of a.names) { dot += va(n) * (b.company[n] ? vb(n) : 0); la += va(n) * va(n); }
  for (const n of b.names) lb += vb(n) * vb(n);
  return la && lb ? dot / Math.sqrt(la * lb) : 0;
};
const kinds = induceKinds(sceneVecs, { similarityOf: wcos, threshold: 0.03 });

// the kinded fold
const kindId = new Map();
let k = 0;
for (const kd of kinds) { for (const m of kd.members) kindId.set(m, `K${String(k).padStart(2, "0")}`); k++; }
const sig = kinds.map((kd) => {
  const els = new Map();
  for (const m of kd.members) { const v = sceneVecs.find((x) => x.ref === m); if (!v) continue; for (const n of v.names) els.set(n, (els.get(n) ?? 0) + v.company[n]); }
  return { size: kd.members.length, els: [...els.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5) };
});

console.log(`EOT: ${clauses.length} clauses → ${scenes.length} scenes (bounded by bayes + position-vocabulary) → ${kinds.length} INDUCED SCENE-KINDS\n`);

console.log(`═══ THE KINDS (company-induced from each situation's {position·action·outcome}) ═══`);
sig.forEach((s, i) => console.log(`  K${String(i).padStart(2, "0")} [×${String(s.size).padStart(3)}] ${s.els.map(([n, c]) => `${n}×${c}`).join(" ")}`));

console.log(`\n═══ THE KINDS IN ORDER (the first 18 situations) ═══`);
scenes.slice(0, 18).forEach((sc, i) => {
  const kl = kindId.get(`scene:${i}`) ?? "?";
  const b = Math.max(...B.slice(sceneOff(scenes, i)).filter(Number.isFinite)).toFixed(1);
  const first = sc.map((c) => `${(face(c.subject) || "◦")}.${c.verb}`).slice(0, 3).join(" / ");
  console.log(`  ${String(i).padStart(2)}  ${kl}  Δ${b.padStart(4)}b  ${first}`);
});
function sceneOff(ss, i) { let o = 0; for (let x = 0; x < i; x++) o += ss[x].length; return o; }