// cli/tests/apprentice-trail.test.mjs — the trail-following test (cli/apprentice-trail.mjs) against REAL git in a
// fixture repo, khora's real code index of it, and the real Goffman organ. No stand-ins.
// Controls built to fail: a target reachable ONLY by following an import (A must miss it, B must hit it); a
// future/same-session association that must not reach the memory; a world that must stay byte-identical after a
// run; a paired null that must not call a one-turn cluster significant.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadScope } from "../apprentice-replay.mjs";
import {
  git, treeAt, revAt, resolveWorld, projectOf, relInOwn, RevIndex, seedsOf, askNamed, walk, masterHops, targetsOf,
  RegionMemory, pairedNull, addressesIn, resolveAddress, validateIndex, runTrail, summarize, renderTrail, stripNonCode,
} from "../apprentice-trail.mjs";
import { mulberry32 } from "../../native/adapters/code/lex.js";

const scope = loadScope();

// ── a fixture repo with real commits at fixed dates ──
const sh = (cwd, args, date) => {
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.test", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.test" };
  if (date) { env.GIT_AUTHOR_DATE = date; env.GIT_COMMITTER_DATE = date; }
  const r = spawnSync("git", ["-C", cwd, ...args], { env, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
};
const put = (root, rel, text) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
// (no `git status` here: status itself refreshes the index, which is exactly the write this test watches for)
const snap = (repo) => {
  const st = fs.statSync(path.join(repo, ".git", "index"));
  const tree = spawnSync("find", [repo, "-type", "f", "-not", "-path", "*/.git/objects/*", "-not", "-path", "*/.git/index", "-exec", "stat", "-f", "%N %m %z", "{}", "+"], { encoding: "utf8" }).stdout;
  return { head: sh(repo, ["rev-parse", "HEAD"]), refs: sh(repo, ["for-each-ref"]), index: [st.mtimeMs, st.size], count: sh(repo, ["count-objects"]), tree };
};

function fixture() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "apprentice-trail-")));
  const repo = path.join(base, "khora-fixture");
  fs.mkdirSync(repo);
  sh(repo, ["init", "-q", "-b", "main"]);
  put(repo, "src/entry.js", '// frobnicate the widget pipeline\nimport { helper } from "./lib/helper.js";\nexport const run = () => helper();\n');
  put(repo, "src/lib/helper.js", "export function helper() {\n  return 1;\n}\n");
  put(repo, "src/other.js", "// unrelated words\nexport const x = 1;\n");
  put(repo, "src/deep/chain.js", 'import { leaf } from "../lib/leaf.js";\nexport const c = leaf;\n');
  put(repo, "src/lib/leaf.js", "export const leaf = 2;\n");
  put(repo, "README.md", "frobnicate docs\n");
  sh(repo, ["add", "-A"]);
  sh(repo, ["commit", "-q", "-m", "one"], "2026-01-01T12:00:00Z");
  put(repo, "src/late.js", 'export const late = "frobnicate";\n');
  sh(repo, ["add", "-A"]);
  sh(repo, ["commit", "-q", "-m", "two"], "2026-01-10T12:00:00Z");
  return { base, repo };
}

// ───────────────────────── the world is read-only ─────────────────────────
test("git(): only read-only subcommands run; anything that writes is refused, and a run leaves the repo byte-identical", () => {
  const { base, repo } = fixture();
  for (const args of [["checkout", "-b", "x"], ["commit", "-m", "x"], ["reset", "--hard"], ["stash"], ["switch", "main"], ["add", "-A"], ["worktree", "add", "../w"], ["config", "a.b", "c"], ["gc"]]) {
    assert.throws(() => git(repo, args), /refused/, args.join(" "));
  }
  const before = snap(repo);
  const r = revAt(repo, "2026-01-05T00:00:00Z");
  const tree = treeAt(repo, r.rev);
  const idx = new RevIndex(repo, r.rev, tree, scope.codeExt);
  walk({ index: idx, seeds: seedsOf("fix frobnicate"), policy: "trail", target: "src/lib/helper.js", horizon: 5 });
  validateIndex(idx, ["frobnicate", "helper"], scope.codeExt, mulberry32(1), 2);
  assert.deepEqual(snap(repo), before, "HEAD, refs, index, object count and every working file are unchanged");
  fs.rmSync(base, { recursive: true, force: true });
});

