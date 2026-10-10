// organs/generation/adapters/code-fix.test.mjs — the code-fix adapter rides
// the real Weave spine: one "module" unit, the falsifying gate as the probe,
// the reason lint as the sharpener. The gate script is real; only the engine
// draw is absent (the adapter's contract is exercised directly).

import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import adapter from "./code-fix.mjs";
import { registerGenerationAdapter, generationAdapter, generationKinds } from "../api.mjs";

const TARGET = `export function moneyRound(x) {
  return Math.round(x * 100) / 100;
}
export function subtotal(lines) {
  let s = 0;
  for (const l of lines) s += moneyRound(l.qty * l.unit);
  return moneyRound(s);
}
`;

const GOALS = [
  { end1: "moneyRound(1.005)", label: "returns", end2: "1.01" },
  { end1: "moneyRound(1.015)", label: "returns", end2: "1.02" },
];

let gatePath = null;
test.before(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "code-fix-adapter-gate-"));
  gatePath = path.join(dir, "gate.mjs");
  await writeFile(
    gatePath,
    `import { pathToFileURL } from "node:url";\nimport assert from "node:assert/strict";\nconst m = await import(pathToFileURL(process.argv[2]).href);\nassert.strictEqual(m.moneyRound(1.005), 1.01, "moneyRound(1.005) must round half-up to 1.01");\nassert.strictEqual(m.moneyRound(1.015), 1.02, "moneyRound(1.015) must round half-up to 1.02");\nconsole.log("GATE PASS");\n`,
    "utf8",
  );
});
test.after(async () => {
  if (gatePath) await rm(path.dirname(gatePath), { recursive: true, force: true });
});

test("readUnits names the single module unit, never a fabricated list", async () => {
  const units = await adapter.readUnits("improve this billing module");
  assert.equal(units.length, 1);
  assert.equal(units[0].name, "module");
  assert.equal(units[0].spec, "improve this billing module");
});

test("mouthFragment carries the brief and the current source; a sharpened atom rides the next prompt", () => {
  const first = adapter.mouthFragment({ name: "module", spec: "fix the rounding" }, "fix the rounding", { source: TARGET });
  assert.match(first, /fix the rounding/);
  assert.match(first, /CURRENT SOURCE:/);
  const sharpened = adapter.mouthFragment({ name: "module", spec: "fix the rounding" }, "moneyRound(1.005) returns 1.01", { source: TARGET });
  assert.match(sharpened, /moneyRound\(1\.005\) returns 1\.01/);
});

test("a module that passes the gate passes the probe (the gate decides)", async () => {
  const good = `export function moneyRound(x) {
  const c = Math.round((x + Number.EPSILON) * 100) / 100;
  return c;
}
`;
  const r = await adapter.probeUnit(good, { name: "module" }, { verification: { gate: gatePath } });
  assert.equal(r.ok, true);
  assert.equal(r.reason, "gate-pass");
});

test("a module that keeps the float defect is refused by the probe with the gate's finding", async () => {
  const r = await adapter.probeUnit(TARGET, { name: "module" }, { verification: { gate: gatePath } });
  assert.equal(r.ok, false);
  assert.match(r.detail, /moneyRound\(1\.005\)/);
});

test("sharpen reason-lints the gate's refusal into an atom naming the wanted value", async () => {
  const why = "AssertionError: moneyRound(1.005) must round half-up to 1.01 — got 1";
  const next = await adapter.sharpen({ name: "module" }, "fix", why, { goals: GOALS });
  assert.match(next, /moneyRound\(1\.005\) returns 1\.01/);
});

test("sharpen reads the structured assertion fields (actual/expected), never a frame-trace line", () => {
  const why = "node:internal/modules/run_main:107\nAssertionError [ERR_ASSERTION]: moneyRound(1.005) must round half-up to 1.01\n1 !== 1.01\nactual: 1, expected: 1.01\nat gate.mjs:4:8";
  const next = adapter.sharpen({ name: "module" }, "fix", why, { goals: GOALS });
  assert.match(next, /moneyRound\(1\.005\) returns 1\.01/);
});

test("the code-fix door routes through the public weave contract, mouth walled off (noModel)", async () => {
  const { weave, generationKinds, generationAdapter } = await import("../api.mjs");
  const result = await weave({
    intent: "improve the rounding",
    artifact: "code-fix",
    context: { source: TARGET, goals: GOALS },
    verification: { gate: gatePath },
    noModel: true,
  });
  assert.equal(result.artifact.kind, "code-fix");
  assert.equal(result.noModel, true);
  assert.equal(result.model, null);
  assert.ok(generationKinds().includes("code-fix"));
  assert.equal(generationAdapter("code-fix"), adapter);
  assert.ok(!result.verification.ok, "with the mouth walled off and no field/hunt, the gate must refuse — never a vacuous pass");
});