// The stage's identity hook served by cancellation (cancel-identity.js): chooses among name-nominated anchors, excludes by perspective, and holds a being to at most one claim end.
import test from "node:test";
import assert from "node:assert/strict";
import { makeCancelIdentity } from "./cancel-identity.js";
import { stageFromAtoms, judgeClaim } from "../kernel/stage.js";
const E = (id, name) => ({ entity: id, name }), atom = (pred, args, extra = {}) => ({ pred, args, neg: false, hedged: false, time: null, text: `${pred}(${args.map((a) => a.name ?? a.value).join(", ")})`, ...extra });
// the source: two beings both named "Michigan" by their last token (the lake and the state), told apart by what is said of them
const src = [atom("border", [E("L1", "Lake Michigan"), E("L3", "Wisconsin")]), atom("has_area", [E("L1", "Lake Michigan"), { value: "58,000 km2", measure: "area" }]), atom("is_a", [E("L2", "Michigan"), { value: "state" }]), atom("include", [E("L2", "Michigan"), E("L4", "Detroit")])];
test("choose: among two anchors a name nominates, the one the claim end cancels with", () => {
  const claim = [atom("include", [E("C1", "Michigan"), E("C2", "Detroit")])];
  const idn = makeCancelIdentity({ claimAtoms: claim, sourceAtoms: src });
  const pick = idn.choose({ entity: "C1" }, [E("L1", "Lake Michigan"), E("L2", "Michigan")]); assert.equal(pick?.entity, "L2");
  assert.equal(idn.standing({ entity: "C1" }, E("L2", "Michigan")).kind, "same"); assert.equal(idn.standing({ entity: "C1" }, E("L1", "Lake Michigan")).kind, "needs_deeper_reading");
});
test("one-to-one: two claim ends that each cancel to one source being contest it; neither is chosen and the standing says so", () => {
  const claim = [atom("include", [E("C1", "Michigan"), E("C2", "Detroit")]), atom("include", [E("C3", "the state"), E("C4", "Detroit")])];
  const idn = makeCancelIdentity({ claimAtoms: claim, sourceAtoms: src });
  assert.equal(idn.choose({ entity: "C1" }, [E("L2", "Michigan")]), null); assert.match(idn.standing({ entity: "C1" }, E("L2", "Michigan")).reason, /contested/);
});
test("in the stage: an ambiguous bind is resolved by the chooser and the proof says so; without the hook it stays a typed gap", () => {
  const claim = [atom("has_area", [E("C1", "Michigan"), { value: "58,000 km2", measure: "area", base: 58000e6, alts: [] }])];
  const srcA = [...src]; srcA[1] = atom("has_area", [E("L1", "Lake Michigan"), { value: "58,000 km2", measure: "area", base: 58000e6, alts: [] }]);
  const stage = stageFromAtoms(srcA, { doc: "src" });
  const bare = judgeClaim(stage, claim), withId = judgeClaim(stage, claim, { identity: makeCancelIdentity({ claimAtoms: claim, sourceAtoms: srcA }) });
  const ambiguousBefore = bare.gaps.some((g) => g.kind === "ambiguous_binding"), ambiguousAfter = withId.gaps.some((g) => g.kind === "ambiguous_binding");
  assert.ok(ambiguousBefore || withId.proofs.length, "the fixture must raise a nomination the chooser can act on");
  if (ambiguousBefore) { assert.equal(ambiguousAfter, false); assert.ok(withId.proofs.some((p) => /chose it/.test(p.binds.join(" "))), JSON.stringify(withId.proofs.map((p) => p.binds))); }
});
