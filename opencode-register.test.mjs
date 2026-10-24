// opencode-register.test.mjs — the register's bars (ported from foldcode-poc/mech/test, logic unchanged) plus the one-store seam:
// facts are `fact` marks under the session, the register is their projection, dedupe is by sentence across renumbered turns.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fresh = () => { process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "register-")); };
const R = await import("./opencode-register.mjs");
const E = await import("./opencode-eot.mjs");

const turns = (...texts) => texts.map((text, i) => ({ n: i + 1, role: "user", text }));

test("M1: a binding is extracted with its verbatim sentence and turn", () => {
  const { bindings } = R.extractBindings(turns("Our cat-named mascot service is called Orbit."));
  assert.equal(bindings.length, 1);
  assert.equal(bindings[0].subject, "cat-named mascot service");
  assert.equal(bindings[0].value, "Orbit");
  assert.equal(bindings[0].turn, 1);
  assert.match(bindings[0].sentence, /Orbit/);
});

test("M1: a non-latin turn is a typed gap, not a guess; a question binds nothing", () => {
  const { bindings, gaps } = R.extractBindings(turns("私たちのマスコットはOrbitと呼ばれます。"));
  assert.equal(bindings.length, 0);
  assert.equal(gaps[0].gap, "lang");
  assert.equal(R.extractBindings(turns("What is the mascot service called?")).bindings.length, 0);
});

test("M2: a later binding supersedes the earlier, both kept", () => {
  const { bindings } = R.extractBindings(turns("The deploy window is Thursdays at 02:00 UTC.", "Update: the deploy window is now Fridays at 03:00 UTC."));
  const reg = R.buildRegister(bindings);
  const f = reg.facts.find((x) => x.subject.includes("deploy window"));
  assert.equal(f.current.value, "Fridays at 03:00 UTC");
  assert.equal(f.history.length, 2);
  assert.equal(f.history[0].value, "Thursdays at 02:00 UTC");
});

test("M3: lookup returns current, superseded and original", () => {
  const mem = R.ingest(turns("The pilot launch is on 2026-11-18.", "Update: the pilot launch is now 2026-12-02.", "Update: the pilot launch moved again. It is now 2026-12-09."));
  assert.equal(R.lookup("when does the pilot launch now?", mem.register).value, "2026-12-09");
  assert.equal(R.lookup("what was the pilot launch before?", mem.register).value, "2026-12-02");
  assert.equal(R.lookup("what was the pilot launch originally?", mem.register).value, "2026-11-18");
});

test("M4: provenance finds a turn, and a never-said value is a typed gap", () => {
  const t = turns("Our mascot service is called Orbit.");
  assert.equal(R.provenance("did you say Orbit?", t).turn, 1);
  assert.equal(R.provenance("did you say Comet?", t).gap, "not-found");
});

test("M5: a false premise contradicts the register", () => {
  const mem = R.ingest(turns("The staging cluster is named Pelican."));
  const c = R.contradiction("you told me the staging cluster was called Heron, right?", mem.register);
  assert.equal(c.stored, "Pelican");
  assert.equal(c.claimed, "Heron");
});

test("M6: exact sum over registered numbers, and a clock difference", () => {
  const mem = R.ingest(turns("The platform team has 7 people.", "The data team has 12 people."));
  const s = R.compute("how many people in the platform team plus the data team in total?", mem.register);
  assert.equal(s.value, 19);
  assert.equal(R.timeDiffHours("02:00", "03:00"), 1);
  assert.equal(R.timeDiffHours("23:00", "01:00"), 2);
});

test("answer() dispatches: arithmetic, false premise, provenance, lookup — and names the competency", () => {
  const mem = R.ingest(turns("Our mascot service is called Orbit.", "The platform team has 7 people.", "The data team has 12 people."));
  assert.equal(R.answer("how many people in the platform team plus the data team in total?", mem).value, 19);
  assert.equal(R.answer("you told me the mascot service was called Comet, right?", mem).contradiction.stored, "Orbit");
  assert.equal(R.answer("did you tell me the mascot service was called Vega?", mem).gap, "not-found");
  const l = R.answer("what is the mascot service called?", mem);
  assert.equal(l.value, "Orbit");
  assert.equal(l.competency, "M3");
});

