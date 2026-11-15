// A reasoning run woven into the shared log by khora's own door (2026-11-14).
// Needs the pharos library: $PHAROS_LIB, else the sibling checkout ../pharos.
// Every case uses a temp pointer, a temp log dir and a temp file ledger.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { appendReasoningLedger } from "../reasoning-ledger.mjs";
import { openDoor } from "../pharos-door.mjs";
import { weaveReasoning, unitAddr, RUN_KIND, CLAIM_KIND } from "../reasoning-pharos.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = process.env.PHAROS_LIB ?? path.resolve(HERE, "..", "..", "..", "pharos", "lib", "pharos.mjs");
const have = fs.existsSync(LIB);
const skip = have ? false : `pharos library not found at ${LIB} (set PHAROS_LIB)`;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rp-"));
const pointerIn = (dir, sha = null) => {
  const p = path.join(dir, "pharos.json");
  fs.writeFileSync(p, JSON.stringify({ v: 1, kind: "pharos-pointer", lib: LIB, sha256: sha ?? crypto.createHash("sha256").update(fs.readFileSync(LIB)).digest("hex") }));
  return p;
};
const claim = (over = {}) => ({ ground: "/p1", rel: "discover", roles: { ARG0: "b1", ARG1: "b2" }, polarity: "+", ...over });
const run = (dir, claims, at) => appendReasoningLedger({ declaredClaims: claims, runAt: at, ok: false, errors: 1, instrument: "eot-janus", dir });

test("no pointer: the door is off, says why, writes nothing, and never throws", async () => {
  const d = tmp();
  const door = await openDoor({ pointer: path.join(d, "absent.json"), dir: path.join(d, "log") });
  assert.equal(door.on, false);
  assert.match(door.why, /no pharos pointer/);
  const r = await weaveReasoning(run(d, [claim()], "2026-11-14T00:00:00.000Z").records, { door });
  assert.deepEqual([r.on, r.woven], [false, 0]);
  assert.equal(fs.existsSync(path.join(d, "log")), false);
});

test("a lib that is not the pinned one: the door is off", { skip }, async () => {
  const d = tmp();
  const door = await openDoor({ pointer: pointerIn(d, "0".repeat(64)), dir: path.join(d, "log") });
  assert.equal(door.on, false);
  assert.match(door.why, /not the pinned one/);
});

test("a run and its claims are woven by writer khora; the unit is the address", { skip }, async () => {
  const d = tmp();
  const door = await openDoor({ pointer: pointerIn(d), dir: path.join(d, "log") });
  assert.equal(door.on, true);
  const r = await weaveReasoning(run(d, [claim({ ref: "c1.0" }), claim({ ground: "/p2", ref: "s1.0" })], "2026-11-14T00:00:00.000Z").records, { door });
  assert.equal(r.refused, 0);
  const runs = door.fold({ kind: RUN_KIND }), claims = door.fold({ kind: CLAIM_KIND });
  assert.equal(runs.length, 1);
  assert.equal(claims.length, 2);
  assert.ok([...runs, ...claims].every((e) => e.by === "khora" && e.cell === "INS·Figure"));
  assert.deepEqual(runs[0].body.denominators, { claims: 2, grounds: 2, units: 2, notes: 0 });
  assert.equal(runs[0].body.instrument, "eot-janus");
  assert.equal(claims[0].addr, unitAddr(claims[0].body.unit));
  assert.deepEqual(claims[0].of, [runs[0].id]);
  assert.deepEqual(claims.map((c) => c.body.ref), ["c1.0", "s1.0"]);
  assert.ok(fs.existsSync(path.join(d, "log", "khora.jsonl")));
});

test("a restatement in a later run chains through `of` to the last statement of the unit", { skip }, async () => {
  const d = tmp();
  const door = await openDoor({ pointer: pointerIn(d), dir: path.join(d, "log") });
  await weaveReasoning(run(d, [claim()], "2026-11-14T00:00:00.000Z").records, { door });
  await weaveReasoning(run(d, [claim(), claim({ polarity: "-" })], "2026-11-14T00:00:01.000Z").records, { door });
  const claims = door.fold({ kind: CLAIM_KIND });
  const [first, second, denial] = claims;
  assert.equal(second.addr, first.addr);
  assert.ok(second.of.includes(first.id));
  assert.deepEqual([first.body.nth, second.body.nth, denial.body.nth], [1, 2, 1]);
  assert.notEqual(denial.addr, first.addr);
  assert.equal(door.fold({ kind: CLAIM_KIND, addr: first.addr }).length, 2);
});

test("the kinds are declared as entries, once", { skip }, async () => {
  const d = tmp();
  const door = await openDoor({ pointer: pointerIn(d), dir: path.join(d, "log") });
  await weaveReasoning(run(d, [claim()], "2026-11-14T00:00:00.000Z").records, { door });
  await weaveReasoning(run(d, [claim()], "2026-11-14T00:00:01.000Z").records, { door });
  const kinds = door.fold({ kind: "kind" }).filter((e) => [RUN_KIND, CLAIM_KIND].includes(e.body.name));
  assert.equal(kinds.length, 2);
});
