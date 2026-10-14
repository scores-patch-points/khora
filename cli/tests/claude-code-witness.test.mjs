// cli/tests/claude-code-witness.test.mjs — nesting-fix J D8: a witness knows its unit and its bytes; a witness on
// a file edited after assessment reads stale.
//
// Audit repro (J.md D8): a line span was written `file#L-(L+1)` in the same syntax as a byte span
// `file#from-to`, no content hash was kept, and 43 of 67 live witnesses sat on files modified after assessment with
// no way to say whether the bytes changed.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "witness-home-"));
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = path.join(HOME, "led");

const W = await import("../witness-pin.mjs");
const SP = await import("../claude-code-spiral.mjs");
const { spiralStandings, viewOf } = await import("../spiral-read.mjs");
const { spiralLayer } = SP;
const skip = spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "witness-files-"));
const file = (name, text) => { const f = path.join(dir, name); fs.writeFileSync(f, text); return f; };

test("spanBytes names the same bytes in both units: byte offsets are UTF-8, lines are 1-based and inclusive", () => {
  const buf = Buffer.from("// café\nimport a from './a.js';\nlet z = 1;\n");
  assert.equal(W.spanBytes(buf, "line", 2, 2).toString(), "import a from './a.js';");
  assert.equal(W.spanBytes(buf, "line", 1, 2).toString(), "// café\nimport a from './a.js';");
  const from = Buffer.byteLength("// café\n");
  assert.equal(W.spanBytes(buf, "byte", from, from + 6).toString(), "import");
  assert.equal(W.spanBytes(buf, "line", 9, 9), null, "a line past the file is out of range, not empty");
  assert.equal(W.spanBytes(buf, "byte", 5, 5), null);
});

test("a pin goes stale when the bytes at the span change, and only then (controls: elsewhere-edit, missing file, unpinned)", () => {
  const f = file("pin.js", "a();\nb();\nc();\n");
  const pin = W.pinWitness({ address: `${f}#2-3`, unit: "line", file: f, from: 2, to: 2 });
  assert.equal(pin.bytes, 4);
  assert.equal(W.witnessState(pin).state, "fresh");
  fs.writeFileSync(f, "a();\nb();\nc();\nd();\n");      // appended elsewhere: the span's bytes are what they were
  assert.equal(W.witnessState(pin).state, "fresh");
  fs.writeFileSync(f, "a();\nB();\nc();\nd();\n");      // the witnessed line itself changed
  assert.equal(W.witnessState(pin).state, "stale");
  fs.writeFileSync(f, "a();\n");                          // the span no longer exists
  assert.equal(W.witnessState(pin).state, "out-of-range");
  fs.rmSync(f);
  assert.equal(W.witnessState(pin).state, "missing");
  assert.equal(W.witnessState({ at: `${f}#2-3` }).state, "unpinned", "an event written before pins existed is unpinned, never guessed fresh");
  assert.equal(W.describeUnpinned(`${f}#2-3`).unit, "unmarked");
});

const G = (f) => ({ id: "p", ground: f, rel: "returns", roles: { ARG0: "parse", ARG1: "ast" }, polarity: "+", force: "default" });
const Q = (f) => ({ id: "q", ground: f, rel: "is-safe-for", roles: { ARG0: "parse", ARG1: "input" }, polarity: "+", force: "default", premises: ["p"] });
const run = (decl, sources) => ({ declared: decl, inputClaims: decl.map((c) => ({ id: c.id, premises: c.premises })), sources, findings: [] });

