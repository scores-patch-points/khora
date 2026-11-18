// pronoun-chase.js — two pipelines chase each other until nothing changes (identity/novels PREREG-ROUND13-NOTE-1.md; the asset tracker session's design, applied to pronouns).
//
//   INCLUSION: a being is accepted as the referent of a pronoun only if at least K independent VOICES vouch for it and it leads the runner-up by at least one vote.
//     voices: SALIENCE (its presence clears the floor), ROLE (subject continuity), PERSON (positive personhood evidence), GENDER (its known gender equals the pronoun's), CONTINUITY (the later text mentions it: computed only for the contested).
//   EXCLUSION: a being is removed only for a NAMED cause, recorded: non_person, gender_mismatch, reflexive_non_subject; a mention that is a co-argument of a non-reflexive pronoun's clause stops counting (co_argument).
//   THE CHASE: over the whole document, accept every unique leader with >= K votes; what is accepted teaches the exclusion side (a clean bound he/she fixes the being's gender, which excludes it for the other gender everywhere, earlier and later);
//     what is excluded changes who leads; repeat until nothing changes. An earlier call a later one contradicts is RETRACTED (returned, never deleted).
//   CONTESTED: a tie at the top, or a leader below K votes with nothing else explaining the field: reported with the reason, given the refinement (CONTINUITY votes), and chased again.
// Pure: no file, no reader. Status: EXPERIMENTAL.
import { findThirdPersonSingular } from "./pronouns.js";
import { gammaFor } from "../../kernel/activation.js";

export const K_VOICES = 2; // one voice is the presence rung we already have; two independent ones is the structural minimum (declared, not tuned)
const REFLEXIVE = new Set(["himself", "herself"]);
const overlap = (a, b, c, d) => a < d && c < b;
// a mention is the SUBJECT/OBJECT of a clause only if it covers the argument's head (its last word): "Gloria's eczema" has the subject eczema, not Gloria (the possessor inside it)
const coversHead = (s, e, a0, a1) => overlap(s, e, a0, a1) && e >= a1 - 3;

