import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "stakes-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const R = await import("./opencode-record.mjs");
const S = await import("./opencode-stakes.mjs");
const L = await import("./opencode-ledger.mjs");
const FRAME = { giver: "person", question: "what retry bound", ground: "design note" };
let n = 0;
const put = (t, ref, d) => { const r = R.admit({ task: t, agent: "a", referent: ref, delta: d, check: "true", exitCode: 0, now: Date.now() + (n++) }); return R.blocks(t).find((b) => b.id === r.id); };

test("a contradiction of a promoted stake logs a CONTEST and never supersedes the stake", () => {
  fresh(); L._forget();
  S.declareStake({ task: "t", referent: "retry@1", claim: "maxRetries 3", frame: FRAME, promotedBy: "recurrence:4" });
  const b = put("t", "retry@1", "maxRetries 9");
  const hit = S.stakeCheck({ task: "t", block: b, judge: "box" });
  assert.equal(hit.class, "contest");
  assert.equal(L.rows("t", { schema: "Contest@1" }).length, 1);
  assert.equal(S.stakesOf("t").find((s) => s.referent === "retry@1").claim, "maxRetries 3", "the stake is unchanged");
  assert.equal(L.rows("t", { schema: "Stake@1" }).length, 1, "no Stake row was superseded by a block");
});

test("only the person's word resolves it", () => {
  fresh(); L._forget();
  S.declareStake({ task: "t", referent: "retry@1", claim: "maxRetries 3", frame: FRAME });
  S.stakeCheck({ task: "t", block: put("t", "retry@1", "maxRetries 9"), judge: "box" });
  S.resolveContest({ task: "t", stakeReferent: "retry@1", claim: "maxRetries 9", frame: FRAME });
  assert.equal(S.stakesOf("t")[0].claim, "maxRetries 9");
  assert.equal(L.rows("t", { schema: "Stake@1" }).length, 2, "appended, never edited");
});

test("a block that fills a declared void is meaningful; one touching no stake leaves no row; no frame is a gap", () => {
  fresh(); L._forget();
  assert.equal(S.declareStake({ task: "t", referent: "q@1", kind: "void" }).gap, "no_for_whom");
  S.declareStake({ task: "t", referent: "q@1", kind: "void", claim: "which bound?", frame: FRAME });
  assert.equal(S.stakeCheck({ task: "t", block: put("t", "q@1", "answered") }).class, "fills_void");
  const before = L.rows("t").length;
  assert.equal(S.stakeCheck({ task: "t", block: put("t", "other@1", "x") }).class, "none");
  assert.equal(L.rows("t").length, before, "no stake touched, no row");
});
