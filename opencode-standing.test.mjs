import test from "node:test";
import assert from "node:assert/strict";
import { standingOf } from "./opencode-standing.mjs";

const ground = {
  sentences: [
    { text: "The parser now handles empty input.", type: "grounded" },
    { text: "I also fixed src/ghost.js.", type: "self:model" },
    { text: "Tests pass.", type: "asserted" },
  ],
  flags: [{ kind: "unknown_path", detail: "src/ghost.js" }, { kind: "unverified_pass", detail: "Tests pass." }],
};

test("a draft sentence gets the standing its instrument gives it, never more", () => {
  const r = standingOf({ agent: "ses_abcdefgh1234", n: 3, ground });
  assert.deepEqual(r.counts, { supported: 0, licensed: 1, refuted: 2, unresolved: 0 });
  assert.equal(r.claims, 3);
  assert.deepEqual(r.refuted, ["abcdefgh.t3.s1", "abcdefgh.t3.s2"]);
});

test("untestable sentences stay unresolved, not supported", () => {
  const r = standingOf({ agent: "a", n: 1, ground: { sentences: [{ text: "It feels cleaner.", type: "self:model" }], flags: [] } });
  assert.deepEqual(r.counts, { supported: 0, licensed: 0, refuted: 0, unresolved: 1 });
});

test("no ground, no claims", () => {
  assert.equal(standingOf({ agent: "a", ground: null }).claims, 0);
});