export function resolvePronounsChase({ sentences, cast, clauses, dials, personhood = new Map(), k = K_VOICES }) {
  const { window, boost, floor } = dials; const gamma = gammaFor(window);
  const cl = (clauses ?? []).map((c, ci) => ({ ci, subj: c.subject ? [c.subject.start, c.subject.end] : null, obj: c.object ? [c.object.start, c.object.end] : null }));
  const roleAt = (s, e) => { for (const c of cl) { if (c.subj && coversHead(s, e, c.subj[0], c.subj[1])) return { role: "subj", ci: c.ci }; if (c.obj && coversHead(s, e, c.obj[0], c.obj[1])) return { role: "obj", ci: c.ci }; } return { role: null, ci: null }; };
  const N = sentences.length, off = sentences.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = N - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (off[m] <= p) { r = m; a = m + 1; } else b = m - 1; } return r; };
  const bySent = new Map(); for (const b of cast ?? []) for (const [s, e] of b.mentionSpans ?? []) { const t = sentOf(s); if (t < 0) continue; (bySent.get(t) ?? bySent.set(t, []).get(t)).push({ ref: b.ref, start: s, end: e, ...roleAt(s, e) }); } for (const l of bySent.values()) l.sort((a, b) => a.start - b.start);
  // the mention weights of each sentence (a subject weighs the boost; with no subject the first mention does)
  const wmap = []; const subjRefs = []; for (let t = 0; t < N; t++) { const here = bySent.get(t) ?? []; const hasSubj = here.some((m) => m.role === "subj"); const w = new Map(); here.forEach((m, i) => w.set(m.ref, (w.get(m.ref) ?? 0) + (m.role === "subj" || (!hasSubj && i === 0) ? boost : 1))); wmap.push(w); subjRefs.push(new Set(here.filter((m) => m.role === "subj").map((m) => m.ref))); }
  const presPrev = (ref, t) => { let a = 0; for (let s = Math.max(0, t - 3 * window); s < t; s++) a += (wmap[s].get(ref) ?? 0) * gamma ** (t - s); return a; };
  // the pronouns of the document
  const prons = []; for (let t = 0; t < N; t++) { const s = sentences[t]; for (const h of findThirdPersonSingular(s.text, "en")) { const pos = s.offset + h.index; prons.push({ pos, end: pos + h.token.length, token: h.token, gender: h.gender, clean: h.clean, refl: REFLEXIVE.has(h.token.toLowerCase()), t, ...roleAt(pos, pos + h.token.length) }); } }
  const accepted = new Map(); // pos -> { ref, votes, mechanism }
  const retracted = []; const exclusions = {}; const bump = (c) => { exclusions[c] = (exclusions[c] ?? 0) + 1; };
  const genderMap = () => { const tally = new Map(); for (const p of prons) { const a = accepted.get(p.pos); if (!a || !p.clean || (p.gender !== "m" && p.gender !== "f")) continue; const c = tally.get(a.ref) ?? { m: 0, f: 0 }; c[p.gender]++; tally.set(a.ref, c); } const g = new Map(); for (const [r, c] of tally) { if (c.m > c.f) g.set(r, "m"); else if (c.f > c.m) g.set(r, "f"); } return g; };
  const evaluate = (p, gender, withContinuity) => {
    const cands = new Map(); const note = (ref) => cands.get(ref) ?? cands.set(ref, { ref, salience: 0, excluded: null, voices: new Set() }).get(ref);
    const lo = Math.max(0, p.t - 3 * window); for (let s = lo; s <= p.t; s++) for (const r of wmap[s].keys()) note(r);
    const here = bySent.get(p.t) ?? [];
    for (const c of cands.values()) {
      const ph = personhood.get(c.ref); if (ph?.nonPerson) { c.excluded = "non_person"; continue; }
      if (p.clean && gender.get(c.ref) && gender.get(c.ref) !== p.gender) { c.excluded = "gender_mismatch"; continue; }
      let a = presPrev(c.ref, p.t);
      for (const m of here) { if (m.ref !== c.ref) continue; const coArg = p.ci != null && m.ci === p.ci && m.role != null; if (p.refl) { if (coArg && m.role === "subj") a += boost; } else if (!coArg) a += (m.role === "subj" ? boost : 1); }
      if (p.refl && !here.some((m) => m.ref === c.ref && p.ci != null && m.ci === p.ci && m.role === "subj")) { c.excluded = "reflexive_non_subject"; continue; }
      c.salience = a; if (a >= floor) c.voices.add("salience");
      if (p.role === "subj" && (subjRefs[p.t].has(c.ref) || (p.t > 0 && subjRefs[p.t - 1].has(c.ref)))) c.voices.add("role");
      if (ph && ph.n >= 2 && ph.score > 0) c.voices.add("person");
      if (p.clean && gender.get(c.ref) === p.gender) c.voices.add("gender");
      if (withContinuity) { let seen = false; for (let s = p.t; s <= Math.min(N - 1, p.t + window) && !seen; s++) for (const m of bySent.get(s) ?? []) if (m.ref === c.ref && (s > p.t || m.start > p.pos)) { seen = true; break; } if (seen) c.voices.add("continuity"); }
    }
    const live = [...cands.values()].filter((c) => !c.excluded && c.salience > 0 || (!c.excluded && c.voices.size)); for (const c of cands.values()) if (c.excluded) bump(c.excluded);
    live.sort((x, y) => y.voices.size - x.voices.size || y.salience - x.salience || (x.ref < y.ref ? -1 : 1));
    const top = live[0], second = live[1]; if (!top) return { why: "no_candidate" };
    if (top.voices.size < k) return { why: "below_k", top };
    if (second && second.voices.size === top.voices.size) return { why: "tie", top, second };
    return { chosen: top.ref, votes: top.voices.size, voices: [...top.voices] };
  };
  const chase = (withContinuity, only) => {
    for (let round = 0; round < 10; round++) {
      let changed = false; const gender = genderMap();
      // backwards flow: an accepted call that the learned gender now contradicts is overturned
      for (const p of prons) { const a = accepted.get(p.pos); if (a && p.clean && gender.get(a.ref) && gender.get(a.ref) !== p.gender) { accepted.delete(p.pos); retracted.push({ pos: p.pos, pronoun: p.token, ref: a.ref, sentence: p.t, retractedBecause: `gender_mismatch: the being's bound pronouns are mostly ${gender.get(a.ref) === "m" ? "masculine" : "feminine"}` }); changed = true; } }
      const g2 = genderMap();
      for (const p of prons) { if (accepted.has(p.pos) || (only && !only.has(p.pos))) continue; const r = evaluate(p, g2, withContinuity); if (r.chosen) { accepted.set(p.pos, { ref: r.chosen, votes: r.votes, voices: r.voices, mechanism: withContinuity ? "refined" : "chase" }); changed = true; } }
      if (!changed) break;
    }
  };
  chase(false);
  const contested0 = new Set(prons.filter((p) => !accepted.has(p.pos)).map((p) => p.pos)); const g = genderMap();
  const reasons = new Map(prons.filter((p) => contested0.has(p.pos)).map((p) => [p.pos, evaluate(p, g, false).why]));
  chase(true, contested0);
  const bindings = prons.filter((p) => accepted.has(p.pos)).map((p) => { const a = accepted.get(p.pos); return { pos: p.pos, end: p.end, pronoun: p.token, gender: p.gender, sentence: p.t, ref: a.ref, mechanism: a.mechanism, votes: a.votes, voices: a.voices }; });
  const contested = prons.filter((p) => !accepted.has(p.pos)).map((p) => ({ pos: p.pos, pronoun: p.token, sentence: p.t, reason: reasons.get(p.pos) ?? "not_contested_before" }));
  return { bindings, contested, retracted, exclusions, contestedShare: prons.length ? contested.length / prons.length : 0, pronouns: prons.length };
}
