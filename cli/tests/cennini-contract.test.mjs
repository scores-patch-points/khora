// cli/tests/cennini-contract.test.mjs — A3's enforcement: the experience marks, judged on the events a run really emits.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { JUDGES, KNOWN_BAD, MARKS, PENDING_EVENTS, judgeRun, controlRejected, rowsFor } from "../cennini-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT = path.join(HERE, "..", "..", "..", "the-fold", "fold-chat-agent.js");
const haveAgent = fs.existsSync(AGENT);

test("six marks are judged on a recorded run; the other two are named as unwired in the end state", () => {
  assert.deepEqual(MARKS, ["ask-in-words", "plan-first", "looks-first", "says-who-made-it", "observes-and-stops-by-measure", "stays-local"]);
  const end = JSON.parse(fs.readFileSync(path.join(HERE, "..", "cennini-end-state.json"), "utf8"));
  const j7 = end.clauses.find((c) => c.id === "J7");
  assert.equal(j7.facets.length, 8);
  assert.deepEqual(j7.facets.filter((f) => f.instrument === null).map((f) => f.id).sort(), ["handled-before-is-faster", "undo-and-corrections-win"]);
  for (const m of MARKS) assert.equal(j7.facets.find((f) => f.id === m).instrument, "cli/cennini-contract.mjs");
});

test("every judge REJECTS its known-bad trace and ACCEPTS the good one (a check that never rejects is not a check)", () => {
  for (const m of MARKS) {
    assert.equal(controlRejected(m), true, `${m} must reject its known-bad trace and accept a good one`);
    assert.equal(JUDGES[m](KNOWN_BAD[m]).ok, false, `${m} known-bad`);
  }
});

test("each known-bad trace violates ONLY its own mark (the judges are not one blunt rule)", () => {
  for (const m of MARKS) {
    const r = judgeRun(KNOWN_BAD[m]);
    const failing = MARKS.filter((x) => !r[x].ok);
    assert.ok(failing.includes(m), `${m} fails its own trace`);
    assert.ok(failing.length <= 2, `${m}'s trace fails ${failing.join(", ")}`);
  }
});

test("success cannot be claimed past what was observed", () => {
  const ok = (extra) => judgeRun([{ type: "start", task: "t" }, { type: "plan", steps: ["x"] }, { type: "read" }, { type: "round", round: 1 }, { type: "act", round: 1, pipeline: "penelope" }, { type: "acted", round: 1, lane: "l" }, ...extra])["observes-and-stops-by-measure"];
  assert.equal(ok([{ type: "check", round: 1, ok: true }, { type: "done", ok: true }]).ok, true);
  assert.equal(ok([{ type: "check", round: 1, ok: false }, { type: "done", ok: true }]).ok, false, "claimed success over a failed check");
  assert.equal(ok([{ type: "done", ok: true }]).ok, false, "acted and never observed");
  assert.equal(ok([{ type: "check", round: 1, ok: false }, { type: "done", ok: false, exhausted: true, findings: ["blank page"] }]).ok, true, "gave up and said what failed");
  assert.equal(ok([{ type: "check", round: 1, ok: false }, { type: "done", ok: false, exhausted: true, findings: [] }]).ok, false, "gave up without saying why");
});

test("rows come from LIVE runs only; a fixture can never make a mark met", () => {
  assert.deepEqual(rowsFor([{ run: "f", live: false, events: [] }]), []);
  const events = [{ type: "start", task: "t" }];
  const rows = rowsFor([{ run: "a", live: true, events }, { run: "b", live: true, events }]);
  assert.equal(rows.length, MARKS.length);
  assert.ok(rows.every((r) => r.n === 2 && r.clause === "J7" && r.controlRejected === true));
  assert.equal(rows.find((r) => r.facet === "ask-in-words").violations, 0);
  assert.equal(rows.find((r) => r.facet === "plan-first").violations, 2);
});

