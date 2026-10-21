// grammar-en.js — the ENGLISH GRAMMAR ADAPTER of NL → grammar → EOT → back: English text → EOTClaim@1, language-neutral claims.
// Part 1, the reader (a UD parse with named repairs); part 2, UD rows → claims (passives, conjuncts, relative clauses, participles,
// appositives, comparatives, superlatives, hedges, figures as measure + base value). Everything English lives here and nowhere downstream.
//   1. a number word the tagger called a verb ("have eight legs" → eight/VERB) is a numeral (giver: the English cardinal words, a closed class)
//   2. a sentence with no verb, where a word UniMorph lists as a verb form sits after the first noun ("Water boils at 100 degrees"), has that
//      word re-tagged VERB and is re-parsed (giver: UniMorph English, khora/native/priors/pos-eng-lexicon.json)
import fs from "node:fs";
import * as P from "./english-parser.js";
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
const UM = U ? await U.loadModelFile(UD_MODEL, { lexFile: fs.existsSync(UD_LEX) ? UD_LEX : null }) : null;
export const READER = UM ? "ud-parser" : "english-parser";
const build = (forms, tags) => {
  if (UM) return U.analyse(UM, forms, tags).map((r) => (r.upos === "NUM" ? { ...r, lemma: r.form.toLowerCase() } : r));
  const words = ["ROOT", ...forms], T = ["ROOT", ...tags];
  const heads = P.parseSentence(model.parser, words, T), labels = P.labelSentence(model.labeller, heads, words, T);
  return forms.map((form, k) => { const { lemma, feats } = P.lemmaAndFeats(model.lexicon, form, tags[k]); return { id: k + 1, form, lemma: tags[k] === "NUM" ? form.toLowerCase() : lemma, upos: tags[k], feats, head: heads[k + 1], deprel: labels[k + 1] }; });
};
export const repairs = { cardinal: 0, verb: 0 };
export function rowsOf(text) {
  const tk = P.tokenize(text); if (!tk.length) return [];
  const forms = tk.map((t) => t.form);
  const tags = UM ? (U.tagWith ? (UM.meta?.lexicon !== undefined ? U.tagWith(UM.tagger, forms, UM.lex) : P.tagSentence(UM.tagger, forms)) : P.tagSentence(UM.tagger, forms)) : P.tagSentence(model.tagger, forms);
  let fixed = false;
  tags.forEach((t, i) => { if (t !== "NUM" && CARDINAL[forms[i].toLowerCase()] != null && /^(VERB|ADJ|NOUN)$/.test(t) && i + 1 < forms.length && /^\p{L}/u.test(forms[i + 1])) { tags[i] = "NUM"; fixed = true; repairs.cardinal++; } });
  // 3. "have/has/had" tagged as an auxiliary with no verb after it in the clause is the main verb ("spiders have eight legs")
  tags.forEach((t, i) => { if (t === "AUX" && /^(have|has|had)$/i.test(forms[i])) { const next = tags.slice(i + 1).findIndex((x) => /^(VERB|PUNCT)$/.test(x)); if (next < 0 || tags[i + 1 + next] === "PUNCT") { tags[i] = "VERB"; repairs.have = (repairs.have ?? 0) + 1; } } });
  let rows = build(forms, tags);
  if (!rows.some((r) => /^(VERB|AUX)$/.test(r.upos))) {
    const firstNoun = tags.findIndex((t) => /^(NOUN|PROPN|PRON)$/.test(t));
    const j = firstNoun < 0 ? -1 : forms.findIndex((f, i) => i > firstNoun && /^(NOUN|ADJ)$/.test(tags[i]) && VERBISH.has(f.toLowerCase()) && /(s|ed)$/i.test(f));
    if (j >= 0) { tags[j] = "VERB"; rows = build(forms, tags); repairs.verb++; fixed = true; }
  }
  // 4. a verb with its own auxiliary hung as a relative clause under a nominal root ("Marie Curie was born in 1867" parsed as a name modified
  //    by "born") is the sentence's verb: a relative clause has a relative pronoun or none, never a finite "was" of its own after the name
  const root = rows.find((r) => r.head === 0);
  if (root && /^(NOUN|PROPN)$/.test(root.upos)) {
    const v = rows.find((r) => r.head === root.id && r.deprel === "acl:relcl" && r.upos === "VERB" && rows.some((a) => a.head === r.id && /^aux/.test(a.deprel)) && !rows.some((a) => a.head === r.id && /^(nsubj|nsubj:pass)$/.test(a.deprel)));
    if (v) { const pass = rows.some((a) => a.head === v.id && a.deprel === "aux:pass"); v.head = 0; v.deprel = "root"; root.head = v.id; root.deprel = pass ? "nsubj:pass" : "nsubj"; repairs.relcl = (repairs.relcl ?? 0) + 1; }
  }
  rows.forEach((r, k) => { r.start = tk[k].start; r.end = tk[k].end; });
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
const SKIP = /^(punct|acl|acl:relcl|advcl|ccomp|parataxis|conj|cc|nsubj|nsubj:pass|csubj|cop|aux|aux:pass|mark|obl|obl:agent|obl:tmod|obl:npmod|advmod|xcomp|nmod)$/;
const spanOf = (rows, id) => { const out = [], st = [id]; while (st.length) { const x = st.pop(); out.push(x); for (const r of rows) if (r.head === x && !(x === id && SKIP.test(r.deprel)) && !/^(punct|acl:relcl|parataxis|cc)$/.test(r.deprel)) st.push(r.id); } return out.map((i) => rows.find((r) => r.id === i)).sort((a, b) => a.id - b.id); };
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
const endOf = (rows, id, text) => { if (!id) return null; const head = rows.find((r) => r.id === id), ws = spanOf(rows, id);
  const agentN = kids(rows, id).find((k) => /^nmod/.test(k.deprel) && kids(rows, k.id).some((c) => /^by$/i.test(c.form)));
  return { text: ws.map((w) => w.form).join(" "), head: lem(head), names: ws.filter((w) => w.upos === "PROPN").map((w) => w.form.toLowerCase()), lemmas: ws.filter((w) => /^(NOUN|PROPN|ADJ)$/.test(w.upos)).map(lem).filter((l) => !FW.has(l)),
    sup: (ws.find((w) => w.upos === "ADJ" && (/Degree=Sup/.test(w.feats || "") || /est$/i.test(w.form))) ? comparativeBase(ws.find((w) => w.upos === "ADJ" && (/Degree=Sup/.test(w.feats || "") || /est$/i.test(w.form))).form.replace(/est$/i, "er")) : null),
    figs: figuresIn(rows, ws, text), quant: ws.map((w) => w.form.toLowerCase()).find((f) => /^(all|every|each|some|many|most|few|no)$/.test(f)) ?? null, agent: agentN ? endOf(rows, agentN.id, text) : null }; };

function propositionsOf(text) {
  const rows = rowsOf(text), out = [];
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
    const neg = ks.some((k) => /^(not|n't|never|no)$/i.test(k.form)) || ks.some((k) => /^(nsubj|obj)/.test(k.deprel) && kids(rows, k.id).some((c) => c.deprel === "det" && /^no$/i.test(c.form)));
    const passive = ks.some((k) => k.deprel === "aux:pass" || k.deprel === "nsubj:pass") || (v.deprel === "conj" && kids(rows, v.head).some((k) => k.deprel === "aux:pass"));
    const subj = subjOf(v);
    let obj = ks.find((k) => /^(obj|iobj)$/.test(k.deprel));
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
    const obls = ks.filter((k) => /^(obl|obl:tmod|obl:npmod|nmod)$/.test(k.deprel) && k !== agent).map((k) => ({ ...endOf(rows, k.id, text), than: kids(rows, k.id).some((c) => /^than$/i.test(c.form)), with: kids(rows, k.id).some((c) => /^with$/i.test(c.form)) }));
    const base = { polarity: neg ? "-" : "+", tense, asserted, OBL: obls.filter((o) => !o.with), main: v.head === 0 || (v.deprel === "conj" && byId(v.head)?.head === 0) };
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
        const A0 = passive ? agent : S0, A1 = passive ? S0 : obj;
        out.push({ ...base, rel: lem(v), ARG0: endOf(rows, A0?.id, text), ARG1: endOf(rows, (A1 ?? ks.find((k) => /^(obl|xcomp)$/.test(k.deprel)))?.id, text), voice: passive ? "passive" : "active", asym: !!(A0 && A1) });
      }
      // "With a radius of 1,516 miles, Mercury is …": the with-phrase is something the subject has
      for (const w of obls.filter((o) => o.with)) if (S0) out.push({ ...base, OBL: [], rel: "have", ARG0: endOf(rows, S0.id, text), ARG1: w, asym: true });
    }
  }
  // an appositive is a statement that the two are one ("the Malus genus, a group of about 32 species")
  for (const a of rows.filter((r) => r.deprel === "appos" && !(r.upos === "PROPN" && byId(r.head)?.upos === "PROPN" && Math.abs(r.id - r.head) <= 2))) out.push({ polarity: "+", tense: "present", asserted: true, OBL: [], rel: "be", ARG0: endOf(rows, a.head, text), ARG1: endOf(rows, a.id, text) });
  return out.filter((p) => p.ARG0 || p.ARG1);
}

const surname = (e) => e.names.filter((n) => !TITLES.has(n)).at(-1) ?? null;

const keyEnd = (e) => e && { text: e.text, head: e.head, sup: e.sup ?? null, names: e.names.filter((n) => !TITLES.has(n)), keys: e.lemmas.filter((l) => !TITLES.has(l)), figs: e.figs, quant: e.quant ? QUANT[e.quant] : null, agent: keyEnd(e.agent) };
const QUANT = { all: "all", every: "all", each: "all", some: "some", many: "many", most: "most", few: "few", no: "none" };
/** EOTClaim@1 — the only thing the EOT layer sees */
export function claimsOf(text) {
  return propositionsOf(text).map((p, i) => ({ main: !!p.main, schema: "EOTClaim@1", id: `c${i + 1}`, lang: "en", by: "grammar-en", rel: p.rel, ARG0: keyEnd(p.ARG0), ARG1: keyEnd(p.ARG1), OBL: (p.OBL || []).map(keyEnd), polarity: p.polarity, tense: p.tense, asserted: p.asserted, asym: !!p.asym }));
}
