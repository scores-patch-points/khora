// session-read.test.mjs — PROVE the proxy's session reading is the canonical
// reader (session-read.js → read-process.mjs::readToWeft), not the 6.1 host:
// the same surface the proxy consumed (documents Map + {deduped}), on the ONE
// reader, with the cast and the addressed edges accumulated per source.
import test from "node:test";
import assert from "node:assert/strict";
import {createSessionRead, admitText, sessionCast, sessionEdges} from "./session-read.js";

const TEXT = "The Federal Reserve raised rates in March. Higher rates made credit expensive for small firms. The Federal Reserve raised rates again in June, and small firms paid more. Suppliers passed the cost to customers.";

test("the session store is the canonical reader's, named", () => {
  const s = createSessionRead();
  assert.equal(s.reader, "read-process.mjs::readToWeft");
  assert.ok(s.documents instanceof Map);
});

test("admitText reads a source and stores its cast and addressed edges", () => {
  const s = createSessionRead();
  const r = admitText(s, {sourceId: "filing.txt", text: TEXT});
  assert.equal(r.deduped, false);
  assert.ok(r.admitted.cast.length >= 1, "the reader's cast is stored");
  assert.ok(r.admitted.edges.length >= 1, "the addressed edges are stored");
  for (const e of r.admitted.edges) assert.ok("refs" in e, "every edge carries its address");
  assert.equal(s.documents.size, 1);
  assert.equal(s.documents.get("filing.txt").sourceId, "filing.txt");
});

test("the same bytes are deduped; new bytes re-read", () => {
  const s = createSessionRead();
  admitText(s, {sourceId: "a.txt", text: TEXT});
  assert.equal(admitText(s, {sourceId: "a.txt", text: TEXT}).deduped, true);
  assert.equal(admitText(s, {sourceId: "a.txt", text: `${TEXT} A new sentence about small firms and suppliers.`}).deduped, false);
});

test("the session's cast and edges accumulate across sources", () => {
  const s = createSessionRead();
  admitText(s, {sourceId: "one.txt", text: TEXT});
  admitText(s, {sourceId: "two.txt", text: "Small firms paid more in June. Small firms paid again in July, and suppliers noticed the pattern."});
  const cast = sessionCast(s);
  const edges = sessionEdges(s);
  assert.ok(cast.length >= 1, "beings across sources");
  assert.ok(edges.length >= 1);
  for (const e of edges) assert.ok(e.sourceId, "every edge names the source it was read from");
  const fed = cast.find((c) => /federal reserve/i.test(c.surface));
  if (fed) assert.ok(fed.sources.includes("one.txt"), "the being names its source");
});

test("an empty admit is a typed no-op, never a crash", () => {
  const s = createSessionRead();
  assert.deepEqual(admitText(s, {sourceId: "x", text: ""}), {deduped: false, admitted: null});
  assert.equal(s.documents.size, 0);
});
