// tests/profile-page.test.js — the surface page draws records, decides nothing.
import test from "node:test";
import assert from "node:assert/strict";

import { profileCard, profileIndex, LEGEND, REALITY_BADGE } from "../kernel/profile-page.js";
import { levelProfile } from "../kernel/level-profile.js";

const realityReal = {
  id: "the Great Eastern",
  realityKind: "real",
  attested: [{ source: "board-of-trade-1912", register: "report", truthClaiming: true }, { source: "walker-1912", register: "comment", truthClaiming: false }],
  anchor: { found: true, extract: "SS Great Eastern was an iron-hulled steamship designed by Isambard Kingdom Brunel.", url: "https://en.wikipedia.org/wiki/SS_Great_Eastern", world: true },
};
const realityFiction = {
  id: "Jack Dawson",
  realityKind: "fictional",
  attested: [{ source: "cameron-1997", register: "fiction", truthClaiming: false }],
  anchor: { found: false, ambiguous: false },
};

test("a real thing's card shows what it is, who says so, and the badge", () => {
  const page = profileCard({ id: "the Great Eastern", year: 1858 }, { reality: realityReal });
  assert.match(page, /● real/);
  assert.match(page, /SS Great Eastern was an iron-hulled steamship/);
  assert.match(page, /TOLD BY/);
  assert.match(page, /Report · truth-claiming/);
  assert.equal(page.split("\n")[0][0], "╔");
});

test("a fictional thing's card marks the fiction source as NOT evidence", () => {
  const page = profileCard({ id: "Jack Dawson", year: 1997 }, { reality: realityFiction });
  assert.match(page, /✕ fictional/);
  assert.match(page, /Fiction · NOT evidence/);
  assert.match(page, /No world anchor found/);
});

test("claims render with their standing; disagreements surface", () => {
  const page = profileCard({ id: "Titanic" }, {
    reality: { id: "Titanic", realityKind: "fictionalized-real", attested: [], anchor: { found: false } },
    claims: [
      { text: "she was built by Harland & Wolff", standing: "agreed", sources: 4, total: 4 },
      { text: "lives lost", standing: "contested", detail: "1,500 (British report) ⟷ 1,635 (Marshall, 1912)" },
    ],
  });
  assert.match(page, /WHAT THE SOURCES SAY/);
  assert.match(page, /4 of 4 src/);
  assert.match(page, /DISAGREEMENTS/);
  assert.match(page, /1,500 \(British report\) ⟷ 1,635/);
});

test("the engine occupancy is one muted line, never the headline", () => {
  const level = levelProfile("x", [
    { referent: "x", op: "CON", grain: "Figure", domain: "Structure", cell: "CON·Figure", terrain: "Link" },
    { referent: "x", op: "SIG", grain: "Ground", domain: "Existence", cell: "SIG·Ground", terrain: "Void" },
  ]);
  const page = profileCard({ id: "x" }, { reality: { id: "x", realityKind: "real", attested: [], anchor: { found: false } }, level });
  assert.match(page, /▸ engine/);
  assert.match(page, /7\/9 terrains absent/);
});

test("an ambiguous anchor says so, with candidates, not a verdict", () => {
  const page = profileCard({ id: "Lusitania" }, {
    reality: { id: "Lusitania", realityKind: "unexamined", attested: [], anchor: { found: false, ambiguous: true, candidates: [{ title: "RMS Lusitania" }, { title: "Lusitania (disambiguation)" }] } },
  });
  assert.match(page, /examined, not convicted/);
  assert.match(page, /candidates: RMS Lusitania/);
});

test("the index groups things by reality-kind; the legend names the badges", () => {
  const idx = profileIndex({ title: "Titanic, 1912", things: [{ name: "Titanic", realityKind: "real" }, { name: "Jack Dawson", realityKind: "fictional" }] });
  assert.match(idx, /● real/);
  assert.match(idx, /✕ fictional/);
  assert.match(idx, /Titanic/);
  assert.ok(REALITY_BADGE.fictional === "✕ fictional");
  assert.ok(LEGEND.some((l) => /● real/.test(l)));
});
