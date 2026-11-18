// The per-language competency profile on every read (adapters/text/language-competency.js).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { competencyOf, ENGLISH_EVALUATION } from "../adapters/text/language-competency.js"; import { readToWeft } from "../the-fold/read-process.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."); const B = JSON.parse(fs.readFileSync(path.join(ROOT, "eval/reading-baseline/BASELINE.json"), "utf8")).metrics.english_pronoun_binding.with_name_ruling.with_ruling_soft_in_canonical_read;
test("English: reading with pronouns, and its recorded evaluation is the baseline's", () => { const c = competencyOf("eng"); assert.equal(c.tier, "reading+pronouns"); assert.equal(c.pronouns.precision, ENGLISH_EVALUATION.precision); assert.equal(B.precision, ENGLISH_EVALUATION.precision); assert.equal(B.coverage, ENGLISH_EVALUATION.coverage); });
test("Greek and Sanskrit: the case-marked seam reads their clauses; Sanskrit's recorded precision is gold-free and says so", () => {
  const g = competencyOf("grc"), s = competencyOf("san"); assert.match(g.clauseReader, /case-marked/); assert.match(s.clauseReader, /case-marked/); assert.equal(g.pronouns.gold, true); assert.equal(s.pronouns.gold, false); assert.ok(s.next.some((n) => /gold coreference/.test(n)));
});
test("a language with no prior is bare and says what is missing; one with only a POS prior is lexical", () => { const b = competencyOf("zzz"); assert.equal(b.tier, "bare"); assert.ok(b.next.some((n) => /pos-zzz/.test(n))); const f = competencyOf("deu"); if (f.pieces.pos) { assert.equal(f.tier, "lexical"); assert.match(f.clauseReader, /unvalidated/); } });
test("the profile rides the entry of a read and is deterministic and frozen", () => { const w = readToWeft("Bert walked into the room and he sat down. ".repeat(20), { language: "eng", address: "t:c" }); assert.equal(w.competency.stem, "eng"); assert.equal(JSON.stringify(w.competency), JSON.stringify(competencyOf("eng"))); assert.ok(Object.isFrozen(w.competency)); });

import { COMPETENCY_BAR } from "../adapters/text/language-competency.js";
test("the bar is the user's 94%: competence is right / answerable on gold; no language meets it today, and a gold-free figure cannot count", () => {
  assert.equal(COMPETENCY_BAR, 0.94); const e = competencyOf("eng"), g = competencyOf("grc"), s = competencyOf("san");
  assert.equal(e.competence.accuracy, +(ENGLISH_EVALUATION.precision * ENGLISH_EVALUATION.coverage).toFixed(3)); assert.equal(e.competence.competent, false); assert.ok(e.competence.gap > 0.3); assert.notEqual(e.tier, "competent");
  assert.equal(g.competence.competent, false); assert.equal(s.competence.gold, false); assert.equal(s.competence.competent, false); assert.ok(e.next.some((n) => /94% bar/.test(n)));
});
test("French now binds: the register ships with its measured evaluation (CorefUD French-Democrat), the profile pools nothing and states the distance to the bar", async () => {
  const f = competencyOf("fra"); assert.equal(f.tier, "pronouns"); assert.equal(f.pronouns.status, "bound"); assert.equal(f.pronouns.gold, true); assert.equal(f.pronouns.precision, 0.547); assert.equal(f.competence.competent, false); assert.ok(f.competence.gap > 0.7);
  const w = readToWeft("Marie entra dans la maison et elle ferma la porte. Pierre regarda Marie et il sourit. ".repeat(12), { language: "fra", address: "t:fr" }); assert.ok(Array.isArray(w.pronounsPresence)); assert.ok(!w.gaps.some((g) => g.gap === "pronoun_presence_unmeasured" || g.gap === "pronoun_presence_no_register"));
  assert.equal(competencyOf("grc").competence.accuracy, +((359 + 193) / (1181 + 809)).toFixed(3));
});