test("revAt and resolveWorld: the commit at or before the turn; a file added later is target-uncommitted; a missing one is typed", () => {
  const { base, repo } = fixture();
  const r1 = revAt(repo, "2026-01-05T00:00:00Z"), r2 = revAt(repo, "2026-01-20T00:00:00Z");
  assert.notEqual(r1.rev, r2.rev);
  assert.equal(revAt(repo, "2025-12-01T00:00:00Z"), null);
  assert.ok(treeAt(repo, r2.rev).has("src/late.js") && !treeAt(repo, r1.rev).has("src/late.js"));
  const P = (rel) => path.join(repo, rel);
  const own = resolveWorld(P("src/lib/helper.js"), "2026-01-05T00:00:00Z", [repo], scope);
  assert.equal(own.source, "own"); assert.equal(own.rev, r1.rev); assert.equal(own.rel, "src/lib/helper.js");
  assert.equal(resolveWorld(P("src/late.js"), "2026-01-05T00:00:00Z", [repo], scope).gap, "target-uncommitted");
  assert.equal(resolveWorld(P("src/late.js"), "2026-01-20T00:00:00Z", [repo], scope).source, "own");
  assert.equal(resolveWorld(P("src/never.js"), "2026-01-20T00:00:00Z", [repo], scope).gap, "target-not-in-rev");
  assert.equal(resolveWorld(P("src/lib/helper.js"), "2025-12-01T00:00:00Z", [repo], scope).gap, "no-rev");
  fs.rmSync(base, { recursive: true, force: true });
});

test("resolveWorld falls back to another checkout by repo-relative path and timestamp; a vanished checkout resolves by its project-relative path", () => {
  const { base, repo } = fixture();
  // a younger repo whose history starts after the turn (like khora's squash) and an older sibling that holds the file
  const young = path.join(base, "khora-young"); fs.mkdirSync(young); sh(young, ["init", "-q", "-b", "main"]);
  put(young, "src/lib/helper.js", "export function helper() { return 9; }\n");
  sh(young, ["add", "-A"]); sh(young, ["commit", "-q", "-m", "squash"], "2026-02-01T00:00:00Z");
  const old = path.join(base, "khora-young-old"); fs.mkdirSync(old); sh(old, ["init", "-q", "-b", "main"]);
  put(old, "src/lib/helper.js", "export function helper() { return 8; }\n");
  sh(old, ["add", "-A"]); sh(old, ["commit", "-q", "-m", "older"], "2026-01-03T00:00:00Z");
  const w = resolveWorld(path.join(young, "src/lib/helper.js"), "2026-01-05T00:00:00Z", [repo, young, old], scope);
  assert.equal(w.source, "fallback-family"); assert.ok(w.top === old || w.top === repo);
  // the original checkout is gone: only its project directory name is left in the path
  const gone = path.join(base, "khora-gone", "src", "lib", "helper.js");
  assert.equal(relInOwn(gone), null);
  assert.deepEqual([projectOf(gone, scope).name, projectOf(gone, scope).rel], ["khora-gone", "src/lib/helper.js"]);
  const g = resolveWorld(gone, "2026-01-05T00:00:00Z", [repo, young, old], scope);
  assert.ok(g.source.startsWith("fallback")); assert.equal(g.rel, "src/lib/helper.js");
  assert.equal(resolveWorld(path.join(base, "khora-gone", "nothing/here.js"), "2026-01-05T00:00:00Z", [repo], scope).gap, "checkout-gone");
  fs.rmSync(base, { recursive: true, force: true });
});

