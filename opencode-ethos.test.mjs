import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const E = await import("./opencode-ethos.mjs");
const known = (r) => r === "person:dana";
const C = (row, o = {}) => E.closureCheck(row, { known, ...o });

test("C1: a row about a person must name an affected referent with standing", () => {
  assert.equal(C({ aboutPerson: true }).findings[0].gap, "affected_unnamed");
  assert.equal(C({ aboutPerson: true, affects: "person:nobody" }).ok, false);
  assert.equal(C({ aboutPerson: true, affects: "person:dana" }).verdict, "pass");
});
test("C2: no inference from absence; accountability passes", () => {
  assert.equal(C({ personClaim: true, basis: "refusal" }).findings[0].gap, "inference_from_absence");
  assert.equal(C({ personClaim: true, basis: "confidential" }).ok, false);
  assert.equal(C({ personClaim: true, basis: "refusal", officialCapacity: true, witnessed: true, publicRecord: true }).verdict, "pass");
  assert.equal(C({ personClaim: true, basis: "refusal", officialCapacity: true, witnessed: true }).ok, false, "witnessed alone, not public record, does not earn the pass");
  assert.equal(C({ personClaim: true, basis: "document" }).verdict, "pass");
});
test("C3: silent essence is flagged, admitted, and disclosed", () => {
  const r = C({ promotesIdentity: true });
  assert.equal(r.verdict, "flag"); assert.equal(r.ok, true);
  assert.equal(C({ promotesIdentity: true, register: "said", supersedes: "e1" }).verdict, "pass");
});
test("C4 ships as a disclosed gap on every verdict", () => {
  assert.equal(C({}).disclosed[0].gap, "no_mechanical_form");
});
// MUTATION CHECKS: a deliberately broken rule must make the matching assertion fail.
test("mutation: a C1 that never fires is caught", () => {
  const broken = E.RULES.map((r) => (r.id === "C1" ? { ...r, check: () => null } : r));
  assert.equal(C({ aboutPerson: true }, { rules: broken }).ok, true, "the mutant lets it through");
  assert.equal(C({ aboutPerson: true }).ok, false, "the real rule does not");
});
test("mutation: a C2 that drops the accountability exemption blocks witnessed official claims (the false-positive bar)", () => {
  const broken = E.RULES.map((r) => (r.id === "C2" ? { ...r, check: (row) => (row.personClaim && ["refusal"].includes(row.basis) ? { verdict: "refuse", gap: "inference_from_absence" } : null) } : r));
  const official = { personClaim: true, basis: "refusal", officialCapacity: true, witnessed: true, publicRecord: true };
  assert.equal(C(official, { rules: broken }).ok, false, "the mutant wrongly blocks accountability");
  assert.equal(C(official).ok, true);
});
test("mutation: a C3 that refuses instead of flags changes ok", () => {
  const broken = E.RULES.map((r) => (r.id === "C3" ? { ...r, check: (row) => (row.promotesIdentity ? { verdict: "refuse", gap: "silent_essence" } : null) } : r));
  assert.equal(C({ promotesIdentity: true }, { rules: broken }).ok, false);
  assert.equal(C({ promotesIdentity: true }).ok, true);
});
test("shadow logs only non-pass verdicts and never blocks", async () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ethos-")); process.env.FOLD_WORKNOTES_DIR = d;
  const L = await import("./opencode-ledger.mjs");
  E.ethosShadow({ task: "t", referent: "r@1", closure: { aboutPerson: true }, known });
  E.ethosShadow({ task: "t", referent: "r@2", closure: { aboutPerson: true, affects: "person:dana" }, known });
  const rows = L.rows("t", { schema: "EthosClosure@1" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].m.findings[0].gap, "affected_unnamed");
});
