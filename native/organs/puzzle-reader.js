// puzzle-reader.js — READ A PUZZLE'S TEXT INTO THE REASONER, WITH THE READINGS LISTED, NOT PICKED.
//
//   readPuzzle(sentences, { reader }) -> { ok, scene, candidates, resolved, rule, gap, gaps, read }
//
// `sentences` is what the thread hands the reader: [{ order, text?, rows }], each row a UD row of the reader (id, form, lemma, upos, head, deprel, feats).
// The organ never sees a string of the text, only rows. It finds the scene in them (what the list of things is, who the people are, what each holds,
// who was asked what and what they answered, what is being asked) and it builds the possible readings of what that means for the reasoner
// (epistemic-core.js). It does not choose between them. Each reading is run, and one rule that has nothing to do with this puzzle judges them:
// a puzzle presupposes that its own question has exactly one answer, so a reading that leaves one answer HOLDS, one that leaves none is REFUTED,
// one that leaves several is OPEN. If exactly one reading holds, that is `resolved`; otherwise nothing is resolved and the list says why.
//
// What the rows cannot say is a typed gap, never a guess: `gap` is the first thing that could not be read, `gaps` is all of them, and `read` is
// what WAS read (so the caller can say "I understood the six words and the three students, but not what Albert said about Bernard").
//
// THE ONLY LEXICAL FACTS, declared (READER, below): which verb lemma is the epistemic one, which part-kind nouns decompose to characters, which
// adjective makes a question "the same". They belong to the English reader, not to the middle; another language passes its own `reader` or gets a
// gap. Everything else is read off the rows' structure.
//
// PURE. No fetch, no fs, no DOM. Imports only the reasoner.
import { makeModel, run, saysKnows, saysDoesNotKnow } from "./epistemic-core.js";

export const READER = Object.freeze({
  language: "eng",
  epistemic: Object.freeze(["know"]),                                   // the verb whose object a person can or cannot determine
  parts: Object.freeze({ letter: "character", character: "character", digit: "character" }),   // what a part-kind noun decomposes an item into
  sameAs: Object.freeze(["same"]),                                      // "asks Cheryl the SAME question": the previous question again
});

const lem = (r) => String(r?.lemma ?? r?.form ?? "").toLowerCase();
const QUOTES = new Set(['"', "“", "”", "«", "»", "„"]);
const isQuote = (r) => r.upos === "PUNCT" && QUOTES.has(r.form);
const kids = (rows, id) => rows.filter((r) => r.head === id);
const rootOf = (rows) => rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
const WORDS = (rows) => rows.filter((r) => r.upos !== "PUNCT");
const digits = (r) => (r && /^[0-9]+$/.test(String(r.form)) ? Number(r.form) : null);   // regex-ok: a numeral token, not language

/** the spans of rows between a pair of quote marks, in order (an unmatched last mark is ignored) */
function quotedSpans(rows) {
  const at = rows.map((r, i) => (isQuote(r) ? i : -1)).filter((i) => i >= 0), out = [];
  for (let k = 0; k + 1 < at.length; k += 2) out.push(rows.slice(at[k] + 1, at[k + 1]));
  return out;
}
const groupsBy = (rows, sep) => { const g = [[]]; for (const r of rows) { if (r.upos === "PUNCT" && r.form === sep) g.push([]); else if (r.upos !== "PUNCT") g.at(-1).push(r); } return g.filter((x) => x.length); };
/** proper-name rows joined by coordination to one another, in the order said: [Albert, Bernard, Cheryl] */
function coordinatedNames(rows) {
  const names = rows.filter((r) => r.upos === "PROPN"), byId = new Map(names.map((r) => [r.id, r]));
  const topOf = (r) => { let cur = r, n = 0; while (cur.deprel === "conj" && byId.has(cur.head) && n++ < 20) cur = byId.get(cur.head); return cur; };
  const groups = new Map();
  for (const r of names) { const t = topOf(r); if (!groups.has(t.id)) groups.set(t.id, []); groups.get(t.id).push(r); }
  return [...groups.values()].filter((g) => g.length >= 2).map((g) => g.sort((a, b) => a.id - b.id));
}

// ---------------------------------------------------------------------------------------------------------------- the scene

