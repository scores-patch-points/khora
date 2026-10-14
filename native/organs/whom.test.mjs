import test from "node:test";
import assert from "node:assert/strict";
import { makePinax } from "./pinax.js";
import { readWhom, restrictWhom, heldIn, sentenceHeld, whomStemDf, seamsOf, VOID_READER } from "./whom.js";

const pin = (name, text) => makePinax({ url: `whom:${name}`, raw: text, text, extractor: { name: "test" } });

test("W is bytes: blank-line blocks in thread order, each addressed into W's own pinned text", async () => {
  const w = readWhom([await pin("thread.md", "What did the House do?\n\nThe House passed the bill.\nIt went to the Senate.\n\n\n"), await pin("seen.md", "A page I read.")]);
  assert.equal(w.size, 3);
  assert.deepEqual(w.units.map((u) => u.text), ["What did the House do?", "The House passed the bill. It went to the Senate.", "A page I read."]);
  assert.ok(w.units.every((u) => /^px_[0-9a-f]{20}\/text@[0-9a-f]{12}#b\d+-\d+$/.test(u.at)));
  assert.equal(readWhom([]), VOID_READER);
  assert.equal(readWhom([await pin("empty.md", "\n\n")]), VOID_READER, "a file of nothing is the void reader, not a reader holding nothing");
});

test("held is exact containment on normalized bytes; the void reader holds nothing", async () => {
  const w = readWhom([await pin("t.md", "Shown:  “On July 14, 2026, the House\npassed a bill.”")]);
  assert.ok(heldIn(w, "the House passed a bill"));
  assert.equal(heldIn(w, "the House passed the bill"), null, "one byte differs: not held");
  assert.equal(heldIn(VOID_READER, "anything"), null);
  const s = { text: "As X puts it, “the House passed a bill.”", segs: [{ kind: "frame", t: "As X puts it, “" }, { kind: "source", t: "the House\npassed a bill", address: "a" }, { kind: "frame", t: ".”" }] };
  assert.ok(sentenceHeld(w, s));
  assert.equal(sentenceHeld(w, { ...s, segs: [...s.segs, { kind: "source", t: "the Senate", address: "b" }] }), null, "every copied segment must be held");
  assert.ok(sentenceHeld(readWhom([await pin("t.md", "No claim recurs.")]), { text: "No claim recurs.", segs: [{ kind: "frame", t: "No claim recurs." }] }), "frame-only: its whole text");
});

test("restrict keeps the most recent units; depth 0 is the void reader; stems count once per unit", async () => {
  const w = readWhom([await pin("t.md", "House one\n\nSenate two\n\nHouse House three")]);
  assert.deepEqual(restrictWhom(w, 2).units.map((u) => u.text), ["Senate two", "House House three"]);
  assert.equal(restrictWhom(w, 0), VOID_READER);
  assert.equal(whomStemDf(w).get("hous"), 2);
});

test("seam density: words and bytes by provenance kind, seams between kinds, the mouth typed self:model", () => {
  const r = seamsOf([{ segs: [{ kind: "frame", t: "As " }, { kind: "source", t: "the House passed" }, { kind: "value", t: "3" }, { kind: "frame", t: " pages, " }, { kind: "model", t: "indeed" }, { kind: "frame", t: "." }] }]);
  assert.deepEqual(r.kinds, { frame: { words: 2, bytes: 11 }, source: { words: 3, bytes: 16 }, value: { words: 1, bytes: 1 }, "self:model": { words: 1, bytes: 6 } });
  assert.equal(r.seams, 4, "frame|source|value|frame|self:model — the trailing '.' carries no word and makes no seam");
  assert.equal(r.density, +(4 / 7).toFixed(4));
});
