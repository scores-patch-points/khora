// adapters/text/negation-read.js — POLARITY READ OFF THE PARSE, not off a word list.
//
// The rule this serves (nesting-fix-2026-10-14/NO-FIXED-LISTS.md): no hand-typed
// collection of natural-language word forms is consulted at run time to
// classify content. D13 (35830003) had put one in priors.js (no / nobody /
// nothing / none and their hand-typed exceptives); it is reverted, and this is
// what stands for it.
//
// WHAT IS READ. english-parser.js's trained model (UD English-EWT) carries,
// per form|UPOS, the treebank's own morphological features. Universal
// Dependencies marks a negator in exactly two features: `Polarity=Neg` (not,
// n't, nor, neither, the answer particle "No") and `PronType=Neg` (never, no,
// nobody, nothing, none, nowhere). Those two feature names are UD's schema
// vocabulary, the system's own typed vocabulary, not a lexicon of a natural
// language; WHICH FORMS carry them is read out of the model's lexicon. A
// dependency relation (UD's own labels: advmod, det, nsubj, obj, cc, ...)
// then says what the negator modifies. Nothing here names an English word.
//
// WHAT IS NOT GUESSED (typed, never a list):
//   no-polarity-source          the model's lexicon carries no negation
//                               feature at all (another language's model, a
//                               model built without features): the stage
//                               returns this gap, never "+" read as a finding.
//   not-attested                a form the treebank never saw with that class
//                               (feature came from a suffix/class backoff):
//                               not read as a negator.
//   coordinated-scope           the negated argument is coordinated ("nobody
//                               BUT Lincoln" / "nobody AND nothing"): whether
//                               the coordination cancels the negation is
//                               decided by the conjunction's own form, which
//                               carries no feature; no polarity claim.
//   negation-not-on-predicate   the negator modifies something that is not a
//                               predication ("Not only Lincoln ...").
//   negation-on-non-core-argument  "In no time", "No doubt." — a negated
//                               adjunct/root nominal is not a clause negation.
//   answer-particle             a discourse-attached "No," is the answer to a
//                               previous turn, not this clause's negation.
//
// What it does NOT do, stated: UD does not mark degree negators ("hardly",
// "scarcely") with either feature, so they are not read; no parity (two
// negators = still "-"); no semantic reading of "no doubt"/"no wonder" when
// the parser attaches them as a core subject (see the test's OPEN class).

import { lemmaAndFeats } from "./english-parser.js";

export const POLARITY_GAP = "no-polarity-source";
export const NEGATION_READ_SCHEMA = "NegationRead@1";

// UD's own feature schema: the two places a treebank annotates a negator.
const NEG_FEATURES = Object.freeze(["Polarity=Neg", "PronType=Neg"]);
// UD's own relation names (typed system vocabulary).
const CORE_ARGUMENT = /^(nsubj|csubj|obj|iobj)(:|$)/;
const PREDICATION_CHILD = /^(nsubj|csubj|cop|expl)(:|$)/;
const DETERMINER = /^det(:|$)/;

const hasNegFeature = (feats) => typeof feats === "string" && feats.split("|").some((f) => NEG_FEATURES.includes(f));

const SOURCE = new WeakMap();
/**
 * polaritySource(model) → { available, carriers, forms?, gap?, reason?, giver }
 * Counts the lexicon entries (form|UPOS) the treebank annotated with a
 * negation feature. Zero → the typed gap; the callers read nothing.
 */
export function polaritySource(model) {
  const lex = model?.lexicon?.form;
  if (!lex || typeof lex !== "object") return { available: false, carriers: 0, gap: POLARITY_GAP, reason: "the model carries no form lexicon with features" };
  let hit = SOURCE.get(lex);
  if (hit) return hit;
  const forms = new Set();
  let carriers = 0;
  for (const [key, val] of Object.entries(lex)) {
    const tab = val.indexOf("\t");
    if (tab < 0 || !hasNegFeature(val.slice(tab + 1))) continue;
    carriers++;
    forms.add(key.slice(0, key.lastIndexOf("|")));
  }
  hit = carriers
    ? { available: true, carriers, forms, giver: "UD feature Polarity=Neg / PronType=Neg, per form|UPOS in the parser model's lexicon (the treebank's own tallies)" }
    : { available: false, carriers: 0, gap: POLARITY_GAP, reason: "the model's lexicon carries no Polarity=Neg / PronType=Neg form" };
  SOURCE.set(lex, hit);
  return hit;
}

/** The generated class: every form the treebank annotates as a negator (lowercase). Empty + gap when none. */
export function negationClassOf(model) {
  const s = polaritySource(model);
  return s.available ? s.forms : new Set();
}

