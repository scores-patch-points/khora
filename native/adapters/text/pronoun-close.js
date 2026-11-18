// pronoun-close.js — resolve the he/she pronouns in the cube's dependency order (identity/novels PREREG-ROUND13.md).
//
// The presence rung (./pronouns.js::resolvePronounsByPresence) walks the text left to right and binds each pronoun at the moment it is met, before the sentence is parsed. This resolver takes the sentence's CLAUSES first (SEG·Figure),
// then resolves the sentence's pronouns at SENTENCE CLOSE (CON·Figure), so it can use what the finished sentence shows:
//   S1 PERSONHOOD (DEF·Figure -> NUL·Figure): a being whose predicates say non-person (./person-prior.js) is vetoed as the referent of he/she.
//   S2 CLOSE: candidates are the presence state of the earlier sentences plus the mentions of THIS sentence (the ones after the pronoun too: "Before he left, Tom locked the door"); a mention that is a co-argument of a non-reflexive pronoun
//      in the same clause is excluded (binding theory: disjoint reference), a reflexive (himself, herself) binds only to the clause subject; a subject mention weighs the boost dial, another mention 1.
//   S3 LATE (REC·Figure): a pronoun that cleared no floor or margin is PENDING; over the next `window` sentences the continuing text adds its support, and the pronoun is bound if a candidate then clears the same floor and margin ("we realize
//      who he is half way through the paragraph"), recorded with `realizedAt`.
//   S4 REPAIR (EVA -> REC): a being bound to both a masculine and a feminine pronoun keeps the gender its bindings mostly carry; the minority bindings are RETRACTED (never deleted: returned in `retracted` with the reason).
// Pure: no file, no reader. Status: EXPERIMENTAL; the numbers are in identity/novels (rounds 13+).
import { findThirdPersonSingular, sameClause } from "./pronouns.js";
import { gammaFor } from "../../kernel/activation.js";
import { personEvidence, isNonPerson } from "./person-prior.js";

const REFLEXIVE = new Set(["himself", "herself"]);
const overlap = (a, b, c, d) => a < d && c < b;
// a mention is the SUBJECT/OBJECT of a clause only if it covers the argument's head (its last word): "Gloria's eczema" has the subject eczema, not Gloria (the possessor inside it)
const coversHead = (s, e, a0, a1) => overlap(s, e, a0, a1) && e >= a1 - 3;

/** Per cast being: the evidence of what it is, from the predicates it is the subject or object of in this read's own clause parse. */
export function personhoodOf({ cast, clauses, prior }) {
  const spans = (clauses ?? []).map((c, ci) => ({ ci, subj: c.subject ? [c.subject.start, c.subject.end] : null, obj: c.object ? [c.object.start, c.object.end] : null, lemma: c.predicate?.lemma ? String(c.predicate.lemma).toLowerCase() : null })).filter((c) => c.lemma);
  const out = new Map();
  for (const b of cast ?? []) { const args = []; for (const [s, e] of b.mentionSpans ?? []) for (const c of spans) { if (c.subj && coversHead(s, e, c.subj[0], c.subj[1])) args.push({ role: "subj", lemma: c.lemma }); else if (c.obj && coversHead(s, e, c.obj[0], c.obj[1])) args.push({ role: "obj", lemma: c.lemma }); } const ev = personEvidence(prior, args); out.set(b.ref, { ...ev, nonPerson: isNonPerson(ev) }); }
  return out;
}