// ───────────────────────── the index is git grep ─────────────────────────
test("the index emulates `git grep -l -i -w -F` over code files (checked against real git grep)", () => {
  const { base, repo } = fixture();
  const r = revAt(repo, "2026-01-20T00:00:00Z");
  const idx = new RevIndex(repo, r.rev, treeAt(repo, r.rev), scope.codeExt);
  assert.equal(idx.N, 6, "six code files; README.md is not code");
  assert.equal(idx.df("frobnicate"), 2, "entry.js and late.js (README is not indexed)");
  assert.equal(idx.df("zebra"), 0);
  const v = validateIndex(idx, ["frobnicate", "helper", "leaf", "late", "export", "unrelated"], scope.codeExt, mulberry32(2), 6);
  assert.deepEqual(v, { checked: 6, mismatches: 0 });
  const ranked = idx.rank(["frobnicate", "helper"]).map((c) => c.path);
  assert.equal(ranked[0], "src/entry.js", "the file holding both seeds ranks first");
  fs.rmSync(base, { recursive: true, force: true });
});

// ───────────────────────── seeds and the address grammar ─────────────────────────
test("seeds are words and path fragments of the ask; a fragment that matches one file is an address the ask NAMES", () => {
  const s = seedsOf("please fix src/lib/helper.js and the Frobnicate_widget in cli/ now, see node.js");
  assert.ok(s.words.includes("frobnicate_widget") && s.words.includes("helper"));
  assert.deepEqual(s.fragments, ["src/lib/helper.js", "cli/", "node.js"]);
  const paths = ["src/lib/helper.js", "src/other.js", "cli/a.mjs", "cli/b.mjs", "pkg/cli/c.mjs"];
  const dirs = new Set(["src", "src/lib", "cli", "pkg", "pkg/cli"]);
  assert.deepEqual(askNamed(["src/lib/helper.js", "other.js", "cli/"], paths, dirs), ["src/lib/helper.js", "src/other.js", "cli/"]);
  assert.deepEqual(askNamed(["c.mjs", "nothing.js"], paths, dirs), ["pkg/cli/c.mjs"]);
});

test("address grammar: ESM, CommonJS, dynamic import, Python, C, HTML, stack frames, resolved with Node's completion; bare names are not guessed", () => {
  const js = [
    'import a from "./a.js";', 'export { b } from "../b";', 'import "./side";', 'const c = require("./c.cjs");',
    'const d = await import("./d.mjs");', 'import fs from "node:fs";', 'import z from "left-pad";',
    "    at run (/repo/src/lib/helper.js:3:9)", 'File "/x/y/mod.py", line 4',
  ].join("\n");
  const raw = addressesIn(js, "src/x.js");
  assert.deepEqual(raw.map((r) => r.kind), ["esm", "esm", "esm", "cjs", "esm", "esm", "esm", "frame", "frame"]);
  const tree = new Map([["src/a.js", "1"], ["b.js", "2"], ["src/side/index.js", "3"], ["src/c.cjs", "4"], ["src/d.mjs", "5"], ["src/lib/helper.js", "6"], ["y/mod.py", "7"]]);
  const res = raw.map((r) => resolveAddress(r, "src/x.js", tree));
  assert.deepEqual(res, ["src/a.js", "b.js", "src/side/index.js", "src/c.cjs", "src/d.mjs", null, null, "src/lib/helper.js", "y/mod.py"]);
  const py = addressesIn("from .util import f\nimport pkg.mod, other\nfrom . import x\n", "pkg/main.py");
  const pt = new Map([["pkg/util.py", "1"], ["pkg/mod.py", "2"]]);
  assert.deepEqual(py.map((r) => resolveAddress(r, "pkg/main.py", pt)), ["pkg/util.py", null, null, null].slice(0, py.length).map((x, i) => (i === 1 ? "pkg/mod.py" : x)));
  assert.equal(resolveAddress({ kind: "c", spec: "util.h" }, "lib/a.c", new Map([["lib/util.h", "1"]])), "lib/util.h");
});

