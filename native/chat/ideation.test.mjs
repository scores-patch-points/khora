// ideation.test.mjs — the failures of the owner's transcript of 2026-11-23, run as a fixture, the process that now catches them, and the doors.
//   "who is Tolstoy?" then "go research it" (the second must not overtake the first), then "who was his wife?" (answered "tolstoy").
// What is checked: replies come back in the order asked; the person a giver names becomes someone "his" can stand for; the self-answer is PUT
// FORWARD AS A CANDIDATE and REFUTED BY JANUS (its own organ, through its own door, writer "janus"); NOT KNOWING sends the chat to the doors that
// declare that gap's shape, without being asked; a slash calls a door by hand; every step is in the shared log, each written by whoever did it.
// The network is a stub (getJson), so this runs offline. Skips without the reader's priors or janus.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-ideation-"));
process.env.CHAT_PHAROS_DIR = dir;
let make = null, why = null, janus = null, log = null, rec = null;
const order = [];
const know = {
  async person(w) { await new Promise((r) => setTimeout(r, 120)); return w === "tolstoy" ? { id: "Q7243", label: "Leo Tolstoy", description: "Russian author (1828–1910)" } : null; },
  async lookup(w) { return { primary: w === "dog" ? "A domesticated canid." : w === "serendipity" ? "The occurrence of events by chance in a happy way." : null }; },
};
// what Wikidata and Wikipedia would say, as a function of the URL (so the doors run for real, against nothing)
const world = { spouses: [] };
const getJson = async (url) => {
  if (url.includes("list=search")) return { query: { search: [{ title: "Leo Tolstoy" }] } };
  if (url.includes("exintro")) return { query: { pages: { 1: { title: "Leo Tolstoy", extract: "Leo Tolstoy wrote War and Peace. He was born in Russia." } } } };   // the opening only (the wiki and search doors)
  if (url.includes("wikipedia.org")) return { query: { pages: { 1: { title: "Leo Tolstoy", extract: "Leo Tolstoy was a Russian writer.\n\nCareer\nLeo Tolstoy wrote War and Peace. He was born in Russia." } } } };   // the whole text (the hunt)
  if (url.includes("labels")) return { entities: { Q256391: { labels: { en: { value: "Sophia Tolstaya" } }, claims: { P21: [{ mainsnak: { datavalue: { value: { id: "Q6581072" } } } }] } } } };
  return { entities: { Q7243: { claims: world.spouses.length ? { P26: world.spouses.map((id) => ({ mainsnak: { datavalue: { value: { id } } } })) } : {} } } };
};
try {
  const { makeThread } = await import("./thread.mjs");
  const { mountJanus } = await import("./janus-door.mjs");
  rec = await import("./record.mjs");
  log = rec.openLog();
  janus = await mountJanus({ dir: rec.LOG_DIR });
  if (!janus.on) why = janus.why;
  else make = (over = {}) => makeThread({ hl: "http://127.0.0.1:1", know, now: () => new Date("2026-11-23T14:51:00"), janus, log, getJson, codeRouter: null, ...over });
} catch (e) { why = String(e?.message ?? e).slice(0, 140); }
const th = make ? await make() : null;
const T = { skip: th ? false : `not available here: ${why}` };
// tests that need another session's organs (not committed with this file) skip when those organs are absent, instead of failing
const organ = (f) => ({ skip: T.skip || (fs.existsSync(new URL(`../organs/${f}`, import.meta.url)) ? false : `native/organs/${f} is not in this checkout`) });
const TP = organ("puzzle-reader.js"), TH = organ("void-hunt.js");

test("messages are answered one at a time, in the order they were sent", T, async () => {
  const a = th.turn("who is Tolstoy?").then((r) => { order.push("first"); return r; });
  const b = th.turn("go research it").then((r) => { order.push("second"); return r; });
  const [ra, rb] = await Promise.all([a, b]);
  assert.deepEqual(order, ["first", "second"]);
  assert.equal(ra.type, "reference"); assert.match(ra.text, /^Leo Tolstoy: Russian author/);
  assert.deepEqual(ra.cites.map((c) => c.label), ["Wikidata"]); assert.equal(ra.cites[0].id, "Q7243");
  assert.equal(rb.handled, true); assert.equal(rb.text, "Leo Tolstoy wrote War and Peace. He was born in Russia.", "“go research it” after telling about Tolstoy goes on about Tolstoy: it reads the article, as Wikipedia's words");
});

test("a person a giver named is someone the thread can point to, and the thread says whose word it is", T, async () => {
  const r = await th.turn("who is he?");
  assert.equal(r.handled, true); assert.match(r.text, /^That would be Tolstoy\./); assert.match(r.text, /Wikidata says/);
});