/** resolvePronounsClose({ sentences, cast, clauses, dials, vetoed, stages }) -> { bindings, pending, retracted, unbound } */
export function resolvePronounsClose({ sentences, cast, clauses, dials, vetoed = new Set(), stages = { close: true, late: true, repair: true } }) {
  const { window, boost, feed, floor, margin } = dials; const gamma = gammaFor(window);
  const cl = (clauses ?? []).map((c, ci) => ({ ci, sent: c.sentence, subj: c.subject ? [c.subject.start, c.subject.end] : null, obj: c.object ? [c.object.start, c.object.end] : null }));
  const roleAt = (s, e) => { for (const c of cl) { if (c.subj && coversHead(s, e, c.subj[0], c.subj[1])) return { role: "subj", ci: c.ci }; if (c.obj && coversHead(s, e, c.obj[0], c.obj[1])) return { role: "obj", ci: c.ci }; } return { role: null, ci: null }; };
  const N = sentences.length, off = sentences.map((s) => s.offset); const sentOf = (p) => { let a = 0, b = N - 1, r = -1; while (a <= b) { const m = (a + b) >> 1; if (off[m] <= p) { r = m; a = m + 1; } else b = m - 1; } return r; };
  const bySent = new Map(); for (const b of cast ?? []) for (const [s, e] of b.mentionSpans ?? []) { const t = sentOf(s); if (t < 0) continue; (bySent.get(t) ?? bySent.set(t, []).get(t)).push({ ref: b.ref, start: s, end: e, ...roleAt(s, e) }); } for (const l of bySent.values()) l.sort((a, b) => a.start - b.start);
  const state = new Map(); const pres = (r, t) => { const c = state.get(r); return c ? c.v * gamma ** (t - c.t) : 0; }; const fire = (r, t, w, pos) => state.set(r, { v: pres(r, t) + w, t, pos });
  const evidence = new Map(); const genderOf = (r) => { const e = evidence.get(r); if (!e) return "unknown"; if (e.m > 0 && e.f === 0) return "m"; if (e.f > 0 && e.m === 0) return "f"; return "unknown"; };
  const bindings = [], pending = [], unbound = [];
  const rank = (cands) => cands.sort((x, y) => y.a - x.a || y.pos - x.pos || (x.ref < y.ref ? -1 : 1));
  const decide = (cands) => { if (!cands.length) return { why: "no_candidate" }; const top = cands[0].a, second = cands[1]?.a ?? 0; if (top < floor) return { why: "below_floor", top }; const m = (top - second) / top; if (m < margin) return { why: "no_margin", top, m }; return { chosen: cands[0].ref, top, m }; };
  for (let t = 0; t < N; t++) {
    const sent = sentences[t]; const here = bySent.get(t) ?? [];
    const hasSubj = here.some((m) => m.role === "subj"); const weightOf = (m, k) => (m.role === "subj" || (!hasSubj && k === 0) ? boost : 1);
    const hits = findThirdPersonSingular(sent.text, "en").map((h) => ({ ...h, pos: sent.offset + h.index, ...roleAt(sent.offset + h.index, sent.offset + h.index + h.token.length) }));
    const fedHere = new Map();
    for (const hit of hits) {
      const refl = REFLEXIVE.has(hit.token.toLowerCase()); const agg = new Map();
      const add = (ref, a, pos) => { if (vetoed.has(ref)) return; if (hit.clean && !(genderOf(ref) === "unknown" || genderOf(ref) === hit.gender)) return; const c = agg.get(ref); if (c) { c.a += a; c.pos = Math.max(c.pos, pos); } else agg.set(ref, { ref, a, pos }); };
      for (const [ref, c] of state) { const a = pres(ref, t); if (a > 0) add(ref, a, c.pos); }
      here.forEach((m, k) => {
        if (stages.close) { // the sentence's own mentions, with the clause's constraints
          const coArg = hit.ci != null && m.ci === hit.ci && m.role != null;
          if (refl) { if (!(coArg && m.role === "subj")) return; } else if (coArg) return;
          add(m.ref, weightOf(m, k), m.start);
        } else if (m.start < hit.pos) add(m.ref, weightOf(m, k), m.start); // S0-like: only what came before
      });
      for (const [ref, w] of fedHere) add(ref, w, hit.pos - 1);
      const cands = rank([...agg.values()]); const d = decide(cands);
      if (d.chosen) { bindings.push({ pos: hit.pos, end: hit.pos + hit.token.length, pronoun: hit.token, gender: hit.gender, sentence: t, ref: d.chosen, mechanism: "close", activation: d.top, margin: d.m }); if (feed) fedHere.set(d.chosen, (fedHere.get(d.chosen) ?? 0) + 1); }
      else if (stages.late && cands.length >= 0) pending.push({ pos: hit.pos, end: hit.pos + hit.token.length, pronoun: hit.token, gender: hit.gender, clean: hit.clean, sentence: t, base: new Map(cands.map((c) => [c.ref, c.a])), look: new Map(), why: d.why });
      else unbound.push({ pos: hit.pos, pronoun: hit.token, sentence: t, why: d.why });
    }
    for (const [i, m] of here.entries()) fire(m.ref, t, weightOf(m, i), m.start); for (const [ref, w] of fedHere) fire(ref, t, w, sent.offset + sent.text.length);
    // gender evidence (the rung's own rule), informing later sentences only
    const nm = new Set(here.map((m) => m.ref)); if (nm.size === 1 && hits.length) { const [only] = nm; const rels = here.filter((m) => m.ref === only).map((m) => m.start - sent.offset); const ev = evidence.get(only) ?? { m: 0, f: 0 }; for (const h of hits) if (rels.some((r) => sameClause(sent.text, r, h.index))) ev[h.gender]++; evidence.set(only, ev); }
    // S3: the continuing text supports the pending pronouns of the last `window` sentences
    if (stages.late) for (const p of pending) { if (p.done || t <= p.sentence || t - p.sentence > window) continue; const d = t - p.sentence; here.forEach((m, k) => { if (vetoed.has(m.ref)) return; if (p.clean && !(genderOf(m.ref) === "unknown" || genderOf(m.ref) === p.gender)) return; p.look.set(m.ref, (p.look.get(m.ref) ?? 0) + weightOf(m, k) * gamma ** d); }); if (t - p.sentence === window) p.ready = true; }
  }
  const lateBound = [];
  for (const p of pending) { const agg = new Map(p.base); for (const [r, a] of p.look) agg.set(r, (agg.get(r) ?? 0) + a); const cands = rank([...agg].map(([ref, a]) => ({ ref, a, pos: 0 }))); const d = decide(cands); if (d.chosen) { const b = { pos: p.pos, end: p.end, pronoun: p.pronoun, gender: p.gender, sentence: p.sentence, ref: d.chosen, mechanism: "late", activation: d.top, margin: d.m, realizedAt: Math.min(N - 1, p.sentence + window) }; bindings.push(b); lateBound.push(b); } else unbound.push({ pos: p.pos, pronoun: p.pronoun, sentence: p.sentence, why: p.why + "+late:" + d.why }); }
  bindings.sort((a, b) => a.pos - b.pos);
  // S4: gender repair
  const retracted = [];
  if (stages.repair) {
    const tally = new Map(); for (const b of bindings) { const g = b.gender; if (g !== "m" && g !== "f") continue; const c = tally.get(b.ref) ?? { m: 0, f: 0 }; c[g]++; tally.set(b.ref, c); }
    for (const [ref, c] of tally) { if (c.m > 0 && c.f > 0 && c.m !== c.f) { const keep = c.m > c.f ? "m" : "f"; for (let i = bindings.length - 1; i >= 0; i--) if (bindings[i].ref === ref && bindings[i].gender !== keep && (bindings[i].gender === "m" || bindings[i].gender === "f")) retracted.push({ ...bindings.splice(i, 1)[0], retractedBecause: `the being's bindings are mostly ${keep === "m" ? "masculine" : "feminine"} (${c.m} m / ${c.f} f)` }); } }
  }
  return { bindings, pending: pending.filter((p) => !lateBound.some((b) => b.pos === p.pos)).map((p) => ({ pos: p.pos, pronoun: p.pronoun, sentence: p.sentence, why: p.why })), retracted, unbound };
}