function readItems(sents, gaps) {
  for (const s of sents) {
    const counted = s.rows.find((r) => r.upos === "NOUN" && s.rows.some((c) => c.head === r.id && c.deprel === "nummod"));
    if (!counted) continue;
    const lists = [];
    for (const span of quotedSpans(s.rows)) if (!span.some((r) => r.form === "?")) lists.push(span);
    const colon = s.rows.findIndex((r) => r.upos === "PUNCT" && r.form === ":");
    if (!lists.length && colon >= 0) lists.push(s.rows.slice(colon + 1));
    for (const span of lists) {
      const w = WORDS(span); if (w.length < 2) continue;
      const comma = groupsBy(span, ","), parts = comma.length > 1 ? comma.map((g) => g.map((r) => r.form).join(" ")) : w.map((r) => r.form);
      const said = digits(s.rows.find((r) => r.head === counted.id && r.deprel === "nummod"));
      return { kind: lem(counted), items: parts, order: s.order, count: { stated: said, found: parts.length, agrees: said == null ? null : said === parts.length } };
    }
  }
  gaps.push({ kind: "no_items", detail: "no quoted list, or list after a colon, in a sentence that counts its members" });
  return null;
}

function readHolding(sents, items, reader, gaps) {
  for (const s of sents) {
    if (s.order <= items.order) continue;
    const groups = coordinatedNames(s.rows); if (!groups.length) continue;
    const agents = groups[0].map((r) => r.form), root = rootOf(s.rows);
    const partNoun = s.rows.find((r) => r.upos === "NOUN" && reader.parts[lem(r)] && s.rows.some((c) => c.head === r.id && c.deprel === "nummod"));
    const source = s.rows.find((r) => r.upos === "NOUN" && lem(r) === items.kind && r.head && s.rows.some((p) => p.id === r.head && p.upos === "NUM"));
    if (root && partNoun && source) return { agents, partKind: lem(partNoun), decomposes: reader.parts[lem(partNoun)], order: s.order, verb: lem(root) };
    gaps.push({ kind: partNoun ? "holding_source_not_read" : "holding_not_read", detail: `${agents.join(", ")} are named together, but the sentence does not say each holds one part (a noun the reader knows how to take apart: ${Object.keys(reader.parts).join(", ")}) of one of the ${items.kind}s`, sentence: s.order });
    return { agents, partKind: null, decomposes: null, order: s.order, verb: root ? lem(root) : null };
  }
  gaps.push({ kind: "no_agents", detail: "no sentence names two or more people together after the list" });
  return null;
}

function readDialogue(sents, agents, items, reader, gaps) {
  const turns = [], isEp = (r) => reader.epistemic.includes(lem(r));
  let asked = null, lastQuery = null;   // `asked`: a question put to someone and not yet answered; `lastQuery`: what was last asked, which "the same question" repeats
  for (const s of sents) {
    if (s.order <= items.order) continue;
    const eps = s.rows.filter((r) => r.upos === "VERB" && isEp(r));
    const label = s.rows[0]?.upos === "PROPN" && s.rows[1]?.upos === "PUNCT" && s.rows[1]?.form === ":";   // "Albert: I don't know ..."
    if (label || eps.length > 1) { gaps.push({ kind: "compound_announcement_not_read", detail: label ? "a statement made as `Name: ...`, with more than one claim in it" : "a sentence with more than one claim about what is known (a conjunction, or a claim about someone else's knowledge)", sentence: s.order }); continue; }
    if (eps.some((e) => s.rows.some((r) => r.upos === "PROPN" && r.deprel === "nsubj" && r.head === e.id)) && !quotedSpans(s.rows).length) { gaps.push({ kind: "knowledge_about_another_not_read", detail: "a claim about what another person knows", sentence: s.order }); continue; }
    // a question, quoted: "Albert, do you know the word?"
    const q = quotedSpans(s.rows).find((sp) => sp.some((r) => r.form === "?"));
    const root = rootOf(s.rows);
    if (q) {
      const to = q.find((r) => r.upos === "PROPN" && r.deprel === "vocative"), pred = q.find((r) => r.upos === "VERB" && (r.deprel === "parataxis" || r.deprel === "root" || r.head === 0) || (r.upos === "VERB" && isEp(r)));
      const obj = pred && q.find((r) => r.head === pred.id && r.deprel === "obj");
      if (!to || !pred || !obj) { gaps.push({ kind: "question_not_read", detail: "a quoted question without a named addressee, a verb and an object", sentence: s.order }); asked = null; continue; }
      if (!isEp(pred)) { gaps.push({ kind: "predicate_not_epistemic", detail: `the verb “${lem(pred)}” is not one the reader declares as being about knowing (${reader.epistemic.join(", ")})`, sentence: s.order }); asked = null; continue; }
      if (lem(obj) !== items.kind) { gaps.push({ kind: "question_about_other_kind", detail: `asked about the ${lem(obj)}, not the ${items.kind}`, sentence: s.order }); asked = null; continue; }
      asked = { addressee: to.form, query: { pred: lem(pred), obj: lem(obj) }, order: s.order }; lastQuery = asked.query; continue;
    }
    // the same question, put to someone else: "she asks Cheryl the same question"
    const same = s.rows.find((r) => r.upos === "NOUN" && s.rows.some((c) => c.head === r.id && c.deprel === "amod" && reader.sameAs.includes(lem(c))));
    const target = same && s.rows.find((r) => r.upos === "PROPN" && (r.deprel === "iobj" || r.deprel === "obj") && r.head === root?.id);
    if (target) { if (!lastQuery) { gaps.push({ kind: "same_question_without_a_question", detail: "“the same question” with no earlier question to repeat", sentence: s.order }); continue; } asked = { addressee: target.form, query: lastQuery, order: s.order }; continue; }
    // an answer: an interjection in a sentence after a question; it is the addressee's, whatever pronoun the sentence uses
    const reply = s.rows.find((r) => r.upos === "INTJ");
    if (reply) {
      if (!asked) { gaps.push({ kind: "reply_without_question", detail: "an answer with nothing asked before it", sentence: s.order }); continue; }
      const named = s.rows.find((r) => r.upos === "PROPN" && r.deprel === "nsubj");
      if (named && named.form !== asked.addressee) { gaps.push({ kind: "reply_by_another", detail: `${named.form} answers a question put to ${asked.addressee}`, sentence: s.order }); asked = null; continue; }
      turns.push({ agent: asked.addressee, query: asked.query, reply: String(reply.form).toLowerCase(), asked: asked.order, answered: s.order }); asked = null;
    }
  }
  return turns;
}

