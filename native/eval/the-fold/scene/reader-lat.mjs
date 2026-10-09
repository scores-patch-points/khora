// reader-lat.mjs — THE LATIN READ, the exemplar-language compounding made
// explicit. Latin is Pāṇini's world — case-ending morphology, pro-drop —
// so it shares its seam WITH GREEK: the SAME greekClauses() machinery,
// parameterized ONLY by the case-marking-lat and pos-lat priors (the way
// Greek's own header says a markerCases override is injectable "so a second
// case-marking language"). This is the compounding the user asked for: a new
// exemplar language is NOT a new seam, it is a prior + a thin parameter. The
// native grammar is case-ending (nominalEndings: -um→Acc·Sing, -us→Nom·Sing),
// and the clause is the same EO shape: {verb, subject, object, dative}, each
// {head, at, case, cell} — the cube parses Latin as it parses Greek.
import fs from "node:fs";
const KHOR = "/Users/mlacy/Documents/3.0/khora";
const { createActivation } = await import(`${KHOR}/native/kernel/activation.js`);
const { createHolograph, admit } = await import(`${KHOR}/native/kernel/bayes-surprise.js`);
const { resolvePronounsByActivation } = await import(`${KHOR}/native/adapters/text/pronouns.js`);
const { greekClauses, nominalClass, caseOf, isCopula, splitSubordinate, carryRelatives, personOf } = await import(`${KHOR}/native/eval/lavar/greek.mjs`);
const posPrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/pos-lat.json", "utf8"));
const casePrior = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/janus/priors/case-marking-lat.json", "utf8"));
const TEXT_DIR = "/Users/mlacy/Documents/3.0/Zenodotus";
const stF = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const WIN = 160, MIN_A = 0.05, MIN_M = 0.3;