const isAttestedNegator = (model, row) => {
  const { feats, basis } = lemmaAndFeats(model.lexicon, row.form, row.upos);
  return basis === "form" && hasNegFeature(feats);
};

/**
 * readPolarity(model, rows) → NegationRead@1
 *   rows   english-parser.js analyse() output (UD rows, 1-based ids).
 *   { schema, source, gap?, heads: Map<id, {polarity:"-", via:[{id,form,deprel,how}]}>,
 *     gaps: [{id, form, gap, reason}] }
 * `heads` holds only the predications a negator was read onto; every other
 * predication is "+" by absence (the door's own default), and `gaps` lists the
 * negators the read refused to place, each typed.
 */
export function readPolarity(model, rows) {
  const source = polaritySource(model);
  const out = { schema: NEGATION_READ_SCHEMA, source: { available: source.available, carriers: source.carriers, giver: source.giver }, heads: new Map(), gaps: [] };
  if (!source.available) { out.gap = POLARITY_GAP; out.reason = source.reason; return out; }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const kids = new Map();
  for (const r of rows) {
    if (r.head == null || r.head === 0) continue;
    if (!kids.has(r.head)) kids.set(r.head, []);
    kids.get(r.head).push(r);
  }
  const kidsOf = (id) => kids.get(id) ?? [];
  const isPredication = (h) => h.upos === "VERB" || h.upos === "AUX" || h.deprel === "root" || kidsOf(h.id).some((k) => PREDICATION_CHILD.test(k.deprel));
  // A negated argument that is itself coordinated: it has a conjunct, or its
  // head has a coordinator and a second argument of the same relation.
  const coordinated = (a) => kidsOf(a.id).some((k) => k.deprel === "conj") || a.deprel === "conj"
    || (a.head && kidsOf(a.head).some((k) => k.deprel === "cc") && kidsOf(a.head).filter((k) => k.deprel === a.deprel).length > 1);

  const gap = (c, g, reason) => out.gaps.push({ id: c.id, form: c.form, gap: g, reason });
  const place = (c, headRow, how) => {
    if (!headRow) return gap(c, "negation-not-on-predicate", "no head");
    if (!isPredication(headRow)) return gap(c, "negation-not-on-predicate", `${c.form} modifies ${headRow.form}/${headRow.upos}, not a predication`);
    const cur = out.heads.get(headRow.id) ?? { polarity: "-", via: [] };
    cur.via.push({ id: c.id, form: c.form, deprel: c.deprel, how });
    out.heads.set(headRow.id, cur);
  };

  for (const c of rows) {
    if (!isAttestedNegator(model, c)) continue;
    const rel = c.deprel ?? "";
    if (rel === "discourse" || rel === "vocative" || rel === "punct") { gap(c, "answer-particle", `${c.form} is attached as ${rel}`); continue; }
    if (rel === "root") { place(c, c, "root"); continue; }
    if (CORE_ARGUMENT.test(rel)) {
      if (coordinated(c)) { gap(c, "coordinated-scope", `${c.form} is coordinated`); continue; }
      place(c, byId.get(c.head), "argument");
      continue;
    }
    if (DETERMINER.test(rel)) {
      const a = byId.get(c.head);
      if (a && CORE_ARGUMENT.test(a.deprel ?? "")) {
        if (coordinated(a)) { gap(c, "coordinated-scope", `${a.form} is coordinated`); continue; }
        place(c, byId.get(a.head), "determiner-of-argument");
      } else if (a && kidsOf(a.id).some((k) => /^cop(:|$)/.test(k.deprel))) {
        // a predicate nominal is the head of its clause in UD (copula as a
        // dependent): "Lincoln is NO friend of Hamlin" negates the predication.
        place(c, a, "determiner-of-predicate-nominal");
      } else gap(c, "negation-on-non-core-argument", `${c.form} determines ${a?.form ?? "?"} as ${a?.deprel ?? "?"}`);
      continue;
    }
    if (rel === "advmod" || rel === "cc") {
      const h = byId.get(c.head);
      // "not only X but also Y", "did not sign but vetoed": the negated head is
      // a coordinated conjunct, and which coordination it is (correlative vs
      // contrastive) is the conjunction's form, which carries no feature.
      if (h && coordinated(h)) { gap(c, "coordinated-scope", `${c.form} modifies ${h.form}, which is coordinated`); continue; }
      place(c, h, rel);
      continue;
    }
    gap(c, "negation-on-non-core-argument", `${c.form} attached as ${rel}`);
  }
  return out;
}

/** The polarity of one predication head from a NegationRead: "-" | "+" and the typed gap, if any. */
export function polarityOfHead(read, headId) {
  if (read.gap) return { polarity: "+", gap: read.gap };
  const h = read.heads.get(headId);
  if (h) return { polarity: "-", via: h.via };
  return { polarity: "+" };
}
