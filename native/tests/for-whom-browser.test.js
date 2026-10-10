// for-whom.js must load in a browser (the-fold vendors theory-of-mind.js, which imports it) and must mint the SAME recipe id it did when it
// hashed with node:crypto, so every address already minted still matches.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createForWhom } from "../kernel/for-whom.js";

test("for-whom.js imports nothing from node:*", () => {
  const src = fs.readFileSync(new URL("../kernel/for-whom.js", import.meta.url), "utf8");
  assert.equal(/from\s+["']node:/.test(src), false);
});

test("the recipe id is byte-identical to the node:crypto sha256 it replaced", () => {
  for (const [id, question, giver] of [["a", "q", "g"], ["é☃𝄞", "who is she?", null], ["x".repeat(70), "y".repeat(130), "z"]]) {
    const want = "for-whom:" + createHash("sha256").update(`${id}|${question}|${giver ?? ""}`).digest("hex").slice(0, 16);
    assert.equal(createForWhom({ id, question, giver }).recipe, want);
  }
});
