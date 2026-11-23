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
  async lookup(w) { return { primary: w === "dog" ? "A domesticated canid." : null }; },
};
// what Wikidata and Wikipedia would say, as a function of the URL (so the doors run for real, against nothing)
const world = { spouses: [] };
const getJson = async (url) => {
  if (url.includes("list=search")) return { query: { search: [{ title: "Leo Tolstoy" }] } };
  if (url.includes("wikipedia.org")) return { query: { pages: { 1: { title: "Leo Tolstoy", extract: "Leo Tolstoy wrote War and Peace. He was born in Russia." } } } };
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
  else make = (over = {}) => makeThread({ hl: "http://127.0.0.1:1", know, now: () => new Date("2026-11-23T14:51:00"), janus, log, getJson, ...over });
} catch (e) { why = String(e?.message ?? e).slice(0, 140); }
const th = make ? await make() : null;
const T = { skip: th ? false : `not available here: ${why}` };

test("messages are answered one at a time, in the order they were sent", T, async () => {
  const a = th.turn("who is Tolstoy?").then((r) => { order.push("first"); return r; });
  const b = th.turn("go research it").then((r) => { order.push("second"); return r; });
  const [ra, rb] = await Promise.all([a, b]);
  assert.deepEqual(order, ["first", "second"]);
  assert.equal(ra.type, "reference"); assert.match(ra.text, /^Leo Tolstoy: Russian author/);
  assert.deepEqual(ra.cites.map((c) => c.label), ["Wikidata"]); assert.equal(ra.cites[0].id, "Q7243");
  assert.match(rb.text, /nothing I'm missing/, "“go research it” with nothing open is not refused: the chat says it has no gap, and that it looks by itself when it has one");
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
  assert.equal(d.type, "door"); assert.ok(d.doors.some((x) => x.name === "relation" && x.on)); assert.ok(d.doors.some((x) => x.name === "reason" && !x.on && /not wired/.test(x.why)));
  assert.match(d.text, /\/person <name>/); assert.match(d.text, /\(off: the reasoner exists/);
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

test("not knowing sends the chat to search by itself, to read the best matches into the thread, and to ask again", T, async () => {
  const mine = await make();
  const statuses = [], r = await mine.turn("Who wrote War and Peace?", { onStatus: (t) => statuses.push(t) });
  assert.ok(r.trace.some((s) => s.step === "research" && s.gap === "no_answer" && s.doors.includes("search")), "the gap no_answer is filled by the search door");
  assert.ok(r.tools.some((t) => t.name === "/search"));
  assert.deepEqual(statuses, ["Searching Wikipedia for “wrote War Peace”…"], "a chat app shows what it is doing while it looks");
  assert.match(r.text, /Tolstoy/, "and the question is asked again of what it read");
  assert.ok(r.evidence.some((e) => e.given === "Wikipedia")); assert.equal(r.cites[0].label, "Wikipedia");
});

test("when what it read does not answer, the reply says it looked and what it read", T, async () => {
  const mine = await make();
  const r = await mine.turn("Who composed the opera Aida?");
  assert.equal(r.handled, false); assert.match(r.text, /^I haven't been told that, and I went to look: I read the opening of Wikipedia's article “Leo Tolstoy”, but it doesn't answer it\.$/);
});

test("a request about a name the thread has not met is acted on; one about the world is not", T, async () => {
  const mine = await make();
  const a = await mine.turn("find Tolstoy"); assert.equal(a.type, "reference"); assert.match(a.text, /^Leo Tolstoy/);
  const b = await mine.turn("open the door"); assert.equal(b.handled, false); assert.equal(b.gap, "act_not_possible"); assert.match(b.text, /\/doors/);
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
  assert.equal(r.thought, null);
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