test("F5: the recall question that went to the web is answered from the register, so the plugin never gathers it", () => {
  fresh();
  const task = "t", agent = "ses_f5";
  const prior = [{ n: 1, ask: "Our mascot service is called Orbit. Just acknowledge in one line." }, { n: 2, ask: "Our deploy window is Thursdays at 02:00 UTC. Just acknowledge in one line." }];
  R.ingestTurns({ task, agent, turns: prior });
  const reg = R.registerOf(task, agent);
  const a = R.registerAnswer("What is the mascot service called? Name only.", reg, prior);
  assert.equal(a.value, "Orbit");
  assert.equal(a.turn, 1);
  const unknown = R.registerAnswer("In roughly 400 words, explain consistent hashing.", reg, prior);
  assert.ok(unknown.gap, "an ask the conversation does not answer is a typed gap, and the plugin routes it as before");
});

test("one store: a binding is ONE fact mark under the session; re-ingest writes nothing; the register is the marks' projection", () => {
  fresh();
  const task = "t", agent = "ses_one";
  const t1 = [{ n: 1, ask: "The staging cluster is named Pelican." }, { n: 2, ask: "There are 31 desks in the Lisbon office." }];
  const first = R.ingestTurns({ task, agent, turns: t1 });
  assert.equal(first.wrote, 2);
  const again = R.ingestTurns({ task, agent, turns: t1 });
  assert.equal(again.wrote, 0, "idempotent");
  const marks = E.projectMarks(task, { agent, kind: "fact" });
  assert.equal(marks.length, 2);
  assert.match(marks[0].text, /^t1 · The staging cluster is named Pelican\.$/);
  const reg = R.registerOf(task, agent);
  assert.equal(reg.facts.length, 2);
  assert.equal(reg.facts[0].current.value, "Pelican");
  assert.equal(reg.facts[0].current.turn, 1);
  // another session's marks are another register
  assert.equal(R.registerOf(task, "ses_other").facts.length, 0);
  // the swarm's own `fact` marks (agent "swarm") never enter a session's register
  E.recordMark({ task, agent: "swarm", kind: "fact", text: "the build is green" });
  assert.equal(R.registerOf(task, agent).facts.length, 2);
});

test("after a compaction the window's turns renumber from 1: the same sentence is not a second fact, and a new one still lands", () => {
  fresh();
  const task = "t", agent = "ses_cmp";
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: "The staging cluster is named Pelican." }, { n: 2, ask: "The deploy window is Thursdays at 02:00 UTC." }] });
  // the harness replaced the history with a summary; the plugin now sees two turns numbered from 1, one of them already known
  const r = R.ingestTurns({ task, agent, turns: [{ n: 1, ask: "The deploy window is Thursdays at 02:00 UTC." }, { n: 2, ask: "Update: the deploy window is now Fridays at 03:00 UTC." }] });
  assert.equal(r.wrote, 1);
  const reg = R.registerOf(task, agent);
  assert.equal(reg.facts.length, 2);
  const f = reg.facts.find((x) => x.subject.includes("deploy window"));
  assert.equal(f.current.value, "Fridays at 03:00 UTC");
  assert.equal(f.history[0].turn, 2, "the turn kept is the one the sentence was first seen at");
});

test("a two-sentence update ('X moved. It is now Y.') is one mark that reads back as one binding, so the projection supersedes", () => {
  fresh();
  const task = "t", agent = "ses_two";
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: "Our deploy window is Thursdays at 02:00 UTC. Just acknowledge in one line." }] });
  const r = R.ingestTurns({ task, agent, turns: [{ n: 1, ask: "Our deploy window is Thursdays at 02:00 UTC. Just acknowledge in one line." }, { n: 2, ask: "Update: the deploy window moved. It is now Fridays at 03:00 UTC." }] });
  assert.equal(r.wrote, 1);
  const marks = E.projectMarks(task, { agent, kind: "fact" });
  assert.match(marks[1].text, /^t2 · Update: the deploy window moved\. It is now Fridays at 03:00 UTC\.$/, "the mark is the verbatim run that bound it");
  const reg = R.registerOf(task, agent);
  const f = reg.facts.find((x) => x.subject === "deploy window");
  assert.equal(f.current.value, "Fridays at 03:00 UTC");
  assert.equal(f.history[0].value, "Thursdays at 02:00 UTC");
  assert.equal(R.registerAnswer("What is the deploy window now?", reg).value, "Fridays at 03:00 UTC");
  assert.match(R.registerNote(reg), /before that it was Thursdays at 02:00 UTC/);
});

