// gap-fill.js — fill the question's gap from the read's kāraka DAG.
//
// The question declares the gap's role (who -> kartṛ, what -> karman, …) and the roles it already
// fills (the rest of the sentence's kārakas). The read holds the triples: each relation's slots
// filled by referents. The answer is the referent that sits in the gap's slot of the triple whose
// filled slots all agree — the 20-questions narrowing to the one surviving referent.
//
// Each filled role is one question, and each question is a difference-that-makes-a-difference: a
// triple that disagrees on a filled role is cut, and the trace names which triple fell to which
// role. A filled role a triple simply LACKS is a hole (not a vote) and cuts the triple too, but as a
// disclosed gap, never as a silent match. Pure: no imports, no model, no clock.
export const GAP_FILL_SCHEMA = "GapFill@1";

export function fillGap({ gap, filled = {}, triples = [] } = {}) {
  if (!gap) return { answer: null, role: null, reason: "no-gap", dmd: [{ step: "gap", note: "no gap role declared" }] };
  const dmd = [{ step: "gap", gap, questions: Object.keys(filled) }];
  const agrees = (got, want) => (Array.isArray(got) ? got.includes(want) : got === want);
  const rows = triples.map((t) => {
    const disagree = [], missing = [];
    for (const [role, val] of Object.entries(filled)) {
      if (t[role] === undefined) missing.push(role);
      else if (!agrees(t[role], val)) disagree.push({ role, got: t[role], want: val });
    }
    return { triple: t, ok: disagree.length === 0 && missing.length === 0, disagree, missing };
  });
  const survivors = rows.filter((r) => r.ok);
  dmd.push({ step: "match", total: rows.length, matched: survivors.length, cut: rows.filter((r) => !r.ok).map((r) => ({ disagree: r.disagree, missing: r.missing })) });
  if (survivors.length === 0) return { answer: null, role: gap, reason: "no-triple", dmd };
  if (survivors.length > 1) return { answer: null, role: gap, reason: "ambiguous", candidates: survivors.map((r) => r.triple[gap]), dmd };
  const t = survivors[0].triple;
  if (t[gap] === undefined) return { answer: null, role: gap, reason: "gap-absent", dmd, matched: t };
  return { answer: t[gap], role: gap, reason: null, matched: t, dmd };
}
