// cli/tests/claude-code-modulestem.test.mjs — nesting-fix J D7: a runtime scheme (`node:`) is not part of a
// module's name. Audit repro (J.md D7, live): `imports(claude-code-spiral, fs)` against `import fs from "node:fs"`
// stayed `unlicensed` (moduleStem("node:fs") is "node:fs", never equal to "fs"), and recall then printed it
// `ungrounded` although it was true.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "modulestem-home-"));
process.env.HOME = HOME;
const SP = await import("../claude-code-spiral.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "modulestem-files-"));
const file = (name, text) => { const f = path.join(dir, name); fs.writeFileSync(f, text); return f; };

test("moduleStem: a runtime scheme is not part of the name — `fs` meets `node:fs` either way; a different module still does not (D7)", () => {
  const f = file("mod.js", "import fs from 'node:fs';\nimport { join } from \"node:path\";\nimport t from './lib/thing.js';\n");
  const read = SP.codeGroundReader();
  const c = (a1, polarity = "+") => ({ ground: f, rel: "imports", roles: { ARG0: "mod", ARG1: a1 }, polarity });
  assert.equal(read(c("fs"))?.holds, true, "the audit's repro");
  assert.equal(read(c("node:fs"))?.holds, true);
  assert.equal(read(c("path"))?.holds, true);
  assert.equal(read(c("thing"))?.holds, true, "control: a relative module still meets its stem");
  assert.equal(read(c("os")), null, "control: an absent import is not read, never refuted");
  assert.equal(read(c("nodefs")), null, "control: no scheme-less prefix matching");
  assert.equal(read(c("fs", "-"))?.holds, false, "a denial the reader contradicts does not hold");
  assert.equal(SP.moduleStem("npm:lodash"), "lodash");
  assert.equal(SP.moduleStem("./a/b.js"), "b");
});
