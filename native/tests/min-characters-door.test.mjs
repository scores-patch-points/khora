// min-characters-door.test.mjs — THE TWO FRONT DOORS TAKE THE SAME FLOOR (2026-11-27).
// read-core.mjs::readWith refuses a text shorter than `minCharacters` (default 200) as `too_short`. reading.js::readDocument passed a caller's
// `minCharacters` through (its opts reach read-core); read-process.mjs::readToWeft did not, so the doors differed on a short text such as a chat
// cue. Claims: (1) by default both doors still refuse a short text (the canonical read of a document is unchanged); (2) with a declared floor both
// doors read it, and they admit the same cast. Falsifier: a door that drops the option reads nothing in (2) and the test fails.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(PRI, "pos-eng.json")); if (HAVE) process.env.KHORA_PRIORS_DIR ??= PRI;
const CUE = "Anna met Boris at the station in Vienna, and Boris gave Anna the letter.";
test("1. by default a short text is too_short through both doors", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs"); const { readDocument } = await import("../reading.js");
  assert.ok(CUE.length < 200, "the probe is shorter than the default floor (else this test proves nothing)");
  assert.equal(readToWeft(CUE, { language: "eng" }).skipped, "too_short");
  assert.equal((await readDocument(CUE, { language: "eng", lexicon: false })).skipped, "too_short");
});
test("2. with a declared floor both doors read it whole and admit the same cast", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs"); const { readDocument } = await import("../reading.js");
  const a = readToWeft(CUE, { language: "eng", minCharacters: 1 }); const b = await readDocument(CUE, { language: "eng", lexicon: false, minCharacters: 1 });
  assert.equal(a.skipped ?? null, null); assert.equal(a.readCharacters, CUE.length); assert.equal(b.readCharacters, CUE.length);
  const refs = (w) => (w.cast ?? []).map((c) => c.ref).sort();
  assert.ok(refs(a).length > 0, "the read admitted beings (else the comparison proves nothing)");
  assert.deepEqual(refs(b), refs(a));
});
