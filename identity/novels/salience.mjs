// salience.mjs — a text-specific holograph informed by priors (khora native/kernel/bayes-surprise.js, unchanged). Each reader clause of a book is admitted, in reading order, as facts
// { pred: lemma, subj: referent-or-head, obj: referent-or-head, pair: subj|pred }; the holograph is first fed the OTHER books' clauses (the prior: what clauses are usual), predicate and polarity slots only.
// A sentence's salience = the Bayesian surprise (bits, KL of posterior from prior) summed over its clauses' admissions. Exports salienceOf(weft, text, priorWefts) -> Float64Array per sentence.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KH = process.env.KHORA_DIR ?? path.resolve(HERE, '..', '..');
const { createHolograph, admit } = await import(pathToFileURL(path.join(KH, 'native/kernel/bayes-surprise.js')).href);
const low = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
function eventsOf(W, text) {
  const refAt = new Map(); for (const c of W.cast ?? []) for (const sp of c.mentionSpans ?? []) refAt.set(sp[0] + ':' + sp[1], c.ref);
  const refOf = (a) => (a ? refAt.get(a.start + ':' + a.end) ?? low(a.head ?? text.slice(a.start, a.end)) : null);
  return (W.clauses ?? []).map((c) => ({ s: c.sentence, pred: c.predicate?.lemma ? low(c.predicate.lemma) : null, pol: c.polarity ?? '+', subj: refOf(c.subject), obj: refOf(c.object) })).filter((e) => e.pred);
}
export function salienceOf(W, text, priorWefts = [], priorTexts = []) {
  const holo = createHolograph({ alpha: 1, gamma: 1 });
  priorWefts.forEach((P, k) => { for (const e of eventsOf(P, priorTexts[k])) admit(holo, { pred: e.pred, pol: e.pol }); });
  const sal = new Float64Array(W.sentences.length);
  for (const e of eventsOf(W, text)) { const facts = { pred: e.pred, pol: e.pol, subj: e.subj ?? '(none)', obj: e.obj ?? '(none)', pair: (e.subj ?? '(none)') + '|' + e.pred }; const r = admit(holo, facts); if (e.s >= 0 && e.s < sal.length) sal[e.s] += r.bayes; }
  return sal;
}
