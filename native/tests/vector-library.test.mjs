import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { openLibrary } from "../organs/vector-library.js";
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kvl-")), "m.vec");
const fake = (calls) => async (texts) => { calls.push(texts.slice()); return texts.map((t) => [t.length, t.charCodeAt(0) || 1, 1, 0]); };
test("embeds only what it has not seen, keeps order, and persists across a reopen", async () => {
  const f = tmp(); const calls = []; let lib = openLibrary({ file: f, digest: "d1", prefix: "p: ", dim: 4 });
  const a = await lib.embedAll(["alpha", "beta", "alpha"], { embedder: fake(calls), batch: 1, concurrency: 2 }); assert.equal(calls.flat().length, 2); assert.equal(a.length, 3); assert.deepEqual([...a[0]], [...a[2]]);
  lib.flush(); lib = openLibrary({ file: f, digest: "d1", prefix: "p: " }); assert.equal(lib.size, 2);
  const b = await lib.embedAll(["beta", "gamma"], { embedder: fake(calls) }); assert.equal(calls.flat().length, 3); assert.equal(b[0].length, 4);
  let n = 0; for (const x of b[0]) n += x * x; assert.ok(Math.abs(n - 1) < 1e-5, "vectors are unit length");
});
test("a different model digest or prefix cannot read the file", () => {
  const f = tmp(); const lib = openLibrary({ file: f, digest: "d1", prefix: "p: ", dim: 4 }); lib.put("x", Float32Array.from([1, 2, 3, 4])); lib.flush();
  assert.throws(() => openLibrary({ file: f, digest: "d2", prefix: "p: " }), /different model digest/); assert.throws(() => openLibrary({ file: f, digest: "d1", prefix: "q: " }), /different prefix/);
});
test("a torn last record is dropped, not trusted", () => {
  const f = tmp(); const lib = openLibrary({ file: f, digest: "d", dim: 4 }); lib.put("a", Float32Array.from([1, 0, 0, 0])); lib.put("b", Float32Array.from([0, 1, 0, 0])); lib.flush();
  fs.truncateSync(f, fs.statSync(f).size - 5); const again = openLibrary({ file: f, digest: "d" }); assert.equal(again.size, 1); assert.ok(again.has("a")); assert.ok(!again.has("b"));
  again.put("b", Float32Array.from([0, 1, 0, 0])); again.flush(); assert.equal(openLibrary({ file: f, digest: "d" }).size, 2);
});
test("a wrong-sized vector and an unseen text without an embedder are refused", async () => {
  const lib = openLibrary({ file: tmp(), digest: "d", dim: 4 }); assert.throws(() => lib.put("x", Float32Array.from([1, 2])), /dim/); await assert.rejects(() => lib.embedAll(["new"], {}), /embedder/);
});
test("two handles on one file never lose or duplicate a vector (the lock and the re-read)", () => {
  const f = tmp(); const a = openLibrary({ file: f, digest: "d", dim: 4 }); const b = openLibrary({ file: f, digest: "d" });
  a.put("one", Float32Array.from([1, 0, 0, 0])); b.put("two", Float32Array.from([0, 1, 0, 0])); a.flush(); b.flush(); a.put("three", Float32Array.from([0, 0, 1, 0])); a.flush();
  const c = openLibrary({ file: f, digest: "d" }); assert.equal(c.size, 3); for (const w of ["one", "two", "three"]) assert.ok(c.has(w)); assert.ok(!fs.existsSync(f + ".lock"));
});
