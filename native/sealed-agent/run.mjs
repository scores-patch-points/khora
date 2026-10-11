#!/usr/bin/env node
// sealed-agent/run.mjs — THE ONE-SHOT SEALED TURN (live use).
//
//   ANTHROPIC_API_KEY=... node native/sealed-agent/run.mjs \
//     --workspace /abs/path --task "..." [--test "npm test"] [--model claude-sonnet-4-6]
//
// Prints the outcome, the frontier call count, the check, the lesson id —
// and on a second identical run, proves the lesson: 0 frontier calls.
// Everything lives under <workspace>/.sealed-agent/: skills.json (lessons),
// record.jsonl (the floor), audit.jsonl (every outbound body's hash).

import { createAgent } from "./agent.mjs";
import { createPlanner } from "./anthropic.mjs";
import { createSealer } from "./seal.mjs";

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const workspace = arg("workspace") ?? process.cwd();
const ask = arg("task") ?? arg("ask");
if (!ask) {
  console.error("usage: node sealed-agent/run.mjs --workspace <dir> --task <ask> [--test <cmd>] [--model <id>]");
  process.exit(2);
}

const agent = createAgent({
  workspace,
  planner: createPlanner({ model: arg("model") ?? undefined }),
  sealer: createSealer({ auditPath: `${workspace}/.sealed-agent/audit.jsonl` }),
});

const result = await agent.runTurn({
  ask,
  testCommand: arg("test") ?? null,
  sessionId: `sea-cli-${Date.now().toString(36)}`,
});

console.log(`outcome       ${result.outcome}${result.servedBy === "lesson" ? " (served by compiled lesson)" : ""}`);
console.log(`frontierCalls ${result.frontierCalls}`);
console.log(`check         ${result.check?.ok ? "pass" : result.check?.ok === false ? `fail (${JSON.stringify(result.check)})` : "none declared"}`);
console.log(`lesson        ${result.skill?.fingerprint ?? "—"}`);
console.log("---");
console.log(result.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n") || "(no text)");
if (result.skill?.plan?.steps?.length) {
  console.log("---");
  console.log(`plan          ${result.skill.plan.steps.length} step(s) compiled into the lesson store`);
}