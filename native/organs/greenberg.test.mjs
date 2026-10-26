// greenberg.test.mjs — the witness for the Isthmus shapes (5, 6), written
// violation-first (CODING-LESSONS 70): each defect that actually shipped is
// a case that must be FOUND, each licensed or neutral form a control that
// must stay QUIET. Plus pins on the four original shapes, whose test file
// did not survive the move out of eoreader7.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanSource,
  scanEnglishCodecDefault,
  scanEnglishWordPattern,
  scanSilentEnglishDefault,
  scanCapitalizationUnguarded,
  scanLatinPunctuationOnly,
  scanSvoFieldLeak,
  summarize,
} from "./greenberg.js";

const here = dirname(fileURLToPath(import.meta.url));
const forms = (fs) => fs.map((f) => f.form);

// ── Shape 5: english_codec_default ─────────────────────────────────────────

test("finds the meaning stage's default: readAtoms({ lang = \"en\" })", () => {
  const src = `export function readAtoms({ text, lang = "en", title = null }) {`;
  assert.deepEqual(forms(scanEnglishCodecDefault(src, "read-atoms.js")), ["param_default"]);
});

test("finds a language parameter defaulted to eng", () => {
  const src = `export function priorsFor(language = "eng") {`;
  assert.deepEqual(forms(scanEnglishCodecDefault(src, "x.js")), ["param_default"]);
});

test("finds the ?? \"eng\" fallback after declared/heard", () => {
  const src = `const stem = (language ? stemOf(language) : null) ?? heardStem ?? "eng";`;
  assert.deepEqual(forms(scanEnglishCodecDefault(src, "read-core.mjs")), ["fallback"]);
});

test("finds the || 'en' fallback", () => {
  const src = `const lex = pageLexicon(iso1Of(stem) || 'en');`;
  assert.deepEqual(forms(scanEnglishCodecDefault(src, "holodeck-reader.js")), ["fallback"]);
});

test("finds the codec hard-wired at a call: toEot(s, { language: \"eng\" })", () => {
  const src = `    const rec = toEot(s, { language: "eng", source });`;
  assert.deepEqual(forms(scanEnglishCodecDefault(src, "english-parser.js")), ["literal"]);
});

test("control: a typed gap, a null default, and a declared variable stay quiet", () => {
  const src = [
    `export function read({ text, lang = null }) {`,
    `  if (!lang) return { gap: "no_codec" };`,
    `  const stem = declared ?? heard ?? null;`,
    `  return codecFor({ language: stem });`,
    `  if (lang === "en") useEnglishParser();`,
  ].join("\n");
  assert.deepEqual(scanEnglishCodecDefault(src, "x.js"), []);
});

test("control: an HTML document's lang attribute is markup, not a codec", () => {
  const src = [`return '<!doctype html>\\n<html lang="en">\\n<head>';`, "  <html lang=\"en\"><head><meta charset=\"utf-8\">"].join("\n");
  assert.deepEqual(scanEnglishCodecDefault(src, "x.js"), []);
});

test("control: a comment that quotes the defect is not the defect", () => {
  const src = `// readAtoms({ lang = "en" }) was the leak; it now takes the weft's language`;
  assert.deepEqual(scanEnglishCodecDefault(src, "x.js"), []);
});

test("shape 2 and shape 5 never report one line twice", () => {
  const src = `const l = language == null ? x : y || "eng";`;
  const all = scanSource(src, "x.js").filter((f) => /english/.test(f.rule));
  assert.equal(all.length, 1);
  assert.equal(all[0].rule, "silent_english_default");
});

// ── Shape 6: english_word_pattern ──────────────────────────────────────────

test("finds the mechanical lane's English operators: /\\bplus\\b/", () => {
  const src = `  [/\\bplus\\b/gi, "+"],`;
  assert.deepEqual(forms(scanEnglishWordPattern(src, "arithmetic.js")), ["ascii_word_boundary"]);
});

