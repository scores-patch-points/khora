// Falsification: the BINARY LOG (opencode-eot-bin.mjs) — the EODB moves made primary.
//
// Claims under test (adapted from eodb's pack/store falsifiers and Amino's snapshot discipline):
//   1. FIDELITY — the binary lane and the legacy jsonl lane hold the SAME rows, deep-equal.
//   2. MIGRATION — a legacy jsonl is migrated once (atomic); the bin is complete; the jsonl is then
//      ignored by reads (renaming it away changes nothing).
//   3. TORN TAIL — a crash mid-append leaves a partial record; readers drop it, the writer truncates
//      it once, and no row is ever lost or guessed.
//   4. WARM = ZERO DECODE — a second read in the same process JSON.parses nothing new.
//   5. O(1) APPEND — appending never re-reads the file (the jsonl lane did, O(n) per append).
//   6. EXACT DEDUP — a replay with the same time dedupes on the header hash, verified against the
//      record's body (a 64-bit collision can never drop a real event).
//   7. CURSORS — readSince by seq (the ordinal) and by ts; decoded counts are the falsifier's signal.
//   8. HEADER SCAN — count/range/stages come from fixed headers, zero body decode.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fresh = () => { process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eotb-")); };
const E = await import("./opencode-eot.mjs");
const B = await import("./opencode-eot-bin.mjs");

const stab = (v) => JSON.stringify(v, (k, val) =>
  val && typeof val === "object" && !Array.isArray(val)
    ? Object.keys(val).sort().reduce((a, key) => ((a[key] = val[key]), a), {})
    : val);
const norm = ({ sources, events }) => ({
  sources: [...sources.entries()].map(([k, v]) => `${k}=${stab(v)}`).sort(),
  events: events.map(stab),
});

// deterministic ops: every append carries an explicit `now`, so the two lanes are byte-for-byte comparable
function ops(task, agent) {
  E.append({ task, agent, stage: "turn", source: { kind: "turn", locator: "The lexer drops escapes." }, unit: "t1.s0", detail: { ask: "why does the lexer drop escapes?", tools: ["read", "shell"] }, now: 1000 });
  E.recordMark({ task, agent, kind: "fact", text: "the build is green", now: 1001 });
  const v = E.append({ task, agent, stage: "verify", source: { kind: "test", locator: "bun test lexer", meta: { exit: 0, judge: "box" } }, unit: "lexer@2", now: 1002 });
  E.append({ task, agent, stage: "admit", parent: v.event_id, unit: "lexer@2", source: { kind: "file", locator: "src/lexer.js", meta: { delta: "keep the escape" } }, detail: { delta: "keep the escape", check: "bun test lexer" }, now: 1003 });
  E.recordClaim({ task, agent, item: "edit src/lexer.js", ttlMs: 60000, now: 1004 });
  return v;
}
const eotDir = (task) => path.join(process.env.FOLD_WORKNOTES_DIR, task, "eot");

test("FIDELITY: the binary lane and the jsonl lane hold the same rows", () => {
  fresh();
  process.env.FOLD_EOT_BIN = "1"; ops("binlane", "agent-a");
  process.env.FOLD_EOT_BIN = "0"; ops("jsonlane", "agent-a");
  process.env.FOLD_EOT_BIN = "1";
  assert.deepEqual(norm(E.read("binlane")), norm(E.read("jsonlane")));
  assert.ok(fs.readdirSync(eotDir("binlane")).includes("agent-a.bin"));
  assert.ok(fs.readdirSync(eotDir("jsonlane")).includes("agent-a.jsonl"));
});

