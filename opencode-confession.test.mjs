// opencode-confession.test.mjs — the confession equals the ledger byte for byte: same log, same bytes; a new row, new bytes; never a model.
//   node --test opencode-confession.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "confession-eot-"));
const R = await import("./opencode-residue.mjs");
const C = await import("./opencode-confession.mjs");
const EOT = await import("./opencode-eot.mjs");

test("an empty task confesses nothing is on the record", () => {
  assert.equal(C.confessionOf({ task: "ses_empty" }), "What this is made of: Nothing of this piece is on the record yet.");
});

test("a drawn answer's confession is computed from the ledger rows and cites them; the same log renders the same bytes", () => {
  const task = "ses_confess";
  const claims = [
    { text: "Dolphins are marine mammals.", standing: "grounded", ref: "https://x/d#1" },
    { text: "They have captivated humanity.", standing: "self:model" },
    { text: "There are forty species.", standing: "contradicted", ref: "https://x/d#9" },
  ];
  const a = R.recordResidue({ task, agent: "door", ask: "dolphins", claims, now: 1000 });
  assert.equal(a.ok, true);
  const first = C.confessionOf({ task });
  assert.equal(first, C.confessionOf({ task }), "deterministic on an unchanged log");
  assert.match(first, /^What this is made of: 1 sentence of 3 faces a source at an address; 1 is the model's own, marked; 1 is contradicted by a source; over 1 answer\. The model's share is 33%\. \[ledger evt_[0-9a-f]+\]$/);
  const f = C.confessionFacts({ task });
  assert.equal(f.addresses.rows[0], a.event_id, "the address is the ledger row's own event id");
  R.recordResidue({ task, agent: "door", ask: "dolphins", claims: claims.slice(0, 1), now: 1000 + 20 * 60_000 });
  const second = C.confessionOf({ task });
  assert.notEqual(second, first, "a new row changes the bytes");
  assert.match(second, /2 sentences of 4 face/);
});

test("a piece's confession reads the section grades and the stitched tree: slots, gaps, model calls, freeform named as unjudged", () => {
  const job = "longform-confess-1";
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "stitch-tree", slots: ["a", "b", "c"], gaps: [{ label: "sleep" }] }, now: 1 });
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s1", round: 0, sentences: 4, supported: 3, accepted: true }, now: 2 });
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s2", round: 0, sentences: 2, supported: 2, accepted: true }, now: 3 });
  const text = C.confessionOf({ task: job });
  assert.match(text, /5 sentences of 6 face a source at an address; 1 is the model's own, marked; 3 slots were hunted, 1 is a gap no page filled; the model was called 2 times, last\. The model's share is 17%\./);
  assert.match(text, /tree evt_/);
  const job2 = "longform-confess-free";
  EOT.append({ task: job2, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s1", round: 0, sentences: 3, supported: 3, accepted: true, freeform: true }, now: 1 });
  assert.match(C.confessionOf({ task: job2 }), /0 sentences of 3 face a source at an address; 3 are the model's own, marked; the model was given the facts and not judged\. The model's share is 100%\./);
});
