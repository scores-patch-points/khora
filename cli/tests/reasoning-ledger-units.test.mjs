// The arithmetic slice of the reasoning ledger (2026-11-14): the successor
// chain (supersedes + nth), the run's denominators, the caller's own claim
// ref and the instrument. Every case writes into a fresh temp dir; the real
// ledger is never opened.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendReasoningLedger, ledgerFile, unitKeyOf, priorUnits } from "../reasoning-ledger.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rl-units-"));
const lines = (dir) => fs.readFileSync(ledgerFile(dir), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const claim = (over = {}) => ({ ground: "/p1", rel: "discover", roles: { ARG0: "b1", ARG1: "b2" }, polarity: "+", ...over });

test("unitKeyOf: role order never splits a unit; polarity null reads as +", () => {
  assert.equal(unitKeyOf(claim({ roles: { ARG1: "b2", ARG0: "b1" } })), unitKeyOf(claim()));
  assert.equal(unitKeyOf(claim({ polarity: null })), unitKeyOf(claim()));
  assert.notEqual(unitKeyOf(claim({ polarity: "-" })), unitKeyOf(claim()));
  assert.notEqual(unitKeyOf(claim({ ground: "/p2" })), unitKeyOf(claim()));
});

test("a first statement has no predecessor; a restatement in a later run chains to it", () => {
  const dir = tmp();
  appendReasoningLedger({ declaredClaims: [claim({ ref: "c1.0" })], runAt: "2026-11-14T00:00:00.000Z", dir });
  appendReasoningLedger({ declaredClaims: [claim({ ref: "s1.0" })], runAt: "2026-11-14T00:00:01.000Z", dir });
  const cl = lines(dir).filter((l) => l.kind === "reasoning-claim");
  assert.equal(cl[0].supersedes, null);
  assert.equal(cl[0].nth, 1);
  assert.equal(cl[1].supersedes, cl[0].id);
  assert.equal(cl[1].nth, 2);
  assert.equal(cl[0].ref, "c1.0");
  assert.equal(cl[1].ref, "s1.0");
});

test("restatement inside one run chains within the run; a retraction starts its own chain", () => {
  const dir = tmp();
  appendReasoningLedger({ declaredClaims: [claim(), claim(), claim({ polarity: "-" })], runAt: "2026-11-14T00:00:00.000Z", dir });
  const cl = lines(dir).filter((l) => l.kind === "reasoning-claim");
  assert.deepEqual(cl.map((c) => c.nth), [1, 2, 1]);
  assert.equal(cl[1].supersedes, cl[0].id);
  assert.equal(cl[2].supersedes, null);
});

test("the run line carries its denominators, ok/errors and instrument; claims carry runId", () => {
  const dir = tmp();
  const r = appendReasoningLedger({
    declaredClaims: [claim(), claim(), claim({ ground: "/p2" })],
    runAt: "2026-11-14T00:00:00.000Z", ok: false, errors: 2, instrument: "eot-janus", dir,
  });
  const [run, ...cl] = lines(dir);
  assert.equal(run.kind, "reasoning-run");
  assert.deepEqual(run.denominators, { claims: 3, grounds: 2, units: 2, notes: 0 });
  assert.equal(run.ok, false);
  assert.equal(run.errors, 2);
  assert.equal(run.instrument, "eot-janus");
  assert.ok(cl.every((c) => c.instrument === "eot-janus" && c.runId === r.runId));
});

test("old lines without nth still chain: priorUnits counts them", () => {
  const dir = tmp();
  const file = ledgerFile(dir);
  const old = { schema: "EOTObservation@1", id: "old-1", kind: "reasoning-claim", ground: "/p1", rel: "discover", roles: { ARG0: "b1", ARG1: "b2" }, polarity: null, supersedes: null };
  fs.writeFileSync(file, JSON.stringify(old) + "\n" + JSON.stringify({ ...old, id: "old-2" }) + "\n");
  assert.deepEqual(priorUnits(file).get(unitKeyOf(claim())), { id: "old-2", nth: 2 });
  appendReasoningLedger({ declaredClaims: [claim()], runAt: "2026-11-14T00:00:00.000Z", dir });
  const last = lines(dir).at(-1);
  assert.equal(last.supersedes, "old-2");
  assert.equal(last.nth, 3);
});

test("missing ref and instrument are null, never invented", () => {
  const dir = tmp();
  appendReasoningLedger({ declaredClaims: [claim()], runAt: "2026-11-14T00:00:00.000Z", dir });
  const [run, c] = lines(dir);
  assert.equal(run.instrument, null);
  assert.equal(c.ref, null);
  assert.equal(c.instrument, null);
});
