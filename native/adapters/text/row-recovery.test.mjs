// row-recovery.test.mjs — the wiring: the resolver applied to the read's rows. Pins the end-to-end
// claim on a jumbled sentence's rows: a span the POS prior never saw is recovered through its kāraka
// role (from deprel/case) and confirmed by look/sound. Skips when espeak-ng is absent (the sound cue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRowRecoverer, roleOfRow } from "./row-recovery.js";
import { execFileSync } from "node:child_process";

const hasEspeak = (() => { try { execFileSync("espeak-ng", ["--version"]); return true; } catch { return false; } })();

const FORMS = {
  you: { PRON: 30 }, can: { AUX: 25, VERB: 5 }, still: { ADV: 10, ADJ: 4 },
  read: { VERB: 20, NOUN: 3 }, red: { ADJ: 8, NOUN: 5 }, it: { PRON: 40 },
  without: { ADP: 22 }, problem: { NOUN: 30 },
};

test("roleOfRow: deprel/case name the kāraka, the verb slot is predicate, the grammatical slot is function", () => {
  assert.equal(roleOfRow({ upos: "VERB", deprel: "root" }), "predicate");
  assert.equal(roleOfRow({ upos: "NOUN", feats: "_", deprel: "obl" }), "adhikaraṇa");
  assert.equal(roleOfRow({ upos: "NOUN", feats: "_", deprel: "obj" }), "karman");
  assert.equal(roleOfRow({ upos: "ADP", feats: "_", deprel: "case" }), "function");
  assert.equal(roleOfRow({ upos: "ADV", feats: "_", deprel: "advmod" }), null, "an adverb carries no kāraka");
});

test("a jumbled sentence's rows recover through the read's own parse: slitl/raed/wtiuhot/porbelm", { skip: !hasEspeak }, () => {
  const rows = [
    { i: 0, form: "you", upos: "PRON", feats: "Case=Nom", deprel: "nsubj", head: 3 },
    { i: 1, form: "can", upos: "AUX", feats: "_", deprel: "aux", head: 3 },
    { i: 2, form: "slitl", upos: "ADV", feats: "_", deprel: "advmod", head: 3 },
    { i: 3, form: "raed", upos: "VERB", feats: "_", deprel: "root", head: null },
    { i: 4, form: "it", upos: "PRON", feats: "Case=Acc", deprel: "obj", head: 3 },
    { i: 5, form: "wtiuhot", upos: "ADP", feats: "_", deprel: "case", head: 6 },
    { i: 6, form: "porbelm", upos: "NOUN", feats: "_", deprel: "obl", head: 3 },
  ];
  const rec = makeRowRecoverer({ forms: FORMS });
  const out = rec.recoverRows(rows);

  assert.equal(out[0].recovered, false, "a known form is untouched");
  assert.equal(out[1].recovered, false);

  assert.deepEqual([out[2].form, out[2].recovered, out[2].recoveredFrom], ["still", true, "slitl"]);
  assert.deepEqual([out[3].form, out[3].recovered, out[3].recoveredFrom], ["read", true, "raed"]);
  assert.deepEqual([out[5].form, out[5].recovered, out[5].recoveredFrom], ["without", true, "wtiuhot"]);
  assert.deepEqual([out[6].form, out[6].recovered, out[6].recoveredFrom], ["problem", true, "porbelm"]);

  // the verb slot is what separates "read" from "red": raed is one edit from red and a jumble of read,
  // and the predicate role admits only a verb.
  assert.equal(out[3].recoveredRole, "predicate");
  assert.ok(out[3].dmd.some((s) => s.step === "role:predicate" && s.kept === 1), "the predicate slot cut the candidates to one");
});
