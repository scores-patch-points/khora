// demo/record.mjs — write the full nine-operator loop to pharos, so a future system reads the same marks
// and behaves the same. One river, nine cells:
//
//   read   INS·Figure  "being"      the cast: each referent the reading admitted (Existence, count)
//          SYN·Pattern "karaka"     the fold: each kāraka triple (Structure, the relation)
//          SIG·Figure  "sign"       the sign: each relation's polarity (Existence, the sign)
//   ask    DEF·Ground  "void"       the declared shape of what is needed (Interpretation)
//          SEG·Pattern "candidate"  the survivor of the narrowing (Structure, the segment)
//          CON·Figure  "binding"    the pronoun->referent binding (Structure, the connect)
//          EVA·Figure  "verdict"    the narrowing: answer + reason + dmd (Interpretation)
//          REC·Figure  "utterance"  the generation, the voiced sentence (Interpretation)
//          NUL·Figure  "empty"      the grounded null — nothing moved (Existence, 0)
//
// DEF/EVA/REC only judge; they need INS/CON/SYN/SIG to have inscribed, bound, synthesized and signed
// first, and EVA's "empty" is NUL made reachable. Each mark is `of` the void where it is a consequence.
import { createHash } from "node:crypto";
import { weave } from "../../../pharos/lib/pharos.mjs";

const sha = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 20);

/** weaveBeing(h, {lemma, surface}) -> INS·Figure: a being the reading admitted (the cast). */
export function weaveBeing(h, c) {
  return weave(h, { cell: "INS·Figure", kind: "being", addr: `being:${c.lemma}`, body: { surface: c.surface } });
}

/** weaveRead(h, triple, key) -> SYN·Pattern (the relation) + SIG·Figure (its sign). */
export function weaveRead(h, triple, key) {
  const roles = Object.fromEntries(Object.entries(triple).filter(([k]) => k !== "surface"));
  weave(h, { cell: "SYN·Pattern", kind: "karaka", addr: `karaka:${key}`, body: roles });
  weave(h, { cell: "SIG·Figure", kind: "sign", addr: `sign:${key}`, body: { neg: !!triple.neg } });
}

/** weaveAsk(h, turn, voiced) -> the DEF/EVA/REC of one turn plus SEG (candidate), CON (binding) and
 *  NUL (the grounded empty). Returns the void entry's id. */
export function weaveAsk(h, turn, voiced = null) {
  const id = sha(turn.question);
  const v = weave(h, {
    cell: "DEF·Ground", kind: "void", addr: `void:${id}`,
    body: { question: turn.question, type: turn.type, void: turn.void ?? null, admits: turn.admits ?? null },
  });
  if (turn.matched) weave(h, {
    cell: "SEG·Pattern", kind: "candidate", addr: `candidate:${id}`,
    body: { predicate: turn.matched.predicate, roles: Object.fromEntries(Object.entries(turn.matched).filter(([k]) => k !== "surface" && k !== "neg")) },
    of: [v.id],
  });
  if (turn.binding) weave(h, { cell: "CON·Figure", kind: "binding", addr: `binding:${id}`, body: turn.binding, of: [v.id] });
  weave(h, {
    cell: "EVA·Figure", kind: "verdict", addr: `verdict:${id}`,
    body: {
      type: turn.type,
      ...(turn.answer !== undefined ? { answer: turn.answer } : {}),
      ...(turn.target ? { target: turn.target } : {}),
      ...(turn.gap ? { gap: turn.gap } : {}),
      ...(turn.reason ? { reason: turn.reason } : {}),
      ...(turn.dmd ? { dmd: turn.dmd } : {}),
      ...(voiced ? { voiced } : {}),
    },
    of: [v.id],
  });
  if (voiced) weave(h, { cell: "REC·Figure", kind: "utterance", addr: `utterance:${id}`, body: { text: voiced }, of: [v.id] });
  else weave(h, { cell: "NUL·Figure", kind: "empty", addr: `empty:${id}`, body: { reason: turn.reason ?? "no grounded answer" }, of: [v.id] });
  return v.id;
}
