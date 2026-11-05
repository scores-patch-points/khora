// navbox-contamination.test.mjs — navigation chrome must not compound names.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/adapters/text/navbox-contamination.test.mjs
//
// A scraped encyclopedia page carries, beside the article, navigation boxes: a run of link texts ("January", "February", ... "August", "Prince Andrew", "DOW").
// Flattened to text, adjacent links sit side by side separated by a bullet, a newline, or nothing at all. Each link text is its own item; a name candidate that
// contains two or more items is a compound the page never wrote. The fixture is built by hand from a short realistic article (no network); the navbox is the
// chrome the page wears. Both doors are exercised: readDocument (the cast the entry reports) and the Fold's perceiver (the EOReferent@1 addresses on the log).
import test from "node:test";
import assert from "node:assert/strict";
import { readDocument } from "../../reading.js";
import { assertCanon, perceive, referentsOf } from "../../the-fold/identity-fixture.mjs";

const ARTICLE = [
  "Port Aldermere is a harbour town on the northern coast. The town was founded in August 1842 by merchants from Lowmoor.",
  "Prince Andrew opened the new quay in 1911, and the harbour board named the quay for Prince Andrew. Dow Chemical later built a plant near the quay.",
  "Lowmoor merchants financed the first breakwater. The breakwater failed in the storm of 1877, and Lowmoor merchants paid for its repair.",
  "The Dow Jones average fell sharply after the plant closed. Prince Andrew visited the town again in 1926.",
].join(" ");
const GROUPS = [["Months", ["January", "February", "March", "August", "September", "October"]], ["Royalty", ["Prince Andrew", "Prince Edward", "Prince Harry"]], ["Indices", ["DOW", "FTSE", "NASDAQ"]]];
const ITEMS = GROUPS.flatMap(([head, items]) => [head, ...items]);
const NAV = {
  bullet: GROUPS.map(([h, xs]) => `${h}: ${xs.join(" • ")}`).join("\n"),
  newline: GROUPS.map(([h, xs]) => [h, ...xs].join("\n")).join("\n"),
  flat: GROUPS.map(([h, xs]) => `${h} ${xs.join(" ")}`).join(" "),
};
const toks = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const has = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) if (needle.every((t, j) => hay[i + j] === t)) return true; return false; };
/** the navbox items a candidate name swallows whole — two or more is a compound the page never wrote */
const swallowed = (surface) => { const t = toks(surface); return ITEMS.filter((it) => has(t, toks(it))); };
const compounds = (surfaces) => surfaces.filter((s) => swallowed(s).length >= 2);

const read = (t) => readDocument(t, { language: "en", minCharacters: 0, lexicon: false });
// a navbox at the top and again at the foot, as encyclopedia templates repeat on a page: the items recur, so the perceiver (which drops one-offs) must face them
const page = (nav) => `${ARTICLE}\n\n${nav}`;
const twice = (nav) => `${nav}\n\n${ARTICLE}\n\n${nav}`;

test("canon: the reader is not degraded", async () => { await assertCanon(assert); });

test("control: the article alone has a clean cast — Prince Andrew, Dow Jones, Lowmoor, Aldermere — and no compound", async () => {
  const r = await read(ARTICLE);
  const all = r.cast.flatMap((c) => c.allSurfaces);
  for (const want of ["Prince Andrew", "Lowmoor", "Aldermere"]) assert.ok(all.includes(want), `${want} is in the cast`);
  assert.deepEqual(compounds(all), []);
});

test("fixture: the compounding check can fail (a hand-made compound is caught; a single item and a prose name are not)", () => {
  assert.deepEqual(compounds(["January February March August", "Prince Harry Indices", "October Royalty"]).length, 3);
  assert.deepEqual(compounds(["Prince Andrew", "August", "Dow Jones", "Port Aldermere"]), []);
});

// readDocument: the cast the entry reports. Measured on 2aa08b3: the bullet form compounds across the line break ("October Royalty", "Prince Harry Indices"), the
// newline and flat forms run the months together ("January February March August") and fold "August" into that run.
test("readDocument: bullet-separated navbox does not compound names across items or line breaks", { todo: "the cast reports 'October Royalty' and 'Prince Harry Indices': a capitalised run crosses the line break after the last link" }, async () => {
  const r = await read(page(NAV.bullet));
  assert.deepEqual(compounds([...r.cast, ...r.heard].flatMap((c) => c.allSurfaces)), []);
});
test("readDocument: newline-separated navbox does not compound names across items", { todo: "the cast reports 'January February March August' as one being, its allSurfaces folding 'August' in: newlines do not end a capitalised run" }, async () => {
  const r = await read(page(NAV.newline));
  assert.deepEqual(compounds([...r.cast, ...r.heard].flatMap((c) => c.allSurfaces)), []);
});
test("readDocument: flattened (space-separated) navbox does not compound names across items", { todo: "the cast reports 'January February March August' as one being: adjacent link texts with nothing between them are read as one name" }, async () => {
  const r = await read(page(NAV.flat));
  assert.deepEqual(compounds([...r.cast, ...r.heard].flatMap((c) => c.allSurfaces)), []);
});
test("readDocument: the article's own names keep their own surfaces when a navbox is present (no nav item is folded into Prince Andrew)", async () => {
  for (const nav of Object.values(NAV)) {
    const r = await read(page(nav));
    const row = r.cast.find((c) => c.allSurfaces.includes("Prince Andrew"));
    assert.ok(row);
    assert.deepEqual(row.allSurfaces.filter((s) => !["Prince Andrew", "Andrew", "Prince"].includes(s)), []);
  }
});

// the Fold's perceiver: the same chrome, recurring (top and foot)
// Measured on 2aa08b3: all three forms put compounds on the log as EOReferent@1 addresses (see each failure for the surfaces).
for (const [form, nav] of Object.entries(NAV)) {
  test(`perceiver (${form} navbox, repeated): no EOReferent@1 address is a compound of navbox items`, { todo: `the perceiver's capitalised-run tier admits a run of link texts as one address once the navbox recurs (${form})` }, async () => {
    const refs = referentsOf(await perceive(twice(nav)));
    const surfaces = [...refs.values()].flat();
    assert.deepEqual(compounds(surfaces), [], JSON.stringify(surfaces));
  });
}
