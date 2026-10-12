// tests/prior-recognizer.test.js — THE RETAINED MIND'S OPERATIVE CONSUMER.
//
// The retained mind (EOReceivedPrior@1) is DATA, not code. These tests pin
// that the sealed mind can still change what the real reader perceives:
// a surface recognizer rides the export (no dropped payload), perception
// interprets it mechanically (whole-word, case- and diacritic-normalized),
// witness still decides admission (nomination is never admission), a
// defeated abstraction withdraws, and a deranged attribution claims the
// wrong point — the entry's kept referent travels, the matcher only finds
// the material's surface.
import { test } from "node:test";
import assert from "node:assert/strict";
import { materialOf, normForm, surfaceMatches, recognizerNominations, PRIOR_RECOGNIZED_REFERENT } from "../kernel/prior-recognizer.js";
import { createRecursiveReader } from "../kernel/reading.js";
import { encounter } from "../kernel/reading.js";
import { createAbstractionRegistry, recordReading, routeReadingOutcome, priorsFromRegistry, sealMind, unsealMind } from "../kernel/hyperlexicon-abstraction.js";

const retained = (entries) => Object.freeze({ schema: "EOReceivedPrior@1", entries: Object.freeze(entries.map(Object.freeze)) });

const ART1 = "All human beings are born free and equal in dignity and rights.";

test("materialOf is a typed gap: absent material is null, the declared channels resolve", () => {
  assert.equal(materialOf({ id: "x" }), null);
  assert.equal(materialOf({ material: {} }), null);
  assert.equal(materialOf({ material: { text: ART1 } }), ART1);
  assert.equal(materialOf({ text: ART1 }), ART1);
  assert.equal(materialOf({ content: { text: ART1 } }), ART1);
  assert.equal(materialOf(null), null);
});

test("surface matches are whole-word, normalized, and keep offsets true to the raw text", () => {
  const text = "Dignité and the RIGHTS of all: act, action, inaction.";
  const hits = surfaceMatches(text, ["dignite", "rights", "act"]);
  const forms = hits.map((h) => `${h.form}@${h.start}-${h.end}`);
  assert.ok(forms.includes("dignite@0-7"), `accented form matched: ${forms.join(" | ")}`);
  assert.ok(forms.includes("rights@16-22"), `case-insensitive: ${forms.join(" | ")}`);
  assert.ok(forms.includes("act@31-34"), `whole word act: ${forms.join(" | ")}`);
  assert.equal(hits.filter((h) => h.form === "act").length, 1, "action/inaction are not act");
  for (const h of hits) {
    assert.equal(normForm(h.quote), normForm(h.form), "quote normalizes to the form");
    assert.equal(h.quote, text.slice(h.start, h.end), "offsets are true to the raw text");
  }
});

test("a retained entry with a surface recognizer nominates, anchored, with evidence and a graph entry", () => {
  const prior = retained([{ referent: "udhr::r-rights", standing: "earned", terrain: "Kind", basis: "measured", recognizer: { mode: "surface", forms: ["rights"] } }]);
  const enc = Object.freeze({ id: "c1", anchor: "c1", material: { text: ART1 } });
  const out = recognizerNominations(prior, enc, {});
  assert.equal(out.length, 1);
  const cand = out[0];
  assert.equal(cand.schema, "PerceptCandidate@1");
  assert.equal(cand.anchor, "c1");
  assert.equal(cand.evidence.schema, "EORecognizedSurface@1");
  assert.equal(cand.evidence.quote, "rights");
  assert.deepEqual([...cand.nominationCause], ["received_prior", "recognized_surface"]);
  assert.equal(cand.candidate.distinctions[0].referent, "udhr::r-rights");
  assert.equal(cand.graphEntries[0].schema, PRIOR_RECOGNIZED_REFERENT);
});

test("an entry without a recognizer never nominates", () => {
  const prior = retained([{ referent: "r", standing: "earned", terrain: "Kind", basis: "measured" }]);
  assert.equal(recognizerNominations(prior, Object.freeze({ id: "c1", anchor: "c1", material: { text: ART1 } }), {}).length, 0);
});

