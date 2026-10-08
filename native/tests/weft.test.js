// native/tests/weft.test.js — the weft: the reading log the holograph is projected from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWeft, appendPass, clothAt, reopen, mouthFacing, holonAddress, weftAttestations, weftReferents, WEFT_ENTRY_SCHEMA, WEFT_ATTESTATION_SCHEMA } from "../the-fold/weft.js";

const pass = (address, cast, relations) => ({ address, cast, relations });

const P1 = pass("a.txt", [{ ref: "ref:auto:stevenson", surface: "Stevenson", mentionsAt: [10, 40] }], [{ relation: "wrote", participants: [{ ref: "x", surface: "Stevenson", standing: "referent" }, { ref: "y", surface: "Treasure Island", standing: "referent" }], scope: { byteOffset: 12 } }]);
const P2 = pass("b.txt", [{ ref: "ref:auto:stevenson", surface: "Stevenson", mentionsAt: [5] }, { ref: "ref:auto:machiavelli", surface: "Machiavelli", mentionsAt: [3] }], []);

test("appendPass is immutable (P1): a new weft, the old untouched", () => {
  const w0 = emptyWeft();
  const w1 = appendPass(w0, P1);
  assert.equal(w0.length, 0);
  assert.equal(w1.length, 1);
  assert.equal(w1[0].schema, WEFT_ENTRY_SCHEMA);
  assert.equal(w1[0].seq, 0);
});

test("appendPass refuses a pass with no address (a reading is always somewhere)", () => {
  assert.throws(() => appendPass(emptyWeft(), { cast: [] }), /address/);
});

test("clothAt folds at a cursor (P3): an early cursor excludes a later pass", () => {
  const w = appendPass(appendPass(emptyWeft(), P1), P2);
  const early = clothAt(w, { asOf: 0 });
  assert.equal(early.passes, 1);
  assert.equal(early.referents.length, 1);
  const full = clothAt(w);
  assert.equal(full.passes, 2);
  assert.equal(full.referents.length, 2);              // Stevenson (one holon, two addresses) + Machiavelli
  const stev = full.referents.find((r) => r.ref === "ref:auto:stevenson");
  assert.equal(stev.mentionsAt.length, 3);             // [10,40] from a.txt + [5] from b.txt — one being, many addresses
  assert.deepEqual([...stev.mentionsAt].sort((a, b) => a - b), [5, 10, 40]);
});

test("every holon carries a permanent address (<source>#<byte>)", () => {
  const cloth = clothAt(appendPass(emptyWeft(), P1));
  assert.equal(cloth.referents[0].address, "a.txt#10");
  assert.equal(cloth.relations[0].address, "a.txt#12");
  assert.equal(holonAddress("a.txt", 10), "a.txt#10");
});

test("reopen re-expands an address to the verbatim bytes (reader injected)", () => {
  const text = "the quick brown fox jumps over the lazy dog";
  const r = reopen("book.txt#4", { read: (s) => (s === "book.txt" ? text : null), span: 5 });
  assert.equal(r.text, "quick");
  assert.equal(reopen("book.txt#4").gap, "no_reader_injected");
  assert.equal(reopen("book.txt#9999", { read: () => text }).gap, "address_out_of_range");
  assert.equal(reopen("nohash").gap, "not_an_address");
});

test("weftAttestations is the seam: one attestation per relation, carrying its address", () => {
  const w = appendPass(emptyWeft(), P1);
  const at = [...weftAttestations(w)];
  assert.equal(at.length, 1);
  assert.equal(at[0].schema, WEFT_ATTESTATION_SCHEMA);
  assert.equal(at[0].witness, "a.txt#12");             // <source>#<byteOffset> — the rule re-expands into the weft
  assert.equal(at[0].label, "wrote");
  assert.equal(at[0].left.surface, "Stevenson");
  assert.equal(at[0].right.surface, "Treasure Island");
});

test("weftAttestations folds at a cursor (a past reading attests only its own relations)", () => {
  const w = appendPass(appendPass(emptyWeft(), P1), pass("b.txt", [], [{ relation: "loved", participants: [{ surface: "A" }, { surface: "B" }], scope: { byteOffset: 1 } }]));
  assert.equal([...weftAttestations(w, { asOf: 0 })].length, 1);
  assert.equal([...weftAttestations(w)].length, 2);
});

test("weftReferents (@2 seam): a referent's COMPANY is both-bound relations, addressable", () => {
  const P = pass("a.txt",
    [{ ref: "ref:auto:stevenson", surface: "Stevenson", mentionsAt: [10] }, { ref: "ref:auto:treasure", surface: "Treasure Island", mentionsAt: [12] }],
    [{ relation: "wrote", participants: [{ ref: "ref:auto:stevenson", surface: "Stevenson", standing: "referent" }, { ref: "ref:auto:treasure", surface: "Treasure Island", standing: "referent" }], scope: { byteOffset: 12 } }]);
  const refs = [...weftReferents(appendPass(emptyWeft(), P))];
  const stev = refs.find((r) => r.ref === "ref:auto:stevenson");
  assert.deepEqual(stev.company, { "ref:auto:treasure": 1 });   // Map<ref,count> — company only, no content
  assert.equal(stev.passes, 1);
  assert.deepEqual(stev.mentionsAt, [10]);
});

test("weftReferents: an unresolved end yields no company (both-bound only)", () => {
  const P = pass("c.txt", [{ ref: "ref:auto:x", surface: "X", mentionsAt: [1] }],
    [{ relation: "of", participants: [{ ref: "ref:auto:x", surface: "X", standing: "referent" }, { ref: null, surface: "the", standing: "unresolved_surface" }], scope: { byteOffset: 1 } }]);
  const refs = [...weftReferents(appendPass(emptyWeft(), P))];
  assert.equal(refs.every((r) => Object.keys(r.company).length === 0), true);   // an unresolved end contributes no company
});

test("mouthFacing strikes every address (the shadow) and is deterministic", () => {
  const cloth = clothAt(appendPass(emptyWeft(), P1));
  const shadow = mouthFacing(cloth);
  assert.equal(shadow.referents.some((r) => "address" in r || "mentionsAt" in r), false);
  assert.equal(shadow.relations.some((r) => "address" in r), false);
  assert.deepEqual(shadow, mouthFacing(clothAt(appendPass(emptyWeft(), P1))));
});
