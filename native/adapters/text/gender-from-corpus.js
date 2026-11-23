// gender-from-corpus.js — the pro-form agreement of a being, read off the pro-forms that bind to its
// name in material the system has ALREADY INGESTED, in that material's own language. This is the
// "infer it from past things it ingested" half of the name-gender chain.
//
// NOT A BINARY, AND NOT "GENDER". A pro-form (Wikipedia: Pro-form) is a feature bundle — person,
// number, gender, animacy, case, deixis — and "gender" is one feature of it. The class tallied here
// is the pro-form's agreement class, the same open set normalizePronounClass already produces:
//   m / f — gendered, human (he/she)
//   n     — the ANIMACY axis: nonhuman/neuter (it). More universal than m/f — English's who/what,
//           and the axis that separates a person-name from a place-name. A third gender in a
//           three-gender language (German er/sie/es) lands here as its own class, not forced to m/f.
//   x     — no agreement (they, он): plural-or-singular, no gender carried by the form.
// A language with a common/neuter or animate/inanimate system just feeds different pronoun forms
// into the same tally; a language with NO gendered third-person pro-forms (Turkish, Finnish) yields
// an empty table — the honest answer, never "male by default".
//
// PRO-DROP: TWO HALVES, ONE BUILT. In a pro-drop language (Wikipedia: Pro-drop language) the
// pro-form is null and the same feature bundle rides the verb's agreement morphology (Hindi `diyā`
// agrees with the object MASC.SG; Hebrew past verbs inflect person+number+gender). This giver reads
// OVERT pro-forms (genderEvidenceFromText); the null half is verbAgreementFromText below, which
// extracts the dropped subject's agreement off the verb. Binding that dropped subject to a REFERENT
// is the resolver's own nullSubjects presence rule (PREREG-ROUND21), not this giver — the two
// halves meet at the same being in a language that drops its pro-forms. A language whose verb
// paradigm is not yet registered is stated as such, never read as if its pronouns were overt.
//
// TIME AND PLACE. The evidence is this corpus, this language, this era — a table is never a
// universal "Jonathan = male" constant. "Ashley" bound by he/him in one corpus and she/her in
// another is recorded as exactly that (both classes attested), and a being whose attestation is
// split is reported split, never forced to one side. Slavic past tense dropping the copula (and
// with it person agreement) is a change over time; the table of a corpus at one date does not
// speak for a text at another.
//
// The giver answers the same shape as name-gender.js::priorGenderFromNames so it drops into the
// chain unchanged: { text, cast, table } -> Map ref -> class (open). Pure; the table is built
// offline by buildCorpusTable and held as a giver with its provenance.

