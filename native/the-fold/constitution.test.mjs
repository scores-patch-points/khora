// constitution.test.mjs — the assay the enforcement map promises.
//
// `constitution.js` has said since it was written that "constitution.test.mjs
// walks this table and probes each row's behavior, so 'the app follows its
// constitution' is a test run, not an assertion." That file did not exist in
// this repo. Every `enforced: true` row was therefore a CLAIM wearing a test's
// clothes — the exact failure VI.3 names ("unwired is failing", and an
// unfalsified gate reports `unmeasured`, never `pass`).
//
// This is the assay. It has two duties:
//
//   1. Walk ENFORCEMENT and PROBE each wired row against the real organs, so
//      `enforced: true` means "a test exercises it here" (VI.1: an article is
//      a failing test or it is an exception).
//   2. Keep the unwired list VISIBLE and non-empty (VI.3), and keep the map's
//      own organ names honest — a wired row must name an organ that exists on
//      this disk, or it is a cross-repo claim and must say so.
//
// Every control is paired with the behavior it would catch; where a probe
// cannot be built from organs present here, the row is moved to `partial` or
// `null` in constitution.js rather than left claiming compliance.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { ENFORCEMENT, enforcedArticles, unwiredArticles } from "./constitution.js";
import { chunkSource, readRange, retrieve, openQuestions, checkCitations } from "../organs/source.js";
import { checkGrounding, unsupportedClaims } from "../organs/grounding.js";
import { attribute } from "../organs/cite.js";
import { classifySentences } from "../organs/provenance.js";
import { questionFor, gateCrown } from "../organs/elenchus.js";
import { checkOracleMode } from "../organs/gary.js";
import { assertCrownShippable } from "./crown.js";
import {
  emptySummary,
  buildWarrantRecord,
  addWarrantRecord,
  updateSummaryWithFold,
  mechanicalFoldLine,
  buildSummarySystemMessage,
  buildRecordSystemMessage,
} from "./fold.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ORGANS = join(ROOT, "..", "organs");
const organExists = (name) => existsSync(join(ROOT, name)) || existsSync(join(ORGANS, name));

const TEXT =
  "The Kessington report put the harbor figure at 12% for the spring quarter.\n\n" +
  "Dredging of the shipping channel runs through March under the port authority schedule.";
const chunks = chunkSource("notes.txt", TEXT);

// ── VI.3: the map partitions honestly, and the unwired list stays visible ────

test("VI.3 the enforcement map partitions honestly and unwired stays visible", () => {
  assert.ok(ENFORCEMENT.length > 0, "an empty map is not a map");
  for (const row of ENFORCEMENT) {
    assert.ok(row.article, "every row names its article");
    assert.ok([true, "partial", null].includes(row.enforced), `bad standing on ${row.article}`);
    if (row.enforced === null) {
      assert.equal(row.holds, null, `unwired row carries an organ: ${row.article}`);
      assert.equal(row.where, null, `unwired row carries a location: ${row.article}`);
    } else {
      assert.ok(row.holds, `a wired/partial row must name what holds it: ${row.article}`);
    }
  }
  const enforced = enforcedArticles();
  const unwired = unwiredArticles();
  assert.ok(enforced.length >= 6, "fewer wired articles than the map has historically claimed");
  assert.ok(unwired.length >= 1, "an empty unwired list would claim full compliance");
  assert.ok(enforced.every((e) => e.enforced === true));
  assert.ok(unwired.every((e) => e.enforced === null));
});

test("VI.1 a fully-wired article names an organ that exists on this disk", () => {
  for (const row of ENFORCEMENT) {
    if (row.enforced !== true) continue;
    const files = [...String(row.where ?? "").matchAll(/[A-Za-z0-9_.-]+\.(?:js|mjs)/g)].map((m) => m[0]);
    assert.ok(files.length > 0, `a fully-wired article must name its organ file: ${row.article}`);
    assert.ok(
      files.some(organExists),
      `none of "${row.where}" exists for ${row.article} — a cross-repo claim, move it to partial`,
    );
  }
});

// ── II.3 descent: a ref re-opens the exact bytes it names ────────────────────

test("II.3 descent: a ref re-opens the exact bytes it names", () => {
  const c = chunks[0];
  const body = readRange({ "notes.txt": TEXT }, c.ref);
  assert.equal(body, TEXT.slice(c.start, c.end));
  assert.equal(readRange({ "notes.txt": TEXT }, "missing.txt#0-1"), null, "a ref to a source not in view must not resolve");
});

// ── II.5 firewall: the result may not tune the instrument ────────────────────

test("II.5 firewall: a hostile refresh reply cannot rewrite the record", () => {
  let summary = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["cited"], refs: ["notes.txt#0-74"], unsupported: [], open: [] }),
  );
  const hostile = JSON.stringify({
    topic: "t",
    flow: "f",
    entities: [],
    context: "c",
    language: "en",
    records: [{ turn: 1, gist: "REWRITTEN", refs: ["forged.txt#0-1"] }],
  });
  summary = updateSummaryWithFold(summary, mechanicalFoldLine("q", "a"), hostile);
  assert.equal(summary.records.length, 1, "the refresh reply minted or dropped a record");
  assert.equal(summary.records[0].refs[0], "notes.txt#0-74", "the record's own address was rewritten by the reply");
  assert.notEqual(summary.records[0].gist, "REWRITTEN", "the record's gist was rewritten by the reply");
});

