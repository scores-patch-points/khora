// The trap evidence over the attention binder (adapters/text/attention-traps.js). Stub-free: synthetic sentences and mentions.
import test from "node:test";
import assert from "node:assert/strict";
import { bindAttended } from "./attention-binder.js";
import { bindTraps, indefiniteNPs } from "./attention-traps.js";
import { attendedBindingsFor } from "./attention-switch.js";

const DIALS = { window: 2, minActivation: 0.5, minMargin: 0.2, boost: 2, feed: true, centerVeto: true, clauseMateVeto: false, carryVeto: true, expletiveVeto: true };
const build = (texts) => { let off = 0; return texts.map((text, order) => { const s = { text, offset: off, order }; off += text.length + 1; return s; }); };
const spans = (sents, specs) => specs.map(([si, ref, needle]) => { const start = sents[si].offset + sents[si].text.indexOf(needle); return { ref, start, end: start + needle.length }; });
const run = (texts, specs, opts = {}) => { const sents = build(texts); return bindTraps(sents, spans(sents, specs), { ...DIALS, ...opts }); };
const T = { traps: true, topicShare: 0.5 };

test("off, the call is the binder's own call, JSON for JSON", () => {
  const texts = ["The Tower is old.", "The Tower is tall.", "A Beacon was lit.", "The Beacon glowed.", "It faded."];
  const specs = [[0, "T", "Tower"], [1, "T", "Tower"], [2, "B", "Beacon"], [3, "B", "Beacon"]];
  const sents = build(texts);
  assert.equal(JSON.stringify(run(texts, specs)), JSON.stringify(bindAttended(sents, spans(sents, specs), DIALS)));
});

test("a being the document named a fraction as often as the most-named is not what 'It' continues: a typed gap", () => {
  const texts = ["The Tower is old.", "The Tower is tall.", "The Tower is wide.", "The Tower is grey.", "The Tower is round.", "The Tower is lone.", "A Beacon was lit.", "The Beacon glowed.", "It faded."];
  const specs = [0, 1, 2, 3, 4, 5].map((i) => [i, "T", "Tower"]).concat([[6, "B", "Beacon"], [7, "B", "Beacon"]]);
  const off = run(texts, specs); const on = run(texts, specs, T);
  assert.equal(off.bindings.at(-1)?.referentId, "B"); // the binder binds the nearer being
  assert.equal(on.bindings.filter((b) => b.sentenceOrder === 8).length, 0);
  const gap = on.gaps.find((g) => g.sentenceOrder === 8);
  assert.equal(gap.reason, "trap_not_topic");
  assert.ok(gap.evidence.share < 0.5);
});

test("the topic itself still binds under the evidence", () => {
  const texts = ["The Tower is old.", "The Tower is tall.", "It is grey."];
  const on = run(texts, [[0, "T", "Tower"], [1, "T", "Tower"]], T);
  assert.equal(on.bindings[0].referentId, "T");
});

test("an expletive 'It' with a verb the closed classes do not know ('seems') is a typed gap", () => {
  const texts = ["The Tower is old.", "The Tower is tall.", "It seems likely that the Tower was built in a year."];
  const specs = [[0, "T", "Tower"], [1, "T", "Tower"]];
  assert.equal(run(texts, specs).bindings.length, 1);
  const on = run(texts, specs, T);
  assert.equal(on.bindings.length, 0);
  assert.equal(on.gaps.find((g) => g.sentenceOrder === 2).reason, "trap_expletive_or_cleft");
});

test("the previous sentence opened on another being, after only a determiner: 'It' is a typed gap", () => {
  const texts = ["The Tower is old.", "The Tower is tall.", "The Tower is wide.", "The Arch is near the Tower.", "It is grey."];
  const specs = [[0, "T", "Tower"], [1, "T", "Tower"], [2, "T", "Tower"], [3, "A", "Arch"], [3, "T", "Tower"].slice(0, 3)];
  const sents = build(texts);
  const ms = [...spans(sents, [[0, "T", "Tower"], [1, "T", "Tower"], [2, "T", "Tower"], [3, "A", "Arch"]]), { ref: "T", start: sents[3].offset + sents[3].text.indexOf("the Tower") + 4, end: sents[3].offset + sents[3].text.indexOf("the Tower") + 9 }];
  assert.equal(bindTraps(sents, ms, { ...DIALS }).bindings.at(-1)?.referentId, "T");
  const on = bindTraps(sents, ms, { ...DIALS, ...T });
  assert.equal(on.bindings.filter((b) => b.sentenceOrder === 4).length, 0);
  assert.equal(on.gaps.find((g) => g.sentenceOrder === 4).reason, "trap_center_elsewhere");
});

test("traps need a declared topicShare, and a name binding is never overturned", () => {
  assert.throws(() => run(["The Tower is old.", "It is tall."], [[0, "T", "Tower"]], { traps: true }), /topicShare/);
  assert.throws(() => run(["The Tower is old."], [[0, "T", "Tower"]], { traps: "yes", topicShare: 0.5 }), /traps/);
});

test("indefinite noun phrases are read by the closed classes alone", () => {
  assert.deepEqual(indefiniteNPs("It sent a message to the crew.").map((n) => n.words), [["message"]]);
  assert.deepEqual(indefiniteNPs("It had a Tower and an old stone arch, which fell.").map((n) => n.words), [["old", "stone", "arch"]]);
});

test("the switch is off unless asked, and passes the trap option through", () => {
  const entry = { sentences: build(["The Tower is old.", "It is tall."]), cast: [{ ref: "T", mentionSpans: [[4, 9]] }] };
  assert.equal(attendedBindingsFor(entry, { ...DIALS }), null);
  assert.equal(attendedBindingsFor(entry, { enabled: true, ...DIALS }).bindings.length, 1);
  assert.equal(attendedBindingsFor(entry, { enabled: true, ...DIALS, ...T }).bindings.length, 1);
});
