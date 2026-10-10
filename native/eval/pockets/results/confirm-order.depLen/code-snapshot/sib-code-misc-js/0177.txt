// organs/code-pipeline.test.mjs — the robust coding pipeline, scripted mouth
// (no model, no network). Pins the COMPOSITION, not the draws: law order
// (field → hunt → mouth), concurrency, escalation-at-the-wall gating, and the
// agentic record shape. The mouth is scripted; the gate is the real code
// adapter (node --check + spec-conformance).

import { test } from "node:test";
import assert from "node:assert";
import { composeCodePipeline, fillUnit, fillParallel, escalateWalled, swarmTask, drawFrontier, deidentify, reidentify, unitsFromPrior } from "./code-pipeline.mjs";

// ── scripted adapter: field holds `held`, hunt snips `snip`, mouth draws the
// rest. Every draw is recorded so the composition's order is provable.
function scriptedAdapter({ fieldName = "held", huntName = "snip", mouthName = "drawn" } = {}) {
  const calls = [];
  const units = [
    { name: fieldName, spec: "a unit the field already holds" },
    { name: huntName, spec: "a unit the hunt snips from the field" },
    { name: mouthName, spec: "a unit the mouth must draw" },
  ];
  return {
    calls,
    units,
    adapter: {
      kind: "code",
      readUnits: async () => units,
      autofill: (u) => (u.name === fieldName ? { code: "export const held = 1;\n", address: "corpus:held" } : null),
      hunt: async (u) => (u.name === huntName ? { code: "export const snip = 2;\n", url: "hunt:snip" } : null),
      mouthFragment: (u) => `draw ${u.name}`,
      snip: (code, name) => (code.includes(`export const ${name}`) ? code : "export const drawn = 3;\n"),
      probeUnit: () => ({ ok: true, detail: "" }),
      sharpen: (u, atom, why) => atom,
      testUnits: (code) => ({ ok: true, reason: "spec-conformant", detail: "" }),
      assemble: (body) => body,
      toDocument: () => "<html></html>",
    },
  };
}

test("fillUnit runs law order: field first, hunt second, mouth last", async () => {
  const { adapter } = scriptedAdapter();
  const field = await fillUnit({ name: "held", spec: "" }, adapter, {});
  assert.equal(field.agent, "field");
  assert.equal(field.address, "corpus:held");
  const hunt = await fillUnit({ name: "snip", spec: "" }, adapter, {});
  assert.equal(hunt.agent, "hunt");
  assert.equal(hunt.address, "hunt:snip");
  const mouth = await fillUnit({ name: "drawn", spec: "" }, adapter, {});
  assert.equal(mouth.agent, "mouth");
});

test("fillParallel fills every unit concurrently, one disposition each", async () => {
  const { units, adapter } = scriptedAdapter();
  const out = await fillParallel(units, adapter, {}, 3);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((o) => o.agent).sort(), ["field", "hunt", "mouth"]);
});

test("escalateWalled fires only with a configured frontier model", async () => {
  const walled = [{ unit: "drawn", attempts: [{ attempt: 1, why: "no function drawn" }] }];
  const adapter = { mouthFragment: (u) => `re-draw ${u.name}`, snip: (c) => c, probeUnit: () => ({ ok: true }), sharpen: (u, a) => a };
  const off = await escalateWalled(walled, adapter, {}, { model: null });
  assert.equal(off.attempted, false);
  assert.equal(off.outcomes.length, 0);
});

test("escalateWalled never fabricates a pass when the frontier gate refuses", async () => {
  const walled = [{ unit: "drawn", attempts: [{ attempt: 1, why: "no function drawn" }] }];
  const adapter = { mouthFragment: (u) => `re-draw ${u.name}`, snip: (c) => c, probeUnit: () => ({ ok: true }), sharpen: (u, a) => a };
  const out = await escalateWalled(walled, adapter, {}, {
    model: "claude-x",
    channel: "http://127.0.0.1:1", // unreachable: the gate refuses
  });
  assert.equal(out.attempted, true);
  assert.equal(out.outcomes[0].refused, true);
  assert.equal(out.outcomes[0].code, undefined); // no fabricated body
});

test("composeCodePipeline returns the agentic record with the swarm disclosed", async () => {
  const { units, adapter } = scriptedAdapter();
  const swarm = async () => ({ routed: true, meaning: { hard: true }, ants: 3 });
  const r = await composeCodePipeline({
    intent: "make a module",
    model: "qwen2.5-coder:1.5b",
    adapter,
    swarm,
    fill: async (us, ad, ctx, p) => fillParallel(us, ad, ctx, p),
    escalate: async () => ({ attempted: false, outcomes: [] }),
    channel: "http://127.0.0.1:1",
  });
  assert.equal(r.schema, "CodePipeline@1");
  assert.equal(r.swarm.routed, true);
  assert.equal(r.verification.verdict.ok, true);
  assert.equal(r.subAgents.dispositions.length, 3);
  assert.equal(r.subAgents.escalated, false);
  assert.equal(r.ok, true);
  assert.equal(r.artifact.value.includes("export const held"), true);
});

test("swarmTask discloses a gap when the swarm is unreachable, never a stop", async () => {
  const s = await swarmTask("make me a countdown clock", { url: "http://127.0.0.1:1/v1/swarm" });
  assert.equal(s.routed, false);
  assert.ok(s.gap);
});

test("drawFrontier always carries the sealed-external privacy label", async () => {
  let seen = null;
  const fetchImpl = async (url, init) => {
    seen = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: "export const x = 1;\n" } }] }) };
  };
  const t = await drawFrontier("draw x", "claude-sonnet-4-6", { channel: "http://bridge", fetchImpl });
  assert.equal(seen.body.heimdall_privacy, "sealed-external");
  assert.equal(seen.body.model, "claude-sonnet-4-6");
  assert.equal(t.text.includes("export const x"), true);
});

test("deidentify scrubs real identities for the off-system send and reidentify restores", async () => {
  const real = "the project /Users/mlacy/code/countdown, author mlacy, email michaeltlacy@gmail.com, key sk-ant-api03-abcdef123456789";
  const { text, map } = deidentify(real);
  assert.ok(!text.includes("mlacy"));
  assert.ok(!text.includes("michaeltlacy@gmail.com"));
  assert.ok(!text.includes("sk-ant-api03-abcdef123456789"));
  assert.ok(text.includes("anon"));
  assert.ok(map.length >= 3);
  const back = reidentify(text, map);
  assert.ok(back.includes("/Users/mlacy/code/countdown"));
  assert.ok(back.includes("michaeltlacy@gmail.com"));
  assert.ok(back.includes("sk-ant-api03-abcdef123456789"));
});

test("unitsFromPrior anchors an iteration to the artifact's own declarations, JS or Python", async () => {
  const js = unitsFromPrior("function greet(name){ return `hi ${name}`; }\nexport { greet };\n", "make it formal");
  assert.deepEqual(js.map((u) => u.name), ["greet"]);
  assert.match(js[0].spec, /make it formal/);
  const py = unitsFromPrior('def greet(name):\n    return f"hi {name}"\n', "add a title arg");
  assert.deepEqual(py.map((u) => u.name), ["greet"]);
  assert.equal(unitsFromPrior("", "x").length, 0);
});