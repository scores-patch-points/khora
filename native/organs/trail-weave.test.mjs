// trail-weave.test.mjs — Wilson's deposits reach Penelope's mark door, and nothing goes around her.
// A fake door stands in for her; the last test uses a real Penelope checkout when PENELOPE_HOME names one
// (with PENELOPE_PHAROS_TEST_JSON, a pharos pointer), and skips typed otherwise.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { configure, depositLogged, sendDeposit, flush, status, markOf, TRAIL_KIND, TRAIL_CELL } from "./trail-weave.mjs";
import { deposit, routeOrderFor } from "../kernel/stigmergy.js";

const EV = [
  { head: "mayor", route: "wiki", ok: true, ms: 40, at: 1000 },
  { head: "mayor", route: "web", ok: false, ms: 90, at: 2000 },
  { head: "president", route: "local", ok: true, ms: 5, at: 3000 },
];
const door = (reply) => { const got = []; const f = async (url, o) => { got.push({ url, mark: JSON.parse(o.body), headers: o.headers }); return reply(got.length); }; return { got, f }; };
const res = (status, j) => ({ ok: status >= 200 && status < 300, status, json: async () => j });

test("no address: the sink is off, says why, sends nothing, and the deposit still lands in the trails", async () => {
  const d = door(() => res(200, { ok: true }));
  const s = configure({ url: "", fetch: d.f });
  assert.equal(s.on, false); assert.match(s.why, /PENELOPE_WEAVE_URL is not set/);
  assert.equal(depositLogged({}, EV[0], "t").mayor.length, 1);
  await flush(); assert.equal(d.got.length, 0);
});

test("depositLogged gives exactly the kernel's trails, sink on or off", async () => {
  configure({ url: "http://p", fetch: door(() => res(200, { ok: true })).f });
  let a = {}, b = {}; for (const e of EV) { a = depositLogged(a, e, "t"); b = deposit(b, e); }
  await flush(); assert.deepEqual(a, b);
  assert.deepEqual(routeOrderFor(a, "mayor", { now: 5000, routes: ["web", "wiki"], explore: 0 }), routeOrderFor(b, "mayor", { now: 5000, routes: ["web", "wiki"], explore: 0 }));
});

test("each deposit is one mark at her door: bylined by organ, witnessed, kind and cell and declaration, in order", async () => {
  const d = door(() => res(200, { ok: true, id: "x" }));
  configure({ url: "http://p/", log: "khora-test", fetch: d.f });
  for (const e of EV) depositLogged({}, e, "hard-read");
  await flush();
  assert.equal(d.got.length, 3); assert.equal(d.got[0].url, "http://p/v1/weave/mark");
  const m = d.got[0].mark;
  assert.equal(m.by, "khora.hard-read"); assert.equal(m.log, "khora-test"); assert.equal(m.kind, TRAIL_KIND); assert.equal(m.cell, TRAIL_CELL);
  assert.equal(m.addr, "trail:mayor"); assert.deepEqual(m.body, { head: "mayor", route: "wiki", ok: true, ms: 40, at: 1000, organ: "hard-read" });
  assert.match(m.witness.how, /observed/); assert.ok(m.declare.why.length > 10);
  assert.deepEqual(d.got.map((g) => g.mark.body.at), [1000, 2000, 3000]);
  assert.deepEqual((({ sent, woven, refused, unreachable }) => ({ sent, woven, refused, unreachable }))(status()), { sent: 3, woven: 3, refused: 0, unreachable: 0 });
  assert.deepEqual(markOf({ head: "h", route: "r", ok: false, ms: 1, at: 2, veto: true }, "x y").by, "khora.x-y");
});

test("unreachable: counted, never thrown, and she is not asked again until the retry time has passed", async () => {
  let t = 0; const calls = [];
  configure({ url: "http://p", retryMs: 1000, now: () => t, fetch: async () => { calls.push(t); const e = new Error("fetch failed"); e.cause = { code: "ECONNREFUSED" }; throw e; } });
  const trails = depositLogged({}, EV[0], "t"); sendDeposit(EV[1], { organ: "t" });
  await flush();
  assert.equal(trails.mayor.length, 1);
  assert.equal(calls.length, 1); assert.equal(status().unreachable, 1); assert.equal(status().skipped, 1); assert.equal(status().lastReason, "ECONNREFUSED");
  t = 1001; sendDeposit(EV[2], { organ: "t" }); await flush();
  assert.equal(calls.length, 2);
});

test("refused: a refusal is counted with her reason; a 503 (loom off) backs off, a 400 does not", async () => {
  let t = 0; const d = door((n) => (n === 1 ? res(400, { ok: false, reason: "no_witness" }) : res(503, { ok: false, reason: "loom_off" })));
  configure({ url: "http://p", retryMs: 1000, now: () => t, fetch: d.f });
  for (const e of EV) sendDeposit(e, { organ: "t" });
  await flush();
  assert.equal(d.got.length, 2); assert.equal(status().refused, 2); assert.equal(status().skipped, 1); assert.equal(status().woven, 0);
  assert.equal(status().lastReason, "503 loom_off");
});

const HOME = process.env.PENELOPE_HOME, PTR = process.env.PENELOPE_PHAROS_TEST_JSON;
test("end to end: khora deposit -> Penelope's door -> pharos, and the trails fold back out of the log", { skip: HOME && PTR ? false : "PENELOPE_HOME and PENELOPE_PHAROS_TEST_JSON are not both set (penelope-absent)" }, async () => {
  const logs = fs.mkdtempSync(path.join(os.tmpdir(), "trail-e2e-"));
  process.env.PENELOPE_PHAROS_JSON = PTR; process.env.PHAROS = logs; process.env.HEIMDALL_HOME = path.join(logs, "absent");
  const { startMouth } = await import(pathToFileURL(path.join(HOME, "mouth/server.mjs")).href);
  const server = startMouth({ port: 0 }); await new Promise((r) => server.once("listening", r));
  try {
    configure({ url: `http://127.0.0.1:${server.address().port}`, log: "khora-e2e" });
    let mem = {}; for (const e of EV) mem = depositLogged(mem, e, "hard-read");
    await flush();
    assert.deepEqual((({ woven, refused, unreachable }) => ({ woven, refused, unreachable }))(status()), { woven: 3, refused: 0, unreachable: 0 }, String(status().lastReason));
    const lines = fs.readFileSync(path.join(logs, "penelope.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const deps = lines.filter((e) => e.kind === TRAIL_KIND);
    assert.equal(deps.length, 3); assert.equal(deps[0].by, "penelope"); assert.equal(deps[0].basis.asked_by, "khora.hard-read"); assert.equal(deps[0].cell, TRAIL_CELL);
    let back = {}; for (const e of deps) back = deposit(back, e.body); // the log alone carries the state
    assert.deepEqual(back, mem);
  } finally { server.close(); delete process.env.PENELOPE_PHAROS_JSON; delete process.env.PHAROS; }
});
