// cli/tests/apprentice-mover.test.mjs — the second teaching instrument (cli/apprentice-mover.mjs) against khora's REAL code
// reader (readEdges through apprentice-replay.mjs's deltaOf), the REAL mechanical tier (adapters/code/mechanical.js) and
// the REAL Goffman organ. No stand-ins. Each lesson's positive control (a planted link it must find) has its negative
// control beside it (the same link from a later or same-session record, or a shuffled history: it must not find it).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  splitSeed, prepareUnit, donorArm, propose, assemble, scoreSets, scoreFollowThrough, scoreRipple, rippleTurnOf, shuffledHistory,
  pairedNull, verdictOf, stmtRange, bindingsOf, rootOf, targetOf, specFor, offersOf, World, BindingLesson, AmbientLesson,
  readTranscript, runMover, renderMover, safeKey, gateRow, FULL, CONFIGS,
} from "../apprentice-mover.mjs";
import { loadScope, deltaOf } from "../apprentice-replay.mjs";
import { mulberry32 } from "../../native/adapters/code/lex.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const scope = loadScope();
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "apprentice-mover-"));
const P = "/p/khora/cli"; // an in-scope directory (the `khora` segment matches the scope's `in` rules)
const noLessons = { binding: () => null, ambient: () => false };

// ───────────────────────── a transcript, built record by record ─────────────────────────
let idn = 0;
function transcript() {
  const lines = [];
  let t = Date.parse("2026-01-01T00:00:00Z");
  const ts = () => new Date((t += 1000)).toISOString();
  const api = {
    t0: (iso) => { t = Date.parse(iso); return api; },
    prompt(text) { lines.push({ type: "user", origin: { kind: "human" }, message: { role: "user", content: text }, timestamp: ts() }); return api; },
    read(file, content) {
      const id = `toolu_${++idn}`;
      lines.push({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Read", input: { file_path: file } }] }, timestamp: ts() });
      const n = content.split("\n").length;
      lines.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "…" }] }, toolUseResult: { type: "text", file: { filePath: file, content, numLines: n, startLine: 1, totalLines: n } }, timestamp: ts() });
      return api;
    },
    edit(file, before, oldS, newS) {
      const id = `toolu_${++idn}`;
      lines.push({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Edit", input: { file_path: file, old_string: oldS, new_string: newS } }] }, timestamp: ts() });
      const k = before.indexOf(oldS), start = before.slice(0, k).split("\n").length;
      const o = oldS.split("\n"), nn = newS.split("\n");
      const structuredPatch = [{ oldStart: start, oldLines: o.length, newStart: start, newLines: nn.length, lines: [...o.map((l) => `-${l}`), ...nn.map((l) => `+${l}`)] }];
      lines.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] }, toolUseResult: { filePath: file, oldString: oldS, newString: newS, originalFile: before, replaceAll: false, structuredPatch }, timestamp: ts() });
      return api;
    },
    create(file, content) {
      const id = `toolu_${++idn}`;
      lines.push({ type: "assistant", message: { content: [{ type: "tool_use", id, name: "Write", input: { file_path: file, content } }] }, timestamp: ts() });
      lines.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] }, toolUseResult: { type: "create", filePath: file, content, structuredPatch: [] }, timestamp: ts() });
      return api;
    },
    write(dir, name) { const f = path.join(dir, `${name}.jsonl`); fs.writeFileSync(f, lines.map((l) => JSON.stringify(l)).join("\n") + "\n"); return f; },
  };
  return api;
}

// ───────────────────────── the split ─────────────────────────
test("split: an added import and the call it serves → seed = the call, rest = the import (the reader's own keys)", () => {
  const before = "const k = 1;\nexport function main() {\n  return k;\n}\n";
  const after = "import { helper } from \"./util.js\";\nconst k = 1;\nexport function main() {\n  return helper(k);\n}\n";
  const s = splitSeed({ before, after, file: `${P}/a.js`, regions: { before: [[0, before.length]], after: [[0, after.length]] }, created: false });
  assert.deepEqual(s.seedKeys, ["+call:helper"]);
  assert.deepEqual(s.restKeys, ["+import:./util.js"]);
  assert.ok(!s.seeded.includes("import"), "the import statement is cut out of the seeded text");
  assert.ok(s.seeded.includes("helper(k)"), "the call stays");
  assert.deepEqual(s.restBound, ["helper"], "what the master supplied: the name the cut statement binds");
});

