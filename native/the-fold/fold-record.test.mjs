import test from "node:test";
import assert from "node:assert/strict";
import { claimAt, pointerOf, appendClaims, claimsAt, projectRecord, spokenFrom, holonOfSource, turnAddress, FOLD_RECORD_SCHEMA } from "./fold-record.js";
import { buildWarrantRecord } from "./fold.js";

const S1 = "The Eiffel Tower is 330 metres tall.", S2 = "It was completed in 1889.";
const claims = (turn, texts) => texts.map((t, i) => claimAt(turn, i + 1, "said", t, { turn })).filter(Boolean);

test("a source address becomes a holon path; distinct refs never collide", () => {
  assert.equal(holonOfSource("a/b c#3-9"), "/s/a~b~c/3-9");
  assert.notEqual(holonOfSource("a//b#1-2"), holonOfSource("a/b#1-2"));
  assert.equal(holonOfSource(""), null);
});

test("a claim sits at /t<turn>/c<i>, keeps the text verbatim, and empty text is no claim", () => {
  const c = claimAt(7, 2, "said", S1, { support: "r#1-2" });
  assert.equal(c.ground, "/t7/c2"); assert.equal(c.id, "t7c2"); assert.equal(c.roles.ARG1, S1); assert.equal(c.basis.support, "r#1-2");
  assert.equal(claimAt(7, 3, "said", "   "), null);
});

test("ROUND TRIP: the store alone rebuilds what was said; the bounded view is a cut, the store is not", () => {
  const cs = claims(7, [S1, S2]);
  const store = appendClaims([], cs);
  const rec = { ...buildWarrantRecord({ turn: 7, gist: "x" }), ...pointerOf({ turn: 7, claims: cs }) };
  assert.equal(rec.schema, FOLD_RECORD_SCHEMA);
  assert.equal(spokenFrom(rec, store), `${S1} ${S2}`);
  assert.equal(projectRecord(rec, store, { max: 20 }).length, 20);
  assert.equal(spokenFrom(rec, store), `${S1} ${S2}`);
});

test("append-only and idempotent; another turn's claims never leak into this address; inputs are not mutated", () => {
  const a = claims(1, [S1, S2]), b = claims(2, ["Other."]);
  const s0 = appendClaims([], a);
  const s1 = appendClaims(appendClaims(s0, b), a);
  assert.equal(s0.length, 2); assert.equal(s1.length, 3);
  assert.deepEqual(claimsAt(turnAddress(2), s1).map((c) => c.roles.ARG1), ["Other."]);
});

test("an old-shape warrant record has no pointer; a record without an address projects to null", () => {
  const old = buildWarrantRecord({ turn: 1, gist: "g" });
  assert.equal(old.address, undefined);
  assert.equal(projectRecord(old, []), null);
});

test("lanes: a reasoner's derivation sits at /t<turn>/d<i> beside the surface's /c<i>, never colliding, and reads back after them", () => {
  const c = claimAt(7, 1, "said", S1);
  const d = claimAt(7, 1, "derives", "the tower is taller than 300 metres", { derived: true }, { lane: "d", arg0: "janus" });
  assert.equal(d.ground, "/t7/d1"); assert.equal(d.id, "t7d1"); assert.equal(d.roles.ARG0, "janus");
  assert.equal(claimAt(7, 1, "x", "y", null, { lane: "CC" }), null, "a lane is one lowercase letter");
  const store = appendClaims(appendClaims([], [d]), [c]);
  assert.deepEqual(claimsAt("/t7", store).map((x) => x.id), ["t7c1", "t7d1"]);
});
