// cli/tests/apprentice-replay.test.mjs — the apprentice replay instrument (cli/apprentice-replay.mjs) against khora's REAL
// code reader (adapters/code/edges.js readEdges) and REAL lexer (lex.js lexCode + the language's CodeLexPrior).
// No stand-ins. Each gate carries the control that must stay silent, and the Born-null machinery carries a
// positive control (a planted prompt→delta link it must find) and a negative one (no link: it must not invent one).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  promptOf, deltaOf, reconstruct, gradeEditFull, hunksHold, turnsOfTranscript, yieldReport, agreementReport,
  tokensOf, nameTokens, nearest, redeal, againstNull, predictability, unitsOf, run, languageFor, recurrence,
  piiCounts, piiCategoriesOf, scrubPrompt, scrubDeep, assertUntrackedOutput, loadScope, editScope, scopeOfTurn, opaque, render,
} from "../apprentice-replay.mjs";
import { piiFindings } from "../../native/organs/goffman.js";
import { mulberry32 } from "../../native/adapters/code/lex.js";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "apprentice-replay-"));
const bytes = (text, from, to) => Buffer.from(text, "utf8").subarray(from, to).toString("utf8");

// ── a hand-built hunk: the old lines marked "-", the new lines "+", at the line the old text starts on ──
const patchFor = (before, oldS, newS) => {
  const k = before.indexOf(oldS);
  const start = before.slice(0, k).split("\n").length;
  const o = oldS.split("\n"), n = newS.split("\n");
  return [{ oldStart: start, oldLines: o.length, newStart: start, newLines: n.length, lines: [...o.map((l) => `-${l}`), ...n.map((l) => `+${l}`)] }];
};
const editResult = (before, oldS, newS, { orig = true, replaceAll = false } = {}) => ({
  filePath: "/p/a.js", oldString: oldS, newString: newS, originalFile: orig ? before : null, replaceAll, userModified: false, structuredPatch: patchFor(before, oldS, newS),
});

// ───────────────────────── prompts ─────────────────────────
test("a human prompt is a prompt; reminders are stripped; tool results, notifications, meta and peers are not (controls)", () => {
  const u = (content, extra = {}) => ({ type: "user", message: { role: "user", content }, ...extra });
  assert.equal(promptOf(u("add a retry to fetchIt", { origin: { kind: "human" } })).text, "add a retry to fetchIt");
  assert.equal(promptOf(u("<system-reminder>noise</system-reminder>fix the parser", { origin: { kind: "human" } })).text, "fix the parser");
  assert.equal(promptOf(u([{ type: "text", text: "hello there" }])).origin, "legacy");
  assert.equal(promptOf(u([{ type: "tool_result", tool_use_id: "x", content: "ok" }])), null);
  assert.equal(promptOf(u("done", { origin: { kind: "task-notification" } })), null);
  assert.equal(promptOf(u("hi", { isMeta: true })), null);
  assert.equal(promptOf(u("hi", { origin: { kind: "peer" } })), null);
  assert.equal(promptOf(u("<system-reminder>only noise</system-reminder>")), null);
  assert.equal(promptOf(u("x", { isSidechain: true })), null);
});

// ───────────────────────── the delta, over the real reader ─────────────────────────
test("an added import and an added call are the delta, each witnessed by a UTF-8 byte span that re-expands", () => {
  const before = "// ünïcode héader — ✓\nconst a = 1;\n";
  const after = "// ünïcode héader — ✓\nimport fs from \"node:fs\";\nconst a = 1;\nconsole.log(fs.readFileSync(\"x\"));\n";
  const d = deltaOf({ before, after, file: "/p/a.js" });
  assert.equal(d.category, "structural");
  assert.deepEqual(d.removed, []);
  const imp = d.added.find((e) => e.kind === "import");
  assert.equal(imp.key, "import:node:fs");
  assert.ok(bytes(after, imp.from, imp.to).includes("node:fs"), `span re-expands to ${JSON.stringify(bytes(after, imp.from, imp.to))}`);
  // the header carries multi-byte characters, so a char offset would land elsewhere: the span is BYTES
  assert.ok(imp.from > after.indexOf("import"), "byte offset is past the char offset when multi-byte text precedes");
  const call = d.added.find((e) => e.kind === "call" && /readFileSync/.test(e.name));
  assert.ok(call, "readFileSync call is read");
  assert.ok(bytes(after, call.from, call.to).includes("readFileSync"));
});

test("a removed edge is witnessed in BEFORE; a call moved within the file is no delta (control)", () => {
  const before = "function f() {\n  helper(1);\n  other();\n}\n";
  const gone = deltaOf({ before, after: "function f() {\n  other();\n}\n", file: "/p/a.js" });
  assert.equal(gone.category, "structural");
  assert.deepEqual(gone.removed.map((e) => e.key), ["call:helper"]);
  assert.ok(bytes(before, gone.removed[0].from, gone.removed[0].to).includes("helper"));
  const moved = deltaOf({ before, after: "function f() {\n  other();\n  helper(1);\n}\n", file: "/p/a.js" });
  assert.notEqual(moved.category, "structural", "a reorder adds and removes nothing");
  assert.deepEqual([moved.added, moved.removed], [[], []]);
});