test("“who was his wife?”: janus refutes the owner as the answer; the gap's shape sends the chat to the door that fills it; a giver with none is said", T, async () => {
  world.spouses = [];
  const r = await th.turn("who was his wife?");
  assert.equal(r.handled, false); assert.equal(r.type, "kin"); assert.equal(r.gap, "no_spouse_fact");
  assert.equal(r.text, "I haven't been told who Tolstoy's wife was, and I went to look: Wikidata lists no wife for Tolstoy.");
  assert.ok(r.tools.some((t) => t.name === "/relation"), "the door was called without being asked");
  assert.ok(r.trace.some((s) => s.step === "research" && s.gap === "no_spouse_fact" && s.doors.includes("relation")), "by the gap's shape, not by a word of the question");
  const c = r.thought.claims, by = (needle) => c.find((x) => x.label.includes(needle));
  assert.equal(r.thought.on, true);
  assert.equal(by("stands for").standing, "supported"); assert.equal(by("stands for").door, "given");
  const self = c.find((x) => x.relation.verb === "is" && x.relation.object === "Tolstoy");
  assert.equal(self.standing, "refuted"); assert.equal(self.assessed.writer, "janus"); assert.match(self.assessed.basis, /self relation/);
  const open = c.find((x) => x.relation.verb.startsWith("has a"));
  assert.equal(open.standing, "unresolved"); assert.equal(open.assessed.writer, "janus");
});

test("the same question when the giver has an answer: the chat found it itself, cited, and janus's gate calls it licensed (a giver's word), never supported", T, async () => {
  world.spouses = ["Q256391"];
  const r = await th.turn("who was his wife?");
  assert.equal(r.handled, true); assert.equal(r.text, "Sophia Tolstaya.");
  assert.deepEqual(r.cites.map((c) => [c.label, c.id]), [["Wikidata", "Q7243 P26"]]);
  const got = r.thought.claims.find((x) => x.door === "given" && x.relation.object === "Sophia Tolstaya");
  assert.equal(got.standing, "licensed", "a named giver licenses a claim; it does not witness it");
  assert.equal(r.thought.claims.find((x) => x.relation.verb === "is" && x.relation.object === "Tolstoy").standing, "refuted", "the self-answer is still put forward and still refuted");
});

test("slash commands call a door by hand, and /doors says what is on and what is not and why", T, async () => {
  const d = await th.turn("/doors");
  assert.equal(d.type, "door"); assert.ok(d.doors.some((x) => x.name === "relation" && x.on)); { const have = !TP.skip; const reason = d.doors.find((x) => x.name === "reason"); assert.equal(reason.on, have, "the reason door is on exactly when the puzzle reader is in this checkout"); if (!have) assert.match(reason.why, /puzzle reader/); }
  assert.match(d.text, /\/person <name>/);
  assert.equal((await th.turn("/calc 15 % of 80")).text, "12.");
  assert.match((await th.turn("/clock day")).text, /^Today is Monday\./);
  assert.match((await th.turn("/define dog")).text, /^Dog: A domesticated canid\./);
  const none = await th.turn("/define zzz"); assert.equal(none.handled, false); assert.equal(none.gap, "no_definition");
  const unk = await th.turn("/nosuch thing"); assert.equal(unk.handled, false); assert.equal(unk.gap, "no_such_door");
  const rel = await th.turn("/relation wife of Tolstoy"); assert.equal(rel.text, "Sophia Tolstaya."); assert.ok(rel.tools.some((t) => t.name === "/relation"));
});

test("the person door judges its first hit: it must be the person asked for, else the closest is said (the census: “Marie Curie” returned “Marie de France”)", T, async () => {
  const mine = await make({ know: { ...know, async person(w) { return w === "marie curie" ? { id: "Q1", label: "Marie de France", description: "medieval poet" } : w === "tolstoy" ? { id: "Q7243", label: "Leo Tolstoy", description: "Russian author (1828–1910)" } : null; } } });
  const no = await mine.turn("/person Marie Curie"); assert.equal(no.handled, false); assert.equal(no.gap, "no_such_person"); assert.match(no.text, /no person called exactly “Marie Curie”; the closest it found is Marie de France/);
  const yes = await mine.turn("/person Tolstoy"); assert.equal(yes.handled, true, "every word of the name is in the label");
});

test("a rate-limited service is waited out, and the same question twice asks the giver once", T, async () => {
  const { fetchJson } = await import("./doors.mjs"); let calls = 0;
  const real = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return calls < 3 ? { status: 429, ok: false, headers: new Map([["retry-after", "0"]]), json: async () => ({}) } : { status: 200, ok: true, headers: new Map(), json: async () => ({ ok: calls }) }; };
  try {
    const a = await fetchJson("https://example.invalid/x?1"), b = await fetchJson("https://example.invalid/x?1");
    assert.deepEqual(a, { ok: 3 }); assert.deepEqual(b, a); assert.equal(calls, 3, "two 429s, one success, then the cache");
  } finally { globalThis.fetch = real; }
});