test("the recognizer payload rides the export: earned rows carry it, candidates and defeats do not export", () => {
  let reg = recordReading(createAbstractionRegistry(), {
    id: "reading:t1",
    cells: [{
      op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:t1",
      memberRefs: ["udhr::r-dignity", "udhr::r-rights"],
      witnesses: ["test-seam"],
      recognizer: { mode: "surface", surfaces: { "udhr::r-dignity": ["dignity"], "udhr::r-rights": ["rights"] } },
    }],
  });
  const candidateOnly = priorsFromRegistry(reg);
  assert.equal(candidateOnly.entries.length, 0, "candidate rows shape nothing");
  const earned = routeReadingOutcome(reg, { id: "abs:t1", heldOut: { method: "held_out_future", success: true, effect: 0.12, pValue: 0.002 } });
  const prior = priorsFromRegistry(earned.registry);
  assert.equal(prior.entries.length, 2);
  for (const entry of prior.entries) {
    assert.equal(entry.recognizer.mode, "surface", "the recognizer payload was not dropped");
    assert.ok(entry.recognizer.forms.length === 1);
  }
  const defeated = routeReadingOutcome(earned.registry, { id: "abs:t1", heldOut: { method: "held_out_shuffled", success: false, effect: -0.03 } });
  assert.equal(priorsFromRegistry(defeated.registry).entries.length, 0, "a defeat withdraws the mind");
});

test("the sealed mind keeps the recognizer: a JSON body round-trips the working structure", () => {
  let reg = recordReading(createAbstractionRegistry(), {
    id: "reading:seal",
    cells: [{
      op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:seal",
      memberRefs: ["udhr::r-rights"],
      witnesses: ["test-seam"],
      recognizer: { mode: "surface", surfaces: { "udhr::r-rights": ["rights"] } },
    }],
  });
  reg = routeReadingOutcome(reg, { id: "abs:seal", heldOut: { method: "held_out_future", success: true, effect: 0.1 } }).registry;
  const sealed = sealMind(reg, { giver: "test" });
  const restored = unsealMind(sealed);
  assert.equal(restored.ok, true);
  assert.ok(JSON.parse(sealed.body).prior.entries[0].recognizer, "the recognizer survives JSON serialization");
  assert.equal(restored.prior.entries[0].recognizer.forms[0], "rights");
});

test("the real reader with the retained mind admits the referents; empty and defeated minds perceive nothing", async () => {
  let reg = recordReading(createAbstractionRegistry(), {
    id: "reading:real",
    cells: [{
      op: "SIG", grain: "Pattern", terrain: "Kind", id: "abs:real",
      memberRefs: ["udhr::r-dignity", "udhr::r-rights"],
      witnesses: ["udhr-eng-seam"],
      recognizer: { mode: "surface", surfaces: { "udhr::r-dignity": ["dignity"], "udhr::r-rights": ["rights"] } },
    }],
  });
  reg = routeReadingOutcome(reg, { id: "abs:real", heldOut: { method: "held_out_future", success: true, effect: 0.11, pValue: 0.002 } }).registry;
  const mind = priorsFromRegistry(reg);

  const reader = createRecursiveReader({ priors: [mind] });
  const turn = await reader.step(encounter({ id: "c1", anchor: "c1", source: "udhr-eng", material: { text: ART1 } }));
  const refs = turn.observations.map((o) => o.distinctions[0]?.referent).sort();
  assert.deepEqual(refs, ["udhr::r-dignity", "udhr::r-rights"], "the retained mind changed what the reader perceived");
  for (const o of turn.observations) {
    assert.ok(o.provenance.nominationCause.includes("received_prior"));
    assert.equal(o.provenance.source, "udhr-eng");
  }
  const foldEntries = reader.getFold().graphEntries ?? [];
  assert.equal(foldEntries.filter((e) => e.schema === PRIOR_RECOGNIZED_REFERENT).length, 2, "the fold distinguishes the recognized referents");

  const blank = createRecursiveReader();
  const blankTurn = await blank.step(encounter({ id: "c1", anchor: "c1", source: "udhr-eng", material: { text: ART1 } }));
  assert.equal(blankTurn.observations.length, 0, "no mind, no distinction");

  const defeated = routeReadingOutcome(reg, { id: "abs:real", heldOut: { method: "held_out_shuffled", success: false, effect: -0.02 } });
  const emptied = createRecursiveReader({ priors: [priorsFromRegistry(defeated.registry)] });
  const emptyTurn = await emptied.step(encounter({ id: "c1", anchor: "c1", source: "udhr-eng", material: { text: ART1 } }));
  assert.equal(emptyTurn.observations.length, 0, "a defeated abstraction withdraws its support");
});

test("a deranged attribution claims the wrong point: the retained referent travels, the matcher only finds the surface", () => {
  const prior = retained([{ referent: "udhr::r-freedom", standing: "earned", terrain: "Kind", basis: "measured", recognizer: { mode: "surface", forms: ["rights"] } }]);
  const enc = Object.freeze({ id: "c1", anchor: "c1", material: { text: ART1 } });
  const out = recognizerNominations(prior, enc, {});
  assert.equal(out.length, 1);
  assert.equal(out[0].candidate.distinctions[0].referent, "udhr::r-freedom", "the surface is evidence, the point is the retained entry's");
});