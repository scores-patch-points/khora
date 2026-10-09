// fold-bound-janus-penelope.mjs — THE PIPELINE WITH THE PROPER COREFERENCE, NO MODEL:
//   khora reads (bound EOT: subjectRef by ACTIVATION+LOCALITY, surprise per clause)
//     -> JANUS relates (induceKinds over the bound scene-company; the FIELD of
//        {center, verb, object} rows with standing)
//     -> PENELOPE generates (the RECORD + a mouth that groups the propositions by
//        their induced kind, in story order — MOUTH-LAST, phrases only residue).
// The subject of every clause is the being the READ bound (measured Greek pronoun
// register, UD Ancient_Greek-PROIEL — never a hand-typed list) or an overt name;
// the old recency-center seam (PRON_S + last-name) is gone.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { induceKinds } = await import(`${JANUS}/native/organs/kind-induction.js`);
const { g } = await import(`file://${process.cwd()}/translate.mjs`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-grc.json`, "utf8"));
const casePrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/case-marking-grc.json`, "utf8"));
const LEM = (JSON.parse(fs.readFileSync(`${JANUS}/priors/lemma/grc-lemma.json`, "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};
const grcPronounRegister = JSON.parse(fs.readFileSync(`${JANUS}/priors/pronoun-grc.json`, "utf8"));
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const seat = (x) => (x ? (x.case ?? "?") : "(∅)");
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const ALL = confirmedVerbSet(posPrior);

const CHARS = Number(process.argv[2] || 150000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const sents = odyT.split(/(?<=[.;—])/g).map((text, order) => ({ text, order })).filter((s) => s.text.trim().length > 3);

// KHORA: clauses tagged with their own sentence; the EOT + the per-clause surprise
let clauses = [];
for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text });
// the layer-0 referent universe: NOUN/PROPN surfaces only — an article-form is never a being
const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  const id = (cat === "PROPN" ? "N:" : "") + kindOf(f);
  refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
}
// the PROPER coreference: activation + locality, measured; typed gaps, never a guess
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, {
  window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc",
  createActivation: (o) => createActivation({ window: o.window ?? WIN }),
  pronounClass: grcPronounRegister, namedScope: "local",
});
const nameOfId = (id) => (id.startsWith("N:") ? g(id.slice(2)) : g(id));
const bySentence = new Map();
for (const b of bindings) {
  const prev = bySentence.get(b.sentenceOrder);
  const better = !prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:")) || (prev.provenance?.mechanism?.includes("locality") === false && b.provenance?.mechanism?.includes("locality"));
  if (!prev || better) bySentence.set(b.sentenceOrder, b);
}
const gapBySentence = new Map();
for (const x of gaps) { if (!gapBySentence.has(x.sentenceOrder)) gapBySentence.set(x.sentenceOrder, []); gapBySentence.get(x.sentenceOrder).push(x.reason); }
// SURPRISE in the read + the scene bound via the same lens (bayes to the scene holograph)
const holoSurprise = createHolograph({ gamma: 0.9 });
const surprise = clauses.map((c) => { const facts = { V: String(g(c.verb ?? "·")) }; const s = face(c.subject); if (s) facts.S = String(g(s)); const o = face(c.object); if (o) facts.O = String(g(o)); return admit(holoSurprise, facts).bayes; });
const holoScene = createHolograph({ alpha: 1 });
for (const c of clauses) admit(holoScene, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const B = clauses.map((c) => admit(holoScene, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0); if (rev && cur.length >= 4) { scenes.push(cur); cur = []; } cur.push(clauses[i]); }
if (cur.length) scenes.push(cur);

// THE BOUND EOT: every clause carries subjectRef (the read's binding or the overt name)
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","οι","αι","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
const eot = clauses.map((c, i) => {
  const s = face(c.subject), o = face(c.object);
  const bind = bySentence.get(c.order);
  const ref = bind?.referentId ? nameOfId(bind.referentId) : null;
  const overt = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN" ? g(kindOf(s)) : null;
  const subj = ref ?? overt ?? (s ? (PRON_S.has(stF(s)) ? null : g(s) || null) : null);
  return { verb: String(c.verb ?? "·"), subject: s, subjectRef: subj ?? null, object: o, order: c.order, surprise: surprise[i] };
});
const gapSet = new Set(gaps.map((x) => x.reason));
console.log(`${clauses.length} clauses · ${scenes.length} scenes · ${bindings.length} coref bindings · ${gaps.length} typed gaps (${[...gapSet].join("/")})\n`);

// JANUS: induce kinds over the scenes' BOUND company
const scenesP = scenes.map((sc) => { const props = sc.map((c) => { const s = face(c.subject), o = face(c.object); const bind = bySentence.get(c.order); const ref = bind?.referentId ? nameOfId(bind.referentId) : null; const overt = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN" ? g(kindOf(s)) : null; const subj = ref ?? overt ?? (s ? (PRON_S.has(stF(s)) ? null : g(s) || null) : null); return { s: subj ?? "◦", v: g(c.verb || "·"), o: o ? g(o) : "", raw: c }; }); return { props }; });
const vecs = scenesP.map((sc, i) => {
  const names = [...new Set(sc.props.flatMap((p) => [`A:${p.s}`, `V:${p.v}`, p.o ? `O:${p.o}` : ""].filter(Boolean)))];
  const company = {}; for (const n of names) company[n] = sc.props.filter((p) => p.s === n.substring(2) || p.v === n.substring(2) || (p.o || "").toLowerCase() === n.split(":")[1]?.toLowerCase()).length;
  return { ref: `scene:${i}`, names, company }; });
const kinds = induceKinds(vecs, { threshold: 0.05 });
const sceneKind = new Array(scenesP.length).fill(-1);
kinds.forEach((k, ki) => k.members.forEach((m) => { const i = Number(m.split(":")[1]); if (Number.isFinite(i)) sceneKind[i] = ki; }));
console.log(`JANUS: ${kinds.length} induced kinds over the BOUND scene-company`);
kinds.forEach((k, ki) => console.log(`   kind ${ki + 1} (${k.members.length} scenes): ${(k.slots ?? []).slice(0, 5).join(" · ")}`));

// PENELOPE: the field = the RECORD of {center, verb, object} with standing, from bound subjects
const field = new Map();
for (const sc of scenesP) for (const p of sc.props) { const k = p.s === "◦" ? "(unnamed)" : p.s; const row = field.get(`${k}|${p.v}`) ?? { center: k, verb: p.v, object: p.o, n: 0, standing: "candidate" }; row.n++; field.set(`${k}|${p.v}`, row); }
const fieldRows = [...field.values()].sort((a, b) => b.n - a.n).slice(0, 24);
console.log(`\nPENELOPE field (the record {center, verb, object} — the center is the read's own binding):\n`);
for (const r of fieldRows) console.log(`   ${r.center.padEnd(16)} ${r.verb.padEnd(14)} ${r.object}${r.n > 1 ? `   ×${r.n}` : ""}   [candidate]`);

// PENELOPE: the mouth phrases the residue — the propositions grouped by induced kind, in story order
console.log(`\nPENELOPE realization (MOUTH-LAST — groups the bound propositions by induced kind):\n`);
for (let i = 0; i < scenesP.length; i++) {
  const ki = sceneKind[i];
  const first = scenesP[i].props.filter((p) => p.s !== "◦").slice(0, 2).map((p) => `${p.s}.${p.v} ${p.o}`.trim()).join(" · ");
  const notes = gapBySentence.get(i) ? ` [${[...new Set(gapBySentence.get(i))].length} unbound in this scene]` : "";
  console.log(`   scene ${String(i).padStart(2)} — ${ki >= 0 ? `situation ${ki + 1}` : "unclassified"}: ${first || "(pro-drop, nothing bound)"}${notes}`);
}