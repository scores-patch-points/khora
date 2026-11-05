// same-for — sameness as a defeasible commitment FOR a perspective (organs/same-for.js), and the kernel's signal / noise (kernel/commitments.js).
// Medium-blind: notes are heard directly, the perspective is a plain answerer over notes. No reader, no priors.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeNotes } from "../kernel/notes.js";
import { makeCommitments, KINDS, DIFFERENCE } from "../kernel/commitments.js";
import { createTaskLog } from "../kernel/task-log.js";
import { makeSameFor, VERDICTS } from "../organs/same-for.js";

const span = (ref) => [{ ref, start: 0, end: 10 }];
const hear = (notes, log, arrs, source) => notes.admit(log, arrs.map(([end1, label, end2]) => ({ end1, label, end2, spans: span(source) })), { witness: source }).log;
// a perspective that asks, of every note, who did its act and to what (keyed by act), plus a narrower one that asks only about one act
const everyRole = { name: "every role", giver: "test", ask: (list) => { const m = new Map(); for (const n of list) { const put = (q, v) => { if (!m.has(q)) m.set(q, new Set()); m.get(q).add(v); }; put(`${n.label}|who|${n.end2}`, n.end1); put(`${n.end1}|${n.label}|what`, n.end2); } return m; } };
const only = (label) => ({ name: `only ${label}`, giver: "test", ask: (list) => { const m = new Map(); for (const n of list) if (n.label === label) { const q = `${label}|who`; if (!m.has(q)) m.set(q, new Set()); m.get(q).add(n.end1); } return m; } });
const setup = (first, second) => { const notes = makeNotes(), C = makeCommitments(), organ = makeSameFor({ notes, commitments: C }); let log = notes.createNotes({ frame: { reader: "test" } }); log = hear(notes, log, first, "s1"); log = hear(notes, log, second, "s2"); return { notes, C, organ, log }; };

test("kernel: noise and signal are kernel kinds, in the cube's operators", () => {
  assert.equal(KINDS.NOISE, "noise"); assert.equal(KINDS.SIGNAL, "signal");
  assert.deepEqual(DIFFERENCE.NOISE, { op: "NUL", glyph: "∅" }); assert.deepEqual(DIFFERENCE.SIGNAL, { op: "SIG", glyph: "○" });
});

test("kernel: a tested noise is NUL, a refused noise is SIG, an untested one is neither", () => {
  const C = makeCommitments(); let log = createTaskLog();
  const a = C.declare(log, { kind: "noise", members: ["n1"], giver: "g", purpose: "p" }); log = a.log;
  const b = C.declare(log, { kind: "noise", members: ["n2"], giver: "g", purpose: "p" }); log = b.log;
  const c = C.declare(log, { kind: "noise", members: ["n3"], giver: "g", purpose: "p" }); log = c.log;
  log = C.evaluate(log, a.id, { verdict: "holds", ground: "g", broken: "ablation" }).log;
  log = C.evaluate(log, b.id, { verdict: "refused", ground: "g", broken: "ablation" }).log;
  const d = Object.fromEntries(C.differencesOf(log).map((x) => [x.members[0], x]));
  assert.equal(d.n1.op, "NUL"); assert.equal(d.n1.glyph, "∅");
  assert.equal(d.n2.op, "SIG"); assert.equal(d.n2.glyph, "○");
  assert.equal(d.n3.op, null); assert.equal(d.n3.untested, true);
});

test("kernel: the legacy names still fold as noise and signal", () => {
  const C = makeCommitments(), notes = makeNotes(); let log = notes.createNotes({ frame: { reader: "test" } });
  log = hear(notes, log, [["a", "x", "b"]], "s1");
  const id = notes.fold(log)[0].id;
  const r = C.declare(log, { kind: "does-not-matter", members: [id], giver: "g", purpose: "p" }); log = r.log;
  log = C.evaluate(log, r.id, { verdict: "holds", ground: "g", broken: "ablation" }).log;
  assert.equal(C.readUnder(log, notes).dropped.length, 1);
  assert.equal(C.differencesOf(log)[0].op, "NUL");
});

test("organ: the same reading twice is Same, with nothing to commit to", () => {
  const { organ, log } = setup([["brutus", "stab", "caesar"]], [["brutus", "stab", "caesar"]]);
  const r = organ.judge(log, { first: "s1", second: "s2", perspective: everyRole });
  assert.equal(r.verdict, VERDICTS.SAME); assert.equal(r.standings.length, 0);
});

test("organ: a role swap is Other, and its difference is SIG", () => {
  const { organ, log } = setup([["brutus", "stab", "caesar"]], [["caesar", "stab", "brutus"]]);
  const r = organ.judge(log, { first: "s1", second: "s2", perspective: everyRole });
  assert.equal(r.verdict, VERDICTS.OTHER); assert.equal(r.SIG.length, 1); assert.equal(r.residue[0].glyph, "○");
});

test("organ: an added part is NUL for a perspective that does not ask about it, SIG for one that does", () => {
  const first = [["maria", "buy", "car"]], second = [["maria", "buy", "car"], ["maria", "meet", "dealer"]];
  const narrow = setup(first, second), wide = setup(first, second);
  const r1 = narrow.organ.judge(narrow.log, { first: "s1", second: "s2", perspective: only("buy") });
  const r2 = wide.organ.judge(wide.log, { first: "s1", second: "s2", perspective: everyRole });
  assert.equal(r1.verdict, VERDICTS.SAME); assert.equal(r1.NUL.length, 1); assert.equal(r1.residue[0].glyph, "∅");
  assert.equal(r2.verdict, VERDICTS.OTHER); assert.equal(r2.SIG.length, 1);
});

