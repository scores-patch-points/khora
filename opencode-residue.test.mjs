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

test("the series: two same-config runs set the rerun band and name no change; a third outside it is a change; a freeform run is never a delta against a grounded one", async () => {
  const EOT = (await import("./opencode-eot.mjs"));
  const sec = (job, section, sentences, supported, now, extra = {}) => EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "longform-section", section, round: 0, sentences, supported, accepted: true, ...extra }, now });
  const tree = (job, gaps, now, depth = 2) => EOT.append({ task: job, agent: "longform", stage: "reason", detail: { kind: "stitch-tree", tree: { id: "root", level: 0, children: depth > 1 ? [{ id: "s1", level: 1, children: depth > 2 ? [{ id: "s1.g1", level: 2, children: [] }] : [] }] : [] }, gaps }, now });
  // piece "owls": grounded, layers=2 — run 1 at 50%, run 2 at 40% (the band is 10 pts), run 3 at 45% (inside), run 4 at 10% (outside: a change)
  sec("longform-owls-aaaaaaaa", "s1", 10, 5, 10_000); tree("longform-owls-aaaaaaaa", [{ slot: "s1.g1" }], 10_000);
  sec("longform-owls-bbbbbbbb", "s1", 10, 6, 20_000); tree("longform-owls-bbbbbbbb", [], 20_000);
  sec("longform-owls-cccccccc", "s1", 20, 11, 30_000); tree("longform-owls-cccccccc", [{ slot: "a" }, { slot: "b" }], 30_000);
  sec("longform-owls-dddddddd", "s1", 10, 9, 40_000); tree("longform-owls-dddddddd", [], 40_000);
  // a freeform owls run between: 100% marked, its own config, never a delta against the grounded ones
  sec("longform-owls-eeeeeeee", "s1", 8, 8, 25_000, { freeform: true });
  const s = R.residueSeries({});
  const owls = s.pieces.find((p) => p.piece === "owls");
  assert.ok(owls, "the piece is the job id's slug");
  assert.deepEqual(owls.runs.map((r) => r.job.slice(-8)), ["aaaaaaaa", "bbbbbbbb", "eeeeeeee", "cccccccc", "dddddddd"], "runs in time order");
  const [a, b, e, c, d] = owls.runs;
  assert.equal(a.change, null, "the first run has nothing to differ from");
  assert.equal(b.change, false); assert.ok(Math.abs(b.delta - -0.1) < 1e-9, "the second same-config run's Δ is the band, not a change");
  assert.equal(e.configKey, "freeform"); assert.equal(e.delta, null, "a freeform run is another config: no delta");
  assert.equal(c.change, false, "5 pts inside a 10 pt band: no change named");
  assert.equal(d.change, true, "35 pts outside the band: a change"); assert.ok(Math.abs(d.delta - -0.35) < 1e-9);
  assert.ok(Math.abs(owls.bands["grounded/layers=2"] - 0.1) < 1e-9, "a named change does not widen the band");
  assert.deepEqual(owls.runs.map((r) => r.gaps), [1, 0, null, 2, 0], "gaps come from the stitch-tree event; no tree, no number");
  assert.ok(owls.runs.every((r) => r.contests === null), "no contest event recorded: contests are null, never guessed");
  assert.equal(owls.changes.length, 1);
  assert.ok(s.daily.length >= 1 && s.daily.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.day) && (x.share == null || (x.share >= 0 && x.share <= 1))));
  assert.match(R.renderSeries(s), /owls · 5 run\(s\)/);
  assert.match(R.renderSeries(s), /CHANGE \(outside band\)/);
});
