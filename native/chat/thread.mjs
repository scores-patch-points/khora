// native/chat/thread.mjs — A CONVERSATION AS A FOLD, answered by the same engine as the book.
//
// What the user SAYS is read, in order, through khora's one door (reading.js rowsOfFor: the UD codec and the kāraka labels), cut into
// sentences by the reader's own splitter, folded into one whole (text-mereology) and one cast (referents-in-order), and ingested by
// engine.mjs, the code the book panel runs. What the user ASKS is answered from that fold, in this order, and each step says what it
// used (the trace), so every reply is a mechanical consequence of what was said:
//   meta        "are you sure?"            what the last answer rested on
//   time        "what day is it?"          the clock (a code-giver), not the fold
//   identity    "who is he?" "who is Mina?" the referent's profile; a pronoun is bound by the cast (the question is probed as the next
//                                           sentence of the thread, causally: nothing after it is used)
//   relational  "who gave Mina the book?"  the engine's answer over the kāraka frames, matched by REFERENT, with its sentence
//   reference   "who is Tolstoy?"          the name is unknown to the thread: ask the givers (Wikidata), label it so
//   definition  "what is a dog?"           the givers' definition (kaikki / hyperlexicon), label it so
// No model anywhere. The fold of an unchanged thread is not recomputed: asking never changes it (state hash), and a statement
// re-folds the whole thread, which is milliseconds at conversation size.
import { createHash } from "node:crypto";
import { makeEngine } from "./engine.mjs";
import { rowsOfFor } from "../reading.js";
import { splitSentences } from "../adapters/text/spans.js";
import { priorsFor, abbreviationsFor } from "../the-fold/read-core.mjs";
import { mereologyBuilder } from "../adapters/text/text-mereology.mjs";
import { referentsInOrder } from "../adapters/text/referents-in-order.mjs";
import { proformsOfParse, featsOf } from "../adapters/text/gender-from-corpus.js";
import { classifyWord } from "../adapters/text/wordclass.js";
import { loadNameGender, MIN_EVIDENCE } from "../adapters/text/name-gender.js";
import { makeIdeation } from "./ideation.mjs";
import { kinRuleOf, lintKinClaim, kinAtom } from "./janus-lint.mjs";
import { makeDoors } from "./doors.mjs";
import { LABEL, MARK_TEXT, marksOf, candidates, judge, takenAs } from "./acts.mjs";
import { settled } from "./hunt-check.mjs";
import { detok } from "./personas.mjs";
// the puzzle reader is another session's organ (pure; imports only the reasoner): without it the door is off and says so
const puzzleOrgan = await import("../organs/puzzle-reader.js").catch(() => null);
// the void hunt (declare what is missing, read whole pages for what fills it) is another session's pair of organs, imported the same way: absent, the door is off and the search door answers
const huntOrgan = await import("../organs/void-hunt.js").catch(() => null), huntSources = await import("../organs/hunt-sources.js").catch(() => null);

const WH = new Set(["who", "whom", "what"]);
const WH_ANY = new Set(["who", "whom", "what", "when", "where", "why", "how", "which"]);
// the English reader's verb that asks for a word's meaning ("what does X mean?"): the answer is in the LOCAL dictionary, so nothing leaves the machine
const DEFINE_VERBS = new Set(["mean"]);
const brief = (x) => { let t; try { t = typeof x === "string" ? x : JSON.stringify(x); } catch { t = String(x); } return t && t.length > 140 ? `${t.slice(0, 139)}…` : t; };