test("MIGRATION: a legacy jsonl moves into the bin once and is then ignored by reads", () => {
  fresh();
  const ws = path.join(process.env.FOLD_WORKNOTES_DIR, "mig", "eot");
  fs.mkdirSync(ws, { recursive: true });
  // a pre-binary log, exactly the legacy shape
  const rows = [
    { t: "src", source_id: "src_legacy1", origin: "model", kind: "turn", locator: "Old sentence." },
    { t: "evt", event_id: "evt_legacy1", stage: "turn", agent: "agent-a", ts: 900, origin: "model", standing: "asserted", source_id: "src_legacy1", unit: "t1.s0" },
  ];
  fs.writeFileSync(path.join(ws, "agent-a.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const before = norm(E.read("mig"));
  assert.equal(before.events.length, 1, "legacy rows read before any append");
  E.append({ task: "mig", agent: "agent-a", stage: "mark", source: { kind: "mark", locator: "new fact" }, detail: { kind: "fact" }, now: 1100 }); // migrates, then appends
  assert.ok(fs.existsSync(path.join(ws, "agent-a.bin")), "migrated to the bin");
  const after = norm(E.read("mig"));
  assert.equal(after.events.length, 2, "legacy + new row both read from the bin");
  fs.renameSync(path.join(ws, "agent-a.jsonl"), path.join(ws, "agent-a.jsonl.away"));
  assert.deepEqual(norm(E.read("mig")), after, "the bin alone is complete — the jsonl is ignored");
});

test("TORN TAIL: a partial record is dropped by readers and truncated once by the writer", () => {
  fresh();
  ops("tear", "agent-a");
  const file = path.join(eotDir("tear"), "agent-a.bin");
  const good = fs.statSync(file).size;
  fs.appendFileSync(file, Buffer.from([0xde, 0xad, 0xbe])); // 3 bytes: shorter than a header
  const r1 = E.read("tear");
  assert.equal(r1.events.length, 5, "reader drops the torn tail, loses nothing else");
  const extra = E.append({ task: "tear", agent: "agent-a", stage: "done", source: { kind: "claim", locator: "edit src/lexer.js" }, detail: { item: "edit src/lexer.js" }, now: 1200 });
  assert.equal(extra.ok, true);
  const r2 = E.read("tear");
  assert.equal(r2.events.length, 6, "the writer healed the tail and appended");
  assert.ok(fs.statSync(file).size > good, "file grew from the healed offset");
});

test("WARM = ZERO DECODE: a second read parses nothing new", () => {
  fresh();
  ops("warm", "agent-a");
  E.read("warm"); // cold: bodies parsed once
  B.resetBinStats();
  const r = E.read("warm");
  assert.equal(r.events.length, 5);
  assert.equal(B.stats.decodes, 0, "warm read decoded a body — the cache is not holding");
});

test("EXACT DEDUP: a replay with the same time dedupes; growth stops", () => {
  fresh();
  const v = ops("dedupe", "agent-a");
  const size = fs.statSync(path.join(eotDir("dedupe"), "agent-a.bin")).size;
  const again = E.append({ task: "dedupe", agent: "agent-a", stage: "verify", source: { kind: "test", locator: "bun test lexer", meta: { exit: 0, judge: "box" } }, unit: "lexer@2", now: 1002 });
  assert.equal(again.deduped, true);
  assert.equal(again.event_id, v.event_id);
  assert.equal(fs.statSync(path.join(eotDir("dedupe"), "agent-a.bin")).size, size, "a deduped replay grows nothing");
});

test("CURSORS: readSince by seq (the ordinal) and by ts decode only the tail", () => {
  fresh();
  ops("cursor", "agent-a");
  const bySeq = B.readSince("cursor", { sinceSeq: 5 });
  assert.ok(bySeq.rows.length >= 2, "the tail from ordinal 5");
  assert.ok(bySeq.decoded < 10, `decoded only the tail, got ${bySeq.decoded}`);
  const byTs = B.readSince("cursor", { sinceTs: 1003 });
  const evts = byTs.rows.filter((r) => r.t === "evt");
  assert.ok(evts.every((e) => e.ts >= 1003), "ts cursor honored");
});

test("HEADER SCAN: count and stages from headers, zero body decode", () => {
  fresh();
  ops("scan", "agent-a");
  B.resetBinStats();
  const m = B.scan("scan");
  assert.equal(m.evts, 5, "scan counts events without decoding");
  assert.equal(B.stats.decodes, 0);
  assert.equal(m.files, 1);
  assert.ok(m.lastTs >= 1003);
});

// ── speed, printed (the falsifier's table) ─────────────────────────────────────────────────────────
const rows = [];
test("SPEED: O(1) append beats the jsonl lane; warm read beats cold", () => {
  fresh();
  const N = 1500;
  let t0 = Date.now();
  for (let i = 0; i < N; i++)
    E.append({ task: "fast-bin", agent: "a", stage: "turn", source: { kind: "turn", locator: `sentence number ${i} about the lexer` }, unit: `t${i}.s0`, now: 5000 + i });
  const binMs = Date.now() - t0;
  B.resetBinCache();
  t0 = Date.now(); E.read("fast-bin"); const coldMs = Date.now() - t0;
  t0 = Date.now(); E.read("fast-bin"); const warmMs = Date.now() - t0;
  t0 = Date.now(); B.scan("fast-bin"); const scanMs = Date.now() - t0;
  process.env.FOLD_EOT_BIN = "0";
  const M = 300; // the legacy lane re-reads the file per append: quadratic — keep the sample honest and small
  t0 = Date.now();
  for (let i = 0; i < M; i++)
    E.append({ task: "fast-jsonl", agent: "a", stage: "turn", source: { kind: "turn", locator: `sentence number ${i} about the lexer` }, unit: `t${i}.s0`, now: 6000 + i });
  const jsonlMs = Date.now() - t0;
  process.env.FOLD_EOT_BIN = "1";
  rows.push(["append, binary (n=1500)", `${binMs} ms`, `~${(binMs / N).toFixed(2)} ms/row`]);
  rows.push([`append, jsonl (n=${M})`, `${jsonlMs} ms`, `~${(jsonlMs / M).toFixed(2)} ms/row, O(n) each`]);
  rows.push(["read, cold (1500)", `${coldMs} ms`, ""]);
  rows.push(["read, warm (1500)", `${warmMs} ms`, ""]);
  rows.push(["scan, header-only (1500)", `${scanMs} ms`, ""]);
  const perRow = jsonlMs / M > 0 ? (jsonlMs / M) / Math.max(0.001, binMs / N) : Infinity;
  assert.ok(binMs / N < jsonlMs / M, `binary append must beat the jsonl append (bin ${(binMs / N).toFixed(2)} ms/row vs jsonl ${(jsonlMs / M).toFixed(2)} ms/row)`);
  assert.ok(perRow > 1);
});

after(() => { console.log("\nmeasured (same box, same process)\n" + rows.map((r) => `  ${r[0].padEnd(28)} ${r[1].padEnd(12)} ${r[2]}`).join("\n")); });
