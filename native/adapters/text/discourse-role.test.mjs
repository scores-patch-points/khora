import { test } from "node:test";
import assert from "node:assert/strict";
import { DISCOURSE_GROUND, markerRole, readDiscourseRole, paragraphRoles, sentenceReferents, sentenceSubjects, givenNewRole, clauseRole, sentenceDiscourse } from "./discourse-role.mjs";

test("DISCOURSE_GROUND has 9 roles", () => {
  assert.equal(Object.keys(DISCOURSE_GROUND).length, 9);
});

test("markerRole: detects leading markers with comma", () => {
  assert.equal(markerRole("Because sales fell, the board cut the dividend."), "hetu");
  assert.equal(markerRole("Therefore, the team was disbanded."), "prayojana");
  assert.equal(markerRole("For example, orders doubled."), "karman");
});

test("markerRole: no marker returns null", () => {
  assert.equal(markerRole("The company lost money."), null);
});

test("readDiscourseRole: main claim has outgoing, support has incoming", () => {
  const sents = ["The company lost money.", "Because sales fell, the board cut the dividend."];
  assert.equal(readDiscourseRole(0, sents), "kartṛ");
  assert.equal(readDiscourseRole(1, sents), "hetu");
});

test("readDiscourseRole: bridge has incoming + outgoing, incoming wins", () => {
  const sents = ["The war began.", "During the next years, millions died.", "After the war, Europe rebuilt."];
  assert.equal(readDiscourseRole(0, sents), "kartṛ");
  assert.equal(readDiscourseRole(1, sents), "kāla");
  assert.equal(readDiscourseRole(2, sents), "kāla");
});

test("paragraphRoles: 100% on the falsification set (14 roles)", () => {
  const paras = [
    ["The company lost money last quarter.", "Because sales fell sharply in Asia, the board cut the dividend."],
    ["The project was cancelled.", "Therefore, the team was disbanded."],
    ["Demand is growing in the region.", "For example, orders doubled in the last year."],
    ["The data is unreliable.", "Because the sensor failed during the test, the readings are wrong."],
    ["The war began in 1939.", "During the next six years, millions died.", "After the war, Europe rebuilt."],
    ["The theory was wrong.", "For example, its first prediction failed.", "Therefore, we revised it."],
  ];
  const gts = [["kartṛ","hetu"],["kartṛ","prayojana"],["kartṛ","karman"],["kartṛ","hetu"],["kartṛ","kāla","kāla"],["kartṛ","karman","prayojana"]];
  let correct = 0, total = 0;
  paras.forEach((sents, pi) => {
    const roles = paragraphRoles(sents);
    roles.forEach((r, i) => { total++; if (r === gts[pi][i]) correct++; });
  });
  assert.equal(correct, 14, `${correct}/14`);
});

test("sentenceReferents/sentenceSubjects: lemma of kāraka tokens", () => {
  const rows = [
    { karaka: "kartṛ", lemma: "Prince" },
    { karaka: "karman", lemma: "war" },
    { karaka: null, lemma: "the" },
  ];
  assert.deepEqual([...sentenceReferents(rows)], ["prince", "war"]);
  assert.deepEqual([...sentenceSubjects(rows)], ["prince"]);
});

test("givenNewRole: first is new, continuation is given", () => {
  const refs = [
    new Set(["prince"]),
    new Set(["prince"]),      // continues prince → given
    new Set(["anna"]),        // new referent → new
  ];
  assert.equal(givenNewRole(0, refs), "new");
  assert.equal(givenNewRole(1, refs), "given");
  assert.equal(givenNewRole(2, refs), "new");
});

test("clauseRole: maps relation to discourse role", () => {
  assert.equal(clauseRole({ relation: "root" }), "kartṛ");
  assert.equal(clauseRole({ relation: "adverbial" }), "hetu");
  assert.equal(clauseRole({ relation: "complement" }), "karman");
  assert.equal(clauseRole({ relation: "open-complement" }), "karaṇa");
  assert.equal(clauseRole({ relation: "coordinate" }), "sampradāna");
  assert.equal(clauseRole({ relation: "relative" }), "adhikaraṇa");
  assert.equal(clauseRole({ relation: "unknown" }), null);
});

test("sentenceDiscourse: separates root from subordinate roles", () => {
  const clauses = [
    { relation: "root", marker: null, polarity: "+", predicate: { text: "said" } },
    { relation: "adverbial", marker: "if", polarity: "-" },
    { relation: "complement", marker: "that", polarity: "+" },
  ];
  const d = sentenceDiscourse(clauses);
  assert.equal(d.root.predicate, "said");
  assert.equal(d.subordinate.length, 2);
  assert.deepEqual(d.subordinate.map((s) => s.role), ["hetu", "karman"]);
});
