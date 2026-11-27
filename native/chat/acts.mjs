// native/chat/acts.mjs — WHAT THE CHAT THINKS A MESSAGE IS: claims that can be wrong, each resting on marks, none decided silently.
//
// The owner, 2026-11-23: "this all speaks to how we can't just have this emerging as the middle tier of structure. The thing has to be defining what it thinks is
// going on. And those assertions are revisable." Until now the router decided in passing (a word table, the question mark, "has it got a verb") and then replied
// as if certain: "Sorry dear", "Yes." and a Chinese sentence all got "Okay.". Here the decision is a set of CLAIMS about the message, each one
//   - rests on named MARKS the reader or the surface gave (a final question mark, an auxiliary before the subject, an imperative form, no predicate at all),
//   - may be OPPOSED by a mark (a statement with a question mark is not simply a statement),
//   - is judged by one declared rule, and where two acts both hold the message is AMBIGUOUS and says so: it is routed to the act that does the least harm if wrong,
//     and the claims stay open, to be revised by the next turn.
// The thread puts each claim forward as a candidate (ideation.mjs), so janus's spiral projects its standing, the page shows it ("How I thought"), and a later
// message can withdraw it ("no, I meant ..."): whatever was built on it (answers, stored facts) is suspended with it.
//
// PURE. No fetch, no fs. It reads rows' universal marks (upos, deprel, feats); the few facts that are only English (which words are interrogative, the small-talk
// table) are handed in by the caller as booleans, as the reader's declared parameters, never read here.

/** the acts a message can be, with the plain words the page uses for them: authored chrome, one table per language (rule 4), keyed by the act */
export const LABEL = Object.freeze({
  eng: Object.freeze({ question: "a question", statement: "something you're telling me", request: "a request", social: "a social remark", calculation: "arithmetic", puzzle: "a puzzle", door: "a command", fragment: "something I can't place", composite: "something you're telling me, then a question", unread: "something I couldn't read" }),
});

/** the plain words for a mark, as the page shows them (authored chrome, keyed by the mark) */
export const MARK_TEXT = Object.freeze({ eng: Object.freeze({
  final_question_mark: "a final question mark", wh_word: "a question word", aux_first: "an auxiliary before the subject", imperative_form: "the form of a command", no_predicate: "no predicate at all", interjection_led: "an opening interjection and nothing else",
  subject_predicate: "a subject with a predicate", small_talk: "a known greeting or thanks", arithmetic: "numbers and an operator", puzzle_scene: "a list of things and people taking turns",
  slash_command: "a slash", statements_then_question: "statements followed by a question", leading_address: "a name and a comma at the start", correction_mark: "an opening “no”",
}) });

/** a SPECIFIC act that holds is the working reading outright (a calculation is a kind of question, a command is a kind of request): checked in this order */
export const SPECIFIC = Object.freeze(["door", "puzzle", "calculation", "composite"]);
/** among acts that all hold, the one to route to: the one that changes the thread least if the chat is wrong. A social remark stores nothing and looks nothing up; a question may
 *  look something up but stores nothing; a request is refused or read as a question about the world; a statement is stored as a fact. Declared, with this reason. */
export const LEAST_HARM = Object.freeze(["social", "fragment", "question", "request", "statement"]);

const feats = (r) => String(r?.feats ?? "").split("|");

/** the marks of a message: name -> true. ctx carries the booleans only an English reader can supply (wh, small, calc, puzzle, slash, composite, request, address). */
export function marksOf(rows, ctx = {}) {
  const real = rows.filter((r) => r.upos !== "PUNCT"), m = {};
  const firstReal = real[0], lastIdx = rows.length - 1 - [...rows].reverse().findIndex((r) => r.upos !== "PUNCT");
  m.final_question_mark = rows.slice(lastIdx + 1).some((r) => r.form === "?");
  m.wh_word = !!ctx.wh;
  m.aux_first = firstReal?.upos === "AUX" && real.some((r) => r.deprel?.startsWith("nsubj") && r.id > firstReal.id);
  m.imperative_form = !!ctx.request;
  const predicate = real.some((r) => r.upos === "VERB" || r.upos === "AUX" || r.deprel === "cop");
  m.no_predicate = real.length > 0 && !predicate;
  // POSITIVE evidence of a social remark: the message opens with an interjection (the reader's own tag) and has no predicate. A bare fragment is not social by having nothing else in it:
  // of 618 messages declared social from "no predicate" alone, 10% were interjection-only; the rest were names, bot output, commands, answers to someone, questions (eval/chat-register, EXPLORATORY).
  m.interjection_led = real.length > 0 && !predicate && firstReal.upos === "INTJ";
  m.subject_predicate = real.some((r) => r.deprel?.startsWith("nsubj")) && predicate;
  m.small_talk = !!ctx.small;
  m.arithmetic = !!ctx.calc;
  m.puzzle_scene = !!ctx.puzzle;
  m.slash_command = !!ctx.slash;
  m.statements_then_question = !!ctx.composite;
  m.leading_address = !!ctx.address;
  // a correction: the message opens with an interjection the reader marks as negative polarity ("no, ...")
  m.correction_mark = !!firstReal && firstReal.upos === "INTJ" && feats(firstReal).includes("Polarity=Neg");
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v));
}

