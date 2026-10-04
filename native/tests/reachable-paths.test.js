// tests/reachable-paths.test.js — Milestone 0 reachable-path inventory is
// verified against the code, not just asserted. Each task/output/executor step
// named in manifests/reachable-paths.json must resolve to a real file and, when
// a symbol is given, a real export. A stale path breaks this test by name — the
// baseline is re-measured, never silently updated.
//
// The inventory distinguishes three paths so that a failure can be assigned to
// the path that produced it: task (request → clearance → judgment), output
// (generated material re-scanned before release), executor (bounded real
// patches under caller-specified tests).
//
// A path group whose entry module does not import at baseline is marked
// `importable: false` with an `importBlockedBy` defect id; this test pins that
// failure so it cannot silently regress or silently be declared fixed. The
// falsifying control for each defect lives in the manifest.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(HERE, "..", "manifests", "reachable-paths.json"), "utf8"),
);
const KHORA_ROOT = path.join(HERE, "..", "..");
const FILE_REF_RE = /^khora\/(.+)$/;

const pathToFileURL = (abs) => new URL("file://" + abs);

test("reachable-paths manifest pins the three distinguished paths", () => {
  for (const key of ["task", "output", "executor"]) {
    assert.ok(MANIFEST.paths[key], `missing path group: ${key}`);
    assert.ok(MANIFEST.paths[key].entry, `${key} path missing an entry`);
    assert.ok(Array.isArray(MANIFEST.paths[key].steps) && MANIFEST.paths[key].steps.length > 0, `${key} path has no steps`);
  }
});

test("every pinned file resolves under khora root", () => {
  for (const group of Object.values(MANIFEST.paths)) {
    for (const step of group.steps) {
      const m = FILE_REF_RE.exec(step.file);
      assert.ok(m, `path not under khora/: ${step.file}`);
      const abs = path.join(KHORA_ROOT, m[1]);
      assert.ok(fs.existsSync(abs), `file missing: ${step.file}`);
    }
  }
});

test("every pinned symbol is a real named export of its module", async () => {
  for (const group of Object.values(MANIFEST.paths)) {
    if (group.importable === false) continue; // entry module cannot load at baseline (recorded defect)
    for (const step of group.steps) {
      if (step.internal) continue; // internal step: file is pinned, symbol is not an export
      if (!step.symbol || step.symbol.includes("→")) continue;
      const m = FILE_REF_RE.exec(step.file);
      const abs = path.resolve(KHORA_ROOT, m[1]);
      let mod;
      try {
        mod = await import(pathToFileURL(abs).href);
      } catch (e) {
        assert.fail(`module failed to import: ${step.file} — ${e.message}`);
      }
      const name = step.symbol.split(".").pop();
      assert.ok(name in mod, `export missing: ${step.file} → ${name}`);
    }
  }
});

test("non-importable path groups carry a recorded defect and the defect is real", async () => {
  for (const [key, group] of Object.entries(MANIFEST.paths)) {
    if (group.importable !== false) continue;
    const defect = MANIFEST.baselineDefects.find((d) => d.id === group.importBlockedBy);
    assert.ok(defect, `${key} path blocked by unknown defect ${group.importBlockedBy}`);
    assert.equal(defect.severity, "blocking");
    // Pin the actual failure: the entry module genuinely cannot load.
    const entry = group.entry;
    const fileRef = FILE_REF_RE.exec(entry.split("(")[0].trim())[1];
    const abs = path.join(KHORA_ROOT, fileRef);
    let threw = false;
    try {
      await import(pathToFileURL(abs).href);
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, `expected ${key} entry ${fileRef} to fail to load at baseline`);
  }
});

test("baseline defects each name a falsifying control", () => {
  for (const defect of MANIFEST.baselineDefects) {
    assert.ok(defect.id && defect.text, `defect missing id/text: ${JSON.stringify(defect)}`);
    assert.ok(defect.falsifyingControl, `defect ${defect.id} missing a falsifying control`);
    if (defect.disposition?.startsWith("RESOLVED")) {
      assert.ok(defect.resolved, `resolved defect ${defect.id} must carry a resolution date`);
    }
  }
});

test("defect-001 falsifying control: the proxies import under khora root", async () => {
  const defect = MANIFEST.baselineDefects.find((d) => d.id === "defect-001-proxy-import");
  assert.ok(defect, "defect-001 must be recorded");
  assert.match(defect.disposition ?? "", /RESOLVED/);
  // The control from the manifest: fresh import of proxy-runner.mjs resolves.
  const abs = path.join(KHORA_ROOT, "proxy-runner.mjs");
  await assert.doesNotReject(() => import(pathToFileURL(abs).href), "proxy-runner.mjs must import after defect-001 resolution");
});