test("split: a call plus the new function it calls → rest = the declaration; a pre-existing neighbour is never cut (control)", () => {
  const before = "function keep() {\n  return 1;\n}\n\nfunction main() {\n  return keep();\n}\n";
  const oldS = "function main() {\n  return keep();\n}\n";
  const newS = "function main() {\n  return keep() + twice(2);\n}\n\nfunction twice(x) {\n  return x * 2;\n}\n";
  const after = before.replace(oldS, newS);
  const k = before.indexOf(oldS);
  const s = splitSeed({ before, after, file: `${P}/a.js`, regions: { before: [[k, k + oldS.length]], after: [[k, k + newS.length]] }, created: false });
  assert.deepEqual(s.seedKeys, ["+call:twice"]);
  assert.deepEqual(s.restKeys, ["+declare:twice"]);
  assert.ok(s.seeded.includes("function keep()"), "keep() existed before: it is not cut");
  assert.ok(!s.seeded.includes("function twice"));
});

test("split: a method added inside an EXISTING class is a typed gap `unseparable`, never scored as rest", () => {
  const before = "class Box {\n  get() { return 1; }\n}\nnew Box().get();\n";
  const oldS = "  get() { return 1; }\n";
  const newS = "  get() { return this.more(); }\n  more() { return 2; }\n";
  const after = before.replace(oldS, newS);
  const k = before.indexOf(oldS);
  const s = splitSeed({ before, after, file: `${P}/a.js`, regions: { before: [[k, k + oldS.length]], after: [[k, k + newS.length]] }, created: false });
  assert.ok(s.unseparable.includes("declare:more"), JSON.stringify(s.unseparable));
  assert.ok(!s.restKeys.includes("+declare:more"));
});

test("stmtRange: a multi-line import is cut whole; a require line is one line", () => {
  const t = "const a = 1;\nimport {\n  x,\n  y,\n} from \"./m.js\";\nfoo();\n";
  const at = t.indexOf("\"./m.js\"");
  const [a, b] = stmtRange(t, at, at + 8);
  assert.equal(t.slice(a, b), "import {\n  x,\n  y,\n} from \"./m.js\";\n");
  const r = "x();\nconst fs = require(\"fs\");\ny();\n";
  const [c, d] = stmtRange(r, r.indexOf("\"fs\""), r.indexOf("\"fs\"") + 4);
  assert.equal(r.slice(c, d), "const fs = require(\"fs\");\n");
});

test("bindingsOf: named (with as), default, namespace, require, destructured require, python from; a re-export binds nothing", () => {
  assert.deepEqual(bindingsOf("import { a, b as c } from \"m\";", "javascript").sort(), ["a", "c"]);
  assert.deepEqual(bindingsOf("import d, { e } from \"m\";", "javascript").sort(), ["d", "e"]);
  assert.deepEqual(bindingsOf("import * as ns from \"m\";", "javascript"), ["ns"]);
  assert.deepEqual(bindingsOf("const fs = require(\"fs\");", "javascript"), ["fs"]);
  assert.deepEqual(bindingsOf("const { join, dirname: dn } = require(\"path\");", "javascript").sort(), ["dn", "join"]);
  assert.deepEqual(bindingsOf("from x.y import a, b as c", "python").sort(), ["a", "c"]);
  assert.deepEqual(bindingsOf("export { a } from \"m\";", "javascript"), []);
});

