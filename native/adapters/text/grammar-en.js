// grammar-en.js — the ENGLISH GRAMMAR ADAPTER of NL → grammar → EOT → back: English text → EOTClaim@1, language-neutral claims.
// Part 1, the reader (a UD parse with named repairs); part 2, UD rows → claims (passives, conjuncts, relative clauses, participles,
// appositives, comparatives, superlatives, hedges, figures as measure + base value). Everything English lives here and nowhere downstream.
//   1. a number word the tagger called a verb ("have eight legs" → eight/VERB) is a numeral (giver: the English cardinal words, a closed class)
//   2. a sentence with no verb, where a word UniMorph lists as a verb form sits after the first noun ("Water boils at 100 degrees"), has that
//      word re-tagged VERB and is re-parsed (giver: UniMorph English, khora/native/priors/pos-eng-lexicon.json)
import fs from "node:fs";
import * as P from "./english-parser.js";
import { bindFigures } from "./figure-binding.js";
import { unreadWords } from "./claim-coverage.js";
const K = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const model = P.loadModel(JSON.parse(fs.readFileSync(`${K}/priors/parser-eng-ewt.json`, "utf8")), { morphology: JSON.parse(fs.readFileSync(`${K}/priors/morphology-eng.json`, "utf8")) });
const LEX = JSON.parse(fs.readFileSync(`${K}/priors/pos-eng-lexicon.json`, "utf8")).classes;
export const VERB_FORMS = new Set(LEX.VERB.map((w) => String(w).toLowerCase()));
const VERBISH = new Set([...LEX.VERB, ...LEX["NOUN|VERB"]].map((w) => String(w).toLowerCase()));
export const CARDINAL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, thousand: 1000, million: 1e6, billion: 1e9, dozen: 12 };
// READER=ud: the language-neutral ud-parser.js model trained on the treebank (models/UD_English-EWT.json); else khora's english-parser.js
// the reader: ud-parser.js with its English prior and the UniMorph lexicon it was trained with, when both are on disk; else english-parser.js
const UD_MODEL = process.env.FOLD_UD_MODEL ?? `${K}/priors/ud-parser-eng-ewt.json.gz`, UD_LEX = process.env.FOLD_UD_LEX ?? `${K}/priors/unimorph-eng-pos.json.gz`;
const U = process.env.FOLD_READER !== "english-parser" && fs.existsSync(UD_MODEL) ? await import("./ud-parser.js") : null;
const UD_CL = process.env.FOLD_UD_CLUSTERS ?? `${K}/priors/clusters-eng.json.gz`;
const UM0 = U ? await U.readJsonMaybeGz(UD_MODEL) : null;
// the clusters file is read only when the model was trained with one (its meta names it)
const UM = U ? U.loadModel(UM0, { lex: fs.existsSync(UD_LEX) ? await U.loadLexiconFile(UD_LEX) : null, clusters: UM0.meta?.clusters && fs.existsSync(UD_CL) ? await U.loadClustersFile(UD_CL) : null }) : null;
export const READER = UM ? "ud-parser" : "english-parser";
const build = (forms, tags) => {
  // a number and a name are their own lemma ("Jan" is not "January")
  if (UM) return U.analyse(UM, forms, tags).map((r) => (r.upos === "NUM" ? { ...r, lemma: r.form.toLowerCase() } : r.upos === "PROPN" ? { ...r, lemma: r.form } : r));
  const words = ["ROOT", ...forms], T = ["ROOT", ...tags];
  const heads = P.parseSentence(model.parser, words, T), labels = P.labelSentence(model.labeller, heads, words, T);
  return forms.map((form, k) => { const { lemma, feats } = P.lemmaAndFeats(model.lexicon, form, tags[k]); return { id: k + 1, form, lemma: tags[k] === "NUM" ? form.toLowerCase() : lemma, upos: tags[k], feats, head: heads[k + 1], deprel: labels[k + 1] }; });
};
export const repairs = { cardinal: 0, verb: 0 };
// 2b. a hyphenated word coordinated right after a verb ("discovered and out-licensed"), whose last part the lexicon allows as a verb, is a verb
export function hyphenVerbTags(forms, tags) {
  forms.forEach((f, i) => { if (i >= 2 && tags[i] !== "VERB" && /\p{L}-\p{L}/u.test(f) && /^(and|or)$/i.test(forms[i - 1]) && tags[i - 2] === "VERB" && /(^|\|)V(\||$)/.test(UM?.lex?.get(f.slice(f.lastIndexOf("-") + 1).toLowerCase()) ?? "")) { tags[i] = "VERB"; repairs.hyphenVerb = (repairs.hyphenVerb ?? 0) + 1; } });
  return tags;
}
export function rowsOf(text) { return rowsOfK(text, 1)[0] ?? []; }
/** up to k readings of one sentence (k > 1 needs the ud-parser reader), each with the same repairs */
export function rowsOfK(text, k = 1) {
  const tk = P.tokenize(text); if (!tk.length) return [];
  const forms = tk.map((t) => t.form);
  const tags = UM ? (U.tagWith ? (UM.meta?.lexicon !== undefined ? U.tagWith(UM.tagger, forms, UM.lex, UM.clusters) : P.tagSentence(UM.tagger, forms)) : P.tagSentence(UM.tagger, forms)) : P.tagSentence(model.tagger, forms);
  let fixed = false;
  tags.forEach((t, i) => { if (t !== "NUM" && CARDINAL[forms[i].toLowerCase()] != null && /^(VERB|ADJ|NOUN)$/.test(t) && i + 1 < forms.length && /^\p{L}/u.test(forms[i + 1])) { tags[i] = "NUM"; fixed = true; repairs.cardinal++; } });
  // 3. "have/has/had" tagged as an auxiliary with no verb after it in the clause is the main verb ("spiders have eight legs")
  tags.forEach((t, i) => { if (t === "AUX" && /^(have|has|had)$/i.test(forms[i])) { const next = tags.slice(i + 1).findIndex((x) => /^(VERB|PUNCT)$/.test(x)); if (next < 0 || tags[i + 1 + next] === "PUNCT") { tags[i] = "VERB"; repairs.have = (repairs.have ?? 0) + 1; } } });
  hyphenVerbTags(forms, tags);
  let rows = build(forms, tags);
  if (!rows.some((r) => /^(VERB|AUX)$/.test(r.upos))) {
    const firstNoun = tags.findIndex((t) => /^(NOUN|PROPN|PRON)$/.test(t));
    const j = firstNoun < 0 ? -1 : forms.findIndex((f, i) => i > firstNoun && /^(NOUN|ADJ)$/.test(tags[i]) && VERBISH.has(f.toLowerCase()) && /(s|ed)$/i.test(f));
    if (j >= 0) { tags[j] = "VERB"; rows = build(forms, tags); repairs.verb++; fixed = true; }
  }
  const readings = k > 1 && UM ? U.analyseK(UM, forms, k, tags).map((x) => x.rows.map((r) => (r.upos === "NUM" ? { ...r, lemma: r.form.toLowerCase() } : r))) : [rows];
  return readings.map((rs) => repairRelcl(rs, tk));
}
// a hyphenated verb the lexicon does not know keeps its prefix and takes its last part's lemma ("out-licensed" → "out-license")
const lemmaHyphen = (rows) => { for (const r of rows) if (r.upos === "VERB" && /\p{L}-\p{L}/u.test(r.form) && r.lemma.toLowerCase() === r.form.toLowerCase()) { const i = r.form.lastIndexOf("-"), tail = r.form.slice(i + 1); const t = UM ? U.analyse(UM, [tail], ["VERB"])[0]?.lemma : P.lemmaAndFeats(model.lexicon, tail, "VERB").lemma; if (t) r.lemma = `${r.form.slice(0, i + 1).toLowerCase()}${String(t).toLowerCase()}`; } return rows; };
function repairRelcl(rows, tk) {
  lemmaHyphen(rows);
  // 4. a verb with its own auxiliary hung as a relative clause under a nominal root ("Marie Curie was born in 1867" parsed as a name modified
  //    by "born") is the sentence's verb: a relative clause has a relative pronoun or none, never a finite "was" of its own after the name
  const root = rows.find((r) => r.head === 0);
  if (root && /^(NOUN|PROPN)$/.test(root.upos)) {
    const v = rows.find((r) => r.head === root.id && r.deprel === "acl:relcl" && r.upos === "VERB" && rows.some((a) => a.head === r.id && /^aux/.test(a.deprel)) && !rows.some((a) => a.head === r.id && /^(nsubj|nsubj:pass)$/.test(a.deprel)));
    if (v) { const pass = rows.some((a) => a.head === v.id && a.deprel === "aux:pass"); v.head = 0; v.deprel = "root"; root.head = v.id; root.deprel = pass ? "nsubj:pass" : "nsubj"; repairs.relcl = (repairs.relcl ?? 0) + 1; }
  }
  repairShape(rows);
  rows.forEach((r, k) => { r.start = tk[k].start; r.end = tk[k].end; });
  return rows;
}
/** layer-3 repairs of tree shapes UD rules out or English word order settles, each measured on UD_English-EWT test (eval/meaning PREREG run 7);
 *  `only` names the repairs to apply (all by default). Mutates and returns rows. */
