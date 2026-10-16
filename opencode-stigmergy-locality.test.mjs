// opencode-stigmergy-locality.test.mjs — stigmergy as LOCALITY, not coordination: can work proceed from a
// bounded local view plus the traces the work left, without the whole in mind? (termites, Shakespeare's
// acts, iterative coding.) The trace here is the surf ladder: old turns reduced to addresses and top terms,
// full text one drill-down away. The claim under test: *what the next step needs is perceivable from the trace.*
// Arms: ORACLE (full history), TRACE (surf note), NULL (newest-k only). A "find" = the needed turn's address
// or its sentence is in the view. Red = the trace failed to surface what the next step needed.
import test from "node:test";
import assert from "node:assert/strict";
import { surf } from "./opencode-surf.mjs";

const TOPICS = ["parser lexer", "deploy staging", "database migration", "css layout", "auth token", "billing invoice", "search index", "email queue"];
const FILLER = (i) => ({ n: i, ask: `please work on the ${TOPICS[i % 8]} item ${i}`, answer: `Done with ${TOPICS[i % 8]} in file${i}. Tests pass.`, grounds: [i % 3 ? "edit" : "bash"] });
const history = (len, plant) => Array.from({ length: len }, (_, i) => plant[i + 1] ? { ...FILLER(i + 1), ...plant[i + 1] } : FILLER(i + 1));

const cites = (note, n) => new RegExp(`(?:turns? |,)${n}(?:[,\\s]|$)|turn ${n}:|\\b${n}–|–${n}\\b`).test(note);
const quotes = (note, s) => note.includes(s);
const arms = (turns, ask, needed) => {
  const note = surf({ ask, turns }).note;
  const nullView = turns.slice(-2).map((t) => `${t.ask} ${t.answer}`).join(" ");
  return {
    trace: { addr: cites(note, needed), text: false, note },
    null: { addr: false, text: false },
    oracle: { addr: true, text: true },
    quotes: (s) => quotes(note, s) || quotes(nullView, s),
    note,
  };
};

// ── L1: a direct cue. The ask names what it needs. (The termite smelling the pellet it is about to extend.) ──
test("L1 direct cue: a planted decision 80 turns back is surfaced when the ask names it", () => {
  const turns = history(100, { 20: { ask: "decide the retry policy for the webhook sender", answer: "Webhook retries use exponential backoff capped at five attempts. Tests pass." } });
  const a = arms(turns, "tune the webhook retry backoff", 20);
  assert.ok(a.trace.addr || a.quotes("exponential backoff capped at five"), `not surfaced; note:\n${a.note}`);
});

// ── L2: the trace must beat the null at distance (else the ladder is decoration) ──
test("L2 over 30 planted needles, the trace finds more than newest-k alone (null arm)", () => {
  let found = 0, total = 0;
  for (let k = 0; k < 30; k++) {
    const at = 5 + k, word = `zorblax${k}`;
    const turns = history(100, { [at]: { ask: `settle the ${word} contract`, answer: `The ${word} contract requires idempotent writes. Tests pass.` } });
    const a = arms(turns, `extend the ${word} writes`, at);
    total++; if (a.trace.addr || a.quotes(`The ${word} contract requires idempotent writes`)) found++;
  }
  assert.ok(found > 0, "the null arm finds none by construction; the trace must find some");
  assert.equal(found, total, `trace surfaced ${found}/${total} direct-cue needles`);
});

// ── L3: the Shakespeare case. The continuity detail is never named by the later ask. ──
test("L3 FALSIFIER: a detail the later step depends on but does not name still leaves a perceivable trace", () => {
  // act 2: the queen's eyes are grey. act 5 asks for a scene where she is recognised — no mention of eyes.
  const turns = history(100, { 12: { ask: "write the queen's entrance", answer: "The queen enters. Her eyes are grey as slate. Tests pass." } });
  const a = arms(turns, "write the recognition scene where the queen is known by a stranger", 12);
  assert.ok(a.trace.addr || a.quotes("eyes are grey"), "the dependency is invisible to the local view: the ladder only follows shared terms");
});

// ── L4: an indirect cue through a synonym ──
test("L4 FALSIFIER: the ask paraphrases the earlier term (retry → resend) and still finds it", () => {
  const turns = history(100, { 30: { ask: "pick the retry policy", answer: "Retry uses jittered backoff. Tests pass." } });
  const a = arms(turns, "make the resend logic more patient", 30);
  assert.ok(a.trace.addr || a.quotes("jittered backoff"), "synonym cue missed (lexical matching only)");
});

// ── L5: a trace that the work itself leaves keeps the needle findable (the stigmergic move: deposit, don't remember) ──
test("L5 when the step that matters deposits its own term in a later turn, the trace surfaces it (deposit rescues L3)", () => {
  const turns = history(100, {
    12: { ask: "write the queen's entrance", answer: "The queen enters. Her eyes are grey as slate. Tests pass." },
    13: { ask: "note continuity: queen eyes grey", answer: "Continuity recorded: queen eyes grey. Tests pass." },
  });
  const a = arms(turns, "write the recognition scene where the queen is known by a stranger", 12);
  assert.ok(a.trace.addr || a.quotes("eyes are grey") || /queen/.test(a.note), `deposit did not help; note:\n${a.note}`);
});

// ── L6: growth is bounded (the local view stays local at any history length) ──
test("L6 the view stays near-constant from 50 to 800 turns", () => {
  const c = (n) => surf({ ask: "x", turns: history(n, {}) }).chars;
  assert.ok(c(800) < c(50) * 2.5, `${c(50)} -> ${c(800)}`);
});

// ── L7: no hidden global: the view of turns 1..N is a function of the turns it is shown, not of anything else ──
test("L7 same turns and ask give the same view regardless of surrounding state (pure)", () => {
  const t = history(60, {});
  assert.equal(surf({ ask: "q", turns: t }).note, surf({ ask: "q", turns: structuredClone(t) }).note);
});

// ── L8: the needle is findable only when it is a term shared with other turns ──
test("L8 FALSIFIER: a unique one-off decision (appears in one turn only) is not reduced to a pattern that hides it", () => {
  const turns = history(100, { 40: { ask: "choose the encryption cipher", answer: "We use xchacha20 for the vault. Tests pass." } });
  const a = arms(turns, "rotate the vault keys", 40);
  assert.ok(a.trace.addr || a.quotes("xchacha20"), `one-off decision vanished into a pattern:\n${a.note}`);
});