// ───────────────────────── the walker: the control built to fail ─────────────────────────
function idxAt(repo, iso) { const r = revAt(repo, iso); return new RevIndex(repo, r.rev, treeAt(repo, r.rev), scope.codeExt); }

test("CONTROL BUILT TO FAIL: the target is reachable ONLY by following an import. A must miss it, B must hit it (at hop 3), the FIFO trail too", () => {
  const { base, repo } = fixture();
  const idx = idxAt(repo, "2026-01-05T00:00:00Z");
  const seeds = seedsOf("fix frobnicate");
  assert.deepEqual(idx.rank(seeds.words).map((c) => c.path), ["src/entry.js"], "only entry.js carries the seed; helper.js carries none");
  const target = "src/lib/helper.js";
  const A = walk({ index: idx, seeds, policy: "none", target, horizon: 10 });
  const B = walk({ index: idx, seeds, policy: "trail", target, horizon: 10 });
  const Bf = walk({ index: idx, seeds, policy: "fifo", target, horizon: 10 });
  assert.equal(A.hops, null, "search alone cannot reach a file no seed names");
  assert.equal(B.hops, 3, "grep (1), open entry.js (2), follow its import (3)");
  assert.equal(Bf.hops, 3);
  // and within a budget of 2 the trail is too late, so the difference is the budget's, not an artifact
  assert.equal(walk({ index: idx, seeds, policy: "trail", target, horizon: 2 }).hops, null);
  fs.rmSync(base, { recursive: true, force: true });
});

test("the null arm: an ask of another turn names nothing here, so the same walker finds nothing (C must not reach)", () => {
  const { base, repo } = fixture();
  const idx = idxAt(repo, "2026-01-05T00:00:00Z");
  const C = walk({ index: idx, seeds: seedsOf("rename zebra please"), policy: "trail", target: "src/lib/helper.js", horizon: 10 });
  assert.equal(C.hops, null);
  fs.rmSync(base, { recursive: true, force: true });
});

test("the lesson: a prequential memory opens the remembered file first; the same session and the future are excluded (controls)", () => {
  const { base, repo } = fixture();
  const idx = idxAt(repo, "2026-01-05T00:00:00Z");
  const m = new RegionMemory();
  m.learn(["frobnicate"], ["src/lib/helper.js"], "s-old");
  assert.deepEqual(m.nominate(["frobnicate", "zebra"], "s-new"), ["src/lib/helper.js"]);
  assert.deepEqual(m.nominate(["frobnicate"], "s-old"), [], "an association from the SAME session is not memory");
  assert.deepEqual(m.nominate(["unseen"], "s-new"), []);
  const seeds = seedsOf("fix frobnicate");
  const E = walk({ index: idx, seeds, policy: "trail", memory: ["src/lib/helper.js"], target: "src/lib/helper.js", horizon: 10 });
  assert.equal(E.hops, 1, "the nominated file is opened first: one hop, no grep");
  // a nominated path that does not exist in the world is dropped, not opened
  const E2 = walk({ index: idx, seeds, policy: "trail", memory: ["src/gone.js"], target: "src/lib/helper.js", horizon: 10 });
  assert.equal(E2.hops, 3);
  // a vote is the empirical share: a word tied to two files splits its vote
  m.learn(["both"], ["a.js", "b.js"], "s1");
  m.learn(["both"], ["a.js"], "s2");
  assert.deepEqual(m.nominate(["both"], "s9"), ["a.js", "b.js"]);
  fs.rmSync(base, { recursive: true, force: true });
});

