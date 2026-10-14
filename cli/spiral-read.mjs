// cli/spiral-read.mjs — THE SESSION'S SPIRAL RECORD, READ (nesting-fix J D3, 2026-10-14).
//
// The record's location and its projection, in one place: cli/claude-code-spiral.mjs writes through it, and the
// readers that were blind to janus's verdicts (recall, the context CLI) read through it. Before this, a claim janus
// had REFUTED was recalled next turn as "[single-witness · 1 grounded run(s)] … Build on these" — the spiral's
// standing never reached the claim as the next turn reads it (J D3).
//
// Layers never degrade the base: a claim the spiral has not judged adversely reads exactly as the ledger fold
// reads it. Only a standing the spiral actually holds against a claim (refuted, suspended, stale, withdrawn) is
// attached, and it is attached only when EVERY spiral node for that proposition stands against it (a claim still
// supported at another ground is not marked down). An absent spiral layer attaches nothing and says so (typed).
import fs from "node:fs";
import path from "node:path";
import { EO_DIR } from "./claude-code-state.mjs";
import { probeSpiral } from "./spiral-layer.mjs";
import { claimId as claimIdOf } from "./claim-identity.mjs";

export const SPIRAL_DIR = path.join(EO_DIR, "spiral");
export const safeSid = (sid) => String(sid ?? "").replace(/[^A-Za-z0-9_-]/g, "");
export const spiralFile = (sid) => path.join(SPIRAL_DIR, `${safeSid(sid)}.jsonl`);

export function loadSpiral(sid) {
  let raw = "";
  try { raw = fs.readFileSync(spiralFile(sid), "utf8"); } catch { return []; }
  return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const layer = await probeSpiral();
export const spiralReadLayer = layer;

/** The standing the record holds for each claim at its CURRENT proposal: Map<claimId, {id, standing, because}>.
 *  Empty when the layer is absent or the session has no record. */
export function spiralStandings(sid, log = loadSpiral(sid)) {
  const out = new Map();
  if (layer.state !== "present" || !log.length) return out;
  const latest = new Map(); // claim key → id of its latest proposal (a re-ground is `<key> ·rN`)
  for (const e of log) if (e.kind === "propose") latest.set(e.claim?.key ?? e.id, e.id);
  const byId = new Map(layer.reasoningAt(log).claims.map((n) => [n.id, n]));
  for (const [key, id] of latest) {
    const n = byId.get(id);
    if (n) out.set(key, { id, standing: n.standing, because: n.because ?? [] });
  }
  return out;
}

export const ADVERSE = Object.freeze(["refuted", "suspended", "stale", "withdrawn"]);
const RANK = new Map(ADVERSE.map((s, i) => [s, i]));

/** Attach `spiral: {standing, because, id}` to each folded note the session's record holds adversely. Mutates and
 *  returns `notes`. `instances[].claimId` (cli/claude-code-context.mjs) is the join. */
export function annotateWithSpiral(notes, sid) {
  const standings = spiralStandings(sid);
  if (!standings.size) return notes;
  for (const n of notes) {
    const nodes = (n.instances ?? []).map((i) => standings.get(i.claimId)).filter(Boolean);
    if (!nodes.length || !nodes.every((x) => RANK.has(x.standing))) continue;
    const worst = nodes.reduce((a, b) => (RANK.get(b.standing) < RANK.get(a.standing) ? b : a));
    n.spiral = { standing: worst.standing, because: worst.because, id: worst.id };
  }
  return notes;
}

export { claimIdOf };
