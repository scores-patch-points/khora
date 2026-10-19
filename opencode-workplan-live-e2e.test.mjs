// opencode-workplan-live-e2e.test.mjs — TRUE end to end: a REAL door process (`node opencode-doorway.mjs
// --serve`) driven over HTTP, with the medium read back off disk. Not the in-process integration of
// opencode-workplan-e2e-falsify.test.mjs — this proves the cells ride the actual wire the app uses.
//
//   L1 a mark POSTed over HTTP lands on disk with its cell
//   L2 the door's `notes` read returns the claim's cell
//   L3 the door's `scent` read returns the trail's cell
//   L4 the door's `surf` note surfaces the taken line's cell (a real edit → autoClaim → another session)
//   L5 the handshake names the medium events (and discloses that the plan has no door event)
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WN = fs.mkdtempSync(path.join(os.tmpdir(), "wplive-wn-"));
const ST = fs.mkdtempSync(path.join(os.tmpdir(), "wplive-st-"));
const PORT = 11470 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;

const post = async (body) => {
  const r = await fetch(`${BASE}/v1/hooks/opencode`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
};
const get = async (u) => (await fetch(`${BASE}${u}`)).json();
let n = 0;
const fresh = () => `live${process.pid}x${++n}`;

let proc;
after(() => { try { proc?.kill("SIGKILL"); } catch { /* gone */ } fs.rmSync(WN, { recursive: true, force: true }); fs.rmSync(ST, { recursive: true, force: true }); });

test("L0 the REAL door comes up (a subprocess over HTTP)", async () => {
  proc = spawn(process.execPath, [path.join(HERE, "opencode-doorway.mjs"), "--serve", String(PORT)], {
    env: { ...process.env, FOLD_WORKNOTES_DIR: WN, FOLD_OPENCODE_STATE: ST, FOLD_COMMONS_PROSIFY: "extractive", FOLD_LOOK_IDLE_MS: "50" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let up = false;
  for (let i = 0; i < 200 && !up; i++) {
    try { const r = await post({ event: "notes", task: "__ping__" }); up = r && Array.isArray(r.marks); } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  assert.ok(up, "the door did not answer over HTTP");
});

test("L1 a mark POSTed over HTTP lands on disk with its cell", async () => {
  const task = fresh();
  const r = await post({ event: "mark", task, agent: "a", kind: "block", text: "blocked on the network" });
  assert.equal(r.ok, true, `the door refused the mark: ${JSON.stringify(r)}`);
  const line = fs.readFileSync(path.join(WN, task, "a.md"), "utf8").trim();
  assert.match(line, /· block · cell=DEF·Ground · blocked on the network$/, `the wire did not carry the cell: ${line}`);
});

test("L2 the door's `notes` read returns the claim's cell", async () => {
  const task = fresh();
  await post({ event: "claim", task, agent: "A", item: "migrate users" });
  const notes = await post({ event: "notes", task });
  const open = (notes.open ?? []).find((c) => c.item === "migrate users");
  assert.ok(open, `the claim is not open: ${JSON.stringify(notes.open)}`);
  assert.equal(open.cell, "INS·Figure", "the claim lost its cell over the wire");
  const claimMark = (notes.marks ?? []).find((m) => m.kind === "claim");
  assert.equal(claimMark?.cell, "INS·Figure");
});

test("L3 the door's `scent` read returns the trail's cell", async () => {
  const task = fresh();
  await post({ event: "scent", task, agent: "a", q: "where is the parser", at: "turn 3" });
  const back = await post({ event: "scent", task, agent: "a" });
  assert.equal(back.trail?.[0]?.cell, "DEF·Ground", `the trail lost its cell: ${JSON.stringify(back.trail)}`);
});

test("L4 the door's `surf` note surfaces the taken line's cell", async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "wplive-proj-"));
  fs.mkdirSync(path.join(ws, ".git")); fs.mkdirSync(path.join(ws, "src"));
  const file = path.join(ws, "src", "lexer.js");
  fs.writeFileSync(file, "x");
  await post({ event: "event", sessionID: "ses_liveA", type: "session.tool.input.started", data: { id: "lc1", name: "edit" } });
  await post({ event: "event", sessionID: "ses_liveA", type: "session.tool.called", data: { id: "lc1", input: { filePath: file } } });
  const s = await post({ event: "surf", sessionID: "ses_liveB", workspace: ws, ask: "lexer", turns: [{ n: 1, ask: "a", answer: "b" }, { n: 2, ask: "c", answer: "d" }] });
  assert.match(s.note ?? "", /taken: edit src\/lexer\.js \[[^\]]*\] \(INS·Figure\)/, `the note did not carry the cell: ${s.note}`);
});

test("L5 the handshake names the medium events (and the plan has no door event — disclosed)", async () => {
  const h = await get("/v1/hooks/opencode");
  assert.equal(h.door, "opencode");
  for (const e of ["mark", "claim", "done", "notes", "scent", "surf"]) assert.ok(h.events.includes(e), `the door does not name ${e}`);
  assert.ok(!h.events.includes("plan"), "the plan gained a door event — update this test and the docs");
});

test("L6 the door's note surfaces a LAPSED claim with its owed null, over the wire", async () => {
  const task = fresh();
  await post({ event: "claim", task, agent: "A", item: "abandoned unit", ttlMs: 1 });
  await new Promise((r) => setTimeout(r, 25)); // let the 1ms lease lapse before the next turn reads it
  const s = await post({ event: "surf", task, sessionID: "ses_e6B", ask: "x", turns: [] });
  assert.match(s.note ?? "", /lapsed: abandoned unit \[[^\]]*\] \(INS·Figure · INCOMPLETE\)/, `the note carried no lapsed line: ${s.note}`);
});

test("L7 the door's trail carries the scent's cell, over the wire", async () => {
  const task = fresh();
  await post({ event: "scent", task, agent: "a", q: "where is the parser", at: "turn 3" });
  const s = await post({ event: "surf", task, sessionID: "a", ask: "x", turns: [] });
  assert.match(s.note ?? "", /- open \[DEF·Ground\] q="where is the parser"/, `the trail carried no cell: ${s.note}`);
});