test("ask-named addresses are opened without a grep: the ask naming the file costs one hop", () => {
  const { base, repo } = fixture();
  const idx = idxAt(repo, "2026-01-05T00:00:00Z");
  const r = walk({ index: idx, seeds: seedsOf("look at src/lib/helper.js"), policy: "none", target: "src/lib/helper.js", horizon: 5 });
  assert.equal(r.hops, 1);
  // a directory the ask names is an ls hop, and its listing is an answer the trail follows
  const d = walk({ index: idx, seeds: seedsOf("look in src/lib/"), policy: "trail", target: "src/lib/helper.js", horizon: 5 });
  assert.equal(d.hops, 2, "ls src/lib/ (1), open helper.js (2)");
  // A lists the directory too but does not follow it: with two actions (ls, grep) it has not opened the file
  assert.equal(walk({ index: idx, seeds: seedsOf("look in src/lib/"), policy: "none", target: "src/lib/helper.js", horizon: 2 }).hops, null, "A does not follow a listing");
  assert.equal(walk({ index: idx, seeds: seedsOf("look in src/lib/"), policy: "trail", target: "src/lib/helper.js", horizon: 2 }).hops, 2);
  fs.rmSync(base, { recursive: true, force: true });
});

// ───────────────────────── the master's hops ─────────────────────────
test("masterHops: the first call that names the target's path or its last two segments; null when none does", () => {
  const abs = "/w/khora/cli/reason.mjs";
  const calls = [{ strs: ["git status"] }, { strs: ["node cli/reason.mjs spec.json"] }, { strs: [abs] }];
  assert.equal(masterHops(calls, abs), 2);
  assert.equal(masterHops([{ strs: ["ls"] }, { strs: ["/w/khora/cli/tui.mjs"] }], abs), null);
  assert.equal(masterHops([{ strs: [abs] }], abs), 1);
});

test("targetsOf: successful code edits in IN paths; a created file is marked, a failed edit and a note are not targets", () => {
  const e = (file, tool, row) => ({ file, tool, row });
  const t = { edits: [
    e("/w/khora/a.mjs", "Edit", { mode: "edit" }), e("/w/khora/b.mjs", "Write", { mode: "write-create" }), e("/w/khora/c.mjs", "Edit", { gap: "edit-failed" }),
    e("/w/khora/n.md", "Write", { mode: "write-create" }), e("/w/NPJ/x.js", "Edit", { mode: "edit" }), e("/w/khora/a.mjs", "Edit", { mode: "edit" }),
  ] };
  assert.deepEqual(targetsOf(t, scope), [{ abs: "/w/khora/a.mjs", created: false }, { abs: "/w/khora/b.mjs", created: true }]);
});

// ───────────────────────── paired permutation nulls ─────────────────────────
test("pairedNull: a consistent gain across many turns reaches its draw floor; one turn's targets cannot (cluster control); noise is not significant", () => {
  const pos = pairedNull(Array(40).fill(1), Array.from({ length: 40 }, (_, i) => `t${i}`), { draws: 400, seed: 1 });
  assert.equal(pos.reached, 1 - 1 + 1 - 1 + 0 || pos.reached, "all-positive: only the observed sign pattern (and its mirror) reach it");
  assert.ok(pos.p <= 3 / 401, `p=${pos.p}`);
  assert.equal(pos.floor, 1 / 401);
  const oneTurn = pairedNull(Array(10).fill(1), Array(10).fill("same"), { draws: 400, seed: 1 });
  assert.equal(oneTurn.p, 1, "ten targets of ONE turn are one observation: every flip is as extreme as the real one");
  const rnd = mulberry32(5);
  const noise = Array.from({ length: 60 }, () => (rnd() < 0.5 ? 1 : -1));
  const nz = pairedNull(noise, noise.map((_, i) => `t${i}`), { draws: 400, seed: 2 });
  assert.ok(nz.p > 0.05, `noise p=${nz.p}`);
  assert.deepEqual(pairedNull([], [], {}), { n: 0, note: "no pairs" });
});

// ───────────────────────── end to end over fixture transcripts ─────────────────────────
const rec = (o) => JSON.stringify(o);
const prompt = (text, promptId, ts, cwd) => rec({ type: "user", promptId, timestamp: ts, cwd, origin: { kind: "human" }, message: { role: "user", content: text } });
const asst = (b) => rec({ type: "assistant", message: { role: "assistant", content: [b] } });
const res = (id, toolUseResult) => rec({ type: "user", toolUseResult, message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } });

