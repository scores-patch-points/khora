// reader-en.mjs — THE ENGLISH READ. English carries its grammar in WORD ORDER,
// not case-endings — so this seam is the same spirit (measured priors, no model)
// but reads position: a sentence's verbs are the POS-prior-confirmed VERB forms
// (pos-eng.json, UD English-EWT), its subject is the first NOUN/PROPN/PRON before
// the verb, its object the first after — S-V-O, the received word-order sense.
// One doctrine: byte → clauses → beings → bound edges → scene signal → EOT.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const JANUS = "/Users/mlacy/Documents/3.0/janus";
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const posPrior = JSON.parse(fs.readFileSync(`${JANUS}/priors/pos-eng.json`, "utf8"));
const TEXT_DIR = "/Users/mlacy/Documents/3.0/Zenodotus";
const face = (x) => { if (!x) return ""; if (typeof x === "string") return x; return String(x.head ?? x.surface ?? x.text ?? ""); };
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

// the POS prior's dominant class per form — the giver. VERB set = the verbs.
const classOf = (w) => { const c = posPrior.forms?.[stF(w)]; if (!c) return null; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const isVerb = (w) => { const c = classOf(w); return c === "VERB" || c === "AUX"; };
const isNominal = (w) => { const c = classOf(w); return c === "NOUN" || c === "PROPN" || c === "PRON" || c === "ADJ" || c === "NUM"; };

export async function readEnglish({ text = null, file = null, chars = null, out = null } = {}) {
  let raw;
  if (text) raw = text;
  else if (file) raw = fs.readFileSync(file.startsWith("/") ? file : `${TEXT_DIR}/${file}`, "utf8");
  else throw new TypeError("readEnglish: text or a source file path");
  if (chars) raw = raw.slice(0, chars);
  const parts = raw.split(/(?<=[.!?]\s+)/g).map((p) => p.trim()).filter((p) => p.split(" ").length >= 3);
  let acc = 0; const sents = [];
  for (const part of parts) { sents.push({ text: part, order: sents.length, offset: acc }); acc += part.length; }

  // WORD-ORDER CLAUSE: the verb is the position, the subject is the nominal
  // before it, the object the nominal after it (S-V-O). Born in the seam, from
  // the measured prior's VERB/NOUN classes — never a hand-typed grammar.
  const clauses = [];
  for (const s of sents) {
    const toks = s.text.split(/\s+/).map((t) => t.replace(/^[^a-zA-Z0-9']+|[,.;:]$|-…$/g, "")).filter(Boolean);
    const verbs = toks.map((t, i) => ({ t, i })).filter(({ t }) => isVerb(t));
    for (const { t, i } of verbs) {
      const subject = toks.slice(0, i).reverse().find((x) => isNominal(x)) ?? null;
      const object = toks.slice(i + 1).find((x) => isNominal(x) && !subject) ?? null;
      clauses.push({ verb: t, subject, object, order: s.order, sent: s.text, span: [s.offset, s.offset + s.text.length] });
    }
  }
  // CROSS-BOUNDARY OBJECT — THE SEAM'S OWN MACHINERY, NOT A VERB LIST
  // (2026-10-09). greek.mjs already solves this with splitSubordinate +
  // carryRelatives: a complementizer (that/to/who…) opens a sub-segment, and
  // the matrix's stranded nominal is CARRIED into the embedded clause's head —
  // "Elizabeth felt that he was kind" → split at "that", "he" enters the
  // embedded head, and the matrix verb can take the embedded subject as its
  // object. This is the same algorithm ported to English word-order openers;
  // a hand-set CARRIES_OBJ verb list was the regression (magic numbers in the
  // canon's teeth) and is removed.
  const EN_OPENERS = new Set(["that", "who", "whom", "whose", "which", "whether", "if"]);
  const PERSON_PRON_FOR = new Set(["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "that", "this", "there", "one"]);
  const enTokens = (c) => c.sent.split(/\s+/).map((t) => t.replace(/^[^a-zA-Z0-9']+|[,.;:]$|-…$/g, "")).filter(Boolean);
  // SPLIT+VIEW: for a matrix-verb clause with no object, look past the "that"
  // opener and take the first nominal of the embedded clause as the carried
  // head that rides back — the object the matrix verb's argument was.
  for (const c of clauses) {
    if (c.object) continue;
    const toks = enTokens(c);
    const cv = stF(c.verb === "was" ? "was" : c.verb);
    let vi = -1; for (let j = 0; j < toks.length; j++) if (stF(toks[j]).startsWith(cv.slice(0, Math.min(4, cv.length)))) { vi = j; break; }
    let head = null;
    if (vi >= 0) for (let j = vi + 1; j < toks.length; j++) {
      if (EN_OPENERS.has(stF(toks[j]))) {
        const next = toks[j + 1];
        // CARRY ONLY A PROPN: the carried object must be a BEING the reader
        // holds (that Mr Bingley, that Netherfield) — not a temporal abstract
        // (that time, that moment). Measured after the first pass flooded the
        // thread with time×30/moment×27/way×22; "that way/that moment" are not
        // referents, they are adverbial heads.
        if (next && classOf(next) === "PROPN" && !PERSON_PRON_FOR.has(stF(next))) head = next;
        break;
      }
    }
    if (head) c.object = head;
  }

  // the referent universe: NOUN/PROPN only (PRON/ADJ/NUM/DET are not beings —
  // the third-person doctrine, caught by class)
  const refMap = new Map();
  const PERSON_PRON = new Set(["i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "we", "us", "our", "ours", "they", "them", "their", "theirs", "it", "its", "this", "that", "these", "those", "who", "whom", "which", "what"]);
  for (const c of clauses) for (const x of [c.subject, c.object]) {
    if (!x) continue;
    const f = String(x).toLowerCase();
    if (PERSON_PRON.has(stF(f))) continue;
    const cl = classOf(f);
    if (!(cl === "NOUN" || cl === "PROPN")) continue;
    const id = f; // English names are already the word — no N: flag needed (grc needed it for its no-lemma case)
    refMap.set(f.toLowerCase(), id); refMap.set(stF(f), id);
  }
  const idOf = (x) => { if (!x) return null; const a = String(x).toLowerCase(); return refMap.get(a) ?? refMap.get(stF(a)) ?? null; };

  const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "eng", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: {}, namedScope: "local" });
  const bySentence = new Map();
  for (const b of bindings) bySentence.set(b.sentenceOrder, b);
  // THE REFERENCE-BINDING TIER (2026-10-09, the shared gap, closed for English):
  // 18,106 of 18,117 subjectless English clauses have a named being in the last
  // 12 — the pronoun/pro-drop is recoverable from the ACTIVATED cast, with
  // margin, language-agnostic (no pronoun table; the Greek loop, ported whole):
  // "she listened" → elizabeth, when elizabeth is hot.
  const zaAct = createActivation({ window: WIN });
  const refBind = new Map(); const zaSeen = new Set();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sMatcher2 = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
  for (const s of sents) {
    const named = new Set(); sMatcher2.lastIndex = 0; let m; while (m = sMatcher2.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const c of clauses.filter((c) => c.order === s.order && !c.subject && !bySentence.has(c.order))) {
      const top = [...zaSeen].map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]);
      const [ref, score] = top[0] ?? [];
      if (ref && score >= MIN_A) { const sc = top[1]?.[1] ?? 0; if (score > 0 && (score - sc) / score >= MIN_M) refBind.set(c.order, ref); }
    }
    for (const r of named) zaSeen.add(r);
    zaAct.observe([...named]);
  }
  const subjectRefOf = (c) => { if (c.subject) return idOf(c.subject) ?? null; return bySentence.get(c.order)?.referentId ?? refBind.get(c.order) ?? null; };

  // learning + scene signal (the same admission)
  const holo = createHolograph({ gamma: 0.9 });
  const B = [];
  for (const c of clauses) {
    const p = { V: c.verb };
    const s = subjectRefOf(c); if (s) p.S = s;
    const o = c.object ? idOf(c.object) : null; if (o) p.O = o;
    const rr = admit(holo, p); c.perSlot = rr.perSlot;
    c.learning = rr.bayes; B.push(rr.bayes);
  }
  const THR = B.sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;

  const hashOf = (id) => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return "r_" + h.toString(16).padStart(8, "0"); };
  const hashById = new Map(), idByHash = new Map();
  const visiting = new Set();
  for (const c of clauses) {
    const s = subjectRefOf(c); if (s && !visiting.has(s)) { visiting.add(s); const h = hashOf(s); hashById.set(s, h); idByHash.set(h, s); }
    const o = c.object ? idOf(c.object) : null; if (o && !visiting.has(o)) { visiting.add(o); const h = hashOf(o); hashById.set(o, h); idByHash.set(h, o); }
  }
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1", medium: "text", language: "eng",
    source: file ?? text, tools: "word-order S-V-O · pos-eng (UD English-EWT) · resolvePronouns · admit().bayes",
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, referents: visiting.size },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: id })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: c.verb, subject: yes(subjectRefOf(c)), object: c.object ? yes(idOf(c.object)) : null })),
    sceneSignal: B,
    language: "declared, not baked — English reads by word order, the prior carries the classes",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, subjectRefOf, bindings, gaps, B, THR, bySentence, eot, hashOf, hashById, idByHash, yes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = String(process.argv[2] || "01-literature-books/gutenberg/pg1342_PrideAndPrejudice.txt");
  const chars = Number(process.argv[3] || 20000);
  const out = process.argv[4] || `eot-english-${chars}.json`;
  try {
    const r = await readEnglish({ file, chars, out });
    console.log(`ENGLISH READ ${file} (${chars}) → ${out}`);
    console.log(`  clauses: ${r.clauses.length} · sentences: ${r.sents.length} · referents: ${r.eot.referents.length}`);
    const names = new Set(r.eot.referents.map((x) => x.name));
    console.log("  named:", [...names].slice(0, 12).join(", "));
  } catch (e) { console.error("ERR:", e.message); }
}