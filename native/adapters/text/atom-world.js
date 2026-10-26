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
//   atomIdentity(readings, { sameBeing }) → { record, need, standing(docA, endA, docB, endB) }
//
// A STANDING is the holographic verdict as a binder reads it, and it has four kinds, each said for what it is (identity-verdict.js):
//   same                  the universes folded on the two match, the counterfactual weight is real and the consequence aligns beyond chance
//   against               a declared one-valued relation conflicts on witnessed assertions (exclusion). None is declared here, so never from this file.
//   raised_difference     the induction measured a difference of USE. A difference of use is not a different thing: it is carried, and convicts nothing.
//   needs_deeper_reading  the reading is too thin to decide ("not enough reading yet", or the node carries no weight against the background): not
//                         "same", not "different", and it says how much is missing
// An end that is no referent (a figure, a kind, a value) has no being to ask about: standing(...) is null.
import { makeSameBeing } from "./corpus-identity.js";
import { CONTRADICTED } from "../../interpretation/hl.js";
import { argText, low } from "../../kernel/atom-support.js";

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

export function atomIdentity(readings, { sameBeing = makeSameBeing() } = {}) {
  const record = worldFromReadings(readings), judge = sameBeing.prepare(record), need = sameBeing.params.minOccurrences;
  return {
    record, need,
    standing(docA, endA, docB, endB) {
      const a = nodeOf(docA, endA), b = nodeOf(docB, endB); if (!a || !b) return null;
      const have = [record.get(a)?.length ?? 0, record.get(b)?.length ?? 0], v = judge(a, b);
      const kind = v.same ? "same" : v.against ? "against" : v.induction?.verdict === CONTRADICTED ? "raised_difference" : "needs_deeper_reading";
      return { kind, same: v.same, against: v.against, reason: v.reason, have, need, basis: v.basis };
    },
  };
}
