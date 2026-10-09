// coref-activation.mjs — THE PROPER COREFERENCE: pronouns and pro-drop subjects
// bound through resolvePronounsByActivation (decayed one-hop ACTIVATION over the
// named referents — never nearest-name; gender a derived hard filter; typed gaps
// below the floor / no margin / no candidate). No model.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { g } = await import(`file://${process.cwd()}/translate.mjs`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-grc.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-grc.json", "utf8"));
const LEM = (JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/lemma/grc-lemma.json", "utf8"))).lemmas ?? {};
const NEc = casePrior.nominalEndings ?? {};
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };
const kindOf = (s) => { const k = stF(s); return LEM[k] ?? nF(stmF(k)); };
const ALL = confirmedVerbSet(posPrior);
// MEASURED competitor class, the same provenance the English register has:
// built by Zenodotus/scripts/build-pronoun-prior.mjs from UD Ancient_Greek-PROIEL
// (this repo's own grc_proiel-ud-test fixture) — UPOS=PRON AND Person=3, FEATS-derived
// gender/number tallies. NEVER a hand-typed list standing in for a Greek speaker.
const grcPronounRegister = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pronoun-grc.json", "utf8"));

const CHARS = Number(process.argv[2] || 200000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);

// SENTENCES (the seam's own cut) + per-sentence clauses
const sents = odyT.split(/(?<=[.;—])/g).map((text, order) => ({ text, order })).filter((s) => s.text.trim().length > 3);
let clauses = [];
sents.forEach((s) => { for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text }); });
console.log(`${sents.length} sentences · ${clauses.length} clauses\n`);

// REFERENTS: every nominal surface -> its resolved being (name for PROPN, kind-Key otherwise)
const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  const isName = cat === "PROPN";
  // the layer-0 gate: only real nouns (or a null class backed by the case
  // end-vote) earn a referent. Articles/pronouns (PRON, DET) never do — an
  // article-form bindable as "τον" is not a being, and keeps the universe honest.
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  const id = (isName ? "N:" : "") + kindOf(f);
  const acc = f.toLowerCase();
  refMap.set(acc, id); refMap.set(stF(acc), id);
}
const nameOfId = (id) => (id.startsWith("N:") ? g(id.slice(2)) : g(id));
console.log(`referents: ${refMap.size} surfaces -> ${new Set(refMap.values()).size} beings\n`);

// THE REAL COREFERENCE: decayed one-hop activation, gender-gated, typed gaps
const MIN_A = Number(process.argv[3] || 0.05), MIN_M = Number(process.argv[4] || 0.3), WIN = Number(process.argv[5] || 160);
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, {
  window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc",
  createActivation: (o) => createActivation({ window: o.window ?? WIN }),
  pronounClass: grcPronounRegister,
  namedScope: "local",
});
console.log(`coreference: ${bindings.length} bindings · ${gaps.length} typed gaps (${[...new Set(gaps.map((x) => x.reason))].join(", ")})\n`);
const bySentence = new Map();
for (const b of bindings) if (!bySentence.has(b.sentenceOrder)) bySentence.set(b.sentenceOrder, b);
const gapBySentence = new Map();
for (const x of gaps) { if (!gapBySentence.has(x.sentenceOrder)) gapBySentence.set(x.sentenceOrder, []); gapBySentence.get(x.sentenceOrder).push(x.reason); }

const PR = new Set(["οι","τοι","ο","η","οἱ","αἱ","οἵ","τοὶ","ὅς","ὃς","ἥ","σφε","μιν","νιν","τό","τά","τα"]);
// SURPRISE in the read: admit each clause causally against a holograph (gamma .9)
// so the cloth is revised as the read lands, and each edge carries its bayes delta.
const holo = createHolograph({ gamma: 0.9 });
const admitPerClause = [];
for (const c of clauses) {
  const s = face(c.subject), o = face(c.object);
  const facts = {};
  facts.V = String(g(c.verb ?? "·"));
  if (s) facts.S = String(g(s));
  if (o) facts.O = String(g(o));
  admitPerClause.push(admit(holo, facts).bayes);
}
// THE BOUND EOT: attach subjectRef (the activated being) to each clause AT its own sentence —
// the binding the reader would have carried had it routed through resolvePronouns in-the-read.
const eot = clauses.map((c, i) => {
  const s = face(c.subject), o = face(c.object);
  const overtName = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN" ? g(kindOf(s)) : null;
  const bind = bySentence.get(c.order);
  const ref = bind?.referentId ? nameOfId(bind.referentId) : overtName;
  const unbound = !bind ? (gapBySentence.get(c.order) ?? ["pronoun_not_attempted"]) : null;
  return { verb: String(c.verb ?? "·"), subject: s, subjectRef: ref, object: o, order: c.order, unbound, surprise: admitPerClause[i] };
});
const NAME = /^\p{L}[\p{L} -]*$/u;
const isName = (x) => x && !x.startsWith("(?") && !x.startsWith("◦");
const totalSurp = eot.reduce((s, e) => s + e.surprise, 0);
const peak = eot.reduce((a, e) => (e.surprise > a.surprise ? e : a), eot[0]);
console.log(`BOUND EOT: ${eot.length} edges · ${eot.filter((e) => e.subjectRef && isName(e.subjectRef)).length} with a resolved subjectRef · ${eot.filter((e) => e.unbound).length} typed-unbound`);
console.log(`SURPRISE: Σ bayes ${totalSurp.toFixed(1)} bits moved over the read · peak ${peak.surprise.toFixed(2)} at s${peak.order} (${g(peak.verb)})\n`);
console.log("the propositions, as the read would bind them (· = surprise, bits):\n");
const seenVol = 0;
for (const e of eot.slice(0, 90)) {
  const subj = (e.subjectRef && isName(e.subjectRef)) ? e.subjectRef : (e.subject ? g(e.subject) : "◦");
  const note = e.unbound && !isName(e.subjectRef) ? `   [${[...new Set(e.unbound)].slice(0, 2).join("/")}]` : "";
  console.log(`  s${String(e.order).padStart(3)} ${subj}.${g(e.verb)} ${e.object ? g(e.object) : ""} ·${e.surprise.toFixed(2)}${note}`);
}