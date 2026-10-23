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

test("CI guard: the register imports only its sibling store and node builtins, names no model client, opens no socket", () => {
  const src = fs.readFileSync(path.join(HERE, "opencode-register.mjs"), "utf8");
  const problems = [];
  for (const m of src.matchAll(/(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g)) {
    const spec = m[1];
    if (spec === "./opencode-eot.mjs" || spec.startsWith("node:")) continue;
    problems.push(`import "${spec}"`);
  }
  for (const [i, line] of src.split("\n").entries()) {
    if (/^\s*(\/\/|\*)/.test(line)) continue;
    if (/(?:^|[^.\w])(?:openai|@ai-sdk|langchain|ollama|modelclient|callmodel|completions?\b)/i.test(line)) problems.push(`${i + 1}: model client — ${line.trim().slice(0, 80)}`);
    if (/\b(?:fetch|XMLHttpRequest|http\.request|https\.request|net\.connect|WebSocket)\s*\(/.test(line)) problems.push(`${i + 1}: network — ${line.trim().slice(0, 80)}`);
  }
  assert.deepEqual(problems, []);
});
