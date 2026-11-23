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
import { detok } from "./personas.mjs";

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
export async function makeThread({ hl, know = null, now = () => new Date(), janus = null, log = null, getJson = undefined } = {}) {
  const parser = await rowsOfFor("eng"), pr = priorsFor("eng"), engine = await makeEngine({ hl });
  const commonNoun = (t) => { const c = classifyWord(t, { posPrior: pr.posPrior }); if (!c?.found || !(c.total > 0)) return false; const n = (u) => c.candidates.filter((x) => x.upos === u).reduce((a, x) => a + x.count, 0); return n("NOUN") > n("PROPN"); };
  // the given-name table (a giver, with its provenance inside the file): a name's lean for he / she until the thread's own pronouns say otherwise
  const table = loadNameGender();
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
  const doors = makeDoors({ know, janus, now, ...(getJson ? { getJson } : {}), calculate, rowsOf: (s) => parser.rowsOf(s) ?? [], sentences: (t) => splitSentences(t, { abbreviations: abbr(t) }).map((c) => c.text), threadId: id, log });
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
    const facts = S.frames.filter((f) => f.order >= first).map((f) => ({ action: f.form, order: f.order, roles: f.roles.filter((g) => engine.KARAKAS.includes(g.label)).map((g) => ({ role: EN[g.label] ?? g.label, text: S.rowsOf.get(f.order) ? phrase(f.order, g) : g.head })) }));
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
    const ideas = [], idea = (spec) => { const id = ideation.propose(spec); ideas.push(id); return id; };
    const done = (r) => { if (r.handled === false && r.research) pending = { ...r.research, question: q }; else if (r.handled && !["meta", "smalltalk", "door"].includes(r.type)) pending = null; return finish(r); };
    const finish = (r) => ({ question: q, ...r, cites: r.cites ?? (r.from ? [{ label: r.from }] : cites), ...(introduced.length ? { introduced } : {}), trace, tools: calls, persona: persona ? { name: persona.name, source: persona.source } : null, thought: ideation && ideas.length ? ideation.view(ideas) : null });
    // ---- DOORS: called by hand (/name args) or by the chat itself, because not knowing is the signal (doors.mjs)
    const refByName = (name) => (cast?.referents ?? []).find((b) => (b.forms ?? []).some(([f]) => String(f).toLowerCase() === String(name).toLowerCase()))?.ref ?? null;
    const host = {
      setQid, qidOf: (n) => qids.get(String(n).toLowerCase()) ?? null, call: (name, args) => callDoor(name, args),
      kin: (term, name) => { const ref = refByName(name); return ref ? kinAtom({ janus, term, of: ref, facts: kinFacts() }) : { gap: { kind: "unknown_referent" } }; },
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
      const root = qRows.find((r) => r.head === 0 && r.upos !== "PUNCT"), obj = qRows.find((r) => r.deprel === "obj" && r.head === root?.id) ?? qRows.find((r) => r.deprel === "obj");
      trace.push({ step: "request", about: !obj || obj.upos === "PRON" ? "the open gap" : obj.form });
      if (!obj || obj.upos === "PRON") {
        if (pending) return ask(pending.question, { onStatus: opts.onStatus });
        return done({ type: "request", handled: true, text: "There's nothing I'm missing right now. When I can't answer something I go and look for it myself, so ask me something and I will." });
      }
      if (obj.upos === "PROPN" && know) { const r = await reference(nameChunk(obj)); return r ?? done({ type: "request", handled: false, gap: lastOut?.gap ?? "no_door", text: lastOut?.text ?? "I could not find out." }); }
      return done({ type: "request", handled: false, gap: "act_not_possible", text: `That reads as a request (${quote(q)}). I can look things up and answer from what I'm told, but I can't do that; /doors lists what I can reach.` });
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
    // self, without a persona: "who are you?" ("u" is the one alias of "you" the reader cannot tag). What the system IS is code-given, and says so.
    if (wh && WH.has(lemma(wh)) && qRows.some(isYou)) {
      trace.push({ step: "self", giver: "the system's own description (code)" });
      return done({ type: "self", handled: true, from: "my own description", text: "I'm a program that reads what you tell me into a map of who did what to whom, and answers from it. There is no language model in me: I only know what you've said, plus the dictionary and Wikidata when I have to look something up, and I say when I do." });
    }
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
        const ref = refOf(tgt), being = ref ? S.refByRef.get(ref) : null, known = !!being && (probe.referents.find((x) => x.ref === ref)?.first ?? order) < order;
        trace.push({ step: "identity", target: tgt.form, bound: tgt.upos === "PRON" ? ref : null, known });
        if (known && S.sentencesOfRef.has(ref)) {
          const p = await engine.wordProfile("", { ref });
          const sents = [...S.sentencesOfRef.get(ref)].sort((a, b) => a - b).slice(0, 3).map((o) => ({ order: o, text: S.rowsOf.get(o)?.text })).filter((x) => x.text);
          const name = being.forms[0][0], lead = p?.portrait?.lead;
          const fromGiver = sents.length && sents.every((x) => givenAt.has(x.order));   // what the cast knows of him came from a giver, not from the user
          const told = sents.length ? `${fromGiver ? `${givenAt.get(sents[0].order)} says` : "You told me"} ${sents.map((x) => quote(x.text)).join(" and ")}` : "";
          const said = `${tgt.upos === "PRON" ? `That would be ${name}.${told ? " " : ""}` : ""}${told || (tgt.upos === "PRON" ? "" : `${name}.`)}`;
          return done({ type: "identity", handled: true, ref, text: said, evidence: sents, profile: { lead, propositions: p?.portrait?.propositions ?? [] } });
        }
        if (tgt.upos === "PRON") return done({ type: "identity", handled: false, gap: "no_antecedent", text: "I don't know who you mean: nothing said so far gives that pronoun someone to point to." });
        if (know && tgt.upos === "PROPN") {   // a name the thread has not met: a gap of shape unknown_referent, filled by the doors that declare it
          const r = await reference(nameChunk(tgt)); if (r) return r;
        }
        if (know && tgt.upos === "NOUN") {
          const d = await tool("define", { word: lemma(tgt) }, () => know.lookup(lemma(tgt))); trace.push({ step: "definition", giver: "kaikki / the hyperlexicon" });
          if (d.primary) return done({ type: "definition", handled: true, text: `${cap(tgt.form)}: ${d.primary.replace(/[.]\s*$/, "")}.`, from: "the dictionary" });
        }
        return done({ type: "identity", handled: false, gap: "unknown_referent", text: `I haven't been told about ${tgt.form}, and no giver I can reach knows it.` });
      }
    }
    // relational: the engine's answer over the frames
    let a = await tool("recall", { question: q }, () => engine.answer(q));
    // what the question is about, by part of speech (no word list): the content words, without the question word, the auxiliaries and the function words
    const topic = qRows.filter((r) => !["PRON", "AUX", "PUNCT", "DET", "ADP", "SCONJ", "CCONJ", "PART"].includes(r.upos)).map((r) => r.form).join(" ") || null;
    const looked = [];
    if (!a.answers?.length && topic) {   // NOT KNOWING: the doors that declare this gap's shape go and read, and the question is asked again
      const fill = doors.fillers("no_answer"); trace.push({ step: "research", gap: "no_answer", doors: fill, topic });
      for (const dn of fill) { const w = await callDoor(dn, topic); if (w.ok) { looked.push(w.text.slice(0, -1)); a = await tool("recall", { question: q, after: dn }, () => engine.answer(q)); break; } looked.push(w.text.slice(0, -1)); }
    }
    trace.push({ step: "relational", read: a.read ?? null, answers: a.answers?.length ?? 0 });
    if (a.answers?.length) {
      const top = a.answers[0];
      const phraseOf = top.answer.map((x) => x.text).join(" and ");
      const ev = a.answers.slice(0, 3).map((x) => { const pp = parse.find((y) => y.text === x.sentence); return { order: pp?.order ?? null, text: x.sentence, ...(pp && givenAt.has(pp.order) ? { given: givenAt.get(pp.order) } : {}) }; });
      const out = done({ type: "answer", handled: true, text: `${cap(phraseOf)}.`, evidence: ev, answers: a.answers.slice(0, 3).map((x) => x.answer) });
      last = out; return out;
    }
    const gap = a.gaps?.[0];
    return done({ type: "relational", handled: false, gap: gap?.gap ?? "no_answer", text: looked.length ? `I haven't been told that, and I went to look: ${looked.at(-1)}, but it doesn't answer it.` : "I haven't been told that.", detail: gap?.detail ?? null, ...(topic ? { research: { gap: "no_answer", args: topic } } : {}) });
  }

  /** turn(message) → the reply to ONE message, whatever it is: small talk, a calculation, a question, or a statement to read into the fold */
  async function turn(message, opts = {}) {
    const t = String(message ?? "").trim(); if (!t) return null;
    const rows = parser.rowsOf(t) ?? [], ws = rows.filter((r) => r.upos !== "PUNCT").map((r) => String(r.lemma ?? r.form).toLowerCase());
    const small = ws.length <= 3 ? SMALL.find(([words]) => words.some((w) => ws.includes(w))) : null;
    if (small) return (last = { type: "smalltalk", handled: true, text: small[1], question: t, tools: [], trace: [{ step: "smalltalk" }] });
    if (t.startsWith("/")) return ask(t, opts);
    const root = rows.find((r) => r.head === 0 && r.upos !== "PUNCT");
    if (isRequest(rows, root) && rows.filter((r) => r.head === 0 && r.upos !== "PUNCT").length === 1 && splitSentences(t, { abbreviations: abbr(t) }).length === 1) return ask(t, { ...opts, request: true });
    if (t.endsWith("?") || WH_ANY.has(ws[0]) || calculate(rows)) return ask(t, opts);
    return say(t);
  }

  return { id, say: serial(say), ask: serial(ask), turn: serial(turn), setPersona, engine, ideation, doors: () => doors.list(), state: () => ({ id, sentences: parse.length, referents: cast?.referents?.length ?? 0, text, janus: janus?.on ? "on" : (janus?.why ?? "not mounted") }) };
}
