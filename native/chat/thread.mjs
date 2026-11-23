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

const WH = new Set(["who", "whom", "what"]);
const WH_ANY = new Set(["who", "whom", "what", "when", "where", "why", "how", "which"]);
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
const SMALL = [[["hello", "hi", "hey", "greeting"], "Hello."], [["thank", "thanks"], "You're welcome."], [["bye", "goodbye"], "Goodbye."]];
const NOMINAL = new Set(["PROPN", "NOUN", "PRON"]);
// a REQUEST (an imperative): the reader marks the root verb Mood=Imp, or as a bare infinitive (VerbForm=Inf), and it has no subject, no
// auxiliary and no "to" of its own ("go research it", "tell me a joke"); such a sentence is not a fact and is not read into the fold
const isRequest = (rows, root) => { if (!root || root.upos !== "VERB") return false; const f = featsOf(root.feats); if (f.Mood !== "Imp" && f.VerbForm !== "Inf") return false; return !rows.some((r) => r.head === root.id && ["nsubj", "csubj", "nsubj:pass", "aux", "aux:pass", "mark", "expl"].includes(r.deprel)); };
const quote = (s) => `“${String(s).trim()}”`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

/** makeThread({ hl, know, now }) → { say, ask, state }.  know: the givers (demo/knowledge.mjs makeKnowledge) or null (typed gaps). */
export async function makeThread({ hl, know = null, now = () => new Date() } = {}) {
  const parser = await rowsOfFor("eng"), pr = priorsFor("eng"), engine = await makeEngine({ hl });
  const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
  // the given-name table (a giver, with its provenance inside the file): a name's lean for he / she until the thread's own pronouns say otherwise
  const table = loadNameGender();
  const genderOf = (words) => { let m = 0, f = 0; for (const w of words ?? []) { const c = table?.words?.[String(w).toLowerCase()]; if (c) { m += c[0]; f += c[1]; } } return m + f >= MIN_EVIDENCE && m !== f ? (m > f ? "m" : "f") : null; };
  const abbr = (t) => abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set;
  const id = `thread:${sha(now().toISOString() + Math.random())}`;
  let text = "", parse = [], folded = "", cast = null, last = null, persona = null;
  const setPersona = (pz) => { persona = pz ?? null; };

  const refold = async () => {
    const h = sha(text); if (h === folded) return;   // cached at the current state: an unchanged thread is not folded again
    const whole = mereologyBuilder(text); for (const p of parse) whole.add(p);
    cast = referentsInOrder(parse, { commonNoun, genderOf });
    await engine.ingest(text, { parse, mereology: whole.finish(), cast, proforms: proformsOfParse(parse), timing: {}, parseBy: parser.by ?? null, sentences: parse.map((p) => ({ text: p.text, offset: p.offset, order: p.order })), gaps: [] }, { chapters: [] });
    engine.S.ready = true; folded = h;
  };

  /** say(statement) → { type: "read", text, facts, referents } : read into the fold, in order */
  async function say(statement) {
    const t = String(statement ?? "").trim(); if (!t) return null;
    const base = text ? text.length + 2 : 0; text = text ? `${text}\n\n${t}` : t;
    const first = parse.length, requests = [];
    for (const c of splitSentences(t, { abbreviations: abbr(t) })) {
      const rows = parser.rowsOf(c.text) ?? []; if (!rows.length) continue;
      // an imperative (Mood=Imp, no subject of its own) is a REQUEST, not a fact: it is not read into the fold
      const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
      if (isRequest(rows, root)) { requests.push(c.text); continue; }
      parse.push({ order: parse.length, offset: base + c.offset, text: c.text, rows });
    }
    if (parse.length === first) { text = base ? text.slice(0, base - 2) : ""; return (last = { type: "read", handled: true, text: `That reads as a request (${quote(requests[0] ?? t)}), and I can't act on requests: I only read what you tell me and answer questions from it.`, facts: [], referents: [], sentences: 0, requests }); }
    await refold();
    const S = engine.S, EN = engine.EN;
    const facts = S.frames.filter((f) => f.order >= first).map((f) => ({ action: f.form, order: f.order, roles: f.roles.filter((g) => engine.KARAKAS.includes(g.label)).map((g) => ({ role: EN[g.label] ?? g.label, text: S.rowsOf.get(f.order) ? phrase(f.order, g) : g.head })) }));
    const referents = [...new Set(parse.slice(first).flatMap((p) => p.rows.map((r) => cast.mentionOf[`${p.order}.${r.id}`]).filter(Boolean)))].map((ref) => ({ ref, label: S.refByRef.get(ref)?.forms?.[0]?.[0] ?? ref, kind: S.refByRef.get(ref)?.kind ?? "name" }));
    const asked = requests.length ? `That reads as a request (${quote(requests[0])}), and I can't act on requests: I only read what you tell me and answer questions from it.` : null;
    const heard = parse.length - first;
    const out = { type: "read", handled: true, text: !heard ? asked : facts.length ? (asked ? `Noted. (I set aside ${quote(requests[0])}: it reads as a request, which I can't act on.)` : "Noted.") : "Noted, though I found no action in it to hold.", facts, referents, sentences: heard, requests };
    return (last = out);
  }

  // the phrase a role filler covers, as the thread's own words (the span in the thread text)
  const phrase = (order, g) => { const sp = g.span; return sp ? engine.clip(sp, 160) : g.head; };

  /** ask(question) → { type, text, evidence, trace, ... } : answered from the fold; `handled: false` carries a typed gap */
  async function ask(question) {
    const q = String(question ?? "").trim(); await refold();
    const S = engine.S, trace = [], calls = [];
    const tool = async (name, args, fn) => { const out = await fn(); calls.push({ name, args, result: brief(out) }); return out; };   // every tool call is recorded and shown
    const qRows = parser.rowsOf(q) ?? [], lemma = (r) => String(r.lemma ?? r.form ?? "").toLowerCase();
    const order = parse.length;
    // the question is probed as the NEXT sentence of the thread (causal): pronouns in it bind against what was said, and it changes nothing
    const probe = referentsInOrder([...parse, { order, rows: qRows }], { commonNoun, genderOf });
    const refOf = (r) => probe.mentionOf[`${order}.${r.id}`] ?? null;
    const done = (r) => ({ question: q, ...r, trace, tools: calls, persona: persona ? { name: persona.name, source: persona.source } : null });

    // meta
    if (qRows.some((r) => lemma(r) === "sure")) {
      trace.push({ step: "meta", used: "the last answer" });
      return done(last?.type === "answer" ? { type: "meta", handled: true, text: last.evidence?.length ? `Yes: ${last.evidence[0].text.length ? quote(last.evidence[0].text) : "it rests on what you told me"}.` : "Yes.", evidence: last.evidence } : { type: "meta", handled: true, text: "I have not answered anything I could check yet." });
    }
    const wh = qRows.find((r) => WH.has(lemma(r)) || ["when", "where", "why", "how"].includes(lemma(r)));
    const wordsOf = qRows.filter((r) => r.upos !== "PUNCT").map(lemma), has = (...ws) => ws.some((w) => wordsOf.includes(w));
    const calc = calculate(qRows);
    if (calc) { await tool("calculate", { expression: calc.expression }, () => calc); return done({ type: "calculation", handled: true, text: calc.error ? `That's a ${calc.error}, so there is no answer.` : `${calc.value.toLocaleString("en-US", { maximumFractionDigits: 9 })}.`, from: "arithmetic" }); }
    if (has("help") || (has("what") && has("can") && has("you", "u") && has("do"))) { trace.push({ step: "help" }); return done({ type: "help", handled: true, text: "I can tell you the date and the time, do arithmetic, define words, look up well-known people, and remember what you tell me and answer questions about it. I can't write, research or act on requests, and there's no language model in me." }); }
    if (has("how") && has("you", "u") && wordsOf.length <= 4) return done({ type: "smalltalk", handled: true, text: "I'm a program, so I don't have good days or bad ones, but I'm working." });
    if (wordsOf.length === 1 && WH_ANY.has(wordsOf[0])) return done({ type: "relational", handled: false, gap: "needs_more", text: `${cap(wordsOf[0])} what? Tell me a bit more and I'll try.` });
    // time and place: the clock, a code-giver
    const timeWord = ["day", "time", "date"].find((w) => qRows.some((r) => lemma(r) === w));
    if (timeWord && qRows.some((r) => ["it", "today", "now", "the"].includes(lemma(r)))) {
      const d = await tool("clock", { what: timeWord }, () => now()); trace.push({ step: "time", giver: "the clock (Date)" });
      const t = timeWord === "day" ? `Today is ${d.toLocaleDateString("en-US", { weekday: "long" })}.` : timeWord === "time" ? `It is ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : `The date is ${d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`;
      return done({ type: "time", handled: true, text: t });
    }
    // self: "who are you?" ("u" is the one alias of "you" the reader cannot tag). What the system IS is code-given, and says so.
    if (wh && WH.has(lemma(wh)) && qRows.some((r) => ["you", "u"].includes(lemma(r)))) {
      trace.push({ step: "self", giver: "the system's own description (code)" });
      if (persona?.identity) return done({ type: "self", handled: true, from: "the persona's own prompt", text: `I'm ${persona.identity}. (This is a simulated persona, read from ${persona.name}. I'm not that product: I carry only what its prompt says about itself, and there is no language model in me.)` });
      return done({ type: "self", handled: true, from: "my own description", text: "I'm a program that reads what you tell me into a map of who did what to whom, and answers from it. There is no language model in me: I only know what you've said, plus the dictionary and Wikidata when I have to look something up, and I say when I do." });
    }
    // identity: who/what is X (X a name, a description, or a pronoun the cast binds)
    const copular = qRows.some((r) => r.deprel === "cop");
    if (wh && WH.has(lemma(wh)) && copular) {
      const tgt = qRows.find((r) => r !== wh && NOMINAL.has(r.upos) && (r.upos !== "PRON" || featsOf(r.feats).Person === "3" || featsOf(r.feats).Person === undefined));
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
        const ref = refOf(tgt), being = ref ? S.refByRef.get(ref) : null, known = !!being && (probe.referents.find((x) => x.ref === ref)?.first ?? order) < order;
        trace.push({ step: "identity", target: tgt.form, bound: tgt.upos === "PRON" ? ref : null, known });
        if (known && S.sentencesOfRef.has(ref)) {
          const p = await engine.wordProfile("", { ref });
          const sents = [...S.sentencesOfRef.get(ref)].sort((a, b) => a - b).slice(0, 3).map((o) => ({ order: o, text: S.rowsOf.get(o)?.text })).filter((x) => x.text);
          const name = being.forms[0][0], lead = p?.portrait?.lead;
          const told = sents.length ? `You told me ${sents.map((x) => quote(x.text)).join(" and ")}` : "";
          const said = `${tgt.upos === "PRON" ? `That would be ${name}.${told ? " " : ""}` : ""}${told || (tgt.upos === "PRON" ? "" : `${name}.`)}`;
          return done({ type: "identity", handled: true, ref, text: said, evidence: sents, profile: { lead, propositions: p?.portrait?.propositions ?? [] } });
        }
        if (tgt.upos === "PRON") return done({ type: "identity", handled: false, gap: "no_antecedent", text: "I don't know who you mean: nothing said so far gives that pronoun someone to point to." });
        if (know && tgt.upos === "PROPN") {   // a name the thread has not met: the givers (Wikidata), labelled
          const e = await tool("lookup_person", { name: tgt.form }, () => know.person(lemma(tgt)));
          if (e?.description) { trace.push({ step: "reference", giver: "Wikidata (wbsearchentities + P31)", out: e.label }); return done({ type: "reference", handled: true, text: `${e.label ?? tgt.form}: ${e.description}.`, from: "Wikidata" }); }
        }
        if (know && tgt.upos === "NOUN") {
          const d = await tool("define", { word: lemma(tgt) }, () => know.lookup(lemma(tgt))); trace.push({ step: "definition", giver: "kaikki / the hyperlexicon" });
          if (d.primary) return done({ type: "definition", handled: true, text: `${cap(tgt.form)}: ${d.primary.replace(/[.]\s*$/, "")}.`, from: "the dictionary" });
        }
        return done({ type: "identity", handled: false, gap: "unknown_referent", text: `I haven't been told about ${tgt.form}, and no giver I can reach knows it.` });
      }
    }
    // relational: the engine's answer over the frames
    const a = await tool("recall", { question: q }, () => engine.answer(q)); trace.push({ step: "relational", read: a.read ?? null, answers: a.answers?.length ?? 0 });
    if (a.answers?.length) {
      const top = a.answers[0];
      const phraseOf = top.answer.map((x) => x.text).join(" and ");
      const ev = a.answers.slice(0, 3).map((x) => ({ order: null, text: x.sentence }));
      const out = done({ type: "answer", handled: true, text: `${cap(phraseOf)}.`, evidence: ev, answers: a.answers.slice(0, 3).map((x) => x.answer) });
      last = out; return out;
    }
    const gap = a.gaps?.[0];
    return done({ type: "relational", handled: false, gap: gap?.gap ?? "no_answer", text: "I haven't been told that.", detail: gap?.detail ?? null });
  }

  /** turn(message) → the reply to ONE message, whatever it is: small talk, a calculation, a question, or a statement to read into the fold */
  async function turn(message) {
    const t = String(message ?? "").trim(); if (!t) return null;
    const rows = parser.rowsOf(t) ?? [], ws = rows.filter((r) => r.upos !== "PUNCT").map((r) => String(r.lemma ?? r.form).toLowerCase());
    const small = ws.length <= 3 ? SMALL.find(([words]) => words.some((w) => ws.includes(w))) : null;
    if (small) return (last = { type: "smalltalk", handled: true, text: small[1], question: t, tools: [], trace: [{ step: "smalltalk" }] });
    if (t.endsWith("?") || WH_ANY.has(ws[0]) || calculate(rows)) return ask(t);
    return say(t);
  }

  return { id, say, ask, turn, setPersona, engine, state: () => ({ id, sentences: parse.length, referents: cast?.referents?.length ?? 0, text }) };
}
