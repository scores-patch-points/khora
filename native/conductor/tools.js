// conductor/tools.js — the tool registry (the realization point).
//
// The constructive machinery derives a transition; this registry performs it
// for real. Each tool is the exact operation the transition named, executed
// against the real workspace — never simulated. The seam is the spec's
// "OpenCode executes that exact operation. Its tool registry becomes the
// realization point for the derived transition."
//
// Tools are real but bounded: they operate only inside the declared workspace
// (a permanent address outside it is refused), record their effect on the
// shared runtime ledger, and never touch a model. `fetch` is available but the
// experiment runs on local sources by default; a caller may inject a different
// fetch (e.g. the real network) at construction.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { createHash } from "node:crypto";
import { evaluateMechanical } from "../execution/mechanical.js";

export const TOOL_SCHEMA = "ToolRegistry@1";
export const TOOL_VERSION = 1;

const sha = (v) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex").slice(0, 16);

/** Within the workspace only: a permanent address is `perm:<relative-path>`. */
export function permAddressFor(workspace, path) {
  const rel = relative(workspace, resolve(workspace, path));
  if (rel.startsWith("..")) throw new Error(`permanent address escapes the workspace: ${path}`);
  return `perm:${rel}`;
}

export function pathOfAddress(workspace, address) {
  if (typeof address !== "string" || !address.startsWith("perm:")) return null;
  const rel = address.slice(5);
  const full = resolve(workspace, rel);
  const rel2 = relative(workspace, full);
  if (rel2.startsWith("..")) return null; // refuses an address outside the workspace
  return full;
}

/**
 * createTools({ workspace, fetch }) — the real tool registry. Each tool returns
 * { ok, result } and records its performed effect on the shared ledger when a
 * runtime is supplied; the operation is always performed for real first.
 */
export function createTools({ workspace, fetch: fetchImpl = null } = {}) {
  if (!workspace) throw new TypeError("createTools requires a workspace directory");

  const realFetch = fetchImpl ??
    (async (address) => {
      // No network by default: the experiment runs on local permanent
      // addresses. A caller that wants web retrieval injects a fetch.
      return { ok: false, reason: `no fetch implementation supplied for ${address}` };
    });

  const tools = {
    schema: TOOL_SCHEMA,
    version: TOOL_VERSION,
    workspace,

    /** read a permanent address — real bytes from the workspace file. */
    read(address) {
      const path = pathOfAddress(workspace, address);
      if (!path) return { ok: false, reason: `address outside the workspace: ${address}` };
      try {
        if (!existsSync(path)) return { ok: false, reason: `no file at ${address}` };
        const text = readFileSync(path, "utf8");
        return { ok: true, result: { address, text, bytes: Buffer.byteLength(text) } };
      } catch (e) {
        return { ok: false, reason: `read failed for ${address}: ${e.message}` };
      }
    },

    /** write a real artifact into the workspace, under a permanent address. */
    write(relativePath, content) {
      const rel = String(relativePath).replace(/^\/+/, "");
      const full = resolve(workspace, rel);
      const rel2 = relative(workspace, full);
      if (rel2.startsWith("..")) return { ok: false, reason: `write escapes the workspace: ${relativePath}` };
      try {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content, "utf8");
        return { ok: true, result: { address: `perm:${rel2}`, path: rel2, bytes: Buffer.byteLength(content) } };
      } catch (e) {
        return { ok: false, reason: `write failed for ${rel2}: ${e.message}` };
      }
    },

    /** fetch a source — real retrieval, or the injected implementation. */
    async fetch(address) {
      if (typeof address === "string" && address.startsWith("perm:")) return this.read(address);
      return realFetch(address);
    },

    /** compute in isolation — the real mechanical evaluator. */
    compute(spec) {
      return evaluateMechanical(spec);
    },

    /** digest a value (provenance, addressing). */
    digest: sha,
  };

  return tools;
}

export const TOOLS = {
  schema: TOOL_SCHEMA,
  version: TOOL_VERSION,
  create: createTools,
  permAddressFor,
  pathOfAddress,
  describe: "the realization point: the exact operation a derived transition names, performed for real inside the workspace",
};