test("the contract names real events: each type the judges read is emitted by the loop, or is declared PENDING with its reason", { skip: !haveAgent && "the-fold is not beside khora" }, () => {
  const src = fs.readFileSync(AGENT, "utf8");
  for (const t of ["start", "plan", "look", "round", "act", "acted", "check", "escalate", "done", "stopped", "error"]) {
    assert.match(src, new RegExp(`ev\\("${t}"`), `fold-chat-agent.js emits ${t}`);
  }
  assert.match(src, /ev\("acted", \{[^}]*\blane:/, "acted carries lane");
  for (const [t, why] of Object.entries(PENDING_EVENTS)) {
    assert.ok(why.length > 20, `${t} says why it is pending`);
    assert.doesNotMatch(src, new RegExp(`ev\\("${t}"`), `${t} is now emitted by the loop: remove it from PENDING_EVENTS`);
  }
  assert.deepEqual(Object.keys(PENDING_EVENTS), [], "the loop emits every event the contract reads");
});

test("THE REAL LOOP: a run emitted by runAgent is judged, and the first honest finding is that it drew before it looked", { skip: !haveAgent && "the-fold is not beside khora" }, async () => {
  const { runAgent } = await import(AGENT);
  const events = [];
  const answer = { sessionId: "s", text: "<!doctype html><title>t</title>", activity: [], ms: 5, lane: "penelope-code-agent", executed: false };
  await runAgent({ task: "make a page", dispatch: async () => answer, observe: async () => ({ checks: [{ name: "loads without errors", ok: true }] }), emit: (e) => events.push(e) });
  assert.deepEqual(events.map((e) => e.type), ["start", "plan", "requirements", "round", "act", "acted", "observing", "check", "done"]);
  const r = judgeRun(events);
  assert.equal(r["ask-in-words"].ok, true);
  assert.equal(r["plan-first"].ok, true);
  assert.equal(r["says-who-made-it"].ok, true);
  assert.equal(r["observes-and-stops-by-measure"].ok, true);
  assert.equal(r["stays-local"].ok, true);
  assert.equal(r["looks-first"].ok, false, "today's loop acts without looking at the material");
  assert.match(r["looks-first"].why, /without having looked at the material/);
});

test("the contract module calls no model, makes no request and writes nothing", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-contract.mjs"), "utf8");
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|api\.anthropic|\/v1\/(messages|chat|code)/);
  assert.doesNotMatch(src, /writeFileSync|appendFileSync|createWriteStream/);
});

test("the CLI prints rows for live runs and none for fixtures", () => {
  const tmp = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR || "/tmp"), "contract-"));
  try {
    const f = path.join(tmp, "runs.jsonl");
    fs.writeFileSync(f, JSON.stringify({ run: "x", live: true, events: [{ type: "start", task: "t" }] }) + "\n" + JSON.stringify({ run: "y", live: false, events: [] }) + "\n");
    const r = spawnSync(process.execPath, [path.join(HERE, "..", "cennini-contract.mjs"), "--runs", f], { encoding: "utf8" });
    assert.equal(r.status, 0);
    const rows = r.stdout.trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(rows.length, MARKS.length);
    assert.ok(rows.every((x) => x.n === 1));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("reading the ASK is not a look at the material: a run with a khora read and no look fails looks-first; a look passes", () => {
  const base = [{ type: "start", task: "t" }, { type: "plan", steps: ["x"] }, { type: "read", pipeline: "khora", referents: 3 }, { type: "act", round: 1, pipeline: "penelope" }];
  assert.equal(JUDGES["looks-first"](base).ok, false);
  const withLook = [base[0], base[1], base[2], { type: "look", candidates: 0, named: 0, gaps: [{ kind: "nothing-found" }] }, base[3]];
  assert.equal(JUDGES["looks-first"](withLook).ok, true, "a look that found nothing still looked, and says so");
  assert.equal(JUDGES["looks-first"]([base[0], base[1], base[3], { type: "look", candidates: 3 }]).ok, false, "a look AFTER the act is not before it");
});