test("organ: a nominated correspondence is a same-as from its giver, tested against the perspective with a named null", () => {
  const { organ, log } = setup([["mbappe", "score", "goal"]], [["mbappe", "net", "goal"]]);
  const nominate = (a, b) => (a.label === "score" && b.label === "net" && a.end1 === b.end1 && a.end2 === b.end2 ? { giver: "a test giver", grain: "Pattern" } : null);
  const r = organ.judge(log, { first: "s1", second: "s2", perspective: everyRole, nominate });
  assert.equal(r.verdict, VERDICTS.SAME);
  const s = r.standings.find((x) => x.kind === "same-as");
  assert.equal(s.standing, "testimony"); assert.equal(s.giver, "a test giver"); assert.match(s.evaluated.broken, /redeal/);
});

test("organ: a perspective that can ask nothing is a Gap, never Same or Other", () => {
  const { organ, log } = setup([["a", "x", "b"]], [["a", "x", "b"]]);
  const blind = { name: "blind", giver: "test", ask: () => new Map() };
  assert.equal(organ.judge(log, { first: "s1", second: "s2", perspective: blind }).verdict, VERDICTS.GAP);
});

test("organ: the heard record is untouched — commitments never edit a note", () => {
  const { notes, organ, log } = setup([["maria", "buy", "car"]], [["maria", "buy", "car"], ["maria", "meet", "dealer"]]);
  const before = JSON.stringify(notes.fold(log));
  const r = organ.judge(log, { first: "s1", second: "s2", perspective: only("buy") });
  assert.equal(JSON.stringify(notes.fold(r.log)), before);
});

test("organ: no perspective, no judgment — sameness is always for something", () => {
  const { organ, log } = setup([["a", "x", "b"]], [["a", "x", "b"]]);
  assert.throws(() => organ.judge(log, { first: "s1", second: "s2" }), /perspective/);
});

test("organ: its body names no medium", () => {
  const src = fs.readFileSync(new URL("../organs/same-for.js", import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const w of ["sentence", "word", "verb", "token", "pixel", "frame of video", "paragraph"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `organ body names "${w}"`);
});

// ── sameness by cell: (op, grain, level), the verdict derived from the cells a perspective cares about
import { verdictFor, entail, cellKey, OUTCOMES } from "../organs/same-for.js";
const c = (op, grain, level, outcome) => ({ op, grain, level, outcome, warrant: "test" });

test("cells: one pair is Same for one perspective and Other for another", () => {
  const profile = [c("SEG", "Figure", "token", "other"), c("INS", "Figure", "end", "same"), c("CON", "Pattern", "act", "same"), c("DEF", "Figure", "claim", "same")];
  assert.equal(verdictFor(profile, ["INS·Figure@end", "CON·Pattern@act", "DEF·Figure@claim"]).verdict, VERDICTS.SAME);
  assert.equal(verdictFor(profile, ["SEG·Figure@token"]).verdict, VERDICTS.OTHER);
});

test("cells: a difference the perspective does not care about is NUL for it", () => {
  const r = verdictFor([c("SEG", "Figure", "token", "other"), c("INS", "Figure", "end", "same")], ["INS·Figure@end"]);
  assert.deepEqual(r.idle, [{ key: "SEG·Figure@token", op: "NUL", glyph: "∅" }]);
});

test("cells: within a level, Same at Figure entails Same at Pattern, and Other at Pattern entails Other at Figure — never the reverse", () => {
  const up = entail([c("CON", "Figure", "act", "same"), c("CON", "Pattern", "act", "gap")]);
  assert.equal(up.find((x) => x.grain === "Pattern").outcome, "same"); assert.equal(up.find((x) => x.grain === "Pattern").entailedBy, "CON·Figure@act");
  const down = entail([c("CON", "Figure", "act", "gap"), c("CON", "Pattern", "act", "other")]);
  assert.equal(down.find((x) => x.grain === "Figure").outcome, "other");
  const none = entail([c("CON", "Figure", "act", "gap"), c("CON", "Pattern", "act", "same")]);
  assert.equal(none.find((x) => x.grain === "Figure").outcome, "gap", "one kind is not one instance");
});

test("cells: a cared-for cell with no evidence is a Gap; a cell that cannot apply is skipped, not a Gap", () => {
  assert.equal(verdictFor([c("INS", "Figure", "end", "same")], ["INS·Figure@end", "REC·Pattern@ground"]).verdict, VERDICTS.GAP);
  assert.equal(verdictFor([c("INS", "Figure", "end", "same"), c("SYN", "Ground", "text", "n/a")], ["INS·Figure@end", "SYN·Ground@text"]).verdict, VERDICTS.SAME);
  assert.equal(cellKey({ op: "CON", grain: "Pattern", level: "act" }), "CON·Pattern@act");
});

test("cells: Other anywhere a perspective cares wins over a Gap there", () => {
  assert.equal(verdictFor([c("DEF", "Figure", "claim", "other"), c("REC", "Pattern", "ground", "gap")], ["DEF·Figure@claim", "REC·Pattern@ground"]).verdict, VERDICTS.OTHER);
});
