import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExemplarPool, getExemplarPool, mostUniqueExemplars, allExemplars, nearestCellByString } from "./exemplar-pool.mjs";

test("buildExemplarPool: 27 cells", () => {
  const pool = buildExemplarPool("English", 3);
  assert.equal(pool.nCells, 27);
  assert.equal(pool.K, 3);
});

test("mostUniqueExemplars: returns exemplars for INS|FIGURE", () => {
  const exs = mostUniqueExemplars("INS|FIGURE", 3);
  assert.ok(exs.length > 0, "no exemplars");
  assert.ok(exs[0].verb, "no verb");
});

test("allExemplars: returns 27*K exemplars", () => {
  const all = allExemplars();
  // 25 cells have scatter points (2 are empty), so 25*3 = 75
  assert.ok(all.length >= 70, `got ${all.length}`);
});

test("nearestCellByString: finds nearest centroid", () => {
  const r = nearestCellByString("go");
  assert.ok(r.cell, "no cell");
  assert.ok(r.similarity >= 0, "negative similarity");
});

test("empty cells have no exemplars", () => {
  const exs = mostUniqueExemplars("SYN|GROUND", 3);
  assert.equal(exs.length, 0, "empty cell should have no exemplars");
});

// ---- the smell in the kernel's own names, and a loud gap where the study's data is not (2026-11-23)
import { kernelCell, smellStatus } from "./exemplar-pool.mjs";
import { cellOf } from "../../kernel/cube.js";

test("kernelCell: the study's DES, ALT and SUP are the kernel's SIG, DEF and EVA, derived from each operator's own mode and domain", () => {
  assert.equal(kernelCell("DES|GROUND"), "SIG·Ground");
  assert.equal(kernelCell("ALT|FIGURE"), "DEF·Figure");
  assert.equal(kernelCell("SUP|PATTERN"), "EVA·Pattern");
  for (const same of ["NUL", "INS", "SEG", "CON", "SYN", "REC"]) assert.equal(kernelCell(`${same}|FIGURE`), `${same}·Figure`, `${same} keeps its name`);
  assert.equal(kernelCell("XYZ|FIGURE"), null, "an operator the study never had is a gap, not a guess");
  assert.equal(kernelCell(null), null);
});

test("every cell the pool holds translates to a real kernel cell, with the same mode and domain the study recorded for it", () => {
  const { pool, opMap } = getExemplarPool();
  for (const key of Object.keys(pool)) {
    const kc = kernelCell(key); assert.ok(kc, `${key} has no kernel cell`);
    const [op, grain] = kc.split("·"), c = cellOf(op, grain); assert.ok(!c.gap && c.op === op && c.grain === grain, `${kc} is not a kernel cell`);
  }
  assert.equal(new Set(Object.values(opMap)).size, Object.keys(opMap).length, "no two study operators collapse into one");
  assert.deepEqual(opMap.DES, "SIG"); assert.deepEqual(opMap.ALT, "DEF"); assert.deepEqual(opMap.SUP, "EVA");
});

test("smellStatus says what the smell stands on", () => {
  const st = smellStatus();
  assert.equal(st.on, true); assert.equal(st.gap, null); assert.ok(st.exemplars > 100 && st.exemplars <= 270, `exemplars ${st.exemplars}: at most K per cell`);
  assert.ok(st.files.length === 3 && st.files.every((f) => typeof f.found === "boolean")); assert.match(st.how, /not an embedding of the word/);
});

test("without the study's data the smell is a gap that says so, and a read does not throw", async () => {
  const dir = (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "no-study-"));
  const child = (await import("node:child_process")).spawnSync(process.execPath, ["--input-type=module", "-e", `
    const m = await import(${JSON.stringify(new URL("./exemplar-pool.mjs", import.meta.url).href)});
    const st = m.smellStatus(); const sniff = m.sniffByExemplar("work"); const near = m.nearestCellByString("work");
    console.log(JSON.stringify({ on: st.on, gap: st.gap, sniff, near, kc: m.kernelCell("DES|GROUND") }));`], { env: { ...process.env, EO_LEXICAL_ANALYSIS_DIR: dir }, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  const r = JSON.parse(child.stdout.trim().split("\n").pop());
  assert.equal(r.on, false); assert.match(r.gap, /could not be read.*set EO_LEXICAL_ANALYSIS_DIR/); assert.equal(r.sniff, null); assert.equal(r.near, null); assert.equal(r.kc, null);
});
