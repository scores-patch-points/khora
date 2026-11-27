// thread.test.mjs — the chat's reply to each kind of message, with no model: said facts are read in order and recalled by referent; a
// pronoun is bound by the cast; arithmetic, the clock, small talk and "who are you" are tools and rules; a request is not a fact; a
// description with no tie is a typed gap. Needs the reader's priors (KHORA_PRIORS_DIR); skips without them.
import test from "node:test"; import assert from "node:assert/strict";
let thread = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); thread = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
// the given-name prior (title, dictionary given-name sense, Wikidata snapshot) is another session's module: the tests that depend on it say so, and hold either way
const prior = (await import("../adapters/text/gender-of-words.js").catch(() => null))?.makeDefaultNameGenderPrior?.({}), HAVE = !!prior && !prior.missing;
const T = { skip: thread ? false : `no reader here: ${why}` };
test("a statement is read in order; a question about it is answered by referent, with its sentence", T, async () => {
  const r = await thread.turn("Mina gave Jonathan a book. She lives in the village.");
  assert.equal(r.type, "read"); assert.ok(r.facts.length >= 1);
  const a = await thread.turn("Who gave Jonathan a book?");
  assert.equal(a.handled, true); assert.match(a.text, /Mina/); assert.ok(a.evidence.length >= 1); assert.ok(a.tools.some((t) => t.name === "recall"));
});
test("a pronoun is settled by what the thread or a prior says about the names; with nothing to go on it asks, and what the user settles is evidence from then on", T, async () => {
  if (HAVE) {   // "Mina gave Jonathan a book. She lives in the village." and the name prior (title, dictionary, snapshot): Mina is a woman's name, Jonathan a man's
    const a = await thread.turn("Who is she?"); assert.match(a.text, /^That would be Mina\./);
    assert.ok(a.trace.some((t) => t.step === "gender" && t.of === "Mina" && /^right \d+% \(\d+ of \d+\)/.test(t.reliability)), "the reply carries the source and how often it has been right");
    assert.match((await thread.turn("Who is he?")).text, /^That would be Jonathan\./);
  } else {
    const a = await thread.turn("Who is she?"); assert.equal(a.handled, false); assert.equal(a.gap, "pronoun_open"); assert.equal(a.text, "Do you mean Mina or Jonathan?");
    assert.equal((await thread.turn("Mina")).paired?.rebuilt, "Who is Mina?"); assert.match((await thread.turn("Who is he?")).text, /^That would be Jonathan\./);
  }
});
test("two names nothing knows leave the pronoun open: it asks, a wrong answer is refused, and the user's answer is evidence from then on", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  await th.turn("Zelko met Brannoc. She smiled.");
  const w = await th.turn("Who smiled?"); assert.equal(w.text, "“She”, but I can't tell whether that is Zelko or Brannoc.");
  const a = await th.turn("Who is she?"); assert.equal(a.gap, "pronoun_open"); assert.equal(a.text, "Do you mean Zelko or Brannoc?");
  const bad = await th.turn("Pierre"); assert.equal(bad.gap, "answer_does_not_fit"); assert.match(bad.text, /I asked whether you mean Zelko or Brannoc\.$/);
  assert.equal((await th.turn("Brannoc")).paired?.rebuilt, "Who is Brannoc?");
  assert.equal((await th.turn("Who smiled?")).text, "Brannoc.", "she is Brannoc now: the user's answer settled it");
});
test("who a pronoun means: with the name prior the probe's pronouns are settled by the names; without it each is open; a place is never a candidate; a pro-form the thread attached settles it", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  for (const [said, q, settled, open] of [["Pierre met Natasha. She smiled.", "Who smiled?", "Natasha.", "Pierre or Natasha"], ["Tom met Dana. She smiled.", "Who smiled?", "Dana.", "Tom or Dana"], ["Mary called John. He answered.", "Who answered?", "John.", "Mary or John"]]) {
    const th = await mk(); await th.turn(said); const r = await th.turn(q);
    if (HAVE) assert.equal(r.text, settled, said); else assert.match(r.text, new RegExp(`^“(She|He)”, but I can't tell whether that is ${open}\\.$`), said);
  }
  const one = await mk(); await one.turn("Mina lives in Paris. She smiled.");
  assert.equal((await one.turn("Who smiled?")).text, "Mina."); assert.match((await one.turn("Who is she?")).text, /^That would be Mina\./);
  const evid = await mk(); await evid.turn("Pierre took his hat. Natasha smiled. She waved.");
  assert.equal((await evid.turn("Who waved?")).text, "Natasha.");
});
test("arithmetic is a tool; the clock is a tool; neither touches the fold", T, async () => {
  const c = await thread.turn("what is 12 times 7?"); assert.equal(c.text, "84."); assert.equal(c.tools[0].name, "calculate");
  assert.equal((await thread.turn("what is 15 % of 80?")).text, "12.");
  const d = await thread.turn("what day is it?"); assert.match(d.text, /Today is Monday/); assert.equal(d.tools[0].name, "clock");
  assert.equal((await thread.turn("what is 2 apples times 3?")).type !== "calculation", true, "a unit word is not arithmetic");
});
test("small talk and who-are-you are answered by rule, and say so", T, async () => {
  assert.equal((await thread.turn("hello")).text, "Hello.");
  const s = await thread.turn("who are you?"); assert.equal(s.type, "self"); assert.match(s.text, /no language model/);
});
test("a request is not a fact: about what is not known it is acted on, about the world it is refused; a description nobody tied to a name is a typed gap", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const fresh = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  const r = await fresh.turn("go research it");
  assert.match(r.text, /nothing I'm missing/, "no gap is open and nothing was just told, so there is nothing to look for, and it says so"); assert.equal(fresh.state().sentences, 0, "nothing was read into the fold");
  const before = thread.state().sentences;
  const w = await thread.turn("open the door"); assert.equal(w.gap, "act_not_possible"); assert.equal(thread.state().sentences, before);
  const g = await thread.turn("who is the president?"); assert.equal(g.handled, false); assert.equal(g.gap, "unknown_description");
});
test("statements and a closing question in one message: the statements are read into the fold, then the question is answered from them", T, async () => {
  const before = thread.state().sentences;
  const r = await thread.turn("Pavel gave Irina a map. Who gave Irina a map?");
  assert.equal(r.handled, true); assert.match(r.text, /Pavel/);
  assert.equal(thread.state().sentences, before + 1, "the statement was read; the question was not stored");
  assert.equal(r.introduced[0].source, null, "what the user said is not attributed to a giver");
});
test("negation is a mark carried per clause: a negated statement does not say who did it, and a later negation retracts an earlier affirmation", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  let th = await mk();
  const said = await th.turn("Mina did not give Jonathan a book.");
  assert.equal(said.facts[0].neg, true, "the fact carries the reader's Polarity=Neg mark");
  const who = await th.turn("Who gave Jonathan a book?");
  assert.equal(who.handled, true); assert.equal(who.text, "Not Mina: you told me “Mina did not give Jonathan a book.”", "the negated clause is not an answer, it is the reason for “not Mina”");
  const yn = await th.turn("Did Mina give Jonathan a book?"); assert.match(yn.text, /^No: you told me “Mina did not give Jonathan a book\.”$/);
  th = await mk();
  await th.turn("Mina gave Jonathan a book.");
  assert.equal((await th.turn("Who gave Jonathan a book?")).text, "Mina.");
  assert.match((await th.turn("Did Mina give Jonathan a book?")).text, /^Yes: you told me “Mina gave Jonathan a book\.”$/);
  await th.turn("Mina did not give Jonathan a book.");
  const after = await th.turn("Who gave Jonathan a book?");
  assert.match(after.text, /^Not Mina: you told me “Mina did not give Jonathan a book\.”$/, "the later negation retracts the earlier affirmation");
});
test("the word “help” inside a longer message does not open the help screen", T, async () => {
  const r = await thread.turn("Indha help kuda panna maataengura la?:-(");
  assert.notEqual(r.type, "help");
  assert.match((await thread.turn("help")).text, /^I can tell you the date and the time/);
  assert.equal((await thread.turn("What can you do?")).type, "help");
});
test("a person whose gender is not settled is told with “they” (plural verb); one the book decided keeps its own forms; a place is never “they”", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  await th.turn("Casey wrote a letter. Casey was tired. Jordan read the letter in Paris. Casey waved to Jordan. Mina kissed her son. She hugged herself. Mina lost her hat. Mina washed herself. Mina opened her door. Mina saw herself. Mina sold her house.");
  const profile = async (name) => th.engine.wordProfile("", { ref: th.engine.S.read.cast.referents.find((b) => b.forms[0][0] === name).ref });
  const casey = await profile("Casey");
  assert.equal(casey.pronoun.source, "they-default"); assert.equal(casey.pronoun.decided, false); assert.equal(casey.pronoun.nom, "they"); assert.equal(casey.pronoun.was, "were"); assert.equal(casey.pronoun.poss, "their");
  assert.match(casey.summary, /They wrote/);
  const mina = await profile("Mina");
  assert.equal(mina.pronoun.source, "referent"); assert.equal(mina.pronoun.nom, "she"); assert.match(mina.summary, /She /);
  const paris = await profile("Paris");
  assert.equal(paris.pronoun, null); assert.doesNotMatch(paris.summary, /They /);
});
// the near-verb stand-in (organs/verb-equivalents.js, another session's), with fixed directions standing in for the embedder (a codec stands in for a codec). The tests that need the organ say so and hold
// either way: without it nothing is substituted and the trace says why (the last one here).
const verbMod = await import("../organs/verb-equivalents.js").catch(() => null), HAVE_VERB = !!verbMod?.standsIn, HAVE_NEAR = HAVE_VERB && !!verbMod?.DIALS?.nearMissSigma;
const NEEDS_VERB = { skip: !thread ? T.skip : HAVE_VERB ? false : "the verb-equivalents organ is not in this checkout" }, NEEDS_NEAR = { skip: !thread ? T.skip : HAVE_NEAR ? false : "the verb-equivalents organ (with near misses) is not in this checkout" };
const D = 24, dir = (i, ...o) => { const v = new Array(D).fill(0); v[i] = 1; o.forEach(([j, x]) => { v[j] = x; }); return v; };
const VEC = { make: dir(0, [10, 0.1]), create: dir(0, [10, 0.2]), build: dir(0, [11, 0.3]), give: dir(1, [0, 0.4]) }, NEAR_MISS = { ...VEC, build: dir(0, [11, 2.0]) };   // build at 0.44 against a bar of 0.51: a near miss
const rnd = (key) => { let a = 0; for (const c of key) a = (a * 31 + c.charCodeAt(0)) >>> 0; return Array.from({ length: D }, () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 - 0.5; }); };
const embedOf = (table) => async (ts) => ts.map((t) => table[t.replace(/^to /, "")] ?? rnd(t)), verbEmbed = embedOf(VEC);
const mkThread = async (extra = {}) => { const { makeThread } = await import("./thread.mjs"); return makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00"), ...extra }); };
test("a near verb stands in when the exact verb finds nothing and the near verbs agree: “Who made Claude?” against “created”, and the reply says what it read", NEEDS_VERB, async () => {
  const th = await mkThread({ verbEmbed }); await th.turn("Claude was created by Anthropic.");
  const r = await th.turn("Who made Claude?");
  assert.equal(r.handled, true); assert.match(r.text, /^By Anthropic\./); assert.match(r.text, /I read “make” as “create”/);
  const s = r.trace.find((t) => t.step === "verb_stand_in"); assert.equal(s.verdict, "same"); assert.equal(s.read_as, "create"); assert.ok(s.similarity > 0.8); assert.ok(r.evidence.length >= 1);
});
test("two near verbs that say different things are not chosen between: the chat says both and picks none", NEEDS_VERB, async () => {
  const th = await mkThread({ verbEmbed }); await th.turn("Claude was created by Anthropic. Claude was built by Acme.");
  const r = await th.turn("Who made Claude?");
  assert.equal(r.handled, false); assert.equal(r.gap, "near_verbs_differ"); assert.match(r.text, /“create”: by Anthropic/); assert.match(r.text, /“build”: by Acme/); assert.match(r.text, /I won't pick/);
  assert.equal(r.trace.find((t) => t.step === "verb_stand_in").verdict, "other");
});
test("the exact verb is never replaced: when it answers, no stand-in runs; with no near verb the gap stays; without an embedder nothing is substituted and the trace says why", NEEDS_VERB, async () => {
  const th = await mkThread({ verbEmbed }); await th.turn("Claude was created by Anthropic.");
  const exact = await th.turn("Who created Claude?"); assert.match(exact.text, /^By Anthropic\./); assert.ok(!exact.trace.some((t) => t.step === "verb_stand_in"), "the exact verb answered: no stand-in");
  const far = await th.turn("Who gave Claude?"); assert.equal(far.handled, false); assert.equal(far.trace.find((t) => t.step === "verb_stand_in")?.verdict ?? "none", "none");
  const bare = await mkThread({ verbEmbed: async () => { throw new Error("connection refused"); } }); await bare.turn("Claude was created by Anthropic.");
  const g = await bare.turn("Who made Claude?"); assert.equal(g.handled, false); assert.match(g.trace.find((t) => t.step === "verb_stand_in").gap, /embedder could not be reached/);
});
test("“they” is for what the whole thread does not settle: a name or title the prior settles is he or she, four pronouns settle it for the thread, a place that acts keeps its name, a predicate adjective is not something done", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-23T14:51:00") });
  await th.turn("Casey wrote a letter. Casey was tired. Casey waved. Pierre wrote a letter. Pierre lost the hat. Pierre waved. Mrs Bennet wrote a letter. Mrs Bennet lost the hat. Mrs Bennet waved. Paris sent a letter. Paris lost the hat. Paris waved. Mina kissed her son. She hugged herself. Mina lost her hat. Mina washed herself. Mina opened her door.");
  const profile = async (name) => th.engine.wordProfile("", { ref: th.engine.S.read.cast.referents.find((b) => b.forms[0][0] === name).ref });
  const casey = await profile("Casey"); assert.equal(casey.pronoun.source, "they-default"); assert.match(casey.summary, /They wrote and waved\./, "the adjective “tired” is a state, not an act");
  if (HAVE) {
    const pierre = await profile("Pierre"); assert.equal(pierre.pronoun.nom, "he"); assert.equal(pierre.pronoun.decided, true); assert.ok(["name", "title", "snapshot"].includes(pierre.pronoun.source)); assert.match(pierre.summary, /He wrote, lost and waved\./);
    const bennet = await profile("Mrs Bennet"); assert.equal(bennet.pronoun.nom, "she"); assert.equal(bennet.pronoun.source, "title");
  }
  const paris = await profile("Paris"); assert.equal(paris.pronoun, null); assert.doesNotMatch(paris.summary, /They |He |She /);
  const mina = await profile("Mina"); assert.equal(mina.pronoun.nom, "she"); assert.equal(mina.pronoun.decided !== false, true);
});
test("a verb a little below the bar never votes, but an answer under it that differs is said beside the answer", NEEDS_NEAR, async () => {
  const th = await mkThread({ verbEmbed: embedOf(NEAR_MISS) }); await th.turn("Claude was created by Anthropic. Claude was built by Acme.");
  const r = await th.turn("Who made Claude?");
  assert.equal(r.handled, true); assert.match(r.text, /^By Anthropic\./); assert.match(r.text, /I read “make” as “create”/); assert.match(r.text, /I also hold “build”: by Acme\./);
  const s = r.trace.find((t) => t.step === "verb_stand_in"); assert.equal(s.verdict, "same"); assert.deepEqual(s.near.map((x) => [x.verb, !!x.near_miss]), [["create", false], ["build", true]]); assert.equal(s.also[0].verb, "build");
});
test("without the verb-equivalents organ nothing is substituted: the question's own verb finds nothing, the gap stays, and the trace says why", { skip: !thread ? T.skip : HAVE_VERB ? "the organ is here (the stand-in tests above cover it)" : false }, async () => {
  const th = await mkThread({ verbEmbed }); await th.turn("Claude was created by Anthropic.");
  const r = await th.turn("Who made Claude?"); assert.equal(r.handled, false);
  const st = r.trace.find((t) => t.step === "verb_stand_in"); assert.equal(st.ran, false); assert.match(st.gap, /verb-equivalents organ .* is not in this checkout/);
  assert.match(th.state().priors.verbEquivalence, /not in this checkout/);
});
test("recall is by referent: a frame a pronoun fills answers the name's question, a pronoun is not another argument of its own verb, and a stranded preposition is not a participant", T, async () => {
  const th = await mkThread(); for (const m of ["Mina gave Jonathan a book.", "She lives in the village.", "Pierre visited Mina in the village.", "Pierre brought a basket of apples.", "He gave the apples to Jonathan."]) await th.turn(m);
  // “She” is Mina only if something settles it (Jonathan is the other name): with the given-name prior it does; without it “she” is open between them and the chat does not guess
  const where = await th.turn("Where does Mina live?"); if (HAVE) { assert.equal(where.handled, true); assert.match(where.text, /village/); } else assert.equal(where.handled, false, "an open “she” matches no one");
  // “He” is not Jonathan only where the reader hangs “to Jonathan” on the same verb as “He” (the stand-in parser does; the real one attaches it to “apples”, and then no clause says they are co-arguments)
  const rows = [...th.engine.S.rowsOf.values()].map((x) => x.rows).find((rs) => rs?.some((r) => r.upos === "PRON" && r.form === "He")) ?? [], he = rows.find((r) => r.form === "He"), jon = rows.find((r) => r.form === "Jonathan");
  if (HAVE && he && jon && he.head === jon.head) { const who = await th.turn("Who gave the apples to Jonathan?"); assert.match(who.text, /^Pierre\./, "“He” is not Jonathan: Jonathan is the other argument of the same verb"); }
  const eng = th.engine, partial = await eng.answer("Who did Pierre give the apples to?", { polarity: true });
  assert.ok(!partial.read.filled.some((w) => w.head === "to"), "the stranded “to” is the gap's role, not something the question names");
});
test("“u” is “you”: a chatty question about you and me is never sent out as a search, whichever parser read it", T, async () => {
  const th = await mkThread(); const r = await th.turn("great! u r starting on sunday right?");
  assert.ok(!r.trace.some((t) => t.step === "research"), "no research step: nothing about you or me is looked up in the world"); assert.notEqual(r.research, true);
  assert.match(r.text, /about you or me|haven't been told/);
});
