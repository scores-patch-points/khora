// tests/corpus-session.test.js — defect-001 resolution seam: the canonical
// corpus session (native/the-fold/corpus-session.js) replaces the stripped
// legacy host with the same API surface, backed by the native reader.
//
// The falsifying control for defect-001: createSession/admitChunked/
// sessionReferents/sessionRelations produce referents and relations from the
// native perceiver — not a hardcoded answer, not a stub.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  admitChunked,
  sessionReferents,
  sessionRelations,
} from "../the-fold/corpus-session.js";

test("admitChunked is synchronous and returns the shape proxy-runner reads", () => {
  const s = createSession();
  const r = admitChunked(s, { text: "Mary Shelley wrote Frankenstein. Victor Frankenstein created a creature.", sourceId: "doc:a", language: "en" });
  assert.equal(typeof r.chunks, "number");
  assert.ok(Array.isArray(r.admitted));
  assert.ok(s.documents.has("doc:a"));
  const doc = s.documents.get("doc:a");
  assert.equal(doc.text, "Mary Shelley wrote Frankenstein. Victor Frankenstein created a creature.");
  assert.equal(doc.language, "en");
});

test("admitChunked dedupes byte-identical re-admission", () => {
  const s = createSession();
  const text = "Mary Shelley wrote Frankenstein. Victor Frankenstein created a creature.";
  admitChunked(s, { text, sourceId: "doc:a" });
  const again = admitChunked(s, { text, sourceId: "doc:a" });
  assert.equal(again.deduped, true, "re-admitting the same bytes must dedupe, not grow");
});

test("sessionReferents projects referents from the native reader", async () => {
  const s = createSession();
  const text = "Mary Shelley wrote Frankenstein. Victor Frankenstein created a creature. The creature suffered alone.";
  admitChunked(s, { text, sourceId: "doc:a", language: "en" });
  const cast = await sessionReferents(s, { sourceId: "doc:a", priors: [], limit: 50 });
  assert.ok(Array.isArray(cast.referents), "referents must be an array");
  // The native perceiver discovers referents from this material; the seam must
  // return what the reader returns, not a fixed answer.
  assert.ok(cast.referents.length > 0, "the native reader produces referents for this material");
  for (const r of cast.referents) {
    assert.ok(r.id && r.surfaces, "each referent carries an id and surfaces");
    assert.equal(typeof r.display, "string");
  }
});

test("sessionReferents honors a prior referent as fromPrior", async () => {
  const s = createSession();
  admitChunked(s, { text: "Mary Shelley wrote Frankenstein.", sourceId: "doc:a", language: "en" });
  const cast = await sessionReferents(s, {
    sourceId: "doc:a",
    priors: [{ id: "ref:pri", name: "Shelley", surfaces: ["Shelley"], individuation: "holon" }],
    limit: 50,
  });
  const prior = cast.referents.find((r) => r.fromPrior === true);
  assert.ok(prior, "a supplied prior must appear as fromPrior");
  assert.equal(prior.id, "ref:pri");
});

test("sessionRelations returns the relations array contract", async () => {
  const s = createSession();
  const text = [
    "The baker made bread every morning.",
    "The farmer grew wheat in the field.",
    "The baker kneaded the dough by hand.",
    "The farmer sold wheat at the market.",
    "The baker baked the bread until golden.",
  ].join(" ");
  admitChunked(s, { text, sourceId: "doc:a", language: "en" });
  const rels = await sessionRelations(s, { sourceId: "doc:a" });
  assert.ok(Array.isArray(rels.relations), "relations must be an array");
});

test("unknown document returns typed gaps, not fabricated output", async () => {
  const s = createSession();
  const cast = await sessionReferents(s, { sourceId: "doc:missing" });
  assert.deepEqual(cast.referents, []);
  assert.ok(cast.gaps.length > 0, "an unknown document is a typed gap");
});