export const SHAPE_REPAIRS = ["doubleObj", "reducedRelative"];
export function repairShape(rows, only = SHAPE_REPAIRS) {
  const kids = (id) => rows.filter((r) => r.head === id), byId = (id) => rows.find((r) => r.id === id);
  // 5. a verb with two objects: UD gives a verb one obj, and English says the recipient first ("paid Centessa an upfront payment")
  //    The recipient is a party (a name or personal pronoun, right after the verb), the thing a noun or number after it (a
  //    pronoun there is a misread relative clause: "have everything what a customer needs"); "someone else 's phone" is a possessor
  if (only.includes("doubleObj")) for (const v of rows) {
    const o = kids(v.id).filter((k) => k.deprel === "obj");
    if (o.length === 2 && (o[0].upos === "PROPN" || o[0].upos === "PRON" && /^(me|you|him|her|it|us|them)$/i.test(o[0].form)) && o[0].id < o[1].id && /^(NOUN|NUM)$/.test(o[1].upos) && !kids(o[0].id).some((d) => d.deprel === "case") && !rows.some((r) => r.id > v.id && r.id < o[0].id && r.head !== o[0].id)) { o[0].deprel = "iobj"; repairs.doubleObj = (repairs.doubleObj ?? 0) + 1; }
  }
  // 6. a reduced relative read as the main verb: "The milestone, achieved when …, was paid to Sagard": a bare participle root with a subject
  //    before it, and a later verb with its own auxiliary and no subject hanging from it, is a modifier of that subject; the later verb is the clause
  if (only.includes("reducedRelative")) {
    const R = rows.find((r) => r.head === 0);
    const X = R && R.upos === "VERB" && /ed$|en$/.test(R.form) && !kids(R.id).some((k) => /^(aux|aux:pass|cop|mark)$/.test(k.deprel)) ? kids(R.id).find((k) => k.deprel === "nsubj" && k.id < R.id && byId(R.id - 1)?.upos === "PUNCT") : null;
    const V = X ? kids(R.id).find((k) => k.id > R.id && k.upos === "VERB" && /^(parataxis|conj|ccomp|advcl)$/.test(k.deprel) && kids(k.id).some((a) => /^aux/.test(a.deprel)) && !kids(k.id).some((a) => /^(nsubj|nsubj:pass|expl|mark|cc)$/.test(a.deprel))) : null;
    if (V) { const pass = kids(V.id).some((a) => a.deprel === "aux:pass"); V.head = 0; V.deprel = "root"; X.head = V.id; X.deprel = pass ? "nsubj:pass" : "nsubj"; R.head = X.id; R.deprel = "acl"; repairs.reducedRelative = (repairs.reducedRelative ?? 0) + 1; }
  }
  return rows;
}

