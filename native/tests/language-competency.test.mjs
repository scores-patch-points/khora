// The per-language competency profile on every read (adapters/text/language-competency.js).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { competencyOf, ENGLISH_EVALUATION, ENGLISH_GUESS, GIVER, giverScoreOf } from "../adapters/text/language-competency.js"; import { readToWeft } from "../the-fold/read-process.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."); const B2 = JSON.parse(fs.readFileSync(path.join(ROOT, "eval/reading-baseline/BASELINE.json"), "utf8")).metrics.english_pronoun_binding.always_answering_guess; const B = JSON.parse(fs.readFileSync(path.join(ROOT, "eval/reading-baseline/BASELINE.json"), "utf8")).metrics.english_pronoun_binding.with_name_ruling.with_ruling_soft_in_canonical_read;
test("English: reading with pronouns, and its recorded evaluation is the baseline's", () => { const c = competencyOf("eng"); assert.equal(c.tier, "reading+pronouns"); assert.equal(c.pronouns.precision, ENGLISH_EVALUATION.precision); assert.equal(B.precision, ENGLISH_EVALUATION.precision); assert.equal(B.coverage, ENGLISH_EVALUATION.coverage); });
test("Greek and Sanskrit: the case-marked seam reads their clauses; Sanskrit's recorded precision is gold-free and says so", () => {
  const g = competencyOf("grc"), s = competencyOf("san"); assert.match(g.clauseReader, /case-marked/); assert.match(s.clauseReader, /case-marked/); assert.equal(g.pronouns.gold, true); assert.equal(s.pronouns.gold, false); assert.ok(s.next.some((n) => /gold coreference/.test(n)));
});
test("a language with no prior is bare and says what is missing; one with only a POS prior is lexical", () => { const b = competencyOf("zzz"); assert.equal(b.tier, "bare"); assert.ok(b.next.some((n) => /pos-zzz/.test(n))); const f = competencyOf("deu"); if (f.pieces.pos) { assert.equal(f.tier, "lexical"); assert.match(f.clauseReader, /unvalidated/); } });
test("the profile rides the entry of a read and is deterministic and frozen", () => { const w = readToWeft("Bert walked into the room and he sat down. ".repeat(20), { language: "eng", address: "t:c" }); assert.equal(w.competency.stem, "eng"); assert.equal(JSON.stringify(w.competency), JSON.stringify(competencyOf("eng"))); assert.ok(Object.isFrozen(w.competency)); });

import { COMPETENCY_BAR } from "../adapters/text/language-competency.js";
test("the bar is the user's 94%: competence is right / answerable on gold; no language meets it today, and a gold-free figure cannot count", () => {
  assert.equal(COMPETENCY_BAR, 0.94); const e = competencyOf("eng"), g = competencyOf("grc"), s = competencyOf("san");
  assert.equal(e.competence.pronounMeasure.accuracy, ENGLISH_GUESS.resolvedCorrectly); assert.equal(B2.pooled_resolved, ENGLISH_GUESS.resolvedCorrectly); assert.equal(e.competence.giver, giverScoreOf("eng")); assert.ok(e.competence.giver > 0.25 && e.competence.giver < 0.3); assert.equal(e.competence.competent, false); assert.ok(e.competence.gap > 0.6); assert.notEqual(e.tier, "competent");
  assert.equal(g.competence.competent, false); assert.equal(s.competence.pronounMeasure.gold, false); assert.equal(s.competence.competent, false); assert.ok(e.next.some((n) => /94 bar/.test(n)));
});
test("French now binds: the register ships with its measured evaluation (CorefUD French-Democrat), the profile pools nothing and states the distance to the bar", async () => {
  const f = competencyOf("fra"); assert.equal(f.tier, "pronouns"); assert.equal(f.pronouns.status, "bound"); assert.equal(f.pronouns.gold, true); assert.equal(f.pronouns.precision, 0.547); assert.equal(f.competence.competent, false); assert.ok(f.competence.gap > 0.7); assert.equal(f.competence.giver, 0.1441);
  const w = readToWeft("Marie entra dans la maison et elle ferma la porte. Pierre regarda Marie et il sourit. ".repeat(12), { language: "fra", address: "t:fr" }); assert.ok(Array.isArray(w.pronounsPresence)); assert.ok(!w.gaps.some((g) => g.gap === "pronoun_presence_unmeasured" || g.gap === "pronoun_presence_no_register"));
  assert.equal(competencyOf("grc").competence.pronounMeasure.accuracy, +((359 + 193) / (1181 + 809)).toFixed(3)); assert.equal(competencyOf("grc").competence.giver, 0.0995); assert.equal(competencyOf("san").competence.giver, null);
});

test("English answers every pronoun it finds (pronounsGuess), marks each confident or contested, and leaves pronounsPresence alone; other languages carry none", () => {
  const T = "Bert walked into the room and he sat down. Mary met Bert at the station, and she smiled as he arrived. ".repeat(12); const w = readToWeft(T, { language: "eng", address: "t:g" }); assert.ok(w.pronounsGuess.length >= w.pronounsPresence.length); assert.ok(w.pronounsGuess.every((g) => typeof g.confident === "boolean" && g.ref && g.at[0] < g.at[1]));
  const off = readToWeft(T, { language: "eng", address: "t:g", readerOptions: { pronounGuess: null } }); assert.equal(off.pronounsGuess, undefined); assert.equal(JSON.stringify(off.pronounsPresence), JSON.stringify(w.pronounsPresence), "the confident bindings do not move");
  assert.equal(readToWeft("Le roi marcha dans la forêt et il vit la reine. ".repeat(20), { language: "fra", address: "t:f" }).pronounsGuess, undefined);
});