// ARITHMETIC: a tool, not a guess. Tokens come from the reader's rows; a question is a calculation only if EVERY word in it is a number, an
// operator or a filler word of the closed class below ("what is 12 times 7?"); anything else (units, nouns) is not arithmetic. No eval.
const OPS = new Map([["plus", "+"], ["+", "+"], ["minus", "-"], ["-", "-"], ["−", "-"], ["times", "*"], ["multiply", "*"], ["multiplied", "*"], ["x", "*"], ["×", "*"], ["*", "*"], ["divide", "/"], ["divided", "/"], ["over", "/"], ["/", "/"], ["÷", "/"]]);
const FILLER = new Set(["what", "is", "be", "'s", "’s", "the", "by", "equal", "equals", "calculate", "compute", "how", "much", "and", "to", "tell", "me", "=", "?", "of"]);
const num = (t) => { const c = t.split(",").join(""); return c !== "" && !Number.isNaN(Number(c)) ? Number(c) : null; };
export function calculate(rows) {
  const toks = rows.filter((r) => r.upos !== "PUNCT" || OPS.has(r.form) || r.form === "%" || r.form === "=").map((r) => String(r.form).toLowerCase());
  const seq = []; let i = 0, nums = 0;
  while (i < toks.length) {
    const t = toks[i], v = num(t);
    if (v !== null) { if (toks[i + 1] === "%" && toks[i + 2] === "of" && num(toks[i + 3] ?? "") !== null) { seq.push((v / 100) * num(toks[i + 3])); nums += 2; i += 4; continue; } seq.push(v); nums++; i++; continue; }
    if (OPS.has(t)) { seq.push(OPS.get(t)); i++; continue; }
    if (FILLER.has(t) || t === "%") { i++; continue; }
    return null;   // a word that is not arithmetic: this is not a calculation
  }
  if (nums < 2 || typeof seq[0] !== "number" || seq.some((x, k) => (k % 2 === 0) !== (typeof x === "number"))) return null;
  const pass = (ops) => { for (let k = 1; k < seq.length; k += 2) if (ops.includes(seq[k])) { const a = seq[k - 1], b = seq[k + 1]; if (seq[k] === "/" && b === 0) return false; seq.splice(k - 1, 3, seq[k] === "*" ? a * b : seq[k] === "/" ? a / b : seq[k] === "+" ? a + b : a - b); k -= 2; } return true; };
  const expr = toks.join(" ");
  if (!pass(["*", "/"])) return { expression: expr, value: null, error: "division by zero" };
  pass(["+", "-"]);
  return { expression: expr, value: Math.round(seq[0] * 1e9) / 1e9 };
}
// small talk: closed-class words only, and only when the whole message is short
const HELP_TEXT = "I can tell you the date and the time, do arithmetic, define words, look up well-known people, and remember what you tell me and answer questions about it. I can't write, research or act on requests, and there's no language model in me.";
// the English reader's small-talk table (a declared parameter of the English reader, one place): word -> the social reply. Authored chrome.
const SMALL = [[["hello", "hi", "hey", "greeting"], "Hello."], [["thank", "thanks"], "You're welcome."], [["bye", "goodbye"], "Goodbye."], [["help"], HELP_TEXT]];
const NOMINAL = new Set(["PROPN", "NOUN", "PRON"]);
// a REQUEST (an imperative): the reader marks the root verb Mood=Imp, or as a bare infinitive (VerbForm=Inf), and it has no subject, no
// auxiliary and no "to" of its own ("go research it", "tell me a joke"); such a sentence is not a fact and is not read into the fold
const isRequest = (rows, root) => { if (!root || root.upos !== "VERB") return false; const f = featsOf(root.feats); if (f.Mood !== "Imp" && f.VerbForm !== "Inf") return false; return !rows.some((r) => r.head === root.id && ["nsubj", "csubj", "nsubj:pass", "aux", "aux:pass", "mark", "expl"].includes(r.deprel)); };
// trailing characters off a string, without a pattern (the project counts regex applications, and a pattern on text is not how language is read)
const trimEnd = (s, chars) => { let e = String(s).length; while (e > 0 && chars.includes(String(s)[e - 1])) e--; return String(s).slice(0, e); };
const quote = (s) => `“${String(s).trim()}”`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/** makeThread({ hl, know, now }) → { say, ask, state }.  know: the givers (demo/knowledge.mjs makeKnowledge) or null (typed gaps). */
export async function makeThread({ hl, know = null, now = () => new Date(), janus = null, log = null, getJson = undefined } = {}) {
  const parser = await rowsOfFor("eng"), pr = priorsFor("eng"), engine = await makeEngine({ hl });
  const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
  const wordKnown = (r) => { const c = classifyWord(String(r.form).toLowerCase(), { posPrior: pr.posPrior }); return !!c?.found && c.total > 0; };   // a word the reader's part-of-speech prior holds
  // the given-name table (a giver, with its provenance inside the file): a name's lean for he / she until the thread's own pronouns say otherwise
  const table = loadNameGender();
  // a missing prior is a gap said, never a silent degrade (nexus rule 2): without this table no name's gender is known, so no pronoun is steered by a name's lean and the fit of a name
  // to "he" or "she" cannot be checked. It was missing from this checkout for the whole session (found by the other session, 2026-11-23); the state and the pairing say so.
  const nameGenderGap = table ? null : "no table of given names (native/adapters/text/name-gender/eng.json is not in this checkout): a name's gender cannot be checked";
  const genderOf = (words) => { let m = 0, f = 0; for (const w of words ?? []) { const c = table?.words?.[String(w).toLowerCase()]; if (c) { m += c[0]; f += c[1]; } } return m + f >= MIN_EVIDENCE && m !== f ? (m > f ? "m" : "f") : null; };
  const abbr = (t) => abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set;
  const id = `thread:${sha(now().toISOString() + Math.random())}`;
  let text = "", parse = [], folded = "", cast = null, last = null, persona = null;
  // A PERSONA is a prompt read as a document ABOUT the assistant: its sentences about the protagonist are read into a fold of their own (as the
  // prompt's words, door: given), and a question about "you" is asked of THAT fold with "you" turned into the persona's name. No model: what the
  // persona can say about itself is what its prompt says.
  let personaFold = null;
  const setPersona = async (pz) => {
    persona = pz ?? null; personaFold = null;
    if (pz?.text && pz.name) { const f = await makeThread({ hl }); await f.say(pz.text, { given: `${pz.label ?? pz.name}'s prompt` }); personaFold = f; }
  };
  // ideation: candidates put forward, tested, and read back off the shared log (ideation.mjs). Needs the log; without janus mounted the
  // candidates are still written but nothing is judged, and the reply says nothing was linted.
  const ideation = log ? makeIdeation({ threadId: id, h: log, janus }) : null;
  const givenAt = new Map();            // order of a sentence of the thread -> the giver that supplied it (not the user): "Wikidata"
  const kinFacts = () => [];            // kin facts the thread holds, as janus facts: NOT EXTRACTED YET (pin: janus scripts/kinship/bind-kin.mjs reads them from text)
  // DOORS (doors.mjs): the declared ways out of the thread. Not knowing is the signal to use one: a gap with a shape that a door fills is
  // researched by the chat itself, and `pending` is the open gap "go research it" means.
  const qids = new Map();               // lower-cased name -> Wikidata id, set when a door found the person
  const setQid = (names, qid) => { for (const n of names) if (n && qid) qids.set(String(n).toLowerCase(), qid); };
  const doors = makeDoors({ know, janus, now, reason: !!puzzleOrgan, hunt: !!(huntOrgan && huntSources), ...(getJson ? { getJson } : {}), calculate, rowsOf: (s) => parser.rowsOf(s) ?? [], sentences: (t) => splitSentences(t, { abbreviations: abbr(t) }).map((c) => c.text), threadId: id, log });
  const puzzleOf = (text) => {
    if (!puzzleOrgan) return null;
    const sents = splitSentences(String(text ?? ""), { abbreviations: abbr(String(text ?? "")) }).map((c, i) => ({ order: i, text: c.text, rows: parser.rowsOf(c.text) ?? [] }));
    if (sents.length < 3) return null;
    const r = puzzleOrgan.readPuzzle(sents, { reader: puzzleOrgan.READER });
    return r?.read?.items?.items?.length >= 2 && r?.read?.agents?.length >= 2 ? r : null;   // a list of things and at least two people: the scene of a puzzle
  };
  const givenPersons = new Set();        // refs a giver confirmed as people (the person door: Wikidata "instance of human"): a better candidate for he or she than a being of unknown kind
  const told = new Map();               // ref -> "m" | "f": a class the user settled, by answering "Do you mean ...?" (presented evidence, never a guess)
  // WHO A PRONOUN MEANS. A being's class (m / f) is known from what the user settled, from the pro-forms the thread attached to it, or from the given-name table if there is one. A man with
  // no evidence about two people does not pick the first: "Pierre met Natasha. She smiled." leaves "she" OPEN between them, and he asks (the other session's probe: with no table the chat bound
  // the pronoun to the first-named person whatever its gender, 3 of 8 right). A being that only ever fills a place (a locus) is not a candidate for he or she.
  // the class a pronoun FORM carries is read off the thread's own rows (the reader's Gender feature on a third-person pronoun), never listed here; a pro-form the clause attached to a being
  // ("Pierre took HIS hat") is evidence even when it is the only one: a sign test needs several, a man needs one
  const proformEvidence = (b) => { const cls = new Map(); for (const p of parse) for (const r of p.rows) if (r.upos === "PRON") { const F = featsOf(r.feats); if (F.Person === "3" && (F.Gender === "Masc" || F.Gender === "Fem")) cls.set(String(r.form).toLowerCase(), F.Gender === "Masc" ? "m" : "f"); }
    let m = 0, f = 0; for (const [form, n] of b.proformForms ?? []) { const c = cls.get(String(form).toLowerCase()); if (c === "m") m += n; else if (c === "f") f += n; } return m > f ? "m" : f > m ? "f" : null; };
  const classOfBeing = (b) => told.get(b.ref) ?? (b.proform && !b.proform.contested ? b.proform.cls : null) ?? proformEvidence(b) ?? genderOf((b.forms ?? []).flatMap(([f]) => String(f).split(" ")));
  const placeOnly = (ref) => { const uses = engine.S.framesOfRef?.get(ref) ?? []; return uses.length > 0 && uses.every((u) => u.label === "adhikaraṇa"); };
  const listOr = (xs) => (xs.length < 2 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1)}`);
  const pronounInfo = (F, order) => {
    const cls = F.Gender === "Masc" ? "m" : F.Gender === "Fem" ? "f" : null; if (!cls || F.Person !== "3" || F.PronType !== "Prs") return null;
    const names = (cast?.referents ?? []).filter((b) => b.kind === "name" && b.first <= order && !placeOnly(b.ref));
    const fits = names.filter((b) => { const c = classOfBeing(b); return c == null || c === cls; }), sure = fits.filter((b) => classOfBeing(b) === cls);
    // evidence in tiers: the class is known (settled, a pro-form, a table) > a giver says it is a person > nothing is known; the best non-empty tier decides, and only a tie inside it is open
    const known = fits.filter((b) => givenPersons.has(b.ref));
    if (!sure.length && known.length === 1) return { cls, open: false, ref: known[0].ref, candidates: [{ ref: known[0].ref, label: known[0].forms[0][0] }] };
    const cand = (xs) => xs.map((b) => ({ ref: b.ref, label: b.forms[0][0] }));
    if (sure.length === 1) return { cls, open: false, ref: sure[0].ref, candidates: cand(sure) };
    if (sure.length > 1) return { cls, open: true, ref: null, candidates: cand(sure) };
    if (fits.length === 1) return { cls, open: false, ref: fits[0].ref, candidates: cand(fits) };
    if (!fits.length) return { cls, open: false, ref: null, candidates: [] };
    return { cls, open: true, ref: null, candidates: cand(fits) };
  };
  let lastTopic = null;                 // what the chat was last telling the user about: { name, sentences, next } ("say more" goes on about it)
  let asked = null;                     // a question the chat put to the user and is waiting on (mechanic 7): { kind, question, rows, row } — the next fragment is its answer
  let lastAct = null;                   // { claim, orders, dependents }: what the chat took the last message to be, and what was built on it
  const withdrawn = new Set();          // orders of sentences the speaker took back: never an answer
  let msgN = 0;
  let pending = null;                   // { gap, args, question }: the last question no door has filled yet
  let chain = Promise.resolve();        // one message at a time: a slow lookup must not let the next message overtake it (found 2026-11-23)
  const serial = (fn) => (...args) => { const run = chain.then(() => fn(...args)); chain = run.catch(() => {}); return run; };

  const refold = async () => {
    const h = sha(text); if (h === folded) return;   // cached at the current state: an unchanged thread is not folded again
    const whole = mereologyBuilder(text); for (const p of parse) whole.add(p);
    cast = referentsInOrder(parse, { commonNoun, genderOf });
    await engine.ingest(text, { parse, mereology: whole.finish(), cast, proforms: proformsOfParse(parse), timing: {}, parseBy: parser.by ?? null, sentences: parse.map((p) => ({ text: p.text, offset: p.offset, order: p.order })), gaps: [] }, { chapters: [] });
    engine.S.ready = true; folded = h;
  };

  /** say(statement) → { type: "read", text, facts, referents } : read into the fold, in order */
  async function say(statement, { given = null } = {}) {   // `given`: the sentence comes from a giver (Wikidata), not from the user
    const t = String(statement ?? "").trim(); if (!t) return null;
    const base = text ? text.length + 2 : 0; text = text ? `${text}\n\n${t}` : t;
    const first = parse.length, requests = [];
    for (const c of splitSentences(t, { abbreviations: abbr(t) })) {
      const rows = parser.rowsOf(c.text) ?? []; if (!rows.length) continue;
      // an imperative (Mood=Imp, no subject of its own) is a REQUEST, not a fact: it is not read into the fold
      const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
      if (isRequest(rows, root)) { requests.push(c.text); continue; }
      if (given) givenAt.set(parse.length, given);
      parse.push({ order: parse.length, offset: base + c.offset, text: c.text, rows });
    }
    if (parse.length === first) { text = base ? text.slice(0, base - 2) : ""; return (last = { type: "read", handled: true, text: `That reads as a request (${quote(requests[0] ?? t)}), and I can't act on requests: I only read what you tell me and answer questions from it.`, facts: [], referents: [], sentences: 0, requests }); }
    await refold();
    const S = engine.S, EN = engine.EN;
    const facts = S.frames.filter((f) => f.order >= first).map((f) => ({ action: f.form, neg: !!f.neg, order: f.order, roles: f.roles.filter((g) => engine.KARAKAS.includes(g.label)).map((g) => ({ role: EN[g.label] ?? g.label, text: S.rowsOf.get(f.order) ? phrase(f.order, g) : g.head })) }));
    const referents = [...new Set(parse.slice(first).flatMap((p) => p.rows.map((r) => cast.mentionOf[`${p.order}.${r.id}`]).filter(Boolean)))].map((ref) => ({ ref, label: S.refByRef.get(ref)?.forms?.[0]?.[0] ?? ref, kind: S.refByRef.get(ref)?.kind ?? "name" }));
    const asked = requests.length ? `That reads as a request (${quote(requests[0])}), and I can't act on requests: I only read what you tell me and answer questions from it.` : null;
    const heard = parse.length - first;
    const out = { type: "read", handled: true, text: !heard ? asked : facts.length ? (asked ? `Noted. (I set aside ${quote(requests[0])}: it reads as a request, which I can't act on.)` : "Noted.") : "Noted, though I found no action in it to hold.", facts, referents, sentences: heard, requests };
    return given ? out : (last = out);
  }

  // the phrase a role filler covers, as the thread's own words (the span in the thread text)
  const phrase = (order, g) => { const sp = g.span; return sp ? engine.clip(sp, 160) : g.head; };

  /** ask(question) → { type, text, evidence, trace, ... } : answered from the fold; `handled: false` carries a typed gap */
  async function ask(question, opts = {}) {
    const q = String(question ?? "").trim(); await refold();
    const S = engine.S, trace = [], calls = [], introduced = [], cites = [];
    const tool = async (name, args, fn) => { const out = await fn(); calls.push({ name, args, result: brief(out) }); return out; };   // every tool call is recorded and shown
    const qRows = parser.rowsOf(q) ?? [], lemma = (r) => String(r.lemma ?? r.form ?? "").toLowerCase();
    const isYou = (r) => (r.upos === "PRON" && featsOf(r.feats).Person === "2") || lemma(r) === "u";
    // a name is a chunk: "Marie Curie" is two tokens, the first a compound of the head ("who is Marie Curie?" must look up the whole name, not "Marie")
    const nameChunk = (r) => { let h = r, n = 0; while (h && ["compound", "flat", "flat:name"].includes(h.deprel) && n++ < 4) h = qRows.find((x) => x.id === h.head) ?? h; return qRows.filter((x) => x === h || (x.head === h.id && ["compound", "flat", "flat:name"].includes(x.deprel) && x.upos === "PROPN")).sort((a, b) => a.id - b.id).map((x) => x.form).join(" "); };
    const order = parse.length;
    // the question is probed as the NEXT sentence of the thread (causal): pronouns in it bind against what was said, and it changes nothing
    const probe = referentsInOrder([...parse, { order, rows: qRows }], { commonNoun, genderOf });
    const refOf = (r) => probe.mentionOf[`${order}.${r.id}`] ?? null;
    // IDEATION: what a reply could say is put forward as candidates, tested by an instrument (janus's organs where they apply), and the
    // standing of each is read back off the log (ideation.mjs). `thought` is that reading, shown with the reply.
    const ideas = [...(opts.actIds ?? [])], idea = (spec) => { const id = ideation.propose(opts.actPremise && spec.door !== "given" ? { ...spec, premises: [...(spec.premises ?? []), opts.actPremise] } : spec); ideas.push(id); return id; };   // what rests on the reading of the message depends on it; a giver's word does not (it stays licensed by the giver)
    const done = (r) => { if (r.handled === false && r.research) pending = { ...r.research, question: q }; else if (r.handled && !["meta", "smalltalk", "door"].includes(r.type)) pending = null; return finish(r); };
    const finish = (r) => ({ question: q, ...r, cites: r.cites ?? (r.from ? [{ label: r.from }] : cites), ...(introduced.length ? { introduced } : {}), ideaIds: ideas, trace, tools: calls, persona: persona ? { name: persona.name, source: persona.source } : null, thought: ideation && ideas.length ? ideation.view(ideas) : null });
    // ---- DOORS: called by hand (/name args) or by the chat itself, because not knowing is the signal (doors.mjs)
    const refByName = (name) => (cast?.referents ?? []).find((b) => (b.forms ?? []).some(([f]) => String(f).toLowerCase() === String(name).toLowerCase()))?.ref ?? null;
    const host = {
      setQid, qidOf: (n) => qids.get(String(n).toLowerCase()) ?? null, call: (name, args) => callDoor(name, args),
      kin: (term, name) => { const ref = refByName(name); return ref ? kinAtom({ janus, term, of: ref, facts: kinFacts() }) : { gap: { kind: "unknown_referent" } }; },
      hunt: async () => {
        const v = huntOrgan.voidOfQuestion(qRows);
        if (!v.ok) return { ok: false, gap: v.gap?.kind ?? "no_void", text: "That isn't a question I can hunt an answer for.", cites: [] };
        const src = huntSources.wikipediaSource({ ...(getJson ? { getJson } : {}), maxWait: 45000 });
        const h = await huntOrgan.huntVoid(v, { sources: [src], budgetMs: 60000, read: (x) => parser.rowsOf(x) ?? [], split: (x) => splitSentences(x, { abbreviations: abbr(x) }).map((c) => c.text) });
        const cite = (list) => { const seen = new Set(); return (list ?? []).map((e) => ({ label: "Wikipedia", id: e.section ? `${e.title} · ${e.section}` : e.title, url: e.url ?? null })).filter((c) => !seen.has(c.id) && seen.add(c.id)); };
        const sure = settled(h);   // a careful reader checks that nobody else has more behind them before he says it
        if (h.unique && !sure.ok) return { ok: false, gap: "several_fill_the_void", text: sure.text, cites: cite((h.candidates ?? []).flatMap((c) => c.evidence ?? [])), data: { hunt: h, rivals: sure.rivals } };
        if (h.unique) return { ok: true, text: `${h.answer.answerText ?? h.answer.answer}.`, cites: cite(h.answer.evidence), data: { hunt: h }, evidence: (h.answer.evidence ?? []).map((e) => ({ order: null, text: e.sentence, given: "Wikipedia" })) };
        const names = (h.candidates ?? []).slice(0, 3).map((c) => c.answer), listed = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
        const said = { several_fill_the_void: `More than one thing fits, and Wikipedia doesn't settle which: ${listed}.`, relation_not_attested: `Wikipedia has ${listed} next to those names, but no sentence says how they're related.`,
          nothing_fills_the_void: "I read what Wikipedia has on it and found nothing that says.", source_rate_limited: "Wikipedia asked me to slow down, so I couldn't read it; try again in a minute." }[h.gap?.kind];
        return { ok: false, gap: h.gap?.kind ?? "no_answer", text: said ?? "I couldn't find that out.", cites: cite((h.trail ?? []).filter((t) => t.title)), data: { hunt: h } };
      },
      reason: async (text) => { const p = puzzleOf(text); if (!p) return { ok: false, gap: "not_a_puzzle", text: "That doesn't read as a puzzle I can set up: I look for a list of things and at least two people." }; const o = puzzleThink(p, text); return { ok: o.handled, gap: o.gap, text: o.text, cites: [{ label: "the epistemic reasoner" }] }; },
    };
    // ---- PUZZLES: the reader lists the readings of the text, the reasoner runs each, the one that leaves a single answer holds (organs/puzzle-reader.js, epistemic-core.js).
    // Each reading is put forward as a candidate and tested; the answer rests on the reading that holds, so janus's spiral suspends it if that reading falls.
    const GAP_WORDS = { holding_not_read: "what each of them holds", compound_announcement_not_read: "what they said about each other's knowledge", no_question: "what is being asked", no_items: "the list of things", no_agents: "who the people are" };
    const puzzleThink = (r, text) => {
      const kind = r.read.items.kind ?? "thing", n = r.read.items.items.length, agents = r.read.agents, plural = (k, c) => (c === 1 ? k : `${k}s`);
      trace.push({ step: "puzzle", items: n, agents, readings: r.candidates?.length ?? 0, resolved: r.resolved?.answer ?? null });
      const witness = `${id}:message${order}#0-${Math.max(1, String(text).length)}`, ids = new Map();
      if (ideation) for (const c of r.candidates ?? []) {
        const cid = idea({ label: c.reading, relation: { subject: "the puzzle", verb: "is read as", object: c.reading }, door: "presented", witnesses: [witness] }); ids.set(c.id, cid);
        const by = "the epistemic reasoner (possible worlds, public announcements)", left = c.answers?.length ?? 0;
        ideation.assess(cid, c.standing === "holds" ? { verdict: "supported", method: "deduction", by, basis: `this reading leaves one answer: ${c.answers[0]}`, license: "a puzzle presupposes that its own question has exactly one answer" }
          : c.standing === "refuted" ? { verdict: "refuted", method: "deduction", by, basis: "this reading leaves no answer" } : { verdict: "unresolved", method: "deduction", by, basis: `this reading leaves ${left} answers` });
      }
      if (r.resolved) {
        const holder = (r.candidates ?? []).find((c) => c.id === r.resolved.candidate), steps = holder?.trace ?? [], turns = r.read.turns ?? [];
        if (ideation && ids.has(r.resolved.candidate)) { const a = idea({ label: `the ${kind} is ${r.resolved.answer}`, relation: { subject: `the ${kind}`, verb: "is", object: String(r.resolved.answer) }, door: "induced", premises: [ids.get(r.resolved.candidate)] }); ideation.assess(a, { verdict: "supported", method: "deduction", by: "the epistemic reasoner", basis: "the one answer the supported reading leaves", license: "run over every possible world, not narrated" }); }
        const path = steps.length && turns.length === steps.length ? ` After ${turns.map((t, i) => `${t.agent} said ${t.reply}, ${steps[i].answers} ${plural(kind, steps[i].answers)} ${steps[i].answers === 1 ? "was" : "were"} still possible`).join("; after ")}.` : "";
        return { handled: true, gap: null, text: `${String(r.resolved.answer)[0].toUpperCase()}${String(r.resolved.answer).slice(1)}.${path}` };
      }
      const open = (r.candidates ?? []).filter((c) => c.standing === "open").length, what = r.gap ? `not ${GAP_WORDS[r.gap.kind] ?? r.gap.kind.split("_").join(" ")}` : (r.candidates ?? []).some((c) => c.standing === "holds") ? "but more than one reading holds" : open ? `but ${open} readings leave more than one answer` : "but no reading of it leaves an answer";
      return { handled: false, gap: r.gap?.kind ?? "no_unique_reading", text: `I read ${n} ${plural(kind, n)} and ${agents.length} people (${agents.join(", ")}), ${r.gap ? "but" : ""} ${what}.`.split(" ,").join(",").split("  ").join(" ") };
    };
    const callDoor = async (name, args) => {
      const working = doors.get(name)?.working?.(args); if (working) opts.onStatus?.(working);   // what a chat app shows while it looks something up
      const out = await doors.call(name, args, host);
      calls.push({ name: `/${name}`, args: { args }, result: out.ok ? brief(out.text) : `gap: ${out.gap}` });
      for (const c of out.cites ?? []) if (!cites.some((x) => x.label === c.label && x.id === c.id)) cites.push(c);
      // what a giver brought back enters the thread AS the giver's (door: given), so it can be pointed at and quoted with its source
      if (out.ok && out.introduce) for (const g of [].concat(out.introduce)) { const read = await say(g.text, { given: g.source }); introduced.push({ ...g, read }); }
      return out;
    };
    let lastOut = null;
    /** a name the thread has not met: the person door (Wikidata), as a candidate a giver licenses */
    const reference = async (name) => {
      let out = null;
      for (const dn of doors.fillers("unknown_referent")) { out = lastOut = await callDoor(dn, name); if (out.ok) { out.door = dn; break; } }
      if (!out?.ok) return null;
      if (out.door === "wiki") return done({ type: "reference", handled: true, text: out.text, cites: out.cites });   // not a person: an article, read into the thread
      trace.push({ step: "reference", giver: "Wikidata (wbsearchentities + P31)", out: out.data?.label });
      lastTopic = { name: out.data?.label ?? name }; { const rr = refByName(out.data?.label ?? name) ?? refByName(name); if (rr) givenPersons.add(rr); }   // the giver said this name is a person: the cast knows it as the label or as the short name the user typed
      if (ideation) {
        const c = idea({ label: out.text.slice(0, -1), relation: { subject: out.data?.label ?? name, verb: "is", object: out.text.slice(out.text.indexOf(": ") + 2, -1) || "a person" }, door: "given", giver: `wikidata:${out.data?.id ?? "unidentified"}` });
        ideation.assess(c, { verdict: "supported", method: "deduction", by: "Wikidata (wbsearchentities, instance of human)", basis: "a giver's description of the entity", license: "a named giver's own record: it licenses the claim, it is not witnessed in the thread" });
      }
      return done({ type: "reference", handled: true, text: out.text, from: "Wikidata", cites: out.cites });
    };
    // the address of a sentence of the thread: `thread#from-to` (a span of the thread's own text)
    const spanOfOrder = (o) => { const p = parse.find((x) => x.order === o); return p ? `${id}#${p.offset}-${p.offset + Math.max(1, p.text.length)}` : null; };
    /** "who was his wife?": a possessed noun whose owner is in the thread. The candidates are put forward and janus tests them; the
     *  answer is a fact the thread holds, or a typed gap janus names. Returns null when the noun is not a kin term (the caller goes on). */
    const possessed = async (tgt, owner) => {
      const term = lemma(tgt), ref = refOf(owner), being = ref ? S.refByRef.get(ref) : null;
      const known = !!being && (probe.referents.find((x) => x.ref === ref)?.first ?? order) < order;
      trace.push({ step: "possession", term, owner: owner.form, bound: ref, known });
      if (!known) return done({ type: "identity", handled: false, gap: "no_antecedent", text: owner.upos === "PRON" ? "I don't know who you mean: nothing said so far gives that pronoun someone to point to." : `I haven't been told about ${owner.form}.` });
      if (!janus?.on || !ideation) return null;   // no janus mounted: the old paths run, and the trace says nothing was linted
      const rule = kinRuleOf(janus, term); if (!rule) return null;
      const name = being.forms[0][0], cop = qRows.find((r) => r.deprel === "cop"), copForm = String(cop?.form ?? "is").toLowerCase();
      const sentences = [...(S.sentencesOfRef.get(ref) ?? [])].sort((a, b) => a - b), given = sentences.filter((o) => givenAt.has(o)), told = sentences.filter((o) => !givenAt.has(o));
      // the binding is khora's own reading of the thread, so it is witnessed by the spans where the referent is mentioned (a sentence a giver
      // supplied is a span of the thread too, and the candidate says the door it came through)
      const grounds = { witnesses: [...told, ...given].slice(0, 2).map(spanOfOrder).filter(Boolean), ...(!told.length && given.length ? { giver: `given:${givenAt.get(given[0])}` } : {}) };
      // 1. what the possessor stands for (the cast's binding)
      const bind = idea({ label: `“${owner.form}” stands for ${name}`, relation: { subject: owner.form, verb: "stands for", object: name }, door: told.length ? "presented" : "given", ...grounds });
      ideation.assess(bind, { verdict: "supported", method: "testimony", by: "khora referents-in-order (the cast)", basis: `the cast binds “${owner.form}” to ${name}`, witnesses: grounds.witnesses });
      // 2. the answer the identity route would give if it took the owner for the thing asked about: janus tests it as a fact
      const self = idea({ label: `${name} is ${name}'s ${term}`, relation: { subject: `${name}'s ${term}`, verb: "is", object: name }, door: "induced", premises: [bind] });
      lintKinClaim({ janus, ideation, id: self, fact: { rel: rule.rel, a: ref, b: ref, giver: rule.giver, witness: rule.witness } });
      // 3. what janus's rules (read from the giver's gloss of the term) and the facts the thread holds say
      const atom = kinAtom({ janus, term, of: ref, facts: kinFacts() });
      const some = idea({ label: `${name} has a ${term} the thread names`, relation: { subject: name, verb: `has a ${term}`, object: "someone the thread names" }, door: "presented", premises: [bind] });
      calls.push({ name: "janus.kinship", args: { term, of: name }, result: atom.gap ? `gap: ${atom.gap.kind}` : `${atom.answers.length} answer(s)` });
      if (atom.gap) {
        ideation.assess(some, { verdict: "unresolved", method: "deduction", by: `janus kinship (rule for “${term}” read from ${rule.giver})`, basis: `no giver states a ${rule.rel.split("_")[0]} of ${name} (${atom.gap.kind})`, detail: { gap: atom.gap.kind, opinionFillable: atom.gap.opinionFillable } }, { owner: "janus" });
        // NOT KNOWING IS THE SIGNAL: the gap has a shape, and the doors that declare that shape are tried without being asked
        const shape = atom.gap.kind, fill = doors.fillers(shape), tried = [];
        trace.push({ step: "research", gap: shape, doors: fill });
        for (const dn of fill) {
          const out = await callDoor(dn, `${term} of ${name}`);
          if (!out.ok) { tried.push(out); continue; }
          const names = out.data.answers.map((x) => x.label), got = idea({ label: `${name}'s ${term} is ${names.join(" and ")}`, relation: { subject: `${name}'s ${term}`, verb: "is", object: names.join(" and ") }, door: "given", giver: `wikidata:${out.data.qid}:${out.data.props.join("/")}` });
          // janus takes a kin FACT only from a span of text; a giver's record stands as a claim the giver licenses (the spiral's `licensed`)
          ideation.assess(got, { verdict: "supported", method: "deduction", by: "Wikidata (wbgetentities: claims)", basis: `Wikidata lists ${names.join(" and ")} as ${name}'s ${term}`, license: "a named giver's own record: it licenses the claim, it is not witnessed in the thread" });
          return done({ type: "kin", handled: true, ref, text: out.text, cites: out.cites });
        }
        const base = `I haven't been told who ${name}'s ${term} ${copForm}`;
        return done({ type: "kin", handled: false, gap: atom.gap.kind, ref, text: tried.length ? `${base}, and I went to look: ${tried.at(-1).text}` : `${base}.`, research: { gap: shape, args: `${term} of ${name}` } });
      }
      return null;
    };

    // a message that is a whole puzzle goes to the reason door
    if (opts.door) { const out = await callDoor(opts.door, q); return done({ type: "puzzle", handled: out.ok, gap: out.ok ? null : out.gap, text: out.text, cites: out.cites ?? [] }); }
    // slash: a door called by hand
    if (q.startsWith("/")) {
      const parts = q.slice(1).trim().split(" ").filter(Boolean), cmd = (parts[0] ?? "").toLowerCase(), rest = parts.slice(1).join(" ");
      trace.push({ step: "slash", door: cmd || "doors" });
      if (!cmd || cmd === "doors" || cmd === "help") {
        const rows = doors.list();
        return done({ type: "door", handled: true, doors: rows, text: ["Doors I can use. A slash calls one by hand. When I can't answer something I try the doors that fill that kind of gap myself, without being asked.", ...rows.map((d) => `${d.usage}: ${d.about}${d.on ? "" : ` (off: ${d.why})`}`), "/research [question]: look again at what I couldn't answer, or at the question you give."].join("\n") });
      }
      if (cmd === "research") { if (rest) return ask(rest, { onStatus: opts.onStatus }); if (pending) return ask(pending.question, { onStatus: opts.onStatus }); return done({ type: "door", handled: true, text: "There's nothing I'm missing right now. When I can't answer something I go and look for it myself." }); }
      const out = await callDoor(cmd, rest);
      return done({ type: "door", handled: out.ok, gap: out.ok ? null : out.gap, text: out.text, cites: out.cites ?? [] });
    }
    // a request is acted on when it is about what is not known: an object that is a pronoun (or none) means the open gap; a name the thread has not met is a gap of its own
    if (opts.request) {
      const root = qRows.find((r) => r.head === 0 && r.upos !== "PUNCT");
      const nominal = qRows.filter((r) => r.id !== root?.id && (r.upos === "PROPN" || r.upos === "NOUN")), propn = nominal.find((r) => r.upos === "PROPN");
      const pronounObj = qRows.find((r) => r.upos === "PRON" && r.deprel === "obj" && !isYou(r) && featsOf(r.feats).Person !== "1");
      trace.push({ step: "request", about: nominal.length ? nominal.map((r) => r.form).join(" ") : pronounObj ? "the open gap or the last topic" : "going on" });
      // GOING ON. A man who has just told someone about Tolstoy, and is told "say more", says more about Tolstoy: he opens the book and reads on. A request with no thing of its own in it
      // ("say more", "go on", "continue", "tell me more") continues the last topic; "research it" is the open gap if there is one, else the last topic.
      const goOn = async () => {
        if (!lastTopic) return done({ type: "request", handled: false, gap: "no_topic", text: "I haven't told you anything yet to go on about. Ask me something." });
        if (!lastTopic.sentences) {
          const w = await callDoor("wiki", lastTopic.name);   // reads the opening of the article into the thread, as Wikipedia's words
          if (!w.ok) return done({ type: "request", handled: false, gap: w.gap, text: w.text, cites: w.cites ?? [] });
          lastTopic.sentences = splitSentences(w.introduce.text, { abbreviations: abbr(w.introduce.text) }).map((c) => c.text.trim()).filter(Boolean); lastTopic.next = 0; lastTopic.cites = w.cites;
        }
        const chunk = lastTopic.sentences.slice(lastTopic.next, lastTopic.next + 2); lastTopic.next += 2;
        if (!chunk.length) return done({ type: "request", handled: false, gap: "nothing_more", text: `That's all I've read about ${lastTopic.name}.`, cites: lastTopic.cites ?? [] });
        const out = done({ type: "answer", handled: true, text: chunk.join(" "), evidence: chunk.map((x) => ({ order: null, text: x, given: "Wikipedia" })), cites: lastTopic.cites ?? [] });
        last = out; return out;
      };
      if (!nominal.length && !pronounObj) return goOn();
      if (!nominal.length && pronounObj) { if (pending) return ask(pending.question, { onStatus: opts.onStatus }); if (lastTopic) return goOn(); return done({ type: "request", handled: true, text: "There's nothing I'm missing right now. When I can't answer something I go and look for it myself, so ask me something and I will." }); }
      if (propn && know) { const r = await reference(nameChunk(propn)); return r ?? done({ type: "request", handled: false, gap: lastOut?.gap ?? "no_door", text: lastOut?.text ?? "I could not find out." }); }
      return done({ type: "request", handled: false, gap: "act_not_possible", text: `I can look things up and answer from what I'm told, but I can't do that.` });
    }
    // a persona: a question about "you" is answered by the persona's prompt, before any other route (help, small talk, the clock)
    if (persona && qRows.some((r) => WH.has(lemma(r))) && qRows.some(isYou)) {
      const who = `${persona.label ?? persona.name}'s prompt`, cite = [{ label: who }];
      trace.push({ step: "self", giver: who });
      // "who are you?" / "what are you?": nothing else nominal in the question, so it asks what the persona IS; "what is your favourite colour?" has a noun of its own
      const asksIdentity = qRows.some((r) => r.deprel === "cop") && !qRows.some((r) => (r.upos === "NOUN" || r.upos === "PROPN") && !isYou(r));
      if (asksIdentity && persona.identity) return done({ type: "self", handled: true, text: `I'm ${persona.identity}.`, cites: cite });
      if (personaFold && persona.name) {
        const asked = detok(qRows.map((r) => (isYou(r) ? (r.deprel === "nmod:poss" ? `${persona.name}'s` : persona.name) : r.form)));
        const r = await tool("persona.ask", { question: asked }, () => personaFold.ask(asked));
        if (r.handled) return done({ type: "self", handled: true, text: r.text, evidence: r.evidence ?? [], cites: cite });
      }
      return done({ type: "self", handled: false, gap: "not_in_persona_prompt", text: "That isn't something my instructions say.", cites: cite });
    }
    // meta
    if (qRows.some((r) => lemma(r) === "sure")) {
      trace.push({ step: "meta", used: "the last answer" });
      return done(last?.type === "answer" ? { type: "meta", handled: true, text: last.evidence?.length ? `Yes: ${last.evidence[0].text.length ? quote(last.evidence[0].text) : "it rests on what you told me"}.` : "Yes.", evidence: last.evidence } : { type: "meta", handled: true, text: "I have not answered anything I could check yet." });
    }
    const wh = qRows.find((r) => WH.has(lemma(r)) || ["when", "where", "why", "how"].includes(lemma(r)));
    const wordsOf = qRows.filter((r) => r.upos !== "PUNCT").map(lemma), has = (...ws) => ws.some((w) => wordsOf.includes(w));
    const calc = calculate(qRows);
    if (calc) { await tool("calculate", { expression: calc.expression }, () => calc); return done({ type: "calculation", handled: true, text: calc.error ? `That's a ${calc.error}, so there is no answer.` : `${calc.value.toLocaleString("en-US", { maximumFractionDigits: 9 })}.`, from: "arithmetic" }); }
    // "help", "help me": a longer message that merely contains the word is about something else
    if ((has("help") && wordsOf.length <= 2) || (has("what") && has("can") && has("you", "u") && has("do"))) { trace.push({ step: "help" }); return done({ type: "help", handled: true, text: HELP_TEXT }); }
    if (has("how") && has("you", "u") && wordsOf.length <= 4) return done({ type: "smalltalk", handled: true, text: "I'm a program, so I don't have good days or bad ones, but I'm working." });
    if (wordsOf.length === 1 && WH_ANY.has(wordsOf[0])) return done({ type: "relational", handled: false, gap: "needs_more", text: `${cap(wordsOf[0])} what? Tell me a bit more and I'll try.` });
    // time and place: the clock, a code-giver
    const timeWord = ["day", "time", "date"].find((w) => qRows.some((r) => lemma(r) === w));
    if (timeWord && qRows.some((r) => ["it", "today", "now", "the"].includes(lemma(r)))) {
      const d = await tool("clock", { what: timeWord }, () => now()); trace.push({ step: "time", giver: "the clock (Date)" });
      const t = timeWord === "day" ? `Today is ${d.toLocaleDateString("en-US", { weekday: "long" })}.` : timeWord === "time" ? `It is ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : `The date is ${d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`;
      return done({ type: "time", handled: true, text: t });
    }
    // self, without a persona: "who are you?" ("u" is the one alias of "you" the reader cannot tag). What the system IS is code-given, and says so.
    if (wh && WH.has(lemma(wh)) && qRows.some(isYou)) {
      trace.push({ step: "self", giver: "the system's own description (code)" });
      return done({ type: "self", handled: true, from: "my own description", text: "I'm a program that reads what you tell me into a map of who did what to whom, and answers from it. There is no language model in me: I only know what you've said, plus the dictionary and Wikidata when I have to look something up, and I say when I do." });
    }
    // "what does serendipity mean?": a word's meaning, from the dictionary on this machine (no outside call, and a rare word is what a definition is for)
    { const rt = qRows.find((r) => r.head === 0 && r.upos !== "PUNCT"), subj = rt && DEFINE_VERBS.has(lemma(rt)) ? qRows.find((r) => r.head === rt.id && String(r.deprel).startsWith("nsubj") && !isYou(r) && r.upos !== "PRON") : null;
      if (subj && know) { trace.push({ step: "define", word: lemma(subj) }); const out = await callDoor("define", lemma(subj)); return done({ type: "definition", handled: out.ok, gap: out.ok ? null : out.gap, text: out.text, cites: out.cites ?? [] }); } }
    // identity: who/what is X (X a name, a description, or a pronoun the cast binds)
    const copular = qRows.some((r) => r.deprel === "cop");
    if (wh && WH.has(lemma(wh)) && copular) {
      // the thing asked about is the predicate nominal, never a possessor inside it: in "who was his wife?" it is "wife" (whose owner is
      // "his"), not "his". (Found 2026-11-23: the first nominal was taken, so the question was answered as "who is he?": "tolstoy".)
      const nominals = qRows.filter((r) => r !== wh && NOMINAL.has(r.upos) && (r.upos !== "PRON" || featsOf(r.feats).Person === "3" || featsOf(r.feats).Person === undefined));
      const tgt = nominals.find((r) => r.deprel !== "nmod:poss") ?? nominals[0];
      const owner = tgt && qRows.find((r) => r.head === tgt.id && r.deprel === "nmod:poss");
      if (tgt && owner && lemma(wh) === "who") { const p = await possessed(tgt, owner); if (p) return p; }
      if (tgt && lemma(wh) === "who" && tgt.upos === "NOUN") {
        // "who is the president?": a person asked for by description. The thread answers if it ever tied that description to a name
        // (an apposition, a title, a predicate: "Biden, the president"); otherwise it is a typed gap, and an honest one about time
        const head = lemma(tgt), nom = new Set((cast?.referents ?? []).filter((x) => x.kind === "nominal" && x.head === head).map((x) => x.ref));
        const tie = (cast?.edges ?? []).filter((e) => ["apposition", "predicate", "title"].includes(e.type) && ((nom.has(e.a) && !nom.has(e.b)) || (nom.has(e.b) && !nom.has(e.a)))).map((e) => (nom.has(e.a) ? e.b : e.a)).map((r) => cast.referents.find((x) => x.ref === r)).filter((x) => x && x.kind === "name").sort((a, b) => b.mentions - a.mentions)[0];
        trace.push({ step: "description", head, tied: tie?.ref ?? null });
        if (tie) return done({ type: "identity", handled: true, ref: tie.ref, text: `${tie.forms[0][0]}.`, evidence: [{ order: tie.first, text: S.rowsOf.get(tie.first)?.text }].filter((x) => x.text) });
        return done({ type: "identity", handled: false, gap: "unknown_description", text: `I haven't been told who the ${head} is. If you mean the current one, that changes over time, and I have no source for it.` });
      }
      if (tgt) {
        const pinfo = tgt.upos === "PRON" ? pronounInfo(featsOf(tgt.feats), order) : null;
        if (pinfo?.open) {   // two people it could be, and nothing in the thread says either one's gender: he asks, and uses the answer
          asked = { kind: "which", question: q, rows: qRows, row: tgt.id, cls: pinfo.cls, options: pinfo.candidates };
          trace.push({ step: "identity", target: tgt.form, open: pinfo.candidates.map((c) => c.label) });
          return done({ type: "identity", handled: false, gap: "pronoun_open", text: `Do you mean ${listOr(pinfo.candidates.map((c) => c.label))}?` });
        }
        const ref = pinfo?.ref ?? refOf(tgt), being = ref ? S.refByRef.get(ref) : null, known = !!being && (probe.referents.find((x) => x.ref === ref)?.first ?? order) < order;
        trace.push({ step: "identity", target: tgt.form, bound: tgt.upos === "PRON" ? ref : null, known });
        if (known && S.sentencesOfRef.has(ref)) {
          const p = await engine.wordProfile("", { ref });
          const sents = [...S.sentencesOfRef.get(ref)].sort((a, b) => a - b).slice(0, 3).map((o) => ({ order: o, text: S.rowsOf.get(o)?.text })).filter((x) => x.text);
          const name = being.forms[0][0], lead = p?.portrait?.lead; lastTopic = { name };
          // each sentence under the name of who said it: the user, or the giver that supplied it (Wikidata and Wikipedia are not one voice)
          const groups = []; for (const x of sents) { const who = givenAt.get(x.order) ?? "You told me"; const g = groups.at(-1); if (g && g.who === who) g.texts.push(x.text); else groups.push({ who, texts: [x.text] }); }
          const told = groups.map((g) => `${g.who === "You told me" ? g.who : `${g.who} says`} ${g.texts.map((x) => quote(x)).join(" and ")}`).join(". ");
          const said = `${tgt.upos === "PRON" ? `That would be ${name}.${told ? " " : ""}` : ""}${told || (tgt.upos === "PRON" ? "" : `${name}.`)}`;
          return done({ type: "identity", handled: true, ref, text: said, evidence: sents, profile: { lead, propositions: p?.portrait?.propositions ?? [] } });
        }
        if (tgt.upos === "PRON") return done({ type: "identity", handled: false, gap: "no_antecedent", text: "I don't know who you mean: nothing said so far gives that pronoun someone to point to." });
        if (know && tgt.upos === "PROPN") {   // a name the thread has not met: a gap of shape unknown_referent, filled by the doors that declare it
          const r = await reference(nameChunk(tgt)); if (r) return r;
        }
        if (know && tgt.upos === "NOUN") {
          const d = await tool("define", { word: lemma(tgt) }, () => know.lookup(lemma(tgt))); trace.push({ step: "definition", giver: "kaikki / the hyperlexicon" });
          if (d.primary) return done({ type: "definition", handled: true, text: `${cap(tgt.form)}: ${trimEnd(d.primary, ". \t\n")}.`, from: "the dictionary" });
        }
        return done({ type: "identity", handled: false, gap: "unknown_referent", text: `I haven't been told about ${tgt.upos === "PROPN" ? nameChunk(tgt) : tgt.form}, and no giver I can reach knows it.` });
      }
    }
    // relational: the engine's answer over the frames
    const qNeg = qRows.some((r) => String(r.feats ?? "").split("|").includes("Polarity=Neg"));   // the question's own polarity mark ("Who did not give ...?")
    let a = await tool("recall", { question: q }, () => engine.answer(q, { polarity: true, neg: qNeg, skip: withdrawn }));
    // the thread may hold the question's own participants in a NEGATED clause ("Mina did not give Jonathan a book"): then the answer is "not Mina", with the sentence
    if (!a.answers?.length && !qNeg) {
      const n = await tool("recall", { question: q, polarity: "negated" }, () => engine.answer(q, { polarity: true, neg: true, skip: withdrawn }));
      if (n.answers?.length) {
        const who = [...new Set(n.answers[0].answer.map((x) => x.text))];
        const ev = n.answers.slice(0, 2).map((x) => ({ order: x.order ?? null, text: x.sentence }));
        trace.push({ step: "negated", frames: n.answers.length });
        const out = done({ type: "answer", handled: true, text: who.length ? `Not ${who.join(" or ")}: you told me ${quote(ev[0].text)}` : `No: you told me ${quote(ev[0].text)}`, evidence: ev });
        last = out; return out;
      }
    }
    // what the question is about, by part of speech (no word list): the content words, without the question word, the auxiliaries and the function words
    const topicRows = qRows.filter((r) => !["PRON", "AUX", "PUNCT", "DET", "ADP", "SCONJ", "CCONJ", "PART"].includes(r.upos));
    const topic = topicRows.map((r) => r.form).join(" ") || null;
    // READABLE before anything leaves: the user's words go to an outside service only if the reader knows them (a name, a number, or a word its part-of-speech prior holds). A message in
    // another language or a spelling the reader has never seen is not a question about the world the chat can research: it stays here (and it is a privacy line, not only a quality one).
    const known = (r) => { const c = classifyWord(String(r.form).toLowerCase(), { posPrior: pr.posPrior }); return !!c?.found && c.total > 0; };
    const unreadable = topicRows.filter((r) => r.upos !== "PROPN" && r.upos !== "NUM" && !known(r));
    const looked = []; let lookedOk = false;
    const aboutUs = qRows.some((r) => r.upos === "PRON" && ["1", "2"].includes(featsOf(r.feats).Person));   // a question about you or me is about this chat, not about the world
    // every name the question uses is a referent the thread already holds: the thread has been asked about its own people, and the world cannot say what was said in it
    const names = qRows.filter((r) => r.upos === "PROPN" && r.deprel !== "vocative");
    const allKnown = names.length > 0 && names.every((r) => { const ref = refOf(r); return ref && (probe.referents.find((x) => x.ref === ref)?.first ?? order) < order; });
    // a pronoun nothing in the notebook gives someone to point to ("is it worth doing?", "could that be the problem"): a man asks what it stands for; he does not look the rest up
    const dangling = qRows.filter((r) => r.upos === "PRON" && (featsOf(r.feats).Person === "3" || featsOf(r.feats).PronType === "Dem") && !(refOf(r) && (probe.referents.find((x) => x.ref === refOf(r))?.first ?? order) < order));
    if (!a.answers?.length && topic && !aboutUs && dangling.length) { trace.push({ step: "no_research", why: `“${dangling[0].form}” has nothing in the thread to point to` }); asked = { kind: "antecedent", question: q, rows: qRows, row: dangling[0].id }; return done({ type: "relational", handled: false, gap: "no_antecedent", text: `I don't know what ${quote(dangling[0].form)} stands for: nothing said so far gives it anything to point to. Who or what do you mean?` }); }
    if (!a.answers?.length && topic && !aboutUs && allKnown) trace.push({ step: "no_research", why: "every name in the question is someone the thread already holds" });
    if (!a.answers?.length && topic && !aboutUs && !allKnown && unreadable.length) trace.push({ step: "no_research", why: `words the reader does not know: ${unreadable.map((r) => r.form).join(", ")}`, unreadable: unreadable.length });
    if (!a.answers?.length && topic && !aboutUs && !allKnown && !unreadable.length) {   // NOT KNOWING: the doors that declare this gap's shape go and read, and the question is asked again
      const fill = doors.fillers("no_answer"); trace.push({ step: "research", gap: "no_answer", doors: fill, topic });
      for (const dn of fill) {
        if (dn === "hunt") {   // the hunt answers, or says exactly why it could not; only a question it cannot hunt at all falls through to the plain search
          const w = await callDoor("hunt", topic);
          if (w.ok) {
            if (ideation) { const c = idea({ label: `${trimEnd(q, "?")}: ${w.text.slice(0, -1)}`, relation: { subject: "the answer", verb: "is", object: w.text.slice(0, -1) }, door: "given", giver: "wikipedia" }); ideation.assess(c, { verdict: "supported", method: "deduction", by: "the void hunt (sentences read from Wikipedia)", basis: `a sentence on ${w.cites[0]?.id ?? "Wikipedia"} says it`, license: "a named giver's own text: it licenses the claim, it is not witnessed in the thread" }); }
            const out = done({ type: "answer", handled: true, text: w.text, evidence: w.evidence ?? [], cites: w.cites });
            last = out; return out;
          }
          if (["several_fill_the_void", "relation_not_attested", "nothing_fills_the_void", "source_rate_limited"].includes(w.gap)) return done({ type: "relational", handled: false, gap: w.gap, text: w.text, cites: w.cites ?? [], research: { gap: "no_answer", args: topic } });
          looked.push(w.text); continue;
        }
        const w = await callDoor(dn, topic); if (w.ok) { lookedOk = true; looked.push(w.text.slice(0, -1)); a = await tool("recall", { question: q, after: dn }, () => engine.answer(q, { polarity: true, neg: qNeg, skip: withdrawn })); break; } looked.push(w.text); }
    }
    trace.push({ step: "relational", read: a.read ?? null, answers: a.answers?.length ?? 0 });
    if (a.answers?.length) {
      const top = a.answers[0];
      if (top.confirms) {   // a yes/no question: the thread holds the very event asked about
        const ev = a.answers.slice(0, 2).map((x) => ({ order: x.order ?? null, text: x.sentence }));
        const out = done({ type: "answer", handled: true, text: `Yes: you told me ${quote(ev[0].text)}`, evidence: ev });
        last = out; return out;
      }
      // an answer that is a pronoun is not "She.": the referent it stands for, or an honest "I can't tell which"
      const sayFiller = (x) => {
        if (!x.pron || !x.node) return x.text;
        const dot = x.node.indexOf("."), o = Number(x.node.slice(1, dot < 0 ? undefined : dot)), row = dot < 0 ? null : S.rowsOf.get(o)?.rows?.find((r) => r.id === Number(x.node.slice(dot + 2)));
        const info = row ? pronounInfo(featsOf(row.feats), o) : null;
        if (info?.ref) return S.refByRef.get(info.ref)?.forms?.[0]?.[0] ?? x.text;
        return info?.open ? `${quote(x.text)}, but I can't tell whether that is ${listOr(info.candidates.map((c) => c.label))}` : x.text;
      };
      const phraseOf = top.answer.map(sayFiller).join(" and ");
      const ev = a.answers.slice(0, 3).map((x) => { const pp = parse.find((y) => y.text === x.sentence); return { order: pp?.order ?? null, text: x.sentence, ...(pp && givenAt.has(pp.order) ? { given: givenAt.get(pp.order) } : {}) }; });
      const out = done({ type: "answer", handled: true, text: `${cap(phraseOf)}.`, evidence: ev, answers: a.answers.slice(0, 3).map((x) => x.answer) });
      last = out; return out;
    }
    const gap = a.gaps?.[0];
    return done({ type: "relational", handled: false, gap: gap?.gap ?? "no_answer", text: aboutUs && !a.answers?.length ? "That's about you or me, and I only know what's been said in this chat." : unreadable.length && !a.answers?.length ? "I couldn't read some of those words, so I didn't look anything up." : looked.length ? (lookedOk ? `I haven't been told that, and I went to look: ${looked.at(-1)}, but it doesn't answer it.` : `I haven't been told that, and I couldn't look it up: ${looked.at(-1)}`) : "I haven't been told that.", detail: gap?.detail ?? null, ...(topic ? { research: { gap: "no_answer", args: topic } } : {}) });
  }

  /** turn(message) → the reply to ONE message, whatever it is: small talk, a calculation, a question, or a statement to read into the fold */
  /** a message is READ before it is routed: claims about what it is, each resting on marks, judged by one rule (acts.mjs), put forward as candidates so janus's spiral projects their
   *  standing and a later message can withdraw them. The routing below follows the standing act; nothing is decided in passing. */
  async function turn(message, opts = {}) {
    const t = String(message ?? "").trim(); if (!t) return null;
    const rows = parser.rowsOf(t) ?? [], ws = rows.filter((r) => r.upos !== "PUNCT").map((r) => String(r.lemma ?? r.form).toLowerCase());
    const n = ++msgN, witness = `${id}:m${n}#0-${Math.max(1, t.length)}`, root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
    const cut = splitSentences(t, { abbreviations: abbr(t) });
    // the facts only the English reader can give the acts (acts.mjs reads universal marks and is handed these as booleans)
    const puzzle = !!puzzleOf(t), small = ws.length <= 3 ? SMALL.find(([words]) => words.some((w) => ws.includes(w))) : null, slash = t.startsWith("/");
    const request = !slash && isRequest(rows, root) && rows.filter((r) => r.head === 0 && r.upos !== "PUNCT").length === 1 && cut.length === 1;
    const composite = cut.length > 1 && cut.at(-1).text.trim().endsWith("?") && !cut.slice(0, -1).some((c) => c.text.trim().endsWith("?"));
    // a leading name and comma before a question or a request is who is spoken to (mechanic 10): a deixis, not a referent
    let address = null;
    { const lead = rows[0]?.upos === "INTJ" ? 1 : 0, nm = rows[lead], cm = rows[lead + 1];
      if (nm?.upos === "PROPN" && cm?.form === "," && !rows.some((r) => r.deprel === "conj" && r.head === nm.id)) {
        const rest = t.slice(t.indexOf(",") + 1).trim(), rr = parser.rowsOf(rest) ?? [], rw = rr.filter((r) => r.upos !== "PUNCT").map((r) => String(r.lemma ?? r.form).toLowerCase());
        if (rest && (rest.endsWith("?") || WH_ANY.has(rw[0]) || isRequest(rr, rr.find((r) => r.head === 0 && r.upos !== "PUNCT")))) address = { name: nm.form, rest };
      } }
    const marks = marksOf(rows, { wh: WH_ANY.has(ws[0]), small: !!small, calc: !!calculate(rows), puzzle, slash, composite, request, address: !!address });
    const propose = (label, relation, basisOk, assess) => { if (!ideation) return null; const cid = ideation.propose({ label, relation, door: "presented", witnesses: [witness] }); ideation.assess(cid, assess); return cid; };
    const by = "the reader's marks and the act rule", words = (ks) => ks.map((k) => MARK_TEXT.eng[k] ?? k).join(", ");
    const ids = [...(opts._ids ?? [])];

    // ---- an address is a claim of its own, then the rest of the message is read as itself
    if (address) {
      ids.push(propose(`this message is addressed to ${address.name}`, { subject: "this message", verb: "is addressed to", object: address.name }, true, { verdict: "supported", method: "testimony", by, basis: `a name and a comma at the start, before ${address.rest.endsWith("?") ? "a question" : "a request"}`, witnesses: [witness] }));
      const out = await turn(address.rest, { ...opts, _ids: ids });
      return out ? { ...out, addressed: address.name, trace: [{ step: "addressed", to: address.name }, ...(out.trace ?? [])] } : out;
    }

    // ---- a correction takes the previous reading back, and whatever rests on it
    if (marks.correction_mark) {
      const cid = propose("this message corrects your previous one", { subject: "this message", verb: "corrects", object: "your previous message" }, true, lastAct
        ? { verdict: "supported", method: "testimony", by, basis: `an opening “no”, and there is a previous message to correct`, witnesses: [witness] }
        : { verdict: "refuted", method: "deduction", by, basis: "an opening “no”, but nothing was said before it to correct" });
      if (cid && lastAct) {
        ids.push(cid, lastAct.claim, ...lastAct.dependents);
        ideation?.withdraw(lastAct.claim, "the next message corrects it");
        for (const o of lastAct.orders) withdrawn.add(o);
        const comma = t.indexOf(","), rest = comma >= 0 ? t.slice(comma + 1).trim() : "", gone = lastAct; lastAct = null;
        const inner = rest && (parser.rowsOf(rest) ?? []).some((r) => r.upos === "VERB" || r.upos === "AUX") ? await turn(rest, { ...opts, _ids: ids }) : null;
        const text = inner ? `Okay, I've set that aside. ${inner.text}` : "Okay, I've set that aside. What did you mean?";
        return { question: t, ...(inner ?? { type: "correction", handled: true, tools: [], trace: [] }), type: "correction", handled: true, text, trace: [{ step: "correction", withdrew: gone.claim }, ...(inner?.trace ?? [])], thought: ideation ? ideation.view([...new Set(ids)]) : null, acts: { working: "correction", open: false } };
      }
      if (cid) ids.push(cid);
    }

    // ---- the claims about what this message is
    const j = judge(candidates(marks));
    let workingClaim = null;
    if (ideation) {
      for (const c of j.claims) {
        const label = LABEL.eng[c.act];
        const claim = propose(`this message counts as ${label}`, { subject: "this message", verb: "counts as", object: label }, true,
          c.standing === "holds" ? { verdict: "supported", method: "testimony", by, basis: `supported by ${words(c.for)}`, witnesses: [witness] }
          : c.standing === "refuted" ? { verdict: "refuted", method: "deduction", by, basis: `supported by ${words(c.for)}, but ${words(c.against)} count${c.against.length > 1 ? "" : "s"} against it` }
          : { verdict: "unresolved", method: "deduction", by, basis: `supported by ${words(c.for)}, but ${j.alternatives.concat(j.working).filter((a) => a !== c.act).map((a) => LABEL.eng[a]).join(" or ")} fits as well` });
        ids.push(claim); if (c.act === j.working) workingClaim = claim;
      }
      if (j.working === "unread") { workingClaim = propose("this message counts as something I couldn't read", { subject: "this message", verb: "counts as", object: LABEL.eng.unread }, true, { verdict: "unresolved", method: "deduction", by, basis: "no mark supports any kind of message" }); ids.push(workingClaim); }
    }
    if (asked && j.working !== "fragment") asked = null;
    const premise = ideation && !j.open && j.working !== "unread" ? workingClaim : null;   // a claim that is only open cannot be a premise of an answer
    const aOpts = { ...opts, actIds: ids, actPremise: premise };
    const finish = (out, orders = []) => {
      if (!out) return out;
      // what a later "no" corrects is the last message that SAID something (a statement, a question, a sum), never a social remark or one that could not be read: "really?" does not take "Pierre loves Natasha" back
      if (workingClaim && !["social", "unread", "fragment"].includes(j.working)) lastAct = { claim: workingClaim, orders, dependents: out.ideaIds?.filter((x) => !ids.includes(x)) ?? [] };
      return { question: t, ...out, acts: { working: j.working, open: j.open, alternatives: j.alternatives }, taken: takenAs(j), thought: ideation ? ideation.view([...new Set([...ids, ...(out.ideaIds ?? [])])]) : (out.thought ?? null) };
    };

    // ---- MECHANIC 7: a question the chat put to the user is answered by the next fragment, IF the fragment fits what was asked. A man who asked "what does it stand for?" and is told
    // "the course" says "is the course worth doing?" back to himself; told "Natasha" for "is it open?", or "Hahaha", or "!pt", he asks again. The fit is read from the reader's own
    // marks: the gap is a pronoun with a gender and number, the answer must be a noun phrase of the right kind (a name for he or she, whose lean the given-name table must not contradict;
    // a noun the reader knows, or a thing the thread already holds, for it); anything else is not an answer. The rebuilt question then goes through the same guards as any question.
    if (asked && j.working === "fragment" && asked.kind === "which") {
      const pending = asked, pron = pending.rows.find((r) => r.id === pending.row);
      let end = rows.length; while (end > 0 && rows[end - 1].upos === "PUNCT") end--;
      const fill = detok(rows.slice(0, end).map((r) => r.form)), pick = pending.options.find((c) => c.label.toLowerCase() === fill.toLowerCase() || c.label.toLowerCase().split(" ").includes(fill.toLowerCase()));
      const cid = propose(`this message settles who ${quote(pron.form)} is`, { subject: "this message", verb: "answers", object: "the question about the pronoun" }, true, pick
        ? { verdict: "supported", method: "testimony", by, basis: `${quote(fill)} is one of the two I asked about, and you said it`, witnesses: [witness] }
        : { verdict: "refuted", method: "deduction", by, basis: `${quote(fill)} is neither of the two I asked about` });
      if (!pick) return finish({ type: "identity", handled: false, gap: "answer_does_not_fit", text: `I can't use ${quote(fill || t)}: I asked whether you mean ${listOr(pending.options.map((c) => c.label))}.`, question: t, tools: [], trace: [{ step: "pairing_refused", why: "not one of the options" }], ideaIds: [cid].filter(Boolean) });   // the question stays open
      asked = null; told.set(pick.ref, pending.cls);   // what the user settled is evidence from here on: this being is "she", so "he" is someone else
      const rebuilt = detok(pending.rows.map((r) => (r.id === pending.row ? pick.label : r.form)));
      const inner = await turn(rebuilt, { ...opts, _ids: [...ids, cid].filter(Boolean) });
      return inner ? { ...inner, paired: { question: pending.question, answer: pick.label, rebuilt }, trace: [{ step: "paired", asked: pending.question, answer: pick.label, rebuilt }, ...(inner.trace ?? [])] } : inner;
    }
    if (asked && j.working === "fragment" && asked.kind === "antecedent") {
      const pending = asked, pron = pending.rows.find((r) => r.id === pending.row), pf = featsOf(pron.feats);
      let end = rows.length; while (end > 0 && rows[end - 1].upos === "PUNCT") end--;   // the answer, without the punctuation it ended with (from the reader's rows)
      const body = rows.slice(0, end), fill = detok(body.map((r) => r.form));
      const heads = body.filter((r) => r.upos === "NOUN" || r.upos === "PROPN"), names = body.filter((r) => r.upos === "PROPN");
      const shapeOk = body.length > 0 && heads.length > 0 && body.every((r) => ["DET", "ADJ", "NOUN", "PROPN", "NUM", "ADP", "PART"].includes(r.upos));
      const held = names.length > 0 && names.every((r) => (cast?.referents ?? []).some((b) => (b.forms ?? []).some(([f]) => String(f).toLowerCase() === String(r.form).toLowerCase())));
      const gendered = pf.Gender === "Masc" || pf.Gender === "Fem", lean = names.length ? genderOf(names.map((r) => r.form)) : null;
      const why = !shapeOk ? "it is not a name or a thing" : gendered ? (!names.length ? `“${pron.form}” is a person and “${fill}” is not a name` : lean && lean !== (pf.Gender === "Masc" ? "m" : "f") ? `“${fill}” is usually ${lean === "m" ? "a man's" : "a woman's"} name, and “${pron.form}” is ${pf.Gender === "Masc" ? "a man" : "a woman"}` : null)
        : names.length ? (held ? null : `I don't know “${fill}”, so I can't tell whether it is the thing you mean`) : (heads.every((r) => wordKnown(r)) ? null : `I can't read “${fill}”`);
      const cid = propose(`this message answers your question about ${quote(pron.form)}`, { subject: "this message", verb: "answers", object: "the question about the pronoun" }, true, why
        ? { verdict: "refuted", method: "deduction", by, basis: `it came straight after my question about “${pron.form}”, but ${why}` }
        : { verdict: "supported", method: "testimony", by, basis: `a ${names.length ? "name" : "noun phrase"} that fits “${pron.form}”, straight after I asked what it stood for${gendered && names.length && nameGenderGap ? " (I have no table of given names, so I could not check that the name suits “" + pron.form + "”)" : ""}`, witnesses: [witness] });
      if (why) return finish({ type: "relational", handled: false, gap: "answer_does_not_fit", text: `I can't use ${quote(fill || t)} for ${quote(pron.form)}: ${why}. Who or what do you mean?`, question: t, tools: [], trace: [{ step: "pairing_refused", why }], ideaIds: [cid].filter(Boolean) });   // the question stays open
      asked = null;
      const rebuilt = detok(pending.rows.map((r) => (r.id === pending.row ? fill : r.form)));
      const inner = await turn(rebuilt, { ...opts, _ids: [...ids, cid].filter(Boolean) });
      return inner ? { ...inner, paired: { question: pending.question, answer: fill, rebuilt }, trace: [{ step: "paired", asked: pending.question, answer: fill, rebuilt }, ...(inner.trace ?? [])] } : inner;
    }

    // ---- route by the standing act
    switch (j.working) {
      case "door": return finish(await ask(t, aOpts));
      case "puzzle": return finish(await ask(t, { ...aOpts, door: "reason" }));
      case "calculation": case "question": return finish(await ask(t, aOpts));
      case "request": return finish(await ask(t, { ...aOpts, request: true }));
      case "composite": {   // statements and then a question in one message: the statements are read into the fold, then the last sentence is answered
        const head = t.slice(0, cut.at(-1).offset).trim(), before = parse.length, read = await say(head), out = await ask(cut.at(-1).text, aOpts);
        return finish({ ...out, introduced: [{ text: head, source: null, read }, ...(out.introduced ?? [])] }, Array.from({ length: parse.length - before }, (_, i) => before + i));
      }
      case "statement": { const before = parse.length, out = await say(t); return finish({ ...out, ideaIds: [] }, Array.from({ length: parse.length - before }, (_, i) => before + i)); }
      case "social": {   // positive evidence only: an opening interjection, or a known greeting or thanks
        if (small) return finish(last = { type: "smalltalk", handled: true, text: small[1], question: t, tools: [], trace: [{ step: "smalltalk" }] });
        return finish(last = { type: "social", handled: true, text: "Okay.", question: t, tools: [], trace: [{ step: "social", read: "an opening interjection and nothing else: an acknowledgement, not a fact" }] });
      }
      case "fragment": {   // a bare word or phrase with no predicate and nothing that marks it as a remark: a man does not guess, and does not phone the library with it
        const content = rows.filter((r) => !["PUNCT", "INTJ"].includes(r.upos));
        const heldName = content.length && content.every((r) => r.upos === "PROPN") && (cast?.referents ?? []).some((b) => (b.forms ?? []).some(([f]) => String(f).toLowerCase() === content.map((r) => r.form).join(" ").toLowerCase()));
        if (heldName) return finish(await ask(`Who is ${content.map((r) => r.form).join(" ")}?`, aOpts));   // someone the notebook already holds: say what it says
        return finish({ type: "fragment", handled: false, gap: "fragment_unclear", text: `I'm not sure what you mean by ${quote(t)}.`, question: t, tools: [], trace: [{ step: "fragment", read: "no predicate, and nothing marks it as a remark, a name I hold or a question" }] });
      }
      default: return finish({ type: "unread", handled: false, gap: "act_unread", text: "I couldn't tell what kind of message that was.", tools: [], trace: [{ step: "unread" }] });
    }
  }

  return { id, say: serial(say), ask: serial(ask), turn: serial(turn), setPersona, engine, ideation, doors: () => doors.list(), state: () => ({ id, sentences: parse.length, referents: cast?.referents?.length ?? 0, text, janus: janus?.on ? "on" : (janus?.why ?? "not mounted"), priors: { nameGender: nameGenderGap ?? "loaded" } }) };
}
