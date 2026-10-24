// opencode-residue.test.mjs — the residue ledger is a pure projection of RESIDUE events: every sentence classed, the
// marked share counted, a fall between consecutive answers to the same ask named.
//   node --test opencode-residue.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "residue-eot-"));
const R = await import("./opencode-residue.mjs");

const CLAIMS_1 = [
  { text: "Dolphins are marine mammals.", standing: "grounded", ref: "https://example.org/dolphins#12" },
  { text: "Thirty-six species are found in every ocean.", standing: "grounded", sources: [{ url: "https://example.org/dolphins", source: "wwf" }] },
  { text: "They have captivated humanity for millennia.", standing: "self:model" },
  { text: "There are forty to forty-five species.", standing: "unsupported" },
  { text: "Sources", standing: "heading" },
];
const CLAIMS_2 = [
  { text: "Dolphins are marine mammals.", standing: "grounded", ref: "https://example.org/dolphins#12" },
  { text: "Thirty-six species are found in every ocean.", standing: "grounded", ref: "https://example.org/dolphins#16" },
  { text: "Most dolphins are marine.", standing: "grounded", ref: "https://example.org/dolphins#20" },
  { text: "They have captivated humanity for millennia.", standing: "self:model" },
];

test("every sentence is classed facing, marked or contradicted; headings are not sentences; a marked row carries no address", () => {
  const r = R.residueOf(CLAIMS_1);
  assert.equal(r.counts.sentences, 4);
  assert.deepEqual([r.counts.facing, r.counts.marked, r.counts.contradicted], [2, 2, 0]);
  assert.equal(r.share, 0.5);
  assert.equal(r.rows.filter((x) => x.bucket === "marked").every((x) => x.at === null), true);
  assert.equal(r.rows.find((x) => x.standing === "grounded").at, "https://example.org/dolphins#12");
  assert.ok(r.rows.every((x) => /^[0-9a-f]{16}$/.test(x.sha)), "rows carry a content hash, not the sentence");
  assert.equal(R.bucketOf("contradicted"), "contradicted");
  assert.equal(R.bucketOf("whatever-new"), "marked", "an untyped standing is the model's own until a record faces it");
});

test("the ledger is a projection of the log: two answers to the same ask, the share falls, counts add up, nothing unclassed", () => {
  const task = "ses_residue_test";
  const a = R.recordResidue({ task, agent: "door", ask: "write an essay on dolphins", claims: CLAIMS_1, now: 1000 });
  assert.equal(a.ok, true, JSON.stringify(a));
  const b = R.recordResidue({ task, agent: "door", ask: "write an essay on dolphins", claims: CLAIMS_2, now: 2000 });
  assert.equal(b.ok, true);
  assert.equal(R.recordResidue({ task, agent: "door", ask: "x", claims: [{ text: "Sources", standing: "heading" }] }).ok, false, "an answer with no sentences writes nothing");
  const l = R.residueLedger({ task });
  assert.equal(l.answers, 2);
  assert.deepEqual(l.total, { sentences: 8, facing: 5, marked: 3, contradicted: 0 });
  assert.equal(l.unclassed, 0);
  assert.equal(l.runs[0].share, 0.5);
  assert.equal(l.runs[1].share, 0.25);
  assert.equal(l.runs[1].fell, true, "the second answer to the same ask has a smaller marked share");
  assert.equal(l.runs[0].fell, null, "the first answer has nothing to fall from");
  assert.equal(l.shrinking, true);
  const all = R.residueAcross({});
  assert.equal(all.tasks, 1);
  assert.equal(all.answers, 2);
  assert.match(R.renderLedger(l), /marked share 38%/);
  assert.match(R.renderLedger(l), /↓ fell/);
});

test("a text grounded twice within minutes is one answer; a longform job's sections project from the grader's verdicts, freeform counted as unjudged", async () => {
  const task = "ses_residue_dup";
  R.recordResidue({ task, agent: "door", ask: "q", claims: CLAIMS_1, now: 5000 });
  R.recordResidue({ task, agent: "door", ask: "q", claims: CLAIMS_1, now: 5000 + 90_000 });
  R.recordResidue({ task, agent: "door", ask: "q", claims: CLAIMS_1, now: 5000 + 20 * 60_000 });
  assert.equal(R.residueLedger({ task }).answers, 2, "the re-ground 90 s later is the same answer; the one 20 min later is a new one");
  const EOT = (await import("./opencode-eot.mjs"));
  const job = "longform-test-abc";
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s1", round: 0, sentences: 4, supported: 1, accepted: false }, now: 1 });
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s1", round: 1, sentences: 4, supported: 3, accepted: true }, now: 2 });
  EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section: "s2", round: 0, sentences: 5, supported: 5, accepted: true, freeform: true }, now: 3 });
  const l = R.longformLedger({ task: job });
  assert.equal(l.answers, 2);
  assert.deepEqual(l.total, { sentences: 9, facing: 3, marked: 6, contradicted: 0 }, "the accepted round stands for s1; the freeform section is wholly the model's own");
  assert.equal(l.freeform, false);
  assert.ok(R.residueAcross({}).ledgers.some((x) => x.task === job && x.kind === "longform"));
});
