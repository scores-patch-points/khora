// opencode-ledger-fold.test.mjs — the local falsifier for the ledger fold, a planted-identifier
// battery: a coined name (zorblaxK — PD1's own proven being) is planted at the start, middle, or
// end of filler prose; the projection must retain it, measured against head/tail/middle slices of
// the SAME size (the retired line-fold's nulls). Necessary, not sufficient: the real gate is the
// replay over 1,010 real tool outputs (scripts/opencode-fold-replay.mjs), absent from this checkout.
// Run with the priors discoverable: FOLD_ENG_PRIOR_DIR=…/Zenodotus/derived-priors/engineering-priors
// FOLD_POS_PRIOR=…/janus/priors/pos-eng.json (needed when khora's checkout parent has no siblings).
import test from "node:test";
import assert from "node:assert/strict";
import { ledgerFold } from "./opencode-ledger-fold.mjs";
import { loadRegister } from "./opencode-predigest.mjs";

test("LF0 the received priors are on disk (else every check below passes silently — set the env overrides)", () => {
  assert.equal(loadRegister().gap, null, `register gap: ${JSON.stringify(loadRegister().gap)}`);
});

const FILLER = [
  "the sun rose over the water",
  "she opened the door and walked home",
  "birds sang and the day ended",
  "we cooked rice and drank tea",
  "the child drew a picture of a horse",
  "rain fell all afternoon",
  "the market opened early that day",
  "they planted beans in the garden",
];
const doc = (plant, at) => {
  const lines = [];
  for (let r = 0; r < 8; r++) for (const l of FILLER) lines.push(l);
  lines.splice(at, 0, plant);
  return `${lines.join(". ")}.`;
};

test("LF1 retention: the projection keeps the planted identifier — measured against head/tail/middle at the same size, 30 cases", () => {
  let ledger = 0, head = 0, tail = 0, mid = 0, under = 0;
  for (let k = 0; k < 30; k++) {
    const plant = `Added zorblax${k}, which calls normalizeTotals`; // PD8's own proven being+relation shape
    const where = k % 3; // 0 start · 1 middle · 2 end
    const d = doc(plant, where === 0 ? 0 : where === 1 ? 32 : 64);
    const { note, chars } = ledgerFold(d, { budget: 1500 });
    if (chars < d.length) under++;
    if (note.includes(`zorblax${k}`)) ledger++;
    const size = note.length;
    if (d.slice(0, size).includes(`zorblax${k}`)) head++;
    if (d.slice(-size).includes(`zorblax${k}`)) tail++;
    const from = Math.floor((d.length - size) / 2);
    if (d.slice(from, from + size).includes(`zorblax${k}`)) mid++;
  }
  console.log(`LF1 retention of 30 plants — ledger ${ledger}, head ${head}, tail ${tail}, middle ${mid}; note under source in ${under}/30`);
  assert.equal(ledger, 30);
  assert.ok(ledger >= Math.max(head, tail, mid));
});

test("LF2 the note is bounded, addressed, and deterministic", () => {
  const d = doc("Added zorblax0, which calls normalizeTotals", 32);
  const a = ledgerFold(d, { budget: 300 });
  const b = ledgerFold(d, { budget: 300 });
  assert.equal(a.note, b.note);
  assert.ok(a.note.length <= 300);
  assert.match(a.note, /@\d+/);
  const rel = ledgerFold(d).note.split("\n").filter((l) => l.startsWith("- "));
  assert.ok(rel.length >= 1 && rel.every((l) => /@\d+$/.test(l)), `relations: ${JSON.stringify(rel)}`);
});
