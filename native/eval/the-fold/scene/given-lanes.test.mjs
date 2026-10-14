// given-lanes.test.mjs — the given tier's laws, each with the mutation that must break it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { giveHyperlexiconAffordance, licenseStanding } from "../../../kernel/hyperlexicon.js";
import { MODALS, BEARER_UNIVERSAL, readCharter, lexicalLane, priorFor, modalClauses, digest32 } from "./given-lanes.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UDHR = path.join(HERE, "udhr-src", "udhr-eng.txt");
const INJ = "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-injunctions-v1.json";
const PRIORS = path.resolve(HERE, "../../../../../janus/priors");
const have = fs.existsSync(UDHR) && fs.existsSync(INJ);

test("the modal class is the injunction reading's own (drift guard)", { skip: !fs.existsSync(path.join(HERE, "read-injunctions.mjs")) }, () => {
  const src = fs.readFileSync(path.join(HERE, "read-injunctions.mjs"), "utf8");
  for (const M of MODALS) assert.ok(src.includes(String(M.re)), `read-injunctions.mjs no longer carries ${M.re}`);
  assert.ok(src.includes(String(BEARER_UNIVERSAL)), "bearer rule drifted from read-injunctions.mjs");
});

test("a given row needs a giver; a bare giver licenses nothing; a wrong charter licenses nothing", () => {
  assert.throws(() => giveHyperlexiconAffordance(null, { left: "a", right: "b" }), /giver/);
  const bare = giveHyperlexiconAffordance(null, { left: "a", right: "b", giver: "someone" }).composition;
  assert.equal(licenseStanding(Object.values(bare)[0], { sha256: "0".repeat(32) }).tier, "ungrounded");
  const bound = Object.values(giveHyperlexiconAffordance(null, { left: "a", right: "b", giver: "g", binding: "a".repeat(32) }).composition)[0];
  assert.equal(licenseStanding(bound, { sha256: "a".repeat(32) }).licensed, true);
  assert.equal(licenseStanding(bound, { sha256: "b".repeat(32) }).licensed, false);
  assert.equal(licenseStanding(bound, null).licensed, false);
});

test("charter lane: every minted group stands on bytes that carry the modal; stripping the modal mints nothing", { skip: !have }, () => {
  const r = readCharter({ udhrPath: UDHR, injunctionsPath: INJ, draws: 50, seed: 7 });
  assert.equal(r.charter.sha256, digest32(fs.readFileSync(UDHR)));
  assert.ok(r.verified.length > 0);
  assert.equal(r.gates.modalStrippedClauses, 0);
  const bytes = fs.readFileSync(UDHR);
  for (const o of r.verified) assert.equal(bytes.subarray(o.markerAt, o.markerAt + Buffer.byteLength(o.marker)).toString("utf8"), o.marker);
  assert.equal(r.groups.reduce((n, g) => n + g.members, 0), r.verified.length);
  for (const g of r.groups) assert.match(`bearer:${g.bearer}`, /^bearer:(universal|other)$/);
  const stripped = fs.readFileSync(UDHR, "utf8").replace(/\bshall\b/gi, "xxx").replace(/\b(?:has|have) the right\b/gi, "xxx").replace(/\b(?:is|are) entitled\b/gi, "xxx");
  assert.equal(modalClauses(stripped).length, 0);
});

test("charter lane: an obligation moved off its bytes is disclosed, not minted", { skip: !have }, () => {
  const tmp = path.join(HERE, ".given-lanes-test-injunctions.json");
  const inj = JSON.parse(fs.readFileSync(INJ, "utf8"));
  inj.obligations[3].at += 1;                       // mutate one address
  fs.writeFileSync(tmp, JSON.stringify(inj));
  try {
    const r = readCharter({ udhrPath: UDHR, injunctionsPath: tmp, draws: 10, seed: 1 });
    assert.equal(r.unverified.length, 1);
    assert.equal(r.verified.length, inj.obligations.length - 1);
  } finally { fs.unlinkSync(tmp); }
});

test("lexicon lane: a projection of the UDHR is not a lexicon of it, and the lane mints nothing", { skip: !have }, () => {
  const projectedOnly = fs.readdirSync(PRIORS).filter((f) => /^pos-.*\.json$/.test(f)).map((f) => ({ f, g: JSON.parse(fs.readFileSync(path.join(PRIORS, f), "utf8")).provenance?.giver }))
    .find((x) => /^projected from/i.test(x.g ?? ""));
  if (projectedOnly) {
    const code = projectedOnly.f.replace(/^pos-|\.json$/g, "");
    const got = priorFor(code, PRIORS);
    assert.ok(got.gap || !/^projected from/i.test(got.prior.provenance.giver));
  }
  const composition = [{ left: "rights", right: "everyone", standing: "candidate", witnesses: [`${UDHR}#10`], meta: {} }];
  const a = lexicalLane({ composition, priorsDir: PRIORS, draws: 40, seed: 3 });
  const b = lexicalLane({ composition, priorsDir: PRIORS, draws: 40, seed: 3 });
  assert.deepEqual(a, b, "seeded draws must agree on a rerun");
  assert.equal(a.mints, 0);
});
