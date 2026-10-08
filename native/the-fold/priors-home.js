// the-fold/priors-home.js — THE ONE HOME FOR THE PRIORS (janus).
//
// The rules of reading are Relate's, so every prior (pos · frame · role-config ·
// morph-cues · morphology · case-marking · proclitics/enclitics/contractions ·
// code · notation · lang · …) lives at <workspace root>/janus/priors. khora
// READS them from there as DATA — a path, never a module import (janus imports
// khora, one-way, so a module cycle is impossible).
//
// Resolved relative to this module file exactly the way reader-bundle.js
// (native/the-fold) and greek-production.mjs (native/eval/lavar) resolve it:
// `..`-tripping from native/the-fold lands on the workspace root, then
// janus/priors. Data-gated still: an absent file leaves the leg null, never a
// guessed table. A missing home makes every language a typed gap, not English.
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WORKSPACE_ROOT = path.join(HERE, "..", "..", "..");
export const JANUS_DIR = path.join(WORKSPACE_ROOT, "janus");
export const PRIORS_DIR = path.join(JANUS_DIR, "priors");
export default PRIORS_DIR;
