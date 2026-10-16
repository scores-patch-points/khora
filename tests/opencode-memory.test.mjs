import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseMarkdown, query, memoryNote, MEMORY_STOP } from "../opencode-memory.mjs";

const md = (body) => body;

test("parseMarkdown reads the mechanical grammar: tag sections and claims", () => {
  const parsed = parseMarkdown(
    md([
      "# user-memory",
      "",
      "preamble the parser skips",
      "",
      "## about:user:repos",
      "- khora is the canonical perceiver repo",
      "  status: current",
      "  falsifying: a repo whose package.json name contradicts this",
      "  provenance: ses_a.turns.md#1",
      "",
      "## about:user:accounts",
      "- scores-patch-points publishes; clovenbradshaw-ctrl drafts",
    ].join("\n")),
  );
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].claim, "khora is the canonical perceiver repo");
  assert.equal(parsed[0].tag, "about:user:repos");
  assert.equal(parsed[0].falsifying, "a repo whose package.json name contradicts this");
  assert.deepEqual(parsed[0].provenance, ["ses_a.turns.md#1"]);
  assert.equal(parsed[1].tag, "about:user:accounts");
});

test("parseMarkdown reads status and supersedes off the fields", () => {
  const parsed = parseMarkdown(
    md(["## about:user:repos", "- eoreader7 is canonical", "  status: superseded", "  supersedes: khora is canonical"].join("\n")),
  );
  assert.equal(parsed[0].status, "superseded");
  assert.equal(parsed[0].supersedes, "khora is canonical");
});

test("query recalls a claim whose words appear in the ask, mechanically", () => {
  const entries = parseMarkdown(
    md([
      "## about:user:repos",
      "- khora is the canonical perceiver repo",
      "## about:user:accounts",
      "- scores-patch-points is the publishing account",
      "## about:user:preferences",
      "- the operator likes baroque music",
    ].join("\n")),
  );
  const hits = query(entries, "which repo is canonical and which account publishes?");
  assert.ok(hits.some((e) => e.tag === "about:user:repos"));
  assert.ok(hits.some((e) => e.tag === "about:user:accounts"));
  assert.ok(!hits.some((e) => e.tag === "about:user:preferences"), "an unrelated fact never rides");
});

test("a stopword alone never recalls anything", () => {
  const entries = parseMarkdown(md(["## about:user:repos", "- khora is the canonical perceiver repo"].join("\n")));
  assert.deepEqual(query(entries, "the and for are was"), [], "stopwords name no memory");
  for (const w of MEMORY_STOP) assert.ok(w.length < 3 || MEMORY_STOP.has(w));
});

test("a superseded claim is never recalled", () => {
  const entries = parseMarkdown(
    md(["## about:user:repos", "- eoreader7 is canonical", "  status: superseded"].join("\n")),
  );
  assert.deepEqual(query(entries, "is eoreader7 the canonical repo?"), []);
});

test("memoryNote returns a note when the ask bears on the store, a typed gap otherwise", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "oc-mem-"));
  const file = path.join(dir, "user-memory.md");
  fs.writeFileSync(
    file,
    ["## about:user:repos", "- khora (scores-patch-points/khora) is the canonical perceiver"].join("\n"),
  );
  const hit = memoryNote("which repo is canonical?", { file });
  assert.ok(hit.note, "a bearing ask gets a note");
  assert.ok(hit.note.includes("<fold-memory>"));
  assert.ok(hit.note.includes("khora"));
  assert.equal(hit.count, 1);

  const miss = memoryNote("write a haiku about autumn leaves", { file });
  assert.ok(miss.gap, "an unrelated ask is a typed gap, never a guess");

  const absent = memoryNote("which repo is canonical?", { file: path.join(dir, "nope.md") });
  assert.equal(absent.gap, "no-store");
});