function transcripts(base, repo) {
  const root = path.join(base, "projects"), proj = path.join(root, "-fixture"); fs.mkdirSync(proj, { recursive: true });
  const helper = path.join(repo, "src/lib/helper.js");
  const entry = path.join(repo, "src/entry.js");
  const turn = (session, pid, ts, text) => {
    const L = [
      prompt(text, pid, ts, repo),
      asst({ type: "tool_use", id: `g-${pid}`, name: "Grep", input: { pattern: "frobnicate" } }), res(`g-${pid}`, { type: "text", file: null }),
      asst({ type: "tool_use", id: `r1-${pid}`, name: "Read", input: { file_path: entry } }), res(`r1-${pid}`, { type: "text", file: { filePath: entry, content: "x", numLines: 1, startLine: 1, totalLines: 5 } }),
      asst({ type: "tool_use", id: `r2-${pid}`, name: "Read", input: { file_path: helper } }), res(`r2-${pid}`, { type: "text", file: { filePath: helper, content: "x", numLines: 1, startLine: 1, totalLines: 4 } }),
      asst({ type: "tool_use", id: `e-${pid}`, name: "Edit", input: { file_path: helper, old_string: "return 1;", new_string: "return 2;" } }),
      res(`e-${pid}`, { filePath: helper, oldString: "return 1;", newString: "return 2;", originalFile: "export function helper() {\n  return 1;\n}\n", replaceAll: false, structuredPatch: [] }),
    ];
    fs.writeFileSync(path.join(proj, `${session}.jsonl`), L.join("\n") + "\n");
  };
  // both turns fall after commit one and before commit two
  turn("s-early", "p1", "2026-01-04T10:00:00.000Z", "fix frobnicate, mail zed.person@example.com about it");
  turn("s-late", "p2", "2026-01-06T10:00:00.000Z", "fix frobnicate again");
  return root;
}

test("runTrail end to end: A misses, B hits, the memory fires only where an EARLIER session left an association; no ask or address leaks", async () => {
  const { base, repo } = fixture();
  const root = transcripts(base, repo);
  const ledger = path.join(base, "ledger.jsonl");
  const { report, rows } = await runTrail({ root, draws: 100, nulls: 3, seed: 1, repos: [repo], ledger, validate: 4 });
  assert.equal(rows.length, 2);
  const [r1, r2] = rows.sort((a, b) => (a.ts < b.ts ? -1 : 1));
  assert.deepEqual([r1.budget, r2.budget], [3, 3], "the master touched helper.js on its 3rd call");
  for (const r of rows) {
    assert.equal(r.A.reach, 0); assert.equal(r.B.reach, 1); assert.equal(r.B.hops, 3); assert.equal(r.worldSource, "own");
  }
  assert.equal(r1.memoryNominated, 0, "nothing earlier exists: the future (turn two) must not reach turn one");
  assert.equal(r1.E.hops, 3);
  assert.equal(r2.memoryNominated, 1, "turn one's session left the association");
  assert.equal(r2.E.hops, 1, "the lesson opens helper.js first");
  assert.equal(r2.censHops.B - r2.censHops.E, 2, "same reach (both within budget 3), two hops saved by the lesson");
  assert.deepEqual(report.indexValidation.mismatches, 0);
  assert.equal(report.differences["B-A"].reach.mean, 1);
  // controls: turn two's memory is ask-specific in this fixture, and with no trail it still reaches by the lesson alone
  assert.equal(r2.EA.reach, 1, "the lesson with no trail opens helper.js first");
  assert.equal(r1.EA.reach, 0, "no earlier session, no lesson, and search alone misses it");
  // the lesson's ask-specificity control: consulted with another turn's ask (here the only other ask has the same
  // word, so the control cannot separate them; the point of the test is that the arm exists and is paired)
  assert.ok("EA0" in r2 && r2.EA0.n === 1);
  assert.equal(report.differences["E-B"].reach.mean, 0, "at this budget the lesson changes no reach");
  assert.equal(report.differences["E-B"].hopsSaved.mean, 1, "but it saves hops on the one turn where it fired");
  assert.equal(report.differences["E-B"].hopsSaved.plus, 1);
  // output discipline: structural rows only, nothing of the ask, the address, or the path
  const out = fs.readFileSync(ledger, "utf8") + JSON.stringify(report) + renderTrail(report);
  for (const leak of ["zed.person", "example.com", "frobnicate", "helper", "src/lib", repo]) assert.ok(!out.includes(leak), `leaked ${leak}`);
  const row = JSON.parse(fs.readFileSync(ledger, "utf8").split("\n")[0]);
  assert.match(row.targetId, /^[0-9a-f]{12}$/);
  assert.ok(!("prompt" in row) && !("target" in row));
  fs.rmSync(base, { recursive: true, force: true });
});

