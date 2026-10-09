// reader-deu.mjs — THE GERMAN READ. German's native grammar carries case in
// the ARTICLE, not the noun-ending (Greek) and not position alone (English):
//   der/die/das → Nom, den → Acc, dem → Dat, des → Gen.
// So a German clause reads: the verb attests the position; an article-marked
// nominal BEFORE the verb in Nom is the subject (agent seat); AFTER the verb
// in Acc is the object (patient seat); Dat after the verb is the dative
// (recipient, the raised Field cell). The EO clause shape — the same one the
// Greek, Sanskrit, and English seams emit — {verb, subject, object, dative}
// each {head, at, case, cell}, so the cube parses German without a second
// machinery. Proper names the POS prior never saw (Gretchen, Faust) are
// admitted by recurrence + not-in-the-text's-own-closed-class, the case-free
// floor (THE-CASE-FREE-CAST); a capital does not decide, recurrence does.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-deu.json", "utf8"));
const TEXT_DIR = "/Users/mlacy/Documents/3.0/Zenodotus";
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3, CASE_FREE_FLOOR = 3;

// GERMAN'S NATIVE GRAMMAR: case is in the article.
const ARTICLE_CASE = { der: "Nom", die: "Nom", das: "Nom", den: "Acc", dem: "Dat", des: "Gen" };
const classOf = (w) => { const c = posPrior.forms?.[stF(w)]; if (!c) return null; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const isVerb = (w) => { const c = classOf(w); return c === "VERB" || c === "AUX"; };
const isNominal = (w) => { const c = classOf(w); return c === "NOUN" || c === "PROPN"; };
const isPron = (w) => { const c = classOf(w); return c === "PRON"; };
const isPropn = (w) => classOf(w) === "PROPN";
const PERSON_PRON = new Set(["ich", "mein", "mir", "mich", "du", "dein", "dir", "dich", "er", "sein", "ihm", "ihn", "sie", "ihr", "wir", "uns", "ihnen", "es", "denen", "deren", "welche", "etwas"]);

export async function readGerman({ text = null, file = null, chars = null, out = null } = {}) {
  let raw;
  if (text) raw = text;
  else if (file) raw = fs.readFileSync(file.startsWith("/") ? file : `${TEXT_DIR}/${file}`, "utf8");
  else throw new TypeError("readGerman: text or a source file path");
  if (chars) raw = raw.slice(0, chars);

  // THE CASE-FREE FLOOR (per-book recurrence + the text's own closed class)
  const words = (raw.match(/[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß'’-]*/g) ?? []).map(stF);
  const seenFreq = new Map(); for (const w of words) seenFreq.set(w, (seenFreq.get(w) ?? 0) + 1);
  // the text's own closed class: the top-frequency words (Zipf — the same
  // derived class surfaces.js/relations-gfp use); a proxy here from the
  // highest-frequency function forms.
  const freqArr = [...new Set(words)].map((w) => [w, seenFreq.get(w)]).sort((a, b) => b[1] - a[1]);
  const closed = new Set(freqArr.slice(0, Math.max(20, Math.floor(Math.sqrt(freqArr.length)))).map(([w]) => w));
  const isCaseFreeBeing = (w) => {
    const f = stF(w);
    if (PERSON_PRON.has(f)) return false;
    if (closed.has(f)) return false;
    if (!/^[A-ZÄÖÜ]/.test(w)) return false;
    // A known proper name (the prior's PROPN class) is a being ALWAYS —
    // Faust, Mephisto, Gretchen are PROPN in pos-deu. This is the prior
    // helping, the compounding you asked for.
    if (isPropn(w)) return true;
    // Otherwise: German's orthographic trap — EVERY noun is capitalized, so a
    // capitalized token is NOT a name signal. The being must be SEAT-RECURRENT:
    // the same capital form appearing in the agent/patient/recipient seat of
    // MANY clauses keeps company (Faust keeps company with Mephisto); a common
    // noun (Erde, Tränen) has one scene and never pops the floor.
    return (seatFreq.get(f) ?? 0) >= SEAT_FLOOR;
  };
  // SEAT-RECURRENCE (the being vote): a form's count of DISTINCT SENTENCES where
  // it holds a seat. German capitalizes every noun, so orthography is a
  // NON-signal; the seat votes (keeps company across scenes).
  let seatFreq = new Map();
  const SEAT_FLOOR = 3;
  const seatCandidates = (toks) => toks.map((t, i) => ({ t, i })).filter(({ t }) => /^[A-ZÄÖÜ]/.test(t) && !PERSON_PRON.has(stF(t)) && !closed.has(stF(t)));
  const isSeat = (w) => (isNominal(w) && (isPropn(w) || (seatFreq.get(stF(w)) ?? 0) >= SEAT_FLOOR)) || isPron(w) || isCaseFreeBeing(w);

  const parts = raw.split(/(?<=[.!?]\s+)/g).map((p) => p.trim()).filter((p) => p.split(" ").length >= 3);
  let acc = 0; const sents = [];
  for (const part of parts) { sents.push({ text: part, order: sents.length, offset: acc }); acc += part.length; }

  // THE SEAT RECURRENCE VOTE (runs now that sents exist; feeds isCaseFreeBeing
  // and isSeat above — in German orthography is a NON-signal, the seat votes).
  for (const s of sents) {
    const toks = [];
    for (const m of s.text.matchAll(/[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß'’-]*/g)) toks.push(m[0]);
    const verbPos = new Set(toks.map((t, i) => ({ t, i })).filter(({ t }) => isVerb(t)).map(({ i }) => i));
    const inSeatPos = new Set();
    for (const { t, i } of seatCandidates(toks)) {
      for (let d = 1; d <= 4; d++) { if (verbPos.has(i - d) || verbPos.has(i + d)) { inSeatPos.add(stF(t)); break; } }
    }
    for (const f of inSeatPos) seatFreq.set(f, (seatFreq.get(f) ?? 0) + 1);
  }

  // THE CLAUSE — article-declared case (German's native grammar), the SAME
  // EO shape as greek.mjs / reader-en.mjs: {verb, subject, object, dative}
  // each {head, headLower, at, case, cell}. The verb attests the position;
  // the article attests the case; position selects the seat.
  const clauses = [];
  const atOf = (toks, i, s) => s.offset + toks.slice(0, i).join(" ").length + (i ? 1 : 0);
  const mk = (tok, i, toks, s, caze, cell) => ({ head: tok, headLower: stF(tok), at: [atOf(toks, i, s), atOf(toks, i, s) + tok.length], case: caze, cell });
  for (const s of sents) {
    const toks = [];
    for (const m of s.text.matchAll(/[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß'’-]*/g)) toks.push(m[0]);
    const verbs = toks.map((t, i) => ({ t, i })).filter(({ t, i }) => isVerb(t) && i + 1 < toks.length);
    for (const { t, i } of verbs) {
      // subject = the nearest Nom-marked seat before the verb: an article-Nom
      // phrase OR a case-free proper name; object = a LATER Acc phrase;
      // dative = a LATER Dat phrase (scan ALL seats, don't break at the first).
      let subject = null;
      for (let j = i - 1; j >= 0 && !subject; j--) {
        if (isCaseFreeBeing(toks[j])) { subject = mk(toks[j], j, toks, s, "Nom", "agt"); break; }
        if (ARTICLE_CASE[stF(toks[j])] === "Nom" && !isVerb(toks[j])) { const k = j + 1; const noun = k < toks.length ? toks[k] : null; subject = mk(noun && isSeat(noun) && !isVerb(noun) ? noun : toks[j], j, toks, s, "Nom", "agt"); break; }
      }
      let object = null, dative = null;
      for (let j = i + 1; j < toks.length; j++) {
        if (isCaseFreeBeing(toks[j])) { if (!object) object = mk(toks[j], j, toks, s, "Acc", "pat"); else if (!dative) dative = mk(toks[j], j, toks, s, "Dat", "rcv"); continue; }
        const art = ARTICLE_CASE[stF(toks[j])];
        if (art && !isVerb(toks[j])) { const k = j + 1; const noun = k < toks.length ? toks[k] : null; const head = noun && isSeat(noun) && !isVerb(noun) ? noun : toks[j]; if (art === "Acc" && !object) { object = mk(head, j, toks, s, "Acc", "pat"); continue; } if (art === "Dat" && !dative) { dative = mk(head, j, toks, s, "Dat", "rcv"); continue; } }
        if (art === "Acc" || art === "Dat") continue; // an article opens its phrase; keep scanning for the other seat
      }
      clauses.push({ verb: t, subject, object, dative, order: s.order, sent: s.text, span: [s.offset, s.offset + s.text.length] });
    }
  }

  // THE REFERENT UNIVERSE + RESOLUTION (the same layering as reader-en:
  // resolve first — pronoun → its who; convert later — only named beings minted)
  const refMap = new Map();
  // SEED THE PRIOR'S PROPNs (the compounding: pos-deu learned Faust and
  // Mephisto are proper names — from German training, and German training
  // exists because its prior was built from the same UD treebank as the
  // other languages). A prior-known proper name is a being ALWAYS, even when
  // this window only shows it once; the prior is the seam's memory of
  // languages. seedSet built fresh on entry.
  const seenSeats = new Set();
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) if (x) seenSeats.add(stF(x.head));
  const seedEntries = () => {
    const forms = posPrior.forms ?? {};
    for (const [form, cls] of Object.entries(forms)) {
      if (!cls || typeof cls !== "object") continue;
      const sorted = Object.entries(cls).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];
      // CONFIDENT PROPN ONLY: the prior names a proper name when PROPN is its
      // dominant class AND not nearly tied with NOUN (Herr NOUN:17 PROPN:5 is
      // a noun the treebank also saw capitalized; Faust PROPN:1 stands alone).
      if (top?.[0] === "PROPN") {
        const total = sorted.reduce((a, [, v]) => a + v, 0);
        const share = top[1] / total;
        if (share >= 0.6) { refMap.set(form, form); refMap.set(stF(form), form); }
      }
    }
  };
  seedEntries();
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) {
    if (!x) continue;
    const f = String(x.head).toLowerCase();
    if (PERSON_PRON.has(stF(f))) continue;
    // admission: a known proper name (prior's PROPN) OR a seat-recurrent form
    // (>=3 distinct sentences holding a seat). A common noun that recurs in
    // the seat IS a being here (the reader cares about what it keeps meeting);
    // a common noun with one scene is not minted.
    if (isCaseFreeBeing(x.head) || (isNominal(x.head) && (isPropn(x.head) || (seatFreq.get(stF(x.head)) ?? 0) >= SEAT_FLOOR))) { refMap.set(f, x.head); refMap.set(stF(f), x.head); }
  }
  const idOf = (x) => { if (!x) return null; return refMap.get(String(x.head ?? x).toLowerCase()) ?? refMap.get(stF(x.head ?? x)) ?? null; };

  const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "deu", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: {}, namedScope: "local" });
  const bySentence = new Map(); for (const b of bindings) bySentence.set(b.sentenceOrder, b);
  const subjectRefOf = (c) => (c.subject ? idOf(c.subject) : null) ?? bySentence.get(c.order)?.referentId ?? null;
  const objectRefOf = (c) => (c.object ? idOf(c.object) : null) ?? null;

  const holo = createHolograph({ gamma: 0.9 });
  const B = [];
  for (const c of clauses) {
    const p = { V: c.verb };
    const s = subjectRefOf(c); if (s) p.S = s;
    const o = objectRefOf(c); if (o) p.O = o;
    const rr = admit(holo, p); B.push(rr.bayes);
  }
  const hashOf = (id) => { let h = 0x811c9dc5; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return "r_" + h.toString(16).padStart(8, "0"); };
  const hashById = new Map(), idByHash = new Map(), visiting = new Set();
  // THE SENT's REFERENT UNIVERSE: the confident prior-PROPNs (seeded, additive
  // across languages — the compounding) AND the edge-bound beings. Only named
  // beings are minted; a pronoun never becomes one (conversion at this layer).
  // The seed is refMap's case-preserved PROPN forms, not its lowercase index.
  const seededRefs = new Set();
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) { const id = x ? idOf(x) : null; if (id) seededRefs.add(id); }
  for (const id of refMap.values()) if (typeof id === "string" && PERSON_PRON.has(stF(id))) { /* pronouns banished */ }
  for (const id of [...new Set([...refMap.values(), ...seededRefs])]) {
    if (!id || !/^[A-Za-zäöüÄÖÜß]/.test(id)) continue;
    const src = refMap.get(id) ?? refMap.get(id.toLowerCase());
    if (src !== id) continue; // only the case-preserved surface is a being name
    if (PERSON_PRON.has(stF(id))) continue;
    // A torn BECAUSE IT APPEARS IN THIS READING (the compounding prior seeds
    // the NAME, but a being is being OF this text — WAGNER/Burgdorf from the
    // treebank have no presence here and are not minted). Edge-bound forms
    // pass automatically; confidently-seeded forms need one occurrence.
    const appears = seenFreq.get(stF(id)) ?? 0;
    if (appears === 0 && !seededRefs.has(id)) continue;
    visiting.add(id); const h = hashOf(id); hashById.set(id, h); idByHash.set(h, id);
  }
  for (const c of clauses) for (const [who, fn] of [["s", subjectRefOf], ["o", objectRefOf]]) {
    const id = fn(c); if (id && !visiting.has(id)) { visiting.add(id); const h = hashOf(id); hashById.set(id, h); idByHash.set(h, id); }
  }
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1", medium: "text", language: "deu",
    source: file ?? text, tools: "article-declared case (der/die/das=Nom den=Acc dem=Dat des=Gen) · pos-deu · resolvePronouns · admit().bayes",
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, referents: visiting.size },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: id })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: c.verb, subject: yes(subjectRefOf(c)), object: yes(objectRefOf(c)) })),
    sceneSignal: B,
    language: "declared, not baked — German reads by article case, the prior carries the classes, the case-free floor carries the names",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, subjectRefOf, objectRefOf, bindings, gaps, B, bySentence, eot, hashOf, hashById, idByHash, yes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = String(process.argv[2] || "11-multi-language/german-originals/frege-ueber-begriff-und-gegenstand.txt");
  const chars = Number(process.argv[3] || 30000);
  const out = process.argv[4] || `eot-german-${chars}.json`;
  try {
    const r = await readGerman({ file, chars, out });
    console.log(`GERMAN READ ${file} (${chars}) → ${out}`);
    console.log(`  clauses: ${r.clauses.length} · sentences: ${r.sents.length} · referents: ${r.eot.referents.length}`);
    console.log("  clause[0]:", JSON.stringify(r.clauses[0]).slice(0, 220));
  } catch (e) { console.error("ERR:", e.message); }
}