test("a second call to the same callee is an addition (multiset, not set)", () => {
  const before = "function f() { helper(1); }\n";
  const after = "function f() { helper(1); helper(2); }\n";
  const d = deltaOf({ before, after, file: "/p/a.js" });
  assert.equal(d.category, "structural");
  assert.deepEqual(d.added.map((e) => e.key), ["call:helper"]);
});

test("empty-delta edits are CLASSIFIED: whitespace, comment, string, code-no-edge-delta, no-change", () => {
  const base = "const a = 1;\n// note\nconst s = \"one\";\nfoo(a);\n";
  const cls = (after) => deltaOf({ before: base, after, file: "/p/a.js" }).category;
  assert.equal(cls(base), "no-change");
  assert.equal(cls(base.replace("const a = 1;", "const   a = 1;")), "whitespace");
  assert.equal(cls(base.replace("// note", "// a different note")), "comment");
  assert.equal(cls(base.replace('"one"', '"two"')), "string");
  assert.equal(cls(base.replace("a = 1", "a = 2")), "code-no-edge-delta");
  // control: none of those five is a structural delta, and a real one still is
  assert.equal(cls(base.replace("foo(a);", "foo(a); bar();")), "structural");
});

test("python: an import and a declaration are read; a language with no reader is a typed gap, never a guess", () => {
  const d = deltaOf({ before: "x = 1\n", after: "import os\n\ndef f():\n    return os.getcwd()\n", file: "/p/a.py" });
  assert.equal(d.category, "structural");
  assert.ok(d.added.some((e) => e.key === "import:os"));
  assert.ok(d.added.some((e) => e.key === "declare:f"));
  assert.deepEqual(deltaOf({ before: "a", after: "b", file: "/p/README.md" }), { gap: "no-reader:.md" });
  assert.deepEqual(deltaOf({ before: "a", after: "b", file: "/p/x.ts" }), { gap: "no-reader:.ts" });
  assert.equal(languageFor("/p/x.ts", { tsAsJs: true }).arm, "ts-as-js-ablation");
  const ab = deltaOf({ before: "const a = 1;\n", after: "import x from \"y\";\nconst a: number = 1;\n", file: "/p/x.ts", tsAsJs: true });
  assert.equal(ab.arm, "ts-as-js-ablation");
});

// ───────────────────────── before / after, verified or a gap ─────────────────────────
const BEFORE = "line one\nfunction f() {\n  return 1;\n}\nline five\n";

test("hunksHold: the harness's own hunk must sit at its start line in the candidate bytes (control: a shifted file fails)", () => {
  const sp = patchFor(BEFORE, "  return 1;", "  return helper(1);");
  assert.equal(hunksHold(BEFORE, sp, "before"), true);
  assert.equal(hunksHold("extra\n" + BEFORE, sp, "before"), false);
});

test("reconstruct: originalFile, then replayed state, each VERIFIED; a stale state is refused for the fragment (control)", () => {
  const oldS = "  return 1;", newS = "  return helper(1);";
  const e = (res, extra = {}) => ({ id: "t1", tool: "Edit", file: "/p/a.js", input: { file_path: "/p/a.js", old_string: oldS, new_string: newS }, result: res, ...extra });
  const viaOrig = reconstruct(e(editResult(BEFORE, oldS, newS)));
  assert.equal(viaOrig.grade, "file"); assert.equal(viaOrig.via, "originalFile");
  assert.equal(viaOrig.after, BEFORE.replace(oldS, newS));

  const viaState = reconstruct(e(editResult(BEFORE, oldS, newS, { orig: false })), { state: BEFORE });
  assert.equal(viaState.grade, "file"); assert.equal(viaState.via, "state");

  // the state moved on underneath (a line inserted by something the transcript never saw): old_string is still
  // there, but the hunk no longer sits where the harness says it did → refused, fragment grade, said why
  const stale = reconstruct(e(editResult(BEFORE, oldS, newS, { orig: false })), { state: "inserted by a shell\n" + BEFORE });
  assert.equal(stale.grade, "fragment"); assert.equal(stale.why, "state-diverged"); assert.equal(stale.via, "patch-hunks");

  // state that lacks old_string altogether
  const lacking = reconstruct(e(editResult(BEFORE, oldS, newS, { orig: false })), { state: "something else entirely\n" });
  assert.equal(lacking.grade, "fragment"); assert.equal(lacking.why, "state-diverged");

  // no bytes at all and no hunk: the old/new strings are the fragment; and with those gone, a gap
  const noHunk = reconstruct(e({ filePath: "/p/a.js", oldString: oldS, newString: newS, originalFile: null, structuredPatch: [] }));
  assert.equal(noHunk.grade, "fragment"); assert.equal(noHunk.via, "old-new-strings"); assert.equal(noHunk.why, "no-before-bytes");
  assert.deepEqual(reconstruct(e("File has not been read yet.")), { gap: "edit-failed" });
  assert.deepEqual(reconstruct(e(null)), { gap: "no-result" });
});

test("a non-unique old_string is not located; replaceAll applies to every occurrence", () => {
  const text = "x();\ny();\nx();\n";
  const e = (all) => ({ id: "t", tool: "Edit", file: "/p/a.js", input: {}, result: { oldString: "x();", newString: "z();", originalFile: text, replaceAll: all, structuredPatch: [] } });
  assert.notEqual(reconstruct(e(false)).grade, "file", "two occurrences, no replaceAll: the harness would have refused");
  const all = reconstruct(e(true));
  assert.equal(all.grade, "file"); assert.equal(all.after, "z();\ny();\nz();\n");
});

