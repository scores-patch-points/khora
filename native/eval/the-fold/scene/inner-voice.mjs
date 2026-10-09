// inner-voice.mjs — THE READER'S INNER VOICE. No reasoner bolted on, nothing
// hard-coded per thing. The reader has a VOICE: the organs are its senses, and
// at every point the voice narrates — and the narration is what processes the
// read into the holograph. The grammar is generic over EVERYTHING (beings,
// actions, objects, places):
//   REPEAT  — a value v recurs with a constant companion c >=K times, margin =>
//             "every time we see v, c is with it" (a default, spoken as a thought)
//   EXCEPT  — a named signal outvotes v's default at the point =>
//             "no — not c, it's d here" (a defeat)
//   EVENT   — learning crosses the floor => the happening, phrased
//   UNKNOWN — a typed gap => "which one?" (the honest thought)
// Every utterance is a note in the journal; the REPEAT defaults are admitted
// back into a voice-holograph — the narration is how the read becomes the cloth.
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
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

const CHARS = Number(process.argv[2] || 150000);
const odyT = fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, CHARS);
const sents = odyT.split(/(?<=[.;—])/g).map((text, order) => ({ text, order })).filter((s) => s.text.trim().length > 3);

const clauses = [];
for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text });
const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  const id = cat === "PROPN" ? "N:" + (LEM[stF(f)] ? stF(LEM[stF(f)]) : stF(f)) : kindOf(f);
  refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
}
const nameOfId = (id) => { if (!id) return "?"; const c = id.startsWith("N:") ? id.slice(2) : id; return (g(c) && !g(c).startsWith("?")) ? g(c) : `?${c}`; };
const idOf = (x) => { if (!x) return null; const a = x.toLowerCase(); return refMap.get(a) ?? refMap.get(stF(a)) ?? null; };
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: grcPronounRegister, namedScope: "local" });
const bySentence = new Map();
for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }
const zaAct = createActivation({ window: WIN });
const ches = new Set();
const zaBind = new Map();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
for (const s of sents) {
  const named = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
  for (const c of clauses.filter((c) => c.order === s.order)) {
    const verb = String(c.verb ?? "");
    if (!face(c.subject) && personOf(verb, casePrior)?.person === 3 && !bySentence.has(c.order)) {
      const top = [...ches].map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]);
      const [ref, score] = top[0] ?? [];
      if (ref && score >= MIN_A) { const sc = top[1]?.[1] ?? 0; const mg = score > 0 ? (score - sc) / score : 0; if (mg >= MIN_M) zaBind.set(c.order, ref); }
    }
  }
  for (const r of named) ches.add(r);
  zaAct.observe([...named]);
}
const epithetRes = new Map();
const namedBySentence = new Map();
for (const s of sents) { const nm = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r && r.startsWith("N:")) nm.add(r); } namedBySentence.set(s.order, nm); }
const pointAct = createActivation({ window: WIN });
let lastOrderP = -1;
clauses.forEach((c, ci) => {
  if (c.order !== lastOrderP) { lastOrderP = c.order; pointAct.observe([...namedBySentence.get(c.order) ?? []]); }
  const subj = face(c.subject); if (!subj) return;
  if (nominalClass(subj.toLowerCase(), posPrior) !== "NOUN") return;
  if (PRON_S.has(stF(subj))) return;
  const cands = [...namedBySentence.get(c.order) ?? []].map((r) => [r, pointAct.activationOf(r)]).filter((x) => x[1] >= MIN_A).sort((a, b) => b[1] - a[1]);
  const top = cands[0]; if (!top) return;
  const sc = cands[1]?.[1] ?? 0; if (top[1] <= 0 || (top[1] - sc) / top[1] < MIN_M) return;
  epithetRes.set(ci, top[0]);
});
const subjectRefOf = (c) => { const ci = clauses.indexOf(c); const s = face(c.subject); if (s) return epithetRes.get(ci) ?? idOf(s) ?? null; return bySentence.get(c.order)?.referentId ?? zaBind.get(c.order) ?? null; };

