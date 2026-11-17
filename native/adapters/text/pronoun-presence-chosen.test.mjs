// the canonical dials are pinned to the file the preregistration's own procedure wrote; the control arm's dials are NOT the canonical ones.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { PRONOUN_PRESENCE_CHOSEN, PRONOUN_PRESENCE_PROVENANCE, chosenPronounPresence, PRONOUN_PRESENCE_DEFAULT, PRONOUN_PRESENCE_DEFAULT_PROVENANCE, defaultPronounPresence } from "./pronoun-presence-chosen.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FILE = JSON.parse(fs.readFileSync(path.join(ROOT, "eval/referents/PRESENCE-DIALS-B.json"), "utf8"));
test("the canonical dials equal PRESENCE-DIALS-B.json (what the preregistered rule chose)", () => {
  for (const k of ["window", "boost", "feed", "floor", "margin"]) assert.equal(PRONOUN_PRESENCE_CHOSEN[k], FILE.dials[k], k);
  assert.equal(PRONOUN_PRESENCE_PROVENANCE.onB.right, FILE.onB.right); assert.equal(PRONOUN_PRESENCE_PROVENANCE.onB.wrong, FILE.onB.wrong);
});
test("the chosen dials are the preregistered, historical ones and are NOT the canonical read's default", () => {
  assert.notDeepEqual({ window: PRONOUN_PRESENCE_CHOSEN.window, boost: PRONOUN_PRESENCE_CHOSEN.boost, floor: PRONOUN_PRESENCE_CHOSEN.floor, margin: PRONOUN_PRESENCE_CHOSEN.margin }, { window: PRONOUN_PRESENCE_DEFAULT.window, boost: PRONOUN_PRESENCE_DEFAULT.boost, floor: PRONOUN_PRESENCE_DEFAULT.floor, margin: PRONOUN_PRESENCE_DEFAULT.margin });
});
test("the canonical default is the control arm's dials, with the measured provenance and a provisional status", () => {
  assert.deepEqual({ ...PRONOUN_PRESENCE_DEFAULT }, { window: 4, boost: 2, feed: 1, floor: 2, margin: 0.3, locality: false, language: "en" });
  assert.equal(PRONOUN_PRESENCE_DEFAULT_PROVENANCE.heldOut.documents, 125); assert.ok(PRONOUN_PRESENCE_DEFAULT_PROVENANCE.heldOut.controlPrecision > PRONOUN_PRESENCE_DEFAULT_PROVENANCE.heldOut.chosenPrecision);
  assert.match(PRONOUN_PRESENCE_DEFAULT_PROVENANCE.status, /provisional/); assert.ok(Object.isFrozen(PRONOUN_PRESENCE_DEFAULT)); const a = defaultPronounPresence(); a.floor = 0; assert.equal(defaultPronounPresence().floor, 2);
});
test("frozen, and the helper returns an independent copy", () => {
  assert.ok(Object.isFrozen(PRONOUN_PRESENCE_CHOSEN)); const a = chosenPronounPresence(); a.window = 99; assert.equal(PRONOUN_PRESENCE_CHOSEN.window, 3); assert.equal(chosenPronounPresence().window, 3);
});