test("summarize: 'noticed, not learned' — a component that changes nothing shows a zero difference and p = 1", () => {
  const mk = (i) => ({ session: `s${i}`, promptId: `p${i}`, worldSource: "own", ext: ".js", budget: 5, memoryNominated: 1, seedWords: 1, askNamedFiles: 0,
    A: { reach: 1, hops: 2, reachHorizon: 1 }, B: { reach: 1, hops: 2, reachHorizon: 1 }, Bf: { reach: 1, hops: 2, reachHorizon: 1 }, E: { reach: 1, hops: 2, reachHorizon: 1 },
    EA: { reach: 1, hops: 2, reachHorizon: 1 }, E0: { n: 2, reach: 1, reachHorizon: 1, censHops: 2 }, EA0: { n: 2, reach: 1, reachHorizon: 1, censHops: 2 },
    C: { n: 2, reach: 1, reachHorizon: 1, censHops: 2 }, censHops: { A: 2, B: 2, Bf: 2, E: 2, EA: 2 } });
  const rep = summarize(Array.from({ length: 12 }, (_, i) => mk(i)), { draws: 100, seed: 1, gaps: {}, acct: { turnsIn: 12, turnsOut: 0, turnsMixed: 0 }, withTargets: 12, candidates: 12, stats: { transcripts: 1 }, known: 1, validation: { checked: 0, mismatches: 0 } });
  for (const k of ["B-A", "B-C", "E-B", "E-E0", "EA-EA0", "EA0-A", "EA-A", "E-A"]) { assert.equal(rep.differences[k].reach.mean, 0); assert.equal(rep.differences[k].reach.p, 1); }
});

test("identifiers mode strips comments and string literals: a word that lives only in a comment or a string is not a seed hit", () => {
  const { base, repo } = fixture();
  const r = revAt(repo, "2026-01-20T00:00:00Z");
  const words = new RevIndex(repo, r.rev, treeAt(repo, r.rev), scope.codeExt, "words");
  const ids = new RevIndex(repo, r.rev, treeAt(repo, r.rev), scope.codeExt, "identifiers");
  assert.equal(words.df("frobnicate"), 2, "a comment in entry.js and a string in late.js");
  assert.equal(ids.df("frobnicate"), 0, "neither is an identifier");
  assert.equal(ids.df("helper"), words.df("helper"), "real identifiers are kept");
  assert.equal(stripNonCode('const a = "x // y"; // tail\n/* b */ f(a);', ".js").replace(/\s+/g, " ").trim(), "const a = ; f(a);");
  assert.equal(stripNonCode("x = 1  # note\ny = '''doc'''\n", ".py").replace(/\s+/g, " ").trim(), "x = 1 y =");
  // the ablation can change what is reached: the ask's only word lives in a comment
  const seeds = seedsOf("fix frobnicate");
  assert.equal(walk({ index: words, seeds, policy: "none", target: "src/entry.js", horizon: 3 }).hops, 2);
  assert.equal(walk({ index: ids, seeds, policy: "none", target: "src/entry.js", horizon: 3 }).hops, null);
  fs.rmSync(base, { recursive: true, force: true });
});
