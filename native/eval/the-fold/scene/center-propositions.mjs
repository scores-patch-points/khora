// center-propositions.mjs — TRACE THE PRONOUNS/PRO-DROP BACK TO THE PROPER NOUNS,
// and format the resolved clauses as coherent propositions.
//   · the scene's CENTER (Grosz backward-looking center): the last OVERT proper
//     name seen; a pro-drop (◦) subject inherits it; a pronominal object (αὐτὸν,
//     τὸν …) resolves to it.
//   · each clause renders as `Name.verb object` in English, Greek in parens —
//     the REC proposition of the fold. No model.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { confirmedVerbSet, greekClauses, nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
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
const PRON_OBJ = new Set(["αυτον","αυτην","αυτους","τον","την","τους","μιν","νιν","εμe","σε","ὃν","σφε"]);
const ALL = confirmedVerbSet(posPrior);

const CHARS = Number(process.argv[2] || 240000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
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

console.log(`${clauses.length} clauses · ${scenes.length} scenes — pro-drop subjects resolved to the scene's proper-name center (Grosz backward-looking), pronouns too, rendered as propositions:\n`);
for (let i = 0; i < scenes.length; i++) {
  let center = null;
  console.log(`— scene ${i} —`);
  for (const c of scenes[i]) {
    const s = face(c.subject), o = face(c.object);
    const sName = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN";
    if (sName) center = g(kindOf(s));                      // an overt PROPN becomes the center
    const subjEN = s ? (sName ? center : g(s)) : (center || "◦");
    const verbEN = g(c.verb || "·");
    const objEN = (() => { if (!o) return ""; const k = stF(o); return PRON_OBJ.has(k) ? (center ? `him(${center})` : "him") : g(o); })();
    const greek = [s ? s : "◦", c.verb, o].filter(Boolean).join("·");
    console.log(`   ${subjEN}.${verbEN} ${objEN}    «${greek}»`);
  }
}