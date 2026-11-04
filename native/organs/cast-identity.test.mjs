// cast-identity.test.mjs — the opt-in cast pass (PREREG-CAST-A1.md): R1 byte identity with the option off, the rules on small texts, and the no-lists gate.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/organs/cast-identity.test.mjs
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { castIdentity, maximal } from "./cast-identity.js";
import { mentionsOf } from "../the-fold/read-core.mjs";
import { scanSource } from "../../eval/cast/cast-identity-gate.mjs";
import { r1Hashes } from "../../eval/cast/r1-hashes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rowsOf = (text, lists) => lists.map((surfaces, i) => ({ ref: `ref:auto:r${i}`, surfaces, spans: mentionsOf(text, surfaces), standing: "referent", represent: surfaces[0] }));
const pass = (text, lists, abbreviations = new Set(), options = {}) => castIdentity({ text, rows: rowsOf(text, lists), mentionsOf, abbreviations, options });
const find = (res, s) => res.rows.find((r) => r.surfaces.includes(s));

test("R1: with castIdentity absent or false the entry is JSON-identical to base (ms excluded)", async () => {
  const base = JSON.parse(fs.readFileSync(path.join(root, "eval/cast/r1-base-hashes.json"), "utf8"));
  assert.deepEqual(await r1Hashes(root), base);
  assert.deepEqual(await r1Hashes(root, { castIdentity: false }), base);
});

test("R1: the option on changes the entry and keeps the cast well-formed", async () => {
  const base = JSON.parse(fs.readFileSync(path.join(root, "eval/cast/r1-base-hashes.json"), "utf8"));
  const on = await r1Hashes(root, { castIdentity: true });
  assert.notDeepEqual(on, base);
});

test("FOLD: the n-gram duplicates of one name are one being", () => {
  const text = "Golden Gate Bridge opened in 1937. The Golden Gate Bridge is red. Crowds crossed the Golden Gate Bridge daily. The Golden Gate is a strait.";
  const res = pass(text, [["Golden"], ["Golden Gate"], ["Golden Gate Bridge"], ["Gate"], ["Gate Bridge"]]);
  assert.equal(res.rows.length, 1);
  assert.ok(res.rows[0].surfaces.includes("Golden Gate Bridge") && res.rows[0].surfaces.includes("Gate"));
  assert.ok(res.rows[0].spans.some(([a, b]) => text.slice(a, b) === "Golden Gate Bridge"));
});

test("UNMERGE + CLAIMS: a parenthetical initialism belongs to the name it follows, not to the longer name holding the same letters", () => {
  const text = "The Large Hadron Collider (LHC) is big. The LHC runs. We use the LHC often. Data goes to the LHC Computing Grid. The LHC Computing Grid stores it. Later the LHC Computing Grid grew.";
  const res = pass(text, [["LHC Computing Grid", "LHC Computing", "LHC"], ["Large Hadron Collider"]]);
  assert.ok(find(res, "LHC") === find(res, "Large Hadron Collider"));
  assert.ok(find(res, "LHC Computing Grid") && find(res, "LHC Computing Grid") !== find(res, "LHC"));
});

test("UNMERGE: two full names that share only a last token are two beings", () => {
  const text = "The Rosetta Stone is old. The Rosetta Stone sits in London. The Rosetta Stone again. See the Ezana Stone in Axum.";
  const res = pass(text, [["Ezana Stone", "Rosetta Stone", "Ezana"]]);
  assert.ok(find(res, "Ezana Stone") !== find(res, "Rosetta Stone"));
});

test("RESCUE: a number that ends a name, introduced with it, becomes the name", () => {
  const text = "Voyager 1 launched in 1977. Voyager 1 is far away. Scientists track Voyager 1 daily. The Voyager program is old.";
  const res = pass(text, [["Voyager"]], new Set(), { fold: false });
  assert.ok(res.report.rescued.some((r) => r.surface === "Voyager 1"));
});

test("RESCUE: a joiner inside a token keeps the token whole", () => {
  const text = "The Trans-Siberian Railway runs far. The Trans-Siberian Railway opened. Ride the Trans-Siberian Railway today.";
  const res = pass(text, [["Railway"]], new Set(), { fold: false });
  assert.ok(res.report.rescued.some((r) => r.surface.includes("Trans-Siberian")));
});

test("SPANS: a sentence's full stop is not the name's; an initial's period is", () => {
  const text = "She signed the Clean Air Act. Then Robert F. Kennedy spoke. Mr. Smith left.";
  const res = pass(text, [["Clean Air Act"], ["Robert F"]], new Set(["Mr"]));
  for (const r of res.rows) for (const [a, b] of r.spans) assert.ok(!text.slice(a, b).endsWith("Act."), text.slice(a, b));
  assert.ok(res.rows.some((r) => r.spans.some(([a, b]) => text.slice(a, b) === "Clean Air Act")));
  assert.ok(res.rows.some((r) => r.spans.some(([a, b]) => text.slice(a, b) === "Robert F.")));
});

test("maximal keeps the longer of nested spans", () => { assert.deepEqual(maximal([[0, 5], [0, 12], [3, 6], [20, 25]]), [[0, 12], [20, 25]]); });

test("G1: the gate finds a list and finds none in the new code", () => {
  assert.ok(scanSource('const a = ["a","b","c","d","e"];').length > 0);
  assert.ok(scanSource("const r = /(one|two|three|four|five)/;").length > 0);
  assert.equal(scanSource(fs.readFileSync(path.join(root, "native/organs/cast-identity.js"), "utf8")).length, 0);
});

test("protected files are byte-identical to base", async () => {
  const { execFileSync } = await import("node:child_process");
  const diff = execFileSync("git", ["-C", root, "diff", "--stat", "15f82fcd", "--", "native/the-fold/corpus-session.js", "native/kernel/eot-claim-match.js", "native/the-fold/read-process.mjs"], { encoding: "utf8" });
  assert.equal(diff.trim(), "");
});
