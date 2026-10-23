// opencode-longform.test.mjs — a long-form piece as a file, written section by section across model responses.
//   node --test opencode-longform.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "longform-eot-"));
// the graded path is the test's subject: keep freeform off by default (the freeform test asks for it explicitly)
process.env.FOLD_LONGFORM_FREEFORM = "0";
const E = await import("./opencode-longform.mjs");
const EOT = await import("./opencode-eot.mjs");

const QUOTES = [
  "Dolphins are marine mammals of the order Cetacea, closely related to whales and porpoises.",
  "Bottlenose dolphins live in groups called pods and hunt cooperatively for fish.",
  "Dolphins find prey by echolocation, sending out clicks and listening for the echoes.",
  "A dolphin sleeps with half of its brain at a time so that it can keep surfacing to breathe.",
  "Many dolphin populations are threatened by fishing nets, pollution and loss of habitat.",
  "Conservation groups protect dolphins with marine reserves and rules on fishing gear.",
  "Dolphins communicate with whistles, and each bottlenose dolphin has its own signature whistle.",
  "Dolphin calves stay with their mothers for several years and learn to hunt from them.",
];
const gathered = { quotes: QUOTES, passages: [{ name: "research record (assembled by the door)", text: "Read 8 sources." }], parts: [] };
const OUTLINE = ["Introduction", "Pods and communication", "Echolocation and hunting", "Threats and conservation", "Conclusion"];

// a grader that is a test: a sentence is supported when most of its content words are in the material it is graded against
const words = (t) => t.toLowerCase().match(/[\p{L}]{5,}/gu) ?? [];
const ground = async (text, passages) => {
  const bag = new Set(passages.flatMap((p) => words(p.text)));
  return (text.match(/[^.!?]+[.!?]/g) ?? []).map((s) => s.trim()).map((s) => { const w = words(s); const hit = w.filter((x) => bag.has(x)).length; return { text: s, standing: w.length && hit / w.length >= 0.6 ? "supported" : "unsupported" }; });
};
// a model that writes what its prompt's lines say (so its sentences are supported), counting its calls and what it was shown
const honest = () => { const seen = []; const m = async (prompt) => { seen.push(prompt); const lines = [...prompt.matchAll(/^- (.+)$/gm)].map((x) => x[1]); return (lines.length ? lines : ["The sections around it connect."]).slice(0, 3).join(" "); }; m.seen = seen; return m; };

const run = async (model, opts = {}) => {
  const { job, prompt } = E.longformStart({ ask: "write me a piece about dolphins", topic: "dolphins", gathered, outline: OUTLINE, now: 1_700_000_000_000 + (opts.salt ?? 0) });
  let next = { prompt }, out = null, guard = 0;
  while (!out && guard++ < 60) { const reply = await model(next.prompt); const r = await E.longformStep(job, reply, { ground: opts.ground ?? ground, now: 1_700_000_000_000 }); if (r.done) out = r.done; else next = r.next; }
  return { job, out };
};

test("an outline is data: 3-8 short titles, else the default shape is used", () => {
  assert.deepEqual(E.validateOutline(OUTLINE).map((s) => s.title), OUTLINE);
  assert.equal(E.validateOutline(["one", "two"]), null);
  assert.equal(E.validateOutline("not a list"), null);
  assert.equal(E.validateOutline(Array.from({ length: 12 }, (_, i) => `t${i}`)), null);
  assert.equal(E.validateOutline([...OUTLINE.slice(0, 4), "x".repeat(200)]), null, "a title that is a paragraph is refused");
  const d = E.defaultOutline("dolphins", ["Pods", "Echolocation"]);
  assert.deepEqual(d.map((s) => s.title), ["Introduction", "Pods", "Echolocation", "Conclusion"]);
});