function readQuestion(sents, items, gaps) {
  for (const s of [...sents].reverse()) {
    const root = rootOf(s.rows);
    if (root?.upos === "NOUN" && s.rows.some((r) => r.deprel === "cop" && r.head === root.id) && s.rows.some((r) => r.upos === "PRON" && r.deprel === "nsubj" && r.head === root.id)) {
      if (lem(root) === items.kind) return { about: "item", order: s.order };
      gaps.push({ kind: "question_target_unknown", detail: `the question asks about the ${lem(root)}, not the ${items.kind}`, sentence: s.order }); return null;
    }
  }
  gaps.push({ kind: "no_question", detail: "no closing question of the form “What is the X?”" }); return null;
}

// ---------------------------------------------------------------------------------------------------------------- the readings

const perms = (n, k, used = []) => (used.length === k ? [used] : Array.from({ length: n }, (_, i) => i).filter((i) => !used.includes(i)).flatMap((i) => perms(n, k, [...used, i])));
const product = (n, k) => (k === 0 ? [[]] : product(n, k - 1).flatMap((t) => Array.from({ length: n }, (_, i) => [...t, i])));
const HOLDINGS = Object.freeze([
  { id: "distinct", reading: "each holds a different letter of the one word, in any order", places: (n, k) => perms(n, k) },
  { id: "positional", reading: "the first holds the first letter, the second the second, and so on", places: (n, k) => (n >= k ? [Array.from({ length: k }, (_, i) => i)] : []) },
  { id: "independent", reading: "each holds any letter of the one word, and two may hold the same one", places: (n, k) => product(n, k) },
]);
const MAX_WORLDS = 200000;

function worldsOf(holding, items, agents) {
  const out = [];
  for (const item of items.items) {
    const parts = [...item.split(" ").join("")];
    for (const at of holding.places(parts.length, agents.length)) {
      const held = {}, place = {}; agents.forEach((a, i) => { held[a] = parts[at[i]]; place[a] = at[i]; });
      out.push({ item, held, place });
      if (out.length > MAX_WORLDS) return null;
    }
  }
  return out;
}

/** a spec is data: { worlds, observes: { agent: path }, announcements: [{ agent, says, about }], question: path } */
export function instantiate(spec) {
  const at = (w, path) => path.reduce((x, k) => x?.[k], w);
  const model = makeModel(spec.worlds, Object.fromEntries(Object.entries(spec.observes).map(([a, p]) => [a, (w) => at(w, p)])));
  const q = (w) => at(w, spec.question), name = "the word";
  const steps = spec.announcements.map((s) => (s.says === "knows" ? saysKnows(s.agent, q, name) : saysDoesNotKnow(s.agent, q, name)));
  return { model, steps, question: q };
}
export function solve(spec) {
  const { model, steps, question } = instantiate(spec), r = run(model, steps, { question });
  const answers = r.answers.map((a) => a.value);
  const standing = r.inconsistent || !answers.length ? "refuted" : answers.length === 1 ? "holds" : "open";
  return { standing, answers, worldsLeft: r.final.worlds.length, inconsistent: r.inconsistent, trace: r.trace.map((t) => ({ step: t.label, before: t.before, after: t.after, answers: t.answers })) };
}

