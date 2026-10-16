import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const d = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-")); process.env.FOLD_WORKNOTES_DIR = d;
const L = await import("./opencode-ledger.mjs");

test("append is content-addressed and the fold reads only the new bytes", () => {
  const a = L.append("t", { schema: "X@1", op: "DEF", referent: "r1", n: 1 });
  assert.equal(a.ok, true);
  assert.equal(L.rows("t", { schema: "X@1" }).length, 1);
  const first = L.fold("t").bytesRead;
  L.append("t", { schema: "X@1", op: "DEF", referent: "r2", n: 2 });
  L.append("t", { schema: "Y@1", op: "EVA", referent: "r1", n: 3 });
  assert.equal(L.rows("t", { schema: "X@1" }).length, 2);
  assert.equal(L.rows("t", { referent: "r1" }).length, 2);
  const total = fs.statSync(L.ledgerFile("t")).size;
  assert.equal(L.fold("t").bytesRead, total, "incremental reads sum to the file, never a rescan");
  assert.ok(first < total);
});

test("incremental fold equals a cold fold; a torn tail waits; a bad row is dropped", () => {
  const warm = L.rows("t").map((r) => r.id);
  L._forget();
  assert.deepEqual(L.rows("t").map((r) => r.id), warm);
  fs.appendFileSync(L.ledgerFile("t"), '{"schema":"Z@1","op":"DEF","referent":"half');
  assert.equal(L.rows("t").length, warm.length, "torn line is not read yet");
  fs.appendFileSync(L.ledgerFile("t"), '"}\nnot json\n');
  assert.equal(L.rows("t").length, warm.length + 1);
});

test("bad rows are refused", () => {
  assert.equal(L.append("t", { schema: "X@1" }).gap, "bad-row");
});
