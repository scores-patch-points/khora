// cli/tests/cennini-local.test.mjs — the J1 locality judge over the door's own served record. The control sits beside
// the claim: a remote mouth and a model outside the registered set must be flagged by the same judge.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { judgeServed, evidenceFrom, registeredFrom, KNOWN_BAD } from "../cennini-local.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const models = { object: "list", data: [{ id: "fold:qwen2.5-coder:1.5b" }, { id: "fold:nomic-embed-text:latest" }, { id: "fold:gemma2:2b" }] };
const registered = registeredFrom(models);
// verbatim shape of a real door response's `served` (gemma2:2b, local, 2026-10-13)
const REAL = { asked: "gemma2:2b", by: ["gemma2:2b"], provisional: false, mouths: [{ asked: "gemma2:2b", servedBy: "gemma2:2b", tier: "full", host: "local", reason: "resident_inside_promise", waitMs: 3675, draws: 3 }], line: null };

test("registeredFrom: the proxy's model list, prefix cut, the embedding model never counted as a mouth", () => {
  assert.deepEqual([...registered].sort(), ["gemma2:2b", "qwen2.5-coder:1.5b"]);
});

test("a real local served record is clean on both counts", () => {
  const j = judgeServed(REAL, { registered });
  assert.equal(j.ok, true);
  assert.equal(j.local, true);
  assert.equal(j.small, true);
  assert.deepEqual(j.models, ["gemma2:2b"]);
  assert.deepEqual(j.violations, []);
});

test("THE CONTROLS BUILT TO FAIL: a remote mouth is flagged as egress; a larger model as unregistered; both by the same judge", () => {
  const e = judgeServed(KNOWN_BAD.egress, { registered });
  assert.equal(e.local, false);
  assert.ok(e.violations.some((v) => v.kind === "egress" && v.host === "remote"));
  const l = judgeServed(KNOWN_BAD.larger, { registered });
  assert.equal(l.local, true, "it is on this machine");
  assert.equal(l.small, false, "but it is not a registered small model");
  assert.deepEqual(l.violations.map((v) => v.kind), ["unregistered-model"]);
});

test("no served record is a typed gap, never a pass; a mixed record is flagged by its worst mouth", () => {
  assert.equal(judgeServed(null, { registered }).gap, "no-served-record");
  assert.equal(judgeServed({}, { registered }).ok, false);
  const mixed = { mouths: [REAL.mouths[0], KNOWN_BAD.egress.mouths[0]] };
  const j = judgeServed(mixed, { registered });
  assert.equal(j.local, false);
  assert.deepEqual(j.hosts, ["local", "remote"]);
});

test("evidenceFrom: unjudged runs are counted apart from clean ones, fake runs are skipped, controls are reported", () => {
  const recs = [
    { live: true, door: { served: REAL } }, { live: true, door: { served: REAL } },
    { live: true, door: { served: null } }, { live: false, door: { served: KNOWN_BAD.egress } },
  ];
  const ev = evidenceFrom(recs, { registered });
  assert.equal(ev.n, 3);
  assert.equal(ev.judged, 2);
  assert.equal(ev.unjudged, 1);
  assert.equal(ev.egressViolations, 0);
  assert.equal(ev.modelViolations, 0);
  assert.deepEqual(ev.models, ["gemma2:2b"]);
  assert.deepEqual(ev.controls, { egressFlagged: true, largerFlagged: true });
  const dirty = evidenceFrom([{ live: true, door: { served: KNOWN_BAD.egress } }], { registered });
  assert.equal(dirty.egressViolations, 1);
});

test("the judge reaches for nothing: no network, no token, no write", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-local.mjs"), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(|x-heimdall-token|HEIMDALL_TOKEN|writeFile|appendFile/i);
});