// grammar-en.mjs — the ENGLISH grammar adapter: English text → EOT claims (EOTClaim@1). Everything English lives here: the parser and its
// repairs (reader.mjs), the closed classes (negation, reporting verbs, modals, titles, number and unit words, comparatives). What leaves is
// language-neutral: relation and head keys are lemmas used as glosses, figures are already a measure and a base value, names carry no titles.
// (was: meaning2.mjs — a claim against a source sentence by PROPOSITION IDENTITY.) Both are read by the same reader (reader.mjs: khora's parser + its
// named repairs). A proposition is { rel, ARG0, ARG1, OBL[], polarity, tense, asserted, quant }, voice-normalised. Ends are LINKED by a shared
// head lemma or name token. Relations are the same when:
//   - the lemma is the same; or
//   - either side is a LIGHT relation (be, have, by): the relation word carries no more than "the two ends are joined", so the ends decide; or
//   - they are DECLARED converses (taller/shorter …) with the ends crossed; or
//   - they give the same MEASURE of the same being (8,849 m "tall" / "stands 8,849 m"; unit-converted, approximation allowed when said).
// Verdict per claim: E (every claim proposition met), C (a met proposition flips polarity, swaps an asymmetric relation's roles, or gives a
// different value for the same measure of the same being), T (ends linked, relation unmet, or met but not asserted / other tense / other
// quantifier), U (nothing linked), X (the claim gave no proposition: abstain).


const FW = new Set("the a an this that these those of in on at by for to from with as and or but is are was were be been being it its their his her they he she which who whom what all some many most every each no".split(" "));
// DECLARED (giver: English comparative adjective pairs, enumerated, not measured): each pair says the same relation with the ends crossed
const CONVERSE = Object.fromEntries([["tall", "short"], ["large", "small"], ["big", "small"], ["old", "young"], ["heavy", "light"], ["long", "short"], ["high", "low"], ["fast", "slow"], ["wide", "narrow"], ["deep", "shallow"], ["early", "late"], ["many", "few"], ["much", "little"], ["rich", "poor"], ["hot", "cold"], ["before", "after"], ["above", "below"]].flatMap(([a, b]) => [[a, b], [b, a]]));
const LIGHT = new Set(["be", "have", "by", "of"]);
// DECLARED (giver: the SI and US customary definitions): unit → [measure, factor to base, offset]
const UNITS = { m: ["length", 1], metre: ["length", 1], meter: ["length", 1], km: ["length", 1000], kilometre: ["length", 1000], kilometer: ["length", 1000], cm: ["length", 0.01], ft: ["length", 0.3048], foot: ["length", 0.3048], feet: ["length", 0.3048], mile: ["length", 1609.344], mi: ["length", 1609.344],
  kg: ["mass", 1], kilogram: ["mass", 1], g: ["mass", 0.001], gram: ["mass", 0.001], lb: ["mass", 0.4536], pound: ["mass", 0.4536], ton: ["mass", 1000], tonne: ["mass", 1000],
  celsius: ["temperature", 1, 0], c: ["temperature", 1, 0], fahrenheit: ["temperature", 5 / 9, -32], f: ["temperature", 5 / 9, -32], kelvin: ["temperature", 1, -273.15], degree: ["temperature", 1, 0],
  second: ["time", 1], minute: ["time", 60], hour: ["time", 3600], day: ["time", 86400], year: ["time", 31557600], percent: ["share", 0.01], "%": ["share", 0.01] };
