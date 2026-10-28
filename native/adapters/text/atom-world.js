// atom-world.js — THE WORLD A HOLOGRAPHIC IDENTITY TEST READS, BUILT FROM ATOMS.
//
// corpus-identity.js decides whether two referents in two readings are one being, from a record: a node per referent per reading, an occurrence
// per mention, an occurrence's features its surroundings (the universe folded on it). reading-timeline.js builds that record from a log of mentions;
// this builds it from atoms, so a claim and the source it is read against can be asked the same question.
//
//   node        a referent of one reading, `${doc}:${entity}` (readings are never merged: the same name in two readings is two nodes)
//   occurrence  an atom that names it; its features are the atom's predicate (v:) and the atom's other ends (w:, keyed by the last name token so a
//               name means the same in two readings), hop 1
//
//   worldFromReadings([{ doc, atoms }]) → Map nodeId → occurrences
//   factsFromReadings([{ doc, atoms }]) → what exclusion reads: the figures each referent is asserted to have (has_*), its kinds, how two figures compare
//   nominations([{ doc, atoms, entities }]) → the cross-reading pairs a shared NAME nominates (an entity with name words; a description nominates nothing)
//   atomIdentity(readings, { sameBeing }) → { record, need, standing(docA, endA, docB, endB, { except }?), facts }
//
// A STANDING is the holographic verdict as a binder reads it, and it has four kinds, each said for what it is (identity-verdict.js):
//   same                  the universes folded on the two match, the counterfactual weight is real and the consequence aligns beyond chance
//   against               a declared one-valued relation conflicts on witnessed assertions (exclusion): the standing carries `proof`, each conflict citing the
//                         relation, its giver and the two assertions (their spans). Only this says "not that being"; reading too thinly never does.
//   raised_difference     the induction measured a difference of USE. A difference of use is not a different thing: it is carried, and convicts nothing.
//   needs_deeper_reading  the reading is too thin to decide ("not enough reading yet", or the node carries no weight against the background): not
//                         "same", not "different", and it says how much is missing
// An end that is no referent (a figure, a kind, a value) has no being to ask about: standing(...) is null.
import { makeSameBeing, BEING } from "./corpus-identity.js";
import { CONTRADICTED } from "../../interpretation/hl.js";
import { argText, low, meeters } from "../../kernel/atom-support.js";

const keyOf = (a) => { const t = low(argText(a)).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((x) => x.length > 2); return t.length ? t[t.length - 1] : ""; };
export const nodeOf = (doc, end) => (end && end.entity != null ? `${doc}:${end.entity}` : null);

export function worldFromReadings(readings) {
  const record = new Map();
  for (const { doc, atoms } of readings) for (const a of atoms) for (const x of a.args ?? []) {
    const id = nodeOf(doc, x); if (!id) continue;
    const feats = [{ f: `v:${a.pred}`, hop: 1 }, ...(a.args ?? []).filter((y) => y !== x).map((y) => ({ f: `w:${keyOf(y)}`, hop: 1 })).filter((o) => o.f !== "w:")];
    (record.get(id) ?? record.set(id, []).get(id)).push(feats);
  }
  return record;
}