const classOf = (w) => { const c = posPrior.forms?.[stF(w)]; if (!c) return null; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const isVerb = (w) => { const c = classOf(w); return c === "VERB" || c === "AUX"; };
const isNominal = (w) => { const c = classOf(w); return c === "NOUN" || c === "PROPN"; };
const PERSON_PRON = new Set(["ego", "meus", "mihi", "tu", "tuus", "tibi", "is", "ea", "id", "eius", "ei", "eum", "nos", "noster", "nobis", "vos", "vester", "vobis", "ille", "illa", "illud", "qui", "quae", "quod"]);

export async function readLatin({ text = null, file = null, chars = null, out = null } = {}) {
  let raw;
  if (text) raw = text;
  else if (file) raw = fs.readFileSync(file.startsWith("/") ? file : `${TEXT_DIR}/${file}`, "utf8");
  else throw new TypeError("readLatin: text or a source file path");
  if (chars) raw = raw.slice(0, chars);

  // the case-free proper-name floor (the same as English/German, from the
  // text's own recurrence — Vergil/Aeneas/Troia are not all in pos-lat)
  const words = (raw.match(/[A-Za-z]+/g) ?? []).map(stF);
  const seenFreq = new Map(); for (const w of words) seenFreq.set(w, (seenFreq.get(w) ?? 0) + 1);
  const closed = new Set([...new Set(words)].map((w) => [w, seenFreq.get(w)]).sort((a, b) => b[1] - a[1]).slice(0, Math.max(15, Math.floor(Math.sqrt(new Set(words).size)))).map(([w]) => w));

  // THE VERB SET — the prior's attested VERB/AUX forms (like Greek's
  // confirmedVerbSet). pos-lat has the forms; verbs wear personal endings.
  const verbs = new Set();
  for (const [form, cls] of Object.entries(posPrior.forms ?? {})) {
    if (!cls || typeof cls !== "object") continue;
    const top = Object.entries(cls).sort((a, b) => b[1] - a[1])[0];
    if (top?.[0] === "VERB" || top?.[0] === "AUX") verbs.add(form);
  }
  // THE VERB-LIKE FALLBACK (Greek's own): a form the POS prior never saw but
  // whose ending votes an unambiguous personal person at a high floor is a
  // verb BY MEASUREMENT (cano → -o, venit → -it? -it votes 3Sing below the
  // floor here, so it stays a gap and cano only binds if its ending clears).
  const verbLike = (w) => {
    if (verbs.has(w)) return true;
    const p = personOf(w, casePrior, { minShare: 0.6, minCount: 2, endingLen: 2 });
    return !!(p && p.person >= 1);
  };

  const parts = raw.split(/(?<=[.!?\n]\s*)/g).map((p) => p.trim()).filter((p) => p.split(" ").length >= 3);
  let acc = 0; const sents = [];
  for (const part of parts) { sents.push({ text: part, order: sents.length, offset: acc }); acc += part.length; }

  const clauses = [];
  const fullVerbSet = new Set([...verbs]);
  for (const s of sents) {
    // grow the verb set with ending-attested verb-likes from THIS sentence
    const toks = (s.text.match(/[A-Za-z]+/g) ?? []);
    for (const w of toks) if (verbLike(w)) fullVerbSet.add(w);
    const clauseSet = greekClauses(s.text, fullVerbSet, posPrior, casePrior, {
      articleMode: "off", carry: true, minShare: 0.3, minCount: 8,
      markerCases: new Map(), // Latin has no articles; case rides the endings alone
    });
    for (const c of clauseSet) {
      clauses.push({
        verb: c.verb, subject: c.subject, object: c.object, dative: c.dative ?? null,
        order: s.order, sent: s.text, span: [s.offset, s.offset + s.text.length],
      });
    }
  }

  // THE REFERENT UNIVERSE (conversion at minting; resolution first)
  const refMap = new Map();
  const isCaseFreeBeing = (w) => { const f = stF(w); if (PERSON_PRON.has(f)) return false; if (closed.has(f)) return false; if (swearAdmitted(f)) return true; return (seenFreq.get(f) ?? 0) >= 3 && /^[A-Z]/.test(w) && isNominal(w) === false && classOf(w) === null; };
  const swearAdmitted = (f) => refMap.has(f) === false && false; /* reserved: the prior's PROPN-confident forms */
  for (const [form, cls] of Object.entries(posPrior.forms ?? {})) {
    if (!cls || typeof cls !== "object") continue;
    const top = Object.entries(cls).sort((a, b) => b[1] - a[1])[0];
    if (top?.[0] === "PROPN") { refMap.set(form, form); refMap.set(stF(form), form); }
  }
  for (const c of clauses) for (const x of [c.subject, c.object, c.dative]) {
    if (!x) continue;
    const f = stF(String(x.head ?? x));
    if (PERSON_PRON.has(f)) continue;
    if (!isCaseFreeBeing(String(x.head ?? x)) && !(isNominal(String(x.head ?? x)) && ((seenFreq.get(f) ?? 0) >= 3))) continue;
    refMap.set(f, String(x.head ?? x)); refMap.set(f, String(x.head ?? x));
  }
  const idOf = (x) => { if (!x) return null; return refMap.get(stF(String(x.head ?? x))) ?? null; };

  const { bindings, gaps } = resolvePronounsByActivation(sents, refMap, { window: WIN, minActivation: MIN_A, minMargin: MIN_M, language: "lat", createActivation: (o) => createActivation({ window: o.window ?? WIN }), pronounClass: {}, namedScope: "local" });
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
  for (const id of refMap.values()) if (typeof id === "string" && /^[A-Z]/.test(id) && !PERSON_PRON.has(stF(id))) { visiting.add(id); const h = hashOf(id); hashById.set(id, h); idByHash.set(h, id); }
  for (const c of clauses) for (const [who, fn] of [["s", subjectRefOf], ["o", objectRefOf]]) {
    const id = fn(c); if (id && !visiting.has(id)) { visiting.add(id); const h = hashOf(id); hashById.set(id, h); idByHash.set(h, id); }
  }
  const yes = (id) => (id ? hashById.get(id) : null);
  const eot = {
    schema: "@field/EOT-v1", medium: "text", language: "lat",
    source: file ?? text, tools: "case-ending (nominalEndings + verbPersonalEndings) · greekClauses parameterized by case-marking-lat + pos-lat · resolvePronouns · admit().bayes",
    counts: { clauses: clauses.length, sentences: sents.length, bindings: bindings.length, gaps: gaps.length, referents: visiting.size },
    referents: [...visiting].map((id) => ({ hash: hashById.get(id), name: id })),
    edges: clauses.map((c) => ({ at: c.order, span: c.span, action: c.verb, subject: yes(subjectRefOf(c)), object: yes(objectRefOf(c)) })),
    sceneSignal: B,
    language: "declared, not baked — Latin shares the Greek seam; only the priors differ (the exemplar compounding)",
  };
  if (out) fs.writeFileSync(out, JSON.stringify(eot, null, 2));
  return { raw, sents, clauses, refMap, idOf, subjectRefOf, objectRefOf, bindings, gaps, B, bySentence, eot, hashOf, hashById, idByHash, yes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = String(process.argv[2] || "01-literature-books/gutenberg/pg17270_The_Aeneid__Latin_.txt");
  const chars = Number(process.argv[3] || 12000);
  const out = process.argv[4] || `eot-latin-${chars}.json`;
  try {
    const r = await readLatin({ file, chars, out });
    console.log(`LATIN READ ${file} (${chars}) → ${out}`);
    console.log(`  clauses: ${r.clauses.length} · sentences: ${r.sents.length} · referents: ${r.eot.referents.length}`);
    console.log("  clause[0]:", JSON.stringify(r.clauses[0]).slice(0, 240));
  } catch (e) { console.error("ERR:", e.message); }
}