test("Write: create is file-grade from ''; update verifies state against its hunks; an unread overwrite with no hunk is a gap", () => {
  const w = (res) => ({ id: "w", tool: "Write", file: "/p/n.js", input: { content: "const a = 1;\n" }, result: res });
  const created = reconstruct(w({ type: "create", content: "const a = 1;\n", originalFile: null, structuredPatch: [] }));
  assert.equal(created.grade, "file"); assert.equal(created.via, "created"); assert.equal(created.before, "");
  const d = gradeEditFull(w({ type: "create", content: "import fs from \"fs\";\n", originalFile: null, structuredPatch: [] }), {});
  assert.equal(d.row.mode, "write-create"); assert.equal(d.row.category, "structural"); assert.equal(d.after, "import fs from \"fs\";\n");
  const unread = reconstruct(w({ type: "update", content: "const a = 1;\n", originalFile: null, structuredPatch: [] }));
  assert.ok(unread.gap || unread.grade === "fragment");
  assert.equal(unread.gap ?? unread.why, unread.gap ?? "no-before-bytes");
});

test("the fragment grade is CHECKED against the file grade, and agrees where the context is whole", () => {
  const before = "import a from \"a\";\nfunction f() {\n  return 1;\n}\n";
  const e = { id: "t", tool: "Edit", file: "/p/a.js", input: {}, result: editResult(before, "  return 1;", "  return helper(1);") };
  const g = gradeEditFull(e, {});
  assert.equal(g.row.frame, "file");
  assert.equal(g.row.category, "structural");
  assert.equal(g.row.fragment.same, true);
  assert.equal(g.row.fragment.jaccard, 1);
  const a = agreementReport([g.row]);
  assert.deepEqual([a.n, a.sameSet, a.sameSetRate], [1, 1, 1]);
});

// ───────────────────────── the stream: a transcript on disk ─────────────────────────
const rec = (o) => JSON.stringify(o);
const userPrompt = (text, promptId) => rec({ type: "user", promptId, timestamp: "2026-10-13T00:00:00Z", origin: { kind: "human" }, message: { role: "user", content: text } });
const asst = (b) => rec({ type: "assistant", message: { role: "assistant", content: [b] } });
const result = (id, toolUseResult) => rec({ type: "user", toolUseResult, message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } });
const lines = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
const readRes = (file, content) => ({ type: "text", file: { filePath: file, content, numLines: lines(content), startLine: 1, totalLines: lines(content) } });

