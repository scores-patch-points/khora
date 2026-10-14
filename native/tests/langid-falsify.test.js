// native/tests/langid-falsify.test.js — the language detector ported into khora (native/the-fold/langid.mjs),
// wired into language-grammar.detectLanguage. These are the fold's regression cases, pre-registered 2026-10-07
// (eval/langid/UDHR-FALSIFY-* in the the-fold repo): short bare asks in Cyrillic (rus/ukr/bul), the Spanish
// inverted-mark evidence, the declarative-clue flips, English never detected, determinism, and typed gaps.
import test from "node:test";
import assert from "node:assert/strict";
import { detectLanguage, detectLanguageByAttestation } from "../the-fold/language-grammar.js";
import { sentenceLanguages, availableStems, PINNED_STEMS } from "../the-fold/langid.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("short Cyrillic asks are rus/ukr/bul, not 'bul for everything'", () => {
  assert.equal(detectLanguage("Кто президент?").language, "rus");
  assert.equal(detectLanguage("Хто президент?").language, "ukr");
  assert.equal(detectLanguage("Кой е президентът?").language, "bul");
  assert.equal(detectLanguage("Что случилось?").language, "rus");
});

test("a bare Spanish ask keeps its language (¿¡ IS evidence) even for '¿Y él?'", () => {
  assert.equal(detectLanguage("¿Y él?").language, "spa");
  assert.equal(detectLanguage("¿Dónde nació?").language, "spa");
});

test("a decisive own word flips without history; English is detected (the reader reads it); nonsense stays a gap", () => {
  assert.equal(detectLanguage("Wer ist der Präsident?").language, "deu");
  assert.equal(detectLanguage("Pourquoi est-ce arrivé ?").language, "fra");
  assert.equal(detectLanguage("show me a cookie recipe").language, "eng");
  assert.equal(detectLanguage("qwerty zxcvbn plok").language, null);
});

test("deterministic and fast: the same text names the same language twice", () => {
  const t = "Мария встретила Ивана в Москве, и они пошли на рынок.";
  assert.equal(detectLanguage(t).language, detectLanguage(t).language);
  assert.equal(detectLanguage(t).language, "rus");
});

test("the old attestation detector still exists, for comparison", () => {
  const d = detectLanguageByAttestation("Мария встретила Ивана в Москве, и они пошли на рынок.");
  assert.ok(d.language === "rus" || d.language === null, "old detector: " + d.language);
});

test("per-sentence detection switches language mid-sentence (rus → arb → deu), no whole-text assumption", () => {
  const rows = sentenceLanguages("Мария встретила Ивана в Москве, и они пошли на рынок. التقت ماريا بجون في القاهرة في اليوم التالي. Das war ein langer Tag.");
  assert.deepEqual(rows.map((r) => r.language), ["rus", "arb", "deu"]);
});
test("the candidate set is PINNED: a new prior in the priors directory does not change what the detector can say", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "langid-pin-"));
  for (const f of ["pos-rus.json", "pos-deu.json", "pos-xyz.json", "pos-abc.json", "pos-en.json", "pos-prior-spa.json", "pos-spa-unimorph.json"]) fs.writeFileSync(path.join(dir, f), "{}");
  const pin = new Set(["rus", "deu", "spa"]);
  assert.deepEqual(availableStems({ dir, pin }), ["deu", "rus"], "unpinned stems (xyz, abc) are not candidates; en, backoffs and unimorph never are");
  assert.deepEqual(availableStems({ dir, pin: null }), ["abc", "deu", "rus", "xyz"], "no pin file = the old behaviour");
  assert.deepEqual(availableStems({ dir: path.join(dir, "missing"), pin }), [], "a missing home is no stems");
});

test("every pinned stem still has its prior (a deleted prior must not silently shrink the detector)", () => {
  assert.ok(Array.isArray(PINNED_STEMS) && PINNED_STEMS.length > 20, "the pin file is present and non-trivial");
  const here = new Set(availableStems({ pin: null }));
  if (here.size === 0) return;                         // no priors home in this checkout: the pin cannot be compared
  const missing = PINNED_STEMS.filter((s) => !here.has(s));
  assert.deepEqual(missing, [], "pinned stems with no prior on disk: " + missing.join(","));
});
