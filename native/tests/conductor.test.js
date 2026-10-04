// tests/conductor.test.js — the first useful experiment, verified.
//
// A real, resumable investigation inside a session runtime:
//   1. Admit a purpose
//   2. Khora reads the encounter (byte addressing + recurrence relations)
//   3. Janus relates the accounts (supporting / contradiction / broken)
//   4. Construct the next transition
//   5. Execute it for real (the tool registry is the realization point)
//   6. Pathos: a correction changes the NEXT actual action
//   7. Penelope retains the trace durably; interrupt/resume reconciles
//
// The five properties the plan names are each tested here:
//   P1  a correction changes the actual next action
//   P2  confidentiality: a declined inquiry is left alone, never re-queryed
//   P3  no duplicate effects after restart (receipt reconciled before retry)
//   P4  useful work without inventing evidence (a broken citation is a gap)
//   P5  the runtime with the relational distinctions removed performs worse

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConductor } from "../conductor/conductor.js";
import { createTools } from "../conductor/tools.js";
import { materializeExperiment, DOCUMENT } from "../conductor/experiment.js";
import { createDurableRetention } from "../../../penelope/organs/integration/retention-durable.mjs";
import { verifyRetention } from "../../../penelope/organs/integration/retention.mjs";
import { createPathosLoop } from "../pathos/index.js";
import { constructReadAdmittedMaterial, constructComputeInIsolation } from "../constructors/index.js";

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "fold-conductor-"));
  t.after(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });
  return dir;
}

/** A conductor over a real experiment workspace + a durable store file. */
function makeConductor(t, { dir = null } = {}) {
  const workspace = dir ?? tempDir(t);
  materializeExperiment(workspace);
  const storeFile = join(workspace, "trace.jsonl");
  const tools = createTools({ workspace });
  const conductor = createConductor({ workspace, tools, storeFile });
  conductor.admitPurpose({
    who: "test",
    scope: ["workspace"],
    evidence: [DOCUMENT.claim, ...DOCUMENT.needles],
    completion: "a verified finding with the trace retained",
    needles: DOCUMENT.needles,
    claim: "1907",
    rivals: ["1912"],
  });
  return { conductor, workspace, storeFile };
}

/** Read the whole workspace (document + present sources) and derive. */
async function readAndDerive(conductor) {
  const { readdirSync, statSync } = await import("node:fs");
  const sources = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (/\.(txt|md|json)$/.test(n)) sources.push(f); } };
  walk(conductor.workspace);
  const readouts = [];
  for (const p of sources) {
    const rel = p.slice(conductor.workspace.length + 1);
    const r = conductor.tools.read("perm:" + rel);
    readouts.push({ address: "perm:" + rel, ok: r.ok, text: r.ok ? r.result.text : null, reason: r.ok ? null : r.reason });
  }
  const reading = await conductor.read(readouts);
  return { reading, derived: conductor.derive(reading) };
}

// ── P1: a correction changes the actual next action ─────────────────────────
test("P1: a correction changes the actual next action (pathos, not prose)", async (t) => {
  const { conductor } = makeConductor(t);
  const { reading } = await readAndDerive(conductor);

  // Construct + execute the next transition (materialize the addressed artifact).
  const { constructMaterializePrivateArtifact } = await import("../constructors/index.js");
  const mat = constructMaterializePrivateArtifact({ purpose: "p1", encounters: [], artifact: "finding", scope: "private" });
  const before = await conductor.step(mat);
  assert.ok(before.executed.ok, "the materialize transition executes");

  // A correction arrives: the loop must NOT continue as if nothing changed —
  // the next action becomes report_gap.
  const r = await conductor.respond({ type: "response", bearer: "archivist", text: "the year is 1907, per the Act's own text", correction: true });
  assert.equal(r.reason, "correction → report the gap");
  assert.equal(r.next?.proposed_change, "report_gap", "the correction changes the NEXT actual action");
  // The loop's last transition is now the report, not the prior materialize.
  assert.equal(conductor.loop.state.lastTransition.proposed_change, "report_gap");
});

