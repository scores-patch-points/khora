// sealed-agent/tools.mjs — THE REALIZATION POINT: the tool registry the
// frontier's plan is performed by, for real, on this machine.
//
// Same shape as the conductor's tools.js (workspace-bounded, permanent
// addresses, never a model in the execution path) plus the bash lane, because
// an opencode-style agent needs one. The seal governs EGRESS, not execution:
// anything may run here — this is the local machine, the machine's own work —
// and what may CROSS back to the frontier is the sealer's business, never
// this registry's.
//
//   read   perm:<rel>  real bytes sliced from a real file (offset/limit)
//   write  perm:<rel>  a real file written; escapes refused
//   bash   bash:<sha8> a real command in the workspace, output capped 64 KiB

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { spawn } from "node:child_process";

export const TOOLS_SCHEMA = "SealedAgentTools@1";
export const BASh_CAP_BYTES = Number(process.env.SEALED_AGENT_BASH_CAP ?? 64 * 1024);
export const BASh_TIMEOUT_MS = Number(process.env.SEALED_AGENT_BASH_TIMEOUT_MS ?? 90000);

export function pathOf(workspace, rel) {
  if (typeof rel !== "string" || !rel) return null;
  const full = resolve(workspace, rel.replace(/^\/+/, ""));
  const rel2 = relative(workspace, full);
  if (rel2.startsWith("..") || rel2 === "") return null; // escapes the workspace
  return full;
}

export function permAddressFor(workspace, rel) {
  const p = pathOf(workspace, rel);
  if (!p) return null;
  return `perm:${relative(workspace, p)}`;
}

/** createAgentTools({ workspace }) — real, bounded, local. */
export function createAgentTools({ workspace }) {
  if (!workspace) throw new TypeError("createAgentTools requires a workspace");
  return {
    schema: TOOLS_SCHEMA,
    workspace,

    read({ path: rel, offset = 0, limit = null } = {}) {
      const full = pathOf(workspace, rel);
      if (!full) return { ok: false, reason: `path escapes the workspace: ${rel}` };
      try {
        if (!existsSync(full)) return { ok: false, reason: `no file at ${rel}` };
        const bytes = statSync(full).size;
        const start = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
        const content = readFileSync(full, "utf8").slice(start, limit == null ? undefined : start + Number(limit));
        return { ok: true, result: { address: `perm:${relative(workspace, full)}`, content, bytes } };
      } catch (e) {
        return { ok: false, reason: `read failed: ${e.message}` };
      }
    },

    write({ path: rel, content = "" } = {}) {
      const full = pathOf(workspace, rel);
      if (!full) return { ok: false, reason: `path escapes the workspace: ${rel}` };
      try {
        mkdirSync(dirname(full), { recursive: true });
        const text = String(content ?? "");
        writeFileSync(full, text, "utf8");
        return { ok: true, result: { address: `perm:${relative(workspace, full)}`, bytes: Buffer.byteLength(text, "utf8") } };
      } catch (e) {
        return { ok: false, reason: `write failed: ${e.message}` };
      }
    },

    bash({ command = "" } = {}) {
      return new Promise((resolveP) => {
        const cmd = String(command ?? "").trim();
        if (!cmd) return resolveP({ ok: false, reason: "empty command" });
        const shell = existsSync("/bin/zsh") ? "/bin/zsh" : "/bin/sh";
        const child = spawn(shell, ["-lc", cmd], { cwd: workspace, env: { ...process.env, SEALED_AGENT: "1" } });
        let out = "", err = "", cut = false;
        const timer = setTimeout(() => { cut = true; child.kill("SIGKILL"); }, BASh_TIMEOUT_MS);
        const take = (buf, s) => {
          const room = BASh_CAP_BYTES - buf.length;
          if (room <= 0) return buf;
          return buf + (s.length > room ? s.slice(0, room) : s);
        };
        child.stdout.on("data", (d) => { if (!cut) out = take(out, String(d)); });
        child.stderr.on("data", (d) => { if (!cut) err = take(err, String(d)); });
        child.on("close", (code) => {
          clearTimeout(timer);
          resolveP({ ok: true, result: { stdout: out, stderr: err, code, timedOut: cut } });
        });
        child.on("error", (e) => { clearTimeout(timer); resolveP({ ok: false, reason: `spawn failed: ${e.message}` }); });
      });
    },
  };
}

/** The wire tool definitions the frontier sees. Descriptions state the
 *  workspace boundary and the projection rule — the model is told what it
 *  will and will not see, in the tool schema itself. */
export function toolDefs() {
  return [
    {
      name: "read",
      description: "read real bytes of a workspace file. Returns a sealed projection: permanent address, sha256, byte count, and the content (offset/limit supported; a cut result is marked truncated). Paths are relative to the workspace and may not escape it.",
      input_schema: {
        type: "object",
        properties: {
          path: { type: "string", description: "workspace-relative path" },
          offset: { type: "integer", description: "start at this byte offset (default 0)" },
          limit: { type: "integer", description: "read at most this many bytes (default whole file)" },
        },
        required: ["path"],
      },
    },
    {
      name: "write",
      description: "write content to a workspace file (creating parents). Returns the permanent address and byte count.",
      input_schema: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
    {
      name: "bash",
      description: "run a shell command in the workspace directory. Output (stdout+stderr) is capped at 64 KiB and marked if cut. Use this to build, test, inspect, list, move, diff — anything a terminal does.",
      input_schema: {
        type: "object",
        properties: { command: { type: "string", description: "a single shell command line" } },
        required: ["command"],
      },
    },
  ];
}

export const TOOLS = {
  schema: TOOLS_SCHEMA,
  version: 1,
  create: createAgentTools,
  defs: toolDefs,
  describe: "the realization point for the sealed agent's plans: real bounded works, local always",
};