const RULE = "a puzzle presupposes that its own question has exactly one answer: one answer holds, none refutes, several leave it open";

// ---------------------------------------------------------------------------------------------------------------- the door

export function readPuzzle(sentences, { reader = READER } = {}) {
  const sents = (sentences ?? []).map((s, i) => ({ order: s.order ?? i, text: s.text ?? null, rows: s.rows ?? [] })).filter((s) => s.rows.length);
  const gaps = [], read = {};
  const items = readItems(sents, gaps); if (!items) return { ok: false, gap: gaps[0], gaps, read, candidates: [], resolved: null, rule: RULE };
  read.items = { kind: items.kind, items: items.items, count: items.count, order: items.order };
  const hold = readHolding(sents, items, reader, gaps); if (hold) read.agents = hold.agents, read.holding = { partKind: hold.partKind, order: hold.order };
  const agents = hold?.agents ?? [];
  const turns = agents.length ? readDialogue(sents, agents, items, reader, gaps) : [];
  read.turns = turns;
  const question = readQuestion(sents, items, gaps); if (question) read.question = question;
  if (agents.length && !turns.length && !gaps.length) gaps.push({ kind: "no_dialogue", detail: "nobody is asked anything and answers" });
  // what could not be read stops the run: a reading built on half a scene would be a guess
  const unread = gaps.some((g) => ["compound_announcement_not_read", "knowledge_about_another_not_read", "question_not_read", "predicate_not_epistemic", "question_about_other_kind", "reply_by_another", "reply_without_question", "same_question_without_a_question"].includes(g.kind));
  if (!hold?.partKind || !turns.length || !question || unread) return { ok: false, gap: gaps[0] ?? { kind: "not_read", detail: "the scene is incomplete" }, gaps, read, candidates: [], resolved: null, rule: RULE };
  const unknownAgent = turns.find((t) => !agents.includes(t.agent)); if (unknownAgent) { gaps.push({ kind: "asked_a_stranger", detail: `${unknownAgent.agent} answers but was not one of the ${agents.join(", ")}` }); return { ok: false, gap: gaps.at(-1), gaps, read, candidates: [], resolved: null, rule: RULE }; }
  const forms = [...new Set(turns.map((t) => t.reply))]; if (forms.length > 3) { gaps.push({ kind: "too_many_reply_forms", detail: forms.join(", ") }); return { ok: false, gap: gaps.at(-1), gaps, read, candidates: [], resolved: null, rule: RULE }; }
  const polarities = Array.from({ length: 2 ** forms.length }, (_, m) => Object.fromEntries(forms.map((f, i) => [f, (m >> i) & 1 ? "does_not_know" : "knows"])));
  const candidates = []; let id = 0;
  for (const h of HOLDINGS) {
    const worlds = worldsOf(h, items, agents);
    if (!worlds) { gaps.push({ kind: "too_many_worlds", detail: `the reading “${h.id}” has more than ${MAX_WORLDS} worlds` }); continue; }
    for (const pol of polarities) {
      const spec = { worlds, observes: Object.fromEntries(agents.map((a) => [a, ["held", a]])), announcements: turns.map((t) => ({ agent: t.agent, says: pol[t.reply], about: "item" })), question: ["item"] };
      const out = solve(spec), means = forms.map((f) => `“${f}” means ${pol[f] === "knows" ? "they know" : "they do not know"} the ${items.kind}`).join(", ");
      candidates.push({ id: `c${++id}`, holding: h.id, polarity: pol, reading: `${h.reading}; ${means}`, worlds: worlds.length, spec, ...out });
    }
  }
  const holds = candidates.filter((c) => c.standing === "holds"), agree = new Set(holds.map((c) => JSON.stringify(c.answers)));
  const resolved = holds.length && agree.size === 1 ? { candidate: holds.length === 1 ? holds[0].id : holds.map((c) => c.id), answer: holds[0].answers[0], alone: holds.length === 1 } : null;
  if (!holds.length) gaps.push({ kind: "no_reading_gives_an_answer", detail: "every reading leaves none or several" });
  else if (agree.size > 1) gaps.push({ kind: "readings_disagree", detail: holds.map((c) => `${c.id}: ${c.answers[0]}`).join("; ") });
  return { ok: !!resolved, gap: resolved ? null : gaps.at(-1) ?? null, gaps, read, candidates, resolved, rule: RULE };
}
