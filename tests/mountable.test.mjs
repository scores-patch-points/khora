// tests/mountable.test.mjs — proxy.mjs is MOUNTABLE: importing it is inert, and
// createKhoraHandlers() hands the Fold the request handler plus an idempotent
// start()/close() — while `node proxy.mjs` keeps its exact ports and shutdown.
//
// Everything here runs on ephemeral/spare ports with HOME and every ER7_* state
// file pointed at a temp dir. The reaper and the daemon reconciler (which QUIT
// processes) are switched off, the model daemon address is a dead spare port,
// and the watcher's registry holds only this test's own surface — nothing here
// can touch a real port, a real ollama, or the live proxy.
//
//   node --test tests/mountable.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROXY = path.join(ROOT, "proxy.mjs");

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once("error", reject);
  s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const count = (kind) => process.getActiveResourcesInfo().filter((r) => r === kind).length;
const timers = () => count("Timeout");
// What is live that a close() must have ended. A heimdall probe already in
// flight (an execFile of vm_stat/top/lsof, with its own timeout timer) may
// outlive close() by however long the box takes to answer it — it cannot be
// cancelled from here and it never re-arms — so "nothing left" is polled for,
// generously, rather than demanded the instant close() returns.
const live = () => ({ timers: timers(), procs: count("ProcessWrap") });
async function settlesTo(base, ms = 180000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const l = live(); if (l.timers <= base.timers && l.procs <= base.procs) return true; await sleep(250); }
  return false;
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "khora-mount-"));
const P = { proxy: await freePort(), alias: await freePort(), channel: await freePort(), dead: await freePort(), mainProxy: 18436, mainAlias: 18437 };

/** An environment in which nothing can reach the real machine. */
function sandboxEnv(extra = {}) {
  const f = (n) => path.join(TMP, n);
  return {
    ...process.env,
    HOME: TMP,
    ER7_PROXY_PORT: String(P.proxy), ER7_HEIMDALL_PORT: String(P.alias),
    ER7_CHANNEL_PORT: String(P.channel), ER7_OLLAMA_URL: `http://127.0.0.1:${P.dead}`, ER7_UPSTREAM: `http://127.0.0.1:${P.dead}`,
    ER7_SURFACES: `er7:${P.proxy}:${TMP}:true`, // the watcher knows only this test's own surface; `true` re-forges nothing
    ER7_REAP_OFF: "1", ER7_RECONCILE_OFF: "1", // the two acts that QUIT other processes
    ER7_DRIVER_LOCK: f("driver.lock"), ER7_TERRITORY_CACHE_DIR: f("territory"),
    ER7_HEIMDALL_LOG_FILE: f("heimdall-log.jsonl"), ER7_SETTINGS_FILE: f("settings.json"),
    ER7_DERIVED_RULES_FILE: f("derived-rules.json"), ER7_TRIALS_FILE: f("trials.json"),
    ER7_CODING_TRIAL_ACTIVE: f("trial-active.json"), ER7_CODING_POLICY_FILE: f("coding-policy.json"),
    ER7_CODING_TRIALS_LOG: f("coding-trials.jsonl"), ER7_CONTENT_RULES_FILE: f("content-rules.json"),
    ER7_FACTS_FILE: f("facts.json"), ER7_EARNED_DIR: f("earned"), ER7_LEARNED_DIR: f("learned"),
    ER7_ONLINE_KEYS_FILE: f("online-keys.json"), ER7_SCREEN_DIR: f("screen"), ER7_SHADOW_DIR: f("shadow"),
    ER7_HEIMDALL_PEERS_FILE: f("peers"), ER7_TALK_SOURCES: "0", ER7_KEEP_ALIVE_S: "60",
    ...extra,
  };
}
Object.assign(process.env, sandboxEnv()); // before the in-process import below

const get = (port, p, method = "GET", body = null) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port, path: p, method, headers: body ? { "content-type": "application/json" } : {} }, (res) => {
    let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: b }));
  });
  req.on("error", reject);
  if (body) req.write(body);
  req.end();
});