test("a door that stays rate-limited says so instead of a generic failure", T, async () => {
  const mine = await make({ getJson: async () => { const e = new Error("HTTP 429"); e.rate = true; throw e; } });
  const r = await mine.turn("/wiki Leo Tolstoy"); assert.equal(r.gap, "rate_limited"); assert.match(r.text, /asked me to slow down/);
});

test("a door reads what it fetched into the thread as the giver's, so a question is answered from it, with its source", T, async () => {
  const mine = await make();
  const w = await mine.turn("/wiki Leo Tolstoy");
  assert.equal(w.handled, true); assert.equal(w.introduced[0].source, "Wikipedia"); assert.deepEqual(w.cites.map((c) => c.label), ["Wikipedia"]);
  const r = await mine.turn("Who wrote War and Peace?");
  assert.equal(r.handled, true); assert.match(r.text, /Tolstoy/);
  assert.ok(r.evidence.some((e) => e.given === "Wikipedia"), "the sentence is quoted back as Wikipedia's, not as something the user said");
});

test("not knowing sends the chat to HUNT: the void is declared, whole pages are read for what fills it, the answer is cited to its page and sentence, and janus calls it a giver's word", TH, async () => {
  const mine = await make();
  const statuses = [], r = await mine.turn("Who wrote War and Peace?", { onStatus: (t) => statuses.push(t) });
  assert.ok(r.trace.some((x) => x.step === "research" && x.gap === "no_answer" && x.doors[0] === "hunt" && x.doors.includes("search")), "by the gap's shape: the hunt first, the plain search behind it");
  assert.ok(r.tools.some((t) => t.name === "/hunt")); assert.deepEqual(statuses, ["Looking through Wikipedia…"], "a chat app shows what it is doing while it looks");
  assert.equal(r.handled, true); assert.equal(r.text, "Leo Tolstoy.");
  assert.ok(r.evidence.some((e) => e.given === "Wikipedia" && /wrote War and Peace/.test(e.text)), "the sentence, verbatim, as Wikipedia's");
  assert.equal(r.cites[0].label, "Wikipedia"); assert.match(r.cites[0].id, /^Leo Tolstoy/); assert.match(r.cites[0].url, /^https:\/\/en\.wikipedia\.org\/wiki\/Leo_Tolstoy/);
  const claim = r.thought.claims.find((x) => x.door === "given" && x.relation.verb === "is" && x.relation.object === "Leo Tolstoy");
  assert.equal(claim.standing, "licensed", "a named giver's text licenses the claim; nothing in the thread witnessed it");
});

