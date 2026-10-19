// read-canonical.test.mjs — PROVE the door openfold/holodeck/heimdall call serves
// the REAL READING PIPELINE, and FALSIFY it: a response without the canonical
// fields (reader · primed · surprise · vocabulary · addressed edges) is not this
// reader, whatever else it carries.
import test from "node:test";
import assert from "node:assert/strict";
import {readCanonical, CANONICAL_READER, READER_SCOPE} from "./read-door-canonical.mjs";

// A text that repeats a being, so the reader's own recurrence floor is met.
const TEXT = "The Federal Reserve raised rates in March. Higher rates made credit expensive for small firms. The Federal Reserve raised rates again in June, and small firms paid more. Suppliers passed the cost to customers, and investors ignored the links between these firms.";

/** The falsifier: what makes a response THIS reader and not the 6.1 host's. */
function isCanonical(out) {
  if (out?.reader !== CANONICAL_READER) return false;
  if (out.primed !== true) return false; // grammarPrior proves the priors loaded
  if (out.surprise?.schema !== "SurpriseCut@1") return false; // the SEG+EVA cut (6.1 never emitted it)
  if (!(out.vocabulary?.grammarPrior === true)) return false;
  if (!Array.isArray(out.relations)) return false;
  for (const r of out.relations) if (!r?.scope || !("refs" in r.scope)) return false; // every edge addressed
  return true;
}

test("the door serves the canonical reader and is provably not the 6.1 host", () => {
  const out = readCanonical(TEXT, {name: "canonical"});
  assert.equal(out.schema, "EORead@1");
  assert.equal(out.reader, CANONICAL_READER);
  assert.equal(out.primed, true, "the priors were loaded (grammarPrior)");
  assert.ok(out.surprise?.schema, "the SEG+EVA cut rides the read");
  assert.equal(isCanonical(out), true);
});

test("FALSIFIER: a 6.1-shaped response (no reader/primed/surprise/addresses) is not this reader", () => {
  const six = {schema: "EORead@1", referents: [{surfaces: ["a"]}], relations: [{participants: [{surface: "a"}, {surface: "b"}], relation: "x"}], language: "en", languageSource: "detected", basis: "6.1 host"};
  assert.equal(isCanonical(six), false, "the old host's shape must fail the check");
  assert.equal(isCanonical({...six, reader: CANONICAL_READER}), false, "a reader label alone is not enough — the cut must ride");
  assert.equal(isCanonical({...six, reader: CANONICAL_READER, primed: true, surprise: {schema: "SurpriseCut@1"}, vocabulary: {grammarPrior: true}}), false, "edges without addresses are not the holograph's");
});

test("every edge carries its address — the holograph's 'every part points at the whole'", () => {
  const out = readCanonical(TEXT, {name: "addressed"});
  for (const r of out.relations) {
    assert.equal(r.participants.length, 2);
    assert.ok(r.scope && "refs" in r.scope, "refs (the address) is present on every edge");
  }
});

test("an undeclared language is unreported, never a silent en; a bad tag is a typed refusal", () => {
  const out = readCanonical(TEXT, {name: "lang"});
  assert.equal(out.language, null);
  assert.equal(out.languageSource, "unreported");
  assert.equal(out.readerScope, READER_SCOPE);
  const declared = readCanonical(TEXT, {name: "lang", language: "es"});
  assert.equal(declared.language, "es");
  assert.equal(declared.languageSource, "declared");
  assert.throws(() => readCanonical(TEXT, {language: "not a tag"}), /unsupported language tag/);
  assert.throws(() => readCanonical(TEXT, {maxCharacters: 0}), /maxCharacters/);
});

test("the cast is the reader's own beings, not every edge-end", () => {
  const out = readCanonical(TEXT, {name: "cast"});
  assert.ok(Array.isArray(out.cast));
  for (const c of out.cast) assert.ok(c.surface, "a cast row is a being with a surface");
  // every cast row names the reader's standing; the door's referents ← the cast
  for (const r of out.referents) assert.ok(Array.isArray(r.surfaces) && r.surfaces.length >= 1);
});

test("a short source is a typed skip, never a silent empty read", () => {
  const out = readCanonical("hi", {name: "tiny"});
  assert.ok(Array.isArray(out.gaps));
  assert.equal(out.error, null);
});
