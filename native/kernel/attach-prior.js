// attach-prior.js — AttachPrior@1: where a dative phrase attaches is a fact about the VERB, induced from a treebank's gold, in any language.
//   instancesOf(sentence, { adps }) → [{ verb, attach: "verb" | "noun", v, o, k }]   one per dative-marked phrase after a verb's direct object (token ids: verb, object, phrase head)
//   buildPrior(sentences, { adps }) → { [verbLemma]: { verb, noun } }       counts only; nothing is decided here
//   decide(prior, lemma) → "verb" | "noun" | null                           strict majority; a tie or an unseen lemma abstains (null)
// A phrase is dative-marked when its case word is one of the language's declared recipient adpositions (grammar-packs RECIPIENT) or the phrase's
// head carries UD Case=Dat. Open content (which verb takes a recipient, and where its phrase hangs) is induced, never listed (lesson 71); only the
// closed class that marks a recipient is declared. Pre-registration: eval/meaning/ATTACH-PRIOR-PREREG.md. No model, no threshold.
export const ATTACH_SCHEMA = "AttachPrior@1";
const base = (d) => String(d ?? "").split(":")[0];
const hasDat = (t) => /(^|\|)Case=Dat(\||$)/.test(t?.feats ?? "");
export function instancesOf(s, { adps = new Set() } = {}) {
  const toks = s.tokens ?? s, kids = new Map();
  for (const t of toks) (kids.get(t.head) ?? kids.set(t.head, []).get(t.head)).push(t);
  const marked = (x) => hasDat(x) || (kids.get(x.id) ?? []).some((c) => c.deprel === "case" && adps.has(String(c.lemma ?? c.form).toLowerCase()));
  const out = [];
  for (const v of toks) {
    if (v.upos !== "VERB") continue;
    const o = (kids.get(v.id) ?? []).find((k) => k.deprel === "obj"); if (!o) continue;
    const lemma = String(v.lemma ?? v.form).toLowerCase();
    for (const k of kids.get(v.id) ?? []) if (base(k.deprel) === "obl" && k.id > o.id && marked(k)) out.push({ verb: lemma, attach: "verb", v: v.id, o: o.id, k: k.id });
    for (const k of kids.get(o.id) ?? []) if (base(k.deprel) === "nmod" && k.id > o.id && marked(k)) out.push({ verb: lemma, attach: "noun", v: v.id, o: o.id, k: k.id });
  }
  return out;
}
export function buildPrior(sentences, opts) {
  const P = Object.create(null);
  for (const s of sentences) for (const i of instancesOf(s, opts)) (P[i.verb] ??= { verb: 0, noun: 0 })[i.attach]++;
  return Object.fromEntries(Object.entries(P).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
export function decide(prior, lemma) {
  const c = prior?.[String(lemma ?? "").toLowerCase()]; if (!c) return null;
  return c.verb > c.noun ? "verb" : c.noun > c.verb ? "noun" : null;
}
