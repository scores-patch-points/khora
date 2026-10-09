// fold-janus-penelope.mjs — THE PIPELINE, NO MODEL:
//   khora reads (EOT, scenes, center-trails) -> JANUS relates (induceKinds over the
//   centered scene-company; the FIELD of {Name, verb, object} rows) -> PENELOPE
//   generates (the RECORD with standing; a phrase that groups the propositions by
//   their induced kind, in story order — MOUTH-LAST, the mouth phrases only residue).
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { induceKinds } = await import(`${JANUS}/native/organs/kind-induction.js`);
const { g } = await import(`file://${process.cwd()}/translate.mjs`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const LEM = (JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const PRON_OBJ = new Set(["αυτον","αυτην","αυτους","τον","την","τους","μιν","νιν","σε","ὃν","σφε"]);
const ALL = confirmedVerbSet(posPrior);

const CHARS = Number(process.argv[2] || 240000);
const OFFSET = Number(process.argv[3] || 0);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(OFFSET, OFFSET + CHARS);
const iliadT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, 50000);
const readC = (t) => { const o = []; for (const s of t.split(/(?<=[.;—])/g)) if (s.trim().length > 3) for (const c of greekClauses(s.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) o.push(c); return o; };
const holo = createHolograph({ alpha: 1 });
for (const c of readC(iliadT)) admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const clauses = readC(odyT);
const B = clauses.map((c) => admit(holo, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
const lens = clauses.map((c) => String(c.verb ?? "").length + face(c.subject).length + face(c.object).length);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0); if (rev && cur.length >= 4) { scenes.push(cur); cur = []; } cur.push(clauses[i]); }
if (cur.length) scenes.push(cur);

// ---- KHORA: the centered propositions (pro-drop + the pronoun-articles -> scene center) ----
// SEAM 1 fix: the Greek third-person pronoun-articles (οἱ/τοι/ὁ/ἡ/ὅς/οἵ/αἱ/σφε …) are the
// text's anaphora for the established being — THEY resolve to the scene's named center by
// recency (Grosz backward-looking center), never guessed when no center is established.
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","οι","αι","τοι","ος","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τουτο","τα","ων","το","τους","ον","ην","ο"]);
const propOf = (c, center) => {
  const s = face(c.subject), o = face(c.object);
  const sk = s ? stF(s) : "";
  const sName = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN";
  const name = sName ? g(kindOf(s)) : null;
  const centerNow = name ?? center;
  let subj;
  if (name) subj = name;
  else if (PRON_S.has(sk)) subj = center || g(s) || "◦";     // a pronoun-article -> the named center
  else if (s) subj = g(s);
  else subj = center || "◦";                                  // pro-drop -> the named center
  return { s: subj, v: g(c.verb || "·"), o: o ? (PRON_OBJ.has(stF(o)) ? `the one(${center || "?"})` : g(o)) : "", center: centerNow, verb: String(c.verb ?? "·") };
};
const scenesP = scenes.map((sc) => {
  let center = null; const props = [];
  for (const c of sc) { const p = propOf(c, center); center = p.center; props.push(p); }
  return { props, named: center };
});
console.log(`${clauses.length} clauses · ${scenes.length} scenes (khora) — resolved to centered propositions\n`);

// ---- JANUS: induce kinds over the scenes' centered company; build the FIELD ----
const vecs = scenesP.map((sc, i) => {
  const names = [...new Set(sc.props.flatMap((p) => [`A:${p.s}`, `V:${p.verb}`, p.o ? `O:${p.o}` : ""].filter(Boolean)))];
  const company = {}; for (const n of names) company[n] = sc.props.flatMap((p) => [p.s, p.verb, p.o || ""].filter(Boolean)).filter((x) => x === n.substring(2) || x.toLowerCase() === n.split(":")[1]?.toLowerCase()).length;
  return { ref: `scene:${i}`, names, company }; });
const kinds = induceKinds(vecs, { threshold: 0.05 });
const sceneKind = new Array(scenesP.length).fill(-1);
kinds.forEach((k, ki) => k.members.forEach((m) => { const i = Number(m.split(":")[1]); if (Number.isFinite(i)) sceneKind[i] = ki; }));
console.log(`JANUS: ${kinds.length} induced scene-kinds over the centered propositions`);
const field = new Map(); // the FIELD: {center, verb, object} rows with standing
for (const sc of scenesP) for (const p of sc.props) { const k = p.s === "◦" ? "(unnamed)" : p.s; const row = field.get(`${k}|${p.v}`) ?? { center: k, verb: p.v, object: p.o, n: 0, standing: "candidate" }; row.n++; field.set(`${k}|${p.v}`, row); }
const fieldRows = [...field.values()].sort((a, b) => b.n - a.n).slice(0, 24);
console.log(`PENELOPE field (the record of {center, verb, object} with standing):\n`);
for (const r of fieldRows) console.log(`   ${r.center.padEnd(14)} ${r.verb.padEnd(12)} ${r.object}${r.n > 1 ? `   ×${r.n}` : ""}   [candidate]`);

// ---- PENELOPE: the record + a model-free realization (group propositions by induced kind) ----
const kindName = (ki) => `situation ${ki + 1}`;
console.log(`\nPENELOPE realization (the mouth phrases the residue — MOUTH-LAST, no model):\n`);
for (let i = 0; i < scenesP.length; i++) {
  const ki = sceneKind[i];
  const first = scenesP[i].props.filter((p) => p.s !== "◦").slice(0, 2).map((p) => `${p.s}.${p.v} ${p.o}`.trim()).join(" · ");
  console.log(`   scene ${String(i).padStart(2)} — ${ki >= 0 ? kindName(ki) : "unclassified"}: ${first || "(pro-drop, unnamed center)"}`);
}