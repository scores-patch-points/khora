// fold-summary.mjs — THE FOLD'S OWN SUMMARY, NO MODEL:
//   bound EOT (coreference: measured register, activation + locality) +
//   person-morpheme ZERO-ANAPHORA recovery (a token-less third-person subject is
//     the hottest being in the dying present — same floor/margin ladder, typed)
//   + per-clause surprise (admit to the holo) -> scenes; reportable scenes =
//     those whose surprise clears the floor and blinks at their local peak;
//   the MOUTH folds the residue: the reportable scenes in story order, phrased
//     by the scene's own dominant center, deeds bound to beings. MOUTH-LAST.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass, personOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
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
let clauses = [];
for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text });

const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  const id = (cat === "PROPN" ? "N:" : "") + kindOf(f);
  refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
}
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, {
  window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc",
  createActivation: (o) => createActivation({ window: o.window ?? WIN }),
  pronounClass: grcPronounRegister, namedScope: "local",
});
const nameOfId = (id) => (id.startsWith("N:") ? g(id.slice(2)) : g(id));
const bySentence = new Map();
for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }
const gapBySentence = new Map();
for (const x of gaps) { if (!gapBySentence.has(x.sentenceOrder)) gapBySentence.set(x.sentenceOrder, []); gapBySentence.get(x.sentenceOrder).push(x.reason); }

// SURPRISE per clause (gamma .9 -> the cloth) and per-clause person (for zero-anaphora)
const holoSurprise = createHolograph({ gamma: 0.9 });
const surprise = clauses.map((c) => { const facts = { V: String(g(c.verb ?? "·")) }; const s = face(c.subject); if (s) facts.S = String(g(s)); const o = face(c.object); if (o) facts.O = String(g(o)); return admit(holoSurprise, facts).bayes; });
const person3 = clauses.map((c) => { const v = String(c.verb ?? ""); if (!v) return false; const p = personOf(v, casePrior); return !!p && p.person === 3; });

// ZERO-ANAPHORA recovery: a clause with NO subject surface whose verb is 3rd-person
// has a token-less subject — THE HOTTEST BEING IN THE PRESENT, by the same
// activation/margin ladder as a visible pronoun; typed gaps, never a guess.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
const zeroAct = createActivation({ window: WIN });
const seen = new Set();
const zeroBind = new Map(); const zeroGaps = [];
for (const s of sents) {
  const named = new Set();
  sMatcher.lastIndex = 0; let m; while ((m = sMatcher.exec(s.text))) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
  for (const c of clauses.filter((c) => c.order === s.order)) {
    const subjExists = face(c.subject).length > 0;
    const hasPronounBinding = bySentence.has(c.order) && face(c.subject).length === 0;
    if (!subjExists && person3[clauses.indexOf(c)] && !hasPronounBinding) {
      const top = [...seen].map((r) => [r, zeroAct.activationOf(r)]).sort((a, b) => b[1] - a[1]);
      const [ref, score] = top[0] ?? [];
      if (!ref) zeroGaps.push({ reason: "zero_no_candidate", order: c.order });
      else if (score < MIN_A) zeroGaps.push({ reason: "zero_below_floor", order: c.order, score });
      else { const second = top[1]?.[1] ?? 0; const margin = score > 0 ? (score - second) / score : 0; if (margin < MIN_M) zeroGaps.push({ reason: "zero_no_margin", order: c.order, margin }); else zeroBind.set(c.order, ref); }
    }
  }
  for (const r of named) seen.add(r);
  zeroAct.observe([...named]);
}

// THE EOT: subjectRef = pronoun-binding OR zero-anaphora binding OR overt name
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
const eot = clauses.map((c, i) => {
  const s = face(c.subject), o = face(c.object);
  const ref = (bySentence.get(c.order)?.referentId ? nameOfId(bySentence.get(c.order).referentId) : null) ?? (zeroBind.get(c.order) ? nameOfId(zeroBind.get(c.order)) : null);
  const overt = s && nominalClass(s.toLowerCase(), posPrior) === "PROPN" ? g(kindOf(s)) : null;
  const subj = ref ?? overt ?? (s ? (PRON_S.has(stF(s)) ? null : g(s) || null) : null);
  return { verb: String(c.verb ?? "·"), subject: s, subjectRef: subj ?? null, object: o, order: c.order, surprise: surprise[i] };
});

// SCENES (bayes to the scene holograph) + their surprise + reportability
const holoScene = createHolograph({ alpha: 1 });
for (const c of clauses) admit(holoScene, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" });
const B = clauses.map((c) => admit(holoScene, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
const TH = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
const scenes = []; let cur = [];
for (let i = 0; i < clauses.length; i++) { const rev = Number.isFinite(B[i]) && B[i] >= TH && B[i] > (B[i - 1] ?? 0) && B[i] >= (B[i + 1] ?? 0); if (rev && cur.length >= 4) { scenes.push(cur); cur = []; } cur.push(clauses[i]); }
if (cur.length) scenes.push(cur);
const sceneSurprise = scenes.map((sc) => sc.reduce((s, c) => s + (surprise[clauses.indexOf(c)] ?? 0), 0));
const reportFloor = [...sceneSurprise].sort((a, b) => a - b)[Math.floor(scenes.length * 0.8)] ?? 0;

console.log(`${clauses.length} clauses · ${scenes.length} scenes · ${bindings.length} pronoun bindings · ${zeroBind.size} zero-anaphora · ${gaps.length + zeroGaps.length} typed gaps (${new Set([...gaps.map(g=>g.reason), ...zeroGaps.map(g=>g.reason)]).size} kinds)\n`);

// THE MOUTH FOLDS THE RESIDUE: reportable scenes, in story order, by dominant center
const REPORT = scenes.map((sc, si) => {
  const props = sc.map((c) => eot[clauses.indexOf(c)]).filter((p) => p.subjectRef);
  const byCenter = {}; for (const p of props) byCenter[p.subjectRef] = (byCenter[p.subjectRef] ?? 0) + 1;
  const center = Object.entries(byCenter).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const peak = props.reduce((a, p) => (p.surprise > a.surprise ? p : a), props[0] ?? { surprise: 0, subjectRef: null, verb: "", object: "" });
  return { si, surprise: sceneSurprise[si], reportable: sceneSurprise[si] >= reportFloor, center, props, peak };
});
const blinks = REPORT.filter((r, i) => r.surprise >= reportFloor && r.surprise > (REPORT[i - 1]?.surprise ?? 0) && r.surprise >= (REPORT[i + 1]?.surprise ?? 0));

console.log(`THE FOLD SUMMARY — ${REPORT.filter((r) => r.reportable).length} reportable scenes (surprise ≥ ${reportFloor.toFixed(1)} bits) · ${blinks.length} blinks\n`);
let position = 0;
for (const r of REPORT) {
  if (!r.reportable) continue;
  const blink = blinks.some((b) => b.si === r.si) ? "✦ " : "  ";
  const deeds = r.props.slice().sort((a, b) => b.surprise - a.surprise).slice(0, 3).map((p) => `${p.subjectRef}.${g(p.verb)}${p.object ? " " + g(p.object) : ""}`.replace(/\s+/g, " ").trim());
  if (!r.center) continue;
  console.log(`${blink}${r.center}: ${deeds.join(" · ") || "(nothing bound)"}  [${r.surprise.toFixed(1)} bits]`);
  position++;
}
console.log(`\n(${zeroGaps.filter((x) => x.reason === "zero_no_margin").length} zero-anaphora refused on margin; people too close to call. ${gaps.length} pronoun gaps. No story was fabricated.`)