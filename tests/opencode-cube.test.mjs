import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-cube-"));
process.env.FOLD_OPENCODE_STATE = STATE;
process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oc-cube-wn-"));
delete process.env.FOLD_CUBE;

const door = await import("../opencode-doorway.mjs");
const cubeModule = await import("../opencode-cube.mjs");
const { cube, cubeMap, seriesFrom, eigenAgreement, REC_AGREEMENT_FLOOR } = cubeModule;
const loader = await import("../native/organs/cube-tools.mjs");
const { familyAdmission } = await import("../native/organs/measure.js");
const { makeCapacityRunner } = await import("../native/organs/capacity-runner.js");
const sidecar = await import("../native/organs/cube-sidecar.mjs");
const nul = await import("../native/legacy-ported/nul/index.js");
const eot = await import("../opencode-eot.mjs");

const python = ["/opt/homebrew/bin/python3", "/usr/bin/python3"].find((p) => fs.existsSync(p)) ?? null;

// ── the registry ────────────────────────────────────────────────────────────
test("the registry loads as the whole 27-cell cube, in cube order, with no gaps", () => {
  const { cells, gaps } = loader.loadCubeTools();
  assert.equal(cells.size, 27);
  assert.deepEqual(gaps, []);
  assert.deepEqual([...cells.keys()], loader.cubeAddresses());
  const n = loader.coverageOf();
  assert.equal(n.schema, "CubeMap@1");
  assert.equal(n.counts.cells, 27);
  assert.ok(n.counts.tools > 100, `tools ${n.counts.tools}`);
  assert.ok(n.cells.every((c) => c.registrable && c.null_owed.length > 0));
  // The registry discloses its own no-control cells (sync.py prints the same
  // list): movers only, nothing to disagree with — named, not silently equal.
  const noCheck = n.cells.filter((c) => !c.check).map((c) => c.cell);
  assert.deepEqual(noCheck, ["INS·Ground", "SEG·Ground", "CON·Ground", "CON·Pattern", "SYN·Ground", "DEF·Ground"]);
});

test("addresses normalise by grammar, and anything else is refused by name", () => {
  assert.equal(loader.normalizeCell("nul.ground"), "NUL·Ground");
  assert.equal(loader.normalizeCell("REC/Pattern"), "REC·Pattern");
  assert.equal(loader.normalizeCell("XXX·Ground"), null);
});

test("a cell that owes no null cannot register its tools — checked at load", () => {
  const file = path.join(STATE, "no-null.json");
  const full = JSON.parse(fs.readFileSync(loader.CUBE_TOOLS_PATH, "utf8"));
  full["NUL·Ground"].null_owed = [];
  fs.writeFileSync(file, JSON.stringify(full));
  const { cells, gaps } = loader.loadCubeTools({ file });
  assert.equal(cells.has("NUL·Ground"), false);
  assert.ok(gaps.some((g) => g.type === "cell_incomplete" && g.what === "NUL·Ground"));
});

// ── family admission ────────────────────────────────────────────────────────
test("each family pays its own price; a wrong-family use is refused by name", () => {
  assert.equal(familyAdmission({ family: "perturbation" }).refused.type, "no_pair");
  assert.equal(familyAdmission({ family: "perturbation", pair: "madeup/shuffle", nul }).refused.type, "unlicensed_pair");
  assert.equal(familyAdmission({ family: "perturbation", pair: "burstiness/shuffle", nul }).ok, true);
  assert.equal(familyAdmission({ family: "prediction", claimed: "deduction", tool: "pydmd" }).refused.type, "wrong_family");
  assert.equal(familyAdmission({ family: "prediction" }).refused.type, "prequential_unframed");
  assert.equal(familyAdmission({ family: "prediction", prequential: { scored: "before" } }).ok, true);
  assert.equal(familyAdmission({ family: "prediction", witness: true }).refused.type, "no_witness_reading");
  assert.equal(familyAdmission({ family: "prediction", witness: true, witnessAgainst: "dmd.js" }).ok, true);
  assert.equal(familyAdmission({ family: "deduction" }).refused.type, "no_giver");
  assert.equal(familyAdmission({ family: "deduction", giver: "the operator" }).ok, true);
  assert.equal(familyAdmission({ family: "substrate" }).refused.type, "unbounded");
  assert.equal(familyAdmission({ family: "substrate", bounds: { timeoutMs: 1000, maxBytes: 1024 } }).ok, true);
  assert.equal(familyAdmission({ family: "vibes" }).refused.type, "unknown_family");
});

