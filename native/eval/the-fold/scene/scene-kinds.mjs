// scene-kinds.mjs — WHAT WE CAN ACTUALLY DO TODAY: Greek EOT -> action situations
// (bounded by bayes-surprise to the holograph + the position-vocabulary ground) ->
// SCENE-KINDS INDUCED by janus (company over each scene's {position,action,outcome}),
// falsified against the frequency band. The Odyssey folds into its kinds.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { dmd } = await import(`${KHOR}/native/kernel/dmd.js`);
const { induceKinds, frequencyBands } = await import(`${KHOR}/../janus/native/organs/kind-induction.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
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

// SCENES = action situations; boundary = a blink OR a NEW ROLE entering the position-vocabulary
const lens = clauses.map((c) => String(c.verb ?? "").length + face(c.subject).length + face(c.object).length);
const scenes = []; let cur = [], roles = new Set();
for (let i = 0; i < clauses.length; i++) {
  const w = lens.slice(Math.max(0, i - 3), i); const m = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
  const newRole = seat(clauses[i].subject) !== "?" && !roles.has(seat(clauses[i].subject));
  if ((lens[i] <= m * 0.65 && lens[i] >= 1) || (newRole && cur.length)) { scenes.push(cur); cur = []; roles = new Set(); }
  cur.push(clauses[i]); roles.add(seat(clauses[i].subject)); roles.add(seat(clauses[i].object));
}
if (cur.length) scenes.push(cur);

// SCENE VECTORS: each scene's company = {position·action·outcome} elements it contains
const elem = (c) => [`p:${seat(c.subject)}:${seat(c.object)}`, `v:${c.verb}`, `o:${face(c.object) || "∅"}`];
const sceneVecs = scenes.map((sc, i) => {
  const names = [...new Set(sc.flatMap(elem))];
  const company = {}; for (const n of names) company[n] = sc.flatMap(elem).filter((e) => e === n).length;
  return { ref: `scene:${i}`, surfaces: [String(i)], mentionsAt: [], passes: 1, names, company, total: Object.values(company).reduce((a, b) => a + b, 0) };
});

// INDUCE THE KINDS — janus, from company, never taught
const kinds = induceKinds(sceneVecs, { threshold: 0.22 });

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