// ── P2: a declined inquiry is left alone, never re-queryed ──────────────────
test("P2: a declined inquiry is preserved — never retried, never re-contacted", async (t) => {
  const { conductor } = makeConductor(t);
  const r = await conductor.respond({ type: "response", bearer: "archivist", text: "declined", refusal: true });
  assert.equal(r.reason, "refusal → leave-alone", "a refusal turns the next action into leave-alone");
  assert.equal(r.next?.proposed_change, "leave_alone");
  // The loop's account records the decline as a binding disposition.
  assert.equal(conductor.loop.state.accounts.get("archivist").epistemic_state, "inquiry_declined");
  // Re-querying a declined party (an encounter that marks the bearer withheld)
  // is an obligation, never a transition.
  const { constructQueryAuthorizedSource } = await import("../constructors/index.js");
  const declinedEncounter = {
    schema: "Encounter@1", version: 1, encounter_id: "enc-declined",
    disclosure_scope: ["queries-to-archivist"],
    participants: [{ kind: "withheld", evidence: ["declined"], scope: ["this inquiry"] }],
  };
  const q = constructQueryAuthorizedSource({ purpose: "p2", encounters: [declinedEncounter], source: "archivist", scope: "queries-to-archivist" });
  assert.equal(q.schema, "UnresolvedObligation@1", "retrying a declined inquiry is an obligation, not a transition");
  // The completion is left-alone (a completed disposition), not a failure.
  const { completion } = await conductor.complete({ task_id: "p2", checks: [] });
  assert.equal(completion.completion_state, "left_alone");
});

// ── P3: no duplicate effects after restart ──────────────────────────────────
test("P3: a restart does not re-execute an effect whose receipt was never recorded", async (t) => {
  const { conductor, storeFile } = makeConductor(t);
  const { reading } = await readAndDerive(conductor);
  const { constructMaterializePrivateArtifact } = await import("../constructors/index.js");
  const mat = constructMaterializePrivateArtifact({ purpose: "p3", encounters: [], artifact: "finding", scope: "private" });
  const before = await conductor.step(mat);
  const effectCount = conductor.trace.entries.filter((e) => e.schema === "ExecutedEffect@1").length;
  assert.ok(before.executed.ok);
  assert.ok(effectCount >= 1, "the effect is recorded on the trace");

  // Retain durably, then "restart": reopen the store and reconcile receipt.
  conductor.interrupt();
  const store = createDurableRetention({ file: storeFile });
  const retained = store.byId("conductor-001");
  assert.ok(retained, "the trace survived to the durable store");
  const v = verifyRetention(store, { hashChain: (tr) => tr.entries ? { ok: true, problems: [] } : { ok: false, problems: ["no entries"] } });
  assert.ok(v.ok, "the retained chain verifies");

  const resumed = await conductor.resume();
  assert.equal(resumed.ok, true);
  assert.equal(resumed.safeToRetry.length, 0, "no effect is re-executed on restart");
  // The retained store still holds exactly the original trace — nothing re-appended.
  assert.equal(store.size, 1, "a restart does not duplicate the retained run");
});

// ── P4: useful work without inventing evidence ──────────────────────────────
test("P4: a broken citation is a typed gap, never invented; the finding rests on admitted bytes", async (t) => {
  const { conductor, workspace } = makeConductor(t);
  const { reading, derived } = await readAndDerive(conductor);

  const broken = derived.findings.filter((f) => f.kind === "broken_citation");
  assert.ok(broken.length > 0, "the broken citation (source-c) is found");
  assert.ok(broken.some((f) => f.address === "perm:source-c.txt"), "source-c is named as unresolved");
  assert.equal(broken.every((f) => f.unresolved), true, "broken citations are unresolved, never resolved by guess");

  const contradictions = derived.findings.filter((f) => f.kind === "contradiction");
  assert.ok(contradictions.length > 0, "the contradiction between source-a and source-b is found");
  const c = contradictions[0];
  assert.notEqual(c.between[0], c.between[1], "a contradiction is between two DIFFERENT sources");
  assert.ok(c.between.includes("perm:source-a.txt") && c.between.includes("perm:source-b.txt"), "the two disagreeing sources are named");

  // The addressed artifact is written for real (the realization point).
  const { constructMaterializePrivateArtifact } = await import("../constructors/index.js");
  const mat = constructMaterializePrivateArtifact({ purpose: "p4", encounters: [], artifact: "finding", scope: "private" });
  const executed = await conductor.step(mat);
  assert.ok(executed.executed.ok, "the artifact materializes");
  const { completion } = await conductor.complete({ task_id: "p4", checks: [] });
  assert.equal(completion.completion_state, "accomplished", "useful work completed");
  assert.match(completion.note, /no independently specified checks/, "completion does not invent a check");
});