const WORD_RE = /[\p{L}\p{N}’'-]+/gu;
const SENT_SPLIT_RE = /(?<=[.!?…])\s+/gu;   // regex-ok: sentence boundary, not language meaning
const CLAUSE_SPLIT_RE = /[,;:—–()[\]"“”]|(?:,\s|;\s)/g; // regex-ok: a coarse clause cut for tallying a prior, not a parse

// The name candidate rule: a capitalised word that occurs MID-SENTENCE at least once (the proper-noun
// signal — common nouns and function words get capitalised only at sentence start, a name gets
// capitalised after another word too), minus a received closed class of capitalisable NON-names
// (function words, the always-capital "I", and second person). Latin-script only; a non-Latin
// script passes its own being register through `names` instead (the read's beings). Pronoun forms
// (He/She/It) are excluded by the caller, not here.
// STOPLIST — a received closed class (giver lang/en), the same standing as priors.js's closed
// classes: capitalisable words that are never a being's name. Closed classes do not grow silently.
const NON_NAMES = new Set(["i", "we", "you", "me", "us", "the", "a", "an", "and", "or", "nor", "but", "yet", "so", "for", "if", "then", "when", "where", "while", "as", "at", "there", "here", "this", "that", "these", "those", "what", "which", "who", "whose", "whom", "how", "why", "to", "of", "in", "on", "by", "with", "from", "into", "onto", "upon", "than", "through", "no", "not", "yes", "oh", "also", "only", "now", "after", "before", "over", "under", "between", "against", "shall", "will", "may", "must", "can", "could", "would", "should", "be", "is", "are", "was", "were", "have", "has", "had", "do", "does", "did"]);
const nameCandidates = (text) => {
  const mid = new Set();
  for (const s of String(text).split(SENT_SPLIT_RE)) {
    const words = [...s.matchAll(/\p{Lu}\p{L}*(?:[’'-]\p{Lu}\p{L}+)*/gu)].map((m) => m[0]);
    for (let k = 1; k < words.length; k++) if (!NON_NAMES.has(words[k].toLowerCase())) mid.add(words[k]);
  }
  return [...mid];
};

/**
 * One text, one language: for every name candidate, tally the gender classes of the gendered
 * pronouns that sit in the SAME CLAUSE as the name (the clause-locality discipline: a pronoun
 * beside a name in its own clause is evidence for that name; beside two names, evidence for
 * neither). Returns Map name -> Map<class, count>.
 * @param pronounForms  the language's pronoun register: { token: "m"|"f"|"n"|"x", ... } (received, not derived here)
 */
export function genderEvidenceFromText(text, { pronounForms = {}, names = null } = {}) {
  const out = new Map();
  const T = String(text ?? "");
  const register = pronounForms instanceof Map ? pronounForms : new Map(Object.entries(pronounForms ?? {}));
  if (!register.size) return out;
  const candidates = new Set((names ?? nameCandidates(T)).filter((w) => !register.has(w.toLowerCase())));
  const key = (w) => w.toLowerCase();
  const clsOf = (w) => register.get(key(w)) ?? null;
  for (const s of T.split(SENT_SPLIT_RE)) {
    const clauses = s.split(CLAUSE_SPLIT_RE);
    for (const cl of clauses) {
      const here = new Map(); // name -> Set<class>
      for (const m of cl.matchAll(/\p{Lu}\p{L}*(?:[’'-]\p{Lu}\p{L}+)*/gu)) if (candidates.has(m[0])) here.set(m[0], new Set());
      if (!here.size) continue;
      for (const m of cl.matchAll(WORD_RE)) { const c = clsOf(m[0]); if (!c) continue; for (const namesSet of here.values()) namesSet.add(c); }
      if (here.size !== 1) continue; // pronoun beside two names: evidence for neither
      const [name] = here.keys(); const classes = here.get(name);
      if (!classes.size) continue;
      const rec = out.get(key(name)) ?? new Map();
      for (const c of classes) rec.set(c, (rec.get(c) ?? 0) + 1);
      out.set(key(name), rec);
    }
  }
  return out;
}

/** Merge evidence across texts (one language, one place/time). Returns { table: Map name -> Map<class,count>, provenance }. */
export function buildCorpusTable(texts, { language = "en", pronounForms = null, provenance = {} } = {}) {
  const forms = pronounForms ?? defaultPronounForms(language);
  const table = new Map();
  for (const t of texts ?? []) {
    const ev = genderEvidenceFromText(t, { pronounForms: forms });
    for (const [name, classes] of ev) {
      const rec = table.get(name) ?? new Map();
      for (const [c, n] of classes) rec.set(c, (rec.get(c) ?? 0) + n);
      table.set(name, rec);
    }
  }
  return { table, language, provenance: { ...provenance, docs: (texts ?? []).length, giver: "corpus" } };
}

// The received per-language pronoun forms, open-set. Today exactly the English third-person
// register extended with neuter and the no-gender "they" class; a second language adds its own
// forms here (same standing as PRONOUN_PRIORS: received, giver named, never a guess).
const defaultPronounForms = (language) => {
  if (String(language).toLowerCase() !== "en") return new Map();
  return new Map(Object.entries({ he: "m", him: "m", his: "m", himself: "m", she: "f", her: "f", hers: "f", herself: "f", it: "n", its: "n", itself: "n", they: "x", them: "x", their: "x", theirs: "x", themselves: "x" }));
};

/**
 * The prior for a being, from the corpus table, with an OPEN class. A being is known when, summed
 * over the words of its mention spans, exactly one class has strictly more evidence than every
 * other AND the total clears MIN_EVIDENCE (the same two-observation minimum as name-gender.js).
 * A split attestation (m and f both attested, no winner) rules NOTHING — reported unknown, never
 * forced. Returns Map ref -> class (m|f|n|x).
 */
export const MIN_EVIDENCE = 2;
export function genderPriorFromCorpus({ text, cast, corpusTable }) {
  const out = new Map(); if (!corpusTable?.table) return out;
  const T = String(text ?? "");
  for (const b of cast ?? []) {
    const tally = new Map();
    for (const [s, e] of b.mentionSpans ?? []) for (const w of T.slice(s, e).match(WORD_RE) ?? []) {
      const rec = corpusTable.table.get(w.toLowerCase());
      if (rec) for (const [c, n] of rec) tally.set(c, (tally.get(c) ?? 0) + n);
    }
    const total = [...tally.values()].reduce((a, b) => a + b, 0);
    if (total < MIN_EVIDENCE) continue;
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) out.set(b.ref, ranked[0][0]);
  }
  return out;
}

// ————————————————————————————————————————————————————————————————
// THE PRO-DROP HALF. In a pro-drop language the null pro-form's feature bundle rides the VERB's
// agreement morphology, not an overt pronoun (Hindi `diyā` = MASC.SG agreeing with the object;
// Hebrew past verbs inflect person+number+GENDER; Slavic past inflects gender+number, not person).
// This reads the dropped subject's agreement off the verb, open-set and language-parameterised,
// the same standing as the pronoun registers: the register is RECEIVED (per language), never guessed.
//
// verbAgreement is a register of the language's finite verb forms -> their agreement:
//   { "<surface form>": { person: "1"|"2"|"3", number: "sg"|"pl", gender: "m"|"f"|"n"|"x"|null } }
// A form whose gender is null carries person/number only (Greek/Sanskrit finite verbs). The
// gender a verb attests is the dropped subject's own, OPEN — a three-gender verb paradigm yields
// m/f/n, never collapsed to two.
//
// Binding that dropped subject to a REFERENT is the resolver's own job (pronouns.js `nullSubjects`,
// the same presence rule, PREREG-ROUND21), NOT this giver: this only extracts the feature bundle
// from the verb, exactly as genderEvidenceFromText extracts it from an overt pronoun. The two
// streams answer the same question about the same being in a language that drops its pro-forms.
// ————————————————————————————————————————————————————————————————
export function verbAgreementFromText(text, { verbAgreement = null } = {}) {
  const out = [];
  const reg = verbAgreement instanceof Map ? verbAgreement : new Map(Object.entries(verbAgreement ?? {}));
  if (!reg.size) return out;
  for (const m of String(text ?? "").matchAll(WORD_RE)) {
    const rec = reg.get(m[0].toLowerCase());
    if (rec) out.push({ verb: m[0], index: m.index, person: rec.person ?? null, number: rec.number ?? null, gender: rec.gender ?? null });
  }
  return out;
}

// A verb-agreement register is built like a pronoun register, from a treebank's verb paradigm:
// tally, per verb surface, its attested person/number/gender and admit only the clean forms (one
// person, one number, one gender), the same MIN_OBSERVATIONS discipline normalizePronounClass uses.
export function verbAgreementFromParadigm(forms, { minObservations = 2 } = {}) {
  const GENDER_TREE = { Masc: "m", Fem: "f", Neut: "n" };
  const out = new Map();
  for (const [surface, stats] of Object.entries(forms ?? {})) {
    const clean = (o) => { const e = Object.entries(o ?? {}).filter(([k, v]) => k !== "_" && v >= minObservations); return e.length === 1 ? e[0][0] : null; };
    const person = clean(stats.person), number = clean(stats.number), genderRaw = clean(stats.gender);
    const gender = genderRaw ? (GENDER_TREE[genderRaw] ?? genderRaw) : null;
    if (person && number) out.set(surface.toLowerCase(), { person, number, gender });
  }
  return out;
}

// ————————————————————————————————————————————————————————————————
// THE ROWS HALF. The same tally read off the reader's dependency rows (its UD codec) instead of the surface, so no pattern
// touches the language: a pro-form counts for a being only where the GRAMMAR binds it to that being, a reflexive
// (Reflex=Yes) or a possessive (nmod:poss) inside the clause whose subject is the being's name. The clause is the verb with
// its dependents, entering a dependent verb only when it has no subject of its own (control, a coordinated verb sharing the
// subject), never the subject's own phrase ("her mother said" says nothing about the mother). The class is the pro-form's own
// features (open, as above): Gender=Masc m, Fem f, Neut n; no gender with Number=Plur x; first and second person never.
// A possessive in a clause that names another being is evidence for neither (the text half's rule); a reflexive is bound by
// its clause and always counts. Recurring evidence only: the caller tallies a whole text, and proformOf says when the
// tally does not decide.
// ————————————————————————————————————————————————————————————————
/** "Case=Acc|Gender=Fem" → { Case: "Acc", Gender: "Fem" } (the CoNLL-U FEATS column) */
export const featsOf = (f) => { const o = {}; if (!f || f === "_") return o; for (const kv of String(f).split("|")) { const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); } return o; };
/** a pro-form's agreement class from its features: m | f | n | x, or null (first/second person, or no agreement carried) */
export const proformClass = (feats) => {
  const F = typeof feats === "string" ? featsOf(feats) : (feats ?? {});
  if (F.Person && F.Person !== "3") return null;
  if (F.Gender === "Masc") return "m"; if (F.Gender === "Fem") return "f"; if (F.Gender === "Neut") return "n";
  return F.Number === "Plur" ? "x" : null;
};
const OWN_SUBJECT = new Set(["nsubj", "nsubj:pass", "csubj", "csubj:pass", "expl"]);
const NAME_PART = new Set(["flat", "flat:name", "compound"]);
/**
 * genderEvidenceFromRows(sentences, { keyOf }) → Map key → { classes: { m, f, n, x }, reflexive, possessive }
 *   sentences: arrays of reader rows ({ id, head, deprel, upos, feats, form, lemma }); keyOf(row) names the being a subject
 *   word stands for (the caller's fold); a name's flat parts ("Prince Andrew") each get the evidence.
 */
export function genderEvidenceFromRows(sentences, { keyOf = (r) => r.form } = {}) {
  const out = new Map();
  const add = (key, cls, kind) => { let e = out.get(key); if (!e) out.set(key, (e = { classes: {}, reflexive: 0, possessive: 0 })); e.classes[cls] = (e.classes[cls] ?? 0) + 1; e[kind]++; };
  for (const rows of sentences ?? []) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const kids = new Map(); for (const r of rows) { const a = kids.get(r.head); if (a) a.push(r); else kids.set(r.head, [r]); }
    for (const v of rows) {
      const subj = (kids.get(v.id) ?? []).find((c) => c.deprel === "nsubj" || c.deprel === "nsubj:pass");
      if (!subj || (subj.upos !== "PROPN" && subj.upos !== "NOUN")) continue;
      const beings = [subj, ...(kids.get(subj.id) ?? []).filter((c) => NAME_PART.has(c.deprel) && c.upos === subj.upos)];
      for (const { cls, kind } of boundProforms(kids, v, subj)) for (const b of beings) add(keyOf(b), cls, kind);
    }
  }
  return out;
}
/** the pro-forms the clause of verb `v` binds to its subject `subj` (kids: head id → rows): [{ row, cls, kind }] */
export function boundProforms(kids, v, subj) {
  const scope = [], st = (kids.get(v.id) ?? []).filter((c) => c !== subj), out = [];
  while (st.length) {
    const x = st.pop();
    if ((kids.get(x.id) ?? []).some((c) => OWN_SUBJECT.has(c.deprel))) continue; // a clause with its own subject is its own
    scope.push(x); for (const y of kids.get(x.id) ?? []) st.push(y);
  }
  const another = scope.some((x) => x.upos === "PROPN");
  for (const x of scope) {
    if (x.upos !== "PRON") continue;
    const F = featsOf(x.feats), cls = proformClass(F); if (!cls) continue;
    const kind = F.Reflex === "Yes" ? "reflexive" : x.deprel === "nmod:poss" ? "possessive" : null;
    if (!kind || (kind === "possessive" && another)) continue;
    out.push({ row: x, cls, kind });
  }
  return out;
}
/** two-sided exact sign test: k successes of n at p = 1/2 */
export const signTest = (k, n) => { if (!n) return 1; const lg = [0]; for (let i = 1; i <= n; i++) lg.push(lg[i - 1] + Math.log(n - i + 1) - Math.log(i)); let s = 0; for (let i = Math.max(k, n - k); i <= n; i++) s += Math.exp(lg[i] - n * Math.LN2); return Math.min(1, 2 * s); };
/**
 * proformOf(evidence, { alpha }) → { cls, n, of, runnerUp, p, contested } | null
 * The class the grammar binds most often; CONTESTED when it does not beat the runner-up by an exact sign test at alpha
 * (a declared dial: 0.05, the conventional level, stated rather than tuned). No evidence → null, never a default.
 */
export function proformOf(evidence, { alpha = 0.05 } = {}) {
  const ranked = Object.entries(evidence?.classes ?? {}).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [cls, n] = ranked[0], second = ranked[1]?.[1] ?? 0, p = signTest(n, n + second);
  return { cls, n, of: ranked.reduce((a, x) => a + x[1], 0), runnerUp: ranked[1]?.[0] ?? null, p, contested: p >= alpha };
}
/**
 * proformsOfParse(parse, { keyOf }) → { key: { classes, reflexive, possessive, cls, n, of, runnerUp, p, contested } }
 * The whole read's tally (parse = the reader's [{ rows }]), each key with its decision: what a read carries as
 * entry.proforms, and what the door weaves into pharos per being (kind `proform`). keyOf: a name by its written form,
 * a common noun by its lemma, lower-cased.
 */
export const proformKey = (r) => String(r.upos === "PROPN" ? r.form : (r.lemma ?? r.form)).normalize("NFC").toLowerCase();
export function proformsOfParse(parse, { keyOf = proformKey } = {}) {
  const out = {};
  for (const [k, e] of genderEvidenceFromRows((parse ?? []).map((p) => p?.rows), { keyOf })) out[k] = { ...e, ...proformOf(e) };
  return out;
}
/** whether a reader's rows carry the features the tally reads (a parser that emits FEATS) */
export const rowsCarryFeats = (parse) => Array.isArray(parse) && parse.some((p) => p?.rows?.some((r) => r.feats && r.feats !== "_"));