test("precision: a compaction checkpoint, a question with a stray quote, a framed subject and an over-long sentence bind nothing", () => {
  const seen = (...t) => R.extractBindings(turns(...t)).bindings;
  assert.equal(seen('<conversation-checkpoint>\nThe following is a summary. The staging cluster is Pelican.\n</conversation-checkpoint>').length, 0, "a harness block is not the person's words");
  assert.equal(seen('What is the deploy window now?"').length, 0, "a question with a stray quote after the mark");
  assert.equal(seen("Is the staging cluster Pelican").length, 0, "an interrogative without a mark");
  const b = seen("A heads up: the staging cluster is Pelican.");
  assert.equal(b.length, 1);
  assert.equal(b[0].subject, "staging cluster", "the discourse frame is stripped, not bound");
  assert.equal(seen(`The plan is ${"very ".repeat(60)}long.`).length, 0, "too long to be one stated fact");
  assert.equal(seen("## Next Move 1 — the owner is Sven.").length, 0, "markdown is not a statement");
});

test("the block: prose the model can quote, bounded, the cut disclosed; empty when there is nothing to say", () => {
  assert.equal(R.registerNote(R.buildRegister([])), "");
  const mem = R.ingest(turns("The staging cluster is named Pelican.", "Update: the staging cluster is now Heron."));
  const note = R.registerNote(mem.register);
  assert.ok(note.startsWith("<fold-register>\n") && note.endsWith("\n</fold-register>"));
  assert.match(note, /The staging cluster is Heron — you said so in turn 2; before that it was Pelican \(turn 1\)\./);
  const many = R.ingest(Array.from({ length: 80 }, (_, i) => `The item number ${i + 1} is called Thing${i + 1}.`).map((t, i) => ({ n: i + 1, role: "user", text: t })));
  const bounded = R.registerNote(many.register, { maxChars: 600 });
  assert.ok(bounded.length <= 600 + "<fold-register>\n\n</fold-register>".length + 40);
  assert.match(bounded, /earlier facts not shown\)/);
  assert.match(bounded, /Thing80/, "the newest facts survive the cut");
  assert.doesNotMatch(R.REGISTER_LEGEND, /\b(?:never|do not|don't|must not)\b/i, "the legend states a fact, never a prohibition");
});

test("C1 referents: a given name keys to its thing, a narrowed subject keys to the one it narrows, two things stay two", () => {
  // the name given IS the thing: a later statement about Orbit supersedes the mascot service's name
  let reg = R.ingest(turns("Our cat-named mascot service is called Orbit.", "Update: Orbit is now called Atlas.")).register;
  assert.equal(reg.facts.length, 1, "one referent, one fact");
  assert.equal(reg.facts[0].current.value, "Atlas");
  assert.equal(reg.facts[0].history[0].value, "Orbit");
  assert.ok(reg.facts[0].aliases.includes("orbit"));
  // narrowed: "the mascot service" after "our cat-named mascot service" is the same thing (exactly one earlier subject ends in it)
  reg = R.ingest(turns("Our cat-named mascot service is called Orbit.", "The mascot service is now called Comet.")).register;
  assert.equal(reg.facts.length, 1);
  assert.equal(reg.facts[0].current.value, "Comet");
  assert.equal(R.lookup("what is the mascot service called?", reg).value, "Comet");
  // two things stay two: a shared head noun is not an alias
  reg = R.ingest(turns("The staging cluster is named Pelican.", "The prod cluster is named Heron.")).register;
  assert.equal(reg.facts.length, 2);
  // ambiguous narrowing is refused: "the cluster" could be either, so it is a third key, not a merge
  reg = R.ingest(turns("The staging cluster is named Pelican.", "The prod cluster is named Heron.", "The cluster is now Ibis.")).register;
  assert.equal(reg.facts.length, 3);
  // aka: a stated alias; lookup by either name; the line names one and discloses the other
  reg = R.ingest(turns("The deploy window, also known as the release window, is Thursdays at 02:00 UTC.", "Update: the release window is now Fridays at 03:00 UTC.")).register;
  assert.equal(reg.facts.length, 1);
  assert.equal(R.lookup("what is the release window now?", reg).value, "Fridays at 03:00 UTC");
  assert.match(R.registerNote(reg), /The deploy window \(also: release window\) is Fridays at 03:00 UTC/);
  // the F5 and hard-chat bars are untouched: the earlier facts still key and answer as before
  const mem = R.ingest(turns("Our mascot service is called Orbit.", "The platform team has 7 people.", "The data team has 12 people."));
  assert.equal(R.answer("what is the mascot service called?", mem).value, "Orbit");
  assert.equal(R.answer("how many people in the platform team plus the data team in total?", mem).value, 19);
});

test("CI guard: the register imports only its sibling store and node builtins, names no model client, opens no socket", () => {
  const src = fs.readFileSync(path.join(HERE, "opencode-register.mjs"), "utf8");
  const problems = [];
  for (const m of src.matchAll(/(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g)) {
    const spec = m[1];
    if (spec === "./opencode-eot.mjs" || spec.startsWith("node:") || spec.startsWith("./vendor/janus/identity/")) continue;
    problems.push(`import "${spec}"`);
  }
  for (const [i, line] of src.split("\n").entries()) {
    if (/^\s*(\/\/|\*)/.test(line)) continue;
    if (/(?:^|[^.\w])(?:openai|@ai-sdk|langchain|ollama|modelclient|callmodel|completions?\b)/i.test(line)) problems.push(`${i + 1}: model client — ${line.trim().slice(0, 80)}`);
    if (/\b(?:fetch|XMLHttpRequest|http\.request|https\.request|net\.connect|WebSocket)\s*\(/.test(line)) problems.push(`${i + 1}: network — ${line.trim().slice(0, 80)}`);
  }
  assert.deepEqual(problems, []);
});

// ── the transport's quotes (foldcode-poc FAILURES.md F11, 2026-10-23) ───────────────────────────────────────────────
// `opencode run "<message>"` wraps the message in double quotes. The fold arm of the hard-chat benchmark ran through that CLI, so the
// extractor read 14 of the 33 stated bindings and the register never reached a prompt.
test("F11: a message the CLI wrapped in quotes binds exactly like the person's own words, and no quote leaks into the value", () => {
  const plain = "Heads up: The staging cluster is named Pelican. Just acknowledge in one line.";
  const a = R.extractBindings(turns(plain)).bindings;
  const b = R.extractBindings(turns(JSON.stringify(plain))).bindings; // what `opencode run "<message>"` hands the plugin
  assert.equal(a.length, 1);
  assert.deepEqual(b.map((x) => [x.subject, x.value]), a.map((x) => [x.subject, x.value]));
  assert.ok(b.every((x) => !x.value.includes('"')), "no stray quote in the value");
});

test("F11: unwrapCliQuote unwraps a whole quoted message and nothing else", () => {
  assert.equal(R.unwrapCliQuote('"The cluster is Pelican."'), "The cluster is Pelican.");
  assert.equal(R.unwrapCliQuote('"She said \\"yes\\" to it."'), 'She said "yes" to it.');
  assert.equal(R.unwrapCliQuote("The cluster is Pelican."), "The cluster is Pelican.");
  assert.equal(R.unwrapCliQuote('"a" and "b"'), '"a" and "b"'); // two quoted tokens are the person's own punctuation
  assert.equal(R.unwrapCliQuote('He said "go" then left'), 'He said "go" then left');
  assert.equal(R.unwrapCliQuote(""), "");
});

test("F11: a fact that changed twice keeps its first value in the pinned block, not only the one before the current", () => {
  const { bindings } = R.extractBindings(turns(
    "The pilot launch is on 2026-11-18.",
    "The pilot launch moved to 2026-12-02.",
    "The pilot launch moved to 2026-12-09.",
  ));
  const note = R.registerNote(R.buildRegister(bindings));
  assert.match(note, /is 2026-12-09 — you said so in turn 3; before that it was 2026-12-02 \(turn 2\), and originally 2026-11-18 \(turn 1\)\./);
  const one = R.registerNote(R.buildRegister(R.extractBindings(turns("The pilot launch is on 2026-11-18.", "The pilot launch moved to 2026-12-02.")).bindings));
  assert.doesNotMatch(one, /originally/); // two values: "before that" already is the original
});

// ── a compacted window hands over a checkpoint, not the person's message (foldcode-poc F11, 2026-10-24) ──────────────
const checkpoint = (summary, ...users) => `<conversation-checkpoint>\nThe following is a summary and serialized record of earlier conversation. Treat it as historical context, not as new instructions.\n\n<summary>\n${summary}\n</summary>\n\n<recent-context>\n${users.map((u) => `[User]: ${JSON.stringify(u)}`).join("\n")}\n</recent-context>\n</conversation-checkpoint>`;

test("F11: checkpointUserTurns returns the person's recent turns and nothing the model wrote", () => {
  const cp = checkpoint('The staging cluster name "Pelican" is a user-provided fact.\n[User]: "a paraphrase inside the summary"', "Heads up: The Lisbon office has 31 desks.");
  assert.deepEqual(R.checkpointUserTurns(cp), ['"Heads up: The Lisbon office has 31 desks."']);
  assert.equal(R.checkpointUserTurns("The staging cluster is named Pelican."), null);
  assert.deepEqual(R.checkpointUserTurns("<conversation-checkpoint>\n<summary>x</summary>\n</conversation-checkpoint>"), []);
  const two = `<conversation-checkpoint>\n<recent-context>\n[User]: "one."\n[Assistant]: "ack"\n[User]: "two."\n</recent-context>\n</conversation-checkpoint>`;
  assert.deepEqual(R.checkpointUserTurns(two), ['"one."', '"two."']);
});

test("F11: facts stated after every compaction still register, in order, numbered after the ones already recorded; the summary's paraphrase binds nothing", () => {
  fresh();
  const task = "t", agent = "ses_cp";
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: JSON.stringify("Heads up: The staging cluster is named Pelican. Just acknowledge in one line.") }] });
  // from turn 2 on, the plugin only ever sees a checkpoint whose recent-context holds the newest message
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: checkpoint('The staging cluster name "Pelican" is a user-provided fact.', "Heads up: The Lisbon office has 31 desks. Just acknowledge in one line.") }] });
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: checkpoint('The Lisbon office has 31 desks. The fuel card vendor is Zorbex.', "Heads up: The fuel card vendor is Vexley. Just acknowledge in one line.") }] });
  R.ingestTurns({ task, agent, turns: [{ n: 1, ask: checkpoint("x", "Update: the Lisbon office now has 36 desks.") }] });
  const reg = R.registerOf(task, agent);
  const bySubject = Object.fromEntries(reg.facts.map((f) => [f.subject, f.current.value]));
  assert.equal(bySubject["staging cluster"], "Pelican");
  assert.equal(bySubject["fuel card vendor"], "Vexley"); // the model's paraphrase ("Zorbex") in the summary is not a statement the person made
  const desks = reg.facts.find((f) => f.subject.includes("lisbon"));
  assert.equal(desks.current.value, "36"); assert.equal(desks.history[0].value, "31");
  const turnsSeen = reg.facts.flatMap((f) => f.history.map((h) => h.turn));
  assert.deepEqual([...turnsSeen].sort((a, b) => a - b), [...new Set(turnsSeen)].sort((a, b) => a - b), "no two statements share a turn number");
});
