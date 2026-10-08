// native/tests/reading-rules.test.js — the reading-rule NUMBERS are RECEIVED,
// not codified: their one home is janus/priors/reading-rules.json (Relate's),
// and khora reads them as data. An absent file leaves the reader BARE — a
// typed gap on the record, never a khora-invented number. Exercises both
// states: the loaded read (identity with the values the stack always used)
// and the bare read (the gate refuses; the share gate applies no floor).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadReadingRules, resetReadingRules } from "../kernel/reading-rules.js";

const KHORA = fileURLToPath(new URL("../../", import.meta.url)); // native/tests → khora root
const runScript = (body) =>
  execFileSync(process.execPath, ["--input-type=module", "-e", body], { encoding: "utf8" }).trim().split("\n").at(-1);

test("the reading rules arrive as DATA from janus (one home), not as khora constants", () => {
  const r = loadReadingRules();
  assert.equal(r.schema, "ReadingRules@1");
  assert.match(r.source, /janus[\\/]priors[\\/]reading-rules\.json$/);
  assert.equal(r.gap, null);
  assert.equal(r.rules.surprise.order, 3);
  assert.equal(r.rules.surprise.draws, 20);
  assert.equal(r.rules.grammarMinShare, 0.5);
  assert.equal(r.rules.canonicalizationFloor, 2);
  assert.equal(r.rules.minRelationSurfaces, 2);
  assert.equal(r.rules.segmentLevel, 0.05);
});

test("an absent rules file is a typed gap — the khora is bare, never a guessed number", () => {
  process.env.ER7_READING_RULES_FILE = "/nonexistent/reading-rules.json";
  resetReadingRules();
  const r = loadReadingRules();
  assert.equal(r.rules, null);
  assert.equal(r.gap.refused, "absent");
  delete process.env.ER7_READING_RULES_FILE;
  resetReadingRules();
  assert.equal(loadReadingRules().gap, null);
});

test("with the rule absent, the surprise gate REFUSES (no_reading_rule) — it does not invent a cut", () => {
  const out = runScript(`
    process.env.ER7_READING_RULES_FILE = "/nonexistent/reading-rules.json";
    const { surpriseCut } = await import(${JSON.stringify(new URL("../the-fold/surprise-gate.mjs", import.meta.url).href)});
    const s = surpriseCut(["a", "b", "c", "d", "e", "f", "g"]);
    console.log(JSON.stringify({ schema: s.schema, refused: s.refused, figures: s.figures }));
  `);
  const s = JSON.parse(out);
  assert.equal(s.schema, "SurpriseCut@1");
  assert.equal(s.refused, "no_reading_rule");
  assert.equal(s.figures, 0);
});

test("with the rule absent, the share gate is BARE: no floor is applied, every share passes", () => {
  const out = runScript(`
    process.env.ER7_READING_RULES_FILE = "/nonexistent/reading-rules.json";
    const { GRAMMAR_MIN_SHARE, grammarIsDominant } = await import(${JSON.stringify(new URL("../adapters/text/grain-typing.js", import.meta.url).href)});
    console.log(JSON.stringify({ share: GRAMMAR_MIN_SHARE, low: grammarIsDominant(0.01), high: grammarIsDominant(0.9) }));
  `);
  const s = JSON.parse(out);
  assert.equal(s.share, null);
  assert.equal(s.low, true);
  assert.equal(s.high, true);
});