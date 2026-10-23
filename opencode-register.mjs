// opencode-register.mjs — THE REGISTER: the facts a person STATED in a conversation, kept exactly, outside any model summary.
//
// Why it exists (foldcode-poc/FAILURES.md): at the 32k cap opencode's native compaction replaced the history with a model-written
// summary that turned "mascot service is called Orbit" into a project name and wrote "mascot name unknown" (F1); the door's worknotes
// for that session held no facts at all, so the fold had nothing to answer from (F1); and on a 7-turn chat the one configuration that
// answered recall correctly, in one request a turn with no tool calls and the fewest tokens, was the one with a register door (config E).
// SPEC-MECHANICAL-COMPETENCY.md states the claim so it can fail and freezes the bars (foldcode-poc/mech/bars.json).
//
// WHAT IT IS. Six mechanical competencies over the user's own turns, none of which calls a model or the network:
//   M1 bindings      `subject := value` from a user statement, with the verbatim sentence and the turn it was said   (extractBindings)
//   M2 supersession  a later binding for the same subject replaces the earlier; both are kept, in order                (buildRegister)
//   M3 lookup        "what is X" / "what was X before" / "what was X originally" from the register                      (lookup)
//   M4 provenance    "did I/you say X" — the verbatim turns searched by value; a never-said value is a typed gap        (provenance)
//   M5 contradiction a claim about a registered subject with another value                                              (contradiction)
//   M6 arithmetic    exact sums and clock differences over registered values                                            (compute)
// A statement the parser cannot read is stored nowhere and reported as a typed gap; the verbatim turn stays in the log for M4.
// PRECISION OVER RECALL: a wrong binding poisons every later answer, so the patterns are narrow and a miss is a gap, never a guess.
//
// ONE STORE. Each binding is written ONCE as a `fact` mark in the task's EOT log (opencode-eot.mjs recordMark), under the session as
// agent, with the turn and the verbatim sentence: `t<N> · <sentence>`. The register is a PROJECTION of those marks (projectMarks →
// parse → bind → fold), never a second store; `<fold-register>` is that projection rendered as prose the model can quote ("the model
// sees its own format"). Dedupe is by sentence, not by turn number: after a compaction the window's turns renumber from 1, and the same
// sentence must not become a second fact. The turn kept is the one it was first seen at.
//
// THE SPINE (MECHANICAL-COMPETENCY-RECONCILIATION.md §2). M1 reads text, so it is the reader's and lives here, in khora. M2–M6 reason over
// the record and are janus's by the spine; their mechanical forms are carried here, unchanged from the measured layer, as the interim the
// reconciliation names until the janus `/v1/reason` handlers door is promoted and the register's subjects are keyed by referent
// (FOLDCODE-MVP-PLAN.md Gate C1). Nothing here is a judge: the register says what the person said, and when.
//
// ORIGIN. Ported from foldcode-poc/mech/{text,gaps,bindings,register,lookup,provenance,contradiction,arithmetic,render,index}.mjs
// (2026-10-23), logic unchanged, so the bars measured there (M1 1.00/1.00, M2 1.00, M3 50/50, M4 5/5, M5 5/5, M6 10/10, register
// ~459 tokens on 15 synthetic sessions) are the bars this module carries. English only in v1; another script is a typed `lang` gap.
import * as eot from "./opencode-eot.mjs";
// THE REFERENT (FOLDCODE-MVP-PLAN.md Gate C1): a subject is keyed by the thing it names, not by its spelling. janus's organs, vendored
// byte-identical under vendor/janus (VENDOR-JANUS.json pins them): read-nodes reads a subject against the session's own index (the
// surfaces already bound and the names they were given), referents holds each alias claim as an edge under the lens "session" and folds
// the groups at read time, so a wrong merge is undone by its edge, never by rewriting an id.
import { newStore, admit, assertEdge, groups } from "./vendor/janus/identity/referents.mjs";
import { readNodes } from "./vendor/janus/identity/read-nodes.mjs";

export const REGISTER_SCHEMA = "FoldRegister@1";
// The one legend sentence: a fact stated, never a prohibition (the small-mouth safety gate trips on imperative negations).
export const REGISTER_LEGEND =
  "The <fold-register> block lists facts you stated earlier in this conversation, each with the turn it was said; you may rely on them and quote them.";
// Declared, not measured (SPEC §6: the register at 60 turns / 25 facts must stay under 600 tokens; chars/4).
export const REGISTER = Object.freeze({ maxChars: 2400, maxLines: 60 });

// ── gaps ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const GAP = Object.freeze({
  UNPARSED: "unparsed",
  AMBIGUOUS: "ambiguous",
  LANG: "lang",
  NO_BINDING: "no-binding",
  NO_VALUE: "no-value",
  NOT_FOUND: "not-found",
  CONFLICT: "conflict",
  UNSUPPORTED: "unsupported",
});
export const gap = (kind, extra = {}) => ({ gap: kind, ...extra });
export const isGap = (x) => x != null && typeof x === "object" && typeof x.gap === "string";

