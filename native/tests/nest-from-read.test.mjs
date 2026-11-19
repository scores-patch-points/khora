// nest-from-read.test.mjs — nesting computed from a read's own edges, between referents (PREREG-ROUND29): constructed entries, no reader.
import test from "node:test"; import assert from "node:assert/strict"; import { nestFromRead, refOfLabel } from "../adapters/text/nest-from-read.js"; import { pathOf } from "../adapters/text/holon-nest.js";
const cast = [{ ref: "ref:a:topeka", surface: "Topeka", allSurfaces: ["Topeka", "topeka"] }, { ref: "ref:a:kansas", surface: "Kansas", allSurfaces: ["Kansas", "the Sunflower State"] }, { ref: "ref:a:us", surface: "United States", allSurfaces: ["United States"] }, { ref: "ref:a:hale", surface: "Hale", allSurfaces: ["Hale"] }];
const E = (a, l, b) => ({ end1: a, label: l, end2: b });
test("a comma chain after a locative edge nests the referents, and an alias resolves to the same referent", () => {
  const n = nestFromRead({ cast, edges: [E("hale", "was born in", "topeka"), E("topeka", ",", "kansas"), E("kansas", ", in the", "united states")] });
  const top = refOfLabel(n, "Topeka"); const p = pathOf(n.nodes, top); assert.ok(p.ok); assert.deepEqual(p.path.map((r) => n.nodes[r].label), ["Topeka", "Kansas", "United States"]);
  assert.equal(refOfLabel(n, "the Sunflower State"), "ref:a:kansas");
});
test("a person on a comma edge is not a place, and a text that never relates two places leaves a gap", () => {
  const n = nestFromRead({ cast, edges: [E("hale", ",", "topeka")] }); assert.deepEqual(n.place, []); const m = nestFromRead({ cast, edges: [E("hale", "was born in", "topeka")] });
  assert.deepEqual(pathOf(m.nodes, "ref:a:topeka").path, ["ref:a:topeka"]);
});
