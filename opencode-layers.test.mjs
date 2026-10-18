import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const fresh = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "lay-")); process.env.FOLD_WORKNOTES_DIR = d; return d; };
const door = await import("./opencode-doorway.mjs");
const M = await import("./opencode-layers.mjs");
const wn = await import("./opencode-worknotes.mjs");

test("layers assembles the five grains of one turn; an unpersisted grain is a typed gap, never a guess", async () => {
  fresh();
  const body = '{"model":"m","messages":[{"role":"user","content":"where is x"}]}';
  await door.answer({ event: "prompt", sessionID: "a", task: "lay", model: "m", body, note: "[fold: the thread …]" });
  wn.writeTurnsFile({ file: wn.turnsFile("lay", "a"), agent: "a", turns: [{ n: 1, ask: "where is x", grounds: ["read"], answer: "x is in lib/x.js" }] });

  const L = M.layers({ task: "lay", agent: "a" });
  const sha = crypto.createHash("sha256").update(body).digest("hex");
  assert.equal(L.turn, 1);
  assert.equal(L.ask, "where is x");
  // L0 — the exact prompt, by content address
  assert.equal(L.prompt.ref, `prompt#${sha.slice(0, 16)}`);
  assert.equal(L.prompt.body, body);
  // L1 — the fold-index the model read, now disclosed
  assert.equal(L.projection.note, "[fold: the thread …]");
  // L2 — the answer, ground-checked on demand, each sentence tagged
  assert.equal(L.answer.text, "x is in lib/x.js");
  assert.ok(Array.isArray(L.answer.sentences) && L.answer.sentences[0].type);
  // L4 — the record chain (may be empty for a fresh task, but present as an array)
  assert.ok(Array.isArray(L.record));
});

test("the viewer is self-contained: the grain switch, the prompt and the [M] tagging are present", async () => {
  fresh();
  const body = '{"messages":[{"role":"user","content":"hi"}]}';
  await door.answer({ event: "prompt", sessionID: "a", task: "lay2", model: "m", body });
  wn.writeTurnsFile({ file: wn.turnsFile("lay2", "a"), agent: "a", turns: [{ n: 1, ask: "q", grounds: [], answer: "I think so." }] });
  const html = M.renderLayersHtml(M.layers({ task: "lay2", agent: "a" }), { task: "lay2", agent: "a" });
  for (const g of ["as said", "sourced", "prompt", "record"]) assert.match(html, new RegExp(g));
  assert.match(html, /\[M\]/); // the mouth's own prose is tagged, never silently grounded
  assert.match(html, /prompt#/); // the exact prompt rides the view
});

test("the door serves the layers as JSON and as the toggle view", async () => {
  const d = fresh();
  await door.answer({ event: "prompt", sessionID: "a", task: "lay3", model: "m", body: "{\"x\":1}" });
  wn.writeTurnsFile({ file: wn.turnsFile("lay3", "a"), agent: "a", turns: [{ n: 1, ask: "q", grounds: [], answer: "a" }] });
  // drive route() with fake req/res
  const run = (url) => new Promise((resolve) => {
    const req = { url, method: "GET" };
    const res = { writeHead() {}, end(body) { resolve(body); } };
    door.route(req, res, {});
  });
  const json = JSON.parse(await run("/v1/hooks/opencode/layers?task=lay3&agent=a"));
  assert.equal(json.task, "lay3");
  assert.equal(json.turn, 1);
  const html = await run("/v1/hooks/opencode/layers?task=lay3&agent=a&html=1");
  assert.match(html, /<title>layers/);
});
