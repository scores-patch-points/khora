// cli/tests/claude-code-identity.test.mjs — nesting-fix J D2: one claim, one identity, across the ledger and the
// janus spiral; `supersedes` is set when a claim is re-proposed (it was null on every line).
//
// Audit repro (J.md D2): ledger claim id = sha1(at, pid, claim, i, ground, rel); spiral id = the content string;
// ledger `supersedes` null on all three line kinds. The ledger half runs on any stack; the spiral half needs
// janus's spiral organs and is skipped, with the typed reason, when they are absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "identity-home-"));
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = path.join(HOME, "led");

const { appendReasoningLedger, ledgerFile } = await import("../reasoning-ledger.mjs");
const { claimId, claimKey, claimOfLine } = await import("../claim-identity.mjs");
const { spiralEventsOf, spiralLayer } = await import("../claude-code-spiral.mjs");

const G = "/repo/src/store.js";
const c = (rel, a0, a1, polarity = "+", verdict = "unattributed", ground = G) => ({ ground, rel, roles: { ARG0: a0, ARG1: a1 }, polarity, verdict, said: `${a0} ${rel} ${a1}` });
let n = 0;
const run = (session, claims, extra = {}) => appendReasoningLedger({ declaredClaims: claims, session, runAt: `2026-10-14T00:00:${String(n++).padStart(2, "0")}.000Z`, ...extra });
const lines = (session) => fs.readFileSync(ledgerFile(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.kind === "reasoning-claim" && l.session === session);

test("every claim line carries claimId — the claim's one content address — beside its own per-statement id", () => {
  const r = run("id-1", [c("calls", "store", "save")]);
  const [l] = lines("id-1");
  assert.equal(l.claimId, claimId(c("calls", "store", "save")));
  assert.equal(l.claimId, "calls(store, save) @ /repo/src/store.js");
  assert.notEqual(l.id, l.claimId, "the statement id is per run; the claim id is the identity");
  assert.deepEqual(r.claims, [l.id], "the writer returns each statement's id, in order, for the spiral to point back at");
  // a denial is a different claim, addressed with the same ¬ the spiral uses
  run("id-1", [c("calls", "store", "save", "-")]);
  assert.equal(lines("id-1").at(-1).claimId, "¬calls(store, save) @ /repo/src/store.js");
});

test("the same claim stated twice shares its claimId across runs; a line without claimId reads through the same function (old ids still read)", () => {
  run("id-2", [c("reads", "store", "disk")]);
  run("id-2", [c("reads", "store", "disk")]);
  const ls = lines("id-2");
  assert.equal(ls[0].claimId, ls[1].claimId);
  assert.notEqual(ls[0].id, ls[1].id);
  const old = { ...ls[0] }; delete old.claimId; delete old.supersedes;
  assert.equal(claimKey(claimOfLine(old)), ls[0].claimId, "a pre-claimId line derives the identical address");
});

test("supersedes: a retraction, a declared one-valued revision, and a claim re-proposed WITH a citation each point at the statement they replace", () => {
  run("sup-1", [c("calls", "store", "flush")]);
  run("sup-1", [c("calls", "store", "flush", "-")]);                  // retraction
  const [first, retract] = lines("sup-1");
  assert.equal(first.supersedes, null);
  assert.equal(retract.supersedes, first.id);

  run("sup-2", [c("listens-on", "proxy", "11436")]);
  run("sup-2", [c("listens-on", "proxy", "11437")], { functional: ["listens-on"] });   // one-valued revision
  const [a, b] = lines("sup-2");
  assert.equal(b.supersedes, a.id);

  run("sup-3", [c("returns", "parse", "ast", "+", "unattributed")]);
  run("sup-3", [c("returns", "parse", "ast", "+", "cited")]);        // re-proposed with a ground
  const [u, g] = lines("sup-3");
  assert.equal(g.supersedes, u.id);
});

test("supersedes stays null where nothing is replaced (controls)", () => {
  // a plain restatement is corroboration, not replacement
  run("ctl-1", [c("calls", "store", "load", "+", "cited")]);
  run("ctl-1", [c("calls", "store", "load", "+", "cited")]);
  assert.deepEqual(lines("ctl-1").map((l) => l.supersedes), [null, null]);
  // the same flip without a declaration of functional is a retraction only when the object is the same
  run("ctl-2", [c("listens-on", "proxy", "11436")]);
  run("ctl-2", [c("listens-on", "proxy", "11437")]);                 // NOT declared functional
  assert.deepEqual(lines("ctl-2").map((l) => l.supersedes), [null, null]);
  // another session's statements are never replaced
  run("ctl-3", [c("calls", "store", "flush", "-")]);
  assert.equal(lines("ctl-3")[0].supersedes, null);
  // no session → nothing to scope a replacement to
  run(null, [c("calls", "store", "zap")]);
  run(null, [c("calls", "store", "zap", "-")]);
  assert.ok(lines(null).every((l) => l.supersedes === null));
});

test("the spiral's node id for a claim IS the ledger claimId, and the propose event points back at its ledger statement", { skip: spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}` }, () => {
  const claim = { id: "x", ...c("calls", "store", "save", "+", "cited"), force: "default" };
  const r = run("join-1", [claim]);
  const [l] = lines("join-1");
  const log = spiralEventsOf([], { declared: [claim], inputClaims: [{ id: "x" }], sources: [{ verdict: "cited", file: G, line: 4 }], findings: [], ledger: { runId: r.runId, claims: r.claims } }, { forWhom: "session:join-1" });
  const propose = log.find((e) => e.kind === "propose");
  assert.equal(propose.id, l.claimId);
  assert.deepEqual(propose.ledger, { run: r.runId, line: l.id });
  // control: with no ledger handed in, the event simply has no pointer and everything else is as before
  const bare = spiralEventsOf([], { declared: [claim], inputClaims: [{ id: "x" }], sources: [{ verdict: "cited", file: G, line: 4 }], findings: [] }, { forWhom: "session:join-1" });
  assert.equal(bare.find((e) => e.kind === "propose").id, l.claimId);
  assert.equal(bare.find((e) => e.kind === "propose").ledger, undefined);
});

test("migration: a spiral log written before this change (ids = content strings, no ledger pointer) is read and extended in place", { skip: spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}` }, () => {
  const claim = { id: "x", ...c("calls", "store", "save", "+", "cited"), force: "default" };
  const old = spiralEventsOf([], { declared: [claim], inputClaims: [{ id: "x" }], sources: [{ verdict: "cited", file: G, line: 4 }], findings: [] }, { forWhom: "session:mig" });
  const next = spiralEventsOf(old, { declared: [claim], inputClaims: [{ id: "x" }], sources: [{ verdict: "cited", file: G, line: 4 }], findings: [], ledger: { runId: "r", claims: ["l"] } }, { forWhom: "session:mig" });
  assert.equal(next.length, old.length, "a restatement of an old-id claim adds nothing and does not re-propose it");
  assert.equal(old.find((e) => e.kind === "propose").id, claimId(claim));
});

test("end to end through the real reason.mjs: the ledger claimId equals the spiral node id", { skip: spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}` }, () => {
  const session = `identity-e2e-${process.pid}`;
  const spec = { session, claims: [{ id: "c1", ground: path.join(HERE, "..", "claude-code-spiral.mjs"), rel: "imports", roles: { ARG0: "claude-code-spiral", ARG1: "spiral-layer" }, said: "claude-code-spiral imports spiral-layer" }] };
  const r = spawnSync(process.execPath, [path.join(HERE, "..", "reason.mjs"), "--json"], { input: JSON.stringify(spec), encoding: "utf8", env: { ...process.env, HOME, EO_LEDGER_DIR: path.join(HOME, "led") }, timeout: 110000 });
  const out = JSON.parse(r.stdout);
  assert.equal(out.janus.state, "present");
  const [l] = lines(session);
  const sp = fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "spiral", `${session}.jsonl`), "utf8").split("\n").filter(Boolean).map((x) => JSON.parse(x));
  const propose = sp.find((e) => e.kind === "propose");
  assert.equal(propose.id, l.claimId);
  assert.equal(propose.ledger.line, l.id);
});
