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

// THE CASE-FREE SEAT (2026-10-09, THE-CASE-FREE-CAST / THE-TRANSFER-FUNCTION §2):
// a wordlist POS prior is a received vocabulary, and a never-seen proper name
// (darcy, bingley) has NO entry — so the S-V-O seat refused the cast and "Darcy
// was writing" bound no subject. Greek never had this hole: case-endings
// classify ANY form. English's positional analogue, measured, is: when the
// prior is SILENT (class === null), a token that RECURS, is NOT in this text's
// own Zipf-derived closed class, and is not a person-pronoun is eligible as a
// seat / referent. The prior stays authoritative when it knows; the recurrence
// + not-closed floor carries when it's silent — extracted, never received.
const CASE_FREE_FLOOR = 3, CASE_FREE_VETO = new Set(["i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "we", "us", "our", "ours", "they", "them", "their", "theirs", "it", "its", "this", "that", "these", "those", "who", "whom", "which", "what"]);

export async function readEnglish({ text = null, file = null, chars = null, out = null } = {}) {
  let raw;
  if (text) raw = text;
  else if (file) raw = fs.readFileSync(file.startsWith("/") ? file : `${TEXT_DIR}/${file}`, "utf8");
  else throw new TypeError("readEnglish: text or a source file path");
  if (chars) raw = raw.slice(0, chars);
  // THE CASE-FREE FREQUENCY FLOOR (per book): recurring tokens the POS prior
  // is silent about, vetoed by the text's own Zipf closed class — the seats a
  // wordlist reader would have refused (darcy, bingley). Extracted, not received.
  const words = (raw.match(/[a-zA-Z][a-zA-Z'’-]*/g) ?? []).map((w) => stF(w));
  const seenFreq = new Map(); for (const w of words) seenFreq.set(w, (seenFreq.get(w) ?? 0) + 1);
  const isCaseFreeBeing = (w) => { if (!w) return false; const f = stF(w); if (CASE_FREE_VETO.has(f)) return false; if (classOf(w) !== null) return false; return (seenFreq.get(f) ?? 0) >= CASE_FREE_FLOOR; };
  const isSeat = (w) => isNominal(w) || isCaseFreeBeing(w);
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
      const subject = toks.slice(0, i).reverse().find((x) => isSeat(x)) ?? null;
      const object = toks.slice(i + 1).find((x) => isSeat(x) && !subject) ?? null;
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

  // THE REFERENT UNIVERSE is assembled at LAYER B (conversion), below. Here, at
  // LAYER A (resolution), a pronoun is NOT excluded — it is a long referent
  // that RESOLVES to a being ("I" to the speaker, "you" to the addressee,
  // "he/she/it" to the hot being). The third-person doctrine is a RENDERING
  // gate, applied only when referents are minted: a being is a named being; a
  // pronoun never becomes one. Resolving first, converting later.
  const refMap = new Map();
  const PERSON_PRON = new Set(["i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "we", "us", "our", "ours", "they", "them", "their", "theirs", "it", "its", "this", "that", "these", "those", "who", "whom", "which", "what"]);
  for (const c of clauses) for (const x of [c.subject, c.object]) {
    if (!x) continue;
    const f = String(x).toLowerCase();
    const cl = classOf(f);
    const isBeingClass = cl === "NOUN" || cl === "PROPN";
    if (!isBeingClass && !(cl === null && (seenFreq.get(stF(f)) ?? 0) >= CASE_FREE_FLOOR)) continue;
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
  const refBind = new Map(); const objBind = new Map(); const zaSeen = new Set();
  // THE DIALOGUE SEATS (2026-10-09): "I"/"you" are not unbound hot-cast — they
  // are a WHO: the speaker being, and the addressee being (the being on stage
  // who is not speaking). The seam tracks the most recent speaker-attribution
  // ("said Darcy" → speaker=darcy; the addressee = the hottest on-stage being
  // other than the speaker). Resolution FIRST (the pronoun becomes its being);
  // third-person is a LATER rendering, enforced only when refMap is minted.
  let speakerRef = null;
  // SPEAKER IS STRUCTURE, NOT A WORDLIST (2026-10-09, the user's question:
  // "are we going to hand-list this per language?" — NO. Attribution is the
  // QUOTED SPAN: the utterance is the bytes between quotes, and the speaker
  // is the being bound in the clause co-occurring with that span. Quotes are
  // bytes in every script — Greek, Sanskrit, English, a screenplay — so the
  // speaker seat is found by the same structure everywhere. A per-language
  // SPEECH_VERB list was the regression (magic words in the canon's teeth).
  const sentenceQuoted = new Set();
  for (const s of sents) if (/["“”]/.test(s.text)) sentenceQuoted.add(s.order);
  const isSpeechClause = (c) => sentenceQuoted.has(c.order) && !!subjectCandidateRef(c);
  const addresseeOf = (exclude) => { const top = [...zaSeen].filter((r) => r !== exclude).map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]); return top[0]?.[0] ?? null; };
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sMatcher2 = (() => { const u = [...new Set([...refMap.keys()].filter(Boolean))].sort((a, b) => b.length - a.length); return new RegExp(`(?<![\\p{L}\\p{N}])(?:${u.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu"); })();
  // A pronoun/ADJ-headed seat is a seat WITHOUT A BEING at it — the same gap the
  // reference-binding tier was built to close, now ALSO for seats the S-V-O seam
  // filled with a pronoun instead of leaving empty (2026-10-09, whole-book and
  // chapter: "she listened" had been bound; "said she → she felt" had not — the
  // pronoun sat ON the seat, a filled gap, invisible to `!c.subject`).
  const unboundSeated = (c) => { if (c.order === undefined) return false; if (bySentence.has(c.order)) return false; if (refBind.has(c.order)) return false; const s = c.subject; if (!s) return true; const cl = classOf(s); return !(cl === "NOUN" || cl === "PROPN"); };
  const subjectCandidateRef = (c) => {
    const d = c.subject ? idOf(c.subject) : null; if (d) return d;
    // RESOLUTION OF A PRONOUN-SEATED BEING THROUGH THE DIALOGUE SEATS — the
    // pronoun BECOMES its who BEFORE any third-person conversion. First person
    // is the speaker, second the addressee; only 3rd-person falls to heat.
    const f = c.subject ? stF(c.subject) : null;
    if (f && /^(i|me|my|mine|we|us|our|ours)$/.test(f) && speakerRef) return speakerRef;
    if (f && /^(you|your|yours)$/.test(f)) { const a = addresseeOf(null); if (a) return a; }
    return bySentence.get(c.order)?.referentId ?? refBind.get(c.order) ?? null;
  };
  const topActive = (exclude) => { const top = [...zaSeen].filter((r) => r !== exclude).map((r) => [r, zaAct.activationOf(r)]).sort((a, b) => b[1] - a[1]); const [ref, score] = top[0] ?? []; if (ref && score >= MIN_A) { const sc = top[1]?.[1] ?? 0; if (score > 0 && (score - sc) / score >= MIN_M) return ref; } return null; };
  for (const s of sents) {
    const named = new Set(); sMatcher2.lastIndex = 0; let m; while (m = sMatcher2.exec(s.text), m) { const r = refMap.get(m[0]) ?? refMap.get(m[0].toLowerCase()); if (r) named.add(r); }
    for (const c of clauses.filter((c) => c.order === s.order && unboundSeated(c) && !bySentence.has(c.order))) {
      const ref = topActive(null);
      if (ref) refBind.set(c.order, ref);
    }
    // THE SPEAKER SEAT (2026-10-09): the attribution clause is the quoted
    // span's co-occurring clause whose subject is a being — the SPEAKER of
    // the turn. First-person pronouns ("I", "me") resolve to it; second
    // person ("you") to the addressee (the hottest being who isn't speaking).
    // RESOLUTION FIRST (the pronoun becomes a who); the third-person spelling
    // is applied only when refMap is later minted at the conversion layer.
    for (const c of clauses.filter((c) => c.order === s.order && isSpeechClause(c))) {
      const who = subjectCandidateRef(c);
      if (who) speakerRef = who;
    }
    // THE OBJECT TIER (2026-10-09): the object seat is case-marked as a DIFFERENT
    // participant (he/him, she/her) — resolve it to the hottest being EXCLUDING
    // this clause's own subject. Greek had held this in its Accusative; English
    // pronoun objects ("she watched him") were starved 322/16879 edges, which
    // starved the whole kinds-on-kinds second floor (THE-KINDS-ON-KINDS).
    for (const c of clauses.filter((c) => c.order === s.order && !objBind.has(c.order))) {
      const o = c.object;
      if (!o) { objBind.set(c.order, null); continue; }
      const direct = idOf(o);
      if (direct) { objBind.set(c.order, -1); continue; } // -1: direct, resolved at read time
      const subjRef = subjectCandidateRef(c);
      const fo = stF(o);
      // 1st-person object ("she watched me") = the speaker; 2nd-person object
      // ("he watched you") = the addressee; 3rd-person = hot-excluding-subject.
      if (/^(me|us)$/.test(fo) && speakerRef) { objBind.set(c.order, speakerRef); continue; }
      if (/^(you|your|yours)$/.test(fo)) { const a = addresseeOf(subjRef ?? null); objBind.set(c.order, a ?? null); continue; }
      const ref = topActive(subjRef ?? null);
      objBind.set(c.order, ref ?? null);
    }
    for (const r of named) zaSeen.add(r);
    zaAct.observe([...named]);
  }
  const objectRefOf = (c) => { const b = objBind.get(c.order); if (b === -1) return idOf(c.object) ?? null; return b ?? null; };
  const subjectRefOf = (c) => {
    // A seat that carries a BEING directly (NOUN/PROPN) is the being itself;
    // a pronoun seat resolves through the dialogue seats (speaker/addressee)
    // or activation — RESOLUTION FIRST, third-person conversion at refMap.
    return subjectCandidateRef(c) ?? null;
  };

  // learning + scene signal (the same admission)
  const holo = createHolograph({ gamma: 0.9 });
  const B = [];
  for (const c of clauses) {
    const p = { V: c.verb };
    const s = subjectRefOf(c); if (s) p.S = s;
    const o = objectRefOf(c); if (o) p.O = o;
    const rr = admit(holo, p); c.perSlot = rr.perSlot;
    c.learning = rr.bayes; B.push(rr.bayes);
  }
  const THR = B.sort((a, b) => a - b)[Math.floor(B.length * 0.9)] ?? 0;

  const hashOf = (id) => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return "r_" + h.toString(16).padStart(8, "0"); };
  const hashById = new Map(), idByHash = new Map();
  const visiting = new Set();
  for (const c of clauses) {
    const s = subjectRefOf(c); if (s && !visiting.has(s)) { visiting.add(s); const h = hashOf(s); hashById.set(s, h); idByHash.set(h, s); }
    const o = objectRefOf(c); if (o && !visiting.has(o)) { visiting.add(o); const h = hashOf(o); hashById.set(o, h); idByHash.set(h, o); }
  }
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1", medium: "text", language: "eng",
    source: file ?? text, tools: "word-order S-V-O · pos-eng (UD English-EWT) · resolvePronouns · admit().bayes",
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, referents: visiting.size },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: id })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: c.verb, subject: yes(subjectRefOf(c)), object: yes(objectRefOf(c)) })),
    sceneSignal: B,
    language: "declared, not baked — English reads by word order, the prior carries the classes",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, subjectRefOf, objectRefOf, objBind, bindings, gaps, B, THR, bySentence, eot, hashOf, hashById, idByHash, yes };
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