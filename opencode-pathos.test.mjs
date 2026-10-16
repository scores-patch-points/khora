import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "pathos-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const R = await import("./opencode-record.mjs");
const P = await import("./opencode-pathos.mjs");
const L = await import("./opencode-ledger.mjs");
// varied rhythm so `stale` (flatline) cannot be the reason a concession fires
const VOICE = "Done. I changed the retry bound in the client after reading the failing test, which pinned it at three and nothing more. Then the suite went green? Yes. It did, and the fork is still open between the two answers.";
let n = 0;
const put = (t, ref, d, extra = {}) => R.admit({ task: t, agent: "a", referent: ref, delta: d, check: "true", exitCode: 0, now: Date.now() + (n++), ...extra });

test("collapse fires only when the curve is measured", () => {
  fresh(); L._forget();
  put("t", "r@1", "three");
  put("t", "r@1", "five", { parallel: true });
  const gap = P.pathosPass({ task: "t", text: VOICE, turn: 1, measured: false });
  assert.equal(gap.measured, false);
  assert.notEqual(gap.condition, "collapse", "an unmeasured curve is a gap, never a verdict");
  const m = P.pathosPass({ task: "t", text: VOICE, turn: 2, measured: true });
  assert.equal(m.measured, true);
  assert.equal(m.condition, "collapse");
  assert.match(m.note, /^ground conceded: collapse at e/);
  assert.ok(!/feel|sad|anx/i.test(m.note), "the model-facing note is a mechanical fact");
});

test("the concession lands on the ledger as REC with the old ground's fingerprint; a holding ground leaves no row", () => {
  fresh(); L._forget();
  put("t", "q@1", "one");
  const held = P.pathosPass({ task: "t", text: VOICE, turn: 1 });
  assert.equal(L.rows("t", { schema: "PathosTurn@1" }).length, 0, "ground holds: the default is not a record");
  assert.equal(held.act, null);
  put("t", "q@1", "two", { parallel: true });
  P.pathosPass({ task: "t", text: VOICE, turn: 2 });
  const rec = L.rows("t", { schema: "PathosTurn@1" });
  assert.equal(rec.length, 1);
  assert.equal(rec[0].op, "REC");
  assert.match(rec[0].m.concession.old, /^[0-9a-f]{12}$/);
  assert.equal(rec[0].m.experiencer, "person:person");
});
