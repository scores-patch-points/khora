import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-senses-"));
const senses = await import("../senses/registry.mjs");

test("the delta is agreement over the consensus; disagreement is the finding", () => {
  const d = senses.deltaOf([
    { text: "the council voted to approve the budget" },
    { text: "the council voted to approve the budget today" },
  ]);
  assert.equal(d.organs, 2);
  assert.ok(d.agreement > 0.8, `agreement ${d.agreement}`);
  assert.ok(d.consensus >= 6);
  assert.ok(d.disputed >= 1); // "today" is the residue the second organ added
  assert.match(d.line, /sense delta/);
});

test("a single reading has no delta to compute", () => {
  const d = senses.deltaOf([{ text: "only one organ spoke" }]);
  assert.equal(d.agreement, null);
  assert.match(d.line, /single organ/);
});

test("the hunt partitions every candidate into found or missing, and persists", () => {
  const h = senses.huntOrgans({ stateDir });
  const ids = [...h.found, ...h.missing].map((o) => o.id).sort();
  assert.deepEqual(ids, senses.ORGAN_CANDIDATES.map((o) => o.id).sort());
  assert.ok(fs.existsSync(path.join(stateDir, "senses-organs.json")));
});

test("a modality with no present organ is a typed gap, never a swarm over nothing", async () => {
  const out = await senses.perceiveMany(Buffer.from([0, 1, 2, 3]), { mime: "application/octet-stream", stateDir });
  assert.equal(out.text, "");
  assert.equal(out.via, "none");
  assert.ok(out.gaps.some((g) => g.reason === "no_sense_organs"));
});

test("the ledger learns each organ's agreement over time", () => {
  senses.recordReliability({
    stateDir,
    mime: "image/png",
    name: "x.png",
    delta: { agreement: 0.9 },
    readings: [
      { organ: "organ-a", provider: "local", chars: 10, ms: 5, agreeWithMajority: 1, gaps: [] },
      { organ: "organ-b", provider: "local", chars: 8, ms: 5, agreeWithMajority: 0.5, gaps: [] },
    ],
  });
  const standing = senses.organStanding({ stateDir });
  const a = standing.find((s) => s.organ === "organ-a");
  const b = standing.find((s) => s.organ === "organ-b");
  assert.equal(a.runs, 1);
  assert.equal(a.meanAgree, 1);
  assert.equal(b.meanAgree, 0.5);
  assert.ok(standing.indexOf(a) < standing.indexOf(b), "the better-agreeing organ ranks first");
});