test("a line witness and a byte witness are told apart on the event, beside the unchanged address", { skip }, () => {
  const f = file("units.js", "import { thing } from './lib/thing.js';\nfunction outer() { return thing(); }\n");
  const read = SP.codeGroundReader();
  const byteClaim = { id: "i", ground: f, rel: "imports", roles: { ARG0: "m", ARG1: "thing" }, polarity: "+", force: "default" };
  const lineClaim = { id: "r", ground: f, rel: "returns", roles: { ARG0: "outer", ARG1: "thing" }, polarity: "+", force: "default" };
  const log = SP.spiralEventsOf([], run([byteClaim, lineClaim], [{}, { verdict: "cited", file: f, line: 2 }]), { forWhom: "session:u", readGround: read, pin: W.pinWitness });
  const [pb] = log.find((e) => e.kind === "propose" && e.relation.verb === "imports").witnessPins;
  const [pl] = log.find((e) => e.kind === "propose" && e.relation.verb === "returns").witnessPins;
  assert.equal(pb.unit, "byte");
  assert.match(pb.at, /#\d+-\d+$/);
  assert.equal(pl.unit, "line");
  assert.equal(pl.from, 2); assert.equal(pl.to, 2, "the true line, not the +1 janus's address grammar forces");
  assert.equal(pl.at, `${f}#2-3`, "the address janus holds is unchanged and still readable");
  assert.match(pb.sha256, /^[0-9a-f]{64}$/);
  // the assessment carries the same pins, so staleness is read off the assessment that made the claim stand
  assert.deepEqual(log.find((e) => e.kind === "assess" && e.id.startsWith("imports")).witnessPins, [pb]);
});

test("a witness on a file edited after assessment reads STALE, its dependents SUSPEND, and the reopen says why — and an edit elsewhere does not", { skip }, () => {
  const f = file("edit.js", "function parse() { return ast(); }\nfunction other() { return 1; }\n");
  const at1 = "2026-10-14T10:00:00.000Z", at2 = "2026-10-14T11:00:00.000Z";
  const P = G(f), Qc = Q(f);
  const log = SP.spiralEventsOf([], run([P, Qc], [{ verdict: "cited", file: f, line: 1 }, { verdict: "cited", file: f, line: 1 }]), { forWhom: "session:e", at: at1, pin: W.pinWitness });
  const id = (c) => SP.claimId(c);
  assert.equal(viewOf(log).get(id(P)).standing, "supported");
  assert.equal(viewOf(log).get(id(Qc)).standing, "supported");
  assert.deepEqual(SP.staleWitnesses(log), []);

  // control: the OTHER function changes; the witnessed line's bytes are the bytes that were read
  fs.writeFileSync(f, "function parse() { return ast(); }\nfunction other() { return 2; }\n");
  assert.deepEqual(SP.staleWitnesses(log), []);
  assert.equal(SP.movedSince(SP.sweptLog(log, { at: at2 }).log, log.length).length, 0);

  // the witnessed line itself is edited
  fs.writeFileSync(f, "function parse() { return lex(); }\nfunction other() { return 2; }\n");
  const stale = SP.staleWitnesses(log);
  assert.equal(stale.length, 2, "both claims rest on that line");
  assert.equal(stale[0].state, "stale");
  const swept = SP.sweptLog(log, { at: at2 }).log;
  const reopen = swept.find((e) => e.kind === "reopen" && e.id === id(P));
  assert.match(reopen.basis, /^witness changed: .*#1-2 \(line 1-1\) is stale/);
  const v = viewOf(swept);
  assert.equal(v.get(id(P)).standing, "stale");
  assert.match(v.get(id(P)).because[0], /witness changed/);
  const moved = SP.movedSince(swept, log.length);
  assert.ok(moved.some((m) => m.id === id(P) && m.standing === "stale"), JSON.stringify(moved));
  assert.match(SP.stopDecision(swept, at2) ?? "", /now \*\*stale\*\*/);

  // re-stated on the bytes as they are now, the claim re-earns (and is pinned afresh)
  const again = SP.spiralEventsOf(swept, run([P], [{ verdict: "cited", file: f, line: 1 }]), { forWhom: "session:e", at: at2, pin: W.pinWitness });
  assert.equal(viewOf(again).get(id(P)).standing, "supported");
  assert.deepEqual(SP.staleWitnesses(again).filter((s) => s.id === id(P)), []);
});

test("end to end: recordRun sweeps a changed witness onto the record, carries it as a pending verdict, and recall's standings read it stale", { skip }, () => {
  const f = file("e2e.js", "function parse() { return ast(); }\n");
  const sid = "witness-e2e";
  const first = SP.recordRun(sid, run([G(f)], [{ verdict: "cited", file: f, line: 1 }]));
  assert.equal(first.earned, 1);
  fs.writeFileSync(f, "function parse() { return lex(); }\n");
  assert.equal(spiralStandings(sid).get(SP.claimId(G(f))).standing, "stale", "a reader sees it stale before any new run");
  const other = { id: "z", ground: f, rel: "returns", roles: { ARG0: "other", ARG1: "x" }, polarity: "+", force: "default" };
  const second = SP.recordRun(sid, run([other], [{ verdict: "cited", file: f, line: 1 }]));
  assert.ok(second.moved.some((m) => m.standing === "stale"), JSON.stringify(second.moved));
  const log = SP.loadSpiral(sid);
  assert.ok(log.some((e) => e.kind === "reopen" && /witness changed/.test(e.basis)), "append-only: the reopen is on the record");
  const pend = SP.loadPending(sid);
  assert.ok(pend.some((e) => e.kind === "verdict" && e.standing === "stale"));
});
