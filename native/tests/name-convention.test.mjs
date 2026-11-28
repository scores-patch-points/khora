// name-convention.test.mjs — the convention rung (round 31, identity/novels/PREREG-ROUND31-CONVENTION.md + addenda; results NOVELS-RESULTS-ROUND31.md).
// Claims, each with its falsifier: (1) off, the read is unchanged (no report, the same cast); (2) a modern English text does not fire GROUND; (3) the
// same text with its common nouns capitalized fires, and the rung demotes capitalized common nouns while a name the prior holds as PROPN or never
// heard stays a being; (4) with no spread prior the rung refuses nothing and says why.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(PRI, "pos-eng.json")); if (HAVE) process.env.KHORA_PRIORS_DIR ??= PRI;
const MODERN = "Anna walked to the market on Monday with her brother. The prisoner was found guilty of the theft and the jury heard the evidence. Boris met Anna at the gate near London. He asked her about the money and the silver. The house was warm and the fire was lit.".repeat(3);
const OLD = MODERN.replace(/\b(market|brother|prisoner|theft|jury|evidence|gate|money|silver|house|fire)\b/g, (w) => w[0].toUpperCase() + w.slice(1));   // regex-ok: the test's own fixture, a convention shift built from known words
test("1. off, the read carries no convention report and the same cast", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs");
  const a = readToWeft(OLD, { language: "eng" }); const b = readToWeft(OLD, { language: "eng", readerOptions: {} });
  assert.equal(a.nameConventionReport, undefined);
  assert.deepEqual(a.cast.map((c) => c.ref), b.cast.map((c) => c.ref));
});
test("2. a modern text does not fire GROUND", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs");
  const w = readToWeft(MODERN, { language: "eng", readerOptions: { nameConvention: true } });
  assert.equal(w.nameConventionReport?.fired, false); assert.equal(w.nameConventionReport?.refused.length, 0);
});
test("3. capitalized common nouns fire GROUND and are demoted; names stay beings", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs");
  const off = readToWeft(OLD, { language: "eng" }); const on = readToWeft(OLD, { language: "eng", readerOptions: { nameConvention: true } });
  const refs = (w) => new Set(w.cast.map((c) => c.ref));
  assert.equal(on.nameConventionReport.fired, true, `k ${on.nameConventionReport.k} of n ${on.nameConventionReport.n}`);
  assert.ok(refs(off).has("ref:auto:prisoner"), "the capital tier admits Prisoner when the rung is off (else the test proves nothing)");
  assert.ok(!refs(on).has("ref:auto:prisoner"), "Prisoner is demoted");
  // names that are beings with the rung off (a name that only opens a sentence, like Boris here, is not one either way: capital-opens-a-sentence)
  for (const name of ["ref:auto:anna", "ref:auto:london"]) { assert.ok(refs(off).has(name), `${name} is a being with the rung off`); assert.ok(refs(on).has(name), `${name} stays a being`); }
});
test("4. no spread prior: nothing refused, the gap named", async () => {
  const { nameConventionOf } = await import("../adapters/text/name-convention.js");
  const g = nameConventionOf([{ text: "The Prisoner was found Guilty." }], { forms: { prisoner: { NOUN: 3 } }, conventions: null, spread: null });
  assert.equal(g.fired, false); assert.equal(g.gap, "no_convention_spread");
});
