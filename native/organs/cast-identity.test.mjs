// cast-identity.test.mjs — the opt-in cast pass (PREREG-CAST-A1.md): R1 byte identity with the option off, the rules on small texts, and the no-lists gate.
//   KHORA_PRIORS_DIR=<ten English priors> node --test native/organs/cast-identity.test.mjs
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { castIdentity, maximal } from "./cast-identity.js";
import { mentionsOf } from "../the-fold/read-core.mjs";
import { scanSource } from "../../eval/cast/cast-identity-gate.mjs";
import { r1Hashes } from "../../eval/cast/r1-hashes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rowsOf = (text, lists) => lists.map((surfaces, i) => ({ ref: `ref:auto:r${i}`, surfaces, spans: mentionsOf(text, surfaces), standing: "referent", represent: surfaces[0] }));
const pass = (text, lists, abbreviations = new Set(), options = {}, connectorOk = () => null) => castIdentity({ text, rows: rowsOf(text, lists), mentionsOf, abbreviations, connectorOk, options });
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

test("RESCUE: siblings that differ by a number are each a being; the bare stem does not absorb them", () => {
  const text = "Apollo 13 flew in 1970. Apollo 13 was a near disaster. Apollo 11 landed first. Apollo 11 and Apollo 12 followed. Apollo 12 landed again. The Apollo program was large.";
  const res = pass(text, [["Apollo"]], new Set(), { fold: false });
  for (const k of ["Apollo 13", "Apollo 11", "Apollo 12"]) assert.ok(res.report.rescued.some((r) => r.surface === k), k);
  const all = pass(text, [["Apollo"]]);
  assert.ok(find(all, "Apollo 11") !== find(all, "Apollo 12") && find(all, "Apollo 11") !== find(all, "Apollo 13"));
});

test("RESCUE: a name joined by a coordinating word that its two sides almost never leave", () => {
  const text = "Harland and Wolff built it. Harland and Wolff were paid. Ask Harland and Wolff about it. Then Harland and Wolff left.";
  const res = pass(text, [["Harland"], ["Wolff"]], new Set(), {}, (t) => (t === "and" ? false : null));
  assert.ok(res.report.rescued.some((r) => r.surface === "Harland and Wolff"));
});

test("LEAD: a possessive of a name is the name", () => {
  const text = "Notre-Dame is old. Notre-Dame's spire burned. Notre-Dame's roof fell. Notre-Dame stands.";
  const res = pass(text, [["Notre-Dame"], ["Notre-Dame's"]]);
  assert.equal(res.rows.length, 1);
  assert.ok(res.rows[0].spans.every(([a, b]) => text.slice(a, b) === "Notre-Dame"));
});

test("SPANS: a full stop after a roman numeral is the sentence's when the name recurs without it", () => {
  const text = "Edward I ruled. Edward I built it. Edward I died. The tower was held by Edward I. Although old, it stood.";
  const res = pass(text, [["Edward I"]]);
  for (const [a, b] of res.rows[0].spans) assert.ok(!text.slice(a, b).endsWith("."), text.slice(a, b));
});

test("LEAD: a surface that runs across a sentence's end is dropped, not kept as a name", () => {
  const text = "The Saturn V flew. The Saturn V is tall. A Saturn V waits. After the Saturn V. Consequently, it rose. The Saturn V ended.";
  const res = pass(text, [["Saturn V"], ["Saturn V. Consequently"]]);
  assert.ok(!res.rows.some((r) => r.surfaces.includes("Saturn V. Consequently")));
});

test("FOLD: a bare name beside the same name plus a common noun is a typed gap, not a join", () => {
  const text = "Millau is a town. The Millau Viaduct crosses the Tarn near Millau. The viaduct is tall. Millau grew. A viaduct near Millau Viaduct signs. The Millau Viaduct. In Millau we saw the viaduct. Millau.";
  const res = pass(text, [["Millau"], ["Millau Viaduct"]]);
  assert.ok(find(res, "Millau") !== find(res, "Millau Viaduct"));
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