/** A throwaway Fold: one http server whose only door is khora's handle(). */
async function mount(khora) {
  const seen = [];
  const server = http.createServer(async (req, res) => { seen.push(await khora.handle(req, res)); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { port: server.address().port, seen, stop: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
}

test("import is inert: no listener, no handle, no signal handler, and the process exits by itself", async () => {
  const probe = path.join(TMP, "probe.mjs");
  fs.writeFileSync(probe, `
    import net from "node:net";
    const listens = []; const orig = net.Server.prototype.listen;
    net.Server.prototype.listen = function (...a) { listens.push(a[0]); return orig.apply(this, a); };
    process.stdout; process.stderr; // materialise the std pipes before the baseline
    const h0 = process._getActiveHandles().length, t0 = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
    const sig0 = process.listenerCount("SIGTERM") + process.listenerCount("SIGINT");
    const m = await import(${JSON.stringify(pathToFileURL(PROXY).href)});
    await new Promise((r) => setTimeout(r, 400));
    const after = {
      listens: listens.length, handles: process._getActiveHandles().length - h0,
      timers: process.getActiveResourcesInfo().filter((r) => r === "Timeout").length - t0,
      sig: process.listenerCount("SIGTERM") + process.listenerCount("SIGINT") - sig0,
    };
    const connects = await Promise.all([${P.proxy}, ${P.alias}, ${P.channel}].map((p) => new Promise((r) => {
      const c = net.connect(p, "127.0.0.1"); c.on("connect", () => { c.destroy(); r("open"); }); c.on("error", (e) => r(e.code));
    })));
    console.log(JSON.stringify({ ...after, connects, exports: Object.keys(m) }));
  `);
  const child = spawn(process.execPath, [probe], { cwd: ROOT, env: sandboxEnv(), stdio: ["ignore", "pipe", "pipe"] });
  let out = "", err = "";
  child.stdout.on("data", (c) => (out += c)); child.stderr.on("data", (c) => (err += c));
  const killer = setTimeout(() => child.kill("SIGKILL"), 240000);
  const [code, signal] = await new Promise((r) => child.on("exit", (c, s) => r([c, s])));
  clearTimeout(killer);
  assert.equal(signal, null, `the importing process had to be killed — something kept it alive\n${err}`);
  assert.equal(code, 0, err);
  const r = JSON.parse(out.trim().split("\n").pop());
  assert.equal(r.listens, 0, "importing proxy.mjs opened a listener");
  assert.equal(r.handles, 0, "importing proxy.mjs left an active handle");
  assert.equal(r.timers, 0, "importing proxy.mjs left a timer");
  assert.equal(r.sig, 0, "importing proxy.mjs installed a SIGINT/SIGTERM handler");
  assert.deepEqual(r.connects, ["ECONNREFUSED", "ECONNREFUSED", "ECONNREFUSED"], "a port answered after a bare import");
  assert.ok(r.exports.includes("createKhoraHandlers"));
});

const { createKhoraHandlers } = await import(pathToFileURL(PROXY).href);

test("createKhoraHandlers returns the contract shape", async () => {
  const k = createKhoraHandlers({ port: P.proxy, warm: false });
  assert.equal(k.name, "khora");
  for (const m of ["handle", "handleChannel", "start", "close"]) assert.equal(typeof k[m], "function", m);
  await k.close(); // close before start is a no-op
});

test("handle serves GET /, GET /health and the typed 404, always reporting it consumed the request", async () => {
  const k = createKhoraHandlers({ port: P.proxy, warm: false });
  const m = await mount(k);
  try {
    const root = await get(m.port, "/");
    assert.equal(root.status, 200);
    assert.equal(JSON.parse(root.body).eoreader7, true);
    assert.equal(root.headers["access-control-allow-origin"], "*");

    const health = await get(m.port, "/health");
    assert.equal(health.status, 200);
    const h = JSON.parse(health.body);
    assert.equal(h.status, "ok");
    assert.equal(h.upstream, `http://127.0.0.1:${P.dead}`);

    assert.equal((await get(m.port, "/x", "OPTIONS")).status, 204);

    const nope = await get(m.port, "/no/such/route");
    assert.equal(nope.status, 404);
    assert.equal(JSON.parse(nope.body).type, "unserved_path");

    assert.ok(m.seen.length >= 4 && m.seen.every((v) => v === true), "khora always answers, so handle() always returns true (the Fold orders khora last)");
  } finally { await m.stop(); await k.close(); }
});

test("handle never throws out: a malformed request becomes a response, not a rejection", async () => {
  const k = createKhoraHandlers({ port: P.proxy, warm: false });
  const m = await mount(k);
  try {
    const r = await get(m.port, "/v1/ask", "POST", "{not json");
    assert.ok(r.status >= 400 && r.status < 600, `got ${r.status}`);
    // a req/res that cannot even be written to must still resolve (true), not reject
    const bad = await k.handle({ method: "GET", url: "/", headers: {} }, {});
    assert.equal(bad, true);
    const badChannel = await k.handleChannel({ method: "GET", url: "/", headers: {}, socket: null }, {});
    assert.equal(badChannel, true);
  } finally { await m.stop(); await k.close(); }
});

for (const external of [false, true]) {
  test(`start() is idempotent and close() leaves nothing behind (${external ? "external-heimdall mode: vitals + holon-driver timers" : "in-process watcher mode"})`, async () => {
    process.env.ER7_EXTERNAL_HEIMDALL = external ? "1" : "0";
    const lock = process.env.ER7_DRIVER_LOCK;
    const baseline = live();
    const k = createKhoraHandlers({ port: P.proxy, steerAliasPort: P.alias, warm: false });
    const p1 = k.start(), p2 = k.start();
    assert.equal(p1, p2, "start() twice must be the same promise");
    await p1;
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, process.pid, "start() takes the driver lock");
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).port, P.proxy, "…naming the shared Fold port");
    assert.ok(timers() > baseline.timers, "start() should have armed its timers");
    await k.close();
    assert.equal(fs.existsSync(lock), false, "close() releases the driver lock");
    assert.ok(await settlesTo(baseline), `timers/children still live after close(): ${JSON.stringify(live())} vs baseline ${JSON.stringify(baseline)}`);
    await k.close(); // twice is fine
  });
}

