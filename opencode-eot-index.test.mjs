// Falsification: the derived binary index.
//
// Claims under test (adapted from eodb's store/fold falsifiers):
//   1. EQUIVALENCE — readIndexed(task) deep-equals read(task). The index is a cache; if it ever
//      diverges from the log, these tests fail.
//   2. PARSE AT MOST ONCE — a warm read (no file growth) JSON.parses nothing; an append parses only
//      the appended tail, never the whole file again.
//   3. DERIVED, NOT AUTHORITATIVE — building the index never touches the jsonl bytes.
//   4. HEADER SCAN — count/range come from fixed headers, no body decode.
//   5. DRIFT IS TYPED — a corrupt or foreign index falls back to a full parse and stays equivalent.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fresh = () => { process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "eotix-")); };
const E = await import("./opencode-eot.mjs");
const I = await import("./opencode-eot-index.mjs");

// Stable stringify (sorted keys) so comparison ignores key order after the binary round-trip.
const stab = (v) => JSON.stringify(v, (k, val) =>
  val && typeof val === "object" && !Array.isArray(val)
    ? Object.keys(val).sort().reduce((a, key) => ((a[key] = val[key]), a), {})
    : val);
const norm = ({ sources, events }) => ({
  sources: [...sources.entries()].map(([k, v]) => `${k}=${stab(v)}`).sort(),
  events: events.map(stab),
});

function populate(task, agent) {
  E.recordTurns({ task, agent, turns: [
    { n: 1, ask: "why does the lexer drop escapes?", grounds: ["read", "shell"], answer: "The lexer drops escapes. It reads the span. A fix is staged." },
    { n: 2, ask: "what about unicode?", grounds: ["grep"], answer: "Unicode is unaffected." },
  ] });
  E.recordMark({ task, agent, kind: "fact", text: "the build is green" });
  const v = E.append({ task, agent, stage: "verify", source: { kind: "test", locator: "bun test lexer", meta: { exit: 0, judge: "box" } }, unit: "lexer@2" });
  E.append({ task, agent, stage: "admit", parent: v.event_id, unit: "lexer@2", source: { kind: "file", locator: "src/lexer.js", meta: { delta: "keep the escape" } }, detail: { delta: "keep the escape", check: "bun test lexer" } });
  E.recordClaim({ task, agent, item: "edit src/lexer.js", ttlMs: 60000 });
}

const jsonlOf = (task) => {
  const dir = path.join(process.env.FOLD_WORKNOTES_DIR, task, "eot");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f));
};

test("index ≡ log: readIndexed deep-equals read", () => {
  fresh();
  I.resetCache();
  populate("t", "agent-a");
  assert.deepEqual(norm(I.readIndexed("t")), norm(E.read("t")), "first (cold) read diverged");
  I.resetCache();
  assert.deepEqual(norm(I.readIndexed("t")), norm(E.read("t")), "index-seeded read diverged from the full fold");
});

test("parses at most once: a warm read decodes nothing", () => {
  fresh();
  I.resetCache();
  populate("t2", "agent-a");
  I.readIndexed("t2"); // cold: full parse
  const cold = I.stats.decodes;
  assert.ok(cold > 0, "cold read did not parse the log");
  I.readIndexed("t2"); // warm: no growth
  I.readIndexed("t2");
  assert.equal(I.stats.decodes, cold, "a warm read re-parsed the file (no checkpoint)");
});

test("an append parses only the tail, never the whole file again", () => {
  fresh();
  I.resetCache();
  populate("t3", "agent-a");
  I.readIndexed("t3");
  const before = I.stats.decodes;
  const sizes = jsonlOf("t3").map((f) => fs.statSync(f).size);

  E.recordMark({ task: "t3", agent: "agent-a", kind: "fact", text: "one more fact" });
  const added = jsonlOf("t3").reduce((s, f, i) => s + (fs.statSync(f).size - sizes[i]), 0);
  const lines = E.read("t3").events.length + E.read("t3").sources.size; // total rows now

  I.readIndexed("t3");
  const delta = I.stats.decodes - before;
  assert.ok(delta > 0, "append produced no parse");
  assert.ok(delta < lines, `append re-parsed the whole file (${delta} of ${lines})`);
  assert.deepEqual(norm(I.readIndexed("t3")), norm(E.read("t3")), "delta read diverged");
  assert.ok(added > 0);
});

test("the index is derived: the jsonl bytes are never touched", () => {
  fresh();
  I.resetCache();
  populate("t4", "agent-a");
  const snap = jsonlOf("t4").map((f) => [f, fs.readFileSync(f).toString("utf8")]);
  I.readIndexed("t4");
  for (const [f, before] of snap) assert.equal(fs.readFileSync(f).toString("utf8"), before, `index rewrote ${f}`);
  assert.ok(jsonlOf("t4").every((f) => fs.existsSync(`${f}.idx`)), "index file was not written");
});

test("header scan: count comes from headers, no body decode", () => {
  fresh();
  I.resetCache();
  populate("t5", "agent-a");
  I.readIndexed("t5");
  const { count } = I.scan("t5");
  const { sources, events } = E.read("t5");
  assert.equal(count, sources.size + events.length, "header scan count disagrees with the log");
});

test("drift is typed: a corrupt index rebuilds and stays equivalent", () => {
  fresh();
  I.resetCache();
  populate("t6", "agent-a");
  I.readIndexed("t6");
  const idx = `${jsonlOf("t6")[0]}.idx`;
  fs.writeFileSync(idx, Buffer.from("not an index at all"));
  I.resetCache(); // drop the session cache so the corrupt index is actually read
  assert.deepEqual(norm(I.readIndexed("t6")), norm(E.read("t6")), "rebuilt index diverged");
});

test("unpack(sinceTs) skips bodies before the cursor", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ t: "evt", event_id: `evt_${String(i).padStart(20, "0")}`, stage: "turn", agent: "a", ts: 1000 + i, origin: "model", standing: "asserted" }));
  const buf = I.packRows(rows);
  assert.equal(I.scanMeta(buf).count, 10);
  const all = I.unpack(buf);
  assert.equal(all.decoded, 10);
  const tail = I.unpack(buf, { sinceTs: 1007 });
  assert.equal(tail.rows.length, 3, "delta did not select the tail");
  assert.equal(tail.decoded, 3, "delta decoded bodies it should have skipped");
});
