// native/tests/sidecar-addressable.test.js — the reading must be ADDRESSABLE.
//
// FOUNDATION (2026-10-07). The reader computes a byte anchor per mention (EOMention@1) and a byteOffset per
// relation edge, plus each participant's standing (referent | unresolved_surface | hypothesis). The session
// projection used to throw all of it away, leaving the sidecar with {ref, surface} only — un-auditable and
// un-re-parseable. These tests pin the preservation: a cast referent carries its mention addresses and a
// relation carries its edge address and each end's standing. The reader itself is unchanged; only the
// projection retains what was already computed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, admitChunked, sessionReferents, sessionRelations } from "../the-fold/corpus-session.js";

const TEXT = "Robert Louis Stevenson wrote Treasure Island. Stevenson loved Treasure Island. The island was remote.";

test("sessionReferents carries a finite byte address per mention (addressable cast)", async () => {
  const session = createSession();
  admitChunked(session, { text: TEXT, sourceId: "doc:t" });
  const { referents } = await sessionReferents(session, { sourceId: "doc:t" });
  const withAt = referents.filter((r) => Array.isArray(r.mentionsAt) && r.mentionsAt.length > 0);
  assert.ok(withAt.length >= 1, "at least one referent carries mention addresses");
  for (const r of withAt) for (const a of r.mentionsAt) assert.ok(Number.isFinite(a), `address is a finite byte offset (${r.id})`);
});

test("sessionRelations carries an edge byte address and each end's standing", async () => {
  const session = createSession();
  admitChunked(session, { text: TEXT, sourceId: "doc:t" });
  const { relations } = await sessionRelations(session, { sourceId: "doc:t" });
  assert.ok(relations.length >= 1, "a relation was read");
  for (const r of relations) {
    assert.ok(r.scope && Number.isFinite(r.scope.byteOffset), `edge carries an absolute byte offset (${r.relation})`);
    assert.equal(r.participants.length >= 2, true, "a relation has two ends");
    for (const p of r.participants) assert.equal(typeof p.standing, "string", `end carries a standing (${r.relation})`);
  }
});

test("the address is not a position guess: it lands inside the document", async () => {
  const session = createSession();
  admitChunked(session, { text: TEXT, sourceId: "doc:t" });
  const { referents } = await sessionReferents(session, { sourceId: "doc:t" });
  const at = referents.flatMap((r) => r.mentionsAt ?? []);
  assert.ok(at.length >= 1, "there is at least one address to check");
  const bytes = Buffer.byteLength(TEXT);
  for (const a of at) assert.ok(a >= 0 && a <= bytes, `address ${a} lies within the document (0..${bytes})`);
});