test("roots and specifiers: a worktree and the main checkout name the same target; a python file path is never synthesised", () => {
  const main = rootOf("/u/3.0/khora/native/organs/goffman.js", scope);
  const wt = rootOf("/u/3.0/khora/.claude/worktrees/fix-x/native/organs/goffman.js", scope);
  assert.equal(main.tail, "native/organs/goffman.js");
  assert.equal(wt.tail, "native/organs/goffman.js");
  assert.equal(main.family, wt.family);
  const t = targetOf("../native/organs/goffman.js", "/u/3.0/khora/cli/x.mjs", scope);
  assert.equal(specFor("/u/3.0/khora/.claude/worktrees/fix-x/cli/y.mjs", t, scope, "javascript"), "../native/organs/goffman.js");
  assert.equal(specFor("/u/3.0/khora/cli/y.mjs", "bare:node:fs", scope, "javascript"), "node:fs");
  assert.equal(specFor("/u/3.0/khora/cli/y.py", t, scope, "python"), null);
  assert.equal(rootOf("/tmp/elsewhere/a.js", scope), null);
});

// ───────────────────────── (a) follow-through must propose the import ─────────────────────────
const UTIL = "export function helper(x) {\n  return x + 1;\n}\n";
const A_BEFORE = "const k = 1;\nexport function main() {\n  return k;\n}\n";
const A_AFTER = "import { helper } from \"./util.js\";\nconst k = 1;\nexport function main() {\n  return helper(k);\n}\n";

test("(a) a call to an unimported function: the world holds util.js exporting it, so FULL proposes the import (and only it)", () => {
  const w = new World(scope);
  w.set(`${P}/util.js`, UTIL, "2026-01-01T00:00:01Z");
  w.refresh();
  const u = prepareUnit({ before: A_BEFORE, after: A_AFTER, file: `${P}/a.js`, regions: { before: [[0, A_BEFORE.length]], after: [[0, A_AFTER.length]] }, created: false, world: w });
  assert.deepEqual(u.real.missing.filter((n) => u.real.callees.includes(n)), ["helper"], "the seed leaves helper unbound");
  const ctx = { file: `${P}/a.js`, language: "javascript", scope };
  const full = propose(u.real, ctx, FULL, noLessons);
  assert.deepEqual([...full.keys], ["+import:./util.js"]);
  assert.equal(scoreSets(full.keys, u.restKeys).jac, 1);
  // the assembled file reads to the same keys (importAnchor + the reader on the whole file)
  const cand = assemble(u.seeded, full.proposals, "javascript");
  const d = deltaOf({ before: u.seeded, after: cand, file: `${P}/a.js` });
  assert.deepEqual(d.added.filter((e) => e.kind !== "call").map((e) => `+${e.key}`), ["+import:./util.js"]);
  // OFF: without the world the stub is all the unconscious has — a declaration, the wrong move here
  const noWorld = propose(u.real, ctx, CONFIGS["no-world"], noLessons);
  assert.deepEqual([...noWorld.keys], ["+declare:helper"]);
  assert.equal(scoreSets(noWorld.keys, u.restKeys).jac, 0);
  assert.equal(propose(u.real, ctx, CONFIGS.none, noLessons).keys.size, 0);
});

test("(a) end to end through the transcript reader: Read util.js, then the edit; the run proposes the import", async () => {
  const root = tmp(), dir = path.join(root, "proj");
  fs.mkdirSync(dir);
  transcript().prompt("wire helper into main").read(`${P}/util.js`, UTIL).read(`${P}/a.js`, A_BEFORE).edit(`${P}/a.js`, A_BEFORE, A_BEFORE, A_AFTER).write(dir, "sess-a");
  const ledger = path.join(root, "ledger.jsonl");
  const rep = await runMover({ root, draws: 99, nulls: 3, ledger });
  const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.test === "follow-through");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].predicted, ["+import:./util.js"]);
  assert.deepEqual(rows[0].rest, ["+import:./util.js"]);
  assert.equal(rows[0].jac.full, 1);
  assert.equal(rows[0].jac["no-world"], 0);
  assert.equal(rep.followThrough.coverage.assembled.agree, rep.followThrough.coverage.assembled.checked);
});

