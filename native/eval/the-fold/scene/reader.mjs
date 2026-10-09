// reader.mjs — THE SHARED READ (one core, every organ, every span carries a
// character address). The record it returns has the raw text AS WELL AS the
// log: clauses with char spans, the bound beings, learning per clause, the
// scene/blink signal, and the reader's inner voice. The FOLD projects this
// over the raw text to say what spans mean.
import fs from "node:fs";

const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass, personOf, caseOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
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
const fold = (s) => stF(s).replace(/η|ῆ|ῃ/g, "ε").replace(/ω|ῶ/g, "ο").replace(/ΐ|ϊ|ί|ῖ/g, "ι");
const ALL = confirmedVerbSet(posPrior);
const PRON_S = new Set(["οι","τοι","ο","η","οἱ","ος","η","σφε","μιν","αυτος","αυτοι","αυτους","τον","τα","ων","το","τους","ον","ην"]);
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

const nameOfId = (id) => { if (!id) return null; const c = id.startsWith("N:") ? id.slice(2) : id; if (g(c) && !g(c).startsWith("?")) return g(c); const s = fold(stF(c)); if (g(s) && !g(s).startsWith("?")) return g(s); const m = fold(stmF(c)); if (g(m) && !g(m).startsWith("?")) return g(m); return `?${c}`; };