test("a second createKhoraHandlers after close() starts, serves and closes again", async () => {
  process.env.ER7_EXTERNAL_HEIMDALL = "0";
  const baseline = live();
  const a = createKhoraHandlers({ port: P.proxy, warm: false });
  await a.start(); await a.close();
  const b = createKhoraHandlers({ port: P.proxy, warm: false });
  await b.start();
  const m = await mount(b);
  try { assert.equal((await get(m.port, "/health")).status, 200); } finally { await m.stop(); }
  assert.ok(fs.existsSync(process.env.ER7_DRIVER_LOCK), "the second instance holds the lock");
  await b.close();
  assert.ok(await settlesTo(baseline), `live after the second close(): ${JSON.stringify(live())}`);
  assert.equal(fs.existsSync(process.env.ER7_DRIVER_LOCK), false);
});

test("a passive khora (driver lock held by a live pid) takes no lock, and close() leaves the other's lock alone", async () => {
  const lock = process.env.ER7_DRIVER_LOCK;
  const sleeper = spawn(process.execPath, ["-e", "setTimeout(()=>{}, 120000)"], { stdio: "ignore" });
  try {
    fs.writeFileSync(lock, JSON.stringify({ pid: sleeper.pid, port: 1, at: new Date().toISOString() }));
    const baseline = { timers: timers(), procs: count("ProcessWrap") - 1 }; // minus the sleeper itself
    const k = createKhoraHandlers({ port: P.proxy, warm: false });
    await k.start();
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, sleeper.pid, "a passive khora must not take over the lock");
    await k.close();
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, sleeper.pid, "the holder's lock survives our close()");
    assert.ok(await settlesTo({ ...baseline, procs: baseline.procs + 1 }), `live after close(): ${JSON.stringify(live())}`);
  } finally { sleeper.kill("SIGKILL"); fs.rmSync(lock, { force: true }); }
});

test("`node proxy.mjs` (isMain) is unchanged: same listeners on the configured ports, driver lock, SIGTERM shuts down", async (t) => {
  for (const p of [P.mainProxy, P.mainAlias]) {
    const busy = await new Promise((r) => { const c = net.connect(p, "127.0.0.1"); c.on("connect", () => { c.destroy(); r(true); }); c.on("error", () => r(false)); });
    if (busy) return t.skip(`spare port ${p} is in use on this machine; not running the spawned-proxy check`);
  }
  const lock = path.join(TMP, "main-driver.lock");
  const env = sandboxEnv({ ER7_PROXY_PORT: String(P.mainProxy), ER7_HEIMDALL_PORT: String(P.mainAlias), ER7_SURFACES: `er7:${P.mainProxy}:${TMP}:true`, ER7_DRIVER_LOCK: lock, ER7_EXTERNAL_HEIMDALL: "0", ER7_SHUTDOWN_DRAIN_MS: "1000" });
  const child = spawn(process.execPath, ["proxy.mjs"], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; child.stdout.on("data", (c) => (log += c)); child.stderr.on("data", (c) => (log += c));
  const exited = new Promise((r) => child.on("exit", (code, signal) => r({ code, signal })));
  try {
    let up = false;
    for (let i = 0; i < 1600 && !up; i++) { await sleep(150); up = await get(P.mainProxy, "/health").then((r) => r.status === 200, () => false); }
    assert.ok(up, `proxy never listened on :${P.mainProxy}\n${log}`);
    assert.equal(JSON.parse((await get(P.mainProxy, "/")).body).eoreader7, true);
    assert.equal((await get(P.mainAlias, "/health")).status, 200, "the heimdall alias port answers the same handler");
    for (let i = 0; i < 40 && !fs.existsSync(lock); i++) await sleep(100);
    assert.equal(JSON.parse(fs.readFileSync(lock, "utf8")).pid, child.pid, "main takes the driver lock");
    assert.match(log, new RegExp(`listening on http://127.0.0.1:${P.mainProxy}`));
    assert.match(log, new RegExp(`heimdall alias on http://127.0.0.1:${P.mainAlias}`));
    child.kill("SIGTERM");
    const r = await Promise.race([exited, sleep(15000).then(() => "timeout")]);
    assert.notEqual(r, "timeout", `SIGTERM did not shut it down\n${log}`);
    assert.equal(r.code, 0, `exit ${JSON.stringify(r)}\n${log}`);
    assert.equal(fs.existsSync(lock), false, "shutdown releases the driver lock");
    assert.match(log, /shutting down \(SIGTERM\)/);
  } finally { child.kill("SIGKILL"); }
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* temp */ } });