// ── the capacity runner's executor map ──────────────────────────────────────
test("the runner's executor map keeps exactly cast and relations wired, by derivation", () => {
  const runner = makeCapacityRunner({
    referentIndexFor: ([{ text }]) => ({ referents: new Set(text.split(/\s+/)), represent: (r) => r }),
    relationsFor: null,
  });
  const cast = runner("cast", { text: "alpha beta" });
  assert.equal(cast.count, 2);
  const other = runner("what", { text: "alpha" });
  assert.equal(other.gap, "not_yet_executable");
  assert.match(other.detail, /only "cast" and "relations" execute this pass/);
  assert.equal(runner("relations", { text: "alpha beta" }).gap, "not_yet_executable");
  assert.equal(runner("cast", {}).gap, "no_material");
});

// ── the sidecar host and worker ─────────────────────────────────────────────
test("the sidecar is hunted, never assumed: a missing venv is a typed gap naming the way back", () => {
  const hunt = sidecar.huntSidecar({ env: {}, root: STATE, home: STATE });
  assert.equal(hunt.found, false);
  assert.match(hunt.why, /venv|FOLD_CUBE/);
});

test("the worker speaks JSON lines and enforces its gates (whitelist, network, writes)", { skip: python === null }, () => {
  const reg = path.join(STATE, "test-registry.json");
  fs.writeFileSync(reg, JSON.stringify({
    "NUL·Ground": {
      organs: ["measure"], move: "t", null_owed: ["x"],
      tools: [
        { package: "math", source: "stdlib", role: "move", family: "substrate", env: null, use: "sqrt" },
        { package: "socket", source: "stdlib", role: "null", family: "substrate", env: null, use: "create_connection" },
        { package: "pathlib", source: "stdlib", role: "null", family: "substrate", env: null, use: "Path.write_text" },
      ],
    },
  }));
  const opts = { env: { ...process.env, FOLD_CUBE_PYTHON: python }, root: STATE, home: STATE, registryFile: reg, timeoutMs: 30_000 };
  const ping = sidecar.sidecarOneshot({ op: "ping" }, opts);
  assert.equal(ping.ok, true);
  const call = sidecar.sidecarOneshot({ op: "call", cell: "NUL·Ground", package: "math", module: "math", attr: "sqrt", args: [4] }, opts);
  assert.equal(call.ok, true);
  assert.equal(call.value, 2);
  assert.match(call.producer, /^py:math\.sqrt/);
  const off = sidecar.sidecarOneshot({ op: "call", cell: "NUL·Ground", package: "os", module: "os", attr: "getcwd" }, opts);
  assert.equal(off.gap, "not_whitelisted");
  const net = sidecar.sidecarOneshot({ op: "call", cell: "NUL·Ground", package: "socket", module: "socket", attr: "create_connection", args: [["example.com", 80]] }, opts);
  assert.equal(net.gap, "worker_refused");
  assert.match(net.why, /network is denied/);
  const write = sidecar.sidecarOneshot({ op: "call", cell: "NUL·Ground", package: "pathlib", module: "pathlib", attr: "Path", construct_args: ["/tmp/fold-cube-should-not-write"], method: "write_text", args: ["nope"] }, opts);
  assert.equal(write.gap, "worker_refused");
  assert.match(write.why, /scratch/);
});

// ── the door: map, gate, shadow call ────────────────────────────────────────
test("the cube event maps the whole cube through the door, with the sidecar's own hunt disclosed", async () => {
  const r = await door.answer({ event: "cube", sessionID: "s-cube-map" });
  assert.equal(r.ok, true);
  assert.equal(r.mode, "map");
  assert.equal(r.counts.cells, 27);
  assert.equal(typeof r.sidecar.found, "boolean");
  assert.ok(r.groups.existence.need > 0);
});

