// sealed-agent/skills.mjs — THE COMPILED LESSON STORE (rungs 0/1 of the
// ladder). The frontier teaches once per class (THE-ONE-TIME-TEACHER Law 1);
// a compiled lesson is a LearnedProcedure@1 record — the existing learning
// seam (native/learning/procedure.js), ridden — plus the plan it replays:
// the tool-call steps, the ground it was compiled against (paths + content
// hashes), the artifact text, and a standing.
//
//   standing: "provisional"  a lesson with no negative control (a decoy it
//                            must reject) — served, but not held. The theory
//                            says a check with no rejected decoy is
//                            provisional at best; this door agrees.
//             "held"         after registerDecoy(): a near-miss was recorded
//                            and the lesson proved it rejects it (slot-bound
//                            plans, the next rung, can do this for real).
//             "demoted"      replay or ground check failed — the lesson is
//                            kept on the store (the floor: never erased) but
//                            is no longer found.
//
// Falsifiers: a replay that ships without re-running the steps; a ground that
// changed and still served; a demoted lesson that finds again.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { storeProcedure, validateProcedure } from "../learning/procedure.js";
import { canonicalJson } from "./seal.mjs";

export const SKILLS_STORE_SCHEMA = "SealedAgentSkills@1";
export const ARTIFACT_CAP = 32 * 1024;

const sha = (v) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

/** fingerprintOf — what "the same thing" means to this door: the ask, the
 *  caller's test command, and the workspace are all in the identity. Two asks
 *  that differ in one operand get different fingerprints (no force-fit). */
export function fingerprintOf({ ask, testCommand, workspace }) {
  return "fp:" + sha(canonicalJson({ ask: String(ask ?? "").trim(), testCommand: String(testCommand ?? "").trim(), workspace }));
}

/** groundOf — hash of the plan's own ground: every touched path plus the
 *  hash of its current bytes (missing files hash as "<missing>"). */
export function groundOf(workspace, paths) {
  const map = {};
  for (const rel of [...new Set(paths)].sort()) {
    const full = path.join(workspace, rel);
    let h = "<missing>";
    try { h = sha(fs.readFileSync(full)); } catch { /* missing */ }
    map[rel] = h;
  }
  return { paths: [...new Set(paths)].sort(), hash: sha(canonicalJson(map)) };
}

export function groundMatches(ground, workspace) {
  if (!ground?.paths?.length) return { ok: false, reason: "lesson carries no ground" };
  const now = groundOf(workspace, ground.paths);
  return now.hash === ground.hash ? { ok: true } : { ok: false, reason: "ground hash changed" };
}

/** createSkillStore({ workspace }) — the per-workspace store file is
 *  <workspace>/.sealed-agent/skills.json (the conductor already writes its
 *  own .conductor/ into workspaces; same pattern). */
export function createSkillStore({ workspace }) {
  const dir = path.join(workspace, ".sealed-agent");
  const file = path.join(dir, "skills.json");
  fs.mkdirSync(dir, { recursive: true });

  const load = () => {
    try {
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      return Array.isArray(j?.skills) ? j.skills : [];
    } catch {
      return [];
    }
  };
  const save = (skills) => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ schema: SKILLS_STORE_SCHEMA, version: 1, skills }, null, 2));
  };

  return {
    schema: SKILLS_STORE_SCHEMA,
    file,
    load,
    /** compileLesson — write the lesson: the LearnedProcedure@1 spine carries
     *  name (= fingerprint), sourceEncounters, domain/effectScope (the
     *  workspace), tests (the caller's test command — never model-authored),
     *  invalidationConditions, lineage; the plan fields ride alongside. */
    compile({ ask, testCommand, workspace: w, steps, frontierCalls, sessionId, checks, artifactText, touchedPaths }) {
      const fingerprint = fingerprintOf({ ask, testCommand, workspace: w });
      const lesson = {
        ...storeProcedure({
          name: fingerprint,
          constructor: "sealed-agent.replay",
          sourceEncounters: [String(sessionId ?? "ses-unknown")],
          domain: w,
          effectScope: w,
          obligations: ["only re-execution counts", "sealed projections only on egress"],
          tests: testCommand ? [testCommand] : [],
          negativeControls: [],
          failures: [],
          invalidationConditions: ["ground_hash_changed", "replay_check_failed"],
          lineage: { compiledAt: new Date().toISOString(), frontierCalls, checks: checks?.ok === true ? "passed" : String(checks?.ok), model: "frontier" },
        }),
        plan: { steps },
        fingerprint,
        workspace: w,
        artifactText: String(checks?.ok === true ? artifactText : "").slice(0, ARTIFACT_CAP),
        ground: groundOf(w, touchedPaths),
        standing: "provisional",
        decoy: null,
        frontierCalls,
      };
      const v = validateProcedure(lesson);
      if (!v.valid) throw new Error(`lesson rejected: ${v.errors?.[0] ?? "invalid"}`);
      // The floor keeps demoted lessons (a re-taught class supersedes the
      // live one; the demoted one stays visible as history, never erased).
      const skills = load().filter((s) => !(s.fingerprint === fingerprint && s.standing !== "demoted"));
      skills.push(lesson);
      save(skills);
      return lesson;
    },
    /** find — the hunt (rung 0/1). Demoted lessons are not found; the newest
     *  live lesson of a class is. */
    find(fingerprint) {
      const live = load().filter((s) => s.fingerprint === fingerprint && s.standing !== "demoted");
      return live.length ? live[live.length - 1] : null;
    },
    all() {
      return load();
    },
    demote(fingerprint, reason) {
      const skills = load().map((s) =>
        s.fingerprint === fingerprint ? { ...s, standing: "demoted", invalidationReason: reason } : s
      );
      save(skills);
      return reason;
    },
    registerDecoy(fingerprint, { ask }) {
      const skills = load().map((s) =>
        s.fingerprint === fingerprint
          ? { ...s, standing: "held", decoy: { ask, fingerprint: fingerprintOf({ ask, testCommand: s.tests?.[0] ?? null, workspace: s.workspace }), rejected: true } }
          : s
      );
      save(skills);
      return true;
    },
  };
}

export const SKILLS = {
  schema: SKILLS_STORE_SCHEMA,
  version: 1,
  create: createSkillStore,
  fingerprint: fingerprintOf,
  ground: groundOf,
  describe: "the compiled lessons: LearnedProcedure@1 spines with replay plans, grounds, and standings",
};