const APPROX = /\b(about|around|roughly|nearly|approximately|almost|some|over|more than|less than|up to)\b/i;
const REPORT = new Set(["say", "claim", "report", "believe", "allege", "suggest", "argue", "think", "rumor", "rumour", "insist"]);
// the base of a comparative, from its form: shorter → short, bigger → big, heavier → heavy, larger → large
const comparativeBase = (f) => { const w = f.toLowerCase(); if (/ier$/.test(w)) return w.slice(0, -3) + "y"; if (/([bdgmnpt])\1er$/.test(w)) return w.slice(0, -3); if (/[^aeiou]er$/.test(w) && CONVERSE[w.slice(0, -2)]) return w.slice(0, -2); if (/er$/.test(w) && CONVERSE[w.slice(0, -1)]) return w.slice(0, -1); if (/er$/.test(w)) return w.slice(0, -2); return w; };
// DECLARED (giver: English antonymous adjectives, enumerated, not measured): the same ends with one of these is a polarity flip
const ANTONYM = Object.fromEntries([["open", "closed"], ["alive", "dead"], ["true", "false"], ["present", "absent"], ["legal", "illegal"], ["possible", "impossible"], ["safe", "dangerous"], ["visible", "invisible"], ["active", "inactive"], ["extinct", "extant"]].flatMap(([a, b]) => [[a, b], [b, a]]));
// DECLARED (giver: English relations whose object is a measure of the subject): a figure under one of these is a property of the subject
const STATIVE = new Set(["be", "have", "stand", "measure", "weigh", "reach", "rise", "span", "cover", "total", "number", "carry", "contain", "hold", "boil", "freeze", "melt", "travel"]);
const TITLES = new Set(["dr", "mr", "mrs", "ms", "sir", "dame", "saint", "st", "lord", "lady", "king", "queen", "prince", "princess", "president", "professor", "prof"]);
const lem = (r) => String(r.lemma || r.form).toLowerCase();
const kids = (rows, id) => rows.filter((r) => r.head === id);
// an appositive is a second statement about its head ("Jan Ingenhousz, the Dutch-born British physician"), read as its own "be" claim, not
// part of the head's name
const SKIP = /^(punct|acl|acl:relcl|advcl|ccomp|parataxis|conj|cc|nsubj|nsubj:pass|csubj|cop|aux|aux:pass|mark|obl|obl:agent|obl:tmod|obl:npmod|advmod|xcomp|nmod|appos)$/;
// a short appositive name is part of the name ("Groq, Inc."), not a second statement
const nameAppos = (rows, r) => r.deprel === "appos" && r.upos === "PROPN" && rows.find((h) => h.id === r.head)?.upos === "PROPN" && Math.abs(r.id - r.head) <= 2;
const spanOf = (rows, id) => { const out = [], st = [id]; while (st.length) { const x = st.pop(); out.push(x); for (const r of rows) if (r.head === x && !(x === id && SKIP.test(r.deprel) && !nameAppos(rows, r)) && !/^(punct|acl:relcl|parataxis|cc)$/.test(r.deprel)) st.push(r.id); } return out.map((i) => rows.find((r) => r.id === i)).sort((a, b) => a.id - b.id); };
const numOf = (w) => { const f = w.form.toLowerCase().replace(/,/g, ""); if (/^\d+(\.\d+)?$/.test(f)) return +f; return CARDINAL[f] ?? null; };
/** the figures in a word span, each bound to the unit or counted noun right after it */
const unitKey = (w) => (w ? String(w.form).toLowerCase().replace(/(?<=[a-z]{3})s$/, "").replace(/^metre$|^meter$/, "m").replace(/^fee$/, "feet") : "");
const figuresIn = (rows, ws, text) => ws.filter((w) => numOf(w) != null).map((w) => {
  const v = numOf(w), next = rows.find((r) => r.id === w.id + 1), after = rows.find((r) => r.id === w.id + 2);
  // a bare year is a date, not a measure of anything
  if (/^\d{4}$/.test(w.form) && v >= 1000 && v <= 2100 && !(next && UNITS[unitKey(next)])) return { v, measure: "date", base: v, approx: false };
  let u = unitKey(next); if (/^degree$/.test(u) && after && UNITS[unitKey(after)]) u = unitKey(after);
  const U = UNITS[u] ?? UNITS[u + "s"];
  const counted = !U && next && /^(NOUN|PROPN)$/.test(next.upos) ? lem(next).replace(/s$/, "") : null;
  return { v, measure: U ? U[0] : counted ? `count:${counted}` : "count", base: U ? (v + (U[2] ?? 0)) * U[1] : v, approx: APPROX.test(text) }; });