test("callee filter: a new parameter or local the edit introduces is not proposed (missingImports flags it; the seed never calls it)", () => {
  const before = "export function main() {\n  return 1;\n}\n";
  const after = "export function main(extra) {\n  const local = extra + 1;\n  return twice(local);\n}\n\nfunction twice(x) {\n  return x * 2;\n}\n";
  const u = prepareUnit({ before, after, file: `${P}/a.js`, regions: { before: [[0, before.length]], after: [[0, after.length]] }, created: false });
  const ctx = { file: `${P}/a.js`, language: "javascript", scope };
  assert.ok(u.real.missing.includes("extra") || u.real.missing.includes("local"), `missingImports flags locals: ${u.real.missing}`);
  assert.deepEqual([...propose(u.real, ctx, FULL, noLessons).keys], ["+declare:twice"]);
  const loose = [...propose(u.real, ctx, CONFIGS["no-callee"], noLessons).keys];
  assert.ok(loose.length > 1, `without the filter the locals are stubbed too: ${loose}`);
});

// ───────────────────────── the two lessons, prequential ─────────────────────────
const unitStub = (session, ts, over = {}) => ({
  session, ts, file: `${P}/a.js`, language: "javascript", mode: "edit", unseparable: [], nulls: [],
  real: { missing: ["helper"], callees: ["helper"], arity: { helper: 1 }, world: { helper: null }, imports: [] },
  masterBound: { helper: true }, restKeys: ["+import:./util.js"], seedKeys: ["+call:helper"], ...over,
});

test("binding lesson: an EARLIER OTHER session's import resolves the name; a later or same-session record never teaches (controls)", () => {
  const target = targetOf("./util.js", `${P}/b.js`, scope);
  const obs = (session, ts) => [{ name: "helper", target, session, ts }];
  const at = "2026-03-01T00:00:00Z";
  const earlier = scoreFollowThrough([unitStub("S", at)], obs("OTHER", "2026-02-01T00:00:00Z"), { scope, draws: 9 });
  assert.deepEqual(earlier.rows[0].predicted, ["+import:./util.js"]);
  assert.equal(earlier.rows[0].scores.full.jac, 1);
  assert.equal(earlier.rows[0].scores["no-lesson"].jac, 0, "OFF: the stub");
  const later = scoreFollowThrough([unitStub("S", at)], obs("OTHER", "2026-04-01T00:00:00Z"), { scope, draws: 9 });
  assert.deepEqual(later.rows[0].predicted, ["+declare:helper"], "a record from after the unit teaches nothing");
  const same = scoreFollowThrough([unitStub("S", at)], obs("S", "2026-02-01T00:00:00Z"), { scope, draws: 9 });
  assert.deepEqual(same.rows[0].predicted, ["+declare:helper"], "the unit's own session teaches nothing");
});

test("ambient lesson: a name earlier sessions' master left unbound is not stubbed; one it bound still is (control)", () => {
  const glob = (session, ts, bound) => unitStub(session, ts, { real: { missing: ["parseIt"], callees: ["parseIt"], arity: { parseIt: 1 }, world: {}, imports: [] }, masterBound: { parseIt: bound }, restKeys: [] });
  const now = glob("S", "2026-05-01T00:00:00Z", false);
  const leftAlone = scoreFollowThrough([glob("A", "2026-01-01T00:00:00Z", false), glob("B", "2026-02-01T00:00:00Z", false), now], [], { scope, draws: 9 });
  const r = leftAlone.rows.find((x) => x.u === now);
  assert.deepEqual(r.predicted, [], "ambient: dropped");
  assert.equal(r.scores.full.jac, 1);
  assert.equal(r.scores["no-ambient"].jac, 0, "OFF stubs it, an extra");
  const now2 = glob("S", "2026-05-01T00:00:00Z", false);
  const bound = scoreFollowThrough([glob("A", "2026-01-01T00:00:00Z", true), glob("B", "2026-02-01T00:00:00Z", true), now2], [], { scope, draws: 9 });
  assert.deepEqual(bound.rows.find((x) => x.u === now2).predicted, ["+declare:parseIt"]);
  const amb = new AmbientLesson(); amb.add("q", false, "S");
  assert.equal(amb.ambient("q", "S"), false, "its own session never counts");
});

test("BindingLesson counts distinct OTHER sessions; ties break deterministically", () => {
  const L = new BindingLesson();
  L.add("f", "bare:x", "A"); L.add("f", "bare:x", "A"); L.add("f", "bare:y", "B"); L.add("f", "bare:y", "C");
  assert.equal(L.lookup("f", "Z"), "bare:y");
  assert.equal(L.lookup("f", "B"), "bare:x", "excluding B leaves x(1) vs y(1): the tie breaks to the lexically first");
  assert.equal(L.lookup("g", "Z"), null);
});

