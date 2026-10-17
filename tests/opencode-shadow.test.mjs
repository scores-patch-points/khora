import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-shadow-"));
const door = await import("../opencode-doorway.mjs");
const shadowFile = () => path.join(process.env.FOLD_OPENCODE_STATE, "shadow.jsonl");

test("shadow captures full draft bytes locally and answers {}", async () => {
  const text = "x".repeat(9000); // past the 4000-char record clip: shadow keeps all of it
  const out = await door.answer({ event: "shadow", sessionID: "sh1", kind: "draft-text", text });
  assert.deepEqual(out, {});
  const rows = fs.readFileSync(shadowFile(), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].chars, 9000);
  assert.equal(rows[0].text.length, 9000);
});

test("shadow fails open on junk: no row, still {}", async () => {
  const before = fs.existsSync(shadowFile()) ? fs.readFileSync(shadowFile(), "utf8") : "";
  assert.deepEqual(await door.answer({ event: "shadow", sessionID: "", kind: "", text: "" }), {});
  assert.deepEqual(await door.answer({ event: "shadow" }), {});
  const after = fs.existsSync(shadowFile()) ? fs.readFileSync(shadowFile(), "utf8") : "";
  assert.equal(after, before);
});