test("the GET route serves the cube map", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/cube" }, sink), true);
  const doc = JSON.parse(sink.body);
  assert.equal(doc.schema, "CubeMap@1");
  assert.equal(doc.cells.length, 27);
});

test("a call with the door closed names FOLD_CUBE; a call with it open runs in shadow and records", async () => {
  const closed = await cube({ body: { cell: "DEF·Pattern", tool: "pydmd", text: "1,2,3" }, task: "t-cube-1" });
  assert.equal(closed.gap, "cube_disabled");
  assert.match(closed.why, /FOLD_CUBE=1/);

  process.env.FOLD_CUBE = "1";
  try {
    const series = Array.from({ length: 32 }, (_, t) => 0.9 ** t);
    // Declared rank 2: both engines truncate to the same order, so the
    // agreement compares readings, not rank choices (disclosed in the ledger).
    const r = await door.answer({ event: "cube", sessionID: "s-cube-call", task: "t-cube-1", cell: "DEF·Pattern", tool: "pydmd", text: JSON.stringify(series), rank: 2 });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "call");
    assert.equal(r.shadow, true);
    assert.equal(r.tool.family, "prediction");
    const hunt = sidecar.huntSidecar();
    if (hunt.found) {
      assert.equal(typeof r.agreement, "number");
      assert.ok(r.agreement >= REC_AGREEMENT_FLOOR, `agreement ${r.agreement}`);
    } else {
      assert.equal(r.agreement, null);
      assert.equal(r.fallback.used, true);
      assert.match(String(r.fallback.why), /sidecar-absent/);
    }
    // The record: one exec event with tool, bounds and shadow in its detail.
    const exec = eot.read("t-cube-1").events.find((e) => e.stage === "exec" && e.detail?.op === "CUBE");
    assert.ok(exec, "the call lands a Provenance@2 exec event");
    assert.equal(exec.detail.tool, "pydmd");
    assert.equal(exec.detail.shadow, true);
    assert.ok(exec.detail.bounds.timeoutMs > 0);
    // The ledger: one row, and the map's last-agreement column reads it back.
    const ledger = fs.readFileSync(path.join(STATE, "cube-ledger.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].tool, "pydmd");
    const map = cubeMap({ stateDir: STATE });
    const def = map.cells.find((c) => c.cell === "DEF·Pattern");
    const row = def.tools.find((t) => t.package === "pydmd");
    assert.equal(row.lastAgreement, r.agreement);
  } finally {
    delete process.env.FOLD_CUBE;
  }
});

test("an unwired tool is not_yet_executable, by name, never the nearest tool", async () => {
  process.env.FOLD_CUBE = "1";
  try {
    const r = await cube({ body: { cell: "NUL·Ground", tool: "scipy", text: "1,2,3" }, task: "t-cube-2" });
    assert.equal(r.gap, "not_yet_executable");
    assert.equal(r.tool, "scipy");
    const amb = await cube({ body: { cell: "NUL·Ground" }, task: "t-cube-2" });
    assert.equal(amb.gap, "tool_ambiguous");
    const bad = await cube({ body: { cell: "NUL·Ground", tool: "pydmd" }, task: "t-cube-2" });
    assert.equal(bad.gap, "unknown_tool");
  } finally {
    delete process.env.FOLD_CUBE;
  }
});

test("agreement is a declared tolerance over eigenvalue multisets, and a disagreement triggers REC (shadow)", () => {
  const close = eigenAgreement([{ re: 0.9, im: 0 }], [{ re: 0.9, im: 0 }]);
  assert.equal(close.agreement, 1);
  const far = eigenAgreement([{ re: 0.1, im: 0 }], [{ re: 0.9, im: 0 }]);
  assert.ok(far.agreement < REC_AGREEMENT_FLOOR);
  assert.equal(seriesFrom("1, 2, 3").series.length, 3);
  assert.equal(seriesFrom("[1,2,3]").series.length, 3);
  assert.equal(seriesFrom("a,b").gap, "not_numeric");
});
