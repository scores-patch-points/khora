import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect, seal, unseal, deriveKey, foldEvents, operatorsFor, turnAnchor } from "../fold-matrix.mjs";

// A minimal homeserver: login, alias directory, createRoom, join, send (txn-idempotent), messages.
function fakeServer() {
  const rooms = new Map(), aliases = new Map(); let ts = 1000;
  const json = (status, j) => ({ ok: status < 400, status, json: async () => j });
  const fetchImpl = async (url, o = {}) => {
    const u = new URL(url), p = decodeURIComponent(u.pathname.replace("/_matrix/client/v3", "")), m = o.method ?? "GET";
    const b = o.body ? JSON.parse(o.body) : {};
    if (p === "/login") return b.password === "pw" ? json(200, { user_id: "@m:hs", device_id: "D" + Math.random(), access_token: "tok" }) : json(403, { error: "bad" });
    if (!(o.headers?.authorization === "Bearer tok")) return json(401, { error: "no token" });
    if (m === "GET" && p.startsWith("/directory/room/")) { const id = aliases.get(p.slice(16)); return id ? json(200, { room_id: id }) : json(404, {}); }
    if (p === "/createRoom") { const id = "!r" + rooms.size + ":hs"; rooms.set(id, { events: [], txns: new Set() }); aliases.set(`#${b.room_alias_name}:hs`, id); return json(200, { room_id: id }); }
    if (p.startsWith("/join/")) return json(200, {});
    let r = p.match(/^\/rooms\/([^/]+)\/send\/([^/]+)\/([^/]+)$/);
    if (r) { const room = rooms.get(r[1]); if (!room.txns.has(r[3])) { room.txns.add(r[3]); room.events.push({ type: r[2], content: b, origin_server_ts: ts++ }); } return json(200, { event_id: "$e" }); }
    r = p.match(/^\/rooms\/([^/]+)\/messages$/);
    if (r) { const room = rooms.get(r[1]); const from = Number(u.searchParams.get("from") || 0); const chunk = room.events.slice(from, from + 200); return json(200, { chunk, end: String(from + chunk.length) }); }
    return json(404, {});
  };
  return { fetchImpl, rooms };
}
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "fm-"));
const row = (n, settled = true) => ({ when: `2026-10-15T10:0${n}:00.000Z`, sessionID: "ses1", address: "a" + n, ask: "secret ask " + n, answer: "secret answer", plan: [{ name: "read", ok: true }], settled, title: "t" + n, kind: "instance" });

test("sealed payloads are opaque to the server and unseal only under the same key", () => {
  const k = deriveKey("pw", "@m:hs");
  const box = seal(k, { ask: "secret" });
  assert.ok(!JSON.stringify(box).includes("secret"));
  assert.deepEqual(unseal(k, box), { ask: "secret" });
  assert.equal(unseal(deriveKey("other", "@m:hs"), box), null);
});

test("a turn from machine A resumes on machine B after the same login", async () => {
  const srv = fakeServer();
  const A = connect({ state: dir(), fetchImpl: srv.fetchImpl }), Bdir = dir(), B = connect({ state: Bdir, fetchImpl: srv.fetchImpl });
  assert.equal((await A.login({ base: "http://hs", user: "m", password: "bad" })).ok, false);
  assert.equal((await A.login({ base: "http://hs", user: "m", password: "pw" })).ok, true);
  assert.ok(A.enqueue(row(1)) && A.enqueue(row(2, false)));
  const sent = await A.push();
  assert.equal(sent.sent, 2); assert.equal(sent.pending, 0);
  for (const e of [...srv.rooms.values()][0].events) assert.ok(!JSON.stringify(e).includes("secret"));

  assert.equal((await B.login({ base: "http://hs", user: "m", password: "pw" })).ok, true);
  assert.equal(srv.rooms.size, 1, "the second machine finds the base by alias, never makes another");
  const got = await B.pull();
  assert.equal(got.added, 2); assert.equal(got.sessions, 1); assert.equal(got.violations, 0);
  const rec = fs.readFileSync(path.join(Bdir, "record.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(rec.map((r) => r.ask), ["secret ask 1", "secret ask 2"]);
  assert.equal((await B.pull()).added, 0, "pull is idempotent");
});

test("pushing the same turn twice is one entity; offline keeps the outbox", async () => {
  const srv = fakeServer(); const d = dir();
  const A = connect({ state: d, fetchImpl: srv.fetchImpl });
  await A.login({ base: "http://hs", user: "m", password: "pw" });
  A.enqueue(row(1)); A.enqueue(row(1)); await A.push();
  assert.equal([...srv.rooms.values()][0].events.length, 5, "txn ids dedupe the retry");
  const down = connect({ state: d, fetchImpl: async () => { throw new Error("offline"); } });
  down.enqueue(row(3));
  const r = await down.push();
  assert.equal(r.ok, false); assert.equal(r.pending, 1);
});

test("the fold flags an operator on an anchor that was never instantiated", () => {
  const ops = operatorsFor(row(1)).map((o, i) => ({ type: "io.fold.opencode." + o.op, content: o.content, origin_server_ts: i }));
  assert.equal(foldEvents(ops).entities[turnAnchor(row(1))]._eva.settled, "pass");
  assert.equal(foldEvents(ops.slice(2)).entities[turnAnchor(row(1))], undefined);
  assert.equal(foldEvents(ops.slice(2))._violations.length, 3);
});
