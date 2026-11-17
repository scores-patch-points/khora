// A reading change cannot land silently: the reading-critical files must hash to what eval/reading-baseline/BASELINE.json recorded.
// When this fails you changed the reading. Measure it (identity/novels gum-falsify3.mjs on GUM slices E, C, D, F, or eval/referents/pronoun-golden.mjs), update BASELINE.json's metrics if the numbers moved, then
//   node eval/reading-baseline/record.mjs --note "what changed and what the numbers did"
// and commit both. A drop in precision or coverage at the same code is a regression: do not re-record it, fix it.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { READING_FILES, sha } from "../../eval/reading-baseline/record.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."); const B = JSON.parse(fs.readFileSync(path.join(ROOT, "eval/reading-baseline/BASELINE.json"), "utf8"));
test("every reading-critical file is the one the baseline was recorded with", () => {
  const changed = READING_FILES.filter((f) => B.files[f] !== sha(f));
  assert.deepEqual(changed, [], `the reading changed (${changed.join(", ")}) without eval/reading-baseline being re-recorded: measure it, then run: node eval/reading-baseline/record.mjs --note "..."`);
});
test("the baseline records what it was measured at, and every change has a note", () => {
  const p = B.metrics.english_pronoun_binding.pooled; assert.ok(p.documents >= 100 && p.precision > 0.5 && p.precision < 1 && p.answerable > 1000);
  const w = B.metrics.english_pronoun_binding.why_wrong; assert.ok(w.shareOfErrorsNonPersonal > 0.5, "the diagnosis the guards rest on");
  assert.ok(B.recorded && Object.keys(B.files).length === READING_FILES.length); assert.match(fs.readFileSync(path.join(ROOT, "eval/reading-baseline/CHANGES.md"), "utf8"), /## \d{4}-\d{2}-\d{2}:/);
});
test("the language registers that bind carry an evaluation (no unmeasured binding ships)", async () => {
  const reg = path.join(ROOT, "native/adapters/text/pronoun-registers"); const { presenceOptionsFor, clearRegisterCache } = await import("../adapters/text/pronoun-registers.js"); clearRegisterCache();
  for (const f of fs.readdirSync(reg).filter((x) => x.endsWith(".json"))) { const stem = f.slice(0, -5); const o = presenceOptionsFor(stem); const j = JSON.parse(fs.readFileSync(path.join(reg, f), "utf8")); if (o.pronounClass) assert.ok(j.evaluation && j.evaluation.resultsFile && fs.existsSync(path.join(ROOT, j.evaluation.resultsFile)), `${stem} binds but its evaluation file is missing`); else assert.equal(o.gap.gap, "pronoun_presence_unmeasured"); }
});
