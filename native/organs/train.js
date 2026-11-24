// train.js — THE TRAIN OF THOUGHT, AS A LOOP THE PARTS ARE HUNG ON.
// The owner's design principle (THE-MAN-IN-THE-BOX.md): ask how a man in a box with a notebook and a shelf would answer. What a person's train of thought does,
// in the places where it is well understood: a cue arrives; what you did last turn is settled by how the other person took it; you work out what they are
// doing; you look in your notebook; if you do not find it you KNOW you do not know it, and that feeling is what sends you to the shelf; you read what the
// shelf says and check it against what you already have before you say it; you say it in words that suit the person; and every step leaves a mark in the
// environment (the notebook, the trails) for the next time. Nothing in this file knows a language, a source or a corpus: it is the order of the steps and
// the marks they leave. The parts are handed in.
//
//   const T = makeTrain({ readAct, voidOf, notebook, hunt, check, library, trails, now })
//   const out = await T.turn(thread, message, { seed })    ->  { reply, kind, steps, cite?, gap? }
//
//   readAct(message)   -> { kind: "social", intent } | { kind: "question", rows } | { kind: "statement" }       what the person is doing (the chat's act layer)
//   voidOf(rows)       -> the void the question declares (organs/void-hunt.js voidOfQuestion)
//   notebook(void)     -> { answer, evidence } | null                                                             what the thread already holds
//   hunt(void)         -> the hunt's result (organs/void-hunt.js huntVoid, with its trails)                        the shelf
//   check(hunt)        -> { ok, why }                                                                              look before you say it (janus, the other documents)
//   library            the expression library (organs/expression-library.js)                                      the wording, by trail and seed
//   trails             the trail store: an alarm is raised here when the check fails
// PURE apart from what is handed in.
import { outcomeOf, lookOf } from "./expression-library.js";

export function makeTrain({ readAct, voidOf, notebook, hunt, check = () => ({ ok: true }), library, trails = null, now = () => Date.now(), genre = null } = {}) {
  const last = new Map();   // per thread: the wording I last used, which the person's next message settles

  async function turn(thread, message, { seed = 0 } = {}) {
    const steps = [];
    // 0. WHAT THEY DID NEXT settles how my last words landed: a trail is left for that wording, in this thread and for everyone
    const prev = last.get(thread);
    if (prev) { const ok = outcomeOf(prev.said, message); library?.outcome(prev.intent, prev.key, ok, { genre: prev.genre, thread }); steps.push({ step: "settled", wording: prev.key, landed: ok }); last.delete(thread); }
    // 1. WHAT THEY ARE DOING
    const act = readAct(message); steps.push({ step: "act", kind: act.kind });
    if (act.kind === "social") {
      const r = await library.say(act.intent, { seed, thread, genre, look: lookOf(message) });
      if (r.gap) return { kind: "social", reply: null, gap: r.gap, steps: [...steps, { step: "wording", gap: r.gap }] };
      last.set(thread, { intent: act.intent, key: r.key, text: r.text, said: message, genre });
      return { kind: "social", reply: r.text, steps: [...steps, { step: "wording", key: r.key, how: r.how, pool: (r.pool ?? []).slice(0, 8) }] };
    }
    if (act.kind !== "question") return { kind: act.kind, reply: null, steps };
    // 2. THE NOTEBOOK FIRST
    const v = voidOf(act.rows); steps.push({ step: "void", ok: v.ok, admits: v.admits, relation: v.relation?.lemma ?? null });
    if (!v.ok) return { kind: "question", reply: null, gap: v.gap, steps };
    const known = await notebook(v);
    if (known) return { kind: "question", reply: known.answer, cite: known.evidence?.[0] ?? null, steps: [...steps, { step: "notebook", found: true }] };
    // 3. NOT FINDING IT IS A FEELING OF NOT KNOWING, AND THAT IS WHAT SENDS THE MAN TO THE SHELF
    const h = await hunt(v); steps.push({ step: "shelf", via: h.via ?? null, unique: h.unique, gap: h.gap?.kind ?? null, head: h.head ?? null });
    if (!h.unique) return { kind: "question", reply: null, gap: h.gap, candidates: h.candidates, steps };
    // 4. LOOK BEFORE SAYING IT; IF IT FAILS THE ROUTE THAT GAVE IT IS FORGOTTEN, NOT ONLY THIS ANSWER
    const verdict = await check(h); steps.push({ step: "check", ok: verdict.ok, why: verdict.why ?? null });
    if (!verdict.ok) { for (const route of h.routes ?? []) trails?.veto(h.head, route, verdict.why ?? "the check did not hold"); return { kind: "question", reply: null, gap: { kind: "check_failed", detail: verdict.why ?? "" }, steps }; }
    // 5. SAY IT, AND SAY WHERE IT CAME FROM
    return { kind: "question", reply: h.answer.answerText ?? h.answer.answer, cite: h.answer.evidence[0], steps };
  }
  return { turn };
}
