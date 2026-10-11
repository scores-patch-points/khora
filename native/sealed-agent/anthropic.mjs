// sealed-agent/anthropic.mjs — THE FRONTIER PLANNER (rung 3 of the ladder).
//
// Anthropic's Messages API with tools, drawn directly (the proxy's anthropic
// lane is text-only; the tool-use lane is this module's, for now). Three
// walls stand between this door and the frontier, in order:
//
//   1. THE GATE FIRST — antistrauss (native/the-fold/antistrauss.mjs) runs on
//      every request with forceBlock, the same rule that stands before the
//      proxy's own Anthropic lane. The gate sees every answer-producing call
//      or that call is a wiring bug.
//   2. THE SEAL — the body is recorded in the audit ledger (exact bytes,
//      host, sha256) BEFORE the fetch; a ledger failure refuses the send.
//   3. THE ENDPOINT — the caller-supplied ANTHROPIC_API_KEY, url and model;
//      nothing is guessed and no other host is ever contacted.
//
// The model's reply is parsed into tool_use blocks and text. Usage comes from
// the API's own counters (never estimated), carried on the result.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gate as antistraussGate } from "../the-fold/antistrauss.mjs";

export const ANTHROPIC_URL = (process.env.ER7_ANTHROPIC_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
export const ANTHROPIC_VERSION = process.env.ER7_ANTHROPIC_VERSION ?? "2023-06-01";
export const DEFAULT_MODEL = process.env.SEALED_AGENT_MODEL ?? "claude-sonnet-5-5";
export const DEFAULT_MAX_TOKENS = Number(process.env.SEALED_AGENT_MAX_TOKENS ?? 4096);
export const DEFAULT_TIMEOUT_MS = Number(process.env.SEALED_AGENT_TIMEOUT_MS ?? 290000);

/** resolveApiKey — the key the Fold already owns, in the Fold's own places:
 *  1. ANTHROPIC_API_KEY env · 2. HEIMDALL_KEY_ANTHROPIC env · 3. the state
 *  file `heimdall key` wrote (~/.heimdall/state.json → providerKeys.anthropic).
 *  One credential, one store; nothing is guessed and no new secret file is
 *  invented. Never logged, never disclosed. */
export function resolveApiKey(home = os.homedir()) {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (process.env.HEIMDALL_KEY_ANTHROPIC) return process.env.HEIMDALL_KEY_ANTHROPIC;
  try {
    const state = JSON.parse(fs.readFileSync(path.join(home, ".heimdall", "state.json"), "utf8"));
    const k = state?.providerKeys?.anthropic;
    if (typeof k === "string" && k) return k;
  } catch { /* no state file — the env is the only source */ }
  return "";
}

/** createPlanner({ ... }) — returns plan({ system, messages, tools,
 *  sessionId, workspace }) -> { text, toolCalls: [{id,name,input}],
 *  stopReason, usage, raw }. A gate or sealer may be injected (tests inject a
 *  no-op gate and a scripted planner instead). */
export function createPlanner({
  model = DEFAULT_MODEL,
  apiKey = resolveApiKey(),
  url = ANTHROPIC_URL,
  version = ANTHROPIC_VERSION,
  sealer,
  maxTokens = DEFAULT_MAX_TOKENS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  gate = antistraussGate,
} = {}) {
  const plan = async ({ system = null, messages, tools, sessionId = null, workspace = null } = {}) => {
    if (!apiKey) throw new Error("anthropic planner: ANTHROPIC_API_KEY is not set (set it or inject a planner)");
    const body = {
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
      tools: tools ?? [],
    };

    // Wall 1 — antistrauss, fail-closed, before anything leaves. The gate's
    // verdict is `allow`; a refusal carries its reason.
    if (gate) {
      const verdict = gate({ model, messages, route: "sealed-agent", sessionId, workspace }, { forceBlock: true });
      if (verdict?.allow === false) {
        throw Object.assign(new Error(`antistrauss refused this frontier call: ${verdict?.reason ?? "blocked"}`), { code: "ERR_ANTISTRAUSS_BLOCKED" });
      }
    }

    // Wall 2 — the audit, before the fetch, fail-closed.
    if (sealer) sealer.recordOutbound({ host: url, kind: "frontier", body });

    // Wall 3 — the endpoint.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(`${url}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": version,
        },
        signal: ctrl.signal,
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      throw new Error(`anthropic ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    }
    const j = await res.json();

    let text = "";
    const toolCalls = [];
    for (const block of j?.content ?? []) {
      if (block?.type === "text") text += block.text ?? "";
      else if (block?.type === "tool_use") toolCalls.push({ id: block.id, name: block.name, input: block.input ?? {} });
    }
    const u = j?.usage ?? {};
    return {
      text: text.trim(),
      toolCalls,
      stopReason: j?.stop_reason ?? null,
      usage: {
        input: Number(u.input_tokens ?? 0),
        output: Number(u.output_tokens ?? 0),
        cacheRead: Number(u.cache_read_input_tokens ?? 0),
        cacheWrite: Number(u.cache_creation_input_tokens ?? 0),
        estimated: false,
      },
      raw: j,
    };
  };
  return { model, plan, configured: Boolean(apiKey) };
}

export const PLANNER = {
  schema: "SealedAgentPlanner@1",
  version: 1,
  create: createPlanner,
  defaultModel: DEFAULT_MODEL,
  describe: "the frontier planner: antistrauss first, audit before fetch, caller-supplied key, the API's own usage counters",
};