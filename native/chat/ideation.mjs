// native/chat/ideation.mjs — IDEATION AS A LINTED PROCESS, written to the shared log by whoever did each step.
// Before a reply says anything, the things it could say are PUT FORWARD as candidates, each one is TESTED by an instrument, and
// what stands is read back off the log, not off memory. Three writers take part, each writing its own entries (the ruling of
// 2026-11-14: no repo reports to another):
//   khora-chat   a `candidate` entry for every thing put forward (a spiral `propose` event: who it is for, its relation, its ground)
//   janus        an `assessment` entry for what its organs tested (kinship: a person is not their own wife), through janus's own door
//   khora-chat   an `assessment` for what khora's organs computed (the epistemic reasoner, the binding evidence)
// The standing of every candidate is then PROJECTED by janus's reasoning spiral from those entries (reasoning-spiral.js, run over
// the log): a candidate with no ground is `unlicensed`, a deduction with no named license is refused and stays on the record, a
// claim whose premise is refuted is `suspended`, a giver's word is `licensed` and never `supported`. The chat shows that, and
// says nothing about a candidate that the log does not stand behind.
import { weaveOne, readKinds } from "./record.mjs";

const orderOf = (a) => a;   // the log's own order (causal: each entry saw the ones before it)

export function makeIdeation({ threadId, h, janus }) {
  let n = 0;
  const entryOf = new Map(), labelOf = new Map(), doorOf = new Map();
  const canJudge = !!janus?.on;

  /** put a candidate forward: { label, relation:{subject,verb,object}, door: presented|given|induced, witnesses?, giver?, premises? } -> id */
  function propose({ label, relation, door, witnesses = [], giver = null, premises = [], forWhom = "asker" }) {
    const id = `${threadId}/c${++n}`;
    const event = { kind: "propose", id, forWhom, relation, ...(witnesses.length ? { witnesses } : {}), ...(giver ? { giver } : {}), ...(premises.length ? { premises } : {}) };
    const e = weaveOne(h, { cell: "SEG·Pattern", kind: "candidate", addr: `candidate:${id}`, body: { thread: threadId, door, label, event } });
    entryOf.set(id, e.id); labelOf.set(id, label); doorOf.set(id, door);
    return id;
  }

  /** record an instrument's verdict on a candidate, written by the instrument's OWNER: owner "janus" goes through janus's own door */
  function assess(id, v, { owner = "chat" } = {}) {
    const event = { kind: "assess", id, verdict: v.verdict, method: v.method, by: v.by, basis: v.basis, ...(v.license ? { license: v.license } : {}), ...(v.witnesses?.length ? { witnesses: v.witnesses } : {}) };
    const entry = { cell: "EVA·Figure", kind: "assessment", addr: `assessment:${id}:${++n}`, body: { thread: threadId, event, ...(v.detail ? { detail: v.detail } : {}) }, of: [entryOf.get(id)].filter(Boolean) };
    if (owner === "janus") { if (!canJudge) return null; return janus.door.weave(entry); }
    return weaveOne(h, entry);
  }

  /** take a candidate back (a later message corrects it): the spiral suspends everything that rests on it, and the log keeps both the claim and the withdrawal */
  function withdraw(id, basis) {
    if (!entryOf.has(id)) return null;
    return weaveOne(h, { cell: "EVA·Figure", kind: "assessment", addr: `assessment:${id}:${++n}`, body: { thread: threadId, event: { kind: "withdraw", id, basis } }, of: [entryOf.get(id)] });
  }

  /** the standing of the candidates in `ids`, projected by janus's spiral from what the LOG holds (every writer's entries) */
  function view(ids = null) {
    if (!canJudge) return { on: false, why: janus?.why ?? "janus is not mounted", claims: [], refused: [], openings: [] };
    const rows = (janus.door.ask(["candidate", "assessment"]) ?? readKinds(h, ["candidate", "assessment"])).filter((e) => e.body?.thread === threadId && e.body?.event);
    let log = []; const writerOf = new Map(), assessedBy = new Map();
    for (const e of orderOf(rows)) {
      log = janus.spiral.appendReasoning(log, e.body.event);
      if (e.body.event.kind === "propose") writerOf.set(e.body.event.id, e.by);
      else assessedBy.set(e.body.event.id, { writer: e.by, at: log.length - 1 });
    }
    const fold = janus.spiral.reasoningAt(log), want = ids ? new Set(ids) : null;
    const claims = fold.claims.filter((c) => !want || want.has(c.id)).map((c) => ({
      id: c.id, label: labelOf.get(c.id) ?? `${c.relation.subject} ${c.relation.verb} ${c.relation.object}`, door: doorOf.get(c.id) ?? null, relation: c.relation,
      standing: c.standing, because: c.because, premises: c.premises, proposedBy: writerOf.get(c.id) ?? null,
      assessed: c.assessment ? { verdict: c.assessment.verdict, method: c.assessment.method, by: c.assessment.by, basis: c.assessment.basis, license: c.assessment.license, writer: assessedBy.get(c.id)?.writer ?? null } : null,
    }));
    const mine = new Set(claims.map((c) => c.id));
    return { on: true, claims, refused: fold.refused.filter((r) => !want || mine.has(r.id)), openings: fold.openings.filter((o) => mine.has(o.id)), entries: rows.length };
  }

  return { propose, assess, withdraw, view, canJudge };
}
