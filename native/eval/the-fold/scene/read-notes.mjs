// read-notes.mjs — NOTES ABOUT WHAT'S BEING READ, WHILE IT'S BEING READ.
// The read does not wait to summarize: at every scene's end the mouth writes the
// machine's running IMPRESSION — the hot cast (activation as of that instant),
// what just surprised the cloth (the scene's bayes sum and its peak clause),
// who the read just bound (pronoun decisions since the last note), and what is
// happening now (the freshest bound deed). Two causal passes over the same stream
// (replay, P159): pass 1 measures the scene-revision scores; pass 2 re-derives the
// same organs deterministically and notes at each boundary. EVERY FIGURE IS AN
// ORGAN READING — NO MODEL.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
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
const clauses = [];
for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text });

const refMap = new Map();
for (const c of clauses) for (const x of [c.subject, c.object]) {
  const f = face(x); if (!f) continue;
  const cat = nominalClass(f.toLowerCase(), posPrior);
  if (!(cat === "NOUN" || cat === "PROPN")) continue;
  const id = (cat === "PROPN" ? "N:" : "") + kindOf(f);
  refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
}
const WIN = 160;
const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, {
  window: WIN, minActivation: 0.05, minMargin: 0.3, language: "grc",
  createActivation: (o) => createActivation({ window: o.window ?? WIN }),
  pronounClass: grcPronounRegister, namedScope: "local",
});
const nameOfId = (id) => (id.startsWith("N:") ? g(id.slice(2)) : g(id));
const bySentence = new Map();
for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
// THE REFERENT, ALWAYS: a surface renders as its canonical being — the proper
// noun when the being has one, the kind's received form otherwise; never the
// surface gloss, never a raw form. Note: the notes speak in referents.
const refOf = (x) => { if (!x) return null; const acc = x.toLowerCase(); const id = refMap.get(acc) ?? refMap.get(stF(acc)); return id ? nameOfId(id) : null; };
const clamp = (c) => {
  const s = face(c.subject), o = face(c.object);
  const bound = !refOf(s) ? (bySentence.get(c.order) ? nameOfId(bySentence.get(c.order).referentId) : null) : null;
  return { v: g(c.verb ?? "·"), s: refOf(s) ?? bound, o: o ? (refOf(o) ?? g(o)) : "" };
};

// PASS 1 — scene-revision scores over the whole stream
const surge = createHolograph({ alpha: 1 });
const B = clauses.map((c) => admit(surge, { position: `${seat(c.subject)}:${seat(c.object)}`, actor: face(c.subject) || "(∅)", action: String(c.verb ?? "·"), outcome: c.object ? face(c.object) : "∅" }).bayes);
const THRES = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;