// ───────────────────────── the swapped-seed null ─────────────────────────
test("swapped seed: another edit's seed lines in this edit's place proposes ITS names, which miss this edit's rest", () => {
  const before = "function keep() {\n  return 1;\n}\n";
  const after = "function keep() {\n  return twice(1);\n}\n\nfunction twice(x) {\n  return x * 2;\n}\n";
  const u = prepareUnit({ before, after, file: `${P}/a.js`, regions: { before: [[0, before.length]], after: [[0, after.length]] }, created: false });
  const ctx = { file: `${P}/a.js`, language: "javascript", scope };
  assert.equal(scoreSets(propose(u.real, ctx, FULL, noLessons).keys, u.restKeys).jac, 1);
  const donor = { seedBlock: "  return halve(9);\n", seedCallees: ["halve"] };
  const arm = donorArm(u, donor, `${P}/a.js`, null);
  const p = propose(arm, ctx, FULL, noLessons);
  assert.deepEqual([...p.keys], ["+declare:halve"]);
  assert.equal(scoreSets(p.keys, u.restKeys).jac, 0);
});

// ───────────────────────── the paired null ─────────────────────────
test("paired sign-flip null: a consistent difference reaches its draw floor; a symmetric one does not (controls)", () => {
  const n = 40, cl = Array.from({ length: n }, (_, i) => `s${i}`);
  const pos = pairedNull(Array(n).fill(0.5), cl, { draws: 199, seed: 3 });
  assert.equal(pos.p, pos.floor);
  assert.equal(verdictOf(pos), "a difference that makes a difference");
  const sym = pairedNull(Array.from({ length: n }, (_, i) => (i % 2 ? 0.5 : -0.5)), cl, { draws: 199, seed: 3 });
  assert.ok(sym.p > 0.5);
  assert.equal(verdictOf(sym), "noticed, not learned");
  const zero = pairedNull(Array(n).fill(0), cl, { draws: 99 });
  assert.equal(verdictOf(zero), "noticed, not learned", "a lesson that changes nothing is noticed, not learned");
  // one cluster moves as one: forty units in two sessions cannot reach a floor of 1/200
  const two = pairedNull(Array(n).fill(0.5), cl.map((_, i) => `s${i % 2}`), { draws: 199, seed: 3 });
  assert.ok(two.p > two.floor);
});

// ───────────────────────── (b) ripple ─────────────────────────
const F = (id, kinds = null) => ({ id, nid: id, kinds: kinds ? new Set(kinds) : null });
function rippleHistory() {
  const turns = [];
  const pairs = [["A", "B"], ["C", "D"], ["E", "G"], ["H", "I"], ["J", "K"], ["L", "M"]];
  for (let s = 0; s < 6; s++) for (const [x, y] of pairs) turns.push({ session: `s${s}-${x}`, ts: new Date(Date.parse("2026-01-01T00:00:00Z") + turns.length * 3600e3).toISOString(), files: [F(x, ["+call"]), F(y, ["+declare"])] });
  turns.push({ session: "test", ts: "2026-06-01T00:00:00Z", files: [F("A", ["+call"]), F("B", ["+declare"])] });
  return turns;
}

test("(b) ripple: B always changed with A in earlier sessions → the lesson predicts B; the shuffled history does not", () => {
  const turns = rippleHistory();
  const rp = scoreRipple(turns, { draws: 99, nulls: 30, seed: 5 });
  const last = rp.perTurn[turns.length - 1];
  assert.equal(last.rprec, 1, "R-precision 1: B is A's top partner");
  assert.equal(last.majJac, 1, "majority rule: P(B | A) = 1 > 1/2");
  assert.equal(last.moves, 1, "the partner's moves: the signature lesson says +declare");
  assert.equal(last.movesOff, 0);
  // the null: the same lessons from a shuffled history (file labels permuted across slots)
  const rnd = mulberry32(11);
  let hits = 0;
  const draws = 40;
  for (let b = 0; b < draws; b++) {
    const h = shuffledHistory(turns, rnd);
    const cnt = new Map();
    for (const t of h.slice(0, -1)) { const ids = t.files.map((f) => f.nid); if (ids.includes("A")) for (const g of ids) if (g !== "A") cnt.set(g, (cnt.get(g) ?? 0) + 1); }
    const top = [...cnt].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
    if (top && top[0] === "B") hits++;
  }
  assert.ok(hits / draws < 0.5, `the shuffled history names B as A's partner in ${hits}/${draws} draws`);
  assert.ok(rp.files.rprec.null < 0.5, `shuffled-null R-precision ${rp.files.rprec.null}`);
  assert.ok(rp.files.rprec.on > rp.files.rprec.null);
});