// the words of a span inside brackets: "Kilimanjaro International Airport (JRO)" — a bracketed name is another name for it, not part of it
const bracketed = (rows, ws) => { let d = 0; const inside = new Set(); for (const r of rows) { if (r.form === "(") d++; else if (r.form === ")") d = Math.max(0, d - 1); else if (d > 0) inside.add(r.id); } return ws.map((w) => inside.has(w.id)); };
const endOf = (rows, id, text) => { if (!id) return null; const head = rows.find((r) => r.id === id), ws = spanOf(rows, id);
  const agentN = kids(rows, id).find((k) => /^nmod/.test(k.deprel) && kids(rows, k.id).some((c) => /^by$/i.test(c.form)));
  const inBr = bracketed(rows, ws);
  return { text: ws.map((w) => w.form).join(" "), ids: ws.map((w) => w.id), head: lem(head), names: ws.filter((w, k) => w.upos === "PROPN" && !inBr[k]).map((w) => w.form.toLowerCase()), aliases: ws.filter((w, k) => /^(PROPN|NOUN|X)$/.test(w.upos) && inBr[k]).map((w) => w.form.toLowerCase()), lemmas: ws.filter((w) => /^(NOUN|PROPN|ADJ)$/.test(w.upos)).map(lem).filter((l) => !FW.has(l)),
    sup: (ws.find((w) => w.upos === "ADJ" && (/Degree=Sup/.test(w.feats || "") || /est$/i.test(w.form))) ? comparativeBase(ws.find((w) => w.upos === "ADJ" && (/Degree=Sup/.test(w.feats || "") || /est$/i.test(w.form))).form.replace(/est$/i, "er")) : null),
    figs: figuresIn(rows, ws, text), quant: ws.map((w) => w.form.toLowerCase()).find((f) => /^(all|every|each|some|many|most|few|no)$/.test(f)) ?? null, agent: agentN ? endOf(rows, agentN.id, text) : null,
    // its modifier phrases ("an agreement WITH GSK", "the process OF PHOTOSYNTHESIS") and its coordinated words ("a Collaboration AND …
    // Agreement", "Groq, Inc."), each an end of its own the check must meet in the source
    nmods: kids(rows, id).filter((k) => (/^nmod(:poss)?$/.test(k.deprel) && k !== agentN) || (k.deprel === "conj" && /^(NOUN|PROPN|ADJ|NUM)$/.test(k.upos))).map((k) => endOf(rows, k.id, text)) }; };