// WHAT EXCLUSION READS. A has_* atom with a keyed measure is an ASSERTION about its subject: { rel, value: { figure, timed }, id, doc, span, text }. Only a
// positive atom is one (a negated figure asserts no value); a hedged (reported) one is carried but not WITNESSED, so a conflict resting on it is raised
// and convicts nothing. A figure whose sentence states a time (a year numeral) is `timed`: the license is one value "time-keyed when the text gives a
// time", so two values with a time among them cannot be told apart (sameValue null, incomparable), never read as a conflict. A being whose OWN reading holds
// two figures of one measure that do not meet has refuted the license for itself (the measure is not one-valued there, as stage.js's refutation path): that
// relation is dropped for it. Every referent is a being (the measure license's key); no other kind is declared.
const TIME = /\b(?:1[5-9]|20)\d\d\b/;
export function factsFromReadings(readings) {
  const M = meeters([], [], {}), byNode = new Map(), nodes = new Set(), rels = new Set();
  for (const { doc, atoms } of readings) atoms.forEach((a, i) => {
    for (const x of a.args ?? []) { const id = nodeOf(doc, x); if (id) nodes.add(id); }
    if (/^(has_|most:)/.test(a.pred)) rels.add(a.pred);
    if (!/^has_/.test(a.pred) || a.neg || (a.args ?? []).length !== 2) return;
    const id = nodeOf(doc, a.args[0]), fig = a.args[1]; if (!id || !fig?.measure || fig.base == null) return;
    (byNode.get(id) ?? byNode.set(id, []).get(id)).push({ rel: a.pred, value: { figure: fig, timed: TIME.test(a.sentence ?? a.span ?? "") }, id: `${doc}#${i}`, doc, span: [a.start ?? null, a.end ?? null], text: a.text, hedged: !!a.hedged });
  });
  const sameValue = (u, v) => (u.timed || v.timed ? null : M.figMeet(u.figure, v.figure));
  const own = new Map(); // node → the relations its own reading refutes
  for (const [id, xs] of byNode) for (const rel of new Set(xs.map((x) => x.rel))) {
    const vs = xs.filter((x) => x.rel === rel && !x.value.timed);
    if (vs.some((u) => vs.some((v) => sameValue(u.value, v.value) === false))) (own.get(id) ?? own.set(id, new Set()).get(id)).add(rel);
  }
  return Object.freeze({ rels: [...rels], kindsOf: (x) => (nodes.has(x) ? new Set([BEING]) : new Set()), sameValue, witnessed: (x) => !x.hedged && x.span[0] != null,
    assertionsOf: (x) => (byNode.get(x) ?? []).filter((y) => !own.get(x)?.has(y.rel)) });
}

// A shared NAME nominates, and nothing else does. An entity is named when the page's resolver gave it name words (coref.js `names`); a description ("the
// cooperative") has none and nominates nothing. Pairs are across readings (the same name in two readings is two nodes; `within` adds pairs inside one
// reading, where the resolver split one being in two). Each pair is listed once, with the name words it was nominated by.
export function nominations(readings, { within = false } = {}) {
  const byWord = new Map(), seen = new Map();
  for (const { doc, atoms, entities } of readings) {
    const used = new Set(atoms.flatMap((a) => (a.args ?? []).filter((x) => x.entity != null).map((x) => x.entity)));
    for (const e of entities ?? []) if (e.names?.length && used.has(e.id)) {
      const end = { doc, entity: e.id, name: e.name, names: [...new Set(e.names)] };
      for (const w of end.names) (byWord.get(w) ?? byWord.set(w, []).get(w)).push(end);
    }
  }
  const out = new Map();
  for (const [w, ends] of byWord) for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) {
    const x = ends[i], y = ends[j]; if (x.doc === y.doc && !within) continue;
    const [p, q] = nodeOf(x.doc, x) <= nodeOf(y.doc, y) ? [x, y] : [y, x], key = `${nodeOf(p.doc, p)}|${nodeOf(q.doc, q)}`;
    if (!out.has(key)) out.set(key, { a: p, b: q, words: [] });
    out.get(key).words.push(w);
  }
  return [...out.values()].sort((u, v) => (nodeOf(u.a.doc, u.a) + nodeOf(u.b.doc, u.b) < nodeOf(v.a.doc, v.a) + nodeOf(v.b.doc, v.b) ? -1 : 1));
}

export function atomIdentity(readings, { sameBeing = makeSameBeing() } = {}) {
  const record = worldFromReadings(readings), facts = factsFromReadings(readings), judge = sameBeing.prepare(record, facts), need = sameBeing.params.minOccurrences;
  return {
    record, need, facts,
    standing(docA, endA, docB, endB, { except = null } = {}) {
      const a = nodeOf(docA, endA), b = nodeOf(docB, endB); if (!a || !b) return null;
      const have = [record.get(a)?.length ?? 0, record.get(b)?.length ?? 0], v = judge(a, b, { except });
      const kind = v.same ? "same" : v.against ? "against" : v.induction?.verdict === CONTRADICTED ? "raised_difference" : "needs_deeper_reading";
      return { kind, same: v.same, against: v.against, reason: v.reason, have, need, basis: v.basis, ...(v.against ? { proof: v.exclusion.proof, contested: v.contested } : {}), ...(v.exclusion.raised.length ? { raised: v.exclusion.raised } : {}) };
    },
  };
}