export async function readGreek({ text = null, chars = 150000, out = null } = {}) {
  const raw = text ?? fs.readFileSync("/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-odyssey.txt", "utf8").replace(/^---[\s\S]*?\n---\n/, "").slice(0, chars);
  // sentences WITH character spans
  const parts = raw.split(/(?<=[.;—])/g);
  let pos = 0; const sents = [];
  let rawAcc = "";
  for (const part of parts) { const before = rawAcc.length; if (part.trim().length <= 3) { rawAcc += part; continue; } sents.push({ text: part.slice(0), order: sents.length, offset: before }); rawAcc += part; }
  const clauses = [];
  for (const s of sents) for (const c of greekClauses(s.text.trim(), ALL, posPrior, casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 })) clauses.push({ ...c, order: s.order, sent: s.text, span: [s.offset, s.offset + s.text.length] });
  // the referent universe (NOUN/PROPN only) — with the measured case-ending
  // FALLBACK (2026-10-08, the boarding clause): Τηλέμαχος is absent from the
  // POSPrior, so nominalClass refuses it and the hero never enters the beings;
  // the case prior's own ending-vote admits it (caseOf: -ος → Nom) exactly as
  // greekClauses does. Persons of the verb-vote are vetoed (never a being).
  const nominalLike2 = (w) => {
    const c = caseOf(w, casePrior, { articleMode: "off" });
    if (!(c && (c.case === "Nom" || c.case === "Acc" || c.case === "Gen" || c.case === "Dat"))) return false;
    const p = personOf(w, casePrior, {});
    return !(p && p.person >= 1);
  };
  const refMap = new Map();
  // PERSON-PRONOUNS ARE NOT BEINGS (2026-10-08, third-person doctrine): the
  // Greek second-person clitics (συ/σε/σοι/σου/τοι) must never open a referent
  // named "you" — the telling is the voice of the affected, third person. The
  // person they stand for is the person-tier's (personOf; pronoun binding), not
  // a being built from the pronoun surface.
  // person-pronoun set in STRIPPED form (what stF produces) — accented variants
  // (ἐγώ, ἐμέ, τοὶ, σύ…) all normalize here, so only stripped keys match.
  const PERSON_PRON = new Set(["συ","σε","σοι","σου","τοι","σφε","εγω","εμε","εμοι","εμου","σφεις","σφων","σφι","σφας","μοι","με","μιν","εμιν","νιν","σφε","εαυτ"]);
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) {
    const f = face(x); if (!f) continue;
    const fS = stF(f);
    if (PERSON_PRON.has(fS)) continue;   // the person-pronoun gate: never a being
    let cat = nominalClass(f.toLowerCase(), posPrior);
    if (!(cat === "NOUN" || cat === "PROPN") && nominalLike2(f)) cat = "NOUN";
    if (!(cat === "NOUN" || cat === "PROPN")) continue;
    const id = cat === "PROPN" ? "N:" + (LEM[stF(f)] ? stF(LEM[stF(f)]) : stF(f)) : kindOf(f);
    refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
  }
  const idOf = (x) => { if (!x) return null; const a = x.toLowerCase(); return refMap.get(a) ?? refMap.get(stF(a)) ?? null; };
  const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "grc", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: grcPronounRegister, namedScope: "local" });
  const bySentence = new Map();
  for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }
  // zero-anaphora
  const zaAct = createActivation({ window: WIN });
  const zaBind = new Map(); const zaSeen = new Set();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
  for (const s of sents) {
    const named = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const c of clauses.filter((c) => c.order === s.order)) if (!face(c.subject) && !bySentence.has(c.order)) { const p = personOf(String(c.verb ?? ""), casePrior); if (p?.person === 3) { const top = [...zaSeen].map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]); const [ref, score] = top[0] ?? []; if (ref && score >= MIN_A) { const sc = top[1]?.[1] ?? 0; if (score > 0 && (score - sc) / score >= MIN_M) zaBind.set(c.order, ref); } } }
    for (const r of named) zaSeen.add(r);
    zaAct.observe([...named]);
  }
  // point-bound epithets
  const epithetRes = new Map();
  const namedBySentence = new Map();
  for (const s of sents) { const nm = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r && r.startsWith("N:")) nm.add(r); } namedBySentence.set(s.order, nm); }
  const pointAct = createActivation({ window: WIN });
  let lastP = -1;
  clauses.forEach((c, ci) => {
    if (c.order !== lastP) { lastP = c.order; pointAct.observe([...namedBySentence.get(c.order) ?? []]); }
    const subj = face(c.subject); if (!subj) return;
    if (nominalClass(subj.toLowerCase(), posPrior) !== "NOUN") return;
    if (PRON_S.has(stF(subj))) return;
    const cands = [...namedBySentence.get(c.order) ?? []].map((r) => [r, pointAct.activationOf(r)]).filter((x) => x[1] >= MIN_A).sort((a, b) => b[1] - a[1]);
    const top = cands[0]; if (!top) return;
    const sc = cands[1]?.[1] ?? 0; if (top[1] > 0 && (top[1] - sc) / top[1] >= MIN_M) epithetRes.set(ci, top[0]);
  });
  const subjectRefOf = (c) => { const ci = clauses.indexOf(c); const s = face(c.subject); if (s) return epithetRes.get(ci) ?? idOf(s) ?? null; return bySentence.get(c.order)?.referentId ?? zaBind.get(c.order) ?? null; };
  // learning + scene signal
  const holo = createHolograph({ gamma: 0.9 });
  const surge = createHolograph({ alpha: 1 });
  const B = [];
  for (const c of clauses) { const p = { V: g(c.verb ?? "·") }; const s = subjectRefOf(c); if (s) p.S = nameOfId(s); const o = face(c.object); if (o) p.O = g(o); const rr = admit(holo, p); c.perSlot = rr.perSlot;
    // SURPRISE = how the proposition changes the ACTIVATED portion of the
    // holograph — the region bounded by the salient identity networks (the hot
    // beings). Deltas on cold nodes / the absent mass do NOT register.
    const activeNames = new Set();
    for (const r of zaSeen) if (zaAct.activationOf(r) >= MIN_A) { const nm = nameOfId(r); if (nm) activeNames.add(nm); }
    let actSurprise = 0;
    for (const [slot, row] of Object.entries(rr.perSlot)) if (slot === "S" || activeNames.has(row.value)) actSurprise += row.bayes;
    c.learning = actSurprise;
    B.push(actSurprise);
  }
  const THR = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;
  // the inner voice (the journal; the narration that feeds the cloth)
  const voiceHolo = createHolograph({ gamma: 0.95 });
  const journal = [];
  let said = new Set(); let w = [];
  for (let ci = 0; ci < clauses.length; ci++) {
    const c = clauses[ci];
    const whoId = subjectRefOf(c);
    const who = (() => { if (!whoId) return null; const nm = nameOfId(whoId); return (nm && !nm.startsWith("?")) ? nm : null; })();
    w.push(whoId); if (w.length > 140) w.shift();
    const cnt = new Map(); for (const x of w) if (x) cnt.set(x, (cnt.get(x) ?? 0) + 1);
    const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < top.length - 1; i++) { const [vv, n1] = top[i]; const n2 = top[i + 1]?.[1] ?? 0; if (n1 >= 6 && n1 > 2 * n2) { const [cc2] = top[i + 1]; if (!said.has(vv)) { said.add(vv); journal.push({ at: c.order, span: c.span, type: "REPEAT", fromId: cc2, whoId: vv }); admit(voiceHolo, { ["~:" + String(vv)]: String(cc2) }); } break; } }
    const rev = B[ci];
    const peaked = Number.isFinite(rev) && rev >= THR && rev >= (B[ci - 1] ?? 0) && rev >= (B[ci + 1] ?? 0);
    if (peaked && who) journal.push({ at: c.order, span: c.span, type: "EVENT", whoId });
    const subj = face(c.subject);
    if (subj && nominalClass(subj.toLowerCase(), posPrior) === "NOUN" && !idOf(subj) && (g(stF(subj)) ?? "").startsWith("?")) journal.push({ at: c.order, span: c.span, type: "UNKNOWN", surface: stF(subj) });
  }
  // ---- THE EOT: referents are HASH ids; raw surfaces in the body; pretty names
  // are render-time swaps (a language- and modality-declared, omnilingual record).
  const hashOf = (id) => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return "r_" + h.toString(16).padStart(8, "0"); };
  const hashById = new Map(), idByHash = new Map();
  const visiting = new Set();
  // Third-person doctrine gate: a referent whose rendered name is a person-
  // pronoun ("you", "I") is NEVER admitted — caught here at the visitor so the
  // gate covers every binding path (subjectRefOf, idOf, dative, bySentence,
  // zaBind) in one place. The telling is the voice of the affected.
  const isPersonName = (id) => { const nm = nameOfId(id); return nm === "you" || nm === "I"; };
  for (const c of clauses) {
    const s = subjectRefOf(c); if (s && !isPersonName(s) && !visiting.has(s)) { visiting.add(s); const h = hashOf(s); hashById.set(s, h); idByHash.set(h, s); }
    const o = idOf(face(c.object)); if (o && !isPersonName(o) && !visiting.has(o)) { visiting.add(o); const h = hashOf(o); hashById.set(o, h); idByHash.set(h, o); }
    const d = idOf(face(c.dative)); if (d && !isPersonName(d) && !visiting.has(d)) { visiting.add(d); const h = hashOf(d); hashById.set(d, h); idByHash.set(h, d); }
  }
  const nameByHash = (h) => { const id = idByHash.get(h); return id ? nameOfId(id) : null; };
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1",
    medium: "text", language: "grc",
    source: "homer-odyssey.txt",
    tools: "greekClauses · resolvePronounsByActivation(namedScope:local) · personOf-zero-anaphora · point-epithets · admit().bayes · inner-voice",
    cube: { clauses: "SEG·Figure", edges: "CON·Figure", situations: "SYN·Figure", scenes: "SEG·Pattern", kinds: "INS·Pattern", learning: "EVA·Pattern", voice: "DEF·Ground", fold: "CON·Pattern", record: "REC·Ground", telling: "REC·Ground" },
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, zeroAnaphora: zaBind.size, referents: visiting.size, voiceNotes: journal.length },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: nameOfId(id) })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: String(c.verb ?? "·"), subject: yes(subjectRefOf(c)), object: yes(idOf(face(c.object))) })),
    voice: journal.map((j) => ({ at: j.at, span: j.span, kind: j.type, who: yes(j.whoId) ?? null, from: yes(j.fromId) ?? null, surface: j.surface ?? null })),
    sceneSignal: B,
    language: "declared, not baked — any seam that yields clause-shaped readings with raw surfaces records the same EOT",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, nameOfId, subjectRefOf, bindings, gaps, zaBind, epithetRes, B, THR, journal, voiceHolo, bySentence, eot, hashOf, hashById, idByHash, nameByHash, g };
}