// ── text ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ARTICLES = /^(?:the|a|an|our|their|your|his|her|its|this|that|these|those|my)\s+/i;
const POSSESSIVE = /['’]s\b/g;
export const norm = (s) => String(s ?? "").normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
export const stripEdge = (s) => norm(s).replace(/^[\s"'(\[]+/, "").replace(/[\s"')\]}.,;:!?]+$/, "").trim();
export const stripArticle = (s) => stripEdge(s).replace(ARTICLES, "").trim();
export const canon = (s) => stripArticle(String(s ?? "").replace(POSSESSIVE, " ")).replace(/\s+/g, " ").trim();
export const keyOf = (subject, attr = null) => (attr ? `${canon(subject)}|${canon(attr)}` : canon(subject));
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

export function sentences(text) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return [];
  const out = [];
  const re = /[.!?]+(?=\s+[A-Z0-9"'([]|\s*$)/g;
  let start = 0;
  let m;
  while ((m = re.exec(s))) {
    const end = m.index + m[0].length;
    const raw = s.slice(start, end).trim();
    if (raw) out.push({ text: raw, start, end });
    start = end;
  }
  if (start < s.length) {
    const raw = s.slice(start).trim();
    if (raw) out.push({ text: raw, start, end: s.length });
  }
  return out;
}
const WORD = /\p{L}/u;
export const hasWord = (s) => WORD.test(String(s ?? ""));
export const PRONOUN = /^(?:it|they|this|that|these|those|he|she|we|you|i)$/i;
export const isPronoun = (s) => PRONOUN.test(canon(s));
export function numbersIn(s) {
  const out = [];
  const re = /-?\d[\d,]*(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(String(s ?? "")))) out.push({ raw: m[0], value: Number(m[0].replace(/,/g, "")), start: m.index, end: m.index + m[0].length });
  return out;
}
export const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;
export const CLOCK_RE = /\b(\d{1,2}:\d{2})\b/;
export const extractDate = (s) => { const m = String(s ?? "").match(DATE_RE); return m ? m[1] : null; };
export const extractClock = (s) => { const m = String(s ?? "").match(CLOCK_RE); return m ? m[1] : null; };

// ── M1: bindings ─────────────────────────────────────────────────────────────────────────────────────────────────────
const HAN = /[぀-ヿ㐀-䶿一-鿿＀-￯]/;
const HEBREW = /[֐-׿]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const ARABIC = /[؀-ۿ]/;
export function scriptOf(text) {
  const s = String(text ?? "");
  if (HAN.test(s)) return "han";
  if (HEBREW.test(s)) return "hebrew";
  if (ARABIC.test(s)) return "arabic";
  if (CYRILLIC.test(s)) return "cyrillic";
  return "latin";
}

const UPDATE_PREFIX = /^\s*(?:just\s+)?(?:a\s+|quick\s+|small\s+)?(?:update|correction|note|change|heads[- ]up|fyi|btw|quick note|just so you know|for the record)\s*[:\-—]\s*/i;
// WHAT IS NEVER A STATEMENT (precision over recall; measured 2026-10-23 on live sessions): a question anywhere in the sentence (a stray
// quote after the mark defeated the end-anchored test), markup or a harness block (the compaction `<conversation-checkpoint>` arrives
// as a user-role message and read as the person's words), and a sentence too long to be one stated fact.
const QUESTION = /\?/;
const MARKUP = /^\s*[<\[#]|<\/?[a-z][\w-]*[\s>]|\bconversation-checkpoint\b/i;
const INTERROGATIVE = /^\s*(?:what|when|where|who|whom|which|why|how|did|do|does|is|are|was|were|can|could|would|should|will|has|have)\b/i;
const MAX_SENTENCE_CHARS = 240;
const notAStatement = (s) => QUESTION.test(s) || MARKUP.test(s) || INTERROGATIVE.test(s) || s.length > MAX_SENTENCE_CHARS;
const VALUE_PREFIX = /^(?:currently|now|set at|set to|priced at|numbered|located in|led by|run by|managed by|in|at|on)\s+/i;
const ACK_SENTENCE = /^(?:just\s+)?(?:acknowledge|ack|acknowledgement|thanks|thank you|got it|noted|no long reply|one[- ]line)/i;
const ROLE = /\b(?:lead|owner|manager|head|director|chief|officer|coordinator|champion|contact)\b/i;
const AKA_CLAUSE = /,?\s*\(?\b(?:also known as|aka|a\.k\.a\.|also called)\s+[^,;.()]+\)?,?/i;
const TEAM_OBJ = /\b(?:team|platform|audit|program|programme|group|function|desk)\b/i;

function parseQuantity(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/^([\d][\d,]*(?:\.\d+)?)\s+(.+)$/);
  if (m) return { number: Number(m[1].replace(/,/g, "")), unit: m[2].trim() };
  const n = s.match(/^([\d][\d,]*(?:\.\d+)?)$/);
  if (n) return { number: Number(n[1].replace(/,/g, "")), unit: null };
  return null;
}
function classify(value) {
  const v = String(value ?? "").trim();
  if (extractDate(v)) return "date";
  if (extractClock(v)) return "time";
  if (/^[\d][\d,]*(?:\.\d+)?(?:\s+\p{L}.*)?$/u.test(v)) return "number";
  if (/^(?:[\p{Lu}\d][\w.-]*)(?:\s+[\p{Lu}\d][\w.-]*)*$/u.test(v) && hasWord(v)) return "name";
  return "text";
}
function bindingOf({ subject, value, attr = null, sentence, turn, span, update = false, verb = null }) {
  const valueRaw = String(value ?? "").trim().replace(VALUE_PREFIX, "").replace(/[.,;]+$/, "").trim();
  if (!hasWord(subject) || !(hasWord(valueRaw) || /\d/.test(valueRaw))) return null;
  if (isPronoun(subject)) return null;
  if (/^(?:it|this|that)\b/i.test(subject)) return null;
  // a subject that still carries a colon or a question is a discourse frame the patterns did not strip, not a thing: refused
  if (/[:?]/.test(subject) || INTERROGATIVE.test(subject)) return null;
  return { subject: canon(subject), subjectRaw: stripEdge(subject), attr: attr ? canon(attr) : null, value: valueRaw, kind: classify(valueRaw), sentence, turn, span, update, verb };
}

/** One sentence → one binding or null. The patterns are the measured ones; a sentence none of them reads is nothing, not a guess. */
export function matchStatement(text) {
  const s0 = String(text ?? "").trim().replace(/\s+/g, " ");
  const update = UPDATE_PREFIX.test(s0);
  // an "also known as …" clause is an alias claim the referent layer reads from the verbatim sentence; it is not part of the subject
  const s = s0.replace(UPDATE_PREFIX, "").replace(AKA_CLAUSE, "").replace(/\s+,/g, ",").replace(/^[\s,]+/, "").trim();
  let m;
  if ((m = s.match(/^(?:the\s+)?name\s+of\s+(?<sub>.+?)\s+is\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, verb: "name-of" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:is|are|was|were)\s+(?:(?<now>now|currently)\s+)?(?:called|named|known as)\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update: update || !!m.groups.now, verb: "called" });
  if ((m = s.match(/^(?:we|they|everyone|people|i|let's|let us)\s+(?:call|name|named|refer to)\s+(?<sub>.+?)\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "call" });
  if ((m = s.match(/^we\s+pay\s+(?<sub>.+?)\s+(?<val>.+?)\s+for\s+(?<attr>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: m.groups.attr, sentence: s0, update, verb: "pay" });
  if ((m = s.match(/^(?<val>.+?)\s+owns?\s+(?:the\s+)?(?<sub>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: "owner", sentence: s0, update, verb: "owns" });
  if ((m = s.match(/^(?<val>.+?)\s+(?:runs|leads|heads)\s+(?:the\s+)?(?<sub>.+)$/i)) && TEAM_OBJ.test(m.groups.sub))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: "lead", sentence: s0, update, verb: "runs" });
  if ((m = s.match(/^there\s+are\s+(?<val>[\d][\d,]*)\s+(?<attr>.+?)\s+(?:in|at|on)\s+(?<sub>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: m.groups.attr, sentence: s0, update, verb: "there-are" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:has|have)\s+(?:changed|moved|shifted|switched|updated|been changed|been updated)\s+to\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update: true, verb: "has-changed-to" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:(?:now|currently)\s+)?(?:has|have|contains|holds)\s+(?<val>.+)$/i))) {
    const q = parseQuantity(m.groups.val);
    return bindingOf({ subject: m.groups.sub, value: q ? String(q.number) : m.groups.val, attr: q ? q.unit : null, sentence: s0, update, verb: "has" });
  }
  if ((m = s.match(/^(?<sub>.+?)\s+(?:(?:now|currently)\s+)?runs?\s+from\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: "window", sentence: s0, update, verb: "runs-from" });
  if ((m = s.match(/^(?<sub>.+?)\s+changes?\s+every\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: "cadence", sentence: s0, update, verb: "changes-every" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:departs?|ships?|sails?|runs?|go(?:es)?|leaves?|arrives?)\s+every\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, attr: "cadence", sentence: s0, update, verb: "every" });
  if ((m = s.match(/^(?<sub>.+?)\s+sits?\s+at\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "sits-at" });
  if ((m = s.match(/^(?<sub>.+?)\s+is\s+now\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update: true, verb: "is-now" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:changed|moved|shifted|slipped|switched|updated|rescheduled)\s+to\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update: true, verb: "changed-to" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:is|are|was|were)\s+(?:closed|open|held|scheduled|due|set|planned)\s+(?:on|at)\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "state-on" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:is|are|was|were|launches|launch|ends|starts|happens|takes place|closes|opens|departs?|ships?)\s+(?:on|at)\s+(?<val>.+)$/i)))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "on" });
  if ((m = s.match(/^(?<sub>[^:]+?)\s*:\s*(?<val>.+)$/i)) && !/[?]$/.test(s) && !/\d\s*:\s*\d/.test(s) && !/\b(?:is|are|was|were|has|have)\b/i.test(m.groups.sub))
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "colon" });
  if ((m = s.match(/^(?<sub>.+?)\s+(?:is|are|was|were)\s+(?<val>.+)$/i))) {
    if (ROLE.test(m.groups.val) && !ROLE.test(m.groups.sub))
      return bindingOf({ subject: m.groups.val, value: m.groups.sub, sentence: s0, update, verb: "is-role" });
    return bindingOf({ subject: m.groups.sub, value: m.groups.val, sentence: s0, update, verb: "is" });
  }
  return null;
}

/** The user's turns ([{ n, role?, text | ask }]) → their bindings, with typed gaps for turns the layer cannot read. */
export function extractBindings(turns, { lang = "en" } = {}) {
  const bindings = [];
  const gaps = [];
  const list = Array.isArray(turns) ? turns : [];
  for (const t of list) {
    const role = t.role ?? "user";
    if (role !== "user") continue;
    const text = String(t.text ?? t.ask ?? "");
    const n = t.n ?? t.turn ?? 0;
    if (!text.trim()) continue;
    const script = scriptOf(text);
    if (script !== "latin") { gaps.push(gap(GAP.LANG, { turn: n, script })); continue; }
    if (MARKUP.test(text)) { gaps.push(gap(GAP.UNPARSED, { turn: n, reason: "markup or a harness block, not the person's words" })); continue; }
    const sents = sentences(text).filter((s) => !notAStatement(s.text));
    let carry = null;      // "X moved." → the subject the next sentence's "It is now …" binds to
    let carried = null;    // that sentence, verbatim, so the binding's own sentence is the whole run that bound it (a mark must round-trip)
    for (const sen of sents) {
      if (ACK_SENTENCE.test(sen.text) || /\?\s*$/.test(sen.text)) { carry = null; carried = null; continue; }
      if (carry && /^(?:it|this|that)\b/i.test(sen.text)) {
        const m = sen.text.match(/^(?:it|this|that)\s+(?:is|are)\s+(?:now\s+)?(?:on\s+|at\s+)?(?<val>.+)$/i);
        if (m) {
          const b = bindingOf({ subject: carry, value: m.groups.val, sentence: `${carried.text} ${sen.text}`, turn: n, span: [carried.start, sen.end], update: true, verb: "moved-now" });
          if (b) bindings.push(b);
          carry = null; carried = null;
          continue;
        }
      }
      carry = null; carried = null;
      const bare = sen.text.replace(UPDATE_PREFIX, "").trim();
      const mv = bare.match(/^(?<sub>.+?)\s+(?:has\s+|have\s+)?(?:moved|slipped|shifted|changed|rescheduled|pushed)\b(?!\s+to\b)/i);
      if (mv) { carry = mv.groups.sub; carried = sen; continue; }
      const b = matchStatement(sen.text);
      if (b) { b.turn = n; b.span = [sen.start, sen.end]; bindings.push(b); continue; }
    }
  }
  return { bindings, gaps };
}

// ── the referents: which subjects are one thing ──────────────────────────────────────────────────────────────────────
// Three ways two surfaces are one referent, each a claim with a holder and the lens "session", folded by janus's union-find:
//   named     "the mascot service is called Orbit"  → the name given IS the thing (holder: the person, by saying so)
//   aka       "X, also known as Y" / "X (aka Y)"      → an alias the person stated
//   narrowed  "the mascot service" after "our cat-named mascot service" → the shorter subject is the longer one with its modifiers
//             dropped, admitted only when exactly ONE earlier subject ends in it (two candidates: refused, the subjects stay apart)
// Anything else is a different thing. A subject is read against the index of surfaces already bound (read-nodes, longest match), so
// "Orbit" in a later statement keys to the mascot service. Precision over recall: a miss keys by the surface, as before.
const NAMING = new Set(["called", "name-of", "call"]);
const AKA = /\b(?:also known as|aka|a\.k\.a\.|also called)\s+(?<alias>[^,;.()]+)/i;
export function referentsOf(bindings) {
  const store = newStore();
  const index = new Map();          // surface (canon) -> referent id
  const first = new Map();          // referent id -> the surface first seen for it (the canonical spelling)
  const subjects = [];              // canon subjects in order, for the narrowed rule
  const keyOfBinding = new Map();   // binding -> referent id
  const say = (surface) => { const s = canon(surface); if (!s) return null; let id = index.get(s); if (id === undefined) { id = admit(store, s); index.set(s, id); if (!first.has(id)) first.set(id, s); } return id; };
  for (const b of bindings || []) {
    const s = canon(b.subject);
    let id = index.get(s);
    if (id === undefined) {
      // read the subject against what is already bound: a known surface inside it (the longest) names the thing
      const read = index.size ? readNodes(s, index) : { spans: [] };
      const whole = read.spans.find((sp) => sp.surface === s);
      if (whole) id = whole.node;
      else {
        const ends = subjects.filter((p) => p !== s && (p.endsWith(` ${s}`)));
        if (ends.length === 1) { id = index.get(ends[0]); assertEdge(store, { holder: "register:narrowed", lens: "session", a: id, b: admit(store, s) }); index.set(s, id); }
        else id = say(s);
      }
      if (!subjects.includes(s)) subjects.push(s);
    }
    keyOfBinding.set(b, id);
    if (NAMING.has(b.verb) && b.kind === "name") { const v = say(b.value); if (v !== null && v !== id) assertEdge(store, { holder: "user", lens: "session", a: id, b: v }); }
    const aka = AKA.exec(String(b.sentence ?? ""));
    if (aka) { const v = say(aka.groups.alias); if (v !== null && v !== id) assertEdge(store, { holder: "user", lens: "session", a: id, b: v }); }
  }
  // fold: each id to its group's root (the first-seen member), so aliases share one key
  const root = new Map();
  for (const g of groups(store, "session")) { const ordered = g.slice().sort((x, y) => [...first.keys()].indexOf(x) - [...first.keys()].indexOf(y)); for (const m of g) root.set(m, ordered[0]); }
  const aliasesOf = (id) => [...index.entries()].filter(([, v]) => root.get(v) === root.get(id)).map(([s]) => s);
  return { store, index, keyOf: (b) => root.get(keyOfBinding.get(b)) ?? keyOfBinding.get(b), surfaceOf: (id) => first.get(id), aliasesOf };
}

// ── M2: the register (supersession) ──────────────────────────────────────────────────────────────────────────────────
export function buildRegister(bindings) {
  const refs = referentsOf(bindings);
  const order = [];
  const map = new Map();
  for (const b of bindings || []) {
    const rid = refs.keyOf(b);
    const key = `${rid}${b.attr ? `|${canon(b.attr)}` : ""}`;
    if (!map.has(key)) { map.set(key, { key, subject: refs.surfaceOf(rid) ?? b.subject, attr: b.attr, history: [], referent: rid }); order.push(key); }
    map.get(key).history.push(b);
  }
  const facts = order.map((k) => {
    const f = map.get(k);
    const seen = new Set();
    const history = [];
    for (const b of f.history) {
      const v = String(b.value).trim();
      if (seen.has(v)) continue;
      seen.add(v);
      history.push(b);
    }
    const aliases = refs.aliasesOf(f.referent).filter((s) => s !== f.subject);
    return { key: f.key, subject: f.subject, attr: f.attr, current: history.at(-1), history, referent: f.referent, aliases };
  });
  return { facts, byKey: map, order };
}

// ── M3: lookup ───────────────────────────────────────────────────────────────────────────────────────────────────────
const STOP = new Set("what is are was were the a an of our your their this that these those it its name called now currently before previously earlier originally used to prior change changed update and in on at do does did have has how many much who whom when where which tell me about from give you said".split(" "));
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
const contentTokens = (s) => tokens(s).filter((t) => !STOP.has(t));
const ORIGINAL = /\b(?:originally|at first|initially|the first|the original|to begin with)\b/i;
const SUPERSEDED = /\b(?:before|previously|earlier|used to|prior|was\s+\w+\s+before|change)\b/i;

export function parseQuestion(question) {
  const q = norm(question);
  const mode = ORIGINAL.test(q) ? "original" : SUPERSEDED.test(q) && !/now/.test(q) ? "superseded" : "current";
  const m = q.match(/how many\s+(?<attr>.+?)\s+(?:does|do|has|have|are there|in)\b/i);
  const attr = m ? canon(m.groups.attr) : null;
  return { raw: question, mode, attr, tokens: new Set(contentTokens(q)) };
}
export function findFact(question, register) {
  const parsed = typeof question === "string" ? parseQuestion(question) : question;
  let best = null, bestHits = 0, bestKey = null, ties = 0;
  for (const f of register.facts) {
    const ftoks = new Set(contentTokens(`${f.subject} ${(f.aliases ?? []).join(" ")} ${f.attr ?? ""}`));
    let hits = 0;
    for (const t of ftoks) if (parsed.tokens.has(t)) hits += 1;
    if (hits === 0) continue;
    const attrBonus = parsed.attr && f.attr && (parsed.tokens.has(f.attr) || norm(parsed.attr) === norm(f.attr)) ? 0.5 : 0;
    const score = hits + attrBonus;
    if (score > bestHits) { bestHits = score; best = f; bestKey = f.key; ties = 1; }
    else if (score === bestHits && f.key !== bestKey) ties += 1;
  }
  if (!best) return gap(GAP.NOT_FOUND, { question: parsed.raw });
  if (ties > 1 && bestHits <= 1) return gap(GAP.AMBIGUOUS, { question: parsed.raw, key: best.key });
  return { fact: best, mode: parsed.mode, parsed };
}
export function lookup(question, register) {
  const found = findFact(question, register);
  if (found.gap) return found;
  const f = found.fact;
  if (found.mode === "original") {
    const first = f.history[0];
    return { value: first.value, turn: first.turn, key: f.key, mode: "original", subject: f.subject, attr: f.attr, sentence: first.sentence };
  }
  if (found.mode === "superseded") {
    if (f.history.length < 2) return gap(GAP.NO_VALUE, { key: f.key, reason: "never-superseded" });
    const prev = f.history.at(-2);
    return { value: prev.value, turn: prev.turn, key: f.key, mode: "superseded", subject: f.subject, attr: f.attr, sentence: prev.sentence };
  }
  return { value: f.current.value, turn: f.current.turn, key: f.key, mode: "current", subject: f.subject, attr: f.attr, sentence: f.current.sentence };
}

// ── M4: provenance ───────────────────────────────────────────────────────────────────────────────────────────────────
const VAL = "[A-Za-z0-9][\\w.\\-]*(?:\\s+[A-Za-z0-9][\\w.\\-]*)*";
const trimTail = (v) => v.replace(/\s+(?:right|correct|yes|no|didn'?t|isn'?t)\b.*$/i, "").trim();
export function claimedValue(claim) {
  const s = String(claim ?? "").trim();
  const q = s.match(/["“‘']([^"”’']{2,})["”’']/);
  if (q) return q[1].trim();
  const named = s.match(new RegExp(`(?:called|named|known as)\\s+(?<val>${VAL})`, "i"));
  if (named) return trimTail(named.groups.val);
  const said = s.match(new RegExp(`(?:say|said|tell|told|mention|mentioned)(?:\\s+me)?(?:\\s+(?:it|that)\\s+was)?\\s+(?<val>${VAL})`, "i"));
  if (said) return trimTail(said.groups.val);
  const copula = s.match(new RegExp(`(?:was|is|equals?)\\s+(?<val>${VAL})`, "i"));
  if (copula) return trimTail(copula.groups.val);
  return null;
}
export function provenance(claim, turns) {
  const value = claimedValue(claim);
  if (!value) return gap(GAP.UNPARSED, { claim });
  const target = norm(value);
  const hits = [];
  for (const t of turns || []) {
    if (t.probe || t.filler) continue;
    const text = norm(t.text ?? t.ask ?? "");
    if (text && text.includes(target)) hits.push({ turn: t.n ?? t.turn, role: t.role ?? "user" });
  }
  if (!hits.length) return gap(GAP.NOT_FOUND, { value, reason: "no turn names it" });
  return { value, turns: hits, turn: hits[0].turn };
}
export const saidBy = (turns, value) => {
  const target = norm(value);
  return (turns || []).filter((t) => norm(t.text ?? t.ask ?? "").includes(target)).map((t) => ({ turn: t.n ?? t.turn, role: t.role ?? "user" }));
};

// ── M5: contradiction ────────────────────────────────────────────────────────────────────────────────────────────────
const CLAIM_PREFIX = /^\s*(?:you|i)\s+(?:told|said|mentioned|stated|claimed|wrote|note[d]?)\s+(?:me\s+)?(?:earlier\s+|before\s+|previously\s+)?/i;
export function parseClaim(claim) {
  const s = String(claim ?? "").trim().replace(/\s*,\s*(?:right|correct|yes|no)\s*\??$/i, "?").replace(/\?\s*$/, "");
  const stripped = s.replace(CLAIM_PREFIX, "").replace(/^(?:that|it was|the)\s+/i, (m) => (m.trim().toLowerCase() === "the" ? "the " : ""));
  return matchStatement(stripped) ?? matchStatement(s);
}
export function contradiction(claim, register) {
  const b = parseClaim(claim);
  if (!b) return gap(GAP.UNPARSED, { claim });
  const found = findFact(b.subject, register);
  if (found.gap) return gap(GAP.NOT_FOUND, { subject: b.subject, claimed: b.value });
  const f = found.fact;
  const stored = String(f.current.value).trim();
  const claimed = String(b.value).trim();
  if (norm(stored) === norm(claimed)) return null;
  return { subject: f.subject, attr: f.attr, key: f.key, stored, claimed, turn: f.current.turn, sentence: f.current.sentence };
}

// ── M6: arithmetic ───────────────────────────────────────────────────────────────────────────────────────────────────
const PLUS = /\s*(?:plus|\+|and|combined with|together with)\s*/i;
const HOURS = /\bhours?\b/i;
const DIFFERENCE = /\b(?:difference|minus|less|subtract|between)\b/i;
const valueOf = (fact) => { const v = fact?.current?.value ?? fact?.value; const nums = numbersIn(String(v ?? "")); return nums.length ? nums[0].value : null; };
function conjunctFacts(question, register) {
  const parts = String(question).replace(/[?].*$/, "").split(PLUS).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const facts = [];
  for (const p of parts) { const found = findFact(p, register); if (found.gap) return null; facts.push(found.fact); }
  return facts;
}
export function clockMinutes(hhmm) { const m = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
export function timeDiffHours(a, b) {
  const ma = clockMinutes(a), mb = clockMinutes(b);
  if (ma == null || mb == null) return null;
  let d = mb - ma;
  if (d < 0) d += 24 * 60;
  return d / 60;
}
export function compute(question, register) {
  const q = norm(question);
  if (HOURS.test(q)) {
    const clocks = String(question).match(/\b\d{1,2}:\d{2}\b/g) || [];
    if (clocks.length >= 2) { const hours = timeDiffHours(clocks[0], clocks[1]); return { value: hours, working: `${clocks[0]} -> ${clocks[1]} = ${hours} h`, kind: "time-diff" }; }
    const found = findFact(question, register);
    if (!found.gap) {
      const vclocks = String(found.fact.current.value).match(/\b\d{1,2}:\d{2}\b/g) || [];
      if (vclocks.length >= 2) { const hours = timeDiffHours(vclocks[0], vclocks[1]); return { value: hours, working: `${vclocks[0]} -> ${vclocks[1]} = ${hours} h`, kind: "time-diff", fact: found.fact.key }; }
    }
  }
  const facts = conjunctFacts(question, register);
  if (facts && facts.length >= 2) {
    const vals = facts.map(valueOf);
    if (vals.every((v) => v != null)) {
      if (DIFFERENCE.test(q)) { const value = vals.reduce((a, b) => a - b); return { value, working: vals.join(" - "), kind: "difference", facts: facts.map((f) => f.key) }; }
      const value = vals.reduce((a, b) => a + b, 0);
      return { value, working: vals.join(" + ") + ` = ${value}`, kind: "sum", facts: facts.map((f) => f.key) };
    }
  }
  return gap(GAP.UNSUPPORTED, { question });
}

// ── the answer: which competency a question wants ────────────────────────────────────────────────────────────────────
const ARITH = /\b(?:plus|sum|total|combined|altogether|in total|difference|how many hours|how long|hours from)\b|\+/i;
const PROVENANCE_Q = /\b(?:did (?:i|you|we) say|did (?:i|you) (?:tell|mention)|do (?:i|you) (?:have|know) (?:a|any) (?:record|mention)|is there any (?:record|mention)|was (?:it|that) (?:said|mentioned))\b/i;
const FALSE_PREMISE = /\b(?:right|correct|isn'?t it|wasn'?t it|didn'?t i|no\?)\s*\?*$/i;
const CLAIM_Q = /\b(?:you told me|you said|i told you|i said|you mentioned)\b/i;

export function ingest(turns, opts = {}) {
  const { bindings, gaps } = extractBindings(turns, opts);
  return { bindings, gaps, register: buildRegister(bindings), turns };
}
/** The answer the register gives a question, or a typed gap. `memory` is { register, turns } or the turns themselves. */
export function answer(question, memory) {
  const turns = memory.turns ?? memory;
  const register = memory.register ?? buildRegister(extractBindings(turns).bindings);
  const q = String(question ?? "");
  if (ARITH.test(q)) { const c = compute(q, register); if (!c.gap) return { ...c, competency: "M6" }; }
  if (FALSE_PREMISE.test(q) || (CLAIM_Q.test(q) && !PROVENANCE_Q.test(q))) {
    const c = contradiction(q, register);
    if (c && !c.gap) return { contradiction: c, kind: "contradiction", competency: "M5" };
    if (c && c.gap === GAP.NOT_FOUND) {
      const p = provenance(q, turns);
      if (p.gap) return gap(GAP.NOT_FOUND, { reason: "no turn names it" });
      return { ...p, kind: "provenance", competency: "M4" };
    }
  }
  if (PROVENANCE_Q.test(q)) { const p = provenance(q, turns); return p.gap ? p : { ...p, kind: "provenance", competency: "M4" }; }
  const l = lookup(q, register);
  return l.gap ? l : { ...l, kind: "lookup", competency: "M3" };
}

// ── render: the model sees its own format ────────────────────────────────────────────────────────────────────────────
export function registerLines(register, { maxLines = REGISTER.maxLines } = {}) {
  const lines = [];
  for (const f of register.facts) {
    // one name per referent in the line; the other names the person used are disclosed, never a second line
    const values = new Set(f.history.map((h) => norm(String(h.value))));
    const also = (f.aliases ?? []).filter((a) => !values.has(norm(a)));  // a name the fact itself states, now or before, is not "also"
    const subj = f.subject + (also.length ? ` (also: ${also.join(", ")})` : "") + (f.attr ? ` ${f.attr}` : "");
    if (f.history.length > 1) {
      const cur = f.current, prev = f.history.at(-2);
      lines.push(`The ${subj} is ${cur.value} — you said so in turn ${cur.turn}; before that it was ${prev.value} (turn ${prev.turn}).`);
    } else lines.push(`The ${subj} is ${f.current.value} — you said so in turn ${f.current.turn}.`);
  }
  // the NEWEST facts survive a line cap: an older one is still in the log, and the window's own turns still carry the recent ones
  return lines.length > maxLines ? lines.slice(lines.length - maxLines) : lines;
}
/** The block, or "" when there is nothing to say. Bounded by lines and by chars (SPEC §6: ≤ 600 tokens at 60 turns); the newest facts
 *  survive a cut, and the cut is disclosed as a count. */
export function registerNote(register, { maxChars = REGISTER.maxChars, maxLines = REGISTER.maxLines } = {}) {
  if (!register?.facts?.length) return "";
  const all = registerLines(register, { maxLines: Infinity });
  const kept = all.length > maxLines ? all.slice(all.length - maxLines) : [...all];
  let dropped = all.length - kept.length;
  const body = () => (dropped ? [...kept, `(${dropped} earlier fact${dropped === 1 ? "" : "s"} not shown)`] : kept).join("\n");
  while (kept.length > 1 && body().length > maxChars) { kept.shift(); dropped += 1; }
  return `<fold-register>\n${body()}\n</fold-register>`;
}
export const renderRegister = (register, opts) => registerNote(register, opts);
/** A register answer in plain words, for a notice or a ledger line. */
export function renderAnswer(a) {
  if (!a || a.gap) return a?.gap ? `no answer in the register (${a.gap})` : "";
  if (a.kind === "contradiction") return `You said ${a.contradiction.stored} (turn ${a.contradiction.turn}), not ${a.contradiction.claimed}.`;
  if (a.kind === "provenance") return `Yes — turn ${a.turn}: ${a.value}.`;
  if (a.working) return `${a.value} (${a.working})`;
  return `${a.value} — you said so in turn ${a.turn}.`;
}

// ── the one store: facts are marks, the register is their projection ─────────────────────────────────────────────────
export const markText = (turn, sentence) => `t${Number(turn) || 0} · ${oneLine(sentence)}`;
export function parseMark(text) {
  const m = /^t(\d+) · (.+)$/s.exec(String(text ?? ""));
  return m ? { turn: Number(m[1]), sentence: m[2] } : null;
}
/** Marks (projectMarks rows) → bindings, each re-read from its own verbatim text by the SAME reader that bound it (a two-sentence
 *  update, "X moved. It is now Y.", is one mark and reads back as one binding); a mark that no longer reads is skipped. */
export function bindingsFromMarks(marks) {
  const out = [];
  for (const m of marks || []) {
    const p = parseMark(m.text);
    if (!p) continue;
    const { bindings } = extractBindings([{ n: p.turn, role: "user", text: p.sentence }]);
    if (!bindings.length) continue;
    out.push(bindings[0]);
  }
  return out;
}
const sentenceKey = (s) => norm(s);

/** Write the session's new bindings as `fact` marks under the session (agent). Idempotent by SENTENCE: after a compaction the
 *  window's turns renumber from 1, and the same sentence must not become a second fact. Returns what it wrote and the typed gaps. */
export function ingestTurns({ task, agent, turns }) {
  const list = (Array.isArray(turns) ? turns : []).map((t, i) => ({ n: Number(t.n ?? t.turn) || i + 1, role: t.role ?? "user", text: String(t.text ?? t.ask ?? "") }));
  const { bindings, gaps } = extractBindings(list);
  const have = new Set(bindingsFromMarks(eot.projectMarks(task, { agent, kind: "fact" })).map((b) => sentenceKey(b.sentence)));
  let wrote = 0;
  for (const b of bindings) {
    const k = sentenceKey(b.sentence);
    if (have.has(k)) continue;
    let r = null;
    try { r = eot.recordMark({ task, agent, kind: "fact", text: markText(b.turn, b.sentence) }); } catch { r = null; }
    if (r?.ok) { wrote += 1; have.add(k); }
  }
  return { wrote, bindings: bindings.length, gaps };
}
/** The register as a projection of the session's `fact` marks: nothing is read from anywhere else. */
export function registerOf(task, agent) {
  let marks = [];
  try { marks = eot.projectMarks(task, { agent, kind: "fact", limit: 1000 }); } catch { marks = []; }
  return buildRegister(bindingsFromMarks(marks));
}
/** The answer the register gives an ask, with the verbatim turns for M4; a question the register cannot answer is a typed gap. */
export function registerAnswer(question, register, turns = []) {
  const list = (Array.isArray(turns) ? turns : []).map((t, i) => ({ n: Number(t.n ?? t.turn) || i + 1, role: t.role ?? "user", text: String(t.text ?? t.ask ?? "") }));
  return answer(question, { register, turns: list });
}