test("when the hunt finds nothing that says it, the reply says so and no other door is tried; a question it cannot hunt falls back to the plain search", TH, async () => {
  const mine = await make();
  const none = await mine.turn("Who composed the opera Aida?");
  assert.equal(none.handled, false); assert.equal(none.gap, "nothing_fills_the_void"); assert.equal(none.text, "I read what Wikipedia has on it and found nothing that says.");
  assert.ok(!none.tools.some((t) => t.name === "/search"));
  const fall = await mine.turn("How does war end?");   // no anchor to hunt
  assert.ok(fall.tools.some((t) => t.name === "/hunt") && fall.tools.some((t) => t.name === "/search"), "tried the hunt, then the search");
  assert.match(fall.text, /^I haven't been told that, and I went to look: I read the opening of Wikipedia's article “Leo Tolstoy”, but it doesn't answer it\.$/);
});

test("a throttled Wikipedia is said as throttled, with nothing read", TH, async () => {
  const mine = await make({ getJson: async () => { throw new Error("HTTP 429 rate limit"); } });
  const r = await mine.turn("Who wrote War and Peace?");
  assert.equal(r.handled, false); assert.equal(r.gap, "source_rate_limited"); assert.match(r.text, /^Wikipedia asked me to slow down/);
});

test("a request about a name the thread has not met is acted on; one about the world is not", T, async () => {
  const mine = await make();
  const a = await mine.turn("find Tolstoy"); assert.equal(a.type, "reference"); assert.match(a.text, /^Leo Tolstoy/);
  const b = await mine.turn("open the door"); assert.equal(b.handled, false); assert.equal(b.gap, "act_not_possible"); assert.equal(b.text, "I can look things up and answer from what I'm told, but I can't do that.");
});

test("“go research it” after a gap looks again at that gap", T, async () => {
  world.spouses = [];
  const mine = await make();
  await mine.turn("who is Tolstoy?");
  const gap = await mine.turn("who was his wife?"); assert.equal(gap.handled, false);
  world.spouses = ["Q256391"];   // the giver now has it
  const again = await mine.turn("go research it");
  assert.equal(again.handled, true); assert.equal(again.text, "Sophia Tolstaya.");
});

const PUZZLE = `A teacher writes six words on a board: "cat dog has max dim tag." She gives three students, Albert, Bernard and Cheryl each a piece of paper with one letter from one of the words. Then she asks, "Albert, do you know the word?" Albert immediately replies yes. She asks, "Bernard, do you know the word?" He thinks for a moment and replies, "Yes." Then, she asks Cheryl the same question. She thinks and then replies, "Yes." What is the word?`;

test("the owner's puzzle: the readings are listed, each is run, the one that leaves a single answer holds, and janus projects the standing", TP, async () => {
  const mine = await make();
  const before = mine.state().sentences;
  const r = await mine.turn(PUZZLE, { onStatus: () => {} });
  assert.equal(r.type, "puzzle"); assert.equal(r.handled, true);
  assert.match(r.text, /^Dog\. After Albert said yes, 5 words were still possible; after Bernard said yes, 3 words were still possible; after Cheryl said yes, 1 word was still possible\.$/);
  assert.equal(mine.state().sentences, before, "a puzzle is not stored as facts");
  const c = r.thought.claims, read = c.filter((x) => x.relation.verb === "is read as");
  assert.equal(read.length, 6, "six readings put forward");
  assert.deepEqual(read.map((x) => x.standing).sort(), ["refuted", "refuted", "refuted", "supported", "unresolved", "unresolved"]);
  assert.match(read.find((x) => x.standing === "supported").label, /different letter of the one word, in any order; “yes” means they know the word/);
  const ans = c.find((x) => x.relation.verb === "is" && x.relation.object === "dog");
  assert.equal(ans.standing, "supported"); assert.ok(ans.premises.some((pid) => read.find((x) => x.id === pid)?.standing === "supported"), "the answer rests on the reading that holds"); assert.ok(ans.premises.length === 2, "and on the message having been read as a puzzle");
  assert.ok(r.tools.some((t) => t.name === "/reason"));
});

test("a puzzle whose text the reader cannot fully set up says what it read and what it did not, and runs nothing smaller", TP, async () => {
  const mine = await make();
  const r = await mine.turn(`Albert and Bernard just became friends with Cheryl, and they want to know when her birthday is. Cheryl gave them a list of 10 possible dates: May 15, May 16, May 19, June 17, June 18, July 14, July 16, August 14, August 15, August 17. Cheryl then tells Albert and Bernard separately the month and the day of her birthday respectively. Albert: I don't know when Cheryl's birthday is, but I know that Bernard does not know too. Bernard: At first I don't know when Cheryl's birthday is, but I know now. Albert: Then I also know when Cheryl's birthday is. So when is Cheryl's birthday?`);
  assert.equal(r.type, "puzzle"); assert.equal(r.handled, false); assert.match(r.text, /^I read \d+ dates? and 2 people \(Albert, Bernard\)/);
});

test("a remark is social only on positive evidence; a bare fragment or name is not looked up and is not stored; a held name is answered from the notebook; a question about you or me is not researched", T, async () => {
  const sent = [], asked = [], mine = await make({ getJson: async (u) => { sent.push(u); return { query: { search: [] } }; }, know: { ...know, async person(w) { asked.push(w); return null; } } });
  const before = mine.state().sentences;
  const ok = await mine.turn("Ok dear"); assert.equal(ok.type, "social"); assert.equal(ok.text, "Okay.");
  for (const t of ["Sorry dear", "good morning", "Bangalore", "Der"]) { const r = await mine.turn(t); assert.equal(r.type, "fragment", t); assert.equal(r.gap, "fragment_unclear"); assert.equal(r.text, `I'm not sure what you mean by “${t}”.`); }
  assert.equal(mine.state().sentences, before, "nothing was stored");
  assert.deepEqual([sent.length, asked.length], [0, 0], "nothing was sent out for a word the chat took for a name, nor for any other fragment");
  await mine.turn("Pierre loves Natasha.");
  const held = await mine.turn("Pierre"); assert.equal(held.type, "identity", "a name the notebook holds is answered from it"); assert.match(held.text, /Pierre loves Natasha/);
  const you = await mine.turn("Where are you now exactly?"); assert.equal(you.handled, false); assert.ok(!you.tools.some((t) => t.name === "/search"), "no search for a question about the chat's own participants");
  assert.match(you.text, /about you or me/);
});
test("everything is in the shared log, and each entry is written by whoever did the step", T, async () => {
  const fold = rec.readKinds(log, ["candidate", "assessment", "tool"]).map((e) => ({ kind: e.kind, by: e.by, ev: e.body.event?.kind ?? null, door: e.body.door ?? null }));
  assert.ok(fold.some((e) => e.kind === "candidate" && e.by === "khora-chat" && e.ev === "propose"));
  assert.ok(fold.some((e) => e.kind === "assessment" && e.by === "janus" && e.ev === "assess"), "janus wrote its own verdicts, through its own door");
  assert.ok(fold.some((e) => e.kind === "assessment" && e.by === "khora-chat"), "khora's own instruments write theirs");
  assert.ok(fold.some((e) => e.kind === "tool" && e.door === "relation"), "every door call is a tool entry");
  assert.ok(fs.readdirSync(dir).includes("janus.jsonl") && fs.readdirSync(dir).includes("khora-chat.jsonl"), "one file per writer in the one log");
});

test("with janus not mounted the old answer is not silently rebuilt, the relation door says it is off, and the reply says nothing was linted", T, async () => {
  const bare = await make({ janus: { on: false, why: "no janus checkout found" } });
  await bare.turn("who is Tolstoy?");
  const r = await bare.turn("who was his wife?");
  assert.ok(!/^That would be/.test(r.text), "the owner is never the answer to a possessed noun");
  assert.equal(r.thought.on, false); assert.match(r.thought.why, /no janus checkout/, "the reply carries the reason nothing was tested");
  const d = await bare.turn("/doors"); assert.ok(d.doors.some((x) => x.name === "relation" && !x.on && /janus/.test(x.why)));
});

test("when the user said the person, the binding is witnessed by a span of the thread, and the same candidate is still refuted", T, async () => {
  world.spouses = [];
  const mine = await make();
  await mine.turn("Pierre wrote a letter to Natasha.");
  const r = await mine.turn("Who was his wife?");
  assert.equal(r.type, "kin");
  const bind = r.thought.claims.find((x) => x.relation.verb === "stands for");
  assert.equal(bind.standing, "supported"); assert.equal(bind.door, "presented"); assert.ok(bind.assessed.method === "testimony");
  assert.equal(r.thought.claims.find((x) => x.relation.verb === "is").standing, "refuted");
});

test("addressing: a leading name and comma is who is spoken to, not the thing asked about; nothing researches it", T, async () => {
  const seen = [];
  const mine = await make({ know: { ...know, async person(w) { seen.push(w); return w === "marie curie" ? { id: "Q7186", label: "Marie Curie", description: "Polish-French physicist and chemist" } : null; } } });
  const r = await mine.turn("Fold, who is Marie Curie?");
  assert.equal(r.type, "reference"); assert.match(r.text, /^Marie Curie: Polish-French physicist/); assert.equal(r.addressed, "Fold");
  assert.deepEqual(seen, ["marie curie"], "the giver was asked about Marie Curie and never about Fold");
  const list = await mine.turn("Pierre, Natasha and Mina went home."); assert.equal(list.type, "read", "a list that starts with a name is not an address");
});

test("a yes/no question about people the thread already holds is not researched: the world cannot say what was said in the thread", T, async () => {
  const mine = await make();
  await mine.turn("Pierre loves Natasha.");
  const r = await mine.turn("Does Natasha love Pierre?");
  assert.equal(r.handled, false); assert.equal(r.text, "I haven't been told that."); assert.ok(!r.tools.some((t) => t.name === "/search"), "no search door call");
  assert.ok(r.trace.some((s) => s.step === "no_research"));
  assert.match((await mine.turn("Does Pierre love Natasha?")).text, /^Yes: you told me “Pierre loves Natasha\.”$/);
});

test("the chat says what it takes a message to be: claims on marks, ambiguity left open and said, and a correction withdraws the last reading", T, async () => {
  const mine = await make();
  const soc = await mine.turn("ok");
  assert.equal(soc.type, "social"); assert.equal(soc.acts.working, "social"); assert.equal(soc.taken, null);
  const c1 = soc.thought.claims.find((x) => x.relation.verb === "counts as" && x.standing === "supported");
  assert.equal(c1.relation.object, "a social remark"); assert.match(c1.assessed.basis, /an opening interjection and nothing else/);
  assert.equal(soc.thought.claims.find((x) => x.relation.object === "something I can't place").standing, "refuted", "the unplaceable reading is shown as ruled out");

  const amb = await mine.turn("really?");
  assert.equal(amb.acts.open, true); assert.equal(amb.acts.working, "fragment"); assert.deepEqual(amb.acts.alternatives, ["question"]);
  assert.equal(amb.type, "clarify"); assert.equal(amb.gap, "act_open"); assert.equal(amb.text, "Did you mean “really?” as a question?", "an open act is asked about, not routed to the least harmful reading"); assert.equal(amb.taken, null);
  assert.deepEqual(amb.thought.claims.filter((x) => x.relation.verb === "counts as").map((x) => x.standing), ["unresolved", "unresolved"]);

  await mine.turn("Pierre loves Natasha.");
  const q = await mine.turn("Pierre loves Natasha?");
  assert.equal(q.acts.working, "question"); assert.match(q.text, /^Yes: you told me/);
  const opp = q.thought.claims.find((x) => x.relation.object === "something you're telling me");
  assert.equal(opp.standing, "refuted"); assert.match(opp.assessed.basis, /a final question mark.*count.* against/);

  const un = await mine.turn("…"); assert.equal(un.handled, false); assert.equal(un.gap, "act_unread");
});

test("a correction withdraws what was taken from the previous message, and what it said is no longer an answer", T, async () => {
  const mine = await make();
  const told = await mine.turn("Mina gave Jonathan a book.");
  const first = told.thought.claims.find((x) => x.relation.verb === "counts as");
  assert.equal((await mine.turn("Who gave Jonathan a book?")).text, "Mina.");
  await mine.turn("Mina gave Jonathan a book.");   // a second statement, so the correction has something to take back
  const r = await mine.turn("no, Mina gave Jonathan a pen.");
  assert.equal(r.type, "correction"); assert.match(r.text, /^Okay, I've set that aside\. /);
  const was = r.thought.claims.find((x) => x.relation.verb === "counts as" && x.proposedBy && x.standing === "withdrawn");
  assert.ok(was, "the earlier reading is shown as withdrawn"); assert.equal(r.thought.claims.find((x) => x.relation.verb === "corrects").standing, "supported");
  assert.equal((await mine.turn("Who gave Jonathan a pen?")).text, "Mina.");
  assert.equal((await mine.turn("Who gave Jonathan a book?")).text, "Mina.", "the first sentence still stands: only the one just before the correction was taken back");
  const none = await make(); const bare = await none.turn("no");
  assert.equal(bare.type, "social", "with nothing before it, “no” is only a remark");
  assert.ok(bare.thought.claims.some((x) => x.relation.verb === "corrects" && x.standing === "refuted"));
});

test("every reply carries its question, so the server can weave it (a correction and an unread message had none, and the weave refused them)", T, async () => {
  const mine = await make();
  await mine.turn("Mina gave Jonathan a book.");
  for (const m of ["no, Mina gave Jonathan a pen.", "…", "really?", "Sorry dear", "ok"]) { const r = await mine.turn(m); assert.equal(typeof r.question, "string", m); assert.ok(r.question.length > 0, m); }
});

test("a correction takes back the last message that said something, not a social remark in between", T, async () => {
  const mine = await make();
  await mine.turn("Pierre loves Natasha.");
  await mine.turn("really?");
  const r = await mine.turn("no, Pierre hates Natasha.");
  assert.equal(r.type, "correction");
  const gone = r.thought.claims.filter((x) => x.standing === "withdrawn"); assert.equal(gone.length, 1); assert.equal(gone[0].relation.object, "something you're telling me");
  assert.equal((await mine.turn("Who loves Natasha?")).handled, false, "the taken-back sentence is no longer an answer");
  assert.equal((await mine.turn("Who hates Natasha?")).text, "Pierre.");
});

test("words the reader does not know never leave: no outside call for a message it cannot read (a privacy line)", T, async () => {
  const sent = [], mine = await make({ getJson: async (u) => { sent.push(u); return { query: { search: [] } }; } });
  const r = await mine.turn("Indha help kuda panna maataengura la?:-(");
  assert.equal(sent.length, 0, "nothing was sent to Wikipedia"); assert.equal(r.handled, false);
  // refused up front by the language gate where the priors home has an identifier ("most of the words aren't English I know"), or by the chat's own check of the words it knows: either way nothing is read and nothing is sent
  assert.match(r.text, /^(I couldn't read some of those words, so I didn't look anything up\.|I couldn't tell what language that is: most of the words aren't English I know, so I haven't read it\.)$/);
  assert.ok(r.trace.some((s) => (s.step === "no_research" && s.unreadable >= 1) || s.step === "language"));
  const typo = await mine.turn("wat is the captial of italy?"); assert.equal(sent.length, 0, "a misspelling is not sent out either");
  const fine = await mine.turn("Who wrote War and Peace?"); assert.ok(sent.length > 0, "a question made of words the reader knows still goes looking");
});

test("a word's meaning comes from the dictionary on this machine: a rare word is what a definition is for, and nothing is sent out", T, async () => {
  const sent = [], mine = await make({ getJson: async (u) => { sent.push(u); return { query: { search: [] } }; } });
  const r = await mine.turn("what does serendipity mean?");
  assert.equal(r.type, "definition"); assert.equal(r.handled, true); assert.equal(r.text, "Serendipity: The occurrence of events by chance in a happy way.");
  assert.equal(sent.length, 0, "the dictionary is local"); assert.deepEqual(r.cites.map((c) => c.label), ["the dictionary (kaikki)"]);
  const none = await mine.turn("what does zzyzx mean?"); assert.equal(none.handled, false); assert.equal(none.gap, "no_definition"); assert.equal(sent.length, 0);
});

test("the thing asked about is the whole name, in what is looked up and in what is said", T, async () => {
  const asked = [], mine = await make({ getJson: async () => ({ query: { pages: { "-1": { missing: "" } }, search: [] } }), know: { ...know, async person(w) { asked.push(w); return null; } } });
  const r = await mine.turn("who is Marie Curie?");
  assert.deepEqual(asked, ["marie curie"]); assert.equal(r.text, "I haven't been told about Marie Curie, and no giver I can reach knows it.");
});

test("a pronoun with nothing in the thread to point to is asked about, not researched around: “is it worth doing?” sends nothing", T, async () => {
  const sent = [], mine = await make({ getJson: async (u) => { sent.push(u); return { query: { search: [] } }; } });
  const r = await mine.turn("is it worth doing?");
  assert.equal(r.handled, false); assert.equal(r.gap, "no_antecedent"); assert.equal(r.text, "I don't know what “it” stands for: nothing said so far gives it anything to point to. Who or what do you mean?"); assert.equal(sent.length, 0);
  await mine.turn("Mina gave Jonathan a book."); const bound = await mine.turn("Who did she give it to?"); assert.notEqual(bound.gap, "no_antecedent", "a pronoun the thread does hold is not dangling");
});

test("mechanic 7: a question the chat put to the user is answered by the next fragment, which is read as that answer; anything else drops the question", T, async () => {
  const sent = [], mine = await make({ getJson: async (u) => { sent.push(decodeURIComponent(u)); return { query: { search: [] } }; } });
  await mine.turn("is it worth doing?");   // the chat asks who or what “it” is
  const b = await mine.turn("the course");
  assert.deepEqual(b.paired, { question: "is it worth doing?", answer: "the course", rebuilt: "is the course worth doing?" });
  assert.equal(b.question, "is the course worth doing?", "the original question was asked again with the answer in its place");
  assert.ok(b.trace.some((x) => x.step === "paired")); assert.ok(b.thought.claims.some((x) => x.relation.verb === "answers" && x.standing === "supported"));
  assert.ok(sent.every((u) => !u.includes("worth doing?") || u.includes("course")), "what was looked up, if anything, is about the course");
  // a message that is not a fragment drops the open question: the fragment that follows is just a fragment
  const other = await make(); await other.turn("is it worth doing?"); await other.turn("Mina gave Jonathan a book.");
  const c = await other.turn("the course"); assert.equal(c.paired, undefined); assert.equal(c.gap, "fragment_unclear");
  // and a fragment with nothing asked is unchanged
  const fresh = await make(); const d = await fresh.turn("the course"); assert.equal(d.paired, undefined); assert.equal(d.gap, "fragment_unclear");
});

test("mechanic 7, over-pairing closed: an answer is used only if it fits what was asked, else the chat asks again and the question stays open", T, async () => {
  const sent = [], mk = () => make({ getJson: async (u) => { sent.push(decodeURIComponent(u)); return { query: { search: [] } }; } });
  const tryPair = async (q, a) => { const th = await mk(); await th.turn(q); sent.length = 0; const r = await th.turn(a); return { r, th, sent: sent.length }; };
  for (const [q, a, want] of [["is it open?", "the shop", "is the shop open?"], ["did he arrive?", "Pierre", "did Pierre arrive?"], ["does she live here?", "Sonya", "does Sonya live here?"], ["is it far?", "the station", "is the station far?"]]) {
    const { r } = await tryPair(q, a); assert.equal(r.paired?.rebuilt, want, `${q} / ${a}`);
  }
  const no = [["did he arrive?", "the course", /“he” is a person and “the course” is not a name/], ["where is she?", "the station", /is not a name/], ["is it open?", "Natasha", /I don't know “Natasha”/], ["is it far?", "Hahaha", /I don't know “Hahaha”/], ["is it far?", "!pt", /not a name or a thing/]];
  for (const [q, a, why] of no) {
    const { r, sent: n } = await tryPair(q, a);
    assert.equal(r.paired, undefined, `${q} / ${a}`); assert.equal(r.gap, "answer_does_not_fit"); assert.match(r.text, why); assert.match(r.text, /Who or what do you mean\?$/); assert.equal(n, 0, "nothing was sent out");
    assert.ok(r.thought.claims.some((x) => x.relation.verb === "answers" && x.standing === "refuted"), "the refused pairing is a ruled-out claim, shown");
  }
  // the question stays open after a bad answer, and a good one then pairs
  const th = await mk(); await th.turn("is it open?"); await th.turn("Hahaha"); const good = await th.turn("the shop"); assert.equal(good.paired?.rebuilt, "is the shop open?");
});

test("a prior that is missing is said, not silently skipped; when it is there the reply shows its source and how often that source was right", T, async () => {
  const prior = (await import("../adapters/text/gender-of-words.js").catch(() => null))?.makeDefaultNameGenderPrior?.({}), have = !!prior && !prior.missing;
  const mine = await make();
  assert.equal(mine.state().priors.nameGender.startsWith("loaded"), have);
  await mine.turn("did he arrive?"); const r = await mine.turn("Pierre");
  assert.equal(r.paired?.rebuilt, "did Pierre arrive?");
  const claim = r.thought.claims.find((x) => x.relation.verb === "answers");
  if (have) {
    assert.match(claim.assessed.basis, /“Pierre” reads as a man's name: name, right \d+% \(\d+ of \d+\) on held-out novels/);
    const wrong = await make(); await wrong.turn("did he arrive?"); const w = await wrong.turn("Natasha");
    assert.equal(w.gap, "answer_does_not_fit"); assert.match(w.text, /“Natasha” is usually a woman's name/);
  } else {
    assert.match(mine.state().priors.nameGender, /^no table of given names/);
    assert.match(claim.assessed.basis, /I have no table of given names, so I could not check that the name suits “he”/);
  }
});

test("“say more” goes on about what the chat was just telling: the article is read, two sentences at a time, as Wikipedia's words, until there is no more", T, async () => {
  const mine = await make();
  assert.equal((await mine.turn("say more")).gap, "no_topic", "nothing was said yet, so there is nothing to go on about");
  await mine.turn("who is Tolstoy?");   // Leo Tolstoy: Russian author (1828–1910): the topic is now Leo Tolstoy
  const more = await mine.turn("say more");
  assert.equal(more.handled, true); assert.equal(more.text, "Leo Tolstoy wrote War and Peace. He was born in Russia.");
  assert.ok(more.evidence.every((e) => e.given === "Wikipedia")); assert.equal(more.cites[0].label, "Wikipedia");
  const end = await mine.turn("go on"); assert.equal(end.handled, false); assert.equal(end.gap, "nothing_more"); assert.equal(end.text, "That's all I've read about Leo Tolstoy.");
  // other ways to ask for more, and the request that names a thing of its own is not "more"
  const again = await make(); await again.turn("who is Tolstoy?");
  for (const m of ["tell me more", "continue"]) { const r = await again.turn(m); assert.ok(r.handled || r.gap === "nothing_more", `${m} → ${r.gap}`); }
  const door = await again.turn("open the door"); assert.equal(door.gap, "act_not_possible");
});

test("“say more” tells the page in short, not in its own sentences: brackets off, the name the person uses; the page's sentence stays under Reasoning", T, async () => {
  const mine = await make({ getJson: async (u) => (u.includes("exintro") ? { query: { pages: { 1: { title: "Leo Tolstoy", extract: "Count Lev Nikolayevich Tolstoy (Russian: Лев Николаевич Толстой; 1828–1910), usually referred to in English as Leo Tolstoy, was a Russian writer. He wrote War and Peace." } } } } : { query: { search: [{ title: "Leo Tolstoy" }] } }) });
  await mine.turn("who is Tolstoy?");
  const r = await mine.turn("say more");
  assert.equal(r.text, "Leo Tolstoy was a Russian writer. He wrote War and Peace.");
  assert.match(r.evidence[0].text, /\(Russian: Лев Николаевич Толстой; 1828–1910\), usually referred to/, "the page's sentence, verbatim, is what the reply rests on");
});

test("an open act is asked about, and a yes or a no after it settles it; anything else drops the question", T, async () => {
  const yes = await make(); await yes.turn("really?");
  const y = await yes.turn("yes");
  assert.deepEqual(y.settled, { message: "really?", act: "question" }, "yes: the first message is read again as a question"); assert.equal(y.question, "really?");
  assert.ok(y.thought.claims.some((x) => x.relation.verb === "answers" && x.standing === "supported" && /a yes, straight after I asked/.test(x.assessed.basis)));
  const no = await make(); await no.turn("really?");
  const n = await no.turn("no"); assert.equal(n.type, "social"); assert.equal(n.text, "Okay."); assert.equal(n.settled, undefined);
  assert.equal((await no.turn("yes")).type, "social", "the question is closed: a later yes is only a remark");
  const drop = await make(); await drop.turn("really?");
  const d = await drop.turn("Mina gave Jonathan a book."); assert.equal(d.type, "read", "a statement is read as a statement; the question was dropped");
  assert.equal((await drop.turn("yes")).type, "social");
});

test("a “no” after the chat asked what a message meant answers that question; it does not take back what was said before", T, async () => {
  const mine = await make();
  await mine.turn("Pierre loves Natasha.");
  await mine.turn("really?");
  const n = await mine.turn("no"); assert.equal(n.type, "social"); assert.equal(n.text, "Okay.");
  assert.equal((await mine.turn("Who loves Natasha?")).text, "Pierre.", "the statement still stands");
  const c = await mine.turn("no, Pierre hates Natasha."); assert.equal(c.type, "correction", "a “no” with nothing asked is still a correction");
});