test("every section is given something to write from: matched lines by title, the rest spread across the sections", () => {
  const outline = E.validateOutline(OUTLINE);
  const m = E.assignMaterial(outline, QUOTES);
  assert.ok(m.get("s3").some((l) => /echolocation/i.test(l)), "the echolocation line goes to the echolocation section");
  assert.ok(m.get("s4").some((l) => /threatened|conservation/i.test(l)));
  assert.ok(outline.every((s) => m.get(s.id).length >= 1), "no section is left with nothing");
  assert.equal([...m.values()].reduce((n, l) => n + l.length, 0), QUOTES.length, "every line is used once");
});

test("the file is the state: a section is replaced by exact bytes, once, and nothing else moves", () => {
  const outline = E.validateOutline(OUTLINE);
  let file = E.fileOf("dolphins", outline, { s1: "Opening.", s2: "Second.", s3: "Third.", s4: "Fourth.", s5: "Close." });
  const before = { ...Object.fromEntries(outline.map((s) => [s.id, E.sectionText(file, s.id)])) };
  const r = E.applySection(file, "s3", "A new third section.");
  assert.equal(r.ok, true);
  for (const s of outline) assert.equal(E.sectionText(r.file, s.id), s.id === "s3" ? "A new third section." : before[s.id], `${s.id} is byte-identical unless it was the one edited`);
  assert.equal(E.applySection(file, "s9", "x").gap.kind, "unlocated");
  assert.equal(E.applySection(file + E.fileOf("again", outline), "s2", "x").gap.kind, "ambiguous", "a doubled marker is refused, not guessed at");
});

