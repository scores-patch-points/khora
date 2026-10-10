// organs/agenda-conduct.mjs — THE JOIN: the ladder's conduct, implemented by
// Penelope's own generation.
//
// The fold's agenda-loop (fold/server/agenda-loop.mjs) is the orchestrator: it
// looks, ranks a void, and calls a CONDUCT once per void. This is that conduct
// for the generation media Penelope owns — code and prose — so the ladder is
// what runs generation, and the best of the existing worlds is kept:
//
//   · the void's own cell (op × grain) and detail are the intent — the change
//     request is the spec, never a fresh prompt (code-pipeline.mjs unitsFromPrior);
//   · code rides composeCodePipeline (swarm → field/hunt/mouth → escalate-at-
//     the-wall → gate → record): the swarm, the wall, the seal;
//   · prose rides the artifact-neutral weave (Weaving@1, per-element provenance);
//   · the GATE decides — normalizeOutcome reads the pipeline's own verdict, it
//     never trusts the draft's plausibility (code-pipeline.mjs: "the gate
//     decides, never the draft").
//
// The outcome is the ladder's contract exactly: { ok, detail?, evidence?, rule?,
// pathos? }. Pathos is carried ONLY when the pipeline emits an explicit marker
// (a refusal/correction that must change the next action); it is never inferred
// from prose (khora/native/pathos/loop.js:28).
//
// PURE MAPPING + injected run: the default run is real (composeCodePipeline /
// weave); a test injects a fake run and the whole join is checked without a
// model or a network.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const CONDUCT_SCHEMA = "AgendaConduct@1";

/** The intent of a void: its about, then its measured detail — never invented.
 *  On a retry, the sharper atom rides in: a later attempt must draw against the
 *  failure that held the last one (code-fix.mjs: "the finding's atom IS the
 *  sharpened instruction for the next pass"). */
export function intentOf(purpose = {}) {
  const about = String(purpose.about ?? "").trim();
  const detail = String(purpose.detail ?? "").trim();
  const base = about && detail && !about.includes(detail) ? `${about} — ${detail}` : (about || detail || String(purpose.id ?? ""));
  if (purpose.atom) return `${base}\nThe last attempt was held for: ${String(purpose.atom).trim()}. Change only what that finding names; keep every working export.`;
  return base;
}

export function artifactOf(purpose = {}) {
  if (purpose.artifact) return purpose.artifact;
  return purpose.kind === "prose" || purpose.op === "SYN" && purpose.grain === "Pattern" ? "prose" : "code";
}

/** The pipeline's result, folded to the ladder's conduct contract.
 *  Stage 12 live: when the gate reports its row count and zero rows ran, a pass
 *  is UNMEASURED — a distinct state from measured, never rendered alike. The
 *  ladder still re-probes (the world is the closer), but the record says shown,
 *  not measured. Legacy verdicts that report no row count keep today's reading. */
export function normalizeOutcome(result = {}) {
  const ok = result.ok === true;
  const value = typeof result.artifact === "string" ? result.artifact : result.artifact?.value ?? null;
  const bytes = typeof value === "string" ? Buffer.byteLength(value) : null;
  const verdict = result.evidence?.verdict ?? result.verification?.verdict ?? null;
  const rows = verdict?.rows;
  const unmeasured = ok && (verdict?.unmeasured === true || (Number.isFinite(rows) && rows <= 0));
  const evidence = [
    `${result.schema ?? "result"}: ${result.status ?? (ok ? "ok" : "not-ok")}`,
    bytes != null ? `${bytes}B` : null,
    verdict?.reason ? `gate=${verdict.reason}` : null,
    unmeasured ? `gate unmeasured (${rows ?? 0} rows)` : null,
    result.frontier?.attempted ? `escalated=${result.frontier.model ?? "frontier"}` : null,
  ].filter(Boolean).join(" · ");
  return {
    ok,
    unmeasured: unmeasured || null,
    detail: ok ? null : (result.error ?? verdict?.detail ?? result.status ?? "the generation did not pass its gate"),
    evidence,
    rule: unmeasured
      ? "the gate ran no row — this is shown, not measured; the re-probe is the closer"
      : (verdict?.reason ? `the gate decided: ${verdict.reason}` : "the generation gate decided, not the draft"),
    pathos: Array.isArray(result.pathos) ? result.pathos : [],
  };
}

/** The real generation: code rides the pipeline, prose rides weave. */
export async function defaultRun(purpose = {}) {
  const intent = intentOf(purpose);
  if (artifactOf(purpose) === "prose") {
    const { weave } = await import("./generation/api.mjs");
    return weave({ intent, artifact: "prose" });
  }
  const { composeCodePipeline } = await import("./code-pipeline.mjs");
  return composeCodePipeline({ intent });
}

/** MATERIALIZATION — the seam the live run found missing: a pipeline that
 *  returns "verified" to an unchanged world is not a closed void (measured on
 *  `fold loop` against greet.mjs, 2026-10-05: CodePipeline@1 verified · 66B,
 *  file absent, loop stopped at no-progress). When the purpose names a target
 *  (a file-probe's path) and the artifact is a string, the conduct WRITES it —
 *  writing the thing is the closing. Nothing is written without a target. */
export function writeArtifact(file, text) {
  if (typeof file !== "string" || !file) throw new TypeError("writeArtifact: a target path is required");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, String(text ?? ""), "utf8");
  return file;
}

export function artifactValue(result = {}) {
  if (typeof result.artifact === "string") return result.artifact;
  return typeof result.artifact?.value === "string" ? result.artifact.value : null;
}

/** createAgendaConduct({ run }) -> async (purpose) => conduct outcome.
 *  A successful run whose purpose carries a target materializes the artifact
 *  there (write injectable for tests), and the evidence says so. */
export function createAgendaConduct({ run = defaultRun, write = writeArtifact } = {}) {
  return async (purpose) => {
    const raw = await run(purpose);
    const out = normalizeOutcome(raw);
    const target = purpose?.target ?? null;
    const value = artifactValue(raw);
    if (out.ok && target && value != null) {
      write(target, value);
      out.evidence = `${out.evidence} · materialized ${target}`;
    }
    return out;
  };
}

export default { CONDUCT_SCHEMA, intentOf, artifactOf, normalizeOutcome, defaultRun, writeArtifact, artifactValue, createAgendaConduct };
