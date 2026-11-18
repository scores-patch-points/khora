// scholia.test.mjs — the standard surface for "what does a read return" builds, and shows what it claims to show: a read appends to no log; the page carries the entry's fields, the per-word classes, the dependency tree and the clause nesting.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawnSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const BUILD = path.join(HERE, "../surfaces/scholia/build.mjs");
test("the viewer builds a page with words, tree, clauses and every entry field", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rv-")); const out = path.join(dir, "page.html"); const txt = path.join(dir, "t.txt");
  fs.writeFileSync(txt, "Mary Ellis met John Carter at the station on Tuesday. She gave him the letter from her sister. He thanked her and left. ".repeat(3));
  const r = spawnSync(process.execPath, [BUILD, "--file", txt, "--out", out], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(out, "utf8");
  for (const needle of ["What a read returns", "appends to no log", "pronounsGuess", "Every word under its head", "Clause nesting", "every word by class", "data-u=\"VERB\"", "data-u=\"ADP\""]) assert.ok(html.includes(needle), needle);
  assert.ok(/<details[^>]*>\s*<summary><b>cast<\/b>/.test(html));
});
