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
import { witnessState } from "./witness-pin.mjs";

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

// ── WITNESS PINS (nesting-fix J D8) ─────────────────────────────────────────
// A supported claim's witnesses carry a sha256 of the bytes they named (cli/witness-pin.mjs, `witnessPins` on the
// assess event). A witness whose file no longer holds those bytes at that span cannot keep the claim supported:
// the sweep appends janus's own `reopen` (assessment cleared, epoch up — its dependents SUSPEND, as for any
// premise that stops standing), with a basis that says what changed. It is an event, never an edit.
const WITNESS_CHANGED = /^witness changed/;

/** Claims standing SUPPORTED whose latest assessment's pinned witness bytes have changed (or the file is gone). */
export function staleWitnesses(log, check = witnessState) {
  if (layer.state !== "present" || !log.length) return [];
  const out = [];
  for (const n of layer.reasoningAt(log).claims) {
    if (n.standing !== "supported" || !n.assessment) continue;
    const ev = log.find((e) => e.seq === n.assessment.assessedAt) ?? log[n.assessment.assessedAt];
    for (const pin of ev?.witnessPins ?? []) {
      const st = check(pin);
      if (st.state !== "fresh" && st.state !== "unpinned") out.push({ id: n.id, pin, state: st.state });
    }
  }
  return out;
}

/** The log with a `reopen` appended for each claim whose pinned witness changed. Pure over (log, check); the
 *  caller decides whether the appended events are persisted (recordRun) or only projected (readers). */
export function sweptLog(log, { at = new Date().toISOString(), check = witnessState } = {}) {
  const stale = staleWitnesses(log, check);
  if (!stale.length) return { log, swept: [] };
  let out = log;
  const done = new Set();
  for (const s of stale) {
    if (done.has(s.id)) continue;
    done.add(s.id);
    out = layer.appendReasoning(out, { kind: "reopen", id: s.id, at,
      basis: `witness changed: ${s.pin.at} (${s.pin.unit} ${s.pin.from}-${s.pin.to}) is ${s.state} — the bytes at that span are no longer the bytes this claim was assessed on` });
  }
  return { log: out, swept: stale };
}

const lastReopen = (log, id) => {
  for (let k = log.length - 1; k >= 0; k--) {
    const e = log[k];
    if (e.id !== id) continue;
    if (e.kind === "reopen") return WITNESS_CHANGED.test(e.basis ?? "") ? e.basis : null;
    if (e.kind === "assess" || e.kind === "withdraw" || e.kind === "propose") return null;
  }
  return null;
};

/** janus's projection of `log`, with one relabel khora owns: a claim reopened because its witness changed is
 *  `stale` (janus calls any claim without an assessment `candidate`). Map<id, {id, standing, because, claim}>. */
export function viewOf(log, { asOf = Infinity } = {}) {
  const out = new Map();
  if (layer.state !== "present") return out;
  const cut = Number.isFinite(asOf) ? log.slice(0, asOf) : log;
  for (const n of layer.reasoningAt(cut).claims) {
    const w = n.standing === "candidate" ? lastReopen(cut, n.id) : null;
    out.set(n.id, { id: n.id, standing: w ? "stale" : n.standing, because: w ? [w] : (n.because ?? []), witnessChanged: !!w });
  }
  return out;
}

/** The standing the record holds for each claim at its CURRENT proposal: Map<claimId, {id, standing, because}>,
 *  witness pins swept (virtually) so a changed file reads stale. Empty when the layer is absent or no record. */
export function spiralStandings(sid, log0 = loadSpiral(sid)) {
  const out = new Map();
  if (layer.state !== "present" || !log0.length) return out;
  const log = sweptLog(log0).log;
  const latest = new Map(); // claim key → id of its latest proposal (a re-ground is `<key> ·rN`)
  for (const e of log) if (e.kind === "propose") latest.set(e.claim?.key ?? e.id, e.id);
  const view = viewOf(log);
  for (const [key, id] of latest) {
    const n = view.get(id);
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
