// reader-san.mjs — THE SANSKRIT READ. Same core, same EOT shape, Sanskrit
// priors and material. One doctrine: byte → seam → beings → bound edges →
// scene signal → EOT, all measured, never hand-typed. The clause reader is
// the SAME greekClauses machinery parameterized by janus's Sanskrit priors
// (case-marking-san.json, pos-san.json) — the architecture was always
// cross-lingual; only the priors and the material change.
import fs from "node:fs";

const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { confirmedVerbSet, greekClauses, nominalClass, personOf, caseOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);

const RIGVEDA = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/sanskrit-originals/rigveda.txt";
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-san.json`, "utf8"));
const casePrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/case-marking-san.json`, "utf8"));

const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const nF = (s) => stF(s).replace(/[āīūṝṟḷη]/g, (c) => ({ ā: "a", ī: "i", ū: "u", ṝ: "r", ṟ: "r", ḷ: "l", η: "e" }[c] ?? c));
const NEc = casePrior.nominalEndings ?? {};
const stmF = (w) => { for (let L = 3; L >= 1; L--) { const e = w.slice(-L); const t = NEc[e]; if (t && t.ranked?.[0]?.share >= 0.5 && t.ranked[0].count >= 10) return w.slice(0, w.length - L); } return w; };

// ── SAN-LEMMA, MEASURED (2026-10-09): the POS prior's OWN attestations decide
// the lemma. Sanskrit inflections are regular; the residual is the longest-use
// prior-attested nominal stem that keeps a final vowel — agnim/agniḥ/agninā all
// answer to agni (NOUN×34 in pos-san). No dictionary, no hand-typed word; the
// prior is the giver. Inflections collapse onto one being (soma, yama, rudra,
// deva, agni …) exactly as grc-lemma unifies Greek.
const VOW_X = /[aeiouāīūṝṟ]/;
const sanAttested = (() => { const a = {}; for (const [f, tags] of Object.entries((posPrior.forms ?? {}))) a[f] = Object.entries(tags).sort((x, y) => y[1] - x[1])[0][0]; return a; })();
const kindOf = (w) => {
  let s = stF(w);
  if (s.endsWith("ḥ")) s = s.slice(0, -1);
  if (s.endsWith("m") && s.length > 3) { const core = s.slice(0, -1); if (sanAttested[core] && VOW_X.test(core[core.length - 1] ?? "")) return core; }
  for (let L = 3; L <= Math.min(s.length, 12); L++) {
    const c = s.slice(0, L);
    const cls = sanAttested[c];
    if (cls && (cls === "NOUN" || cls === "ADJ" || cls === "PROPN") && VOW_X.test(c[c.length - 1] ?? "")) return c;
  }
  return s;
};
const fold = (s) => nF(stF(s));
const ALL = confirmedVerbSet(posPrior);
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

// The Sanskrit telling means: the received dictionary has no glosses yet for the
// Rigveda (translate.mjs is Greek) — so nameOfId returns the surface itself
// (never invented); a SANSKRIT dictionary is the janus build still ahead.
const nameOfId = (id) => { if (!id) return null; const c = id.startsWith("N:") ? id.slice(2) : id; return c; };
const g = (w) => String(w ?? "");