test("the loop writes the piece a section at a time, with short prompts that never carry the piece", async () => {
  const model = honest();
  const { job, out } = await run(model);
  assert.equal(model.seen.length, 5, "one model call per section when each passes");
  assert.equal(job.calls, 5);
  assert.ok(model.seen.every((p) => p.length <= E.LIMITS.promptChars), "every prompt is under the cap");
  // the last prompt knows the end of the section before it, and none of the rest of the piece
  const last = model.seen[4];
  assert.ok(last.includes(E.sectionText(fs.readFileSync(job.file, "utf8"), "s4").slice(-60)), "the section before it ends the prompt's context");
  const s2 = E.sectionText(fs.readFileSync(job.file, "utf8"), "s2");
  assert.ok(!last.includes(s2), "an earlier section's text is not in a later prompt");
  assert.ok(model.seen.every((p) => !p.includes("# An longform")), "the piece is never in a prompt");
  assert.match(out.text, /^# dolphins/);
  for (const t of OUTLINE) assert.ok(out.text.includes(`## ${t}`));
  assert.equal(out.path, job.file);
  assert.ok(fs.existsSync(out.path));
  assert.equal(out.gaps.length, 0);
});

test("a section that fails its test is repaired a capped number of rounds, with the frame changed", async () => {
  // a model that, for the echolocation section only, invents things for its first attempt and then writes from the lines
  const seen = [];
  const model = async (prompt) => {
    seen.push(prompt);
    const lines = [...prompt.matchAll(/^- (.+)$/gm)].map((x) => x[1]);
    if (/Echolocation and hunting/.test(prompt.split("\n")[0]) && !/attempt/.test(prompt.split("\n")[0])) return "Dolphins invented underwater cities with libraries. They trade golden coins with sharks.";
    return lines.slice(0, 3).join(" ") || "The sections connect.";
  };
  const { job, out } = await run(model);
  const echo = seen.filter((p) => /Echolocation and hunting/.test(p.split("\n")[0]));
  assert.equal(echo.length, 2, "one failed attempt, one repair");
  assert.match(echo[1], /attempt 2/);
  assert.match(echo[1], /previous attempt said these things, and the lines do not state them/, "the repair names what failed");
  assert.match(echo[1], /underwater cities/);
  assert.ok(!/Dolphins invented underwater cities/.test(E.sectionText(fs.readFileSync(job.file, "utf8"), "s3")), "the invented sentences are not in the file");
  assert.equal(out.standing.s3.rounds, 2);
  assert.equal(seen.length, 6, "five sections plus the one repair");
});

test("repair is capped: a section that never passes is cut to nothing and recorded as a gap, not retried forever", async () => {
  let calls = 0;
  const model = async (prompt) => { if (/Threats and conservation/.test(prompt.split("\n")[0])) { calls++; return "Dolphins run banks. Sharks hold elections. Whales sell insurance."; } return [...prompt.matchAll(/^- (.+)$/gm)].map((x) => x[1]).slice(0, 2).join(" ") || "Connects."; };
  const { job, out } = await run(model, { salt: 1 });
  assert.equal(calls, 1 + E.LIMITS.maxRec, "the first attempt plus at most maxRec repairs");
  assert.ok(out.gaps.some((g) => g.section === "s4" && g.kind === "no-supported-text"));
  assert.match(E.sectionText(fs.readFileSync(job.file, "utf8"), "s4"), /No page stated enough for this section/);
  assert.ok(out.cut.filter((c) => c.section === "s4").length >= 3, "what failed is recorded as cut");
  assert.ok(job.calls <= job.outline.length * (1 + E.LIMITS.maxRec), "the whole longform is bounded");
  // the other sections are fine
  assert.ok(Object.entries(out.standing).filter(([id]) => id !== "s4").every(([, v]) => v.supported > 0));
});

test("a section with some unsupported sentences keeps the supported ones and cuts the rest", async () => {
  const model = async (prompt) => {
    const lines = [...prompt.matchAll(/^- (.+)$/gm)].map((x) => x[1]);
    if (/Pods and communication/.test(prompt.split("\n")[0]) && !/attempt/.test(prompt.split("\n")[0])) return `${lines[0]} ${lines[1]} Dolphins file annual tax returns in three currencies.`;
    return lines.slice(0, 2).join(" ") || "Connects.";
  };
  const { job } = await run(model, { salt: 2 });
  const s2 = E.sectionText(fs.readFileSync(job.file, "utf8"), "s2");
  assert.ok(!/tax returns/.test(s2), "the unsupported sentence is cut");
  assert.ok(/pods|whistles/i.test(s2), "the supported sentences stay");
  assert.equal(job.standing.s2.rounds, 1, "two of three supported is enough to accept: cut, not redrawn");
  assert.equal(job.standing.s2.cut, 1);
});

test("iteration is an edit: a revision touches one section, and the others are byte-identical", async () => {
  const model = honest();
  const { job } = await run(model, { salt: 3 });
  const before = Object.fromEntries(job.outline.map((s) => [s.id, E.sectionText(fs.readFileSync(job.file, "utf8"), s.id)]));
  const r = E.longformRevise(job, "s3", "make it more about how the clicks work");
  assert.match(r.next.prompt, /Revise the section "Echolocation and hunting"/);
  assert.ok(r.next.prompt.includes(before.s3.slice(0, 40)), "the prompt carries the section as it stands");
  assert.ok(!r.next.prompt.includes(before.s2) && !r.next.prompt.includes(before.s4), "and no other section");
  const reply = "Dolphins find prey by echolocation, sending out clicks and listening for the echoes.";
  const step = await E.longformStep(job, reply, { ground, now: 1_700_000_000_000 });
  assert.ok(step.done, "a revision stops after its one section");
  const after = Object.fromEntries(job.outline.map((s) => [s.id, E.sectionText(fs.readFileSync(job.file, "utf8"), s.id)]));
  for (const s of job.outline) if (s.id !== "s3") assert.equal(after[s.id], before[s.id], `${s.id} untouched`);
  assert.equal(after.s3, reply);
  assert.equal(E.longformRevise(job, "nope", "x").gap.kind, "unknown-section");
});

test("every section's test is in the EOT log, witnessed, with whether it was accepted", async () => {
  const model = honest();
  const { job } = await run(model, { salt: 4 });
  const { events } = EOT.read(job.id);
  const rows = events.filter((e) => e.stage === "reason" && e.detail?.kind === "longform-section");
  assert.ok(rows.length >= 5);
  assert.ok(rows.every((e) => e.standing === "witnessed"), "a grading is anchored by its hash, not claimed");
  assert.ok(rows.every((e) => typeof e.detail.accepted === "boolean" && Number.isFinite(e.detail.sentences)));
  assert.deepEqual([...new Set(rows.map((e) => e.detail.section))].sort(), ["s1", "s2", "s3", "s4", "s5"]);
});

test("a section is as long as its lines allow, so a model is not asked to pad two lines to 220 words", () => {
  assert.equal(E.wordsFor(["Dolphins sleep with half of the brain awake.", "Calves stay with their mothers."]), 40);
  assert.equal(E.wordsFor(Array.from({ length: 10 }, () => "word ".repeat(30))), E.LIMITS.sectionWords);
  const p = E.sectionPrompt({ topic: "dolphins", section: { title: "Intro" }, lines: ["One short line about dolphins."] });
  assert.match(p, /about 40 words/);
  assert.ok(!/do not state/.test(p), "the prompt carries no sentence a model can echo into its section");
});

test("freeform: the model is given the facts but writes in its own words, and nothing is graded or cut", async () => {
  const gatheredF = { quotes: QUOTES, passages: gathered.passages, parts: [] };
  const { job, prompt } = E.longformStart({ ask: "write me a piece about dolphins", topic: "dolphins", gathered: gatheredF, outline: OUTLINE, freeform: true, now: 1_700_000_000_000 });
  assert.match(prompt, /Here are facts you may draw on/);
  assert.match(prompt, /Write freely in your own words/);
  assert.ok(!/says what the lines say/.test(prompt), "the echo constraint is gone");
  // a model that invents unsupported sentences: in freeform they are kept, not cut, and never repaired
  const invented = "Dolphins hold parliament every spring and elect a Speaker.";
  let next = { prompt }, out = null, guard = 0;
  while (!out && guard++ < 60) { const r = await E.longformStep(job, invented, { now: 1_700_000_000_000 }); if (r.done) out = r.done; else next = r.next; }
  assert.equal(out.calls, OUTLINE.length, "one model call per section, no repairs");
  assert.equal(out.cut.length, 0, "nothing is cut in freeform");
  assert.ok(Object.values(out.standing).every((s) => s.freeform === true));
  assert.ok(out.text.includes(invented), "the invented sentence is kept");
});

test("a reply that repeats itself, or echoes the prompt's wording, is cleaned before it is graded", async () => {
  const { job } = await run(honest(), { salt: 9 });
  const fresh = E.longformStart({ ask: "write me a piece about dolphins", topic: "dolphins", gathered, outline: OUTLINE, now: 1_700_000_000_000 + 99 });
  const mine = fresh.job.material.s1;
  const echoed = `${mine[0]} What the lines do not state is left out of the section.\n\n${mine[0]} What the lines do not state is left out of the section.`;
  const r = await E.longformStep(fresh.job, echoed, { ground, now: 1_700_000_000_000 });
  assert.ok(r.next);
  const s1 = E.sectionText(fs.readFileSync(fresh.job.file, "utf8"), "s1");
  assert.equal(s1.split(mine[0]).length - 1, 1, "each sentence once");
  assert.ok(!/left out of the section/.test(s1));
  assert.ok(job.calls >= 5);
});

test("fewer facts than a piece is written from is a typed gap, never a piece written from nothing", () => {
  const thin = { quotes: QUOTES.slice(0, 2), passages: [], parts: [], stop: { reason: "time budget (20 s) reached before the sources saturated" } };
  const r = E.longformStart({ ask: "write an essay on dolphins", topic: "dolphins", gathered: thin, now: 1_700_000_000_000 + 7 });
  assert.equal(r.gap?.kind, "nothing-read");
  assert.match(r.gap.reason, /2 fact\(s\) were read for dolphins \(time budget/);
  assert.ok(!r.job, "no job is started");
  const empty = E.longformStart({ ask: "write an essay on dolphins", topic: "dolphins", gathered: { quotes: [], passages: [] }, now: 1_700_000_000_000 + 8 });
  assert.equal(empty.gap?.kind, "nothing-read");
});

test("no facet found: the default shape still has a body (the topic itself), never just an opening and a close", () => {
  const d = E.defaultOutline("dolphins", []);
  assert.deepEqual(d.map((s) => s.title), ["Introduction", "Dolphins", "Conclusion"]);
  assert.equal(d.length, E.LIMITS.minSections);
  const { job } = E.longformStart({ ask: "write an essay on dolphins", topic: "dolphins", gathered: { quotes: QUOTES.slice(0, 4), passages: [], voids: [], parts: [] }, now: 1_700_000_000_000 + 9 });
  assert.equal(job.outline.length, 3);
  assert.ok(job.material.s2.length >= 1, "the body section is given lines to write from");
});

test("the same fact quoted from two pages is one fact, written once", () => {
  const twice = [
    "River dolphins are rather small, ranging in size from the 5-foot South Asian river dolphin to the 8-foot Amazon river dolphin.",
    "River dolphins are rather small, ranging in size from the 5-foot South Asian river dolphin to the 8-foot Amazon river dolphin!",
    "  river dolphins are rather small, ranging in size from the 5-foot south asian river dolphin to the 8-foot amazon river dolphin.  ",
    ...QUOTES.slice(0, 3),
  ];
  assert.equal(E.dedupeLines(twice).length, 4);
  const { job } = E.longformStart({ ask: "write an essay on dolphins", topic: "dolphins", gathered: { quotes: twice, passages: [], voids: [], parts: [] }, now: 1_700_000_000_000 + 11 });
  const all = Object.values(job.material).flat();
  assert.equal(all.filter((l) => /rather small/.test(l)).length, 1);
});

test("start and every step answer carry the outline as data: each section's state (planned/writing/written/cut) and its fact count", async () => {
  const start = E.longformStart({ ask: "write me a piece about dolphins", topic: "dolphins", gathered, outline: OUTLINE, now: 1_700_000_000_000 + 21 });
  const { job } = start;
  assert.equal(start.outline.length, OUTLINE.length);
  assert.deepEqual(start.outline.map((s) => s.state), ["writing", "planned", "planned", "planned", "planned"]);
  assert.ok(start.outline.every((s) => typeof s.id === "string" && typeof s.title === "string" && Number.isInteger(s.facts)), "id, title, facts on every section");
  assert.deepEqual(start.outline.map((s) => s.facts), job.outline.map((s) => job.material[s.id].length), "the fact count is the section's material");
  // s4 never passes (cut); the others are written from their lines
  const model = async (prompt) => (/Threats and conservation/.test(prompt.split("\n")[0]) ? "Dolphins run banks. Sharks hold elections. Whales sell insurance." : [...prompt.matchAll(/^- (.+)$/gm)].map((x) => x[1]).slice(0, 2).join(" ") || "Connects.");
  let next = { prompt: start.prompt }, seen = [], last = null, guard = 0;
  while (!last && guard++ < 60) {
    const r = await E.longformStep(job, await model(next.prompt), { ground, now: 1_700_000_000_000 });
    assert.ok(Array.isArray(r.outline) && r.outline.length === OUTLINE.length, "every step answer carries the whole outline");
    seen.push(r.outline.map((s) => s.state));
    if (r.done) last = r; else next = r.next;
  }
  assert.deepEqual(seen[0], ["written", "writing", "planned", "planned", "planned"], "after the first reply s1 is written and s2 is being written");
  // a repair round keeps the section "writing" (nothing is written yet); the title and facts ride the repair prompt's answer too
  const repair = seen.find((st) => st[3] === "writing");
  assert.ok(repair, "s4 is seen in the writing state");
  assert.deepEqual(last.outline.map((s) => s.state), ["written", "written", "written", "cut", "written"], "when the piece is done every state is final; the placeholder section is cut");
  assert.ok(last.outline.every((s) => s.state !== "writing" && s.state !== "planned"));
});