test("ripple controls: the first time A is seen nothing is predicted; same-session co-change never teaches", () => {
  const turns = rippleHistory();
  const rp = scoreRipple(turns, { draws: 9, nulls: 3 });
  assert.equal(rp.perTurn[0].rprec, 0, "no history: OFF and ON agree");
  const same = [
    { session: "one", ts: "2026-01-01T00:00:00Z", files: [F("A"), F("B")] },
    { session: "one", ts: "2026-01-02T00:00:00Z", files: [F("A"), F("B")] },
    { session: "one", ts: "2026-01-03T00:00:00Z", files: [F("A"), F("B")] },
  ];
  const r2 = scoreRipple(same, { draws: 9, nulls: 3 });
  assert.equal(r2.perTurn[2].rprec, 0, "the turn's own session is excluded from its lessons");
});

test("rippleTurnOf: code files in order of first edit, kinds from structural rows, a failed edit is not a change", () => {
  const e = (file, row, applied = true) => ({ file, row, applied });
  const t = { session: "s", ts: "x", edits: [
    e(`${P}/b.js`, { category: "structural", added: [{ kind: "call" }], removed: [] }),
    e(`${P}/notes.md`, { gap: "no-reader:.md" }),
    e(`${P}/a.js`, { gap: "edit-failed" }, false),
    e(`${P}/b.js`, { category: "structural", added: [], removed: [{ kind: "import" }] }),
    e(`${P}/c.html`, { gap: "no-reader:.html" }),
  ] };
  const r = rippleTurnOf(t, scope);
  assert.equal(r.files.length, 2, "b.js and c.html (.md is not code; the failed edit changed nothing)");
  assert.deepEqual([...r.files[0].kinds].sort(), ["+call", "-import"]);
  assert.equal(r.files[1].kinds, null, "no reader: kinds unknown, not empty");
});

