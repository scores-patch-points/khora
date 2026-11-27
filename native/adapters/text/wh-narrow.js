// wh-narrow.js — the 20-questions narrowing: a WH-question declares a GAP of a kind, and the kāraka
// DAG says what kind of thing may fill it. This is the bridge from the question's own grammar
// (question-grammar.en.js reads "who/where/when/why/what" into `admits`) to the reasoning: the
// `admits` value IS the kāraka role of the gap, and narrowing the candidates by that role is the DMD.
//
//   "who"   -> kartṛ (agent)      -> a person   (the doer is a being)
//   "what"  -> karman (patient)   -> a thing    (the done-to is a thing)
//   "where" -> adhikaraṇa (locus) -> a place
//   "when"  -> kāla                -> a time
//   "why"   -> hetu                -> a reason
//   "how"   -> karaṇa (instrument) -> a manner or a thing
//
// The mapping is DECLARED (like THRAX_MAP and KARAKA_MAP): a translation between the question's
// surface class and Panini's roles, falsifiable by a language or a question where the mapping fails.
// It is the DEFAULT for the gap's role, not the whole of it: a marker on the phrase ("to whom" -> sampradāna,
// "from whom" -> apādāna) overrides the class (wh-role.mjs, which the ask path uses); this table answers when no marker does.
// The narrowing is the DMD made explicit: every candidate cut is a difference-that-makes-a-difference,
// and the trace names which candidate fell to which constraint. Pure: no imports, no model, no clock.
export const WH_SCHEMA = "WhNarrow@1";

export const ADMITS_KARAKA = Object.freeze({
  person: "kartṛ",
  thing: "karman",
  place: "adhikaraṇa",
  time: "kāla",
  reason: "hetu",
  manner: "karaṇa",
  quantity: "karman",
});

/** the interrogative surface -> what it admits, the same closed class question-grammar.en.js reads
 *  (CGEL ch. 10). Used to find the WH-word row in a parsed question regardless of the deprel the
 *  parser gave it — WH-movement means a fronted "what" is often tagged nsubj when it is the patient. */
export const INTERROGATIVE_ADMITS = Object.freeze({
  who: "person", whom: "person", whose: "person", when: "time", where: "place",
  why: "reason", how: "manner", what: "thing", which: "thing",
});

export const KARAKA_KIND = Object.freeze({
  kartṛ: ["person"],
  karman: ["thing", "quantity"],
  karaṇa: ["manner", "thing"],
  sampradāna: ["person"],
  apādāna: ["place", "thing", "person"], // "from whom": a source can be a being (wh-role.mjs routes a marked "from whom" here)
  adhikaraṇa: ["place"],
  kāla: ["time"],
  hetu: ["reason"],
  prayojana: ["reason", "thing"],
});

/**
 * narrowAnswers({ admits, candidates }) -> { survivors, role, kinds, dmd, admitted }
 *  `admits` is readQuestion's answer (person/thing/place/time/reason/manner/quantity, or
 *  position/proposition/null for a non-WH gap). `candidates` is [{ ref, kind }] with kind one of the
 *  KARAKA_KIND values. A candidate survives iff its kind is one the gap's kāraka admits. The dmd
 *  trace records the gap, the role it maps to, and every candidate kept or cut with the reason.
 */
export function narrowAnswers({ admits, candidates = [] } = {}) {
  const dmd = [{ step: "gap", admits, total: candidates.length }];
  const role = ADMITS_KARAKA[admits];
  if (!role) return { survivors: candidates, role: null, kinds: null, admitted: admits, dmd: [...dmd, { step: "no-role", note: `"${admits}" is not a WH gap of a kāraka (position/proposition/polar)`, kept: candidates.length }] };
  const kinds = KARAKA_KIND[role];
  dmd.push({ step: "role", role, admits: kinds });
  const kept = [], cut = [];
  for (const c of candidates) (kinds.includes(c.kind) ? kept : cut).push(c);
  dmd.push({ step: "narrow", kept: kept.map((c) => c.ref), cut: cut.map((c) => ({ ref: c.ref, kind: c.kind, why: `${c.kind} is not a ${kinds.join(" or ")}` })) });
  return { survivors: kept, role, kinds, admitted: admits, dmd };
}

/** the kāraka role a question's gap asks for, and the kinds that role admits — the two declared steps
 *  of the bridge, exposed so a caller can name the deep role behind a WH-word. */
export function gapRole(admits) {
  const role = ADMITS_KARAKA[admits];
  return role ? { admits, role, kinds: KARAKA_KIND[role] } : { admits, role: null, kinds: null };
}
