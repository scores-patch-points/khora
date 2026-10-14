// cli/tests/claude-code-spiral.test.mjs — the janus wiring (cli/claude-code-spiral.mjs) against janus's
// REAL organs (reasoning-spiral.js, consequence-verdict.js; no stand-ins), plus one run of the real
// cli/reason.mjs. Each gate test carries the control that must stay silent.
import { test as nodeTest } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { spiralEventsOf, movedSince, stopDecision, claimKey, spiralFile, codeGroundReader, spiralLayer } from "../claude-code-spiral.mjs";

// janus's spiral organs exist only on its unmerged branch (nesting-fix J D1); on the merged stack they are a typed
// absence (see claude-code-spiral-layer.test.mjs) and the tests that need them are SKIPPED with that reason, never
// failed at import.
const reasoningAt = (...a) => spiralLayer.reasoningAt(...a);
const test = (name, fn) => nodeTest(name, { skip: spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason} (janus@39b705e layout)` }, fn);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const G = "/repo/src/a.js";
const claim = (id, rel, a0, a1, extra = {}) => ({ id, ground: G, rel, roles: { ARG0: a0, ARG1: a1 }, polarity: "+", force: "default", ...extra });
const cited = (line) => ({ verdict: "cited", file: G, line });
const run = (declared, sources = [], findings = [], extra = {}) => ({ declared, inputClaims: declared.map((c) => ({ id: c.id, premises: c.premises })), sources, findings, ...extra });
const standing = (log, c) => reasoningAt(log).claims.find((n) => n.id === claimKey(c))?.standing;

test("a cited claim earns SUPPORTED by testimony; an uncited premise-less one stays UNLICENSED, never assessed", () => {
  const p = claim("p", "returns", "parse", "ast"), q = claim("q", "calls", "parse", "lex");
  const log = spiralEventsOf([], run([p, q], [cited(10), { verdict: "unattributed", file: G }]), { forWhom: "session:t" });
  assert.equal(standing(log, p), "supported");
  assert.equal(log.find((e) => e.kind === "assess" && e.id === claimKey(p)).method, "testimony");
  assert.equal(standing(log, q), "unlicensed");
  assert.equal(log.filter((e) => e.kind === "assess" && e.id === claimKey(q)).length, 0);
});

test("a citation whose polarity guard is unreachable is not a witness", () => {
  const p = claim("p", "returns", "parse", "ast");
  const log = spiralEventsOf([], run([p], [{ ...cited(10), guard: { reachable: false } }]), { forWhom: "session:t" });
  assert.equal(standing(log, p), "unlicensed");
});

test("an error finding that names the claim REFUTES it; a falsification kind is recorded as perturbation", () => {
  const p = claim("p", "returns", "parse", "ast");
  const log = spiralEventsOf([], run([p], [cited(3)], [{ kind: "strict_guard_unreachable", severity: "error", claims: ["p"], detail: "x" }]), { forWhom: "session:t" });
  assert.equal(standing(log, p), "refuted");
  assert.equal(log.at(-1).method, "perturbation");
});

test("retracting a premise SUSPENDS what rested on it; the Stop decision names it — and an unchanged restatement stays silent (control)", () => {
  const p = claim("p", "returns", "parse", "ast");
  const q = { ...claim("q", "is-safe-for", "parse", "untrusted-input"), premises: ["p"] };
  const t1 = "2026-10-13T10:00:00.000Z", t2 = "2026-10-13T11:00:00.000Z";
  let log = spiralEventsOf([], run([p, q], [cited(10), cited(20)]), { forWhom: "session:t", at: t1 });
  assert.equal(standing(log, q), "supported");

  // control: turn 2 restates both unchanged → no new events, nothing moved, the gate is silent.
  const same = spiralEventsOf(log, run([p, q], [cited(10), cited(20)]), { forWhom: "session:t", at: t2 });
  assert.equal(same.length, log.length);
  assert.equal(stopDecision(same, t2), null);

  // turn 2 retracts p.
  log = spiralEventsOf(log, run([{ ...p, polarity: "-" }], [cited(10)]), { forWhom: "session:t", at: t2 });
  assert.equal(standing(log, p), "withdrawn");
  assert.equal(standing(log, q), "suspended");
  const moved = movedSince(log, log.findIndex((e) => e.at >= t2));
  assert.deepEqual(moved.map((m) => m.id), [claimKey(q)]);
  const why = stopDecision(log, t2);
  assert.match(why, /now \*\*suspended\*\*/);
  assert.ok(why.includes(claimKey(q)));
  assert.equal(stopDecision(log, "2026-10-13T12:00:00.000Z"), null, "a later turn that moved nothing is not blocked for history");
});

test("a one-valued revision withdraws the old value only when the run declares the relation functional", () => {
  const a = claim("a", "listens-on", "proxy", "11436"), b = claim("b", "listens-on", "proxy", "11437");
  const base = spiralEventsOf([], run([a], [cited(1)]), { forWhom: "session:t" });
  const loose = spiralEventsOf(base, run([b], [cited(2)]), { forWhom: "session:t" });
  assert.equal(standing(loose, a), "supported", "control: not declared functional → both stand");
  const strict = spiralEventsOf(base, run([b], [cited(2)], [], { declare: { functional: ["listens-on"] } }), { forWhom: "session:t" });
  assert.equal(standing(strict, a), "withdrawn");
  assert.equal(standing(strict, b), "supported");
});

test("the real cli/reason.mjs records its run on the session's janus spiral and reports the verdict", () => {
  const session = `spiral-test-${process.pid}-${Date.now()}`;
  const spec = { session, claims: [{ id: "c1", ground: path.join(HERE, "..", "claude-code-spiral.mjs"), rel: "imports", roles: { ARG0: "claude-code-spiral", ARG1: "reasoning-spiral" }, said: "claude-code-spiral imports appendReasoning and reasoningAt from janus's reasoning-spiral organ" }] };
  try {
    const r = spawnSync(process.execPath, [path.join(HERE, "..", "reason.mjs"), "--json"], { input: JSON.stringify(spec), encoding: "utf8", timeout: 110000 });
    const out = JSON.parse(r.stdout);
    assert.ok(out.janus && !out.janus.error, `janus recorded: ${JSON.stringify(out.janus)}`);
    assert.equal(out.janus.earned + out.janus.withheld + out.janus.defeated, 1);
    const lines = fs.readFileSync(spiralFile(session), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(lines[0].kind, "propose");
    assert.equal(lines[0].schema, "ReasoningSpiral@1");
  } finally { fs.rmSync(spiralFile(session), { force: true }); }
});

test("khora's code reader witnesses a code claim at its exact bytes; not finding is never a refutation (control)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spiral-ground-"));
  const file = path.join(dir, "mod.js");
  const md = path.join(dir, "notes.md");
  // a multi-byte character before the import: the witness must be a BYTE span, not a char index.
  fs.writeFileSync(file, "// café — fixture\nimport { thing } from './lib/thing.js';\nfunction outer() { helper(); }\nfunction helper() { return 1; }\n");
  fs.writeFileSync(md, "outer imports thing.\n");
  try {
    const read = codeGroundReader();
    const bytes = fs.readFileSync(file);
    const at = (w) => { const [, from, to] = w.match(/#(\d+)-(\d+)$/); return bytes.subarray(Number(from), Number(to)).toString("utf8"); };
    const c = (rel, a1, extra = {}) => ({ ground: file, rel, roles: { ARG0: "mod", ARG1: a1 }, polarity: "+", ...extra });

    const imp = read(c("imports", "thing"));
    assert.equal(imp.holds, true);
    assert.match(at(imp.witness), /\.\/lib\/thing\.js/, "the witness re-expands to the import's own bytes");

    const call = read({ ...c("calls", "helper"), ground: `${file}/outer` });
    assert.equal(call.holds, true);
    assert.match(at(call.witness), /helper/);

    const neverCalls = read(c("calls", "saveState", { polarity: "-" }));
    assert.equal(neverCalls.holds, true, "absence over a whole-file read holds a negative claim");
    assert.equal(neverCalls.witness, `${file}#0-${bytes.length}`);

    const denied = read(c("calls", "helper", { polarity: "-" }));
    assert.equal(denied.holds, false, "a negative claim the reader contradicts does not hold");

    assert.equal(read(c("imports", "nowhere")), null, "control: a positive claim not read is NOT refuted");
    assert.equal(read({ ...c("imports", "thing"), ground: md }), null, "control: a non-code ground is not read here");
    assert.equal(read(c("returns", "thing")), null, "control: a rel the code reader does not order is not read");

    // through janus: the read witness earns SUPPORTED by testimony from khora, with no citation at all.
    const claimImp = { id: "i", ...c("imports", "thing"), force: "default" };
    const log = spiralEventsOf([], { declared: [claimImp], inputClaims: [{ id: "i" }], sources: [], findings: [] }, { forWhom: "session:t", readGround: read });
    assert.equal(standing(log, claimImp), "supported");
    assert.equal(log.at(-1).by, "khora:adapters/code/edges.js#readEdges");
    const claimNo = { id: "n", ...c("calls", "helper", { polarity: "-" }), force: "default" };
    const log2 = spiralEventsOf([], { declared: [claimNo], inputClaims: [{ id: "n" }], sources: [], findings: [] }, { forWhom: "session:t", readGround: read });
    assert.equal(standing(log2, claimNo), "refuted");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a claim proposed before its ground existed earns it when the ground arrives (regression: found live 2026-10-13)", () => {
  const p = claim("p", "returns", "parse", "ast");
  let log = spiralEventsOf([], run([p], [{ verdict: "unattributed", file: G }]), { forWhom: "session:t" });
  assert.equal(standing(log, p), "unlicensed");
  log = spiralEventsOf(log, run([p], [cited(10)]), { forWhom: "session:t" });
  const fold = reasoningAt(log).claims;
  // janus ranks its low gate above withdrawal, so the superseded proposal still PROJECTS unlicensed; the
  // withdrawal is on the record as an event, never an erasure.
  assert.equal(fold.find((n) => n.id === claimKey(p)).standing, "unlicensed");
  assert.ok(log.some((e) => e.kind === "withdraw" && e.id === claimKey(p) && /re-proposed with a ground/.test(e.basis)));
  assert.equal(fold.find((n) => n.id === `${claimKey(p)} ·r2`).standing, "supported");
  // a later premise reference by run-local id resolves to the LATEST revision, not the withdrawn one.
  const q = { ...claim("q", "is-safe-for", "parse", "untrusted-input"), premises: ["p"] };
  log = spiralEventsOf(log, run([p, q], [cited(10), cited(20)]), { forWhom: "session:t" });
  assert.deepEqual(reasoningAt(log).claims.find((n) => n.id === claimKey(q)).premises, [`${claimKey(p)} ·r2`]);
  assert.equal(standing(log, q), "supported");
});