// PASS 2 — replay causally and NOTE at each scene boundary
const holo = createHolograph({ gamma: 0.9 });
const act = createActivation({ window: WIN });
const seen = new Set();
const notes = [];
let scSum = 0, peakB = -Infinity, peakPhrase = "", cur = 0;
const scProps = [];       // this scene's propositions, for the interpretation
let lastBoundOrder = -1, boundNote = [], lastSeenOrder = -1;
const flushScene = (chars) => {
  const cast = [...seen].map((r) => [nameOfId(r) || r, act.activationOf(r)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const byCenter = {}; for (const p of scProps) if (p.s) byCenter[p.s] = (byCenter[p.s] ?? 0) + 1;
  const center = Object.entries(byCenter).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const deeds = scProps.slice().sort((a, b) => b.b - a.b).slice(0, 3).map((p) => `${p.s ?? "◦"}.${p.v} ${p.o}`.trim());
  return { sum: scSum, peak: peakPhrase, cast, bound: [...boundNote], center, deeds: deeds.filter(Boolean), chars };
};
const resetScene = () => { scSum = 0; peakB = -Infinity; peakPhrase = ""; cur = 0; scProps.length = 0; boundNote = []; };
for (let i = 0; i < clauses.length; i++) {
  const c = clauses[i], p = clamp(c);
  const t = p.v; if (!t) continue;
  // observe the parent sentence's referents causally — the hot present the cast reads
  if (c.order !== lastSeenOrder) {
    lastSeenOrder = c.order;
    const st = sents[c.order]?.text ?? "";
    const named = new Set();
    sMatcher.lastIndex = 0; let m; while ((m = sMatcher.exec(st))) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const r of named) seen.add(r);
    act.observe([...named]);
  }
  const b = admit(holo, { V: t, ...(p.s ? { S: p.s } : {}), ...(p.o ? { O: p.o } : {}) }).bayes;
  scSum += b; cur++;
  if (b > peakB) { peakB = b; peakPhrase = `${p.s ?? "◦"}.${p.v} ${p.o}`.trim(); }
  const boundName = bySentence.get(c.order) ? nameOfId(bySentence.get(c.order).referentId) : null;
  scProps.push({ s: p.s, v: p.v, o: p.o, b });
  if (c.order !== lastBoundOrder) { lastBoundOrder = c.order; const bk = bySentence.get(c.order); if (bk && !p.s) boundNote.push([bk.pronoun, nameOfId(bk.referentId)]); }
  const rev = B[i];
  const boundary = Number.isFinite(rev) && rev >= THRES && rev > (B[i - 1] ?? 0) && rev >= (B[i + 1] ?? 0);
  if (boundary && cur >= 4) { notes.push(flushScene(Math.round((i / clauses.length) * odyT.length))); resetScene(); }
}
if (cur) notes.push(flushScene(odyT.length));
// the BLINKS: notes at the reportable peaks only (surprise ≥ floor AND a local max)
const sums = notes.map((n) => n.sum).sort((a, b) => a - b);
const floor = sums[Math.floor(sums.length * 0.8)] ?? 0;
const blinksAt = (i) => notes[i].sum >= floor && notes[i].sum > (notes[i - 1]?.sum ?? 0) && notes[i].sum >= (notes[i + 1]?.sum ?? 0);
const blinks = notes.map((n, i) => ({ ...n, blink: blinksAt(i) }));

console.log(`${clauses.length} clauses · ${notes.length} scenes · ${blinks.filter((n) => n.blink).length} blinks (≥ ${floor.toFixed(1)} bits · ${bindings.length} bindings · ${gaps.length} typed gaps)\n`);
console.log("THE READ NOTES ITSELF, at the blinks — G backdrop · F cast · P scene, all referents:\n");
blinks.forEach((n, i) => {
  const G = n.center ?? "the scene";
  const P = n.deeds.slice(0, 2).join(" ; ");
  const F = n.cast.map(([name]) => name).slice(0, 4).join(" · ");
  const boundTxt = n.bound.length ? "  [spliced: " + n.bound.map(([pr, nm]) => `${pr}→${nm}`).join(", ") + "]" : "";
  console.log(`✦ ${String(i + 1).padStart(2)} @${String(n.chars ?? "?").padStart(5)} ·${n.sum.toFixed(1)} bits — backdrop: ${G} │ cast: ${F} │ scene: ${P}${boundTxt}`);
});

// THE NOTES LIVE IN THE EOT: serialize the bound reading WITH its blink-
// interpretations as first-class entries of the record — the marginalia the
// read itself made is part of the reading, not a log beside it.
const idOf = (x) => { if (!x) return null; const acc = x.toLowerCase(); return refMap.get(acc) ?? refMap.get(stF(acc)) ?? null; };
const eotSchema = {
  schema: "@field/BoundEOTReading-v1",
  source: "homer-odyssey.txt (Greek, Zenodotus)",
  chars: CHARS,
  declared: { window: WIN, minActivation: 0.05, minMargin: 0.3, namedScope: "local", pronounClass: "measured UD Ancient_Greek-PROIEL (janus/priors/pronoun-grc.json)" },
  // referents are HASH IDs in the record — a pretty name is a render-time swap
  // (nameOfId at readout), and if a later read learns a binding was wrong, a
  // correcting NOTE is appended to the record, never a rewrite (the weft, P1).
  count: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, typedGaps: gaps.length },
  edges: clauses.map((c) => {
    const s = face(c.subject), o = face(c.object);
    return { at: c.order, verb: g(c.verb ?? "·"), subjectId: idOf(s) ?? (bySentence.get(c.order) ? nameOfId(bySentence.get(c.order).referentId) : null), objectId: o ? (idOf(o) ?? `s:${stF(o).slice(0, 6)}`) : null };
  }),
  blinks: blinks.filter((n) => n.blink).map((n, i) => ({
    at: n.chars,
    // `surprise` here is BAYES: the delta of the read's own prior → posterior
    // across the section — i.e. LEARNING (surprisal would be unexpectedness
    // against the prior; bayes is how much the belief moved).
    learning: +n.sum.toFixed(1),
    scene: n.deeds.slice(0, 2),
    interpretation: `${n.center ?? "the scene"}: ${n.deeds.slice(0, 2).join(" ; ")}`,
    spliced: n.bound.map(([pr, nm]) => ({ pronoun: pr, to: nm })),
  })),
  note: "the record is the note stream, address-scoped (edges, blinks). A 'correction' is only ever a LATER note about the same section — resolved on projection (asOf), never a rewrite (P1, the weft). Learning = the delta between the earlier projection's belief and the later one's: the read's own prior → posterior, which is admit().bayes. Surprisal (Rubin) is unexpectedness against the prior; bayes (Itti-Baldi) is the movement of belief — that movement IS learning.",
};
const eotFile = `eot-odyssey-${CHARS}.json`;
fs.writeFileSync(eotFile, JSON.stringify(eotSchema, null, 2));
console.log(`\n(EOT written → ${eotFile}: ${eotSchema.edges.length} edges · ${eotSchema.blinks.length} blink-interpretations recorded IN the EOT)`);