export async function readSanSanskrit({ text = null, chars = null, out = null } = {}) {
  const fullRaw = text ?? fs.readFileSync(RIGVEDA, "utf8");
  // strip the GRETIL header block (---\n...\n---) and tail copyrights
  const raw = (chars ? fullRaw.slice(0, chars) : fullRaw).replace(/^---[\s\S]*?\n---\n/, "").replace(/^---[\s\S]*$/gm, "");
  // SANSKRIT SENTENCE SPLIT: verses end at '|', '॥', '।', newline-hymn breaks —
  // IAST has no he case marks we lost; each verse is a sentence.
  const parts = raw.split(/(?<=[।॥|]\s*)/g).map((p) => p.trim()).filter((p) => p.length > 2);
  let acc = 0; const sents = [];
  for (const part of parts) { sents.push({ text: part, order: sents.length, offset: acc }); acc += part.length; }

  const clauses = [];
  for (const s of sents) for (const c of greekClauses(s.text, ALL, posPrior, casePrior, { articleMode: "off", minShare: 0.3, minCount: 10 })) clauses.push({ ...c, order: s.order, sent: s.text, span: [s.offset, s.offset + s.text.length] });

  // referent universe (NOUN/PROPN/PRON/ADJ/NUM), same fallback as Greek
  const nominalLike2 = (w) => { const c = caseOf(w, casePrior, { articleMode: "off" }); return !!(c && (c.case === "Nom" || c.case === "Acc" || c.case === "Gen" || c.case === "Dat")); };
  const refMap = new Map();
  // PERSON-PRONOUNS ARE NOT BEINGS (third-person doctrine, now in Sanskrit):
  // first/second person (aham/tvam) AND the 3rd-person resumptive saḥ/sā/tad
  // (s, t, y, v in the stems) must never open referents — the telling is the
  // voice of the affected; pro-drop recovers who. Stealing the Greek rule; the
  // forms are the Sanskrit pronouns.
  const PERSON_PRON = new Set(["aham", "tvam", "mayā", "tvayā", "mama", "tava", "asmākam", "yuṣmākam", "me", "te", "asmai", "tubhyam", "sva", "sve", "svayam", "s", "t", "y", "v", "sa", "saḥ", "sā", "tad", "tat", "tasya", "asmai", "nu", "kaḥ", "ka", "kim", "yad", "yā", "yac", "yat", "yān", "yāḥ", "tam", "tvan", "tva", "tvā", "vam", "cid", "enam", "ena", "tat", "tan", "tanum", "tān", "idam", "ayam", "iyam", "asya", "etad", "eṣa", "eṣā"]);
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) {
    const f = face(x); if (!f) continue;
    const fs2 = stF(f);
    if (PERSON_PRON.has(fs2)) continue;
    let cat = nominalClass(f.toLowerCase(), posPrior);
    if (!(cat === "NOUN" || cat === "PROPN") && nominalLike2(f)) cat = "NOUN";
    // PRON/DET are never beings — the person-recovery layer's business (the
    // third-person doctrine, measured: the prior's own PRON class decides, no
    // hand list). A relative/pronoun stem (yam, yad, s, t…) can not hold the
    // telling; it points at whoever the read already holds.
    if (!(cat === "NOUN" || cat === "PROPN" || cat === "ADJ" || cat === "NUM")) continue;
    const id = cat === "PROPN" ? "N:" + stF(f) : kindOf(f);
    refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
  }
  const idOf = (x) => { if (!x) return null; const a = x.toLowerCase(); return refMap.get(a) ?? refMap.get(stF(a)) ?? null; };

  // co-reference via the shared resolver (the Greek register won't match IAST
  // pronouns, so mostly it refuses — pro-drop recovered by personOf instead)
  const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "san", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: {}, namedScope: "local" });
  const bySentence = new Map();
  for (const b of bindings) { const prev = bySentence.get(b.sentenceOrder); if (!prev || (!prev.referentId.startsWith("N:") && b.referentId.startsWith("N:"))) bySentence.set(b.sentenceOrder, b); }
  const zaAct = createActivation({ window: WIN });
  const zaBind = new Map(); const zaSeen = new Set();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sMatcher = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
  for (const s of sents) {
    const named = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const c of clauses.filter((c) => c.order === s.order)) if (!face(c.subject) && !bySentence.has(c.order)) {
      const p = personOf(String(c.verb ?? ""), casePrior, { minShare: 0.5, minCount: 10, endingLen: 3 });
      if (p?.person === 3) { const top = [...zaSeen].map((r2) => [r2, zaAct.activationOf(r2)]).sort((a, b) => b[1] - a[1]); const [ref, score] = top[0] ?? []; if (ref && score >= MIN_A) { const sc = top[1]?.[1] ?? 0; if (score > 0 && (score - sc) / score >= MIN_M) zaBind.set(c.order, ref); } }
    }
    for (const r of named) zaSeen.add(r);
    zaAct.observe([...named]);
  }
  // point-bound epithets for Sanskrit (IAST, no Greek accent marks)
  const epithetRes = new Map();
  const namedBySentence = new Map();
  for (const s of sents) { const nm = new Set(); sMatcher.lastIndex = 0; let m; while (m = sMatcher.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r && r.startsWith("N:")) nm.add(r); } namedBySentence.set(s.order, nm); }
  const pointAct = createActivation({ window: WIN });
  let lastP = -1;
  clauses.forEach((c, ci) => {
    if (c.order !== lastP) { lastP = c.order; pointAct.observe([...namedBySentence.get(c.order) ?? []]); }
    const subj = face(c.subject); if (!subj) return;
    if (nominalClass(subj.toLowerCase(), posPrior) !== "NOUN") return;
    const cands = [...namedBySentence.get(c.order) ?? []].map((r) => [r, pointAct.activationOf(r)]).filter((x) => x[1] >= MIN_A).sort((a, b) => b[1] - a[1]);
    const top = cands[0]; if (!top) return;
    const sc = cands[1]?.[1] ?? 0; if (top[1] > 0 && (top[1] - sc) / top[1] >= MIN_M) epithetRes.set(ci, top[0]);
  });
  const subjectRefOf = (c) => { const ci = clauses.indexOf(c); const s = face(c.subject); if (s) return epithetRes.get(ci) ?? idOf(s) ?? null; return bySentence.get(c.order)?.referentId ?? zaBind.get(c.order) ?? null; };

  // learning + scene signal — the SAME admission machinery
  const holo = createHolograph({ gamma: 0.9 });
  const B = [];
  for (const c of clauses) { const p = { V: g(c.verb ?? "·") }; const s = subjectRefOf(c); if (s) p.S = nameOfId(s); const o = face(c.object); if (o) p.O = g(o); const rr = admit(holo, p); c.perSlot = rr.perSlot;
    const activeNames = new Set();
    for (const r of zaSeen) if (zaAct.activationOf(r) >= MIN_A) { const nm = nameOfId(r); if (nm) activeNames.add(nm); }
    let actSurprise = 0;
    for (const [slot, row] of Object.entries(rr.perSlot)) if (slot === "S" || activeNames.has(row.value)) actSurprise += row.bayes;
    c.learning = actSurprise; B.push(actSurprise);
  }
  const THR = [...B].filter(Number.isFinite).sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;

  // the EOT — same schema as the Greek read
  const hashOf = (id) => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return "r_" + h.toString(16).padStart(8, "0"); };
  const hashById = new Map(), idByHash = new Map();
  const visiting = new Set();
  // ONE GATE, EVERY PATH (third-person doctrine): a referent is never admitted
  // if its rendered name is a person-pronoun OR the POS prior classes its
  // surface as PRON/SCONJ/DET — caught at the visitor so the zaBind/bySentence
  // routes can't leak pronoun-stems (yam, tad, yad…) into the cast either.
  const isPersonName = (id) => {
    const nm = nameOfId(id);
    if (nm === "you" || nm === "I" || nm === "aham" || nm === "tvam") return true;
    const cls = nominalClass(stF(String(id ?? "")).replace(/^N:/, ""), posPrior);
    return !!cls && (cls === "PRON" || cls === "SCONJ" || cls === "DET");
  };
  for (const c of clauses) {
    const s = subjectRefOf(c); if (s && !isPersonName(s) && !visiting.has(s)) { visiting.add(s); const h = hashOf(s); hashById.set(s, h); idByHash.set(h, s); }
    const o = idOf(face(c.object)); if (o && !isPersonName(o) && !visiting.has(o)) { visiting.add(o); const h = hashOf(o); hashById.set(o, h); idByHash.set(h, o); }
  }
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1", medium: "text", language: "san",
    source: "rigveda.txt", tools: "greekClauses(case-marking-san, pos-san) · resolvePronouns · personOf-zero-anaphora · admit().bayes",
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, zeroAnaphora: zaBind.size, referents: visiting.size },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: nameOfId(id) })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: String(c.verb ?? "·"), subject: yes(subjectRefOf(c)), object: yes(idOf(face(c.object))) })),
    sceneSignal: B,
    language: "declared, not baked — the seam is one; only the priors differ",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, nameOfId, subjectRefOf, bindings, gaps, zaBind, epithetRes, B, THR, bySentence, eot, hashOf, hashById, idByHash, yes, g };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const chars = Number(process.argv[2] || 15000);
  const out = process.argv[3] || `eot-rigveda-${chars}.json`;
  const t0 = Date.now();
  const r = await readSanSanskrit({ chars, out });
  console.log(`SANSKRIT READ ${chars} chars → ${out} (${Date.now() - t0}ms)`);
  console.log(`  clauses: ${r.clauses.length} · sentences: ${r.sents.length} · referents: ${(r.eot?.referents ?? []).length}`);
}