// native/organs/capacity-runner.test.mjs — the dispatch table, pinned.
//
// The runner was a hardcoded two-branch switch (cast, relations) and every
// other registered capacity returned `not_yet_executable` before any organ
// ran. Now runCapacity is keyed by id over `CAPACITY_HANDLERS` (real organ
// adapters); a row without a handler keeps the typed gap. These tests pin
// the wired set — cast, relations, unravel, witness — and the gap behavior
// of the unwired rest — so a future handler's addition (or a regression that
// drops one) is caught by the suite, not discovered on a live turn.
import test from "node:test";
import assert from "node:assert/strict";
import { makeCapacityRunner } from "./capacity-runner.js";
import { makeReferentIndex } from "./cast.js";
import { engineRelationsFor } from "../the-fold/reader-bundle.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { yieldOf } from "../eval/lavar/capacity-swarm.mjs";

const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const relationsFor = (chunks) => engineRelationsFor(chunks);
const runner = makeCapacityRunner({ referentIndexFor, relationsFor });

const PROSE =
  "Abraham Lincoln was the 16th president of the United States. He appointed Hamlin as his vice president in 1861. " +
  "Ulysses Grant was the 18th president. He served two terms.";

test("cast runs: referents counted against the material", () => {
  const r = runner("cast", { text: PROSE, name: "mat" });
  assert.equal(r.gap, undefined);
  assert.ok(r.count >= 3, `wants the named beings, got ${r.count}`);
  assert.ok(Array.isArray(r.referents));
});

test("relations runs: material's own edges", () => {
  const r = runner("relations", { text: PROSE, name: "mat" });
  assert.equal(r.gap, undefined);
  assert.ok(r.count >= 2, `wants subject-verb-object edges, got ${r.count}`);
  assert.ok(Array.isArray(r.edges));
});

test("unravel runs and cuts the relation network at its seams", () => {
  const r = runner("unravel", { text: PROSE, name: "mat" });
  assert.equal(r.gap, undefined);
  assert.ok(Array.isArray(r.edges) && r.edges.length > 0, "composes relations into an edge graph");
  assert.ok(Array.isArray(r.parts), "the parts the seams separate");
  assert.ok(Array.isArray(r.bridges), "the bridges cut");
  assert.equal(typeof r.articulationPoints, "object");
});

test("unravel on empty-material prose is a typed no_material, never a fabricated seam", () => {
  const r = runner("unravel", { text: "hello world", name: "tiny" });
  assert.equal(r.gap, "no_material");
});

test("witness runs on html and js material", () => {
  const html = runner("witness", { text: "<html><body><p>hi</p></body></html>", name: "page.html" });
  assert.equal(html.gap, undefined);
  assert.equal(html.lang, "html");
  assert.equal(html.ok, true);

  const jsGood = runner("witness", { text: "const x = 1;", name: "app.js" });
  assert.equal(jsGood.lang, "js");
  assert.equal(jsGood.ok, true);

  const jsBad = runner("witness", { text: "function( {", name: "broken.js" });
  assert.equal(jsBad.ok, false);
  assert.ok(jsBad.findings.length > 0);
});

test("witness on a material it cannot read is a typed unexamined gap, never a silent clean", () => {
  const r = runner("witness", { text: "some ordinary prose with no code", name: "note.txt" });
  assert.equal(r.gap, "unexamined");
  assert.equal(typeof r.kind, "string");
});

test("a capacity with no handler keeps the typed not_yet_executable gap", () => {
  const r = runner("graph", { text: PROSE, name: "mat" });
  assert.equal(r.gap, "not_yet_executable");
  assert.match(r.detail, /not yet wired/);
});

test("no material is a typed gap for every wired capacity", () => {
  for (const id of ["cast", "relations", "unravel", "witness"]) {
    const r = runner(id, { text: "", name: "empty" });
    assert.equal(r.gap, "no_material", `${id} on empty material`);
  }
});

test("yieldOf counts the new product shapes so the swarm hears them", () => {
  assert.equal(yieldOf({ referents: [1, 2, 3] }), 3);
  assert.equal(yieldOf({ parts: [1, 2] }), 2, "unravel parts are signal");
  assert.equal(yieldOf({ components: [1] }), 1);
  assert.equal(yieldOf({ ok: true }), 1, "a clean witness is a determinate verdict");
  assert.equal(yieldOf({ ok: false, findings: [{}, {}] }), 2, "a dirty witness yields its findings");
  assert.equal(yieldOf({ gap: "unexamined" }), 0, "a typed gap is never signal");
  assert.equal(yieldOf({ count: 7 }), 7);
  assert.equal(yieldOf({}), 0);
});