test("finds foldcode's mech resolver patterns", () => {
  const src = [
    `const EXPORTS = /\\bexport(?:ed|s)?\\b/i`,
    `const LISTISH = /\\b(list|name|names|which|what are)\\b/i`,
    `if (/\\bwhat('s| is| was)\\b|\\bvalue\\b/i.test(ask)) {`,
  ].join("\n");
  assert.deepEqual(forms(scanEnglishWordPattern(src, "physics-mech.ts")), [
    "ascii_word_boundary",
    "ascii_word_boundary",
    "ascii_word_boundary",
  ]);
});

test("finds an anchored stoplist alternation", () => {
  const src = `const STOP = /^(what|is|are|was|the|of)$/;`;
  assert.deepEqual(forms(scanEnglishWordPattern(src, "prose.mjs")), ["anchored_word_list"]);
});

test("control: script-neutral regexes stay quiet", () => {
  const src = [
    `const NUM = /\\b\\d+\\b/g;`,
    `const WORD = /[\\p{L}\\p{N}_]+/gu;`,
    `const SYMBOL = /\\b([A-Z][A-Z0-9]*_[A-Z0-9_]+)\\b/g;`,
    `const EXT = /\\.(?:m?js|ts)$/;`,
    `const Q = /[?？؟]\\s*$/u;`,
  ].join("\n");
  assert.deepEqual(scanEnglishWordPattern(src, "x.js"), []);
});

// ── The four original shapes (pins) ────────────────────────────────────────

test("shape 1: a bare [A-Z] gate is a witness", () => {
  assert.equal(scanCapitalizationUnguarded(`const NAME = /^[A-Z][a-z]+/;`, "x.js").length, 1);
});

test("shape 2: language == null || \"eng\" is found", () => {
  assert.equal(scanSilentEnglishDefault(`const l = language == null ? null : z || "eng";`, "x.js").length, 1);
});

test("shape 3: subject/verb/object fields are bridging beside end1/end2", () => {
  const f = scanSvoFieldLeak(`const r = { end1: a, label: l, end2: b };\nconst s = row.subject;`, "x.js");
  assert.equal(f.length, 1);
  assert.equal(f[0].confidence, "bridging");
});

test("shape 4: a [.!?] sentence split is a witness", () => {
  assert.equal(scanLatinPunctuationOnly(`const S = text.split(/[.!?]\\s+/);`, "x.js").length, 1);
});

test("summarize counts the new shapes by form", () => {
  const s = summarize(scanSource(`function f({ lang = "en" }) {}\nconst x = y ?? "eng";`, "x.js"));
  assert.equal(s.english_codec_default.total, 2);
  assert.equal(s.english_codec_default.param_default, 1);
  assert.equal(s.english_codec_default.fallback, 1);
});

// ── Real material: the defect that shipped is still visible on main ────────
// These pin TODAY's source. When a fix lands (the meaning stage reads the
// weft's language, PR #66), the pin is meant to fail and be rewritten as the
// fixed shape's control — the test records the defect, it does not bless it.

test("real material: read-atoms.js carries the English codec default", () => {
  const src = readFileSync(join(here, "read-atoms.js"), "utf8");
  const hits = scanEnglishCodecDefault(src, "read-atoms.js").filter((f) => /export function readAtoms/.test(f.excerpt));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].form, "param_default");
});

test("real material: arithmetic.js WORD_OPS are English word patterns", () => {
  const src = readFileSync(join(here, "../the-fold/arithmetic.js"), "utf8");
  const hits = scanEnglishWordPattern(src, "arithmetic.js").filter((f) => /\\bplus\\b/.test(f.excerpt));
  assert.ok(hits.length >= 1);
});

test("real material: eotFromText hard-wires the English codec", () => {
  const src = readFileSync(join(here, "../adapters/text/english-parser.js"), "utf8");
  const hits = scanEnglishCodecDefault(src, "english-parser.js").filter((f) => /toEot\(/.test(f.excerpt));
  assert.ok(hits.some((f) => f.form === "literal"));
});