// ── P5: the same runtime with the relational distinctions removed is worse ──
test("P5: removing the relational distinctions performs worse on unauthorized effects", async (t) => {
  const { conductor, workspace } = makeConductor(t);
  const { reading, derived } = await readAndDerive(conductor);

  // The full system refuses to query a source that DECLINED (withheld).
  const { constructQueryAuthorizedSource } = await import("../constructors/index.js");
  const declinedEncounter = {
    schema: "Encounter@1", version: 1, encounter_id: "enc-declined",
    disclosure_scope: ["queries-to-archivist"],
    participants: [{ kind: "withheld", evidence: ["declined"], scope: ["this inquiry"] }],
  };
  const forbidden = constructQueryAuthorizedSource({ purpose: "p5", encounters: [declinedEncounter], source: "archivist", scope: "queries-to-archivist" });
  assert.equal(forbidden.schema, "UnresolvedObligation@1", "the full system refuses to re-query a declined source");

  // The ablation removes standing: the withheld party is treated as observed,
  // so the SAME operation becomes a transition that executes (unauthorized).
  const observed = { ...declinedEncounter, participants: [{ kind: "observed", identity: "archivist", evidence: ["ablated"], scope: [] }] };
  const abl = createPathosLoop({ purpose: "p5-ablated", encounters: [observed], removeCapacities: ["no-standing"], sources: { archivist: "an answer" } });
  const invite = constructQueryAuthorizedSource({ purpose: "p5-ablated", encounters: [observed], source: "archivist", scope: "queries-to-archivist" });
  assert.equal(invite.schema, "SituatedTransition@1", "without standing the declined source is treated as a plain query target");
  const r = abl.run(invite);
  assert.equal(r.ok, true, "the ablated runtime executes the query the full system refuses");
  assert.ok(abl.state.runtime.effects.length > 0, "an unauthorized effect was executed in the ablated runtime");
});

// ── the experiment's own shape: real retrieval, real contradiction, gap ─────
test("the experiment corpus yields a supporting, contradictory and broken citation", async (t) => {
  const { conductor, workspace } = makeConductor(t);
  const { reading, derived } = await readAndDerive(conductor);

  const kinds = derived.findings.map((f) => f.kind);
  assert.ok(kinds.includes("supporting"), "a supporting citation is found");
  assert.ok(kinds.includes("contradiction"), "a contradictory citation is found");
  assert.ok(kinds.includes("broken_citation"), "a broken citation is found");
  // No invented material: every admitted source's bytes are real files.
  const readouts = reading.readouts.filter((r) => r.ok);
  for (const r of readouts) assert.ok(typeof r.text === "string" && r.text.length > 0, `${r.address} was read for real`);
});

// ── the conductor's own seam: a folded test of P1+P3 together ───────────────
test("interrupt then resume: the investigation continues, not re-executes", async (t) => {
  const { conductor, storeFile } = makeConductor(t);
  const { reading } = await readAndDerive(conductor);
  const { constructMaterializePrivateArtifact } = await import("../constructors/index.js");

  // Run one step, interrupt (retain durably), then complete a second step and
  // confirm resume reconciles without duplicating the first.
  const mat1 = constructMaterializePrivateArtifact({ purpose: "p6", encounters: [], artifact: "first", scope: "private" });
  await conductor.step(mat1);
  conductor.interrupt();

  const resumed = await conductor.resume();
  assert.equal(resumed.ok, true);
  assert.equal(resumed.safeToRetry.length, 0, "the first effect is not re-executed after resume");

  const mat2 = constructMaterializePrivateArtifact({ purpose: "p6", encounters: [], artifact: "second", scope: "private" });
  const r2 = await conductor.step(mat2);
  assert.ok(r2.executed.ok, "the investigation continues after resume");
  assert.equal(conductor.trace.entries.filter((e) => e.schema === "ExecutedEffect@1").length, 2, "two distinct effects, none duplicated");
});

// ── the shared project: a named directory binds the door to that folder ──────
// The chat and the machine door must stand in the SAME place. The opencode-lane
// wire carries a project folder as `directory` on session create; the door uses
// it as the workspace instead of seeding a private one, and never writes the
// experiment corpus into a person's real folder.
test("a session created with a directory binds to it and is not seeded", async (t) => {
  const { createConductorServer } = await import("../conductor/server.mjs");
  const project = tempDir(t);
  // A real file the person already has in the folder.
  writeFileSync(join(project, "README.md"), "# the person's own project\n", "utf8");
  const runs = tempDir(t);

  const door = createConductorServer({ runsDir: runs });
  await door.listen();
  const base = `http://127.0.0.1:${door.server.address().port}`;
  t.after(() => door.close());

  const created = await (await fetch(base + "/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "shared project", directory: project }),
  })).json();
  assert.ok(created.id, "the door issues a session id");

  const s = door.sessions.get(created.id);
  assert.equal(s.workspace, project, "the door stands in the project's folder");
  assert.ok(existsSync(join(project, "README.md")), "the person's own file is untouched");
  assert.ok(!existsSync(join(project, "source-a.txt")), "the experiment corpus was NOT seeded into a real folder");
});