// ── II.9 mouth: no model-authored value ships unchecked ──────────────────────

test("II.9 mouth: an invented figure, name, or address is caught mechanically", () => {
  const answer = "The harbor figure was 47% according to the Marlborough audit. [other.txt#0-9]";
  const report = checkGrounding(answer, chunks, { question: "harbor?" });
  const flagged = unsupportedClaims(report).join(" ");
  assert.ok(flagged.includes("47"), `the invented figure was not flagged: ${flagged}`);
  assert.ok(/marlborough/i.test(flagged), `the invented name was not flagged: ${flagged}`);
  const { unsupported } = checkCitations(answer, chunks);
  assert.deepEqual(unsupported, ["other.txt#0-9"], "an address that was never offered must be refused");
});

test("II.9 mouth: attribution is null-gated, never a guess with a tag", () => {
  const verbatim = attribute("The Kessington report put the harbor figure at 12% for the spring quarter.", [chunks[0]], chunks);
  assert.equal(verbatim[0].ref, chunks[0].ref, "a sentence that is in the material must attribute to it");
  const unrelated = attribute("Quarterly synergies improved across the board.", [chunks[0]], chunks);
  assert.equal(unrelated[0].ref, null, "a sentence the material does not carry must not borrow a ref");
});

// ── III.3 / IV.3 absent: every kind of gap is typed, never silent ────────────

test("III.3 / IV.3 absent: every kind of gap is typed, never silent", () => {
  assert.deepEqual(openQuestions("zeppelin cargo", [], []), ["no material matched: zeppelin cargo"]);
  assert.deepEqual(openQuestions("harbor", chunks, []), ["material retrieved but uncited: harbor"]);
  assert.deepEqual(openQuestions("harbor", chunks, [chunks[0].ref]), [], "a cited retrieval leaves nothing open");
});

// ── IV.1 derive vs receive: retrieval is a function of the question's words ──

test("IV.1 derive: retrieval is a deterministic function of the question's words", () => {
  const a = retrieve(chunks, "harbor figure", 3);
  const b = retrieve(chunks, "harbor figure", 3);
  assert.deepEqual(a.map((c) => c.ref), b.map((c) => c.ref), "retrieval is not deterministic");
  assert.ok(a.length > 0, "a question whose words are in the material retrieved nothing");
  assert.deepEqual(retrieve(chunks, "zeppelin", 3), [], "a question sharing no term must retrieve nothing, not something");
});

// ── IV.4 shown is typed: every sentence carries its ground ───────────────────

test("IV.4 shown is typed: every sentence is classified onto material or model ground", () => {
  const answer = "The Kessington report put the harbor figure at 12%. Quarterly synergies improved across the board.";
  const attributions = attribute(answer, [chunks[0]], chunks);
  const classified = classifySentences(answer, attributions);
  assert.ok(classified.length >= 2, "the classifier dropped a sentence");
  assert.ok(classified.some((s) => s.ground === "material"), "a sentence the material carries was not typed material");
  assert.ok(classified.some((s) => s.ground === "model"), "a sentence the material does not carry was not typed model");
});

// ── IV.5 the register is the reader's; paraphrase never gains authority ──────

test("IV.5 registers: paraphrase disclaims itself; the record is a separate block", () => {
  const summary = addWarrantRecord(
    { ...emptySummary(), topic: "ports", flow: "steady", entities: [], context: "" },
    buildWarrantRecord({ turn: 1, gist: "g", channels: ["cited"], refs: ["notes.txt#0-74"], unsupported: [], open: [] }),
  );
  const s1 = buildSummarySystemMessage(summary);
  const s2 = buildRecordSystemMessage(summary);
  assert.ok(s1 && s2 && s1 !== s2, "the two grounds must render as two blocks, never merged");
  assert.ok(/paraphrase/i.test(s1), "the paraphrase block must disclaim itself");
  assert.ok(s2.includes("notes.txt#0-74"), "the record block must carry the addresses");
});

// ── P244 socrates: a non-AGREE standing ships with its standing question ─────

test("P244 socrates: a non-AGREE standing ships with its question; no live claim refuses the oracle", () => {
  const single = { case: "SINGLE", holds: [{ who: "src" }] };
  const q = questionFor(single, {});
  assert.ok(q && q.id && q.text, "SINGLE must carry a bank question");
  assert.equal(gateCrown(single, null).ok, false, "a SINGLE render without its question must be refused");
  assert.equal(gateCrown(single, q).ok, true, "the bank question for the standing must pass the gate");
  assert.equal(questionFor({ case: "AGREE" }, {}), null, "AGREE needs no question");

  const oracle = checkOracleMode({ materialEmpty: true, text: "hello there", questionCycle: null });
  assert.equal(oracle?.rule, "no-oracle-mode", "an empty turn with no live claim must refuse, not free-associate");
  assert.equal(oracle?.cites, "P244");
  assert.equal(checkOracleMode({ materialEmpty: false, text: "hello there" }), null, "material in view is never refused");

  assert.equal(assertCrownShippable({ verified: true, socratesRefused: null, violations: [] }), true);
  assert.throws(
    () => assertCrownShippable({ verified: true, socratesRefused: { detail: "missing question" }, violations: [] }),
    /socrates-required/,
    "a non-AGREE crown with no question must not ship",
  );
});