test("turnsOfTranscript replays Read → Edit → Edit, grades each at its result, and keeps a failed edit out of the state", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects"), proj = path.join(root, "-p"); fs.mkdirSync(proj, { recursive: true });
  const F = "/p/a.js";
  const v0 = "function f() {\n  return 1;\n}\n";
  const v1 = v0.replace("  return 1;", "  return helper(1);");
  const v2 = v1.replace("function f() {", "function f(x) {");
  const L = [
    asst({ type: "tool_use", id: "e0", name: "Edit", input: { file_path: F, old_string: "x", new_string: "y" } }), // before any prompt
    result("e0", "<tool_use_error>File has not been read yet.</tool_use_error>"),
    userPrompt("make f call helper", "p1"),
    asst({ type: "tool_use", id: "r1", name: "Read", input: { file_path: F } }),
    result("r1", readRes(F, v0)),
    asst({ type: "tool_use", id: "e1", name: "Edit", input: { file_path: F, old_string: "  return 1;", new_string: "  return helper(1);" } }),
    result("e1", editResult(v0, "  return 1;", "  return helper(1);", { orig: false })),
    userPrompt("and give it a parameter", "p2"),
    asst({ type: "tool_use", id: "e2", name: "Edit", input: { file_path: F, old_string: "function f() {", new_string: "function f(x) {" } }),
    result("e2", editResult(v1, "function f() {", "function f(x) {", { orig: false })),
    asst({ type: "tool_use", id: "e3", name: "Edit", input: { file_path: F, old_string: "nope", new_string: "never" } }),
    result("e3", "String to replace not found"),
    asst({ type: "tool_use", id: "e4", name: "Edit", input: { file_path: F, old_string: "  return helper(1);", new_string: "  return helper(x);" } }),
    result("e4", editResult(v2, "  return helper(1);", "  return helper(x);", { orig: false })),
  ].join("\n") + "\n";
  const f = path.join(proj, "s1.jsonl");
  fs.writeFileSync(f, L);
  const turns = await turnsOfTranscript(f, { root });
  assert.deepEqual(turns.map((t) => [t.prompt, t.edits.length]), [[null, 1], ["make f call helper", 1], ["and give it a parameter", 3]]);
  assert.equal(turns[0].edits[0].row.gap, "edit-failed");
  const r1 = turns[1].edits[0].row;
  assert.deepEqual([r1.frame, r1.via, r1.category], ["file", "state", "structural"]);
  assert.deepEqual(r1.added.map((e) => e.key), ["call:helper"]);
  const [r2, r3, r4] = turns[2].edits.map((e) => e.row);
  assert.deepEqual([r2.frame, r2.via], ["file", "state"], "the chain carries: e2 is read against e1's after");
  assert.equal(r3.gap, "edit-failed");
  assert.deepEqual([r4.frame, r4.via], ["file", "state"], "a failed edit did not disturb the state");
  assert.equal(r4.category, "code-no-edge-delta");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a file edited behind the transcript's back falls to the fragment grade; a duplicate tool_use id is counted once (controls)", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects"); fs.mkdirSync(path.join(root, "-p"), { recursive: true });
  const F = "/p/b.js";
  const v0 = "function g() {\n  return 1;\n}\n";
  const shell = "// added by sed\n" + v0; // the transcript never saw this
  const mk = () => [
    userPrompt("do it", "p1"),
    asst({ type: "tool_use", id: "r1", name: "Read", input: { file_path: F } }),
    result("r1", readRes(F, v0)),
    asst({ type: "tool_use", id: "e1", name: "Edit", input: { file_path: F, old_string: "  return 1;", new_string: "  return helper(1);" } }),
    result("e1", editResult(shell, "  return 1;", "  return helper(1);", { orig: false })), // hunk says line 3, state says line 2
  ].join("\n") + "\n";
  const a = path.join(root, "-p", "a.jsonl"), b = path.join(root, "-p", "b.jsonl");
  fs.writeFileSync(a, mk()); fs.writeFileSync(b, mk());
  const seen = new Set(), stats = {};
  const ta = await turnsOfTranscript(a, { root, seen, stats });
  const tb = await turnsOfTranscript(b, { root, seen, stats });
  const row = ta[0].edits[0].row;
  assert.equal(row.frame, "fragment"); assert.equal(row.whyNotFile, "state-diverged");
  assert.equal(row.category, "structural", "the fragment still names the call");
  assert.equal(tb.length, 0); assert.equal(stats.duplicateEdits, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── the report ─────────────────────────
test("yieldReport: gaps stay in the denominator; per-language and per-mode counts add up", () => {
  const rows = [
    { id: 1, ext: ".js", language: "javascript", mode: "edit", category: "structural", frame: "file", via: "state" },
    { id: 2, ext: ".js", language: "javascript", mode: "edit", category: "comment", frame: "file", via: "state" },
    { id: 3, ext: ".js", language: "javascript", mode: "write-create", category: "structural", frame: "file", via: "created" },
    { id: 4, ext: ".md", gap: "no-reader:.md" },
    { id: 5, ext: ".js", gap: "edit-failed" },
  ];
  const y = yieldReport(rows);
  assert.deepEqual([y.edits, y.read, y.gapTotal, y.structural], [5, 3, 2, 2]);
  assert.equal(y.yieldOfAll, 2 / 5); assert.equal(y.yieldOfRead, 2 / 3);
  assert.deepEqual(y.gaps, { "no-reader": 1, "edit-failed": 1 });
  assert.deepEqual(y.noReaderByExt, { ".md": 1 });
  assert.equal(y.byMode["write-create"].structural, 1);
  assert.equal(y.byLanguage.javascript.comment, 1);
});

// ───────────────────────── the Born null ─────────────────────────
const unit = (session, project, primary, prompt, names) => ({
  ti: 0, session, project, primary, tokens: tokensOf(prompt),
  keys: new Set(names.map((n) => `call:${n}`)), edges: names.map((n) => ({ kind: "call", key: `call:${n}`, name: n })),
});

test("redeal permutes only inside its group; a singleton group cannot move (power is reported, not assumed)", () => {
  const grp = ["a", "a", "a", "b", "c", "c"];
  const rnd = mulberry32(5);
  for (let k = 0; k < 50; k++) {
    const pi = redeal(6, (i) => grp[i], rnd);
    assert.deepEqual([...pi].sort(), [0, 1, 2, 3, 4, 5]);
    pi.forEach((j, i) => assert.equal(grp[i], grp[j]));
    assert.equal(pi[3], 3);
  }
});

test("nearest: IDF-weighted shared identifiers, never from the unit's own session, abstains with no shared token", () => {
  const U = [
    unit("s1", "p", "f", "wire the frobnicate helper into retry", ["frobnicate"]),
    unit("s1", "p", "f", "wire the frobnicate helper into retry again", ["frobnicate"]),
    unit("s2", "p", "f", "frobnicate retry helper", ["frobnicate"]),
    unit("s3", "p", "f", "completely unrelated words here", ["zzz"]),
    unit("s4", "p", "f", "", ["qqq"]),
  ];
  const cross = nearest(U, (i, j) => U[i].session !== U[j].session);
  assert.equal(cross[0], 2, "the s1 twin is excluded: its nearest OTHER-session prompt is s2");
  assert.equal(cross[4], -1, "an empty prompt shares nothing → abstain");
  const any = nearest(U, () => true);
  assert.equal(any[0], 1);
});

test("POSITIVE control: a planted prompt→delta link is found by the null (rank beyond every redeal)", () => {
  // twenty topics, each a distinctive word in the prompt AND the callee it asks for; two sessions per topic
  const U = [];
  for (let t = 0; t < 20; t++) for (const s of ["x", "y"]) U.push(unit(`${s}${t}`, "p", `f${t % 4}`, `please handle topic${t} thing${t} now`, [`topic${t}`]));
  const p = predictability(U, { draws: 200, seed: 3 });
  const a = p.nearestCrossSession.global;
  assert.equal(a.real, 1, "every unit's nearest other-session prompt is its twin with the same delta");
  assert.equal(a.reached, 0);
  assert.ok(a.p <= 1 / 201 + 1e-12);
  assert.ok(p.echo.global.real > p.echo.global.nullMean, "the echo reads the callee name off the prompt");
});

test("NEGATIVE control: identical prompts carry no link, so the null must not call one (real inside the null band)", () => {
  const U = [];
  for (let t = 0; t < 30; t++) U.push(unit(`s${t}`, "p", "f", "the same words every time", [`fn${t % 7}`, `g${t % 5}`]));
  const p = predictability(U, { draws: 400, seed: 11 });
  for (const k of ["nearestCrossSession", "echo"]) {
    const a = p[k].global;
    assert.ok(a.p > 0.05, `${k}: p=${a.p} — no link was planted, none may be found`);
    assert.ok(a.real <= a.nullMax);
  }
});

test("a prediction that is only the FILE's vocabulary beats the global null but not the file null", () => {
  // delta names depend on the file only; prompts are word-matched to the file, so a prompt "predicts" the delta
  // only by naming the file's habit. Within a file, deltas are interchangeable → the file null must absorb it.
  const U = [];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 8; k++) U.push(unit(`s${f}-${k}`, "p", `file${f}`, `edit file${f} module${f} please`, [`habit${f}`]));
  const p = predictability(U, { draws: 300, seed: 9 });
  assert.ok(p.nearestCrossSession.global.p < 0.01, "global null: the prompt looks predictive");
  assert.ok(p.nearestCrossSession.file.p > 0.05, `file null absorbs it (p=${p.nearestCrossSession.file.p})`);
});

test("againstNull: a score that ignores the deal can never beat its own null", () => {
  const r = againstNull(10, () => 0.5, { draws: 50, seed: 1 });
  assert.equal(r.real, 0.5); assert.equal(r.reached, 50); assert.ok(r.p > 0.99);
});

test("nameTokens: a module is nameable by its path, last segment and stem", () => {
  const t = nameTokens({ kind: "import", name: "./lib/claude-code-spiral.mjs" });
  assert.ok(t.has("claude-code-spiral.mjs") && t.has("claude-code-spiral"));
  assert.ok(nameTokens({ kind: "call", name: "fs.readFileSync" }).has("readfilesync"));
  assert.ok(!t.has("mjs"), "a file extension is not a name");
  assert.ok(nameTokens({ kind: "import", name: "node:fs" }).has("fs"));
});

test("recurrence counts only EARLIER turns of OTHER sessions, and its null removes within-session clustering", () => {
  const u = (session, ts, names) => ({ ...unit(session, "p", "f", "x", names), ts });
  // 'K' repeats ten times but all inside ONE session; ten other sessions each add a key of their own.
  const clustered = [];
  for (let i = 0; i < 10; i++) clustered.push(u("A", `2026-01-01T00:00:${String(i).padStart(2, "0")}`, ["K"]));
  for (let j = 0; j < 10; j++) clustered.push(u(`B${j}`, `2026-01-02T00:00:${String(j).padStart(2, "0")}`, [`own${j}`]));
  const c = recurrence(clustered, { draws: 300, seed: 4 });
  assert.equal(c.seenBefore, 0, "one session repeating itself is not recurrence");
  assert.equal(c.rate, 0);
  assert.ok(c.nullMean > 0, "redealt across sessions, K does recur: the null sees what the real run does not");
  assert.ok(c.pLower < 0.01, `real recurrence sits below the redeal null (pLower=${c.pLower})`);
  // control: a key that really crosses sessions is counted, once per later appearance
  const crossing = [u("A", "2026-01-01T00:00:00", ["K"]), u("B", "2026-01-02T00:00:00", ["K"]), u("C", "2026-01-03T00:00:00", ["K"]), u("D", "2026-01-04T00:00:00", ["z"])];
  const r = recurrence(crossing, { draws: 50, seed: 1 });
  assert.deepEqual([r.instances, r.seenBefore], [4, 2]);
  assert.equal(r.top[0].key, "call:K"); assert.equal(r.top[0].sessions, 3);
});

// ───────────────────────── end to end ─────────────────────────
test("run(): a small transcript set end to end — yield, strict yield, control, predictors, ledger", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects");
  const mkSession = (proj, name, topic) => {
    fs.mkdirSync(path.join(root, proj), { recursive: true });
    const F = `/work/eoreader7/${name}.js`;
    const v0 = `function ${name}() {\n  return 1;\n}\n`;
    const L = [
      userPrompt(`please make ${name} call ${topic}Helper`, `p-${name}`),
      asst({ type: "tool_use", id: `r-${name}`, name: "Read", input: { file_path: F } }),
      result(`r-${name}`, readRes(F, v0)),
      asst({ type: "tool_use", id: `e-${name}`, name: "Edit", input: { file_path: F, old_string: "  return 1;", new_string: `  return ${topic}Helper(1);` } }),
      result(`e-${name}`, editResult(v0, "  return 1;", `  return ${topic}Helper(1);`, { orig: false })),
      asst({ type: "tool_use", id: `n-${name}`, name: "Write", input: { file_path: "/work/eoreader7/NOTES.md", content: "x" } }),
      result(`n-${name}`, { type: "create", content: "x", originalFile: null, structuredPatch: [] }),
    ].join("\n") + "\n";
    fs.writeFileSync(path.join(root, proj, `${name}.jsonl`), L);
  };
  const topics = ["alpha", "beta", "gamma", "delta", "omega", "sigma"];
  topics.forEach((t, i) => { mkSession(`-proj${i % 2}`, `s${i}a`, t); mkSession(`-proj${i % 2}`, `s${i}b`, t); });
  const ledger = path.join(dir, "ledger.jsonl");
  const rep = await run({ root, draws: 100, seed: 2, ledger });
  assert.equal(rep.yield.edits, 24);
  assert.equal(rep.yield.structural, 12);
  assert.equal(rep.yield.gaps["no-reader"], 12);
  assert.equal(rep.yieldFileGrade.structural, 12);
  assert.equal(rep.agreement.n, 12);
  assert.deepEqual([rep.scope.in.turns, rep.scope.in.edits, rep.scope.in.codeEdits, rep.scope.out.turns, rep.scope.mixed.turns], [12, 24, 12, 0, 0]);
  assert.equal(rep.agreement.sameSet, 12);
  assert.equal(rep.predictability.allKinds.n, 12);
  assert.equal(rep.recurrence.allKinds.instances, 12);
  assert.equal(rep.recurrence.allKinds.seenBefore, 6, "each topic is added by two sessions: the second is a recurrence");
  assert.ok(rep.predictability.allKinds.nearestCrossSession.global.real > 0.9, "twin sessions share topic and delta");
  assert.ok(rep.predictability.allKinds.nearestCrossSession.global.p < 0.05);
  const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.length, 24);
  assert.ok(rows.every((r) => "session" in r && "ext" in r));
  fs.rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── scope: by PATH, from a data file ─────────────────────────
test("scope is decided by path segments from the data file: OUT wins, tier 2 and strangers are OUT, the turn is the unit", () => {
  const scope = loadScope();
  const v = (f) => editScope(f, scope).verdict;
  assert.equal(v("/Users/mlacy/Documents/3.0/khora/cli/x.mjs"), "in");
  assert.equal(v("/Users/mlacy/Documents/3.0/eoreader7-latest/a.js"), "in");
  assert.equal(v("/private/tmp/eoreader6-legal-cells-wt/src/a.js"), "in", "a worktree outside Documents/3.0 is IN by its segment");
  assert.equal(v("/Users/mlacy/Documents/New Project/eoreader7/a.js"), "in");
  assert.equal(v("/Users/mlacy/Documents/3.0/the-fold--claude-worktrees-x/app.js"), "in");
  assert.equal(v("/Users/mlacy/Documents/3.0/khora/caselink-scraper/a.py"), "out", "OUT wins over IN");
  assert.equal(v("/Users/mlacy/Documents/3.0/eoreader7/holodeck-x/a.js"), "out");
  assert.equal(v("/Users/mlacy/Documents/3.0/eoWebLLM/a.js"), "out");
  assert.equal(editScope("/Users/mlacy/Documents/3.0/eoWebLLM/a.js", scope).why, "tier2");
  assert.equal(v("/Users/mlacy/Documents/3.0/eo-teachings/a.js"), "out");
  assert.equal(v("/Users/mlacy/Documents/3.0/mnpd-network-audit/a.py"), "out");
  assert.equal(v("/Users/mlacy/scratch/anything.js"), "out", "no IN segment: default OUT");
  // prompt wording never moves a path: a prompt that says "fold" for a file in an OUT dir is still OUT
  const T = (files, prompt = "work on the fold") => ({ prompt, edits: files.map((file) => ({ file })) });
  assert.equal(scopeOfTurn(T(["/a/khora/x.js", "/a/janus/y.mjs"]), scope), "in");
  assert.equal(scopeOfTurn(T(["/a/NPJ/x.js", "/a/ab/y.js"]), scope), "out");
  assert.equal(scopeOfTurn(T(["/a/khora/x.js", "/a/NPJ/y.js"]), scope), "mixed", "a mixed turn is withheld whole");
  // control: a NON-code edit (a memory note) does not make an otherwise IN turn mixed
  assert.equal(scopeOfTurn(T(["/a/khora/x.js", "/Users/mlacy/.claude/projects/p/memory/n.md"]), scope), "in");
  assert.equal(scopeOfTurn(T(["/Users/mlacy/.claude/projects/p/memory/n.md"]), scope), "out", "no code edit: judged on all edits");
});

test("run(): OUT and MIXED turns reach no yield, no predictor, no ledger — only counts (control: the IN turn is read)", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects"); fs.mkdirSync(path.join(root, "-p"), { recursive: true });
  const mk = (n, files, prompt) => {
    const L = [userPrompt(prompt, `p${n}`)];
    files.forEach((F, i) => {
      L.push(asst({ type: "tool_use", id: `w${n}-${i}`, name: "Write", input: { file_path: F, content: `import x${n}${i} from "mod${n}${i}";\n` } }));
      L.push(result(`w${n}-${i}`, { type: "create", content: `import x${n}${i} from "mod${n}${i}";\n`, originalFile: null, structuredPatch: [] }));
    });
    fs.writeFileSync(path.join(root, "-p", `s${n}.jsonl`), L.join("\n") + "\n");
  };
  mk(1, ["/w/eoreader7/a.js"], "in turn");
  mk(2, ["/w/NPJ/b.js"], "out turn about the fold and eoreader");
  mk(3, ["/w/eoreader7/c.js", "/w/holodeck/d.js"], "mixed turn");
  mk(4, ["/w/eoWebLLM/e.js"], "tier two turn");
  const ledger = path.join(dir, "l.jsonl");
  const rep = await run({ root, draws: 20, seed: 1, ledger });
  assert.deepEqual([rep.scope.in.turns, rep.scope.in.edits], [1, 1]);
  assert.deepEqual([rep.scope.out.turns, rep.scope.out.edits], [2, 2]);
  assert.deepEqual([rep.scope.mixed.turns, rep.scope.mixed.edits, rep.scope.mixed.gap], [1, 2, "withheld:mixed-scope"]);
  assert.equal(rep.scope.editsUnderTier2Dirs, 1);
  assert.equal(rep.yield.edits, 1);
  const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.ok(!JSON.stringify(rows).includes("mod2") && !JSON.stringify(rows).includes("mod3"));
  fs.rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── no personal content leaves ─────────────────────────
const PLANTED = {
  email: "alice.smith@example.com", phone: "615-555-0142", ssn: "123-45-6789",
  street: "4412 Hillsboro Pike, Nashville TN", promptEmail: "bob.jones@example.org", promptPhone: "615-555-0199",
};

test("Goffman is blind to a street address and to a name (so the structural-only rule must be what stops them)", () => {
  assert.equal(piiFindings(PLANTED.street).findings.length, 0, "no matcher for a street address");
  assert.equal(piiFindings("Tabitha Marlowe of Ward 21").findings.length, 0, "no matcher for a person name");
  for (const k of ["email", "phone", "ssn"]) assert.ok(piiFindings(PLANTED[k]).findings.length > 0, `${k} is a shape Goffman knows`);
  assert.ok(!scrubPrompt(`mail ${PLANTED.promptEmail} or ${PLANTED.promptPhone}`).includes("example.org"));
  assert.ok(!/REDACTED/.test(scrubPrompt(`mail ${PLANTED.promptEmail}`)), "the redaction marker is not an identifier");
});

test("CONTROL BUILT TO FAIL: planted PII in a prompt and in an edit reaches no ledger line, no report, no render", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects"); fs.mkdirSync(path.join(root, "-p"), { recursive: true });
  const F = "/work/eoreader7/lib/person.js";
  const v0 = "function greet() {\n  return 1;\n}\n";
  const newS = [
    `  // reach ${PLANTED.email} or ${PLANTED.phone} (ssn ${PLANTED.ssn})`,
    `  // office: ${PLANTED.street}`,
    `  const where = "${PLANTED.street}";`,
    "  return helper(where);",
  ].join("\n");
  const oldS = "  return 1;";
  const L = [
    userPrompt(`please write to ${PLANTED.promptEmail} or call ${PLANTED.promptPhone} and then make greet call helper`, "p1"),
    asst({ type: "tool_use", id: "r1", name: "Read", input: { file_path: F } }),
    result("r1", readRes(F, v0)),
    asst({ type: "tool_use", id: "e1", name: "Edit", input: { file_path: F, old_string: oldS, new_string: newS } }),
    result("e1", editResult(v0, oldS, newS, { orig: false })),
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(root, "-p", "s1.jsonl"), L);
  // precondition: the fixture really carries every planted value (else "not found in output" would prove nothing)
  for (const [k, v] of Object.entries(PLANTED)) assert.ok(L.includes(v), `fixture carries ${k}`);
  const ledger = path.join(dir, "ledger.jsonl"), out = path.join(dir, "report.json");
  const rep = await run({ root, draws: 30, seed: 1, ledger });
  fs.writeFileSync(out, JSON.stringify(rep));
  const everything = [fs.readFileSync(ledger, "utf8"), fs.readFileSync(out, "utf8"), render(rep), JSON.stringify(await turnsOfTranscript(path.join(root, "-p", "s1.jsonl"), { root }).then((t) => t.map((x) => ({ p: x.prompt, ...x.edits.map((e) => e.row) }))))].join("\n");
  for (const [k, v] of Object.entries(PLANTED)) {
    assert.ok(!everything.includes(v), `planted ${k} must not appear in any output`);
  }
  for (const frag of ["Hillsboro", "Nashville", "alice.smith", "bob.jones", "555-0142", "6789"]) assert.ok(!everything.includes(frag), `${frag} leaked`);
  // the row is structural: it still names the call, with a span, and carries no text
  const row = JSON.parse(fs.readFileSync(ledger, "utf8").trim().split("\n")[0]);
  assert.equal(row.category, "structural");
  assert.deepEqual(row.added.map((e) => e.key), ["call:helper"]);
  assert.ok(!("prompt" in row) && !("file" in row));
  assert.match(row.fileId, /^[0-9a-f]{12}$/);
  // counted by category, never by value
  assert.ok(rep.pii.prompts.byCategory.email >= 1 && rep.pii.prompts.byCategory.phone >= 1);
  assert.ok(rep.pii.editContent.byCategory.email >= 1 && rep.pii.editContent.byCategory["us-ssn"] >= 1);
  assert.equal(rep.pii.editContent.byCategory["street"], undefined, "the street address was never detected: structural-only is what kept it out");
  assert.equal(rep.pii.reportScrubbed, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a PII-shaped identifier or specifier is withheld, fail-closed, as withheld:pii:<category> (the value is never counted by value)", async () => {
  const bad = gradeEditFull({ id: "t", tool: "Write", file: "/w/eoreader7/a.js", input: { content: "" },
    result: { type: "create", content: `import x from "${PLANTED.email}/lib";\nfoo();\n`, originalFile: null, structuredPatch: [] } }, {});
  assert.equal(bad.row.gap, "withheld:pii:email");
  assert.deepEqual(bad.row.piiCategories, ["email"]);
  assert.ok(!JSON.stringify(bad.row).includes("example.com"));
  assert.notEqual(bad.after, null, "the in-memory state still advances");
  // control: the same shape with no PII is read normally
  const ok = gradeEditFull({ id: "t", tool: "Write", file: "/w/eoreader7/a.js", input: {}, result: { type: "create", content: `import x from "pkg/lib";\nfoo();\n`, originalFile: null, structuredPatch: [] } }, {});
  assert.equal(ok.row.category, "structural");
  // a withheld row is a typed gap in the yield, counted in the denominator
  const y = yieldReport([bad.row, ok.row]);
  assert.deepEqual([y.edits, y.gaps["withheld:pii:email"], y.structural], [2, 1, 1]);
});

test("an absolute-path import specifier is reduced to its last segment (a home directory is a name Goffman cannot see)", () => {
  const d = deltaOf({ before: "const a = 1;\n", after: 'import q from "/Users/jane.doe/Documents/proj/quantum/index.js";\nimport r from "./rel/x.js";\nconst a = 1;\n', file: "/p/a.js" });
  const keys = d.added.map((e) => e.key).sort();
  assert.deepEqual(keys, ["import:./rel/x.js", "import:<abs>/index.js"]);
  assert.ok(!JSON.stringify(d).includes("jane.doe") && !JSON.stringify(d).includes("Documents"));
});

test("scrubDeep: a report string or key that carries a finding is replaced and counted by category", () => {
  const into = {};
  const clean = scrubDeep({ a: `mail ${PLANTED.email}`, [`k ${PLANTED.ssn}`]: 1, ok: "fine", n: [PLANTED.phone, "x"] }, into);
  assert.ok(!JSON.stringify(clean).includes("example.com") && !JSON.stringify(clean).includes("6789") && !JSON.stringify(clean).includes("0142"));
  assert.equal(clean.ok, "fine");
  assert.equal(into.strings, 4 - 1);
  assert.deepEqual(Object.keys(into.byCategory).sort(), ["email", "phone", "us-ssn"]);
  assert.deepEqual(piiCategoriesOf({ x: "plain" }), []);
  assert.deepEqual(Object.keys(piiCounts(PLANTED.email)), ["email"]);
});

test("output location: a path inside the tracked repo is refused; outside it, or gitignored, is allowed", () => {
  const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  assert.throws(() => assertUntrackedOutput(path.join(repo, "documents", "claude-code-x.jsonl")), /tracked path/);
  assert.throws(() => assertUntrackedOutput(path.join(repo, "cli", "ledger.jsonl")), /tracked path/);
  assert.doesNotThrow(() => assertUntrackedOutput(path.join(os.tmpdir(), "ledger.jsonl")));
  assert.doesNotThrow(() => assertUntrackedOutput(path.join(repo, "state", "ledger.jsonl")), "state/ is gitignored");
  assert.match(opaque("/Users/mlacy/Documents/3.0/khora/a.js"), /^[0-9a-f]{12}$/);
});

test("turnsOfTranscript records the turn's tool calls in order with the strings they name; an Edit/Write body is never held", async () => {
  const dir = tmp();
  const root = path.join(dir, "projects"); fs.mkdirSync(path.join(root, "-p"), { recursive: true });
  const F = "/work/eoreader7/a.js";
  const L = [
    userPrompt("look around and edit a.js", "p1"),
    asst({ type: "tool_use", id: "g1", name: "Grep", input: { pattern: "frobnicate", path: "/work/eoreader7" } }), result("g1", { type: "text" }),
    asst({ type: "tool_use", id: "b1", name: "Bash", input: { command: "node cli/reason.mjs spec.json" } }), result("b1", "ok"),
    asst({ type: "tool_use", id: "e1", name: "Edit", input: { file_path: F, old_string: "SECRET OLD BODY", new_string: "SECRET NEW BODY" } }),
    result("e1", editResult("function f() {}\n", "function f() {}", "function f() { return 1; }", { orig: true })),
  ].join("\n") + "\n";
  const f = path.join(root, "-p", "s.jsonl");
  fs.writeFileSync(f, L);
  const turns = await turnsOfTranscript(f, { root });
  assert.deepEqual(turns[0].calls.map((c) => c.name), ["Grep", "Bash", "Edit"]);
  assert.ok(turns[0].calls[0].strs.includes("frobnicate"));
  assert.ok(turns[0].calls[2].strs.includes(F));
  assert.ok(!JSON.stringify(turns[0].calls).includes("SECRET"), "an Edit body is not held");
  fs.rmSync(dir, { recursive: true, force: true });
});
