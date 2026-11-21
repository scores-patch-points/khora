import test from "node:test"; import assert from "node:assert/strict";
import { karakaOf, particleKaraka, KARAKA_MAP, CASE_KARAKA, KARAKA_GIVER } from "./karaka-map.mjs";
test("Sanskrit kāraka coverage: all six kārakas are produced", () => {
  const rows = [
    { form: "rāmaḥ", upos: "NOUN", feats: "Case=Nom|Gender=Masc|Number=Sing", deprel: "nsubj" },
    { form: "rāmam", upos: "NOUN", feats: "Case=Acc|Gender=Masc|Number=Sing", deprel: "obj" },
    { form: "rāmeṇa", upos: "NOUN", feats: "Case=Ins|Gender=Masc|Number=Sing", deprel: "obl:instr" },
    { form: "rāmāya", upos: "NOUN", feats: "Case=Dat|Gender=Masc|Number=Sing", deprel: "iobj" },
    { form: "rāmāt", upos: "NOUN", feats: "Case=Abl|Gender=Masc|Number=Sing", deprel: "obl:from" },
    { form: "rāme", upos: "NOUN", feats: "Case=Loc|Gender=Masc|Number=Sing", deprel: "obl:loc" },
  ];
  assert.equal(karakaOf(rows[0]), "kartṛ");
  assert.equal(karakaOf(rows[1]), "karman");
  assert.equal(karakaOf(rows[2]), "karaṇa");
  assert.equal(karakaOf(rows[3]), "sampradāna");
  assert.equal(karakaOf(rows[4]), "apādāna");
  assert.equal(karakaOf(rows[5]), "adhikaraṇa");
});
test("genitive and vocative are NOT kārakas", () => {
  const rows = [
    { form: "rāmasya", upos: "NOUN", feats: "Case=Gen|Gender=Masc|Number=Sing", deprel: "nmod:poss" },
    { form: "rāma", upos: "NOUN", feats: "Case=Voc|Gender=Masc|Number=Sing", deprel: "vocative" },
  ];
  assert.equal(karakaOf(rows[0]), null);
  assert.equal(karakaOf(rows[1]), null);
});
test("function words carry no kāraka", () => {
  const rows = [
    { form: "the", upos: "DET", feats: "_", deprel: "det" },
    { form: "and", upos: "CCONJ", feats: "_", deprel: "cc" },
    { form: "of", upos: "ADP", feats: "_", deprel: "case" },
  ];
  for (const r of rows) assert.equal(karakaOf(r), null);
});
test("Ground particles carry kārakas", () => {
  assert.equal(particleKaraka("把"), "karman");
  assert.equal(particleKaraka("被"), "karman");
  assert.equal(particleKaraka("以"), "karaṇa");
  assert.equal(particleKaraka("在"), "adhikaraṇa");
  assert.equal(particleKaraka("的"), "genitive"); // not a kāraka, a relation
  assert.equal(particleKaraka("xyz"), null);
});
test("the giver is named (Panini)", () => {
  assert.match(KARAKA_GIVER, /Panini/);
  assert.match(KARAKA_GIVER, /Aṣṭādhyāyī/);
});
test("KARAKA_MAP and CASE_KARAKA are frozen", () => {
  assert.ok(Object.isFrozen(KARAKA_MAP));
  assert.ok(Object.isFrozen(CASE_KARAKA));
});