// ───────────────────────── privacy: the control built to fail ─────────────────────────
test("PLANTED PII: an email, phone, SSN shape and street address in a comment, a string, the prompt and a specifier never reach any output", async () => {
  const root = tmp(), dir = path.join(root, "proj");
  fs.mkdirSync(dir);
  const EMAIL = "jane.doe@example.com", PHONE = "(615) 555-0123", SSN = "123-45-6789", STREET = "1428 Elm Street";
  const homeSegs = os.homedir().split(path.sep).filter(Boolean);
  const user = homeSegs.at(-1);
  const before = `// contact ${EMAIL} or ${PHONE}\nconst who = "${STREET}, ${SSN}";\nexport function main() {\n  return who;\n}\n`;
  // edit 1 is EMITTED: personal data only in a comment, a string and the prompt, plus a specifier naming the home directory
  const after = `import { home } from "../../${homeSegs.join("/")}/secret.js";\n// contact ${EMAIL} or ${PHONE}\nconst who = "${STREET}, ${SSN}";\nexport function main() {\n  return home(who) + fresh();\n}\n\nfunction fresh() {\n  return "${EMAIL} ${PHONE}";\n}\n`;
  // edit 2 is WITHHELD: an identifier-level string (a specifier) carries an email shape
  const after2 = `import { lookup } from "alice.smith@example.com/lib";\n${before.replace("return who;", "return lookup(who);")}`;
  const transcriptFile = transcript().prompt(`ring ${PHONE}, mail ${EMAIL}, ssn ${SSN}, at ${STREET}`)
    .read(`${P}/a.js`, before).edit(`${P}/a.js`, before, before, after)
    .read(`${P}/b.js`, before).edit(`${P}/b.js`, before, before, after2).write(dir, "sess-pii");
  const raw = fs.readFileSync(transcriptFile, "utf8");
  for (const v of [EMAIL, PHONE, SSN, STREET, "alice.smith"]) assert.ok(raw.includes(v), `precondition: the fixture carries ${v}`);
  const ledger = path.join(root, "ledger.jsonl");
  const rep = await runMover({ root, draws: 9, nulls: 2, ledger });
  const outs = { ledger: fs.readFileSync(ledger, "utf8"), report: JSON.stringify(rep), render: renderMover(rep) };
  const emitted = outs.ledger.trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.test === "follow-through");
  assert.equal(emitted.length, 1, "precondition: the clean-shaped edit IS emitted, so its content had every chance to leak");
  assert.ok(emitted[0].rest.includes("+import:<rel>/secret.js") && emitted[0].rest.includes("+declare:fresh"), JSON.stringify(emitted[0].rest));
  for (const [name, text] of Object.entries(outs)) {
    for (const v of [EMAIL, PHONE, SSN, STREET, "Elm", "jane", "alice.smith", "555-0123"]) assert.ok(!text.includes(v), `${name} leaks ${v}`);
    assert.ok(!text.includes(`/${user}/`) && !text.includes(os.homedir()), `${name} names the home directory`);
  }
  // the edit whose specifier carries an email shape is withheld, fail-closed: at extraction (the replay's gate) or at the ledger
  assert.ok((rep.gaps["withheld:pii:email"] ?? 0) + rep.pii.ledger.rowsWithheld >= 1, JSON.stringify({ gaps: rep.gaps, pii: rep.pii }));
  assert.equal(safeKey(`+import:../../${homeSegs.join("/")}/secret.js`), "+import:<rel>/secret.js");
  assert.equal(safeKey("+import:./util.js"), "+import:./util.js");
  const pii = {};
  assert.equal(gateRow({ k: `x ${EMAIL}` }, pii), null);
  assert.equal(pii.rowsWithheld, 1);
});

test("a transcript-derived ledger refuses a tracked path in the repo (it tracks documents/claude-code-*.jsonl)", async () => {
  await assert.rejects(runMover({ root: tmp(), ledger: path.join(HERE, "..", "mover-ledger-must-not-exist.jsonl") }), /tracked path/);
  assert.ok(!fs.existsSync(path.join(HERE, "..", "mover-ledger-must-not-exist.jsonl")));
});

// ───────────────────────── the world reads only in-scope bytes ─────────────────────────
test("World: an out-of-scope file the session read is never a resolution source", () => {
  const w = new World(scope);
  w.set("/p/Eviction-Overwatch/khora/util.js", UTIL, "t1"); // an OUT segment wins over an IN one
  w.set(`${P}/other.js`, "import { side } from \"./side.js\";\n", "t2");
  w.refresh();
  assert.equal(w.resolve("helper", `${P}/a.js`), null);
  assert.equal(w.resolve("side", `${P}/a.js`), targetOf("./side.js", `${P}/other.js`, scope), "an in-scope file's binding is a source");
  const offers = offersOf(UTIL, `${P}/util.js`, scope);
  assert.deepEqual(offers.map((o) => [o.name, o.kind]), [["helper", "decl"]]);
});

test("readTranscript hands each graded file-grade structural edit to onEdit with its verified bytes, before the state moves", async () => {
  const dir = tmp();
  const f = transcript().prompt("go").read(`${P}/a.js`, A_BEFORE).edit(`${P}/a.js`, A_BEFORE, A_BEFORE, A_AFTER).write(dir, "s1");
  const seen = [];
  const turns = await readTranscript(f, { scope, onEdit: ({ row, rec, world }) => { world.refresh(); seen.push({ cat: row.category, frame: row.frame, before: rec?.before, held: world.texts.get(`${P}/a.js`)?.text }); } });
  assert.equal(turns.length, 1);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].cat, "structural");
  assert.equal(seen[0].before, A_BEFORE);
  assert.equal(seen[0].held, A_BEFORE, "the world still holds the file as it stood before the edit");
});