function propositionsOf(text, rows = rowsOf(text)) {
  // out.framed: the words of discourse connectives, set aside on purpose (read, not dropped)
  const out = [], framed = new Set(); out.framed = framed;
  const byId = (id) => rows.find((r) => r.id === id);
  const reportedUnder = (v) => { let x = v; for (let i = 0; i < 6 && x; i++) { const h = byId(x.head); if (!h) return false; if (/^(ccomp|parataxis)$/.test(x.deprel) && REPORT.has(lem(h))) return true; x = h; } return false; };
  const REL_PRON = /^(which|who|whom|that)$/i;
  // UD structure, read once: who a clause's subject is when the clause does not say it (a conjoined verb shares its head's subject; a
  // participle or infinitive modifying a clause takes that clause's subject; a relative pronoun stands for the noun the clause modifies)
  const subjOf = (v, depth = 0) => {
    if (!v || depth > 4) return null;
    const s0 = kids(rows, v.id).find((k) => /^nsubj/.test(k.deprel));
    if (s0 && REL_PRON.test(s0.form)) { let x = v; for (let i = 0; i < 4 && x; i++) { if (/^(acl|acl:relcl|advcl:relcl)$/.test(x.deprel) || /relcl/.test(x.deprel)) return byId(x.head); if (x.deprel !== "conj") break; x = byId(x.head); } return s0; }
    if (s0) return s0;
    if (v.deprel === "conj" || /^(advcl|xcomp)$/.test(v.deprel)) return subjOf(byId(v.head), depth + 1);
    if (/^acl/.test(v.deprel) && !/relcl/.test(v.deprel)) return byId(v.head);
    return null;
  };
  const isMain = (r) => /^(VERB|AUX|ADJ|NOUN|PROPN)$/.test(r.upos);
  for (const v of rows) {
    if (!isMain(v)) continue;
    const ks = kids(rows, v.id);
    const negOwn = (x) => kids(rows, x.id).some((k) => /^(not|n't|never|no)$/i.test(k.form)) || kids(rows, x.id).some((k) => /^(nsubj|obj)/.test(k.deprel) && kids(rows, k.id).some((c) => c.deprel === "det" && /^no$/i.test(c.form)));
    // a conjoined verb with no subject of its own shares its head's negation: "we have never declared or paid a dividend" denies both
    const neg = negOwn(v) || (v.deprel === "conj" && !ks.some((k) => /^nsubj/.test(k.deprel)) && negOwn(byId(v.head) ?? { id: -1 }));
    const passive = ks.some((k) => k.deprel === "aux:pass" || k.deprel === "nsubj:pass") || (v.deprel === "conj" && kids(rows, v.head).some((k) => k.deprel === "aux:pass"));
    const subj = subjOf(v);
    // the thing given is the object; the one it goes to is the indirect object ("we paid Centessa an upfront payment")
    let obj = ks.find((k) => k.deprel === "obj") ?? ks.find((k) => k.deprel === "iobj");
    const iobj = ks.find((k) => k.deprel === "iobj" && k !== obj);
    if (obj && REL_PRON.test(obj.form) && /relcl/.test(v.deprel)) obj = byId(v.head);
    // the by-agent of a passive, wherever the parser hung it inside this clause ("created in the early 1990s by Guido van Rossum")
    const inClause = (r) => { let x = r; for (let i = 0; i < 4 && x; i++) { if (x.head === v.id) return true; if (/^(acl|acl:relcl|advcl|ccomp|conj)$/.test(x.deprel)) return false; x = byId(x.head); } return false; };
    const agent = rows.find((r) => /^(obl|obl:agent|nmod)$/.test(r.deprel) && inClause(r) && kids(rows, r.id).some((c) => /^by$/i.test(c.form)));
    const cop = ks.find((k) => k.deprel === "cop");
    if (!cop && !/^(VERB|AUX|ADJ)$/.test(v.upos)) continue;
    const auxes = ks.filter((k) => /^(aux|cop|aux:pass)$/.test(k.deprel)), inherited = v.deprel === "conj" ? kids(rows, v.head).filter((k) => /^(aux|aux:pass)$/.test(k.deprel)) : [];
    const tenseW = [v, ...auxes, ...inherited].map((w) => w.form.toLowerCase());
    const tense = tenseW.some((f) => /^(was|were|had|did)$/.test(f)) || (/ed$/.test(v.form) && !auxes.some((k) => /^(is|are|am|has|have)$/i.test(k.form)) && !passive) ? "past" : tenseW.some((f) => /^(will|shall)$/.test(f)) ? "future" : "present";
    const asserted = !reportedUnder(v) && ![...auxes, ...inherited].some((k) => /^(may|might|could|would)$/i.test(k.form));
    // a DISCOURSE connective ("In addition, …", "For example, …") frames the sentence and says nothing of its event (declared English closed class)
    const discourse = (k) => /^(in addition|in particular|for example|for instance|in fact|in turn|in short|in contrast|on the other hand|as a result|in summary|in conclusion)$/i.test(spanOf(rows, k.id).map((w) => w.form).join(" "));
    const obls = ks.filter((k) => /^(obl|obl:tmod|obl:npmod|nmod)$/.test(k.deprel) && k !== agent && !discourse(k)).map((k) => ({ ...endOf(rows, k.id, text), than: kids(rows, k.id).some((c) => /^than$/i.test(c.form)), with: kids(rows, k.id).some((c) => /^with$/i.test(c.form)) }));
    for (const k of ks) if (/^(obl|obl:tmod|obl:npmod|nmod)$/.test(k.deprel) && discourse(k)) for (const w of spanOf(rows, k.id)) framed.add(w.id);
    const base = { vid: v.id, polarity: neg ? "-" : "+", tense, asserted, OBL: obls.filter((o) => !o.with), main: v.head === 0 || (v.deprel === "conj" && byId(v.head)?.head === 0) };
    const conjRoot = subj && subj.deprel === "conj" ? byId(subj.head) : subj;
    const subjects = subj ? [...new Set([subj, conjRoot, ...rows.filter((r) => conjRoot && r.head === conjRoot.id && r.deprel === "conj" && /^(NOUN|PROPN)$/.test(r.upos))])].filter(Boolean) : [null];
    for (const S0 of subjects) {
      const partStem = cop && /ed$/i.test(v.form) ? [v.form.toLowerCase().replace(/ed$/, ""), v.form.toLowerCase().replace(/d$/, "")].find((x) => VERB_FORMS.has(x)) : null;
      if (partStem && S0) { out.push({ ...base, rel: partStem, ARG0: endOf(rows, agent?.id, text), ARG1: endOf(rows, S0.id, text), voice: "passive", asym: !!agent }); continue; }
      if (cop && S0) {
        const than = obls.find((o) => o.than);
        if (v.upos === "ADJ" && than) out.push({ ...base, rel: comparativeBase(v.form), ARG0: endOf(rows, S0.id, text), ARG1: than, asym: true });
        else out.push({ ...base, rel: "be", ARG0: endOf(rows, S0.id, text), ARG1: endOf(rows, v.id, text) });
      } else if (/^(VERB|AUX|ADJ)$/.test(v.upos) && (S0 || obj)) {
        // one claim per coordinated object, as per coordinated subject ("a Collaboration and Exclusive License Agreement with GSK")
        for (const O of !passive && obj ? [obj, ...rows.filter((r) => r.head === obj.id && r.deprel === "conj" && /^(NOUN|PROPN)$/.test(r.upos))] : [obj]) {
          const A0 = passive ? agent : S0, A1 = passive ? S0 : O;
          // with no object, the second end is the first oblique AFTER the verb ("entered into an agreement"): a phrase before it frames the event
          // ("In March 2014, …", "In addition, …") and stays an oblique, never an argument
          out.push({ ...base, rel: lem(v), ARG0: endOf(rows, A0?.id, text), ARG1: endOf(rows, (A1 ?? ks.find((k) => /^(obl|xcomp)$/.test(k.deprel) && k.id > v.id))?.id, text), ARG2: iobj ? endOf(rows, iobj.id, text) : null, voice: passive ? "passive" : "active", asym: !!(A0 && A1) });
        }
      }
      // "With a radius of 1,516 miles, Mercury is …": the with-phrase is something the subject has
      for (const w of obls.filter((o) => o.with)) if (S0) out.push({ ...base, OBL: [], rel: "have", ARG0: endOf(rows, S0.id, text), ARG1: w, asym: true });
    }
  }
  // an appositive is a statement that the two are one ("the Malus genus, a group of about 32 species")
  for (const a of rows.filter((r) => r.deprel === "appos" && !(r.upos === "PROPN" && byId(r.head)?.upos === "PROPN" && Math.abs(r.id - r.head) <= 2))) out.push({ polarity: "+", tense: "present", asserted: true, OBL: [], rel: "be", ARG0: endOf(rows, a.head, text), ARG1: endOf(rows, a.id, text) });
  const kept = out.filter((p) => p.ARG0 || p.ARG1); kept.framed = framed; return kept;
}

const surname = (e) => e.names.filter((n) => !TITLES.has(n)).at(-1) ?? null;

// a pronoun's case is grammar, not identity: "us" is "we" (declared English closed class)
const PRON_CASE = { us: "we", me: "i", him: "he", her: "she", them: "they", ourselves: "we", themselves: "they" };
const keyEnd = (e) => e && { text: e.text, head: PRON_CASE[e.head] ?? e.head, sup: e.sup ?? null, names: e.names.filter((n) => !TITLES.has(n)), aliases: e.aliases ?? [], keys: e.lemmas.filter((l) => !TITLES.has(l)), figs: e.figs, quant: e.quant ? QUANT[e.quant] : null, agent: keyEnd(e.agent), nmods: (e.nmods ?? []).map(keyEnd) };
const QUANT = { all: "all", every: "all", each: "all", some: "some", many: "many", most: "most", few: "few", no: "none" };
/** EOTClaim@1 — the only thing the EOT layer sees */
/** the claims of every one of the k best readings, once each: a source states what any close reading of it states */
export function claimsOfK(text, k = 3) {
  const seen = new Set(), out = [];
  for (const rows of rowsOfK(text, k)) for (const c of claimsOf(text, rows)) { const key = JSON.stringify([c.rel, c.ARG0?.text, c.ARG1?.text, c.polarity, (c.OBL || []).map((o) => o?.text)]); if (!seen.has(key)) { seen.add(key); out.push(c); } }
  return out;
}
export function claimsOf(text, rows = undefined) {
  const R = rows ?? rowsOf(text), props = propositionsOf(text, R);
  // the sentence's content words no claim read (claim-coverage.js): carried on every claim, so the check never calls a partly read claim supported
  const unread = unreadWords(R.filter((r) => !props.framed.has(r.id)), props, bindFigures(R, FIGURE_LEX), { isUnit: (f) => !!FIGURE_LEX.unitOf(f), key: lem });
  return [...propositionClaims(text, R, props), ...figureClaimsOf(text, R)].map((c) => ({ ...c, unread }));
}
function propositionClaims(text, rows, props = propositionsOf(text, rows)) {
  return props.map((p, i) => ({ main: !!p.main, schema: "EOTClaim@1", id: `c${i + 1}`, lang: "en", by: "grammar-en", rel: p.rel, ARG0: keyEnd(p.ARG0), ARG1: keyEnd(p.ARG1), ARG2: keyEnd(p.ARG2 ?? null), OBL: (p.OBL || []).map(keyEnd), polarity: p.polarity, tense: p.tense, asserted: p.asserted, asym: !!p.asym }));
}


// ── LAYER 4's high gate, revising through LAYER 2 (spiral-contract.js: low sets possibility, high sets probability) ─────────────────────────
// A tree-shape gate cannot tell a wrong parse from a right one in web text (on UD_English-EWT test gold trees fail "the root is a noun" 74 times,
// greedy parses 80), so the gate sits where the consequence shows: a declarative sentence must yield a claim whose ends are beings (not a lone
// date or number). When it does not, each word's runner-up reading is tried (layer 2 keeps both; the gold tag is in the pair 98.5% of the
// time), the sentence re-parsed and re-read, and of the readings that pass, the one the tagger gives up least for is kept.
const endOk = (e) => !!e && !(e.figs?.length && e.figs.every((f) => f.measure === "date") && !e.names?.length && (e.keys ?? []).every((k) => /^[\d#]/.test(k)));
export const claimGate = (claims) => claims.some((c) => c.main && (endOk(c.ARG0) || endOk(c.ARG1)));
export function claimsOfGated(text, { budget = 8 } = {}) {
  const base = claimsOf(text);
  if (!UM || claimGate(base) || !/[.!]\s*$/.test(text) || (text.match(/\p{L}+/gu) ?? []).length < 4) return base;
  const tk = P.tokenize(text), forms = tk.map((t) => t.form), first = U.tagWithMargins(UM.tagger, forms, UM.lex, UM.clusters);
  const order = forms.map((_, i) => i).filter((i) => first.runnerUp[i] && /^\p{L}/u.test(forms[i])).sort((a, b) => first.margins[a] - first.margins[b]).slice(0, budget);
  for (const i of order) {
    const re = U.tagWithMargins(UM.tagger, forms, UM.lex, UM.clusters, new Map([[i, new Set([first.runnerUp[i]])]]));
    const rows = repairRelcl(U.analyse(UM, forms, re.tags).map((r) => (r.upos === "NUM" ? { ...r, lemma: r.form.toLowerCase() } : r)), tk);
    const claims = claimsOf(text, rows);
    if (claimGate(claims)) return claims.map((c) => ({ ...c, revised: { word: forms[i], from: first.tags[i], to: first.runnerUp[i] } }));
  }
  return base;
}

/** readingsOf(text) → the base reading and every one-word re-reading (one word swapped to its runner-up), each with its claims and its tagger
 *  cost (the margin given up): layer 2's possibilities carried through layers 3 and 4, for a higher layer to choose among */
export function readingsOf(text, { budget = Infinity } = {}) {
  const base = { flip: null, cost: 0, claims: claimsOf(text) };
  if (!UM) return [base];
  const tk = P.tokenize(text), forms = tk.map((t) => t.form), first = U.tagWithMargins(UM.tagger, forms, UM.lex, UM.clusters);
  const order = forms.map((_, i) => i).filter((i) => first.runnerUp[i] && /^\p{L}/u.test(forms[i])).sort((a, b) => first.margins[a] - first.margins[b]).slice(0, budget);
  return [base, ...order.map((i) => {
    const re = U.tagWithMargins(UM.tagger, forms, UM.lex, UM.clusters, new Map([[i, new Set([first.runnerUp[i]])]]));
    const rows = repairRelcl(U.analyse(UM, forms, re.tags).map((r) => (r.upos === "NUM" ? { ...r, lemma: r.form.toLowerCase() } : r)), tk);
    return { flip: { i, word: forms[i], from: first.tags[i], to: first.runnerUp[i] }, cost: first.margins[i], claims: claimsOf(text, rows) };
  })];
}


// ── the English half of figure binding (figure-binding.js reads the tree; these are English words, each class declared) ─────────────────
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const MONTHS = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?$/i;
const DIMENSION = new Set(["tall", "long", "wide", "high", "deep", "old", "thick", "heavy", "broad", "across"]);
const wordNumber = (w) => { const k = w.toLowerCase(); if (CARDINAL[k] != null && !SCALE[k]) return CARDINAL[k]; if (TENS[k] != null) return TENS[k]; const m = /^([a-z]+)-([a-z]+)$/.exec(k); if (m && TENS[m[1]] != null && CARDINAL[m[2]] != null && CARDINAL[m[2]] < 10) return TENS[m[1]] + CARDINAL[m[2]]; return null; };
export const FIGURE_LEX = {
  numberOf(form, next) {
    const f = String(form).replace(/,/g, "");
    let m;
    if ((m = /^(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)$/.exec(f))) return { value: +m[1], hi: +m[2] };
    if ((m = /^(\d+(?:\.\d+)?)-(\p{L}+)$/u.exec(f))) return { value: +m[1], unit: m[2] };
    if ((m = /^(\d+)\/(\d+)$/.exec(f)) && +m[2]) return { value: +m[1] / +m[2] };
    if (/^\d+(\.\d+)?$/.test(f)) return { value: +f };
    const wn = wordNumber(String(form)); if (wn != null) { const m2 = /^(\p{L}+)-(\p{L}+)$/u.exec(String(form)); return { value: wn, word: true, ...(m2 && !TENS[m2[1].toLowerCase()] ? { unit: m2[2] } : {}) }; }
    return null;
  },
  scaleOf: (w) => SCALE[String(w).toLowerCase()] ?? null,
  unitOf: (w) => { const k = String(w).toLowerCase(); return UNITS[k] ?? UNITS[k.replace(/(?<=[a-z]{2})s$/, "")] ?? (k === "feet" ? UNITS.foot : k === "lbs" ? UNITS.lb : k === "°c" ? UNITS.celsius : k === "°f" ? UNITS.fahrenheit : null); },
  isYear: (v, form, rows, i) => /^\d{4}$/.test(String(form)) && v >= 1000 && v <= 2100 || [rows[i - 1], rows[i + 1], rows[i - 2]].some((x) => x && MONTHS.test(x.form)),
  singular: (w) => (/(us|ss|is|ies)$/.test(w) ? w : w.replace(/(?<=[a-z]{3})s$/, "")),
  isDimension: (w) => DIMENSION.has(w),
  isApprox: (rows, i) => rows.slice(Math.max(0, i - 3), i).some((x) => /^(about|around|roughly|nearly|approximately|almost|some|over|under|up|than|just)$/i.test(x.form)),
};
/** the figures of a sentence as EOT claims: rel "fig", ARG0 the being they describe, the binding on the claim */
export function figureClaimsOf(text, rows = rowsOf(text)) {
  return bindFigures(rows, FIGURE_LEX).map((f, i) => ({ schema: "EOTClaim@1", id: `f${i + 1}`, lang: "en", by: "grammar-en", rel: "fig", main: false, ARG0: f.beingId ? keyEnd(endOf(rows, f.beingId, text)) : null, ARG1: null, OBL: [], polarity: "+", tense: "present", asserted: true, asym: false,
    fig: { measure: f.measure, attribute: f.attribute, event: f.eventLemma, base: f.base, hiBase: f.hiBase, alts: f.alts, approx: f.approx } }));
}
