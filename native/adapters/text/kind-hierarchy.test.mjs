// kind-hierarchy.test.mjs — the Wikidata kind hierarchy: a word's P279 (subclass-of) chain reaches a
// place root, or it doesn't. The place-kind is a relation, not a gloss parse. Skips when Wikidata is
// unreachable; uses a small set to stay under the rate limit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeKindGiver, PLACE_ROOTS } from "./kind-hierarchy.js";

const online = await (async () => { try { const r = await fetch("https://www.wikidata.org/w/api.php?action=wbsearchentities&search=city&language=en&type=item&limit=1&format=json", { headers: { "user-agent": "khora-reader/1.0" } }); return r.ok; } catch { return false; } })();

test("the place roots are a received set, not invented", () => {
  assert.ok(PLACE_ROOTS.has("Q2221906"), "geographic location");
  assert.ok(PLACE_ROOTS.has("Q56061"), "administrative territorial entity");
});

test("a place-type reaches a place root; a thing does not (skips if Wikidata offline)", { skip: !online, timeout: 120000 }, async () => {
  const g = makeKindGiver({ cacheFile: null, rps: 1 });
  assert.equal((await g.isPlaceType("city")).place, true, "city is a place-type");
  assert.equal((await g.isPlaceType("table")).place, false, "table is not a place-type");
  assert.equal((await g.isPlaceType("country")).place, true, "country is a place-type");
});
