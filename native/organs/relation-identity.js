// relation-identity.js — relation identity, INDUCED for an observer from the read corpus (no lexicon). A relation is a node; each time a source states
// it, that is an occurrence whose features are what it joins (its ends' heads and names), the measures it carries and its obliques. Two
// relations are the same, for the observer "does a source state this claim", when khora's identity induction binds them: the worlds folded
// on them match and each carries weight beyond chance (native/kernel/identity-induction.js via native/adapters/text/corpus-identity.js).
import { makeSameBeing } from "../adapters/text/corpus-identity.js";
import { claimsOf } from "../adapters/text/grammar-en.js";
const endFeat = (e) => (e ? [e.names.at(-1) ?? e.head].filter(Boolean) : []);
export function relationRecord(sentences) {
  const rec = new Map();
  for (const s of sentences) for (const c of claimsOf(s)) {
    if (!c.rel || c.rel === "be") continue;
    const f = new Set([...endFeat(c.ARG0).map((x) => `w:a0:${x}`), ...endFeat(c.ARG1).map((x) => `w:a1:${x}`), ...(c.OBL || []).flatMap(endFeat).map((x) => `o:${x}`),
      ...[c.ARG0, c.ARG1, ...(c.OBL || [])].filter(Boolean).flatMap((e) => e.figs.map((g) => `m:${g.measure}`))]);
    if (!f.size) continue;
    (rec.get(c.rel) ?? rec.set(c.rel, []).get(c.rel)).push([...f].map((x) => ({ f: x, hop: 1 })));
  }
  return rec;
}
export const FOR_WHOM = { question: "does a source state this claim, said with another relation?", universeKind: "world", giver: "the grounding check" };
export function relationJudge(sentences) {
  const rec = relationRecord(sentences);
  const judge = makeSameBeing().prepare(rec);
  return { rec, same: (a, b) => (rec.has(a) && rec.has(b) ? judge(a, b) : { same: false, verdict: "gap", reason: `not read enough (${rec.get(a)?.length ?? 0}, ${rec.get(b)?.length ?? 0} occurrences)` }) };
}
