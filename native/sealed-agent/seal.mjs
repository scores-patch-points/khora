// sealed-agent/seal.mjs — THE SEALER: the outbound membrane.
//
// Every payload that leaves this door is either (a) the caller's own ask, (b)
// our fixed system prompt and tool schemas, or (c) a SealedProjection@1 — a
// tool result stamped with its kind, permanent address, sha256, byte count,
// and a typed truncation when it was cut. Raw workspace bytes never enter the
// wire except inside a projection that names where they came from.
//
// rule 1 — nothing is sent unprojected. The planner's request builder refuses
//   any tool_result whose content is not a SealedProjection@1 (assure()).
// rule 2 — the audit is the floor, and it is fail-closed: every outbound
//   body is hashed (exact bytes) and appended to the audit ledger BEFORE the
//   fetch; a ledger write failure fails the call. The ledger stores hashes
//   and counts, never the body.
// rule 3 — truncation is typed: a cut result says it was cut and how much it
//   held. A silent cut would be a silence that reads like a fact (IV.3).
//
// The capsule layer (opaque symbols + possible worlds, heimdall's
// abstract-capsule-only) is the next disclosure rung for material that must
// not cross even as projections; this door runs at sealed-external-text.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SEALED_PROJECTION_SCHEMA = "SealedProjection@1";
export const AUDIT_SCHEMA = "SealedAgentAudit@1";
export const CAP_BYTES = Number(process.env.SEALED_AGENT_CAP_BYTES ?? 48 * 1024);

const sha256 = (v) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");
export const sha8 = (v) => sha256(v).slice(0, 8);

/** Deterministic JSON stringify (sorted keys) — used for fingerprints so two
 *  sessions agree on what "the same thing" means. */
export function canonicalJson(v) {
  if (v === null || v === undefined) return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object") {
    const keys = Object.keys(v).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

/** project({ kind, address, content, bytes, meta }) — one sealed representation
 *  of a tool result, bounded and typed. `bytes` is the TRUE total when the
 *  content is a slice; otherwise derived from content. */
export function project({ kind, address, content = "", bytes = -1, meta = null }) {
  const text = String(content ?? "");
  const trueBytes = bytes >= 0 ? bytes : Buffer.byteLength(text, "utf8");
  const truncated = trueBytes > CAP_BYTES;
  const shown = truncated ? text.slice(0, CAP_BYTES) + `\n…[cut: ${trueBytes - CAP_BYTES} bytes — the full result stays local]` : text;
  return Object.freeze({
    schema: SEALED_PROJECTION_SCHEMA,
    kind,
    address,
    sha256: sha256(text),
    bytes: trueBytes,
    truncated,
    content: shown,
    ...(meta ? { meta: Object.freeze(meta) } : {}),
  });
}

export const isProjection = (v) =>
  !!v && typeof v === "object" && v.schema === SEALED_PROJECTION_SCHEMA && typeof v.address === "string" && typeof v.sha256 === "string";

/** assure(projection) — the refusal: anything that claims to be a tool result
 *  but is not a sealed projection cannot be built into an outbound message. */
export function assure(value) {
  if (!isProjection(value)) {
    throw new Error("unsealed tool result refused: every tool result must be a SealedProjection@1 (raw content may not enter the wire)");
  }
  return value;
}

/** createSealer({ auditPath = null }) — the outbound ledger. When no auditPath
 *  is given the sealer still works, but recordOutbound is a no-op and the
 *  caller is told so (the audit is optional only in tests). */
export function createSealer({ auditPath = null } = {}) {
  if (auditPath) fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  return {
    schema: AUDIT_SCHEMA,
    project,
    assure,
    isProjection,
    /** recordOutbound({ host, kind, body }) — hash the EXACT bytes about to be
     *  sent and append to the ledger before they leave. Fail-closed: a ledger
     *  failure refuses the send. */
    recordOutbound({ host, kind, body }) {
      if (!auditPath) return { recorded: false, reason: "no audit path (test-only mode)" };
      const bytes = Buffer.byteLength(JSON.stringify(body), "utf8");
      const entry = { ts: new Date().toISOString(), host, kind, sha256: sha256(JSON.stringify(body)), bytes };
      fs.appendFileSync(auditPath, JSON.stringify(entry) + "\n");
      return { recorded: true, ...entry };
    },
  };
}

export const SEALER = {
  schema: AUDIT_SCHEMA,
  version: 1,
  create: createSealer,
  project,
  assure,
  isProjection,
  sha8,
  describe: "the outbound membrane: sealed projections with address + sha256 + typed truncation, and a fail-closed audit ledger of every body that leaves",
};