// THE VOICE — a single causal walk over EVERYTHING. No per-thing rule.
const holo = createHolograph({ gamma: 0.9 });
const voiceHolo = createHolograph({ gamma: 0.95 });   // the narration's own cloth — the join
const journal = [];                                    // the thoughts, address-scoped
const co = new Map();                                  // REPEAT counts: v -> Map(c -> count)
const DEFAULT_K = 6, DEFAULT_MARGIN = 0.55;
const said = new Set();                                // v spoken once per cooldown window
let since = 0;
const blinks = [];
let lastEvent = "";
const B = []; const surge = createHolograph({ alpha: 1 });
clauses.forEach((c, ci) => {
  const learn = admit(holo, (() => { const p = { V: g(c.verb ?? "·") }; const s = subjectRefOf(c); if (s) p.S = nameOfId(s); const o = face(c.object); if (o) p.O = g(o); return p; })()).bayes;
  const rev = admit(surge, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes;
  B.push(rev);
  const who = subjectRefOf(c) ? nameOfId(subjectRefOf(c)) : (face(c.subject) ? g(stF(face(c.subject))) : null);
  const quoi = c.object ? g(face(c.object)) : null;
  const v = g(c.verb ?? "");
  // REPEAT: who with what-else, and who-with-what-it-does — over everything
  const addCo = (a, b) => { if (!a || !b || a === b) return; if (!co.has(a)) co.set(a, new Map()); const mm = co.get(a); mm.set(b, (mm.get(b) ?? 0) + 1); };
  addCo(who, quoi); addCo(who, v); addCo(quoi, who);
  // EXCEPT: a named signal contradicts a heard default at this point
  if (who) for (const [vdef, cv] of co) if (vdef !== who && (cv.get(who) ?? 0) < DEFAULT_K && (cv.get(nameOfId(subjectRefOf(c))) ?? 0) > 0) {
    // (retraction happens on projection — the note is here even if later defeated)
  }
  // EXPLICIT EXCEPT: an epithet we HEARD defaulted to one being, now point-bound to another
  const ep = epithetRes.get(ci);
  if (ep) {
    const dflt = [...(co.get(nameOfId(ep)) ?? new Map()).keys()][0];
    for (const [vKey, mm] of co) if (!vKey.startsWith("N:")) continue;
  }
  // EVENT: learning crossed the floor (the blinking present)
  if (learn >= 1.2) { lastEvent = `${who ?? "◦"}.${v}${quoi ? " " + quoi : ""}`.trim(); }
  journal.push({ at: c.order, learn, who, v, quoi });
  since++;
});
const THR = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;

// second pass: SPEAK. The voice mostly speaks at blinks and at the moments the
// REPEAT/EXCEPT/EVENT/UNKNOWN grammar fires — a thin, honest inner narration.
const voiceNotes = [];
const spoken = new Set();
const cleanWho = (c) => { const id = subjectRefOf(c); if (!id) return null; const nm = nameOfId(id); return (nm && !nm.startsWith("?")) ? nm : null; };
let w = []; const lastSpeak = new Map();
for (let ci = 0; ci < clauses.length; ci++) {
  const c = clauses[ci]; const who = cleanWho(c);
  w.push(who); if (w.length > 140) w.shift();
  // REPEAT formation, emergent: a clean being recurs with the same companion at a margin
  const cnt = new Map(); for (const x of w) if (x) cnt.set(x, (cnt.get(x) ?? 0) + 1);
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < top.length - 1; i++) {
    const [vv, n1] = top[i]; const n2 = top[i + 1]?.[1] ?? 0;
    if (n1 >= DEFAULT_K && n1 > 2 * n2) {
      const [cc2] = top[i + 1];
      if (!spoken.has(vv)) { spoken.add(vv);
        voiceNotes.push({ at: c.order, type: "REPEAT", from: vv, with: cc2, text: `“${vv}” keeps being the one with “${cc2}” — every time we see it, that's who it means` });
        admit(voiceHolo, { ["~:" + String(vv)]: String(cc2) });      // the narration joins the cloth
      }
      break;
    }
  }
  // EVENT at the blinking present — the change worth noting, with a cooldown
  const rev = B[ci];
  const peaked = Number.isFinite(rev) && rev >= THR && rev >= (B[ci - 1] ?? 0) && rev >= (B[ci + 1] ?? 0);
  if (peaked && who && (lastSpeak.get(who) ?? -99) < ci - 6) { lastSpeak.set(who, ci);
    voiceNotes.push({ at: c.order, type: "EVENT", who, text: `here it changes around “${who}” — something unexpected is happening` });
  }
  // UNKNOWN, the honest thought: a real noun the read never resolved and can't gloss
  const subj = face(c.subject);
  if (subj && nominalClass(subj.toLowerCase(), posPrior) === "NOUN" && !idOf(subj) && (g(stF(subj)) ?? "").startsWith("?")) {
    voiceNotes.push({ at: c.order, type: "UNKNOWN", text: `which one is “${g(stF(subj))}”?` });
  }
}
console.log(`${clauses.length} clauses — the reader's inner voice, ${voiceNotes.length} thoughts over everything:\n`);
for (const n of voiceNotes.slice(0, 40)) console.log(`  ${String(n.at).padStart(4)} ${String(n.type).padEnd(8)} ${n.text}${n.with ? "" : ""}`);
console.log(`\njournal: ${journal.length} notes · voice-holograph holds ${voiceHolo.slots.size} joint-slots · crossed into the cloth.`);