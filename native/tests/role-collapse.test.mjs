// role-collapse.test.mjs — round 32 (identity/novels/PREREG-ROUND32-SUPERPOSITION.md; results NOVELS-RESULTS-ROUND32.md). The rung is opt-in.
// Claims, each with its falsifier: (1) off, the read carries no report and the same cast; (2) a row a pronoun binds to is kept by the binding act
// whatever its posterior; (3) the posterior follows the counts (a feature cell dominated by names keeps, one dominated by others demotes);
// (4) with no model nothing is demoted and the act says so.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const PRI = process.env.KHORA_PRIORS_DIR ?? path.join(os.homedir(), "Documents", "janus", "priors"); const HAVE = fs.existsSync(path.join(PRI, "pos-eng.json")); if (HAVE) process.env.KHORA_PRIORS_DIR ??= PRI;
const TEXT = "Anna met the Prisoner at the Gate near London. She gave the Prisoner a letter. The Gate was old and the Prisoner was tired. Anna walked home to London.".repeat(3);
const MODEL = { schema: "RoleCollapse@1", prior: { name: 100, other: 100 }, likelihood: {
  support: { propn: { name: 90, other: 10 }, unseen: { name: 50, other: 50 }, common: { name: 10, other: 90 } },
  ground: { yes: { name: 50, other: 50 }, no: { name: 50, other: 50 } }, multi: { yes: { name: 50, other: 50 }, no: { name: 50, other: 50 } }, recur: { yes: { name: 50, other: 50 }, no: { name: 50, other: 50 } } } };
const row = (ref, surface) => ({ ref, surface, allSurfaces: [surface], mentionSpans: [[0, 1], [5, 6]] });
test("1. off, no report and the same cast", { skip: !HAVE, timeout: 300000 }, async () => {
  const { readToWeft } = await import("../the-fold/read-process.mjs");
  const a = readToWeft(TEXT, { language: "eng" }), b = readToWeft(TEXT, { language: "eng", readerOptions: {} });
  assert.equal(a.roleCollapseReport, undefined); assert.deepEqual(a.cast.map((c) => c.ref), b.cast.map((c) => c.ref));
});
test("2. the binding act keeps a row whatever its posterior", async () => {
  const { collapseRoles } = await import("../adapters/text/role-collapse.js");
  const r = collapseRoles([row("ref:a", "Prisoner"), row("ref:b", "Gate")], { bound: new Set(["ref:a"]), supportOfRow: () => "common", groundFired: true, model: MODEL });
  assert.deepEqual(r.keep.map((x) => x.ref), ["ref:a"]); assert.deepEqual(r.demote.map((x) => x.ref), ["ref:b"]);
  assert.equal(r.report.find((x) => x.ref === "ref:a").act, "binding");
});
test("3. the posterior follows the counts", async () => {
  const { posteriorName } = await import("../adapters/text/role-collapse.js");
  const f = (support) => ({ support, ground: "yes", multi: "no", recur: "yes" });
  assert.ok(posteriorName(f("propn"), MODEL) > 0.5); assert.ok(posteriorName(f("common"), MODEL) < 0.5);
  const flat = JSON.parse(JSON.stringify(MODEL)); flat.likelihood.support.common = { name: 50, other: 50 };
  assert.ok(Math.abs(posteriorName(f("common"), flat) - 0.5) < 1e-9, "uninformative counts give an uninformative posterior (else the test proves nothing)");
});
test("4. no model: nothing demoted, the act names it", async () => {
  const { collapseRoles } = await import("../adapters/text/role-collapse.js");
  const r = collapseRoles([row("ref:b", "Gate")], { bound: new Set(), supportOfRow: () => "common", groundFired: true, model: null });
  assert.equal(r.demote.length, 0); assert.equal(r.report[0].act, "no_model");
});