const RULES = Object.freeze({
  door:        { for: ["slash_command"], against: [] },
  puzzle:      { for: ["puzzle_scene"], against: [] },
  calculation: { for: ["arithmetic"], against: [] },
  composite:   { for: ["statements_then_question"], against: [] },
  question:    { for: ["final_question_mark", "wh_word", "aux_first"], against: [] },
  request:     { for: ["imperative_form"], against: ["final_question_mark"] },
  statement:   { for: ["subject_predicate"], against: ["final_question_mark", "imperative_form", "wh_word"] },
  social:      { for: ["interjection_led", "small_talk"], against: ["wh_word"] },
  fragment:    { for: ["no_predicate"], against: ["interjection_led", "small_talk", "wh_word"] },
});

/** candidates(marks): every act some mark supports, with what supports it and what opposes it. An act no mark supports is not proposed (nothing to say about it). */
export function candidates(marks) {
  const out = [];
  for (const [act, r] of Object.entries(RULES)) {
    const f = r.for.filter((k) => marks[k]); if (!f.length) continue;
    const against = r.against.filter((k) => marks[k]);
    // a known greeting or thanks outranks a lone question mark ("Thank you ????" is thanks, not a question about thanks): the mark opposes the question only when nothing else backs it
    if (act === "question" && marks.small_talk && f.length === 1 && f[0] === "final_question_mark") against.push("small_talk");
    out.push({ act, for: f, against });
  }
  return out;
}

/**
 * judge(cands) -> { working, open, claims, alternatives }. THE RULE (declared, one place):
 *   an act HOLDS when a mark supports it and none opposes it; it is REFUTED when a mark opposes it;
 *   a specific act that holds is the working reading and nothing else is proposed beside it;
 *   one act that holds is the working reading; two or more that hold leave the message AMBIGUOUS: every one stays open, and the working reading is the one that
 *   does the least harm if wrong (LEAST_HARM); none that holds leaves the message unread, a typed gap, never a guess.
 */
export function judge(cands) {
  const spec = SPECIFIC.map((a) => cands.find((c) => c.act === a && !c.against.length)).find(Boolean);
  if (spec) return { working: spec.act, open: false, alternatives: [], claims: [{ ...spec, standing: "holds" }] };
  const holds = cands.filter((c) => !c.against.length && !SPECIFIC.includes(c.act));
  const claims = cands.filter((c) => !SPECIFIC.includes(c.act)).map((c) => ({ ...c, standing: c.against.length ? "refuted" : holds.length > 1 ? "open" : "holds" }));
  if (!holds.length) return { working: "unread", open: false, alternatives: [], claims };
  // a question that rests on the final "?" alone is fragile on purpose: measured on 600 real messages per source, the working act survives losing the mark only 61% of the time when "?" is
  // its only support, against 95-98% when a question word, an auxiliary before the subject, or the shape of the clause also backs it (eval/chat-register, declarations.mjs, EXPLORATORY)
  if (holds.length === 1) { const only = holds[0], fragile = only.act === "question" && only.for.length === 1 && only.for[0] === "final_question_mark"; return { working: only.act, open: false, fragile, alternatives: [], claims }; }
  const working = LEAST_HARM.find((a) => holds.some((c) => c.act === a));
  return { working, open: true, alternatives: holds.map((c) => c.act).filter((a) => a !== working), claims };
}

/** the plain sentence the page shows when the chat is not sure what it was told: what it took the message as, and how to correct it */
export const takenAs = (j, lang = "eng") => (j.open ? `I took that as ${LABEL[lang][j.working]}; it could also be ${j.alternatives.map((a) => LABEL[lang][a]).join(" or ")}. Say “no” if I got it wrong.` : j.fragile ? `I took that as a question because of the question mark. Say “no” if you meant it as something you're telling me.` : null);
