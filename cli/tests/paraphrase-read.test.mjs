// The paraphrase-seam runner (cli/paraphrase-read.mjs): texts in the shared log get one text-reading each,
// woven by khora through its own door. The reader is a stub here (the rows organ is tested against real
// readings in native/organs/text-reading.test.mjs). Needs the pharos library: $PHAROS_LIB, else ../pharos.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openDoor } from "../pharos-door.mjs";
import { readTexts } from "../paraphrase-read.mjs";
import { textAddr, readingAddr, READING_KIND } from "../../native/organs/text-reading.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.resolve(HERE, "..", "paraphrase-read.mjs");
const LIB = process.env.PHAROS_LIB ?? path.resolve(HERE, "..", "..", "..", "pharos", "lib", "pharos.mjs");
const have = fs.existsSync(LIB);
const skip = have ? false : `pharos library not found at ${LIB} (set PHAROS_LIB)`;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pr-"));
const pointerIn = (dir) => {
  const p = path.join(dir, "pharos.json");
  fs.writeFileSync(p, JSON.stringify({ v: 1, kind: "pharos-pointer", lib: LIB, sha256: crypto.createHash("sha256").update(fs.readFileSync(LIB)).digest("hex") }));
  return p;
};
/** the asker's side, written with pharos directly under writer "asker" (as the harness does) */
async function ask(dir, texts) {
  const P = await import(pathToFileURL(LIB).href);
  const h = P.open("seam", { dir, writer: "asker" });
  if (!P.fold(h, { kind: "kind" }).entries.some((e) => e.body?.name === "text")) P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:text", body: { name: "text", cell: "INS·Ground", why: "test" } });
  return texts.map((t) => P.weave(h, { cell: "INS·Ground", kind: "text", addr: textAddr(t), body: { text: t, language: "en" } }));
}
/** a stub reader: one sentence, one row per space-split word, a final "." as PUNCT */
const stubRead = async (text) => ({ entry: { parse: [{ rows: [...text.split(" ").filter(Boolean).map((w, i) => ({ id: i + 1, form: w.replace(/\.$/, ""), lemma: w.replace(/\.$/, "").toLowerCase(), upos: "X", feats: "_", head: 0, deprel: "dep" })), { id: 99, form: ".", lemma: ".", upos: "PUNCT", feats: "_", head: 1, deprel: "punct" }] }] } });

test("no pointer: the runner prints that the door is off and exits non-zero", () => {
  const d = tmp();
  const r = spawnSync(process.execPath, [RUNNER], { env: { ...process.env, KHORA_PHAROS_JSON: path.join(d, "absent.json"), PHAROS: path.join(d, "log"), PHAROS_LOG: "seam" }, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /door is off/);
  assert.equal(fs.existsSync(path.join(d, "log")), false);
});

test("every text gets one reading by writer khora, chained by `of`; a rerun adds nothing", { skip }, async () => {
  const d = tmp(), dir = path.join(d, "log");
  const [t1, t2] = await ask(dir, ["Alpha beta.", "Gamma delta epsilon."]);
  const door = await openDoor({ pointer: pointerIn(d), log: "seam", dir });
  const r = await readTexts({ door, readFull: stubRead });
  assert.deepEqual([r.texts, r.read, r.woven, r.failed.length], [2, 2, 2, 0]);
  const readings = door.fold({ kind: READING_KIND });
  assert.equal(readings.length, 2);
  assert.ok(readings.every((e) => e.by === "khora" && e.cell === "INS·Figure"));
  assert.deepEqual(readings.map((e) => e.addr), [readingAddr("Alpha beta."), readingAddr("Gamma delta epsilon.")]);
  assert.deepEqual(readings.map((e) => e.of), [[t1.id], [t2.id]]);
  assert.deepEqual(readings[0].body, { reader: "khora readFull", language: "en", rows: [
    { s: 0, id: 1, form: "Alpha", lemma: "alpha", upos: "X", feats: "_", head: 0, deprel: "dep", key: "alpha" },
    { s: 0, id: 2, form: "beta", lemma: "beta", upos: "X", feats: "_", head: 0, deprel: "dep", key: "beta" },
  ] });
  const again = await readTexts({ door, readFull: async () => { throw new Error("must not be called"); } });
  assert.deepEqual([again.read, again.woven, again.failed.length], [0, 0, 0]);
  assert.equal(door.fold({ kind: READING_KIND }).length, 2);
  assert.equal(door.fold({ kind: "kind" }).filter((e) => e.body.name === READING_KIND).length, 1);
});

test("a new text later gets only its own reading", { skip }, async () => {
  const d = tmp(), dir = path.join(d, "log");
  await ask(dir, ["One two."]);
  const door = await openDoor({ pointer: pointerIn(d), log: "seam", dir });
  await readTexts({ door, readFull: stubRead });
  await ask(dir, ["Three four."]);
  const seen = [];
  const r = await readTexts({ door, readFull: async (t, o) => { seen.push([t, o.language]); return stubRead(t); } });
  assert.deepEqual(seen, [["Three four.", "en"]]);
  assert.equal(r.woven, 1);
  assert.equal(door.fold({ kind: READING_KIND }).length, 2);
});

test("a text the reader cannot read is listed as failed, nothing is woven for it, and a rerun retries it", { skip }, async () => {
  const d = tmp(), dir = path.join(d, "log");
  await ask(dir, ["Good text.", "Bad text."]);
  const door = await openDoor({ pointer: pointerIn(d), log: "seam", dir });
  const r = await readTexts({ door, readFull: async (t) => { if (t.startsWith("Bad")) throw new Error("boom"); return stubRead(t); } });
  assert.deepEqual([r.woven, r.failed.length], [1, 1]);
  assert.equal(r.failed[0].addr, readingAddr("Bad text."));
  assert.match(r.failed[0].why, /boom/);
  const again = await readTexts({ door, readFull: stubRead });
  assert.deepEqual([again.woven, again.failed.length], [1, 0]);
});

test("the door off: readTexts reads nothing", async () => {
  let called = false;
  const r = await readTexts({ door: { on: false, why: "no pharos pointer at x" }, readFull: async () => { called = true; } });
  assert.deepEqual([r.on, r.read, called], [false, 0, false]);
});
